import { SuggestionModule } from "./suggestionModule"
import { studentModel } from "./student"
import { curriculumProgression } from "./suggestionManager"
import { getApiCalls } from "./complexityCalculator"
import { CodeRecommendation } from "./codeRecommendations"

export const AdvanceCodeModule: SuggestionModule = {
    name: "advanceCode",
    suggestion: () => { return generateSuggestion() },
}

function generateSuggestion(): CodeRecommendation {
    // console.log(getApiCalls());
    // console.log(studentModel.musicAttributes.soundProfile);
    // console.log(studentModel);

    const potentialSuggestionItems: { [key: string]: { [key: string]: number } } [] = []

    return {
        id: 0, // arbitratry index number to be accessed by suggestion decision tree.
        utterance: "",
        explain: "",
        example: "",
    }
}
