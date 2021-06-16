// A library of helper functions for the CAI Code Complexity Calculator
import * as ccState from './complexityCalculatorState';

// Appends the values in the source array to the target list.
export function appendArray(source: any[], target: any[]) {
    for (let p = 0; p < source.length; p++) {
        target.push(source[p])
    }
    return target
}

// Copies attributes (except for boolean values set to False) from one object to another, including recursively copying all values from child objects.
// NOTE: Does NOT reset any boolean values in Target to False. This is intentional
export function copyAttributes(source: { [key: string]: any }, target: { [key: string]: any }, attributesToCopy: string[]) {
    for (let attr = 0; attr < attributesToCopy.length; attr++) {
        //copy null values
        if (source[attributesToCopy[attr]] == null) {
            target[attributesToCopy[attr]] = null
        } else if (Array.isArray(source[attributesToCopy[attr]])) {
            //copy array values
            target[attributesToCopy[attr]] = appendArray(source[attributesToCopy[attr]], [])
        } else if (source[attributesToCopy[attr]] !== false || target[attributesToCopy[attr]] == null) {
            //copy all non-false, non-object values
            target[attributesToCopy[attr]] = source[attributesToCopy[attr]]
        } else if (typeof source[attributesToCopy[attr]] === "object") {
            //copy properties of child objects recursively
            let copiedObj = {}
            let attrsToCopy = []
            for (let at in source[attributesToCopy[attr]]) {
                attrsToCopy.push(at)
            }
            copyAttributes(source[attributesToCopy[attr]], copiedObj, attrsToCopy)
            target[attributesToCopy[attr]] = copiedObj
        }
    }
}

// Determines what type of value is described by an AST node
export function getTypeFromNode(node: any) {
    node = retrieveFromList(node)
    if (node == null) {
        return "" //return empty if we can't compute a type
    }
    switch (node._astname) {
        case "UnaryOp":  //the only unary op we should see is "not _____" so we can assume this is a boolean value
        case "BoolOp":
        case "Compare":
            return "Bool"
        case "Call":
            return getCallReturn(node)
        case "Str":
        case "List":
            return node._astname
        case "Num":
            return isNodeFloat(node)? "Float" : "Int"
        case "Name":
            if (node.id.v === "True" || node.id.v === "False") {
                return "Bool"
            } else if (getVariableObject(node.id.v) != null) {
                return getVariableObject(node.id.v).value
            }
        case "BinOp":
            const binOpValue = recursivelyAnalyzeBinOp(node)
            if (typeof binOpValue === "string") {
                return binOpValue
            } else if (Array.isArray(binOpValue)) {
                return "List"
            }
        default:
            return ""
    }
}

// If an AST node retrieves a value from a list (by indexing or list.pop()), returns the node being retrieved
export function retrieveFromList(callingNode: any) : any {
    //Gets the node referenced by an AST subscript node. (OR an array of nodes, if the subscript is a slice instead of index) WHAT IF WE THROW A STRING AT IT???
    function getSubscriptValue(subscriptNodeToGet: any) {
        const subscriptNode = subscriptNodeToGet
        if (subscriptNode.slice._astname === "Index") { //handle singular indices
            let indexValue = 0
            let objToIndex = []
            const valObj = retrieveFromList(subscriptNode.value);
            //what index are we retrieving?
            if ("n" in subscriptNode.slice.value) {
                indexValue = subscriptNode.slice.value.n.v
            } else if (subscriptNode.slice.value._astname == "Name" && getVariableObject(subscriptNode.slice.value.id.v) != null) {
                indexValue = getMostRecentValue(getVariableObject(subscriptNode.slice.value.id.v), subscriptNode.lineno)
                if (indexValue == null) {
                    return null
                }
            }
            //what list/array are we retrieving from?
            if (valObj != null) {
                if (subscriptNode.value._astname === "List") {
                    objToIndex = valObj.elts
                }
                if (valObj._astname === "BinOp") {
                    objToIndex = getAllBinOpLists(subscriptNode.value)
                }
                if (valObj._astname === "Call") {
                    if (doesCallCreateList(valObj)) {
                        objToIndex = performListOp(valObj)[0]
                    } else {
                        if ( getFunctionObject(valObj.func.id.v) != null) {
                            const callItem = getFunctionObject(valObj.func.id.v)
                            if (callItem.nodeElements != null && callItem.nodeElements[0] != null) {
                                const callElts = callItem.nodeElements[0].elts
                                if (callElts != null) {
                                    objToIndex = callElts.slice(0)
                                }
                            }
                        }
                    }
                }
                if (valObj._astname === "Name") {
                    const variable = getVariableObject(valObj.id.v)
                    if (variable != null) {
                        objToIndex = mostRecentElements(variable, subscriptNodeToGet.lineno)
                    }
                }
            }
            //get the object at the given index and return it.
            if (objToIndex != null) {
                if (indexValue < 0) {
                    indexValue += objToIndex.length
                }
                const returnObj = retrieveFromList(objToIndex[indexValue])
                return returnObj
            }
            if (valObj != null && 'id' in valObj) {
                return null
            } //if we don't know what it is we're indexing, just return
        } else if (subscriptNode.slice._astname === "Slice") { //handle slices
            let lower = null
            let upper = null
            const lowerNode = retrieveFromList(subscriptNode.slice.lower)
            const upperNode = retrieveFromList(subscriptNode.slice.upper)
            //get the lower bound for the slice
            if (lowerNode != null && lowerNode._astname === "Num") {
                lower = lowerNode.n.v;
            } else if (lowerNode != null && lowerNode._astname == "Name" && getVariableObject(lowerNode.id.v) != null) {
                lower = getMostRecentValue(getVariableObject(lowerNode.id.v),subscriptNode.lineno)
            }
            //get the upper bound for the slice
            if (upperNode != null && upperNode._astname === "Num") {
                upper = upperNode.n.v;
            } else if (upperNode != null && upperNode._astname == "Name" && getVariableObject(upperNode.id.v) != null) {
                upper = getMostRecentValue(getVariableObject(upperNode.id.v),subscriptNode.lineno)
            }
            //get the list/array that we are slicing
            let nodeValue = retrieveFromList(subscriptNode.value)
            if (nodeValue._astname === "List") {
                nodeValue = nodeValue.elts
            }
            if (nodeValue._astname === "BinOp") {
                nodeValue = getAllBinOpLists(nodeValue)
            }
            if (nodeValue._astname === "Call") {
                if (doesCallCreateList(nodeValue)) {
                    nodeValue = performListOp(nodeValue)[0]
                } else {
                    const call = getFunctionObject(nodeValue.func.id.v)
                    if (call != null && call.nodeElements != null && call.nodeElements.length > 0) {
                        nodeValue = call.nodeElements[0].elts
                    }
                }
            }
            if (nodeValue._astname === "Name") {
                const variable = getVariableObject(nodeValue.id.v)
                if (variable != null) {
                    const varElts = mostRecentElements(variable, subscriptNodeToGet.lineno)
                    if (varElts != null) {
                        nodeValue = varElts.slice(0)
                    }
                }
            }
            //set upper and lower bounds to default values if they are unknown
            if (nodeValue != null && Array.isArray(nodeValue)) {
                if (lower == null) {
                    lower = 0
                }
                if (upper == null) {
                    upper = nodeValue.length - 1
                }
                if (lower < 0) {
                    lower += nodeValue.length
                }
                if (upper < 0) {
                    upper += nodeValue.length
                }
                if (lower != null && upper != null) {
                    //slice the array of nodes and return a fake list node repsenting the result
                    return {
                        _astname: "List",
                        elts: nodeValue.slice(lower, upper)
                    }
                }
            } else if (nodeValue != null && 'id' in nodeValue) {
                //if we can't compute a slice or index, return null
                return null
            } else if (nodeValue != null && 'func' in nodeValue && 'id' in nodeValue.func) {
                return null
            }
        }
        return null
    }

    //Helper function: is this a node that requires list retrieval?
    function doesNodeRetrieveFromList(callingNode: any) {
        if (callingNode != null) {
            if (callingNode._astname === "Call" && 'func' in callingNode && 'attr' in callingNode.func && 
                (callingNode.func.attr.v === "pop" || callingNode.func.attr.v === "choice")) {
                return true
            } else if (callingNode._astname === "Call" && 'func' in callingNode && 'id' in callingNode.func && 
                (callingNode.func.id.v === "min" || callingNode.func.id.v === "max")) {
                return true
            }
        }
        return false
    }

    //the bulk of the retrieval function
    if (!doesNodeRetrieveFromList(callingNode)) {
        //if the node DOESN't require retrieval or subscripting, just return the original node.
        if (callingNode != null && callingNode._astname === "Subscript") {
            return getSubscriptValue(callingNode)
        } else {
            return callingNode
        }
    } else {
        //handling for pop()
        if (callingNode._astname === "Call" && 'func' in callingNode && 'attr' in callingNode.func && (callingNode.func.attr.v === "pop")) {
            let listToUse = []
            const calledValue = retrieveFromList(callingNode.func.value)
            const thisLine = callingNode.lineno
            //get the list we're retrieving from
            if (calledValue._astname === "Name") {
                const variable = getVariableObject(calledValue.id.v)
                if (variable != null) {
                    const correctElts = mostRecentElements(variable, thisLine - 1)
                    if (correctElts != null) {
                        listToUse = correctElts.slice(0)
                    }
                }
            } else if (calledValue._astname === "Call") {  //it's either a UDF or another listop
                listToUse = retrieveFromList(calledValue).elts
                if (doesCallCreateList(calledValue)) {
                    listToUse = performListOp(calledValue)[0]
                } else if ('id' in calledValue.func) {
                    const funcObject = getFunctionObject(calledValue.func.id.v)
                    if (funcObject != null && funcObject.nodeElements != null && funcObject.nodeElements.length > 0) {
                        listToUse = funcObject.nodeElements[0].elts.slice(0)
                    }
                }
            } else if (calledValue._astname === "List") {
                listToUse = calledValue.elts.slice(0)
            } else if (calledValue._astname === "BinOp") {
                listToUse = getAllBinOpLists(calledValue)
            }
            let popLocation = listToUse.length - 1
            //if no argument is provided, default to the end of the array
            if (callingNode.args.length > 0) {
                popLocation = callingNode.args[0].n.v
            }
            return retrieveFromList(listToUse[popLocation]) //nested in case the popped value also requires list retrieval
        } else if ((callingNode._astname === "Call" && 'func' in callingNode && 'id' in callingNode.func && 
            (callingNode.func.id.v === "min" || callingNode.func.id.v === "max")) || callingNode._astname === "Call" && 
            'func' in callingNode && 'attr' in callingNode.func && (callingNode.func.attr.v === "choice")) {
            //handling for array/list min/max/choice functions
            let listToUse = []
            const calledValue = retrieveFromList(callingNode.args[0])
            if (calledValue != null) {
                if (calledValue._astname === "Name") {
                    const variable = getVariableObject(calledValue.id.v)
                    if (variable != null) {
                        const mostRecentElts = mostRecentElements(variable, callingNode.lineno - 1)
                        if (mostRecentElts != null) {
                            listToUse = mostRecentElts.slice(0)
                        }
                    }
                    return null
                } else if (calledValue._astname === "Call") { //it's either a UDF or another listop.
                    const calledFunc = retrieveFromList(calledValue.func)
                    if (doesCallCreateList(calledValue)) {
                        listToUse = performListOp(calledValue)[0]
                    } else if ('id' in calledFunc) {
                        const funcObject = getFunctionObject(calledFunc.id.v)
                        if (funcObject != null && funcObject.nodeElements != null && funcObject.nodeElements.length > 0) {
                            listToUse = funcObject.nodeElements[0].elts.slice(0)
                        }
                    }
                } else if (calledValue._astname === "List") {
                    listToUse = calledValue.elts
                } else if (calledValue._astname === "BinOp") {
                    listToUse = getAllBinOpLists(calledValue)
                }
                //if it's min/max, we have to sort the array first, then retrieve the value at one end
                if ('id' in callingNode.func && (callingNode.func.id.v === "min" || callingNode.func.id.v === "max")) {
                    listToUse = performListOp({
                        _astname: "Call",
                        func: {
                            attr: {
                                v: "sort"
                            },
                            value: {
                                _astname: "List",
                                elts: listToUse
                            }
                        }
                    })[0]
                    if (callingNode.func.id.v === "max") {
                        listToUse.reverse()
                    }
                }
                return listToUse[0]
            } else {
                return null
            }
        }
    }
}

