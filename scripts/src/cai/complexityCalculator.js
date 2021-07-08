import * as ccState from './complexityCalculatorState';
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import { func } from 'prop-types';

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

//gets all ES API calls from a student script
export function getApiCalls() {
    return ccState.getProperty("apiCalls");
}




//recurses through AST and calls function info function on each node
function functionPass(ast, results) {

    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            collectFunctionInfo(node, results);
            functionPass(node, results);
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            collectFunctionInfo(node, results);
            functionPass(node, results);
        }
    }
    else if (ast._astname != null && ast._astname == "Expr") {
        collectFunctionInfo(ast.value, results);
        functionPass(ast.value, results);
    }

    //do calls
    let allFuncs = ccState.getProperty("userFunctions");
    for (let i = 0; i < allFuncs.length; i++) {

        //uncalled function lines
        if (allFuncs[i].calls.length == 0) {
            for (let j = allFuncs[i].start; j <= allFuncs[i].end; j++) {
                ccState.getProperty("uncalledFunctionLines").push(j);
            }
        }


        //results
        if (allFuncs[i].calls.length == 1 && results.codeFeatures.functions.repeatExecution < 1) {
            results.codeFeatures.functions.repeatExecution = 1;
        }
        else if (allFuncs[i].calls.length > 1 && results.codeFeatures.functions.repeatExecution < 2) {
            results.codeFeatures.functions.repeatExecution = 2;
        }
        if (allFuncs[i].calls.length > 1 && allFuncs[i].params) {
            results.codeFeatures.functions.repeatExecution = 3;
        }
        if (allFuncs[i].calls.length > 0 && allFuncs[i].returns && results.codeFeatures.functions.manipulateValue < 1) {
            results.codeFeatures.functions.manipulateValue = 1;
        }
        else if (allFuncs[i].calls.length > 1 && allFuncs[i].returns && results.codeFeatures.functions.manipulateValue < 2) {
            results.codeFeatures.functions.manipulateValue = 2;
        }
    }
}

//collects function info from a node
function collectFunctionInfo(node, results) {
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
            let functionObj = { name: node.name.v, returns: false, params: false, aliases: [], calls: [], start: lineNumber, end: lineNumber };

            functionObj.end = ccHelpers.getLastLine(node);

            //check for value return
            for (let i = 0; i < node.body.length; i++) {
                if (searchForReturn(node.body[i])) {
                    functionObj.returns = true;
                    break;
                }
            }

            //check for parameters
            if (node.args.args != null && node.args.args.length > 0) {
                functionObj.params = true;
            }


            //TODO check for existence
            let alreadyExists = false;
            let currentFuncs = ccState.getProperty("userFunctions");
            for (let i = 0; i < currentFuncs.length; i++) {
                if (currentFuncs[i].name == functionObj.name) {
                    alreadyExists = true;
                    break;
                }
            }

            if (!alreadyExists) {
                ccState.getProperty("userFunctions").push(functionObj);
            }


        }

        //or a function call?
        else if (node._astname == "Call") {
            //add it to function calls directory in ccstate
            let calledName = ""
            if (node.func._astname == "Name") {
                //find name
                calledName = node.func.id.v;
                
            }
            else if (node.func._astname == "Attribute") {
                //console.log(node.func._astname);
                calledName = node.func.attr.v;
            }

            let currentFuncs = ccState.getProperty("userFunctions");
            if (calledName == "makeBeat") {
                markMakeBeat(node, results);
            }
            else if (calledName == "readInput") {
                results.codeFeatures.features.consoleInput = 1;
            }

            if (ccState.getProperty("listFuncs").includes(calledName)) {
                results.codeFeatures.features.listOps = 1;
            }
            if (ccState.getProperty("strFuncs").includes(calledName)) {
                results.codeFeatures.features.strOps = 1;
            }

            for (let i = 0; i < currentFuncs; i++) {
                if (currentFuncs[i].name == calledName || calledFuncs[i].aliases.includes(calledName)) {
                    currentFuncs[i].calls.push(lineNumber);

                    if (currentFuncs[i].name == "makeBeat") {
                        markMakeBeat(node, results);
                    }
                    else if (currentFuncs[i].name == "readInput") {
                        results.codeFeatures.features.consoleInput = 1;
                    }

                    if (ccState.getProperty("listFuncs").includes(currentFuncs[i].name)) {
                        results.codeFeatures.features.listOps = 1;
                    }
                    if (ccState.getProperty("strFuncs").includes(currentFuncs[i].name)) {
                        results.codeFeatures.features.strOps = 1;
                    }

                    break;
                }
            }

        }

    }
}


