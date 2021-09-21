import AUDIOKEYS_RECOMMENDATIONS from "../data/audiokeys_recommendations.json"
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import * as ccState from './complexityCalculatorState';

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
	currentError = Object.assign({}, errorMsg)
	currentText = codeText
	console.log(handleError())
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
		if (errorLine.includes(functionWords[i])) {
			return handleFunctionError()
        }
    }

	if (!errorLine.includes("if") && !errorLine.includes("elif") && !errorLine.includes("else") && !errorLine.includes("for") && !errorLine.includes("while") && !errorLine.includes("in")) {
		var colon:boolean = false
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
	var forWords: string[] = ["for", "in"]

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
		if (errorLine.includes(conditionalWords[i])) {
			return handleConditionalError()
		}
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
		return["function", "missing function name"]
    }

	//actually next we should do checks for close-paren and colon. for python.
	if (trimmedErrorLine[trimmedErrorLine.length - 1] != ":") {
		return ["function", "missing colon"]
	}

	if (trimmedErrorLine[trimmedErrorLine.length - 2] != ")") {
		return ["function", "missing parentheses"]
	}

		//do params //TODO erin this is where you left off
	var paramString: string = trimmedErrorLine.substring(parenIndex + 1, trimmedErrorLine.length - 2)

	if (paramString.length > 0) {
		//param handling. what the heckie do we do here. we can check for numerical or string values, plus we

		if (paramString.includes(" ") && !paramString.includes(",")) {
			return ["function", "parameters missing commas"]
        }

		//get rid of list commas
		while (paramString.includes("[")){
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
}

function isNumeric(str:string) {
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
		return["for loop", "missing iterator name"]
	}

	//next, check for in 
}

function handleWhileLoopError() {

}

function handleConditionalError() {

}

function handleNameError() {

}

function replaceAt(original: string, index: number, replacement:string) {
	return original.substr(0, index) + replacement + original.substr(index + replacement.length)
}
