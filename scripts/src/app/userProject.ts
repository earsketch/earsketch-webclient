// TODO: Merge with userState as appropriate.
import i18n from "i18next"

import * as audioLibrary from "./audiolibrary"
import * as cai from "../cai/caiState"
import * as collaboration from "./collaboration"
import { Script } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { openModal } from "./modal"
import reporter from "./reporter"
import * as scriptsState from "../browser/scriptsState"
import { getSharedScripts, saveScript } from "../browser/scriptsThunks"
import store from "../reducers"
import { RenameScript } from "./Rename"
import * as tabs from "../ide/tabState"
import { setActiveTabAndEditor } from "../ide/tabThunks"
import * as user from "../user/userState"
import * as userNotification from "../user/notification"
import * as websocket from "./websocket"
import { getAuth, get, postAuth } from "../request"

export const STATUS_SUCCESSFUL = 1
export const STATUS_UNSUCCESSFUL = 2

export const callbacks = {
    openShare: async (_: string) => {},
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
        store.dispatch(setActiveTabAndEditor(scriptID))
    }
    store.dispatch(setActiveTabAndEditor(activeTab!))
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
    userNotification.callbacks.addSharedScript = id => addSharedScript(id, false)

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
                        promises.push(store.dispatch(saveScript({
                            name: script.name,
                            source: tabs.getEditorSession(script.shareid).getValue(),
                            overwrite: false,
                        })).unwrap())
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
                store.dispatch(setActiveTabAndEditor(savedScript.shareid))
            }
        }
    }

    const shareID = ESUtils.getURLParameter("sharing")
    const sharedScripts = scriptsState.selectSharedScripts(store.getState())
    if (shareID && sharedScripts[shareID]) {
        // User opened share link, and they haven't imported or deleted the shared script.
        await callbacks.openShare(shareID)
    }

    // load scripts in shared browser
    await getSharedScripts()
    // Wait to receive websocket notifications until *after* we have the list of existing shared scripts.
    // This prevents us from re-adding shared scripts when we get a bunch of unread share notifications.
    websocket.login(username)
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

// Get shared id for locked version of latest script.
export async function getLockedSharedScriptId(shareid: string) {
    return (await get("/scripts/lockedshareid", { shareid })).shareid
}

// Delete a user saved to local storage (logout).
export function clearUser() {
    localStorage.clear()
    if (FLAGS.SHOW_CAI) {
        store.dispatch(cai.resetState())
    }
    websocket.logout()
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
        sender: getUsername(),
        scriptid: shareid,
        // TODO: Simplify what the server expects. (`exists` is an artifact of the old UI.)
        users: users.map(id => ({ id, exists: true })),
    }

    websocket.send(data)
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

// Deletes a sound if owned by the user.
export async function deleteSound(name: string) {
    try {
        await postAuth("/audio/delete", { name })
        esconsole("Deleted sound: " + name, ["debug", "user"])
        audioLibrary.clearCache() // TODO: This is probably overkill.
    } catch (err) {
        esconsole(err, ["error", "userproject"])
    }
}

// Get a script license information from the back-end.
export async function getLicenses() {
    return (await get("/scripts/licenses"))
}

export async function getUserInfo(token?: string) {
    token = token ?? getToken()!
    return get("/users/info", {}, { Authorization: "Bearer " + token })
}

// Set a script license id if owned by the user.
export async function setScriptLicense(id: string, licenseID: number) {
    if (isLoggedIn()) {
        await postAuth("/scripts/license", { scriptid: id, license_id: "" + licenseID })
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
        return store.dispatch(saveScript({ name: script.name, source: script.source_code })).unwrap()
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
    return store.dispatch(saveScript({ name: script.name, source: text })).unwrap()
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
export async function setScriptDescription(id: string, description: string = "") {
    if (isLoggedIn()) {
        await postAuth("/scripts/description", { scriptid: id, description })
        store.dispatch(scriptsState.setScriptDescription({ id, description }))
    }
    // TODO: Currently script license and description of local scripts are NOT synced with web service on login.
}

// Import a shared script to the user's owned script list.
async function importSharedScript(scriptid: string) {
    let script
    const state = store.getState()
    const sharedScripts = scriptsState.selectSharedScripts(state)
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
            shareid: scriptsState.selectNextLocalScriptID(state),
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
// Returns a Promise if a script is actually added, and undefined otherwise (i.e. the user already had it, or isn't logged in).
function addSharedScript(shareID: string, refresh: boolean = true) {
    if (isLoggedIn()) {
        const sharedScripts = scriptsState.selectSharedScripts(store.getState())
        if (sharedScripts[shareID] === undefined) {
            return (async () => {
                const script = await loadScript(shareID, true)
                await saveSharedScript(shareID, script.name, script.source_code, script.username)
                if (refresh) {
                    await store.dispatch(getSharedScripts()).unwrap()
                }
            })()
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

// Get all active broadcasts
export async function getBroadcasts() {
    if (isLoggedIn()) {
        return getAuth("/users/broadcasts")
    } else {
        esconsole("Login failure", ["error", "user"])
    }
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

// Expires a broadcast using its ID
export async function expireBroadcastByID(id: string) {
    if (!isLoggedIn()) {
        throw new Error("Login failure")
    }
    await getAuth("/users/expire", { id })
}

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    const scripts = scriptsState.selectRegularScripts(store.getState())
    return Object.keys(scripts).some(id => !(scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname)
}

// Creates a new empty script and adds it to the list of open scripts, and saves it to a user's library.
export function createScript(scriptname: string) {
    const language = ESUtils.parseLanguage(scriptname)
    return store.dispatch(saveScript({ name: scriptname, source: i18n.t(`templates:${language}`) })).unwrap()
}
