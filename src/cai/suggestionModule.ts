import { CodeFeatures } from "./complexityCalculator"

// Code recommendations to be given by CAI.
export interface CodeRecommendation {
    id: number, // arbitratry index number to be accessed by suggestion decision tree.
    utterance: string,
    explain?: string,
    examplePY?: string,
    exampleJS?: string,
}

export type Modules = "newCode" | "advanceCode" | "aesthetics"

export interface SuggestionOptions {
    [key: string]: number
}

export interface SuggestionContent {
    [key: string]: CodeRecommendation
}

export interface SuggestionModule {
    weight: number
    suggestion(): CodeRecommendation
}

export const suggestionHistory: CodeRecommendation[] = []

export function addWeight(content: CodeRecommendation, maxWeight: number = 0.15, minWeight: number = 0.05) {
    return !suggestionHistory.some(e => e.id === content.id) ? maxWeight : minWeight
}

export function weightedRandom(potentialSuggestions: SuggestionOptions) {
    const suggs = Object.keys(potentialSuggestions)
    // create cumulative list of weighted sums, then generate a random number in that range.
    let sum: number = 0
    const cumulativeWeights = suggs.map((a) => {
        sum += potentialSuggestions[a]
        return sum
    })
    const randomNumber = Math.random() * sum
    let suggIndex: string = "0"

    for (const idx in suggs) {
        if (cumulativeWeights[idx] >= randomNumber) {
            suggIndex = suggs[idx]
            break
        }
    }

    return suggIndex
}

export const curriculumProgression: { [Property in keyof CodeFeatures]?: number } [] = [
    { variables: 1 },
    { makeBeat: 1 },
    { forLoopsRange: 2, forLoopsIterable: 1 }, // needs special handling as is language-dependent. hrm.
    { binOps: 1 },
    { forLoopsRange: 3 },
    { conditionals: 1 },
    { conditionals: 3 },
    { comparisons: 1 },
    { repeatExecution: 1 },
    { repeatExecution: 3 },
    { manipulateValue: 3 },
    { consoleInput: 1 },
    { strOps: 1 },
    { indexing: 1 },
    { makeBeat: 3 },
]

// Generic sound-based recommendations, with no explanations or examples. Selected at random when the user asks CAI for a suggestion and there are no others available.
export const CAI_NUCLEI: { [key: string]: CodeRecommendation } = {
    oneSound: {
        id: 55,
        utterance: "we could try [sound_rec]",
    },
    twoSound: {
        id: 56,
        utterance: "what about adding [sound_rec] and [sound_rec] next?",
    },
    maybeSound: {
        id: 60,
        utterance: "maybe we could put in [sound_rec]?",
    },
}
