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
                setTimeout(() => source.disconnect(), delay * 1000)
            }
        }
    }
    projectGraph.mix.gain.setValueAtTime(0, context.currentTime + delay)
    setTimeout(() => {
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

    source.connect(trackGain)
    return source
}

export function playTrack(
    context: BaseAudioContext,
    trackIndex: number, track: Track, out: GainNode, tempoMap: TempoMap,
    startTime: number, endTime: number, waStartTime: number,
    mix: GainNode, trackBypass: string[], useLimiter = false
): TrackGraph {
    esconsole("Bypassing effects: " + JSON.stringify(trackBypass), ["DEBUG", "PLAYER"])

    // construct the effect graph
    const { effects, input: effectInput } = buildEffectGraph(context, track, tempoMap, startTime, trackIndex === 0 ? out : mix, trackBypass)
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
            limiter.connect(trackGain)
        } else {
            mix.connect(effectInput ?? out)
        }
        trackGain.connect(out)
        out.connect(context.destination)
    } else {
        trackGain.connect(effectInput ?? mix)
    }

    return { clips, effects, output: trackGain }
}
