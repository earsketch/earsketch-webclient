import { beforeEach, expect, it, vi } from "vitest"

import { TempoMap } from "../../../../src/app/tempo"
import * as player from "../../../../src/audio/player"
import { setTempoMap } from "../../../../src/daw/dawState"
import { getTempoMap } from "../../../../src/extensions/extensionApi"
import store from "../../../../src/reducers"

vi.mock("../../../../src/audio/player", () => ({
    getPosition: vi.fn(),
}))
vi.mock("../../../../src/data/recommendationData")

beforeEach(() => {
    vi.restoreAllMocks()
})

it("returns serializable tempo points and the clock time at the latest measure", () => {
    const points = [
        { measure: 1, tempo: 120 },
        { measure: 5, tempo: 90 },
    ]
    store.dispatch(setTempoMap(new TempoMap(points)))
    vi.mocked(player.getPosition).mockReturnValue(3.25)
    vi.spyOn(Date, "now").mockReturnValue(1_788_881_234_567)

    const result = getTempoMap()

    expect(result).toEqual({
        tempoMap: points,
        latestBeatTimestamp: {
            timestamp: 1_788_881_234_567,
            measure: 3.25,
        },
    })
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
})
