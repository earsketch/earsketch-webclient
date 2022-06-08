/* eslint-disable */
// TODO: Resolve lint issues.

import * as ccState from "./complexityCalculatorState"
import * as ccHelpers from "./complexityCalculatorHelperFunctions"

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

export function getApiCalls() {
    return ccState.getProperty("apiCalls")
}

export function getUserFunctionReturns() {
    return ccState.getProperty("userFunctionReturns")
}

export function getAllVariables() {
    return ccState.getProperty("allVariables")
}

// Translate recorded integer values from the results into human-readable English
function translateIntegerValues(resultsObj) {
    const translatedIntegerValues = {
        0: { "": "Does not Use" },
        1: { "": "Uses" },
        2: {
            consoleInput: "Takes Console Input Originally",
            "": "Uses Original",
        },
        3: {
            forLoops: () => ccState.getProperty("isJavascript") ? "Uses Originally with Two Arguments" : "Uses Originally With Range Min/Max",
            conditionals: "Uses Originally to Follow Multiple Code Paths",
            userFunc: "Uses and Calls Originally",
            consoleInput: "Takes Input Originally and Uses For Purpose",
            "": "Uses Originally For Purpose",
        },
        4: {
            forLoops: () => ccState.getProperty("isJavascript") ? "Uses Originally with Three Arguments" : "Uses Originally With Range Min/Max and Increment",
            variables: "Uses Originally And Transforms Value",
            strings: "Uses And Indexes Originally For Purpose OR Uses Originally And Iterates Upon",
            lists: "Uses And Indexes Originally For Purpose OR Uses Originally And Iterates Upon",
        },
        5: { forLoops: "Uses Original Nested Loops" },
    }
    Object.keys(resultsObj).forEach((key) => {
        const translatorDict = translatedIntegerValues[resultsObj[key]]
        let tempKey = key
        if (!Object.keys(translatorDict).includes(key)) { tempKey = "" }
        resultsObj[key] = translatorDict[tempKey]
        if (typeof (resultsObj[key]) === "function") { resultsObj[key] = resultsObj[key]() }
    })
}

// Fills ccState.getProperty("ccState.getProperty('userFunctionParameters')") list
export function evaluateUserFunctionParameters(ast, results) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]]
            checkForFunctions(node, results)
            evaluateUserFunctionParameters(node, results)
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]]
            checkForFunctions(node, results)
            evaluateUserFunctionParameters(node, results)
        }
    }
}

// Fills ccState.getProperty('allVariables') list
export function gatherAllVariables(ast) {
    if (ast != null && ast.body != null) {
        var astKeys = Object.keys(ast.body)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast.body[astKeys[r]]
            markVariable(node)
            gatherAllVariables(node)
        }
    } else if (ast != null && (ast[0] != null && Object.keys(ast[0]) != null)) {
        var astKeys = Object.keys(ast)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]]
            markVariable(node)
            gatherAllVariables(node)
        }
    }
}

// Adds a variable to ccState.getProperty('allVariables') along with its contents if a node includes a variable assignment.
// Also marks bourdaries of for and while loops for use later
function markVariable(node) {
    let fakeBinOp = null
    let lineNumber = 0
    // Javascript for loops can include both variable declarations and updates (augassign)
    if (node != null && node._astname != null && node._astname === "JSFor") {
        // mark the loop bounds for later labeling of variable value changes.
        var startLine = node.lineno
        var endLine = ccHelpers.getLastLine(node)
        ccState.getProperty("loopLocations").push([startLine, endLine])
        // check the "init" component, and mark variable there if found
        if (node.init != null) {
            markVariable(node.init)
        }
        // ditto with the "update" component, which is often an augAssign
        if (node.update != null && node.update._astname === "AugAssign") {
            markVariable(node.update)
        }
    }
    // While loops just need to have their bounds marked
    if (node != null && node._astname != null && node._astname === "While") {
        ccState.getProperty("loopLocations").push([node.lineno, ccHelpers.getLastLine(node)])
    }
    // Python for loops. Also, JS foreach loops get sent here.
    if (node != null && node._astname != null && node._astname === "For") {
        // mark the loop bounds for later labeling of variable value changes.
        var startLine = node.lineno
        var endLine = ccHelpers.getLastLine(node)
        ccState.getProperty("loopLocations").push([startLine, endLine])
        const nodeIter = node.iter
        if (nodeIter != null) {
            if (node.target._astname === "Name") {
                if (ccHelpers.getVariableObject(node.target.id.v) == null) {
                    // if it's not already stored in a var, we create a new variable object
                    // get the variable's name
                    var varTarget = ccHelpers.retrieveFromList(node.target)
                    if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                        return
                    }
                    const targetName = varTarget.id.v
                    lineNumber = 0
                    var modFunc = []
                    if (node.lineno != null) {
                        lineNumber = node.lineno
                        ccState.setProperty("parentLineNumber", lineNumber)
                    } else {
                        lineNumber = ccState.getProperty("parentLineNumber")
                    }
                    ccState.getProperty("variableAssignments").push({ line: lineNumber, name: targetName })
                }
            }
        }
    }
    if (node != null && node._astname != null && node._astname === "If" && node.orelse != null) {
        gatherAllVariables(node.orelse)
    }
    if (node != null && node._astname != null && node._astname === "Call") {
        const functionNode = ccHelpers.retrieveFromList(node.func)
        if (functionNode != null && "attr" in functionNode) {
            lineNumber = 0
            if (node.lineno != null) {
                lineNumber = node.lineno
                ccState.setProperty("parentLineNumber", lineNumber)
            } else {
                lineNumber = ccState.getProperty("parentLineNumber")
            }
            var modOriginality = (ccState.getProperty("originalityLines").includes(lineNumber))
            var funcName = functionNode.attr.v
            if (ccState.getProperty("listFuncs").includes(funcName)) {
                ccState.getProperty("variableAssignments").push({ line: lineNumber, name: functionNode.value.id.v })
            }
        }
    }
    if (node != null && node._astname != null && node._astname === "AugAssign") {
        lineNumber = 0
        if (node.lineno != null) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }
        var assignLine = node.value.lineno - 1
        var offset = node.value.col_offset
        var valueString = node.op.name + " " + ccState.getProperty("studentCode")[assignLine].substring(offset)
        var indexOfExistingVariableObj = -1
        varTarget = node.target
        if (varTarget._astname = "Subscript") {
            varTarget = varTarget.value
        }
        if (varTarget != null) {
            var varName = varTarget.id.v
            const variableObject = ccHelpers.getVariableObject(varName)
            if (variableObject == null) {
                return
            }
            variableObject.opsDone = ccHelpers.addOpToList("AugAssign", variableObject.opsDone, node.lineno)
            let modificationAlreadyExists = false
            for (var p = 0; p < variableObject.assignedModified.length; p++) {
                if (variableObject.assignedModified[p].value === valueString) {
                    modificationAlreadyExists = true
                    break
                }
            }
            // the infrastructure we have for binops can handle the input and indexing stuff we need to handle, so we make a fake binop here to get that information.
            fakeBinOp = {
                _astname: "BinOp",
                left: node.target,
                right: node.value,
                lineno: lineNumber,
            }
            var nestedBinOp = []
            ccHelpers.getNestedVariables(fakeBinOp, nestedBinOp)
            if (nestedBinOp.length > 0) {
                variableObject.nested = true
            }
            variableObject.opsDone = ccHelpers.addOpToList("BinOp", variableObject.opsDone, node.lineno)
            const binOpTypes = ccHelpers.listTypesWithin(fakeBinOp, [], variableObject.indexAndInput, variableObject.opsDone)
            ccHelpers.appendArray(binOpTypes, variableObject.containedValue)
            if (!modificationAlreadyExists) {
                var lineNo = node.lineno
                for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                    if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                        lineNo = ccState.getProperty("loopLocations")[h][0]
                        break
                    }
                }
                variableObject.assignedModified.push({
                    line: lineNo,
                    value: ccHelpers.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node,
                })
                ccState.getProperty("variableAssignments").push({ line: node.lineno, name: variableObject.name })
                if (isInForLoop) { // push twice for loops
                    variableObject.assignedModified.push({
                        line: lineNo,
                        value: ccHelpers.trimCommentsAndWhitespace(valueString),
                        original: modOriginality,
                        nodeValue: node,
                    })
                }
            }
        }
    }
    if (node != null && node._astname != null && node._astname === "Assign") {
        let containedVal = []
        if ("id" in node.value || node.value._astname === "Subscript" || node.value._astname === "FunctionExp" || node.value._astname === "Call") {
            // if the user is assigning a function to a variable
            let isFunction = false
            let assignedName = ""
            let assignedVal = null
            if (node.value._astname !== "Call") {
                assignedVal = node.value
                isFunction = true
            } else {
                const funcNode = ccHelpers.retrieveFromList(node.value.func)
                if (funcNode._astname === "Name" && ccHelpers.getFunctionObject(funcNode.id.v) != null && ccHelpers.getFunctionObject(funcNode.id.v).returns === "Function") {
                    assignedName = ccHelpers.getFunctionObject(funcNode.id.v).flagVal
                    isFunction = true
                }
            }
            if (isFunction) {
                let subscripted = false
                if (assignedVal != null) {
                    if (assignedVal._astname === "UnaryOp") {
                        containedVal.push("Bool")
                        assignedVal = assignedVal.operand
                    }
                    if (assignedVal != null && typeof assignedVal === "object" &&
                        assignedVal._astname != null && assignedVal._astname === "Subscript" &&
                        ccHelpers.getIndexingInNode(assignedVal)[0]) {
                        subscripted = true
                    }
                    assignedVal = ccHelpers.retrieveFromList(assignedVal)
                    if (assignedVal != null && typeof assignedVal === "object" && assignedVal._astname != null && assignedVal._astname === "UnaryOp") {
                        containedVal.push("Bool")
                        assignedVal = assignedVal.operand
                    }
                    if (assignedVal != null && node.value._astname !== "Call") {
                        if ("id" in assignedVal) {
                            assignedName = assignedVal.id.v
                        } else {
                            assignedName = "" + assignedVal.lineno + "|" + assignedVal.col_offset
                        }
                    }
                }
                if (assignedName !== "") {
                    var varTarget = ccHelpers.retrieveFromList(node.targets[0])
                    if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                        return
                    } else {
                        var varName = varTarget.id.v
                        if (assignedName === "makeBeat" || ccState.getProperty("makeBeatRenames").includes(assignedName)) {
                            // special case if user renames makeBeat
                            ccState.getProperty("makeBeatRenames").push(varName)
                        }
                        for (var n = 0; n < ccState.getProperty("userFunctionParameters").length; n++) {
                            if (ccState.getProperty("userFunctionParameters")[n].name === assignedName) { // double check and make sure its not already in here
                                let alreadyMarked = false
                                for (let j = 0; j < ccState.getProperty("userFunctionParameters").length; j++) {
                                    if (ccState.getProperty("userFunctionParameters")[j].name === varName) {
                                        alreadyMarked = true
                                        break
                                    }
                                }
                                if (!alreadyMarked) {
                                    newFunctionObject = {}
                                    Object.assign(newFunctionObject, ccState.getProperty("userFunctionParameters")[n])
                                    newFunctionObject.name = varName
                                    ccState.getProperty("userFunctionParameters").push(newFunctionObject)
                                }
                            }
                        }
                        for (var p = 0; p < ccState.getProperty("userFunctionReturns").length; p++) {
                            if (assignedName === ccState.getProperty("userFunctionReturns")[p].name) {
                                for (var i = 0; i < ccState.getProperty("userFunctionReturns").length; i++) {
                                    if (ccState.getProperty("userFunctionReturns")[i].name === varName) {
                                        return
                                    } // if it's already been marked we don't need to do anything else.
                                }
                                const newReturn = {}
                                Object.assign(newReturn, ccState.getProperty("userFunctionReturns")[p])
                                newReturn.name = varName
                                if (subscripted) {
                                    newReturn.indexAndInput.indexed = true
                                }
                                ccState.getProperty("userFunctionReturns").push(newReturn)
                                // if the function we're reassigning is a reassign of something else
                                let reassignedFuncName = assignedName
                                for (var n = 0; n < ccState.getProperty("userFunctionRenames"); n++) {
                                    if (ccState.getProperty("userFunctionRenames")[n][0] === reassignedFuncName) {
                                        reassignedFuncName = ccState.getProperty("userFunctionRenames")[n][1]
                                    }
                                }
                                ccState.getProperty("userFunctionRenames").push([varName, reassignedFuncName])
                                return
                            }
                        }
                    }
                    // ELSE if rename of api function, ignore it completely.
                    if (assignedVal != null && ccState.apiFunctions.includes(assignedName)) {
                        return
                    }
                }
            }
        }
        // otherwise we go on to marking the variable
        let listElts = []
        var indexOfExistingVariableObj = -1
        var varTarget = ccHelpers.retrieveFromList(node.targets[0])
        if ((varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript") || varTarget == null) {
            return
        }
        // variable init
        varName = varTarget.id.v
        let inputIndexing = { input: false, indexed: false, strIndexed: false }
        let containsNested = false
        let isNewAssignmentValue = false
        let containsOps = []
        var assignLine = node.value.lineno - 1
        var offset = node.value.col_offset
        var valueString = ccState.getProperty("studentCode")[assignLine].substring(offset)
        const subscriptString = false
        let nodeVal = node.value
        let carryOriginality = false
        let copiedElts = null
        // mark subscripting and listops, if applicable
        if (nodeVal._astname === "Subscript") {
            inputIndexing.strIndexed = ccHelpers.getStringIndexingInNode(node.value)[0]
        }
        nodeVal = ccHelpers.retrieveFromList(nodeVal)
        if (nodeVal != null && nodeVal._astname != null) {
            if (nodeVal._astname === "UnaryOp" || nodeVal._astname === "Compare" || (nodeVal._astname === "Name" && nodeVal.id.v != null && ((nodeVal.id.v === "True" || nodeVal.id.v === "False")))) {
                if (nodeVal._astname === "Compare") {
                    containsOps = ccHelpers.addOpToList("Compare", containsOps, node.lineno)
                    const compareTypes = []
                    ccHelpers.listTypesWithin(nodeVal, compareTypes, inputIndexing, containsOps)
                    containedVal = compareTypes
                }
            } else if (nodeVal._astname === "Name") { // this means it contains the value of another variable or function
                containsNested = true
            }
            if (nodeVal._astname === "List") {
                listElts = nodeVal.elts
                containedVal = ccHelpers.listTypesWithin(nodeVal, containedVal, inputIndexing, containsOps)
                const hasNames = []
                ccHelpers.getNestedVariables(nodeVal, hasNames)
                if (hasNames.length > 0) {
                    containsNested = true
                }
            }
            if (nodeVal._astname === "Call") {
                // special cases for listops and stringop
                var funcName = ""
                if ("id" in nodeVal.func) {
                    funcName = nodeVal.func.id.v
                } else if ("attr" in nodeVal.func) {
                    funcName = nodeVal.func.attr.v
                }
                if (funcName === "readInput") {
                    inputIndexing.input = true
                }
                let isListFunc = false; let isStrFunc = false
                // disambiguation between operations that can be done to strings and lists in JS
                if (ccState.JS_STR_LIST_OVERLAP.includes(funcName) && ccState.getProperty("isJavascript")) {
                    const operationType = ccHelpers.getTypeFromNode(nodeVal.func.value)
                    if (operationType === "List") {
                        isListFunc = true
                    } else if (operationType === "Str") {
                        isStrFunc = true
                    } else if (operationType === "") {
                        isListFunc, isStrFunc = true
                    }
                }
                if ("attr" in nodeVal.func && ccState.getProperty("listFuncs").includes(funcName) && !isStrFunc && funcName !== "shuffleList") {
                    if (nodeVal.func.value._astname === "List") {
                        const valuesInList = ccHelpers.listTypesWithin(nodeVal.func.value, [], inputIndexing, containsOps)
                        for (let vil = 0; vil < valuesInList; vil++) {
                            containedVal.push(valuesInList[vil])
                        }
                    }
                    // binop
                    if (nodeVal.func.value._astname === "BinOp") {
                        const valsInOp = []
                        containsOps = ccHelpers.addOpToList("BinOp", containsOps, node.lineno)
                        ccHelpers.listTypesWithin(nodeVal.func.value, valsInOp, inputIndexing, containsOps)
                        for (let vio = 0; vio < valsInOp.length; vio++) {
                            containedVal.push(valsInOp[vio])
                        }
                    }
                    // func call
                    if (nodeVal.func.value._astname === "Call") {
                        const calledFunction = ccHelpers.getFunctionObject(nodeVal.func.value.id.v)
                        if (calledFunction != null) {
                            if (calledFunction.containedValue != null) {
                                ccHelpers.appendArray(calledFunction.containedValue, containedVal)
                            }
                            if (calledFunction.opsDone != null) {
                                ccHelpers.appendOpList(calledFunction.opsDone, containsOps)
                            }
                        }
                    }
                    // var
                    if (nodeVal.func.value._astname === "Name") { // we have to find the other variable
                        const foundVariable = ccHelpers.getVariableObject(nodeVal.func.value.id.v)
                        if (foundVariable != null) {
                            ccHelpers.appendArray(foundVariable.containedValue, containedVal)
                            containsOps = ccHelpers.appendOpList(foundVariable.opsDone, containsOps)
                        }
                    }
                }
                const assignedFunctionReturn = ccHelpers.getFunctionObject(funcName)
                if (assignedFunctionReturn != null && assignedFunctionReturn.returns !== "" && assignedFunctionReturn.returns !== "BinOp") {
                    if (assignedFunctionReturn.indexAndInput != null) {
                        inputIndexing = assignedFunctionReturn.indexAndInput
                    }
                    if (assignedFunctionReturn.opsDone != null) {
                        containsOps = ccHelpers.appendOpList(assignedFunctionReturn.opsDone, containsOps)
                    }
                    if (assignedFunctionReturn.containedValue != null) {
                        containedVal = ccHelpers.appendArray(assignedFunctionReturn.containedValue, containedVal)
                    }
                    if (assignedFunctionReturn.nodeElements != null && assignedFunctionReturn.nodeElements.length > 0) {
                        copiedElts = []
                        copiedElts.push(assignedFunctionReturn.nodeElements[0])
                    }
                    if (assignedFunctionReturn.original != null && assignedFunctionReturn.original === true) {
                        carryOriginality = true
                    }
                    if (assignedFunctionReturn.nested != null) {
                        containsNested = true
                    }
                }
            }
            if (nodeVal._astname === "BoolOp" || nodeVal._astname === "BinOp" || nodeVal._astname === "Compare" || nodeVal._astname === "List") {
                if (ccHelpers.getIndexingInNode(nodeVal)[0]) {
                    inputIndexing.indexed = true
                }
                if (ccHelpers.getStringIndexingInNode(nodeVal)[0]) {
                    inputIndexing.strIndexed = true
                }
            }
            if (nodeVal._astname === "BoolOp") { // see what's inside in case there are other variables in the boolop
                const nestedVariables = []
                ccHelpers.getNestedVariables(nodeVal, nestedVariables)
                containsOps = ccHelpers.addOpToList("BoolOp", containsOps, node.lineno)
                if (nestedVariables.length > 0) {
                    containsNested = true
                }
                const boolOpVals = []
                ccHelpers.listTypesWithin(nodeVal, boolOpVals, inputIndexing, containsOps)
                if (boolOpVals.length > 0) {
                    containedVal = boolOpVals
                }
            }
            if (nodeVal._astname === "BinOp") {
                // If it's a BinOp, recursively analyze and include in containedValue.
                // also, see if other variables are in the BinOp (which actually happens first)
                var nestedBinOp = []
                ccHelpers.getNestedVariables(nodeVal, nestedBinOp)
                if (nestedBinOp.length > 0) {
                    containsNested = true
                }
                if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeVal))) {
                    listElts = ccHelpers.getAllBinOpLists(nodeVal)
                }
                containsOps = ccHelpers.addOpToList("BinOp", containsOps, node.lineno)
                containedVal = ccHelpers.listTypesWithin(nodeVal, [], inputIndexing, containsOps)
            }
        }
        // if we have ANY kind of information, add the variable to the list; or, if the variable is already in the list, update the value.
        for (var i = 0; i < ccState.getProperty("allVariables").length; i++) {
            if (ccState.getProperty("allVariables")[i].name === varName) {
                indexOfExistingVariableObj = i
                break
            }
        }
        if (indexOfExistingVariableObj === -1) {
            var invalidTransformation = false // This gets set to true if the variable's value is being set to itself, ex. myVariable = myVariable.
            if (node.value._astname === "Name" && node.targets[0].id.v === node.value.id.v) {
                invalidTransformation = true
            }
            lineNumber = 0
            var modFunc = []
            if (node.lineno != null) {
                lineNumber = node.lineno
                ccState.setProperty("parentLineNumber", lineNumber)
            } else {
                lineNumber = ccState.getProperty("parentLineNumber")
            }
            var modOriginality = (ccState.getProperty("originalityLines").includes(lineNumber))
            if (!invalidTransformation) { // if this is within a function and part of the function's params, we need to note that here.
                for (var u = 0; u < ccState.getProperty("userFunctionReturns").length; u++) {
                    if (node.lineno >= ccState.getProperty("userFunctionReturns")[u].startLine && node.lineno <= ccState.getProperty("userFunctionReturns")[u].endLine) {
                        var paramIndex = -1 // ok, it's in the function, is it a param?
                        for (let a = 0; a < ccState.getProperty("userFunctionParameters").length; a++) {
                            if (ccState.getProperty("userFunctionParameters")[a].name === ccState.getProperty("userFunctionReturns")[u].name) {
                                for (var p = 0; p < ccState.getProperty("userFunctionParameters")[a].params.length; p++) {
                                    if (ccState.getProperty("userFunctionParameters")[a].params[p] === varName) {
                                        paramIndex = p
                                        break
                                    }
                                }
                                break
                            }
                        }
                        if (paramIndex > -1) {
                            ccState.getProperty("userFunctionReturns")[u].paramsChanged.push(paramIndex)
                            modFunc.push([ccState.getProperty("userFunctionReturns")[u].startLine, ccState.getProperty("userFunctionReturns")[u].endLine])
                        }
                        break
                    }
                }
            }
            if (copiedElts == null) {
                copiedElts = []
            }
            if (listElts.length > 0) {
                copiedElts.push({
                    line: node.lineno,
                    elts: listElts,
                })
            }
            var eltsToList = []
            for (var o = 0; o < copiedElts.length; o++) {
                eltsToList.push({
                    line: copiedElts[o].line,
                    elts: ccHelpers.nodesToStrings(copiedElts[o].elts, node.lineno),
                })
            }
            const userVariable = {
                name: varName,
                containedValue: containedVal,
                indexAndInput: {
                    input: inputIndexing.input,
                    indexed: inputIndexing.indexed,
                    strIndexed: inputIndexing.strIndexed,
                },
                nested: containsNested,
                original: carryOriginality,
                opsDone: containsOps,
                assignedModified: [],
                modifyingFunctions: modFunc,
                nodeElements: copiedElts,
                stringElements: eltsToList,
            }
            if (!invalidTransformation) {
                var lineNo = node.lineno
                let insideForLoop = false
                for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                    if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                        lineNo = ccState.getProperty("loopLocations")[h][0]
                        insideForLoop = true
                        break
                    }
                }
                userVariable.assignedModified.push({
                    line: lineNo,
                    value: ccHelpers.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node.value,
                })
                // if we're inside a for loop we actually add this twice.
                if (insideForLoop) {
                    userVariable.assignedModified.push({
                        line: lineNo,
                        value: ccHelpers.trimCommentsAndWhitespace(valueString),
                        original: modOriginality,
                        nodeValue: node.value,
                    })
                }
            }
            ccState.getProperty("allVariables").push(userVariable)
            ccState.getProperty("variableAssignments").push({ line: node.lineno, name: userVariable.name })
        } else {
            var invalidTransformation = false // This gets set to true if the variable's value is being set to itself, ex. potato = potato.
            if (node.value._astname === "Name" && "id" in node.targets[0] && node.targets[0].id.v === node.value.id.v) {
                invalidTransformation = true
            }
            if (copiedElts == null) {
                copiedElts = []
            }
            if (listElts.length > 0) {
                copiedElts.push({
                    line: node.lineno,
                    elts: listElts,
                })
            }
            var eltsToList = []
            for (var o = 0; o < copiedElts.length; o++) {
                eltsToList.push({
                    line: copiedElts[0].line,
                    elts: ccHelpers.nodesToStrings(copiedElts[o].elts),
                })
            }
            ccHelpers.appendArray(copiedElts, ccState.getProperty("allVariables")[indexOfExistingVariableObj].nodeElements)
            ccHelpers.appendArray(eltsToList, ccState.getProperty("allVariables")[indexOfExistingVariableObj].stringElements)
            if (inputIndexing.input) {
                ccState.getProperty("allVariables")[indexOfExistingVariableObj].indexAndInput.input = true
            }
            if (inputIndexing.indexed) {
                ccState.getProperty("allVariables")[indexOfExistingVariableObj].indexAndInput.indexed = true
            }
            if (inputIndexing.strIndexed) {
                ccState.getProperty("allVariables")[indexOfExistingVariableObj].indexAndInput.strIndexed = true
            }
            let assignmentExists = false
            for (var p = 0; p < ccState.getProperty("allVariables")[indexOfExistingVariableObj].assignedModified.length; p++) {
                if (ccState.getProperty("allVariables")[indexOfExistingVariableObj].assignedModified[p].value === valueString) {
                    assignmentExists = true
                    break
                }
            }
            if (!assignmentExists && !invalidTransformation) {
                isNewAssignmentValue = true
            }
            if (isNewAssignmentValue) {
                lineNumber = 0
                if (node.lineno != null) {
                    lineNumber = node.lineno
                    ccState.setProperty("parentLineNumber", lineNumber)
                } else {
                    lineNumber = ccState.getProperty("parentLineNumber")
                }
                var modOriginality = (ccState.getProperty("originalityLines").includes(lineNumber))
                var lineNo = node.lineno
                for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                    if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                        lineNo = ccState.getProperty("loopLocations")[h][0]
                        break
                    }
                }
                ccState.getProperty("allVariables")[indexOfExistingVariableObj].assignedModified.push({
                    line: lineNo,
                    value: ccHelpers.trimCommentsAndWhitespace(valueString),
                    original: modOriginality,
                    nodeValue: node.value,
                })
                ccState.getProperty("variableAssignments").push({ line: node.lineno, name: ccState.getProperty("allVariables")[indexOfExistingVariableObj].name })
                for (let uf = 0; uf < ccState.getProperty("userFunctionParameters").length; uf++) { // is this variable a parameter in this function? if so, what's its parameter index?
                    var paramIndex = -1
                    for (let pa = 0; pa < ccState.getProperty("userFunctionParameters")[uf].params.length; pa++) {
                        if (ccState.getProperty("userFunctionParameters")[uf].params[pa] === varName) {
                            paramIndex = pa
                            break
                        }
                    }
                    if (paramIndex > -1) { // ok it's a param in this func. NOW we see if it's within the lines of the function
                        let ufReturnIndex = -1
                        for (var u = 0; u < ccState.getProperty("userFunctionReturns").length; u++) {
                            if (userFunctionReturns[u].name === ccState.getProperty("userFunctionParameters")[uf].name) {
                                ufReturnIndex = u
                                break
                            }
                        }
                        if (ufReturnIndex > -1) { // this should NEVER be false. but, ya know. safety. or because we needed another if statement. your choice.
                            if (node.lineno > ccState.getProperty("userFunctionReturns")[ufReturnIndex].startLine && node.lineno <= ccState.getProperty("userFunctionReturns")[ufReturnIndex].endLine) {
                                ccState.getProperty("userFunctionReturns")[ufReturnIndex].paramsChanged.push(paramIndex)
                            } // then THIS is a change TO THE FUNCTION'S PARAMETER, WITHIN THAT FUNCTION. AKA this function modifies the value of this parameter.
                        }
                    }
                }
            }
            ccHelpers.appendOpList(containsOps, ccState.getProperty("allVariables")[indexOfExistingVariableObj].opsDone)
        }
    }
}

