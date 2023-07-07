import { ModuleNode, StructuralNode, VariableObj, VariableAssignment } from "./complexityCalculator"
import { trimCommentsAndWhitespace, numberOfLeadingSpaces, estimateDataType } from "./complexityCalculatorHelperFunctions"
import { state, apiFunctions, builtInNames, builtInReturns } from "./complexityCalculatorState"
import NUMBERS_AUDIOKEYS from "../data/numbers_audiokeys"
import { SoundProfile } from "./analysis"
import esconsole from "../esconsole"
import { Language } from "common"

const levenshtein = require("fast-levenshtein")

// Load lists of numbers and keys
const AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = ["and", "as", "assert", "break", "del", "elif",
    "class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
    "pass", "print", "raise", "return", "try", "while", "with", "yield",
].concat(apiFunctions) as readonly string[]

const JS_AND_API = ["and", "as", "assert", "break", "del", "else if",
    "continue", "function", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "or",
    "pass", "println", "raise", "return", "try", "while", "with", "yield", "catch",
].concat(apiFunctions) as readonly string[]

let lastWorkingAST: ModuleNode
let lastWorkingStructure: StructuralNode
let lastWorkingSoundProfile: SoundProfile

let currentError: any
let currentText: string = ""

let previousAttributes: {
    ast: ModuleNode,
    structure: StructuralNode,
    soundProfile: SoundProfile,
}

let textArray: string[]
let errorLine: string

const nameThreshold: number = 85

export function storeWorkingCodeInfo(ast: ModuleNode, structure: StructuralNode, soundProfile: SoundProfile) {
    previousAttributes = {
        ast: lastWorkingAST,
        structure: lastWorkingStructure,
        soundProfile: lastWorkingSoundProfile,
    }
    lastWorkingAST = Object.assign({}, ast)
    lastWorkingStructure = Object.assign({}, structure)
    lastWorkingSoundProfile = Object.assign({}, soundProfile)
    currentError = null
    currentText = ""
}

export function getWorkingCodeInfo() {
    return previousAttributes
}

export function storeErrorInfo(errorMsg: any, codeText: string, language: Language) {
    if (errorMsg.args && language === "python") {
        currentError = Object.assign({}, errorMsg)
        currentText = codeText
        const pythonError = handlePythonError(Object.getPrototypeOf(errorMsg).tp$name)
        if (pythonError) {
            return pythonError
        }
    } else if (language === "javascript") {
        currentError = { lineNumber: errorMsg.lineNumber, message: "", stack: "" }
        if (errorMsg.message && errorMsg.stack) {
            currentError.message = errorMsg.message
            currentError.stack = errorMsg.stack
        }
        currentText = codeText
        const jsError = handleJavascriptError()
        if (jsError) {
            return jsError
        }
    }

    return []
}

