import * as ccState from './complexityCalculatorState';
import * as ccHelpers from './complexityCalculatorHelperFunctions';

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.


//gets all ES API calls from a student script
export function getApiCalls() {
    return ccState.getProperty("apiCalls");
}

function recursiveCallOnNodes(funcToCall, args, ast) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            funcToCall(node, args);
            recursiveCallOnNodes(funcToCall, args, node)
        }
    }
    else if (ast != null && ast._astname != null && ast._astname == "BoolOp") {
        var valueKeys = Object.keys(ast.values);
        for (var r = 0; r < valueKeys.length; r++) {
            var node = ast.values[valueKeys[r]];
            funcToCall(node, args);
            recursiveCallOnNodes(funcToCall, args, node)
        }

    }
    else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            funcToCall(node, args);
            recursiveCallOnNodes(funcToCall, args, node)
        }
    }
    else if (ast != null && ast._astname != null && ast._astname == "Expr") {
        funcToCall(ast.value, args);
        recursiveCallOnNodes(funcToCall, args, ast.value)
    }

    if (ast != null && ast._astname != null && "test" in ast) {
        funcToCall(ast.test, args);
        recursiveCallOnNodes(funcToCall, args, ast.test)
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        funcToCall(ast.iter, args);
        recursiveCallOnNodes(funcToCall, args, ast.iter)
    }
    if (ast != null && ast._astname != null && "orelse" in ast) {
        funcToCall(ast.orelse, args);
        recursiveCallOnNodes(funcToCall, args, ast.orelse)
    }
}

function analyzeConditionalTest(testNode, tallyList) {
    tallyObjectsInConditional(testNode, tallyList);
    recursiveCallOnNodes(tallyObjectsInConditional, tallyList, testNode);
}

function tallyObjectsInConditional(node, tallyList) {
    if (node == null) {
        return;
    }
    if (node._astname == "Name") {
        //boolval or variable
        if ((node.id.v == "True" || node.id.v == "False") && !tallyList.includes("Bool")) {
            tallyList.push("Bool");
        }
        else {
            //is it a variable
            var varList = ccState.getProperty("allVariables");
            for (var i = 0; i < varList.length; i++) {
                if (varList[i].name == node.id.v) {
                    tallyList.push("Variable");
                    break;
                }
            }
        }
    }
    else if ((node._astname == "Compare" || node._astname == "BoolOp" || node._astname == "Call" || node._astname == "BinOp") && !tallyList.includes(node._astname)) {
        tallyList.push(node._astname);
    }

    //extra handling for mod
    if (node._astname == "BinOp") {
        if (node.op.name == "Mod" && !tallyList.includes("Mod")) {
            tallyList.push("Mod");
        }
        // console.log(node.op.name);
    }

}

