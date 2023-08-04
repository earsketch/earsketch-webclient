import store from "../../reducers"
import { ModuleNode, StructuralNode } from "../complexityCalculator"
import { handlePythonError } from "./py"
import { handleJavascriptError } from "./js"
import { SoundProfile } from "../analysis"
import { Language } from "common"
import { setCurrentError, setErrorText } from "../caiState"

let lastWorkingAST: ModuleNode
let lastWorkingStructure: StructuralNode
let lastWorkingSoundProfile: SoundProfile

let previousAttributes: {
    ast: ModuleNode,
    structure: StructuralNode,
    soundProfile: SoundProfile,
}

export function storeWorkingCodeInfo(ast: ModuleNode, structure: StructuralNode, soundProfile: SoundProfile) {
    previousAttributes = {
        ast: lastWorkingAST,
        structure: lastWorkingStructure,
        soundProfile: lastWorkingSoundProfile,
    }
    lastWorkingAST = Object.assign({}, ast)
    lastWorkingStructure = Object.assign({}, structure)
    lastWorkingSoundProfile = Object.assign({}, soundProfile)
    store.dispatch(setCurrentError(null))
    store.dispatch(setErrorText(""))
}

export function getWorkingCodeInfo() {
    return previousAttributes
}

export function storeErrorInfo(errorMsg: any, codeText: string, language: Language) {
    if (errorMsg.args && language === "python") {
        store.dispatch(setCurrentError(Object.assign({}, errorMsg)))
        store.dispatch(setErrorText(codeText))
        const pythonError = handlePythonError(Object.getPrototypeOf(errorMsg).tp$name)
        if (pythonError) {
            return pythonError
        }
    } else if (language === "javascript") {
        const currentError = { lineNumber: errorMsg.lineNumber, message: "", stack: "" }
        if (errorMsg.message && errorMsg.stack) {
            currentError.message = errorMsg.message
            currentError.stack = errorMsg.stack
        }
        store.dispatch(setCurrentError(currentError))
        store.dispatch(setErrorText(codeText))
        const jsError = handleJavascriptError()
        if (jsError) {
            return jsError
        }
    }

    return []
}
