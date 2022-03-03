/* eslint-env jest */
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import fetchMock from "jest-fetch-mock"

import * as runner from "../../../../scripts/src/app/runner"

fetchMock.enableMocks()
jest.mock("../../../../scripts/src/app/audiolibrary")

beforeEach(() => {
    fetch.resetMocks()
})

const script = "var tempo = \"99\";\n" +
  "tempo = Number(tempo);\n" +
  "setTempo(tempo);\n"

it("should parse numbers in javascript", async () => {
    const runFn = runner.runJavaScript
    try {
        const result = await runFn(script)
        expect(result.tempo).toEqual(99)
    } catch (err) {
        expect(err).toBeNull()
    }
})