//recurses through AST and calls function info function on each node
function functionPass(results, rootAst) {
    recursiveCallOnNodes(collectFunctionInfo, [results, rootAst], rootAst);
    //recursiveFunctionAnalysis(ast, results, rootAst);

    //do calls
    var allFuncs = ccState.getProperty("userFunctionReturns");
    for (var i = 0; i < allFuncs.length; i++) {

        //uncalled function lines
        if (allFuncs[i].calls.length == 0) {
            for (var j = allFuncs[i].start; j <= allFuncs[i].end; j++) {
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
        if (allFuncs[i].calls.length > 1 && allFuncs[i].returns && results.codeFeatures.functions.manipulateValue < 2) {
            results.codeFeatures.functions.manipulateValue = 2;
        }
    }

    //do uses
    for (var p = 0; p < allFuncs.length; p++) {
        if (allFuncs[p].returns) {
            //orgline shoul dbe RETURN lineno.
            if (valueTrace(false, allFuncs[p].name, rootAst, [], rootAst, [], [], allFuncs[p].start)) {
                //do stuff
                results.codeFeatures.functions.manipulateValue = 3;
            }
            if (allFuncs[p].aliases.length > 0) {
                for (var j = 0; j < allFuncs[p].aliases.length; j++) {
                    if (valueTrace(false, allFuncs[p].aliases[j], rootAst, [], rootAst, [], [], allFuncs[p].start)) {
                        //do stuff
                        results.codeFeatures.functions.manipulateValue = 3;
                    }
                }
            }
        }
    }

    //console.log(ccState.getProperty("userFunctionReturns"));
}

//collects function info from a node
function collectFunctionInfo(node, args) {
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
            var functionObj = { name: node.name.v, returns: null, params: false, aliases: [], calls: [], start: lineNumber, end: lineNumber, returnVals: [], functionBody: node.body };

            functionObj.end = ccHelpers.getLastLine(node);

            var funcLines = ccState.getProperty("functionLines");

            for (var i = lineNumber; i <= functionObj.end; i++) {
                if (!funcLines.includes(i)) {
                    funcLines.push(i);
                }
            }

            //check for value return
            for (var i = 0; i < node.body.length; i++) {
                var ret = searchForReturn(node.body[i]);
                if (ret != null) {
                    functionObj.returns = true;
                    functionObj.returnVals.push(ret);
                    break;
                }
            }

            //check for parameters
            if (node.args.args != null && node.args.args.length > 0) {
                //check for parameters that are NOT NULL
                //these...should all be Name
                for (var i = 0; i < node.args.args.length; i++) {
                    if (node.args.args[i]._astname == "Name") {
                        var argName = node.args.args[i].id.v;
                        var lineDelims = [functionObj.start, functionObj.end];
                        //search for use of the value using valueTrace
                        if (valueTrace(true, argName, args[1], [], args[1], { line: 0 }, lineDelims, node.lineno)) {
                            functionObj.params = true;
                        }



                    }
                }

                //
            }

            var alreadyExists = false;
            var currentFuncs = ccState.getProperty("userFunctionReturns");
            for (var i = 0; i < currentFuncs.length; i++) {
                if (currentFuncs[i].name == functionObj.name) {
                    alreadyExists = true;
                    break;
                }
            }

            if (!alreadyExists) {
                ccState.getProperty("userFunctionReturns").push(functionObj);
            }


        }

        //or a function call?
        else if (node._astname == "Call") {


            var calledInsideLoop = false;
            var parentsList = [];
            getParentList(lineNumber, ccState.getProperty("codeStructure"), parentsList);
            for (var i = parentsList.length - 1; i >= 0; i--) {
                if (parentsList[i].id == "Loop") {
                    calledInsideLoop = true;
                    break;
                }
            }

            //add it to function calls directory in ccstate
            var calledName = ""
            if (node.func._astname == "Name") {
                //find name
                calledName = node.func.id.v;

            }
            else if (node.func._astname == "Attribute") {
                //console.log(node.func._astname);
                calledName = node.func.attr.v;
            }

            var callCurrentFuncs = ccState.getProperty("userFunctionReturns");

            if (calledName == "readInput") {
                args[0].codeFeatures.features.consoleInput = 1;
            }



            for (var i = 0; i < callCurrentFuncs.length; i++) {
                if (callCurrentFuncs[i].name == calledName || callCurrentFuncs[i].aliases.includes(calledName)) {
                    callCurrentFuncs[i].calls.push(lineNumber);
                    if (calledInsideLoop) {
                        //push a second time if it's in a loop
                        callCurrentFuncs[i].calls.push(lineNumber);
                    }

                    if (callCurrentFuncs[i].name == "readInput") {
                        args[0].codeFeatures.features.consoleInput = 1;
                    }

                    //if (ccState.getProperty("listFuncs").includes(callCurrentFuncs[i].name) && isListFunc) {
                    //    args[0].codeFeatures.features.listOps = 1;
                    //}
                    //if (ccState.getProperty("strFuncs").includes(callCurrentFuncs[i].name) && isStrFunc) {
                    //    args[0].codeFeatures.features.strOps = 1;
                    //}

                    break;
                }
            }

        }
        else if (node._astname == "Assign" && node.targets.length == 1) {

            //function alias tracking
            var currentFuncs = ccState.getProperty("userFunctionReturns");

            if (node.value._astname == "Name") {
                var assignedName = node.targets[0].id.v;
                var assignedAlias = node.value.id.v;
                var assignmentExists = false;
                for (var i = 0; i < currentFuncs.length; i++) {
                    if ((currentFuncs[i].name == assignedAlias && !currentFuncs[i].aliases.includes(assignedName)) || (currentFuncs[i].aliases.includes(assignedAlias) && !currentFuncs[i].aliases.includes(assignedName))) {
                        assignmentExists = true;
                        currentFuncs[i].aliases.push(assignedName);
                    }
                }

                var isRename = false;
                //is it a built in or api func?
                isRename = (ccState.apiFunctions.includes(assignedAlias) || ccState.builtInNames.includes(assignedAlias));


                if (!assignmentExists && isRename) {

                    ccState.getProperty("userFunctionReturns").push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0 });
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
    //var's find out what it is
    var firstArg = callNode.args[0];
    if (firstArg._astname == "List") {
        results.codeFeatures.makeBeat = 2;
    }
    else if (getTypeFromASTNode(firstArg) == "List") {
        results.codeFeatures.makeBeat = 2;
        results.codeFeatures.features.indexing = 1;
    }
}

function isBinopString(binOpNode) {
    if (binOpNode == null || binOpNode._astname != "BinOp") {
        return false;
    }

    var leftNode = binOpNode.left;
    var rightNode = binOpNode.right;
    var op = binOpNode.op.name;

    if (op != "Add") {
        return false;
    }

    var left = false;
    var right = false;

    if (leftNode._astname == "BinOp") {
        if (!isBinopString(leftNode)) {
            return false;
        }
        else {
            left = true;
        }
    }
    else {
        if (getTypeFromASTNode(leftNode) != "Str") {
            return false;
        }
        else {
            left = true;
        }
    }

    if (rightNode._astname == "BinOp") {
        if (!isBinopString(rightNode)) {
            return false;
        }
        else {
            right = true;
        }
    }
    else {
        if (getTypeFromASTNode(rightNode) != "Str") {
            return false;
        }
        else {
            right = true;
        }
    }

    return (left && right);
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
                var ret = searchForReturn(node);
                if (ret != null) {
                    return ret;
                }
            }
            return null;
        } else if (astNode != null && (astNode[0] != null && Object.keys(astNode[0]) != null)) {
            var astNodeKeys = Object.keys(astNode);
            for (var r = 0; r < astNodeKeys.length; r++) {
                var node = astNode[astNodeKeys[r]];
                var ret = searchForReturn(node);
                if (ret != null) {
                    return ret;
                }
            }
            return null;
        }
    }

}

