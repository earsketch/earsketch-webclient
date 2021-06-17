// TODO: Merge with userState as appropriate.
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
import i18n from "i18next"

const USER_STATE_KEY = "userstate"

const LS_TABS_KEY = "tabs_v2"
const LS_SHARED_TABS_KEY = "shared_tabs_v1"
const LS_SCRIPTS_KEY = "scripts_v1"

export const STATUS_SUCCESSFUL = 1
export const STATUS_UNSUCCESSFUL = 2

const notificationsMarkedAsRead: string[] = []

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
export let scripts: { [key: string]: ScriptEntity } = {}
export const sharedScripts: { [key: string]: ScriptEntity } = {}

// Script IDs that are currently open.
export const openScripts: string[] = []
const openSharedScripts: string[] = []

// Helper functions for making API requests.
export function form(obj: { [key: string]: string | Blob }={}) {
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
export async function get(endpoint: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint + (params ? "?" + new URLSearchParams(params) : "")
    try {
        // TODO: Server endpoints should always return a valid JSON object or an error - not an empty response.
        const text = await (await fetch(url)).text()
        return text ? JSON.parse(text) : null
    } catch (err) {
        esconsole(`get failed: ${url}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}

// Expects form data, returns JSON.
export async function postForm(endpoint: string, data?: { [key: string]: string | Blob }) {
    const url = URL_DOMAIN + endpoint
    try {
        return (await fetch(url, { method: "POST", body: form(data) })).json()
    } catch (err) {
        esconsole(`postForm failed: ${url}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}

export async function postAuthForm(endpoint: string, data: { [key: string]: string | Blob }={}) {
    return postForm(endpoint, { username: getUsername(), password: getPassword(), ...data })
}

async function postAdminForm(endpoint: string, data: { [key: string]: string | Blob }={}) {
    return postForm(endpoint, { adminusername: getUsername(), password: getPassword(), ...data })
}

// Expects query parameters, returns XML.
export async function post(endpoint: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint + (params ? "?" + new URLSearchParams(params) : "")
    const text = await (await fetch(url, { method: "POST" })).text()
    try {
        return xml2js.parseStringPromise(text, { explicitArray: false, explicitRoot: false })
    } catch (err) {
        esconsole(`post failed: ${url}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}

async function postAuth(endpoint: string, params: { [key: string]: string }) {
    return post(endpoint, { username: getUsername(), password: getPassword(), ...params })
}

// Expects XML, returns XML.
async function postXML(endpoint: string, xml: string, params?: { [key: string]: string }) {
    const url = URL_DOMAIN + endpoint
    const response = await fetch(url + (params ? "?" + new URLSearchParams(params) : ""), {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/xml" }),
        body: xml,
    })
    const text = await response.text()
    return xml2js.parseStringPromise(text, { explicitArray: false, explicitRoot: false })
}

async function postXMLAuth(endpoint: string, xml: string) {
    return postXML(endpoint, xml, { username: getUsername(), password: getPassword() })
}

// websocket gets closed before onunload in FF
window.onbeforeunload = () => {
    if (isLoggedIn()) {
        let saving = false
        const username = getUsername()

        for (const shareID of openScripts) {
            if (scripts[shareID] && scripts[shareID].collaborative) {
                collaboration.leaveSession(shareID, username)
            }

            if (scripts[shareID] && !scripts[shareID].saved) {
                saving = true
                saveScript(scripts[shareID].name, scripts[shareID].source_code).then(() => {
                    store.dispatch(scriptsState.syncToNgUserProject())
                    userNotification.show(i18n.t('messages:user.scriptcloud'), "success")
                })
            }
        }

        for (const shareID of openSharedScripts) {
            if (sharedScripts[shareID] && sharedScripts[shareID].collaborative) {
                collaboration.leaveSession(shareID, username)
            }
        }

        // TODO: may not be properly working... check!
        if (notificationsMarkedAsRead.length) {
            for (const notification_id of notificationsMarkedAsRead) {
                esconsole(`marking notification ${notification_id} as read`, "user")
                postAuthForm("/services/scripts/markread", { notification_id })
            }
        }
        return saving  // Show warning popover if true.
    } else {
        if (localStorage.getItem(LS_SCRIPTS_KEY) !== null) {
            localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
        }
    }
}

export function loadLocalScripts() {
    // Load scripts from local storage if they are available. When a user logs in
    // these scripts will be saved to the web service and deleted from local storage.
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
    for (const key of Object.keys(scripts)) {
        delete scripts[key]
    }
}

function resetSharedScripts() {
    for (const key of Object.keys(sharedScripts)) {
        delete sharedScripts[key]
    }
}

function resetOpenScripts() {
    while (openScripts.length > 0) {
        const popped = openScripts.pop()!

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
function fixCollaborators(script: ScriptEntity, username?: string) {
    if (script.collaborators === undefined) {
        script.collaborators = []
    } else if (typeof script.collaborators === "string") {
        script.collaborators = [script.collaborators]
    }

    if (username) {
        // for shared-script browser: treat script as collaborative only when the user is listed among collaborators
        // #1858: List of collaborators may be recorded in mixed case (inconsistently).
        if (script.collaborators.length !== 0
            && script.collaborators.map((user: string) => user.toLowerCase()).includes(username.toLowerCase())) {
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
}

// Get an array of scripts, regardless of data (which might be null, or data.scripts might be a single object).
function extractScripts(data: any): ScriptEntity[] {
    if (data === null) {
        return []
    } else if (Array.isArray(data.scripts)) {
        return data.scripts
    } else {
        return [data.scripts]
    }
}

// Login, setup, restore scripts, return shared scripts.
export async function login(username: string, password: string) {
    esconsole("Using username: " + username, ["debug", "user"])
    const data = await postForm("/services/scripts/findall", { username, password: btoa(password) })
    reporter.login(username)
    // TODO: Don't store the password!
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

    esconsole('List of scripts in Load script list successfully updated.', ["debug", "user"])
    const storedScripts = extractScripts(data)
    resetScripts()

    // update user project scripts
    for (const script of storedScripts) {
        // reformat saved date to ISO 8601 format
        const offset = new Date().getTimezoneOffset()
        script.modified = formatDateToISO(script.modified as string) + offset * 60000
        scripts[script.shareid] = script
        // set this flag to false when the script gets modified
        // then set it to true when the script gets saved
        script.saved = true
        script.tooltipText = ""
        fixCollaborators(script)
    }

    // when the user logs in and his/her scripts are loaded, we can restore
    // their previous tab session stored in the browser's local storage
    const embedMode = appState.selectEmbedMode(store.getState())
    if (!embedMode) {
        const tabData = localStorage.getItem(LS_TABS_KEY)
        if (tabData !== null) {
            openScripts.push(...Object.values(JSON.parse(tabData)) as string[])
        }
        const sharedTabData = localStorage.getItem(LS_SHARED_TABS_KEY)
        if (sharedTabData !== null) {
            openSharedScripts.push(...Object.values(JSON.parse(sharedTabData)) as string[])
        }
        const activeTabID = tabs.selectActiveTabID(store.getState())
        if (activeTabID) {
            store.dispatch(tabs.setActiveTabAndEditor(activeTabID))
        }
    }

    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState())
    }

    // Copy scripts local storage to the web service.
    // TODO: Break out into separate function?
    const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
    if (scriptData !== null) {
        const saved = JSON.parse(scriptData) as { [key: string]: ScriptEntity }
        const promises = []
        for (const script of Object.values(saved)) {
            if (!script.soft_delete) {
                if (script.creator !== undefined && script.creator !== username) {
                    if (script.original_id !== undefined) {
                        promises.push(importSharedScript(script.original_id))
                    }
                } else {
                    const tabEditorSession = tabs.getEditorSession(script.shareid)
                    if (tabEditorSession) {
                        promises.push(saveScript(script.name, tabs.getEditorSession(script.shareid).getValue(), false))
                    }
                }
            }
        }

        resetOpenScripts()
        store.dispatch(tabs.resetTabs())

        const savedScripts = await Promise.all(promises)
        localStorage.removeItem(LS_SCRIPTS_KEY)
        localStorage.removeItem(LS_TABS_KEY)
        localStorage.removeItem(LS_SHARED_TABS_KEY)

        await refreshCodeBrowser()
        // once all scripts have been saved open them
        for (const savedScript of savedScripts) {
            if (savedScript) {
                openScript(savedScript.shareid)
                store.dispatch(tabs.setActiveTabAndEditor(savedScript.shareid))
            }
        }
    }
    // load scripts in shared browser
    return getSharedScripts()
}

export async function refreshCodeBrowser() {
    if (isLoggedIn()) {
        const data = await postAuthForm("/services/scripts/findall")
        const fetchedScripts = extractScripts(data)

        resetScripts()

        for (const script of fetchedScripts) {
            // reformat saved date to ISO 8601 format
            script.modified = formatDateToISO(script.modified as string)
            // set this flag to false when the script gets modified
            // then set it to true when the script gets saved
            script.saved = true
            script.tooltipText = ""
            scripts[script.shareid] = script
            fixCollaborators(script)
        }
    } else {
        const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
        if (scriptData !== null) {
            const r = JSON.parse(scriptData)
            resetScripts()
            for (const i in r) {
                const script = r[i]
                script.saved = true
                script.tooltipText = ""
                fixCollaborators(script)
                scripts[script.shareid] = script
            }
        }
    }
}

// Format a date to ISO 8601
// TODO: dates should be stored in the database so as to make this unnecessary
function formatDateToISO(date: string) {
    // Format created date to ISO 8601
    const isoFormat = date.slice(0,-2).replace(" ", "T")
    // javascript Date.parse() requires ISO 8601
    return Date.parse(isoFormat)
}

// Fetch a script's history, authenticating via username and password.
// Resolves to a list of historical scripts.
export async function getScriptHistory(scriptid: string) {
    esconsole("Getting script history: " + scriptid, ["debug", "user"])
    const data = await postAuthForm("/services/scripts/scripthistory", { scriptid })
    const scripts = extractScripts(data)
    for (const script of scripts) {
        script.created = formatDateToISO(script.created as string)
    }
    return scripts
}

// Fetch a specific version of a script.
export async function getScriptVersion(scriptid: string, versionid: number) {
    esconsole("Getting script history: " + scriptid + "  version: " + versionid, ["debug", "user"])
    const data = await postAuthForm("/services/scripts/scriptversion", { scriptid, versionid: versionid + "" })
    return data === null ? [] : [data]
}

// Get shared scripts in the user account. Returns a promise that resolves to a list of user's shared script objects.
export async function getSharedScripts() {
    resetSharedScripts()
    const data = await postAuthForm("/services/scripts/getsharedscripts")
    const scripts = extractScripts(data)
    for (const script of scripts) {
        script.isShared = true
        fixCollaborators(script, getUsername())
        sharedScripts[script.shareid] = script
    }
    return scripts
}

// Get shared id for locked version of latest script.
export async function getLockedSharedScriptId(shareid: string){
    return (await get("/services/scripts/getlockedshareid", { shareid })).shareid
}

// Save a username and password to local storage to persist between sessions.
function storeUser(username: string, password: string) {
    localStorage.setItem(USER_STATE_KEY, JSON.stringify({ username, password }))
}

// Get a username and password from local storage, if it exists.
export function loadUser() {
    const userState = localStorage.getItem(USER_STATE_KEY)
    return userState === null ? null : JSON.parse(userState)
}

// Delete a user saved to local storage. I.e., logout.
export function clearUser() {
    // TODO: use tunnelled
    resetOpenScripts()
    resetSharedOpenScripts()
    resetScripts()
    resetSharedScripts()
    localStorage.clear()
    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState())
    }
    websocket.disconnect()
}

// Check if a user is stored in local storage.
export function isLoggedIn() {
    return localStorage.getItem(USER_STATE_KEY) !== null
}

// Get a username from local storage.
export function getUsername(): string {
    return loadUser()?.username
}

// Set a users new password.
export function setPassword(pass: string) {
    if (isLoggedIn()) {
        storeUser(getUsername()!, pass)
    }
}

// Get the password from local storage.
// TODO: Don't store the password in local storage! See #2406.
// NOTE: The server expects this to be base64-encoded.
export function getPassword() {
    return btoa(loadUser().password)
}

export function shareWithPeople(shareid: string, users: string[]) {
    const data = {
        notification_type: "sharewithpeople",
        username: getUsername(),
        scriptid: shareid,
        users,
    }

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
        if (sharing && data === "") {
            if (!userNotification.state.isInLoadingScreen) {
                userNotification.show(i18n.t('messages:user.badsharelink'), "failure1", 3)
            }
            throw "Script was not found."
        }
        return data
    } catch {
        esconsole("Failure getting script id: " + id, ["error", "user"])
    }
}

// Deletes an audio key if owned by the user.
export async function deleteAudio(audiokey: string) {
    try {
        await postAuth("/services/audio/delete", { audiokey })
        esconsole("Deleted audiokey: " + audiokey, ["debug", "user"])
        audioLibrary.clearAudioTagCache()  // otherwise the deleted audio key is still usable by the user
    } catch (err) {
        esconsole(err, ["error", "userproject"])
    }
}

// Rename an audio key if owned by the user.
export async function renameAudio(audiokey: string, newaudiokey: string) {
    try {
        await postAuth("/services/audio/rename", { audiokey, newaudiokey })
        esconsole(`Successfully renamed audiokey: ${audiokey} to ${newaudiokey}`, ["debug", "user"])
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
    const data: { [key: string]: string } = { username: username_ ?? getUsername(), password: password ? btoa(password) : getPassword() }
    const { username, email, first_name, last_name, role } = await postForm("/services/scripts/getuserinfo", data)
    return { username, email, firstname: first_name ?? "", lastname: last_name ?? "", role }
}

// Set a script license id if owned by the user.
export async function setLicense(scriptName: string, scriptId: string, licenseID: string){
    if (isLoggedIn()) {
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
    if (isLoggedIn()) {
        const script = await postAuth("/services/scripts/savesharedscript", { scriptid })
        esconsole(`Save shared script ${script.name} to ${username}`, ["debug", "user"])
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
        } as ScriptEntity
    }
}

// Delete a script if owned by the user.
export async function deleteScript(scriptid: string) {
    if (isLoggedIn()) {
        // User is logged in so make a call to the web service
        try {
            const script = await postAuth("/services/scripts/delete", { scriptid })
            esconsole("Deleted script: " + scriptid, "debug")

            if (scripts[scriptid]) {
                scripts[scriptid] = script
                scripts[scriptid].modified = Date.now()
                fixCollaborators(scripts[scriptid])
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

async function promptForRename(script: ScriptEntity) {
    const oldName = script.name
    await helpers.getNgService("$uibModal").open({
        component: "renameController",
        size: 100,
        resolve: { script: () => script, conflict: () => true },
    }).result

    if (script.name === oldName) {
        script.name = nextName(oldName)
    }
}

// Restore a script deleted by the user.
export async function restoreScript(script: ScriptEntity) {
    if (lookForScriptByName(script.name, true)) {
        await promptForRename(script)
        renameScript(script.shareid, script.name)
    }

    if (isLoggedIn()) {
        const restored = await postAuth("/services/scripts/restore", { scriptid: script.shareid })
        esconsole("Restored script: " + restored.shareid, "debug")
        scripts[restored.shareid] = { ...restored, saved: true, modified: Date.now() }
        return restored
    } else {
        scripts[script.shareid].modified = Date.now()
        scripts[script.shareid].soft_delete = false
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
    }
}

// Import a script by checking if it is shared or not, and saving it to
// the user workspace. Returns a promise which resolves to the saved script.
export async function importScript(script: ScriptEntity) {
    if (lookForScriptByName(script.name)) {
        await promptForRename(script)
    }

    if (script.isShared) {
        // The user is importing a shared script - need to call the webservice.
        if (isLoggedIn()) {
            const imported = await importSharedScript(script.shareid)
            renameScript(imported.shareid, script.name)
            imported.name = script.name
            return Promise.resolve(imported)
        } else {
            throw i18n.t('messages:general.unauthenticated')
        }
    } else {
        // The user is importing a read-only script (e.g. from the curriculum).
        return saveScript(script.name, script.source_code)
    }
}

export async function importCollaborativeScript(script: ScriptEntity) {
    let originalScriptName = script.name
    if (lookForScriptByName(script.name)) {
        await promptForRename(script)
    }
    const text = await collaboration.getScriptText(script.shareid)
    userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`)
    collaboration.closeScript(script.shareid, getUsername())
    return saveScript(script.name, text)
}

// Delete a shared script if owned by the user.
export async function deleteSharedScript(scriptid: string) {
    if (isLoggedIn()) {
        await postAuth("/services/scripts/deletesharedscript", { scriptid })
        esconsole("Deleted shared script: " + scriptid, "debug")
        closeSharedScript(scriptid)
        delete sharedScripts[scriptid]
    } else {
        closeSharedScript(scriptid)
        delete sharedScripts[scriptid]
    }
}

// Set a shared script description if owned by the user.
export async function setScriptDesc(scriptname: string, scriptId: string, desc: string="") {
    if (isLoggedIn()) {
        // TODO: These values (especially the description) should be escaped.
        const xml = `<scripts><username>${getUsername()}</username><name>${scriptname}</name><description><![CDATA[${desc}]]></description></scripts>`
        await postXML("/services/scripts/setscriptdesc", xml)
        scripts[scriptId].description = desc
    }
}

// Import a shared script to the user's owned script list.
async function importSharedScript(scriptid: string) {
    if (isLoggedIn()) {
        const data = await postAuth("/services/scripts/import", { scriptid })
        if (scriptid) {
            delete sharedScripts[scriptid]
        }
        closeSharedScript(scriptid)
        esconsole("Import script " + scriptid, ["debug", "user"])
        return data
    }
}

export async function openSharedScriptForEdit(shareID: string) {
    if (isLoggedIn()) {
        const importedScript = await importSharedScript(shareID)
        await refreshCodeBrowser()
        openScript(importedScript.shareid)
    } else {
        const script = await loadScript(shareID, true)
        // save with duplicate check
        const savedScript = await importScript(script)
        // add sharer's info
        savedScript.creator = script.username
        savedScript.original_id = shareID
        openScript(savedScript.shareid)
        // re-save to local with above updated info
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
    }
}

// Only add but not open a shared script (view-only) shared by another user. Script is added to the shared-script browser.
async function addSharedScript(shareID: string, notificationID: string) {
    if (isLoggedIn()) {
        const scriptList = await getSharedScripts()
        if (!scriptList.some(script => script.shareid === shareID)) {
            const script = await loadScript(shareID, true)
            await saveSharedScript(shareID, script.name, script.source_code, script.username)
            getSharedScripts()
        }
    }
    // prevent repeated import upon page refresh by marking the notification message "read." The message may still appear as unread for the current session.
    // TODO: separate this process from userProject if possible
    if (notificationID) {
        notificationsMarkedAsRead.push(notificationID)
    }
}

// Rename a script if owned by the user.
export async function renameScript(scriptid: string, newName: string) {
    if (isLoggedIn()) {
        await postAuth("/services/scripts/rename", { scriptid, scriptname: newName })
        esconsole(`Renamed script: ${scriptid} to ${newName}`, ["debug", "user"])
        scripts[scriptid].name = newName
    } else {
        scripts[scriptid].name = newName
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
        return Promise.resolve(null)
    }
}

// Get all users and their roles
export async function getAllUserRoles() {
    if (isLoggedIn()) {
        return (await postAdminForm("/services/scripts/getalluserroles")).users
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

// Add role to user
export async function addRole(username: string, role: string) {
    if (isLoggedIn()) {
        return postAdminForm("/services/scripts/adduserrole", { username, role })
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

// Remove role from user
export async function removeRole(username: string, role: string) {
    if (isLoggedIn()) {
        return postAdminForm("/services/scripts/adduserrole", { username, role })
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

export async function setPasswordForUser(userID: string, password: string, adminPassphrase: string) {
    if (!isLoggedIn()) {
        throw "Login failure"
    }
    const adminPwd = getPassword()
    if (adminPwd === null) {
        throw "Missing admin password"
    }

    esconsole("Admin setting a new password for user")
    const data = {
        adminid: getUsername(),
        adminpwd: adminPwd,
        adminpp: btoa(adminPassphrase),
        username: userID,
        newpassword: encodeURIComponent(btoa(password)),
    }
    await postForm("/services/scripts/modifypwdadmin", data)
    userNotification.show("Successfully set a new password for user: " + userID + " with password: " + password, "history", 3)
}

// If a scriptname already is taken, find the next possible name by appending a number (1), (2), etc...
function nextName(scriptname: string) {
    const name = ESUtils.parseName(scriptname)
    const ext = ESUtils.parseExt(scriptname)

    const matchedNames = new Set()
    for (const script of Object.values(scripts)) {
        if (script.name.startsWith(name)) {
            matchedNames.add(script.name)
        }
    }

    for (let counter = 1; matchedNames.has(scriptname); counter++) {
        scriptname = name + "_" + counter + ext
    }

    return scriptname
}

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    return Object.keys(scripts).some(id => !(scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname)
}

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export async function saveScript(scriptname: string, source_code: string, overwrite: boolean=true, status: number=0) {
    const name = overwrite ? scriptname : nextName(scriptname)

    if (isLoggedIn()) {
        reporter.saveScript()
        // TODO: These values (especially the source code) should be escaped.
        const xml = `<scripts><username>${getUsername()}</username>` + 
                    `<name>${name}</name><run_status>${status}</run_status>` +
                    `<source_code><![CDATA[${source_code}]]></source_code></scripts>`
        const script = await postXMLAuth("/services/scripts/save", xml)
        esconsole(`Saved script ${name} with shareid ${script.shareid}`, "user")
        script.modified = Date.now()
        script.saved = true
        script.tooltipText = ""
        fixCollaborators(script)
        scripts[script.shareid] = script
        return scripts[script.shareid]
    } else {
        let shareid
        if (overwrite) {
            const match = Object.values(scripts).find(v => v.name === name)
            shareid = match?.shareid
        }
        if (shareid === undefined) {
            shareid = ESUtils.randomString(22)
        }

        scripts[shareid] = { 
            name, shareid, source_code,
            modified: Date.now(),
            saved: true,
            tooltipText: "",
            collaborators: [],
        } as any as ScriptEntity
        localStorage.setItem(LS_SCRIPTS_KEY, JSON.stringify(scripts))
        return scripts[shareid]
    }
}

// Creates a new empty script and adds it to the list of open scripts, and saves it to a user's library.
export async function createScript(scriptname: string) {
    const language = ESUtils.parseLanguage(scriptname)
    const script = await saveScript(scriptname, TEMPLATES[language as "python" | "javascript"])
    openScript(script.shareid)
    return script
}

// Adds a script to the list of open scripts. No effect if the script is already open.
export function openScript(shareid: string) {
    if (openScripts.includes(shareid)) {
        openScripts.push(shareid)
        localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts))
    }
    reporter.openScript()
    return openScripts.indexOf(shareid)
}

// Adds a shared script to the list of open shared scripts. If the script is already open, it does nothing.
export function openSharedScript(shareid: string) {
    if (openSharedScripts.includes(shareid)) {
        openSharedScripts.push(shareid)
        localStorage.setItem(LS_SHARED_TABS_KEY, JSON.stringify(openSharedScripts))
    }
}

// Removes a script name from the list of open scripts.
export function closeScript(shareid: string) {
    if (openScripts.includes(shareid)) {
        if (openScripts.includes(shareid)) {
            openScripts.splice(openScripts.indexOf(shareid), 1)
            // save tabs state
            localStorage.setItem(LS_TABS_KEY, JSON.stringify(openScripts))
        }
    } else if (openSharedScripts.includes(shareid)) {
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
    if (openSharedScripts.includes(shareid)) {
        openSharedScripts.splice(openSharedScripts.indexOf(shareid), 1)
        localStorage[LS_SHARED_TABS_KEY] = JSON.stringify(openSharedScripts)
    }
    return openSharedScripts
}

// Save all open scripts.
export function saveAll() {
    const promises = []
    for (const openScript of openScripts) {
        // do not auto-save collaborative scripts
        if (openScript in scripts && !scripts[openScript].saved && !scripts[openScript].collaborative) {
            promises.push(saveScript(scripts[openScript].name, scripts[openScript].source_code))
        }
    }
    return Promise.all(promises)
}

export async function getTutoringRecord(scriptid: string) {
    return postAuthForm("/services/scripts/gettutoringrecord", { scriptid })
}

export async function uploadCAIHistory(project: string, node: any) {
    const data = { username: getUsername(), project, node: JSON.stringify(node) }
    await postForm("/services/scripts/uploadcaihistory", data)
    console.log("saved to CAI history:", project, node)
}
