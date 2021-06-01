import angular from 'angular';
import xml2js from 'xml2js';

import * as appState from './appState';
import * as audioLibrary from './audiolibrary';
import * as cai from '../cai/caiState';
import * as collaboration from './collaboration';
import esconsole from '../esconsole';
import * as ESUtils from '../esutils';
import * as helpers from '../helpers';
import store from '../reducers';
import reporter from './reporter';
import * as scriptsState from '../browser/scriptsState';
import * as tabs from '../editor/tabState';
import * as userNotification from './userNotification';
import * as websocket from './websocket';
import { ScriptEntity } from 'common';
import ESMessages from '../data/messages';

const identity = (angular as any).identity;

var WSURLDOMAIN = URL_DOMAIN;
var USER_STATE_KEY = 'userstate';

var LS_TABS_KEY = 'tabs_v2';
var LS_SHARED_TABS_KEY = 'shared_tabs_v1';
var LS_SCRIPTS_KEY = 'scripts_v1';

export var STATUS_SUCCESSFUL = 1;
export var STATUS_UNSUCCESSFUL = 2;
export var shareid = "";

// notification IDs
var notificationsMarkedAsRead: any[] = [];

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
export var scripts: any = {};
export var sharedScripts: any = {};

// keep a list of script names that are currently open
export var openScripts: any[] = [];
var openSharedScripts: any[] = [];

function form(obj: { [key: string]: string | Blob }={}) {
    const data = new FormData()
    for (const [key, value] of Object.entries(obj)) {
        data.append(key, value)
    }
    return data
}

function authForm(obj: { [key: string]: string | Blob }={}) {
    const { username, password } = loadUser()
    return form({ username, password: btoa(password), ...obj})
}

// websocket gets closed before onunload in FF
window.onbeforeunload = function () {
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
                        store.dispatch(scriptsState.syncToNgUserProject());
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
                transformRequest: identity,
                headers: {'Content-Type': undefined}
            };

            notificationsMarkedAsRead.forEach(function (notificationID) {
                esconsole('marking notification ' + notificationID + ' as read', 'user');
                const body = authForm({ notification_id: notificationID });
                helpers.getNgService("$http").post(url, body, opts);
            });
        }

        if (saving) {
            return true; // Show warning popover.
        }
    } else {
        if (localStorage.getItem(LS_SCRIPTS_KEY) !== null) {
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
        }
    }
};

export function loadLocalScripts() {
    // Load scripts from local storage if they are available. When a user logs
    // in these scripts will be saved to the web service and deleted from local
    // storage.
    const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
    if (scriptData !== null) {
        scripts = Object.assign(scripts, JSON.parse(scriptData));
        store.dispatch(scriptsState.syncToNgUserProject());

        const tabData = localStorage.getItem(LS_TABS_KEY)
        if (tabData !== null) {
            const storedTabs = JSON.parse(tabData);
            if (storedTabs) {
                storedTabs.forEach((tab: any) => {
                    openScripts.push(tab);
                    store.dispatch(tabs.setActiveTabAndEditor(tab));
                });
            }
        }

        const sharedTabData = localStorage.getItem(LS_SHARED_TABS_KEY)
        if (sharedTabData !== null) {
            const storedTabs = JSON.parse(sharedTabData);
            if (storedTabs) {
                storedTabs.forEach((tab: any) => {
                    openSharedScripts.push(tab);
                    store.dispatch(tabs.setActiveTabAndEditor(tab));
                });
            }
        }
    }
}

// Because scripts and openScripts are objects and we can't reset them
// simply by re-instantiating empty objects, we use resetScripts() to
// clear them manually. This is necessary due to controllers watching these
// variables passed by reference. If we orphan those references, the
// controllers won't update properly anymore.
function resetScripts() {
    for (var key in scripts) {
        delete scripts[key];
    }
}

