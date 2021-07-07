// Student History module for CAI (Co-creative Artificial Intelligence) Project.
import { analyzePython } from "./complexityCalculatorPY";
import { analyzeJavascript } from "./complexityCalculatorJS";
import store from "../reducers";
import * as scriptsState from "../browser/scriptsState";
import * as caiStudent from "./student";
import * as caiStudentPreferenceModule from "./studentPreferences";

let aggregateScore: { [key: string]: number } = {}
let curriculumPagesViewed: string[] = []
let codeRequests = 0
let soundRequests = 0
let errorRequests = 0

const events : { [key: string]: () => void } = { 
    codeRequest: incrementCodeRequest,
    soundRequest: incrementSoundRequest, 
    errorRequest: incrementErrorRequest 
}

export function trackEvent(eventName: string) {
    if (eventName in events) {
        events[eventName]()
    }
}

function incrementCodeRequest() {
    codeRequests += 1
    caiStudent.updateModel("preferences", { codeRequests: codeRequests })
}

function incrementSoundRequest() {
    soundRequests += 1
    caiStudent.updateModel("preferences", { soundRequests: soundRequests })
}

function incrementErrorRequest() {
    errorRequests += 1
    caiStudent.updateModel("preferences", { errorRequests: errorRequests })
}

export function calculateAggregateCodeScore() {
    if (aggregateScore == null) {
        let savedScripts : string[] = []
        let scriptTypes : string[] = []
        let savedNames : string[] = []
        const scripts = scriptsState.selectRegularScripts(store.getState())
        const keys = Object.keys(scripts)
        //if needed, initialize aggregate score variable
        if (aggregateScore == null) {
            aggregateScore = {
                userFunc: 0,
                conditionals: 0,
                forLoops: 0,
                lists: 0,
                strings: 0,
                ints: 0,
                floats: 0,
                booleans: 0,
                variables: 0,
                listOps: 0,
                strOps: 0,
                boolOps: 0,
                comparisons: 0,
                mathematicalOperators: 0,
                consoleInput: 0
            }
        }
        for (let i = 0; i < keys.length; i++) {
            if (!savedNames.includes(scripts[keys[i]].name)) {
                savedNames.push(scripts[keys[i]].name)
                savedScripts.push(scripts[keys[i]].source_code)
                scriptTypes.push(scripts[keys[i]].name.substring(scripts[keys[i]].name.length - 2))
                if (savedNames.length >= 30) {
                    break
                }
            }
        }
        for (let i = 0; i < savedScripts.length; i++) {
            const sc = savedScripts[i]
            const ty = scriptTypes[i]
            let output
            try {
                if (ty == "py") {
                    output = Object.assign({}, analyzePython(sc))
                } else {
                    output = Object.assign({}, analyzeJavascript(sc))
                }
            }
            catch (error) {
                output = null
            }
            if (output != null) {
                if (output["userFunc"] === "Args" || output["userFunc"] === "Returns") {
                    output["userFunc"] = 4
                } else if (output["userFunc"] === "ReturnAndArgs") {
                    output["userFunc"] = 5
                }

                if (output["userFunc"] === "Args" || output["userFunc"] === "Returns") {
                    output["userFunc"] = 4
                } else if (output["userFunc"] === "ReturnAndArgs") {
                    output["userFunc"] = 5
                }
                for (let j in aggregateScore) {
                    if (output[j] > aggregateScore[j]) {
                        aggregateScore[j] = output[j]
                    }
                }
            }
        }
    }
}

export function addScoreToAggregate(script: string, scriptType: string) {
    if (aggregateScore == null) {
        calculateAggregateCodeScore()
    }
    let newOutput
    //analyze new code
    if (scriptType == "python") {
        newOutput = Object.assign({}, analyzePython(script))
    } else {
        newOutput = Object.assign({}, analyzeJavascript(script))
    }
    //numeric replacement
    if (newOutput["userFunc"] === "Args" || newOutput["userFunc"] === "Returns") {
        newOutput["userFunc"] = 3
    } else if (newOutput["userFunc"] === "ReturnAndArgs") {
        newOutput["userFunc"] = 4
    }
    if (newOutput["userFunc"] === "Args" || newOutput["userFunc"] === "Returns") {
        newOutput["userFunc"] = 3
    } else if (newOutput["userFunc"] === "ReturnAndArgs") {
        newOutput["userFunc"] = 4
    }
    caiStudentPreferenceModule.runCode(newOutput)
    //update aggregateScore
    for (let i in aggregateScore) {
        if (newOutput[i] > aggregateScore[i]) {
            aggregateScore[i] = newOutput[i]
        }
    }
    caiStudent.updateModel("codeKnowledge", { aggregateComplexity: aggregateScore, currentComplexity: newOutput})
}

//called when the student accesses a curriculum page from broadcast listener in caiWindowDirective
export function addCurriculumPage(page: any) {
    if (curriculumPagesViewed == null) {
        curriculumPagesViewed = []
    }
    if (!curriculumPagesViewed.includes(page)) {
        curriculumPagesViewed.push(page)
        caiStudent.updateModel("codeKnowledge", { curriculum: curriculumPagesViewed})
    }
}

//returns array of all curriculum pages viewed
function retrievePagesViewed() {
    return curriculumPagesViewed
}
