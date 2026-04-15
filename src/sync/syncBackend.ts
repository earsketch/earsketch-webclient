import { Script, SoundEntity } from "common"
import * as localSoundStorage from "../audio/localSoundStorage"
import { Scripts } from "../browser/scriptsState"

// --- Interface ---

export interface SyncFileInfo {
    path: string
    modifiedTime: number // ms epoch
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
}

// --- File path conventions ---

export function scriptPath(shareId: string): string {
    // Sanitize shareId for use as a filename (replace / with _)
    return `scripts/${shareId.replace(/\//g, "_")}.json`
}

export function soundMetaPath(name: string): string {
    return `sounds/${name}.meta.json`
}

export function soundAudioPath(name: string): string {
    return `sounds/${name}.audio`
}

// --- Serialization helpers ---

export interface SerializedScript {
    shareid: string
    name: string
    source_code: string
    username: string
    created: number | string
    modified: number | string
}

export function serializeScript(id: string, script: Script): string {
    const data: SerializedScript = {
        shareid: id,
        name: script.name,
        source_code: script.source_code,
        username: script.username,
        created: script.created,
        modified: script.modified,
    }
    return JSON.stringify(data)
}

export function deserializeScript(json: string): [string, Script] {
    const data: SerializedScript = JSON.parse(json)
    const script: Script = {
        shareid: data.shareid,
        name: data.name,
        source_code: data.source_code,
        username: data.username,
        created: data.created,
        modified: data.modified,
        saved: true,
        tooltipText: "",
        isShared: false,
        run_status: 0,
        readonly: false,
        creator: data.username,
    }
    return [data.shareid, script]
}

export function serializeSoundMeta(entity: SoundEntity): string {
    return JSON.stringify(entity)
}

export function deserializeSoundMeta(json: string): SoundEntity {
    return JSON.parse(json)
}

// --- Push/pull helpers ---

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function pushScripts(backend: SyncBackend, scripts: Scripts): Promise<void> {
    const ops = Object.entries(scripts).map(([id, script]) =>
        backend.writeFile(scriptPath(id), encoder.encode(serializeScript(id, script)).buffer as ArrayBuffer)
    )
    await Promise.all(ops)
}

export async function pushOneScript(backend: SyncBackend, id: string, script: Script): Promise<void> {
    await backend.writeFile(scriptPath(id), encoder.encode(serializeScript(id, script)).buffer as ArrayBuffer)
}

export async function removeOneScript(backend: SyncBackend, id: string): Promise<void> {
    await backend.deleteFile(scriptPath(id))
}

export async function pushOneSound(backend: SyncBackend, name: string): Promise<void> {
    const record = await localSoundStorage.getSound(name)
    if (!record) return
    await Promise.all([
        backend.writeFile(soundMetaPath(name), encoder.encode(serializeSoundMeta(record.metadata)).buffer as ArrayBuffer),
        backend.writeFile(soundAudioPath(name), record.audioData),
    ])
}

export async function removeOneSound(backend: SyncBackend, name: string): Promise<void> {
    await Promise.all([
        backend.deleteFile(soundMetaPath(name)).catch(() => {}),
        backend.deleteFile(soundAudioPath(name)).catch(() => {}),
    ])
}

export async function pushAllSounds(backend: SyncBackend): Promise<void> {
    const records = await localSoundStorage.getAllSounds()
    const ops = records.flatMap(r => [
        backend.writeFile(soundMetaPath(r.name), encoder.encode(serializeSoundMeta(r.metadata)).buffer as ArrayBuffer),
        backend.writeFile(soundAudioPath(r.name), r.audioData),
    ])
    await Promise.all(ops)
}

export async function pullScripts(backend: SyncBackend): Promise<Scripts> {
    const files = await backend.listFiles()
    const scriptFiles = files.filter(f => f.path.startsWith("scripts/") && f.path.endsWith(".json"))

    const scripts: Scripts = {}
    const results = await Promise.all(scriptFiles.map(f => backend.readFile(f.path)))
    for (const data of results) {
        if (!data) continue
        const json = decoder.decode(data)
        const [id, script] = deserializeScript(json)
        scripts[id] = script
    }
    return scripts
}

export async function pullSounds(backend: SyncBackend): Promise<void> {
    const files = await backend.listFiles()
    const metaFiles = files.filter(f => f.path.startsWith("sounds/") && f.path.endsWith(".meta.json"))

    for (const metaFile of metaFiles) {
        const name = metaFile.path.slice("sounds/".length, -".meta.json".length)
        const audioPath = soundAudioPath(name)

        const [metaData, audioData] = await Promise.all([
            backend.readFile(metaFile.path),
            backend.readFile(audioPath),
        ])
        if (!metaData || !audioData) continue

        const metadata = deserializeSoundMeta(decoder.decode(metaData))
        await localSoundStorage.storeSound(name, audioData, metadata)
    }
}
