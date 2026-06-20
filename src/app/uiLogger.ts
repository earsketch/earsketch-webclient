// UI event logger — sends batched user interactions to the ui-logger Lambda.
// Gated by a per-user feature flag fetched from the flags endpoint.
// Mirrors the auth pattern in request.ts: Bearer token pulled from Redux store.

import store from "../reducers"
import * as user from "../user/userState"

const FLUSH_INTERVAL = 5000
const MAX_QUEUE_SIZE = 100
const FLAG_CACHE_TTL = 300_000

interface LogEvent {
    username: string
    sessionId: string
    timestamp: string
    action: string
    target: string
    page: string
    metadata: Record<string, unknown>
}

let enabled = false
let queue: LogEvent[] = []
let timer: number | null = null
let flagExpiry = 0
const sessionId = window.crypto.randomUUID()

function token() {
    return user.selectToken(store.getState())
}

function username() {
    return user.selectUserName(store.getState()) ?? ""
}

async function fetchFlag(): Promise<void> {
    const tok = token()
    if (!tok) { enabled = false; return }
    try {
        const resp = await fetch(UI_LOGGER_URL + "/flags", {
            headers: { Authorization: `Bearer ${tok}` },
        })
        if (!resp.ok) { enabled = false; return }
        const data = await resp.json()
        enabled = data?.flags?.ui_logging === true
        flagExpiry = Date.now() + FLAG_CACHE_TTL
    } catch {
        enabled = false
    }
}

async function flush(): Promise<boolean> {
    if (Date.now() > flagExpiry) {
        await fetchFlag()
    }

    if (!enabled) { queue = []; return true }

    if (!queue.length) return true

    const tok = token()
    if (!tok) { enabled = false; queue = []; return false }

    const batch = queue.splice(0)
    try {
        const resp = await fetch(UI_LOGGER_URL + "/log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tok}`,
            },
            body: JSON.stringify({ events: batch }),
            keepalive: true,
        })
        if (resp.status === 401) { enabled = false; queue = []; return false }
        return resp.ok
    } catch {
        queue.unshift(...batch)
        return false
    }
}

export async function init(): Promise<void> {
    await fetchFlag()
    if (!timer) {
        timer = window.setInterval(flush, FLUSH_INTERVAL)
    }
}

export async function destroy(): Promise<void> {
    if (timer) { window.clearInterval(timer); timer = null }
    await flush()
    enabled = false
    queue = []
}

export function click(elementOrLabel: Element | string): void {
    const target = typeof elementOrLabel === "string"
        ? elementOrLabel
        : (elementOrLabel.id || elementOrLabel.textContent?.trim().slice(0, 60) || "unknown")
    event("button_click", target)
}

export function shortcut(keys: string, target = ""): void {
    event("keyboard_shortcut", keys, { target })
}

export function event(action: string, target = "", metadata: Record<string, unknown> = {}): void {
    if (!enabled) return
    if (queue.length >= MAX_QUEUE_SIZE) queue.shift()
    queue.push({
        username: username(),
        sessionId,
        timestamp: new Date().toISOString(),
        action: action.slice(0, 128),
        target: target.slice(0, 256),
        page: window.location.pathname,
        metadata,
    })
}
