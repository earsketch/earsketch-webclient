import { SuggestionModule, SuggestionOptions, SuggestionContent, weightedRandom, addWeight } from "./suggestionModule"
import { studentModel } from "./student"
import { getApiCalls, ForNode, JsForNode, AugAssignNode, CodeFeatures } from "./complexityCalculator" // CodeFeatures
import { selectActiveProject, selectProjectHistories } from "./caiState"
import { CodeRecommendation } from "./codeRecommendations"
import store from "../reducers"
import { analyzeCode } from "./analysis"
import { state as ccstate } from "./complexityCalculatorState"
import { getModel } from "./projectModel"

import { selectActiveTabScript } from "../ide/tabState"

// main input: soundProfile + APICalls + / CurricProg + 10 avg scripts
// specific calls: ccstate.userFunctionReturns, getApiCalls(), ccstate.allVariables

/* WBN
    - shorter code: if/else statement logic -> place in variables
*/

const suggestionContent: SuggestionContent = {
    function: { } as CodeRecommendation,
    modularize: { } as CodeRecommendation,
    loop: { } as CodeRecommendation,
    step: { } as CodeRecommendation,
    variables2: {
        id: 214,
        utterance: "one of the things variables let us do is hold different values in different parts of our script",
        explain: "we already declare some variables, so if we want to put a different value in there later in the code, we can do that",
        examplePY: "synth = HIPHOP_SYNTHPLUCKLEAD_005\n\n        fitMedia(synth, 1, 1, 2)\n        fitMedia(synth, 1, 3, 4)\n\n               synth = HIPHOP_SOLOMOOGLEAD_001\n\nfitMedia(synth, 1, 4, 5)\n        fitMedia(synth, 1, 2, 3)        ",
        exampleJS: "var synth = HIPHOP_SYNTHPLUCKLEAD_005;\n\n        fitMedia(synth, 1, 1, 2);\n        fitMedia(synth, 1, 3, 4);\n\n               synth = HIPHOP_SOLOMOOGLEAD_001;\n\nfitMedia(synth, 1, 4, 5);\n        fitMedia(synth, 1, 2, 3);        ",
    },
    makeBeat2: {
        id: 215,
        utterance: "we could use the advanced [LINK|makeBeat] and add more sounds to our beat",
        explain: "the advanced [LINK|makeBeat] lets us create a beat with multiple samples by using list indexing",
        examplePY: "drums = [OS_KICK05, OS_SNARE01]\n        beat = \"0+++1+++0+++1+++\"\n        makeBeat(drums, 1, 3, beat)",
        exampleJS: "var drums = [OS_KICK05, OS_SNARE01];\n        var beat = \"0+++1+++0+++1+++\";\n        makeBeat(drums, 1, 3, beat);",
    },
    forLoopsRange2: {
        id: 216,
        utterance: "we could add a minimum value to our range()",
        explain: "that would give us a little more control over what the loop does by giving it a start and end value",
        examplePY: "for measure in range(1, 5):\n         makeBeat(OS_SNARE03, 1, measure, \"0---0---0-0-0---\")",
    },
    forLoopsRange3: {
        id: 217,
        utterance: "we could add a step value to our range() to skip values if we want",
        explain: "we can do something like putting sounds in every other measure or every third measure",
        examplePY: "for measure in range(1, 9, 2):\n         makeBeat(OS_SNARE03, 1, measure, \"0---0---0-0-0---\")",
    },
    conditionals2: {
        id: 218,
        utterance: "let's add an else portion for our [LINK|conditional] to do something if the condition is FALSE",
        explain: "this means we can have the code do something no matter what the condition works out to",
        examplePY: "a = readInput(\"Do you like hip-hop music? Yes/No.\")\n        \n\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\"):\n      print(\"Hip-hop it is!\") \n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9)        \nelse:    \n     print(\"Ok, here is some funk.\")    \n fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9)",
        exampleJS: "var a = readInput(\"Do you like hip-hop music? Yes/No.\");\n        \n\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\") {\n      println(\"Hip-hop it is!\"); \n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9);\n} else {    \n     println(\"Ok, here is some funk.\");   \n fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9);\n}",
    },
    conditionals3: {
        id: 219,
        utterance: "we can also add \"else if\" portions to follow more than two paths based on the conditions",
        explain: "with this we can have the code do more than two paths within our one conditional statement",
        examplePY: "a = readInput(\"Do you like hip-hop music? Yes/No.\")\n        \n\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\"):\n      print(\"Hip-hop it is!\") \n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9)        \nelif (a == \"no\" or a == \"No\" or a == \"NO\"):    \n     print(\"Ok, here is some funk.\")    \n fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9)\n else:\n     print(\"Sorry, I didn't get that. Please enter Yes or No.\")",
        exampleJS: "var a = readInput(\"Do you like hip-hop music? Yes/No.\");\n        \n\nif (a == \"yes\" or a == \"Yes\" or a == \"YES\") {\n      println(\"Hip-hop it is!\");\n    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9);\n} else if (a == \"no\" or a == \"No\" or a == \"NO\") {    \n     println(\"Ok, here is some funk.\");    \n fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9);\n} else {\n     println(\"Sorry, I didn't get that. Please enter Yes or No.\");\n}",
    },
    repeatExecution2: {
        id: 220,
        utterance: "since we have a function to modularize our code, let's call it more than once to take advantage of it",
    },
    repeatExecution3: {
        id: 221,
        utterance: "let's use function [LINK|parameters] so we can use our function to do similar things but not always exactly the same thing.",
        explain: "using parameters means we can specify some things about the function when we call it, like using different sounds in fitMedia calls",
        examplePY: "def sectionA(startMeasure, endMeasure):\n        fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, startMeasure, endMeasure)\n        fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure)  \n\n    sectionA(1, 5)\n    sectionA(9, 13)",
        exampleJS: "function sectionA(startMeasure, endMeasure) {\n        fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, startMeasure, endMeasure);\n        fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure); \n}  \n\n    sectionA(1, 5);\n    sectionA(9, 13);",
    },
    manipulateValue2: {
        id: 222,
        utterance: "since we have a function to create or change a value, let's call it more than once to take advantage of it",
    },
    manipulateValue3: {
        id: 223,
        utterance: "we can also use our returned value somewhere",
        explain: "since we return a value, we can use that as input for something else, like using the end measure returned from one section as the start measure for the next section",
        examplePY: "def createBeat(startMeasure, soundClip, beatString):\n        endMeasure = startMeasure + 3\n        for measure in range(startMeasure, endMeasure):\n            makeBeat(soundClip, 1, measure, beatString)\n\n        # Return ending measure so we can use it outside function\n        return endMeasure",
        exampleJS: "function createBeat(startMeasure, soundClip, beatString) {\n        var endMeasure = startMeasure + 3;\n        for (i = startMeasure; i <= endMeasure; i++) {\n            makeBeat(soundClip, 1, measure, beatString);\n}\n\n        # Return ending measure so we can use it outside function\n        return endMeasure\n}",
    },
}

