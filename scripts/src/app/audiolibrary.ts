
// Fetch audio and metadata from the EarSketch library.
// TODO: Fix this module's nomenclature problem, between "tags", "folders", "keys", and "tag metadata".
import ctx from "./audiocontext"
import { SoundEntity } from "common"
import esconsole from "../esconsole"

export type Sound = SoundEntity & { buffer: AudioBuffer }

export const cache = {
    // Metadata from server:
    audioTags: null as string[] | null,
    audioFolders: null as string[] | null,
    defaultAudioFolders: null as string[] | null,
    userAudioFolders: null as string[] | null,
    defaultTags: null as SoundEntity[] | null,
    // Ongoing promises: this is so we don't launch a second request for the same information, while waiting on the first.
    // TODO: Also use this approach for other requests, besides getAudioClip.
    promises: Object.create(null) as { [key: string]: Promise<Sound> },
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
export function getSound(filekey: string) {
    if (filekey in cache.promises) {
        return cache.promises[filekey]
    } else {
        return (cache.promises[filekey] = _getSound(filekey))
    }
}

async function _getSound(filekey: string) {
    esconsole("Loading audio clip with filekey: " + filekey, ["debug", "audiolibrary"])
    const params = { key: filekey }
    const url = URL_DOMAIN + "/audio/sample?" + new URLSearchParams(params)

    // STEP 1: check if audio key exists
    // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
    let result
    try {
        result = await getMetadata(filekey)
    } catch (err) {
        esconsole("Error getting audio keys: " + filekey, ["error", "audiolibrary"])
        throw err
    }
    if (result === null) {
        throw new ReferenceError(`File key ${filekey} does not exist`)
    }

    // Server uses -1 to indicate no tempo; for type-safety, we remap this to undefined.
    if (result.tempo === -1) {
        result.tempo = undefined
    }

    // STEP 2: Ask the server for the audio file
    esconsole(`Getting ${filekey} buffer from server`, ["debug", "audiolibrary"])
    let data: ArrayBuffer
    try {
        data = await (await fetch(url)).arrayBuffer()
    } catch (err) {
        esconsole("Error getting " + filekey + " from the server", ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0) {
            throw new Error(`NetworkError: Could not retreive sound file ${filekey} due to network error`)
        } else if (status >= 500 && status < 600) {
            throw new Error(`ServerError: Could not retreive sound file ${filekey} due to server error`)
        } else {
            throw err
        }
    }

    // Need to do this before decodeAudioData() call, as that 'detaches' the ArrayBuffer.
    const bytes = new Uint8Array(data)
    // Check for MP3 file signatures.
    const isMP3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xff || bytes[1] === 0xfb)

    // STEP 3: decode the audio data.
    esconsole(`Decoding ${filekey} buffer`, ["debug", "audiolibrary"])
    let buffer: AudioBuffer
    try {
        // decodeAudioData has a newer promise-based syntax, but unfortunately Safari does not support it.
        // See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#browser_compatibility
        buffer = await new Promise((resolve, reject) => ctx.decodeAudioData(data, buffer => resolve(buffer), reject))
    } catch (err) {
        esconsole("Error decoding audio: " + filekey, ["error", "audiolibrary"])
        throw err
    }
    esconsole(filekey + " buffer decoded", ["debug", "audiolibrary"])

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

// Get the list of audio tag names. (TODO: Doesn't this return a list of file keys?)
export async function getAudioTags() {
    if (cache.audioTags !== null) {
        return cache.audioTags
    }
    const url = URL_DOMAIN + "/audio/tags"
    esconsole("Fetching audio tags", ["debug", "audiolibrary"])
    try {
        const data = await (await fetch(url)).json()
        const output: string[] = []
        for (const key in data) {
            const tag = data[key]
            output.push(tag.file_key)
        }
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return (cache.audioTags = output)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Clears the audio tag cache.
export function clearAudioTagCache() {
    esconsole("Clearing the audio tag cache", ["debug", "audiolibrary"])
    cache.audioTags = null
    cache.audioFolders = null
    cache.defaultAudioFolders = null
    cache.userAudioFolders = null
    cache.defaultTags = null
    cache.promises = {} // this might be overkill, but otherwise deleted / renamed sound cache is still accessible
}

// Get a list of folder keys. NOTE: This is very inefficient. Prefer using getDefaultAudioFolders and getUserAudioFolders WS.
export async function getAudioFolders() {
    if (cache.audioFolders !== null) {
        return cache.audioFolders
    }
    esconsole("Fetching audio folders", ["debug", "audiolibrary"])
    try {
        const data = await (await fetch(URL_DOMAIN + "/audio/keys?tag=")).json()
        // return only a list of file keys
        const output = []
        for (const file of Object.values(data) as any[]) {
            if (file.scope === 0) continue
            const str = file.tags.toUpperCase()
            const tokens = str.split("__")
            // TODO: this token business is confusing
            output.push(tokens[0])
            output.push(tokens[tokens.length - 1])
            output.push(str.substr(str.indexOf("__") + 2, str.length))
        }
        esconsole("Found audio folders", ["debug", "audiolibrary"])
        return (cache.audioFolders = output)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

async function getDefaultAudioFolders() {
    if (cache.defaultAudioFolders !== null) {
        return cache.defaultAudioFolders
    }
    esconsole("Fetching default audio folders", ["debug", "audiolibrary"])
    try {
        const data: string[] = await (await fetch(URL_DOMAIN + "/audio/defaultfolders")).json()
        esconsole("Found default audio folders", ["debug", "audiolibrary"])
        return (cache.defaultAudioFolders = data)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

async function getUserAudioFolders() {
    if (cache.userAudioFolders !== null) {
        return cache.userAudioFolders
    }
    esconsole("Fetching all the user audio folders", ["debug", "audiolibrary"])
    try {
        const data: string[] = await (await fetch(URL_DOMAIN + "/audio/userfolders")).json()
        esconsole("Found user audio folders", ["debug", "audiolibrary"])
        return (cache.userAudioFolders = data)
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

export async function getAllFolders() {
    esconsole("Fetching all folders", ["debug", "audiolibrary"])
    try {
        const result = await Promise.all([getDefaultAudioFolders(), getUserAudioFolders()])
        esconsole("Fetched all folders.", ["debug", "audiolibrary"])
        return result[0].concat(result[1])
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

export async function getDefaultTagsMetadata() {
    if (cache.defaultTags !== null) {
        return cache.defaultTags
    }
    esconsole("Fetching default sounds tag metadata", ["debug", "audiolibrary"])
    try {
        const data: SoundEntity[] = await (await fetch(URL_DOMAIN + "/audio/defaulttags")).json()
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return (cache.defaultTags = data)
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function getMetadata(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/audio/metadata?" + new URLSearchParams({ key: name })
    const response = await fetch(url)
    const text = await response.text()
    if (!text) {
        // Server returns 200 OK + empty string for invalid keys, which breaks JSON parsing.
        // TODO: Server should return a more reasonable response. (Either an HTTP error code or a valid JSON object such as `null`.)
        return null
    }
    const data = JSON.parse(text)
    return "file_key" in data ? data as SoundEntity : null
}
