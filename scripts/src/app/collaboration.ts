// Manage client-side collaboration sessions.
import esconsole from '../esconsole';
import * as helpers from '../helpers';
import store from '../reducers';
import reporter from './reporter';
import * as scripts from '../browser/scriptsState';
import * as userNotification from './userNotification';
import * as websocket from './websocket';

export let script: any = null; // script object: only used for the off-line mode
export let scriptID: string | null = null; // collaboration session identity (both local and remote)

export let userName = '';
export let owner = false;
export let canEdit = true;

export let editor: any = null;
var editSession: any = null;
var aceRange: any = null;

export let buffer: any[] = [];
export let synchronized = true; // user's own messages against server
export let awaiting = null; // unique edit ID from self

export let scriptText = '';
export let lockEditor = true;
export let isSynching = false; // TODO: redundant? for storing cursors

export let sessionActive = false;
export let active = false;
// syncPromise = null;

export let selection: any = null;
export let cursorPos: any = null;

// redundant?
// userStatus = null;
export let role = 'viewer';

// parent state version number on server & client, which the current operation is based on
export let state = 0;

// keeps track of the SERVER operations. only add the received messages.
export let history: any = {};

export let collaborators = {};
export let otherMembers: any = {};
// otherActiveMembers = [];
export let markers: any = {};
export let colors = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]];

export let chat: any = {};
export let tutoring = false;

export let promises: any = {};
export let timeouts: any = {};
export let scriptCheckTimerID: any = null;

// callbacks for environmental changes
export let refreshScriptBrowser: any = null;
export let refreshSharedScriptBrowser: any = null;
export let closeSharedScriptIfOpen: any = null;

var editTimeout = 5000; // sync (rejoin) session if there is no server response
var syncTimeout = 5000; // when time out, the websocket connection is likely lost

// websocket callbacks
function triggerByNotification(data: any) {
    if (data.notification_type === 'collaboration') {
        switch (data.action) {
            case 'joinedSession': {
                onJoinedSession(data);
                helpers.getNgRootScope().$emit('joinedCollabSession', data);
                break;
            }
            // case 'invited': { // not used
            //     onInvitation(data);
            //     break;
            // }
            case 'sessionStatus': {
                onSessionStatus(data);
                break;
            }
            case 'sessionClosed': {
                onSessionClosed(data);
                break;
            }
            case 'sessionsFull': {
                onSessionsFull(data);
                break;
            }
            case 'userAddedToCollaboration': {
                onUserAddedToCollaboration(data);
                break;
            }
            case 'userRemovedFromCollaboration': {
                onUserRemovedFromCollaboration(data);
                break;
            }
            case 'userLeftCollaboration': {
                onUserLeftCollaboration(data);
                break;
            }
            case 'scriptRenamed': {
                onScriptRenamed(data);
                break;
            }
            case 'scriptText': {
                onScriptText(data);
                break;
            }
            case 'joinedTutoring': {
                helpers.getNgRootScope().$emit('joinedTutoring', data);
            }
        }

        if (active && scriptID === data.scriptID) {
            switch (data.action) {
                case 'edit': {
                    onEditMessage(data);
                    break;
                }
                case 'syncToSession': {
                    onSyncToSession(data);
                    break;
                }
                case 'syncError': {
                    onSyncError(data);
                    break;
                }
                case 'scriptSaved': {
                    onScriptSaved(data);
                    break;
                }
                case 'alreadySaved': {
                    onAlreadySaved(data);
                    break;
                }
                case 'cursorPosition': {
                    onCursorPosMessage(data);
                    break;
                }
                case 'select': {
                    onSelectMessage(data);
                    break;
                }
                case 'memberJoinedSession': {
                    onMemberJoinedSession(data);
                    break;
                }
                case 'memberLeftSession': {
                    onMemberLeftSession(data);
                    break;
                }
                case 'miscMessage': {
                    onMiscMessage(data);
                    break;
                }
                case 'writeAccess': {
                    onChangeWriteAccess(data);
                    break;
                }
                case 'chat': {
                    helpers.getNgRootScope().$emit('chatMessageReceived', data);
                    break;
                }
                case 'compile': {
                    helpers.getNgRootScope().$emit('compileTrialReceived', data);
                    break;
                }
                case 'sessionClosedForInactivity': {
                    onSessionClosedForInactivity(data);
                    break;
                }
            }
        }
    }
}

