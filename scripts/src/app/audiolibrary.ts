/**
 * An Angular factor service for fetching audio clips from the EarSketch
 * library.
 *
 * TODO: Angular $http uses Angular $q promises, which are not compatible with
 * native ECMAScript 6 Promises. Maybe one day they will be? I.e.
 * $q.all() and Promise.all() will not let you interchange promise types. At
 * least in unit tests. It seems to work in the browser. I have no idea why.
 * I used $q everywhere in this library so we could unit test this service.
 *
 * @module audioLibrary
 * @author Creston Bunch
 */
import ctx from "./audiocontext"
import esconsole from "../esconsole"
import * as helpers from "../helpers"

type AugmentedBuffer = AudioBuffer & { filekey: string }

let SOUND_CACHE: any[] = []
export { SOUND_CACHE as cache }
// TODO: Eliminate CLIP_CACHE; PROMISE_CACHE can already do this (individual promises cache their results).
let CLIP_CACHE: { [key: string]: any } = {}
const PROMISE_CACHE: { [key: string]: Promise<any> } = {}
const SLICED_CLIP_CACHE: { [key: string]: AugmentedBuffer } = {}

// TODO: These don't belong in this module.
export const EFFECT_TAGS = [
    "VOLUME","GAIN","DELAY","DELAY_TIME","DELAY_FEEDBACK",
    "DISTORTION","DISTO_GAIN","FILTER","FILTER_FREQ","FILTER_RESONANCE",
    "COMPRESSOR","COMPRESSOR_THRESHOLD","COMPRESSOR_RATIO","PAN","LEFT_RIGHT",
    "BANDPASS","BANDPASS_FREQ","BANDPASS_WIDTH","CHORUS","CHORUS_LENGTH",
    "CHORUS_NUMVOICES","CHORUS_RATE","CHORUS_MOD","EQ3BAND","EQ3BAND_LOWGAIN",
    "EQ3BAND_LOWFREQ","EQ3BAND_MIDGAIN","EQ3BAND_MIDFREQ","EQ3BAND_HIGHGAIN",
    "EQ3BAND_HIGHFREQ","FLANGER","FLANGER_LENGTH","FLANGER_FEEDBACK",
    "FLANGER_RATE","PHASER","PHASER_RATE","PHASER_RANGEMIN","PHASER_RANGEMAX",
    "PHASER_FEEDBACK","PITCHSHIFT","PITCHSHIFT_SHIFT","TREMOLO","TREMOLO_FREQ",
    "TREMOLO_AMOUNT","RINGMOD","RINGMOD_MODFREQ","RINGMOD_FEEDBACK","WAH",
    "WAH_POSITION","REVERB","REVERB_TIME","REVERB_DAMPFREQ","MIX","BYPASS"
]
export const ANALYSIS_TAGS = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"]

// Get an audio buffer from a file key.
//   filekey: The constant associated with the audio clip that users type in EarSketch code.
//   tempo: Tempo to scale the returned clip to.
export function getAudioClip(filekey: string, tempo: number, quality: boolean=false) {
    const cacheKey = [filekey, tempo, quality].toString()

    if (cacheKey in PROMISE_CACHE) {
        return PROMISE_CACHE[cacheKey]
    } else {
        return PROMISE_CACHE[cacheKey] = _getAudioClip(filekey, tempo, quality)
    }
}

