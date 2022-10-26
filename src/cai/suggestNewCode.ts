import { SuggestionModule, curriculumProgression } from "./suggestionModule"
import { CodeRecommendation } from "./codeRecommendations"
import caiState, { selectProjectHistories, selectActiveProject, selectRecentProjects } from "./caiState"
import { CodeFeatures } from "./complexityCalculator"
import store from "../reducers"
import { state } from "./complexityCalculatorState"

export const NewCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => { return generateSuggestion() },
}

const suggestionContent: { [key: string]: CodeRecommendation } = {

    0: { id: 200, utterance: "why don't we use [LINK|variables] to name our sounds so it's easier to swap in new sounds?", explain: "", example: "" },
    1: { id: 201, utterance: "we can use [LINK|makeBeat]() to create our own beat for our song", explain: "[LINK|makeBeat] lets us use a string to put a beat we want in our song", example: "something like " },
    2: { id: 202, utterance: "using a [LINK|for loop] can help us repeat code without having to write it a bunch of times", explain: "", example: "" },
    5: { id: 205, utterance: "we can use a [LINK|conditional statement] for mixing or to alternate beats in different measures", explain: "", example: "" },
    8: { id: 208, utterance: "a custom [LINK|function] can help us write code that we can call again and again", explain: "", example: "" },
    10: { id: 210, utterance: "we can also use [LINK|function]s to return a value, and use that value somewhere else", explain: "", example: "" },
    11: { id: 211, utterance: "we could let the user control something about our song by using [LINK|console input]", explain: "", example: "" },
    13: { id: 213, utterance: "using a list with indexing, we could use a version of [LINK|makeBeat] that includes different sounds in the beat", explain: "", example: "" },
}

function generateSuggestion(): CodeRecommendation {
    const potentialSuggestionItems: CodeRecommendation [] = []
    const fromRecentDeltas = findNextCurriculumItems()
    const currentState: CodeFeatures = selectProjectHistories(store.getState())[selectActiveProject(store.getState())][0]
    for (const i of fromRecentDeltas) {
        // i["weight"] = { weight: (1 / fromRecentDeltas.length) }
        for (const topicKey in curriculumProgression[i]) {
            for (const conceptKey in curriculumProgression[i][topicKey]) {
                if (currentState[topicKey][conceptKey] < curriculumProgression[i][topicKey][conceptKey]) {
                    potentialSuggestionItems.push(suggestionContent[i])
                }
            }
        }
    }

    if (fromRecentDeltas.length > 0) {
        return suggestionContent[fromRecentDeltas[getRandomInt(fromRecentDeltas.length)]] // TODO THIS IS WRONG AND JUST FOR DEMO PURPOSES
    } else return suggestionContent[0]
}
function getRandomInt(max: number) {
    return Math.floor(Math.random() * max)
}

function findNextCurriculumItems(): number [] {
    const newCurriculumItems: number [] = []
    const conceptIndices: number[] = []
    // find indices of 3 most recent deltas, if they exist

    const currentCurriculumDeltas = currentProjectDeltas()

    for (const currDelta of currentCurriculumDeltas) {
        for (const curricProgressionItem in curriculumProgression) {
            for (const topicKey in currDelta) {
                for (const conceptKey in currDelta[topicKey]) {
                    if (Object.keys(curriculumProgression[curricProgressionItem]).includes(topicKey) && Object.keys(curriculumProgression[curricProgressionItem][topicKey]).includes(conceptKey)) {
                        if (curriculumProgression[curricProgressionItem][topicKey][conceptKey] === currDelta[topicKey][conceptKey]) {
                            if (!(conceptIndices.includes(parseInt(curricProgressionItem)))) {
                                conceptIndices.push(parseInt(curricProgressionItem))
                            }
                        }
                        if (conceptIndices.length >= 3) {
                            break
                        }
                    }
                }
            }
        }
    }

    for (const i of conceptIndices) {
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

function currentProjectDeltas(): { [key: string]: { [key: string]: number } } [] {
    const projectHistory: CodeFeatures[] = selectProjectHistories(store.getState())[selectActiveProject(store.getState())]
    console.log(projectHistory)
    const projectDeltas: { [key: string]: { [key: string]: number } } [] = []
    // get and then sort and then filter output from the histroy
    let priorResults: CodeFeatures | null = null
    for (const result of projectHistory) {
        if (priorResults !== null) {
            const thisDelta = checkResultsDelta(priorResults, result)
            if (Object.keys(thisDelta).length > 0) {
                projectDeltas.push(Object.assign({}, thisDelta))
            }
        }

        priorResults = result
    }

    return projectDeltas
}

function checkResultsDelta(resultsStart: CodeFeatures, resultsEnd: CodeFeatures): { [key: string]: { [key: string]: number } } {
    const deltaRepresentation: { [key: string]: { [key: string]: number } } = {}
    for (const topicKey in resultsStart) {
        for (const conceptKey in resultsStart) {
            if (resultsEnd[topicKey][conceptKey] > resultsStart[topicKey][conceptKey]) {
                deltaRepresentation[topicKey] = { }
                deltaRepresentation[topicKey][conceptKey] = resultsEnd[topicKey][conceptKey]
            }
        }
    }
    return deltaRepresentation
}

function nextItemsFromPreviousProjects(): number[] {
    // initialize return object
    const returnValues: number[] = []
    const allConcepts: { [key: string]: number } = {}
    // get complexity from last ten projects, pulled from caiState
    const recentResults = selectRecentProjects(store.getState())

    // get all concepts used
    for (const recentResult of recentResults) {
        for (const concept in recentResult) {
            for (const topic in recentResult[concept]) {
                if (recentResult[concept][topic] > 0) {
                    if (allConcepts[topic]) {
                        allConcepts[topic] += 1
                    } else {
                        allConcepts[topic] = 1
                    }
                }
            }
        }
    }
    // rank used concepts by usage amount



    // add least-used concepts to return values list IF there's a corresponding suggestion.
    // stop after list is exhausted OR return values has length of 3

    // return final values
    return returnValues
}
