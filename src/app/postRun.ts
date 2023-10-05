// Fill in & fixup DAW project data generated by user script to make it ready for playback.
import i18n from "i18next"

import * as audioLibrary from "./audiolibrary"
import { Clip, TransformedClip, DAWData } from "common"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { TempoMap } from "./tempo"
import { timestretch } from "./timestretch"
import * as userConsole from "../ide/console"
import { setCurrentOverlap } from "../cai/dialogue"

// After running code, go through each clip, load the audio file and
// replace looped ones with multiple clips. Why? Because we don't know
// the length of each audio clip until after running (unless we
// loaded the clips beforehand and did this at runtime, but that's
// harder.) Follow up by setting the result length.
export async function postRun(result: DAWData) {
    esconsole("Execution finished. Loading audio buffers...", ["debug", "runner"])
    // NOTE: We used to check if `finish()` was called (by looking at result.finish) and throw an error if not.
    // However, since `finish()` doesn't actually do anything (other than set this flag), we no longer check.
    // (Apparently `finish()` is an artifact of EarSketch's Reaper-based incarnation.)

    // STEP 0: Fix effects. (This goes first because it may affect the tempo map, which is used in subsequent steps.)
    fixEffects(result)
    // STEP 1: Load audio buffers and slice them to generate temporary audio constants.
    esconsole("Loading buffers.", ["debug", "runner"])
    await loadBuffersForTransformedClips(result)
    // STEP 2: Load audio buffers needed for the result.
    const buffers = await loadBuffers(result)
    esconsole("Filling in looped sounds.", ["debug", "runner"])
    // STEP 3: Insert buffers into clips, fix clip loops/effect lengths, and timestretch clips to fit the tempo map.
    // Before fixing the clips, retrieve the clip tempo info from the metadata cache for a special treatment for the MAKEBEAT clips.
    await getClipTempo(result)
    fixClips(result, buffers)
    // STEP 4: Warn user about overlapping tracks or effects placed on tracks with no audio.
    checkOverlap(result)
    checkEffects(result)
    // STEP 5: Insert metronome as the first track.
    esconsole("Adding metronome track.", ["debug", "runner"])
    await addMetronome(result)
}

export async function loadBuffersForTransformedClips(result: DAWData) {
    const promises = []
    const tempoMap = new TempoMap(result)

    for (const [key, def] of Object.entries(result.transformedClips)) {
        // Fetch the sound data for sliced clips
        if (key in audioLibrary.cache.promises) continue // Already sliced.
        const promise: Promise<[string, TransformedClip, audioLibrary.Sound]> =
            audioLibrary.getSound(def.origSound).then(sound => [key, def, sound])
        promises.push(promise)
    }

    for (const [key, def, sound] of await Promise.all(promises)) {
        // Slice the sound data
        // For consistency with old behavior, use clip tempo if available and initial tempo if not.
        const baseTempo = sound.tempo ?? tempoMap.points[0].tempo

        // Some sliced clips overwrite their default tempo with a user-provided custom tempo
        // if no timestretchFactor, slice as normal
        // if timestretchFactor is defined, modify the tempo
        // if timestretchFactor is defined and no value for tempo, leave tempo=undefined and timestretch audio to a new buffer
        let buffer: AudioBuffer
        let tempo: number | undefined = baseTempo
        if (!def.timestretchFactor) {
            // Typical case: slicing a sound with a defined tempo
            buffer = createSlicedSound(sound.name, sound.buffer, baseTempo, def.start ?? 1, def.end ?? null)
            tempo = sound.tempo ?? undefined
        } else if (def.timestretchFactor && sound.tempo !== undefined) {
            // Special case: stretching a sound with a defined tempo
            buffer = createSlicedSound(sound.name, sound.buffer, baseTempo, def.start ?? 1, def.end ?? null)
            tempo = def.timestretchFactor * baseTempo
        } else {
            // Special case: stretching a tempoless sound
            // timestretchFactor is defined, tempo is not
            const sourceBuffer = sound.buffer
            const stretchedTempo = def.timestretchFactor * baseTempo
            tempo = undefined

            // Here we timestretch to new buffer to maintain the behavior of tempoless one-shot sounds
            buffer = timestretchBuffer(sourceBuffer, stretchedTempo, new TempoMap([{ measure: 1, tempo: baseTempo }]), 1)
        }

        audioLibrary.cache.promises[key] = Promise.resolve({ ...sound, file_key: key, buffer, tempo })
    }
}

