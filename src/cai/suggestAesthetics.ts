import { SuggestionModule } from "./suggestionModule"
import { savedReport } from "./analysis"
import { CAI_RECOMMENDATIONS, CAI_NUCLEI } from "./codeRecommendations"
import { getModel } from "./projectModel"
import * as caiState from "./caiState"
import store from "../reducers"

export const AestheticsModule: SuggestionModule = {
    name: "aesthetics",
    suggestion: () => {
        const state = store.getState()
        const activeProject = caiState.selectActiveProject(state)
        const projectModel = getModel()

        if (savedReport.OVERVIEW.measures === 0) {
            // TODO: replace messageList with list of suggested sounds via caiState.
            if (caiState.selectMessageList(state)[activeProject].length === 0) {
                // Suggest a starting sound
                return CAI_NUCLEI.oneSound
            } else {
                // Suggest one, two, or three sounds
                const keys = Object.keys(CAI_NUCLEI)
                return CAI_NUCLEI[keys[Math.floor(Math.random() * keys.length)]] || CAI_NUCLEI.oneSound
            }
        }

        if (projectModel.musicalProperties.instruments.length === 0) {
            return CAI_RECOMMENDATIONS.instrument
        }

        if (projectModel.api.setEffect === 0) {
            return CAI_RECOMMENDATIONS.effect
        }

        return null
    },
}
