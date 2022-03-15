import * as ccHelpers from "./complexityCalculatorHelperFunctions"
import * as ccState from "./complexityCalculatorState"

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
// Load lists of numbers and keys
const AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS_)

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = [
    "analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish", "fitMedia",
    "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBealSlice", "print", "readInput",
    "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile",
    "setEffect", "setTempo", "shuffleList", "shuffleString", "and", "as", "assert", "break", "del", "elif",
    "class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
    "pass", "print", "raise", "return", "try", "while", "with", "yield",
] as readonly string[]

let lastWorkingAST: any
let lastWorkingStructure: any
let lastWorkingSoundProfile: any

let currentError: any
let currentText: any

let previousAttributes: any

let textArray: string[]
let errorLine: string

const nameThreshold: number = 85

export function storeWorkingCodeInfo(ast: any, structure: any, soundProfile: any) {
    previousAttributes = {
        ast: lastWorkingAST,
        structure: lastWorkingStructure,
        soundProfile: lastWorkingSoundProfile,
    }
    lastWorkingAST = Object.assign({}, ast)
    lastWorkingStructure = Object.assign({}, structure)
    lastWorkingSoundProfile = Object.assign({}, soundProfile)
    currentError = null
    currentText = null
}

export function getWorkingCodeInfo() {
    return previousAttributes
}

export function storeErrorInfo(errorMsg: any, codeText: string, language: string) {
    if ("args" in errorMsg && language === "python") {
        currentError = Object.assign({}, errorMsg)
        currentText = codeText
        console.log(handlePythonError(Object.getPrototypeOf(errorMsg).tp$name))
    } else if (language === "javascript") {
        currentError = { linenumber: errorMsg.lineNumber, message: "", stack: "" }
        if (errorMsg.message && errorMsg.stack) {
            currentError.message = errorMsg.message
            currentError.stack = errorMsg.stack
        }
        currentText = codeText
        console.log(handleJavascriptError())
    } else {
        console.log(errorMsg)
    }
}

