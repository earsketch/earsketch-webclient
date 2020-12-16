import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
    name: 'app',
    initialState: {
        locale: 'us-en',
        scriptLanguage: 'python',
        colorTheme: 'dark'
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
        }
    }
});

export default appSlice.reducer;
export const {
    setScriptLanguage,
    setColorTheme,
    toggleColorTheme
} = appSlice.actions;

export const selectScriptLanguage = state => state.app.scriptLanguage;
export const selectColorTheme = state => state.app.colorTheme;