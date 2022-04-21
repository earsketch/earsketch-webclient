// Dialogue module for CAI (Co-creative Artificial Intelligence) Project.
import * as caiErrorHandling from "./errorHandling"
import * as caiStudentPreferenceModule from "./studentPreferences"
import * as caiProjectModel from "./projectModel"
import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS } from "./caitree"
import { Script } from "common"
import * as recommender from "../app/recommender"
import * as userProject from "../app/userProject"
import * as caiStudentHistoryModule from "./studentHistory"
import * as codeSuggestion from "./codeSuggestion"
import { soundProfileLookup } from "./analysis"
import { getFirstEdit } from "../ide/Editor"
import * as ESUtils from "../esutils"
import * as ESConsole from "../ide/console"

let currentInput: { [key: string]: any } = {}
let currentParameters: { [key: string]: any } = {}
let currentTreeNode: { [key: string]: any } = {}
let studentCodeObj: string = ""

let currentSuggestion: { [key: string]: any } = {}
let utteranceObj: any

let currentWait = -1
let errorWait = -1
let soundWait: { [key: string]: any } = { node: -1, sounds: [] }
let complexityWait: { [key: string]: any } = { node: -1, complexity: {} }

let currentError = ["", ""]

let currentComplexity: { [key: string]: any } = {}
let currentInstr: string | null = null
let currentGenre: string | null = null

let currentProperty: any = ""
let currentPropertyValue: any = ""
let propertyValueToChange: any = ""

let activeProject = ""
let nodeHistory: { [key: string]: any[] } = {}
let recommendationHistory: { [key: string]: any[] } = {}
let chattiness = 0
let currentNoSuggRuns = 0
let recentScripts: any = {}

let studentInteracted = false
let currentDropup: { [key: string]: string } = {}
let isPrompted = true

let soundSuggestionsUsed: { [key: string]: any } = {}
let codeSuggestionsUsed: { [key: string]: any } = {}

let done = false

let currentSection: any = null
const caiTree = CAI_TREE_NODES.slice(0)

const allForms = ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"]

const codeGoalReplacements: { [key: string]: string } = {
    function: "a [LINK|function]",
    consoleInput: "[LINK|console input]",
    forLoop: "a [LINK|for loop]",
    conditional: "a [LINK|conditional statement]",
}

// defines creation rules for generated utterances/button options (ex. creates option items for every line of student code for line selection)
const actions: { [key: string]: any } = {
    "[SUGGESTION]": function () {
        return generateSuggestion()
    },
    "[SUGGESTIONEXPLAIN]": function () {
        return currentSuggestion[activeProject].explain
    },
    "[SUGGESTIONEXAMPLE]": function () {
        return currentSuggestion[activeProject].example
    },
}

export function studentInteractedValue() {
    return studentInteracted
}

export function getDropup() {
    return currentDropup[activeProject]
}

function storeProperty() {
    if (currentProperty !== "" && currentPropertyValue !== "") {
        caiProjectModel.updateModel(currentProperty, currentPropertyValue)
    }
}

export function studentInteract(didInt = true) {
    studentInteracted = didInt
}

export function addCurriculumPageToHistory(page: any) {
    if (nodeHistory[activeProject]) {
        if (nodeHistory[activeProject][nodeHistory[activeProject].length - 1][1] !== page) {
            addToNodeHistory(["curriculum", page])
            caiStudentHistoryModule.addCurriculumPage(page)
        }
    }
}

export function setActiveProject(p: string) {
    done = false
    if (!nodeHistory[p]) {
        nodeHistory[p] = []
    }
    if (!recommendationHistory[p]) {
        recommendationHistory[p] = []
    }
    if (!currentTreeNode[p]) {
        currentTreeNode[p] = caiTree[0]
    }
    if (!currentSuggestion[p]) {
        currentSuggestion[p] = {}
    }
    if (!currentInput[p]) {
        currentInput[p] = {}
    }
    if (!currentDropup[p]) {
        currentDropup[p] = ""
    }
    // interface w/student preference module
    if (!codeSuggestionsUsed[p]) {
        codeSuggestionsUsed[p] = 0
    }
    if (!soundSuggestionsUsed[p]) {
        soundSuggestionsUsed[p] = 0
    }
    caiStudentPreferenceModule.setActiveProject(p)
    caiProjectModel.setActiveProject(p)
    codeSuggestionsUsed[p] = caiStudentPreferenceModule.getCodeSuggestionsUsed().length
    soundSuggestionsUsed[p] = caiStudentPreferenceModule.getSoundSuggestionsUsed().length
    activeProject = p
}

export function getNodeHistory() {
    return nodeHistory
}

export function clearNodeHistory() {
    currentInput = {}
    currentParameters = {}
    currentTreeNode = {}
    studentCodeObj = ""

    currentProperty = ""

    currentSuggestion = {}

    currentWait = -1
    errorWait = -1
    soundWait = { node: -1, sounds: [] }
    complexityWait = { node: -1, complexity: {} }

    currentError = ["", ""]

    currentComplexity = {}
    currentInstr = null
    currentGenre = null

    activeProject = ""
    nodeHistory = {}
    recommendationHistory = {}
    chattiness = 0
    currentNoSuggRuns = 0
    recentScripts = {}

    studentInteracted = false
    currentDropup = {}
    isPrompted = true

    soundSuggestionsUsed = {}
    codeSuggestionsUsed = {}

    done = false
}

