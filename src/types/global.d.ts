// A temporary global space for defining types and structs used in our .js files.
// The types here are not checked by the TypeScript compiler, so use them with caution.
// Also, they should be moved to more appropriate locations in .ts files as part of the JS->TS migration.

declare const URL_DOMAIN: string
declare const URL_WEBSOCKET: string
declare const SITE_BASE_URI: string
declare const BUILD_NUM: string
declare const FLAGS: any

declare const difflib: any
declare const diffview: any
declare const droplet: any
declare const Hilitor: any
declare const JSZip: any
declare const lamejs: any
// NOTE: It looks like bringing in d3 types would require upgrading past d3 v3,
// which is a nontrivial undertaking because of significant API changes.
// (I spent some time of this and decided against it; we might just drop the d3 dependency anyway.)
declare const d3: any
declare const Kali: any

declare module "js-interpreter"
declare module "xml2js"
declare module "chance"
declare module "soundcloud"

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

declare module "dsp" {
    const DSP: any
    const FFT: any
    const WindowFunction: any
}

declare module "pitchshiftWorklet" {
    const x: string
    export default x
}

declare module "skulpt"
