import { SoundEntity } from "common"

export interface LocalSoundRecord {
    name: string
    metadata: SoundEntity
    audioData: ArrayBuffer
}

const DB_NAME = "earsketch-local-sounds"
const STORE_NAME = "sounds"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME, { keyPath: "name" })
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

export async function storeSound(name: string, audioData: ArrayBuffer, metadata: SoundEntity): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        tx.objectStore(STORE_NAME).put({ name, audioData, metadata })
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export async function getSound(name: string): Promise<LocalSoundRecord | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(name)
        req.onsuccess = () => resolve(req.result ? (req.result as LocalSoundRecord) : null)
        req.onerror = () => reject(req.error)
    })
}

export async function getAudioData(name: string): Promise<ArrayBuffer | null> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(name)
        req.onsuccess = () => resolve(req.result ? (req.result as LocalSoundRecord).audioData : null)
        req.onerror = () => reject(req.error)
    })
}

export async function getAllSounds(): Promise<LocalSoundRecord[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()
        req.onsuccess = () => resolve(req.result as LocalSoundRecord[])
        req.onerror = () => reject(req.error)
    })
}

export async function deleteSound(name: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        tx.objectStore(STORE_NAME).delete(name)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

export async function clear(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite")
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}
