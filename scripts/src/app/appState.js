import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'us-en',
        scriptLanguage: 'python',
        colorTheme: 'dark',
        fontSize: 14
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
        }
    }
});

export default appSlice.reducer;
export const {
    setScriptLanguage,
    setColorTheme,
    toggleColorTheme,
    setFontSize
} = appSlice.actions;

export const selectScriptLanguage = state => state.app.scriptLanguage;
export const selectColorTheme = state => state.app.colorTheme;
export const selectFontSize = state => state.app.fontSize;