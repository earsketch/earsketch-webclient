import xml2js from "xml2js"

import * as appState from "./appState"
import * as audioLibrary from "./audiolibrary"
import * as cai from "../cai/caiState"
import * as collaboration from "./collaboration"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as helpers from "../helpers"
import store from "../reducers"
import reporter from "./reporter"
import * as scriptsState from "../browser/scriptsState"
import * as tabs from "../editor/tabState"
import * as userNotification from "./userNotification"
import * as websocket from "./websocket"
import { ScriptEntity } from "common"
import ESMessages from "../data/messages"

const USER_STATE_KEY = "userstate"

const LS_TABS_KEY = "tabs_v2"
const LS_SHARED_TABS_KEY = "shared_tabs_v1"
const LS_SCRIPTS_KEY = "scripts_v1"

export const STATUS_SUCCESSFUL = 1
export const STATUS_UNSUCCESSFUL = 2
export const shareid = ""

// notification IDs
const notificationsMarkedAsRead: any[] = []

const TEMPLATES = {
    python: "#\t\tpython code\n#\t\tscript_name:\n#\n" +
            "#\t\tauthor:\n#\t\tdescription:\n#\n\n" +
            "from earsketch import *\n\n" +
            "init()\n" +
            "setTempo(120)\n\n\n\n" +
            "finish()\n",

    javascript: '"use strict";\n\n' +
                "//\t\tjavascript code\n//\t\tscript_name:\n//" +
                "\n//\t\tauthor:\n//\t\tdescription:\n//\n\n" +
                "init();\n" +
                "setTempo(120);\n\n\n\n" +
                "finish();\n"
}

// keep a mapping of script names: script objects
export let scripts: any = {}
export const sharedScripts: any = {}

// keep a list of script names that are currently open
export const openScripts: any[] = []
const openSharedScripts: any[] = []

// Helper functions for making API requests.
function form(obj: { [key: string]: string | Blob }={}) {
    const data = new FormData()
    for (const [key, value] of Object.entries(obj)) {
        data.append(key, value)
    }
    return data
}

// Our API is pretty inconsistent in terms of what endpoints consume/produce.
// Each helper deals with a different type of endpoint.
// (The helpers with "auth" and "admin" prepopulate some parameters for convenience.)

// Expects query parameters, returns JSON.
async function get(endpoint: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint + (params ? "?" + new URLSearchParams(params) : "")
    return (await fetch(url)).json()
}

// Expects form data, returns JSON.
async function postForm(endpoint: string, data?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint
    return (await fetch(url, { method: "post", body: form(data) })).json()
}

async function postAuthForm(endpoint: string, data: { [key: string]: string }={}) {
    return postForm(endpoint, { username: getUsername(), password: getEncodedPassword(), ...data })
}

async function postAdminForm(endpoint: string, data: { [key: string]: string }={}) {
    return postForm(endpoint, { adminusername: getUsername(), password: getEncodedPassword(), ...data })
}

// Expects query parameters, returns XML.
async function post(endpoint: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint + (params ? "?" + new URLSearchParams(params) : "")
    const text = (await fetch(url, { method: "post" })).text()
    return xml2js.parseStringPromise(text, { explicitArray: false, explicitRoot: false })
}

async function postAuth(endpoint: string, params: { [key: string]: string }) {
    return post(endpoint, { username: getUsername(), password: getEncodedPassword(), ...params })
}

// Expects XML, returns XML.
async function postXML(endpoint: string, xml: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint
    const response = await fetch(url + (params ? "?" + new URLSearchParams(params) : ""), {
        method: "post",
        headers: new Headers({ "Content-Type": "application/xml" }),
        body: xml,
    })
    const text = await response.text()
    return xml2js.parseStringPromise(text, { explicitArray: false, explicitRoot: false })
}

async function postXMLAuth(endpoint: string, xml: string) {
    return postXML(endpoint, xml, { username: getUsername(), password: getEncodedPassword() })
}

