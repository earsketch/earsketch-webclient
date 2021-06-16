import * as collaboration from './collaboration'
import * as compiler from './compiler'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import { setReady, dismissBubble } from "../bubble/bubbleState";
import * as scripts from '../browser/scriptsState';
import * as editor from '../editor/Editor';
import * as editorState from '../editor/editorState';
import reporter from './reporter';
import * as tabs from '../editor/tabState';
import * as cai from '../cai/caiState';
import { wrapModal } from '../helpers';
import { ScriptCreator } from './ScriptCreator';
import { SoundUploader } from './SoundUploader'
import * as userConsole from './userconsole'
import * as userNotification from './userNotification';
import * as userProject from './userProject';
import * as WaveformCache from './waveformcache';
import i18n from "i18next";

// Temporary glue from $uibModal to React components.
app.component("createScriptController", wrapModal(ScriptCreator))
app.component("uploadSoundController", wrapModal(SoundUploader))

const ACE_THEMES = {
    light: "ace/theme/chrome",
    dark: "ace/theme/monokai",
}

// Angular controller for the IDE (text editor) and surrounding items.
app.controller("ideController", ['$rootScope', '$scope', '$uibModal', '$location', '$timeout', 'caiAnalysisModule', '$ngRedux', function ($rootScope, $scope, $uibModal, $location, $timeout, caiAnalysisModule, $ngRedux) {
    // local storage fields
    var LS_FONT_KEY = 'fontsize';
    window.ideScope = $scope;

    $scope.scriptName = 'untitled';
    $scope.projectId = '';
    $scope.shareLink = false;
    $scope.shareDisabled = false;
    $scope.flagNewScript = false;
    $scope.scriptExtension = '.py';
    $scope.fontSizNum = 14;
    $scope.compiled = null;

    // Tracks the selected tab data (script). Note that it might not be most up to date (modified / unsaved).
    $scope.activeScript = null;
    // Flag to prevent successive compilation / script save request
    $scope.isWaitingForServerResponse = false;

    // for report error
    $scope.userName = '';
    $scope.userEmail = '';
    $scope.errorDesc = '';

    $scope.currTheme = 0;

    //TODO AVN - quick hack, but it might also be the cleanest way to fix the shared script issue rather than
    //moving openShare() to tabController
    $scope.sharedScripts = userProject.sharedScripts;

    $scope.loaded = true; // shows spinning icon when false

    //embedableTrack - changeCss and
    $scope.isEmbedded = $location.search()["embedded"] === "true";
    $scope.dynamicStyle = function(embedded){
        if(embedded){
            return {top: "0", left:"0"}
        } else {
            return {}
        }
    }


    $scope.currentLanguage = localStorage.getItem('language') ?? 'python';
    // $scope.useBlocks = false; // global option that persists even droplet cannot open because of code errors

    userConsole.callbacks.onUpdate = function () {
        $scope.logs = userConsole.logs;
        $scope.$$phase || $scope.$digest();
    };

    // Function to pipe Skulpt's stdout to the EarSketch console.
    function outf(text) {
        // For some reason, skulpt prints a newline character after every
        // call to print(), so let's ignore those
        // TODO: users can't print newline characters...ugh
        if (text === '\n') {
            return;
        }
        esconsole('outf text is ' + text, ['INFO', 'IDE']);
        userConsole.log(text);
    }

    function builtinRead(x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
            throw "File not found: '" + x + "'";
        }
        return Sk.builtinFiles["files"][x];
    }

    Sk.configure({output:outf});
    Sk.pre = "output";
    Sk.configure({output:outf,read: builtinRead});

    // Gets the ace editor of droplet instance, and calls openShare().
    // TODO: Move to Editor?
    $scope.initEditor = function () {
        esconsole('initEditor called', 'IDE');

        editor.ace.setOptions({
            mode: 'ace/mode/' + $scope.currentLanguage,
            theme: ACE_THEMES[$ngRedux.getState().app.colorTheme],
            fontSize: $scope.fontSizNum,
            enableBasicAutocompletion: true,
            enableSnippets: false,
            enableLiveAutocompletion: false,
            showPrintMargin: false,
            wrap: false
        });

        // suppressing a minor error message in FF
        editor.ace.$blockScrolling = Infinity;

        editor.ace.commands.addCommand({
            name: 'saveScript',
            bindKey: {
                win: 'Ctrl-S',
                mac: 'Command-S',
                sender: 'editor|cli'
            },
            exec: function () {
                const activeTabID = tabs.selectActiveTabID($ngRedux.getState());

                // TODO: Potentially could use $scope.activeScript instead.
                let script = null;
                if (activeTabID in userProject.scripts) {
                    script = userProject.scripts[activeTabID];
                } else if (activeTabID in userProject.sharedScripts) {
                    script = userProject.sharedScripts[activeTabID];
                }

                if (!script?.saved) {
                    $ngRedux.dispatch(tabs.saveScriptIfModified(activeTabID));
                } else if (script?.collaborative) {
                    collaboration.saveScript();
                }
                activeTabID && $ngRedux.dispatch(tabs.removeModifiedScript(activeTabID));
            }
        });

        editor.ace.commands.addCommand({
            name: 'runCode',
            bindKey: {
                win: 'Ctrl-Enter',
                mac: 'Command-Enter',
                sender: 'editor|cli'
            },
            exec: function () {
                $scope.compileCode();
            }
        });

        editor.droplet.setEditorState(false);

        const fontSize = localStorage.getItem(LS_FONT_KEY);
        if (fontSize !== null) {
            $scope.setFontSize(parseInt(fontSize));
            $rootScope.$broadcast('initFontSize', parseInt(fontSize));
        }

        // open shared script from URL
        var shareID = $location.search()['sharing'];
        if (typeof(shareID) !== 'undefined') {
            $scope.openShare(shareID).then(() => {
                $ngRedux.dispatch(scripts.syncToNgUserProject());
                $ngRedux.dispatch(tabs.setActiveTabAndEditor(shareID));
            });
        }

        $ngRedux.dispatch(editorState.setEditorInstance(editor));
        const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
        activeTabID && $ngRedux.dispatch(tabs.setActiveTabAndEditor(activeTabID));

        const activeScript = tabs.selectActiveTabScript($ngRedux.getState());
        editor.setReadOnly($scope.isEmbedded || activeScript?.readonly);
    };

    // toggles between blocks (droplet) and text mode
    $scope.toggleBlocks = function () {
        if (!editor.droplet.currentlyUsingBlocks) {
            // ask Ace editor if there are any syntax errors
            var annotations = editor.ace.getSession().getAnnotations();
            if (annotations.some(function (note) {
                    return note.type === 'error'
                })) {
                userConsole.warn(i18n.t('messages:idecontroller.blocksyntaxerror'));
            } else {
                userConsole.clear();
            }
        }

        esconsole('toggling blocks mode to: ' + !editor.droplet.currentlyUsingBlocks, 'ide');
        localStorage.setItem('blocks', (editor.droplet.currentlyUsingBlocks ? 'yes' : 'no'));

        return editor.droplet.toggleBlocks();
    };

    $scope.openShare = function (shareid) {
        var alreadySaved = false;
        var promise;

        if (userProject.isLoggedIn()) {
            // User is logged in
            promise = userProject.getSharedScripts($scope.username, $scope.password).then(function (result) {
                // Check if the shared script has been saved
                angular.forEach(result, function(script) {
                    if (script.shareid === shareid) {
                        result = script;
                        alreadySaved = true;
                    }
                });

                if (!alreadySaved) {
                    // Close the script if it was opened when the user was not logged in
                    if ($scope.sharedScripts[shareid]) {
                        userProject.closeSharedScript(shareid);
                    }

                    // user has not opened this shared link before
                    promise = userProject.loadScript(shareid, true).then(function (result) {
                        if ($scope.isEmbedded) {
                            $rootScope.$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid});
                        }

                        if (result.username !== $scope.username) {
                            // the shared script doesn't belong to the logged-in user
                            $scope.switchToShareMode();

                            return userProject.saveSharedScript(shareid, result.name, result.source_code, result.username).then(function () {
                                return userProject.getSharedScripts($scope.username, $scope.password).then(function () {
                                    $scope.selectSharedScript(result);
                                });
                            });

                        } else {
                            // the shared script belongs to the logged-in user
                            // TODO: use broadcast or service
                            editor.ace.focus();

                            if ($scope.isEmbedded) {
                                $scope.selectScript(result);

                                // TODO: There might be async ops that are not finished. Could manifest as a redux-userProject sync issue with user accounts with a large number of scripts (not too critical).
                                $ngRedux.dispatch(scripts.syncToNgUserProject());
                                $ngRedux.dispatch(tabs.setActiveTabAndEditor(shareid));
                            } else {
                                userNotification.show('This shared script link points to your own script.');
                            }

                            // Manually removing the user-owned shared script from the browser.
                            // TODO: Better to have refreshShareBrowser or something.
                            delete userProject.sharedScripts[shareid];
                        }
                    }, function (err) {
                        esconsole(err, ['share', 'ide']);
                    });
                } else {
                    // user has already opened this shared link before
                    if (userProject.isLoggedIn()) {
                        promise = userProject.getSharedScripts($scope.username, $scope.password).then(function () {
                            if($scope.isEmbedded) $rootScope.$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid});
                            $scope.selectSharedScript(result);
                            $scope.switchToShareMode();
                        });
                    } else {
                        $scope.switchToShareMode();
                    }
                }

                return promise;
            });
        } else {
            // User is not logged in
            promise = userProject.loadScript(shareid, true).then(function (result) {
                if($scope.isEmbedded) $rootScope.$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid});
                userProject.saveSharedScript(shareid,result.name,
                    result.source_code, result.username).then(function () {
                    $scope.selectSharedScript(result);
                });
                $scope.switchToShareMode();
            }, function (err) {
                esconsole(err, ['loadScript', 'ide']);
            });
        }

        return promise;
    };

    $scope.switchToShareMode = function() {
        editor.ace.focus();
        $ngRedux.dispatch(scripts.setFeatureSharedScript(true));
    };

    // listens to the broadcast message sent by mainController on clicking login button
    $rootScope.$on('openShareAfterLogin', function() {
        $scope.openShare($location.search()['sharing']).then(() => {
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        });
    });

    $scope.openCollabScript = function (scriptID) {
        userProject.openSharedScriptForEdit(scriptID);
    };

    $scope.selectSharedScript = function (sharedScript) {
        userProject.openSharedScript(sharedScript.shareid);
    };

    // Prompts the user for a name and language, then calls the userProject
    // service to create the script from an empty template. The tab will be
    // automatically opened and switched to.
    $scope.createScript = function () {
        const { bubble } = $ngRedux.getState();
        if (bubble.active && bubble.currentPage===9) {
            $ngRedux.dispatch(dismissBubble());
        }

        var modalInstance = $uibModal.open({ component: 'createScriptController' });

        reporter.createScript();

        return modalInstance.result.then(function (filename) {
            if (filename) {
                userProject.closeScript(filename);
                return userProject.createScript(filename).then(function (script) {
                    // script saved and opened
                    script && $ngRedux.dispatch(scripts.syncToNgUserProject())
                    $ngRedux.dispatch(tabs.setActiveTabAndEditor(script.shareid));
                });
            }
        });
    };

    $scope.selectScript = function (script) {
        // DON'T open the script if it has been soft-deleted
        if (!script.soft_delete) {
            esconsole('selected a script', 'IDE');
            userProject.openScript(script.shareid);
        }
    };

    $scope.setLanguage = function (language) {
        if (language === 'python') {
            $scope.scriptExtension = '.py';
        } else if (language === 'javascript') {
            $scope.scriptExtension = '.js';
        } else {
            throw new Error('bad language value');
        }
        $scope.currentLanguage = language;
        editor.setLanguage(language);
        // switch global language mode and save current language to local storage.
        $scope.languageModeSelect(language);
        $ngRedux.dispatch(appState.setScriptLanguage(language));
    };

    $scope.pasteCurriculumCode = function (key) {
        var patt = /<[^>]*>/g;
        var pattScriptName = /script_name: (.*)/;
        var pattRemoveSpecialChars = /[^\w_]/g;
        key = key.replace(patt, "");
        key = _.unescape(key);
        var scriptName = pattScriptName.exec(key);
        if (scriptName && scriptName[1]) {
            scriptName = scriptName[1].replace(pattRemoveSpecialChars,"");
        } else {
            scriptName = 'curriculum';
        }

        esconsole("paste key" + key, 'debug');
        const ideTargetLanguage = $ngRedux.getState().app.scriptLanguage;
        const ext = ideTargetLanguage === 'python' ? '.py' : '.js';

        // Create a fake script object to load into a tab.
        var fake_script = {
            'name': scriptName + ext,
            'source_code': key,
            'shareid': ESUtils.randomString(22),
            'readonly': true
        };

        // force a digest cycle because the click is registered by jQuery, and
        // does not trigger Angular digest.
        $scope.$apply(function () {
            $ngRedux.dispatch(scripts.addReadOnlyScript(Object.assign({}, fake_script)));
            editor.ace.focus();
            $ngRedux.dispatch(tabs.setActiveTabAndEditor(fake_script.shareid));
        });

    };

    // Compile the code in the editor for the current language selection.
    $scope.getResult = function () {
        if ($scope.currentLanguage === 'python') {
            return compiler.compilePython(
                editor.getValue(),
                $scope.audioQuality
            );
        } else if ($scope.currentLanguage === 'javascript') {
            return compiler.compileJavascript(
                editor.getValue(),
                $scope.audioQuality
            );
        }
    };

    // Compile code in the editor and broadcast the result to all scopes.
    $scope.compileCode = function () {
        if ($scope.isWaitingForServerResponse) {
            // prevent successive run command
            return;
        }

        $scope.isWaitingForServerResponse = true;

        // TODO: only should clear when compiling another script?
        WaveformCache.clear();

        $scope.loaded = false; // show spinning icon

        var code = editor.getValue();

        var startTime = Date.now();
        var language = $scope.currentLanguage;
        var promise = $scope.getResult();

        userConsole.clear();
        $scope.clearErrors();
        userConsole.status('Running script...');

        const scriptID = tabs.selectActiveTabID($ngRedux.getState());
        $ngRedux.dispatch(tabs.removeModifiedScript(scriptID));

        promise.then(function (result) {
            var duration = Date.now() - startTime;
            $scope.loaded = true;
            $rootScope.$broadcast('compiled', result);
            $scope.compiled = result;
            // TODO: refactor notifications

            reporter.compile(language, true, undefined, duration);

            userNotification.showBanner(i18n.t('messages:interpreter.runSuccess'), 'success');

            $scope.saveActiveScriptWithRunStatus(userProject.STATUS_SUCCESSFUL);

            // Small hack -- if a pitchshift is present, it may print the success message after the compilation success message.
            $timeout(function () {
                userConsole.status('Script ran successfully.');
            }, 200);

            // asyncronously report the script complexity
            if (FLAGS.SHOW_AUTOGRADER) {
                $timeout(function() {
                    // reporter.complexity(language, code);
                    try{
                        var report = caiAnalysisModule.analyzeCodeAndMusic(language, code, result);
                    }
                    catch (e) {
                        // TODO: Make this work across browsers. (See esconsole for reference.)
                        var traceDepth = 5;
                        var stackString = e.stack.split(" at")[0] + " at " + e.stack.split(" at")[1];
                        var startIndex = stackString.indexOf("reader.js");
                        stackString = stackString.substring(startIndex);
                        stackString = stackString.substring(0, stackString.indexOf(')'));

                        for (var i = 0; i < traceDepth; i++) {
                            var addItem = e.stack.split(" at")[2 + i];
                            var startIndex = addItem.lastIndexOf("/");
                            addItem = addItem.substring(startIndex + 1);
                            addItem = addItem.substring(0, addItem.indexOf(')'));
                            addItem = "|" + addItem;
                            stackString += addItem;
                        }

                        reporter.readererror(e.toString() + ". Location: " + stackString);
                    }
                    
                    console.log("complexityCalculator", report);
                    if (FLAGS.SHOW_CAI) {
                        $ngRedux.dispatch(cai.compileCAI([result, language, code]));
                    }
                }, 0);
            }

            if (collaboration.active && collaboration.tutoring) {
                collaboration.sendCompilationRecord('success');
            }

            const { bubble } = $ngRedux.getState();
            if (bubble.active && bubble.currentPage===2 && !bubble.readyToProceed) {
                $ngRedux.dispatch(setReady(true));
            }
        }).catch(function (err) {
            var duration = Date.now() - startTime;
            esconsole(err, ['ERROR','IDE']);
            $scope.loaded = true;
            userConsole.error(err);
            $scope.highlightError(err);

            var errType = String(err).split(":")[0];
            reporter.compile(language, false, errType, duration);

            userNotification.showBanner(i18n.t('messages:interpreter.runFailed'), 'failure1');

            $scope.saveActiveScriptWithRunStatus(userProject.STATUS_UNSUCCESSFUL);

            if (collaboration.active && collaboration.tutoring) {
                collaboration.sendCompilationRecord(errType);
            }
        });
    };

    $scope.saveActiveScriptWithRunStatus = status => {
        const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
        let script = null;

        if (activeTabID in userProject.scripts) {
            script = userProject.scripts[activeTabID];
        } else if (activeTabID in userProject.sharedScripts) {
            script = userProject.sharedScripts[activeTabID];
        }
        if (script?.collaborative) {
            script && collaboration.saveScript(script.shareid);
            $scope.isWaitingForServerResponse = false;
        } else if (script && !script.readonly && !script.isShared && !script.saved) {
            // save the script on a successful run
            userProject.saveScript(script.name, script.source_code, true, status).then(function () {
                $ngRedux.dispatch(scripts.syncToNgUserProject());
                $scope.isWaitingForServerResponse = false;
            }).catch(function (err) {
                userNotification.show(i18n.t('messages:idecontroller.savefailed'), 'failure1');
                $scope.isWaitingForServerResponse = false;
            });
        } else {
            $scope.isWaitingForServerResponse = false;
        }
    };

    $scope.highlightError = function (err) {
        var line, aceRange, range;

        if ($scope.currentLanguage === 'javascript') {
            if (err.lineNumber !== undefined) {
                $scope.lineNumber = err.lineNumber - 1;
                if (editor.droplet.currentlyUsingBlocks) {
                    editor.droplet.markLine(err.lineNumber - 1, {color: "red"});
                }
                line = err.lineNumber - 1;
                aceRange = ace.require('ace/range').Range;
                range = new aceRange(line, 0, line, 2000);
                $scope.marker = editor.ace.getSession().addMarker(range, 'error-highlight', "fullLine");
            }
        } else if ($scope.currentLanguage === 'python') {
            if (err.traceback !== undefined && err.traceback.length > 0) {
                line = err.traceback[0].lineno - 1;
                aceRange = ace.require('ace/range').Range;
                range = new aceRange(line, 0, line, 2000);
                $scope.marker = editor.ace.getSession().addMarker(range, 'error-highlight', "fullLine");
            }
        }
    };

    $scope.clearErrors = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            if ($scope.lineNumber !== undefined) {
                editor.droplet.unmarkLine($scope.lineNumber);
            }
        }
        editor.ace.getSession().removeMarker($scope.marker);
    };

    $ngRedux.connect(state => ({ theme: state.app.colorTheme }))(({ theme }) => {
        if (!editor.ace) return;
        editor.ace.setTheme(ACE_THEMES[theme]);
    });

    $scope.languageModeSelect = function (lang) {
        $scope.currentLanguage = lang
        $scope.scriptExtension = lang === 'python' ? '.py' : '.js';
        localStorage.setItem('language', lang);
        $ngRedux.dispatch(appState.setScriptLanguage(lang));
    };

    $scope.reportError = function () {
        if (userProject.isLoggedIn()) {
            userProject.getUserInfo().then(function (user) {

                $scope.userName = user.firstname + " " + user.lastname;
                $scope.userEmail = user.email;

                $uibModal.open({
                    templateUrl: 'templates/report-error.html',
                    controller: 'ReportErrorCtrl',
                    scope: $scope
                });
            }).catch(function (err) {
                //if user info could not be retrieved just open the modal
                $uibModal.open({
                    templateUrl: 'templates/report-error.html',
                    controller: 'ReportErrorCtrl',
                    scope: $scope
                });
            });
        } else {
            //if user is not logged in just open the modal
            $uibModal.open({
                templateUrl: 'templates/report-error.html',
                controller: 'ReportErrorCtrl',
                scope: $scope
            });
        }
    };

    $scope.pasteCode = function (key) {
        esconsole('paste key ' + key, 'debug');
        if (editor.droplet.currentlyUsingBlocks) {
            editor.droplet.setFocusedText(key);
        } else {
            editor.ace.session.getTextRange(editor.ace.getSelectionRange(editor.ace.insert(key)));
            editor.ace.focus();
        }
        return key;
    };

    $scope.setFontSize = function (val) {
        $scope.fontSizNum = val;
        editor.setFontSize(val);
        // need to refresh the droplet palette section -- otherwise the block layout becomes weird
        editor.setLanguage($scope.currentLanguage);

        localStorage.setItem(LS_FONT_KEY, $scope.fontSizNum);
    };

    $ngRedux.connect(state => ({ size: state.app.fontSize }))(({ size }) => $scope.setFontSize(size))

    $scope.openUploadWindow = function () {
        if (userProject.isLoggedIn()) {
            $uibModal.open({ component: 'uploadSoundController' });
            $scope.notAllowedToAddSound = false;
        } else {
            if ($scope.logs) {
                $scope.logs.push(i18n.t('messages:general.unauthenticated'));
            } else {
                esconsole('trying to add log to $scope.logs which does not exist', 'debug');
            }
            $scope.notAllowedToAddSound = true;
            $timeout(function () {
                $scope.notAllowedToAddSound = false;
            }, 1000);
            userNotification.show('Please login before using this feature.', 'failure1');
        }
    };
}]);