// Handles re-visiting all of the variables, functions, and subscript values where we didn't know the datatype at the time
// Traverses through lists of function and variable objects, and finds values for those that don't have them
export function evaluateAllEmpties() {
    // function objects
    for (var r = 0; r < ccState.getProperty("userFunctionReturns").length; r++) {
        if (ccState.getProperty("userFunctionReturns")[r].returns === "") {
            if (ccState.getProperty("userFunctionReturns")[r].funcVar === "var") {
                // if itccState.getProperty('returns')a variable  we look it up in the variable dictionary
                const returnedVariable = ccHelpers.getVariableObject(ccState.getProperty("userFunctionReturns")[r].flagVal)
                if (returnedVariable != null && returnedVariable.value !== "" && returnedVariable.value !== "BinOp") {
                    ccState.getProperty("userFunctionReturns")[r].flagVal = ""
                    ccState.getProperty("userFunctionReturns")[r].funcVar = ""
                    ccState.getProperty("userFunctionReturns")[r].returns = returnedVariable.value
                    ccHelpers.copyAttributes(returnedVariable, ccState.getProperty("userFunctionReturns")[r], ["indexAndInput"])
                    // get the latest version of the variable's node elements before the function is declared, and assign that to the function object's node elements.
                    if (returnedVariable.nodeElements != null && returnedVariable.nodeElements.length > 0) {
                        let nodeElementsIndex = -1
                        for (let t = 0; t < returnedVariable.nodeElements.length - 1; t++) {
                            if (returnedVariable.nodeElements[t].line > ccState.getProperty("userFunctionReturns")[r].endLine) {
                                break
                            }
                            if (returnedVariable.nodeElements[t].line > ccState.getProperty("userFunctionReturns")[r].startLine && returnedVariable.nodeElements[t + 1].line > ccState.getProperty("userFunctionReturns")[r].endLine) {
                                nodeElementsIndex = t
                            }
                        }
                        if (nodeElementsIndex === -1 &&
                            returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line >= ccState.getProperty("userFunctionReturns")[r].startLine &&
                            returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line <= ccState.getProperty("userFunctionReturns")[r].endLine) {
                            nodeElementsIndex = returnedVariable.nodeElements.length - 1
                        }
                        if (nodeElementsIndex === -1) {
                            nodeElementsIndex = 0
                        }
                        ccState.getProperty("userFunctionReturns")[r].nodeElements = [returnedVariable.nodeElements[nodeElementsIndex]]
                        ccState.getProperty("userFunctionReturns")[r].stringElements = [returnedVariable.stringElements[nodeElementsIndex]]
                    }
                    // append any opsDone and containedValue items from the variable to the corresponding items in the function objec.t
                    ccHelpers.appendArray(returnedVariable.containedValue, ccState.getProperty("userFunctionReturns")[r].containedValue)
                    ccState.getProperty("userFunctionReturns")[r].opsDone = ccHelpers.appendOpList(returnedVariable.opsDone, ccState.getProperty("userFunctionReturns")[r].opsDone)
                }
            } else if (ccState.getProperty("userFunctionReturns")[r].funcVar === "func" && ccState.getProperty("userFunctionReturns")[r].name != ccState.getProperty("userFunctionReturns")[r].flag) {
                // if it returns a call to another function, copy the information from that function.
                // This prevents us from getting stuck recursing forever
                const returnedFunc = ccHelpers.getFunctionObject(ccState.getProperty("userFunctionReturns")[r].flagVal)
                if (returnedFunc != null && returnedFunc.returns !== "" && returnedFunc.returns !== "BinOp") {
                    ccState.getProperty("userFunctionReturns")[r].funcVar = ""
                    // copy relevant information
                    ccHelpers.copyAttributes(returnedFunc, ccState.getProperty("userFunctionReturns")[r], ["returns", "indexAndInput", "nested", "nodeElements", "stringElements"])
                    if (returnedFunc.containedValue != null) {
                        ccHelpers.appendArray(returnedFunc.containedValue, ccState.getProperty("userFunctionReturns")[r])
                    }
                }
            }
        }
        // go through all of the objects in the function's nodeElements and evaluate them, creating fake nodes
        if (ccState.getProperty("userFunctionReturns")[r].nodeElements != null && ccState.getProperty("userFunctionReturns")[r].nodeElements.length > 0 && ccState.getProperty("userFunctionReturns")[r].nodeElements[0] != null) {
            for (var i in ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts) {
                if (ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i]._astname == null &&
                    typeofccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i] === "object" &&
                    "left" in ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i]) {
                    var eltsValue = { lineno: ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i].lineno }
                    eltsValue._astname = ccHelpers.recursivelyEvaluateBinOp(ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i])
                    if (eltsValue._astname === "Int") {
                        eltsValue._astname = "Num"
                        eltsValue.n = { v: 1 }
                    }
                    if (eltsValue._astname === "Float") {
                        eltsValue._astname = "Num"
                        eltsValue.n = { v: 1.57 }
                    }
                    if (eltsValue._astname === "List") {
                        eltsValue.elts = []
                    }
                    if (eltsValue._astname === "Bool") {
                        eltsValue._astname = "Name"
                        eltsValue.id = { v: "True" }
                    }
                    ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts[i] = eltsValue
                }
            }
            ccState.getProperty("userFunctionReturns")[r].stringElements[0] = ccHelpers.nodesToStrings(ccState.getProperty("userFunctionReturns")[r].nodeElements[0].elts, ccState.getProperty("userFunctionReturns")[r].nodeElements[0].line)
        }
        // If we have an un-evaluated subscript, do that now
        if (ccState.getProperty("userFunctionReturns")[r].returns === "Subscript") {
            // its an index or a slice
            var indexValue = ccHelpers.retrieveFromList(ccState.getProperty("userFunctionReturns")[r].flagVal)
            if (ccHelpers.getIndexingInNode(ccState.getProperty("userFunctionReturns")[r].returns)[0]) {
                ccState.getProperty("userFunctionReturns")[r].indexAndInput.indexed = true
            }
            if (ccHelpers.getStringIndexingInNode(ccState.getProperty("userFunctionReturns")[r].returns)[0]) {
                ccState.getProperty("userFunctionReturns")[r].indexAndInput.strIndexed = true
            }
            if (indexValue != null) {
                // We know what it is.
                ccState.getProperty("userFunctionReturns")[r].opsDone = ccHelpers.addOpToList("ListOp", ccState.getProperty("userFunctionReturns")[r].opsDone, indexValue.lineno)
                ccState.getProperty("allVariables").flagVal = "" // this may get reset to something down below, which is fine and 100% intentional.
                indexValue = ccHelpers.retrieveFromList(indexValue)
                if (indexValue._astname === "Name") {
                    // it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName
                    if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                        // boolean
                        ccState.getProperty("userFunctionReturns")[r].returns = "Bool"
                    }
                    // otherwise, it's a variable object
                    var indexVar = ccHelpers.getVariableObject(indexValue.id.v)
                    if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {
                        ccHelpers.copyAttributes(indexVar, ccState.getProperty("userFunctionReturns")[r], ["value", "binOp", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"])
                        ccState.getProperty("userFunctionReturns")[r].opsDone = ccHelpers.appendOpList(indexVar.opsDone, ccState.getProperty("userFunctionReturns")[r].opsDone)
                        ccHelpers.appendArray(indexVar.containedValue, ccState.getProperty("userFunctionReturns")[r].containedValue)
                    } else if (indexVar != null && indexVar.value === "") {
                        ccState.getProperty("userFunctionReturns")[r].returns = ""
                        ccState.getProperty("userFunctionReturns")[r].flagVal = "var:" + indexVar.name
                    } else if (indexVar == null && ccHelpers.getFunctionObject(indexValue.id.v) != null) {
                        for (var n = 0; n < ccState.getProperty("userFunctionParameters").length; n++) {
                            if (ccState.getProperty("userFunctionParameters")[n].name === ccState.getProperty("userFunctionReturns")[r].name) { // double check and make sure its not already in here
                                var alreadyMarked = false
                                for (var j = 0; j < ccState.getProperty("userFunctionParameters").length; j++) {
                                    if (ccState.getProperty("userFunctionParameters")[j].name === indexValue.id.v) {
                                        alreadyMarked = true
                                        break
                                    }
                                }
                                if (!alreadyMarked) {
                                    newFunctionObject = {}
                                    Object.assign(newFunctionObject, ccState.getProperty("userFunctionParameters")[n])
                                    newFunctionObject.name = indexValue.id.v
                                    ccState.getProperty("userFunctionParameters").push(newFunctionObject)
                                }
                                break
                            }
                        }
                        for (var p = 0; p < ccState.getProperty("userFunctionReturns").length; p++) {
                            if (ccState.getProperty("userFunctionReturns")[r].name === ccState.getProperty("userFunctionReturns")[p].name) {
                                var alreadyMarked = false
                                for (var i = 0; i < ccState.getProperty("userFunctionReturns").length; i++) {
                                    if (ccState.getProperty("userFunctionReturns")[i].name === indexValue.id.v) {
                                        alreadyMarked = true
                                        break
                                    } // if it's already been marked we don't need to do anything else.
                                }
                                if (alreadyMarked) {
                                    break
                                }
                                const newReturn = {}
                                Object.assign(newReturn, ccState.getProperty("userFunctionReturns")[p])
                                newReturn.name = indexValue.id.v
                                newReturn.indexAndInput.indexed = true
                                ccState.getProperty("userFunctionReturns").push(newReturn)
                                // if the function we're reassigning is a reassign of something else
                                let reassignedFuncName = ccState.getProperty("userFunctionReturns")[r].name
                                for (var n = 0; n < ccState.getProperty("userFunctionRenames"); n++) {
                                    if (ccState.getProperty("userFunctionRenames")[n][0] === reassignedFuncName) {
                                        reassignedFuncName = ccState.getProperty("userFunctionRenames")[n][1]
                                    }
                                }
                                ccState.getProperty("userFunctionRenames").push([indexValue.id.v, reassignedFuncName])
                                break
                            }
                        }
                    }
                } else if (indexValue._astname === "Call") {
                    // it's a function call
                    var alreadyTallied = false
                    if ("id" in indexValue.func || indexValue.func._astname === "Subscript" || ccHelpers.retrieveFromList(indexValue.func) != indexValue.func) {
                        var funcName = ""
                        // get the function name
                        if ("id" in indexValue.func) {
                            funcName = indexValue.func.id.v
                        } else {
                            var functionNameNode = null
                            functionNameNode = ccHelpers.retrieveFromList(indexValue.func)
                            if (functionNameNode != null && functionNameNode._astname === "Name") {
                                funcName = functionNameNode.id.v
                            }
                        }
                        // get the function object and copy values from it
                        var userFunctionCalled = ccHelpers.getFunctionObject(funcName)
                        if (userFunctionCalled != null && userFunctionCalled.returns !== "") {
                            ccState.getProperty("userFunctionReturns")[r].returns = userFunctionCalled.returns
                            ccHelpers.copyAttributes(userFunctionCalled, ccState.getProperty("userFunctionReturns")[r], ["binOp", "nested", "original", "indexAndInput", "nodeElements", "stringElements"])
                            ccHelpers.appendArray(userFunctionCalled.containedValue, ccState.getProperty("userFunctionReturns")[r].containedValue)
                            if (userFunctionCalled.opsDone != null) {
                                ccState.getProperty("userFunctionReturns")[r].opsDone = ccHelpers.appendOpList(userFunctionCalled.opsDone, ccState.getProperty("userFunctionReturns")[r].opsDone)
                            }
                        }
                        alreadyTallied = true
                    }
                } else if (indexValue._astname === "Num") {
                    // ints, floats
                    ccState.getProperty("userFunctionReturns")[r].returns = ccHelpers.isNodeFloat(indexValue) ? "Float" : "Int"
                } else if (indexValue._astname === "Compare" || indexValue._astname === "BoolOp") {
                    // comparisons and boolops both become booleans and stored in containedValue
                    ccState.getProperty("userFunctionReturns")[r].returns = "Bool"
                    ccHelpers.listTypesWithin(indexValue, ccState.getProperty("userFunctionReturns")[r].containedValue, ccState.getProperty("userFunctionReturns")[r].indexAndInput, ccState.getProperty("userFunctionReturns")[r].opsDone)
                } else if (indexValue._astname === "List") {
                    // list
                    ccState.getProperty("userFunctionReturns")[r].returns = "List"
                    ccHelpers.appendArray(ccHelpers.listTypesWithin(indexValue, ccState.getProperty("userFunctionReturns")[r].containedValue, ccState.getProperty("userFunctionReturns")[r].indexAndInput, ccState.getProperty("userFunctionReturns")[r].opsDone), ccState.getProperty("userFunctionReturns")[r].containedValue)
                    ccState.getProperty("userFunctionReturns")[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: indexValue.elts,
                    })
                    ccState.getProperty("userFunctionReturns")[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: ccHelpers.nodesToStrings(indexValue.elts),
                    })
                } else if (indexValue._astname === "Str") {
                    ccState.getProperty("userFunctionReturns")[r].returns = "Str"
                }
            }
        }
    }
    // Now, go through the list of all variables and do the same thing
    for (var r = 0; r < ccState.getProperty("allVariables").length; r++) {
        if (ccState.getProperty("allVariables")[r].value === "") {
            if (ccState.getProperty("allVariables")[r].funcVar === "var") {
                // if it's the value of another variable, we look it up in the var directory and copy the values
                const copiedVar = ccHelpers.getVariableObject(ccState.getProperty("allVariables")[r].flagVal)
                if (copiedVar != null && copiedVar.value !== "" && copiedVar.value !== "BinOp") {
                    ccState.getProperty("allVariables")[r].flagVal = ""
                    ccState.getProperty("allVariables")[r].funcVar = ""
                    ccHelpers.copyAttributes(copiedVar, ccState.getProperty("allVariables")[r], ["value", "binOp", "original", "indexAndInput", "nodeElements", "stringElements", "nested"])
                    ccHelpers.appendArray(copiedVar.containedValue, ccState.getProperty("allVariables")[r].containedValue)
                    ccState.getProperty("allVariables")[r].opsDone = ccHelpers.appendOpList(copiedVar.opsDone, ccState.getProperty("allVariables")[r].opsDone)
                }
            } else if (ccState.getProperty("allVariables")[r].funcVar === "func" && ccState.getProperty("allVariables")[r].name != ccState.getProperty("allVariables")[r].flagVal) {
                // otherwise, it contains the value returned by a function, so go look that up and copy its values
                // prevents us from getting stuck recursing forever
                const funcValue = ccHelpers.getFunctionObject(ccState.getProperty("allVariables")[r].flagVal)
                if (funcValue != null && funcValue.returns !== "") {
                    ccState.getProperty("allVariables")[r].flagVal = ""
                    ccState.getProperty("allVariables")[r].funcVar = ""
                    ccState.getProperty("allVariables")[r].value = funcValue.returns
                    ccHelpers.copyAttributes(funcValue, ccState.getProperty("allVariables")[r], ["input", "binOp", "nested", "nodeElements", "stringElements"])
                    if (funcValue.containedValue != null) {
                        ccHelpers.appendArray(funcValue.containedValue, ccState.getProperty("allVariables")[r].containedValue)
                    }
                    if (funcValue.opsDone != null) {
                        ccState.getProperty("allVariables")[r].opsDone = ccHelpers.appendOpList(funcValue.opsDone, ccState.getProperty("allVariables")[r].opsDone)
                    }
                }
            }
        }
        // now go through and check all of the things in nodeElements, because we need to evaluate them if we can
        if (ccState.getProperty("allVariables")[r].nodeElements != null) {
            for (var p in ccState.getProperty("allVariables")[r].nodeElements) {
                for (var i in ccState.getProperty("allVariables")[r].nodeElements[p].elts) {
                    if (ccState.getProperty("allVariables")[r].nodeElements[p].elts[i]._astname == null && typeof ccState.getProperty("allVariables")[r].nodeElements[p].elts[i] === "object" && "left" in ccState.getProperty("allVariables")[r].nodeElements[p].elts[i]) {
                        var eltsValue = { lineno: ccState.getProperty("allVariables")[r].nodeElements[p].elts[i].lineno }
                        eltsValue._astname = ccHelpers.recursivelyEvaluateBinOp(ccState.getProperty("allVariables")[r].nodeElements[p].elts[i])
                        if (eltsValue._astname === "Int") {
                            eltsValue._astname = "Num"
                            eltsValue.n = { v: 1 }
                        }
                        if (eltsValue._astname === "Float") {
                            eltsValue._astname = "Num"
                            eltsValue.n = { v: 1.57 }
                        }
                        if (eltsValue._astname === "List") {
                            eltsValue.elts = []
                        }
                        if (eltsValue._astname === "Bool") {
                            eltsValue._astname = "Name"
                            eltsValue.id = { v: "True" }
                        }
                        ccState.getProperty("allVariables")[r].nodeElements[p].elts[i] = eltsValue
                    }
                }
                ccState.getProperty("allVariables")[r].stringElements[p] = ccHelpers.nodesToStrings(ccState.getProperty("allVariables")[r].nodeElements[p].elts, ccState.getProperty("allVariables")[r].nodeElements[p].line)
            }
        }
        if (ccState.getProperty("allVariables")[r].value === "List") {
            for (var j = 0; j < ccState.getProperty("allVariables")[r].containedValue.length; j++) {
                if (ccState.getProperty("allVariables")[r].containedValue[j] != null && typeof ccState.getProperty("allVariables")[r].containedValue[j] === "string" && ccState.getProperty("allVariables")[r].containedValue[j].includes("var:")) {
                    const varName = ccState.getProperty("allVariables")[r].containedValue[j].split(":")[1]
                    const otherVariable = ccHelpers.getVariableObject(varName)
                    if (otherVariable != null && otherVariable.value !== "" && otherVariable.value !== "BinOp") {
                        if (otherVariable.value === "List") {
                            ccState.getProperty("allVariables")[r].containedValue[j] = otherVariable.containedValue.slice(0)
                        }
                        if (otherVariable.nested) {
                            ccState.getProperty("allVariables")[r].nested = true
                        }
                    }
                } else if (ccState.getProperty("allVariables")[r].containedValue[j] != null && typeof ccState.getProperty("allVariables")[r].containedValue[j] === "string" && ccState.getProperty("allVariables")[r].containedValue[j].includes("func:")) {
                    var funcName = ccState.getProperty("allVariables")[r].containedValue[j].split(":")[1]
                    const otherFunc = ccHelpers.getFunctionObject(funcName)
                    if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns !== "BinOp") {
                        ccState.getProperty("allVariables")[r].containedValue[j] = otherFunc.returns
                    }
                }
            }
        }
        if (ccState.getProperty("allVariables")[r].value === "Subscript") {
            var indexValue = ccHelpers.retrieveFromList(ccState.getProperty("allVariables")[r].flagVal)
            if (indexValue != null) { // then we know what it is.
                ccState.getProperty("allVariables")[r].indexAndInput.indexed = true
                ccState.getProperty("allVariables")[r].opsDone = ccHelpers.addOpToList("ListOp", ccState.getProperty("allVariables")[r].opsDone, indexValue.lineno)
                ccState.getProperty("allVariables").flagVal = "" // this may get reset to something down below, which is fine and 100% intentional.
                indexValue = ccHelpers.retrieveFromList(indexValue)
                if (indexValue != null && indexValue._astname === "Name") {
                    // it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName
                    if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                        ccState.getProperty("allVariables")[r].value = "Bool"
                    }
                    var indexVar = ccHelpers.getVariableObject(indexValue.id.v)
                    if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {
                        ccHelpers.copyAttributes(indexVar, ccState.getProperty("allVariables")[r], ["value", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"])
                        ccState.getProperty("allVariables")[r].opsDone = ccHelpers.appendOpList(indexVar.opsDone, ccState.getProperty("allVariables")[r].opsDone)
                        ccHelpers.appendArray(indexVar.containedValue, ccState.getProperty("allVariables")[r].containedValue)
                    } else if (indexVar != null && indexVar.value === "") {
                        ccState.getProperty("allVariables")[r].value = ""
                        ccState.getProperty("allVariables")[r].flagVal = "var:" + indexVar.name
                    }
                } else if (indexValue != null && indexValue._astname === "Call") {
                    var alreadyTallied = false
                    if ("id" in indexValue.func || indexValue.func._astname === "Subscript" || ccHelpers.retrieveFromList(indexValue.func) != indexValue.func) {
                        var funcName = ""
                        if ("id" in indexValue.func) {
                            funcName = indexValue.func.id.v
                        } else {
                            var functionNameNode = null
                            functionNameNode = ccHelpers.retrieveFromList(indexValue.func)
                            if (functionNameNode != null) {
                                funcName = functionNameNode.id.v
                            }
                        }
                        var userFunctionCalled = ccHelpers.getFunctionObject(funcName)
                        if (userFunctionCalled != null && userFunctionCalled.returns !== "") {
                            ccState.getProperty("allVariables")[r].value = userFunctionCalled.returns
                            ccHelpers.copyAttributes(userFunctionCalled, ccState.getProperty("allVariables")[r], ["nested", "binOp", "original", "indexAndInput", "nodeElements", "stringElements"])
                            ccHelpers.appendArray(userFunctionCalled.containedValue, ccState.getProperty("allVariables")[r].containedValue)
                            if (userFunctionCalled.opsDone != null) {
                                ccState.getProperty("allVariables")[r].opsDone = ccHelpers.appendOpList(userFunctionCalled.opsDone, ccState.getProperty("allVariables")[r].opsDone)
                            }
                        }
                        alreadyTallied = true
                    }
                    if (!alreadyTallied) {
                        ccState.getProperty("allVariables")[r].value = ccHelpers.getCallReturn(indexValue)
                        if (Array.isArray(ccState.getProperty("allVariables")[r].value)) {
                            ccState.getProperty("allVariables").nodeElements.push({
                                line: indexValue.lineno,
                                elts: ccState.getProperty("allVariables")[r].value,
                            })
                            ccState.getProperty("allVariables").stringElements.push({
                                line: indexValue.lineno,
                                elts: ccHelpers.nodesToStrings(ccState.getProperty("allVariables")[r].value),
                            })
                            ccState.getProperty("allVariables")[r].value = "List"
                        }
                    }
                } else if (indexValue._astname === "Num") {
                    ccState.getProperty("allVariables")[r].value = ccHelpers.isNodeFloat(indexValue) ? "Float" : "Int"
                } else if (indexValue._astname === "List") {
                    ccState.getProperty("allVariables")[r].value = "List"
                    ccHelpers.appendArray(ccState.getProperty("allVariables")[r].containedValue, ccHelpers.listTypesWithin(indexValue, ccState.getProperty("allVariables")[r].containedValue, ccState.getProperty("allVariables")[r].indexAndInput, ccState.getProperty("allVariables")[r].opsDone))
                    ccState.getProperty("allVariables")[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: indexValue.elts,
                    })
                    ccState.getProperty("allVariables")[r].nodeElements.push({
                        line: indexValue.lineno,
                        elts: ccHelpers.nodesToStrings(indexValue.elts),
                    })
                } else if (indexValue._astname === "Str") {
                    ccState.getProperty("allVariables")[r].value = "Str"
                }
            }
        }
    }
}

