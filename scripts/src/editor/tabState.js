import { createSlice } from '@reduxjs/toolkit';

const tabSlice = createSlice({
    name: 'tabs',
    initialState: {
        openTabs: [],
        activeTabID: null
    },
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
        }
    }
});

export default tabSlice.reducer;
export const {
    setOpenTabs,
    setActiveTabID,
    addAndActivateTab,
    resetTabs
} = tabSlice.actions;

export const selectOpenTabs = state => state.tabs.openTabs;
export const selectActiveTabID = state => state.tabs.activeTabID;