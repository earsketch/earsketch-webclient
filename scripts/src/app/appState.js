import { createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'us-en',
        scriptLanguage: 'python',
        colorTheme: 'light',
        fontSize: 14,
        embedMode: false,
        hideDAW: false,
        hideEditor: false,
        embeddedScriptName: null,
        embeddedScriptUsername: null,
    },
    reducers: {
        setScriptLanguage(state, { payload }) {
            state.scriptLanguage = payload;
        },
        setColorTheme(state, { payload }) {
            state.colorTheme = payload;
        },
        toggleColorTheme(state) {
            state.colorTheme = state.colorTheme==='light' ? 'dark' : 'light';
        },
        setFontSize(state, { payload }) {
            state.fontSize = payload
        },
        // Perhaps these should go in another slice?
        setEmbedMode(state, { payload }) {
            state.embedMode = payload;
        },
        setHideDAW(state, { payload }) {
            state.hideDAW = payload;
        },
        setHideEditor(state, { payload }) {
            state.hideEditor = payload;
        },
        setEmbeddedScriptUsername(state, { payload }) {
            state.embeddedScriptUsername = payload;
        },
        setEmbeddedScriptName(state, { payload }) {
            state.embeddedScriptName = payload;
        }
    }
});

const persistConfig = {
    key: 'app',
    blacklist: ['embedMode', 'hideDAW', 'hideEditor', 'embeddedScriptUsername', 'embeddedScriptName'],
    storage
};

export default persistReducer(persistConfig, appSlice.reducer);
export const {
    setScriptLanguage,
    setColorTheme,
    toggleColorTheme,
    setFontSize,
    setEmbedMode,
    setHideDAW,
    setHideEditor,
    setEmbeddedScriptUsername,
    setEmbeddedScriptName,
} = appSlice.actions;

export const selectScriptLanguage = state => state.app.scriptLanguage;
export const selectColorTheme = state => state.app.colorTheme;
// TODO: Figure out the right way to do this with redux-persist.
export const selectFontSize = state => state.app.fontSize || 14;
export const selectEmbedMode = state => state.app.embedMode;
export const selectHideDAW = state => state.app.hideDAW;
export const selectHideEditor = state => state.app.hideEditor;
export const selectEmbeddedScriptUsername = state => state.app.embeddedScriptUsername;
export const selectEmbeddedScriptName = state => state.app.embeddedScriptName;