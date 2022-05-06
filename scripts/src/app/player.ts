// Play sounds from the JSON object output of scripts.
import * as applyEffects from "../model/applyeffects"
import context from "./audiocontext"
import { dbToFloat } from "../model/audioeffects"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { TempoMap } from "./tempo"

// Preliminary type declarations
// TODO: Move some to runner?
export interface Clip {
    filekey: string
    loopChild: boolean
    measure: number
    start: number
    end: number
    audio: AudioBuffer
    sourceAudio: AudioBuffer
    playing?: boolean
    source?: AudioBufferSourceNode
    gain?: GainNode
    silence: number
    track: number
    tempo?: number
    loop: boolean
    scale: number
}

export interface EffectRange {
    name: string
    parameter: string
    startMeasure: number
    endMeasure: number
    startValue: number
    endValue: number
    track: number
}

export type Effect = EffectRange[] & { bypass?: boolean }

export interface Track {
    clips: Clip[]
    effects: { [key: string]: Effect }
    analyser: AnalyserNode
    effectNodes?: { [key: string]: any }
    label?: string | number
    visible?: boolean
    buttons?: boolean
    mute?: boolean
}

export interface ClipSlice {
    sourceFile: string
    start: number
    end: number
}

export interface DAWData {
    length: number
    tracks: Track[]
    master: GainNode
    slicedClips: { [key: string]: ClipSlice }
}

let isPlaying = false

let waTimeStarted = 0

let playStartTimer = 0
let playEndTimer = 0
let loopSchedTimer = 0

let playbackData = {
    startMeasure: 1,
    endMeasure: 1,
    playheadPos: 1,
    startOffset: 0,
}

let loop = {
    on: false,
    start: 0,
    end: 0,
    selection: false,
}
let loopScheduledWhilePaused = false

const renderingDataQueue: (DAWData | null)[] = [null, null]
let mutedTracks: number[] = []
let bypassedEffects: { [key: number]: string[] } = {}

const mix = context.createGain()

const reset = () => {
    esconsole("resetting", ["player", "debug"])

    clearAllAudioGraphs()
    clearAllTimers()

    playbackData = {
        startMeasure: 1,
        endMeasure: 1,
        playheadPos: 1,
        startOffset: 0,
    }
}

const clearAllTimers = () => {
    clearTimeout(playStartTimer)
    clearTimeout(playEndTimer)
    clearTimeout(loopSchedTimer)
}

const nodesToDestroy: any[] = []

const playClip = (clip: Clip, trackGain: GainNode, tempoMap: TempoMap, startTime: number, endTime: number, waStartTime: number, manualOffset: number) => {
    const clipStartTime = tempoMap.measureToTime(clip.measure)
    const clipEndTime = tempoMap.measureToTime(clip.measure + (clip.end - clip.start))

    const clipSource = new AudioBufferSourceNode(context, { buffer: clip.audio })

    // the clip duration may be shorter than the buffer duration
    let clipDuration = clipEndTime - clipStartTime

    if (startTime >= clipEndTime) {
        // case: clip is in the past: skip the clip
        return
    } else if (startTime >= clipStartTime && startTime < clipEndTime) {
        // case: clip is playing from the middle
        const clipStartOffset = startTime - clipStartTime
        // if the loop end is set before the clip end
        if (clipEndTime > endTime) {
            clipDuration = endTime - clipStartTime
        }
        // clips -> track gain -> effect tree
        clipSource.start(waStartTime, clipStartOffset, clipDuration - clipStartOffset)

        // keep this flag so we only stop clips that are playing (otherwise we get an exception raised)
        setTimeout(() => { clip.playing = true }, manualOffset * 1000)
    } else {
        // case: clip is in the future
        const untilClipStart = clipStartTime - startTime
        // if the loop end is set before the clip
        if (clipStartTime > endTime) {
            return // skip this clip
        }
        // if the loop end is set before the clip end
        if (clipEndTime > endTime) {
            clipDuration = endTime - clipStartTime
        }
        clipSource.start(waStartTime + untilClipStart, 0, clipDuration)
        setTimeout(() => { clip.playing = true }, (manualOffset + untilClipStart) * 1000)
    }

    clipSource.connect(trackGain)
    // keep a reference to this audio source so we can pause it
    clip.source = clipSource
    clip.gain = trackGain // used to mute the track/clip

    if (!ESUtils.whichBrowser().includes("Chrome")) {
        clipSource.onended = () => clipSource.disconnect()
    }
}

