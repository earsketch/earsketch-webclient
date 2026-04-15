import _ from "lodash"

import store from "../reducers"
import { Script } from "common"
import { selectActiveScripts, selectRegularScripts, setRegularScripts } from "../browser/scriptsState"
import { getLocalUserSounds } from "../browser/soundsThunks"
import * as localSoundStorage from "../audio/localSoundStorage"
import * as ESUtils from "../esutils"
import * as syncState from "./syncState"
import {
    SyncBackend,
    buildManifest,
    writeManifest,
    pullAll,
    pushScriptFile,
    deleteScriptFile,
    pushSoundFile,
    deleteSoundFileByName,
} from "./syncBackend"

let activeBackend: SyncBackend | null = null
let unsubscribeStore: (() => void) | null = null

// Counter of in-flight sync operations. While > 0, the syncing indicator is on.
let activeOps = 0

function beginOp(): void {
    activeOps++
    if (activeOps === 1) {
        store.dispatch(syncState.setSyncing(true))
    }
}

function endOp(): void {
    activeOps = Math.max(0, activeOps - 1)
    if (activeOps === 0) {
        store.dispatch(syncState.setSyncing(false))
        store.dispatch(syncState.setLastSyncTime(Date.now()))
    }
}

async function trackOp<T>(promise: Promise<T>): Promise<T> {
    beginOp()
    try {
        return await promise
    } finally {
        endOp()
    }
}

export function getActiveBackend(): SyncBackend | null {
    return activeBackend
}

// --- Manifest update (debounced) ---

const debouncedManifestUpdate = _.debounce(async () => {
    if (!activeBackend) return
    beginOp()
    try {
        const scripts = selectActiveScripts(store.getState())
        const sounds = await localSoundStorage.getAllSounds()
        const manifest = buildManifest(scripts, sounds)
        await writeManifest(activeBackend, manifest)
    } catch {
        // Swallow — the manifest will get rewritten on the next change.
    } finally {
        endOp()
    }
}, 1000)

function scheduleManifestUpdate(): void {
    debouncedManifestUpdate()
}

// --- Connect / disconnect ---

export async function connectBackend(backend: SyncBackend): Promise<void> {
    store.dispatch(syncState.setBackendKind(backend.kind))
    store.dispatch(syncState.setStatus("connecting"))

    try {
        await backend.connect()
    } catch (err: any) {
        store.dispatch(syncState.setError(err.message ?? "Connection failed"))
        throw err
    }

    activeBackend = backend
    store.dispatch(syncState.setStatus("connected"))

    await mergeAll()
    startWatching()
}

export function disconnectBackend(): void {
    stopWatching()
    debouncedManifestUpdate.cancel()
    if (activeBackend) {
        activeBackend.disconnect()
        activeBackend = null
    }
    store.dispatch(syncState.resetSync())
}

// --- Merge (pull missing remote, push all local) ---

async function mergeAll(): Promise<void> {
    if (!activeBackend) return
    beginOp()
    try {
        const pulled = await pullAll(activeBackend)

        // Snapshot local state before mutation.
        const originalLocalScripts = selectRegularScripts(store.getState())
        const originalLocalSoundNames = new Set(
            (await localSoundStorage.getAllSounds()).map(s => s.name)
        )

        // Script merge: remote wins name; local with same name (different content) is renamed.
        if (pulled) {
            const remoteByName = new Map<string, { entry: typeof pulled.scripts[0]["entry"]; source: string }>()
            for (const s of pulled.scripts) {
                remoteByName.set(s.entry.name, s)
            }
            const localByName = new Map<string, Script>()
            for (const s of Object.values(originalLocalScripts)) {
                if (!s.soft_delete) localByName.set(s.name, s)
            }

            const merged: typeof originalLocalScripts = {}
            const takenNames = new Set<string>()

            // First pass: add remote scripts under their names.
            for (const { entry, source } of pulled.scripts) {
                const localMatch = localByName.get(entry.name)
                if (localMatch && localMatch.source_code === source) {
                    // Identical content — keep the existing local entry (preserves ID, saved state, etc).
                    merged[localMatch.shareid] = localMatch
                    takenNames.add(localMatch.name)
                } else {
                    const id = `local/${Date.now()}-${Math.random().toString(36).slice(2)}`
                    merged[id] = {
                        shareid: id,
                        name: entry.name,
                        source_code: source,
                        username: "",
                        created: entry.created,
                        modified: entry.modified,
                        saved: true,
                        tooltipText: "",
                        isShared: false,
                        run_status: 0,
                        readonly: false,
                        creator: "",
                    }
                    takenNames.add(entry.name)
                }
            }

            // Second pass: add local-only scripts, renaming any that conflict.
            for (const script of Object.values(originalLocalScripts)) {
                if (script.soft_delete) continue
                if (merged[script.shareid]) continue // already added
                const remoteMatch = remoteByName.get(script.name)
                if (remoteMatch && remoteMatch.source !== script.source_code) {
                    // Name conflict with different content — rename local.
                    const newName = nextAvailableName(script.name, takenNames)
                    merged[script.shareid] = { ...script, name: newName }
                    takenNames.add(newName)
                } else if (!remoteMatch) {
                    merged[script.shareid] = script
                    takenNames.add(script.name)
                }
                // else: same name + same content handled in first pass
            }

            store.dispatch(setRegularScripts(merged))

            // Pull remote sounds not already present locally.
            for (const { entry, audioData } of pulled.sounds) {
                if (!originalLocalSoundNames.has(entry.name)) {
                    await localSoundStorage.storeSound(entry.name, audioData, entry.metadata)
                }
            }
            store.dispatch(getLocalUserSounds())

            // Push renamed + local-only scripts to remote.
            // No deletions: remote files we pulled are all legitimate. When we rename a
            // local script to resolve a conflict, the remote keeps its name (and content);
            // we just add the renamed local script as a new file.
            for (const script of Object.values(merged)) {
                const wasRemote = pulled.scripts.some(p => p.entry.name === script.name && p.source === script.source_code)
                if (!wasRemote) {
                    await pushScriptFile(activeBackend, script)
                }
            }
        } else {
            // No remote manifest — push everything local as the initial state.
            for (const script of Object.values(originalLocalScripts)) {
                if (!script.soft_delete) {
                    await pushScriptFile(activeBackend, script)
                }
            }
        }

        // Push all local sounds (upsert; remote sounds with the same name were skipped on pull).
        const allSounds = await localSoundStorage.getAllSounds()
        for (const sound of allSounds) {
            await pushSoundFile(activeBackend, sound.name)
        }

        // Write the manifest reflecting the final merged state.
        const finalScripts = selectActiveScripts(store.getState())
        const manifest = buildManifest(finalScripts, allSounds)
        await writeManifest(activeBackend, manifest)
    } catch (err: any) {
        store.dispatch(syncState.setError(err.message ?? "Sync failed"))
    } finally {
        endOp()
    }
}

