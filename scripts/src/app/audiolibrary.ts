
// Fetch audio clips and metadata from the EarSketch library.
// TODO: Fix this module's nomenclature problem, between "tags", "folders", "keys", and "tag metadata".
import ctx from "./audiocontext"
import { SoundEntity } from "common"
import esconsole from "../esconsole"

export type AugmentedBuffer = AudioBuffer & { filekey: string }

export const cache = {
    // Metadata from server:
    folders: null as string[] | null,
    standardLibrary: null as SoundEntity[] | null,
    // Buffers of audio data, post-timestretching:
    clips: {} as { [key: string]: AugmentedBuffer },
    // Sliced buffers; these are generated by `runner` and used in `getAudioClip` here.
    slicedClips: {} as { [key: string]: AugmentedBuffer },
    // Ongoing promises: this is so we don't launch a second request for the same information, while waiting on the first.
    // TODO: Also use this approach for other requests, besides getAudioClip.
    promises: {} as { [key: string]: Promise<AugmentedBuffer> },
}

// TODO: These don't belong in this module.
export const EFFECT_TAGS = [
    "VOLUME", "GAIN", "DELAY", "DELAY_TIME", "DELAY_FEEDBACK",
    "DISTORTION", "DISTO_GAIN", "FILTER", "FILTER_FREQ", "FILTER_RESONANCE",
    "COMPRESSOR", "COMPRESSOR_THRESHOLD", "COMPRESSOR_RATIO", "PAN", "LEFT_RIGHT",
    "BANDPASS", "BANDPASS_FREQ", "BANDPASS_WIDTH", "CHORUS", "CHORUS_LENGTH",
    "CHORUS_NUMVOICES", "CHORUS_RATE", "CHORUS_MOD", "EQ3BAND", "EQ3BAND_LOWGAIN",
    "EQ3BAND_LOWFREQ", "EQ3BAND_MIDGAIN", "EQ3BAND_MIDFREQ", "EQ3BAND_HIGHGAIN",
    "EQ3BAND_HIGHFREQ", "FLANGER", "FLANGER_LENGTH", "FLANGER_FEEDBACK",
    "FLANGER_RATE", "PHASER", "PHASER_RATE", "PHASER_RANGEMIN", "PHASER_RANGEMAX",
    "PHASER_FEEDBACK", "PITCHSHIFT", "PITCHSHIFT_SHIFT", "TREMOLO", "TREMOLO_FREQ",
    "TREMOLO_AMOUNT", "RINGMOD", "RINGMOD_MODFREQ", "RINGMOD_FEEDBACK", "WAH",
    "WAH_POSITION", "REVERB", "REVERB_TIME", "REVERB_DAMPFREQ", "MIX", "BYPASS",
]
export const ANALYSIS_TAGS = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"]

// Get an audio buffer from a file key.
//   filekey: The constant associated with the audio clip that users type in EarSketch code.
//   tempo: Tempo to scale the returned clip to.
export function getAudioClip(filekey: string, tempo: number) {
    const cacheKey = [filekey, tempo].toString()
    if (cacheKey in cache.promises) {
        return cache.promises[cacheKey]
    } else {
        return (cache.promises[cacheKey] = _getAudioClip(filekey, tempo))
    }
}

const timestretch = (buffer: AudioBuffer, sourceTempo: number, targetTempo: number) => {
    // JS time stretcher; Seems to introduce an unwanted sample offset when the same instance is reused.
    const kali = new Kali(1)
    kali.setup(ctx.sampleRate, targetTempo / sourceTempo, FLAGS.TS_QUICK_SEARCH)

    const offset = Math.round(buffer.length * 0.1)
    const input = new Float32Array(buffer.length + offset * 2)
    const source = buffer.getChannelData(0)
    for (let i = 0; i < buffer.length; i++) {
        input[i + offset] = source[i]
    }
    kali.input(input)
    kali.process()
    // This weird calculation matches the output length of SOX time stretching.
    const targetLength = Math.round((buffer.length + 1) * sourceTempo / targetTempo)
    const outOffset = Math.round(offset * sourceTempo / targetTempo)
    const output = new Float32Array(targetLength + outOffset * 2)
    kali.output(output)
    kali.flush()
    const newBuffer = ctx.createBuffer(1, targetLength, ctx.sampleRate)
    const data = newBuffer.getChannelData(0)
    for (let i = 0; i < targetLength; i++) {
        data[i] = output[i + outOffset]
    }

    return newBuffer
}

