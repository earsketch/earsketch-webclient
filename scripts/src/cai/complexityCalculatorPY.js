import * as ccState from './complexityCalculatorState';
import * as caiErrorHandling from './errorHandling';
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import * as cc from './complexityCalculator';

// Process Python code through the complexity calculator service.

// Build the abstract syntax tree for Python.
function generateAst(source_code) {
    try {
        var parse = Sk.parse("<analyzer>", source_code);
    	ccState.setProperty('studentCode',source_code.split("\n"));
        return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags);
    } catch (error) {
        throw error;
    }
}

// Analyze the source code of a Python script.
export function analyzePython(source_code) {
    ccState.resetState();
    ccState.setProperty("listFuncs", ['append', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort']);
    ccState.setProperty('studentCode', source_code.split("\n"));
    //initialize list of function return objects with all functions from the API that return something (includes casting), using a slice to make a copy so as not to overwrite anything in starterReturns
    var ast = generateAst(source_code);
    ccHelpers.replaceNumericUnaryOps(ast.body);
    //initialize the results object
    var resultsObject = {
        userFunc: 0,
        conditionals: 0,
        forLoops: 0,
        List: 0,
        variables: 0,
        consoleInput: 0
    };
    ccState.setProperty('isJavascript', false);     
    //PASS 1: Do the same thing for function returns from user-defined functions
    cc.evaluateUserFunctionParameters(ast, resultsObject);
    //PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
    cc.gatherAllVariables(ast);
    //PASS 3: Account for the variables that only exist as function params.
    cc.evaluateFunctionReturnParams(ast);
    //use information gained from labeling user functions to fill in missing variable info, and vice-versa.
    var iterations = 0;
    while (!ccHelpers.allReturnsFilled() && iterations < 10) {
        cc.evaluateAllEmpties();
        iterations++;
    }
    cc.recursiveAnalyzeAST(ast, resultsObject, [false, false]);
    //PASS 4: Actually analyze the Python.
    //boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
    if (resultsObject.boolOps > resultsObject.booleans) {
        resultsObject.booleans = resultsObject.boolOps;
    }
    if (resultsObject.comparisons > resultsObject.booleans) {
        resultsObject.booleans = resultsObject.comparisons;
    }
    // translateIntegerValues(resultsObject);   //translate the calculated values
    ccHelpers.lineDict();
    caiErrorHandling.updateNames(ccState.getProperty('allVariables'), ccState.getProperty('userFunctionParameters'));
    return resultsObject;
}