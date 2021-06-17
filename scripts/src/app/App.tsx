import * as appState from '../app/appState';
import * as audioLibrary from '../app/audiolibrary'
import * as collaboration from './collaboration'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as helpers from '../helpers'
import { openShare } from './IDE'
import * as user from '../user/userState';
import reporter from './reporter';
import * as scripts from '../browser/scriptsState';
import * as sounds from '../browser/soundsState';
import store from '../reducers';
import * as recommenderState from '../browser/recommenderState';
import * as bubble from '../bubble/bubbleState';
import * as tabs from '../editor/tabState';
import * as curriculum from '../browser/curriculumState';
import * as layout from '../layout/layoutState';
import * as Layout from '../layout/Layout';
import * as cai from '../cai/caiState';
import * as recommender from './recommender';
import * as userNotification from './userNotification';
import * as userProject from './userProject';
import i18n from "i18next";
import { ScriptEntity, SoundEntity } from 'common';

export function changePassword() {
    helpers.getNgService("$uibModal").open({ component: 'changepasswordController' })
}

export function renameSound(sound: SoundEntity) {
    helpers.getNgService("$uibModal").open({
        component: "renameSoundController",
        size: "sm",
        resolve: { sound() { return sound } }
    })
}

export function renameScript(script: ScriptEntity) {
    // userProject, etc. will try to mutate the immutable redux script  state.
    const scriptCopy = Object.assign({}, script);

    const modal = helpers.getNgService("$uibModal").open({
        component: 'renameController',
        size: 100,
        resolve: { script() { return scriptCopy } }
    })

    modal.result.then(async (newScript: ScriptEntity | null) => {
        if (!newScript) return;
        await userProject.renameScript(scriptCopy.shareid, newScript.name);
        store.dispatch(scripts.syncToNgUserProject());
        reporter.renameScript();
    });
};

export function downloadScript(script: ScriptEntity) {
    helpers.getNgService("$uibModal").open({
        component: 'downloadController',
        resolve: {
            script() { return script; },
            quality() { return 0; }
        }
    });
};

export async function openScriptHistory(script: ScriptEntity, allowRevert: boolean) {
    await userProject.saveScript(script.name, script.source_code);
    store.dispatch(tabs.removeModifiedScript(script.shareid));
    helpers.getNgService("$uibModal").open({
        component: 'scriptVersionController',
        size: 'lg',
        resolve: {
            script() { return script; },
            allowRevert: allowRevert
        }
    });
    reporter.openHistory();
};

export function openCodeIndicator(script: ScriptEntity) {
    helpers.getNgService("$uibModal").open({
        component: 'analyzeScriptController',
        size: 100,
        resolve: {
            script() { return script; }
        }
    });
}

export function deleteScript(script: ScriptEntity) {
    (helpers.getNgService("$confirm") as any)({
        text: "Deleted scripts disappear from Scripts list and can be restored from the list of 'deleted scripts'.",
        ok: "Delete"
    }).then(async () => {
        if (script.shareid === collaboration.scriptID && collaboration.active) {
            collaboration.closeScript(script.shareid);
        }
        await userProject.saveScript(script.name, script.source_code);
        await userProject.deleteScript(script.shareid);
        reporter.deleteScript();

        store.dispatch(scripts.syncToNgUserProject());
        store.dispatch(tabs.closeDeletedScript(script.shareid));
        store.dispatch(tabs.removeModifiedScript(script.shareid));
    });
}

export function deleteSharedScript(script: ScriptEntity) {
    if (script.collaborative) {
        (helpers.getNgService("$confirm") as any)({text: 'Do you want to leave the collaboration on "' + script.name + '"?', ok: 'Leave'}).then(() => {
            if (script.shareid === collaboration.scriptID && collaboration.active) {
                collaboration.closeScript(script.shareid);
                userProject.closeSharedScript(script.shareid);
            }
            // Apply state change first
            delete userProject.sharedScripts[script.shareid];
            store.dispatch(scripts.syncToNgUserProject());
            store.dispatch(tabs.closeDeletedScript(script.shareid));
            store.dispatch(tabs.removeModifiedScript(script.shareid));
            // userProject.getSharedScripts in this routine is not synchronous to websocket:leaveCollaboration
            collaboration.leaveCollaboration(script.shareid, userProject.getUsername(), false);
        })
    } else {
        (helpers.getNgService("$confirm") as any)({text: "Are you sure you want to delete the shared script '"+script.name+"'?", ok: "Delete"}).then(() => {
            userProject.deleteSharedScript(script.shareid).then(() => {
                store.dispatch(scripts.syncToNgUserProject());
                store.dispatch(tabs.closeDeletedScript(script.shareid));
                store.dispatch(tabs.removeModifiedScript(script.shareid));
            });
        });
    }
}

