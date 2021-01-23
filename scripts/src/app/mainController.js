import * as bubbleState from '../bubble/bubbleState';

/**
 * @module mainController
 */
app.controller("mainController", ['$rootScope', '$scope', '$state', '$http', '$uibModal', '$timeout', '$location', 'userProject', 'userNotification', 'ESUtils', 'esconsole', '$q', '$confirm', '$sce', 'localStorage', 'reporter', 'colorTheme', 'layout', 'collaboration','tabs', '$document', 'audioContext', 'audioLibrary', 'timesync', '$ngRedux', function ($rootScope, $scope, $state, $http, $uibModal, $timeout, $location, userProject, userNotification, ESUtils, esconsole, $q, $confirm, $sce, localStorage, reporter, colorTheme, layout, collaboration, tabs, $document, audioContext, audioLibrary, timesync, $ngRedux) {
    $ngRedux.connect(state => ({ ...state.bubble }))(state => {
        $scope.bubble = state;
    });

    $scope.loggedIn = false;
    $scope.showIDE = true;
    $scope.showAll = false;
    $scope.soundsLoaded = false;
    $scope.colorTheme = localStorage.get('colorTheme', 'dark');
    $scope.hljsTheme = 'monokai-sublime';
    $scope.selectedFont = 14;
    $scope.enableChat = false; // Chat window toggle button. Hidden by default.
    $scope.showChatWindow = false;

    // CAI visibility
    console.log("CAI",FLAGS.SHOW_CAI);
    $scope.enableCAI = FLAGS.SHOW_CAI;
    $scope.showCAIWindow = false;

    // TEMPORARY FOR AWS CONTEST TESTING
    $scope.showAmazon = FLAGS.SHOW_AMAZON;
    $scope.showAmazonSounds = FLAGS.SHOW_AMAZON_SOUNDS;
    $scope.showAmazonBanner = FLAGS.SHOW_AMAZON_BANNER;

    // TEMPORARY FOR GM TESTING
    $scope.showGM = FLAGS.SHOW_GM;

    if ($scope.showAmazon == true) {
        $rootScope.$broadcast('showAmazon');
    }

    if ($scope.showAmazonSounds == true) {
        $rootScope.$broadcast('showAmazonSounds');
    }

    /* User data */
    $scope.firstname = '';
    $scope.lastname = '';
    $scope.email = '';
    $scope.username = '';
    $scope.userrole = 'student';
    $scope.loggedInUserName = ' '; // this is shown in the top right corner -- it cannot be initialized with an empty string '' as ngModel doesn't seem to like it

    // Loading ogg by default for browsers other than Safari
    // and Chrome 58 which has bad ogg decoder (May 22, 2017)
    $scope.audioQuality = ESUtils.whichBrowser().match('Opera|Firefox|Msie|Trident') !== null;
    $scope.detectOS = ESUtils.whichOS();

    esconsole.getURLParameters();

    // ask all scopes that need to to get the list of sounds now
    $rootScope.$broadcast('refreshSounds');

    var trustedHtml = {};

    $scope.isEmbedded = $location.search()["embedded"] === "true";

    /**
     * get trusted HTML content for Popover
     */
    $scope.getPopoverContent = function(action) {
        var content = '';
        var os = '';

        if ($scope.detectOS ==='MacOS') {
            os = 'Cmd';
        } else {
            os = 'Ctrl';
        }

        switch (action) {
            case "run":
                var key = 'Enter';
                content = "<div><kbd class='kbd'>"+os+"</kbd> + <kbd class='kbd'>"+key+"</kbd></div>";
                break;
            case "editor":
                var shortcuts = [
                    {key:'S',action:'SAVE',shift:false},
                    {key:'Z',action:'UNDO',shift:false},
                    {key:'Z',action:'REDO',shift:true},
                    {key:'/',action:'COMMENT',shift:false},
                    {key:'L',action:'GO TO LINE',shift:false},
                    {key:'Space',action:'COMPLETE WORD',shift:false}
                ];
                content = "<table>";

                for (index in shortcuts) {
                    content = content + "<tr>";
                    content = content + "<td><span class='label-shortcut-key label-success'>"+shortcuts[index].action+"</span></td>";
                    content = content + "<td>";

                    if (shortcuts[index].action === 'COMPLETE WORD') {
                        if ($scope.detectOS ==='MacOS') {
                            content = content + "<kbd class='kbd'>"+'Alt'+"</kbd> + ";
                        } else {
                            content = content + "<kbd class='kbd'>"+'Ctrl'+"</kbd> + ";
                        }
                    } else {
                        content = content + "<kbd class='kbd'>"+os+"</kbd> + ";
                    }
                    if (shortcuts[index].shift) {
                        content = content + "<kbd class='kbd'>Shift</kbd> + ";
                    }
                    content = content + "<kbd class='kbd'>"+shortcuts[index].key+"</kbd>";
                    content = content + "</td></tr>";
                }
                content = content + "</table>";
                break;
        }

        return trustedHtml[content] || (trustedHtml[content] = $sce.trustAsHtml(content));
    };

    /**
     * Detect keydown events
     */
    $scope.keydownES = function(e) {

        /* Play/Pause  Cmd + >  */
        if (e.keyCode === 190 && e.metaKey) {
            e.preventDefault();
            $rootScope.$broadcast('togglePlay');
        }

        /* Reset Playhead  Cmd + <  */
        // if (e.keyCode === 188 && e.metaKey) {
        //     $rootScope.$broadcast('resetPlayhead');
        // }
    };

    /**
     *
     */
    $scope.init = function () {
        esconsole('initializing main controller 1 ...', ['debug', 'init']);

        $scope.loaded = true;
        $scope.updateSoundQualityGlyph($scope.audioQuality);

        userNotification.isInLoadingScreen = true;
    };

    $scope.downloadSpinnerClick = function () {
        esconsole('***** downloadSpinnerClick *****');
        document.getElementById('download-loader').style.display = 'none';
    };

    /**
     *
     * @param compress
     */
    $scope.soundQuality = function (compress) {
        esconsole('sound quality set to ' + compress, ['debug', 'main']);
        if (compress && (ESUtils.whichBrowser().match('Safari') !== null || ESUtils.whichBrowser().match('Edge') !== null)) {
            esconsole('Safari does not support low bandwidth audio decoder, continuing with WAV',['WARNING','MAIN']);
            $scope.audioQuality = false; // use wav
        }
        else {
            $scope.audioQuality = compress;
        }
        $scope.updateSoundQualityGlyph($scope.audioQuality);
    };

    // TODO: is this doing anything??? check
    /**
     *
     */
    $scope.updateSoundQualityGlyph = function () {
        if (ESUtils.whichBrowser().match('Safari') !== null || ESUtils.whichBrowser().match('Edge') !== null) {
            angular.element("#bw i").removeClass("glyphicon glyphicon-ok").addClass("glyphicon glyphicon-ok-sign");
        }
        else {
            if ($scope.audioQuality) {
                angular.element("#bw i").removeClass("glyphicon glyphicon-ok-sign").addClass("glyphicon glyphicon-unchecked");
            }
            else {
                angular.element("#bw i").removeClass("glyphicon glyphicon-unchecked").addClass("glyphicon glyphicon-ok-sign");
            }
        }
        if (!$scope.audioQuality)
            esconsole('Loading wav', ['debug', 'init']);
        else
            esconsole('Loading ogg', ['debug', 'init']);
    };

    /**
     *
     * @param page
     */
    $scope.setPage = function (page) {
        if (page === "workstation") {
            $scope.$broadcast('workstation', {});
            $scope.handleCombinedViewStyling(false);
            $scope.showIDE = false;
            $scope.showAll = false;
        }
        else if (page === "development") {
            $scope.$broadcast('development', {});
            $scope.handleCombinedViewStyling(false);
            $scope.showIDE = true;
            $scope.showAll = false;
        }
        else if (page === 'all') {
            $scope.$broadcast('workstation', {});
            $scope.$broadcast('development', {});
            $scope.handleCombinedViewStyling(true);
            $scope.showAll = true;
        }
    };

    $scope.scripts = [];
    $scope.isManualLogin = false;

    // these should be populated from somewhere else and not hard-coded, most likely
    $scope.languages = [{'lang': 'Python'}, {'lang': 'JavaScript'}];
    $scope.fontSizes = [{'size': 10}, {'size': 12}, {'size': 14}, {'size': 18}, {'size': 24}, {'size': 36}];

    // mainly for alternate display in curriculum / API browser
    $scope.dispLang = localStorage.get('language', 'python');
    // this may be overridden by URL parameter later

    $scope.$on('language', function (event, value) {
        // TODO: this is getting too many times when switching tabs
        $scope.dispLang = value;
    });

    $scope.openShareAfterLogin = function() {
        $scope.isManualLogin = true;
    };

    /**
     *
     */
    $scope.login = function () {
        esconsole('Logging in', ['DEBUG','MAIN']);

        //save all unsaved open scripts (don't need no promises)
        userProject.saveAll();

        return userProject.getUserInfo($scope.username, $scope.password).then(function (userInfo) {
            // userInfo !== undefined if user exists.
            if (userInfo) {
                // Always override with the returned username in case the letter cases mismatch.
                $scope.username = userInfo.username;

                // get user role (can verify the admin / teacher role here?)
                if (userInfo.hasOwnProperty('role')) {
                    $scope.userrole = userInfo.role;

                    if (userInfo.role === 'teacher') {
                        if (userInfo.firstname === '' || userInfo.lastname === '' || userInfo.email === '') {
                            userNotification.show(ESMessages.user.teachersLink, 'editProfile');
                        }
                    }
                } else {
                    $scope.role = 'student';
                }

                $scope.firstname = userInfo.firstname;
                $scope.lastname = userInfo.lastname;
                $scope.email = userInfo.email;

                // Always show TEACHERS link in case the teacher-user does not have the teacher role and should be directed to request one.
                $scope.showTeachersLink = true;

                userNotification.setUserRole(userInfo.role);

                // Retrieve the user scripts.
                return userProject.login($scope.username, $scope.password).then(function (result) {
                    esconsole('Logged in as ' + $scope.username, ['DEBUG','MAIN']);

                    // load user scripts
                    $scope.scripts = result;

                    var url = $location.absUrl();
                    var competitionMode = url.includes('competition');
                    if (competitionMode) {
                        $scope.showAmazon = true;
                        $scope.showAmazonSounds = true;
                        $scope.showAmazonBanner = true;
                        $rootScope.$broadcast('showAmazon');
                        $rootScope.$broadcast('showAmazonSounds');
                    }

                    // show alert
                    if (!$scope.loggedIn) {
                        $scope.loggedIn = true;

                        // "login success" message to be shown only when re-logged in with sounds already loaded (after splash screen).
                        // the initial login message is taken care in the sound browser controller
                        if (userNotification.isInLoadingScreen) {
                            // showLoginMessageAfterLoading = true;
                            // $rootScope.$broadcast('showLoginMessage');
                        } else {
                            userNotification.show(ESMessages.general.loginsuccess, 'normal', 0.5);
                        }

                        if (userProject.shareid && $scope.isManualLogin) {
                            $rootScope.$broadcast('openShareAfterLogin');
                        }

                        $scope.loggedInUserName = $scope.username;
                        $rootScope.$broadcast('scriptsLoaded');
                    }

                    // load Sounds
                    $rootScope.$broadcast('refreshSounds');
                    colorTheme.load();
                });
            } else {
                // login failure -- clear username/password
                // $scope.username = '';
                // $scope.password = '';
                userNotification.show(ESMessages.general.loginfailure, 'failure1',  3.5);
            }
        });
    };

    $scope.logout = function () {
        // save all unsaved open scripts
        var promises = userProject.saveAll();

        $q.all(promises).then(function () {
            if (userProject.openScripts.length > 0) {
                userNotification.show(ESMessages.user.allscriptscloud);
            }

            if (tabs.activeTabIndex > -1) {
                if (tabs.activeTabScript && tabs.activeTabScript.collaborative){
                    collaboration.leaveSession(tabs.activeTabScript.shareid);
                }
            }

            // once all scripts have been saved, clear scripts
            $scope.scripts = [];

            // tabs.closeAll();
            tabs.unloadSharedScript();
            userProject.clearUser();
            userNotification.clearHistory();
            $scope.notificationList = [];
            reporter.logout();
        }).catch(function (err) {
            $confirm({text: ESMessages.idecontroller.saveallfailed,
                cancel: "Keep unsaved tabs open", ok: "Ignore"}).then(function () {
                $scope.scripts = [];
                tabs.unloadSharedScript();
                userProject.clearUser();
            });
        });

        // unload user specific sounds
        $rootScope.$broadcast('unloadUserSounds');

        // 
        
        // clear out all the values set at login
        $scope.username = '';
        $scope.password = '';
        $scope.loggedIn = false;
        $scope.showTeachersLink = false;

        /* User data */
        $scope.firstname = '';
        $scope.lastname = '';
        $scope.email = '';
        $scope.userrole = 'student';
        $scope.loggedInUserName = ' '; // this is shown in the top right corner -- it cannot be initialized with an empty string '' as ngModel doesn't seem to like it

    };

    $scope.openLMSPage = function(){
        userProject.getUserInfo().then(function (userInfo) {
            if (userInfo.hasOwnProperty('role') && (userInfo.role === 'teacher' || userInfo.role === 'admin')) {
                if (userInfo.firstname === '' || userInfo.lastname === '' || userInfo.email === '') {
                    userNotification.show(ESMessages.user.teachersLink, 'editProfile');
                } else {
                    var url = URL_DOMAIN + '/services/scripts/getlmsloginurl';
                    var payload = new FormData();
                    payload.append('username', userProject.getUsername());
                    payload.append('password', userProject.getEncodedPassword());
                    var opts = {
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                    };

                    return $http.post(url, payload, opts).then(function (result) {
                        var lmsWindow = window.open("", "_blank");
                        var message, homepage;

                        if(!lmsWindow || lmsWindow.closed || typeof lmsWindow.closed === 'undefined'){
                            userNotification.show("The teachers page is being blocked by a popup blocker", 'popup');
                        }

                        if (result.data.hasOwnProperty('failback')) {
                            homepage = JSON.parse(result.data.failback)['loginurl'];
                        }

                        if (result.data.hasOwnProperty('loginurl')) {
                            lmsWindow.location = result.data.loginurl;
                        } else if (result.data.hasOwnProperty('debuginfo')) {
                            message = ESMessages.user.teacherSiteLoginError + result.data.debuginfo + ESMessages.user.promptFixAtTeacherSite;
                            userNotification.show(message, 'editProfile');
                            lmsWindow.location = homepage;
                        } else {
                            message = ESMessages.user.teacherSiteLoginError + 'Opening the home page without logging in..' + ESMessages.user.promptFixAtTeacherSite;
                            userNotification.show(message, 'editProfile');
                            lmsWindow.location = result.data.loginurl;
                        }
                    }).catch(function (error) {
                        console.log(error);
                    });
                }
            } else {
                userNotification.show(ESMessages.user.teachersPageNoAccess, 'failure1');
            }
        });
    };

    // attempt to load userdata from a previous session
    if (userProject.isLogged()) {
        var userStore = userProject.loadUser();
        $scope.username = userStore.username;
        $scope.password = userStore.password;

        $scope.login().catch(error => {
            if (window.confirm('We are unable to automatically log you back in to EarSketch. Press OK to reload this page and log in again.')) {
                localStorage.clear();
                window.location.reload();
                esconsole(error, ['ERROR']);
                reporter.exception('Auto-login failed. Clearing localStorage.');
            }
        });
    } else {
        $ngRedux.dispatch(bubbleState.resume());
    }


    $scope.createAccount = function () {
        $uibModal.open({
            templateUrl: 'templates/create-account.html',
            controller: 'accountController',
            scope: $scope
        });
    };

    $scope.forgotPass = function () {
        $uibModal.open({
            templateUrl: 'templates/forgot-password.html',
            controller: 'forgotpasswordController'
        });
    };

    $scope.changePassword = function () {
        $uibModal.open({
            templateUrl: 'templates/change-password.html',
            controller: 'changepasswordController',
            scope: $scope
        });
    };

    $scope.editProfile = function () {
        $scope.showNotification = false;
        $uibModal.open({
            templateUrl: 'templates/edit-profile.html',
            controller: 'editProfileController',
            scope: $scope
        });
    };

    $scope.openAdminWindow = function () {
        $uibModal.open({
            templateUrl: 'templates/admin-window.html',
            controller: 'adminwindowController',
            scope: $scope
        });
    };

    $scope.handleCombinedViewStyling = function (combined) {
        if (combined) {
            // set width of main view to full width of window
            angular.element('.tab-content').width(angular.element( window ).width());
            angular.element('.tab-content').addClass('combined-view');
            angular.element('#devctrl').addClass('combined-view');
            angular.element('.workstation').addClass('combined-view');
            angular.element('.loading').addClass('combined-view');
            angular.element('.license').addClass('combined-view');
        } else {
            angular.element('.tab-content').css('width', '');
            angular.element('.tab-content').removeClass('combined-view');
            angular.element('#devctrl').removeClass('combined-view');
            angular.element('.workstation').removeClass('combined-view');
            angular.element('.loading').removeClass('combined-view');
            angular.element('.license').removeClass('combined-view');
        }
    };

    $rootScope.$on('soundsLoaded', function () {
        $scope.soundsLoaded = true;
        userNotification.isInLoadingScreen = false;
        colorTheme.load();
        // $scope.setColorTheme(localStorage.get('colorTheme'));

        // fetch broadcast message (pinned notifications) from admins




    });

    $scope.showNotification = false;
    $scope.notificationList = userNotification.history;
    $scope.showNotificationHistory = false;

    $scope.$on('notificationsUpdated', function () {
        $scope.notificationList = userNotification.history;
    });

    // This is for updating the currentTime for the date label.
    // TODO: find a way to do this with callback from the uib popover element
    $scope.$watch('showNotification', function (val) {
        if (val) {
            $scope.currentTime = Date.now();
        }
    });

    $scope.toggleNotificationHistory = function (bool) {
        $scope.showNotificationHistory = bool;

        $rootScope.$broadcast('visible', bool);
        
        if (bool) {
            $scope.showNotification = false;
        }
    };

    $scope.getNumUnread = function () {
        return userNotification.history.filter(function (v) { return v && (v.unread || v.notification_type === 'broadcast'); }).length;
    };

    //=================================================
    // TODO: move these to an appropriate directive!

    $scope.readMessage = function (index, item) {
        if (item.notification_type === 'broadcast' || typeof(userNotification.history[index].id) === 'undefined') {
            return null;
        }
        var url = URL_DOMAIN + '/services/scripts/markread';
        var body = new FormData();
        body.append('username', userProject.getUsername());
        body.append('password', userProject.getEncodedPassword());
        body.append('notification_id', userNotification.history[index].id);
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };
        $http.post(url, body, opts).then(function () {
            userNotification.history[index].unread = false;
            $scope.unreadMessages = userNotification.history.filter(function (v) { return v.unread; }).length;
            $scope.notificationList = userNotification.history;
        }).catch(function (error) {
            esconsole(error, ['mainctrl', 'error']);
        });
    };

    $scope.markAllAsRead = function () {
        userNotification.history.forEach(function (item, index) {
            if (item.unread && item.notification_type !== 'broadcast') {
                // TODO: handle broadcast as well
                $scope.readMessage(index, item);
            }
        });
    };

    $scope.openSharedScript = function (shareid) {
        esconsole('opening a shared script: ' + shareid, 'main');
        angular.element('[ng-controller=ideController]').scope().openShare(shareid);
        $scope.showNotification = false;
        $scope.showNotificationHistory = false;
    };

    $scope.openCollaborativeScript = function (shareID) {
        if (userProject.sharedScripts[shareID] && userProject.sharedScripts[shareID].collaborative) {
            $scope.openSharedScript(shareID);
            // collaboration.openScript(userProject.sharedScripts[shareID], userProject.getUsername());
        } else {
            $scope.showNotification = false;
            userNotification.show('Error opening the collaborative script! You may no longer the access. Try refreshing the page and checking the shared scripts browser', 'failure1');
        }
    };

    $scope.currentTime = Date.now();

    //=================================================

    /**
     * @name setFontSize
     * @function
     * @param fontSize {number}
     */
    $scope.$on('initFontSize', function (event, val) {
        
            $scope.selectedFont = val;
        
    });

    $scope.setFontSize = function (fontSize) {
        esconsole('resizing global font size to ' + fontSize, 'debug');
        
        
            $scope.selectedFont = fontSize;
            $rootScope.$broadcast('fontSizeChanged', fontSize);
    
        
    };

    $scope.enterKeySubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.openShareAfterLogin();
            $scope.login();
        }
    };

    // TODO: since this goes across scopes, we should use a service
    $scope.toggleShortcutHelper = function () {
        $scope.showKeyShortcuts = !$scope.showKeyShortcuts;
        $rootScope.$broadcast('showDAWKeyShortcuts');
    };

    $scope.isShortcutHelperOpen = function () {
        return $scope.showKeyShortcuts;
    };

    $scope.toggleColorTheme = function () {
        colorTheme.toggle();
        reporter.toggleColorTheme();
    };

    colorTheme.subscribe($scope, function (event, theme) {
        $scope.colorTheme = theme;

        if (theme === 'dark') {
            angular.element('body').css('background', 'black');
            $scope.hljsTheme = 'monokai-sublime';

        } else {
            angular.element('body').css('background', 'white');
            $scope.hljsTheme = 'vs';
        }
    });

    $scope.showTimesync = timesync.available = (localStorage.get('showTimesync', false) === 'true');
    $scope.toggleTimesyncOption = function () {
        $scope.showTimesync = timesync.available = !timesync.available;
        localStorage.set('showTimesync', $scope.showTimesync);

        if (!timesync.available && timesync.enabled) {
            timesync.disable();
        }
    };

    $scope.reportError = function () {
        angular.element('[ng-controller=ideController]').scope().reportError();
    };

    try {
        var shareID = ESUtils.getURLParameters('edit');

        if (shareID) {
            esconsole('opening a shared script in edit mode', ['main', 'url']);
            userProject.openSharedScriptForEdit(shareID);
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    try {
        var layoutParamString = ESUtils.getURLParameters('layout');
        if (layoutParamString && layoutParamString.hasOwnProperty('split')) {
            layoutParamString.split(',').forEach(function (item) {
                var keyval = item.split(':');
                if (keyval.length === 2) {
                    esconsole('setting layout from URL parameters', ['main', 'url']);
                    layout.set(keyval[0], parseInt(keyval[1]));
                }
            });
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    try {
        var url = $location.absUrl();
        var chatMode = url.includes('chat') || url.includes('tutor');
        if (chatMode) {
            $scope.enableChat = true;
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    try {
        var url = $location.absUrl();
        var competitionMode = url.includes('competition');
        if (competitionMode) {
            $scope.showAmazon = true;
            $scope.showAmazonSounds = true;
            $scope.showAmazonBanner = true;
            $rootScope.$broadcast('showAmazon');
            $rootScope.$broadcast('showAmazonSounds');
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    /**
     * Usually hidden function to check and display the chat bubble icon next to the active script / tab.
     * @param script
     * @returns {*|boolean}
     */
    $scope.showChatBubble = function (script) {
        return layout.get('chat') && collaboration.scriptID === script.shareid;
    };

    $scope.activeTabIsCollaborative = function () {
        return tabs.activeTabScript && tabs.activeTabScript.collaborative;
    };

    $scope.openFacebook = function () {
        window.open('https://www.facebook.com/EarSketch/', '_blank');
    };

    $scope.openTwitter = function () {
        window.open('https://twitter.com/earsketch', '_blank');
    };

    $scope.resumeQuickTour = () => {
        $ngRedux.dispatch(bubbleState.reset());
        $ngRedux.dispatch(bubbleState.resume());
    };

    // for Chrome 66+ web-audio restriction
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=807017
    function resumeAudioContext() {
        esconsole('resuming the suspended audio context', 'main');
        if (audioContext.status !== 'running') {
            audioContext.resume();
        }
        $document.off('click', resumeAudioContext); // unbind from this event listener
    }

    $document.on('click', resumeAudioContext);
}]);