function timestretchBuffer(origBuffer: AudioBuffer, sourceTempo: number, targetTempoMap: TempoMap, playheadPosition: number) {
    let stretched = timestretch(origBuffer.getChannelData(0), sourceTempo, targetTempoMap, playheadPosition)
    const stretchedBuffer = new AudioBuffer({ numberOfChannels: origBuffer.numberOfChannels, length: stretched.length, sampleRate: origBuffer.sampleRate })

    stretchedBuffer.copyToChannel(stretched.getChannelData(0), 0)
    for (let c = 0; c < origBuffer.numberOfChannels; c++) {
        stretched = timestretch(origBuffer.getChannelData(c), sourceTempo, targetTempoMap, playheadPosition)
        stretchedBuffer.copyToChannel(stretched.getChannelData(0), c)
    }
    return stretchedBuffer
}

export async function getClipTempo(result: DAWData) {
    const tempoCache: { [key: string]: number | undefined } = Object.create(null)

    const lookupTempo = async (key: string) => {
        // Return cached tempo for given key, or search audio sample metadata and cache result.
        if (key in tempoCache) return tempoCache[key]
        // Note that `getSound` result should be cached from `loadBuffers`/`loadBuffersForSampleSlicing`.
        const tempo = (await audioLibrary.getSound(key)).tempo
        return (tempoCache[key] = tempo)
    }

    for (const track of result.tracks) {
        for (const clip of track.clips) {
            clip.tempo = await lookupTempo(clip.filekey)
        }
    }
}

export async function loadBuffers(result: DAWData) {
    const promises = []
    for (const track of result.tracks) {
        for (const clip of track.clips) {
            const promise: Promise<[string, AudioBuffer]> = audioLibrary.getSound(clip.filekey).then(
                sound => [clip.filekey, sound.buffer])
            promises.push(promise)
        }
    }

    const buffers = await Promise.all(promises)
    return ESUtils.fromEntries(buffers)
}

// Sort effects, fill in effects with end = 0.
export function fixEffects(result: DAWData) {
    for (const track of result.tracks) {
        for (const envelope of Object.values(track.effects)) {
            envelope.sort((a, b) => a.measure - b.measure)
            // If the automation start in the middle, fill the time before with the startValue of the earliest automation.
            if (envelope[0].measure > 1) {
                envelope.unshift({ measure: 1, value: envelope[0].value, shape: "square", sourceLine: envelope[0].sourceLine })
            }
        }
    }
}

// Create a new sound constant by slicing an existing sound
//   startMeasure - slice start, in measures, relative to 1 being the start of the sound
//   endMeasure - slice end, in measures, relative to 1 being the start of the sound
function createSlicedSound(filekey: string, buffer: AudioBuffer, tempo: number, startMeasure: number, endMeasure: number | null) {
    if (startMeasure === 1 && endMeasure === null) { return buffer }

    if (endMeasure === null) {
        endMeasure = ESUtils.timeToMeasureDelta(buffer.duration, tempo) + 1
    }

    const endIndex = ESUtils.measureToTime(endMeasure, tempo) * buffer.sampleRate
    if (endIndex > buffer.length) {
        const bufferEndMeasure = ESUtils.timeToMeasureDelta(buffer.duration, tempo) + 1
        throw new RangeError(`End of slice at ${endMeasure} reaches past end at ${bufferEndMeasure} of ${filekey}`)
    }

    const slicedBuffer = sliceAudioBuffer(buffer, startMeasure, endMeasure, tempo)

    applyEnvelope(slicedBuffer, startMeasure > 1, (endMeasure - 1) < buffer.duration)
    return slicedBuffer
}

function roundUpToDivision(seconds: number, tempo: number) {
    const duration = ESUtils.timeToMeasureDelta(seconds, tempo)
    let posIncrement = duration
    let exp = -2

    // stop adjusting at exp=4 -> 16 measures
    while (duration > Math.pow(2, exp) && exp < 4) {
        exp++
    }

    if (duration <= Math.pow(2, exp)) {
        posIncrement = Math.pow(2, exp)
    }

    return [posIncrement, duration]
}

const clipCache = new Map<string, AudioBuffer>()

