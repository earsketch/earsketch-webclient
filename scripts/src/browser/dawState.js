import { createSlice, createSelector } from '@reduxjs/toolkit'

const shuffle = (array) => {
    let i = array.length
    while (i) {
        const r = Math.floor(Math.random() * i--)
        const temp = array[i]
        array[i] = array[r]
        array[r] = temp
    }
    return array
}

const TRACK_COLORS = ['#f2fdbf','#f3d8b2','#ff8080','#9fa2fd','#9fb2fd','#9fc2fd','#9fd2fd','#9fe2fd',
                      '#9ff2fd','#9fe29d','#9fe2bd','#bfe2bf','#dfe2bf','#ffe2bf','#ffff00','#ffc0cb']

const BEATS_PER_MEASURE = 4

// Intervals of measure line based on zoom levels
// This list is referred during zoom in/out
const MEASURE_LINE_ZOOM_INTERVALS = [
    {start: 649, end: 750, tickInterval: 4, labelInterval: 4, tickDivision: 1},
    {start: 750, end: 1350, tickInterval: 1, labelInterval: 4, tickDivision: 4},
    {start: 1350, end: 1950, tickInterval: 0.5, labelInterval: 4, tickDivision: 1},
    {start: 1950, end: 2850, tickInterval: 0.5, labelInterval: 1, tickDivision: 1},
    {start: 2850, end: 50000, tickInterval: 0.25, labelInterval: 1, tickDivision: 1}
]

// We want to keep the length of a bar proportional to number of pixels on the screen.
// We also don't want this proportion to change based on songs of different length.
// So, we set a default number of measures that we want the screen to fit in.
const MEASURES_FIT_TO_SCREEN = 61

const dawSlice = createSlice({
    name: 'daw',
    initialState: {
        tracks: [],
        playPosition: 1,  // Current play position in measures.
        playLength: 0,
        trackWidth: 2750, // TODO: Not sure why this changes from its initial value (650).
        trackHeight: 45,
        trackColors: shuffle(TRACK_COLORS.slice()),
        showEffects: true,
        metronome: false,
        tempo: 120,
        // TODO: playing = false,
    },
    reducers: {
        setTracks(state, { payload }) {
            state.tracks = payload
        },
        setPlayLength(state, { payload }) {
            state.playLength = payload
        },
        setTrackWidth(state, { payload }) {
            state.trackWidth = payload
        },
        setTrackHeight(state, { payload }) {
            state.trackHeight = payload
        },
        shuffleTrackColors(state) {
            state.trackColors = shuffle(TRACK_COLORS.slice())
        },
        setShowEffects(state, { payload }) {
            state.showEffects = payload
        },
        setMetronome(state, { payload }) {
            state.metronome = payload
        },
        setTempo(state, { payload }) {
            state.tempo = payload
        }
    }
})

export default dawSlice.reducer
export const {
    setTracks,
    setPlayLength,
    setTrackWidth,
    setTrackHeight,
    shuffleTrackColors,
    setShowEffects,
    setMetronome,
    setTempo,
} = dawSlice.actions

export const selectTracks = state => state.daw.tracks
export const selectPlayLength = state => state.daw.playLength
export const selectTrackWidth = state => state.daw.trackWidth
export const selectTrackHeight = state => state.daw.trackHeight
export const selectTrackColors = state => state.daw.trackColors
export const selectTempo = state => state.daw.tempo

export const selectMixTrackHeight = createSelector(
    [selectTrackHeight],
    (trackHeight) => {
        return Math.max(25, Math.round(trackHeight / 2))
    }
)

export const selectXScale = createSelector(
    [selectTrackWidth],
    (trackWidth) => {
        return (x) => (x - 1)/(MEASURES_FIT_TO_SCREEN - 1) * trackWidth
})

export const selectTimeScale = createSelector(
    [selectTrackWidth, selectTempo],
    (trackWidth, tempo) => {
        const secondsFitToScreen = MEASURES_FIT_TO_SCREEN*BEATS_PER_MEASURE/(tempo/60)
        return d3.scale.linear()
                       .domain([0, secondsFitToScreen])
                       .range([0, trackWidth])
    }
)

export const selectSongDuration = createSelector(
    [selectPlayLength, selectTempo],
    (playLength, tempo) => playLength*BEATS_PER_MEASURE/(tempo/60)
)

export const selectZoomIntervals = createSelector(
    [selectTrackWidth],
    (width) => {
        width = 650 // TODO: This looks wrong if it uses 2750, but other things like wrong if they use 650...
        for (const zoomInterval of MEASURE_LINE_ZOOM_INTERVALS) {
            if (width > zoomInterval.start && width <= zoomInterval.end) {
                return zoomInterval
            }
        }
    }
)