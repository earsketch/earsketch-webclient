import type { SyncBackend, SyncFileInfo } from "../../../../src/sync/syncBackend"

/**
 * In-memory SyncBackend for tests. Tracks files as a Map<path, ArrayBuffer>.
 * Optionally injects failures via failNextN to simulate transient errors.
 */
export class MockSyncBackend implements SyncBackend {
    readonly kind = "fsa" // arbitrary; tests don't depend on this
    private files = new Map<string, ArrayBuffer>()
    private modifiedTimes = new Map<string, number>()
    private connected = false

    /** If > 0, the next N write operations will throw. Decrements on each call. */
    failNextN = 0

    isAvailable() { return true }
    isConnected() { return this.connected }
    async connect() { this.connected = true }
    disconnect() { this.connected = false }

    async writeFile(path: string, data: string | ArrayBuffer) {
        if (this.failNextN > 0) {
            this.failNextN--
            throw new Error("Simulated write failure")
        }
        const buf = typeof data === "string"
            ? new TextEncoder().encode(data).buffer as ArrayBuffer
            : data
        this.files.set(path, buf)
        this.modifiedTimes.set(path, Date.now())
    }

    async readFile(path: string) {
        return this.files.get(path) ?? null
    }

    async deleteFile(path: string) {
        this.files.delete(path)
        this.modifiedTimes.delete(path)
    }

    async listFiles(): Promise<SyncFileInfo[]> {
        return Array.from(this.files.entries()).map(([path, data]) => ({
            path,
            modifiedTime: this.modifiedTimes.get(path) ?? 0,
            size: data.byteLength,
        }))
    }

    async clearAll() {
        this.files.clear()
        this.modifiedTimes.clear()
    }

    // --- Test helpers ---

    has(path: string) { return this.files.has(path) }
    text(path: string) {
        const data = this.files.get(path)
        return data ? new TextDecoder().decode(data) : null
    }
    json<T = unknown>(path: string): T | null {
        const t = this.text(path)
        return t === null ? null : JSON.parse(t) as T
    }
    paths() { return Array.from(this.files.keys()).sort() }
}
