/* eslint-env jest */
import { parseLanguage, parseExt } from "../../../scripts/src/esutils"

it("detects py with parseLanguage()", () => {
    expect(parseLanguage("song.py")).toBe("python")
})

it("detects js with parseLanguage()", () => {
    expect(parseLanguage("song.js")).toBe("javascript")
})

it("parseExt outputs python as the correct extension", () => {
    expect(parseExt("test.py")).toBe(".py")
})

it("parseExt returns an empty string when given an empty string", () => {
    expect(parseExt("")).toBe("")
})

it("parseExt returns an empty string when given a string with no trailing extension", () => {
    expect(parseExt("test1234")).toBe("")
})

it("parseExt outputs js as the correct extension for test.js", () => {
    expect(parseExt("test.js")).toBe(".js")
})