export function handleError(error: any) {
    caiStudentPreferenceModule.addCompileError(error)
    if (getFirstEdit() !== null) {
        setTimeout(() => {
            addToNodeHistory(["Compilation With Error", error])
        }, 1000)
    } else {
        addToNodeHistory(["Compilation With Error", error])
    }
    if (String(error[0]) === String(currentError[0]) && errorWait !== -1) {
        // then it's the same error. do nothing. we still wait
        return ""
    } else {
        currentError = ESConsole.elaborate(error)[0].split(":")
        return "newError"
    }
}

// Search for explanation for current error.
function explainError() {
    let errorType = String(currentError[0]).split(":")[0].trim()
    if (errorType === "ExternalError") {
        errorType = String(currentError[0]).split(":")[1].trim()
    }
    if (CAI_ERRORS[errorType]) {
        return CAI_ERRORS[errorType]
    } else {
        const errorMsg = caiErrorHandling.storeErrorInfo(currentError, studentCodeObj, ESUtils.parseLanguage(activeProject))

        if (errorMsg.length > 0) {
            return "it might be a " + errorMsg.join(" ")
        }

        return "i'm not sure how to fix this. you might have to peek at the curriculum"
    }
}

export function processCodeRun(studentCode: string, functions: any[], variables: any[], complexityResults: any, musicResults: any) {
    studentCodeObj = studentCode
    const allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as Script)
    caiStudentPreferenceModule.runSound(allSamples)
    // once that's done, record historicalinfo from the preference module
    const suggestionRecord = caiStudentPreferenceModule.getSoundSuggestionsUsed()
    if (suggestionRecord.length > soundSuggestionsUsed[activeProject]) {
        for (let i = soundSuggestionsUsed[activeProject]; i < suggestionRecord.length; i++) {
            addToNodeHistory(["Sound Suggestion Used", suggestionRecord[i]])
        }
        soundSuggestionsUsed[activeProject] += suggestionRecord.length - soundSuggestionsUsed[activeProject]
    }
    const codeSuggestionRecord = caiStudentPreferenceModule.getCodeSuggestionsUsed()
    if (codeSuggestionRecord.length > codeSuggestionsUsed[activeProject]) {
        for (let i = codeSuggestionsUsed[activeProject]; i < codeSuggestionRecord.length; i++) {
            addToNodeHistory(["Code Suggestion Used", codeSuggestionRecord[i]])
        }
        codeSuggestionsUsed[activeProject] += codeSuggestionRecord.length - codeSuggestionsUsed[activeProject]
    }
    if (complexityResults !== null) {
        caiErrorHandling.storeWorkingCodeInfo(complexityResults.ast, complexityResults.codeStructure, musicResults)

        currentComplexity = Object.assign({}, complexityResults)
        if (currentComplexity.userFunc === "Args" || currentComplexity.userFunc === "Returns") {
            currentComplexity.userFunc = 3
        } else if (currentComplexity.userFunc === "ReturnAndArgs") {
            currentComplexity.userFunc = 4
        }
        if (getFirstEdit() !== null) {
            setTimeout(() => {
                addToNodeHistory(["Successful Compilation", Object.assign({}, currentComplexity)])
            }, 1000)
        } else {
            addToNodeHistory(["Successful Compilation", Object.assign({}, currentComplexity)])
        }
    }
    if (!studentInteracted) {
        return ""
    }
    currentError = ["", ""]
    if (currentWait !== -1) {
        currentTreeNode[activeProject] = Object.assign({}, caiTree[currentWait])
        currentWait = -1
        return showNextDialogue()
    } else if (errorWait !== -1) {
        currentTreeNode[activeProject] = Object.assign({}, caiTree[errorWait])
        errorWait = -1
        return showNextDialogue()
    } else if (soundWait.node !== -1) {
        // get array of sound names
        const allSounds = recommender.addRecInput([], { source_code: studentCode } as Script)
        let soundFound = false
        for (const i in soundWait.sounds) {
            if (allSounds.includes(soundWait.sounds[i])) {
                soundFound = true
                break
            }
        }
        if (soundFound) {
            currentTreeNode[activeProject] = Object.assign({}, caiTree[soundWait.node])
            soundWait.node = -1
            soundWait.sounds = []
            return showNextDialogue()
        }
    } else if (complexityWait.node !== -1) {
        let meetsRequirements = true
        for (const i in complexityWait.complexity) {
            if (typeof currentComplexity[i] === "number") {
                if (currentComplexity[i] < complexityWait.complexity[i]) {
                    meetsRequirements = false
                    break
                }
            } else if (typeof currentComplexity[i] === "object") {
                for (const j in currentComplexity[i]) {
                    if (currentComplexity[i][j] < complexityWait.complexity[i]) {
                        meetsRequirements = false
                        break
                    }
                }
            }
        }
        if (meetsRequirements) {
            currentTreeNode[activeProject] = Object.assign({}, caiTree[soundWait.node])
            soundWait.node = -1
            soundWait.sounds = []
            return showNextDialogue()
        } else {
            return null
        }
    } else {
        // this is where chattiness parameter might come in
        if (currentNoSuggRuns >= chattiness) {
            currentNoSuggRuns = 0
            isPrompted = false
            const next = startTree("suggest")
            isPrompted = true
            return next
        } else {
            currentNoSuggRuns += 1
        }
    }
}

