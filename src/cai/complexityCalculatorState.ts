// Manages the state of the complexity calculator service.
import { API_FUNCTIONS } from "../api/api"
import { ESApiDoc } from "../data/api_doc"
import { FunctionObj, CallObj, VariableObj, StructuralNode } from "./complexityCalculator"

interface State {
    allVariables: VariableObj [],
    apiCalls: CallObj [],
    loopLocations: [number, number] [],
    functionLines: number [],
    uncalledFunctionLines: number [],
    parentLineNumber: number,
    studentCode: string [],
    isJavascript: boolean,
    listFuncs: string [],
    strFuncs: string [],
    userFunctionReturns: FunctionObj [],
    codeStructure: StructuralNode,
}

const createState = (): State => ({
    allVariables: [],
    apiCalls: [],
    loopLocations: [],
    functionLines: [],
    uncalledFunctionLines: [],
    parentLineNumber: 0,
    studentCode: [],
    isJavascript: false,
    listFuncs: [],
    strFuncs: [],
    userFunctionReturns: [],
    codeStructure: Object.create(null),
})
export let state = createState()

export function resetState() {
    state = createState()
}

export function getState() {
    return {}
}

export function setIsJavascript(value: boolean) {
    state.isJavascript = value

    if (value) {
        state.listFuncs = JS_LIST_FUNCS.slice(0)
        state.strFuncs = JS_STR_FUNCS.slice(0)
    } else {
        state.listFuncs = PY_LIST_FUNCS.slice(0)
        state.strFuncs = PY_STR_FUNCS.slice(0)
    }
}

// these are to handle conversions from javascript
export const binOps: { [key: string]: string } = {
    "+": "Add",
    "-": "Sub",
    "*": "Mult",
    "/": "Div",
    "%": "Mod",
    "**": "Pow",
    "^": "Pow",
}

export const comparatorOps: { [key: string]: string } = {
    ">": "Gt",
    "<": "Lt",
    ">=": "GtE",
    "<=": "LtE",
    "==": "Eq",
    "!=": "NotEq",
}

export const boolOps: { [key: string]: string } = {
    "&&": "And",
    "||": "Or",
}

export const apiFunctions = Object.keys(API_FUNCTIONS)

export const PY_LIST_FUNCS = ["append", "count", "extend", "index", "insert", "pop", "remove", "reverse", "sort"]
export const PY_STR_FUNCS = ["join", "split", "strip", "rstrip", "lstrip", "startswith", "upper", "lower"]
export const PY_CREATE_LIST_FUNCS = ["append", "extend", "insert", "reverse", "sort"]
export const PY_CREATE_STR_FUNCS = ["join", "strip", "rstrip", "lstrip", "upper", "lower", "shuffleString"]

export const JS_BUILT_IN_OBJECTS = ["Math", "Object", "Function", "Boolean", "Symbol", "Error", "Number", "BigInt", "Date", "String", "RegExp", "Array", "Map", "Set"] // this is not complete but if a student uses something else then I give up.
export const JS_LIST_FUNCS = ["length", "of", "concat", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex", "forEach", "includes", "indexOf", "join", "keys", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice", "toLocaleString", "toSource", "toString", "unshift", "values"]
export const JS_STR_FUNCS = ["length", "fromCharCode", "fromCodePoint", "anchor", "big", "blink", "bold", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith", "fixed", "fontcolor", "fontsize", "includes", "indexOf", "italics", "lastIndexOf", "link", "localeCompare", "match", "normalize", "padEnd", "padStart", "quote", "repeat", "replace", "search", "slice", "small", "split", "startsWith", "strike", "sub", "substr", "substring", "sup", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toSource", "toString", "toUpperCase", "trim", "trimLeft", "trimRight", "valueOf", "raw"]
export const JS_STR_LIST_OVERLAP = ["length", "concat", "includes", "indexOf", "lastIndexOf", "slice", "toSource", "toString"]

interface BuiltInReturn {
    name: string,
    returns: string
}