function sliceAudioBuffer(buffer: AudioBuffer, startMeasure: number, endMeasure: number, tempo: number) {
    // Extract a range of samples from an audio buffer
    const startIndex = ESUtils.measureToTime(startMeasure, tempo) * buffer.sampleRate
    const endIndex = ESUtils.measureToTime(endMeasure, tempo) * buffer.sampleRate
    const lengthInSamples = endIndex - startIndex

    const sliced = new AudioBuffer({ numberOfChannels: buffer.numberOfChannels, length: lengthInSamples, sampleRate: buffer.sampleRate })
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        sliced.copyToChannel(buffer.getChannelData(c).subarray(startIndex, endIndex), c)
    }
    return sliced
}

// Fill in looped clips with multiple clips.
export function fixClips(result: DAWData, buffers: { [key: string]: AudioBuffer }) {
    const tempoMap = new TempoMap(result)
    // step 1: fill in looped clips
    result.length = 0

    for (const track of result.tracks) {
        const newClips: Clip[] = []
        for (const clip of track.clips) {
            clip.sourceAudio = buffers[clip.filekey]
            let duration
            let posIncrement = 0

            if (clip.tempo === undefined) {
                duration = ESUtils.timeToMeasureDelta(clip.sourceAudio.duration, tempoMap.getTempoAtMeasure(clip.measure))
            } else {
                // Tempo specified: round to the nearest sixteenth note.
                // This corrects for imprecision in dealing with integer numbers of samples,
                // and helps with user-uploaded MP3, which deviate from the intended length after encoding & decoding.
                // E.g.: A wave file of one measure at 88 bpm, 44.1kHz has 120273 samples;
                // converting it to a mp3 and decoding yields 119808 samples,
                // meaning it falls behind by ~0.01 seconds per loop.
                const actualLengthInQuarters = clip.sourceAudio.duration / 60 * clip.tempo
                const actualLengthInSixteenths = actualLengthInQuarters * 4
                // NOTE: This prevents users from using samples which have intentionally weird lenghts,
                // like 33 32nd notes, as they will be rounded to the nearest 16th.
                // This has been deemed an acceptable tradeoff for fixing unintentional loop drift.
                const targetLengthInSixteenths = Math.round(actualLengthInSixteenths)
                const targetLengthInQuarters = targetLengthInSixteenths / 4
                duration = posIncrement = targetLengthInQuarters / 4
            }

            // if the clip end value is 0, set it to the duration (one repeat)
            // this fixes API calls insertMedia, etc. that don't know the clip length ahead of time
            clip.end = clip.end || (duration + 1)

            // update result length
            const endMeasure = clip.measure + (clip.end - clip.start)
            result.length = Math.max(result.length, endMeasure + clip.silence - 1)

            // the minimum measure length for which extra clips will be added to fill in the gap
            const fillableGapMinimum = 0.01
            // add clips to fill in empty space
            let measure = clip.measure
            let first = true
            while ((first || clip.loop) && measure < endMeasure - fillableGapMinimum) {
                let newClip
                ({ clip: newClip, posIncrement, duration } = fixClip(clip, first, duration, endMeasure, measure, tempoMap, posIncrement))
                newClips.push(newClip)
                measure += posIncrement
                first = false
            }
        }

        track.clips = newClips
    }
}

function applyEnvelope(buffer: AudioBuffer, startRamp: boolean, endRamp: boolean) {
    // Apply a simple piecewise-linear envelope (ramp up, sustain, ramp down) to an audio buffer to avoid clicks after slicing.
    // Ramp length is 10ms or half the clip length, whichever is shorter.
    const rampLength = Math.min(buffer.length / 2, Math.floor(0.01 * buffer.sampleRate))
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const samples = buffer.getChannelData(c)
        for (let i = 0; i < rampLength; i++) {
            if (startRamp) samples[i] *= i / rampLength
            if (endRamp) samples[samples.length - 1 - i] *= i / rampLength
        }
    }
}