function resetSharedScripts() {
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

// The script content from server may need adjustment in the collaborators parameter.
function postProcessCollaborators(script: ScriptEntity, userName?: string) {
    if (typeof(script.collaborators) === 'undefined') {
        script.collaborators = [];
    } else if (typeof(script.collaborators) === 'string') {
        script.collaborators = [script.collaborators];
    }

    if (userName) {
        // for shared-script browser: treat script as collaborative only when the user is listed among collaborators
        // #1858: List of collaborators may be recorded in mixed case (inconsistently).
        if (script.collaborators.length !== 0 &&
            script.collaborators.map(function (user: string) {
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

// Login, setup, restore scripts, return shared scripts.
export function login(username: string, password: string) {
    esconsole('Using username: ' + username, ['DEBUG', 'USER']);

    var url = WSURLDOMAIN + '/services/scripts/findall';
    // TODO: base64 encoding is not a secure way to send password
    const payload = form({ username, password: btoa(password) })
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };

    return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
        reporter.login(username);

        // persist the user session
        storeUser(username, password);

        // register callbacks to the collaboration service
        collaboration.callbacks.refreshScriptBrowser = refreshCodeBrowser
        // TODO: potential race condition with server-side script renaming operation?
        collaboration.callbacks.refreshSharedScriptBrowser = getSharedScripts
        collaboration.callbacks.closeSharedScriptIfOpen = closeSharedScript

        // register callbacks / member values in the userNotification service
        userNotification.callbacks.addSharedScript = addSharedScript

        websocket.connect(username);
        collaboration.setUserName(username);

        // used for managing websocket notifications locally
        userNotification.user.loginTime = Date.now();

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
        const embedMode = appState.selectEmbedMode(store.getState());
        if (!embedMode) {
            const tabData = localStorage.getItem(LS_TABS_KEY)
            if (tabData !== null) {
                const opened = JSON.parse(tabData);

                for (let i in opened) {
                    if (opened.hasOwnProperty(i)) {
                        openScripts.push(opened[i]);
                    }
                }
            }
            const sharedTabData = localStorage.getItem(LS_SHARED_TABS_KEY)
            if (sharedTabData !== null) {
                const opened = JSON.parse(sharedTabData);

                for (let i in opened) {
                    if (opened.hasOwnProperty(i)) {
                        openSharedScripts.push(opened[i]);
                    }
                }
            }
            const activeTabID = tabs.selectActiveTabID(store.getState());
            if (activeTabID) {
                store.dispatch(tabs.setActiveTabAndEditor(activeTabID));
            }
        }

        // Clear Recommendations in Sound Browser
        helpers.getNgRootScope().$broadcast('clearRecommender');

        // Close CAI
        if (FLAGS.SHOW_CAI) {
            store.dispatch(cai.resetState());
        }

        // Copy scripts local storage to the web service.
        const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
        if (scriptData !== null) {
            var saved = JSON.parse(scriptData);

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
            store.dispatch(tabs.resetTabs());

            return Promise.all(promises).then(function (savedScripts) {
                localStorage.removeItem(LS_SCRIPTS_KEY);
                localStorage.removeItem(LS_TABS_KEY);
                localStorage.removeItem(LS_SHARED_TABS_KEY);

                return refreshCodeBrowser().then(function () {
                    // once all scripts have been saved open them
                    savedScripts.forEach(function(savedScript) {
                        if(savedScript) {
                            openScript(savedScript.shareid);
                            store.dispatch(tabs.setActiveTabAndEditor(savedScript.shareid));
                        }
                    });
                });
            }).then(() => getSharedScripts());
        } else {
            // load scripts in shared browser
            return getSharedScripts();
        }
    }, function(err: Error) {
        esconsole('Login failure', ['DEBUG','ERROR']);
        esconsole(err.toString(), ['DEBUG','ERROR']); // TODO: this shows as [object object]?
        throw err;
    });
}

export function refreshCodeBrowser() {
    if (isLogged()) {
        var url = WSURLDOMAIN + '/services/scripts/findall';
        var payload = authForm()
        var opts = {
            transformRequest: identity,
            headers: {'Content-Type': undefined}
        };

        // TODO: base64 encoding is not a secure way to send password

        return helpers.getNgService("$http").post(url, payload, opts).then((result: any) => {
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

        }, function(err: Error) {
            console.log(err);
            esconsole('refreshCodeBrowser failure', ['DEBUG','ERROR']);
            esconsole(err.toString(), ['DEBUG','ERROR']);
            throw err;
        });
    } else {
        const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
        if (scriptData !== null) {
            var r = JSON.parse(scriptData);
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
function formatDateToISO(date: string){
    //Format created date to ISO 8601
        var isoFormat = date.slice(0,-2).replace(' ','T');
    // javascript Date.parse() requires ISO 8601
    return Date.parse(isoFormat);
}

// Fetch a script's history, authenticating via username and password.
// Resolves to a list of historical scripts.
export function getScriptHistory(scriptid: string) {
    esconsole('Getting script history: ' + scriptid, ['DEBUG', 'USER']);
    var url = WSURLDOMAIN + '/services/scripts/scripthistory';
    const payload = authForm({ scriptid })
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };

    return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
        var r;

        if (result.data === null) {
            // no scripts
            return [];
        } else if (result.data.scripts instanceof Array) {
            //Format created date to ISO 8601
            for(var i = 0; i< result.data.scripts.length; i++){
                result.data.scripts[i].created = formatDateToISO(result.data.scripts[i].created);
            }
            r = result.data.scripts;
        } else {
            // one script -- somehow this gets parsed to one object
            result.data.scripts.created = formatDateToISO(result.data.scripts.created);
            r = [result.data.scripts];
        }

        return r

    }, function(err: Error) {
        console.log(err);
        esconsole('Login failure', ['DEBUG','ERROR']);
        esconsole(err.toString(), ['DEBUG','ERROR']);
        throw err;
    });
}

// Fetch a specific version of a script.
export function getScriptVersion(scriptid: string, versionid: string) {
    esconsole('Getting script history: ' + scriptid + '  version: ' + versionid, ['DEBUG', 'USER']);
    var url = WSURLDOMAIN + '/services/scripts/scriptversion';
    const payload = authForm({ scriptid, versionid })
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };

    return helpers.getNgService("$http").post(url, payload, opts).then(function (result: any) {
        if (result.data === null) {
            // no scripts
            return [];
        } else {
            // one script -- somehow this gets parsed to one object
            var r = [result.data];
        }

        return r;
    }, function (err: Error) {
        console.log(err);
        esconsole('Login failure', ['DEBUG','ERROR']);
        esconsole(err.toString(), ['DEBUG','ERROR']);
        throw err;
    });
}

// Get shared scripts in the user account. Returns a promise that resolves to a list of user's shared script objects.
export function getSharedScripts() {
    resetSharedScripts();

    var url = WSURLDOMAIN + '/services/scripts/getsharedscripts';
    var payload = authForm()
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };

    return helpers.getNgService("$http").post(url, payload, opts).then(function (result: any) {
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

        return res;
    });
}

// Get shared id for locked version of latest script.
export function getLockedSharedScriptId(shareid: string){
    var url = WSURLDOMAIN + '/services/scripts/getlockedshareid';
    return helpers.getNgService("$http").get(url, {
        params: {'shareid': shareid }
    }).then(function(result: any) {
        return result.data.shareid;
    }, function(err: Error) {
        console.log(err);
    });
}

// Save a username and password to local storage to persist between sessions.
function storeUser(username: string, password: string) {
    var userState: any = {};
    userState.username = username;
    userState.password = password;

    localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState));
}

