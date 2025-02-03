// A temporary global space for defining types and structs used in our .js files.
// The types here are not checked by the TypeScript compiler, so use them with caution.
// Also, they should be moved to more appropriate locations in .ts files as part of the JS->TS migration.

declare const URL_DOMAIN: string
declare const URL_WEBSOCKET: string
declare const SITE_BASE_URI: string
declare const BUILD_NUM: string
declare const FLAGS: any

declare const difflib: any
declare const Hilitor: any
declare const JSZip: any
declare const lamejs: any
declare const Kali: any

declare module "d3"
declare module "droplet"
declare module "js-interpreter"
declare module "chance"
declare module "@lib/jsdifflib/diffview"

declare const createAudioMeter: (audioContext: AudioContext, clipLevel: number, averaging: number, clipLag: number) => AudioNode
declare const Recorder: any

declare module "@webscopeio/react-textarea-autocomplete"

declare module "file-loader!*" {
    const value: any
    export default value
}

declare module "*.svg" {
    const content: any
    export default content
}

declare module "*.png" {
    const content: any
    export default content
}

declare module "@lib/dsp" {
    const DSP: any
    const FFT: any
    const WindowFunction: any
}

declare module "pitchshiftWorklet" {
    const x: string
    export default x
}

declare module "recorderWorker" {
    const x: string
    export default x
}

declare module "*audiokeys_recommendations.json" {
    const x: string
    export default x
}

declare module "*beat_similarity_indices.json" {
    const x: string
    export default x
}

declare module "*beat_timestamps.json" {
    const x: string
    export default x
}

declare module "skulpt"
