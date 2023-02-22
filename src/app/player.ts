// Play sounds from the JSON object output of scripts.
import * as applyEffects from "../model/applyeffects"
import context from "./audiocontext"
import { dbToFloat } from "../model/audioeffects"
import esconsole from "../esconsole"
import { TempoMap } from "./tempo"
import { Clip, DAWData, Track } from "common"

let isPlaying = false

const timers = {
    playStart: 0,
    playEnd: 0,
    loop: 0,
}

let playbackData = {
    waStartTime: 0,
    startMeasure: 1,
    endMeasure: 1,
    playheadPos: 1,
    startOffset: 0,
}

// TODO: Reconsider loop type. Maybe something like:
// interface Loop {
//     selection?: { start: number, end: number }
// }
// let loop: Loop | null = null

let loop = {
    on: false,
    selection: false,
    start: 0,
    end: 0,
}

let loopScheduledWhilePaused = false

let dawData: DAWData | null = null

let upcomingProjectGraph: ProjectGraph | null = null
let projectGraph: ProjectGraph | null = null

let mutedTracks: number[] = []
let bypassedEffects: { [key: number]: string[] } = {}

const out = context.createGain()

const reset = () => {
    esconsole("resetting", ["player", "debug"])

    clearAllAudioGraphs()
    clearAllTimers()

    playbackData = {
        waStartTime: 0,
        startMeasure: 1,
        endMeasure: 1,
        playheadPos: 1,
        startOffset: 0,
    }
}

const clearAllTimers = () => {
    clearTimeout(timers.playStart)
    clearTimeout(timers.playEnd)
    clearTimeout(timers.loop)
}

export interface ProjectGraph {
    tracks: TrackGraph[]
    mix: GainNode
}

interface TrackGraph {
    clips: AudioBufferSourceNode[]
    effects: { [key: string]: any }
    output: GainNode
}

function playClip(context: BaseAudioContext, clip: Clip, trackGain: GainNode, tempoMap: TempoMap, startTime: number, endTime: number, waStartTime: number) {
    const clipStartTime = tempoMap.measureToTime(clip.measure)
    const clipEndTime = clipStartTime + clip.audio.duration
    // the clip duration may be shorter than the buffer duration if the loop end is set before the clip end
    const clipDuration = clipEndTime > endTime ? endTime - clipStartTime : clipEndTime - clipStartTime

    if (startTime >= clipEndTime || endTime < clipStartTime) {
        // case: clip is entirely outside of the play region: skip the clip
        return
    }

    const source = new AudioBufferSourceNode(context, { buffer: clip.audio })
    if (startTime >= clipStartTime && startTime < clipEndTime) {
        // case: clip is playing from the middle
        const clipStartOffset = startTime - clipStartTime
        // clips -> track gain -> effect tree
        source.start(waStartTime, clipStartOffset, clipDuration - clipStartOffset)
    } else {
        // case: clip is in the future
        const untilClipStart = clipStartTime - startTime
        source.start(waStartTime + untilClipStart, 0, clipDuration)
    }

    source.connect(trackGain)
    return source
}

