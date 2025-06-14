// Manage client-side collaboration sessions.
import { Script } from "common"
import * as editor from "../ide/Editor"
import esconsole from "../esconsole"
import reporter from "./reporter"
import * as userNotification from "../user/notification"
import * as websocket from "./websocket"

import * as cai from "../cai/caiState"
import * as collabState from "./collaborationState"
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
    caiMessage?: cai.CaiMessage
    caiMessageType?: string
}

interface InsertOperation {
    action: "insert"
    start: number
    text: string
    len: number // TODO: redundant with text?
    end?: number // TODO: redundant with start and len?
}

interface RemoveOperation {
    action: "remove"
    start: number
    len: number
    end?: number // TODO: redundant with start and len?
}

interface MultiOperation {
    action: "mult"
    operations: EditOperation[]
}

export type EditOperation = InsertOperation | RemoveOperation | MultiOperation

export interface Selection {
    start: number
    end: number
}

export let script: Script | null = null // script object: only used for the off-line mode
export let scriptID: string | null = null // collaboration session identity (both local and remote)

export let userName = ""

let buffer: Message[] = []
let synchronized = true // user's own messages against server
let awaiting = "" // unique edit ID from self

let scriptText = ""
export let lockEditor = true
export let isSynching = false // TODO: redundant? for storing cursors

let sessionActive = false
export let active = false

let selection: Selection | undefined

// parent state version number on server & client, which the current operation is based on
let state = 0

// keeps track of the SERVER operations. only add the received messages.
let history: { [key: number]: EditOperation } = {}

export let tutoring = false

// This stores the `resolve`s of promises returned by rejoinSession and getScriptText.
// We call the continuations (fulfilling the promise) when we receive the corresponding server message.
// This allows other modules to do things like `await collaboration.getScriptText(scriptID)`.
const continuations: { [key: string]: (value: any) => void } = {}
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
        scriptID,
        sender: userName,
    } as Message
}

function initialize() {
    store.dispatch(collabState.setCollaborators([]))
    buffer = []
    timeouts = {}
}

export function setUserName(username_: string) {
    userName = username_.toLowerCase() // #1858
}

// Opening a script with collaborators starts a real-time collaboration session.
export function openScript(script_: Script, userName: string) {
    script = script_
    const scriptOwner = script.username.toLowerCase() // #1858
    userName = userName.toLowerCase() // #1858

    const shareID = script.shareid

    if (scriptID !== shareID) {
        esconsole("opening a collaborative script: " + shareID, "collab")

        // initialize the local model
        initialize()

        // create the full set of collaborators from scriptOwner + script.collaborators
        const collaboratorUsernames = [scriptOwner, ...script.collaborators]
        store.dispatch(collabState.setCollaborators(collaboratorUsernames))
        store.dispatch(collabState.setCollaboratorAsActive(userName))

        joinSession(shareID, userName)
        editor.setReadOnly(true)
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
    reporter.failedToSync()
}

function joinSession(shareID: string, username_: string) {
    esconsole("joining collaboration session: " + shareID, "collab")

    scriptID = shareID
    userName = username_.toLowerCase() // #1858

    // "joinSession" triggers an "onJoinedSession" server response to sender, and
    // triggers an "onMemberJoinedSession" server response to other active collaborators
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

    // update the active status for our collaborators
    store.dispatch(collabState.setCollaboratorsAsActive(data.activeMembers!))

    reporter.collabSessionJoined(data.activeMembers ? data.activeMembers.length : 0)

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
    reporter.collabServerFull()
    openScriptOffline(script!)
}

function openScriptOffline(script: Script) {
    esconsole("opening a collaborative script in the off-line mode", "collab")
    const scriptOwner = script.username.toLocaleString() // #1858
    script.collaborative = false
    script.readonly = scriptOwner !== userName

    editor.setContents(script.source_code)
    editor.setReadOnly(script.readonly)
    reporter.openSharedScript()
}

export function leaveSession(shareID: string) {
    esconsole("leaving collaboration session: " + shareID, "collab")
    lockEditor = true
    // "leaveSession" triggers a "memberLeftSession" server response to other active members
    websocket.send({ action: "leaveSession", ...makeWebsocketMessage() })
    if (selectDebounce.timer) {
        clearTimeout(selectDebounce.timer)
        selectDebounce.timer = 0
    }
    selectDebounce.selection = undefined
    callbacks.onLeave?.()
}

function onMemberJoinedSession(data: Message) {
    const newCollaborator = data.sender

    if (!userIsCai(newCollaborator)) {
        userNotification.show(newCollaborator + " has joined the collaboration session.")
    }

    if (!(newCollaborator in collabState.selectCollaborators(store.getState()))) {
        // TODO: When would we ever receive an onMemberJoinedSession before a joinedSession/userAddedToCollaboration?
        store.dispatch(collabState.addCollaborator(newCollaborator))
    }

    store.dispatch(collabState.setCollaboratorAsActive(newCollaborator))
}

function onMemberLeftSession(data: Message) {
    const leavingCollaborator = data.sender

    if (!userIsCai(leavingCollaborator)) {
        userNotification.show(leavingCollaborator + " has left the collaboration session.")
    }

    editor.clearMarker(leavingCollaborator)

    store.dispatch(collabState.setCollaboratorAsInactive(leavingCollaborator))
}

export function addCollaborators(shareID: string, userName: string, collaborators: string[]) {
    if (collaborators.length !== 0) {
        // "addCollaborators" triggers a "userAddedToCollaboration" server response
        websocket.send({
            ...makeWebsocketMessage(),
            action: "addCollaborators",
            scriptID: shareID,
            sender: userName.toLowerCase(), // #1858
            collaborators,
        })

        if (scriptID === shareID && active) {
            store.dispatch(collabState.addCollaborators(collaborators))
        }
    }
}

export function removeCollaborators(shareID: string, userName: string, collaborators: string[]) {
    // "removeCollaborators" triggers a "userRemovedFromCollaboration" server response
    if (collaborators.length !== 0) {
        websocket.send({
            ...makeWebsocketMessage(),
            action: "removeCollaborators",
            scriptID: shareID,
            sender: userName.toLowerCase(), // #1858
            collaborators,
        })

        if (scriptID === shareID && active) {
            store.dispatch(collabState.removeCollaborators(collaborators))
        }
    }
}

function setEditorTextWithoutOutput(scriptText: string) {
    lockEditor = true
    // TODO: Do we need to save and restore cursor position?
    editor.setContents(scriptText)
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

    // setTimeout(() => storeSelection(editSession!.selection.getRange()))
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

        lockEditor = true
        editor.applyOperation(serverOp)
        lockEditor = false

        select(editor.getSelection())
        state++
    }
    editor.setReadOnly(false)
}

