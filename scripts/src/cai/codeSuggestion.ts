import { CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI } from "./codeRecommendations"
import * as caiProjectModel from "./projectModel"
import * as complexityCalculatorHelperFunctions from "./complexityCalculatorHelperFunctions"
import * as caiAnalysisModule from "./analysis"
import * as caiErrorHandling from "./errorHandling"
import * as complexityCalculator from "./complexityCalculator"

let currentDelta: { [key: string]: any } = { soundsAdded: [], soundsRemoved: [], sections: 0 }
let currentDeltaSum = 0
let noDeltaCount = 0
let currentResults: any = {}
let musicResults: caiAnalysisModule.Report = {} as caiAnalysisModule.Report
let currentEffects: any = []
let sectionLines: any = []
let CAI_DICT: any = {}
let possibleDeltaSuggs: any = []

let storedHistory: any

const CAI_REC_DECISION_TREE: any [] = [
    {
        node: 0,
        condition: function () {
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
        condition: function () {
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
        condition: function () {
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
        condition: function () {
            let deltaInLib = false
            possibleDeltaSuggs = []
            for (const i in CAI_DELTA_LIBRARY) {
                // does the end value match the current value?
                // if yes, does the start value match the previous value?
                let endValuesMatch = true
                for (const j in CAI_DELTA_LIBRARY[i].end) {
                    for (const k in CAI_DELTA_LIBRARY[i].end[j]) {
                        if (CAI_DELTA_LIBRARY[i].end[j][k] !== currentResults[j][k]) {
                            endValuesMatch = false
                        }
                    }
                }
                let startValuesMatch = true
                if (endValuesMatch) {
                    for (const j in CAI_DELTA_LIBRARY[i].start) {
                        for (const k in CAI_DELTA_LIBRARY[i].start[j]) {
                            if (CAI_DELTA_LIBRARY[i].start[j][k] !== (currentResults[j][k] - currentDelta[j][k])) {
                                startValuesMatch = false
                            }
                        }
                    }
                }
                if (endValuesMatch && startValuesMatch) {
                    deltaInLib = true
                    possibleDeltaSuggs.push(CAI_DELTA_LIBRARY[i])
                }
            }
            return deltaInLib
        },
        yes: 9,
        no: 11,
    },
    {
        node: 6,
        condition: function () {
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
        condition: function () {
            // has the delta suggestion already been made?
            possibleDeltaSuggs = []
            for (const i in CAI_DELTA_LIBRARY) {
                // get current value and compare to end value
                let endValuesMatch = true
                for (const j in CAI_DELTA_LIBRARY[i].end) {
                    for (const k in CAI_DELTA_LIBRARY[i].end[j]) {
                        if (CAI_DELTA_LIBRARY[i].end[j][k] !== currentResults[j][k]) {
                            endValuesMatch = false
                        }
                    }
                }
                let startValuesMatch = true
                if (endValuesMatch) {
                    for (const j in CAI_DELTA_LIBRARY[i].start) {
                        for (const k in CAI_DELTA_LIBRARY[i].start[j]) {
                            if (CAI_DELTA_LIBRARY[i].start[j][k] !== (currentResults[j][k] - currentDelta[j][k])) {
                                startValuesMatch = false
                            }
                        }
                    }
                }
                if (endValuesMatch && startValuesMatch) {
                    possibleDeltaSuggs.push(CAI_DELTA_LIBRARY[i])
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
        condition: function () {
            return currentDelta.sections > 0
        },
        yes: 13,
        no: 27,
    },
    {
        node: 12,
        condition: function () {
            if (!isEmpty(currentResults)) {
                if (currentResults.functions.repeatExecution !== null && currentResults.functions.repeatExecution < 3) {
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
        condition: function () {
            if (!isEmpty(musicResults)) {
                if (musicResults.SOUNDPROFILE !== null) {
                    const keys = Object.keys(musicResults.SOUNDPROFILE)
                    for (const i in keys) {
                        if (keys[i].includes("'")) {
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
        condition: function () {
            if (!isEmpty(currentResults) && currentResults.functions.repeatExecution !== null && currentResults.functions.repeatExecution < 3) {
                return true
            }
            return false
        },
        yes: 26,
        no: 23,
    },
    {
        node: 15,
        condition: function () {
            if (!isEmpty(currentResults) && currentResults.userFunc !== null && currentResults.userFunc > 3) {
                return true
            }
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
        condition: function () {
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
        condition: function () {
            if (!isEmpty(currentResults) && currentResults.forLoops !== null && currentResults.forLoops > 2) {
                return true
            }
            return false
        },
        yes: 24,
        no: 23,
    },
    {
        node: 22,
        condition: function () {
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
        condition: function () {
            // is there a code complexity goal?
            const comp = caiProjectModel.getModel()["code structure"]
            return comp.length > 0
        },
        yes: 35,
        no: 28,
    },
    {
        node: 28,
        condition: function () {
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
        condition: function () {
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
        condition: function () {
            // high section similarity?
            if (isEmpty(musicResults)) {
                return false
            }
            const sectionKeys = Object.keys(musicResults.SOUNDPROFILE)
            for (const i in sectionKeys) {
                if (sectionKeys[i].includes("'")) {
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
        condition: function () {
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

let currentSections: any = []
let currentSounds: any = []

function isEmpty(dict: {}) {
    return Object.keys(dict).length === 0
}

// Returns a random integer between min (inclusive) and max (inclusive).
function getRandomInt(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function getSuggestionByID(suggID: number) {
    for (const i in CAI_RECOMMENDATIONS) {
        if (CAI_RECOMMENDATIONS[i].id === suggID) {
            const suggestion = Object.assign({}, CAI_RECOMMENDATIONS[i])
            return suggestion
        }
    }
}

export function getMusic() {
    return musicResults
}

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

export async function generateResults(text: string, lang: string) {
    let results: any
    try {
        results = caiAnalysisModule.analyzeCode(lang, text).codeFeatures
    } catch (e) { // default value
        results = complexityCalculator.emptyResultsObject({ lineno: 0, colOffset: 0, _astname: "Module", body: [] }).codeFeatures
    }
    try {
        CAI_DICT = complexityCalculatorHelperFunctions.lineDict()
    } catch (e) {
        CAI_DICT = []
    }
    musicResults = caiAnalysisModule.getReport()
    caiErrorHandling.storeWorkingCodeInfo(results.ast, results.codeStructure, musicResults.SOUNDPROFILE)
    // if we have stored results already and nothing's changed, use thos
    let validChange = true
    let allZeros = true
    const keys = Object.keys(results)
    let totalScore = 0
    let somethingChanged = false
    if (!isEmpty(currentResults)) {
        for (const i in keys) {
            if (i !== "errors") {
            // handling for if i is an int
                if (typeof results[keys[i]] === "number") {
                    if (results[keys[i]] !== 0) {
                        allZeros = false
                    }
                    if (!isEmpty(currentResults)) {
                        totalScore += currentResults[keys[i]]
                    }
                    if (results[keys[i]] !== currentResults[keys[i]]) {
                        somethingChanged = true
                    }
                } else if (typeof results[keys[i]] === "object") { // handling for if i is an object (needs to include usedInConditionals measure too
                    for (const j in results[keys[i]]) {
                    // now either i is "usedInConditionals" OR the value is an integer
                        if (j === "usedInConditionals") {
                            if (results[keys[i]][j].length > 0) {
                                allZeros = false
                            }
                        } else {
                            if (results[keys[i]][j] !== 0) {
                                allZeros = false
                            }
                            if (!isEmpty(currentResults)) {
                                totalScore += currentResults[keys[i]][j]
                            }
                        }
                        if (results[keys[i]][j] !== currentResults[keys[i]][j]) {
                            somethingChanged = true
                        }
                    }
                }
            }
        }
        if (allZeros && totalScore > 0) {
            validChange = false
        }
        // let prevScore = 0
        // if (!isEmpty(currentResults)) {
        //     for (const i in keys) {
        //         if (typeof currentResults[keys[i]] === "number" && i !== "errors") {
        //             prevScore += currentResults[keys[i]]
        //         } else {
        //             for (const j in currentResults[keys[i]]) {
        //                 if (j !== "usedInConditionals") {
        //                     prevScore += currentResults[keys[i]][j]
        //                 }
        //             }
        //         }
        //     }
        // }
        // calculate the delta
        if (validChange && somethingChanged) {
            const codeDelta = Object.assign({}, results)
            for (const i in codeDelta) {
                if (typeof currentResults[i] === "number" && i !== "errors") {
                    codeDelta[i] -= currentResults[i]
                } else {
                    for (const j in currentResults[i]) {
                        if (j === "usedInConditionals") {
                            const difference = codeDelta[i][j].filter((x: any) => !currentResults[i][j].includes(x)).concat(currentResults[i][j].filter((x: any) => !codeDelta[i][j].includes(x)))
                            codeDelta[i][j] = difference
                        } else {
                            codeDelta[i][j] -= currentResults[i][j]
                        }
                    }
                }
            }
            currentDelta = Object.assign({}, codeDelta)
            console.log(currentDelta)
        }
    }
    // do the music delta
    if (!isEmpty(currentResults) && !isEmpty(musicResults)) {
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
    if (Object.keys(currentResults).length === 0) {
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
    const soundsAdded: any [] = []
    const soundsRemoved: any [] = []
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
    if (!isEmpty(currentResults)) {
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
    if (!isEmpty(currentResults) || validChange) {
        currentResults = results
        // currentLineDict = CAI_DICT
    }
}

function deltaSugg() {
    const deltaInd = getRandomInt(0, possibleDeltaSuggs.length - 1)
    return possibleDeltaSuggs[deltaInd]
}
