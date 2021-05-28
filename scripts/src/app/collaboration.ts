// Manage client-side collaboration sessions.
import esconsole from '../esconsole'
import * as helpers from '../helpers'
import store from '../reducers'
import reporter from './reporter'
import * as scripts from '../browser/scriptsState'
import * as userNotification from './userNotification'
import * as websocket from './websocket'

export let script: any = null// script object: only used for the off-line mode
export let scriptID: string | null = null// collaboration session identity (both local and remote)

export let userName = ''
let owner = false

let editor: any = null
let editSession: any = null
let aceRange: any = null

let buffer: any[] = []
let synchronized = true// user's own messages against server
let awaiting: any = null// unique edit ID from self

let scriptText = ''
export let lockEditor = true
export let isSynching = false// TODO: redundant? for storing cursors

let sessionActive = false
export let active = false

let selection: any = null
let cursorPos: any = null

// parent state version number on server & client, which the current operation is based on
let state = 0

// keeps track of the SERVER operations. only add the received messages.
let history: any = {}

export let otherMembers: any = {}
let markers: any = {}

export let chat: any = {}
export let tutoring = false

let promises: any = {}
let timeouts: any = {}
let scriptCheckTimerID: any = null

// callbacks for environmental changes
export let refreshScriptBrowser: any = null
export let refreshSharedScriptBrowser: any = null
export let closeSharedScriptIfOpen: any = null

const editTimeout = 5000// sync (rejoin) session if there is no server response
const syncTimeout = 5000// when time out, the websocket connection is likely lost

function PrepareWsMessage() {
    // Note: For the historic mishandling of username letter cases, we treat them as case insensitive (always convert to lowercase) in collaboration and websocket messaging for the time being... Tagging the relevant changes as GH issue #1858.

    this['notification_type'] = 'collaboration'
    this['scriptID'] = scriptID
    this['sender'] = userName  // #1858
}

function initialize() {
    editSession = editor.ace.getSession()
    otherMembers = {}
    buffer = []
    timeouts = {}
}

export function setUserName(userName: string) {
    userName = userName.toLowerCase()  // #1858
}

export function setEditor(editor: any) {
    editor = editor
    editSession = editor.ace.getSession()
    aceRange = ace.require('ace/range').Range
}

// Opening a script with collaborators starts a real-time collaboration session.
export function openScript(script: any, userName: string) {
    script.username = script.username.toLowerCase()// #1858
    script = script

    userName = userName.toLowerCase()// #1858

    const shareID = script.shareid

    if (scriptID !== shareID) {
        esconsole('opening a collaborative script: ' + shareID, 'collab')

        // initialize the local model
        initialize()

        joinSession(shareID, userName)
        editor.setReadOnly(true)
        setOwner(script.username === userName)

        if (!owner) {
            otherMembers[script.username] = {
                active: false,
                canEdit: true
            }

            // TODO: combine with other-members state object?
            chat[script.username] = {
                text: '',
                popover: false
            }
        }

        script.collaborators.forEach(function (member: string) {
            member = member.toLowerCase()// #1858
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                }

                chat[member] = {
                    text: '',
                    popover: false
                }
            }
        })

        chat[userName] = {
            text: '',
            popover: false
        }
    }
    reporter.openSharedScript()
}

export function closeScript(shareID: string, userName: string) {
    userName = userName.toLowerCase()// #1858

    if (scriptID === shareID) {
        esconsole('closing a collaborative script: ' + shareID, 'collab')

        leaveSession(shareID, userName)
        lockEditor = false

        removeOtherCursors()

        active = false
        scriptID = null

        for (const timeout in timeouts) {
            clearTimeout(timeouts[timeout])
        }

        timeouts = {}
    } else {
        esconsole('cannot close the active tab with different script ID')
    }
}

function setOwner(boolean: boolean) {
    owner = boolean
}

export function checkSessionStatus() {
    esconsole('checking collaboration session status', 'collab')

    const message = new (PrepareWsMessage() as any)
    message.action = 'checkSessionStatus'
    message.state = state
    websocket.send(message)

    // check the websocket connection
    timeouts[userName] = setTimeout(onFailedToSynchronize, syncTimeout)
}

