import type { SyncBackend, SyncFileInfo } from "./syncBackend"

const IDB_NAME = "earsketch-fsa-handle"
const IDB_STORE = "handles"
const IDB_KEY = "sync-dir"

// --- Handle persistence via IndexedDB ---

function openHandleDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1)
        req.onupgradeneeded = () => {
            req.result.createObjectStore(IDB_STORE)
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await openHandleDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite")
        tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await openHandleDB()
    return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY)
        req.onsuccess = () => resolve(req.result ?? null)
        req.onerror = () => reject(req.error)
    })
}

async function clearHandle(): Promise<void> {
    const db = await openHandleDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite")
        tx.objectStore(IDB_STORE).delete(IDB_KEY)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

// --- Helpers ---

/** Get a file handle from a path like "scripts/foo.json", creating parent dirs as needed. */
async function getFileFromPath(root: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemFileHandle | null> {
    const parts = path.split("/")
    const fileName = parts.pop()!
    let dir = root
    for (const part of parts) {
        try {
            dir = await dir.getDirectoryHandle(part, { create })
        } catch {
            return null
        }
    }
    try {
        return await dir.getFileHandle(fileName, { create })
    } catch {
        return null
    }
}

async function walkDir(dir: FileSystemDirectoryHandle, prefix: string): Promise<SyncFileInfo[]> {
    const results: SyncFileInfo[] = []
    for await (const [name, handle] of dir.entries()) {
        if (handle.kind === "directory") {
            results.push(...await walkDir(handle as FileSystemDirectoryHandle, `${prefix}${name}/`))
        } else {
            const file = await (handle as FileSystemFileHandle).getFile()
            results.push({
                path: `${prefix}${name}`,
                modifiedTime: file.lastModified,
                size: file.size,
            })
        }
    }
    return results
}

// --- FSA backend ---

export function createFSABackend(): SyncBackend {
    let rootHandle: FileSystemDirectoryHandle | null = null

    const backend: SyncBackend = {
        kind: "fsa",

        isAvailable() {
            return "showDirectoryPicker" in window
        },

        isConnected() {
            return rootHandle !== null
        },

        async connect() {
            // Try to restore a previously saved handle
            const saved = await loadHandle()
            if (saved) {
                const perm = await saved.requestPermission({ mode: "readwrite" })
                if (perm === "granted") {
                    rootHandle = saved
                    return
                }
            }

            // No saved handle or permission denied — show picker
            rootHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" })
            await saveHandle(rootHandle!)
        },

        disconnect() {
            rootHandle = null
            clearHandle()
        },

        async writeFile(path: string, data: string | ArrayBuffer) {
            if (!rootHandle) throw new Error("Not connected")
            const fh = await getFileFromPath(rootHandle, path, true)
            if (!fh) throw new Error(`Cannot create file: ${path}`)
            const writable = await fh.createWritable()
            await writable.write(data)
            await writable.close()
        },

        async readFile(path: string) {
            if (!rootHandle) throw new Error("Not connected")
            const fh = await getFileFromPath(rootHandle, path, false)
            if (!fh) return null
            const file = await fh.getFile()
            return file.arrayBuffer()
        },

        async deleteFile(path: string) {
            if (!rootHandle) throw new Error("Not connected")
            const parts = path.split("/")
            const fileName = parts.pop()!
            let dir = rootHandle
            for (const part of parts) {
                try {
                    dir = await dir.getDirectoryHandle(part)
                } catch {
                    return // directory doesn't exist, nothing to delete
                }
            }
            try {
                await dir.removeEntry(fileName)
            } catch {
                // file doesn't exist
            }
        },

        async listFiles() {
            if (!rootHandle) throw new Error("Not connected")
            return walkDir(rootHandle, "")
        },

        async clearAll() {
            if (!rootHandle) throw new Error("Not connected")
            // Remove manifest + known top-level directories. removeEntry with recursive:true
            // deletes the subtree, including non-empty directories.
            for (const name of ["manifest.json", "scripts", "sounds"]) {
                try {
                    await rootHandle.removeEntry(name, { recursive: true })
                } catch {
                    // entry doesn't exist
                }
            }
        },
    }

    return backend
}

export async function hasSavedHandle(): Promise<boolean> {
    try {
        const handle = await loadHandle()
        return handle !== null
    } catch {
        return false
    }
}