// Converts an array of AST nodes to an array of strings that indicate the datatype represented by the node.
export function nodesToStrings(nodeElements: any[], thisLine: number): string[] {
    let stringElementsToReturn = []
    for (let i = 0; i < nodeElements.length; i++) {
        let nextElt = getTypeFromNode(nodeElements[i])
        //if it's null, just push an empty string
        if (nextElt == null) {
            stringElementsToReturn.push("")
        } else if (nextElt === "List") {
            //if the item is a list, create an array of whatever is in THAT list by recursively calling this function.
            const listVal = retrieveFromList(nodeElements[i])
            if (listVal._astname === "List") {
                nextElt = nodesToStrings(nodeElements[i].elts, thisLine)
            } else if (listVal._astname === "BinOp") {
                nextElt = nodesToStrings(getAllBinOpLists(nodeElements[i]), thisLine)
            } else if (listVal._astname === "Call") {
                const listFunc = retrieveFromList(listVal.func)
                if ('id' in listFunc) {
                    const calledFunc = getFunctionObject(listVal.func.id)
                    if (calledFunc != null && calledFunc.nodeElements != null && calledFunc.nodeElements.length > 0) {
                        stringElementsToReturn.push(nodesToStrings(calledFunc.nodeElements[0].elts, thisLine))
                    }
                } else if (doesCallCreateList(listFunc)) {
                    stringElementsToReturn.push(nodesToStrings(performListOp(listVal), thisLine))
                }
            } else if (listVal._astname === "Name") {
                const listVar = getVariableObject(listVal.id.v)
                if (listVar != null) {
                    stringElementsToReturn.push(nodesToStrings(mostRecentElements(listVar, thisLine), thisLine))
                }
            }
        } else {
            //if we know what's in the node, just push that to the array and move on
            stringElementsToReturn.push(nextElt)
        }
    }
    return stringElementsToReturn
}

// Determines what kind of value is returned by a call to Number()
export function getNumberCallReturn(callingNode: any) {
    //if it's not a function call at all, return.
    if (callingNode._astname != "Call") {
        return
    }
    //get the function name
    const calledFunc = retrieveFromList(callingNode.func)
    let functionName = ""
    if ('id' in calledFunc) {
        functionName = calledFunc.id.v
    }
    if (functionName === "Number") { //If it's not a call to Number(), we can skip and return nothing.
        if (callingNode.args[0] != null) {
            const firstArg = retrieveFromList(callingNode.args[0])
            //If it's a string, just call Number() here and return the result of the output ("Float" or "Int")
            if (firstArg != null && firstArg._astname === "Str") {
                return Number.isInteger(Number(firstArg.s.v)) ? "Int" : "Float"
            }
            if (firstArg != null && firstArg._astname === "Name") {
                if (firstArg.id.v === "None") {
                    return "Int"
                }
                const isVar = getVariableObject(firstArg.id.v)
                //if string we actually can do this since we store an assignedModified value.
                //Try Number() on the most recent value of the variable
                if (isVar != null && isVar.value === "Str") {
                    const currentValue = retrieveFromList(getMostRecentValue(isVar, callingNode.lineno))
                    if (currentValue != null && currentValue._astname === "Str") {
                        return Number.isInteger(Number(currentValue.s.v)) ? "Int" : "Float"
                    }
                }
            }
        }
    }
    return "" //fall-through
}

// Returns the value returned by a function call
export function getCallReturn(callingNode: any) {
    if (callingNode._astname === "Call") { //just return null if this is the wrong kind of node.
        //if the call creates a string or list
        if (doesCallCreateString(callingNode)) {
            return "Str"
        }
        if (doesCallCreateList(callingNode)) {
            return performListOp(callingNode)[0]
        }
        //otherwise, let's see what the function is
        callingNode.func = retrieveFromList(callingNode.func)
        let functionName = ""
        if ('id' in callingNode.func) {
            functionName = callingNode.func.id.v
        }
        if ('attr' in callingNode.func) {
            functionName = callingNode.func.attr.v
        }
        //special case for Number()
        if (functionName === "Number") {
            return getNumberCallReturn(callingNode)
        }
        //check through our list of function returns. If we know the return type, return that here.
        let functionCalled = getFunctionObject(functionName)
        if (functionCalled != null) {
            if (functionCalled.returns === "List" && functionCalled.nodeElements != null && functionCalled.nodeElements.length > 0) {
                return functionCalled.nodeElements[0].elts
            } else if (functionCalled.returns === "BinOp") {
                return null
            } else {
                return functionCalled.returns
            }
        }
    }
    return null
}

// Get the most recent assigned value of a variable
export function getMostRecentValue(variableObject: any, lineno: number) : any {
    let inFunction = null   //step 1. are we in a function?
    let returnVal = null
    for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (lineno >= ccState.getProperty('userFunctionReturns')[u].startLine && 
            lineno <= ccState.getProperty('userFunctionReturns')[u].endLine) {
            inFunction = [ccState.getProperty('userFunctionReturns')[u].startLine, 
                ccState.getProperty('userFunctionReturns')[u].endLine]
            break
        }
    }
    if (inFunction != null) {   //check inside the function FIRST
        let furthestLine = -1;
        for (let amItem = 0; amItem < variableObject.assignedModified.length; amItem++) {
            if (variableObject.assignedModified[amItem].line > inFunction[1] || variableObject.assignedModified[amItem].line > lineno) {
                break
            }
            if (variableObject.assignedModified[amItem].line >= inFunction[0]) {
                furthestLine = amItem
            }
        }
        if (furthestLine > -1) {
            return variableObject.assignedModified[furthestLine].nodeValue
        }
    }
    //if we haven't returned, OR if we're  not in a function, look for the most recent NOT IN FUNCTION elts.
    for (let amItem = 0; amItem < variableObject.assignedModified.length; amItem++) {
        if (variableObject.assignedModified[amItem].line > lineno) {
            break
        }
        if (variableObject.assignedModified[amItem].line <= lineno) {
            // is it in a function? this only counts if it's NOT in a function
            let isInFunction = false
            for (let udfNumber = 0; udfNumber < ccState.getProperty('userFunctionReturns').length; udfNumber++) {
                if (variableObject.assignedModified[amItem].line >= ccState.getProperty('userFunctionReturns')[udfNumber].startLine && 
                    variableObject.assignedModified[amItem].line <= ccState.getProperty('userFunctionReturns')[udfNumber].endLine) {
                    isInFunction = true
                    break
                }
            }
            if (!isInFunction) {
                returnVal = variableObject.assignedModified[amItem].nodeValue
            }
        }
    }
    //if we still don't know what it is, just use the first assigned value.
    if (returnVal == null && (variableObject.assignedModified.length > 0)) {
        returnVal = variableObject.assignedModified[0].nodeValue
    }
    //if the most recent value is that of another variable, fund the most recent value of THAT variable
    if (returnVal != null && returnVal._astname === "Name" && getVariableObject(returnVal.id.v) != null) {
        returnVal = getMostRecentValue(getVariableObject(returnVal.id.v), lineno)
    }
    return returnVal
}

