import AUDIOKEYS_RECOMMENDATIONS from "../data/audiokeys_recommendations.json"
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import * as ccState from './complexityCalculatorState';

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
// Load lists of numbers and keys
let AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS_)


// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = [
    "analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish", "fitMedia",
    "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBealSlice", "print", "readInput",
    "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile",
    "setEffect", "setTempo", "shuffleList", "shuffleString", "and", "as", "assert", "break", "del", "elif",
    "class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
    "pass", "print", "raise", "return", "try", "while", "with", "yield",
] as readonly string[]

var lastWorkingAST: any
var lastWorkingStructure: any
var lastWorkingSoundProfile: any

var currentError: any
var currentText: any

var previousAttributes: any

var textArray: string[]
var errorLine: string

export function storeWorkingCodeInfo(ast: any, structure: any, soundProfile: any) {

    previousAttributes = {
        'ast': lastWorkingAST,
        'structure': lastWorkingStructure,
        'soundProfile': lastWorkingSoundProfile
    }


    lastWorkingAST = Object.assign({}, ast)
    lastWorkingStructure = Object.assign({}, structure)
    lastWorkingSoundProfile = Object.assign({}, soundProfile)
    currentError = null
    currentText = null
}

export function storeErrorInfo(errorMsg: any, codeText: string) {
    if ("args" in errorMsg) {
        currentError = Object.assign({}, errorMsg)
        currentText = codeText
        console.log(handleError())
    }
    else {
        console.log(errorMsg)
    }
}

export function handleError() {
    //function to delegate error handling to one of a number of smaller, targeted error response functions
    //get line of error
    textArray = currentText.split("\n")
    errorLine = textArray[currentError.traceback[0].lineno - 1]


    //check first for undefined variables
    //TODO
    //this should check the info about error type which - how the h*ck do i do that again?

    //otherwise, search for keywords
    var functionWords: string[] = ["def ", "function "]

    for (let i = 0; i < functionWords.length; i++) {
        if (errorLine.toLowerCase().includes(functionWords[i])) {
            return handleFunctionError()
        }
    }

    if (!errorLine.toLowerCase().includes("if") && !errorLine.toLowerCase().includes("elif") && !errorLine.toLowerCase().includes("else") && !errorLine.toLowerCase().includes("for") && !errorLine.toLowerCase().includes("while") && !errorLine.toLowerCase().includes("in")) {
        var colon: boolean = false
        var openParen: number = -1
        var closeParen: number = -1
        if (errorLine[errorLine.length - 1] == ":") {
            colon = true
        }
        openParen = errorLine.lastIndexOf("(")
        if (errorLine.lastIndexOf(")") > openParen) {
            closeParen = errorLine.lastIndexOf(")")
        }

        var trues: number = 0
        if (colon) {
            trues += 1
        }
        if (openParen > 0) {
            trues += 1
        }
        if (closeParen > 0) {
            trues += 1
        }

        if (trues > 1 && handleFunctionError() != null) {
            return handleFunctionError()
        }

    }
    //do the same for for loops, while loops, and conditionals

    //for loops
    var forWords: string[] = ["for ", "in "]

    for (let i = 0; i < forWords.length; i++) {
        if (errorLine.includes(forWords[i])) {
            return handleForLoopError()
        }
    }

    //while loops
    if (errorLine.includes("while")) {
        return handleWhileLoopError()
    }

    //conditionals
    var conditionalWords: string[] = ["if", "else", "elif"]

    for (let i = 0; i < conditionalWords.length; i++) {
        if (errorLine.toLowerCase().includes(conditionalWords[i])) {
            return handleConditionalError()
        }
    }

    if (errorLine.toLowerCase().includes("fitmedia")) {
       return  handleFitMediaError()
    }
}

