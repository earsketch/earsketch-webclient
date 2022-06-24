import { CodeDelta, CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel } from "./projectModel"
import { analyzeCode, savedReport, soundProfileLookup } from "./analysis"
import { HistoryNode } from "./dialogue"
import { storeWorkingCodeInfo } from "./errorHandling"
import { Results, CodeFeatures, emptyResultsObject } from "./complexityCalculator"

// object to represent the change in project state from previous version to current version
interface ProjectDelta {
    codeDelta: CodeFeatures,
    soundsAdded: string [],
    soundsRemoved: string [],
    sections: number,
}

const currentDelta: ProjectDelta = { codeDelta: {} as CodeFeatures, soundsAdded: [], soundsRemoved: [], sections: 0 }

let currentDeltaSum = 0
let noDeltaCount = 0
let currentCodeFeatures: CodeFeatures = {} as CodeFeatures
let sectionLines: number [] = []
let possibleDeltaSuggs: CodeDelta [] = []

let storedHistory: HistoryNode []
const codeSuggestionsMade: { [key: string]: number [] } = {}

// describes a node in the suggestion decision tree that is an endpoint, i.e. an actual suggestion
interface SuggestionNode {
    node: number,
    suggestion: number,
}

// describes a node in the suggestion decision tree where a decision is made; yes/no refers to the nodes the suggestion script will move to
interface ConditionNode {
    node: number,
    condition: Function,
    yes: number,
    no: number,
}

// given a code delta object, determine if the change it describes has happened in the code (e.g. maniuplateValue going from 0 to 1)
function doStartAndEndValuesMatch(delta: CodeDelta) {
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
                if (value !== (currentCodeFeatures[category][label] - currentDelta.codeDelta[category][label])) {
                    startValuesMatch = false
                }
            }
        }
    }
    if (endValuesMatch && startValuesMatch) {
        possibleDeltaSuggs.push(delta)
        return true
    }

    return false
}