export const builtInReturns: BuiltInReturn [] = [
    { name: "int", returns: "Int" }, { name: "float", returns: "Float" }, { name: "str", returns: "Str" }, { name: "count", returns: "int" },
    { name: "index", returns: "int" }, { name: "split", returns: "List" }, { name: "startswith", returns: "Bool" }, { name: "count", returns: "int" },
    { name: "index", returns: "int" }, { name: "split", returns: "List" }, { name: "startswith", returns: "Bool" }, { name: "length", returns: "Int" },
    { name: "str", returns: "String" }, { name: "of", returns: "List" }, { name: "copyWithin", returns: "List" }, { name: "entries", returns: "List" },
    { name: "every", returns: "Bool" }, { name: "fill", returns: "List" }, { name: "filter", returns: "List" }, { name: "findIndex", returns: "Int" },
    { name: "includes", returns: "Bool" }, { name: "indexOf", returns: "Int" }, { name: "join", returns: "Str" }, { name: "keys", returns: "List" },
    { name: "lastIndexOf", returns: "Int" }, { name: "map", returns: "List" }, { name: "reverse", returns: "List" }, { name: "some", returns: "Bool" },
    { name: "sort", returns: "List" }, { name: "splice", returns: "List" }, { name: "toLocaleString", returns: "Str" }, { name: "toSource", returns: "Str" },
    { name: "toString", returns: "Str" }, { name: "unshift", returns: "Int" }, { name: "values", returns: "List" }, { name: "fromCharCode", returns: "Str" },
    { name: "fromCodePoint", returns: "Str" }, { name: "anchor", returns: "Str" }, { name: "big", returns: "Str" }, { name: "blink", returns: "Str" },
    { name: "bold", returns: "Str" }, { name: "charAt", returns: "Int" }, { name: "charCodeAt", returns: "Int" }, { name: "codePointAt", returns: "Int" },
    { name: "endsWith", returns: "Bool" }, { name: "fixed", returns: "Str" }, { name: "fontColor", returns: "Str" }, { name: "fontSize", returns: "Str" },
    { name: "italics", returns: "Str" }, { name: "link", returns: "Str" }, { name: "localeCompare", returns: "Int" }, { name: "match", returns: "List" },
    { name: "normalize", returns: "Str" }, { name: "padEnd", returns: "Str" }, { name: "padStart", returns: "Str" }, { name: "quote", returns: "Str" },
    { name: "repeat", returns: "Str" }, { name: "replace", returns: "Str" }, { name: "search", returns: "Int" }, { name: "small", returns: "Str" },
    { name: "startsWith", returns: "Bool" }, { name: "strike", returns: "Str" }, { name: "sub", returns: "Str" }, { name: "substr", returns: "Str" },
    { name: "substring", returns: "Str" }, { name: "sup", returns: "Str" }, { name: "toLocaleLowerCase", returns: "Str" }, { name: "toLocaleUpperCase", returns: "Str" },
    { name: "toLowerCase", returns: "Str" }, { name: "toUpperCase", returns: "Str" }, { name: "trim", returns: "Str" }, { name: "trimLeft", returns: "Str" },
    { name: "trimRight", returns: "Str" }, { name: "valueOf", returns: "Str" }, { name: "raw", returns: "Str" }, { name: "len", returns: "Int" },
].concat(buildBuiltInReturns())

function buildBuiltInReturns(): BuiltInReturn [] {
    const emptyReturns: BuiltInReturn [] = []

    for (const apiName in ESApiDoc) {
        const apiObj = ESApiDoc[apiName]
        if (apiObj.length === 1 && "returns" in apiObj[0] && apiObj[0].returns) {
            const splitReturn = apiObj[0].returns.typeKey.split(".")
            let returnedType = splitReturn[splitReturn.length - 1]

            returnedType = returnedType.charAt(0).toUpperCase() + returnedType.slice(1)
            emptyReturns.push({ name: apiName.toString(), returns: returnedType })
        }
    }

    return emptyReturns
}

export const builtInNames = apiFunctions.concat(["len", "random", "floor", "randint",
    "float", "count", "index", "split", "startswith",
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
    "trimRight", "valueOf", "raw", "int", "str"])