function onSessionStatus(data: any) {
    esconsole('session status received', 'collab')
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
    userNotification.show('Failed to synchronize with the central server. You might already have another EarSketch window or tab open somewhere. To fix  please refresh page.', 'failure2', 999)
}

function joinSession(shareID: string, userName: string) {
    esconsole('joining collaboration session: ' + shareID, 'collab')

    scriptID = shareID
    userName = userName.toLowerCase()// #1858

    const message = new (PrepareWsMessage as any)()
    message.action = 'joinSession'
    message.state = state
    websocket.send(message)

    // check the websocket connection
    timeouts[userName] = setTimeout(onFailedToSynchronize, syncTimeout)
}

function onJoinedSession(data: any) {
    esconsole('joined collaboration session: ' + data.scriptID, 'collab')

    // clear the websocket connection check
    clearTimeout(timeouts[userName])
    delete timeouts[userName]
    
    // open script in editor
    scriptText = data.scriptText
    setEditorTextWithoutOutput(scriptText)

    // sync the server state number
    state = data.state
    history = {}// TODO: pull all the history? maybe not

    editor.setReadOnly(false)
    active = true
    sessionActive = true

    // the state of the initiated messages and messageBuffer
    synchronized = true

    data.activeMembers.forEach(function (member: string) {
        if (member !== userName) {
            otherMembers[member].active = true
        }
    })

    if (promises['joinSession']) {
        promises['joinSession'](data)
        delete promises['joinSession']
    }
}

function onSessionsFull(data: any) {
    // clear the websocket connection check sent from joinSession
    clearTimeout(timeouts[userName])
    delete timeouts[userName]

    esconsole('could not create a session. max number reached: ' + data.scriptID, 'collab')
    userNotification.show('Server has reached the maximum number of real-time collaboration sessions. Please try again later.', 'failure1')

    openScriptOffline(script)
}

function openScriptOffline(script: any) {
    esconsole('opening a collaborative script in the off-line mode', 'collab')
    script.username = script.username.toLocaleString()// #1858
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

export function leaveSession(shareID: string, username?: string) {
    esconsole('leaving collaboration session: ' + shareID, 'collab')
    lockEditor = true

    const message = new (PrepareWsMessage as any)()
    message.action = 'leaveSession'
    websocket.send(message)

    helpers.getNgRootScope().$emit('leftCollabSession', null)
}

function onMemberJoinedSession(data: any) {
    userNotification.show(data.sender + ' has joined the collaboration session.')

    if (otherMembers.hasOwnProperty(data.sender)) {
        otherMembers[data.sender].active = true
    } else {
        otherMembers[data.sender] = {
            active: true,
            canEdit: true
        }
    }

    helpers.getNgRootScope().$apply()// update GUI
}

function onMemberLeftSession(data: any) {
    userNotification.show(data.sender + ' has left the collaboration session.')

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender])
    }

    otherMembers[data.sender].active = false

    helpers.getNgRootScope().$apply()// update GUI
}

export function addCollaborators(shareID: string, userName: string, addedCollaborators: string[]) {
    // #1858 Note: addedCollaborators are already converted to lower case in shareScriptController.js:328.
    if (addedCollaborators.length !== 0) {
        const message = new (PrepareWsMessage as any)()
        message.action = 'addCollaborators'
        message.scriptID = shareID
        message.sender = userName.toLowerCase()// #1858
        message.collaborators = addedCollaborators
        // add script name info (done in the server side now)
        websocket.send(message)

        if (scriptID === shareID && active) {
            addedCollaborators.forEach(function (member) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                }
            })
        }
    }
}

