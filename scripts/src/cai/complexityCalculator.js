import * as complexityCalculatorState from './complexityCalculatorState';
import * as complexityCalculatorHelperFunctions from './complexityCalculatorHelperFunctions';

import { PY_LIST_FUNCS, PY_STR_FUNCS, PY_CREATE_LIST_FUNCS, PY_CREATE_STR_FUNCS, 
            JS_BUILT_IN_OBJECTS, JS_LIST_FUNCS, JS_STR_FUNCS, JS_STR_LIST_OVERLAP } from './complexityCalculatorState';

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

//variable init
var sampleLines = complexityCalculatorState.sampleCode.slice(0);

export function getApiCalls() {
    return complexityCalculatorState.getProperty("apiCalls");
}

// Translate recorded integer values from the results into human-readable English
function translateIntegerValues(resultsObj) {
    var translatedIntegerValues = {
        0: { "": "Does not Use" },
        1: { "": "Uses" },
        2: {
            "consoleInput": "Takes Console Input Originally",
            "": "Uses Original"
        },
        3: {
            "forLoops": () => complexityCalculatorState.getProperty('isJavascript') ? "Uses Originally with Two Arguments" : "Uses Originally With Range Min/Max",
            "conditionals": "Uses Originally to Follow Multiple Code Paths",
            "userFunc": "Uses and Calls Originally",
            "consoleInput": "Takes Input Originally and Uses For Purpose",
            "": "Uses Originally For Purpose"
        },
        4: {
            "forLoops": () => complexityCalculatorState.getProperty('isJavascript') ? "Uses Originally with Three Arguments" : "Uses Originally With Range Min/Max and Increment",
            "variables": "Uses Originally And Transforms Value",
            "strings": "Uses And Indexes Originally For Purpose OR Uses Originally And Iterates Upon",
            "lists": "Uses And Indexes Originally For Purpose OR Uses Originally And Iterates Upon"
        },
        5: { "forLoops": "Uses Original Nested Loops" }
    }
    Object.keys(resultsObj).forEach(function (key) {
        var translatorDict = translatedIntegerValues[resultsObj[key]];
        var tempKey = key;
        if (!Object.keys(translatorDict).includes(key)) { tempKey = ""; }
        resultsObj[key] = translatorDict[tempKey];
        if (typeof (resultsObj[key]) === "function") { resultsObj[key] = resultsObj[key](); }
    });
}

// Fills complexityCalculatorState.getProperty("complexityCalculatorState.getProperty('userFunctionParameters')") list
export function evaluateUserFunctionParameters(ast, results) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            checkForFunctions(node, results);
            evaluateUserFunctionParameters(node, results);
        }
    }
    else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            checkForFunctions(node, results);
            evaluateUserFunctionParameters(node, results);
        }
    }
}

// Fills complexityCalculatorState.getProperty('allVariables') list
export function gatherAllVariables(ast) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            markVariable(node);
            gatherAllVariables(node);
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            markVariable(node);
            gatherAllVariables(node);
        }
    }
}

// Adds a variable to complexityCalculatorState.getProperty('allVariables') along with its contents if a node includes a variable assignment.
// Also marks bourdaries of for and while loops for use later
function markVariable(node) {
    var fakeBinOp = null;
    var lineNumber = 0;
    //Javascript for loops can include both variable declarations and updates (augassign)
    if (node != null && node._astname != null && node._astname === "JSFor") {
        //mark the loop bounds for later labeling of variable value changes.
        var startLine = node.lineno;
        var endLine = complexityCalculatorHelperFunctions.getLastLine(node);
        complexityCalculatorState.getProperty('loopLocations').push([startLine, endLine]);
        //check the "init" component, and mark variable there if found
        if (node.init != null) {
            markVariable(node.init);
        }
        //ditto with the "update" component, which is often an augAssign
        if (node.update != null && node.update._astname === "AugAssign") {
            markVariable(node.update);
        }
    }
    //While loops just need to have their bounds marked
    if (node != null && node._astname != null && node._astname === "While") {
        complexityCalculatorState.getProperty('loopLocations').push([node.lineno, complexityCalculatorHelperFunctions.getLastLine(node)]);
    }
    //Python for loops. Also, JS foreach loops get sent here.
    if (node != null && node._astname != null && node._astname === "For") {
        //mark the loop bounds for later labeling of variable value changes.
        var startLine = node.lineno;
        var endLine = complexityCalculatorHelperFunctions.getLastLine(node);
        complexityCalculatorState.getProperty('loopLocations').push([startLine, endLine]);
        var nodeIter = node.iter;
        if (nodeIter != null) {
            if (node.target._astname === "Name") {
                if (complexityCalculatorHelperFunctions.getVariableObject(node.target.id.v) == null) {
                    //if it's not already stored in a var, we create a new variable object
                    //get the variable's name
                    var varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.target);
                    if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                        return;
                    }
                    var targetName = varTarget.id.v;
                    lineNumber = 0;
                    var modFunc = [];
                    if (node.lineno != null) {
                        lineNumber = node.lineno;
                        complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
                    }
                    else {
                        lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
                    }
                    complexityCalculatorState.getProperty("variableAssignments").push({ line: lineNumber, name: targetName });
                }
            }
        }
    }
    if (node != null && node._astname != null && node._astname === "If" && node.orelse != null) {
        gatherAllVariables(node.orelse);
    }
    if (node != null && node._astname != null && node._astname === "Call") {
        var functionNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
        if (functionNode != null && "attr" in functionNode) {
            lineNumber = 0;
            if (node.lineno != null) {
                lineNumber = node.lineno;
                complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
            } else {
                lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
            }
            var modOriginality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
            var funcName = functionNode.attr.v;
            if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                complexityCalculatorState.getProperty("variableAssignments").push({ line: lineNumber, name: functionNode.value.id.v });
            }
        }
    }
    if (node != null && node._astname != null && node._astname === 'AugAssign') {
        lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
        }
        var assignLine = node.value.lineno - 1;
        var offset = node.value.col_offset;
        var valueString = node.op.name + " " + complexityCalculatorState.getProperty('studentCode')[assignLine].substring(offset);
        var indexOfExistingVariableObj = -1;
        varTarget = node.target;
        if (varTarget._astname = "Subscript") {
            varTarget = varTarget.value
        }
        if (varTarget != null) {
            var varName = varTarget.id.v;
            var variableObject = complexityCalculatorHelperFunctions.getVariableObject(varName);
            if (variableObject == null) {
                return;
            }
            variableObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("AugAssign", variableObject.opsDone, node.lineno);
            var modificationAlreadyExists = false;
            for (var p = 0; p < variableObject.assignedModified.length; p++) {
                if (variableObject.assignedModified[p].value === valueString) {
                    modificationAlreadyExists = true;
                    break;
                }
            }
            //the infrastructure we have for binops can handle the input and indexing stuff we need to handle, so we make a fake binop here to get that information.
            fakeBinOp = {
                _astname: "BinOp",
                left: node.target,
                right: node.value,
                lineno: lineNumber
            };
            var nestedBinOp = [];
            complexityCalculatorHelperFunctions.getNestedVariables(fakeBinOp, nestedBinOp);
            if (nestedBinOp.length > 0) {
                variableObject.nested = true;
            }
            binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(fakeBinOp);
            if (Array.isArray(binVal)) {
                varVal = "List";
                variableObject.nodeElements.push({
                    line: node.lineno,
                    elts: complexityCalculatorHelperFunctions.getAllBinOpLists(fakeBinOp)
                });
                variableObject.stringElements.push({
                    line: node.lineno,
                    elts: complexityCalculatorHelperFunctions.nodesToStrings(complexityCalculatorHelperFunctions.getAllBinOpLists(fakeBinOp), node.lineno)
                });
                complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.nodesToStrings(binVal, node.lineno), variableObject.containedValue);
                variableObject.containedValue.push("List");
                variableObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", variableObject.opsDone, node.lineno);
            }
            if (typeof binVal !== "string" && !Array.isArray(binVal)) {
                varVal = "BinOp";
            }
            variableObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", variableObject.opsDone, node.lineno);
            var binOpTypes = complexityCalculatorHelperFunctions.listTypesWithin(fakeBinOp, [], variableObject.indexAndInput, variableObject.opsDone);
            complexityCalculatorHelperFunctions.appendArray(binOpTypes, variableObject.containedValue);
            if (!modificationAlreadyExists) {
                var lineNo = node.lineno;
                for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                    if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                        lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                        break;
                    }
                }
                variableObject.assignedModified.push({
                    line: lineNo,
                    value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node,
                    binop: binVal
                });
                complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: variableObject.name });
                if (isInForLoop) { //push twice for loops
                    variableObject.assignedModified.push({
                        line: lineNo,
                        value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                        original: modOriginality,
                        nodeValue: node,
                        binop: binVal
                    });
                }
            }
        }
    }
    if (node != null && node._astname != null && node._astname === 'Assign') {
        var containedVal = [];
        if ('id' in node.value || node.value._astname === "Subscript" || node.value._astname === "FunctionExp" || node.value._astname === "Call") {
            //if the user is assigning a function to a variable
            var isFunction = false;
            var assignedName = "";
            var assignedVal = null;
            if (node.value._astname !== "Call") {
                assignedVal = node.value;
                isFunction = true;
            } else {
                var funcNode = complexityCalculatorHelperFunctions.retrieveFromList(node.value.func);
                if (funcNode._astname === "Name" && complexityCalculatorHelperFunctions.getFunctionObject(funcNode.id.v) != null && complexityCalculatorHelperFunctions.getFunctionObject(funcNode.id.v).returns === "Function") {
                    assignedName = complexityCalculatorHelperFunctions.getFunctionObject(funcNode.id.v).flagVal;
                    isFunction = true;
                }
            }
            if (isFunction) {
                var subscripted = false;
                if (assignedVal != null) {
                    if (assignedVal._astname === "UnaryOp") {
                        containedVal.push("Bool");
                        assignedVal = assignedVal.operand;
                    }
                    if (assignedVal != null && typeof assignedVal === 'object' &&
                        assignedVal._astname != null && assignedVal._astname === "Subscript" &&
                        complexityCalculatorHelperFunctions.getIndexingInNode(assignedVal)[0]) {
                        subscripted = true;
                    }
                    assignedVal = complexityCalculatorHelperFunctions.retrieveFromList(assignedVal);
                    if (assignedVal != null && typeof assignedVal === 'object' && assignedVal._astname != null && assignedVal._astname === "UnaryOp") {
                        containedVal.push("Bool");
                        assignedVal = assignedVal.operand;
                    }
                    if (assignedVal != null && node.value._astname !== "Call") {
                        if ('id' in assignedVal) {
                            assignedName = assignedVal.id.v;
                        } else {
                            assignedName = "" + assignedVal.lineno + "|" + assignedVal.col_offset;
                        }
                    }
                }
                if (assignedName !== "") {
                    var varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.targets[0]);
                    if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                        return;
                    } else {
                        var varName = varTarget.id.v;
                        if (assignedName === "makeBeat" || complexityCalculatorState.getProperty('makeBeatRenames').includes(assignedName)) {
                            //special case if user renames makeBeat
                            complexityCalculatorState.getProperty('makeBeatRenames').push(varName);
                        }
                        for (var n = 0; n < complexityCalculatorState.getProperty('userFunctionParameters').length; n++) {
                            if (complexityCalculatorState.getProperty('userFunctionParameters')[n].name === assignedName) { //double check and make sure its not already in here
                                var alreadyMarked = false;
                                for (var j = 0; j < complexityCalculatorState.getProperty('userFunctionParameters').length; j++) {
                                    if (complexityCalculatorState.getProperty('userFunctionParameters')[j].name === varName) {
                                        alreadyMarked = true;
                                        break;
                                    }
                                }
                                if (!alreadyMarked) {
                                    newFunctionObject = {};
                                    Object.assign(newFunctionObject, complexityCalculatorState.getProperty('userFunctionParameters')[n]);
                                    newFunctionObject.name = varName;
                                    complexityCalculatorState.getProperty('userFunctionParameters').push(newFunctionObject);
                                }
                            }
                        }
                        for (var p = 0; p < complexityCalculatorState.getProperty('userFunctionReturns').length; p++) {
                            if (assignedName === complexityCalculatorState.getProperty('userFunctionReturns')[p].name) {
                                for (var i = 0; i < complexityCalculatorState.getProperty('userFunctionReturns').length; i++) {
                                    if (complexityCalculatorState.getProperty('userFunctionReturns')[i].name === varName) {
                                        return;
                                    } //if it's already been marked we don't need to do anything else.
                                }
                                var newReturn = {};
                                Object.assign(newReturn, complexityCalculatorState.getProperty('userFunctionReturns')[p]);
                                newReturn.name = varName;
                                if (subscripted) {
                                    newReturn.indexAndInput.indexed = true;
                                }
                                complexityCalculatorState.getProperty('userFunctionReturns').push(newReturn);
                                //if the function we're reassigning is a reassign of something else
                                var reassignedFuncName = assignedName;
                                for (var n = 0; n < complexityCalculatorState.getProperty('userFunctionRenames'); n++) {
                                    if (complexityCalculatorState.getProperty('userFunctionRenames')[n][0] === reassignedFuncName) {
                                        reassignedFuncName = complexityCalculatorState.getProperty('userFunctionRenames')[n][1];
                                    }
                                }
                                complexityCalculatorState.getProperty('userFunctionRenames').push([varName, reassignedFuncName]);
                                return;
                            }
                        }
                    }
                    //ELSE if rename of api function, ignore it completely.
                    if (assignedVal != null && apiFunctions.includes(assignedName)) {
                        return;
                    }
                }
            }
        }
        //otherwise we go on to marking the variable
        var listElts = [];
        funcOrVar = "";
        flag = "";
        var indexOfExistingVariableObj = -1;
        var varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.targets[0]);
        if ((varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript") || varTarget == null) {
            return;
        }
        //variable init
        varName = varTarget.id.v;
        binVal = null;
        var inputIndexing = { input: false, indexed: false, strIndexed: false };
        var containsNested = false;
        var isNewAssignmentValue = false;
        var containsOps = [];
        var assignLine = node.value.lineno - 1;
        var offset = node.value.col_offset;
        var valueString = complexityCalculatorState.getProperty('studentCode')[assignLine].substring(offset);
        var subscriptString = false;
        var nodeVal = node.value;
        var carryOriginality = false;
        var copiedElts = null;
        //mark subscripting and listops, if applicable
        if (nodeVal._astname === "Subscript") {
            inputIndexing.strIndexed = complexityCalculatorHelperFunctions.getStringIndexingInNode(node.value)[0];
        }
        nodeVal = complexityCalculatorHelperFunctions.retrieveFromList(nodeVal);
        if (nodeVal != null && nodeVal._astname != null) {
            if (nodeVal._astname === "UnaryOp" || nodeVal._astname === 'Compare' || (nodeVal._astname === 'Name' && nodeVal.id.v != null && ((nodeVal.id.v === "True" || nodeVal.id.v === "False")))) {
                if (nodeVal._astname === "Compare") {
                    containsOps = complexityCalculatorHelperFunctions.addOpToList("Compare", containsOps, node.lineno);
                    var compareTypes = [];
                    complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, compareTypes, inputIndexing, containsOps);
                    containedVal = compareTypes;
                }
            } else if (nodeVal._astname === 'Name') { //this means it contains the value of another variable or function
                containsNested = true;
                otherVar = complexityCalculatorHelperFunctions.getVariableObject(nodeVal.id.v);
                if (otherVar != null && otherVar.value !== "" && otherVar.value !== "BinOp") {
                    if (otherVar.indexAndInput.input) {
                        inputIndexing.input = true;
                    }
                    containsOps = complexityCalculatorHelperFunctions.appendOpList(otherVar.opsDone, containsOps);
                    if (otherVar.indexAndInput.indexed) {
                        inputIndexing.indexed = true;
                    }
                    if (otherVar.indexAndInput.strIndexed) {
                        inputIndexing.strIndexed = true;
                    }
                    if (otherVar.nodeElements != null) {
                        copiedElts = [];
                        complexityCalculatorHelperFunctions.appendArray(otherVar.nodeElements, copiedElts);
                    }
                    complexityCalculatorHelperFunctions.appendArray(otherVar.containedValue, containedVal);
                }
                if (otherVar == null && complexityCalculatorHelperFunctions.getFunctionObject(nodeVal.id.v) != null) {
                    flag = nodeVal.id.v;
                }
            }
            if (nodeVal._astname === 'List') {
                listElts = nodeVal.elts;
                containedVal = complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, containedVal, inputIndexing, containsOps);
                var hasNames = [];
                complexityCalculatorHelperFunctions.getNestedVariables(nodeVal, hasNames);
                if (hasNames.length > 0) {
                    containsNested = true;
                }
            }
            if (nodeVal._astname === 'Call') {
                //special cases for listops and stringop
                var funcName = "";
                if ('id' in nodeVal.func) {
                    funcName = nodeVal.func.id.v;
                }
                else if ('attr' in nodeVal.func) {
                    funcName = nodeVal.func.attr.v;
                }
                if (funcName === 'readInput') {
                    inputIndexing.input = true;
                }
                var isListFunc = false, isStrFunc = false;
                //disambiguation between operations that can be done to strings and lists in JS
                if (JS_STR_LIST_OVERLAP.includes(funcName) && complexityCalculatorState.getProperty('isJavascript')) {
                    var operationType = complexityCalculatorHelperFunctions.getTypeFromNode(nodeVal.func.value);
                    if (operationType === "List") {
                        isListFunc = true;
                    } else if (operationType === "Str") {
                        isStrFunc = true;
                    } else if (operationType === "") {
                        isListFunc, isStrFunc = true;
                    }
                }
                if ('attr' in nodeVal.func && complexityCalculatorState.getProperty('listFuncs').includes(funcName) && !isStrFunc && funcName !== "shuffleList") {
                    if (nodeVal.func.value._astname === "List") {
                        var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(nodeVal.func.value, [], inputIndexing, containsOps);
                        for (var vil = 0; vil < valuesInList; vil++) {
                            containedVal.push(valuesInList[vil]);
                        }
                    }
                    //binop
                    if (nodeVal.func.value._astname === "BinOp") {
                        var valsInOp = [];
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("BinOp", containsOps, node.lineno);
                        complexityCalculatorHelperFunctions.listTypesWithin(nodeVal.func.value, valsInOp, inputIndexing, containsOps);
                        for (var vio = 0; vio < valsInOp.length; vio++) {
                            containedVal.push(valsInOp[vio]);
                        }
                    }
                    //func call
                    if (nodeVal.func.value._astname === "Call") {
                        var calledFunction = complexityCalculatorHelperFunctions.getFunctionObject(nodeVal.func.value.id.v);
                        if (calledFunction != null) {
                            if (calledFunction.containedValue != null) {
                                complexityCalculatorHelperFunctions.appendArray(calledFunction.containedValue, containedVal);
                            }
                            if (calledFunction.opsDone != null) {
                                complexityCalculatorHelperFunctions.appendOpList(calledFunction.opsDone, containsOps);
                            }
                        }
                    }
                    //var
                    if (nodeVal.func.value._astname === "Name") {//we have to find the other variable
                        var foundVariable = complexityCalculatorHelperFunctions.getVariableObject(nodeVal.func.value.id.v);
                        if (foundVariable != null) {
                            complexityCalculatorHelperFunctions.appendArray(foundVariable.containedValue, containedVal);
                            containsOps = complexityCalculatorHelperFunctions.appendOpList(foundVariable.opsDone, containsOps);
                        }
                    }
                }
                var assignedFunctionReturn = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                if (assignedFunctionReturn != null && assignedFunctionReturn.returns !== "" && assignedFunctionReturn.returns !== "BinOp") {
                    if (assignedFunctionReturn.indexAndInput != null) {
                        inputIndexing = assignedFunctionReturn.indexAndInput;
                    }
                    if (assignedFunctionReturn.opsDone != null) {
                        containsOps = complexityCalculatorHelperFunctions.appendOpList(assignedFunctionReturn.opsDone, containsOps);
                    }
                    if (assignedFunctionReturn.containedValue != null) {
                        containedVal = complexityCalculatorHelperFunctions.appendArray(assignedFunctionReturn.containedValue, containedVal);
                    }
                    if (assignedFunctionReturn.nodeElements != null && assignedFunctionReturn.nodeElements.length > 0) {
                        copiedElts = [];
                        copiedElts.push(assignedFunctionReturn.nodeElements[0]);
                    }
                    if (assignedFunctionReturn.original != null && assignedFunctionReturn.original === true) {
                        carryOriginality = true;
                    }
                    if (assignedFunctionReturn.nested != null) {
                        containsNested = true;
                    }
                }
            }
            if (nodeVal._astname === "BoolOp" || nodeVal._astname === "BinOp" || nodeVal._astname === "Compare" || nodeVal._astname === "List") {
                if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeVal)[0]) {
                    inputIndexing.indexed = true;
                }
                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeVal)[0]) {
                    inputIndexing.strIndexed = true;
                }
            }
            if (nodeVal._astname === "BoolOp") {//see what's inside in case there are other variables in the boolop
                var nestedVariables = [];
                complexityCalculatorHelperFunctions.getNestedVariables(nodeVal, nestedVariables);
                containsOps = complexityCalculatorHelperFunctions.addOpToList("BoolOp", containsOps, node.lineno);
                if (nestedVariables.length > 0) {
                    containsNested = true;
                }
                var boolOpVals = [];
                complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, boolOpVals, inputIndexing, containsOps);
                if (boolOpVals.length > 0) {
                    containedVal = boolOpVals;
                }
            }
            if (nodeVal._astname === 'BinOp') {
                //If it's a BinOp, recursively analyze and include in containedValue.
                //also, see if other variables are in the BinOp (which actually happens first)
                var nestedBinOp = [];
                complexityCalculatorHelperFunctions.getNestedVariables(nodeVal, nestedBinOp);
                if (nestedBinOp.length > 0) {
                    containsNested = true;
                }
                if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeVal))) {
                    listElts = complexityCalculatorHelperFunctions.getAllBinOpLists(nodeVal);
                }
                binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeVal);
                if (Array.isArray(binVal)) {
                    listElts = complexityCalculatorHelperFunctions.getAllBinOpLists(nodeVal);
                    containedVal = binVal;
                    containsOps = complexityCalculatorHelperFunctions.addOpToList("ListOp", containsOps, node.lineno);
                }
                containsOps = complexityCalculatorHelperFunctions.addOpToList("BinOp", containsOps, node.lineno);
                containedVal = complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, [], inputIndexing, containsOps);
            }
        }
        //if we have ANY kind of information, add the variable to the list; or, if the variable is already in the list, update the value.
        for (var i = 0; i < complexityCalculatorState.getProperty('allVariables').length; i++) {
            if (complexityCalculatorState.getProperty('allVariables')[i].name === varName) {
                indexOfExistingVariableObj = i;
                break;
            }
        }
        if (indexOfExistingVariableObj === -1) {
            var invalidTransformation = false; //This gets set to true if the variable's value is being set to itself, ex. myVariable = myVariable.
            if (node.value._astname === "Name" && node.targets[0].id.v === node.value.id.v) {
                invalidTransformation = true;
            }
            lineNumber = 0;
            var modFunc = [];
            if (node.lineno != null) {
                lineNumber = node.lineno;
                complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
            } else {
                lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
            }
            var modOriginality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
            if (!invalidTransformation) {  //if this is within a function and part of the function's params, we need to note that here.
                for (var u = 0; u < complexityCalculatorState.getProperty('userFunctionReturns').length; u++) {
                    if (node.lineno >= complexityCalculatorState.getProperty('userFunctionReturns')[u].startLine && node.lineno <= complexityCalculatorState.getProperty('userFunctionReturns')[u].endLine) {
                        var paramIndex = -1;  //ok, it's in the function, is it a param?
                        for (var a = 0; a < complexityCalculatorState.getProperty('userFunctionParameters').length; a++) {
                            if (complexityCalculatorState.getProperty('userFunctionParameters')[a].name === complexityCalculatorState.getProperty('userFunctionReturns')[u].name) {
                                for (var p = 0; p < complexityCalculatorState.getProperty('userFunctionParameters')[a].params.length; p++) {
                                    if (complexityCalculatorState.getProperty('userFunctionParameters')[a].params[p] === varName) {
                                        paramIndex = p;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        if (paramIndex > -1) {
                            complexityCalculatorState.getProperty('userFunctionReturns')[u].paramsChanged.push(paramIndex);
                            modFunc.push([complexityCalculatorState.getProperty('userFunctionReturns')[u].startLine, complexityCalculatorState.getProperty('userFunctionReturns')[u].endLine]);
                        }
                        break;
                    }
                }
            }
            if (copiedElts == null) {
                copiedElts = [];
            }
            if (listElts.length > 0) {
                copiedElts.push({
                    line: node.lineno,
                    elts: listElts
                });
            }
            var eltsToList = [];
            for (var o = 0; o < copiedElts.length; o++) {
                eltsToList.push({
                    line: copiedElts[o].line,
                    elts: complexityCalculatorHelperFunctions.nodesToStrings(copiedElts[o].elts, node.lineno)
                });
            }
            var userVariable = {
                name: varName,
                binOp: binVal,
                flagVal: flag,
                funcVar: funcOrVar,
                containedValue: containedVal,
                indexAndInput: {
                    input: inputIndexing.input,
                    indexed: inputIndexing.indexed,
                    strIndexed: inputIndexing.strIndexed
                },
                nested: containsNested,
                original: carryOriginality,
                opsDone: containsOps,
                assignedModified: [],
                modifyingFunctions: modFunc,
                nodeElements: copiedElts,
                stringElements: eltsToList
            };
            if (!invalidTransformation) {
                var lineNo = node.lineno;
                var insideForLoop = false;
                for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                    if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                        lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                        insideForLoop = true;
                        break;
                    }
                }
                userVariable.assignedModified.push({
                    line: lineNo,
                    value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node.value,
                    binop: binVal
                });
                //if we're inside a for loop we actually add this twice.
                if (insideForLoop) {
                    userVariable.assignedModified.push({
                        line: lineNo,
                        value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                        original: modOriginality,
                        nodeValue: node.value,
                        binop: binVal
                    });
                }
            }
            complexityCalculatorState.getProperty('allVariables').push(userVariable);
            complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: userVariable.name });
        } else {
            var invalidTransformation = false; //This gets set to true if the variable's value is being set to itself, ex. potato = potato.
            if (node.value._astname === "Name" && 'id' in node.targets[0] && node.targets[0].id.v === node.value.id.v) {
                invalidTransformation = true;
            }
            if (copiedElts == null) {
                copiedElts = [];
            }
            if (listElts.length > 0) {
                copiedElts.push({
                    line: node.lineno,
                    elts: listElts
                });
            }
            var eltsToList = [];
            for (var o = 0; o < copiedElts.length; o++) {
                eltsToList.push({
                    line: copiedElts[0].line,
                    elts: complexityCalculatorHelperFunctions.nodesToStrings(copiedElts[o].elts)
                });
            }
            complexityCalculatorHelperFunctions.appendArray(copiedElts, complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].nodeElements);
            complexityCalculatorHelperFunctions.appendArray(eltsToList, complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].stringElements);
            if (inputIndexing.input) {
                complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].indexAndInput.input = true;
            }
            if (inputIndexing.indexed) {
                complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].indexAndInput.indexed = true;
            }
            if (inputIndexing.strIndexed) {
                complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].indexAndInput.strIndexed = true;
            }
            if (binVal != null) {
                complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].binOp = binVal;
            }
            var assignmentExists = false;
            for (var p = 0; p < complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].assignedModified.length; p++) {
                if (complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].assignedModified[p].value === valueString) {
                    assignmentExists = true;
                    break;
                }
            }
            if (!assignmentExists && !invalidTransformation) {
                isNewAssignmentValue = true;
            }
            if (isNewAssignmentValue) {
                lineNumber = 0;
                if (node.lineno != null) {
                    lineNumber = node.lineno;
                    complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
                } else {
                    lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
                }
                var modOriginality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
                var lineNo = node.lineno;
                for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                    if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                        lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                        break;
                    }
                }
                complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].assignedModified.push({
                    line: lineNo,
                    value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node.value,
                    binop: binVal
                });
                complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].name });
                for (var uf = 0; uf < complexityCalculatorState.getProperty('userFunctionParameters').length; uf++) { //is this variable a parameter in this function? if so, what's its parameter index?
                    var paramIndex = -1;
                    for (var pa = 0; pa < complexityCalculatorState.getProperty('userFunctionParameters')[uf].params.length; pa++) {
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[uf].params[pa] === varName) {
                            paramIndex = pa;
                            break;
                        }
                    }
                    if (paramIndex > -1) { //ok it's a param in this func. NOW we see if it's within the lines of the function
                        var ufReturnIndex = -1;
                        for (var u = 0; u < complexityCalculatorState.getProperty('userFunctionReturns').length; u++) {
                            if (userFunctionReturns[u].name === complexityCalculatorState.getProperty('userFunctionParameters')[uf].name) {
                                ufReturnIndex = u;
                                break;
                            }
                        }
                        if (ufReturnIndex > -1) {//this should NEVER be false. but, ya know. safety. or because we needed another if statement. your choice.
                            if (node.lineno > complexityCalculatorState.getProperty('userFunctionReturns')[ufReturnIndex].startLine && node.lineno <= complexityCalculatorState.getProperty('userFunctionReturns')[ufReturnIndex].endLine) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[ufReturnIndex].paramsChanged.push(paramIndex);
                            } //then THIS is a change TO THE FUNCTION'S PARAMETER, WITHIN THAT FUNCTION. AKA this function modifies the value of this parameter.
                        }
                    }
                }
            }
            complexityCalculatorHelperFunctions.appendOpList(containsOps, complexityCalculatorState.getProperty('allVariables')[indexOfExistingVariableObj].opsDone);
        }
    }
}

