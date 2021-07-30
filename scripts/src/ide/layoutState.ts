import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit"

import { RootState, ThunkAPI } from "../reducers"

export const BrowserTabType = {
    Sound: 0,
    Script: 1,
    API: 2,
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type BrowserTabType = typeof BrowserTabType[keyof typeof BrowserTabType]

const layoutSlice = createSlice({
    name: "layout",
    initialState: {
        west: {
            open: true,
            kind: BrowserTabType.Sound as BrowserTabType,
            size: 280,
        },
        east: {
            open: true,
            kind: "CURRICULUM",
            size: 280,
        },
        north: {
            size: 220,
        },
        south: {
            size: 150,
        },
    },
    reducers: {
        setWest(state, { payload }) {
            Object.assign(state.west, payload)
        },
        setEast(state, { payload }) {
            Object.assign(state.east, payload)
        },
        setNorth(state, { payload }) {
            Object.assign(state.north, payload)
        },
        setSouth(state, { payload }) {
            Object.assign(state.south, payload)
        },
    },
})

export default layoutSlice.reducer
export const {
    setWest,
    setEast,
    setNorth,
    setSouth,
} = layoutSlice.actions

const windowWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
const windowHeight = () => window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight

export const isWestOpen = (state: RootState) => state.layout.west.open
export const isEastOpen = (state: RootState) => state.layout.east.open

export const setHorizontalSizesFromRatio = createAsyncThunk<void, number[], ThunkAPI>(
    "layout/setHorizontalSizesFromRatio",
    (ratio, { getState, dispatch }) => {
        const width = windowWidth()
        // Do not remember the sizes for closed panes.
        isWestOpen(getState()) && dispatch(setWest({ size: width * ratio[0] / 100 }))
        isEastOpen(getState()) && dispatch(setEast({ size: width * ratio[2] / 100 }))
    }
)

export const setVerticalSizesFromRatio = createAsyncThunk<void, number[], ThunkAPI>(
    "layout/setVerticalSizesFromRatio",
    (ratio, { dispatch }) => {
        const height = windowHeight()
        dispatch(setNorth({ size: height * ratio[0] / 100 }))
        dispatch(setSouth({ size: height * ratio[2] / 100 }))
    }
)

const selectWestSize = (state: RootState) => state.layout.west.size
const selectEastSize = (state: RootState) => state.layout.east.size
const selectNorthSize = (state: RootState) => state.layout.north.size
const selectSouthSize = (state: RootState) => state.layout.south.size

export const COLLAPSED_WIDTH = 45
export const MIN_WIDTH = 280
export const MIN_DAW_HEIGHT = 40
export const MIN_EDITOR_HEIGHT = 100

export const selectHorizontalRatio = createSelector(
    [selectWestSize, selectEastSize, isWestOpen, isEastOpen],
    (west, east, westIsOpen, eastIsOpen) => {
        const width = windowWidth()
        west = (westIsOpen ? west : COLLAPSED_WIDTH) / width * 100
        east = (eastIsOpen ? east : COLLAPSED_WIDTH) / width * 100
        return [west, 100 - (west + east), east]
    }
)

export const selectVerticalRatio = createSelector(
    [selectNorthSize, selectSouthSize],
    (north, south) => {
        const height = windowHeight()
        north = north / height * 100
        south = south / height * 100
        return [north, 100 - (north + south), south]
    }
)

export const selectWestKind = (state: RootState) => state.layout.west.kind
export const selectEastKind = (state: RootState) => state.layout.east.kind