websocket.subscribe(triggerByNotification);

function PrepareWsMessage() {
    // Note: For the historic mishandling of username letter cases, we treat them as case insensitive (always convert to lowercase) in collaboration and websocket messaging for the time being... Tagging the relevant changes as GH issue #1858.

    this['notification_type'] = 'collaboration';
    this['scriptID'] = scriptID;
    this['sender'] = userName; // #1858
}

export let initialize = function () {
    editSession = editor.ace.getSession();
    otherMembers = {};
    buffer = [];
    timeouts = {};
};

export let setUserName = function (userName: string) {
    userName = userName.toLowerCase(); // #1858
};

export let setEditor = function (editor: any) {
    editor = editor;
    editSession = editor.ace.getSession();
    aceRange = ace.require('ace/range').Range;
};

/**
 * Opening a script with collaborators starts a real-time collaboration session.
 */
export let openScript = function (script: any, userName: string) {
    script.username = script.username.toLowerCase(); // #1858
    script = script;

    userName = userName.toLowerCase(); // #1858

    var shareID = script.shareid;

    if (scriptID !== shareID) {
        esconsole('opening a collaborative script: ' + shareID, 'collab');

        // initialize the local model
        initialize();

        joinSession(shareID, userName);
        editor.setReadOnly(true);
        setOwner(script.username === userName);

        if (!owner) {
            otherMembers[script.username] = {
                active: false,
                canEdit: true
            };

            // TODO: combine with other-members state object?
            chat[script.username] = {
                text: '',
                popover: false
            };
        }

        script.collaborators.forEach(function (member: string) {
            member = member.toLowerCase(); // #1858
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                };

                chat[member] = {
                    text: '',
                    popover: false
                };
            }
        });

        chat[userName] = {
            text: '',
            popover: false
        };
    }
    reporter.openSharedScript();
};

export let closeScript = function (shareID: string, userName: string) {
    userName = userName.toLowerCase(); // #1858

    if (scriptID === shareID) {
        esconsole('closing a collaborative script: ' + shareID, 'collab');

        leaveSession(shareID, userName);
        lockEditor = false;

        removeOtherCursors();

        active = false;
        scriptID = null;

        for (var timeout in timeouts) {
            clearTimeout(timeouts[timeout]);
        }

        timeouts = {};
    } else {
        esconsole('cannot close the active tab with different script ID');
    }
};

export let setOwner = function (boolean: boolean) {
    owner = boolean;
};

export let checkSessionStatus = function () {
    esconsole('checking collaboration session status', 'collab');

    var message = new (PrepareWsMessage() as any);
    message.action = 'checkSessionStatus';
    message.state = state;
    websocket.send(message);

    // check the websocket connection
    timeouts[userName] = setTimeout(onFailedToSynchronize, syncTimeout);
};

export let onSessionStatus = function (data: any) {
    esconsole('session status received', 'collab');
    clearTimeout(timeouts[userName]);
    delete timeouts[userName];

    if (data.active) {
        if (data.state !== state) {
            rejoinSession();
        }
    } else {
        rejoinSession();
    }
};

function onFailedToSynchronize() {
    userNotification.show('Failed to synchronize with the central server. You might already have another EarSketch window or tab open somewhere. To fix  please refresh page.', 'failure2', 999);
}

// TODO: may not be directly called by UI
export let closeSession = function (shareID: string) {
    websocket.send({
        'notification_type': 'collaboration',
        'action': 'closeSession',
        'scriptID': shareID,
        'sender': userName
    });
};

export let joinSession = function (shareID: string, userName: string) {
    esconsole('joining collaboration session: ' + shareID, 'collab');

    scriptID = shareID;
    userName = userName.toLowerCase(); // #1858

    var message = new (PrepareWsMessage as any)();
    message.action = 'joinSession';
    message.state = state;
    websocket.send(message);

    // check the websocket connection
    timeouts[userName] = setTimeout(onFailedToSynchronize, syncTimeout);
};

