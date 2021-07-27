// TODO: Merge with userState as appropriate.
import i18n from "i18next"

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
import * as user from "../user/userState"
import * as userNotification from "../user/notification"
import * as websocket from "./websocket"

export const STATUS_SUCCESSFUL = 1
export const STATUS_UNSUCCESSFUL = 2

// Helper functions for making API requests.
export function form(obj: { [key: string]: string | Blob } = {}) {
    const data = new FormData()
    for (const [key, value] of Object.entries(obj)) {
        data.append(key, value)
    }
    return data
}

// Our API has the following kinds of endpoints:
// - GETs that take query params and return JSON or plain text.
// - POSTs that take x-www-form-urlencoded and return JSON, plain text, or nothing.
// - POSTs that take multipart/form-data and return JSON or nothing.
// Some endpoints return nothing on success, in which case their response code is 204.
// Many endpoints require authentication. These all accept Basic authentication (username + password),
// and most of them also accept Bearer authentication (token). This allows us to avoid storing the user's
// password in the client.

async function fetchAPI(endpoint: string, init?: RequestInit) {
    try {
        const response = await fetch(URL_DOMAIN + endpoint, init)
        if (!response.ok) {
            throw new Error(`error code: ${response.status}`)
        } else if (response.status === 204) {
            return undefined
        } else if (response.headers.get("Content-Type") === "application/json") {
            return response.json()
        } else {
            return response.text()
        }
    } catch (err) {
        esconsole(`request failed: ${endpoint}`, ["error", "user"])
        esconsole(err, ["error", "user"])
        throw err
    }
}

// Expects query parameters, returns JSON.
export function get(endpoint: string, params?: { [key: string]: string }, headers?: HeadersInit) {
    return fetchAPI(endpoint + (params ? "?" + new URLSearchParams(params) : ""), { headers })
}

export async function getAuth(endpoint: string, params?: { [key: string]: string }) {
    return get(endpoint, params, { Authorization: "Bearer " + getToken() })
}

export async function getBasicAuth(endpoint: string, username: string, password: string, params?: { [key: string]: string }) {
    return get(endpoint, params, { Authorization: "Basic " + btoa(username + ":" + password) })
}

// Expects form data, returns JSON or a string depending on response content type.
export async function post(endpoint: string, data?: { [key: string]: string }, headers?: HeadersInit) {
    return fetchAPI(endpoint, {
        method: "POST",
        body: new URLSearchParams(data),
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    })
}

export async function postAuth(endpoint: string, data: { [key: string]: string } = {}) {
    return post(endpoint, data, { Authorization: "Bearer " + getToken() })
}

export async function postBasicAuth(endpoint: string, username: string, password: string, data: { [key: string]: string } = {}) {
    return post(endpoint, data, { Authorization: "Basic " + btoa(username + ":" + password) })
}

