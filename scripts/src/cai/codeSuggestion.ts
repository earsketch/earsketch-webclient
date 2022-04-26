import { CodeDelta, CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI } from "./codeRecommendations"
import * as caiProjectModel from "./projectModel"
import * as complexityCalculatorHelperFunctions from "./complexityCalculatorHelperFunctions"
import * as caiAnalysisModule from "./analysis"
import * as caiErrorHandling from "./errorHandling"
import * as complexityCalculator from "./complexityCalculator"

let currentDelta: { [key: string]: any } = { soundsAdded: [], soundsRemoved: [], sections: 0 }
let currentDeltaSum = 0
let noDeltaCount = 0
let currentCodeFeatures: complexityCalculator.CodeFeatures = {} as complexityCalculator.CodeFeatures
let musicResults: caiAnalysisModule.Report = {} as caiAnalysisModule.Report
let currentEffects: any = []
let sectionLines: any = []
let CAI_DICT: any = {}
let possibleDeltaSuggs: CodeDelta [] = []

let storedHistory: any

const CAI_REC_DECISION_TREE: any [] = [
    {
        node: 0,
        condition() {
            return false
        },
        yes: 1,
        no: 2,
    },
    {
        node: 1,
        suggestion: 29,
    },
    {
        node: 2,
        condition() {
            // "is music empty?"
            // empty implies there is no music.
            if (!isEmpty(musicResults)) {
                if (musicResults.OVERVIEW !== null && musicResults.OVERVIEW.measures === 0) {
                    return true
                } else {
                    return false
                }
            }
            return true
        },
        yes: 4,
        no: 3,
    },
    {
        node: 3,
        condition() {
            // is there a delta?
            return Math.abs(currentDeltaSum) > 0
        },
        yes: 5,
        no: 6,
    },
    {
        node: 4,
        suggestion: 29,
    },
    {
        node: 5,
        condition() {
            let deltaInLib = false
            possibleDeltaSuggs = []
            for (const delta of Object.values(CAI_DELTA_LIBRARY)) {
                // does the end value match the current value?
                // if yes, does the start value match the previous value?
                let endValuesMatch = true
                for (const [category, property] of Object.entries(delta.end)) {
                    for (const [label, value] of Object.entries(property)) {
                        if (value !== currentCodeFeatures[category][label]) {
                            endValuesMatch = false
                        }
                    }
                }
                let startValuesMatch = true
                if (endValuesMatch) {
                    for (const [category, property] of Object.entries(delta.start)) {
                        for (const [label, value] of Object.entries(property)) {
                            if (delta.start[category][value] !== (currentCodeFeatures[category][label] - currentDelta[category][label])) {
                                startValuesMatch = false
                            }
                        }
                    }
                }
                if (endValuesMatch && startValuesMatch) {
                    deltaInLib = true
                    possibleDeltaSuggs.push(delta)
                }
            }
            return deltaInLib
        },
        yes: 9,
        no: 11,
    },
    {
        node: 6,
        condition() {
            return noDeltaCount > 2
        },
        yes: 7,
        no: 8,
    },
    {
        node: 7,
        suggestion: 1,
    },
    {
        node: 8,
        suggestion: 2,
    },
    {
        node: 9,
        condition() {
            // has the delta suggestion already been made?
            possibleDeltaSuggs = []
            for (const delta of Object.values(CAI_DELTA_LIBRARY)) {
                // get current value and compare to end value
                let endValuesMatch = true
                for (const [category, property] of Object.entries(delta.end)) {
                    for (const [label, value] of Object.entries(property)) {
                        if (delta.end[category][value] !== currentCodeFeatures[category][label]) {
                            endValuesMatch = false
                        }
                    }
                }
                let startValuesMatch = true
                if (endValuesMatch) {
                    for (const j in delta.start) {
                        for (const k in delta.start[j]) {
                            if (delta.start[j][k] !== (currentCodeFeatures[j][k] - currentDelta[j][k])) {
                                startValuesMatch = false
                            }
                        }
                    }
                }
                if (endValuesMatch && startValuesMatch) {
                    possibleDeltaSuggs.push(delta)
                }
            }
            const sugg = possibleDeltaSuggs[0].id
            for (const i in storedHistory) {
                if (storedHistory[i][0] === 34) {
                    if (storedHistory[i][1][0][1] === sugg) {
                        return true
                    }
                }
            }
            return false
        },
        yes: 11,
        no: 10,
    },
    {
        node: 10,
        suggestion: 6,
    },
    {
        node: 11,
        condition() {
            return currentDelta.sections > 0
        },
        yes: 13,
        no: 27,
    },
    {
        node: 12,
        condition() {
            if (!isEmpty(currentCodeFeatures)) {
                if (currentCodeFeatures.functions.repeatExecution !== null && currentCodeFeatures.functions.repeatExecution < 3) {
                    return true
                }
            }
            return false
        },
        yes: 13,
        no: 17,
    },
    {
        node: 13,
        condition() {
            if (!isEmpty(musicResults)) {
                if (musicResults.SOUNDPROFILE !== null) {
                    const keys = Object.keys(musicResults.SOUNDPROFILE)
                    for (const key of keys) {
                        if (key.includes("'")) {
                            return true
                        }
                    }
                    return false
                }
            } else {
                return false
            }
        },
        yes: 16,
        no: 15,
    },
    {
        node: 14,
        condition() {
            if (!isEmpty(currentCodeFeatures) && currentCodeFeatures.functions.repeatExecution !== null && currentCodeFeatures.functions.repeatExecution < 3) {
                return true
            }
            return false
        },
        yes: 26,
        no: 23,
    },
    {
        node: 15,
        condition() {
            // TODO: user functions check
            return false
        },
        yes: 18,
        no: 17,
    },
    {
        node: 16,
        suggestion: 31,
    },
    {
        node: 17,
        suggestion: 7,
    },
    {
        node: 18,
        condition() {
            for (const i in sectionLines) {
                const dictLine = CAI_DICT[Number.parseInt(sectionLines[i]) - 1]
                if ("userFunction" in dictLine) {
                    return true
                }
            }
            return false
        },
        yes: 19,
        no: 20,
    },
    {
        node: 19,
        suggestion: 32,
    },
    {
        node: 20,
        suggestion: 65,
    },
    {
        node: 21,
        condition() {
            // TODO: for loops check
            return false
        },
        yes: 24,
        no: 23,
    },
    {
        node: 22,
        condition() {
            for (const i in sectionLines) {
                const dictLine = CAI_DICT[Number.parseInt(sectionLines[i]) - 1]
                if ("userFunction" in dictLine) {
                    return true
                }
            }
            return false
        },
        yes: 25,
        no: 26,
    },
    {
        node: 23,
        suggestion: 66,
    },
    {
        node: 24,
        suggestion: 5,
    },
    {
        node: 25,
        suggestion: 8,
    },
    {
        node: 26,
        suggestion: 18,
    },
    {
        node: 27,
        condition() {
            // is there a code complexity goal?
            const comp = caiProjectModel.getModel()["code structure"]
            return comp.length > 0
        },
        yes: 35,
        no: 28,
    },
    {
        node: 28,
        condition() {
            // does the student call setEffect?
            for (const i in musicResults.APICALLS) {
                if (musicResults.APICALLS[i].function === "setEffect") {
                    return true
                }
            }

            return false
        },
        yes: 30,
        no: 31,
    },
    {
        node: 29,
        condition() {
            // envelope usage
            const newEffects = []
            for (const i in musicResults.APICALLS) {
                if (musicResults.APICALLS[i].function === "setEffect") {
                    newEffects.push(musicResults.APICALLS[i].args)
                }
            }
            for (const i in newEffects) {
                if (newEffects[i].length > 3) {
                    return true
                }
            }
            return false
        },
        yes: 30,
        no: 32,
    },
    {
        node: 30,
        condition() {
            // high section similarity?
            if (isEmpty(musicResults)) {
                return false
            }
            const sectionKeys = Object.keys(musicResults.SOUNDPROFILE)
            for (const sectionKey of sectionKeys) {
                if (sectionKey.includes("'")) {
                    return true
                }
            }
            return false
        },
        yes: 34,
        no: 33,
    },
    {
        node: 31,
        suggestion: 68,
    },
    {
        node: 32,
        suggestion: 15,
    },
    {
        node: 33,
        suggestion: 2,
    },
    {
        node: 34,
        suggestion: 68,
    },
    {
        node: 35,
        suggestion: 11,
    },
    {
        node: 36,
        suggestion: 67,
    },
    {
        node: 37,
        condition() {
            // is there an unmet form goal?
            // first, is there a form goal?
            if (caiProjectModel.getModel().form.length === 0) {
                return false
            }
            const projectFormGoal = caiProjectModel.getModel().form[0]
            // what is the current form?
            let currentForm = ""
            if (!isEmpty(musicResults)) {
                const sectionKeys = Object.keys(musicResults.SOUNDPROFILE)
                for (const i in sectionKeys) {
                    currentForm += sectionKeys[i][0]
                }
                if (projectFormGoal.startsWith(currentForm) && projectFormGoal !== currentForm) {
                    const nextSection = projectFormGoal.substring(currentForm.length, currentForm.length + 1)
                    if (!currentForm.includes(nextSection)) {
                        return true
                    }
                } else {
                    return false
                }
            } else {
                return false
            }
        },
        yes: 36,
        no: 7,
    },
    {
        node: 38,
        suggestion: 66,
    },
]