function createIssue(jsreport) {
    var formData = new FormData();
    formData.append('jsreport', jsreport);
    var request = new XMLHttpRequest();
    request.open("POST", URL_DOMAIN + '/services/files/reportissue');
    request.onload = function () {
        if (request.readyState === 4) {
            if (request.status === 200) {
                esconsole('******* Send Issue Report OK*********', 'info');
            }
        }
    };
    request.send(formData);
}

app.controller('ReportErrorCtrl', ['$scope', '$uibModalInstance',
    function ($scope,$uibModalInstance) {

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
            esconsole('Clicked cancel', 'debug');
            esconsole('clicked cancel', 'user', 0);
        };

        $scope.sendError = function (userName, userEmail, errorDesc) {
            esconsole('Clicked send', 'debug');

            var lang = $scope.currentLanguage;
            if (['python', 'javascript'].indexOf(lang) === -1) {
                lang = '';
            }

            var notify_team_members = ["@xfreeman", "@heerman", "@manodrum"];
            var body = notify_team_members.join(" ")+"\r\n";

            if (userName || userEmail) {
                body = body + "\r\n**Reported by:** ";
                if (userName) {
                    body = body + userName + " ";
                }
                if (userEmail) {
                    body = body + "[" +userEmail+"]";
                }
                body = body + "\r\n";
            }

            var localStorageLog = "";
            
            Object.keys(localStorage).forEach(function (key) {
                try {
                    if (key === "userstate") {
                        var localUserState = JSON.parse(localStorage.getItem(key));
                        if (localUserState.hasOwnProperty('password')) {
                            localUserState.password = '';
                        }
                        localStorageLog += key + ": " + JSON.stringify(localUserState) + "\r\n";
                    } else {
                        localStorageLog += key + ": " + localStorage.getItem(key) + "\r\n";
                    }
                } catch (e) {
                    if (e && e.hasOwnProperty(message)) {
                        localStorageLog += "exception for key ["+key+"]: " + e.message;
                    }
                }
            });

            body = body + "\r\n**OS:** "+ESUtils.whichOS()+"\t **Browser:** "+ESUtils.whichBrowser()+"\r\n";

            if (errorDesc) {
                body = body + "\r\n**Error Description:** "+errorDesc+"\r\n";
            }

            body = body + "\r\n**SOURCE CODE:** \r\n```"+lang+"\r\n" + editor.getValue() + "\r\n```";
            body = body + "\r\n**TRACE LOG:** \r\n```\r\n" + REPORT_LOG.join("\r\n") + "\r\n```";
            body = body + "\r\n**LOCAL STORAGE:** \r\n```\r\n" + localStorageLog + "\r\n```";

            var errorinfo = {};
            errorinfo.title = "User reported bug";
            errorinfo.labels = ["report"];
            errorinfo.body = body;

            createIssue(JSON.stringify(errorinfo));
            userNotification.show('Thank you for your submission! Your error has been reported', 'success');

            setTimeout(func, 1000);
            function func() {
                $uibModalInstance.close();
            }
        };
    }
]);