//recu
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

        var assignedInsideLoop = false;
        var loopLine = -1;
        var parentsList = [];
        getParentList(lineNumber, ccState.getProperty("codeStructure"), parentsList);
        for (var i = parentsList.length - 1; i >= 0; i--) {
            if (parentsList[i].id == "Loop") {
                assignedInsideLoop = true;
                loopLine = parentsList[i].startline;
                break;
            }
        }

        if (node._astname == "Assign" && node.targets.length == 1) {
            //does it already exist in the directory
            if ("id" in node.targets[0] && "v" in node.targets[0].id) {
                var assignedName = node.targets[0].id.v;

                var varObject = { name: assignedName, assignments: [] };
                var alreadyExists = false;

                var currentVars = ccState.getProperty("allVariables");
                for (var i = 0; i < currentVars.length; i++) {
                    if (currentVars[i].name == assignedName) {
                        varObject = currentVars[i];
                        alreadyExists = true;
                        break;
                    }
                }




                if (assignedInsideLoop) {

                    varObject.assignments.push({ line: loopLine, value: node.value });
                    varObject.assignments.push({ line: loopLine, value: node.value });
                    //we do this twice on purpose
                }
                else {


                    varObject.assignments.push({ line: lineNumber, value: node.value });
                }


                //function alias tracking
                var currentFuncs = ccState.getProperty("userFunctionReturns");

                if (node.value._astname == "Name") {

                    var assignedAlias = node.value.id.v;
                    var assignmentExists = false;
                    for (var i = 0; i < currentFuncs.length; i++) {
                        if ((currentFuncs[i].name == assignedAlias && !currentFuncs[i].aliases.includes(assignedName)) || (currentFuncs[i].aliases.includes(assignedAlias) && !currentFuncs[i].aliases.includes(assignedName))) {
                            assignmentExists = true;
                            currentFuncs[i].aliases.push(assignedName);
                        }
                    }

                    var isRename = false;
                    //is it a built in or api func?
                    isRename = (ccState.apiFunctions.includes(assignedAlias) || ccState.builtInNames.includes(assignedAlias));


                    if (!assignmentExists && isRename) {

                        ccState.getProperty("userFunctionReturns").push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0 });
                    }
                }

                if (!alreadyExists) {
                    ccState.getProperty("allVariables").push(varObject);
                }

            }

        }

        if (node._astname == "AugAssign" && node.target._astname == "Name") {
            var assignedName = node.target.id.v;

            var varObject = { name: assignedName, assignments: [] };
            var alreadyExists = false;

            var currentVars = ccState.getProperty("allVariables");
            for (var i = 0; i < currentVars.length; i++) {
                if (currentVars[i].name == assignedName) {
                    varObject = currentVars[i];
                    alreadyExists = true;
                    break;
                }
            }

            if (assignedInsideLoop) {

                varObject.assignments.push({ line: loopLine, value: node.value });
                varObject.assignments.push({ line: loopLine, value: node.value });
                //we do this twice on purpose
            }
            else {
                varObject.assignments.push({ line: lineNumber, value: node.value });
            }


            if (!alreadyExists) {
                ccState.getProperty("allVariables").push(varObject);
            }

        }

        if (node._astname == "For") {
            //check and add the iterator
            var assignedName = node.target.id.v;
            var varObject = { name: assignedName, assignments: [] };
            var alreadyExists = false;

            var currentVars = ccState.getProperty("allVariables");
            for (var i = 0; i < currentVars.length; i++) {
                if (currentVars[i].name == assignedName) {
                    varObject = currentVars[i];
                    alreadyExists = true;
                    break;
                }
            }


            //this is done twice intentionally
            varObject.assignments.push({ line: lineNumber, value: node });
            varObject.assignments.push({ line: lineNumber, value: node });


            if (!alreadyExists) {
                ccState.getProperty("allVariables").push(varObject);
            }
        }

        if (node._astname == "JSFor") {
            if ("init" in node) {
                var assignedName = node.init.targets[0].id.v;
                var varObject = { name: assignedName, assignments: [] };
                var alreadyExists = false;

                var currentVars = ccState.getProperty("allVariables");
                for (var i = 0; i < currentVars.length; i++) {
                    if (currentVars[i].name == assignedName) {
                        varObject = currentVars[i];
                        alreadyExists = true;
                        break;
                    }
                }


                //this is done twice intentionally
                varObject.assignments.push({ line: lineNumber, value: node });
                varObject.assignments.push({ line: lineNumber, value: node });


                if (!alreadyExists) {
                    ccState.getProperty("allVariables").push(varObject);
                }
            }
        }
    }
}



