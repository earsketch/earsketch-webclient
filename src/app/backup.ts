// Export/import logic for local backup (.earsketch ZIP files).
import JSZip from "jszip"
import { Script, SoundEntity } from "common"
import * as localSoundStorage from "../audio/localSoundStorage"
import * as scriptsState from "../browser/scriptsState"
import { getLocalUserSounds } from "../browser/soundsThunks"
import store from "../reducers"

const LAST_EXPORT_KEY = "earsketch_last_export"
const SESSION_EXPORTED_KEY = "earsketch_session_exported"
const MANIFEST_VERSION = 1

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

export const MANIFEST_VERSION_CURRENT = MANIFEST_VERSION

export interface ParsedBackup {
    scripts: { manifest: ManifestScript; source: string }[]
    sounds: { manifest: ManifestSound; audioData: ArrayBuffer }[]
}

const dummyAnchor = document.createElement("a")
document.body.appendChild(dummyAnchor)
dummyAnchor.style.display = "none"

function triggerDownload(name: string, blob: Blob) {
    const url = URL.createObjectURL(blob)
    dummyAnchor.href = url
    dummyAnchor.download = name
    dummyAnchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function todayString() {
    return new Date().toISOString().slice(0, 10)
}

export async function exportBackup(): Promise<void> {
    const state = store.getState()
    const activeScripts = Object.values(scriptsState.selectActiveScripts(state))
    const localSounds = await localSoundStorage.getAllSounds()

    const zip = new JSZip()

    const manifestScripts: ManifestScript[] = []
    for (const script of activeScripts) {
        const filename = `scripts/${script.name}`
        zip.file(filename, script.source_code)
        manifestScripts.push({
            filename,
            name: script.name,
            created: script.created ?? "",
            modified: script.modified ?? "",
        })
    }

    const manifestSounds: ManifestSound[] = []
    for (const sound of localSounds) {
        const ext = detectExtension(sound.audioData)
        const filename = `sounds/${sound.name}${ext}`
        zip.file(filename, sound.audioData)
        manifestSounds.push({
            filename,
            name: sound.name,
            metadata: sound.metadata,
        })
    }

    const manifest: Manifest = {
        version: MANIFEST_VERSION,
        exportedAt: new Date().toISOString(),
        scripts: manifestScripts,
        sounds: manifestSounds,
    }
    zip.file("manifest.json", JSON.stringify(manifest, null, 2))

    const blob = await zip.generateAsync({ type: "blob" })
    triggerDownload(`earsketch-backup-${todayString()}.earsketch`, blob)
    setLastExportTime()
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

export async function parseBackup(file: File): Promise<ParsedBackup> {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())

    const manifestFile = zip.file("manifest.json")
    if (!manifestFile) throw new Error("Invalid backup: missing manifest.json")
    const manifest: Manifest = JSON.parse(await manifestFile.async("string"))
    if (manifest.version !== MANIFEST_VERSION) throw new Error(`Unsupported backup version: ${manifest.version}`)

    const scripts: ParsedBackup["scripts"] = []
    for (const entry of manifest.scripts) {
        const f = zip.file(entry.filename)
        if (!f) continue
        const source = await f.async("string")
        scripts.push({ manifest: entry, source })
    }

    const sounds: ParsedBackup["sounds"] = []
    for (const entry of manifest.sounds) {
        const f = zip.file(entry.filename)
        if (!f) continue
        const audioData = await f.async("arraybuffer")
        sounds.push({ manifest: entry, audioData })
    }

    return { scripts, sounds }
}

export async function importBackup(
    parsed: ParsedBackup,
    options: { onConflict: (name: string) => "rename" | "skip" }
): Promise<{ scriptCount: number; soundCount: number }> {
    const state = store.getState()
    const existing = scriptsState.selectRegularScripts(state)

    let scriptCount = 0
    const newScripts = { ...existing }

    for (const { manifest, source } of parsed.scripts) {
        let name = manifest.name
        const conflicting = Object.values(existing).find(s => s.name === name && !s.soft_delete)
        if (conflicting) {
            const action = options.onConflict(name)
            if (action === "skip") continue
            // rename: append _1, _2, ...
            name = scriptsState.selectNextScriptName(state, name)
        }

        const id = `local/${Date.now()}-${Math.random().toString(36).slice(2)}`
        newScripts[id] = {
            shareid: id,
            name,
            source_code: source,
            username: "",
            created: manifest.created as string,
            modified: manifest.modified as string,
            saved: true,
            tooltipText: "",
        } as unknown as Script
        scriptCount++
    }
    store.dispatch(scriptsState.setRegularScripts(newScripts))

    let soundCount = 0
    for (const { manifest, audioData } of parsed.sounds) {
        await localSoundStorage.storeSound(manifest.name, audioData, manifest.metadata)
        soundCount++
    }
    if (soundCount > 0) {
        store.dispatch(getLocalUserSounds())
    }

    return { scriptCount, soundCount }
}

export function getLastExportTime(): number | null {
    const val = localStorage.getItem(LAST_EXPORT_KEY)
    return val !== null ? parseInt(val, 10) : null
}

export function setLastExportTime(): void {
    const now = Date.now()
    localStorage.setItem(LAST_EXPORT_KEY, String(now))
    sessionStorage.setItem(SESSION_EXPORTED_KEY, "1")
}

export function hasExportedThisSession(): boolean {
    return sessionStorage.getItem(SESSION_EXPORTED_KEY) === "1"
}
