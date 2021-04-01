import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as helpers from 'helpers';
import * as scripts from '../browser/scriptsState';

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

export default tabSlice.reducer;
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


// Note: Do not export and modify directly.
const tabsMutableState = {
    editorSessions: {}
};

export const setActiveTabAndEditor = createAsyncThunk(
    'tabs/setActiveTabAndEditor',
    (scriptID, { getState, dispatch }) => {
        const ideScope = helpers.getNgController('ideController').scope();
        const prevTabID = selectActiveTabID(getState());

        prevTabID && setEditorSession(prevTabID, ideScope.editor.ace.getSession());

        const storedSession = getEditorSession(scriptID);
        if (storedSession) {
            ideScope.editor.ace.setSession(storedSession);
        } else {
            const script = scripts.selectAllScriptEntities(getState())[scriptID];
            const language = script.name.slice(-2) === 'py' ? 'python' : 'javascript';
            ideScope.editor.ace.setSession(ace.createEditSession(script.source_code, `ace/mode/${language}`));
        }

        dispatch(openAndActivateTab(scriptID));
    }
);

export const closeAndSwitchTab = createAsyncThunk(
    'tabs/closeAndSwitchTab',
    (scriptID, { getState, dispatch }) => {
        const openTabs = selectOpenTabs(getState());
        const activeTabID = selectActiveTabID(getState());
        const closedTabIndex = openTabs.indexOf(scriptID);

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
    }
)

export const closeDeletedScript = createAsyncThunk(
    'tabs/closeDeletedScript',
    (scriptID, { getState, dispatch }) => {
        const openTabs = selectOpenTabs(getState());
        if (openTabs.includes(scriptID)) {
            const filteredOpenTabs = openTabs.filter(v => v !== scriptID);
            dispatch(setOpenTabs(filteredOpenTabs));
            if (filteredOpenTabs.length) {
                dispatch(setActiveTabAndEditor(filteredOpenTabs[Math.min(openTabs.indexOf(scriptID),filteredOpenTabs.length-1)]));
            } else {
                dispatch(setActiveTabID(null));
            }
        }
    }
);

export const setEditorSession = (scriptID, session) => {
    tabsMutableState.editorSessions[scriptID] = session;
};

export const getEditorSession = scriptID => {
    return tabsMutableState.editorSessions[scriptID];
};

export const resetEditorSession = () => {
    tabsMutableState.editorSessions = {};
};
