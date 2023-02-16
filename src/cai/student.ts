import { analyzeCode, SoundProfile } from "./analysis"
import { Results } from "./complexityCalculator"
import { addToNodeHistory } from "./dialogue"
import store from "../reducers"
import { selectRegularScripts } from "../browser/scriptsState"
import { Script } from "common"
import { parseExt } from "../esutils"

// Student preference module for CAI (Co-creative Artificial Intelligence) Project.

interface CodeKnowledge {
    curriculum: (number [] | string) []
    aggregateComplexity: { [key: string]: number }
    currentComplexity: Results
}

interface ModelPreferences {
    projectViews: string []
    compileErrors: { error: string | Error, time: number } []
    suggestionUse: {
        allSuggestionsUsed: string []
        suggestionsCurrentlyUsed: string []
        soundsContributedByStudent: string []
    }

    codeRequests: number
    soundRequests: number
    errorRequests: number

    mousePos: { x: number, y: number } []
    compileTS: number []
    deleteKeyTS: number []
    pageLoadHistory: { status: number, time: number } []
    uiClickHistory: { ui: string, time: number } []
    editPeriod: { startTime: number | null, endTime: number } []
    onPageHistory: { status: number, time: number } []
}

interface StudentModel {
    codeKnowledge: CodeKnowledge
    musicAttributes: { soundProfile: SoundProfile }
    preferences: ModelPreferences
}

export const studentModel: StudentModel = {
    codeKnowledge: {
        curriculum: [],
        aggregateComplexity: {},
        currentComplexity: Object.create(null),
    },
    musicAttributes: {
        soundProfile: Object.create(null),
    },
    preferences: {
        projectViews: [],
        compileErrors: [],
        suggestionUse: {
            allSuggestionsUsed: [],
            suggestionsCurrentlyUsed: [],
            soundsContributedByStudent: [],
        },
        codeRequests: 0,
        soundRequests: 0,
        errorRequests: 0,
        mousePos: [],
        compileTS: [],
        deleteKeyTS: [],
        pageLoadHistory: [],
        uiClickHistory: [],
        editPeriod: [],
        onPageHistory: [],
    },
}

export type CodeSuggestion = [number, { [key: string]: number }, string]
export type SoundSuggestion = [number, string[]]

interface StudentPreferences {
    suggestionsAccepted: number
    suggestionsRejected: number
    allSoundsSuggested: string[]
    allSoundsUsed: string[]
    soundsSuggestedAndUsed: string[]
    currentSoundSuggestionsPresent: string[]
    soundsContributedByStudent: string[]

    sampleSuggestionsMade: SoundSuggestion[]
    soundSuggestionTracker: SoundSuggestion[]
}

export const studentPreferences: { [key: string]: StudentPreferences } = {}

let activeProject = ""

export const setActiveProject = (projectName: string) => {
    activeProject = projectName
    if (projectName.length > 0) {
        if (!studentPreferences[activeProject]) {
            studentPreferences[activeProject] = {
                suggestionsAccepted: 0,
                suggestionsRejected: 0,
                allSoundsSuggested: [],
                allSoundsUsed: [],
                soundsSuggestedAndUsed: [],
                currentSoundSuggestionsPresent: [],
                soundsContributedByStudent: [],
                sampleSuggestionsMade: [],
                soundSuggestionTracker: [],
            }
        }

        studentModel.preferences.projectViews.push(projectName)
    }
}

const updateHistoricalArrays = (currentSounds?: string[]) => {
    // update historical list of all sound suggestions
    for (const suggestion of studentPreferences[activeProject].sampleSuggestionsMade) {
        for (const sound of suggestion[1]) {
            if (!studentPreferences[activeProject].allSoundsSuggested.includes(sound)) {
                studentPreferences[activeProject].allSoundsSuggested.push(sound)
            }
        }
    }

    // update historical list of sound suggestions used
    for (const sound of studentPreferences[activeProject].allSoundsUsed) {
        if (studentPreferences[activeProject].allSoundsSuggested.includes(sound) &&
            !studentPreferences[activeProject].soundsSuggestedAndUsed.includes(sound) &&
            !studentPreferences[activeProject].soundsContributedByStudent.includes(sound)) {
            studentPreferences[activeProject].soundsSuggestedAndUsed.push(sound)
        }
    }

    // if current sounds passed, update "currently used suggestions" list
    if (currentSounds) {
        const newCurrentSuggs = []
        for (const sound of studentPreferences[activeProject].currentSoundSuggestionsPresent) {
            if (currentSounds.includes(sound)) {
                newCurrentSuggs.push(sound)
            }
        }

        for (const sound of currentSounds) {
            // update historical list of all sounds used
            if (!studentPreferences[activeProject].allSoundsUsed.includes(sound)) {
                studentPreferences[activeProject].allSoundsUsed.push(sound)
            }

            if (studentPreferences[activeProject].allSoundsSuggested.includes(sound)) {
                if (!newCurrentSuggs.includes(sound)) {
                    newCurrentSuggs.push(sound)
                }
            } else if (!studentPreferences[activeProject].soundsContributedByStudent.includes(sound)) {
                studentPreferences[activeProject].soundsContributedByStudent.push(sound)
            }
        }

        studentPreferences[activeProject].currentSoundSuggestionsPresent = newCurrentSuggs.slice(0)
    }

    // push this set of lists to the student model
    studentModel.preferences.suggestionUse = { allSuggestionsUsed: studentPreferences[activeProject].soundsSuggestedAndUsed, suggestionsCurrentlyUsed: studentPreferences[activeProject].currentSoundSuggestionsPresent, soundsContributedByStudent: studentPreferences[activeProject].soundsContributedByStudent }
}