export function removeCollaborators(shareID: string, userName: string, removedCollaborators: string[]) {
    // #1858 Note: removedCollaborators are already converted to lower case in shareScriptController.js:328.
    if (removedCollaborators.length !== 0) {
        const message = new (PrepareWsMessage as any)()
        message.action = 'removeCollaborators'
        message.scriptID = shareID
        message.sender = userName.toLowerCase()// #1858
        message.collaborators = removedCollaborators
        websocket.send(message)

        if (scriptID === shareID && active) {
            removedCollaborators.forEach(function (member) {
                delete otherMembers[member]
            })
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
    timeouts[messageID] = setTimeout(function () {
        esconsole('edit synchronization timed out', 'collab')

        rejoinSession()
    }, editTimeout)
}

export function editScript(data: any) {
    storeCursor(editSession.selection.getCursor())
    if (scriptCheckTimerID) {
        clearTimeout(scriptCheckTimerID)
    }

    const message = new (PrepareWsMessage as any)()
    message.action = 'edit'
    message.ID = generateRandomID()
    message.state = state
    message.editData = data

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

function onEditMessage(data: any) {
    editor.setReadOnly(true)
    history[data.state] = data.editData

    // filter out own edit
    if (data.ID === awaiting) {
        clearTimeout(timeouts[data.ID])
        delete timeouts[data.ID]

        state++

        if (buffer.length > 1) {
            const nextMessage = buffer[1]
            awaiting = nextMessage.ID

            if (state !== nextMessage.state) {
                esconsole('client -> server out of sync: ' + nextMessage.state + ' ' + state + ' ' + nextMessage.editData.text, ['collab', 'nolog'])
                // adjust buffer here???
                rejoinSession()
                return

            } else {
                esconsole('client -> server in sync: ' + state + ' ' + nextMessage.editData.text, ['collab', 'nolog'])
            }

            websocket.send(nextMessage)
            timeoutSync(nextMessage.ID)
        } else {
            esconsole('synced with own edit', ['collab', 'nolog'])
            synchronized = true

            // hard sync the script text after 5 seconds of inactivity
            // for potential permanent sync errors
            scriptCheckTimerID = compareScriptText(5000)
        }

        buffer.shift()
    } else {
        let serverOp = data.editData

        if (data.state === state) {
            esconsole('server -> client in sync: ' + data.state + ' ' + data.editData.text, ['collab', 'nolog'])

        } else  {
            esconsole('server -> client out of sync: ' + data.state + ' ' + state + ' ' + data.editData.text, ['collab', 'nolog'])

            requestSync()
        }

        if (buffer.length > 0) {
            esconsole('adjusting buffered edits...', ['collab', 'nolog'])

            buffer = buffer.map(function (op: any) {
                esconsole("input : " + JSON.stringify(op.editData), ['collab', 'nolog'])
                const tops = transform(serverOp, op.editData)
                serverOp = tops[0]
                op.editData = tops[1]
                op.state = op.state + 1
                esconsole("output: " + JSON.stringify(op.editData), ['collab', 'nolog'])
                return op
            })

        }

        esconsole('applying the transformed edit', ['collab', 'nolog'])
        apply(serverOp)
        adjustCursor(serverOp)

        state++
    }
    editor.setReadOnly(false)
}

/**
 * Used with the version-control revertScript
 */
export function reloadScriptText(text: string) {
    editor.ace.setValue(text, -1)
}

function syncToSession(data: any) {
    state = data.state

    if (scriptText === data.scriptText) {
        return null
    }

    isSynching = true
    scriptText = data.scriptText

    setEditorTextWithoutOutput(scriptText)

    // try to reset the cursor position
    editSession.selection.moveCursorToPosition(cursorPos)

    if (JSON.stringify(selection.start) !==  JSON.stringify(selection.end)) {
        const start = selection.start
        const end = selection.end
        const reverse = JSON.stringify(cursorPos) !== JSON.stringify(selection.end)

        const range = new aceRange(start.row, start.column, end.row, end.column)
        editSession.selection.setSelectionRange(range, reverse)
    }

    isSynching = false
    synchronized = true
    buffer = []
    history = {}
}

function onSyncError(data: any) {
    userNotification.showBanner("There was a sync error. Adjusting the local edit...")
    syncToSession(data)
}

function requestSync() {
    esconsole('requesting synchronization to the server', 'collab')
    const message = new (PrepareWsMessage as any)()
    message.action = 'requestSync'
    websocket.send(message)
}

function onSyncToSession(data: any) {
    syncToSession(data)
}

function rejoinSession() {
    if (active) {
        userNotification.showBanner('Synchronization error: Rejoining the session', 'failure1')

        initialize()

        if (!owner) {
            otherMembers[script.username] = {
                active: false,
                canEdit: true
            }
        }

        script.collaborators.forEach(function (member: string) {
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                }
            }
        })

        const message = new (PrepareWsMessage as any)()
        message.action = 'rejoinSession'
        message.state = state
        message.tutoring = tutoring
        websocket.send(message)
    }

    return new Promise(function (resolve) {
        promises['joinSession'] = resolve
    })
}

export function saveScript(scriptID: string) {
    if (scriptID) {
        if (scriptID === scriptID) {
            const message = new (PrepareWsMessage as any)()
            message.action = 'saveScript'
            websocket.send(message)
        }
    } else {
        const message = new (PrepareWsMessage as any)()
        message.action = 'saveScript'
        websocket.send(message)
    }
    reporter.saveSharedScript()
}

function onScriptSaved(data: any) {
    if (!userIsCAI(data.sender))
        userNotification.show(data.sender + ' saved the current version of the script.', 'success')

    store.dispatch(scripts.syncToNgUserProject())
}

export function storeCursor(position: any) {
    if (position !== cursorPos) {
        cursorPos = position

        const idx = editSession.getDocument().positionToIndex(position, 0)

        const message = new (PrepareWsMessage as any)()
        message.action = 'cursorPosition'
        message.position = idx
        message.state = state
        websocket.send(message)
    }
}

export function storeSelection(selection: any) {
    if (selection !== selection) {
        selection = selection

        const document = editSession.getDocument()
        const start = document.positionToIndex(selection.start, 0)
        const end = document.positionToIndex(selection.end, 0)

        const message = new (PrepareWsMessage as any)()
        message.action = 'select'
        message.start = start
        message.end = end
        message.state = state
        websocket.send(message)
    }
}

function onCursorPosMessage(data: any) {
    data.sender = data.sender.toLowerCase()// #1858
    const document = editSession.getDocument()
    const cursorPos = document.indexToPosition(data.position, 0)
    const range = new aceRange(cursorPos.row, cursorPos.column, cursorPos.row, cursorPos.column+1)

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender])
    }

    const num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1

    markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true)
}

