import { CodeRecommendation } from "./codeRecommendations"
import { AdvanceCodeModule } from "./suggestAdvanceCode"
import { AestheticsModule } from "./suggestAesthetics"
import { Modules } from "./suggestionModule"
import { NewCodeModule } from "./suggestNewCode"

export const curriculumProgression: { [key: number]: { [key: string]: { [key: string]: number } } } = {
    0: { variables: { variables: 1 } },
    1: { makeBeat: { makeBeat: 1 } },
    2: { iteration: { forLoopsRange: 2, forLoopsIterable: 1 } }, // needs special handling as is language-dependent. hrm.
    3: { features: { mathOps: 1 } },
    4: { iteration: { forLoopsRange: 3 } },
    5: { conditionals: { conditionals: 1 } },
    6: { conditionals: { conditionals: 3 } },
    7: { features: { comparisons: 1 } },
    8: { functions: { repeatExecution: 1 } },
    9: { functions: { repeatExecution: 3 } },
    10: { functions: { manipulateValue: 3 } },
    11: { features: { consoleInput: 1 } },
    12: { features: { strOps: 1 } },
    13: { features: { indexing: 1 } },
    14: { makeBeat: { makeBeat: 3 } },
}

const suggestionWeights: { [key in Modules]: number } = {
    newCode: 0.33,
    advanceCode: 0.33,
    aesthetics: 0.33,
}

export function adjustWeights(type: Modules, adjustment: number) {
    const initialWeight = suggestionWeights[type]
    const remainingWeights = Object.keys(suggestionWeights).filter((name) => { return name !== type }) as Modules[]
    const remainder = remainingWeights.reduce((sum, a) => sum + suggestionWeights[a], 0)

    // adjust selected weight to new value: bound to 0, 1
    suggestionWeights[type] = Math.min(Math.max(suggestionWeights[type] + adjustment, 0), 1)
    adjustment = suggestionWeights[type] - initialWeight

    // scale other weights to fill remaining probability
    const adjustedRemainder = remainder - adjustment
    for (const key of remainingWeights) {
        suggestionWeights[key] = suggestionWeights[key] / remainder * adjustedRemainder
    }
}

export function resetWeights() {
    const ratio = 1.0 / Object.keys(suggestionWeights).length
    for (const key of Object.keys(suggestionWeights)) {
        suggestionWeights[key as Modules] = ratio
    }
}

export function generateSuggestion(): CodeRecommendation | null {
    const type = Object.keys(suggestionWeights).reduce((a: Modules, b: Modules) => { return suggestionWeights[a] > suggestionWeights[b] ? a : b }) as Modules

    switch (type) {
        case "newCode":
            return NewCodeModule.suggestion()
        case "advanceCode":
            return AdvanceCodeModule.suggestion()
        case "aesthetics":
            return AestheticsModule.suggestion()
        default:
            return null
    }
}

export function generateAdvanceCodeTest(): CodeRecommendation | null {
    const type = Object.keys(suggestionWeights).reduce((a: Modules, b: Modules) => { return suggestionWeights[a] > suggestionWeights[b] ? a : b }) as Modules

    return AdvanceCodeModule.suggestion()
}
