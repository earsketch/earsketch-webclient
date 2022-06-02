/* eslint-disable */
// TODO: Resolve lint issues.
import AUDIOKEYS_RECOMMENDATIONS from "../data/audiokeys_recommendations.json"

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = [
    "analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish", "fitMedia",
    "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBealSlice", "print", "readInput",
    "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile",
    "setEffect", "setTempo", "shuffleList", "shuffleString", "and", "as", "assert", "break", "del", "elif",
    "class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
    "pass", "print", "raise", "return", "try", "while", "with", "yield",
] as readonly string[]

const ERROR_FUNCTIONS = {
    TypeError: handleTypeError,
    NameError: handleNameError,
    IndentationError: handleIndentError,
    IndexError: handleIndexError,
    ParseError: handleParseError,
    ImportError: handleImportError,
    SyntaxError: handleSyntaxError,
    ValueError: handleValueError,
} as const

const AUDIOKEYS: string[] = Object.keys(AUDIOKEYS_RECOMMENDATIONS)

let studentCode: string[] = []
let allNames: string[] = []
let allVars = []
let userFunctions = []

export function handleError(error: any, codeObj: string) {
    console.log(error)
    const errorType = String(error).split(":")[0] as keyof typeof ERROR_FUNCTIONS
    studentCode = codeObj.split("\n")
    if (errorType in ERROR_FUNCTIONS) {
        return ERROR_FUNCTIONS[errorType](error)
    } else return null
}

const importStatements = ["from earsketch import*", "from random import*"]

function handleTypeError(error: any) {
    // return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the type error by commenting it out"]
}

function handleNameError(error: any) {
    const codeString = studentCode[error[0].traceback[0].lineno - 1]
    // const codeString = '1.2,3 4;5'
    const parts = codeString.split(/[., ;"'{}()*=\+\-\/%\[\]]/)
    const nameScores: [number, string, string][] = []

    for (const part of parts) {
        const lowestScore = -1
        const replacement = ""
        // for (const name of allNames) {
        // 	const score = levenshtein(name, part)
        // 	if (score > 0 && score <= LEVENSHTEIN_THRESHOLD && (lowestScore === -1 || score < lowestScore)) {
        // 		lowestScore = score
        // 		replacement = name
        // 	}
        // }

        if (lowestScore !== -1) {
            nameScores.push([lowestScore, part, replacement])
        }
    }

    const sortedNames = nameScores.sort()

    const offendingName = sortedNames[0][1]
    const bestReplacement = sortedNames[0][2]

    if (offendingName === "") {
        return null
    } else {
        const spliceIndex = codeString.indexOf(offendingName) + offendingName.length
        const newLine = codeString.substring(0, codeString.indexOf(offendingName)) + bestReplacement + codeString.substring(spliceIndex)
        return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, codeString.length, newLine]
    }
}

function handleIndentError(error: any) {
    let newLine = ""
    const currentLine = studentCode[error[0].traceback[0].lineno - 1]
    let prevLine = ""
    if (error[0].traceback[0].lineno - 2 >= 0) {
        prevLine = studentCode[error[0].traceback[0].lineno - 2]
    }

    let nextLine = ""
    if (error[0].traceback[0].lineno < studentCode.length) {
        nextLine = studentCode[error[0].traceback[0].lineno]
    }

    const currentTabs = numberOfLeadingSpaces(currentLine)
    const prevTabs = numberOfLeadingSpaces(prevLine)
    const nextTabs = numberOfLeadingSpaces(nextLine)

    const prevCurr = currentTabs - prevTabs
    const currNext = currentTabs - nextTabs

    let toUse = 0

    if (Math.abs(currNext) <= Math.abs(prevCurr)) {
        toUse = currNext
    } else if (Math.abs(currNext) > Math.abs(prevCurr)) {
        toUse = prevCurr
    }

    if (toUse < 0) {
        const cutoff = Math.abs(toUse)
        newLine = currentLine.substring(cutoff)
    } else {
        for (let i = 0; i < toUse; i++) {
            newLine += " "
        }
        newLine += currentLine
    }

    return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, currentLine.length, newLine]
}

function handleIndexError(error: any) {
    return null
    // return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the index error by commenting it out"]
}

function handleParseError(error: any) {
    const codeLine = studentCode[error[0].traceback[0].lineno - 1]
    const newLineValue = ""

    // for (const statement of importStatements) {
    // 	if (levenshtein(codeLine, statement) <= LEVENSHTEIN_THRESHOLD) {
    // 		newLineValue = statement
    // 		break
    // 	}
    // }

    if (newLineValue !== "") {
        return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, studentCode[error[0].traceback[0].lineno - 1].length, newLineValue]
    } else return null
}

// TODO: Reduce duplication with handleParseError.
function handleImportError(error: any) {
    const codeLine = studentCode[error[0].traceback[0].lineno - 1]
    let newLineValue = ""

    for (const statement of importStatements) {
        if (codeLine === statement) {
            newLineValue = statement
            break
        }
    }

    if (newLineValue !== "") {
        return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, studentCode[error[0].traceback[0].lineno - 1].length - 1, newLineValue]
    } else return null
}

function handleSyntaxError(error: any) {
    return null
    // return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the syntax error by commenting it out"]
}

function handleValueError(error: any) {
    // is it makeBeat??? that's the first thing to check

    // OTHERWISE, replace the offending issue with the proper value from a series of proper values
    // this is NOT a typeerror, which is probably easier to check. for now, let's focus on makeBeat only
    // hm. we may need to access the complexityCalculator. or the helper functions, actually. oh boy

    const codeLine = studentCode[error[0].traceback[0].lineno - 1]

    if (codeLine.includes("makeBeat")) {
        // if we have makebeat, we need to look at the first argument and determine hwo long it is, THEN check the argument string . but actually imma hold off on this.
        return null
    } else return null

    // return [error[0].traceback[0].lineno - 1, 0, error[0].traceback[0].lineno - 1, 0, "#there, i fixed the value error by commenting it out"]
}

function numberOfLeadingSpaces(stringToCheck: string) {
    let number = 0

    for (let i = 0; i < stringToCheck.length; i++) {
        if (stringToCheck[i] !== " ") {
            break
        } else {
            number += 1
        }
    }

    return number
}

export function updateNames(variables: any[], functions: any[]) {
    if (variables !== null && functions !== null) {
        allNames = [...PYTHON_AND_API].concat(variables.map(v => v.name), functions.map(f => f.name), AUDIOKEYS)
        // copy variable and function information
        allVars = [...variables]
        userFunctions = [...functions]
    }
}
