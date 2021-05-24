
// Fetch audio clips and metadata from the EarSketch library.
// TODO: Fix this module's nomenclature problem, between "tags", "folders", "keys", and "tag metadata".
import ctx from "./audiocontext"
import esconsole from "../esconsole"

type AugmentedBuffer = AudioBuffer & { filekey: string }

export const cache = {
    audioTags: null as string[] | null,
    userAudioTags: null as string[] | null,
    audioFolders: null as string[] | null,
    defaultAudioFolders: null as string[] | null,
    userAudioFolders: null as string[] | null,
    defaultTags: null as string[] | null,
    userTags: {} as { [key: string]: string[] | undefined },
    sounds: [] as any[],
    // Eliminate this: individual promises cache their results.
    clips: {} as { [key: string]: any },
    slicedClips: {} as { [key: string]: AugmentedBuffer },
    promises: {} as { [key: string]: Promise<any> },
}

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

    if (cacheKey in cache.promises) {
        return cache.promises[cacheKey]
    } else {
        return cache.promises[cacheKey] = _getAudioClip(filekey, tempo, quality)
    }
}

async function _getAudioClip(filekey: string, tempo: number, quality: boolean) {
    const cacheKey = [filekey, tempo, quality].toString()

    if (cacheKey in cache.clips) {
        return cache.clips[cacheKey]
    } else if (cacheKey in cache.slicedClips) {
        const slicedBuffer = cache.slicedClips[cacheKey]
        slicedBuffer.filekey = filekey
        return slicedBuffer
    }

    esconsole("Loading audio clip with filekey: " + filekey, ["debug", "audiolibrary"])
    const params = FLAGS.USE_CLIENT_TS ? {
        key: filekey
    } : {
        key: filekey,
        tempo: tempo,
        audioquality: quality ? 1 : 0
    } as { [key: string]: any }
    const url = (FLAGS.USE_CLIENT_TS ? URL_DOMAIN+"/services/audio/getunstretchedsample" : URL_LOADAUDIO) + "?" + new URLSearchParams(params)
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
    let data
    try {
        data = await (await fetch(url)).arrayBuffer()
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
        buffer = await ctx.decodeAudioData(data)
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
        cache.clips[cacheKey] = buffer
    }
    // add a filekey property to the buffer so we can
    // figure out where it came from later
    (buffer as AugmentedBuffer).filekey = filekey
    // remove this promise from the cache since it"s
    // been resolved
    delete cache.promises[cacheKey]

    esconsole("Returning buffer", ["debug", "audiolibrary"])
    return buffer
}

export function cacheSlicedClip(fileKey: string, tempo: number, quality: boolean, buffer: AugmentedBuffer) {
    cache.slicedClips[[fileKey, tempo, quality].toString()] = buffer
}

// Get the list of audio tag names. (TODO: Doesn't this return a list of file keys?)
export async function getAudioTags() {
    if (cache.audioTags !== null) {
        return cache.audioTags
    }
    const url = URL_DOMAIN + "/services/audio/getaudiotags"
    esconsole("Fetching audio tags", ["debug", "audiolibrary"])
    try {
        const data = await (await fetch(url)).json()
        const output = []
        for (const key in data.audioTags) {
            const tag = data.audioTags[key]
            output.push(tag.file_key)
        }
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return cache.audioTags = output
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Get the list of ALL user-submitted audio tags. (TODO: Doesn't this return a list of file keys?)
export async function getUserAudioTags() {
    if (cache.userAudioTags !== null) {
        return cache.userAudioTags
    }
    const url = URL_DOMAIN + "/services/audio/getaudiokeys?tag="
    esconsole("Fetching audio keys", ["debug", "audiolibrary"])
    try {
        const data = await (await fetch(url)).json()
        const output = []
        for (const key in data.smallAudioFile) {
            const tag = data.smallAudioFile[key]
            output.push(tag.file_key)
        }
        esconsole("Found audio keys", ["debug", "audiolibrary"])
        return cache.userAudioTags = output
    } catch (err) {
        esconsole(err, ["error", "audiolibrary"])
        throw err
    }
}

// Clears the audio tag cache.
export function clearAudioTagCache() {
    esconsole("Clearing the audio tag cache", ["debug", "audiolibrary"])
    cache.audioTags = null
    cache.userAudioTags = null
    cache.audioFolders = null
    cache.defaultAudioFolders = null
    cache.userAudioFolders = null
    cache.defaultTags = null
    cache.userTags = {}
    cache.sounds = []
    cache.clips = []  // this might be overkill, but otherwise deleted / renamed clip cache is still accessible
}

// Get a list of folder keys. NOTE: This is very inefficient. Prefer using getDefaultAudioFolders and getUserAudioFolders WS.
export async function getAudioFolders() {
    if (cache.audioFolders !== null) {
        return cache.audioFolders
    }
    esconsole("Fetching audio folders", ["debug", "audiolibrary"])
    try {
        const data = await (await fetch(URL_DOMAIN + "/services/audio/getaudiokeys?tag=")).json()
        // return only a list of file keys
        const output = []
        for (const file of Object.values(data.smallAudioFile) as any[]) {
            if (file.scope === 0) continue
            const str = file.tags.toUpperCase()
            const tokens = str.split("__")
            // TODO: this token business is confusing
            output.push(tokens[0])
            output.push(tokens[tokens.length-1])
            output.push(str.substr(str.indexOf("__") + 2, str.length))
        }
        esconsole("Found audio folders", ["debug", "audiolibrary"])
        return cache.audioFolders = output
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
        const data = await (await fetch(URL_DOMAIN + "/services/audio/getdefaultaudiofolders")).json()
        esconsole("Found default audio folders", ["debug", "audiolibrary"])
        return cache.defaultAudioFolders = data
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
        const data = await (await fetch(URL_DOMAIN + "/services/audio/getuseraudiofolders")).json()
        esconsole("Found user audio folders", ["debug", "audiolibrary"])
        return cache.userAudioFolders = data
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
        // Old comment; still relevant? "TODO: getUserAudioFolders() cannot be cached. Separate it?"
        esconsole("Fetched all tags.", ["debug", "audiolibrary"])
        return EFFECT_TAGS.concat(ANALYSIS_TAGS, result[0], result[1])
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
        const data = await (await fetch(URL_DOMAIN + "/services/audio/getdefaultaudiotags")).json()
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return cache.defaultTags = cache.sounds = data
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function getUserTagsMetadata(username: string) {
    if (cache.userTags[username] !== undefined) {
        return cache.userTags[username]
    }
    esconsole("Fetching user sounds tag metadata for " + username, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/services/audio/getuseraudiotags?" + new URLSearchParams({ username })
    try {
        const data = await (await fetch(url)).json()
        esconsole("Found audio tags", ["debug", "audiolibrary"])
        return cache.userTags[username] = cache.sounds = data
    } catch (err) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function verifyClip(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    const url = URL_DOMAIN + "/services/audio/verifyclip?" + new URLSearchParams({ key: name })
    const response = await fetch(url)
    const text = await response.text()
    if (!text) {
        // Server returns 200 OK + empty string for invalid keys, which breaks JSON parsing.
        // TODO: Server should return a more reasonable response. (Either an HTTP error code or a valid JSON object such as `null`.)
        return null
    }
    const data = JSON.parse(text)
    return "file_key" in data ? data : null
}