export async function submitToCompetition(script: ScriptEntity) {
    await userProject.saveScript(script.name, script.source_code);
    store.dispatch(tabs.removeModifiedScript(script.shareid));
    const shareID = await userProject.getLockedSharedScriptId(script.shareid);
    helpers.getNgService("$uibModal").open({
        component: 'submitCompetitionController',
        size: 'lg',
        resolve: {
            name() { return script.name; },
            shareID() { return shareID; },
        }
    });
}

export async function importScript(script: ScriptEntity) {
    if (!script) {
        script = tabs.selectActiveTabScript(store.getState());
    }

    const imported = await userProject.importScript(Object.assign({},script));
    await userProject.refreshCodeBrowser();
    store.dispatch(scripts.syncToNgUserProject());

    const openTabs = tabs.selectOpenTabs(store.getState());
    store.dispatch(tabs.closeTab(script.shareid));

    if (openTabs.includes(script.shareid)) {
        store.dispatch(tabs.setActiveTabAndEditor(imported.shareid));
        userProject.openScript(imported.shareid);
    }
}

export function deleteSound(sound: SoundEntity) {
    (helpers.getNgService("$confirm") as any)({text: "Do you really want to delete sound " + sound.file_key + "?", ok: "Delete"}).then(() => {
        userProject.deleteAudio(sound.file_key).then(() => {
            store.dispatch(sounds.deleteLocalUserSound(sound.file_key));
            audioLibrary.clearAudioTagCache();
        });
    });
}

