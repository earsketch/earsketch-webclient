import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../reducers"

export type FocusRecord =
    | { type: "editor"; line: number; label: string; panelId: string }
    | { type: "element"; key: string; label: string; panelId: string }

interface FocusHistoryState {
    entries: [FocusRecord | null, FocusRecord | null]
    // writeIndex is where the NEXT push goes.
    // Most recent entry is at (writeIndex + 1) % 2.
    // Older entry is at writeIndex (will be overwritten next).
    writeIndex: 0 | 1
}

const initialState: FocusHistoryState = {
    entries: [null, null],
    writeIndex: 0,
}

const focusHistorySlice = createSlice({
    name: "focusHistory",
    initialState,
    reducers: {
        pushFocus(state, action: PayloadAction<FocusRecord>) {
            state.entries[state.writeIndex] = action.payload
            state.writeIndex = ((state.writeIndex + 1) % 2) as 0 | 1
        },
        // Same panel: overwrite the current newer slot without advancing the ring.
        updateNewerFocus(state, action: PayloadAction<FocusRecord>) {
            state.entries[(state.writeIndex + 1) % 2] = action.payload
        },
    },
})

export const { pushFocus, updateNewerFocus } = focusHistorySlice.actions
export default focusHistorySlice.reducer

export const selectNewerFocus = (state: RootState): FocusRecord | null =>
    state.focusHistory.entries[(state.focusHistory.writeIndex + 1) % 2]

export const selectOlderFocus = (state: RootState): FocusRecord | null =>
    state.focusHistory.entries[state.focusHistory.writeIndex]