async function _getAudioClip(name: string, tempo: number) {
    const cacheKey = [name, tempo].toString()

    if (cacheKey in cache.clips) {
        return cache.clips[cacheKey]
    } else if (cacheKey in cache.slicedClips) {
        const slicedBuffer = cache.slicedClips[cacheKey]
        slicedBuffer.filekey = name
        return slicedBuffer
    }

    esconsole("Loading audio clip: " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/sample?" + new URLSearchParams({ name })

    // STEP 1: check if audio key exists
    // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
    let result
    try {
        result = await getMetadata(name)
    } catch (err) {
        esconsole("Error getting audio: " + name, ["error", "audiolibrary"])
        throw err
    }
    if (!result) {
        throw new ReferenceError(`Clip ${name} does not exist`)
    }
    const originalTempo = result.tempo

    // STEP 2: Ask the server for the audio file
    esconsole(`Getting ${name} buffer from server`, ["debug", "audiolibrary"])
    let data: ArrayBuffer
    try {
        data = await (await fetch(url)).arrayBuffer()
    } catch (err) {
        esconsole("Error getting " + name + " from the server", ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0) {
            throw new Error(`NetworkError: Could not retreive sound file ${name} due to network error`)
        } else if (status >= 500 && status < 600) {
            throw new Error(`ServerError: Could not retreive sound file ${name} due to server error`)
        } else {
            throw err
        }
    }

    // Need to do this before decodeAudioData() call, as that 'detaches' the ArrayBuffer.
    const bytes = new Uint8Array(data)
    // Check for MP3 file signatures.
    const isMP3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff || bytes[1] === 0xfb)

    // STEP 3: decode the audio data.
    esconsole(`Decoding ${name} buffer`, ["debug", "audiolibrary"])
    let buffer: AugmentedBuffer
    try {
        // decodeAudioData has a newer promise-based syntax, but unfortunately Safari does not support it.
        // See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#browser_compatibility
        buffer = await new Promise((resolve, reject) => ctx.decodeAudioData(data, buffer => resolve(buffer as AugmentedBuffer), reject))
    } catch (err) {
        esconsole("Error decoding audio clip: " + name, ["error", "audiolibrary"])
        throw err
    }
    esconsole(name + " buffer decoded", ["debug", "audiolibrary"])

    if (isMP3) {
        // MP3-specific offset fix
        const fixed = new Float32Array(buffer.length)
        // Offset chosen based on https://lame.sourceforge.io/tech-FAQ.txt
        buffer.copyFromChannel(fixed, 0, 1057)
        buffer.copyToChannel(fixed, 0)
    }

    if (originalTempo === -1 || tempo === -1) {
        esconsole("No time stretching required.", ["debug", "audiolibrary"])
    } else {
        esconsole("Time-stretching " + name, ["debug", "audiolibrary"])
        buffer = timestretch(buffer, originalTempo, tempo) as AugmentedBuffer
    }

    // STEP 4: Return the decoded audio buffer.
    // Add a filekey property to the buffer so we can figure out where it came from later.
    buffer.filekey = name
    if (FLAGS.CACHE_TS_RESULTS) {
        cache.clips[cacheKey] = buffer
    }
    // Remove this promise from the cache since it's been resolved.
    delete cache.promises[cacheKey]

    esconsole("Returning buffer", ["debug", "audiolibrary"])
    return buffer
}

export function cacheSlicedClip(filekey: string, tempo: number, buffer: AugmentedBuffer) {
    cache.slicedClips[[filekey, tempo].toString()] = buffer
}

// Clears the audio tag cache.
export function clearAudioTagCache() {
    esconsole("Clearing the audio tag cache", ["debug", "audiolibrary"])
    cache.folders = null
    cache.standardLibrary = null
    cache.clips = {} // this might be overkill, but otherwise deleted / renamed clip cache is still accessible
}

export async function getFolders() {
    if (cache.folders !== null) {
        return cache.folders
    }
    esconsole("Fetching default audio folders", ["debug", "audiolibrary"])
    try {
        const data: string[] = await (await fetch(URL_DOMAIN + "/audio/folders")).json()
        esconsole("Found default audio folders", ["debug", "audiolibrary"])
        return (cache.folders = data)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

export async function getStandardLibrary() {
    if (cache.standardLibrary !== null) {
        return cache.standardLibrary
    }
    esconsole("Fetching default sounds tag metadata", ["debug", "audiolibrary"])
    try {
        const data: SoundEntity[] = await (await fetch(URL_DOMAIN + "/audio/standard")).json()
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return (cache.standardLibrary = data)
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function getMetadata(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/metadata?" + new URLSearchParams({ name })
    const response = await fetch(url)
    const text = await response.text()
    if (!text) {
        // Server returns 200 OK + empty string for invalid keys, which breaks JSON parsing.
        // TODO: Server should return a more reasonable response. (Either an HTTP error code or a valid JSON object such as `null`.)
        return null
    }
    const data: SoundEntity = JSON.parse(text)
    return "name" in data ? data : null
}
