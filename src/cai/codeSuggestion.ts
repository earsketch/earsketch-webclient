import { CodeDelta, CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel } from "./projectModel"
import { analyzeCode, savedReport, soundProfileLookup } from "./analysis"
import { storeWorkingCodeInfo } from "./errorHandling"
import { Results, CodeFeatures, emptyResultsObject } from "./complexityCalculator"
import { selectRegularScripts } from "../browser/scriptsState"
import { parseExt } from "../esutils"
import store from "../reducers"
import { Script } from "common"
import { NewCodeModule } from "./suggestNewCode"

// object to represent the change in project state from previous version to current version

let activeProject: string
let recentProjectComplexity: { [key: string]: Results }
// Store suggestion names and numerical ids of code deltas & nuclei
// const codeSuggestionsMade: { [key: string]: (string | number) [] } = {}

export function setActiveProject(project: string) {
    activeProject = project
}

function isEmpty(dict: {}) {
    return Object.keys(dict).length === 0
}

export function getRecentComplexity() {
    return Object.assign({}, recentProjectComplexity)
}

// returns a list of all sound samples in a project. used to measure differences
function getSoundsFromProfile(measureView: { [key: number]: { type: string, name: string }[] }) {
    const soundTally = []
    for (const measure of Object.values(measureView)) {
        for (const item of measure) {
            if (item.type === "sound") {
                soundTally.push(item.name)
            }
        }
    }
    return soundTally
}

export function generateCodeSuggestion(project: string) {
    return {} as CodeRecommendation // temporary return type, since {}  it is not an accepted type
}

export function getRecentScripts() {
    const savedScripts: Script [] = []
    const savedNames: string[] = []
    recentProjectComplexity = {}
    for (const script of Object.values(selectRegularScripts(store.getState()))) {
        if (!savedNames.includes(script.name)) {
            savedNames.push(script.name)
            savedScripts.push(script)
            if (savedScripts.length >= 10) {
                break
            }
        }
    }
    for (const script of savedScripts) {
        try {
            const output = analyzeCode(parseExt(script.name), script.source_code)
            recentProjectComplexity[script.name] = output
        } catch (error) {
            recentProjectComplexity[script.name] = emptyResultsObject()
            recentProjectComplexity[script.name].codeFeatures.errors.errors = 1
        }
    }
}

// this gets called when the user runs the code, and updates the information the suggestion generator uses to select recommendations
export async function generateResults(text: string, lang: string) {
    let results: Results
    getRecentScripts()
}
