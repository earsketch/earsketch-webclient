import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'
import Split from 'split.js'

import * as Layout from "./Layout"
import { RootState, ThunkAPI } from '../reducers';

export const BrowserTabType = {
    Sound: 0,
    Script: 1,
    API: 2
} as const

export type BrowserTabType = typeof BrowserTabType[keyof typeof BrowserTabType];

const layoutSlice = createSlice({
    name: 'layout',
    initialState: {
        west: {
            open: true,
            kind: BrowserTabType.Sound,
            size: 280
        },
        east: {
            open: true,
            kind: 'CURRICULUM',
            size: 280
        },
        north: {
            open: true,
            size: 220
        },
        south: {
            open: true,
            size: 150
        }
    },
    reducers: {
        setWest(state, { payload }) {
            Object.assign(state.west, payload);
        },
        setEast(state, { payload }) {
            Object.assign(state.east, payload);
        },
        setNorth(state, { payload }) {
            Object.assign(state.north, payload);
        },
        setSouth(state, { payload }) {
            Object.assign(state.south, payload);
        },
        setWestSize(state, { payload }) {
            state.west.size = payload;
        },
        setEastSize(state, { payload }) {
            state.east.size = payload;
        },
        setNorthSize(state, { payload }) {
            state.north.size = payload;
        },
        setSouthSize(state, { payload }) {
            state.south.size = payload;
        }
    }
});

export default layoutSlice.reducer;
export const {
    setWest,
    setEast,
    setNorth,
    setSouth,
    setWestSize,
    setEastSize,
    setNorthSize,
    setSouthSize
} = layoutSlice.actions;

export const horizontalMinSize = 45;
const windowWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
const windowHeight = () => window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;

// TODO: Temporary side-effect elements with DOM-based split.js. To be removed when we switch split.js to the react version.
interface LayoutMutableState {
    horizontalSplits: Split.Instance | null,
    verticalSplits: Split.Instance | null,
    minSize: number,
    gutterSize: number
}

const layoutMutableState: LayoutMutableState = {
    horizontalSplits: null,
    verticalSplits: null,
    minSize: horizontalMinSize,
    gutterSize: 8
};

export const setHorizontalSplits = (ref: Split.Instance | null) => {
    layoutMutableState.horizontalSplits = ref;
};

export const setVerticalSplits = (ref: Split.Instance | null) => {
    layoutMutableState.verticalSplits = ref;
};

export const getHorizontalSplits = () => layoutMutableState.horizontalSplits;
export const getVerticalSplits = () => layoutMutableState.verticalSplits;

export const setMinSize = (size: number) => {
    layoutMutableState.minSize = size;
};
export const getMinSize = () => layoutMutableState.minSize;

export const setGutterSize = (size: number) => {
    layoutMutableState.gutterSize = size;
};
export const getGutterSize = () => layoutMutableState.gutterSize;

export const isWestOpen = (state: RootState) => state.layout.west.open;
export const isEastOpen = (state: RootState) => state.layout.east.open;

export const setHorizontalSizesFromRatio = createAsyncThunk<void, number[], ThunkAPI>(
    'layout/setHorizontalSizesFromRatio',
    (ratio, { getState, dispatch }) => {
        const width  = windowWidth();
        // Do not remember the sizes for closed panes.
        isWestOpen(getState()) && dispatch(setWestSize(width*ratio[0]/100));
        isEastOpen(getState()) && dispatch(setEastSize(width*ratio[2]/100));
    }
);

export const setVerticalSizesFromRatio = createAsyncThunk<void, number[], ThunkAPI>(
    'layout/setVerticalSizesFromRatio',
    (ratio, { dispatch }) => {
        const height = windowHeight();
        dispatch(setNorthSize(height*ratio[0]/100));
        dispatch(setSouthSize(height*ratio[2]/100));
    }
);

export const openWest = createAsyncThunk<void, BrowserTabType|void, ThunkAPI>(
    'layout/openWest',
    (kind, { getState, dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setWest(kind !== undefined ? { open: true, kind } : { open: true }));
            layoutMutableState.horizontalSplits.setSizes(selectHorizontalRatio(getState()));
            const gutter = document.getElementById(`gutter-horizontal-0`);
            if (gutter) gutter.style['pointerEvents'] = 'auto';
        }
    }
);

export const collapseWest = createAsyncThunk(
    'layout/collapseWest',
    (_, { dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setWest({ open: false }));
            layoutMutableState.horizontalSplits.collapse(0);
            const gutter = document.getElementById(`gutter-horizontal-0`);
            if (gutter) gutter.style['pointerEvents'] = 'none';
        }
    }
);

export const openEast = createAsyncThunk<void, string|void, ThunkAPI>(
    'layout/openEast',
    (kind, { getState, dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setEast(kind !== undefined ? { open: true, kind } : { open: true }));
            layoutMutableState.horizontalSplits.setSizes(selectHorizontalRatio(getState()));
            const gutter = document.getElementById(`gutter-horizontal-1`);
            if (gutter) gutter.style['pointerEvents'] = 'auto';
        }
    }
);

export const collapseEast = createAsyncThunk(
    'layout/collapseEast',
    (_, { dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setEast({ open: false }));
            layoutMutableState.horizontalSplits.collapse(2);
            const gutter = document.getElementById(`gutter-horizontal-1`);
            if (gutter) gutter.style['pointerEvents'] = 'none';
        }
    }
);

export const collapseSouth = createAsyncThunk(
    'layout/collapseSouth',
    (_, { dispatch }) => {
        if (layoutMutableState.verticalSplits) {
            dispatch(setSouth({ open: false }));
            layoutMutableState.verticalSplits.collapse(2);
            const gutter = document.getElementById(`gutter-vertical-1`);
            if (gutter) gutter.style['pointerEvents'] = 'none';
        }
    }
);

export const setNorthFromRatio = createAsyncThunk<void, number[], ThunkAPI>(
    'layout/setNorthFromRatio',
    (ratio, { getState, dispatch }) => {
        if (layoutMutableState.verticalSplits) {
            dispatch(setNorth({ open: true }));
            dispatch(setVerticalSizesFromRatio(ratio));
            layoutMutableState.verticalSplits.setSizes(selectVerticalRatio(getState()));
            const gutter = document.getElementById(`gutter-vertical-0`);
            if (gutter) gutter.style['pointerEvents'] = 'auto';
        }
    }
);

const selectWestSize = (state: RootState) => state.layout.west.size;
const selectEastSize = (state: RootState) => state.layout.east.size;
const selectNorthSize = (state: RootState) => state.layout.north.size;
const selectSouthSize = (state: RootState) => state.layout.south.size;

export const selectHorizontalRatio = createSelector(
    [selectWestSize, selectEastSize, isWestOpen, isEastOpen],
    (west, east, westIsOpen, eastIsOpen) => {
        const width = windowWidth();
        west = (westIsOpen ? west : horizontalMinSize)/width*100;
        east = (eastIsOpen ? east : horizontalMinSize)/width*100;
        return [west,100-(west+east),east];
    }
);

export const selectVerticalRatio = createSelector(
    [selectNorthSize, selectSouthSize],
    (north, south) => {
        const height = windowHeight();
        north = north/height*100;
        south = south/height*100;
        return [north,100-(north+south),south];
    }
);

export const selectWestKind = (state: RootState) => state.layout.west.kind;
export const selectEastKind = (state: RootState) => state.layout.east.kind;
