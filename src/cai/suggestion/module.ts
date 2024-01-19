import { CodeFeatures } from "../complexityCalculator"
import { CodeRecommendation } from "./codeRecommendations"

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
