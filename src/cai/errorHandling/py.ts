import store from "../../reducers"
import { selectActiveProject } from "../caiState"
import { apiFunctions, builtInNames, builtInReturns, state as ccState } from "../complexityCalculator/state"
import { estimateDataType, numberOfLeadingSpaces, trimCommentsAndWhitespace } from "../complexityCalculator/utils"
import { state } from "./state"
import { checkForClosingParenthesis, cleanupListsAndObjects, estimateVariableType, handleFitMediaError, isNumeric, isTypo } from "./utils"

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = ["and", "as", "assert", "break", "del", "elif",
    "class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
    "pass", "print", "raise", "return", "try", "while", "with", "yield",
].concat(apiFunctions) as readonly string[]

export function handlePythonError(errorType: string) {
    // function to delegate error handling to one of a number of smaller,  targeted error response functions
    // get line of error
    const activeProject = selectActiveProject(store.getState())
    const currentError = state[activeProject].currentError
    const currentText = state[activeProject].errorText
    const textArray = currentText.split("\n")
    const errorLine = textArray[currentError.lineNumber - 1]
    state[activeProject].textArray = textArray
    state[activeProject].errorLine = errorLine
    // check for mismatched parentheses
    if (checkForClosingParenthesis(0, false)[0] === "") {
        return ["parentheses", "mismatch"]
    }
    // check for import, init,and finish
    if (!currentText.includes("from earsketch import *") && !currentText.includes("from earsketch import*")) {
        return ["import", "missing import"]
    }
    // check first for undefined variables
    if (errorType === "NameError") {
        return handlePythonNameError(currentError)
    }
    // otherwise, search for keywords
    // fitmedia
    if (errorLine.toLowerCase().includes("fitmedia")) {
        return handleFitMediaError(currentError.traceback[0].lineno - 1)
    }
    // function def
    const functionWords: string[] = ["def ", "function "]
    for (const functionWord of functionWords) {
        if (errorLine.toLowerCase().includes(functionWord)) {
            return handlePythonFunctionError(currentError, textArray, errorLine)
        }
    }

    let isApiCall: boolean = false
    for (const apiCall of PYTHON_AND_API) {
        if (errorLine.includes(apiCall)) {
            isApiCall = true
            break
        }
    }

    const keywords = ["if", "elif", "else", "for", "while", "in"]
    if (!isApiCall && keywords.every((keyword) => !errorLine.toLowerCase().includes(keyword))) {
        let colon: boolean = false
        let openParen: number = -1
        let closeParen: number = -1
        if (errorLine[errorLine.length - 1] === ":") {
            colon = true
        }
        openParen = errorLine.lastIndexOf("(")
        if (errorLine.lastIndexOf(")") > openParen) {
            closeParen = errorLine.lastIndexOf(")")
        }

        let trues: number = 0
        if (colon) {
            trues += 1
        }
        if (openParen > 0) {
            trues += 1
        }
        if (closeParen > 0) {
            trues += 1
        }
        if (trues > 0 && !colon) {
            return handlePythonCallError(errorLine)
        }
        if (trues > 1) {
            const functionError = handlePythonFunctionError(currentError, textArray, errorLine)
            if (functionError !== null) {
                return functionError
            }
        }
    }
    // do the same for for loops, while loops, and conditionals
    // for loops
    const forWords: string[] = ["for ", "in "]
    for (const forWord of forWords) {
        if (errorLine.includes(forWord)) {
            return handlePythonForLoopError(currentError, textArray, errorLine)
        }
    }
    // while loops
    if (errorLine.includes("while ") || errorLine.includes("while(")) {
        return handlePythonWhileLoopError(currentError, textArray, errorLine)
    }
    // conditionals
    const conditionalWords: string[] = ["if", "else", "elif"]
    for (const conditionalWord of conditionalWords) {
        if (errorLine.toLowerCase().includes(conditionalWord)) {
            return handlePythonConditionalError(currentError, textArray, errorLine)
        }
    }
    return ["", ""]
}

function findNextLine(currentError: any, textArray: string []) {
    let nextLine: string = ""
    for (let i = currentError.traceback[0].lineno - 1; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }
    return nextLine
}

