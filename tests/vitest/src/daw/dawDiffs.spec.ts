import { beforeEach, describe, expect, it, vi } from "vitest"
import { getDAWDataDifferences } from "../../../../src/ide/dawDataDescriptions"
import baseline from "../../fixtures/dawDiffScripts/baseline.json"
import baselinePlus1Track from "../../fixtures/dawDiffScripts/baseline-plus-1-track.json"
import type { DAWData } from "../../../../src/types/common"
import i18n from "i18next"

vi.mock("i18next", () => ({
    default: {
        t: vi.fn((key: string, params?: Record<string, unknown>) => {
            if (params) {
                return JSON.stringify({ key, params })
            }
            return key
        }),
    },
}))

// Cast JSON fixtures through unknown to avoid strict type checking
// (JSON doesn't have AudioBuffer instances, but the function doesn't need them)
const baselineData = baseline as unknown as DAWData
const baselinePlus1TrackData = baselinePlus1Track as unknown as DAWData

describe("getDAWDataDifferences", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("returns empty array when previous data is null", () => {
        const differences = getDAWDataDifferences(null as unknown as DAWData, baselineData)
        expect(differences).toEqual([])
    })

    it("returns empty array when previous data has no tracks and no length", () => {
        const emptyPrevious: DAWData = { length: 0, tracks: undefined as unknown as DAWData["tracks"], transformedClips: {} }
        const differences = getDAWDataDifferences(emptyPrevious, baselineData)
        expect(differences).toEqual([])
    })

    it("returns no changes message when comparing identical data", () => {
        const differences = getDAWDataDifferences(baselineData, baselineData)
        expect(differences).toHaveLength(0)
    })

    it("detects project length increase when comparing baseline to baseline-plus-1-track", () => {
        const differences = getDAWDataDifferences(baselineData, baselinePlus1TrackData)
        expect(differences).toHaveLength(3)

        // Verify i18n.t was called with correct key and parameters
        expect(i18n.t).toHaveBeenCalledWith(
            "messages:idecontroller.projectLengthIncreased",
            expect.objectContaining({
                from: 8,
                to: 9,
            })
        )
    })

    it("detects project length decrease when comparing baseline-plus-1-track to baseline", () => {
        const differences = getDAWDataDifferences(baselinePlus1TrackData, baselineData)
        expect(differences.length).toBeGreaterThan(0)

        // Verify i18n.t was called with correct key and parameters
        expect(i18n.t).toHaveBeenCalledWith(
            "messages:idecontroller.projectLengthDecreased",
            expect.objectContaining({
                from: 9,
                to: 8,
            })
        )
    })

    it("detects project length changes with custom data", () => {
        const shorterProject: DAWData = { ...baselineData, length: 5 }
        const longerProject: DAWData = { ...baselineData, length: 20 }

        const increasedDiffs = getDAWDataDifferences(shorterProject, longerProject)
        expect(increasedDiffs.some(diff => diff.includes("projectLengthIncreased"))).toBe(true)
        expect(i18n.t).toHaveBeenCalledWith(
            "messages:idecontroller.projectLengthIncreased",
            expect.objectContaining({
                from: 5,
                to: 20,
            })
        )

        vi.clearAllMocks()

        const decreasedDiffs = getDAWDataDifferences(longerProject, shorterProject)
        expect(decreasedDiffs.some(diff => diff.includes("projectLengthDecreased"))).toBe(true)
        expect(i18n.t).toHaveBeenCalledWith(
            "messages:idecontroller.projectLengthDecreased",
            expect.objectContaining({
                from: 20,
                to: 5,
            })
        )
    })

    it("detects tracks added", () => {
        const fewerTracks: DAWData = {
            length: 8,
            tracks: baselineData.tracks?.slice(0, 3) || [],
            transformedClips: {},
        }
        const moreTracks: DAWData = {
            length: 8,
            tracks: baselineData.tracks?.slice(0, 5) || [],
            transformedClips: {},
        }

        const differences = getDAWDataDifferences(fewerTracks, moreTracks)
        expect(differences.some(diff => diff.includes("tracksAdded"))).toBe(true)
    })

    it("detects tracks removed", () => {
        const moreTracks: DAWData = {
            length: 8,
            tracks: baselineData.tracks?.slice(0, 5) || [],
            transformedClips: {},
        }
        const fewerTracks: DAWData = {
            length: 8,
            tracks: baselineData.tracks?.slice(0, 3) || [],
            transformedClips: {},
        }

        const differences = getDAWDataDifferences(moreTracks, fewerTracks)
        expect(differences.some(diff => diff.includes("tracksRemoved"))).toBe(true)
    })

    it("returns an array of strings", () => {
        const differences = getDAWDataDifferences(baselineData, baselinePlus1TrackData)
        expect(Array.isArray(differences)).toBe(true)
        differences.forEach(diff => {
            expect(typeof diff).toBe("string")
        })
    })
})