export let onJoinedSession = function (data: any) {
    esconsole('joined collaboration session: ' + data.scriptID, 'collab');

    // clear the websocket connection check
    clearTimeout(timeouts[userName]);
    delete timeouts[userName];
    
    // open script in editor
    scriptText = data.scriptText;
    setEditorTextWithoutOutput(scriptText);
    // highlightEditorFrame(true);

    // sync the server state number
    state = data.state;
    history = {}; // TODO: pull all the history? maybe not

    editor.setReadOnly(false);
    active = true;
    sessionActive = true;

    // the state of the initiated messages and messageBuffer
    synchronized = true;

    data.activeMembers.forEach(function (member: string) {
        if (member !== userName) {
            otherMembers[member].active = true;
        }
    });

    if (promises['joinSession']) {
        promises['joinSession'](data);
        delete promises['joinSession'];
    }
};

export let onSessionsFull = function (data: any) {
    // clear the websocket connection check sent from joinSession
    clearTimeout(timeouts[userName]);
    delete timeouts[userName];

    esconsole('could not create a session. max number reached: ' + data.scriptID, 'collab');
    userNotification.show('Server has reached the maximum number of real-time collaboration sessions. Please try again later.', 'failure1');

    openScriptOffline(script);
};

export let openScriptOffline = function (script: any) {
    esconsole('opening a collaborative script in the off-line mode', 'collab');
    script.username = script.username.toLocaleString(); // #1858
    script.collaborative = false;
    script.readonly = script.username !== userName;

    if (editor.droplet.currentlyUsingBlocks) {
        editor.droplet.setValue(script.source_code, -1);
    } else {
        editor.ace.setValue(script.source_code, -1);
    }
    editor.setReadOnly(script.readonly);

    reporter.openSharedScript();
};

export let leaveSession = function (shareID: string, username?: string) {
    esconsole('leaving collaboration session: ' + shareID, 'collab');
    lockEditor = true;

    var message = new (PrepareWsMessage as any)();
    message.action = 'leaveSession';
    websocket.send(message);

    helpers.getNgRootScope().$emit('leftCollabSession', null);
};

export let onMemberJoinedSession = function (data: any) {
    userNotification.show(data.sender + ' has joined the collaboration session.');

    if (otherMembers.hasOwnProperty(data.sender)) {
        otherMembers[data.sender].active = true;
    } else {
        otherMembers[data.sender] = {
            active: true,
            canEdit: true
        }
    }

    helpers.getNgRootScope().$apply(); // update GUI
};

export let onMemberLeftSession = function (data: any) {
    userNotification.show(data.sender + ' has left the collaboration session.');

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender]);
    }

    otherMembers[data.sender].active = false;

    helpers.getNgRootScope().$apply(); // update GUI
};

export let addCollaborators = function (shareID: string, userName: string, addedCollaborators: string[]) {
    // #1858 Note: addedCollaborators are already converted to lower case in shareScriptController.js:328.
    if (addedCollaborators.length !== 0) {
        var message = new (PrepareWsMessage as any)();
        message.action = 'addCollaborators';
        message.scriptID = shareID;
        message.sender = userName.toLowerCase(); // #1858
        message.collaborators = addedCollaborators;
        // add script name info (done in the server side now)
        websocket.send(message);

        if (scriptID === shareID && active) {
            addedCollaborators.forEach(function (member) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                };
            });
        }
    }
};

export let removeCollaborators = function (shareID: string, userName: string, removedCollaborators: string[]) {
    // #1858 Note: removedCollaborators are already converted to lower case in shareScriptController.js:328.
    if (removedCollaborators.length !== 0) {
        var message = new (PrepareWsMessage as any)();
        message.action = 'removeCollaborators';
        message.scriptID = shareID;
        message.sender = userName.toLowerCase(); // #1858
        message.collaborators = removedCollaborators;
        websocket.send(message);

        if (scriptID === shareID && active) {
            removedCollaborators.forEach(function (member) {
                delete otherMembers[member];
            });
        }
    }
};

// legacy stuff for turn-taking collaboration
// requestWriteAccess = function () {
//     websocket.send({
//         'notification_type': 'collaboration',
//         'action': 'miscMessage',
//         'scriptID': scriptID,
//         'sender': userName,
//         'text': userName + ' has requested the write access!'
//     });
// };
//
// giveUpWriteAccess = function () {
//     websocket.send({
//         'notification_type': 'collaboration',
//         'action': 'miscMessage',
//         'scriptID': scriptID,
//         'sender': userName,
//         'text': userName + ' is done with editing.'
//     });
// };
//
// toggleWriteAccess = function (user) {
//     websocket.send({
//         'notification_type': 'collaboration',
//         'action': 'changeWriteAccess',
//         'scriptID': scriptID,
//         'sender': userName,
//         'targetUser': user,
//         'canEdit': collaborators[user].canEdit
//     })
// };

