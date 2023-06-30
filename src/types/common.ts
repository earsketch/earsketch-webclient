/* eslint-disable camelcase */
export interface Script {
    name: string
    shareid: string
    source_code: string
    username: string
    created: number | string
    modified: number | string
    license_id?: number
    saved: boolean
    tooltipText: string
    collaborative: boolean
    collaborators: string[]
    isShared: boolean
    run_status: number
    readonly: boolean
    creator: string
    file_location?: string
    id?: string
    original_id?: string
    description?: string
    soft_delete?: boolean
    activeUsers?: string | string[]
}

// Note: How about collaborative?
export type ScriptType = "regular" | "shared" | "readonly" | "deleted";

export type Language = "python" | "javascript"

export interface SoundEntity {
    name: string
    genreGroup: string
    path: string
    folder: string
    artist: string
    year: string
    public: number
    genre: string
    instrument: string
    keySignature?: string
    keyConfidence?: number
    // TODO: Server should omit or set to null to indicate no tempo, rather than -1.
    tempo?: number
}

export interface Clip {
    filekey: string
    loopChild: boolean
    measure: number
    start: number
    end: number
    audio: AudioBuffer
    sourceAudio: AudioBuffer
    silence: number
    track: number
    tempo?: number
    loop: boolean
    scale: number
}

export interface EffectRange {
    name: string
    parameter: string
    startMeasure: number
    endMeasure: number
    startValue: number
    endValue: number
    track: number
}

export interface Automation {
    effect: string
    parameter: string
    ranges: EffectRange[]
    points: { measure: number, value: number, shape: "square" | "linear" }[]
    bypass?: boolean
}

export interface Track {
    clips: Clip[]
    effects: { [key: string]: Automation }
    label?: string | number
    visible?: boolean
    buttons?: boolean
    mute?: boolean
}

export interface ClipSlice {
    sourceFile: string
    start: number
    end: number
}

export interface DAWData {
    length: number
    tracks: Track[]
    slicedClips: { [key: string]: ClipSlice }
}
