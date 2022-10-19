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

export function generateSuggestion(typeOverride?: Modules): CodeRecommendation | null {
    const type = typeOverride || Object.keys(suggestionWeights).reduce((a: Modules, b: Modules) => { return suggestionWeights[a] > suggestionWeights[b] ? a : b }) as Modules

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
