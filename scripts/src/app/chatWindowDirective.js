import "./collaboration"
import * as userProject from "./userProject"

app.directive('chatwindow', function () {
    return {
        templateUrl: 'templates/chat-window.html',
        controller: ['$scope', function ($scope) {
            $scope.chatroomName = '';
            $scope.collaborators = [];

            $scope.messageList = [];
            $scope.inputText = '';

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

            $scope.caiUsernames = ["AI_PARTNER"];

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

            $scope.sendMessage = function () {
                if ($scope.inputText.trim().replace(/(\r\n|\n|\r)/gm, '') !== '') {
                    var message = collaboration.sendChatMessage($scope.inputText);

                    // Display all CAI accounts as "CAI"
                    if ($scope.userIsCAI(message.sender))
                        message.sender = "CAI";
                    
                    $scope.messageList.push(message);
                    $scope.$applyAsync();
                    $scope.inputText = '';
                }
            };

            $scope.enterSubmit = function (event) {
                if (event.keyCode === 13 && !event.shiftKey) {
                    event.preventDefault(); // Without this, line break is inserted.
                    $scope.sendMessage();
                }

                // Textarea cannot resize itself without this hack.
                setTimeout(function () {
                    event.target.style.height = '';
                    event.target.style.height = event.target.scrollHeight + 'px';
                });

                autoScroll();
            };

            function autoScroll() {
                // Auto scroll to the bottom.
                setTimeout(function () {
                    var chatBody = angular.element('#chat-body')[0];
                    chatBody.scrollTop = chatBody.scrollHeight;
                });
            }

            /**
             * Checks if the sender is the logged in user.
             * @param message
             * @returns {boolean}
             */
            $scope.senderIsUser = function (message) {
                return message.sender === collaboration.userName;
            };

            $scope.userIsCAI = function (user) {
                user = user.toUpperCase();
                return ($scope.caiUsernames.indexOf(user) !== -1 || user.indexOf("AI_PARTNER") !== -1 || user.indexOf("CAI") !== -1);
            };

            $scope.calcDate = function (message) {
                return Date.now()-message.date;
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

            collaboration.callbacks.chat = function (data) {
                if (!$scope.senderIsUser(data)) {
                    if (data.action === 'chat') {

                        if ($scope.userIsCAI(data.sender))
                            data.sender = "CAI";

                        $scope.messageList.push(data);
                        $scope.$applyAsync();
                        autoScroll();
                    } else if (data.action === 'compile') {
                        if (!$scope.userIsCAI(data.sender)) {
                            data = processCompilationMessage(data);
                            $scope.messageList.push(data);
                            $scope.$applyAsync();
                            autoScroll();
                        }
                    }
                }
            };

            collaboration.callbacks.onJoin = function (data) {
                $scope.chatroomName = collaboration.script.name;
                $scope.collaborators = [collaboration.script.username].concat(collaboration.script.collaborators);

                // Display all CAI accounts as "CAI"
                for (var i = 0; i < $scope.collaborators.length; i++)
                    if ($scope.userIsCAI($scope.collaborators[i]))
                        $scope.collaborators[i] = "CAI";

                $scope.messageList = [];

                if ($scope.showChatWindow) {
                    collaboration.joinTutoring();
                }
            };

            collaboration.callbacks.onLeave = function () {
                $scope.messageList = [];

                if ($scope.showChatWindow) {
                    collaboration.leaveTutoring();
                }
            };

            collaboration.callbacks.onJoinTutoring = function (data) {
                $scope.messageList = data.data.map(function (entry) {
                    var res = {
                        action: entry.action,
                        date: (new Date(entry.datetime)).getTime(),
                        sender: entry.username,
                        text: entry.text
                    };

                    if (res.action === 'compile') {
                        if ($scope.senderIsUser(res) || $scope.userIsCAI(res.sender)) {
                            res = null;
                        } else {
                            res = processCompilationMessage(res);
                        }
                    }
                    return res;
                }).filter(function (entry) { return !!entry });
                $scope.$applyAsync();
                autoScroll();
            };

            $scope.on('$destroy', function () {
                collaboration.callbacks.chat = null;
                collaboration.callbacks.onJoin = null;
                collaboration.callbacks.onLeave = null;
                collaboration.callbacks.onJoinTutoring = null;
            })

            $scope.getTutoringRecord = function () {
                userProject.getTutoringRecord(collaboration.scriptID).then(function (record) {
                    var element = document.createElement('a');
                    var file = new Blob([record], {type: 'text/plain'});
                    // element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(record));
                    element.setAttribute('href', URL.createObjectURL(file));
                    element.setAttribute('target', '_blank');
                    // element.setAttribute('download', 'chathistory.txt');
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                });
            };
        }]
    };
});