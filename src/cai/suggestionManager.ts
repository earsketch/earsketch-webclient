import { CodeRecommendation } from "./codeRecommendations"
import { AdvanceCodeModule } from "./suggestAdvanceCode"
import { AestheticsModule } from "./suggestAesthetics"
import { Modules } from "./suggestionModule"
import { NewCodeModule } from "./suggestNewCode"

const suggestionWeights: { [key in Modules]: number } = {
    newCode: 0,
    advanceCode: 0,
    aesthetics: 0,
}

export function adjustWeights(type: Modules, value: number) {
    suggestionWeights[type] = value
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
