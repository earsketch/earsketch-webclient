import * as student from "./student"
import { addToNodeHistory } from "./dialogue"

// Student preference module for CAI (Co-creative Artificial Intelligence) Project.

// TODO: All of these objects have one entry per project, so project state is spread across all of them.
// Instead, refactor to group all the state into one object per project, so the functions can just deal with one object
// (and avoid having to index with `[projectName]` everywhere).
const suggestionsAccepted: { [key: string]: number } = {}
const suggestionsRejected: { [key: string]: number } = {}

const allSoundsSuggested: { [key: string]: string[] } = {}
const allSoundsUsed: { [key: string]: string[] } = {}
const soundsSuggestedAndUsed: { [key: string]: string[] } = {}
const currentSoundSuggestionsPresent: { [key: string]: string[] } = {}
const soundsContributedByStudent: { [key: string]: string[] } = {}

type CodeSuggestion = [number, any, string]
const codeSuggestionsUsed: { [key: string]: CodeSuggestion[] } = {}
const codeSuggestionsMade: { [key: string]: CodeSuggestion[] } = {}

type SoundSuggestion = [number, string[]]
const sampleSuggestionsMade: { [key: string]: SoundSuggestion[] } = {}
const soundSuggestionTracker: { [key: string]: SoundSuggestion[] } = {}

const acceptanceRatio: { [key: string]: number } = {}
let activeProject = ""

const projectViews: string[] = []

export const setActiveProject = (projectName: string) => {
    activeProject = projectName
    if (!allSoundsSuggested[projectName]) {
        allSoundsSuggested[projectName] = []
    }
    if (!allSoundsUsed[projectName]) {
        allSoundsUsed[projectName] = []
    }
    if (!soundsSuggestedAndUsed[projectName]) {
        soundsSuggestedAndUsed[projectName] = []
    }
    if (!currentSoundSuggestionsPresent[projectName]) {
        currentSoundSuggestionsPresent[projectName] = []
    }
    if (!soundsContributedByStudent[projectName]) {
        soundsContributedByStudent[projectName] = []
    }
    if (!codeSuggestionsUsed[projectName]) {
        codeSuggestionsUsed[projectName] = []
    }
    if (!codeSuggestionsMade[projectName]) {
        codeSuggestionsMade[projectName] = []
    }
    if (!sampleSuggestionsMade[projectName]) {
        sampleSuggestionsMade[projectName] = []
    }
    if (!acceptanceRatio[projectName]) {
        acceptanceRatio[projectName] = 0
    }
    if (!suggestionsAccepted[projectName]) {
        suggestionsAccepted[projectName] = 0
    }
    if (!suggestionsRejected[projectName]) {
        suggestionsRejected[projectName] = 0
    }
    if (!soundSuggestionTracker[activeProject]) {
        soundSuggestionTracker[activeProject] = []
    }
    activeProject = projectName

    projectViews.push(projectName)
    student.updateModel("preferences", { projectViews: projectViews })
}

export const getSoundSuggestionsUsed = () => {
    return soundSuggestionTracker[activeProject].slice(0)
}

export const getCodeSuggestionsUsed = () => {
    return codeSuggestionsUsed[activeProject].slice(0)
}

const updateHistoricalArrays = (currentSounds?: string[]) => {
    // update historical list of all sound suggestions
    for (const suggestion of sampleSuggestionsMade[activeProject]) {
        for (const sound of suggestion[1]) {
            if (!allSoundsSuggested[activeProject].includes(sound)) {
                allSoundsSuggested[activeProject].push(sound)
            }
        }
    }
    // update historical list of all sounds used
    if (currentSounds != null) {
        for (const sound of currentSounds) {
            if (!allSoundsUsed[activeProject].includes(sound)) {
                allSoundsUsed[activeProject].push(sound)
            }
        }
    }
    // update historical list of sound suggestions used
    for (const sound of allSoundsUsed[activeProject]) {
        if (allSoundsSuggested[activeProject].includes(sound) && !soundsSuggestedAndUsed[activeProject].includes(sound) && !soundsContributedByStudent[activeProject].includes(sound)) {
            soundsSuggestedAndUsed[activeProject].push(sound)
        }
    }
    // if current sounds passed, update "currently used suggestions" list
    if (currentSounds != null) {
        const newCurrentSuggs = []
        for (const sound of currentSoundSuggestionsPresent[activeProject]) {
            if (currentSounds.includes(sound)) {
                newCurrentSuggs.push(sound)
            }
        }
        for (const sound of currentSounds) {
            if (allSoundsSuggested[activeProject].includes(sound) && !newCurrentSuggs.includes(sound)) {
                newCurrentSuggs.push(sound)
            }
        }
        currentSoundSuggestionsPresent[activeProject] = newCurrentSuggs.slice(0)
    }
    if (currentSounds != null) {
        for (const sound of currentSounds) {
            if (!allSoundsSuggested[activeProject].includes(sound) && !soundsContributedByStudent[activeProject].includes(sound)) {
                soundsContributedByStudent[activeProject].push(sound)
            }
        }
    }
    // push this set of lists to the student model
    const suggestionTracker = { allSuggestionsUsed: soundsSuggestedAndUsed, suggestionsCurrentlyUsed: currentSoundSuggestionsPresent, soundsContributedByStudent: soundsContributedByStudent }
    student.updateModel("preferences", { suggestionUse: suggestionTracker })
}

