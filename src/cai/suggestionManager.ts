import { CodeRecommendation } from "./codeRecommendations"
import { AdvanceCodeModule } from "./suggestAdvanceCode"
import { AestheticsModule } from "./suggestAesthetics"
import { Modules, SuggestionModule } from "./suggestionModule"
import { NewCodeModule } from "./suggestNewCode"

const suggestionModules: { [key in Modules]: SuggestionModule } = {
    newCode: NewCodeModule,
    advanceCode: AdvanceCodeModule,
    aesthetics: AestheticsModule,
}
resetWeights()

export function adjustWeights(type: Modules, adjustment: number) {
    const initialWeight = suggestionModules[type].weight
    const remainingWeights = Object.keys(suggestionModules).filter((name) => { return name !== type }) as Modules[]
    const remainder = remainingWeights.reduce((sum, a) => sum + suggestionModules[a].weight, 0)

    // adjust selected weight to new value: bound to 0, 1
    suggestionModules[type].weight = Math.min(Math.max(suggestionModules[type].weight + adjustment, 0), 1)
    adjustment = suggestionModules[type].weight - initialWeight

    // scale other weights to fill remaining probability
    const adjustedRemainder = remainder - adjustment
    for (const key of remainingWeights) {
        suggestionModules[key].weight = suggestionModules[key].weight / remainder * adjustedRemainder
    }
}

export function resetWeights() {
    const modules = Object.values(suggestionModules)
    const ratio = 1.0 / modules.length
    for (const module of modules) {
        module.weight = ratio
    }
}

export function generateSuggestion(typeOverride?: Modules): CodeRecommendation | null {
    const type = typeOverride || Object.keys(suggestionModules).reduce((a: Modules, b: Modules) => { return suggestionModules[a] > suggestionModules[b] ? a : b }) as Modules
    return suggestionModules[type].suggestion()
}
