import { SuggestionModule } from "./suggestionModule"
import { CodeRecommendation } from "./codeRecommendations"
import { curriculumProgression } from "./suggestionManager"

export const NewCodeModule: SuggestionModule = {
    name: "newCode",
    suggestion: () => { return generateSuggestion() },
}

function generateSuggestion(): CodeRecommendation {
    // empty return to make the linter happy
    const potentialSuggestionItems: { [key: string]: { [key: string]: number } } [] = []
    const fromRecentDeltas = findNextCurriculumItems()

    for (const i of fromRecentDeltas) {
        i["weight"] = { weight: 0.33 }
        potentialSuggestionItems.push(Object.assign({}, i))
    }

    return {
        id: 0, // arbitratry index number to be accessed by suggestion decision tree.
        utterance: "",
        explain: "",
        example: "",
    }
}

function findNextCurriculumItems(): { [key: string]: { [key: string]: number } } [] {
    const newCurriculumItems: { [key: string]: { [key: string]: number } } [] = []
    const conceptIndices: number[] = []
    // find indices of 3 most recent deltas, if they exist

    for (const i of conceptIndices) {
        if (i < 14) {
            newCurriculumItems.push(Object.assign({}, curriculumProgression[conceptIndices[i + 1]]))
        }
    }
    return newCurriculumItems
}