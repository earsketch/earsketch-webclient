import { createAsyncThunk } from "@reduxjs/toolkit"

import type { Script } from "common"
import { fromEntries } from "../esutils"
import type { ThunkAPI } from "../reducers"
import { getAuth } from "../request"
import { setSharedScripts } from "./scriptsState"
import * as user from "../user/userState"

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