function reverseValueTrace(isVariable, name, lineNo) {
    if (isVariable) {
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNo)) {


            var latestAssignment = null;

            var thisVar = null;
            var varList = ccState.getProperty("allVariables");
            for (var i = 0; i < varList.length; i++) {
                if (varList[i].name == name) {
                    thisVar = varList[i];
                }
            }
            if (thisVar == null) {
                return "";
            }

            //get most recent outside-of-function assignment (or inside-this-function assignment)
            var funcLines = ccState.getProperty("functionLines");
            var funcObjs = ccState.getProperty("userFunctionReturns");
            var highestLine = 0;
            if (funcLines.includes(lineNo)) {
                //what function are we in
                var startLine = 0;
                var endLine = 0;
                for (var i = 0; i < funcObjs.length; i++) {
                    if (funcObjs[i].start < lineNo && funcObjs[i].end >= lineNo) {
                        startLine = funcObjs[i].start;
                        endLine = funcObjs[i].end;
                        break;
                    }
                }

                for (var i = 0; i < thisVar.assignments.length; i++) {
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
                    var calledName = "";
                    if (node.func._astname == "Name") {
                        //find name
                        calledName = node.func.id.v;
                        //is it a built-in func that returns a str or list? check that first
                        if (ccState.builtInNames.includes(calledName)) {
                            //lookup and return
                            for (var j = 0; j < ccState.builtInReturns.length; j++) {
                                if (ccState.builtInReturns[j].name == calledName) {
                                    return ccState.builtInReturns[j].returns;
                                }
                            }
                            return "";
                        }
                        else {
                            //assume it's a user function.
                            for (var j = 0; j < funcObjs.length; j++) {
                                if ((funcObjs[j].name == calledName || funcObjs[j].aliases.includes(calledName)) && funcObj[j].returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj[j].returnVals[0]);
                                }
                            }
                        }

                    }
                    else if (node.func._astname == "Attribute") {
                        //console.log(node.func._astname);
                        calledName = node.func.attr.v;
                        //TODO this is probably a string or list op, so var's maybe take a look into what it's being performed on
                        //str, list,or var. if var or func return do a reverse variable search, other3wise return
                        if (node.func.value._astname == "Str") {
                            return "Str";
                        }
                        if (node.func.value._astname == "List") {
                            return "List";
                        }

                        if (node.func.value._astname == "Name") {

                            return reverseValueTrace(true, node.func.value.id.v, node.lineno);
                        }
                        if (node.func.value._astname == "Call") {
                            //find the function name and do a recursive call on it
                            var funcName = "";
                            if (node.func.value.func._astname == "Attribute") {
                                funcName = node.func.value.func.attr.v;
                                return reverseValueTrace(false, funcName, node.lineno);
                            }
                            else if (node.func.value.func._astname == "Name") {
                                funcName = node.func.value.func.id.v;
                                return reverseValueTrace(false, funcName, node.lineno);
                            }
                            else {
                                return "";
                            }
                        }
                        return "";
                    }

                }
                else {
                    //return the type
                    return getTypeFromASTNode(latestAssignment.value);

                }

            }
            else {
                //then we're OUTSIDE a function.
                //gather up all of the assignments to this point NOT in a function, and get the most recent one there
                for (var i = 0; i < thisVar.assignments.length; i++) {
                    if (thisVar.assignments[i].line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(thisVar.assignments[i].line) && !funcLines.includes(thisVar.assignments[i].line)) {
                        //then it's valid
                        if (thisVar.assignments[i].line > highestLine) {
                            latestAssignment = Object.assign({}, thisVar.assignments[i]);
                            highestLine = latestAssignment.line;
                        }
                    }
                }

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
                    var calledName = "";
                    if (latestAssignment.value.func._astname == "Name") {
                        //find name
                        calledName = latestAssignment.value.func.id.v;
                        //is it a built-in func that returns a str or list? check that first
                        if (ccState.builtInNames.includes(calledName)) {
                            //lookup and return
                            for (var j = 0; j < ccState.builtInReturns.length; j++) {
                                if (ccState.builtInReturns[j].name == calledName) {
                                    return ccState.builtInReturns[j].returns;
                                }
                            }
                            return "";
                        }
                        else {

                            //assume it's a user function.
                            for (var j = 0; j < funcObjs.length; j++) {
                                if ((funcObjs[j].name == calledName || funcObjs[j].aliases.includes(calledName)) && funcObj[j].returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj[j].returnVals[0]);
                                }
                            }
                        }

                    }
                    else if (latestAssignment.value.func._astname == "Attribute") {
                        //console.log(latestAssignment.value.func._astname);
                        calledName = latestAssignment.value.func.attr.v;
                        //TODO this is probably a string or list op, so var's maybe take a look into what it's being performed on
                        //str, list,or var. if var or func return do a reverse variable search, other3wise return
                        if (latestAssignment.value.func.value._astname == "Str") {
                            return "Str";
                        }
                        if (latestAssignment.value.func.value._astname == "List") {
                            return "List";
                        }

                        if (latestAssignment.value.func.value._astname == "Name") {

                            return reverseValueTrace(true, latestAssignment.value.func.value.id.v, latestAssignment.value.lineno);
                        }
                        if (latestAssignment.value.func.value._astname == "Call") {
                            //find the function name and do a recursive call on it
                            var funcName = "";
                            if (latestAssignment.value.func.value.func._astname == "Attribute") {
                                funcName = latestAssignment.value.func.value.func.attr.v;
                                return reverseValueTrace(false, funcName, latestAssignment.value.lineno);
                            }
                            else if (latestAssignment.value.func.value.func._astname == "Name") {
                                funcName = latestAssignment.value.func.value.func.id.v;
                                return reverseValueTrace(false, funcName, latestAssignment.value.lineno);
                            }
                            else {
                                return "";
                            }
                        }
                        return "";
                    }

                }
                else {
                    //return the type
                    return getTypeFromASTNode(latestAssignment.value);

                }

            }
        }

        return "";
    }
    else {
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNo)) {

            //we get the return value of the function. this is mostly not super hard.
            //first - is it built in?
            if (ccState.builtInNames.includes(name)) {
                for (var i = 0; i < ccState.builtInReturns.length; i++) {
                    if (ccState.builtInReturns[i].name == name) {
                        return ccState.builtInReturns[i].returns;
                    }
                }
            }
            else {
                var userFuncs = ccState.getProperty("userFunctionReturns");
                //find it in user defined functions
                var funcObj = null;
                for (var i = 0; i < userFuncs.length; i++) {
                    if (userFuncs[i].name == name) {
                        funcObj = userFuncs[i];
                        break;
                    }
                }

                if (funcObj == null || funcObj.returnVals.length == 0) {
                    return "";
                }
                //if we have a function object, find its return value
                return getTypeFromASTNode(funcObj.returnVals[0]);
            }
        }

    }
    return "";

}

