// Manage client-side collaboration sessions.
import { Ace, Range } from "ace-builds"

import { Script } from "common"
import * as editor from "../ide/Editor"
import esconsole from "../esconsole"
import reporter from "./reporter"
import * as userNotification from "../user/notification"
import * as websocket from "./websocket"

import * as cai from "../cai/caiState"
import store from "../reducers"

interface Message {
    // eslint-disable-next-line camelcase
    notification_type: string
    scriptID: string
    sender: string

    action?: string
    active?: boolean
    activeMembers?: string[]
    addedMembers?: string[]
    canEdit?: boolean
    collaborators?: string[]
    date?: number
    editData?: EditOperation
    end?: number
    ID?: string
    position?: number
    removedMembers?: string[]
    scriptName?: string
    scriptText?: string
    start?: number
    state?: number
    text?: string
    tutoring?: boolean
    caiMessage?: cai.CAIMessage
    caiMessageType?: string
}

interface InsertOperation {
    action: "insert"
    start: number
    text: string
    len: number // TODO: redundant with text?
    end?: number // TODO: redunant with start and len?
}

interface RemoveOperation {
    action: "remove"
    start: number
    len: number
    end?: number // TODO: redunant with start and len?
}

interface MultiOperation {
    action: "mult"
    operations: EditOperation[]
}

type EditOperation = InsertOperation | RemoveOperation | MultiOperation

export let script: Script | null = null // script object: only used for the off-line mode
export let scriptID: string | null = null // collaboration session identity (both local and remote)

export let userName = ""
let owner = false

let editSession: Ace.EditSession | null = null

let buffer: Message[] = []
let synchronized = true // user's own messages against server
let awaiting = "" // unique edit ID from self

let scriptText = ""
export let lockEditor = true
export let isSynching = false // TODO: redundant? for storing cursors

let sessionActive = false
export let active = false

let cursorPos: Ace.Point | null = null
let selection: Ace.Range | null = null

// parent state version number on server & client, which the current operation is based on
let state = 0

// keeps track of the SERVER operations. only add the received messages.
let history: { [key: number]: EditOperation } = {}

export let otherMembers: {
    [key: string]: { canEdit: boolean; active: boolean }
} = Object.create(null)
const markers: { [key: string]: number } = Object.create(null)

export let tutoring = false

// This stores the `resolve`s of promises returned by rejoinSession and getScriptText.
// We call the continuations (fulfilling the promise) when we receive the corresponding server message.
// This allows other modules to do things like `await collaboration.getScriptText(scriptID)`.
const continuations: { [key: string]: (value: unknown) => void } = {}
let timeouts: { [key: string]: number } = {}
let scriptCheckTimerID: number = 0

// callbacks for environmental changes
export const callbacks = {
    refreshScriptBrowser: null as Function | null,
    refreshSharedScriptBrowser: null as Function | null,
    closeSharedScriptIfOpen: null as ((id: string) => void) | null,
    onJoin: null as Function | null,
    onLeave: null as Function | null,
    onJoinTutoring: null as Function | null,
}
export const chatListeners: ((m: Message) => void)[] = []

const editTimeout = 5000 // sync (rejoin) session if there is no server response
const syncTimeout = 5000 // when time out, the websocket connection is likely lost

function makeWebsocketMessage() {
    // Note: For the historic mishandling of username letter cases, we treat them as case insensitive (always convert to lowercase) in collaboration and websocket messaging for the time being... Tagging the relevant changes as GH issue #1858.
    return {
        notification_type: "collaboration",
        scriptID: scriptID,
        sender: userName,
    } as Message
}

function initialize() {
    editSession = editor.ace.getSession()
    otherMembers = {}
    buffer = []
    timeouts = {}
}

export function setUserName(username_: string) {
    userName = username_.toLowerCase() // #1858
}

// Opening a script with collaborators starts a real-time collaboration session.
export function openScript(script_: Script, userName: string) {
    script = script_
    script.username = script.username.toLowerCase() // #1858
    userName = userName.toLowerCase() // #1858

    const shareID = script.shareid

    if (scriptID !== shareID) {
        esconsole("opening a collaborative script: " + shareID, "collab")

        // initialize the local model
        initialize()

        joinSession(shareID, userName)
        editor.setReadOnly(true)
        owner = script.username === userName

        if (!owner) {
            otherMembers[script.username] = {
                active: false,
                canEdit: true,
            }
        }

        for (let member of script.collaborators) {
            member = member.toLowerCase() // #1858
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true,
                }
            }
        }
    }
    reporter.openSharedScript()
}

