/* eslint-env jest */
import * as esutils from "../../../src/esutils"

const measuresAndTimes = [
    { measure: 2, tempo: -1, timeSignature: 4, time: 2.0 },
    { measure: 2, tempo: 120, timeSignature: 4, time: 2.0 },
    { measure: 1, tempo: 99, timeSignature: 4, time: 0.0 },
    { measure: 3, tempo: 220, timeSignature: 4, time: 2.18181818 },
    { measure: 9.25, tempo: 88, timeSignature: 4, time: 22.5 },
    { measure: 10, tempo: 110, timeSignature: 3, time: 14.727272727 },
]

test.each(measuresAndTimes)("measureToTime($measure, $tempo, $timeSignature)", ({ measure, tempo, timeSignature, time }) => {
    expect(esutils.measureToTime(measure, tempo, timeSignature)).toBeCloseTo(time, 8)
})

test.each(measuresAndTimes)("timeToMeasureDelta($time, $tempo, $timeSignature)", ({ measure, tempo, timeSignature, time }) => {
    // NOTE: The `-1` is because this returns a measure difference rather than an absolute position.
    expect(esutils.timeToMeasureDelta(time, tempo, timeSignature)).toBeCloseTo(measure - 1, 8)
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
    { filename: "test.py", expected: ".py" },
    { filename: "", expected: "" },
    { filename: "test1234", expected: "" },
    { filename: "test.js", expected: ".js" },
])("parseExt($filename)", ({ filename, expected }) => {
    expect(esutils.parseExt(filename)).toBe(expected)
})

test.each([
    { datestring: "2019-04-22 16:14:28.0Zxx", expected: 1555949668000 },
    { datestring: "2022-03-04 14:14:14.6Zxx", expected: 1646403254600 },
    { datestring: "2022-03-04 14:14:14.9Zxx", expected: 1646403254900 },
    { datestring: "2000-05-26 01:01:01.1Zxx", expected: 959302861100 },
])("parseDate($datestring)", ({ datestring, expected }) => {
    expect(esutils.parseDate(datestring)).toBe(expected)
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

test.each([
    { input: "mocha", expected: null },
    { input: "mocha!", expected: ["!"] },
    { input: "/{mocha?", expected: ["/", "{", "?"] },
])("checkIllegalCharacters($input)", ({ input, expected }) => {
    expect(esutils.checkIllegalCharacters(input)).toStrictEqual(expected)
})
