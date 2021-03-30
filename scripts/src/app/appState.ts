import { createSlice } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { RootState } from '../reducers';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'us-en',
        scriptLanguage: 'python',
        colorTheme: 'light',
        fontSize: 14,
        embedMode: false
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
        setEmbedMode(state, { payload }) {
            state.embedMode = payload;
        }
    }
});

const persistConfig = {
    key: 'app',
    blacklist: ['embedMode'],
    storage
};

export default persistReducer(persistConfig, appSlice.reducer);
export const {
    setScriptLanguage,
    setColorTheme,
    toggleColorTheme,
    setFontSize,
    setEmbedMode
} = appSlice.actions;

export const selectScriptLanguage = (state: RootState) => state.app.scriptLanguage;
export const selectColorTheme = (state: RootState) => state.app.colorTheme;
// TODO: Figure out the right way to do this with redux-persist.
export const selectFontSize = (state: RootState) => state.app.fontSize || 14;
export const selectEmbedMode = (state: RootState) => state.app.embedMode;