export function closeScript(shareID: string) {
    if (scriptID === shareID) {
        esconsole("closing a collaborative script: " + shareID, "collab")

        leaveSession(shareID)
        lockEditor = false
        removeOtherCursors()
        active = false
        scriptID = null

        for (const timeout in timeouts) {
            clearTimeout(timeouts[timeout])
        }
        timeouts = {}
    } else {
        esconsole("cannot close the active tab with different script ID")
    }
}

export function checkSessionStatus() {
    esconsole("checking collaboration session status", "collab")
    websocket.send({ action: "checkSessionStatus", state, ...makeWebsocketMessage() })
    // check the websocket connection
    timeouts[userName] = window.setTimeout(onFailedToSynchronize, syncTimeout)
}

function onSessionStatus(data: Message) {
    esconsole("session status received", "collab")
    clearTimeout(timeouts[userName])
    delete timeouts[userName]

    if (data.active) {
        if (data.state !== state) {
            rejoinSession()
        }
    } else {
        rejoinSession()
    }
}

function onFailedToSynchronize() {
    userNotification.show("Failed to synchronize with the central server. You might already have another EarSketch window or tab open somewhere. To fix  please refresh page.", "failure2", 999)
}

function joinSession(shareID: string, username_: string) {
    esconsole("joining collaboration session: " + shareID, "collab")

    scriptID = shareID
    userName = username_.toLowerCase() // #1858

    websocket.send({ action: "joinSession", state, ...makeWebsocketMessage() })

    // check the websocket connection
    timeouts[userName] = window.setTimeout(onFailedToSynchronize, syncTimeout)
}

function onJoinedSession(data: Message) {
    esconsole("joined collaboration session: " + data.scriptID, "collab")

    if (data.scriptID !== scriptID) {
        // This message is the server's response to an old request, so we ignore it.
        // We sent a "joinSession" message earlier when a collaborative script was the active tab,
        // but we have switched tabs and left the session in the meantime.
        // (Without this check, the `setEditorTextWithoutOutput()` call below causes #2658.)
        return
    }

    // clear the websocket connection check
    clearTimeout(timeouts[userName])
    delete timeouts[userName]

    // open script in editor
    scriptText = data.scriptText!
    setEditorTextWithoutOutput(scriptText)

    state = data.state!
    history = {} // TODO: pull all the history? maybe not
    editor.setReadOnly(false)
    active = true
    sessionActive = true

    // the state of the initiated messages and messageBuffer
    synchronized = true

    for (const member of data.activeMembers!) {
        if (member !== userName) {
            otherMembers[member].active = true
        }
    }

    if (continuations.joinSession) {
        continuations.joinSession(data)
        delete continuations.joinSession
    }

    callbacks.onJoin?.(data)
}

function onSessionsFull(data: Message) {
    // clear the websocket connection check sent from joinSession
    clearTimeout(timeouts[userName])
    delete timeouts[userName]
    esconsole("could not create a session. max number reached: " + data.scriptID, "collab")
    userNotification.show("Server has reached the maximum number of real-time collaboration sessions. Please try again later.", "failure1")
    openScriptOffline(script!)
}

function openScriptOffline(script: Script) {
    esconsole("opening a collaborative script in the off-line mode", "collab")
    script.username = script.username.toLocaleString() // #1858
    script.collaborative = false
    script.readonly = script.username !== userName

    if (editor.droplet.currentlyUsingBlocks) {
        editor.droplet.setValue(script.source_code, -1)
    } else {
        editor.ace.setValue(script.source_code, -1)
    }
    editor.setReadOnly(script.readonly)
    reporter.openSharedScript()
}

export function leaveSession(shareID: string) {
    esconsole("leaving collaboration session: " + shareID, "collab")
    lockEditor = true
    websocket.send({ action: "leaveSession", ...makeWebsocketMessage() })
    callbacks.onLeave?.()
}

function onMemberJoinedSession(data: Message) {
    if (!userIsCAI(data.sender)) {
        userNotification.show(data.sender + " has joined the collaboration session.")
    }

    if (data.sender in otherMembers) {
        otherMembers[data.sender].active = true
    } else {
        otherMembers[data.sender] = {
            active: true,
            canEdit: true,
        }
    }
}