export const AdvanceCodeModule: SuggestionModule = {
    weight: 0,
    suggestion: () => {
        // printAccessibleData();
        const state = store.getState()
        const currentScript = selectActiveTabScript(state)
        const activeProject = selectActiveProject(state)
        const currentState: CodeFeatures = analyzeCode(activeProject.slice(-2) === "js" ? "javascript" : "python", selectActiveTabScript(state).source_code).codeFeatures

        const possibleSuggestions: SuggestionOptions = {} // todo: should this stay const since it will definitely change?

        const modRecommentations: CodeRecommendation[] = []

        // check for unmet complexity goals in existing code concepts. if any, add related suggestion to possible suggestions
        const projectModel = getModel()
        for (const complexityItem in (projectModel.complexityGoals)) {
            // check against existing complexity
            if (currentState[complexityItem as keyof CodeFeatures] < projectModel.complexityGoals[complexityItem as keyof CodeFeatures] && currentState[complexityItem as keyof CodeFeatures] > 0) {
                // if there IS an unmet complexity goal in an EXISTING concept, find the "next step up" suggestion, add it to possible suggestions, and add weight.
                let newSuggName = complexityItem as string
                const newNum = (currentState[complexityItem as keyof CodeFeatures] + 1) as unknown as string
                newSuggName = newSuggName + newNum
                possibleSuggestions[newSuggName] = addWeight(suggestionContent[newSuggName])
            }
        }

        // check for most recently added concepts and add ++s for each.
        const currDelts = currentProjectDeltas().reverse()
        const recentAdds: string[] = []
        for (const topicsList of currDelts) {
            if (recentAdds.length + topicsList.length <= 3) {
                for (const addition of topicsList) {
                    recentAdds.push(addition)
                }
            } else {
                // select at random till list is full
                while (recentAdds.length < 3 && topicsList.length > 0) {
                    const randIndex = Math.floor(Math.random() * topicsList.length)
                    recentAdds.push(topicsList[randIndex])
                    topicsList.splice(randIndex, 1)
                }
            }
        }

        for (const topic of recentAdds) {
            let newSuggName = topic
            const newNum = (currentState[topic as keyof CodeFeatures] + 1) as unknown as string
            newSuggName = newSuggName + newNum
            if (!possibleSuggestions[newSuggName]) {
                possibleSuggestions[newSuggName] = addWeight(suggestionContent[newSuggName])
            } else {
                possibleSuggestions[newSuggName] = possibleSuggestions[newSuggName] + addWeight(suggestionContent[newSuggName])
            }
        }

        // check each user defined function if they are called
        const functionCallLines = []
        console.log(ccstate)
        for (const functionReturn of ccstate.userFunctionReturns) {
            if (functionReturn.calls.length === 0) {
                modRecommentations.push(createSimpleSuggestion(0, "I think you can modularize your code by calling " + functionReturn.name + " at least once"))
            } else {
                functionCallLines.push(...functionReturn.calls)
            }
        }

        // check if declared variables are used,
        // functions - manipulate value : increase score from 2 to 3
        //      - checks if function call is used in variable and then referenced somewhere else
        for (const variable of ccstate.allVariables) {
            if (variable.name.length > 0 && variable.uses.length === 0 && variable.assignments[0].value._astname !== "JSFor" && variable.assignments[0].value._astname !== "For") {
                if (functionCallLines.includes(variable.assignments[0].line)) {
                    modRecommentations.push(createSimpleSuggestion(0, "looks like there's a defined variable using function return data but it hasn't been called yet: " + variable.name))
                } else {
                    modRecommentations.push(createSimpleSuggestion(0, "looks like there's a defined variable but it hasn't been called yet: " + variable.name)) // todo: activates with loop var
                }
            }
        }

        if (modRecommentations.length) {
            suggestionContent.instrument = modRecommentations[Math.floor(Math.random() * modRecommentations.length)]
            possibleSuggestions.instrument = addWeight(suggestionContent.instrument)
        }

        // check if there's any function in the code vs what sound complexity found
        if (Object.keys(studentModel.musicAttributes.soundProfile).length > 1 && ccstate.userFunctionReturns.length === 0) {
            suggestionContent.function = createSimpleSuggestion(0, "we can store the code that creates the section you just added as a custom function so we can reuse it")
            possibleSuggestions.function = addWeight(suggestionContent.function)
        }

        // WBN: functions - repeat execution - : can suggest adding function arguments to code

        // check for repeated code with fitMedia or makeBeat and suggest a loop
        const loopRecommendations: CodeRecommendation[] = []
        let apiCalls = []
        apiCalls = Object.assign(getApiCalls(), [])
        apiCalls.sort((a, b) => (a.clips[0] <= b.clips[0] ? 1 : -1))
        apiCalls = apiCalls.filter((a) => { return a.function === "fitMedia" || a.function === "makeBeat" })
        for (const apiCall of apiCalls) {
            for (const clip of apiCall.clips) {
                if (clip.length > 0 && apiCalls.filter((a) => { return a.clips.includes(clip) && a.function === apiCall.function }).length > 1) {
                    loopRecommendations.push(createSimpleSuggestion(0, "we have a few lines using " + clip + ". we could try putting in a loop to do this with fewer lines of code"))
                    // break
                }
            }
        }
        if (loopRecommendations.length) {
            suggestionContent.instrument = loopRecommendations[Math.floor(Math.random() * loopRecommendations.length)]
            possibleSuggestions.instrument = addWeight(suggestionContent.instrument)
        }

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
        const scriptType = currentScript?.name.slice(-2) === "js" ? "javascript" : "python"
        if (currentScript) {
            const currentScriptAST = analyzeCode(scriptType, currentScript.source_code).ast
            if (scriptType === "javascript") {
                const loops = currentScriptAST.body.filter(({ _astname }) => _astname === "JSFor") as JsForNode[]
                for (const loop of loops) {
                    if (!loop.test || (loop.test._astname !== "Compare" && loop.test._astname !== "BinOp") || loop.test.left._astname !== "Name") { continue }
                    const comparison = loop.test.left.id.v
                    const assignComparisons = loop.body.filter(({ _astname }) => _astname === "AugAssign") as AugAssignNode[]
                    for (const aC of assignComparisons) {
                        if (aC.target._astname === "Name" && aC.target.id.v === comparison) {
                            stepRecommendations.push(createSimpleSuggestion(0, "maybe we should add a step function since you change " + comparison + " on line " + aC.lineno))
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
                            stepRecommendations.push(createSimpleSuggestion(0, "maybe we should add a step function since you change " + comparison + " on line " + aC.lineno))
                        }
                    }
                }
            }
        }
        if (stepRecommendations.length) {
            suggestionContent.step = stepRecommendations[Math.floor(Math.random() * stepRecommendations.length)]
            possibleSuggestions.step = addWeight(suggestionContent.step)
        }
        if (!Object.keys(possibleSuggestions).length) {
            suggestionContent.function = createSimpleSuggestion(0, "let's look for ways to modularize the current code")
            possibleSuggestions.function = addWeight(suggestionContent.function)
        }
        const suggIndex = weightedRandom(possibleSuggestions)
        return suggestionContent[suggIndex]
    },
}