async function _getAudioClip(filekey: string, tempo: number, quality: boolean) {
    const $http = helpers.getNgService("$http")

    const cacheKey = [filekey, tempo, quality].toString()

    if (cacheKey in CLIP_CACHE) {
        // this clip has already been downloaded
        return CLIP_CACHE[cacheKey]
    } else if (cacheKey in SLICED_CLIP_CACHE) {
        const slicedBuffer = SLICED_CLIP_CACHE[cacheKey]
        slicedBuffer.filekey = filekey
        return slicedBuffer
    }

    esconsole("Loading audio clip with filekey: " + filekey, ["debug", "audiolibrary"])
    const url = FLAGS.USE_CLIENT_TS ? URL_DOMAIN+"/services/audio/getunstretchedsample" : URL_LOADAUDIO
    const params = FLAGS.USE_CLIENT_TS ? {
        key: filekey
    } : {
        key: filekey,
        tempo: tempo,
        audioquality: quality ? 1 : 0
    }
    let clipOrigTempo = -1

    // STEP 1: check if audio key exists
    // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
    let result
    try {
        result = await verifyClip(filekey)
    } catch (err) {
        esconsole("Error getting audio keys: " + filekey, ["error", "audiolibrary"])
        throw err
    }
    if (!result) {
        throw new ReferenceError(`File key ${filekey} does not exist`)
    }
    clipOrigTempo = parseFloat(result.tempo)

    // STEP 2: Ask the server for the audio file
    esconsole(`Getting ${filekey} buffer from server`, ["debug", "audiolibrary"])
    try {
        result = await $http.get(url, {
            params: params,
            responseType: "arraybuffer"
        })
    } catch (err) {
        esconsole("Error getting " + filekey + " from the server", ["error", "audiolibrary"])
        const status = err.status
        if (status <= 0) {
            throw `NetworkError: Could not retreive sound file ${filekey} due to network error`
        } else if (status >= 500 && status < 600) {
            throw `ServerError: Could not retreive sound file ${filekey} due to server error`
        } else {
            throw err
        }
    }

    // STEP 3: decode the audio data.
    esconsole(`Decoding ${filekey} buffer`, ["debug", "audiolibrary"])
    let buffer
    try {
        buffer = await ctx.decodeAudioData(result.data)
    } catch (err) {
        esconsole("Error decoding audio clip: " + filekey, ["error", "audiolibrary"])
        throw err
    }
    esconsole(filekey + " buffer decoded", ["debug", "audiolibrary"])

    if (!FLAGS.USE_CLIENT_TS || clipOrigTempo===-1 || tempo===-1) {
        esconsole("Using the server (sox) time stretcher.", ["debug", "audiolibrary"])
    } else {
        // When useClientTS = true, query unstretched audio clips and apply a time stretch locally.
        esconsole("Using client-side time stretcher for " + filekey, ["audiolibrary"])

        // JS time stretcher; Seems to introduce an unwanted sample offset when the same instance is reused.
        const kali = new Kali(1)
        kali.setup(ctx.sampleRate, tempo/clipOrigTempo, FLAGS.TS_QUICK_SEARCH)

        const offset = Math.round(buffer.length * 0.1)
        const input = new Float32Array(buffer.length+offset*2)
        const source = buffer.getChannelData(0)
        for (let i = 0; i < buffer.length; i++) {
            input[i+offset] = source[i]
        }
        kali.input(input)
        kali.process()

        // This weird calculation matches the output length of SOX time stretching.
        const tgtLen = Math.round((buffer.length+1)*clipOrigTempo/tempo)
        const outOffset = Math.round(offset*clipOrigTempo/tempo)
        const output = new Float32Array(tgtLen+outOffset*2)
        kali.output(output)
        kali.flush()
        const res = new Float32Array(tgtLen)
        for (let i = 0; i < tgtLen; i++) {
            res[i] = output[i+outOffset]
        }

        const newBuff = ctx.createBuffer(1, tgtLen, ctx.sampleRate)
        if (newBuff.copyToChannel) {
            newBuff.copyToChannel(res,0,0)
        } else {
            // For Safari
            const tempBuff = newBuff.getChannelData(0)
            res.forEach(function (v,i) {
            tempBuff[i] = v
            })
        }

        buffer = newBuff
    }


    // STEP 4: return the decoded audio buffer
    if (FLAGS.CACHE_TS_RESULTS) {
        CLIP_CACHE[cacheKey] = buffer
    }
    // add a filekey property to the buffer so we can
    // figure out where it came from later
    (buffer as AugmentedBuffer).filekey = filekey
    // remove this promise from the cache since it"s
    // been resolved
    delete PROMISE_CACHE[cacheKey]

    esconsole("Returning buffer", ["debug", "audiolibrary"])
    return buffer
}

export function cacheSlicedClip(fileKey: string, tempo: number, quality: boolean, buffer: AugmentedBuffer) {
    SLICED_CLIP_CACHE[[fileKey, tempo, quality].toString()] = buffer
}