export async function postForm(endpoint: string, data: { [key: string]: string | Blob }) {
    return fetchAPI(endpoint, {
        method: "POST",
        body: form(data),
        headers: {
            Authorization: "Bearer " + getToken(),
            "Content-Type": "multipart/form-data",
        },
    })
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
        if (script.collaborators.length !== 0 &&
            script.collaborators.map((user: string) => user.toLowerCase()).includes(username.toLowerCase())) {
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

// Login, setup, restore scripts, return shared scripts.
export async function login(username: string) {
    esconsole("Using username: " + username, ["debug", "user"])
    reporter.login(username)
    _username = username

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

    esconsole("List of scripts in Load script list successfully updated.", ["debug", "user"])

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
        const fetchedScripts: Script[] = await getAuth("/scripts/owned")

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

// Fetch a script's history. Resolves to a list of historical scripts.
export async function getScriptHistory(scriptid: string) {
    esconsole("Getting script history: " + scriptid, ["debug", "user"])
    const scripts: Script[] = await getAuth("/scripts/history", { scriptid })
    for (const script of scripts) {
        script.created = ESUtils.parseDate(script.created as string)
    }
    return scripts
}

// Get shared scripts in the user account. Returns a promise that resolves to a list of user's shared script objects.
export async function getSharedScripts() {
    const sharedScripts: { [key: string]: Script } = {}
    const scripts: Script[] = await getAuth("/scripts/shared")
    for (const script of scripts) {
        script.isShared = true
        fixCollaborators(script, getUsername())
        sharedScripts[script.shareid] = script
    }
    store.dispatch(scriptsState.setSharedScripts(sharedScripts))
    return scripts
}

// Get shared id for locked version of latest script.
export async function getLockedSharedScriptId(shareid: string) {
    return (await get("/scripts/lockedshareid", { shareid })).shareid
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

export function isLoggedIn() {
    return user.selectLoggedIn(store.getState())
}

let _username: string | undefined

export function getUsername() {
    return _username!
}

export function getToken() {
    return user.selectToken(store.getState())
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
        const data = await get("/scripts/byid", { scriptid: id })
        if (sharing && data === "") {
            userNotification.show(i18n.t("messages:user.badsharelink"), "failure1", 3)
            throw new Error("Script was not found.")
        }
        return data
    } catch {
        esconsole("Failure getting script id: " + id, ["error", "user"])
    }
}

// Deletes an audio key if owned by the user.
export async function deleteAudio(audiokey: string) {
    try {
        await postAuth("/audio/delete", { audiokey })
        esconsole("Deleted audiokey: " + audiokey, ["debug", "user"])
        audioLibrary.clearAudioTagCache() // otherwise the deleted audio key is still usable by the user
    } catch (err) {
        esconsole(err, ["error", "userproject"])
    }
}

// Rename an audio key if owned by the user.
export async function renameAudio(audiokey: string, newaudiokey: string) {
    try {
        await postAuth("/audio/rename", { audiokey, newaudiokey })
        esconsole(`Successfully renamed audiokey: ${audiokey} to ${newaudiokey}`, ["debug", "user"])
        audioLibrary.clearAudioTagCache() // otherwise audioLibrary.getUserAudioTags/getAllTags returns the list with old name
    } catch (err) {
        userNotification.show("Error renaming custom sound", "failure1", 2)
        esconsole(err, ["error", "userproject"])
    }
}

// Get a script license information from the back-end.
export async function getLicenses() {
    return (await get("/scripts/licenses"))
}

export async function getUserInfo(token?: string) {
    token ??= getToken()!
    return get("/users/info", {}, { Authorization: "Bearer " + token })
}

// Set a script license id if owned by the user.
export async function setLicense(name: string, id: string, licenseID: string) {
    if (isLoggedIn()) {
        try {
            await postAuth("/scripts/license", { name, license_id: licenseID })
        } catch (err) {
            esconsole("Could not set license id: " + licenseID + " to " + name, "debug")
            esconsole(err, ["error"])
        }
        esconsole("Set License Id " + licenseID + " to " + name, "debug")
        store.dispatch(scriptsState.setScriptLicense({ id, licenseID }))
    }
}

// save a sharedscript into user's account.
export async function saveSharedScript(scriptid: string, scriptname: string, sourcecode: string, username: string) {
    let script
    if (isLoggedIn()) {
        script = await postAuth("/scripts/saveshared", { scriptid })
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
            const script = await postAuth("/scripts/delete", { scriptid })
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
    const name = await openModal(RenameScript, { script, conflict: true })
    if (name) {
        return { ...script, name: name }
    }
}

// Restore a script deleted by the user.
export async function restoreScript(script: Script) {
    if (lookForScriptByName(script.name, true)) {
        const result = await promptForRename(script)
        if (!result) {
            return
        }
        script = result
        await renameScript(script, script.name)
    }

    if (isLoggedIn()) {
        const restored = {
            ...await postAuth("/scripts/restore", { scriptid: script.shareid }),
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
        const result = await promptForRename(script)
        if (!result) {
            return
        }
        script = result
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
    const originalScriptName = script.name
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
        await postAuth("/scripts/deleteshared", { scriptid })
        esconsole("Deleted shared script: " + scriptid, "debug")
    }
    const { [scriptid]: _, ...sharedScripts } = scriptsState.selectSharedScripts(store.getState())
    store.dispatch(scriptsState.setSharedScripts(sharedScripts))
}

// Set a shared script description if owned by the user.
export async function setScriptDesc(name: string, id: string, description: string = "") {
    if (isLoggedIn()) {
        await postAuth("/scripts/description", { name, description })
        store.dispatch(scriptsState.setScriptDescription({ id, description }))
    }
    // TODO: Currently script license and description of local scripts are NOT synced with web service on login.
}

export function generateAnonymousScriptID() {
    // Find the max local script ID and add one to guarantee a new, unique ID.
    // Note that local script IDs are prefixed with "local/" to prevent conflict with server share IDs (which consist of A-Z, a-z, 0-9, -, _, and =).
    const PREFIX = "local/"
    const scripts = scriptsState.selectAllScripts(store.getState())
    const maxID = Math.max(...Object.keys(scripts).filter(s => s.startsWith(PREFIX)).map(s => parseInt(s.slice(PREFIX.length))))
    return `local/${maxID === -Infinity ? 0 : maxID + 1}`
}

// Import a shared script to the user's owned script list.
async function importSharedScript(scriptid: string) {
    let script
    const sharedScripts = scriptsState.selectSharedScripts(store.getState())
    if (isLoggedIn()) {
        script = await postAuth("/scripts/import", { scriptid }) as Script
    } else {
        script = sharedScripts[scriptid]
        script = {
            ...script,
            creator: script.username,
            original_id: script.shareid,
            collaborative: false,
            readonly: false,
            shareid: generateAnonymousScriptID(),
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
async function addSharedScript(shareID: string) {
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
        await postAuth("/scripts/rename", { scriptid: id, scriptname: newName })
        esconsole(`Renamed script: ${id} to ${newName}`, ["debug", "user"])
    }
    store.dispatch(scriptsState.setScriptName({ id, name: newName }))
    return { ...script, name: newName }
}

// Get all users and their roles
export async function getAdmins() {
    if (isLoggedIn()) {
        return getAuth("/users/admins")
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

// Promote user to admin or demote from admin.
export async function setIsAdmin(username: string, isAdmin: boolean) {
    if (isLoggedIn()) {
        return postAuth("/users/admin", { username, isAdmin: "" + isAdmin })
    } else {
        esconsole("Login failure", ["error", "user"])
    }
}

// Search users and return user details - intended for admin use
export async function searchUsers(username: string) {
    return (await get("/users/search", { query: username }))
}

// Set a user password with admin passphrase as credentials
export async function setPasswordForUser(username: string, password: string, adminPassphrase: string) {
    if (!isLoggedIn()) {
        throw new Error("Login failure")
    }

    esconsole("Admin setting a new password for user")
    const data = {
        adminpp: adminPassphrase,
        username,
        password,
    }
    await postAuth("/users/modifypwdadmin", data)
    userNotification.show("Successfully set a new password for " + username, "history", 3)
}

// If a scriptname already is taken, find the next possible name by appending a number (1), (2), etc...
export function nextName(scriptname: string) {
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
    return Object.keys(scripts).some(id => !(scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname)
}

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export async function saveScript(name: string, source: string, overwrite: boolean = true, status: number = 0) {
    name = overwrite ? name : nextName(name)
    const scripts = scriptsState.selectRegularScripts(store.getState())

    if (isLoggedIn()) {
        reporter.saveScript()
        const script = await postAuth("/scripts/save", {
            name,
            run_status: status + "",
            source_code: source,
        }) as Script
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
            shareid = generateAnonymousScriptID()
        }

        const script = {
            name,
            shareid,
            source_code: source,
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

export async function uploadCAIHistory(project: string, node: any) {
    const data = { username: getUsername(), project, node: JSON.stringify(node) }
    await post("/studies/caihistory", data)
    console.log("saved to CAI history:", project, node)
}