function handleJavascriptError() {
    // function to delegate error handling to one of a number of smaller, targeted error response functions
    // get line of error
    textArray = currentText.split("\n")
    errorLine = textArray[currentError.lineNumber - 1]
    const errorType = currentError.stack.split(":")[0]

    if (errorType === "ReferenceError") {
        return handleJavascriptReferenceError()
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
            const fitMediaFix = handlePythonFitMediaError(currentError.lineNumber - 1)
            if (fitMediaFix) {
                return fitMediaFix
            }
        }

        if (line.includes("function") || line.includes("def")) {
            const functionErrorCheck = handleJavascriptFunctionError(line, i)
            if (functionErrorCheck) {
                return functionErrorCheck
            }
        }
        if (line.includes("for")) {
            if (!line.includes(" in ") && !line.includes(" of ")) {
                const forCheck = handleJavascriptForLoopError(i)
                if (forCheck) {
                    return forCheck
                }
            }
        }
        if (trimCommentsAndWhitespace(line).startsWith("if")) {
            const conditionalCheck = checkJavascriptConditional(i)
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

function handleJavascriptForLoopError(lineno: number) {
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

function handleJavascriptReferenceError() {
    // do we recognize the name?
    const problemName: string = trimCommentsAndWhitespace(currentError.stack.split(":")[1].split(" is not defined")[0])

    // check if it's a variable or function name that's recognizaed
    for (const variable of state.allVariables) {
        if (isTypo(problemName, variable.name)) {
            return ["name", "typo: " + variable.name]
        }
    }

    for (const func of state.userFunctionReturns) {
        if (isTypo(problemName, func.name)) {
            return ["name", "typo: " + func.name]
        }
    }

    for (const apiCall of JS_AND_API) {
        if (isTypo(problemName, apiCall)) {
            return ["name", "typo: " + apiCall]
        }
    }

    // else
    return ["name", "unrecognized: " + problemName]
}

function handleJavascriptFunctionError(thisLine: string, thisLineNumber: number) {
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
    esconsole(functionParams)
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

    let hasCloseBrace = false
    let numOpenBraces = 0
    let numCloseBraces = 0

    for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex++) {
        let startValue = 0
        if (lineIndex === positionIndices[0]) {
            startValue = positionIndices[1]
        }
        for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
            positionIndices[1] += 1
            if (textArray[lineIndex][charIndex] === "}") {
                numCloseBraces += 1
                if (numCloseBraces === numOpenBraces) {
                    hasCloseBrace = true
                    break
                }
            } else {
                if (textArray[lineIndex][charIndex] === "{") {
                    numOpenBraces += 1
                }
            }
        }
        if (hasCloseBrace) {
            break
        }
    }
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

        for (const currentVar of state.allVariables) {
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

export function handlePythonError(errorType: string) {
    // function to delegate error handling to one of a number of smaller,  targeted error response functions
    // get line of error
    textArray = currentText.split("\n")
    errorLine = textArray[currentError.traceback[0].lineno - 1]

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
        return handlePythonNameError()
    }
    // otherwise, search for keywords

    // fitmedia
    if (errorLine.toLowerCase().includes("fitmedia")) {
        return handlePythonFitMediaError(currentError.traceback[0].lineno - 1)
    }

    // function def
    const functionWords: string[] = ["def ", "function "]

    for (const functionWord of functionWords) {
        if (errorLine.toLowerCase().includes(functionWord)) {
            return handlePythonFunctionError()
        }
    }

    let isApiCall: boolean = false

    for (const apiCall of PYTHON_AND_API) {
        if (errorLine.includes(apiCall)) {
            isApiCall = true
            break
        }
    }

    if (!isApiCall && !errorLine.toLowerCase().includes("if") && !errorLine.toLowerCase().includes("elif") && !errorLine.toLowerCase().includes("else") && !errorLine.toLowerCase().includes("for") && !errorLine.toLowerCase().includes("while") && !errorLine.toLowerCase().includes("in")) {
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
            return handlePythonCallError()
        }

        if (trues > 1 && handlePythonFunctionError() != null) {
            return handlePythonFunctionError()
        }
    }
    // do the same for for loops, while loops, and conditionals

    // for loops
    const forWords: string[] = ["for ", "in "]

    for (const forWord of forWords) {
        if (errorLine.includes(forWord)) {
            return handlePythonForLoopError()
        }
    }

    // while loops
    if (errorLine.includes("while ") || errorLine.includes("while(")) {
        return handlePythonWhileLoopError()
    }

    // conditionals
    const conditionalWords: string[] = ["if", "else", "elif"]

    for (const conditionalWord of conditionalWords) {
        if (errorLine.toLowerCase().includes(conditionalWord)) {
            return handlePythonConditionalError()
        }
    }

    return ["", ""]
}

function handlePythonFunctionError() {
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

        for (const currentVar of state.allVariables) {
            currentVariableNames.push(currentVar.name)
        }

        for (const paramName of params) {
            if (isNumeric(paramName) || (paramName === "True" || paramName === "False") || (paramName.includes("\"")) || (paramName.includes("|")) || (currentVariableNames.includes(paramName))) {
                return ["function", "value instead of parameter"]
            }
        }
    }
}

