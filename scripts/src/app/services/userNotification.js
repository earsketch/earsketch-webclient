// TODO: separate the temporary and permanent notification services?
app.service('userNotification', ['$window', '$rootScope', function ($window, $rootScope) {
    var self = this;
    var loginTime = new Date();

    this.isInLoadingScreen = false;
    this.queue = [];
    this.history = [];

    this.addSharedScript = null; // a callback to be registered in userProject

    var userName = null;
    this.setUserName = function (name) {
        userName = name;
    };

    var userRole = null;
    this.setUserRole = function (role) {
        userRole = role;
    };

    var showCallback = null;
    var hideCallback = null;

    this.showCallback = function (cb) {
        showCallback = cb;
    };

    this.hideCallback = function (cb) {
        hideCallback = cb;
    };

    this.popupQueue = [];
    var popupCallback = null;
    var hidePopupCallback = null;

    this.popupCallback = function (cb) {
        popupCallback = cb;
    };

    this.hidePopupCallback = function (cb) {
        hidePopupCallback = cb;
    };

    this.show = function () {
        // check type for registering to the notification history
        // TODO: handle with proper message types defined
        var type = arguments[1];

        if (['bell','popup','history'].indexOf(type)) { // temporary tags for bell-icon dropdown notifications
            this.history.unshift({
                message: {
                    text: arguments[0]
                },
                notification_type: type,
                time: Date.now(),
                read: false,
                pinned: false
            });
        } else if (type === 'editProfile') {
            while (this.history.some(function (item) {
                    return item.notification_type === 'editProfile';
                })) {

                var index = self.history.findIndex(function (item) {
                    return item['notification_type'] === 'editProfile';
                });

                if (index !== -1) {
                    self.history.splice(index, 1);
                }
            }

            this.history.unshift({
                message: {
                    text: arguments[0]
                },
                notification_type: type,
                time: Date.now(),
                unread: false,
                pinned: true
            });
        } else if (type === 'collaboration') {
            this.history.unshift({
                message: {
                    text: arguments[0]
                },
                notification_type: type,
                time: Date.now(),
                unread: true,
                pinned: false
            });
        } else {
            // showCallback.apply(this, arguments);
        }
        if (popupCallback){
            popupCallback.apply(this, arguments);
        }
    };

    this.showBanner = function () {
        showCallback.apply(this, arguments);
    };

    this.hide = function () {
        hideCallback();
    };

    this.hidePopup = function () {
        hidePopupCallback();
    };

    /**
     * Only show the latest broadcast on the client side.
     */
    function truncateBroadcast() {
        var nonBroadcasts = self.history.filter(function (v) {
            return v.notification_type !== 'broadcast';
        });

        var latestBroadcast = self.history.filter(function (v) {
            return v.notification_type === 'broadcast';
        })[0];

        self.history = nonBroadcasts;

        if (typeof(latestBroadcast) !== 'undefined') {
            self.history.unshift(latestBroadcast);
        }
    }

    this.subscribe = function (callback, scope) {
        var handler = $rootScope.$on('notificationHistoryLoaded', callback);
        if (scope) {
            scope.$on('$destory', handler);
        }
    };
    /**
     * Fill the history array at initialization from webservice call as well as localStorage. Sorting might be needed.
     * @param notificationList {Array}
     */
    this.loadHistory = function (notificationList) {
        var text = '';
        var history = notificationList;

        // filter out 'teacherBroadcast' messages
        if (['teacher', 'admin'].indexOf(userRole) === -1) {
            history = history.filter(function (v) {
                return v.notification_type !== 'teacher_broadcast';
            });
        }

        self.history = history.map(function (v) {
            v.pinned = (v.notification_type === 'broadcast' || v.notification_type === 'teacher_broadcast');

            // TODO: notification_type is too verbose
            // TODO: send individual messages not the whole history
            if (v.notification_type === 'share_script') {
                text = v.sender + ' shared ' + v.script_name + ' with you!';
                v.message = {
                    text: text
                };

                // auto-add new view-only scripts that are shared to the shared-script browser
                if (v.unread) {
                    if (self.addSharedScript) {
                        self.addSharedScript(v.shareid, v.id);
                    }
                }
            } else if (v.notification_type === 'collaborate_script') {
                var data = JSON.parse(v.message.json);
                // $rootScope.$emit('notificationHistoryLoaded', data); // trigger subscribed callbacks

                // received only by the ones affected
                switch (data.action) {
                    case 'userAddedToCollaboration':
                        text = data.sender + ' added you as a collaborator on ' + data.scriptName;
                        break;
                    case 'userRemovedFromCollaboration':
                        text = data.sender + ' removed you from collaboration on ' + data.scriptName;
                        break;
                    case 'userLeftCollaboration':
                        text = data.sender + ' left the collaboration on ' + data.scriptName;
                        break;
                    case 'scriptRenamed':
                        text = 'Collaborative script "' + data.oldName + '" was renamed to "' + data.newName + '"';
                        break;
                }

                v.message = {
                    text: text,
                    action: data.action
                };
            } else if (v.notification_type === 'teacher_broadcast') {
                v.message.text = '[Teacher] ' + v.message.text;
            }

            v.time = new Date(v.created);

            // hack around only receiving notification history (collection) but not individual messages
            // TODO: always send individual notification from server
            if (v.unread && (v.time-loginTime) > 0) {
                self.show(v.message.text, 'popup', 6);
            }

            return v;
        });

        self.history.sort(function (a, b) {
            return b.time - a.time;
        });

        truncateBroadcast();
        scopeDigest();
    };

    this.clearHistory = function () {
        self.history = [];
    };

    // TODO: should receive notification collection here as well
    this.handleBroadcast = function (data) {
        self.show('From EarSketch team: ' + data.message.text, 'broadcast');
        data.time = new Date();
        data.pinned = true;
        self.history.unshift(data);
        truncateBroadcast();
        scopeDigest();
    };

    this.handleTeacherBroadcast = function (data) {
        if (userRole !== 'teacher') {
            return;
        }

        self.show('From EarSketch team to teachers: ' + data.message.text, 'broadcast');
        data.time = new Date();
        data.pinned = true;
        self.history.unshift(data);
        // truncateBroadcast();
        scopeDigest();
    };

    this.handleShareScriptMessage = function (data) {
        // right now, handled inline in loadHistory. not efficient?
    };

    this.handleCollabInvitation = function (data) {
        self.show(data.owner + ' invited you for a collaboration!');

        var notification = {
            notification_type: 'collaboration',
            time: new Date(),
            unread: true,
            pinned: false,
            shareid: data.scriptID
        };

        // TODO: add buttons data
        if (data.action === 'invited') {
            notification.message = {
                text: data.owner + ' invited you for a collaboration!'
            }
        }

        addNotificationToList(notification);
        scopeDigest();
    };

    this.setLoginTime = function (date) {
        loginTime = date;
    };

    function addNotificationToList(notification) {
        self.history.unshift(notification);
    }

    function scopeDigest() {
        $rootScope.$broadcast('notificationsUpdated');
        $rootScope.$applyAsync();
    }

    // Copying to global for non-angular modules
    $window.userNotification = this;
}]);