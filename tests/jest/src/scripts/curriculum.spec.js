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
                "TEMPO-TEMPO": expect.objectContaining([
                    { measure: 1, value: 120, shape: "square" },
                    { measure: 1, value: 99, shape: "square" },
                ]),
            },
        }),
    ]),
}

it("should parse numbers in javascript", async () => {
    const result = await runner.run("javascript", script)
    expect(result).toMatchObject(expected)
})
