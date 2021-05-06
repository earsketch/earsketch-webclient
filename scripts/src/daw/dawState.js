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
const MEASURELINE_ZOOM_INTERVALS = [
    {start: 649, end: 750, tickInterval: 4, labelInterval: 4, tickDivision: 1},
    {start: 750, end: 1350, tickInterval: 1, labelInterval: 4, tickDivision: 4},
    {start: 1350, end: 1950, tickInterval: 0.5, labelInterval: 4, tickDivision: 1},
    {start: 1950, end: 2850, tickInterval: 0.5, labelInterval: 1, tickDivision: 1},
    {start: 2850, end: 50000, tickInterval: 0.25, labelInterval: 1, tickDivision: 1}
]

// Intervals of timeline based on zoom levels
// This list is referred during zoom in/out
const TIMELINE_ZOOM_INTERVALS = [
    {start: 649, end: 950, tickInterval: 15},
    {start: 950, end: 1550, tickInterval: 10},
    {start: 1550, end: 2650, tickInterval: 5},
    {start: 2650, end: 2950, tickInterval: 5},
    {start: 2950, end: 3950, tickInterval: 4},
    {start: 3950, end: 7850, tickInterval: 2},
    {start: 7850, end: 9150, tickInterval: 1},
    {start: 9150, end: 50000, tickInterval: 1}
]

// We want to keep the length of a bar proportional to number of pixels on the screen.
// We also don't want this proportion to change based on songs of different length.
// So, we set a default number of measures that we want the screen to fit in.
const MEASURES_FIT_TO_SCREEN = 61

const dawSlice = createSlice({
    name: 'daw',
    initialState: {
        tracks: [],
        playLength: 0,
        trackWidth: 2750,  // TODO: Not sure why this changes from its initial value (650).
        trackHeight: 45,
        trackColors: shuffle(TRACK_COLORS.slice()),
        showEffects: true,
        metronome: false,
        tempo: 120,
        playing: false,
        pendingPosition: null,  // null indicates no position pending.
        soloMute: {},  // Track index -> "mute" or "solo"
        bypass: {},  // Track index -> [bypassed effect keys]
        loop: {
            selection: false, // false = loop whole track
            start: 1,
            end: 1,
            on: false, // true = enable looping
            reset: false,
        },
        autoScroll: true,
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
        toggleEffects(state) {
            state.showEffects = !state.showEffects
        },
        setMetronome(state, { payload }) {
            state.metronome = payload
        },
        setTempo(state, { payload }) {
            state.tempo = payload
        },
        setPlaying(state, { payload }) {
            state.playing = payload
        },
        setPendingPosition(state, { payload }) {
            state.pendingPosition = payload
        },
        setSoloMute(state, { payload }) {
            state.soloMute = payload
        },
        setBypass(state, { payload }) {
            state.bypass = payload
        },
        setLoop(state, { payload }) {
            state.loop = payload
        },
        setAutoScroll(state, { payload }) {
            state.autoScroll = payload
        },
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
    toggleEffects,
    setMetronome,
    setTempo,
    setPlaying,
    setPendingPosition,
    setSoloMute,
    setBypass,
    setLoop,
    setAutoScroll,
} = dawSlice.actions

export const selectTracks = state => state.daw.tracks
export const selectPlayLength = state => state.daw.playLength
export const selectTrackWidth = state => state.daw.trackWidth
export const selectTrackHeight = state => state.daw.trackHeight
export const selectTrackColors = state => state.daw.trackColors
export const selectShowEffects = state => state.daw.showEffects
export const selectMetronome = state => state.daw.metronome
export const selectTempo = state => state.daw.tempo
export const selectPlaying = state => state.daw.playing
export const selectPendingPosition = state => state.daw.pendingPosition
export const selectSoloMute = state => state.daw.soloMute
export const selectBypass = state => state.daw.bypass
export const selectLoop = state => state.daw.loop
export const selectAutoScroll = state => state.daw.autoScroll

export const selectMixTrackHeight = createSelector(
    [selectTrackHeight],
    (trackHeight) => {
        return Math.max(25, Math.round(trackHeight / 2))
    }
)

export const selectXScale = createSelector(
    [selectTrackWidth],
    (trackWidth) => {
        // Would prefer to do this, but d3 won't accept a plain function in d3.svg.axis().scale(...).
        // return (x) => (x - 1)/(MEASURES_FIT_TO_SCREEN - 1) * trackWidth
        return d3.scale.linear()
            .domain([1, MEASURES_FIT_TO_SCREEN])
            .range([0, trackWidth])
    }
)

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

const getZoomIntervals = (intervals, width) => {
    for (const zoomIntervals of intervals) {
        if (width > zoomIntervals.start && width <= zoomIntervals.end) {
            return zoomIntervals
        }
    }
}

export const selectMeasurelineZoomIntervals = createSelector(
    [selectTrackWidth],
    width => getZoomIntervals(MEASURELINE_ZOOM_INTERVALS, width)
)

export const selectTimelineZoomIntervals = createSelector(
    [selectTrackWidth],
    width => getZoomIntervals(TIMELINE_ZOOM_INTERVALS, width)
)

export const getMuted = (tracks, soloMute, metronome) => {
    const keys = Object.keys(tracks).map(x => +x)
    const soloed = keys.filter(key => soloMute[key] === "solo")
    if (soloed.length > 0) {
        // Omit mix track and (if metronome is enabled) metronome track.
        return keys.filter(key => !soloed.includes(key) && key !== 0 && (!metronome || key !== keys.length - 1))
    } else {
        return [...keys.filter(key => soloMute[key] === "mute"), ...(metronome ? [] : [keys.length - 1])]
    }
}

// Returns an array of all tracks that should be muted, by index.
export const selectMuted = createSelector([selectTracks, selectSoloMute, selectMetronome], getMuted)

export const selectTotalTrackHeight = createSelector(
    [selectTracks, selectShowEffects, selectTrackHeight, selectMixTrackHeight],
    (tracks, effects, height, mixHeight) => {
        let total = 0
        tracks.forEach((track, index) => {
            if (track.visible) {
                total += (index === 0 ? mixHeight : height)
                if (effects) {
                    total += height * Object.keys(track.effects).length
                }
            }
        })
        return total
    }
)