function handlePythonFunctionError(currentError: any, textArray: string [], errorLine: string) {
    // find next non-blank line (if there is one). assess indent
    let nextLine: string = ""
    for (let i = currentError.traceback[0].lineno - 1; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }
    // compare indent on nextLine vs errorLine
    if (numberOfLeadingSpaces(nextLine) <= numberOfLeadingSpaces(errorLine)) {
        return ["function", "missing body"]
    }
    let trimmedErrorLine: string = trimCommentsAndWhitespace(errorLine)
    if (!trimmedErrorLine.startsWith("def ")) {
        return ["function", "missing def"]
    } else {
        trimmedErrorLine = trimmedErrorLine.substring(4)
    }
    // we should check that the function anme is there
    // this i guess goes hand in hand with the parentheses check
    const parenIndex: number = trimmedErrorLine.indexOf("(")
    if (parenIndex === -1) {
        return ["function", "missing parentheses"]
    }
    if (parenIndex === 0) {
        return ["function", "missing function name"]
    }
    // actually next we should do checks for close-paren and colon. for python.
    if (trimmedErrorLine[trimmedErrorLine.length - 1] !== ":") {
        return ["function", "missing colon"]
    }
    if (trimmedErrorLine[trimmedErrorLine.length - 2] !== ")") {
        return ["function", "missing parentheses"]
    }
    // do params
    let paramString: string = trimmedErrorLine.substring(parenIndex + 1, trimmedErrorLine.length - 2)
    if (paramString.length > 0) {
        // param handling. what the heckie do we do here. we can check for numerical or string values, plus we
        if (paramString.includes(" ") && !paramString.includes(",")) {
            return ["function", "parameters missing commas"]
        }
        // get rid of list commas
        paramString = cleanupListsAndObjects(paramString)
        const params: string[] = paramString.split(",")
        const currentVariableNames: string[] = []
        for (const currentVar of ccState.allVariables) {
            currentVariableNames.push(currentVar.name)
        }
        for (const paramName of params) {
            if (isNumeric(paramName) || (paramName === "True" || paramName === "False") || (paramName.includes("\"")) || (paramName.includes("|")) || (currentVariableNames.includes(paramName))) {
                return ["function", "value instead of parameter"]
            }
        }
    }
}

