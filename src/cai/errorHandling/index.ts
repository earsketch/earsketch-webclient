import { Language } from "common"
import store from "../../reducers"
import { selectActiveProject } from "../caiState"
import { handleJavascriptError } from "./js"
import { handlePythonError } from "./py"
import { state } from "./state"

export function storeErrorInfo(errorMsg: any, codeText: string, language: Language) {
    const activeProject = selectActiveProject(store.getState())
    state[activeProject].errorText = codeText
    if (errorMsg.args && language === "python") {
        state[activeProject].currentError = Object.assign({}, errorMsg)
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
        state[activeProject].currentError = currentError
        const jsError = handleJavascriptError()
        if (jsError) {
            return jsError
        }
    }
    return []
}
