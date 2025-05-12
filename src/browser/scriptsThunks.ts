import { createAsyncThunk } from "@reduxjs/toolkit"
import i18n from "i18next"

import type { Script } from "common"
import * as collaboration from "../app/collaboration"
import esconsole from "../esconsole"
import { fromEntries } from "../esutils"
import type { ThunkAPI } from "../reducers"
import { get, getAuth, postAuth } from "../request"
import {
    setSharedScripts, setRegularScripts, selectRegularScripts, selectNextLocalScriptID, selectNextScriptName,
    setScriptName, selectSharedScripts, selectActiveScripts,
} from "./scriptsState"
import * as tabs from "../ide/tabState"
import * as user from "../user/userState"
import reporter from "../app/reporter"
import { openModal } from "../app/modal"
import { RenameScript } from "../app/Rename"
import * as userNotification from "../user/notification"
import store from "../reducers"

// The script content from server may need adjustment in the collaborators parameter.
// Is this still necessary?
export function fixCollaborators(script: Script, username?: string) {
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

export const getSharedScripts = createAsyncThunk<Script[], void, ThunkAPI>(
    "scripts/getSharedScripts",
    async (_, { getState, dispatch }) => {
        const username = user.selectUserName(getState())!
        const scripts: Script[] = await getAuth("/scripts/shared")
        for (const script of scripts) {
            script.isShared = true
            fixCollaborators(script, username)
        }
        dispatch(setSharedScripts(fromEntries(scripts.map(script => [script.shareid, script]))))
        return scripts
    }
)

// Save a user's script if they have permission to do so.
//   overwrite: If true, overwrite existing scripts. Otherwise, save with a new name.
//   status: The run status of the script when saved. 0 = unknown, 1 = successful, 2 = unsuccessful.
export const saveScript = createAsyncThunk<Script, { name: string, source: string, creator?: string, overwrite?: boolean, status?: number, saveHist?: boolean }, ThunkAPI>(
    "scripts/saveScript",
    async ({ name, source, creator, overwrite = true, status = 0, saveHist }, { getState, dispatch }) => {
        const state = getState()
        name = overwrite ? name : selectNextScriptName(state, name)
        const scripts = selectRegularScripts(state)

        if (user.selectLoggedIn(state)) {
            reporter.saveScript()
            const script = await postAuth("/scripts/save", {
                name,
                run_status: status + "",
                source_code: source,
                ...(creator && { creator }),
                ...(saveHist === false) && { saveHist: saveHist.toString() },
            }) as Script
            esconsole(`Saved script ${name} with shareid ${script.shareid}`, "user")
            script.modified = Date.now()
            script.saved = true
            script.tooltipText = ""
            fixCollaborators(script)
            dispatch(setRegularScripts({ ...scripts, [script.shareid]: script }))
            return script
        } else {
            let shareid
            if (overwrite) {
                const match = Object.values(scripts).find(v => v.name === name)
                shareid = match?.shareid
            }
            if (shareid === undefined) {
                shareid = selectNextLocalScriptID(state)
            } else {
                // if not-logged-in AND re-saving a script, fetch the creator username (if there is one)
                // the creator does not change, so we don't require calls to saveScript() to include it
                creator = scripts[shareid].creator
            }

            const script = {
                name,
                shareid,
                source_code: source,
                modified: Date.now(),
                saved: true,
                tooltipText: "",
                collaborators: [],
                ...(creator && { creator }),
            } as any as Script
            dispatch(setRegularScripts({ ...scripts, [script.shareid]: script }))
            return script
        }
    }
)

// Transplants from userProject.
// TODO: Convert to Redux async thunks.

async function promptForRename(script: Script) {
    const name = await openModal(RenameScript, { script, conflict: true })
    if (name) {
        return { ...script, name }
    }
}

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    const scripts = selectRegularScripts(store.getState())
    return Object.keys(scripts).some(id => !(scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name.toLocaleUpperCase() === scriptname.toLocaleUpperCase())
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

    if (user.selectLoggedIn(store.getState())) {
        const restored = {
            ...await postAuth("/scripts/restore", { scriptid: script.shareid }),
            saved: true,
            modified: Date.now(),
        }
        esconsole("Restored script: " + restored.shareid, "debug")
        const scripts = selectRegularScripts(store.getState())
        store.dispatch(setRegularScripts({ ...scripts, [restored.shareid]: restored }))
        return restored
    } else {
        script.modified = Date.now()
        script.soft_delete = false
        const scripts = selectRegularScripts(store.getState())
        store.dispatch(setRegularScripts({ ...scripts, [script.shareid]: script }))
        return script
    }
}

// Rename a script if owned by the user.
export async function renameScript(script: Script, newName: string) {
    const id = script.shareid
    if (user.selectLoggedIn(store.getState())) {
        await postAuth("/scripts/rename", { scriptid: id, scriptname: newName })
        esconsole(`Renamed script: ${id} to ${newName}`, ["debug", "user"])
    }
    store.dispatch(setScriptName({ id, name: newName }))
    return { ...script, name: newName }
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
        return store.dispatch(saveScript({ name: script.name, source: script.source_code, creator: "earsketch" })).unwrap()
    }
}

