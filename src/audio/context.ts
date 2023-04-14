// Create a single AudioContext that can be used across modules.
import pitchshiftWorkletURL from "pitchshiftWorklet"

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
    latencyHint: "interactive",
    sampleRate: 44100,
})

// Hack to avoid breaking Karma tests.
// (After much fiddling with configs, I haven't managed to get it to serve this worklet.)
if ((window as any).__karma__ === undefined) {
    context.audioWorklet.addModule(pitchshiftWorkletURL)
}

export default context

// Old comment; is this still relevant?
// "this is a hack to keep the audio context from ever suspending
//  For some reason, Firefox will randomly suspend it and"
context.onstatechange = () => {
    if (context.state === "suspended") {
        context.resume()
    }
}

// For Chrome 66+ web-audio restriction.
// See: https://bugs.chromium.org/p/chromium/issues/detail?id=807017
function resumeAudioContext() {
    if (context.state !== "running") {
        context.resume()
    }
    document.removeEventListener("click", resumeAudioContext)
}

document.addEventListener("click", resumeAudioContext)
