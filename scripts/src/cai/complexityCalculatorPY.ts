import * as ccState from "./complexityCalculatorState"
import * as ccHelpers from "./complexityCalculatorHelperFunctions"
import * as cc from "./complexityCalculator"

// Process Python code through the complexity calculator service.

// Build the abstract syntax tree for Python.
function generateAst(source: string) {
    const parse = Sk.parse("<analyzer>", source)
    ccState.setProperty("studentCode", source.split("\n"))
    return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags)
}

// Analyze the source code of a Python script.
export function analyzePython(source: string) {
    if (source === "") {
        return { complexity: "" }
    }

    ccState.resetState()
    ccState.setProperty("listFuncs", ["append", "count", "extend", "index", "insert", "pop", "remove", "reverse", "sort"])
    ccState.setProperty("studentCode", source.split("\n"))
    // initialize list of function return objects with all functions from the API that return something (includes casting), using a slice to make a copy so as not to overwrite anything in starterReturns
    try {
        const ast = generateAst(source)
        ccHelpers.replaceNumericUnaryOps(ast.body)
        // initialize the results object
        const resultsObject: cc.Results = {
            ast: ast,
            codeFeatures: {
                errors: 0,
                variables: 0,
                makeBeat: 0,
                iteration: {
                    whileLoops: 0,
                    forLoopsPY: 0,
                    forLoopsJS: 0,
                    iterables: 0,
                    nesting: 0,
                },
                conditionals: {
                    conditionals: 0,
                    usedInConditionals: [],
                },
                functions: {
                    repeatExecution: 0,
                    manipulateValue: 0,
                },
                features: {
                    indexing: 0,
                    consoleInput: 0,
                    listOps: 0,
                    strOps: 0,
                    binOps: 0,
                    comparisons: 0,
                },
            },
            codeStructure: {} as cc.StructuralNode,
            inputsOutputs: {
                sections: {},
                effects: {},
                sounds: {},
            },
            depth: 0,
        }

        ccState.setIsJavascript(false)
        cc.doAnalysis(ast, resultsObject)

        // translateIntegerValues(resultsObject);   //translate the calculated values
        ccHelpers.lineDict()
        return resultsObject
    } catch (error) {
        return {
            // return {
            ast: {} as cc.AnyNode,
            codeFeatures: {

                errors: 1,
                variables: 0,
                makeBeat: 0,
                iteration: {
                    whileLoops: 0,
                    forLoopsPY: 0,
                    forLoopsJS: 0,
                    iterables: 0,
                    nesting: 0,
                },
                conditionals: {
                    conditionals: 0,
                    usedInConditionals: [],
                },
                functions: {
                    repeatExecution: 0,
                    manipulateValue: 0,
                },
                features: {
                    indexing: 0,
                    consoleInput: 0,
                    listOps: 0,
                    strOps: 0,
                    binOps: 0,
                    comparisons: 0,
                },
            },
            codeStructure: {} as cc.StructuralNode,
            inputsOutputs: {
                sections: {},
                effects: {},
                sounds: {},
            },
            depth: 0,
        } as cc.Results
    }
}
