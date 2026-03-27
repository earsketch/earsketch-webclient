import { expect, it, vi } from "vitest"
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import * as runner from "../../../../src/app/runner"

vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

it("should parse numbers in javascript", async () => {
    const script = `
var tempo = "99"
tempo = Number(tempo)
setTempo(tempo)
`.trim()

    const expected = {
        length: 0,
        tracks: expect.arrayContaining([
            expect.objectContaining({
                clips: [],
                effects: {
                    TEMPO: {
                        TEMPO: expect.arrayContaining([
                            { measure: 1, value: 99, shape: "square", sourceLine: 3 },
                        ]),
                    },
                },
            }),
        ]),
    }
    const result = await runner.run("javascript", script)
    expect(result).toMatchObject(expected)
})

it("should check for NaN", async () => {
    await expect(runner.run("javascript", "setTempo(NaN)")).rejects.toThrow(/NaN/)
})