// websocket gets closed before onunload in FF
window.onbeforeunload = function () {
    if (isLogged()) {
        let saving = false
        const username = getUsername()

        for (const shareID of openScripts) {
            if (scripts[shareID] && scripts[shareID].collaborative) {
                collaboration.leaveSession(shareID, username)
            }

            if (scripts[shareID] && !scripts[shareID].saved) {
                saving = true
                const sourcecode = scripts[shareID].source_code
                const name = scripts[shareID].name
                const xml = `<scripts><username>${username}</username><name>${name}</name>` +
                            `<source_code><![CDATA[${sourcecode}]]></source_code></scripts>`

                postXMLAuth("/services/scripts/save", xml)
                    .then(script => {
                        script.modified = Date.now()
                        script.saved = true
                        script.tooltipText = ''
                        postProcessCollaborators(script)
                        scripts[script.shareid] = script
                        store.dispatch(scriptsState.syncToNgUserProject())
                        userNotification.show(ESMessages.user.scriptcloud, "success")
                    })
            }
        }

        for (const shareID of openSharedScripts) {
            if (sharedScripts[shareID] && sharedScripts[shareID].collaborative) {
                collaboration.leaveSession(shareID, username)
            }
        }

        // TODO: may not be properly working... check!
        if (notificationsMarkedAsRead.length !== 0) {
            for (const notification_id of notificationsMarkedAsRead) {
                esconsole("marking notification " + notification_id + " as read", "user")
                postAuthForm("/services/scripts/markread", { notification_id })
            }
        }

        if (saving) {
            return true  // Show warning popover.
        }
    } else {
        if (localStorage.getItem(LS_SCRIPTS_KEY) !== null) {
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
        }
    }
}

