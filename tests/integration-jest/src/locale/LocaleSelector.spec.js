/* eslint-env jest */
// TODO: the import of curriculumState in LocaleSelector causes a dependency chain all the way up to audioContext.ts. Maybe we could decouple this?
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import { chooseDetectedLanguage } from "../../../../scripts/src/top/LocaleSelector"

jest.mock("../../../../scripts/src/reducers")

test.each([
    { detected: undefined, expected: "en" },
    { detected: ["en"], expected: "en" },
    { detected: ["en-US"], expected: "en" },
    { detected: "en", expected: "en" },
    { detected: "ES", expected: "es" },
    { detected: "en-US", expected: "en" },
    { detected: "z", expected: "en" },
    { detected: "", expected: "en" },
    { detected: "es-MX", expected: "es" },
    { detected: ["z", "x", "es"], expected: "es" },
    { detected: ["z", "x", "es-MX"], expected: "es" },
])("chooseDetectedLanguage($detected)", ({ detected, expected }) => {
    expect(chooseDetectedLanguage(detected)).toBe(expected)
})