// Get a username and password from local storage, if it exists.
export function loadUser() {
    const userState = localStorage.getItem(USER_STATE_KEY)
    if (userState !== null) {
        return JSON.parse(userState);
    }
    return null;
}

// Delete a user saved to local storage. I.e., logout.
export function clearUser() {
    // TODO: use tunnelled
    resetOpenScripts();
    resetSharedOpenScripts();
    resetScripts();
    resetSharedScripts();
    localStorage.clear();

    // Clear Recommendations in Sound Browser
    helpers.getNgRootScope().$broadcast('clearRecommender');

    // Close CAI
    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState());
    }

    websocket.disconnect();
}

// Check if a user is stored in local storage.
export function isLogged() {
    var jsstate = localStorage.getItem(USER_STATE_KEY);
    return jsstate !== null;
}

// Get a username from local storage.
export function getUsername(): string {
    return loadUser()?.username
}

// Set a users new password.
export function setPassword(pass: string) {
    if (isLogged()) {
        storeUser(getUsername()!, pass);
    }
}

// Get the password from local storage.
function getPassword(): string {
    return loadUser()?.password
}

export function shareWithPeople(shareid: string, users: string[]) {
    var data: any = {};
    data.notification_type = "sharewithpeople";
    data.username = getUsername();
    data.scriptid = shareid;
    data.users = users;

    if (!websocket.isOpen) {
        websocket.connect(getUsername(), () => websocket.send(data))
    } else {
        websocket.send(data);
    }
}

