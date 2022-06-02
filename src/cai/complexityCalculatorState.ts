// Manages the state of the complexity calculator service.

let state: { [key: string]: any } = {
    allVariables: [],
    apiCalls: [],
    allCalls: [],
    allConditionals: [],
    variableAssignments: [],
    originalityLines: [],
    loopLocations: [],
    functionLines: [],
    uncalledFunctionLines: [],
    userFunctionParameters: [],
    makeBeatRenames: [],
    userFunctionRenames: [],
    forLoopFuncs: [],
    parentLineNumber: 0,
    studentCode: [],
    takesArgs: false,
    returns: false,
    isJavascript: false,
    listFuncs: [],
    userFunctionReturns: [],
}

export function resetState() {
    state = {
        allVariables: [],
        apiCalls: [],
        allCalls: [],
        allConditionals: [],
        variableAssignments: [],
        originalityLines: [],
        loopLocations: [],
        functionLines: [],
        uncalledFunctionLines: [],
        userFunctionParameters: [],
        makeBeatRenames: [],
        userFunctionRenames: [],
        forLoopFuncs: [],
        parentLineNumber: 0,
        studentCode: [],
        takesArgs: false,
        returns: false,
        isJavascript: false,
        listFuncs: [],
        userFunctionReturns: [],
    }
}

export function getState() {
    return {}
}

export function getProperty(propertyName: string) {
    return (propertyName in state) ? state[propertyName] : []
}

export function setProperty(propertyName: string, value: any) {
    state[propertyName] = value
}

export const binOps = {
    "+": "Add",
    "-": "Sub",
    "*": "Mult",
    "/": "Div",
    "%": "Mod",
    "**": "Pow",
    "^": "Pow",
}

export const comparatorOps = {
    ">": "Gt",
    "<": "Lt",
    ">=": "GtE",
    "<=": "LtE",
    "==": "Eq",
    "!=": "NotEq",
}

export const boolOps = {
    "&&": "And",
    "||": "Or",
}

export const apiFunctions = [
    "analyze", "random", "randint", "gauss", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish",
    "fitMedia", "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "print", "readInput",
    "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile", "setEffect", "setTempo",
    "shuffleList", "shuffleString",
]

export const PY_LIST_FUNCS = ["append", "count", "extend", "index", "insert", "pop", "remove", "reverse", "sort"]
export const PY_STR_FUNCS = ["join", "split", "strip", "rstrip", "lstrip", "startswith", "upper", "lower"]
export const PY_CREATE_LIST_FUNCS = ["append", "extend", "insert", "reverse", "sort"]
export const PY_CREATE_STR_FUNCS = ["join", "strip", "rstrip", "lstrip", "upper", "lower", "shuffleString"]

export const JS_BUILT_IN_OBJECTS = ["Math", "Object", "Function", "Boolean", "Symbol", "Error", "Number", "BigInt", "Date", "String", "RegExp", "Array", "Map", "Set"] // this is not complete but if a student uses something else then I give up.
export const JS_LIST_FUNCS = ["length", "of", "concat", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex", "forEach", "includes", "indexOf", "join", "keys", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice", "toLocaleString", "toSource", "toString", "unshift", "values"]
export const JS_STR_FUNCS = ["length", "fromCharCode", "fromCodePoint", "anchor", "big", "blink", "bold", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith", "fixed", "fontcolor", "fontsize", "includes", "indexOf", "italics", "lastIndexOf", "link", "localeCompare", "match", "normalize", "padEnd", "padStart", "quote", "repeat", "replace", "search", "slice", "small", "split", "startsWith", "strike", "sub", "substr", "substring", "sup", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toSource", "toString", "toUpperCase", "trim", "trimLeft", "trimRight", "valueOf", "raw"]
export const JS_STR_LIST_OVERLAP = ["length", "concat", "includes", "indexOf", "lastIndexOf", "slice", "toSource", "toString"]
