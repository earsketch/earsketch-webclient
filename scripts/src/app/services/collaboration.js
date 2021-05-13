import * as scripts from '../../browser/scriptsState';

/**
 * Manages client-side collaboration session. Single instance.
 *
 * @module collaboration
 * @author Takahiko Tsuchiya
 */
app.service('collaboration', ['userNotification', 'websocket', 'reporter', '$rootScope', '$ngRedux', function (userNotification, websocket, reporter, $rootScope, $ngRedux) {
    var self = this;
    this.script = null; // script object: only used for the off-line mode
    this.scriptID = null; // collaboration session identity (both local and remote)

    this.userName = '';
    this.owner = false;
    this.canEdit = true;

    this.editor = null;
    var editSession = null;
    var aceRange = null;

    this.buffer = [];
    this.synchronized = true; // user's own messages against server
    this.awaiting = null; // unique edit ID from self

    this.scriptText = '';
    this.lockEditor = true;
    this.isSynching = false; // TODO: redundant? for storing cursors

    this.sessionActive = false;
    this.active = false;
    // this.syncPromise = null;

    this.selection = null;
    this.cursorPos = null;

    // redundant?
    // this.userStatus = null;
    this.role = 'viewer';

    // parent state version number on server & client, which the current operation is based on
    this.state = 0;

    // keeps track of the SERVER operations. only add the received messages.
    this.history = {};

    this.collaborators = {};
    this.otherMembers = {};
    // this.otherActiveMembers = [];
    this.markers = {};
    this.colors = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]];

    this.chat = {};
    this.tutoring = false;

    this.promises = {};
    this.timeouts = {};
    this.scriptCheckTimerID = null;

    // callbacks for environmental changes
    this.refreshScriptBrowser = null;
    this.refreshSharedScriptBrowser = null;
    this.closeSharedScriptIfOpen = null;

    var editTimeout = 5000; // sync (rejoin) session if there is no server response
    var syncTimeout = 5000; // when time out, the websocket connection is likely lost

    // websocket callbacks
    function triggerByNotification(event, data) {
        if (data.notification_type === 'collaboration') {
            switch (data.action) {
                case 'joinedSession': {
                    self.onJoinedSession(data);
                    $rootScope.$emit('joinedCollabSession', data);
                    break;
                }
                // case 'invited': { // not used
                //     self.onInvitation(data);
                //     break;
                // }
                case 'sessionStatus': {
                    self.onSessionStatus(data);
                    break;
                }
                case 'sessionClosed': {
                    self.onSessionClosed(data);
                    break;
                }
                case 'sessionsFull': {
                    self.onSessionsFull(data);
                    break;
                }
                case 'userAddedToCollaboration': {
                    self.onUserAddedToCollaboration(data);
                    break;
                }
                case 'userRemovedFromCollaboration': {
                    self.onUserRemovedFromCollaboration(data);
                    break;
                }
                case 'userLeftCollaboration': {
                    self.onUserLeftCollaboration(data);
                    break;
                }
                case 'scriptRenamed': {
                    self.onScriptRenamed(data);
                    break;
                }
                case 'scriptText': {
                    self.onScriptText(data);
                    break;
                }
                case 'joinedTutoring': {
                    $rootScope.$emit('joinedTutoring', data);
                }
            }

            if (self.active && self.scriptID === data.scriptID) {
                switch (data.action) {
                    case 'edit': {
                        self.onEditMessage(data);
                        break;
                    }
                    case 'syncToSession': {
                        self.onSyncToSession(data);
                        break;
                    }
                    case 'syncError': {
                        self.onSyncError(data);
                        break;
                    }
                    case 'scriptSaved': {
                        self.onScriptSaved(data);
                        break;
                    }
                    case 'alreadySaved': {
                        self.onAlreadySaved(data);
                        break;
                    }
                    case 'cursorPosition': {
                        self.onCursorPosMessage(data);
                        break;
                    }
                    case 'select': {
                        self.onSelectMessage(data);
                        break;
                    }
                    case 'memberJoinedSession': {
                        self.onMemberJoinedSession(data);
                        break;
                    }
                    case 'memberLeftSession': {
                        self.onMemberLeftSession(data);
                        break;
                    }
                    case 'miscMessage': {
                        self.onMiscMessage(data);
                        break;
                    }
                    case 'writeAccess': {
                        self.onChangeWriteAccess(data);
                        break;
                    }
                    case 'chat': {
                        $rootScope.$emit('chatMessageReceived', data);
                        break;
                    }
                    case 'compile': {
                        $rootScope.$emit('compileTrialReceived', data);
                        break;
                    }
                    case 'sessionClosedForInactivity': {
                        self.onSessionClosedForInactivity(data);
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
        this['scriptID'] = self.scriptID;
        this['sender'] = self.userName; // #1858
    }

    this.initialize = function () {
        editSession = this.editor.ace.getSession();
        this.otherMembers = {};
        this.buffer = [];
        this.timeouts = {};
    };

    this.setUserName = function (userName) {
        this.userName = userName.toLowerCase(); // #1858
    };

    this.setEditor = function (editor) {
        this.editor = editor;
        editSession = this.editor.ace.getSession();
        aceRange = ace.require('ace/range').Range;
    };

    /**
     * Opening a script with collaborators starts a real-time collaboration session.
     */
    this.openScript = function (script, userName) {
        script.username = script.username.toLowerCase(); // #1858
        this.script = script;

        userName = userName.toLowerCase(); // #1858

        var shareID = script.shareid;

        if (this.scriptID !== shareID) {
            esconsole('opening a collaborative script: ' + shareID, 'collab');

            // initialize the local model
            this.initialize();

            this.joinSession(shareID, userName);
            this.editor.setReadOnly(true);
            this.setOwner(script.username === userName);

            if (!this.owner) {
                self.otherMembers[script.username] = {
                    active: false,
                    canEdit: true
                };

                // TODO: combine with other-members state object?
                self.chat[script.username] = {
                    text: '',
                    popover: false
                };
            }

            script.collaborators.forEach(function (member) {
                member = member.toLowerCase(); // #1858
                if (member !== userName) {
                    self.otherMembers[member] = {
                        active: false,
                        canEdit: true
                    };

                    self.chat[member] = {
                        text: '',
                        popover: false
                    };
                }
            });

            this.chat[userName] = {
                text: '',
                popover: false
            };
        }
        reporter.openSharedScript();
    };

    this.closeScript = function (shareID, userName) {
        userName = userName.toLowerCase(); // #1858

        if (this.scriptID === shareID) {
            esconsole('closing a collaborative script: ' + shareID, 'collab');

            this.leaveSession(shareID, userName);
            this.lockEditor = false;

            removeOtherCursors();

            this.active = false;
            this.scriptID = null;

            for (var timeout in this.timeouts) {
                clearTimeout(this.timeouts[timeout]);
            }

            this.timeouts = {};
        } else {
            esconsole('cannot close the active tab with different script ID');
        }
    };

    this.setOwner = function (boolean) {
        this.owner = boolean;
    };

    this.checkSessionStatus = function () {
        esconsole('checking collaboration session status', 'collab');

        var message = new PrepareWsMessage();
        message.action = 'checkSessionStatus';
        message.state = this.state;
        websocket.send(message);

        // check the websocket connection
        this.timeouts[this.userName] = setTimeout(onFailedToSynchronize, syncTimeout);
    };

    this.onSessionStatus = function (data) {
        esconsole('session status received', 'collab');
        clearTimeout(this.timeouts[this.userName]);
        delete this.timeouts[this.userName];

        if (data.active) {
            if (data.state !== this.state) {
                this.rejoinSession();
            }
        } else {
            this.rejoinSession();
        }
    };

    function onFailedToSynchronize() {
        userNotification.show('Failed to synchronize with the central server. You might already have another EarSketch window or tab open somewhere. To fix this, please refresh this page.', 'failure2', 999);
    }

    // TODO: may not be directly called by UI
    this.closeSession = function (shareID) {
        websocket.send({
            'notification_type': 'collaboration',
            'action': 'closeSession',
            'scriptID': shareID,
            'sender': self.userName
        });
    };

    this.joinSession = function (shareID, userName) {
        esconsole('joining collaboration session: ' + shareID, 'collab');

        this.scriptID = shareID;
        this.userName = userName.toLowerCase(); // #1858

        var message = new PrepareWsMessage();
        message.action = 'joinSession';
        message.state = this.state;
        websocket.send(message);

        // check the websocket connection
        this.timeouts[this.userName] = setTimeout(onFailedToSynchronize, syncTimeout);
    };

    this.onJoinedSession = function (data) {
        esconsole('joined collaboration session: ' + data.scriptID, 'collab');

        // clear the websocket connection check
        clearTimeout(this.timeouts[this.userName]);
        delete this.timeouts[this.userName];
        
        // open script in editor
        this.scriptText = data.scriptText;
        setEditorTextWithoutOutput(this.scriptText);
        // highlightEditorFrame(true);

        // sync the server state number
        this.state = data.state;
        this.history = {}; // TODO: pull all the history? maybe not

        this.editor.setReadOnly(false);
        this.active = true;
        this.sessionActive = true;

        // the state of the self-initiated messages and messageBuffer
        this.synchronized = true;

        data.activeMembers.forEach(function (member) {
            if (member !== self.userName) {
                self.otherMembers[member].active = true;
            }
        });

        if (this.promises['joinSession']) {
            this.promises['joinSession'](data);
            delete this.promises['joinSession'];
        }
    };

    this.onSessionsFull = function (data) {
        // clear the websocket connection check sent from joinSession
        clearTimeout(this.timeouts[this.userName]);
        delete this.timeouts[this.userName];

        esconsole('could not create a session. max number reached: ' + data.scriptID, 'collab');
        userNotification.show('Server has reached the maximum number of real-time collaboration sessions. Please try again later.', 'failure1');

        this.openScriptOffline(this.script);
    };

    this.openScriptOffline = function (script) {
        esconsole('opening a collaborative script in the off-line mode', 'collab');
        script.username = script.username.toLocaleString(); // #1858
        script.collaborative = false;
        script.readonly = script.username !== this.userName;

        if (this.editor.droplet.currentlyUsingBlocks) {
            this.editor.droplet.setValue(script.source_code, -1);
        } else {
            this.editor.ace.setValue(script.source_code, -1);
        }
        this.editor.setReadOnly(script.readonly);

        reporter.openSharedScript();
    };

    this.leaveSession = function (shareID) {
        esconsole('leaving collaboration session: ' + shareID, 'collab');
        this.lockEditor = true;

        var message = new PrepareWsMessage();
        message.action = 'leaveSession';
        websocket.send(message);

        $rootScope.$emit('leftCollabSession', null);
    };

    this.onMemberJoinedSession = function (data) {
        userNotification.show(data.sender + ' has joined the collaboration session.');

        if (this.otherMembers.hasOwnProperty(data.sender)) {
            this.otherMembers[data.sender].active = true;
        } else {
            this.otherMembers[data.sender] = {
                active: true,
                canEdit: true
            }
        }

        $rootScope.$apply(); // update GUI
    };

    this.onMemberLeftSession = function (data) {
        userNotification.show(data.sender + ' has left the collaboration session.');

        if (this.markers.hasOwnProperty(data.sender)) {
            editSession.removeMarker(this.markers[data.sender]);
        }

        this.otherMembers[data.sender].active = false;

        $rootScope.$apply(); // update GUI
    };

    this.addCollaborators = function (shareID, userName, addedCollaborators) {
        // #1858 Note: addedCollaborators are already converted to lower case in shareScriptController.js:328.
        if (addedCollaborators.length !== 0) {
            var message = new PrepareWsMessage();
            message.action = 'addCollaborators';
            message.scriptID = shareID;
            message.sender = userName.toLowerCase(); // #1858
            message.collaborators = addedCollaborators;
            // add script name info (done in the server side now)
            websocket.send(message);

            if (this.scriptID === shareID && this.active) {
                addedCollaborators.forEach(function (member) {
                    self.otherMembers[member] = {
                        active: false,
                        canEdit: true
                    };
                });
            }
        }
    };

    this.removeCollaborators = function (shareID, userName, removedCollaborators) {
        // #1858 Note: removedCollaborators are already converted to lower case in shareScriptController.js:328.
        if (removedCollaborators.length !== 0) {
            var message = new PrepareWsMessage();
            message.action = 'removeCollaborators';
            message.scriptID = shareID;
            message.sender = userName.toLowerCase(); // #1858
            message.collaborators = removedCollaborators;
            websocket.send(message);

            if (this.scriptID === shareID && this.active) {
                removedCollaborators.forEach(function (member) {
                    delete self.otherMembers[member];
                });
            }
        }
    };

    // legacy stuff for turn-taking collaboration
    // this.requestWriteAccess = function () {
    //     websocket.send({
    //         'notification_type': 'collaboration',
    //         'action': 'miscMessage',
    //         'scriptID': this.scriptID,
    //         'sender': this.userName,
    //         'text': this.userName + ' has requested the write access!'
    //     });
    // };
    //
    // this.giveUpWriteAccess = function () {
    //     websocket.send({
    //         'notification_type': 'collaboration',
    //         'action': 'miscMessage',
    //         'scriptID': this.scriptID,
    //         'sender': this.userName,
    //         'text': this.userName + ' is done with editing.'
    //     });
    // };
    //
    // this.toggleWriteAccess = function (user) {
    //     websocket.send({
    //         'notification_type': 'collaboration',
    //         'action': 'changeWriteAccess',
    //         'scriptID': this.scriptID,
    //         'sender': this.userName,
    //         'targetUser': user,
    //         'canEdit': this.collaborators[user].canEdit
    //     })
    // };

    function setEditorTextWithoutOutput(scriptText) {
        self.lockEditor = true;

        var session = self.editor.ace.getSession();
        var cursor = session.selection.getCursor();

        self.editor.ace.setValue(scriptText, -1);
        session.selection.moveCursorToPosition(cursor);

        self.lockEditor = false;
    }

    function generateRandomID() {
        return Math.random().toString(36).substr(2, 10);
    }

    function timeoutSync(messageID) {
        self.timeouts[messageID] = setTimeout(function () {
            esconsole('edit synchronization timed out', 'collab');

            self.rejoinSession();
        }, editTimeout);
    }

    this.editScript = function (data) {
        this.storeCursor(editSession.selection.getCursor());
        if (this.scriptCheckTimerID) {
            clearTimeout(this.scriptCheckTimerID);
        }

        var message = new PrepareWsMessage();
        message.action = 'edit';
        message.ID = generateRandomID();
        message.state = self.state;
        message.editData = data;

        if (self.synchronized) {
            self.buffer.push(message);
            self.synchronized = false;
            self.awaiting = message.ID;

            if (!this.sessionActive) {
                this.rejoinSession();
                // this.rejoinAndEdit(message);
            } else {
                websocket.send(message);
                timeoutSync(message.ID);
            }
        } else {
            // buffered messages get temporary incremental state nums
            message.state += self.buffer.length;
            self.buffer.push(message);
        }
    };

    this.onEditMessage = function (data) {
        this.editor.setReadOnly(true);
        this.history[data.state] = data.editData;

        // filter out own edit
        if (data.ID === this.awaiting) {
            clearTimeout(this.timeouts[data.ID]);
            delete this.timeouts[data.ID];

            this.state++;

            if (this.buffer.length > 1) {
                var nextMessage = this.buffer[1];
                this.awaiting = nextMessage.ID;

                if (this.state !== nextMessage.state) {
                    esconsole('client -> server out of sync: ' + nextMessage.state + ' ' + this.state + ' ' + nextMessage.editData.text, ['collab', 'nolog']);
                    // adjust buffer here???
                    this.rejoinSession();
                    return;

                } else {
                    esconsole('client -> server in sync: ' + this.state + ' ' + nextMessage.editData.text, ['collab', 'nolog']);
                }

                websocket.send(nextMessage);
                timeoutSync(nextMessage.ID);
            } else {
                esconsole('synced with own edit', ['collab', 'nolog']);
                this.synchronized = true;

                // hard sync the script text after 5 seconds of inactivity
                // for potential permanent sync errors
                this.scriptCheckTimerID = compareScriptText(5000);
            }

            this.buffer.shift();
        } else {
            var serverOp = data.editData;

            if (data.state === this.state) {
                esconsole('server -> client in sync: ' + data.state + ' ' + data.editData.text, ['collab', 'nolog']);

            } else  {
                esconsole('server -> client out of sync: ' + data.state + ' ' + this.state + ' ' + data.editData.text, ['collab', 'nolog']);

                this.requestSync();
            }

            if (this.buffer.length > 0) {
                esconsole('adjusting buffered edits...', ['collab', 'nolog']);

                this.buffer = this.buffer.map(function (op) {
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

            this.state++;
        }
        this.editor.setReadOnly(false);
    };

    /**
     * Used with the version-control revertScript
     */
    this.reloadScriptText = function (text) {
        this.editor.ace.setValue(text, -1);
    };

    function syncToSession(data) {
        self.state = data.state;

        if (self.scriptText === data.scriptText) {
            return null;
        }

        self.isSynching = true;
        self.scriptText = data.scriptText;

        setEditorTextWithoutOutput(self.scriptText);

        // try to reset the cursor position
        editSession.selection.moveCursorToPosition(self.cursorPos);

        if (JSON.stringify(self.selection.start) !==  JSON.stringify(self.selection.end)) {
            var start = self.selection.start;
            var end = self.selection.end;
            var reverse = JSON.stringify(self.cursorPos) !== JSON.stringify(self.selection.end);

            var range = new aceRange(start.row, start.column, end.row, end.column);
            editSession.selection.setSelectionRange(range, reverse);
        }

        self.isSynching = false;
        self.synchronized = true;
        self.buffer = [];
        self.history = {};
    }

    this.onSyncError = function (data) {
        userNotification.showBanner("There was a sync error. Adjusting the local edit...");
        syncToSession(data);
    };

    this.requestSync = function () {
        esconsole('requesting synchronization to the server', 'collab');
        var message = new PrepareWsMessage();
        message.action = 'requestSync';
        websocket.send(message);
    };

    this.onSyncToSession = function (data) {
        syncToSession(data);
    };

    this.rejoinSession = function () {
        if (this.active) {
            userNotification.showBanner('Synchronization error: Rejoining the session', 'failure1');

            this.initialize();

            if (!this.owner) {
                self.otherMembers[this.script.username] = {
                    active: false,
                    canEdit: true
                };
            }

            this.script.collaborators.forEach(function (member) {
                if (member !== self.userName) {
                    self.otherMembers[member] = {
                        active: false,
                        canEdit: true
                    };
                }
            });

            var message = new PrepareWsMessage();
            message.action = 'rejoinSession';
            message.state = this.state;
            message.tutoring = this.tutoring;
            websocket.send(message);
        }

        return new Promise(function (resolve) {
            self.promises['joinSession'] = resolve;
        });
    };

    // this.rejoinAndEdit = function (editMessage) {
    //     if (this.active) {
    //         esconsole('rejoining session and editing', 'collab');
    //         userNotification.showBanner('Synchronization error: Rejoining the session', 'failure1');
    //
    //         editMessage.action = 'rejoinAndEdit';
    //         websocket.send(editMessage);
    //     }
    // };

    this.saveScript = function (scriptID) {
        var message;

        if (scriptID) {
            if (scriptID === this.scriptID) {
                message = new PrepareWsMessage();
                message.action = 'saveScript';
                websocket.send(message);
            }
        } else {
            message = new PrepareWsMessage();
            message.action = 'saveScript';
            websocket.send(message);
        }
        reporter.saveSharedScript();
    };

    this.onScriptSaved = function (data) {
        if (!this.userIsCAI(data.sender))
            userNotification.show(data.sender + ' saved the current version of the script.', 'success');

        $ngRedux.dispatch(scripts.syncToNgUserProject());
    };

    this.onAlreadySaved = function () {
        // userNotification.show('Not saved: The current version of the collaborative script is already up to date');
    };

    this.storeCursor = function (position) {
        if (position !== this.cursorPos) {
            this.cursorPos = position;

            var idx = editSession.getDocument().positionToIndex(position, 0);

            var message = new PrepareWsMessage();
            message.action = 'cursorPosition';
            message.position = idx;
            message.state = this.state;
            websocket.send(message);
        }
    };

    this.storeSelection = function (selection) {
        if (selection !== this.selection) {
            this.selection = selection;

            var document = editSession.getDocument();
            var start = document.positionToIndex(selection.start, 0);
            var end = document.positionToIndex(selection.end, 0);

            var message = new PrepareWsMessage();
            message.action = 'select';
            message.start = start;
            message.end = end;
            message.state = this.state;
            websocket.send(message);
        }
    };

    this.onCursorPosMessage = function (data) {
        data.sender = data.sender.toLowerCase(); // #1858
        var document = editSession.getDocument();
        var cursorPos = document.indexToPosition(data.position, 0);
        var range = new aceRange(cursorPos.row, cursorPos.column, cursorPos.row, cursorPos.column+1);

        if (this.markers.hasOwnProperty(data.sender)) {
            editSession.removeMarker(this.markers[data.sender]);
        }

        var num = Object.keys(this.otherMembers).indexOf(data.sender) % 6 + 1;

        this.markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true);
    };

    this.onSelectMessage = function (data) {
        data.sender = data.sender.toLowerCase(); // #1858

        var document = editSession.getDocument();
        var start = document.indexToPosition(data.start, 0);
        var end = document.indexToPosition(data.end, 0);
        var range;

        if (this.markers.hasOwnProperty(data.sender)) {
            editSession.removeMarker(this.markers[data.sender]);
        }

        var num = Object.keys(this.otherMembers).indexOf(data.sender) % 6 + 1;

        if (data.start === data.end) {
            range = new aceRange(start.row, start.column, start.row, start.column+1);
            this.markers[data.sender] = editSession.addMarker(range, 'generic-cursor-'+num, 'text', true);
        } else {
            range = new aceRange(start.row, start.column, end.row, end.column);
            this.markers[data.sender] = editSession.addMarker(range, 'generic-selection-'+num, 'line', true);
        }
    };

    function removeOtherCursors() {
        for (var m in self.otherMembers) {
            if (self.markers.hasOwnProperty(m)) {
                editSession.removeMarker(self.markers[m]);
            }
            delete self.markers[m];
        }
    }

    // currently, "invited" user is automatically joined to the collaboration group
    // this.onInvitation = function (data) {
    //     userNotification.handleCollabInvitation(data);
    // };

    this.onMiscMessage = function (data) {
        userNotification.show(data.text);
    };

    this.onChangeWriteAccess = function (data) {
        this.canEdit = data.canEdit;

        if (data.canEdit) {
            this.role = 'editor';
            this.editor.setReadOnly(false);
            userNotification.show(data.sender + ' gave you the write access!', 'collaboration');
        } else {
            this.role = 'viewer';
            this.editor.setReadOnly(true);
            userNotification.show('You no longer have the write access.', 'collaboration');
        }
    };

    /**
     * After certain period of inactivity, the session closes automatically, sending this message. It should flag for startSession to be sent before the next action.
     */
    this.onSessionClosed = function (data) {
        esconsole('remote session closed', 'collab');

        // this.active = false;
        this.sessionActive = false;

        for (var member in this.otherMembers) {
            this.otherMembers[member].active = false;
        }

        $rootScope.$apply(); // update GUI
    };

    this.onSessionClosedForInactivity = function (data) {
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

    function beforeTransf(operation) {
        if (operation.action === 'insert') {
            operation.len = operation.text.length;
            operation.end = operation.start + operation.len;
        } else if (operation.action === 'remove') {
            operation.end = operation.start + operation.len;
        }
        return JSON.parse(JSON.stringify(operation));
    }

    function afterTransf(operation) {
        if (operation.action === 'insert') {
            operation.end = operation.start + operation.len;
        } else if (operation.action === 'remove') {
            operation.end = operation.start + operation.len;
        } else if (operation.action === 'mult') {
            operation.operations = operation.operations.map(function (op) {
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
    function transform(op1, op2) {
        op1 = beforeTransf(op1);
        op2 = beforeTransf(op2);

        if (op1.action === 'mult') {
            op1.operations = op1.operations.map(function (op) {
                var tops = transform(op, op2);
                op2 = tops[1];
                return tops[0];
            });
        } else if (op2.action === 'mult') {
            op2.operations = op2.operations.map(function (op) {
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

    var operations = {
        insert: function (op) {
            var document = editSession.getDocument();
            var start = document.indexToPosition(op.start, 0);
            var text = op.text;
            editSession.insert(start, text);
        },

        remove: function (op) {
            var document = editSession.getDocument();
            var start = document.indexToPosition(op.start, 0);
            var end = document.indexToPosition(op.end, 0);

            editSession.remove({
                start: start,
                end: end
            });
        }
    };

    operations.mult = function (op) {
        op.operations.forEach(function (o) {
            apply(o);
        });
    };

    /**
     * Applies edit operations on the editor content.
     * @param op
     */
    function apply(op) {
        self.lockEditor = true;
        operations[op.action](op);
        self.lockEditor = false;
    }

    /**
     * Other people's operations may affect where the user's cursor should be.
     * @param op
     */
    function adjustCursor(op) {
        if (op.action === 'mult') {
            op.operations.forEach(function (o) {
                adjustCursor(o);
            });
        } else if (op.action === 'insert') {
            if (op.start <= self.cursorPos) {
                self.cursorPos += op.text.length;
            }
        } else if (op.action === 'remove') {
            if (op.start < self.cursorPos) {
                if (op.end <= self.cursorPos) {
                    self.cursorPos -= op.len;
                } else {
                    self.cursorPos = op.start;
                }
            }
        }
    }

    this.onUserAddedToCollaboration = async function (data) {
        // userNotification.show(data.sender + ' added you as a collaborator on ' + data.scriptName, 'collaboration');

        if (this.active && this.scriptID === data.scriptID) {
            data.addedMembers.forEach(function (member) {
                self.otherMembers[member] = {
                    active: false,
                    canEdit: true
                }
            });
        }

        if (this.refreshSharedScriptBrowser) {
            await this.refreshSharedScriptBrowser();
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        }
    };

    this.onUserRemovedFromCollaboration = async function (data) {
        // userNotification.show(data.sender + ' removed you from collaboration on ' + data.scriptName, 'collaboration');

        if (data.removedMembers.indexOf(this.userName) !== -1) {
            if (this.closeSharedScriptIfOpen) {
                this.closeSharedScriptIfOpen(data.scriptID);
            }
        } else if (this.active && this.scriptID === data.scriptID) {
            data.removedMembers.forEach(function (member) {
                delete self.otherMembers[member];
            });
        }

        if (this.refreshSharedScriptBrowser) {
            await this.refreshSharedScriptBrowser();
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        }
    };

    this.leaveCollaboration = function (scriptID, userName, refresh=true) {
        var message = new PrepareWsMessage();
        message.action = 'leaveCollaboration';
        message.scriptID = scriptID;
        message.sender = userName.toLowerCase(); // #1858
        websocket.send(message);

        if (refresh && this.refreshSharedScriptBrowser) {
            return this.refreshSharedScriptBrowser();
        } else {
            return Promise.resolve(null);
        }
    };

    this.onUserLeftCollaboration = async function (data) {
        // userNotification.show(data.sender + ' left the collaboration on ' + data.scriptName, 'collaboration');

        if (this.active && this.scriptID === data.scriptID) {
            delete this.otherMembers[data.sender.toLowerCase()]; // #1858

            // close collab session tab if it's active and no more collaborators left
            if (Object.keys(this.otherMembers).length === 0) {
                this.closeScript(data.scriptID, this.userName);
            }
        }

        if (this.refreshScriptBrowser) {
            await this.refreshScriptBrowser();
        }
        if (this.refreshSharedScriptBrowser) {
            await this.refreshSharedScriptBrowser();
        }
        $ngRedux.dispatch(scripts.syncToNgUserProject());
    };

    this.renameScript = function (scriptID, scriptName, userName) {
        esconsole('renaming the script for ' + scriptID, 'collab');
        var message = new PrepareWsMessage();
        message.action = 'renameScript';
        message.scriptID = scriptID;
        message.scriptName = scriptName;
        message.sender = userName.toLowerCase(); // #1858
        websocket.send(message);
    };

    this.onScriptRenamed = async function (data) {
        esconsole(data.sender + ' renamed a collaborative script ' + data.scriptID, 'collab');
        // userNotification.show('Collaborative script "' + data.oldName + '" was renamed to "' + data.newName + '"', 'collaboration');

        if (this.refreshSharedScriptBrowser) {
            await this.refreshSharedScriptBrowser();
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        }
    };

    this.getScriptText = function (scriptID) {
        esconsole('requesting the script text for ' + scriptID, 'collab');

        var message = new PrepareWsMessage();
        message.action = 'getScriptText';
        message.scriptID = scriptID;
        websocket.send(message);

        return new Promise(function (resolve) {
            self.promises['getScriptText'] = resolve;
        });
    };

    this.onScriptText = function (data) {
        if (this.promises['getScriptText']) {
            this.promises['getScriptText'](data.scriptText);
            delete this.promises['getScriptText'];
        }
    };

    function compareScriptText(delay) {
        return setTimeout(function () {
            self.getScriptText(self.scriptID).then(function (serverText) {
                if (serverText !== self.editor.getValue()) {
                    // possible sync error
                    self.rejoinSession();
                }
            });
        }, delay);
    }

    this.joinTutoring = function () {
        var message = new PrepareWsMessage();
        message.action = 'joinTutoring';
        websocket.send(message);

        this.tutoring = true;
    };

    this.leaveTutoring = function () {
        var message = new PrepareWsMessage();
        message.action = 'leaveTutoring';
        websocket.send(message);

        this.tutoring = false;
    };

    this.sendChatMessage = function (text) {
        var message = new PrepareWsMessage();
        message.action = 'chat';
        message.text = text;
        message.date = Date.now();
        websocket.send(message);

        return message;
    };

    this.chatSubscribe = function (scope, callback) {
        var chatMessageHandler = $rootScope.$on('chatMessageReceived', callback);
        var compileTrialHandler = $rootScope.$on('compileTrialReceived', callback);

        if (scope) {
            scope.$on('$destroy', chatMessageHandler);
            scope.$on('$destroy', compileTrialHandler);
        }
    };

    this.onJoinSubscribe = function (scope, callback) {
        var handler = $rootScope.$on('joinedCollabSession', callback);
        if (scope) {
            scope.$on('$destroy', handler);
        }
    };

    this.onLeaveSubscribe = function (scope, callback) {
        var handler = $rootScope.$on('leftCollabSession', callback);
        if (scope) {
            scope.$on('$destroy', handler);
        }
    };

    this.onJoinTutoringSubscribe = function (scope, callback) {
        var handler = $rootScope.$on('joinedTutoring', callback);
        if (scope) {
            scope.$on('$destroy', handler);
        }
    };

    this.sendCompilationRecord = function (type) {
        var message = new PrepareWsMessage();
        message.action = 'compile';
        message.text = type;
        websocket.send(message);
    };

    this.sendTabSwitchRecord = function (tab) {
        var message = new PrepareWsMessage();
        message.action = 'switchScript';
        message.text = tab.name;
        websocket.send(message);
    };

    this.sendCurriculumOpenRecord = function (pageTitle) {
        var message = new PrepareWsMessage();
        message.action = 'openCurriculum';
        message.text = pageTitle;
        websocket.send(message);
    };


    // TEMPORARY for Wizard of Oz CAI testing, Spring 2020.
    this.userIsCAI = function (user) {
        user = user.toUpperCase();
        return (user.indexOf("AI_PARTNER") !== -1 || user.indexOf("CAI") !== -1);
    };

}]);