// Determines whether or not two AST nodes contain the same value.
export function doAstNodesMatch(astnode1: any, astnode2: any) : any {
    const matchingAstName = astnode1._astname;
    if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
        //the two nodes reference the same variable or function
        return true
    }
    if (astnode1._astname != astnode2._astname) {
        //if they're not the same variable but they ARE the same value
        //(ex., a variable whose value is 5 and and integeere whose value is 5)
        //register this as a match
        if (astnode1._astname === "Name" || astnode2._astname === "Name") {  //if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
            let val1 = astnode1
            let val2 = astnode2
            if (astnode1._astname === "Name") {
                const varObj = getVariableObject(astnode1.id.v)
                if (varObj == null) {
                    return false
                } else { 
                    val1 = getMostRecentValue(varObj, astnode1.lineno)
                }
            }
            if (astnode2._astname === "Name") {
                const varObj = getVariableObject(astnode2.id.v)
                if (varObj == null) {
                    return false
                }
                else { 
                    val2 = getMostRecentValue(varObj, astnode2.lineno);
                }
            }
            return (doAstNodesMatch(val1, val2))
        }
        return false
    }
    //if it's a UnaryOp, we should see if the operands match
    //this isn't exact but works for our purposes
    if (matchingAstName === "UnaryOp") {
        return doAstNodesMatch(astnode1.operand, astnode2.operand)
    }
    //if two lists, check that the elements all match
    if (matchingAstName === "List") {
        if (astnode1.elts.length != astnode2.elts.length) {
            return false
        } else {
            for (let e = 0; e < astnode1.elts.length; e++) {
                if (!(doAstNodesMatch(astnode1.elts[e], astnode2.elts[e]))) {
                    return false
                }
            }
            return true
        }
    } else if (matchingAstName === "Call") {
        //We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        let args1 = []
        let args2 = []
        const funcNode1 = retrieveFromList(astnode1.func)
        const funcNode2 = retrieveFromList(astnode2.func)
        //for list ops and string ops
        if ('attr' in funcNode1) {
            if (!('attr' in funcNode2)) {
                return false
            } else {
                if (funcNode1.attr.v != funcNode2.attr.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        } else if ('id' in funcNode1) {
            //for all other function types
            if (!('id' in funcNode2)) {
                return false
            } else {
                if (funcNode1.id.v != funcNode2.id.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        }
        //do the arguments match?
        if (args1.length != args2.length) {
            return false
        }
        for (let a = 0; a < args1.length; a++) {
            if (!doAstNodesMatch(args1[a], args2[a])) {
                return false
            }
        }
        return true;
    } else if (matchingAstName === "Num") {
        //numerical values must match
        return astnode1.n.v === astnode2.n.v
    } else if (matchingAstName === "Str") {
        //ditto for strings
        return astnode1.s.v === astnode2.s.v
    }
}

// Performs a list operation & returns an array of AST nodes in the proper order, if appropriate
export function performListOp(callingNode: any): any {
    //check the language, and call the appropriate listop function
    //python and javascript handle str/listops a little differently,
    //so we must differentiate as well
    return ccState.getProperty('isJavascript') ? jsOp(callingNode) : pythonOp(callingNode)
    
    //helper comparison function
    function compare(a: any, b: any) { // Use toUpperCase() to ignore character casing
        const bandA = a.key.toUpperCase()
        const bandB = b.key.toUpperCase()
        let comparison = 0
        if (bandA > bandB) { comparison = 1 }
        else if (bandA < bandB) { comparison = -1 }
        return comparison
    }

    //JS list ops
    function jsOp(callingNode: any) {
        //variable init
        let opToPerform = null
        let listToUse = []
        let stringElements = []
        //first, determine what operation we need to perform
        if ('func' in callingNode && 'attr' in callingNode.func) {
            opToPerform = callingNode.func.attr.v;
        }
        //find the array we'll be performing it on
        //if variable, find most recent list of elements
        if (callingNode.func.value._astname === "Name") {
            const variable = getVariableObject(callingNode.func.value.id.v)
            if (variable != null) {
                const correctElts = mostRecentElements(variable, callingNode.lineno)
                if (correctElts != null) {
                    listToUse = correctElts.slice(0)
                }
            }
        } else if (callingNode.func.value._astname === "Call") {
            //if a function call, find the stored elements list
            if (doesCallCreateList(callingNode.func.value)) {
                listToUse = performListOp(callingNode.func.value)[0]
            } else if (retrieveFromList(callingNode.func.value) != callingNode.func.value) {
                listToUse = retrieveFromList(callingNode.func.value).elts
            } else if ('id' in callingNode.func.value.func && getFunctionObject(callingNode.func.value.func.id.v) != null) {
                const variable = getVariableObject(callingNode.func.value.id.v)
                if (variable != null) {
                    const correctElts = mostRecentElements(variable, callingNode.lineno)
                    if (correctElts != null) {
                        listToUse = correctElts.slice(0)
                    }
                }
            }
        } else if (callingNode.func.value._astname === "List") {
            //if it's a list or binop node, get the values inside
            listToUse = callingNode.func.value.elts
        } else if (callingNode.func.value._astname === "BinOp") {
            listToUse = getAllBinOpLists(callingNode.func.value)
        }
        //if we don't know what array to use, return empty
        if (listToUse == null) {
            return [[], []]
        }
        //perform the called operation.
        if (opToPerform != null) {
            //Concatenation
            if (opToPerform === "concat") {
                //get the list of values to be appended to the list
                let listToAppend = []
                if (callingNode.args[0]._astname === "List") {
                    listToAppend = callingNode.args[0].elts
                } else if (callingNode.args[0]._astname === "Name") {
                    const varVal = getVariableObject(callingNode.args[0].id.v)
                    if (varVal != null) {
                        listToAppend = mostRecentElements(varVal, callingNode.lineno)
                    }
                } else if (callingNode.args[0]._astname === "Call") {
                    if (doesCallCreateList(callingNode.args[0])) {
                        listToAppend = performListOp(callingNode.args[0])
                    } else if ('id' in callingNode.args[0].func) {
                        const funcReturn = getFunctionObject(callingNode.args[0].func.id.v)
                        if (funcReturn != null && funcReturn.nodeElements != null && funcReturn.nodeElements.length > 0) {
                            listToAppend = funcReturn.nodeElements[0].elts
                        }
                    }
                }
                //if nothing, keep the list the same and return accordingly
                if (listToAppend != null && listToAppend.length === 0) {
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
                } else if (listToAppend != null) {
                    //perform the concatenation and return the result
                    listToUse.concat(listToAppend)
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
                }
            }
            //copyWithin
            if (opToPerform === "copyWithin") {
                let targetVal = 0
                let startVal = 0
                let endVal = listToUse.length
                let targetNode = retrieveFromList(callingNode.args[0])
                //get the start, end, and target values for the copyWithin
                if (targetNode._astname === "Name" && getVariableObject(targetNode.id.v) != null) {
                    targetNode = getMostRecentValue(getVariableObject(targetNode.id.v), callingNode.lineno)
                }
                if (targetNode._astname === "Num") {
                    targetVal = targetNode.n.v
                }
                if (callingNode.args.length > 1) {
                    let startNode = retrieveFromList(callingNode.args[1])
                    if (startNode != null && startNode._astname === "Num") {
                        startVal = startNode.n.v
                    } else if (startNode._astname === "Name" && getVariableObject(startNode.id.v) != null && getVariableObject(startNode.id.v) === "Int") {
                        startVal = getMostRecentValue(getVariableObject(startNode.id.v), callingNode.lineno)
                    }
                }
                if (callingNode.args.length > 2) {
                    let endNode = retrieveFromList(callingNode.args[2])
                    if (endNode != null && endNode._astname === "Num") {
                        endVal = endNode.n.v
                    } else if (endNode._astname === "Name" && getVariableObject(endNode.id.v) != null && getVariableObject(endNode.id.v) === "Int") {
                        endVal = getMostRecentValue(getVariableObject(endNode.id.v), callingNode.lineno)
                    }
                }
                //get the nodes to be copied
                let sliceToCopy = listToUse.slice(startVal, endVal)
                let newList = []
                //create the new array
                for (let i = 0; i < targetVal; i++) {
                    newList.push(listToUse[i])
                }
                for (let j = 0; j < sliceToCopy.length; j++) {
                    if (j === listToUse.length) {
                        break
                    }
                    newList.push(sliceToCopy[j])
                }
                for (let k = newList.length; k < listToUse.length; k++) {
                    newList.push(listToUse[k])
                }
                //return the modified array
                return [newList, nodesToStrings(newList, callingNode.lineno)]
            }
            //fill
            if (opToPerform === "fill") {
                //get the node to fill the array with
                const fillItem = retrieveFromList(callingNode.args[0])
                let returnList = []
                //fill the array with that node
                if (fillItem != null) {
                    for (let i = 0; i < listToUse.length; i++) {
                        returnList.push(fillItem)
                    }
                }
                //return output
                return [returnList, nodesToStrings(returnList, callingNode.lineno)]
            }
            if (opToPerform === "filter") {
                //it's probably wise to not try to do this and instead just return the same list.
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            if (opToPerform === "keys") {
                //create new arrays for the fake key nodes and their types
                let emptyArray = []
                let strArray = []
                //make an array of fake integer nodes
                for (let i in listToUse) {
                    const fakeNode = { _astname: "Num", lineno: callingNode.lineno, n: { lineno: callingNode.lineno, v: i } }
                    emptyArray.push(fakeNode)
                    strArray.push("Int")
                }
                //return the array of fake nodes and the array of "Int" (for stringElements)
                return [emptyArray, strArray]
            }
            //map
            if (opToPerform === "map") {
                //lookup return of called function
                //called function is EITHER a name OR a functionexp
                let fakeList = []
                let fakeElts = []
                let mapFuncName = null
                const funcNode = retrieveFromList(callingNode.args[0])
                //get the name of the function to use in map()
                if (funcNode._astname === "Name") {
                    mapFuncName = funcNode.id.v
                } else if (funcNode._astname === "FunctionExp") {
                    mapFuncName = "" + funcNode.lineno + "|" + funcNode.col_offset
                }
                //find what kind of value it returns
                const thisReturn = getFunctionObject(mapFuncName)
                //create a fake node whose value will represent the returned value
                let returnedValue : any = {}
                if (thisReturn != null) {
                    if (thisReturn.returns === "Int" || thisReturn.returns === "Float") {
                        returnedValue._astname = "Num"
                        if (thisReturn.returns === "Int") {
                            //filler values so this gets correctly picked up in any later references
                            returnedValue.n = { v: 1 }
                        } else {
                            returnedValue.n = { v: 1.15 }
                        }
                    }
                    if (thisReturn.returns === "Str") {
                        returnedValue._astname === "Str"
                    }
                    if (thisReturn.returns === "List") {
                        returnedValue._astname = "List"
                        if (thisReturn.nodeElements != null && thisReturn.nodeElements.length > 0) {
                            returnedValue.elts = thisReturn.nodeElements[0].elts
                        }
                    }
                    if (thisReturn.returns === "Bool") {
                        returnedValue._astname === "Name"
                        returnedValue.id = { v: "True" }
                    }

                    if (thisReturn.returns === "BinOp") {
                        returnedValue.left = thisReturn.binOp.left
                        returnedValue.right = thisReturn.binOp.right
                    }
                    //fill the empty array with fake nodes
                    for (let i in listToUse) {
                        fakeList.push(returnedValue)
                        fakeElts.push(thisReturn.returns)
                    }
                    return [fakeList, fakeElts]
                } else {
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
                }
            }
            //return the list with the last item removed
            if (opToPerform === "pop") {
                listToUse.splice(listToUse.length - 1, 1)
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            //push the passed node
            if (opToPerform === "push") {
                const pushArg = retrieveFromList(callingNode.args[0])
                if (pushArg != null) {
                    let returnList = listToUse.slice(0)
                    returnList.push(pushArg)
                    return [returnList, nodesToStrings(returnList, callingNode.lineno)]
                }
            }
            //reverse
            if (opToPerform === "reverse") {
                const returnList = listToUse.reverse()
                return [returnList, nodesToStrings(returnList, callingNode.lineno)]
            }
            //shift
            if (opToPerform === "shift") {
                listToUse.splice(0, 1)
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            //slice
            if (opToPerform === "slice") {
                let startInt = 0
                let endInt = listToUse.length - 1   //get the actual values, if we know them.
                //gather target, start, and end vals
                let targetNode = retrieveFromList(callingNode.args[0])
                if (targetNode._astname === "Name" && getVariableObject(targetNode.id.v) != null) {
                    targetNode = getMostRecentValue(getVariableObject(targetNode.id.v), callingNode.lineno)
                }
                if (targetNode != null && targetNode._astname === "Num") {
                    startInt = targetNode.n.v
                }
                if (callingNode.args.length > 1) {
                    let endNode = retrieveFromList(callingNode.args[1])
                    if (endNode._astname === "Name" && getVariableObject(endNode.id.v) != null) {
                        endNode = getMostRecentValue(getVariableObject(endNode.id.v), callingNode.lineno)
                    }
                    if (endNode != null && endNode._astname === "Num") {
                        endInt = endNode.n.v
                    }
                }
                //handle negatives
                if (startInt < 0) {
                    startInt += listToUse.length
                }
                if (endInt < 0) {
                    endInt += listToUse.length
                }
                //do the slicing and return results
                const newList = listToUse.slice(startInt, endInt)
                return [newList, nodesToStrings(newList, callingNode.lineno)]
            }
            //sort
            if (opToPerform === "sort") {
                //variable init
                let returnList = []
                let numberPairs = []
                //indices is used to indicate items that have already been sorted and put in the result list
                //so we don't include/sort them twice
                let indices = []
                //the first thing to sort is numerical values
                for (let i in listToUse) {
                    if (listToUse[i]._astname === "Num") {
                        const stringVal = listToUse[i].n.v.toString()
                        numberPairs.push({ key: stringVal, value: listToUse[i] })
                        indices.push(i)
                    } else if (listToUse[i]._astname === "List" && listToUse[i][0]._astname === "Num") {
                        const stringVal = listToUse[i][0].n.v.toString()
                        numberPairs.push({ key: stringVal, value: listToUse[i] })
                        indices.push(i)
                    }
                }
                //sort the numberVals
                numberPairs.sort(compare);
                for (let i in numberPairs) {
                    returnList.push(numberPairs[i].value)
                }
                //any numerical values whose values we do not know get put in next
                for (let i in listToUse) {
                    if (!(indices.includes(i))) {
                        if (listToUse[i]._astname === "Name") {
                            if (getVariableObject(listToUse[i]) != null && (getVariableObject(listToUse[i]).value === "Int" || getVariableObject(listToUse[i]).value === "Float")) {
                                returnList.push(listToUse[i])
                                indices.push(i)
                            }
                        }
                        if (listToUse[i]._astname === "BinOp") {
                            if (recursivelyAnalyzeBinOp(listToUse[i]) === "Int" || recursivelyAnalyzeBinOp(listToUse[i]) === "Float") {
                                returnList.push(listToUse[i])
                                indices.push(i)
                            }
                        }
                        if (listToUse[i]._astname === "Call") {
                            if (getCallReturn(listToUse[i]) === "Int" || getCallReturn(listToUse[i]) === "Float") {
                                returnList.push(listToUse[i])
                                indices.push(i)
                            }
                        }
                    }
                }
                //everything else gets converted to a string and the strings get sorted, which mirrors the way JS sorts lists
                let sortables = []
                for (let i in listToUse) {
                    if (!(indices.includes(i))) {
                        if (listToUse[i]._astname === "Name" && (listToUse[i].id.v === "True" || listToUse[i].id.v === "False")) {
                            sortables.push({ key: listToUse[i].id.v.toLowerCase(), value: listToUse[i] })
                            indices.push(i)
                        } else if (listToUse[i]._astname === "Str") {
                            sortables.push({ key: listToUse[i].s.v, value: listToUse[i] })
                            indices.push(i)
                        } else if (listToUse[i]._astname === "Name" && getVariableObject(listToUse[i].id.v) == null && getFunctionObject(listToUse[i].id.v) == null) {
                            sortables.push({ key: listToUse[i].id.v, value: listToUse[i] })
                            indices.push(i)
                        } else if (listToUse[i]._astname === "Name" && getVariableObject(listToUse[i].id.v) == null && getFunctionObject(listToUse[i].id.v) != null) {
                            sortables.push({ key: "{\"prototype\":{},\"length\":0}", value: listToUse[i] })
                            indices.push(i)
                        } else if (listToUse[i]._astname === "List") {
                            if (listToUse[i][0]._astname === "Name" && (listToUse[i][0].id.v === "True" || listToUse[i][0].id.v === "False")) {
                                sortables.push({ key: listToUse[i].id.v.toLowerCase(), value: listToUse[i] })
                                indices.push(i)
                            } else if (listToUse[i][0]._astname === "Str") {
                                sortables.push({ key: listToUse[i][0].s.v, value: listToUse[i] })
                                indices.push(i)
                            } else if (listToUse[i][0]._astname === "Name" && getVariableObject(listToUse[i][0].id.v) == null && getFunctionObject(listToUse[i][0].id.v) == null) {
                                sortables.push({ key: listToUse[i][0].id.v, value: listToUse[i] })
                                indices.push(i)
                            } else if (listToUse[i][0]._astname === "Name" && getVariableObject(listToUse[i][0].id.v) == null && getFunctionObject(listToUse[i][0].id.v) != null) {
                                sortables.push({ key: "{\"prototype\":{},\"length\":0}", value: listToUse[i] })
                                indices.push(i)
                            }
                        }
                    }
                }
                //sort the list of stringified versions
                sortables.sort(compare)
                for (let i in sortables) {
                    returnList.push(sortables[i].value)
                }
                for (let i in listToUse) {
                    if (!indices.includes(i)) { returnList.push(listToUse[i]) }
                }
                return [returnList, nodesToStrings(returnList, callingNode.lineno)]
            }
            //splice
            if (opToPerform === "splice") {
                //as with python ops, this is necessarily not 100% accurate but should at least serve some purpose
                let startValue = listToUse.length
                let deleteCount = 0
                let itemsToAppend = []
                let newList = []
                //get start and deleteCount values, defaulting if necessary
                const targetNode = retrieveFromList(callingNode.args[0])
                if (targetNode != null && targetNode._astname === "Num") {
                    startValue = targetNode.n.v
                } else if (targetNode._astname === "Name") {
                    const targetVar = getVariableObject(targetNode.id.v)
                    if (targetVar != null && targetVar.value === "Int") {
                        startValue = getMostRecentValue(targetVar, callingNode.lineno)
                    }
                }
                if (callingNode.args.length > 1) {
                    const endNode = retrieveFromList(callingNode.args[1])
                    if (endNode._astname === "Num") {
                        deleteCount = endNode.n.v
                    } else if (endNode._astname === "Name") {
                        const endVar = getVariableObject(endNode.id.v)
                        if (endVar != null && endVar.value === "Int") {
                            deleteCount = getMostRecentValue(endVar, callingNode.lineno)
                        }
                    }
                }
                if (callingNode.args.length > 2) {
                    for (let i = 2; i < callingNode.args.length; i++) {
                        itemsToAppend.push(callingNode.args[i])
                    }
                }
                //default values
                if (startValue < 0) {
                    startValue += listToUse.length
                }
                if (startValue < 0) {
                    startValue = 0
                }
                //create the new array with the spliced values
                for (let i = 0; i < startValue; i++) {
                    newList.push(listToUse[i])
                }
                for (let i in itemsToAppend) {
                    newList.push(itemsToAppend[i])
                }
                for (let i = startValue + deleteCount; i < listToUse.length; i++) {
                    newList.push(listToUse[i])
                }
                //return
                return [newList, nodesToStrings(newList, callingNode.lineno)]
            }
            //unshift
            if (opToPerform === "unshift") {
                let returnList = listToUse.slice(0)
                returnList.splice(0, 0, callingNode.args[0])
                return [returnList, nodesToStrings(returnList, callingNode.lineno)]
            }
            //values really just keeps the list the same
            if (opToPerform === "values") {
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
        }
        //return listToUse if we haven't done anything to it
        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
    }

    //sort ints - ascending order first, then undetermined values
    function sortNumber(a: number, b: number) { return a - b }

    //Python listops
    function pythonOp(callingNode: any) {
        //variable init
        let opToPerform = null
        let listToUse = []
        //what operation are we performing?
        if ('func' in callingNode && 'attr' in callingNode.func) {
            opToPerform = callingNode.func.attr.v
        }
        if (callingNode.func.value._astname === "Name") {
            const variable = getVariableObject(callingNode.func.value.id.v)
            if (variable != null) {
                const correctElts = mostRecentElements(variable, callingNode.lineno)
                if (correctElts != null) {
                    listToUse = correctElts.slice(0)
                }
            }
        } else if (callingNode.func.value._astname === "Call") {
            if (doesCallCreateList(callingNode.func.value)) {
                listToUse = performListOp(callingNode.func.value)[0]
            } else if (retrieveFromList(callingNode.func.value) != callingNode.func.value) {
                listToUse = retrieveFromList(callingNode.func.value).elts
            } else if ('id' in callingNode.func.value.func) {
                const funcName = callingNode.func.value.func.id.v
                if (getFunctionObject(funcName) != null) {
                    const variable = getVariableObject(callingNode.func.value.id.v)
                    if (variable != null) {
                        const correctElts = mostRecentElements(variable.nodeElements, callingNode.lineno)
                        if (correctElts != null) {
                            listToUse = correctElts.slice(0)
                        }
                    }
                }
            }
        } else if (callingNode.func.value._astname === "List") {
            listToUse = callingNode.func.value.elts
        } else if (callingNode.func.value._astname === "BinOp") {
            listToUse = getAllBinOpLists(callingNode.func.value)
        }
        //if we don't know what array to use, return empty
        if (listToUse == null) {
            return [[], []]
        }
        if (opToPerform != null) {
            //append
            if (opToPerform === "append") {
                const itemToAppend = callingNode.args[0]
                listToUse.push(itemToAppend)
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            //extend
            if (opToPerform === "extend") {
                //get the list value to append to the original list
                let listToAppend = []
                if (callingNode.args[0]._astname === "List") {
                    listToAppend = callingNode.args[0].elts.slice(0)
                } else if (callingNode.args[0]._astname === "Name") {
                    const varVal = getVariableObject(callingNode.args[0].id.v)
                    if (varVal != null) {
                        const currentElts = mostRecentElements(varVal, callingNode.lineno)
                        listToAppend = currentElts.slice(0)
                    }
                } else if (callingNode.args[0]._astname === "Call") {
                    if (doesCallCreateList(callingNode.args[0])) {
                        listToAppend = performListOp(callingNode.args[0])
                    } else if ('id' in callingNode.args[0].func) {
                        const funcReturn = getFunctionObject(callingNode.args[0].func.id.v)
                        if (funcReturn != null && funcReturn.nodeElements != null && funcReturn.nodeElements.length > 0) {
                            listToAppend = funcReturn.nodeElements[0].elts
                        }
                    }
                }
                //return the list with values appended
                if (listToAppend.length === 0) {
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
                } else {
                    listToUse.concat(listToAppend)
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
                }
            }
            //insert
            if (opToPerform === "insert") {
                let insertPosition = 0
                const itemToInsert = retrieveFromList(callingNode.args[0])
                if (itemToInsert != null) {
                    listToUse.splice(insertPosition, 0, itemToInsert)
                }
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            //pop
            if (opToPerform === "pop") {
                let popArg = listToUse.length - 1
                if (callingNode.args != null && callingNode.args.length > 0) {
                    popArg = callingNode.args[0].n.v
                }
                listToUse.splice(popArg, 1)
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            //remove
            if (opToPerform === "remove") {
                let indexToRemove = -1
                let itemToRemove = callingNode.args[0]
                //find an item that matches. same _astname, same value
                for (let p = 0; p < listToUse.length; p++) {
                    if (listToUse[p]._astname === itemToRemove._astname) {
                        //now we check that the values are the same.
                        if (doAstNodesMatch(listToUse[p], itemToRemove)) {
                            indexToRemove = p
                            break //THIS BREAK IS IMPORTANT! - erin
                        }
                    }
                }
                if (indexToRemove > -1) {
                    listToUse.splice(indexToRemove, 1)
                }
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
            if (opToPerform === "sort") {
                let sortedList = []
                let sortedBools = []
                let sortedInts = []
                let sortedFloats = []
                let sortedLists = []
                let sortedStrings = []
                //sort the bools - false, then true, then undetermined
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Name" && listToUse[i].id.v === "False") {
                        sortedBools.push(listToUse[i])
                    }
                }
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Name" && listToUse[i].id.v === "True") {
                        sortedBools.push(listToUse[i])
                    }
                }
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Name" && getVariableObject(listToUse[i].id.v) != null && getVariableObject(listToUse.id.v).value === "Bool") {
                        sortedBools.push(listToUse[i])
                    } else if (listToUse[i]._astname === "Call") {
                        let functionName = ""
                        const funcId = retrieveFromList(listToUse[i].func)
                        if ('id' in funcId) {
                            functionName = funcId.id.v
                        }
                        if (functionName !== "" && (getFunctionObject(functionName).returns === "Bool")) {
                            sortedBools.push(listToUse[i])
                        }
                    } else if (listToUse[i]._astname === "BoolOp") {
                        sortedBools.push(listToUse[i])  //we COULD evaluate these, and may a a later time, but IMHO it's inefficient to do now.
                    } else if (listToUse[i]._astname === "Compare") {
                        sortedBools.push(listToUse[i])
                    } else if (listToUse[i]._astname === "UnaryOp") {
                        sortedBools.push(listToUse[i])
                    }
                }
                
                let unsortedInts = []
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Num" && !isNodeFloat(listToUse[i])) {
                        unsortedInts.push(listToUse[i].n.v)
                    }
                }
                unsortedInts.sort(sortNumber) //let's make javascript do this for us
                for (let y = 0; y < unsortedInts.length; y++) {
                    //find the matching AST node and push to sortedInts
                    for (let i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Num" && listToUse[i].n.v === unsortedInts[y]) {
                            sortedInts.push(listToUse[i])
                            break
                        }
                    }
                }
                //add the undetermined-value integers here
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Call") {
                        let functionName = ""
                        const funcId = retrieveFromList(listToUse[i].func)
                        if ('id' in funcId) { functionName = funcId.id.v }
                        if ( getVariableObject(functionName) != null && getVariableObject(functionName).value === "Int") {
                            sortedInts.push(listToUse[i])
                        }
                    } else if (listToUse[i]._astname === "Name" && (getVariableObject(listToUse[i].id.v) != null && getVariableObject(listToUse[i].id.v).value === "Int")) {
                        sortedInts.push(listToUse[i])
                    } else if (listToUse[i]._astname === "BinOp" && recursivelyAnalyzeBinOp(listToUse[i]) === "Int") {
                        sortedInts.push(listToUse[i])
                    }
                }
                //sort the floats next.
                let unsortedFloats = []
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Num" && !!isNodeFloat(listToUse[i])) {
                        unsortedFloats.push(listToUse[i].n.v)
                    }
                }
                for (let y = 0; y < unsortedFloats.length; y++) {
                    //find the matching AST node and push to sortedInts
                    for (let i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Num" && listToUse[i].n.v === unsortedFloats[y]) {
                            sortedFloats.push(listToUse[i])
                            break
                        }
                    }
                }
                //insert the undetermined-value floats
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Call") {
                        let functionName = ""
                        if ('id' in listToUse[i].func) {
                            functionName = listToUse[i].func.id.v;
                        } else if (listToUse[i].func._astname === "Subscript") {
                            const subName = retrieveFromList(listToUse[i].func)
                            if (subName != null && subName._astname === "Name" && getVariableObject(subName.id.v) != null && getVariableObject(subName.id.v).value === "Float") {
                                sortedFloats.push(listToUse[i])
                            }
                        }
                    } else if (listToUse[i]._astname === "Name" && (getVariableObject(listToUse[i].id.v) != null && getVariableObject(listToUse[i].id.v).value === "Float")) {
                        sortedFloats.push(listToUse[i])
                    } else if (listToUse[i]._astname === "BinOp" && recursivelyAnalyzeBinOp(listToUse[i]) === "Float") {
                        sortedFloats.push(listToUse[i])
                    }
                }
                //next, the LISTS. these will be the hardest because we are sorting them by first element, theoretically, in the same order as the overarching list.
                let unsortedLists = [];
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "List") {
                        unsortedLists.push(listToUse[i])
                    }
                }
                sortedLists = pythonSortNestedLists(unsortedLists)
                //lists with unknown first values
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Call") {
                        let functionName = ""
                        if ('id' in listToUse[i].func) { 
                            functionName = listToUse[i].func.id.v
                        } else if (listToUse[i].func._astname === "Subscript") {
                            const subName = retrieveFromList(listToUse[i].func)
                            if (subName != null && subName._astname === "Name" && getVariableObject(subName.id.v) != null && getVariableObject(subName.id.v).value === "List") {
                                sortedLists.push(listToUse[i])
                            }
                        }
                    } else if (listToUse[i]._astname === "Name" && (getVariableObject(listToUse[i].id.v) != null && getVariableObject(listToUse[i].id.v).value === "List")) {
                        sortedLists.push(listToUse[i])
                    } else if (listToUse[i]._astname === "BinOp" && (Array.isArray(recursivelyAnalyzeBinOp(listToUse[i])))) {
                        sortedLists.push(listToUse[i])
                    }
                }
                //finally, the strings.
                let unsortedStrings = []
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Str") {
                        unsortedStrings.push(listToUse[i].s.v)
                    }
                }
                unsortedStrings.sort()
                for (let y = 0; y < unsortedStrings.length; y++) {
                    for (let i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Str" && 's' in listToUse[i] && listToUse[i].s.v === unsortedStrings[y]) {
                            sortedStrings.push(listToUse[i])
                            break
                        }
                    }
                }
                //insert the complicated strings
                for (let i = 0; i < listToUse.length; i++) {
                    if (listToUse[i]._astname === "Call") {
                        let functionName = ""
                        if ('id' in listToUse[i].func) { 
                            functionName = listToUse[i].func.id.v
                        } else if (listToUse[i].func._astname === "Subscript") {
                            const subName = retrieveFromList(listToUse[i].func)
                            if (subName != null && subName._astname === "Name" && getVariableObject(subName.id.v) != null && getVariableObject(subName.id.v).value === "Str") {
                                sortedStrings.push(listToUse[i])
                            }
                        }
                    } else if (listToUse[i]._astname === "Name" && (getVariableObject(listToUse[i].id.v) != null && getVariableObject(listToUse[i].id.v).value === "Str")) {
                        sortedStrings.push(listToUse[i])
                    } else if (listToUse[i]._astname === "BinOp" && (recursivelyAnalyzeBinOp(listToUse[i]) === "Str")) {
                        sortedStrings.push(listToUse[i])
                    }
                }
                //combine the sorted components, and return that
                sortedList = sortedBools // + sortedInts + sortedFloats + sortedLists + sortedStrings;
                sortedList = appendArray(sortedInts, sortedList)
                sortedList = appendArray(sortedFloats, sortedList)
                sortedList = appendArray(sortedLists, sortedList)
                sortedList = appendArray(sortedStrings, sortedList)
                return [sortedList, nodesToStrings(sortedList, callingNode.lineno)]
            }
            if (opToPerform === "shuffleList") {
                //this is, by necessity, a gap in this complexity calculator. We cannot replicate randomness, because it is random. Possible space for future improvements
                return [listToUse, nodesToStrings(listToUse, callingNode.lineno)]
            }
        }
        return null
    }

    //helper function for pythonOp
    function pythonSortNestedLists(allListsInList: string[]) {
        //sort lists by first element (sorted by type and by value)
        //lists WITHIN this get sorted by THEIR first element within this (recursively calls self on those lists.)
        let listsWithin = []
        let listsSorted = []
        let intSorted = [], floatSorted = [], listSorted = [], stringSorted = []
        for (let a = 0; a < allListsInList.length; a++) {
            if (getFirstElementType(allListsInList[a]) === "Bool") {
                listsSorted.push(allListsInList[a])
            } else if (getFirstElementType(allListsInList[a]) === "Int") {
                intSorted.push(allListsInList[a])
            } else if (getFirstElementType(allListsInList[a]) === "Float") {
                floatSorted.push(allListsInList[a])
            } else if (getFirstElementType(allListsInList[a]) === "List") {
                listsWithin.push(allListsInList[a])
            } else if (getFirstElementType(allListsInList[a]) === "Str") {
                stringSorted.push(allListsInList[a])
            }
        }
        if (listsWithin.length > 0) {
            listSorted = pythonSortNestedLists(listsWithin)
        }
        //append the arrays, in order
        listsSorted = appendArray(intSorted, listsSorted)
        listsSorted = appendArray(floatSorted, listsSorted)
        listsSorted = appendArray(listSorted, listsSorted)
        listsSorted = appendArray(stringSorted, listsSorted)
        return listsSorted
    }
}

