import type { SyncBackend, SyncFileInfo } from "./syncBackend"

const SCOPE = "https://www.googleapis.com/auth/drive.appdata"
const DRIVE_API = "https://www.googleapis.com/drive/v3/files"
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"
const GIS_URL = "https://accounts.google.com/gsi/client"
const LS_KEY = "earsketch_drive_connected"

// Minimal type declarations for Google Identity Services.
// These are injected by the GIS <script> tag at runtime.
declare const google: {
    accounts: {
        oauth2: {
            initTokenClient(config: {
                client_id: string
                scope: string
                callback: (resp: TokenResponse) => void
                error_callback?: (err: { type: string }) => void
                prompt?: string
            }): { requestAccessToken(opts?: { prompt?: string }): void }
            revoke(token: string, cb: () => void): void
            hasGrantedAllScopes(resp: TokenResponse, scope: string): boolean
        }
    }
}

interface TokenResponse {
    access_token: string
    expires_in: number
    error?: string
    error_description?: string
}

interface DriveFile {
    id: string
    name: string
    modifiedTime: string
    size?: string
}

// --- GIS loader ---

let gisLoaded = false

function loadGIS(): Promise<void> {
    if (gisLoaded) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = GIS_URL
        script.async = true
        script.onload = () => { gisLoaded = true; resolve() }
        script.onerror = () => reject(new Error("Failed to load Google Identity Services"))
        document.head.appendChild(script)
    })
}

// --- Drive backend ---