export const addSoundSuggestion = (suggestionArray: string[]) => {
    studentPreferences[activeProject].sampleSuggestionsMade.push([0, suggestionArray])
    updateHistoricalArrays()
}

export const runSound = (soundsUsedArray: string[]) => {
    updateHistoricalArrays(soundsUsedArray)
    const newArray: SoundSuggestion[] = []
    for (const suggestion of studentPreferences[activeProject].sampleSuggestionsMade) {
        let wasUsed = false
        // were any of the sounds used?
        for (const sound of soundsUsedArray) {
            if (suggestion[1].includes(sound)) {
                wasUsed = true
                break
            }
        }
        // decrement
        suggestion[0] += 1
        // if 0, add to the rejection category and delete the item
        if (wasUsed) {
            studentPreferences[activeProject].suggestionsAccepted += 1
            studentPreferences[activeProject].soundSuggestionTracker.push(suggestion)
        } else {
            if (suggestion[0] !== 0) {
                newArray.push([...suggestion])
            }
        }
    }
    studentPreferences[activeProject].sampleSuggestionsMade = [...newArray]
}

export const addCompileError = (error: string | Error) => {
    studentModel.preferences.compileErrors.push({ error, time: Date.now() })
}

const recentCompiles = 3

export const stuckOnError = () => {
    const recentHistory = studentModel.preferences.compileErrors.slice(studentModel.preferences.compileErrors.length - recentCompiles, studentModel.preferences.compileErrors.length)
    const errors = recentHistory.map(a => (typeof a.error === "string") ? a : a.error.message)
    if (studentModel.preferences.compileErrors.length >= recentCompiles && allEqual(errors)) {
        return true
    }
    return false
}

const allEqual = (arr: any[]) => {
    return new Set(arr).size === 1
}

export const addOnPageStatus = (status: number) => {
    studentModel.preferences.onPageHistory.push({ status, time: Date.now() })
    addToNodeHistory(["page status", status])
}

export const addUIClick = (ui: string) => {
    if (FLAGS.SHOW_CAI || FLAGS.UPLOAD_CAI_HISTORY) {
        studentModel.preferences.uiClickHistory.push({ ui, time: Date.now() })
        addToNodeHistory(["ui click", ui])
    }
}

export const addTabSwitch = (tab: string) => {
    if (FLAGS.SHOW_CAI || FLAGS.UPLOAD_CAI_HISTORY) {
        addToNodeHistory(["switch tab", tab, Date.now()])
    }
}

export const addPageLoad = (status: number) => {
    if (FLAGS.SHOW_CAI || FLAGS.UPLOAD_CAI_HISTORY) {
        studentModel.preferences.pageLoadHistory.push({ status, time: Date.now() })
        addToNodeHistory(["page load action", status])
    }
}

export const addEditPeriod = (startTime: number | null, endTime: number) => {
    if (FLAGS.SHOW_CAI || FLAGS.UPLOAD_CAI_HISTORY) {
        studentModel.preferences.editPeriod.push({ startTime, endTime })
    }
}

const events: { [key: string]: () => void } = {
    codeRequest: () => { studentModel.preferences.codeRequests += 1 },
    soundRequest: () => { studentModel.preferences.soundRequests += 1 },
    errorRequest: () => { studentModel.preferences.errorRequests += 1 },
}

export function trackEvent(eventName: string) {
    if (eventName in events) {
        events[eventName]()
    }
}

function calculateCodeScore(output: Results) {
    for (const property of Object.values(output)) {
        for (const [label, value] of Object.entries(property)) {
            if (!studentModel.codeKnowledge.aggregateComplexity[label]) {
                studentModel.codeKnowledge.aggregateComplexity[label] = Number(value)
            }
            if (Number(value) > studentModel.codeKnowledge.aggregateComplexity[label]) {
                studentModel.codeKnowledge.aggregateComplexity[label] = Number(value)
            }
        }
    }
}

export function calculateAggregateCodeScore() {
    const savedScripts: Script [] = []
    const savedNames: string[] = []

    for (const script of Object.values(selectRegularScripts(store.getState()))) {
        if (!savedNames.includes(script.name)) {
            savedNames.push(script.name)
            savedScripts.push(script)
            if (savedScripts.length >= 30) {
                break
            }
        }
    }
    for (const script of savedScripts) {
        let output
        try {
            output = analyzeCode(parseExt(script.name), script.source_code)
        } catch (error) {
            output = null
        }
        if (output) {
            calculateCodeScore(output)
        }
    }
}

export function addScoreToAggregate(script: string, scriptType: string) {
    if (studentModel.codeKnowledge.aggregateComplexity === null) {
        calculateAggregateCodeScore()
    }

    const newOutput = analyzeCode(scriptType, script)
    // update aggregateScore
    calculateCodeScore(newOutput)
    studentModel.codeKnowledge.currentComplexity = newOutput
}