// Used with the version-control revertScript
export function reloadScriptText(text: string) {
    editor.setContents(text)
}

function syncToSession(data: Message) {
    state = data.state!

    if (scriptText === data.scriptText) {
        return null
    }

    isSynching = true
    scriptText = data.scriptText!

    // const reverse = editSession!.selection.isBackwards()
    setEditorTextWithoutOutput(scriptText)

    // try to reset the cursor position
    if (selection) {
        // editSession!.selection.setRange(selection, reverse)
    }

    isSynching = false
    synchronized = true
    buffer = []
    history = {}
}

function onSyncError(data: Message) {
    userNotification.showBanner("There was a sync error. Adjusting the local edit...")
    reporter.syncError()
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
        reporter.syncErrorRejoin()

        initialize()

        const scriptOwner = script!.username.toLowerCase() // #1858
        const collaboratorUsernames = [scriptOwner, ...script!.collaborators]
        store.dispatch(collabState.setCollaborators(collaboratorUsernames))

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
    if (!userIsCai(data.sender)) {
        userNotification.show(data.sender + " saved the current version of the script.", "success")
    }
}

const selectDebounce = {
    period: 50,
    timer: 0,
    timestamp: 0,
    selection: undefined as Selection | undefined,
}

export function select(selection_: Selection) {
    selection = selection_
    // Debounce: send updates at most once every `debouncePeriod` ms.
    if (selectDebounce.timer) {
        return // Already have a timer running, nothing to do.
    }
    const delay = Math.max(0, selectDebounce.period - (Date.now() - selectDebounce.timestamp))
    selectDebounce.timer = window.setTimeout(() => {
        selectDebounce.timer = 0
        // Don't send duplicate information.
        const prevSelection = selectDebounce.selection
        if (prevSelection && prevSelection.start === selection!.start && prevSelection.end === selection!.end) return
        websocket.send({ action: "select", ...selection, state, ...makeWebsocketMessage() })
        selectDebounce.timestamp = Date.now()
        selectDebounce.selection = selection
    }, delay)
}

function onSelectMessage(data: Message) {
    editor.setMarker(data.sender.toLowerCase(), data.start!, data.end!)
}

function removeOtherCursors() {
    const collaborators = collabState.selectCollaborators(store.getState())
    for (const member in collaborators) {
        editor.clearMarker(member)
    }
}

function onMiscMessage(data: Message) {
    if (!userIsCai(data.sender)) {
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

    const collaborators = collabState.selectCollaborators(store.getState())
    store.dispatch(collabState.setCollaboratorsAsInactive(Object.keys(collaborators)))
}

function onSessionClosedForInactivity() {
    userNotification.show("Remote collaboration session was closed because of a prolonged inactivitiy.")
    reporter.inactiveSessionClosed()
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

async function onUserAddedToCollaboration(data: Message) {
    if (active && scriptID === data.scriptID) {
        store.dispatch(collabState.addCollaborators(data.addedMembers!))
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
        store.dispatch(collabState.removeCollaborators(data.removedMembers!))
    }

    if (callbacks.refreshSharedScriptBrowser) {
        await callbacks.refreshSharedScriptBrowser()
    }
}

export function leaveCollaboration(scriptID: string, userName: string, refresh = true) {
    // "leaveCollaboration" triggers a "userLeftCollaboration" server response
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
    const leavingCollaborator = data.sender

    if (active && scriptID === data.scriptID) {
        store.dispatch(collabState.removeCollaborator(leavingCollaborator))

        // close collab session tab if it's active and no more collaborators left
        const collaborators = collabState.selectCollaborators(store.getState())
        if (Object.keys(collaborators).length === 1) {
            // true when the script owner is the only collaborator left
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
            if (serverText !== editor.getContents()) {
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

export function sendChatMessage(caiMessage: cai.CaiMessage, caiMessageType: string) {
    const message = {
        action: "chat",
        caiMessage,
        caiMessageType,
        ...makeWebsocketMessage(),
    } as Message

    websocket.send(message)
}

function onChatMessage(data: Message) {
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

// For Wizard of Oz CAI Studies.
function userIsCai(user: string) {
    return user.toUpperCase() === "CAI"
}
