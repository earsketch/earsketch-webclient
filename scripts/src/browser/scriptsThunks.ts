import { createAsyncThunk } from "@reduxjs/toolkit"

import type { Script } from "common"
import esconsole from "../esconsole"
import { fromEntries } from "../esutils"
import type { ThunkAPI } from "../reducers"
import { getAuth, postAuth } from "../request"
import { setSharedScripts, setRegularScripts, selectRegularScripts, selectNextLocalScriptID, selectNextScriptName } from "./scriptsState"
import * as user from "../user/userState"
import reporter from "../app/reporter"

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