function getTypeFromASTNode(node) {

    var autoReturns = ["List", "Str"];
    if (autoReturns.includes(node._astname)) {
        return node._astname;
    }
    else if (node._astname == "Num") {

        if (Object.getPrototypeOf(node.n)["tp$name"] == "int") {
            return "Int";
        }
        else {
            return "Float";
        }
        //return "Num";
    }
    else if (node._astname == "Call") {
        //get name
        var funcName = "";
        if ("attr" in node.func) {
            funcName = node.func.attr.v;
        }
        else if ("id" in node.func) {
            funcName = node.func.id.v;
        }
        else {
            return "";
        }
        return reverseValueTrace(false, funcName, node.lineno);
    }
    else if (node._astname == "Name") {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool";
        }

        //either a function alias or var.
        var funcs = ccState.getProperty("userFunctionReturns");
        for (var i = 0; i < funcs.length; i++) {
            if (funcs[i].name == node.id.v || funcs[i].aliases.includes(node.id.v)) {
                return "Func";
            }
        }
        return reverseValueTrace(true, node.id.v, node.lineno);
    }
    return "";
}

function valueTrace(isVariable, name, ast, parentNodes, rootAst, lineVar, useLine = [], origLine = -1) { // = []
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            //parent node tracing
            var newParents = parentNodes.slice(0);
            newParents.push([node, astKeys[r]]);
            //is the node a value thingy?
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, -1, origLine) == true) {
                return true;
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) == true) {
                return true;
            }
        }
    }
    else if (ast != null && (ast._astname != null || (ast[0] != null && ast[0]._astname != null)) && Object.keys(ast) != null) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];

            var newParents = parentNodes.slice(0);
            newParents.push([node, astKeys[r]]);
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, -1, origLine) == true) {
                return true;
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) == true) {
                return true;
            }
        }
    }
    else if (ast != null && ast._astname != null && ast._astname == "Expr") {
        var newParents = parentNodes.slice(0);
        newParents.push([ast.value, "Expr"]);
        if (findValueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, -1, origLine) == true) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, origLine) == true) {
            return true;
        }
    }

    //nodes that need extra testing
    if (ast != null && ast._astname != null && "test" in ast) {
        var newParents = parentNodes.slice(0);
        newParents.push([ast.test, "test"]);
        if (findValueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, -1, origLine) == true) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, origLine) == true) {
            return true;
        }
    }

    if (ast != null && ast._astname != null && "iter" in ast) {
        var newParents = parentNodes.slice(0);
        newParents.push([ast.iter, "iter"]);
        if (findValueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, -1, origLine) == true) {
            return true;
        }
        if (valueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, origLine) == true) {
            return true;
        }
    }

    return false;

}