function handlePythonForLoopError(currentError: any, textArray: string [], errorLine: string) {
    // find next non-blank line (if there is one). assess indent
    const nextLine = findNextLine(currentError, textArray)
    if (numberOfLeadingSpaces(nextLine) <= numberOfLeadingSpaces(errorLine)) {
        return ["for loop", "missing body"]
    }

    let trimmedErrorLine: string = trimCommentsAndWhitespace(errorLine)

    if (!trimmedErrorLine.startsWith("for")) {
        return ["for loop", "missing for"]
    } else {
        trimmedErrorLine = trimmedErrorLine.substring(4)
    }

    // next get iterator name
    const nextSpace: number = trimmedErrorLine.indexOf(" ")

    const iteratorName: string = trimmedErrorLine.substring(0, nextSpace)
    trimmedErrorLine = trimCommentsAndWhitespace(trimmedErrorLine.substring(nextSpace))

    // check for iterator name
    if (iteratorName === "" || iteratorName === " " || iteratorName === "in") {
        return ["for loop", "missing iterator name"]
    }

    // next, check for in
    if (!trimmedErrorLine.startsWith("in")) {
        return ["for loop", "missing in"]
    }

    // this is where paths may diverge a little bit
    trimmedErrorLine = trimmedErrorLine.substring(3)

    // check this here, then cut the colon off
    if (trimmedErrorLine[trimmedErrorLine.length - 1] !== ":") {
        return ["for loop", "missing colon"]
    }
    trimmedErrorLine = trimmedErrorLine.substring(0, trimmedErrorLine.length - 1)

    // now we have our iterable.
    if (trimmedErrorLine.startsWith("range")) {
        if (!trimmedErrorLine.includes("(") || !trimmedErrorLine.includes(")")) {
            return ["for loop", "range missing parentheses"]
        }
        const parenIndex = trimmedErrorLine.indexOf("(")
        let argString: string = trimmedErrorLine.substring(parenIndex + 1, trimmedErrorLine.length - 1)
        // check args
        // get rid of list commas
        argString = cleanupListsAndObjects(argString)
        const rangeArgs: string[] = argString.split(",")
        if (rangeArgs.length < 1 || rangeArgs.length > 3) {
            return ["for loop", "incorrect number of range arguments"]
        }
        // each arg should be a number
        for (const rangeArg of rangeArgs) {
            const singleArg: string = trimCommentsAndWhitespace(rangeArg)
            // is it a number
            if (!isNumeric(singleArg)) {
                return ["for loop", "non-numeric range argument"]
            }
        }
    } else {
        let isValid: boolean = false
        // then this ought to be a string, a list, or a variable containing one of those things, or a function returning one of those things
        if (trimmedErrorLine.includes("(") && trimmedErrorLine.endsWith(")")) {
            // then we can assume we have a function call
            // first, let's check if the function called exists
            let functionName: string = trimmedErrorLine.substring(0, trimmedErrorLine.indexOf("("))
            // handling for built-ins
            if (functionName.includes(".")) {
                functionName = functionName.substring(functionName.lastIndexOf(".") + 1)
            }
            // is it a built-in?
            if (builtInNames.includes(functionName)) {
                // look up return type. if it's not a string or list, it's not valid
                for (const builtInReturn of builtInReturns) {
                    if (builtInReturn.name === functionName) {
                        if (builtInReturn.returns === "Str" || builtInReturn.returns === "List") {
                            break
                        } else {
                            isValid = false
                        }
                    }
                }
            }
            // otherwise, it's probably user-defined, and we have to determine what THAT returns. please help
            for (const item of ccState.userFunctions) {
                if (item.name === functionName) {
                    const returns = estimateDataType(item.returnVals[0])
                    if (returns === "List" || returns === "Str") {
                        return handlePythonCallError(errorLine)
                        // if it does, we should pass this to the function call error handlePythonr
                    } else {
                        isValid = false
                    }
                }
            }
        } else if (!((trimmedErrorLine.includes("[") && trimmedErrorLine.endsWith("]")) || (trimmedErrorLine.includes("\"") || trimmedErrorLine.includes("'")))) {
            // is it a list or a string that's missing something.
            if (trimmedErrorLine.includes("[") || trimmedErrorLine.includes("]")) {
                isValid = false
            }

            // it could be a string with escaped quotes...leave this for now
            // check if it's a variable.

            for (const item of ccState.allVariables) {
                if (trimmedErrorLine === item.name) {
                    const varType = estimateVariableType(item.name, currentError.traceback[0].lineno - 1)
                    if (varType !== "Str" && varType !== "List" && varType !== "") {
                        isValid = false
                    }
                }
            }
        }

        if (!isValid) {
            return ["for loop", "invalid iterable"]
        }
    }
}

function handlePythonCallError(errorLine: string) {
    // potential common call errors: wrong # of args (incl. no args),
    // wrong arg types (? may not be able to find this, or may be caught elsewhere - ignoring for now
    // missing parens
    // extra words like "new"

    // step one. do we have BOTH/matching parentheses
    if ((errorLine.includes("(") && !errorLine.includes(")")) || !(errorLine.includes("(") && errorLine.includes(")"))) {
        return ["function call", "missing parentheses"]
    }

    // otherwise, make sure the parens match up
    const openParens = (errorLine.split("(").length - 1)
    const closeParens = (errorLine.split(")").length - 1)

    if (openParens !== closeParens) {
        return ["function call", "parentheses mismatch"]
    }

    // check for extra words
    const args = errorLine.substring(errorLine.indexOf("(") + 1, errorLine.lastIndexOf(")")).split(",")
    errorLine = trimCommentsAndWhitespace(errorLine.substring(0, errorLine.indexOf("(")))
    state[selectActiveProject(store.getState())].errorLine = errorLine
    if (errorLine.includes(" ") && errorLine.split(" ").length > 0) {
        return ["function call", "extra words"]
    }

    // if no extra words make sure we have the right number of args, if we can
    // first, find the function
    let isApiCall: boolean = false
    for (const apiCall of PYTHON_AND_API) {
        if (errorLine.includes(apiCall)) {
            isApiCall = true
            break
        }
    }

    // then we check it against existing user functions.
    // if they don't have a previous successful run, we're out of luck here  ¯\_(ツ)_/¯
    if (!isApiCall) {
        for (const item of ccState.userFunctions) {
            if (item.name === errorLine) {
                if (item.args > args.length) {
                    return ["function call", "too few arguments"]
                } else if (item.args && item.args < args.length) {
                    return ["function call", "too many arguments"]
                }
                break
            }
        }
    }
}

