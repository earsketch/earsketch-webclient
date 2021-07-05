"use strict";
// Manages the state of the complexity calculator service.
Object.defineProperty(exports, "__esModule", { value: true });
exports.JS_STR_LIST_OVERLAP = exports.JS_STR_FUNCS = exports.JS_LIST_FUNCS = exports.JS_BUILT_IN_OBJECTS = exports.PY_CREATE_STR_FUNCS = exports.PY_CREATE_LIST_FUNCS = exports.PY_STR_FUNCS = exports.PY_LIST_FUNCS = exports.apiFunctions = exports.boolOps = exports.comparatorOps = exports.binOps = exports.setProperty = exports.getProperty = exports.getState = exports.resetState = void 0;
var state = {
    allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [],
    loopLocations: [], uncalledFunctionLines: [], userFunctions: [],
    functionRenames: [], parentLineNumber: 0, studentCode: [],
    takesArgs: false, returns: false, isJavascript: false, listFuncs: []
};
function resetState() {
    state = {
        allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [],
        loopLocations: [], uncalledFunctionLines: [], userFunctions: [],
        functionRenames: [], parentLineNumber: 0, studentCode: [],
        takesArgs: false, returns: false, isJavascript: false, listFuncs: []
    };
}
exports.resetState = resetState;
function getState() {
    return {};
}
exports.getState = getState;
function getProperty(propertyName) {
    return (propertyName in state) ? state[propertyName] : [];
}
exports.getProperty = getProperty;
function setProperty(propertyName, value) {
    state[propertyName] = value;
}
exports.setProperty = setProperty;
exports.binOps = {
    "+": "Add",
    "-": "Sub",
    "*": "Mult",
    "/": "Div",
    "%": "Mod",
    "**": "Pow",
    "^": "Pow"
};
exports.comparatorOps = {
    ">": "Gt",
    "<": "Lt",
    ">=": "GtE",
    "<=": "LtE",
    "==": "Eq",
    "!=": "NotEq"
};
exports.boolOps = {
    "&&": "And",
    "||": "Or"
};
exports.apiFunctions = [
    "analyze", "random", "randint", "gauss", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "createAudioSlice", "dur", "finish",
    "fitMedia", "importImage", "importFile", "init", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "print", "readInput",
    "replaceListElement", "replaceString", "reverseList", "reverseString", "rhythmEffects", "selectRandomFile", "setEffect", "setTempo",
    "shuffleList", "shuffleString"
];
exports.PY_LIST_FUNCS = ['append', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort'];
exports.PY_STR_FUNCS = ['join', 'split', 'strip', 'rstrip', 'lstrip', 'startswith', 'upper', 'lower'];
exports.PY_CREATE_LIST_FUNCS = ['append', 'extend', 'insert', 'reverse', 'sort'];
exports.PY_CREATE_STR_FUNCS = ['join', 'strip', 'rstrip', 'lstrip', 'upper', 'lower', 'shuffleString'];
exports.JS_BUILT_IN_OBJECTS = ["Math", "Object", "Function", "Boolean", "Symbol", "Error", "Number", "BigInt", "Date", "String", "RegExp", "Array", "Map", "Set"]; //this is not complete but if a student uses something else then I give up.
exports.JS_LIST_FUNCS = ['length', 'of', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'toLocaleString', 'toSource', 'toString', 'unshift', 'values'];
exports.JS_STR_FUNCS = ['length', 'fromCharCode', 'fromCodePoint', 'anchor', 'big', 'blink', 'bold', 'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith', 'fixed', 'fontcolor', 'fontsize', 'includes', 'indexOf', 'italics', 'lastIndexOf', 'link', 'localeCompare', 'match', 'normalize', 'padEnd', 'padStart', 'quote', 'repeat', 'replace', 'search', 'slice', 'small', 'split', 'startsWith', 'strike', 'sub', 'substr', 'substring', 'sup', 'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toSource', 'toString', 'toUpperCase', 'trim', 'trimLeft', 'trimRight', 'valueOf', 'raw'];
exports.JS_STR_LIST_OVERLAP = ["length", "concat", "includes", "indexOf", "lastIndexOf", "slice", "toSource", "toString"];
//# sourceMappingURL=complexityCalculatorState.js.map