import { SuggestionModule, SuggestionOptions, SuggestionContent, weightedRandom, addWeight } from "./suggestionModule"
import { soundDict } from "../app/recommender"
import { soundProfileLookup } from "./analysis"
import { CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel, allForms } from "./projectModel"
import * as caiState from "./caiState"
import store from "../reducers"

const suggestionContent: SuggestionContent = {
    sound: CAI_NUCLEI.oneSound,
    sounds: randomSoundSuggestion(),
    addMeasures: {
        id: 300,
        utterance: "we could make this song longer",
        explain: "we can add more measures to a song, either by writing new code or calling a [LINK|function] twice with different parameters",
        examplePY: "if you write a function with [LINK|fitMedia], you can call it multiple times with different start and end measures",
        exampleJS: "if you write a function with [LINK|fitMedia], you can call it multiple times with different start and end measures",
    },
    instrument: { } as CodeRecommendation,
    form: { } as CodeRecommendation,
    effect: {
        id: 301,
        examplePY: "something like:\n\n[LINK|setEffect](your_track_number_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here)",
        exampleJS: "something like:\n\n[LINK|setEffect](your_track_number_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here);",
        explain: "we can customize our sounds a little more, and it gives us more control",
        utterance: "let's put in some effects with [LINK|setEffect], like a [LINK|filter] or [LINK|volume mixing]",
    },
}

export const AestheticsModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        const state = store.getState()
        const activeProject = caiState.selectActiveProject(state)
        const soundHistory = caiState.selectSoundHistories(state)[activeProject]
        const savedReport = soundHistory ? soundHistory[soundHistory.length - 1] : undefined
        const projectModel = getModel()
        const possibleSuggestions: SuggestionOptions = {}

        // TODO: replace messageList with list of suggested sounds via caiState.
        if (caiState.selectMessageList(state)[activeProject].length === 0) {
            // Suggest a starting sound
            possibleSuggestions.sound = addWeight(suggestionContent.sound, 0.1, 0.1)
        } else {
            // Suggest one, two, or three sounds
            possibleSuggestions.sounds = addWeight(suggestionContent.sounds, 0.1, 0.1)
        }

        // If project is shorter than requirements, recommend adding new sounds/sections.
        if (!savedReport || savedReport.OVERVIEW.measures < projectModel.musicalProperties.lengthMeasures ||
            savedReport.OVERVIEW["length (seconds)"] < projectModel.musicalProperties.lengthSeconds) {
            possibleSuggestions.addMeasures = addWeight(suggestionContent.addMeasures)
        }

        // Suggest instrument from project model in a section lacking that instrument.
        const instrumentRecommendations: CodeRecommendation[] = []
        if (savedReport) {
            const sections = Object.keys(savedReport.SOUNDPROFILE)
            for (const section of sections) {
                let instrumentsList = projectModel.musicalProperties.instruments
                if (!instrumentsList.length) {
                    instrumentsList = []
                    const measures = soundProfileLookup(savedReport.SOUNDPROFILE, "section", sections.find(s => s !== section) || sections[0], "measure") as number []
                    for (const measure of measures) {
                        for (const item of savedReport.MEASUREVIEW[measure]) {
                            if (item.instrument && !instrumentsList.includes(item.instrument)) {
                                instrumentsList.push(item.instrument)
                            }
                        }
                    }
                }
                const sounds = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "sound")
                for (const instrument of instrumentsList) {
                    if (!sounds.map((s) => { return soundDict[s].instrument }).includes(instrument)) {
                        const measures = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "measure")
                        instrumentRecommendations.push({
                            id: 302,
                            utterance: "measures " + measures[0] + "-" + measures[1] + " could use some " + instrument + " sounds",
                            explain: "we can add more sounds to a section using [LINK|fitMedia]. we can check the sound browser for " + instrument + " sounds",
                            examplePY: "[LINK|fitMedia](sound, track, " + measures[0] + ", " + measures[1] + ")",
                            exampleJS: "[LINK|fitMedia](sound, track, " + measures[0] + ", " + measures[1] + ");",
                        })
                    }
                }
            }
        }
        if (instrumentRecommendations.length) {
            suggestionContent.instrument = instrumentRecommendations[Math.floor(Math.random() * instrumentRecommendations.length)]
            possibleSuggestions.instrument = addWeight(suggestionContent.instrument, 0.30, 0.15)
        }

        // Compare current form against project model form goal.
        if (savedReport) {
            const formRequirement = projectModel.musicalProperties.form
            const formGoal = formRequirement || allForms[Math.floor(Math.random() * allForms.length)]
            const form = Object.keys(savedReport.SOUNDPROFILE).join("").replace(/[^A-Za-z0-9]/g, "")
            if (form && form !== formGoal) {
                suggestionContent.form = {
                    id: 303,
                    utterance: (formRequirement ? ("We want '" + formGoal + "' form, but o") : "O") + "ur project looks " + (formRequirement && "more ") + "like '" + form + "' form. " +
                    "how about " + (!formRequirement && ("making it '" + formGoal + "' by ")) + "adding or removing a [LINK|section]?",
                    explain: "a [LINK|section] is made up of several measures (musical time units), and it expresses an idea or feeling. usually, musicians try to add contrast between different sections",
                    examplePY: "intros, verses, choruses, and outros are examples of [LINK|section]s.",
                    exampleJS: "intros, verses, choruses, and outros are examples of [LINK|section]s.",
                }
                possibleSuggestions.form = addWeight(suggestionContent.form)
            }
        }

        // Suggest effects.
        if (savedReport && savedReport.OVERVIEW.measures) {
            possibleSuggestions.effect = addWeight(suggestionContent.effect, projectModel.api.setEffect ? 0.15 : 0.3, projectModel.api.setEffect ? 0.05 : 0.1)
        }

        const suggIndex = weightedRandom(possibleSuggestions)
        return suggestionContent[suggIndex || "sounds"]
    },
}

function randomSoundSuggestion() {
    const keys = Object.keys(CAI_NUCLEI)
    return CAI_NUCLEI[keys[Math.floor(Math.random() * keys.length)]]
}