function onMemberLeftSession(data: Message) {
    if (!userIsCAI(data.sender)) {
        userNotification.show(data.sender + " has left the collaboration session.")
    }

    if (data.sender in markers) {
        editSession!.removeMarker(markers[data.sender])
    }

    otherMembers[data.sender].active = false
}

export function addCollaborators(shareID: string, userName: string, collaborators: string[]) {
    if (collaborators.length !== 0) {
        // add script name info (done in the server side now)
        websocket.send({
            ...makeWebsocketMessage(),
            action: "addCollaborators",
            scriptID: shareID,
            sender: userName.toLowerCase(), // #1858
            collaborators: collaborators,
        })

        if (scriptID === shareID && active) {
            for (const member of collaborators) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true,
                }
            }
        }
    }
}

export function removeCollaborators(shareID: string, userName: string, collaborators: string[]) {
    if (collaborators.length !== 0) {
        websocket.send({
            ...makeWebsocketMessage(),
            action: "removeCollaborators",
            scriptID: shareID,
            sender: userName.toLowerCase(), // #1858
            collaborators: collaborators,
        })

        if (scriptID === shareID && active) {
            for (const member of collaborators) {
                delete otherMembers[member]
            }
        }
    }
}

function setEditorTextWithoutOutput(scriptText: string) {
    lockEditor = true
    const session = editor.ace.getSession()
    const cursor = session.selection.getCursor()
    editor.ace.setValue(scriptText, -1)
    session.selection.moveCursorToPosition(cursor)
    lockEditor = false
}

function generateRandomID() {
    return Math.random().toString(36).substr(2, 10)
}

function timeoutSync(messageID: string) {
    timeouts[messageID] = window.setTimeout(() => {
        esconsole("edit synchronization timed out", "collab")
        rejoinSession()
    }, editTimeout)
}

export function editScript(data: EditOperation) {
    storeCursor(editSession!.selection.getCursor())
    if (scriptCheckTimerID) {
        clearTimeout(scriptCheckTimerID)
    }

    const message = {
        action: "edit",
        ID: generateRandomID(),
        state,
        editData: data,
        ...makeWebsocketMessage(),
    }

    if (synchronized) {
        buffer.push(message)
        synchronized = false
        awaiting = message.ID

        if (!sessionActive) {
            rejoinSession()
        } else {
            websocket.send(message)
            timeoutSync(message.ID)
        }
    } else {
        // buffered messages get temporary incremental state nums
        message.state += buffer.length
        buffer.push(message)
    }
}

function onEditMessage(data: Message) {
    editor.setReadOnly(true)
    history[data.state!] = data.editData!

    // filter out own edit
    if (data.ID === awaiting) {
        clearTimeout(timeouts[data.ID])
        delete timeouts[data.ID]
        state++

        if (buffer.length > 1) {
            const nextMessage = buffer[1]
            awaiting = nextMessage.ID!

            if (state !== nextMessage.state) {
                esconsole("client -> server out of sync: " + nextMessage.state + " " + state, ["collab", "nolog"])
                // adjust buffer here???
                rejoinSession()
                return
            } else {
                esconsole("client -> server in sync: " + state, ["collab", "nolog"])
            }

            websocket.send(nextMessage)
            timeoutSync(nextMessage.ID!)
        } else {
            esconsole("synced with own edit", ["collab", "nolog"])
            synchronized = true

            // hard sync the script text after 5 seconds of inactivity
            // for potential permanent sync errors
            scriptCheckTimerID = compareScriptText(5000)
        }
        buffer.shift()
    } else {
        let serverOp = data.editData!

        if (data.state === state) {
            esconsole("server -> client in sync: " + data.state, ["collab", "nolog"])
        } else {
            esconsole("server -> client out of sync: " + data.state, ["collab", "nolog"])
            requestSync()
        }

        if (buffer.length > 0) {
            esconsole("adjusting buffered edits...", ["collab", "nolog"])
            buffer = buffer.map(op => {
                esconsole("input: " + JSON.stringify(op.editData), ["collab", "nolog"])
                const tops = transform(serverOp, op.editData!)
                serverOp = tops[0]
                op.editData = tops[1]
                op.state = op.state! + 1
                esconsole("output: " + JSON.stringify(op.editData), ["collab", "nolog"])
                return op
            })
        }
        esconsole("applying the transformed edit", ["collab", "nolog"])
        apply(serverOp)
        const doc = editSession!.getDocument()
        if (cursorPos !== null) {
            cursorPos = doc.indexToPosition(adjustCursor(doc.positionToIndex(cursorPos), serverOp), 0)
            editSession!.selection.moveCursorToPosition(cursorPos)
        }
        state++
    }
    editor.setReadOnly(false)
}

