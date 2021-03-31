import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { RootState, ThunkAPI } from '../reducers';
import * as helpers from '../helpers';

import * as ace from 'ace-builds';
import { Mode as PythonMode } from 'ace-builds/src-noconflict/mode-python';
import { Mode as JavaScriptMode } from 'ace-builds/src-noconflict/mode-javascript';

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
        addAndActivateTabID(state, { payload }) {
            state.openTabs.push(payload);
            state.activeTabID = payload;
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


// Note: Do not export and modify directly.
interface TabsMutableState {
    editorSessions: {
        [key: string]: ace.Ace.EditSession
    }
}
const tabsMutableState: TabsMutableState = {
    editorSessions: {}
};

export const setActiveTabAndEditor = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/setActiveTabAndEditor',
    (scriptID, { getState, dispatch }) => {
        const ideScope = helpers.getNgController('ideController').scope();

        setEditorSession(
            selectActiveTabID(getState()),
            ideScope && ideScope.editor.ace.getSession()
        );

        const storedSession = getEditorSession(scriptID);
        if (storedSession) {
            ideScope && ideScope.editor.ace.setSession(storedSession);
        } else {
            const userProject = helpers.getNgService('userProject');
            const script = userProject.scripts[scriptID];
            const syntaxMode = script.name.slice(-2) === 'py' ? PythonMode : JavaScriptMode;
            ideScope && ideScope.editor.ace.setSession(ace.createEditSession(script.source_code, syntaxMode));
        }

        dispatch(setActiveTabID(scriptID));
    }
);

export const closeDeletedScript = createAsyncThunk<void, string, ThunkAPI>(
    'tabs/closeDeletedScript',
    (scriptID, { getState, dispatch }) => {
        const openTabs: string[] = selectOpenTabs(getState());
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

export const setEditorSession = (scriptID: string | null, session: ace.Ace.EditSession | null) => {
    if (scriptID && session) {
        tabsMutableState.editorSessions[scriptID] = session;
    }
};

export const getEditorSession = (scriptID: string) => {
    return tabsMutableState.editorSessions[scriptID];
};

export const resetEditorSession = () => {
    tabsMutableState.editorSessions = {};
};