function markMakeBeat(callNode, results) {
    if (results.codeFeatures.makeBeat < 1) {
        results.codeFeatures.makeBeat = 1
    }

    //is makeBeat being used
    //beatString is either a variable or a string.
    //hrm. leaving this for now. we're gonna use the soundprofile to build htis
}

//recursively searches for a "return" within an ast node
function searchForReturn(astNode) {

    if (astNode._astname == "Return") {
        return true;
    }
    else {
        if (astNode != null && astNode.body != null) {
            var astNodeKeys = Object.keys(astNode.body);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode.body[astNodeKeys[r]];
                if (searchForReturn(node)) {
                    return true;
                }
            }
            return false;
        } else if (astNode != null && (astNode[0] != null && Object.keys(astNode[0]) != null)) {
            var astNodeKeys = Object.keys(astNode);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode[astNodeKeys[r]];
                if (searchForReturn(node)) {
                    return true;
                }
            }
            return false;
        }
    }


}

//recurses through AST and calls variable info function on each node
function variablePass(ast) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            collectVariableInfo(node);
            variablePass(node);
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            collectVariableInfo(node);
            variablePass(node);
        }
    }
    else if (ast._astname != null && ast._astname == "Expr") {
        collectVariableInfo(ast.value);
        variablePass(ast.value);
    }
}

//collects variable info from a node
function collectVariableInfo(node) {
    if (node != null && node._astname != null) {
        //get linenumber info
        var lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            ccState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = ccState.getProperty('parentLineNumber');
        }


        if (node._astname == "Assign" && node.targets.length == 1) {
            //does it already exist in the directory
            if ("id" in node.targets[0] && "v" in node.targets[0].id) {
                let assignedName = node.targets[0].id.v;

                let varObject = { name: assignedName, assignments: [] };
                let alreadyExists = false;

                let currentVars = ccState.getProperty("allVariables");
                for (let i = 0; i < currentVars.length; i++) {
                    if (currentVars[i].name == assignedName) {
                        varObject = currentVars[i];
                        alreadyExists = true;
                        break;
                    }
                }

                varObject.assignments.push({ line: lineNumber, value: node.value });

                //function alias tracking
                let currentFuncs = ccState.getProperty("userFunctions");

                if (node.value._astname == "Name") {

                    let assignedAlias = node.value.id.v;
                    let assignmentExists = false;
                    for (let i = 0; i < currentFuncs.length; i++) {
                        if ((currentFuncs[i].name == assignedAlias && !currentFuncs[i].aliases.includes(assignedName)) || (currentFuncs[i].aliases.includes(assignedAlias) && !currentFuncs[i].aliases.includes(assignedName))) {
                            assignmentExists = true;
                            currentFuncs[i].aliases.push(assignedName);
                        }
                    }

                    if (!assignmentExists) {
                        ccState.getProperty("userFunctions").push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0 });
                    }
                }

                if (!alreadyExists) {
                    ccState.getProperty("allVariables").push(varObject);
                }

            }

        }

    }
}

