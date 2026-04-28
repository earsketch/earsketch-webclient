import { describe, expect, test } from "vitest"
import {
    scriptPath,
    soundPath,
    buildManifest,
    writeManifest,
    pullAll,
    pushScriptFile,
    deleteScriptFile,
    MANIFEST_PATH,
} from "../../../../src/sync/syncBackend"
import { MockSyncBackend } from "./mockBackend"
import type { Script, SoundEntity } from "../../../../src/types/common"

const flacHeader = new Uint8Array([0x66, 0x4c, 0x61, 0x43, 0, 0, 0, 0]).buffer as ArrayBuffer
const wavHeader = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]).buffer as ArrayBuffer

function makeScript(name: string, source: string): Script {
    return {
        name,
        shareid: `local/${name}`,
        source_code: source,
        username: "",
        created: "2026-04-22T00:00:00Z",
        modified: "2026-04-22T00:00:00Z",
        saved: true,
        tooltipText: "",
        isShared: false,
        run_status: 0,
        readonly: false,
        creator: "",
    }
}

function makeSoundMeta(name: string): SoundEntity {
    return {
        name, standard: false, path: "", folder: "USER", artist: "USER",
        year: "", public: 1, genre: "", instrument: "",
    } as SoundEntity
}

describe("path helpers", () => {
    test("scriptPath sanitizes filesystem-unsafe characters", () => {
        expect(scriptPath("normal.py")).toBe("scripts/normal.py")
        expect(scriptPath("with/slash.py")).toBe("scripts/with_slash.py")
        expect(scriptPath("a:b*c?.py")).toBe("scripts/a_b_c_.py")
    })

    test("soundPath picks an extension by audio magic bytes", () => {
        expect(soundPath("FOO", flacHeader)).toBe("sounds/FOO.flac")
        expect(soundPath("FOO", wavHeader)).toBe("sounds/FOO.wav")
    })
})

describe("buildManifest", () => {
    test("excludes soft-deleted scripts", () => {
        const scripts = {
            "local/a": makeScript("a.py", "1"),
            "local/b": { ...makeScript("b.py", "2"), soft_delete: true },
        }
        const manifest = buildManifest(scripts, [])
        expect(manifest.scripts.map(s => s.name)).toEqual(["a.py"])
    })

    test("includes filename pointing at the path the file is written to", () => {
        const scripts = { "local/a": makeScript("a.py", "x") }
        const sounds = [{ name: "USER_FOO", metadata: makeSoundMeta("USER_FOO"), audioData: flacHeader }]
        const manifest = buildManifest(scripts, sounds)
        expect(manifest.scripts[0].filename).toBe("scripts/a.py")
        expect(manifest.sounds[0].filename).toBe("sounds/USER_FOO.flac")
    })
})

describe("push and pull round-trip", () => {
    test("pushScriptFile + pullAll recovers script source", async () => {
        const backend = new MockSyncBackend()
        await backend.connect()
        const script = makeScript("hello.py", "print('hi')")
        await pushScriptFile(backend, script)
        await writeManifest(backend, buildManifest({ [script.shareid]: script }, []))

        const pulled = await pullAll(backend)
        expect(pulled).not.toBeNull()
        expect(pulled!.scripts).toHaveLength(1)
        expect(pulled!.scripts[0].entry.name).toBe("hello.py")
        expect(pulled!.scripts[0].source).toBe("print('hi')")
    })

    test("pullAll returns null when no manifest exists", async () => {
        const backend = new MockSyncBackend()
        await backend.connect()
        expect(await pullAll(backend)).toBeNull()
    })

    test("deleteScriptFile removes the file", async () => {
        const backend = new MockSyncBackend()
        await backend.connect()
        const script = makeScript("hello.py", "x")
        await pushScriptFile(backend, script)
        expect(backend.has(scriptPath(script.name))).toBe(true)
        await deleteScriptFile(backend, script.name)
        expect(backend.has(scriptPath(script.name))).toBe(false)
    })

    test("manifest is valid JSON at the expected path", async () => {
        const backend = new MockSyncBackend()
        await backend.connect()
        await writeManifest(backend, buildManifest({}, []))
        const json = backend.json<{ version: number }>(MANIFEST_PATH)
        expect(json).not.toBeNull()
        expect(json!.version).toBe(1)
    })
})

describe("write failures", () => {
    test("a failing writeFile rejects and the file is not stored", async () => {
        const backend = new MockSyncBackend()
        await backend.connect()
        backend.failNextN = 1
        await expect(pushScriptFile(backend, makeScript("a.py", "x"))).rejects.toThrow("Simulated write failure")
        expect(backend.has("scripts/a.py")).toBe(false)
    })
})
