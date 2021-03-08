import { createSlice, createSelector } from '@reduxjs/toolkit'

const dawSlice = createSlice({
    name: 'daw',
    initialState: {
        tracks: [],
    },
    reducers: {
        setTracks(state, { payload }) {
            state.tracks = payload
        },
    }
})

export default dawSlice.reducer
export const {
    setTracks,
} = dawSlice.actions

export const selectTracks = state => state.daw.tracks