// Does this call to a listOp function RETURN a list?
export function doesCallCreateList(node: any) {
    let funcName = ""
    if (node._astname === "Call") {
        const funcNode = retrieveFromList(node.func)
        if (funcNode != null) {
            if ('attr' in funcNode) {
                funcName = funcNode.attr.v
            }
            if ('id' in funcNode && funcNode.id.v === "shuffleList") {
                return true
            };
            if (ccState.PY_CREATE_LIST_FUNCS.includes(funcName)) {
                return true
            }
        }
    }
    return false
}

// Returns the type of the first element in a list.
export function getFirstElementType(list: any) {
    return getTypeFromNode(retrieveFromList(list.elts[0]))
}

// Is this node a call to an operation that creates a string?
export function doesCallCreateString(node: any) {
    let funcName = ""
    if (node._astname === "Call") {
        let funcNode =  retrieveFromList(node.func)
        if (funcNode != null) {
            if ('attr' in funcNode) {
                funcName = funcNode.attr.v
            }
            if ('id' in funcNode && funcNode.id.v === "shuffleString") {
                return true
            }
        }
        if (ccState.PY_CREATE_STR_FUNCS.includes(funcName)) {
            return true
        }
    }
    return false
}

// Is this node a call to a string operation?
export function isCallAStrOp(node: any) {
    const thisNode =  retrieveFromList(node)
    if (thisNode != null && thisNode._astname === "Call") {
        if ('id' in thisNode.func) {
            return false
        } else if ('attr' in thisNode.func) {
            let funcName = thisNode.func.attr.v
            if (ccState.getProperty('listFuncs').includes(funcName)) {
                return true
            }
        }
    }
    return false
}