//takes all the collected info and generates the relevant results
function doComplexityOutput(results) {





    //do loop nesting check
    let finalLoops = ccState.getProperty("loopLocations").slice(0);
    finalLoops.sort(sortLoopValues);
    console.log(finalLoops);
    for (let i = 0; i < finalLoops.length - 1; i++) {
        for (let j = i + 1; j < finalLoops.length; j++) {
            if (finalLoops[i][0] < finalLoops[j][0] && finalLoops[i][1] >= finalLoops[j][1]) {
                //thgese loops are nested
                results.codeFeatures.iteration.nesting = 1;
                break;
            }
        }
    }

}

function sortLoopValues(a, b) {
    let scoreA = a[1] - a[0];
    let scoreB = b[1] - b[0];


    return scoreB - scoreA;
    //if (scoreA > scoreB) {
    //    return -1;
    //}
    //else return 1;
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
        if (!ccState.getProperty('uncalledFunctionLines').includes(lineNumber + 1)) {

            if (node._astname === "For") {

                //mark loop
                let firstLine = lineNumber;
                let lastLine = ccHelpers.getLastLine(node);

                ccState.getProperty("loopLocations").push([firstLine, lastLine]);

                //is the iterator range()?
                if (node.iter._astname == "Call") {
                    //is the iter call to range()
                    if (node.iter.func._astname == "Name") {
                        let iterFuncName = node.iter.func.id.v;
                        let isRange = iterFuncName == "range";

                        //check for renames (unlikely, but we should do it)
                        if (!isRange) {
                            let currentFuncs = ccState.getProperty("userFunctions");
                            for (let i = 0; i < currentFuncs.length; i++) {
                                if (currentFuncs[i].aliases.includes(iterFuncName) && currentFuncs[i].name == "range") {
                                    isRange = true;
                                    break;
                                }
                            }
                        }

                        //check number of args
                        let numArgs = node.iter.args.length;

                        if (results.codeFeatures.iteration.forLoopsPY < numArgs) {
                            results.codeFeatures.iteration.forLoopsPY = numArgs;
                        }

                    }
                }

            }
            else if (node._astname === "JSFor") {
                //test node needs hand checking

                //mark loop
                let firstLine = lineNumber;
                let lastLine = ccHelpers.getLastLine(node);

                ccState.getProperty("loopLocations").push([firstLine, lastLine]);
            }
            else if (node._astname === "If") {
                if (results.codeFeatures.conditionals.conditionals < 1) {
                    results.codeFeatures.conditionals.conditionals = 1;
                }
                if (node.orelse.length > 0) {
                    if (results.codeFeatures.conditionals.conditionals < 2) {
                        results.codeFeatures.conditionals.conditionals = 2;
                    }
                    if ("orelse" in node.orelse[0] && node.orelse[0].orelse.length > 0 && results.codeFeatures.conditionals.conditionals < 3) {
                        results.codeFeatures.conditionals.conditionals = 3;
                    }

                    recursiveAnalyzeAST(node.orelse, results);
                }
            }
            else if (node._astname === "UnaryOp") {
                recursiveAnalyzeAST(node.operand, results, loopParent);
            }
            else if (node._astname === "Subscript") {
                results.codeFeatures.features.indexing = 1;
            }
            else if (node._astname === "Compare") {
                results.codeFeatures.features.comparisons = 1;
            }
            else if (node._astname === "BinOp") {
                results.codeFeatures.features.binOps = 1;
            }
            else if (node._astname === "While") {
                results.codeFeatures.iteration.whileLoops = 1;

                //mark loop
                let firstLine = lineNumber;
                let lastLine = ccHelpers.getLastLine(node);

                ccState.getProperty("loopLocations").push([firstLine, lastLine]);
            }



        }

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
    else if (ast._astname != null && ast._astname == "Expr") {
        recursiveAnalyzeAST(ast.value, results);
    }
    return results;
}

//handles sequential calls to complexity passes and creation of output
export function doAnalysis(ast, results) {
    functionPass(ast, results);
    variablePass(ast);
    console.log(ccState.getProperty("userFunctions"));
    recursiveAnalyzeAST(ast, results);
    //inputOutputPass(node);
    doComplexityOutput(results);
}