import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { RootState, ThunkAPI } from '../reducers';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import * as ace from 'ace-builds';

import * as collaboration from '../app/collaboration';
import * as helpers from '../helpers';
import * as scripts from '../browser/scriptsState';
import * as user from '../user/userState';
import * as editor from "./editorState";
import * as userProject from '../app/userProject';

interface TabState {
    openTabs: string[],
    activeTabID: string | null,
    numVisibleTabs: number,
    showTabDropdown: boolean,
    modifiedScripts: string[]
}

const tabSlice = createSlice({
    name: 'tabs',
    initialState: {
        openTabs: [],
        activeTabID: null,
        numVisibleTabs: 0,
        showTabDropdown: false,
        modifiedScripts: []
    } as TabState,
    reducers: {
        setOpenTabs(state, { payload }) {
            state.openTabs = payload;
        },
        setActiveTabID(state, { payload }) {
            state.activeTabID = payload;
        },
        openAndActivateTab(state, { payload }) {
            if (!state.openTabs.includes(payload)) {
                state.openTabs.push(payload);
            }
            state.activeTabID = payload;
        },
        closeTab(state, { payload }) {
            if (state.openTabs.includes(payload)) {
                state.openTabs.splice(state.openTabs.indexOf(payload), 1);
            }
        },
        resetTabs(state) {
            state.openTabs = [];
            state.activeTabID = null;
        },
        setNumVisibleTabs(state, { payload }) {
            state.numVisibleTabs = payload;
        },
        setShowTabDropdown(state, { payload }) {
            state.showTabDropdown = payload;
        },
        addModifiedScript(state, { payload }) {
            // TODO: This is being triggered by keystrokes. Move to mutable state.
            !state.modifiedScripts.includes(payload) && state.modifiedScripts.push(payload);
        },
        removeModifiedScript(state, { payload }) {
            state.modifiedScripts = state.modifiedScripts.filter(v => v !== payload);
        },
        resetModifiedScripts(state) {
            state.modifiedScripts = [];
        }
    }
});

const persistConfig = {
    key: 'tabs',
    whitelist: ['openTabs', 'activeTabID'],
    storage
};

export default persistReducer(persistConfig, tabSlice.reducer);
export const {
    setOpenTabs,
    setActiveTabID,
    openAndActivateTab,
    closeTab,
    resetTabs,
    setNumVisibleTabs,
    setShowTabDropdown,
    addModifiedScript,
    removeModifiedScript,
    resetModifiedScripts
} = tabSlice.actions;

export const selectOpenTabs = (state: RootState) => state.tabs.openTabs;
export const selectActiveTabID = (state: RootState) => state.tabs.activeTabID;
export const selectNumVisibleTabs = (state: RootState) => state.tabs.numVisibleTabs;

export const selectTabsTruncated = createSelector(
    [selectOpenTabs, selectNumVisibleTabs],
    (openTabs, numVisibleTabs) => openTabs.length > numVisibleTabs ? 1 : 0
);

export const selectVisibleTabs = createSelector(
    [selectOpenTabs, selectActiveTabID, selectNumVisibleTabs],
    (openTabs, activeTabID, numVisibleTabs) => {
        if (!activeTabID) return [];

        const activeTabPosition = openTabs.indexOf(activeTabID);

        if (activeTabPosition >= numVisibleTabs && numVisibleTabs) {
            const visibleTabs = openTabs.slice();
            visibleTabs.splice(numVisibleTabs, numVisibleTabs+1);
            return visibleTabs.slice(0, numVisibleTabs-1).concat(activeTabID);
        } else {
            return openTabs.slice(0, numVisibleTabs);
        }
    }
);

export const selectHiddenTabs = createSelector(
    [selectOpenTabs, selectVisibleTabs],
    (openTabs: string[], visibleTabs: string[]) => openTabs.filter((tab: string) => !visibleTabs.includes(tab))
);

export const selectModifiedScripts = (state: RootState) => state.tabs.modifiedScripts;
export const selectActiveTabScript = createSelector(
    [selectActiveTabID, scripts.selectAllScriptEntities],
    (activeTabID: string, scriptEntities: scripts.ScriptEntities) => scriptEntities[activeTabID]
)

// Note: Do not export and modify directly.
interface TabsMutableState {
    editorSessions: {
        [key: string]: ace.Ace.EditSession
    }
    modifiedScripts: scripts.Scripts
}
const tabsMutableState: TabsMutableState = {
    editorSessions: {},
    modifiedScripts: {
        entities: {},
        scriptIDs: []
    }
};