// Handles re-visiting all of the variables, functions, and subscript values where we didn't know the datatype at the time
// Traverses through lists of function and variable objects, and finds values for those that don't have them
export function evaluateAllEmpties() {
    //function objects
    for (var r = 0; r < complexityCalculatorState.getProperty('userFunctionReturns').length; r++) {
        if (complexityCalculatorState.getProperty('userFunctionReturns')[r].returns === "") {
            if (complexityCalculatorState.getProperty('userFunctionReturns')[r].funcVar === "var") {
                //if itcomplexityCalculatorState.getProperty('returns')a variable  we look it up in the variable dictionary
                var returnedVariable = complexityCalculatorHelperFunctions.getVariableObject(complexityCalculatorState.getProperty('userFunctionReturns')[r].flagVal);
                if (returnedVariable != null && returnedVariable.value !== "" && returnedVariable.value !== "BinOp") {
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].flagVal = "";
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].funcVar = "";
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = returnedVariable.value;
                    complexityCalculatorHelperFunctions.copyAttributes(returnedVariable, complexityCalculatorState.getProperty('userFunctionReturns')[r], ["indexAndInput"]);
                    //get the latest version of the variable's node elements before the function is declared, and assign that to the function object's node elements.
                    if (returnedVariable.nodeElements != null && returnedVariable.nodeElements.length > 0) {
                        var nodeElementsIndex = -1;
                        for (var t = 0; t < returnedVariable.nodeElements.length - 1; t++) {
                            if (returnedVariable.nodeElements[t].line > complexityCalculatorState.getProperty('userFunctionReturns')[r].endLine) {
                                break;
                            }
                            if (returnedVariable.nodeElements[t].line > complexityCalculatorState.getProperty('userFunctionReturns')[r].startLine && returnedVariable.nodeElements[t + 1].line > complexityCalculatorState.getProperty('userFunctionReturns')[r].endLine) {
                                nodeElementsIndex = t;
                            }
                        }
                        if (nodeElementsIndex === -1 &&
                            returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line >= complexityCalculatorState.getProperty('userFunctionReturns')[r].startLine &&
                            returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line <= complexityCalculatorState.getProperty('userFunctionReturns')[r].endLine) {
                            nodeElementsIndex = returnedVariable.nodeElements.length - 1;
                        }
                        if (nodeElementsIndex === -1) {
                            nodeElementsIndex = 0;
                        }
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements = [returnedVariable.nodeElements[nodeElementsIndex]];
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].stringElements = [returnedVariable.stringElements[nodeElementsIndex]];
                    }
                    //append any opsDone and containedValue items from the variable to the corresponding items in the function objec.t
                    complexityCalculatorHelperFunctions.appendArray(returnedVariable.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue);
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(returnedVariable.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone);
                }
            } else if (complexityCalculatorState.getProperty('userFunctionReturns')[r].funcVar === "func" && complexityCalculatorState.getProperty('userFunctionReturns')[r].name != complexityCalculatorState.getProperty('userFunctionReturns')[r].flag) {
                //if it returns a call to another function, copy the information from that function.
                //This prevents us from getting stuck recursing forever
                var returnedFunc = complexityCalculatorHelperFunctions.getFunctionObject(complexityCalculatorState.getProperty('userFunctionReturns')[r].flagVal)
                if (returnedFunc != null && returnedFunc.returns !== "" && returnedFunc.returns !== "BinOp") {
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].funcVar = "";
                    //copy relevant information
                    complexityCalculatorHelperFunctions.copyAttributes(returnedFunc, complexityCalculatorState.getProperty('userFunctionReturns')[r], ["returns", "indexAndInput", "nested", "nodeElements", "stringElements"]);
                    if (returnedFunc.containedValue != null) {
                        complexityCalculatorHelperFunctions.appendArray(returnedFunc.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r]);
                    }
                }
            }
        }
        //go through all of the objects in the function's nodeElements and evaluate them, creating fake nodes
        if (complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements != null && complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements.length > 0 && complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0] != null) {
            for (var i in complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts) {
                if (complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i]._astname == null &&
                    typeofcomplexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i] === "object" &&
                    'left' in complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i]) {
                    var eltsValue = { lineno: complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i].lineno };
                    eltsValue._astname = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i]);
                    if (eltsValue._astname === "Int") {
                        eltsValue._astname = "Num";
                        eltsValue.n = { v: 1 };
                    }
                    if (eltsValue._astname === "Float") {
                        eltsValue._astname = "Num";
                        eltsValue.n = { v: 1.57 };
                    }
                    if (eltsValue._astname === "List") {
                        eltsValue.elts = [];
                    }
                    if (eltsValue._astname === "Bool") {
                        eltsValue._astname = "Name";
                        eltsValue.id = { v: "True" };
                    }
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts[i] = eltsValue;
                }
            }
            complexityCalculatorState.getProperty('userFunctionReturns')[r].stringElements[0] = complexityCalculatorHelperFunctions.nodesToStrings(complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].elts, complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements[0].line);
        }
        //If we have an un-evaluated subscript, do that now
        if (complexityCalculatorState.getProperty('userFunctionReturns')[r].returns === "Subscript") {
            //its an index or a slice
            var indexValue = complexityCalculatorHelperFunctions.retrieveFromList(complexityCalculatorState.getProperty('userFunctionReturns')[r].flagVal);
            if (complexityCalculatorHelperFunctions.getIndexingInNode(complexityCalculatorState.getProperty('userFunctionReturns')[r].returns)[0]) {
                complexityCalculatorState.getProperty('userFunctionReturns')[r].indexAndInput.indexed = true;
            }
            if (complexityCalculatorHelperFunctions.getStringIndexingInNode(complexityCalculatorState.getProperty('userFunctionReturns')[r].returns)[0]) {
                complexityCalculatorState.getProperty('userFunctionReturns')[r].indexAndInput.strIndexed = true;
            }
            if (indexValue != null) {
                //We know what it is.
                complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone, indexValue.lineno);
                complexityCalculatorState.getProperty('allVariables').flagVal = ""; //this may get reset to something down below, which is fine and 100% intentional.
                indexValue = complexityCalculatorHelperFunctions.retrieveFromList(indexValue);
                if (indexValue._astname === "Name") {
                    //it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName
                    if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                        //boolean
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "Bool";
                    }
                    //otherwise, it's a variable object
                    var indexVar = complexityCalculatorHelperFunctions.getVariableObject(indexValue.id.v);
                    if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {
                        complexityCalculatorHelperFunctions.copyAttributes(indexVar, complexityCalculatorState.getProperty('userFunctionReturns')[r], ["value", "binOp", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"]);
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(indexVar.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone);
                        complexityCalculatorHelperFunctions.appendArray(indexVar.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue);
                    } else if (indexVar != null && indexVar.value === "") {
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "";
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].flagVal = "var:" + indexVar.name;
                    } else if (indexVar == null && complexityCalculatorHelperFunctions.getFunctionObject(indexValue.id.v) != null) {
                        for (var n = 0; n < complexityCalculatorState.getProperty('userFunctionParameters').length; n++) {
                            if (complexityCalculatorState.getProperty('userFunctionParameters')[n].name === complexityCalculatorState.getProperty('userFunctionReturns')[r].name) { //double check and make sure its not already in here
                                var alreadyMarked = false;
                                for (var j = 0; j < complexityCalculatorState.getProperty('userFunctionParameters').length; j++) {
                                    if (complexityCalculatorState.getProperty('userFunctionParameters')[j].name === indexValue.id.v) {
                                        alreadyMarked = true;
                                        break;
                                    }
                                }
                                if (!alreadyMarked) {
                                    newFunctionObject = {};
                                    Object.assign(newFunctionObject, complexityCalculatorState.getProperty('userFunctionParameters')[n]);
                                    newFunctionObject.name = indexValue.id.v;
                                    complexityCalculatorState.getProperty('userFunctionParameters').push(newFunctionObject);
                                }
                                break;
                            }
                        }
                        for (var p = 0; p < complexityCalculatorState.getProperty('userFunctionReturns').length; p++) {
                            if (complexityCalculatorState.getProperty('userFunctionReturns')[r].name === complexityCalculatorState.getProperty('userFunctionReturns')[p].name) {
                                var alreadyMarked = false;
                                for (var i = 0; i < complexityCalculatorState.getProperty('userFunctionReturns').length; i++) {
                                    if (complexityCalculatorState.getProperty('userFunctionReturns')[i].name === indexValue.id.v) {
                                        alreadyMarked = true;
                                        break;
                                    } //if it's already been marked we don't need to do anything else.
                                }
                                if (alreadyMarked) {
                                    break;
                                }
                                var newReturn = {};
                                Object.assign(newReturn, complexityCalculatorState.getProperty('userFunctionReturns')[p]);
                                newReturn.name = indexValue.id.v;
                                newReturn.indexAndInput.indexed = true;
                                complexityCalculatorState.getProperty('userFunctionReturns').push(newReturn);
                                //if the function we're reassigning is a reassign of something else
                                var reassignedFuncName = complexityCalculatorState.getProperty('userFunctionReturns')[r].name;
                                for (var n = 0; n < complexityCalculatorState.getProperty('userFunctionRenames'); n++) {
                                    if (complexityCalculatorState.getProperty('userFunctionRenames')[n][0] === reassignedFuncName) {
                                        reassignedFuncName = complexityCalculatorState.getProperty('userFunctionRenames')[n][1];
                                    }
                                }
                                complexityCalculatorState.getProperty('userFunctionRenames').push([indexValue.id.v, reassignedFuncName]);
                                break;
                            }
                        }
                    }
                } else if (indexValue._astname === "Call") {
                    //it's a function call
                    var alreadyTallied = false;
                    if ('id' in indexValue.func || indexValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func) != indexValue.func) {
                        var funcName = "";
                        //get the function name
                        if ('id' in indexValue.func) {
                            funcName = indexValue.func.id.v;
                        } else {
                            var functionNameNode = null;
                            functionNameNode = complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func);
                            if (functionNameNode != null && functionNameNode._astname === "Name") {
                                funcName = functionNameNode.id.v;
                            }
                        }
                        //get the function object and copy values from it
                        var userFunctionCalled = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                        if (userFunctionCalled != null && userFunctionCalled.returns !== "") {
                            complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = userFunctionCalled.returns;
                            complexityCalculatorHelperFunctions.copyAttributes(userFunctionCalled, complexityCalculatorState.getProperty('userFunctionReturns')[r], ["binOp", "nested", "original", "indexAndInput", "nodeElements", "stringElements"]);
                            complexityCalculatorHelperFunctions.appendArray(userFunctionCalled.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue);
                            if (userFunctionCalled.opsDone != null) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(userFunctionCalled.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone);
                            }
                        }
                        alreadyTallied = true;
                    }
                } else if (indexValue._astname === "Num") {
                    //ints, floats
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = complexityCalculatorHelperFunctions.isNodeFloat(indexValue) ? "Float" : "Int";
                } else if (indexValue._astname === "Compare" || indexValue._astname === "BoolOp") {
                    //comparisons and boolops both become booleans and stored in containedValue
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "Bool";
                    complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone);
                } else if (indexValue._astname === "BinOp") {
                    //if binop, evaluate and push contained values
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone, indexValue.lineno);
                    var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(indexValue);
                    if (typeof binVal === "string") {
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = binVal;
                        complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone);
                    } else if (Array.isArray(binVal)) {
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "List";
                        complexityCalculatorState.getProperty('allVariables').nodeElements.push({
                            line: indexValue.lineno,
                            elts: binVal
                        });
                        complexityCalculatorState.getProperty('allVariables').stringElements.push({
                            line: indexValue.lineno,
                            elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                        });
                    } else {//we re-frame as a binop object!
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "BinOp";
                        complexityCalculatorState.getProperty('userFunctionReturns')[r].binOp = binVal;
                    }
                } else if (indexValue._astname === "List") {
                    //list
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "List";
                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[r].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[r].opsDone), complexityCalculatorState.getProperty('userFunctionReturns')[r].containedValue);
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: indexValue.elts
                    });
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: complexityCalculatorHelperFunctions.nodesToStrings(indexValue.elts)
                    });
                } else if (indexValue._astname === "Str") {
                    complexityCalculatorState.getProperty('userFunctionReturns')[r].returns = "Str";
                }
            }
        }
    }
    //Now, go through the list of all variables and do the same thing
    for (var r = 0; r < complexityCalculatorState.getProperty('allVariables').length; r++) {
        if (complexityCalculatorState.getProperty('allVariables')[r].value === "") {
            if (complexityCalculatorState.getProperty('allVariables')[r].funcVar === "var") {
                //if it's the value of another variable, we look it up in the var directory and copy the values
                var copiedVar = complexityCalculatorHelperFunctions.getVariableObject(complexityCalculatorState.getProperty('allVariables')[r].flagVal);
                if (copiedVar != null && copiedVar.value !== "" && copiedVar.value !== "BinOp") {
                    complexityCalculatorState.getProperty('allVariables')[r].flagVal = "";
                    complexityCalculatorState.getProperty('allVariables')[r].funcVar = "";
                    complexityCalculatorHelperFunctions.copyAttributes(copiedVar, complexityCalculatorState.getProperty('allVariables')[r], ["value", "binOp", "original", "indexAndInput", "nodeElements", "stringElements", "nested",]);
                    complexityCalculatorHelperFunctions.appendArray(copiedVar.containedValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue);
                    complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(copiedVar.opsDone, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                }
            } else if (complexityCalculatorState.getProperty('allVariables')[r].funcVar === "func" && complexityCalculatorState.getProperty('allVariables')[r].name != complexityCalculatorState.getProperty('allVariables')[r].flagVal) {
                //otherwise, it contains the value returned by a function, so go look that up and copy its values
                //prevents us from getting stuck recursing forever
                var funcValue = complexityCalculatorHelperFunctions.getFunctionObject(complexityCalculatorState.getProperty('allVariables')[r].flagVal);
                if (funcValue != null && funcValue.returns !== "") {
                    complexityCalculatorState.getProperty('allVariables')[r].flagVal = "";
                    complexityCalculatorState.getProperty('allVariables')[r].funcVar = "";
                    complexityCalculatorState.getProperty('allVariables')[r].value = funcValue.returns;
                    complexityCalculatorHelperFunctions.copyAttributes(funcValue, complexityCalculatorState.getProperty('allVariables')[r], ["input", "binOp", "nested", "nodeElements", "stringElements"]);
                    if (funcValue.containedValue != null) {
                        complexityCalculatorHelperFunctions.appendArray(funcValue.containedValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue);
                    }
                    if (funcValue.opsDone != null) {
                        complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(funcValue.opsDone, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                    }
                }
            }
        }
        //now go through and check all of the things in nodeElements, because we need to evaluate them if we can
        if (complexityCalculatorState.getProperty('allVariables')[r].nodeElements != null) {
            for (var p in complexityCalculatorState.getProperty('allVariables')[r].nodeElements) {
                for (var i in complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts) {
                    if (complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i]._astname == null && typeof complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i] === "object" && 'left' in complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i]) {
                        var eltsValue = { lineno: complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i].lineno };
                        eltsValue._astname = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i]);
                        if (eltsValue._astname === "Int") {
                            eltsValue._astname = "Num";
                            eltsValue.n = { v: 1 };
                        }
                        if (eltsValue._astname === "Float") {
                            eltsValue._astname = "Num";
                            eltsValue.n = { v: 1.57 };
                        }
                        if (eltsValue._astname === "List") {
                            eltsValue.elts = [];
                        }
                        if (eltsValue._astname === "Bool") {
                            eltsValue._astname = "Name";
                            eltsValue.id = { v: "True" };
                        }
                        complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts[i] = eltsValue;
                    }
                }
                complexityCalculatorState.getProperty('allVariables')[r].stringElements[p] = complexityCalculatorHelperFunctions.nodesToStrings(complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].elts, complexityCalculatorState.getProperty('allVariables')[r].nodeElements[p].line);
            }
        }
        if (complexityCalculatorState.getProperty('allVariables')[r].value === "List") {
            for (var j = 0; j < complexityCalculatorState.getProperty('allVariables')[r].containedValue.length; j++) {
                if (complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] != null && typeof complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] === 'string' && complexityCalculatorState.getProperty('allVariables')[r].containedValue[j].includes('var:')) {
                    var varName = complexityCalculatorState.getProperty('allVariables')[r].containedValue[j].split(':')[1];
                    var otherVariable = complexityCalculatorHelperFunctions.getVariableObject(varName);
                    if (otherVariable != null && otherVariable.value !== "" && otherVariable.value !== "BinOp") {
                        if (otherVariable.value === "List") {
                            complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] = otherVariable.containedValue.slice(0);
                        }
                        if (otherVariable.nested) {
                            complexityCalculatorState.getProperty('allVariables')[r].nested = true;
                        }
                    }
                } else if (complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] != null && typeof complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] === 'string' && complexityCalculatorState.getProperty('allVariables')[r].containedValue[j].includes('func:')) {
                    var funcName = complexityCalculatorState.getProperty('allVariables')[r].containedValue[j].split(':')[1];
                    var otherFunc = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                    if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns !== "BinOp") {
                        complexityCalculatorState.getProperty('allVariables')[r].containedValue[j] = otherFunc.returns;
                    }
                }
            }
        }
        if (complexityCalculatorState.getProperty('allVariables')[r].value === "Subscript") {
            var indexValue = complexityCalculatorHelperFunctions.retrieveFromList(complexityCalculatorState.getProperty('allVariables')[r].flagVal);
            if (indexValue != null) {//then we know what it is.
                complexityCalculatorState.getProperty('allVariables')[r].indexAndInput.indexed = true;
                complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", complexityCalculatorState.getProperty('allVariables')[r].opsDone, indexValue.lineno);
                complexityCalculatorState.getProperty('allVariables').flagVal = ""; //this may get reset to something down below, which is fine and 100% intentional.
                indexValue = complexityCalculatorHelperFunctions.retrieveFromList(indexValue);
                if (indexValue != null && indexValue._astname === "Name") {
                    //it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName
                    if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                        complexityCalculatorState.getProperty('allVariables')[r].value = "Bool";
                    }
                    var indexVar = complexityCalculatorHelperFunctions.getVariableObject(indexValue.id.v);
                    if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {
                        complexityCalculatorHelperFunctions.copyAttributes(indexVar, complexityCalculatorState.getProperty('allVariables')[r], ["value", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"]);
                        complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(indexVar.opsDone, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                        complexityCalculatorHelperFunctions.appendArray(indexVar.containedValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue);
                    } else if (indexVar != null && indexVar.value === "") {
                        complexityCalculatorState.getProperty('allVariables')[r].value = "";
                        complexityCalculatorState.getProperty('allVariables')[r].flagVal = "var:" + indexVar.name;
                    }
                } else if (indexValue != null && indexValue._astname === "Call") {
                    var alreadyTallied = false;
                    if ('id' in indexValue.func || indexValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func) != indexValue.func) {
                        var funcName = "";
                        if ('id' in indexValue.func) {
                            funcName = indexValue.func.id.v;
                        } else {
                            var functionNameNode = null;
                            functionNameNode = complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func);
                            if (functionNameNode != null) {
                                funcName = functionNameNode.id.v;
                            }
                        }
                        var userFunctionCalled = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                        if (userFunctionCalled != null && userFunctionCalled.returns !== "") {
                            complexityCalculatorState.getProperty('allVariables')[r].value = userFunctionCalled.returns;
                            complexityCalculatorHelperFunctions.copyAttributes(userFunctionCalled, complexityCalculatorState.getProperty('allVariables')[r], ["nested", "binOp", "original", "indexAndInput", "nodeElements", "stringElements"]);
                            complexityCalculatorHelperFunctions.appendArray(userFunctionCalled.containedValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue);
                            if (userFunctionCalled.opsDone != null) {
                                complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(userFunctionCalled.opsDone, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                            }
                        }
                        alreadyTallied = true;
                    }
                    if (!alreadyTallied) {
                        complexityCalculatorState.getProperty('allVariables')[r].value = complexityCalculatorHelperFunctions.getCallReturn(indexValue);
                        if (Array.isArray(complexityCalculatorState.getProperty('allVariables')[r].value)) {
                            complexityCalculatorState.getProperty('allVariables').nodeElements.push({
                                line: indexValue.lineno,
                                elts: complexityCalculatorState.getProperty('allVariables')[r].value
                            });
                            complexityCalculatorState.getProperty('allVariables').stringElements.push({
                                line: indexValue.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(complexityCalculatorState.getProperty('allVariables')[r].value)
                            });
                            complexityCalculatorState.getProperty('allVariables')[r].value = "List";
                        }
                    }
                } else if (indexValue._astname === "Num") {
                    complexityCalculatorState.getProperty('allVariables')[r].value = complexityCalculatorHelperFunctions.isNodeFloat(indexValue) ? "Float" : "Int";
                } else if (indexValue._astname === "Compare" || indexValue._astname === "BoolOp") {
                    complexityCalculatorState.getProperty('allVariables')[r].value = "Bool";
                    if (indexValue._astname === "Compare") {
                        complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue, complexityCalculatorState.getProperty('allVariables')[r].indexAndInput, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                    }
                    if (indexValue._astname === "BoolOp") {
                        complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue, complexityCalculatorState.getProperty('allVariables')[r].indexAndInput, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                    }
                } else if (indexValue._astname === "BinOp") {
                    complexityCalculatorState.getProperty('allVariables')[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", complexityCalculatorState.getProperty('allVariables')[r].opsDone, indexValue.lineno);
                    var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(indexValue);
                    if (typeof binVal === "string") {
                        complexityCalculatorState.getProperty('allVariables')[r].value = binVal;
                        complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue, complexityCalculatorState.getProperty('allVariables')[r].indexAndInput, complexityCalculatorState.getProperty('allVariables')[r].opsDone);
                    } else if (Array.isArray(binVal)) {
                        complexityCalculatorState.getProperty('allVariables')[r].value = "List";
                        complexityCalculatorState.getProperty('allVariables').nodeElements.push({
                            line: indexValue.lineno,
                            elts: binVal
                        });
                        complexityCalculatorState.getProperty('allVariables').stringElements.push({
                            line: indexValue.lineno,
                            elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                        });
                    } else {
                        //we re-frame as a binop object
                        complexityCalculatorState.getProperty('allVariables')[r].value = "BinOp";
                        complexityCalculatorState.getProperty('allVariables')[r].binOp = binVal;
                    }
                } else if (indexValue._astname === "List") {
                    complexityCalculatorState.getProperty('allVariables')[r].value = "List";
                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorState.getProperty('allVariables')[r].containedValue, complexityCalculatorHelperFunctions.listTypesWithin(indexValue, complexityCalculatorState.getProperty('allVariables')[r].containedValue, complexityCalculatorState.getProperty('allVariables')[r].indexAndInput, complexityCalculatorState.getProperty('allVariables')[r].opsDone));
                    complexityCalculatorState.getProperty('allVariables')[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: indexValue.elts
                    });
                    complexityCalculatorState.getProperty('allVariables')[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: complexityCalculatorHelperFunctions.nodesToStrings(indexValue.elts)
                    });
                } else if (indexValue._astname === "Str") {
                    complexityCalculatorState.getProperty('allVariables')[r].value = "Str";
                }
            }
        }
    }
}

