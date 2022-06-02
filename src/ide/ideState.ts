import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"
import { Ace } from "ace-builds"

import type { RootState } from "../reducers"

interface Log {
    level: string
    text: string
}

const ideSlice = createSlice({
    name: "ide",
    initialState: {
        blocksMode: false,
        logs: [] as Log[],
    },
    reducers: {
        setBlocksMode(state, { payload }) {
            state.blocksMode = payload
        },
        setLogs(state, { payload }) {
            state.logs = payload
        },
        pushLog(state, { payload }) {
            state.logs.push(payload)
        },
    },
})

const persistConfig = {
    key: "ide",
    whitelist: [],
    storage,
}

export default persistReducer(persistConfig, ideSlice.reducer)
export const {
    setBlocksMode,
    setLogs,
    pushLog,
} = ideSlice.actions

export const selectBlocksMode = (state: RootState) => state.ide.blocksMode

export const selectLogs = (state: RootState) => state.ide.logs

// TODO: Consolidate with Editor.
// Note: Do not export. Only modify through asyncThunk as side effects.
interface EditorMutableState {
    editor: { ace: Ace.Editor, droplet: any } | null
}

const editorMutableState: EditorMutableState = {
    editor: null,
}

export const setEditorInstance = createAsyncThunk(
    "editor/setEditorInstance",
    (editor: { ace: Ace.Editor, droplet: any }) => {
        editorMutableState.editor = editor
    }
)

export const setReadOnly = (bool: boolean) => {
    editorMutableState.editor?.ace.setReadOnly(bool)
    editorMutableState.editor?.droplet.setReadOnly(bool)
}
export const setSession = (editSession: Ace.EditSession) => {
    editorMutableState.editor?.ace.setSession(editSession)
}