function onSelectMessage(data: any) {
    data.sender = data.sender.toLowerCase()// #1858

    const document = editSession.getDocument()
    const start = document.indexToPosition(data.start, 0)
    const end = document.indexToPosition(data.end, 0)

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender])
    }

    const num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1

    if (data.start === data.end) {
        const range = new aceRange(start.row, start.column, start.row, start.column+1)
        markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true)
    } else {
        const range = new aceRange(start.row, start.column, end.row, end.column)
        markers[data.sender] = editSession.addMarker(range, 'generic-selection-'+num, 'line', true)
    }
}

function removeOtherCursors() {
    for (const m in otherMembers) {
        if (markers.hasOwnProperty(m)) {
            editSession.removeMarker(markers[m])
        }
        delete markers[m]
    }
}

function onMiscMessage(data: any) {
    userNotification.show(data.text)
}

function onChangeWriteAccess(data: any) {
    if (data.canEdit) {
        editor.setReadOnly(false)
        userNotification.show(data.sender + ' gave you the write access!', 'collaboration')
    } else {
        editor.setReadOnly(true)
        userNotification.show('You no longer have the write access.', 'collaboration')
    }
}

// After certain period of inactivity, the session closes automatically, sending message. It should flag for startSession to be sent before the next action.
function onSessionClosed(data: any) {
    esconsole('remote session closed', 'collab')

    sessionActive = false

    for (const member in otherMembers) {
        otherMembers[member].active = false
    }

    helpers.getNgRootScope().$apply()  // update GUI
}

function onSessionClosedForInactivity(data: any) {
    userNotification.show("Remote collaboration session was closed because of a prolonged inactivitiy.")
}

function beforeTransf(operation: any) {
    if (operation.action === 'insert') {
        operation.len = operation.text.length
        operation.end = operation.start + operation.len
    } else if (operation.action === 'remove') {
        operation.end = operation.start + operation.len
    }
    return JSON.parse(JSON.stringify(operation))
}

