// Fill in & fixup DAW project data generated by user script to make it ready for playback.
import i18n from "i18next"

import audioContext from "../audio/context"
import * as audioLibrary from "./audiolibrary"
import { Clip, ClipSlice, DAWData } from "common"
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
    await loadBuffersForSampleSlicing(result)
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

export async function loadBuffersForSampleSlicing(result: DAWData) {
    const promises = []
    const tempoMap = new TempoMap(result)

    for (const [sliceKey, sliceDef] of Object.entries(result.slicedClips)) {
        if (sliceKey in audioLibrary.cache.promises) continue // Already sliced.
        const promise: Promise<[string, ClipSlice, audioLibrary.Sound]> =
            audioLibrary.getSound(sliceDef.sourceFile).then(sound => [sliceKey, sliceDef, sound])
        promises.push(promise)
    }

    for (const [key, def, sound] of await Promise.all(promises)) {
        // For consistency with old behavior, use clip tempo if available and initial tempo if not.
        const baseTempo = sound.tempo ?? tempoMap.points?.[0]?.tempo ?? 120
        const buffer = sliceAudioBufferByMeasure(sound.name, sound.buffer, def.start, def.end, baseTempo)
        audioLibrary.cache.promises[key] = Promise.resolve({ ...sound, file_key: key, buffer })
    }
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
            // Some sliced clips overwrite their default tempo with a user-provided custom tempo
            const tempo = await lookupTempo(clip.filekey) ?? 120

            if (result.slicedClips[clip.filekey]?.timestretchFactor) {
                // timestretchFactor is a multiplier for the tempo
                const customTempo = tempo * result.slicedClips[clip.filekey]?.timestretchFactor!
                clip.tempo = customTempo === -1 ? undefined : customTempo ?? tempo
            } else if (result.slicedClips[clip.filekey]?.customTempo) {
                // customTempo is specified directly in this case
                const customTempo = result.slicedClips[clip.filekey]?.customTempo
                // For clip.tempo, undefined means "do not timestretch"
                clip.tempo = customTempo === -1 ? undefined : customTempo ?? tempo
            }
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

// Slice a buffer to create a new temporary sound constant.
//   start - the start of the sound, in measures (relative to 1 being the start of the sound)
//   end - the end of the sound, in measures (relative to 1 being the start of the sound)
function sliceAudioBufferByMeasure(filekey: string, buffer: AudioBuffer, start: number, end: number, baseTempo: number) {
    if (start === 1 && end === -1) {
        return buffer
    }

    const lengthInBeats = (end - start) * 4 // 4 beats per measure
    const lengthInSeconds = lengthInBeats * (60.0 / baseTempo)
    const lengthInSamples = lengthInSeconds * buffer.sampleRate

    // Sample range which will be extracted from the original buffer
    // Subtract 1 from start, end because measures are 1-indexed
    const startSamp = (start - 1) * 4 * (60.0 / baseTempo) * buffer.sampleRate
    const endSamp = (end - 1) * 4 * (60.0 / baseTempo) * buffer.sampleRate

    // This "error compensation" allows slices to end at `1 + dur(sound)`, since `dur` rounds to the nearest 0.01
    // It's safe since the `Float32Array.subarray` method below is permissive about exceeding the end of the array
    const ROUNDING_ERROR_COMPENSATION = 1250 // n samples
    if (endSamp > buffer.length + ROUNDING_ERROR_COMPENSATION) {
        throw new RangeError(`End of slice at ${endSamp} reaches past end of ${buffer.length} ${filekey}`)
    }

    const slicedBuffer = audioContext.createBuffer(buffer.numberOfChannels, lengthInSamples, buffer.sampleRate)
    const originalBufferData = buffer.getChannelData(0).subarray(startSamp, endSamp)
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        slicedBuffer.copyToChannel(originalBufferData, c)
    }

    applyEnvelope(slicedBuffer, startSamp > 0, endSamp < buffer.length)
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

function sliceAudio(audio: AudioBuffer, start: number, end: number, tempo: number) {
    // Slice down to relevant part of clip.
    // TODO: Consolidate all the slicing logic (between this and createSlice).
    const startIndex = ESUtils.measureToTime(start, tempo) * audio.sampleRate
    const endIndex = ESUtils.measureToTime(end, tempo) * audio.sampleRate
    return audio.getChannelData(0).subarray(startIndex, endIndex)
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
        let cached = clipCache.get(cacheKey)
        if (cached === undefined) {
            // For consistency with old behavior, use initial tempo if clip tempo is unavailable.
            const tempo = clip.tempo ?? tempoMap.points[0].tempo
            const input = needSlice ? sliceAudio(clip.sourceAudio, start, end, tempo) : clip.sourceAudio.getChannelData(0)
            if (needStretch) {
                cached = timestretch(input, clip.tempo!, tempoMap, measure)
            } else {
                cached = audioContext.createBuffer(1, input.length, clip.sourceAudio.sampleRate)
                cached.copyToChannel(input, 0)
            }
            applyEnvelope(cached, sliceStart, sliceEnd)
            // Cache both full audio files and partial audio files (ie when needSlide === true)
            clipCache.set(cacheKey, cached)
        }
        buffer = cached
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
