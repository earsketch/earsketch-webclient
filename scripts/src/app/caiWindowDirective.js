import * as tabs from '../editor/tabState';
import * as user from '../user/userState';
import * as curriculum from '../browser/curriculumState';
import * as helpers from '../helpers';

app.directive('caiwindow', [function () {

    return {
        templateUrl: 'templates/cai-window.html',
        controller: ['$rootScope', '$scope', 'collaboration', 'userProject', 'caiDialogue', 'complexityCalculator', 'caiAnalysisModule', 'codeSuggestion', 'caiStudentHistoryModule', 'caiStudentPreferenceModule', '$ngRedux', function ($rootScope, $scope, collaboration, userProject, caiDialogue, complexityCalculator, caiAnalysisModule, codeSuggestion, caiStudentHistoryModule, caiStudentPreferenceModule, $ngRedux) {

            $scope.activeProject = ''

            $scope.messageListCAI = {};
            $scope.inputTextCAI = { label: '', value: '' };
            $scope.defaultInputOptions = [{ label: "what do you think we should do next?", value: "suggest" }, { label: "do you want to come up with some sound ideas?", value: "sound_select" }, { label: "i think we're close to done", value: 'wrapup' }, { label: "i have some ideas about our project", value:"properties"}]; // { label: "open_suggestion", value: "open_suggestion" }
            $scope.beginningInputOptions = [{ label: "Chat with CAI", value: "begin" }];
            $scope.inputOptions = $scope.beginningInputOptions.slice();
            $scope.dropupLabel = "Dropup";

            $scope.messageStyles = {
                sender: {
                    'float': 'left'
                },
                collaborator: {
                    'float': 'right'
                }
            };

            $scope.messageBubbleStyles = {
                sender: {
                    'float': 'left',
                    'background-color': 'darkgray'
                },
                collaborator: {
                    'float': 'right',
                    'background-color': 'lightgray'
                },
                collab_compile_success: {
                    'float': 'right',
                    'background-color': 'lightgray',
                    'color': 'green',
                    'font-style': 'italic'
                },
                collab_compile_fail: {
                    'float': 'right',
                    'background-color': 'lightgray',
                    'color': 'red',
                    'font-style': 'italic'
                }
            };

            $scope.introduceCAI = function () {
                var msgText = caiDialogue.generateOutput("Chat with CAI");
                caiDialogue.studentInteract(false);
                $scope.inputOptions = caiDialogue.createButtons();

                $scope.inputTextCAI.label = '';
                $scope.inputTextCAI.value = '';
                if (msgText != "") {
                    var messages = [];
                    if (msgText.includes('|')) {
                        messages = msgText.split('|');
                    }
                    else {
                        messages = [msgText];
                    }
                    for (var msg in messages) {
                        var message = sendCAIOutputMessage(messages[msg]);
                        // check for code updates.
                        if (messages[msg] === "OK, I'll wait.")
                            startPeriodicCheck();

                        addToCAIMessageList(message);
                    }
                }
            }

            $scope.setActiveProject = function (activeProject) {
                if (activeProject === null || activeProject === undefined) {
                    $scope.activeProject = '';
                    caiDialogue.clearNodeHistory();
                    $scope.messageListCAI = {};
                    $scope.inputTextCAI = { label: '', value: '' };
                    $scope.inputOptions = [];
                    $scope.dropupLabel = "Dropup";
                }
                else {
                    $scope.activeProject = activeProject;
                    caiDialogue.setActiveProject($scope.activeProject);
                    if (!$scope.messageListCAI[$scope.activeProject]) {
                        $scope.messageListCAI[$scope.activeProject] = [];
                        $scope.introduceCAI();
                    }
                    $scope.inputOptions = caiDialogue.createButtons();
                    if ($scope.inputOptions.length === 0) {
                        $scope.inputOptions = $scope.defaultInputOptions;
                    }
                    autoScrollCAI();
                }
            };

            $scope.checkForActiveProject = function () {
                const ideScope = helpers.getNgController('ideController').scope();

                if (ideScope.activeScript) {
                    $scope.setActiveProject(ideScope.activeScript.name);
                }
            };

            $ngRedux.connect(state => ({ ...state.tabs }))(state => {
                if (!state.activeTabID) {
                    $scope.setActiveProject(null);
                }
                else {
                    $scope.checkForActiveProject();
                }
            });

            $scope.$on('swapTabAfterIDEinit', function (evt) {
                $scope.checkForActiveProject();
            });


            $scope.periodicCheckOn = false;
            $scope.periodicCheck;
            $scope.enablePeriodicCheck = true;
            $scope.periodicCheckMessageTimeInMs = 2 * 60 * 1000;

            $scope.selectBubbleStyles = function (message) {
                if ($scope.senderIsUser(message)) {
                    return $scope.messageBubbleStyles.sender;
                } else {
                    if (message.action === 'compile') {
                        if (message.result === 'success') {
                            return $scope.messageBubbleStyles.collab_compile_success;
                        } else {
                            return $scope.messageBubbleStyles.collab_compile_fail;
                        }
                    } else {
                        $scope.messageBubbleStyles.collaborator;
                    }
                }
            };

            $scope.messageDateStyles = {
                sender: {
                    'float': 'left'
                },
                collaborator: {
                    'float': 'right'
                }
            };

            $scope.sendCAIMessageButton = function (input) {
                caiDialogue.studentInteract();
                $scope.inputTextCAI = Object.assign({}, input);
                return $scope.sendCAIMessage();
            }


            $scope.$on('compileCAI', function (evt, data) {

                //call cai analysis here
                var result = data[0];
                var language = data[1];
                var code = data[2];

                if (language == "python") {
                    results = complexityCalculator.analyzePython(code);
                }
                else {
                    results = complexityCalculator.analyzeJavascript(code);
                }

                codeSuggestion.generateResults(code, language);
                caiStudentHistoryModule.addScoreToAggregate(code, language);
                setTimeout(() => {
                    var output = caiDialogue.processCodeRun(code, complexityCalculator.userFunctionReturns, complexityCalculator.allVariables, results);
                    if (output != null && output[0][0] != "") {

                        var message = sendCAIOutputMessage(output);
                        addToCAIMessageList(message);
                        $scope.inputOptions = caiDialogue.createButtons();
                        if ($scope.inputOptions.length === 0) {
                            // With no options available to user, default to tree selection.
                            $scope.inputOptions = $scope.defaultInputOptions.slice();
                        }
                    }

                    if (output != null && output == "" && !caiDialogue.activeWaits() && caiDialogue.studentInteractedValue()) {
                        $scope.inputOptions = $scope.defaultInputOptions.slice(0);
                    }
                    autoScrollCAI();
                    $scope.dropupLabel = caiDialogue.getDropup();
                }, 0);

                var t = Date.now();
                caiStudentPreferenceModule.addCompileTS(t);
            });

            $scope.$on('compileError', function (evt, data) {

                var errorReturn = caiDialogue.handleError(data);
                if (errorReturn != "") {
                    setTimeout(() => {
                        //var message = sendCAIOutputMessage(errorReturn);
                        // addToCAIMessageList(message);
                        $scope.inputOptions = caiDialogue.createButtons();
                        if ($scope.inputOptions.length === 0) {
                            // With no options available to user, default to tree selection.
                            $scope.inputOptions = $scope.defaultInputOptions.slice();
                        }
                        if ($scope.inputOptions != null) {
                            $scope.inputOptions.push({ label: "do you know anything about this error i'm getting", value: "error" });
                        }
                        autoScrollCAI();
                    }, 0);
                }
            });

            $scope.sendCAIMessage = function () {
                if ($scope.inputTextCAI.label.trim().replace(/(\r\n|\n|\r)/gm, '') !== '') {

                    if ($scope.enablePeriodicCheck) {
                        stopPeriodicCheck();
                    }

                    // if ($scope.inputTextCAI.toLowerCase().includes("errorfix")) {
                    //     replaceText(15, 0, 15, 0, "#CAI error fix\n")
                    //}

                    var message = sendCAIMessage($scope.inputTextCAI.label);
                    autoScrollCAI();
                    var text = $scope.editor.getValue();
                    var lang = $scope.currentLanguage;
                    codeSuggestion.generateResults(text, lang);
                    caiDialogue.setCodeObj($scope.editor.ace.session.doc.$lines.join("\n"));

                    addToCAIMessageList(message);

                    var msgText = caiDialogue.generateOutput($scope.inputTextCAI.value);
                    if (msgText.includes("[ERRORFIX")) {

                        var errorS = msgText.substring(msgText.indexOf("[ERRORFIX") + 10, msgText.lastIndexOf("|"));
                        var errorF = msgText.substring(msgText.lastIndexOf("|") + 1, msgText.length - 1);

                        msgText = msgText.substring(0, msgText.indexOf("[ERRORFIX"));
                        caiDialogue.setSuccessFail(parseInt(errorS), parseInt(errorF));

                        var actionOutput = caiDialogue.attemptErrorFix();
                        if (actionOutput != null) {
                            // replaceText(actionOutput[0], actionOutput[1], actionOutput[2], actionOutput[3], actionOutput[4]);
                            msgText += "|" + caiDialogue.errorFixSuccess();
                        }
                        else {
                            msgText += "|" + caiDialogue.errorFixFail();
                        }
                    }

                    if (!caiDialogue.isDone()) {
                        $scope.inputOptions = caiDialogue.createButtons();
                    }
                    else {
                        $scope.inputOptions = [];
                    }

                    $scope.inputTextCAI.label = '';
                    $scope.inputTextCAI.value = '';

                    setTimeout(() => {
                        if (msgText != "") {
                            var messages = [];
                            if (msgText.includes('|')) {
                                messages = msgText.split('|');
                            }
                            else {
                                messages = [msgText];
                            }
                            for (var msg in messages) {
                                if (messages[msg] != "") {
                                    var message = sendCAIOutputMessage(messages[msg]);
                                    // check for code updates.
                                    if (messages[msg] === "OK, I'll wait.")
                                        startPeriodicCheck();

                                    addToCAIMessageList(message);
                                }
                            }
                        }

                        if ($scope.inputOptions.length === 0 && !caiDialogue.isDone()) {
                            // With no options available to user, default to tree selection.
                            $scope.inputOptions = $scope.defaultInputOptions.slice();
                        }
                        else {
                            // Wait for user code changes/response to input options.
                            startPeriodicCheck();
                        }

                        $scope.dropupLabel = caiDialogue.getDropup();
                        autoScrollCAI();
                    }, 0);
                }
            };


            // TODO: update following so message stops if user is completely off the page
            function onPeriodicCheck() {
                var pageStatus = caiStudentPreferenceModule.returnPageStatus();
                // secondsOffPage = 0;
                // if (pageStatus==0) {
                //     secondsOffPage = Date.now()/1000 - pageStatus[1]/1000;
                // }
                // console.log(pageStatus, secondsOffPage, Date.now()/1000);
                // var message = sendCAIOutputMessage("Looking at your code updates...");
                if ($scope.messageListCAI[$scope.activeProject]) {
                    // addToCAIMessageList(message);

                    $scope.periodicCheckOn = false;
                    startPeriodicCheck();
                }
                else {
                    $scope.periodicCheckOn = false;
                }
            };

            function startPeriodicCheck() {
                if (!$scope.periodicCheckOn) {
                    $scope.periodicCheckOn = true;
                    $scope.periodicCheck = setTimeout(onPeriodicCheck, $scope.periodicCheckMessageTimeInMs);
                }
            };

            function stopPeriodicCheck() {
                if ($scope.periodicCheckOn) {
                    clearTimeout($scope.periodicCheck);
                    $scope.periodicCheckOn = false;
                }
            }

            // function replaceText(startRow, startCol, endRow, endCol, newValue) {
            //     var aceRange = require("ace/range");
            //     var myRange = new aceRange.Range(startRow, startCol, endRow, endCol);
            //     $scope.editor.ace.session.replace(myRange, newValue);
            // }

            $scope.enterSubmitCAI = function (event) {
                if (event.keyCode === 13 && !event.shiftKey) {
                    event.preventDefault(); // Without this, line break is inserted.
                    $scope.sendCAIMessage();
                }

                // Textarea cannot resize itself without this hack.
                setTimeout(function () {
                    event.target.style.height = '';
                    event.target.style.height = event.target.scrollHeight + 'px';
                });

                autoScrollCAI();
            };

            function autoScrollCAI() {
                // Auto scroll to the bottom.
                setTimeout(function () {
                    var caiBody = angular.element('#cai-body')[0];
                    caiBody.scrollTop = caiBody.scrollHeight;
                });

            }

            function addToCAIMessageList(message) {
                    $scope.messageListCAI[$scope.activeProject].push(message);
                    $rootScope.$broadcast('newCAIMessage');
                    autoScrollCAI();
                    $scope.$applyAsync();
            }

            /**
             * Checks if the sender is the logged in user.
             * @param message
             * @returns {boolean}
             */
            $scope.senderIsUser = function (message) {
                return message.sender === userProject.getUsername();
            };

            $scope.calcDate = function (message) {
                return Date.now() - message.date;
            };

            $scope.openCurr = function(message,loc) {
                layoutScope.loadCurriculumChapter(message.keyword[loc][1]);
                layoutScope.toggleLayout('curriculum')
            }

            function processCompilationMessage(data) {
                if (data.text === 'success') {
                    data.result = 'success';
                    data.text = 'Running the script... Success!'
                } else {
                    data.result = data.text;
                    data.text = 'Running the script... Failed';
                    if (data.result !== '[object Object]') {
                        data.text += ' (' + data.result + ')';
                    }
                }
                return data;
            }

            function sendCAIOutputMessage(text) {

                var message = {};
                message.text = text[0];
                message.keyword = text[1];

                message.date = Date.now();
                message.sender = "CAI";
                return message;
            };

            function sendCAIMessage(text) {

                var message = {};
                message.returnText = text;
                message.keyword = "";

                message.date = Date.now();
                message.sender = userProject.getUsername();
                return message;
            };


            $ngRedux.connect(state => ({ ...state.curriculum.currentLocation }))(currentLocation => {
                caiDialogue.addCurriculumPageToHistory(currentLocation);
            });

            $scope.$on('switchToCAI', function () {
                autoScrollCAI();
            });


            $scope.$on("reloadRecommendations", function (evt, data) {
                var editorCode = $scope.editor.ace.session.doc.$lines.join("\n");
                caiDialogue.checkForCodeUpdates(editorCode);
            });

            $scope.$on('userOnPage', function(event,time)  {
                caiStudentPreferenceModule.addOnPageStatus(1,time);
                caiDialogue.addToNodeHistory(["pageStatus", 1]);
            });
            $scope.$on('userOffPage', function(event,time)  {
                caiStudentPreferenceModule.addOnPageStatus(0,time);
                caiDialogue.addToNodeHistory(["pageStatus", 0]);
            });

            $scope.$on('keyStroke', function(event,action, content,time) {
                caiStudentPreferenceModule.addKeystroke(action, content, time);
                // addToNodeHistory(["keyStroke", {action, content}]);
            });

            $scope.$on('mousePosition', function(event,x,y) {
                caiStudentPreferenceModule.addMousePos({x,y});
                // addToNodeHistory(["mousePosition", {x,y}]);
            });

        }]
    };
}]);
