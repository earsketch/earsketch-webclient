import { SuggestionModule, SuggestionOptions, SuggestionContent, weightedRandom, addWeight } from "./suggestionModule"
import { soundDict } from "../app/recommender"
import { savedReport, soundProfileLookup } from "./analysis"
import { CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel } from "./projectModel"
import * as caiState from "./caiState"
import store from "../reducers"

const suggestionContent: SuggestionContent = {
    sound: CAI_NUCLEI.oneSound,
    sounds: randomSoundSuggestion(),
    addMeasures: {
        id: 202,
        utterance: "We can make this song longer.",
        explain: "We can add more measures to a song, either by writing new code or calling a [LINK|function] twice with different parameters.",
        examplePY: "If you write a function with [LINK|fitMedia], you can call it multiple times with different starting and ending times.",
        exampleJS: "If you write a function with [LINK|fitMedia], you can call it multiple times with different starting and ending times.",
    },
    instrument: { } as CodeRecommendation,
    form: { } as CodeRecommendation,
    effect: {
        id: 68,
        examplePY: "something like:\n\n[LINK|setEffect](your_track_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here)",
        exampleJS: "something like:\n\n[LINK|setEffect](your_track_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here);",
        explain: "we can customize our sounds a little more, and it gives us more control",
        utterance: "let's put in some effects with [LINK|setEffect], like a [LINK|filter] or [LINK|volume mixing]",
    },
}

export const AestheticsModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        const state = store.getState()
        const activeProject = caiState.selectActiveProject(state)
        const projectModel = getModel()
        const possibleSuggestions: SuggestionOptions = {}

        // TODO: replace messageList with list of suggested sounds via caiState.
        if (caiState.selectMessageList(state)[activeProject].length === 0) {
            // Suggest a starting sound
            possibleSuggestions.sound = addWeight(suggestionContent.sound)
        } else {
            // Suggest one, two, or three sounds
            possibleSuggestions.sounds = addWeight(suggestionContent.sounds)
        }

        // If project is shorter than requirements, recommend adding new sounds/sections.
        if (savedReport.OVERVIEW.measures < projectModel.musicalProperties.lengthMeasures ||
            savedReport.OVERVIEW["length (seconds)"] < projectModel.musicalProperties.lengthSeconds) {
            possibleSuggestions.addMeasures = addWeight(suggestionContent.addMeasures)
        }

        // Suggest instrument from project model in a section lacking that instrument.
        const instrumentRecommendations: CodeRecommendation[] = []
        for (const instrument of projectModel.musicalProperties.instruments) {
            for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
                const sounds = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "sound")
                if (!sounds.map((s) => { return soundDict[s].instrument }).includes(instrument)) {
                    const measures = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "measure")
                    instrumentRecommendations.push({
                        id: 0,
                        utterance: "Measures " + measures[0] + "-" + measures[1] + " could use some " + instrument + " sounds.",
                        explain: "We can add more sounds to a section using [LINK|fitMedia]. Check the Sound Browser for " + instrument + " sounds.",
                        examplePY: "fitMedia(sound, track, " + measures[0] + ", " + measures[1] + ")",
                        exampleJS: "fitMedia(sound, track, " + measures[0] + ", " + measures[1] + ");",
                    })
                }
            }
        }
        if (instrumentRecommendations.length) {
            suggestionContent.instrument = instrumentRecommendations[Math.floor(Math.random() * instrumentRecommendations.length)]
            possibleSuggestions.instrument = addWeight(suggestionContent.instrument)
        }

        // Compare current form against project model form goal.
        if (projectModel.musicalProperties.form) {
            const form = Object.keys(savedReport).join("").replace(/^[a-zA-Z]+$/, "")
            if (form !== projectModel.musicalProperties.form) {
                suggestionContent.form = {
                    id: 0,
                    utterance: "We want " + projectModel.musicalProperties.form + " form, but our project looks more like " + form + " form. " +
                    "How about adding a new [LINK|section]?",
                    explain: "A [LINK|section] is made up of several measures (musical time units), and it expresses an idea or feeling. Usually, musicians try to add contrast between different sections.",
                    examplePY: "Intros, Verses, Choruses, and Outros are examples of sections.",
                    exampleJS: "Intros, Verses, Choruses, and Outros are examples of sections.",
                }
                possibleSuggestions.form = addWeight(suggestionContent.form)
            }
        }

        // Suggest effects.
        if (projectModel.api.setEffect) {
            possibleSuggestions.effect = addWeight(suggestionContent.effect)
        }

        const suggIndex = weightedRandom(possibleSuggestions)
        return suggestionContent[suggIndex || "sounds"]
    },
}

function randomSoundSuggestion() {
    const keys = Object.keys(CAI_NUCLEI)
    return CAI_NUCLEI[keys[Math.floor(Math.random() * keys.length)]]
}
