import { CodeDelta, CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI, CodeRecommendation } from "./codeRecommendations"
import { getModel } from "./projectModel"
import { analyzeCode, savedReport, soundProfileLookup } from "./analysis"
import { storeWorkingCodeInfo } from "./errorHandling"
import { Results, CodeFeatures, emptyResultsObject } from "./complexityCalculator"

// object to represent the change in project state from previous version to current version
interface ProjectDelta {
    codeChanges: CodeFeatures,
    soundsAdded: string [],
    soundsRemoved: string [],
    sections: number,
}

const currentDelta: ProjectDelta = { codeChanges: Object.create(null), soundsAdded: [], soundsRemoved: [], sections: 0 }

let currentDeltaSum = 0
let currentCodeFeatures: CodeFeatures = Object.create(null)
let sectionLines: number [] = []
let possibleDeltaSuggs: CodeDelta [] = []

let activeProject: string
// Store suggestion names and numerical ids of code deltas & nuclei
const codeSuggestionsMade: { [key: string]: (string | number) [] } = {}

// describes a node in the suggestion decision tree that is an endpoint, i.e. an actual suggestion
interface SuggestionNode {
    suggestion: keyof typeof CAI_RECOMMENDATIONS, // CodeRecommendation id to return as a suggestion.
}

// describes a node in the suggestion decision tree where a decision is made; yes/no refers to the nodes the suggestion script will move to
interface ConditionNode {
    condition: Function,
    yes: keyof typeof CAI_REC_DECISION_TREE, // decision tree node to proceed to if condition is true
    no: keyof typeof CAI_REC_DECISION_TREE, // decision tree node to proceed to if condition is false
}

export function setActiveProject(project: string) {
    activeProject = project
}

