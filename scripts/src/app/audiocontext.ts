// Create a single AudioContext that can be used across modules.

// Workaround for pre-14.1 Safari:
declare global {
    interface Window {
      webkitAudioContext: typeof window.AudioContext
      webkitOfflineAudioContext: typeof window.OfflineAudioContext
    }
}

export const AudioContext = window.AudioContext || window.webkitAudioContext
export const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext

export const context = new AudioContext({
    latencyHint: 'interactive',
    sampleRate: 44100,
})

export default context

// Old comment; is this still relevant?
// "this is a hack to keep the audio context from ever suspending
//  For some reason, Firefox will randomly suspend it and"
context.onstatechange = () => {
    if (context.state === "suspended") {
        context.resume()
    }
}

