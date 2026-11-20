import Sk from "skulpt"
import { doAnalysis, emptyResultsObject } from "."
import { PY_LIST_FUNCS, resetState, setIsJavascript, state } from "./state"

// Process Python code through the complexity calculator service.

// Analyze the source code of a Python script.
export function analyzePython(source: string) {
    if (source === "") {
        return emptyResultsObject()
    }

    resetState()
    state.listFuncs = PY_LIST_FUNCS
    state.studentCode = source.split("\n")
    // initialize list of function return objects with all functions from the API that return something (includes casting), using a slice to make a copy so as not to overwrite anything in starterReturns
    try {
        const ast = generateAst(source)
        replaceNumericUnaryOps(ast.body)
        // initialize the results object
        const resultsObject = emptyResultsObject(ast)

        setIsJavascript(false)
        doAnalysis(ast, resultsObject)

        return resultsObject
    } catch (error) {
        return emptyResultsObject()
    }
}

// Build the abstract syntax tree for Python.
function generateAst(source: string) {
    const parse = Sk.parse("<analyzer>", source)
    state.studentCode = source.split("\n")
    return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags)
}

// Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
function replaceNumericUnaryOps(ast: any) {
    for (const i in ast) {
        if (ast[i] && ast[i]._astname) {
            if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) {
                ast[i] = ast[i].operand
            } else if (ast[i] && "body" in ast[i]) {
                for (const p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p])
                }
            }
            replaceNumericUnaryOps(ast[i])
        }
    }
}
