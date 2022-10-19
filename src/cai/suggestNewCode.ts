import { SuggestionModule } from "./suggestionModule"
import { CodeRecommendation } from "./codeRecommendations"
import { curriculumProgression } from "./suggestionManager"
import { selectProjectHistories, selectActiveProject } from "./caiState"
import { CodeFeatures } from "./complexityCalculator"
import store from "../reducers"

export const NewCodeModule: SuggestionModule = {
    name: "newCode",
    suggestion: () => { return generateSuggestion() },
}

const suggestionContent: { [key: string]: CodeRecommendation } = {

    1: { id: 200, utterance: "content 1", explain: "", example: "" },
    2: { id: 201, utterance: "content 2", explain: "", example: "" },
    3: { id: 202, utterance: "content 3", explain: "", example: "" },
    4: { id: 203, utterance: "content 4", explain: "", example: "" },
    5: { id: 204, utterance: "content 5", explain: "", example: "" },
    6: { id: 205, utterance: "content 6", explain: "", example: "" },
    7: { id: 206, utterance: "content 7", explain: "", example: "" },
    8: { id: 207, utterance: "content 8", explain: "", example: "" },
    9: { id: 208, utterance: "content 9", explain: "", example: "" },
    10: { id: 209, utterance: "content 10", explain: "", example: "" },
    11: { id: 210, utterance: "content 11", explain: "", example: "" },
    12: { id: 211, utterance: "content 12", explain: "", example: "" },
    13: { id: 212, utterance: "content 13", explain: "", example: "" },
    14: { id: 213, utterance: "content 14", explain: "", example: "" },
}

function generateSuggestion(): CodeRecommendation | null {
    const potentialSuggestionItems: { [key: string]: { [key: string]: number } } [] = []
    const fromRecentDeltas = findNextCurriculumItems()

    for (const i of fromRecentDeltas) {
        
        // i["weight"] = { weight: (1 / fromRecentDeltas.length) }
        // potentialSuggestionItems.push(Object.assign({}, i))
    }

    if (fromRecentDeltas.length > 0) {
        return suggestionContent[getRandomInt(fromRecentDeltas.length - 1)] // TODO THIS IS WRONG AND JUST FOR DEMO PURPOSES
    } else return null
}
function getRandomInt(max) {
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
                            conceptIndices.push(parseInt(curricProgressionItem))
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
            newCurriculumItems.push(i + 1)
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

function checkResultsDelta(resultsStart, resultsEnd): { [key: string]: { [key: string]: number } } {
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
