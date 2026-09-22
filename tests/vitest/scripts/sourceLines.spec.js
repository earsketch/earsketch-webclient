import { describe, expect, it } from "vitest"
import * as runner from "../../../src/app/runner"

describe("sourceLines call stack", () => {
    it("Python: clip from a wrapper function records the call site", async () => {
        const script = [
            "from earsketch import *", // 1
            "def addBeat():", // 2
            "    fitMedia(OS_CLAP01, 1, 1, 2)", // 3
            "for i in range(2):", // 4
            "    addBeat()", // 5
            "", // 6
        ].join("\n")
        const result = await runner.run("python", script)
        const userClips = result.tracks.flatMap(t => t.clips ?? []).filter(c => c.filekey === "OS_CLAP01")
        expect(userClips.length).toBeGreaterThan(0)
        for (const clip of userClips) {
            expect(clip.sourceLines).toEqual([3, 5])
        }
    })

    it("JavaScript: clip from a wrapper function records the call site", async () => {
        const script = [
            "function addBeat() {", // 1
            "    fitMedia(OS_CLAP01, 1, 1, 2)", // 2
            "}", // 3
            "for (var i = 0; i < 2; i++) {", // 4
            "    addBeat()", // 5
            "}", // 6
        ].join("\n")
        const result = await runner.run("javascript", script)
        const userClips = result.tracks.flatMap(t => t.clips ?? []).filter(c => c.filekey === "OS_CLAP01")
        expect(userClips.length).toBeGreaterThan(0)
        for (const clip of userClips) {
            expect(clip.sourceLines).toEqual([2, 5])
        }
    })

    it("JavaScript: top-level call gets a single-frame stack", async () => {
        const script = [
            "setTempo(99)", // 1
        ].join("\n")
        const result = await runner.run("javascript", script)
        const tempo = result.tracks[0].effects.TEMPO.TEMPO.find(p => p.value === 99)
        expect(tempo?.sourceLines).toEqual([1])
    })
})