export function loadLocalScripts() {
    // Load scripts from local storage if they are available. When a user logs
    // in these scripts will be saved to the web service and deleted from local
    // storage.
    const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
    if (scriptData !== null) {
        scripts = Object.assign(scripts, JSON.parse(scriptData))
        store.dispatch(scriptsState.syncToNgUserProject())

        const tabData = localStorage.getItem(LS_TABS_KEY)
        if (tabData !== null) {
            const storedTabs = JSON.parse(tabData)
            if (storedTabs) {
                for (const tab of storedTabs) {
                    openScripts.push(tab)
                    store.dispatch(tabs.setActiveTabAndEditor(tab))
                }
            }
        }

        const sharedTabData = localStorage.getItem(LS_SHARED_TABS_KEY)
        if (sharedTabData !== null) {
            const storedTabs = JSON.parse(sharedTabData)
            if (storedTabs) {
                for (const tab of storedTabs) {
                    openSharedScripts.push(tab)
                    store.dispatch(tabs.setActiveTabAndEditor(tab))
                }
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
    for (const key in scripts) {
        delete scripts[key]
    }
}

function resetSharedScripts() {
    for (const key in sharedScripts) {
        delete sharedScripts[key]
    }
}

function resetOpenScripts() {
    while (openScripts.length > 0) {
        const popped = openScripts.pop()

        // special case for collaborative script. TODO: manage this in the tabs service.
        if (scripts.hasOwnProperty(popped) && scripts[popped].collaborative) {
            collaboration.closeScript(popped, getUsername())
        }
    }
}

function resetSharedOpenScripts() {
    while (openSharedScripts.length > 0) {
        openSharedScripts.pop()
    }
}

// The script content from server may need adjustment in the collaborators parameter.
function postProcessCollaborators(script: ScriptEntity, userName?: string) {
    if (typeof(script.collaborators) === "undefined") {
        script.collaborators = []
    } else if (typeof(script.collaborators) === "string") {
        script.collaborators = [script.collaborators]
    }

    if (userName) {
        // for shared-script browser: treat script as collaborative only when the user is listed among collaborators
        // #1858: List of collaborators may be recorded in mixed case (inconsistently).
        if (script.collaborators.length !== 0
            && script.collaborators.map((user: string) => user.toLowerCase()).includes(getUsername().toLowerCase())) {
            script.collaborative = true
            script.readonly = false
        } else {
            script.collaborative = false
            script.readonly = true
        }
    } else {
        // for regular script browser
        script.collaborative = script.collaborators.length !== 0
    }

    return script
}

// Login, setup, restore scripts, return shared scripts.
export function login(username: string, password: string) {
    esconsole("Using username: " + username, ["debug", "user"])
    return postForm("/services/scripts/findall", { username, password: btoa(password) }).then((data: any) => {
        reporter.login(username)

        // persist the user session
        storeUser(username, password)

        // register callbacks to the collaboration service
        collaboration.callbacks.refreshScriptBrowser = refreshCodeBrowser
        // TODO: potential race condition with server-side script renaming operation?
        collaboration.callbacks.refreshSharedScriptBrowser = getSharedScripts
        collaboration.callbacks.closeSharedScriptIfOpen = closeSharedScript

        // register callbacks / member values in the userNotification service
        userNotification.callbacks.addSharedScript = addSharedScript

        websocket.connect(username)
        collaboration.setUserName(username)

        // used for managing websocket notifications locally
        userNotification.user.loginTime = Date.now()

        esconsole(ESMessages.user.scriptsuccess, ["debug", "user"])

        let storedScripts

        if (data) {
            if (data.scripts instanceof Array) {
                storedScripts = data.scripts
            } else {
                // one script -- somehow this gets parsed to one object
                storedScripts = [data.scripts]
            }
        }

        resetScripts()

        // update user project scripts
        for (const i in storedScripts) {
            const script = storedScripts[i]
            // reformat saved date to ISO 8601 format
            const offset = new Date().getTimezoneOffset()
            script.modified = formatDateToISO(script.modified) + offset * 60000
            scripts[script.shareid] = script
            // set this flag to false when the script gets modified
            // then set it to true when the script gets saved
            script.saved = true
            script.tooltipText = ""

            postProcessCollaborators(script)
        }

        // when the user logs in and his/her scripts are loaded, we can restore
        // their previous tab session stored in the browser's local storage
        const embedMode = appState.selectEmbedMode(store.getState())
        if (!embedMode) {
            const tabData = localStorage.getItem(LS_TABS_KEY)
            if (tabData !== null) {
                const opened = JSON.parse(tabData)

                for (let i in opened) {
                    if (opened.hasOwnProperty(i)) {
                        openScripts.push(opened[i])
                    }
                }
            }
            const sharedTabData = localStorage.getItem(LS_SHARED_TABS_KEY)
            if (sharedTabData !== null) {
                const opened = JSON.parse(sharedTabData)

                for (let i in opened) {
                    if (opened.hasOwnProperty(i)) {
                        openSharedScripts.push(opened[i])
                    }
                }
            }
            const activeTabID = tabs.selectActiveTabID(store.getState())
            if (activeTabID) {
                store.dispatch(tabs.setActiveTabAndEditor(activeTabID))
            }
        }

        // Clear Recommendations in Sound Browser
        helpers.getNgRootScope().$broadcast("clearrecommender")

        // Close CAI
        if (FLAGS.SHOW_CAI) {
            store.dispatch(cai.resetState())
        }

        // Copy scripts local storage to the web service.
        const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
        if (scriptData !== null) {
            const saved = JSON.parse(scriptData)

            const promises = []
            for (const i in saved) {
                if (saved.hasOwnProperty(i) && !saved[i].soft_delete) {
                    if (saved[i].hasOwnProperty("creator") && (saved[i].creator !== username)) {
                        if(saved[i].hasOwnProperty("original_id")) {
                            promises.push(importSharedScript(saved[i].original_id))
                        }
                    } else {
                        // promises.push(saveScript(saved[i].name, saved[i].source_code, false))
                        const tabEditorSession = tabs.getEditorSession(saved[i].shareid)
                        if(tabEditorSession) {
                            promises.push(saveScript(saved[i].name, tabs.getEditorSession(saved[i].shareid).getValue(), false))
                        }
                    }
                }
            }

            resetOpenScripts()
            store.dispatch(tabs.resetTabs())

            return Promise.all(promises).then(function (savedScripts) {
                localStorage.removeItem(LS_SCRIPTS_KEY)
                localStorage.removeItem(LS_TABS_KEY)
                localStorage.removeItem(LS_SHARED_TABS_KEY)

                return refreshCodeBrowser().then(function () {
                    // once all scripts have been saved open them
                    for (const savedScript of savedScripts) {
                        if(savedScript) {
                            openScript(savedScript.shareid)
                            store.dispatch(tabs.setActiveTabAndEditor(savedScript.shareid))
                        }
                    }
                })
            }).then(() => getSharedScripts())
        } else {
            // load scripts in shared browser
            return getSharedScripts()
        }
    }, function(err: Error) {
        esconsole("Login failure", ["error", "user"])
        esconsole(err.toString(), ["error", "user"])  // TODO: this shows as [object object]?
        throw err
    })
}

export function refreshCodeBrowser() {
    if (isLogged()) {
        return postAuthForm("/services/scripts/findall").then((data: any) => {
            let res

            if (data) {
                if (data.scripts instanceof Array) {
                    res = data.scripts
                } else {
                    // one script -- somehow this gets parsed to one object
                    res = [data.scripts]
                }
            }

            resetScripts()

            for (const i in res) {
                let script = res[i]
                // reformat saved date to ISO 8601 format
                script.modified = formatDateToISO(script.modified)
                // set this flag to false when the script gets modified
                // then set it to true when the script gets saved
                script.saved = true
                script.tooltipText = ""

                scripts[script.shareid] = script

                script = postProcessCollaborators(script)
            }

        }, function(err: Error) {
            esconsole("refreshCodeBrowser failure", ["error", "user"])
            esconsole(err.toString(), ["error", "user"])
            throw err
        })
    } else {
        const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
        if (scriptData !== null) {
            const r = JSON.parse(scriptData)
            resetScripts()
            for (const i in r) {
                const script = r[i]
                script.saved = true
                script.tooltipText = ""
                postProcessCollaborators(script)
                scripts[script.shareid] = script
            }
        }
        return Promise.resolve()
    }
}

// Format a date to ISO 8601
// TODO: dates should be stored in the database so as to make this unnecessary
function formatDateToISO(date: string){
    // Format created date to ISO 8601
    const isoFormat = date.slice(0,-2).replace(" ", "t")
    // javascript Date.parse() requires ISO 8601
    return Date.parse(isoFormat)
}

// Fetch a script's history, authenticating via username and password.
// Resolves to a list of historical scripts.
export function getScriptHistory(scriptid: string) {
    esconsole("Getting script history: " + scriptid, ["debug", "user"])
    return postAuthForm("/services/scripts/scripthistory", { scriptid }).then(function(data: any) {
        if (data === null) {
            // no scripts
            return []
        } else if (data.scripts instanceof Array) {
            // Format created date to ISO 8601.
            for (const script of data.scripts) {
                script.created = formatDateToISO(script.created)
            }
            return data.scripts
        } else {
            // one script -- somehow this gets parsed to one object
            data.scripts.created = formatDateToISO(data.scripts.created)
            return [data.scripts]
        }
    }, function(err: Error) {
        esconsole("Login failure", ["error", "user"])
        esconsole(err.toString(), ["error", "user"])
        throw err
    })
}

// Fetch a specific version of a script.
export function getScriptVersion(scriptid: string, versionid: string) {
    esconsole("Getting script history: " + scriptid + "  version: " + versionid, ["debug", "user"])
    return postAuthForm("/services/scripts/scriptversion", { scriptid, versionid }).then(function (data: any) {
        return data === null ? [] : [data]
    }, function (err: Error) {
        esconsole("Login failure", ["error", "user"])
        esconsole(err.toString(), ["error", "user"])
        throw err
    })
}

// Get shared scripts in the user account. Returns a promise that resolves to a list of user's shared script objects.
export function getSharedScripts() {
    resetSharedScripts()
    return postAuthForm("/services/scripts/getsharedscripts").then(function (data: any) {
        let res

        if (data) {
            if (data.scripts instanceof Array) {
                res = data.scripts
            } else {
                // one script -- somehow this gets parsed to one object
                res = [data.scripts]
            }
        }

        for (const i in res) {
            const script = res[i]
            script.isShared = true
            postProcessCollaborators(script, getUsername())
            sharedScripts[script.shareid] = script
        }

        return res
    })
}

// Get shared id for locked version of latest script.
export async function getLockedSharedScriptId(shareid: string){
    return (await get("/services/scripts/getlockedshareid", { shareid })).shareid
}

// Save a username and password to local storage to persist between sessions.
function storeUser(username: string, password: string) {
    const userState: any = {}
    userState.username = username
    userState.password = password

    localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState))
}

// Get a username and password from local storage, if it exists.
export function loadUser() {
    const userState = localStorage.getItem(USER_STATE_KEY)
    if (userState !== null) {
        return JSON.parse(userState)
    }
    return null
}

// Delete a user saved to local storage. I.e., logout.
export function clearUser() {
    // TODO: use tunnelled
    resetOpenScripts()
    resetSharedOpenScripts()
    resetScripts()
    resetSharedScripts()
    localStorage.clear()

    // Clear Recommendations in Sound Browser
    helpers.getNgRootScope().$broadcast("clearrecommender")

    // Close CAI
    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState())
    }

    websocket.disconnect()
}