// Finds out if a node in a user-defined functioncomplexityCalculatorState.getProperty('returns')a value, andcomplexityCalculatorState.getProperty('returns')that
function findReturnInBody(node, functionObject) {
    if (node != null && node._astname != null) {
        //variable init
        var variablesIncluded = false;
        var varList = [];
        var isIndexed = false;
        var tempObj = {};
        complexityCalculatorHelperFunctions.copyAttributes(functionObject, tempObj, ["stringElements", "indexAndInput", "name", "returns", "funcVar", "flagVal", "binOp", "containedValue", "opsDone", "nested", "original", "paramsChanged", "nodeElements", "paramFuncsCalled"]);
        functionObject = tempObj;
        var userFuncsIndex = -1;
        if (functionObject.name != null) {
            //should never be null but putting this in here for error protection
            for (var i in complexityCalculatorState.getProperty('userFunctionParameters')) {
                if (complexityCalculatorState.getProperty('userFunctionParameters')[i].name === functionObject.name) {
                    userFuncsIndex = i;
                    break;
                }
            }
        }
        //initialize any array that may be empty
        var emptyArrays = ['opsDone', 'stringElements', 'nodeElements', 'paramsChanged', 'containedValue'];
        for (var i in emptyArrays) {
            if (functionObject[emptyArrays[i]] == null) {
                functionObject[emptyArrays[i]] = [];
            }
        }
        if (functionObject.indexAndInput == null) {
            functionObject.indexAndInput = {
                indexed: false,
                strIndexed: false,
                input: false
            };
        }
        //add any ops to opsDone
        if (node._astname === "BinOp") {
            functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", functionObject.opsDone, node.lineno);
        }
        if (node._astname === "AugAssign") {
            functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("AugAssign", functionObject.opsDone, node.lineno);
        }
        if (node._astname === "BoolOp" || node._astname === "UnaryOp") {
            functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", functionObject.opsDone, node.lineno);
        }
        if (node._astname === "Compare") {
            functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", functionObject.opsDone, node.lineno);
        }
        //is there a call to another function or to a list or string op? Handle that here.
        if (node._astname === "Call") {
            var funcName = "";
            var funcNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
            if (funcNode != null) {
                if ('id' in funcNode) {
                    funcName = funcNode.id.v;
                } else {
                    funcName = funcNode.attr.v;
                }
                if (funcName === 'readInput') {
                    functionObject.indexAndInput.input = true;
                }
                if (userFuncsIndex != -1 && complexityCalculatorState.getProperty('userFunctionParameters')[userFuncsIndex].params.includes(funcName)) {
                    //later on, this will be used to simulate a call to this function that was passed as a parameter
                    complexityCalculatorState.getProperty('userFunctionParameters')[userFuncsIndex].paramFuncsCalled.push({
                        index: complexityCalculatorState.getProperty('userFunctionParameters')[userFuncsIndex].params.indexOf(funcName),
                        node: Object.assign({}, node)
                    });
                }
                var isListFunc = false, isStrFunc = false;
                if (JS_STR_LIST_OVERLAP.includes(funcName) && complexityCalculatorState.getProperty('isJavascript')) {
                    var opValType = complexityCalculatorHelperFunctions.getTypeFromNode(funcNode.value);
                    if (opValType === "List") {
                        isListFunc = true;
                    } else if (opValType === "Str") {
                        isStrFunc = true;
                    } else if (opValType === "") {
                        isListFunc, isStrFunc = true;
                    }
                }
                if (complexityCalculatorState.getProperty('listFuncs').includes(funcName) && !isStrFunc) {
                    functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", functionObject.opsDone, node.lineno);
                }
            }
        }
        //if this is the return value, populate functionObject with it
        if (node._astname === "Return" && node.value != null) {
            contVal = null;
            valueType = node.value._astname
            var opsPerformed = [];
            var inputTaken = false;
            var retVal = node.value;
            //get values stored inside UnaryOp and Subscript nodes, applying appropriate indexing values in the process
            if (retVal._astname === "UnaryOp") {
                functionObject.returns = "Bool";
                retVal = retVal.operand;
                opsPerformed = complexityCalculatorHelperFunctions.addOpToList("BoolOp", opsPerformed, node.lineno);
            }
            if (node.value._astname === "Subscript") {
                retVal = complexityCalculatorHelperFunctions.retrieveFromList(node.value);
                if (retVal == null) {
                    valueType = "Subscript";
                    flag = node.value;
                }
                if (complexityCalculatorHelperFunctions.getIndexingInNode(node.value)[0]) {
                    functionObject.indexAndInput.isIndexed = true;
                }
                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(node.value)[0]) {
                    functionObject.indexAndInput.strIndexed = true;
                }
            }
            retVal = complexityCalculatorHelperFunctions.retrieveFromList(node.value);
            if (typeof retVal === "string") {
                valueType = "";
                flag = retVal;
            } else if (retVal != null) {
                //store the type of returned value
                if (retVal._astname === "BinOp" || retVal._astname === "BoolOp" || retVal._astname === "Compare" || retVal._astname === "List") {
                    //get list/array/string indexing
                    isIndexed = complexityCalculatorHelperFunctions.getIndexingInNode(retVal)[0];
                    functionObject.indexAndInput.strIndexed = complexityCalculatorHelperFunctions.getStringIndexingInNode(retVal)[0];
                }
                if (retVal._astname === "Num") {
                    valueType = omplexityCalculatorHelperFunctions.isNodeFloat(retVal) ? "Float" : "Int";
                } else if (retVal._astname === "Call") {
                    //if itcomplexityCalculatorState.getProperty('returns')another function's return, we look up what THAT function returns. if we know.
                    funcOrVar = "func";
                    var funcName = "";
                    if ('id' in retVal.func) {
                        funcName = retVal.func.id.v;
                    } else {
                        funcName = retVal.func.attr.v;
                    }
                    if (funcName === 'readInput') {
                        functionObject.indexAndInput.input = true;
                    }
                    //special case -complexityCalculatorState.getProperty('returns')the returned value of a listOp
                    if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                        valueType = "List";
                        opsPerformed = complexityCalculatorHelperFunctions.addOpToList("ListOp", opsPerformed, node.lineno);
                        if (retVal.func.value._astname === "List") {
                            var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(retVal.func.value.elts, [], functionObject.indexAndInput, opsPerformed);
                            for (var vil = 0; vil < valuesInList; vil++) {
                                contVal.push(valuesInList[vil]);
                            }
                        }
                        if (retVal.func.value._astname === "BinOp") {
                            var valsInOp = [];
                            complexityCalculatorHelperFunctions.listTypesWithin(retVal.func.value, valsInOp, functionObject.indexAndInput, opsPerformed);
                            for (var vio = 0; vio < valsInOp.length; vio++) {
                                contVal.push(valsInOp[vio]);
                            }
                        }
                        if (retVal.func.value._astname === "Call") {
                            var retFunc = complexityCalculatorHelperFunctions.getFunctionObject(retVal.func.value.func.id.v);
                            if (retFunc != null) {
                                if (retFunc.containedValue != null) {
                                    complexityCalculatorHelperFunctions.appendArray(retFunc.containedValue, contVal);
                                }
                                if (retFunc.opsDone != null) {
                                    opsPerformed = complexityCalculatorHelperFunctions.appendOpList(retFunc.opsDone, opsPerformed);
                                }
                            }
                        }
                        if (retVal.func.value._astname === "Name") {  //we have to find the other variable
                            var retVar = complexityCalculatorHelperFunctions.getVariableObject(retVal.func.value.id.v);
                            if (retVar != null) {
                                complexityCalculatorHelperFunctions.appendArray(retVar.containedValue, contVal);
                                opsPerformed = complexityCalculatorHelperFunctions.appendOpList(retVar.opsDone, opsPerformed);
                            }
                        }
                    }
                    flag = funcName;
                    foundMatch = false;
                    var matchedFunc = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                    //or itcomplexityCalculatorState.getProperty('returns')the return of another function
                    if (matchedFunc != null) {
                        valueType = matchedFunc.returns;
                        if (matchedFunc.containedValue != null) {
                            if (matchedFunc.containedValue != null) {
                                contVal = matchedFunc.containedValue;
                            }
                            if (matchedFunc.opsDone != null) {
                                opsPerformed = complexityCalculatorHelperFunctions.appendOpList(matchedFunc.opsDone, opsPerformed);
                            }
                            if (matchedFunc.nested) {
                                variablesIncluded = true;
                            }
                            if (matchedFunc.nodeElements != null && matchedFunc.nodeElements.length > 0) {
                                functionObject.nodeElements = [matchedFunc.nodeElements[0]];
                                functionObject.stringElements = [matchedFunc.stringElements[0]]
                            }
                            var isIndexed = false;
                            foundMatch = true;
                        }
                        if (!foundMatch) {
                            // this denotes that we do not yet know what  this returns
                            valueType = "";
                        }
                    }
                } else if (retVal._astname === "Name") {
                    //returns a variable value
                    var isFunctionName = false;
                    for (var i in complexityCalculatorState.getProperty('userFunctionParameters')) {
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[i].name === retVal.id.v) {
                            isFunctionName = true;
                        }
                    }
                    if (isFunctionName) {
                        //the variable contains a function value
                        valueType = "Function";
                        flag = retVal.id.v;
                    } else {
                        //otherwise it's a variable the user has declared previously
                        if (retVal.id.v === "True" || retVal.id.v === "False") {
                            valueType = "Bool";
                        } else {
                            funcOrVar = "var";
                            variableName = retVal.id.v;
                            flag = variableName;
                            valueType = "";
                            variablesIncluded = true;
                            var varToCopy = complexityCalculatorHelperFunctions.getVariableObject(variableName);
                            //copy values from the variable object
                            if (varToCopy != null && varToCopy.value !== "BinOp" && varToCopy.value !== "") {
                                valueType = varToCopy.value;
                                contVal = varToCopy.containedValue;
                                opsPerformed = complexityCalculatorHelperFunctions.appendOpList(varToCopy.opsDone, opsPerformed);
                                if (varToCopy.nodeElements != null) {
                                    var nodeElementsIndex = -1;
                                    for (var t = 0; t < complexityCalculatorState.getProperty('allVariables')[v].nodeElements.length - 1; t++) {
                                        if (complexityCalculatorState.getProperty('allVariables')[v].nodeElements[t].line > functionObject.startLine && complexityCalculatorState.getProperty('allVariables')[v].nodeElements[t + 1].line > functionObject.endLine) {
                                            nodeElementsIndex = t;
                                            break;
                                        }
                                    }
                                    if (nodeElementsIndex = -1 && complexityCalculatorState.getProperty('allVariables')[v].nodeElements[allVariables[v].nodeElements.length - 1].line >= functionObject.startLine &&
                                        complexityCalculatorState.getProperty('allVariables')[v].nodeElements[allVariables[v].nodeElements.length - 1].line <= functionObject.endLine) {
                                        nodeElementsIndex = complexityCalculatorState.getProperty('allVariables')[v].nodeElements.length - 1;
                                    }
                                    if (nodeElementsIndex = -1) {
                                        nodeElementsIndex = 0;
                                    }
                                    functionObject.nodeElements = [varToCopy.nodeElements[nodeElementsIndex]];
                                    functionObject.stringElements = [varToCopy.stringElements[nodeElementsIndex]]
                                }
                                if (varToCopy.indexAndInput.indexed) {
                                    isIndexed = true;
                                }
                                if (varToCopy.indexAndInput.strIndexed) {
                                    functionObject.indexAndInput.strIndexed = true;
                                }
                            }
                        }
                    }
                } else if (retVal._astname === "BinOp") {
                    //if itcomplexityCalculatorState.getProperty('returns')a binOp, we have to evaluate what kind of datatype it is.
                    opsPerformed = complexityCalculatorHelperFunctions.addOpToList("BinOp", opsPerformed, node.lineno);
                    if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(retVal))) {
                        var binOpElts = complexityCalculatorHelperFunctions.getAllBinOpLists(retVal);
                        functionObject.nodeElements = [{
                            line: retVal.lineno,
                            elts: binOpElts
                        }];
                        functionObject.stringElements = [{
                            line: retVal.lineno,
                            elts: complexityCalculatorHelperFunctions.nodesToStrings(binOpElts, retVal.lineno)
                        }];
                    }
                    complexityCalculatorHelperFunctions.getNestedVariables(retVal, varList);
                    binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(retVal);
                    if (binVal != null) {
                        valueType = "BinOp";
                        contVal = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(retVal, contVal, functionObject.indexAndInput, opsPerformed);
                    } else {
                        valueType = "";
                    }
                } else if (retVal._astname === "BoolOp") {
                    //boolop becomes bool
                    valueType = "Bool";
                    complexityCalculatorHelperFunctions.getNestedVariables(retVal, varList);
                    contVal = [];
                    opsPerformed = complexityCalculatorHelperFunctions.addOpToList("BoolOp", opsPerformed, node.lineno);
                    complexityCalculatorHelperFunctions.listTypesWithin(retVal, contVal, functionObject.indexAndInput, opsPerformed);
                } else if (retVal._astname === "List") {
                    //store "List" and also all values within that list in nodeElements, stringElements, and containedValue
                    valueType = "List";
                    complexityCalculatorHelperFunctions.getNestedVariables(retVal, varList);
                    contVal = complexityCalculatorHelperFunctions.listTypesWithin(retVal.elts, contVal, functionObject.indexAndInput, opsPerformed);
                    functionObject.nodeElements = [{
                        line: node.lineno,
                        elts: retVal.elts
                    }];
                    functionObject.stringElements = [{
                        line: node.lineno,
                        elts: complexityCalculatorHelperFunctions.nodesToStrings(retVal.elts, node.lineno)
                    }];
                } else if (retVal._astname === "Compare") {
                    //comparison also becomes a bool
                    complexityCalculatorHelperFunctions.getNestedVariables(retVal, varList);
                    valueType = "Bool";
                    contVal = [];
                    opsPerformed = complexityCalculatorHelperFunctions.addOpToList("Compare", opsPerformed, node.lineno);
                    complexityCalculatorHelperFunctions.listTypesWithin(retVal, contVal, functionObject.indexAndInput, opsPerformed);
                }
            }
            //if we know what it is, we don't have to bother flagging it
            if (valueType !== "" && valueType !== "Subscript" && valueType !== "BinOp") {
                flag = "";
                funcOrVar = "";
            }
            if (functionObject != null && functionObject.opsDone != null) {
                opsPerformed = complexityCalculatorHelperFunctions.appendOpList(functionObject.opsDone, opsPerformed);
            }
            if (varList.length > 0) {
                variablesIncluded = true;
            }
            //fill in properties
            functionObject.returns = valueType;
            functionObject.funcVar = funcOrVar;
            functionObject.flagVal = flag;
            functionObject.binOp = binVal;
            if (contVal != null) {
                for (var g = 0; g < contVal.length; g++) {
                    functionObject.containedValue.push(contVal[g]);
                }
            }
            if (isIndexed) {
                functionObject.indexAndInput.indexed = true;
            }
            if (inputTaken) {
                functionObject.indexAndInput.input = true;
            }
            functionObject.opsDone = opsPerformed;
            functionObject.nested = variablesIncluded;
        }
        //some things don't get recursively checked automatically (if tests, JSFor init, etc.), so we manually make these calls here
        if (node._astname === "JSFor") {
            if (node.init != null) {
                functionObject = findReturnInBody(node.init, functionObject);
            }
            functionObject = findReturnInBody(node.test, functionObject);
            if (node.update != null) {
                functionObject = findReturnInBody(node.update, functionObject);
            }
        }
        if (node._astname === "If") {
            functionObject = findReturnInBody(node.test, functionObject);
            if (node.orelse != null) {
                for (var i in node.orelse) {
                    functionObject = findReturnInBody(node.orelse[i], functionObject);
                }
            }
        }
        //regular recursive calls
        if (node != null && node.body != null) {
            var keys = Object.keys(node.body);
            for (var p = 0; p < keys.length; p++) {
                var nodechild = node.body[keys[p]];
                functionObject = findReturnInBody(nodechild, functionObject);
            }
        } else if (node != null && (node._astname != null || node[0] != null)) {
            var keys = Object.keys(node);
            for (var p = 0; p < keys.length; p++) {
                var nodechild = node[keys[p]];
                functionObject = findReturnInBody(nodechild, functionObject);
            }
        }
    }
    return functionObject;
}

// Checks a single node for a function definition and adds name to the list if it finds one
function checkForFunctions(node, results) {
    //again, some things don't get recursively checked automatically, so we manually call that here
    if (node != null && node._astname != null && 'test' in node) {
        checkForFunctions(node.test, results);
    }
    if (node != null && node._astname != null && 'orelse' in node) {
        checkForFunctions(node.orelse, results);
    }
    //now - is there a function?
    if (node != null && node._astname != null && node._astname === 'FunctionDef') {
        if (results.userFunc < 1) {
            //update results
            results.userFunc = 1;
        }
        //gather parameter information
        var paramList = [];
        for (var r = 0; r < node.args.args.length; r++) {
            var paramName = node.args.args[r].id.v;
            paramList.push(paramName);
        }
        var lineNumber = node.lineno - 1;
        var lastLine = complexityCalculatorHelperFunctions.getLastLine(node);
        var wholeLoop = complexityCalculatorState.getProperty('studentCode').slice(lineNumber, lastLine);
        complexityCalculatorState.getProperty('userFunctionParameters').push({
            name: node.name.v,
            params: paramList,
            paramFuncsCalled: []
        });
        var funcOrVar = "";
        var flag = "";
        var valueType = "";
        var binVal = null;
        var functionName = node.name.v;
        //create base function object
        var functionObj = {
            name: functionName
        };
        for (var i = 0; i < node.body.length; i++) {
            //go through the lines and find any returns.
            //findReturnInBody also fills out all the other things
            functionObj = findReturnInBody(node.body[i], functionObj);
        }
        //set originality measure
        var originality = false;
        for (var p = lineNumber + 1; p < lastLine + 1; p++) {
            if (complexityCalculatorState.getProperty('originalityLines').includes(p)) {
                originality = true;
                break;
            }
        }
        if (originality && results.userFunc < 2) {
            //update results
            results.userFunc = 2;
        }
        functionObj.original = originality;
        var lastLine = complexityCalculatorHelperFunctions.getLastLine(node);
        //store these lines as places where functions are defined
        var functionLineMarker = {
            name: functionName,
            lines: []
        };
        for (var k = node.lineno; k <= lastLine; k++) {
            complexityCalculatorState.getProperty('uncalledFunctionLines').push(k);
            functionLineMarker.lines.push(k);
        }
        complexityCalculatorState.getProperty("functionLines").push(functionLineMarker);
        //create a new object and add its return value. push to list.
        if (functionObj != null) {
            functionObj.name = functionName;
            functionObj.startLine = node.lineno;
            functionObj.endLine = lastLine;
            complexityCalculatorState.getProperty('userFunctionReturns').push(functionObj);
        }
    }
}

// Recursively calls lookForParamReturns on a series of AST nodes.
export function evaluateFunctionReturnParams(ast) {
    if (ast != null && ast.body != null) {
        lookForParamReturns(ast);
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            lookForParamReturns(node);
            evaluateFunctionReturnParams(node);
        }
    } else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === 'object'))) {
        lookForParamReturns(ast);
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]];
            lookForParamReturns(node);
            evaluateFunctionReturnParams(node);
        }
    }
}

