// Play DAW projects generated by user scripts
import { DAWData } from "common"
import { ProjectGraph, clearAudioGraph, playTrack } from "./common"
import context from "./context"
import { TempoMap } from "../app/tempo"
import { dbToFloat } from "./utils"

let isPlaying = false

const timers = {
    playStart: 0,
    playEnd: 0,
}

let playbackData = {
    waStartTime: 0,
    startMeasure: 1,
    endMeasure: 1,
    playheadPos: 1,
}

let loop = {
    on: false,
    selection: false,
    start: 0,
    end: 0,
}

let dawData: DAWData | null = null

let upcomingProjectGraph: ProjectGraph | null = null
let projectGraph: ProjectGraph | null = null

let mutedTracks: number[] = []
let bypassedEffects: { [key: number]: string[] } = {}

const out = context.createGain()

function reset() {
    pause()
    playbackData = {
        waStartTime: 0,
        startMeasure: 1,
        endMeasure: 1,
        playheadPos: 1,
    }
}

function clearAllTimers() {
    clearTimeout(timers.playStart)
    clearTimeout(timers.playEnd)
}

export interface TrackGraph {
    clips: AudioBufferSourceNode[]
    effects: { [key: string]: any }
    output: GainNode
}

export function play(startMes: number, delay = 0) {
    const minStartMes = (loop.on && loop.selection) ? loop.start : 1
    const endMes = (loop.on && loop.selection) ? loop.end : dawData!.length + 1
    if (startMes < minStartMes || startMes >= endMes) {
        startMes = minStartMes
    }
    const tempoMap = new TempoMap(dawData!)
    const startTime = tempoMap.measureToTime(startMes)
    const endTime = tempoMap.measureToTime(endMes)
    const waStartTime = context.currentTime + delay

    // construct webaudio graph
    if (upcomingProjectGraph) clearAudioGraph(upcomingProjectGraph)
    upcomingProjectGraph = {
        tracks: [],
        mix: new GainNode(context),
    }

    for (let t = 0; t < dawData!.tracks.length; t++) {
        // skip muted tracks
        if (mutedTracks.includes(t)) continue
        // get the list of bypassed effects for this track
        const trackBypass = bypassedEffects[t] ?? []
        const trackGraph = playTrack(context, t, dawData!.tracks[t], out, tempoMap, startTime, endTime, waStartTime, upcomingProjectGraph.mix, trackBypass)
        upcomingProjectGraph.tracks.push(trackGraph)
    }

    // set flags
    clearTimeout(timers.playStart)
    timers.playStart = window.setTimeout(() => {
        playbackData.startMeasure = startMes
        playbackData.endMeasure = endMes
        playbackData.waStartTime = waStartTime

        if (projectGraph) clearAudioGraph(projectGraph)
        projectGraph = upcomingProjectGraph
        upcomingProjectGraph = null
        isPlaying = true
        callbacks.onStartedCallback()
        if (loop.on) {
            const timeElapsed = context.currentTime - waStartTime
            const loopStart = loop.selection ? loop.start : 1
            play(loopStart, endTime - startTime - timeElapsed)
        }
    }, delay * 1000)

    // schedule to call the onFinished callback
    clearTimeout(timers.playEnd)
    timers.playEnd = window.setTimeout(() => {
        reset()
        callbacks.onFinishedCallback()
    }, (endTime - startTime + delay) * 1000)
}

export function pause() {
    clearAllAudioGraphs()
    clearAllTimers()
    isPlaying = false
}

function clearAllAudioGraphs(delay = 0) {
    if (projectGraph) clearAudioGraph(projectGraph, delay)
    if (upcomingProjectGraph) clearAudioGraph(upcomingProjectGraph, delay)
}

function refresh() {
    if (!isPlaying) return

    const currentMeasure = getPosition()
    const nextMeasure = Math.floor(currentMeasure + 1)
    // TODO: If refreshing due to new project data, this should use the old data's tempo map to determine `timeTillNextBar`.
    const tempoMap = new TempoMap(dawData!)
    const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)

    console.assert(projectGraph)
    clearAudioGraph(projectGraph!, timeTillNextBar)
    play(nextMeasure, timeTillNextBar)
}

// Set playback volume in decibels.
export function setVolume(gain: number) {
    out.gain.setValueAtTime(dbToFloat(gain), context.currentTime)
}

export function setLoop(loop_: typeof loop) {
    loop = loop_
    if (!isPlaying) return

    clearAllTimers()

    const tempoMap = new TempoMap(dawData!)
    const currentMeasure = getPosition()
    const currentTime = tempoMap.measureToTime(currentMeasure)

    if (loop.on) {
        if (loop.selection) {
            if (currentMeasure >= loop.start && currentMeasure < loop.end) {
                if (currentMeasure < loop.end - 1) {
                    play(Math.ceil(currentMeasure), tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime)
                } else {
                    play(loop.start, tempoMap.measureToTime(loop.end) - currentTime)
                }
            } else {
                play(loop.start, tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime)
            }
        } else {
            play(1, tempoMap.measureToTime(dawData!.length + 1) - currentTime)
        }
    } else if (currentMeasure < playbackData.endMeasure && playbackData.endMeasure <= (dawData!.length + 1)) {
        clearTimeout(timers.playStart)
        clearTimeout(timers.playEnd)
        // User switched off loop while playing.
        // Because we were playing a loop, we didn't schedule anything after the loop end.
        // Now there's no loop, so we need to schedule everything from [end of old loop] to [end of project].
        const timeTillContinuedPoint = tempoMap.measureToTime(playbackData.endMeasure) - currentTime
        play(playbackData.endMeasure, timeTillContinuedPoint)
    }
}

export function setRenderingData(project: DAWData, muted: number[], bypassed: { [key: number]: string[] }) {
    dawData = project
    mutedTracks = muted
    bypassedEffects = bypassed
    refresh()
}

export function setPosition(position: number) {
    clearAllTimers()

    if (isPlaying) {
        const currentMeasure = getPosition()
        const nextMeasure = Math.floor(currentMeasure + 1)
        const tempoMap = new TempoMap(dawData!)
        const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)
        if (projectGraph) clearAudioGraph(projectGraph, timeTillNextBar)
        play(position, timeTillNextBar)
    } else {
        playbackData.playheadPos = position
    }
}

export function getPosition() {
    if (isPlaying) {
        const tempoMap = new TempoMap(dawData!)
        const startTime = tempoMap.measureToTime(playbackData.startMeasure)
        const currentTime = startTime + (context.currentTime - playbackData.waStartTime)
        playbackData.playheadPos = tempoMap.timeToMeasure(currentTime)
    }
    return playbackData.playheadPos
}

// TODO: Don't refresh on mute/bypass; instead change audio parameters immediately.
export function setMutedTracks(muted: number[]) {
    setRenderingData(dawData!, muted, bypassedEffects)
}

export function setBypassedEffects(bypassed: { [key: number]: string[] }) {
    setRenderingData(dawData!, mutedTracks, bypassed)
}

export const callbacks = {
    onStartedCallback: () => {},
    onFinishedCallback: () => {},
}