export const play = (startMes: number, endMes: number, manualOffset = 0) => {
    esconsole("starting playback", ["player", "debug"])

    // init / convert
    if (loop.on && loop.selection) {
        // startMes = loop.start
        endMes = loop.end
    }

    if (renderingDataQueue[1] === null) {
        esconsole("null in render queue", ["player", "error"])
        return
    }

    const renderingData = renderingDataQueue[1]

    const tempoMap = new TempoMap(renderingData)
    const startTime = tempoMap.measureToTime(startMes)
    const endTime = tempoMap.measureToTime(endMes)

    const waStartTime = context.currentTime + manualOffset

    // construct webaudio graph
    renderingData.master = context.createGain()
    renderingData.master.gain.setValueAtTime(1, context.currentTime)

    for (let t = 0; t < renderingData.tracks.length; t++) {
        const track = renderingData.tracks[t]

        // skip muted tracks
        if (mutedTracks.includes(t)) continue

        // get the list of bypassed effects for this track
        const trackBypass = bypassedEffects[t] ?? []
        esconsole("Bypassing effects: " + JSON.stringify(trackBypass), ["DEBUG", "PLAYER"])

        // construct the effect graph
        if (track.effectNodes) {
            nodesToDestroy.push(...Object.values(track.effectNodes))
        }
        const startNode = applyEffects.buildAudioNodeGraph(context, mix, track, t, tempoMap, startTime, renderingData.master, trackBypass, false)

        const trackGain = context.createGain()
        trackGain.gain.setValueAtTime(1.0, context.currentTime)

        // process each clip in the track
        for (const clipData of track.clips) {
            playClip(clipData, trackGain, tempoMap, startTime, endTime, waStartTime, manualOffset)
        }

        // connect the track output to the effect tree
        if (t === 0) {
            // if master track
            renderingData.master.connect(trackGain)
            // if there is at least one effect set in master track
            if (startNode !== undefined) {
                // TODO: master not connected to the analyzer?
                trackGain.connect(startNode)
                // effect tree connects to the context.master internally
            } else {
                // if no effect set
                trackGain.connect(track.analyser)
                track.analyser.connect(mix)
            }
            mix.connect(context.destination)
        } else {
            if (startNode !== undefined) {
                // track gain -> effect tree
                trackGain.connect(startNode)
            } else {
                // track gain -> (bypass effect tree) -> analyzer & master
                trackGain.connect(track.analyser)
                track.analyser.connect(renderingData.master)
            }
        }

        // for setValueAtTime bug in chrome v52
        // TODO: Chrome is now at version 90. Is this safe to remove?
        if (ESUtils.whichBrowser().includes("Chrome") && startNode !== undefined) {
            const dummyOsc = context.createOscillator()
            const dummyGain = context.createGain()
            dummyGain.gain.value = 0
            dummyOsc.connect(dummyGain).connect(startNode)
            dummyOsc.start(startTime)
            dummyOsc.stop(startTime + 0.001)
        }
    }

    // set flags
    clearTimeout(playStartTimer)
    playStartTimer = window.setTimeout(() => {
        if (loop.on) {
            if (loop.selection) {
                playbackData.startOffset = 0
                if (startMes > loop.start) {
                    playbackData.startOffset = startMes - loop.start
                }

                startMes = loop.start
                endMes = loop.end
            } else {
                playbackData.startOffset = startMes - 1
                startMes = 1
                endMes = renderingDataQueue[1]!.length + 1
            }

            playbackData.startMeasure = startMes
            playbackData.endMeasure = endMes
        } else {
            playbackData.startOffset = 0
            playbackData.startMeasure = startMes
            playbackData.endMeasure = endMes
        }

        esconsole("recording playback data: " + [startMes, endMes].toString(), ["player", "debug"])

        waTimeStarted = waStartTime
        isPlaying = true
        callbacks.onStartedCallback()
        while (nodesToDestroy.length) {
            nodesToDestroy.pop()?.destroy()
        }
    }, manualOffset * 1000)

    // check the loop state and schedule loop near the end also cancel the onFinished callback
    if (loop.on && loopScheduledWhilePaused) {
        clearTimeout(loopSchedTimer)
        loopSchedTimer = window.setTimeout(() => {
            esconsole("scheduling loop", ["player", "debug"])
            clearTimeout(loopSchedTimer)
            clearTimeout(playEndTimer)
            const offset = (endTime - startTime) - (context.currentTime - waTimeStarted)
            clearAllAudioGraphs(offset)
            loopScheduledWhilePaused = true
            play(startMes, endMes, offset)
        }, (endTime - startTime + manualOffset) * 1000 * 0.95)
    }

    // schedule to call the onFinished callback
    clearTimeout(playEndTimer)
    playEndTimer = window.setTimeout(() => {
        esconsole("playbackTimer ended", "player")
        pause()
        reset()
        callbacks.onFinishedCallback()
    }, (endTime - startTime + manualOffset) * 1000)
}

