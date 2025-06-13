/* eslint-disable camelcase */
export interface Script {
    name: string
    shareid: string
    source_code: string
    username: string
    created: number | string
    modified: number | string
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
    public: number // Should this appear in the sound browser, autocomplete, etc.?
    genre: string
    instrument: string
    keySignature?: string
    keyConfidence?: number
    tempo?: number // TODO: Server should omit or set to null to indicate no tempo, rather than -1.
    standard: boolean // Is this a standard sound (as opposed to a user sound)? (client-only flag)
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
    sourceLine: number
}

export type TransformedClip = SlicedClip | StretchedClip

export interface SlicedClip {
    kind: "slice",
    sourceKey: string,
    start: number,
    end: number,
}

export interface StretchedClip {
    kind: "stretch",
    sourceKey: string,
    stretchFactor: number,
}

interface AutomationPoint {
    measure: number
    value: number
    shape: "square" | "linear"
    sourceLine: number
}

export type Effect = { [key: string]: Envelope }

export type Envelope = AutomationPoint[]

export interface Track {
    clips: Clip[]
    effects: { [key: string]: Effect }
    label?: string | number
    visible?: boolean
    buttons?: boolean
    mute?: boolean
}

export interface DAWData {
    length: number
    tracks: Track[]
    transformedClips: { [key: string]: TransformedClip }
}
