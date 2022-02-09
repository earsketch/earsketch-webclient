/* eslint-env jest */
import { parseLanguage } from "../../../scripts/src/esutils"

it("detects py with parseLanguage()", () => {
    expect(parseLanguage("song.py")).toBe("python")
})

it("detects js with parseLanguage()", () => {
    expect(parseLanguage("song.js")).toBe("javascript")
})
