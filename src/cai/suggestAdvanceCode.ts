import { SuggestionModule, curriculumProgression } from "./suggestionModule"
import { studentModel } from "./student"
import { getApiCalls } from "./complexityCalculator"
import { CodeRecommendation } from "./codeRecommendations"
import  store  from "../reducers"
import * as caiState from "./caiState"
import { savedReport } from "./analysis"
import { CodeFeatures } from "./complexityCalculator"
import { state as ccstate } from "./complexityCalculatorState"



export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => { return generateSuggestion() },
}

function generateSuggestion(): CodeRecommendation {

    console.log("soundProfile",studentModel.musicAttributes.soundProfile)
    console.log("api calls", getApiCalls())
    console.log("curriculum", studentModel.codeKnowledge.curriculum)
    console.log("aggregate complexity", studentModel.codeKnowledge.aggregateComplexity)
    console.log("saved report", savedReport)
    console.log("curriculum progression", curriculumProgression)
    console.log("project delta", caiState.selectProjectHistories(store.getState())[caiState.selectActiveProject(store.getState())])
    console.log("custom functions", ccstate.userFunctionReturns)
    console.log("full student model", studentModel)
    console.log("full ccstate", ccstate)
    

    const state = store.getState()
    const activeProject = caiState.selectActiveProject(state)
    // const projectModel = getModel()


    const potentialSuggestionItems: { [key: string]: { [key: string]: number } } [] = []

    return tree();
}

function tree(): CodeRecommendation {


    var suggestion = {
        id: 0,  // arbitratry index number to be accessed by suggestion decision tree.
        utterance: "",
        explain: "",
        example: "",
    }

    if(Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length == 0) {
        suggestion.utterance = "I think you should write a function with the section you have already created"
    }

    console.log(ccstate.allVariables);

    return suggestion;
}