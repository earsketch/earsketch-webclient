import * as player from "../audio/player"
import { selectTempoMap } from "../daw/dawState"
import * as editor from "../ide/Editor"
import store from "../reducers"

export const getTempoMap = () => {
    const state = store.getState()
    const measure = player.getPosition()
    const timestamp = Date.now()
    return {
        tempoMap: selectTempoMap(state).points,
        latestBeatTimestamp: {
            timestamp,
            measure,
        },
    }
}

interface PasteCodeRequest {
    code?: unknown
    lineNumber?: unknown
}

export const pasteCode = (request: PasteCodeRequest) => {
    if (typeof request?.code !== "string") {
        return { error: "code must be a string" }
    }
    if (typeof request.lineNumber !== "number" || !Number.isInteger(request.lineNumber)) {
        return { error: "lineNumber must be an integer" }
    }
    return editor.insertCodeAtLine(request.code, request.lineNumber)
}
