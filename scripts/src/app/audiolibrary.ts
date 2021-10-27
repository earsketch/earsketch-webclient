
// Fetch audio and metadata from the EarSketch library.
import ctx from "./audiocontext"
import { SoundEntity } from "common"
import esconsole from "../esconsole"

export type Sound = SoundEntity & { buffer: AudioBuffer }

export const cache = {
    // Metadata from server:
    folders: null as string[] | null,
    standardSounds: null as SoundEntity[] | null,
    // Ongoing promises: this is so we don't launch a second request for the same information, while waiting on the first.
    // TODO: Also use this approach for other requests, besides getAudioClip.
    promises: Object.create(null) as { [key: string]: Promise<Sound> },
}

// TODO: These don't belong in this module.
export const EFFECT_NAMES = [
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
export const ANALYSIS_NAMES = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"]

// Get an audio buffer from a file key.
//   filekey: The constant associated with the audio clip that users type in EarSketch code.
//   tempo: Tempo to scale the returned clip to.
export function getSound(filekey: string) {
    if (filekey in cache.promises) {
        return cache.promises[filekey]
    } else {
        return (cache.promises[filekey] = _getSound(filekey))
    }
}

async function _getSound(name: string) {
    esconsole("Loading audio: " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/sample?" + new URLSearchParams({ name })

    // STEP 1: check if sound exists
    // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
    let result
    try {
        result = await getMetadata(name)
    } catch (err) {
        esconsole("Error getting sound: " + name, ["error", "audiolibrary"])
        throw err
    }
    if (result === null) {
        throw new ReferenceError(`Sound ${name} does not exist`)
    }

    // Server uses -1 to indicate no tempo; for type-safety, we remap this to undefined.
    if (result.tempo === -1) {
        result.tempo = undefined
    }

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
    let buffer: AudioBuffer
    try {
        // decodeAudioData has a newer promise-based syntax, but unfortunately Safari does not support it.
        // See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#browser_compatibility
        buffer = await new Promise((resolve, reject) => ctx.decodeAudioData(data, buffer => resolve(buffer), reject))
    } catch (err) {
        esconsole("Error decoding audio: " + name, ["error", "audiolibrary"])
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

    // STEP 4: Return the sound metadata and decoded audio buffer.
    esconsole("Returning sound", ["debug", "audiolibrary"])
    return { ...result, buffer }
}

export function clearCache() {
    esconsole("Clearing the cache", ["debug", "audiolibrary"])
    cache.folders = null
    cache.standardSounds = null
    cache.promises = {} // this might be overkill, but otherwise deleted / renamed sound cache is still accessible
}

export async function getStandardFolders() {
    if (cache.folders !== null) {
        return cache.folders
    }
    esconsole("Extracting standard audio folders", ["debug", "audiolibrary"])
    try {
        const sounds = await getStandardSounds()
        const folders = [...new Set(sounds.map(entity => entity.folder))]
        esconsole(`Extracted ${folders.length} standard folders`, ["debug", "audiolibrary"])
        return (cache.folders = folders)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

export async function getStandardSounds() {
    if (cache.standardSounds !== null) {
        return cache.standardSounds
    }
    esconsole("Fetching standard sound metadata", ["debug", "audiolibrary"])
    try {
        const data: SoundEntity[] = await (await fetch(URL_DOMAIN + "/audio/standard")).json()
        esconsole(`Fetched ${Object.keys(data).length} sounds`, ["debug", "audiolibrary"])
        return (cache.standardSounds = data)
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
