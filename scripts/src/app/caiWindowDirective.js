app.directive('caiwindow', [function () {

    return {
        templateUrl: 'templates/cai-window.html',
        controller: ['$rootScope', '$scope', 'collaboration', 'userProject', 'caiDialogue', 'complexityCalculator', 'caiAnalysisModule', 'codeSuggestion', function ($rootScope, $scope, collaboration, userProject, caiDialogue, complexityCalculator, caiAnalysisModule, codeSuggestion) {

            $scope.activeProject = 'No Project'

            $scope.messageListCAI = {};
            $scope.inputTextCAI = { label: '', value: '' };
            $scope.defaultInputOptions = [{ label: "What should we do next?", value: "suggest" }, { label: "Let's add some more sounds", value: "sound_select" }, { label: "I think we're close to done", value: 'wrapup' }]; // { label: "open_suggestion", value: "open_suggestion" }
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
                    'background-color': 'white'
                },
                collab_compile_success: {
                    'float': 'right',
                    'background-color': 'white',
                    'color': 'green',
                    'font-style': 'italic'
                },
                collab_compile_fail: {
                    'float': 'right',
                    'background-color': 'white',
                    'color': 'red',
                    'font-style': 'italic'
                }
            };

            $scope.$on('caiSwapTab', function (event, name) {
                $scope.activeProject = name;
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
            });

            $scope.$on('caiClose', function (event) {
                $scope.activeProject = 'No Project'
                $scope.messageListCAI = {};
                $scope.inputTextCAI = { label: '', value: '' };
                $scope.inputOptions = [];
                $scope.dropupLabel = "Dropup";
            });

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

                        $scope.messageListCAI[$scope.activeProject].push(message);
                        $scope.$applyAsync();
                    }
                }
            }


            // $scope.introduceCAI();

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

                setTimeout(() => {
                    var output = caiDialogue.processCodeRun(code, complexityCalculator.userFunctionReturns, complexityCalculator.allVariables, results);
                    if (output != null && output != "") {

                        var message = sendCAIOutputMessage(output);
                        $scope.messageListCAI[$scope.activeProject].push(message);
                        $scope.$applyAsync();
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
                }, 200);
            });


            $scope.$on('compileError', function (evt, data) {

                var errorReturn = caiDialogue.handleError(data);
                if (errorReturn != "") {
                    setTimeout(() => {
                        var message = sendCAIOutputMessage(errorReturn);
                        $scope.messageListCAI[$scope.activeProject].push(message);
                        $scope.$applyAsync();
                        $scope.inputOptions = caiDialogue.createButtons();
                        if ($scope.inputOptions.length === 0) {
                            // With no options available to user, default to tree selection.
                            $scope.inputOptions = $scope.defaultInputOptions.slice();
                        }
                        autoScrollCAI();
                    }, 200);
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

                    $scope.messageListCAI[$scope.activeProject].push(message);
                    $scope.$applyAsync();

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

                    $scope.inputOptions = caiDialogue.createButtons();

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

                                    $scope.messageListCAI[$scope.activeProject].push(message);
                                    $scope.$applyAsync();
                                }
                            }
                        }

                        if ($scope.inputOptions.length === 0) {
                            // With no options available to user, default to tree selection.
                            $scope.inputOptions = $scope.defaultInputOptions.slice();
                        }
                        else {
                            // Wait for user code changes/response to input options.
                            startPeriodicCheck();
                        }

                        $scope.dropupLabel = caiDialogue.getDropup();
                        autoScrollCAI();
                    }, 100);
                }
            };

            function onPeriodicCheck() {
                var message = sendCAIOutputMessage("Looking at your code updates...");
                if ($scope.messageListCAI[$scope.activeProject]) {
                    $scope.messageListCAI[$scope.activeProject].push(message);
                    autoScrollCAI();
                    $scope.$applyAsync();

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
                message.text = text;
                message.date = Date.now();
                message.sender = "CAI";
                return message;
            };

            function sendCAIMessage(text) {

                var message = {};
                message.text = text;
                message.date = Date.now();
                message.sender = userProject.getUsername();

                return message;
            };

        }]
    };
}]);