// Fetch a script by ID.
export function loadScript(id: string, sharing: boolean) {
    //sharing is not used but the function doesn't work if it is not there. Why?
    var url = URL_DOMAIN + '/services/scripts/scriptbyid';
    var opts = { params: {'scriptid': id} };
    return helpers.getNgService("$http").get(url, opts)
        .then(function(result: any) {
            if (sharing && result.data === '') {
                if (userNotification.state.isInLoadingScreen) {
                } else {
                    userNotification.show(ESMessages.user.badsharelink, 'failure1', 3);
                }

                throw "Script was not found.";
            }
            return result.data;
        }, function(err: Error) {
            esconsole('Failure getting script id: '+id, ['DEBUG','ERROR']);
        });
}

// Deletes an audio key if owned by the user.
export function deleteAudio(audiokey: string) {
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
        return helpers.getNgService("$http").post(url, payload, opts).then(function() {
            esconsole('Deleted audiokey: ' + audiokey, 'debug');
            audioLibrary.clearAudioTagCache(); // otherwise the deleted audio key is still usable by the user
        }).catch(function(err: Error) {
            esconsole('Could not delete audiokey: ' + audiokey, 'debug');
            esconsole(err, ['ERROR']);
        });
    }
}

// Rename an audio key if owned by the user.
export function renameAudio(audiokey: string, newaudiokey: string) {
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
        return helpers.getNgService("$http").post(url, payload, opts).then(function() {
            esconsole('Successfully renamed audiokey: ' + audiokey + ' to ' + newaudiokey, 'debug');
            userNotification.show(ESMessages.general.soundrenamed, 'normal', 2);
            audioLibrary.clearAudioTagCache(); // otherwise audioLibrary.getUserAudioTags/getAllTags returns the list with old name
        }).catch(function(err: Error) {
            esconsole('Could not rename audiokey: ' + audiokey + ' to ' + newaudiokey, 'debug');
            userNotification.show('Error renaming custom sound', 'failure1', 2);
            esconsole(err, ['ERROR']);
        });
    }
}

// Get a script license information from the back-end.
export function getLicenses(){
    var url = WSURLDOMAIN + '/services/scripts/getlicenses';
    return helpers.getNgService("$http").get(url).then(function(response: any){
        return response.data.licenses;
    })
}


