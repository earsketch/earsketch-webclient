"use strict";
// Manages the state of the complexity calculator service.
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInNames = exports.builtInReturns = exports.JS_STR_LIST_OVERLAP = exports.JS_STR_FUNCS = exports.JS_LIST_FUNCS = exports.JS_BUILT_IN_OBJECTS = exports.PY_CREATE_STR_FUNCS = exports.PY_CREATE_LIST_FUNCS = exports.PY_STR_FUNCS = exports.PY_LIST_FUNCS = exports.apiFunctions = exports.boolOps = exports.comparatorOps = exports.binOps = exports.setIsJavascript = exports.setProperty = exports.getProperty = exports.getState = exports.resetState = void 0;
var state = {
    allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [],
    loopLocations: [], uncalledFunctionLines: [], userFunctions: [],
    functionRenames: [], parentLineNumber: 0, studentCode: [],
    takesArgs: false, returns: false, isJavascript: false, listFuncs: [], strFuncs: [], functionLines: []
};
function resetState() {
    state = {
        allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [],
        loopLocations: [], uncalledFunctionLines: [], userFunctions: [],
        functionRenames: [], parentLineNumber: 0, studentCode: [],
        takesArgs: false, returns: false, isJavascript: false, listFuncs: [], strFuncs: [], functionLines: []
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
function setIsJavascript(value) {
    state.isJavascript = value;
    if (value) {
        state.listFuncs = exports.JS_LIST_FUNCS.slice(0);
        state.strFuncs = exports.JS_STR_FUNCS.slice(0);
    }
    else {
        state.listFuncs = exports.PY_LIST_FUNCS.slice(0);
        state.strFuncs = exports.PY_STR_FUNCS.slice(0);
    }
}
exports.setIsJavascript = setIsJavascript;
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
exports.builtInReturns = [{ name: "analyze", returns: "Float" }, { name: "len", returns: "Int" }, { name: "gauss", returns: "Float" }, { name: "analyzeForTime", returns: "Float" }, { name: "random", returns: "Float" }, { name: "floor", returns: "Int" }, { name: "randint", returns: "Int" }, { name: "analyzeTrack", returns: "Float" }, { name: "analyzeTrackForTime", returns: "Float" }, { name: "dur", returns: "Float" }, { name: "importImage", returns: "List" }, { name: "importFile", returns: "Str" }, { name: "readInput", returns: "Str" }, { name: "replaceString", returns: "Str" }, { name: "reverseList", returns: "List" }, { name: "reverseString", returns: "Str" }, { name: "shuffleList", returns: "List" }, { name: "shuffleString", returns: "Str" }, { name: "int", returns: "Int" }, { name: "float", returns: "Float" }, { name: "str", returns: "Str" }, { name: "count", returns: "int" }, { name: "index", returns: "int" }, { name: "split", returns: "List" }, { name: "startswith", returns: "Bool" },
    { name: "count", returns: "int" }, { name: "index", returns: "int" }, { name: "split", returns: "List" }, { name: "startswith", returns: "Bool" }, { name: "length", returns: "Int" }, { name: "str", returns: "String" },
    { name: "of", returns: "List" }, { name: "copyWithin", returns: "List" }, { name: "entries", returns: "List" },
    { name: "every", returns: "Bool" }, { name: "fill", returns: "List" }, { name: "filter", returns: "List" }, { name: "findIndex", returns: "Int" }, { name: "includes", returns: "Bool" },
    { name: "indexOf", returns: "Int" }, { name: "join", returns: "Str" }, { name: "keys", returns: "List" }, { name: "lastIndexOf", returns: "Int" }, { name: "map", returns: "List" },
    { name: "reverse", returns: "List" }, { name: "some", returns: "Bool" }, { name: "sort", returns: "List" }, { name: "splice", returns: "List" },
    { name: "toLocaleString", returns: "Str" }, { name: "toSource", returns: "Str" }, { name: "toString", returns: "Str" }, { name: "unshift", returns: "Int" }, { name: "values", returns: "List" },
    { name: "fromCharCode", returns: "Str" }, { name: "fromCodePoint", returns: "Str" }, { name: "anchor", returns: "Str" }, { name: "big", returns: "Str" }, { name: "blink", returns: "Str" },
    { name: "bold", returns: "Str" }, { name: "charAt", returns: "Int" }, { name: "charCodeAt", returns: "Int" }, { name: "codePointAt", returns: "Int" }, { name: "endsWith", returns: "Bool" },
    { name: "fixed", returns: "Str" }, { name: "fontColor", returns: "Str" }, { name: "fontSize", returns: "Str" }, { name: "italics", returns: "Str" }, { name: "link", returns: "Str" },
    { name: "localeCompare", returns: "Int" }, { name: "match", returns: "List" }, { name: "normalize", returns: "Str" }, { name: "padEnd", returns: "Str" }, { name: "padStart", returns: "Str" },
    { name: "quote", returns: "Str" }, { name: "repeat", returns: "Str" }, { name: "replace", returns: "Str" }, { name: "search", returns: "Int" }, { name: "small", returns: "Str" },
    { name: "startsWith", returns: "Bool" }, { name: "strike", returns: "Str" }, { name: "sub", returns: "Str" }, { name: "substr", returns: "Str" },
    { name: "substring", returns: "Str" }, { name: "sup", returns: "Str" }, { name: "toLocaleLowerCase", returns: "Str" }, { name: "toLocaleUpperCase", returns: "Str" },
    { name: "toLowerCase", returns: "Str" }, { name: "toUpperCase", returns: "Str" }, { name: "trim", returns: "Str" }, { name: "trimLeft", returns: "Str" },
    { name: "trimRight", returns: "Str" }, { name: "valueOf", returns: "Str" }, { name: "raw", returns: "Str" }];
exports.builtInNames = ["analyze", "len", "gauss", "analyzeForTime", "random", "floor", "randint", "analyzeTrack",
    "analyzeTrackForTime", "dur", "importImage", "importFile", "readInput", "replaceString", "reverseList", "reverseString", "shuffleList", "shuffleString", "float", "count", "index", "split", "startswith",
    "count", "index", "split", "startswith", "length",
    "of", "copyWithin", "entries",
    "every", "fill", "filter", "findIndex", "includes",
    "indexOf", "join", "keys", "lastIndexOf", "map",
    "reverse", "some", "sort", "splice",
    "toLocaleString", "toSource", "toString", "unshift", "values",
    "fromCharCode", "fromCodePoint", "anchor", "big", "blink",
    "bold", "charAt", "charCodeAt", "codePointAt", "endsWith",
    "fixed", "fontColor", "fontSize", "italics", "link",
    "localeCompare", "match", "normalize", "padEnd", "padStart",
    "quote", "repeat", "replace", "search", "small",
    "startsWith", "strike", "sub", "substr",
    "substring", "sup", "toLocaleLowerCase", "toLocaleUpperCase",
    "toLowerCase", "toUpperCase", "trim", "trimLeft",
    "trimRight", "valueOf", "raw", "int", "str"];
//# sourceMappingURL=complexityCalculatorState.js.map