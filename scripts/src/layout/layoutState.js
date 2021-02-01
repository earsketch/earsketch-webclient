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
            size: 150
        },
        south: {
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
    setWestSize,
    setEastSize,
    setNorthSize,
    setSouthSize
} = layoutSlice.actions;

const windowWidth = () => {
    return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
};

const windowHeight = () => {
    return window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
};

export const setHorzSizesFromRatio = createAsyncThunk(
    'layout/setHorzSizes',
    (ratio, { dispatch }) => {
        const width  = windowWidth();
        dispatch(setWestSize(width*ratio[0]/100));
        dispatch(setEastSize(width*ratio[2]/100));
    }
);

export const setVertSizesFromRatio = createAsyncThunk(
    'layout/setVertSizes',
    (ratio, { dispatch }) => {
        const height = windowHeight();
        dispatch(setNorthSize(height*ratio[0]/100));
        dispatch(setSouthSize(height*ratio[2]/100));
    }
);

const selectWestSize = state => state.layout.west.size;
const selectEastSize = state => state.layout.east.size;
const selectNorthSize = state => state.layout.north.size;
const selectSouthSize = state => state.layout.south.size;

export const selectHorzRatio = createSelector(
    [selectWestSize, selectEastSize],
    (west, east) => {
        const width = windowWidth();
        west = west/width*100;
        east = east/width*100;
        return [west,100-(west+east),east];
    }
);

export const selectVertRatio = createSelector(
    [selectNorthSize, selectSouthSize],
    (north, south) => {
        const height = windowHeight();
        north = north/height*100;
        south = south/height*100;
        return [north,100-(north+south),south];
    }
);

export const selectWestKind = state => state.layout.west.kind;