function afterTransf(operation: any) {
    if (operation.action === 'insert') {
        operation.end = operation.start + operation.len
    } else if (operation.action === 'remove') {
        operation.end = operation.start + operation.len
    } else if (operation.action === 'mult') {
        operation.operations = operation.operations.map(function (op: any) {
            return afterTransf(op)
        })
    }
    return operation
}

// Operational transform (with no composition)
function transform(op1: any, op2: any) {
    op1 = beforeTransf(op1)
    op2 = beforeTransf(op2)

    if (op1.action === 'mult') {
        op1.operations = op1.operations.map(function (op: any) {
            const tops = transform(op, op2)
            op2 = tops[1]
            return tops[0]
        })
    } else if (op2.action === 'mult') {
        op2.operations = op2.operations.map(function (op: any) {
            const tops = transform(op1, op)
            op1 = tops[0]
            return tops[1]
        })
    } else {
        if (op1.action === 'insert' && op2.action === 'insert') {
            if (op1.start <= op2.start) {
                op2.start += op1.len
            } else {
                op1.start += op2.len
            }
        } else if (op1.action === 'insert' && op2.action === 'remove') {
            if (op1.start <= op2.start){
                op2.start += op1.len
            } else if (op2.start < op1.start && op1.start <= op2.end) {
                const overlap = op2.end - op1.start
                op1.start = op2.start

                op2 = {
                    action: 'mult',
                    operations: [{
                        action: 'remove',
                        start: op2.start,
                        len: op2.len - overlap
                    }, {
                        action: 'remove',
                        start: op1.end - (op2.len - overlap),
                        len: overlap
                    }]
                }
            } else if (op2.end < op1.start) {
                op1.start -= op2.len
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab')
            }
        } else if (op1.action === 'remove' && op2.action === 'insert') {
            if (op1.end <= op2.start) {
                op2.start -= op1.len
            } else if (op1.start <= op2.start && op2.start < op1.end && op1.end <= op2.end) {
                const overlap = op1.end - op2.start

                const top1 = {
                    action: 'mult',
                    operations: [{
                        action: 'remove',
                        start: op1.start,
                        len: op1.len - overlap
                    }, {
                        action: 'remove',
                        start: op2.end - (op1.len - overlap),
                        len: overlap
                    }]
                }

                op2.start = op1.start
                op1 = top1
            } else if (op1.start <= op2.start && op2.end <= op1.end) {
                const top1 = {
                    action: 'mult',
                    operations: [{
                        action: 'remove',
                        start: op1.start,
                        len: op2.start - op1.start
                    }, {
                        action: 'remove',
                        start: op1.start + op2.len,
                        len: op1.len - (op2.start - op1.start)
                    }]
                }
                op2.start = op1.start
                op1 = top1
            } else if (op2.start <= op1.start) {
                op1.start += op2.len
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab')
            }
        } else if (op1.action === 'remove' && op2.action === 'remove') {
            if (op1.end <= op2.start) {
                op2.start -= op1.len
            } else if (op1.start <= op2.start && op2.start < op1.end && op1.end <= op2.end) {
                const overlap = op1.end - op2.start
                op1.len -= overlap
                op2.start = op1.start
                op2.len -= overlap
            } else if (op2.start < op1.start && op1.start <= op2.end && op2.end <= op1.end) {
                const overlap = op2.end - op1.start
                op1.start = op2.start
                op1.len -= overlap
                op2.len -= overlap
            } else if (op2.end <= op1.start) {
                op1.start -= op2.len
            } else if (op1.start < op2.start && op2.end < op1.end) {
                op1 = {
                    action: 'mult',
                    operations: [{
                        action: 'remove',
                        start: op1.start,
                        len: op2.start - op1.start
                    }, {
                        action: 'remove',
                        start: op2.start - 1,
                        len: op1.end - op2.end
                    }]
                }

                op2.len = 0
            } else if (op2.start < op1.start && op1.end < op2.end) {
                op1.len = 0

                op2 = {
                    action: 'mult',
                    operations: [{
                        action: 'remove',
                        start: op2.start,
                        len: op1.start - op2.start
                    }, {
                        action: 'remove',
                        start: op1.start - 1,
                        len: op2.end - op1.end
                    }]
                }
            } else if (op1.start === op2.start && op1.end === op2.end) {
                // already covered
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab')
            }
        }
    }

    const results = []
    results[0] = afterTransf(op1)
    results[1] = afterTransf(op2)

    return results
}

