import { SuggestionModule, SuggestionOptions, SuggestionContent, curriculumProgression, weightedRandom, addWeight } from "./suggestionModule"
import { selectProjectHistories, selectActiveProject, selectRecentProjects } from "./caiState"
import { CodeFeatures } from "./complexityCalculator"
import { analyzeCode } from "./analysis"
import { selectActiveTabScript } from "../ide/tabState"
import store from "../reducers"
import { getModel } from "./projectModel"

const suggestionContent: SuggestionContent = {
    0: { id: 200, utterance: "why don't we use [LINK|variables] to name our sounds so it's easier to swap in new sounds?", explain: "storing our sound samples in a variable lets us use that as a name, and it makes it easier to try different sounds", examplePY: "instead of\n\nfitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 1, 2)\nfitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 3, 4)\n\nwe could write\n\nsynth1 = HIPHOP_SYNTHPLUCKLEAD_005\nfitMedia(synth1, 1, 1, 2)\nfitMedia(synth1, 1, 3, 4)" },
    1: { id: 201, utterance: "we can use [LINK|makeBeat]() to create our own beat for our song", explain: "[LINK|makeBeat] lets us use a string to put a beat we want in our song", examplePY: "something like \n\nmakeBeat(DUBSTEP_FILTERCHORD_002, 1, 1, \"-00-00+++00--0-0\")\n    makeBeat(OS_CLOSEDHAT01, 2, 1, \"0--0--000--00-0-\")" },
    2: { id: 202, utterance: "using a [LINK|for loop] can help us repeat code without having to write it a bunch of times", explain: "for loops (or while loops!) can run code multiple times, which makes it easier for us to put in a bunch of beats or samples", examplePY: "for example, this code:\n\nfor measure in range(1, 5):\n    makeBeat(OS_SNARE03, 1, measure, \"0---0---0-0-0---\")\n\nputs the same beat in measures 1-5 on track 1" },
    5: { id: 205, utterance: "we can use a [LINK|conditional statement] for mixing or to alternate beats in different measures", explain: "[LINK|conditional statement]s let us make EarSketch do different things if a statement is TRUE or FALSE", examplePY: "loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE)\nloudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE)\n\n# If track 1 is louder than track 2, we reduce its volume\nif loudnessTrack1 > loudnessTrack2:\n    setEffect(1, VOLUME, GAIN, -10)" },
    8: { id: 208, utterance: "a custom [LINK|function] can help us write code that we can call again and again", explain: "[LINK|custom function]s can help us make sections of music without having to write too many fitMedia() calls", examplePY: "def sectionA(start, end):\n    fitMedia(melody2, 1, start, end)\n    fitMedia(brass1, 2, start, end)\n    setEffect(2, VOLUME, GAIN, -20, start, -10, end)\nsectionA(1,5)" },
    10: { id: 210, utterance: "we can also use [LINK|function]s to return a value, and use that value somewhere else", explain: "returning values lets us use the outputs of functions in other places", examplePY: "def createBeat(startMeasure, soundClip, beatString):\n    endMeasure = startMeasure + 3\n    for measure in range(startMeasure, endMeasure):\n        makeBeat(soundClip, 1, measure, beatString)\n\n    # Return ending measure so we can use it outside function\n    return endMeasure" },
    11: { id: 211, utterance: "we could let the user control something about our song by using [LINK|console input]", explain: "using readInput() lets us ask the user for input, which we can then pair with a [LINK|conditional statement] to change things about our song based on what the user inputs", examplePY: "clipNumber = readInput(\"Type a clip number between 10 and 46: \")\ndubstepClip = \"DUBSTEP_BASS_WOBBLE_0\"\n    finalClip = dubstepClip + clipNumber\n\n    fitMedia(finalClip, 1, 1, 5)" },
    13: { id: 213, utterance: "using a list with indexing, we could use a version of [LINK|makeBeat] that includes different sounds in the beat", explain: "using the advanced [LINK|makeBeat]() lets us make a beat with as many different sounds as we want", examplePY: "drums = [OS_KICK05, OS_SNARE01]\n    beat = \"0+++1+++0+++1+++\"\n    makeBeat(drums, 1, 3, beat)" },
}

