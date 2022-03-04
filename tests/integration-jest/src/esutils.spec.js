/* eslint-env jest */
import * as esutils from "../../../scripts/src/esutils"

test.each([
    { measure: 2, tempo: -1, timeSignature: 4, expected: 2.0 },
    { measure: 2, tempo: 120, timeSignature: 4, expected: 2.0 },
    { measure: 1, tempo: 99, timeSignature: 4, expected: 0.0 },
    { measure: 3, tempo: 220, timeSignature: 4, expected: 2.18181818 },
    { measure: 9.25, tempo: 88, timeSignature: 4, expected: 22.5 },
    { measure: 10, tempo: 110, timeSignature: 3, expected: 14.727272727 },
])("measureToTime($measure, $tempo, timeSignature)", ({ measure, tempo, timeSignature, expected }) => {
    expect(esutils.measureToTime(measure, tempo, timeSignature)).toBeCloseTo(expected, 8)
})

test.each([
    { filename: "song.py", expected: "python" },
    { filename: "song.js", expected: "javascript" },
])("parseLanguage($filename)", ({ filename, expected }) => {
    expect(esutils.parseLanguage(filename)).toBe(expected)
})

test.each([
    { filename: "test.abc", expected: "test" },
    { filename: "test", expected: "test" },
    { filename: "test.test.abc", expected: "test.test" },
])("parseName($filename)", ({ filename, expected }) => {
    expect(esutils.parseName(filename)).toBe(expected)
})

test.each([
    { value: 0.123456789, expected: 0.12346 },
    { value: 0.123, expected: 0.12300 },
])("toPrecision($value)", ({ value, expected }) => {
    expect(esutils.toPrecision(value)).toBe(expected)
})

test.each([
    { value: 0.123456789, digits: 5, expected: 0.12346 },
    { value: 0.123, digits: 8, expected: 0.12300000 },
])("toPrecision($value, $digits)", ({ value, expected }) => {
    expect(esutils.toPrecision(value)).toBe(expected)
})

test.each([
    { desc: "empty objects", expected: true, objA: {}, objB: {} },
    { desc: "identical objects", expected: true, objA: { a: 1, b: 2, c: 3 }, objB: { a: 1, b: 2, c: 3 } },
    { desc: "dissimilar objects", expected: false, objA: { a: 1, b: 2, c: 3 }, objB: { a: 1, b: 2 } },
    { desc: "same props diff values", expected: true, objA: { a: 1, b: 2, c: 3 }, objB: { a: 1, b: 2, c: 4 } },
    { desc: "nested objects", expected: true, objA: { a: 1, b: 2, c: { d: 3, e: 4 } }, objB: { a: 1, b: 2, c: { d: 3, e: 4 } } },
    { desc: "dissimilar nested", expected: false, objA: { a: 1, b: 2, c: { d: 3, e: 4 } }, objB: { a: 1, b: 2, c: { d: 3 } } },
])("compareObjStructure($desc)", ({ objA, objB, expected }) => {
    expect(esutils.compareObjStructure(objA, objB)).toBe(expected)
})
