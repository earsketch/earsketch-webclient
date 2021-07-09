// TODO: Merge with userState as appropriate.
import i18n from "i18next"
import xml2js from "xml2js"

import { openModal } from "./App"
import * as audioLibrary from "./audiolibrary"
import * as cai from "../cai/caiState"
import * as collaboration from "./collaboration"
import { Script } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { openShare } from "../ide/IDE"
import reporter from "./reporter"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import { RenameScript } from "./Rename"
import * as tabs from "../ide/tabState"
import * as userNotification from "../user/notification"
import * as websocket from "./websocket"

const USER_STATE_KEY = "userstate"

export const STATUS_SUCCESSFUL = 1
export const STATUS_UNSUCCESSFUL = 2

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
        const response = await fetch(url)
        if (!response.ok) {
            throw `error code: ${response.status}`
        }
        const text = await response.text()
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
        // TODO: Server endpoints should always return a valid JSON object or an error - not an empty response.
        const response = await fetch(url, {
            method: "POST",
            body: form(data),
            headers: { "Accept": "application/json" },
        })
        if (!response.ok) {
            throw `error code: ${response.status}`
        }
        const text = await response.text()
        return text ? JSON.parse(text) : null
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
    try {
        const response = await fetch(url, { method: "POST" })
        if (!response.ok) {
            throw `error code: ${response.status}`
        }
        const text = await response.text()
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
    try {
        const response = await fetch(url + (params ? "?" + new URLSearchParams(params) : ""), {
            method: "POST",
            headers: new Headers({ "Content-Type": "application/xml" }),
            body: xml,
        })
        if (!response.ok) {
            throw `error code: ${response.status}`
        }
        const text = await response.text()
        return xml2js.parseStringPromise(text, { explicitArray: false, explicitRoot: false })
    } catch (err) {
        esconsole(`postXML failed: ${url}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}

async function postXMLAuth(endpoint: string, xml: string) {
    return postXML(endpoint, xml, { username: getUsername(), password: getPassword() })
}


export function loadLocalScripts() {
    // Migration code: if any anonymous users have saved scripts from before PR #198, bring them in to Redux state.
    const LS_SCRIPTS_KEY = "scripts_v1"
    const scriptData = localStorage.getItem(LS_SCRIPTS_KEY)
    if (scriptData !== null) {
        const scripts = JSON.parse(scriptData) as { [key: string]: Script }
        store.dispatch(scriptsState.setRegularScripts(Object.assign({}, scriptsState.selectRegularScripts(store.getState()), scripts)))
        localStorage.removeItem(LS_SCRIPTS_KEY)
    }

    // Back up active tab. (See comment below re. setActiveTabAndEditor.)
    const activeTab = tabs.selectActiveTabID(store.getState())
    const openTabs = tabs.selectOpenTabs(store.getState())
    for (const scriptID of openTabs) {
        // TODO: Right now, setActiveTabAndEditor is the only action that creates new editor sessions.
        // This is unfortunate, because we don't actually want to change the active tab here - just create the editor session.
        store.dispatch(tabs.setActiveTabAndEditor(scriptID))
    }
    store.dispatch(tabs.setActiveTabAndEditor(activeTab!))
}

// The script content from server may need adjustment in the collaborators parameter.
function fixCollaborators(script: Script, username?: string) {
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
function extractScripts(data: any): Script[] {
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
    reporter.login(username)
    // TODO: Don't store the password!
    storeUser(username, password)

    // register callbacks to the collaboration service
    collaboration.callbacks.refreshScriptBrowser = refreshCodeBrowser
    // TODO: potential race condition with server-side script renaming operation?
    collaboration.callbacks.refreshSharedScriptBrowser = getSharedScripts
    collaboration.callbacks.closeSharedScriptIfOpen = (id: string) => store.dispatch(tabs.closeTab(id))

    // register callbacks / member values in the userNotification service
    userNotification.callbacks.addSharedScript = addSharedScript

    websocket.connect(username)
    collaboration.setUserName(username)

    // used for managing websocket notifications locally
    userNotification.user.loginTime = Date.now()

    esconsole('List of scripts in Load script list successfully updated.', ["debug", "user"])

    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState())
    }

    // Copy scripts local storage to the web service.
    // TODO: Break out into separate function?
    const saved = scriptsState.selectRegularScripts(store.getState())
    await refreshCodeBrowser()
    if (Object.keys(saved).length > 0) {
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

        store.dispatch(tabs.resetTabs())

        const savedScripts = await Promise.all(promises)

        await refreshCodeBrowser()
        // once all scripts have been saved open them
        for (const savedScript of savedScripts) {
            if (savedScript) {
                store.dispatch(tabs.setActiveTabAndEditor(savedScript.shareid))
            }
        }
    }

    const shareID = ESUtils.getURLParameter("sharing")
    const sharedScripts = scriptsState.selectSharedScripts(store.getState())
    if (shareID && sharedScripts[shareID]) {
        // User opened share link, and they haven't imported or deleted the shared script.
        await openShare(shareID)
    }

    // load scripts in shared browser
    return getSharedScripts()
}

export async function refreshCodeBrowser() {
    if (isLoggedIn()) {
        const data = await postAuthForm("/services/scripts/findall")
        const fetchedScripts = extractScripts(data)

        store.dispatch(scriptsState.resetRegularScripts())

        const scripts: { [key: string]: Script } = {}
        for (const script of fetchedScripts) {
            script.modified = ESUtils.parseDate(script.modified as string)
            // set this flag to false when the script gets modified
            // then set it to true when the script gets saved
            script.saved = true
            script.tooltipText = ""
            scripts[script.shareid] = script
            fixCollaborators(script)
        }
        store.dispatch(scriptsState.setRegularScripts(scripts))
    } else {
        throw new Error("This should never be called for anonymous users.")
    }
}

// Fetch a script's history, authenticating via username and password.
// Resolves to a list of historical scripts.
export async function getScriptHistory(scriptid: string) {
    esconsole("Getting script history: " + scriptid, ["debug", "user"])
    const data = await postAuthForm("/services/scripts/scripthistory", { scriptid })
    const scripts = extractScripts(data)
    for (const script of scripts) {
        script.created = ESUtils.parseDate(script.created as string)
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
    const sharedScripts: { [key: string]: Script } = {}
    const data = await postAuthForm("/services/scripts/getsharedscripts")
    const scripts = extractScripts(data)
    for (const script of scripts) {
        script.isShared = true
        fixCollaborators(script, getUsername())
        sharedScripts[script.shareid] = script
    }
    store.dispatch(scriptsState.setSharedScripts(sharedScripts))
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
    store.dispatch(scriptsState.resetRegularScripts())
    store.dispatch(scriptsState.resetSharedScripts())
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
        // TODO: Simplify what the server expects. (`exists` is an artifact of the old UI.)
        users: users.map(id => ({ id, exists: true })),
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
            userNotification.show(i18n.t('messages:user.badsharelink'), "failure1", 3)
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
export async function setLicense(scriptName: string, id: string, licenseID: string){
    if (isLoggedIn()) {
        try {
            // TODO: Why doesn't this endpoint require authentication?
            await get("/services/scripts/setscriptlicense", { scriptname: scriptName, username: getUsername(), license_id: licenseID })
        } catch (err) {
            esconsole("Could not set license id: " + licenseID + " to " + scriptName, "debug")
            esconsole(err, ["error"])
        }
        esconsole("Set License Id " + licenseID + " to " + scriptName, "debug")
        store.dispatch(scriptsState.setScriptLicense({ id, licenseID }))
    }
}

// save a sharedscript into user's account.
export async function saveSharedScript(scriptid: string, scriptname: string, sourcecode: string, username: string) {
    let script
    if (isLoggedIn()) {
        script = await postAuth("/services/scripts/savesharedscript", { scriptid })
        esconsole(`Save shared script ${script.name} to ${username}`, ["debug", "user"])
        script = { ...script, isShared: true, readonly: true, modified: Date.now() }
    } else {
        script = {
            name: scriptname,
            shareid: scriptid,
            modified: Date.now(),
            source_code: sourcecode,
            isShared: true,
            readonly: true,
            username,
        } as Script
    }
    const sharedScripts = scriptsState.selectSharedScripts(store.getState())
    store.dispatch(scriptsState.setSharedScripts({ ...sharedScripts, [scriptid]: script }))
    return script
}

// Delete a script if owned by the user.
export async function deleteScript(scriptid: string) {
    if (isLoggedIn()) {
        // User is logged in so make a call to the web service
        try {
            const script = await postAuth("/services/scripts/delete", { scriptid })
            esconsole("Deleted script: " + scriptid, "debug")

            const scripts = scriptsState.selectRegularScripts(store.getState())
            if (scripts[scriptid]) {
                script.modified = Date.now()
                store.dispatch(scriptsState.setRegularScripts({ ...scripts, [scriptid]: script }))
                fixCollaborators(scripts[scriptid])
            } else {
                // script doesn't exist
            }
        } catch (err) {
            esconsole("Could not delete script: " + scriptid, "debug")
            esconsole(err, ["user", "error"])
        }
    } else {
        // User is not logged in so alter local storage
        const scripts = scriptsState.selectRegularScripts(store.getState())
        const script = { ...scripts[scriptid], soft_delete: true }
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [scriptid]: script }))
    }
}

async function promptForRename(script: Script) {
    const oldName = script.name
    const name = await openModal(RenameScript, { script, conflict: true })
    return { ...script, name: name ?? nextName(oldName) }
}

// Restore a script deleted by the user.
export async function restoreScript(script: Script) {
    if (lookForScriptByName(script.name, true)) {
        script = await promptForRename(script)
        await renameScript(script, script.name)
    }

    if (isLoggedIn()) {
        const restored = {
            ...await postAuth("/services/scripts/restore", { scriptid: script.shareid }),
            saved: true,
            modified: Date.now(),
        }
        esconsole("Restored script: " + restored.shareid, "debug")
        const scripts = scriptsState.selectRegularScripts(store.getState())
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [restored.shareid]: restored }))
        return restored
    } else {
        script.modified = Date.now()
        script.soft_delete = false
        const scripts = scriptsState.selectRegularScripts(store.getState())
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [script.shareid]: script }))
        return script
    }
}

// Import a script by checking if it is shared or not, and saving it to
// the user workspace. Returns a promise which resolves to the saved script.
export async function importScript(script: Script) {
    if (lookForScriptByName(script.name)) {
        script = await promptForRename(script)
    }

    if (script.isShared) {
        // The user is importing a shared script - need to call the webservice.
        const imported = await importSharedScript(script.shareid)
        return renameScript(imported, script.name)
    } else {
        // The user is importing a read-only script (e.g. from the curriculum).
        return saveScript(script.name, script.source_code)
    }
}

export async function importCollaborativeScript(script: Script) {
    let originalScriptName = script.name
    if (lookForScriptByName(script.name)) {
        await promptForRename(script)
    }
    const text = await collaboration.getScriptText(script.shareid)
    userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`)
    collaboration.closeScript(script.shareid)
    return saveScript(script.name, text)
}

// Delete a shared script if owned by the user.
export async function deleteSharedScript(scriptid: string) {
    if (isLoggedIn()) {
        await postAuth("/services/scripts/deletesharedscript", { scriptid })
        esconsole("Deleted shared script: " + scriptid, "debug")
    }
    const { [scriptid]: _, ...sharedScripts } = scriptsState.selectSharedScripts(store.getState())
    store.dispatch(scriptsState.setSharedScripts(sharedScripts))
}

// Set a shared script description if owned by the user.
export async function setScriptDesc(scriptname: string, id: string, description: string="") {
    if (isLoggedIn()) {
        // TODO: These values (especially the description) should be escaped.
        const xml = `<scripts><username>${getUsername()}</username><name>${scriptname}</name><description><![CDATA[${description}]]></description></scripts>`
        await postXML("/services/scripts/setscriptdesc", xml)
        store.dispatch(scriptsState.setScriptDescription({ id, description }))
    }
    // TODO: Currently script license and description of local scripts are NOT synced with web service on login.
}

// Import a shared script to the user's owned script list.
async function importSharedScript(scriptid: string) {
    let script
    const sharedScripts = scriptsState.selectSharedScripts(store.getState())
    if (isLoggedIn()) {
        script = await postAuthForm("/services/scripts/import", { scriptid }) as Script
    } else {
        script = sharedScripts[scriptid]
        script = {
            ...script,
            creator: script.username,
            original_id: script.shareid,
            collaborative: false,
            readonly: false,
            // TODO: Here and in saveScript(), have a more robust method of generating share IDs...
            shareid: ESUtils.randomString(22),
        }
    }
    const { [scriptid]: _, ...updatedSharedScripts } = sharedScripts
    store.dispatch(scriptsState.setSharedScripts(updatedSharedScripts))
    const scripts = scriptsState.selectRegularScripts(store.getState())
    store.dispatch(scriptsState.setRegularScripts({ ...scripts, [script.shareid]: script }))
    esconsole("Import script " + scriptid, ["debug", "user"])
    return script
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
}

// Rename a script if owned by the user.
export async function renameScript(script: Script, newName: string) {
    const id = script.shareid
    if (isLoggedIn()) {
        await postAuth("/services/scripts/rename", { scriptid: id, scriptname: newName })
        esconsole(`Renamed script: ${id} to ${newName}`, ["debug", "user"])
    }
    store.dispatch(scriptsState.setScriptName({ id, name: newName }))
    return { ...script, name: newName }
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
        return postAdminForm("/services/scripts/removeuserrole", { username, role })
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

// Search users and return user details - intended for admin use
export async function searchUsers(username: string) {
    return (await get("/services/scripts/searchuser", { query: username }))
}

// Set a user password with admin passphrase as credentials
export async function setPasswordForUser(username: string, password: string, adminPassphrase: string) {
    if (!isLoggedIn()) {
        throw "Login failure"
    }
    const adminpwd = getPassword()
    if (adminpwd === null) {
        throw "Missing admin password"
    }

    esconsole("Admin setting a new password for user")
    const data = {
        adminid: getUsername(),
        adminpwd,
        adminpp: btoa(adminPassphrase),
        username,
        newpassword: encodeURIComponent(btoa(password)),
    }
    await postForm("/services/scripts/modifypwdadmin", data)
    userNotification.show("Successfully set a new password for " + username, "history", 3)
}

// If a scriptname already is taken, find the next possible name by appending a number (1), (2), etc...
function nextName(scriptname: string) {
    const name = ESUtils.parseName(scriptname)
    const ext = ESUtils.parseExt(scriptname)

    const matchedNames = new Set()
    const scripts = scriptsState.selectRegularScripts(store.getState())
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
    const scripts = scriptsState.selectRegularScripts(store.getState())
    return Object.keys(scripts).some(id => !([true, "1"].includes(scripts[id].soft_delete as any) && ignoreDeletedScripts) && scripts[id].name === scriptname)
}

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export async function saveScript(scriptname: string, source_code: string, overwrite: boolean=true, status: number=0) {
    const name = overwrite ? scriptname : nextName(scriptname)
    const scripts = scriptsState.selectRegularScripts(store.getState())

    if (isLoggedIn()) {
        reporter.saveScript()
        // TODO: These values (especially the source code) should be escaped.
        const xml = `<scripts><username>${getUsername()}</username>` + 
                    `<name>${name}</name><run_status>${status}</run_status>` +
                    `<source_code><![CDATA[${source_code}]]></source_code></scripts>`
        const script = await postXMLAuth("/services/scripts/save", xml) as Script
        esconsole(`Saved script ${name} with shareid ${script.shareid}`, "user")
        script.modified = Date.now()
        script.saved = true
        script.tooltipText = ""
        fixCollaborators(script)
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [script.shareid]: script }))
        return script
    } else {
        let shareid
        if (overwrite) {
            const match = Object.values(scripts).find(v => v.name === name)
            shareid = match?.shareid
        }
        if (shareid === undefined) {
            shareid = ESUtils.randomString(22)
        }

        const script = { 
            name, shareid, source_code,
            modified: Date.now(),
            saved: true,
            tooltipText: "",
            collaborators: [],
        } as any as Script
        store.dispatch(scriptsState.setRegularScripts({ ...scripts, [script.shareid]: script }))
        return script
    }
}

// Creates a new empty script and adds it to the list of open scripts, and saves it to a user's library.
export async function createScript(scriptname: string) {
    const language = ESUtils.parseLanguage(scriptname)
    const script = await saveScript(scriptname, i18n.t(`templates:${language}`))
    return script
}

export async function getTutoringRecord(scriptid: string) {
    return postAuthForm("/services/scripts/gettutoringrecord", { scriptid })
}

export async function uploadCAIHistory(project: string, node: any) {
    const data = { username: getUsername(), project, node: JSON.stringify(node) }
    await postForm("/services/scripts/uploadcaihistory", data)
    console.log("saved to CAI history:", project, node)
}