export function getUserInfo(username?: string, password?: string){
    username ??= getUsername()
    password ??= getPassword()
    var url = WSURLDOMAIN + '/services/scripts/getuserinfo';
    var payload, opts
    if (password !== null) {
        payload = form({ username, password: btoa(password) })
        opts = {
            transformRequest: identity,
            headers: {'Content-Type': undefined}
        }
    }

    return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
        esconsole('Get user info ' + ' for ' + username, 'debug');

        var user: any = {};
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

// Set a script license id if owned by the user.
export function setLicense(scriptName: string, scriptId: string, licenseID: string){
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
            return helpers.getNgService("$http").get(url, opts).then(function () {
                esconsole('Set License Id ' + licenseID + ' to ' + scriptName, 'debug');
                scripts[scriptId].license_id = licenseID;
            }).catch(function (err: Error) {
                esconsole('Could not set license id: ' + licenseID + ' to ' + scriptName, 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    }
}

// save a sharedscript into user's account.
export function saveSharedScript(scriptid: string, scriptname: string, sourcecode: string, username: string){
    if (isLogged()) {
        username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/scripts/savesharedscript';
        var opts;
        if (password !== null) {
            opts = {
                params: {
                    'scriptid': scriptid,
                    'username': username,
                    'password': btoa(password)
                },
                headers: {'Content-Type': 'application/xml'}
            }
        }
        var payload={};
        return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
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

// Delete a script if owned by the user.
export function deleteScript(scriptid: string) {
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
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
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
            }).catch(function(err: Error) {
                esconsole('Could not delete script: ' + scriptid, 'debug');
                esconsole(err, ['USER', 'ERROR']);
            });
        }
    } else {
        // User is not logged in so alter local storage
        return new Promise<void>(function(resolve, reject) {
            closeScript(scriptid);
            scripts[scriptid].soft_delete = true;
            // delete scripts[scriptid];
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
            resolve();
        });
    }
}

// Restore a script deleted by the user.
export function restoreScript(script: ScriptEntity) {

    var p;
    if (lookForScriptByName(script.name, true)) {
    // Prompt the user to rename the script
        p = helpers.getNgService("$uibModal").open({
            templateUrl: 'templates/rename-import-script.html',
            controller: 'renameController',
            size: 100,
            resolve: {
                script: function() { return script; }
            }
        }).result;

        p.then(function(renamedScript: ScriptEntity) {
            if (renamedScript.name === script.name) {
                script.name = nextName(script.name);
            } else {
                script.name = renamedScript.name;
            }
            renameScript(script.shareid, script.name);
            return script;
        }, function () {
            //dismissed
        }).catch(function(err: Error) {

        });
    } else {
        // Script name is valid, so just return it
        p = new Promise(function(resolve) { resolve(script); });
    }

    return p.then(function(restoredScript: ScriptEntity) {
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
                return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                    esconsole('Restored script: ' + script.shareid, 'debug');
                    restoredScript = result.data;
                    restoredScript.saved = true;
                    restoredScript.modified = Date.now();
                    scripts[restoredScript.shareid] = restoredScript;
                    return restoredScript;
                }).catch(function(err: Error) {
                    esconsole('Could not restore script: ' + script.shareid, 'debug');
                    esconsole(err, ['ERROR']);
                });
            }
        } else {
            // User is not logged in so alter local storage
            return new Promise<void>(function(resolve, reject) {
                scripts[restoredScript.shareid].modified = Date.now();
                scripts[restoredScript.shareid].soft_delete = false;
                localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
                resolve();
            });
        }
    });
}