// Labels functions that return their own parameters. 
// Also handles function removal from the complexityCalculatorState.getProperty("complexityCalculatorState.getProperty('uncalledFunctionLines')") if said function is called (we only evaluate in-function code if the function is called)
function lookForParamReturns(node) {
    //again, we need to manually recurse through certian types of nodes
    if (node != null && node._astname != null && 'test' in node) {
        evaluateFunctionReturnParams(node.test);
    }
    if (node != null && node._astname != null && "iter" in node) {
        evaluateFunctionReturnParams(node.iter);
    }
    if (node != null && node._astname != null && "orelse" in node) {
        evaluateFunctionReturnParams(node.orelse);
    }
    if (node != null && node._astname === "Call" && "attr" in node.func) {
        //this is solely for JS array ops such as map() that take function expressions as arguments
        for (var i in node.args) {
            var nodeItem = complexityCalculatorHelperFunctions.retrieveFromList(node.args[i]);
            if (nodeItem != null && nodeItem._astname === "FunctionExp") {
                //handle params
                var funcName = nodeItem.functionName;
                var isRecursiveCall = false;
                var argsIn = nodeItem.functionDef.args.args;
                var calledReturnObj = complexityCalculatorHelperFunctions.getFunctionObject(calledName);
                if (calledReturnObj != null && calledReturnObj.startLine != null && (nodeItem.lineno > calledReturnObj.startLine && nodeItem.lineno <= calledReturnObj.endLine)) {
                    isRecursiveCall = true;
                }
                var index = -1;
                for (var userFuncRet = 0; userFuncRet < complexityCalculatorState.getProperty('userFunctionReturns').length; userFuncRet++) {
                    if (complexityCalculatorState.getProperty('userFunctionReturns')[userFuncRet].name === funcName) {
                        index = userFuncRet;
                        break;
                    }
                }
                //create empty variable value for the param
                for (var a = 0; a < argsIn.length; a++) {
                    var paramArgVar = {
                        name: "",
                        value: "",
                        binOp: null,
                        flagVal: "",
                        funcVar: "",
                        containedValue: [],
                        nested: "",
                        original: false,
                        indexAndInput: {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        },
                        opsDone: [],
                        modifyingFunctions: [],
                        assignedModified: [],
                        nodeElements: [],
                        stringElements: []
                    };
                    //adjustments so things get read accurately
                    var lineNo = nodeItem.lineno;
                    for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                        if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                            lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                            break;
                        }
                    }
                    if (!isRecursiveCall) {
                        paramArgVar.assignedModified.push({
                            line: lineNo,
                            value: complexityCalculatorState.getProperty('studentCode')[nodeItem.lineno - 1].trim(),
                            nodeValue: nodeItem
                        });
                        complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name });
                    }
                    //fill in param variable values, add to complexityCalculatorState.getProperty('allVariables')
                    var alreadyExists = -1;
                    var funcInd = -1;
                    for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionParameters').length; f++) {
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[f].name === funcName) {
                            funcInd = f;
                            break;
                        }
                    }
                    if (funcInd != -1) {
                        for (var e = 0; e < complexityCalculatorState.getProperty('allVariables').length; e++) {
                            if (complexityCalculatorState.getProperty('allVariables')[e].name === complexityCalculatorState.getProperty('userFunctionParameters')[funcInd].params[a]) {
                                alreadyExists = e;
                                break;
                            }
                        }
                        paramArgVar.name = complexityCalculatorState.getProperty('userFunctionParameters')[funcInd].params[a];
                    }
                    var attrName = node.func.attr.v;
                    //this information is needed so we can get a value for the param variable
                    if (attrName === "map" || attrName === "filter") {
                        var listToUse = [];
                        if ('func' in node && 'attr' in node.func) {
                            opToPerform = node.func.attr.v;
                        }
                        if (node.func.value._astname === "Name") {
                            var variable = complexityCalculatorHelperFunctions.getVariableObject(node.func.value.id.v);
                            if (variable != null) {
                                var correctElts = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno - 1);
                                if (correctElts != null) {
                                    listToUse = correctElts.slice(0);
                                }
                            }
                        } else if (node.func.value._astname === "Call") {
                            if (complexityCalculatorHelperFunctions.retrieveFromList(node.func.value) != node.func.value) {
                                listToUse = complexityCalculatorHelperFunctions.retrieveFromList(node.func.value).elts;
                            } else if ('id' in node.func.value.func) {
                                var funcName = node.func.value.func.id.v;
                                var thisLine = node.lineno;
                                if (complexityCalculatorHelperFunctions.getFunctionObject(funcName) != null) {
                                    var variable = complexityCalculatorHelperFunctions.getVariableObject(node.func.value.id.v);
                                    if (variable != null) {
                                        var correctElts = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno);
                                        if (correctElts != null) {
                                            listToUse = correctElts.slice(0);
                                        }
                                    }
                                }
                            }
                        } else if (node.func.value._astname === "List") {
                            listToUse = node.func.value.elts;
                        } else if (node.func.value._astname === "BinOp") {
                            listToUse = complexityCalculatorHelperFunctions.getAllBinOpLists(node.func.value);
                        }
                        if (listToUse != null) {
                            paramArgVar.value = complexityCalculatorHelperFunctions.getTypeFromNode(complexityCalculatorHelperFunctions.retrieveFromList(listToUse[0]));
                        }
                    }
                    //add to relevant lists
                    if (paramArgVar.opsDone.length > 0 && index != -1 && complexityCalculatorState.getProperty('userFunctionReturns')[index].startLine != null) {
                        paramArgVar.modifyingFunctions.push([complexityCalculatorState.getProperty('userFunctionReturns')[index].startLine, complexityCalculatorState.getProperty('userFunctionReturns')[index].endLine]);
                    }
                    if (alreadyExists > -1 && (complexityCalculatorState.getProperty('allVariables')[alreadyExists].value === "" && paramArgVar.value !== "")) {
                        complexityCalculatorState.getProperty('allVariables')[alreadyExists] = paramArgVar;
                    } else if (alreadyExists === -1) {
                        complexityCalculatorState.getProperty('allVariables').push(paramArgVar);
                        complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name });
                    }
                }
                if (index > -1) {
                    //if the functioncomplexityCalculatorState.getProperty('returns')one of its own parameters, we now know what datatype that is.
                    if (complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar === "param") {
                        var arg = nodeItem.args[complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal];
                        var argType = arg._astname;
                        var returnType = argType;
                        var containedWithin = [];
                        if (complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone == null) {
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = [];
                        }
                        if (argType === "Num") {
                            argType = complexityCalculatorHelperFunctions.isNodeFloat(arg) ? "Float" : "Int";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                        }
                        if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                        } else if (argType === "Name") {
                            var foundVar = false;
                            for (var v = 0; v < complexityCalculatorState.getProperty('allVariables').length; v++) {
                                if (complexityCalculatorState.getProperty('allVariables')[v].name === arg.id.v && complexityCalculatorState.getProperty('allVariables')[v].value !== "" && complexityCalculatorState.getProperty('allVariables')[v].value !== "BinOp") {
                                    foundVar = true;
                                    argType = complexityCalculatorState.getProperty('allVariables')[v].value;
                                    containedWithin = complexityCalculatorState.getProperty('allVariables')[v].containedValue;
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(complexityCalculatorState.getProperty('allVariables')[v].opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    break;
                                }
                            }
                            if (foundVar) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                                if (containedWithin.length > 0) {
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                                }
                            } else {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "var";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = arg.id.v;
                            }
                        }
                        if (argType === "Compare") {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, nodeItem.lineno);
                            complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                            if (containedWithin.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                            }
                        }
                        if (argType === "BoolOp") {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, nodeItem.lineno);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                            complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            if (containedWithin.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                            }
                        }
                        if (argType === "Call") {
                            //if the argument is a function call, we need to know what THAT function returns.
                            var foundFunc = false;
                            var funcName = "";
                            if ('id' in nodeItem.value.func) {
                                funcName = nodeItem.value.func.id.v;
                            } else {
                                funcName = nodeItem.value.func.attr.v;
                            }
                            if (funcName === 'readInput') {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput.input = true;
                            }
                            if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                                valueType = "List";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, nodeItem.lineno);
                                if (nodeItem.value.func.value._astname === "List") {
                                    var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(nodeItem.value.func.value.elts, [], complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    for (var vil = 0; vil < valuesInList; vil++) {
                                        complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue.push(valuesInList[vil]);
                                    }
                                }
                                //binop
                                if (nodeItem.value.func.value._astname === "BinOp") {
                                    var valsInOp = [];
                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeItem.value.func.value, valsInOp, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    for (var vio = 0; vio < valsInOp.length; vio++) {
                                        complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue.push(valsInOp[vio]);
                                    }
                                }
                                //func call
                                if (nodeItem.value.func.value._astname === "Call" && 'id' in nodeItem.value.func.value) {
                                    var calledFunction = complexityCalculatorHelperFunctions.getFunctionObject(nodeItem.value.func.value.id.v);
                                    if (calledFunction != null) {
                                        complexityCalculatorHelperFunctions.copyAttributes(calledFunction, complexityCalculatorState.getProperty('userFunctionReturns')[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"]);
                                        if (calledFunction.containedValue != null) {
                                            complexityCalculatorHelperFunctions.appendArray(calledFunction.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue);
                                        }
                                        if (calledFunction.opsDone != null) {
                                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(calledFunction.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                        }
                                    }
                                }
                                //var
                                if (nodeItem.value.func.value._astname === "Name") {
                                    var valueVariable = complexityCalculatorHelperFunctions.getVariableObject(nodeItem.value.func.value.id.v);
                                    if (valueVariable != null) {
                                        complexityCalculatorHelperFunctions.copyAttributes(valueVariable, complexityCalculatorState.getProperty('userFunctionReturns')[index], ["indexAndInput", "nested"]);
                                        if (valueVariable.nodeElements.length > 0) {
                                            complexityCalculatorState.getProperty('userFunctionReturns').nodeElements = [valueVariable.nodeElements[0]];
                                            complexityCalculatorState.getProperty('userFunctionReturns').stringElements = [valueVariable.stringElements[0]];
                                        }
                                        complexityCalculatorHelperFunctions.appendArray(valueVariable.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue);
                                        complexityCalculatorHelperFunctions.appendOpList(valueVariable.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    }
                                }
                            }
                            var funcRet = complexityCalculatorHelperFunctions.getFunctionObject(arg.id.v);
                            if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                foundFunc = true;
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = funcRet.returns;
                                if (funcRet.containedValue != null) {
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = funcRet.containedValue;
                                }
                                if (funcRet.opsDone != null) {
                                    complexityCalculatorHelperFunctions.appendOpList(funcRet.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                }
                            }
                            if (!foundFunc) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "func";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = arg.func.id.v;
                            }
                        }
                        if (argType === "BinOp") {
                            var contVal = [];
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", complexityCalculatorState.getProperty('userFunctionReturns')[index], nodeItem.lineno);
                            var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(arg);
                            if (typeof binVal === "string") {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = binVal;
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            } else if (Array.isArray(binVal)) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "List";
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].nodeElements = [{
                                    line: arg.lineno,
                                    elts: binVal
                                }];
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].stringElements = [{
                                    line: arg.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                }];
                            } else {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "BinOp";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].binOp = binVal;
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            }
                            if (contVal.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = contVal;
                            }
                        }
                        if (argType === "List") {
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "List";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = complexityCalculatorHelperFunctions.listTypesWithin(arg.elts, complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue,
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].nodeElements = [{
                                line: arg.lineno,
                                elts: arg.elts
                            }];
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].stringElements = [{
                                line: arg.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(arg.elts)
                            }];
                        }
                    }
                }
                var modifiesParams = [];
                //store line numbers and originality
                var lineNumber = 0;
                if (nodeItem.lineno != null) {
                    lineNumber = nodeItem.lineno;
                    complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
                } else {
                    lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
                }
                var originality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
                var startLine = 0;
                var endLine = 0;
                for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionReturns').length; f++) {
                    if (complexityCalculatorState.getProperty('userFunctionReturns')[f].name === funcName && complexityCalculatorState.getProperty('userFunctionReturns')[f].paramsChanged != null) {
                        modifiesParams = complexityCalculatorState.getProperty('userFunctionReturns')[f].paramsChanged;
                        startLine = complexityCalculatorState.getProperty('userFunctionReturns')[f].startLine;
                        endLine = complexityCalculatorState.getProperty('userFunctionReturns')[f].endLine;
                        break;
                    }
                }
                //update assignedModified for any params that the function modifies
                for (var a = 0; a < argsIn.length; a++) {
                    if (modifiesParams.includes(a) && (argsIn[a]._astname === "Name" && argsIn[a].id.v !== "True" && argsIn[a].id.v !== "False")) {
                        modString = complexityCalculatorState.getProperty('studentCode')[nodeItem.lineno - 1];
                        for (var v = 0; v < complexityCalculatorState.getProperty('allVariables').length; v++) {
                            if (complexityCalculatorState.getProperty('allVariables')[v].name === argsIn[a].id.v) {
                                var lineNo = nodeItem.lineno;
                                for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                                    if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                                        lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                                        break;
                                    }
                                }
                                complexityCalculatorState.getProperty('allVariables')[v].assignedModified.push({
                                    line: lineNo,
                                    value: complexityCalculatorState.getProperty('studentCode')[lineNumber].trim(),
                                    original: originality,
                                    nodeValue: nodeItem
                                });
                                complexityCalculatorState.getProperty("variableAssignments").push({ line: nodeItem.lineno, name: complexityCalculatorState.getProperty('allVariables')[v].name });
                                complexityCalculatorState.getProperty('allVariables')[v].modifyingFunctions.push([startLine, endLine]);
                                break;
                            }
                        }
                    }
                }
                //Handle  complexityCalculatorState.getProperty("complexityCalculatorState.getProperty('uncalledFunctionLines')"). a functionExp is generally ALWAYS called.
                for (var p = 0; p < complexityCalculatorState.getProperty("functionLines").length; p++) {
                    if (complexityCalculatorState.getProperty("functionLines")[p].name === funcName) {
                        //remove lines from  complexityCalculatorState.getProperty("complexityCalculatorState.getProperty('uncalledFunctionLines')")
                        for (var l = 0; l < complexityCalculatorState.getProperty("functionLines")[p].lines.length; l++) {
                            var lineIndex = complexityCalculatorState.getProperty('uncalledFunctionLines').indexOf(complexityCalculatorState.getProperty("functionLines")[p].lines[l]);
                            complexityCalculatorState.getProperty('uncalledFunctionLines').splice(lineIndex, 1);
                        }
                        break;
                    }
                }
            }
        }
    }
    //for everything that ISN'T a JS FunctionExp
    if (node != null && node._astname != null && node._astname === "Call") {
        //is this a user function?
        var alreadyExists = false;
        var funcInd = -1;
        var argsIn = [];
        var funcNames = [];
        var funcName = "";
        //get the function name and args
        if ('id' in node.func) {
            funcName = node.func.id.v;
            argsIn = node.args;
        } else if ('attr' in node.func) {
            funcName = node.func.attr.v;
            nodeArgs = [node.func.value];
        } else if (node.func._astname === "Subscript") {
            var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
            if (nameNode._astname === "Name") {
                funcName = nameNode.id.v;
            }
            argsIn = node.args;
        }
        //if we haven't stored the name yet, check the function renames in for loops
        for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionParameters').length; f++) {
            if (complexityCalculatorState.getProperty('userFunctionParameters')[f].name === funcName) {
                alreadyExists = true;
                funcInd = f;
                break;
            }
        }
        if (!alreadyExists) {
            var alias = null;
            for (var h in complexityCalculatorState.getProperty('forLoopFuncs')) {
                if (complexityCalculatorState.getProperty('forLoopFuncs')[h].callName === funcName) {
                    alreadyExists = true;
                    funcNames = complexityCalculatorState.getProperty('forLoopFuncs')[h].functionNames;
                    break;
                }
            }
        } else {
            funcNames = [funcName];
        }
        //we have to do this for each stored name
        for (var r in funcNames) {
            var foundName = false;
            var calledName = funcNames[r];
            for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionParameters').length; f++) {
                if (complexityCalculatorState.getProperty('userFunctionParameters')[f].name === calledName) {
                    foundName = true;
                    funcInd = f;
                    break;
                }
            }
            for (var p = 0; p < complexityCalculatorState.getProperty("functionLines").length; p++) {
                for (var n = 0; n < complexityCalculatorState.getProperty('userFunctionRenames').length; n++) {
                    if (complexityCalculatorState.getProperty('userFunctionRenames')[n][0] === calledName) {
                        calledName = complexityCalculatorState.getProperty('userFunctionRenames')[n][1];
                    }
                }
                if (complexityCalculatorState.getProperty("functionLines")[p].name === calledName) {
                    //remove lines from  complexityCalculatorState.getProperty("complexityCalculatorState.getProperty('uncalledFunctionLines')")
                    for (var l = 0; l < complexityCalculatorState.getProperty("functionLines")[p].lines.length; l++) {
                        var lineIndex = complexityCalculatorState.getProperty('uncalledFunctionLines').indexOf(complexityCalculatorState.getProperty("functionLines")[p].lines[l]);
                        complexityCalculatorState.getProperty('uncalledFunctionLines').splice(lineIndex, 1);
                    }
                    break;
                }
            }
            var ops = [];
            var isRecursiveCall = false;
            var calledReturnObj = complexityCalculatorHelperFunctions.getFunctionObject(calledName);
            if (calledReturnObj != null) {
                if (!('callsTo' in calledReturnObj)) {
                    calledReturnObj.callsTo = [];
                }
                calledReturnObj.callsTo.push(node.lineno);
            }
            if (calledReturnObj != null && calledReturnObj.startLine != null && (node.lineno > calledReturnObj.startLine && node.lineno <= calledReturnObj.endLine)) {
                isRecursiveCall = true;
            }
            if (foundName) {
                //create a variable object for each parameter, adding to complexityCalculatorState.getProperty('allVariables')
                for (var a = 0; a < argsIn.length; a++) {
                    var paramArgVar = {
                        name: "",
                        value: "",
                        binOp: null,
                        flagVal: "",
                        funcVar: "",
                        containedValue: [],
                        nested: "",
                        original: false,
                        indexAndInput: {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        },
                        opsDone: ops,
                        modifyingFunctions: [],
                        assignedModified: [],
                        nodeElements: [],
                        stringElements: []
                    };
                    //get lineno, etc.
                    var lineNo = node.lineno;
                    for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                        if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                            lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                            break;
                        }
                    }
                    if (!isRecursiveCall) {
                        paramArgVar.assignedModified.push({
                            line: lineNo,
                            value: complexityCalculatorState.getProperty('studentCode')[node.lineno - 1].trim(),
                            nodeValue: node
                        });
                        complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name });
                    }
                    var alreadyExists = -1;
                    for (var e = 0; e < complexityCalculatorState.getProperty('allVariables').length; e++) {
                        if (complexityCalculatorState.getProperty('allVariables')[e].name === complexityCalculatorState.getProperty('userFunctionParameters')[funcInd].params[a]) {
                            alreadyExists = e;
                            break;
                        }
                    }
                    if (funcInd != -1) {
                        paramArgVar.name = complexityCalculatorState.getProperty('userFunctionParameters')[funcInd].params[a];
                    }
                    //now we get the actual value
                    var argItem = argsIn[a];
                    if (argItem._astname === "UnaryOp") {
                        paramArgVar.value = "Bool";
                        complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a].operand, paramArgVar.containedValue, paramArgVar.indexAndInput, paramArgVar.opsDone);
                        argItem = argItem.operand;
                    }
                    if (complexityCalculatorHelperFunctions.retrieveFromList(argItem) != argItem) {
                        if (complexityCalculatorHelperFunctions.getIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.indexed = true;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.strIndexed = true;
                        }
                        argItem = complexityCalculatorHelperFunctions.retrieveFromList(argItem);
                    }
                    if (argItem != null && argItem._astname === "Subscript") {
                        if (complexityCalculatorHelperFunctions.getIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.indexed = true;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.strIndexed = true;
                        }
                        argItem = complexityCalculatorHelperFunctions.retrieveFromList(argItem);
                    }
                    if (argItem != null && argItem._astname === "UnaryOp") {
                        paramArgVar.value = "Bool";
                        complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a].operand, paramArgVar.containedValue, paramArgVar.indexAndInput, paramArgVar.opsDone);
                        argItem = argItem.operand;
                    }
                    if (argItem != null) {
                        var type = argsIn[a]._astname;
                        if (type === "Str") {
                            paramArgVar.value = "Str";
                        } else if (type === "AugAssign") {
                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("AugAssign", paramArgVar.opsDone, node.lineno);
                        } else if (type === "Num") {
                            paramArgVar.value = complexityCalculatorHelperFunctions.isNodeFloat(node.args[a]) ? "Float" : "Int";
                        } else if (type === "Name" && (argsIn[a].id.v === "True" || argsIn[a].id.v === "False")) {
                            paramArgVar.value = "Bool";
                        } else if (type === "Name") {
                            var otherVar = node.args[a].id.v;
                            var foundOtherVar = false;
                            var otherVariableLocated = complexityCalculatorHelperFunctions.getVariableObject(otherVar);
                            if (otherVariableLocated != null && otherVariableLocated.value !== "" && otherVariableLocated.value !== "BinOp") {
                                foundOtherVar = true;
                                complexityCalculatorHelperFunctions.copyAttributes(otherVariableLocated, paramArgVar, ["value", "flagVal", "binOp", "nested", "indexAndInput", "original", "nodeElements", "stringElements"]);
                                complexityCalculatorHelperFunctions.appendArray(otherVariableLocated.containedValue, paramArgVar.containedValue);
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(otherVariableLocated.opsDone, paramArgVar.opsDone);
                            }
                            if (!foundOtherVar) {
                                paramArgVar.funcVar = "var";
                                paramArgVar.flagVal = otherVar;
                            }
                        } else if (type === "BinOp") {
                            var nestedBinOp = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(node.args[a], nestedBinOp);
                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", paramArgVar.opsDone, node.lineno);
                            if (nestedBinOp.length > 0) {
                                paramArgVar.nested = true;
                            }
                            var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(node.args[a]);
                            if (binVal != null && typeof binVal === 'string' && !binVal.includes(':')) {
                                paramArgVar.value = binVal;
                            } else if (binVal != null && Array.isArray(binVal)) {
                                //list binops
                                paramArgVar.value = "List";
                                paramArgVar.nodeElements.push({
                                    line: node.lineno,
                                    elts: binVal
                                });
                                paramArgVar.stringElements.push({
                                    line: node.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                });
                            } else {
                                //if we don't have an answer yet, store the binop object for later evaluation
                                paramArgVar.value = "BinOp";
                                paramArgVar.binOp = binVal;
                            }
                            var binOpTypes = complexityCalculatorHelperFunctions.listTypesWithin(node.args[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                            paramArgVar.containedVal = binOpTypes;
                        } else if (type === "Call") {
                            //then it's whatever that call returns
                            var funcName = "";
                            var item = argsIn[a].func;
                            item = complexityCalculatorHelperFunctions.retrieveFromList(argsIn[a].func);
                            if ('id' in item) {
                                funcName = item.id.v;
                            } else if ('attr' in item) {
                                funcName = item.attr.v;
                            }
                            if (funcName === 'readInput') {
                                functionObject.indexAndInput.input = true;
                            }
                            if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                                valueType = "List";
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", paramArgVar.opsDone, node.lineno);
                                if (node.value.func.value._astname === "List" || node.value.func.value._astname === "BinOp") {
                                    var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value.elts, [], functionObject.indexAndInput, opsPerformed);
                                    complexityCalculatorHelperFunctions.appendArray(valuesInList, paramArgVar.containedValue);
                                }
                                //elts
                                var eltsObj = complexityCalculatorHelperFunctions.performListOp(item);
                                paramArgVar.nodeElements.push({
                                    line: node.lineno,
                                    elts: eltsObj[0]
                                });
                                paramArgVar.stringElements.push({
                                    line: node.lineno,
                                    elts: eltsObj[1]
                                });
                                //func call
                                if (node.value.func.value._astname === "Call") {
                                    var paramCall = complexityCalculatorHelperFunctions.getFunctionObject(node.value.func.value.id.v);
                                    if (paramCall != null) {
                                        if (paramCall.containedValue != null) {
                                            complexityCalculatorHelperFunctions.appendArray(paramCall.containedValue, paramArgVar.containedValue);
                                        }
                                        if (paramCall.opsDone != null) {
                                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(paramCall.opsDone, paramArgVar.opsDone);
                                        }
                                        if (paramCall.nodeElements != null) {
                                            paramArgVar.nodeElements = paramCall.nodeElements;
                                            paramArgVar.stringElements = paramCall.stringElements;
                                        }
                                    }
                                }
                                //var
                                if (node.value.func.value._astname === "Name") {
                                    var calledVar = complexityCalculatorHelperFunctions.getVariableObject(node.value.func.value.id.v);
                                    if (calledVar != null) {
                                        complexityCalculatorHelperFunctions.appendArray(calledVar.containedValue, paramArgVar.containedValue);
                                        paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(calledVar.opsDone, paramArgVar.opsDone);
                                        complexityCalculatorHelperFunctions.appendArray(paramCall.stringElements, paramArgVar.stringElements);
                                        complexityCalculatorHelperFunctions.appendArray(paramCall.nodeElements, paramArgVar.nodeElements);
                                    }
                                }
                            }
                        } else if (type === "BoolOp") {
                            paramArgVar.value = "Bool";
                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", paramArgVar.opsDone, node.lineno);
                            var boolOpVals = complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                            if (boolOpVals.length > 0) {
                                paramArgVar.containedValue = boolOpVals;
                            }
                        } else if (type === "List") {
                            paramArgVar.value = "List";
                            var containedVal = complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a].elts, [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                            if (containedVal.length > 0) {
                                paramArgVar.containedValue = containedVal;
                            }
                            paramArgVar.nodeElements.push({
                                line: node.lineno,
                                elts: argsIn[a].elts
                            });
                            paramArgVar.stringElements.push({
                                line: node.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(argsIn[a].elts, node.lineno)
                            });
                        } else if (type === "Compare") {
                            paramArgVar.value = "Bool";
                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", paramArgVar.opsDone, node.lineno);
                            var compareTypes = complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                            if (compareTypes.length > 0) {
                                paramArgVar.containedValue = compareTypes;
                            }
                        }
                        var index = -1;
                        for (var userFuncRet = 0; userFuncRet < complexityCalculatorState.getProperty('userFunctionReturns').length; userFuncRet++) {
                            if (complexityCalculatorState.getProperty('userFunctionReturns')[userFuncRet].name === funcName) {
                                index = userFuncRet;
                                break;
                            }
                        }
                        if (paramArgVar.opsDone.length > 0 && index != -1 && complexityCalculatorState.getProperty('userFunctionReturns')[index].startLine != null) {
                            paramArgVar.modifyingFunctions.push([complexityCalculatorState.getProperty('userFunctionReturns')[index].startLine, complexityCalculatorState.getProperty('userFunctionReturns')[index].endLine]);
                        }
                        if (alreadyExists > -1 && (complexityCalculatorState.getProperty('allVariables')[alreadyExists].value === "" && paramArgVar.value !== "")) {
                            complexityCalculatorState.getProperty('allVariables')[alreadyExists] = paramArgVar;
                        } else if (alreadyExists === -1) {
                            complexityCalculatorState.getProperty('allVariables').push(paramArgVar);
                            complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name });
                        }
                    }
                }
                if (index > -1) {
                    //if the functioncomplexityCalculatorState.getProperty('returns')this parameter, we tell it what that is
                    if (complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar === "param") {
                        var arg = node.args[complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal];
                        var argType = arg._astname;
                        var returnType = argType;
                        var containedWithin = [];
                        if (complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone == null) {
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = [];
                        }
                        if (argType === "Num") {
                            argType = complexityCalculatorHelperFunctions.isNodeFloat(arg) ? "Float" : "Int";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                        }
                        if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                        } else if (argType === "Name") {
                            var foundVar = false;
                            for (var v = 0; v < complexityCalculatorState.getProperty('allVariables').length; v++) {
                                if (complexityCalculatorState.getProperty('allVariables')[v].name === arg.id.v && complexityCalculatorState.getProperty('allVariables')[v].value !== "" && complexityCalculatorState.getProperty('allVariables')[v].value !== "BinOp") {
                                    foundVar = true;
                                    argType = complexityCalculatorState.getProperty('allVariables')[v].value;
                                    containedWithin = complexityCalculatorState.getProperty('allVariables')[v].containedValue;
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(complexityCalculatorState.getProperty('allVariables')[v].opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    break;
                                }
                            }
                            if (foundVar) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                                if (containedWithin.length > 0) {
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                                }
                            } else {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "var";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = arg.id.v;
                            }
                        }
                        if (argType === "Compare") {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, node.lineno);
                            complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                            if (containedWithin.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                            }
                        }
                        if (argType === "BoolOp") {
                            argType = "Bool";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, node.lineno);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = argType;
                            complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            if (containedWithin.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = containedWithin;
                            }
                        }
                        if (argType === "Call") {
                            var foundFunc = false;
                            var funcName = "";
                            if ('id' in node.value.func) {
                                funcName = node.value.func.id.v;
                            } else {
                                funcName = node.value.func.attr.v;
                            }
                            if (funcName === 'readInput') {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput.input = true;
                            }
                            if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                                valueType = "List";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone, node.lineno);
                                if (node.value.func.value._astname === "List") {
                                    var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value.elts, [], complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    for (var vil = 0; vil < valuesInList; vil++) {
                                        complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue.push(valuesInList[vil]);
                                    }
                                }
                                //binop
                                if (node.value.func.value._astname === "BinOp") {
                                    var valsInOp = [];
                                    complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value, valsInOp, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    for (var vio = 0; vio < valsInOp.length; vio++) {
                                        complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue.push(valsInOp[vio]);
                                    }
                                }
                                //func call
                                if (node.value.func.value._astname === "Call" && 'id' in node.value.func.value) {
                                    var calledFunction = complexityCalculatorHelperFunctions.getFunctionObject(node.value.func.value.id.v);
                                    if (calledFunction != null) {
                                        complexityCalculatorHelperFunctions.copyAttributes(calledFunction, complexityCalculatorState.getProperty('userFunctionReturns')[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"]);
                                        if (calledFunction.containedValue != null) {
                                            complexityCalculatorHelperFunctions.appendArray(calledFunction.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue);
                                        }
                                        if (calledFunction.opsDone != null) {
                                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(calledFunction.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                        }
                                    }
                                }
                                //var
                                if (node.value.func.value._astname === "Name") {
                                    var valueVariable = complexityCalculatorHelperFunctions.getVariableObject(node.value.func.value.id.v);
                                    if (valueVariable != null) {
                                        complexityCalculatorHelperFunctions.copyAttributes(valueVariable, complexityCalculatorState.getProperty('userFunctionReturns')[index], ["indexAndInput", "nested"]);
                                        if (valueVariable.nodeElements.length > 0) {
                                            complexityCalculatorState.getProperty('userFunctionReturns').nodeElements = [valueVariable.nodeElements[0]];
                                            complexityCalculatorState.getProperty('userFunctionReturns').stringElements = [valueVariable.stringElements[0]];
                                        }
                                        complexityCalculatorHelperFunctions.appendArray(valueVariable.containedValue, complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue);
                                        complexityCalculatorHelperFunctions.appendOpList(valueVariable.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                    }
                                }
                            }
                            var funcRet = complexityCalculatorHelperFunctions.getFunctionObject(arg.id.v);
                            if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                foundFunc = true;
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = funcRet.returns;
                                if (funcRet.containedValue != null) {
                                    complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = funcRet.containedValue;
                                }
                                if (funcRet.opsDone != null) {
                                    complexityCalculatorHelperFunctions.appendOpList(funcRet.opsDone, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                }
                            }
                            if (!foundFunc) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "func";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = arg.func.id.v;
                            }
                        }
                        if (argType === "BinOp") {
                            var contVal = [];
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", complexityCalculatorState.getProperty('userFunctionReturns')[index], node.lineno);
                            var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(arg);
                            if (typeof binVal === "string") {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = binVal;
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            } else if (Array.isArray(binVal)) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "List";
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].nodeElements = [{
                                    line: arg.lineno,
                                    elts: binVal
                                }];
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].stringElements = [{
                                    line: arg.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                }];
                            } else {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "BinOp";
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].binOp = binVal;
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput, complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            }
                            if (contVal.length > 0) {
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = contVal;
                            }
                        }
                        if (argType === "List") {
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].flagVal = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].funcVar = "";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].returns = "List";
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue = complexityCalculatorHelperFunctions.listTypesWithin(arg.elts,
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].containedValue,
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].indexAndInput,
                                complexityCalculatorState.getProperty('userFunctionReturns')[index].opsDone);
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].nodeElements = [{
                                line: arg.lineno,
                                elts: arg.elts
                            }];
                            complexityCalculatorState.getProperty('userFunctionReturns')[index].stringElements = [{
                                line: arg.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(arg.elts)
                            }];
                        }
                    }
                }
                //deal with modifiesParams and assignedModified for the function and param var, respectively
                var modifiesParams = [];
                var funcName = "";
                if ('id' in node.func) {
                    lineNumber = 0;
                    if (node.lineno != null) {
                        lineNumber = node.lineno;
                        complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
                    } else {
                        lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
                    }
                    var originality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
                    funcName = node.func.id.v;
                    nodeArgs = node.args;
                    var startLine = 0;
                    var endLine = 0;
                    for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionReturns').length; f++) {
                        if (complexityCalculatorState.getProperty('userFunctionReturns')[f].name === funcName && complexityCalculatorState.getProperty('userFunctionReturns')[f].paramsChanged != null) {
                            modifiesParams = complexityCalculatorState.getProperty('userFunctionReturns')[f].paramsChanged;
                            startLine = complexityCalculatorState.getProperty('userFunctionReturns')[f].startLine;
                            endLine = complexityCalculatorState.getProperty('userFunctionReturns')[f].endLine;
                            break;
                        }
                    }
                    for (var a = 0; a < nodeArgs.length; a++) {
                        if (modifiesParams.includes(a) && (nodeArgs[a]._astname === "Name" && nodeArgs[a].id.v !== "True" && nodeArgs[a].id.v !== "False")) {
                            modString = complexityCalculatorState.getProperty('studentCode')[node.lineno - 1];
                            for (var v = 0; v < complexityCalculatorState.getProperty('allVariables').length; v++) {
                                if (complexityCalculatorState.getProperty('allVariables')[v].name === nodeArgs[a].id.v) {
                                    var lineNo = node.lineno;
                                    for (var h = 0; h < complexityCalculatorState.getProperty('loopLocations').length; h++) {
                                        if (lineNo >= complexityCalculatorState.getProperty('loopLocations')[h][0] && lineNo <= complexityCalculatorState.getProperty('loopLocations')[h][1]) {
                                            lineNo = complexityCalculatorState.getProperty('loopLocations')[h][0];
                                            break;
                                        }
                                    }
                                    complexityCalculatorState.getProperty('allVariables')[v].assignedModified.push({
                                        line: lineNo,
                                        value: complexityCalculatorState.getProperty('studentCode')[lineNumber].trim(),
                                        original: originality,
                                        nodeValue: node
                                    });
                                    complexityCalculatorState.getProperty("variableAssignments").push({ line: node.lineno, name: complexityCalculatorState.getProperty('allVariables')[v].name });
                                    complexityCalculatorState.getProperty('allVariables')[v].modifyingFunctions.push([startLine, endLine]);
                                    break;
                                }
                            }
                        }
                    } 
                }
            }
        }
    }
}

