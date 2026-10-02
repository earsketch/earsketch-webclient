// Common types & functions used by `player` and `renderer`
import { buildEffectGraph } from "./effects"
import { Effect } from "./effectlibrary"
import { Clip, Track } from "common"
import context from "./context"
import esconsole from "../esconsole"
import { TempoMap } from "../app/tempo"

export interface ProjectGraph {
    tracks: TrackGraph[]
    mix: GainNode
}

export interface TrackGraph {
    clips: AudioBufferSourceNode[]
    effects: { [key: string]: Effect }
    output: GainNode
}

export function clearAudioGraph(projectGraph: ProjectGraph, delay = 0) {
    for (const track of projectGraph.tracks) {
        track.output.gain.setValueAtTime(0, context.currentTime + delay)
        for (const source of track.clips) {
            if (source !== undefined) {
                source.stop(context.currentTime + delay)
                window.setTimeout(() => source.disconnect(), delay * 1000)
            }
        }
    }
    projectGraph.mix.gain.setValueAtTime(0, context.currentTime + delay)
    window.setTimeout(() => {
        for (const track of projectGraph.tracks) {
            for (const effect of Object.values(track.effects)) {
                effect.destroy()
            }
        }
    }, delay * 1000)
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

    // Demo midi out
    if (clip.track === 1 && context instanceof AudioContext) {
        const clipStartOffset = Math.max(0, startTime - clipStartTime)
        const scheduledStart = waStartTime + Math.max(0, clipStartTime - startTime)
        const tsNoteOn = window.performance.now() + (scheduledStart - context.currentTime) * 1000
        const dur = (clipDuration - clipStartOffset) * 1000
        playMidiNote(48, 13, tsNoteOn, dur)
    }

    source.connect(trackGain)
    return source
}

function playMidiNote(num: number, vel: number, tsNoteOn: number, dur: number) {
    const midiInterface = "Launchpad Mini MK3 LPMiniMK3 MIDI In"
    const midiCh = 8
    const gate = 0.95
    const tsNoteOff = tsNoteOn + (dur * gate)

    const smiley = [38, 39, 41, 42, 44, 45, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 59, 61, 62, 63, 66, 67, 68, 69, 73, 74, 76, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 90, 91, 92, 93, 94, 96, 97]

    window.navigator.requestMIDIAccess().then((midiAccess) => {
        for (const midiOutputPort of midiAccess.outputs.values()) {
            if (!midiOutputPort.name?.includes(midiInterface)) continue
            // for (let i = 36; i <= 99; i++) {
            for (const i of smiley) {
                midiOutputPort.send([0x90 | midiCh, i, vel], tsNoteOn)
                midiOutputPort.send([0x80 | midiCh, i, 1], tsNoteOff)
            }
            console.log("Send MIDI n:", num, ", vel:", vel, ", dur:", dur, "at", tsNoteOn)
        }
    })
}

export function playTrack(
    context: BaseAudioContext,
    trackIndex: number, track: Track, out: GainNode, tempoMap: TempoMap,
    startTime: number, endTime: number, waStartTime: number,
    mix: GainNode, trackBypass: string[], useLimiter = false
): TrackGraph {
    esconsole("Bypassing effects: " + JSON.stringify(trackBypass), ["DEBUG", "PLAYER"])

    // construct the effect graph
    const { effects, input: effectInput, output: effectOutput } = buildEffectGraph(context, track, tempoMap, startTime, waStartTime, trackBypass)
    effectOutput.connect(trackIndex === 0 ? out : mix)
    const trackGain = new GainNode(context)
    const clips = []
    // process each clip in the track
    for (const clipData of track.clips) {
        const clip = playClip(context, clipData, trackGain, tempoMap, startTime, endTime, waStartTime)
        if (clip) clips.push(clip)
    }

    // connect the track output to the effect tree
    if (trackIndex === 0) {
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
            limiter.connect(effectInput ?? out)
        } else {
            mix.connect(effectInput ?? out)
        }
        trackGain.connect(out)
    } else {
        trackGain.connect(effectInput ?? mix)
    }

    return { clips, effects, output: trackGain }
}