const operations: any = {
    insert(op: any) {
        const document = editSession.getDocument()
        const start = document.indexToPosition(op.start, 0)
        const text = op.text
        editSession.insert(start, text)
    },

    remove(op: any) {
        const document = editSession.getDocument()
        const start = document.indexToPosition(op.start, 0)
        const end = document.indexToPosition(op.end, 0)

        editSession.remove({
            start: start,
            end: end
        })
    }
}

operations.mult = function (op: any) {
    op.operations.forEach(function (o: any) {
        apply(o)
    })
}

// Applies edit operations on the editor content.
function apply(op: any) {
    lockEditor = true
    operations[op.action](op)
    lockEditor = false
}

// Other people's operations may affect where the user's cursor should be.
function adjustCursor(op: any) {
    if (op.action === 'mult') {
        op.operations.forEach(function (o: any) {
            adjustCursor(o)
        })
    } else if (op.action === 'insert') {
        if (op.start <= cursorPos) {
            cursorPos += op.text.length
        }
    } else if (op.action === 'remove') {
        if (op.start < cursorPos) {
            if (op.end <= cursorPos) {
                cursorPos -= op.len
            } else {
                cursorPos = op.start
            }
        }
    }
}

async function onUserAddedToCollaboration(data: any) {
    if (active && scriptID === data.scriptID) {
        data.addedMembers.forEach(function (member: string) {
            otherMembers[member] = {
                active: false,
                canEdit: true
            }
        })
    }

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser()
        store.dispatch(scripts.syncToNgUserProject())
    }
}

async function onUserRemovedFromCollaboration(data: any) {
    if (data.removedMembers.indexOf(userName) !== -1) {
        if (closeSharedScriptIfOpen) {
            closeSharedScriptIfOpen(data.scriptID)
        }
    } else if (active && scriptID === data.scriptID) {
        data.removedMembers.forEach(function (member: string) {
            delete otherMembers[member]
        })
    }

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser()
        store.dispatch(scripts.syncToNgUserProject())
    }
}

export function leaveCollaboration(scriptID: string, userName: string, refresh=true) {
    const message = new (PrepareWsMessage as any)()
    message.action = 'leaveCollaboration'
    message.scriptID = scriptID
    message.sender = userName.toLowerCase()// #1858
    websocket.send(message)

    if (refresh && refreshSharedScriptBrowser) {
        return refreshSharedScriptBrowser()
    } else {
        return Promise.resolve(null)
    }
}

async function onUserLeftCollaboration(data: any) {
    if (active && scriptID === data.scriptID) {
        delete otherMembers[data.sender.toLowerCase()]  // #1858

        // close collab session tab if it's active and no more collaborators left
        if (Object.keys(otherMembers).length === 0) {
            closeScript(data.scriptID, userName)
        }
    }

    if (refreshScriptBrowser) {
        await refreshScriptBrowser()
    }
    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser()
    }
    store.dispatch(scripts.syncToNgUserProject())
}

export function renameScript(scriptID: string, scriptName: string, userName: string) {
    esconsole('renaming the script for ' + scriptID, 'collab')
    const message = new (PrepareWsMessage as any)()
    message.action = 'renameScript'
    message.scriptID = scriptID
    message.scriptName = scriptName
    message.sender = userName.toLowerCase()// #1858
    websocket.send(message)
}

async function onScriptRenamed(data: any) {
    esconsole(data.sender + ' renamed a collaborative script ' + data.scriptID, 'collab')

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser()
        store.dispatch(scripts.syncToNgUserProject())
    }
}