export const mainController = function ($scope: any, $ngRedux: any) {
    $ngRedux.connect((state: any) => ({ ...state.bubble }))((state: any) => {
        $scope.bubble = state;
    });

    $ngRedux.connect((state: any) => ({ language: state.app.scriptLanguage }))(({ language }: { language: string }) => $scope.dispLang = language)

    store.dispatch(sounds.getDefaultSounds());
    if (FLAGS.SHOW_FEATURED_SOUNDS) {
        store.dispatch(sounds.setFeaturedSoundVisibility(true));
    }
    if (FLAGS.FEATURED_ARTISTS && FLAGS.FEATURED_ARTISTS.length) {
        store.dispatch(sounds.setFeaturedArtists(FLAGS.FEATURED_ARTISTS));
    }

    $scope.forgotPass = () => {
        helpers.getNgService("$uibModal").open({ component: 'forgotpasswordController' });
    };
    
    $scope.reportError = () => helpers.getNgService("$uibModal").open({ component: "errorController" });
    
    $scope.openUploadWindow = () => {
        if (userProject.isLoggedIn()) {
            helpers.getNgService("$uibModal").open({ component: 'uploadSoundController' })
        } else {
            userNotification.show(i18n.t('messages:general.unauthenticated'), 'failure1')
        }
    };
    
    $scope.getNumUnread = () => {
        return userNotification.history.filter(function (v) { return v && (v.unread || v.notification_type === 'broadcast'); }).length;
    };
    
    $scope.setFontSize = (fontSize: number) => {
        store.dispatch(appState.setFontSize(fontSize));
    };
    
    $scope.toggleColorTheme = () => {
        store.dispatch(appState.toggleColorTheme());
        reporter.toggleColorTheme();
    };
    
    $scope.resumeQuickTour = () => {
        store.dispatch(bubble.reset());
        store.dispatch(bubble.resume());
    };

    $scope.loggedIn = false;
    $scope.showIDE = true;
    $scope.showAll = false;
    $scope.colorTheme = store.getState().app.colorTheme;
    $scope.hljsTheme = 'monokai-sublime';
    $scope.selectedFont = 14;
    $scope.enableChat = false; // Chat window toggle button. Hidden by default.
    $scope.showChatWindow = false;

    // CAI visibility
    $scope.showCAIWindow = FLAGS.SHOW_CAI;

    // TEMPORARY FOR AWS CONTEST TESTING
    $scope.showAmazon = FLAGS.SHOW_AMAZON;
    $scope.showAmazonSounds = FLAGS.SHOW_AMAZON_SOUNDS;
    $scope.showAmazonBanner = FLAGS.SHOW_AMAZON_BANNER;

    // TEMPORARY FOR I18N DEVELOPMENT
    $scope.showLocaleSwitcher = FLAGS.SHOW_LOCALE_SWITCHER;

    // User data
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

    $scope.isEmbedded = ESUtils.getURLParameter("embedded") === "true"
    $scope.hideDAW = $scope.isEmbedded && ESUtils.getURLParameter("hideDaw")
    $scope.hideEditor = $scope.isEmbedded && ESUtils.getURLParameter("hideCode")

    if ($scope.isEmbedded) {
        store.dispatch(appState.setColorTheme("light"))
        store.dispatch(appState.setEmbedMode(true));
        Layout.destroy();
        layout.setMinSize(0);

        if ($scope.hideEditor) {
            layout.setGutterSize(0);
        }
        Layout.initialize();
        store.dispatch(layout.collapseWest());
        store.dispatch(layout.collapseEast());
        store.dispatch(layout.collapseSouth());

        if ($scope.hideEditor) {
            // Note: hideDAW-only currently does not fit the layout height to the DAW player height as the below API only supports ratios.
            store.dispatch(layout.setNorthFromRatio([100,0,0]));
        } else {
            store.dispatch(layout.setNorthFromRatio([25,75,0]));
        }
    } else {
        userProject.loadLocalScripts();
        store.dispatch(scripts.syncToNgUserProject());
    }

    if ($scope.hideDAW) {
        store.dispatch(appState.setHideDAW(true));
    }

    if ($scope.hideEditor) {
        store.dispatch(appState.setHideEditor(true));
    }

    $scope.scripts = [];

    // these should be populated from somewhere else and not hard-coded, most likely
    $scope.fontSizes = [{'size': 10}, {'size': 12}, {'size': 14}, {'size': 18}, {'size': 24}, {'size': 36}];

    $scope.login = function () {
        esconsole('Logging in', ['DEBUG','MAIN']);

        //save all unsaved open scripts (don't need no promises)
        userProject.saveAll();

        return userProject.getUserInfo($scope.username, $scope.password).then(function (userInfo) {
            // userInfo !== undefined if user exists.
            if (userInfo) {
                store.dispatch(user.login({
                    username: $scope.username,
                    password: $scope.password
                }));

                store.dispatch(sounds.getUserSounds($scope.username));
                store.dispatch(sounds.getFavorites({
                    username: $scope.username,
                    password: $scope.password
                }));

                // Always override with the returned username in case the letter cases mismatch.
                $scope.username = userInfo.username;

                // get user role (can verify the admin / teacher role here?)
                if (userInfo.hasOwnProperty('role')) {
                    $scope.userrole = userInfo.role;

                    if (userInfo.role === 'teacher') {
                        if (userInfo.firstname === '' || userInfo.lastname === '' || userInfo.email === '') {
                            userNotification.show(i18n.t('messages:user.teachersLink'), 'editProfile');
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

                    store.dispatch(scripts.syncToNgUserProject());

                    var url = location.href;
                    var competitionMode = url.includes('competition');
                    if (competitionMode) {
                        $scope.showAmazon = true;
                        $scope.showAmazonSounds = true;
                        $scope.showAmazonBanner = true;
                    }

                    // show alert
                    if (!$scope.loggedIn) {
                        $scope.loggedIn = true;

                        // TODO: "login success" message to be shown only when re-logged in with sounds already loaded (after splash screen).
                        // the initial login message is taken care in the sound browser controller
                        userNotification.show(i18n.t('messages:general.loginsuccess'), 'normal', 0.5);

                        $scope.loggedInUserName = $scope.username;

                        const activeTabID = tabs.selectActiveTabID(store.getState());
                        activeTabID && store.dispatch(tabs.setActiveTabAndEditor(activeTabID));
                    }
                });
            } else {

            }
        }).catch(error => {
            userNotification.show(i18n.t('messages:general.loginfailure'), 'failure1',  3.5);
            esconsole(error, ['main','login']);
        });
    };

    $scope.logout = function () {
        store.dispatch(user.logout());
        store.dispatch(sounds.resetUserSounds());
        store.dispatch(sounds.resetFavorites());
        store.dispatch(sounds.resetAllFilters());

        // save all unsaved open scripts
        userProject.saveAll().then(function () {
            if (userProject.openScripts.length > 0) {
                userNotification.show(i18n.t('messages:user.allscriptscloud'));
            }

            const activeTabID = tabs.selectActiveTabID(store.getState());
            if (activeTabID) {
                const allScriptEntities = scripts.selectAllScriptEntities(store.getState());
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

            store.dispatch(scripts.syncToNgUserProject());
            store.dispatch(scripts.resetReadOnlyScripts());
            store.dispatch(tabs.resetTabs());
            store.dispatch(tabs.resetModifiedScripts());
        }).catch(function (err) {
            (helpers.getNgService("$confirm") as any)({text: i18n.t('messages:idecontroller.saveallfailed'),
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

        // User data
        $scope.firstname = '';
        $scope.lastname = '';
        $scope.email = '';
        $scope.userrole = 'student';
        $scope.loggedInUserName = ' '; // this is shown in the top right corner -- it cannot be initialized with an empty string '' as ngModel doesn't seem to like it

    };

    // attempt to load userdata from a previous session
    if (userProject.isLoggedIn()) {
        var userStore = userProject.loadUser();
        $scope.username = userStore.username;
        $scope.password = userStore.password;

        $scope.login().catch((error: Error) => {
            if (window.confirm('We are unable to automatically log you back in to EarSketch. Press OK to reload this page and log in again.')) {
                localStorage.clear();
                window.location.reload();
                esconsole(error, ['ERROR']);
                reporter.exception('Auto-login failed. Clearing localStorage.');
            }
        });
    } else {
        store.dispatch(scripts.syncToNgUserProject());
                                  

        const openTabs = tabs.selectOpenTabs(store.getState());
        const allScripts = scripts.selectAllScriptEntities(store.getState());
        openTabs.forEach(scriptID => {
            if (!allScripts.hasOwnProperty(scriptID)) {
                store.dispatch(tabs.closeAndSwitchTab(scriptID));
            }
        });

        // Show bubble tutorial when not opening a share link or in a CAI study mode.
        if (!ESUtils.getURLParameter("sharing") && !FLAGS.SHOW_CAI) {
            store.dispatch(bubble.resume());
        }
    }


    $scope.createAccount = function () {
        helpers.getNgService("$uibModal").open({ component: 'accountController' }).result.then((result: any) => {
            if (!result) return
            $scope.username = result.username
            $scope.password = result.password
            $scope.login()
        })
    };

    $scope.editProfile = function () {
        $scope.showNotification = false;
        helpers.getNgService("$uibModal").open({
            component: 'editProfileController',
            resolve: {
                username() { return $scope.username },
                password() { return $scope.password },
                email() { return $scope.email },
                role() { return $scope.userrole },
                firstName() { return $scope.firstname },
                lastName() { return $scope.lastname },
            }
        }).result.then((result: any) => {
            if (result !== undefined) {
                $scope.firstname = result.firstName;
                $scope.lastname = result.lastName;
                $scope.email = result.email;
            }
        });
    };

    $scope.openAdminWindow = function () {
        helpers.getNgService("$uibModal").open({
            templateUrl: 'templates/admin-window.html',
            controller: 'adminwindowController',
            scope: $scope
        });
    };

    $scope.showNotification = false;
    $scope.notificationList = userNotification.history;
    $scope.showNotificationHistory = false;

    $scope.$on('notificationsUpdated', function () {
        $scope.notificationList = userNotification.history;
    });

    // This is for updating the currentTime for the date label.
    // TODO: find a way to do this with callback from the uib popover element
    $scope.$watch('showNotification', function (val: boolean) {
        if (val) {
            $scope.currentTime = Date.now();
        }
    });

    $scope.toggleNotificationHistory = function (bool: boolean) {
        $scope.showNotificationHistory = bool;
        if (bool) {
            $scope.showNotification = false;
        }
    };

    //=================================================
    // TODO: move these to an appropriate directive!

    $scope.readMessage = async function (index: number, item: any) {
        if (item.notification_type === 'broadcast' || userNotification.history[index].id === undefined) return
        try {
            await userProject.postAuthForm("/services/scripts/markread", { notification_id: userNotification.history[index].id! })
            userNotification.history[index].unread = false
            $scope.unreadMessages = userNotification.history.filter(v => v.unread).length
            $scope.notificationList = userNotification.history
        } catch (error) {
            esconsole(error, ['mainctrl', 'error'])
        }
    }

    $scope.markAllAsRead = function () {
        userNotification.history.forEach(function (item, index) {
            if (item.unread && item.notification_type !== 'broadcast') {
                // TODO: handle broadcast as well
                $scope.readMessage(index, item);
            }
        });
    };

    $scope.openSharedScript = function (shareid: string) {
        esconsole('opening a shared script: ' + shareid, 'main');
        openShare(shareid).then(() => store.dispatch(scripts.syncToNgUserProject()));
        $scope.showNotification = false;
        $scope.showNotificationHistory = false;
    };

    $scope.openCollaborativeScript = function (shareID: string) {
        if (userProject.sharedScripts[shareID] && userProject.sharedScripts[shareID].collaborative) {
            $scope.openSharedScript(shareID);
            // collaboration.openScript(userProject.sharedScripts[shareID], userProject.getUsername());
            store.dispatch(tabs.setActiveTabAndEditor(shareID));
        } else {
            $scope.showNotification = false;
            userNotification.show('Error opening the collaborative script! You may no longer the access. Try refreshing the page and checking the shared scripts browser', 'failure1');
        }
    };

    $scope.currentTime = Date.now();

    //=================================================

    $ngRedux.connect((state: any) => ({ size: state.app.fontSize }))(({ size }: { size: number }) => $scope.selectedFont = size)

    $scope.enterKeySubmit = function (event: KeyboardEvent) {
        if (event.key === "Enter") {
            $scope.login();
        }
    };

    $ngRedux.connect((state: any) => ({ theme: state.app.colorTheme }))(({ theme }: { theme: string }) => {
        $scope.colorTheme = theme
        $scope.hljsTheme = theme === 'dark' ? 'monokai-sublime' : 'vs'
    })

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
        var url = location.href;
        var chatMode = url.includes('chat') || url.includes('tutor');
        if (chatMode) {
            $scope.enableChat = true;
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    try {
        var url = location.href;
        var competitionMode = url.includes('competition');
        if (competitionMode) {
            $scope.showAmazon = true;
            $scope.showAmazonSounds = true;
            $scope.showAmazonBanner = true;
        }
    } catch (error) {
        esconsole(error, ['main', 'url']);
    }

    $scope.licenses = {};
    userProject.getLicenses().then(licenses => {
        for (const license of Object.values(licenses)) {
            $scope.licenses[(license as any).id] = license
        }
    });

    $scope.shareScript = async (script: ScriptEntity) => {
        await userProject.saveScript(script.name, script.source_code);
        store.dispatch(tabs.removeModifiedScript(script.shareid));
        helpers.getNgService("$uibModal").open({
            component: 'shareScriptController',
            size: 'lg',
            resolve: {
                script() { return script; },
                quality() { return $scope.audioQuality; },
                licenses() { return $scope.licenses; }
            }
        });
    };
    
    $scope.toggleCAIWindow = () => {
        $scope.showCAIWindow = !$scope.showCAIWindow;
        if ($scope.showCAIWindow) {
            store.dispatch(layout.setEast({ open: true }));
            Layout.resetHorizontalSplits();
            document.getElementById('caiButton')!.classList.remove('flashNavButton');
            store.dispatch(cai.autoScrollCAI());
        }
    };

    // If in CAI study mode, switch to active CAI view.
    if (FLAGS.SHOW_CAI) {
        store.dispatch(layout.setEast({ open: true }));
        Layout.resetHorizontalSplits();
    }

    // Note: Used in api_doc links to the curriculum Effects chapter.
    $scope.loadCurriculumChapter = (location: string) => {
        if ($scope.showCAIWindow) {
            $scope.toggleCAIWindow();
        }
        store.dispatch(curriculum.fetchContent({ location: location.split('-') }));

        if (FLAGS.SHOW_CAI) {
            // Note: delay $scope.$apply() to update the angular CAI Window.
            window.setTimeout(() => {
                $scope.$apply();
            }, 100);
        }
    };

    $scope.closeAllTabs = () => {
        (helpers.getNgService("$confirm") as any)({text: i18n.t('messages:idecontroller.closealltabs'), ok: "Close All"}).then(() => {
            userProject.saveAll().then(() => {
                userNotification.show(i18n.t('messages:user.allscriptscloud'));
                store.dispatch(tabs.closeAllTabs());
            }).catch(() => userNotification.show(i18n.t('messages:idecontroller.saveallfailed'), 'failure1'));

            $scope.$applyAsync();
        });
    };

    $scope.$on('reloadRecommendations', () => {
        const activeTabID = tabs.selectActiveTabID(store.getState())!

        // Get the modified / unsaved script.
        let script = null;
        if (activeTabID in userProject.scripts) {
            script = userProject.scripts[activeTabID];
        } else if (activeTabID in userProject.sharedScripts) {
            script = userProject.sharedScripts[activeTabID];
        }
        if (!script) return
        let input = recommender.addRecInput([], script);
        let res = [] as any[];
        if (input.length === 0) {
            const filteredScripts = Object.values(scripts.selectFilteredActiveScriptEntities(store.getState()));
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
        store.dispatch(recommenderState.setRecommendations(res));
    });

    $scope.$on('newCAIMessage', () => {
        if (FLAGS.SHOW_CAI && !$scope.showCAIWindow) {
            document.getElementById('caiButton')!.classList.add('flashNavButton');
        }
    });
}