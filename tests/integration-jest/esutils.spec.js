import { parseLanguage } from "../../scripts/src/esutils"

describe('Test suite for esutils', function () {

    it("parseLanguage() of py filename", function () {})
        expect(parseLanguage("song.py")).toBe("python")

    it("parseLanguage() of js filename", function () {})
        expect(parseLanguage("song.js")).toBe("javascript")

})
