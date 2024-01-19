import * as levenshtein from "fastest-levenshtein"
import NUMBERS_AUDIOKEYS from "../../data/numbers_audiokeys"
import store from "../../reducers"
import { selectActiveProject } from "../caiState"
import { VariableAssignment, VariableObj } from "../complexityCalculator"
import { state as ccState } from "../complexityCalculator/state"
import { estimateDataType, trimCommentsAndWhitespace } from "../complexityCalculator/utils"
import { state } from "./state"

// Load lists of numbers and keys
const AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)
const nameThreshold: number = 85

export function checkForClosingParenthesis(startLine: number, stopAtClose: boolean = true) {
    const textArray = state[selectActiveProject(store.getState())].textArray

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

export function estimateFunctionNameReturn(funcName: string) {
    for (const userFunc of ccState.userFunctions) {
        if ((userFunc.name === funcName || userFunc.aliases.includes(funcName)) && userFunc.returns) {
            return (estimateDataType(userFunc.returnVals[0]))
        }
    }
    return ""
}

export function estimateVariableType(varName: string, lineno: number) {
    let thisVar: VariableObj | null = null

    for (const currentVar of ccState.allVariables) {
        if (currentVar.name === varName) {
            thisVar = currentVar
        }
    }
    let latestAssignment: VariableAssignment | null = null

    for (const variable of ccState.allVariables) {
        if (variable.name === varName) {
            thisVar = variable
        }
    }
    if (thisVar == null) {
        return ""
    }
    // get most recent outside-of-function assignment (or inside-this-function assignment)
    let highestLine: number = 0
    if (ccState.functionLines.includes(lineno)) {
        // what function are we in
        let startLine: number = 0
        let endLine: number = 0
        for (const funcObj of ccState.userFunctions) {
            if (funcObj.start < lineno && funcObj.end >= lineno) {
                startLine = funcObj.start
                endLine = funcObj.end
                break
            }
        }

        for (const assignment of thisVar.assignments) {
            if (assignment.line < lineno && !ccState.uncalledFunctionLines.includes(assignment.line) && assignment.line > startLine && assignment.line <= endLine) {
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

export function isTypo(original: string, target: string) {
    if (original === target) {
        return false
    }
    const editDistanceThreshold: number = Math.ceil(((original.length + target.length) / 2) * ((100 - nameThreshold) * 0.01))
    if (levenshtein.distance(original, target) <= editDistanceThreshold) {
        return true
    } else return false
}

function replaceAt(original: string, index: number, replacement: string) {
    return original.substr(0, index) + replacement + original.substr(index + replacement.length)
}

export function cleanupListsAndObjects(inputStr: string) {
    let trimmedStr = inputStr
    const openClose = { "[": "]", "{": "}" }
    for (const [open, close] of Object.values(openClose)) {
        while (trimmedStr.includes(open)) {
            const openIndex: number = trimmedStr.indexOf(open)
            const closeIndex: number = trimmedStr.indexOf(close)

            trimmedStr = trimmedStr.replace(open, "OPENBRACE")
            trimmedStr = trimmedStr.replace(close, "CLOSEBRACE")

            for (let i = openIndex; i < closeIndex; i++) {
                if (trimmedStr[i] === ",") {
                    trimmedStr = replaceAt(trimmedStr, i, "|")
                }
            }
        }
    }
    return trimmedStr
}

export function isNumeric(str: string) {
    return !isNaN(parseInt(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export function handleFitMediaError(errorLineNo: number) {
    const activeProject = selectActiveProject(store.getState())
    const currentError = state[activeProject].currentError
    const errorLine = state[activeProject].errorLine

    const trimmedErrorLine: string = trimCommentsAndWhitespace(errorLine)
    const lineIndex = errorLineNo
    if (trimmedErrorLine.includes("fitmedia") || trimmedErrorLine.includes("FitMedia") || trimmedErrorLine.includes("Fitmedia")) {
        return ["fitMedia", "miscapitalization"]
    }

    // parens
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