/** Append _1, _2, ... to a filename's base until it's unique. Mirrors selectNextScriptName. */
function nextAvailableName(name: string, taken: Set<string>): string {
    if (!taken.has(name)) return name
    const base = ESUtils.parseName(name)
    const ext = ESUtils.parseExt(name)
    let counter = 1
    let candidate = `${base}_${counter}${ext}`
    while (taken.has(candidate)) {
        counter++
        candidate = `${base}_${counter}${ext}`
    }
    return candidate
}

// --- Change watching ---

// Previous script state (for diffing): id -> { name, source_code }
const prevScriptState = new Map<string, { name: string; source_code: string }>()

// Per-script debounced file writers.
const debouncedWriters = new Map<string, ReturnType<typeof _.debounce>>()

function getDebouncedWriter(id: string): ReturnType<typeof _.debounce> {
    let fn = debouncedWriters.get(id)
    if (!fn) {
        fn = _.debounce((script: Script, oldName: string | null) => {
            if (!activeBackend) return
            trackOp((async () => {
                if (oldName && oldName !== script.name) {
                    await deleteScriptFile(activeBackend!, oldName)
                }
                await pushScriptFile(activeBackend!, script)
                scheduleManifestUpdate()
            })()).catch(() => {})
        }, 500)
        debouncedWriters.set(id, fn)
    }
    return fn
}

function startWatching(): void {
    prevScriptState.clear()
    for (const [id, script] of Object.entries(selectActiveScripts(store.getState()))) {
        prevScriptState.set(id, { name: script.name, source_code: script.source_code })
    }

    unsubscribeStore = store.subscribe(() => {
        if (!activeBackend) return
        const currentScripts = selectActiveScripts(store.getState())

        // Detect changes and renames.
        for (const [id, script] of Object.entries(currentScripts)) {
            const prev = prevScriptState.get(id)
            if (!prev || prev.source_code !== script.source_code || prev.name !== script.name) {
                const oldName = prev?.name ?? null
                getDebouncedWriter(id)(script, oldName !== script.name ? oldName : null)
                prevScriptState.set(id, { name: script.name, source_code: script.source_code })
            }
        }

        // Detect deletions.
        for (const id of Array.from(prevScriptState.keys())) {
            if (!(id in currentScripts)) {
                const prev = prevScriptState.get(id)!
                prevScriptState.delete(id)
                const writer = debouncedWriters.get(id)
                if (writer) {
                    writer.cancel()
                    debouncedWriters.delete(id)
                }
                trackOp(deleteScriptFile(activeBackend!, prev.name)).catch(() => {})
                scheduleManifestUpdate()
            }
        }
    })
}

function stopWatching(): void {
    if (unsubscribeStore) {
        unsubscribeStore()
        unsubscribeStore = null
    }
    for (const fn of debouncedWriters.values()) {
        fn.cancel()
    }
    debouncedWriters.clear()
    prevScriptState.clear()
}

// --- Sound hooks (called from thunks / SoundUploader) ---

export function onSoundStored(name: string): void {
    if (!activeBackend) return
    trackOp((async () => {
        await pushSoundFile(activeBackend!, name)
        scheduleManifestUpdate()
    })()).catch(() => {})
}

export function onSoundDeleted(name: string): void {
    if (!activeBackend) return
    trackOp((async () => {
        await deleteSoundFileByName(activeBackend!, name)
        scheduleManifestUpdate()
    })()).catch(() => {})
}

export function onSoundRenamed(oldName: string, newName: string): void {
    if (!activeBackend) return
    trackOp((async () => {
        await deleteSoundFileByName(activeBackend!, oldName)
        await pushSoundFile(activeBackend!, newName)
        scheduleManifestUpdate()
    })()).catch(() => {})
}
