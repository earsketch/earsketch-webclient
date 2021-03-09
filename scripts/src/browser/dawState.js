import { createSlice, createSelector } from '@reduxjs/toolkit'

const TRACK_COLORS = ['#f2fdbf','#f3d8b2','#ff8080','#9fa2fd','#9fb2fd','#9fc2fd','#9fd2fd','#9fe2fd',
                      '#9ff2fd','#9fe29d','#9fe2bd','#bfe2bf','#dfe2bf','#ffe2bf','#ffff00','#ffc0cb']

const dawSlice = createSlice({
    name: 'daw',
    initialState: {
        tracks: [],
        playLength: 0,
        measuresFitToScreen: 61, // TODO: Does this ever change? If not, just make it a constant.
        trackWidth: 2750, // TODO: Not sure why this changes from its initial value (650).
        trackHeight: 45,
        trackColors: TRACK_COLORS, // TODO: Shuffle colors appropriately.
    },
    reducers: {
        setTracks(state, { payload }) {
            state.tracks = payload
        },
        setPlayLength(state, { payload }) {
            state.playLength = payload
        },
        setMeasuresFitToScreen(state, { payload }) {
            state.measuresFitToScreen = payload
        },
        setTrackWidth(state, { payload }) {
            state.trackWidth = payload
        },
        setTrackHeight(state, { payload }) {
            state.trackHeight = payload
        }
    }
})

// TODO
// $scope.fillTrackColors = function (numTracks) {
//     $scope.trackColors = [];
//     if (numTracks < $scope.trackColorsSet.length) {
//         $scope.trackColors = $scope.shuffle($scope.trackColorsSet,numTracks);
//     } else {
//         var shuffledArray = $scope.shuffle($scope.trackColorsSet);
//         for (var i = 0; i<numTracks; i++) {
//             $scope.trackColors.push(shuffledArray[i%shuffledArray.length]);
//         }
//     }
//     $scope.preserve.trackColors = true;
// };

export default dawSlice.reducer
export const {
    setTracks,
    setPlayLength,
    setMeasuresFitToScreen,
    setTrackWidth,
    setTrackHeight,
} = dawSlice.actions

export const selectTracks = state => state.daw.tracks
export const selectPlayLength = state => state.daw.playLength
export const selectMeasuresFitToScreen = state => state.daw.measuresFitToScreen
export const selectTrackWidth = state => state.daw.trackWidth
export const selectTrackHeight = state => state.daw.trackHeight
export const selectTrackColors = state => state.daw.trackColors

export const selectMixTrackHeight = createSelector(
    [selectTrackHeight],
    (trackHeight) => {
        return Math.max(25, Math.round(trackHeight / 2))
    }
)

export const selectXScale = createSelector(
    [selectMeasuresFitToScreen, selectTrackWidth],
    (measuresFitToScreen, trackWidth) => {
        return (x) => (x - 1)/(measuresFitToScreen - 1) * trackWidth
})