// Used with the version-control revertScript
export function reloadScriptText(text: string) {
    editor.ace.setValue(text, -1)
}

function syncToSession(data: Message) {
    state = data.state!

    if (scriptText === data.scriptText) {
        return null
    }

    isSynching = true
    scriptText = data.scriptText!

    setEditorTextWithoutOutput(scriptText)

    // try to reset the cursor position
    editSession!.selection.moveCursorToPosition(cursorPos)

    if (JSON.stringify(selection!.start) !== JSON.stringify(selection!.end)) {
        const start = selection!.start
        const end = selection!.end
        const reverse = JSON.stringify(cursorPos) !== JSON.stringify(selection!.end)

        const range = new Range(start.row, start.column, end.row, end.column)
        editSession!.selection.setRange(range, reverse)
    }

    isSynching = false
    synchronized = true
    buffer = []
    history = {}
}

function onSyncError(data: Message) {
    userNotification.showBanner("There was a sync error. Adjusting the local edit...")
    syncToSession(data)
}

function requestSync() {
    esconsole("requesting synchronization to the server", "collab")
    websocket.send({ action: "requestSync", ...makeWebsocketMessage() })
}

function onSyncToSession(data: Message) {
    syncToSession(data)
}

function rejoinSession() {
    if (active) {
        userNotification.showBanner("Synchronization error: Rejoining the session", "failure1")

        initialize()

        if (!owner) {
            otherMembers[script!.username] = {
                active: false,
                canEdit: true,
            }
        }

        for (const member of script!.collaborators) {
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true,
                }
            }
        }

        websocket.send({ action: "rejoinSession", state, tutoring, ...makeWebsocketMessage() })
    }

    return new Promise(resolve => (continuations.joinSession = resolve))
}

export function saveScript(_scriptID?: string) {
    if (cai.selectWizard(store.getState())) {
        return
    }
    if (!_scriptID || (_scriptID === scriptID)) {
        websocket.send({ action: "saveScript", ...makeWebsocketMessage() })
    }
    reporter.saveSharedScript()
}

function onScriptSaved(data: Message) {
    if (!userIsCAI(data.sender)) {
        userNotification.show(data.sender + " saved the current version of the script.", "success")
    }
}

export function storeCursor(position: Ace.Point) {
    if (position !== cursorPos) {
        cursorPos = position
        const index = editSession!.getDocument().positionToIndex(position, 0)
        websocket.send({ action: "cursorPosition", position: index, state, ...makeWebsocketMessage() })
    }
}

export function storeSelection(selection_: Ace.Range) {
    if (selection !== selection_) {
        selection = selection_

        const document = editSession!.getDocument()
        const start = document.positionToIndex(selection.start, 0)
        const end = document.positionToIndex(selection.end, 0)

        websocket.send({ action: "select", start, end, state, ...makeWebsocketMessage() })
    }
}

function onCursorPosMessage(data: Message) {
    data.sender = data.sender.toLowerCase() // #1858
    const document = editSession!.getDocument()
    const cursorPos = document.indexToPosition(data.position!, 0)
    const range = new Range(cursorPos.row, cursorPos.column, cursorPos.row, cursorPos.column + 1)

    if (data.sender in markers) {
        editSession!.removeMarker(markers[data.sender])
    }

    const num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1

    markers[data.sender] = editSession!.addMarker(range, "generic-cursor-" + num, "text", true)
}

function onSelectMessage(data: Message) {
    data.sender = data.sender.toLowerCase() // #1858

    const document = editSession!.getDocument()
    const start = document.indexToPosition(data.start!, 0)
    const end = document.indexToPosition(data.end!, 0)

    if (data.sender in markers) {
        editSession!.removeMarker(markers[data.sender])
    }

    const num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1

    if (data.start === data.end) {
        const range = new Range(start.row, start.column, start.row, start.column + 1)
        markers[data.sender] = editSession!.addMarker(range, "generic-cursor-" + num, "text", true)
    } else {
        const range = new Range(start.row, start.column, end.row, end.column)
        markers[data.sender] = editSession!.addMarker(range, "generic-selection-" + num, "fullLine", true)
    }
}