function setEditorTextWithoutOutput(scriptText: string) {
    lockEditor = true;

    var session = editor.ace.getSession();
    var cursor = session.selection.getCursor();

    editor.ace.setValue(scriptText, -1);
    session.selection.moveCursorToPosition(cursor);

    lockEditor = false;
}

function generateRandomID() {
    return Math.random().toString(36).substr(2, 10);
}

function timeoutSync(messageID: string) {
    timeouts[messageID] = setTimeout(function () {
        esconsole('edit synchronization timed out', 'collab');

        rejoinSession();
    }, editTimeout);
}

export let editScript = function (data: any) {
    storeCursor(editSession.selection.getCursor());
    if (scriptCheckTimerID) {
        clearTimeout(scriptCheckTimerID);
    }

    var message = new (PrepareWsMessage as any)();
    message.action = 'edit';
    message.ID = generateRandomID();
    message.state = state;
    message.editData = data;

    if (synchronized) {
        buffer.push(message);
        synchronized = false;
        awaiting = message.ID;

        if (!sessionActive) {
            rejoinSession();
            // rejoinAndEdit(message);
        } else {
            websocket.send(message);
            timeoutSync(message.ID);
        }
    } else {
        // buffered messages get temporary incremental state nums
        message.state += buffer.length;
        buffer.push(message);
    }
};

export let onEditMessage = function (data: any) {
    editor.setReadOnly(true);
    history[data.state] = data.editData;

    // filter out own edit
    if (data.ID === awaiting) {
        clearTimeout(timeouts[data.ID]);
        delete timeouts[data.ID];

        state++;

        if (buffer.length > 1) {
            var nextMessage = buffer[1];
            awaiting = nextMessage.ID;

            if (state !== nextMessage.state) {
                esconsole('client -> server out of sync: ' + nextMessage.state + ' ' + state + ' ' + nextMessage.editData.text, ['collab', 'nolog']);
                // adjust buffer here???
                rejoinSession();
                return;

            } else {
                esconsole('client -> server in sync: ' + state + ' ' + nextMessage.editData.text, ['collab', 'nolog']);
            }

            websocket.send(nextMessage);
            timeoutSync(nextMessage.ID);
        } else {
            esconsole('synced with own edit', ['collab', 'nolog']);
            synchronized = true;

            // hard sync the script text after 5 seconds of inactivity
            // for potential permanent sync errors
            scriptCheckTimerID = compareScriptText(5000);
        }

        buffer.shift();
    } else {
        var serverOp = data.editData;

        if (data.state === state) {
            esconsole('server -> client in sync: ' + data.state + ' ' + data.editData.text, ['collab', 'nolog']);

        } else  {
            esconsole('server -> client out of sync: ' + data.state + ' ' + state + ' ' + data.editData.text, ['collab', 'nolog']);

            requestSync();
        }

        if (buffer.length > 0) {
            esconsole('adjusting buffered edits...', ['collab', 'nolog']);

            buffer = buffer.map(function (op: any) {
                esconsole("input : " + JSON.stringify(op.editData), ['collab', 'nolog']);
                var tops = transform(serverOp, op.editData);
                serverOp = tops[0];
                op.editData = tops[1];
                op.state = op.state + 1;
                esconsole("output: " + JSON.stringify(op.editData), ['collab', 'nolog']);
                return op;
            });

        }

        esconsole('applying the transformed edit', ['collab', 'nolog']);
        apply(serverOp);
        adjustCursor(serverOp);

        state++;
    }
    editor.setReadOnly(false);
};

/**
 * Used with the version-control revertScript
 */
export let reloadScriptText = function (text: string) {
    editor.ace.setValue(text, -1);
};

function syncToSession(data: any) {
    state = data.state;

    if (scriptText === data.scriptText) {
        return null;
    }

    isSynching = true;
    scriptText = data.scriptText;

    setEditorTextWithoutOutput(scriptText);

    // try to reset the cursor position
    editSession.selection.moveCursorToPosition(cursorPos);

    if (JSON.stringify(selection.start) !==  JSON.stringify(selection.end)) {
        var start = selection.start;
        var end = selection.end;
        var reverse = JSON.stringify(cursorPos) !== JSON.stringify(selection.end);

        var range = new aceRange(start.row, start.column, end.row, end.column);
        editSession.selection.setSelectionRange(range, reverse);
    }

    isSynching = false;
    synchronized = true;
    buffer = [];
    history = {};
}

