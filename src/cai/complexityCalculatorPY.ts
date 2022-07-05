import { state, resetState, PY_LIST_FUNCS, setIsJavascript } from "./complexityCalculatorState"
import { replaceNumericUnaryOps } from "./complexityCalculatorHelperFunctions"
import { emptyResultsObject, doAnalysis } from "./complexityCalculator"
import Sk from "skulpt"

// Process Python code through the complexity calculator service.

// Build the abstract syntax tree for Python.
function generateAst(source: string) {
    const parse = Sk.parse("<analyzer>", source)
    state.studentCode = source.split("\n")
    return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags)
}

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
