import context from "./context"

export const SINE_BUMP = "earcon/sine_bump.flac"

// Helper to load audio buffer to cache and then play it back with a set gain
// Using the existing audiocontext to playback the earcons
const earconCache = new Map<string, AudioBuffer>()

export async function loadEarcon(url: string): Promise<AudioBuffer> {
    const resolvedUrl = `${SITE_BASE_URI}/${url}`
    if (earconCache.has(resolvedUrl)) {
        return earconCache.get(resolvedUrl)!
    }

    const response = await fetch(resolvedUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(arrayBuffer)

    earconCache.set(resolvedUrl, audioBuffer)
    return audioBuffer
}

export async function playEarcon(url: string, volume: number = 0.5) {
    try {
        const buffer = await loadEarcon(url)
        const source = context.createBufferSource()
        const gainNode = context.createGain()

        source.buffer = buffer
        gainNode.gain.value = volume

        source.connect(gainNode)
        gainNode.connect(context.destination)

        source.start(0)
    } catch (error) {
        console.error("Failed to play earcon:", error)
    }
}