export let onSyncError = function (data: any) {
    userNotification.showBanner("There was a sync error. Adjusting the local edit...");
    syncToSession(data);
};

export let requestSync = function () {
    esconsole('requesting synchronization to the server', 'collab');
    var message = new (PrepareWsMessage as any)();
    message.action = 'requestSync';
    websocket.send(message);
};

export let onSyncToSession = function (data: any) {
    syncToSession(data);
};

export let rejoinSession = function () {
    if (active) {
        userNotification.showBanner('Synchronization error: Rejoining the session', 'failure1');

        initialize();

        if (!owner) {
            otherMembers[script.username] = {
                active: false,
                canEdit: true
            };
        }

        script.collaborators.forEach(function (member: string) {
            if (member !== userName) {
                otherMembers[member] = {
                    active: false,
                    canEdit: true
                };
            }
        });

        var message = new (PrepareWsMessage as any)();
        message.action = 'rejoinSession';
        message.state = state;
        message.tutoring = tutoring;
        websocket.send(message);
    }

    return new Promise(function (resolve) {
        promises['joinSession'] = resolve;
    });
};

// rejoinAndEdit = function (editMessage) {
//     if (active) {
//         esconsole('rejoining session and editing', 'collab');
//         userNotification.showBanner('Synchronization error: Rejoining the session', 'failure1');
//
//         editMessage.action = 'rejoinAndEdit';
//         websocket.send(editMessage);
//     }
// };

export let saveScript = function (scriptID: string) {
    var message;

    if (scriptID) {
        if (scriptID === scriptID) {
            message = new (PrepareWsMessage as any)();
            message.action = 'saveScript';
            websocket.send(message);
        }
    } else {
        message = new (PrepareWsMessage as any)();
        message.action = 'saveScript';
        websocket.send(message);
    }
    reporter.saveSharedScript();
};

export let onScriptSaved = function (data: any) {
    if (!userIsCAI(data.sender))
        userNotification.show(data.sender + ' saved the current version of the script.', 'success');

    store.dispatch(scripts.syncToNgUserProject());
};

export let onAlreadySaved = function (nothing: any) {
    // userNotification.show('Not saved: The current version of the collaborative script is already up to date');
};

export let storeCursor = function (position: any) {
    if (position !== cursorPos) {
        cursorPos = position;

        var idx = editSession.getDocument().positionToIndex(position, 0);

        var message = new (PrepareWsMessage as any)();
        message.action = 'cursorPosition';
        message.position = idx;
        message.state = state;
        websocket.send(message);
    }
};

export let storeSelection = function (selection: any) {
    if (selection !== selection) {
        selection = selection;

        var document = editSession.getDocument();
        var start = document.positionToIndex(selection.start, 0);
        var end = document.positionToIndex(selection.end, 0);

        var message = new (PrepareWsMessage as any)();
        message.action = 'select';
        message.start = start;
        message.end = end;
        message.state = state;
        websocket.send(message);
    }
};

export let onCursorPosMessage = function (data: any) {
    data.sender = data.sender.toLowerCase(); // #1858
    var document = editSession.getDocument();
    var cursorPos = document.indexToPosition(data.position, 0);
    var range = new aceRange(cursorPos.row, cursorPos.column, cursorPos.row, cursorPos.column+1);

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender]);
    }

    var num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1;

    markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true);
};

export let onSelectMessage = function (data: any) {
    data.sender = data.sender.toLowerCase(); // #1858

    var document = editSession.getDocument();
    var start = document.indexToPosition(data.start, 0);
    var end = document.indexToPosition(data.end, 0);
    var range;

    if (markers.hasOwnProperty(data.sender)) {
        editSession.removeMarker(markers[data.sender]);
    }

    var num = Object.keys(otherMembers).indexOf(data.sender) % 6 + 1;

    if (data.start === data.end) {
        range = new aceRange(start.row, start.column, start.row, start.column+1);
        markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true);
    } else {
        range = new aceRange(start.row, start.column, end.row, end.column);
        markers[data.sender] = editSession.addMarker(range, 'generic-selection-'+num, 'line', true);
    }
};