export const setActiveTabAndEditor = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/setActiveTabAndEditor',
    (scriptID, { getState, dispatch }) => {
        const ideScope = helpers.getNgController('ideController').scope();
        const prevTabID = selectActiveTabID(getState());
        const script = scripts.selectAllScriptEntities(getState())[scriptID];

        if (!script) return;

        if (editor.selectBlocksMode(getState())) {
            ideScope.toggleBlocks();
            dispatch(editor.setBlocksMode(false));
        }

        let editSession;
        const language = script.name.slice(-2) === 'py' ? 'python' : 'javascript';

        const restoredSession = getEditorSession(scriptID);
        if (restoredSession) {
            editSession = restoredSession;
        } else {
            // TODO: Using a syntax mode obj causes an error, and string is not accepted as valid type in this API.
            // There may be a more proper way to set the language mode.
            editSession = ace.createEditSession(script.source_code, `ace/mode/${language}` as unknown as ace.Ace.SyntaxMode);
            setEditorSession(scriptID, editSession);
        }
        editor.setSession(editSession);

        ideScope.activeScript = script;
        ideScope.setLanguage(language);
        editor.setReadOnly(script.readonly);

        if (script.collaborative) {
            collaboration.openScript(Object.assign({},script), user.selectUserName(getState())!);
        }

        prevTabID && (scriptID !== prevTabID) && dispatch(ensureCollabScriptIsClosed(prevTabID));
        scriptID && dispatch(openAndActivateTab(scriptID));
        
        helpers.getNgRootScope().$broadcast('reloadRecommendations');
    }
);

export const closeAndSwitchTab = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/closeAndSwitchTab',
    (scriptID, { getState, dispatch }) => {
        const openTabs = selectOpenTabs(getState());
        const activeTabID = selectActiveTabID(getState());
        const closedTabIndex = openTabs.indexOf(scriptID);
        const script = scripts.selectAllScriptEntities(getState())[scriptID];

        dispatch(saveScriptIfModified(scriptID));
        dispatch(ensureCollabScriptIsClosed(scriptID));

        if (openTabs.length === 1) {
            dispatch(resetTabs());
        } else if (activeTabID !== scriptID) {
            dispatch(closeTab(scriptID));
        } else if (openTabs.length > 1 && closedTabIndex === openTabs.length-1) {
            const nextActiveTabID = openTabs[openTabs.length-2];
            dispatch(setActiveTabAndEditor(nextActiveTabID));
            dispatch(closeTab(scriptID));
        } else if (closedTabIndex < openTabs.length-1) {
            const nextActiveTabID = openTabs[closedTabIndex+1];
            dispatch(setActiveTabAndEditor(nextActiveTabID));
            dispatch(closeTab(scriptID));
        }
        deleteEditorSession(scriptID);
        script.readonly && dispatch(scripts.removeReadOnlyScript(scriptID));
    }
);

export const closeAllTabs = createAsyncThunk<void, void, ThunkAPI>(
    'tabs/closeAllTabs',
    (_, { getState, dispatch }) => {
        if (editor.selectBlocksMode(getState())) {
            const ideScope = helpers.getNgController('ideController').scope();
            ideScope.toggleBlocks();
            dispatch(editor.setBlocksMode(false));
        }

        const openTabs = selectOpenTabs(getState());

        openTabs.forEach(scriptID => {
            dispatch(saveScriptIfModified(scriptID));
            dispatch(ensureCollabScriptIsClosed(scriptID));
            dispatch(closeTab(scriptID));
            deleteEditorSession(scriptID);

            const script = scripts.selectAllScriptEntities(getState())[scriptID];
            script.readonly && dispatch(scripts.removeReadOnlyScript(scriptID));
        });

        // These are probably redundant except for resetting the activeTabID.
        dispatch(resetTabs());
        dispatch(resetModifiedScripts());
        dispatch(scripts.resetReadOnlyScripts());
    }
)

export const saveScriptIfModified = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/saveScriptIfModified',
    (scriptID, { getState, dispatch }) => {
        const modified = selectModifiedScripts(getState()).includes(scriptID);
        if (modified) {
            const restoredSession = getEditorSession(scriptID);

            if (restoredSession) {
                const script = scripts.selectAllScriptEntities(getState())[scriptID];
                userProject.saveScript(script.name, restoredSession.getValue()).then(() => {
                    userProject.closeScript(scriptID);
                });
            }

            dispatch(removeModifiedScript(scriptID));
            dispatch(scripts.syncToNgUserProject());

            // TODO: Save successful notification

        }
    }
);

const ensureCollabScriptIsClosed = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/ensureCollabScriptIsClosed',
    (scriptID, { getState }) => {
        // Note: Watch out for the order with closeScript.
        const activeTabID = selectActiveTabID(getState());
        const script = scripts.selectAllScriptEntities(getState())[scriptID];
        if (scriptID === activeTabID && script?.collaborative) {
            const userName = user.selectUserName(getState())!;
            collaboration.closeScript(scriptID, userName);
        }
    }
);

export const closeDeletedScript = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/closeDeletedScript',
    (scriptID, { getState, dispatch }) => {
        const openTabs: string[] = selectOpenTabs(getState());
        if (openTabs.includes(scriptID)) {
            dispatch(closeAndSwitchTab(scriptID));
        }
    }
);

export const setEditorSession = (scriptID: string | null, session: ace.Ace.EditSession | null) => {
    if (scriptID && session) {
        tabsMutableState.editorSessions[scriptID] = session;
    }
};

export const getEditorSession = (scriptID: string) => {
    return tabsMutableState.editorSessions[scriptID];
};

export const deleteEditorSession = (scriptID: string) => {
    if (scriptID in tabsMutableState.editorSessions) {
        delete tabsMutableState.editorSessions[scriptID];
    }
};

const resetEditorSession = () => {
    tabsMutableState.editorSessions = {};
};
