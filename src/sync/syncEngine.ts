import _ from "lodash"

import store from "../reducers"
import type { Scripts } from "../browser/scriptsState"
import { selectActiveScripts, selectRegularScripts, setRegularScripts } from "../browser/scriptsState"
import * as ESUtils from "../esutils"
import { getLocalUserSounds } from "../browser/soundsThunks"
import * as localSoundStorage from "../audio/localSoundStorage"
import * as syncState from "./syncState"
import {
    SyncBackend,
    pushScripts,
    pushOneScript,
    removeOneScript,
    pushOneSound,
    removeOneSound,
    pushAllSounds,
    pullScripts,
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

    // Always do a merge: pull remote items not present locally, then push local items.
    // Local wins on conflicts (because push happens last).
    await mergeAll()

    // Start watching for changes.
    startWatching()
}

export function disconnectBackend(): void {
    stopWatching()
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
        // Mirror the login-flow conflict resolution: remote wins the name, local scripts
        // with conflicting names get renamed using "Foo.py" → "Foo_1.py" → "Foo_2.py", etc.
        const remoteScripts = await pullScripts(activeBackend)
        const originalLocalScripts = selectRegularScripts(store.getState())
        const remoteByName = new Map<string, string>() // name → remote ID
        for (const [id, script] of Object.entries(remoteScripts)) {
            remoteByName.set(script.name, id)
        }

        // Build the merged script map: start with remote scripts (they win their names),
        // then add local scripts, renaming any whose names conflict with a different-ID remote.
        const merged: typeof remoteScripts = { ...remoteScripts }
        const takenNames = new Set(Object.values(merged).map(s => s.name))
        const renamedLocalIds = new Set<string>() // local IDs that got a new name

        for (const [id, script] of Object.entries(originalLocalScripts)) {
            if (id in remoteScripts) {
                // Same ID exists on both sides — local wins (preserve user's latest edits).
                merged[id] = script
                continue
            }
            const remoteIdWithSameName = remoteByName.get(script.name)
            if (remoteIdWithSameName && remoteIdWithSameName !== id) {
                // Name conflict with a different remote script — rename this local one.
                const newName = nextAvailableName(script.name, takenNames)
                takenNames.add(newName)
                merged[id] = { ...script, name: newName }
                renamedLocalIds.add(id)
            } else {
                merged[id] = script
                takenNames.add(script.name)
            }
        }

        store.dispatch(setRegularScripts(merged))

        // Pull remote sounds (skip ones we already have locally — assume same name = same content).
        const localSoundNames = new Set((await localSoundStorage.getAllSounds()).map(s => s.name))
        await pullSoundsExcept(activeBackend, localSoundNames)
        store.dispatch(getLocalUserSounds())

        // Push local scripts to remote: renamed ones (under their new names), plus any
        // local scripts with no remote counterpart.
        const toPush: typeof merged = {}
        for (const [id, script] of Object.entries(merged)) {
            if (renamedLocalIds.has(id) || (id in originalLocalScripts && !(id in remoteScripts))) {
                toPush[id] = script
            }
        }
        if (Object.keys(toPush).length > 0) {
            await pushScripts(activeBackend, toPush)
        }

        // Push all local sounds (upserts — safe to re-send).
        await pushAllSounds(activeBackend)
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

// Helper: pull remote sounds, skipping those whose names are in `skip`.
async function pullSoundsExcept(backend: SyncBackend, skip: Set<string>): Promise<void> {
    const files = await backend.listFiles()
    const metaFiles = files.filter(f => f.path.startsWith("sounds/") && f.path.endsWith(".meta.json"))

    const decoder = new TextDecoder()
    for (const metaFile of metaFiles) {
        const name = metaFile.path.slice("sounds/".length, -".meta.json".length)
        if (skip.has(name)) continue

        const audioPath = `sounds/${name}.audio`
        const [metaData, audioData] = await Promise.all([
            backend.readFile(metaFile.path),
            backend.readFile(audioPath),
        ])
        if (!metaData || !audioData) continue

        const metadata = JSON.parse(decoder.decode(metaData))
        await localSoundStorage.storeSound(name, audioData, metadata)
    }
}

// --- Change watching ---

let prevScripts: Scripts = {}

// Per-script debounced push functions.
const debouncedPushes = new Map<string, ReturnType<typeof _.debounce>>()

function getDebouncedPush(id: string): ReturnType<typeof _.debounce> {
    let fn = debouncedPushes.get(id)
    if (!fn) {
        fn = _.debounce((script: any) => {
            if (activeBackend) {
                trackOp(pushOneScript(activeBackend, id, script)).catch(() => {})
            }
        }, 500)
        debouncedPushes.set(id, fn)
    }
    return fn
}

function startWatching(): void {
    prevScripts = { ...selectActiveScripts(store.getState()) }

    unsubscribeStore = store.subscribe(() => {
        if (!activeBackend) return
        const currentScripts = selectActiveScripts(store.getState())
        if (currentScripts === prevScripts) return

        // Detect changes
        for (const [id, script] of Object.entries(currentScripts)) {
            const prev = prevScripts[id]
            if (!prev || prev.source_code !== script.source_code || prev.name !== script.name) {
                getDebouncedPush(id)(script)
            }
        }

        // Detect deletions
        for (const id of Object.keys(prevScripts)) {
            if (!(id in currentScripts)) {
                const debounced = debouncedPushes.get(id)
                if (debounced) {
                    debounced.cancel()
                    debouncedPushes.delete(id)
                }
                trackOp(removeOneScript(activeBackend!, id)).catch(() => {})
            }
        }

        prevScripts = { ...currentScripts }
    })
}

function stopWatching(): void {
    if (unsubscribeStore) {
        unsubscribeStore()
        unsubscribeStore = null
    }
    for (const fn of debouncedPushes.values()) {
        fn.cancel()
    }
    debouncedPushes.clear()
}

// --- Sound hooks (called from thunks / SoundUploader) ---

export function onSoundStored(name: string): void {
    if (activeBackend) {
        trackOp(pushOneSound(activeBackend, name)).catch(() => {})
    }
}

export function onSoundDeleted(name: string): void {
    if (activeBackend) {
        trackOp(removeOneSound(activeBackend, name)).catch(() => {})
    }
}

export function onSoundRenamed(oldName: string, newName: string): void {
    if (activeBackend) {
        trackOp(removeOneSound(activeBackend, oldName)).catch(() => {})
        trackOp(pushOneSound(activeBackend, newName)).catch(() => {})
    }
}
