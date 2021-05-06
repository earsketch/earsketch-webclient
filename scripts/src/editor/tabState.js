import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import * as helpers from 'helpers';
import * as scripts from '../browser/scriptsState';
import * as user from '../user/userState';
import * as editor from "./editorState";

const tabSlice = createSlice({
    name: 'tabs',
    initialState: {
        openTabs: [],
        activeTabID: null,
        numVisibleTabs: 0,
        showTabDropdown: false,
        modifiedScripts: []
    },
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

export const selectOpenTabs = state => state.tabs.openTabs;
export const selectActiveTabID = state => state.tabs.activeTabID;
export const selectNumVisibleTabs = state => state.tabs.numVisibleTabs;

export const selectTabsTruncated = createSelector(
    [selectOpenTabs, selectNumVisibleTabs],
    (openTabs, numVisibleTabs) => openTabs.length > numVisibleTabs
);

export const selectVisibleTabs = createSelector(
    [selectOpenTabs, selectActiveTabID, selectNumVisibleTabs],
    (openTabs, activeTabID, numVisibleTabs) => {
        const activeTabPosition = openTabs.indexOf(activeTabID);

        if (activeTabPosition >= numVisibleTabs && numVisibleTabs) {
            const visibleTabs = openTabs.slice();
            visibleTabs.splice(activeTabID,activeTabID+1);
            return visibleTabs.slice(0, numVisibleTabs-1).concat(activeTabID);
        } else {
            return openTabs.slice(0, numVisibleTabs);
        }
    }
);

export const selectHiddenTabs = createSelector(
    [selectOpenTabs, selectVisibleTabs],
    (openTabs, visibleTabs) => openTabs.filter(tab => !visibleTabs.includes(tab))
);

export const selectModifiedScripts = state => state.tabs.modifiedScripts;
export const selectActiveTabScript = createSelector(
    [selectActiveTabID, scripts.selectAllScriptEntities],
    (activeTabID, scriptEntities) => scriptEntities[activeTabID]
)

// Note: Do not export and modify directly.
const tabsMutableState = {
    editorSessions: {},
    modifiedScripts: {
        entities: {},
        scriptIDs: []
    }
};

export const setActiveTabAndEditor = createAsyncThunk(
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
            editSession = ace.createEditSession(script.source_code, `ace/mode/${language}`);
            setEditorSession(scriptID, editSession);
        }
        editor.setSession(editSession);

        ideScope.activeScript = script;
        ideScope.setLanguage(language);
        editor.setReadOnly(script.readonly);

        if (script.collaborative) {
            const collaboration = helpers.getNgService('collaboration');
            collaboration.openScript(Object.assign({},script), user.selectUserName(getState()));
        }

        (scriptID !== prevTabID) && dispatch(ensureCollabScriptIsClosed(prevTabID));
        scriptID && dispatch(openAndActivateTab(scriptID));
        
        helpers.getNgRootScope().$broadcast('reloadRecommendations');
    }
);

export const closeAndSwitchTab = createAsyncThunk(
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

export const closeAllTabs = createAsyncThunk(
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

export const saveScriptIfModified = createAsyncThunk(
    'tabs/saveScriptIfModified',
    (scriptID, { getState, dispatch }) => {
        const modified = selectModifiedScripts(getState()).includes(scriptID);
        if (modified) {
            const restoredSession = getEditorSession(scriptID);

            if (restoredSession) {
                const userProject = helpers.getNgService('userProject');
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

const ensureCollabScriptIsClosed = createAsyncThunk(
    'tabs/ensureCollabScriptIsClosed',
    (scriptID, { getState }) => {
        // Note: Watch out for the order with closeScript.
        const activeTabID = selectActiveTabID(getState());
        const script = scripts.selectAllScriptEntities(getState())[scriptID];
        if (scriptID === activeTabID && script?.collaborative) {
            const collabService = helpers.getNgService('collaboration');
            const userName = user.selectUserName(getState());
            collabService.closeScript(scriptID, userName);
        }
    }
);

export const closeDeletedScript = createAsyncThunk(
    'tabs/closeDeletedScript',
    (scriptID, { getState, dispatch }) => {
        const openTabs = selectOpenTabs(getState());
        if (openTabs.includes(scriptID)) {
            dispatch(closeAndSwitchTab(scriptID));
        }
    }
);

export const setEditorSession = (scriptID, session) => {
    tabsMutableState.editorSessions[scriptID] = session;
};

export const getEditorSession = scriptID => {
    return tabsMutableState.editorSessions[scriptID];
};

export const deleteEditorSession = scriptID => {
    if (scriptID in tabsMutableState.editorSessions) {
        delete tabsMutableState.editorSessions[scriptID];
    }
};

const resetEditorSession = () => {
    tabsMutableState.editorSessions = {};
};
