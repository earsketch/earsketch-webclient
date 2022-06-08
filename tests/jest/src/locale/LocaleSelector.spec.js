/* eslint-env jest */
import { chooseDetectedLanguage } from "../../../../src/top/LocaleSelector"

jest.mock("../../../../src/reducers")

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
