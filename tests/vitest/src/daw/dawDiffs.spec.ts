import { describe, expect, it, vi, beforeAll } from "vitest"
import { getDAWDataDifferences } from "../../../../src/ide/dawDataDescriptions"
import baseline from "../../fixtures/dawDiffScripts/baseline.json"
import baselinePlus1Track from "../../fixtures/dawDiffScripts/baseline-plus-1-track.json"
import baselineMinusFirstMb from "../../fixtures/dawDiffScripts/baseline-minus-first-mb.json"
import baselineChangedTempo from "../../fixtures/dawDiffScripts/baseline-changed-tempo.json"
import type { DAWData } from "../../../../src/types/common"

// Mock i18n to return JSON strings for testing
vi.mock("i18next", () => ({
    default: {
        t: (key: string, params?: Record<string, unknown>) => {
            return JSON.stringify({ key, params: params || {} })
        },
    },
}))

beforeAll(() => {
    // Ensure the mock is set up before tests run
})

// Helper function to find and parse a difference by key
function findDifference(differences: string[], key: string): Record<string, unknown> | null {
    const diff = differences.find(d => d.includes(key))
    if (!diff) return null
    return JSON.parse(diff)
}

// Helper function to verify multiple differences exist with expected params
function expectDifferences(
    differences: string[],
    expected: Array<{ key: string; params: Record<string, unknown> }>,
    checkLength = true
) {
    if (checkLength) {
        expect(differences).toHaveLength(expected.length)
    }
    for (const { key, params } of expected) {
        const diff = findDifference(differences, key)
        expect(diff, `Expected to find difference with key "${key}"`).not.toBeNull()
        expect(diff?.params).toMatchObject(params)
    }
}

// Main output we want for daw diffs:
// project length changes
// tracks added/removed
// effects added/removed
// clip (names) added/removed
// track length/span changes
// main track effects, tempo changes

describe("getDAWDataDifferences", () => {
    it("returns empty array when previous data is null", () => {
        const differences = getDAWDataDifferences(null as unknown as DAWData, baseline)
        expect(differences).toEqual([])
    })

    it("returns empty array when previous data has no tracks and no length", () => {
        const emptyPrevious: DAWData = { length: 0, tracks: undefined as unknown as DAWData["tracks"], transformedClips: {} }
        const differences = getDAWDataDifferences(emptyPrevious, baseline)
        expect(differences).toEqual([])
    })

    it("returns empty array when comparing identical data", () => {
        const differences = getDAWDataDifferences(baseline, baseline)
        expect(differences).toHaveLength(0)
    })

    it("detects project length increase when comparing baseline to baseline-plus-1-track", () => {
        const differences = getDAWDataDifferences(baseline, baselinePlus1Track)
        expectDifferences(differences, [
            { key: "projectLengthIncreased", params: { from: 8, to: 9 } },
            { key: "tracksAdded", params: { count: 1 } },
        ])
    })

    it("detects project length decrease when comparing baseline-plus-1-track to baseline", () => {
        const differences = getDAWDataDifferences(baselinePlus1Track, baseline)

        expectDifferences(
            differences,
            [
                { key: "projectLengthDecreased", params: { from: 9, to: 8 } },
            ],
            false
        )
    })

    it("detects project length changes with custom data", () => {
        const shorterProject: DAWData = { ...baseline, length: 5 }
        const longerProject: DAWData = { ...baseline, length: 20 }

        const increasedDiffs = getDAWDataDifferences(shorterProject, longerProject)
        expectDifferences(increasedDiffs, [
            { key: "projectLengthIncreased", params: { from: 5, to: 20 } },
        ])

        const decreasedDiffs = getDAWDataDifferences(longerProject, shorterProject)
        expectDifferences(decreasedDiffs, [
            { key: "projectLengthDecreased", params: { from: 20, to: 5 } },
        ])
    })

    it("detects tracks added", () => {
        const differences = getDAWDataDifferences(baseline, baselinePlus1Track)
        expectDifferences(
            differences,
            [
                { key: "tracksAdded", params: { count: 1 } },
            ],
            false
        )
    })

    it("detects tracks removed", () => {
        const differences = getDAWDataDifferences(baselinePlus1Track, baseline)
        expectDifferences(
            differences,
            [
                { key: "tracksRemoved", params: { count: 1 } },
            ],
            false
        )
    })

    it("returns an array of strings", () => {
        const differences = getDAWDataDifferences(baseline, baselinePlus1Track)
        expect(Array.isArray(differences)).toBe(true)
        differences.forEach(diff => {
            expect(typeof diff).toBe("string")
        })
    })

    it("detects clips removed when comparing baseline to baseline-minus-first-mb", () => {
        const differences = getDAWDataDifferences(baseline, baselineMinusFirstMb)

        // Should detect clips removed on track 3 (track index 3)
        expectDifferences(differences, [
            { key: "trackClipsRemoved", params: { trackNum: 3, spanStart: 8, spanEnd: 9 } },
        ],
        false)
    })

    it("detects tempo change", () => {
        const differences = getDAWDataDifferences(baseline, baselineChangedTempo)

        // Should detect clips removed on track 3 (track index 3)
        expectDifferences(differences, [
            { key: "tempoChanged", params: { } },
        ],
        false)
    })
})