// Finds out if a node in a user-defined functionccState.getProperty('returns')a value, andccState.getProperty('returns')that
function findReturnInBody(node, functionObject) {
    if (node != null && node._astname != null) {
        // variable init
        let variablesIncluded = false
        const varList = []
        var isIndexed = false
        const tempObj = {}
        ccHelpers.copyAttributes(functionObject, tempObj, ["stringElements", "indexAndInput", "name", "returns", "funcVar", "flagVal", "binOp", "containedValue", "opsDone", "nested", "original", "paramsChanged", "nodeElements", "paramFuncsCalled"])
        functionObject = tempObj
        let userFuncsIndex = -1
        if (functionObject.name != null) {
            // should never be null but putting this in here for error protection
            for (var i in ccState.getProperty("userFunctionParameters")) {
                if (ccState.getProperty("userFunctionParameters")[i].name === functionObject.name) {
                    userFuncsIndex = i
                    break
                }
            }
        }
        // initialize any array that may be empty
        const emptyArrays = ["opsDone", "stringElements", "nodeElements", "paramsChanged", "containedValue"]
        for (var i in emptyArrays) {
            if (functionObject[emptyArrays[i]] == null) {
                functionObject[emptyArrays[i]] = []
            }
        }
        if (functionObject.indexAndInput == null) {
            functionObject.indexAndInput = {
                indexed: false,
                strIndexed: false,
                input: false,
            }
        }
        // add any ops to opsDone
        if (node._astname === "BinOp") {
            functionObject.opsDone = ccHelpers.addOpToList("BinOp", functionObject.opsDone, node.lineno)
        }
        if (node._astname === "AugAssign") {
            functionObject.opsDone = ccHelpers.addOpToList("AugAssign", functionObject.opsDone, node.lineno)
        }
        if (node._astname === "BoolOp" || node._astname === "UnaryOp") {
            functionObject.opsDone = ccHelpers.addOpToList("BoolOp", functionObject.opsDone, node.lineno)
        }
        if (node._astname === "Compare") {
            functionObject.opsDone = ccHelpers.addOpToList("Compare", functionObject.opsDone, node.lineno)
        }
        // is there a call to another function or to a list or string op? Handle that here.
        if (node._astname === "Call") {
            var funcName = ""
            const funcNode = ccHelpers.retrieveFromList(node.func)
            if (funcNode != null) {
                if ("id" in funcNode) {
                    funcName = funcNode.id.v
                } else {
                    funcName = funcNode.attr.v
                }
                if (funcName === "readInput") {
                    functionObject.indexAndInput.input = true
                }
                if (userFuncsIndex != -1 && ccState.getProperty("userFunctionParameters")[userFuncsIndex].params.includes(funcName)) {
                    // later on, this will be used to simulate a call to this function that was passed as a parameter
                    ccState.getProperty("userFunctionParameters")[userFuncsIndex].paramFuncsCalled.push({
                        index: ccState.getProperty("userFunctionParameters")[userFuncsIndex].params.indexOf(funcName),
                        node: Object.assign({}, node),
                    })
                }
                let isListFunc = false; let isStrFunc = false
                if (ccState.JS_STR_LIST_OVERLAP.includes(funcName) && ccState.getProperty("isJavascript")) {
                    const opValType = ccHelpers.getTypeFromNode(funcNode.value)
                    if (opValType === "List") {
                        isListFunc = true
                    } else if (opValType === "Str") {
                        isStrFunc = true
                    } else if (opValType === "") {
                        isListFunc, isStrFunc = true
                    }
                }
                if (ccState.getProperty("listFuncs").includes(funcName) && !isStrFunc) {
                    functionObject.opsDone = ccHelpers.addOpToList("ListOp", functionObject.opsDone, node.lineno)
                }
            }
        }
        // if this is the return value, populate functionObject with it
        if (node._astname === "Return" && node.value != null) {
            let opsPerformed = []
            const inputTaken = false
            let retVal = node.value
            // get values stored inside UnaryOp and Subscript nodes, applying appropriate indexing values in the process
            if (retVal._astname === "UnaryOp") {
                functionObject.returns = "Bool"
                retVal = retVal.operand
                opsPerformed = ccHelpers.addOpToList("BoolOp", opsPerformed, node.lineno)
            }
            if (node.value._astname === "Subscript") {
                retVal = ccHelpers.retrieveFromList(node.value)
                if (ccHelpers.getIndexingInNode(node.value)[0]) {
                    functionObject.indexAndInput.isIndexed = true
                }
                if (ccHelpers.getStringIndexingInNode(node.value)[0]) {
                    functionObject.indexAndInput.strIndexed = true
                }
            }
            retVal = ccHelpers.retrieveFromList(node.value)
            if (typeof retVal === "string") {
            } else if (retVal != null) {
                // store the type of returned value
                if (retVal._astname === "BinOp" || retVal._astname === "BoolOp" || retVal._astname === "Compare" || retVal._astname === "List") {
                    // get list/array/string indexing
                    isIndexed = ccHelpers.getIndexingInNode(retVal)[0]
                    functionObject.indexAndInput.strIndexed = ccHelpers.getStringIndexingInNode(retVal)[0]
                }
                if (retVal._astname === "Call") {
                    // if itccState.getProperty('returns')another function's return, we look up what THAT function returns. if we know.
                    var funcName = ""
                    if ("id" in retVal.func) {
                        funcName = retVal.func.id.v
                    } else {
                        funcName = retVal.func.attr.v
                    }
                    if (funcName === "readInput") {
                        functionObject.indexAndInput.input = true
                    }
                    // special case -ccState.getProperty('returns')the returned value of a listOp
                    if (ccState.getProperty("listFuncs").includes(funcName)) {
                        opsPerformed = ccHelpers.addOpToList("ListOp", opsPerformed, node.lineno)
                        if (retVal.func.value._astname === "List") {
                            const valuesInList = ccHelpers.listTypesWithin(retVal.func.value.elts, [], functionObject.indexAndInput, opsPerformed)
                        }
                        if (retVal.func.value._astname === "BinOp") {
                            const valsInOp = []
                            ccHelpers.listTypesWithin(retVal.func.value, valsInOp, functionObject.indexAndInput, opsPerformed)
                        }
                        if (retVal.func.value._astname === "Call") {
                            const retFunc = ccHelpers.getFunctionObject(retVal.func.value.func.id.v)
                            if (retFunc != null) {
                                if (retFunc.opsDone != null) {
                                    opsPerformed = ccHelpers.appendOpList(retFunc.opsDone, opsPerformed)
                                }
                            }
                        }
                        if (retVal.func.value._astname === "Name") { // we have to find the other variable
                            const retVar = ccHelpers.getVariableObject(retVal.func.value.id.v)
                        }
                    }
                    const matchedFunc = ccHelpers.getFunctionObject(funcName)
                    // or itccState.getProperty('returns')the return of another function
                    if (matchedFunc != null) {
                        if (matchedFunc.containedValue != null) {
                            if (matchedFunc.opsDone != null) {
                                opsPerformed = ccHelpers.appendOpList(matchedFunc.opsDone, opsPerformed)
                            }
                            if (matchedFunc.nested) {
                                variablesIncluded = true
                            }
                            if (matchedFunc.nodeElements != null && matchedFunc.nodeElements.length > 0) {
                                functionObject.nodeElements = [matchedFunc.nodeElements[0]]
                                functionObject.stringElements = [matchedFunc.stringElements[0]]
                            }
                            var isIndexed = false
                        }
                    }
                } else if (retVal._astname === "Name") {
                    // returns a variable value
                    let isFunctionName = false
                    for (var i in ccState.getProperty("userFunctionParameters")) {
                        if (ccState.getProperty("userFunctionParameters")[i].name === retVal.id.v) {
                            isFunctionName = true
                        }
                    }
                    if (!isFunctionName) {
                        // otherwise it's a variable the user has declared previously
                        if (retVal.id.v !== "True" && retVal.id.v !== "False") {
                            const variableName = retVal.id.v
                            variablesIncluded = true
                            const varToCopy = ccHelpers.getVariableObject(variableName)
                            // copy values from the variable object
                            if (varToCopy != null && varToCopy.value !== "BinOp" && varToCopy.value !== "") {
                                opsPerformed = ccHelpers.appendOpList(varToCopy.opsDone, opsPerformed)
                                if (varToCopy.nodeElements != null) {
                                    let nodeElementsIndex = -1
                                    for (let t = 0; t < ccState.getProperty("allVariables")[v].nodeElements.length - 1; t++) {
                                        if (ccState.getProperty("allVariables")[v].nodeElements[t].line > functionObject.startLine && ccState.getProperty("allVariables")[v].nodeElements[t + 1].line > functionObject.endLine) {
                                            nodeElementsIndex = t
                                            break
                                        }
                                    }
                                    if (nodeElementsIndex = -1 && ccState.getProperty("allVariables")[v].nodeElements[allVariables[v].nodeElements.length - 1].line >= functionObject.startLine &&
                                        ccState.getProperty("allVariables")[v].nodeElements[allVariables[v].nodeElements.length - 1].line <= functionObject.endLine) {
                                        nodeElementsIndex = ccState.getProperty("allVariables")[v].nodeElements.length - 1
                                    }
                                    if (nodeElementsIndex = -1) {
                                        nodeElementsIndex = 0
                                    }
                                    functionObject.nodeElements = [varToCopy.nodeElements[nodeElementsIndex]]
                                    functionObject.stringElements = [varToCopy.stringElements[nodeElementsIndex]]
                                }
                                if (varToCopy.indexAndInput.indexed) {
                                    isIndexed = true
                                }
                                if (varToCopy.indexAndInput.strIndexed) {
                                    functionObject.indexAndInput.strIndexed = true
                                }
                            }
                        }
                    }
                } else if (retVal._astname === "BinOp") {
                    // if itccState.getProperty('returns')a binOp, we have to evaluate what kind of datatype it is.
                    opsPerformed = ccHelpers.addOpToList("BinOp", opsPerformed, node.lineno)
                    if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(retVal))) {
                        const binOpElts = ccHelpers.getAllBinOpLists(retVal)
                        functionObject.nodeElements = [{
                            line: retVal.lineno,
                            elts: binOpElts,
                        }]
                        functionObject.stringElements = [{
                            line: retVal.lineno,
                            elts: ccHelpers.nodesToStrings(binOpElts, retVal.lineno),
                        }]
                    }
                    ccHelpers.getNestedVariables(retVal, varList)
                } else if (retVal._astname === "BoolOp") {
                    // boolop becomes bool
                    ccHelpers.getNestedVariables(retVal, varList)
                    opsPerformed = ccHelpers.addOpToList("BoolOp", opsPerformed, node.lineno)
                } else if (retVal._astname === "List") {
                    // store "List" and also all values within that list in nodeElements, stringElements, and containedValue
                    ccHelpers.getNestedVariables(retVal, varList)
                    functionObject.nodeElements = [{
                        line: node.lineno,
                        elts: retVal.elts,
                    }]
                    functionObject.stringElements = [{
                        line: node.lineno,
                        elts: ccHelpers.nodesToStrings(retVal.elts, node.lineno),
                    }]
                } else if (retVal._astname === "Compare") {
                    // comparison also becomes a bool
                    ccHelpers.getNestedVariables(retVal, varList)
                    opsPerformed = ccHelpers.addOpToList("Compare", opsPerformed, node.lineno)
                }
            }
            if (functionObject != null && functionObject.opsDone != null) {
                opsPerformed = ccHelpers.appendOpList(functionObject.opsDone, opsPerformed)
            }
            if (varList.length > 0) {
                variablesIncluded = true
            }
            // fill in properties
            if (isIndexed) {
                functionObject.indexAndInput.indexed = true
            }
            if (inputTaken) {
                functionObject.indexAndInput.input = true
            }
            functionObject.opsDone = opsPerformed
            functionObject.nested = variablesIncluded
        }
        // some things don't get recursively checked automatically (if tests, JSFor init, etc.), so we manually make these calls here
        if (node._astname === "JSFor") {
            if (node.init != null) {
                functionObject = findReturnInBody(node.init, functionObject)
            }
            functionObject = findReturnInBody(node.test, functionObject)
            if (node.update != null) {
                functionObject = findReturnInBody(node.update, functionObject)
            }
        }
        if (node._astname === "If") {
            functionObject = findReturnInBody(node.test, functionObject)
            if (node.orelse != null) {
                for (var i in node.orelse) {
                    functionObject = findReturnInBody(node.orelse[i], functionObject)
                }
            }
        }
        // regular recursive calls
        if (node != null && node.body != null) {
            var keys = Object.keys(node.body)
            for (var p = 0; p < keys.length; p++) {
                var nodechild = node.body[keys[p]]
                functionObject = findReturnInBody(nodechild, functionObject)
            }
        } else if (node != null && (node._astname != null || node[0] != null)) {
            var keys = Object.keys(node)
            for (var p = 0; p < keys.length; p++) {
                var nodechild = node[keys[p]]
                functionObject = findReturnInBody(nodechild, functionObject)
            }
        }
    }
    return functionObject
}

// Checks a single node for a function definition and adds name to the list if it finds one
function checkForFunctions(node, results) {
    // again, some things don't get recursively checked automatically, so we manually call that here
    if (node != null && node._astname != null && "test" in node) {
        checkForFunctions(node.test, results)
    }
    if (node != null && node._astname != null && "orelse" in node) {
        checkForFunctions(node.orelse, results)
    }
    // now - is there a function?
    if (node != null && node._astname != null && node._astname === "FunctionDef") {
        if (results.userFunc < 1) {
            // update results
            results.userFunc = 1
        }
        // gather parameter information
        const paramList = []
        for (let r = 0; r < node.args.args.length; r++) {
            const paramName = node.args.args[r].id.v
            paramList.push(paramName)
        }
        const lineNumber = node.lineno - 1
        var lastLine = ccHelpers.getLastLine(node)
        const wholeLoop = ccState.getProperty("studentCode").slice(lineNumber, lastLine)
        ccState.getProperty("userFunctionParameters").push({
            name: node.name.v,
            params: paramList,
            paramFuncsCalled: [],
        })
        const functionName = node.name.v
        // create base function object
        let functionObj = {
            name: functionName,
        }
        for (let i = 0; i < node.body.length; i++) {
            // go through the lines and find any returns.
            // findReturnInBody also fills out all the other things
            functionObj = findReturnInBody(node.body[i], functionObj)
        }
        // set originality measure
        let originality = false
        for (let p = lineNumber + 1; p < lastLine + 1; p++) {
            if (ccState.getProperty("originalityLines").includes(p)) {
                originality = true
                break
            }
        }
        if (originality && results.userFunc < 2) {
            // update results
            results.userFunc = 2
        }
        functionObj.original = originality
        var lastLine = ccHelpers.getLastLine(node)
        // store these lines as places where functions are defined
        const functionLineMarker = {
            name: functionName,
            lines: [],
        }
        for (let k = node.lineno; k <= lastLine; k++) {
            ccState.getProperty("uncalledFunctionLines").push(k)
            functionLineMarker.lines.push(k)
        }
        ccState.getProperty("functionLines").push(functionLineMarker)
        // create a new object and add its return value. push to list.
        if (functionObj != null) {
            functionObj.name = functionName
            functionObj.startLine = node.lineno
            functionObj.endLine = lastLine
            ccState.getProperty("userFunctionReturns").push(functionObj)
        }
    }
}

// Recursively calls lookForParamReturns on a series of AST nodes.
export function evaluateFunctionReturnParams(ast) {
    if (ast != null && ast.body != null) {
        lookForParamReturns(ast)
        var astKeys = Object.keys(ast.body)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]]
            lookForParamReturns(node)
            evaluateFunctionReturnParams(node)
        }
    } else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === "object"))) {
        lookForParamReturns(ast)
        var astKeys = Object.keys(ast.body)
        for (var r = 0; r < astKeys.length; r++) {
            var node = ast[astKeys[r]]
            lookForParamReturns(node)
            evaluateFunctionReturnParams(node)
        }
    }
}

