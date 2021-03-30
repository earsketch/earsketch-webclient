import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import * as config from './editorConfig';
import * as app from '../app/appState';
import { Ace } from 'ace-builds';
import { RootState } from '../reducers';

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
    whitelist: ['blocksMode'],
    storage
};

export default persistReducer(persistConfig, editorSlice.reducer);
export const {
    setBlocksMode
} = editorSlice.actions;

// Note: Do not export. Only modify through asyncThunk as side effects.
interface EditorMutableState {
    editor: Ace.Editor | null
    init(): unknown
    setReadOnly(mode: boolean): void
    setFontSize(value: number): void
}

const editorMutableState: EditorMutableState = {
    editor: null,
    init() {},
    setReadOnly(bool) {
        this.editor.ace.setReadOnly(bool);
        this.editor.droplet.setReadOnly(bool);
    },
    setFontSize(value) {
        this.editor.ace.setFontSize(value);
        this.editor.droplet.setFontSize(value);
    }
};

export const setEditorInstance = createAsyncThunk(
    'editor/setEditorInstance',
    (editor: Ace.Editor) => {
        editorMutableState.editor = editor;
    }
);

export const selectBlocksMode = (state: RootState) => state.editor.blocksMode;