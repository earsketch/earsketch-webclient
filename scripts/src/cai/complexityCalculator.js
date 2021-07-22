import * as ccState from './complexityCalculatorState';
import * as ccHelpers from './complexityCalculatorHelperFunctions';
import { func } from 'prop-types';

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

//gets all ES API calls from a student script
export function getApiCalls() {
    return ccState.getProperty("apiCalls");
}


function recursiveFunctionAnalysis(ast, results, rootAst) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            collectFunctionInfo(node, results, rootAst);
            recursiveFunctionAnalysis(node, results, rootAst);
        }
    } else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            collectFunctionInfo(node, results, rootAst);
            recursiveFunctionAnalysis(node, results, rootAst);
        }
    }
    else if (ast._astname != null && ast._astname == "Expr") {
        collectFunctionInfo(ast.value, results, rootAst);
        recursiveFunctionAnalysis(ast.value, results, rootAst);
    }

    if (ast != null && ast._astname != null && "test" in ast) {
        collectFunctionInfo(ast.test, results, rootAst);
        recursiveFunctionAnalysis(ast.test, results, rootAst);
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        collectFunctionInfo(ast.iter, results, rootAst);
        recursiveFunctionAnalysis(ast.iter, results, rootAst);
    }
}




//recurses through AST and calls function info function on each node
function functionPass(ast, results) {
    recursiveFunctionAnalysis(ast, results, rootAst);

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

    //do uses
    for (let i = 0; i < allFuncs.length; i++) {
        if (allFuncs[i].returns) {
            if (valueTrace(false, allFuncs[i].name, rootAst, [], rootAst)) {
                //do stuff
                results.codeFeatures.functions.manipulateValue = 3;
            }
            if (allFuncs[i].aliases.length > 0) {
                for (let j = 0; j < allFuncs[i].aliases.length; j++) {
                    if (valueTrace(false, allFuncs[i].aliases[j], rootAst, [], rootAst)) {
                        //do stuff
                        results.codeFeatures.functions.manipulateValue = 3;
                    }
                }
            }
        }
    }

    console.log(ccState.getProperty("userFunctions"));
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
            let functionObj = { name: node.name.v, returns: false, params: false, aliases: [], calls: [], start: lineNumber, end: lineNumber, returnVals: [] };

            functionObj.end = ccHelpers.getLastLine(node);

            let funcLines = ccState.getProperty("functionLines");

            for (let i = lineNumber; i <= functionObj.end; i++) {
                if (!funcLines.includes(i)) {
                    funcLines.push(i);
                }
            }

            //check for value return
            for (let i = 0; i < node.body.length; i++) {
                let ret = searchForReturn(node.body[i]);
                if (ret != null) {
                    functionObj.returns = true;
                    functionObj.returnVals.push(ret);
                    break;
                }
            }

            //check for parameters
            if (node.args.args != null && node.args.args.length > 0) {
                functionObj.params = true;
            }


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
        results.codeFeatures.makeBeat = 1;
    }

    //is makeBeat being used
    //beatString is either a variable or a string.
    //hrm. leaving this for now. we're gonna use the soundprofile to build htis
}

//recursively searches for a "return" within an ast node
function searchForReturn(astNode) {
    if (astNode._astname == "Return") {
        return astNode.value;
    }
    else {
        if (astNode != null && astNode.body != null) {
            var astNodeKeys = Object.keys(astNode.body);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode.body[astNodeKeys[r]];
                let ret = searchForReturn(node);
                if (ret != null) {
                    return ret;
                }
            }
            return false;
        } else if (astNode != null && (astNode[0] != null && Object.keys(astNode[0]) != null)) {
            var astNodeKeys = Object.keys(astNode);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode[astNodeKeys[r]];
                let ret = searchForReturn(node);
                if (ret != null) {
                    return ret;
                }
            }
            return null;
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
    } else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
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

    //nodes that need extra testing
    if (ast != null && ast._astname != null && "test" in ast) {
        collectVariableInfo(ast.test);
        variablePass(ast.test);
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        collectVariableInfo(ast.iter);
        variablePass(ast.iter);
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
        //TODO augassign

        if (node._astname == "AugAssign" && node.target._astname == "Name") {
            let assignedName = node.target.id.v;

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


            if (!alreadyExists) {
                ccState.getProperty("allVariables").push(varObject);
            }

        }
    }
}



