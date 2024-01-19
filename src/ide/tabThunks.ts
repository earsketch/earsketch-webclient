import { createAsyncThunk } from "@reduxjs/toolkit"

import * as app from "../app/appState"
import * as collaboration from "../app/collaboration"
import * as editor from "./ideState"
import * as scripts from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as user from "../user/userState"
import type { ThunkAPI } from "../reducers"
import { addTabSwitch } from "../cai/dialogue/student"
import reporter from "../app/reporter"
import { selectActiveTabID, selectOpenTabs, selectModifiedScripts, openAndActivateTab, closeTab as pureCloseTab, removeModifiedScript, resetModifiedScripts, resetTabs as pureResetTabs } from "./tabState"
import { createSession, getSession, deleteSession, deleteAllSessions, getContents, setActiveSession, setReadOnly } from "./Editor"

// Wrap side-effect-free reducers from `tabState` to also update mutable state.
export const closeTab = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/resetTabs",
    (scriptID, { dispatch }) => {
        dispatch(pureCloseTab(scriptID))
        deleteSession(scriptID)
    }
)

export const resetTabs = createAsyncThunk<void, void, ThunkAPI>(
    "tabs/resetTabs",
    (_, { dispatch }) => {
        dispatch(pureResetTabs())
        deleteAllSessions()
    }
)

export const setActiveTabAndEditor = createAsyncThunk<void, string, ThunkAPI>(
    "tabs/setActiveTabAndEditor",
    (scriptID, { getState, dispatch }) => {
        const prevTabID = selectActiveTabID(getState())
        const script = scripts.selectAllScripts(getState())[scriptID]

        if (!script) return

        let editSession
        const language = script.name.slice(-2) === "py" ? "python" : "javascript"

        const restoredSession = getSession(scriptID)
        if (restoredSession) {
            editSession = restoredSession
        } else {
            editSession = createSession(scriptID, language, script.source_code)
        }
        setActiveSession(editSession)

        dispatch(app.setScriptLanguage(language))
        setReadOnly(script.readonly)

        if (script.collaborative) {
            collaboration.openScript(Object.assign({}, script), user.selectUserName(getState())!)
        }

        if (prevTabID && scriptID !== prevTabID) {
            dispatch(ensureCollabScriptIsClosed(prevTabID))
            dispatch(editor.setScriptMatchesDAW(false))
        }

        if (!selectOpenTabs(getState()).includes(scriptID)) {
            reporter.openScript()
        }
        dispatch(openAndActivateTab(scriptID))
        addTabSwitch(script.name)
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
            if (activeTabID !== null) {
                addTabSwitch(scripts.selectAllScripts(getState())[activeTabID].name)
            }
        } else if (openTabs.length > 1 && closedTabIndex === openTabs.length - 1) {
            const nextActiveTabID = openTabs[openTabs.length - 2]
            dispatch(setActiveTabAndEditor(nextActiveTabID))
            dispatch(closeTab(scriptID))
        } else if (closedTabIndex < openTabs.length - 1) {
            const nextActiveTabID = openTabs[closedTabIndex + 1]
            dispatch(setActiveTabAndEditor(nextActiveTabID))
            dispatch(closeTab(scriptID))
        }
        deleteSession(scriptID)
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
            deleteSession(scriptID)

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
            const restoredSession = getSession(scriptID)

            if (restoredSession) {
                const script = scripts.selectAllScripts(getState())[scriptID]
                dispatch(scriptsThunks.saveScript({ name: script.name, source: getContents(restoredSession) }))
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
