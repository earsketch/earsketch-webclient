import { createAsyncThunk } from "@reduxjs/toolkit"

import type { Script } from "common"
import * as collaboration from "../app/collaboration"
import esconsole from "../esconsole"
import { fromEntries } from "../esutils"
import type { ThunkAPI } from "../reducers"
import { getAuth, postAuth } from "../request"
import { setSharedScripts, setRegularScripts, selectRegularScripts, selectNextLocalScriptID, selectNextScriptName, setScriptName, selectSharedScripts } from "./scriptsState"
import * as user from "../user/userState"
import reporter from "../app/reporter"
import { openModal } from "../app/modal"
import { RenameScript } from "../app/Rename"
import * as userNotification from "../user/notification"
import store from "../reducers"

// The script content from server may need adjustment in the collaborators parameter.
// Is this still necessary?
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
export const saveScript = createAsyncThunk<Script, { name: string, source: string, overwrite?: boolean, status?: number }, ThunkAPI>(
    "scripts/getSharedScripts",
    async ({ name, source, overwrite = true, status = 0 }, { getState, dispatch }) => {
        const state = getState()
        name = overwrite ? name : selectNextScriptName(state, name)
        const scripts = selectRegularScripts(state)

        if (user.selectLoggedIn(state)) {
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
        return { ...script, name: name }
    }
}

function lookForScriptByName(scriptname: string, ignoreDeletedScripts?: boolean) {
    const scripts = selectRegularScripts(store.getState())
    return Object.keys(scripts).some(id => !(scripts[id].soft_delete && ignoreDeletedScripts) && scripts[id].name === scriptname)
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
        return store.dispatch(saveScript({ name: script.name, source: script.source_code })).unwrap()
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
