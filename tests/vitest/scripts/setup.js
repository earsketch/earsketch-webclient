import { expect } from "vitest"
import "@lib/kali.min" // assigns window.Kali, used by createAudioStretch

function sortClips(a, b) {
    return a.measure - b.measure
}

function checkSimilarity(actual, expected) {
    if (typeof actual !== typeof expected) {
        return false
    }
    if (typeof actual === "number" && typeof expected === "number" &&
        (actual % 1 !== 0 || expected % 1 !== 0)) {
        const e = 0.01
        return (expected - e <= actual && expected + e >= actual)
    }
    if (!(actual instanceof Object && expected instanceof Object)) {
        return actual === expected
    }
    for (const key in expected) {
        if (actual[key] === undefined) {
            return false
        }
        if (!checkSimilarity(actual[key], expected[key])) {
            return false
        }
    }
    return true
}

function matchResult(actual, expected) {
    if (actual.length !== expected.length) {
        return {
            pass: false,
            message: `Expected length: ${expected.length}\nActual length: ${actual.length}`,
        }
    }
    if (actual.tracks.length !== expected.tracks.length) {
        return {
            pass: false,
            message: `Number of expected tracks: ${expected.tracks.length}\nActual number of tracks: ${actual.tracks.length}`,
        }
    }
    for (const track in actual.tracks) {
        const actualTrack = actual.tracks[track]
        const expectedTrack = expected.tracks[track]
        const actualClips = actualTrack.clips.sort(sortClips)
        const expectedClips = expectedTrack.clips.sort(sortClips)
        if (!checkSimilarity(actualClips, expectedClips)) {
            return {
                pass: false,
                message: `Differing track ${track}.\nExpected:\n\n${JSON.stringify(expectedTrack)}\n\nActual:\n\n${JSON.stringify(actualTrack)}\n\n`,
            }
        }
        if (expectedTrack.effects !== undefined && actualTrack.effects !== undefined) {
            if (!checkSimilarity(actualTrack.effects, expectedTrack.effects)) {
                return {
                    pass: false,
                    message: `Differing effects on track ${track}.\nExpected:\n\n${JSON.stringify(expectedTrack.effects)}\n\nActual:\n\n${JSON.stringify(actualTrack.effects)}\n\n`,
                }
            }
        }
    }
    return { pass: true, message: "Results are similar." }
}

expect.extend({
    toMatchResult(actual, expected, script) {
        const result = matchResult(actual, expected)
        return {
            pass: result.pass,
            message: () => result.pass
                ? result.message
                : `${result.message}${script ? `\nScript:\n\n${script}` : ""}`,
        }
    },
})
