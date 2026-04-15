import { Script } from "common"
import * as localSoundStorage from "../audio/localSoundStorage"
import { Scripts } from "../browser/scriptsState"
import {
    Manifest,
    ManifestScript,
    ManifestSound,
    MANIFEST_VERSION_CURRENT,
    detectExtension,
} from "../app/backup"

// --- Interface ---

export interface SyncFileInfo {
    path: string
    modifiedTime: number // ms epoch
    size?: number // bytes
}

export interface SyncBackend {
    readonly kind: "drive" | "fsa"
    isAvailable(): boolean
    isConnected(): boolean
    connect(): Promise<void>
    disconnect(): void

    writeFile(path: string, data: string | ArrayBuffer): Promise<void>
    readFile(path: string): Promise<ArrayBuffer | null>
    deleteFile(path: string): Promise<void>
    listFiles(): Promise<SyncFileInfo[]>
    /** Remove all sync data, including any empty directories created during sync. */
    clearAll(): Promise<void>
}

// --- Path helpers ---

export const MANIFEST_PATH = "manifest.json"

/** Replace characters that aren't safe in filesystem paths. */
function sanitize(name: string): string {
    return name.replace(/[/\\:*?"<>|]/g, "_")
}

export function scriptPath(name: string): string {
    return `scripts/${sanitize(name)}`
}

export function soundPath(name: string, audioData: ArrayBuffer): string {
    return `sounds/${sanitize(name)}${detectExtension(audioData)}`
}

// --- Encoding ---

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function encodeText(s: string): ArrayBuffer {
    return encoder.encode(s).buffer as ArrayBuffer
}

// --- Manifest ---

export function buildManifest(
    scripts: Scripts,
    sounds: localSoundStorage.LocalSoundRecord[]
): Manifest {
    const manifestScripts: ManifestScript[] = []
    for (const script of Object.values(scripts)) {
        if (script.soft_delete) continue
        manifestScripts.push({
            filename: scriptPath(script.name),
            name: script.name,
            created: script.created ?? "",
            modified: script.modified ?? "",
        })
    }

    const manifestSounds: ManifestSound[] = []
    for (const sound of sounds) {
        manifestSounds.push({
            filename: soundPath(sound.name, sound.audioData),
            name: sound.name,
            metadata: sound.metadata,
        })
    }

    return {
        version: MANIFEST_VERSION_CURRENT,
        exportedAt: new Date().toISOString(),
        scripts: manifestScripts,
        sounds: manifestSounds,
    }
}

export async function writeManifest(backend: SyncBackend, manifest: Manifest): Promise<void> {
    await backend.writeFile(MANIFEST_PATH, encodeText(JSON.stringify(manifest, null, 2)))
}

export async function readManifest(backend: SyncBackend): Promise<Manifest | null> {
    const data = await backend.readFile(MANIFEST_PATH).catch(() => null)
    if (!data) return null
    try {
        return JSON.parse(decoder.decode(data)) as Manifest
    } catch {
        return null
    }
}

// --- Push helpers ---

export async function pushScriptFile(backend: SyncBackend, script: Script): Promise<void> {
    await backend.writeFile(scriptPath(script.name), encodeText(script.source_code))
}

export async function deleteScriptFile(backend: SyncBackend, name: string): Promise<void> {
    await backend.deleteFile(scriptPath(name)).catch(() => {})
}

export async function pushSoundFile(backend: SyncBackend, name: string): Promise<string | null> {
    const record = await localSoundStorage.getSound(name)
    if (!record) return null
    const path = soundPath(record.name, record.audioData)
    await backend.writeFile(path, record.audioData)
    return path
}

export async function deleteSoundFileByPath(backend: SyncBackend, path: string): Promise<void> {
    await backend.deleteFile(path).catch(() => {})
}

/** Find and delete any sound file with the given base name (unknown extension). */
export async function deleteSoundFileByName(backend: SyncBackend, name: string): Promise<void> {
    const safeName = sanitize(name)
    const files = await backend.listFiles()
    const prefix = `sounds/${safeName}.`
    for (const f of files) {
        if (f.path.startsWith(prefix) || f.path === `sounds/${safeName}`) {
            await backend.deleteFile(f.path).catch(() => {})
        }
    }
}

// --- Pull helper ---

export interface PulledData {
    manifest: Manifest
    scripts: { entry: ManifestScript; source: string }[]
    sounds: { entry: ManifestSound; audioData: ArrayBuffer }[]
}

export async function pullAll(backend: SyncBackend): Promise<PulledData | null> {
    const manifest = await readManifest(backend)
    if (!manifest) return null

    const scriptReads = manifest.scripts.map(async entry => {
        const data = await backend.readFile(entry.filename)
        if (!data) return null
        return { entry, source: decoder.decode(data) }
    })
    const soundReads = manifest.sounds.map(async entry => {
        const data = await backend.readFile(entry.filename)
        if (!data) return null
        return { entry, audioData: data }
    })

    const [scripts, sounds] = await Promise.all([
        Promise.all(scriptReads).then(results => results.filter(r => r !== null) as { entry: ManifestScript; source: string }[]),
        Promise.all(soundReads).then(results => results.filter(r => r !== null) as { entry: ManifestSound; audioData: ArrayBuffer }[]),
    ])

    return { manifest, scripts, sounds }
}
