// Pure manifest format definitions, shared between local zip backup and
// remote sync. Kept dependency-free so it can be imported in tests.
import type { SoundEntity } from "common"

export const MANIFEST_VERSION = 1

export interface ManifestScript {
    filename: string
    name: string
    created: string | number
    modified: string | number
}

export interface ManifestSound {
    filename: string
    name: string
    metadata: SoundEntity
}

export interface Manifest {
    version: number
    exportedAt: string
    scripts: ManifestScript[]
    sounds: ManifestSound[]
}

export function detectExtension(data: ArrayBuffer): string {
    const bytes = new Uint8Array(data.slice(0, 4))
    // FLAC: fLaC
    if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) return ".flac"
    // WAV: RIFF
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return ".wav"
    // MP3: ID3 or sync
    if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || bytes[0] === 0xff) return ".mp3"
    return ".bin"
}
