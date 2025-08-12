// Dialogue module for CAI (Co-creative Artificial Intelligence) Project.
import { Script } from "common"
import _, { concat } from "lodash"
import * as recommender from "../../app/recommender"
import { parseLanguage } from "../../esutils"
import { elaborate } from "../../ide/console"
import * as layout from "../../ide/layoutState"
import * as tabState from "../../ide/tabState"
import store from "../../reducers"
import { Report, SoundProfile } from "../analysis"
import { soundProfileLookup } from "../analysis/soundProfileLookup"
import { selectActiveProject, selectHighlight, selectProjectHistory, selectSoundHistory, selectSwitchedToCurriculum } from "../caiState"
import { firstEdit, highlight } from "../caiThunks"
import { CodeFeatures, Results } from "../complexityCalculator"
import { state as errorHandlingState, resetState as resetErrorHandlingState } from "../errorHandling/state"
import * as suggestion from "../suggestion"
import { CAI_NUCLEI, CodeRecommendation } from "../suggestion/codeRecommendations"
import { CAI_ERRORS, CAI_ERRORS_NEW, CAI_HELP_ITEMS, CAI_TREES, CAI_TREE_NODES, CaiTreeNode } from "./caitree"
import * as project from "./projectModel"
import { projectModel } from "./projectModel"
import { CodeParameters, LINKS, resetState, state } from "./state"
import * as student from "./student"
import { studentModel, studentPreferences } from "./student"
import { addToNodeHistory } from "./upload"

let currentWait = -1
let errorWait = -1
const soundWait: { node: number, sounds: string [] } = { node: -1, sounds: [] }

let numberOfEditsSinceRun: number = 0
const editThreshold: number = 25
const recentScripts: { [key: string]: string } = {}

export let studentInteracted = false
let isPrompted = true

const caiTree = CAI_TREE_NODES

// add music options to the CAI Tree
let newMusicIdx = 300
const musicOptions: CaiTreeNode [] = Array.from([4, 14, 76, 122]).map(x => CAI_TREE_NODES[x])
const musicOptionsList: number [] = []
const musicOptionTitles = ["any sound", "sounds by instrument", "use a specific genre", "use a specific instrument"]
for (const [idx, option] of musicOptions.entries()) {
    CAI_TREE_NODES[newMusicIdx] = {
        id: newMusicIdx,
        title: musicOptionTitles[idx],
        utterance: option.utterance,
        parameters: option.parameters,
        dropup: option.dropup,
        options: option.options,
    }
    musicOptionsList.push(newMusicIdx)
    newMusicIdx += 1
}

const helpOptions = [112, 115, 116, 118, 119, 120, 121, 135, 136]

export const menuOptions = {
    music: { label: "i want to find music", options: musicOptionsList.sort((a, b) => a - b) },
    help: { label: "i want you to help me make something", options: helpOptions },
    controls: { label: "i need help with the EarSketch site", options: [125, 126, 127] },
}

export function setActiveProject(p: string) {
    if (p.length > 0) {
        if (!state[p]) {
            resetState(p)
            resetErrorHandlingState(p)
        }
        student.setActiveProject(p)
        state[p].soundSuggestionsUsed = studentPreferences[p].soundSuggestionTracker.length
        project.setActiveProject(p)
    }
}

export function setCurrentOverlap(overlaps: [string, string, number][], project?: string) {
    project = project || selectActiveProject(store.getState())
    if (state[project]) {
        state[project].overlaps = overlaps || []
    }
}

export function studentEditedCode(): boolean {
    const activeProject = selectActiveProject(store.getState())
    // increment counter
    numberOfEditsSinceRun += 1
    let lastHistoryNode: number = 0
    // check if this is the most recent suggestion
    for (let i = state[activeProject].nodeHistory.length - 1; i >= 0; i--) {
        if (state[activeProject].nodeHistory[i][0] && typeof state[activeProject].nodeHistory[i][0] === "number") {
            lastHistoryNode = state[activeProject].nodeHistory[i][0] as number
            break
        }
    }
    const isMostRecent = (lastHistoryNode === 133)
    // make sure to run your code when you're done editing it so i can listen to our song
    // if there's no currently active thread and student exceeds edit count, prompt run and reset counter
    if (numberOfEditsSinceRun > editThreshold && state[activeProject].helpTopic === "" && !state[activeProject].suggestion && !isMostRecent) {
        numberOfEditsSinceRun = 0
        return true
    }
    return false
}
// used so that CAI doesn't start suggesting things until the student has interacted with it
export function studentInteract(didInt = true) {
    studentInteracted = didInt
}

// note when student opens curriculum page in history
export function addCurriculumPageToHistory(page: number [] | string) {
    const activeProject = selectActiveProject(store.getState())
    if (state[activeProject].nodeHistory) {
        const lastHistoryItem = state[activeProject].nodeHistory[state[activeProject].nodeHistory.length - 1]
        if (Array.isArray(lastHistoryItem) && lastHistoryItem[1] !== page) {
            addToNodeHistory(["curriculum", page])
            if (!studentModel.codeKnowledge.curriculum.includes(page)) {
                studentModel.codeKnowledge.curriculum.push(page)
            }
        }
    }
}

// called when student runs code with error
export function handleError(error: string | Error, code: string) {
    student.addCompileError(error)
    if (firstEdit) {
        setTimeout(() => {
            addToNodeHistory(["Compilation With Error", String(error)])
        }, 1000)
    } else {
        addToNodeHistory(["Compilation With Error", String(error)])
    }
    if (String(error) === String(errorHandlingState[selectActiveProject(store.getState())].currentError) && errorWait !== -1) {
        // then it's the same error. do nothing. we still wait
        return ""
    } else {
        state[selectActiveProject(store.getState())].sourceCode = code
        return "newError"
    }
}

