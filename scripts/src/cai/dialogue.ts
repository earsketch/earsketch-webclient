// Dialogue module for CAI (Co-creative Artificial Intelligence) Project.
import * as caiErrorHandling from "./errorHandling"
import * as caiStudentPreferenceModule from "./studentPreferences"
import * as caiProjectModel from "./projectModel"
import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS } from "./caitree"
import * as recommender from '../app/recommender'
import * as userProject from '../app/userProject'
import * as caiStudentHistoryModule from "./studentHistory"
import * as codeSuggestion from "./codeSuggestion"
import { ScriptEntity } from 'common'

let currentInput : { [key:string]: any } = {}
let currentParameters : { [key:string]: any } = {}
let currentTreeNode : { [key:string]: any } = {}
let studentCodeObj : any = []
let musicAnalysisObj = {}
let measures = []
let lineNodes = []
let parameterNodes = []

let currentSuggestion : { [key: string]: any } = {}
let utteranceObj : any

let currentWait = -1
let errorWait = -1
let soundWait : { [key:string]: any } = { node: -1, sounds: [] }
let complexityWait : { [key:string]: any } = { node: -1, complexity: {} }

let currentError = ["", ""]

let currentComplexity : { [key:string]: any } = {}
let currentInstr : any = null
let currentGenre : any = null

let currentProperty : any = ""
let currentPropertyValue : any = ""
let propertyValueToChange : any = ""

let complexityUpdated = true
let errorSuccess = 0
let errorFail = 0

let activeProject = ''
let nodeHistory : { [key:string]: any [] } = {}
let recommendationHistory : { [key:string]: any [] } = {}
let chattiness = 0
let currentNoSuggRuns = 0
let recentScripts : any = {}

let studentInteracted = false
let currentDropup = ""
let isPrompted = true

let soundSuggestionsUsed : { [key: string]: any } = {}
let codeSuggestionsUsed : { [key: string]: any } = {}

let done = false

let currentSection : any = null
const caiTree = CAI_TREE_NODES.slice(0)

const allForms = ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"]

const codeGoalReplacements : { [key: string]: string} = {
  "function": "a [LINK|function]",
  "consoleInput": "[LINK|console input]",
  "forLoop": "a [LINK|for loop]",
  "conditional": "a [LINK|conditional statement]"
}

//defines creation rules for generated utterances/button options (ex. creates option items for every line of student code for line selection)
const actions : { [key: string]: any } = {
    "[SUGGESTION]": function () {
        return generateSuggestion()
    },
    "[SUGGESTIONEXPLAIN]": function () {
        return currentSuggestion[activeProject].explain
    },
    "[SUGGESTIONEXAMPLE]": function () {
        return currentSuggestion[activeProject].example
    }
}

export function studentInteractedValue() {
    return studentInteracted
}

export function getDropup() {
    return currentDropup
}

function storeProperty() {
    if (currentProperty != "" && currentPropertyValue != "") {
        caiProjectModel.updateModel(currentProperty, currentPropertyValue)
    }
}

function clearProperty() {
    caiProjectModel.clearProperty(currentPropertyValue)
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
    //interface w/student preference module
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
    studentCodeObj = []
    musicAnalysisObj = {}
    measures = []
    lineNodes = []
    parameterNodes = []

    currentProperty = ""

    currentSuggestion = {}
    utteranceObj

    currentWait = -1
    errorWait = -1
    soundWait = { node: -1, sounds: [] }
    complexityWait = { node: -1, complexity: {} }

    currentError = ["", ""]

    currentComplexity = {}
    currentInstr = null
    currentGenre = null

    complexityUpdated = true
    errorSuccess = 0
    errorFail = 0

    activeProject = ''
    nodeHistory = {}
    recommendationHistory = {}
    chattiness = 0
    currentNoSuggRuns = 0
    recentScripts = {}

    studentInteracted = false
    currentDropup = ""
    isPrompted = true

    soundSuggestionsUsed = {}
    codeSuggestionsUsed = {}

    done = false
}

export function handleError(error: any) {
    const t = Date.now()
    caiStudentPreferenceModule.addCompileError(error, t)
    addToNodeHistory(["Compilation With Error", error])
    if (String(error[0]) === String(currentError[0]) && errorWait != -1) {
        //then it's the same error. do nothing. we still wait
        return ""
    } else {
        currentError = error
        return "newError"
    }
}

export function attemptErrorFix() {
    return caiErrorHandling.handleError(currentError, studentCodeObj)
}

export function setSuccessFail(s: number, f: number) {
    errorSuccess = s
    errorFail = f
}

