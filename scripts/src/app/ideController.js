import { setReady, dismissBubble } from "../bubble/bubbleState";
import * as scripts from '../browser/scriptsState';

/**
 * Angular controller for the IDE (text editor) and surrounding items.
 * @module ideController
 */
app.controller("ideController", ['$rootScope', '$scope', '$http', '$uibModal', '$location', '$timeout', 'WaveformCache', 'compiler', 'renderer', 'uploader', 'userProject', 'userConsole', 'userNotification', 'wsapi', 'ESUtils', 'esconsole', '$window', '$confirm','$q', 'localStorage', 'completer', 'reporter', 'caiAnalysisModule', 'colorTheme', 'collaboration', '$ngRedux', function ($rootScope, $scope, $http, $uibModal, $location, $timeout, WaveformCache, compiler, renderer, uploader, userProject, userConsole, userNotification, wsapi, ESUtils, esconsole, $window, $confirm, $q, localStorage, completer, reporter, caiAnalysisModule, colorTheme, collaboration, $ngRedux) {
    $scope.callScriptBrowserFunction = function (fnName, tab) {
        $rootScope.$broadcast('manageScriptFromScriptContextMenu', fnName, tab);
    };

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

    $scope.activeTab = 0;
    // $scope.$watch('activeTab', function(newVal, oldVal){
    //     //AVN LOG
    //     console.log("ACTIVE TAB IDE LOG", newVal, oldVal);
    // });

    /**
     * Flag to prevent successive compilation / script save request
     * @type {boolean}
     */
    $scope.isWaitingForServerResponse = false;
    $scope.$on('scriptSaveResponseRecieved', function(){
        $scope.isWaitingForServerResponse = false;
    });

    // for report error
    $scope.userName = '';
    $scope.userEmail = '';
    $scope.errorDesc = '';

    $scope.currTheme = 0;

    //TODO AVN - quick hack, but it might also be the cleanest way to fix the shared script issue rather than
    //moving openShare() to tabController
    $scope.sharedScripts = userProject.sharedScripts; 

    //The editor object is passed to the tabController via scope inheritance
    $scope.editor = {}; // need to pass object to the editor directive for two-way binding

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


    $scope.currentLanguage = localStorage.get('language', 'python');
    $scope.useBlocks = false; // global option that persists even droplet cannot open because of code errors

    /**
     * Variable that remembers what language is being displayed in the curriculum,
     * so that the ide language type can be properly changed when copying curriculum code. 
     */
    $scope.curriculumLanguage = localStorage.get('language', 'python'); 


    $scope.$on('curriculumLanguage', function(event, val){
        $scope.curriculumLanguage = val;
    });


    // TODO: create and handle this in userConsole directive
    $scope.$on('updateConsole', function () {
        $scope.logs = userConsole.getLogs();
        $scope.$$phase || $scope.$digest();
    });

    $scope.$on('compileembeddedTrack', function(){
        $scope.compileCode();
    })


    /**
     * Function to pipe Skulpt's stdout to the EarSketch console.
     *
     * @private
     */
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

    /**
     *
     * @private
     */
    function builtinRead(x) {
        if (Sk.builtinFiles === undefined ||
            Sk.builtinFiles["files"][x] === undefined) {

            throw "File not found: '" + x + "'";
        }

        return Sk.builtinFiles["files"][x];
    }

    Sk.configure({output:outf});
    Sk.pre = "output";
    Sk.configure({output:outf,read: builtinRead});

    /**
     * Gets the ace editor of droplet instance, and calls openShare().
     * @name initEditor
     * @function
     */
    $scope.initEditor = function () {
        esconsole('initEditor called', 'IDE');

        $scope.editor.ace.setOptions({
            mode: 'ace/mode/' + $scope.currentLanguage,
            theme: 'ace/theme/monokai',
            fontSize: $scope.fontSizNum,
            enableBasicAutocompletion: true,
            enableSnippets: false,
            enableLiveAutocompletion: false,
            showPrintMargin: false,
            wrap: false
        });

        // suppressing a minor error message in FF
        $scope.editor.ace.$blockScrolling = Infinity;

        $scope.editor.ace.commands.addCommand({
            name: 'saveScript',
            bindKey: {
                win: 'Ctrl-S',
                mac: 'Command-S',
                sender: 'editor|cli'
            },
            exec: function () {
                $scope.$broadcast('updateTabFromEditorSave');
            }
        });

        // $scope.editor.commands.addCommand({
        //     name: 'goToLine',
        //     bindKey: {
        //         win: 'Ctrl-L',
        //         mac: 'Command-L',
        //         sender: 'editor|cli'
        //     },
        //     exec: function(env, args, request) {
        //         if($scope.tabs.length > 0) {

        //         }
        //     }
        // });

        $scope.editor.ace.commands.addCommand({
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

        // setting initial state of the editor to text mode if flag for blocks mode is null
        if (!localStorage.checkKey('blocks')) {
            $scope.editor.droplet.setEditorState(false);
            localStorage.set('blocks', 'no');
        } else if (localStorage.get('blocks') === 'yes') {
            $scope.editor.droplet.setEditorState(true);
        } else {
            $scope.editor.droplet.setEditorState(false);
        }
        // // monitor the editor for changes, and update the tab value
        $scope.editor.ace.on('change', function () {
            // if ($scope.tabs[$scope.activeTab].saved) {
            $scope.$broadcast('updateTabValueOnEditorChange');
            
            if ($scope.editor.ace.curOp && $scope.editor.ace.curOp.command.name) {
                $scope.$broadcast('markCurrentTabDirty');
            }
        });

        $scope.editor.ace.on('paste', function () {
            $scope.$broadcast('markCurrentTabDirty');
        });

        if (localStorage.checkKey(LS_FONT_KEY)) {
            $scope.setFontSize(parseInt(localStorage.get(LS_FONT_KEY)));
            $rootScope.$broadcast('initFontSize', parseInt(localStorage.get(LS_FONT_KEY)));
        }

        // open shared script from URL
        var shareID = $location.search()['sharing'];
        if (typeof(shareID) !== 'undefined') {
            userProject.shareid = shareID;
            $scope.openShare(shareID).then(() => {
                $ngRedux.dispatch(scripts.syncToNgUserProject());
            });
        }

        $scope.editor.setReadOnly($scope.isEmbedded);

        $rootScope.$broadcast("swapTabAfterIDEinit");
        $rootScope.$broadcast('editorLoaded');

        colorTheme.load();
    };

    

    /**
     * toggles between blocks (droplet) and text mode
     * @name toggleBlocks
     * @function
     */
    $scope.toggleBlocks = function () {
        if (!$scope.editor.droplet.currentlyUsingBlocks) {
            // ask Ace editor if there are any syntax errors
            var annotations = $scope.editor.ace.getSession().getAnnotations();
            if (annotations.some(function (note) {
                    return note.type === 'error'
                })) {
                userConsole.warn(ESMessages.idecontroller.blocksyntaxerror);
            } else {
                userConsole.clear();
            }
        }

        esconsole('toggling blocks mode to: ' + !$scope.editor.droplet.currentlyUsingBlocks, 'ide');

        $scope.editor.droplet.toggleBlocks();
        $scope.editor.clearHistory();

        return localStorage.set('blocks', ($scope.editor.droplet.currentlyUsingBlocks ? 'yes' : 'no'));
    };

    /**
     * @name openShare
     * @function
     */
    $scope.openShare = function (shareid) {
        var result = {};
        var alreadySaved = false;
        var promise;

        if (userProject.isLogged()) {
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
                        if($scope.isEmbedded) $rootScope.$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid});
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
                            $scope.editor.ace.focus();

                            $rootScope.$broadcast('togglePanesOnOpeningOwnSharedScript')
                            
                            $scope.selectScript(result);
                            userNotification.show('This shared script link points to your own script.');

                            // Manually removing the user-owned shared script from the browser.
                            // TODO: Better to have refreshShareBrowser or something.
                            delete userProject.sharedScripts[shareid];
                        }
                    }, function (err) {
                        esconsole(err, ['share', 'ide']);
                    });
                } else {
                    // user has already opened this shared link before
                    if (userProject.isLogged()) {
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
        $scope.editor.ace.focus();
        $ngRedux.dispatch(scripts.setFeatureSharedScript(true));
    };

    // listens to the broadcast message sent by mainController on clicking login button
    $rootScope.$on('openShareAfterLogin', function() {
        $scope.openShare(userProject.shareid).then(() => {
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        });
    });

    $scope.openCollabScript = function (scriptID) {
        userProject.openSharedScriptForEdit(scriptID);
    };


    $scope.selectSharedScript = function(sharedScript){
        $scope.$broadcast('selectSharedScript', sharedScript);
    }

    /**
     * Prompts the user for a name and language, then calls the userProject
     * service to create the script from an empty template. The tab will be
     * automatically opened and switched to.
     */
    $scope.createScript = function () {
        const { bubble } = $ngRedux.getState();
        if (bubble.active && bubble.currentPage===9) {
            $ngRedux.dispatch(dismissBubble());
        }

        var modalInstance = $uibModal.open({
            templateUrl: 'templates/create-script.html',
            controller: 'CreateScriptCtrl',
            // pass the current language to use as the default selected lang.
            resolve: {
                language: function () {
                    return $scope.dispLang;
                }
            }
        });

        reporter.createScript();

        return modalInstance.result.then(function (filename) {
            userProject.closeScript(filename);
            return userProject.createScript(filename);
        }, () => {
            esconsole('Modal dismissed.', ['IDE','debug']);
        }).then(function (script) {
            // script saved and opened
            script && $rootScope.$broadcast('createScript', script.shareid);
        });
    };

    //note - select script is used via inheritance in tabController
    /**
     * @name selectScript
     * @function
     * @param script
     * @returns {null}
     */
    $scope.selectScript = function (script) {
        // DON'T open the script if it has been soft-deleted
        if (!script.soft_delete) {
            esconsole('selected a script', 'IDE');

            userProject.openScript(script.shareid);
            // refresh tab state to keep $scope.tabs up-to-date before we call getTabId
            $scope.$broadcast('selectScript', script.shareid);
        }
    };

    $scope.importScript = function (script) {
        $scope.$broadcast('importScript', script);
    };

    $scope.copyScript = function(script){
        $scope.$broadcast('copyScript', script);
    };

    /**
     * @name setLanguage
     * @function
     * @param language {string} 'python' or 'javascript'
     */
    $scope.setLanguage = function (language) {
        var prevLang = $scope.currentLanguage;

        if (language === 'python') {
            $scope.currentLanguage = 'python';
            $scope.scriptExtension = '.py';
        } else if (language === 'javascript') {
            $scope.currentLanguage = 'javascript';
            $scope.scriptExtension = '.js';
        } else {
            throw new Error('bad language value');
        }

        $scope.editor.setLanguage(language);

        // re-enable blocks mode if language changes
        // TODO: questionable code: localStorage.get('blocks') === 'yes'
        // currentlyUsingBlocks would be off when we switch the language
        // maybe we need a global-state scope variable
        if (localStorage.get('blocks') === 'yes' && prevLang !== $scope.currentLanguage) {
            $scope.toggleBlocks();
        }

        // switch global language mode and save current language to local storage.
        $scope.languageModeSelect($scope.currentLanguage);
        $rootScope.$broadcast('language', $scope.currentLanguage);
    };

    /**
     * @name pasteCurriculumCode
     * @function
     * @param key {string}
     * @returns {null}
     */
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
        var ext;
        var ideTargetLanguage;

        if ($scope.curriculumLanguage === 'python') {
            ext = '.py';
            ideTargetLanguage = 'python';
        } else {
            ext = '.js';
            ideTargetLanguage = 'javascript';
        }

        $rootScope.$broadcast('language', ideTargetLanguage);

        // Create a fake script object to load into a tab.
        var fake_script = {
            'name': scriptName + ext,
            'source_code': key,
            'shareid': ESUtils.randomString(22)
        };

        // force a digest cycle because the click is registered by jQuery, and
        // does not trigger Angular digest.
        $scope.$apply(function () {
            $scope.$broadcast('openCurriculumCode', fake_script);
            $scope.editor.ace.focus();
        });

    };

    /**
     * Compile the code in the editor for the current language selection.
     * @name getResult
     * @function
     * @returns {Promise} A promise that resolves to the compiled result.
     */
    $scope.getResult = function () {
        if ($scope.currentLanguage === 'python') {
            return compiler.compilePython(
                $scope.editor.getValue(),
                $scope.audioQuality
            );
        } else if ($scope.currentLanguage === 'javascript') {
            return compiler.compileJavascript(
                $scope.editor.getValue(),
                $scope.audioQuality
            );
        }

    };

    /**
     * Compile code in the editor and broadcast the result to all scopes.
     * @name compileCode
     * @function
     */
    $scope.compileCode = function () {
        if ($scope.isWaitingForServerResponse) {
            // prevent successive run command
            return;
        }

        $scope.isWaitingForServerResponse = true;

        // TODO: only should clear when compiling another script?
        WaveformCache.clear();

        EarSketch.Global.ExitFlag = true;//assure the exit check variable is ON

        $scope.loaded = false; // show spinning icon

        // TODO: use the layout service instead
        var layoutCtrlScope = angular.element('[ng-controller=layoutController]').scope();

        var code = $scope.editor.getValue();

        var startTime = Date.now();
        var language = $scope.currentLanguage;
        var promise = $scope.getResult();

        userConsole.clear();
        $scope.clearErrors();
        userConsole.status('Running script...');

        promise.then(function (result) {
            var duration = Date.now() - startTime;
            $scope.loaded = true;
            $rootScope.$broadcast('compiled', result);
            $scope.compiled = result;
            // TODO: refactor notifications

            reporter.compile(language, true, undefined, duration);

            userNotification.showBanner(ESMessages.interpreter.runSuccess, 'success');

            $scope.$broadcast('saveCollaborativeScriptAttempt');

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
                    
                    console.log("autograder", report);

                    $rootScope.$broadcast('compileCAI', [result, language, code]);
                }, 0);
            }

            $timeout(function () {
                if($scope.isEmbedded) $rootScope.$broadcast('embeddedCodeCompiled', result);
            }, 200);

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

            userNotification.showBanner(ESMessages.interpreter.runFailed, 'failure1');

            $scope.$broadcast('saveCollaborativeScriptFailure');

            // auto-opens the user console if there is an error and if the console is currently closed
            $rootScope.$broadcast('openConsoleOnCodeCompileError');
            $rootScope.$broadcast("compileError", [err]);
            if (collaboration.active && collaboration.tutoring) {
                collaboration.sendCompilationRecord(errType);
            }
        });
    };

    /**
     * @name highlightError
     * @function
     * @param err {object}
     */
    $scope.highlightError = function (err) {
        var line, aceRange, range;

        if ($scope.currentLanguage === 'javascript') {
            if (err.lineNumber !== undefined) {
                $scope.lineNumber = err.lineNumber - 1;
                if ($scope.editor.droplet.currentlyUsingBlocks) {
                    $scope.editor.droplet.markLine(err.lineNumber - 1, {color: "red"});
                }
                line = err.lineNumber - 1;
                aceRange = ace.require('ace/range').Range;
                range = new aceRange(line, 0, line, 2000);
                $scope.marker = $scope.editor.ace.getSession().addMarker(range, 'error-highlight', "fullLine");
            }
        } else if ($scope.currentLanguage === 'python') {
            if (err.traceback !== undefined && err.traceback.length > 0) {
                line = err.traceback[0].lineno - 1;
                aceRange = ace.require('ace/range').Range;
                range = new aceRange(line, 0, line, 2000);
                $scope.marker = $scope.editor.ace.getSession().addMarker(range, 'error-highlight', "fullLine");
            }
        }
    };


    /**
     * @name clearErrors
     * @function
     */
    $scope.clearErrors = function () {
        if ($scope.editor.droplet.currentlyUsingBlocks) {
            if ($scope.lineNumber !== undefined) {
                $scope.editor.droplet.unmarkLine($scope.lineNumber);
            }
        }
        $scope.editor.ace.getSession().removeMarker($scope.marker);
    };

    colorTheme.subscribe($scope, function (event, theme) {
        if (theme === 'dark') {
            $scope.editor.ace.setTheme('ace/theme/monokai');
        } else {
            $scope.editor.ace.setTheme('ace/theme/chrome');
        }
    });

    /**
     * @name setPage
     * @function
     * @param page {number}
     */
    $scope.setPage = function (page) {
        $state.transitionTo(page);
    };

    /**
     * Returns the workspace for the current user
     * @name getWS
     * @function
     */
    $scope.getWS = function () {
        wsapi.getWorkspace(userProject.getUsername());
    };

    /**
     * Saves the current workspace for the user.
     * @name saveWS
     * @function
     */
    $scope.saveWS = function () {
        //wsapiSaveWorkspace(userProject.getUsername()  , ES_WORKSPACE);
        wsapi.sendReport('ERROR  REPORTED');
    };

    /**
     * @name languageModeSelect
     * @function
     * @param lang {string} 'python' or 'javascript'
     */
    $scope.languageModeSelect = function (lang) {
        //var scriptName = $('#scriptName').html();
        //var scriptName = $scope.scriptName;

        if (lang === 'python') {
            //$scope.tabs[$scope.active()].name = scriptName.replace(/.(^.*)$/, '.py');
            //$('#scriptName').html(scriptName.replace(/.([^.]*)$/, '.py'));
            $scope.currentLanguage = 'python';
            $scope.scriptExtension = '.py';
            angular.element("#py i").removeClass("glyphicon glyphicon-unchecked").addClass("glyphicon glyphicon-ok-sign");
            angular.element("#js i").removeClass("glyphicon glyphicon-ok-sign").addClass("glyphicon glyphicon-unchecked");

            //Hide javascript and show python code blocks in curriculum
            angular.element("#curriculum .curriculum-javascript").hide();
            angular.element("#curriculum .curriculum-python").show();

            //Hide /show copy buttons
            angular.element(".copy-btn-js").hide();
            angular.element(".copy-btn-py").show();

        } else {
            //$scope.tabs[$scope.active()].name = scriptName.replace(/.(^.*)$/, '.js');
            //$('#scriptName').html(scriptName.replace(/.([^.]*)$/, '.js'));
            $scope.currentLanguage = 'javascript';
            $scope.scriptExtension = '.js';
            angular.element("#js i").removeClass("glyphicon glyphicon-unchecked").addClass("glyphicon glyphicon-ok-sign");
            angular.element("#py i").removeClass("glyphicon glyphicon-ok").addClass("glyphicon glyphicon-unchecked");

            //Hide javascript and show python code blocks in curriculum
            angular.element("#curriculum .curriculum-python").hide();
            angular.element("#curriculum .curriculum-javascript").show();

            //Hide /show copy buttons
            angular.element(".copy-btn-py").hide();
            angular.element(".copy-btn-js").show();
        }

        localStorage.set('language', $scope.currentLanguage);
        $rootScope.$broadcast('language', $scope.currentLanguage);
    };

    // TODO: not sure if this function is ever used
    /**
     * @name codeMode
     * @function
     * @param arg
     */
    $scope.codeMode = function (arg) {
        $scope.currentLanguage = arg;
        $rootScope.$broadcast('language', arg); // language mode used in different controllers
    };

    /**
     * @name reportError
     * @function
     */
    $scope.reportError = function () {

        if (userProject.isLogged()) {
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

    /**
     * @name pasteCode
     * @function
     * @param key
     * @returns {*}
     */
    $scope.pasteCode = function (key) {
        esconsole('paste key ' + key, 'debug');
        if ($scope.editor.droplet.currentlyUsingBlocks) {
            $scope.editor.droplet.setFocusedText(key);
        } else {
            $scope.editor.ace.session.getTextRange($scope.editor.ace.getSelectionRange($scope.editor.ace.insert(key)));
            $scope.editor.ace.focus();
        }

        $scope.$broadcast('markCurrentTabDirty');
        return key;
    };

    /**
     * @name showEmptyFilename
     * @function
     */
    $scope.showEmptyFilename = function () {
        userNotification.show('Empty file name!', 'failure1');
    };

    $scope.setFontSize = function (val) {
        $scope.fontSizNum = val;
        $scope.editor.setFontSize(val);
        // need to refresh the droplet palette section -- otherwise the block layout becomes weird
        $scope.editor.setLanguage($scope.currentLanguage);

        localStorage.set(LS_FONT_KEY, $scope.fontSizNum);
        $scope.editor.ace.focus();
    };

    $scope.$on('fontSizeChanged', function (event, val) {
        $scope.setFontSize(val);
    });

    //Listen for call to uploadModel from soundbrowserController
    $scope.$on('uploadModal', function () {
        $scope.openUploadWindow()
    });

    /**
     * @name openUploadWindow
     * @function
     */
    $scope.openUploadWindow = function () {
        if (userProject.isLogged()) {
            $uibModal.open({
                templateUrl: 'templates/upload-sound.html',
                controller: 'UploadSoundCtrl'
            });
            $scope.notAllowedToAddSound = false;
        } else {
            if ($scope.logs) {
                $scope.logs.push(ESMessages.general.unauthenticated);
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

    /**
     * @name downloadProtectedData
     * @function
     */
    $scope.downloadProtectedData = function () {
        var modalInstance = $uibModal.open({
            templateUrl: 'templates/download-teacher-materials.html',
            controller: 'DownloadTeacherMaterialsCtrl',
            size: '100'
        });
    };
}]);

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {

            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function () {
                scope.$apply(function () {
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

/**
 * @module ReportErrorCtrl
 */
app.controller('ReportErrorCtrl', ['$scope', '$http', '$uibModalInstance', 'wsapi','esconsole','ESUtils',
    function ($scope,$http,$uibModalInstance,wsapi,esconsole, ESUtils) {
        /**
         * Closes the modal instance.
         * @name cancel
         * @function
         */
        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
            esconsole('Clicked cancel', 'debug');
            esconsole('clicked cancel', 'user', 0);
        };

        /**
         * @name sendError
         * @function
         * @param userName {string}
         * @param userEmail {string}
         * @param errorDesc {string}
         */
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

            body = body + "\r\n**OS:** "+ESUtils.whichOS()+"\t **Browser:** "+ESUtils.whichBrowser()+"\r\n";

            if (errorDesc) {
                body = body + "\r\n**Error Description:** "+errorDesc+"\r\n";
            }

            body = body + "\r\n**SOURCE CODE:** \r\n```"+lang+"\r\n" + $scope.editor.getValue() + "\r\n```";
            body = body + "\r\n**TRACE LOG:** \r\n```\r\n" + REPORT_LOG.join("\r\n") + "\r\n```";

            var errorinfo = {};
            errorinfo.title = "User reported bug";
            errorinfo.labels = ["report"];
            errorinfo.body = body;

            wsapi.createIssue(JSON.stringify(errorinfo));
            userNotification.show('Thank you for your submission! Your error has been reported', 'success');

            setTimeout(func, 1000);
            function func() {
                $uibModalInstance.close();
            }
        };
    }]);

/**
 * @module DownloadTeacherMaterialsCtrl
 */
app.controller('DownloadTeacherMaterialsCtrl', ['$scope', '$http', '$uibModalInstance', 'esconsole', function ($scope, $http, $uibModalInstance, esconsole) {
    $scope.error = "";
    $scope.keypass = "";

    /**
     * @name download
     * @function
     */
    $scope.download = function () {
        if ($scope.keypass === "") {
            $scope.error = ESMessages.downloadprotecteddata.nopassword;
            return;
        }

        var formData = new FormData();
        formData.append('keypass', btoa($scope.keypass));

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN+'/services/files/getprotecteddata');
        request.timeout = 10000;

        request.ontimeout = function () {
            $scope.error = ESMessages.downloadprotecteddata.servertimeout;
            esconsole('Timeout while requesting teacher materials from server.', 'error');
        };

        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    var jsonData = JSON.parse(request.responseText);
                    if (jsonData.path !== undefined) {
                        var anchor = document.createElement("a");
                        document.body.appendChild(anchor);
                        anchor.setAttribute("type", "hidden");
                        anchor.href = jsonData.path;
                        anchor.download = "TeacherMaterials.zip";
                        anchor.click();
                        $uibModalInstance.close();
                        return;
                    } else {
                        $scope.error = ESMessages.downloadprotecteddata.servertimeout;
                    }
                } else if (request.status === 403){
                    $scope.error = "Incorrect password.";
                    $scope.$apply();
                    return;
                }
            }
            esconsole('Error in download teacher materials: STATUS '+ request.status, 'error');
            $scope.error = ESMessages.downloadprotecteddata.unexpectederror;
            $scope.$apply();
        };

        request.send(formData);
    };

    /**
     * Closes the modal instance.
     * @name cancel
     * @function
     */
    $scope.cancel = function () {
        $uibModalInstance.close();
    };

    $scope.enterSubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.download();
        }
    } 
}]);