// Search for explanation for current error.
function explainError() {
    const activeProject = selectActiveProject(store.getState())
    const currentError = errorHandlingState[activeProject].currentError
    let errorType = String(elaborate(currentError)[0]).split(":")[0].trim()
    if (errorType === "ExternalError") {
        errorType = String(elaborate(currentError)[0]).split(":")[1].trim()
    }
    const errorMsg = errorHandlingState[activeProject].errorMessage
    if (errorMsg.length > 1 && CAI_ERRORS_NEW[errorMsg[0]] && CAI_ERRORS_NEW[errorMsg[0]][errorMsg[1]]) {
        return CAI_ERRORS_NEW[errorMsg[0]][errorMsg[1]]
    } else if (errorMsg.length > 1 && errorMsg[0] === "name") {
        const infoArray: string[] = errorMsg[1].split(":")
        const missedName = infoArray[1].trim()
        const nameErrorType = infoArray[0] + ":"
        return CAI_ERRORS_NEW.name[nameErrorType].substring(0, CAI_ERRORS_NEW.name[nameErrorType].indexOf("[NAME]")) + missedName + CAI_ERRORS_NEW.name[nameErrorType].substring(CAI_ERRORS_NEW.name[nameErrorType].indexOf("[NAME]") + 6)
    } else if (CAI_ERRORS[errorType]) {
        return CAI_ERRORS[errorType]
    } else {
        if (errorMsg.length > 0) {
            return "it might be a " + errorMsg.join(" ")
        }
        return "i'm not sure how to fix this. you might have to peek at the curriculum"
    }
}

// called when student successfully runs their code
export async function processCodeRun(studentCode: string, complexityResults: Results, musicAnalysis: Report): Promise<[string, string[]][]> {
    const activeProject = selectActiveProject(store.getState())
    state[activeProject].sourceCode = studentCode
    const allSamples = recommender.addRecInput([], { source_code: state[activeProject].sourceCode } as Script)
    numberOfEditsSinceRun = 0
    student.runSound(allSamples)
    // once that's done, record historical info from the preference module
    const suggestionRecord = studentPreferences[activeProject].soundSuggestionTracker
    if (suggestionRecord.length > state[activeProject].soundSuggestionsUsed) {
        for (let i = state[activeProject].soundSuggestionsUsed; i < suggestionRecord.length; i++) {
            addToNodeHistory(["Sound Suggestion Used", suggestionRecord[i]])
        }
        state[activeProject].soundSuggestionsUsed += suggestionRecord.length - state[activeProject].soundSuggestionsUsed
    }
    if (complexityResults) {
        errorHandlingState[activeProject].currentError = null
        errorHandlingState[activeProject].errorText = ""
        state[activeProject].complexity = Object.assign({}, complexityResults)
        if (firstEdit) {
            setTimeout(() => {
                addToNodeHistory(["Successful Compilation"])
            }, 1000)
        } else {
            addToNodeHistory(["Successful Compilation"])
        }
    }
    if (!studentInteracted) {
        return []
    }

    // suggestion weight adjustments
    let numberUnfulfilled = 0
    for (const key of Object.keys(complexityResults.codeFeatures)) {
        if (complexityResults.codeFeatures[key as keyof CodeFeatures] < projectModel[activeProject].complexityGoals[key as keyof CodeFeatures]) {
            numberUnfulfilled += 1
        }
    }
    suggestion.adjustWeights("newCode", numberUnfulfilled / 10.0)
    suggestion.adjustWeights("advanceCode", numberUnfulfilled / 10.0)
    // if there's no music, reweight aesthetics
    if (Object.keys(musicAnalysis.MEASUREVIEW).length === 0) {
        suggestion.adjustWeights("aesthetics", 1.0)
    }
    // check changes from most recent three complexity & sound analyses
    // first, complexity
    const currentHistory = selectProjectHistory(store.getState())
    let codeDeltas = 0
    // check all or 3 most recent deltas, depending on length
    for (let i = 0; i < 3 && i < currentHistory.length - 1; i++) {
        const index = currentHistory.length - 1
        const prevIndex = index - 1
        for (const key of Object.keys(currentHistory[index])) {
            if (currentHistory[index][key as keyof CodeFeatures] !== currentHistory[prevIndex][key as keyof CodeFeatures]) {
                codeDeltas += 1
            }
        }
    }
    // then, sounds
    const soundHistory = selectSoundHistory(store.getState())
    let soundDeltas = 0
    // check all or 3 most recent deltas, depending on length
    for (let i = 0; i < 3 && i < soundHistory.length - 2; i++) {
        let anyChange = false
        const beforeSounds = soundsFromProfile(soundHistory[i].SOUNDPROFILE)
        const afterSounds = soundsFromProfile(soundHistory[i + 1].SOUNDPROFILE)
        for (const soundName of beforeSounds) {
            if (!afterSounds.includes(soundName)) {
                anyChange = true
            }
        }
        for (const soundName of afterSounds) {
            if (!beforeSounds.includes(soundName)) {
                anyChange = true
            }
        }
        if (anyChange) {
            soundDeltas += 1
        }
    }
    if (soundDeltas > codeDeltas) {
        suggestion.adjustWeights("newCode", 0.2)
        suggestion.adjustWeights("advanceCode", 0.2)
    } else if (codeDeltas > soundDeltas) {
        suggestion.adjustWeights("aesthetics", 0.2)
    }
    // check breadth and adjust advanceCode accordingly
    suggestion.adjustWeights("advanceCode", (-0.5 * (complexityResults.depth.breadth / 15)))
    // if there are any current waits, check to see if CAI should stop waiting
    if (currentWait !== -1) {
        state[activeProject].treeNode = Object.assign({}, caiTree[currentWait])
        currentWait = -1
        return await showNextDialogue()
    } else if (errorWait !== -1) {
        state[activeProject].treeNode = Object.assign({}, caiTree[errorWait])
        errorWait = -1
        return await showNextDialogue()
    } else if (soundWait.node !== -1) {
        // get array of sound names
        const allSounds = recommender.addRecInput([], { source_code: studentCode } as Script)
        let soundFound = false
        for (const sound of soundWait.sounds) {
            if (allSounds.includes(sound)) {
                soundFound = true
                break
            }
        }
        if (soundFound) {
            state[activeProject].treeNode = Object.assign({}, caiTree[soundWait.node])
            soundWait.node = -1
            soundWait.sounds = []
            return await showNextDialogue()
        }
    } else {
        // this is where chattiness parameter might come in
        if (state[activeProject].helpTopic === "" && state[activeProject].overlaps.length === 0) {
            isPrompted = false
            const next = await startTree("suggest")
            isPrompted = true
            return next
        } else if (state[activeProject].overlaps.length > 0) { // handle overlaps
            const next = await showNextDialogue(caiTree[137].utterance)
            return next
        }
    }
    return []
}

