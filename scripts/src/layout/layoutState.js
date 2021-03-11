import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';

const layoutSlice = createSlice({
    name: 'layout',
    initialState: {
        west: {
            open: true,
            kind: 'SOUNDS',
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
const layoutMutableState = {
    horizontalSplits: null,
    verticalSplits: null,
    minSize: horizontalMinSize
};

export const setHorizontalSplits = ref => {
    layoutMutableState.horizontalSplits = ref;
};

export const setVerticalSplits = ref => {
    layoutMutableState.verticalSplits = ref;
};

export const getHorizontalSplits = () => layoutMutableState.horizontalSplits;
export const getVerticalSplits = () => layoutMutableState.verticalSplits;

export const setMinSize = size => {
    layoutMutableState.minSize = size;
}
export const getMinSize = () => layoutMutableState.minSize;

export const isWestOpen = state => state.layout.west.open;
export const isEastOpen = state => state.layout.east.open;

export const setHorizontalSizesFromRatio = createAsyncThunk(
    'layout/setHorizontalSizesFromRatio',
    (ratio, { getState, dispatch }) => {
        const width  = windowWidth();
        // Do not remember the sizes for closed panes.
        isWestOpen(getState()) && dispatch(setWestSize(width*ratio[0]/100));
        isEastOpen(getState()) && dispatch(setEastSize(width*ratio[2]/100));
    }
);

export const setVerticalSizesFromRatio = createAsyncThunk(
    'layout/setVerticalSizesFromRatio',
    (ratio, { dispatch }) => {
        const height = windowHeight();
        dispatch(setNorthSize(height*ratio[0]/100));
        dispatch(setSouthSize(height*ratio[2]/100));
    }
);

export const openWest = createAsyncThunk(
    'layout/openWest',
    (kind, { getState, dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setWest(kind ? { open: true, kind } : { open: true }));
            layoutMutableState.horizontalSplits.setSizes(selectHorizontalRatio(getState()));
            document.getElementById(`gutter-horizontal-0`).style['pointer-events'] = 'auto';
        }
    }
);

export const collapseWest = createAsyncThunk(
    'layout/collapseWest',
    (_, { dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setWest({ open: false }));
            layoutMutableState.horizontalSplits.collapse(0);
            document.getElementById(`gutter-horizontal-0`).style['pointer-events'] = 'none';
        }
    }
);

export const openEast = createAsyncThunk(
    'layout/openEast',
    (_, { getState, dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setEast({ open: true }));
            layoutMutableState.horizontalSplits.setSizes(selectHorizontalRatio(getState()));
            document.getElementById(`gutter-horizontal-1`).style['pointer-events'] = 'auto';
        }
    }
);

export const collapseEast = createAsyncThunk(
    'layout/collapseEast',
    (_, { dispatch }) => {
        if (layoutMutableState.horizontalSplits) {
            dispatch(setEast({ open: false }));
            layoutMutableState.horizontalSplits.collapse(2);
            document.getElementById(`gutter-horizontal-1`).style['pointer-events'] = 'none';
        }
    }
);

export const collapseSouth = createAsyncThunk(
    'layout/collapseSouth',
    (_, { dispatch }) => {
        if (layoutMutableState.verticalSplits) {
            dispatch(setSouth({ open: false }));
            layoutMutableState.verticalSplits.collapse(2);
            document.getElementById(`gutter-vertical-1`).style['pointer-events'] = 'none';
        }
    }
);

export const setNorthFromRatio = createAsyncThunk(
    'layout/setNorthFromRatio',
    (ratio, { getState, dispatch }) => {
        if (layoutMutableState.verticalSplits) {
            dispatch(setNorth({ open: true }));
            dispatch(setVerticalSizesFromRatio(ratio));
            layoutMutableState.verticalSplits.setSizes(selectVerticalRatio(getState()));
            document.getElementById(`gutter-vertical-0`).style['pointer-events'] = 'auto';
        }
    }
);

const selectWestSize = state => state.layout.west.size;
const selectEastSize = state => state.layout.east.size;
const selectNorthSize = state => state.layout.north.size;
const selectSouthSize = state => state.layout.south.size;

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

export const selectWestKind = state => state.layout.west.kind;