export function createDriveBackend(clientId: string): SyncBackend {
    let accessToken: string | null = null
    let tokenExpiresAt = 0
    let tokenClient: ReturnType<typeof google.accounts.oauth2.initTokenClient> | null = null

    // Cache of file path → Drive file ID, populated by listFiles().
    const fileIdCache = new Map<string, string>()

    function isTokenValid(): boolean {
        return !!accessToken && Date.now() < tokenExpiresAt
    }

    async function ensureToken(): Promise<string> {
        if (isTokenValid()) return accessToken!
        // Try silent re-auth (prompt: "" skips consent if already granted)
        return new Promise<string>((resolve, reject) => {
            if (!tokenClient) {
                reject(new Error("Drive not initialized — call connect() first"))
                return
            }
            // Re-init with a one-shot callback for this request
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPE,
                callback: (resp: TokenResponse) => {
                    if (resp.error) {
                        reject(new Error(resp.error_description ?? resp.error))
                        return
                    }
                    accessToken = resp.access_token
                    tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000
                    resolve(accessToken)
                },
                error_callback: (err) => reject(new Error(err.type)),
                prompt: "",
            })
            tokenClient.requestAccessToken({ prompt: "" })
        })
    }

    async function driveRequest(url: string, init: RequestInit = {}): Promise<Response> {
        const token = await ensureToken()
        const headers = new Headers(init.headers)
        headers.set("Authorization", `Bearer ${token}`)
        const resp = await fetch(url, { ...init, headers })

        if (resp.status === 401) {
            // Token expired between check and use — retry once
            accessToken = null
            const newToken = await ensureToken()
            headers.set("Authorization", `Bearer ${newToken}`)
            return fetch(url, { ...init, headers })
        }

        if (!resp.ok) {
            const text = await resp.text().catch(() => "")
            throw new Error(`Drive API ${resp.status}: ${text}`)
        }
        return resp
    }

    // --- SyncBackend implementation ---

    const backend: SyncBackend = {
        kind: "drive",

        isAvailable() {
            return !!clientId
        },

        isConnected() {
            return isTokenValid()
        },

        async connect() {
            await loadGIS()

            return new Promise<void>((resolve, reject) => {
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: SCOPE,
                    callback: (resp) => {
                        if (resp.error) {
                            reject(new Error(resp.error_description ?? resp.error))
                            return
                        }
                        accessToken = resp.access_token
                        tokenExpiresAt = Date.now() + (resp.expires_in - 60) * 1000
                        localStorage.setItem(LS_KEY, "1")
                        resolve()
                    },
                    error_callback: (err) => reject(new Error(err.type)),
                })
                tokenClient.requestAccessToken()
            })
        },

        disconnect() {
            if (accessToken) {
                google.accounts.oauth2.revoke(accessToken, () => {})
            }
            accessToken = null
            tokenExpiresAt = 0
            tokenClient = null
            fileIdCache.clear()
            localStorage.removeItem(LS_KEY)
        },

        async writeFile(path: string, data: string | ArrayBuffer) {
            const fileId = fileIdCache.get(path)

            if (fileId) {
                // Update existing file
                const boundary = "----earsketch_sync"
                const metaPart = JSON.stringify({})
                const parts = [
                    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`,
                ]
                const encoder = new TextEncoder()
                const prefix = encoder.encode(parts[0])
                const suffix = encoder.encode(`\r\n--${boundary}--`)
                const mid = encoder.encode(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`)
                const arrayBuf = data instanceof ArrayBuffer ? data : encoder.encode(data as string).buffer
                const body = concatBuffers([prefix.buffer as ArrayBuffer, mid.buffer as ArrayBuffer, arrayBuf, suffix.buffer as ArrayBuffer])

                await driveRequest(`${UPLOAD_API}/${fileId}?uploadType=multipart`, {
                    method: "PATCH",
                    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
                    body,
                })
            } else {
                // Create new file
                const boundary = "----earsketch_sync"
                const metaPart = JSON.stringify({ name: path, parents: ["appDataFolder"] })
                const encoder = new TextEncoder()
                const prefix = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`)
                const mid = encoder.encode(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`)
                const suffix = encoder.encode(`\r\n--${boundary}--`)
                const arrayBuf = data instanceof ArrayBuffer ? data : encoder.encode(data as string).buffer
                const body = concatBuffers([prefix.buffer as ArrayBuffer, mid.buffer as ArrayBuffer, arrayBuf, suffix.buffer as ArrayBuffer])

                const resp = await driveRequest(`${UPLOAD_API}?uploadType=multipart`, {
                    method: "POST",
                    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
                    body,
                })
                const result = await resp.json()
                fileIdCache.set(path, result.id)
            }
        },

        async readFile(path: string) {
            const fileId = fileIdCache.get(path)
            if (!fileId) return null
            const resp = await driveRequest(`${DRIVE_API}/${fileId}?alt=media`)
            return resp.arrayBuffer()
        },

        async deleteFile(path: string) {
            const fileId = fileIdCache.get(path)
            if (!fileId) return
            await driveRequest(`${DRIVE_API}/${fileId}`, { method: "DELETE" })
            fileIdCache.delete(path)
        },

        async clearAll() {
            const files = await backend.listFiles()
            for (const f of files) {
                await backend.deleteFile(f.path).catch(() => {})
            }
        },

        async listFiles() {
            const allFiles: SyncFileInfo[] = []
            let pageToken: string | undefined

            do {
                const params = new URLSearchParams({
                    spaces: "appDataFolder",
                    fields: "nextPageToken, files(id, name, modifiedTime, size)",
                    pageSize: "1000",
                })
                if (pageToken) params.set("pageToken", pageToken)

                const resp = await driveRequest(`${DRIVE_API}?${params}`)
                const data = await resp.json()

                for (const f of (data.files ?? []) as DriveFile[]) {
                    fileIdCache.set(f.name, f.id)
                    allFiles.push({
                        path: f.name,
                        modifiedTime: new Date(f.modifiedTime).getTime(),
                        size: f.size ? parseInt(f.size, 10) : undefined,
                    })
                }

                pageToken = data.nextPageToken
            } while (pageToken)

            return allFiles
        },
    }

    return backend
}

export function wasPreviouslyConnected(): boolean {
    return localStorage.getItem(LS_KEY) === "1"
}

// --- Utility ---

function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of buffers) {
        result.set(new Uint8Array(buf), offset)
        offset += buf.byteLength
    }
    return result.buffer as ArrayBuffer
}
