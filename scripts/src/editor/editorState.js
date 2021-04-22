import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import * as config from './editorConfig';
import * as app from '../app/appState';

const editorSlice = createSlice({
    name: 'editor',
    initialState: {
        blocksMode: false
    },
    reducers: {
        setBlocksMode(state, { payload }) {
            state.blocksMode = payload;
        }
    }
});

const persistConfig = {
    key: 'editor',
    whitelist: [],
    storage
};

export default persistReducer(persistConfig, editorSlice.reducer);
export const {
    setBlocksMode
} = editorSlice.actions;

// Note: Do not export. Only modify through asyncThunk as side effects.
const editorMutableState = {
    editor: null
};

export const setEditorInstance = createAsyncThunk(
    'editor/setEditorInstance',
    (editor) => {
        editorMutableState.editor = editor;
    }
);

export const selectBlocksMode = state => state.editor.blocksMode;
export const setReadOnly = (bool) => {
    editorMutableState.editor?.ace.setReadOnly(bool);
    editorMutableState.editor?.droplet.setReadOnly(bool);
};
export const setSession = (editSession) => {
    editorMutableState.editor?.ace.setSession(editSession);
};