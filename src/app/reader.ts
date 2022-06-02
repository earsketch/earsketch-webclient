// Parse and analyze abstract syntax trees without compiling the script, e.g. to measure code complexity.
import * as acorn from "acorn"
import Sk from "skulpt"

interface CodeFeatures {
    userFunc: number
    booleanConditionals: number
    conditionals: number
    loops: number
    lists: number
    listOps: number
    strOps: number
}

export const FEATURE_SCORES = {
    userFunc: 30,
    booleanConditionals: 15,
    conditionals: 10,
    loops: 10,
    lists: 15,
    listOps: 15,
    strOps: 15,
} as const

export function analyze(language: "python" | "javascript", source: string) {
    return language === "python" ? analyzePython(source) : analyzeJavascript(source)
}

const PY_LIST_FUNCS = ["append", "count", "extend", "index", "insert", "pop", "remove", "reverse", "sort"] as const
const PY_STR_FUNCS = ["join", "split", "strip", "rstrip", "lstrip", "startswith", "upper", "lower"] as const

// Build the abstract syntax tree for Python. Useful for analyzing script
// complexity or looking for specific function call e.g. onLoop().
function pythonAst(source: string) {
    const parse = Sk.parse("<analyzer>", source)
    return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags)
}

// Analyze the source code of a Python script.
export function analyzePython(source: string) {
    const ast = pythonAst(source)
    const features = {
        userFunc: 0,
        booleanConditionals: 0,
        conditionals: 0,
        loops: 0,
        lists: 0,
        listOps: 0,
        strOps: 0,
    }
    return recursiveAnalyzePython(ast, features)
}

// Compute total score based on the features present and the score assigned to each feature.
export function total(features: CodeFeatures) {
    const map = FEATURE_SCORES as { [key: string]: number }
    return Object.entries(features).reduce((score, [feature, count]) => score + count * map[feature], 0)
}

// Analyze a single node of a Python AST.
function analyzePythonNode(node: any, results: CodeFeatures) {
    if (node._astname === "FunctionDef") {
        results.userFunc++
    } else if (node._astname === "If") {
        if (node.test.op) {
            results.booleanConditionals++
        } else {
            results.conditionals++
        }
    } else if (node._astname === "While" || node._astname === "For") {
        results.loops++
    } else if (node._astname === "Assign") {
        if (node?.value?._astname === "List") {
            results.lists++
        }
    } else if (node._astname === "Expr" || node._astname === "Assign") {
        if (PY_LIST_FUNCS.includes(node?.value?.func?.attr?.v)) {
            results.listOps++
        } else if (PY_STR_FUNCS.includes(node?.value?.func?.attr?.v)) {
            results.strOps++
        }
    }
}

// Recursively analyze a python abstract syntax tree.
function recursiveAnalyzePython(ast: any, results: CodeFeatures) {
    if (ast.body) {
        for (const node of ast.body) {
            analyzePythonNode(node, results)
            recursiveAnalyzePython(node, results)
        }
    }
    return results
}

const JS_LIST_FUNCS = [
    "of", "concat", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex", "forEach", "includes", "indexOf",
    "join", "keys", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort",
    "splice", "toLocaleString", "toSource", "toString", "unshift", "values",
] as const

const JS_STR_FUNCS = [
    "fromCharCode", "fromCodePoint", "anchor", "big", "blink", "bold", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith",
    "fixed", "fontcolor", "fontsize", "includes", "indexOf", "italics", "lastIndexOf", "link", "localeCompare", "match", "normalize",
    "padEnd", "padStart", "quote", "repeat", "replace", "search", "slice", "small", "split", "startsWith", "strike", "sub", "substr",
    "substring", "sup", "toLocaleLowerCase", "toLocaleUpperCase", "toLowerCase", "toSource", "toString", "toUpperCase", "trim",
    "trimLeft", "trimRight", "valueOf", "raw",
] as const

export function analyzeJavascript(source: string) {
    const ast = acorn.parse(source)
    const features = {
        userFunc: 0,
        booleanConditionals: 0,
        conditionals: 0,
        loops: 0,
        lists: 0,
        listOps: 0,
        strOps: 0,
    }
    return recursiveAnalyzeJavascript(ast, features)
}

function recursiveAnalyzeJavascript(tree: any, result: CodeFeatures) {
    if (tree === undefined || tree === null) {
        return result
    } else if (tree.constructor.name === "Array") {
        for (const branch of tree) {
            recursiveAnalyzeJavascript(branch, result)
        }
    } else {
        switch (tree.type) {
            case "FunctionDeclaration":
                result.userFunc++
                recursiveAnalyzeJavascript(tree.body, result)
                break
            case "ForStatement":
            case "ForInStatement":
            case "WhileStatement":
            case "DoWhileStatement":
                result.loops++
                recursiveAnalyzeJavascript(tree.body, result)
                break
            case "IfStatement":
                if (tree.test.type === "LogicalExpression") {
                    result.booleanConditionals++
                } else {
                    result.conditionals++
                }
                recursiveAnalyzeJavascript(tree.consequent, result)
                recursiveAnalyzeJavascript(tree.alternate, result)
                break
            case "SwitchStatement":
                result.conditionals++
                recursiveAnalyzeJavascript(tree.cases, result)
                break
            case "SwitchCase":
                recursiveAnalyzeJavascript(tree.consequent, result)
                break
            case "ArrayExpression":
                result.lists++
                recursiveAnalyzeJavascript(tree.elements, result)
                break

            case "Program":
            case "BlockStatement":
            case "FunctionExpression":
                recursiveAnalyzeJavascript(tree.body, result)
                break
            case "ExpressionStatement":
                recursiveAnalyzeJavascript(tree.expression, result)
                break
            case "AssignmentExpression":
                recursiveAnalyzeJavascript(tree.right, result)
                break
            case "VariableDeclaration":
                recursiveAnalyzeJavascript(tree.declarations, result)
                break
            case "VariableDeclarator":
                recursiveAnalyzeJavascript(tree.init, result)
                break

            case "CallExpression":
                recursiveAnalyzeJavascript(tree.callee, result)
                recursiveAnalyzeJavascript(tree.arguments, result)
                break
            case "MemberExpression":
                recursiveAnalyzeJavascript(tree.object, result)
                recursiveAnalyzeJavascript(tree.property, result)
                break
            case "ObjectExpression":
                recursiveAnalyzeJavascript(tree.properties, result)
                break
            case "Identifier":
                if (JS_LIST_FUNCS.includes(tree.name)) {
                    result.listOps++
                } else if (JS_STR_FUNCS.includes(tree.name)) {
                    result.strOps++
                }
                break
            default:
                if (tree.kind === "init") {
                    recursiveAnalyzeJavascript(tree.value, result)
                }
                if (tree.arguments !== undefined) {
                    recursiveAnalyzeJavascript(tree.arguments, result)
                }
                break
        }
    }
    return result
}