function removeOtherCursors() {
    for (var m in otherMembers) {
        if (markers.hasOwnProperty(m)) {
            editSession.removeMarker(markers[m]);
        }
        delete markers[m];
    }
}

// currently, "invited" user is automatically joined to the collaboration group
// onInvitation = function (data) {
//     userNotification.handleCollabInvitation(data);
// };

export let onMiscMessage = function (data: any) {
    userNotification.show(data.text);
};

export let onChangeWriteAccess = function (data: any) {
    canEdit = data.canEdit;

    if (data.canEdit) {
        role = 'editor';
        editor.setReadOnly(false);
        userNotification.show(data.sender + ' gave you the write access!', 'collaboration');
    } else {
        role = 'viewer';
        editor.setReadOnly(true);
        userNotification.show('You no longer have the write access.', 'collaboration');
    }
};

/**
 * After certain period of inactivity, the session closes automatically, sending message. It should flag for startSession to be sent before the next action.
 */
export let onSessionClosed = function (data: any) {
    esconsole('remote session closed', 'collab');

    // active = false;
    sessionActive = false;

    for (var member in otherMembers) {
        otherMembers[member].active = false;
    }

    helpers.getNgRootScope().$apply(); // update GUI
};

export let onSessionClosedForInactivity = function (data: any) {
    userNotification.show("Remote collaboration session was closed because of a prolonged inactivitiy.");
};

// a legacy code that signifies the editor tab is in collaboration mode
// function highlightEditorFrame(bool) {
//     if (bool) {
//         // angular.element(document.querySelector('#code-toolbar > div.tab-container > div > ul > li.uib-tab.nav-item.ng-isolate-scope.active > a')).css('background-color', '#3371ab7');
//         angular.element(document.querySelectorAll('.nav-tabs > li.active > a, .nav-tabs > li.active > a:focus, .nav-tabs > li.active > a:hover')).css('background-color', '#3371ab7');
//         angular.element(document.getElementsByClassName('code-container')).css('border', '2px solid #337ab7');
//     } else {
//
//     }
// }

function beforeTransf(operation: any) {
    if (operation.action === 'insert') {
        operation.len = operation.text.length;
        operation.end = operation.start + operation.len;
    } else if (operation.action === 'remove') {
        operation.end = operation.start + operation.len;
    }
    return JSON.parse(JSON.stringify(operation));
}

function afterTransf(operation: any) {
    if (operation.action === 'insert') {
        operation.end = operation.start + operation.len;
    } else if (operation.action === 'remove') {
        operation.end = operation.start + operation.len;
    } else if (operation.action === 'mult') {
        operation.operations = operation.operations.map(function (op: any) {
            return afterTransf(op);
        });
    }
    return operation;
}

/**
 * Operational transform (with no composition)
 * @param op1
 * @param op2
 * @returns {Array}
 */
function transform(op1: any, op2: any) {
    op1 = beforeTransf(op1);
    op2 = beforeTransf(op2);

    if (op1.action === 'mult') {
        op1.operations = op1.operations.map(function (op: any) {
            var tops = transform(op, op2);
            op2 = tops[1];
            return tops[0];
        });
    } else if (op2.action === 'mult') {
        op2.operations = op2.operations.map(function (op: any) {
            var tops = transform(op1, op);
            op1 = tops[0];
            return tops[1];
        });
    } else {
        if (op1.action === 'insert' && op2.action === 'insert') {
            if (op1.start <= op2.start) {
                op2.start += op1.len;
            } else {
                op1.start += op2.len;
            }
        } else if (op1.action === 'insert' && op2.action === 'remove') {
            if (op1.start <= op2.start){
                op2.start += op1.len;
            } else if (op2.start < op1.start && op1.start <= op2.end) {
                var overlap = op2.end - op1.start;
                op1.start = op2.start;

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
                op1.start -= op2.len;
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab');
            }
        } else if (op1.action === 'remove' && op2.action === 'insert') {
            if (op1.end <= op2.start) {
                op2.start -= op1.len;
            } else if (op1.start <= op2.start && op2.start < op1.end && op1.end <= op2.end) {
                var overlap = op1.end - op2.start;

                var top1 = {
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
                };

                op2.start = op1.start;
                op1 = top1;
            } else if (op1.start <= op2.start && op2.end <= op1.end) {
                var top1 = {
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
                };
                op2.start = op1.start;
                op1 = top1;
            } else if (op2.start <= op1.start) {
                op1.start += op2.len;
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab');
            }
        } else if (op1.action === 'remove' && op2.action === 'remove') {
            if (op1.end <= op2.start) {
                op2.start -= op1.len;
            } else if (op1.start <= op2.start && op2.start < op1.end && op1.end <= op2.end) {
                var overlap = op1.end - op2.start;
                op1.len -= overlap;
                op2.start = op1.start;
                op2.len -= overlap;
            } else if (op2.start < op1.start && op1.start <= op2.end && op2.end <= op1.end) {
                var overlap = op2.end - op1.start;
                op1.start = op2.start;
                op1.len -= overlap;
                op2.len -= overlap;
            } else if (op2.end <= op1.start) {
                op1.start -= op2.len;
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
                };

                op2.len = 0;
            } else if (op2.start < op1.start && op1.end < op2.end) {
                op1.len = 0;

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
                };
            } else if (op1.start === op2.start && op1.end === op2.end) {
                // already covered
            } else {
                esconsole('case uncovered: ' + JSON.stringify(op1) + ' ' + JSON.stringify(op2), 'collab');
            }
        }
    }

    var results = [];
    results[0] = afterTransf(op1);
    results[1] = afterTransf(op2);

    return results;
}