// Import a shared script to the user's owned script list.
export async function importSharedScript(scriptid: string) {
    let script
    const state = store.getState()
    const sharedScripts = selectSharedScripts(state)
    if (user.selectLoggedIn(store.getState())) {
        script = await postAuth("/scripts/import", { scriptid }) as Script
    } else {
        script = sharedScripts[scriptid]
        script = {
            ...script,
            creator: script.username,
            original_id: script.shareid,
            collaborative: false,
            readonly: false,
            shareid: selectNextLocalScriptID(state),
        }
    }
    const { [scriptid]: _, ...updatedSharedScripts } = sharedScripts
    store.dispatch(setSharedScripts(updatedSharedScripts))
    const scripts = selectRegularScripts(store.getState())
    store.dispatch(setRegularScripts({ ...scripts, [script.shareid]: script }))
    esconsole("Import script " + scriptid, ["debug", "user"])
    return script
}

export async function importCollaborativeScript(script: Script) {
    const originalScriptName = script.name
    if (lookForScriptByName(script.name)) {
        await promptForRename(script)
    }
    const text = await collaboration.getScriptText(script.shareid)
    // TODO: Translate (or remove) this message!
    userNotification.show(`Saving a *copy* of collaborative script "${originalScriptName}" (created by ${script.username}) into MY SCRIPTS.`)
    collaboration.closeScript(script.shareid)
    return store.dispatch(saveScript({ name: script.name, source: text })).unwrap()
}

export async function saveSharedScript(scriptid: string, scriptname: string, sourcecode: string, username: string) {
    let script
    if (user.selectLoggedIn(store.getState())) {
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
    const sharedScripts = selectSharedScripts(store.getState())
    store.dispatch(setSharedScripts({ ...sharedScripts, [scriptid]: script }))
    return script
}

// These don't actually interact with Redux state, so they're ordinary async functions.

// Get shared id for locked version of latest script.
export async function getLockedSharedScriptId(shareid: string) {
    return (await get("/scripts/lockedshareid", { shareid })).shareid
}

// Fetch a script's history. Resolves to a list of historical scripts.
export async function getScriptHistory(scriptid: string) {
    esconsole("Getting script history: " + scriptid, ["debug", "user"])
    const scripts: Script[] = await getAuth("/scripts/history", { scriptid })
    return scripts
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

// Save all editor tabs with modified scripts
export function saveAll(saveHist: boolean = false) {
    const promises = []
    const modifiedTabs = tabs.selectModifiedScripts(store.getState())
    const scriptMap = selectActiveScripts(store.getState())

    for (const id of modifiedTabs) {
        const script = scriptMap[id]
        promises.push(store.dispatch(saveScript({
            name: script.name,
            source: script.source_code,
            saveHist,
        })).unwrap())
    }

    store.dispatch(tabs.resetModifiedScripts())

    if (promises.length) {
        return Promise.all(promises)
    }
    return promises.length ? Promise.all(promises) : null
}
