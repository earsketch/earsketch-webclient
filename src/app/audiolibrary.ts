// Fetch audio and metadata from the EarSketch library.
import ctx from "../audio/context"
import { SoundEntity } from "common"
import esconsole from "../esconsole"
import { getAuth } from "../request"

const STATIC_AUDIO_URL_DOMAIN = URL_DOMAIN === "https://api.ersktch.gatech.edu/EarSketchWS"
    ? "https://earsketch.gatech.edu/backend-static"
    : "https://earsketch-test.ersktch.gatech.edu/backend-static"

export type Sound = SoundEntity & { buffer: AudioBuffer }

// NOTE: We always fetch sound metadata before fetching audio,
// but sometimes we fetch metadata *without* fetching audio.
// This is why `metadata` is required but `buffer` is optional.
interface SoundPromises {
    metadata: Promise<SoundEntity | null>
    buffer?: Promise<AudioBuffer>
}

export const cache = {
    // We cache promises (rather than results) so we don't launch a second request while waiting on the first request.
    standardSounds: null as Promise<{ sounds: SoundEntity[], folders: string[] }> | null,
    sounds: Object.create(null) as { [key: string]: SoundPromises },
}

// Get an audio buffer from a file key.
//   filekey: The constant associated with the audio clip that users type in EarSketch code.
//   tempo: Tempo to scale the returned clip to.
export async function getSound(name: string): Promise<Sound> {
    // Start by getting the sound metadata.
    getMetadata(name)
    const cached = cache.sounds[name]

    if (!cached.buffer) {
        // A request for the sound metadata is already in progress or complete;
        // now we just need to take on a request for the sound buffer.
        cached.buffer = cached.metadata.then(sound => {
            if (sound === null) {
                throw new ReferenceError(`Sound ${name} does not exist`)
            }
            return getSoundBuffer(sound)
        }).catch(error => {
            // Request failed. Remove from cache so future requests can try again.
            cached.buffer = undefined
            throw error
        })
    }

    const buffer = await cached.buffer
    return {
        ...(await cached.metadata)!,
        buffer,
    }
}

async function getSoundBuffer(sound: SoundEntity) {
    const url = sound.standard
        ? STATIC_AUDIO_URL_DOMAIN + "/" + sound.path
        : URL_DOMAIN + "/audio/sample?" + new URLSearchParams({ name: sound.name })

    let data: ArrayBuffer
    try {
        data = await (await fetch(url)).arrayBuffer()
    } catch (err: any) {
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

    // Decode the audio data.
    esconsole(`Decoding ${name} buffer`, ["debug", "audiolibrary"])
    let buffer: AudioBuffer
    try {
        // Using decodeAudioData's newer promise-based syntax (requires Safari 14.1+)
        // See https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#browser_compatibility
        buffer = await ctx.decodeAudioData(data)
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

    return buffer
}

export function clearCache() {
    esconsole("Clearing the cache", ["debug", "audiolibrary"])
    cache.standardSounds = null
    cache.sounds = {} // this might be overkill, but otherwise deleted / renamed sound cache is still accessible
}

export function getStandardSounds() {
    // Cache hit. A request for this data is already in-progress/complete.
    const promiseFromCache = cache.standardSounds
    if (promiseFromCache) return promiseFromCache

    // Cache miss. Store promise immediately to prevent new duplicate requests.
    const promise = _getStandardSounds()
    cache.standardSounds = promise

    return promise.catch(error => {
        // Request failed. Remove from cache so future requests can try again.
        cache.standardSounds = null
        throw error
    })
}

async function _getStandardSounds() {
    esconsole("Fetching standard sound metadata", ["debug", "audiolibrary"])
    try {
        const url = STATIC_AUDIO_URL_DOMAIN + "/audio-standard.json"
        const response = await fetch(url)
        if (!response.ok) {
            throw Object.assign(new Error(`Failed to fetch standard sounds (code ${response.status}).`), { code: response.status })
        }
        let sounds: SoundEntity[] = await response.json()
        const folders = [...new Set(sounds.map(entity => entity.folder))]
        esconsole(`Fetched ${Object.keys(sounds).length} sounds in ${folders.length} folders`, ["debug", "audiolibrary"])
        // Populate cache with standard sound metadata so that we don't fetch it again later via `getMetadata()`.
        for (const sound of sounds) {
            fixMetadata(sound, true)
            if (!cache.sounds[sound.name]) {
                cache.sounds[sound.name] = { metadata: Promise.resolve(sound) }
            }
        }
        // Filter out "non-public" sounds so that they don't appear in the sound browser, autocomplete, etc.
        // Note that we still cache their metadata above; this just prevents them from appearing in the standard set.)
        sounds = sounds.filter(sound => sound.public)
        return { sounds, folders }
    } catch (err: any) {
        esconsole("HTTP status: " + err.status, ["error", "audiolibrary"])
        throw err
    }
}

export async function getUserSounds(username: string) {
    // The /audio/user depricated query parameter `username` is maintained, for now, until the backend is updated.
    const sounds: SoundEntity[] = await getAuth("/audio/user", { username })
    // Populate cache with user sound metadata so that we don't fetch it again later via `getMetadata()`.
    for (const sound of sounds) {
        fixMetadata(sound, false)
        if (!cache.sounds[sound.name]) {
            cache.sounds[sound.name] = { metadata: Promise.resolve(sound) }
        }
    }
    return sounds
}

export async function getMetadata(name: string) {
    esconsole("Verifying the presence of audio clip for " + name, ["debug", "audiolibrary"])
    let cached = cache.sounds[name]
    if (cached === undefined) {
        // Cache miss. Store promise immediately to prevent new duplicate requests.
        cached = cache.sounds[name] = { metadata: _getMetadata(name) }
    }
    return cached.metadata
}

async function _getMetadata(name: string) {
    const url = URL_DOMAIN + "/audio/metadata?" + new URLSearchParams({ name })
    const response = await fetch(url)
    const text = await response.text()
    if (!text) {
        // Server returns 200 OK + empty string for invalid keys, which breaks JSON parsing.
        // TODO: Server should return a more reasonable response. (Either an HTTP error code or a valid JSON object such as `null`.)
        return null
    }
    const metadata: SoundEntity = JSON.parse(text)
    if (!("name" in metadata)) {
        // TODO: do we still need this check? seems like this should never happen
        return null
    }

    fixMetadata(metadata, false)
    return metadata
}

function fixMetadata(metadata: SoundEntity, standard: boolean) {
    // Server uses -1 to indicate no tempo; for type safety, we remap this to undefined.
    if (metadata.tempo === -1) {
        metadata.tempo = undefined
    }
    metadata.standard = standard
    return metadata
}
