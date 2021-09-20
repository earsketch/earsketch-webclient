/* eslint-disable */
// TODO: Resolve lint issues.

// Student preference module for CAI (Co-creative Artificial Intelligence) Project.
import * as caiStudent from "./student"

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

function setActiveProject(projectName: string) {
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
}

function getSoundSuggestionsUsed() {
    return soundSuggestionTracker[activeProject].slice(0)
}

function getCodeSuggestionsUsed() {
    return codeSuggestionsUsed[activeProject].slice(0)
}

function updateHistoricalArrays(currentSounds?: string[]) {
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
    caiStudent.updateModel("preferences", { suggestionUse: suggestionTracker })
}

function addSoundSuggestion(suggestionArray: string[]) {
    sampleSuggestionsMade[activeProject].push([0, suggestionArray])
    updateHistoricalArrays()
}

function runSound(soundsUsedArray: string[]) {
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
            if (suggestion[0] == 0) {
            //    suggestionsRejected[activeProject] += 1
            //    updateAcceptanceRatio()
            } else {
                newArray.push([...suggestion])
            }
        }
    }
    sampleSuggestionsMade[activeProject] = [...newArray]
}

function addCodeSuggestion(complexityObj: any, utterance: string) {
    codeSuggestionsMade[activeProject].push([0, complexityObj, utterance])
}

function runCode(complexityOutput: any) {
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
            if (suggestion[0] == 0) {
                // suggestionsRejected[activeProject] += 1
                // updateAcceptanceRatio()
            } else {
                newArray.push([...suggestion])
            }
        }
    }
    codeSuggestionsMade[activeProject] = [...newArray]
}

function updateAcceptanceRatio() {
    acceptanceRatio[activeProject] = suggestionsAccepted[activeProject] / (suggestionsAccepted[activeProject] + suggestionsRejected[activeProject])
    caiStudent.updateModel("preferences", { acceptanceRatio: acceptanceRatio })
}

const bucketSize = 30 // options range from 10s - 120s
// for experimenting
// const bucketOptions = [10,20,30,40,50,60,90,120]

const onPageHistory: any[] = []
let lastEditTS = 0
const deleteKeyTS = []
const recentCompiles = 3
const compileTS: any[] = []
const compileErrors: any[] = []
const mousePos: any[] = []

function addOnPageStatus(status: any, time: any) {
    onPageHistory.push({ status, time })
    caiStudent.updateModel("preferences", { onPageHistory: onPageHistory })
    // console.log("history", onPageHistory)
}

function returnPageStatus() {
    return onPageHistory[-1]
}

function addCompileTS(time: any) {
    compileTS.push(time)
    lastEditTS = time
    caiStudent.updateModel("preferences", { compileTS: compileTS })
}

function addKeystroke(action: string, content: any, time: any) {
    if (action == "remove") {
        deleteKeyTS.push(time)
    }
}

function addCompileError(error: any, time: any) {
    compileErrors.push({ error, time })
    caiStudent.updateModel("preferences", { compileErrors: compileErrors })
}

function stuckOnError() {
    const recentHistory = compileErrors.slice(compileErrors.length - recentCompiles, compileErrors.length)
    const errors = recentHistory.map(a => a.error[0].args.v[0].v)
    if (compileErrors.length >= recentCompiles && allEqual(errors)) {
        return true
    }
    return false
}

function allEqual(arr: any[]) {
    return new Set(arr).size == 1
}

function addMousePos(pos: any) {
    mousePos.push(pos)
    caiStudent.updateModel("preferences", { mousePos: mousePos })
}

// what are the measures to understand how off or on task one is?

// other options: caiClose, pageChanged, caiSwapTab
// time spent on each project
// start/end of key presses [bursts]
// mouse clicks

// TODO: Export functions directly.
export {
    addCodeSuggestion,
    addCompileError,
    addCompileTS,
    addKeystroke,
    addMousePos,
    addOnPageStatus,
    addSoundSuggestion,
    getCodeSuggestionsUsed,
    getSoundSuggestionsUsed,
    returnPageStatus, // Currently unused
    runCode,
    runSound,
    setActiveProject,
    stuckOnError, // Currently unused
}
