import { CodeRecommendation } from "./codeRecommendations"
import { CodeFeatures } from "./complexityCalculator"

export type Modules = "newCode" | "advanceCode" | "aesthetics"

export interface SuggestionModule {
    weight: number
    suggestion(): CodeRecommendation
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
