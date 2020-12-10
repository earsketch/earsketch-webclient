import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'us-en',
        scriptLanguage: 'python',
        useLazyScriptCompiler: true,
        timeStretch: {
            useClientSide: true,
            quickSearch: true,
            cacheResults: true
        },
        amazon: {
            showContestLink: false,
            showSounds: true,
            showBanner: true,
            showCurriculumChapter: true
        },
        artistSounds: {
            common: true
        },

        // Temporary
        numTabsOpen: 0
    },
    reducers: {
        createScript: {
            prepare(scriptName) {
                return {
                    payload: {
                        ID: 'foo',
                        name: scriptName,
                        modified: Date.now(),
                        source_code: 'test'
                    }
                }
            },
            reducer(state, { payload }) {
                state.script[payload.ID] = payload;
            }
        },
        setNumTabsOpen(state, { payload }) {
            state.numTabsOpen = payload;
        },
        setScriptLanguage(state, { payload }) {
            state.scriptLanguage = payload;
        },
    }
});

export default appSlice.reducer;
export const {
    setNumTabsOpen,
    setScriptLanguage,
} = appSlice.actions;

export const selectScriptLanguage = state => state.app.scriptLanguage;