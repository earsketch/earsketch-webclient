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

export const horizontalMinSize = 45;
const windowWidth = () => window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
const windowHeight = () => window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;

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