// Labels functions that return their own parameters.
// Also handles function removal from the ccState.getProperty("ccState.getProperty('uncalledFunctionLines')") if said function is called (we only evaluate in-function code if the function is called)
function lookForParamReturns(node) {
    // again, we need to manually recurse through certian types of nodes
    if (node != null && node._astname != null && "test" in node) {
        evaluateFunctionReturnParams(node.test)
    }
    if (node != null && node._astname != null && "iter" in node) {
        evaluateFunctionReturnParams(node.iter)
    }
    if (node != null && node._astname != null && "orelse" in node) {
        evaluateFunctionReturnParams(node.orelse)
    }
    if (node != null && node._astname === "Call" && "attr" in node.func) {
        // this is solely for JS array ops such as map() that take function expressions as arguments
        for (const i in node.args) {
            const nodeItem = ccHelpers.retrieveFromList(node.args[i])
            if (nodeItem != null && nodeItem._astname === "FunctionExp") {
                // handle params
                var funcName = nodeItem.functionName
                var isRecursiveCall = false
                var argsIn = nodeItem.functionDef.args.args
                var calledReturnObj = ccHelpers.getFunctionObject(calledName)
                if (calledReturnObj != null && calledReturnObj.startLine != null && (nodeItem.lineno > calledReturnObj.startLine && nodeItem.lineno <= calledReturnObj.endLine)) {
                    isRecursiveCall = true
                }
                var index = -1
                for (var userFuncRet = 0; userFuncRet < ccState.getProperty("userFunctionReturns").length; userFuncRet++) {
                    if (ccState.getProperty("userFunctionReturns")[userFuncRet].name === funcName) {
                        index = userFuncRet
                        break
                    }
                }
                // create empty variable value for the param
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
                            strIndexed: false,
                        },
                        opsDone: [],
                        modifyingFunctions: [],
                        assignedModified: [],
                        nodeElements: [],
                        stringElements: [],
                    }
                    // adjustments so things get read accurately
                    var lineNo = nodeItem.lineno
                    for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                        if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                            lineNo = ccState.getProperty("loopLocations")[h][0]
                            break
                        }
                    }
                    if (!isRecursiveCall) {
                        paramArgVar.assignedModified.push({
                            line: lineNo,
                            value: ccState.getProperty("studentCode")[nodeItem.lineno - 1].trim(),
                            nodeValue: nodeItem,
                        })
                        ccState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name })
                    }
                    // fill in param variable values, add to ccState.getProperty('allVariables')
                    var alreadyExists = -1
                    var funcInd = -1
                    for (var f = 0; f < ccState.getProperty("userFunctionParameters").length; f++) {
                        if (ccState.getProperty("userFunctionParameters")[f].name === funcName) {
                            funcInd = f
                            break
                        }
                    }
                    if (funcInd != -1) {
                        for (var e = 0; e < ccState.getProperty("allVariables").length; e++) {
                            if (ccState.getProperty("allVariables")[e].name === ccState.getProperty("userFunctionParameters")[funcInd].params[a]) {
                                alreadyExists = e
                                break
                            }
                        }
                        paramArgVar.name = ccState.getProperty("userFunctionParameters")[funcInd].params[a]
                    }
                    const attrName = node.func.attr.v
                    // this information is needed so we can get a value for the param variable
                    if (attrName === "map" || attrName === "filter") {
                        let listToUse = []
                        if ("func" in node && "attr" in node.func) {
                            opToPerform = node.func.attr.v
                        }
                        if (node.func.value._astname === "Name") {
                            var variable = ccHelpers.getVariableObject(node.func.value.id.v)
                            if (variable != null) {
                                var correctElts = ccHelpers.mostRecentElements(variable, node.lineno - 1)
                                if (correctElts != null) {
                                    listToUse = correctElts.slice(0)
                                }
                            }
                        } else if (node.func.value._astname === "Call") {
                            if (ccHelpers.retrieveFromList(node.func.value) != node.func.value) {
                                listToUse = ccHelpers.retrieveFromList(node.func.value).elts
                            } else if ("id" in node.func.value.func) {
                                var funcName = node.func.value.func.id.v
                                const thisLine = node.lineno
                                if (ccHelpers.getFunctionObject(funcName) != null) {
                                    var variable = ccHelpers.getVariableObject(node.func.value.id.v)
                                    if (variable != null) {
                                        var correctElts = ccHelpers.mostRecentElements(variable, node.lineno)
                                        if (correctElts != null) {
                                            listToUse = correctElts.slice(0)
                                        }
                                    }
                                }
                            }
                        } else if (node.func.value._astname === "List") {
                            listToUse = node.func.value.elts
                        } else if (node.func.value._astname === "BinOp") {
                            listToUse = ccHelpers.getAllBinOpLists(node.func.value)
                        }
                        if (listToUse != null) {
                            paramArgVar.value = ccHelpers.getTypeFromNode(ccHelpers.retrieveFromList(listToUse[0]))
                        }
                    }
                    // add to relevant lists
                    if (paramArgVar.opsDone.length > 0 && index != -1 && ccState.getProperty("userFunctionReturns")[index].startLine != null) {
                        paramArgVar.modifyingFunctions.push([ccState.getProperty("userFunctionReturns")[index].startLine, ccState.getProperty("userFunctionReturns")[index].endLine])
                    }
                    if (alreadyExists > -1 && (ccState.getProperty("allVariables")[alreadyExists].value === "" && paramArgVar.value !== "")) {
                        ccState.getProperty("allVariables")[alreadyExists] = paramArgVar
                    } else if (alreadyExists === -1) {
                        ccState.getProperty("allVariables").push(paramArgVar)
                        ccState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name })
                    }
                }
                if (index > -1) {
                    // if the functionccState.getProperty('returns')one of its own parameters, we now know what datatype that is.
                    if (ccState.getProperty("userFunctionReturns")[index].funcVar === "param") {
                        var arg = nodeItem.args[ccState.getProperty("userFunctionReturns")[index].flagVal]
                        var argType = arg._astname
                        var returnType = argType
                        var containedWithin = []
                        if (ccState.getProperty("userFunctionReturns")[index].opsDone == null) {
                            ccState.getProperty("userFunctionReturns")[index].opsDone = []
                        }
                        if (argType === "Num") {
                            argType = ccHelpers.isNodeFloat(arg) ? "Float" : "Int"
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                        }
                        if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                        } else if (argType === "Name") {
                            var foundVar = false
                            for (var v = 0; v < ccState.getProperty("allVariables").length; v++) {
                                if (ccState.getProperty("allVariables")[v].name === arg.id.v && ccState.getProperty("allVariables")[v].value !== "" && ccState.getProperty("allVariables")[v].value !== "BinOp") {
                                    foundVar = true
                                    argType = ccState.getProperty("allVariables")[v].value
                                    containedWithin = ccState.getProperty("allVariables")[v].containedValue
                                    ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.appendOpList(ccState.getProperty("allVariables")[v].opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    break
                                }
                            }
                            if (foundVar) {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                                ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                                ccState.getProperty("userFunctionReturns")[index].returns = argType
                                if (containedWithin.length > 0) {
                                    ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                                }
                            } else {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = "var"
                                ccState.getProperty("userFunctionReturns")[index].flagVal = arg.id.v
                            }
                        }
                        if (argType === "Compare") {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("Compare", ccState.getProperty("userFunctionReturns")[index].opsDone, nodeItem.lineno)
                            ccHelpers.listTypesWithin(arg, containedWithin, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                            if (containedWithin.length > 0) {
                                ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                            }
                        }
                        if (argType === "BoolOp") {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("BoolOp", ccState.getProperty("userFunctionReturns")[index].opsDone, nodeItem.lineno)
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                            ccHelpers.listTypesWithin(arg, containedWithin, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                            if (containedWithin.length > 0) {
                                ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                            }
                        }
                        if (argType === "Call") {
                            // if the argument is a function call, we need to know what THAT function returns.
                            var foundFunc = false
                            var funcName = ""
                            if ("id" in nodeItem.value.func) {
                                funcName = nodeItem.value.func.id.v
                            } else {
                                funcName = nodeItem.value.func.attr.v
                            }
                            if (funcName === "readInput") {
                                ccState.getProperty("userFunctionReturns")[index].indexAndInput.input = true
                            }
                            if (ccState.getProperty("listFuncs").includes(funcName)) {
                                ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("ListOp", ccState.getProperty("userFunctionReturns")[index].opsDone, nodeItem.lineno)
                                if (nodeItem.value.func.value._astname === "List") {
                                    var valuesInList = ccHelpers.listTypesWithin(nodeItem.value.func.value.elts, [], ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    for (var vil = 0; vil < valuesInList; vil++) {
                                        ccState.getProperty("userFunctionReturns")[index].containedValue.push(valuesInList[vil])
                                    }
                                }
                                // binop
                                if (nodeItem.value.func.value._astname === "BinOp") {
                                    var valsInOp = []
                                    ccHelpers.listTypesWithin(nodeItem.value.func.value, valsInOp, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    for (var vio = 0; vio < valsInOp.length; vio++) {
                                        ccState.getProperty("userFunctionReturns")[index].containedValue.push(valsInOp[vio])
                                    }
                                }
                                // func call
                                if (nodeItem.value.func.value._astname === "Call" && "id" in nodeItem.value.func.value) {
                                    var calledFunction = ccHelpers.getFunctionObject(nodeItem.value.func.value.id.v)
                                    if (calledFunction != null) {
                                        ccHelpers.copyAttributes(calledFunction, ccState.getProperty("userFunctionReturns")[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"])
                                        if (calledFunction.containedValue != null) {
                                            ccHelpers.appendArray(calledFunction.containedValue, ccState.getProperty("userFunctionReturns")[index].containedValue)
                                        }
                                        if (calledFunction.opsDone != null) {
                                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.appendOpList(calledFunction.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                        }
                                    }
                                }
                                // var
                                if (nodeItem.value.func.value._astname === "Name") {
                                    var valueVariable = ccHelpers.getVariableObject(nodeItem.value.func.value.id.v)
                                    if (valueVariable != null) {
                                        ccHelpers.copyAttributes(valueVariable, ccState.getProperty("userFunctionReturns")[index], ["indexAndInput", "nested"])
                                        if (valueVariable.nodeElements.length > 0) {
                                            ccState.getProperty("userFunctionReturns").nodeElements = [valueVariable.nodeElements[0]]
                                            ccState.getProperty("userFunctionReturns").stringElements = [valueVariable.stringElements[0]]
                                        }
                                        ccHelpers.appendArray(valueVariable.containedValue, ccState.getProperty("userFunctionReturns")[index].containedValue)
                                        ccHelpers.appendOpList(valueVariable.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    }
                                }
                            }
                            var funcRet = ccHelpers.getFunctionObject(arg.id.v)
                            if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                foundFunc = true
                                ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                                ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                                ccState.getProperty("userFunctionReturns")[index].returns = funcRet.returns
                                if (funcRet.containedValue != null) {
                                    ccState.getProperty("userFunctionReturns")[index].containedValue = funcRet.containedValue
                                }
                                if (funcRet.opsDone != null) {
                                    ccHelpers.appendOpList(funcRet.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                }
                            }
                            if (!foundFunc) {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = "func"
                                ccState.getProperty("userFunctionReturns")[index].flagVal = arg.func.id.v
                            }
                        }
                        if (argType === "List") {
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = "List"
                            ccState.getProperty("userFunctionReturns")[index].containedValue = ccHelpers.listTypesWithin(arg.elts, ccState.getProperty("userFunctionReturns")[index].containedValue,
                                ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                            ccState.getProperty("userFunctionReturns")[index].nodeElements = [{
                                line: arg.lineno,
                                elts: arg.elts,
                            }]
                            ccState.getProperty("userFunctionReturns")[index].stringElements = [{
                                line: arg.lineno,
                                elts: ccHelpers.nodesToStrings(arg.elts),
                            }]
                        }
                    }
                }
                var modifiesParams = []
                // store line numbers and originality
                var lineNumber = 0
                if (nodeItem.lineno != null) {
                    lineNumber = nodeItem.lineno
                    ccState.setProperty("parentLineNumber", lineNumber)
                } else {
                    lineNumber = ccState.getProperty("parentLineNumber")
                }
                var originality = (ccState.getProperty("originalityLines").includes(lineNumber))
                var startLine = 0
                var endLine = 0
                for (var f = 0; f < ccState.getProperty("userFunctionReturns").length; f++) {
                    if (ccState.getProperty("userFunctionReturns")[f].name === funcName && ccState.getProperty("userFunctionReturns")[f].paramsChanged != null) {
                        modifiesParams = ccState.getProperty("userFunctionReturns")[f].paramsChanged
                        startLine = ccState.getProperty("userFunctionReturns")[f].startLine
                        endLine = ccState.getProperty("userFunctionReturns")[f].endLine
                        break
                    }
                }
                // update assignedModified for any params that the function modifies
                for (var a = 0; a < argsIn.length; a++) {
                    if (modifiesParams.includes(a) && (argsIn[a]._astname === "Name" && argsIn[a].id.v !== "True" && argsIn[a].id.v !== "False")) {
                        modString = ccState.getProperty("studentCode")[nodeItem.lineno - 1]
                        for (var v = 0; v < ccState.getProperty("allVariables").length; v++) {
                            if (ccState.getProperty("allVariables")[v].name === argsIn[a].id.v) {
                                var lineNo = nodeItem.lineno
                                for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                                    if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                                        lineNo = ccState.getProperty("loopLocations")[h][0]
                                        break
                                    }
                                }
                                ccState.getProperty("allVariables")[v].assignedModified.push({
                                    line: lineNo,
                                    value: ccState.getProperty("studentCode")[lineNumber].trim(),
                                    original: originality,
                                    nodeValue: nodeItem,
                                })
                                ccState.getProperty("variableAssignments").push({ line: nodeItem.lineno, name: ccState.getProperty("allVariables")[v].name })
                                ccState.getProperty("allVariables")[v].modifyingFunctions.push([startLine, endLine])
                                break
                            }
                        }
                    }
                }
                // Handle  ccState.getProperty("ccState.getProperty('uncalledFunctionLines')"). a functionExp is generally ALWAYS called.
                for (var p = 0; p < ccState.getProperty("functionLines").length; p++) {
                    if (ccState.getProperty("functionLines")[p].name === funcName) {
                        // remove lines from  ccState.getProperty("ccState.getProperty('uncalledFunctionLines')")
                        for (var l = 0; l < ccState.getProperty("functionLines")[p].lines.length; l++) {
                            var lineIndex = ccState.getProperty("uncalledFunctionLines").indexOf(ccState.getProperty("functionLines")[p].lines[l])
                            ccState.getProperty("uncalledFunctionLines").splice(lineIndex, 1)
                        }
                        break
                    }
                }
            }
        }
    }
    // for everything that ISN'T a JS FunctionExp
    if (node != null && node._astname != null && node._astname === "Call") {
        // is this a user function?
        var alreadyExists = false
        var funcInd = -1
        var argsIn = []
        let funcNames = []
        var funcName = ""
        // get the function name and args
        if ("id" in node.func) {
            funcName = node.func.id.v
            argsIn = node.args
        } else if ("attr" in node.func) {
            funcName = node.func.attr.v
            nodeArgs = [node.func.value]
        } else if (node.func._astname === "Subscript") {
            const nameNode = ccHelpers.retrieveFromList(node.func)
            if (nameNode._astname === "Name") {
                funcName = nameNode.id.v
            }
            argsIn = node.args
        }
        // if we haven't stored the name yet, check the function renames in for loops
        for (var f = 0; f < ccState.getProperty("userFunctionParameters").length; f++) {
            if (ccState.getProperty("userFunctionParameters")[f].name === funcName) {
                alreadyExists = true
                funcInd = f
                break
            }
        }
        if (!alreadyExists) {
            const alias = null
            for (var h in ccState.getProperty("forLoopFuncs")) {
                if (ccState.getProperty("forLoopFuncs")[h].callName === funcName) {
                    alreadyExists = true
                    funcNames = ccState.getProperty("forLoopFuncs")[h].functionNames
                    break
                }
            }
        } else {
            funcNames = [funcName]
        }
        // we have to do this for each stored name
        for (const r in funcNames) {
            let foundName = false
            var calledName = funcNames[r]
            for (var f = 0; f < ccState.getProperty("userFunctionParameters").length; f++) {
                if (ccState.getProperty("userFunctionParameters")[f].name === calledName) {
                    foundName = true
                    funcInd = f
                    break
                }
            }
            for (var p = 0; p < ccState.getProperty("functionLines").length; p++) {
                for (let n = 0; n < ccState.getProperty("userFunctionRenames").length; n++) {
                    if (ccState.getProperty("userFunctionRenames")[n][0] === calledName) {
                        calledName = ccState.getProperty("userFunctionRenames")[n][1]
                    }
                }
                if (ccState.getProperty("functionLines")[p].name === calledName) {
                    // remove lines from  ccState.getProperty("ccState.getProperty('uncalledFunctionLines')")
                    for (var l = 0; l < ccState.getProperty("functionLines")[p].lines.length; l++) {
                        var lineIndex = ccState.getProperty("uncalledFunctionLines").indexOf(ccState.getProperty("functionLines")[p].lines[l])
                        ccState.getProperty("uncalledFunctionLines").splice(lineIndex, 1)
                    }
                    break
                }
            }
            const ops = []
            var isRecursiveCall = false
            var calledReturnObj = ccHelpers.getFunctionObject(calledName)
            if (calledReturnObj != null) {
                if (!("callsTo" in calledReturnObj)) {
                    calledReturnObj.callsTo = []
                }
                calledReturnObj.callsTo.push(node.lineno)
            }
            if (calledReturnObj != null && calledReturnObj.startLine != null && (node.lineno > calledReturnObj.startLine && node.lineno <= calledReturnObj.endLine)) {
                isRecursiveCall = true
            }
            if (foundName) {
                // create a variable object for each parameter, adding to ccState.getProperty('allVariables')
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
                            strIndexed: false,
                        },
                        opsDone: ops,
                        modifyingFunctions: [],
                        assignedModified: [],
                        nodeElements: [],
                        stringElements: [],
                    }
                    // get lineno, etc.
                    var lineNo = node.lineno
                    for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                        if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                            lineNo = ccState.getProperty("loopLocations")[h][0]
                            break
                        }
                    }
                    if (!isRecursiveCall) {
                        paramArgVar.assignedModified.push({
                            line: lineNo,
                            value: ccState.getProperty("studentCode")[node.lineno - 1].trim(),
                            nodeValue: node,
                        })
                        ccState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name })
                    }
                    var alreadyExists = -1
                    for (var e = 0; e < ccState.getProperty("allVariables").length; e++) {
                        if (ccState.getProperty("allVariables")[e].name === ccState.getProperty("userFunctionParameters")[funcInd].params[a]) {
                            alreadyExists = e
                            break
                        }
                    }
                    if (funcInd != -1) {
                        paramArgVar.name = ccState.getProperty("userFunctionParameters")[funcInd].params[a]
                    }
                    // now we get the actual value
                    let argItem = argsIn[a]
                    if (argItem._astname === "UnaryOp") {
                        paramArgVar.value = "Bool"
                        ccHelpers.listTypesWithin(argsIn[a].operand, paramArgVar.containedValue, paramArgVar.indexAndInput, paramArgVar.opsDone)
                        argItem = argItem.operand
                    }
                    if (ccHelpers.retrieveFromList(argItem) != argItem) {
                        if (ccHelpers.getIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.indexed = true
                        }
                        if (ccHelpers.getStringIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.strIndexed = true
                        }
                        argItem = ccHelpers.retrieveFromList(argItem)
                    }
                    if (argItem != null && argItem._astname === "Subscript") {
                        if (ccHelpers.getIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.indexed = true
                        }
                        if (ccHelpers.getStringIndexingInNode(argItem)[0]) {
                            paramArgVar.indexAndInput.strIndexed = true
                        }
                        argItem = ccHelpers.retrieveFromList(argItem)
                    }
                    if (argItem != null && argItem._astname === "UnaryOp") {
                        paramArgVar.value = "Bool"
                        ccHelpers.listTypesWithin(argsIn[a].operand, paramArgVar.containedValue, paramArgVar.indexAndInput, paramArgVar.opsDone)
                        argItem = argItem.operand
                    }
                    if (argItem != null) {
                        const type = argsIn[a]._astname
                        if (type === "Str") {
                            paramArgVar.value = "Str"
                        } else if (type === "AugAssign") {
                            paramArgVar.opsDone = ccHelpers.addOpToList("AugAssign", paramArgVar.opsDone, node.lineno)
                        } else if (type === "Num") {
                            paramArgVar.value = ccHelpers.isNodeFloat(node.args[a]) ? "Float" : "Int"
                        } else if (type === "Name" && (argsIn[a].id.v === "True" || argsIn[a].id.v === "False")) {
                            paramArgVar.value = "Bool"
                        } else if (type === "Call") {
                            // then it's whatever that call returns
                            var funcName = ""
                            let item = argsIn[a].func
                            item = ccHelpers.retrieveFromList(argsIn[a].func)
                            if ("id" in item) {
                                funcName = item.id.v
                            } else if ("attr" in item) {
                                funcName = item.attr.v
                            }
                            if (funcName === "readInput") {
                                functionObject.indexAndInput.input = true
                            }
                            if (ccState.getProperty("listFuncs").includes(funcName)) {
                                paramArgVar.opsDone = ccHelpers.addOpToList("ListOp", paramArgVar.opsDone, node.lineno)
                                if (node.value.func.value._astname === "List" || node.value.func.value._astname === "BinOp") {
                                    var valuesInList = ccHelpers.listTypesWithin(node.value.func.value.elts, [], functionObject.indexAndInput, opsPerformed)
                                    ccHelpers.appendArray(valuesInList, paramArgVar.containedValue)
                                }
                                // elts
                                const eltsObj = ccHelpers.performListOp(item)
                                paramArgVar.nodeElements.push({
                                    line: node.lineno,
                                    elts: eltsObj[0],
                                })
                                paramArgVar.stringElements.push({
                                    line: node.lineno,
                                    elts: eltsObj[1],
                                })
                                // func call
                                if (node.value.func.value._astname === "Call") {
                                    var paramCall = ccHelpers.getFunctionObject(node.value.func.value.id.v)
                                    if (paramCall != null) {
                                        if (paramCall.containedValue != null) {
                                            ccHelpers.appendArray(paramCall.containedValue, paramArgVar.containedValue)
                                        }
                                        if (paramCall.opsDone != null) {
                                            paramArgVar.opsDone = ccHelpers.appendOpList(paramCall.opsDone, paramArgVar.opsDone)
                                        }
                                        if (paramCall.nodeElements != null) {
                                            paramArgVar.nodeElements = paramCall.nodeElements
                                            paramArgVar.stringElements = paramCall.stringElements
                                        }
                                    }
                                }
                                // var
                                if (node.value.func.value._astname === "Name") {
                                    const calledVar = ccHelpers.getVariableObject(node.value.func.value.id.v)
                                    if (calledVar != null) {
                                        ccHelpers.appendArray(calledVar.containedValue, paramArgVar.containedValue)
                                        paramArgVar.opsDone = ccHelpers.appendOpList(calledVar.opsDone, paramArgVar.opsDone)
                                        ccHelpers.appendArray(paramCall.stringElements, paramArgVar.stringElements)
                                        ccHelpers.appendArray(paramCall.nodeElements, paramArgVar.nodeElements)
                                    }
                                }
                            }
                        } else if (type === "BoolOp") {
                            paramArgVar.value = "Bool"
                            paramArgVar.opsDone = ccHelpers.addOpToList("BoolOp", paramArgVar.opsDone, node.lineno)
                            const boolOpVals = ccHelpers.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone)
                            if (boolOpVals.length > 0) {
                                paramArgVar.containedValue = boolOpVals
                            }
                        } else if (type === "List") {
                            paramArgVar.value = "List"
                            const containedVal = ccHelpers.listTypesWithin(argsIn[a].elts, [], paramArgVar.indexAndInput, paramArgVar.opsDone)
                            if (containedVal.length > 0) {
                                paramArgVar.containedValue = containedVal
                            }
                            paramArgVar.nodeElements.push({
                                line: node.lineno,
                                elts: argsIn[a].elts,
                            })
                            paramArgVar.stringElements.push({
                                line: node.lineno,
                                elts: ccHelpers.nodesToStrings(argsIn[a].elts, node.lineno),
                            })
                        } else if (type === "Compare") {
                            paramArgVar.value = "Bool"
                            paramArgVar.opsDone = ccHelpers.addOpToList("Compare", paramArgVar.opsDone, node.lineno)
                            const compareTypes = ccHelpers.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone)
                            if (compareTypes.length > 0) {
                                paramArgVar.containedValue = compareTypes
                            }
                        }
                        var index = -1
                        for (var userFuncRet = 0; userFuncRet < ccState.getProperty("userFunctionReturns").length; userFuncRet++) {
                            if (ccState.getProperty("userFunctionReturns")[userFuncRet].name === funcName) {
                                index = userFuncRet
                                break
                            }
                        }
                        if (paramArgVar.opsDone.length > 0 && index != -1 && ccState.getProperty("userFunctionReturns")[index].startLine != null) {
                            paramArgVar.modifyingFunctions.push([ccState.getProperty("userFunctionReturns")[index].startLine, ccState.getProperty("userFunctionReturns")[index].endLine])
                        }
                        if (alreadyExists > -1 && (ccState.getProperty("allVariables")[alreadyExists].value === "" && paramArgVar.value !== "")) {
                            ccState.getProperty("allVariables")[alreadyExists] = paramArgVar
                        } else if (alreadyExists === -1) {
                            ccState.getProperty("allVariables").push(paramArgVar)
                            ccState.getProperty("variableAssignments").push({ line: node.lineno, name: paramArgVar.name })
                        }
                    }
                }
                if (index > -1) {
                    // if the functionccState.getProperty('returns')this parameter, we tell it what that is
                    if (ccState.getProperty("userFunctionReturns")[index].funcVar === "param") {
                        var arg = node.args[ccState.getProperty("userFunctionReturns")[index].flagVal]
                        var argType = arg._astname
                        var returnType = argType
                        var containedWithin = []
                        if (ccState.getProperty("userFunctionReturns")[index].opsDone == null) {
                            ccState.getProperty("userFunctionReturns")[index].opsDone = []
                        }
                        if (argType === "Num") {
                            argType = ccHelpers.isNodeFloat(arg) ? "Float" : "Int"
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                        }
                        if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                        } else if (argType === "Name") {
                            var foundVar = false
                            for (var v = 0; v < ccState.getProperty("allVariables").length; v++) {
                                if (ccState.getProperty("allVariables")[v].name === arg.id.v && ccState.getProperty("allVariables")[v].value !== "" && ccState.getProperty("allVariables")[v].value !== "BinOp") {
                                    foundVar = true
                                    argType = ccState.getProperty("allVariables")[v].value
                                    containedWithin = ccState.getProperty("allVariables")[v].containedValue
                                    ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.appendOpList(ccState.getProperty("allVariables")[v].opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    break
                                }
                            }
                            if (foundVar) {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                                ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                                ccState.getProperty("userFunctionReturns")[index].returns = argType
                                if (containedWithin.length > 0) {
                                    ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                                }
                            } else {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = "var"
                                ccState.getProperty("userFunctionReturns")[index].flagVal = arg.id.v
                            }
                        }
                        if (argType === "Compare") {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("Compare", ccState.getProperty("userFunctionReturns")[index].opsDone, node.lineno)
                            ccHelpers.listTypesWithin(arg, containedWithin, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                            if (containedWithin.length > 0) {
                                ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                            }
                        }
                        if (argType === "BoolOp") {
                            argType = "Bool"
                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("BoolOp", ccState.getProperty("userFunctionReturns")[index].opsDone, node.lineno)
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = argType
                            ccHelpers.listTypesWithin(arg, containedWithin, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                            if (containedWithin.length > 0) {
                                ccState.getProperty("userFunctionReturns")[index].containedValue = containedWithin
                            }
                        }
                        if (argType === "Call") {
                            var foundFunc = false
                            var funcName = ""
                            if ("id" in node.value.func) {
                                funcName = node.value.func.id.v
                            } else {
                                funcName = node.value.func.attr.v
                            }
                            if (funcName === "readInput") {
                                ccState.getProperty("userFunctionReturns")[index].indexAndInput.input = true
                            }
                            if (ccState.getProperty("listFuncs").includes(funcName)) {
                                ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.addOpToList("ListOp", ccState.getProperty("userFunctionReturns")[index].opsDone, node.lineno)
                                if (node.value.func.value._astname === "List") {
                                    var valuesInList = ccHelpers.listTypesWithin(node.value.func.value.elts, [], ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    for (var vil = 0; vil < valuesInList; vil++) {
                                        ccState.getProperty("userFunctionReturns")[index].containedValue.push(valuesInList[vil])
                                    }
                                }
                                // binop
                                if (node.value.func.value._astname === "BinOp") {
                                    var valsInOp = []
                                    ccHelpers.listTypesWithin(node.value.func.value, valsInOp, ccState.getProperty("userFunctionReturns")[index].indexAndInput, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    for (var vio = 0; vio < valsInOp.length; vio++) {
                                        ccState.getProperty("userFunctionReturns")[index].containedValue.push(valsInOp[vio])
                                    }
                                }
                                // func call
                                if (node.value.func.value._astname === "Call" && "id" in node.value.func.value) {
                                    var calledFunction = ccHelpers.getFunctionObject(node.value.func.value.id.v)
                                    if (calledFunction != null) {
                                        ccHelpers.copyAttributes(calledFunction, ccState.getProperty("userFunctionReturns")[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"])
                                        if (calledFunction.containedValue != null) {
                                            ccHelpers.appendArray(calledFunction.containedValue, ccState.getProperty("userFunctionReturns")[index].containedValue)
                                        }
                                        if (calledFunction.opsDone != null) {
                                            ccState.getProperty("userFunctionReturns")[index].opsDone = ccHelpers.appendOpList(calledFunction.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                        }
                                    }
                                }
                                // var
                                if (node.value.func.value._astname === "Name") {
                                    var valueVariable = ccHelpers.getVariableObject(node.value.func.value.id.v)
                                    if (valueVariable != null) {
                                        ccHelpers.copyAttributes(valueVariable, ccState.getProperty("userFunctionReturns")[index], ["indexAndInput", "nested"])
                                        if (valueVariable.nodeElements.length > 0) {
                                            ccState.getProperty("userFunctionReturns").nodeElements = [valueVariable.nodeElements[0]]
                                            ccState.getProperty("userFunctionReturns").stringElements = [valueVariable.stringElements[0]]
                                        }
                                        ccHelpers.appendArray(valueVariable.containedValue, ccState.getProperty("userFunctionReturns")[index].containedValue)
                                        ccHelpers.appendOpList(valueVariable.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                    }
                                }
                            }
                            var funcRet = ccHelpers.getFunctionObject(arg.id.v)
                            if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                foundFunc = true
                                ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                                ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                                ccState.getProperty("userFunctionReturns")[index].returns = funcRet.returns
                                if (funcRet.containedValue != null) {
                                    ccState.getProperty("userFunctionReturns")[index].containedValue = funcRet.containedValue
                                }
                                if (funcRet.opsDone != null) {
                                    ccHelpers.appendOpList(funcRet.opsDone, ccState.getProperty("userFunctionReturns")[index].opsDone)
                                }
                            }
                            if (!foundFunc) {
                                ccState.getProperty("userFunctionReturns")[index].funcVar = "func"
                                ccState.getProperty("userFunctionReturns")[index].flagVal = arg.func.id.v
                            }
                        }
                        if (argType === "List") {
                            ccState.getProperty("userFunctionReturns")[index].flagVal = ""
                            ccState.getProperty("userFunctionReturns")[index].funcVar = ""
                            ccState.getProperty("userFunctionReturns")[index].returns = "List"
                            ccState.getProperty("userFunctionReturns")[index].containedValue = ccHelpers.listTypesWithin(arg.elts,
                                ccState.getProperty("userFunctionReturns")[index].containedValue,
                                ccState.getProperty("userFunctionReturns")[index].indexAndInput,
                                ccState.getProperty("userFunctionReturns")[index].opsDone)
                            ccState.getProperty("userFunctionReturns")[index].nodeElements = [{
                                line: arg.lineno,
                                elts: arg.elts,
                            }]
                            ccState.getProperty("userFunctionReturns")[index].stringElements = [{
                                line: arg.lineno,
                                elts: ccHelpers.nodesToStrings(arg.elts),
                            }]
                        }
                    }
                }
                // deal with modifiesParams and assignedModified for the function and param var, respectively
                var modifiesParams = []
                var funcName = ""
                if ("id" in node.func) {
                    lineNumber = 0
                    if (node.lineno != null) {
                        lineNumber = node.lineno
                        ccState.setProperty("parentLineNumber", lineNumber)
                    } else {
                        lineNumber = ccState.getProperty("parentLineNumber")
                    }
                    var originality = (ccState.getProperty("originalityLines").includes(lineNumber))
                    funcName = node.func.id.v
                    nodeArgs = node.args
                    var startLine = 0
                    var endLine = 0
                    for (var f = 0; f < ccState.getProperty("userFunctionReturns").length; f++) {
                        if (ccState.getProperty("userFunctionReturns")[f].name === funcName && ccState.getProperty("userFunctionReturns")[f].paramsChanged != null) {
                            modifiesParams = ccState.getProperty("userFunctionReturns")[f].paramsChanged
                            startLine = ccState.getProperty("userFunctionReturns")[f].startLine
                            endLine = ccState.getProperty("userFunctionReturns")[f].endLine
                            break
                        }
                    }
                    for (var a = 0; a < nodeArgs.length; a++) {
                        if (modifiesParams.includes(a) && (nodeArgs[a]._astname === "Name" && nodeArgs[a].id.v !== "True" && nodeArgs[a].id.v !== "False")) {
                            modString = ccState.getProperty("studentCode")[node.lineno - 1]
                            for (var v = 0; v < ccState.getProperty("allVariables").length; v++) {
                                if (ccState.getProperty("allVariables")[v].name === nodeArgs[a].id.v) {
                                    var lineNo = node.lineno
                                    for (var h = 0; h < ccState.getProperty("loopLocations").length; h++) {
                                        if (lineNo >= ccState.getProperty("loopLocations")[h][0] && lineNo <= ccState.getProperty("loopLocations")[h][1]) {
                                            lineNo = ccState.getProperty("loopLocations")[h][0]
                                            break
                                        }
                                    }
                                    ccState.getProperty("allVariables")[v].assignedModified.push({
                                        line: lineNo,
                                        value: ccState.getProperty("studentCode")[lineNumber].trim(),
                                        original: originality,
                                        nodeValue: node,
                                    })
                                    ccState.getProperty("variableAssignments").push({ line: node.lineno, name: ccState.getProperty("allVariables")[v].name })
                                    ccState.getProperty("allVariables")[v].modifyingFunctions.push([startLine, endLine])
                                    break
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
        // This is a function for "Call" nodes. If something else gets passed accidentally, return.
        return
    }
    let originality = false
    originality = (ccState.getProperty("originalityLines").includes(node.lineno))
    // add to apiFunctionCalls
    const functionNameNode = ccHelpers.retrieveFromList(node.func)
    if (functionNameNode != null && functionNameNode._astname == "Name") {
        // add to api function calls
        var callObject = {}
        callObject.line = node.lineno
        callObject.function = functionNameNode.id.v
        callObject.args = []
        if (node.args != null) {
            callObject.args = ccHelpers.getArgValuesFromArray(node.args, node.lineno)
        }
        ccState.getProperty("allCalls").push(callObject)
        if (ccState.apiFunctions.includes(functionNameNode.id.v)) {
            ccState.getProperty("apiCalls").push(callObject)
        }
    } else if (functionNameNode != null && "attr" in functionNameNode) {
        var callObject = {}
        callObject.line = node.lineno
        callObject.function = functionNameNode.attr.v
        callObject.args = []
        if (node.args != null) {
            callObject.args = ccHelpers.getArgValuesFromArray([functionNameNode.value], node.lineno)
        }
        ccState.getProperty("allCalls").push(callObject)
    }
    // if it's a function that's been renamed, we count this as variables being 3
    if (originality) {
        // go through function renames
        // the varname is the first one
        for (var i in ccState.getProperty("userFunctionRenames")) {
            if (ccState.getProperty("userFunctionRenames")[i][0] === functionNameNode.id.v && results.variables < 3) {
                results.variables = 3
            }
        }
    }
    // if it's a function CALL there's an extra thing we note, and that's that the function is actually used once it's defined.
    let functionParametersIndex = -1
    let foundFunc = false
    var funcName = ""
    // get function name
    if ("id" in node.func) {
        funcName = node.func.id.v
    } else if ("attr" in node.func) {
        funcName = node.func.attr.v
    } else if (node.func._astname === "Subscript") {
        var nameNode = ccHelpers.retrieveFromList(node.func)
        if (nameNode._astname === "Name") {
            funcName = nameNode.id.v
            if (originality || ccHelpers.getFunctionObject(funcName).original) {
                results.List = 4
            }
        }
    } else if (ccHelpers.retrieveFromList(node.func) != node.func) {
        var nameNode = ccHelpers.retrieveFromList(node.func)
        if (nameNode._astname === "Name") {
            funcName = nameNode.id.v
            if (originality || ccHelpers.getFunctionObject(funcName).original) {
                results.List = 4
            }
        }
    }
    for (var f = 0; f < ccState.getProperty("userFunctionParameters").length; f++) {
        if (ccState.getProperty("userFunctionParameters")[f].name === funcName) {
            foundFunc = true
            functionParametersIndex = f
            break
        }
    }
    // using a list as a makeBeat() parameter counts as indexing it for a purpose.
    if ((funcName === "makeBeat" || ccState.getProperty("makeBeatRenames").includes(funcName)) && results.lists < 4 && node.args.length > 0) {
        // see if the arg is a list
        // get the first argument
        const firstArg = node.args[0]
        let mbList = false
        let listOrig = false
        // if it's a subscript or pop it DOESN'T MATTER cause that'll get marked anyway, so we can ignore.
        if (firstArg._astname === "List") {
            mbList = true
        }
        if (firstArg._astname === "BinOp") {
            if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(firstArg))) {
                mbList = true
            }
            const nestedItems = []
            ccHelpers.getNestedVariables(firstArg, nestedItems)
            for (var f = 0; f < nestedItems.length; f++) {
                if (nestedItems[f].original) {
                    listOrig = true
                    break
                }
            }
        }
        if (firstArg._astname === "Call") {
            if ("id" in firstArg.func) {
                // else, is it a UDF/api func thatccState.getProperty('returns')a list?
                const calledFunc = ccHelpers.getFunctionObject(firstArg.func.id.v)
                if (calledFunc != null && calledFunc.returns === "List") {
                    mbList = true
                }
                if (calledFunc.original) {
                    listOrig = true
                }
            }
        }
        if (firstArg._astname === "Name") {
            // find the variable
            if ("id" in firstArg) {
                const argVar = ccHelpers.getVariableObject(firstArg.id.v)
                if (argVar != null && argVar.value === "List") {
                    mbList = true
                    listOrig = argVar.original
                }
            }
        }
        if (mbList && (listOrig || originality)) {
            results.List = 4
        }
    }
    // let's check the args
    // using something as an argument counts as using "for a purpose," so this gets updated in the results.
    var argResults = {
        Float: false,
        Int: false,
        Str: false,
        Bool: false,
        List: false,
    }
    let nodeArgs = []
    var funcName = ""
    let functionOriginality = false
    if ("args" in node) {
        nodeArgs = node.args
    }
    let funcNode = node.func
    funcNode = ccHelpers.retrieveFromList(funcNode)
    // get the function's name and arguments
    if ("id" in node.func) {
        funcName = node.func.id.v
        nodeArgs = node.args
    } else if ("attr" in node.func) {
        funcName = node.func.attr.v
        if (node.func.value._astname === "Name") {
            nodeArgs = [node.func.value]
        } else if (node.func.value._astname === "List") {
            nodeArgs = node.func.value.elts
        } else if (node.func.value._astname === "Str") {
            nodeArgs = [node.func.value]
        }
        if (node.args != null) {
            for (var i in node.args) {
                nodeArgs.push(node.args[i])
            }
        }
    }
    const thisFuncReturnObj = ccHelpers.getFunctionObject(funcName)
    if (thisFuncReturnObj != null && thisFuncReturnObj.original != null && thisFuncReturnObj.original === true) {
        functionOriginality = true
    }
    // update contained values as well
    if (functionOriginality && thisFuncReturnObj.opsDone != null) {
        for (var i in thisFuncReturnObj.containedValue) {
            argResults[thisFuncReturnObj.containedValue[i]] = true
        }
    }
    // if anything reaches a new level, update the results.
    if (originality || functionOriginality) {
        for (const arg in argResults) {
            if (argResults[arg] && results[arg] < 3) {
                results[arg] = 3
            }
        }
    }
    // check for various datatypes in the arguments of the call
    for (let a = 0; a < nodeArgs.length; a++) {
        var argResults = {
            List: false,
        }
        let singleArg = nodeArgs[a]
        // extract values from UnaryOp and Subscript nodes
        if (singleArg._astname === "UnaryOp") {
            singleArg = singleArg.operand
        }
        if (ccHelpers.retrieveFromList(singleArg) != singleArg) {
            var varsIn = []
            ccHelpers.getNestedVariables(singleArg, varsIn)
            var anyOriginality = originality
            if (!anyOriginality) {
                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                    if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                        anyOriginality = true
                        break
                    }
                }
            }
            if (varsIn.length > 0 && anyOriginality) {
                purposeVars = true
            }
        }
        if (singleArg != null && singleArg._astname === "Subscript") {
            if (originality) {
                if (ccHelpers.getIndexingInNode(singleArg)[0]) {
                    results.List = 4
                }
            }
            var varsIn = []
            ccHelpers.getNestedVariables(singleArg, varsIn)
            var anyOriginality = originality
            if (!anyOriginality) {
                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                    if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                        anyOriginality = true
                        break
                    }
                }
            }
            if (varsIn.length > 0 && anyOriginality) {
                purposeVars = true
            }
        }
        singleArg = ccHelpers.retrieveFromList(singleArg)
        // then - what type of argument is it?
        if (singleArg != null) {
            if (singleArg._astname === "UnaryOp") {
                singleArg = singleArg.operand
            }
            // special handling for function expressions
            if (singleArg._astname === "FunctionExp") {
                let nameString = ""
                let funcExpOriginality = false
                nameString += singleArg.lineno + "|" + singleArg.col_offset
                for (var i in ccState.getProperty("userFunctionParameters")) {
                    if (ccState.getProperty("userFunctionParameters")[i].name === nameString) {
                        if (ccState.getProperty("userFunctionParameters")[i].params.length > 0) {
                            ccState.setProperty("takesArgs", true)
                        }
                        break
                    }
                }
                if (ccHelpers.getFunctionObject(nameString) != null && ccHelpers.getFunctionObject(nameString).returns != null && ccHelpers.getFunctionObject(nameString).returns !== "") {
                    ccState.setProperty("returns", true)
                }
                if (ccHelpers.getFunctionObject(nameString).originality != null && ccHelpers.getFunctionObject(nameString).originality === true) {
                    funcExpOriginality = true
                }
                if ((originality || funcExpOriginality) && Number.isInteger(results.userFunc) && results.userFunc < 3) {
                    results.userFunc = 3
                }
                if (ccState.getProperty("takesArgs") && !returns && results.userFunc === 3) {
                    results.userFunc = "Args"
                } else if (!ccState.getProperty("takesArgs") && ccState.getProperty("returns") && (results.userFunc === 3)) {
                    results.userFunc = "Returns"
                } else if ((!ccState.getProperty("takesArgs") && ccState.getProperty("returns") && results.userFunc === "Args") || ((ccState.getProperty("takesArgs") && !returns && results.userFunc === "Returns"))) {
                    results.userFunc = "ReturnAndArgs"
                } else if (ccState.getProperty("takesArgs") && ccState.getProperty("returns") && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
                    results.userFunc = "ReturnAndArgs"
                }
                if (functionParametersIndex > -1) {
                    // if a matches an index, make a fake node and recursively analyze
                    for (const paramFunc in ccState.getProperty("userFunctionParameters")[functionParametersIndex].paramFuncsCalled) {
                        if (ccState.getProperty("userFunctionParameters")[functionParametersIndex].paramFuncsCalled[paramFunc].index === a) {
                            // make a fake node
                            const fakeNode = Object.assign({}, ccState.getProperty("userFunctionParameters")[functionParametersIndex].paramFuncsCalled[paramFunc].node)
                            if (singleArg._astname === "Name") {
                                fakeNode.func = Object.assign({}, singleArg)
                                fakeNode.func._astname = "Name"
                                fakeNode._astname = "Call"
                                analyzeFunctionCall(fakeNode, results, loopParent, [], purposeVars)
                            }
                            break
                        }
                    }
                }
            }
            // if the argument is a call to another function, look up what it contains/returns
            if (singleArg._astname === "Call") {
                var lineNumberToUse = node.lineno
                // get the name and arguments
                var funcName = ""
                let argFunc = singleArg.func
                argFunc = ccHelpers.retrieveFromList(argFunc)
                if ("id" in argFunc) {
                    funcName = argFunc.id.v
                } else if ("attr" in argFunc) {
                    funcName = argFunc.attr.v
                }
                if (ccState.getProperty("listFuncs").includes(funcName)) {
                    argResults.Lists = true
                }
                if (funcName === "readInput") {
                    results.consoleInput = 3
                }
                // getccState.getProperty('returns')values
                let funcReturn = ""
                let returnContains = []
                const funcItem = ccHelpers.getFunctionObject(funcName)
                if (funcItem != null) {
                    funcReturn = funcItem.returns
                    if (funcItem.containedValue != null) {
                        returnContains = funcItem.containedValue
                    }
                    if (funcItem.nested) {
                        purposeVars = true
                    }
                    if (funcItem.indexAndInput != null && funcItem.indexAndInput.indexed) {
                        results.List = 4
                    }
                } else if (results[funcReturn] < 3 && funcReturn == "List") {
                    argResults[funcReturn] = true
                }
                if (returnContains != null) {
                    for (let ret = 0; ret < returnContains.length; ret++) {
                        const funcReturnCont = returnContains[ret]
                        if (results[funcReturnCont] < 3) {
                            argResults[funcReturnCont] = true
                        }
                    }
                }
            } else if (singleArg._astname === "List") {
                // if it's a list, we also look at and note all the types in the list as being used for a purpose.
                argResults.List = true
                const listInputIndexing = {
                    input: false,
                    indexed: false,
                    strIndexed: false,
                }
                let listValues = []
                if (originality && listInputIndexing.indexed) {
                    results.List = 4
                } else {
                    listValues = ccHelpers.listTypesWithin(singleArg.elts, listValues, { input: false, indexed: false, strIndexed: false }, [])
                }
                listValues.forEach((arg) => {
                    argResults[arg] = true
                })
                if (listInputIndexing.input && originality) {
                    results.consoleInput = 3
                }
                var varsIn = []
                ccHelpers.getNestedVariables(singleArg, varsIn)
                var anyOriginality = originality
                if (!anyOriginality) {
                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                        if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                            anyOriginality = true
                            break
                        }
                    }
                }
                if (varsIn.length > 0 && anyOriginality) {
                    purposeVars = true
                }
            } else if (singleArg._astname === "Name" && singleArg.id.v !== "True" && singleArg.id.v !== "False") {
                // if it's a variable, we mark its value/contained values
                var lineNumberToUse = node.lineno
                // check to see if this is a variable whose value has been changed at least once before this call
                var argModded = false
                var modOriginality = false
                const modString = ""
                var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                var insideLines = [-1, -1]
                const assignOriginality = false
                const varType = ""
                const varInput = false
                // update results
                if (originality || assignOriginality || functionOriginality) {
                    if (purposeVars && (results.variables < 3)) {
                        results.variables = 3
                    }
                    for (const arg in argResults) {
                        if (argResults[arg] && results[arg] < 3 && arg == "List") {
                            results[arg] = 3
                        }
                    }
                }
            } else if ((singleArg._astname === "BinOp" || singleArg._astname === "BoolOp" || singleArg._astname === "Compare" || singleArg._astname === "List")) {
                if (ccHelpers.getIndexingInNode(singleArg)[0] && (originality || ccHelpers.getIndexingInNode(singleArg)[1])) {
                    results.List = 4
                }
            }
            // for binops, boolops, comparisons, we check what types are inside
            if (singleArg._astname === "BinOp") {
                // Anything in a binOp counts as used for a purpose (e.g. " 'potato' + ' tomato' " passed as an arg counts for strings used for a purpose.
                const withinBinOp = []
                let binOpComponentOriginality = false
                const containedInOp = []
                ccHelpers.getNestedVariables(singleArg, containedInOp)
                for (let u = 0; u < containedInOp.length; u++) {
                    if (ccHelpers.getVariableObject(containedInOp[u]) != null && ccHelpers.getVariableObject(containedInOp[u]).original) {
                        binOpComponentOriginality = true
                        break
                    }
                }
                if (originality || binOpComponentOriginality) {
                    if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(singleArg)) && results.listOps < 3) {
                        results.listOps = 3
                    }
                    if (ccHelpers.recursivelyAnalyzeBinOp(singleArg) === "Str" && results.strOps < 3) {
                        results.strOps = 3
                    }
                }
                if (!originality) {
                    ccHelpers.listTypesWithin(singleArg, withinBinOp, { input: false, indexed: false, strIndexed: false }, [])
                } else {
                    const inputIndexPurpose = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }; if (inputIndexPurpose.input) {
                        results.consoleInput = 3
                    }
                    if (inputIndexPurpose.indexed) {
                        results.List = 4
                    }
                }
                for (let p = 0; p < withinBinOp.length; p++) {
                    if (Array.isArray(withinBinOp[p])) { // if the binop includes a list, go through THAT.
                        argResults.List = true
                    }
                }
            } else if (singleArg._astname === "BoolOp") {
                // if it's a bool op, we need all the values in that
                const boolOpValues = []
                if (!originality) {
                    ccHelpers.listTypesWithin(singleArg, boolOpValues, {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }, [])
                } else {
                    const inputForPurposeInArg = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }
                    if (inputForPurposeInArg.input) {
                        results.consoleInput = 3
                    }
                    if (inputForPurposeInArg.indexed) {
                        results.List = 4
                    }
                }
                for (let b = 0; b < boolOpValues.length; b++) {
                    argResults[boolOpValues[b]] = true
                }
            } else if (singleArg._astname === "Compare") {
                // same for comparison statemenrs
                const compareValues = []
                const indexInputItem = {
                    input: false,
                    indexed: false,
                    strIndexed: false,
                }
                if (!originality) {
                    ccHelpers.listTypesWithin(singleArg, compareValues, { input: false, indexed: false, strIndexed: false }, [])
                } else if (indexInputItem.indexed) {
                    results.List = 4
                }
                if (indexInputItem.input) {
                    results.consoleInput = 3
                }
                // update datatype usage bools
                if (compareValues.includes("List")) { argResults.List = true }
            }
            // is it something else that can CONTAIN a variable value? We need to check this for setting results.variables to 3
            if (singleArg._astname === "List" || singleArg._astname === "BinOp" || singleArg._astname === "BoolOp" || singleArg._astname === "Compare") {
                if (singleArg._astname === "Compare" && originality) { results.comparisons = 3 }
                var modOriginality = false
                const allNamesWithin = []
                ccHelpers.getNestedVariables(singleArg, allNamesWithin)
                // if ANY of these is marked as original, assignment counts as original
                const originalAssign = false
                for (let n = 0; n < allNamesWithin.length; n++) {
                    const otherVariable = ccHelpers.getVariableObject(allNamesWithin[n])
                    if (otherVariable != null) {
                        var argModded = false
                        const containedVal = otherVariable.value
                        var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1]
                        // is the use inside or outside a function?
                        for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                            if (node.lineno >= otherVariable.modifyingFunctions[f][0] && node.lineno <= otherVariable.modifyingFunctions[f][1]) {
                                insideOutside = "inside"
                                insideLines = otherVariable.modifyingFunctions[f]
                                break
                            }
                        }
                        if (insideOutside === "outside") {
                            insideLines = []
                            for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                for (let line = otherVariable.modifyingFunctions[f][0]; line <= otherVariable.modifyingFunctions[f][1]; line++) {
                                    insideLines.push(line)
                                }
                            }
                        }
                        let numberOfMods = 0
                        for (let z = 0; z < otherVariable.assignedModified.length; z++) {
                            if (otherVariable.assignedModified[z].line > node.lineno) { break }// stop loop before we get to the current line OR if both thigns we're looking for are already set to true.
                            // is there a modification? is it original?
                            if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                argModded = true
                                numberOfMods += 1
                                if (otherVariable.assignedModified[z].original) { modOriginality = true }
                            }
                        }
                        // update results object
                        if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                            results.variables = 4
                        }
                        if (otherVariable.original || originality) {
                            if (otherVariable.indexAndInput.input) {
                                results.consoleInput = 3
                            }
                            if (results[containedVal] < 3 && containedVal == "List") {
                                results[containedVal] = 3
                            }
                        }
                    }
                }
                if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                    results.variables = 3
                }
            }
            // if anything reaches a new level, update the results.
            if (originality || functionOriginality) {
                if (purposeVars && (results.variables < 3)) {
                    results.variables = 3
                }
                for (const arg in argResults) {
                    if (argResults[arg] && results[arg] < 3 && arg == "List") {
                        results[arg] = 3
                    }
                }
            }
        }
    }
    // if the function or its call is original, update in results
    if ((originality || (ccHelpers.getFunctionObject(funcName) != null && ccHelpers.getFunctionObject(funcName).original != null && ccHelpers.getFunctionObject(funcName).original))) {
        if (Number.isInteger(results.userFunc) && results.userFunc < 3 && foundFunc) { results.userFunc = 3 }
        const funcFound = ccHelpers.getFunctionObject(funcName)
        if (funcFound == null) {
            // is it in ForLoopFuncs instead???
            let fLF = null
            for (var f in ccState.getProperty("forLoopFuncs")) {
                if (ccState.getProperty("forLoopFuncs")[f].callName === funcName) {
                    fLF = ccState.getProperty("forLoopFuncs")[f]
                    break
                }
            }
            if (fLF != null) {
                // handle variable originality too
                let forLoopOrig = false
                if (!originality && ccState.getProperty("originalityLines").includes(fLF.startLine)) {
                    // this is done only if the call isn't original, for efficiency's sake
                    forLoopOrig = true
                }
                if (originality || forLoopOrig) {
                    results.variables = 4
                }
                for (const otherName in fLF.functionNames) {
                    const otherFunc = ccHelpers.getFunctionObject(fLF.functionNames[otherName])
                    let paramFuncIndex = -1
                    if (otherFunc != null) {
                        if (Number.isInteger(results.userFunc) && results.userFunc < 3) {
                            results.userFunc = 3
                        }
                        for (var f = 0; f < ccState.getProperty("userFunctionParameters").length; f++) {
                            if (ccState.getProperty("userFunctionParameters")[f].name === fLF.functionNames[otherName]) {
                                paramFuncIndex = f
                                break
                            }
                        }
                        if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns != null) {
                            ccState.setProperty("returns", true)
                        }
                        if (otherFunc.indexAndInput != null) {
                            if (otherFunc.indexAndInput.indexed) {
                                results.List = 4
                            }
                            if (otherFunc.indexAndInput.input) {
                                results.consoleInput = 3
                            }
                        }
                        if (ccState.getProperty("userFunctionParameters")[paramFuncIndex].params.length > 0) {
                            ccState.setProperty("takesArgs", true)
                        }
                    }
                }
            }
        } else if (foundFunc) {
            // update results
            if (funcFound != null && funcFound.returns !== "" && funcFound.returns != null) {
                ccState.setProperty("returns", true)
            }
            if (funcFound.indexAndInput != null) {
                if (funcFound.indexAndInput.indexed) {
                    results.List = 4
                }
                if (funcFound.indexAndInput.input) {
                    results.consoleInput = 3
                }
            }
            if (functionParametersIndex != -1 && ccState.getProperty("userFunctionParameters")[functionParametersIndex].params.length > 0) {
                ccState.setProperty("takesArgs", true)
            }
        }
        if (ccState.getProperty("takesArgs") && !returns && results.userFunc === 3) {
            results.userFunc = "Args"
        } else if (!ccState.getProperty("takesArgs") && ccState.getProperty("returns") && (results.userFunc === 3)) {
            results.userFunc = "Returns"
        } else if ((!ccState.getProperty("takesArgs") && ccState.getProperty("returns") && results.userFunc === "Args") || ((ccState.getProperty("takesArgs") && !returns && results.userFunc === "Returns"))) {
            results.userFunc = "ReturnAndArgs"
        } else if (ccState.getProperty("takesArgs") && ccState.getProperty("returns") && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
            results.userFunc = "ReturnAndArgs"
        }
    }
}

