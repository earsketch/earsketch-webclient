/* eslint-env jasmine */
import * as _ from "lodash"

window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 240000

window.SITE_DIRECTORY = "/base"
window.SITE_BASE_URI = location.origin + "/base"
window.BUILD_NUM = 0

window.gtag = () => {}

export const customMatchers = {
    toMatchResult() {
        return {
            compare(actual, expected, script) {
                const result = matchResult(actual, expected)
                if (!result.pass) {
                    result.message += "\nScript:\n\n"
                    result.message += script
                }
                return result
            },
        }
    },
}

/**
 * A custom Jasmine matcher that matches compiler result outputs. Does not
 * check every key intentionally. Only the ones of importance.
 *
 * @param {Object} actual The actual result to be tested.
 * @param {Object} expected The expected result to be tested against.
 * @returns true if actual is similar to expected
 */
function matchResult(actual, expected) {
    // verify length
    if (actual.length !== expected.length) {
        return {
            pass: false,
            message: "Expected length: " + expected.length + "\n" +
                "Actual length: " + actual.length,
        }
    }

    // count of tracks
    if (actual.tracks.length !== expected.tracks.length) {
        return {
            pass: false,
            message: "Number of expected tracks: " + expected.tracks.length + "\n" +
                "Actual number of tracks: " + actual.tracks.length,
        }
    }

    // verify the clips for each track
    for (const track in actual.tracks) {
        const actualTrack = actual.tracks[track]
        const expectedTrack = expected.tracks[track]

        const actualClips = actualTrack.clips.sort(sortClips)
        const expectedClips = expectedTrack.clips.sort(sortClips)

        console.log(JSON.stringify(actualClips))
        console.log("--------------")
        console.log(JSON.stringify(expectedClips))

        if (!checkSimilarity(actualClips, expectedClips)) {
            return {
                pass: false,
                message: "Differing track " + track + ".\n" +
                    "Expected:\n\n" + JSON.stringify(expectedTrack) + "\n\n" +
                    "Actual:\n\n" + JSON.stringify(actualTrack) + "\n\n",
            }
        }

        // verify the effects on each track
        if (expectedTrack.effects !== undefined &&
            actualTrack.effects !== undefined) {
            if (!checkSimilarity(actualTrack.effects, expectedTrack.effects)) {
                return {
                    pass: false,
                    message: "Differing effects on track " + track + ".\n" +
                        "Expected:\n\n" + JSON.stringify(expectedTrack.effects) + "\n\n" +
                        "Actual:\n\n" + JSON.stringify(actualTrack.effects) + "\n\n",
                }
            }
        }
    }

    return {
        pass: true,
        message: "Results are similar.",
    }
}

/**
 * Sort clips by start measure.
 */
function sortClips(a, b) {
    return a.measure - b.measure
}

/**
 * Looks to see if the actual object contains
 * the same keys with the same values as the expected object. Additional keys
 * that might be in the actual object are ignored.
 *
 * Used to test the compiler since there will be keys like "audio" that are too
 * much work to test. That is, we don't want a strict toEqual() match.
 *
 * @param {Object} actual The actual object to be tested.
 * @param {Object} expected The expected object to be tested against.
 * @returns true if actual is similar to expected
 */
function checkSimilarity(actual, expected) {
    let valid = true

    // can't be equal if they're not the same type
    if (typeof (actual) !== typeof (expected)) {
        return false
    }

    // check floats to within 0.01 margin of error
    if (typeof (actual) === "number" && typeof (expected) === "number" &&
        (actual % 1 !== 0 || expected % 1 !== 0)) {
        const e = 0.01
        return (expected - e <= actual && expected + e >= actual)
    }

    // check primitives
    if (!(actual instanceof Object && expected instanceof Object)) {
        return (actual === expected)
    }

    // recursively check objects
    // Only check keys that are expected, this check does not check for
    // extra keys that might be in the actual object
    for (const key in expected) {
        if (actual[key] === undefined) {
            return false
        }
        if (!checkSimilarity(actual[key], expected[key])) {
            valid = false
        }
    }

    return valid
}

require("kali")