function findValueTrace(isVariable, name, node, parentNodes, rootAst, lineVar, useLine, subscriptValue = -1, origLine = -1, tracedNodes = []) { //



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
        var found = false;
        var assignedFunc = false;

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

                var calledName = node.func.id.v;
                if (calledName == name) {
                    found = true;
                }
                else {
                    //check if it's an alias
                    var currentFuncs = ccState.getProperty("userFunctionReturns");
                    for (var i = 0; i < currentFuncs.length; i++) {
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

        //if it's a subscript of a name, replace it with its parent node.
        if (parentNodes.length > 1 && parentNodes[parentNodes.length - 2][0]._astname == "Subscript") {
            //remove last item in nodeParents
            parentNodes = parentNodes.slice(0, parentNodes.length - 1);
        }
        if (parentNodes.length > 1) {
            while (parentNodes[parentNodes.length - 2][0]._astname == "BinOp" || parentNodes[parentNodes.length - 2][0]._astname == "Compare" || (parentNodes.length > 2 && parentNodes[parentNodes.length - 3][0]._astname == "BoolOp")) {
                if (parentNodes[parentNodes.length - 2][0]._astname == "BinOp" || parentNodes[parentNodes.length - 2][0]._astname == "Compare") {
                    parentNodes = parentNodes.slice(0, parentNodes.length - 1);
                }
                else {
                    parentNodes = parentNodes.slice(0, parentNodes.length - 2);
                }
            }
        }

        //if it's in a binop or boolop, replace it with its parent node too.

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


        // console.log(name, nodeParent, secondParent);


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
        else {

            //check parents
            for (var i = parentNodes.length - 1; i >= 0; i--) {
                if (parentNodes[i][1] == "args") {
                    isUse = true;
                    break;
                }
                else if (parentNodes[i][1] == "test") {
                    isUse = true;
                    break;
                }
                else if (parentNodes[i][1] == "iter") {
                    isUse = true;
                    break;
                }
            }


        }



        var isWithin = useLine.length == 0;

        if (useLine.length > 0 && lineNumber >= useLine[0] && lineNumber <= useLine[1]) {
            isWithin = true;
        }

        if (isUse && isWithin) {
            if (lineVar != null) {
                lineVar.line = lineNumber;
            }
            return true;
        }

        //2. is it a reassignment?
        var isAssigned = false;
        var assignedName = "";

        if (nodeParent[0]._astname == "Assign" && thisNode[1] == "value") {
            var assignedProper = false;

            //assignedproper is based on parent node in codestructure

            var assignmentDepthAndParent = ccHelpers.locateDepthAndParent(nodeParent[0].lineno, ccState.getProperty("codeStructure"), { count: 0 });
            //find original use depth and parent, then compare.
            // useLine    is the use line number
            var useDepthAndParent = ccHelpers.locateDepthAndParent(origLine, ccState.getProperty("codeStructure"), { count: 0 });

            // [-1, {}] depth # and parent structure node.
            if (assignmentDepthAndParent[0] > useDepthAndParent[0]) {
                assignedProper = true;
            }
            else if (assignmentDepthAndParent[0] == useDepthAndParent[0] && assignmentDepthAndParent[1].startline == useDepthAndParent[1].startline && assignmentDepthAndParent[1].endline == useDepthAndParent[1].endline) {
                assignedProper = true;
            }
            if (assignedProper == true) {
                isAssigned = true;
                if (nodeParent[0].targets[0]._astname == "Name") {
                    assignedName = nodeParent[0].targets[0].id.v;
                }
            }
        }

        //2a. if so, check the root ast for THAT name
        if (isAssigned == true) {
            var varBool = isVariable;

            //if a function output is assigned to a variable, change isVariable to true
            if (!isVariable && thisNode[0]._astname == "Call") {
                varBool = true;
            }

            console.log(nodeParent[0].lineno);
            return valueTrace(varBool, assignedName, rootAst, [], rootAst, lineVar, useLine, nodeParent[0].lineno, tracedNodes);
        }
    }
    //general catch-all if none of the above is true
    return false;
}


//takes all the collected info and generates the relevant results
function doComplexityOutput(results, rootAst) {

    //do loop nesting check
    var finalLoops = ccState.getProperty("loopLocations").slice(0);
    finalLoops.sort(sortLoopValues);
    for (var i = 0; i < finalLoops.length - 1; i++) {
        for (var j = i + 1; j < finalLoops.length; j++) {
            if (finalLoops[i][0] < finalLoops[j][0] && finalLoops[i][1] >= finalLoops[j][1]) {
                //thgese loops are nested
                results.codeFeatures.iteration.nesting = 1;
                break;
            }
        }
    }

    //do variable scoring
    var variableList = ccState.getProperty("allVariables");
    for (var i = 0; i < variableList.length; i++) {
        var lineNoObj = { line: 0 };
        if (valueTrace(true, variableList[i].name, rootAst, [], rootAst, lineNoObj, [], variableList[i].assignments[0].line)) {
            if (!ccState.getProperty("uncalledFunctionLines").includes(lineNoObj.line)) {
                if (results.codeFeatures.variables < 1) {
                    results.codeFeatures.variables = 1;
                }
                var lineNo = lineNoObj.line;
                var loopLines = ccState.getProperty("loopLocations");

                //what about multiple assignments
                if (variableList[i].assignments.length > 0) {
                    //get line numbers of all assignments
                    var lineAssignments = [];
                    for (var j = 0; j < variableList[i].assignments.length; j++) {
                        lineAssignments.push(variableList[i].assignments[j].line);
                    }

                    var counter = 0;
                    for (var k = 0; k < lineAssignments.length; k++) {
                        if (lineAssignments[k] < lineNo) {
                            counter += 1;

                            //check loops too
                            for (var m = 0; m < loopLines.length; m++) {
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

    var structure = { id: "body", children: [], startline: 0, endline: ccHelpers.getLastLine(rootAst.body) };
    for (var i = 0; i < rootAst.body.length; i++) {
        structure.children.push(buildStructuralRepresentation(rootAst.body[i], structure, rootAst));
    }

    var depthObj = { depth: 0 };

    //do structural depth
    countStructuralDepth(structure, depthObj, null);

    results.depth = depthObj.depth;
    results.codeStructure = structure;

    if (results.depth > 3) {
        results.depth = 3;
    }

}

function sortLoopValues(a, b) {
    var scoreA = a[1] - a[0];
    var scoreB = b[1] - b[0];


    return scoreB - scoreA;
}

function countStructuralDepth(structureObj, depthCountObj, parentObj) {
    if (parentObj == null) {
        structureObj["depth"] = 0;
    }
    else {
        structureObj["depth"] = parentObj.depth + 1;
        if (structureObj.depth > depthCountObj.depth) {
            depthCountObj.depth = structureObj.depth;
        }
    }
    if (structureObj.children != null && structureObj.children.length > 0) {
        for (var i = 0; i < structureObj.children.length; i++) {
            countStructuralDepth(structureObj.children[i], depthCountObj, structureObj);
        }
    }

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
        if (!ccState.getProperty('uncalledFunctionLines').includes(lineNumber + 1)) {

            if (node._astname === "For") {

                //mark loop
                var firstLine = lineNumber;
                var lastLine = ccHelpers.getLastLine(node);

                var loopRange = false;
                ccState.getProperty("loopLocations").push([firstLine, lastLine]);

                //is the iterator range()?
                if (node.iter._astname == "Call") {
                    //is the iter call to range()
                    if (node.iter.func._astname == "Name") {
                        var iterFuncName = node.iter.func.id.v;
                        var isRange = iterFuncName == "range";

                        //check for renames (unlikely, but we should do it)
                        if (!isRange) {
                            var currentFuncs = ccState.getProperty("userFunctionReturns");
                            for (var i = 0; i < currentFuncs.length; i++) {
                                if (currentFuncs[i].aliases.includes(iterFuncName) && currentFuncs[i].name == "range") {
                                    isRange = true;
                                    break;
                                }
                            }
                        }
                        loopRange = isRange;
                        //check number of args
                        var numArgs = node.iter.args.length;

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
                var firstLine = lineNumber;
                var lastLine = ccHelpers.getLastLine(node);
                results.codeFeatures.iteration.forLoopsJS = 1;
                ccState.getProperty("loopLocations").push([firstLine, lastLine]);
            }
            else if (node._astname === "If") {
                if (results.codeFeatures.conditionals.conditionals < 1) {
                    results.codeFeatures.conditionals.conditionals = 1;
                }
                if ("orelse" in node && node.orelse.length > 0) {
                    if (results.codeFeatures.conditionals.conditionals < 2) {
                        results.codeFeatures.conditionals.conditionals = 2;
                    }
                    if ("orelse" in node.orelse[0] && node.orelse[0].orelse.length > 0 && results.codeFeatures.conditionals.conditionals < 3) {
                        results.codeFeatures.conditionals.conditionals = 3;
                    }

                    recursiveAnalyzeAST(node.orelse, results);
                }

                var conditionalsList = [];
                analyzeConditionalTest(node.test, conditionalsList);
                for (var k = 0; k < conditionalsList.length; k++) {
                    if (!results.codeFeatures.conditionals.usedInConditionals.includes(conditionalsList[k])) {
                        results.codeFeatures.conditionals.usedInConditionals.push(conditionalsList[k]);
                    }
                }
            }
            else if (node._astname === "UnaryOp") {
                recursiveAnalyzeAST(node.operand, results);
            }
            else if (node._astname === "Subscript") {
                results.codeFeatures.features.indexing = 1;
            }
            else if (node._astname === "Compare") {
                results.codeFeatures.features.comparisons = 1;
            }
            else if (node._astname === "BinOp") {
                results.codeFeatures.features.binOps = 1;
                if (isBinopString(node)) {
                    results.codeFeatures.features.strOps = 1;
                }
            }
            else if (node._astname === "While") {
                results.codeFeatures.iteration.whileLoops = 1;

                //mark loop
                var firstLine = lineNumber;
                var lastLine = ccHelpers.getLastLine(node);

                ccState.getProperty("loopLocations").push([firstLine, lastLine]);
            }
            else if (node._astname == "Call") {

                var calledName = "";
                var calledOn = "";
                if (node.func._astname == "Name") {
                    //find name
                    calledName = node.func.id.v;
                    if (node.args.length > 0) {
                        calledOn = ccHelpers.estimateDataType(node.args[0]);
                    }

                }
                else if (node.func._astname == "Attribute") {
                    //console.log(node.func._astname);
                    calledName = node.func.attr.v;
                    if ("value" in node.func) {
                        calledOn = ccHelpers.estimateDataType(node.func.value);
                    }
                }
                //list and strop calls
                var isListFunc = false;
                var isStrFunc = false;

                if (ccState.getProperty("listFuncs").includes(calledName)) {

                    if (calledOn == "List") {
                        isListFunc = true;
                    }

                    if (isListFunc) {
                        results.codeFeatures.features.listOps = 1;
                    }
                }
                if (ccState.getProperty("strFuncs").includes(calledName)) {

                    if (calledOn == "Str") {
                        isListFunc = true;
                    }


                    if (isStrFunc) {
                        results.codeFeatures.features.strOps = 1;
                    }
                }



                if ("id" in node.func) {
                    if (node.func.id.v == "makeBeat") {
                        markMakeBeat(node, results);
                    }
                    else {
                        //double check for aliases
                        var funcs = ccState.getProperty("userFunctionReturns");
                        for (var i = 0; i < funcs.length; i++) {
                            if (funcs[i].name == "makeBeat" && funcs[i].aliases.includes(node.func.id.v)) {
                                markMakeBeat(node, results);
                            }
                        }
                    }
                }
            }


        }

    }
}

// Recursively analyze a python abstract syntax tree.
function recursiveAnalyzeAST(ast, results) {
    recursiveCallOnNodes(analyzeASTNode, results, ast);
    return results;
}

function appendOrElses(node, orElseList) {
    if (node != null && 'orelse' in node && node.orelse.length > 0) {
        if ('body' in node.orelse[0]) {
            orElseList.push(node.orelse[0].body);
        }
        else if (!('orelse' in node.orelse[0])) {
            orElseList.push(node.orelse);
        }
        if ('orelse' in node.orelse[0]) {
            appendOrElses(node.orelse[0], orElseList);
        }

    }

    return;
}

function buildStructuralRepresentation(nodeToUse, parentNode, ast) {
    var node = nodeToUse;
    if (nodeToUse._astname == "Expr") {
        node = nodeToUse.value;
    }

    var returnObject = { id: "", children: [], startline: node.lineno, endline: ccHelpers.getLastLine(node), parent: parentNode };
    if (node._astname == "Call") {

        //if the parent is the definition of a function with the same name, handle the recursion. if this goes ahead recursively, the stack WILL explode.
        var isRecursive = false;

        var firstParent = parentNode;
        var nameObj = { name: "", start: -1, end: -1 };
        var whileCount = 0;
        while ("parent" in firstParent) {
            if (firstParent.id == "FunctionDef") {
                //now we figure out the name of the function
                var defLine = firstParent.startline;

                recursiveCallOnNodes(findFunctionDefName, [defLine, nameObj], ast);
            }
            else if (firstParent.id == "functionCall") {
                var defLine = firstParent.startline;

                recursiveCallOnNodes(findFunctionCallName, [defLine, nameObj], ast);
            }
            firstParent = firstParent.parent;


            if (nameObj.name != "" && node.lineno >= nameObj.start && node.lineno <= nameObj.end) {
                isRecursive = true;
                break;
            }

            //emergency break so as not to interrupt user experience
            whileCount++;
            if (whileCount > 100) {
                break;
            }
        }

        if (isRecursive) {
            //handle
            if (node.func._astname != "Name") {
                returnObject.id = node._astname;
                return returnObject;
            }
            var funcObj = null;
            var functionList = ccState.getProperty("userFunctionReturns");
            for (var i = 0; i < functionList.length; i++) {
                if (functionList[i].name == node.func.id.v || functionList[i].aliases.includes(node.func.id.v)) {
                    funcObj = functionList[i];
                    break;
                }
            }
            if (funcObj == null) {
                returnObject.id = node._astname;
                return returnObject;
            }
            returnObject.id = "functionCall";
            //dummy node for accurate depth count
            returnObject.children.push({ id: "functionCall", children: [], startline: node.lineno, endline: ccHelpers.getLastLine(node), parent: returnObject });

        }
        else {
            //find the function
            if (node.func._astname != "Name") {
                returnObject.id = node._astname;
                return returnObject;
            }
            var funcObj = null;
            var functionList = ccState.getProperty("userFunctionReturns");
            for (var i = 0; i < functionList.length; i++) {
                if (functionList[i].name == node.func.id.v || functionList[i].aliases.includes(node.func.id.v)) {
                    funcObj = functionList[i];
                    break;
                }
            }
            if (funcObj == null) {
                returnObject.id = node._astname;
                return returnObject;
            }

            returnObject.id = "functionCall";

            for (var i = 0; i < funcObj.functionBody.length; i++) {
                returnObject.children.push(buildStructuralRepresentation(funcObj.functionBody[i], returnObject, ast));
            }
        }

    }
    else if (node._astname == "If") {
        //returnObject.id = "If";
        var ifNode = { id: "If", children: [] };

        for (var i = 0; i < node.body.length; i++) {
            ifNode.children.push(buildStructuralRepresentation(node.body[i], ifNode, ast));
        }

        //parentNode.children.push(ifNode);

        var orElses = [];


        appendOrElses(node, orElses);

        if (orElses.length > 0) {
            parentNode.children.push(ifNode);
        }

        for (var p = 0; p < orElses.length - 1; p++) {
            var thisOrElse = { id: "Else", children: [] };
            for (var j = 0; j < orElses[p].length; j++) {
                thisOrElse.children.push(buildStructuralRepresentation(orElses[p][j], thisOrElse, ast));
            }
            parentNode.children.push(Object.assign({}, thisOrElse));
        }

        //do and return last orElse
        if (orElses.length > 0) {
            var lastOrElse = { id: "Else", children: [] };
            for (var j = 0; j < orElses[orElses.length - 1].length; j++) {
                lastOrElse.children.push(buildStructuralRepresentation(orElses[orElses.length - 1][j], lastOrElse, ast));
            }

            return lastOrElse;
        }
        else {
            return ifNode;
        }
    }
    else if (node._astname == "For" || node._astname == "JSFor" || node._astname == "While") {
        returnObject.id = "Loop";

        for (var i = 0; i < node.body.length; i++) {
            returnObject.children.push(buildStructuralRepresentation(node.body[i], returnObject, ast));
        }
    }
    else {
        returnObject.id = node._astname;
        if ('body' in node) {
            for (var i = 0; i < node.body.length; i++) {
                returnObject.children.push(buildStructuralRepresentation(node.body[i], returnObject, ast));
            }
        }
    }

    return returnObject;
}

function findFunctionDefName(node, args) {
    var lineNumber = args[0];
    if (node != null && node._astname != null) {
        //args[1] has property "name" which is how name val is returned
        if (node._astname == "FunctionDef" && node.lineno == lineNumber) {
            args[1].name = node.name.v;
            args[1].start = node.lineno;
            args[1].end = ccHelpers.getLastLine(node);
            return;
        }
    }
}

function getParentList(lineno, parentNode, parentsList) {
    //recurse through ccState.getProperty("codeStructure"), drill down to thing, return

    //first....is it a child of the parent node?
    if (parentNode.startline <= lineno && parentNode.endline >= lineno) {
        parentsList.push(Object.assign({}, parentNode));
        //then, check children.
        var childNode = null;
        if (parentNode.children.length > 0) {
            for (var i = 0; i < parentNode.children.length; i++) {
                if (parentNode.children[i].startline <= lineno && parentNode.children[i].endline >= lineno) {
                    childNode = parentNode.children[i];
                    break;
                }
            }
        }

        if (childNode != null) {
            getParentList(lineno, childNode, parentsList);
        }
    }

}

function findFunctionCallName(node, args) {
    var lineNumber = args[0];
    if (node != null && node._astname != null) {
        //args[1] has property "name" which is how name val is returned
        if (node._astname == "Call" && node.lineno == lineNumber && 'id' in node.func) {
            args[1].name = node.func.id.v;
            args[1].start = node.lineno;
            args[1].end = ccHelpers.getLastLine(node);
            return;
        }
    }
}

//handles sequential calls to complexity passes and creation of output
export function doAnalysis(ast, results) {
    var codeStruct = { id: "body", children: [], startline: 0, endline: ccHelpers.getLastLine(ast) };
    for (var i = 0; i < ast.body.length; i++) {
        codeStruct.children.push(buildStructuralRepresentation(ast.body[i], codeStruct, ast));
    }

    ccState.setProperty("codeStructure", codeStruct);

    functionPass(ast, results, ast);
    recursiveCallOnNodes(collectVariableInfo, [], ast);
    recursiveAnalyzeAST(ast, results);
    doComplexityOutput(results, ast);
}