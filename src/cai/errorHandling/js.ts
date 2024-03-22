import store from "../../reducers"
import { selectActiveProject } from "../caiState"
import { apiFunctions, state as ccState } from "../complexityCalculator/state"
import { trimCommentsAndWhitespace } from "../complexityCalculator/utils"
import { state } from "./state"
import { checkForClosingParenthesis, cleanupListsAndObjects, estimateFunctionNameReturn, estimateVariableType, handleFitMediaError, isNumeric, isTypo } from "./utils"

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const JS_AND_API = ["and", "as", "assert", "break", "del", "else if",
    "continue", "function", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "or",
    "pass", "println", "raise", "return", "try", "while", "with", "yield", "catch",
].concat(apiFunctions) as readonly string[]

export function handleJavascriptError() {
    // function to delegate error handling to one of a number of smaller, targeted error response functions
    // get line of error
    const activeProject = selectActiveProject(store.getState())
    const currentError = state[activeProject].currentError
    const textArray = state[activeProject].errorText.split("\n")
    const errorLine = textArray[currentError.lineNumber - 1]
    state[activeProject].textArray = textArray
    state[activeProject].errorLine = errorLine

    const errorType = state[activeProject].currentError.stack.split(":")[0]
    if (errorType === "ReferenceError") {
        return handleJavascriptReferenceError(currentError)
    }

    for (const word of errorLine.split(" ")) {
        for (const builtin of JS_AND_API) {
            if (word.length > 4 && isTypo(word, builtin)) { // arbitrary length threshold to prevent stupid shenangians
                return ["name", "typo: " + builtin]
            }
        }
    }

    for (let i = 0; i < textArray.length; i++) {
        const line = textArray[i]
        if (trimCommentsAndWhitespace(errorLine.toLowerCase()).startsWith("fitmedia")) {
            const fitMediaFix = handleFitMediaError(currentError.lineNumber - 1)
            if (fitMediaFix) {
                return fitMediaFix
            }
        }
        if (line.includes("function") || line.includes("def")) {
            const functionErrorCheck = handleJavascriptFunctionError(textArray, line, i)
            if (functionErrorCheck) {
                return functionErrorCheck
            }
        }
        if (line.includes("for")) {
            if (!line.includes(" in ") && !line.includes(" of ")) {
                const forCheck = handleJavascriptForLoopError(textArray, i)
                if (forCheck) {
                    return forCheck
                }
            }
        }
        if (trimCommentsAndWhitespace(line).startsWith("if")) {
            const conditionalCheck = checkJavascriptConditional(textArray, i)
            if (conditionalCheck[0] !== "") {
                return conditionalCheck
            }
        }
    }

    // check for mismatched curly braces
    if (errorType === "SyntaxError") {
        const textString = textArray.join(" ")
        if (textString.split("{").length !== textString.split("}").length) {
            return ["syntax", "mismatched curly braces"]
        }
    }
    return ["", ""]
}

function handleJavascriptForLoopError(textArray: string [], lineno: number) {
    // we have the for keyword
    // check for parentheses
    const trimmedLine = trimCommentsAndWhitespace(textArray[lineno].substring(textArray.indexOf("for") + 4))
    if (!trimmedLine.startsWith("(")) {
        return ["for loop", "missing opening parenthesis"]
    }
    // now we check for a close paren.
    // check existing line first
    let forLoopParams = checkForClosingParenthesis(lineno)[0] as string
    if (forLoopParams === "") {
        return ["for loop", "missing closing parenthesis"]
    }
    forLoopParams = forLoopParams.substring(forLoopParams.indexOf("(") + 1)
    // check for semicolons
    const forLoopParamArray = forLoopParams.split(";")
    if (forLoopParamArray.length !== 3) {
        return ["for loop", "invalid loop declaration"]
    }
    // check loop condition to make sure it's the right type
    const loopCondition = forLoopParamArray[1]
    // needs AT LEAST ONE of the following: 1. A comparison operator (==, ===, >, <, <=, >=) 2. A boolean value (true, false) 3. A variable CONTAINING a boolean value. we'll have to estimate datatype for this.
    const validCondition = isAppropriateJSConditional(loopCondition, lineno)
    if (!validCondition) {
        return ["for loop", "invalid loop condition"]
    }
    return null
}

function handleJavascriptReferenceError(currentError: any) {
    // do we recognize the name?
    const problemName: string = trimCommentsAndWhitespace(currentError.stack.split(":")[1].split(" is not defined")[0])
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
    for (const apiCall of JS_AND_API) {
        if (isTypo(problemName, apiCall)) {
            return ["name", "typo: " + apiCall]
        }
    }
    return ["name", "unrecognized: " + problemName]
}