export const NewCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        const state = store.getState()
        const activeProject = selectActiveProject(state)
        const currentState: CodeFeatures = analyzeCode(activeProject.slice(-2) === "js" ? "javascript" : "python", selectActiveTabScript(state).source_code).codeFeatures
        const potentialSuggestions: SuggestionOptions = {}

        // create objects with weight for each topic. add weight to "next in project" topic from "fromOtherProjects" array
        // set up with default weights, then modify, then adjust
        for (const item of findNextCurriculumItems(currentState)) {
            potentialSuggestions[item] = addWeight(suggestionContent[item])
        }
        for (const item of nextItemsFromPreviousProjects(currentState)) {
            potentialSuggestions[item] = addWeight(suggestionContent[item])
        }

        // add weights
        let highestTopic = 0
        for (const [index, feature] of curriculumProgression.entries()) {
            for (const curricTopic of Object.keys(feature)) {
                if (currentState[curricTopic as keyof CodeFeatures] > 0) {
                    highestTopic = index
                }
            }
        }

        // adjust weights: "next in project"
        highestTopic += 1
        while (!potentialSuggestions[highestTopic] && highestTopic < 13) {
            highestTopic += 1
        }
        if (highestTopic <= 13) {
            potentialSuggestions[highestTopic] = addWeight(suggestionContent[highestTopic])
        }

        // get project goals
        const projectModel = getModel()
        for (const suggItem of Object.keys(potentialSuggestions)) {
            // if it's an unmet project model goal, increase weight
            // use key to get curriculum prog
            const curricObj = curriculumProgression[+suggItem]
            for (const [curricTopic, value] of Object.entries(curricObj)) {
                // does the topic match anything in the goal model, and is it unmet?
                if (projectModel.complexityGoals[curricTopic as keyof CodeFeatures] === value &&
                    value > currentState[curricTopic as keyof CodeFeatures]) {
                    // if it is unmet, add weight. also, break.
                    potentialSuggestions[+suggItem] = addWeight(suggestionContent[suggItem])
                    break
                }
            }
        }

        // select weighted random
        if (Object.keys(potentialSuggestions).length > 0) {
            const suggIndex = weightedRandom(potentialSuggestions)
            return suggestionContent[suggIndex]
        }
        return suggestionContent[0]
    },
}

function findNextCurriculumItems(currentState: CodeFeatures): number [] {
    const newCurriculumItems: number [] = []
    const topicIndices: number[] = []

    // find indices of 3 most recent deltas, if they exist
    for (const currDelta of currentProjectDeltas()) {
        for (const [index, curricProgressionItem] of curriculumProgression.entries()) {
            for (const [topicKey, value] of Object.entries(currDelta)) {
                if (Object.keys(curricProgressionItem).includes(topicKey) &&
                    curricProgressionItem[topicKey as keyof CodeFeatures] === value &&
                    !(topicIndices.includes(index))) {
                    topicIndices.push(index)
                }
                if (topicIndices.length >= 3) {
                    break
                }
            }
        }
    }

    for (const i of topicIndices) {
        if (i < 14) {
            let amountToAdd = 1
            while (!suggestionContent[(i + amountToAdd)]) {
                let isInProject = false
                // does this concept already exist in the project?
                if (currentState[Object.keys(curriculumProgression[i])[0] as keyof CodeFeatures] > 0) {
                    isInProject = true
                }
                if (!isInProject) {
                    amountToAdd += 1
                }
            }
            newCurriculumItems.push(i + amountToAdd)
        }
    }
    return newCurriculumItems
}

function currentProjectDeltas(): { [key: string]: number }[] {
    const state = store.getState()
    const projectHistory = selectProjectHistories(state)[selectActiveProject(state)]
    const projectDeltas: { [key: string]: number }[] = []

    // get and then sort and then filter output from the histroy
    if (projectHistory && projectHistory.length > 0) {
        let priorResults = projectHistory[0]
        for (const result of projectHistory.slice(1)) {
            const thisDelta = checkResultsDelta(priorResults, result)
            if (Object.keys(thisDelta).length > 0) {
                projectDeltas.push(Object.assign({}, checkResultsDelta(priorResults, result)))
                priorResults = result
            }
        }
    }
    return projectDeltas
}

function checkResultsDelta(resultsStart: CodeFeatures, resultsEnd: CodeFeatures): { [key: string]: number } {
    const deltaRepresentation: { [key: string]: number } = {}
    for (const key of Object.keys(resultsStart)) {
        if (resultsEnd[key as keyof CodeFeatures] > resultsStart[key as keyof CodeFeatures]) {
            deltaRepresentation[key] = resultsEnd[key as keyof CodeFeatures]
        }
    }
    return deltaRepresentation
}

function nextItemsFromPreviousProjects(currentState: CodeFeatures): number[] {
    // initialize return object
    const returnValues: number[] = []
    const allTopics: { [key: string]: number } = {}
    // get complexity from last ten projects, pulled from caiState
    const recentResults = selectRecentProjects(store.getState())

    // get all topics used
    for (const recentResult of recentResults) {
        for (const topic of Object.keys(recentResult)) {
            if (recentResult[topic as keyof CodeFeatures] > 0) {
                allTopics[topic] = (allTopics[topic] || 0) + 1
            }
        }
    }

    // rank used topics by usage amount
    const allTopicsSorted = Object.entries(allTopics).sort((a, b) => a[1] - b[1])

    // add least-used topics to return values list IF there's a corresponding suggestion.
    for (const topic of allTopicsSorted) {
        // lookup in curriculum progression
        for (const [index, value] of curriculumProgression.entries()) {
            for (const curricTopic of Object.keys(value)) {
                if (topic[0] === curricTopic && suggestionContent[index]) {
                    let isInProject = false
                    // does this concept already exist in the project?
                    if (currentState[Object.keys(curriculumProgression[index])[0] as keyof CodeFeatures] > 0) {
                        isInProject = true
                    }
                    if (!isInProject) {
                        returnValues.push(index)
                    }
                }
            }
        }
        // stop after list is exhausted OR return values has length of 3
        if (returnValues.length >= 3) {
            break
        }
    }

    // return final values
    return returnValues
}
