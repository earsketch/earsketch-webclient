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

function functionPass(ast) {

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
            let functionObj = { name: node.name.v, returns: false, params: false };

            //check for value return
            for(let i = 0; i < node.body.length; i++){
                if(searchForReturn(node.body[i])){
                    functionObj.returns = true;
                    break;
                }
            }

            //check for parameters
            if(node.args.args != null && node.args.args.length > 0){
                functionObj.params = true;
            }


            //TODO check for existence
            let alreadyExists = false;
            let currentFuncs = ccState.getProperty("userFunctions");
            for(let i = 0; i < currentFuncs.length; i++){
                if(currentFuncs[i].name == functionObj.name){
                    alreadyExists = true;
                    break;
                }
            }

            if(!alreadyExists){
                ccState.getProperty("userFunctions").push(functionObj);
            }


        }

        //or a function call?
        else if (node._astname == "Call") {
            //add it to function calls directory in ccstate
        }

    }
}

function searchForReturn(astNode){

    if(astNode._astname == "Return"){
        return true;
    }
    else{
        if (astNode != null && astNode.body != null) {
            var astNodeKeys = Object.keys(astNode.body);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode.body[astNodeKeys[r]];
                if(searchForReturn(node)){
                    return true;
                }
            }
            return false;
        } else if (astNode != null && (astNode[0] != null && Object.keys(astNode[0]) != null)) {
            var astNodeKeys = Object.keys(astNode);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode[astNodeKeys[r]];
                if(searchForReturn(node)){
                    return true;
                }
            }
            return false;
        }
    }


}

function variablePass(node) {

}


//function inputOutputPass(node) {

//}


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
function recursiveAnalyzeAST(ast, results) {
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

export function doAnalysis(ast, results){
    functionPass(ast);
    console.log(ccState.getProperty("userFunctions"));
    variablePass(ast);
    recursiveAnalyzeAST(ast, results);
    //inputOutputPass(node);
}