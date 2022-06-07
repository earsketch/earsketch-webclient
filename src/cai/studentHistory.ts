// Student History module for CAI (Co-creative Artificial Intelligence) Project.
import * as cc from "./complexityCalculator"
import { analyzePython } from "./complexityCalculatorPY"
import { analyzeJavascript } from "./complexityCalculatorJS"
import store from "../reducers"
import * as scriptsState from "../browser/scriptsState"
import * as student from "./student"
import * as studentPreferences from "./studentPreferences"

let aggregateScore: { [key: string]: number } = {}
const curriculumPagesViewed: (number [] | string) [] = []
let codeRequests = 0
let soundRequests = 0
let errorRequests = 0

const events: { [key: string]: () => void } = {
    codeRequest: incrementCodeRequest,
    soundRequest: incrementSoundRequest,
    errorRequest: incrementErrorRequest,
}

export function trackEvent(eventName: string) {
    if (eventName in events) {
        events[eventName]()
    }
}

function incrementCodeRequest() {
    codeRequests += 1
    student.updateModel("preferences", { codeRequests: codeRequests })
}

function incrementSoundRequest() {
    soundRequests += 1
    student.updateModel("preferences", { soundRequests: soundRequests })
}

function incrementErrorRequest() {
    errorRequests += 1
    student.updateModel("preferences", { errorRequests: errorRequests })
}

export function calculateAggregateCodeScore() {
    if (aggregateScore == null) {
        const savedScripts: string[] = []
        const scriptTypes: string[] = []
        const savedNames: string[] = []
        const scripts = scriptsState.selectRegularScripts(store.getState())
        const keys = Object.keys(scripts)
        // if needed, initialize aggregate score variable
        if (aggregateScore == null) {
            aggregateScore = {}
        }
        for (const key of keys) {
            if (!savedNames.includes(scripts[key].name)) {
                savedNames.push(scripts[key].name)
                savedScripts.push(scripts[key].source_code)
                scriptTypes.push(scripts[key].name.substring(scripts[key].name.length - 2))
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
                if (ty === "py") {
                    output = Object.assign({}, analyzePython(sc))
                } else {
                    output = Object.assign({}, analyzeJavascript(sc))
                }
            } catch (error) {
                output = null
            }
            if (output) {
                for (const property of Object.values(output)) {
                    for (const [label, value] of Object.entries(property)) {
                        if (!aggregateScore[label]) {
                            aggregateScore[label] = Number(value)
                        }
                        if (Number(value) > aggregateScore[label]) {
                            aggregateScore[label] = Number(value)
                        }
                    }
                }
            }
        }
    }
}

export function addScoreToAggregate(script: string, scriptType: string) {
    if (aggregateScore === null) {
        calculateAggregateCodeScore()
    }
    let newOutput: cc.Results
    // analyze new code
    if (scriptType === "python") {
        newOutput = Object.assign({}, analyzePython(script))
    } else {
        newOutput = Object.assign({}, analyzeJavascript(script))
    }
    studentPreferences.runCode(newOutput.codeFeatures)
    // update aggregateScore
    for (const property of Object.values(newOutput)) {
        for (const [label, value] of Object.entries(property)) {
            if (!aggregateScore[label]) {
                aggregateScore[label] = Number(value)
            }
            if (Number(value) > aggregateScore[label]) {
                aggregateScore[label] = Number(value)
            }
        }
    }
    student.updateModel("codeKnowledge", { aggregateComplexity: aggregateScore, currentComplexity: newOutput })
}

// called when the student accesses a curriculum page from broadcast listener in caiWindowDirective
export function addCurriculumPage(page: number [] | string) {
    if (!curriculumPagesViewed.includes(page)) {
        curriculumPagesViewed.push(page)
        student.updateModel("codeKnowledge", { curriculum: curriculumPagesViewed })
    }
}