export function playTrack(
    context: BaseAudioContext,
    t: number, track: Track, out: GainNode, tempoMap: TempoMap,
    startTime: number, endTime: number, waStartTime: number,
    mix: GainNode, trackBypass: string[], useLimiter = false
): TrackGraph {
    esconsole("Bypassing effects: " + JSON.stringify(trackBypass), ["DEBUG", "PLAYER"])

    // construct the effect graph
    const { effects, input: effectInput } = applyEffects.buildAudioNodeGraph(context, out, track, t, tempoMap, startTime, mix, trackBypass, false)

    const trackGain = new GainNode(context)
    trackGain.gain.setValueAtTime(1.0, context.currentTime)

    const clips = []
    // process each clip in the track
    for (const clipData of track.clips) {
        const clip = playClip(context, clipData, trackGain, tempoMap, startTime, endTime, waStartTime)
        if (clip) clips.push(clip)
    }

    // connect the track output to the effect tree
    if (t === 0) {
        // special case: mix track
        if (useLimiter) {
            // TODO: Apply limiter after effects, not before.
            const limiter = context.createDynamicsCompressor()
            limiter.threshold.value = -1
            limiter.knee.value = 0
            limiter.ratio.value = 10000 // high compression ratio
            limiter.attack.value = 0 // as fast as possible
            limiter.release.value = 0.1 // could be a bit shorter

            mix.connect(limiter)
            limiter.connect(trackGain)
        } else {
            mix.connect(trackGain)
        }
        trackGain.connect(effectInput ?? out)
        out.connect(context.destination)
    } else {
        trackGain.connect(effectInput ?? mix)
    }

    return { clips, effects, output: trackGain }
}

export function play(startMes: number, endMes: number, manualOffset = 0) {
    esconsole("starting playback", ["player", "debug"])

    // init / convert
    if (loop.on && loop.selection) {
        // startMes = loop.start
        endMes = loop.end
    }

    if (dawData === null) {
        esconsole("null in render queue", ["player", "error"])
        return
    }

    const tempoMap = new TempoMap(dawData)
    const startTime = tempoMap.measureToTime(startMes)
    const endTime = tempoMap.measureToTime(endMes)

    const waStartTime = context.currentTime + manualOffset

    // construct webaudio graph
    if (upcomingProjectGraph) clearAudioGraph(upcomingProjectGraph)
    upcomingProjectGraph = {
        tracks: [],
        mix: new GainNode(context),
    }

    for (let t = 0; t < dawData.tracks.length; t++) {
        // skip muted tracks
        if (mutedTracks.includes(t)) continue
        // get the list of bypassed effects for this track
        const trackBypass = bypassedEffects[t] ?? []
        const trackGraph = playTrack(context, t, dawData.tracks[t], out, tempoMap, startTime, endTime, waStartTime, upcomingProjectGraph.mix, trackBypass)
        upcomingProjectGraph.tracks.push(trackGraph)
    }

    // set flags
    clearTimeout(timers.playStart)
    timers.playStart = window.setTimeout(() => {
        if (loop.on) {
            if (loop.selection) {
                playbackData.startOffset = startMes > loop.start ? startMes - loop.start : 0
                playbackData.startMeasure = loop.start
                playbackData.endMeasure = loop.end
            } else {
                playbackData.startOffset = startMes - 1
                playbackData.startMeasure = 1
                playbackData.endMeasure = dawData!.length + 1
            }
        } else {
            playbackData.startOffset = 0
            playbackData.startMeasure = startMes
            playbackData.endMeasure = endMes
        }

        esconsole("recording playback data: " + [startMes, endMes].toString(), ["player", "debug"])
        if (projectGraph) clearAudioGraph(projectGraph)
        projectGraph = upcomingProjectGraph
        upcomingProjectGraph = null
        playbackData.waStartTime = waStartTime
        isPlaying = true
        callbacks.onStartedCallback()
    }, manualOffset * 1000)

    // check the loop state and schedule loop near the end also cancel the onFinished callback
    if (loop.on && loopScheduledWhilePaused) {
        // TODO: Just set up the next audio graph immediately in `timers.playStart`,
        //       rather than waiting until 95% of the way through the loop.
        //       This should allow us to eliminate `timers.loop` (and perhaps `loopScheduledWhilePaused`).
        scheduleNextLoop(startMes, endMes, endTime - startTime + manualOffset, waStartTime)
    }

    // schedule to call the onFinished callback
    clearTimeout(timers.playEnd)
    timers.playEnd = window.setTimeout(() => {
        esconsole("playbackTimer ended", "player")
        pause()
        reset()
        callbacks.onFinishedCallback()
    }, (endTime - startTime + manualOffset) * 1000)
}