function removeOtherCursors() {
    for (const m in otherMembers) {
        if (m in markers) {
            editSession!.removeMarker(markers[m])
        }
        delete markers[m]
    }
}

function onMiscMessage(data: Message) {
    if (!userIsCAI(data.sender)) {
        userNotification.show(data.text!)
    }
}

function onChangeWriteAccess(data: Message) {
    if (data.canEdit) {
        editor.setReadOnly(false)
        userNotification.show(data.sender + " gave you the write access!", "collaboration")
    } else {
        editor.setReadOnly(true)
        userNotification.show("You no longer have the write access.", "collaboration")
    }
}

// After certain period of inactivity, the session closes automatically, sending message. It should flag for startSession to be sent before the next action.
function onSessionClosed() {
    esconsole("remote session closed", "collab")

    sessionActive = false

    for (const member in otherMembers) {
        otherMembers[member].active = false
    }
}

function onSessionClosedForInactivity() {
    userNotification.show("Remote collaboration session was closed because of a prolonged inactivitiy.")
}

function beforeTransf(operation: EditOperation) {
    if (operation.action === "insert") {
        operation.len = operation.text!.length
        operation.end = operation.start + operation.len
    } else if (operation.action === "remove") {
        operation.end = operation.start + operation.len
    }
    return JSON.parse(JSON.stringify(operation))
}

function afterTransf(operation: EditOperation) {
    if (operation.action === "insert") {
        operation.end = operation.start + operation.len
    } else if (operation.action === "remove") {
        operation.end = operation.start + operation.len
    } else if (operation.action === "mult") {
        operation.operations = operation.operations!.map(afterTransf)
    }
    return operation
}

// Operational transform (with no composition)
// TODO: Can we simplify this?
function transform(op1: EditOperation, op2: EditOperation) {
    op1 = beforeTransf(op1)
    op2 = beforeTransf(op2)

    if (op1.action === "mult") {
        op1.operations = op1.operations!.map(op => {
            const tops = transform(op, op2)
            op2 = tops[1]
            return tops[0]
        })
    } else if (op2.action === "mult") {
        op2.operations = op2.operations!.map(op => {
            const tops = transform(op1, op)
            op1 = tops[0]
            return tops[1]
        })
    } else {
        if (op1.action === "insert" && op2.action === "insert") {
            if (op1.start <= op2.start) {
                op2.start += op1.len
            } else {
                op1.start += op2.len
            }
        } else if (op1.action === "insert" && op2.action === "remove") {
            if (op1.start <= op2.start) {
                op2.start += op1.len
            } else if (op2.start < op1.start && op1.start <= op2.end!) {
                const overlap = op2.end! - op1.start
                op1.start = op2.start

                op2 = {
                    action: "mult",
                    operations: [{
                        action: "remove",
                        start: op2.start,
                        len: op2.len - overlap,
                    }, {
                        action: "remove",
                        start: op1.end! - (op2.len - overlap),
                        len: overlap,
                    }],
                }
            } else if (op2.end! < op1.start) {
                op1.start -= op2.len
            } else {
                esconsole("case uncovered: " + JSON.stringify(op1) + " " + JSON.stringify(op2), "collab")
            }
        } else if (op1.action === "remove" && op2.action === "insert") {
            if (op1.end! <= op2.start) {
                op2.start -= op1.len
            } else if (op1.start <= op2.start && op2.start < op1.end! && op1.end! <= op2.end!) {
                const overlap = op1.end! - op2.start

                const top1: MultiOperation = {
                    action: "mult",
                    operations: [{
                        action: "remove",
                        start: op1.start,
                        len: op1.len - overlap,
                    }, {
                        action: "remove",
                        start: op2.end! - (op1.len - overlap),
                        len: overlap,
                    }],
                }

                op2.start = op1.start
                op1 = top1
            } else if (op1.start <= op2.start && op2.end! <= op1.end!) {
                const top1: MultiOperation = {
                    action: "mult",
                    operations: [{
                        action: "remove",
                        start: op1.start,
                        len: op2.start - op1.start,
                    }, {
                        action: "remove",
                        start: op1.start + op2.len,
                        len: op1.len - (op2.start - op1.start),
                    }],
                }
                op2.start = op1.start
                op1 = top1
            } else if (op2.start <= op1.start) {
                op1.start += op2.len
            } else {
                esconsole("case uncovered: " + JSON.stringify(op1) + " " + JSON.stringify(op2), "collab")
            }
        } else if (op1.action === "remove" && op2.action === "remove") {
            if (op1.end! <= op2.start) {
                op2.start -= op1.len
            } else if (op1.start <= op2.start && op2.start < op1.end! && op1.end! <= op2.end!) {
                const overlap = op1.end! - op2.start
                op1.len -= overlap
                op2.start = op1.start
                op2.len -= overlap
            } else if (op2.start < op1.start && op1.start <= op2.end! && op2.end! <= op1.end!) {
                const overlap = op2.end! - op1.start
                op1.start = op2.start
                op1.len -= overlap
                op2.len -= overlap
            } else if (op2.end! <= op1.start) {
                op1.start -= op2.len
            } else if (op1.start < op2.start && op2.end! < op1.end!) {
                op1 = {
                    action: "mult",
                    operations: [{
                        action: "remove",
                        start: op1.start,
                        len: op2.start - op1.start,
                    }, {
                        action: "remove",
                        start: op2.start - 1,
                        len: op1.end! - op2.end!,
                    }],
                }

                op2.len = 0
            } else if (op2.start < op1.start && op1.end! < op2.end!) {
                op1.len = 0

                op2 = {
                    action: "mult",
                    operations: [{
                        action: "remove",
                        start: op2.start,
                        len: op1.start - op2.start,
                    }, {
                        action: "remove",
                        start: op1.start - 1,
                        len: op2.end! - op1.end!,
                    }],
                }
            } else if (op1.start === op2.start && op1.end === op2.end) {
                // already covered
            } else {
                esconsole("case uncovered: " + JSON.stringify(op1) + " " + JSON.stringify(op2), "collab")
            }
        }
    }
    return [afterTransf(op1), afterTransf(op2)]
}

