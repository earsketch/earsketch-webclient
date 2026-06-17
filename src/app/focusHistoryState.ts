import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../reducers"

export type FocusRecord =
    | { type: "editor"; line: number; label: string; panelId: string }
    | { type: "element"; key: string; label: string; panelId: string }

const RING_SIZE = 6

interface FocusHistoryState {
    entries: (FocusRecord | null)[]
    // writeIndex is where the NEXT push goes.
    // Most recent entry is at (writeIndex - 1 + RING_SIZE) % RING_SIZE.
    // Oldest entry is at writeIndex (will be overwritten next).
    writeIndex: number
    count: number      // valid entries, 0..RING_SIZE
    navOffset: number  // 0 = newest, count-1 = oldest; resets to 0 on each new push
}

const initialState: FocusHistoryState = {
    entries: Array(RING_SIZE).fill(null),
    writeIndex: 0,
    count: 0,
    navOffset: 0,
}

const focusHistorySlice = createSlice({
    name: "focusHistory",
    initialState,
    reducers: {
        pushFocus(state, action: PayloadAction<FocusRecord>) {
            state.entries[state.writeIndex] = action.payload
            state.writeIndex = (state.writeIndex + 1) % RING_SIZE
            state.count = Math.min(state.count + 1, RING_SIZE)
            state.navOffset = 0
        },
        // Same panel: overwrite the newest slot without advancing the ring.
        updateNewerFocus(state, action: PayloadAction<FocusRecord>) {
            state.entries[(state.writeIndex - 1 + RING_SIZE) % RING_SIZE] = action.payload
        },
        stepBackward(state) {
            state.navOffset = Math.min(state.navOffset + 1, state.count - 1)
        },
        stepForward(state) {
            state.navOffset = Math.max(state.navOffset - 1, 0)
        },
    },
})

export const { pushFocus, updateNewerFocus, stepBackward, stepForward } = focusHistorySlice.actions
export default focusHistorySlice.reducer

// Most recently pushed entry — used by the focusin listener for dedup and same-panel checks.
export const selectNewerFocus = (state: RootState): FocusRecord | null => {
    const { entries, writeIndex, count } = state.focusHistory
    if (count === 0) return null
    return entries[(writeIndex - 1 + RING_SIZE) % RING_SIZE]
}

// Entry at the current navigation cursor position.
export const selectAtNavOffset = (state: RootState): FocusRecord | null => {
    const { entries, writeIndex, count, navOffset } = state.focusHistory
    if (count === 0) return null
    return entries[(writeIndex - 1 - navOffset + RING_SIZE * 2) % RING_SIZE]
}