export function setCodeObj(newCode: any) {
    studentCodeObj = newCode
}

// Creates label/value array from dialogue selection options available to current node.
export function createButtons() {
    let buttons = []

    if ("dropup" in currentTreeNode[activeProject]) {
        currentDropup[activeProject] = currentTreeNode[activeProject].dropup
    } else {
        currentDropup[activeProject] = ""
    }
    // With no prewritten options, return to default buttons.
    if (!currentTreeNode[activeProject].options || currentTreeNode[activeProject].options.length === 0) {
        return []
    }
    // Node 34: BEGIN CODE SUGGESTION TREE
    if (currentTreeNode[activeProject].id === 34 && (!currentSuggestion[activeProject] || !currentSuggestion[activeProject].explain)) {
        currentSuggestion[activeProject] = null
        return [{ label: "okay", value: 103 },
            { label: "what do you think we should do next?", value: "suggest" },
            { label: "do you want to come up with some sound ideas?", value: "sound_select" },
            { label: "i think we're close to done", value: "wrapup" },
            { label: "i have some ideas about our project", value: "properties" }]
    }
    if (Number.isInteger(currentTreeNode[activeProject].options[0])) {
        if ("dropup" in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup === "Genres") {
            // filter the button options
            let availableGenres = []
            let allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as Script)
            if (allSamples.length < 1) {
                for (let i = 0; i < 5; i++) {
                    allSamples = recommender.addRandomRecInput(allSamples)
                }
            }
            availableGenres = recommender.availableGenres()
            for (const i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                if (availableGenres.includes(caiTree[nextNode].title.toUpperCase())) {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        } else if ("dropup" in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup === "Instruments") {
            // filter the button options
            let availableInstruments = []
            let allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as Script)
            if (allSamples.length < 1) {
                for (let i = 0; i < 5; i++) {
                    allSamples = recommender.addRandomRecInput(allSamples)
                }
            }
            availableInstruments = recommender.availableInstruments()
            for (const i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                if (availableInstruments.includes(caiTree[nextNode].title.toUpperCase())) {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        } else {
            for (const i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                buttons.push({ label: caiTree[nextNode].title, value: nextNode })
            }
        }
    } else if (currentTreeNode[activeProject].options[0] !== null && currentTreeNode[activeProject].options[0].includes("SECTIONS") && codeSuggestion.getMusic() !== null) {
        const musicResults = codeSuggestion.getMusic()
        if (Object.keys(musicResults).length > 0 && musicResults.SOUNDPROFILE !== null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
            let highestNumber = 0
            for (const node of caiTree) {
                if (node.id > highestNumber) {
                    highestNumber = node.id
                }
            }
            const templateNodeID = parseInt(currentTreeNode[activeProject].options[0].split("|")[1])
            const templateNode = caiTree[templateNodeID]
            let tempID = highestNumber + 1
            currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
            currentTreeNode[activeProject].options = []
            // starting with the NEXT id, create temporary nodes for each section
            for (const section of Object.keys(musicResults.SOUNDPROFILE)) {
                const newNode = Object.assign({}, templateNode)
                newNode.id = tempID
                newNode.title = "Section " + musicResults.SOUNDPROFILE[section].value + " between measures " + musicResults.SOUNDPROFILE[section].measure[0] + " and " + musicResults.SOUNDPROFILE[section].measure[1]
                newNode.parameters = {}
                newNode.parameters.section = musicResults.SOUNDPROFILE[section].value
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else {
            buttons = [{ label: "the whole song", value: 73 }]
            currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
            currentTreeNode[activeProject].options = [73]
        }
    } else if (currentTreeNode[activeProject].options[0] !== null && currentTreeNode[activeProject].options[0].includes("PROPERTIES")) {
        let highestNumber = 0
        for (const node of caiTree) {
            if (node.id > highestNumber) {
                highestNumber = node.id
            }
        }
        const templateNodeID = parseInt(currentTreeNode[activeProject].options[0].split("|")[1])
        const templateNode = caiTree[templateNodeID]
        let tempID = highestNumber + 1
        currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
        currentTreeNode[activeProject].options = []
        caiProjectModel.setOptions()
        for (const key of caiProjectModel.getProperties()) {
            const options = caiProjectModel.getOptions(key)
            const model = caiProjectModel.getModel()
            if (model[key].length < options.length) {
                const newNode = Object.assign({}, templateNode)
                newNode.id = tempID
                newNode.title = caiProjectModel.getPropertyButtons()[key]
                newNode.parameters = { property: key }
                newNode.dropup = caiProjectModel.getDropupLabel(key)
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        }
        if (!caiProjectModel.isEmpty()) {
            const newNode = Object.assign({}, caiTree[89])
            newNode.id = tempID
            newNode.parameters = {}
            caiTree.push(newNode)
            buttons.push({ label: newNode.title, value: newNode.id })
            currentTreeNode[activeProject].options.push(tempID)
            tempID++
        }
    } else if (currentTreeNode[activeProject].options[0] !== null && currentTreeNode[activeProject].options[0].includes("PROPERTYOPTIONS")) {
        let highestNumber = 0
        for (const node of caiTree) {
            if (node.id > highestNumber) {
                highestNumber = node.id
            }
        }
        const templateNodeID = parseInt(currentTreeNode[activeProject].options[0].split("|")[1])
        const templateNode = caiTree[templateNodeID]
        let tempID = highestNumber + 1
        const clearBool = currentTreeNode[activeProject].options[0].includes("CLEAR")
        const changeBool = currentTreeNode[activeProject].options[0].includes("CHANGE")
        const swapBool = currentTreeNode[activeProject].options[0].includes("SWAP")
        currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
        currentTreeNode[activeProject].options = []
        currentDropup[activeProject] = currentProperty
        caiProjectModel.setOptions()
        const properties = caiProjectModel.getAllProperties()
        if (clearBool) {
            for (const property of properties) {
                const newNode = Object.assign({}, templateNode)
                newNode.id = tempID
                newNode.title = property[0] + ": " + property[1]
                newNode.parameters = { property: property[0], propertyvalue: property[1] }
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else if (changeBool) {
            for (const property of properties) {
                const newNode = Object.assign({}, templateNode)
                newNode.id = tempID
                newNode.title = property[0] + ": " + property[1]
                newNode.parameters = { property: property[0], changePropertyvalue: property[1] }
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else if (swapBool) {
            const propsToUse = []
            for (const propertyOption of caiProjectModel.getOptions(currentProperty)) {
                if (propertyOption === propertyValueToChange) {
                    propsToUse.push(propertyOption)
                } else {
                    let isInProject = false
                    for (const property of properties) {
                        if (property[0] === currentProperty && property[1] === propertyOption) {
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
                newNode.id = tempID
                newNode.title = property
                newNode.parameters = { property: currentProperty, propertyvalue: property }
                currentDropup[activeProject] = currentProperty
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else {
            for (const propertyOption of caiProjectModel.getOptions(currentProperty)) {
                if (!caiProjectModel.hasProperty(propertyOption)) {
                    const newNode = Object.assign({}, templateNode)
                    newNode.id = tempID
                    newNode.title = propertyOption
                    newNode.parameters = { propertyvalue: propertyOption }
                    caiTree.push(newNode)
                    buttons.push({ label: newNode.title, value: newNode.id })
                    currentTreeNode[activeProject].options.push(tempID)
                    tempID++
                }
            }
        }
    } else {
        for (const i in currentTreeNode[activeProject].options) {
            const nextNode = currentTreeNode[activeProject].options[i]
            buttons.push({ label: nextNode.title, value: Number(i) + 1 })
        }
    }

    return buttons
}

export function addToNodeHistory(nodeObj: any, sourceCode?: string, project: string = activeProject) {
    if (location.href.includes("wizard") && nodeObj[0] !== "Slash") {
        return
    } // Disabled for Wizard of Oz operators.
    if (FLAGS.SHOW_CAI && nodeHistory[project]) {
        nodeHistory[project].push(nodeObj)
        codeSuggestion.storeHistory(nodeHistory[project])
        if (FLAGS.UPLOAD_CAI_HISTORY && nodeObj[0] !== 0) {
            userProject.uploadCAIHistory(project, nodeHistory[project][nodeHistory[project].length - 1], sourceCode)
        }
        console.log("node history", nodeHistory)
    }
}

export function isDone() {
    return done
}

export function showNextDialogue(utterance: string = currentTreeNode[activeProject].utterance, project: string = activeProject) {
    currentTreeNode[project] = Object.assign({}, currentTreeNode[project]) // make a copy
    if (currentTreeNode[project].id === 69) {
        done = true
    }
    const musicResults = codeSuggestion.getMusic()
    if ("event" in currentTreeNode[project]) {
        for (const eventItem of currentTreeNode[project].event) {
            if (eventItem !== "codeRequest") {
                caiStudentHistoryModule.trackEvent(eventItem)
                addToNodeHistory(["request", eventItem])
            }
        }
    }
    if (currentTreeNode[project].title === "Maybe later") {
        studentInteracted = false
    }
    const parameters = []
    // get properties
    if ("property" in currentTreeNode[project].parameters) {
        currentProperty = currentTreeNode[project].parameters.property
    }
    if ("propertyvalue" in currentTreeNode[project].parameters) {
        currentPropertyValue = currentTreeNode[project].parameters.propertyvalue
    }
    if ("changePropertyvalue" in currentTreeNode[project].parameters) {
        propertyValueToChange = currentTreeNode[project].parameters.changePropertyvalue
    }
    if (utterance.includes("[SECTIONSELECT")) {
        const lastIndex = utterance.indexOf("]")
        const cut = utterance.substring(1, lastIndex).split("|")
        let newUtterance = ""
        if (Object.keys(musicResults).length > 0 && musicResults.SOUNDPROFILE !== null && Object.keys(musicResults.SOUNDPROFILE).length > 1) {
            // utterance asks present set of options
            currentTreeNode[project].options = []
            for (const option of cut[1].split(",")) {
                currentTreeNode[project].options.push(parseInt(option))
            }
            newUtterance = "sure, do you want ideas for a specific section?"
        } else {
            // move directly to node indicated in secodn #
            currentTreeNode[project] = Object.assign({}, caiTree[parseInt(cut[2])])
            newUtterance = currentTreeNode[project].utterance
        }
        utterance = newUtterance + utterance.substring(lastIndex + 1)
    }
    if (utterance.includes("[RESET_PARAMS]")) {
        currentInstr = null
        currentGenre = null
        currentSection = null
        utterance = utterance.substring(0, utterance.indexOf("[RESET_PARAMS]"))
    }
    if (utterance.includes("[STOREPROPERTY]")) {
        utterance = utterance.substring(15)
        storeProperty()
        console.log("PROJECT MODEL", caiProjectModel.getModel())
        addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    if (utterance.includes("[CLEARPROPERTY]")) {
        utterance = utterance.substring(15)
        caiProjectModel.removeProperty(currentProperty, currentPropertyValue)
        console.log("PROJECT MODEL", caiProjectModel.getModel())
        addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    if (utterance.includes("[REPLACEPROPERTY]")) {
        utterance = utterance.substring(17)
        caiProjectModel.removeProperty(currentProperty, propertyValueToChange)
        caiProjectModel.updateModel(currentProperty, currentPropertyValue)
        propertyValueToChange = ""
        console.log("PROJECT MODEL", caiProjectModel.getModel())
        addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    // actions first
    if (utterance === "[GREETING]") {
        if (Object.keys(nodeHistory[activeProject]).length < 2) {
            utterance = "hey, I'm CAI (short for Co-creative AI). I'll be your partner in EarSketch. I'm still learning programming but working together can help both of us. Watch this video to learn more about how to talk to me."
        } else {
            utterance = "good to see you again. let's get started."
        }
    }
    if (utterance.includes("[SUGGESTPROPERTY]")) {
        caiProjectModel.setOptions()
        const output = caiProjectModel.randomPropertySuggestion()
        let utterReplace = ""
        if (Object.keys(output).length > 0) {
            currentProperty = output.property
            currentPropertyValue = output.value
            if (output.isAdded) {
                utterReplace = "what if we also did " + output.value + " for our " + output.property + "?"
            } else {
                utterReplace = "what if we did " + output.value + " for our " + output.property + "?"
            }
            utterance = utterance.replace("[SUGGESTPROPERTY]", utterReplace)
        } else {
            utterance = "I'm not sure what to suggest right now. Let's get started working, and then I can come up with some more ideas."
        }
    }
    // use current property
    if (utterance.includes("[CURRENTPROPERTY]")) {
        if (currentProperty !== "code structure") {
            utterance = utterance.replace("[CURRENTPROPERTY]", currentProperty)
        } else {
            utterance = utterance.replace("[CURRENTPROPERTY]", "the code")
        }
    }
    if (utterance.includes("[SUGGESTION]")) {
        utteranceObj = actions["[SUGGESTION]"]()
        parameters.push(["SUGGESTION", utteranceObj.id])
        utterance = utteranceObj.utterance
    } else if (currentTreeNode[project].utterance in actions) {
        utterance = actions[currentTreeNode[project].utterance]()
        if (currentTreeNode[project].utterance === "[SUGGESTIONEXPLAIN]" || currentTreeNode[project].utterance === "[SUGGESTIONEXAMPLE]") {
            parameters.push([currentTreeNode[project].utterance, utteranceObj.id])
        } else {
            parameters.push([currentTreeNode[project].utterance, utterance])
        }
    }
    if (currentTreeNode[project].options in actions) {
        currentTreeNode[project].options = actions[currentTreeNode[project].options]()
    }
    if (utterance === "sure, do you want ideas for a specific section or measure?") {
        if (currentError[0] !== "") {
            currentTreeNode[project] = Object.assign({}, caiTree[CAI_TREES.error])
            utterance = "let's fix our error first. [ERROREXPLAIN]"
        }
    }
    // set up sound recs. if theres "[SOUNDWAIT|x]" we need to fill that in (for each sound rec, add "|" + recname)
    if (utterance.includes("[sound_rec]")) {
        if (!currentTreeNode[project].options.includes(93)) {
            currentTreeNode[project].options.push(93)
            currentTreeNode[project].options.push(102)
        }
        // limit by instrument
        let instrumentArray = []
        if ("INSTRUMENT" in currentTreeNode[project].parameters) {
            currentInstr = currentTreeNode[project].parameters.INSTRUMENT
            parameters.push(["INSTRUMENT", currentInstr])
            instrumentArray = [currentInstr]
        } else if (currentInstr === null && caiProjectModel.getModel().instrument.length > 0) {
            instrumentArray = caiProjectModel.getModel().instrument.slice(0)
        } else if (currentInstr !== null) {
            instrumentArray = [currentInstr]
        }
        // limit by genre
        let genreArray = []
        if ("GENRE" in currentTreeNode[project].parameters) {
            currentGenre = currentTreeNode[project].parameters.GENRE
            parameters.push(["GENRE", currentGenre])
            genreArray = [currentGenre]
        } else if (currentGenre === null && caiProjectModel.getModel().genre.length > 0) {
            genreArray = caiProjectModel.getModel().genre.slice(0)
        } else if (currentGenre !== null) {
            genreArray = [currentGenre]
        }
        // collect input samples from source code
        const count = (utterance.match(/sound_rec/g) || []).length
        const allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as Script)

        // recommend sounds for specific section
        let samples: string [] = []
        if (currentSection && Object.keys(musicResults).length > 0 && musicResults.SOUNDPROFILE) {
            const sectionSamples = soundProfileLookup(musicResults.SOUNDPROFILE, "section", currentSection, "sound")
            for (const sample of allSamples) {
                if (sectionSamples.includes(sample)) {
                    samples.push(sample)
                }
            }
        } else {
            samples = allSamples
        }

        if (samples.length < 1) {
            for (let i = 0; i < 5; i++) {
                samples = recommender.addRandomRecInput(samples)
            }
        }

        let recs: any = []
        const usedRecs = []
        if (recommendationHistory[project].length === Object.keys(recommender.getKeyDict("genre")).length) {
            recommendationHistory[project] = []
        }

        recs = recommender.recommendReverse([], samples, 1, 1, genreArray, instrumentArray, recommendationHistory[project], count)
        recs = recs.slice(0, count)
        let recIndex = 0

        // fill recs with additional suggestions if too few from the selected genres/instruments are available
        if (recs.length < count) {
            const combinations = [[genreArray, []], [[], instrumentArray], [[], []]]
            let numNewRecs = count - recs.length
            for (const combination of combinations) {
                const newRecs = recommender.recommendReverse([], samples, 1, 1, combination[0], combination[1], recommendationHistory[project], numNewRecs)
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
            recommendationHistory[project].push(recs[idx])
        }
        let numLoops = 0

        while (utterance.includes("[sound_rec]")) {
            const recBounds = [utterance.indexOf("[sound_rec]"), utterance.indexOf("[sound_rec]") + 11]
            const newRecString = recs[recIndex]
            usedRecs.push(newRecString)
            if (newRecString !== undefined) {
                utterance = utterance.substring(0, recBounds[0]) + "[sound_rec|" + newRecString + "]" + utterance.substring(recBounds[1]).replace(/(\r\n|\n|\r)/gm, "")
                recIndex++
            }
            numLoops++
            if (numLoops > 10) {
                utterance = "I'm out of ideas. You can add some sounds to inspire me."
                break
            }
        }
        if (utterance.includes("[SOUNDWAIT")) {
            const addSoundsIndex = utterance.lastIndexOf("]")
            const newString = "|" + recs.join("|") + "]"
            utterance = utterance.substring(0, addSoundsIndex) + newString
        }
        parameters.push(["sound_rec", recs])
        caiStudentPreferenceModule.addSoundSuggestion(usedRecs)
    }
    if (utterance.includes("ERROREXPLAIN")) {
        const errorExplanation = explainError()
        utterance = utterance.substring(0, utterance.indexOf("[ERROREXPLAIN]")) + errorExplanation + utterance.substring(utterance.lastIndexOf("[ERROREXPLAIN]") + 14)
        parameters.push(["ERROREXPLAIN", errorExplanation])
    }
    while (utterance.includes("[SECTION]")) {
        const recBounds = [utterance.indexOf("[SECTION]"), utterance.indexOf("[SECTION]") + 11]
        // pick a location in the code.
        let newRecString: any = "one of our sections"
        const musicResults = codeSuggestion.getMusic()
        if (Object.keys(musicResults).length > 0 && musicResults.SOUNDPROFILE !== null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
            const indexVal = Object.keys(musicResults.SOUNDPROFILE)[randomIntFromInterval(0, Object.keys(musicResults.SOUNDPROFILE).length - 1)]
            const bounds = musicResults.SOUNDPROFILE[indexVal].measure
            newRecString = "the section between measures " + bounds[0] + " and " + bounds[1]
        }
        utterance = utterance.substring(0, recBounds[0]) + newRecString + utterance.substring(recBounds[1])
    }
    if (utterance.includes("[FORM]")) {
        const validForms = []
        let currentForm = ""
        const musicResults = codeSuggestion.getMusic()
        if (Object.keys(musicResults).length > 0 && musicResults.SOUNDPROFILE !== null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
            const keys = Object.keys(musicResults.SOUNDPROFILE)
            for (const i in keys) {
                currentForm += (keys[i][0])
            }
            for (const i in allForms) {
                if (allForms[i].startsWith(currentForm) && allForms[i] !== currentForm) {
                    validForms.push(allForms[i])
                }
            }
            // select form at random
            const newForm = validForms[randomIntFromInterval(0, validForms.length - 1)]
            utterance = utterance.replace("[FORM]", newForm)
            if (newForm.includes("undefined")) {
                utterance = codeSuggestion.randomNucleus()
            } else {
                currentPropertyValue = newForm
            }
        } else {
            // return random form from allForms
            const newFormVal = allForms[randomIntFromInterval(0, allForms.length - 1)]
            currentPropertyValue = newFormVal
            utterance = utterance.replace("[FORM]", newFormVal)
            if (utterance.includes("undefined")) {
                utterance = codeSuggestion.randomNucleus()
            }
        }
    }
    if (utterance.includes("[FORMGOAL]")) {
        const formGoal = caiProjectModel.getModel().form
        utterance = utterance.replace("[FORMGOAL]", formGoal)
    }
    if (utterance.includes("[COMPLEXITYGOAL]")) {
        const selectedComplexityGoal = caiProjectModel.getModel()["code structure"][randomIntFromInterval(0, caiProjectModel.getModel()["code structure"].length - 1)]
        utterance = utterance.replace("[COMPLEXITYGOAL]", codeGoalReplacements[selectedComplexityGoal])
    }
    if (utterance.includes("[CURRENTPROPERTY]")) {
        if (currentProperty !== "code structure") {
            utterance = utterance.replace("[CURRENTPROPERTY]", currentProperty)
        } else {
            utterance = utterance.replace("[CURRENTPROPERTY]", "the code")
        }
    }
    // then set waits, etc.
    if (utterance.includes("[WAIT")) {
        // get the number and set currentWait
        currentWait = Number.parseInt(utterance.substring(utterance.indexOf("[WAIT") + 6, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[WAIT"))
    } else if (utterance.includes("[ERRORWAIT")) {
        errorWait = Number.parseInt(utterance.substring(utterance.indexOf("[ERRORWAIT") + 11, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[ERRORWAIT"))
    } else if (utterance.includes("[COMPLEXITYWAIT")) {
        // format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)
        const args = utterance.substring(utterance.indexOf("[COMPLEXITYWAIT"))
        utterance = utterance.substring(0, utterance.indexOf("[COMPLEXITYWAIT"))
        const waitArgs = args.split("|")
        complexityWait.node = parseInt(waitArgs[1])
        complexityWait.complexity = {}
        for (let i = 2; i < waitArgs.length; i++) {
            // convert to property name and integer
            const parts = waitArgs[i].split(":")
            complexityWait.complexity[parts[0]] = parseInt(parts[1])
        }
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
        complexityWait.node = -1
        soundWait.sounds = []
    }
    const structure = processUtterance(utterance)

    if (!FLAGS.SHOW_CHAT && nodeHistory[project] && utterance !== "" && structure.length > 0) {
        // Add current node (by node number) and parameters to node history
        if (Number.isInteger(currentTreeNode[project].id)) {
            addToNodeHistory([currentTreeNode[project].id, parameters], undefined, project)
        } else {
            addToNodeHistory([0, utterance, parameters], undefined, project)
        }
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

export function processUtterance(utterance: string) {
    const message: any[] = []
    let pos = utterance.search(/[[]/g)
    let subMessage: any[] = []
    if (pos > -1) {
        while (pos > -1) {
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
                    if (Object.keys(LINKS).includes(content)) {
                        const link = LINKS[content]
                        subMessage = ["LINK", [content, link]]
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

const LINKS: { [key: string]: string } = {
    fitMedia: "/en/v2/getting-started.html#fitmedia",
    setTempo: "/en/v2/your-first-song.html#settempo",
    variable: "/en/v2/add-beats.html#variables",
    variables: "/en/v2/add-beats.html#variables",
    makeBeat: "/en/v2/add-beats.html#makebeat",
    loop: "/en/v2/loops-and-layers.html#forloops",
    "for loop": "/en/v2/loops-and-layers.html#forloops",
    loops: "/en/v2/loops-and-layers.html#forloops",
    range: "/en/v2/loops-and-layers.html#forloops",
    setEffect: "/en/v2/effects-and-envelopes.html#effectsinearsketch",
    "effect ramp": "/en/v2/effects-and-envelopes.html#effectsandenvelopes",
    function: "/en/v2/effects-and-envelopes.html#functionsandmoreeffects",
    functions: "/en/v2/effects-and-envelopes.html#functionsandmoreeffects",
    "if statement": "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    if: "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    conditional: "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    "conditional statement": "/en/v2/mixing-with-conditionals.html#conditionalstatements",
    section: "/en/v2/custom-functions.html#asongsstructure",
    sections: "/en/v2/custom-functions.html#asongsstructure",
    ABA: "/en/v1/musical-form-and-custom-functions.html#abaform",
    "custom function": "/en/v2/custom-functions.html#creatingyourcustomfunctions",
    parameters: "/en/v1/ch_YVIPModule4.html#_writing_custom_functions",
    "console input": "/en/v2/get-user-input.html#userinput",
    filter: "/en/v1/every-effect-explained-in-detail.html#filter",
    FILTER: "/en/v1/every-effect-explained-in-detail.html#filter",
    FILTER_FREQ: "/en/v1/every-effect-explained-in-detail.html#filter",
    "volume mixing": "/en/v1/every-effect-explained-in-detail.html#volume",
    importing: "/en/v1/every-error-explained-in-detail.html#importerror",
    indented: "/en/v1/every-error-explained-in-detail.html#indentationerror",
    index: "/en/v1/every-error-explained-in-detail.html#indexerror",
    name: "/en/v1/every-error-explained-in-detail.html#nameerror",
    "parse error": "/en/v1/every-error-explained-in-detail.html#parseerror",
    "syntax error": "/en/v1/every-error-explained-in-detail.html#syntaxerror",
    "type error": "/en/v1/every-error-explained-in-detail.html#typeerror",
    "function arguments": "/en/v1/every-error-explained-in-detail.html#valueerror",
    list: "/en/v1/data-structures.html",
    randomness: "/en/v1/randomness.html",
    "nested loops": "/en/v1/sonification.html#nestedloops",
}

// check if any current wait flags are active.
export function activeWaits() {
    if (currentWait !== -1) {
        return true
    }
    if (errorWait !== -1) {
        return true
    }
    if (soundWait.node !== -1) {
        return true
    }
    if (complexityWait.node !== -1) {
        return true
    }
    return false
}

// move dialogue tree to one of the available starting points.
function startTree(treeName: string) {
    currentTreeNode[activeProject] = Object.assign({}, caiTree[CAI_TREES[treeName]])
    return showNextDialogue()
}

// Updates and CAI-generated response with current user input.
export function generateOutput(input: any, project: string = activeProject) {
    const index = Number(input)
    if (Number.isInteger(index) && !Number.isNaN(index)) {
        return moveToNode(index)
    }
    function moveToNode(input: any) {
        if (input in CAI_TREES) {
            return startTree(input)
        }
        if (currentTreeNode[project] !== null) {
            if (currentTreeNode[project].options.length === 0) {
                const utterance = currentTreeNode[project].utterance
                currentTreeNode[project] = null
                return utterance
            }
            if (input !== null && typeof input === "number") {
                if (Number.isInteger(currentTreeNode[project].options[0])) {
                    currentTreeNode[project] = caiTree[input]
                } else {
                    currentTreeNode[project] = currentTreeNode[project].options[input]
                }
                for (const i in Object.keys(currentTreeNode[project].parameters)) {
                    currentParameters[Object.keys(currentTreeNode[project].parameters)[i]] = currentTreeNode[project].parameters[Object.keys(currentTreeNode[project].parameters)[i]]
                    if (currentParameters.section) {
                        currentSection = currentParameters.section
                    }
                }
                return showNextDialogue()
            }
        } else return ""
    }
    return moveToNode(input)
}

// Generates a suggestion for music or code additions/changes and outputs a representative dialogue object
function generateSuggestion(project: string = activeProject) {
    if (currentError[0] !== "") {
        if (isPrompted) {
            const outputObj = Object.assign({}, caiTree[CAI_TREES.error])
            outputObj.utterance = "let's fix our error first. " + outputObj.utterance
            return outputObj
        } else {
            return ""
        }
    }
    if (isPrompted) {
        studentInteracted = true
        if (!FLAGS.SHOW_CHAT) {
            caiStudentHistoryModule.trackEvent("codeRequest")
            addToNodeHistory(["request", "codeRequest"])
        }
    }
    let outputObj = codeSuggestion.generateCodeSuggestion(nodeHistory[project])
    currentSuggestion[project] = Object.assign({}, outputObj)
    if (outputObj !== null) {
        if (outputObj.utterance === "" && isPrompted) {
            outputObj = codeSuggestion.randomNucleus(nodeHistory[project], false)
        }
        if (outputObj.utterance.includes("[STARTTREE|")) {
            // what tree are we starting?
            let treeName = outputObj.utterance.substring(outputObj.utterance.indexOf("[STARTTREE|") + 11)
            treeName = treeName.substring(0, treeName.lastIndexOf("]"))
            currentTreeNode[project] = Object.assign({}, caiTree[CAI_TREES[treeName]])
            return currentTreeNode[project]
        }
        if ("complexity" in outputObj && outputObj.utterance !== "") {
            caiStudentPreferenceModule.addCodeSuggestion(outputObj.complexity, outputObj.utterance)
        }
        return outputObj
    } else {
        return ""
    }
}

// helper function to generate random integers
function randomIntFromInterval(min: number, max: number) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function checkForCodeUpdates(code: string, project: string = activeProject) {
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
