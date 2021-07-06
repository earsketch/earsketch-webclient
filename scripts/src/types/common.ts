export interface Script {
    name: string
    shareid: string
    source_code: string
    username: string
    created: number | string
    modified: number | string
    licenseInfo: string
    license_id: string
    saved: boolean
    tooltipText: string
    collaborative: boolean
    collaborators: string[]
    imported: boolean
    isShared: boolean
    run_status: number
    readonly: boolean
    creator: string
    file_location?: string
    id?: string
    original_id?: string
    description?: string
    // TODO: The server should never return a string for this... but various endpoints do, such as /services/scripts/save.
    soft_delete?: boolean | string
    activeUsers?: string | string[]
}

// Note: How about collaborative?
export type ScriptType = 'regular' | 'shared' | 'readonly' | 'deleted';

export interface SoundEntity {
    file_key: string,
    genregroup: string,
    file_location: string,
    folder: string,
    artist: string,
    year: string,
    scope: number,
    genre: string,
    tempo: number,
    instrument: string,
    tags: string
}