// given a code delta object, determine if the change it describes has happened in the code (e.g. maniuplateValue going from 0 to 1)
function doStartAndEndValuesMatch(delta: CodeDelta) {
    let endValuesMatch = true
    for (const [category, property] of Object.entries(delta.end)) {
        for (const [label, value] of Object.entries(property)) {
            if (value !== (currentCodeFeatures[category][label])) {
                endValuesMatch = false
            }
        }
    }
    let startValuesMatch = true
    if (endValuesMatch) {
        for (const [category, property] of Object.entries(delta.start)) {
            for (const [label, value] of Object.entries(property)) {
                if (value !== currentCodeFeatures[category][label] - currentDelta.codeChanges[category][label]) {
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
const CAI_REC_DECISION_TREE = {
    checkIsMusicEmpty: {
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
        yes: "suggestInstrument",
        no: "checkDeltaSum",
    },
    checkDeltaSum: {
        condition() {
            // is there a delta?
            return currentDeltaSum > 0
        },
        yes: "checkDeltas",
        no: "suggestNucleus",
    },
    suggestInstrument: {
        suggestion: "instrument",
    },
    checkDeltas: {
        condition() {
            // has the delta suggestion already been made?
            possibleDeltaSuggs = []
            const deltaSuggestionIDs: string [] = []
            for (const [id, delta] of Object.entries(CAI_DELTA_LIBRARY)) {
                // get current value and compare to end value
                if (doStartAndEndValuesMatch(delta)) {
                    deltaSuggestionIDs.push(id)
                }
            }
            for (const deltaID of deltaSuggestionIDs.sort(() => 0.5 - Math.random())) {
                if (!codeSuggestionsMade[activeProject].includes(CAI_DELTA_LIBRARY[deltaID].id)) {
                    possibleDeltaSuggs.push(CAI_DELTA_LIBRARY[deltaID])
                }
            }
            return possibleDeltaSuggs.length === 0
        },
        yes: "checkDeltaSections",
        no: "suggestDeltaLookup",
    },
    suggestNucleus: {
        suggestion: "nucleus",
    },
    suggestDeltaLookup: {
        suggestion: "deltaLookup",
    },
    checkDeltaSections: {
        condition() {
            return currentDelta.sections > 0
        },
        yes: "checkSubsections",
        no: "checkGoal",
    },
    checkSubsections: {
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
        yes: "suggestFunction",
        no: "checkUserFunctions",
    },
    checkUserFunctions: {
        condition() {
            // TODO: user functions check
            return false
        },
        yes: "checkFunctionSections",
        no: "suggestParameters",
    },
    suggestFunction: {
        suggestion: "function",
    },
    suggestParameters: {
        suggestion: "parameters",
    },
    checkFunctionSections: {
        condition() {
            return false
        },
        yes: "suggestFunctionCall",
        no: "suggestModular",
    },
    suggestFunctionCall: {
        suggestion: "functionCall",
    },
    suggestModular: {
        suggestion: "modular",
    },
    checkGoal: {
        condition() {
            // is there a code complexity goal?
            const comp = getModel()["code structure"]
            return comp.length > 0
        },
        yes: "suggestGoal",
        no: "checkSetEffect",
    },
    checkSetEffect: {
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
        yes: "checkSectionSimilarity",
        no: "suggestEffect",
    },
    checkSectionSimilarity: {
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
        yes: "suggestEffect",
        no: "suggestNucleus",
    },
    suggestEffect: {
        suggestion: "effect",
    },
    suggestGoal: {
        suggestion: "goal",
    },
} as const

// check that all yes, no, and suggestion fields are valid.
CAI_REC_DECISION_TREE as { [key: string]: SuggestionNode | ConditionNode }

let currentSections: number = 0
let currentSounds: string [] = []

function isEmpty(dict: {}) {
    return Object.keys(dict).length === 0
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
export function generateCodeSuggestion(project: string) {
    if (!codeSuggestionsMade[project]) {
        codeSuggestionsMade[project] = []
    }

    let node: SuggestionNode | ConditionNode = CAI_REC_DECISION_TREE.checkIsMusicEmpty
    while (node && "condition" in node) {
        // traverse the tree
        if (node.condition()) {
            node = CAI_REC_DECISION_TREE[node.yes]
        } else {
            node = CAI_REC_DECISION_TREE[node.no]
        }
    }

    let sugg: CodeRecommendation | CodeDelta

    const isNew = node && (node.suggestion === "deltaLookup" || !codeSuggestionsMade[project].includes(node.suggestion))

    // code to prevent repeat suggestions; if the suggestion has already been made, CAI presents a general suggestion.
    if (isNew && CAI_RECOMMENDATIONS[node.suggestion]) {
        sugg = CAI_RECOMMENDATIONS[node.suggestion]
        codeSuggestionsMade[project].push(node.suggestion)
    } else {
        sugg = randomNucleus(project)
    }

    // if the code delta is in the delta library (in codeRecommendations), look that up and present it.
    if (sugg.utterance === "[DELTALOOKUP]") {
        // if cai already suggested this, skip
        for (const delta of possibleDeltaSuggs) {
            if (!codeSuggestionsMade[project].includes(delta.id)) {
                sugg = delta
                codeSuggestionsMade[project].push(delta.id)
            }
        }
    }

    if (["[NUCLEUS]", "[DELTALOOKUP]"].includes(sugg.utterance)) {
        sugg = randomNucleus(project)
    }
    return sugg
}

// pulls a random sound-based suggestion from the list of "nucleus" suggestions
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
        newNucleus = CAI_NUCLEI[keys[keys.length * Math.random() << 0]]
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
        results = emptyResultsObject()
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
            for (const category of Object.keys(codeFeatures)) {
                currentDelta.codeChanges[category] = {}
                for (const feature of Object.keys(codeFeatures[category])) {
                    currentDelta.codeChanges[category][feature] = codeFeatures[category][feature] - currentCodeFeatures[category][feature]
                }
            }
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
        for (const category of Object.values(currentDelta.codeChanges)) {
            for (const property of Object.values(category)) {
                currentDeltaSum += Math.abs(property)
            }
        }
        currentDeltaSum += currentDelta.soundsAdded.length
        currentDeltaSum += currentDelta.soundsRemoved.length
    }
    // delta sum zero check

    if (!isEmpty(currentCodeFeatures) || validChange) {
        currentCodeFeatures = Object.assign({}, codeFeatures)
    }
}
