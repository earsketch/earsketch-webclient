/**
/**
 *A library of helper functions for the CAI Code Complexity Calculator
 *
 * @module complexityCalculator
 * @author Erin Truesdell
 */
app.factory('complexityCalculatorHelperFunctions', function complexityCalculatorHelperFunctions() {

    //variable init


    /*Appends the values in the source array to the target list.
    * @param source {Array} The source array whose values will be appended
    * @param target {Array} The target array to append the values to
    * @returns the target array with values appended.
    */
    function appendArray(source, target) {
        for (var p = 0; p < source.length; p++) {
            target.push(source[p]);
        }
        return target;
    }


    /*
      Levenshtein function copyright (c) 2011 Andrei Mackenzie
      Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"),
      to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
      and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
      The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
      INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
      IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
      ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      */

    // Compute the edit distance between the two given strings
    function levenshtein(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        var matrix = [];

        // increment along the first column of each row
        var i;
        for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }

        // increment each column in the first row
        var j;
        for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }

        // Fill in the rest of the matrix
        for (i = 1; i <= b.length; i++) {
            for (j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1)); // deletion
                }
            }
        }
        return matrix[b.length][a.length];
    }
    //end Levenshtein function

    /* Copies attributes (except for boolean values set to False) from one object to another, including recursively copying all values from child objects.
    * NOTE: Does NOT reset any boolean values in Target to False. This is intentional
    * @param source - the object whose attributes will be copied
    * @param target - the object to copy the attributes to
    * @param attributesToCopy {Array} - an array of string values containing the names of attributes to be copied.
    */
    function copyAttributes(source, target, attributesToCopy) {
        for (var attr = 0; attr < attributesToCopy.length; attr++) {
            //copy null values
            if (source[attributesToCopy[attr]] == null) {
                target[attributesToCopy[attr]] = null;
            }
            else if (Array.isArray(source[attributesToCopy[attr]])) {
                //copy array values
                target[attributesToCopy[attr]] = appendArray(source[attributesToCopy[attr]], []);
            }
            //copy all non-false, non-object values
            else if (source[attributesToCopy[attr]] !== false || target[attributesToCopy[attr]] == null) {
                target[attributesToCopy[attr]] = source[attributesToCopy[attr]];
            }
            //copy properties of child objects recursively
            else if (typeof source[attributesToCopy[attr]] === "object") {
                var copiedObj = {};
                var attrsToCopy = [];

                for (var at in source[attributesToCopy[attr]]) {
                    attrsToCopy.push(at);
                }

                copyAttributes(source[attributesToCopy[attr]], copiedObj, attrsToCopy);
                target[attributesToCopy[attr]] = copiedObj;
            }
        }
    }


    /* Determines whether the edit distance between two lines is greater than a given threshold.
    * @param lineA - the line to check
    * @param lineB - the line to check lineA against
    * @param editThreshold {int} The minimum number of edits required before a line is considered unique.
    * @returns true if the lines are too similar (edit distance < edit threshold), false otherwise
    */
    function checkForMatch(lineA, lineB, editThreshold) {
        if (editThreshold === 0) {
            if (lineA === lineB) {
                return true;
            }
            else return false;
        }
        else {
            var editDistance =  levenshtein(lineA, lineB);
            if (editDistance >= editThreshold) {
                return false;
            }
            else return true;
        }
    }

    /* Determines what type of value is described by an AST node
    * @param node - the node in question
    * @returns String value describing datatype.
    */
    function getTypeFromNode(node) {
        node = retrieveFromList(node);


        if (node == null) {
            return ""; //return empty if we can't compute a type
        }
        else if (node._astname === "UnaryOp") {  //the only unary op we should see is "not _____" so we can assume this is a boolean value
            return "Bool";
        }
        else if (node._astname === "Call") {
            return getCallReturn(node);
        }
        else if (node._astname === "Str" || node._astname === "List") {
            return node._astname;
        }
        else if (node._astname === "Num") {
            if (!isNodeFloat(node)) {
                return "Int";
            }
            else return "Float";
        }
        else if (node._astname === "Name") {
            if (node.id.v === "True" || node.id.v === "False") {
                return "Bool";
            }
            else if ( getVariableObject(node.id.v) != null) {
                return  getVariableObject(node.id.v).value;
            }
        }
        else if (node._astname === "BinOp") {
            var binOpValue = recursivelyAnalyzeBinOp(node);
            if (typeof binOpValue === "string") {
                return binOpValue;
            }
            else if (Array.isArray(binOpValue)) {
                return "List";
            }
        }
        else if (node._astname === "BoolOp" || node._astname === "Compare") {
            return "Bool";
        }
        return "";
    }

    /* If an AST node retrieves a value from a list (by indexing or list.pop()), returns the node being retrieved
    * @param callingNode - the node to return or retrieve from
    * @returns an AST node - either the node retrieved from a list, or the original node (if it's not s subscript/call to list.pop())
    */
    function retrieveFromList(callingNode) {
        //Gets the node referenced by an AST subscript node. (OR an array of nodes, if the subscript is a slice instead of index) WHAT IF WE THROW A STRING AT IT???
        function getSubscriptValue(subscriptNodeToGet) {
            var subscriptNode = subscriptNodeToGet;

            if (subscriptNode.slice._astname === "Index") { //handle singular indices
                var indexValue = 0;
                var objToIndex;
                var valObj = retrieveFromList(subscriptNode.value);

                //what index are we retrieving?
                if ("n" in subscriptNode.slice.value) {
                    indexValue = subscriptNode.slice.value.n.v;
                }
                else if (subscriptNode.slice.value._astname == "Name" &&  getVariableObject(subscriptNode.slice.value.id.v) != null) {
                    indexValue = getMostRecentValue( getVariableObject(subscriptNode.slice.value.id.v), subscriptNode.lineno);
                    if (indexValue == null) {
                        return null;
                    }
                }

                //what list/array are we retrieving from?
                if (valObj != null) {
                    if (subscriptNode.value._astname === "List") {
                        objToIndex = valObj.elts;
                    }
                    if (valObj._astname === "BinOp") {
                        objToIndex = getAllBinOpLists(subscriptNode.value);
                    }
                    if (valObj._astname === "Call") {
                        if (doesCallCreateList(valObj)) {
                            objToIndex = performListOp(valObj)[0];
                        }
                        else {
                            if ( getFunctionObject(valObj.func.id.v) != null) {
                                var callItem =  getFunctionObject(valObj.func.id.v);
                                if (callItem.nodeElements != null && callItem.nodeElements[0] != null) {
                                    var callElts = callItem.nodeElements[0].elts;
                                    if (callElts != null) {
                                        objToIndex = callElts.slice(0);
                                    }
                                }
                            }
                        }
                    }
                    if (valObj._astname === "Name") {
                        var variable =  getVariableObject(valObj.id.v);
                        if (variable != null) {
                            objToIndex = mostRecentElements(variable, subscriptNodeToGet.lineno);
                        }
                    }
                }

                //get the object at the given index and return it.
                if (objToIndex != null) {
                    if (indexValue < 0) {
                        indexValue += objToIndex.length;
                    }
                    var returnObj = retrieveFromList(objToIndex[indexValue]);
                    return returnObj;
                }

                if (valObj != null && 'id' in valObj) {
                    return null;
                } //if we don't know what it is we're indexing, just return
            }


            else if (subscriptNode.slice._astname === "Slice") { //handle slices
                var lower = null;
                var upper = null;

                var lowerNode = retrieveFromList(subscriptNode.slice.lower);
                var upperNode = retrieveFromList(subscriptNode.slice.upper);

                //get the lower bound for the slice
                if (lowerNode != null && lowerNode._astname === "Num") {
                    lower = lowerNode.n.v;
                }
                else if (lowerNode != null && lowerNode._astname == "Name" &&  getVariableObject(lowerNode.id.v) != null) {
                    lower = getMostRecentValue( getVariableObject(lowerNode.id.v));
                }

                //get the upper bound for the slice
                if (upperNode != null && upperNode._astname === "Num") {
                    upper = upperNode.n.v;
                }
                else if (upperNode != null && upperNode._astname == "Name" &&  getVariableObject(upperNode.id.v) != null) {
                    upper = getMostRecentValue( getVariableObject(upperNode.id.v));
                }

                //get the list/array that we are slicing
                var nodeValue = retrieveFromList(subscriptNode.value);
                if (nodeValue._astname === "List") {
                    nodeValue = nodeValue.elts;
                }
                if (nodeValue._astname === "BinOp") {
                    nodeValue = getAllBinOpLists(nodeValue);
                }
                if (nodeValue._astname === "Call") {
                    if (doesCallCreateList(nodeValue)) {
                        nodeValue = performListOp(nodeValue)[0];
                    }
                    else {
                        var call =  getFunctionObject(nodeValue.func.id.v)
                        if (call != null && call.nodeElements != null && call.nodeElements.length > 0) {
                            nodeValue = call.nodeElements[0].elts;
                        }
                    }
                }
                if (nodeValue._astname === "Name") {
                    var variable =  getVariableObject(nodeValue.id.v);
                    if (variable != null) {
                        var varElts = mostRecentElements(variable, subscriptNodeToGet.lineno);
                        if (varElts != null) {
                            nodeValue = varElts.slice(0);
                        }
                    }
                }

                //set upper and lower bounds to default values if they are unknown
                if (nodeValue != null && Array.isArray(nodeValue)) {
                    if (lower == null) {
                        lower = 0;
                    }
                    if (upper == null) {
                        upper = nodeValue.length - 1;
                    }
                    if (lower < 0) {
                        lower += nodeValue.length;
                    }
                    if (upper < 0) {
                        upper += nodeValue.length;
                    }
                    if (lower != null && upper != null) {
                        //slice the array of nodes and return a fake list node repsenting the result
                        return {
                            _astname: "List",
                            elts: nodeValue.slice(lower, upper)
                        };
                    }
                }

                //if we can't compute a slice or index, return null
                else if (nodeValue != null && 'id' in nodeValue) {
                    return null;
                }
                else if (nodeValue != null && 'func' in nodeValue && 'id' in nodeValue.func) {
                    return null;
                }
            }
            return null;
        }

        //Helper function: is this a node that requires list retrieval?
        function doesNodeRetrieveFromList(callingNode) {
            if (callingNode != null) {
                if (callingNode._astname === "Call" && 'func' in callingNode && 'attr' in callingNode.func && (callingNode.func.attr.v === "pop" || callingNode.func.attr.v === "choice")) {
                    return true;
                }
                else if (callingNode._astname === "Call" && 'func' in callingNode && 'id' in callingNode.func && (callingNode.func.id.v === "min" || callingNode.func.id.v === "max")) {
                    return true;
                }
            }
            return false;
        }


        //the bulk of the retrieval function
        if (!doesNodeRetrieveFromList(callingNode)) {
            //if the node DOESN't require retrieval or subscripting, just return the original node.
            if (callingNode != null && callingNode._astname === "Subscript") {
                return getSubscriptValue(callingNode);
            }
            else return callingNode;
        }
        else {

            //handling for pop()
            if (callingNode._astname === "Call" && 'func' in callingNode && 'attr' in callingNode.func && (callingNode.func.attr.v === "pop")) {
                var listToUse = [];
                var calledValue = retrieveFromList(callingNode.func.value);
                var thisLine = callingNode.lineno;


                //get the list we're retrieving from
                if (calledValue._astname === "Name") {
                    var variable =  getVariableObject(calledValue.id.v);

                    if (variable != null) {
                        var correctElts = mostRecentElements(variable, thisLine - 1);
                        if (correctElts != null) {
                            listToUse = correctElts.slice(0);
                        }
                    }
                }
                else if (calledValue._astname === "Call") {  //it's either a UDF or another listop
                    listToUse = retrieveFromList(calledValue).elts;
                    if (doesCallCreateList(calledValue)) {
                        listToUse = performListOp(calledValue)[0];
                    }
                    else if ('id' in calledValue.func) {
                        var funcObject =  getFunctionObject(calledValue.func.id.v);

                        if (funcObject != null && funcObject.nodeElements != null && funcObject.nodeElements.length > 0) {
                            listToUse = funcObject.nodeElements[0].elts.slice(0);
                        }
                    }
                }
                else if (calledValue._astname === "List") {
                    listToUse = calledValue.elts.slice(0);
                }
                else if (calledValue._astname === "BinOp") {
                    listToUse = getAllBinOpLists(calledValue);
                }

                var popLocation = listToUse.length - 1;


                //if no argument is provided, default to the end of the array
                if (callingNode.args.length > 0) {
                    popLocation = callingNode.args[0].n.v;
                }

                return retrieveFromList(listToUse[popLocation]); //nested in case the popped value also requires list retrieval
            }

            //handling for array/list min/max/choice functions
            else if ((callingNode._astname === "Call" && 'func' in callingNode && 'id' in callingNode.func && (callingNode.func.id.v === "min" || callingNode.func.id.v === "max")) || callingNode._astname === "Call" && 'func' in callingNode && 'attr' in callingNode.func && (callingNode.func.attr.v === "choice")) {
                var listToUse = [];
                var calledValue = retrieveFromList(callingNode.args[0]);
                if (calledValue != null) {
                    if (calledValue._astname === "Name") {
                        var variable =  getVariableObject(calledValue.id.v);

                        if (variable != null) {
                            var mostRecentElts = mostRecentElements(variable, callingNode.lineno - 1);
                            if (mostRecentElts != null) {
                                listToUse = mostRecentElts.slice(0);
                            }
                        }
                        return null;
                    }
                    else if (calledValue._astname === "Call") { //it's either a UDF or another listop.
                        var calledFunc = retrieveFromList(calledValue.func);
                        if (doesCallCreateList(calledValue)) {
                            listToUse = performListOp(calledValue)[0];
                        }
                        else if ('id' in calledFunc) {
                            var funcObject =  getFunctionObject(calledFunc.id.v);
                            if (funcObject != null && funcObject.nodeElements != null && funcObject.nodeElements.length > 0) {
                                listToUse = funcObject.nodeElements[0].elts.slice(0);
                            }
                        }
                    }
                    else if (calledValue._astname === "List") {
                        listToUse = calledValue.elts;
                    }
                    else if (calledValue._astname === "BinOp") {
                        listToUse = getAllBinOpLists(calledValue);
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
                        })[0];

                        if (callingNode.func.id.v === "max") {
                            listToUse.reverse();
                        }
                    }

                    return listToUse[0];

                }

                else return null;
            }
        }
    }


    /*Converts an array of AST nodes to an array of strings that indicate the datatype represented by the node.
    * @param nodeElements - An array of AST node objects
    * @param thisLine - the line location in the python/JS code from where this is being called
    *   (done bc datatypes in variables may change at different points in the code)
    * @returns - Returns array of strings.
    */
    function nodesToStrings(nodeElements, thisLine) {
        var stringElementsToReturn = [];

        for (var i = 0; i < nodeElements.length; i++) {

            var nextElt = getTypeFromNode(nodeElements[i]);

            //if it's null, just push an empty string
            if (nextElt == null) {
                stringElementsToReturn.push("");

            }

            //if the item is a list, create an array of whatever is in THAT list by recursively calling this function.
            else if (nextElt === "List") {
                var listVal = retrieveFromList(nodeElements[i]);

                if (listVal._astname === "List") {
                    nextElt = nodesToStrings(nodeElements[i].elts, thisLine);
                }

                else if (listVal._astname === "BinOp") {
                    nextElt = nodesToStrings(getAllBinOpLists(nodeElements[i]));
                }

                else if (listVal._astname === "Call") {
                    listFunc = retrieveFromList(listVal.func);
                    if ('id' in listFunc) {
                        var calledFunc =  getFunctionObject(listVal.func.id);
                        if (calledFunc != null && calledFunc.nodeElements != null && calledFunc.nodeElements.length > 0) {
                            stringElementsToReturn.push(nodesToStrings(calledFunc.nodeElements[0].elts, thisLine));
                        }
                    }
                    else if (doesCallCreateList(listFunc)) {
                        stringElementsToReturn.push(nodesToStrings(performListOp(listVal), thisLine));
                    }
                }

                else if (listVal._astname === "Name") {
                    var listVar =  getVariableObject(listVal.id.v);

                    if (listVar != null) {
                        stringElementsToReturn.push(nodesToStrings(mostRecentElements(listVar, thisLine), thisLine));
                    }
                }
            }
            //if we know what's in the node, just push that to the array and move on
            else {
                stringElementsToReturn.push(nextElt);
            }
        }
        return stringElementsToReturn;
    }


    /* Determines what kind of value is returned by a call to Number()
    * @param callingNode - the AST node representing the call
    * @returns "Float" or "Int," dependent upon return type
    */
    function getNumberCallReturn(callingNode) {
        //if it's not a function call at all, return.
        if (callingNode._astname != "Call") {
            return;
        }

        //get the function name
        var calledFunc = retrieveFromList(callingNode.func);
        var functionName = "";
        if ('id' in calledFunc) {
            functionName = calledFunc.id.v;
        }

        if (functionName === "Number") { //If it's not a call to Number(), we can skip and return nothing.
            if (callingNode.args[0] != null) {
                var firstArg = retrieveFromList(callingNode.args[0]);

                //If it's a string, just call Number() here and return the result of the output ("Float" or "Int")
                if (firstArg != null && firstArg._astname === "Str") {
                    if (Number.isInteger(Number(firstArg.s.v))) {
                        return "Int";
                    }
                    else return "Float";
                }

                if (firstArg != null && firstArg._astname === "Name") {
                    if (firstArg.id.v === "None") {
                        return "Int";
                    }

                    var isVar =  getVariableObject(firstArg.id.v);
                    //if string we actually can do this since we store an assignedModified value.
                    //Try Number() on the most recent value of the variable
                    if (isVar != null && isVar.value === "Str") {
                        var currentValue = retrieveFromList(getMostRecentValue(isVar, callingNode.lineno));
                        if (currentValue != null && currentValue._astname === "Str") {

                            if (Number.isInteger(Number(currentValue.s.v))) {
                                return "Int";
                            }
                            else return "Float";
                        }
                    }
                }
            }
        }
        return ""; //fall-through
    }


    /* Returns the value returned by a function call
    * @param callingNode - the node representing the function call
    * @returns string of type unless the call returns a list, in which case an array of AST nodes is returned
    */
    function getCallReturn(callingNode) {
        if (callingNode._astname === "Call") { //just return null if this is the wrong kind of node.


            //if the call creates a string or list
            if (doesCallCreateString(callingNode)) {
                return "Str";
            }
            if (doesCallCreateList(callingNode)) {
                return performListOp(callingNode)[0];
            }

            //otherwise, let's see what the function is
            callingNode.func = retrieveFromList(callingNode.func);
            var functionName = "";
            if ('id' in callingNode.func) {
                functionName = callingNode.func.id.v;
            }
            if ('attr' in callingNode.func) {
                functionName = callingNode.func.attr.v;
            }

            //special case for Number()
            if (functionName === "Number") {
                return getNumberCallReturn(callingNode);
            }

            //check through our list of function returns. If we know the return type, return that here.
            var functionCalled =  getFunctionObject(functionName);

            if (functionCalled != null) {
                if (functionCalled.returns === "List" && functionCalled.nodeElements != null && functionCalled.nodeElements.length > 0) {
                    return functionCalled.nodeElements[0].elts;
                }
                else if (functionCalled.returns === "BinOp") {
                    return null;
                }
                else return functionCalled.returns;
            }
        }
        return null;
    }


    /* Get the most recent assigned value of a variable
    * @param variableObj - the allVariables item representing the variable
    * @lineno - the line number from which we are inquiring - needed because variable values change over time
    * @returns AST node representing the most likely most recent value assigned to this variable
    */
    function getMostRecentValue(variableObject, lineno) {
        var inFunction = null;   //step 1. are we in a function?
        var returnVal = null;
        for (var u = 0; u < userFunctionReturns.length; u++) {
            if (lineno >= userFunctionReturns[u].startLine && lineno <= userFunctionReturns[u].endLine) {
                inFunction = [userFunctionReturns[u].startLine, userFunctionReturns[u].endLine];
                break;
            }
        }

        if (inFunction != null) {   //check inside the function FIRST
            var furthestLine = -1;
            for (var amItem = 0; amItem < variableObject.assignedModified.length; amItem++) {
                if (variableObject.assignedModified[amItem].line > inFunction[1] || variableObject.assignedModified[amItem].line > lineno) {
                    break;
                }
                if (variableObject.assignedModified[amItem].line >= inFunction[0]) {
                    furthestLine = amItem;
                }
            }
            if (furthestLine > -1) {
                return variableObject.assignedModified[furthestLine].nodeValue;
            }
        }

        //if we haven't returned, OR if we're  not in a function, look for the most recent NOT IN FUNCTION elts.
        for (var amItem = 0; amItem < variableObject.assignedModified.length; amItem++) {
            if (variableObject.assignedModified[amItem].line > lineno) {
                break;
            }

            if (variableObject.assignedModified[amItem].line <= lineno) {
                // is it in a function? this only counts if it's NOT in a function
                var isInFunction = false;
                for (var udfNumber = 0; udfNumber < userFunctionReturns.length; udfNumber++) {
                    if (variableObject.assignedModified[amItem].line >= userFunctionReturns[udfNumber].startLine && variableObject.assignedModified[amItem].line <= userFunctionReturns[udfNumber].endLine) {
                        isInFunction = true;
                        break;
                    }
                }
                if (!isInFunction) {
                    returnVal = variableObject.assignedModified[amItem].nodeValue;
                }
            }
        }

        //if we still don't know what it is, just use the first assigned value.
        if (returnVal == null && (variableObject.assignedModified.length > 0)) {
            returnVal = variableObject.assignedModified[0].nodeValue;
        }

        //if the most recent value is that of another variable, fund the most recent value of THAT variable
        if (returnVal != null && returnVal._astname === "Name" &&  getVariableObject(returnVal.id.v) != null) {
            returnVal = getMostRecentValue( getVariableObject(returnVal.id.v), lineno);
        }

        return returnVal;
    }

  
    /*determines whether or not two AST nodes contain the same value.
    *Used when performListOp() is performing a removal
    * @param astnode1, astnode2 - the AST node objects to compare
    * @returns True if the nodes have the same value; false otherwise
    *
    */
    function doAstNodesMatch(astnode1, astnode2) {
        var matchingAstName = astnode1._astname;


        if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
            //the two nodes reference the same variable or function
            return true;
        }

        if (astnode1._astname != astnode2._astname) {
            //if they're not the same variable but they ARE the same value
            //(ex., a variable whose value is 5 and and integeere whose value is 5)
            //register this as a match
            if (astnode1._astname === "Name" || astnode2._astname === "Name") {  //if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
                var val1 = astnode1;
                var val2 = astnode2;
                if (astnode1._astname === "Name") {
                    var varObj =  getVariableObject(astNode1.id.v);
                    if (varObj == null) {
                        return false;
                    }
                    else { val1 = getMostRecentValue(varObj, astNode1.lineno); }
                }
                if (_astnode2._astname === "Name") {
                    var varObj =  getVariableObject(astNode2.id.v);
                    if (varObj == null) {
                        return false;
                    }
                    else { val2 = getMostRecentValue(varObj, astNode2.lineno); }
                }
                return (doAstNodesMatch(val1, val2));
            }
            return false;
        }

        //if it's a UnaryOp, we should see if the operands match
        //this isn't exact but works for our purposes
        if (matchingAstName === "UnaryOp") {
            return doAstNodesMatch(astnode1.operand, astnode2.operand);
        }

        //if two lists, check that the elements all match
        if (matchingAstName === "List") {
            if (astnode1.elts.length != astnode2.elts.length) {
                return false;
            }

            else {
                for (var e = 0; e < astnode1.elts.length; e++) {
                    if (!(doAstNodesMatch(astnode1.elts[e], astnode2.elts[e]))) {
                        return false;
                    }
                }
                return true;
            }
        }

        //We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        else if (matchingAstName === "Call") {

            var args1 = [];
            var args2 = [];

            var funcNode1 = retrieveFromList(astnode1.func);
            var funcNode2 = retrieveFromList(astnode2.func);

            //for list ops and string ops
            if ('attr' in funcNode1) {
                if (!('attr' in funcNode2)) {
                    return false
                }
                else {
                    if (funcNode1.attr.v != funcNode2.attr.v) {
                        return false;
                    }
                    args1 = funcNode1.args;
                    args2 = funcNode2.args;
                }
            }

            //for all other function types
            else if ('id' in funcNode1) {
                if (!('id' in funcNode2)) {
                    return false
                }
                else {
                    if (funcNode1.id.v != funcNode2.id.v) {
                        return false;
                    }
                    args1 = funcNode1.args;
                    args2 = funcNode2.args;
                }
            }

            //do the arguments match?
            if (args1.length != args2.length) {
                return false;
            }
            for (var a = 0; a < args1.length; a++) {
                if (!doAstNodesMatch(args1[a], args2[a])) {
                    return false;
                }
            }
            return true;
        }

        //numerical values must match
        else if (matchingAstName === "Num") {
            if (astnode1.n.v !== astnode2.n.v) {
                return false;
            }
            else return true;
        }

        //ditto for strings
        else if (matchingAstName === "Str") {
            if (astnode1.s.v !== astnode2.s.v) {
                return false;
            }
            else return true;
        }

    }



    /*performs a list operation & returns an array of AST nodes in the proper order, if appropriate
    * @param callingNode - the "Call" AST node representing the list op to be performed
    * @returns An array of AST nodes representing the output of the list op.
    */
    function performListOp(callingNode) {

        //check the language, and call the appropriate listop function
        //python and javascript handle str/listops a little differently,
        //so we must differentiate as well
        if (!isJavascript) {
            return pythonOp(callingNode);
        }
        else return jsOp(callingNode);

        //JS list ops
        function jsOp(callingNode) {
            //variable init
            var opToPerform = null;
            var listToUse = [];
            var stringElements = [];
            var variableOrFuncIndex = -1;
            var isVariable = false;
            var isFunc = false;

            //first, determine what operation we need to perform
            if ('func' in callingNode && 'attr' in callingNode.func) {
                opToPerform = callingNode.func.attr.v;
            }


            //find the array we'll be performing it on

            //if variable, find most recent list of elements
            if (callingNode.func.value._astname === "Name") {
                var variable =  getVariableObject(callingNode.func.value.id.v);
                if (variable != null) {
                    var correctElts = mostRecentElements(variable, callingNode.lineno);
                    if (correctElts != null) {
                        listToUse = correctElts.slice(0);
                    }
                }
            }

            //if a function call, find the stored elements list
            else if (callingNode.func.value._astname === "Call") {
                if (doesCallCreateList(callingNode.func.value)) {
                    listToUse = performListOp(callingNode.func.value, false)[0];
                }
                else if (retrieveFromList(callingNode.func.value) != callingNode.func.value) {
                    listToUse = retrieveFromList(callingNode.func.value).elts;
                }
                else if ('id' in callingNode.func.value.func &&  getFunctionObject(callingNode.func.value.func.id.v) != null) {
                    isFunc = true;
                    var variable =  getVariableObject(callingNode.func.value.id.v);
                    if (variable != null) {
                        var correctElts = mostRecentElements(variable, callingNode.lineno);
                        if (correctElts != null) {
                            listToUse = correctElts.slice(0);
                        }
                    }
                }
            }

            //if it's a list or binop node, get the values inside
            else if (callingNode.func.value._astname === "List") {
                listToUse = callingNode.func.value.elts;
            }
            else if (callingNode.func.value._astname === "BinOp") {
                listToUse = getAllBinOpLists(callingNode.func.value);
            }

            //I don't think we actually need this
            //else if ('func' in callingNode && 'id' in callingNode.func) {
            //    opToPerform = callingNode.func.id.v;
            //}


            //if we don't know what array to use, return empty
            if (listToUse == null) {
                return [[], []];
            }

            //perform the called operation.
            if (opToPerform != null) {

                //Concatenation
                if (opToPerform === "concat") {

                    //get the list of values to be appended to the list
                    var listToAppend = [];
                    if (callingNode.args[0]._astname === "List") {
                        listToAppend = callingNode.args[0].elts;
                    }
                    else if (callingNode.args[0]._astname === "Name") {
                        var varVal =  getVariableObject(callingNode.args[0].id.v);
                        if (varVal != null) {
                            listToAppend = mostRecentElements(varVal, callingNode.lineno);
                        }
                    }
                    else if (callingNode.args[0]._astname === "Call") {
                        if (doesCallCreateList(callingNode.args[0])) {
                            listToAppend = performListOp(callingNode.args[0]);
                        }
                        else if ('id' in callingNode.args[0].func) {
                            var funcReturn =  getFunctionObject(callingNode.args[0].func.id.v);
                            if (funcReturn != null && funcReturn.nodeElements != null && funcReturn.nodeElements.length > 0) {
                                listToAppend = funcReturn.nodeElements[0].elts;
                            }
                        }
                    }

                    //if nothing, keep the list the same and return accordingly
                    if (listToAppend != null && listToAppend.length === 0) {
                        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                    }

                    else if (listToAppend != null) {
                        //perform the concatenation and return the result
                        listToUse.concat(listToAppend);
                        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                    }
                }

                //copyWithin
                if (opToPerform === "copyWithin") {
                    var targetVal = 0;
                    var startVal = 0;
                    var endVal = listToUse.length;

                    var targetNode = retrieveFromList(callingNode.args[0]);

                    //get the start, end, and target values for the copyWithin
                    if (targetNode._astname === "Name" &&  getVariableObject(targetNode.id.v) != null) {
                        targetNode = getMostRecentValue( getVariableObject(targetNode.id.v), callingNode.lineno);
                    }
                    if (targetNode._astname === "Num") {
                        targetVal = targetNode.n.v;
                    }


                    if (callingNode.args.length > 1) {
                        var startNode = retrieveFromList(callingNode.args[1]);
                        if (startNode != null && startNode._astname === "Num") {
                            startVal = startNode.n.v;
                        }
                        else if (startNode._astname === "Name" &&  getVariableObject(startNode.id.v) != null &&  getVariableObject(startNode.id.v) === "Int") {
                            startVal = getMostRecentValue( getVariableObject(startNode.id.v), callingNode.lineno);
                        }
                    }
                    if (callingNode.args.length > 2) {
                        var endNode = retrieveFromList(callingNode.args[2]);
                        if (endNode != null && endNode._astname === "Num") {
                            endVal = endNode.n.v;
                        }
                        else if (endNode._astname === "Name" &&  getVariableObject(endNode.id.v) != null &&  getVariableObject(endNode.id.v) === "Int") {
                            endVal = getMostRecentValue( getVariableObject(endNode.id.v), callingNode.lineno);
                        }
                    }

                    //get the nodes to be copied
                    sliceToCopy = listToUse.slice(startVal, endVal);

                    var newList = [];

                    //create the new array
                    for (var i = 0; i < targetVal; i++) {
                        newList.push(listToUse[i]);
                    }
                    for (var j = 0; j < sliceToCopy.length; j++) {
                        if (j === listToUse.length) {
                            break;
                        }
                        newList.push(sliceToCopy[j]);
                    }
                    for (var k = newList.length; k < listToUse.length; k++) {
                        newList.push(listToUse[k]);
                    }

                    //return the modified array
                    return [newList, nodesToStrings(newList, callingNode.lineno)];
                }

                //fill
                if (opToPerform === "fill") {
                    //get the node to fill the array with
                    var fillItem = retrieveFromList(callingNode.args[0]);

                    //fill the array with that node
                    if (fillItem != null) {
                        var returnList = [];
                        for (var i = 0; i < listToUse.length; i++) {
                            returnList.push(fillItem);
                        }
                    }
                    //return output
                    return [returnList, nodesToStrings(returnList)];
                }

                if (opToPerform === "filter") {
                    //it's probably wise to not try to do this and instead just return the same list.
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }

                if (opToPerform === "keys") {
                    //create new arrays for the fake key nodes and their types
                    var emptyArray = [];
                    var strArray = [];

                    //make an array of fake integer nodes
                    for (var i in listToUse) {
                        fakeNode = { _astname: "Num", lineno: callingNode.lineno, n: { lineno: callingNode.lineno, v: i } };
                        emptyArray.push(fakeNode);
                        strArray.push("Int");
                    }

                    //return the array of fake nodes and the array of "Int" (for stringElements)
                    return [emptyArray, strArray];
                }

                //map
                if (opToPerform === "map") {
                    //lookup return of called function
                    //called function is EITHER a name OR a functionexp
                    var fakeList = [];
                    var fakeElts = [];

                    var mapFuncName = null;
                    var funcNode = retrieveFromList(callingNode.args[0]);

                    //get the name of the function to use in map()
                    if (funcNode._astname === "Name") {
                        mapFuncName = funcNode.id.v;
                    }
                    else if (funcNode._astname === "FunctionExp") {
                        mapFuncName = "" + funcNode.lineno + "|" + funcNode.col_offset;
                    }

                    //find what kind of value it returns
                    var thisReturn =  getFunctionObject(mapFuncName);

                    //create a fake node whose value will represent the returned value
                    var returnedValue = {};
                    returnedValue.lineno = callingNode.lineno;


                    if (thisReturn != null) {
                        if (thisReturn.returns === "Int" || thisReturn.returns === "Float") {
                            returnedValue._astname = "Num";
                            if (thisReturn.returns === "Int") {
                                //filler values so this gets correctly picked up in any later references
                                returnedValue.n = { v: 1 };
                            }
                            else {
                                returnedValue.n = { v: 1.15 };
                            }
                        }
                        if (thisReturn.returns === "Str") {
                            returnedValue._astname === "Str";
                        }
                        if (thisReturn.returns === "List") {
                            returnedValue._astname = "List";
                            if (thisReturn.nodeElements != null && thisReturn.nodeElements.length > 0) {
                                returnedValue.elts = thisReturn.nodeElements[0].elts;
                            }
                        }
                        if (thisReturn.returns === "Bool") {
                            returnedValue._astname === "Name";
                            returnedValue.id = { v: "True" };
                        }

                        if (thisReturn.returns === "BinOp") {
                            returnedValue.left = thisReturn.binOp.left;
                            returnedValue.right = thisReturn.binOp.right;
                        }

                        //fill the empty array with fake nodes
                        for (var i in listToUse) {
                            fakeList.push(returnedValue);
                            fakeElts.push(thisReturn.returns);
                        }
                        return [fakeList, fakeElts];
                    }
                    else {
                        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                    }

                }

                //return the list with the last item removed
                if (opToPerform === "pop") {
                    listToUse.splice(listToUse.length - 1, 1);
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }

                //push the passed node
                if (opToPerform === "push") {
                    var pushArg = retrieveFromList(callingNode.args[0]);
                    if (pushArg != null) {
                        var returnList = listToUse.slice(0);
                        returnList.push(pushArg);
                        return [returnList, nodesToStrings(returnList, callingNode.lineno)];
                    }
                }

                //reverse
                if (opToPerform === "reverse") {
                    var returnList = listToUse.reverse();
                    return [returnList, nodesToStrings(returnList, callingNode.lineno)];
                }
                //shift
                if (opToPerform === "shift") {
                    listToUse.splice(0, 1);
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }
                //slice
                if (opToPerform === "slice") {
                    var startInt = 0;
                    var endInt = listToUse.length - 1;   //get the actual values, if we know them.

                    //gather target, start, and end vals
                    var targetNode = retrieveFromList(callingNode.args[0]);

                    if (targetNode._astname === "Name" &&  getVariableObject(targetNode.id.v) != null) {
                        targetNode = getMostRecentValue( getVariableObject(targetNode.id.v), callingNode.lineno);
                    }
                    if (targetNode != null && targetNode._astname === "Num") {
                        startInt = targetNode.n.v;
                    }
                    if (callingNode.args.length > 1) {
                        var endNode = retrieveFromList(callingNode.args[1]);
                        if (endNode._astname === "Name" &&  getVariableObject(endNode.id.v) != null) {
                            endNode = getMostRecentValue( getVariableObject(endNode.id.v), callingNode.lineno);
                        }
                        if (endNode != null && endNode._astname === "Num") {
                            endInt = endNode.n.v;
                        }
                    }
                    //handle negatives
                    if (startInt < 0) {
                        startInt += listToUse.length;
                    }
                    if (endInt < 0) {
                        endInt += listToUse.length;
                    }

                    //do the slicing and return results
                    var newList = listToUse.slice(startInt, endInt);
                    return [newList, nodesToStrings(newList, callingNode.lineno)];

                }

                //sort
                if (opToPerform === "sort") {

                    //helper comparison function
                    function compare(a, b) { // Use toUpperCase() to ignore character casing
                        const bandA = a.key.toUpperCase();
                        const bandB = b.key.toUpperCase();
                        var comparison = 0;
                        if (bandA > bandB) { comparison = 1; }
                        else if (bandA < bandB) { comparison = -1; }
                        return comparison;
                    }

                    //variable init
                    var returnList = [];
                    var numberPairs = [];

                    //indices is used to indicate items that have already been sorted and put in the result list
                    //so we don't include/sort them twice
                    var indices = [];

                    //the first thing to sort is numerical values
                    for (var i in listToUse) {
                        if (listToUse[i]._astname === "Num") {
                            var stringVal = listToUse[i].n.v.toString();
                            numberPairs.push({ key: stringVal, value: listToUse[i] });
                            indices.push(i);
                        }
                        else if (listToUse[i]._astname === "List" && listToUse[i][0]._astname === "Num") {
                            var stringVal = listToUse[i][0].n.v.toString();
                            numberPairs.push({ key: stringVal, value: listToUse[i] });
                            indices.push(i);
                        }
                    }
                    //sort the numberVals
                    numberPairs.sort(compare);

                    for (var i in numberPairs) {
                        returnList.push(numberPairs[i].value);
                    }

                    //any numerical values whose values we do not know get put in next
                    for (var i in listToUse) {
                        if (!(indices.includes(i))) {
                            if (listToUse[i]._astname === "Name") {
                                if ( getVariableObject(listToUse[i]) != null && ( getVariableObject(listToUse[i]).value === "Int" ||  getVariableObject(listToUse[i]).value === "Float")) {
                                    returnList.push(listToUse[i]);
                                    indices.push(i);
                                }
                            }
                            if (listToUse[i]._astname === "BinOp") {
                                if (recursivelyAnalyzeBinOp(listToUse[i]) === "Int" || recursivelyAnalyzeBinOp(listToUse[i]) === "Float") {
                                    returnList.push(listToUse[i]);
                                    indices.push(i);
                                }
                            }
                            if (listToUse[i]._astname === "Call") {
                                if (getCallReturn(listToUse[i]) === "Int" || getCallReturn(listToUse[i]) === "Float") {
                                    returnList.push(listToUse[i]);
                                    indices.push(i);
                                }
                            }
                        }
                    }

                    //everything else gets converted to a string and the strings get sorted, which mirrors the way JS sorts lists
                    var sortables = [];
                    for (var i in listToUse) {
                        if (!(indices.includes(i))) {
                            if (listToUse[i]._astname === "Name" && (listToUse[i].id.v === "True" || listToUse[i].id.v === "False")) {
                                sortables.push({ key: listToUse[i].id.v.toLowerCase(), value: listToUse[i] });
                                indices.push(i);
                            }
                            else if (listToUse[i]._astname === "Str") {
                                sortables.push({ key: listToUse[i].s.v, value: listToUse[i] });
                                indices.push(i);
                            }
                            else if (listToUse[i]._astname === "Name" &&  getVariableObject(listToUse[i].id.v) == null &&  getFunctionObject(listToUse[i].id.v) == null) {
                                sortables.push({ key: listToUse[i].id.v, value: listToUse[i] });
                                indices.push(i);
                            }
                            else if (listToUse[i]._astname === "Name" &&  getVariableObject(listToUse[i].id.v) == null &&  getFunctionObject(listToUse[i].id.v) != null) {
                                sortables.push({ key: "{\"prototype\":{},\"length\":0}", value: listToUse[i] });
                                indices.push(i);
                            }
                            else if (listToUse[i]._astname === "List") {
                                if (listToUse[i][0]._astname === "Name" && (listToUse[i][0].id.v === "True" || listToUse[i][0].id.v === "False")) {
                                    sortables.push({ key: listToUse[i].id.v.toLowerCase(), value: listToUse[i] });
                                    indices.push(i);
                                }
                                else if (listToUse[i][0]._astname === "Str") {
                                    sortables.push({ key: listToUse[i][0].s.v, value: listToUse[i] });
                                    indices.push(i);
                                }
                                else if (listToUse[i][0]._astname === "Name" &&  getVariableObject(listToUse[i][0].id.v) == null &&  getFunctionObject(listToUse[i][0].id.v) == null) {
                                    sortables.push({ key: listToUse[i][0].id.v, value: listToUse[i] });
                                    indices.push(i);
                                }
                                else if (listToUse[i][0]._astname === "Name" &&  getVariableObject(listToUse[i][0].id.v) == null &&  getFunctionObject(listToUse[i][0].id.v) != null) {
                                    sortables.push({ key: "{\"prototype\":{},\"length\":0}", value: listToUse[i] });
                                    indices.push(i);
                                }
                            }
                        }
                    }

                    //sort the list of stringified versions
                    sortables.sort(compare);

                    for (var i in sortables) {
                        returnList.push(sortables[i].value);
                    }

                    for (var i in listToUse) {
                        if (!indices.includes(i)) { returnList.push(listToUse[i]); }
                    }

                    return [returnList, nodesToStrings(returnList, callingNode.lineno)];
                }

                //splice
                if (opToPerform === "splice") {
                    //as with python ops, this is necessarily not 100% accurate but should at least serve some purpose
                    var startValue = listToUse.length;
                    var deleteCount = 0;
                    var itemsToAppend = [];
                    var newList = [];

                    //get start and deleteCount values, defaulting if necessary
                    var targetNode = retrieveFromList(callingNode.args[0]);
                    if (targetNode != null && targetNode._astname === "Num") {
                        startValue = targetNode.n.v;
                    }
                    else if (targetNode._astname === "Name") {
                        var targetVar = getVariable(targetNode.id.v);
                        if (targetVar != null && targetVar.value === "Int") {
                            startValue = getMostRecentValue(targetVar, callingNode.lineno);
                        }
                    }

                    if (callingNode.args.length > 1) {
                        endNode = retrieveFromList(callingNode.args[1]);
                        if (endNode._astname === "Num") {
                            deleteCount = endNode.n.v;
                        }
                        else if (endNode._astname === "Name") {
                            var endVar = getVariable(endNode.id.v);
                            if (endVar != null && endVar.value === "Int") {
                                deleteCount = getMostRecentValue(endVar, callingNode.lineno);
                            }
                        }
                    }
                    if (callingNode.args.length > 2) {
                        for (var i = 2; i < callingNode.args.length; i++) {
                            itemsToAppend.push(callingNode.args[i]);
                        }
                    }

                    //default values
                    if (startValue < 0) {
                        startValue += listToUse.length;
                    }
                    if (startValue < 0) {
                        startValue = 0;
                    }

                    //create the new array with the spliced values
                    for (var i = 0; i < startValue; i++) {
                        newList.push(listToUse[i]);
                    }
                    for (var i in itemsToAppend) {
                        newList.push(itemsToAppend[i]);
                    }
                    for (var i = startValue + deleteCount; i < listToUse.length; i++) {
                        newList.push(listToUse[i]);
                    }

                    //return
                    return [newList, nodesToStrings(newList, callingNode.lineno)];
                }
                //unshift
                if (opToPerform === "unshift") {
                    var returnList = listToUse.slice(0);
                    returnList.splice(0, 0, callingNode.args[0]);
                    return [returnList, nodesToStrings(returnList, callingNode.lineno)];
                }
                //values really just keeps the list the same
                if (opToPerform === "values") {
                    return [listToUse, nodesToStrings(listToUse)];
                }
            }
            //return listToUse if we haven't done anything to it
            return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
        }


        //Python listops
        function pythonOp(callingNode) {

            //variable init
            var opToPerform = null;
            var listToUse = [];
            var variableOrFuncIndex = -1;
            var isVariable = false;
            var isFunc = false;

            //what operation are we performing?
            if ('func' in callingNode && 'attr' in callingNode.func) {
                opToPerform = callingNode.func.attr.v;
            }

            if (callingNode.func.value._astname === "Name") {
                var variable =  getVariableObject(callingNode.func.value.id.v);

                if (variable != null) {
                    var correctElts = mostRecentElements(variable, callingNode.lineno);
                    if (correctElts != null) {
                        listToUse = correctElts.slice(0);
                    }
                }
            }
            else if (callingNode.func.value._astname === "Call") {
                if (doesCallCreateList(callingNode.func.value)) {
                    listToUse = performListOp(callingNode.func.value, false)[0];
                }
                else if (retrieveFromList(callingNode.func.value) != callingNode.func.value) {
                    listToUse = retrieveFromList(callingNode.func.value).elts;
                }
                else if ('id' in callingNode.func.value.func) {
                    var funcName = callingNode.func.value.func.id.v;
                    if ( getFunctionObject(funcName) != null) {
                        isFunc = true;
                        var variable =  getVariableObject(callingNode.func.value.id.v);

                        if (variable != null) {
                            var correctElts = mostRecentElements(variable.nodeElements, callingNode.lineno);
                            if (correctElts != null) {
                                listToUse = correctElts.slice(0);
                            }
                        }
                    }
                }
            }
            else if (callingNode.func.value._astname === "List") {
                listToUse = callingNode.func.value.elts;
            }
            else if (callingNode.func.value._astname === "BinOp") {
                listToUse = getAllBinOpLists(callingNode.func.value);
            }

            //if we don't know what array to use, return empty
            if (listToUse == null) {
                return [[], []];
            }

            if (opToPerform != null) {
                //append
                if (opToPerform === "append") {

                    var itemToAppend = callingNode.args[0];
                    listToUse.push(itemToAppend);

                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }

                //extend
                if (opToPerform === "extend") {

                    //get the list value to append to the original list
                    var listToAppend = [];
                    if (callingNode.args[0]._astname === "List") {
                        listToAppend = callingNode.args[0].elts.slice(0);
                    }
                    else if (callingNode.args[0]._astname === "Name") {
                        var varVal =  getVariableObject(callingNode.args[0].id.v);
                        if (varVal != null) {
                            var currentElts = mostRecentElements(varVal, callingNode.lineno);
                            listToAppend = currentElts.slice(0);
                        }
                    }
                    else if (callingNode.args[0]._astname === "Call") {
                        if (doesCallCreateList(callingNode.args[0])) {
                            listToAppend = performListOp(callingNode.args[0]);
                        }
                        else if ('id' in callingNode.args[0].func) {
                            var funcReturn =  getFunctionObject(callingNode.args[0].func.id.v);
                            if (funcReturn != null && funcReturn.nodeElements != null && funcReturn.nodeElements.length > 0) {
                                listToAppend = funcReturn.nodeElements[0].elts;
                            }
                        }
                    }

                    //return the list with values appended
                    if (listToAppend.length === 0) {
                        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                    }
                    else {
                        listToUse.concat(listToAppend);
                        return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                    }
                }

                //insert
                if (opToPerform === "insert") {
                    var insertPosition = 0;
                    var itemToInsert = retrieveFromList(callingNode.args[0]);

                    if (itemToInsert != null) {
                        listToUse.splice(insertPosition, 0, itemToInsert);
                    }
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }
                //pop
                if (opToPerform === "pop") {
                    var popArg = listToUse.length - 1;

                    if (callingNode.args != null && callingNode.args.length > 0) {
                        popArg = callingNode.args[0].n.v;
                    }

                    listToUse.splice(popArg, 1);
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }
                //remove
                if (opToPerform === "remove") {
                    var indexToRemove = -1;
                    var itemToRemove = callingNode.args[0];
                    //find an item that matches. same _astname, same value
                    for (var p = 0; p < listToUse.length; p++) {
                        if (listToUse[p]._astname === itemToRemove._astname) {
                            //now we check that the values are the same.
                            if (doAstNodesMatch(listToUse[p], itemToRemove)) {
                                indexToRemove = p;
                                break; //THIS BREAK IS IMPORTANT! - erin
                            }
                        }
                    }

                    if (indexToRemove > -1) {
                        listToUse.splice(indexToRemove, 1);
                    }

                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }
                if (opToPerform === "sort") {
                    var sortedList = [];
                    var sortedBools = [];
                    var sortedInts = [];
                    var sortedFloats = [];
                    var sortedLists = [];
                    var sortedStrings = [];


                    //sort the bools - false, then true, then undetermined
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Name" && listToUse[i].id.v === "False") {
                            sortedBools.push(listToUse[i]);
                        }
                    }
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Name" && listToUse[i].id.v === "True") {
                            sortedBools.push(listToUse[i]);
                        }
                    }
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Name" &&  getVariableObject(listToUse[i].id.v) != null &&  getVariableObject(listToUse.id.v).value === "Bool") {
                            sortedBools.push(listToUse[i]);
                        }

                        else if (listToUse[i]._astname === "Call") {
                            var functionName = ""
                            var funcId = retrieveFromList(listToUse[i].func);

                            if ('id' in funcId) {
                                functionName = funcId.id.v;
                            }
                            if (functionName !== "" && ( getFunctionObject(func1tionName).returns === "Bool")) {
                                sortedBools.push(listToUse[i]);
                            }
                        }
                        else if (listToUse[i]._astname === "BoolOp") {
                            sortedBools.push(listToUse[i]);  //we COULD evaluate these, and may a a later time, but IMHO it's inefficient to do now.
                        }
                        else if (listToUse[i]._astname === "Compare") {
                            sortedBools.push(listToUse[i]);
                        }
                        else if (listToUse[i]._astname === "UnaryOp") {
                            sortedBools.push(listToUse[i]);
                        }
                    }

                    //sort the ints - ascending order first, then undetermined values
                    function sortNumber(a, b) { return a - b; }
                    var unsortedInts = [];
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Num" && !isNodeFloat(listToUse[i])) {
                            unsortedInts.push(listToUse[i].n.v);
                        }
                    }

                    unsortedInts.sort(sortNumber); //let's make javascript do this for us

                    for (var y = 0; y < unsortedInts.length; y++) {
                        //find the matching AST node and push to sortedInts
                        for (var i = 0; i < listToUse.length; i++) {
                            if (listToUse[i]._astname === "Num" && listToUse[i].n.v === unsortedInts[y]) {
                                sortedInts.push(listToUse[i]);
                                break;
                            }
                        }
                    }
                    //add the undetermined-value integers here
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Call") {
                            var functionName = "";
                            var funcId = retrieveFromList(listToUse[i].func);
                            if ('id' in funcId) { functionName = funcId.id.v; }
                            if ( getVariableObject(functionName) != null &&  getVariableObject(functionName).value === "Int") {
                                sortedInts.push(listToUse[i]);
                            }

                        }
                        else if (listToUse[i]._astname === "Name" && ( getVariableObject(listToUse[i].id.v) != null &&  getVariableObject(listToUse[i].id.v).value === "Int")) {
                            sortedInts.push(listToUse[i]);
                        }
                        else if (listToUse[i]._astname === "BinOp" && recursivelyAnalyzeBinOp(listToUse[i]) === "Int") {
                            sortedInts.push(listToUse[i]);
                        }
                    }


                    //sort the floats next.
                    var unsortedFloats = [];
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Num" && !!isNodeFloat(listToUse[i])) {
                            unsortedFloats.push(listToUse[i].n.v);
                        }
                    }

                    for (var y = 0; y < unsortedFloats.length; y++) {
                        //find the matching AST node and push to sortedInts
                        for (var i = 0; i < listToUse.length; i++) {
                            if (listToUse[i]._astname === "Num" && listToUse[i].n.v === unsortedFloats[y]) {
                                sortedFloats.push(listToUse[i]);
                                break;
                            }
                        }
                    }

                    //insert the undetermined-value floats
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Call") {
                            var functionName = "";
                            if ('id' in listToUse[i].func) {
                                functionName = listToUse[i].func.id.v;
                            }
                            else if (listToUse[i].func._astname === "Subscript") {
                                var subName = retrieveFromList(listToUse[i].func);
                                if (subName != null && subName._astname === "Name" &&  getVariableObject(subName.id.v) != null &&  getVariableObject(subName.id.v).value === "Float") {
                                    sortedFloats.push(listToUse[i]);
                                }
                            }
                        }
                        else if (listToUse[i]._astname === "Name" && ( getVariableObject(listToUse[i].id.v) != null &&  getVariableObject(listToUse[i].id.v).value === "Float")) {
                            sortedFloats.push(listToUse[i]);
                        }
                        else if (listToUse[i]._astname === "BinOp" && recursivelyAnalyzeBinOp(listToUse[i]) === "Float") {
                            sortedFloats.push(listToUse[i]);
                        }
                    }

                    //next, the LISTS. these will be the hardest because we are sorting them by first element, theoretically, in the same order as the overarching list.
                    var unsortedLists = [];
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "List") {
                            unsortedLists.push(listToUse[i]);
                        }
                    }
                    sortedLists = pythonSortNestedLists(unsortedLists);

                    //lists with unknown first values
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Call") {
                            var functionName = "";
                            if ('id' in listToUse[i].func) { functionName = listToUse[i].func.id.v; }
                            else if (listToUse[i].func._astname === "Subscript") {
                                var subName = retrieveFromList(listToUse[i].func);
                                if (subName != null && subName._astname === "Name" &&  getVariableObject(subName.id.v) != null &&  getVariableObject(subName.id.v).value === "List") {
                                    sortedLists.push(listToUse[i]);
                                }
                            }
                        }

                        else if (listToUse[i]._astname === "Name" && ( getVariableObject(listToUse[i].id.v) != null &&  getVariableObject(listToUse[i].id.v).value === "List")) {
                            sortedLists.push(listToUse[i]);
                        }
                        else if (listToUse[i]._astname === "BinOp" && (Array.isArray(recursivelyAnalyzeBinOp(listToUse[i])))) {
                            sortedLists.push(listToUse[i]);
                        }
                    }

                    //finally, the strings.
                    var unsortedStrings = [];
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Str") {
                            unsortedStrings.push(listToUse[i].s.v);
                        }
                    }

                    unsortedStrings.sort();

                    for (var y = 0; y < unsortedStrings.length; y++) {
                        for (var i = 0; i < listToUse.length; i++) {
                            if (listToUse[i]._astname === "Str" && 's' in listToUse[i] && listToUse[i].s.v === unsortedStrings[y]) {
                                sortedStrings.push(listToUse[i]);
                                break;
                            }
                        }
                    }

                    //insert the complicated strings
                    for (var i = 0; i < listToUse.length; i++) {
                        if (listToUse[i]._astname === "Call") {
                            var functionName = "";
                            if ('id' in listToUse[i].func) { functionName = listToUse[i].func.id.v; }
                            else if (listToUse[i].func._astname === "Subscript") {
                                var subName = retrieveFromList(listToUse[i].func);
                                if (subName != null && subName._astname === "Name" &&  getVariableObject(subName.id.v) != null &&  getVariableObject(subName.id.v).value === "Str") {
                                    sortedStrings.push(listToUse[i]);
                                }
                            }
                        }
                        else if (listToUse[i]._astname === "Name" && ( getVariableObject(listToUse[i].id.v) != null &&  getVariableObject(listToUse[i].id.v).value === "Str")) {
                            sortedStrings.push(listToUse[i]);
                        }
                        else if (listToUse[i]._astname === "BinOp" && (recursivelyAnalyzeBinOp(listToUse[i]) === "Str")) {
                            sortedStrings.push(listToUse[i]);
                        }
                    }


                    //combine the sorted components, and return that
                    sortedList = sortedBools;// + sortedInts + sortedFloats + sortedLists + sortedStrings;
                    sortedList = appendArray(sortedInts, sortedList);
                    sortedList = appendArray(sortedFloats, sortedList);
                    sortedList = appendArray(sortedLists, sortedList);
                    sortedList = appendArray(sortedStrings, sortedList);

                    return [sortedList, nodesToStrings(sortedList, callingNode.lineno)];
                }
                if (opToPerform === "shuffleList") {
                    //this is, by necessity, a gap in this complexity calculator. We cannot replicate randomness, because it is random. Possible space for future improvements
                    return [listToUse, nodesToStrings(listToUse, callingNode.lineno)];
                }
            }

            return null;
        }

        //helper function for pythonOp
        function pythonSortNestedLists(allListsInList) {
            //sort lists by first element (sorted by type and by value)
            //lists WITHIN this get sorted by THEIR first element within this (recursively calls self on those lists.)

            var listsWithin = [];
            var listsSorted = [];

            var intSorted = [], floatSorted = [], listSorted = [], stringSorted = [];

            for (var a = 0; a < allListsInList.length; a++) {
                if (getFirstElementType(allListsInList[a]) === "Bool") {
                    listsSorted.push(allListsInList[a]);
                }
                else if (getFirstElementType(allListsInList[a]) === "Int") {
                    intSorted.push(allListsInList[a]);
                }
                else if (getFirstElementType(allListsInList[a]) === "Float") {
                    floatSorted.push(allListsInList[a]);
                }
                else if (getFirstElementType(allListsInList[a]) === "List") {
                    listsWithin.push(allListsInList[a]);
                }
                else if (getFirstElementType(allListsInList[a]) === "Str") {
                    stringSorted.push(allListsInList[a]);
                }
            }

            if (listsWithin.length > 0) {
                listSorted = pythonSortNestedLists(listsWithin);
            }

            //append the arrays, in order
            listsSorted = appendArray(intSorted, listsSorted);
            listsSorted = appendArray(floatSorted, listsSorted);
            listsSorted = appendArray(listSorted, listsSorted);
            listsSorted = appendArray(stringSorted, listsSorted);

            return listsSorted;
        }

    }

 
    /*Does this call to a listOp function RETURN a list?
    * @param node - The "Call" AST node
    * @returns True or False
    */
    function doesCallCreateList(node) {
        var funcName = "";
        if (node._astname === "Call") {

            var funcNode = retrieveFromList(node.func);

            if (funcNode != null) {
                if ('attr' in funcNode) {
                    funcName = funcNode.attr.v;
                }
                if ('id' in funcNode && funcNode.id.v === "shuffleList") {
                    return true;
                };
                if (createListFuncs.includes(funcName)) {
                    return true;
                }
            }
        }
        return false;
    }

    /*Returns the type of the first element in a list.
   * Used for sorting lists within lists during  performListOp() sorts.
   * @param list - the python list or js array AST node whose first type we want to retrieve
   * @returns String representation of the datatype of the first element of the list/array
   */
    function getFirstElementType(list) {
        return getTypeFromNode( retrieveFromList(list.elts[0]));
    }

    /* Is this node a call to an operation that creates a string?
    * @param node {object} The AST node in question
    * @returns True or False.
    */
    function doesCallCreateString(node) {
        var funcName = "";
        if (node._astname === "Call") {
            var funcNode =  retrieveFromList(node.func);

            if (funcNode != null) {
                if ('attr' in funcNode) {
                    funcName = funcNode.attr.v;
                }
                if ('id' in funcNode && funcNode.id.v === "shuffleString") {
                    return true;
                };
            }
            if (createStrFuncs.includes(funcName)) {
                return true;
            }
        }
        return false;
    }


    /* Is this node a call to a string operation?
    * @param node {object} The AST node in question
    * @returns True or False.
    */
    function isCallAStrOp(node) {
        var thisNode =  retrieveFromList(node);
        if (thisNode != null && thisNode._astname === "Call") {
            if ('id' in thisNode.func) {
                return false;
            }
            else if ('attr' in thisNode.func) {
                var funcName = thisNode.func.attr.v;
                if (strFuncs.includes(funcName)) {
                    return true;
                }
            }
        }
        return false;
    }

    /* Does this node contain any string indexing or slicing?
    * @param node {object} The AST node in question
    * @returns {array} Array with 2 boolean values - the first is whether or not there's indexing in the node, and the second is the originality thereof (if the first is true).
    */
    function getStringIndexingInNode(node) {
        function getStringIndexing(node) {
            if (node._astname === "Subscript" && (node.slice._astname === "Index" || node.slice._astname === "Slice")) {

                //is the thing we're indexing a string?
                if (node.value._astname === "Str") {
                    return [true, true];
                }
                //or a binOp that resolves to a string?
                if (node.value._astname === "BinOp" && recursivelyAnalyzeBinOp(node.value) === "Str") {
                    return [true, true];
                }
                //or a call that returns a string?
                if (node.value._astname === "Call") {
                    if ( doesCallCreateString(node.value)) {
                        return [true, true];
                    }
                    if ('func' in node.value && 'id' in node.value.func) {
                        var funcObj = getFunctionObject(node.value.func.id.v);
                        if (funcObj.returns === "Str") {
                            return [true, funcObj.original];
                        }
                    }
                    else if ('func' in node.value && node.func.value._astname === "Subscript") {
                        var funcName =  retrieveFromList(node.func);
                        if (funcName._astname === "Name") {
                            var returns = getFunctionObject(funcName);
                            if (returns != null && returns.returns === "Str") {
                                return [true, returns.original];
                            }
                        }
                    }
                }
                //or a variable that contains a string?
                if (node.value._astname === "Name") {
                    var thisVariable = getVariableObject(node.value.id.v);
                    if (thisVariable != null) {
                        return [thisVariable.value === "Str", thisVariable.original];
                    }
                }
                //Or a subscripted string?
                if (node.value._astname === "Subscript") {
                    return (getStringIndexing(node.value));
                }
            }
            return [false, false];
        }


        //regardless of the type of node, we need two things:
        //1. if there's string indexing
        //2. if anything in the node should count as original

        if (node._astname === "UnaryOp") {
            return getStringIndexingInNode(node.operand);
        }
        if (node._astname === "BinOp") {
            var isIndexed = false;
            var isOriginal = false;

            if (getStringIndexingInNode(node.right)[0] || getStringIndexingInNode(node.right)[0]) {
                isIndexed = true;
            }
            if ((getStringIndexingInNode(node.right)[0] && getStringIndexingInNode(node.right)[1]) || (getStringIndexingInNode(node.left)[0] && getStringIndexingInNode(node.left)[1])) {
                isOriginal = true;
            }

            return [isIndexed, isOriginal];
        }

        if (node._astname === "BoolOp") {
            var isIndex = false;
            var isOriginal = false;

            //check values
            for (var i = 0; i < node.values.length; i++) {
                if (getStringIndexingInNode(node.values[i])[0]) {

                    isIndex = true;
                    if (getStringIndexingInNode(node.values[i])[1]) {
                        isOriginal = true;
                    }
                }
            }
            return [isIndex, isOriginal];
        }


        if (node._astname === "List") {
            var isIndex = false;
            var isOriginal = false;


            //check elements
            for (var i = 0; i < node.elts.length; i++) {
                if (getStringIndexingInNode(node.elts[i])[0]) {

                    isIndex = true;
                    if (getStringIndexingInNode(node.elts[i])[1]) {
                        isOriginal = true;
                    }
                }
            }
            return [isIndex, isOriginal];
        }
        if (node._astname === "Compare") {
            var isIndexed = false;
            var isOriginal = false;

            //check left side
            if (getStringIndexingInNode(node.left)[0]) {
                isIndexed = true;
                if (getStringIndexingInNode(node.left)[1]) {
                    isOriginal = true;
                }
            }
            //check comparators
            for (var n = 0; n < node.comparators.length; n++) {
                if (getStringIndexingInNode(node.comparators[n])[0]) {
                    isIndexed = true;
                    if (getStringIndexingInNode(node.comparators[n])[1]) {
                        isOriginal = true;
                    }
                }
            }
            return [isIndexed, isOriginal];
        }

        if (node._astname === "Subscript") {
            //is this indexing or slicing a string?
            return (getStringIndexing(node));
        }

        if (node._astname === "Name") {
            if (getVariableObject(node.id.v) != null) {
                return [getVariableObject(node.id.v).indexAndInput.strIndexed, getVariableObject(node.id.v).original];
            }
        }

        if (node._astname === "Call" && 'id' in node.func) {
            var foundFunction = getFunctionObject(node.func.id.v);

            if (foundFunction != null && 'indexAndInput' in foundFunction) {
                return [foundFunction.indexAndInput.strIndexed, foundFunction.original];
            }
        }

        if (node._astname === "Subscript") {
            if (node.slice._astname === "Index" || node.slice._astname === "Slice") {
                if (node.value._astname === "Str") {
                    return [true, originalityLines.includes(node.lineno)];
                }
                if (node.value._astname === "Subscript") {
                    return (getStringIndexing(node.value));
                }
                //binop that resolves to string
                if (node.value._astname === "BinOp" && recursivelyAnalyzeBinOp(node.value) === "Str") {
                    return [true, true];
                }
                if (node.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF that returns a string
                    if ( doesCallCreateString(node.value)) {
                        return [true, true];
                    }
                    if ('func' in node.value && 'id' in node.value.func && getFunctionObject(node.value.id.v).returns === "Str") {
                        return [true, getFunctionObject(node.value.id.v).original];
                    }
                }

                //variable that contains string
                if (node.value._astname === "Name" && (getVariableObject(node.value.id.v) != null && getVariableObject(node.value.id.v).value === "Str")) {
                    return [true, getVariableObject(node.value.id.v).original];
                }
            }
        }
        return [false, false];
    }

    /* Is this "Call" AST node a call to a list operation?
    * @param node {object} The AST node in question
    * @returns True or False.
    */
    function isCallAListOp(node) {
        var thisNode =  retrieveFromList(node);

        if (thisNode != null && thisNode._astname === "Call" && 'attr' in thisNode.func && listFuncs.includes(thisNode.func.attr.v)) {
            return true;
        }
        return false;
    }


    /* Does this node contain any list indexing or slicing?
   * @param node {object} The AST node in question
   * @returns {array} Array with 2 boolean values - the first is whether or not there's indexing in the node, and the second is the originality thereof (if the first is true).
   */
    function getIndexingInNode(node) {

        function getNestedIndexing(node) {

            if (node._astname === "Subscript" && node.slice._astname === "Index") {//if the thing we're indexing is a list, return true
                if (node.value._astname === "List") {
                    return [true, originalityLines.includes(node.lineno)];
                }
                //is it a binop that resolves to a list?
                if (node.value._astname === "BinOp" && Array.isArray(recursivelyAnalyzeBinOp(node.value))) {
                    return [true, true];
                }
                if (node.value._astname === "Call") {//is it a listop, concat binop, OR a UDF that returns a list
                    if ( doesCallCreateList(node.value)) {
                        return [true, true];
                    }
                    if ('func' in node.value && 'id' in node.value.func) {
                        var funcObj = getFunctionObject(node.value.func.id.v);
                        if (funcObj.returns === "List") {
                            return [true, funcObj.original];
                        }
                    }
                }
                if (node.value._astname === "Name") {//is it indexing a variable that contains a list?
                    var thisVariable = getVariableObject(node.value.id.v);
                    if (thisVariable != null) {
                        return [thisVariable.value === "List", thisVariable.original];
                    }
                }
                if (node.value._astname === "Subscript") {
                    return (getNestedIndexing(node.value));
                }
            }
            return false;
        }



        if (node._astname === "BinOp") {
            var isIndexed = false;
            var isOriginal = false;

            //check left and right sides
            if (getIndexingInNode(node.right)[0] || getIndexingInNode(node.right)[0]) {
                isIndexed = true;
            }
            if ((getIndexingInNode(node.right)[0] && getIndexingInNode(node.right)[1]) || (getIndexingInNode(node.left)[0] && getIndexingInNode(node.left)[1])) {
                isOriginal = true;
            }

            return [isIndexed, isOriginal];
        }

        if (node._astname === "UnaryOp") {
            //check operand
            return (getIndexingInNode(node.operand));
        }

        if (node._astname === "BoolOp") {
            var isIndex = false;
            var isOriginal = false;

            //check all value nodes
            for (var i = 0; i < node.values.length; i++) {
                if (getIndexingInNode(node.values[i])[0]) {
                    isIndex = true;

                    if (getIndexingInNode(node.values[i])[1]) {
                        isOriginal = true;
                    }
                }
            }

            return [isIndex, isOriginal];
        }

        if (node._astname === "List") {
            var isIndex = false;
            var isOriginal = false;

            //check all element nodes
            for (var i = 0; i < node.elts.length; i++) {
                if (getIndexingInNode(node.elts[i])[0]) {
                    isIndex = true;
                    if (getIndexingInNode(node.elts[i])[1]) {
                        isOriginal = true;
                    }
                }
            }

            return [isIndex, isOriginal];
        }
        if (node._astname === "Compare") {
            var isIndexed = false;
            var isOriginal = false;

            //check left side
            if (getIndexingInNode(node.left)[0]) {
                isIndexed = true;
                if (getIndexingInNode(node.left)[1]) {
                    isOriginal = true;
                }
            }

            //check all comparators
            for (var n = 0; n < node.comparators.length; n++) {
                if (getIndexingInNode(node.comparators[n])[0]) {
                    isIndexed = true;
                    if (getIndexingInNode(node.comparators[n])[1]) {
                        isOriginal = true;
                    }
                }
            }
            return [isIndexed, isOriginal];
        }


        if (node._astname === "Subscript") {
            //check the value
            return (getNestedIndexing(node));
        }

        if (node._astname === "Name" && getVariableObject(node.id.v) != null) {
            //if it's a variable, does it contain indexing and is it original?
            return [getVariableObject(node.id.v).indexAndInput.indexed, getVariableObject(node.id.v).original];
        }

        if (node._astname === "Call" && 'id' in node.func && getFunctionObject(node.func.id.v) != null) {
            //ditto for functions
            if ('indexAndInput' in getFunctionObject(node.func.id.v)) {
                return [getFunctionObject(node.func.id.v).indexAndInput.indexed, getFunctionObject(node.func.id.v).original];
            }
        }

        //special cases: min, max, and choice count as indexing for our purposes
        if (node._astname === "Call" && 'id' in node.func && (node.func.id.v === "min" || node.func.id.v === "max")) {

            return [true, originalityLines.includes(node.lineno)];
        }
        if (node._astname === "Call" && 'attr' in node.func && node.func.attr.v === "choice") {

            return [true, originalityLines.includes(node.lineno)];
        }

        if (node._astname === "Subscript") {
            if (node.slice._astname === "Index" || node.slice._astname === "Slice") {
                //is the thing being indexed a list?
                if (node.value._astname === "List") {
                    return [true, true];
                }
                //a subscripted list?
                if (node.value._astname === "Subscript") {
                    return (getNestedIndexing(node.value));
                }
                //a binop that resolves to a list?
                if (node.value._astname === "BinOp" && Array.isArray(recursivelyAnalyzeBinOp(node.value))) {
                    return [true, true];
                }
                //a function call that returns a list?
                if (node.value._astname === "Call") {
                    if ( doesCallCreateList(node.value)) {
                        return [true, true];
                    }
                    if ('func' in node.value && 'id' in node.value.func && getFunctionObject(node.value.id.v).returns === "List") {
                        return [true, getFunctionObject(node.value.id.v).original];
                    }
                }
                //a variable that contains a list?
                if (node.value._astname === "Name" && getVariableObject(node.value.id.v) === "List") {
                    return [true, getVariableObject(node.value.id.v).original];
                }
            }
        }


        return [false, false];
    }


    /*Adds a single operation to the list for a function or variable
    * @param opToAdd {String} The name of the operation to be added to the list
    * @param opList {Array} The opList object for the operation to be added to
    * @param lineno {Int} The line number where the operation being added occurs
    * @returns Updated opList array.
    */
    function addOpToList(opToAdd, opList, lineno) {
        if (opList == null) {
            //if we're passed a null value for the array, initialize a new one
            opList = [];
        }

        //adjustment if we're in a loop
        //basically, if the op happens in a loop, we consider it to start at the loop's first line
        for (var p in loopLocations) {
            if (lineno >= loopLocations[p][0] && lineno <= loopLocations[p][1]) {
                lineno = loopLocations[p][0];
                break;
            }
        }

        //Is the operation already in the list?
        var opIndex = -1;
        for (var p = 0; p < opList.length; p++) {
            if (opList[p].op === opToAdd) {
                opIndex = p;
                break;
            }
        }

        //if this op is already in the list, just add this line number to it
        if (opIndex > -1 && !opList[opIndex].lines.includes(lineno)) {
            opList[opIndex].lines.push(lineno);
            opList[opIndex].lines.sort();
        }
        //otherwise, make a new op object with the line number as the first entry in the lines array
        else if (opIndex === -1) {
            opList.push({ op: opToAdd, lines: [lineno] });
        }

        return opList;
    }


    /* Searches an opList for all entries prior to a specified line.
    * @param opList - the opList array to search
    * @param lineNumber - The function will return all entries in the opList object
    * @returns String array with all ops performed before the line
    */
    function opsBeforeLine(opList, lineNumber, funcOrVar, funcOrVarObject) {
        var opsBefore = []; //initialize return value

        //are we in a function?
        var inFunction = false;
        for (var u = 0; u < userFunctionReturns.length; u++) {
            if (lineNumber >= userFunctionReturns[u].startLine && lineNumber <= userFunctionReturns[u].endLine) {
                inFunction = true;
            }
        }

        //iterate through the ops list, and count any that occur before the line
        for (var a = 0; a < opList.length; a++) {

            //if we're in a function, and the op occurs before the current line, we can assume it has occurred before this point.
            if (inFunction && opList[a].lines[0] <= lineNumber) {
                opsBefore.push(opList[a].op);
            }


            else {
                //if we're outside a function, we need the first line NOT in a function.
                var lineOutsideFunction = false;
                var line = 0;
                while (!lineOutsideFunction && line < opList[a].lines.length) {

                    var lineno = opList[a].lines[line];
                    var isInside = false;


                    for (var u = 0; u < userFunctionReturns.length; u++) {
                        if (lineno >= userFunctionReturns[u].startLine && lineno <= userFunctionReturns[u].endLine) {
                            isInside = true;
                            break;
                        }
                    }

                    lineOutsideFunction = !isInside;
                    line++;
                }

                if (lineOutsideFunction) {
                    line -= 1;
                    if (opList[a].lines[line] <= lineNumber) {
                        opsBefore.push(opList[a].op);
                    }
                }
            }
        }


        //check other modifying function calls
        if (funcOrVar === "var") {
            //get modifying functions
            var modFuncs = [];

            for (var i in funcOrVarObject.modifyingFunctions) {
                //find the function object in userFunctions
                var funcObj = null;
                for (var p in userFunctionReturns) {
                    if (userFunctionReturns[p].startLine != null
                        && userFunctionReturns[p].startLine === funcOrVarObject.modifyingFunctions[i][0] && userFunctionReturns[p].endLine === funcOrVarObject.modifyingFunctions[i][1]) {

                        funcObj = Object.assign({}, userFunctionReturns[p]);
                        break;
                    }
                }

                //if it's called before lineNumber, add it to the list [name, [startline, endlline]]
                if (funcObj.callsTo != null && funcObj.callsTo.length > 0) {
                    if (funcObj.callsTo[0] >= lineNumber) {
                        modFuncs.push([funcObj.startLine, funcObj.endLine]);
                    }
                }
            }


            //append any ops within their bounds to opsBefore
            for (var i in opList) {
                if (!opsBefore.includes(opList[i].op)) {
                    var isBefore = false;
                    for (var p in opList[i].lines) {
                        for (var j in modFuncs) {
                            if (opList[i].lines[p] >= modFuncs[j][0] && opList[i].lines[p] <= modFuncs[j][1]) {
                                isBefore = true;
                                break;
                            }
                        }
                        if (isBefore) {
                            opsBefore.push(opList[i].op);
                            break;
                        }
                    }
                }
            }

        }
        else if (funcOrVar === "func") {
            //if any other functions are called within the bounds of this function

            var containedFuncs = [];

            for (var i in userFunctionReturns) {
                if (userFunctionReturns[i].callsTo != null) {
                    for (var p in userFunctionReturns[i].callsTo) {
                        if (userFunctionReturns[i].callsTo[p] >= funcOrVarObject.startLine && userFunctionReturns[i].callsTo[p] <= funcOrVarObject.endLine) {
                            containedFuncs.push(userFunctionReturns[i]);
                        }
                    }
                }
            }

            //append ops from THEIR opslists to opsBefore
            for (var i in containedFuncs) {
                for (var p in containedFuncs[i].opsDone) {
                    if (!opsBefore.includes(containedFuncs[i].opsDone[p].op)) {
                        opsBefore.push(containedFuncs[i].opsDone[p].op);
                    }
                }
            }
        }



        return opsBefore;
    }


    /* AST nodes do not always easliy distinguish between floats and ints.
    * Helper function to disambiguate.
    * @param - AST "Num" node
    * @returns True or False
    */
    function isNodeFloat(node) {
        if (node._astname === "Num") {
            var sourceIndex = node.lineno - 1;

            //if we're sure it's a float
            if (!Number.isInteger(node.n.v)) {
                return true;
            }

            else {
                //otherwise, we check for a decimal point in the actual line of code.
                var strVal = String(node.n.v);
                var lineString = studentCode[sourceIndex];
                var valueIndex = node.col_offset;
                var valToTrim = lineString.substring(valueIndex);
                var valueString = "";
                var done = false;

                for (var t = 0; t < valToTrim.length; t++) {
                    if (valToTrim[t] != '.' && valToTrim[t] != '-' && isNaN(parseInt(valToTrim[t]))) {
                        break;
                    }
                    else {
                        valueString += valToTrim[t];
                    }
                }

                if (valueString.includes('.')) {
                    return true;
                }
                else return false;
            }
        }
    }


    /* Handles the addition of information about conditional lines to allConditionals
    * @param node - the conditional AST node
    */
    function notateConditional(node) {

        var lastLine = getLastLine(node);

        //fills in a list of lines where else statements for this conditional occur
        function addElse(node, elseLineList) {
            if (node.orelse != null && node.orelse.length > 0) {
                elseLineList.push(node.orelse[0].lineno);
                addElse(node.orelse[0], elseLineList);
            }
        }

        //determines if the conditional in question is inside another conditional
        function findParent(startLine, endLine, nodeList) {
            var parentNode = null

            for (var i in nodeList) {
                if (nodeList[i].children.length > 0) {
                    parentNode = findParent(startLine, endLine, nodeList[i].children)
                }
                if (parentNode == null) {
                    if (nodeList[i].start < startLine && nodeList[i].end >= endLine) {
                        parentNode = nodeList[i];
                        break;
                    }
                }

            }

            return parentNode;
        }

        //pushes this conditional's object to its parent's list of children
        function pushParent(child, parentStart, parentEnd, nodeList) {
            for (var i in nodeList) {
                if (nodeList[i].start === parentStart && nodeList[i].end === parentEnd) {
                    nodeList[i].children.push(child);
                }
                else if (nodeList[i].start <= parentStart && nodeList[i].end >= parentEnd) {
                    pushParent(child, parentStart, parentEnd, nodeList[i].children);
                    break;
                }

            }
        }

        //Have we already marked this exact conditional before?
        function doesAlreadyExist(start, end, nodeList) {

            for (var i in nodeList) {
                if (nodeList[i].children.length > 0) {
                    if (doesAlreadyExist(start, end, nodeList[i].children)) {
                        return true;
                    }
                }
                if (nodeList[i].start == start && nodeList[i].end == end) {
                    return true;
                }


            }

            return false;
        }



        //get all orelse locations
        var elseLines = [];
        addElse(node, elseLines);
        elseLines.push(lastLine);

        var newObjects = [];

        if (elseLines.length > 0) {
            var firstNode = { start: node.lineno, end: elseLines[0], children: [] };
            newObjects.push(firstNode);
            for (var i = 0; i < elseLines.length - 1; i++) {
                var newNode = { start: elseLines[i], end: elseLines[i + 1], children: [] };
                newObjects.push(newNode);
            }
        }
        else {
            var firstNode = { start: node.lineno, end: elseLines[0], children: [] };
            newObjects.push(firstNode);
        }

        //is this a child node?
        var isChild = findParent(node.lineno, lastLine, allConditionals);
        //go through, replacing isChild with the object its a child of if found
        if (isChild != null) {
            for (var i in newObjects) {
                if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, allConditionals)) {
                    pushParent(newObjects[i], isChild.start, isChild.end, allConditionals);
                }
            }
        }
        else {
            for (var i in newObjects) {
                if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, allConditionals)) {
                    allConditionals.push(newObjects[i]);
                }
            }
        }

    }


    /**
    *Determine whether the structure of an AST node is sufficiently original from the structure of sample code
    *@param node The node whose originality the function is to check
    *@param threshold The number of tree edits required between the given node and all sample nodes for the node to be marked original
    *@param sampleList The list of sample structures. If called from outside the function, this should be STRUCTURE_SAMPLES.
    *@returns true if the node is sufficiently original from all nodes in sample code; false otherwise
    */
    function TreeOriginality(node, threshold, sampleList) {
        var studentAST = buildSimplifiedAST(node);
        numericizeSimplifiedAST(studentAST);
        for (var i in sampleList) {
            var distance = computeEditDistance(studentAST, sampleList[i]);
            if (distance < threshold) {
                return false;
            }
            if (bodyIDs.includes(sampleList[i].id)) {
                if (!TreeOriginality(node, threshold, sampleList[i].children)) {
                    return false;
                }
            }
        }
        return true;


    }


    //This script from github.com/schulzch/edit-distance-js used under the Apache 2.0 license: https://www.apache.org/licenses/LICENSE-2.0.  Copyright © 2016 Christoph Schulz.

    function postOrderWalk(root, childrenCb, visitCb) {
        var child, children, firstChild, index, k, len, node, ref1, ref2, ref3, ref4, stack1, stack2;
        stack1 = [];
        stack2 = [];
        stack1.push([void 0, root]);
        while (stack1.length > 0) {
            ref1 = stack1.pop(), index = ref1[0], node = ref1[1];
            children = childrenCb(node);
            firstChild = (ref2 = children != null ? children[0] : void 0) != null ? ref2 : null;
            stack2.push([index, node, firstChild]);
            ref3 = children != null ? children : [];
            for (index = k = 0, len = ref3.length; k < len; index = ++k) {
                child = ref3[index];
                stack1.push([index, child]);
            }
        }
        while (stack2.length > 0) {
            ref4 = stack2.pop(), index = ref4[0], node = ref4[1], firstChild = ref4[2];
            visitCb(index, node, firstChild);
        }
    }

    function ted(rootA, rootB, childrenCb, insertCb, removeCb, updateCb) {
        var fdist, i, j, k, l, len, len1, preprocess, ref1, ref2, tA, tB, tdist, tdistance, treeDistance, ttrack;
        preprocess = function (root) {
            var t;
            t = {
                nodes: [],
                llds: [],
                keyroots: []
            };
            postOrderWalk(root, childrenCb, function (index, node, firstChild) {
                var childIndex, lldIndex, nIndex;
                nIndex = t.nodes.length;
                t.nodes.push(node);
                if (firstChild == null) {
                    lldIndex = nIndex;
                } else {
                    childIndex = t.nodes.indexOf(firstChild);
                    lldIndex = t.llds[childIndex];
                }
                t.llds.push(lldIndex);
                if (index !== 0) {
                    t.keyroots.push(nIndex);
                }
            });
            t.keyroots.sort();
            return t;
        };
        treeDistance = function (i, j) {
            var a, aL, aN, b, bL, bN, iOff, jOff, k, l, m, min, n, o, p, q, r, ref1, ref2, ref3, ref4;
            aL = tA.llds;
            bL = tB.llds;
            aN = tA.nodes;
            bN = tB.nodes;
            iOff = aL[i] - 1;
            jOff = bL[j] - 1;
            m = i - aL[i] + 2;
            n = j - bL[j] + 2;
            for (a = k = 1, ref1 = m; k < ref1; a = k += 1) {
                fdist[a][0] = fdist[a - 1][0] + removeCb(aN[a + iOff]);
            }
            for (b = l = 1, ref2 = n; l < ref2; b = l += 1) {
                fdist[0][b] = fdist[0][b - 1] + insertCb(bN[b + jOff]);
            }
            for (a = o = 1, ref3 = m; o < ref3; a = o += 1) {
                for (b = r = 1, ref4 = n; r < ref4; b = r += 1) {
                    if (aL[i] === aL[a + iOff] && bL[j] === bL[b + jOff]) {
                        min = trackedMin(fdist[a - 1][b] + removeCb(aN[a + iOff]), fdist[a][b - 1] + insertCb(bN[b + jOff]), fdist[a - 1][b - 1] + updateCb(aN[a + iOff], bN[b + jOff]));
                        ttrack[a + iOff][b + jOff] = min.index;
                        tdist[a + iOff][b + jOff] = fdist[a][b] = min.value;
                    } else {
                        p = aL[a + iOff] - 1 - iOff;
                        q = bL[b + jOff] - 1 - jOff;
                        fdist[a][b] = Math.min(fdist[a - 1][b] + removeCb(aN[a + iOff]), fdist[a][b - 1] + insertCb(bN[b + jOff]), fdist[p][q] + tdist[a + iOff][b + jOff]);
                    }
                }
            }
        };
        tA = preprocess(rootA);
        tB = preprocess(rootB);
        ttrack = zero(tA.nodes.length, tB.nodes.length);
        tdist = zero(tA.nodes.length, tB.nodes.length);
        fdist = zero(tA.nodes.length + 1, tB.nodes.length + 1);
        ref1 = tA.keyroots;
        for (k = 0, len = ref1.length; k < len; k++) {
            i = ref1[k];
            ref2 = tB.keyroots;
            for (l = 0, len1 = ref2.length; l < len1; l++) {
                j = ref2[l];
                treeDistance(i, j);
            }
        }
        tdistance = tdist[tA.nodes.length - 1][tB.nodes.length - 1];
        return new Mapping(tA, tB, tdistance, ttrack, tedBt);
    }

    function trackedMin(a, b, c) {
        var min;
        min = {
            value: a,
            index: 0 | 0
        };
        if (b < min.value) {
            min.value = b;
            min.index = 1 | 0;
        }
        if (c < min.value) {
            min.value = c;
            min.index = 2 | 0;
        }
        return min;
    }

    function zero(width, height) {
        var i, j, k, l, ref, ref1, x, y;
        x = new Array(width);
        for (i = k = 0, ref = width; k < ref; i = k += 1) {
            y = x[i] = new Array(height);
            for (j = l = 0, ref1 = height; l < ref1; j = l += 1) {
                y[j] = 0;
            }
        }
        return x;
    }

    function tedBt(tA, tB, ttrack) {
        var i, j, mapping;
        mapping = [];
        i = tA.nodes.length - 1;
        j = tB.nodes.length - 1;
        while (i >= 0 && j >= 0) {
            switch (ttrack[i][j]) {
                case 0:
                    mapping.push([tA.nodes[i], null]);
                    --i;
                    break;
                case 1:
                    mapping.push([null, tB.nodes[j]]);
                    --j;
                    break;
                case 2:
                    mapping.push([tA.nodes[i], tB.nodes[j]]);
                    --i;
                    --j;
                    break;
                default:
                    throw new Error("Invalid operation " + ttrack[i][j] + " at (" + i + ", " + j + ")");
            }
        }
        if (i === -1 && j !== -1) {
            while (j >= 0) {
                mapping.push([null, tB.nodes[j]]);
                --j;
            }
        }
        if (i !== -1 && j === -1) {
            while (i >= 0) {
                mapping.push([tA.nodes[i], null]);
                --i;
            }
        }
        return mapping;
    }
    bind = function (fn, me) { return function () { return fn.apply(me, arguments); }; };

    Mapping = (function () {
        function Mapping(a1, b1, distance, track, backtrackFn) {
            this.a = a1;
            this.b = b1;
            this.distance = distance;
            this.track = track;
            this.backtrackFn = backtrackFn;
            this.alignment = bind(this.alignment, this);
            this.pairs = bind(this.pairs, this);
            this.pairCache = null;
        }

        Mapping.prototype.pairs = function () {
            if (this.pairCache == null) {
                this.pairCache = this.backtrackFn(this.a, this.b, this.track);
            }
            return this.pairCache;
        };

        Mapping.prototype.alignment = function () {
            var alignmentA, alignmentB, k, len, pair, pairs, ref;
            pairs = this.pairs();
            alignmentA = [];
            alignmentB = [];
            ref = pairs.reverse();
            for (k = 0, len = ref.length; k < len; k++) {
                pair = ref[k];
                alignmentA.push(pair[0]);
                alignmentB.push(pair[1]);
            }
            return {
                alignmentA: alignmentA,
                alignmentB: alignmentB
            };
        };

        return Mapping;

    })();
    //end scripts from schulzch/edit-distance-js



    /**
    *Compute the edit distance (including additions, removals, and changes between two simplified AST nodes from buildSimplifiedAST
    *@param nodeA The first node
    *@param nodeB The node to compare nodeA to
    *@returns integer edit distance
    */
    function computeEditDistance(nodeA, nodeB) {
        // Define cost functions.
        var insert, remove, update;
        insert = remove = function (node) { return 1; };
        update = function (nodeA, nodeB) {
            return nodeA.id !== nodeB.id ? 1 : 0;
        };
        var children = function (node) { return node.children; };

        // Compute edit distance, mapping, and alignment.
        var tedObj = ted(nodeA, nodeB, children, insert, remove, update);


        //get the alignment, and work with that.
        //should be hierarchical
        //ignore unchanged body nodes.
        var astDistance = 0;
        var pairs = tedObj.pairs();
        var bodyNodes = [];

        for (var i in pairs) {
            var pair = pairs[i];
            if (pair[0] == null || pair[1] == null) {
                //addition or removal
                astDistance += 1;
            }
            else if (pair[0].id != pair[1].id) {
                //update
                astDistance += 1;
            }
            else if ((pair[0].id === pair[1].id) && (pair[0].parent != null && pair[1].parent != null) && (pair[0].parent != pair[1].parent) && pair[0].id != 2) {
                //this is for if the nodes are the same and their parent is different and not a body, which also constitutes an edit.
                astDistance += 1;
            }
        }
        return astDistance;

    }




    /**
     * Recursively analyze a python abstract syntax tree and build a simplified, partially canonicalized AST for equivalence use and MAYBE edit distance, depending on how much time Erin has.
     *DO NOT CALL THIS FUNCTION until AFTER allVariables and userDefinedFunctions have been filled (i.e., only call from AnalyzePythonNode)! These are used to get variable datatypes.
     * @param node {AST Node} The node to canonicalize
     */
    function buildSimplifiedAST(node) {
        if (node != null && node._astname != null) {
            if (node._astname === "Expr") {
                node = node.value;
            }


            var returnObject = {};
            returnObject.id = 'empty';
            returnObject.children = [];

            if (node._astname === "For") {
                returnObject.id = "for";
                var targetObj = buildSimplifiedAST(node.target);


                //iterator can be an iterable datatype OR a range() call
                var iteratorObj = buildSimplifiedAST(node.iter);

                returnObject.children[0] = targetObj;
                returnObject.children[1] = iteratorObj;

                var bodyObj = {
                    id: "body"
                };
                var bodyChildren = [];

                for (var i in node.body) {
                    var inBodyObj = buildSimplifiedAST(node.body[i]);
                    if (inBodyObj != null) {
                        bodyChildren.push(inBodyObj);
                    }
                }

                if (bodyChildren.length > 0) {
                    bodyObj.children = bodyChildren;
                }

                returnObject.children[2] = bodyObj;

            }
            else if (node._astname === "While") {
                returnObject.id = "while";
                var testObj = buildSimplifiedAST(node.test);

                returnObject.children[0] = testObj;
                var bodyNodes = { id: "body" };
                var bodyChildren = [];


                for (var i in node.body) {
                    var bodyObj = buildSimplifiedAST(node.body[i]);
                    bodyChildren.push(bodyObj);
                }

                if (bodyChildren.length > 0) {
                    bodyNodes.children = bodyChildren;
                }

                returnObject.children[1] = bodyNodes;

            }
            else if (node._astname === "FunctionDef") {
                returnObject.id = "def";
                var argsObj = { id: "args" };
                var argChildren = []


                for (var i in node.args.args) {
                    var singleArg = buildSimplifiedAST(node.args.args[i]);
                    argChildren.push(singleArg);
                }
                if (argChildren.length > 0) {
                    argsObj.children = argChildren;
                }

                returnObject.children[0] = argsObj;

                var bodyObj = { id: 'body' };
                var bodyChildren = [];

                for (var i in node.body) {
                    var inBodyObj = buildSimplifiedAST(node.body[i]);
                    bodyChildren.push(inBodyObj);
                }

                if (bodyChildren.length > 0) {
                    bodyObj.children = bodyChildren;
                }

                returnObject.children[1] = bodyObj;
            }
            else if (node._astname === "If") {
                returnObject.id = "conditional";
                var testObj = buildSimplifiedAST(node.test);
                returnObject.children[0] = testObj;


                if (node.orelse != null && node.orelse.length > 0) {
                    var orElseObj = buildSimplifiedAST(node.orelse[0]);
                    returnObject.children[1] = orElseObj;
                }

                else {
                    returnObject.children[1] = { id: 'empty' };
                }

                if (node.body != null) {
                    var bodyObjs = { id: "body" };
                    var bodyChildren = [];

                    for (var i in node.body) {
                        var bodyObj = buildSimplifiedAST(node.body[i]);
                        bodyChildren.push(bodyObj);

                    }
                    if (bodyChildren.length > 0) {
                        bodyObjs.children = bodyChildren;
                    }

                    returnObject.children[2] = bodyObjs;
                }
                else {
                    returnObject.children[2] = { id: 'empty' };
                }
            }
            else if (node._astname === "Assign") {
                returnObject.id = "assign";

                var targetObj = buildSimplifiedAST(node.target);
                returnObject.children[0] = targetObj;

                var valueObj = buildSimplifiedAST(node.value);
                returnObject.children[1] = valueObj;
            }
            else if (node._astname === "Subscript") {
                returnObject.id = "subscript";

                var sliceObj = buildSimplifiedAST(node.slice);
                var slicedValue = buildSimplifiedAST(node.value);

                returnObject.children[0] = sliceObj;
                returnObject.children[1] = slicedValue;

            }
            else if (node._astname === "Slice") {
                returnObject.id = "slice";

                var upperObj = buildSimplifiedAST(node.upper);
                var lowerObj = buildSimplifiedAST(node.lower);

                returnObject.children[0] = upperObj;
                returnObject.children[1] = lowerObj;

                var stepObj = buildSimplifiedAST(node.step);
                returnObject.children[2] = stepObj;

            }

            else if (node._astname === "Index") {
                returnObject.id = "index";
                var indexValue = buildSimplifiedAST(node.value);

                returnObject.children[0] = indexValue;

            }
            else if (node._astname === "AugAssign") {
                //augassign gets expanded. "i += j" becomes "i = i + j"
                returnObject.id = "assign";

                var targetObj = buildSimplifiedAST(node.target);
                returnObject.children[0] = targetObj;

                //we need to do the fake binop thing
                var fakeBinOp = {
                    _astname: "BinOp",
                    left: node.target,
                    right: node.value,
                    op: { name: node.op.name }
                };

                var valueObj = buildSimplifiedAST(fakeBinOp);
                returnObject.children[1] = valueObj;
            }
            else if (node._astname === "Attribute") {
                returnObject.id = "attr";
                returnObject.children[0] = { id: node.v };
                //TODO this should work but I'm leaving the todo in here in case it breaks
            }
            else if (node._astname === "Call") {
                returnObject.id = "call";
                var funcObj = buildSimplifiedAST(node.func);
                var argsObj = { id: "args" };
                var argsList = [];


                if ('args' in node) {
                    for (var i in node.args) {
                        var singleArgObj = buildSimplifiedAST(node.args[i]);
                        argsList.push(singleArgObj);

                    }
                }

                if (argsList.length > 0) {
                    argsObj.children = argsList;
                }

                else if ('attr' in node) {
                    args = buildSimplifiedAST(node.func.value);

                    if (args.id !== "empty") {
                        argsObj.children = [args];
                    }
                }

                returnObject.children[0] = funcObj;
                returnObject.children[1] = argsObj;
            }
            else if (node._astname === "Return") {
                returnObject.id = "return";
                var valueObj = buildSimplifiedAST(node.value);

                if (valueObj != null) {
                    returnObject.children[0] = valueObj;
                }
            }
            else if (node._astname === "Compare") {
                returnObject.id = "compare";
                var op = node.ops[0].name;
                if (op !== "NotEq") {
                    var reverse = false;

                    if (op === "GtE") {
                        reverse = true;
                        op = "LtE";
                    }

                    if (op === "Gt") {
                        op = "Lt";
                        reverse = true;
                    }

                    var leftObj = node.left;
                    var rightObj = node.comparators[0];

                    if (reverse) {
                        var container = leftObj;
                        leftObj = rightObj;
                        rightObj = container;
                    }

                    leftObj = buildSimplifiedAST(leftObj);
                    rightObj = buildSimplifiedAST(rightObj);

                    returnObject.children[0] = leftObj;
                    returnObject.children[1] = rightObj;
                    returnObject.children[2] = { id: op };
                }
                else {
                    //then handle the not-equal
                    op = "Eq";
                    //right value is a fake node

                    var fakeNode = { _astname: "Not", value: node.comparators[0] };
                    var rightObj = buildSimplifiedAST(fakeNode);
                    var leftObj = buildSimplifiedAST(node.left)

                    returnObject.children[0] = leftObj;
                    returnObject.children[1] = rightObj;
                    returnObject.children[2] = { id: op };
                }
            }
            else if (node._astname === "UnaryOp") {
                if (node.op.name === "Not") {
                    var fakeNode = {
                        _astname: "not",
                        value: node.operand
                    };

                    returnObject.id = "not";
                    returnObject.children[0] = buildSimplifiedAST(fakeNode);
                }
                else {
                    returnObject.children[0] = { id: 'empty' };
                }
            }
            else if (node._astname === "Not") {
                returnObject.id = "not";
                var valueObj = buildSimplifiedAST(node.value);
                returnObject.children[0] = valueObj;
            }
            else if (node._astname === "BoolOp") {
                returnObject.id = "boolop";

                //properties are op and an array of value nodes. "op" and "values"
                returnObject.children[0] = { id: node.op.name };

                var valuesObj = { id: 'values' };
                var valsList = [];


                for (var i in node.values) {
                    var singleVal = buildSimplifiedAST(node.values[i]);
                    valsList.push(singleVal);
                }
                if (valsList.length > 0) {
                    valuesObj.children = valsList;
                }

                returnObject.children[1] = valuesObj;

            }
            else if (node._astname === "BinOp") {
                returnObject.id = "binop";


                var leftObj = buildSimplifiedAST(node.left);
                var rightObj = buildSimplifiedAST(node.right);

                returnObject.children[0] = { id: node.op.name };
                returnObject.children[1] = leftObj;
                returnObject.children[2] = rightObj;
            }
            else if (node._astname === "Name") {
                if (node.id.v === "True" || node.id.v === "False") {
                    returnObject.id = "bool";
                }

                else {
                    var varName = node.id.v;
                    if (getVariableObject(varName) != null) {
                        returnObject.id = "var";
                        returnObject.children[0] = { id: getVariableObject(varName).value.toLowerCase() };
                    }
                    else {

                        //function ref
                        if (getFunctionObject(varName) != null) {
                            returnObject.id = "Function";

                            if (getFunctionObject(varName) != null && getFunctionObject(varName).returns != null) {
                                returnObject.children[0] = { id: getFunctionObject(varName).returns.toLowerCase() };
                            }
                        }
                        else {
                            //is it None???
                            if (node.id.v === "None") {
                                returnObject.id = "null";
                            }
                        }

                    }
                }
            }
            else if (node._astname === "Num") {
                //int or float
                var numVal = node.n.v;

                if ( isNodeFloat(node)) {
                    returnObject.id = "float";
                }
                else returnObject.id = "int";
            }
            else if (node._astname === "Str") {
                returnObject.id = "str";
            }
            else if (node._astname === "List" || node._astname === "Tuple") {
                if (node._astname === "List") {
                    returnObject.id = "list";
                }
                else {
                    returnObject.id = "tuple";
                }

                //beyond this these things are identical, for our purposes. Both have elts, and that's what we care about.
                var eltsObj = { id: "elts" };
                var eltsChildren = [];


                for (var i in node.elts) {
                    var eltObj = buildSimplifiedAST(node.elts[i]);
                    eltsChildren.push(eltObj);
                }


                if (eltsChildren.length > 0) {
                    eltsObj.children = eltsChildren;
                }
                returnObject.children[0] = eltsObj;
            }
            if (returnObject.children.length === 0) {
                var idVal = returnObject.id;
                returnObject = { id: idVal };
            }
            if (returnObject.id == null || returnObject.id === "") {
                returnObject.id = "empty";
            }

            return returnObject;
        }

        return { id: 'empty' };
    }

    /* Converts a simplified AST tree to a numberic representation for the purpose of judging edit distance
    * @param simplifiedAST - the simplified AST to be converted
    */
    function numericizeSimplifiedAST(simplifiedAST) {
        var astID = simplifiedAST.id;
        var newID = simplifiedASTdictionary[astID];

        if (newID == null) {
            newID = 0;  //should never happen
        }
        simplifiedAST.id = newID;

        //replace old string ID with numeric id


        if ('children' in simplifiedAST) {

            for (var i in simplifiedAST.children) {
                numericizeSimplifiedAST(simplifiedAST.children[i]);
                simplifiedAST.children[i].parent = newID;
            }
        }


    }


    /* Appends one opList array to another.
    * This is a separate function because our opLists have a very specific format.
    * @param source - The source opList to be appended
    * @param target - The opList to which the source values will be appended
    * @returns target list with source list appended.
    */
    function appendOpList(source, target) {
        for (var a = 0; a < source.length; a++) {
            for (var b = 0; b < source[a].lines.length; b++) {
                target =  addOpToList(source[a].op, target, source[a].lines[b]);
            }
        }
        return target;
    }

    /* Attempts to determine the value of a BinOp object.
       * @param binOp - A binOp OBJECT (not AST node) whose value we want to know
       * @returns - String of datatype output of the binOp node represented by the object, OR a binop object representing the node
       */
    function recursivelyEvaluateBinOp(binOp) {
        //evaluate the left
        if (typeof binOp.left === 'string') {
            //then it's a function call, variable, OR we already know what it is
            if (binOp.left.includes(':')) {
                //then it's just the value of a variable or a function return.
                if (binOp.left.includes(':')) {
                    //check if it's a var or a func
                    if (binOp.left.startsWith("var")) {
                        //it's a variable
                        varName = binOp.left.split(':')[1];
                        var leftVar = getVariableObject(varName);
                        if (leftVar != null) {
                            // if (allVariables[i].containedValue != null && allVariables[i].containedValue !== "") {
                            if (leftVar.value == "List") {
                                binOp.left = leftVar.containedValue;
                            }
                            else {
                                binOp.left = leftVar.value;
                            }
                        }
                    }

                    else {
                        //it's a function
                        funcName = binOp.left.split(':')[1];
                        var binOpFunc = getFunctionObject(funcName);

                        if (binOpFunc != null) {
                            if (binOpFunc.returns === "List" && binOpFunc.stringElements != null) {
                                binOp.left = binOpFunc.stringElements[0].elts;
                            }
                            else {
                                binOp.left = binOpFunc.returns;
                            }
                        }
                    }
                }
            }
        }
        //if the left side is a subscript node
        else if (binOp.left != null && typeof binOp.left === 'object' && binOp.left._astname != null && binOp.left._astname === "Subscript") {
            var newSub =  retrieveFromList(binOp.left);
            if (newSub != null) {
                var newVal =  getTypeFromNode(newSub);
                if (newVal !== "") {
                    binOp.left = newVal;
                }
            }
        }

        //otherwise, the left node is another binOp object - evaluate that
        else if (!Array.isArray(binOp.left)) {
            binOp.left = recursivelyEvaluateBinOp(binOp.left);
        }


        //evaluate the right
        if (typeof binOp.right === 'string') {
            //then it's a function call, variable, or we already know what it is
            if (binOp.right.includes(':')) {
                if (binOp.right.includes(':')) {
                    //check if it's a var or a func
                    if (binOp.right.startsWith("var")) {
                        //it's a variable
                        varName = binOp.right.split(':')[1];
                        var rightVar = getVariableObject(varName);

                        if (rightVar != null) {
                            binOp.right = rightVar.value;
                        }

                    }

                    else {
                        //it's a function
                        funcName = binOp.right.split(':')[1];
                        var rightFunc = getFunctionObject(funcName);

                        if (rightFunc != null) {
                            binOp.right = rightFunc.returns;
                        }
                    }
                }
            }
        }
        //if the right side is a subscript node
        else if (binOp.right != null && typeof binOp.right === 'object' && binOp.right._astname != null && binOp.right._astname === "Subscript") {
            var newSub =  retrieveFromList(binOp.right);
            if (newSub != null) {
                var newVal =  getTypeFromNode(newSub);
                if (newVal !== "") {
                    binOp.right = newVal;
                }
            }
        }
        //otherwise, it's a binop object
        else if (!Array.isArray(binOp.right)) {
            binOp.right = recursivelyEvaluateBinOp(binOp.right);
        }



        //then, evaluate if possible
        if (binOp.left === "Str" || binOp.right === "Str") {
            binOp = "Str";
        }
        else if (binOp.left === "Int" && binOp.right === "Int") {
            binOp = "Int";
        }
        else if ((binOp.left === "Float" && binOp.right === "Float") || (binOp.left === "Float" && binOp.right === "Int") || (binOp.left === "Int" && binOp.right === "Float")) {
            binOp = "Float";
        }

        //get all the contents of lists
        else if (Array.isArray(binOp.left) && Array.isArray(binOp.right)) {
            var allListVals = [];

            for (var k = 0; k < binOp.left.length; k++) {
                allListVals.push(binOp.left[k]);
            }
            for (var k = 0; k < binOp.right.length; k++) {
                allListVals.push(binOp.right[k]);
            }

            binOp = allListVals;
        }

        return binOp; //A BinOp object if values are still unknown, a string if we know what's up.
    }





    /*Gets all types within a boolop, binop, list, or compare node. Returns array of strings.
    * @param node - The AST node in question
    * @param typesWithin - an array to which the datatypes found in the node will be pushed
    * @param inputIndexingObj - an object including "input," "indexed," and "strIndexed" properties that will be set to true if any of these properties are found
    * @param opList - A formatted list of operations done.
    * @returns - filled typesWithin array.
    */
    function listTypesWithin(node, typesWithin, inputIndexingObj, opList) {
        var thisNode =  retrieveFromList(node);
        if (thisNode != null) {
            if (thisNode._astname === "BinOp") {
                opList =  addOpToList("BinOp", opList, thisNode.lineno);

                //check left and right
                listTypesWithin(thisNode.left, typesWithin, inputIndexingObj, opList);
                listTypesWithin(thisNode.right, typesWithin, inputIndexingObj, opList);
            }
            if (thisNode._astname === "List") {
                typesWithin.push("List");

                //check elements
                for (var listItem = 0; listItem < thisNode.elts.length; listItem++) {
                    listTypesWithin(thisNode.elts[listItem], typesWithin, inputIndexingObj, opList);
                }
            }
            if (thisNode._astname === "BoolOp") {
                opList =  addOpToList("BoolOp", opList, thisNode.lineno);
                typesWithin.push("Bool");

                //check values
                for (var boolItem = 0; boolItem < thisNode.values.length; boolItem++) {
                    listTypesWithin(thisNode.values[boolItem], typesWithin, inputIndexingObj, opList);
                }
            }
            if (thisNode._astname === "Compare") {
                opList =  addOpToList("Compare", opList, thisNode.lineno);
                typesWithin.push("Bool");

                //check left side
                listTypesWithin(thisNode.left, typesWithin, inputIndexingObj, opList);
                //check comparators
                for (var compareItem = 0; compareItem < thisNode.comparators.length; compareItem++) {
                    listTypesWithin(thisNode.comparators[compareItem], typesWithin, inputIndexingObj, opList);
                }
            }
            if (thisNode._astname === "UnaryOp") {
                opList =  addOpToList("BoolOp", opList, thisNode.lineno);
                typesWithin.push("Bool");
                //check operand
                listTypesWithin(thisNode.operand, typesWithin, inputIndexingObj, opList);
            }

            //OR, it's a call, int, float, string, bool, or var

            //bool int, float, str
            if (thisNode._astname === "Num") {
                if (! isNodeFloat(thisNode)) {
                    typesWithin.push("Int");
                }
                else {
                    typesWithin.push("Float");
                }
            }
            if (thisNode._astname === "Str") {
                typesWithin.push("Str");
            }
            if (thisNode._astname === "Name" && (thisNode.id.v === "True" || thisNode.id.v === "False")) {
                typesWithin.push("Bool");
            }

            //vairable
            else if (thisNode._astname === "Name") {
                var includedVar = getVariableObject(thisNode.id.v);
                if (includedVar != null && typeof includedVar.value === "string" && includedVar.value !== "" && includedVar.value !== "BinOp") {
                    typesWithin.push(includedVar.value);

                    for (var c = 0; c < includedVar.containedValue.length; c++) {
                        typesWithin.push(includedVar.containedValue[c]);
                    }

                    opList =  appendOpList(includedVar.opsDone, opList);
                     copyAttributes(includedVar.indexAndInput, inputIndexingObj, ["indexed", "strIndexed", "input"]);
                }
            }

            //function call
            if (thisNode._astname === "Call") {
                var funcName = "";
                var functionNode =  retrieveFromList(thisNode.func);

                if ('attr' in functionNode) {
                    funcName = functionNode.attr.v;
                }
                if ('id' in functionNode) {
                    funcName = functionNode.id.v;
                }

                //if it's a listop or strop we have to get types in args
                var isListFunc, isStrFunc = false;

                //disambiguation for functions that can go for strings or arrays
                if (JS_STR_LIST_OVERLAP.includes(funcName) && isJavascript) {
                    var opValType =  getTypeFromNode(functionNode.value);
                    if (opValType === "List") {
                        isListFunc = true;
                    }
                    else if (opValType === "Str") {
                        isStrFunc = true;
                    }
                    else if (opValType === "") {
                        isListFunc, isStrFunc = true;
                    }
                }

                //check value
                if (listFuncs.includes(funcName) && !isStrFunc) {
                    opList =  addOpToList("ListOp", opList, thisNode.lineno);
                    listTypesWithin(functionNode.value, typesWithin, inputIndexingObj, opList);
                }

                if (strFuncs.includes(funcName) && !isListFunc) {
                    opList =  addOpToList("StrOp", opList, thisNode.lineno);
                    listTypesWithin(functionNode.value, typesWithin, inputIndexingObj, opList);
                }

                var calledFunc = getFunctionObject(funcName);

                if (calledFunc != null) {
                    if (typeof calledFunc.returns === "string") {
                        typesWithin.push(calledFunc.returns);
                    }
                    if (calledFunc.containedValue != null) {
                         appendArray(calledFunc.containedValue, typesWithin);
                    }
                    if (calledFunc.opsDone != null) {
                        opList =  appendOpList(calledFunc.opsDone, opList);
                    }
                    if (calledFunc.indexAndInput != null) {
                         copyAttributes(calledFunc.indexAndInput, inputIndexingObj, ["indexed", "strIndexed", "input"]);
                    }
                }
            }
        }
        return typesWithin;
    }



    /*Recursive function to find out what's in a BinOp AST node.
    * @param node - An AST "BinOp" node
    * @returns a BinOp object (if values are left to be calculated), an array of contained types (if the binOp represents a list), or a string representing the resulting datatype.
    */
    function recursivelyAnalyzeBinOp(node) {

        if (node.left != null && node.left._astname == null) {
            //in case a binop obj gets passed to it by accident
            return  recursivelyEvaluateBinOp(node);
        }

        //return getAllBinOpLists
        var leftNode = node.left;
        var rightNode = node.right;
        var leftVal = "";
        var rightVal = "";

        //what kind value is on the left?
        leftNode =  retrieveFromList(leftNode);

        if (leftNode != null) {
            if (leftNode._astname === "BinOp") {
                leftVal = recursivelyAnalyzeBinOp(leftNode);
            }

            if (leftNode._astname === "UnaryOp") {
                leftVal = "Bool";
            }
            if (leftNode._astname === "Name") {
                if (leftNode.id.v === "True" || leftNode.id.v === "False") {
                    leftVal = "Bool";
                }

                else {
                    var leftVariable = getVariableObject(leftNode.id.v);

                    if (leftVariable != null && leftVariable.value !== "" && leftVariable.value !== "BinOp") {
                        leftVal = leftVariable.value;
                    }
                    if (leftVal === "List") {
                        leftVal = mostRecentElements(leftVariable, node.lineno);
                    }
                    if (leftVariable != null && leftVariable.value === "BinOp") {
                        leftVal = leftVariable.binOp;
                    }
                    if (leftVal == null || leftVal === "") {
                        leftVal = "var:" + leftNode.id.v;
                    }
                }
            }

            if (leftNode._astname === "Call") {
                leftVal =  getCallReturn(leftNode);
                if (leftVal == null && 'id' in leftNode.func) {
                    leftVal = "func:" + leftNode.func.id.v;
                }
            }

            if (leftNode._astname === "List") {
                leftVal = leftNode.elts;
            }
            if (leftNode._astname === "Str") {
                leftVal = "Str";
            }
            if (leftNode._astname === "Num") {
                if (! isNodeFloat(leftNode)) {
                    leftVal = "Int";
                }
                else {
                    leftVal = "Float";
                }
            }

            if (leftNode._astname === "Compare" || leftNode._astname === "BoolOp") {
                leftVal = "Bool";
            }

        }
        else {
            leftVal = node.left;
        }


        //what kind of value is on the irght?
        rightNode =  retrieveFromList(rightNode);

        if (rightNode != null) {
            if (rightNode._astname === "BinOp") {
                rightVal = recursivelyAnalyzeBinOp(rightNode);
            }
            if (rightNode._astname === "UnaryOp") {
                rightVal = "Bool";
            }
            if (rightNode._astname === "Name") {
                if (rightNode.id.v === "True" || rightNode.id.v === "False") {
                    rightVal = "Bool";
                }
                else {
                    var rightVariable = getVariableObject(rightNode.id.v);

                    if (rightVariable != null && rightVariable.value !== "" && rightVariable.value !== "BinOp") {
                        rightVal = rightVariable.value;
                    }
                    if (rightVal === "List") {
                        rightVal = mostRecentElements(rightVariable, node.lineno);
                    }
                    if (rightVariable != null && rightVariable.value === "BinOp") {
                        rightVal = rightVariable.binOp;
                    }
                    if (rightVal == null || rightVal === "") {
                        rightVal = "var:" + rightNode.id.v;
                    }
                }
            }


            if (rightNode._astname === "Call") {
                rightVal =  getCallReturn(rightNode);

                if (rightVal == null && 'id' in rightNode.func) {
                    rightVal = "func:" + rightNode.func.id.v;
                }
            }
            if (rightNode._astname === "List") {
                rightVal = rightNode.elts;
            }
            if (rightNode._astname === "Str") {
                rightVal = "Str";
            }
            if (rightNode._astname === "Num") {
                if (! isNodeFloat(rightNode)) {
                    rightVal = "Int";
                }
                else {
                    rightVal = "Float";
                }
            }

            if (rightNode._astname === "Compare" || rightNode._astname === "BoolOp") {
                rightVal = "Bool";
            }
        }
        else {
            rightVal = node.right;
        }


        //if types match, return a string
        if (typeof leftVal === "string" && typeof rightVal === "string" && leftVal === rightVal && !leftVal.includes(':')) {
            return leftVal;
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



    /* Helper function for apiCalls accessory output.
    * Gathers the values of all arguments in a function call.
    * @param argArray - an array of AST nodes representing arguments or list elements
    * @returns - Array of values, datatypes, and variable names, dependent on what information is available.
    */
    function getArgValuesFromArray(argArray, lineno) {

        var returnArray = [];

        for (var i in argArray) {
            var argument =  retrieveFromList(argArray[i]);
            var argumentObject = "";

            if (argument != null) {
                //first, attempt to get the actual value.
                if (argument._astname === "Name") {
                    if (getVariableObject(argument.id.v) != null) {
                        argument =  getMostRecentValue(getVariableObject(argument.id.v), lineno);
                    }
                    else {
                        argumentObject = argument.id.v;
                    }
                }

                if (argument != null) {
                    if (argument._astname === "Num") {
                        argumentObject = argument.n.v;
                    }
                    else if (argument._astname === "Str") {
                        argumentObject = argument.s.v;
                    }
                    else if (argument._astname === "List") {
                        argumentObject = getArgValuesFromArray(argumentObject.elts, lineno);
                    }
                }

                //if impossible, fall back to datatype, or leave empty
                if (argumentObject === "") {
                    argumentObject =  getTypeFromNode(argument);
                }

                returnArray.push(argumentObject);
            }
        }

        return returnArray;

    }


    /* Trims comments and leading/trailing whitespace from lines of Python and JS code.
    * @param stringToTrim - the value to be trimmed
    * @returns the string with comments and leading/trailing whitespace removed.
    */
    function trimCommentsAndWhitespace(stringToTrim) {
        var returnString = stringToTrim;

        //strip out any trailing comments
        if (!isJavascript && returnString.includes('#')) {
            var singleQuotes = 0;
            var doubleQuotes = 0;
            var commentIndex = -1;

            //python uses #

            for (var s in returnString) {
                //we use the number of single and double quotes (odd versus even) to determine whether any # or // is actually part of a string and NOT a comment.
                if (returnString[s] === "'") {
                    singleQuotes++;
                }
                if (returnString[s] === '"') {
                    doubleQuotes++;
                }
                if (returnString[s] === "#") {
                    //we have a #. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                    if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                        commentIndex = s;
                        break;
                    }
                }
            }
            if (commentIndex != -1) {
                returnString = returnString.substring(0, commentIndex);
            }
        }

        //Javascript uses //
        if (isJavascript) {
            if (returnString.includes('//')) {
                var singleQuotes = 0;
                var doubleQuotes = 0;
                var commentIndex = -1;

                for (var s in returnString) {
                    if (returnString[s] === "'") {
                        singleQuotes++;
                    }
                    if (returnString[s] === '"') {
                        doubleQuotes++;
                    }
                    if (returnString[s] === "/" && s < returnString.length - 1 && returnString[s + 1] === "/") {
                        //we have a double slash. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                        if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                            commentIndex = s;
                            break;
                        }
                    }
                }
                if (commentIndex != -1) {
                    returnString = returnString.substring(0, commentIndex);
                }
            }
        }


        returnString = returnString.trim();  //then any leading/trailing spaces
        return returnString;
    }


    /*gets the most LIKELY value of a variable object's array of elts, based upon the line of reference.
    * @param variableObj - the variable object whose values are desired
    * @param callingLine - the line at which this check is occurring
    * @returns - An array of AST nodes
    */
    function mostRecentElements(variableObj, callingLine) {
        var inFunction = null;
        var correctElts = null;

        //check whether the current line is inside or outside of a function declaration
        for (var u = 0; u < userFunctionReturns.length; u++) {
            if (callingLine >= userFunctionReturns[u].startLine && callingLine <= userFunctionReturns[u].endLine) {
                inFunction = [userFunctionReturns[u].startLine, userFunctionReturns[u].endLine];
                break
            }
        }


        if (inFunction != null) {
            //check inside the function FIRST
            var furthestLine = -1;

            for (var eltsItem = 0; eltsItem < variableObj.nodeElements.length; eltsItem++) {
                if (variableObj.nodeElements[eltsItem].line > inFunction[1] || variableObj.nodeElements[eltsItem].line > callingLine) {
                    break;
                }
                if (variableObj.nodeElements[eltsItem].line >= inFunction[0]) {
                    furthestLine = eltsItem;
                }
            }
            if (furthestLine > -1) {
                return variableObj.nodeElements[furthestLine].elts;
            }
        }

        //if we haven't returned, OR if we're  not in a function, look for the most recent NOT IN FUNCTION elts.
        var finalElts = null;
        for (var eltsItem = 0; eltsItem < variableObj.nodeElements.length; eltsItem++) {
            if (variableObj.nodeElements[eltsItem].line > callingLine) {
                break;
            }

            if (variableObj.nodeElements[eltsItem].line <= callingLine) {
                // is it in a function? this only counts if it's NOT in a function
                var isInFunction = false;

                for (var udfNumber = 0; udfNumber < userFunctionReturns.length; udfNumber++) {
                    if (variableObj.nodeElements[eltsItem].line >= userFunctionReturns[udfNumber].startLine && variableObj.nodeElements[eltsItem].line <= userFunctionReturns[udfNumber].endLine) {
                        isInFunction = true;
                        break;
                    }
                }
                if (!isInFunction) {
                    finalElts = variableObj.nodeElements[eltsItem].elts;
                }
            }
        }

        //return the most likely value
        if (finalElts == null && (variableObj.nodeElements.length > 0)) {
            finalElts = variableObj.nodeElements[0].elts;
        }

        return finalElts;
    }


    /* Gets the last line in a multiline block of code.
    * @param functionNode - The node in questions
    * @returns - Integer representing the line number of the last line of the block.
    */
    function getLastLine(functionNode) {
        if (!('body' in functionNode) || functionNode.body.length === 0) {
            return functionNode.lineno;
        }

        var lastLine = getLastLine(functionNode.body[functionNode.body.length - 1]);

        //if the node has a "body" or "orelse" component, this may end later than what we have marked.
        if ('body' in functionNode.body[functionNode.body.length - 1]) {
            var bodyLast = getLastLine(functionNode.body[functionNode.body.length - 1]);
            if (bodyLast > lastLine) {
                lastLine = bodyLast;
            }
        }
        if ('orelse' in functionNode && functionNode.orelse.length > 0) {
            var orElseLast = getLastLine(functionNode.orelse[functionNode.orelse.length - 1]);
            if (orElseLast > lastLine) {
                lastLine = orElseLast;
            }
        }

        return lastLine;
    }


    /* Do we know the value of all function returns and variables?
    * @returns true or false
    */
    function allReturnsFilled() {
        allFilled = true; // gets flagged as false if a function return or variable value is not yet known.


        //go through the list of uer-defined functions. if the return value is unknown, flag allFilled to false.
        for (j = 0; j < userFunctionReturns.length; j++) {
            if (typeof userFunctionReturns[j].returns != 'string' ||
                userFunctionReturns[j].returns === "" ||
                userFunctionReturns[j].returns === "BinOp" ||
                userFunctionReturns[j].returns === "Subscript") {

                allFilled = false;
            }

            if (userFunctionReturns[j].returns === "List" && userFunctionReturns[j].containedValue != null) {
                for (var k = 0; k < userFunctionReturns[j].containedValue.length; k++) {
                    if (userFunctionReturns[j].containedValue[k].includes(':')) {
                        allFilled = false;
                        break;
                    }
                }
            }

            if (allFilled === false) {
                break;
            }
        }

        //do the same thing with allVariables
        for (j = 0; j < allVariables.length; j++) {

            if (typeof allVariables[j].value != 'string' || allVariables[j].value === "" || allVariables[j].value === "BinOp" || allVariables[j].value === "Subscript") {
                allFilled = false;
            }

            if (allVariables[j].value === "List" && allVariables[j].containedValue != null) {
                for (var k = 0; k < allVariables[j].containedValue.length; k++) {
                    if (allVariables[j].containedValue[k].includes(':')) {
                        allFilled = false;
                        break;
                    }
                }

                for (var p in allVariables[j].assignedModified) {
                    if (!Array.isArray(allVariables[j].assignedModified[p].binop) && (typeof allVariables[j].assignedModified[p].binop !== "string")) {
                        allFilled = false;
                    }
                }
            }
            if (allFilled === false) {
                break;
            }
        }

        return allFilled;
    }




    //Finds Variable object given the variable name. If not found, returns null.
    function getVariableObject(variableName) {
        for (var r = 0; r < allVariables.length; r++) {
            if (allVariables[r].name === variableName) { return allVariables[r]; }
        }
        return null;
    }


    //Find the User Function Return object by the function name. If not found, returns null.
    function getFunctionObject(funcName) {
        for (var u = 0; u < userFunctionReturns.length; u++) {
            if (userFunctionReturns[u].name === funcName) { return userFunctionReturns[u]; }
        }
        return null;
    }


    /* fGets any variable values stored inside any AST node
    * @param nodeToCheck - the AST value we're looking in.
    * @param nameList - an empty array that will be filled with the names of any nested variables
    * @returns filled array with names of contained variables
    */
    function getNestedVariables(nodeToCheck, nameList) {


        function checkNode(nodeComponent, nameList) {
            if (nodeComponent == null) {
                return nameList;
            }
            if (nodeComponent._astname === "Name" && nodeComponent.id.v !== "True" && nodeComponent.id.v !== "False" && getVariableObject(nodeComponent.id.v) != null) {
                //if this node represents a variable, add its name to the list
                nameList.push(nodeComponent.id.v);
            }

            if (nodeComponent in ["BinOp", "List", "Compare", "BoolOp", "Subscript"] ||  retrieveFromList(nodeComponent) != nodeComponent) {
                //if it's a BinOp or list, call the parent function recursively.
                getNestedVariables(nodeComponent, nameList);
            }

            return nameList;
        }

        //call checkNode() on appropriate parts of nodes that contain other nodes
        if (nodeToCheck._astname === "List") {
            for (var p = 0; p < nodeToCheck.elts.length; p++) {
                checkNode(nodeToCheck.elts[p], nameList);
            }
        }
        else if (nodeToCheck._astname === "BinOp") {
            checkNode(nodeToCheck.left, nameList);
            checkNode(nodeToCheck.right, nameList);
        }
        else if (nodeToCheck._astname === "Compare") {
            checkNode(nodeToCheck.left, nameList);
            for (var p = 0; p < nodeToCheck.comparators.length; p++) {
                checkNode(nodeToCheck.comparators[p], nameList);
            }
        }
        else if (nodeToCheck._astname === "BoolOp") {
            for (var t = 0; t < nodeToCheck.values.length; t++) {
                checkNode(nodeToCheck.values[t], nameList);
            }
        }
        else if (nodeToCheck._astname === "UnaryOp") {
            checkNode(nodeToCheck.operand, nameList);
        }
        else if (nodeToCheck._astname === "Subscript") {
            if (nodeToCheck.slice._astname === "Index") {
                checkNode(nodeToCheck.slice.value, nameList);
            }
            else if (nodeToCheck.slice._astname === "Slice") {
                checkNode(nodeToCheck.slice.upper, nameList);
                checkNode(nodeToCheck.slice.lower, nameList);
            }
            checkNode(nodeToCheck.value, nameList);
        }
        else if ( retrieveFromList(nodeToCheck) != nodeToCheck) {
            checkNode(nodeToCheck.func.value, nameList);
            if (nodeToCheck.args.length > 0) {
                checkNode(nodeToCheck.args[0], nameList);
            }
        }


        return nameList;
    }



    return {
        appendArray: appendArray, 
        levenshtein: levenshtein,
        copyAttributes: copyAttributes,
        checkForMatch: checkForMatch,
        getTypeFromNode: getTypeFromNode,
        retrieveFromList: retrieveFromList,
        nodesToStrings: nodesToStrings,
        getNumberCallReturn: getNumberCallReturn,
        getCallReturn: getCallReturn,
        getMostRecentValue: getMostRecentValue,
        doAstNodesMatch: doAstNodesMatch,
        performListOp: performListOp,
        doesCallCreateList: doesCallCreateList,
        doesCallCreateString: doesCallCreateString,
        isCallAStrOp: isCallAStrOp,
        getIndexingInNode: getIndexingInNode,
        getStringIndexingInNode: getStringIndexingInNode,
        addOpToList: addOpToList,
        opsBeforeLine: opsBeforeLine,
        isNodeFloat: isNodeFloat,
        TreeOriginality: TreeOriginality,
        notateConditional: notateConditional,
        appendOpList: appendOpList,
        recursivelyEvaluateBinOp: recursivelyEvaluateBinOp,
        recursivelyAnalyzeBinOp: recursivelyAnalyzeBinOp,
        listTypesWithin: listTypesWithin,
        getArgValuesFromArray: getArgValuesFromArray,
        trimCommentsAndWhitespace: trimCommentsAndWhitespace,
        mostRecentElements: mostRecentElements,
        getLastLine: getLastLine,
        allReturnsFilled: allReturnsFilled,
        getNestedVariables: getNestedVariables
    };
});
