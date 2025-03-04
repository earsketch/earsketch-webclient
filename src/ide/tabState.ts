import { createSlice, createSelector } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import type { RootState } from "../reducers"
import * as scripts from "../browser/scriptsState"

interface TabState {
    openTabs: string[],
    activeTabID: string | null,
    numVisibleTabs: number,
    showTabDropdown: boolean,
    modifiedScripts: string[]
}

const tabSlice = createSlice({
    name: "tabs",
    initialState: {
        openTabs: [],
        activeTabID: null,
        numVisibleTabs: 0,
        showTabDropdown: false,
        modifiedScripts: [],
    } as TabState,
    reducers: {
        setOpenTabs(state, { payload }) {
            state.openTabs = payload
        },
        setActiveTabID(state, { payload }) {
            state.activeTabID = payload
        },
        openAndActivateTab(state, { payload }) {
            if (!state.openTabs.includes(payload)) {
                state.openTabs.push(payload)
            }
            state.activeTabID = payload
        },
        closeTab(state, { payload }) {
            state.openTabs.splice(state.openTabs.indexOf(payload), 1)
        },
        resetTabs(state) {
            state.openTabs = []
            state.activeTabID = null
            state.modifiedScripts = []
        },
        setNumVisibleTabs(state, { payload }) {
            state.numVisibleTabs = payload
        },
        setShowTabDropdown(state, { payload }) {
            state.showTabDropdown = payload
        },
        addModifiedScript(state, { payload }) {
            !state.modifiedScripts.includes(payload) && state.modifiedScripts.push(payload)
        },
        removeModifiedScript(state, { payload }) {
            state.modifiedScripts = state.modifiedScripts.filter(v => v !== payload)
        },
        resetModifiedScripts(state) {
            state.modifiedScripts = []
        },
    },
})

const persistConfig = {
    key: "tabs",
    whitelist: ["openTabs", "activeTabID"],
    storage,
}

export default persistReducer(persistConfig, tabSlice.reducer)
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
    resetModifiedScripts,
} = tabSlice.actions

export const selectOpenTabs = (state: RootState) => state.tabs.openTabs
export const selectActiveTabID = (state: RootState) => state.tabs.activeTabID
export const selectNumVisibleTabs = (state: RootState) => state.tabs.numVisibleTabs

export const selectTabsTruncated = createSelector(
    [selectOpenTabs, selectNumVisibleTabs],
    (openTabs, numVisibleTabs) => openTabs.length > numVisibleTabs ? 1 : 0
)

export const selectVisibleTabs = createSelector(
    [selectOpenTabs, selectActiveTabID, selectNumVisibleTabs],
    (openTabs, activeTabID, numVisibleTabs) => {
        if (!activeTabID) return []

        const activeTabPosition = openTabs.indexOf(activeTabID)

        if (activeTabPosition >= numVisibleTabs && numVisibleTabs) {
            const visibleTabs = openTabs.slice()
            visibleTabs.splice(numVisibleTabs, numVisibleTabs + 1)
            return visibleTabs.slice(0, numVisibleTabs - 1).concat(activeTabID)
        } else {
            return openTabs.slice(0, numVisibleTabs)
        }
    }
)

export const selectHiddenTabs = createSelector(
    [selectOpenTabs, selectVisibleTabs],
    (openTabs: string[], visibleTabs: string[]) => openTabs.filter((tab: string) => !visibleTabs.includes(tab))
)

export const selectModifiedScripts = (state: RootState) => state.tabs.modifiedScripts
export const selectActiveTabScript = createSelector(
    [selectActiveTabID, scripts.selectAllScripts],
    (activeTabID: string | null, scriptEntities: scripts.Scripts) => scriptEntities[activeTabID!]
)