function explainError() {
    let errorType = String(currentError[0]).split(':')[0].trim()
    if (errorType == "ExternalError") {
        errorType = String(currentError[0]).split(':')[1].trim()
    }
    if (CAI_ERRORS[errorType]) {
        return CAI_ERRORS[errorType]
    } else {
        return "i'm not sure how to fix this. you might have to peek at the curriculum"
    }
}

export function processCodeRun(studentCode: string, functions: any[], variables: any[], complexityResults: any, musicResults: any) {
    caiErrorHandling.updateNames(variables, functions)
    studentCodeObj = studentCode
    const allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as ScriptEntity)
    caiStudentPreferenceModule.runSound(allSamples)
    //once that's done, record historicalinfo from the preference module
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
    if (complexityResults != null) {
        currentComplexity = Object.assign({}, complexityResults)
        if (currentComplexity.userFunc == "Args" || currentComplexity.userFunc == "Returns") {
            currentComplexity.userFunc = 3
        } else if (currentComplexity.userFunc == "ReturnAndArgs") {
            currentComplexity.userFunc = 4
        }
        addToNodeHistory(["Successful Compilation", Object.assign({}, currentComplexity)])
    }
    if (!studentInteracted) {
        return ""
    }
    currentError = ["", ""]
    if (currentWait != -1) {
        currentTreeNode[activeProject] = Object.assign({}, caiTree[currentWait])
        currentWait = -1
        return showNextDialogue()
    } else if (errorWait != -1) {
        currentTreeNode[activeProject] = Object.assign({}, caiTree[errorWait])
        errorWait = -1
        return showNextDialogue()
    } else if (soundWait.node != -1) {
        //get array of sound names
        const allSounds = recommender.addRecInput([], { source_code: studentCode } as ScriptEntity)
        let soundFound = false
        for (let i in soundWait.sounds) {
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
    } else if (complexityWait.node != -1) {
        let meetsRequirements = true
        for (let i in complexityWait.complexity) {
            if (currentComplexity[i] < complexityWait.complexity[i]) {
                meetsRequirements = false
                break
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
        //this is where chattiness parameter might come in
        if (currentNoSuggRuns >= chattiness) {
            currentNoSuggRuns = 0
            isPrompted = false
            const next = startTree('suggest')
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

function clearParameters() {
    currentParameters = {}
}

// Creates label/value array from dialogue selection options available to current node.
export function createButtons() {
    let buttons = []
    if (currentTreeNode[activeProject].id == 34 && (currentSuggestion[activeProject] == null || (currentSuggestion[activeProject].explain == null || currentSuggestion[activeProject].explain == ""))) {
        currentSuggestion[activeProject] = null
        return []
    }
    if (Number.isInteger(currentTreeNode[activeProject].options[0])) {
        if ('dropup' in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup == "Genres") {
            //filter the button options
            let availableGenres = []
            let allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as ScriptEntity)
            if (allSamples.length < 1) {
                for (let i = 0; i < 5; i++)
                    allSamples = recommender.addRandomRecInput(allSamples)
            }
            availableGenres = recommender.availableGenres()
            for (let i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                if (availableGenres.includes(caiTree[nextNode].title.toUpperCase())) {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        } else if ('dropup' in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup == "Instruments") {
            //filter the button options
            let availableInstruments = []
            let allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as ScriptEntity)
            if (allSamples.length < 1) {
                for (let i = 0; i < 5; i++) {
                    allSamples = recommender.addRandomRecInput(allSamples)
                }
            }
            availableInstruments = recommender.availableInstruments()
            for (let i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                if (availableInstruments.includes(caiTree[nextNode].title.toUpperCase())) {
                    buttons.push({ label: caiTree[nextNode].title, value: nextNode })
                }
            }
        } else {
            for (let i in currentTreeNode[activeProject].options) {
                const nextNode = currentTreeNode[activeProject].options[i]
                buttons.push({ label: caiTree[nextNode].title, value: nextNode })
            }
        }
    } else if (currentTreeNode[activeProject].options[0] != null && currentTreeNode[activeProject].options[0].includes("SECTIONS") && codeSuggestion.getMusic() != null) {
        const musicResults = codeSuggestion.getMusic()
        if (musicResults != {} && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
            let highestNumber = 0
            for (let i = 0; i < caiTree.length; i++) {
                if (caiTree[i].id > highestNumber) {
                    highestNumber = caiTree[i].id
                }
            }
            const templateNodeID = parseInt(currentTreeNode[activeProject].options[0].split("|")[1])
            const templateNode = caiTree[templateNodeID]
            let tempID = highestNumber + 1
            currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
            currentTreeNode[activeProject].options = []
            //starting with the NEXT id, create temporary nodes for each section
            const keys = Object.keys(musicResults.SOUNDPROFILE)
            for (let j = 0; j < keys.length; j++) {
                const newNode = Object.assign({}, templateNode)
                newNode["id"] = tempID
                newNode["title"] = "Section " + musicResults.SOUNDPROFILE[keys[j]].value + " between measures " + musicResults.SOUNDPROFILE[keys[j]].measure[0] + " and " + musicResults.SOUNDPROFILE[keys[j]].measure[1]
                newNode["parameters"] = {}
                newNode.parameters["section"] = musicResults.SOUNDPROFILE[keys[j]].value
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
    } else if (currentTreeNode[activeProject].options[0] != null && currentTreeNode[activeProject].options[0].includes("PROPERTIES")) {
        let highestNumber = 0
        for (let i = 0; i < caiTree.length; i++) {
            if (caiTree[i].id > highestNumber) {
                highestNumber = caiTree[i].id
            }
        }
        const templateNodeID = parseInt(currentTreeNode[activeProject].options[0].split("|")[1])
        const templateNode = caiTree[templateNodeID]
        let tempID = highestNumber + 1
        currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject])
        currentTreeNode[activeProject].options = []
        caiProjectModel.setOptions()
        const keys = caiProjectModel.getProperties()
        for (let j = 0; j < keys.length; j++) {
            const options = caiProjectModel.getOptions(keys[j])
            const model = caiProjectModel.getModel()
            if (model[keys[j]].length < options.length) {
                const newNode = Object.assign({}, templateNode)
                newNode["id"] = tempID
                newNode["title"] = caiProjectModel.getPropertyButtons()[keys[j]]
                newNode["parameters"] = { property: keys[j] }
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        }
        if(!caiProjectModel.isEmpty()) {
            const newNode = Object.assign({}, caiTree[89])
            newNode["id"] = tempID
            newNode["parameters"] = {}
            caiTree.push(newNode)
            buttons.push({ label: newNode.title, value: newNode.id })
            currentTreeNode[activeProject].options.push(tempID)
            tempID++
        }
    } else if (currentTreeNode[activeProject].options[0] != null && currentTreeNode[activeProject].options[0].includes("PROPERTYOPTIONS")) {
        let highestNumber = 0
        for (let i = 0; i < caiTree.length; i++) {
            if (caiTree[i].id > highestNumber) {
                highestNumber = caiTree[i].id
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
        currentDropup = currentProperty
        caiProjectModel.setOptions()
        const properties = caiProjectModel.getAllProperties()
        if (clearBool) {
            for (let j = 0; j < properties.length; j++) {
                const newNode = Object.assign({}, templateNode)
                newNode["id"] = tempID
                newNode["title"] = properties[j][0] + ": " + properties[j][1]
                newNode["parameters"] = { property: properties[j][0], propertyvalue: properties[j][1] }
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else if (changeBool) {
            for (let j = 0; j < properties.length; j++) {
                const newNode = Object.assign({}, templateNode)
                newNode["id"] = tempID
                newNode["title"] = properties[j][0] + ": " + properties[j][1]
                newNode["parameters"] = { property: properties[j][0], changePropertyvalue: properties[j][1] }
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else if (swapBool) {
            const allProps = caiProjectModel.getOptions(currentProperty)
            let propsToUse = []
            for (let k = 0; k < allProps.length; k++) {
                if (allProps[k] == propertyValueToChange) {
                    propsToUse.push(allProps[k])
                } else {
                    let isInProject = false
                    for (let g = 0; g < properties.length; g++) {
                        if (properties[g][0] == currentProperty && properties[g][1] == allProps[k]) {
                            isInProject = true
                            break
                        }
                    }
                    if (!isInProject) {
                        propsToUse.push(allProps[k])
                    }
                }
            }
            for (let j = 0; j < propsToUse.length; j++) {
                const newNode = Object.assign({}, templateNode)
                newNode["id"] = tempID
                newNode["title"] = propsToUse[j]
                newNode["parameters"] = { property: currentProperty, propertyvalue: propsToUse[j] }
                currentDropup = currentProperty
                caiTree.push(newNode)
                buttons.push({ label: newNode.title, value: newNode.id })
                currentTreeNode[activeProject].options.push(tempID)
                tempID++
            }
        } else {
            const keys = caiProjectModel.getOptions(currentProperty)
            for (let j = 0; j < keys.length; j++) {
                if (!caiProjectModel.hasProperty(keys[j])) {
                    const newNode = Object.assign({}, templateNode)
                    newNode["id"] = tempID
                    newNode["title"] = keys[j]
                    newNode["parameters"] = { propertyvalue: keys[j] }
                    caiTree.push(newNode)
                    buttons.push({ label: newNode.title, value: newNode.id })
                    currentTreeNode[activeProject].options.push(tempID)
                    tempID++
                }
            }
        }
    } else {
        for (let i in currentTreeNode[activeProject].options) {
            const nextNode = currentTreeNode[activeProject].options[i]
            buttons.push({ label: nextNode.title, value: Number(i) + 1 })
        }
    }
    if ('dropup' in currentTreeNode[activeProject]) {
        currentDropup = currentTreeNode[activeProject].dropup
    }
    return buttons
}

export function addToNodeHistory(nodeObj: any) {
    if (FLAGS.SHOW_CAI && nodeHistory[activeProject]) {
        nodeHistory[activeProject].push(nodeObj)
        codeSuggestion.storeHistory(nodeHistory[activeProject])
        if (FLAGS.UPLOAD_CAI_HISTORY && nodeObj[0] != 0) {
            userProject.uploadCAIHistory(activeProject, nodeHistory[activeProject][nodeHistory[activeProject].length - 1])
        }
        console.log("node history", nodeHistory)
    }
}

export function isDone() {
    return done
}

function shuffle(array : any[]) {
    let currentIndex = array.length, temporaryValue, randomIndex
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex -= 1
        // And swap it with the current element.
        temporaryValue = array[currentIndex]
        array[currentIndex] = array[randomIndex]
        array[randomIndex] = temporaryValue
    }
    return array
}

function showNextDialogue() {
    currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject]) //make a copy
    if (currentTreeNode[activeProject].id == 69) {
        done = true
    }
    const musicResults = codeSuggestion.getMusic()
    if ("event" in currentTreeNode[activeProject]) {
        for (let k = 0; k < currentTreeNode[activeProject].event.length; k++) {
            if (currentTreeNode[activeProject].event[k] != 'codeRequest') {
                caiStudentHistoryModule.trackEvent(currentTreeNode[activeProject].event[k])
                addToNodeHistory(["request", currentTreeNode[activeProject].event[k]])
            }
        }
    }
    let utterance = currentTreeNode[activeProject].utterance
    if (currentTreeNode[activeProject].title === "Maybe later") {
        studentInteracted = false
    }
    const parameters = []
    //get properties
    if ("property" in currentTreeNode[activeProject].parameters) {
        currentProperty = currentTreeNode[activeProject].parameters['property']
    }
    if ("propertyvalue" in currentTreeNode[activeProject].parameters) {
        currentPropertyValue = currentTreeNode[activeProject].parameters['propertyvalue']
    }
    if ("changePropertyvalue" in currentTreeNode[activeProject].parameters) {
        propertyValueToChange = currentTreeNode[activeProject].parameters['changePropertyvalue']
    }
    if (utterance.includes("[SECTIONSELECT")) {
        const lastIndex = utterance.indexOf("]")
        const cut = utterance.substring(1, lastIndex).split("|")
        let newUtterance = ""
        if (musicResults != {} && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 1) {
            //utterance asks present set of options
            currentTreeNode[activeProject].options = []
            const optionList = cut[1].split(",")
            for (let g = 0; g < optionList.length; g++) {
                currentTreeNode[activeProject].options.push(parseInt(optionList[g]))
            }
            newUtterance = "sure, do you want ideas for a specific section?"
        } else {
            //move directly to node indicated in secodn #
            currentTreeNode[activeProject] = Object.assign({}, caiTree[parseInt(cut[2])])
            newUtterance = currentTreeNode[activeProject].utterance
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
        console.log('PROJECT MODEL', caiProjectModel.getModel())
        addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    if (utterance.includes("[CLEARPROPERTY]")) {
        utterance = utterance.substring(15)
        caiProjectModel.removeProperty(currentProperty, currentPropertyValue)
        console.log('PROJECT MODEL',caiProjectModel.getModel())
        addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    if (utterance.includes("[REPLACEPROPERTY]")) {
      utterance = utterance.substring(17)
      caiProjectModel.removeProperty(currentProperty, propertyValueToChange)
      caiProjectModel.updateModel(currentProperty, currentPropertyValue)
      propertyValueToChange = ""
      console.log('PROJECT MODEL',caiProjectModel.getModel())
      addToNodeHistory(["projectModel", caiProjectModel.getModel()])
    }
    //actions first
    if (utterance == "[GREETING]") {
        if (Object.keys(nodeHistory).length < 2) {
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
        if (currentProperty != "code structure") {
            utterance = utterance.replace("[CURRENTPROPERTY]", currentProperty)
        } else {
            utterance = utterance.replace("[CURRENTPROPERTY]", "the code")
        }
    }
    if (utterance.includes("[SUGGESTION]")) {
        utteranceObj = actions["[SUGGESTION]"]()
        parameters.push(["SUGGESTION", utteranceObj.id])
        utterance = utteranceObj.utterance
    } else if (currentTreeNode[activeProject].utterance in actions) {
        utterance = actions[currentTreeNode[activeProject].utterance]()
        if (currentTreeNode[activeProject].utterance == "[SUGGESTIONEXPLAIN]" || currentTreeNode[activeProject].utterance == "[SUGGESTIONEXAMPLE]") {
            parameters.push([currentTreeNode[activeProject].utterance, utteranceObj.id])
        } else {
            parameters.push([currentTreeNode[activeProject].utterance, utterance])
        }
    }
    if (currentTreeNode[activeProject].options in actions) {
        currentTreeNode[activeProject].options = actions[currentTreeNode[activeProject].options]()
    }
    if (utterance == "sure, do you want ideas for a specific section or measure?") {
        if (currentError[0] != "") {
            currentTreeNode[activeProject] = Object.assign({}, caiTree[CAI_TREES["error"]])
            utterance = "let's fix our error first. [ERROREXPLAIN]"
        }
    }
    //set up sound recs. if theres "[SOUNDWAIT|x]" we need to fill that in (for each sound rec, add "|" + recname)
    if (utterance.includes("[sound_rec]")) {
        if(!currentTreeNode[activeProject].options.includes(93)){
            currentTreeNode[activeProject].options.push(93)
            currentTreeNode[activeProject].options.push(102)
        }
        let instrumentArray = []
        if ("INSTRUMENT" in currentTreeNode[activeProject].parameters) {
            currentInstr = currentTreeNode[activeProject].parameters.INSTRUMENT
            parameters.push(["INSTRUMENT", currentInstr])
              instrumentArray = [currentInstr]
        } else if (currentInstr == null && caiProjectModel.getModel()['instrument'].length > 0) {
            instrumentArray = caiProjectModel.getModel()['instrument'].slice(0)
        } else if (currentInstr != null) {
          instrumentArray = [currentInstr]
        }
        let genreArray = []
        if ("GENRE" in currentTreeNode[activeProject].parameters) {
            currentGenre = currentTreeNode[activeProject].parameters.GENRE
            parameters.push(["GENRE", currentGenre])
            genreArray = [currentGenre]
        } else if (currentGenre == null && caiProjectModel.getModel()['genre'].length > 0) {
            genreArray = caiProjectModel.getModel()['genre'].slice(0)
        } else if (currentGenre != null) {
          genreArray = [currentGenre]
        }
        const count = (utterance.match(/sound_rec/g) || []).length
        let allSamples = recommender.addRecInput([], { source_code: studentCodeObj } as ScriptEntity)
        if (allSamples.length < 1) {
            for (let i = 0; i < 5; i++)
                allSamples = recommender.addRandomRecInput(allSamples)
        }
        let recs : any = []
        const usedRecs = []
        if (recommendationHistory[activeProject].length === Object.keys(recommender.getKeyDict('genre')).length) {
            recommendationHistory[activeProject] = []
        }
        recs = recommender.recommendReverse([], allSamples, 1, 1, genreArray, instrumentArray, recommendationHistory[activeProject], count)
        recs = recs.slice(0,count)
        let recIndex = 0
        if (currentSection != null && musicResults != {} && musicResults.SOUNDPROFILE != null) {
            recs = []
            const measureBounds = musicResults.SOUNDPROFILE[currentSection].measure.slice(0)
            measureBounds[0] -= 1
            measureBounds[1] -= 1
            //get measure-based recs
            for (let k = measureBounds[0]; k < measureBounds[1]; k++) {
                for (let s = 0; s < musicResults.RECOMMENDATIONS[k].length; s++) {
                    if (!recs.includes(musicResults.RECOMMENDATIONS[k][s])) {
                        recs.push(musicResults.RECOMMENDATIONS[k][s])
                    }
                }
            }
            shuffle(recs)
        }
        //fill recs with additional suggestions if too few from the selected genres/instruments are available
        findrecs: if (recs.length < count) {
            const combinations = [[genreArray,[]],[[],instrumentArray],[[],[]]]
            let numNewRecs = count - recs.length
            for(let i = 0; i < combinations.length; i++) {
                const newRecs = recommender.recommendReverse([], allSamples, 1, 1, combinations[i][0], combinations[i][1], recommendationHistory[activeProject], numNewRecs)
                for (let k = 0; k < newRecs.length; k++) {
                    if (!recs.includes(newRecs[k]))
                        recs.push(newRecs[k])
                }
                numNewRecs = count - recs.length
                if (numNewRecs === 0) {
                    break findrecs
                }
            }
        }
        for (let idx in recs) {
            recommendationHistory[activeProject].push(recs[idx])
        }
        let numLoops = 0
        while (utterance.includes("[sound_rec]")) {
            const recBounds = [utterance.indexOf("[sound_rec]"), utterance.indexOf("[sound_rec]") + 11]
            const newRecString = recs[recIndex]
            usedRecs.push(recs[recIndex])
            if (newRecString !== undefined) {
                utterance = utterance.substring(0, recBounds[0]) + newRecString + utterance.substring(recBounds[1])
                recIndex++
            }
            numLoops++
            if(numLoops > 10){
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
        utterance = utterance.substring(0, utterance.indexOf("[ERROREXPLAIN]")) + explainError() + utterance.substring(utterance.lastIndexOf("[ERROREXPLAIN]") + 14)
        parameters.push(["ERROREXPLAIN", explainError()])
    }
    while (utterance.includes("[SECTION]")) {
        const recBounds = [utterance.indexOf("[SECTION]"), utterance.indexOf("[SECTION]") + 11]
        //pick a location in the code.
        let newRecString : any = "one of our sections"
        const musicResults = codeSuggestion.getMusic()
        if (musicResults != {} && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
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
        if (musicResults != {} && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
            const keys = Object.keys(musicResults.SOUNDPROFILE)
            for (let i in keys) {
                currentForm += (keys[i][0])
            }
            for (let i in allForms) {
                if (allForms[i].startsWith(currentForm) && allForms[i] != currentForm) {
                    validForms.push(allForms[i])
                }
            }
            //select form at random
            const newForm = validForms[randomIntFromInterval(0, validForms.length - 1)]
            utterance = utterance.replace("[FORM]", newForm)
            if (newForm.includes("undefined")) {
                utterance = codeSuggestion.randomNucleus()
            } else {
              currentPropertyValue = newForm
            }
        } else {
            //return random form from allForms
            const newFormVal = allForms[randomIntFromInterval(0, allForms.length - 1)]
            currentPropertyValue = newFormVal
            utterance = utterance.replace("[FORM]", newFormVal)
            if (utterance.includes("undefined")) {
                utterance = codeSuggestion.randomNucleus()
            }
        }
    }
    if (utterance.includes("[FORMGOAL]")) {
        const formGoal = caiProjectModel.getModel()["form"]
        utterance = utterance.replace("[FORMGOAL]", formGoal)
    }
    if (utterance.includes("[COMPLEXITYGOAL]")) {
        const selectedComplexityGoal = caiProjectModel.getModel()['code structure'][randomIntFromInterval(0, caiProjectModel.getModel()['code structure'].length - 1)]
        utterance = utterance.replace("[COMPLEXITYGOAL]", codeGoalReplacements[selectedComplexityGoal])
    }
   if (utterance.includes("[CURRENTPROPERTY]")) {
        if (currentProperty != "code structure") {
            utterance = utterance.replace("[CURRENTPROPERTY]", currentProperty)
        } else {
            utterance = utterance.replace("[CURRENTPROPERTY]", "the code")
        }
    }
    //then set waits, etc.
    if (utterance.includes("[WAIT")) {
        //get the number and set currentWait
        currentWait = Number.parseInt(utterance.substring(utterance.indexOf("[WAIT") + 6, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[WAIT"))
    } else if (utterance.includes("[ERRORWAIT")) {
        errorWait = Number.parseInt(utterance.substring(utterance.indexOf("[ERRORWAIT") + 11, utterance.length - 1))
        utterance = utterance.substring(0, utterance.indexOf("[ERRORWAIT"))
    } else if (utterance.includes("[COMPLEXITYWAIT")) {
        //format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)
        const args = utterance.substring(utterance.indexOf("[COMPLEXITYWAIT"))
        utterance = utterance.substring(0, utterance.indexOf("[COMPLEXITYWAIT"))
        const waitArgs = args.split('|')
        complexityWait.node = parseInt(waitArgs[1])
        complexityWait.complexity = {}
        for (let i = 2; i < waitArgs.length; i++) {
            //convert to property name and integer
            const parts = waitArgs[i].split(':')
            complexityWait.complexity[parts[0]] = parseInt(parts[1])
        }
    } else if (utterance.includes("[SOUNDWAIT")) {
        //format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)
        const args = utterance.substring(utterance.indexOf("[SOUNDWAIT") + 1, utterance.length - 1)
        utterance = utterance.substring(0, utterance.indexOf("[SOUNDWAIT"))
        const soundWaitArgs : string[] = args.split('|')
        soundWait.node = parseInt(soundWaitArgs[1])
        soundWait.sounds = []
        for (let i = 2; i < soundWaitArgs.length; i++) {
            soundWait.sounds.push(soundWaitArgs[i])
        }
    } else {
        //cancel the wait
        currentWait = -1
        errorWait = -1
        soundWait.node = -1
        complexityWait.node = -1
        soundWait.sounds = []
    }
    const structure = getLinks(utterance)
    if (nodeHistory[activeProject] && utterance != "") {
        // Add current node (by node number) and paramters to node history
        if (Number.isInteger(currentTreeNode[activeProject].id)) {
            addToNodeHistory([currentTreeNode[activeProject].id, parameters])
        } else {
            addToNodeHistory([0, utterance, parameters])
        }
    }
    return structure
}

function getLinks(utterance: string) {
    let utteranceFirstHalf = utterance
    let utteranceSecondHalf = ""
    let keyword = ""
    let link = ""
    let textPieces = []
    let keywordLinks = []
    //does one iterations/ assumes one appearance
    if (utterance.includes("[LINK")) {
        while (utterance.includes("[LINK")) {
            keyword = utterance.substring(utterance.indexOf("[LINK") + 6, utterance.indexOf("]"))
            link = LINKS[keyword]
            utteranceFirstHalf = utterance.substring(0, utterance.indexOf("[LINK"))
            utteranceSecondHalf = utterance.substring(utterance.indexOf("]") + 1, utterance.length)
            utterance = utteranceSecondHalf
            textPieces.push(utteranceFirstHalf)
            keywordLinks.push([keyword, link])
        }
    } else {
        keywordLinks.push(["", ""])
    }
    textPieces.push(utterance)
    while (textPieces.length < 6) {
        textPieces.push("")
        keywordLinks.push(["", ""])
    }
    return [textPieces, keywordLinks]
}

const LINKS : { [key:string]: string } = {
    "fitMedia": "1-1-9",
    "setEffect": "1-4-0",
    "effect ramp": "1-4-0",
    "function": "1-2-2",
    "functions": "1-2-2",
    "parameters": "2-1-2",
    "variable": "1-2-4",
    "variables": "1-2-4",
    "section": "2-1-0",
    "sections": "2-1-0",
    "ABA": "2-1-1",
    "custom function": "2-1-2",
    "makeBeat": "2-3-2",
    "loop": "2-4-0",
    "for loop": "2-4-0",
    "loops": "2-4-0",
    "range": "2-4-1",
    "console input": "3-1-0",
    "if statement": "3-1-2",
    "if": "3-1-2",
    "conditional": "3-1-2",
    "conditional statement": "3-1-2",
    "list": "3-2-0",
    "randomness": "3-4-0",
    "nested loops": "4-1-3",
    "importing": "5-2-0",
    "indented": "5-2-1",
    "index": "5-2-2",
    "name": "5-2-3",
    "parse error": "5-2-4",
    "syntax error": "5-2-5",
    "type error": "5-2-6",
    "function arguments": "5-2-7",
    "filter": "5-1-6",
    "FILTER": "5-1-6",
    "FILTER_FREQ": "5-1-6",
    "volume mixing": "5-1-14"
}

function reconstituteNodeHistory() {
    let newVersion = []
    for (let i in nodeHistory[activeProject]) {
        if (nodeHistory[activeProject][i][0] != 0 || i == "0") {
            let newItem = nodeHistory[activeProject][i].slice()
            newItem[0] = caiTree[newItem[0]].utterance
            //now, we go through the parameters and replace things like sound recs, section,
            if (newItem[0].includes("sound_rec")) {
                //find recs
                let soundRecs = []
                for (let i in newItem) {
                    const val = newItem[i][0][0]
                    if (val == "sound_rec") {
                        soundRecs = newItem[i][0][1]
                        break
                    }
                }
                if (soundRecs.length > 0) {
                    let index = 0
                    while (newItem[0].includes("sound_rec")) {
                        newItem[0] = newItem[0].replace("[sound_rec]", soundRecs[index])
                        index++
                    }
                }
            }
            newVersion.push(newItem)
        }
    }
    return newVersion
}

export function errorFixSuccess() {
    currentTreeNode[activeProject] = Object.assign({}, caiTree[errorSuccess])
    return showNextDialogue()
}

export function errorFixFail() {
    currentTreeNode[activeProject] = Object.assign({}, caiTree[errorFail])
    return showNextDialogue()
}

export function activeWaits() {
    if (currentWait != -1) {
        return true
    }
    if (errorWait != -1) {
        return true
    }
    if (soundWait.node != -1) {
        return true
    }
    if (complexityWait.node != -1) {
        return true
    }
    return false
}

function startTree(treeName: string) {
    currentTreeNode[activeProject] = Object.assign({}, caiTree[CAI_TREES[treeName]])
    return showNextDialogue()
}

// Updates and CAI-generated response with current user input.
export function generateOutput(input: any) {
    const index = Number(input)
    if (Number.isInteger(index) && !Number.isNaN(index)) {
        return moveToNode(index)
    }
    function moveToNode(input: any) {
        if (input in CAI_TREES) {
            return startTree(input)
        }
        if (currentTreeNode[activeProject] != null) {
            if (currentTreeNode[activeProject].options.length === 0) {
                const utterance = currentTreeNode[activeProject].utterance
                currentTreeNode[activeProject] = null
                return utterance
            }
            if (input != null && typeof input === "number") {
                if (Number.isInteger(currentTreeNode[activeProject].options[0])) {
                    currentTreeNode[activeProject] = caiTree[input]
                } else {
                    currentTreeNode[activeProject] = currentTreeNode[activeProject].options[input]
                }
                for (let i in Object.keys(currentTreeNode[activeProject].parameters)) {
                    currentParameters[Object.keys(currentTreeNode[activeProject].parameters)[i]] = currentTreeNode[activeProject].parameters[Object.keys(currentTreeNode[activeProject].parameters)[i]]
                    if (currentParameters["section"]) {
                        currentSection = currentParameters["section"]
                    }
                }
                return showNextDialogue()
            }
        }
        else return ""
    }
    return moveToNode(input)
}

// Generates a suggestion for music or code additions/changes and outputs a representative dialogue object
function generateSuggestion() {
    if (currentError[0] != "") {
        if (isPrompted) {
            let outputObj = Object.assign({}, caiTree[CAI_TREES["error"]])
            outputObj.utterance = "let's fix our error first. " + outputObj.utterance
            return outputObj
        } else {
            return ""
        }
    }
    if (isPrompted) {
        studentInteracted = true
        caiStudentHistoryModule.trackEvent("codeRequest")
        addToNodeHistory(["request", "codeRequest"])
    }
    let outputObj = codeSuggestion.generateCodeSuggestion(nodeHistory[activeProject])
    currentSuggestion[activeProject] = Object.assign({}, outputObj)
    if (outputObj != null) {
        if (outputObj.utterance == "" && isPrompted) {
            outputObj = codeSuggestion.randomNucleus(nodeHistory[activeProject], false)
        }
        if (outputObj.utterance.includes("[STARTTREE|")) {
            //what tree are we starting?
            let treeName = outputObj.utterance.substring(outputObj.utterance.indexOf("[STARTTREE|") + 11)
            treeName = treeName.substring(0, treeName.lastIndexOf("]"))
            currentTreeNode[activeProject] = Object.assign({}, caiTree[CAI_TREES[treeName]])
            return currentTreeNode[activeProject]
        }
        if ('complexity' in outputObj && outputObj.utterance != "") {
            caiStudentPreferenceModule.addCodeSuggestion(outputObj.complexity, outputObj.utterance)
        }
        return outputObj
    } else {
        return ""
    }
}

function printObject(obj: any) {
    const keys = Object.keys(obj)
    let returnStrings = ""
    for (let i in keys) {
        if (typeof obj[keys[i]] === "object") {
            returnStrings += (keys[i] + ": \n{\n" + printObject(obj[keys[i]]) + "}\n")
        } else {
            returnStrings += (keys[i] + ": " + obj[keys[i]] + "\n")
        }
    }
    return returnStrings
}

//helper function to generate random integers
function randomIntFromInterval(min: number, max: number) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function checkForCodeUpdates(code: string) {
    console.log(activeProject)
    console.log("student code", code)
    if (code.length > 0) {
        if (activeProject in recentScripts) {
            if (recentScripts[activeProject] != code) {
                console.log("previous code state, which is different from the current one")
                userProject.saveScript(activeProject, code)
                recentScripts[activeProject] = code
                addToNodeHistory(["Code Updates"])
            }
        } else {
            console.log("new project added to history")
            recentScripts[activeProject] = code
        }
    }
}