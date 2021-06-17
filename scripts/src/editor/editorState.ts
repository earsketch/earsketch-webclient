import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
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
        },
        toggleBlocksMode(state) {
            state.blocksMode = !state.blocksMode
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
    setBlocksMode,
    toggleBlocksMode,
} = editorSlice.actions;

// Note: Do not export. Only modify through asyncThunk as side effects.
interface EditorMutableState {
    editor: { ace: Ace.Editor, droplet: any } | null
}

const editorMutableState: EditorMutableState = {
    editor: null
};

export const setEditorInstance = createAsyncThunk(
    'editor/setEditorInstance',
    (editor: { ace: Ace.Editor, droplet: any }) => {
        editorMutableState.editor = editor;
    }
);

export const selectBlocksMode = (state: RootState) => state.editor.blocksMode;
export const setReadOnly = (bool: boolean) => {
    editorMutableState.editor?.ace.setReadOnly(bool);
    editorMutableState.editor?.droplet.setReadOnly(bool);
};
export const setSession = (editSession: Ace.EditSession) => {
    editorMutableState.editor?.ace.setSession(editSession);
};