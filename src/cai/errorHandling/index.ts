import { Language } from "common"
import store from "../../reducers"
import { setCurrentError, setErrorText } from "../caiState"
import { handleJavascriptError } from "./js"
import { handlePythonError } from "./py"

export function storeErrorInfo(errorMsg: any, codeText: string, language: Language) {
    store.dispatch(setErrorText(codeText))
    if (errorMsg.args && language === "python") {
        store.dispatch(setCurrentError(Object.assign({}, errorMsg)))
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
        const jsError = handleJavascriptError()
        if (jsError) {
            return jsError
        }
    }
    return []
}
