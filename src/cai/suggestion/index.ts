import { AdvanceCodeModule } from "./advanceCode"
import { AestheticsModule } from "./aesthetics"
import { CodeRecommendation } from "./codeRecommendations"
import { Modules, suggestionHistory, SuggestionModule } from "./module"
import { NewCodeModule } from "./newCode"

export const suggestionModules: { [key in Modules]: SuggestionModule } = {
    newCode: NewCodeModule,
    advanceCode: AdvanceCodeModule,
    aesthetics: AestheticsModule,
}

// Initalize weights
resetWeights()

export function adjustWeights(type: Modules, adjustment: number) {
    for (const module of Object.values(suggestionModules)) {
        if (!module.weight) {
            resetWeights()
        }
    }
    const initialWeight = suggestionModules[type].weight
    const remainingModules = Object.keys(suggestionModules).filter((name) => { return name !== type }) as Modules[]
    const remainder = remainingModules.reduce((sum, a) => sum + suggestionModules[a].weight, 0)

    // adjust selected weight to new value: bound to 0, 1
    suggestionModules[type].weight = Math.min(Math.max(suggestionModules[type].weight + adjustment, 0), 1)
    adjustment = suggestionModules[type].weight - initialWeight

    // scale other weights to fill remaining probability
    const adjustedRemainder = remainder - adjustment
    for (const key of remainingModules) {
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
    const type = typeOverride || selectModule()
    const suggestion = { ...suggestionModules[type].suggestion() }

    adjustWeights(type, -0.2)
    suggestionHistory.push(suggestion)
    return suggestion
}

function selectModule(): Modules {
    const modules = Object.keys(suggestionModules) as Modules[]

    // create cumulative list of weighted sums, then generate a random number in that range.
    let sum = 0
    const cumulativeWeights = modules.map((a) => {
        sum += suggestionModules[a].weight
        return sum
    })
    const randomNumber = Math.random() * sum

    // return the module with weight range containing the randomly selected number.
    for (const idx in modules) {
        if (cumulativeWeights[idx] >= randomNumber) {
            return modules[idx]
        }
    }

    // Default: return first option.
    return modules[0]
}
