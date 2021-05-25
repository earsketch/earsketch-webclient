import esconsole from '../esconsole';
import * as tabs from '../editor/tabState';
import * as config from '../editor/editorConfig';

app.directive('editor', ['$rootScope', 'collaboration', '$timeout', '$ngRedux', 'userProject', function ($rootScope, collaboration, $timeout, $ngRedux, userProject) {
    return {
        transclude: false,
        restrict: 'EA',
        templateUrl: 'templates/code-editor.html',
        link: function (scope, element) {
            scope.editor.ace = null;
            scope.editor.droplet = null;

            scope.editor.visible = true;
            collaboration.editorVisible = true;

            scope.$on('visible', function(event, val){
                scope.editor.visible = !val;
                collaboration.editorVisible = !val;
            });

            if (scope.currentLanguage === 'python') {
                scope.editor.droplet = new droplet.Editor(element[0].querySelector('#editor'), config.blockPalettePython);
            } else {
                scope.editor.droplet = new droplet.Editor(element[0].querySelector('#editor'), config.blockPaletteJavascript);
            }

            scope.editor.ace = scope.editor.droplet.aceEditor;

            scope.editor.getValue = function () {
                return scope.editor.ace.getValue();
            };

            // TODO: not working with ace editor
            scope.editor.setValue = function () {
                try {
                    if (scope.editor.droplet.currentlyUsingBlocks) {
                        scope.editor.droplet.setValue.apply(this, arguments);
                    } else {
                        scope.editor.ace.setValue.apply(this, arguments);
                    }
                } catch (e) {
                    console.log(e);
                }
            };

            scope.editor.setReadOnly = function (value) {
                // esconsole('setting the editor to be read-only: ' + value, 'editor');
                scope.editor.ace.setReadOnly(value);
                scope.editor.droplet.setReadOnly(value);
            };

            scope.editor.setFontSize = function (value) {
                scope.editor.ace.setFontSize(value);
                scope.editor.droplet.setFontSize(value);
            };

            scope.editor.undo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.undo();
                } else {
                    scope.editor.ace.undo(true);
                }
            };

            scope.editor.redo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.redo();
                } else {
                    scope.editor.ace.redo(true);
                }
            };

            scope.editor.checkUndo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    return scope.editor.droplet.undoStack.length > 0;
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    return undoManager.hasUndo();
                }
            };

            scope.editor.checkRedo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    return scope.editor.droplet.redoStack.length > 0;
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    return undoManager.hasRedo();
                }
            };

            scope.editor.clearHistory = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.clearUndoStack();
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    undoManager.reset();
                    scope.editor.ace.getSession().setUndoManager(undoManager);
                }
            };

            scope.editor.setLanguage = function (currentLanguage) {
                if (currentLanguage === 'python') {
                    scope.editor.droplet.setMode('python', config.blockPalettePython.modeOptions);
                    scope.editor.droplet.setPalette(config.blockPalettePython.palette);
                } else if (currentLanguage === 'javascript') {
                    scope.editor.droplet.setMode('javascript', config.blockPaletteJavascript.modeOptions);
                    scope.editor.droplet.setPalette(config.blockPaletteJavascript.palette);
                }
                scope.editor.ace.getSession().setMode('ace/mode/' + currentLanguage);
            };

            scope.initEditor();

            //=======================================
            // collaboration-related features
            scope.collaboration = collaboration;
            collaboration.setEditor(scope.editor);

            // scope.showCollaborators = function () {};

            // scope.requestAccess = function () {
            //     collaboration.requestAccess();
            // };

            // Millisecond timer for recommendation refresh update
            var recommendationTimer = null;

            scope.onChangeTasks = new Set();
            scope.editor.ace.on('changeSession', (event) => {
                scope.onChangeTasks.forEach(fn => fn(event));
            });

            // TODO: add listener if collaboration userStatus is owner, remove otherwise
            // TODO: also make sure switching / closing tab is handled
            scope.editor.ace.on('change', function (event) {
                scope.onChangeTasks.forEach(fn => fn(event));

                // console.log("event in editor", event,event['action'],event['lines']);
                var t = Date.now();
                $rootScope.$broadcast('keyStroke',event['action'],event['lines'],t);
                
                if (collaboration.active && !collaboration.lockEditor) {
                    // convert from positionObjects & lines to index & text
                    var session = scope.editor.ace.getSession();
                    var document = session.getDocument();
                    var start = document.positionToIndex(event.start, 0);
                    var text = event.lines.length > 1 ? event.lines.join('\n') : event.lines[0];

                    // buggy!
                    // var end = document.positionToIndex(event.end, 0);
                    var end = start + text.length;

                    collaboration.editScript({
                        action: event.action,
                        start: start,
                        end: end,
                        text: text,
                        len: end - start
                    });
                }

                if(recommendationTimer != null){
                    $timeout.cancel(recommendationTimer);
                }

                recommendationTimer = $timeout(function() {
                    $rootScope.$broadcast('reloadRecommendations');
                }, 1000);

                const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
                const editSession = scope.editor.ace.getSession();
                tabs.setEditorSession(activeTabID, editSession);

                let script = null;

                if (activeTabID in userProject.scripts) {
                    script = userProject.scripts[activeTabID];
                } else if (activeTabID in userProject.sharedScripts) {
                    script = userProject.sharedScripts[activeTabID];
                }
                if (script) {
                    script.source_code = editSession.getValue();
                    if (!script.collaborative) {
                        script.saved = false;
                        $ngRedux.dispatch(tabs.addModifiedScript(activeTabID));
                    }
                }
            });

            scope.editor.ace.getSession().selection.on('changeSelection', function () {
                if (collaboration.active && !collaboration.isSynching) {
                    setTimeout(function () {
                        collaboration.storeSelection(scope.editor.ace.getSession().selection.getRange());
                    });
                }
            });

            scope.editor.ace.getSession().selection.on('changeCursor', function () {
                if (collaboration.active && !collaboration.isSynching) {
                    setTimeout(function () {
                        var session = scope.editor.ace.getSession();
                        collaboration.storeCursor(session.selection.getCursor());
                    });
                }
            });

            scope.editor.ace.on('focus', function () {
                if (collaboration.active) {
                    // check if session is active
                    // if so, request sync
                    // if not, rejoin

                    collaboration.checkSessionStatus();
                }
            });
        }
    }
}]);