function fixClip(clip: Clip, first: boolean, duration: number, endMeasure: number, measure: number, tempoMap: TempoMap, posIncrement: number) {
    const filekey = clip.filekey
    const start = first ? clip.start : 1
    const end = first ? Math.min(duration + 1, clip.end) : 1 + Math.min(duration, endMeasure - measure)
    let buffer = clip.sourceAudio
    const sliceStart = start !== 1
    const sliceEnd = end !== duration + 1
    const needSlice = sliceStart || sliceEnd
    let needStretch = false
    let cacheKey = JSON.stringify([clip.filekey, start, end])
    if (clip.tempo !== undefined) {
        const clipMap = tempoMap.slice(measure, measure + (end - start))
        needStretch = clipMap.points.some(point => point.tempo !== clip.tempo)
        cacheKey = JSON.stringify([clip.filekey, start, end, clipMap.points])
    }
    if (needStretch || needSlice) {
        const cached = clipCache.get(cacheKey)
        if (cached !== undefined) {
            buffer = cached
        } else {
            // For consistency with old behavior, use initial tempo if clip tempo is unavailable.
            const tempo = clip.tempo ?? tempoMap.points[0].tempo
            const slicedBuffer = needSlice ? sliceAudioBuffer(clip.sourceAudio, start, end, tempo) : clip.sourceAudio

            if (needStretch) {
                buffer = timestretchBuffer(slicedBuffer, tempo, tempoMap, measure)
            } else {
                buffer = slicedBuffer
            }
            applyEnvelope(buffer, sliceStart, sliceEnd)

            // Cache both full audio files and partial audio files (ie when needSlide === true)
            clipCache.set(cacheKey, buffer)
        }
    }
    if (clip.tempo === undefined) {
        // Clip has no tempo, so use an even increment: quarter note, half note, whole note, etc.
        [posIncrement, duration] = roundUpToDivision(buffer.duration, tempoMap.getTempoAtMeasure(measure))
    }

    clip = {
        ...clip,
        audio: buffer,
        filekey,
        measure,
        start,
        end,
        loopChild: !first,
    }
    return { clip, posIncrement, duration }
}

// Warn users when a clips overlap each other. Done after execution because
// we don't know the length of clips until then.
export function checkOverlap(result: DAWData) {
    const margin = 0.001
    const overlaps: [string, string, number][] = []

    for (const [trackIndex, { clips }] of result.tracks.entries()) {
        clips.sort((a, b) => a.measure - b.measure)
        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i]
            const clipEnd = clip.measure + clip.end - clip.start
            for (let j = i + 1; j < clips.length;) {
                const other = clips[j]
                const otherEnd = other.measure + other.end - other.start
                if (clip.measure < (otherEnd - margin) && clipEnd > (other.measure + margin)) {
                    userConsole.warn(`Removing ${other.filekey} (line ${other.sourceLine})` +
                                     ` due to overlap at track ${trackIndex}, measure ${other.measure}` +
                                     ` with ${clip.filekey} (line ${clip.sourceLine})`)
                    if (FLAGS.SHOW_CAI) {
                        overlaps.push([clip.filekey, other.filekey, trackIndex])
                    }
                    clips.splice(j, 1)
                } else {
                    j++
                }
            }
        }
    }

    if (FLAGS.SHOW_CAI) {
        setCurrentOverlap(overlaps)
    }
}

// Warn users when a track contains effects, but no audio. Done after execution
// because we don't know if there are audio samples on the entire track
// until then. (Doesn't apply to mix track, which can't contain clips.)
export function checkEffects(result: DAWData) {
    for (const [i, track] of Object.entries(result.tracks).slice(1)) {
        const clipCount = track.clips.length
        const effectCount = Object.keys(track.effects).length

        if (effectCount > 0 && clipCount === 0) {
            userConsole.warn(i18n.t("messages:dawservice.effecttrackwarning") + ` (track ${i})`)
        }
    }
}

// Adds a metronome as track 0 of a result.
export async function addMetronome(result: DAWData) {
    const [stressed, unstressed] = await Promise.all([
        audioLibrary.getSound("METRONOME01"),
        audioLibrary.getSound("METRONOME02"),
    ])
    const track = result.tracks[0]
    for (let i = 1; i < result.length + 1; i += 0.25) {
        const filekey = i % 1 === 0 ? "METRONOME01" : "METRONOME02"
        const sound = i % 1 === 0 ? stressed : unstressed
        track.clips.push({
            filekey,
            sourceAudio: sound.buffer,
            audio: sound.buffer,
            track: 0,
            measure: i,
            start: 1,
            end: 1.625,
            scale: false,
            loop: false,
            loopChild: false,
        } as unknown as Clip)
    }
}