// Check if a user is stored in local storage.
export function isLogged() {
    return localStorage.getItem(USER_STATE_KEY) !== null
}

// Get a username from local storage.
export function getUsername(): string {
    return loadUser()?.username
}

// Set a users new password.
export function setPassword(pass: string) {
    if (isLogged()) {
        storeUser(getUsername()!, pass)
    }
}

// Get the password from local storage.
function getPassword(): string {
    return loadUser()?.password
}

export function getEncodedPassword() {
    return btoa(getPassword())
}

export function shareWithPeople(shareid: string, users: string[]) {
    const data: any = {}
    data.notification_type = "sharewithpeople"
    data.username = getUsername()
    data.scriptid = shareid
    data.users = users

    if (!websocket.isOpen) {
        websocket.connect(getUsername(), () => websocket.send(data))
    } else {
        websocket.send(data)
    }
}

// Fetch a script by ID.
export async function loadScript(id: string, sharing: boolean) {
    try {
        const data = await get("/services/scripts/scriptbyid", { scriptid: id })
        if (sharing && data === '') {
            if (userNotification.state.isInLoadingScreen) {
            } else {
                userNotification.show(ESMessages.user.badsharelink, "failure1", 3)
            }
            throw "Script was not found."
        }
        return data
    } catch {
        esconsole("Failure getting script id: "+id, ["error", "user"])
    }
}

