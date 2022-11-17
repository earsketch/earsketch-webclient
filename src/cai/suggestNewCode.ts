import { SuggestionModule, SuggestionOptions, SuggestionContent, curriculumProgression, suggestionHistory, weightedRandom } from "./suggestionModule"
import { selectProjectHistories, selectActiveProject, selectRecentProjects } from "./caiState"
import { CodeFeatures } from "./complexityCalculator"
import store from "../reducers"
import { getModel } from "./projectModel"

const suggestionContent: SuggestionContent = {
    0: { id: 200, utterance: "why don't we use [LINK|variables] to name our sounds so it's easier to swap in new sounds?", explain: "", example: "" },
    1: { id: 201, utterance: "we can use [LINK|makeBeat]() to create our own beat for our song", explain: "[LINK|makeBeat] lets us use a string to put a beat we want in our song", example: "something like " },
    2: { id: 202, utterance: "using a [LINK|for loop] can help us repeat code without having to write it a bunch of times", explain: "", example: "" },
    5: { id: 205, utterance: "we can use a [LINK|conditional statement] for mixing or to alternate beats in different measures", explain: "", example: "" },
    8: { id: 208, utterance: "a custom [LINK|function] can help us write code that we can call again and again", explain: "", example: "" },
    10: { id: 210, utterance: "we can also use [LINK|function]s to return a value, and use that value somewhere else", explain: "", example: "" },
    11: { id: 211, utterance: "we could let the user control something about our song by using [LINK|console input]", explain: "", example: "" },
    13: { id: 213, utterance: "using a list with indexing, we could use a version of [LINK|makeBeat] that includes different sounds in the beat", explain: "", example: "" },
}

export const NewCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        const state = store.getState()
        const currentState: CodeFeatures = selectProjectHistories(state)[selectActiveProject(state)][0]
        const potentialSuggestions: SuggestionOptions = {}

        // create objects with weight for each topic. add weight to "next in project" topic from "fromOtherProjects" array
        // set up with default weights, then modify, then adjust
        for (const item of findNextCurriculumItems()) {
            potentialSuggestions[item] = 0.1
        }
        for (const item of nextItemsFromPreviousProjects()) {
            potentialSuggestions[item] = (potentialSuggestions[item] || 0) + 0.15
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
        potentialSuggestions[highestTopic] += 0.1

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
                    potentialSuggestions[+suggItem] += 0.2
                    break
                }
            }
        }

        // select weighted random
        if (Object.keys(potentialSuggestions).length > 0) {
            const suggIndex = weightedRandom(potentialSuggestions)
            suggestionHistory.push(suggestionContent[suggIndex])
            return suggestionContent[suggIndex]
        }
        suggestionHistory.push(suggestionContent[0])
        return suggestionContent[0]
    },
}

function findNextCurriculumItems(): number [] {
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
                amountToAdd += 1
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
    let priorResults = projectHistory[0]
    for (const result of projectHistory.slice(1)) {
        const thisDelta = checkResultsDelta(priorResults, result)
        if (Object.keys(thisDelta).length > 0) {
            projectDeltas.push(Object.assign({}, checkResultsDelta(priorResults, result)))
            priorResults = result
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

function nextItemsFromPreviousProjects(): number[] {
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
                    returnValues.push(index)
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