export const addSoundSuggestion = (suggestionArray: string[]) => {
    sampleSuggestionsMade[activeProject].push([0, suggestionArray])
    updateHistoricalArrays()
}

export const runSound = (soundsUsedArray: string[]) => {
    updateHistoricalArrays(soundsUsedArray)
    const newArray: SoundSuggestion[] = []
    for (const suggestion of sampleSuggestionsMade[activeProject]) {
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
            suggestionsAccepted[activeProject] += 1
            soundSuggestionTracker[activeProject].push(suggestion)
            updateAcceptanceRatio()
        } else {
            if (suggestion[0] === 0) {
                // suggestionsRejected[activeProject] += 1
                // updateAcceptanceRatio()
            } else {
                newArray.push([...suggestion])
            }
        }
    }
    sampleSuggestionsMade[activeProject] = [...newArray]
}

export const addCodeSuggestion = (complexityObj: any, utterance: string) => {
    codeSuggestionsMade[activeProject].push([0, complexityObj, utterance])
}

export const runCode = (complexityOutput: any) => {
    const newArray: CodeSuggestion[] = []
    for (const suggestion of codeSuggestionsMade[activeProject]) {
        let wasUsed = true
        // were any reqs readched?
        for (const key of Object.keys(suggestion[1])) {
            if (complexityOutput[key] < suggestion[1][key]) {
                wasUsed = false
            }
        }
        // decrement
        suggestion[0] += 1
        // if 0, add to the rejection category and delete the item
        if (wasUsed) {
            suggestionsAccepted[activeProject] += 1
            updateAcceptanceRatio()
            codeSuggestionsUsed[activeProject].push(suggestion)
        } else {
            if (suggestion[0] !== 0) {
                // suggestionsRejected[activeProject] += 1
                // updateAcceptanceRatio()
            } else {
                newArray.push([...suggestion])
            }
        }
    }
    codeSuggestionsMade[activeProject] = [...newArray]
}

const updateAcceptanceRatio = () => {
    acceptanceRatio[activeProject] = suggestionsAccepted[activeProject] / (suggestionsAccepted[activeProject] + suggestionsRejected[activeProject])
    student.updateModel("preferences", { acceptanceRatio: acceptanceRatio })
}

const onPageHistory: { status: number, time: number }[] = []
const deleteKeyTS = []
const recentCompiles = 3
const compileTS: number[] = []
const compileErrors: { error: any, time: number }[] = []
const mousePos: { x: number, y: number }[] = []
const uiClickHistory: { ui: string, time: number }[] = []
const pageLoadHistory: { status: number, time: number }[] = []
const editPeriod: { startTime: number | null, endTime: number }[] = []

export const addOnPageStatus = (status: number) => {
    onPageHistory.push({ status, time: Date.now() })
    addToNodeHistory(["page status", status])
    student.updateModel("preferences", { onPageHistory: onPageHistory })
}

export const returnPageStatus = () => {
    return onPageHistory[onPageHistory.length - 1]
}

export const addCompileTS = () => {
    compileTS.push(Date.now())
    student.updateModel("preferences", { compileTS: compileTS })
}

export const addKeystroke = (action: string) => {
    if (action === "remove") {
        deleteKeyTS.push(Date.now())
    }
}

export const addCompileError = (error: any) => {
    compileErrors.push({ error, time: Date.now() })
    student.updateModel("preferences", { compileErrors: compileErrors })
}

export const stuckOnError = () => {
    const recentHistory = compileErrors.slice(compileErrors.length - recentCompiles, compileErrors.length)
    const errors = recentHistory.map(a => a.error[0].args.v[0].v)
    if (compileErrors.length >= recentCompiles && allEqual(errors)) {
        return true
    }
    return false
}

const allEqual = (arr: any[]) => {
    return new Set(arr).size === 1
}

export const addMousePos = (pos: { x: number, y: number }) => {
    mousePos.push(pos)
    student.updateModel("preferences", { mousePos: mousePos })
}

export const addUIClick = (ui: string) => {
    if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT) {
        uiClickHistory.push({ ui, time: Date.now() })
        addToNodeHistory(["ui click", ui])
        student.updateModel("preferences", { uiClickHistory: uiClickHistory })
    }
}

export const addPageLoad = (status: number) => {
    pageLoadHistory.push({ status, time: Date.now() })
    addToNodeHistory(["page load action", status])
    student.updateModel("preferences", { pageLoadHistory: pageLoadHistory })
}

export const addEditPeriod = (startTime: number | null, endTime: number) => {
    editPeriod.push({ startTime, endTime })
    student.updateModel("preferences", { editPeriod: editPeriod })
}
