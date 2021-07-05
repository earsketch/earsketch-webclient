import * as ccState from './complexityCalculatorState';
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import { func } from 'prop-types';

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

export function getApiCalls() {
    return ccState.getProperty("apiCalls");
}



    //if (ast != null && ast.body != null) {
    //    var astKeys = Object.keys(ast.body);
    //    for (var r = 0; r < astKeys.length; r++) {
    //        var node = ast.body[astKeys[r]];
    //        markVariable(node);
    //        gatherAllVariables(node);
    //    }
    //} else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
    //    var astKeys = Object.keys(ast);
    //    for (var r = 0; r < astKeys.length; r++) {
    //        var node = ast[astKeys[r]];
    //        markVariable(node);
    //        gatherAllVariables(node);
    //    }
    //}

export function functionPass(ast) {

    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            collectFunctionInfo(node);
            functionPass(node);
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            collectFunctionInfo(node);
            functionPass(node);
        }
    }
}

function collectFunctionInfo(node) {
    if (node != null && node._astname != null) {
        //get linenumber info
        var lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            ccState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = ccState.getProperty('parentLineNumber');
        }
        //does the node contain a function def?
        if (node._astname == "FunctionDef") {
            let functionObj = { name: node.name.v };

            //TODO check for existence
            ccState.getProperty("userFunctions").push(functionObj);
        }

        //or a function call?
        else if (node._astname == "Call") {
            //add it to function calls directory in ccstate
        }

    }
}

export function variablePass() {

}


export function inputOutputPass() {

}


// Analyze a single node of a Python AST.
function analyzeASTNode(node, results) {
    if (node != null && node._astname != null) {
        var lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            ccState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = ccState.getProperty('parentLineNumber');
        }
        if (!ccState.getProperty('uncalledFunctionLines').includes(lineNumber + 1)) {}
        
    }
}

// Recursively analyze a python abstract syntax tree.
export function recursiveAnalyzeAST(ast, results) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            analyzeASTNode(node, results);
            recursiveAnalyzeAST(node, results);
        }
    } 
    return results;
}