function reverseValueTrace(isVariable, name, ast, lineNo) {
    if (isVariable) {
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNo)) {


            let latestAssignment = null;

            let thisVar = null;
            let varList = ccState.getProperty("allVariables");
            for (let i = 0; i < varList.length; i++) {
                if (varList[i].name == name) {
                    thisVar = varList[i];
                }
            }

            //get most recent outside-of-function assignment (or inside-this-function assignment)
            let funcLines = ccState.getProperty("functionLines");
            let funcObjs = ccState.getProperty("userFunctions");
            let highestLine = 0;
            if (funcLines.includes(lineNo)) {
                //what function are we in
                let startLine = 0;
                let endLine = 0;
                for (let i = 0; i < funcObjs.length; i++) {
                    if (funcObjs[i].start < lineNo && funcObjs[i].end >= lineNo) {
                        startLine = funcObjs[i].start;
                        endLine = funcObjs[i].end;
                        break;
                    }
                }

                for (let i = 0; i < thisVar.assignments.length; i++) {
                    if (thisVar.assignments[i].line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(thisVar.assignments[i].line) && thisVar.assignments[i].line > startLine && thisVar.assignments[i].line <= endLine) {
                        //then it's valid
                        if (thisVar.assignments[i].line > highestLine) {
                            latestAssignment = Object.assign({}, thisVar.assignments[i]);
                            highestLine = latestAssignment.line;
                        }
                    }
                }

                //we can do three things with the assigned value.


                if (latestAssignment == null) {
                    return "";
                }

                //if it's another variable, do a reverse value trace on IT
                if (latestAssignment.value._astname == "Name") {
                    return reverseValueTrace(true, latestAssignment.value.id.v, latestAssignment.line);
                }
                else if (latestAssignment.value._astname == "Call") {
                    //either a builtin, or a user func
                    //get name
                    let calledName = "";
                    if (node.func._astname == "Name") {
                        //find name
                        calledName = node.func.id.v;
                        //is it a built-in func that returns a str or list? check that first
                        //if (ccState.builtInNames.includes(calledName)) {
                        //    //lookup and return
                        //    for (let j = 0; j < ccState.builtInReturns.length; j++) {
                        //        if (ccState.builtInReturns[j].name == calledName) {
                        //            return ccState.builtInReturns[j].returns;
                        //        }
                        //    }
                        //    return "";
                        //}
                        //else {
                        //    //assume it's a user function.
                        //    for (let j = 0; j < funcObjs.length; j++) {
                        //        if ((funcObjs[j].name == calledName || funcObjs[j].aliases.includes(calledName)) && funcObj[j].returnVals.length > 0) {
                        //            return getTypeFromASTNode(funcObj[j].returnVals[0]);
                        //        }
                        //    }
                        //}

                    }
                    else if (node.func._astname == "Attribute") {
                        //console.log(node.func._astname);
                        calledName = node.func.attr.v;
                        //TODO this is probably a string or list op, so let's maybe take a look into what it's being performed on 
                    }

                }
                else {
                    //return the type
                    return getTypeFromASTNode(latestAssignment.value);

                }

            }
            else {

            }
        }

        return "";
    }
    else {

    }


}

function getTypeFromASTNode(node) {
    //TODO
    return "";
}

