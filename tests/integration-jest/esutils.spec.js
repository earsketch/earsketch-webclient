/* eslint-env jest */
import { parseLanguage } from "../../scripts/src/esutils"

describe("Test suite for esutils", () => {
    it("parseLanguage() of py filename", () => {})
    expect(parseLanguage("song.py")).toBe("python")

    it("parseLanguage() of js filename", () => {})
    expect(parseLanguage("song.js")).toBe("javascript")
})
