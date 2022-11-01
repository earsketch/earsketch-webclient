import { SuggestionModule, curriculumProgression } from "./suggestionModule"
import { CodeRecommendation } from "./codeRecommendations"
import { selectProjectHistories, selectActiveProject, selectRecentProjects } from "./caiState"
import { CodeFeatures } from "./complexityCalculator"
import store from "../reducers"
import { getModel } from "./projectModel"

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
    const potentialSuggestionItems: { [key: number]: number } = {}
    const fromRecentDeltas = findNextCurriculumItems()
    const fromOtherProjects = nextItemsFromPreviousProjects()
    const currentState: CodeFeatures = selectProjectHistories(store.getState())[selectActiveProject(store.getState())][0]

    // create objects with weight for each topic. add weight to "next in project" topic and topics from "fromOtherProjects" array
    // set up with default weights, then modify, then adjust
    for (const i of fromRecentDeltas) {
        potentialSuggestionItems[i] = 0.1
    }
    for (const i of fromOtherProjects) {
        if (potentialSuggestionItems[i]) {
            potentialSuggestionItems[i] += 0.15
        } else {
            potentialSuggestionItems[i] = 0.15
        }
    }

    // add weights
    let highestConcept = 0
    let conceptIndex = 0
    while (conceptIndex < 15) {
        for (const curricConcept in curriculumProgression[conceptIndex]) {
            for (const curricTopic in curriculumProgression[conceptIndex][curricConcept]) {
                if (currentState[curricConcept][curricTopic] > 0) {
                    highestConcept = conceptIndex
                }
            }
        }
        conceptIndex++
    }

    // adjust weights

    // "next in project"
    highestConcept += 1
    while (!potentialSuggestionItems[highestConcept] && highestConcept <= 13) {
        highestConcept += 1
    }
    if (highestConcept <= 13) {
        potentialSuggestionItems[highestConcept] += 0.1
    }

    // get project goals
    for (const suggItem in potentialSuggestionItems) {
        // if it's an unmet project model goal, increase weight
        // use key to get curriculum prog
        const curricObj = curriculumProgression[suggItem]
        for (const curricConcept in curricObj) {
            for (const curricTopic in curricObj[curricConcept]) {
                // does the concept match anything in the goal model?
                if (getModel().complexityGoals[curricConcept][curricTopic] === curricObj[curricConcept][curricTopic]) {
                    // is it unmet
                    if (curricObj[curricConcept][curricTopic] > currentState[curricConcept][curricTopic]) {
                        // if it is unmet, add weight. also, break.
                        potentialSuggestionItems[suggItem] += 0.2
                        break
                    }
                }
            }
        }
    }

    // scale weights
    let weightTotal = 0
    for (const weightedItem in potentialSuggestionItems) {
        weightTotal += potentialSuggestionItems[weightedItem]
    }
    const multiplier = 1 / weightTotal
    for (const weightedItem in potentialSuggestionItems) {
        potentialSuggestionItems[weightedItem] *= multiplier
    }

    // select weighted random
    if (Object.keys(potentialSuggestionItems).length > 0) {
        const suggs = Object.keys(potentialSuggestionItems)

        // create cumulative list of weighted sums, then generate a random number in that range.
        let sum: number = 0
        const cumulativeWeights = suggs.map((a) => {
            sum += potentialSuggestionItems[a]
            return sum
        })
        const randomNumber = Math.random() * sum
        let suggIndex: string = "0"
        // return the module with weight range containing the randomly selected number.
        suggs.forEach((module, idx) => {
            if (cumulativeWeights[idx] >= randomNumber) {
                suggIndex = module
            }
        })
        return suggestionContent[suggIndex]
    }
    return suggestionContent[0]
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

    const allConceptsSorted = Object.entries(allConcepts).sort((a, b) => a[1] - b[1])

    // add least-used concepts to return values list IF there's a corresponding suggestion.
    for (const topic of allConceptsSorted) {
        // lookup in curriculum progression
        for (const curricProg in curriculumProgression) {
            for (const curricConcept in curriculumProgression[curricProg]) {
                for (const curricTopic in curriculumProgression[curricProg][curricConcept]) {
                    const curricNum = parseInt(curricProg)
                    if (topic[0] === curricTopic && suggestionContent[curricNum]) {
                        returnValues.push(curricNum)
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
