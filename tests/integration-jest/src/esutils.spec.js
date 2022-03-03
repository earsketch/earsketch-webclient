/* eslint-env jest */
import * as esutils from "../../../scripts/src/esutils"

it("detects py with parseLanguage()", () => {
    expect(esutils.parseLanguage("song.py")).toBe("python")
})

it("detects js with parseLanguage()", () => {
    expect(esutils.parseLanguage("song.js")).toBe("javascript")
})

test.each([
    { measure: 2, tempo: -1, timeSignature: 4, expected: 2.0 },
    { measure: 2, tempo: 120, timeSignature: 4, expected: 2.0 },
    { measure: 1, tempo: 99, timeSignature: 4, expected: 0.0 },
    { measure: 3, tempo: 220, timeSignature: 4, expected: 2.18181818 },
    { measure: 9.25, tempo: 88, timeSignature: 4, expected: 22.5 },
    { measure: 10, tempo: 110, timeSignature: 3, expected: 14.727272727 },
])(".measureToTime($measure, $tempo, timeSignature)", ({ measure, tempo, timeSignature, expected }) => {
    expect(esutils.measureToTime(measure, tempo, timeSignature)).toBeCloseTo(expected, 8)
})