function analyzeFunctionCall(node, results, loopParent, opsUsed, purposeVars) {
    if (node._astname !== "Call") {
        //This is a function for "Call" nodes. If something else gets passed accidentally, return.
        return;
    }
    var originality = false;
    originality = (complexityCalculatorState.getProperty('originalityLines').includes(node.lineno));
    //add to apiFunctionCalls
    var functionNameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
    if (functionNameNode != null && functionNameNode._astname == "Name") {
        //add to api function calls
        var callObject = {};
        callObject.line = node.lineno;
        callObject.function = functionNameNode.id.v;
        callObject.args = [];
        if (node.args != null) {
            callObject.args = complexityCalculatorHelperFunctions.getArgValuesFromArray(node.args, node.lineno);
        }
        complexityCalculatorState.getProperty("allCalls").push(callObject);
        if (apiFunctions.includes(functionNameNode.id.v)) {
            complexityCalculatorState.getProperty("apiCalls").push(callObject);
        }
    } else if (functionNameNode != null && 'attr' in functionNameNode) {
        var callObject = {};
        callObject.line = node.lineno;
        callObject.function = functionNameNode.attr.v;
        callObject.args = [];
        if (node.args != null) {
            callObject.args = complexityCalculatorHelperFunctions.getArgValuesFromArray([functionNameNode.value], node.lineno);
        }
        complexityCalculatorState.getProperty("allCalls").push(callObject);
    }
    //if it's a function that's been renamed, we count this as variables being 3
    if (originality) {
        //go through function renames
        //the varname is the first one
        for (var i in complexityCalculatorState.getProperty('userFunctionRenames')) {
            if (complexityCalculatorState.getProperty('userFunctionRenames')[i][0] === functionNameNode.id.v && results.variables < 3) {
                results.variables = 3;
            }
        }
    }
    //if it's a function CALL there's an extra thing we note, and that's that the function is actually used once it's defined.
    var functionParametersIndex = -1;
    var foundFunc = false;
    var funcName = "";
    //get function name
    if ('id' in node.func) {
        funcName = node.func.id.v;
    } else if ('attr' in node.func) {
        funcName = node.func.attr.v;
    } else if (node.func._astname === "Subscript") {
        var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
        if (nameNode._astname === "Name") {
            funcName = nameNode.id.v;
            if (originality || complexityCalculatorHelperFunctions.getFunctionObject(funcName).original) {
                results["List"] = 4;
            }
        }
    } else if (complexityCalculatorHelperFunctions.retrieveFromList(node.func) != node.func) {
        var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
        if (nameNode._astname === "Name") {
            funcName = nameNode.id.v;
            if (originality || complexityCalculatorHelperFunctions.getFunctionObject(funcName).original) {
                results["List"] = 4;
            }
        }
    }
    for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionParameters').length; f++) {
        if (complexityCalculatorState.getProperty('userFunctionParameters')[f].name === funcName) {
            foundFunc = true;
            functionParametersIndex = f;
            break;
        }
    }
    //using a list as a makeBeat() parameter counts as indexing it for a purpose.
    if ((funcName === "makeBeat" || complexityCalculatorState.getProperty('makeBeatRenames').includes(funcName)) && results.lists < 4 && node.args.length > 0) {
        //see if the arg is a list
        //get the first argument
        var firstArg = node.args[0];
        var mbList = false;
        var listOrig = false;
        //if it's a subscript or pop it DOESN'T MATTER cause that'll get marked anyway, so we can ignore.
        if (firstArg._astname === "List") {
            mbList = true;
        }
        if (firstArg._astname === "BinOp") {
            if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(firstArg))) {
                mbList = true;
            }
            var nestedItems = [];
            complexityCalculatorHelperFunctions.getNestedVariables(firstArg, nestedItems);
            for (var f = 0; f < nestedItems.length; f++) {
                if (nestedItems[f].original) {
                    listOrig = true;
                    break;
                }
            }
        }
        if (firstArg._astname === "Call") {
            if ('id' in firstArg.func) {
                //else, is it a UDF/api func thatcomplexityCalculatorState.getProperty('returns')a list?
                var calledFunc = complexityCalculatorHelperFunctions.getFunctionObject(firstArg.func.id.v);
                if (calledFunc != null && calledFunc.returns === "List") {
                    mbList = true;
                }
                if (calledFunc.original) {
                    listOrig = true;
                }
            }
        }
        if (firstArg._astname === "Name") {
            //find the variable
            if ('id' in firstArg) {
                var argVar = complexityCalculatorHelperFunctions.getVariableObject(firstArg.id.v);
                if (argVar != null && argVar.value === "List") {
                    mbList = true;
                    listOrig = argVar.original;
                }
            }
        }
        if (mbList && (listOrig || originality)) {
            results["List"] = 4;
        }
    }
    //let's check the args
    //using something as an argument counts as using "for a purpose," so this gets updated in the results.
    var argResults = {
        Float: false,
        Int: false,
        Str: false,
        Bool: false,
        List: false
    };
    var nodeArgs = [];
    var funcName = "";
    var functionOriginality = false;
    if ('args' in node) {
        nodeArgs = node.args;
    }
    var funcNode = node.func;
    funcNode = complexityCalculatorHelperFunctions.retrieveFromList(funcNode);
    //get the function's name and arguments
    if ('id' in node.func) {
        funcName = node.func.id.v;
        nodeArgs = node.args;
    } else if ('attr' in node.func) {
        funcName = node.func.attr.v;
        if (node.func.value._astname === "Name") {
            nodeArgs = [node.func.value];
        } else if (node.func.value._astname === "List") {
            nodeArgs = node.func.value.elts;
        } else if (node.func.value._astname === "Str") {
            nodeArgs = [node.func.value];
        }
        if (node.args != null) {
            for (var i in node.args) {
                nodeArgs.push(node.args[i]);
            }
        }
    }
    var thisFuncReturnObj = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
    if (thisFuncReturnObj != null && thisFuncReturnObj.original != null && thisFuncReturnObj.original === true) {
        functionOriginality = true;
    }
    //update contained values as well
    if (functionOriginality && thisFuncReturnObj.opsDone != null) {
        for (var i in thisFuncReturnObj.containedValue) {
            argResults[thisFuncReturnObj.containedValue[i]] = true;
        }
    }
    //if anything reaches a new level, update the results.
    if (originality || functionOriginality) {
        for (let arg in argResults) {
            if (argResults[arg] && results[arg] < 3) {
                results[arg] = 3;
            }
        }
    }
    //check for various datatypes in the arguments of the call
    for (var a = 0; a < nodeArgs.length; a++) {
        var argResults = {
            List: false
        };
        var singleArg = nodeArgs[a];
        //extract values from UnaryOp and Subscript nodes
        if (singleArg._astname === "UnaryOp") {
            singleArg = singleArg.operand;
        }
        if (complexityCalculatorHelperFunctions.retrieveFromList(singleArg) != singleArg) {
            var varsIn = [];
            complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);
            var anyOriginality = originality;
            if (!anyOriginality) {
                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                    if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                        anyOriginality = true;
                        break;
                    }
                }
            }
            if (varsIn.length > 0 && anyOriginality) {
                purposeVars = true;
            }
        }
        if (singleArg != null && singleArg._astname === "Subscript") {
            if (originality) {
                if (complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[0]) {
                    results["List"] = 4;
                }
            }
            var varsIn = [];
            complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);
            var anyOriginality = originality;
            if (!anyOriginality) {
                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                    if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                        anyOriginality = true;
                        break;
                    }
                }
            }
            if (varsIn.length > 0 && anyOriginality) {
                purposeVars = true;
            }
        }
        singleArg = complexityCalculatorHelperFunctions.retrieveFromList(singleArg);
        //then - what type of argument is it?
        if (singleArg != null) {
            if (singleArg._astname === "UnaryOp") {
                singleArg = singleArg.operand;
            }
            //special handling for function expressions
            if (singleArg._astname === "FunctionExp") {
                var nameString = "";
                var funcExpOriginality = false;
                nameString += singleArg.lineno + "|" + singleArg.col_offset;
                for (var i in complexityCalculatorState.getProperty('userFunctionParameters')) {
                    if (complexityCalculatorState.getProperty('userFunctionParameters')[i].name === nameString) {
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[i].params.length > 0) {
                            complexityCalculatorState.setProperty('takesArgs', true);
                        }
                        break;
                    }
                }
                if (complexityCalculatorHelperFunctions.getFunctionObject(nameString) != null && complexityCalculatorHelperFunctions.getFunctionObject(nameString).returns != null && complexityCalculatorHelperFunctions.getFunctionObject(nameString).returns !== "") {
                    complexityCalculatorState.setProperty('returns', true);
                }
                if (complexityCalculatorHelperFunctions.getFunctionObject(nameString).originality != null && complexityCalculatorHelperFunctions.getFunctionObject(nameString).originality === true) {
                    funcExpOriginality = true;
                }
                if ((originality || funcExpOriginality) && Number.isInteger(results.userFunc) && results.userFunc < 3) {
                    results.userFunc = 3;
                }
                if (complexityCalculatorState.getProperty('takesArgs') && !returns && results.userFunc === 3) {
                    results.userFunc = "Args";
                } else if (!complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && (results.userFunc === 3)) {
                    results.userFunc = "Returns";
                } else if ((!complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && results.userFunc === "Args") || ((complexityCalculatorState.getProperty('takesArgs') && !returns && results.userFunc === "Returns"))) {
                    results.userFunc = "ReturnAndArgs"
                } else if (complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
                    results.userFunc = "ReturnAndArgs";
                }
                if (functionParametersIndex > -1) {
                    //if a matches an index, make a fake node and recursively analyze
                    for (var paramFunc in complexityCalculatorState.getProperty('userFunctionParameters')[functionParametersIndex].paramFuncsCalled) {
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[functionParametersIndex].paramFuncsCalled[paramFunc].index === a) {
                            //make a fake node
                            var fakeNode = Object.assign({}, complexityCalculatorState.getProperty('userFunctionParameters')[functionParametersIndex].paramFuncsCalled[paramFunc].node);
                            if (singleArg._astname === "Name") {
                                fakeNode.func = Object.assign({}, singleArg);
                                fakeNode.func._astname = "Name";
                                fakeNode._astname = "Call";
                                analyzeFunctionCall(fakeNode, results, loopParent, [], purposeVars);
                            }
                            break;
                        }
                    }
                }
            }
            //if the argument is a call to another function, look up what it contains/returns
            if (singleArg._astname === "Call") {
                var lineNumberToUse = node.lineno;
                //get the name and arguments
                var funcName = "";
                var argFunc = singleArg.func;
                argFunc = complexityCalculatorHelperFunctions.retrieveFromList(argFunc);
                if ('id' in argFunc) {
                    funcName = argFunc.id.v;
                } else if ('attr' in argFunc) {
                    funcName = argFunc.attr.v;
                }
                if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                    argResults["Lists"] = true;
                }
                if (funcName === "readInput") {
                    results.consoleInput = 3;
                }
                //getcomplexityCalculatorState.getProperty('returns')values
                var funcReturn = "";
                var returnContains = [];
                var funcItem = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                if (funcItem != null) {
                    funcReturn = funcItem.returns;
                    if (funcItem.containedValue != null) {
                        returnContains = funcItem.containedValue;
                    }
                    if (funcItem.nested) {
                        purposeVars = true;
                    }
                    if (funcItem.indexAndInput != null && funcItem.indexAndInput.indexed) {
                        results["List"] = 4;
                    }
                } else if (results[funcReturn] < 3 && funcReturn == "List") {
                    argResults[funcReturn] = true;
                }
                if (returnContains != null) {
                    for (var ret = 0; ret < returnContains.length; ret++) {
                        var funcReturnCont = returnContains[ret];
                        if (results[funcReturnCont] < 3) {
                            argResults[funcReturnCont] = true;
                        }
                    }
                }
            } else if (singleArg._astname === 'List') {
                //if it's a list, we also look at and note all the types in the list as being used for a purpose.
                argResults["List"] = true;
                var listInputIndexing = {
                    input: false,
                    indexed: false,
                    strIndexed: false
                };
                var listValues = [];
                if (originality) {
                    var operations = [];
                    listValues = complexityCalculatorHelperFunctions.listTypesWithin(singleArg.elts, listValues, listInputIndexing, operations);
                    if (listInputIndexing.indexed) {
                        results["List"] = 4;
                    }
                } else {
                    listValues = complexityCalculatorHelperFunctions.listTypesWithin(singleArg.elts, listValues, { input: false, indexed: false, strIndexed: false }, []);
                }
                listValues.forEach(function (arg) {
                    argResults[arg] = true;
                });
                if (listInputIndexing.input && originality) {
                    results.consoleInput = 3;
                }
                var varsIn = [];
                complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);
                var anyOriginality = originality;
                if (!anyOriginality) {
                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                        if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                            anyOriginality = true;
                            break;
                        }
                    }
                }
                if (varsIn.length > 0 && anyOriginality) {
                    purposeVars = true;
                }
            } else if (singleArg._astname === 'Name' && singleArg.id.v !== "True" && singleArg.id.v !== "False") {
                //if it's a variable, we mark its value/contained values
                var lineNumberToUse = node.lineno;
                var otherVar = complexityCalculatorHelperFunctions.getVariableObject(singleArg.id.v);
                if (otherVar != null) {
                    purposeVars = true;
                    originalAssignment = otherVar.original;
                    if ((originalAssignment || originality) && otherVar.indexAndInput.indexed) {
                        results["List"] = 4;
                    }
                    if ((otherVar.containedValue != null && otherVar.containedValue.includes("List")) || otherVar.value == "List") {
                        argResults["List"] = true;
                    }
                }
                //check to see if this is a variable whose value has been changed at least once before this call
                var argModded = false;
                var modOriginality = false;
                var modString = "";
                var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                var insideLines = [-1, -1];
                var assignOriginality = false;
                var varType = "";
                var varInput = false;
                var otherVar = complexityCalculatorHelperFunctions.getVariableObject(singleArg.id.v);
                if (otherVar != null) {
                    var numberOfMods = 0;
                    //check if the variable's value has been changed at least once after it was declared
                    //ops done
                    //is the use inside or outside a function?
                    for (var n = 0; n < otherVar.modifyingFunctions.length; n++) {
                        if (node.lineno >= otherVar.modifyingFunctions[n][0] && node.lineno <= otherVar.modifyingFunctions[n][1]) {
                            insideOutside = "inside";
                            insideLines = otherVar.modifyingFunctions[n];
                            break;
                        }
                    }
                    if (insideOutside === "outside") {
                        insideLines = [];
                        for (var n = 0; n < otherVar.modifyingFunctions.length; n++) {
                            for (var line = otherVar.modifyingFunctions[n][0]; line <= otherVar.modifyingFunctions[n][1]; line++) {
                                insideLines.push(line);
                            }
                        }
                    }
                    for (var z = 0; z < otherVar.assignedModified.length; z++) {
                        if (otherVar.assignedModified[z].line > node.lineno) {
                            //stop loop before we get to the current line OR if both things we're looking for are already set to true.
                            break;
                        }
                        //is there a modification? is it original? is it inside/outside the function as appropriate?
                        if (otherVar.assignedModified[z].line <= node.lineno) {
                            if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                argModded = true;
                                numberOfMods += 1;
                                if (otherVar.assignedModified[z].original) {
                                    modOriginality = true;
                                }
                            }
                        }
                    }
                    varType = otherVar.value;
                    varInput = otherVar.indexAndInput.input;
                    //update results object
                    if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                        results.variables = 4;
                    }
                    if (otherVar.original || originality) {
                        if (varInput && results.consoleInput < 3) {
                            results.consoleInput = 3;
                        }
                        if (results.variables < 3) {
                            results.variables = 3;
                        } else if (results[varType] < 3 && varType == "List") {
                            results[varType] = 3;
                        }
                    }
                }
                //update results
                if (originality || assignOriginality || functionOriginality) {
                    if (purposeVars && (results.variables < 3)) {
                        results.variables = 3;
                    }
                    for (let arg in argResults) {
                        if (argResults[arg] && results[arg] < 3 && arg == "List") {
                            results[arg] = 3;
                        }
                    }
                }
            } else if ((singleArg._astname === "BinOp" || singleArg._astname === "BoolOp" || singleArg._astname === "Compare" || singleArg._astname === "List")) {
                if (complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[1])) {
                    results["List"] = 4;
                }
            }
            //for binops, boolops, comparisons, we check what types are inside
            if (singleArg._astname === "BinOp") {
                //Anything in a binOp counts as used for a purpose (e.g. " 'potato' + ' tomato' " passed as an arg counts for strings used for a purpose.
                var withinBinOp = [];
                var binOpComponentOriginality = false;
                var containedInOp = [];
                complexityCalculatorHelperFunctions.getNestedVariables(singleArg, containedInOp);
                for (var u = 0; u < containedInOp.length; u++) {
                    if (complexityCalculatorHelperFunctions.getVariableObject(containedInOp[u]) != null && complexityCalculatorHelperFunctions.getVariableObject(containedInOp[u]).original) {
                        binOpComponentOriginality = true;
                        break;
                    }
                }
                if (originality || binOpComponentOriginality) {
                    if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(singleArg)) && results.listOps < 3) {
                        results.listOps = 3;
                    }
                    if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(singleArg) === "Str" && results.strOps < 3) {
                        results.strOps = 3;
                    }
                }
                if (!originality) {
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, withinBinOp, { input: false, indexed: false, strIndexed: false }, []);
                } else {
                    var inputIndexPurpose = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    var operations = [];
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, withinBinOp, inputIndexPurpose, operations);
                    if (inputIndexPurpose.input) {
                        results.consoleInput = 3;
                    }
                    if (inputIndexPurpose.indexed) {
                        results["List"] = 4;
                    }
                }
                for (var p = 0; p < withinBinOp.length; p++) {
                    if (Array.isArray(withinBinOp[p])) { //if the binop includes a list, go through THAT.
                        argResults["List"] = true;
                    }
                }
            } else if (singleArg._astname === "BoolOp") {
                //if it's a bool op, we need all the values in that
                var boolOpValues = [];
                if (!originality) {
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, boolOpValues, {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    }, []);
                } else {
                    var inputForPurposeInArg = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    var operations = [];
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, boolOpValues, inputForPurposeInArg, operations);
                    if (inputForPurposeInArg.input) {
                        results.consoleInput = 3;
                    }
                    if (inputForPurposeInArg.indexed) {
                        results["List"] = 4;
                    }
                }
                for (var b = 0; b < boolOpValues.length; b++) {
                    argResults[boolOpValues[b]] = true;
                }
            } else if (singleArg._astname === "Compare") {
                //same for comparison statemenrs
                var compareValues = [];
                var indexInputItem = {
                    input: false,
                    indexed: false,
                    strIndexed: false
                };
                if (!originality) {
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, compareValues, { input: false, indexed: false, strIndexed: false }, []);
                } else {
                    var compareInd = false;
                    var compareStrInd = false;
                    var operations = [];
                    complexityCalculatorHelperFunctions.listTypesWithin(singleArg, compareValues, indexInputItem, operations);
                    if (indexInputItem.indexed) {
                        results["List"] = 4;
                    }
                }
                if (indexInputItem.input) {
                    results.consoleInput = 3;
                }
                //update datatype usage bools
                if (compareValues.includes("List")) { argResults["List"] = true; }
            }
            //is it something else that can CONTAIN a variable value? We need to check this for setting results.variables to 3
            if (singleArg._astname === "List" || singleArg._astname === "BinOp" || singleArg._astname === "BoolOp" || singleArg._astname === "Compare") {
                if (singleArg._astname === "Compare" && originality) { results.comparisons = 3; }
                var modOriginality = false;
                var allNamesWithin = [];
                complexityCalculatorHelperFunctions.getNestedVariables(singleArg, allNamesWithin);
                //if ANY of these is marked as original, assignment counts as original
                var originalAssign = false
                for (var n = 0; n < allNamesWithin.length; n++) {
                    var otherVariable = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                    if (otherVariable != null) {
                        var argModded = false;
                        var containedVal = otherVariable.value;
                        var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1];
                        //is the use inside or outside a function?
                        for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                            if (node.lineno >= otherVariable.modifyingFunctions[f][0] && node.lineno <= otherVariable.modifyingFunctions[f][1]) {
                                insideOutside = "inside";
                                insideLines = otherVariable.modifyingFunctions[f];
                                break;
                            }
                        }
                        if (insideOutside === "outside") {
                            insideLines = [];
                            for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                for (var line = otherVariable.modifyingFunctions[f][0]; line <= otherVariable.modifyingFunctions[f][1]; line++) {
                                    insideLines.push(line);
                                }
                            }
                        }
                        var numberOfMods = 0;
                        for (var z = 0; z < otherVariable.assignedModified.length; z++) {
                            if (otherVariable.assignedModified[z].line > node.lineno) { break; }//stop loop before we get to the current line OR if both thigns we're looking for are already set to true.
                            //is there a modification? is it original?
                            if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                argModded = true;
                                numberOfMods += 1;
                                if (otherVariable.assignedModified[z].original) { modOriginality = true; }
                            }
                        }
                        //update results object
                        if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                            results.variables = 4;
                        }
                        if (otherVariable.original || originality) {
                            if (otherVariable.indexAndInput.input) {
                                results.consoleInput = 3;
                            }
                            if (results[containedVal] < 3 && containedVal == "List") {
                                results[containedVal] = 3;
                            }
                        }
                    }
                }
                if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                    results.variables = 3;
                }
            }
            //if anything reaches a new level, update the results.
            if (originality || functionOriginality) {
                if (purposeVars && (results.variables < 3)) {
                    results.variables = 3;
                }
                for (let arg in argResults) {
                    if (argResults[arg] && results[arg] < 3 && arg == "List") {
                        results[arg] = 3;
                    }
                }
            }
        }
    }
    //if the function or its call is original, update in results
    if ((originality || (complexityCalculatorHelperFunctions.getFunctionObject(funcName) != null && complexityCalculatorHelperFunctions.getFunctionObject(funcName).original != null && complexityCalculatorHelperFunctions.getFunctionObject(funcName).original))) {
        if (Number.isInteger(results.userFunc) && results.userFunc < 3 && foundFunc) { results.userFunc = 3; }
        var funcFound = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
        if (funcFound == null) {
            //is it in ForLoopFuncs instead???
            var fLF = null;
            for (var f in complexityCalculatorState.getProperty('forLoopFuncs')) {
                if (complexityCalculatorState.getProperty('forLoopFuncs')[f].callName === funcName) {
                    fLF = complexityCalculatorState.getProperty('forLoopFuncs')[f];
                    break;
                }
            }
            if (fLF != null) {
                //handle variable originality too
                var forLoopOrig = false;
                if (!originality && complexityCalculatorState.getProperty('originalityLines').includes(fLF.startLine)) {
                    //this is done only if the call isn't original, for efficiency's sake
                    forLoopOrig = true;
                }
                if (originality || forLoopOrig) {
                    results.variables = 4;
                }
                for (var otherName in fLF.functionNames) {
                    var otherFunc = complexityCalculatorHelperFunctions.getFunctionObject(fLF.functionNames[otherName]);
                    var paramFuncIndex = -1;
                    if (otherFunc != null) {
                        if (Number.isInteger(results.userFunc) && results.userFunc < 3) {
                            results.userFunc = 3;
                        }
                        for (var f = 0; f < complexityCalculatorState.getProperty('userFunctionParameters').length; f++) {
                            if (complexityCalculatorState.getProperty('userFunctionParameters')[f].name === fLF.functionNames[otherName]) {
                                paramFuncIndex = f;
                                break;
                            }
                        }
                        if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns != null) {
                            complexityCalculatorState.setProperty('returns', true);
                        }
                        if (otherFunc.indexAndInput != null) {
                            if (otherFunc.indexAndInput.indexed) {
                                results["List"] = 4;
                            }
                            if (otherFunc.indexAndInput.input) {
                                results.consoleInput = 3;
                            }
                        }
                        if (complexityCalculatorState.getProperty('userFunctionParameters')[paramFuncIndex].params.length > 0) {
                            complexityCalculatorState.setProperty('takesArgs', true);
                        }
                    }
                }
            }
        } else if (foundFunc) {
            //update results
            if (funcFound != null && funcFound.returns !== "" && funcFound.returns != null) {
                complexityCalculatorState.setProperty('returns', true);
            }
            if (funcFound.indexAndInput != null) {
                if (funcFound.indexAndInput.indexed) {
                    results["List"] = 4;
                }
                if (funcFound.indexAndInput.input) {
                    results.consoleInput = 3;
                }
            }
            if (functionParametersIndex != -1 && complexityCalculatorState.getProperty('userFunctionParameters')[functionParametersIndex].params.length > 0) {
                complexityCalculatorState.setProperty('takesArgs', true);
            }
        }
        if (complexityCalculatorState.getProperty('takesArgs') && !returns && results.userFunc === 3) {
            results.userFunc = "Args";
        } else if (!complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && (results.userFunc === 3)) {
            results.userFunc = "Returns";
        } else if ((!complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && results.userFunc === "Args") || ((complexityCalculatorState.getProperty('takesArgs') && !returns && results.userFunc === "Returns"))) {
            results.userFunc = "ReturnAndArgs"
        } else if (complexityCalculatorState.getProperty('takesArgs') && complexityCalculatorState.getProperty('returns') && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
            results.userFunc = "ReturnAndArgs";
        }
    }
}