// Get the list of audio tag names.
export async function getAudioTags() {
    const url = URL_DOMAIN + "/services/audio/getaudiotags"
    esconsole("Fetching audio tags", ["debug", "audiolibrary"])
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, {cache: true})
        // return only a list of file keys
        const output = []
        for (const key in result.data.audioTags) {
            const tag = result.data.audioTags[key]
            output.push(tag.file_key)
        }
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return output
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Get the list of ALL user-submitted audio tags.
export async function getUserAudioTags() {
    const url = URL_DOMAIN + "/services/audio/getaudiokeys?tag="
    esconsole("Fetching audio keys", ["debug","audiolibrary"])
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, {cache: true})
        // return only a list of file keys
        const output = []
        for (const key in result.data.smallAudioFile) {
            const tag = result.data.smallAudioFile[key]
            output.push(tag.file_key)
        }
        esconsole("Found audio keys", ["debug", "audiolibrary"])
        return output
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Clears the audio tag cache.
export function clearAudioTagCache() {
    esconsole("Clearing the audio tag cache", ["debug", "audiolibrary"])
    // doesn't seem to be working... using removeAll() instead
    // $cacheFactory.get("$http").remove(URL_DOMAIN + "/services/audio/getaudiotags")
    // $cacheFactory.get("$http").remove(URL_DOMAIN + "/services/audio/getaudiokeys?tag="); // user audio tags
    const $cacheFactory = helpers.getNgService("$cacheFactory")
    $cacheFactory.get("$http").removeAll()
    SOUND_CACHE = []
    CLIP_CACHE = []; // this might be overkill, but otherwise deleted / renamed clip cache is still accessible
}

// Get a list of folder keys. NOTE: This is very inefficient. Prefer using getDefaultAudioFolders and getUserAudioFolders WS.
export async function getAudioFolders() {
    const url = URL_DOMAIN + "/services/audio/getaudiokeys?tag="
    esconsole("Fetching audio folders", ["debug", "audiolibrary"])
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, {cache: true})
        // return only a list of file keys
        const output = []
        for (const key in result.data.smallAudioFile) {
            const file = result.data.smallAudioFile[key]
            if (file.scope === 0) { continue; }
            const str = file.tags.toUpperCase()
            const tokens = str.split("__")
            // TODO: this token business is confusing
            output.push(tokens[0])
            output.push(tokens[tokens.length-1])
            output.push(str.substr(str.indexOf("__")+2, str.length))
        }
        esconsole("Found audio folders", ["debug", "audiolibrary"])
        return output
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

async function getDefaultAudioFolders() {
    const url = URL_DOMAIN + "/services/audio/getdefaultaudiofolders"
    esconsole("Fetching default audio folders", ["debug", "audiolibrary"])
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, {cache: true})
        esconsole("Found default audio folders", ["debug", "audiolibrary"])
        return result.data
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

async function getUserAudioFolders() {
    const url = URL_DOMAIN + "/services/audio/getuseraudiofolders"
    esconsole("Fetching all the user audio folders", ["debug", "audiolibrary"])
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, {cache: true})
        esconsole("Found user audio folders", ["debug", "audiolibrary"])
        return result.data
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Get a list of all audio/effect/analysis constants. Note: This is highly inefficient. Prefer using the getDefaultTags API.
export async function getAllTags() {
    esconsole("Fetching all tags", ["debug", "audiolibrary"])
    try {
        const result = await Promise.all([getAudioTags(), getAudioFolders(), getUserAudioTags()])
        return result[0].concat(EFFECT_TAGS, ANALYSIS_TAGS, result[1], result[2])
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Get the list of default (fixed) names except for the audio clips (they are retrieved separately). Used for code compilation.
export async function getDefaultTags() {
    esconsole("Fetching default tags", ["debug", "audiolibrary"])
    try {
        const result = await Promise.all([getDefaultAudioFolders(), getUserAudioFolders()])
        // TODO: "getUserAudioFolders() cannot be cached. Separate it?"
        esconsole("Fetched all tags.", ["debug", "audiolibrary"])
        return EFFECT_TAGS.concat(ANALYSIS_TAGS, result[0], result[1])
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

export async function getDefaultTagsMetadata() {
    esconsole("Fetching default sounds tag metadata", ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/services/audio/getdefaultaudiotags"
    const opts = {cache: true}

    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, opts)
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        SOUND_CACHE = result.data
        return result.data
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function getUserTagsMetadata(username: string) {
    esconsole("Fetching user sounds tag metadata for " + username, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/services/audio/getuseraudiotags"
    const opts = {cache: false, params: {"username": username}}
    const $http = helpers.getNgService("$http")
    try {
        const result = await $http.get(url, opts)
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        SOUND_CACHE = result.data
        return result.data
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function verifyClip(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/services/audio/verifyclip"
    const opts = {
        cache: false,
        params: {
            key: name
        }
    }
    const $http = helpers.getNgService("$http")
    const result = await $http.get(url, opts)
    return result.data.hasOwnProperty("file_key") ? result.data : null
}