function createSimpleSuggestion(id?: number, utterance?: string, explain?: string, example?: string): CodeRecommendation {
    return {
        id: id || 0,
        utterance: utterance || "",
        explain: explain || "",
        examplePY: example || "",
    }
}

// please note that the following two functions are NOT identical to those in suggestNewCode, as they serve different purposes.
function currentProjectDeltas(): string[][] {
    const state = store.getState()
    const projectHistory = selectProjectHistories(state)[selectActiveProject(state)]
    const projectDeltas: string[][] = []

    // get and then sort and then filter output from the histroy
    if (projectHistory && projectHistory.length > 0) {
        let priorResults = projectHistory[0]
        for (const result of projectHistory.slice(1)) {
            const thisDelta = checkResultsDelta(priorResults, result)
            if (Object.keys(thisDelta).length > 0) {
                projectDeltas.push(checkResultsDelta(priorResults, result))
                priorResults = result
            }
        }
    }
    return projectDeltas
}

function checkResultsDelta(resultsStart: CodeFeatures, resultsEnd: CodeFeatures): string[] {
    const deltaRepresentation: string[] = []
    for (const key of Object.keys(resultsStart)) {
        if (resultsEnd[key as keyof CodeFeatures] > resultsStart[key as keyof CodeFeatures] && resultsStart[key as keyof CodeFeatures] === 0) {
            deltaRepresentation.push(key)
        }
    }
    return deltaRepresentation
}
// function printAccessibleData() {
//     // data that can be accessed
//     console.log("soundProfile", studentModel.musicAttributes.soundProfile) // effect, measure, numberofsubsec, sounds, subsec

//     console.log("saved report", savedReport) // apicalls, measureview, mixing, overview, soundprofile, variables
//     console.log("full ccstate", ccstate) // allVar, apiCalls, codeStructure, functionLines, listFuncs, loopLocations, strFuncs, studentCode, uncalledFunctionLines, userFunctionReturns

//     console.log("active project state: ", store.getState(), caiState.selectActiveProject(store.getState())) // need to parse

//     console.log("recentproject state: ", caiState.selectRecentProjects(store.getState())) //  this is missing custom function score?
//     console.log("aggregate complexity", studentModel.codeKnowledge.aggregateComplexity) // -> need
//     console.log("project history, active project, state project delta", caiState.selectProjectHistories(store.getState())[caiState.selectActiveProject(store.getState())]) // history of changes? --> need , most recent score

//     console.log("curriculum progression", curriculumProgression) // --> follow newCode
// }