export function getScriptText(scriptID: string) {
    esconsole('requesting the script text for ' + scriptID, 'collab')

    const message = new (PrepareWsMessage as any)()
    message.action = 'getScriptText'
    message.scriptID = scriptID
    websocket.send(message)

    return new Promise(function (resolve) {
        promises['getScriptText'] = resolve
    })
}

function onScriptText(data: any) {
    if (promises['getScriptText']) {
        promises['getScriptText'](data.scriptText)
        delete promises['getScriptText']
    }
}

function compareScriptText(delay: number) {
    return setTimeout(function () {
        getScriptText(scriptID!).then(function (serverText: string) {
            if (serverText !== editor.getValue()) {
                // possible sync error
                rejoinSession()
            }
        })
    }, delay)
}

export function joinTutoring() {
    const message = new (PrepareWsMessage as any)()
    message.action = 'joinTutoring'
    websocket.send(message)

    tutoring = true
}

export function leaveTutoring() {
    const message = new (PrepareWsMessage as any)()
    message.action = 'leaveTutoring'
    websocket.send(message)

    tutoring = false
}

export function sendChatMessage(text: string) {
    const message = new (PrepareWsMessage as any)()
    message.action = 'chat'
    message.text = text
    message.date = Date.now()
    websocket.send(message)

    return message
}

export function chatSubscribe(scope: any, callback: Function) {
    const chatMessageHandler = helpers.getNgRootScope().$on('chatMessageReceived', callback)
    const compileTrialHandler = helpers.getNgRootScope().$on('compileTrialReceived', callback)

    if (scope) {
        scope.$on('$destroy', chatMessageHandler)
        scope.$on('$destroy', compileTrialHandler)
    }
}

export function onJoinSubscribe(scope: any, callback: Function) {
    const handler = helpers.getNgRootScope().$on('joinedCollabSession', callback)
    if (scope) {
        scope.$on('$destroy', handler)
    }
}

export function onLeaveSubscribe(scope: any, callback: Function) {
    const handler = helpers.getNgRootScope().$on('leftCollabSession', callback)
    if (scope) {
        scope.$on('$destroy', handler)
    }
}

export function onJoinTutoringSubscribe(scope: any, callback: Function) {
    const handler = helpers.getNgRootScope().$on('joinedTutoring', callback)
    if (scope) {
        scope.$on('$destroy', handler)
    }
}

export function sendCompilationRecord(type: string) {
    const message = new (PrepareWsMessage as any)()
    message.action = 'compile'
    message.text = type
    websocket.send(message)
}


const GENERAL_HANDLERS: { [key: string]: (data: any) => void } = {
    onJoinedSession(data: any) {
        onJoinedSession(data)
        helpers.getNgRootScope().$emit('joinedCollabSession', data)
    },
    onSessionStatus,
    onSessionClosed,
    onSessionsFull,
    onUserAddedToCollaboration,
    onUserRemovedFromCollaboration,
    onUserLeftCollaboration,
    onScriptRenamed,
    onScriptText,
    onJoinedTutoring: (data: any) => helpers.getNgRootScope().$emit('joinedTutoring', data),
}

const SCRIPT_HANDLERS: { [key: string]: (data: any) => void } = {
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
    onChat: (data: any) => helpers.getNgRootScope().$emit('chatMessageReceived', data),
    onCompile: (data: any) => helpers.getNgRootScope().$emit('compileTrialReceived', data),
    onSessionClosedForInactivity,
}

// websocket callbacks
function triggerByNotification(data: any) {
    if (data.notification_type === 'collaboration') {
        // Convert e.g. "joinedSession" to "onJoinedSession"
        const action = "on" + data.action.charAt(0).toUpperCase() + data.action.slice(1)
        GENERAL_HANDLERS[action]?.(data)

        if (active && scriptID === data.scriptID) {
            SCRIPT_HANDLERS[action]?.(data)
        }
    }
}

websocket.subscribe(triggerByNotification)


// TEMPORARY for Wizard of Oz CAI testing, Spring 2020.
function userIsCAI(user: string) {
    user = user.toUpperCase()
    return (user.indexOf("AI_PARTNER") !== -1 || user.indexOf("CAI") !== -1)
}