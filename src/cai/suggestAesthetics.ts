import { SuggestionModule } from "./suggestionModule"
import { soundDict } from "../app/recommender"
import { savedReport, soundProfileLookup } from "./analysis"
import { CAI_RECOMMENDATIONS, CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel } from "./projectModel"
import * as caiState from "./caiState"
import store from "../reducers"

export const AestheticsModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        const state = store.getState()
        const activeProject = caiState.selectActiveProject(state)
        const projectModel = getModel()
        const possibleSuggestions: CodeRecommendation[] = []

        if (savedReport.OVERVIEW.measures === 0) {
            // TODO: replace messageList with list of suggested sounds via caiState.
            if (caiState.selectMessageList(state)[activeProject].length === 0) {
                // Suggest a starting sound
                possibleSuggestions.push(CAI_NUCLEI.oneSound)
            } else {
                // Suggest one, two, or three sounds
                possibleSuggestions.push(randomSoundSuggestion())
            }
        }

        // If project is shorter than requirements, recommend adding new sounds/sections.
        if (savedReport.OVERVIEW.measures < projectModel.musicalProperties.lengthMeasures ||
            savedReport.OVERVIEW["length (seconds)"] < projectModel.musicalProperties.lengthSeconds) {
            possibleSuggestions.push({
                id: 0,
                utterance: "",
                explain: "",
                example: "",
            })
        }

        // Suggest instrument from project model in a section lacking that instrument.
        const instrumentRecommendations: CodeRecommendation[] = []
        for (const instrument of projectModel.musicalProperties.instruments) {
            for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
                const sounds = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "sound")
                if (sounds.map((s) => { return soundDict[s].instrument }).includes(instrument)) {
                    const measures = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "measure")
                    instrumentRecommendations.push({
                        id: 0,
                        utterance: "Measures " + measures[0] + "-" + measures[1] + " could use some " + instrument + " sounds.",
                        explain: "",
                        example: "",
                    })
                }
            }
        }
        if (instrumentRecommendations.length) {
            possibleSuggestions.push(instrumentRecommendations[Math.random() * instrumentRecommendations.length])
        }

        // Compare current form against project model form goal.
        if (projectModel.musicalProperties.form) {
            const form = Object.keys(savedReport).join("").replace(/^[a-zA-Z]+$/, "")
            if (form !== projectModel.musicalProperties.form) {
                possibleSuggestions.push({
                    id: 0,
                    utterance: "We want " + projectModel.musicalProperties.form + " form, but our project looks more like an " + form + " form. " +
                    "How about adding a new section?",
                    explain: "",
                    example: "",
                })
            }
        }

        // Suggest effects.
        if (projectModel.api.setEffect) {
            possibleSuggestions.push(CAI_RECOMMENDATIONS.effect)
        }

        return possibleSuggestions[Math.floor(Math.random() * possibleSuggestions.length)]
    },
}

function randomSoundSuggestion() {
    const keys = Object.keys(CAI_NUCLEI)
    return CAI_NUCLEI[keys[Math.floor(Math.random() * keys.length)]]
}