// Import a script by checking if it is shared or not, and saving it to
// the user workspace. Returns a promise which resolves to the saved script.
export function importScript(script: ScriptEntity) {
    var p;
    if (lookForScriptByName(script.name)) {
    // Prompt the user to rename the script
        p = helpers.getNgService("$uibModal").open({
            templateUrl: 'templates/rename-import-script.html',
            controller: 'renameController',
            size: 100,
            resolve: {
                script: function() { return script; }
            }
        }).result;

        p.then(function(newScript: ScriptEntity) {
            if (newScript.name === script.name) {
                script.name = nextName(script.name);
            } else {
                script.name = newScript.name;
            }
            return script;
        }, function () {
            //dismissed
        }).catch(function(err: Error) {

        });
    } else {
        // Script name is valid, so just return it
        p = new Promise(function(resolve) { resolve(script); });
    }

    return p.then(function(script: ScriptEntity) {
        if (script.isShared) {
        // The user is importing a shared script -- need to call the webservice
            if (isLogged()) {
                return importSharedScript(script.shareid).then(function(imported: ScriptEntity) {
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

export function importCollaborativeScript(script: ScriptEntity) {
    let p, originalScriptName = script.name;
    if (lookForScriptByName(script.name)) {
        p = helpers.getNgService("$uibModal").open({
            templateUrl: 'templates/rename-import-script.html',
            controller: 'renameController',
            size: 100,
            resolve: {
                script: function() { return script; }
            }
        }).result;

        p.then((newScript: ScriptEntity) => {
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

    return p.then(() => collaboration.getScriptText(script.shareid).then((text: string) => {
        userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`);
        collaboration.closeScript(script.shareid, getUsername());
        return saveScript(script.name, text);
    }));
}

// Delete a shared script if owned by the user.
export function deleteSharedScript(scriptid: string) {
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
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                esconsole('Deleted shared script: ' + scriptid, 'debug');

                closeSharedScript(scriptid);
                delete sharedScripts[scriptid];

            }).catch(function(err: Error) {
                esconsole('Could not delete shared script: ' + scriptid, 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    } else {
        // User is not logged in
        return new Promise<void>(function(resolve, reject) {
            closeSharedScript(scriptid);
            delete sharedScripts[scriptid];
            // shared scripts are not maintained in local storage yet
            // localStorage[LS_SCRIPTS_KEY] = JSON.stringify(scripts);
            resolve();
        });
    }
}

// Set a shared script description if owned by the user.
export function setScriptDesc(scriptname: string, scriptId: string, desc: string="") {
    if (isLogged()) {
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
                success: function(response: any) {
                    scripts[scriptId].description = desc;
                }
            });
        }
    }
}

// Import a shared script to the user's owned script list.
function importSharedScript(scriptid: string) {
    if (isLogged()) {
        var url = WSURLDOMAIN + '/services/scripts/import';
        const payload = authForm({ scriptid })
        var opts = {
            transformRequest: identity,
            headers: {'Content-Type': undefined}
        };

        return helpers.getNgService("$http").post(url, payload, opts).then(function (result: any) {
            if (scriptid) {
                delete sharedScripts[scriptid];
            }
            closeSharedScript(scriptid);

            esconsole('Import script ' + scriptid, 'debug');
            return result.data;
        }).catch(function (err: Error) {
            esconsole('Could not import script ' + scriptid, 'debug');
            esconsole(err, ['ERROR']);
        });
    }
}

export function openSharedScriptForEdit(shareID: string) {
    if (isLogged()) {
        importSharedScript(shareID).then(function (importedScript: ScriptEntity) {
            refreshCodeBrowser().then(function () {
                openScript(importedScript.shareid);
            });
        });
    } else {
        loadScript(shareID, true).then(function (script: ScriptEntity) {
            // save with duplicate check
            importScript(script).then(function (savedScript: any) {
                // add sharer's info
                savedScript.creator = script.username;
                savedScript.original_id = shareID;

                openScript(savedScript.shareid);

                // re-save to local with above updated info
                localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
            });
        });
    }
}

// Only add but not open a shared script (view-only) shared by another user. Script is added to the shared-script browser.
function addSharedScript(shareID: string, notificationID: string) {
    if (isLogged()) {
        getSharedScripts().then(function (scriptList: ScriptEntity[]) {
            if (!scriptList.some(function (script) {
                    return script.shareid === shareID;
                })) {
                loadScript(shareID, true).then(function (script: ScriptEntity) {
                    saveSharedScript(shareID, script.name, script.source_code, script.username).then(function () {
                        getSharedScripts();
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

// Rename a script if owned by the user.
export function renameScript(scriptid: string, newName: string) {
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
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                esconsole('Renamed script: ' + scriptid + ' to ' + newName, 'debug');

                if (scriptid) {
                    scripts[scriptid].name = newName;
                }
            }).catch(function(err: Error) {
                esconsole('Could not rename script: ' + scriptid, 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    } else {
        // User is not logged in, update local storage
        scripts[scriptid].name = newName;
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
        return Promise.resolve(null);
    }
}

// Get all users and their roles
export function getAllUserRoles() {
    if (isLogged()) {
        // user is logged in, make a request to the web service
        var username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/scripts/getalluserroles';
        if (password !== null) {
            const payload = form({ adminusername: username, password: btoa(password) })
            var opts = {
                transformRequest: identity,
                headers: {'Content-Type': undefined}
            };
        
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                esconsole('Users roles requested by ' + username, 'debug');
                return result.data.users;
            }).catch(function(err: Error) {
                esconsole('Could not retreive users and their roles', 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    } else {
        // User is not logged in
        esconsole('Login failure', ['DEBUG','ERROR']);      
    }
}

// Add role to user
export function addRole(user: string, role: string) {
    if (isLogged()) {
        // user is logged in, make a request to the web service
        var username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/scripts/adduserrole';
        if (password !== null) {
            const payload = form({ adminusername: username, password: btoa(password), username: user, role })
            var opts = {
                transformRequest: identity,
                headers: {'Content-Type': undefined}
            };
        
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                esconsole('Add role ' + role + ' to ' + username, 'debug');
                return result.data;
            }).catch(function(err: Error) {
                esconsole('Could not add new role', 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    } else {
        // User is not logged in
        esconsole('Login failure', ['DEBUG','ERROR']);
    }
}

// Remove role from user
export function removeRole(user: string, role: string) {
    if (isLogged()) {
        // user is logged in, make a request to the web service
        var username = getUsername();
        var password = getPassword();
        var url = WSURLDOMAIN + '/services/scripts/removeuserrole';
        if (password !== null) {
            const payload = form({ adminusername: username, password: btoa(password), username: user, role })
            var opts = {
                transformRequest: identity,
                headers: {'Content-Type': undefined}
            };
        
            return helpers.getNgService("$http").post(url, payload, opts).then(function(result: any) {
                esconsole('Remove role ' + role + ' from '+ username, 'debug');
                return result.data;
            }).catch(function(err: Error) {
                esconsole('Could not remove role', 'debug');
                esconsole(err, ['ERROR']);
            });
        }
    } else {
        // User is not logged in
        esconsole('Login failure', ['DEBUG','ERROR']);
    }
}

export function setPasswordForUser(userID: string, password: string, adminPassphrase: string) {
    return new Promise<void>(function (resolve, reject) {
        if (isLogged()) {
            var adminPwd = getPassword();

            if (adminPwd !== null) {
                esconsole('Admin setting a new password for user');
                const payload = form({
                    adminid: getUsername(),
                    adminpwd: btoa(adminPwd),
                    adminpp: btoa(adminPassphrase),
                    username: userID,
                    newpassword: encodeURIComponent(btoa(password)),
                })

                var opts = {
                    transformRequest: identity,
                    headers: {'Content-Type': undefined}
                };

                var url = WSURLDOMAIN + '/services/scripts/modifypwdadmin';
                helpers.getNgService("$http").post(url, payload, opts).then(function () {
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

// If a scriptname already is taken, find the next possible name by appending a number (1), (2), etc...
function nextName(scriptname: string) {
    var name = ESUtils.parseName(scriptname);
    var ext = ESUtils.parseExt(scriptname);
    var counter = 1;

    var matchedNames: any = {};
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

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    return Object.keys(scripts)
        .some(id => !(!!scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname);
}

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export function saveScript(scriptname: string, sourcecode: string, overwrite?: boolean, status?: number) {
    if (overwrite === undefined) {
        overwrite = true;
    }

    if (status === undefined) {
        status = 0;
    }

    var n: any = null;

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

            return helpers.getNgService("$http").post(url, content, opts).then(function(result: any) {
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
            }).catch(function(err: Error) {
                esconsole('Could not save script: ' + scriptname, 'debug');
                esconsole(err, ['ERROR']);
                throw err;
            });
        }
    } else {
        return new Promise(function(resolve, reject) {
            var shareid = "";
            if (overwrite) {
                const match: any = Object.values(scripts).find((v: any) => v.name===n);
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
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts));
            resolve(scripts[shareid]);
        });
    }
    reporter.saveScript();
}

// Creates a new empty script and adds it to the list of open scripts, and saves it to a user's library.
export function createScript(scriptname: string) {
    var language = ESUtils.parseLanguage(scriptname);
    return saveScript(scriptname, TEMPLATES[language as "python" | "javascript"])
    .then(function(result: any) {
        openScript(result.shareid);
        return result;
    });
}

// Adds a script to the list of open scripts. No effect if the script is already open.
export function openScript(shareid: string) {
    if (openScripts.indexOf(shareid) === -1) {
        openScripts.push(shareid);
        // save tabs state
        localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts));
    }
    reporter.openScript();
    return openScripts.indexOf(shareid);
}

// Adds a shared script to the list of open shared scripts. If the script is already open, it does nothing.
export function openSharedScript(shareid: string) {
    if (openSharedScripts.indexOf(shareid) === -1) {
        openSharedScripts.push(shareid);

        localStorage.setItem(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts));
    }
}

// Removes a script name from the list of open scripts.
export function closeScript(shareid: string) {
    if (isOpen(shareid)) {
        if (openScripts.includes(shareid)) {
            openScripts.splice(openScripts.indexOf(shareid), 1);
            // save tabs state
            localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts));
        }
    } else if (isSharedScriptOpen(shareid)) {
        if (openSharedScripts.includes(shareid)) {
            openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1);
            // save tabs state
            localStorage.setItem(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts));
        }
    }
    return tabs.selectOpenTabs(store.getState()).slice();
}

// Removes a script name from the list of open shared scripts.
export function closeSharedScript(shareid: string) {
    if (isSharedScriptOpen(shareid)) {
        openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1);
        localStorage[LS_SHARED_TABS_KEY] = JSON.stringify(openSharedScripts);
    }
    return openSharedScripts;
}

// Check if a script is open.
function isOpen(shareid: string) {
    return openScripts.indexOf(shareid) !== -1;
}

// Check if a shared script is open.
function isSharedScriptOpen(shareid: string) {
    return openSharedScripts.indexOf(shareid) !== -1;
}

// Save all open scripts.
export function saveAll() {
    var promises: any[] = [];

    openScripts.forEach(function (openScript) {
        // do not auto-save collaborative scripts
        if (openScript in scripts && !scripts[openScript].saved && !scripts[openScript].collaborative) {
            promises.push(saveScript(scripts[openScript].name, scripts[openScript].source_code));
        }
    });

    return promises;
}

export function getTutoringRecord(scriptID: string) {
    var url = URL_DOMAIN + '/services/scripts/gettutoringrecord';
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };
    const body = authForm({ scriptid: scriptID })

    return helpers.getNgService("$http").post(url, body, opts).then(function (result: any) {
        return result.data;
    });
}

export function uploadCAIHistory(project: string, node: any) {
    var url = URL_DOMAIN + '/services/scripts/uploadcaihistory';
    var opts = {
        transformRequest: identity,
        headers: {'Content-Type': undefined}
    };
    const body = form({ username: getUsername(), project, node: JSON.stringify(node) })

    helpers.getNgService("$http").post(url, body, opts).then(function() {
        console.log('saved to CAI history:', project, node);
    }).catch(function(err: Error) {
        console.log('could not save to cai', project, node);
        throw err;
    });
}