export const pause = () => {
    esconsole("pausing", ["player", "debug"])
    clearAllAudioGraphs()
    isPlaying = false
    playbackData.playheadPos = playbackData.startMeasure
    clearTimeout(playEndTimer)
    clearTimeout(loopSchedTimer)
}

const stopAllClips = (renderingData: DAWData | null, delay: number) => {
    if (!renderingData) {
        return
    }

    for (const track of renderingData.tracks) {
        for (const clip of track.clips) {
            const source = clip.source
            if (source !== undefined) {
                try {
                    source.stop(context.currentTime + delay)
                } catch (e) {
                    // TODO: Why does Safari throw an InvalidStateError?
                    esconsole(e.toString(), ["WARNING", "PLAYER"])
                }
                setTimeout(() => source.disconnect(), delay * 999)
                clip.playing = false
            }
        }
    }
}

const clearAudioGraph = (idx: number, delay = 0) => {
    if (ESUtils.whichBrowser().includes("Chrome")) {
        stopAllClips(renderingDataQueue[idx], delay)
    } else {
        if (!delay) {
            stopAllClips(renderingDataQueue[idx], delay)
        } else {
            const renderData = renderingDataQueue[idx]
            if (renderData === null) {
                return
            }

            for (const track of renderData.tracks) {
                for (const clip of track.clips) {
                    if (clip.source !== undefined) {
                        try {
                            clip.source.stop(context.currentTime + delay)
                            clip.gain!.gain.setValueAtTime(0, context.currentTime + delay)
                        } catch (e) {
                            esconsole(e.toString(), ["player", "warning"])
                        }
                        clip.playing = false
                    }
                }
            }

            if (renderData.master !== undefined) {
                renderData.master.gain.setValueAtTime(0, context.currentTime + delay)
            }
        }
    }
}

const clearAllAudioGraphs = (delay = 0) => {
    esconsole("clearing the audio graphs", ["player", "debug"])
    clearAudioGraph(0, delay)
    clearAudioGraph(1, delay)
}

const refresh = (clearAllGraphs = false) => {
    if (isPlaying) {
        esconsole("refreshing the rendering data", ["player", "debug"])
        const currentMeasure = getPosition()
        const nextMeasure = Math.floor(currentMeasure + 1)
        const tempoMap = new TempoMap(renderingDataQueue[1]!)
        const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)

        if (clearAllGraphs) {
            clearAllAudioGraphs(timeTillNextBar)
        } else {
            clearAudioGraph(0, timeTillNextBar)
        }

        const startMeasure = nextMeasure === playbackData.endMeasure ? playbackData.startMeasure : nextMeasure
        play(startMeasure, playbackData.endMeasure, timeTillNextBar)
    }
}

// Set playback volume in decibels.
export const setVolume = (gain: number) => {
    esconsole("Setting context volume to " + gain + "dB", ["DEBUG", "PLAYER"])
    mix.gain.setValueAtTime(dbToFloat(gain), context.currentTime)
}

