import * as player from "../audio/player"
import { selectTempoMap } from "../daw/dawState"
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
