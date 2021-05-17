import xml2js from 'xml2js';
import * as appState from '../appState';
import esconsole from '../../esconsole';
import * as ESUtils from '../../esutils';
import * as scriptsState from '../../browser/scriptsState';
import * as tabs from '../../editor/tabState';

app.factory('userProject', ['$rootScope', '$http', '$window', 'userNotification', '$q', 'localStorage', '$uibModal', 'audioLibrary','reporter', 'websocket', 'collaboration', '$ngRedux', function ($rootScope, $http, $window, userNotification, $q, localStorage, $uibModal, audioLibrary, reporter, websocket, collaboration, $ngRedux) {
    var self = {};

    var WSURLDOMAIN = URL_DOMAIN;
    var USER_STATE_KEY = 'userstate';

    var LS_TABS_KEY = 'tabs_v2';
    var LS_SHARED_TABS_KEY = 'shared_tabs_v1';
    var LS_SCRIPTS_KEY = 'scripts_v1';

    var STATUS_UNKNOWN = 0;
    var STATUS_SUCCESSFUL = 1;
    var STATUS_UNSUCCESSFUL = 2;
    var shareid = "";
    var errorLoadingSharedScript = false;

    // notification IDs
    var notificationsMarkedAsRead = [];

    var TEMPLATES = {
        python: '#\t\tpython code\n#\t\tscript_name:\n#\n'
        + '#\t\tauthor:\n#\t\tdescription:\n#\n\n'
        + 'from earsketch import *\n\n'
        + 'init()\n'
        + 'setTempo(120)\n\n\n\n'
        + 'finish()\n',

        javascript: '"use strict";\n\n'
        + '//\t\tjavascript code\n//\t\tscript_name:\n//'
        + '\n//\t\tauthor:\n//\t\tdescription:\n//\n\n'
        + 'init();\n'
        + 'setTempo(120);\n\n\n\n'
        + 'finish();\n'
    };

    // keep a mapping of script names: script objects
    var scripts = {};
    var sharedScripts = {};
    var sharedScriptsReady = false;

    // keep a list of script names that are currently open
    var openScripts = [];
    var openSharedScripts = [];

    // websocket gets closed before onunload in FF
    $window.onbeforeunload = function (e) {
        if (isLogged()) {
            let saving = false;
            const username = getUsername();
            const password = getPassword();
            const saveScriptURL = URL_DOMAIN + '/services/scripts/save'
                +'?username='+username+'&password='+encodeURIComponent(btoa(password));

            openScripts.forEach(function (shareID) {
                if (scripts[shareID] && scripts[shareID].collaborative) {
                    collaboration.leaveSession(shareID, username);
                }

                if (scripts[shareID] && !scripts[shareID].saved) {
                    saving = true;
                    const sourcecode = scripts[shareID].source_code;
                    const name = scripts[shareID].name;
                    const body = '<scripts><username>' + getUsername() + '</username>'
                        + '<name>' + name + '</name>'
                        + '<source_code><![CDATA[' + sourcecode + ']]></source_code></scripts>';

                    // const headers = { type: 'application/xml;charset=UTF-8' };
                    // const blob = new Blob([JSON.stringify(body)], headers);
                    // const res = navigator.sendBeacon(saveScriptURL, blob);

                    fetch(saveScriptURL, {
                        method: 'POST',
                        headers: new Headers({ 'Content-Type': 'application/xml' }),
                        body
                    })
                        .then(response => response.text())
                        .then(xml => xml2js.parseStringPromise(xml, { explicitArray: false }))
                        .then(data => {
                            const script = data.scripts;
                            script.modified = Date.now();
                            script.saved = true;
                            script.tooltipText = '';
                            postProcessCollaborators(script);
                            scripts[script.shareid] = script;
                            $ngRedux.dispatch(scriptsState.syncToNgUserProject());
                            userNotification.show(ESMessages.user.scriptcloud, 'success');
                        });
                }
            });

            openSharedScripts.forEach(function (shareID) {
                if (sharedScripts[shareID] && sharedScripts[shareID].collaborative) {
                    collaboration.leaveSession(shareID, username);
                }
            });

            // TODO: may not be properly working... check!
            if (notificationsMarkedAsRead.length !== 0) {
                var url = URL_DOMAIN + '/services/scripts/markread';
                var opts = {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                };

                notificationsMarkedAsRead.forEach(function (notificationID) {
                    esconsole('marking notification ' + notificationID + ' as read', 'user');
                    var body = new FormData();
                    body.append('username', username);
                    body.append('password', getEncodedPassword());
                    body.append('notification_id', notificationID);
                    $http.post(url, body, opts);
                });
            }

            if (saving) {
                return true; // Show warning popover.
            }
        } else {
            if (localStorage.checkKey(LS_SCRIPTS_KEY)) {
                localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
            }
        }
    };

    $window.onfocus = function() {
        var t = Date.now();
        $rootScope.$broadcast('userOnPage',t);
        // console.log("on page");
    };

    $window.onblur = function() {
        var t = Date.now();
        $rootScope.$broadcast('userOffPage',t);
        // console.log("off page");        
    };

    var mouse_x;
    var mouse_y;
    $window.addEventListener('mousemove', function (e) {
        mouse_x = e.x;
        mouse_y = e.y;
    });   

    $window.setInterval(function() {
            $rootScope.$broadcast("mousePosition",mouse_x, mouse_y);
            // console.log('x', e.x,'y', e.y); 
            clearInterval();
        }, 5000);

    function loadLocalScripts() {
        // Load scripts from local storage if they are available. When a user logs
        // in these scripts will be saved to the web service and deleted from local
        // storage.
        if (localStorage.checkKey(LS_SCRIPTS_KEY)) {
            scripts = Object.assign(scripts, JSON.parse(localStorage.get(LS_SCRIPTS_KEY)));
            $ngRedux.dispatch(scriptsState.syncToNgUserProject());

            if (localStorage.checkKey(LS_TABS_KEY)) {
                const storedTabs = JSON.parse(localStorage.get(LS_TABS_KEY));
                if (storedTabs) {
                    storedTabs.forEach(tab => {
                        openScripts.push(tab);
                        $ngRedux.dispatch(tabs.setActiveTabAndEditor(tab));
                    });
                }
            }

            if (localStorage.checkKey(LS_SHARED_TABS_KEY)) {
                const storedTabs = JSON.parse(localStorage.get(LS_SHARED_TABS_KEY));
                if (storedTabs) {
                    storedTabs.forEach(tab => {
                        openSharedScripts.push(tab);
                        $ngRedux.dispatch(tabs.setActiveTabAndEditor(tab));
                    });
                }
            }
        }
    }
    /**
     * Because scripts and openScripts are objects and we can't reset them
     * simply by re-instantiating empty objects, we use resetScripts() to
     * clear them manually. This is necessary due to controllers watching these
     * variables passed by reference. If we orphan those references, the
     * controllers won't update properly anymore.
     */
    function resetScripts() {
        for (var key in scripts) {
            delete scripts[key];
        }
    }

    function resetSharedScripts() {
        sharedScriptsReady = false;

        for (var key in sharedScripts) {
            delete sharedScripts[key];
        }
    }

    function resetOpenScripts() {
        while (openScripts.length > 0) {
            var popped = openScripts.pop();

            // special case for collaborative script. TODO: manage this in the tabs service.
            if (scripts.hasOwnProperty(popped) && scripts[popped].collaborative) {
                collaboration.closeScript(popped, getUsername());
            }
        }
    }

    function resetSharedOpenScripts() {
        while (openSharedScripts.length > 0) {
            openSharedScripts.pop();
        }
    }

    /**
     * The script content from server may need adjustment in the collaborators parameter.
     * @param script
     * @param userName
     * @returns {*}
     */
    function postProcessCollaborators(script, userName) {
        if (typeof(script.collaborators) === 'undefined') {
            script.collaborators = [];
        } else if (typeof(script.collaborators) === 'string') {
            script.collaborators = [script.collaborators];
        }

        // #1858: Disabling this will now load all the collaborators for each script in whatever the letter cases recorded in DB. (Often all in lower cases, but should be in correct cases after 2019/12.)
        // script.collaborators = script.collaborators.map(function (username) {
        //     return username.toLowerCase();
        // });

        if (userName) {
            // for shared-script browser: treat script as collaborative only when the user is listed among collaborators
            // #1858: List of collaborators may be recorded in mixed case (inconsistently).
            if (script.collaborators.length !== 0 &&
                script.collaborators.map(function (user) {
                    return user.toLowerCase();
                }).indexOf(getUsername().toLowerCase()) !== -1) {
                script.collaborative = true;
                script.readonly = false;
            } else {
                script.collaborative = false;
                script.readonly = true;
            }
        } else {
            // for regular script browser
            script.collaborative = script.collaborators.length !== 0;
        }

        return script;
    }

    /**
     * Get a user scripts, authenticating via username and password. Returns
     * a promise that resolves to a list of user script objects.
     *
     * @param {string} username The username to fetch scripts for
     * @param {string} password The user's password used for authentication.
     * @returns {Promise} A promise that resolves to the list of user scripts
     * objects.
     */
    function login(username, password) {
        esconsole('Using username: ' + username, ['DEBUG', 'USER']);

        //=================================================
        // register callbacks to the collaboration service
        collaboration.refreshScriptBrowser = refreshCodeBrowser;
        
        collaboration.refreshSharedScriptBrowser = function () {
            // TODO: potential race condition with server-side script renaming operation?
            return getSharedScripts(username, password);
        };

        collaboration.closeSharedScriptIfOpen = closeSharedScript;

        //=================================================
        // register callbacks / member values in the userNotification service
        userNotification.addSharedScript = addSharedScript;
        userNotification.setUserName(username);

        //=================================================

        var url = WSURLDOMAIN + '/services/scripts/findall';
        // TODO: base64 encoding is not a secure way to send password
        var payload = new FormData();
        payload.append('username', username);
        payload.append('password', btoa(password));
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        return $http.post(url, payload, opts).then(function(result) {
            // esconsole(result, ['debug', 'user']);
            reporter.login(username);

            // persist the user session
            storeUser(username, password);

            websocket.connect(username);
            collaboration.setUserName(username);

            // used for managing websocket notifications locally
            userNotification.setLoginTime = new Date();

            esconsole(ESMessages.user.scriptsuccess, ['DEBUG', 'USER']);

            var storedScripts;

            if (result.data) {
                if (result.data.scripts instanceof Array) {
                    storedScripts = result.data.scripts;
                } else {
                    // one script -- somehow this gets parsed to one object
                    storedScripts = [result.data.scripts];
                }
            }

            resetScripts();

            // update user project scripts
            for (var i in storedScripts) {
                var script = storedScripts[i];
                // reformat saved date to ISO 8601 format
                // TODO: moment.js would allow us to format arbitrary date strings
                // alternatively, dates should be stored in the database
                // formatted in ISO 8601
                var isoFormat = script.modified.slice(0,-2).replace(' ','T');
                var offset = new Date().getTimezoneOffset();
                // javascript Date.parse() requires ISO 8601
                script.modified = Date.parse(isoFormat) + offset * 60000;
                scripts[script.shareid] = script;
                // set this flag to false when the script gets modified
                // then set it to true when the script gets saved
                script.saved = true;
                script.tooltipText = "";

                script = postProcessCollaborators(script);
            }

            // when the user logs in and his/her scripts are loaded, we can restore
            // their previous tab session stored in the browser's local storage
            const embedMode = appState.selectEmbedMode($ngRedux.getState());
            if (!embedMode) {
                if (localStorage.checkKey(LS_TABS_KEY)) {
                    const opened = JSON.parse(localStorage.get(LS_TABS_KEY));

                    for (let i in opened) {
                        if (opened.hasOwnProperty(i)) {
                            openScripts.push(opened[i]);
                        }
                    }
                }
                if (localStorage.checkKey(LS_SHARED_TABS_KEY)) {
                    const opened = JSON.parse(localStorage.get(LS_SHARED_TABS_KEY));

                    for (let i in opened) {
                        if (opened.hasOwnProperty(i)) {
                            openSharedScripts.push(opened[i]);
                        }
                    }
                }
                const activeTabID = tabs.selectActiveTabID($ngRedux.getState());
                if (activeTabID) {
                    $ngRedux.dispatch(tabs.setActiveTabAndEditor(activeTabID));
                }
            }

            // Clear Recommendations in Sound Browser
            $rootScope.$broadcast('clearRecommender');

            // Close CAI
            $rootScope.$broadcast('caiClose');

            // Copy scripts local storage to the web service.
            if (localStorage.checkKey(LS_SCRIPTS_KEY)) {
                var saved = JSON.parse(localStorage.get(LS_SCRIPTS_KEY));

                var promises = [];
                for (var i in saved) {
                    if (saved.hasOwnProperty(i) && !saved[i].soft_delete) {
                        if (saved[i].hasOwnProperty('creator') && (saved[i].creator !== username)) {
                            if(saved[i].hasOwnProperty('original_id')) {
                                promises.push(importSharedScript(saved[i].original_id));
                            }
                        } else {
                            // promises.push(saveScript(saved[i].name, saved[i].source_code, false));
                            const tabEditorSession = tabs.getEditorSession(saved[i].shareid);
                            if(tabEditorSession) {
                                promises.push(saveScript(saved[i].name, tabs.getEditorSession(saved[i].shareid).getValue(), false));
                            }
                        }
                    }
                }

                resetOpenScripts();
                $ngRedux.dispatch(tabs.resetTabs());

                return $q.all(promises).then(function (savedScripts) {
                    localStorage.remove(LS_SCRIPTS_KEY);
                    localStorage.remove(LS_TABS_KEY);
                    localStorage.remove(LS_SHARED_TABS_KEY);

                    return refreshCodeBrowser().then(function () {
                        // once all scripts have been saved open them
                        angular.forEach(savedScripts, function(savedScript) {
                            if(savedScript) {
                                openScript(savedScript.shareid);
                                $ngRedux.dispatch(tabs.setActiveTabAndEditor(savedScript.shareid));
                            }
                        });
                    });
                }).then(() => getSharedScripts(username, password));
            } else {
                // load scripts in shared browser
                return getSharedScripts(username, password);
            }
        }, function(err) {
            esconsole('Login failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']); // TODO: this shows as [object object]?
            throw err;
        });
    }

    function refreshCodeBrowser() {
        if (isLogged()) {
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/findall';
            var payload = new FormData();
            payload.append('username', username);
            payload.append('password', btoa(password));
            var opts = {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            };

            // TODO: base64 encoding is not a secure way to send password

            return $http.post(url, payload, opts).then(result => {
                let res;

                if (result.data) {
                    if (result.data.scripts instanceof Array) {
                        res = result.data.scripts;
                    } else {
                        // one script -- somehow this gets parsed to one object
                        res = [result.data.scripts];
                    }
                }

                resetScripts();

                for (var i in res) {
                    let script = res[i];
                    // reformat saved date to ISO 8601 format
                    // TODO: moment.js would allow us to format arbitrary date strings
                    // alternatively, dates should be stored in the database
                    // formatted in ISO 8601
                    var isoFormat = script.modified.slice(0,-2).replace(' ','T');
                    // javascript Date.parse() requires ISO 8601
                    script.modified = Date.parse(isoFormat);
                    // set this flag to false when the script gets modified
                    // then set it to true when the script gets saved
                    script.saved = true;
                    script.tooltipText = "";

                    scripts[script.shareid] = script;

                    script = postProcessCollaborators(script);
                }

            }, function(err) {
                console.log(err);
                esconsole('refreshCodeBrowser failure', ['DEBUG','ERROR']);
                esconsole(err.toString(), ['DEBUG','ERROR']);
                throw err;
            });
        } else {
            if (localStorage.checkKey(LS_SCRIPTS_KEY)) {
                var r = JSON.parse(localStorage.get(LS_SCRIPTS_KEY));
                resetScripts();
                for (var i in r) {
                    var script = r[i];
                    script.saved = true;
                    script.tooltipText = "";
                    script = postProcessCollaborators(script);
                    scripts[script.shareid] = script;
                }
            }
            return Promise.resolve();
        }
    }

    /**
     * Format a date to ISO 8601
     *
     * @param {string} date the date to format
     */
    function formatDateToISO(date){
        //Format created date to ISO 8601
         var isoFormat = date.slice(0,-2).replace(' ','T');
        // javascript Date.parse() requires ISO 8601
        return Date.parse(isoFormat);
    }

    /**
     * Get a script's history, authenticating via username and password. Returns
     * a promise that resolves to a list of user script's history objects.
     *
     * @param {string} scriptid the Script's id
     * @returns {Promise} A promise that resolves to the list of user scripts
     * objects.
     */
     function getScriptHistory(scriptid) {
        var userState = JSON.parse(localStorage.get(USER_STATE_KEY));
        var username = userState.username;
        var password = userState.password;

        esconsole('Getting script history: ' + scriptid, ['DEBUG', 'USER']);
        var url = WSURLDOMAIN + '/services/scripts/scripthistory';
        var payload = new FormData();
        payload.append('scriptid', scriptid);
        payload.append('username', username);
        payload.append('password', btoa(password));
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        return $http.post(url, payload, opts).then(function(result) {

            if (result.data === null) {
                // no scripts
                return [];
            } else if (result.data.scripts instanceof Array) {
                //Format created date to ISO 8601
                for(var i = 0; i< result.data.scripts.length; i++){
                    result.data.scripts[i].created = formatDateToISO(result.data.scripts[i].created);
                }
                var r = result.data.scripts;
            } else {
                // one script -- somehow this gets parsed to one object
                result.data.scripts.created = formatDateToISO(result.data.scripts.created);
                var r = [result.data.scripts];
            }

            return r

        }, function(err) {
            console.log(err);
            esconsole('Login failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;
        });
     }

     /**
     * Get a script's exact version, authenticating via username and password. Returns
     * a promise that resolves to a list of user script's history objects.
     *
     * @param {string} scriptid the Script's id
     * @param {string} versionid the Script's version id
     * @returns {Promise} A promise that resolves to the list of user scripts
     * objects.
     */
     function getScriptVersion(scriptid, versionid) {
         var userState = JSON.parse(localStorage.get(USER_STATE_KEY));
         var username = userState.username;
         var password = userState.password;

         esconsole('Getting script history: ' + scriptid + '  version: ' + versionid, ['DEBUG', 'USER']);
         var url = WSURLDOMAIN + '/services/scripts/scriptversion';
         var payload = new FormData();
         payload.append('scriptid', scriptid);
         // payload.append('scriptname', undefined);
         payload.append('username', username);
         payload.append('password', btoa(password));
         payload.append('versionid', versionid);
         var opts = {
             transformRequest: angular.identity,
             headers: {'Content-Type': undefined}
         };

         return $http.post(url, payload, opts).then(function (result) {
             if (result.data === null) {
                 // no scripts
                 return [];
             } else {
                 // one script -- somehow this gets parsed to one object
                 var r = [result.data];
             }

             return r;
         }, function (err) {
             console.log(err);
             esconsole('Login failure', ['DEBUG','ERROR']);
             esconsole(err.toString(), ['DEBUG','ERROR']);
             throw err;
         });
     }

     /**
     * Get shared scripts in the user account, authenticating via username and password. Returns
     * a promise that resolves to a list of user's shared script objects.
     *
     * @param {string} username The username to fetch scripts for
     * @param {string} password The user's password used for authentication.
     * @returns {Promise} A promise that resolves to the list of user's shared scripts
     * objects.
     */
     function getSharedScripts(username, password) {
         resetSharedScripts();

         var url = WSURLDOMAIN + '/services/scripts/getsharedscripts';
         var payload = new FormData();
         payload.append('username', username);
         payload.append('password', btoa(password));
         var opts = {
             transformRequest: angular.identity,
             headers: {'Content-Type': undefined}
         };

         return $http.post(url, payload, opts).then(function (result) {
             let res;

             if (result.data) {
                 if (result.data.scripts instanceof Array) {
                     res = result.data.scripts;
                 } else {
                     // one script -- somehow this gets parsed to one object
                     res = [result.data.scripts];
                 }
             }

             for (var i in res) {
                 var script = res[i];
                 script.isShared = true;
                 script = postProcessCollaborators(script, getUsername());
                 sharedScripts[script.shareid] = script;
             }

             sharedScriptsReady = true;
             return res;
         });
     }

     /**
     * Get shared id for locked version of latest script.
     *
     *
     * @param {string} username The username to fetch scripts for
     * @param {string} password The user's password used for authentication.
     * @returns {Promise} A promise that resolves to the list of user's shared scripts
     * objects.
     */
    function getLockedSharedScriptId(shareid){
        var url = WSURLDOMAIN + '/services/scripts/getlockedshareid';
        return $http.get(url, {
            params: {'shareid': shareid }
        }).then(function(result) {
            return result.data.shareid;
        }, function(err) {
            console.log(err);
        });
    }

    /**
     * send post request to server to mark a sound_file as a favorite
     *
     * @param {string} sound_key id of the sound file
     * @param {string} tags to check if the sound is owned by the user
     */
     function markFavoriteClip(sound_key, tags) {
        var userState = JSON.parse(localStorage.get(USER_STATE_KEY));
        var username = userState.username;
        var password = userState.password;

        esconsole('Adding sound to favourites: ' + sound_key, ['DEBUG', 'USER']);
        var url = WSURLDOMAIN + '/services/audio/addfavorite';

        var payload = new FormData();
        payload.append('username', username);
        payload.append('password', btoa(password));
        payload.append('audio_file_key', sound_key);
        payload.append('userowned', tags === username);
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        return $http.post(url, payload, opts).then(function(result) {

        }, function(err) {
            console.log(err);
            esconsole('Add favorite sound failed', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;
        });
     }

     /**
     * send post request to server to remove a sound_file from his favorites
     *
     * @param {string} sound_key id of the sound file
     * @param {string} tags to check if the sound is owned by the user
     */
     function unmarkFavoriteClip(sound_key, tags) {
        var userState = JSON.parse(localStorage.get(USER_STATE_KEY));
        var username = userState.username;
        var password = userState.password;

        esconsole('Removing sound from favourites: ' + sound_key, ['DEBUG', 'USER']);
        var url = WSURLDOMAIN + '/services/audio/removefavorite';

        var payload = new FormData();
        payload.append('username', username);
        payload.append('password', btoa(password));
        payload.append('audio_file_key', sound_key);
        payload.append('userowned', tags === username);
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        return $http.post(url, payload, opts).then(function(result) {

        }, function(err) {
            console.log(err);
            esconsole('Remove favorite sound failed', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;
        });
     }
     
     function getFavorites() {
        esconsole('Loading favorites', ['DEBUG', 'USER']);
        var url = WSURLDOMAIN + '/services/audio/getfavorites';

        var payload = new FormData();
        payload.append('username', getUsername());
        payload.append('password', getEncodedPassword());
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        return $http.post(url, payload, opts).then(function(result) {
            return result.data;
        }, function(err) {
            esconsole('Loading favorite sounds failed', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;
        });
     }

    /**
     * Save a username and password to local storage to persist between
     * sessions.
     *
     * @param {string} username The username to store.
     * @param {string} password The password to store with the username.
     */
    function storeUser(username, password) {
        var userState = {};
        userState.username = username;
        userState.password = password;

        localStorage.set(USER_STATE_KEY, JSON.stringify(userState));
    }

    /**
     * Get a username and password from local storage, if it exists.
     *
     * @returns {object} The user state object with the username and password.
     */
    function loadUser() {
        if (localStorage.checkKey(USER_STATE_KEY)){
            return JSON.parse(localStorage.get(USER_STATE_KEY));
        }
        return null;
    }

    /**
     * Delete a user saved to local storage. I.e., logout.
     */
    function clearUser() {
        // TODO: use tunnelled
        resetOpenScripts();
        resetSharedOpenScripts();
        resetScripts();
        resetSharedScripts();
        localStorage.clear();

        // Clear Recommendations in Sound Browser
        $rootScope.$broadcast('clearRecommender');

        // Close CAI
        $rootScope.$broadcast('caiClose');

        websocket.close();
    }

    /**
     * Check if a user is stored in local storage.
     */
    function isLogged() {
        var jsstate = localStorage.get(USER_STATE_KEY);
        return jsstate !== null;
    }

    /**
     * Get a username from local storage.
     *
     * @returns {string} The username stored in local storage.
     */
    function getUsername() {
        var jsstate = localStorage.get(USER_STATE_KEY);
        if (jsstate !== null){
            var userState = JSON.parse(jsstate);
            return userState.username;
        }
        return null;
    }

    /**
     * Set a users new password.
     *
     * @param {string} pass The new password to set.
     */
    function setPassword(pass) {
        if (isLogged()) {
            storeUser(getUsername(), pass);
        }
    }

    /**
     * Get the password from local storage.
     *
     * @returns {string} The password stored in local storage.
     */
    function getPassword() {
        var jsstate = localStorage.get(USER_STATE_KEY);
        if (jsstate !== null) {
            var userState = JSON.parse(jsstate);
            return userState.password;
        }
        return null;
    }

    /**
     * Get the base-64 encoded ASCII string password of the user.
     * @returns {string}
     */
    function getEncodedPassword() {
        return btoa(getPassword());
    }

    function shareWithPeople(shareid, users) {
        var data = {};
        data.notification_type = "sharewithpeople";
        data.username = getUsername();
        data.scriptid = shareid;
        data.users = users;

        if (!websocket.isOpen()) {
            websocket.connect(getUsername(), function () {
                websocket.send(data);
            });
        } else {
            websocket.send(data);
        }
    }
    

    /**
     * Get a script.
     *
     * @param {integer} id The script id to load.
     * @returns {Promise} The script
     */
    function loadScript(id, sharing) {

        //sharing is not used but the function doesn't work if it is not there. Why?
        var url = URL_DOMAIN + '/services/scripts/scriptbyid';
        var opts = { params: {'scriptid': id} };
        return $http.get(url, opts)
            .then(function(result) {
                if (sharing && result.data === '') {
                    var deferred = $q.defer();
                    deferred.reject("Script was not found.");

                    if (userNotification.isInLoadingScreen) {
                        self.errorLoadingSharedScript = true;
                    } else {
                        userNotification.show(ESMessages.user.badsharelink, 'failure1', 3);
                    }

                    return deferred.promise;
                }
                return result.data;
            }, function(err) {
                esconsole('Failure getting script id: '+id, ['DEBUG','ERROR']);
            });
    }

    /**
     * Deletes an audio key if owned by the user.
     *
     * @param {String} audiokey The key to delete.
     * @returns {Promise} A promise that resolves when the request completes.
     */
    function deleteAudio(audiokey) {
        esconsole('Calling Deleted audiokey: ' + audiokey, 'debug');
        var username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/audio/delete';
        if (password !== null) {
            var opts = {
                params: {
                    'username': username,
                    'password': btoa(password),
                    'audiokey': audiokey
                },
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            };
            var payload = {};
            return $http.post(url, payload, opts).then(function() {
                esconsole('Deleted audiokey: ' + audiokey, 'debug');
                audioLibrary.clearAudioTagCache(); // otherwise the deleted audio key is still usable by the user
            }).catch(function(err) {
                esconsole('Could not delete audiokey: ' + audiokey, 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    }

    /**
     * Rename an audio key if owned by the user.
     *
     * @param {string} audiokey The audio key to rename
     * @param {string} newaudiokey The new name for the audio key.
     * @returns {Promise} A promise that resolves when the request completes.
     */
    function renameAudio(audiokey, newaudiokey) {
        esconsole('Calling Deleted audiokey: ' + audiokey, 'debug');

        var username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/audio/rename';
        if (password !== null) {
            var opts = {
                params: {
                    'username': username,
                    'password': btoa(password),
                    'audiokey': audiokey,
                    'newaudiokey': newaudiokey
                },
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            };
            var payload = {};
            return $http.post(url, payload, opts).then(function() {
                esconsole('Successfully renamed audiokey: ' + audiokey + ' to ' + newaudiokey, 'debug');
                userNotification.show(ESMessages.general.soundrenamed, 'normal', 2);
                audioLibrary.clearAudioTagCache(); // otherwise audioLibrary.getUserAudioTags/getAllTags returns the list with old name
            }).catch(function(err) {
                esconsole('Could not rename audiokey: ' + audiokey + ' to ' + newaudiokey, 'debug');
                userNotification.show('Error renaming custom sound', 'failure1', 2);
                esconsole(err, ['ERROR']);
            });
        }
    }

    /**
     * Get a script license information from the back-end.
     */

    function getLicenses(){
        var url = WSURLDOMAIN + '/services/scripts/getlicenses';
        return $http.get(url).then(function(response){
            return response.data.licenses;
        })
    }


    /**
     * Get user info
     */

    function getUserInfo(username, password){
        if (!username) username = getUsername();
        if (!password) password = getPassword();
        var url = WSURLDOMAIN + '/services/scripts/getuserinfo';
        if (password !== null) {
            var payload = new FormData();
            payload.append('username', username);
            payload.append('password', btoa(password));
            var opts = {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            }
        }

        return $http.post(url, payload, opts).then(function(result) {
            esconsole('Get user info ' + ' for ' + username, 'debug');

            var user = {};
            user.username = result.data.username;
            user.email = result.data.email;
            if (result.data.first_name !== undefined)
                user.firstname = result.data.first_name;
            else
                user.firstname = "";

            if (result.data.last_name !== undefined)
                user.lastname = result.data.last_name;
            else
                user.lastname = "";

            if (result.data.role !== undefined)
                user.role = result.data.role;
            

            return user;
        });
    }

    /**
     * Set a script license id if owned by the user.
     *
     * @param {integer} scriptName Name of the shared script
     * @param {integer} licenseID The license id to give the script.
     */
    function setLicense(scriptName, scriptId, licenseID){
        if (isLogged()) {
            // user is logged in, make a request to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/setscriptlicense';
            if (password !== null) {
                var opts = {
                    params: {
                        'scriptname': scriptName,
                        'username': username,
                        'license_id': licenseID
                    },
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                };
                return $http.get(url, opts).then(function () {
                    esconsole('Set License Id ' + licenseID + ' to ' + scriptName, 'debug');
                    scripts[scriptId].license_id = licenseID;
                }).catch(function (err) {
                    esconsole('Could not set license id: ' + licenseID + ' to ' + scriptName, 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        }
    }

    /**
     * save a sharedscript into user's account.
     *
     * @param {integer} scriptid scriptid of the shared script
     * @param scriptname {string} The name of the script.
     * @param sourcecode {string} The script sourcecode.
     * @returns {Promise} A promise that resolves to the saved script.
     */

    function saveSharedScript(scriptid, scriptname, sourcecode, username){
        if (isLogged()) {
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/savesharedscript';
            if (password !== null) {
                var opts = {
                    params: {
                        'scriptid': scriptid,
                        'username': username,
                        'password': btoa(password)
                    },
                    headers: {'Content-Type': 'application/xml'}
                }
            }
            var payload={};
            return $http.post(url, payload, opts).then(function(result) {
                var shareid = result.data.shareid;

                esconsole('Save shared script ' + result.data.name + ' to ' + username, 'debug');

                sharedScripts[shareid] = result.data;

                sharedScripts[shareid].isShared = true;
                sharedScripts[shareid].readonly = true;
                sharedScripts[shareid].modified = Date.now();

                return sharedScripts[shareid];
            })
        } else {
            return new Promise(function(resolve, reject) {
                sharedScripts[scriptid] = {
                    'name': scriptname,
                    'shareid': scriptid,
                    'modified': Date.now(),
                    'source_code': sourcecode,
                    'isShared': true,
                    'readonly': true,
                    'username': username
                };
                //not storing shared scripts in local storage yet
                // localStorage[LS_SCRIPTS_KEY] = JSON.stringify(scripts);
                resolve(sharedScripts[scriptid]);
            });
        }
    }

    /**
     * Delete a script if owned by the user.
     *
     * @param {integer} scriptid The script id to use.
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function deleteScript(scriptid) {
        if (isLogged()) {
            // User is logged in so make a call to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/delete';
            if (password !== null) {
                var opts = {
                    params: {
                        'username': username,
                        'password': btoa(password),
                        'scriptid': scriptid
                    },
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                };
                var payload = {};
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Deleted script: ' + scriptid, 'debug');

                    if (scripts[scriptid]) {
                        scripts[scriptid] = result.data;
                        scripts[scriptid].modified = Date.now();
                        scripts[scriptid] = postProcessCollaborators(scripts[scriptid]);
                        closeScript(scriptid);
                        // delete scripts[scriptid];
                    } else {
                        //script doesn't exist
                    }
                }).catch(function(err) {
                    esconsole('Could not delete script: ' + scriptid, 'debug');
                    esconsole(err, ['USER', 'ERROR']);
                });
            }
        } else {
            // User is not logged in so alter local storage
            return new Promise(function(resolve, reject) {
                closeScript(scriptid);
                scripts[scriptid].soft_delete = true;
                // delete scripts[scriptid];
                localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
                resolve();
            });
        }
    }

    /**
     * Restore a script deleted by the user.
     *
     * @param {integer} scriptid The script id to use.
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function restoreScript(script) {

        var p;
        if (lookForScriptByName(script.name, true)) {
        // Prompt the user to rename the script
            p = $uibModal.open({
                templateUrl: 'templates/rename-import-script.html',
                controller: 'renameController',
                size: 100,
                resolve: {
                    script: function() { return script; }
                }
            }).result;

            p.then(function(renamedScript) {
                if (renamedScript.name === script.name) {
                    script.name = nextName(script.name);
                } else {
                    script.name = renamedScript.name;
                }
                renameScript(script.shareid, script.name);
                return script;
            }, function () {
                //dismissed
            }).catch(function(err) {

            });
        } else {
            // Script name is valid, so just return it
            p = new Promise(function(resolve) { resolve(script); });
        }

        return p.then(function(restoredScript) {
            if (isLogged()) {
                // User is logged in so make a call to the web service
                var username = getUsername();
                var password = getPassword();
                var url = WSURLDOMAIN + '/services/scripts/restore';
                if (password !== null) {
                    var opts = {
                        params: {
                            'username': username,
                            'password': btoa(password),
                            'scriptid': script.shareid
                        },
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    };
                    var payload = {};
                    return $http.post(url, payload, opts).then(function(result) {
                        esconsole('Restored script: ' + script.shareid, 'debug');
                        restoredScript = result.data;
                        restoredScript.saved = true;
                        restoredScript.modified = Date.now();
                        scripts[restoredScript.shareid] = restoredScript;
                        return restoredScript;
                    }).catch(function(err) {
                        esconsole('Could not restore script: ' + script.shareid, 'debug');
                        esconsole(err, ['ERROR']);
                    });
                }
            } else {
                // User is not logged in so alter local storage
                return new Promise(function(resolve, reject) {
                    scripts[restoredScript.shareid].modified = Date.now();
                    scripts[restoredScript.shareid].soft_delete = false;
                    localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
                    resolve();
                });
            }
        });
    }

    // Import a script by checking if it is shared or not, and saving it to
    // the user workspace. Returns a promise which resolves to the saved script.
    function importScript(script) {
        var p;
        if (lookForScriptByName(script.name)) {
        // Prompt the user to rename the script
            p = $uibModal.open({
                templateUrl: 'templates/rename-import-script.html',
                controller: 'renameController',
                size: 100,
                resolve: {
                    script: function() { return script; }
                }
            }).result;

            p.then(function(newScript) {
                if (newScript.name === script.name) {
                    script.name = nextName(script.name);
                } else {
                    script.name = newScript.name;
                }
                return script;
            }, function () {
                //dismissed
            }).catch(function(err) {

            });
        } else {
            // Script name is valid, so just return it
            p = new Promise(function(resolve) { resolve(script); });
        }

        return p.then(function(script) {
            if (script.isShared) {
            // The user is importing a shared script -- need to call the webservice
                if (isLogged()) {
                    return importSharedScript(script.shareid).then(function(imported) {
                        renameScript(imported.shareid, script.name);
                        imported.name = script.name;
                        return Promise.resolve(imported);
                    });
                } else {
                    throw ESMessages.general.unauthenticated;
                }
            } else {
                // The user is importing a read-only script (e.g. from the curriculum)
                return saveScript(script.name, script.source_code);
            }
        });
    }

    function importCollaborativeScript(script) {
        let p, originalScriptName = script.name;
        if (lookForScriptByName(script.name)) {
            p = $uibModal.open({
                templateUrl: 'templates/rename-import-script.html',
                controller: 'renameController',
                size: 100,
                resolve: {
                    script: function() { return script; }
                }
            }).result;

            p.then(newScript => {
                if (newScript.name === script.name) {
                    script.name = nextName(script.name);
                } else {
                    script.name = newScript.name;
                }
                return script;
            });
        } else {
            // Script name is valid, so just return it
            p = Promise.resolve(script);
        }

        return p.then(() => collaboration.getScriptText(script.shareid).then(text => {
            userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`);
            collaboration.closeScript(script.shareid, getUsername());
            return saveScript(script.name, text);
        }));
    }

    /**
     * Delete a shared script if owned by the user.
     *
     * @param {integer} scriptid The script id to use.
     */
    function deleteSharedScript(scriptid) {
        if (isLogged()) {
            // User is logged in so make a call to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/deletesharedscript';
            if (password !== null) {
                var opts = {
                    params: {
                        'username': username,
                        'password': btoa(password),
                        'scriptid': scriptid
                    },
                    headers: {'Content-Type': 'application/xml'}
                };
                var payload = {};
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Deleted shared script: ' + scriptid, 'debug');

                    closeSharedScript(scriptid);
                    delete sharedScripts[scriptid];

                }).catch(function(err) {
                    esconsole('Could not delete shared script: ' + scriptid, 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in
            return new Promise(function(resolve, reject) {
                closeSharedScript(scriptid);
                delete sharedScripts[scriptid];
                // shared scripts are not maintained in local storage yet
                // localStorage[LS_SCRIPTS_KEY] = JSON.stringify(scripts);
                resolve();
            });
        }
    }

    /**
     * Set a shared script description if owned by the user.
     *
     * @param scriptname {integer} Name of the script to use.
     * @param scriptId {string} Share ID
     * @param desc The script description that the user inputs.
     */

    function setScriptDesc(scriptname, scriptId, desc) {
        if (isLogged()) {
            if (typeof(desc) === 'undefined') {
                desc = '';
            }

            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/setscriptdesc';
            if (password !== null) {
                var content = '<scripts><username>' + username + '</username>'
                        + '<name>' + scriptname + '</name>'
                        + '<description><![CDATA[' + desc + ']]></description></scripts>';
                //TODO: find JSON alternative for CDATA and use angular $http post
                $.ajax(url, {
                    method: 'POST',
                    async: true,
                    contentType: 'application/xml;charset=UTF-8',
                    data: content,
                    success: function(response) {
                        scripts[scriptId].description = desc;
                    }
                });
            }
        }
    }

    /**
     * Import a shared script to the user's owned script list.
     * @param {integer} scriptid The script id to use.
     */
    function importSharedScript(scriptid) {
        if (isLogged()) {
            var userState = JSON.parse(localStorage.get(USER_STATE_KEY));
            var username = userState.username;
            var password = userState.password;

            var url = WSURLDOMAIN + '/services/scripts/import';
            var payload = new FormData();
            payload.append('username', username);
            payload.append('password', btoa(password));
            payload.append('scriptid', scriptid);
            var opts = {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            };

            return $http.post(url, payload, opts).then(function (result) {
                if (scriptid) {
                    delete sharedScripts[scriptid];
                }
                closeSharedScript(scriptid);

                esconsole('Import script ' + scriptid + ' to ' + username, 'debug');
                return result.data;
            }).catch(function (err) {
                esconsole('Could not import script ' + scriptid + ' to ' + username, 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    }

    function openSharedScriptForEdit(shareID) {
        if (isLogged()) {
            importSharedScript(shareID).then(function (importedScript) {
                refreshCodeBrowser().then(function () {
                    openScript(importedScript.shareid);
                });
            });
        } else {
            loadScript(shareID, true).then(function (script) {
                // save with duplicate check
                importScript(script).then(function (savedScript) {
                    // add sharer's info
                    savedScript.creator = script.username;
                    savedScript.original_id = shareID;

                    openScript(savedScript.shareid);

                    // re-save to local with above updated info
                    localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
                });
            });
        }
    }

    /**
     * Only add but not open a shared script (view-only) shared by another user. Script is added to the shared-script browser.
     * @param shareID
     * @param notificationID
     */
    function addSharedScript(shareID, notificationID) {
        if (isLogged()) {
            getSharedScripts(getUsername(), getPassword()).then(function (scriptList) {
                if (!scriptList.some(function (script) {
                        return script.shareid === shareID;
                    })) {
                    loadScript(shareID, true).then(function (script) {
                        saveSharedScript(shareID, script.name, script.source_code, script.username).then(function () {
                            getSharedScripts(getUsername(), getPassword());
                        });
                    });
                }
            });
        }

        // prevent repeated import upon page refresh by marking the notification message "read." The message may still appear as unread for the current session.
        // TODO: separate this process from userProject if possible
        if (notificationID) {
            notificationsMarkedAsRead.push(notificationID);
        }
    }

    /**
     * Rename a script if owned by the user.
     *
     * @param {integer} scriptid The script id to use.
     * @param {integer} newName The new name to give the script.
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function renameScript(scriptid, newName) {
        if (isLogged()) {
            // user is logged in, make a request to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/rename';
            if (password !== null) {
                var opts = {
                    params: {
                        'username': username,
                        'password': btoa(password),
                        'scriptid': scriptid,
                        'scriptname': newName
                    },
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                };
                var payload = {};
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Renamed script: ' + scriptid + ' to ' + newName, 'debug');

                    if (scriptid) {
                        scripts[scriptid].name = newName;
                    }
                }).catch(function(err) {
                    esconsole('Could not rename script: ' + scriptid, 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in, update local storage
            scripts[scriptid].name = newName;
            localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
            return Promise.resolve(null);
        }
    }

    /**
     * Get all users and their roles
     *
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function getAllUserRoles() {
        if (isLogged()) {
            // user is logged in, make a request to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/getalluserroles';
            if (password !== null) {

                var payload = new FormData();
                payload.append('adminusername', username);
                payload.append('password', btoa(password));

                var opts = {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                };
           
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Users roles requested by ' + username, 'debug');
                    return result.data.users;
                }).catch(function(err) {
                    esconsole('Could not retreive users and their roles', 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in
            console.log(err);
            esconsole('Login failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;        
        }
    }

    /**
     * Add role to user
     *
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function addRole(user,role) {
        if (isLogged()) {
            // user is logged in, make a request to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/adduserrole';
            if (password !== null) {

                var payload = new FormData();
                payload.append('adminusername', username);
                payload.append('password', btoa(password));
                payload.append('username', user);
                payload.append('role', role);

                var opts = {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                };
           
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Add role ' + role + ' to ' + username, 'debug');
                    return result.data;
                }).catch(function(err) {
                    esconsole('Could not add new role', 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in
            console.log(err);
            esconsole('Login failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;        
        }
    }

    /**
     * Remove role from user
     *
     * @returns {Promise} A promise that resolves when the request is completed.
     */
    function removeRole(user,role) {
        if (isLogged()) {
            // user is logged in, make a request to the web service
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/removeuserrole';
            if (password !== null) {

                var payload = new FormData();
                payload.append('adminusername', username);
                payload.append('password', btoa(password));
                payload.append('username', user);
                payload.append('role', role);

                var opts = {
                    transformRequest: angular.identity,
                    headers: {'Content-Type': undefined}
                };
           
                return $http.post(url, payload, opts).then(function(result) {
                    esconsole('Remove role ' + role + ' from '+ username, 'debug');
                    return result.data;
                }).catch(function(err) {
                    esconsole('Could not remove role', 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in
            console.log(err);
            esconsole('Login failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;        
        }
    }

    function setPasswordForUser(userID, password, adminPassphrase) {
        return new Promise(function (resolve, reject) {
            if (isLogged()) {
                var adminID = getUsername();
                var adminPwd = getPassword();

                if (adminPwd !== null) {
                    esconsole('Admin setting a new password for user');
                    var payload = new FormData();
                    payload.append('adminid', adminID);
                    payload.append('adminpwd', btoa(adminPwd));
                    payload.append('adminpp', btoa(adminPassphrase));
                    payload.append('username', userID);
                    payload.append('newpassword', encodeURIComponent(btoa(password)));

                    var opts = {
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                    };

                    var url = WSURLDOMAIN + '/services/scripts/modifypwdadmin';
                    $http.post(url, payload, opts).then(function () {
                        userNotification.show('Successfully set a new password for user: ' + userID + ' with password: ' + password, 'history', 3);
                        resolve();
                    }, function () {
                        userNotification.show('Error setting a new password for user: ' + userID, 'failure1');
                        reject();
                    });
                } else {
                    reject();
                }
            } else {
                reject();
            }
        });
    }

    /**
     * If a scriptname already is taken, find the next possible name by
     * appending a number (1), (2), etc...
     *
     * @param scriptname {string} The name of the script.
     * @returns {string} A name that has not been taken yet.
     */
    function nextName(scriptname) {
        var name = ESUtils.parseName(scriptname);
        var ext = ESUtils.parseExt(scriptname);
        var counter = 1;

        var matchedNames = {};
        for (var id in scripts) {
            if (scripts[id].name.indexOf(name) > -1) {
                matchedNames[scripts[id].name] = scripts[id].name;
            }
        }

        while (scriptname in matchedNames) {
            scriptname = name + '_'+counter + ext;
            counter++;
        }

        return scriptname;
    }

    function lookForScriptByName(scriptname, ignoreDeletedScripts) {
        return Object.keys(scripts)
            .some(id => !(!!scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname);
    }

    /**
     * Save a user's script if they have permission to do so.
     *
     * @param scriptname {string} The name of the script.
     * @param sourcecode {string} The script sourcecode.
     * @param overwrite {boolean} (default: true) If true, will overwrite
     * existing scripts. Otherwise a number will be appended to the script name.
     * @param status {integer} (default: 0) The run status of the script when
     * saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
     * @returns {Promise} A promise that resolves to the saved script.
     */
    function saveScript(scriptname, sourcecode, overwrite, status) {
        if (overwrite === undefined) {
            overwrite = true;
        }

        if (status === undefined) {
            status = 0;
        }

        var n = null;

        if (overwrite) {
            n = scriptname;
        } else {
            // avoid overwriting scripts by suffixing the name with a number
            n = nextName(scriptname);
        }

        if (isLogged()) {
            var username = getUsername();
            var password = getPassword();
            var url = WSURLDOMAIN + '/services/scripts/save';

            if (password !== null) {
                var content = '<scripts><username>' + getUsername() + '</username>'
                    + '<name>' + n + '</name>'
                    + '<run_status>' + status + '</run_status>'
                    + '<source_code><![CDATA[' + sourcecode + ']]></source_code></scripts>';

                var opts = {
                    headers: {'Content-Type': 'application/xml;charset=UTF-8'},
                    params: {
                        'username': username,
                        'password': btoa(password)
                    }
                };

                return $http.post(url, content, opts).then(function(result) {
                    var shareid = result.data.shareid;
                    var script = result.data;

                    esconsole('Saved script: ' + n);
                    esconsole('Saved script shareid: ' + shareid);

                    script.modified = Date.now();
                    script.saved = true;
                    script.tooltipText = '';

                    script = postProcessCollaborators(script);

                    scripts[shareid] = script;
                    return scripts[shareid];
                }).catch(function(err) {
                    esconsole('Could not save script: ' + scriptname, 'debug');
                    esconsole(err, ['ERROR']);
                    throw err;
                });
            }
        } else {
            return new Promise(function(resolve, reject) {
                var shareid = "";
                if (overwrite) {
                    const match = Object.values(scripts).find(v => v.name===n);
                    if (match) {
                        shareid = match.shareid;
                    }
                }
                if (shareid === "") {
                    shareid = ESUtils.randomString(22);
                }

                scripts[shareid] = {
                    'name': n,
                    'shareid': shareid,
                    'modified': Date.now(),
                    'source_code': sourcecode,
                    'saved': true,
                    'tooltipText': '',
                    'collaborators': []
                };
                localStorage.set(LS_SCRIPTS_KEY, JSON.stringify(scripts));
                resolve(scripts[shareid]);
            });
        }
        reporter.saveScript();
    }

    /**
     * Creates a new empty script and adds it to the list of open scripts, and
     * saves it to a user's library.
     *
     * @param scriptname {string} The script name to use.
     * @returns {Promise} A promise that resolves to the index of the newly
     * created script.
     */
    function createScript(scriptname) {
        var language = ESUtils.parseLanguage(scriptname);
        return saveScript(scriptname, TEMPLATES[language])
        .then(function(result) {
            openScript(result.shareid);
            return result;
        });
    }

    /**
     * Adds a script name to the list of open scripts. If a script is already
     * open, it does nothing.
     *
     * @param shareid {string} The id of the script to open.
     * @returns {integer} The list index of the opened script.
     */
    function openScript(shareid) {
        if (openScripts.indexOf(shareid) === -1) {
            openScripts.push(shareid);
            // save tabs state
            localStorage.set(LS_TABS_KEY, JSON.stringify(openScripts));
        }
        reporter.openScript();
        return openScripts.indexOf(shareid);
    }
    /**
     * Adds a shared script to the list of open shared scripts. If the script is already
     * open, it does nothing.
     *
     * @param shareid {string} The id of the script to open.
     * @returns {integer} The list index of the opened script.
     */
    function openSharedScript(shareid) {
        /*use sharedid instead of scriptname since shared scripts origniating
        from different sources can have same names */
        if (openSharedScripts.indexOf(shareid) === -1) {
            openSharedScripts.push(shareid);

            localStorage.set(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts));
        }
    }

    /**
     * Removes a script name from the list of open scripts.
     *
     * @param shareid {string} The id of the script to close.
     * @returns {array}
     */
    function closeScript(shareid) {
        if (isOpen(shareid)) {
            if (openScripts.includes(shareid)) {
                openScripts.splice(openScripts.indexOf(shareid), 1);
                // save tabs state
                localStorage.set(LS_TABS_KEY, JSON.stringify(openScripts));
            }
        } else if (isSharedScriptOpen(shareid)) {
            if (openSharedScripts.includes(shareid)) {
                openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1);
                // save tabs state
                localStorage.set(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts));
            }
        }
        return tabs.selectOpenTabs($ngRedux.getState()).slice();
    }

    /**
     * Removes a script name from the list of open shared scripts.
     *
     * @param shareid {string} The id of the script to close.
     * @returns {array}
     */
    function closeSharedScript(shareid) {
        if (isSharedScriptOpen(shareid)) {
            openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1);
            localStorage[LS_SHARED_TABS_KEY] = JSON.stringify(openSharedScripts);
        }
        return openSharedScripts;
    }

    /**
     * Check if a script is open.
     *
     * @param shareid {string} The id of the script to check.
     * @returns {boolean} Whether the script is open or not.
     */
    function isOpen(shareid) {
        return openScripts.indexOf(shareid) !== -1;
    }

    /**
     * Check if a shared script is open.
     *
     * @param scriptname {string} The name of the script to check.
     * @returns {boolean} Whether the script is open or not.
     */
    function isSharedScriptOpen(shareid) {
        return openSharedScripts.indexOf(shareid) !== -1;
    }

    /**
     * Check if there are any unsaved scripts still open.
     *
     * @returns {boolean} Whether there are any unsaved
     */
    function isAllSaved() {
        for (var id in openScripts) {
            if (id in scripts && !scripts[id].saved) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sends a request to save all the currently open scripts.
    * @returns {Promises}
     */
    function saveAll() {
        var promises = [];

        angular.forEach(openScripts, function (openScript) {
            // do not auto-save collaborative scripts
            if (openScript in scripts && !scripts[openScript].saved && !scripts[openScript].collaborative) {
                promises.push(saveScript(scripts[openScript].name, scripts[openScript].source_code));
            }
        });

        return promises;
    }

    function getTutoringRecord(scriptID) {
        var url = URL_DOMAIN + '/services/scripts/gettutoringrecord';
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };
        var body = new FormData();
        body.append('username', getUsername());
        body.append('password', getEncodedPassword());
        body.append('scriptid', scriptID);

        return $http.post(url, body, opts).then(function (result) {
            return result.data;
        });
    }

function uploadCAIHistory(projectName, node) {
    var url = URL_DOMAIN + '/services/scripts/uploadcaihistory';

    var opts = {
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
    };

    var body = new FormData();
    body.append('username', getUsername());
    body.append('project', projectName)
    body.append('node', JSON.stringify(node));

    $http.post(url, body, opts).then(function(result) {
        console.log('saved to CAI history:', projectName, node);
    }).catch(function(err) {
        console.log('could not save to cai', projectName, node);
        throw err;
    });
}

    self = {
        login: login,
        loadLocalScripts: loadLocalScripts,
        storeUser: storeUser,
        loadUser: loadUser,
        clearUser: clearUser,
        isLogged: isLogged,
        getUsername: getUsername,
        setPassword: setPassword,
        getEncodedPassword: getEncodedPassword,
        loadScript: loadScript,
        getScriptHistory : getScriptHistory,
        getScriptVersion : getScriptVersion,
        deleteAudio: deleteAudio,
        renameAudio: renameAudio,
        deleteScript: deleteScript,
        restoreScript: restoreScript,
        nextName: nextName,
        renameScript: renameScript,
        saveScript: saveScript,
        createScript: createScript,
        openScript: openScript, // almost duplicate name
        openSharedScript: openSharedScript, // almost duplicate name
        closeScript: closeScript,
        closeSharedScript: closeSharedScript,
        isOpen: isOpen,
        isAllSaved: isAllSaved,
        saveAll: saveAll,
        scripts: scripts,
        sharedScripts:sharedScripts,
        openScripts: openScripts, // almost duplicate name
        openSharedScripts: openSharedScripts, // almost duplicate name
        setLicense: setLicense,
        getLicenses: getLicenses,
        getUserInfo: getUserInfo,
        markFavoriteClip: markFavoriteClip,
        unmarkFavoriteClip: unmarkFavoriteClip,
        getFavorites: getFavorites,
        saveSharedScript: saveSharedScript,
        getSharedScripts: getSharedScripts,
        sharedScriptsReady: sharedScriptsReady,
        getLockedSharedScriptId: getLockedSharedScriptId,
        deleteSharedScript: deleteSharedScript,
        setScriptDesc: setScriptDesc,
        importSharedScript: importSharedScript,
        importScript: importScript,
        importCollaborativeScript: importCollaborativeScript,
        openSharedScriptForEdit: openSharedScriptForEdit,
        addSharedScript: addSharedScript,
        refreshCodeBrowser: refreshCodeBrowser,
        shareid: shareid,
        lookForScriptByName: lookForScriptByName,
        getAllUserRoles: getAllUserRoles,
        addRole: addRole,
        removeRole: removeRole,
        setPasswordForUser: setPasswordForUser,
        shareWithPeople: shareWithPeople,
        getTutoringRecord: getTutoringRecord,
        uploadCAIHistory: uploadCAIHistory,
        // export constants
        STATUS_UNKNOWN: STATUS_UNKNOWN,
        STATUS_SUCCESSFUL: STATUS_SUCCESSFUL,
        STATUS_UNSUCCESSFUL: STATUS_UNSUCCESSFUL,
        errorLoadingSharedScript: errorLoadingSharedScript
    };

    window.userProjScope = self;

    return self;
}]);