// The suggestion decision tree, with suggestion and conditional nodes.
const CAI_REC_DECISION_TREE: (SuggestionNode | ConditionNode) [] = [
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
            if (!isEmpty(savedReport)) {
                if (savedReport.OVERVIEW && savedReport.OVERVIEW.measures === 0) {
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
                if (doStartAndEndValuesMatch(delta)) {
                    deltaInLib = true
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
            const deltaSuggestionIDs: number [] = []
            for (const [id, delta] of Object.entries(CAI_DELTA_LIBRARY)) {
                // get current value and compare to end value
                if (doStartAndEndValuesMatch(delta)) {
                    deltaSuggestionIDs.push(Number(id))
                }
            }
            const sugg = deltaSuggestionIDs[0]
            for (const historyItem of storedHistory) {
                if (historyItem[0] === 34) {
                    // Node is code suggestion node
                    if (historyItem[1] === sugg) {
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
        node: 13,
        condition() {
            if (!isEmpty(savedReport)) {
                if (savedReport.SOUNDPROFILE) {
                    for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
                        if (section.includes("'")) {
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
        node: 27,
        condition() {
            // is there a code complexity goal?
            const comp = getModel()["code structure"]
            return comp.length > 0
        },
        yes: 35,
        no: 28,
    },
    {
        node: 28,
        condition() {
            // does the student call setEffect?
            if (!isEmpty(savedReport)) {
                for (const apiCall of savedReport.APICALLS) {
                    if (apiCall.function === "setEffect") {
                        return true
                    }
                }
            }

            return false
        },
        yes: 30,
        no: 31,
    },
    {
        node: 30,
        condition() {
            // high section similarity?
            if (isEmpty(savedReport)) {
                return false
            }
            for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
                if (section.includes("'")) {
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

// given the current code-state, return a suggestion for the user.
export function generateCodeSuggestion(history: HistoryNode [], project: string) {
    if (!codeSuggestionsMade[project]) {
        codeSuggestionsMade[project] = []
    }

    let node = CAI_REC_DECISION_TREE[0]
    while ("condition" in node) {
        // traverse the tree
        if (node.condition()) {
            node = CAI_REC_DECISION_TREE[node.yes]
        } else {
            node = CAI_REC_DECISION_TREE[node.no]
        }
    }

    const isNew = !codeSuggestionsMade[project].includes(node.suggestion)
    let sugg: CodeRecommendation | CodeDelta

    // code to prevent repeat suggestions; if the suggestion has already been made, CAI presents a general suggestion.
    if (isNew && CAI_RECOMMENDATIONS[node.suggestion]) {
        sugg = CAI_RECOMMENDATIONS[node.suggestion]
    } else {
        sugg = Object.assign({ utterance: "", explain: "", example: "" } as CodeRecommendation)
        sugg = randomNucleus(project)
    }

    codeSuggestionsMade[project].push(node.suggestion)

    // if the code delta is in the delta library (in codeRecommendations), look that up and present it.
    if (sugg.utterance === "[DELTALOOKUP]") {
        sugg = deltaSugg()
        // if cai already suggested this, return empty
        for (const dialogueNode of history) {
            if (dialogueNode[0] === 34 && Array.isArray(dialogueNode[1])) {
                const oldUtterance = dialogueNode[1][0]
                if (sugg.id === oldUtterance) {
                    sugg.utterance = ""
                    return sugg
                }
            }
        }
    }
    if (sugg.utterance === "[NUCLEUS]") {
        sugg = Object.assign({}, sugg)
        sugg = randomNucleus(project)
    }
    return sugg
}

export function storeHistory(historyList: HistoryNode []) {
    storedHistory = historyList
}

// pulls a random suggestion from the list of "nucleus" suggestions
export function randomNucleus(project: string, suppressRepetition = true) {
    let newNucleus: CodeRecommendation = { utterance: "" } as CodeRecommendation
    let threshold = 10
    let isNew = false
    while (!isNew) {
        threshold -= 1
        if (threshold < 0) {
            return { utterance: "" } as CodeRecommendation // "I don't have any suggestions right now. if you add something, i can work off that."
        }
        const keys = Object.keys(CAI_NUCLEI)
        newNucleus = CAI_NUCLEI[Number(keys[keys.length * Math.random() << 0])]
        isNew = suppressRepetition ? !codeSuggestionsMade[project].includes(newNucleus.id) : true
    }
    return newNucleus
}

// this gets called when the user runs the code, and updates the information the suggestion generator uses to select recommendations
export async function generateResults(text: string, lang: string) {
    let results: Results
    try {
        results = analyzeCode(lang, text)
    } catch (e) { // default value
        results = emptyResultsObject({ lineno: 0, colOffset: 0, _astname: "Module", body: [] })
    }

    storeWorkingCodeInfo(results.ast, results.codeStructure, savedReport.SOUNDPROFILE)
    const codeFeatures = results.codeFeatures
    // if we have stored results already and nothing's changed, use those
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
            currentDelta.codeDelta = Object.assign({}, codeDelta)
        }
    }
    // do the music delta
    if (!isEmpty(currentCodeFeatures) && !isEmpty(savedReport)) {
        if (!isEmpty(savedReport.SOUNDPROFILE)) {
            currentDelta.sections = Object.keys(savedReport.SOUNDPROFILE).length - currentSections
        }
    }
    if (isEmpty(savedReport)) {
        currentSections = 0
        currentDelta.sections = 0
    } else {
        if (isEmpty(savedReport.SOUNDPROFILE)) {
            currentSections = 0
            currentDelta.sections = 0
        } else {
            currentSections = Object.keys(savedReport.SOUNDPROFILE).length
        }
    }
    if (Object.keys(currentCodeFeatures).length === 0) {
        currentDelta.sections = 0
    }
    sectionLines = []
    // look up sections in music report
    if (!isEmpty(savedReport)) {
        for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
            const lines = soundProfileLookup(savedReport.SOUNDPROFILE, "section", section, "line")
            for (const line of lines) {
                sectionLines.push(Number(line))
            }
        }

        // sounds added and removed
        const newSounds = getSoundsFromProfile(savedReport.MEASUREVIEW)
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
    }
    currentDeltaSum = 0

    // has there been any change at all to the project?
    if (!isEmpty(currentCodeFeatures)) {
        for (const category of Object.values(currentDelta.codeDelta)) {
            if (Array.isArray(category)) {
                for (const property of category) {
                    if (typeof property === "number") {
                        currentDeltaSum += property
                    }
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