let currentSections: number = 0
let currentSounds: string [] = []

function isEmpty(dict: {}) {
    return Object.keys(dict).length === 0
}

// Returns a random integer between min (inclusive) and max (inclusive).
function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// given a suggestion ID, returns suggestion object with utterance, options, etc.
function getSuggestionByID(suggID: number) {
    for (const i in CAI_RECOMMENDATIONS) {
        if (CAI_RECOMMENDATIONS[i].id === suggID) {
            const suggestion = Object.assign({}, CAI_RECOMMENDATIONS[i])
            return suggestion
        }
    }
}

// gets music results
export function getMusic() {
    return musicResults
}

// returns a list of all sound samples in a project. used to measure differences
function getSoundsFromProfile(measureView: { [key: number]: { type: string, name: string }[] }) {
    const soundTally = []
    for (const i in measureView) {
        for (const j in measureView[i]) {
            if (measureView[i][j].type === "sound") {
                soundTally.push(measureView[i][j].name)
            }
        }
    }
    return soundTally
}

// given the current code-state, return a suggestion for the user.
export function generateCodeSuggestion(history: any[]) {
    let nodeIndex = 0
    while ("condition" in CAI_REC_DECISION_TREE[nodeIndex]) {
        // traverse the tree
        if (CAI_REC_DECISION_TREE[nodeIndex].condition()) {
            nodeIndex = CAI_REC_DECISION_TREE[nodeIndex].yes
        } else {
            nodeIndex = CAI_REC_DECISION_TREE[nodeIndex].no
        }
    }
    // update effects
    currentEffects = []
    for (const i in musicResults.APICALLS) {
        if (musicResults.APICALLS[i].function === "setEffect") {
            currentEffects.push(musicResults.APICALLS[i].args)
        }
    }
    let isNew = true
    for (const i in history) {
        // get utterance
        if (history[i].length > 1) {
            if (Array.isArray(history[i][1])) {
                for (const j in history[i][1]) {
                    if (history[i][1][j][0] === "SUGGESTION") {
                        if (history[i][1][j][1] === CAI_REC_DECISION_TREE[nodeIndex].suggestion) {
                            isNew = false
                        }
                    }
                }
            }
        }
    }
    let sugg: any = {}
    if (isNew) {
        sugg = getSuggestionByID(CAI_REC_DECISION_TREE[nodeIndex].suggestion)
    } else {
        sugg = Object.assign({ utterance: "", explain: "", example: "" })
        sugg = randomNucleus(history)
    }
    if (sugg.utterance === "[DELTALOOKUP]") {
        sugg = Object.assign({}, sugg)
        sugg = deltaSugg()
        // if cai already suggested this, return empty
        for (const i in history) {
            if (history[i][0] === 34) {
                const oldUtterance = history[i][1][0][1]
                if (sugg.id === oldUtterance) {
                    sugg.utterance = ""
                    return sugg
                }
            }
        }
    }
    if (sugg.utterance === "[NUCLEUS]") {
        sugg = Object.assign({}, sugg)
        sugg = randomNucleus(history)
    }
    return sugg
}

