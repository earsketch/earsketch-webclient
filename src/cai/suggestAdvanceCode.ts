import { suggestionHistory, SuggestionModule, SuggestionOptions, SuggestionContent, weightedRandom, addWeight, curriculumProgression } from "./suggestionModule"
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

const suggestionContent: SuggestionContent = {
    function: { } as CodeRecommendation,
    modularize: { } as CodeRecommendation,
    loop: { } as CodeRecommendation,
    step: { } as CodeRecommendation,
}

export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        // printAccessibleData();

        const possibleSuggestions: SuggestionOptions = {}

        // check if there's any function in the code vs what sound complexity found
        if (Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length === 0) {
            suggestionContent.function = createSimpleSuggestion(0, "I think you should write a function with the section you have already created")
            possibleSuggestions.function = addWeight(suggestionContent.function)
        }

        // check each user defined function if they are called
        for (const functionReturn of ccstate.userFunctionReturns) {
            if (functionReturn.calls.length === 0) {
                suggestionContent.modularize = createSimpleSuggestion(0, "I think you can modularize your code by calling " + functionReturn.name + " at least once")
                possibleSuggestions.modularize = addWeight(suggestionContent.modularize)
            }
        }

        // WBN: functions - repeat execution - : can suggest adding function arguments to code

        // todo: functions - manipulate value : increase score from 2 to 3
        //      - needs to check if function call is used in variable and then referenced somewhere else

        // check for repeated code with fitMedia or makeBeat and suggest a loop
        const loopRecommendations: CodeRecommendation[] = []
        let apiCalls = []
        apiCalls = Object.assign(getApiCalls(), [])
        apiCalls.sort((a, b) => (a.clips[0] <= b.clips[0] ? 1 : -1))
        apiCalls = apiCalls.filter((a) => { return a.function === "fitMedia" || a.function === "makeBeat" })
        for (let i = 2; i < apiCalls.length; i++) {
            if (apiCalls[i].clips[0] === apiCalls[i - 1].clips[0] && apiCalls[i].clips[0] === apiCalls[i - 2].clips[0]) {
                loopRecommendations.push(createSimpleSuggestion(0, "maybe try using a loop since you have a few lines using " + apiCalls[i].clips[0]))
                break
            }
        }
        if (loopRecommendations.length) {
            suggestionContent.instrument = loopRecommendations[Math.floor(Math.random() * loopRecommendations.length)]
            possibleSuggestions.instrument = addWeight(suggestionContent.instrument)
        }

        // WBN: needs count of where a variable is actually called, similar to custom function calls...
        //       - can also increase "manipulate value" score here - use var returned by function
        // for(let i = 0; i < ccstate.allVariables.length; i++ ) {
        //     if(ccstate.allVariables[i].calls.length === 0) {
        //         suggestion.utterance = "there's a defined variable but it hasn't been called yet: ", ccstate.allVariables[i].name;
        //     }
        // }

        // WBN: access list of strings
        //      - check if there are strings that are repeatedly called, or parameters that are repeatedly used
        //          - if they are used more than 3 times than suggest a variable to hold the data
        //      - increase loop score: myList[i] repetition -> loop
        // 1. collect and tally all constants, strings, & numbers
        // 2. for each w/ tally above x, generate codeRecommendation
        // 3. add weight for codeRecommendation

        // WBN: combine previous two functionalities
        //       - check for declared var, and then if text version of content appears later --> suggest to replace string with var: increase score


        // if there is a step value in loop body -> add to range + step (check for 'i' in loop code, then check if incremented in some way)
        const stepRecommendations: CodeRecommendation[] = []

        const scripts = Object.values(selectRegularScripts(store.getState()))
        const currentScript = scripts.find(({ name }) => name === caiState.selectActiveProject(store.getState()))
        const scriptType = currentScript?.name.slice(-2) === "js" ? "javascript" : "python"
        if (currentScript) {
            const currentScriptAST = analyzeCode(scriptType, currentScript.source_code).ast
            console.log(currentScriptAST)
            if (scriptType === "javascript") {
                const loops = currentScriptAST.body.filter(({ _astname }) => _astname === "JSFor") as JsForNode[]
                for (const loop of loops) {
                    if (!loop.test || (loop.test._astname !== "Compare" && loop.test._astname !== "BinOp") || loop.test.left._astname !== "Name") { continue }
                    const comparison = loop.test.left.id.v
                    const assignComparisons = loop.body.filter(({ _astname }) => _astname === "AugAssign") as AugAssignNode[]
                    for (const aC of assignComparisons) {
                        if (aC.target._astname === "Name" && aC.target.id.v === comparison) {
                            stepRecommendations.push(createSimpleSuggestion(0, "you can add a step function since you change " + comparison + " on line " + aC.lineno))
                        }
                    }
                }
            } else if (scriptType === "python") {
                const loops = currentScriptAST.body.filter(({ _astname }) => _astname === "For") as ForNode[]
                for (const loop of loops) {
                    if (!loop.iter || (loop.iter._astname !== "Call" || loop.iter.func._astname !== "Name" || loop.iter.func.id.v !== "range")) { continue }
                    const comparison = loop.target._astname === "Name" ? loop.target.id.v : ""
                    const assignComparisons = loop.body.filter(({ _astname }) => _astname === "AugAssign") as AugAssignNode[]
                    for (const aC of assignComparisons) {
                        if (aC.target._astname === "Name" && aC.target.id.v === comparison) {
                            stepRecommendations.push(createSimpleSuggestion(0, "you can add a step function since you change " + comparison + " on line " + aC.lineno))
                        }
                    }
                }
            }
        }
        if (stepRecommendations.length) {
            suggestionContent.step = stepRecommendations[Math.floor(Math.random() * stepRecommendations.length)]
            possibleSuggestions.step = addWeight(suggestionContent.step)
        }
        const suggIndex = weightedRandom(possibleSuggestions)
        suggestionHistory.push(suggestionContent[suggIndex])
        return suggestionContent[suggIndex]
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
