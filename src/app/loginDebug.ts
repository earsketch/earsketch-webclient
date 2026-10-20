import type { Script } from "common"

// Temporary diagnostics for #1006. Keep IDs across HMR, but not page reloads.
const debugWindow = window as Window & { __ES_LOGIN_DEBUG_V2?: { sequence: number, nextID: number } }
const debug = debugWindow.__ES_LOGIN_DEBUG_V2 ??= { sequence: 0, nextID: 0 }

export const nextLoginDebugID = () => ++debug.nextID

export function logLoginDebug(event: string, details: object = {}) {
    if (!import.meta.env.DEV) return
    console.log("[login-debug]", {
        page: window.performance.timeOrigin,
        sequence: ++debug.sequence,
        elapsedMs: Math.round(window.performance.now()),
        event,
        ...details,
    })
}

export function summarizeLoginScripts(scripts: Record<string, Script>) {
    const entries = Object.entries(scripts).map(([id, script]) => ({
        id,
        shareid: script.shareid,
        name: script.name,
        local: script.shareid.startsWith("local/"),
        deleted: !!script.soft_delete,
        sourceLength: script.source_code?.length,
    }))
    return {
        total: entries.length,
        local: entries.filter(script => script.local).length,
        server: entries.filter(script => !script.local).length,
        scripts: entries,
    }
}

export function logPersistedLoginScripts() {
    if (!import.meta.env.DEV) return
    try {
        const raw = window.localStorage.getItem("persist:scripts")
        const persisted = raw ? JSON.parse(raw) : {}
        const scripts = JSON.parse(persisted.regularScripts ?? "{}")
        logLoginDebug("persisted scripts at migration snapshot", {
            present: raw !== null,
            ...summarizeLoginScripts(scripts),
        })
    } catch {
        logLoginDebug("could not parse persisted scripts")
    }
}