var operations: any = {
    insert: function (op: any) {
        var document = editSession.getDocument();
        var start = document.indexToPosition(op.start, 0);
        var text = op.text;
        editSession.insert(start, text);
    },

    remove: function (op: any) {
        var document = editSession.getDocument();
        var start = document.indexToPosition(op.start, 0);
        var end = document.indexToPosition(op.end, 0);

        editSession.remove({
            start: start,
            end: end
        });
    }
};

operations.mult = function (op: any) {
    op.operations.forEach(function (o: any) {
        apply(o);
    });
};

/**
 * Applies edit operations on the editor content.
 * @param op
 */
function apply(op: any) {
    lockEditor = true;
    operations[op.action](op);
    lockEditor = false;
}

/**
 * Other people's operations may affect where the user's cursor should be.
 * @param op
 */
function adjustCursor(op: any) {
    if (op.action === 'mult') {
        op.operations.forEach(function (o: any) {
            adjustCursor(o);
        });
    } else if (op.action === 'insert') {
        if (op.start <= cursorPos) {
            cursorPos += op.text.length;
        }
    } else if (op.action === 'remove') {
        if (op.start < cursorPos) {
            if (op.end <= cursorPos) {
                cursorPos -= op.len;
            } else {
                cursorPos = op.start;
            }
        }
    }
}

export let onUserAddedToCollaboration = async function (data: any) {
    // userNotification.show(data.sender + ' added you as a collaborator on ' + data.scriptName, 'collaboration');

    if (active && scriptID === data.scriptID) {
        data.addedMembers.forEach(function (member: string) {
            otherMembers[member] = {
                active: false,
                canEdit: true
            }
        });
    }

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser();
        store.dispatch(scripts.syncToNgUserProject());
    }
};

export let onUserRemovedFromCollaboration = async function (data: any) {
    // userNotification.show(data.sender + ' removed you from collaboration on ' + data.scriptName, 'collaboration');

    if (data.removedMembers.indexOf(userName) !== -1) {
        if (closeSharedScriptIfOpen) {
            closeSharedScriptIfOpen(data.scriptID);
        }
    } else if (active && scriptID === data.scriptID) {
        data.removedMembers.forEach(function (member: string) {
            delete otherMembers[member];
        });
    }

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser();
        store.dispatch(scripts.syncToNgUserProject());
    }
};

export let leaveCollaboration = function (scriptID: string, userName: string, refresh=true) {
    var message = new (PrepareWsMessage as any)();
    message.action = 'leaveCollaboration';
    message.scriptID = scriptID;
    message.sender = userName.toLowerCase(); // #1858
    websocket.send(message);

    if (refresh && refreshSharedScriptBrowser) {
        return refreshSharedScriptBrowser();
    } else {
        return Promise.resolve(null);
    }
};

export let onUserLeftCollaboration = async function (data: any) {
    // userNotification.show(data.sender + ' left the collaboration on ' + data.scriptName, 'collaboration');

    if (active && scriptID === data.scriptID) {
        delete otherMembers[data.sender.toLowerCase()]; // #1858

        // close collab session tab if it's active and no more collaborators left
        if (Object.keys(otherMembers).length === 0) {
            closeScript(data.scriptID, userName);
        }
    }

    if (refreshScriptBrowser) {
        await refreshScriptBrowser();
    }
    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser();
    }
    store.dispatch(scripts.syncToNgUserProject());
};

