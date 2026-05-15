import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../reducers"

export type SyncStatus = "disconnected" | "connecting" | "connected" | "error"

interface SyncState {
    status: SyncStatus
    backendKind: "drive" | "fsa" | null
    lastSyncTime: number | null
    syncing: boolean
    error: string | null
}

const syncSlice = createSlice({
    name: "sync",
    initialState: {
        status: "disconnected",
        backendKind: null,
        lastSyncTime: null,
        syncing: false,
        error: null,
    } as SyncState,
    reducers: {
        setStatus(state, action: PayloadAction<SyncStatus>) {
            state.status = action.payload
            if (action.payload !== "error") {
                state.error = null
            }
        },
        setBackendKind(state, action: PayloadAction<"drive" | "fsa" | null>) {
            state.backendKind = action.payload
        },
        setSyncing(state, action: PayloadAction<boolean>) {
            state.syncing = action.payload
        },
        setLastSyncTime(state, action: PayloadAction<number>) {
            state.lastSyncTime = action.payload
        },
        setError(state, action: PayloadAction<string>) {
            state.status = "error"
            state.error = action.payload
        },
        resetSync(state) {
            state.status = "disconnected"
            state.backendKind = null
            state.lastSyncTime = null
            state.syncing = false
            state.error = null
        },
    },
})

export const { setStatus, setBackendKind, setSyncing, setLastSyncTime, setError, resetSync } = syncSlice.actions

export const selectSyncStatus = (state: RootState) => state.sync.status
export const selectSyncBackendKind = (state: RootState) => state.sync.backendKind
export const selectSyncSyncing = (state: RootState) => state.sync.syncing
export const selectSyncLastTime = (state: RootState) => state.sync.lastSyncTime
export const selectSyncError = (state: RootState) => state.sync.error

export default syncSlice.reducer