function handlePythonWhileLoopError(currentError: any, textArray: string [], errorLine: string) {
    // 5 things to look for
    if (!errorLine.includes("while")) {
        return ["while loop", "missing while keyword"]
    }
    // now check for parens.
    if (!errorLine.includes("(") || !errorLine.includes(")")) {
        return ["while loop", "missing parentheses"]
    }
    // are there matching numbers of parens
    const openParens = (errorLine.split("(").length - 1)
    const closeParens = (errorLine.split(")").length - 1)

    if (openParens !== closeParens) {
        return ["while loop", "parentheses mismatch"]
    }

    // many things can go wrong in the condition block.
    // some of them we can check for
    // there should be EITHER a comparator or a boolean value
    // but we honestly cannt tell the contents of a variable or function return f o r s u r e; should we bother?
    // plus it might be a whole null vs not-null thing...leaving this for now

    // check for colon
    if (!trimCommentsAndWhitespace(errorLine).endsWith(":")) {
        return ["while loop", "missing colon"]
    }

    // check for body
    // find next non-blank line (if there is one). assess indent
    const nextLine = findNextLine(currentError, textArray)
    if (numberOfLeadingSpaces(nextLine) <= numberOfLeadingSpaces(errorLine)) {
        return ["while loop", "missing body"]
    }
}

function handlePythonConditionalError(currentError: any, textArray: string [], errorLine: string) {
    if (errorLine.includes("if")) { // if or elif
        if (!errorLine.includes("(") || !errorLine.includes(")")) {
            return ["conditional", "missing parentheses"]
        }
        // are there matching numbers of parens
        const openParens = (errorLine.split("(").length - 1)
        const closeParens = (errorLine.split(")").length - 1)

        if (openParens !== closeParens) {
            return ["conditional", "parentheses mismatch"]
        }

        // again, right now we'll ignore the condition. but let's amke sure there's a colon
        if (!trimCommentsAndWhitespace(errorLine).endsWith(":")) {
            return ["conditional", "missing colon"]
        }

        const nextLine = findNextLine(currentError, textArray)
        // compare indent on nextLine vs errorLine
        if (numberOfLeadingSpaces(nextLine) <= numberOfLeadingSpaces(errorLine)) {
            return ["conditional", "missing body"]
        }
    }

    // looking for a misindented else
    if (errorLine.includes("elif") || errorLine.includes("else")) {
        // we have to look upwards in the code for this. if the next unindented line about this on ISN'T an if or an elif, we have a problem.
        let nextLineUp: string = ""
        for (let i = currentError.traceback[0].lineno - 1; i > 0; i--) {
            nextLineUp = textArray[i]
            if (nextLineUp !== "" && numberOfLeadingSpaces(nextLineUp) <= numberOfLeadingSpaces(errorLine)) {
                if (!nextLineUp.includes("if")) {
                    return ["conditional", "misindented else"]
                }
            }
        }
    }
}

function handlePythonNameError(currentError: any) {
    // do we recognize the name?
    const problemName: string = currentError.args.v[0].v.split("'")[1]

    // check if it's a variable or function name that's recognizaed
    for (const variable of ccState.allVariables) {
        if (isTypo(problemName, variable.name)) {
            return ["name", "typo: " + variable.name]
        }
    }
    for (const func of ccState.userFunctions) {
        if (isTypo(problemName, func.name)) {
            return ["name", "typo: " + func.name]
        }
    }
    for (const apiCall of PYTHON_AND_API) {
        if (isTypo(problemName, apiCall)) {
            return ["name", "typo: " + apiCall]
        }
    }
    // else
    return ["name", "unrecognized: " + problemName]
}