const SCHEDULING_MARGIN = 0.05
const SCHEDULING_FACTOR = 1 - SCHEDULING_MARGIN

function scheduleNextLoop(startMes: number, endMes: number, timeTillLoop: number, waStartTime: number) {
    // Schedule the next loop.
    clearTimeout(timers.loop)
    timers.loop = window.setTimeout(() => {
        esconsole("scheduling loop", ["player", "debug"])
        clearTimeout(timers.loop)
        clearTimeout(timers.playEnd)
        const timeElapsed = context.currentTime - waStartTime
        timeTillLoop -= timeElapsed
        clearAllAudioGraphs(timeTillLoop)
        loopScheduledWhilePaused = true
        play(startMes, endMes, timeTillLoop)
        // Schedule this slightly before the current loop ends.
    }, timeTillLoop * 1000 * SCHEDULING_FACTOR)
}

export function pause() {
    esconsole("pausing", ["player", "debug"])
    clearAllAudioGraphs()
    isPlaying = false
    clearTimeout(timers.playEnd)
    clearTimeout(timers.loop)
}

export function clearAudioGraph(projectGraph: ProjectGraph, delay = 0) {
    for (const track of projectGraph.tracks) {
        track.output.gain.setValueAtTime(0, context.currentTime + delay)
        for (const source of track.clips) {
            if (source !== undefined) {
                source.stop(context.currentTime + delay)
                setTimeout(() => source.disconnect(), delay * 1000)
            }
        }
    }
    projectGraph.mix.gain.setValueAtTime(0, context.currentTime + delay)
    setTimeout(() => {
        for (const track of projectGraph.tracks) {
            for (const node of Object.values(track.effects)) {
                node.destroy()
            }
        }
    }, delay * 1000)
}

const clearAllAudioGraphs = (delay = 0) => {
    esconsole("clearing the audio graphs", ["player", "debug"])
    if (projectGraph) clearAudioGraph(projectGraph, delay)
    if (upcomingProjectGraph) clearAudioGraph(upcomingProjectGraph, delay)
}

const refresh = (clearAllGraphs = false) => {
    if (isPlaying) {
        esconsole("refreshing the rendering data", ["player", "debug"])
        const currentMeasure = getPosition()
        const nextMeasure = Math.floor(currentMeasure + 1)
        const tempoMap = new TempoMap(dawData!)
        const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)

        if (clearAllGraphs) {
            clearAllAudioGraphs(timeTillNextBar)
        } else if (projectGraph) {
            clearAudioGraph(projectGraph, timeTillNextBar)
        }

        const startMeasure = nextMeasure === playbackData.endMeasure ? playbackData.startMeasure : nextMeasure
        play(startMeasure, playbackData.endMeasure, timeTillNextBar)
    }
}

// Set playback volume in decibels.
export const setVolume = (gain: number) => {
    esconsole("Setting context volume to " + gain + "dB", ["DEBUG", "PLAYER"])
    out.gain.setValueAtTime(dbToFloat(gain), context.currentTime)
}

