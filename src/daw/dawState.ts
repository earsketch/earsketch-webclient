import { createSlice, createSelector } from "@reduxjs/toolkit"

import type { RootState } from "../reducers"
import type { Track } from "common"
import { TempoMap } from "../app/tempo"

const shuffle = (array: any[]) => {
    let i = array.length
    while (i) {
        const r = Math.floor(Math.random() * i--)
        const temp = array[i]
        array[i] = array[r]
        array[r] = temp
    }
    return array
}

const TRACK_COLORS = ["#f2fdbf", "#f3d8b2", "#ff8080", "#9fa2fd", "#9fb2fd", "#9fc2fd", "#9fd2fd", "#9fe2fd",
    "#9ff2fd", "#9fe29d", "#9fe2bd", "#bfe2bf", "#dfe2bf", "#ffe2bf", "#ffff00", "#ffc0cb"]

// Intervals of measure line based on zoom levels
const MEASURELINE_ZOOM_INTERVALS = [
    { end: 750, tickInterval: 4, labelInterval: 4, tickDivision: 1 },
    { end: 1350, tickInterval: 1, labelInterval: 4, tickDivision: 4 },
    { end: 1950, tickInterval: 0.5, labelInterval: 4, tickDivision: 1 },
    { end: 2850, tickInterval: 0.5, labelInterval: 1, tickDivision: 1 },
    { end: Infinity, tickInterval: 0.25, labelInterval: 1, tickDivision: 1 },
]

// Intervals of timeline based on zoom levels
const TIMELINE_ZOOM_INTERVALS = [
    { end: 950, tickInterval: 1, labelInterval: 15 },
    { end: 1550, tickInterval: 1, labelInterval: 10 },
    { end: 2650, tickInterval: 1, labelInterval: 5 },
    { end: 2950, tickInterval: 1, labelInterval: 5 },
    { end: 3950, tickInterval: 1, labelInterval: 4 },
    { end: 7850, tickInterval: 1, labelInterval: 2 },
    { end: 9150, tickInterval: 0.5, labelInterval: 1 },
    { end: 12850, tickInterval: 0.25, labelInterval: 1 },
    { end: Infinity, tickInterval: 0.125, labelInterval: 1 },
]

// We want to keep the length of a bar proportional to number of pixels on the screen.
// We also don't want this proportion to change based on songs of different length.
// So, we set a default number of measures that we want the screen to fit in.
const MEASURES_FIT_TO_SCREEN = 61

export type Color = string

export type SoloMute = "solo" | "mute" | undefined

interface SoloMuteConfig {
    [key: number]: SoloMute
}

interface DAWState {
    tracks: Track[]
    playLength: number
    trackWidth: number
    trackHeight: number
    trackColors: Color[]
    showEffects: boolean
    metronome: boolean
    tempoMap: TempoMap
    playing: boolean
    pendingPosition: number | null
    soloMute: SoloMuteConfig
    bypass: { [key: number]: string[] }
    loop: {
        selection: boolean,
        start: number,
        end: number,
        on: boolean,
        reset: boolean,
    }
    autoScroll: boolean
}

const dawSlice = createSlice({
    name: "daw",
    initialState: {
        tracks: [],
        playLength: 0,
        trackWidth: 2750, // TODO: Not sure why this changes from its initial value (650).
        trackHeight: 45,
        trackColors: shuffle(TRACK_COLORS.slice()),
        showEffects: true,
        metronome: false,
        tempoMap: new TempoMap(),
        playing: false,
        pendingPosition: null, // null indicates no position pending.
        soloMute: {}, // Track index -> "mute" or "solo"
        bypass: {}, // Track index -> [bypassed effect keys]
        loop: {
            selection: false, // false = loop whole track
            start: 1,
            end: 1,
            on: false, // true = enable looping
            reset: false,
        },
        autoScroll: true,
    } as DAWState,
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
        setTempoMap(state, { payload }) {
            state.tempoMap = payload
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
    },
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
    setTempoMap,
    setPlaying,
    setPendingPosition,
    setSoloMute,
    setBypass,
    setLoop,
    setAutoScroll,
} = dawSlice.actions

export const selectTracks = (state: RootState) => state.daw.tracks
export const selectPlayLength = (state: RootState) => state.daw.playLength
export const selectTrackWidth = (state: RootState) => state.daw.trackWidth
export const selectTrackHeight = (state: RootState) => state.daw.trackHeight
export const selectEffectHeight = (state: RootState) => state.daw.trackHeight
export const selectTrackColors = (state: RootState) => state.daw.trackColors
export const selectShowEffects = (state: RootState) => state.daw.showEffects
export const selectMetronome = (state: RootState) => state.daw.metronome
export const selectTempoMap = (state: RootState) => state.daw.tempoMap
export const selectPlaying = (state: RootState) => state.daw.playing
export const selectPendingPosition = (state: RootState) => state.daw.pendingPosition
export const selectSoloMute = (state: RootState) => state.daw.soloMute
export const selectBypass = (state: RootState) => state.daw.bypass
export const selectLoop = (state: RootState) => state.daw.loop
export const selectAutoScroll = (state: RootState) => state.daw.autoScroll

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
    [selectTrackWidth, selectTempoMap],
    (trackWidth, tempoMap) => {
        const secondsFitToScreen = tempoMap.measureToTime(MEASURES_FIT_TO_SCREEN)
        return d3.scale.linear()
            .domain([0, secondsFitToScreen])
            .range([0, trackWidth])
    }
)

export const selectSongDuration = createSelector(
    [selectPlayLength, selectTempoMap],
    (playLength, tempoMap) => tempoMap.measureToTime(playLength)
)

const getZoomIntervals = (intervals: ({ end: number } & any)[], width: number) => {
    // Assumes intervals are sorted in increasing order.
    for (const zoomIntervals of intervals) {
        if (width <= zoomIntervals.end) {
            return zoomIntervals
        }
    }
    return intervals[intervals.length - 1]
}

export const selectMeasurelineZoomIntervals = createSelector(
    [selectTrackWidth],
    width => getZoomIntervals(MEASURELINE_ZOOM_INTERVALS, width)
)

export const selectTimelineZoomIntervals = createSelector(
    [selectTrackWidth],
    width => getZoomIntervals(TIMELINE_ZOOM_INTERVALS, width)
)

export const getMuted = (tracks: Track[], soloMute: SoloMuteConfig, metronome: boolean) => {
    const keys = Object.keys(tracks).map(x => +x)
    const soloed = keys.filter(key => soloMute[key] === "solo")
    if (soloed.length > 0) {
        // Omit mix track if metronome is enabled.
        return keys.filter(key => !soloed.includes(key) && !(metronome && key === 0))
    } else {
        return [...keys.filter(key => soloMute[key] === "mute"), ...(metronome ? [] : [0])]
    }
}

// Returns an array of all tracks that should be muted, by index.
export const selectMuted = createSelector([selectTracks, selectSoloMute, selectMetronome], getMuted)

export const selectTotalTrackHeight = createSelector(
    [selectTracks, selectShowEffects, selectTrackHeight, selectMixTrackHeight],
    (tracks, effects, height, mixHeight) => {
        let total = 0
        tracks.forEach((track: Track, index: number) => {
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