export function storeHistory(historyList: any[]) {
    storedHistory = historyList
}

// pulls a random suggestio from the list of "nucleus" suggestions
export function randomNucleus(history: any = {}, suppressRepetition = true) {
    let isAlreadySaid = true
    let newNucleus: any = { utterance: "" }
    let threshold = 10
    while (isAlreadySaid) {
        threshold -= 1
        if (threshold < 0) {
            return { utterance: "" } // "I don't have any suggestions right now. if you add something, i can work off that."
        }
        newNucleus = CAI_NUCLEI[getRandomInt(0, CAI_NUCLEI.length - 1)]
        isAlreadySaid = false
        if (suppressRepetition) {
            for (const i in history) {
                // get utterance
                if (history[i].length > 1) {
                    for (const j in history[i][1]) {
                        const oldUtterance = history[i][1][j][1]
                        if (oldUtterance !== null && oldUtterance === newNucleus.id) {
                            isAlreadySaid = true
                        }
                    }
                }
            }
        }
    }
    return newNucleus
}

// this gets called when the user runs the code, and updates the information the suggestion generator uses to select recommendations
export async function generateResults(text: string, lang: string) {
    let results: complexityCalculator.Results
    try {
        results = caiAnalysisModule.analyzeCode(lang, text)
    } catch (e) { // default value
        results = complexityCalculator.emptyResultsObject({ lineno: 0, colOffset: 0, _astname: "Module", body: [] })
    }
    try {
        CAI_DICT = complexityCalculatorHelperFunctions.lineDict()
    } catch (e) {
        CAI_DICT = []
    }
    musicResults = caiAnalysisModule.getReport()
    caiErrorHandling.storeWorkingCodeInfo(results.ast, results.codeStructure, musicResults.SOUNDPROFILE)
    const codeFeatures = results.codeFeatures
    // if we have stored results already and nothing's changed, use thos
    let validChange = true
    let allZeros = true
    let totalScore = 0
    let somethingChanged = false
    if (!isEmpty(currentCodeFeatures)) {
        for (const key of Object.keys(codeFeatures)) {
            if (key !== "errors") {
                for (const [feature, value] of Object.entries(codeFeatures[key])) {
                    if (allZeros && value !== 0) {
                        allZeros = false
                    }
                    totalScore += value
                    if (currentCodeFeatures[key][feature] !== value) {
                        somethingChanged = true
                    }
                }
            }
        }
        if (allZeros && totalScore > 0) {
            validChange = false
        }
        if (validChange && somethingChanged) {
            const codeDelta = Object.assign({}, codeFeatures)
            for (const category of Object.keys(codeDelta)) {
                for (const feature of Object.keys(codeDelta[category])) {
                    codeDelta[category][feature] -= currentCodeFeatures[category][feature]
                }
            }
            currentDelta = Object.assign({}, codeDelta)
        }
    }
    // do the music delta
    if (!isEmpty(currentCodeFeatures) && !isEmpty(musicResults)) {
        if (!isEmpty(musicResults.SOUNDPROFILE)) {
            currentDelta.sections = Object.keys(musicResults.SOUNDPROFILE).length - currentSections
        }
    }
    if (isEmpty(musicResults)) {
        currentSections = 0
        currentDelta.sections = 0
    } else {
        if (isEmpty(musicResults.SOUNDPROFILE)) {
            currentSections = 0
            currentDelta.sections = 0
        } else {
            currentSections = Object.keys(musicResults.SOUNDPROFILE).length
        }
    }
    if (Object.keys(currentCodeFeatures).length === 0) {
        currentDelta.sections = 0
    }
    sectionLines = []
    for (const i in musicResults.SOUNDPROFILE) {
        const lines = caiAnalysisModule.soundProfileLookup(musicResults.SOUNDPROFILE, "section", i, "line")
        for (const j in lines) {
            sectionLines.push(lines[j])
        }
    }
    // sounds added and removed
    const newSounds = getSoundsFromProfile(musicResults.MEASUREVIEW)
    const soundsAdded: string [] = []
    const soundsRemoved: string [] = []
    if (currentSounds.length > 0) {
        for (const newSound of newSounds) {
            if (!currentSounds.includes(newSound) && !soundsAdded.includes(newSound)) {
                soundsAdded.push(newSound)
            }
        }
        for (let i = 0; i < currentSounds.length; i++) {
            if (!newSounds.includes(newSounds[i]) && !soundsRemoved.includes(currentSounds[i])) {
                soundsRemoved.push(newSounds[i])
            }
        }
    }
    currentSounds = newSounds.slice(0)
    currentDelta.soundsAdded = soundsAdded.slice(0)
    currentDelta.soundsRemoved = soundsRemoved.slice(0)
    currentDeltaSum = 0
    if (!isEmpty(currentCodeFeatures)) {
        for (const i in currentDelta) {
            for (const j in currentDelta[i]) {
                if (typeof currentDelta[i][j] === "number") {
                    currentDeltaSum += currentDelta[i][j]
                }
            }
        }
        currentDeltaSum += currentDelta.soundsAdded.length
        currentDeltaSum += currentDelta.soundsRemoved.length
    }
    // delta sum zero check
    if (currentDeltaSum === 0) {
        noDeltaCount += 1
    } else {
        noDeltaCount = 0
    }
    if (!isEmpty(currentCodeFeatures) || validChange) {
        currentCodeFeatures = codeFeatures
    }
}

// given the current code delta that is in the delta suggestions library, pick one at random and return it.
function deltaSugg() {
    const deltaInd = getRandomInt(0, possibleDeltaSuggs.length - 1)
    return possibleDeltaSuggs[deltaInd]
}
