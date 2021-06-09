export interface ScriptEntity {
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
    collaborators: any // Should be string[] but server can give other data types such as undefined and string
    imported: boolean
    isShared: boolean
    run_status: string
    readonly: boolean
    creator: string
    file_location?: string
    id?: string
    original_id?: string
    description?: string
    soft_delete?: boolean | string
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