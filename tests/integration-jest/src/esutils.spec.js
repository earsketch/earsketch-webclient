/* eslint-env jest */
import { parseLanguage, compareObjStructure } from "../../../scripts/src/esutils"

it("detects py with parseLanguage()", () => {
    expect(parseLanguage("song.py")).toBe("python")
})

it("detects js with parseLanguage()", () => {
    expect(parseLanguage("song.js")).toBe("javascript")
})

it("returns true when two empty objects are passed in", () => {
    expect(compareObjStructure({}, {})).toBe(true)
})

it("compareObjStructure returns true when two fully identical JSON objects are passed in", () => {
    const structA = { a: 1, b: 2, c: 3 }
    const structB = { a: 1, b: 2, c: 3 }
    expect(compareObjStructure(structA, structB)).toBe(true)
})

it("compareObjStructure returns false when two dissimilar JSON objects are passed in", () => {
    const structA = { a: 1, b: 2, c: 3 }
    const structB = { a: 1, b: 2 }
    expect(compareObjStructure(structA, structB)).toBe(false)
})

it("compareObjStructure returns true when two identical JSON structures are passed in with different values", () => {
    const structA = { a: 1, b: 2, c: 3 }
    const structB = { a: 1, b: 2, c: 4 }
    expect(compareObjStructure(structA, structB)).toBe(true)
})

it("compareObjStructure returns true when two deep JSON structures are passed in", () => {
    const structA = { a: 1, b: 2, c: { d: 3, e: 4 } }
    const structB = { a: 1, b: 2, c: { d: 3, e: 4 } }
    expect(compareObjStructure(structA, structB)).toBe(true)
})

it("compareObjStructure returns false when two deep, but dissimilar JSON objects are passed in", () => {
    const structA = { a: 1, b: 2, c: { d: 3, e: 4 } }
    const structB = { a: 1, b: 2, c: { d: 3 } }
    expect(compareObjStructure(structA, structB)).toBe(false)
})