export function setCodeObj(newCode: string, activeProject?: string) {
    activeProject = activeProject || selectActiveProject(store.getState())
    if (errorHandlingState[activeProject].currentError === "") {
        state[activeProject].sourceCode = newCode
    }
}

// Creates label/value array from dialogue selection options available to current node.
export function createButtons() {
    const activeProject = selectActiveProject(store.getState())
    let buttons = []

    state[activeProject].dropup = state[activeProject].treeNode.dropup || ""
    // With no prewritten options, return to default buttons.
    if (!state[activeProject].treeNode.options || state[activeProject].treeNode.options.length === 0) {
        return []
    }
    // Node 34: BEGIN CODE SUGGESTION TREE
    if (state[activeProject].treeNode.title === "begin suggestion tree" && !state[activeProject].suggestion) {
        state[activeProject].suggestion = null
        return [{ label: "okay", value: 103 },
            { label: "what do you think we should do next?", value: "suggest" },
            { label: "do you want to come up with some sound ideas?", value: "sound_select" },
            { label: "i think we're close to done", value: "wrapup" },
            { label: "i would like to work with a specific genre", value: "genre" },
        ]
    }
    if (Number.isInteger(state[activeProject].treeNode.options[0])) {
        for (const propertyType of ["genre", "instrument"] as const) {
            if (state[activeProject].treeNode.dropup === propertyType) {
                const available = recommender.findAvailable(propertyType)
                for (const option of state[activeProject].treeNode.options) {
                    const nextNode = Number(option)
                    if (available.includes(caiTree[nextNode].title.toUpperCase())) {
                        buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                    }
                }
            }
        }
        if (!["genre", "instrument"].includes(state[activeProject].treeNode.dropup || "")) {
            for (const option of state[activeProject].treeNode.options) {
                let nextNode: number = -1
                const language = parseLanguage(selectActiveProject(store.getState()))
                if (option.toString().startsWith("[PY:")) { // allow options filtering based on language
                    if (language === "python") {
                        nextNode = Number(option.toString().split("|")[0].split(":")[1])
                    } else {
                        nextNode = Number(option.toString().split("|")[1].split(":")[1].split("]")[0])
                    }
                } else {
                    nextNode = Number(option)
                }
                const sugg = state[activeProject].suggestion
                if (nextNode === 35 && (!sugg || !("explain" in sugg) || sugg.explain === "")) {
                    continue
                } else if (nextNode === 36 && (!sugg || (!("examplePY" in sugg) && language === "python") || (!("exampleJS" in sugg) && language === "javascript"))) {
                    continue
                } else {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        }
    } else {
        const optionString = String(state[activeProject].treeNode.options[0])
        const soundHistory = selectSoundHistory(store.getState())
        const savedReport = soundHistory ? soundHistory[soundHistory.length - 1] : undefined
        if (optionString.includes("SECTIONS") && savedReport) {
            if (Object.keys(savedReport).length > 0 && savedReport.SOUNDPROFILE && Object.keys(savedReport.SOUNDPROFILE).length > 0) {
                const highestNumber = Math.max(...Object.keys(caiTree).map(Number))
                const templateNodeID = parseInt(optionString.split("|")[1])
                const templateNode = caiTree[templateNodeID]
                let tempID = highestNumber + 1
                state[activeProject].treeNode = Object.assign({}, state[activeProject].treeNode)
                state[activeProject].treeNode.options = []
                // starting with the NEXT id, create temporary nodes for each section
                for (const section of Object.keys(savedReport.SOUNDPROFILE)) {
                    const newNode = Object.assign({}, templateNode)
                    newNode.title = "Section " + savedReport.SOUNDPROFILE[section].value + " between measures " + savedReport.SOUNDPROFILE[section].measure[0] + " and " + savedReport.SOUNDPROFILE[section].measure[1]
                    newNode.parameters = {}
                    newNode.parameters.section = savedReport.SOUNDPROFILE[section].value
                    caiTree[tempID] = newNode
                    buttons.push({ label: newNode.title, value: tempID })
                    state[activeProject].treeNode.options.push(tempID)
                    tempID++
                }
            } else {
                buttons = [{ label: "the whole song", value: 73 }]
                state[activeProject].treeNode = Object.assign({}, state[activeProject].treeNode)
                state[activeProject].treeNode.options = [73]
            }
        } else if (optionString.includes("PROPERTYOPTIONS") && state[activeProject].property) {
            const highestNumber = Math.max(...Object.keys(caiTree).map(Number))
            const templateNodeID = parseInt(optionString.split("|")[1])
            const templateNode = caiTree[templateNodeID]
            let tempID = highestNumber + 1
            state[activeProject].treeNode = Object.assign({}, state[activeProject].treeNode)
            state[activeProject].treeNode.options = []
            state[activeProject].dropup = state[activeProject].property || ""
            project.setOptions()
            const properties = project.getAllProperties()
            if (optionString.includes("CLEAR")) {
                for (const property of properties) {
                    const newNode = Object.assign({}, templateNode)
                    newNode.title = property[0] + ": " + property[1]
                    newNode.parameters = { property: property[0], propertyValue: property[1] }
                    caiTree[tempID] = newNode
                    buttons.push({ label: newNode.title, value: tempID })
                    state[activeProject].treeNode.options.push(tempID)
                    tempID++
                }
            } else if (optionString.includes("CHANGE")) {
                for (const property of properties) {
                    const newNode = Object.assign({}, templateNode)
                    newNode.title = property[0] + ": " + property[1]
                    newNode.parameters = { property: property[0], changePropertyValue: property[1] }
                    caiTree[tempID] = newNode
                    buttons.push({ label: newNode.title, value: tempID })
                    state[activeProject].treeNode.options.push(tempID)
                    tempID++
                }
            } else if (optionString.includes("SWAP")) {
                const propsToUse = []
                for (const propertyOption of project.getOptions(state[activeProject].property)) {
                    if (propertyOption === state[activeProject].propertyValueToChange) {
                        propsToUse.push(propertyOption)
                    } else {
                        let isInProject = false
                        for (const property of properties) {
                            if (property[0] === state[activeProject].property && property[1] === propertyOption) {
                                isInProject = true
                                break
                            }
                        }
                        if (!isInProject) {
                            propsToUse.push(propertyOption)
                        }
                    }
                }
                for (const property of propsToUse) {
                    const newNode = Object.assign({}, templateNode)
                    newNode.title = property
                    newNode.parameters = { property: state[activeProject].property, propertyValue: property }
                    state[activeProject].dropup = state[activeProject].property || ""
                    caiTree[tempID] = newNode
                    buttons.push({ label: newNode.title, value: tempID })
                    state[activeProject].treeNode.options.push(tempID)
                    tempID++
                }
            } else {
                const activeProject = selectActiveProject(store.getState())
                for (const propertyOption of project.getOptions(state[activeProject].property)) {
                    if (!(propertyOption in projectModel[activeProject].musicalProperties.genre)) {
                        const newNode = Object.assign({}, templateNode)
                        newNode.title = propertyOption
                        newNode.parameters = { propertyValue: propertyOption }
                        caiTree[tempID] = newNode
                        buttons.push({ label: newNode.title, value: tempID })
                        state[activeProject].treeNode.options.push(tempID)
                        tempID++
                    }
                }
            }
        } else {
            for (const option of state[activeProject].treeNode.options) {
                const nextNode = Number(option)
                const sugg = state[activeProject].suggestion
                if (nextNode === 35 && (!sugg || !("explain" in sugg))) {
                    continue
                } else if (nextNode === 36 && (!sugg || !("example" in sugg))) {
                    continue
                } else {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        }
    }
    const highlightZone = selectHighlight(store.getState()).zone
    const hasSwitchedToCurriculum = selectSwitchedToCurriculum(store.getState())
    if (highlightZone && (hasSwitchedToCurriculum || highlightZone !== "curriculumButton")) {
        for (const idx of [128, 129, 130]) {
            if (!buttons.find(button => button.value === idx)) {
                buttons = concat([{ label: caiTree[idx].title, value: idx }], buttons)
            }
        }
    }
    return buttons
}

// allows for changing of project goal options
function editProperties(utterance: string, activeProject: string) {
    // get properties: only change if property or value are found in current node.
    state[activeProject].property = state[activeProject].treeNode.parameters.property || state[activeProject].property
    state[activeProject].propertyValue = state[activeProject].treeNode.parameters.propertyValue || state[activeProject].propertyValue
    state[activeProject].propertyValueToChange = state[activeProject].treeNode.parameters.changePropertyValue || state[activeProject].propertyValueToChange

    if (utterance.includes("[RESET_PARAMS]")) {
        state[activeProject].recommendationParameters = { genre: null, instrument: null }
        state[activeProject].section = null
        utterance = utterance.substring(0, utterance.indexOf("[RESET_PARAMS]"))
    }
    if (utterance.includes("[STOREPROPERTY]")) {
        utterance = utterance.substring(15)
        if (state[activeProject].property && state[activeProject].propertyValue) {
            project.updateModel(state[activeProject].property, state[activeProject].propertyValue)
        }
        addToNodeHistory(["projectModel", projectModel[activeProject]])
    }
    if (utterance.includes("[CLEARPROPERTY]")) {
        utterance = utterance.substring(15)
        project.removeProperty(state[activeProject].property, state[activeProject].propertyValue)
        addToNodeHistory(["projectModel", projectModel[activeProject]])
    }
    if (utterance.includes("[REPLACEPROPERTY]")) {
        utterance = utterance.substring(17)
        project.removeProperty(state[activeProject].property, state[activeProject].propertyValueToChange)
        project.updateModel(state[activeProject].property, state[activeProject].propertyValue)
        state[activeProject].propertyValueToChange = ""
        addToNodeHistory(["projectModel", projectModel[activeProject]])
    }
    // use current property
    if (utterance.includes("[CURRENTPROPERTY]")) {
        if (state[activeProject].property && state[activeProject].property !== "code structure") {
            utterance = utterance.replace("[CURRENTPROPERTY]", state[activeProject].property)
        } else {
            utterance = utterance.replace("[CURRENTPROPERTY]", "the code")
        }
    }
    return utterance
}

// handles CAI utterances that include [sound_rec] action tag
async function soundRecommendation(utterance: string, parameters: CodeParameters, project: string): Promise<[string, CodeParameters]> {
    // add fitMedia explanation and instrument selection to response options.
    if (!state[project].treeNode.options.includes(93)) {
        state[project].treeNode.options.push(93)
        state[project].treeNode.options.push(102)
    }
    // limit by genre and instrument
    const limits: { [key: string]: string [] } = { genre: [], instrument: [] }
    const properties = projectModel[project].musicalProperties
    for (const propertyType of ["genre", "instrument"] as const) {
        if (state[project].treeNode.parameters[propertyType]) {
            state[project].recommendationParameters[propertyType] = state[project].treeNode.parameters[propertyType] || null
            parameters.push([propertyType, state[project].recommendationParameters[propertyType] || []])
            limits[propertyType] = state[project].recommendationParameters[propertyType] ? [state[project].recommendationParameters[propertyType] || ""] : []
        } else if (state[project].recommendationParameters[propertyType]) {
            limits[propertyType] = state[project].recommendationParameters[propertyType] ? [state[project].recommendationParameters[propertyType] || ""] : []
        } else if (properties[propertyType].length > 0) {
            limits[propertyType] = properties[propertyType].slice(0)
        }
    }
    // collect input samples from source code
    const count = (utterance.match(/sound_rec/g) || []).length
    const allSamples = recommender.addRecInput([], { source_code: state[project].sourceCode } as Script)
    // recommend sounds for specific section
    let samples: string [] = []
    const soundHistory = selectSoundHistory(store.getState(), project)
    const savedReport = soundHistory ? soundHistory[soundHistory.length - 1] : undefined
    const section = state[project].section
    if (section && savedReport && Object.keys(savedReport).length > 0 && savedReport.SOUNDPROFILE) {
        const sectionSamples = soundProfileLookup(savedReport.SOUNDPROFILE, "value", section, "sound")
        for (const sample of allSamples) {
            if (sectionSamples.includes(sample)) {
                samples.push(sample)
            }
        }
    } else {
        samples = allSamples
    }
    // If no input samples are found, use random input.
    if (samples.length < 1) {
        for (let i = 0; i < 5; i++) {
            samples = recommender.addRandomRecInput(samples)
        }
    }
    let recs: string []
    const usedRecs: string [] = []
    if (state[project].recommendationHistory.length === Object.keys(recommender.soundDict).length) {
        state[project].recommendationHistory = []
    }
    recs = await recommender.recommend(samples, 1, 1, limits.genre, limits.instrument, state[project].recommendationHistory, count)
    recs = recs.slice(0, count)

    let recIndex = 0
    // fill recs with additional suggestions if too few from the selected genres/instruments are available
    if (recs.length < count) {
        const combinations = [[limits.genre, []], [[], limits.instrument], [[], []]]
        let numNewRecs = count - recs.length
        for (const combination of combinations) {
            const newRecs = await recommender.recommend(samples, 1, 1, combination[0], combination[1], state[project].recommendationHistory, numNewRecs)
            for (const newRec of newRecs) {
                if (!recs.includes(newRec)) { recs.push(newRec) }
            }
            numNewRecs = count - recs.length
            if (numNewRecs === 0) {
                break
            }
        }
    }
    for (const idx in recs) {
        state[project].recommendationHistory.push(recs[idx])
    }
    let numLoops = 0
    while (utterance.includes("[sound_rec]")) {
        const recBounds = [utterance.indexOf("[sound_rec]"), utterance.indexOf("[sound_rec]") + 11]
        const newRecString = recs[recIndex]
        usedRecs.push(newRecString)
        if (newRecString) {
            utterance = utterance.substring(0, recBounds[0]) + "[sound_rec|" + newRecString + "]" + utterance.substring(recBounds[1]).replace(/(\r\n|\n|\r)/gm, "")
            recIndex++
        }
        numLoops++
        if (numLoops > 10) {
            utterance = "i'm out of ideas. you can add some sounds to inspire me"
            break
        }
    }
    if (utterance.includes("[SOUNDWAIT")) {
        const addSoundsIndex = utterance.lastIndexOf("]")
        const newString = "|" + recs.join("|") + "]"
        utterance = utterance.substring(0, addSoundsIndex) + newString
    }
    parameters.push(["sound_rec", recs])
    student.addSoundSuggestion(usedRecs)

    return [utterance, parameters]
}

// uses suggestion generator to select and present code suggestion to student
function suggestCode(utterance: string, parameters: CodeParameters, activeProject: string): [string, CodeParameters] {
    const sugg = state[activeProject].suggestion
    const soundHistory = selectSoundHistory(store.getState(), activeProject)
    const savedReport = soundHistory ? soundHistory[soundHistory.length - 1] : undefined
    const language = parseLanguage(activeProject)

    if (utterance.includes("[SUGGESTION]")) {
        const utteranceObj = generateSuggestion()
        parameters.push(["SUGGESTION", String(utteranceObj.id)])
        utterance = utteranceObj.utterance
    } else if (state[activeProject].treeNode.utterance.includes("[SUGGESTIONEXPLAIN]")) {
        if (sugg && "explain" in sugg && sugg.explain) {
            parameters.push([state[activeProject].treeNode.utterance, sugg.explain])
            utterance = sugg.explain
        }
    } else if (state[activeProject].treeNode.utterance.includes("[SUGGESTIONEXAMPLE]")) {
        const sugg = state[activeProject].suggestion
        if (language === "python") {
            if (sugg && "examplePY" in sugg && sugg.examplePY) {
                parameters.push([state[activeProject].treeNode.utterance, sugg.examplePY])
                utterance = sugg.examplePY
            }
        } else {
            if (sugg && "exampleJS" in sugg && sugg.exampleJS) {
                parameters.push([state[activeProject].treeNode.utterance, sugg.exampleJS])
                utterance = sugg.exampleJS
            }
        }
    }
    const optionString = String(state[activeProject].treeNode.options[0])
    if (optionString.includes("[SUGGESTION]")) {
        state[activeProject].treeNode.options.push(generateSuggestion().id)
    } else if (optionString.includes("[SUGGESTIONEXPLAIN]")) {
        if (sugg && "explain" in sugg && sugg.explain) {
            state[activeProject].treeNode.options = [sugg.explain]
        }
    } else if (optionString.includes("[SUGGESTIONEXAMPLE]")) {
        const sugg = state[activeProject].suggestion
        if (language === "python" && sugg && "examplePY" in sugg && sugg.examplePY) {
            state[activeProject].treeNode.options = [sugg.examplePY]
        } else if (language === "javascript" && sugg && "exampleJS" in sugg && sugg.exampleJS) {
            state[activeProject].treeNode.options = [sugg.exampleJS]
        }
    }
    if (utterance === "sure, do you want ideas for a specific section or measure?") {
        if (errorHandlingState[activeProject].currentError !== "") {
            state[activeProject].treeNode = Object.assign({}, caiTree[CAI_TREES.error])
            utterance = "let's fix our error first. [ERROREXPLAIN]"
        }
    }
    if (utterance.includes("ERROREXPLAIN")) {
        const errorExplanation = explainError()
        utterance = utterance.substring(0, utterance.indexOf("[ERROREXPLAIN]")) + errorExplanation + utterance.substring(utterance.lastIndexOf("[ERROREXPLAIN]") + 14)
        parameters.push(["ERROREXPLAIN", errorExplanation])
    }
    while (utterance.includes("[SECTION]")) {
        const recBounds = [utterance.indexOf("[SECTION]"), utterance.indexOf("[SECTION]") + 11]
        // pick a location in the code.
        let newRecString = "one of our sections"
        if (savedReport && Object.keys(savedReport).length > 0 && savedReport.SOUNDPROFILE && Object.keys(savedReport.SOUNDPROFILE).length > 0) {
            const indexVal = Object.keys(savedReport.SOUNDPROFILE)[randomIntFromInterval(0, Object.keys(savedReport.SOUNDPROFILE).length - 1)]
            const bounds = savedReport.SOUNDPROFILE[indexVal].measure
            newRecString = "the section between measures " + bounds[0] + " and " + bounds[1]
        }
        utterance = utterance.substring(0, recBounds[0]) + newRecString + utterance.substring(recBounds[1])
    }
    if (utterance.includes("[FORM]")) {
        const validForms = []
        let currentForm = ""
        if (savedReport && savedReport.SOUNDPROFILE) {
            for (const key of Object.keys(savedReport.SOUNDPROFILE)) {
                currentForm += (key[0])
            }
            for (const form of project.allForms) {
                if (form.startsWith(currentForm) && form !== currentForm) {
                    validForms.push(form)
                }
            }
            // select form at random
            const newForm = validForms[randomIntFromInterval(0, validForms.length - 1)]
            utterance = utterance.replace("[FORM]", newForm)
            if (newForm.includes("undefined")) {
                utterance = ""
            } else {
                state[activeProject].propertyValue = newForm
            }
        } else {
            // return random form from allForms
            const newFormVal = project.allForms[randomIntFromInterval(0, project.allForms.length - 1)]
            state[activeProject].propertyValue = newFormVal
            utterance = utterance.replace("[FORM]", newFormVal)
            if (utterance.includes("undefined")) {
                utterance = ""
            }
        }
    }
    return [utterance, parameters]
}

export async function showNextDialogue(utterance?: string, project?: string) {
    project = project || selectActiveProject(store.getState())
    utterance = utterance || state[project].treeNode.utterance
    state[project].treeNode = Object.assign({}, state[project].treeNode)
    state[project].treeNode.options = state[project].treeNode.options.slice() // make a copy
    if (state[project].treeNode.title === "bye!") {
        state[project].isDone = true
    }
    const currentEvent = state[project].treeNode.event
    if (currentEvent) {
        for (const eventItem of currentEvent) {
            if (eventItem !== "codeRequest") {
                student.trackEvent(eventItem)
                addToNodeHistory(["request", eventItem])
            }
        }
    }
    if (state[project].treeNode.title === "maybe later") {
        studentInteracted = false
    }
    let parameters: CodeParameters = []

    utterance = editProperties(utterance, project)

    if (utterance.includes("[SECTIONSELECT")) {
        const soundHistory = selectSoundHistory(store.getState(), project)
        const savedReport = soundHistory ? soundHistory[soundHistory.length - 1] : undefined
        const lastIndex = utterance.indexOf("]")
        const cut = utterance.substring(1, lastIndex).split("|")
        let newUtterance = ""
        if (savedReport && Object.keys(savedReport).length > 0 && savedReport.SOUNDPROFILE && Object.keys(savedReport.SOUNDPROFILE).length > 1) {
            // utterance asks present set of options
            state[project].treeNode.options = []
            for (const option of cut[1].split(",")) {
                state[project].treeNode.options.push(parseInt(option))
            }
            newUtterance = "sure, do you want ideas for a specific section?"
        } else {
            // move directly to node indicated in second #
            state[project].treeNode = Object.assign({}, caiTree[parseInt(cut[2])])
            newUtterance = state[project].treeNode.utterance
        }
        utterance = newUtterance + utterance.substring(lastIndex + 1)
    }
    if (state[project].treeNode.parameters.helpTopic !== undefined) {
        if (state[project].treeNode.parameters.helpTopic !== "") {
            state[project].helpTopic = state[project].treeNode.parameters.helpTopic!
        }
        // otherwise just retain existing help topic
    } else {
        state[project].helpTopic = ""
    }
    // actions first
    if (utterance.includes("[CLEARSUGGESTION]")) {
        state[project].suggestion = null
        utterance = utterance.substring(0, utterance.indexOf("["))
    }
    if (utterance === "[GREETING]") {
        if (state[project].nodeHistory.length < 2) {
            utterance = "hey, I'm CAI (short for Co-creative AI). i'll be your partner in EarSketch. i'm still learning programming but working together can help both of us. we can talk about your music and code, and you can switch to the Curriculum with the chat bubble icon at the top of the page. watch this video to learn more about how to talk to me"
        } else {
            utterance = "good to see you again. let's get started"
        }
    }

    for (const i of [1, 2, 3] as const) {
        if (utterance === "[STEP" + i + "]" && state[project].helpTopic !== "") {
            utterance = CAI_HELP_ITEMS[state[project].helpTopic][i]
        }
    }
    if (utterance === "[HELPEXAMPLE]" && state[project].helpTopic !== "") {
        if (parseLanguage(project) === "python") {
            utterance = CAI_HELP_ITEMS[state[project].helpTopic].examplePY
        } else {
            utterance = CAI_HELP_ITEMS[state[project].helpTopic].exampleJS
        }
        state[project].helpTopic = ""
    }

    [utterance, parameters] = suggestCode(utterance, parameters, project)

    // set up sound recs. if theres "[SOUNDWAIT|x]" we need to fill that in (for each sound rec, add "|" + recname)
    if (utterance.includes("[sound_rec]")) {
        const recOutput = await soundRecommendation(utterance, parameters, project)
        utterance = recOutput[0]
        parameters = recOutput[1]
    }

    // then set waits, etc.
    if (utterance.includes("[WAIT")) {
        // get the number and set currentWait
        currentWait = Number.parseInt(utterance.substring(utterance.indexOf("[WAIT") + 6, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[WAIT"))
    } else if (utterance.includes("[ERRORWAIT")) {
        errorWait = Number.parseInt(utterance.substring(utterance.indexOf("[ERRORWAIT") + 11, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[ERRORWAIT"))
    } else if (utterance.includes("[SOUNDWAIT")) {
        // format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)
        const args = utterance.substring(utterance.indexOf("[SOUNDWAIT") + 1, utterance.length - 1)
        utterance = utterance.substring(0, utterance.indexOf("[SOUNDWAIT"))
        const soundWaitArgs: string[] = args.split("|")
        soundWait.node = parseInt(soundWaitArgs[1])
        soundWait.sounds = []
        for (let i = 2; i < soundWaitArgs.length; i++) {
            soundWait.sounds.push(soundWaitArgs[i])
        }
    } else {
        // cancel the wait
        currentWait = -1
        errorWait = -1
        soundWait.node = -1
        soundWait.sounds = []
    }

    if (utterance.includes("[HIGHLIGHTHISTORY]")) {
        if (layout.selectWestKind(store.getState()) !== 1) {
            store.dispatch(highlight({ zone: "scripts" }))
        } else {
            const activeTab = tabState.selectActiveTabID(store.getState())
            if (activeTab) {
                store.dispatch(highlight({ zone: "script", id: activeTab }))
            }
        }
        utterance = utterance.substring(0, utterance.indexOf("[HIGHLIGHTHISTORY]"))
    }
    if (utterance.includes("[HIGHLIGHTSEARCHAPI]")) {
        if (layout.selectWestKind(store.getState()) !== 2) {
            store.dispatch(highlight({ zone: "api" }))
        } else {
            store.dispatch(highlight({ zone: "apiSearchBar" }))
        }
        utterance = utterance.substring(0, utterance.indexOf("[HIGHLIGHTSEARCHAPI]"))
    }
    if (utterance.includes("[HIGHLIGHTSEARCHCURR]")) {
        if (layout.selectEastKind(store.getState()) !== "CURRICULUM") {
            store.dispatch(highlight({ zone: "curriculumButton" }))
        } else {
            store.dispatch(highlight({ zone: "curriculumSearchBar" }))
        }
        utterance = utterance.substring(0, utterance.indexOf("[HIGHLIGHTSEARCURR]"))
    }
    if (utterance.includes("[CLEARHIGHLIGHT]")) {
        store.dispatch(highlight({ zone: null }))
        utterance = utterance.substring(0, utterance.indexOf("[CLEARHIGHLIGHT]"))
    }

    const structure = processUtterance(utterance)

    if (!ES_WEB_SHOW_CHAT && state[project].nodeHistory && utterance !== "" && structure.length > 0) {
        addToNodeHistory([state[project].treeNode.id, parameters], undefined, project)
    }
    return structure
}

// utterance (the input) is a text string with [LINK| ] and [sound_rec| ] portions
// processUtterance takes this string, looks for phrases, and returns the following structure

// the output is an array of arrays. each subarray represents a portion of the utterance,
// with the first item being what kind of text it is
// - "plaintext" - which means a normal appearance;
// - "LINK" - calls a function;
// - "sound_rec" - calls a function
// the second part is an array with the content being displayed and whatever else that's necessary

// so something like the following "check out [LINK|fitMedia]"
// will be processed and the following will be returned
//  [["plaintext",["check out "]], ["LINK", ["fitMedia","/en/v2/getting-started.html#fitmedia"]]]

// handles modifications to utterance based on any included action tags
export function processUtterance(utterance: string): [string, string[]][] {
    const message: [string, string[]][] = []
    let pos = utterance.search(/[[]/g)
    let subMessage: [string, string[]] = ["", []]
    if (pos > -1) {
        let escapeBrackets = false
        while (pos > -1) {
            // check for code example-only escape character, "$"
            if (pos > 1) {
                while (utterance[pos - 1] === "$" && utterance.length > 0) {
                    const firstHalf = utterance.substring(0, pos - 1)
                    const secondHalf = utterance.substring(pos)
                    utterance = firstHalf + secondHalf
                    escapeBrackets = true
                }
            }
            if (escapeBrackets) {
                break
            }
            const pipeIdx = utterance.indexOf("|")
            let endIdx = utterance.indexOf("]")

            const nextPos = utterance.substring(pos + 1).indexOf("[")
            if (nextPos !== -1) {
                if (nextPos + pos < pipeIdx || nextPos + pos < endIdx) {
                    // new message starts before this one ends
                    utterance = utterance.substring(0, pos) + utterance.substring(pos + 1)
                    continue
                }
            }
            if (pipeIdx !== -1 && endIdx === -1) {
                // incomplete link
                endIdx = utterance.substring(pipeIdx).indexOf(" ")
                if (endIdx === -1) {
                    endIdx = utterance.length
                } else {
                    endIdx += pipeIdx
                }
                utterance = utterance.substring(0, endIdx) + "]" + utterance.substring(endIdx)
            }
            if (pos > 0) {
                message.push(["plaintext", [utterance.substring(0, pos)]])
            }
            if (pipeIdx > -1 && endIdx > -1) {
                const id = utterance.substring(pos + 1, pipeIdx)
                const content = utterance.substring(pipeIdx + 1, endIdx)
                if (id === "LINK") {
                    if (LINKS[content]) {
                        subMessage = ["LINK", [content, LINKS[content]]]
                    } else {
                        subMessage = ["plaintext", [content]]
                    }
                } else if (id === "sound_rec") {
                    subMessage = ["sound_rec", [content]]
                }

                if (subMessage.length > 0) {
                    message.push(subMessage)
                }
                utterance = utterance.substring(endIdx + 1)
                pos = utterance.search(/[[]/g)
            } else {
                utterance = utterance.substring(pos + 1)
                pos = -1
            }
        }
        if (utterance.length > 0) {
            message.push(["plaintext", [utterance]])
        }
        return message
    }

    return utterance.length > 0 ? [["plaintext", [utterance]]] : []
}

// check if any current wait flags are active.
export function activeWaits() {
    return currentWait !== -1 || errorWait !== -1 || soundWait.node !== -1
}

// move dialogue tree to one of the available starting points.
function startTree(treeName: string) {
    const activeProject = selectActiveProject(store.getState())
    state[activeProject].treeNode = Object.assign({}, caiTree[CAI_TREES[treeName]])
    return showNextDialogue()
}

// Updates and CAI-generated response with current user input.
export function generateOutput(input: string, isDirect: boolean = false, project?: string) {
    project = project || selectActiveProject(store.getState()) as string

    if (input in CAI_TREES) {
        return startTree(input)
    }
    if (isDirect || state[project].treeNode.id === 133) { // add special handling for "edit a bunch without running" response
        state[project].treeNode = { ...caiTree[Number(input)] }
        return showNextDialogue(state[project].treeNode.utterance, project)
    }
    if (state[project].treeNode) {
        if (state[project].treeNode.options.length === 0) {
            const utterance = state[project].treeNode.utterance
            state[project].treeNode = Object.create(null)
            return processUtterance(utterance)
        }
        if (input) {
            if (Number.isInteger(state[project].treeNode.options[0])) {
                state[project].treeNode = { ...caiTree[Number(input)] }
            } else {
                state[project].treeNode = { ...caiTree[Number(state[project].treeNode.options[Number(input)])] }
            }
            for (const [parameter, value] of Object.entries(state[project].treeNode.parameters)) {
                state[project].parameters[parameter] = value
                if (state[project].parameters.section) {
                    state[project].section = state[project].parameters.section
                }
            }
            return showNextDialogue()
        }
    }
    return [["plaintext", []]] as [string, string[]][]
}

// Generates a suggestion for music or code additions/changes and outputs a representative dialogue object
function generateSuggestion(project?: string): CaiTreeNode | CodeRecommendation {
    project = project || selectActiveProject(store.getState())

    if (!["", null].includes(errorHandlingState[project].currentError)) {
        if (isPrompted) {
            const outputObj = Object.assign({}, caiTree[CAI_TREES.error])
            outputObj.utterance = "let's fix our error first. " + outputObj.utterance
            return outputObj
        } else {
            return caiTree[34]
        }
    }
    if (isPrompted) {
        studentInteracted = true
        if (!ES_WEB_SHOW_CHAT) {
            student.trackEvent("codeRequest")
            addToNodeHistory(["request", "codeRequest"])
        }
    }
    const outputObj = suggestion.generateSuggestion((state[project].complexity.depth.breadth === 0) ? "aesthetics" : undefined)
    state[project].suggestion = Object.assign({} as CodeRecommendation, outputObj)
    if (outputObj) {
        if (outputObj.utterance.includes("[STARTTREE|")) {
            // what tree are we starting?
            let treeName = outputObj.utterance.substring(outputObj.utterance.indexOf("[STARTTREE|") + 11)
            treeName = treeName.substring(0, treeName.lastIndexOf("]"))
            state[project].treeNode = Object.assign({}, caiTree[CAI_TREES[treeName]])
            return state[project].treeNode
        }
        return outputObj
    } else {
        return CAI_NUCLEI.oneSound
    }
}

// helper function to generate random integers
function randomIntFromInterval(min: number, max: number) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function checkForCodeUpdates(code: string) {
    const project = selectActiveProject(store.getState())
    if (code.length > 0) {
        if (project in recentScripts) {
            if (recentScripts[project] !== code) {
                recentScripts[project] = code
                addToNodeHistory(["Code Updates"], code)
            }
        } else {
            recentScripts[project] = code
        }
    }
}

function soundsFromProfile(profile: SoundProfile): string[] {
    const allSounds: string[] = []
    for (const section of Object.keys(profile)) {
        for (const sectionSample of Object.keys(profile[section].sound)) {
            if (!allSounds.includes(sectionSample)) {
                allSounds.push(sectionSample)
            }
        }
    }
    return allSounds
}