function handleFunctionError() {
    //find next non-blank line (if there is one). assess indent
    var nextLine: string = ""
    for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine != "") {
            break;
        }
    }

    //compare indent on nextLine vs errorLine
    if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
        return ["function", "missing body"]
    }

    var trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)


    if (!trimmedErrorLine.startsWith("def ")) {
        return ["function", "missing def"]
    }

    else {
        trimmedErrorLine = trimmedErrorLine.substring(4)
    }


    //we should check that the function anme is there
    //this i guess goes hand in hand with the parentheses check
    var parenIndex: number = trimmedErrorLine.indexOf("(")

    if (parenIndex == -1) {
        return ["function", "missing parentheses"]
    }

    if (parenIndex == 0) {
        return ["function", "missing function name"]
    }

    //actually next we should do checks for close-paren and colon. for python.
    if (trimmedErrorLine[trimmedErrorLine.length - 1] != ":") {
        return ["function", "missing colon"]
    }

    if (trimmedErrorLine[trimmedErrorLine.length - 2] != ")") {
        return ["function", "missing parentheses"]
    }

    //do params
    var paramString: string = trimmedErrorLine.substring(parenIndex + 1, trimmedErrorLine.length - 2)

    if (paramString.length > 0) {
        //param handling. what the heckie do we do here. we can check for numerical or string values, plus we

        if (paramString.includes(" ") && !paramString.includes(",")) {
            return ["function", "parameters missing commas"]
        }

        //get rid of list commas
        while (paramString.includes("[")) {
            var openIndex: number = paramString.indexOf("[")
            var closeIndex: number = paramString.indexOf("]")

            paramString = paramString.replace("[", "")
            paramString = paramString.replace("]", "")

            for (let i = openIndex; i < closeIndex; i++) {
                if (paramString[i] == ",") {
                    paramString = replaceAt(paramString, i, "|")
                }
            }

        }

        var params: string[] = paramString.split(",")
        var currentVariableNames: string[] = []

        var currentVars: any[] = ccState.getProperty("allVariables")

        for (let i = 0; i < currentVars.length; i++) {
            currentVariableNames.push(currentVars[i].name)
        }

        for (let i = 0; i < params.length; i++) {
            var paramName: string = params[i]

            if (isNumeric(paramName) || (paramName == "True" || paramName == "False") || (paramName.includes("\"")) || (paramName.includes("|")) || (currentVariableNames.includes(paramName))) {
                return ["function", "value instead of parameter"]
            }

        }
    }

    return ["function", "unknown"]
}

