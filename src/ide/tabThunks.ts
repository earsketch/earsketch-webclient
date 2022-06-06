import { createAsyncThunk } from "@reduxjs/toolkit"
import * as ace from "ace-builds"

import { API_FUNCTIONS } from "../api/api"
import * as app from "../app/appState"
import * as collaboration from "../app/collaboration"
import { fromEntries } from "../esutils"
import * as scripts from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as user from "../user/userState"
import * as editor from "./ideState"
import type { ThunkAPI } from "../reducers"
import { reloadRecommendations } from "../app/reloadRecommender"
import reporter from "../app/reporter"
import { selectActiveTabID, getEditorSession, setEditorSession, selectOpenTabs, deleteEditorSession, selectModifiedScripts, openAndActivateTab, closeTab, removeModifiedScript, resetModifiedScripts, resetTabs } from "./tabState"

export const setActiveTabAndEditor = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/setActiveTabAndEditor",
    (scriptID, { getState, dispatch }) => {
        const prevTabID = selectActiveTabID(getState())
        const script = scripts.selectAllScripts(getState())[scriptID]

        if (!script) return

        let editSession
        const language = script.name.slice(-2) === "py" ? "python" : "javascript"

        const restoredSession = getEditorSession(scriptID)
        if (restoredSession) {
            editSession = restoredSession
        } else {
            // TODO: Using a syntax mode obj causes an error, and string is not accepted as valid type in this API.
            // There may be a more proper way to set the language mode.
            editSession = ace.createEditSession(script.source_code, `ace/mode/${language}` as unknown as ace.Ace.SyntaxMode)
            if (language === "javascript") {
                // Declare globals for JS linter so they don't generate "undefined variable" warnings.
                (editSession as any).$worker.call("changeOptions", [{
                    globals: fromEntries(Object.keys(API_FUNCTIONS).map(name => [name, false])),
                }])
            }
            setEditorSession(scriptID, editSession)
        }
        editor.setSession(editSession)

        dispatch(app.setScriptLanguage(language))
        editor.setReadOnly(script.readonly)

        if (script.collaborative) {
            collaboration.openScript(Object.assign({}, script), user.selectUserName(getState())!)
        }

        prevTabID && (scriptID !== prevTabID) && dispatch(ensureCollabScriptIsClosed(prevTabID))
        if (!selectOpenTabs(getState()).includes(scriptID)) {
            reporter.openScript()
        }
        dispatch(openAndActivateTab(scriptID))
        reloadRecommendations()
    }
)

export const closeAndSwitchTab = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/closeAndSwitchTab",
    (scriptID, { getState, dispatch }) => {
        const openTabs = selectOpenTabs(getState())
        const activeTabID = selectActiveTabID(getState())
        const closedTabIndex = openTabs.indexOf(scriptID)
        const script = scripts.selectAllScripts(getState())[scriptID]

        dispatch(saveScriptIfModified(scriptID))
        dispatch(ensureCollabScriptIsClosed(scriptID))

        if (openTabs.length === 1) {
            dispatch(resetTabs())
        } else if (activeTabID !== scriptID) {
            dispatch(closeTab(scriptID))
        } else if (openTabs.length > 1 && closedTabIndex === openTabs.length - 1) {
            const nextActiveTabID = openTabs[openTabs.length - 2]
            dispatch(setActiveTabAndEditor(nextActiveTabID))
            dispatch(closeTab(scriptID))
        } else if (closedTabIndex < openTabs.length - 1) {
            const nextActiveTabID = openTabs[closedTabIndex + 1]
            dispatch(setActiveTabAndEditor(nextActiveTabID))
            dispatch(closeTab(scriptID))
        }
        deleteEditorSession(scriptID)
        script.readonly && dispatch(scripts.removeReadOnlyScript(scriptID))
    }
)

export const closeAllTabs = createAsyncThunk<void, void, ThunkAPI>(
    "tabs/closeAllTabs",
    (_, { getState, dispatch }) => {
        if (editor.selectBlocksMode(getState())) {
            dispatch(editor.setBlocksMode(false))
        }

        const openTabs = selectOpenTabs(getState())

        openTabs.forEach(scriptID => {
            dispatch(saveScriptIfModified(scriptID))
            dispatch(ensureCollabScriptIsClosed(scriptID))
            dispatch(closeTab(scriptID))
            deleteEditorSession(scriptID)

            const script = scripts.selectAllScripts(getState())[scriptID]
            script.readonly && dispatch(scripts.removeReadOnlyScript(scriptID))
        })

        // These are probably redundant except for resetting the activeTabID.
        dispatch(resetTabs())
        dispatch(resetModifiedScripts())
        dispatch(scripts.resetReadOnlyScripts())
    }
)

export const saveScriptIfModified = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/saveScriptIfModified",
    (scriptID, { getState, dispatch }) => {
        const modified = selectModifiedScripts(getState()).includes(scriptID)
        if (modified) {
            const restoredSession = getEditorSession(scriptID)

            if (restoredSession) {
                const script = scripts.selectAllScripts(getState())[scriptID]
                dispatch(scriptsThunks.saveScript({ name: script.name, source: restoredSession.getValue() }))
            }

            dispatch(removeModifiedScript(scriptID))

            // TODO: Save successful notification
        }
    }
)
const ensureCollabScriptIsClosed = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/ensureCollabScriptIsClosed",
    (scriptID, { getState }) => {
        // Note: Watch out for the order with closeScript.
        const activeTabID = selectActiveTabID(getState())
        const script = scripts.selectAllScripts(getState())[scriptID]
        if (scriptID === activeTabID && script?.collaborative) {
            collaboration.closeScript(scriptID)
        }
    }
)

export const closeDeletedScript = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/closeDeletedScript",
    (scriptID, { getState, dispatch }) => {
        const openTabs: string[] = selectOpenTabs(getState())
        if (openTabs.includes(scriptID)) {
            dispatch(closeAndSwitchTab(scriptID))
        }
    }
)