function valueTrace(isVariable, name, ast, parentNodes, rootAst, lineVar = null) {



    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            //parent node tracing
            let newParents = parentNodes.slice(0);
            newParents.push([node, astKeys[r]]);
            //is the node a value thingy?
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar)) {
                return true;
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar)) {
                return true;
            }
        }
    }
    else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];

            let newParents = parentNodes.slice(0);
            newParents.push([node, astKeys[r]]);
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar)) {
                return true;
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar)) {
                return true;
            }
        }
    }
    else if (ast != null && ast._astname != null && ast._astname == "Expr") {
        let newParents = parentNodes.slice(0);
        newParents.push([ast.value, "Expr"]);
        if (findValueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar)) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar)) {
            return true;
        }
    }

    //nodes that need extra testing
    if (ast != null && ast._astname != null && "test" in ast) {
        let newParents = parentNodes.slice(0);
        newParents.push([ast.test, "test"]);
        if (findValueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar)) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar)) {
            return true;
        }
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        let newParents = parentNodes.slice(0);
        newParents.push([ast.iter, "iter"]);
        if (findValueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar)) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar)) {
            return true;
        }
    }

    return false;

}

function findValueTrace(isVariable, name, node, parentNodes, rootAst, lineVar = null) {

    if (node != null && node._astname != null) {
        //get linenumber info
        var lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            ccState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = ccState.getProperty('parentLineNumber');
        }

        if (ccState.getProperty("uncalledFunctionLines").includes(lineNumber)) {
            return false;
        }

        //is it what we're looking for?
        let found = false;
        let assignedFunc = false;

        if (node._astname == "Name" && isVariable) {
            //is it the RIGHT name
            if (node.id.v == name) {
                found = true;
            }
        }
        else if (node._astname == "Name") {
            if (node.id.v == name) {
                found = true;
                assignedFunc = true;
            }
        }
        else if (node._astname == "Call" && !isVariable) {
            //is it the function we're looking for or one of its aliases?

            if (node.func._astname == "Name") {

                let calledName = node.func.id.v;
                if (calledName == name) {
                    found = true;
                }
                else {
                    //check if it's an alias
                    let currentFuncs = ccState.getProperty("userFunctions");
                    for (let i = 0; i < currentFuncs; i++) {
                        if (currentFuncs[i].aliases.includes(name)) {
                            found = true;
                            break;
                        }
                    }
                }

            }
        }

        //if not found, then this isn't relevant.
        if (!found) {
            return false;
        }

        //if we found it, what's the parent situation?

        //1. is the parent a use?

        var isUse = false;
        var secondParent;
        if (parentNodes.length > 2) {
            secondParent = parentNodes[parentNodes.length - 3];
        }
        else {
            secondParent = parentNodes[parentNodes.length - 2];
        }
        var nodeParent = parentNodes[parentNodes.length - 2]; //second-to-last item is immediate parent
        var thisNode = parentNodes[parentNodes.length - 1];
        //do uses


        //is it in a func arg
        if (nodeParent[1] == "args") {
            isUse = true;
        }
        else if (thisNode[1] == "test" && nodeParent[0]._astname == "If") {
            isUse = true;
        }
        else if (thisNode[1] == "iter") {
            isUse = true;
        }
        else if (nodeParent[1] == "comparators" && secondParent[1] == "test" && parentNodes.length > 3 && parentNodes[parentNodes.length - 4][0]._astname == "JSFor") {
            //for loop test
            isUse == true;
            console.log("found it");
        }


        if (isUse) {
            if (lineVar != null) {
                lineVar.line = lineNumber;
            }
            return true;
        }


        //2. is it a reassignment?
        let isAssigned = false;
        let assignedName = "";
        //check for assignment

        //console.log("this", thisNode);
        //console.log("parent", nodeParent);

        if (nodeParent[0]._astname == "Assign" && thisNode[1] == "value") {
            isAssigned = true;
            if (nodeParent[0].targets[0]._astname == "Name") {
                assignedName = nodeParent[0].targets[0].id.v;
            }
        }

        //2a. if so, check the root ast for THAT name
        if (isAssigned) {
            return valueTrace(isVariable, assignedName, rootAst, [], rootAst, lineVar);
        }
    }

    //general catch-all if none of the above is true
    return false;
}