function isNumeric(str: string) {
    return !isNaN(parseInt(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function handleForLoopError() {
    //find next non-blank line (if there is one). assess indent
    var nextLine: string = ""
    for (let i = currentError.traceback[0].lineno; i < textArray.length; i++) {
        nextLine = textArray[i]
        if (nextLine != "") {
            break;
        }
    }

    //compare indent on nextLine vs errorLine
    if (ccHelpers.numberOfLeadingSpaces(nextLine) <= ccHelpers.numberOfLeadingSpaces(errorLine)) {
        return ["for loop", "missing body"]
    }

    var trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)

    if (!trimmedErrorLine.startsWith("for")) {
        return ["for loop", "missing for"]
    }
    else {
        trimmedErrorLine = trimmedErrorLine.substring(4)
    }

    //next get iterator name
    var nextSpace: number = trimmedErrorLine.indexOf(" ")

    var iteratorName: string = trimmedErrorLine.substring(0, nextSpace)
    trimmedErrorLine = trimmedErrorLine.substring(nextSpace)

    //check for iterator name
    if (iteratorName == "" || iteratorName == " ") {
        return ["for loop", "missing iterator name"]
    }

    //next, check for in 
    if (!trimmedErrorLine.startsWith("in")) {
        return ["for loop", "missing in"]
    }

    //this is where paths may diverge a little bit
    trimmedErrorLine = trimmedErrorLine.substring(3)


    //check this here, then cut the colon off
    if (trimmedErrorLine[trimmedErrorLine.length - 1] != ":") {
        return ["for loop", "missing colon"]
    }
    trimmedErrorLine = trimmedErrorLine.substring(0, trimmedErrorLine.length - 1)

    //now we have our iterable. 
    if (trimmedErrorLine.startsWith("range")) {
        if (!trimmedErrorLine.includes("(") || !trimmedErrorLine.includes(")")) {
            return ["for loop", "range missing parentheses"]
        }
        var parenIndex = trimmedErrorLine.indexOf("(")
        var argString: string = trimmedErrorLine.substring(parenIndex + 1, trimmedErrorLine.length - 1)
        //check args

        //get rid of list commas
        while (argString.includes("[")) {
            var openIndex: number = argString.indexOf("[")
            var closeIndex: number = argString.indexOf("]")

            argString = argString.replace("[", "")
            argString = argString.replace("]", "")

            for (let i = openIndex; i < closeIndex; i++) {
                if (argString[i] == ",") {
                    argString = replaceAt(argString, i, "|")
                }
            }

        }

        var rangeArgs: string[] = argString.split(",")
        if (rangeArgs.length > 1 || rangeArgs.length > 3) {
            return ["for loop", "incorrect number of range arguments"]
        }
        //each arg should be a number
        for (let i = 0; i < rangeArgs.length; i++) {
            var singleArg: string = ccHelpers.trimCommentsAndWhitespace(rangeArgs[i])
            //is it a number
            if (!isNumeric(singleArg)) {
                return ["for loop", "non-numeric range argument"]
            }
        }
    }
    else {
        var isValid: boolean = false

        //then this ought to be a string, a list, or a variable containing one of those things, or a function returning one of those things
        if (trimmedErrorLine.includes("(") && trimmedErrorLine.endsWith(")")) {
            //then we can assume we have a function call

            //first, let's check if the function called exists
            var functionName: string = trimmedErrorLine.substring(0, trimmedErrorLine.indexOf("("))

            //handling for built-ins
            if (functionName.includes(".")) {
                functionName = functionName.substring(functionName.lastIndexOf(".") + 1)
            }

            //is it a built-in?
            if (ccState.builtInNames.includes(functionName)) {
                //look up return type. if it's not a string or list, it's not valid
                for (let i = 0; i < ccState.builtInReturns.length; i++) {
                    if (ccState.builtInReturns[i].name == functionName) {
                        if (ccState.builtInReturns[i].returns == "Str" || ccState.builtInReturns[i].returns == "Str")
                            break;
                    }
                }
                //isValid = true
            }

            let allFuncs: any = ccState.getProperty("userFunctions")

            //if it does, we should pass this to the function call error handler
        }

        //is it a list?
        else if (trimmedErrorLine.includes("[") && trimmedErrorLine.endsWith("]")) {
            //it's a list
        }

        else if (trimmedErrorLine.includes("\"") || trimmedErrorLine.includes("'")) {
            //it's a string
        }
        else {
            //we can probably assume it's a variable
            if (estimateVariableType(trimmedErrorLine, currentError.traceback[0].lineno) != "List" || estimateVariableType(trimmedErrorLine, currentError.traceback[0].lineno) != "Str") {
                return ["for loop", "invalid iterator"]
            }
        }

        if (!isValid) {
            return ["for loop", "invalid iterable"]
        }
    }
    return ["for loop", "unknown"]
}

function handleCallError() {

}

function handleWhileLoopError() {

}

function handleConditionalError() {

}

function handleNameError() {

}

function handleFitMediaError() {
    var trimmedErrorLine: string = ccHelpers.trimCommentsAndWhitespace(errorLine)

    if (trimmedErrorLine.includes("fitmedia") || trimmedErrorLine.includes("FitMedia") || trimmedErrorLine.includes("Fitmedia")) {
        return ["fitMedia", "miscapitalization"]
    }

    //parens
    //we should check that the function anme is there
    //this i guess goes hand in hand with the parentheses check
    var parenIndex: number = trimmedErrorLine.indexOf("(")

    if (parenIndex == -1) {
        return ["fitMedia", "missing parentheses"]
    }

    if (trimmedErrorLine[trimmedErrorLine.length - 1] != ")") {
        return ["fitMedia", "missing parentheses"]
    }

    //now clean and check arguments
    var argString: string = trimmedErrorLine.substring(trimmedErrorLine.indexOf("("), trimmedErrorLine.lastIndexOf(")"))


    //get rid of list commas
    while (argString.includes("[")) {
        var openIndex: number = argString.indexOf("[")
        var closeIndex: number = argString.indexOf("]")

        argString = argString.replace("[", "||")
        argString = argString.replace("]", "||")

        for (let i = openIndex; i < closeIndex; i++) {
            if (argString[i] == ",") {
                argString = replaceAt(argString, i, "|")
            }
        }

    }

    var argsSplit: string[] = argString.split(",")
    var argumentTypes: string[] = []

    let currentVars: any = ccState.getProperty("allVariables")

    if (argsSplit.length > 4) {
        return ["fitMedia", "too many arguments"]
    }
    if (argsSplit.length < 4) {
        return ["fitMedia", "too few arguments"]
    }

    for (let i = 0; i < argsSplit.length; i++) {
        argumentTypes.push("")
        if (isNumeric(argsSplit[i])) {
            argumentTypes[i] = "Num"
        }
        else if (argsSplit[i].includes("\"") || argsSplit[i].includes("'")) {
            argumentTypes[i] = "Str"
        }
        else if (argsSplit[i].includes("+")) {
            let firstBin: string = argsSplit[i].split("+")[0]
            if (firstBin.includes("\"") || firstBin.includes("'")) {
                argumentTypes[i] = "Str"
            }
            else if (isNumeric(firstBin)) {
                argumentTypes[i] = "Num"
            }
            //or is it a var or func call

            var errorLineNo: number = currentError.traceback[0].lineno;
            //func call

            if (argsSplit[i].includes("(") || argsSplit[i].includes(")")) {

                let functionName: string = argsSplit[i].substring(0, argsSplit[i].indexOf("("))
                argumentTypes[i] = estimateFunctionNameReturn(functionName);
            }
            else {
                argumentTypes[i] = estimateVariableType(argsSplit[i], errorLineNo);
            }
        }
        else if (argsSplit[i].includes("|")) {
            //it's a list
        }
        else if (argsSplit[i].includes("||")) {
            //it's a list index
        }
        else {
            //is it the name of a smaple
            if (AUDIOKEYS.includes(argsSplit[i])) {
                argumentTypes[i] = "Sample"
            }
            //or is it a var or func call
        }
    }

    //check values 
    //if(argumentTypes[0] != "Sample" && argumentTypes[0])



    //last item
    return ["fitMedia", "unknown"]
}

function estimateFunctionNameReturn(funcName: string) {

    let userFuncs: any = ccState.getProperty("userFunctions")
    for (let i = 0; i < userFuncs.length; i++) {
        if ((userFuncs[i].name == funcName || userFuncs[i].aliases.includes(funcName)) && userFuncs[i].returns) {
            return (ccHelpers.estimateDataType(userFuncs[i].returnVals[0]))
        }
    }
    return ""

}

function estimateVariableType(varName: string, lineno: number) {

    let thisVar: any = null
    let currentVars: any = ccState.getProperty("allVariables");

    for (let i = 0; i < currentVars.length; i++) {
        if (currentVars[i].name == varName) {
            thisVar = currentVars[i]
        }
    }
    let latestAssignment: any = null

    let varList: any = ccState.getProperty("allVariables");
    for (let i = 0; i < varList.length; i++) {
        if (varList[i].name == name) {
            thisVar = varList[i]
        }
    }
    if (thisVar == null) {
        return ""
    }
    //get most recent outside-of-function assignment (or inside-this-function assignment)
    let funcLines: number[] = ccState.getProperty("functionLines")
    let funcObjs: any = ccState.getProperty("userFunctions")
    let highestLine: number = 0
    if (funcLines.includes(lineno)) {
        //what function are we in
        let startLine: number = 0
        let endLine: number = 0
        for (let i = 0; i < funcObjs.length; i++) {
            if (funcObjs[i].start < lineno && funcObjs[i].end >= lineno) {
                startLine = funcObjs[i].start
                endLine = funcObjs[i].end
                break
            }
        }

        for (let i = 0; i < thisVar.assignments.length; i++) {
            if (thisVar.assignments[i].line < lineno && !ccState.getProperty("uncalledFunctionLines").includes(thisVar.assignments[i].line) && thisVar.assignments[i].line > startLine && thisVar.assignments[i].line <= endLine) {
                //then it's valid
                if (thisVar.assignments[i].line > highestLine) {
                    latestAssignment = Object.assign({}, thisVar.assignments[i])
                    highestLine = latestAssignment.line
                }
            }
        }

        //get type from assigned node
        return ccHelpers.estimateDataType(latestAssignment)
    }

}

function replaceAt(original: string, index: number, replacement: string) {
    return original.substr(0, index) + replacement + original.substr(index + replacement.length)
}
