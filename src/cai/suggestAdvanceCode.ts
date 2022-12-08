import { SuggestionModule, curriculumProgression, suggestionHistory } from "./suggestionModule"
import { studentModel } from "./student"
import { getApiCalls, ForNode, JsForNode, AugAssignNode } from "./complexityCalculator" // CodeFeatures
import { CodeRecommendation } from "./codeRecommendations"
import store from "../reducers"
import * as caiState from "./caiState"
import { savedReport, analyzeCode } from "./analysis"
import { state as ccstate } from "./complexityCalculatorState"

import { selectRegularScripts } from "../browser/scriptsState"

// main input: soundProfile + APICalls + / CurricProg + 10 avg scripts
// specific calls: ccstate.userFunctionReturns, getApiCalls(), ccstate.allVariables --> need calls

// TODO
/*
    - set up weights to change between options, instead of as random
*/

/* WBN
    - shorter code: if/else statement logic -> place in variables
*/

export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        // printAccessibleData();

        const possibleSuggestions: CodeRecommendation[] = []

        // check if there's any function in the code vs what sound complexity found
        // todo: check function lines for corresponding sections via SoundProfileLookup
        if (Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length === 0) {
            possibleSuggestions.push(createSimpleSuggestion(0, "I think you should write a function with the section you have already created"))
        }

        // check each user defined function if they are called
        for (const functionReturn of ccstate.userFunctionReturns) {
            if (functionReturn.calls.length === 0) {
                possibleSuggestions.push(createSimpleSuggestion(0, "I think you can modularize your code by calling " + functionReturn.name + " at least once"))
            }
        }

        // check for repeated code with fitMedia or makeBeat and suggest a loop
        let apiCalls = []
        apiCalls = Object.assign(getApiCalls(), [])
        apiCalls.sort((a, b) => (a.clips[0] <= b.clips[0] ? 1 : -1))
        apiCalls = apiCalls.filter((a) => { return a.function === "fitMedia" || a.function === "makeBeat" })
        for (let i = 2; i < apiCalls.length; i++) {
            if (apiCalls[i].clips[0] === apiCalls[i - 1].clips[0] && apiCalls[i].clips[0] === apiCalls[i - 2].clips[0]) {
                possibleSuggestions.push(createSimpleSuggestion(0, "maybe try using a loop since you have a few lines using " + apiCalls[i].clips[0]))
                break
            }
        }

        // TODO: needs count of where a variable is actually called, similar to custom function calls...
        //       - can also increase "manipulate value" score here - use var returned by function
        // for(let i = 0; i < ccstate.allVariables.length; i++ ) {
        //     if(ccstate.allVariables[i].calls.length === 0) {
        //         suggestion.utterance = "there's a defined variable but it hasn't been called yet: ", ccstate.allVariables[i].name;
        //     }
        // }

        // TODO: access list of strings
        //      - check if there are strings that are repeatedly called, or parameters that are repeatedly used
        //          - if they are used more than 3 times than suggest a variable to hold the data
        //      - increase loop score: myList[i] repetition -> loop
        // 1. collect and tally all constants, strings, & numbers
        // 2. for each w/ tally above x, generate codeRecommendation
        // 3. add weight for codeRecommendation

        // TODO: combine previous two functionalities
        //       - check for declared var, and then if text version of content appears later --> suggest to replace string with var: increase score

        // TODO: increase loop score
        //      - loop + if/else range -> add a range to the loop (check for if/else in loop code, then check if 'i' is in logical condition)
        const scripts = Object.values(selectRegularScripts(store.getState()))
        const currentScript = scripts.find(({ name }) => name === caiState.selectActiveProject(store.getState()))
        const scriptType = currentScript?.name.slice(-2) === "js" ? "javascript" : "python"
        if (currentScript) {
            const currentScriptAST = analyzeCode(scriptType, currentScript.source_code).ast

            const loops = scriptType === "javascript"
                ? currentScriptAST.body.filter(({ _astname }) => _astname === "JSFor") as JsForNode[]
                : currentScriptAST.body.filter(({ _astname }) => _astname === "For") as ForNode[]
            for (const loop of loops) {
                const test = loop._astname === "JSFor" ? loop.test : loop.iter
                if (!test || (test._astname !== "Compare" && test._astname !== "BinOp") || test.left._astname !== "Name") { continue }
                const comparison = test.left.id.v
                const assignComparisons = loop.body.filter(({ _astname }) => _astname === "AugAssign") as AugAssignNode[]
                for (const aC of assignComparisons) {
                    if (aC.target._astname === "Name" && aC.target.id.v === comparison) {
                        possibleSuggestions.push(createSimpleSuggestion(0, "you can add a step function since you change " + comparison + " on line " + aC.lineno))
                    }
                }
            }
        }

        console.log("all suggestions: ", possibleSuggestions)
        const loc = Math.floor(Math.random() * possibleSuggestions.length)
        const suggestion = possibleSuggestions[loc]
        console.log("picked suggestion: ", suggestion, loc)
        suggestionHistory.push(suggestion)
        return suggestion
    },
}

function createSimpleSuggestion(id?: number, utterance?: string, explain?: string, example?: string): CodeRecommendation {
    return {
        id: id || 0,
        utterance: utterance || "",
        explain: explain || "",
        example: example || "",
    }
}

function printAccessibleData() {
    // data that can be accessed
    console.log("soundProfile", studentModel.musicAttributes.soundProfile) // effect, measure, numberofsubsec, sounds, subsec

    console.log("saved report", savedReport) // apicalls, measureview, mixing, overview, soundprofile, variables
    console.log("full ccstate", ccstate) // allVar, apiCalls, codeStructure, functionLines, listFuncs, loopLocations, strFuncs, studentCode, uncalledFunctionLines, userFunctionReturns

    console.log("active project state: ", store.getState(), caiState.selectActiveProject(store.getState())) // need to parse

    console.log("recentproject state: ", caiState.selectRecentProjects(store.getState())) //  this is missing custom function score?
    console.log("aggregate complexity", studentModel.codeKnowledge.aggregateComplexity) // -> need
    console.log("project history, active project, state project delta", caiState.selectProjectHistories(store.getState())[caiState.selectActiveProject(store.getState())]) // history of changes? --> need , most recent score

    console.log("curriculum progression", curriculumProgression) // --> follow newCode
}