// Analyze a single node of a Python AST.
function analyzeASTNode(node, results, loopParent) {
    var isForLoop = false;
    var isWhileLoop = false;
    if (node != null && node._astname != null) {
        var lineNumber = 0;
        if (node.lineno != null) {
            lineNumber = node.lineno;
            complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
        } else {
            lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
        }
        if (!complexityCalculatorState.getProperty('uncalledFunctionLines').includes(lineNumber + 1)) {
            //initilize usage booleans
            var uses = {
                variables: false,
                conditionals: false,
                lists: false,
                consoleInput: false,
                userFunc: false,
                forLoops: false,
                whileLoops: false,
            }
            var usesVarsWithPurpose = false;
            var orElse = false;
            //FIRST, we check for usage of all of our concepts and update the uses object accordingly.
            if (node._astname === 'Assign' || node[0] === 'Assign') {
                uses["variables"] = true;
            }
            if (node._astname === "Name" && node.id.v !== "True" && node.id.v !== "False" && complexityCalculatorHelperFunctions.getVariableObject(node.id.v) != null) {
                uses["variables"] = true;
                if (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber) && results.variables < 2) {
                    results.variables = 2;
                }
            }
            if (node._astname === "UnaryOp") {
                recursiveAnalyzeAST(node.operand, results, loopParent);
            }
            //look for user-defined functions
            if (node._astname === 'FunctionDef') {
                uses["userFunc"] = true;
            }
            //look for conditionals
            if (node._astname === 'If') {
                complexityCalculatorHelperFunctions.notateConditional(node);
                uses["conditionals"] = true;
                if (node.test._astname === "Compare") {
                    usesCompare = true;
                }
                if (node.test._astname === "Name") { usesBooleans = true; }
                if (node.test._astname === "BoolOp" || node.test._astname === "UnaryOp") {
                    usesBooleans = true;
                    var names = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(node.test, names);
                    if (names.length > 0) { usesVarsWithPurpose = true; }
                    var anyOriginalNested = false;
                    for (var i = 0; i < names.length; i++) {
                        var nameItem = complexityCalculatorHelperFunctions.getVariableObject(names[i]);
                        if (nameItem != null && nameItem.original) {
                            anyOriginalNested = true;
                            break;
                        }
                    }
                }
                if ((node.test._astname !== "Name" || node.test.id.v != 'True' || node.test.id.v != 'False') && (node.orelse != null && node.orelse.length > 0)) {
                    orElse = true;
                    recursiveAnalyzeAST(node.orelse, results, loopParent);
                } //is there an "or else" element?
            }
            //look for for loops
            if (node._astname === 'For' || node._astname === "JSFor") {
                uses["forLoops"] = true;
                isForLoop = true;
            }
            //look for while loops
            if (node._astname === 'While') {
                usesWhileLoops = true;
                isWhileLoop = true;
            }
            //look for lists. should also cover lists passed as args.
            if (node._astname === 'List') {
                uses["lists"] = true;
                containerIndex = 0;
            }
            //look for console input
            if ((node.value != null && node.value._astname === 'Call') && ('id' in node.value.func && 'v' in node.value.func.id && node.value.func.id.v === 'readInput')) { uses["consoleInput"] = true; }
            //mark usage of the things we are looknig for
            Object.keys(uses).forEach(function (key) {
                if (uses[key] && results[key] === 0) { results[key] = 1; }
            });
            //Level 2 is originality, so we check that next.
            var originality = false;
            //check for originality
            //if it's a chunk of code we check the whole chunk.
            if (node._astname === 'FunctionDef' || node._astname === 'If' || node._astname === 'While' || node._astname === 'For' || node._astname === "JSFor") {
                //OLD ORIGINALITY - leave these comments here and DO NOT DELETE until we are 100% ready to implement new originality!
                //then we have to check the WHOLE NODE for originality
                lineNumber = node.lineno - 1;
                //lastLine = node.body[node.body.length - 1].lineno + 1;
                var lastLine = complexityCalculatorHelperFunctions.getLastLine(node);
                for (var chunkLine = node.lineno; chunkLine <= lastLine; chunkLine++) {
                    if (complexityCalculatorState.getProperty('originalityLines').includes(chunkLine)) {
                        originality = true;
                        break;
                    }
                }
                //tree originaity, if we ever want to switch to this measure
                // originality = complexityCalculatorHelperFunctions.TreeOriginality(node, 1, STRUCTURE_SAMPLES);
            } else {
                //then this is one line and we only need to check a single line
                lineNumber = 0;
                if (node.lineno != null) {
                    lineNumber = node.lineno;
                    complexityCalculatorState.setProperty('parentLineNumber', lineNumber);
                } else {
                    lineNumber = complexityCalculatorState.getProperty('parentLineNumber');
                }
                originality = (complexityCalculatorState.getProperty('originalityLines').includes(lineNumber));
            }
            //originality value updates for functions, variables, etc.
            if (originality) {
                if (node.id != null && node.id.v != null) {
                    var foundVar = complexityCalculatorHelperFunctions.getVariableObject(node.id.v);
                    if (foundVar != null) {
                        var varName = foundVar.name;
                        for (var f = 0; f < complexityCalculatorState.getProperty('allVariables').length; f++) {
                            if (complexityCalculatorState.getProperty('allVariables')[f].name === varName) {
                                complexityCalculatorState.getProperty('allVariables')[f].original = true; //the variable is assigned in  unique line
                                break;
                            }
                        }
                    }
                }
                //whatever is in here, mark that it's used uniquely.
                var markAsOriginal = ["variables", "consoleInput", "mathematicalOperators", "lists", "listOps", "strOps", "boolOps"];
                for (var attribute = 0; attribute < markAsOriginal.length; attribute++) {
                    if (uses[markAsOriginal[attribute]] && results[markAsOriginal[attribute]] < 2) {
                        results[markAsOriginal[attribute]] = 2;
                    }
                }
                if (node._astname === 'FunctionDef') {
                    if (uses["userFunc"] && (Number.isInteger(results.userFunc) && results.userFunc < 2)) {
                        results.userFunc = 2;
                    }
                    //does this function take arguments or return values? //TODO can we get rid of this???? I fell like it's wrong
                    if (node.args.args.length > 0) {
                        complexityCalculatorState.setProperty('takesArgs', true);
                    }
                    for (var i = 0; i < node.body.length; i++) {
                        if (node.body[i]._astname === 'Return') {
                            complexityCalculatorState.setProperty('returns', true);
                            break;
                        }
                    }
                }
                //what about stuff in for loops (iterators, etc.?) Mark these as original if need be.
                if (node._astname === 'For') {
                    if (uses["forLoops"] && results.forLoops < 2) {
                        results.forLoops = 2;
                    }
                    if (node.iter._astname === "List") {
                        results["List"] = 4;
                    }
                    if (node.iter._astname === "Name") {
                        var iterName = complexityCalculatorHelperFunctions.getVariableObject(node.iter.id.v);
                        if (iterName != null) {
                            if (iterName.value === "List") {
                                results["List"] = 4;
                            }
                        }
                    }
                    if ('func' in node.iter) {
                        if ('id' in node.iter.func && complexityCalculatorHelperFunctions.getFunctionObject(node.iter.func.id.v) != null) {
                            var iterator = complexityCalculatorHelperFunctions.getFunctionObject(node.iter.func.id.v);
                            if (iterator.returns === "List") {
                                results["List"] = 4;
                            }
                        }
                    }
                    //if we're using range(), check for minimum and step values
                    if ('func' in node.iter && 'id' in node.iter.func && node.iter.func.id.v === 'range') {
                        if (node.iter.args.length === 2 && results.forLoops < 3) {
                            results.forLoops = 3;
                        } else if (node.iter.args.length === 3 && results.forLoops < 4) {
                            results.forLoops = 4;
                        }
                    }
                }
                //JSFor
                if (node._astname === 'JSFor' && uses["forLoops"] && results.forLoops < 2) {
                    results.forLoops = 2;
                }
                if (node._astname === 'If') {
                    if (uses["conditionals"] && results.conditionals < 2) {
                        results.conditionals = 2;
                    }
                    if (orElse && results.conditionals < 3) {
                        results.conditionals = 3;
                    }
                }
            }
            if (originality && uses["comparisons"]) {
                results.comparisons = 2;
            }
            //Level 3 is "uses for a purpose" - do that next
            var purposeVars = false;
            //look for purposes for datatypes, variables, lists, ops
            var changesVarsForPurpose = false;
            var originalAssignment = false;
            if (node._astname === 'Call') {
                //at this point, calls are shipped out to a helper function
                analyzeFunctionCall(node, results, loopParent, [], purposeVars);
            }
            //next, we look in conditional statements
            if (node._astname === "If") {
                //variable init
                var argDataTypes = {
                    Float: false,
                    Int: false,
                    String: false,
                    Bool: false,
                    List: false
                }
                purposeVars = false;
                var inputUsed = false;
                containedTypes = [];
                //check the test node
                var testNode = node.test;
                if (testNode._astname === "UnaryOp") {
                    var anyOr = originality;
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testNode, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                anyOr = true;
                                break;
                            }
                        }
                    }
                    if (anyOr) { results["Bool"] = 3; }
                    testNode = testNode.operand;
                }
                //first, go through and grab all the bits of the test statement, whatever that may be
                if (testNode._astname === "Subscript") {
                    var isIndexedItem = complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0];
                    var isStrIndexedItem = complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0];
                    if (isIndexedItem) { results["List"] = 4; }
                    testNode = complexityCalculatorHelperFunctions.retrieveFromList(testNode);
                }
                //unary op handling
                //YES, this is in here twice. That IS intentional. -Erin
                if (testNode != null && testNode._astname === "UnaryOp") {
                    var anyOr = originality;
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testNode, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                anyOr = true;
                                break;
                            }
                        }
                    }
                    testNode = testNode.operand;
                }
                if (testNode != null) {
                    //this won't get checked on its own.
                    recursiveAnalyzeAST(testNode, results, loopParent);
                }
                //check for using for a purpose inside the test
                if (testNode != null && testNode._astname === "Compare") {
                    //update indexing variables
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                        results["List"] = 4;
                    }
                    if (!originality) {
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        }, []);
                    } else {
                        results.comparisons = 3;
                        var inputIndexItem = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };
                        var operations = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexItem, operations);
                        if (inputIndexItem.indexed) {
                            results["List"] = 4;
                        }
                        if (inputIndexItem.input) {
                            inputUsed = true;
                        }
                    }
                } else if (testNode != null && testNode._astname === "BinOp") {
                    //we have to check everything inside the binop's left and right items
                    var inputIndexItem = {
                        indexed: false,
                        input: false,
                        strIndexed: false
                    };
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                        results["List"] = 4;
                    }
                    if (!originality) {
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                            indexed: false,
                            input: false,
                            strIndexed: false
                        }, []);
                    } else {
                        var operations = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexItem, operations);
                    }
                    if (inputIndexItem.indexed) {
                        results["List"] = 4;
                    }
                    if (inputIndexItem.input) {
                        inputUsed = true;
                    }
                } else if (testNode != null && testNode._astname === "BoolOp") {
                    //same for boolops
                    var inputIndexPurp = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                        results["List"] = 4;
                    }
                    if (!originality) {
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        }, []);
                    } else {
                        var operations = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexPurp, operations);
                    }
                    if (inputIndexPurp.indexed) {
                        results["List"] = 4;
                    }
                    if (inputIndexPurp.input) {
                        inputUsed = true;
                    }
                } else if (testNode != null && testNode._astname === "List") {
                    //for lists, we have to check every item
                    var inputIndexPurp = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                        results["List"] = 4;
                    }
                    if (!originality) {
                        containedTypes = complexityCalculatorHelperFunctions.listTypesWithin(testNode.elts, containedTypes, {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        }, []);
                    } else {
                        var operations = [];
                        containedTypes = complexityCalculatorHelperFunctions.listTypesWithin(testNode.elts, containedTypes, inputIndexPurp, operations);
                    }
                    if (inputIndexPurp.indexed) {
                        results["List"] = 4;
                    }
                    if (inputIndexPurp.input) {
                        inputUsed = true;
                    }
                } else if (testNode != null && testNode._astname === "Name") {
                    //grab variable val if it represents a single datatype
                    //also, get information about ops and contained values from the variable
                    if (testNode.id.v !== "True" && testNode.id.v !== "False") {
                        var value = "";
                        var containedValInTest = null;
                        var testVar = complexityCalculatorHelperFunctions.getVariableObject(testNode.id.v);
                        if (testVar != null) {
                            value = testVar.value;
                            if (testVar.indexAndInput.input) {
                                inputUsed = true;
                            }
                            containedValInTest = testVar.containedValue;
                            if (testVar.indexAndInput.indexed && (originality || testVar.original)) {
                                results["List"] = 4
                            }
                        }
                        //update usage booleans
                        argResults[value] = true;
                        if (value === "List" || containedValInTest != null) {
                            for (var k = 0; k < containedValInTest.length; k++) {
                                argResults[containedValInTest[k]] = true;
                            }
                        }
                    } 
                } else if (testNode != null && testNode._astname === "Call") {
                    analyzeASTNode(testNode, results, parent);
                    recursiveAnalyzeAST(testNode, results, parent);
                    var funcName = "";
                    var argList = [];
                    //get function name and args
                    if ('id' in testNode.func) {
                        funcName = testNode.func.id.v;
                        argList = testNode.args;
                    } else {
                        funcName = testNode.func.attr.v;
                    }
                    if (funcName === 'readInput') {
                        inputUsed = true;
                    }
                    //get the return value from the function
                    var callReturnVal = "";
                    var returnFrom = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                    if (returnFrom != null) {
                        callReturnVal = returnFrom.returns;
                        if (returnFrom.containedValue != null) {
                            for (var c = 0; c < returnFrom.containedValue.length; c++) {
                                var returnElement = returnFrom.containedValue[c];
                                argResults[returnElement] = true;
                            }
                        }
                        //update results accordingly
                        if (returnFrom.indexAndInput.indexed && (originality || returnFrom.original)) {
                            results["List"] = 4;
                        }
                        if (returnFrom.indexAndInput.input) {
                            inputUsed = true;
                        }
                        if (returnFrom.nested) {
                            purposeVars = true;
                        }
                    }
                    argResults[callReturnVal] = true;
                }
                recursiveAnalyzeAST(testNode, results, loopParent);
                var modOriginality = false;
                if (testNode != null && testNode._astname === "Name" && testNode.id.v !== "True" && testNode.id.v !== "False") {
                    var originalAssign = false;
                    var varInput = false;
                    var testVariable = complexityCalculatorHelperFunctions.getVariableObject(node.test.id.v);
                    if (testVariable != null) {
                        var argModded = false;
                        var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1];
                        if (testVariable.indexAndInput.input) { varInput = true; }
                        if (testVariable.original) { originalAssign = true; }
                        //is the use inside or outside a function?
                        for (var n = 0; n < testVariable.modifyingFunctions.length; n++) {
                            if (node.lineno >= testVariable.modifyingFunctions[n][0] && node.lineno <= testVariable.modifyingFunctions[n][1]) {
                                insideOutside = "inside";
                                insideLines = testVariable.modifyingFunctions[n];
                                break;
                            }
                        }
                        if (insideOutside === "outside") {
                            insideLines = [];
                            for (var n = 0; n < testVariable.modifyingFunctions.length; n++) {
                                for (var line = testVariable.modifyingFunctions[n][0]; line <= testVariable.modifyingFunctions[n][1]; line++) {
                                    insideLines.push(line);
                                }
                            }
                        }
                        var numberOfMods = 0;
                        for (var z = 0; z < testVariable.assignedModified.length; z++) {
                            if (testVariable.assignedModified[z].line > node.lineno) { break; } //stop loop before we get to the current line OR if both things we're looking for are already set to true.
                            //is there a modification? is it original?
                            if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                argModded = true;
                                numberOfMods += 1;
                                if (testVariable.assignedModified[z].original) { modOriginality = true; }
                            }
                        }
                        if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) { results.variables = 4; }
                    }
                    //update results object
                    if (originalAssign || originality) {
                        if (varInput && results.consoleInput < 3) {
                            results.consoleInput = 3;
                        }
                        if (results.variables < 3) {
                            results.variables = 3;
                        }
                        if ((assignOriginality || originality)) {
                            if (results[varType] != null && varType == "List" && results[varType] < 3) {
                                results[varType] = 3;
                            }
                        }
                    }
                }
                //is the argument something else that can CONTAIN a variable value?
                //This is where we go through and see if any variables are contained in other structures (e.g., a binop or list)
                if (testNode != null && (testNode._astname === "List" || testNode._astname === "BinOp" || testNode._astname === "BoolOp" || testNode._astname === "Compare")) {
                    if (testNode._astname === "Compare" && originality) { results.comparisons = 3; }
                    var originalAssign = false;
                    var varInput = false;
                    var allNamesWithin = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(testNode, allNamesWithin);
                    //if ANY of these is marked as original, assignment counts as original
                    var originalAssign = false
                    for (var n = 0; n < allNamesWithin.length; n++) {
                        var varWithin = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                        if (varWithin != null) {
                            var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1];
                            var argModded = false;
                            var containedVal = varWithin.value;
                            var numberOfMods = 0;
                            //is the use inside or outside a function?
                            for (var i = 0; i < varWithin.modifyingFunctions.length; i++) {
                                if (node.lineno >= varWithin.modifyingFunctions[i][0] && node.lineno <= varWithin.modifyingFunctions[i][1]) {
                                    insideOutside = "inside";
                                    insideLines = varWithin.modifyingFunctions[i];
                                    break;
                                }
                            }
                            if (insideOutside === "outside") {
                                insideLines = [];
                                for (var i = 0; i < varWithin.modifyingFunctions.length; i++) {
                                    for (var line = varWithin.modifyingFunctions[i][0]; line <= varWithin.modifyingFunctions[i][1]; line++) {
                                        insideLines.push(line);
                                    }
                                }
                            }
                            for (var z = 0; z < varWithin.assignedModified.length; z++) {
                                if (varWithin.assignedModified[z].line > node.lineno) {  //stop loop before we get to the current line OR if both things we're looking for are already set to true.
                                    break;
                                }
                                //is there a modification? is it original?
                                if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                    argModded = true;
                                    numberOfMods += 1;
                                    if (varWithin.assignedModified[z].original) {
                                        modOriginality = true;
                                    }
                                }
                            }
                            if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                results.variables = 4;
                            }
                            if (varWithin.original) {
                                originalAssign = true;
                            }
                            //update results
                            if (varWithin.original || originality) {
                                if (results[containedVal] < 3) {
                                    results[containedVal] = 3;
                                }
                            }
                        }
                    }
                    if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                        results.variables = 3;
                    }
                }
            }
            //if it's a for loop (python, or JS for-in), we chack the iterator
            if (node._astname === "For") {
                var datatypesUsed = [];
                var nodeIter = node.iter;
                //get unary-op and subscript sub-values
                if (nodeIter._astname === "UnaryOp") {
                    var anyOr = originality;
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(nodeIter, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                anyOr = true;
                                break;
                            }
                        }
                    }
                    nodeIter = nodeIter.operand;
                }
                nodeIter = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter);
                if (nodeIter._astname === "UnaryOp") { nodeIter = nodeIter.operand; }
                //these won't get anayzed automatically
                analyzeASTNode(node.iter, results, loopParent);
                analyzeASTNode(node.target, results, loopParent);
                //get all of the stuff inside, and update results to match
                if (originality) {
                    var inputTaken = false;
                    if ('func' in nodeIter) {
                        for (var fa = 0; fa < nodeIter.args.length; fa++) {
                            if (nodeIter.args[fa]._astname === "Call" && (nodeIter.args[fa].func.id.v === "readInput" && results.consoleInput < 3)) {
                                results.consoleInput = 3;
                            }
                            if (nodeIter.args[fa]._astname === "BinOp") {
                                //var init
                                var inputIndexItem = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                };
                                var binOpIndex = false;
                                var binOpStrIndex = false;
                                if (originality) { //actually look for stuff if originality
                                    var operations = [];
                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeIter.args[fa], [], inputIndexItem, operations);
                                } else { //feed it empty lists/objects
                                    complexityCalculatorHelperFunctions.listTypesWithin(note.iter.args[fa], [], { input: false, indexed: false, strIndexed: false }, []);
                                }
                                //update results
                                if (inputIndexItem.input && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (inputIndexItem.indexed) {
                                    results["List"] = 4;
                                }
                                if (inputIndexItem.strIndexed) {
                                    results["Str"] = 4;
                                }
                            }
                        }
                    } else if (nodeIter._astname === "List") {
                        //other things are also iterable!
                        if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0]) {
                            results["List"] = 4;
                        }
                        datatypesUsed.push("List");
                        var inputIndexItem = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };
                        var operations = [];
                        var listTypes = complexityCalculatorHelperFunctions.listTypesWithin(nodeIter.elts, [], inputIndexItem, operations);
                        for (var a = 0; a < listTypes.length; a++) {
                            datatypesUsed.push(listTypes[a]);
                        }
                        if (inputIndexItem.indexed) {
                            results["List"] = 4;
                        }
                        if (inputIndexItem.strIndexed) {
                            results["Str"] = 4;
                        }
                        if (inputIndexItem.input) {
                            inputTaken = true;
                        }
                    } else if (nodeIter._astname === "Name") {
                        //iterator is a variable
                        var iteratorVar = complexityCalculatorHelperFunctions.getVariableObject(nodeIter.id.v);
                        if (iteratorVar != null) {
                            if (iteratorVar.value === "List") {
                                results[iteratorVar.value] = 4;
                            }
                            //update results
                            if ((iteratorVar.original || originality) && iteratorVar.indexAndInput.indexed) {
                                results["List"] = 4;
                            }
                            if (iteratorVar.containedValue != null) {
                                for (var cv = 0; cv < iteratorVar.containedValue.length; cv++) {
                                    if (results[iteratorVar.containedValue[cv]] < 3) {
                                        results[iteratorVar.containedValue[cv]] = 3;
                                    }
                                }
                            }
                            if (iteratorVar.indexAndInput.input) {
                                results.consoleInput = 3;
                            }
                        }
                    } else if (nodeIter._astname === "BinOp") {
                        if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0]) {
                            results["List"] = 4;
                        }
                        var iterableBinOpTypes = [];
                        var inputBinOp = false;
                        var isList = Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter));
                        if (isList) {
                            results["List"] = 4;
                        }
                        for (var p = 0; p < iterableBinOpTypes.length; p++) {
                            var typeName = iterableBinOpTypes[p];
                            if (typeName === "List") {
                                results[typeName] = 4;
                            }
                        }
                        if (inputBinOp) {
                            results.consoleInput = 3;
                        }
                    }
                    if (nodeIter._astname === "Call") {
                        var funcName = "";
                        if ('id' in nodeIter.func) {
                            funcName = nodeIter.func.id.v;
                        } else if (nodeIter.func._astname === "Subscript") {
                            var subscriptCall = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func);
                            if (subscriptCall._astname === "Name") {
                                funcName = subscriptCall.id.v;
                            }
                        } else {
                            funcName = nodeIter.func.attr.v;
                        }
                        if (complexityCalculatorState.getProperty('listFuncs').includes(funcName)) {
                            results.listOps = 3;
                        }
                        for (var u = 0; u < complexityCalculatorState.getProperty('userFunctionReturns').length; u++) {
                            if (complexityCalculatorState.getProperty('userFunctionReturns')[u].name === funcName) {
                                results[complexityCalculatorState.getProperty('userFunctionReturns')[u].returns] = 3;
                                if (originality && complexityCalculatorState.getProperty('userFunctionReturns')[u].indexAndInput.indexed) {
                                    results["List"] = 4;
                                }
                            }
                            if (complexityCalculatorState.getProperty('userFunctionReturns')[u].containedValue != null) {
                                for (var cv = 0; cv < complexityCalculatorState.getProperty('userFunctionReturns')[u].containedValue.length; cv++) {
                                    if (complexityCalculatorState.getProperty('userFunctionReturns')[u].containedValue[cv] === "List") {
                                        results["List"] = 4;
                                    } else {
                                        results[complexityCalculatorState.getProperty('userFunctionReturns')[u].containedValue[cv]] = 3;
                                    }
                                }
                            }
                        }
                    }
                    if (inputTaken) {
                        results.consoleInput = 3;
                    }
                }
                var varInput = false;
                //node iter is a function call
                if ('func' in nodeIter) {
                    //get function name
                    var iterFuncName = "";
                    if ('id' in nodeIter.func) {
                        iterFuncName = nodeIter.func.id.v;
                    } else if ('attr' in nodeIter.func) {
                        iterFuncName = nodeIter.func.attr.v;
                    } else if (nodeIter.func._astname === "Subscript") {
                        var iterNameNode = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func);
                        if (iterNameNode._astname === "Name") {
                            iterFuncName = iterNameNode.id.v;
                        }
                        var varsIn = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.func, varsIn);
                        var anyOriginal = originality;
                        if (!anyOriginal) {
                            for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                                    anyOriginal = true;
                                    break;
                                }
                            }
                        }
                        if (anyOriginal && varsIn.length > 0) {
                            purposeVars = true;
                        }
                    }
                    //is it a call to function with a nested variable? let us check
                    var iterArgFunc = complexityCalculatorHelperFunctions.getFunctionObject(iterFuncName);
                    if (iterArgFunc != null && iterArgFunc.nested != null && iterArgFunc.nested) {
                        purposeVars = true;
                    }
                    for (var t = 0; t < nodeIter.args.length; t++) {
                        if (nodeIter.args[t]._astname === "Name") {
                            var argVar = complexityCalculatorHelperFunctions.getVariableObject(nodeIter.args[t].id.v);
                            //get input and indexing
                            if (argVar != null) {
                                if (argVar.indexAndInput.input) {
                                    varInput = true;
                                }
                                if (argVar.indexAndInput.indexed && (argVar.original || originality)) {
                                    results["List"] = 4;
                                }
                            }
                        }
                        //if it's a binop, boolop, list, or call we grab the contained values. We also need to get contained BoolOps.
                        if (nodeIter.args[t]._astname === "Compare" || nodeIter.args[t]._astname === "BoolOp" || nodeIter.args[t]._astname === "List" || nodeIter.args[t]._astname === "BoolOp") {
                            if (nodeIter.args[t]._astname === "Compare" && originality) {
                                results.comparisons = 3;
                            }
                            if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter.args[t])[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter.args[t])[1])) {
                                results["List"] = 4;
                            }
                            var allNamesWithin = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.args[t], allNamesWithin);
                            //if ANY of these is marked as original, assignment counts as original
                            var originalAssign = false
                            for (var n = 0; n < allNamesWithin.length; n++) {
                                var nestedVar = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                                if (nestedVar != null) {
                                    var containedVal = nestedVar.value;
                                    if (nestedVar.indexAndInput.input) {
                                        varInput = true;
                                    }
                                    //update results
                                    if (nestedVar.original || originality) {
                                        if (varInput && results.consoleInput < 3) {
                                            results.consoleInput = 3;
                                        }
                                    }
                                }
                            }
                            if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                                results.variables = 3;
                            }
                        }
                        if (nodeIter.args[t]._astname === "Subscript") {
                            if (nodeIter.args[t].slice._astname === "Index" || nodeIter.args[t].slice._astname === "Slice") {
                                if (nodeIter.args[t].value._astname === "List") {
                                    results["List"] = 4;
                                }
                                if (nodeIter.args[t].value._astname === "Subscript" && (getNestedIndexing(nodeIter.args[t].value))) {
                                    results["List"] = 4;
                                }
                                if (nodeIter.args[t].value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.args[t].value))) {
                                    results["List"] = 4;
                                }
                                if (nodeIter.args[t].value._astname === "Call") {
                                    if ('id' in nodeIter.args[t].value && (complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.args[t].value.id.v) != null && complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.args[t].value.id.v).returns === "List")) {
                                        results["List"] = 4;
                                    }
                                }
                                if (nodeIter.args[t].value._astname === "Name" && (complexityCalculatorHelperFunctions.getVariableObject(nodeIter.args[t].value.id.v).value === "List")) {
                                    results["List"] = 4;
                                }
                            }
                        }
                    }
                }
                //iterating over a list
                if (nodeIter._astname === "List") {
                    var listVars = [];
                    listVars = complexityCalculatorHelperFunctions.getNestedVariables(nodeIter, listVars);
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0] && originality) {
                        results["List"] = 4;
                    }
                    for (var m = 0; m < listVars.length; m++) {
                        var listVariable = complexityCalculatorHelperFunctions.getVariableObject(listVars[m]);
                        if (listVariable != null) {
                            //var init
                            var argModded = false;
                            var modOriginality = false;
                            var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1];
                            //is the use inside or outside a function?
                            for (var n = 0; n < listVariable.modifyingFunctions.length; n++) {
                                if (node.lineno >= listVariable.modifyingFunctions[n][0] && node.lineno <= listVariable.modifyingFunctions[n][1]) {
                                    insideOutside = "inside";
                                    insideLines = listVariable.modifyingFunctions[n];
                                    break;
                                }
                            }
                            if (insideOutside === "outside") {
                                insideLines = [];
                                for (var n = 0; n < listVariable.modifyingFunctions.length; n++) {
                                    for (var line = listVariable.modifyingFunctions[n][0]; line <= listVariable.modifyingFunctions[n][1]; line++) {
                                        insideLines.push(line);
                                    }
                                }
                            }
                            var numberOfMods = 0;
                            for (var z = 0; z < complexityCalculatorState.getProperty('allVariables')[m].assignedModified.length; z++) {
                                if (complexityCalculatorState.getProperty('allVariables')[m].assignedModified[z].line > node.lineno) { break; } //stop loop before we get to the current line OR if both thigns we're looking for are already set to true.
                                //is there a modification? is it original?
                                if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                    argModded = true;
                                    numberOfMods += 1;
                                    if (complexityCalculatorState.getProperty('allVariables')[m].assignedModified[z].original) { modOriginality = true; }
                                }
                            }
                            //update results
                            if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                results.variables = 4;
                            }
                            if (complexityCalculatorState.getProperty('allVariables')[a].nested && (results.variables < 3) && (originality || complexityCalculatorState.getProperty('allVariables')[a].original)) {
                                results.variables = 3;
                            }
                        }
                    }
                }
                //this is separate becuase even if THIS isn't original, something inside it may be
                //it could be a string or list/array that's being iterated over, so check for those and update accordingly
                if (nodeIter._astname === "Subscript") {
                    if (nodeIter.slice._astname === "Index") {
                        if (nodeIter.value._astname === "List") {
                            results["List"] = 4;
                        }
                        if (nodeIter.value._astname === "Subscript") {
                            if (getNestedIndexing(nodeIter.value)[0]) {
                                results["List"] = 4;
                            }
                        }
                        if (nodeIter.value._astname === "BinOp") {
                            if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.value))) {
                                results["List"] = 4;
                            }
                            if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.value) === "Str") {
                                var anyOriginality = false;
                                if (originality) {
                                    anyOriginality = true;
                                } else {
                                    var allVarsIn = [];
                                    complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.value, allVarsIn);
                                    for (var o = 0; o < allVarsIn.length; o++) {
                                        if (complexityCalculatorHelperFunctions.getVariableObject(allVarsIn[o]).original) {
                                            anyOriginality = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (nodeIter.value._astname === "Call") {
                            //is it a listop, concat binop, OR a UDF thatcomplexityCalculatorState.getProperty('returns')a list
                            if (originality) {
                                if ('id' in nodeIter.value && complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.value.id.v) != null && complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.value.id.v).returns === "List") {
                                    results["List"] = 4;
                                }
                                //is it a string op
                                if ('id' in nodeIter.value && complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.value.id.v) != null && complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.value.id.v).returns === "Str") {
                                    results["List"] = 4;
                                }
                            }
                            //is it a UDF and what does it return
                            if ('func' in nodeIter.value) {
                                var isUserFunc = null;
                                isUserFunc = complexityCalculatorHelperFunctions.getFunctionObject(nodeIter.value.func.id.v);
                                if (isUserFunc != null) {
                                    if (isUserFunc.returns === "List" && (originality || isUserFunc.original)) {
                                        results["List"] = 4;
                                    }
                                }
                            }
                        }
                        if (nodeIter.value._astname === "Name") {
                            //is it indexing a variable that contains a list?
                            if (complexityCalculatorHelperFunctions.getVariableObject(nodeIter.value.id.v).value === "List" && (originality || complexityCalculatorHelperFunctions.getVariableObject(nodeIter.value.id.v).original)) {
                                results["List"] = 4;
                            }
                        }
                    }
                }
            }
            if (node._astname === "While") {
                var testItem = node.test;
                if (testItem._astname === "UnaryOp") {
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                break;
                            }
                        }
                    }
                    testItem = testItem.operand;
                }
                if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {
                    //is the thing we're indexing a list?
                    if (testItem.value._astname === "List") {
                        results["List"] = 4;
                    }
                    if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                        results["List"] = 4;
                    }
                    if (testItem.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(testItem.value))) {
                        results["List"] = 4;
                    }
                    if (testItem.value._astname === "Call") {
                        //is it a listop, concat binop, OR a UDF thatcomplexityCalculatorState.getProperty('returns')a list
                        if ('id' in testItem.func) {
                            var calledFunc = getUserFunctionReturn(testItem.func.id.v);
                            if (calledFunc != null && calledFunc.returns === "List") {
                                results["List"] = 4;
                            }
                        }
                    }
                    if (testItem.value._astname === "Name" && complexityCalculatorHelperFunctions.getVariableObject(testItem.value.id.v).value === "List") {
                        results["List"] = 4;
                    }
                }
                testItem = complexityCalculatorHelperFunctions.retrieveFromList(testItem);
                if (testItem._astname === "UnaryOp") {
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                break;
                            }
                        }
                    }
                    testItem = testItem.operand;
                }
                //won't get automatically analyzed
                recursiveAnalyzeAST(testItem, results, loopParent);
                if (testItem._astname === "Call") {
                    //get the function name
                    var funcName = "";
                    var argList = [];
                    if ('id' in testItem.func) {
                        funcName = testItem.func.id.v;
                        argList = testItem.args;
                    } else {
                        funcName = testItem.func.attr.v;
                    }
                    //input or ops used?
                    if (funcName === 'readInput') {
                        inputUsed = true;
                    }
                    if (complexityCalculatorHelperFunctions.getFunctionObject(funcName).indexAndInput.indexed && (originality || complexityCalculatorHelperFunctions.getFunctionObject(funcName).original)) {
                        results["List"] = 4;
                    }
                    //get the rturn value
                    var callReturnVal = "";
                    var calledFunc = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                    if (calledFunc != null) {
                        callReturnVal = calledFunc.returns;
                        if (calledFunc.containedValue != null) {
                            for (var c = 0; c < calledFunc.containedValue.length; c++) {
                                var returnElement = calledFunc.containedValue[c];
                                argResults[returnElement] = true;
                            }
                        }
                        if (calledFunc.indexAndInput.input) {
                            inputUsed = true;
                        }
                        if (originality && calledFunc.indexAndInput.indexed) {
                            results["List"] = 4;
                        }
                        if (calledFunc.nested) {
                            purposeVars = true;
                        }
                    }
                    if (callReturnVal == "List") {
                        argResults[callReturnVal] = true;
                    }
                }
                //now, if it's something that has values within it, we chack through that
                if (testItem._astname === "Compare" || testItem._astname === "List" || testItem._astname === "BinOp" || testItem._astname === "BoolOp") {
                    //var init
                    allTypes = [];
                    var useInput = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    var operations = [];
                    complexityCalculatorHelperFunctions.listTypesWithin(testItem, allTypes, useInput, operations);
                    if (testItem._astname === "Compare" && originality) {
                        results.comparisons = 3;
                    }
                    for (var insideType = 0; insideType < allTypes.length; insideType++) {
                        if (originality) {
                            if (useInput.input && results.consoleInput < 3) {
                                results.consoleInput = 3;
                            }
                            if (results[allTypes[insideType]] < 3) {
                                results[allTypes[insideType]] = 3;
                            }
                        }
                    }
                    var nestedVars = complexityCalculatorHelperFunctions.getNestedVariables(testItem, []);
                    var anyOriginality = false;
                    for (var i = 0; i < nestedVars.length; i++) {
                        var nestVar = complexityCalculatorHelperFunctions.getVariableObject(nestedVars[i]);
                        if (nestVar != null && nestVar.original) {
                            anyOriginality = true;
                            break;
                        }
                    }
                    if (anyOriginality || anyOriginality) {
                        if (useInput.input) {
                            results["List"] = 4;
                        }
                        if (useInput.indexed) {
                            results["List"] = 4;
                        }
                    }
                }
                if (testItem._astname === "Call") {
                    if ('func' in testItem) {
                        if (originality) {
                            var functionName = testItem.func.id.v;
                            var testFunc = complexityCalculatorHelperFunctions.getFunctionObject(functionName);
                            if (testFunc != null) {
                                if (testFunc.nested) {
                                    purposeVars = true;
                                }
                                //input
                                if (testFunc.indexAndInput.input && originality) {
                                    results.consoleInput = 3;
                                }
                                if (testFunc.indexAndInput.indexed) {
                                    results["List"] = 4;
                                }
                                if (testFunc.indexAndInput.strIndexed) {
                                    results["List"] = 4;
                                }
                            }
                        }
                    }
                }
                //if the test is a variable
                if (testItem._astname === "Name") {
                    var argVar = complexityCalculatorHelperFunctions.getVariableObject(testItem.id.v);
                    if (argVar != null) {
                        var varInput = false;
                        if (argVar.indexAndInput.input) {
                            varInput = true;
                        }
                        var assignOriginal = argVar.original;
                        if (originality || assignOriginal) {
                            if (argVar.indexAndInput.indexed) {
                                results["List"] = 4;
                            }
                            var varType = argVar.value;
                            var contained = argVar.containedValue;
                            if (varInput && results.consoleInput < 3) {
                                results.consoleInput = 3;
                            }
                            if (results.variables < 3) {
                                results.variables = 3;
                            }
                            if (varType == "List" && results["List"] < 3) {
                                results[varType] = 3;
                            }
                            if (contained.length > 0) {
                                for (var v = 0; v < contained.length; v++) {
                                    var containedTypeValue = contained[v];
                                    if (results[containedTypeValue] < 3) {
                                        results[containedTypeValue] = 3;
                                    }
                                }
                            }
                        }
                    }
                }
                // if it's a binop, boolop, list, or call we grab the contained values.
                if (testItem._astname === "Compare" || testItem._astname === "BoolOp" || testItem._astname === "List" || testItem._astname === "BoolOp") {
                    if (testItem._astname === "Compare" && originality) {
                        results.comparisons = 3;
                    }
                    // we need variable NAMEs
                    var allNamesWithin = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(testItem, allNamesWithin);
                    //if ANY of these is marked as original, assignment counts as original
                    var originalAssign = false;
                    var varInput = false;
                    for (var n = 0; n < allNamesWithin.length; n++) {
                        var testVariable = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                        if (testVariable != null) {
                            var containedVal = testVariable.value;
                            if (testVariable.indexAndInput.input) { varInput = true; }
                            var containedValList = testVariable.containedValue;
                            if (testVariable.original) { originalAssign = true; }
                            //update results
                            if (testVariable.original || originality) {
                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (results[containedVal] < 3 && containedVal == "List") {
                                    results[containedVal] = 3;
                                }
                                if (containedValList.length > 0) {
                                    for (var v = 0; v < containedValList.length; v++) {
                                        var containedItem = containedValList[v];
                                        if (results[containedItem] < 3) {
                                            results[containedItem] = 3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (allNamesWithin.length > 0 && (originalAssign || originality)) {
                        if (results.variables < 3) {
                            results.variables = 3;
                        }
                    }
                }
            }
            if (node._astname === "Return") {
                //datatypes are already covered as return value from calls.
                //functions are already covered where they are called
                //ops are included in function calls
                //this is only for variables.
                var nodeValue = node.value;
                if (nodeValue != null) {
                    if (nodeValue._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeValue, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results["Bool"] = 3;
                        }
                        nodeValue = nodeValue.operand;
                    }
                    //handle subscript and unaryops
                    if (nodeValue._astname === "Subscript" && (nodeValue.slice._astname === "Index" || nodeValue.slice._astname === "Slice")) {
                        //is the thing we're indexing a list?
                        if (nodeValue.value._astname === "List") {
                            results["List"] = 4;
                        }
                        if (nodeValue.value._astname === "Subscript" && getNestedIndexing(nodeValue.value)) {
                            results["List"] = 4;
                        }
                        if (nodeValue.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeValue.value))) {
                            results["List"] = 4;
                        }
                        if (nodeValue.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF thatcomplexityCalculatorState.getProperty('returns')a list
                            if ('id' in nodeValue.func) {
                                var calledFunc = getUserFunctionReturn(nodeValue.func.id.v);
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results["List"] = 4;
                                }
                            }
                        }
                        if (nodeValue.value._astname === "Name" && complexityCalculatorHelperFunctions.getVariableObject(nodeValue.value.id.v) != null && complexityCalculatorHelperFunctions.getVariableObject(nodeValue.value.id.v).value === "List") {
                            results["List"] = 4;
                        }
                    }
                    nodeValue = complexityCalculatorHelperFunctions.retrieveFromList(nodeValue);
                    if (nodeValue != null && nodeValue._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeValue, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = complexityCalculatorHelperFunctions.getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results["Bool"] = 3;
                        }
                        nodeValue = nodeValue.operand;
                    }
                    //now, get the variable value and contained info
                    if (nodeValue != null && nodeValue._astname === "Name" && nodeValue.id.v !== "True" && nodeValue.id.v !== "False") {
                        //var init
                        var argModded = false;
                        var modOriginality = false;
                        var modString = "";
                        var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1];
                        var assignOriginality = false;
                        var varType = "";
                        var varInput = false;
                        var otherVar = complexityCalculatorHelperFunctions.getVariableObject(nodeValue.id.v);
                        if (otherVar != null) {
                            var numberOfMods = 0;
                            //is the use inside or outside a function?
                            for (var n = 0; n < otherVar.modifyingFunctions.length; n++) {
                                if (node.lineno >= otherVar.modifyingFunctions[n][0] && node.lineno <= otherVar.modifyingFunctions[n][1]) {
                                    insideLines = otherVar.modifyingFunctions[n];
                                    break;
                                }
                            }
                            for (var z = 0; z < otherVar.assignedModified.length; z++) {
                                if (otherVar.assignedModified[z].line > node.lineno) { break; } //stop loop before we get to the current line OR if both thigns we're looking for are already set to true.
                                //is there a modification? is it original? is it inside/outside the function as appropriate?
                                if (otherVar.assignedModified[z].line <= node.lineno) {
                                    if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                        argModded = true;
                                        numberOfMods += 1;
                                        if (otherVar.assignedModified[z].original) { modOriginality = true; }
                                    }
                                }
                            }
                            varType = otherVar.value;
                            varInput = otherVar.indexAndInput.input;
                            //update results
                            if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                results.variables = 4;
                            }
                            if (otherVar.original || originality) {
                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (results.variables < 3) {
                                    results.variables = 3;
                                }
                                if (results[varType] < 3) {
                                    results[varType] = 3;
                                }
                            }
                        }
                    }
                }
            }
            //look for "vars for a purpose" in subscript nodes
            if (node._astname === "Subscript") {
                var nodesToCheck = [];
                if (node.slice._astname === "Index") {
                    nodesToCheck.push(node.slice.value);
                } else if (node.slice._astname === "Slice") {
                    nodesToCheck.push(node.slice.lower);
                    nodesToCheck.push(node.slice.upper);
                }
                for (var e in nodesToCheck) {
                    var nodeToCheck = nodesToCheck[e];
                    if (complexityCalculatorHelperFunctions.retrieveFromList(nodeToCheck) != nodeToCheck) {
                        var varsIn = [];
                        nodeToCheck = complexityCalculatorHelperFunctions.retrieveFromList(nodeToCheck);
                        if (nodeToCheck != null) {
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, varsIn);
                            var anyOriginality = originality;
                            if (!anyOriginality) {
                                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                    if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                                        anyOriginality = true;
                                        break;
                                    }
                                }
                            }
                            if (varsIn.length > 0 && anyOriginality) {
                                purposeVars = true;
                            }
                        }
                    }
                    if (nodeToCheck != null) {
                        if (nodeToCheck._astname === "Subscript") {
                            if (originality) {
                                var isIndexedItem = false;
                                if (nodeToCheck.slice._astname === "Index") {
                                    //is the thing we're indexing a list?
                                    if (nodeToCheck.value._astname === "List") {
                                        isIndexedItem = true;
                                    }
                                    if (nodeToCheck.value._astname === "Subscript" && (getNestedIndexing(nodeToCheck.value))) {
                                        isIndexedItem = true;
                                    }
                                    if (nodeToCheck.value._astname === "BinOp") {
                                        if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeToCheck.value))) {
                                            isIndexedItem = true;
                                        }
                                    }
                                    if (nodeToCheck.value._astname === "Call") {
                                        //is it a listop, OR a UDF thatcomplexityCalculatorState.getProperty('returns')a list
                                        if ('id' in nodeToCheck.value.func) {
                                            var funcList = complexityCalculatorHelperFunctions.getFunctionObject(nodeToCheck.value.func.id.v);
                                            if (funcList != null && funcList.returns === "List") {
                                                isIndexedItem = true;
                                            }
                                        }
                                    }
                                    if (nodeToCheck.value._astname === "Name") {
                                        isIndexedItem = (complexityCalculatorHelperFunctions.getVariableObject(nodeToCheck.value.id.v).value === "List");
                                    }
                                }
                                if (isIndexedItem) {
                                    results["List"] = 4;
                                }
                            }
                            //get any variables nested inside
                            var varsIn = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, varsIn);
                            var anyOriginality = originality;
                            if (!anyOriginality) {
                                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                    if (complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]) != null && complexityCalculatorHelperFunctions.getVariableObject(varsIn[varIn]).original) {
                                        anyOriginality = true;
                                        break;
                                    }
                                }
                            }
                            if (varsIn.length > 0 && anyOriginality) { purposeVars = true; }
                            nodeToCheck = complexityCalculatorHelperFunctions.retrieveFromList(nodeToCheck);
                        }
                        //the node is a function call
                        if (nodeToCheck._astname === "Call") {
                            var lineNumberToUse = node.lineno;
                            // get the function name
                            var funcName = "";
                            var argFunc = nodeToCheck.func;
                            argFunc = complexityCalculatorHelperFunctions.retrieveFromList(argFunc);
                            if ('id' in argFunc) {
                                funcName = argFunc.id.v;
                            } else if ('attr' in argFunc) {
                                funcName = argFunc.attr.v;
                            }
                            if (funcName === "readInput") {
                                results.consoleInput = 3;
                            }
                            var funcReturn = "";
                            var returnContains = [];
                            var funcItem = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                            //update results
                            if (funcItem != null) {
                                funcReturn = funcItem.returns;
                                if (funcItem.containedValue != null) {
                                    returnContains = funcItem.containedValue;
                                }
                                if (funcItem.nested) {
                                    purposeVars = true;
                                }
                                if (funcItem.indexAndInput != null && funcItem.indexAndInput.indexed) {
                                    results["List"] = 4;
                                }
                            }
                            if (results[funcReturn] < 3 && funcReturn == "List") {
                                results[funcReturn] = 3;
                            }
                            if (returnContains != null) {
                                for (var ret = 0; ret < returnContains.length; ret++) {
                                    var funcReturnCont = returnContains[ret];
                                    if (results[funcReturnCont] < 3) {
                                        results[funcReturnCont] = 3;
                                    }
                                }
                            }
                        } else if (nodeToCheck._astname === 'Name' && nodeToCheck.id.v !== "True" && nodeToCheck.id.v !== "False") {
                            //then it's a variable. look up what's in there.
                            purposeVars = true;
                            var lineNumberToUse = node.lineno;
                            var otherVar = complexityCalculatorHelperFunctions.getVariableObject(nodeToCheck.id.v);
                            if (otherVar != null) {
                                originalAssignment = otherVar.original;
                                if ((originalAssignment || originality) && otherVar.indexAndInput.indexed) {
                                    results["List"] = 4;
                                }
                                if (otherVar.containedValue != null) {
                                    for (var c = 0; c < otherVar.containedValue.length; c++) {
                                        argResults[otherVar.containedValue[c]] = true;
                                    }
                                }
                                argResults[otherVar.value] = true;
                            }
                        } else if ((nodeToCheck._astname === "BinOp" || nodeToCheck._astname === "BoolOp" || nodeToCheck._astname === "Compare" || nodeToCheck._astname === "List")) {
                            if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeToCheck)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(nodeToCheck)[1])) {
                                results["List"] = 4;
                            }
                        }
                        if (nodeToCheck._astname === "BinOp") {
                            // ditto with the BinOp
                            //anything in there counts as used for a purpose
                            //(e.g. " 'potato' + ' tomato' " passed as an arg amounts to strings used for a purpose.
                            var withinBinOp = [];
                            var binOpComponentOriginality = false;
                            var containedInOp = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, containedInOp);
                            for (var u = 0; u < containedInOp.length; u++) {
                                if (complexityCalculatorHelperFunctions.getVariableObject(containedInOp[u]) != null && complexityCalculatorHelperFunctions.getVariableObject(containedInOp[u]).original) {
                                    binOpComponentOriginality = true;
                                    break;
                                }
                            }
                            if (originality || binOpComponentOriginality) {
                                if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeToCheck)) && results.listOps < 3) {
                                    results.listOps = 3;
                                }
                                if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeToCheck) === "Str" && results.strOps < 3) {
                                    results.strOps = 3;
                                }
                            }
                            if (!originality) {
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, withinBinOp, {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                }, []);
                            } else {
                                var inputIndexPurpose = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                };
                                var operations = [];
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, withinBinOp, inputIndexPurpose, operations);
                                if (inputIndexPurpose.input) {
                                    results.consoleInput = 3;
                                }
                                if (inputIndexPurpose.indexed) {
                                    results["List"] = 4;
                                }
                            }
                            for (var p = 0; p < withinBinOp.length; p++) {
                                if (Array.isArray(withinBinOp[p])) {
                                    //if the binop includes a list, go through THAT.
                                    lists = true;
                                }
                            }
                        } else if (nodeToCheck._astname === "BoolOp") {
                            var boolOpValues = [];
                            if (!originality) {
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, boolOpValues, {
                                    indexed: false,
                                    input: false,
                                    strIndexed: false
                                }, []);
                            } else {
                                var inputForPurposeInArg = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                };
                                var operations = [];
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, boolOpValues, inputForPurposeInArg, operations);
                                if (inputForPurposeInArg.input) {
                                    results.consoleInput = 3;
                                }
                                if (inputForPurposeInArg.indexed) {
                                    results["List"] = 4;
                                }
                            }
                            boolOpValues[b].forEach(function (arg) {
                                if (arg == "List") { argResults[arg] = true; }
                            });
                        } else if (nodeToCheck._astname === "Compare") {
                            //check all values inside the comparison
                            var compareValues = [];
                            var indexInputItem = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };
                            if (!originality) {
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, compareValues, {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                }, []);
                            } else {
                                var compareInd = false;
                                var compareStrInd = false;
                                var operations = [];
                                complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, compareValues, indexInputItem, operations);
                                if (indexInputItem.indexed) {
                                    results["List"] = 4;
                                }
                            }
                            if (indexInputItem.input) {
                                results.consoleInput = 3;
                            }
                            compareValues[b].forEach(function (arg) {
                                if (arg == "List") { argResults[arg] = true; }
                            });
                        }
                        if (nodeToCheck._astname === "Name" && nodeToCheck.id.v !== "True" && nodeToCheck.id.v !== "False") {
                            var argModded = false;
                            var modOriginality = false;
                            var modString = "";
                            var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1];
                            var assignOriginality = false;
                            var varType = "";
                            var varInput = false;
                            var otherVar = complexityCalculatorHelperFunctions.getVariableObject(nodeToCheck.id.v);
                            if (otherVar != null) {
                                var numberOfMods = 0;
                                //ops done
                                //is the use inside or outside a function?
                                for (var n = 0; n < otherVar.modifyingFunctions.length; n++) {
                                    if (node.lineno >= otherVar.modifyingFunctions[n][0] && node.lineno <= otherVar.modifyingFunctions[n][1]) {
                                        insideOutside = "inside";
                                        insideLines = otherVar.modifyingFunctions[n];
                                        break;
                                    }
                                }
                                if (insideOutside === "outside") {
                                    insideLines = [];
                                    for (var n = 0; n < otherVar.modifyingFunctions.length; n++) {
                                        for (var line = otherVar.modifyingFunctions[n][0]; line <= otherVar.modifyingFunctions[n][1]; line++) {
                                            insideLines.push(line);
                                        }
                                    }
                                }
                                for (var z = 0; z < otherVar.assignedModified.length; z++) {
                                    if (otherVar.assignedModified[z].line > node.lineno) {
                                        //stop loop before we get to the current line OR if both things we're looking for are already set to true.
                                        break;
                                    }
                                    //is there a modification? is it original? is it inside/outside the function as appropriate?
                                    if (otherVar.assignedModified[z].line <= node.lineno) {
                                        if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                            argModded = true;
                                            numberOfMods += 1;
                                            if (otherVar.assignedModified[z].original) {
                                                modOriginality = true;
                                            }
                                        }
                                    }
                                }
                                varType = otherVar.value;
                                varInput = otherVar.indexAndInput.input;
                                if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                    results.variables = 4;
                                }
                                if (otherVar.original || originality) {
                                    if (varInput && results.consoleInput < 3) {
                                        results.consoleInput = 3;
                                    }
                                    if (results.variables < 3) {
                                        results.variables = 3;
                                    }
                                    if (varType === "List" && results["List"] < 3) {
                                        results["List"] = 3;
                                    }
                                }
                            }
                        }
                        //is it something else that can CONTAIN a variable value?
                        if (nodeToCheck._astname === "List" || nodeToCheck._astname === "BinOp" || nodeToCheck._astname === "BoolOp" || nodeToCheck._astname === "Compare") {
                            if (nodeToCheck._astname === "Compare" && originality) {
                                results.comparisons = 3;
                            }
                            var modOriginality = false;
                            var allNamesWithin = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, allNamesWithin);
                            //if ANY of these is marked as original, assignment counts as original
                            var originalAssign = false
                            for (var n = 0; n < allNamesWithin.length; n++) {
                                var otherVariable = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                                if (otherVariable != null) {
                                    var argModded = false;
                                    var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                                    var insideLines = [-1, -1];
                                    //is the use inside or outside a function?
                                    for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                        if (node.lineno >= otherVariable.modifyingFunctions[f][0] && node.lineno <= otherVariable.modifyingFunctions[f][1]) {
                                            insideOutside = "inside";
                                            insideLines = otherVariable.modifyingFunctions[f];
                                            break;
                                        }
                                    }
                                    if (insideOutside === "outside") {
                                        insideLines = [];
                                        for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                            for (var line = otherVariable.modifyingFunctions[f][0]; line <= otherVariable.modifyingFunctions[f][1]; line++) {
                                                insideLines.push(line);
                                            }
                                        }
                                    }
                                    var numberOfMods = 0;
                                    for (var z = 0; z < otherVariable.assignedModified.length; z++) {
                                        if (otherVariable.assignedModified[z].line > node.lineno) {
                                            //stop loop before we get to the current line OR if both things we're looking for are already set to true.
                                            break;
                                        }
                                        //is there a modification? is it original?
                                        if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                            argModded = true;
                                            numberOfMods += 1;
                                            if (otherVariable.assignedModified[z].original) {
                                                modOriginality = true;
                                            }
                                        }
                                    }
                                    if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                        results.variables = 4;
                                    }
                                    if (otherVariable.original || originality) {
                                        if (otherVariable.value === "List" && results["List"] < 3) {
                                            results["List"] = 3;
                                        }
                                    }
                                }
                            }
                            if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                                results.variables = 3;
                            }
                        }
                    }
                    //if anything reaches a new level, update the results.
                    if (originality || originalAssignment) {
                        for (let arg in argResults) {
                            if (argResults[arg] && results[arg] < 3) {
                                results[arg] = 3;
                            }
                        }
                        if (purposeVars && (results.variables < 3)) {
                            results.variables = 3;
                        }
                    }
                }
            }
            //JS for loops have up to 3 components that need to be checked
            if (node._astname === "JSFor") {
                var forLoopArgs = 0;
                if (node.init != null) {
                    if (node.init._astname === "Assign") {
                        var initOrig = originality;
                        var initVars = [];
                        if (!originality) {
                            initVars = complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.getNestedVariables(node.init.targets[0], []), complexityCalculatorHelperFunctions.getNestedVariables(node.init.value, []));
                            for (var i in initVars) {
                                var iVar = complexityCalculatorHelperFunctions.getVariableObject(initVars[i]);
                                if (iVar != null && iVar.original) {
                                    initOrig = true;
                                    break;
                                }
                            }
                        }
                        if (initOrig) {
                            forLoopArgs += 1;
                            if (initVars.length > 0 && results.variables < 3) {
                                results.variables = 3
                            }
                            var typesWithinAssign = [];
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };
                            typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.init.targets[0], typesWithinAssign, assignIn, []);
                            if ('list' in typesWithinAssign && results["List"] < 3) {
                                results["List"] = 3;
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3;
                            }
                            if (assignIn.indexed) {
                                results["List"] = 4;
                            }
                        }
                    }
                    if (node.init._astname === "AugAssign") {
                        //augassign has target and valeu
                        var initOrig = originality;
                        if (results.mathematicalOperators < 1) {
                            results.mathematicalOperators = 1;
                        }
                        var initVars = [];
                        if (!originality) {
                            initVars = complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.getNestedVariables(node.init.target, []), complexityCalculatorHelperFunctions.getNestedVariables(node.init.value, []));
                            for (var i in initVars) {
                                var iVar = complexityCalculatorHelperFunctions.getVariableObject(initVars[i]);
                                if (iVar != null && iVar.original) {
                                    initOrig = true;
                                    break;
                                }
                            }
                        }
                        if (initOrig) {
                            if (results.mathematicalOperators < 3) {
                                results.mathematicalOperators = 3;
                            }
                            if (initVars.length > 0 && results.variables < 3) {
                                results.variables = 3;
                            }
                            forLoopArgs += 1;
                            var typesWithinAssign = [];
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };
                            typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.init.target, typesWithinAssign, assignIn, []);
                            if ('list' in typesWithinAssign && results["List"] < 3) {
                                results["List"] = 3;
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3;
                            }
                            if (assignIn.indexed) {
                                results["List"] = 4;
                            }
                        }
                    }
                }
                //test node is always there. this is a comparison, or a bool, or a boolop. Something thatcomplexityCalculatorState.getProperty('returns')a bool.
                //We'll need typeswithin here as well as any other ops
                var nodeTest = node.test;
                if (nodeTest._astname === "UnaryOp") {
                    nodeTest = nodeTest.operand;
                }
                //is the test node a subscript?
                if (nodeTest._astname === "Subscript" && (nodeTest.slice._astname === "Index" || nodeTest.slice._astname === "Slice")) {
                    //is the thing we're indexing a list?
                    if (nodeTest.value._astname === "List") {
                        results["List"] = 4;
                    }
                    if (nodeTest.value._astname === "Subscript" && getNestedIndexing(nodeTest.value)) {
                        results["List"] = 4;
                    }
                    if (nodeTest.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeTest.value))) {
                        results["List"] = 4;
                    }
                    if (nodeTest.value._astname === "Call") {
                        //is it a listop, concat binop, OR a UDF that returns a list
                        if ('id' in nodeTest.func) {
                            var calledFunc = getUserFunctionReturn(nodeTest.func.id.v);
                            if (calledFunc != null && calledFunc.returns === "List") {
                                results["List"] = 4;
                            }
                        }
                    }
                    if (nodeTest.value._astname === "Name" && complexityCalculatorHelperFunctions.getVariableObject(nodeTest.value.id.v).value === "List") {
                        results["List"] = 4;
                    }
                }
                nodeTest = complexityCalculatorHelperFunctions.retrieveFromList(nodeTest);
                if (nodeTest._astname === "UnaryOp") {
                    nodeTest = nodeTest.operand;
                }
                var nestedVars = [];
                complexityCalculatorHelperFunctions.getNestedVariables(nodeTest, nestedVars);
                var anyOriginal = originality;
                if (!originality) {
                    for (var i in nestedVars) {
                        var isVar = complexityCalculatorHelperFunctions.getVariableObject(nestedVars[i]);
                        if (isVar != null) {
                            if (isVar.original) {
                                anyOriginal = true;
                                break;
                            }
                        }
                    }
                }
                if (anyOriginal) {
                    //we need: datatypes and ops. and contained datatypes. and whether or not any vars are used or nested.
                    if (nestedVars.length > 0 && results.variables < 3) {
                        results.variables = 3
                    }
                    var dataTypesIn = [];
                    var indexingIn = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    dataTypesIn = complexityCalculatorHelperFunctions.listTypesWithin(nodeTest, dataTypesIn, indexingIn, []);
                    var testItem = node.test;
                    //unary and subscript values
                    if (testItem._astname === "UnaryOp") {
                        testItem = testItem.operand;
                    }
                    if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {
                        //is the thing we're indexing a list?
                        if (testItem.value._astname === "List") {
                            results["List"] = 4;
                        }
                        if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                            results["List"] = 4;
                        }
                        if (testItem.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(testItem.value))) {
                            results["List"] = 4;
                        }
                        if (testItem.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF thatcomplexityCalculatorState.getProperty('returns')a list
                            if ('id' in testItem.func) {
                                var calledFunc = getUserFunctionReturn(testItem.func.id.v);
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results["List"] = 4;
                                }
                            }
                        }
                        if (testItem.value._astname === "Name" && complexityCalculatorHelperFunctions.getVariableObject(testItem.value.id.v).value === "List") {
                            results["List"] = 4;
                        }
                    }
                    testItem = complexityCalculatorHelperFunctions.retrieveFromList(testItem);
                    if (testItem._astname === "UnaryOp") {
                        testItem = testItem.operand;
                    }
                    //test item doesn't get auto-analyzed
                    recursiveAnalyzeAST(testItem, results, loopParent);
                    if (testItem._astname === "Call") {
                        var funcName = "";
                        var argList = [];
                        //get the function name
                        if ('id' in testItem.func) {
                            funcName = testItem.func.id.v;
                            argList = testItem.args;
                        } else {
                            funcName = testItem.func.attr.v;
                        }
                        //get indexing and input
                        if (funcName === 'readInput') {
                            inputUsed = true;
                        }
                        if (complexityCalculatorHelperFunctions.getFunctionObject(funcName).indexAndInput.indexed && (originality || complexityCalculatorHelperFunctions.getFunctionObject(funcName).original)) {
                            results["List"] = 4;
                        }
                        var callReturnVal = "";
                        var calledFunc = complexityCalculatorHelperFunctions.getFunctionObject(funcName);
                        //updates results and purpose booleans
                        if (calledFunc != null) {
                            callReturnVal = calledFunc.returns;
                            if (calledFunc.containedValue != null) {
                                calledFunc.containedValue.forEach(function (arg) {
                                    if (argResults[arg]) { argResults[arg] = true; }
                                });
                            }
                            if (calledFunc.indexAndInput.input) {
                                inputUsed = true;
                            }
                            if (originality && calledFunc.indexAndInput.indexed) {
                                results["List"] = 4;
                            }
                            if (calledFunc.nested) {
                                purposeVars = true;
                            }
                        }
                        argResults[callReturnVal] = true;
                        //if the test is a function call
                        if ('func' in testItem) {
                            if (originality) {
                                var functionName = testItem.func.id.v;
                                var testFunc = complexityCalculatorHelperFunctions.getFunctionObject(functionName);
                                if (testFunc != null) {
                                    if (testFunc.nested) {
                                        purposeVars = true;
                                    }
                                    if (testFunc.opsDone != null) {
                                        var testOps = complexityCalculatorHelperFunctions.opsBeforeLine(testFunc.opsDone, node.lineno, "func", testFunc);
                                        if (testOps.includes("BinOp") || testOps.includes("AugAssign")) {
                                            results.mathematicalOperators = 3;
                                        }
                                        if (testOps.includes("BoolOp")) {
                                            results.boolOps = 3;
                                        }
                                        if (testOps.includes("StrOp")) {
                                            results.strOps = 3;
                                        }
                                        if (testOps.includes("ListOp")) {
                                            results.listOps = 3;
                                        }
                                        if (testOps.includes("Compare")) {
                                            results.comparisons = 3;
                                        }
                                    }
                                    //input
                                    if (testFunc.indexAndInput.input && originality) {
                                        results.consoleInput = 3;
                                    }
                                    if (testFunc.indexAndInput.indexed) {
                                        results["List"] = 4;
                                    }
                                    if (testFunc.indexAndInput.strIndexed) {
                                        results["List"] = 4;
                                    }
                                    //contained values
                                    if (testFunc.containedValue != null) {
                                        if (testFunc.containedValue.includes("List") && (results["List"] < 3)) {
                                            results["List"] = 3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    //if storagefor other types of information
                    if (testItem._astname === "Compare" || testItem._astname === "List" || testItem._astname === "BinOp" || testItem._astname === "BoolOp") {
                        allTypes = [];
                        var useInput = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };
                        var operations = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(testItem, allTypes, useInput, operations);
                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3;
                        }
                        //update results from types within?
                        if (originality && allTypes.includes("List") && (results["List"] < 3)) {
                            results["List"] = 3;
                        }
                        var nestedVars = complexityCalculatorHelperFunctions.getNestedVariables(testItem, []);
                        var anyOriginality = false;
                        for (var i = 0; i < nestedVars.length; i++) {
                            var nestVar = complexityCalculatorHelperFunctions.getVariableObject(nestedVars[i]);
                            if (nestVar != null && nestVar.original) {
                                anyOriginality = true;
                                break;
                            }
                        }
                        //input, indexing
                        if (anyOriginality || anyOriginality) {
                            if (useInput.input || useInput.indexed) {
                                results["List"] = 4;
                            }
                        }
                    }
                    //if test item is a variable
                    if (testItem._astname === "Name") {
                        var argVar = complexityCalculatorHelperFunctions.getVariableObject(testItem.id.v);
                        if (argVar != null) {
                            var varInput = false;
                            if (argVar.indexAndInput.input) {
                                varInput = true;
                            }
                            var assignOriginal = argVar.original;
                            if (originality || assignOriginal) {
                                if (argVar.indexAndInput.indexed) {
                                    results["List"] = 4;
                                }
                                var varType = argVar.value;
                                var contained = argVar.containedValue;
                                //update results
                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (results.variables < 3) {
                                    results.variables = 3;
                                }
                                if ((contained.length > 0 && contained.includes("List") && (results["List"] < 3)) || (results[varType] < 3 && varType == "List")) {
                                    results["List"] = 3;
                                }
                            }
                        }
                    }
                    //orrrrr if it's a binop, boolop, list, or call we grab the contained values. wheeee.
                    if (testItem._astname === "Compare" || testItem._astname === "BoolOp" || testItem._astname === "List" || testItem._astname === "BoolOp") {
                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3;
                        }
                        if (testItem._astname === "BinOp" && originality) {
                            results.mathematicalOperators = 3;
                        }
                        //oh we need variable NAMEs hrngh
                        var allNamesWithin = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testItem, allNamesWithin);
                        //if ANY of these is marked as original, assignment counts as original
                        var originalAssign = false;
                        var varInput = false;
                        for (var n = 0; n < allNamesWithin.length; n++) {
                            var testVariable = complexityCalculatorHelperFunctions.getVariableObject(allNamesWithin[n]);
                            if (testVariable != null) {
                                var containedVal = testVariable.value;
                                if (testVariable.indexAndInput.input) {
                                    varInput = true;
                                }
                                var containedValList = testVariable.containedValue;
                                if (containedValList == null) {
                                    containedValList = [];
                                }
                                if (testVariable.original) {
                                    originalAssign = true;
                                }
                                if (testVariable.original || originality) {
                                    if (varInput && results.consoleInput < 3) {
                                        results.consoleInput = 3;
                                    }
                                    if (containedValList.includes(containedVal) && results[containedVal] < 3) {
                                        results[containedVal] = 3;
                                    }
                                }
                            }
                        }
                        if (allNamesWithin.length > 0 && (originalAssign || originality)) {
                            if (results.variables < 3) {
                                results.variables = 3;
                            }
                        }
                    }
                    if ('list' in dataTypesIn && results["List"] < 3) {
                        results["List"] = 3;
                    }
                    if (indexingIn.input) {
                        results.consoleInput = 3;
                    }
                    if (indexingIn.indexed) {
                        results["List"] = 4;
                    }
                }
                //finally, the update function.
                if (node.update != null) {
                    //this should always be an augassign of some sort
                    if (node.update._astname === "AugAssign") {
                        var updateOrig = originality;
                        if (results.mathematicalOperators < 1) {
                            results.mathematicalOperators = 1;
                        }
                        var updateVars = [];
                        if (!originality) {
                            updateVars = complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.getNestedVariables(node.update.target, []), complexityCalculatorHelperFunctions.getNestedVariables(node.update.value, []));
                            for (var i in updateVars) {
                                var iVar = complexityCalculatorHelperFunctions.getVariableObject(updateVars[i]);
                                if (iVar != null && iVar.original) {
                                    updateOrig = true;
                                    break;
                                }
                            }
                        }
                        if (updateOrig) {
                            if (results.mathematicalOperators < 3) {
                                results.mathematicalOperators = 3;
                            }
                            if (updateVars.length > 0 && results.variables < 3) {
                                results.variables = 3
                            }
                            forLoopArgs += 1;
                            var typesWithinAssign = [];
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };
                            typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.update.target, typesWithinAssign, assignIn, []);
                            if ('list' in typesWithinAssign && results["List"] < 3) {
                                results["List"] = 3;
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3;
                            }
                            if (assignIn.indexed) {
                                results["List"] = 4;
                            }
                        }
                    }
                }
                //then we handle forLoopArgs
                if (forLoopArgs === 1 && originality) {
                    //for loops should be at least 3
                    if (results.forLoops < 3) {
                        results.forLoops = 3;
                    }
                }
                if (forLoopArgs === 2 && originality) {
                    //at least 4
                    if (results.forLoops < 4) {
                        results.forLoops = 4;
                    }
                }
            }
            if (purposeVars && (results.variables < 3) && (originality || originalAssignment)) {
                results.variables = 3;
            }
            complexityCalculatorState.setProperty('takesArgs', false);
            complexityCalculatorState.setProperty('returns', false);
            if (loopParent != null) { //this logic is wonky but i promise you it works
                if (isForLoop && loopParent[0] && originality) {
                    results.forLoops = 5;
                }
                if ((isWhileLoop || isForLoop) && (loopParent[0] || loopParent[1]) && originality) {
                    results.forLoops = 5;
                }
                if (loopParent[0] && originality) {
                    isForLoop = true;
                }
                if (loopParent[1] && originality) {
                    isWhileLoop = true;
                }
            }
            //we need to return this information so we know abt nested loops
            return [isForLoop, isWhileLoop];
        }
    }
}

// Recursively analyze a python abstract syntax tree.
export function recursiveAnalyzeAST(ast, results, loopParent) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body);
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]];
            var loopPar = analyzeASTNode(node, results, loopParent);
            recursiveAnalyzeAST(node, results, loopPar);
        }
    } 
    return results;
}