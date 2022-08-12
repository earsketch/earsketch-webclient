/* eslint-env jest */
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import * as runner from "../../../../src/app/runner"

jest.mock("../../../../src/app/audiolibrary")
jest.mock("../../../../src/data/recommendationData")

const script = "var tempo = \"99\";\n" +
  "tempo = Number(tempo);\n" +
  "setTempo(tempo);\n"

const expected = {
    length: 0,
    tracks: expect.arrayContaining([
        expect.objectContaining({
            clips: [],
            effects: {
                "TEMPO-TEMPO": [
                    { track: 0, name: "TEMPO", parameter: "TEMPO", startMeasure: 1, endMeasure: 1, startValue: 120, endValue: 120 },
                    { track: 0, name: "TEMPO", parameter: "TEMPO", startMeasure: 1, endMeasure: 1, startValue: 99, endValue: 99 },
                ],
            },
        }),
    ]),
}

it("should parse numbers in javascript", async () => {
    const result = await runner.run("javascript", script)
    expect(result).toMatchObject(expected)
})
