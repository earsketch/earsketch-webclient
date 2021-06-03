/**
 * Angular directive / service for showing user notifications. Inject userNotification to Angular submodules, and put <notification-bar> in HTML. Currently only 1 instance of <notification-bar> can be used. The notification service is copied to the global for non-angular usage.
 * @name userNotification.show
 * @function
 * @module userNotification
 * @param text {string} Notification message to show
 * @param [type='normal'] {string} Sets color style for different message types. Supported: 'normal' (default), 'success', 'failure1', 'failure2'
 * @param [duration=2.5] {number} Duration in seconds for displaying the message.
 * @example
 * userNotification.show('Hello user!');
 *
 * @example
 * userNotification.show('Oops, something broke!', 'failure1');
 *
 * @example
 * userNotification.show('Show this message for a long time', null, 10);
 * userNotification.hide(); // hide at any time.
 */
import esconsole from '../esconsole'
import * as userNotification from './userNotification'

app.directive('notificationBar', function () {
    return {
        restrict: 'E',
        template: '<div>{{text}}</div>',
        link: function (scope, element, attrs) {
            scope.text = '';
            scope.showText = false;

            var colors = {
                normal: 'color: #dff0d8;',
                success: 'color: #9FFA00;',
                failure1: 'color: #f2dede;',
                failure2: 'color: #ff8080;'
            };

            element.addClass('notificationBar');

            userNotification.callbacks.show = function (text, type, duration) {
                /* init values */
                if (typeof(text) === 'undefined') {
                    esconsole('cannot print empty text in userNotification', ['error', 'debug']);
                    return null;
                }

                if (!colors.hasOwnProperty(type)) {
                    type = 'normal';
                }

                if (!duration) {
                    duration = 3;
                }

                userNotification.queue.push({
                    message: {
                        text: text
                    },
                    type: type,
                    duration: duration
                });

                // if there's no ongoing notification, show the first message in queue
                if (!scope.showText) {
                    queueNext();
                }
            };

            function queueNext() {
                scope.text = userNotification.queue[0].message.text;
                scope.showText = true;
                attrs.$set('style', colors[userNotification.queue[0].type]);

                if (!scope.$$phase) {
                    scope.$apply();
                }

                setTimeout(userNotification.hide, userNotification.queue[0].duration * 1000);
            }

            userNotification.callbacks.hide = function () {
                scope.showText = false;
                userNotification.queue.shift();

                // consume the remaining messages after the current one is finished
                if (userNotification.queue.length > 0) {
                    setTimeout(function () {
                        queueNext();
                    }, 200);
                }

                if (!scope.$$phase) {
                    scope.$apply();
                }
            };
        }
    }
});

app.directive('notificationPopup', ['$ngRedux', function ($ngRedux) {
    return {
        restrict: 'E',
        template: '<div class="arrow" style="position:absolute; top:-11px; right:21px; height:0; width:0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 14px solid;"></div><div><span style="float:left; overflow:hidden; width: 210px;  text-overflow:ellipsis;">{{popupText}}</span><span style="float:right; cursor:pointer; color:indianred" ng-click="hidePopup()">X</span></div>',
        link: function (scope, element, attrs) {
            scope.popupText = '';
            scope.showPopupText = false;

            var colors = [{
                normal: 'color: #dff0d8;',
                success: 'color: #9FFA00;',
                failure1: 'color: #f2dede;',
                failure2: 'color: #ff8080;'
            }, {
                normal: 'color: #40463E;',
                success: 'color: #64DC35;',
                failure1: 'color: #D73636;',
                failure2: 'color: #D73636;'
            }];

            element.addClass('notificationPopup');

            userNotification.callbacks.popup = function (text, type, duration) {
                /* init values */
                if (typeof(text) === 'undefined') {
                    esconsole('cannot print empty text in userNotification', ['error', 'debug']);
                    return null;
                }

                // if (!colors.hasOwnProperty(type)) {
                //     type = 'normal';
                // }

                if (!duration) {
                    duration = 8;
                }

                userNotification.popupQueue.push({
                    message: {
                        text: text
                    },
                    type: type,
                    duration: duration
                });

                // if there's no ongoing notification, show the first message in popupQueue
                if (!scope.showPopupText) {
                    queueNext();
                }
            };

            function queueNext() {
                scope.popupText = userNotification.popupQueue[0].message.text;
                scope.showPopupText = true;

                const theme = $ngRedux.getState().app.colorTheme;
                if (colors[0].hasOwnProperty(userNotification.popupQueue[0].type)) {
                    if (theme === 'dark') {
                        attrs.$set('style', colors[0][userNotification.popupQueue[0].type]);
                    } else {
                        attrs.$set('style', colors[1][userNotification.popupQueue[0].type]);
                    }
                } else {
                    if (theme === 'dark') {
                        attrs.$set('style', 'white');
                    } else {
                        attrs.$set('style', 'black');
                    }
                }

                if (!scope.$$phase) {
                    scope.$apply();
                }

                setTimeout(userNotification.hidePopup, userNotification.popupQueue[0].duration * 1000);
            }

            userNotification.callbacks.hidePopup = function () {
                scope.showPopupText = false;
                userNotification.popupQueue.shift();

                // consume the remaining messages after the current one is finished
                if (userNotification.popupQueue.length > 0) {
                    setTimeout(function () {
                        queueNext();
                    }, 200);
                }

                if (!scope.$$phase) {
                    scope.$apply();
                }
            };

            scope.hidePopup = function () {
                userNotification.hidePopup();
            };
        }
    }
}]);