// Analyze a single node of a Python AST.
function analyzeASTNode(node, results, loopParent) {
    let isForLoop = false
    let isWhileLoop = false
    if (node != null && node._astname != null) {
        let lineNumber = 0
        if (node.lineno != null) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNumber + 1)) {
            // initilize usage booleans
            const uses = {
                variables: false,
                conditionals: false,
                lists: false,
                consoleInput: false,
                userFunc: false,
                forLoops: false,
                whileLoops: false,
            }
            let usesVarsWithPurpose = false
            let orElse = false
            // FIRST, we check for usage of all of our concepts and update the uses object accordingly.
            if (node._astname === "Assign" || node[0] === "Assign") {
                uses.variables = true
            }
            if (node._astname === "Name" && node.id.v !== "True" && node.id.v !== "False" && ccHelpers.getVariableObject(node.id.v) != null) {
                uses.variables = true
                if (ccState.getProperty("originalityLines").includes(lineNumber) && results.variables < 2) {
                    results.variables = 2
                }
            }
            if (node._astname === "UnaryOp") {
                recursiveAnalyzeAST(node.operand, results, loopParent)
            }
            // look for user-defined functions
            if (node._astname === "FunctionDef") {
                uses.userFunc = true
            }
            // look for conditionals
            if (node._astname === "If") {
                ccHelpers.notateConditional(node)
                if (node.test._astname === "BoolOp" || node.test._astname === "UnaryOp") {
                    const names = []
                    ccHelpers.getNestedVariables(node.test, names)
                    if (names.length > 0) { usesVarsWithPurpose = true }
                    let anyOriginalNested = false
                    for (var i = 0; i < names.length; i++) {
                        const nameItem = ccHelpers.getVariableObject(names[i])
                        if (nameItem != null && nameItem.original) {
                            anyOriginalNested = true
                            break
                        }
                    }
                }
                if ((node.test._astname !== "Name" || node.test.id.v != "True" || node.test.id.v != "False") && (node.orelse != null && node.orelse.length > 0)) {
                    orElse = true
                    recursiveAnalyzeAST(node.orelse, results, loopParent)
                } // is there an "or else" element?
            }
            // look for for loops
            if (node._astname === "For" || node._astname === "JSFor") {
                uses.forLoops = true
                isForLoop = true
            }
            // look for while loops
            if (node._astname === "While") {
                usesWhileLoops = true
                isWhileLoop = true
            }
            // look for lists. should also cover lists passed as args.
            if (node._astname === "List") {
                uses.lists = true
                containerIndex = 0
            }
            // look for console input
            if ((node.value != null && node.value._astname === "Call") && ("id" in node.value.func && "v" in node.value.func.id && node.value.func.id.v === "readInput")) { uses.consoleInput = true }
            // mark usage of the things we are looknig for
            Object.keys(uses).forEach((key) => {
                if (uses[key] && results[key] === 0) { results[key] = 1 }
            })
            // Level 2 is originality, so we check that next.
            let originality = false
            // check for originality
            // if it's a chunk of code we check the whole chunk.
            if (node._astname === "FunctionDef" || node._astname === "If" || node._astname === "While" || node._astname === "For" || node._astname === "JSFor") {
                // OLD ORIGINALITY - leave these comments here and DO NOT DELETE until we are 100% ready to implement new originality!
                // then we have to check the WHOLE NODE for originality
                lineNumber = node.lineno - 1
                // lastLine = node.body[node.body.length - 1].lineno + 1;
                const lastLine = ccHelpers.getLastLine(node)
                for (let chunkLine = node.lineno; chunkLine <= lastLine; chunkLine++) {
                    if (ccState.getProperty("originalityLines").includes(chunkLine)) {
                        originality = true
                        break
                    }
                }
                // tree originaity, if we ever want to switch to this measure
                // originality = ccHelpers.TreeOriginality(node, 1, STRUCTURE_SAMPLES);
            } else {
                // then this is one line and we only need to check a single line
                lineNumber = 0
                if (node.lineno != null) {
                    lineNumber = node.lineno
                    ccState.setProperty("parentLineNumber", lineNumber)
                } else {
                    lineNumber = ccState.getProperty("parentLineNumber")
                }
                originality = (ccState.getProperty("originalityLines").includes(lineNumber))
            }
            // originality value updates for functions, variables, etc.
            if (originality) {
                if (node.id != null && node.id.v != null) {
                    const foundVar = ccHelpers.getVariableObject(node.id.v)
                    if (foundVar != null) {
                        const varName = foundVar.name
                        for (var f = 0; f < ccState.getProperty("allVariables").length; f++) {
                            if (ccState.getProperty("allVariables")[f].name === varName) {
                                ccState.getProperty("allVariables")[f].original = true // the variable is assigned in  unique line
                                break
                            }
                        }
                    }
                }
                // whatever is in here, mark that it's used uniquely.
                const markAsOriginal = ["variables", "consoleInput", "mathematicalOperators", "lists", "listOps", "strOps", "boolOps"]
                for (let attribute = 0; attribute < markAsOriginal.length; attribute++) {
                    if (uses[markAsOriginal[attribute]] && results[markAsOriginal[attribute]] < 2) {
                        results[markAsOriginal[attribute]] = 2
                    }
                }
                if (node._astname === "FunctionDef") {
                    if (uses.userFunc && (Number.isInteger(results.userFunc) && results.userFunc < 2)) {
                        results.userFunc = 2
                    }
                    // does this function take arguments or return values? //TODO can we get rid of this???? I fell like it's wrong
                    if (node.args.args.length > 0) {
                        ccState.setProperty("takesArgs", true)
                    }
                    for (var i = 0; i < node.body.length; i++) {
                        if (node.body[i]._astname === "Return") {
                            ccState.setProperty("returns", true)
                            break
                        }
                    }
                }
                // what about stuff in for loops (iterators, etc.?) Mark these as original if need be.
                if (node._astname === "For") {
                    if (uses.forLoops && results.forLoops < 2) {
                        results.forLoops = 2
                    }
                    if (node.iter._astname === "List") {
                        results.List = 4
                    }
                    if (node.iter._astname === "Name") {
                        const iterName = ccHelpers.getVariableObject(node.iter.id.v)
                        if (iterName != null) {
                            if (iterName.value === "List") {
                                results.List = 4
                            }
                        }
                    }
                    if ("func" in node.iter) {
                        if ("id" in node.iter.func && ccHelpers.getFunctionObject(node.iter.func.id.v) != null) {
                            const iterator = ccHelpers.getFunctionObject(node.iter.func.id.v)
                            if (iterator.returns === "List") {
                                results.List = 4
                            }
                        }
                    }
                    // if we're using range(), check for minimum and step values
                    if ("func" in node.iter && "id" in node.iter.func && node.iter.func.id.v === "range") {
                        if (node.iter.args.length === 2 && results.forLoops < 3) {
                            results.forLoops = 3
                        } else if (node.iter.args.length === 3 && results.forLoops < 4) {
                            results.forLoops = 4
                        }
                    }
                }
                // JSFor
                if (node._astname === "JSFor" && uses.forLoops && results.forLoops < 2) {
                    results.forLoops = 2
                }
                if (node._astname === "If") {
                    if (uses.conditionals && results.conditionals < 2) {
                        results.conditionals = 2
                    }
                    if (orElse && results.conditionals < 3) {
                        results.conditionals = 3
                    }
                }
            }
            if (originality && uses.comparisons) {
                results.comparisons = 2
            }
            // Level 3 is "uses for a purpose" - do that next
            let purposeVars = false
            // look for purposes for datatypes, variables, lists, ops
            const changesVarsForPurpose = false
            const originalAssignment = false
            if (node._astname === "Call") {
                // at this point, calls are shipped out to a helper function
                analyzeFunctionCall(node, results, loopParent, [], purposeVars)
            }
            // next, we look in conditional statements
            if (node._astname === "If") {
                // variable init
                const argDataTypes = {
                    Float: false,
                    Int: false,
                    String: false,
                    Bool: false,
                    List: false,
                }
                purposeVars = false
                var inputUsed = false
                // check the test node
                let testNode = node.test
                if (testNode._astname === "UnaryOp") {
                    var anyOr = originality
                    if (!originality) {
                        var unaryNames = []
                        ccHelpers.getNestedVariables(testNode, unaryNames)
                        for (var p in unaryNames) {
                            var isVar = ccHelpers.getVariableObject(unaryNames[p])
                            if (isVar != null && isVar.original) {
                                anyOr = true
                                break
                            }
                        }
                    }
                    if (anyOr) { results.Bool = 3 }
                    testNode = testNode.operand
                }
                // first, go through and grab all the bits of the test statement, whatever that may be
                if (testNode._astname === "Subscript") {
                    var isIndexedItem = ccHelpers.getIndexingInNode(testNode)[0]
                    const isStrIndexedItem = ccHelpers.getStringIndexingInNode(testNode)[0]
                    if (isIndexedItem) { results.List = 4 }
                    testNode = ccHelpers.retrieveFromList(testNode)
                }
                // unary op handling
                // YES, this is in here twice. That IS intentional. -Erin
                if (testNode != null && testNode._astname === "UnaryOp") {
                    var anyOr = originality
                    if (!originality) {
                        var unaryNames = []
                        ccHelpers.getNestedVariables(testNode, unaryNames)
                        for (var p in unaryNames) {
                            var isVar = ccHelpers.getVariableObject(unaryNames[p])
                            if (isVar != null && isVar.original) {
                                anyOr = true
                                break
                            }
                        }
                    }
                    testNode = testNode.operand
                }
                if (testNode != null) {
                    // this won't get checked on its own.
                    recursiveAnalyzeAST(testNode, results, loopParent)
                }
                // check for using for a purpose inside the test
                if (testNode != null && testNode._astname === "Compare") {
                    // update indexing variables
                    if (ccHelpers.getIndexingInNode(testNode)[0] && (originality || ccHelpers.getIndexingInNode(testNode)[1])) {
                        results.List = 4
                    }
                    if (originality) {
                        results.comparisons = 3
                        var inputIndexItem = {
                            input: false,
                            indexed: false,
                            strIndexed: false,
                        }
                        if (inputIndexItem.indexed) {
                            results.List = 4
                        }
                        if (inputIndexItem.input) {
                            inputUsed = true
                        }
                    }
                } else if (testNode != null && testNode._astname === "BinOp") {
                    // we have to check everything inside the binop's left and right items
                    var inputIndexItem = {
                        indexed: false,
                        input: false,
                        strIndexed: false,
                    }
                    if (ccHelpers.getIndexingInNode(testNode)[0] && (originality || ccHelpers.getIndexingInNode(testNode)[1])) {
                        results.List = 4
                    }
                    if (inputIndexItem.indexed) {
                        results.List = 4
                    }
                    if (inputIndexItem.input) {
                        inputUsed = true
                    }
                } else if (testNode != null && testNode._astname === "BoolOp") {
                    // same for boolops
                    var inputIndexPurp = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }
                    if (ccHelpers.getIndexingInNode(testNode)[0] && (originality || ccHelpers.getIndexingInNode(testNode)[1])) {
                        results.List = 4
                    }
                    if (inputIndexPurp.indexed) {
                        results.List = 4
                    }
                    if (inputIndexPurp.input) {
                        inputUsed = true
                    }
                } else if (testNode != null && testNode._astname === "List") {
                    // for lists, we have to check every item
                    var inputIndexPurp = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }
                    if (ccHelpers.getIndexingInNode(testNode)[0] && (originality || ccHelpers.getIndexingInNode(testNode)[1])) {
                        results.List = 4
                    }
                    if (inputIndexPurp.indexed) {
                        results.List = 4
                    }
                    if (inputIndexPurp.input) {
                        inputUsed = true
                    }
                } else if (testNode != null && testNode._astname === "Name") {
                    // grab variable val if it represents a single datatype
                    // also, get information about ops and contained values from the variable
                    if (testNode.id.v !== "True" && testNode.id.v !== "False") {
                        let value = ""
                        let containedValInTest = null
                        const testVar = ccHelpers.getVariableObject(testNode.id.v)
                        if (testVar != null) {
                            value = testVar.value
                            if (testVar.indexAndInput.input) {
                                inputUsed = true
                            }
                            containedValInTest = testVar.containedValue
                            if (testVar.indexAndInput.indexed && (originality || testVar.original)) {
                                results.List = 4
                            }
                        }
                    }
                } else if (testNode != null && testNode._astname === "Call") {
                    analyzeASTNode(testNode, results, parent)
                    recursiveAnalyzeAST(testNode, results, parent)
                    var funcName = ""
                    var argList = []
                    // get function name and args
                    if ("id" in testNode.func) {
                        funcName = testNode.func.id.v
                        argList = testNode.args
                    } else {
                        funcName = testNode.func.attr.v
                    }
                    if (funcName === "readInput") {
                        inputUsed = true
                    }
                }
                recursiveAnalyzeAST(testNode, results, loopParent)
                var modOriginality = false
                if (testNode != null && testNode._astname === "Name" && testNode.id.v !== "True" && testNode.id.v !== "False") {
                    var originalAssign = false
                    var varInput = false
                    var testVariable = ccHelpers.getVariableObject(node.test.id.v)
                    if (testVariable != null) {
                        var argModded = false
                        var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1]
                        if (testVariable.indexAndInput.input) { varInput = true }
                        if (testVariable.original) { originalAssign = true }
                        // is the use inside or outside a function?
                        for (var n = 0; n < testVariable.modifyingFunctions.length; n++) {
                            if (node.lineno >= testVariable.modifyingFunctions[n][0] && node.lineno <= testVariable.modifyingFunctions[n][1]) {
                                insideOutside = "inside"
                                insideLines = testVariable.modifyingFunctions[n]
                                break
                            }
                        }
                        if (insideOutside === "outside") {
                            insideLines = []
                            for (var n = 0; n < testVariable.modifyingFunctions.length; n++) {
                                for (var line = testVariable.modifyingFunctions[n][0]; line <= testVariable.modifyingFunctions[n][1]; line++) {
                                    insideLines.push(line)
                                }
                            }
                        }
                        var numberOfMods = 0
                        for (var z = 0; z < testVariable.assignedModified.length; z++) {
                            if (testVariable.assignedModified[z].line > node.lineno) { break } // stop loop before we get to the current line OR if both things we're looking for are already set to true.
                            // is there a modification? is it original?
                            if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                argModded = true
                                numberOfMods += 1
                                if (testVariable.assignedModified[z].original) { modOriginality = true }
                            }
                        }
                        if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) { results.variables = 4 }
                    }
                    // update results object
                    if (originalAssign || originality) {
                        if (varInput && results.consoleInput < 3) {
                            results.consoleInput = 3
                        }
                        if (results.variables < 3) {
                            results.variables = 3
                        }
                        if ((assignOriginality || originality)) {
                            if (results[varType] != null && varType == "List" && results[varType] < 3) {
                                results[varType] = 3
                            }
                        }
                    }
                }
                // is the argument something else that can CONTAIN a variable value?
                // This is where we go through and see if any variables are contained in other structures (e.g., a binop or list)
                if (testNode != null && (testNode._astname === "List" || testNode._astname === "BinOp" || testNode._astname === "BoolOp" || testNode._astname === "Compare")) {
                    if (testNode._astname === "Compare" && originality) { results.comparisons = 3 }
                    var originalAssign = false
                    var varInput = false
                    var allNamesWithin = []
                    ccHelpers.getNestedVariables(testNode, allNamesWithin)
                    // if ANY of these is marked as original, assignment counts as original
                    var originalAssign = false
                    for (var n = 0; n < allNamesWithin.length; n++) {
                        const varWithin = ccHelpers.getVariableObject(allNamesWithin[n])
                        if (varWithin != null) {
                            var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1]
                            var argModded = false
                            var containedVal = varWithin.value
                            var numberOfMods = 0
                            // is the use inside or outside a function?
                            for (var i = 0; i < varWithin.modifyingFunctions.length; i++) {
                                if (node.lineno >= varWithin.modifyingFunctions[i][0] && node.lineno <= varWithin.modifyingFunctions[i][1]) {
                                    insideOutside = "inside"
                                    insideLines = varWithin.modifyingFunctions[i]
                                    break
                                }
                            }
                            if (insideOutside === "outside") {
                                insideLines = []
                                for (var i = 0; i < varWithin.modifyingFunctions.length; i++) {
                                    for (var line = varWithin.modifyingFunctions[i][0]; line <= varWithin.modifyingFunctions[i][1]; line++) {
                                        insideLines.push(line)
                                    }
                                }
                            }
                            for (var z = 0; z < varWithin.assignedModified.length; z++) {
                                if (varWithin.assignedModified[z].line > node.lineno) { // stop loop before we get to the current line OR if both things we're looking for are already set to true.
                                    break
                                }
                                // is there a modification? is it original?
                                if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                    argModded = true
                                    numberOfMods += 1
                                    if (varWithin.assignedModified[z].original) {
                                        modOriginality = true
                                    }
                                }
                            }
                            if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                results.variables = 4
                            }
                            if (varWithin.original) {
                                originalAssign = true
                            }
                            // update results
                            if (varWithin.original || originality) {
                                if (results[containedVal] < 3) {
                                    results[containedVal] = 3
                                }
                            }
                        }
                    }
                    if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                        results.variables = 3
                    }
                }
            }
            // if it's a for loop (python, or JS for-in), we chack the iterator
            if (node._astname === "For") {
                const datatypesUsed = []
                let nodeIter = node.iter
                // get unary-op and subscript sub-values
                if (nodeIter._astname === "UnaryOp") {
                    var anyOr = originality
                    if (!originality) {
                        var unaryNames = []
                        ccHelpers.getNestedVariables(nodeIter, unaryNames)
                        for (var p in unaryNames) {
                            var isVar = ccHelpers.getVariableObject(unaryNames[p])
                            if (isVar != null && isVar.original) {
                                anyOr = true
                                break
                            }
                        }
                    }
                    nodeIter = nodeIter.operand
                }
                nodeIter = ccHelpers.retrieveFromList(nodeIter)
                if (nodeIter._astname === "UnaryOp") { nodeIter = nodeIter.operand }
                // these won't get anayzed automatically
                analyzeASTNode(node.iter, results, loopParent)
                analyzeASTNode(node.target, results, loopParent)
                // get all of the stuff inside, and update results to match
                if (originality) {
                    const inputTaken = false
                    if ("func" in nodeIter) {
                        for (let fa = 0; fa < nodeIter.args.length; fa++) {
                            if (nodeIter.args[fa]._astname === "Call" && (nodeIter.args[fa].func.id.v === "readInput" && results.consoleInput < 3)) {
                                results.consoleInput = 3
                            }
                            if (nodeIter.args[fa]._astname === "BinOp") {
                                // var init
                                var inputIndexItem = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false,
                                }
                                const binOpIndex = false
                                const binOpStrIndex = false
                                // update results
                                if (inputIndexItem.input && results.consoleInput < 3) {
                                    results.consoleInput = 3
                                }
                                if (inputIndexItem.indexed) {
                                    results.List = 4
                                }
                                if (inputIndexItem.strIndexed) {
                                    results.Str = 4
                                }
                            }
                        }
                    } else if (nodeIter._astname === "List") {
                        // other things are also iterable!
                        if (ccHelpers.getIndexingInNode(nodeIter)[0]) {
                            results.List = 4
                        }
                        datatypesUsed.push("List")
                        var inputIndexItem = {
                            input: false,
                            indexed: false,
                            strIndexed: false,
                        }
                    } else if (nodeIter._astname === "Name") {
                        // iterator is a variable
                        const iteratorVar = ccHelpers.getVariableObject(nodeIter.id.v)
                        if (iteratorVar != null) {
                            if (iteratorVar.value === "List") {
                                results[iteratorVar.value] = 4
                            }
                            // update results
                            if ((iteratorVar.original || originality) && iteratorVar.indexAndInput.indexed) {
                                results.List = 4
                            }
                            if (iteratorVar.containedValue != null) {
                                for (var cv = 0; cv < iteratorVar.containedValue.length; cv++) {
                                    if (results[iteratorVar.containedValue[cv]] < 3) {
                                        results[iteratorVar.containedValue[cv]] = 3
                                    }
                                }
                            }
                            if (iteratorVar.indexAndInput.input) {
                                results.consoleInput = 3
                            }
                        }
                    } else if (nodeIter._astname === "BinOp") {
                        if (ccHelpers.getIndexingInNode(nodeIter)[0]) {
                            results.List = 4
                        }
                        const iterableBinOpTypes = []
                        const inputBinOp = false
                        const isList = Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeIter))
                        if (isList) {
                            results.List = 4
                        }
                        for (var p = 0; p < iterableBinOpTypes.length; p++) {
                            const typeName = iterableBinOpTypes[p]
                            if (typeName === "List") {
                                results[typeName] = 4
                            }
                        }
                        if (inputBinOp) {
                            results.consoleInput = 3
                        }
                    }
                    if (nodeIter._astname === "Call") {
                        var funcName = ""
                        if ("id" in nodeIter.func) {
                            funcName = nodeIter.func.id.v
                        } else if (nodeIter.func._astname === "Subscript") {
                            const subscriptCall = ccHelpers.retrieveFromList(nodeIter.func)
                            if (subscriptCall._astname === "Name") {
                                funcName = subscriptCall.id.v
                            }
                        } else {
                            funcName = nodeIter.func.attr.v
                        }
                        if (ccState.getProperty("listFuncs").includes(funcName)) {
                            results.listOps = 3
                        }
                        for (var u = 0; u < ccState.getProperty("userFunctionReturns").length; u++) {
                            if (ccState.getProperty("userFunctionReturns")[u].name === funcName) {
                                results[ccState.getProperty("userFunctionReturns")[u].returns] = 3
                                if (originality && ccState.getProperty("userFunctionReturns")[u].indexAndInput.indexed) {
                                    results.List = 4
                                }
                            }
                            if (ccState.getProperty("userFunctionReturns")[u].containedValue != null) {
                                for (var cv = 0; cv < ccState.getProperty("userFunctionReturns")[u].containedValue.length; cv++) {
                                    if (ccState.getProperty("userFunctionReturns")[u].containedValue[cv] === "List") {
                                        results.List = 4
                                    } else {
                                        results[ccState.getProperty("userFunctionReturns")[u].containedValue[cv]] = 3
                                    }
                                }
                            }
                        }
                    }
                    if (inputTaken) {
                        results.consoleInput = 3
                    }
                }
                var varInput = false
                // node iter is a function call
                if ("func" in nodeIter) {
                    // get function name
                    let iterFuncName = ""
                    if ("id" in nodeIter.func) {
                        iterFuncName = nodeIter.func.id.v
                    } else if ("attr" in nodeIter.func) {
                        iterFuncName = nodeIter.func.attr.v
                    } else if (nodeIter.func._astname === "Subscript") {
                        const iterNameNode = ccHelpers.retrieveFromList(nodeIter.func)
                        if (iterNameNode._astname === "Name") {
                            iterFuncName = iterNameNode.id.v
                        }
                        var varsIn = []
                        ccHelpers.getNestedVariables(nodeIter.func, varsIn)
                        var anyOriginal = originality
                        if (!anyOriginal) {
                            for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                                    anyOriginal = true
                                    break
                                }
                            }
                        }
                        if (anyOriginal && varsIn.length > 0) {
                            purposeVars = true
                        }
                    }
                    // is it a call to function with a nested variable? let us check
                    const iterArgFunc = ccHelpers.getFunctionObject(iterFuncName)
                    if (iterArgFunc != null && iterArgFunc.nested != null && iterArgFunc.nested) {
                        purposeVars = true
                    }
                    for (let t = 0; t < nodeIter.args.length; t++) {
                        if (nodeIter.args[t]._astname === "Name") {
                            var argVar = ccHelpers.getVariableObject(nodeIter.args[t].id.v)
                            // get input and indexing
                            if (argVar != null) {
                                if (argVar.indexAndInput.input) {
                                    varInput = true
                                }
                                if (argVar.indexAndInput.indexed && (argVar.original || originality)) {
                                    results.List = 4
                                }
                            }
                        }
                        // if it's a binop, boolop, list, or call we grab the contained values. We also need to get contained BoolOps.
                        if (nodeIter.args[t]._astname === "Compare" || nodeIter.args[t]._astname === "BoolOp" || nodeIter.args[t]._astname === "List" || nodeIter.args[t]._astname === "BoolOp") {
                            if (nodeIter.args[t]._astname === "Compare" && originality) {
                                results.comparisons = 3
                            }
                            if (ccHelpers.getIndexingInNode(nodeIter.args[t])[0] && (originality || ccHelpers.getIndexingInNode(nodeIter.args[t])[1])) {
                                results.List = 4
                            }
                            var allNamesWithin = []
                            ccHelpers.getNestedVariables(nodeIter.args[t], allNamesWithin)
                            // if ANY of these is marked as original, assignment counts as original
                            var originalAssign = false
                            for (var n = 0; n < allNamesWithin.length; n++) {
                                const nestedVar = ccHelpers.getVariableObject(allNamesWithin[n])
                                if (nestedVar != null) {
                                    var containedVal = nestedVar.value
                                    if (nestedVar.indexAndInput.input) {
                                        varInput = true
                                    }
                                    // update results
                                    if (nestedVar.original || originality) {
                                        if (varInput && results.consoleInput < 3) {
                                            results.consoleInput = 3
                                        }
                                    }
                                }
                            }
                            if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                                results.variables = 3
                            }
                        }
                        if (nodeIter.args[t]._astname === "Subscript") {
                            if (nodeIter.args[t].slice._astname === "Index" || nodeIter.args[t].slice._astname === "Slice") {
                                if (nodeIter.args[t].value._astname === "List") {
                                    results.List = 4
                                }
                                if (nodeIter.args[t].value._astname === "Subscript" && (getNestedIndexing(nodeIter.args[t].value))) {
                                    results.List = 4
                                }
                                if (nodeIter.args[t].value._astname === "BinOp" && Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeIter.args[t].value))) {
                                    results.List = 4
                                }
                                if (nodeIter.args[t].value._astname === "Call") {
                                    if ("id" in nodeIter.args[t].value && (ccHelpers.getFunctionObject(nodeIter.args[t].value.id.v) != null && ccHelpers.getFunctionObject(nodeIter.args[t].value.id.v).returns === "List")) {
                                        results.List = 4
                                    }
                                }
                                if (nodeIter.args[t].value._astname === "Name" && (ccHelpers.getVariableObject(nodeIter.args[t].value.id.v).value === "List")) {
                                    results.List = 4
                                }
                            }
                        }
                    }
                }
                // iterating over a list
                if (nodeIter._astname === "List") {
                    let listVars = []
                    listVars = ccHelpers.getNestedVariables(nodeIter, listVars)
                    if (ccHelpers.getIndexingInNode(nodeIter)[0] && originality) {
                        results.List = 4
                    }
                    for (let m = 0; m < listVars.length; m++) {
                        const listVariable = ccHelpers.getVariableObject(listVars[m])
                        if (listVariable != null) {
                            // var init
                            var argModded = false
                            var modOriginality = false
                            var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1]
                            // is the use inside or outside a function?
                            for (var n = 0; n < listVariable.modifyingFunctions.length; n++) {
                                if (node.lineno >= listVariable.modifyingFunctions[n][0] && node.lineno <= listVariable.modifyingFunctions[n][1]) {
                                    insideOutside = "inside"
                                    insideLines = listVariable.modifyingFunctions[n]
                                    break
                                }
                            }
                            if (insideOutside === "outside") {
                                insideLines = []
                                for (var n = 0; n < listVariable.modifyingFunctions.length; n++) {
                                    for (var line = listVariable.modifyingFunctions[n][0]; line <= listVariable.modifyingFunctions[n][1]; line++) {
                                        insideLines.push(line)
                                    }
                                }
                            }
                            var numberOfMods = 0
                            for (var z = 0; z < ccState.getProperty("allVariables")[m].assignedModified.length; z++) {
                                if (ccState.getProperty("allVariables")[m].assignedModified[z].line > node.lineno) { break } // stop loop before we get to the current line OR if both thigns we're looking for are already set to true.
                                // is there a modification? is it original?
                                if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                    argModded = true
                                    numberOfMods += 1
                                    if (ccState.getProperty("allVariables")[m].assignedModified[z].original) { modOriginality = true }
                                }
                            }
                            // update results
                            if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                results.variables = 4
                            }
                            if (ccState.getProperty("allVariables")[a].nested && (results.variables < 3) && (originality || ccState.getProperty("allVariables")[a].original)) {
                                results.variables = 3
                            }
                        }
                    }
                }
                // this is separate becuase even if THIS isn't original, something inside it may be
                // it could be a string or list/array that's being iterated over, so check for those and update accordingly
                if (nodeIter._astname === "Subscript") {
                    if (nodeIter.slice._astname === "Index") {
                        if (nodeIter.value._astname === "List") {
                            results.List = 4
                        }
                        if (nodeIter.value._astname === "Subscript") {
                            if (getNestedIndexing(nodeIter.value)[0]) {
                                results.List = 4
                            }
                        }
                        if (nodeIter.value._astname === "BinOp") {
                            if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeIter.value))) {
                                results.List = 4
                            }
                            if (ccHelpers.recursivelyAnalyzeBinOp(nodeIter.value) === "Str") {
                                var anyOriginality = false
                                if (originality) {
                                    anyOriginality = true
                                } else {
                                    const allVarsIn = []
                                    ccHelpers.getNestedVariables(nodeIter.value, allVarsIn)
                                    for (let o = 0; o < allVarsIn.length; o++) {
                                        if (ccHelpers.getVariableObject(allVarsIn[o]).original) {
                                            anyOriginality = true
                                            break
                                        }
                                    }
                                }
                            }
                        }
                        if (nodeIter.value._astname === "Call") {
                            // is it a listop, concat binop, OR a UDF thatccState.getProperty('returns')a list
                            if (originality) {
                                if ("id" in nodeIter.value && ccHelpers.getFunctionObject(nodeIter.value.id.v) != null && ccHelpers.getFunctionObject(nodeIter.value.id.v).returns === "List") {
                                    results.List = 4
                                }
                                // is it a string op
                                if ("id" in nodeIter.value && ccHelpers.getFunctionObject(nodeIter.value.id.v) != null && ccHelpers.getFunctionObject(nodeIter.value.id.v).returns === "Str") {
                                    results.List = 4
                                }
                            }
                            // is it a UDF and what does it return
                            if ("func" in nodeIter.value) {
                                let isUserFunc = null
                                isUserFunc = ccHelpers.getFunctionObject(nodeIter.value.func.id.v)
                                if (isUserFunc != null) {
                                    if (isUserFunc.returns === "List" && (originality || isUserFunc.original)) {
                                        results.List = 4
                                    }
                                }
                            }
                        }
                        if (nodeIter.value._astname === "Name") {
                            // is it indexing a variable that contains a list?
                            if (ccHelpers.getVariableObject(nodeIter.value.id.v).value === "List" && (originality || ccHelpers.getVariableObject(nodeIter.value.id.v).original)) {
                                results.List = 4
                            }
                        }
                    }
                }
            }
            if (node._astname === "While") {
                var testItem = node.test
                if (testItem._astname === "UnaryOp") {
                    if (!originality) {
                        var unaryNames = []
                        ccHelpers.getNestedVariables(testItem, unaryNames)
                        for (var p in unaryNames) {
                            var isVar = ccHelpers.getVariableObject(unaryNames[p])
                            if (isVar != null && isVar.original) {
                                break
                            }
                        }
                    }
                    testItem = testItem.operand
                }
                if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {
                    // is the thing we're indexing a list?
                    if (testItem.value._astname === "List") {
                        results.List = 4
                    }
                    if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                        results.List = 4
                    }
                    if (testItem.value._astname === "BinOp" && Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(testItem.value))) {
                        results.List = 4
                    }
                    if (testItem.value._astname === "Call") {
                        // is it a listop, concat binop, OR a UDF thatccState.getProperty('returns')a list
                        if ("id" in testItem.func) {
                            var calledFunc = getUserFunctionReturn(testItem.func.id.v)
                            if (calledFunc != null && calledFunc.returns === "List") {
                                results.List = 4
                            }
                        }
                    }
                    if (testItem.value._astname === "Name" && ccHelpers.getVariableObject(testItem.value.id.v).value === "List") {
                        results.List = 4
                    }
                }
                testItem = ccHelpers.retrieveFromList(testItem)
                if (testItem._astname === "UnaryOp") {
                    if (!originality) {
                        var unaryNames = []
                        ccHelpers.getNestedVariables(testItem, unaryNames)
                        for (var p in unaryNames) {
                            var isVar = ccHelpers.getVariableObject(unaryNames[p])
                            if (isVar != null && isVar.original) {
                                break
                            }
                        }
                    }
                    testItem = testItem.operand
                }
                // won't get automatically analyzed
                recursiveAnalyzeAST(testItem, results, loopParent)
                if (testItem._astname === "Call") {
                    // get the function name
                    var funcName = ""
                    var argList = []
                    if ("id" in testItem.func) {
                        funcName = testItem.func.id.v
                        argList = testItem.args
                    } else {
                        funcName = testItem.func.attr.v
                    }
                    // input or ops used?
                    if (funcName === "readInput") {
                        inputUsed = true
                    }
                    if (ccHelpers.getFunctionObject(funcName).indexAndInput.indexed && (originality || ccHelpers.getFunctionObject(funcName).original)) {
                        results.List = 4
                    }
                }
                // now, if it's something that has values within it, we chack through that
                if (testItem._astname === "Compare" || testItem._astname === "List" || testItem._astname === "BinOp" || testItem._astname === "BoolOp") {
                    // var init
                    allTypes = []
                    var useInput = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }
                    if (testItem._astname === "Compare" && originality) {
                        results.comparisons = 3
                    }
                    for (let insideType = 0; insideType < allTypes.length; insideType++) {
                        if (originality) {
                            if (useInput.input && results.consoleInput < 3) {
                                results.consoleInput = 3
                            }
                            if (results[allTypes[insideType]] < 3) {
                                results[allTypes[insideType]] = 3
                            }
                        }
                    }
                    var nestedVars = ccHelpers.getNestedVariables(testItem, [])
                    var anyOriginality = false
                    for (var i = 0; i < nestedVars.length; i++) {
                        var nestVar = ccHelpers.getVariableObject(nestedVars[i])
                        if (nestVar != null && nestVar.original) {
                            anyOriginality = true
                            break
                        }
                    }
                    if (anyOriginality || anyOriginality) {
                        if (useInput.input) {
                            results.List = 4
                        }
                        if (useInput.indexed) {
                            results.List = 4
                        }
                    }
                }
                if (testItem._astname === "Call") {
                    if ("func" in testItem) {
                        if (originality) {
                            var functionName = testItem.func.id.v
                            var testFunc = ccHelpers.getFunctionObject(functionName)
                            if (testFunc != null) {
                                if (testFunc.nested) {
                                    purposeVars = true
                                }
                                // input
                                if (testFunc.indexAndInput.input && originality) {
                                    results.consoleInput = 3
                                }
                                if (testFunc.indexAndInput.indexed) {
                                    results.List = 4
                                }
                                if (testFunc.indexAndInput.strIndexed) {
                                    results.List = 4
                                }
                            }
                        }
                    }
                }
                // if the test is a variable
                if (testItem._astname === "Name") {
                    var argVar = ccHelpers.getVariableObject(testItem.id.v)
                    if (argVar != null) {
                        var varInput = false
                        if (argVar.indexAndInput.input) {
                            varInput = true
                        }
                        var assignOriginal = argVar.original
                        if (originality || assignOriginal) {
                            if (argVar.indexAndInput.indexed) {
                                results.List = 4
                            }
                            var varType = argVar.value
                            var contained = argVar.containedValue
                            if (varInput && results.consoleInput < 3) {
                                results.consoleInput = 3
                            }
                            if (results.variables < 3) {
                                results.variables = 3
                            }
                            if (varType == "List" && results.List < 3) {
                                results[varType] = 3
                            }
                            if (contained.length > 0) {
                                for (var v = 0; v < contained.length; v++) {
                                    const containedTypeValue = contained[v]
                                    if (results[containedTypeValue] < 3) {
                                        results[containedTypeValue] = 3
                                    }
                                }
                            }
                        }
                    }
                }
                // if it's a binop, boolop, list, or call we grab the contained values.
                if (testItem._astname === "Compare" || testItem._astname === "BoolOp" || testItem._astname === "List" || testItem._astname === "BoolOp") {
                    if (testItem._astname === "Compare" && originality) {
                        results.comparisons = 3
                    }
                    // we need variable NAMEs
                    var allNamesWithin = []
                    ccHelpers.getNestedVariables(testItem, allNamesWithin)
                    // if ANY of these is marked as original, assignment counts as original
                    var originalAssign = false
                    var varInput = false
                    for (var n = 0; n < allNamesWithin.length; n++) {
                        var testVariable = ccHelpers.getVariableObject(allNamesWithin[n])
                        if (testVariable != null) {
                            var containedVal = testVariable.value
                            if (testVariable.indexAndInput.input) { varInput = true }
                            var containedValList = testVariable.containedValue
                            if (testVariable.original) { originalAssign = true }
                            // update results
                            if (testVariable.original || originality) {
                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3
                                }
                                if (results[containedVal] < 3 && containedVal == "List") {
                                    results[containedVal] = 3
                                }
                                if (containedValList.length > 0) {
                                    for (var v = 0; v < containedValList.length; v++) {
                                        const containedItem = containedValList[v]
                                        if (results[containedItem] < 3) {
                                            results[containedItem] = 3
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (allNamesWithin.length > 0 && (originalAssign || originality)) {
                        if (results.variables < 3) {
                            results.variables = 3
                        }
                    }
                }
            }
            if (node._astname === "Return") {
                // datatypes are already covered as return value from calls.
                // functions are already covered where they are called
                // ops are included in function calls
                // this is only for variables.
                let nodeValue = node.value
                if (nodeValue != null) {
                    if (nodeValue._astname === "UnaryOp") {
                        var anyOr = originality
                        if (!originality) {
                            var unaryNames = []
                            ccHelpers.getNestedVariables(nodeValue, unaryNames)
                            for (var p in unaryNames) {
                                var isVar = ccHelpers.getVariableObject(unaryNames[p])
                                if (isVar != null && isVar.original) {
                                    anyOr = true
                                    break
                                }
                            }
                        }
                        if (anyOr) {
                            results.Bool = 3
                        }
                        nodeValue = nodeValue.operand
                    }
                    // handle subscript and unaryops
                    if (nodeValue._astname === "Subscript" && (nodeValue.slice._astname === "Index" || nodeValue.slice._astname === "Slice")) {
                        // is the thing we're indexing a list?
                        if (nodeValue.value._astname === "List") {
                            results.List = 4
                        }
                        if (nodeValue.value._astname === "Subscript" && getNestedIndexing(nodeValue.value)) {
                            results.List = 4
                        }
                        if (nodeValue.value._astname === "BinOp" && Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeValue.value))) {
                            results.List = 4
                        }
                        if (nodeValue.value._astname === "Call") { // is it a listop, concat binop, OR a UDF thatccState.getProperty('returns')a list
                            if ("id" in nodeValue.func) {
                                var calledFunc = getUserFunctionReturn(nodeValue.func.id.v)
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results.List = 4
                                }
                            }
                        }
                        if (nodeValue.value._astname === "Name" && ccHelpers.getVariableObject(nodeValue.value.id.v) != null && ccHelpers.getVariableObject(nodeValue.value.id.v).value === "List") {
                            results.List = 4
                        }
                    }
                    nodeValue = ccHelpers.retrieveFromList(nodeValue)
                    if (nodeValue != null && nodeValue._astname === "UnaryOp") {
                        var anyOr = originality
                        if (!originality) {
                            var unaryNames = []
                            ccHelpers.getNestedVariables(nodeValue, unaryNames)
                            for (var p in unaryNames) {
                                var isVar = ccHelpers.getVariableObject(unaryNames[p])
                                if (isVar != null && isVar.original) {
                                    anyOr = true
                                    break
                                }
                            }
                        }
                        if (anyOr) {
                            results.Bool = 3
                        }
                        nodeValue = nodeValue.operand
                    }
                    // now, get the variable value and contained info
                    if (nodeValue != null && nodeValue._astname === "Name" && nodeValue.id.v !== "True" && nodeValue.id.v !== "False") {
                        // var init
                        var argModded = false
                        var modOriginality = false
                        const modString = ""
                        var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                        var insideLines = [-1, -1]
                        var assignOriginality = false
                        var varType = ""
                        var varInput = false
                    }
                }
            }
            // look for "vars for a purpose" in subscript nodes
            if (node._astname === "Subscript") {
                const nodesToCheck = []
                if (node.slice._astname === "Index") {
                    nodesToCheck.push(node.slice.value)
                } else if (node.slice._astname === "Slice") {
                    nodesToCheck.push(node.slice.lower)
                    nodesToCheck.push(node.slice.upper)
                }
                for (const e in nodesToCheck) {
                    let nodeToCheck = nodesToCheck[e]
                    if (ccHelpers.retrieveFromList(nodeToCheck) != nodeToCheck) {
                        var varsIn = []
                        nodeToCheck = ccHelpers.retrieveFromList(nodeToCheck)
                        if (nodeToCheck != null) {
                            ccHelpers.getNestedVariables(nodeToCheck, varsIn)
                            var anyOriginality = originality
                            if (!anyOriginality) {
                                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                    if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                                        anyOriginality = true
                                        break
                                    }
                                }
                            }
                            if (varsIn.length > 0 && anyOriginality) {
                                purposeVars = true
                            }
                        }
                    }
                    if (nodeToCheck != null) {
                        if (nodeToCheck._astname === "Subscript") {
                            if (originality) {
                                var isIndexedItem = false
                                if (nodeToCheck.slice._astname === "Index") {
                                    // is the thing we're indexing a list?
                                    if (nodeToCheck.value._astname === "List") {
                                        isIndexedItem = true
                                    }
                                    if (nodeToCheck.value._astname === "Subscript" && (getNestedIndexing(nodeToCheck.value))) {
                                        isIndexedItem = true
                                    }
                                    if (nodeToCheck.value._astname === "BinOp") {
                                        if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeToCheck.value))) {
                                            isIndexedItem = true
                                        }
                                    }
                                    if (nodeToCheck.value._astname === "Call") {
                                        // is it a listop, OR a UDF thatccState.getProperty('returns')a list
                                        if ("id" in nodeToCheck.value.func) {
                                            const funcList = ccHelpers.getFunctionObject(nodeToCheck.value.func.id.v)
                                            if (funcList != null && funcList.returns === "List") {
                                                isIndexedItem = true
                                            }
                                        }
                                    }
                                    if (nodeToCheck.value._astname === "Name") {
                                        isIndexedItem = (ccHelpers.getVariableObject(nodeToCheck.value.id.v).value === "List")
                                    }
                                }
                                if (isIndexedItem) {
                                    results.List = 4
                                }
                            }
                            // get any variables nested inside
                            var varsIn = []
                            ccHelpers.getNestedVariables(nodeToCheck, varsIn)
                            var anyOriginality = originality
                            if (!anyOriginality) {
                                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                    if (ccHelpers.getVariableObject(varsIn[varIn]) != null && ccHelpers.getVariableObject(varsIn[varIn]).original) {
                                        anyOriginality = true
                                        break
                                    }
                                }
                            }
                            if (varsIn.length > 0 && anyOriginality) { purposeVars = true }
                            nodeToCheck = ccHelpers.retrieveFromList(nodeToCheck)
                        }
                        // the node is a function call
                        if (nodeToCheck._astname === "Call") {
                            var lineNumberToUse = node.lineno
                            // get the function name
                            var funcName = ""
                            let argFunc = nodeToCheck.func
                            argFunc = ccHelpers.retrieveFromList(argFunc)
                            if ("id" in argFunc) {
                                funcName = argFunc.id.v
                            } else if ("attr" in argFunc) {
                                funcName = argFunc.attr.v
                            }
                            if (funcName === "readInput") {
                                results.consoleInput = 3
                            }
                            let funcReturn = ""
                            let returnContains = []
                            const funcItem = ccHelpers.getFunctionObject(funcName)
                            // update results
                            if (funcItem != null) {
                                funcReturn = funcItem.returns
                                if (funcItem.containedValue != null) {
                                    returnContains = funcItem.containedValue
                                }
                                if (funcItem.nested) {
                                    purposeVars = true
                                }
                                if (funcItem.indexAndInput != null && funcItem.indexAndInput.indexed) {
                                    results.List = 4
                                }
                            }
                            if (results[funcReturn] < 3 && funcReturn == "List") {
                                results[funcReturn] = 3
                            }
                            if (returnContains != null) {
                                for (let ret = 0; ret < returnContains.length; ret++) {
                                    const funcReturnCont = returnContains[ret]
                                    if (results[funcReturnCont] < 3) {
                                        results[funcReturnCont] = 3
                                    }
                                }
                            }
                        } else if (nodeToCheck._astname === "Name" && nodeToCheck.id.v !== "True" && nodeToCheck.id.v !== "False") {
                            // then it's a variable. look up what's in there.
                            purposeVars = true
                            var lineNumberToUse = node.lineno
                        } else if ((nodeToCheck._astname === "BinOp" || nodeToCheck._astname === "BoolOp" || nodeToCheck._astname === "Compare" || nodeToCheck._astname === "List")) {
                            if (ccHelpers.getIndexingInNode(nodeToCheck)[0] && (originality || ccHelpers.getIndexingInNode(nodeToCheck)[1])) {
                                results.List = 4
                            }
                        }
                        if (nodeToCheck._astname === "BinOp") {
                            // ditto with the BinOp
                            // anything in there counts as used for a purpose
                            // (e.g. " 'potato' + ' tomato' " passed as an arg amounts to strings used for a purpose.
                            const withinBinOp = []
                            let binOpComponentOriginality = false
                            const containedInOp = []
                            ccHelpers.getNestedVariables(nodeToCheck, containedInOp)
                            for (var u = 0; u < containedInOp.length; u++) {
                                if (ccHelpers.getVariableObject(containedInOp[u]) != null && ccHelpers.getVariableObject(containedInOp[u]).original) {
                                    binOpComponentOriginality = true
                                    break
                                }
                            }
                            if (originality || binOpComponentOriginality) {
                                if (Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeToCheck)) && results.listOps < 3) {
                                    results.listOps = 3
                                }
                                if (ccHelpers.recursivelyAnalyzeBinOp(nodeToCheck) === "Str" && results.strOps < 3) {
                                    results.strOps = 3
                                }
                            }
                            if (!originality) {
                                ccHelpers.listTypesWithin(nodeToCheck, withinBinOp, {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false,
                                }, [])
                            } else {
                                const inputIndexPurpose = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false,
                                }
                            }
                            for (var p = 0; p < withinBinOp.length; p++) {
                                if (Array.isArray(withinBinOp[p])) {
                                    // if the binop includes a list, go through THAT.
                                    lists = true
                                }
                            }
                        } else if (nodeToCheck._astname === "BoolOp") {
                            const boolOpValues = []
                            if (!originality) {
                                ccHelpers.listTypesWithin(nodeToCheck, boolOpValues, {
                                    indexed: false,
                                    input: false,
                                    strIndexed: false,
                                }, [])
                            } else {
                                const inputForPurposeInArg = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false,
                                }
                                if (inputForPurposeInArg.indexed) {
                                    results.List = 4
                                }
                            }
                        } else if (nodeToCheck._astname === "Compare") {
                            // check all values inside the comparison
                            const compareValues = []
                            const indexInputItem = {
                                input: false,
                                indexed: false,
                                strIndexed: false,
                            }
                            if (!originality) {
                                ccHelpers.listTypesWithin(nodeToCheck, compareValues, {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false,
                                }, [])
                            } else if (indexInputItem.indexed) {
                                results.List = 4
                            }
                            if (indexInputItem.input) {
                                results.consoleInput = 3
                            }
                        }
                        if (nodeToCheck._astname === "Name" && nodeToCheck.id.v !== "True" && nodeToCheck.id.v !== "False") {
                            var argModded = false
                            var modOriginality = false
                            var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1]
                            var assignOriginality = false
                            var varType = ""
                            var varInput = false
                        }
                        // is it something else that can CONTAIN a variable value?
                        if (nodeToCheck._astname === "List" || nodeToCheck._astname === "BinOp" || nodeToCheck._astname === "BoolOp" || nodeToCheck._astname === "Compare") {
                            if (nodeToCheck._astname === "Compare" && originality) {
                                results.comparisons = 3
                            }
                            var modOriginality = false
                            var allNamesWithin = []
                            ccHelpers.getNestedVariables(nodeToCheck, allNamesWithin)
                            // if ANY of these is marked as original, assignment counts as original
                            var originalAssign = false
                            for (var n = 0; n < allNamesWithin.length; n++) {
                                const otherVariable = ccHelpers.getVariableObject(allNamesWithin[n])
                                if (otherVariable != null) {
                                    var argModded = false
                                    var insideOutside = "outside" // this will get set to "inside" if this call is within another function
                                    var insideLines = [-1, -1]
                                    // is the use inside or outside a function?
                                    for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                        if (node.lineno >= otherVariable.modifyingFunctions[f][0] && node.lineno <= otherVariable.modifyingFunctions[f][1]) {
                                            insideOutside = "inside"
                                            insideLines = otherVariable.modifyingFunctions[f]
                                            break
                                        }
                                    }
                                    if (insideOutside === "outside") {
                                        insideLines = []
                                        for (var f = 0; f < otherVariable.modifyingFunctions.length; f++) {
                                            for (var line = otherVariable.modifyingFunctions[f][0]; line <= otherVariable.modifyingFunctions[f][1]; line++) {
                                                insideLines.push(line)
                                            }
                                        }
                                    }
                                    var numberOfMods = 0
                                    for (var z = 0; z < otherVariable.assignedModified.length; z++) {
                                        if (otherVariable.assignedModified[z].line > node.lineno) {
                                            // stop loop before we get to the current line OR if both things we're looking for are already set to true.
                                            break
                                        }
                                        // is there a modification? is it original?
                                        if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                            argModded = true
                                            numberOfMods += 1
                                            if (otherVariable.assignedModified[z].original) {
                                                modOriginality = true
                                            }
                                        }
                                    }
                                    if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                        results.variables = 4
                                    }
                                    if (otherVariable.original || originality) {
                                        if (otherVariable.value === "List" && results.List < 3) {
                                            results.List = 3
                                        }
                                    }
                                }
                            }
                            if (allNamesWithin.length > 0 && (originalAssign || originality) && (results.variables < 3)) {
                                results.variables = 3
                            }
                        }
                    }
                }
            }
            // JS for loops have up to 3 components that need to be checked
            if (node._astname === "JSFor") {
                let forLoopArgs = 0
                if (node.init != null) {
                    if (node.init._astname === "Assign") {
                        var initOrig = originality
                        var initVars = []
                        if (!originality) {
                            initVars = ccHelpers.appendArray(ccHelpers.getNestedVariables(node.init.targets[0], []), ccHelpers.getNestedVariables(node.init.value, []))
                            for (var i in initVars) {
                                var iVar = ccHelpers.getVariableObject(initVars[i])
                                if (iVar != null && iVar.original) {
                                    initOrig = true
                                    break
                                }
                            }
                        }
                        if (initOrig) {
                            forLoopArgs += 1
                            if (initVars.length > 0 && results.variables < 3) {
                                results.variables = 3
                            }
                            var typesWithinAssign = []
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false,
                            }
                            typesWithinAssign = ccHelpers.listTypesWithin(node.init.targets[0], typesWithinAssign, assignIn, [])
                            if ("list" in typesWithinAssign && results.List < 3) {
                                results.List = 3
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3
                            }
                            if (assignIn.indexed) {
                                results.List = 4
                            }
                        }
                    }
                    if (node.init._astname === "AugAssign") {
                        // augassign has target and valeu
                        var initOrig = originality
                        if (results.mathematicalOperators < 1) {
                            results.mathematicalOperators = 1
                        }
                        var initVars = []
                        if (!originality) {
                            initVars = ccHelpers.appendArray(ccHelpers.getNestedVariables(node.init.target, []), ccHelpers.getNestedVariables(node.init.value, []))
                            for (var i in initVars) {
                                var iVar = ccHelpers.getVariableObject(initVars[i])
                                if (iVar != null && iVar.original) {
                                    initOrig = true
                                    break
                                }
                            }
                        }
                        if (initOrig) {
                            if (results.mathematicalOperators < 3) {
                                results.mathematicalOperators = 3
                            }
                            if (initVars.length > 0 && results.variables < 3) {
                                results.variables = 3
                            }
                            forLoopArgs += 1
                            var typesWithinAssign = []
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false,
                            }
                            typesWithinAssign = ccHelpers.listTypesWithin(node.init.target, typesWithinAssign, assignIn, [])
                            if ("list" in typesWithinAssign && results.List < 3) {
                                results.List = 3
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3
                            }
                            if (assignIn.indexed) {
                                results.List = 4
                            }
                        }
                    }
                }
                // test node is always there. this is a comparison, or a bool, or a boolop. Something thatccState.getProperty('returns')a bool.
                // We'll need typeswithin here as well as any other ops
                let nodeTest = node.test
                if (nodeTest._astname === "UnaryOp") {
                    nodeTest = nodeTest.operand
                }
                // is the test node a subscript?
                if (nodeTest._astname === "Subscript" && (nodeTest.slice._astname === "Index" || nodeTest.slice._astname === "Slice")) {
                    // is the thing we're indexing a list?
                    if (nodeTest.value._astname === "List") {
                        results.List = 4
                    }
                    if (nodeTest.value._astname === "Subscript" && getNestedIndexing(nodeTest.value)) {
                        results.List = 4
                    }
                    if (nodeTest.value._astname === "BinOp" && Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(nodeTest.value))) {
                        results.List = 4
                    }
                    if (nodeTest.value._astname === "Call") {
                        // is it a listop, concat binop, OR a UDF that returns a list
                        if ("id" in nodeTest.func) {
                            var calledFunc = getUserFunctionReturn(nodeTest.func.id.v)
                            if (calledFunc != null && calledFunc.returns === "List") {
                                results.List = 4
                            }
                        }
                    }
                    if (nodeTest.value._astname === "Name" && ccHelpers.getVariableObject(nodeTest.value.id.v).value === "List") {
                        results.List = 4
                    }
                }
                nodeTest = ccHelpers.retrieveFromList(nodeTest)
                if (nodeTest._astname === "UnaryOp") {
                    nodeTest = nodeTest.operand
                }
                var nestedVars = []
                ccHelpers.getNestedVariables(nodeTest, nestedVars)
                var anyOriginal = originality
                if (!originality) {
                    for (var i in nestedVars) {
                        var isVar = ccHelpers.getVariableObject(nestedVars[i])
                        if (isVar != null) {
                            if (isVar.original) {
                                anyOriginal = true
                                break
                            }
                        }
                    }
                }
                if (anyOriginal) {
                    // we need: datatypes and ops. and contained datatypes. and whether or not any vars are used or nested.
                    if (nestedVars.length > 0 && results.variables < 3) {
                        results.variables = 3
                    }
                    let dataTypesIn = []
                    const indexingIn = {
                        input: false,
                        indexed: false,
                        strIndexed: false,
                    }
                    dataTypesIn = ccHelpers.listTypesWithin(nodeTest, dataTypesIn, indexingIn, [])
                    var testItem = node.test
                    // unary and subscript values
                    if (testItem._astname === "UnaryOp") {
                        testItem = testItem.operand
                    }
                    if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {
                        // is the thing we're indexing a list?
                        if (testItem.value._astname === "List") {
                            results.List = 4
                        }
                        if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                            results.List = 4
                        }
                        if (testItem.value._astname === "BinOp" && Array.isArray(ccHelpers.recursivelyAnalyzeBinOp(testItem.value))) {
                            results.List = 4
                        }
                        if (testItem.value._astname === "Call") { // is it a listop, concat binop, OR a UDF thatccState.getProperty('returns')a list
                            if ("id" in testItem.func) {
                                var calledFunc = getUserFunctionReturn(testItem.func.id.v)
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results.List = 4
                                }
                            }
                        }
                        if (testItem.value._astname === "Name" && ccHelpers.getVariableObject(testItem.value.id.v).value === "List") {
                            results.List = 4
                        }
                    }
                    testItem = ccHelpers.retrieveFromList(testItem)
                    if (testItem._astname === "UnaryOp") {
                        testItem = testItem.operand
                    }
                    // test item doesn't get auto-analyzed
                    recursiveAnalyzeAST(testItem, results, loopParent)
                    if (testItem._astname === "Call") {
                        var funcName = ""
                        var argList = []
                        // get the function name
                        if ("id" in testItem.func) {
                            funcName = testItem.func.id.v
                            argList = testItem.args
                        } else {
                            funcName = testItem.func.attr.v
                        }
                        // get indexing and input
                        if (funcName === "readInput") {
                            inputUsed = true
                        }
                        if (ccHelpers.getFunctionObject(funcName).indexAndInput.indexed && (originality || ccHelpers.getFunctionObject(funcName).original)) {
                            results.List = 4
                        }
                        let callReturnVal = ""
                        var calledFunc = ccHelpers.getFunctionObject(funcName)
                        // updates results and purpose booleans
                        if (calledFunc != null) {
                            callReturnVal = calledFunc.returns
                            if (calledFunc.indexAndInput.input) {
                                inputUsed = true
                            }
                            if (originality && calledFunc.indexAndInput.indexed) {
                                results.List = 4
                            }
                            if (calledFunc.nested) {
                                purposeVars = true
                            }
                        }
                        // if the test is a function call
                        if ("func" in testItem) {
                            if (originality) {
                                var functionName = testItem.func.id.v
                                var testFunc = ccHelpers.getFunctionObject(functionName)
                                if (testFunc != null) {
                                    if (testFunc.nested) {
                                        purposeVars = true
                                    }
                                    if (testFunc.opsDone != null) {
                                        const testOps = ccHelpers.opsBeforeLine(testFunc.opsDone, node.lineno, "func", testFunc)
                                        if (testOps.includes("BinOp") || testOps.includes("AugAssign")) {
                                            results.mathematicalOperators = 3
                                        }
                                        if (testOps.includes("BoolOp")) {
                                            results.boolOps = 3
                                        }
                                        if (testOps.includes("StrOp")) {
                                            results.strOps = 3
                                        }
                                        if (testOps.includes("ListOp")) {
                                            results.listOps = 3
                                        }
                                        if (testOps.includes("Compare")) {
                                            results.comparisons = 3
                                        }
                                    }
                                    // input
                                    if (testFunc.indexAndInput.input && originality) {
                                        results.consoleInput = 3
                                    }
                                    if (testFunc.indexAndInput.indexed) {
                                        results.List = 4
                                    }
                                    if (testFunc.indexAndInput.strIndexed) {
                                        results.List = 4
                                    }
                                    // contained values
                                    if (testFunc.containedValue != null) {
                                        if (testFunc.containedValue.includes("List") && (results.List < 3)) {
                                            results.List = 3
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // if storagefor other types of information
                    if (testItem._astname === "Compare" || testItem._astname === "List" || testItem._astname === "BinOp" || testItem._astname === "BoolOp") {
                        allTypes = []
                        var useInput = {
                            input: false,
                            indexed: false,
                            strIndexed: false,
                        }
                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3
                        }
                        // update results from types within?
                        if (originality && allTypes.includes("List") && (results.List < 3)) {
                            results.List = 3
                        }
                        var nestedVars = ccHelpers.getNestedVariables(testItem, [])
                        var anyOriginality = false
                        for (var i = 0; i < nestedVars.length; i++) {
                            var nestVar = ccHelpers.getVariableObject(nestedVars[i])
                            if (nestVar != null && nestVar.original) {
                                anyOriginality = true
                                break
                            }
                        }
                        // input, indexing
                        if (anyOriginality) {
                            if (useInput.input || useInput.indexed) {
                                results.List = 4
                            }
                        }
                    }
                    // if test item is a variable
                    if (testItem._astname === "Name") {
                        var argVar = ccHelpers.getVariableObject(testItem.id.v)
                        if (argVar != null) {
                            var varInput = false
                            if (argVar.indexAndInput.input) {
                                varInput = true
                            }
                            var assignOriginal = argVar.original
                            if (originality || assignOriginal) {
                                if (argVar.indexAndInput.indexed) {
                                    results.List = 4
                                }
                                var varType = argVar.value
                                var contained = argVar.containedValue
                                // update results
                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3
                                }
                                if (results.variables < 3) {
                                    results.variables = 3
                                }
                                if ((contained.length > 0 && contained.includes("List") && (results.List < 3)) || (results[varType] < 3 && varType == "List")) {
                                    results.List = 3
                                }
                            }
                        }
                    }
                    // orrrrr if it's a binop, boolop, list, or call we grab the contained values. wheeee.
                    if (testItem._astname === "Compare" || testItem._astname === "BoolOp" || testItem._astname === "List" || testItem._astname === "BoolOp") {
                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3
                        }
                        if (testItem._astname === "BinOp" && originality) {
                            results.mathematicalOperators = 3
                        }
                        // oh we need variable NAMEs hrngh
                        var allNamesWithin = []
                        ccHelpers.getNestedVariables(testItem, allNamesWithin)
                        // if ANY of these is marked as original, assignment counts as original
                        var originalAssign = false
                        var varInput = false
                        for (var n = 0; n < allNamesWithin.length; n++) {
                            var testVariable = ccHelpers.getVariableObject(allNamesWithin[n])
                            if (testVariable != null) {
                                var containedVal = testVariable.value
                                if (testVariable.indexAndInput.input) {
                                    varInput = true
                                }
                                var containedValList = testVariable.containedValue
                                if (containedValList == null) {
                                    containedValList = []
                                }
                                if (testVariable.original) {
                                    originalAssign = true
                                }
                                if (testVariable.original || originality) {
                                    if (varInput && results.consoleInput < 3) {
                                        results.consoleInput = 3
                                    }
                                    if (containedValList.includes(containedVal) && results[containedVal] < 3) {
                                        results[containedVal] = 3
                                    }
                                }
                            }
                        }
                        if (allNamesWithin.length > 0 && (originalAssign || originality)) {
                            if (results.variables < 3) {
                                results.variables = 3
                            }
                        }
                    }
                    if ("list" in dataTypesIn && results.List < 3) {
                        results.List = 3
                    }
                    if (indexingIn.input) {
                        results.consoleInput = 3
                    }
                    if (indexingIn.indexed) {
                        results.List = 4
                    }
                }
                // finally, the update function.
                if (node.update != null) {
                    // this should always be an augassign of some sort
                    if (node.update._astname === "AugAssign") {
                        let updateOrig = originality
                        if (results.mathematicalOperators < 1) {
                            results.mathematicalOperators = 1
                        }
                        let updateVars = []
                        if (!originality) {
                            updateVars = ccHelpers.appendArray(ccHelpers.getNestedVariables(node.update.target, []), ccHelpers.getNestedVariables(node.update.value, []))
                            for (var i in updateVars) {
                                var iVar = ccHelpers.getVariableObject(updateVars[i])
                                if (iVar != null && iVar.original) {
                                    updateOrig = true
                                    break
                                }
                            }
                        }
                        if (updateOrig) {
                            if (results.mathematicalOperators < 3) {
                                results.mathematicalOperators = 3
                            }
                            if (updateVars.length > 0 && results.variables < 3) {
                                results.variables = 3
                            }
                            forLoopArgs += 1
                            var typesWithinAssign = []
                            var assignIn = {
                                input: false,
                                indexed: false,
                                strIndexed: false,
                            }
                            typesWithinAssign = ccHelpers.listTypesWithin(node.update.target, typesWithinAssign, assignIn, [])
                            if ("list" in typesWithinAssign && results.List < 3) {
                                results.List = 3
                            }
                            if (assignIn.input) {
                                results.consoleInput = 3
                            }
                            if (assignIn.indexed) {
                                results.List = 4
                            }
                        }
                    }
                }
                // then we handle forLoopArgs
                if (forLoopArgs === 1 && originality) {
                    // for loops should be at least 3
                    if (results.forLoops < 3) {
                        results.forLoops = 3
                    }
                }
                if (forLoopArgs === 2 && originality) {
                    // at least 4
                    if (results.forLoops < 4) {
                        results.forLoops = 4
                    }
                }
            }
            if (purposeVars && (results.variables < 3) && (originality || originalAssignment)) {
                results.variables = 3
            }
            ccState.setProperty("takesArgs", false)
            ccState.setProperty("returns", false)
            if (loopParent != null) { // this logic is wonky but i promise you it works
                if (isForLoop && loopParent[0] && originality) {
                    results.forLoops = 5
                }
                if ((isWhileLoop || isForLoop) && (loopParent[0] || loopParent[1]) && originality) {
                    results.forLoops = 5
                }
                if (loopParent[0] && originality) {
                    isForLoop = true
                }
                if (loopParent[1] && originality) {
                    isWhileLoop = true
                }
            }
            // we need to return this information so we know abt nested loops
            return [isForLoop, isWhileLoop]
        }
    }
}

// Recursively analyze a python abstract syntax tree.
export function recursiveAnalyzeAST(ast, results, loopParent) {
    if (ast != null && ast.body != null) {
        const astKeys = Object.keys(ast.body)
        for (let r = 0; r < astKeys.length; r++) {
            const node = ast.body[astKeys[r]]
            const loopPar = analyzeASTNode(node, results, loopParent)
            recursiveAnalyzeAST(node, results, loopPar)
        }
    }
    return results
}