// Deletes an audio key if owned by the user.
export async function deleteAudio(audiokey: string) {
    try {
        await postAuth("/services/audio/delete", { audiokey })
        esconsole("Deleted audiokey: " + audiokey, "debug")
        audioLibrary.clearAudioTagCache()  // otherwise the deleted audio key is still usable by the user
    } catch (err) {
        esconsole(err, ["error", "userproject"])
    }
}

// Rename an audio key if owned by the user.
export async function renameAudio(audiokey: string, newaudiokey: string) {
    try {
        await postAuth("/services/audio/rename", { audiokey, newaudiokey })
        esconsole("Successfully renamed audiokey: " + audiokey + " to " + newaudiokey, "debug")
        userNotification.show(ESMessages.general.soundrenamed, "normal", 2)
        audioLibrary.clearAudioTagCache()  // otherwise audioLibrary.getUserAudioTags/getAllTags returns the list with old name
    } catch (err) {
        userNotification.show("Error renaming custom sound", "failure1", 2)
        esconsole(err, ["error", "userproject"])
    }
}

// Get a script license information from the back-end.
export async function getLicenses() {
    return (await get("/services/scripts/getlicenses")).licenses
}

export async function getUserInfo(username_?: string, password?: string) {
    esconsole("Get user info " + " for " + username_, "debug")
    const data: { [key: string]: string } = (username_ && password) ? { username: username_, password: btoa(password) } : {}
    const { username, email, first_name, last_name, role } = await postAuthForm("/services/scripts/getuserinfo", data)
    return { username, email, firstname: first_name ?? "", lastname: last_name ?? "", role }
}

// Set a script license id if owned by the user.
export async function setLicense(scriptName: string, scriptId: string, licenseID: string){
    if (isLogged()) {
        try {
            // TODO: Why doesn't this endpoint require authentication?
            await get("/services/scripts/setscriptlicense", { scriptname: scriptName, username: getUsername(), license_id: licenseID })
        } catch (err) {
            esconsole("Could not set license id: " + licenseID + " to " + scriptName, "debug")
            esconsole(err, ["error"])
        }
        esconsole("Set License Id " + licenseID + " to " + scriptName, "debug")
        scripts[scriptId].license_id = licenseID
    }
}

// save a sharedscript into user's account.
export async function saveSharedScript(scriptid: string, scriptname: string, sourcecode: string, username: string){
    if (isLogged()) {
        const script = await postAuth("/services/scripts/savesharedscript", { scriptid })
        esconsole("Save shared script " + script.name + " to " + username, "debug")
        return sharedScripts[script.shareid] = { ...script, isShared: true, readonly: true, modified: Date.now() }
    } else {
        return sharedScripts[scriptid] = {
            name: scriptname,
            shareid: scriptid,
            modified: Date.now(),
            source_code: sourcecode,
            isShared: true,
            readonly: true,
            username,
        }
    }
}

// Delete a script if owned by the user.
export async function deleteScript(scriptid: string) {
    if (isLogged()) {
        // User is logged in so make a call to the web service
        try {
            const script = await postAuth("/services/scripts/delete", { scriptid })
            esconsole("Deleted script: " + scriptid, "debug")

            if (scripts[scriptid]) {
                scripts[scriptid] = script
                scripts[scriptid].modified = Date.now()
                scripts[scriptid] = postProcessCollaborators(scripts[scriptid])
                closeScript(scriptid)
            } else {
                // script doesn't exist
            }
        } catch (err) {
            esconsole("Could not delete script: " + scriptid, "debug")
            esconsole(err, ["user", "error"])
        }
    } else {
        // User is not logged in so alter local storage
        closeScript(scriptid)
        scripts[scriptid].soft_delete = true
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
    }
}

// Restore a script deleted by the user.
export function restoreScript(script: ScriptEntity) {
    let p
    if (lookForScriptByName(script.name, true)) {
        // Prompt the user to rename the script
        p = helpers.getNgService("$uibModal").open({
            templateUrl: "templates/rename-import-script.html",
            controller: "renamecontroller",
            size: 100,
            resolve: { script: () => script },
        }).result

        p.then(function(renamedScript: ScriptEntity) {
            if (renamedScript.name === script.name) {
                script.name = nextName(script.name)
            } else {
                script.name = renamedScript.name
            }
            renameScript(script.shareid, script.name)
            return script
        }, function () {
            //dismissed
        }).catch(function(err: Error) {

        })
    } else {
        // Script name is valid, so just return it
        p = new Promise(function(resolve) { resolve(script) })
    }

    return p.then(function(restoredScript: ScriptEntity) {
        if (isLogged()) {
            // User is logged in so make a call to the web service
            return postAuth("/services/scripts/restore", { scriptid: script.shareid }).then(function(restored: any) {
                esconsole("Restored script: " + restored.shareid, "debug")
                scripts[restored.shareid] = { ...restored, saved: true, modified: Date.now() }
                return restored
            }).catch(function(err: Error) {
                esconsole("Could not restore script: " + script.shareid, "debug")
                esconsole(err, ["error"])
            })
        } else {
            // User is not logged in so alter local storage
            return new Promise<void>(function(resolve, reject) {
                scripts[restoredScript.shareid].modified = Date.now()
                scripts[restoredScript.shareid].soft_delete = false
                localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
                resolve()
            })
        }
    })
}

