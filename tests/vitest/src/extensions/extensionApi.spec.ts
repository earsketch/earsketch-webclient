import { beforeEach, expect, it, vi } from "vitest"

import { TempoMap } from "../../../../src/app/tempo"
import * as player from "../../../../src/audio/player"
import { setTempoMap } from "../../../../src/daw/dawState"
import { getTempoMap, pasteCode } from "../../../../src/extensions/extensionApi"
import * as editor from "../../../../src/ide/Editor"
import store from "../../../../src/reducers"

vi.mock("../../../../src/audio/player", () => ({
    getPosition: vi.fn(),
}))
vi.mock("../../../../src/ide/Editor", () => ({
    insertCodeAtLine: vi.fn(),
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

it("inserts extension code at the requested line", () => {
    vi.mocked(editor.insertCodeAtLine).mockReturnValue({ success: true, lineNumber: 4 })

    expect(pasteCode({ code: "fitMedia(YG_TRAP_KICK_1, 1, 1, 2)", lineNumber: 4 })).toEqual({
        success: true,
        lineNumber: 4,
    })
    expect(editor.insertCodeAtLine).toHaveBeenCalledWith("fitMedia(YG_TRAP_KICK_1, 1, 1, 2)", 4)
})

it.each([
    [{ lineNumber: 2 }, "code must be a string"],
    [{ code: "setTempo(120)" }, "lineNumber must be an integer"],
    [{ code: "setTempo(120)", lineNumber: 1.5 }, "lineNumber must be an integer"],
] as const)("rejects an invalid pasteCode request", (request, error) => {
    expect(pasteCode(request)).toEqual({ error })
    expect(editor.insertCodeAtLine).not.toHaveBeenCalled()
})