export const setLoop = (loop_: typeof loop) => {
    loop = loop_
    esconsole("setting loop: " + loop.on, ["player", "debug"])

    clearAllTimers()

    const tempoMap = new TempoMap(dawData!)
    const currentMeasure = getPosition()
    const currentTime = tempoMap.measureToTime(currentMeasure)

    let startMes: number, endMes: number

    if (loop.on) {
        if (isPlaying) {
            esconsole("loop switched on while playing", ["player", "debug"])
            loopScheduledWhilePaused = false

            let timeTillLoop = 0

            if (loop.selection) {
                startMes = loop.start
                endMes = loop.end

                if (currentMeasure >= startMes && currentMeasure < endMes) {
                    if (currentMeasure < endMes - 1) {
                        startMes = Math.ceil(currentMeasure)
                        timeTillLoop = tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime
                    } else {
                        timeTillLoop = tempoMap.measureToTime(endMes) - currentTime
                    }
                } else {
                    timeTillLoop = tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime
                }
            } else {
                startMes = 1
                endMes = dawData!.length + 1
                timeTillLoop = tempoMap.measureToTime(endMes) - currentTime
            }

            esconsole(`timeTillLoopingBack = ${timeTillLoop}, startMes = ${startMes}, endMes = ${endMes}`, ["player", "debug"])

            scheduleNextLoop(startMes, endMes, timeTillLoop, context.currentTime)
        } else {
            loopScheduledWhilePaused = true
        }
    } else {
        clearTimeout(timers.loop)
        loopScheduledWhilePaused = false

        if (isPlaying) {
            esconsole("loop switched off while playing", ["player", "debug"])
            esconsole(`currentMeasure = ${currentMeasure}, playbackData.endMeasure = ${playbackData.endMeasure}, dawData.length = ${dawData!.length}`, ["player", "debug"])
            if (currentMeasure < playbackData.endMeasure && playbackData.endMeasure <= (dawData!.length + 1)) {
                clearTimeout(timers.playStart)
                clearTimeout(timers.playEnd)
                // User switched off loop while playing.
                // Because we were playing a loop, we didn't schedule anything after the loop end.
                // Now there's no loop, so we need to schedule everything from [end of old loop] to [end of project].
                const timeTillContinuedPoint = tempoMap.measureToTime(playbackData.endMeasure) - currentTime

                startMes = playbackData.endMeasure
                endMes = dawData!.length + 1

                clearAllAudioGraphs(timeTillContinuedPoint)
                play(startMes, endMes, timeTillContinuedPoint)
            }
        }
    }
}

// TODO: Eliminate this and the corresponding global, just have `play()` take DAWData directly.
export const setRenderingData = (result: DAWData) => {
    esconsole("setting new rendering data", ["player", "debug"])

    if (projectGraph) {
        clearAudioGraph(projectGraph)
    }

    projectGraph = upcomingProjectGraph
    upcomingProjectGraph = null
    dawData = result

    if (isPlaying) {
        refresh()
    } else {
        clearAllAudioGraphs()
    }
}

export function setPosition(position: number) {
    esconsole("setting position: " + position, ["player", "debug"])

    clearAllTimers()

    if (isPlaying) {
        let endMeasure = playbackData.endMeasure
        if (loop.on) {
            loopScheduledWhilePaused = true // TODO: why is this set when we're playing?

            if (loop.selection) {
                throw new Error("setPosition with loop selection")
            } else {
                endMeasure = dawData!.length + 1
            }
        }

        const currentMeasure = getPosition()
        const nextMeasure = Math.floor(currentMeasure + 1)
        const tempoMap = new TempoMap(dawData!)
        const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)
        clearAllAudioGraphs(timeTillNextBar)
        play(position, endMeasure, timeTillNextBar)
    } else {
        playbackData.playheadPos = position
    }
}

export const getPosition = () => {
    if (isPlaying) {
        const tempoMap = new TempoMap(dawData!)
        const startTime = tempoMap.measureToTime(playbackData.startMeasure + playbackData.startOffset)
        const currentTime = startTime + (context.currentTime - playbackData.waStartTime)
        playbackData.playheadPos = tempoMap.timeToMeasure(currentTime)
    }
    return playbackData.playheadPos
}

export const setMutedTracks = (_mutedTracks: number[]) => {
    mutedTracks = _mutedTracks

    if (isPlaying) {
        refresh(true)
    }
}

export const setBypassedEffects = (_bypassedEffects: { [key: number]: string[] }) => {
    bypassedEffects = _bypassedEffects

    if (isPlaying) {
        refresh(true)
    }
}

export const callbacks = {
    onStartedCallback: () => {},
    onFinishedCallback: () => {},
}
