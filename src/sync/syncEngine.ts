import _ from "lodash"
import i18n from "i18next"

import store from "../reducers"
import { Script } from "common"
import { selectActiveScripts, selectNextLocalScriptID, selectRegularScripts, setRegularScripts } from "../browser/scriptsState"
import { getLocalUserSounds } from "../browser/soundsThunks"
import * as localSoundStorage from "../audio/localSoundStorage"
import * as ESUtils from "../esutils"
import * as userNotification from "../user/notification"
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
        const result = await promise
        recordSyncSuccess()
        return result
    } catch (err) {
        recordSyncError(err)
        throw err
    } finally {
        endOp()
    }
}

const FAILURE_NOTIFY_THRESHOLD = 3
let consecutiveFailures = 0
let toastShownAtFailures = 0

export function recordSyncError(err: unknown): void {
    consecutiveFailures++
    const message = (err as Error)?.message ?? String(err)
    store.dispatch(syncState.setError(message))

    if (consecutiveFailures >= FAILURE_NOTIFY_THRESHOLD && toastShownAtFailures < FAILURE_NOTIFY_THRESHOLD) {
        toastShownAtFailures = consecutiveFailures
        userNotification.show(i18n.t("sync.failureNotice"), "failure1")
    }
}

export function recordSyncSuccess(): void {
    if (consecutiveFailures > 0) {
        consecutiveFailures = 0
        toastShownAtFailures = 0
        if (store.getState().sync.status === "error") {
            store.dispatch(syncState.setStatus("connected"))
        }
    }
}

export function getActiveBackend(): SyncBackend | null {
    return activeBackend
}

const debouncedManifestUpdate = _.debounce(async () => {
    const backend = activeBackend
    if (!backend) return
    beginOp()
    try {
        const scripts = selectActiveScripts(store.getState())
        const sounds = await localSoundStorage.getAllSounds()
        const manifest = buildManifest(scripts, sounds)
        await writeManifest(backend, manifest)
        recordSyncSuccess()
    } catch (err) {
        recordSyncError(err)
    } finally {
        endOp()
    }
}, 1000)

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
    consecutiveFailures = 0
    toastShownAtFailures = 0
    if (activeBackend) {
        activeBackend.disconnect()
        activeBackend = null
    }
    store.dispatch(syncState.resetSync())
}

async function mergeAll(): Promise<void> {
    const backend = activeBackend
    if (!backend) return
    beginOp()
    try {
        const pulled = await pullAll(backend)

        const originalLocalScripts = selectRegularScripts(store.getState())
        const originalLocalSoundNames = new Set(
            (await localSoundStorage.getAllSounds()).map(s => s.name)
        )

        const scriptsToPush: Script[] = []

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
            let nextLocalIDNum = parseInt(selectNextLocalScriptID(store.getState()).slice("local/".length))

            for (const { entry, source } of pulled.scripts) {
                const localMatch = localByName.get(entry.name)
                if (localMatch && localMatch.source_code === source) {
                    merged[localMatch.shareid] = localMatch
                    takenNames.add(localMatch.name)
                } else {
                    const id = `local/${nextLocalIDNum++}`
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

            for (const script of Object.values(originalLocalScripts)) {
                if (script.soft_delete) continue
                if (merged[script.shareid]) continue
                const remoteMatch = remoteByName.get(script.name)
                if (remoteMatch && remoteMatch.source !== script.source_code) {
                    const newName = ESUtils.nextAvailableScriptName(script.name, takenNames)
                    const renamed = { ...script, name: newName }
                    merged[script.shareid] = renamed
                    takenNames.add(newName)
                    scriptsToPush.push(renamed)
                } else if (!remoteMatch) {
                    merged[script.shareid] = script
                    takenNames.add(script.name)
                    scriptsToPush.push(script)
                }
            }

            store.dispatch(setRegularScripts(merged))

            await Promise.all(pulled.sounds.map(({ entry, audioData }) => {
                if (originalLocalSoundNames.has(entry.name)) return undefined
                return localSoundStorage.storeSound(entry.name, audioData, entry.metadata)
            }))
            store.dispatch(getLocalUserSounds())
        } else {
            for (const script of Object.values(originalLocalScripts)) {
                if (!script.soft_delete) scriptsToPush.push(script)
            }
        }

        await Promise.all(scriptsToPush.map(script => pushScriptFile(backend, script)))

        const allSounds = await localSoundStorage.getAllSounds()
        await Promise.all(allSounds.map(sound => pushSoundFile(backend, sound.name)))

        const finalScripts = selectActiveScripts(store.getState())
        const manifest = buildManifest(finalScripts, allSounds)
        await writeManifest(backend, manifest)
        recordSyncSuccess()
    } catch (err) {
        recordSyncError(err)
    } finally {
        endOp()
    }
}

const prevScriptState = new Map<string, { name: string; source_code: string }>()

const debouncedWriters = new Map<string, ReturnType<typeof _.debounce>>()

function getDebouncedWriter(id: string): ReturnType<typeof _.debounce> {
    let fn = debouncedWriters.get(id)
    if (!fn) {
        fn = _.debounce((script: Script, oldName: string | null) => {
            const backend = activeBackend
            if (!backend) return
            trackOp((async () => {
                if (oldName && oldName !== script.name) {
                    await deleteScriptFile(backend, oldName)
                }
                await pushScriptFile(backend, script)
                debouncedManifestUpdate()
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
        const backend = activeBackend
        if (!backend) return
        const currentScripts = selectActiveScripts(store.getState())

        for (const [id, script] of Object.entries(currentScripts)) {
            const prev = prevScriptState.get(id)
            if (!prev || prev.source_code !== script.source_code || prev.name !== script.name) {
                const oldName = prev?.name ?? null
                getDebouncedWriter(id)(script, oldName !== script.name ? oldName : null)
                prevScriptState.set(id, { name: script.name, source_code: script.source_code })
            }
        }

        for (const id of Array.from(prevScriptState.keys())) {
            if (!(id in currentScripts)) {
                const prev = prevScriptState.get(id)!
                prevScriptState.delete(id)
                const writer = debouncedWriters.get(id)
                if (writer) {
                    writer.cancel()
                    debouncedWriters.delete(id)
                }
                trackOp(deleteScriptFile(backend, prev.name)).catch(() => {})
                debouncedManifestUpdate()
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

export function onSoundStored(name: string): void {
    const backend = activeBackend
    if (!backend) return
    trackOp((async () => {
        await pushSoundFile(backend, name)
        debouncedManifestUpdate()
    })()).catch(() => {})
}

export function onSoundDeleted(name: string): void {
    const backend = activeBackend
    if (!backend) return
    trackOp((async () => {
        await deleteSoundFileByName(backend, name)
        debouncedManifestUpdate()
    })()).catch(() => {})
}

export function onSoundRenamed(oldName: string, newName: string): void {
    const backend = activeBackend
    if (!backend) return
    trackOp((async () => {
        await deleteSoundFileByName(backend, oldName)
        await pushSoundFile(backend, newName)
        debouncedManifestUpdate()
    })()).catch(() => {})
}
