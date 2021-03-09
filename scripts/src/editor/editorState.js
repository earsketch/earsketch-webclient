import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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

export default editorSlice.reducer;
export const {
    setBlocksMode
} = editorSlice.actions;

// Note: Do not export. Only modify through asyncThunk as side effects.
const editorMutableState = {
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
    (editor) => {
        editorMutableState.editor = editor;
    }
);

export const selectBlocksMode = state => state.editor.blocksMode;