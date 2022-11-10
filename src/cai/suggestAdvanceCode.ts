import { SuggestionModule, curriculumProgression } from "./suggestionModule"
import { studentModel } from "./student"
import { getApiCalls, CodeFeatures } from "./complexityCalculator"
import { CodeRecommendation } from "./codeRecommendations"
import store from "../reducers"
import * as caiState from "./caiState"
import { savedReport } from "./analysis"
import { state as ccstate } from "./complexityCalculatorState"


// data: ccstate.userFunctionReturns, getApiCalls(), ccstate.allVariables --> need calls, 
// TODO: set up weights to change between options, instead of as random

// TODO
/*
    - most recently used concept from cc2 score
    - soundProfile + APICalls + / CurricProg + 10 avg scripts
    - function or loop
        same section of lines repeated
    - shorter code: if/else statements
    - loop paramters : check for range values in body
*/

export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {

        // printAccessibleData();

        const possibleSuggestions: CodeRecommendation[] = []

        const state = store.getState()

        let suggestion : CodeRecommendation;

        // check if there's any function in the code vs what sound complexity found
        if(Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length == 0) {
            possibleSuggestions.push( createSimpleSuggestion(0, "I think you should write a function with the section you have already created"))
        }

        // check each user defined function if they are called
        for(let i = 0; i < ccstate.userFunctionReturns.length; i ++ ) {
            if(ccstate.userFunctionReturns[i].calls.length == 0) {
                console.log("no call")
                possibleSuggestions.push( createSimpleSuggestion(0, "I think you can modularize your code by calling " + ccstate.userFunctionReturns[i].name + " at least once"))
            }
        }

        // check for repeated code with fitMedia or makeBeat and suggest a loop
        let apiCalls = [];
        apiCalls = Object.assign(getApiCalls(), []);
        apiCalls.sort((a,b) => (a.clips[0] <= b.clips[0] ? 1 : -1))
        apiCalls = apiCalls.filter( (a) => { return a.function == "fitMedia" || a.function == "makeBeat"})
        // console.log("sorted calls")
        for(let i = 2; i < apiCalls.length; i ++ ) {
            if(apiCalls[i].clips[0] == apiCalls[i-1].clips[0] && apiCalls[i].clips[0] == apiCalls[i-2].clips[0]) {
                possibleSuggestions.push( createSimpleSuggestion(0,"maybe try using a loop since you have a few lines using " + apiCalls[i].clips[0]))
                break;
            }
        }

        // // TODO: needs count of where a variable is actually called, similar to custom function calls...
        // for(let i = 0; i < ccstate.allVariables.length; i++ ) {
        //     if(ccstate.allVariables[i].calls.length === 0) {
        //         suggestion.utterance = "there's a defined variable but it hasn't been called yet: ", ccstate.allVariables[i].name;
        //     }
        // }

        // TODO: access list of strings
        // check if there are strings that are repeatedly called, or parameters that are repeatedly used
        // if they are used more than 2 times than suggest a variable to hold the data


        console.log("all suggestions: ", possibleSuggestions);
        let loc =Math.floor(Math.random() * possibleSuggestions.length)
        suggestion  = possibleSuggestions[loc]
        console.log("picked suggestion: ", suggestion, loc)
        return suggestion;
    },
}

function createSimpleSuggestion(id?: number, utterance?: string, explain?: string, example?: string) : CodeRecommendation {
    return {
        id: id || 0,
        utterance: utterance || "",
        explain: explain || "",
        example: example || "",
    }
}

function printAccessibleData() {
     // data that can be accessed
     console.log("soundProfile",studentModel.musicAttributes.soundProfile) // effect, measure, numberofsubsec, sounds, subsec

     console.log("saved report", savedReport) // apicalls, measureview, mixing, overview, soundprofile, variables
     console.log("full ccstate", ccstate) // allVar, apiCalls, codeStructure, functionLines, listFuncs, loopLocations, strFuncs, studentCode, uncalledFunctionLines, userFunctionReturns

     console.log("active project state: ", store.getState(),caiState.selectActiveProject(store.getState())) // need to parse

     // to use
     console.log("recentproject state: ", caiState.selectRecentProjects(store.getState())) //  this is missing custom function score?
     console.log("aggregate complexity", studentModel.codeKnowledge.aggregateComplexity) // -> need
     console.log("project history, active project, state project delta", caiState.selectProjectHistories(store.getState())[caiState.selectActiveProject(store.getState())]) // history of changes? --> need , most recent score

     console.log("curriculum progression", curriculumProgression) // --> follow newCode
}