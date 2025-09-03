import { createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import type { RootState } from "../reducers"

export interface Log {
    level: string
    text: string
}

const ideSlice = createSlice({
    name: "ide",
    initialState: {
        blocksMode: false,
        logs: [] as Log[],
        autocomplete: true,
        playArrows: true,
        showBeatStringAnnotations: true,
        scriptMatchesDAW: false,
    },
    reducers: {
        setBlocksMode(state, { payload }) {
            state.blocksMode = payload
        },
        setLogs(state, { payload }) {
            state.logs = payload
        },
        pushLog(state, { payload }: { payload: Log }) {
            state.logs.push(payload)
        },
        setAutocomplete(state, { payload }) {
            state.autocomplete = payload
        },
        setPlayArrows(state, { payload }) {
            state.playArrows = payload
        },
        setShowBeatStringAnnotation(state, { payload }) {
            state.showBeatStringAnnotations = payload
        },
        setScriptMatchesDAW(state, { payload }) {
            state.scriptMatchesDAW = payload
        },
    },
})

const persistConfig = {
    key: "ide",
    whitelist: ["autocomplete", "playArrows", "showBeatStringAnnotations"],
    storage,
}

export default persistReducer(persistConfig, ideSlice.reducer)
export const {
    setBlocksMode,
    setLogs,
    pushLog,
    setAutocomplete,
    setPlayArrows,
    setShowBeatStringAnnotation,
    setScriptMatchesDAW,
} = ideSlice.actions

export const selectBlocksMode = (state: RootState) => state.ide.blocksMode
export const selectLogs = (state: RootState) => state.ide.logs
export const selectAutocomplete = (state: RootState) => state.ide.autocomplete
export const selectPlayArrows = (state: RootState) => state.ide.playArrows
export const selectShowBeatStringAnnotation = (state: RootState) => state.ide.showBeatStringAnnotations
export const selectScriptMatchesDAW = (state: RootState) => state.ide.scriptMatchesDAW