// Does this node contain any string indexing or slicing?
export function getStringIndexingInNode(node: any) : any {
    function getStringIndexing(node: any) : any {
        if (node._astname === "Subscript" && (node.slice._astname === "Index" || node.slice._astname === "Slice")) {
            //is the thing we're indexing a string?
            if (node.value._astname === "Str") {
                return [true, true]
            }
            //or a binOp that resolves to a string?
            if (node.value._astname === "BinOp" && recursivelyAnalyzeBinOp(node.value) === "Str") {
                return [true, true]
            }
            //or a call that returns a string?
            if (node.value._astname === "Call") {
                if (doesCallCreateString(node.value)) {
                    return [true, true]
                }
                if ('func' in node.value && 'id' in node.value.func) {
                    const funcObj = getFunctionObject(node.value.func.id.v)
                    if (funcObj.returns === "Str") {
                        return [true, funcObj.original]
                    }
                } else if ('func' in node.value && node.func.value._astname === "Subscript") {
                    const funcName =  retrieveFromList(node.func)
                    if (funcName._astname === "Name") {
                        const returns = getFunctionObject(funcName)
                        if (returns != null && returns.returns === "Str") {
                            return [true, returns.original]
                        }
                    }
                }
            }
            //or a variable that contains a string?
            if (node.value._astname === "Name") {
                const thisVariable = getVariableObject(node.value.id.v)
                if (thisVariable != null) {
                    return [thisVariable.value === "Str", thisVariable.original]
                }
            }
            //Or a subscripted string?
            if (node.value._astname === "Subscript") {
                return (getStringIndexing(node.value))
            }
        }
        return [false, false]
    }
    //regardless of the type of node, we need two things:
    //1. if there's string indexing
    //2. if anything in the node should count as original
    if (node._astname === "UnaryOp") {
        return getStringIndexingInNode(node.operand)
    }
    if (node._astname === "BinOp") {
        let isIndexed = false
        let isOriginal = false
        if (getStringIndexingInNode(node.right)[0] || getStringIndexingInNode(node.right)[0]) {
            isIndexed = true
        }
        if ((getStringIndexingInNode(node.right)[0] && getStringIndexingInNode(node.right)[1]) || (getStringIndexingInNode(node.left)[0] && getStringIndexingInNode(node.left)[1])) {
            isOriginal = true
        }
        return [isIndexed, isOriginal]
    }
    if (node._astname === "BoolOp") {
        let isIndex = false
        let isOriginal = false
        //check values
        for (let i = 0; i < node.values.length; i++) {
            if (getStringIndexingInNode(node.values[i])[0]) {
                isIndex = true
                if (getStringIndexingInNode(node.values[i])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndex, isOriginal]
    }
    if (node._astname === "List") {
        let isIndex = false
        let isOriginal = false
        //check elements
        for (let i = 0; i < node.elts.length; i++) {
            if (getStringIndexingInNode(node.elts[i])[0]) {
                isIndex = true
                if (getStringIndexingInNode(node.elts[i])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndex, isOriginal]
    }
    if (node._astname === "Compare") {
        let isIndexed = false
        let isOriginal = false
        //check left side
        if (getStringIndexingInNode(node.left)[0]) {
            isIndexed = true
            if (getStringIndexingInNode(node.left)[1]) {
                isOriginal = true
            }
        }
        //check comparators
        for (let n = 0; n < node.comparators.length; n++) {
            if (getStringIndexingInNode(node.comparators[n])[0]) {
                isIndexed = true
                if (getStringIndexingInNode(node.comparators[n])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndexed, isOriginal]
    }
    if (node._astname === "Subscript") {
        //is this indexing or slicing a string?
        return (getStringIndexing(node))
    }
    if (node._astname === "Name") {
        if (getVariableObject(node.id.v) != null) {
            return [getVariableObject(node.id.v).indexAndInput.strIndexed, getVariableObject(node.id.v).original]
        }
    }
    if (node._astname === "Call" && 'id' in node.func) {
        const foundFunction = getFunctionObject(node.func.id.v)
        if (foundFunction != null && 'indexAndInput' in foundFunction) {
            return [foundFunction.indexAndInput.strIndexed, foundFunction.original]
        }
    }
    if (node._astname === "Subscript") {
        if (node.slice._astname === "Index" || node.slice._astname === "Slice") {
            if (node.value._astname === "Str") {
                return [true,  ccState.getProperty("originalityLines").includes(node.lineno)]
            }
            if (node.value._astname === "Subscript") {
                return (getStringIndexing(node.value))
            }
            //binop that resolves to string
            if (node.value._astname === "BinOp" && recursivelyAnalyzeBinOp(node.value) === "Str") {
                return [true, true]
            }
            if (node.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF that returns a string
                if (doesCallCreateString(node.value)) {
                    return [true, true]
                }
                if ('func' in node.value && 'id' in node.value.func && getFunctionObject(node.value.id.v).returns === "Str") {
                    return [true, getFunctionObject(node.value.id.v).original]
                }
            }
            //variable that contains string
            if (node.value._astname === "Name" && (getVariableObject(node.value.id.v) != null && getVariableObject(node.value.id.v).value === "Str")) {
                return [true, getVariableObject(node.value.id.v).original]
            }
        }
    }
    return [false, false]
}

// Is this "Call" AST node a call to a list operation?
export function isCallAListOp(node: any) {
    const thisNode =  retrieveFromList(node)
    if (thisNode != null && thisNode._astname === "Call" && 'attr' in thisNode.func && ccState.getProperty('listFuncs').includes(thisNode.func.attr.v)) {
        return true
    }
    return false
}

// Does this node contain any list indexing or slicing?
export function getIndexingInNode(node: any) : any {
    function getNestedIndexing(node: any) : any {
        if (node._astname === "Subscript" && node.slice._astname === "Index") {//if the thing we're indexing is a list, return true
            if (node.value._astname === "List") {
                return [true,  ccState.getProperty("originalityLines").includes(node.lineno)]
            }
            //is it a binop that resolves to a list?
            if (node.value._astname === "BinOp" && Array.isArray(recursivelyAnalyzeBinOp(node.value))) {
                return [true, true]
            }
            if (node.value._astname === "Call") {//is it a listop, concat binop, OR a UDF that returns a list
                if (doesCallCreateList(node.value)) {
                    return [true, true]
                }
                if ('func' in node.value && 'id' in node.value.func) {
                    const funcObj = getFunctionObject(node.value.func.id.v)
                    if (funcObj.returns === "List") {
                        return [true, funcObj.original]
                    }
                }
            }
            if (node.value._astname === "Name") {//is it indexing a variable that contains a list?
                const thisVariable = getVariableObject(node.value.id.v)
                if (thisVariable != null) {
                    return [thisVariable.value === "List", thisVariable.original]
                }
            }
            if (node.value._astname === "Subscript") {
                return (getNestedIndexing(node.value))
            }
        }
        return false
    }

    if (node._astname === "BinOp") {
        let isIndexed = false
        let isOriginal = false
        //check left and right sides
        if (getIndexingInNode(node.right)[0] || getIndexingInNode(node.right)[0]) {
            isIndexed = true
        }
        if ((getIndexingInNode(node.right)[0] && getIndexingInNode(node.right)[1]) || (getIndexingInNode(node.left)[0] && getIndexingInNode(node.left)[1])) {
            isOriginal = true
        }
        return [isIndexed, isOriginal]
    }
    if (node._astname === "UnaryOp") {
        //check operand
        return (getIndexingInNode(node.operand))
    }
    if (node._astname === "BoolOp") {
        let isIndex = false
        let isOriginal = false
        //check all value nodes
        for (let i = 0; i < node.values.length; i++) {
            if (getIndexingInNode(node.values[i])[0]) {
                isIndex = true
                if (getIndexingInNode(node.values[i])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndex, isOriginal]
    }
    if (node._astname === "List") {
        let isIndex = false
        let isOriginal = false
        //check all element nodes
        for (let i = 0; i < node.elts.length; i++) {
            if (getIndexingInNode(node.elts[i])[0]) {
                isIndex = true
                if (getIndexingInNode(node.elts[i])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndex, isOriginal];
    }
    if (node._astname === "Compare") {
        let isIndexed = false
        let isOriginal = false
        //check left side
        if (getIndexingInNode(node.left)[0]) {
            isIndexed = true
            if (getIndexingInNode(node.left)[1]) {
                isOriginal = true
            }
        }
        //check all comparators
        for (let n = 0; n < node.comparators.length; n++) {
            if (getIndexingInNode(node.comparators[n])[0]) {
                isIndexed = true
                if (getIndexingInNode(node.comparators[n])[1]) {
                    isOriginal = true
                }
            }
        }
        return [isIndexed, isOriginal]
    }
    if (node._astname === "Subscript") {
        //check the value
        return (getNestedIndexing(node))
    }
    if (node._astname === "Name" && getVariableObject(node.id.v) != null) {
        //if it's a variable, does it contain indexing and is it original?
        return [getVariableObject(node.id.v).indexAndInput.indexed, getVariableObject(node.id.v).original]
    }
    if (node._astname === "Call" && 'id' in node.func && getFunctionObject(node.func.id.v) != null) {
        //ditto for functions
        if ('indexAndInput' in getFunctionObject(node.func.id.v)) {
            return [getFunctionObject(node.func.id.v).indexAndInput.indexed, getFunctionObject(node.func.id.v).original]
        }
    }
    //special cases: min, max, and choice count as indexing for our purposes
    if (node._astname === "Call" && 'id' in node.func && (node.func.id.v === "min" || node.func.id.v === "max")) {
        return [true,  ccState.getProperty("originalityLines").includes(node.lineno)]
    }
    if (node._astname === "Call" && 'attr' in node.func && node.func.attr.v === "choice") {
        return [true,  ccState.getProperty("originalityLines").includes(node.lineno)]
    }
    if (node._astname === "Subscript") {
        if (node.slice._astname === "Index" || node.slice._astname === "Slice") {
            //is the thing being indexed a list?
            if (node.value._astname === "List") {
                return [true, true]
            }
            //a subscripted list?
            if (node.value._astname === "Subscript") {
                return (getNestedIndexing(node.value))
            }
            //a binop that resolves to a list?
            if (node.value._astname === "BinOp" && Array.isArray(recursivelyAnalyzeBinOp(node.value))) {
                return [true, true]
            }
            //a function call that returns a list?
            if (node.value._astname === "Call") {
                if (doesCallCreateList(node.value)) {
                    return [true, true]
                }
                if ('func' in node.value && 'id' in node.value.func && getFunctionObject(node.value.id.v).returns === "List") {
                    return [true, getFunctionObject(node.value.id.v).original]
                }
            }
            //a variable that contains a list?
            if (node.value._astname === "Name" && getVariableObject(node.value.id.v) === "List") {
                return [true, getVariableObject(node.value.id.v).original]
            }
        }
    }
    return [false, false]
}

// Adds a single operation to the list for a function or variable
export function addOpToList(opToAdd: any, opList: any[], lineno: number) {
    if (opList == null) {
        //if we're passed a null value for the array, initialize a new one
        opList = []
    }
    //adjustment if we're in a loop
    //basically, if the op happens in a loop, we consider it to start at the loop's first line
    for (let p in  ccState.getProperty("loopLocations")) {
        if (lineno >=  ccState.getProperty("loopLocations")[p][0] && 
            lineno <=  ccState.getProperty("loopLocations")[p][1]) {
            lineno =  ccState.getProperty("loopLocations")[p][0]
            break
        }
    }
    //Is the operation already in the list?
    let opIndex = -1
    for (let p = 0; p < opList.length; p++) {
        if (opList[p].op === opToAdd) {
            opIndex = p
            break
        }
    }
    //if this op is already in the list, just add this line number to it
    if (opIndex > -1 && !opList[opIndex].lines.includes(lineno)) {
        opList[opIndex].lines.push(lineno)
        opList[opIndex].lines.sort()
    } else if (opIndex === -1) {
        //otherwise, make a new op object with the line number as the first entry in the lines array
        opList.push({ op: opToAdd, lines: [lineno] })
    }
    return opList
}

// Searches an opList for all entries prior to a specified line.
export function opsBeforeLine(opList: any[], lineNumber: number, funcOrVar: string, funcOrVarObject: any) {
    let opsBefore = [] //initialize return value
    //are we in a function?
    let inFunction = false
    for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (lineNumber >= ccState.getProperty('userFunctionReturns')[u].startLine && lineNumber <= ccState.getProperty('userFunctionReturns')[u].endLine) {
            inFunction = true
        }
    }
    //iterate through the ops list, and count any that occur before the line
    for (let a = 0; a < opList.length; a++) {
        //if we're in a function, and the op occurs before the current line, we can assume it has occurred before this point.
        if (inFunction && opList[a].lines[0] <= lineNumber) {
            opsBefore.push(opList[a].op)
        } else {
            //if we're outside a function, we need the first line NOT in a function.
            let lineOutsideFunction = false
            let line = 0
            while (!lineOutsideFunction && line < opList[a].lines.length) {
                const lineno = opList[a].lines[line]
                let isInside = false
                for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
                    if (lineno >= ccState.getProperty('userFunctionReturns')[u].startLine && 
                        lineno <= ccState.getProperty('userFunctionReturns')[u].endLine) {
                        isInside = true
                        break
                    }
                }
                lineOutsideFunction = !isInside
                line++
            }
            if (lineOutsideFunction) {
                line -= 1
                if (opList[a].lines[line] <= lineNumber) {
                    opsBefore.push(opList[a].op)
                }
            }
        }
    }
    //check other modifying function calls
    if (funcOrVar === "var") {
        //get modifying functions
        let modFuncs = []
        for (let i in funcOrVarObject.modifyingFunctions) {
            //find the function object in userFunctions
            let funcObj = null
            for (let p in ccState.getProperty('userFunctionReturns')) {
                if (ccState.getProperty('userFunctionReturns')[p].startLine != null && 
                    ccState.getProperty('userFunctionReturns')[p].startLine === funcOrVarObject.modifyingFunctions[i][0] && 
                    ccState.getProperty('userFunctionReturns')[p].endLine === funcOrVarObject.modifyingFunctions[i][1]) {
                    funcObj = Object.assign({}, ccState.getProperty('userFunctionReturns')[p])
                    break
                }
            }
            //if it's called before lineNumber, add it to the list [name, [startline, endlline]]
            if (funcObj.callsTo != null && funcObj.callsTo.length > 0) {
                if (funcObj.callsTo[0] >= lineNumber) {
                    modFuncs.push([funcObj.startLine, funcObj.endLine])
                }
            }
        }
        //append any ops within their bounds to opsBefore
        for (let i in opList) {
            if (!opsBefore.includes(opList[i].op)) {
                let isBefore = false
                for (let p in opList[i].lines) {
                    for (let j in modFuncs) {
                        if (opList[i].lines[p] >= modFuncs[j][0] && opList[i].lines[p] <= modFuncs[j][1]) {
                            isBefore = true
                            break
                        }
                    }
                    if (isBefore) {
                        opsBefore.push(opList[i].op)
                        break
                    }
                }
            }
        }
    } else if (funcOrVar === "func") {
        //if any other functions are called within the bounds of this function
        let containedFuncs = []
        for (let i in ccState.getProperty('userFunctionReturns')) {
            if (ccState.getProperty('userFunctionReturns')[i].callsTo != null) {
                for (let p in ccState.getProperty('userFunctionReturns')[i].callsTo) {
                    if (ccState.getProperty('userFunctionReturns')[i].callsTo[p] >= funcOrVarObject.startLine && 
                        ccState.getProperty('userFunctionReturns')[i].callsTo[p] <= funcOrVarObject.endLine) {
                        containedFuncs.push(ccState.getProperty('userFunctionReturns')[i])
                    }
                }
            }
        }
        //append ops from THEIR opslists to opsBefore
        for (let i in containedFuncs) {
            for (let p in containedFuncs[i].opsDone) {
                if (!opsBefore.includes(containedFuncs[i].opsDone[p].op)) {
                    opsBefore.push(containedFuncs[i].opsDone[p].op)
                }
            }
        }
    }
    return opsBefore
}

// AST nodes do not always easliy distinguish between floats and ints.
export function isNodeFloat(node: any) {
    if (node._astname === "Num") {
        const sourceIndex = node.lineno - 1
        //if we're sure it's a float
        if (!Number.isInteger(node.n.v)) {
            return true
        } else {
            //otherwise, we check for a decimal point in the actual line of code.
            const lineString = ccState.getProperty('studentCode')[sourceIndex]
            const valueIndex = node.col_offset
            const valToTrim = lineString.substring(valueIndex)
            let valueString = ""
            for (let t = 0; t < valToTrim.length; t++) {
                if (valToTrim[t] != '.' && valToTrim[t] != '-' && isNaN(parseInt(valToTrim[t]))) {
                    break
                }
                else {
                    valueString += valToTrim[t]
                }
            }
            return valueString.includes('.')
        }
    }
}

// Handles the addition of information about conditional lines to  ccState.getProperty("allConditionals")()
export function notateConditional(node: any) {
    let lastLine = getLastLine(node)
    //fills in a list of lines where else statements for this conditional occur
    function addElse(node: any, elseLineList: number[]) {
        if (node.orelse != null && node.orelse.length > 0) {
            elseLineList.push(node.orelse[0].lineno)
            addElse(node.orelse[0], elseLineList)
        }
    }
    //determines if the conditional in question is inside another conditional
    function findParent(startLine: number, endLine: number, nodeList: any[]) : any {
        let parentNode = null
        for (let i in nodeList) {
            if (nodeList[i].children.length > 0) {
                parentNode = findParent(startLine, endLine, nodeList[i].children)
            }
            if (parentNode == null) {
                if (nodeList[i].start < startLine && nodeList[i].end >= endLine) {
                    parentNode = nodeList[i]
                    break
                }
            }
        }
        return parentNode
    }
    //pushes this conditional's object to its parent's list of children
    function pushParent(child: any, parentStart: number, parentEnd: number, nodeList: any[]) {
        for (let i in nodeList) {
            if (nodeList[i].start === parentStart && nodeList[i].end === parentEnd) {
                nodeList[i].children.push(child);
            } else if (nodeList[i].start <= parentStart && nodeList[i].end >= parentEnd) {
                pushParent(child, parentStart, parentEnd, nodeList[i].children)
                break
            }
        }
    }
    //Have we already marked this exact conditional before?
    function doesAlreadyExist(start: number, end: number, nodeList: any[]) {
        for (let i in nodeList) {
            if (nodeList[i].children.length > 0) {
                if (doesAlreadyExist(start, end, nodeList[i].children)) {
                    return true
                }
            }
            if (nodeList[i].start === start && nodeList[i].end === end) {
                return true
            }
        }
        return false
    }
    //get all orelse locations
    let elseLines : any[] = []
    addElse(node, elseLines)
    elseLines.push(lastLine)
    let newObjects = [{ start: node.lineno, end: elseLines[0], children: [] }]
    for (let i = 1; i < elseLines.length; i++) {
        newObjects.push({ start: elseLines[i], end: elseLines[i + 1], children: [] })
    }
    //is this a child node?
    const isChild = findParent(node.lineno, lastLine, ccState.getProperty("allConditionals"))
    //go through, replacing isChild with the object its a child of if found
    if (isChild != null) {
        for (let i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                pushParent(newObjects[i], isChild.start, isChild.end, ccState.getProperty("allConditionals"))
            }
        }
    } else {
        for (let i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                ccState.getProperty("allConditionals").push(newObjects[i])
            }
        }
    }
}

// Appends one opList array to another. This is a separate function because our opLists have a very specific format.
export function appendOpList(source: any[], target: any[]) {
    for (let a = 0; a < source.length; a++) {
        for (let b = 0; b < source[a].lines.length; b++) {
            target = addOpToList(source[a].op, target, source[a].lines[b])
        }
    }
    return target
}

// Attempts to determine the value of a BinOp object.
export function recursivelyEvaluateBinOp(binOp: any) {
    //evaluate the left
    if (typeof binOp.left === 'string') {
        //then it's a function call, variable, OR we already know what it is
        if (binOp.left.includes(':')) {
            //then it's just the value of a variable or a function return.
            if (binOp.left.includes(':')) {
                //check if it's a var or a func
                if (binOp.left.startsWith("var")) {
                    //it's a variable
                    const varName = binOp.left.split(':')[1]
                    let leftVar = getVariableObject(varName)
                    if (leftVar != null) {
                        // if ( ccState.getProperty("allVariables")[i].containedValue != null && ccState.getProperty("allVariables")[i].containedValue !== "") {
                        if (leftVar.value == "List") {
                            binOp.left = leftVar.containedValue
                        } else {
                            binOp.left = leftVar.value
                        }
                    }
                } else {
                    //it's a function
                    const funcName = binOp.left.split(':')[1]
                    let binOpFunc = getFunctionObject(funcName)
                    if (binOpFunc != null) {
                        if (binOpFunc.returns === "List" && binOpFunc.stringElements != null) {
                            binOp.left = binOpFunc.stringElements[0].elts
                        } else {
                            binOp.left = binOpFunc.returns
                        }
                    }
                }
            }
        }
    } else if (binOp.left != null && typeof binOp.left === 'object' && binOp.left._astname != null && binOp.left._astname === "Subscript") {
        //if the left side is a subscript node
        const newSub =  retrieveFromList(binOp.left)
        if (newSub != null) {
            const newVal = getTypeFromNode(newSub)
            if (newVal !== "") {
                binOp.left = newVal
            }
        }
    } else if (!Array.isArray(binOp.left)) {
        //otherwise, the left node is another binOp object - evaluate that
        binOp.left = recursivelyEvaluateBinOp(binOp.left)
    }
    //evaluate the right
    if (typeof binOp.right === 'string') {
        //then it's a function call, variable, or we already know what it is
        if (binOp.right.includes(':')) {
            if (binOp.right.includes(':')) {
                //check if it's a var or a func
                if (binOp.right.startsWith("var")) {
                    //it's a variable
                    const varName = binOp.right.split(':')[1]
                    const rightVar = getVariableObject(varName)
                    if (rightVar != null) {
                        binOp.right = rightVar.value
                    }
                } else {
                    //it's a function
                    const funcName = binOp.right.split(':')[1]
                    const rightFunc = getFunctionObject(funcName)
                    if (rightFunc != null) {
                        binOp.right = rightFunc.returns
                    }
                }
            }
        }
    } else if (binOp.right != null && typeof binOp.right === 'object' && binOp.right._astname != null && binOp.right._astname === "Subscript") {
        //if the right side is a subscript node
        const newSub =  retrieveFromList(binOp.right)
        if (newSub != null) {
            const newVal = getTypeFromNode(newSub)
            if (newVal !== "") {
                binOp.right = newVal
            }
        }
    } else if (!Array.isArray(binOp.right)) {
        //otherwise, it's a binop object
        binOp.right = recursivelyEvaluateBinOp(binOp.right)
    }
    //then, evaluate if possible
    if (binOp.left === "Str" || binOp.right === "Str") {
        binOp = "Str"
    } else if (binOp.left === "Int" && binOp.right === "Int") {
        binOp = "Int"
    } else if ((binOp.left === "Float" && binOp.right === "Float") || (binOp.left === "Float" && binOp.right === "Int") || (binOp.left === "Int" && binOp.right === "Float")) {
        binOp = "Float"
    } else if (Array.isArray(binOp.left) && Array.isArray(binOp.right)) {
        //get all the contents of lists
        let allListVals = []
        for (let k = 0; k < binOp.left.length; k++) {
            allListVals.push(binOp.left[k])
        }
        for (let k = 0; k < binOp.right.length; k++) {
            allListVals.push(binOp.right[k])
        }
        binOp = allListVals
    }
    return binOp //A BinOp object if values are still unknown, a string if we know what's up.
}

// Gets all types within a boolop, binop, list, or compare node. Returns array of strings.
export function listTypesWithin(node: Node, typesWithin: string[], inputIndexingObj: any, opList: any[]) {
    const thisNode =  retrieveFromList(node)
    if (thisNode != null) {
        if (thisNode._astname === "BinOp") {
            opList =  addOpToList("BinOp", opList, thisNode.lineno)
            //check left and right
            listTypesWithin(thisNode.left, typesWithin, inputIndexingObj, opList)
            listTypesWithin(thisNode.right, typesWithin, inputIndexingObj, opList)
        }
        if (thisNode._astname === "List") {
            typesWithin.push("List")
            //check elements
            for (let listItem = 0; listItem < thisNode.elts.length; listItem++) {
                listTypesWithin(thisNode.elts[listItem], typesWithin, inputIndexingObj, opList)
            }
        }
        if (thisNode._astname === "BoolOp") {
            opList =  addOpToList("BoolOp", opList, thisNode.lineno)
            typesWithin.push("Bool")
            //check values
            for (let boolItem = 0; boolItem < thisNode.values.length; boolItem++) {
                listTypesWithin(thisNode.values[boolItem], typesWithin, inputIndexingObj, opList)
            }
        }
        if (thisNode._astname === "Compare") {
            opList =  addOpToList("Compare", opList, thisNode.lineno)
            typesWithin.push("Bool")
            //check left side
            listTypesWithin(thisNode.left, typesWithin, inputIndexingObj, opList)
            //check comparators
            for (let compareItem = 0; compareItem < thisNode.comparators.length; compareItem++) {
                listTypesWithin(thisNode.comparators[compareItem], typesWithin, inputIndexingObj, opList)
            }
        }
        if (thisNode._astname === "UnaryOp") {
            opList =  addOpToList("BoolOp", opList, thisNode.lineno)
            typesWithin.push("Bool")
            //check operand
            listTypesWithin(thisNode.operand, typesWithin, inputIndexingObj, opList)
        }
        //OR, it's a call, int, float, string, bool, or var
        //bool int, float, str
        if (thisNode._astname === "Num") {
            if (!isNodeFloat(thisNode)) {
                typesWithin.push("Int")
            } else {
                typesWithin.push("Float")
            }
        }
        if (thisNode._astname === "Str") {
            typesWithin.push("Str")
        }
        if (thisNode._astname === "Name" && (thisNode.id.v === "True" || thisNode.id.v === "False")) {
            typesWithin.push("Bool")
        } else if (thisNode._astname === "Name") {
            //variable
            const includedVar = getVariableObject(thisNode.id.v)
            if (includedVar != null && typeof includedVar.value === "string" && includedVar.value !== "" && includedVar.value !== "BinOp") {
                typesWithin.push(includedVar.value)
                for (let c = 0; c < includedVar.containedValue.length; c++) {
                    typesWithin.push(includedVar.containedValue[c])
                }
                opList =  appendOpList(includedVar.opsDone, opList)
                copyAttributes(includedVar.indexAndInput, inputIndexingObj, ["indexed", "strIndexed", "input"])
            }
        }
        //function call
        if (thisNode._astname === "Call") {
            let funcName = ""
            const functionNode = retrieveFromList(thisNode.func)
            if ('attr' in functionNode) {
                funcName = functionNode.attr.v
            }
            if ('id' in functionNode) {
                funcName = functionNode.id.v
            }
            //if it's a listop or strop we have to get types in args
            let isListFunc, isStrFunc = false
            //disambiguation for functions that can go for strings or arrays
            if (ccState.JS_STR_LIST_OVERLAP.includes(funcName) && ccState.getProperty('isJavascript')) {
                const opValType = getTypeFromNode(functionNode.value)
                if (opValType === "List") {
                    isListFunc = true
                } else if (opValType === "Str") {
                    isStrFunc = true
                } else if (opValType === "") {
                    isListFunc = true
                    isStrFunc = true
                }
            }
            //check value
            if (ccState.getProperty('listFuncs').includes(funcName) && !isStrFunc) {
                opList = addOpToList("ListOp", opList, thisNode.lineno)
                listTypesWithin(functionNode.value, typesWithin, inputIndexingObj, opList)
            }
            if (ccState.getProperty('strFuncs').includes(funcName) && !isListFunc) {
                opList = addOpToList("StrOp", opList, thisNode.lineno)
                listTypesWithin(functionNode.value, typesWithin, inputIndexingObj, opList)
            }
            const calledFunc = getFunctionObject(funcName)
            if (calledFunc != null) {
                if (typeof calledFunc.returns === "string") {
                    typesWithin.push(calledFunc.returns)
                }
                if (calledFunc.containedValue != null) {
                    appendArray(calledFunc.containedValue, typesWithin)
                }
                if (calledFunc.opsDone != null) {
                    opList = appendOpList(calledFunc.opsDone, opList)
                }
                if (calledFunc.indexAndInput != null) {
                    copyAttributes(calledFunc.indexAndInput, inputIndexingObj, ["indexed", "strIndexed", "input"])
                }
            }
        }
    }
    return typesWithin
}

// If a BinOp node contains a number of lists, consolidates these into a single array for use in analysis
export function getAllBinOpLists(node: any) {
    function recursivelyGetListValues(node: any, combinedList: any[]) {
        let leftNode = node.left
        let rightNode = node.right
        leftNode = retrieveFromList(leftNode)
        if (leftNode != null) {
            if (leftNode._astname === "BinOp") {
                recursivelyGetListValues(node.left, combinedList)
            }
            if (leftNode._astname === "Name") {
                const variable = getVariableObject(leftNode.id.v)
                if (variable != null) {
                    const eltsToCopy = mostRecentElements(variable, node.lineno)
                    if (eltsToCopy != null) {
                        for (let i = 0; i < eltsToCopy.length; i++) {
                            combinedList.push(eltsToCopy[i])
                        }
                    }
                }
            } else if (leftNode._astname === "Call") {
                let udf = getVariableObject(leftNode.id.v)
                if (udf != null && udf.nodeElements != null) {
                    for (let i = 0; i < udf.nodeElements.length; i++) {
                        combinedList.push(udf.nodeElements[i])
                    }
                }
            } else if (leftNode._astname === "List") {
                for (let i = 0; i < leftNode.elts.length; i++) {
                    combinedList.push(leftNode.elts[i])
                }
            }
        }
        rightNode = retrieveFromList(rightNode)
        if (rightNode != null) {
            if (rightNode._astname === "BinOp") {
                recursivelyGetListValues(node.right, combinedList)
            }
            if (rightNode._astname === "Name") {
                const variable = getVariableObject(rightNode.id.v)
                if (variable != null) {
                    const eltsToCopy = mostRecentElements(variable, node.lineno)
                    if (eltsToCopy != null) {
                        for (let i = 0; i < eltsToCopy.length; i++) {
                            combinedList.push(eltsToCopy[i])
                        }
                    }
                }
            } else if (rightNode._astname === "Call") {
                const udf = getVariableObject(rightNode.id.v)
                if (udf != null) {
                    if (udf.nodeElements != null) {
                        for (let i = 0; i < udf.nodeElements.length; i++) {
                            combinedList.push(udf.nodeElements[i])
                        }
                    }
                }
            } else if (rightNode._astname === "List") {
                for (let i = 0; i < rightNode.elts.length; i++) {
                    combinedList.push(rightNode.elts[i])
                }
            }
        }
        return combinedList
    }
    if (!Array.isArray(recursivelyAnalyzeBinOp(node))) {
        return []
    }
    return recursivelyGetListValues(node, [])
}

// Recursive function to find out what's in a BinOp AST node.
export function recursivelyAnalyzeBinOp(node: any) {
    if (node.left != null && node.left._astname == null) {
        //in case a binop obj gets passed to it by accident
        return  recursivelyEvaluateBinOp(node)
    }
    //return getAllBinOpLists
    let leftNode = node.left
    let rightNode = node.right
    let leftVal = ""
    let rightVal = ""
    //what kind value is on the left?
    leftNode =  retrieveFromList(leftNode)
    if (leftNode != null) {
        if (leftNode._astname === "BinOp") {
            leftVal = recursivelyAnalyzeBinOp(leftNode)
        }
        if (leftNode._astname === "UnaryOp") {
            leftVal = "Bool"
        }
        if (leftNode._astname === "Name") {
            if (leftNode.id.v === "True" || leftNode.id.v === "False") {
                leftVal = "Bool";
            } else {
                const leftVariable = getVariableObject(leftNode.id.v)
                if (leftVariable != null && leftVariable.value !== "" && leftVariable.value !== "BinOp") {
                    leftVal = leftVariable.value
                }
                if (leftVal === "List") {
                    leftVal = mostRecentElements(leftVariable, node.lineno)
                }
                if (leftVariable != null && leftVariable.value === "BinOp") {
                    leftVal = leftVariable.binOp
                }
                if (leftVal == null || leftVal === "") {
                    leftVal = "var:" + leftNode.id.v
                }
            }
        }
        if (leftNode._astname === "Call") {
            leftVal = getCallReturn(leftNode)
            if (leftVal == null && 'id' in leftNode.func) {
                leftVal = "func:" + leftNode.func.id.v
            }
        }
        if (leftNode._astname === "List") {
            leftVal = leftNode.elts
        }
        if (leftNode._astname === "Str") {
            leftVal = "Str"
        }
        if (leftNode._astname === "Num") {
            if (!isNodeFloat(leftNode)) {
                leftVal = "Int"
            } else {
                leftVal = "Float"
            }
        }
        if (leftNode._astname === "Compare" || leftNode._astname === "BoolOp") {
            leftVal = "Bool"
        }
    } else {
        leftVal = node.left
    }
    //what kind of value is on the irght?
    rightNode =  retrieveFromList(rightNode)
    if (rightNode != null) {
        if (rightNode._astname === "BinOp") {
            rightVal = recursivelyAnalyzeBinOp(rightNode)
        }
        if (rightNode._astname === "UnaryOp") {
            rightVal = "Bool"
        }
        if (rightNode._astname === "Name") {
            if (rightNode.id.v === "True" || rightNode.id.v === "False") {
                rightVal = "Bool"
            } else {
                const rightVariable = getVariableObject(rightNode.id.v)
                if (rightVariable != null && rightVariable.value !== "" && rightVariable.value !== "BinOp") {
                    rightVal = rightVariable.value
                }
                if (rightVal === "List") {
                    rightVal = mostRecentElements(rightVariable, node.lineno)
                }
                if (rightVariable != null && rightVariable.value === "BinOp") {
                    rightVal = rightVariable.binOp
                }
                if (rightVal == null || rightVal === "") {
                    rightVal = "var:" + rightNode.id.v
                }
            }
        }
        if (rightNode._astname === "Call") {
            rightVal = getCallReturn(rightNode)
            if (rightVal == null && 'id' in rightNode.func) {
                rightVal = "func:" + rightNode.func.id.v
            }
        }
        if (rightNode._astname === "List") {
            rightVal = rightNode.elts
        }
        if (rightNode._astname === "Str") {
            rightVal = "Str"
        }
        if (rightNode._astname === "Num") {
            if (!isNodeFloat(rightNode)) {
                rightVal = "Int"
            } else {
                rightVal = "Float"
            }
        }
        if (rightNode._astname === "Compare" || rightNode._astname === "BoolOp") {
            rightVal = "Bool"
        }
    } else {
        rightVal = node.right
    }
    //if types match, return a string
    if (typeof leftVal === "string" && typeof rightVal === "string" && leftVal === rightVal && !leftVal.includes(':')) {
        return leftVal
    }
    //if both arrays, return array.
    if (Array.isArray(leftVal) && Array.isArray(rightVal)) {
        return (leftVal.concat(rightVal))
    }
    //otherwise return a binop object //if ANYTHING in it is a string, return string
    if (leftVal === "Str" || rightVal === "Str") {
        return "Str";
    }
    return ({ left: leftVal, right: rightVal });
}

// Helper function for apiCalls accessory output.
export function getArgValuesFromArray(argArray: any[], lineno: number) {
    let returnArray = [];
    for (let i in argArray) {
        let argument =  retrieveFromList(argArray[i])
        let argumentObject : any = {}
        if (argument != null) {
            //first, attempt to get the actual value.
            if (argument._astname === "Name") {
                if (getVariableObject(argument.id.v) != null) {
                    argument = getMostRecentValue(getVariableObject(argument.id.v), lineno)
                } else {
                    argumentObject = argument.id.v
                }
            }
            if (argument != null) {
                if (argument._astname === "Num") {
                    argumentObject = argument.n.v
                } else if (argument._astname === "Str") {
                    argumentObject = argument.s.v
                } else if (argument._astname === "List") {
                    argumentObject = getArgValuesFromArray(argumentObject.elts, lineno)
                }
            }
            //if impossible, fall back to datatype, or leave empty
            if (argumentObject === "") {
                argumentObject = getTypeFromNode(argument)
            }
            returnArray.push(argumentObject)
        }
    }
    return returnArray
}

// Trims comments and leading/trailing whitespace from lines of Python and JS code.
export function trimCommentsAndWhitespace(stringToTrim: string) {
    let returnString = stringToTrim
    //strip out any trailing comments
    //python uses #
    if (!ccState.getProperty('isJavascript') && returnString.includes('#')) {
        let singleQuotes = 0
        let doubleQuotes = 0
        let commentIndex = -1
        for (let s = 0; s < returnString.length; s++) {
            //we use the number of single and double quotes (odd versus even) to determine whether any # or // is actually part of a string and NOT a comment.
            if (returnString[s] === "'") {
                singleQuotes++
            }
            if (returnString[s] === '"') {
                doubleQuotes++
            }
            if (returnString[s] === "#") {
                //we have a #. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    //Javascript uses //
    if (ccState.getProperty('isJavascript') && returnString.includes('//')) {
        let singleQuotes = 0
        let doubleQuotes = 0
        let commentIndex = -1
        for (let s = 0; s < returnString.length; s++) {
            if (returnString[s] === "'") {
                singleQuotes++
            }
            if (returnString[s] === '"') {
                doubleQuotes++
            }
            if (returnString[s] === "/" && s < returnString.length - 1 && returnString[s + 1] === "/") {
                //we have a double slash. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    returnString = returnString.trim()  //then any leading/trailing spaces
    return returnString
}

// Gets the most LIKELY value of a variable object's array of elts, based upon the line of reference.
export function mostRecentElements(variableObj: any, callingLine: number) {
    let inFunction = null
    let correctElts = null
    //check whether the current line is inside or outside of a function declaration
    for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (callingLine >= ccState.getProperty('userFunctionReturns')[u].startLine && callingLine <= ccState.getProperty('userFunctionReturns')[u].endLine) {
            inFunction = [ccState.getProperty('userFunctionReturns')[u].startLine, ccState.getProperty('userFunctionReturns')[u].endLine]
            break
        }
    }
    if (inFunction != null) {
        //check inside the function FIRST
        let furthestLine = -1
        for (let eltsItem = 0; eltsItem < variableObj.nodeElements.length; eltsItem++) {
            if (variableObj.nodeElements[eltsItem].line > inFunction[1] || variableObj.nodeElements[eltsItem].line > callingLine) {
                break
            }
            if (variableObj.nodeElements[eltsItem].line >= inFunction[0]) {
                furthestLine = eltsItem
            }
        }
        if (furthestLine > -1) {
            return variableObj.nodeElements[furthestLine].elts
        }
    }
    //if we haven't returned, OR if we're  not in a function, look for the most recent NOT IN FUNCTION elts.
    let finalElts = null
    for (let eltsItem = 0; eltsItem < variableObj.nodeElements.length; eltsItem++) {
        if (variableObj.nodeElements[eltsItem].line > callingLine) {
            break
        }
        if (variableObj.nodeElements[eltsItem].line <= callingLine) {
            // is it in a function? this only counts if it's NOT in a function
            let isInFunction = false
            for (let udfNumber = 0; udfNumber < ccState.getProperty('userFunctionReturns').length; udfNumber++) {
                if (variableObj.nodeElements[eltsItem].line >= ccState.getProperty('userFunctionReturns')[udfNumber].startLine && variableObj.nodeElements[eltsItem].line <= ccState.getProperty('userFunctionReturns')[udfNumber].endLine) {
                    isInFunction = true
                    break
                }
            }
            if (!isInFunction) {
                finalElts = variableObj.nodeElements[eltsItem].elts
            }
        }
    }
    //return the most likely value
    if (finalElts == null && (variableObj.nodeElements.length > 0)) {
        finalElts = variableObj.nodeElements[0].elts
    }
    return finalElts
}

// Gets the last line in a multiline block of code.
export function getLastLine(functionNode: any) {
    if (!('body' in functionNode) || functionNode.body.length === 0) {
        return functionNode.lineno
    }
    let lastLine : any = getLastLine(functionNode.body[functionNode.body.length - 1])
    if ('orelse' in functionNode && functionNode.orelse.length > 0) {
        const orElseLast = getLastLine(functionNode.orelse[functionNode.orelse.length - 1])
        if (orElseLast > lastLine) {
            lastLine = orElseLast
        }
    }
    return lastLine
}

// Do we know the value of all function returns and variables?
export function allReturnsFilled() {
    let allFilled = true // gets flagged as false if a function return or variable value is not yet known.
    //go through the list of uer-defined functions. if the return value is unknown, flag allFilled to false.
    for (let j = 0; j < ccState.getProperty('userFunctionReturns').length; j++) {
        if (typeof ccState.getProperty('userFunctionReturns')[j].returns != 'string' ||
            ccState.getProperty('userFunctionReturns')[j].returns === "" ||
            ccState.getProperty('userFunctionReturns')[j].returns === "BinOp" ||
            ccState.getProperty('userFunctionReturns')[j].returns === "Subscript") {
            allFilled = false
        }
        if (ccState.getProperty('userFunctionReturns')[j].returns === "List" && ccState.getProperty('userFunctionReturns')[j].containedValue != null) {
            for (let k = 0; k < ccState.getProperty('userFunctionReturns')[j].containedValue.length; k++) {
                if (ccState.getProperty('userFunctionReturns')[j].containedValue[k].includes(':')) {
                    allFilled = false
                    break
                }
            }
        }
        if (allFilled === false) {
            break
        }
    }
    //do the same thing with ccState.getProperty("allVariables")
    for (let j = 0; j < ccState.getProperty("allVariables").length; j++) {
        if (typeof ccState.getProperty("allVariables")[j].value != 'string' || ccState.getProperty("allVariables")[j].value === "" || ccState.getProperty("allVariables")[j].value === "BinOp" || ccState.getProperty("allVariables")[j].value === "Subscript") {
            allFilled = false
        }
        if (ccState.getProperty("allVariables")[j].value === "List" && ccState.getProperty("allVariables")[j].containedValue != null) {
            for (let k = 0; k < ccState.getProperty("allVariables")[j].containedValue.length; k++) {
                if ( ccState.getProperty("allVariables")[j].containedValue[k].includes(':')) {
                    allFilled = false
                    break
                }
            }
            for (let p in ccState.getProperty("allVariables")[j].assignedModified) {
                if (!Array.isArray( ccState.getProperty("allVariables")[j].assignedModified[p].binop) && (typeof ccState.getProperty("allVariables")[j].assignedModified[p].binop !== "string")) {
                    allFilled = false
                }
            }
        }
        if (allFilled === false) {
            break
        }
    }
    return allFilled
}

// Finds Variable object given the variable name. If not found, returns null.
export function getVariableObject(variableName: string) {
    for (let r = 0; r < ccState.getProperty("allVariables").length; r++) {
        if (ccState.getProperty("allVariables")[r].name === variableName) { return ccState.getProperty("allVariables")[r] }
    }
    return null
}

// Find the User Function Return object by the function name. If not found, returns null.
export function getFunctionObject(funcName: string) {
    for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (ccState.getProperty('userFunctionReturns')[u].name === funcName) { return ccState.getProperty('userFunctionReturns')[u] }
    }
    return null
}

// Gets any variable values stored inside any AST node
export function getNestedVariables(nodeToCheck: any, nameList: string[]) {
    function checkNode(nodeComponent: any, nameList: string[]) {
        if (nodeComponent == null) {
            return nameList
        }
        if (nodeComponent._astname === "Name" && nodeComponent.id.v !== "True" && nodeComponent.id.v !== "False" && getVariableObject(nodeComponent.id.v) != null) {
            //if this node represents a variable, add its name to the list
            nameList.push(nodeComponent.id.v)
        }
        if (nodeComponent in ["BinOp", "List", "Compare", "BoolOp", "Subscript"] ||  retrieveFromList(nodeComponent) != nodeComponent) {
            //if it's a BinOp or list, call the parent function recursively.
            getNestedVariables(nodeComponent, nameList)
        }
        return nameList
    }
    //call checkNode() on appropriate parts of nodes that contain other nodes
    if (nodeToCheck._astname === "List") {
        for (let p = 0; p < nodeToCheck.elts.length; p++) {
            checkNode(nodeToCheck.elts[p], nameList)
        }
    } else if (nodeToCheck._astname === "BinOp") {
        checkNode(nodeToCheck.left, nameList)
        checkNode(nodeToCheck.right, nameList)
    } else if (nodeToCheck._astname === "Compare") {
        checkNode(nodeToCheck.left, nameList)
        for (let p = 0; p < nodeToCheck.comparators.length; p++) {
            checkNode(nodeToCheck.comparators[p], nameList)
        }
    } else if (nodeToCheck._astname === "BoolOp") {
        for (let t = 0; t < nodeToCheck.values.length; t++) {
            checkNode(nodeToCheck.values[t], nameList)
        }
    } else if (nodeToCheck._astname === "UnaryOp") {
        checkNode(nodeToCheck.operand, nameList)
    } else if (nodeToCheck._astname === "Subscript") {
        if (nodeToCheck.slice._astname === "Index") {
            checkNode(nodeToCheck.slice.value, nameList)
        } else if (nodeToCheck.slice._astname === "Slice") {
            checkNode(nodeToCheck.slice.upper, nameList)
            checkNode(nodeToCheck.slice.lower, nameList)
        }
        checkNode(nodeToCheck.value, nameList)
    } else if ( retrieveFromList(nodeToCheck) != nodeToCheck) {
        checkNode(nodeToCheck.func.value, nameList)
        if (nodeToCheck.args.length > 0) {
            checkNode(nodeToCheck.args[0], nameList)
        }
    }
    return nameList
}

// Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
export function replaceNumericUnaryOps(ast: any) {
    for (let i in ast) {
        if (ast[i] != null && ast[i]._astname != null) {
            if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) { 
                ast[i] = ast[i].operand
            } else if (ast[i] != null && 'body' in ast[i]) {
                for (let p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p])
                }
            }
            replaceNumericUnaryOps(ast[i])
        }
    }
}

export function lineDict() {
    function fillLevels(nodeList: any[], levelList: any[]) {
        let childNodes = []
        let thisLevel = []
        for (let i in nodeList) {
            if (nodeList[i].children.length > 0) {
                for (let j in nodeList[i].children) {
                    childNodes.push(nodeList[i].children[j])
                }
            }
            thisLevel.push([nodeList[i].start, nodeList[i].end])
        }
        levelList.push(thisLevel)
        if (childNodes.length > 0) {
            fillLevels(childNodes, levelList)
        }
    }
    let lineDictionary = [];
    //initialize array values
    for (let i in ccState.getProperty('studentCode')) {
        let variables : any[] = []
        let calls : any[] = []
        let ifElse : any[] = []
        let userFunction : any[] = []
        lineDictionary.push({ 
            line: Number(i) + 1, 
            variables: variables, 
            loop: 0, 
            calls: calls, 
            ifElse: ifElse, 
            userFunction: userFunction,
            loopStart: 0
        })
    }
    //note every time the user defines a function
    for (let u in ccState.getProperty('userFunctionReturns')) {
        if (ccState.getProperty('userFunctionReturns')[u].startLine != null) {
            const index = ccState.getProperty('userFunctionReturns')[u].startLine - 1
            lineDictionary[index].userFunction = ccState.getProperty('userFunctionReturns')[u]
            let i = index + 1
            while (i < ccState.getProperty('userFunctionReturns')[u].endLine) {
                lineDictionary[i].userFunction = ccState.getProperty('userFunctionReturns')[u]
                i++;
            }
        }
    }
    //note every time a variable is assigned or modified
    for (let v in ccState.getProperty('variableAssignments')) {
        const index = ccState.getProperty('variableAssignments')[v].line - 1
        const variableVal = getVariableObject(ccState.getProperty('variableAssignments')[v].name)
        if (lineDictionary[index] != null) {
            lineDictionary[index].variables.push(variableVal)
        }
    }
    for (let loop in ccState.getProperty("loopLocations")) {
        //track the begin points of each loop
        const index =  ccState.getProperty("loopLocations")[loop][0] - 1;
        lineDictionary[index].loopStart =  ccState.getProperty("loopLocations")[loop]
        //note which lines are in one or more loops
        for (let loopLine = ccState.getProperty("loopLocations")[loop][0] - 1; loopLine <=  ccState.getProperty("loopLocations")[loop][1] - 1; loopLine++) {
            if (lineDictionary[loopLine] != null) {
                lineDictionary[loopLine].loop += 1
            }
        }
    }
    for (let call in ccState.getProperty('allCalls')) {
        const index = ccState.getProperty('allCalls')[call].line - 1
        if (lineDictionary[index] != null) {
            lineDictionary[index].calls.push(ccState.getProperty('allCalls')[call])
        }
    }
    //nested if else statements
    let levels: any[] = []
    fillLevels(ccState.getProperty("allConditionals"), levels)
    //remove overlap in levels
    for (let i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            if (j != levels[i].length - 1) {
                //if it's not the last one, subtract 1 from the end value
                levels[i][j][1] = levels[i][j][1] - 1
            }
        }
    }
    for (let i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            let string = j === 0 ? "if" : "else"
            const start = levels[i][j][0]
            const end = levels[i][j][1]
            for (let p = start; p <= end; p++) {
                lineDictionary[p - 1].ifElse.push(string)
            }
        }
    }
    return lineDictionary
}