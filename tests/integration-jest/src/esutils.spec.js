/* eslint-env jest */
import { parseLanguage } from "../../../scripts/src/esutils"
import { parseExt } from "../../../scripts/src/esutils"

it("detects py with parseLanguage()", () => {
    expect(parseLanguage("song.py")).toBe("python")
})

it("detects js with parseLanguage()", () => {
    expect(parseLanguage("song.js")).toBe("javascript")
})

it("outputs python as the correct extension", () => {
    expect(parseExt("test.py")).toBe(".py")
})

it("fails when there are no extensions", () => {
    expect(parseExt("")).toBe("")
})

it("outputs js as the correct extension", () => {
    expect(parseExt("test.js")).toBe(".js")
})
