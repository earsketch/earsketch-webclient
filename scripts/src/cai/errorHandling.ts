import AUDIOKEYS_RECOMMENDATIONS from "../data/audiokeys_recommendations.json"

// TODO: Extract list of API functions from passthrough or api_doc rather than repeating it here.
const PYTHON_AND_API = [
	"analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish", "fitMedia",
	"importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBealSlice", "print", "readInput",
	"replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile",
	"setEffect", "setTempo", "shuffleList", "shuffleString", "and", "as", "assert", "break", "del", "elif",
	"class", "continue", "def", "else", "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "not", "or",
	"pass", "print", "raise", "return", "try", "while", "with", "yield"
] as readonly string[]

var lastWorkingAST: any
var lastWorkingStructure: any
var lastWorkingSoundProfile: any

var currentError: any
var currentText: any

export function storeWorkingCodeInfo(ast:any, structure:any, soundProfile:any) {
	lastWorkingAST = Object.assign({}, ast)
	lastWorkingStructure = Object.assign({}, structure)
	lastWorkingSoundProfile = Object.assign({}, soundProfile)
	currentError = null
	currentText = null
}

export function storeErrorInfo(errorMsg: any, codeText: string) {
	currentError = Object.assign({}, errorMsg)
	currentText = codeText
	var textArray: string = currentText.split("\n")
	var errorString: string = textArray[currentError.traceback[0].lineno - 1].substring(currentError.traceback[0].colno)
	console.log(currentError)
}
