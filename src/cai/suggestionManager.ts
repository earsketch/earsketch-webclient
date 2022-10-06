import { CodeRecommendation } from "./codeRecommendations"
import { AdvanceCodeModule } from "./suggestAdvanceCode"
import { AestheticsModule } from "./suggestAesthetics"
import { Modules } from "./suggestionModule"
import { NewCodeModule } from "./suggestNewCode"

const suggestionWeights: { [key in Modules]: number } = {
    newCode: 0.33,
    advanceCode: 0.33,
    aesthetics: 0.33,
}

export function adjustWeights(type: Modules, adjustment: number) {
    adjustment = Math.min(Math.max(adjustment, -1), 1)
    const remainder = Object.values(suggestionWeights).reduce((sum, a) => sum + a, 0) - suggestionWeights[type]
    const adjustedRemainder = remainder - adjustment
    for (const key of Object.keys(suggestionWeights)) {
        if (key === type) {
            suggestionWeights[key] += adjustment
        } else {
            suggestionWeights[key as Modules] = suggestionWeights[key as Modules] / remainder * adjustedRemainder
        }
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