function handleJavascriptFunctionError(textArray: string [], thisLine: string, thisLineNumber: number) {
    let trimmedErrorLine: string = trimCommentsAndWhitespace(thisLine)
    if (!trimmedErrorLine.startsWith("function")) {
        return ["function", "missing function keyword"]
    }
    // check for a function name
    trimmedErrorLine = trimCommentsAndWhitespace(trimmedErrorLine.substring(trimmedErrorLine.indexOf("function") + 8))
    // if the first charater is not a paren or an open curly brace we're probably good to go
    if (!/^[A-Z]/i.test(trimmedErrorLine)) {
        return ["function", "invalid function name"]
    }
    // check for parentheses. there should be, at the very least, an open-paren ON THIS LINE
    if (!trimmedErrorLine.includes("(")) {
        return ["function", "missing opening parenthesis"]
    }
    // now we check for a close paren.
    // check existing line first
    const closingParenOutput = checkForClosingParenthesis(thisLineNumber)
    let functionParams = closingParenOutput[0] as string
    let positionIndices = closingParenOutput[1] as number[]
    if (functionParams === "") {
        return ["function", "missing closing parenthesis"]
    }
    functionParams = functionParams.substring(functionParams.indexOf("(") + 1)
    let hasOpenBrace = false
    // check for open and curly brace immediately following parentheses
    for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex++) {
        let startValue = 0
        if (lineIndex === positionIndices[0]) {
            startValue = positionIndices[1]
        }
        for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
            if (textArray[lineIndex][charIndex] === "{") {
                hasOpenBrace = true
                positionIndices = [lineIndex, charIndex]
                break
            } else if (!(textArray[lineIndex][charIndex] === " " || textArray[lineIndex][charIndex] === "\n" || textArray[lineIndex][charIndex] === "\t")) {
                return ["function", "missing open curly brace"]
            }
        }
        if (hasOpenBrace) {
            break
        }
    }

    let hasCloseBrace: boolean
    [hasCloseBrace, positionIndices] = detectCloseBrace(textArray, positionIndices)
    if (!hasCloseBrace) {
        return ["function", "missing closing curly brace"]
    }

    let paramString = functionParams
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
    return null
}

function checkJavascriptConditional(textArray: string [], lineIndex: number): string[] {
    // find first if in line, grab everything after that
    const trimmedConditionalString = trimCommentsAndWhitespace(textArray[lineIndex].substring(textArray[lineIndex].indexOf("if") + 2))
    // first check: parens
    if (!trimmedConditionalString.startsWith("(")) {
        return ["conditional", "missing opening parenthesis"]
    }
    // check for close parens
    // now we check for a close paren.
    // check existing line first
    const parensOutput = checkForClosingParenthesis(lineIndex)
    const condition = parensOutput[0] as string
    let positionIndices = parensOutput[1] as number[]
    if (condition === "") {
        return ["conditional", "missing closing parenthesis"]
    }
    // second check: appropriate conditional
    const isConditionValid = isAppropriateJSConditional(condition as string, lineIndex)
    if (!isConditionValid) {
        return ["conditional", "invalid condition"]
    }
    // third check: is there an "else" or "else if" following? if so, we need curly braces.
    // to do this, we need to find the end of the body. to do THAT, we need to find the beginning of the body.
    // use positionIndices for this.
    // if there's an else if, recurse through and check that.
    // check for open and curly brace immediately following parentheses
    let hasOpenBrace: boolean
    [hasOpenBrace, positionIndices] = detectOpenBrace(textArray, positionIndices)
    if (hasOpenBrace) {
        [, positionIndices] = detectCloseBrace(textArray, positionIndices)
    }
    // if the next thing after positionIndices is "else if," recurse
    const nextItem = trimCommentsAndWhitespace(textArray[positionIndices[0]].substring(positionIndices[1]))
    if (nextItem.startsWith("else if")) {
        return checkJavascriptConditional(textArray, positionIndices[0])
    }
    // if all checks pass return empty
    return ["", ""]
}

function isAppropriateJSConditional(conditional: string, lineIndex: number) {
    let checkForValidCondition = false
    const conditionals = [">", "<", "==", "===", ">=", "<=", "!=", "!==", " true ", " false "]
    if (conditionals.some((c) => conditional.includes(c))) {
        checkForValidCondition = true
    } else {
        // check through any known names. but what if it's a new variable the student has defined?
        // we should just check to see if it's the "wrong" kind of name, and pass otherwise
        if (conditional.includes("(")) {
            const loopFuncName = conditional.split("(")[0]
            const funcReturnType = estimateFunctionNameReturn(loopFuncName)
            if (funcReturnType === "Bool" || funcReturnType === "") {
                checkForValidCondition = true
            }
        } else {
            const varType = estimateVariableType(conditional, lineIndex + 1)
            if (varType === "Bool" || varType === "") {
                checkForValidCondition = true
            }
        }
    }
    return checkForValidCondition
}

function detectOpenBrace(textArray: string[], positionIndices: number[]): [boolean, number[]] {
    let openBraceDetected = false
    for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex++) {
        let startValue = 0
        if (lineIndex === positionIndices[0]) {
            startValue = positionIndices[1] + 1
        }
        for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
            if (textArray[lineIndex][charIndex] === "{") {
                openBraceDetected = true
                positionIndices = [lineIndex, charIndex]
                break
            }
        }
        if (openBraceDetected) {
            return [true, positionIndices]
        }
    }
    return [false, positionIndices]
}

function detectCloseBrace(textArray: string[], positionIndices: number[]): [boolean, number[]] {
    let closeBraceDetected = false
    let numOpenBraces = 0
    let numCloseBraces = 0

    for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex++) {
        let startValue = 0
        if (lineIndex === positionIndices[0]) {
            startValue = positionIndices[1] + 1
        }
        for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
            positionIndices[1] += 1
            if (textArray[lineIndex][charIndex] === "}") {
                numCloseBraces += 1
                if (numCloseBraces === numOpenBraces) {
                    closeBraceDetected = true
                    break
                }
            } else {
                if (textArray[lineIndex][charIndex] === "{") {
                    numOpenBraces += 1
                }
            }
        }
        if (closeBraceDetected) {
            return [true, positionIndices]
        }
    }
    return [false, positionIndices]
}