const operations = {
    insert(op: InsertOperation) {
        const document = editSession!.getDocument()
        const start = document.indexToPosition(op.start, 0)
        const text = op.text
        editSession!.insert(start, text)
    },

    remove(op: RemoveOperation) {
        const document = editSession!.getDocument()
        const start = document.indexToPosition(op.start, 0)
        const end = document.indexToPosition(op.end!, 0)

        editSession!.remove(Range.fromPoints(start, end))
    },

    mult(op: MultiOperation) {
        for (const operation of op.operations) {
            apply(operation)
        }
    },
}

// Applies edit operations on the editor content.
function apply(op: EditOperation) {
    lockEditor = true
    const operation = (operations[op.action] as (op: EditOperation) => void)
    operation(op)
    lockEditor = false
}

// Other people's operations may affect where the user's cursor should be.
function adjustCursor(index: number, operation: EditOperation) {
    if (operation.action === "insert") {
        if (operation.start <= index) {
            return index + operation.text.length
        }
    } else if (operation.action === "remove") {
        if (operation.start < index) {
            if (operation.end! <= index) {
                return index - operation.len
            } else {
                return operation.start
            }
        }
    } else if (operation.action === "mult") {
        for (const op of operation.operations) {
            index = adjustCursor(index, op)
        }
    }
    return index
}

async function onUserAddedToCollaboration(data: Message) {
    if (active && scriptID === data.scriptID) {
        for (const member of data.addedMembers!) {
            otherMembers[member] = {
                active: false,
                canEdit: true,
            }
        }
    }

    if (callbacks.refreshSharedScriptBrowser) {
        await callbacks.refreshSharedScriptBrowser()
    }
}

async function onUserRemovedFromCollaboration(data: Message) {
    if (data.removedMembers!.includes(userName)) {
        if (callbacks.closeSharedScriptIfOpen) {
            callbacks.closeSharedScriptIfOpen(data.scriptID)
        }
    } else if (active && scriptID === data.scriptID) {
        for (const member of data.removedMembers!) {
            delete otherMembers[member]
        }
    }

    if (callbacks.refreshSharedScriptBrowser) {
        await callbacks.refreshSharedScriptBrowser()
    }
}

export function leaveCollaboration(scriptID: string, userName: string, refresh = true) {
    websocket.send({
        ...makeWebsocketMessage(),
        action: "leaveCollaboration",
        scriptID,
        sender: userName.toLowerCase(), // #1858
    })
    if (refresh && callbacks.refreshSharedScriptBrowser) {
        return callbacks.refreshSharedScriptBrowser()
    } else {
        return Promise.resolve(null)
    }
}

