import _ from "lodash"

import store from "../reducers"
import type { Scripts } from "../browser/scriptsState"
import { selectActiveScripts, setRegularScripts } from "../browser/scriptsState"
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
    pullSounds,
} from "./syncBackend"

let activeBackend: SyncBackend | null = null
let unsubscribeStore: (() => void) | null = null

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

    // Determine whether to push or pull.
    const localScripts = selectActiveScripts(store.getState())
    const localSounds = await localSoundStorage.getAllSounds()
    const hasLocalData = Object.keys(localScripts).length > 0 || localSounds.length > 0

    if (hasLocalData) {
        await pushAll()
    } else {
        const remoteFiles = await backend.listFiles()
        if (remoteFiles.length > 0) {
            await pullAll()
        }
    }

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

// --- Push / pull all ---

async function pushAll(): Promise<void> {
    if (!activeBackend) return
    store.dispatch(syncState.setSyncing(true))
    try {
        const scripts = selectActiveScripts(store.getState())
        await pushScripts(activeBackend, scripts)
        await pushAllSounds(activeBackend)
        store.dispatch(syncState.setLastSyncTime(Date.now()))
    } catch (err: any) {
        store.dispatch(syncState.setError(err.message ?? "Sync failed"))
    } finally {
        store.dispatch(syncState.setSyncing(false))
    }
}

async function pullAll(): Promise<void> {
    if (!activeBackend) return
    store.dispatch(syncState.setSyncing(true))
    try {
        // Pull scripts
        const scripts = await pullScripts(activeBackend)
        if (Object.keys(scripts).length > 0) {
            const existing = store.getState().scripts.regularScripts
            store.dispatch(setRegularScripts({ ...existing, ...scripts }))
        }

        // Pull sounds
        await pullSounds(activeBackend)
        store.dispatch(getLocalUserSounds())

        store.dispatch(syncState.setLastSyncTime(Date.now()))
    } catch (err: any) {
        store.dispatch(syncState.setError(err.message ?? "Sync failed"))
    } finally {
        store.dispatch(syncState.setSyncing(false))
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
                pushOneScript(activeBackend, id, script).catch(() => {})
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
                removeOneScript(activeBackend!, id).catch(() => {})
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
        pushOneSound(activeBackend, name).catch(() => {})
    }
}

export function onSoundDeleted(name: string): void {
    if (activeBackend) {
        removeOneSound(activeBackend, name).catch(() => {})
    }
}

export function onSoundRenamed(oldName: string, newName: string): void {
    if (activeBackend) {
        removeOneSound(activeBackend, oldName).catch(() => {})
        pushOneSound(activeBackend, newName).catch(() => {})
    }
}