function handleJavascriptError() {
    // function to delegate error handling to one of a number of smaller, targeted error response functions
    // get line of error
    textArray = currentText.split("\n")
    errorLine = textArray[currentError.linenumber - 1]
    const errorType = currentError.stack.split(":")[0]

    if (errorType === "ReferenceError") {
        return handleJavascriptReferenceError()
    }

    for (let i = 0; i < textArray.length; i++) {
        const line = textArray[i]
        if (line.includes("function") || line.includes("def")) {
            const functionErrorCheck = handleJavascriptFunctionError(line, i + 1)
            if (functionErrorCheck) {
                return functionErrorCheck
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

function handleJavascriptReferenceError() {
    // do we recognize the name?
    const problemName: string = currentError.stack.split(":")[1].split(" is not defined")[0]
    console.log(problemName)

    // check if it's a variable or function name that's recognizaed
    const variableList: any = ccState.getProperty("allVariables")
    const functionList: any = ccState.getProperty("userFunctionReturns")

    for (const variable of variableList) {
        if (isTypo(problemName, variable.name)) {
            return ["name", "typo: " + variable.name]
        }
    }

    for (const func of functionList) {
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

function handleJavascriptFunctionError(thisLine: string, thisLineNumber: number) {
    let trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(thisLine)

    if (!trimmedErrorLine.startsWith("function")) {
        return ["function", "missing function keyword"]
    }

    // check for a function name
    trimmedErrorLine = ccHelpers.trimCommentsAndWhitespace(trimmedErrorLine.substring(trimmedErrorLine.indexOf("function") + 8))
    // if the first charater is not a paren or an open curly brace we're probably good to go
    const validFuncStarChars = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    if (!validFuncStarChars.includes(trimmedErrorLine[0].toUpperCase())) {
        return ["function", "invalid function name"]
    }

    // check for parentheses. there should be, at the very least, an open-paren ON THIS LINE
    if (!trimmedErrorLine.includes("(")) {
        return ["function", "missing opening parenthesis"]
    }
    // now we check for a close paren.
    // check existing line first
    let functionParams = ""
    let hasCloseParen: boolean = false
    let numOpenParens = 0
    let numCloseParens = 0

    let positionIndices = [0, 0]
    for (let lineIndex = thisLineNumber - 1; lineIndex < textArray.length; lineIndex++) {
        positionIndices = [lineIndex, 0]
        for (const charValue of textArray[lineIndex]) {
            positionIndices[1] += 1
            if (charValue === ")") {
                numCloseParens += 1
                if (numCloseParens === numOpenParens) {
                    hasCloseParen = true
                    break
                } else {
                    functionParams += charValue
                }
            } else if (charValue !== "\n") {
                functionParams += charValue
                if (charValue === "(") {
                    numOpenParens += 1
                }
            }
        }
        if (hasCloseParen) {
            break
        }
    }

    if (hasCloseParen === false) {
        return ["function", "missing closing parenthesis"]
    }

    functionParams = functionParams.substring(functionParams.indexOf("(") + 1)
    console.log(functionParams)
    let hasOpenBrace = false
    // check for open and curly brace immediately following parentheses
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
            } else if (textArray[lineIndex][charIndex] !== " " || textArray[lineIndex][charIndex] !== "\n" || textArray[lineIndex][charIndex] !== "\t") {
                return ["function", "missing open curly brace"]
            }
        }
        if (hasOpenBrace) {
            break
        }
    }

    // check for closing curly brace. what's inside is the body of the function

    // check for body - maybe. we might not need this in JS.

    // check parameters to make sure they're not values

    return null
}

export function handlePythonError(errorType: string) {
    // function to delegate error handling to one of a number of smaller,  targeted error response functions
    // get line of error
    textArray = currentText.split("\n")
    errorLine = textArray[currentError.traceback[0].lineno - 1]

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
        return handlePythonFitMediaError()
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
    if (errorLine.includes("while ")) {
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
    for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }

    // compare indent on nextLine vs errorLine
    if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
        return ["function", "missing body"]
    }

    let trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)

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
        while (paramString.includes("[")) {
            const openIndex: number = paramString.indexOf("[")
            const closeIndex: number = paramString.indexOf("]")

            paramString = paramString.replace("[", "")
            paramString = paramString.replace("]", "")

            for (let i = openIndex; i < closeIndex; i++) {
                if (paramString[i] === ",") {
                    paramString = replaceAt(paramString, i, "|")
                }
            }
        }

        const params: string[] = paramString.split(",")
        const currentVariableNames: string[] = []

        const currentVars: any[] = ccState.getProperty("allVariables")

        for (const currentVar of currentVars) {
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
    for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }

    // compare indent on nextLine vs errorLine
    if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
        return ["for loop", "missing body"]
    }

    let trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)

    if (!trimmedErrorLine.startsWith("for")) {
        return ["for loop", "missing for"]
    } else {
        trimmedErrorLine = trimmedErrorLine.substring(4)
    }

    // next get iterator name
    const nextSpace: number = trimmedErrorLine.indexOf(" ")

    const iteratorName: string = trimmedErrorLine.substring(0, nextSpace)
    trimmedErrorLine = trimmedErrorLine.substring(nextSpace)

    // check for iterator name
    if (iteratorName === "" || iteratorName === " ") {
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
        while (argString.includes("[")) {
            const openIndex: number = argString.indexOf("[")
            const closeIndex: number = argString.indexOf("]")

            argString = argString.replace("[", "")
            argString = argString.replace("]", "")

            for (let i = openIndex; i < closeIndex; i++) {
                if (argString[i] === ",") {
                    argString = replaceAt(argString, i, "|")
                }
            }
        }

        const rangeArgs: string[] = argString.split(",")
        if (rangeArgs.length > 1 || rangeArgs.length > 3) {
            return ["for loop", "incorrect number of range arguments"]
        }
        // each arg should be a number
        for (const rangeArg of rangeArgs) {
            const singleArg: string = ccHelpers.trimCommentsAndWhitespace(rangeArg)
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
            if (ccState.builtInNames.includes(functionName)) {
                // look up return type. if it's not a string or list, it's not valid
                for (const builtInReturn of ccState.builtInReturns) {
                    if (builtInReturn.name === functionName) {
                        if (builtInReturn.returns === "Str" || builtInReturn.returns === "List") {
                            break
                        } else { isValid = false }
                    }
                }
            }
            // otherwise, it's probably user-defined, and we have to determine what THAT returns. please help
            const allFuncs: any = ccState.getProperty("userFunctionReturns")

            for (const item of allFuncs) {
                if (item.name === functionName) {
                    const returns = ccHelpers.estimateDataType(item.returns)
                    if (returns === "List" || returns === "Str") {
                        return handlePythonCallError()
                        // if it does, we should pass this to the function call error handlePythonr
                    } else { isValid = false }
                }
            }
        } else if (!((trimmedErrorLine.includes("[") && trimmedErrorLine.endsWith("]")) || (trimmedErrorLine.includes("\"") || trimmedErrorLine.includes("'")))) {
            // is it a list or a string that's missing something.
            if (trimmedErrorLine.includes("[") || trimmedErrorLine.includes("]")) {
                isValid = false
            }

            // it could be a string with escaped quotes...leave this for now
            // check if it's a variable.

            const allVars = ccState.getProperty("allVariables")

            for (const item of allVars) {
                if (trimmedErrorLine === item.name) {
                    const varType = estimateVariableType(item.name, currentError.traceback[0].lineno)
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
    errorLine = ccHelpers.trimCommentsAndWhitespace(errorLine.substring(0, errorLine.indexOf("(")))
    if (errorLine.includes(" ") && errorLine.split(" ").length > 0) {
        return ["function call", "extra words"]
    }

    // if no extra words make sure we have the right number of args, if we can
    // first, find the function

    // TODO: check args for API calls. Sigh.
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
        const allFuncs: any = ccState.getProperty("userFunctionReturns")

        for (const item of allFuncs) {
            if (item.name === errorLine) {
                if (item.args && item.args.length > args.length) {
                    return ["function call", "too few arguments"]
                } else if (item.args && item.args.length < args.length) {
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
    if (!ccHelpers.trimCommentsAndWhitespace(errorLine).endsWith(":")) {
        return ["while loop", "missing colon"]
    }

    // check for body
    // find next non-blank line (if there is one). assess indent
    let nextLine: string = ""
    for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine !== "") {
            break
        }
    }

    // compare indent on nextLine vs errorLine
    if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
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
        if (!ccHelpers.trimCommentsAndWhitespace(errorLine).endsWith(":")) {
            return ["conditional", "missing colon"]
        }

        // check for body
        // find next non-blank line (if there is one). assess indent
        let nextLine: string = ""
        for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
            nextLine = textArray[i]
            if (nextLine !== "") {
                break
            }
        }
        // compare indent on nextLine vs errorLine
        if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
            return ["conditional", "missing body"]
        }
    }

    // looking for a misindented else

    if (errorLine.includes("elif") || errorLine.includes("else")) {
        // we have to look upwards in the code for this. if the next unindented line about this on ISN'T an if or an elif, we have a problem.
        let nextLineUp: string = ""
        for (let i = currentError.traceback[0].lineno; i > 0; i--) {
            nextLineUp = textArray[i]
            if (nextLineUp !== "" && ccHelpers.numberOfLeadingSpaces(nextLineUp) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
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
    const variableList: any = ccState.getProperty("allVariables")
    const functionList: any = ccState.getProperty("userFunctionReturns")

    for (const variable of variableList) {
        if (isTypo(problemName, variable.name)) {
            return ["name", "typo: " + variable.name]
        }
    }

    for (const func of functionList) {
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

function handlePythonFitMediaError() {
    const trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)

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

    if (trimmedErrorLine[trimmedErrorLine.length - 1] !== ")") {
        return ["fitMedia", "missing parentheses"]
    }

    // now clean and check arguments
    let argString: string = trimmedErrorLine.substring(trimmedErrorLine.indexOf("(") + 1, trimmedErrorLine.lastIndexOf(")"))

    // get rid of list commas
    while (argString.includes("[")) {
        const openIndex: number = argString.indexOf("[")
        const closeIndex: number = argString.indexOf("]")

        argString = argString.replace("[", "")
        argString = argString.replace("]", "")

        for (let i = openIndex; i < closeIndex; i++) {
            if (argString[i] === ",") {
                argString = replaceAt(argString, i, "|")
            }
        }
    }

    const argsSplit: string[] = argString.split(",")
    const argumentTypes: (string|null)[] = []

    // const currentVars: any = ccState.getProperty("allVariables")

    if (argsSplit.length > 4) {
        return ["fitMedia", "too many arguments"]
    }
    if (argsSplit.length < 4) {
        return ["fitMedia", "too few arguments"]
    }

    const numberArgs = [-1, -1, -1]

    for (let i = 0; i < argsSplit.length; i++) {
        argumentTypes.push("")
        if (isNumeric(argsSplit[i])) {
            argumentTypes[i] = "Num"
            numberArgs[i - 1] = parseFloat(argsSplit[i])
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

            const errorLineNo: number = currentError.traceback[0].lineno
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
            }
            // or is it a var or func call that returns a sample
            const errorLineNo: number = currentError.traceback[0].lineno
            // func call

            if (argsSplit[i].includes("(") || argsSplit[i].includes(")")) {
                const functionName: string = argsSplit[i].substring(0, argsSplit[i].indexOf("("))

                argumentTypes[i] = estimateFunctionNameReturn(functionName)
            } else {
                argumentTypes[i] = estimateVariableType(argsSplit[i], errorLineNo)
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
    if (numberArgs[0] !== -1 && !Number.isInteger(numberArgs[0])) {
        return (["fitMedia", "track number not integer"])
    } else if (numberArgs[0] !== -1 && numberArgs[0] < 1) {
        return (["fitMedia", "invalid track number"])
    }
    if (numberArgs[1] !== -1 && numberArgs[1] < 1) {
        return (["fitMedia", "invalid start measure"])
    }
    if (numberArgs[2] !== -1 && numberArgs[2] < 1) {
        return (["fitMedia", "invalid end measure"])
    }
    if (numberArgs[1] !== -1 && numberArgs[2] !== -1) {
        if (numberArgs[2] <= numberArgs[1]) {
            return (["fitMedia", "backwards start/end"])
        }
    }
}

function estimateFunctionNameReturn(funcName: string) {
    const userFuncs: any = ccState.getProperty("userFunctions")
    for (const userFunc of userFuncs) {
        if ((userFunc.name === funcName || userFunc.aliases.includes(funcName)) && userFunc.returns) {
            return (ccHelpers.estimateDataType(userFunc.returnVals[0]))
        }
    }
    return ""
}

function estimateVariableType(varName: string, lineno: number) {
    let thisVar: any = null
    const currentVars: any = ccState.getProperty("allVariables")

    for (const currentVar of currentVars) {
        if (currentVar.name === varName) {
            thisVar = currentVar
        }
    }
    let latestAssignment: any = null

    const varList: any = ccState.getProperty("allVariables")
    for (const variable of varList) {
        if (variable.name === varName) {
            thisVar = variable
        }
    }
    if (thisVar == null) {
        return ""
    }
    // get most recent outside-of-function assignment (or inside-this-function assignment)
    const funcLines: number[] = ccState.getProperty("functionLines")
    const funcObjs: any = ccState.getProperty("userFunctions")
    let highestLine: number = 0
    if (funcLines.includes(lineno)) {
        // what function are we in
        let startLine: number = 0
        let endLine: number = 0
        for (const funcObj of funcObjs) {
            if (funcObj.start < lineno && funcObj.end >= lineno) {
                startLine = funcObj.start
                endLine = funcObj.end
                break
            }
        }

        for (const assignment of thisVar.assignments) {
            if (assignment.line < lineno && !ccState.getProperty("uncalledFunctionLines").includes(assignment.line) && assignment.line > startLine && assignment.line <= endLine) {
                // then it's valid
                if (assignment.line > highestLine) {
                    latestAssignment = Object.assign({}, assignment)
                    highestLine = latestAssignment.line
                }
            }
        }

        // get type from assigned node
        return ccHelpers.estimateDataType(latestAssignment)
    }

    return null
}

function isTypo(original: string, target: string) {
    const editDistanceThreshold: number = Math.ceil(((original.length + target.length) / 2) * ((100 - nameThreshold) * 0.01))
    if (ccHelpers.levenshtein(original, target) <= editDistanceThreshold) {
        return true
    } else return false
}

function replaceAt(original: string, index: number, replacement: string) {
    return original.substr(0, index) + replacement + original.substr(index + replacement.length)
}
