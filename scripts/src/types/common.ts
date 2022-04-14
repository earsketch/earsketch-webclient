/* eslint-disable camelcase */
export interface Script {
    name: string
    shareid: string
    source_code: string
    username: string
    created: number | string
    modified: number | string
    licenseInfo: string
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