// Import a script by checking if it is shared or not, and saving it to
// the user workspace. Returns a promise which resolves to the saved script.
export function importScript(script: ScriptEntity) {
    let p
    if (lookForScriptByName(script.name)) {
    // Prompt the user to rename the script
        p = helpers.getNgService("$uibModal").open({
            templateUrl: "templates/rename-import-script.html",
            controller: "renamecontroller",
            size: 100,
            resolve: { script: () => script }
        }).result

        p.then(function(newScript: ScriptEntity) {
            if (newScript.name === script.name) {
                script.name = nextName(script.name)
            } else {
                script.name = newScript.name
            }
            return script
        }, function () {
            //dismissed
        }).catch(function(err: Error) {

        })
    } else {
        // Script name is valid, so just return it
        p = new Promise(resolve => resolve(script))
    }

    return p.then(function(script: ScriptEntity) {
        if (script.isShared) {
        // The user is importing a shared script -- need to call the webservice
            if (isLogged()) {
                return importSharedScript(script.shareid).then(function(imported: ScriptEntity) {
                    renameScript(imported.shareid, script.name)
                    imported.name = script.name
                    return Promise.resolve(imported)
                })
            } else {
                throw ESMessages.general.unauthenticated
            }
        } else {
            // The user is importing a read-only script (e.g. from the curriculum)
            return saveScript(script.name, script.source_code)
        }
    })
}