export let renameScript = function (scriptID: string, scriptName: string, userName: string) {
    esconsole('renaming the script for ' + scriptID, 'collab');
    var message = new (PrepareWsMessage as any)();
    message.action = 'renameScript';
    message.scriptID = scriptID;
    message.scriptName = scriptName;
    message.sender = userName.toLowerCase(); // #1858
    websocket.send(message);
};

export let onScriptRenamed = async function (data: any) {
    esconsole(data.sender + ' renamed a collaborative script ' + data.scriptID, 'collab');
    // userNotification.show('Collaborative script "' + data.oldName + '" was renamed to "' + data.newName + '"', 'collaboration');

    if (refreshSharedScriptBrowser) {
        await refreshSharedScriptBrowser();
        store.dispatch(scripts.syncToNgUserProject());
    }
};

export let getScriptText = function (scriptID: string) {
    esconsole('requesting the script text for ' + scriptID, 'collab');

    var message = new (PrepareWsMessage as any)();
    message.action = 'getScriptText';
    message.scriptID = scriptID;
    websocket.send(message);

    return new Promise(function (resolve) {
        promises['getScriptText'] = resolve;
    });
};

export let onScriptText = function (data: any) {
    if (promises['getScriptText']) {
        promises['getScriptText'](data.scriptText);
        delete promises['getScriptText'];
    }
};

function compareScriptText(delay: number) {
    return setTimeout(function () {
        getScriptText(scriptID!).then(function (serverText: string) {
            if (serverText !== editor.getValue()) {
                // possible sync error
                rejoinSession();
            }
        });
    }, delay);
}

export let joinTutoring = function () {
    var message = new (PrepareWsMessage as any)();
    message.action = 'joinTutoring';
    websocket.send(message);

    tutoring = true;
};

export let leaveTutoring = function () {
    var message = new (PrepareWsMessage as any)();
    message.action = 'leaveTutoring';
    websocket.send(message);

    tutoring = false;
};

export let sendChatMessage = function (text: string) {
    var message = new (PrepareWsMessage as any)();
    message.action = 'chat';
    message.text = text;
    message.date = Date.now();
    websocket.send(message);

    return message;
};

export let chatSubscribe = function (scope: any, callback: Function) {
    var chatMessageHandler = helpers.getNgRootScope().$on('chatMessageReceived', callback);
    var compileTrialHandler = helpers.getNgRootScope().$on('compileTrialReceived', callback);

    if (scope) {
        scope.$on('$destroy', chatMessageHandler);
        scope.$on('$destroy', compileTrialHandler);
    }
};

export let onJoinSubscribe = function (scope: any, callback: Function) {
    var handler = helpers.getNgRootScope().$on('joinedCollabSession', callback);
    if (scope) {
        scope.$on('$destroy', handler);
    }
};

export let onLeaveSubscribe = function (scope: any, callback: Function) {
    var handler = helpers.getNgRootScope().$on('leftCollabSession', callback);
    if (scope) {
        scope.$on('$destroy', handler);
    }
};

export let onJoinTutoringSubscribe = function (scope: any, callback: Function) {
    var handler = helpers.getNgRootScope().$on('joinedTutoring', callback);
    if (scope) {
        scope.$on('$destroy', handler);
    }
};

export let sendCompilationRecord = function (type: string) {
    var message = new (PrepareWsMessage as any)();
    message.action = 'compile';
    message.text = type;
    websocket.send(message);
};

export let sendTabSwitchRecord = function (tab: any) {
    var message = new (PrepareWsMessage as any)();
    message.action = 'switchScript';
    message.text = tab.name;
    websocket.send(message);
};

export let sendCurriculumOpenRecord = function (pageTitle: string) {
    var message = new (PrepareWsMessage as any)();
    message.action = 'openCurriculum';
    message.text = pageTitle;
    websocket.send(message);
};


// TEMPORARY for Wizard of Oz CAI testing, Spring 2020.
export let userIsCAI = function (user: string) {
    user = user.toUpperCase();
    return (user.indexOf("AI_PARTNER") !== -1 || user.indexOf("CAI") !== -1);
};