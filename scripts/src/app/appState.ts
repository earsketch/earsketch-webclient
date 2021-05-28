import { createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { RootState } from '../reducers';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'en',
        scriptLanguage: 'python',
        colorTheme: 'light',
        fontSize: 14,
        embedMode: false,
        hideDAW: false,
        hideEditor: false,
        embeddedScriptName: null,
        embeddedScriptUsername: null,
        embeddedShareID: null,
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
        },
        setEmbeddedShareID(state, { payload }) {
            state.embeddedShareID = payload;
        },
        setLocale(state, { payload }) {
            state.locale = payload;
        }
    }
});

const persistConfig = {
    key: 'app',
    blacklist: ['embedMode', 'hideDAW', 'hideEditor', 'embeddedScriptUsername', 'embeddedScriptName', 'embeddedShareID'],
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
    setEmbeddedShareID,
    setLocale,
} = appSlice.actions;

export const selectScriptLanguage = (state: RootState) => state.app.scriptLanguage;
export const selectColorTheme = (state: RootState) => state.app.colorTheme;
// TODO: Figure out the right way to do this with redux-persist.
export const selectFontSize = (state: RootState) => state.app.fontSize || 14;
export const selectEmbedMode = (state: RootState) => state.app.embedMode;
export const selectHideDAW = (state: RootState) => state.app.hideDAW;
export const selectHideEditor = (state: RootState) => state.app.hideEditor;
export const selectEmbeddedScriptUsername = (state: RootState) => state.app.embeddedScriptUsername;
export const selectEmbeddedScriptName = (state: RootState) => state.app.embeddedScriptName;
export const selectEmbeddedShareID = (state: RootState) => state.app.embeddedShareID;
export const selectLocale = (state: RootState) => state.app.locale;