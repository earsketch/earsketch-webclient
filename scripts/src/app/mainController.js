import * as appState from '../app/appState';
import audioContext from './audiocontext'
import * as audioLibrary from './audiolibrary'
import * as collaboration from './collaboration'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as exporter from './exporter'
import * as user from '../user/userState';
import reporter from './reporter';
import * as scripts from '../browser/scriptsState';
import * as sounds from '../browser/soundsState';
import * as recommenderState from '../browser/recommenderState';
import * as bubble from '../bubble/bubbleState';
import * as tabs from '../editor/tabState';
import * as curriculum from '../browser/curriculumState';
import * as layout from '../layout/layoutState';
import * as Layout from '../layout/Layout';
import * as cai from '../cai/caiState';
import * as userNotification from './userNotification';

/**
 * @module mainController
 */
app.controller("mainController", ['$rootScope', '$scope', '$http', '$uibModal', '$location', 'userProject', '$q', '$confirm', '$sce', '$document', '$ngRedux', 'recommender', function ($rootScope, $scope, $http, $uibModal, $location, userProject, $q, $confirm, $sce, $document, $ngRedux, recommender) {
    $ngRedux.connect(state => ({ ...state.bubble }))(state => {
        $scope.bubble = state;
    });

    $scope.numTabs = 0;
    $ngRedux.connect(state => ({ openTabs: state.tabs.openTabs }))(tabs => {
        $scope.numTabs = tabs.openTabs.length;
    });

    $ngRedux.dispatch(sounds.getDefaultSounds());
    if (FLAGS.SHOW_FEATURED_SOUNDS) {
        $ngRedux.dispatch(sounds.setFeaturedSoundVisibility(true));
    }
    if (FLAGS.FEATURED_ARTISTS && FLAGS.FEATURED_ARTISTS.length) {
        $ngRedux.dispatch(sounds.setFeaturedArtists(FLAGS.FEATURED_ARTISTS));
    }

    $scope.loggedIn = false;
    $scope.showIDE = true;
    $scope.showAll = false;
    $scope.colorTheme = $ngRedux.getState().app.colorTheme;
    $scope.hljsTheme = 'monokai-sublime';
    $scope.selectedFont = 14;
    $scope.enableChat = false; // Chat window toggle button. Hidden by default.
    $scope.showChatWindow = false;

    // CAI visibility
    $scope.enableCAI = FLAGS.SHOW_CAI;
    $scope.showCAIWindow = FLAGS.SHOW_CAI;

    // TEMPORARY FOR AWS CONTEST TESTING
    $scope.showAmazon = FLAGS.SHOW_AMAZON;
    $scope.showAmazonSounds = FLAGS.SHOW_AMAZON_SOUNDS;
    $scope.showAmazonBanner = FLAGS.SHOW_AMAZON_BANNER;

    // TEMPORARY FOR GM TESTING
    $scope.showGM = FLAGS.SHOW_GM;

    // TEMPORARY FOR I18N DEVELOPMENT
    $scope.showLocaleSwitcher = FLAGS.SHOW_LOCALE_SWITCHER;

    if ($scope.showAmazon) {
        $rootScope.$broadcast('showAmazon');
    }

    if ($scope.showAmazonSounds) {
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

    var trustedHtml = {};

    $scope.isEmbedded = $location.search()["embedded"] === "true";
    $scope.hideDAW = $scope.isEmbedded && $location.search()['hideDaw'];
    $scope.hideEditor = $scope.isEmbedded && $location.search()['hideCode'];
    $scope.embeddedScriptUsername = "";
    $scope.embeddedScriptName = '';

    if ($scope.isEmbedded) {
        $ngRedux.dispatch(appState.setColorTheme("light"))
        $ngRedux.dispatch(appState.setEmbedMode(true));
        Layout.destroy();
        layout.setMinSize(0);

        if ($scope.hideEditor) {
            layout.setGutterSize(0);
        }
        Layout.initialize();
        $ngRedux.dispatch(layout.collapseWest());
        $ngRedux.dispatch(layout.collapseEast());
        $ngRedux.dispatch(layout.collapseSouth());

        if ($scope.hideEditor) {
            // Note: hideDAW-only currently does not fit the layout height to the DAW player height as the below API only supports ratios.
            $ngRedux.dispatch(layout.setNorthFromRatio([100,0,0]));
        } else {
            $ngRedux.dispatch(layout.setNorthFromRatio([25,75,0]));
        }
    } else {
        userProject.loadLocalScripts();
        $ngRedux.dispatch(scripts.syncToNgUserProject());
    }

    if ($scope.hideDAW) {
        $ngRedux.dispatch(appState.setHideDAW(true));
    }

    if ($scope.hideEditor) {
        $ngRedux.dispatch(appState.setHideEditor(true));
    }

    $scope.$on('embeddedScriptLoaded', function(event, data){
        $scope.embeddedScriptUsername = data.username;
        $scope.embeddedScriptName = data.scriptName;
        $ngRedux.dispatch(appState.setEmbeddedScriptUsername(data.username));
        $ngRedux.dispatch(appState.setEmbeddedScriptName(data.scriptName));
        $ngRedux.dispatch(appState.setEmbeddedShareID(data.shareid));
    });

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

        userNotification.state.isInLoadingScreen = true;
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
    $scope.dispLang = localStorage.getItem('language') ?? 'python';
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
                $ngRedux.dispatch(user.login({
                    username: $scope.username,
                    password: $scope.password
                }));

                $ngRedux.dispatch(sounds.getUserSounds($scope.username));
                $ngRedux.dispatch(sounds.getFavorites({
                    username: $scope.username,
                    password: $scope.password
                }));

                // $ngRedux.dispatch(scripts.getRegularScripts({
                //     username: $scope.username,
                //     password: $scope.password
                // }));
                //
                // $ngRedux.dispatch(scripts.getSharedScripts({
                //     username: $scope.username,
                //     password: $scope.password
                // }));

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

                userNotification.user.role = userInfo.role;

                // Retrieve the user scripts.
                return userProject.login($scope.username, $scope.password).then(function (result) {
                    esconsole('Logged in as ' + $scope.username, ['DEBUG','MAIN']);

                    // load user scripts
                    $scope.scripts = result;

                    $ngRedux.dispatch(scripts.syncToNgUserProject());

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
                        if (userNotification.state.isInLoadingScreen) {
                            // showLoginMessageAfterLoading = true;
                            // $rootScope.$broadcast('showLoginMessage');
                        } else {
                            userNotification.show(ESMessages.general.loginsuccess, 'normal', 0.5);
                        }

                        if (userProject.shareid && $scope.isManualLogin) {
                            $rootScope.$broadcast('openShareAfterLogin');
                        }

                        $scope.loggedInUserName = $scope.username;

                        const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
                        activeTabID && $ngRedux.dispatch(tabs.setActiveTabAndEditor(activeTabID));
                    }
                });
            } else {

            }
        }).catch(error => {
            userNotification.show(ESMessages.general.loginfailure, 'failure1',  3.5);
            esconsole(error, ['main','login']);
        });
    };

    $scope.logout = function () {
        $ngRedux.dispatch(user.logout());
        $ngRedux.dispatch(sounds.resetUserSounds());
        $ngRedux.dispatch(sounds.resetFavorites());
        $ngRedux.dispatch(sounds.resetAllFilters());

        // $ngRedux.dispatch(scripts.resetRegularScripts());
        // $ngRedux.dispatch(scripts.resetSharedScripts());

        // save all unsaved open scripts
        var promises = userProject.saveAll();

        $q.all(promises).then(function () {
            if (userProject.openScripts.length > 0) {
                userNotification.show(ESMessages.user.allscriptscloud);
            }

            const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
            if (activeTabID) {
                const allScriptEntities = scripts.selectAllScriptEntities($ngRedux.getState());
                if (allScriptEntities[activeTabID].collaborative) {
                    collaboration.leaveSession(activeTabID);
                }
            }

            // once all scripts have been saved, clear scripts
            $scope.scripts = [];

            userProject.clearUser();
            userNotification.clearHistory();
            $scope.notificationList = [];
            reporter.logout();

            $ngRedux.dispatch(scripts.syncToNgUserProject());
            $ngRedux.dispatch(scripts.resetReadOnlyScripts());
            $ngRedux.dispatch(tabs.resetTabs());
            $ngRedux.dispatch(tabs.resetModifiedScripts());
        }).catch(function (err) {
            $confirm({text: ESMessages.idecontroller.saveallfailed,
                cancel: "Keep unsaved tabs open", ok: "Ignore"}).then(function () {
                $scope.scripts = [];
                userProject.clearUser();
            });
        });

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
        $ngRedux.dispatch(scripts.syncToNgUserProject());
                                  

        const openTabs = tabs.selectOpenTabs($ngRedux.getState());
        const allScripts = scripts.selectAllScriptEntities($ngRedux.getState());
        openTabs.forEach(scriptID => {
            if (!allScripts.hasOwnProperty(scriptID)) {
                $ngRedux.dispatch(tabs.closeAndSwitchTab(scriptID));
            }
        });

        // Show bubble tutorial when not opening a share link or in a CAI study mode.
        if (!$location.search()['sharing'] && !FLAGS.SHOW_CAI) {
            $ngRedux.dispatch(bubble.resume());
        }
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
        angular.element('[ng-controller=ideController]').scope().openShare(shareid).then(() => {
            $ngRedux.dispatch(scripts.syncToNgUserProject());
        });
        $scope.showNotification = false;
        $scope.showNotificationHistory = false;
    };

    $scope.openCollaborativeScript = function (shareID) {
        if (userProject.sharedScripts[shareID] && userProject.sharedScripts[shareID].collaborative) {
            $scope.openSharedScript(shareID);
            // collaboration.openScript(userProject.sharedScripts[shareID], userProject.getUsername());
            $ngRedux.dispatch(tabs.setActiveTabAndEditor(shareID));
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
        $ngRedux.dispatch(appState.toggleColorTheme());
        reporter.toggleColorTheme();
    };

    $ngRedux.connect(state => ({ theme: state.app.colorTheme }))(({ theme }) => {
        $scope.colorTheme = theme;

        if (theme === 'dark') {
            angular.element('body').css('background', 'black');
            $scope.hljsTheme = 'monokai-sublime';

        } else {
            angular.element('body').css('background', 'white');
            $scope.hljsTheme = 'vs';
        }
    });

    $scope.reportError = function () {
        angular.element('[ng-controller=ideController]').scope().reportError();
    };

    try {
        var shareID = ESUtils.getURLParameter('edit');

        if (shareID) {
            esconsole('opening a shared script in edit mode', ['main', 'url']);
            userProject.openSharedScriptForEdit(shareID);
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    try {
        var layoutParamString = ESUtils.getURLParameter('layout');
        if (layoutParamString && layoutParamString.hasOwnProperty('split')) {
            layoutParamString.split(',').forEach(function (item) {
                var keyval = item.split(':');
                if (keyval.length === 2) {
                    esconsole('*Not* setting layout from URL parameters', ['main', 'url']);
                    // layout.set(keyval[0], parseInt(keyval[1]));
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

    $scope.openFacebook = function () {
        window.open('https://www.facebook.com/EarSketch/', '_blank');
    };

    $scope.openTwitter = function () {
        window.open('https://twitter.com/earsketch', '_blank');
    };

    $scope.resumeQuickTour = () => {
        $ngRedux.dispatch(bubble.reset());
        $ngRedux.dispatch(bubble.resume());
    };

    $scope.renameSound = sound => {
        $uibModal.open({
            templateUrl: 'templates/rename-sound.html',
            controller: 'renameSoundController',
            size: 'sm',
            resolve: {
                sound() { return sound; }
            }
        });
    };

    $scope.deleteSound = sound => {
        $confirm({text: "Do you really want to delete sound " + sound.file_key + "?",
            ok: "Delete"}).then(() => {
            userProject.deleteAudio(sound.file_key).then(() => {
                $ngRedux.dispatch(sounds.deleteLocalUserSound(sound.file_key));
                audioLibrary.clearAudioTagCache();
            });
        });
    };

    $scope.licenses = {};
    userProject.getLicenses().then(licenses => {
        angular.forEach(licenses,  license => {
            $scope.licenses[license.id] = license;
        });
    });

    $scope.copyScript = script => {
        userProject.saveScript(script.name, script.source_code, false)
            .then(() => {
                userNotification.show(ESMessages.user.scriptcopied);
                $ngRedux.dispatch(scripts.syncToNgUserProject());
            });
    };

    $scope.shareScript = async script => {
        await userProject.saveScript(script.name, script.source_code);
        $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
        $uibModal.open({
            templateUrl: 'templates/share-script.html',
            controller: 'shareScriptController',
            size: 'lg',
            resolve: {
                script() { return script; },
                quality() { return $scope.audioQuality; },
                licenses() { return $scope.licenses; }
            }
        });
    };

    $scope.renameScript = script => {
        // userProject, etc. will try to mutate the immutable redux script  state.
        const scriptCopy = Object.assign({}, script);

        const modal = $uibModal.open({
            templateUrl: 'templates/rename-script.html',
            controller: 'renameController',
            size: 100,
            resolve: {
                script() { return scriptCopy; }
            }
        });

        modal.result.then(async newScript => {
            await userProject.renameScript(scriptCopy.shareid, newScript.name);
            $ngRedux.dispatch(scripts.syncToNgUserProject());
            reporter.renameScript();
        });
    };

    $scope.downloadScript = script => {
        $uibModal.open({
            templateUrl: 'templates/download.html',
            controller: 'downloadController',
            resolve: {
                script() { return script; },
                quality() { return $scope.audioQuality; }
            }
        });
    };

    $scope.printScript = script => {
        exporter.print(script);
    }

    $scope.openScriptHistory = async (script, allowRevert) => {
        await userProject.saveScript(script.name, script.source_code);
        $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
        $uibModal.open({
            templateUrl: 'templates/script-versions.html',
            controller: 'scriptVersionController',
            size: 'lg',
            resolve: {
                script() { return script; },
                allowRevert: allowRevert
            }
        });
        reporter.openHistory();
    };

    $scope.openCodeIndicator = script => {
        $uibModal.open({
            templateUrl: 'templates/script-analysis.html',
            controller: 'analyzeScriptController',
            size: 100,
            resolve: {
                script() { return script; }
            }
        });
    };

    $scope.deleteScript = script => {
        $confirm({
            text: "Deleted scripts disappear from Scripts list and can be restored from the list of 'deleted scripts'.",
            ok: "Delete"
        }).then(async () => {
            if (script.shareid === collaboration.scriptID && collaboration.active) {
                collaboration.closeScript(script.shareid);
            }
            await userProject.saveScript(script.name, script.source_code);
            await userProject.deleteScript(script.shareid);
            reporter.deleteScript();

            $ngRedux.dispatch(scripts.syncToNgUserProject());
            $ngRedux.dispatch(tabs.closeDeletedScript(script.shareid));
            $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
        });
    };

    $scope.deleteSharedScript = script => {
        if (script.collaborative) {
            $confirm({text: 'Do you want to leave the collaboration on "' + script.name + '"?', ok: 'Leave'}).then(() => {
                if (script.shareid === collaboration.scriptID && collaboration.active) {
                    collaboration.closeScript(script.shareid, userProject.getUsername());
                    userProject.closeSharedScript(script.shareid);
                }
                // Apply state change first
                delete userProject.sharedScripts[script.shareid];
                $ngRedux.dispatch(scripts.syncToNgUserProject());
                $ngRedux.dispatch(tabs.closeDeletedScript(script.shareid));
                $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
                // userProject.getSharedScripts in this routine is not synchronous to websocket:leaveCollaboration
                collaboration.leaveCollaboration(script.shareid, userProject.getUsername(), false);
            })
        } else {
            $confirm({text: "Are you sure you want to delete the shared script '"+script.name+"'?", ok: "Delete"}).then(() => {
                userProject.deleteSharedScript(script.shareid).then(() => {
                    $ngRedux.dispatch(scripts.syncToNgUserProject());
                    $ngRedux.dispatch(tabs.closeDeletedScript(script.shareid));
                    $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
                });
            });
        }
    };

    $scope.submitToCompetition = async script => {
        await userProject.saveScript(script.name, script.source_code);
        $ngRedux.dispatch(tabs.removeModifiedScript(script.shareid));
        $uibModal.open({
            templateUrl: 'templates/submit-script-aws.html',
            controller: 'submitAWSController',
            size: 'lg',
            resolve: {
                script() { return script; },
                quality() { return $scope.audioQuality; },
                licenses() { return $scope.licenses; }
            }
        });
    };

    $scope.importScript = async script => {
        if (!script) {
            script = tabs.selectActiveTabScript($ngRedux.getState());
        }

        const imported = await userProject.importScript(Object.assign({},script));
        await userProject.refreshCodeBrowser();
        $ngRedux.dispatch(scripts.syncToNgUserProject());

        const openTabs = tabs.selectOpenTabs($ngRedux.getState());
        $ngRedux.dispatch(tabs.closeTab(script.shareid));

        if (openTabs.includes(script.shareid)) {
            $ngRedux.dispatch(tabs.setActiveTabAndEditor(imported.shareid));
            userProject.openScript(imported.shareid);
            $rootScope.$broadcast('selectScript', imported.shareid);
        }
    };
    
    $scope.toggleCAIWindow = () => {
        $scope.showCAIWindow = !$scope.showCAIWindow;
        if ($scope.showCAIWindow) {
            $ngRedux.dispatch(layout.setEast({ open: true }));
            Layout.resetHorizontalSplits();
            angular.element('curriculum').hide();
            angular.element('div[caiwindow]').show();
            document.getElementById('caiButton').classList.remove('flashNavButton');
            $ngRedux.dispatch(cai.autoScrollCAI());
        } else {
            angular.element('div[caiwindow]').hide();
            angular.element('curriculum').show();
        }
    };

    // If in CAI study mode, switch to active CAI view.
    if (FLAGS.SHOW_CAI) {
        $ngRedux.dispatch(layout.setEast({ open: true }));
        Layout.resetHorizontalSplits();
        angular.element('curriculum').hide();
        angular.element('div[caiwindow]').show();
    }

    // Note: Used in api_doc links to the curriculum Effects chapter.
    $scope.loadCurriculumChapter = location => {
        if ($scope.showCAIWindow) {
            $scope.toggleCAIWindow();
        }
        $ngRedux.dispatch(curriculum.fetchContent({ location: location.split('-') }));

        if (FLAGS.SHOW_CAI) {
            // Note: delay $scope.$apply() to update the angular CAI Window.
            $setTimeout(function() {
                $scope.$apply();
            }, 100);
        }
    };

    $scope.closeAllTabs = () => {
        $confirm({text: ESMessages.idecontroller.closealltabs, ok: "Close All"}).then(() => {
            const promises = userProject.saveAll();
            $q.all(promises).then(() => {
                userNotification.show(ESMessages.user.allscriptscloud);
                $ngRedux.dispatch(tabs.closeAllTabs());
            }).catch(() => userNotification.show(ESMessages.idecontroller.saveallfailed, 'failure1'));

            $scope.$applyAsync();
        });
    };

    // TODO: Remove this.
    $scope.$on('createScript', () => {
        $ngRedux.dispatch(scripts.syncToNgUserProject());
    });

    $scope.$on('recommenderScript', (event, script) => {
        if (script) {
            let input = recommender.addRecInput([], script);
            let res = [];
            if (input.length === 0) {
                const filteredScripts = Object.values(scripts.selectFilteredActiveScriptEntities($ngRedux.getState()));
                if (filteredScripts.length) {
                    const lim = Math.min(5, filteredScripts.length);

                    for (let i = 0; i < lim; i++) {
                        input = recommender.addRecInput(input, filteredScripts[i]);
                    }
                }
            }
            [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(v => {
                res = recommender.recommend(res, input, ...v);
            });
            $ngRedux.dispatch(recommenderState.setRecommendations(res));
        }
    });

    $scope.$on('reloadRecommendations', () => {
        const activeTabID = tabs.selectActiveTabID($ngRedux.getState());

        // Get the modified / unsaved script.
        let script = null;
        if (activeTabID in userProject.scripts) {
            script = userProject.scripts[activeTabID];
        } else if (activeTabID in userProject.sharedScripts) {
            script = userProject.sharedScripts[activeTabID];
        }
        script && $rootScope.$broadcast('recommenderScript', script);
    });

    $scope.$on('language', (event, language) => {
        $ngRedux.dispatch(appState.setScriptLanguage(language));
    })

    $scope.$on('fontSizeChanged', (event, val) => $ngRedux.dispatch(appState.setFontSize(val)))

    $scope.$on('newCAIMessage', () => {
        if (FLAGS.SHOW_CAI && !$scope.showCAIWindow) {
            document.getElementById('caiButton').classList.add('flashNavButton');
        }
    });
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

/**
 * Filter for calculating last modified time unit (previously in scriptBrowserController)
 */
app.filter('formatTimer', function () {
    return function (input) {
        return ESUtils.formatTimer(input)
    }
});