export const setLoop = (loopObj: typeof loop) => {
    if (loopObj && "on" in loopObj) {
        loop = loopObj
    } else {
        loop.on = !!loopObj

        // use max range
        playbackData.startMeasure = 1
        playbackData.endMeasure = renderingDataQueue[1]!.length + 1
    }
    esconsole("setting loop: " + loop.on, ["player", "debug"])

    clearAllTimers()

    const tempoMap = new TempoMap(renderingDataQueue[1]!)
    const currentMeasure = getPosition()
    const currentTime = tempoMap.measureToTime(currentMeasure)

    let startMes: number, endMes: number

    if (loop.on) {
        if (isPlaying) {
            esconsole("loop switched on while playing", ["player", "debug"])
            loopScheduledWhilePaused = false

            let timeTillLoopingBack = 0

            if (loop.selection) {
                startMes = loop.start
                endMes = loop.end

                if (currentMeasure >= startMes && currentMeasure < endMes) {
                    if (currentMeasure < endMes - 1) {
                        startMes = Math.ceil(currentMeasure)
                        timeTillLoopingBack = tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime
                    } else {
                        timeTillLoopingBack = tempoMap.measureToTime(endMes) - currentTime
                    }
                } else {
                    timeTillLoopingBack = tempoMap.measureToTime(Math.floor(currentMeasure + 1)) - currentTime
                }
            } else {
                timeTillLoopingBack = tempoMap.measureToTime(renderingDataQueue[1]!.length + 1) - currentTime
                startMes = 1
                endMes = renderingDataQueue[1]!.length + 1
            }

            esconsole(`timeTillLoopingBack = ${timeTillLoopingBack}, startMes = ${startMes}, endMes = ${endMes}`, ["player", "debug"])

            // Schedule the next loop.
            // This is analagous to what play() does when loopScheduledWhilePaused = true.
            const waStartTime = context.currentTime
            clearTimeout(loopSchedTimer)
            loopSchedTimer = window.setTimeout(() => {
                esconsole("scheduling loop", ["player", "debug"])
                clearTimeout(loopSchedTimer)
                clearTimeout(playEndTimer)
                const offset = timeTillLoopingBack - (context.currentTime - waStartTime)
                clearAllAudioGraphs(offset)
                loopScheduledWhilePaused = true
                play(startMes, endMes, offset)
            }, timeTillLoopingBack * 1000 * 0.95)
        } else {
            loopScheduledWhilePaused = true
        }
    } else {
        clearTimeout(loopSchedTimer)
        loopScheduledWhilePaused = false

        if (isPlaying) {
            esconsole("loop switched off while playing", ["player", "debug"])
            esconsole(`currentMeasure = ${currentMeasure}, playbackData.endMeasure = ${playbackData.endMeasure}, renderingDataQueue[1].length = ${renderingDataQueue[1]!.length}`, ["player", "debug"])
            if (currentMeasure < playbackData.endMeasure && playbackData.endMeasure <= (renderingDataQueue[1]!.length + 1)) {
                clearTimeout(playStartTimer)
                clearTimeout(playEndTimer)

                const timeTillContinuedPoint = tempoMap.measureToTime(playbackData.endMeasure) - currentTime

                startMes = playbackData.endMeasure
                endMes = renderingDataQueue[1]!.length + 1

                clearAllAudioGraphs(timeTillContinuedPoint)
                play(startMes, endMes, timeTillContinuedPoint)
            }
        }
    }
}

export const setRenderingData = (result: DAWData) => {
    esconsole("setting new rendering data", ["player", "debug"])

    clearAudioGraph(0)
    const renderData = renderingDataQueue[0]
    if (renderData) {
        for (const track of renderData.tracks) {
            for (const node of Object.values(track.effectNodes ?? {})) {
                node?.destroy()
            }
        }
    }
    renderingDataQueue.shift()
    renderingDataQueue.push(result)

    if (isPlaying) {
        refresh()
    } else {
        clearAllAudioGraphs()
    }
}

export const setPosition = (position: number) => {
    esconsole("setting position: " + position, ["player", "debug"])

    clearAllTimers()

    if (isPlaying) {
        if (loop.on) {
            loopScheduledWhilePaused = true

            if (loop.selection) {
                // playbackData.startMeasure = loop.start
                // playbackData.endMeasure = loop.end
            } else {
                playbackData.endMeasure = renderingDataQueue[1]!.length + 1
            }
        }

        const currentMeasure = getPosition()
        const nextMeasure = Math.floor(currentMeasure + 1)
        const tempoMap = new TempoMap(renderingDataQueue[1]!)
        const timeTillNextBar = tempoMap.measureToTime(nextMeasure) - tempoMap.measureToTime(currentMeasure)
        clearAllAudioGraphs(timeTillNextBar)
        play(position, playbackData.endMeasure, timeTillNextBar)
    } else {
        playbackData.playheadPos = position
    }
}

export const getPosition = () => {
    if (isPlaying) {
        const tempoMap = new TempoMap(renderingDataQueue[1]!)
        const startTime = tempoMap.measureToTime(playbackData.startMeasure + playbackData.startOffset)
        const currentTime = startTime + (context.currentTime - waTimeStarted)
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