function isNumeric(str: string) {
    return !isNaN(parseInt(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function handlePythonForLoopError() {
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
            for (const item of state.userFunctionReturns) {
                if (item.name === functionName) {
                    const returns = estimateDataType(item.returnVals[0])
                    if (returns === "List" || returns === "Str") {
                        return handlePythonCallError()
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

            for (const item of state.allVariables) {
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

function handlePythonCallError() {
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
    if (errorLine.includes(" ") && errorLine.split(" ").length > 0) {
        return ["function call", "extra words"]
    }

    // if no extra words make sure we have the right number of args, if we can
    // first, find the function

    // TODO: check args for API calls.
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
        for (const item of state.userFunctionReturns) {
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

function handlePythonWhileLoopError() {
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
    let nextLine: string = ""
    for (let i = currentError.traceback[0].lineno - 1; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }

    // compare indent on nextLine vs errorLine
    if (numberOfLeadingSpaces(nextLine) <= numberOfLeadingSpaces(errorLine)) {
        return ["while loop", "missing body"]
    }
}

function handlePythonConditionalError() {
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

        // check for body
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

function handlePythonNameError() {
    // do we recognize the name?
    const problemName: string = currentError.args.v[0].v.split("'")[1]

    // check if it's a variable or function name that's recognizaed

    for (const variable of state.allVariables) {
        if (isTypo(problemName, variable.name)) {
            return ["name", "typo: " + variable.name]
        }
    }

    for (const func of state.userFunctionReturns) {
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

function handlePythonFitMediaError(errorLineNo: number) {
    const trimmedErrorLine: string = trimCommentsAndWhitespace(errorLine)
    const lineIndex = errorLineNo
    if (trimmedErrorLine.includes("fitmedia") || trimmedErrorLine.includes("FitMedia") || trimmedErrorLine.includes("Fitmedia")) {
        return ["fitMedia", "miscapitalization"]
    }

    // parens
    // we should check that the function anme is there
    // this i guess goes hand in hand with the parentheses check
    const parenIndex: number = trimmedErrorLine.indexOf("(")

    if (parenIndex === -1) {
        return ["fitMedia", "missing parentheses"]
    }

    const parenOutput = checkForClosingParenthesis(lineIndex)
    if (parenOutput[0] === "") {
        return ["fitMedia", "missing parentheses"]
    }

    // now clean and check arguments
    let argString: string = parenOutput[0] as string
    argString = argString.substring(argString.indexOf("(") + 1)

    // get rid of list commas
    argString = cleanupListsAndObjects(argString)
    const argsSplit: string[] = argString.split(",")
    const argumentTypes: (string|null)[] = []

    if (argsSplit.length > 4) {
        return ["fitMedia", "too many arguments"]
    }
    if (argsSplit.length < 4) {
        return ["fitMedia", "too few arguments"]
    }

    const numberArgs = [-1, -1, -1]

    // trim leading/trailing spaces
    for (let i = 0; i < argsSplit.length; i++) {
        argsSplit[i] = trimCommentsAndWhitespace(argsSplit[i])
    }

    for (let i = 0; i < argsSplit.length; i++) {
        argumentTypes.push("")
        const paddedArg = (" " + argsSplit[i] + " ").toLowerCase()
        if (isNumeric(argsSplit[i])) {
            argumentTypes[i] = "Num"
            numberArgs[i - 1] = parseFloat(argsSplit[i])
        } else if (argsSplit[i].startsWith("OPENBRACE")) {
            argumentTypes[i] = "ObjOrArray"
        } else if (paddedArg.includes(" true ") || paddedArg.includes(" false ") || paddedArg.includes(">") || paddedArg.includes("<") || paddedArg.includes("=") || paddedArg.includes(" and ") || paddedArg.includes(" or ") || paddedArg.includes("&&") || paddedArg.includes("||")) {
            argumentTypes[i] = "bool"
        } else if (argsSplit[i].includes("\"") || argsSplit[i].includes("'")) {
            argumentTypes[i] = "Str"
        } else if (argsSplit[i].includes("+")) {
            const firstBin: string = argsSplit[i].split("+")[0]
            if (firstBin.includes("\"") || firstBin.includes("'")) {
                argumentTypes[i] = "Str"
            } else if (isNumeric(firstBin)) {
                argumentTypes[i] = "Num"
            }
            // or is it a var or func call

            const errorLineNo: number = currentError.traceback[0].lineno - 1
            // func call

            if (argsSplit[i].includes("(") || argsSplit[i].includes(")")) {
                const functionName: string = argsSplit[i].substring(0, argsSplit[i].indexOf("("))
                argumentTypes[i] = estimateFunctionNameReturn(functionName)
            }
            argumentTypes[i] = estimateVariableType(argsSplit[i], errorLineNo)
        } else {
            // is it the name of a smaple
            if (AUDIOKEYS.includes(argsSplit[i])) {
                argumentTypes[i] = "Sample"
            } else {
                // or is it a var or func call that returns a sample
                // func call

                if (argsSplit[i].includes("(") || argsSplit[i].includes(")")) {
                    const functionName: string = argsSplit[i].substring(0, argsSplit[i].indexOf("("))

                    argumentTypes[i] = estimateFunctionNameReturn(functionName)
                } else {
                    argumentTypes[i] = estimateVariableType(argsSplit[i], errorLineNo)
                }
            }
        }
    }

    // check value types
    if (argumentTypes[0] !== "Sample" && argumentTypes[0] !== "") {
        return (["fitMedia", "arg 1 wrong type"])
    }
    if (argumentTypes[1] !== "Num" && argumentTypes[1] !== "") {
        return (["fitMedia", "arg 2 wrong type"])
    }
    if (argumentTypes[2] !== "Num" && argumentTypes[2] !== "") {
        return (["fitMedia", "arg 3 wrong type"])
    }
    if (argumentTypes[3] !== "Num" && argumentTypes[3] !== "") {
        return (["fitMedia", "arg 4 wrong type"])
    }

    // then, check number values if possilbe
    if (!isNaN(numberArgs[0]) && !Number.isInteger(numberArgs[0])) {
        return (["fitMedia", "track number not integer"])
    } else if (numberArgs[0] !== -1 && numberArgs[0] < 1) {
        return (["fitMedia", "invalid track number"])
    }
    if (!isNaN(numberArgs[1]) && numberArgs[1] < 1) {
        return (["fitMedia", "invalid start measure"])
    }
    if (!isNaN(numberArgs[2]) && numberArgs[2] < 1) {
        return (["fitMedia", "invalid end measure"])
    }
    if (!isNaN(numberArgs[1]) && !isNaN(numberArgs[2])) {
        if (numberArgs[2] <= numberArgs[1]) {
            return (["fitMedia", "backwards start/end"])
        }
    }
}

function checkJavascriptConditional(lineIndex: number): string[] {
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
    let hasOpenBrace = false
    for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex) {
        let startValue = 0
        if (lineIndex === positionIndices[0]) {
            startValue = positionIndices[1] + 1
        }
        for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
            if (textArray[lineIndex][charIndex] === "{") {
                hasOpenBrace = true
                positionIndices = [lineIndex, charIndex]
                break
            }
        }
        if (hasOpenBrace) {
            break
        }
    }
    if (hasOpenBrace) {
        let hasCloseBrace = false
        let numOpenBraces = 0
        let numCloseBraces = 0

        for (let lineIndex = positionIndices[0]; lineIndex < textArray.length; lineIndex) {
            let startValue = 0
            if (lineIndex === positionIndices[0]) {
                startValue = positionIndices[1] + 1
            }
            for (let charIndex = startValue; charIndex < textArray[lineIndex].length; charIndex++) {
                positionIndices[1] += 1
                if (textArray[lineIndex][charIndex] === "}") {
                    numCloseBraces += 1
                    if (numCloseBraces === numOpenBraces) {
                        hasCloseBrace = true
                        break
                    }
                } else {
                    if (textArray[lineIndex][charIndex] === "{") {
                        numOpenBraces += 1
                    }
                }
            }
            if (hasCloseBrace) {
                break
            }
        }
    }
    // if the next thing after positionIndices is "else if," recurse
    const nextItem = trimCommentsAndWhitespace(textArray[positionIndices[0]].substring(positionIndices[1]))
    if (nextItem.startsWith("else if")) {
        return checkJavascriptConditional(positionIndices[0])
    }
    // if all checks pass return empty
    return ["", ""]
}

function checkForClosingParenthesis(startLine: number, stopAtClose: boolean = true) {
    let body = ""
    let hasCloseParen: boolean = false
    let numOpenParens = 0
    let numCloseParens = 0
    let isInString = false

    let positionIndices = [0, 0]
    for (let lineInd = startLine; lineInd < textArray.length; lineInd++) {
        positionIndices = [lineInd, 0]
        for (const charValue of textArray[lineInd]) {
            positionIndices[1] += 1
            if (charValue === "\"" || charValue === "'") {
                isInString = !isInString
            }
            if (charValue === ")" && !isInString) {
                numCloseParens += 1
                if (numCloseParens === numOpenParens && stopAtClose) {
                    hasCloseParen = true
                    break
                } else {
                    body += charValue
                }
            } else if (charValue !== "\n") {
                body += charValue
                if (charValue === "(" && !isInString) {
                    numOpenParens += 1
                }
            }
        }
        if (hasCloseParen) {
            break
        }
    }

    if (hasCloseParen || numCloseParens === numOpenParens) {
        return [body, positionIndices]
    } else {
        return ["", [0, 0]]
    }
}

function isAppropriateJSConditional(conditional: string, lineIndex: number) {
    let checkForValidCondition = false
    if (conditional.includes(">") || conditional.includes("<") || conditional.includes("===") || conditional.includes("==") || conditional.includes(">=") || conditional.includes("<=") || conditional.includes("!=") || conditional.includes("!==")) {
        checkForValidCondition = true
    } else if (conditional.includes(" true ") || conditional.includes(" false ")) {
        checkForValidCondition = true
    } else {
        // check through any known names. but what if it's a new variable the student has defined?
        // we should jsut check to see if it's the "wrong" kind of name, and pass otherwise
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

function estimateFunctionNameReturn(funcName: string) {
    for (const userFunc of state.userFunctionReturns) {
        if ((userFunc.name === funcName || userFunc.aliases.includes(funcName)) && userFunc.returns) {
            return (estimateDataType(userFunc.returnVals[0]))
        }
    }
    return ""
}

function estimateVariableType(varName: string, lineno: number) {
    let thisVar: VariableObj | null = null

    for (const currentVar of state.allVariables) {
        if (currentVar.name === varName) {
            thisVar = currentVar
        }
    }
    let latestAssignment: VariableAssignment | null = null

    for (const variable of state.allVariables) {
        if (variable.name === varName) {
            thisVar = variable
        }
    }
    if (thisVar == null) {
        return ""
    }
    // get most recent outside-of-function assignment (or inside-this-function assignment)
    let highestLine: number = 0
    if (state.functionLines.includes(lineno)) {
        // what function are we in
        let startLine: number = 0
        let endLine: number = 0
        for (const funcObj of state.userFunctionReturns) {
            if (funcObj.start < lineno && funcObj.end >= lineno) {
                startLine = funcObj.start
                endLine = funcObj.end
                break
            }
        }

        for (const assignment of thisVar.assignments) {
            if (assignment.line < lineno && !state.uncalledFunctionLines.includes(assignment.line) && assignment.line > startLine && assignment.line <= endLine) {
                // then it's valid
                if (assignment.line > highestLine) {
                    latestAssignment = Object.assign({}, assignment)
                    highestLine = latestAssignment.line
                }
            }
        }

        // get type from assigned node
        if (latestAssignment && latestAssignment.value) {
            return estimateDataType(latestAssignment.value)
        }
    }

    return null
}

function isTypo(original: string, target: string) {
    if (original === target) {
        return false
    }
    const editDistanceThreshold: number = Math.ceil(((original.length + target.length) / 2) * ((100 - nameThreshold) * 0.01))
    if (levenshtein.get(original, target) <= editDistanceThreshold) {
        return true
    } else return false
}

function replaceAt(original: string, index: number, replacement: string) {
    return original.substr(0, index) + replacement + original.substr(index + replacement.length)
}

function cleanupListsAndObjects(inputStr: string) {
    let trimmedStr = inputStr
    while (trimmedStr.includes("[")) {
        const openIndex: number = trimmedStr.indexOf("[")
        const closeIndex: number = trimmedStr.indexOf("]")

        trimmedStr = trimmedStr.replace("[", "OPENBRACE")
        trimmedStr = trimmedStr.replace("]", "CLOSEBRACE")

        for (let i = openIndex; i < closeIndex; i++) {
            if (trimmedStr[i] === ",") {
                trimmedStr = replaceAt(trimmedStr, i, "|")
            }
        }
    }
    while (trimmedStr.includes("{")) {
        const openIndex: number = trimmedStr.indexOf("{")
        const closeIndex: number = trimmedStr.indexOf("}")

        trimmedStr = trimmedStr.replace("{", "OPENBRACE")
        trimmedStr = trimmedStr.replace("}", "CLOSEBRACE")

        for (let i = openIndex; i < closeIndex; i++) {
            if (trimmedStr[i] === ",") {
                trimmedStr = replaceAt(trimmedStr, i, "|")
            }
        }
    }
    return trimmedStr
}