//takes all the collected info and generates the relevant results
function doComplexityOutput(results) {




    //do loop nesting check
    let finalLoops = ccState.getProperty("loopLocations").slice(0);
    finalLoops.sort(sortLoopValues);
    for (let i = 0; i < finalLoops.length - 1; i++) {
        for (let j = i + 1; j < finalLoops.length; j++) {
            if (finalLoops[i][0] < finalLoops[j][0] && finalLoops[i][1] >= finalLoops[j][1]) {
                //thgese loops are nested
                results.codeFeatures.iteration.nesting = 1;
                break;
            }
        }
    }

    //do variable scoring
    var variableList = ccState.getProperty("allVariables");
    for (let i = 0; i < variableList.length; i++) {
        var lineNoObj = { line: 0 };
        if (valueTrace(true, variableList[i].name, rootAst, [], rootAst, lineNoObj)) {
            if (!ccState.getProperty("uncalledFunctionLines").includes(lineNoObj.line)) {
                if (results.codeFeatures.variables < 1) {
                    results.codeFeatures.variables = 1;
                }
                let lineNo = lineNoObj.line;
                let loopLines = ccState.getProperty("loopLocations");

                //what about multiple assignments
                if (variableList[i].assignments.length > 0) {
                    //get line numbers of all assignments
                    let lineAssignments = [];
                    for (let j = 0; j < variableList[i].assignments.length; j++) {
                        lineAssignments.push(variableList[i].assignments[j].line);
                    }

                    let counter = 0;
                    for (let k = 0; k < lineAssignments.length; k++) {
                        if (lineAssignments[k] < lineNo) {
                            counter += 1;

                            //check loops too
                            for (let m = 0; m < loopLines.length; m++) {
                                if (lineAssignments[k] > loopLines[m][0] && lineAssignments[k] <= loopLines[m][1]) {
                                    counter += 1;
                                }
                            }

                            if (counter > 1) {
                                results.codeFeatures.variables = 2;
                                break;
                            }

                        }

                    }


                }
            }
        }
    }






}

function sortLoopValues(a, b) {
    let scoreA = a[1] - a[0];
    let scoreB = b[1] - b[0];


    return scoreB - scoreA;
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

                let loopRange = false;
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
                        loopRange = isRange;
                        //check number of args
                        let numArgs = node.iter.args.length;

                        if (results.codeFeatures.iteration.forLoopsPY < numArgs && !ccState.getProperty("isJavascript")) {
                            results.codeFeatures.iteration.forLoopsPY = numArgs;
                        }
                        else if (ccState.getProperty("isJavascript")) {
                            results.codeFeatures.iteration.forLoopsJS = 1;
                        }

                    }
                }

                if (!loopRange && 'iter' in node) {
                    results.codeFeatures.iteration.iterables = 1;
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
    else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            analyzeASTNode(node, results);
            recursiveAnalyzeAST(node, results);
        }
    }
    else if (ast._astname != null && ast._astname == "Expr") {
        recursiveAnalyzeAST(ast.value, results);
    }

    //nodes that need extra testing
    if (ast != null && ast._astname != null && "test" in ast) {
        analyzeASTNode(ast.test, results);
        recursiveAnalyzeAST(ast.test, results);
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        analyzeASTNode(ast.iter, results);
        recursiveAnalyzeAST(ast.iter, results);
    }



    return results;
}

//handles sequential calls to complexity passes and creation of output
export function doAnalysis(ast, results) {
    functionPass(ast, results, ast);
    variablePass(ast);
    console.log(ccState.getProperty("userFunctions"));
    recursiveAnalyzeAST(ast, results);
    //inputOutputPass(node);
    doComplexityOutput(results, ast);
}