async function onUserLeftCollaboration(data: Message) {
    if (active && scriptID === data.scriptID) {
        delete otherMembers[data.sender.toLowerCase()] // #1858

        // close collab session tab if it's active and no more collaborators left
        if (Object.keys(otherMembers).length === 0) {
            closeScript(data.scriptID)
        }
    }

    if (callbacks.refreshScriptBrowser) {
        await callbacks.refreshScriptBrowser()
    }
    if (callbacks.refreshSharedScriptBrowser) {
        await callbacks.refreshSharedScriptBrowser()
    }
}

export function renameScript(scriptID: string, scriptName: string, userName: string) {
    esconsole("renaming the script for " + scriptID, "collab")
    websocket.send({
        ...makeWebsocketMessage(),
        action: "renameScript",
        scriptID,
        scriptName,
        sender: userName.toLowerCase(),
    })
}

async function onScriptRenamed(data: Message) {
    esconsole(data.sender + " renamed a collaborative script " + data.scriptID, "collab")

    if (callbacks.refreshSharedScriptBrowser) {
        await callbacks.refreshSharedScriptBrowser()
    }
}

export function getScriptText(scriptID: string): Promise<string> {
    esconsole("requesting the script text for " + scriptID, "collab")
    websocket.send({ ...makeWebsocketMessage(), action: "getScriptText", scriptID })
    return new Promise(resolve => (continuations.getScriptText = resolve))
}

function onScriptText(data: Message) {
    if (continuations.getScriptText) {
        continuations.getScriptText(data.scriptText)
        delete continuations.getScriptText
    }
}

function compareScriptText(delay: number) {
    return window.setTimeout(() => {
        getScriptText(scriptID!).then((serverText: string) => {
            if (serverText !== editor.getValue()) {
                // possible sync error
                rejoinSession()
            }
        })
    }, delay)
}

export function joinTutoring() {
    websocket.send({ action: "joinTutoring", ...makeWebsocketMessage() })
    tutoring = true
}

export function leaveTutoring() {
    websocket.send({ action: "leaveTutoring", ...makeWebsocketMessage() })
    tutoring = false
}

export function sendChatMessage(caiMessage: cai.CAIMessage, caiMessageType: string) {
    console.log("sent chat message", caiMessage)

    const message = {
        action: "chat",
        caiMessage,
        caiMessageType,
        ...makeWebsocketMessage(),
    } as Message

    websocket.send(message)
}

function onChatMessage(data: Message) {
    console.log("received chat message", data)

    // do nothing on own message
    if (data.sender !== userName) {
        chatListeners.forEach(f => f(data))
    }
}

export function sendCompilationRecord(type: string) {
    websocket.send({ action: "compile", text: type, ...makeWebsocketMessage() })
}

const GENERAL_HANDLERS: { [key: string]: (data: Message) => void } = {
    onJoinedSession,
    onSessionStatus,
    onSessionClosed,
    onSessionsFull,
    onUserAddedToCollaboration,
    onUserRemovedFromCollaboration,
    onUserLeftCollaboration,
    onScriptRenamed,
    onScriptText,
    onJoinedTutoring: (data: Message) => callbacks.onJoinTutoring?.(data),
}

const SCRIPT_HANDLERS: { [key: string]: (data: Message) => void } = {
    onEdit: onEditMessage,
    onSyncToSession,
    onSyncError,
    onScriptSaved,
    onCursorPosition: onCursorPosMessage,
    onSelect: onSelectMessage,
    onMemberJoinedSession,
    onMemberLeftSession,
    onMiscMessage,
    onWriteAccess: onChangeWriteAccess,
    onChat: onChatMessage,
    onSessionClosedForInactivity,
}

// websocket callbacks
function triggerByNotification(data: Message) {
    if (data.notification_type === "collaboration") {
        // Convert e.g. "joinedSession" to "onJoinedSession"
        const action = "on" + data.action!.charAt(0).toUpperCase() + data.action!.slice(1)
        GENERAL_HANDLERS[action]?.(data)

        if (active && scriptID === data.scriptID) {
            SCRIPT_HANDLERS[action]?.(data)
        }
    }
}

websocket.subscribe(triggerByNotification)

// TEMPORARY for Wizard of Oz CAI testing, Spring 2020-2021.
function userIsCAI(user: string) {
    return user.toUpperCase() === "CAI"
}