export function importCollaborativeScript(script: ScriptEntity) {
    let p, originalScriptName = script.name
    if (lookForScriptByName(script.name)) {
        p = helpers.getNgService("$uibModal").open({
            templateUrl: "templates/rename-import-script.html",
            controller: "renamecontroller",
            size: 100,
            resolve: { script: () => script }
        }).result

        p.then((newScript: ScriptEntity) => {
            if (newScript.name === script.name) {
                script.name = nextName(script.name)
            } else {
                script.name = newScript.name
            }
            return script
        })
    } else {
        // Script name is valid, so just return it
        p = Promise.resolve(script)
    }

    return p.then(() => collaboration.getScriptText(script.shareid).then((text: string) => {
        userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`)
        collaboration.closeScript(script.shareid, getUsername())
        return saveScript(script.name, text)
    }))
}

// Delete a shared script if owned by the user.
export function deleteSharedScript(scriptid: string) {
    if (isLogged()) {
        // User is logged in so make a call to the web service
        return postAuth("/services/scripts/deletesharedscript", { scriptid }).then(function() {
            esconsole("Deleted shared script: " + scriptid, "debug")
            closeSharedScript(scriptid)
            delete sharedScripts[scriptid]
        }).catch(function(err: Error) {
            esconsole("Could not delete shared script: " + scriptid, "debug")
            esconsole(err, ["error"])
        })
    } else {
        // User is not logged in
        return new Promise<void>(function(resolve, reject) {
            closeSharedScript(scriptid)
            delete sharedScripts[scriptid]
            // shared scripts are not maintained in local storage yet
            // localStorage[LS_SCRIPTS_KEY] = JSON.stringify(scripts)
            resolve()
        })
    }
}

// Set a shared script description if owned by the user.
export async function setScriptDesc(scriptname: string, scriptId: string, desc: string="") {
    if (isLogged()) {
        // TODO: These values (particularly the description) should probably be escaped...
        const xml = `<scripts><username>${getUsername()}</username><name>${scriptname}</name><description><![CDATA[${desc}]]></description></scripts>`
        await postXML("/services/scripts/setscriptdesc", xml)
        scripts[scriptId].description = desc
    }
}

// Import a shared script to the user's owned script list.
async function importSharedScript(scriptid: string) {
    if (isLogged()) {
        try {
            const data = await postAuth("/services/scripts/import", { scriptid })
            if (scriptid) {
                delete sharedScripts[scriptid]
            }
            closeSharedScript(scriptid)
            esconsole("Import script " + scriptid, "debug")
            return data
        } catch (err) {
            esconsole("Could not import script " + scriptid, "debug")
            esconsole(err, ["error"])
        }
    }
}

export function openSharedScriptForEdit(shareID: string) {
    if (isLogged()) {
        importSharedScript(shareID).then(function (importedScript: ScriptEntity) {
            refreshCodeBrowser().then(function () {
                openScript(importedScript.shareid)
            })
        })
    } else {
        loadScript(shareID, true).then(function (script: ScriptEntity) {
            // save with duplicate check
            importScript(script).then(function (savedScript: any) {
                // add sharer's info
                savedScript.creator = script.username
                savedScript.original_id = shareID

                openScript(savedScript.shareid)

                // re-save to local with above updated info
                localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
            })
        })
    }
}

// Only add but not open a shared script (view-only) shared by another user. Script is added to the shared-script browser.
function addSharedScript(shareID: string, notificationID: string) {
    if (isLogged()) {
        getSharedScripts().then(function (scriptList: ScriptEntity[]) {
            if (!scriptList.some(function (script) {
                    return script.shareid === shareID
                })) {
                loadScript(shareID, true).then(function (script: ScriptEntity) {
                    saveSharedScript(shareID, script.name, script.source_code, script.username).then(function () {
                        getSharedScripts()
                    })
                })
            }
        })
    }

    // prevent repeated import upon page refresh by marking the notification message "read." The message may still appear as unread for the current session.
    // TODO: separate this process from userProject if possible
    if (notificationID) {
        notificationsMarkedAsRead.push(notificationID)
    }
}

// Rename a script if owned by the user.
export function renameScript(scriptid: string, newName: string) {
    if (isLogged()) {
        // user is logged in, make a request to the web service
        return postAuth("/services/scripts/rename", { scriptid, scriptname: newName }).then(function() {
            esconsole("Renamed script: " + scriptid + " to " + newName, "debug")

            if (scriptid) {
                scripts[scriptid].name = newName
            }
        }).catch(function(err: Error) {
            esconsole("Could not rename script: " + scriptid, "debug")
            esconsole(err, ["error"])
        })
    } else {
        // User is not logged in, update local storage
        scripts[scriptid].name = newName
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
        return Promise.resolve(null)
    }
}

// Get all users and their roles
export function getAllUserRoles() {
    if (isLogged()) {
        // user is logged in, make a request to the web service
        return postAdminForm("/services/scripts/getalluserroles").then(function(data: any) {
            return data.users
        }).catch(function(err: Error) {
            esconsole("Could not retreive users and their roles", "debug")
            esconsole(err, ["error"])
        })
    } else {
        // User is not logged in
        esconsole("Login failure", ["error", "user"])
    }
}

// Add role to user
export function addRole(username: string, role: string) {
    if (isLogged()) {
        return postAdminForm("/services/scripts/adduserrole", { username, role }).then(function(result: any) {
            return result.data
        }).catch(function(err: Error) {
            esconsole("Could not add new role", "debug")
            esconsole(err, ["error"])
        })
    } else {
        // User is not logged in
        esconsole("Login failure", ["error", "user"])
    }
}

// Remove role from user
export function removeRole(username: string, role: string) {
    if (isLogged()) {
        return postAdminForm("/services/scripts/adduserrole", { username, role }).then(function(result: any) {
            return result.data
        }).catch(function(err: Error) {
            esconsole("Could not remove role", "debug")
            esconsole(err, ["error"])
        })
    } else {
        // User is not logged in
        esconsole("Login failure", ["error", "user"])
    }
}

export function setPasswordForUser(userID: string, password: string, adminPassphrase: string) {
    return new Promise<void>(function (resolve, reject) {
        if (isLogged()) {
            const adminPwd = getPassword()

            if (adminPwd !== null) {
                esconsole("Admin setting a new password for user")
                const data = {
                    adminid: getUsername(),
                    adminpwd: btoa(adminPwd),
                    adminpp: btoa(adminPassphrase),
                    username: userID,
                    newpassword: encodeURIComponent(btoa(password)),
                }
                postForm("/services/scripts/modifypwdadmin", data).then(function () {
                    userNotification.show("Successfully set a new password for user: " + userID + " with password: " + password, "history", 3)
                    resolve()
                }, function () {
                    userNotification.show("Error setting a new password for user: " + userID, "failure1")
                    reject()
                })
            } else {
                reject()
            }
        } else {
            reject()
        }
    })
}

// If a scriptname already is taken, find the next possible name by appending a number (1), (2), etc...
function nextName(scriptname: string) {
    const name = ESUtils.parseName(scriptname)
    const ext = ESUtils.parseExt(scriptname)

    const matchedNames: any = {}
    for (const id in scripts) {
        if (scripts[id].name.includes(name)) {
            matchedNames[scripts[id].name] = scripts[id].name
        }
    }

    for (let counter = 1; scriptname in matchedNames; counter++) {
        scriptname = name + "_" + counter + ext
    }

    return scriptname
}

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    return Object.keys(scripts)
        .some(id => !(!!scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname)
}

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export function saveScript(scriptname: string, source_code: string, overwrite: boolean=true, status: number=0) {
    const name = overwrite ? scriptname : nextName(scriptname)

    if (isLogged()) {
        reporter.saveScript()
        const xml = `<scripts><username>${getUsername()}</username>` + 
                    `<name>${name}</name><run_status>${status}</run_status>` +
                    `<source_code><![CDATA[${source_code}]]></source_code></scripts>`
        return postXMLAuth("/services/scripts/save", xml).then(function(script: any) {
            const shareid = script.shareid

            esconsole("Saved script: " + name)
            esconsole("Saved script shareid: " + shareid)

            script.modified = Date.now()
            script.saved = true
            script.tooltipText = ''

            script = postProcessCollaborators(script)

            scripts[shareid] = script
            return scripts[shareid]
        }).catch(function(err: Error) {
            esconsole("Could not save script: " + scriptname, "debug")
            esconsole(err, ["error"])
            throw err
        })
    } else {
        return new Promise(function(resolve, reject) {
            let shareid = ""
            if (overwrite) {
                const match: any = Object.values(scripts).find((v: any) => v.name===name)
                if (match) {
                    shareid = match.shareid
                }
            }
            if (shareid === "") {
                shareid = ESUtils.randomString(22)
            }

            scripts[shareid] = { 
                name, shareid, source_code,
                modified: Date.now(),
                saved: true,
                tooltipText: '',
                collaborators: [],
            }
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
            resolve(scripts[shareid])
        })
    }
}

// Creates a new empty script and adds it to the list of open scripts, and saves it to a user's library.
export function createScript(scriptname: string) {
    const language = ESUtils.parseLanguage(scriptname)
    return saveScript(scriptname, TEMPLATES[language as "python" | "javascript"])
    .then(function(result: any) {
        openScript(result.shareid)
        return result
    })
}

// Adds a script to the list of open scripts. No effect if the script is already open.
export function openScript(shareid: string) {
    if (openScripts.indexOf(shareid) === -1) {
        openScripts.push(shareid)
        // save tabs state
        localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts))
    }
    reporter.openScript()
    return openScripts.indexOf(shareid)
}

// Adds a shared script to the list of open shared scripts. If the script is already open, it does nothing.
export function openSharedScript(shareid: string) {
    if (openSharedScripts.indexOf(shareid) === -1) {
        openSharedScripts.push(shareid)

        localStorage.setItem(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts))
    }
}

// Removes a script name from the list of open scripts.
export function closeScript(shareid: string) {
    if (isOpen(shareid)) {
        if (openScripts.includes(shareid)) {
            openScripts.splice(openScripts.indexOf(shareid), 1)
            // save tabs state
            localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts))
        }
    } else if (isSharedScriptOpen(shareid)) {
        if (openSharedScripts.includes(shareid)) {
            openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1)
            // save tabs state
            localStorage.setItem(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts))
        }
    }
    return tabs.selectOpenTabs(store.getState()).slice()
}

// Removes a script name from the list of open shared scripts.
export function closeSharedScript(shareid: string) {
    if (isSharedScriptOpen(shareid)) {
        openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1)
        localStorage[LS_SHARED_TABS_KEY] = JSON.stringify(openSharedScripts)
    }
    return openSharedScripts
}

// Check if a script is open.
function isOpen(shareid: string) {
    return openScripts.indexOf(shareid) !== -1
}

// Check if a shared script is open.
function isSharedScriptOpen(shareid: string) {
    return openSharedScripts.indexOf(shareid) !== -1
}

// Save all open scripts.
export function saveAll() {
    const promises: Promise<any>[] = []
    for (const openScript of openScripts) {
        // do not auto-save collaborative scripts
        if (openScript in scripts && !scripts[openScript].saved && !scripts[openScript].collaborative) {
            promises.push(saveScript(scripts[openScript].name, scripts[openScript].source_code))
        }
    }
    return promises
}

export function getTutoringRecord(scriptid: string) {
    return postAuthForm("/services/scripts/gettutoringrecord", { scriptid }).then(function (result: any) {
        return result.data
    })
}

export function uploadCAIHistory(project: string, node: any) {
    const data = { username: getUsername(), project, node: JSON.stringify(node) }
    postForm("/services/scripts/uploadcaihistory", data).then(function() {
        console.log("saved to CAI history:", project, node)
    }).catch(function(err: Error) {
        console.log("could not save to cai", project, node)
        throw err
    })
}
