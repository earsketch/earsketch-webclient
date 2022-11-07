import { SuggestionModule, curriculumProgression } from "./suggestionModule"
import { studentModel } from "./student"
import { getApiCalls, CodeFeatures } from "./complexityCalculator"
import { CodeRecommendation } from "./codeRecommendations"
import store from "../reducers"
import * as caiState from "./caiState"
import { savedReport } from "./analysis"
import { state as ccstate } from "./complexityCalculatorState"

export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        // // data that can be accessed
        // console.log("soundProfile",studentModel.musicAttributes.soundProfile) // effect, measure, numberofsubsec, sounds, subsec
        // console.log("saved report", savedReport) // apicalls, measureview, mixing, overview, soundprofile, variables
        // console.log(store.getState(),caiState.selectActiveProject(store.getState())) // need to parse
        // console.log("full ccstate", ccstate) // allVar, apiCalls, codeStructure, functionLines, listFuncs, loopLocations, strFuncs, studentCode, uncalledFunctionLines, userFunctionReturns

        // // to use
        // console.log("api calls", getApiCalls()) // --> need calls
        // console.log("aggregate complexity", studentModel.codeKnowledge.aggregateComplexity) // -> need
        // console.log("project delta", caiState.selectProjectHistories(store.getState())[caiState.selectActiveProject(store.getState())]) // history of changes? --> need
        // console.log("curriculum", studentModel.codeKnowledge.curriculum) // --> tracks pages opened
        // console.log("curriculum progression", curriculumProgression) // --> follow newCode
        // console.log("custom functions", ccstate.userFunctionReturns) // --> correct

        const state = store.getState()
        const suggestion = {
            id: 0, // arbitratry index number to be accessed by suggestion decision tree.
            utterance: "",
            explain: "",
            example: "",
        }

        // check if function in code vs what sound complexity found
        if (Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length === 0) {
            suggestion.utterance = "I think you should write a function with the section you have already created"
        }

        // works but unknown functions listed as well
        for (const func of ccstate.userFunctionReturns) {
            if (func.calls.length === 0) {
                suggestion.utterance = "I think you can modularize your code by calling " + func.name + " at least once"
            } else if (func.calls.length === 1) {
                suggestion.utterance = "Functions can be helpful when they're used multiple times, maybe consider using" + func.name + " again"
            }
        }

        // // variables from other files here? not sure from where
        // // needs count of where a variable is actually called, similar to custom function calls...
        // for(let i = 0; i < ccstate.allVariables.length; i++ ) {
        //     if(ccstate.allVariables[i].calls.length === 0) {
        //         suggestion.utterance = "there's a defined variable but it hasn't been called yet: ", ccstate.allVariables[i].name;
        //     }
        // }

        // check for repeated code with fitMedia and suggest a loop
        let apiCalls = []
        apiCalls = Object.assign(getApiCalls(), [])
        apiCalls.sort((a, b) => (a.clips[0] <= b.clips[0] ? 1 : -1))
        apiCalls = apiCalls.filter((a) => { return a.function === "fitMedia" })
        // console.log("sorted calls")
        for (let i = 2; i < apiCalls.length; i++) {
            if (apiCalls[i].clips[0] === apiCalls[i - 1].clips[0] && apiCalls[i].clips[0] === apiCalls[i - 2].clips[0]) {
                suggestion.utterance = "maybe try using a loop since you have a few fitMedias using " + apiCalls[i].clips[0]
                break
            }
        }

        // console.log(suggestion.utterance);

        return suggestion
    },
}
