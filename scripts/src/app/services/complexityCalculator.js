/**
/**
 * An angular factory service for parsing and analyzing abstract syntax trees
 * without compiling the script, e.g. to measure code complexity.
 *
 * @module complexityCalculator
 * @author Creston Bunch, Erin Truesdell
 */

app.factory('complexityCalculator', ['complexityCalculatorHelperFunctions', function complexityCalculator(complexityCalculatorHelperFunctions) {

    //variable init
    // var studentCode;
    var sampleLines = [];
    /**
      * Build the abstract syntax tree for Python. Useful for analyzing script
      * complexity or looking for specific function call e.g. onLoop().
      *
      * @param source {String} The source code to analyze.
      * @private
      */
    function pythonAst(source) {
        try {
            var parse = Sk.parse("<analyzer>", source);
            studentCode = source.split("\n");
            return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags);
        } catch (error) {
            //userNotification.show(ESMessages.general.complexitySyntaxError, 'failure2', 5);
            throw error;
        }
    }

    function apiCalls() {
        return apiCalls;
    }

    /**
    *Translate recorded integer values from the results into human-readable English
    *@param resultsObj The results object.
    */
    function translateIntegerValues(resultsObj) {
        Object.keys(resultsObj).forEach(function (key) {

            //0 = does not use 1 = uses 2 = uses original
            if (resultsObj[key] === 0) {
                resultsObj[key] = "Does Not Use";
            }
            else if (resultsObj[key] === 1) {
                resultsObj[key] = "Uses";
            }
            else if (resultsObj[key] === 2) {
                if (key === "consoleInput") {
                    resultsObj[key] = "Takes Console Input Originally";
                }
                else {
                    resultsObj[key] = "Uses Original";
                }
            }
            else if (resultsObj[key] === 3) {
                if (Level3OriginalForPurpose.includes(key)) {
                    resultsObj[key] = "Uses Originally For Purpose";
                }
                else {
                    if (key === "forLoops" && !isJavascript) {
                        resultsObj[key] = "Uses Originally With Range Min/Max";
                    }
                    else if (key === "forLoops" && isJavascript) {
                        resultsObj[key] = "Uses Originally With Two Arguments";
                    }
                    else if (key === "conditionals") {
                        resultsObj[key] = "Uses Originally to Follow Multiple Code Paths";
                    }
                    else if (key === "userFunc") {
                        resultsObj[key] = "Uses and Calls Originally";
                    }
                    else if (key === "consoleInput") {
                        resultsObj[key] = "Takes Input Originally and Uses For Purpose";
                    }
                }
            }

            else {
                //levels 3 and beyond are more topic-specific
                if ((key === "lists" || key === "strings") && resultsObj[key] === 4) {
                    resultsObj[key] = "Uses And Indexes Originally For Purpose OR Uses Originally And Iterates Upon";
                }
                if (key === "variables" && resultsObj[key] === 4) {
                    resultsObj[key] = "Uses Originally And Transforms Value";
                }
                if (key === "forLoops") {
                    if (resultsObj[key] === 4 && !isJavascript) {
                        resultsObj[key] = "Uses Originally With Range Min/Max And Increment";
                    }
                    else if (resultsObj[key] === 4 && isJavascript) {
                        resultsObj[key] = "Uses Originally With Three Arguments";
                    }
                    else if (resultsObj[key] === 5) {
                        resultsObj[key] = "Uses Original Nested Loops";
                    }
                }
            }
            if (key === "userFunc") {
                if (resultsObj[key] === "Returns") {
                    resultsObj[key] = "Uses Originally And Returns Values";
                }
                else if (resultsObj[key] === "Args") {
                    resultsObj[key] = "Uses Originally And Takes Arguments";
                }
                else if (resultsObj[key] === "ReturnAndArgs") {
                    resultsObj[key] = "Uses Originally, Takes Arguments, And Returns Values";
                }
            }
        });
    }



    /**
     * Analyze the source code of a Python script.
     * @param source {String} The source code to analyze.
     * @returns {Object} A summary of the analysis.
     */
    function analyzePython(source) {

        apiCalls = [];
        allCalls = [];
        allConditionals = [];
        variableAssignments = [];

        listFuncs = PY_LIST_FUNCS;
        strFuncs = PY_STR_FUNCS;
        createListFuncs = PY_CREATE_LIST_FUNCS;
        createStrFuncs = PY_CREATE_STR_FUNCS;

        //initialize all of the lists we'll use in each code reading
        originalityLines = [];
        loopLocations = [];
        dataTypes = [];
        functionLines = [];
        uncalledFunctionLines = [];
        userFunctionParameters = [];
        makeBeatRenames = [];
        userFunctionRenames = [];
        forLoopFuncs = [];
        allVariables = [];

        //initialize list of function return objects with all functions from the API that return something (includes casting), using a slice to make a copy so as not to overwrite anything in starterReturns
        userFunctionReturns = starterReturns.slice(0);

        var ast = pythonAst(source);
        replaceNumericUnaryOps(ast.body);
        //initialize the results object
        var resultsObject = {
            userFunc: 0,
            conditionals: 0,
            forLoops: 0,
            lists: 0,
            strings: 0,
            ints: 0,
            floats: 0,
            booleans: 0,
            variables: 0,
            listOps: 0,
            strOps: 0,
            boolOps: 0,
            comparisons: 0,
            mathematicalOperators: 0,
            consoleInput: 0
        };
        isJavascript = false;

        //PASS 0: efficient originality
        checkOriginality();
        //PASS 1: Do the same thing for function returns from user-defined functions
        evaluateuserFunctionParameters(ast, resultsObject);
        //PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
        gatherAllVariables(ast);
        //PASS 3: Account for the variables that only exist as function params.
        evaluateFunctionReturnParams(ast);
        //use information gained from labeling user functions to fill in missing variable info, and vice-versa.
        iterations = 0;
        while (!complexityCalculatorHelperFunctions.allReturnsFilled() && iterations < 10) {
            evaluateAllEmpties();
            iterations++;
        }
        recursiveAnalyzeAST(ast, resultsObject, [false, false]);
        //PASS 4: Actually analyze the Python.

        //boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
        if (resultsObject.boolOps > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.boolOps;
        }
        if (resultsObject.comparisons > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.comparisons;
        }

        //console.log(lineDict());

       // translateIntegerValues(resultsObject);   //translate the calculated values
        lineDict();
        results = resultsObject;
        caiErrorHandling.updateNames(allVariables, userFunctionParameters);
        return resultsObject;
    }

    /* Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
    * @param ast - the Python or Javascript AST object
    */
    function replaceNumericUnaryOps(ast) {
        for (var i in ast) {
            if (ast[i] != null && ast[i]._astname != null) {
                if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) { ast[i] = ast[i].operand; }
                else if (ast[i] != null && 'body' in ast[i]) {
                    for (var p in ast[i].body) {
                        replaceNumericUnaryOps(ast[i].body[p]);
                    }
                }
                replaceNumericUnaryOps(ast[i]);
            }
        }
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




    /*Fills userFunctionParameters list
    * @param ast - An AST tree or node
    * @param results - the results object.
    */
    function evaluateuserFunctionParameters(ast, results) {
        if (ast != null && ast.body != null) {
            angular.forEach(ast.body, function (node) {
                checkForFunctions(node, results);
                evaluateuserFunctionParameters(node, results);
            });
        }
        else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === 'object'))) {
            angular.forEach(ast, function (node) {
                checkForFunctions(node, results);
                evaluateuserFunctionParameters(node, results);
            });
        }
    }

    /*Fills allVariables list
   * @param ast - An AST tree or node
   * @param results - the results object.
   */
    function gatherAllVariables(ast) {
        if (ast != null && ast.body != null) {
            angular.forEach(ast.body, function (node) {
                markVariable(node);
                gatherAllVariables(node);
            });
        }
        else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === 'object'))) {
            angular.forEach(ast, function (node) {
                markVariable(node);
                gatherAllVariables(node);
            });
        }
    }

    /*Adds a variable to allVariables along with its contents if a node includes a variable assignment.
    *Also marks bourdaries of for and while loops for use later
    * @param node - the AST node to be marked
    */
    function markVariable(node) {
        var fakeBinOp = null;

        //Javascript for loops can include both variable declarations and updates (augassign)
        if (node != null && node._astname != null && node._astname === "JSFor") {
            //mark the loop bounds for later labeling of variable value changes.
            var startLine = node.lineno;
            var endLine = complexityCalculatorHelperFunctions.getLastLine(node);

            loopLocations.push([startLine, endLine]);

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
            loopLocations.push([node.lineno, complexityCalculatorHelperFunctions.getLastLine(node)]);
        }

        //Python for loops. Also, JS foreach loops get sent here.
        if (node != null && node._astname != null && node._astname === "For") {
            //mark the loop bounds for later labeling of variable value changes.
            var startLine = node.lineno;
            var endLine = complexityCalculatorHelperFunctions.getLastLine(node);
            loopLocations.push([startLine, endLine]);

            var nodeIter = node.iter;
            if (nodeIter != null) {
                if (node.target._astname === "Name") {
                    if (getVariableObject(node.target.id.v) == null) {

                        //if it's not already stored in a var, we create a new variable object
                        //get the variable's name

                        var varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.target);
                        if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                            return;
                        }
                        var targetName = varTarget.id.v;


                        //initialize variable object
                        var newVariable = {
                            name: targetName,
                            value: "",
                            binOp: null,
                            flagVal: "",
                            funcVar: "",
                            containedValue: [],
                            indexAndInput: {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            },
                            nested: false,
                            original: false,
                            opsDone: [],
                            assignedModified: [],
                            modifyingFunctions: [],
                            nodeElements: [],
                            stringElements: []
                        };

                        var fakeValue = { _astname: "" }; //for later chacks of variable's "latest value"
                        //handling for if the iterator is a unary op or subscript node

                        if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0] && complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[1]) {
                            newVariable.indexAndInput.indexed = true;
                        }

                        nodeIter = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter);


                        //end unary/subscript handling
                        if (nodeIter != null) {
                            if (nodeIter._astname === "Call") {
                                if ('func' in nodeIter && 'id' in nodeIter.func && nodeIter.func.id.v === 'range') {
                                    //python range()
                                    newVariable.value = "Int";
                                    fakeValue = { _astname: "Num", n: { v: 1 } };
                                }
                                else if ('func' in nodeIter && 'id' in nodeIter.func) {
                                    if (nodeIter.func.id.v === "readInput") {
                                        //readinput
                                        newVariable.indexAndInput.input = true;
                                        fakeValue = { _astname: "Str", s: { v: "string" } };
                                    }

                                    var funcReturnObj = getFunctionObject(nodeIter.func.id.v);
                                    if (funcReturnObj != null) {
                                        if (funcReturnObj.returns === "List") {
                                            if (funcReturnObj.nodeElements != null && funcReturnObj.nodeElements.length > 0) {
                                                fakeValue = funcReturnObj.nodeElements[0].elts[0];
                                            }
                                            if (funcReturnObj.stringElements != null) {
                                                newVariable.value = funcReturnObj.stringElements[0];
                                            }
                                            if (funcReturnObj.stringElements[0]._astname === "Name") {
                                                var userFunc = getFunctionObject(funcReturnObj.stringElements[0].id.v);
                                                if (userFunc != null) {

                                                    var forFuncObj = {
                                                        startline: node.lineno,
                                                        endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                                        callName: targetName,
                                                        functionNames: []
                                                    };

                                                    for (var i in funcReturnObj.stringElements) {
                                                        var listItem = complexityCalculatorHelperFunctions.retrieveFromList(funcReturnObj.stringElements[i]);

                                                        if (listItem != null && listItem._astname === "Name") {
                                                            var itemIsFunction = false;
                                                            for (var u in userFunctionParameters) {
                                                                if (userFunctionParameters[u].name === listItem.id.v) {
                                                                    itemIsFunction = true;
                                                                    break;
                                                                }
                                                            }
                                                            if (itemIsFunction) {
                                                                forFuncObj.functionNames.push(listItem.id.v);
                                                            }
                                                        }
                                                    }

                                                    forLoopFuncs.push(forFuncObj);
                                                    newVariable.value = "userFunction";
                                                }
                                            }
                                        }
                                        if (funcReturnObj.returns === "Str") {
                                            newVariable.value = "Str";
                                            fakeValue = { _astname: "Str", s: { v: "string" } };
                                        }
                                        complexityCalculatorHelperFunctions.copyAttributes(funcReturnObj, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                    }
                                }
                            }
                            //listop/strop
                            if ('func' in nodeIter && 'attr' in complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func)) {
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeIter)) {
                                    newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", newVariable.opsDone, nodeIter.lineno);

                                    //assume first item in list is type
                                    var listVal = complexityCalculatorHelperFunctions.performListOp(nodeIter)[0][0];
                                    fakeValue = listVal;
                                    if (listVal._astname === "BinOp") {
                                        var binList = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(listVal);

                                        if (Array.isArray(listVal)) {
                                            var eltsStorage = listVal;
                                            listVal = {};
                                            listVal._astname = "List";
                                            listVal.elts = eltsStorage;
                                        }

                                        else if (typeof listVal !== "string") {
                                            listVal._astname = "";
                                            newVariable.value = "BinOp";
                                            newVariable.binOp = listVal;
                                        }

                                        else {
                                            listVal._astname = "";
                                            newVariable.value = listVal;
                                        }

                                        //fill containedValue array
                                        complexityCalculatorHelperFunctions.listTypesWithin(listVal, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    }


                                    if (listVal._astname === "List") {
                                        newVariable.value = "List";
                                        newVariable.nodeElements = [{
                                            line: node.lineno,
                                            elts: listVal.elts
                                        }];

                                        newVariable.stringElements = [{
                                            line: node.lineno,
                                            elts: complexityCalculatorHelperFunctions.nodesToStrings(targetElts, node.lineno)
                                        }];

                                        newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(listVal, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    }

                                    else if (listVal._astname === "Num") {
                                        if (!complexityCalculatorHelperFunctions.isNodeFloat(listVal)) {
                                            newVariable.value = "Int";
                                        }
                                        else {
                                            newVariable.value = "Float";
                                        }
                                    }

                                    else if (listVal._astname === "Str") {
                                        newVariable.value = "Str";
                                    }

                                    else if (listVal._astname === "Name") {
                                        if ('id' in listVal) {
                                            if (listVal.id.v === "True" || listVal.id.v === "False") {
                                                newVariable.value = "Bool";
                                            }
                                            else if (getFunctionObject(listVal.id.v) != null) {
                                                //a function.
                                                var userFunc = getFunctionObject(listVal.id.v);

                                                var forFuncObj = {
                                                    startline: node.lineno,
                                                    endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                                    callName: targetName,
                                                    functionNames: []
                                                };

                                                for (var i in funcReturnObj.stringElements) {
                                                    var listItem = complexityCalculatorHelperFunctions.retrieveFromList(funcReturnObj.stringElements[i]);

                                                    if (listItem != null && listItem._astname === "Name") {
                                                        var itemIsFunction = false;
                                                        for (var u in userFunctionParameters) {
                                                            if (userFunctionParameters[u].name === listItem.id.v) {
                                                                itemIsFunction = true;
                                                                break;
                                                            }
                                                        }
                                                        if (itemIsFunction) {
                                                            forFuncObj.functionNames.push(listItem.id.v);
                                                        }
                                                    }
                                                }

                                                forLoopFuncs.push(forFuncObj);
                                                newVariable.value = "userFunction";

                                            }
                                            else {
                                                var listValVar = getVariableObject(listVal.id.v);
                                                newVariable.value = listValVar.value;

                                                complexityCalculatorHelperFunctions.copyAttributes(listValVar, newAttribute, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                            }
                                        }
                                    }
                                }

                                else if (complexityCalculatorHelperFunctions.doesCallCreateString(nodeIter)) {
                                    newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", newVariable.opsDone, nodeIter.lineno);
                                    newVariable.value = "Str";
                                }
                            }
                            if ('func' in nodeIter && (nodeIter.func._astname === "Subscript" || (complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func) != nodeIter.func))) {
                                var subVal = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func);

                                if (subVal != null && subVal._astname === "Name") {
                                    //it's a variable or function returns that contains an iterable type.

                                    var subObject = getVariableObject(subVal.id.v);
                                    if (subObject != null) {
                                        if (subObject.value === "List") {
                                            var varElements = complexityCalculatorHelperFunctions.mostRecentElements(subObject, node.lineno);

                                            if (varElements != null) {
                                                fakeValue = varElements[0];
                                                var firstItem = varElements[0];

                                                if (firstItem._astname === "Subscript") {
                                                    firstItem = complexityCalculatorHelperFunctions.retrieveFromList(firstItem);
                                                    newVariable.indexAndInput.indexed = true;
                                                }

                                                if (firstItem._astname === "List") {
                                                    newVariable.value = "List";
                                                    newVariable.nodeElements = [{
                                                        line: node.lineno,
                                                        elts: firstItem.elts
                                                    }];
                                                    newVariable.stringElements = [{
                                                        line: node.lineno,
                                                        elts: complexityCalculatorHelperFunctions.nodesToStrings(firstItem.elts, node.lineno)
                                                    }];

                                                    newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(firstItem, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                                }

                                                if (firstItem._astname === "Str") {
                                                    newVariable.value = "Str";
                                                }

                                                if (firstItem._astname === "Call") {
                                                    //listop
                                                    if (complexityCalculatorHelperFunctions.doesCallCreateList(firstItem)) {
                                                        var listResults = complexityCalculatorHelperFunctions.performListOp(firstItem);

                                                        newVariable.value = "List";
                                                        newVariable.nodeElements = [{
                                                            line: node.lineno,
                                                            elts: listResults[0]
                                                        }];
                                                        newVariable.stringElements = [{
                                                            line: node.lineno,
                                                            elts: listResults[1]
                                                        }];


                                                        newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(listResults[0], newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                                        newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", newVariable.opsDone, thisLine);
                                                    }
                                                    //strop
                                                    else if (complexityCalculatorHelperFunctions.doesCallCreateString(firstItem)) {
                                                        newVariable.value = "Str";
                                                    }

                                                    //subscript
                                                    else if (firstItem.func._astname === "Subscript" || (complexityCalculatorHelperFunctions.retrieveFromList(firstItem) != firstItem)) {
                                                        var callVar = null;
                                                        if (firstItem.func._astname === "Subscript") {
                                                            callVar = complexityCalculatorHelperFunctions.retrieveFromList(firstItem.func);
                                                        }
                                                        else {
                                                            callVar = complexityCalculatorHelperFunctions.retrieveFromList(firstItem);
                                                        }

                                                        if (callVar._astname === "Name" && 'id' in callVar) {
                                                            var subFunc = getFunctionObject(callVar.id.v);
                                                            if (subFunc != null) {
                                                                complexityCalculatorHelperFunctions.copyAttributes(subFunc, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "containedValue", "stringElements", "nodeElements", "original"]);
                                                                newVariable.value = subFunc.returns;
                                                            }
                                                        }

                                                    }
                                                    //user-defined function
                                                    else if ('id' in firstItem.func) {
                                                        var functionReturn = getFunctionObject(firstItem.func.id.v);
                                                        if (functionReturn != null) {
                                                            newVariable.value = functionReturn.returns;

                                                            complexityCalculatorHelperFunctions.copyAttributes(functionReturn,
                                                                newVariable,
                                                                ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue ", "nodeElements", "stringElements"]);
                                                        }
                                                    }
                                                }

                                                if (firstItem._astname === "Name") {
                                                    if ('id' in firstItem) {
                                                        var functionReturn = getFunctionObject(firstItem.func.id.v);

                                                        if (functionReturn != null) {
                                                            newVariable.value = functionReturn.returns;
                                                            complexityCalculatorHelperFunctions.copyAttributes(functionReturn,
                                                                newVariable,
                                                                ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue ", "nodeElements", "stringElements"]);
                                                        }

                                                        else {
                                                            if (firstItem.id.v === "True" || firstItem.id.v === "False") {
                                                                newVariable.value = "Bool";
                                                            }
                                                            else {
                                                                var firstVar = getVariableObject(firstItem.id.v);

                                                                if (firstVar != null) {
                                                                    complexityCalculatorHelperFunctions.copyAttributes(firstVar,
                                                                        newVariable,
                                                                        ["value", "flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }

                                                if (firstItem._astname === "BinOp") {
                                                    var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(firstItem);

                                                    if (typeof binVal === "string") {
                                                        newVariable.value = binVal;
                                                    }

                                                    else if (Array.isArray(binVal)) {
                                                        newVariable.value = "List";
                                                        complexityCalculatorHelperFunctions.listTypesWithin(binVal, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);

                                                        newVariable.nodeElements = [{
                                                            line: node.lineno,
                                                            elts: getAllBinOpLists(firstItem)
                                                        }];
                                                        newVariable.stringElements = [{
                                                            line: node.lineno,
                                                            elts: binVal
                                                        }];
                                                    }

                                                    else {
                                                        newVariable.value = "BinOp"
                                                        newVariable.binOp = binVal;
                                                    }
                                                }
                                            }
                                        }
                                        if (subObject.value === "Str") {
                                            newVariable.value = "Str";
                                            fakeValue = { _astname: "Str", s: { v: "string" } };
                                        }
                                    }

                                    subObject = getFunctionObject(subVal.id.v)
                                    if (subObject != null) {
                                        newVariable.value = subObject.returns;
                                        complexityCalculatorHelperFunctions.copyAttributes(subObject, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                        if (subObject.returns === "Str") {
                                            fakeValue = { _astname: "Str", s: { v: "string" } };
                                        }
                                        else if (subObject.returns === "List" && subObject.nodeElements != null && subObject.nodeElements.length > 0) {
                                            fakeValue = subObject.nodeElements[0].elts[0];
                                        }
                                    }
                                }
                            }

                            else if (nodeIter._astname === "Name") {
                                var iterVar = getVariableObject(nodeIter.id.v);

                                if (iterVar != null) {
                                    if (iterVar.value === "Str") {
                                        newVariable.value = "Str";
                                        fakeValue = { _astname: "Str", s: { v: "string" } };
                                    }

                                    if (iterVar.value === "List") {
                                        var varElements = complexityCalculatorHelperFunctions.mostRecentElements(iterVar, node.lineno);

                                        if (varElements != null && varElements.length > 0 && varElements[0]._astname === "Name") {
                                            fakeValue = varElements[0];
                                            var userFunc = getFunctionObject(varElements[0].id.v);
                                            if (userFunc != null) {

                                                //treat this like it's a created function that is actually all the other functions under a different name.
                                                var forFuncObj = {
                                                    startline: node.lineno,
                                                    endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                                    callName: targetName,
                                                    functionNames: []
                                                };


                                                for (var i in varElements) {
                                                    var listItem = complexityCalculatorHelperFunctions.retrieveFromList(varElements[i]);

                                                    if (listItem._astname === "Name") {
                                                        var listItemIsFunction = false;
                                                        for (var u in userFunctionParameters) {
                                                            if (userFunctionParameters[u].name === listItem.id.v) {
                                                                listItemIsFunction = true;
                                                                break;
                                                            }
                                                        }
                                                        if (listItemIsFunction) {
                                                            forFuncObj.functionNames.push(listItem.id.v);
                                                        }
                                                    }
                                                }
                                                newVariable.value = "userFunction";
                                                forLoopFuncs.push(forFuncObj);
                                            }
                                        }
                                        if (newVariable.value !== "userFunction" && varElements != null && varElements.length > 0) {
                                            newVariable.value = complexityCalculatorHelperFunctions.nodesToStrings(varElements, node.lineno)[0];
                                        }
                                        else if (newVariable.value !== "userFunction") { //make a fake subscript node and this can get tallied later
                                            newVariable.value = "Subscript";
                                            var fakeNode = {
                                                _astname: "Subscript",
                                                slice: { _astname: "Index", value: { n: { v: 0 } } },
                                                value: node.iter
                                            };

                                            newVariable.flagVal = fakeNode;
                                        }
                                    }
                                    complexityCalculatorHelperFunctions.copyAttributes(iterVar, newVariable, ["original", "funcVar", "flagVal", "binOp", "indexAndInput", "opsDone", "containedValue", "nodeElements", "stringElements"]);
                                }
                            }

                            else if (nodeIter._astname === "Str") {
                                newVariable.value = "Str";
                                newVariable.indexAndInput.strIndexed = true;
                                fakeValue = { _astname: "Str", s: { v: "string" } };
                            }

                            else if (nodeIter._astname === "List") {//we can assume that the type of the first item should reflect the rest of the list
                                newVariable.indexAndInput.indexed = true;
                                var firstValue = nodeIter.elts[0];
                                fakeValue = firstValue;
                                if (firstValue._astname === "BoolOp" || firstValue._astname === "Compare") {
                                    newVariable.value = "Bool";

                                    if (firstValue._astname === "BoolOp") {
                                        complexityCalculatorHelperFunctions.listTypesWithin(firstValue, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    }
                                    if (firstValue._astname === "Compare") {
                                        complexityCalculatorHelperFunctions.listTypesWithin(firstValue, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    }
                                }
                                if (firstValue._astname === "Name") {
                                    if ('id' in firstValue) {
                                        if (firstValue.id.v === "True" || firstValue.id.v === "False") {
                                            newVariable.value = "Bool";
                                        }
                                        else {
                                            var firstVar = getVariableObject(firstValue.id.v);

                                            if (firstVar != null) {
                                                complexityCalculatorHelperFunctions.copyAttributes(firstVar, newVariable, ["value", "flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "ektsList"]);
                                            }

                                            else {
                                                var userFunc = getFunctionObject(firstValue.id.v);

                                                if (userFunc != null) {
                                                    var forFuncObj = {
                                                        startline: node.lineno,
                                                        endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                                        callName: targetName,
                                                        functionNames: []
                                                    };

                                                    //now we have to get the list elts and shove EVERY function name in there. and validate that it is a function BECAUSE PYTHON IS STUPID
                                                    for (var i in nodeIter.elts) {
                                                        var iterListItem = nodeIter.elts[i];
                                                        iterListItem = complexityCalculatorHelperFunctions.retrieveFromList(iterListItem);
                                                        if (iterListItem._astname === "Name") {
                                                            var foundIter = false;
                                                            for (var u in userFunctionParameters) {
                                                                if (userFunctionParameters[u].name === iterListItem.id.v) {
                                                                    foundIter = true;
                                                                    break;
                                                                }
                                                            }
                                                            if (foundIter) { forFuncObj.functionNames.push(iterListItem.id.v); }
                                                        }
                                                    }

                                                    forLoopFuncs.push(forFuncObj);
                                                    newVariable.value = "userFunction";
                                                }
                                            }
                                        }
                                    }
                                }
                                else if (firstValue._astname === "Call") {
                                    if ('id' in firstValue.func) {
                                        var firstFunc = getFunctionObject(firstValue.func.id.v);
                                        if (firstFunc != null) {
                                            newVariable.value = firstFunc.returns;
                                            complexityCalculatorHelperFunctions.copyAttributes(firstFunc, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                        }
                                    }
                                    //subscript
                                    if (firstValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(firstValue) != firstValue) {
                                        var subVal = null;
                                        subVal = complexityCalculatorHelperFunctions.retrieveFromList(firstValue);
                                        if (subVal != null) {
                                            if ('id' in subVal) {
                                                var subFunction = getFunctionObject(subVal.id.v);

                                                if (subFunction != null) {
                                                    newVariable.value = subFunction.returns;
                                                    complexityCalculatorHelperFunctions.copyAttributes(subFunction, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                                }
                                            }
                                        }
                                    }
                                    //listop
                                    if (complexityCalculatorHelperFunctions.doesCallCreateList(firstValue)) {
                                        newVariable.value = "List";
                                        newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", newVariable.opsDone, node.lineno);
                                        var variableElts = complexityCalculatorHelperFunctions.performListOp(firstValue, node.lineno);

                                        newVariable.nodeElements = [{
                                            line: node.lineno,
                                            elts: variableElts[0]
                                        }];
                                        newVariable.stringElements = [{
                                            line: node.lineno,
                                            elts: variableElts[1]
                                        }];

                                        newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(firstValue, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone)
                                    }

                                    //strop
                                    if (complexityCalculatorHelperFunctions.isCallAStrOp(firstValue)) {
                                        newVariable.value = "Str";
                                        newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", newVariable.opsDone, node.lineno);
                                    }
                                }
                                else if (firstValue._astname === "List") {
                                    newVariable.value = "List";

                                    newVariable.nodeElements = [{
                                        line: node.lineno,
                                        elts: firstValue.elts
                                    }];
                                    newVariable.stringElements = [{
                                        line: node.lineno,
                                        elts: complexityCalculatorHelperFunctions.nodesToStrings(firstValue.elts, node.lineno)
                                    }];

                                    newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(firstValue, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                }

                                else if (firstValue._astname === "Str") {
                                    newVariable.value = "Str";
                                }

                                else if (firstValue._astname === "Num") {
                                    if (!complexityCalculatorHelperFunctions.isNodeFloat(firstValue)) {
                                        newVariable.value = "Int";
                                    }
                                    else {
                                        newVariable.value = "Float";
                                    }
                                }

                                else if (firstValue._astname === "Subscript") {
                                    var subValue = complexityCalculatorHelperFunctions.retrieveFromList(firstValue);

                                    if (subValue != null) {
                                        if (subValue._astname === "List") {
                                            newVariable.value = "List";
                                            newVariable.nodeElements = [{
                                                line: node.lineno,
                                                elts: subValue.elts
                                            }];
                                            newVariable.stringElements = [{
                                                line: node.lineno,
                                                elts: complexityCalculatorHelperFunctions.nodesToStrings(subValue.elts, node.lineno)
                                            }];
                                        }

                                        if (subValue._astname === "Name") {//variable or bool or function
                                            if ('id' in subValue) {
                                                if (subValue.id.v === "True" && subValue.id.v === "False") {
                                                    newVariable.value = "Bool";
                                                }
                                                else {
                                                    var foundVar = getVariableObject(subValue.id.v);
                                                    if (foundVar != null) {
                                                        complexityCalculatorHelperFunctions.copyAttributes(foundVar, newVariable, ["value", "indexAndInput", "original", "containedValue"]);
                                                    }

                                                    else {
                                                        var userFunc = getFunctionObject(subValue.id.v);

                                                        if (userFunc != null) {

                                                            var forFuncObj = {
                                                                startline: node.lineno,
                                                                endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                                                callName: targetName,
                                                                functionNames: []
                                                            };

                                                            //treat this like a series function renames
                                                            for (var i in nodeIter.elts) {
                                                                var iterListItem = nodeIter.elts[i];
                                                                iterListItem = complexityCalculatorHelperFunctions.retrieveFromList(iterListItem);

                                                                if (iterListItem._astname === "Name") {
                                                                    var foundIter = false;

                                                                    for (var u in userFunctionParameters) {
                                                                        if (userFunctionParameters[u].name === iterListItem.id.v) {
                                                                            foundIter = true;
                                                                            break;
                                                                        }
                                                                    }

                                                                    if (foundIter) {
                                                                        forFuncObj.functionNames.push(iterListItem.id.v);
                                                                    }
                                                                }
                                                            }

                                                            forLoopFuncs.push(forFuncObj);
                                                            newVariable.value = "userFunction";
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if (subValue._astname === "Call") {
                                            //listop
                                            if (complexityCalculatorHelperFunctions.doesCallCreateList(subValue)) {
                                                newVariable.value = "List";
                                                newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", newVariable.opsDone, node.lineno);


                                                var eltsObjects = complexityCalculatorHelperFunctions.performListOp(subValue);

                                                newVariable.nodeElements = [{
                                                    line: node.lineno,
                                                    elts: eltsObjects[0]
                                                }];
                                                newVariable.stringElements = [{
                                                    line: node.lineno,
                                                    elts: eltsObjects[1]
                                                }];
                                            }
                                            //strop
                                            if (complexityCalculatorHelperFunctions.doesCallCreateString(subValue)) {
                                                newVariable.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", newVariable.opsDone, node.lineno);
                                                newVariable.value = "Str";
                                            }
                                            //udf
                                            if ('id' in subValue.func) {
                                                var foundFunc = getFunctionObject(subValue.func.id.v);
                                                if (foundFunc != null) {
                                                    newVariable.value = foundFunc.returns;
                                                    complexityCalculatorHelperFunctions.copyAttributes(foundFunc, newVariable, ["nodeElements", "stringElements", "flagVal", "funcVar"]);
                                                }
                                            }
                                            //subscript
                                            if (subValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(subValue.func) != subValue.func) {
                                                var nestedSubscript = complexityCalculatorHelperFunctions.retrieveFromList(subValue.func);
                                                if (nestedSubscript != null && nestedSubscript._astname === "Name") {
                                                    var subFuncFound = getFunctionObject(nestedSubscript.id.v);
                                                    if (subFuncFound != null) {
                                                        complexityCalculatorHelperFunctions.copyAttributes(subFuncFound, newVariable, ["flagVal", "funcVar", "binOp", "indexAndInput", "opsDone", "original", "containedValue", "nodeElements", "stringElements"]);
                                                        newVariable.value = subFuncFound.returns;
                                                    }
                                                }
                                            }
                                        }

                                        if (subValue._astname === "Num") {
                                            if (!complexityCalculatorHelperFunctions.isNodeFloat(subValue)) {
                                                newVariable.value = "Int";
                                            }
                                            else {
                                                newVariable.value = "Float";
                                            }
                                        }
                                    }
                                }
                                else if (firstValue._astname === "BinOp") {
                                    var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(firstValue);

                                    if (typeof binVal === "string") {
                                        newVariable.value = binVal;
                                    }
                                    else if (Array.isArray(binVal)) {
                                        newVariable.value = "List";
                                        newVariable.stringElements = [{
                                            line: node.lineno,
                                            elts: binVal
                                        }];
                                        newVariable.nodeElements = [{
                                            line: node.lineno,
                                            elts: getAllBinOpLists(firstValue)
                                        }];
                                    }

                                    else {
                                        newVariable.value = "BinOp";
                                        newVariable.binOp = binVal;
                                    }

                                    complexityCalculatorHelperFunctions.listTypesWithin(firstValue, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                }
                            }
                            else if (nodeIter._astname === "BinOp") {//evaluate the binOp
                                var binopVar = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter);

                                if (binopVar.type === "string") {
                                    newVariable.value = binopVar;
                                    newVariable.opsDone = ["BinOp"];
                                    newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(nodeIter, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    fakeValue = { _astname: "Str", s: { v: "string" } };
                                }

                                else if (Array.isArray(binopVar)) {
                                    newVariable.value = "List";
                                    newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(nodeIter, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                    fakeValue = binOpVar[0];
                                    var allLists = getAllBinOpLists(binopVar);
                                    var userFunc = getFunctionObject(firstValue.id.v);
                                    if (userFunc != null) {

                                        var forFuncObj = {
                                            startline: node.lineno,
                                            endLine: complexityCalculatorHelperFunctions.getLastLine(node),
                                            callName: targetName,
                                            functionNames: []
                                        };

                                        //series of renames in forLoopFuncs
                                        for (var i in allLists) {
                                            var iterListItem = allLists[i];
                                            iterListItem = complexityCalculatorHelperFunctions.retrieveFromList(iterListItem);
                                            if (iterListItem != null && iterListItem._astname === "Name") {
                                                var foundIter = false;

                                                for (var u in userFunctionParameters) {

                                                    if (userFunctionParameters[u].name === iterListItem.id.v) {
                                                        foundIter = true;
                                                        break;
                                                    }

                                                }
                                                if (foundIter) {
                                                    forFuncObj.functionNames.push(iterListItem.id.v);
                                                }
                                            }
                                        }
                                        forLoopFuncs.push(forFuncObj);
                                        newVariable.value = "userFunction";
                                    }
                                }
                                else {
                                    newVariable.value = "BinOp"
                                    newVariable.binOp = binopVar;
                                    newVariable.containedValue = complexityCalculatorHelperFunctions.listTypesWithin(nodeIter, newVariable.containedValue, newVariable.indexAndInput, newVariable.opsDone);
                                }
                            }

                        }
                        //finish creating the variable object and add it to our list
                        lineNumber = 0;
                        var modFunc = [];
                        if (node.lineno != null) {
                            lineNumber = node.lineno;
                            parentLineNumber = lineNumber;
                        }
                        else {
                            lineNumber = parentLineNumber;
                        }


                        if (originalityLines.includes(lineNumber)) {

                            newVariable.original = true;
                            for (var u = 0; u < userFunctionReturns.length; u++) {

                                //if we are inside a function, and the variable being updated is a function parameter, save the name to the function's list of parameters changed.

                                if (node.lineno >= userFunctionReturns[u].startLine && node.lineno <= userFunctionReturns[u].endLine) {
                                    var paramIndex = -1;

                                    for (var a = 0; a < userFunctionParameters.length; a++) {

                                        if (userFunctionParameters[a].name === userFunctionReturns[u].name) {
                                            for (var p = 0; p < userFunctionParameters[a].params.length; p++) {
                                                if (userFunctionParameters[a].params[p] === varName) {
                                                    paramIndex = p;
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                    }

                                    if (paramIndex > -1) {
                                        userFunctionReturns[u].paramsChanged.push(paramIndex);
                                        modFunc.push([userFunctionReturns[u].startLine, userFunctionReturns[u].endLine]);
                                    }
                                    break;
                                }
                            }

                            //Mark the assignment at the first line of the loop
                            var lineNo = node.lineno;
                            for (var h = 0; h < loopLocations.length; h++) {
                                if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                    lineNo = loopLocations[h][0];
                                    break;
                                }
                            }

                            if (fakeValue == null) {
                                fakeValue = { _astname: "", lineno: node.lineno };
                            }

                            //done twice intentionally; that way this ALWAYS registers as the variable's value being changed, which is what we want.
                            newVariable.assignedModified.push({ line: lineNo, value: studentCode[lineNumber].trim(), original: true, nodeValue: fakeValue });
                            newVariable.assignedModified.push({ line: lineNo, value: studentCode[lineNumber].trim(), original: true, nodeValue: fakeValue });


                            allVariables.push(newVariable);
                            variableAssignments.push({ line: node.lineno, name: newVariable.name });
                        }

                    }
                }
            }
        }

        if (node != null && node._astname != null && node._astname === "If" && node.orelse != null) {
            gatherAllVariables(node.orelse);
        }

        if (node != null && node._astname != null && node._astname === "Call") {
            var functionNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
            var valueItem = { _astname: "" };
            if (functionNode != null && "attr" in functionNode) {
                lineNumber = 0;

                if (node.lineno != null) {
                    lineNumber = node.lineno;
                    parentLineNumber = lineNumber;
                }
                else {
                    lineNumber = parentLineNumber;
                }

                var isInForLoop = false;
                for (var n in loopLocations) {
                    if (loopLocations[n][0] < lineNumber && loopLocations[n][1] > lineNumber) {
                        isInForLoop = true;
                    }
                }

                var modOriginality = (originalityLines.includes(lineNumber));
                var funcName = functionNode.attr.v;

                if (listFuncs.includes(funcName)) {

                    var valueString = studentCode[node.lineno - 1];

                    //is a variable being passed to it? If not, we can return.
                    if (functionNode.value._astname === "Name" && functionNode.value.id.v !== "True" && functionNode.value.id.v !== "False") {
                        var varName = functionNode.value.id.v;

                        var variableObject = getVariableObject(varName);
                        if (variableObject == null) {
                            return;
                        }


                        //test for duplication and add if not a duplicate

                        //AugAssign
                        var assignmentAlreadyExists = false;
                        for (var p = 0; p < variableObject.assignedModified.length; p++) {
                            if (variableObject.assignedModified[p].value === valueString) {
                                assignmentAlreadyExists = true;
                                break;
                            }
                        }
                        if (complexityCalculatorHelperFunctions.performListOp(node)[0] != null) {
                            valueItem = complexityCalculatorHelperFunctions.performListOp(node)[0][0];
                        }
                        if (!assignmentAlreadyExists) {
                            var lineNo = node.lineno;

                            for (var h = 0; h < loopLocations.length; h++) {
                                if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                    lineNo = loopLocations[h][0];
                                    break;
                                }
                            }

                            variableObject.assignedModified.push({
                                line: lineNo,
                                value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                                original: modOriginality,
                                nodeValue: valueItem
                            });
                            variableAssignments.push({ line: node.lineno, name: variableObject.name });

                            if (isInForLoop) { //push a second time if we're in a loop.
                                variableObject.assignedModified.push({
                                    line: lineNo,
                                    value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                                    original: modOriginality,
                                    nodeValue: valueItem
                                });
                            }
                            variableObject.nodeElements.push({
                                line: node.lineno,
                                elts: complexityCalculatorHelperFunctions.performListOp(node)[0]
                            });

                            variableObject.stringElements.push({
                                line: node.lineno,
                                elts: complexityCalculatorHelperFunctions.performListOp(node)[1]
                            });
                        }

                    }
                }
            }
        }

        if (node != null && node._astname != null && node._astname === 'AugAssign') {
            lineNumber = 0;

            if (node.lineno != null) {
                lineNumber = node.lineno;
                parentLineNumber = lineNumber;
            }
            else {
                lineNumber = parentLineNumber;
            }


            var isInForLoop = false;
            for (var n in loopLocations) {
                if (loopLocations[n][0] < lineNumber && loopLocations[n][1] > lineNumber) {
                    isInForLoop = true;
                    break;
                }
            }


            var modOriginality = (originalityLines.includes(lineNumber));;
            var assignLine = node.value.lineno - 1;
            var offset = node.value.col_offset;
            var valueString = node.op.name + " " + studentCode[assignLine].substring(offset);

            var indexOfExistingVariableObj = -1;

            varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.target);
            if (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript") {
                return;
            }


            var varName = varTarget.id.v;
            var variableObject = getVariableObject(varName);
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
                    elts: getAllBinOpLists(fakeBinOp)
                });
                variableObject.stringElements.push({
                    line: node.lineno,
                    elts: complexityCalculatorHelperFunctions.nodesToStrings(getAllBinOpLists(fakeBinOp), node.lineno)
                });

                complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.nodesToStrings(binVal, node.lineno), variableObject.containedValue);
                variableObject.containedValue.push("List");
                variableObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", variableObject.opsDone, node.lineno);
            }

            if (binVal === "Str") {
                containsOps = complexityCalculatorHelperFunctions.addOpToList("StrOp", variableObject.opsDone, node.lineno);
            }

            if (typeof binVal !== "string" && !Array.isArray(binVal)) {
                varVal = "BinOp";
            }

            variableObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", variableObject.opsDone, node.lineno);
            var binOpTypes = complexityCalculatorHelperFunctions.listTypesWithin(fakeBinOp, [], variableObject.indexAndInput, variableObject.opsDone);
            complexityCalculatorHelperFunctions.appendArray(binOpTypes, variableObject.containedValue);


            if (!modificationAlreadyExists) {
                var lineNo = node.lineno;
                for (var h = 0; h < loopLocations.length; h++) {
                    if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                        lineNo = loopLocations[h][0];
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
                variableAssignments.push({ line: node.lineno, name: variableObject.name });

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
                }
                else {
                    var funcNode = complexityCalculatorHelperFunctions.retrieveFromList(node.value.func);
                    if (funcNode._astname === "Name" && getFunctionObject(funcNode.id.v) != null && getFunctionObject(funcNode.id.v).returns === "Function") {
                        assignedName = getFunctionObject(funcNode.id.v).flagVal;
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
                            }
                            else {
                                assignedName = "" + assignedVal.lineno + "|" + assignedVal.col_offset;
                            }
                        }
                    }


                    if (assignedName !== "") {
                        var varTarget = complexityCalculatorHelperFunctions.retrieveFromList(node.targets[0]);

                        if (varTarget == null || (varTarget != null && varTarget._astname !== "Name" && varTarget._astname !== "Subscript")) {
                            return;
                        }

                        else {

                            var varName = varTarget.id.v;

                            if (assignedName === "makeBeat" || makeBeatRenames.includes(assignedName)) {
                                //special case if user renames makeBeat
                                makeBeatRenames.push(varName);
                            }

                            for (var n = 0; n < userFunctionParameters.length; n++) {
                                if (userFunctionParameters[n].name === assignedName) { //double check and make sure its not already in here
                                    var alreadyMarked = false;

                                    for (var j = 0; j < userFunctionParameters.length; j++) {
                                        if (userFunctionParameters[j].name === varName) {
                                            alreadyMarked = true;
                                            break;
                                        }
                                    }

                                    if (!alreadyMarked) {
                                        newFunctionObject = {};
                                        Object.assign(newFunctionObject, userFunctionParameters[n]);
                                        newFunctionObject.name = varName;

                                        userFunctionParameters.push(newFunctionObject);
                                    }
                                }
                            }


                            for (var p = 0; p < userFunctionReturns.length; p++) {
                                if (assignedName === userFunctionReturns[p].name) {
                                    for (var i = 0; i < userFunctionReturns.length; i++) {
                                        if (userFunctionReturns[i].name === varName) {
                                            return;
                                        } //if it's already been marked we don't need to do anything else.

                                    }

                                    var newReturn = {};
                                    Object.assign(newReturn, userFunctionReturns[p]);
                                    newReturn.name = varName;

                                    if (subscripted) {
                                        newReturn.indexAndInput.indexed = true;
                                    }
                                    userFunctionReturns.push(newReturn);

                                    //if the function we're reassigning is a reassign of something else
                                    var reassignedFuncName = assignedName;
                                    for (var n = 0; n < userFunctionRenames; n++) {
                                        if (userFunctionRenames[n][0] === reassignedFuncName) {
                                            reassignedFuncName = userFunctionRenames[n][1];
                                        }
                                    }
                                    userFunctionRenames.push([varName, reassignedFuncName]);
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
            varVal = ""
            binVal = null;
            var inputIndexing = { input: false, indexed: false, strIndexed: false };
            var containsNested = false;
            var isNewAssignmentValue = false;
            var containsOps = [];
            var assignLine = node.value.lineno - 1;
            var offset = node.value.col_offset;
            var valueString = studentCode[assignLine].substring(offset);
            var subscriptString = false;
            var nodeVal = node.value;
            var carryOriginality = false;
            var copiedElts = null;


            //mark subscripting and listops, if applicable
            if (nodeVal._astname === "Subscript") {
                inputIndexing.strIndexed = complexityCalculatorHelperFunctions.getStringIndexingInNode(node.value)[0];
                if (inputIndexing.strIndexed) {
                    varVal = "Str";
                }
                else {
                    inputIndexing.indexed = complexityCalculatorHelperFunctions.getIndexingInNode(node.value)[0];

                    if (nodeVal == null || (nodeVal != null && nodeVal._astname == null)) {   //save as a whole subscript node.
                        varVal = "Subscript";
                        flag = node.value;
                    }
                }
            }
            else if (complexityCalculatorHelperFunctions.retrieveFromList(nodeVal) != nodeVal) {
                containsOps = complexityCalculatorHelperFunctions.addOpToList("ListOp", containsOps, node.lineno);
                if (nodeVal == null || (nodeVal != null && nodeVal._astname == null)) {   //save as a whole subscript node.
                    varVal = "Subscript";
                    flag = node.value;
                }
            }

            nodeVal = complexityCalculatorHelperFunctions.retrieveFromList(nodeVal);


            if (nodeVal != null && nodeVal._astname != null) {
                if (nodeVal._astname === "UnaryOp" || nodeVal._astname === 'Compare' || (nodeVal._astname === 'Name' && nodeVal.id.v != null && ((nodeVal.id.v === "True" || nodeVal.id.v === "False")))) {
                    varVal = "Bool";
                    if (nodeVal._astname === "Compare") {
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("Compare", containsOps, node.lineno);
                        var compareTypes = [];

                        complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, compareTypes, inputIndexing, containsOps);
                        containedVal = compareTypes;

                    }
                }

                else if (nodeVal._astname === 'Name') { //this means it contains the value of another variable or function
                    containsNested = true;
                    otherVar = getVariableObject(nodeVal.id.v);
                    if (otherVar != null && otherVar.value !== "" && otherVar.value !== "BinOp") {
                        varVal = otherVar.value;

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
                    if (otherVar == null && getFunctionObject(nodeVal.id.v) != null) {
                        varVal = "func";
                        flag = nodeVal.id.v;
                    }
                    if (varVal === "") { //if we don't know what THAT variable is, make a note of it to be analyzed later and move on.
                        funcOrVar = "var";
                        flag = nodeVal.id.v;
                    }
                }

                if (nodeVal._astname === 'List') {
                    varVal = "List";
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
                    if (JS_STR_LIST_OVERLAP.includes(funcName) && isJavascript) {
                        var operationType = complexityCalculatorHelperFunctions.getTypeFromNode(nodeVal.func.value);
                        if (operationType === "List") {
                            isListFunc = true;
                        }
                        else if (operationType === "Str") {
                            isStrFunc = true;
                        }
                        else if (operationType === "") {
                            isListFunc, isStrFunc = true;
                        }
                    }

                    if ('attr' in nodeVal.func && listFuncs.includes(funcName) && !isStrFunc && funcName !== "shuffleList") {
                        varVal = "List";
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("ListOp", containsOps, node.lineno);
                        if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeVal)) {
                            listElts = complexityCalculatorHelperFunctions.performListOp(nodeVal)[0];
                        }

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
                            var calledFunction = getFunctionObject(nodeVal.func.value.id.v);

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
                            var foundVariable = getVariableObject(nodeVal.func.value.id.v);

                            if (foundVariable != null) {
                                complexityCalculatorHelperFunctions.appendArray(foundVariable.containedValue, containedVal);
                                containsOps = complexityCalculatorHelperFunctions.appendOpList(foundVariable.opsDone, containsOps);
                            }
                        }
                    }
                    if (strFuncs.includes(funcName) && !isListFunc) {
                        varVal = "Str";
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("StrOp", containsOps, node.lineno);

                        if (nodeVal.func.value._astname === "Name") {
                            var varNum = getVariableObject(nodeVal.func.value.id.v);
                            if (varNum != null) {
                                complexityCalculatorHelperFunctions.appendArray(varNum.containedValue, containedVal);
                                containsOps = complexityCalculatorHelperFunctions.appendOpList(varNum.opsDone, containsOps);
                            }
                        }
                        if (nodeVal.func.value._astname === "BinOp") {
                            var valsInOp = [];
                            containsOps = complexityCalculatorHelperFunctions.addOpToList("BinOp", containsOps, node.lineno);
                            complexityCalculatorHelperFunctions.listTypesWithin(nodeVal.func.value, valsInOp, inputIndexing, containsOps);

                            for (var v = 0; v < valsInOp.length; v++) {
                                containedVal.push(valsInOp[v]);
                            }
                        }

                        if (nodeVal.func.value._astname === "Call") {
                            var funcName = "";
                            if ('id' in nodeVal.func) {
                                funcName = nodeVal.func.id.v;
                            }
                            else {
                                funcName = nodeVal.func.attr.v;
                            }
                            var nodeFunction = getFunctionObject(funcName);


                            if (nodeFunction != null) {
                                if (nodeFunction.containedValue != null) {
                                    complexityCalculatorHelperFunctions.appendArray(nodeFunction.containedValue, containedVal);
                                }
                                if (nodeFunction.opsDone != null) {
                                    containsOps = complexityCalculatorHelperFunctions.appendOpList(nodeFunction.opsDone, containsOps);
                                }
                            }
                        }

                        if (funcName === "split") {
                            listElts = [{
                                line: node.lineno,
                                elts: [nodeVal.func.value]
                            }];
                        }
                    }


                    var assignedFunctionReturn = getFunctionObject(funcName);

                    if (assignedFunctionReturn != null && assignedFunctionReturn.returns !== "" && assignedFunctionReturn.returns !== "BinOp") {
                        varVal = assignedFunctionReturn.returns;
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
                    if (varVal === "") {
                        funcOrVar = "func";
                        flag = funcName;
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

                    varVal = "Bool";
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
                        listElts = getAllBinOpLists(nodeVal);
                    }


                    binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeVal);
                    if (binVal != null && typeof binVal === 'string' && !binVal.includes(':')) {
                        varVal = binVal;
                    }
                    else if (Array.isArray(binVal)) {
                        varVal = "List";
                        listElts = getAllBinOpLists(nodeVal);
                        containedVal = binVal;
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("ListOp", containsOps, node.lineno);
                    }
                    if (varVal === "Str") {
                        containsOps = complexityCalculatorHelperFunctions.addOpToList("StrOp", containsOps, node.lineno);
                    }
                    if (typeof binVal !== "string" && !Array.isArray(binVal)) {
                        varVal = "BinOp";
                    }

                    containsOps = complexityCalculatorHelperFunctions.addOpToList("BinOp", containsOps, node.lineno);
                    containedVal = complexityCalculatorHelperFunctions.listTypesWithin(nodeVal, [], inputIndexing, containsOps);
                }

                if (nodeVal._astname === 'Num') { //test if it's an int or float
                    if (!complexityCalculatorHelperFunctions.isNodeFloat(nodeVal)) {
                        varVal = 'Int';
                    }
                    else {
                        varVal = 'Float';
                    }
                }
                if (nodeVal._astname === "Str") {
                    varVal = "Str";
                }

                if (typeof nodeVal === "string") {
                    varVal = node.value;
                    flag = nodeVal;
                }
            }

            if (varVal !== "" || flag !== "") {

                //if we have ANY kind of information, add the variable to the list; or, if the variable is already in the list, update the value.
                for (var i = 0; i < allVariables.length; i++) {
                    if (allVariables[i].name === varName) {
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
                        parentLineNumber = lineNumber;
                    }
                    else {
                        lineNumber = parentLineNumber;
                    }

                    var modOriginality = (originalityLines.includes(lineNumber));

                    if (!invalidTransformation) {  //if this is within a function and part of the function's params, we need to note that here.
                        for (var u = 0; u < userFunctionReturns.length; u++) {
                            if (node.lineno >= userFunctionReturns[u].startLine && node.lineno <= userFunctionReturns[u].endLine) {
                                var paramIndex = -1;  //ok, it's in the function, is it a param?
                                for (var a = 0; a < userFunctionParameters.length; a++) {
                                    if (userFunctionParameters[a].name === userFunctionReturns[u].name) {
                                        for (var p = 0; p < userFunctionParameters[a].params.length; p++) {
                                            if (userFunctionParameters[a].params[p] === varName) {
                                                paramIndex = p;
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                }
                                if (paramIndex > -1) {
                                    userFunctionReturns[u].paramsChanged.push(paramIndex);
                                    modFunc.push([userFunctionReturns[u].startLine, userFunctionReturns[u].endLine]);
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
                        value: varVal,
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
                        for (var h = 0; h < loopLocations.length; h++) {
                            if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                lineNo = loopLocations[h][0];
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
                    allVariables.push(userVariable);
                    variableAssignments.push({ line: node.lineno, name: userVariable.name });
                }

                else {
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

                    complexityCalculatorHelperFunctions.appendArray(copiedElts, allVariables[indexOfExistingVariableObj].nodeElements);
                    complexityCalculatorHelperFunctions.appendArray(eltsToList, allVariables[indexOfExistingVariableObj].stringElements);

                    if (inputIndexing.input) {
                        allVariables[indexOfExistingVariableObj].indexAndInput.input = true;
                    }
                    if (inputIndexing.indexed) {
                        allVariables[indexOfExistingVariableObj].indexAndInput.indexed = true;
                    }
                    if (inputIndexing.strIndexed) {
                        allVariables[indexOfExistingVariableObj].indexAndInput.strIndexed = true;
                    }
                    if (varVal !== "") {
                        allVariables[indexOfExistingVariableObj].value = varVal;
                    }
                    if (binVal != null) {
                        allVariables[indexOfExistingVariableObj].binOp = binVal;
                    }
                    var assignmentExists = false;

                    for (var p = 0; p < allVariables[indexOfExistingVariableObj].assignedModified.length; p++) {
                        if (allVariables[indexOfExistingVariableObj].assignedModified[p].value === valueString) {
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
                            parentLineNumber = lineNumber;
                        }
                        else {
                            lineNumber = parentLineNumber;
                        }


                        var modOriginality = (originalityLines.includes(lineNumber));
                        var lineNo = node.lineno;
                        for (var h = 0; h < loopLocations.length; h++) {
                            if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                lineNo = loopLocations[h][0];
                                break;
                            }
                        }

                        allVariables[indexOfExistingVariableObj].assignedModified.push({
                            line: lineNo,
                            value: complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(valueString),
                            original: modOriginality,
                            nodeValue: node.value,
                            binop: binVal
                        });
                        variableAssignments.push({ line: node.lineno, name: allVariables[indexOfExistingVariableObj].name });

                        for (var uf = 0; uf < userFunctionParameters.length; uf++) { //is this variable a parameter in this function? if so, what's its parameter index?
                            var paramIndex = -1;
                            for (var pa = 0; pa < userFunctionParameters[uf].params.length; pa++) {
                                if (userFunctionParameters[uf].params[pa] === varName) {
                                    paramIndex = pa;
                                    break;
                                }
                            }
                            if (paramIndex > -1) { //ok it's a param in this func. NOW we see if it's within the lines of the function
                                var ufReturnIndex = -1;
                                for (var u = 0; u < userFunctionReturns.length; u++) {
                                    if (userFunctionReturns[u].name === userFunctionParameters[uf].name) {
                                        ufReturnIndex = u;
                                        break;
                                    }
                                }
                                if (ufReturnIndex > -1) {//this should NEVER be false. but, ya know. safety. or because we needed another if statement. your choice.
                                    if (node.lineno > userFunctionReturns[ufReturnIndex].startLine && node.lineno <= userFunctionReturns[ufReturnIndex].endLine) {
                                        userFunctionReturns[ufReturnIndex].paramsChanged.push(paramIndex);
                                    } //then THIS is a change TO THE FUNCTION'S PARAMETER, WITHIN THAT FUNCTION. AKA this function modifies the value of this parameter.
                                }
                            }
                        }
                    }
                    complexityCalculatorHelperFunctions.appendOpList(containsOps, allVariables[indexOfExistingVariableObj].opsDone);
                }
            }
        }
    }



    /*Calculates what kind of datatype is represented by a given BinOp object.
    * This is the function to be used on BinOp Objects stored in function and variable objects when we don't know, at the time, what type it is.
    * @param functionOrVariable - "func" or "var" - is the object whose BinOp we are checking in the list of functions, or the list of variables
    * @param index - The index of the object whose BinOp we are checking.
    * @returns String if we know what datatype the BinOp object resolves to, otherwise an updated BinOp object
    */
    function evaluateBinOp(functionOrVariable, index) {


        if (functionOrVariable === "func") {
            returnObj = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(userFunctionReturns[index].binOp);

            if (typeof returnObj === 'string') {
                userFunctionReturns[index].returns = returnObj;
                if (returnObj === "Str") {
                    userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", userFunctionReturns[index].opsDone, userFunctionReturns[index].endLine);
                }
            }

            else if (Array.isArray(returnObj)) {
                userFunctionReturns[index].returns = "List";
                userFunctionReturns[index].containedValue = returnObj;
                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", userFunctionReturns[index].opsDone, userFunctionReturns[index].endLine);
            }
            else {
                //if we don't know the datatype, at least update with anything new we might have.
                userFunctionReturns[index].binOp = returnObj;
            }
        }

        //variable binop
        else {
            returnObj = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(allVariables[index].binOp);

            if (typeof returnObj === 'string') {
                allVariables[index].value = returnObj;
                if (returnObj === "Str") {
                    allVariables[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", allVariables[index].opsDone, allVariables[index].assignedModified[0].line);
                }
            }
            else if (Array.isArray(returnObj)) {
                allVariables[index].value = "List";
                allVariables[index].containedValue = returnObj;
                allVariables[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", allVariables[index].opsDone, allVariables[index].assignedModified[0].line);
            }
            else {
                //if we don't know the datatype, at least update with anything new we might have.
                allVariables[index].binOp = returnObj;
            }
        }
    }



    /* Handles re-visiting all of the variables, functions, and subscript values where we didn't know the datatype at the time
    * Traverses through lists of function and variable objects, and finds values for those that don't have them
    */
    function evaluateAllEmpties() {
        //function objects
        for (var r = 0; r < userFunctionReturns.length; r++) {
            if (userFunctionReturns[r].returns === "") {
                if (userFunctionReturns[r].funcVar === "var") {
                    //if it returns a variable  we look it up in the variable dictionary

                    var returnedVariable = getVariableObject(userFunctionReturns[r].flagVal);

                    if (returnedVariable != null && returnedVariable.value !== "" && returnedVariable.value !== "BinOp") {
                        userFunctionReturns[r].flagVal = "";
                        userFunctionReturns[r].funcVar = "";
                        userFunctionReturns[r].returns = returnedVariable.value;
                        complexityCalculatorHelperFunctions.copyAttributes(returnedVariable, userFunctionReturns[r], ["indexAndInput"]);

                        //get the latest version of the variable's node elements before the function is declared, and assign that to the function object's node elements.
                        if (returnedVariable.nodeElements != null && returnedVariable.nodeElements.length > 0) {
                            var nodeElementsIndex = -1;
                            for (var t = 0; t < returnedVariable.nodeElements.length - 1; t++) {
                                if (returnedVariable.nodeElements[t].line > userFunctionReturns[r].endLine) {
                                    break;
                                }
                                if (returnedVariable.nodeElements[t].line > userFunctionReturns[r].startLine && returnedVariable.nodeElements[t + 1].line > userFunctionReturns[r].endLine) {
                                    nodeElementsIndex = t;
                                }
                            }
                            if (nodeElementsIndex === -1 &&
                                returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line >= userFunctionReturns[r].startLine &&
                                returnedVariable.nodeElements[returnedVariable.nodeElements.length - 1].line <= userFunctionReturns[r].endLine) {
                                nodeElementsIndex = returnedVariable.nodeElements.length - 1;
                            }

                            if (nodeElementsIndex === -1) {
                                nodeElementsIndex = 0;
                            }

                            userFunctionReturns[r].nodeElements = [returnedVariable.nodeElements[nodeElementsIndex]];
                            userFunctionReturns[r].stringElements = [returnedVariable.stringElements[nodeElementsIndex]];
                        }

                        //append any opsDone and containedValue items from the variable to the corresponding items in the function objec.t
                        complexityCalculatorHelperFunctions.appendArray(returnedVariable.containedValue, userFunctionReturns[r].containedValue);
                        userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(returnedVariable.opsDone, userFunctionReturns[r].opsDone);
                    }
                }
                //if it returns a call to another function, copy the information from that function.
                else if (userFunctionReturns[r].funcVar === "func" && userFunctionReturns[r].name != userFunctionReturns[r].flag) {
                    //This prevents us from getting stuck recursing forever
                    var returnedFunc = getFunctionObject(userFunctionReturns[r].flagVal)

                    if (returnedFunc != null && returnedFunc.returns !== "" && returnedFunc.returns !== "BinOp") {
                        userFunctionReturns[r].flagVal = "";
                        userFunctionReturns[r].funcVar = "";

                        //copy relevant information
                        complexityCalculatorHelperFunctions.copyAttributes(returnedFunc, userFunctionReturns[r], ["returns", "binOp", "indexAndInput", "nested", "nodeElements", "stringElements"]);

                        if (returnedFunc.containedValue != null) {
                            complexityCalculatorHelperFunctions.appendArray(returnedFunc.containedValue, userFunctionReturns[r]);
                        }
                        if (returnedFunc.opsDone != null) {
                            userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(returnedFunc.opsDone, userFunctionReturns[r].opsDone)
                        }
                    }
                }
            }

            //go through all of the objects in the function's nodeElements and evaluate them, creating fake nodes
            if (userFunctionReturns[r].nodeElements != null && userFunctionReturns[r].nodeElements.length > 0 && userFunctionReturns[r].nodeElements[0] != null) {

                for (var i in userFunctionReturns[r].nodeElements[0].elts) {

                    if (userFunctionReturns[r].nodeElements[0].elts[i]._astname == null &&
                        typeof userFunctionReturns[r].nodeElements[0].elts[i] === "object" &&
                        'left' in userFunctionReturns[r].nodeElements[0].elts[i]) {

                        var eltsValue = { lineno: userFunctionReturns[r].nodeElements[0].elts[i].lineno };
                        eltsValue._astname = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(userFunctionReturns[r].nodeElements[0].elts[i]);

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

                        userFunctionReturns[r].nodeElements[0].elts[i] = eltsValue
                    }
                }
                userFunctionReturns[r].stringElements[0] = complexityCalculatorHelperFunctions.nodesToStrings(userFunctionReturns[r].nodeElements[0].elts, userFunctionReturns[r].nodeElements[0].line);
            }

            //If we have an un-evaluated subscript, do that now
            if (userFunctionReturns[r].returns === "Subscript") {
                //its an index or a slice
                var indexValue = complexityCalculatorHelperFunctions.retrieveFromList(userFunctionReturns[r].flagVal);

                if (complexityCalculatorHelperFunctions.getIndexingInNode(userFunctionReturns[r].returns)[0]) {
                    userFunctionReturns[r].indexAndInput.indexed = true;
                }
                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(userFunctionReturns[r].returns)[0]) {
                    userFunctionReturns[r].indexAndInput.strIndexed = true;
                }


                if (indexValue != null) {
                    //We know what it is.

                    userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", userFunctionReturns[r].opsDone, indexValue.lineno);
                    allVariables.flagVal = ""; //this may get reset to something down below, which is fine and 100% intentional.
                    indexValue = complexityCalculatorHelperFunctions.retrieveFromList(indexValue);


                    if (indexValue._astname === "Name") {
                        //it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName

                        if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                            //boolean
                            userFunctionReturns[r].returns = "Bool";
                        }

                        //otherwise, it's a variable object
                        var indexVar = getVariableObject(indexValue.id.v);

                        if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {
                            complexityCalculatorHelperFunctions.copyAttributes(indexVar, userFunctionReturns[r], ["value", "binOp", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"]);
                            userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(indexVar.opsDone, userFunctionReturns[r].opsDone);
                            complexityCalculatorHelperFunctions.appendArray(indexVar.containedValue, userFunctionReturns[r].containedValue);
                        }
                        else if (indexVar != null && indexVar.value === "") {
                            userFunctionReturns[r].returns = "";
                            userFunctionReturns[r].flagVal = "var:" + indexVar.name;
                        }

                        else if (indexVar == null && getFunctionObject(indexValue.id.v) != null) {

                            for (var n = 0; n < userFunctionParameters.length; n++) {
                                if (userFunctionParameters[n].name === userFunctionReturns[r].name) { //double check and make sure its not already in here
                                    var alreadyMarked = false;

                                    for (var j = 0; j < userFunctionParameters.length; j++) {
                                        if (userFunctionParameters[j].name === indexValue.id.v) {
                                            alreadyMarked = true;
                                            break;
                                        }
                                    }

                                    if (!alreadyMarked) {
                                        newFunctionObject = {};
                                        Object.assign(newFunctionObject, userFunctionParameters[n]);
                                        newFunctionObject.name = indexValue.id.v;

                                        userFunctionParameters.push(newFunctionObject);

                                    }
                                    break;
                                }
                            }


                            for (var p = 0; p < userFunctionReturns.length; p++) {
                                if (userFunctionReturns[r].name === userFunctionReturns[p].name) {
                                    var alreadyMarked = false;
                                    for (var i = 0; i < userFunctionReturns.length; i++) {
                                        if (userFunctionReturns[i].name === indexValue.id.v) {
                                            alreadyMarked = true;
                                            break;
                                        } //if it's already been marked we don't need to do anything else.

                                    }
                                    if (alreadyMarked) {
                                        break;
                                    }

                                    var newReturn = {};
                                    Object.assign(newReturn, userFunctionReturns[p]);
                                    newReturn.name = indexValue.id.v;

                                    newReturn.indexAndInput.indexed = true;

                                    userFunctionReturns.push(newReturn);

                                    //if the function we're reassigning is a reassign of something else
                                    var reassignedFuncName = userFunctionReturns[r].name;
                                    for (var n = 0; n < userFunctionRenames; n++) {
                                        if (userFunctionRenames[n][0] === reassignedFuncName) {
                                            reassignedFuncName = userFunctionRenames[n][1];
                                        }
                                    }
                                    userFunctionRenames.push([indexValue.id.v, reassignedFuncName]);
                                    break;
                                }
                            }
                        }
                    }
                    //it's a function call
                    else if (indexValue._astname === "Call") {
                        var alreadyTallied = false;

                        if ('id' in indexValue.func || indexValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func) != indexValue.func) {

                            var funcName = "";

                            //get the function name
                            if ('id' in indexValue.func) {
                                funcName = indexValue.func.id.v;
                            }
                            else {
                                var functionNameNode = null;
                                functionNameNode = complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func);
                                if (functionNameNode != null && functionNameNode._astname === "Name") {
                                    funcName = functionNameNode.id.v;
                                }
                            }

                            //get the function object and copy values from it
                            var userFunctionCalled = getFunctionObject(funcName);
                            if (userFunctionCalled != null && userFunctionCalled.returns !== "") {

                                userFunctionReturns[r].returns = userFunctionCalled.returns;
                                complexityCalculatorHelperFunctions.copyAttributes(userFunctionCalled, userFunctionReturns[r], ["binOp", "nested", "original", "indexAndInput", "nodeElements", "stringElements"]);

                                complexityCalculatorHelperFunctions.appendArray(userFunctionCalled.containedValue, userFunctionReturns[r].containedValue);
                                if (userFunctionCalled.opsDone != null) {
                                    userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(userFunctionCalled.opsDone, userFunctionReturns[r].opsDone);
                                }

                            }

                            alreadyTallied = true;
                        }

                        if (!alreadyTallied) { //if it's na list or string op instead, do the following
                            if (complexityCalculatorHelperFunctions.doesCallCreateList(indexValue)) {
                                userFunctionReturns[r].returns = "List";
                                var eltsItem = complexityCalculatorHelperFunctions.performListOp(indexValue);


                                userFunctionReturns[r].nodeElements.push({ line: indexValue.lineno, elts: eltsItem[0] });
                                userFunctionReturns[r].stringElements.push({ line: indexValue.lineno, elts: eltsItem[1] });

                                alreadyTallied = true;
                            }

                            if (complexityCalculatorHelperFunctions.doesCallCreateString(indexValue)) {
                                userFunctionReturns[r].returns = "Str";
                                alreadyTallied = true;
                            }

                        }
                        if (!alreadyTallied) { //if it's STILL not tallied, do the following
                            userFunctionReturns[r].returns = complexityCalculatorHelperFunctions.getCallReturn(indexValue); //attempt to get the call return for list creation and handle that

                            if (Array.isArray(userFunctionReturns[r].returns)) {

                                allVariables.nodeElements.push({
                                    line: indexValue.lineno,
                                    elts: userFunctionReturns[r].returns
                                });

                                allVariables.stringElements.push({
                                    line: indexValue.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(userFunctionReturns[r].returns)
                                });

                                userFunctionReturns[r].returns = "List";
                            }
                        }
                    }
                    //ints, floats
                    else if (indexValue._astname === "Num") {
                        if (!complexityCalculatorHelperFunctions.isNodeFloat(indexValue)) {
                            userFunctionReturns[r].returns = "Int";
                        }
                        else {
                            userFunctionReturns[r].returns = "Float";
                        }
                    }
                    //comparisons and boolops both become booleans and stored in containedValue
                    else if (indexValue._astname === "Compare" || indexValue._astname === "BoolOp") {
                        userFunctionReturns[r].returns = "Bool";

                        if (indexValue._astname === "Compare") {
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, userFunctionReturns[r].containedValue, userFunctionReturns[r].indexAndInput, userFunctionReturns[r].opsDone);
                        }
                        if (indexValue._astname === "BoolOp") {
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, userFunctionReturns[r].containedValue, userFunctionReturns[r].indexAndInput, userFunctionReturns[r].opsDone);
                        }

                    }
                    //if binop, evaluate and push contained values
                    else if (indexValue._astname === "BinOp") {

                        userFunctionReturns[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", userFunctionReturns[r].opsDone, indexValue.lineno);
                        var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(indexValue);

                        if (typeof binVal === "string") {
                            userFunctionReturns[r].returns = binVal;
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, userFunctionReturns[r].containedValue, userFunctionReturns[r].indexAndInput, userFunctionReturns[r].opsDone);
                        }
                        else if (Array.isArray(binVal)) {

                            userFunctionReturns[r].returns = "List";

                            allVariables.nodeElements.push({
                                line: indexValue.lineno,
                                elts: binVal
                            });
                            allVariables.stringElements.push({
                                line: indexValue.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                            });

                        }
                        else {//we re-frame as a binop object!
                            userFunctionReturns[r].returns = "BinOp";
                            userFunctionReturns[r].binOp = binVal;
                        }
                    }

                    //list
                    else if (indexValue._astname === "List") {
                        userFunctionReturns[r].returns = "List";
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.listTypesWithin(indexValue, userFunctionReturns[r].containedValue, userFunctionReturns[r].indexAndInput, userFunctionReturns[r].opsDone), userFunctionReturns[r].containedValue);

                        userFunctionReturns[r].nodeElements.push({
                            line: indexValue.lineno,
                            elts: indexValue.elts
                        });
                        userFunctionReturns[r].nodeElements.push({
                            line: indexValue.lineno,
                            elts: complexityCalculatorHelperFunctions.nodesToStrings(indexValue.elts)
                        });
                    }
                    else if (indexValue._astname === "Str") {
                        userFunctionReturns[r].returns = "Str";
                    }
                }
            }
        }

        //Now, go through the list of all variables and do the same thing
        for (var r = 0; r < allVariables.length; r++) {

            if (allVariables[r].value === "") {
                if (allVariables[r].funcVar === "var") {
                    //if it's the value of another variable, we look it up in the var directory and copy the values


                    var copiedVar = getVariableObject(allVariables[r].flagVal);
                    if (copiedVar != null && copiedVar.value !== "" && copiedVar.value !== "BinOp") {
                        allVariables[r].flagVal = "";
                        allVariables[r].funcVar = "";
                        complexityCalculatorHelperFunctions.copyAttributes(copiedVar, allVariables[r], ["value", "binOp", "original", "indexAndInput", "nodeElements", "stringElements", "nested",]);


                        complexityCalculatorHelperFunctions.appendArray(copiedVar.containedValue, allVariables[r].containedValue);
                        allVariables[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(copiedVar.opsDone, allVariables[r].opsDone);
                    }
                }

                else if (allVariables[r].funcVar === "func" && allVariables[r].name != allVariables[r].flagVal) {
                    //otherwise, it contains the value returned by a function, so go look that up and copy its values
                    //prevents us from getting stuck recursing forever
                    var funcValue = getFunctionObject(allVariables[r].flagVal);
                    if (funcValue != null && funcValue.returns !== "") {
                        allVariables[r].flagVal = "";
                        allVariables[r].funcVar = "";
                        allVariables[r].value = funcValue.returns;

                        complexityCalculatorHelperFunctions.copyAttributes(funcValue, allVariables[r], ["input", "binOp", "nested", "nodeElements", "stringElements"]);
                        if (funcValue.containedValue != null) {
                            complexityCalculatorHelperFunctions.appendArray(funcValue.containedValue, allVariables[r].containedValue);
                        }
                        if (funcValue.opsDone != null) {
                            allVariables[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(funcValue.opsDone, allVariables[r].opsDone);
                        }
                    }
                }
            }
            //now go through and check all of the things in nodeElements, because we need to evaluate them if we can
            if (allVariables[r].nodeElements != null) {
                for (var p in allVariables[r].nodeElements) {
                    for (var i in allVariables[r].nodeElements[p].elts) {

                        if (allVariables[r].nodeElements[p].elts[i]._astname == null && typeof allVariables[r].nodeElements[p].elts[i] === "object" && 'left' in allVariables[r].nodeElements[p].elts[i]) {

                            var eltsValue = {
                                lineno: allVariables[r].nodeElements[p].elts[i].lineno
                            };
                            eltsValue._astname = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(allVariables[r].nodeElements[p].elts[i]);


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

                            allVariables[r].nodeElements[p].elts[i] = eltsValue;
                        }
                    }

                    allVariables[r].stringElements[p] = complexityCalculatorHelperFunctions.nodesToStrings(allVariables[r].nodeElements[p].elts, allVariables[r].nodeElements[p].line);
                }
            }

            if (allVariables[r].value === "List") {
                for (var j = 0; j < allVariables[r].containedValue.length; j++) {
                    if (allVariables[r].containedValue[j] != null && typeof allVariables[r].containedValue[j] === 'string' && allVariables[r].containedValue[j].includes('var:')) {

                        var varName = allVariables[r].containedValue[j].split(':')[1];
                        var otherVariable = getVariableObject(varName);


                        if (otherVariable != null && otherVariable.value !== "" && otherVariable.value !== "BinOp") {
                            if (otherVariable.value === "List") {
                                allVariables[r].containedValue[j] = otherVariable.containedValue.slice(0);
                            }
                            if (otherVariable.nested) {
                                allVariables[r].nested = true;
                            }
                        }
                    }

                    else if (allVariables[r].containedValue[j] != null && typeof allVariables[r].containedValue[j] === 'string' && allVariables[r].containedValue[j].includes('func:')) {
                        var funcName = allVariables[r].containedValue[j].split(':')[1];
                        var otherFunc = getFunctionObject(funcName);

                        if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns !== "BinOp") {
                            allVariables[r].containedValue[j] = otherFunc.returns;
                        }
                    }
                }
            }

            if (allVariables[r].value === "Subscript") {
                var indexValue = complexityCalculatorHelperFunctions.retrieveFromList(allVariables[r].flagVal);
                if (indexValue != null) {//then we know what it is.

                    allVariables[r].indexAndInput.indexed = true;
                    allVariables[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", allVariables[r].opsDone, indexValue.lineno);
                    allVariables.flagVal = ""; //this may get reset to something down below, which is fine and 100% intentional.


                    indexValue = complexityCalculatorHelperFunctions.retrieveFromList(indexValue);
                    if (indexValue != null && indexValue._astname === "Name") {
                        //it's a bool OR it's another variable. EVEN IF WE DON'T KNOW WHAT THAT VAR IS, WE CAN UPDATE THIS and set the flagVal to var:varName
                        if (indexValue.id.v === "True" || indexValue.id.v === "False") {
                            allVariables[r].value = "Bool";
                        }
                        var indexVar = getVariableObject(indexValue.id.v);
                        if (indexVar != null && indexVar.value !== "" && indexVar.value !== "BinOp") {

                            complexityCalculatorHelperFunctions.copyAttributes(indexVar, allVariables[r], ["value", "nested", "original", "input", "nodeElements", "stringElements", "strIndexed"]);

                            allVariables[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(indexVar.opsDone, allVariables[r].opsDone);
                            complexityCalculatorHelperFunctions.appendArray(indexVar.containedValue, allVariables[r].containedValue);
                        }
                        else if (indexVar != null && indexVar.value === "") {
                            allVariables[r].value = "";
                            allVariables[r].flagVal = "var:" + indexVar.name;
                        }
                    }
                    else if (indexValue != null && indexValue._astname === "Call") {

                        var alreadyTallied = false;

                        if ('id' in indexValue.func || indexValue.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func) != indexValue.func) {
                            var funcName = "";
                            if ('id' in indexValue.func) {
                                funcName = indexValue.func.id.v;
                            }
                            else {
                                var functionNameNode = null;
                                functionNameNode = complexityCalculatorHelperFunctions.retrieveFromList(indexValue.func);
                                if (functionNameNode != null) {
                                    funcName = functionNameNode.id.v;
                                }
                            }

                            var userFunctionCalled = getFunctionObject(funcName);
                            if (userFunctionCalled != null && userFunctionCalled.returns !== "") {

                                allVariables[r].value = userFunctionCalled.returns;
                                complexityCalculatorHelperFunctions.copyAttributes(userFunctionCalled, allVariables[r], ["nested", "binOp", "original", "indexAndInput", "nodeElements", "stringElements"]);
                                complexityCalculatorHelperFunctions.appendArray(userFunctionCalled.containedValue, allVariables[r].containedValue);

                                if (userFunctionCalled.opsDone != null) {
                                    allVariables[r].opsDone = complexityCalculatorHelperFunctions.appendOpList(userFunctionCalled.opsDone, allVariables[r].opsDone);
                                }
                            }

                            alreadyTallied = true;
                        }
                        if (!alreadyTallied) {
                            if (complexityCalculatorHelperFunctions.doesCallCreateList(indexValue)) {
                                allVariables[r].value = "List";

                                var eltsItem = complexityCalculatorHelperFunctions.performListOp(indexValue);

                                allVariables[r].nodeElements.push({
                                    line: indexValue.lineno,
                                    elts: eltsItem[0]
                                });

                                allVariables[r].stringElements.push({
                                    line: indexValue.lineno,
                                    elts: eltsItem[1]
                                });

                                alreadyTallied = true;
                            }

                            if (complexityCalculatorHelperFunctions.doesCallCreateString(indexValue)) {
                                allVariables[r].value = "Str";
                                alreadyTallied = true;
                            }
                        }
                        if (!alreadyTallied) {
                            allVariables[r].value = complexityCalculatorHelperFunctions.getCallReturn(indexValue);

                            if (Array.isArray(allVariables[r].value)) {

                                allVariables.nodeElements.push({
                                    line: indexValue.lineno,
                                    elts: allVariables[r].value
                                });
                                allVariables.stringElements.push({
                                    line: indexValue.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(allVariables[r].value)
                                });

                                allVariables[r].value = "List";
                            }
                        }
                    }
                    else if (indexValue._astname === "Num") {
                        if (!complexityCalculatorHelperFunctions.isNodeFloat(indexValue)) {
                            allVariables[r].value = "Int";
                        }
                        else {
                            allVariables[r].value = "Float";
                        }
                    }
                    else if (indexValue._astname === "Compare" || indexValue._astname === "BoolOp") {
                        allVariables[r].value = "Bool";

                        if (indexValue._astname === "Compare") {
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, allVariables[r].containedValue, allVariables[r].indexAndInput, allVariables[r].opsDone);
                        }
                        if (indexValue._astname === "BoolOp") {
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, allVariables[r].containedValue, allVariables[r].indexAndInput, allVariables[r].opsDone);
                        }

                    }
                    else if (indexValue._astname === "BinOp") {
                        allVariables[r].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", allVariables[r].opsDone, indexValue.lineno);
                        var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(indexValue);
                        if (typeof binVal === "string") {
                            allVariables[r].value = binVal;
                            complexityCalculatorHelperFunctions.listTypesWithin(indexValue, allVariables[r].containedValue, allVariables[r].indexAndInput, allVariables[r].opsDone);
                        }

                        else if (Array.isArray(binVal)) {
                            allVariables[r].value = "List";

                            allVariables.nodeElements.push({
                                line: indexValue.lineno,
                                elts: binVal
                            });
                            allVariables.stringElements.push({
                                line: indexValue.lineno,
                                elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                            });

                        }

                        else {
                            //we re-frame as a binop object
                            allVariables[r].value = "BinOp";
                            allVariables[r].binOp = binVal;
                        }
                    }
                    else if (indexValue._astname === "List") {
                        allVariables[r].value = "List";
                        complexityCalculatorHelperFunctions.appendArray(allVariables[r].containedValue, complexityCalculatorHelperFunctions.listTypesWithin(indexValue, allVariables[r].containedValue, allVariables[r].indexAndInput, allVariables[r].opsDone));

                        allVariables[r].nodeElements.push({
                            line: indexValue.lineno,
                            elts: indexValue.elts
                        });
                        allVariables[r].nodeElements.push({
                            line: indexValue.lineno,
                            elts: complexityCalculatorHelperFunctions.nodesToStrings(indexValue.elts)
                        });
                    }
                    else if (indexValue._astname === "Str") {
                        allVariables[r].value = "Str";
                    }
                }
            }
        }
        //binops
        for (var i = 0; i < userFunctionReturns.length; i++) {
            if (userFunctionReturns[i].returns === "BinOp") {
                evaluateBinOp("func", i);
            }
        }
        for (var i = 0; i < allVariables.length; i++) {

            if (allVariables[i].value === "BinOp") {
                evaluateBinOp("var", i);
            }
            for (var o in allVariables[i].assignedModified) {
                if (allVariables[i].assignedModified[o].binop != null && typeof allVariables[i].assignedModified[o].binop !== "string" && !Array.isArray(allVariables[i].assignedModified[o].binop)) {

                    var binAM = complexityCalculatorHelperFunctions.recursivelyEvaluateBinOp(allVariables[i].assignedModified[o].binop);
                    allVariables[i].assignedModified[o].binop = binAM;

                    if (binAM === "Str") {
                        allVariables[i].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", allVariables[i].opsDone, allVariables[i].assignedModified[o].line);
                    }
                    if (Array.isArray(binAM)) {
                        allVariables[i].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", allVariables[i].opsDone, allVariables[i].assignedModified[o].line);
                    }
                }
            }
        }
    }

    /* If a BinOp node contains a number of lists, consolidates these into a single array for use in analysis
    * @param node - the BinOp node
    * @returns - An array of AST nodes representing the output of the BinOp
    */
    function getAllBinOpLists(node) {
        function recursivelyGetListValues(node, combinedList) {
            var leftNode = node.left;
            var rightNode = node.right;

            leftNode = complexityCalculatorHelperFunctions.retrieveFromList(leftNode);

            if (leftNode != null) {
                if (leftNode._astname === "BinOp") {
                    recursivelyGetListValues(node.left, combinedList);
                }
                if (leftNode._astname === "Name") {

                    var variable = getVariableObject(leftNode.id.v);
                    if (variable != null) {
                        var eltsToCopy = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno);
                        if (eltsToCopy != null) {
                            for (var i = 0; i < eltsToCopy.length; i++) {
                                combinedList.push(eltsToCopy[i]);
                            }
                        }
                    }
                }

                else if (leftNode._astname === "Call") {
                    var udf = getVariableObject(leftNode.id.v);
                    if (udf != null && udf.nodeElements != null) {
                        for (var i = 0; i < udf.nodeElements.length; i++) {
                            combinedList.push(udf.nodeElements[i]);
                        }
                    }
                }
                else if (leftNode._astname === "List") {
                    for (var i = 0; i < leftNode.elts.length; i++) {
                        combinedList.push(leftNode.elts[i]);
                    }
                }
            }

            rightNode = complexityCalculatorHelperFunctions.retrieveFromList(rightNode);

            if (rightNode != null) {
                if (rightNode._astname === "BinOp") {
                    recursivelyGetListValues(node.right, combinedList);
                }
                if (rightNode._astname === "Name") {

                    var variable = getVariableObject(rightNode.id.v);
                    if (variable != null) {
                        var eltsToCopy = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno);
                        if (eltsToCopy != null) {
                            for (var i = 0; i < eltsToCopy.length; i++) {
                                combinedList.push(eltsToCopy[i]);
                            }
                        }
                    }
                }
                else if (rightNode._astname === "Call") {
                    var udf = getVariableObject(rightNode.id.v);
                    if (udf != null) {
                        if (udf.nodeElements != null) {
                            for (var i = 0; i < udf.nodeElements.length; i++) {
                                combinedList.push(udf.nodeElements[i]);
                            }
                        }
                    }
                }
                else if (rightNode._astname === "List") {
                    for (var i = 0; i < rightNode.elts.length; i++) {
                        combinedList.push(rightNode.elts[i]);
                    }
                }
            }
        }

        if (!Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(node))) {
            return [];
        }
        var combined = [];
        recursivelyGetListValues(node, combined);

        return combined;
    }



    /*Finds out if a node in a user-defined function returns a value, and returns that
    * @param node - the AST node
    * @returns function object populated with necessary values.
    */
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
                for (var i in userFunctionParameters) {
                    if (userFunctionParameters[i].name === functionObject.name) {
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
                    }
                    else {
                        funcName = funcNode.attr.v;
                    }
                    if (funcName === 'readInput') {
                        functionObject.indexAndInput.input = true;
                    }

                    if (userFuncsIndex != -1 && userFunctionParameters[userFuncsIndex].params.includes(funcName)) {
                        //later on, this will be used to simulate a call to this function that was passed as a parameter
                        userFunctionParameters[userFuncsIndex].paramFuncsCalled.push({
                            index: userFunctionParameters[userFuncsIndex].params.indexOf(funcName),
                            node: Object.assign({}, node)
                        });
                    }

                    var isListFunc = false, isStrFunc = false;
                    if (JS_STR_LIST_OVERLAP.includes(funcName) && isJavascript) {
                        var opValType = complexityCalculatorHelperFunctions.getTypeFromNode(funcNode.value);
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

                    if (listFuncs.includes(funcName) && !isStrFunc) {
                        functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", functionObject.opsDone, node.lineno);
                    }
                    if (strFuncs.includes(funcName) && !isListFunc) {
                        functionObject.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", functionObject.opsDone, node.lineno);
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
                }

                //store the type of returned value
                else if (retVal != null) {
                    if (retVal._astname === "BinOp" || retVal._astname === "BoolOp" || retVal._astname === "Compare" || retVal._astname === "List") {
                        //get list/array/string indexing
                        isIndexed = complexityCalculatorHelperFunctions.getIndexingInNode(retVal)[0];
                        functionObject.indexAndInput.strIndexed = complexityCalculatorHelperFunctions.getStringIndexingInNode(retVal)[0];
                    }
                    if (retVal._astname === "Num") {
                        if (!complexityCalculatorHelperFunctions.isNodeFloat(retVal)) {
                            valueType = "Int";
                        }
                        else {
                            valueType = "Float";
                        }
                    }
                    else if (retVal._astname === "Call") {
                        //if it returns another function's return, we look up what THAT function returns. if we know.
                        funcOrVar = "func";
                        var funcName = "";

                        if ('id' in retVal.func) {
                            funcName = retVal.func.id.v;
                        }
                        else {
                            funcName = retVal.func.attr.v;
                        }
                        if (funcName === 'readInput') {
                            functionObject.indexAndInput.input = true;
                        }

                        //special case - returns the returned value of a listOp
                        if (listFuncs.includes(funcName)) {
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
                                var retFunc = getFunctionObject(retVal.func.value.func.id.v);
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
                                var retVar = getVariableObject(retVal.func.value.id.v);
                                if (retVar != null) {
                                    complexityCalculatorHelperFunctions.appendArray(retVar.containedValue, contVal);
                                    opsPerformed = complexityCalculatorHelperFunctions.appendOpList(retVar.opsDone, opsPerformed);
                                }
                            }
                        }

                        //or a strOp
                        if (strFuncs.includes(funcName)) {
                            varVal = "String";
                            opsPerformed = complexityCalculatorHelperFunctions.addOpToList("StrOp", opsPerformed, node.lineno);
                            if (retVal.func.value._astname === "Name") {
                                variablesIncluded = true;
                                var retFunc = getFunctionObject(retVal.func.value.id.v);
                                if (retFunc != null) {
                                    complexityCalculatorHelperFunctions.copyAttributes(retFunc,
                                        functionObject,
                                        ["containedValue",
                                            "opsDone",
                                            "nested",
                                            "indexAndInput",
                                            "nodeElements",
                                            "stringElements",
                                            "original",
                                            "funcVar",
                                            "binOp",
                                            "flagVal"]);
                                }
                            }

                            if (retVal.func.value._astname === "BinOp") {
                                var valsInOp = [];
                                complexityCalculatorHelperFunctions.listTypesWithin(retVal.func.value, valsInOp, functionObject.indexAndInput, functionObject.opsDone);

                                for (var vio = 0; vio < valsInOp.length; vio++) {
                                    contVal.push(valsInOp[vio]);
                                }
                            }
                            if (retVal.func.value._astname === "Call") {
                                var returnedFunc = getFunctionObject(retVal.func.value.id.v);
                                if (returnedFunc != null) {
                                    if (userFunctionReturns[functionNum].containedValue != null && userFunctionReturns[functionNum].containedValue.length > 0) {
                                        for (var cv = 0; cv < userFunctionReturns[functionNum].containedValue.length; cv++) {
                                            contVal.push(userFunctionReturns[functionNum].containedValue[cv]);
                                        }
                                    }
                                    if (userFunctionReturns[functionNum].nested) {
                                        variablesIncluded = true;
                                    }
                                }
                            }
                        }

                        flag = funcName;
                        foundMatch = false;
                        var matchedFunc = getFunctionObject(funcName);

                        //or it returns the return of another function
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
                    }
                    //returns a variable value
                    else if (retVal._astname === "Name") {
                        var isFunctionName = false;

                        for (var i in userFunctionParameters) {
                            if (userFunctionParameters[i].name === retVal.id.v) {
                                isFunctionName = true;
                            }
                        }

                        if (isFunctionName) {
                            //the variable contains a function value
                            valueType = "Function";
                            flag = retVal.id.v;

                        }
                        //otherwise it's a variable the user has declared previously
                        else {
                            if (retVal.id.v === "True" || retVal.id.v === "False") {
                                valueType = "Bool";
                            }
                            else {
                                funcOrVar = "var";
                                variableName = retVal.id.v;
                                flag = variableName;
                                valueType = "";
                                variablesIncluded = true;
                                var varToCopy = getVariableObject(variableName);

                                //copy values from the variable object
                                if (varToCopy != null && varToCopy.value !== "BinOp" && varToCopy.value !== "") {

                                    valueType = varToCopy.value;
                                    contVal = varToCopy.containedValue;
                                    opsPerformed = complexityCalculatorHelperFunctions.appendOpList(varToCopy.opsDone, opsPerformed);


                                    if (varToCopy.nodeElements != null) {
                                        var nodeElementsIndex = -1;
                                        for (var t = 0; t < allVariables[v].nodeElements.length - 1; t++) {
                                            if (allVariables[v].nodeElements[t].line > functionObject.startLine && allVariables[v].nodeElements[t + 1].line > functionObject.endLine) {
                                                nodeElementsIndex = t;
                                                break;
                                            }
                                        }
                                        if (nodeElementsIndex = -1 && allVariables[v].nodeElements[allVariables[v].nodeElements.length - 1].line >= functionObject.startLine &&
                                            allVariables[v].nodeElements[allVariables[v].nodeElements.length - 1].line <= functionObject.endLine) {

                                            nodeElementsIndex = allVariables[v].nodeElements.length - 1;

                                        }
                                        if (nodeElementsIndex = -1) {
                                            nodeElementsIndex = 0;
                                        }


                                        functionObject.nodeElements = [varToCopy.nodeElements[nodeElementsIndex]];
                                        functionObject.stringElements = [varToCopy.stringElements[nodeElementsIndex]];
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
                    }
                    //if it returns a binOp, we have to evaluate what kind of datatype it is.
                    else if (retVal._astname === "BinOp") {


                        opsPerformed = complexityCalculatorHelperFunctions.addOpToList("BinOp", opsPerformed, node.lineno);

                        if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(retVal))) {
                            var binOpElts = getAllBinOpLists(retVal);
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
                        }
                        else {
                            valueType = "";
                        }
                    }

                    //boolop becomes bool
                    else if (retVal._astname === "BoolOp") {
                        valueType = "Bool";
                        complexityCalculatorHelperFunctions.getNestedVariables(retVal, varList);
                        contVal = [];
                        opsPerformed = complexityCalculatorHelperFunctions.addOpToList("BoolOp", opsPerformed, node.lineno);
                        complexityCalculatorHelperFunctions.listTypesWithin(retVal, contVal, functionObject.indexAndInput, opsPerformed);
                    }
                    //store "List" and also all values within that list in nodeElements, stringElements, and containedValue
                    else if (retVal._astname === "List") {
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
                    }
                    //comparison also becomes a bool
                    else if (retVal._astname === "Compare") {
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
                angular.forEach(node.body, function (nodechild) {
                    functionObject = findReturnInBody(nodechild, functionObject);
                });
            }
            else if (node != null && (node._astname != null || node[0] != null)) {
                angular.forEach(node, function (nodechild) {
                    functionObject = findReturnInBody(nodechild, functionObject);
                });
            }
        }

        return functionObject;
    }

    //legacy code; it's still called so I'm not taking it out but this does nothing.
    function total() { return 0; }

    /*Checks a single node for a function definition and adds name to the list if it finds one
    * @param node - The AST node to check
    * @param results - the results object
    */
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


            lineNumber = node.lineno - 1;
            lastLine = complexityCalculatorHelperFunctions.getLastLine(node);
            wholeLoop = studentCode.slice(lineNumber, lastLine);
            userFunctionParameters.push({
                name: node.name.v,
                params: paramList,
                paramFuncsCalled: []
            });

            funcOrVar = "";
            flag = "";
            valueType = "";
            binVal = null;
            functionName = node.name.v;

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
                if (originalityLines.includes(p)) {
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
                uncalledFunctionLines.push(k);
                functionLineMarker.lines.push(k);
            }

            functionLines.push(functionLineMarker);

            //create a new object and add its return value. push to list.
            if (functionObj != null) {
                functionObj.name = functionName;
                functionObj.startLine = node.lineno;
                functionObj.endLine = lastLine;
                userFunctionReturns.push(functionObj);
            }
        }
    }

    /*Checks each line of student code for originality. This is stored for later use.
    */
    function checkOriginality() {
        if (sampleLines == []) {
            for (var sampleLine = 0; sampleLine < sampleCode.length; sampleLine++) {
                var thisSample = complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(sampleCode[sampleLine]);
                sampleLines.push(thisSample);
            }
        }
        for (var studentLine = 0; studentLine < studentCode.length; studentLine++) {
            var isOriginal = true;
            //trim
            var thisLine = complexityCalculatorHelperFunctions.trimCommentsAndWhitespace(studentCode[studentLine]);

            if (thisLine != "") {
                //check against all lines of sample code, also trimmed
                for (var sampleLine = 0; sampleLine < sampleLines.length; sampleLine++) {
                    var thisSample = sampleLines[sampleLine];
                    if (complexityCalculatorHelperFunctions.checkForMatch(thisLine, thisSample, 5)) {
                        isOriginal = false;
                        break;
                    }
                }
            }

            if (isOriginal) {
                //store if it's original
                originalityLines.push(studentLine + 1);
            }
        }
    }

    /*Recursively calls lookForParamReturns on a series of AST nodes.
    * @param ast - AST tree or node.
    */
    function evaluateFunctionReturnParams(ast) {
        if (ast != null && ast.body != null) {
            lookForParamReturns(ast);
            angular.forEach(ast.body, function (node) {
                lookForParamReturns(node);
                evaluateFunctionReturnParams(node);
            });
        }
        else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === 'object'))) {
            lookForParamReturns(ast);
            angular.forEach(ast, function (node) {
                lookForParamReturns(node);
                evaluateFunctionReturnParams(node);
            });
        }
    }

    /* Labels functions that return their own parameters. Also handles function removal from the uncalledFunctionLines if said function is called (we only evaluate in-function code if the function is called)
    * @param node - the node to be checked
    *
    *
    */
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
                    var calledReturnObj = getFunctionObject(calledName);


                    if (calledReturnObj != null && calledReturnObj.startLine != null && (nodeItem.lineno > calledReturnObj.startLine && nodeItem.lineno <= calledReturnObj.endLine)) {
                        isRecursiveCall = true;
                    }
                    var index = -1;
                    for (var userFuncRet = 0; userFuncRet < userFunctionReturns.length; userFuncRet++) {
                        if (userFunctionReturns[userFuncRet].name === funcName) {
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
                        for (var h = 0; h < loopLocations.length; h++) {
                            if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                lineNo = loopLocations[h][0];
                                break;
                            }
                        }


                        if (!isRecursiveCall) {
                            paramArgVar.assignedModified.push({
                                line: lineNo,
                                value: studentCode[nodeItem.lineno - 1].trim(),
                                nodeValue: nodeItem
                            });
                            variableAssignments.push({ line: node.lineno, name: paramArgVar.name });
                        }

                        //fill in param variable values, add to allVariables
                        var alreadyExists = -1;
                        var funcInd = -1;
                        for (var f = 0; f < userFunctionParameters.length; f++) {
                            if (userFunctionParameters[f].name === funcName) {
                                funcInd = f;
                                break;
                            }
                        }

                        if (funcInd != -1) {
                            for (var e = 0; e < allVariables.length; e++) {
                                if (allVariables[e].name === userFunctionParameters[funcInd].params[a]) {
                                    alreadyExists = e;
                                    break;
                                }
                            }

                            paramArgVar.name = userFunctionParameters[funcInd].params[a];
                        }

                        var attrName = node.func.attr.v;
                        //this information is needed so we can get a value for the param variable
                        if (attrName === "map" || attrName === "filter") {
                            var listToUse = [];
                            if ('func' in node && 'attr' in node.func) {
                                opToPerform = node.func.attr.v;
                            }
                            if (node.func.value._astname === "Name") {
                                var variable = getVariableObject(node.func.value.id.v);
                                if (variable != null) {
                                    var correctElts = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno - 1);
                                    if (correctElts != null) {
                                        listToUse = correctElts.slice(0);
                                    }
                                }
                            }
                            else if (node.func.value._astname === "Call") {
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(node.func.value)) {
                                    listToUse = complexityCalculatorHelperFunctions.performListOp(node.func.value, false)[0];
                                }
                                else if (complexityCalculatorHelperFunctions.retrieveFromList(node.func.value) != node.func.value) {
                                    listToUse = complexityCalculatorHelperFunctions.retrieveFromList(node.func.value).elts;
                                }

                                else if ('id' in node.func.value.func) {
                                    var funcName = node.func.value.func.id.v;
                                    var thisLine = node.lineno;


                                    if (getFunctionObject(funcName) != null) {
                                        var variable = getVariableObject(node.func.value.id.v);
                                        if (variable != null) {
                                            var correctElts = complexityCalculatorHelperFunctions.mostRecentElements(variable, node.lineno);
                                            if (correctElts != null) {
                                                listToUse = correctElts.slice(0);
                                            }
                                        }
                                    }
                                }
                            }
                            else if (node.func.value._astname === "List") {
                                listToUse = node.func.value.elts;
                            }
                            else if (node.func.value._astname === "BinOp") {
                                listToUse = getAllBinOpLists(node.func.value);
                            }

                            if (listToUse != null) {
                                paramArgVar.value = complexityCalculatorHelperFunctions.getTypeFromNode(complexityCalculatorHelperFunctions.retrieveFromList(listToUse[0]));
                            }

                        }

                        //add to relevant lists

                        if (paramArgVar.opsDone.length > 0 && index != -1 && userFunctionReturns[index].startLine != null) {
                            paramArgVar.modifyingFunctions.push([userFunctionReturns[index].startLine, userFunctionReturns[index].endLine]);
                        }
                        if (alreadyExists > -1 && (allVariables[alreadyExists].value === "" && paramArgVar.value !== "")) {
                            allVariables[alreadyExists] = paramArgVar;
                        }
                        else if (alreadyExists === -1) {
                            allVariables.push(paramArgVar);
                            variableAssignments.push({ line: node.lineno, name: paramArgVar.name });
                        }
                    }



                    if (index > -1) {
                        //if the function returns one of its own parameters, we now know what datatype that is.

                        if (userFunctionReturns[index].funcVar === "param") {
                            var arg = nodeItem.args[userFunctionReturns[index].flagVal];
                            var argType = arg._astname;
                            var returnType = argType;
                            var containedWithin = [];
                            if (userFunctionReturns[index].opsDone == null) {
                                userFunctionReturns[index].opsDone = [];
                            }

                            if (argType === "Num") {
                                if (!complexityCalculatorHelperFunctions.isNodeFloat(arg)) {
                                    argType = "Int";
                                }
                                else {
                                    argType = "Float";
                                }

                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].returns = argType;
                            }

                            if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                                argType = "Bool";
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].returns = argType;
                            }

                            else if (argType === "Name") {
                                var foundVar = false;
                                for (var v = 0; v < allVariables.length; v++) {
                                    if (allVariables[v].name === arg.id.v && allVariables[v].value !== "" && allVariables[v].value !== "BinOp") {
                                        foundVar = true;
                                        argType = allVariables[v].value;
                                        containedWithin = allVariables[v].containedValue;
                                        userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(allVariables[v].opsDone, userFunctionReturns[index].opsDone);
                                        break;
                                    }
                                }

                                if (foundVar) {
                                    userFunctionReturns[index].funcVar = "";
                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].returns = argType;
                                    if (containedWithin.length > 0) {
                                        userFunctionReturns[index].containedValue = containedWithin;
                                    }
                                }
                                else {
                                    userFunctionReturns[index].funcVar = "var";
                                    userFunctionReturns[index].flagVal = arg.id.v;
                                }
                            }
                            if (argType === "Compare") {
                                argType = "Bool";
                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", userFunctionReturns[index].opsDone, nodeItem.lineno);
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].returns = argType;

                                if (containedWithin.length > 0) {
                                    userFunctionReturns[index].containedValue = containedWithin;
                                }
                            }
                            if (argType === "BoolOp") {
                                argType = "Bool";

                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", userFunctionReturns[index].opsDone, nodeItem.lineno);
                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].flagVal = "";

                                userFunctionReturns[index].returns = argType;
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                if (containedWithin.length > 0) {
                                    userFunctionReturns[index].containedValue = containedWithin;
                                }
                            }
                            if (argType === "Call") {
                                //if the argument is a function call, we need to know what THAT function returns.
                                var foundFunc = false;
                                var funcName = "";
                                if ('id' in nodeItem.value.func) {
                                    funcName = nodeItem.value.func.id.v;
                                }
                                else {
                                    funcName = nodeItem.value.func.attr.v;
                                }
                                if (funcName === 'readInput') {
                                    userFunctionReturns[index].indexAndInput.input = true;
                                }

                                if (listFuncs.includes(funcName)) {
                                    valueType = "List";
                                    userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", userFunctionReturns[index].opsDone, nodeItem.lineno);
                                    if (nodeItem.value.func.value._astname === "List") {
                                        var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(nodeItem.value.func.value.elts, [], userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                        for (var vil = 0; vil < valuesInList; vil++) {
                                            userFunctionReturns[index].containedValue.push(valuesInList[vil]);
                                        }
                                    }
                                    //binop
                                    if (nodeItem.value.func.value._astname === "BinOp") {
                                        var valsInOp = [];

                                        complexityCalculatorHelperFunctions.listTypesWithin(nodeItem.value.func.value, valsInOp, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                        for (var vio = 0; vio < valsInOp.length; vio++) {
                                            userFunctionReturns[index].containedValue.push(valsInOp[vio]);
                                        }
                                    }
                                    //func call
                                    if (nodeItem.value.func.value._astname === "Call" && 'id' in nodeItem.value.func.value) {
                                        var calledFunction = getFunctionObject(nodeItem.value.func.value.id.v);
                                        if (calledFunction != null) {
                                            complexityCalculatorHelperFunctions.copyAttributes(calledFunction, userFunctionReturns[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"]);

                                            if (calledFunction.containedValue != null) {
                                                complexityCalculatorHelperFunctions.appendArray(calledFunction.containedValue, userFunctionReturns[index].containedValue);
                                            }
                                            if (calledFunction.opsDone != null) {
                                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(calledFunction.opsDone, userFunctionReturns[index].opsDone);
                                            }
                                        }
                                    }
                                    //var
                                    if (nodeItem.value.func.value._astname === "Name") {
                                        var valueVariable = getVariableObject(nodeItem.value.func.value.id.v);
                                        if (valueVariable != null) {
                                            complexityCalculatorHelperFunctions.copyAttributes(valueVariable, userFunctionReturns[index], ["indexAndInput", "nested"]);
                                            if (valueVariable.nodeElements.length > 0) {
                                                userFunctionReturns.nodeElements = [valueVariable.nodeElements[0]];
                                                userFunctionReturns.stringElements = [valueVariable.stringElements[0]];
                                            }
                                            complexityCalculatorHelperFunctions.appendArray(valueVariable.containedValue, userFunctionReturns[index].containedValue);
                                            complexityCalculatorHelperFunctions.appendOpList(valueVariable.opsDone, userFunctionReturns[index].opsDone);
                                        }
                                    }
                                }
                                if (strFuncs.includes(funcName)) {
                                    varVal = "String";
                                    userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", userFunctionReturns[index].opsDone, nodeItem.lineno);
                                    if (nodeItem.value.func.value._astname === "Name") {
                                        var otherVar = getVariableObject(nodeItem.value.func.value.id.v);
                                        if (otherVar != null) {
                                            if (otherVar.containedValue != null && otherVar.containedValue.length > 0) {
                                                complexityCalculatorHelperFunctions.appendArray(otherVar.containedValue, userFunctionReturns[index].containedValue);
                                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(otherVar.opsDone, userFunctionReturns[index].opsDone);
                                            }
                                        }
                                    }

                                    if (nodeItem.value.func.value._astname === "BinOp") {
                                        var valsInOp = [];
                                        complexityCalculatorHelperFunctions.listTypesWithin(nodeItem.value.func.value, valsInOp, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                        for (var vio = 0; vio < valsInOp.length; vio++) {
                                            userFunctionReturns[index].containedValue.push(valsInOp[vio]);
                                        }
                                    }
                                    if (nodeItem.value.func.value._astname === "Call") {
                                        for (var functionNum = 0; functionNum < userFunctionReturns.length; functionNum++) {

                                            if (nodeItem.value.func.value.id.v === userFunctionReturns[functionNum].name) {

                                                if (userFunctionReturns[functionNum].containedValue != null && userFunctionReturns[functionNum].containedValue.length > 0) {
                                                    for (var cv = 0; cv < userFunctionReturns[functionNum].containedValue.length; cv++) {
                                                        userFunctionReturns[index].containedValue.push(userFunctionReturns[functionNum].containedValue[cv]);
                                                    }
                                                }
                                                break;
                                            }
                                        }
                                    }
                                }


                                var funcRet = getFunctionObject(arg.id.v);
                                if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                    foundFunc = true;

                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";
                                    userFunctionReturns[index].returns = funcRet.returns;

                                    if (funcRet.containedValue != null) {
                                        userFunctionReturns[index].containedValue = funcRet.containedValue;
                                    }
                                    if (funcRet.opsDone != null) {
                                        complexityCalculatorHelperFunctions.appendOpList(funcRet.opsDone, userFunctionReturns[index].opsDone);
                                    }
                                }
                                if (!foundFunc) {
                                    userFunctionReturns[index].funcVar = "func";
                                    userFunctionReturns[index].flagVal = arg.func.id.v;
                                }

                            }
                            if (argType === "BinOp") {
                                var contVal = [];
                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", userFunctionReturns[index], nodeItem.lineno);
                                var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(arg);


                                if (typeof binVal === "string") {
                                    userFunctionReturns[index].returns = binVal;
                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";
                                }

                                else if (Array.isArray(binVal)) {
                                    userFunctionReturns[index].returns = "List";
                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";

                                    userFunctionReturns[index].nodeElements = [{
                                        line: arg.lineno,
                                        elts: binVal
                                    }];
                                    userFunctionReturns[index].stringElements = [{
                                        line: arg.lineno,
                                        elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                    }];
                                }

                                else {
                                    userFunctionReturns[index].returns = "BinOp";
                                    userFunctionReturns[index].binOp = binVal;
                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                }
                                if (contVal.length > 0) {
                                    userFunctionReturns[index].containedValue = contVal;
                                }
                            }
                            if (argType === "List") {
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";

                                userFunctionReturns[index].returns = "List";
                                userFunctionReturns[index].containedValue = complexityCalculatorHelperFunctions.listTypesWithin(arg.elts, userFunctionReturns[index].containedValue,
                                    userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                userFunctionReturns[index].nodeElements = [{
                                    line: arg.lineno,
                                    elts: arg.elts
                                }];
                                userFunctionReturns[index].stringElements = [{
                                    line: arg.lineno,
                                    elts: complexityCalculatorHelperFunctions.nodesToStrings(arg.elts)
                                }];
                            }
                        }
                    }
                    var modifiesParams = [];


                    //store line numbers and originality
                    lineNumber = 0;
                    if (nodeItem.lineno != null) {
                        lineNumber = nodeItem.lineno;
                        parentLineNumber = lineNumber;
                    }
                    else {
                        lineNumber = parentLineNumber;
                    }

                    var originality = (originalityLines.includes(lineNumber));
                    var startLine = 0;
                    var endLine = 0;

                    for (var f = 0; f < userFunctionReturns.length; f++) {
                        if (userFunctionReturns[f].name === funcName && userFunctionReturns[f].paramsChanged != null) {
                            modifiesParams = userFunctionReturns[f].paramsChanged;
                            startLine = userFunctionReturns[f].startLine;
                            endLine = userFunctionReturns[f].endLine;
                            break;
                        }
                    }


                    //update assignedModified for any params that the function modifies
                    for (var a = 0; a < argsIn.length; a++) {
                        if (modifiesParams.includes(a) && (argsIn[a]._astname === "Name" && argsIn[a].id.v !== "True" && argsIn[a].id.v !== "False")) {
                            modString = studentCode[nodeItem.lineno - 1];

                            for (var v = 0; v < allVariables.length; v++) {
                                if (allVariables[v].name === argsIn[a].id.v) {
                                    var lineNo = nodeItem.lineno;
                                    for (var h = 0; h < loopLocations.length; h++) {
                                        if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                            lineNo = loopLocations[h][0];
                                            break;
                                        }
                                    }

                                    allVariables[v].assignedModified.push({
                                        line: lineNo,
                                        value: studentCode[lineNumber].trim(),
                                        original: originality,
                                        nodeValue: nodeItem
                                    });
                                    variableAssignments.push({ line: nodeItem.lineno, name: allVariables[v].name });

                                    allVariables[v].modifyingFunctions.push([startLine, endLine]);
                                    break;
                                }
                            }
                        }
                    }


                    //Handle uncalledFunctionLines. a functionExp is generally ALWAYS called.
                    for (var p = 0; p < functionLines.length; p++) {
                        if (functionLines[p].name === funcName) {
                            //remove lines from uncalledFunctionLines
                            for (var l = 0; l < functionLines[p].lines.length; l++) {
                                var lineIndex = uncalledFunctionLines.indexOf(functionLines[p].lines[l]);
                                uncalledFunctionLines.splice(lineIndex, 1);
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
            }
            else if ('attr' in node.func) {
                funcName = node.func.attr.v;
                nodeArgs = [node.func.value];
            }
            else if (node.func._astname === "Subscript") {
                var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);
                if (nameNode._astname === "Name") {
                    funcName = nameNode.id.v;
                }
                argsIn = node.args;
            }

            //if we haven't stored the name yet, check the function renames in for loops
            for (var f = 0; f < userFunctionParameters.length; f++) {
                if (userFunctionParameters[f].name === funcName) {
                    alreadyExists = true;
                    funcInd = f;
                    break;
                }
            }

            if (!alreadyExists) {
                var alias = null;
                for (var h in forLoopFuncs) {
                    if (forLoopFuncs[h].callName === funcName) {
                        alreadyExists = true;
                        funcNames = forLoopFuncs[h].functionNames;
                        break;
                    }
                }
            }
            else {
                funcNames = [funcName];
            }

            //we have to do this for each stored name
            for (var r in funcNames) {
                var foundName = false;
                var calledName = funcNames[r];

                for (var f = 0; f < userFunctionParameters.length; f++) {
                    if (userFunctionParameters[f].name === calledName) {
                        foundName = true;
                        funcInd = f;
                        break;
                    }
                }
                for (var p = 0; p < functionLines.length; p++) {
                    for (var n = 0; n < userFunctionRenames.length; n++) {
                        if (userFunctionRenames[n][0] === calledName) {
                            calledName = userFunctionRenames[n][1];
                        }
                    }

                    if (functionLines[p].name === calledName) {
                        //remove lines from uncalledFunctionLines
                        for (var l = 0; l < functionLines[p].lines.length; l++) {
                            var lineIndex = uncalledFunctionLines.indexOf(functionLines[p].lines[l]);
                            uncalledFunctionLines.splice(lineIndex, 1);
                        }
                        break;
                    }
                }

                var ops = [];
                var isRecursiveCall = false;
                var calledReturnObj = getFunctionObject(calledName);

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
                    //create a variable object for each parameter, adding to allVariables
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
                        for (var h = 0; h < loopLocations.length; h++) {
                            if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                lineNo = loopLocations[h][0];
                                break;
                            }
                        }

                        if (!isRecursiveCall) {
                            paramArgVar.assignedModified.push({
                                line: lineNo,
                                value: studentCode[node.lineno - 1].trim(),
                                nodeValue: node
                            });
                            variableAssignments.push({ line: node.lineno, name: paramArgVar.name });
                        }

                        var alreadyExists = -1;
                        for (var e = 0; e < allVariables.length; e++) {
                            if (allVariables[e].name === userFunctionParameters[funcInd].params[a]) {
                                alreadyExists = e;
                                break;
                            }
                        }

                        if (funcInd != -1) {
                            paramArgVar.name = userFunctionParameters[funcInd].params[a];
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
                            }

                            else if (type === "AugAssign") {
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("AugAssign", paramArgVar.opsDone, node.lineno);
                            }

                            else if (type === "Num") {
                                if (!complexityCalculatorHelperFunctions.isNodeFloat(node.args[a])) {
                                    paramArgVar.value = "Int";
                                }
                                else {
                                    paramArgVar.value = "Float";
                                }
                            }
                            else if (type === "Name" && (argsIn[a].id.v === "True" || argsIn[a].id.v === "False")) {
                                paramArgVar.value = "Bool";
                            }
                            else if (type === "Name") {
                                var otherVar = node.args[a].id.v;
                                var foundOtherVar = false;
                                var otherVariableLocated = getVariableObject(otherVar);

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
                            }
                            else if (type === "BinOp") {
                                var nestedBinOp = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(node.args[a], nestedBinOp);
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", paramArgVar.opsDone, node.lineno);

                                if (nestedBinOp.length > 0) {
                                    paramArgVar.nested = true;
                                }


                                var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(node.args[a]);
                                if (binVal != null && typeof binVal === 'string' && !binVal.includes(':')) {
                                    paramArgVar.value = binVal;
                                }

                                //list binops
                                else if (binVal != null && Array.isArray(binVal)) {
                                    paramArgVar.value = "List";
                                    paramArgVar.nodeElements.push({
                                        line: node.lineno,
                                        elts: binVal
                                    });
                                    paramArgVar.stringElements.push({
                                        line: node.lineno,
                                        elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                    });
                                }
                                //if we don't have an answer yet, store the binop object for later evaluation
                                else {
                                    paramArgVar.value = "BinOp";
                                    paramArgVar.binOp = binVal;
                                }

                                var binOpTypes = complexityCalculatorHelperFunctions.listTypesWithin(node.args[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                                paramArgVar.containedVal = binOpTypes;

                            }
                            else if (type === "Call") {
                                //then it's whatever that call returns
                                var funcName = "";
                                var item = argsIn[a].func;
                                item = complexityCalculatorHelperFunctions.retrieveFromList(argsIn[a].func);
                                if ('id' in item) {
                                    funcName = item.id.v;
                                }
                                else if ('attr' in item) {
                                    funcName = item.attr.v;
                                }
                                if (funcName === 'readInput') {
                                    functionObject.indexAndInput.input = true;
                                }

                                if (listFuncs.includes(funcName)) {
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
                                        var paramCall = getFunctionObject(node.value.func.value.id.v);
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
                                        var calledVar = getVariableObject(node.value.func.value.id.v);
                                        if (calledVar != null) {

                                            complexityCalculatorHelperFunctions.appendArray(calledVar.containedValue, paramArgVar.containedValue);
                                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(calledVar.opsDone, paramArgVar.opsDone);


                                            complexityCalculatorHelperFunctions.appendArray(paramCall.stringElements, paramArgVar.stringElements);
                                            complexityCalculatorHelperFunctions.appendArray(paramCall.nodeElements, paramArgVar.nodeElements);
                                        }
                                    }
                                }

                                if (strFuncs.includes(funcName)) {
                                    varVal = "String";
                                    paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", paramArgVar.opsDone, node.lineno);

                                    //if it's a string op, we need to get the arguments passed and store these in containedValue
                                    if (item.value._astname === "Name") {

                                        var otherVar = getVariableObject(item.value.id.v);
                                        if (otherVar != null) {

                                            complexityCalculatorHelperFunctions.copyAttributes(otherVar, paramArgVar, ["nested", "binOp", "original", "nodeElements", "stringElements"]);
                                            complexityCalculatorHelperFunctions.copyAttributes(otherVar.indexAndInput, paramArgVar.indexAndInput, ["input", "indexed", "strIndexed"]);

                                            complexityCalculatorHelperFunctions.appendArray(otherVar.containedValue, paramArgVar.containedValue);
                                            paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(otherVar.opsDone, paramArgVar.opsDone);

                                        }
                                    }
                                    if (item.value._astname === "BinOp") {
                                        var valsInOp = [];
                                        complexityCalculatorHelperFunctions.listTypesWithin(item.value, valsInOp, paramArgVar.indexAndInput, paramArgVar.opsDone);
                                        for (var vio = 0; vio < valsInOp.length; vio++) {
                                            paramArgVar.containedValue.push(valsInOp[vio]);
                                        }
                                    }

                                    if (item.value._astname === "Call") {
                                        functionNameVal = ""
                                        var funcName = "";

                                        //if it's a function call, get all the info from THAT

                                        //get function name
                                        if ('id' in item.value.func) {
                                            funcName = item.value.func.id.v;
                                        }

                                        else if (item.value.func._astname === "Subscript" || complexityCalculatorHelperFunctions.retrieveFromList(item.value.func) != item.value.func) {
                                            var funcNameNode = null;
                                            funcNameNode = complexityCalculatorHelperFunctions.retrieveFromList(item.value.func);
                                            if (funcNameNode._astname === "Name") {
                                                funcName = funcNameNode.id.v;
                                            }
                                        }
                                        else {
                                            funcName = item.value.func.attr.v;
                                        }


                                        var valueFunc = getFunctionObject(funcName);

                                        //copy info
                                        if (valueFunc != null && (valueFunc.containedValue != null && valueFunc.containedValue.length > 0)) {
                                            complexityCalculatorHelperFunctions.appendArray(valueFunc.containedValue, paramArgVar.containedValue);
                                            complexityCalculatorHelperFunctions.copyAttributes(valueFunc.indexAndInput, paramArgVar.indexAndInput, ["input", "indexed", "strIndexed"]);
                                        }

                                        //set value and other attributes
                                        var functionReturn = getFunctionObject(funcName);

                                        if (functionReturn != null && functionReturn.returns !== "" && functionReturn !== "BinOp") {
                                            paramArgVar.value = functionReturn.returns;

                                            if (functionValue.containedValue != null) {
                                                complexityCalculatorHelperFunctions.copyAttributes(functionReturn, paramArgVar, ["nested", "binOp", "original", "nodeElements", "stringElements", "indexAndInput"]);
                                                if (functionReturn.containedValue != null) {
                                                    complexityCalculatorHelperFunctions.appendArray(functionReturn.containedValue, paramArgVar.containedValue);
                                                }
                                                if (functionReturn.opsDone != null) {
                                                    paramArgVar.opsDone = complexityCalculatorHelperFunctions.appendOpList(functionReturn.opsDone, paramArgVar.opsDone);
                                                }
                                            }
                                        }
                                        if (varVal === "") {
                                            paramArgVar.funcVar = "func";
                                            paramArgVar.flagVal = funcName;
                                        }
                                    }
                                }
                            }

                            else if (type === "BoolOp") {
                                paramArgVar.value = "Bool";
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", paramArgVar.opsDone, node.lineno);

                                var boolOpVals = complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                                if (boolOpVals.length > 0) {
                                    paramArgVar.containedValue = boolOpVals;
                                }
                            }
                            else if (type === "List") {
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
                            }
                            else if (type === "Compare") {
                                paramArgVar.value = "Bool";
                                paramArgVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", paramArgVar.opsDone, node.lineno);

                                var compareTypes = complexityCalculatorHelperFunctions.listTypesWithin(argsIn[a], [], paramArgVar.indexAndInput, paramArgVar.opsDone);
                                if (compareTypes.length > 0) {
                                    paramArgVar.containedValue = compareTypes;
                                }
                            }

                            var index = -1;

                            for (var userFuncRet = 0; userFuncRet < userFunctionReturns.length; userFuncRet++) {

                                if (userFunctionReturns[userFuncRet].name === funcName) {
                                    index = userFuncRet;
                                    break;
                                }
                            }

                            if (paramArgVar.opsDone.length > 0 && index != -1 && userFunctionReturns[index].startLine != null) {
                                paramArgVar.modifyingFunctions.push([userFunctionReturns[index].startLine, userFunctionReturns[index].endLine]);
                            }

                            if (alreadyExists > -1 && (allVariables[alreadyExists].value === "" && paramArgVar.value !== "")) {
                                allVariables[alreadyExists] = paramArgVar;
                            }
                            else if (alreadyExists === -1) {
                                allVariables.push(paramArgVar);

                                variableAssignments.push({ line: node.lineno, name: paramArgVar.name });
                            }
                        }
                    }

                    if (index > -1) {
                        //if the function returns this parameter, we tell it what that is
                        if (userFunctionReturns[index].funcVar === "param") {
                            var arg = node.args[userFunctionReturns[index].flagVal];
                            var argType = arg._astname;
                            var returnType = argType;
                            var containedWithin = [];


                            if (userFunctionReturns[index].opsDone == null) {
                                userFunctionReturns[index].opsDone = [];
                            }
                            if (argType === "Num") {
                                if (!complexityCalculatorHelperFunctions.isNodeFloat(arg)) {
                                    argType = "Int";
                                }
                                else {
                                    argType = "Float";
                                }
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].returns = argType;
                            }
                            if (argType === "Name" && (arg.id.v === "True" || arg.id.v === "False")) {
                                argType = "Bool";

                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";

                                userFunctionReturns[index].returns = argType;
                            }
                            else if (argType === "Name") {
                                var foundVar = false;
                                for (var v = 0; v < allVariables.length; v++) {

                                    if (allVariables[v].name === arg.id.v && allVariables[v].value !== "" && allVariables[v].value !== "BinOp") {

                                        foundVar = true;
                                        argType = allVariables[v].value;

                                        containedWithin = allVariables[v].containedValue;
                                        userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(allVariables[v].opsDone, userFunctionReturns[index].opsDone);

                                        break;
                                    }
                                }
                                if (foundVar) {
                                    userFunctionReturns[index].funcVar = "";
                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].returns = argType;

                                    if (containedWithin.length > 0) {
                                        userFunctionReturns[index].containedValue = containedWithin;
                                    }
                                }
                                else {
                                    userFunctionReturns[index].funcVar = "var";
                                    userFunctionReturns[index].flagVal = arg.id.v;
                                }
                            }

                            if (argType === "Compare") {
                                argType = "Bool";
                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("Compare", userFunctionReturns[index].opsDone, node.lineno);
                                complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].flagVal = "";

                                userFunctionReturns[index].returns = argType;
                                if (containedWithin.length > 0) {
                                    userFunctionReturns[index].containedValue = containedWithin;
                                }
                            }

                            if (argType === "BoolOp") {
                                argType = "Bool";
                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BoolOp", userFunctionReturns[index].opsDone, node.lineno);

                                userFunctionReturns[index].funcVar = "";
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].returns = argType;

                                complexityCalculatorHelperFunctions.listTypesWithin(arg, containedWithin, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                if (containedWithin.length > 0) {
                                    userFunctionReturns[index].containedValue = containedWithin;
                                }
                            }
                            if (argType === "Call") {
                                var foundFunc = false;
                                var funcName = "";

                                if ('id' in node.value.func) {
                                    funcName = node.value.func.id.v;
                                }
                                else {
                                    funcName = node.value.func.attr.v;
                                }
                                if (funcName === 'readInput') {
                                    userFunctionReturns[index].indexAndInput.input = true;
                                }


                                if (listFuncs.includes(funcName)) {
                                    valueType = "List";
                                    userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", userFunctionReturns[index].opsDone, node.lineno);

                                    if (node.value.func.value._astname === "List") {
                                        var valuesInList = complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value.elts, [], userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                        for (var vil = 0; vil < valuesInList; vil++) {
                                            userFunctionReturns[index].containedValue.push(valuesInList[vil]);
                                        }
                                    }
                                    //binop
                                    if (node.value.func.value._astname === "BinOp") {
                                        var valsInOp = [];
                                        complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value, valsInOp, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                        for (var vio = 0; vio < valsInOp.length; vio++) {
                                            userFunctionReturns[index].containedValue.push(valsInOp[vio]);
                                        }
                                    }
                                    //func call
                                    if (node.value.func.value._astname === "Call" && 'id' in node.value.func.value) {
                                        var calledFunction = getFunctionObject(node.value.func.value.id.v);
                                        if (calledFunction != null) {
                                            complexityCalculatorHelperFunctions.copyAttributes(calledFunction, userFunctionReturns[index], ["original", "binOp", "indexAndInput", "nodeElements", "stringElements", "nested"]);


                                            if (calledFunction.containedValue != null) {
                                                complexityCalculatorHelperFunctions.appendArray(calledFunction.containedValue, userFunctionReturns[index].containedValue);
                                            }
                                            if (calledFunction.opsDone != null) {
                                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(calledFunction.opsDone, userFunctionReturns[index].opsDone);
                                            }
                                        }
                                    }
                                    //var
                                    if (node.value.func.value._astname === "Name") {
                                        var valueVariable = getVariableObject(node.value.func.value.id.v);

                                        if (valueVariable != null) {
                                            complexityCalculatorHelperFunctions.copyAttributes(valueVariable, userFunctionReturns[index], ["indexAndInput", "nested"]);

                                            if (valueVariable.nodeElements.length > 0) {
                                                userFunctionReturns.nodeElements = [valueVariable.nodeElements[0]];
                                                userFunctionReturns.stringElements = [valueVariable.stringElements[0]];
                                            }

                                            complexityCalculatorHelperFunctions.appendArray(valueVariable.containedValue, userFunctionReturns[index].containedValue);
                                            complexityCalculatorHelperFunctions.appendOpList(valueVariable.opsDone, userFunctionReturns[index].opsDone);
                                        }
                                    }
                                }
                                if (strFuncs.includes(funcName)) {
                                    varVal = "String";
                                    userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", userFunctionReturns[index].opsDone, node.lineno);

                                    if (node.value.func.value._astname === "Name") {
                                        var otherVar = getVariableObject(node.value.func.value.id.v);
                                        if (otherVar != null && (otherVar.containedValue != null && otherVar.containedValue.length > 0)) {
                                            complexityCalculatorHelperFunctions.appendArray(otherVar.containedValue, userFunctionReturns[index].containedValue);
                                            userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.appendOpList(otherVar.opsDone, userFunctionReturns[index].opsDone);
                                        }
                                    }

                                    if (node.value.func.value._astname === "BinOp") {
                                        var valsInOp = [];

                                        complexityCalculatorHelperFunctions.listTypesWithin(node.value.func.value, valsInOp, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                        for (var vio = 0; vio < valsInOp.length; vio++) {
                                            userFunctionReturns[index].containedValue.push(valsInOp[vio]);
                                        }
                                    }
                                    if (node.value.func.value._astname === "Call") {
                                        for (var functionNum = 0; functionNum < userFunctionReturns.length; functionNum++) {

                                            if (node.value.func.value.id.v === userFunctionReturns[functionNum].name) {

                                                if (userFunctionReturns[functionNum].containedValue != null && userFunctionReturns[functionNum].containedValue.length > 0) {

                                                    for (var cv = 0; cv < userFunctionReturns[functionNum].containedValue.length; cv++) {
                                                        userFunctionReturns[index].containedValue.push(userFunctionReturns[functionNum].containedValue[cv]);
                                                    }
                                                }

                                                break;
                                            }
                                        }
                                    }
                                }

                                var funcRet = getFunctionObject(arg.id.v);

                                if (funcRet != null && funcRet.returns !== "" && funcRet.returns !== "BinOp") {
                                    foundFunc = true;
                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";

                                    userFunctionReturns[index].returns = funcRet.returns;

                                    if (funcRet.containedValue != null) {
                                        userFunctionReturns[index].containedValue = funcRet.containedValue;
                                    }
                                    if (funcRet.opsDone != null) {
                                        complexityCalculatorHelperFunctions.appendOpList(funcRet.opsDone, userFunctionReturns[index].opsDone);
                                    }
                                }

                                if (!foundFunc) {
                                    userFunctionReturns[index].funcVar = "func";
                                    userFunctionReturns[index].flagVal = arg.func.id.v;
                                }
                            }
                            if (argType === "BinOp") {
                                var contVal = [];
                                userFunctionReturns[index].opsDone = complexityCalculatorHelperFunctions.addOpToList("BinOp", userFunctionReturns[index], node.lineno);
                                var binVal = complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(arg);


                                if (typeof binVal === "string") {
                                    userFunctionReturns[index].returns = binVal;
                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);


                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";
                                }
                                else if (Array.isArray(binVal)) {
                                    userFunctionReturns[index].returns = "List";
                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);

                                    userFunctionReturns[index].flagVal = "";
                                    userFunctionReturns[index].funcVar = "";

                                    userFunctionReturns[index].nodeElements = [{
                                        line: arg.lineno,
                                        elts: binVal
                                    }];
                                    userFunctionReturns[index].stringElements = [{
                                        line: arg.lineno,
                                        elts: complexityCalculatorHelperFunctions.nodesToStrings(binVal)
                                    }];
                                }

                                else {
                                    userFunctionReturns[index].returns = "BinOp";
                                    userFunctionReturns[index].binOp = binVal;

                                    complexityCalculatorHelperFunctions.listTypesWithin(arg, contVal, userFunctionReturns[index].indexAndInput, userFunctionReturns[index].opsDone);
                                }

                                if (contVal.length > 0) {
                                    userFunctionReturns[index].containedValue = contVal;
                                }
                            }
                            if (argType === "List") {
                                userFunctionReturns[index].flagVal = "";
                                userFunctionReturns[index].funcVar = "";

                                userFunctionReturns[index].returns = "List";

                                userFunctionReturns[index].containedValue = complexityCalculatorHelperFunctions.listTypesWithin(arg.elts,
                                    userFunctionReturns[index].containedValue,
                                    userFunctionReturns[index].indexAndInput,
                                    userFunctionReturns[index].opsDone);


                                userFunctionReturns[index].nodeElements = [{
                                    line: arg.lineno,
                                    elts: arg.elts
                                }];
                                userFunctionReturns[index].stringElements = [{
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
                            parentLineNumber = lineNumber;
                        }

                        else {
                            lineNumber = parentLineNumber;
                        }
                        var originality = (originalityLines.includes(lineNumber));

                        funcName = node.func.id.v;
                        nodeArgs = node.args;

                        var startLine = 0;
                        var endLine = 0;

                        for (var f = 0; f < userFunctionReturns.length; f++) {
                            if (userFunctionReturns[f].name === funcName && userFunctionReturns[f].paramsChanged != null) {
                                modifiesParams = userFunctionReturns[f].paramsChanged;

                                startLine = userFunctionReturns[f].startLine;
                                endLine = userFunctionReturns[f].endLine;
                                break;
                            }
                        }

                        for (var a = 0; a < nodeArgs.length; a++) {
                            if (modifiesParams.includes(a) && (nodeArgs[a]._astname === "Name" && nodeArgs[a].id.v !== "True" && nodeArgs[a].id.v !== "False")) {
                                modString = studentCode[node.lineno - 1];
                                for (var v = 0; v < allVariables.length; v++) {

                                    if (allVariables[v].name === nodeArgs[a].id.v) {
                                        var lineNo = node.lineno;

                                        for (var h = 0; h < loopLocations.length; h++) {
                                            if (lineNo >= loopLocations[h][0] && lineNo <= loopLocations[h][1]) {
                                                lineNo = loopLocations[h][0];
                                                break;
                                            }
                                        }

                                        allVariables[v].assignedModified.push({
                                            line: lineNo,
                                            value: studentCode[lineNumber].trim(),
                                            original: originality,
                                            nodeValue: node
                                        });
                                        variableAssignments.push({ line: node.lineno, name: allVariables[v].name });
                                        allVariables[v].modifyingFunctions.push([startLine, endLine]);

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
        originality = (originalityLines.includes(lineNumber));

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

            allCalls.push(callObject);


            if (apiFunctions.includes(functionNameNode.id.v)) {

                apiCalls.push(callObject);

            }
        }
        else if (functionNameNode != null && 'attr' in functionNameNode) {
            var callObject = {};
            callObject.line = node.lineno;
            callObject.function = functionNameNode.attr.v;
            callObject.args = [];

            if (node.args != null) {
                callObject.args = complexityCalculatorHelperFunctions.getArgValuesFromArray([functionNameNode.value], node.lineno);
            }

            allCalls.push(callObject);
        }

        //if it's a function that's been renamed, we count this as variables being 3
        if (originality) {
            //go through function renames
            //the varname is the first one
            for (var i in userFunctionRenames) {
                if (userFunctionRenames[i][0] === functionNameNode.id.v && results.variables < 3) {
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
        }
        else if ('attr' in node.func) {
            funcName = node.func.attr.v;
        }
        else if (node.func._astname === "Subscript") {
            var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);

            if (nameNode._astname === "Name") {
                funcName = nameNode.id.v;
                if (originality || getFunctionObject(funcName).original) {
                    results.lists = 4;
                }
            }
        }
        else if (complexityCalculatorHelperFunctions.retrieveFromList(node.func) != node.func) {
            var nameNode = complexityCalculatorHelperFunctions.retrieveFromList(node.func);

            if (nameNode._astname === "Name") {
                funcName = nameNode.id.v;
                if (originality || getFunctionObject(funcName).original) {
                    results.lists = 4;
                }
            }
        }
        for (var f = 0; f < userFunctionParameters.length; f++) {
            if (userFunctionParameters[f].name === funcName) {
                foundFunc = true;
                functionParametersIndex = f;
                break;
            }
        }


        //using a list as a makeBeat() parameter counts as indexing it for a purpose.
        if ((funcName === "makeBeat" || makeBeatRenames.includes(funcName)) && results.lists < 4 && node.args.length > 0) {

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
                if (complexityCalculatorHelperFunctions.doesCallCreateList(firstArg)) {
                    mbList = true;
                }
                else if ('id' in firstArg.func) {
                    //else, is it a UDF/api func that returns a list?
                    var calledFunc = getFunctionObject(firstArg.func.id.v);

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
                    var argVar = getVariableObject(firstArg.id.v);

                    if (argVar != null && argVar.value === "List") {
                        mbList = true;
                        listOrig = argVar.original;
                    }
                }
            }
            if (mbList && (listOrig || originality)) {
                results.lists = 4;
            }
        }


        //let's check the args
        //using something as an argument counts as using "for a purpose," so this gets updated in the results.
        var floats = false;
        var ints = false;
        var strings = false;
        var bools = false;
        var lists = false;
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
        }
        else if ('attr' in node.func) {
            funcName = node.func.attr.v;
            if (node.func.value._astname === "Name") {
                nodeArgs = [node.func.value];
            }
            else if (node.func.value._astname === "List") {
                nodeArgs = node.func.value.elts;
            }
            else if (node.func.value._astname === "Str") {
                nodeArgs = [node.func.value];
            }

            if (node.args != null) {
                for (var i in node.args) {
                    nodeArgs.push(node.args[i]);
                }
            }
        }



        var thisFuncReturnObj = getFunctionObject(funcName);
        if (thisFuncReturnObj != null && thisFuncReturnObj.original != null && thisFuncReturnObj.original === true) {
            functionOriginality = true;
        }

        //update contained values as well
        if (functionOriginality && thisFuncReturnObj.opsDone != null) {
            for (var i in thisFuncReturnObj.opsDone) {
                opsUsed.push(thisFuncReturnObj.opsDone[i].op);
            }
            for (var i in thisFuncReturnObj.containedValue) {
                if (thisFuncReturnObj.containedValue[i] === "Str") {
                    strings = true;
                }
                if (thisFuncReturnObj.containedValue[i] === "Bool") {
                    bools = true;
                }
                if (thisFuncReturnObj.containedValue[i] === "Int") {
                    ints = true;
                }
                if (thisFuncReturnObj.containedValue[i] === "List") {
                    lists = true;
                }
                if (thisFuncReturnObj.containedValue[i] === "Float") {
                    floats = true;
                }
            }

        }
        //if anything reaches a new level, update the results.
        if (originality || functionOriginality) {
            if (floats) {
                results.floats = 3;
            }
            if (ints) {
                results.ints = 3;
            }
            if (strings && results.strings < 3) {
                results.strings = 3;
            }
            if (bools) {
                results.booleans = 3;
            }
            if (lists && (results.lists < 3)) {
                results.lists = 3;
            }
        }


        //check for various datatypes in the arguments of the call
        for (var a = 0; a < nodeArgs.length; a++) {

            var floats = false;
            var ints = false;
            var strings = false;
            var bools = false;
            var lists = false;

            var singleArg = nodeArgs[a];




            //extract values from UnaryOp and Subscript nodes
            if (singleArg._astname === "UnaryOp") {
                var anyOr = originality;
                if (!originality) {
                    var unaryNames = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(singleArg, unaryNames);

                    for (var p in unaryNames) {
                        var isVar = getVariableObject(unaryNames[p]);
                        if (isVar != null && isVar.original) {
                            anyOr = true;
                            break;
                        }
                    }
                }
                if (anyOr) {
                    results.booleans = 3;
                }
                singleArg = singleArg.operand;
            }
            if (complexityCalculatorHelperFunctions.retrieveFromList(singleArg) != singleArg) {
                var varsIn = [];
                complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);
                var anyOriginality = originality;

                if (!anyOriginality) {
                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                        if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
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
                    if (complexityCalculatorHelperFunctions.getStringIndexingInNode(singleArg)[0]) {
                        results.strings = 4;
                    }
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[0]) {
                        results.lists = 4;
                    }
                }

                var varsIn = [];
                complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);

                var anyOriginality = originality;
                if (!anyOriginality) {
                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                        if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
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

                    var anyOr = originality;
                    if (!originality) {
                        var unaryNames = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(singleArg, unaryNames);
                        for (var p in unaryNames) {
                            var isVar = getVariableObject(unaryNames[p]);
                            if (isVar != null && isVar.original) {
                                anyOr = true;
                                break;
                            }
                        }
                    }

                    if (anyOr) {
                        results.booleans = 3;
                    }
                    singleArg = singleArg.operand;
                }

                //special handling for function expressions
                if (singleArg._astname === "FunctionExp") {
                    var nameString = "";
                    var funcExpOriginality = false;
                    nameString += singleArg.lineno + "|" + singleArg.col_offset;

                    for (var i in userFunctionParameters) {
                        if (userFunctionParameters[i].name === nameString) {
                            if (userFunctionParameters[i].params.length > 0) {
                                takesArgs = true;
                            }
                            break;
                        }
                    }

                    if (getFunctionObject(nameString) != null && getFunctionObject(nameString).returns != null && getFunctionObject(nameString).returns !== "") {
                        returns = true;
                    }

                    if (getFunctionObject(nameString).originality != null && getFunctionObject(nameString).originality === true) {
                        funcExpOriginality = true;
                    }

                    if ((originality || funcExpOriginality) && Number.isInteger(results.userFunc) && results.userFunc < 3) {
                        results.userFunc = 3;
                    }
                    if (takesArgs && !returns && results.userFunc === 3) {
                        results.userFunc = "Args";
                    }
                    else if (!takesArgs && returns && (results.userFunc === 3)) {
                        results.userFunc = "Returns";
                    }
                    else if ((!takesArgs && returns && results.userFunc === "Args") || ((takesArgs && !returns && results.userFunc === "Returns"))) {
                        results.userFunc = "ReturnAndArgs"
                    }
                    else if (takesArgs && returns && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
                        results.userFunc = "ReturnAndArgs";
                    }


                    if (functionParametersIndex > -1) {
                        //if a matches an index, make a fake node and recursively analyze

                        for (var paramFunc in userFunctionParameters[functionParametersIndex].paramFuncsCalled) {
                            if (userFunctionParameters[functionParametersIndex].paramFuncsCalled[paramFunc].index === a) {
                                //make a fake node
                                var fakeNode = Object.assign({}, userFunctionParameters[functionParametersIndex].paramFuncsCalled[paramFunc].node);

                                if (singleArg._astname === "Name") {
                                    fakeNode.func = Object.assign({}, singleArg);
                                    fakeNode.func._astname = "Name";
                                    fakeNode._astname = "Call";
                                    analyzeFunctionCall(fakeNode, results, loopParent, opsUsed, purposeVars);
                                }

                                break;
                            }
                        }
                    }
                }

                //if the argument is a call to another function, look up what it contains/returns
                if (singleArg._astname === "Call") {
                    var lineNumberToUse = node.lineno;
                    if (complexityCalculatorHelperFunctions.doesCallCreateList(node) || complexityCalculatorHelperFunctions.doesCallCreateString(node)) {
                        lineNumberToUse = node.lineno - 1;
                    }


                    //get the name and arguments
                    var funcName = "";
                    var argFunc = singleArg.func;
                    argFunc = complexityCalculatorHelperFunctions.retrieveFromList(argFunc);

                    if ('id' in argFunc) {
                        funcName = argFunc.id.v;
                    }
                    else if ('attr' in argFunc) {
                        funcName = argFunc.attr.v;
                    }
                    if (listFuncs.includes(funcName)) {
                        lists = true;
                        if (!opsUsed.includes("ListOp")) {
                            opsUsed.push("ListOp");
                        }
                    }
                    if (strFuncs.includes(funcName)) {
                        strings = true;
                        if (!opsUsed.includes("StrOp")) {
                            opsUsed.push("StrOp");
                        }
                    }
                    if (funcName === "readInput") {
                        results.consoleInput = 3;
                    }


                    //get returns values
                    var funcReturn = "";
                    var returnContains = [];
                    var funcItem = getFunctionObject(funcName);

                    if (funcItem != null) {
                        funcReturn = funcItem.returns;

                        if (funcItem.containedValue != null) {
                            returnContains = funcItem.containedValue;
                        }
                        if (funcItem.nested) {
                            purposeVars = true;
                        }
                        if (funcItem.indexAndInput != null && funcItem.indexAndInput.indexed) {
                            results.lists = 4;
                        }
                        if (funcItem.indexAndInput != null && funcItem.indexAndInput.strIndexed) {
                            results.strings = 4;
                        }
                        if (funcItem.opsDone != null) {
                            var opsUsedList = complexityCalculatorHelperFunctions.opsBeforeLine(funcItem.opsDone, lineNumberToUse, "func", funcItem);
                            complexityCalculatorHelperFunctions.appendArray(opsUsedList, opsUsed);
                        }
                    }


                    //update results object accordingly
                    if (funcReturn === "Str" && results.strings < 3) {
                        results.strings = 3;
                    }
                    if (funcReturn === "Int") {
                        ints = true;
                    }
                    if (funcReturn === "Float") {
                        floats = true;
                    }
                    if (funcReturn === "Bool") {
                        bools = true;
                    }
                    if (funcReturn === "List" && (results.lists < 3)) {
                        lists = true;
                    }

                    if (returnContains != null) {
                        for (var ret = 0; ret < returnContains.length; ret++) {
                            var funcReturnCont = returnContains[ret];

                            if (funcReturnCont === "Str" && results.strings < 3) {
                                strings = true;
                            }
                            if (funcReturnCont === "Int") {
                                ints = true;
                            }
                            if (funcReturnCont === "Float") {
                                floats = true;
                            }
                            if (funcReturnCont === "Bool") {
                                bools = true;
                            }
                            if (funcReturnCont === "List" && (results.lists < 3)) {
                                lists = true;
                            }
                        }
                    }
                }
                //basic datatypes: str, bool, int, float
                else if (singleArg._astname === 'Str') {
                    strings = true;
                }
                else if (singleArg._astname === 'Name' && singleArg.id.v != null && (singleArg.id.v === 'True' || singleArg.id.v === 'False')) {
                    bools = true;
                }
                else if (singleArg._astname === 'Num') {
                    if (!complexityCalculatorHelperFunctions.isNodeFloat(singleArg)) {
                        ints = true;
                    }
                    else {
                        floats = true;
                    }
                }

                //if it's a list, we also look at and note all the types in the list as being used for a purpose.
                else if (singleArg._astname === 'List') {

                    lists = true;

                    var listInputIndexing = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };
                    var listValues = [];


                    if (originality) {
                        var operations = [];
                        listValues = complexityCalculatorHelperFunctions.listTypesWithin(singleArg.elts, listValues, listInputIndexing, operations);
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                        if (listInputIndexing.indexed) {
                            results.lists = 4;
                        }
                        if (listInputIndexing.strIndexed) {
                            results.strings = 4;
                        }
                    }
                    else {
                        listValues = complexityCalculatorHelperFunctions.listTypesWithin(singleArg.elts, listValues, { input: false, indexed: false, strIndexed: false }, []);
                    }


                    if (listValues.includes("Str")) {
                        strings = true;
                    }
                    if (listValues.includes("Bool")) {
                        bools = true;
                    }
                    if (listValues.includes("Int")) {
                        ints = true;
                    }
                    if (listValues.includes("Float")) {
                        floats = true;
                    }


                    if (listInputIndexing.input && originality) {
                        results.consoleInput = 3;
                    }

                    var varsIn = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(singleArg, varsIn);

                    var anyOriginality = originality;
                    if (!anyOriginality) {
                        for (var varIn = 0; varIn < varsIn.length; varIn++) {
                            if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
                                anyOriginality = true;
                                break;
                            }
                        }
                    }

                    if (varsIn.length > 0 && anyOriginality) {
                        purposeVars = true;
                    }
                }

                //if it's a variable, we mark its value/contained values
                else if (singleArg._astname === 'Name' && singleArg.id.v !== "True" && singleArg.id.v !== "False") {

                    var lineNumberToUse = node.lineno;
                    if (complexityCalculatorHelperFunctions.doesCallCreateList(node) || complexityCalculatorHelperFunctions.doesCallCreateString(node)) {
                        lineNumberToUse = node.lineno - 1;
                    }
                    var otherVar = getVariableObject(singleArg.id.v);

                    if (otherVar != null) {
                        purposeVars = true;
                        originalAssignment = otherVar.original;
                        if ((originalAssignment || originality) && otherVar.indexAndInput.indexed) {
                            results.lists = 4;
                        }
                        if ((originalAssignment || originality) && otherVar.indexAndInput.strIndexed) {
                            results.strings = 4;
                        }
                        if ((originalAssignment || originality) && otherVar.opsDone != null) {
                            var opsUsedInVar = complexityCalculatorHelperFunctions.opsBeforeLine(otherVar.opsDone, lineNumberToUse, "var", otherVar);
                            complexityCalculatorHelperFunctions.appendArray(opsUsedInVar, opsUsed);
                        }

                        if (otherVar.containedValue != null) {
                            if (otherVar.containedValue.includes("Str")) {
                                strings = true;
                            }
                            if (otherVar.containedValue.includes("Bool")) {
                                bools = true;
                            }
                            if (otherVar.containedValue.includes("Int")) {
                                ints = true;
                            }
                            if (otherVar.containedValue.includes("Float")) {
                                floats = true;
                            }
                            if (otherVar.containedValue.includes("List")) {
                                lists = true;
                            }
                        }

                        switch (otherVar.value) {
                            case "Str":
                                strings = true;
                                break;
                            case "Bool":
                                bools = true;
                                break;
                            case "Int":
                                ints = true;
                                break;
                            case "Float":
                                floats = true;
                                break;
                            case "List":
                                lists = true;
                                break;
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

                    var otherVar = getVariableObject(singleArg.id.v);
                    if (otherVar != null) {
                        var numberOfMods = 0;


                        //check if the variable's value has been changed at least once after it was declared

                        //ops done
                        if (otherVar.opsDone != null && (otherVar.original || originality)) {
                            var otherVarOps = complexityCalculatorHelperFunctions.opsBeforeLine(otherVar.opsDone, node.lineno, "var", otherVar);
                            complexityCalculatorHelperFunctions.appendArray(otherVarOps, opsUsed);
                        }

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
                            }
                            if (varType === "List" && results.lists < 3) {
                                results.lists = 3;
                            }
                            if (varType === "Bool" && (results.bools === "Does Not Use" || results.bools === 1 || results.bools === 2)) {
                                results.bools = 3;
                            }
                            if (varType === "Str" && results.strings < 3) {
                                results.strings = 3;
                            }
                            if (varType === "Int") {
                                results.ints = 3;
                            }
                            if (varType === "Float") {
                                results.floats = 3;
                            }
                        }
                    }


                    //update results
                    if (originality || assignOriginality || functionOriginality) {
                        if (floats) {
                            results.floats = 3;
                        }
                        if (ints) {
                            results.ints = 3;
                        }
                        if (strings && results.strings < 3) {
                            results.strings = 3;
                        }
                        if (bools) {
                            results.booleans = 3;
                        }
                        if (lists && (results.lists < 3)) {
                            results.lists = 3;
                        }
                        if (purposeVars && (results.variables < 3)) {
                            results.variables = 3;
                        }
                    }
                }

                else if ((singleArg._astname === "BinOp" || singleArg._astname === "BoolOp" || singleArg._astname === "Compare" || singleArg._astname === "List")) {
                    if (complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(singleArg)[1])) {
                        results.lists = 4;
                    }
                    if (complexityCalculatorHelperFunctions.getStringIndexingInNode(singleArg)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(singleArg)[1])) {
                        results.strings = 4;
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
                        if (getVariableObject(containedInOp[u]) != null && getVariableObject(containedInOp[u]).original) {
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
                    }

                    else {
                        var inputIndexPurpose = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };
                        var operations = [];

                        complexityCalculatorHelperFunctions.listTypesWithin(singleArg, withinBinOp, inputIndexPurpose, operations);
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                        if (inputIndexPurpose.input) {
                            results.consoleInput = 3;
                        }
                        if (inputIndexPurpose.indexed) {
                            results.lists = 4;
                        }
                        if (inputIndexPurpose.strIndexed) {
                            results.strings = 4;
                        }
                    }

                    if (originality && !opsUsed.includes("BinOp")) {
                        opsUsed.push("BinOp");
                    }
                    for (var p = 0; p < withinBinOp.length; p++) {
                        if (Array.isArray(withinBinOp[p])) { //if the binop includes a list, go through THAT.
                            lists = true;
                            if (withinBinOp[p].includes("Str")) {
                                strings = true;
                            }
                            if (withinBinOp[p].includes("Bool")) {
                                bools = true;
                            }
                            if (withinBinOp[p].includes("Int")) {
                                ints = true;
                            }
                            if (withinBinOp[p].includes("Float")) {
                                floats = true;
                            }
                        }
                        else {
                            switch (withinBinOp[p]) { //otherwise we just see what the item is.
                                case "Str":
                                    strings = true;
                                    break;
                                case "Bool":
                                    bools = true;
                                    break;
                                case "Int":
                                    ints = true;
                                    break;
                                case "Float":
                                    floats = true;
                                    break;
                            }
                        }
                    }
                }

                //if it's a bool op, we need all the values in that
                else if (singleArg._astname === "BoolOp") {
                    var boolOpValues = [];
                    if (originality && !opsUsed.includes("BoolOp")) {
                        opsUsed.push("BoolOp");
                    }

                    if (!originality) {
                        complexityCalculatorHelperFunctions.listTypesWithin(singleArg, boolOpValues, {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        }, []);
                    }

                    else {
                        var inputForPurposeInArg = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };

                        var operations = [];
                        complexityCalculatorHelperFunctions.listTypesWithin(singleArg, boolOpValues, inputForPurposeInArg, operations);
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);
                        if (inputForPurposeInArg.input) {
                            results.consoleInput = 3;
                        }
                        if (inputForPurposeInArg.indexed) {
                            results.lists = 4;
                        }
                        if (inputForPurposeInArg.strIndexed) {
                            results.strings = 4;
                        }
                    }
                    for (var b = 0; b < boolOpValues.length; b++) {
                        if (boolOpValues[b] === "Str") {
                            strings = true;
                        }
                        if (boolOpValues[b] === "Int") {
                            ints = true;
                        }
                        if (boolOpValues[b] === "Float") {
                            floats = true;
                        }
                        if (boolOpValues[b] === "Bool") {
                            bools = true;
                        }
                        if (boolOpValues[b] === "List") {
                            lists = true;
                        }
                    }
                }

                //same for comparison statemenrs
                else if (singleArg._astname === "Compare") {
                    var compareValues = [];
                    var indexInputItem = {
                        input: false,
                        indexed: false,
                        strIndexed: false
                    };


                    if (!opsUsed.includes("Compare")) {
                        opsUsed.push("Compare");
                    }

                    if (!originality) {
                        complexityCalculatorHelperFunctions.listTypesWithin(singleArg, compareValues, { input: false, indexed: false, strIndexed: false }, []);
                    }

                    else {

                        var compareInd = false;
                        var compareStrInd = false;
                        var operations = [];

                        complexityCalculatorHelperFunctions.listTypesWithin(singleArg, compareValues, indexInputItem, operations);
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                        if (indexInputItem.indexed) {
                            results.lists = 4;
                        }
                        if (indexInputItem.strIndexed) {
                            results.strings = 4;
                        }
                    }

                    if (indexInputItem.input) {
                        results.consoleInput = 3;
                    }

                    //update datatype usage bools
                    for (var b = 0; b < compareValues.length; b++) {
                        if (compareValues[b] === "Str") {
                            strings = true;
                        }
                        if (compareValues[b] === "Int") {
                            ints = true;
                        }
                        if (compareValues[b] === "Float") {
                            floats = true;
                        }
                        if (compareValues[b] === "Bool") {
                            bools = true;
                        }
                        if (compareValues[b] === "List") {
                            lists = true;
                        }
                    }
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
                        var otherVariable = getVariableObject(allNamesWithin[n]);
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
                                if (containedVal === "List" && results.lists < 3) {
                                    results.lists = 3;
                                }
                                if (containedVal === "Bool" && (results.bools < 3)) {
                                    results.bools = 3;
                                }
                                if (containedVal === "Str" && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (containedVal === "Int") {
                                    results.ints = 3;
                                }
                                if (containedVal === "Float") {
                                    results.floats = 3;
                                }
                                if (otherVariable.indexAndInput.input) {
                                    results.consoleInput = 3;
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
                    if (floats) {
                        results.floats = 3;
                    }
                    if (ints) {
                        results.ints = 3;
                    }
                    if (strings && results.strings < 3) {
                        results.strings = 3;
                    }
                    if (bools) {
                        results.booleans = 3;
                    }
                    if (lists && (results.lists < 3)) {
                        results.lists = 3;
                    }
                    if (purposeVars && (results.variables < 3)) {
                        results.variables = 3;
                    }
                }
            }
        }


        //if the function or its call is original, update in results
        if ((originality || (getFunctionObject(funcName) != null && getFunctionObject(funcName).original != null && getFunctionObject(funcName).original))) {
            if (Number.isInteger(results.userFunc) && results.userFunc < 3 && foundFunc) { results.userFunc = 3; }
            var funcFound = getFunctionObject(funcName);
            if (funcFound == null) {
                //is it in ForLoopFuncs instead???
                var fLF = null;
                for (var f in forLoopFuncs) {
                    if (forLoopFuncs[f].callName === funcName) {
                        fLF = forLoopFuncs[f];
                        break;
                    }
                }
                if (fLF != null) {
                    //handle variable originality too
                    var forLoopOrig = false;
                    if (!originality && originalityLines.includes(fLF.startLine)) {
                        //this is done only if the call isn't original, for efficiency's sake
                        forLoopOrig = true;
                    }

                    if (originality || forLoopOrig) {
                        results.variables = 4;
                    }

                    for (var otherName in fLF.functionNames) {
                        var otherFunc = getFunctionObject(fLF.functionNames[otherName]);
                        var paramFuncIndex = -1;


                        if (otherFunc != null) {
                            if (Number.isInteger(results.userFunc) && results.userFunc < 3) {
                                results.userFunc = 3;
                            }
                            for (var f = 0; f < userFunctionParameters.length; f++) {
                                if (userFunctionParameters[f].name === fLF.functionNames[otherName]) {
                                    paramFuncIndex = f;
                                    break;
                                }
                            }
                            if (otherFunc != null && otherFunc.returns !== "" && otherFunc.returns != null) {
                                returns = true;
                            }
                            if (otherFunc.indexAndInput != null) {
                                if (otherFunc.indexAndInput.indexed) {
                                    results.lists = 4;
                                }
                                if (otherFunc.indexAndInput.strIndexed) {
                                    results.strings = 4;
                                }
                                if (otherFunc.indexAndInput.input) {
                                    results.consoleInput = 3;
                                }
                            }
                            if (userFunctionParameters[paramFuncIndex].params.length > 0) {
                                takesArgs = true;
                            }
                        }
                    }
                }
            }

            //update results
            else if (foundFunc) {
                if (funcFound != null && funcFound.returns !== "" && funcFound.returns != null) {
                    returns = true;
                }
                if (funcFound.indexAndInput != null) {
                    if (funcFound.indexAndInput.indexed) {
                        results.lists = 4;
                    }
                    if (funcFound.indexAndInput.strIndexed) {
                        results.strings = 4;
                    }
                    if (funcFound.indexAndInput.input) {
                        results.consoleInput = 3;
                    }
                }
                if (functionParametersIndex != -1 && userFunctionParameters[functionParametersIndex].params.length > 0) {
                    takesArgs = true;
                }
            }

            if (takesArgs && !returns && results.userFunc === 3) {
                results.userFunc = "Args";
            }
            else if (!takesArgs && returns && (results.userFunc === 3)) {
                results.userFunc = "Returns";
            }
            else if ((!takesArgs && returns && results.userFunc === "Args") || ((takesArgs && !returns && results.userFunc === "Returns"))) {
                results.userFunc = "ReturnAndArgs"
            }
            else if (takesArgs && returns && (results.userFunc === 3 || results.userFunc === "Args" || results.userFunc === "Returns")) {
                results.userFunc = "ReturnAndArgs";
            }
        }
    }

    /**
     * Analyze a single node of a Python AST.
     * @private
     */
    function analyzeASTNode(node, results, loopParent) {
        var isForLoop = false;
        var isWhileLoop = false;
        if (node != null && node._astname != null) {

            lineNumber = 0;
            if (node.lineno != null) {
                lineNumber = node.lineno;
                parentLineNumber = lineNumber;
            }
            else {
                lineNumber = parentLineNumber;
            }

            if (!uncalledFunctionLines.includes(lineNumber + 1)) {
                //initilize usage booleans
                var uses = {
                    variables: false,
                    strings: false,
                    booleans: false,
                    conditionals: false,
                    ints: false,
                    lists: false,
                    consoleInput: false,
                    mathematicalOperators: false,
                    comparisons: false,
                    floats: false,
                    userFunc: false,
                    forLoops: false,
                    whileLoops: false,
                    boolOps: false,
                    binOps: false,
                    listOps: false,
                    strOps: false
                }

                var usesVarsWithPurpose = false;
                var orElse = false;
                listOpUsed = "";
                strOpUsed = "";

                //FIRST, we check for usage of all of our concepts and update the uses object accordingly.

                if (node._astname === 'Assign' || node[0] === 'Assign') {
                    uses["variables"] = true;
                }
                if (node._astname === 'Str') {
                    uses["strings"] = true;
                }
                if (node._astname === 'Num') {
                    if (!complexityCalculatorHelperFunctions.isNodeFloat(node)) {
                        uses["ints"] = true;
                    }
                    else {
                        uses["floats"] = true;
                    }
                }
                if ((node._astname === "Name" && (node.id.v === "True" || node.id.v === "False"))) {
                    uses["booleans"] = true;
                }
                if (node._astname === "UnaryOp") {
                    uses["booleans"] = true;
                }
                if (node._astname === "Name" && node.id.v !== "True" && node.id.v !== "False" && getVariableObject(node.id.v) != null) {
                    uses["variables"] = true;
                    if (originalityLines.includes(lineNumber) && results.variables < 2) {
                        results.variables = 2;
                    }
                }
                if (node._astname === "BoolOp" || node._astname === "UnaryOp") {
                    uses["boolOps"] = true;
                }
                if (node._astname === "Compare") {
                    uses['comparisons'] = true;
                }
                if (node._astname === "BoolOp" && results.boolOps < 1) {
                    uses["boolOps"] = true;
                }
                if (node._astname === "UnaryOp") {
                    recursiveAnalyzeAST(node.operand, results, loopParent);
                }

                //CASTING - this marks existence of relevant datatype.
                if (node._astname === "Call" && 'func' in node) {
                    var nodeFunc = node.func;
                    nodeFunc = complexityCalculatorHelperFunctions.retrieveFromList(nodeFunc);
                    if (nodeFunc._astname === 'Name') {

                        if (nodeFunc.id.v === "int") {
                            uses["int"] = true;
                        }
                        if (nodeFunc.id.v === "float") {
                            uses["floats"] = true;
                        }
                        if (nodeFunc.id.v === "bool") {
                            uses["booleans"] = true;
                        }
                        if (nodeFunc.id.v === "str") {
                            uses["strings"] = true;
                        }
                    }
                }
                //look for user-defined functions
                if (node._astname === 'FunctionDef') {
                    uses["userFunc"] = true;
                }
                compareLeft = null;
                compareRight = null;

                //look for conditionals
                if (node._astname === 'If') {
                    complexityCalculatorHelperFunctions.notateConditional(node);




                    uses["conditionals"] = true;
                    if (node.test._astname === "Compare") {
                        usesCompare = true;
                        compareLeft = node.test.left;
                        compareRight = node.test.right;
                    }
                    if (node.test._astname === "Name") { usesBooleans = true; }
                    if (node.test._astname === "BoolOp" || node.test._astname === "UnaryOp") {
                        usesBooleans = true;
                        var names = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(node.test, names);
                        if (names.length > 0) { usesVarsWithPurpose = true; }
                        var anyOriginalNested = false;
                        for (var i = 0; i < names.length; i++) {
                            var nameItem = getVariableObject(names[i]);
                            if (nameItem != null && nameItem.original) {
                                anyOriginalNested = true;
                                break;
                            }
                        }
                        if (originality || anyOriginalNested) {
                            if (nameItem.indexAndInput.input) { results.consoleInput = 3; }
                            if (nameItem.indexAndInput.strIndexed) { results.strings = 4; }
                            if (nameItem.indexAndInput.indexed) { results.lists = 4; }
                            var opsList = complexityCalculatorHelperFunctions.opsBeforeLine(nameItem.opsDone, node.lineno, "var", nameItem);
                            for (var p = 0; p < opsList; p++) {
                                if (opsList[p] === "ListOp") { results.listOps = 3; }
                                if (opsList[p] === "StrOp") { results.strOps = 3; }
                                if (opsList[p] === "BinOp") { results.mathematicalOperators = 3; }
                                if (opsList[p] === "BoolOp") { results.mathematicalOperators = 3; }
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
                //look for mathematical operations. Also tallies list and string concatenation since those all appear in the AST as BinOps.
                if (node._astname === "AugAssign") {
                    uses["mathematicalOperators"] = true;
                    // we have to make a fake binop here
                    var fakeBinOp = { _astname: "BinOp", lineno: node.lineno, left: node.target, right: node.value };
                    if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(fakeBinOp)) && results.listOps < 1) {
                        uses["listOps"] = true;
                    }
                    else if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(fakeBinOp) === "Str") {
                        uses["strOps"] = true;
                    }
                }
                if (node._astname === "BinOp") {
                    uses["mathematicalOperators"] = true;
                    if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(node)) && results.listOps < 1) {
                        uses["listOps"] = true;
                    }
                    else if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(node) === "Str") {
                        uses["strOps"] = true;
                    }
                }
                //look for comparators
                if (node._astname === 'Compare') { uses["comparisons"] = true; }
                //look for lists. should also cover lists passed as args.
                if (node._astname === 'List') {
                    uses["lists"] = true;
                    containerIndex = 0;
                }
                //list and string ops
                if (node._astname === "Call") {
                    var funcName = "";
                    var nodeFunc = node.func;
                    nodeFunc = complexityCalculatorHelperFunctions.retrieveFromList(nodeFunc);
                    if ('attr' in nodeFunc) {
                        funcName = nodeFunc.attr.v;
                        //ok now we find out if it was performed on a variable
                        var attrVar = null;
                        if (nodeFunc.value._astname === "Name") { attrVar = getVariableObject(nodeFunc.value.id.v); }

                        var isListFunc = false;
                        var isStrFunc = false;
                        if (JS_STR_LIST_OVERLAP.includes(funcName) && isJavascript) {
                            var opValType = complexityCalculatorHelperFunctions.getTypeFromNode(nodeFunc.value);
                            if (opValType === "List") { isListFunc = true; }
                            else if (opValType === "Str") { isStrFunc = true; }
                            else if (opValType === "") {
                                isListFunc = true;
                                isStrFunc = true;
                            }
                        }

                        if (listFuncs.includes(funcName) && !isStrFunc) {
                            if (results.listOps[funcName] === 0) { results.listOps = 1; }
                            if (originalityLines.includes(node.lineno) && results.listOps < 2) { results.listOps = 2; }
                            listOpUsed = "" + funcName;
                            if (attrVar != null) { attrVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", attrVar.opsDone, node.lineno); }
                            //are we in a function?
                            for (var p in userFunctionReturns) {
                                if (userFunctionReturns[p].startLine != null && userFunctionReturns.startLine < node.lineno && userFunctionReturns.endLine >= node.lineno) {
                                    userFunctionReturns[p].opsDone = complexityCalculatorHelperFunctions.addOpToList("ListOp", userFunctionReturns[p].opsDone, node.lineno);
                                    break;
                                }
                            }
                        }
                        if (strFuncs.includes(funcName) && !isListFunc) {
                            if (results.strOps === 0) { results.strOps = 1; }
                            if (originalityLines.includes(node.lineno) && results.strOps < 2) { results.strOps = 2; }
                            strOpUsed = "" + funcName;
                            if (attrVar != null) { attrVar.opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", attrVar.opsDone, node.lineno); }
                            //are we in a function?
                            for (var p in userFunctionReturns) {
                                if (userFunctionReturns[p].startLine != null && userFunctionReturns.startLine < node.lineno && userFunctionReturns.endLine >= node.lineno) {
                                    userFunctionReturns[p].opsDone = complexityCalculatorHelperFunctions.addOpToList("StrOp", userFunctionReturns[p].opsDone, node.lineno);
                                    break;
                                }
                            }
                        }
                    }
                }
                //look for console input
                if ((node.value != null && node.value._astname === 'Call') && ('id' in node.value.func && 'v' in node.value.func.id && node.value.func.id.v === 'readInput')) { uses["consoleInput"] = true; }
                var newDataType = "";
                //mark usage of the things we are looknig for
                Object.keys(uses).forEach(function (key) {
                    if (uses[key] && results[key] === 0) { results[key] = 1; }
                });
                if (uses["booleans"]) {
                    newDataType = "Bool";
                }
                if (uses["floats"]) {
                    newDataType = "Float";
                }
                if (uses["ints"]) {
                    newDataType = "Int";
                }
                if (uses["strings"]) {
                    newDataType = "Str";
                }



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
                        if (originalityLines.includes(chunkLine)) {
                            originality = true;
                            break;
                        }
                    }
                    //tree originaity, if we ever want to switch to this measure
                    // originality = complexityCalculatorHelperFunctions.TreeOriginality(node, 1, STRUCTURE_SAMPLES);
                }
                else {
                    //then this is one line and we only need to check a single line
                    lineNumber = 0;
                    if (node.lineno != null) {
                        lineNumber = node.lineno;
                        parentLineNumber = lineNumber;
                    }
                    else {
                        lineNumber = parentLineNumber;
                    }

                    originality = (originalityLines.includes(lineNumber));
                }



                //originality value updates for functions, variables, etc.
                if (originality) {
                    if (node.id != null && node.id.v != null) {
                        var foundVar = getVariableObject(node.id.v);
                        if (foundVar != null) {
                            var varName = foundVar.name;
                            for (var f = 0; f < allVariables.length; f++) {
                                if (allVariables[f].name === varName) {
                                    allVariables[f].original = true; //the variable is assigned in  unique line
                                    break;
                                }
                            }
                        }
                    }


                    //whatever is in here, mark that it's used uniquely.
                    var markAsOriginal = ["variables", "strings", "booleans", "ints", "consoleInput", "mathematicalOperators", "floats", "lists", "listOps", "strOps", "boolOps"];

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
                            takesArgs = true;
                        }
                        for (var i = 0; i < node.body.length; i++) {
                            if (node.body[i]._astname === 'Return') {
                                returns = true;
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
                            results.lists = 4;
                        }
                        if (node.iter._astname === "Name") {
                            var iterName = getVariableObject(node.iter.id.v);

                            if (iterName != null) {
                                if (iterName.value === "List") {
                                    results.lists = 4;
                                }
                                if (iterName.value === "Str") {
                                    results.strings = 4;
                                }

                                var listedOps = complexityCalculatorHelperFunctions.opsBeforeLine(iterName.opsDone, node.lineno, "var", iterName);

                                for (var op = 0; op < listedOps.length; op++) {
                                    if (listedOps[op] === "BinOp" || listedOps[op] === "AugAssign") {
                                        results.mathematicalOperators = 3;
                                    }
                                    if (listedOps[op] === "BoolOp") {
                                        results.boolOps = 3;
                                    }
                                    if (listedOps[op] === "StrOp") {
                                        results.strOps = 3;
                                    }
                                    if (listedOps[op] === "ListOp") {
                                        results.listOps = 3;
                                    }
                                    if (listedOps[op] === "Compare") {
                                        results.comparisons = 3;
                                    }
                                }
                            }
                        }
                        if (node.iter._astname === "Str") {
                            results.strings = 4;
                        }

                        if ('func' in node.iter) {
                            if (complexityCalculatorHelperFunctions.doesCallCreateList(node.iter)) {
                                results.lists = 4;
                            }
                            if (complexityCalculatorHelperFunctions.doesCallCreateString(node.iter)) {
                                results.strings = 4;
                            }
                            if ('id' in node.iter.func && getFunctionObject(node.iter.func.id.v) != null) {
                                var iterator = getFunctionObject(node.iter.func.id.v);


                                if (iterator.returns === "List") {
                                    results.lists = 4;
                                }
                                else if (iterator.returns === "Str") {
                                    results.strings = 4;
                                }
                                var listedOps = complexityCalculatorHelperFunctions.opsBeforeLine(iterator.opsDone, node.lineno, "func", iterator);


                                for (var op = 0; op < listedOps.length; op++) {
                                    if (listedOps[op] === "BinOp" || listedOps[op] === "AugAssign") {
                                        results.mathematicalOperators = 3;
                                    }
                                    if (listedOps[op] === "BoolOp") {
                                        results.boolOps = 3;
                                    }
                                    if (listedOps[op] === "StrOp") {
                                        results.strOps = 3;
                                    }
                                    if (listedOps[op] === "ListOp") {
                                        results.listOps = 3;
                                    }
                                    if (listedOps[op] === "Compare") {
                                        results.comparisons = 3;
                                    }
                                }
                            }
                        }

                        //if we're using range(), check for minimum and step values
                        if ('func' in node.iter && 'id' in node.iter.func && node.iter.func.id.v === 'range') {
                            if (node.iter.args.length === 2 && results.forLoops < 3) {
                                results.forLoops = 3;
                            }
                            else if (node.iter.args.length === 3 && results.forLoops < 4) {
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
                var opsUsed = [];
                var changesVarsForPurpose = false;
                var originalAssignment = false;


                if (node._astname === 'Call') {
                    //at this point, calls are shipped out to a helper function
                    analyzeFunctionCall(node, results, loopParent, opsUsed, purposeVars);
                }

                //next, we look in conditional statements
                if (node._astname === "If") {

                    //variable init
                    var floats = false;
                    var ints = false;
                    var strings = false;
                    var bools = false;
                    var lists = false;
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
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) { results.booleans = 3; }
                        testNode = testNode.operand;
                    }


                    //first, go through and grab all the bits of the test statement, whatever that may be
                    if (testNode._astname === "Subscript") {

                        var isIndexedItem = complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0];
                        var isStrIndexedItem = complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0];

                        if (isIndexedItem) { results.lists = 4; }
                        if (isStrIndexedItem) { results.strings = 4; }

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
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results.booleans = 3;
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
                            results.lists = 4;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[1])) {
                            results.strings = 4;
                        }

                        if (!originality) {
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            }, []);
                        }

                        else {
                            results.comparisons = 3;
                            var inputIndexItem = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };

                            var operations = [];
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexItem, operations);
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);


                            if (inputIndexItem.indexed) {
                                results.lists = 4;
                            }
                            if (inputIndexItem.strIndexed) {
                                results.strings = 4;
                            }
                            if (inputIndexItem.input) {
                                inputUsed = true;
                            }
                        }
                    }

                    //we have to check everything inside the binop's left and right items
                    else if (testNode != null && testNode._astname === "BinOp") {
                        var inputIndexItem = {
                            indexed: false,
                            input: false,
                            strIndexed: false
                        };

                        if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                            results.lists = 4;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[1])) {
                            results.strings = 4;
                        }

                        if (!originality) {
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                                indexed: false,
                                input: false,
                                strIndexed: false
                            }, []);
                        }

                        else {
                            var operations = [];
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexItem, operations);
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);
                        }

                        if (inputIndexItem.indexed) {
                            results.lists = 4;
                        }
                        if (inputIndexItem.strIndexed) {
                            results.strings = 4;
                        }
                        if (inputIndexItem.input) {
                            inputUsed = true;
                        }
                    }

                    //same for boolops
                    else if (testNode != null && testNode._astname === "BoolOp") {
                        var inputIndexPurp = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };

                        if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                            results.lists = 4;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[1])) {
                            results.strings = 4;
                        }

                        if (!originality) {
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            }, []);
                        }


                        else {
                            var operations = [];
                            complexityCalculatorHelperFunctions.listTypesWithin(testNode, containedTypes, inputIndexPurp, operations);
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);
                        }

                        if (inputIndexPurp.indexed) {
                            results.lists = 4;
                        }
                        if (inputIndexPurp.strIndexed) {
                            results.strings = 4;
                        }
                        if (inputIndexPurp.input) {
                            inputUsed = true;
                        }
                    }
                    //for lists, we have to check every item
                    else if (testNode != null && testNode._astname === "List") {
                        var inputIndexPurp = {
                            input: false,
                            indexed: false,
                            strIndexed: false
                        };

                        if (complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(testNode)[1])) {
                            results.lists = 4;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(testNode)[1])) {
                            results.strings = 4;
                        }
                        if (!originality) {
                            containedTypes = complexityCalculatorHelperFunctions.listTypesWithin(testNode.elts, containedTypes, {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            }, []);
                        }

                        else {
                            var operations = [];
                            containedTypes = complexityCalculatorHelperFunctions.listTypesWithin(testNode.elts, containedTypes, inputIndexPurp, operations);
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);
                        }

                        if (inputIndexPurp.indexed) {
                            results.lists = 4;
                        }
                        if (inputIndexPurp.strIndexed) {
                            results.strings = 4;
                        }
                        if (inputIndexPurp.input) {
                            inputUsed = true;
                        }
                    }

                    else if (testNode != null && testNode._astname === "Name") {
                        //grab variable val if it represents a single datatype
                        //also, get information about ops and contained values from the variable
                        if (testNode.id.v !== "True" && testNode.id.v !== "False") {
                            var value = "";
                            var containedValInTest = null;
                            var testVar = getVariableObject(testNode.id.v);

                            if (testVar != null) {

                                value = testVar.value;
                                if (testVar.indexAndInput.input) {
                                    inputUsed = true;
                                }

                                containedValInTest = testVar.containedValue;

                                if (testVar.indexAndInput.indexed && (originality || testVar.original)) {
                                    results.lists = 4
                                }
                                if (testVar.indexAndInput.strIndexed && (originality || testVar.original)) {
                                    results.strings = 4;
                                }
                                if (testVar.opsDone != null && (originality || testVar.original)) {
                                    var opsInVar = complexityCalculatorHelperFunctions.opsBeforeLine(testVar.opsDone, node.lineno, "var", testVar);
                                    complexityCalculatorHelperFunctions.appendArray(opsInVar, opsUsed);
                                }
                            }


                            //update usage booleans
                            if (value === "Bool") {
                                bools = true;
                            }
                            if (value === "Int") {
                                ints = true;
                            }
                            if (value === "Float") {
                                floats = true;
                            }
                            if (value === "Str") {
                                strings = true;
                            }


                            if (value === "List" || containedValInTest != null) {
                                if (value === "List") {
                                    lists = true;
                                }
                                for (var k = 0; k < containedValInTest.length; k++) {
                                    if (containedValInTest[k] === "Str") {
                                        strings = true;
                                    }
                                    if (containedValInTest[k] === "Int") {
                                        ints = true;
                                    }
                                    if (containedValInTest[k] === "Float") {
                                        floats = true;
                                    }
                                    if (containedValInTest[k] === "Bool") {
                                        bools = true;
                                    }
                                }
                            }
                        }
                        else {
                            //otherwise it's just "if true" or "if false"
                            bools = true;
                        }

                    }
                    else if (testNode != null && testNode._astname === "Call") {
                        analyzeASTNode(testNode, results, parent);
                        recursiveAnalyzeAST(testNode, results, parent);
                        var funcName = "";
                        var argList = [];

                        //get function name and args
                        if ('id' in testNode.func) {
                            funcName = testNode.func.id.v;
                            argList = testNode.args;
                        }
                        else {
                            funcName = testNode.func.attr.v;
                        }


                        if (funcName === 'readInput') {
                            inputUsed = true;
                        }
                        if (listFuncs.indexOf(funcName) > -1 && originality) {
                            lists = true;
                            if (!opsUsed.includes("ListOp")) {
                                opsUsed.push("ListOp");
                            }
                        }
                        if (strFuncs.indexOf(funcName) > -1 && originality) {
                            strings = true;
                            if (!opsUsed.includes("StrOp")) {
                                opsUsed.push("StrOp");
                            }
                        }

                        //get the return value from the function
                        var callReturnVal = "";
                        var returnFrom = getFunctionObject(funcName);


                        if (returnFrom != null) {
                            callReturnVal = returnFrom.returns;

                            if (returnFrom.containedValue != null) {
                                for (var c = 0; c < returnFrom.containedValue.length; c++) {
                                    var returnElement = returnFrom.containedValue[c];
                                    if (returnElement === "Str") {
                                        strings = true;
                                    }
                                    if (returnElement === "Int") {
                                        ints = true;
                                    }
                                    if (returnElement === "Float") {
                                        floats = true;
                                    }
                                    if (returnElement === "Bool") {
                                        bools = true;
                                    }
                                }
                            }

                            //update results accordingly
                            if (returnFrom.indexAndInput.indexed && (originality || returnFrom.original)) {
                                results.lists = 4;
                            }
                            if (returnFrom.indexAndInput.strIndexed && (originality || returnFrom.original)) {
                                results.strings = 4;
                            }
                            if (returnFrom.indexAndInput.input) {
                                inputUsed = true;
                            }
                            if (returnFrom.nested) {
                                purposeVars = true;
                            }
                            if (returnFrom.opsDone != null && originality) {
                                var returnOps = complexityCalculatorHelperFunctions.opsBeforeLine(returnFrom.opsDone, node.lineno, "func", returnFrom);
                                complexityCalculatorHelperFunctions.appendArray(returnOps, opsUsed);
                            }
                        }
                        if (callReturnVal === "Str") {
                            strings = true;
                        }
                        else if (callReturnVal === "Int") {
                            ints = true;
                        }
                        else if (callReturnVal === "Float") {
                            floats = true;
                        }
                        else if (callReturnVal === "Bool") {
                            bools = true;
                        }
                        else if (callReturnVal === "List") {
                            lists = true;
                        }
                    }

                    //then if contained Types is there and has values in it, we look through it and flag the relevant things
                    if (containedTypes.length > 0) {
                        for (var g = 0; g < containedTypes.length; g++) {
                            if (containedTypes[g] === "List") {
                                lists = true;
                            }
                            if (containedTypes[g] === "Bool") {
                                bools = true;
                            }
                            if (containedTypes[g] === "Str") {
                                strings = true;
                            }
                            if (containedTypes[g] === "Int") {
                                ints = true;
                            }
                            if (containedTypes[g] === "Float") {
                                floats = true;
                            }
                        }
                    }
                    recursiveAnalyzeAST(testNode, results, loopParent);
                    //we already look for booleans or w/e so we don't need to do that here
                    if ((originality || originalAssignment) && (inputUsed && results.consoleInput < 3)) { results.consoleInput = 3; }
                    //here's where we update the results if anything needs to be elevated a level.
                    if (originality || originalAssignment) {
                        if (floats) { results.floats = 3; }
                        if (ints) { results.ints = 3; }
                        if (strings && results.strings < 3) { results.strings = 3; }
                        if (bools) { results.booleans = 3; }
                        if (lists && (results.lists < 3)) { results.lists = 3; }
                        if (purposeVars && (results.variables < 3)) { results.variables = 3; }
                    }

                    var modOriginality = false;
                    if (testNode != null && testNode._astname === "Name" && testNode.id.v !== "True" && testNode.id.v !== "False") {
                        var originalAssign = false;
                        var varInput = false;
                        var testVariable = getVariableObject(node.test.id.v);
                        if (testVariable != null) {
                            var argModded = false;
                            var insideOutside = "outside"; //this will get set to "inside" if this call is within another function
                            var insideLines = [-1, -1];
                            if (testVariable.indexAndInput.input) { varInput = true; }
                            if (testVariable.original) { originalAssign = true; }
                            if (testVariable.opsDone != null && (originality || testVariable.original)) {
                                var testVariableOps = complexityCalculatorHelperFunctions.opsBeforeLine(testVariable.opsDone, node.lineno, "var", testVariable);
                                complexityCalculatorHelperFunctions.appendArray(testVariableOps, opsUsed);
                            }
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
                                if (varType === "List" && results.lists < 3) {
                                    results.lists = 3;
                                }
                                if (varType === "Bool" && results.booleans < 3) {
                                    results.booleans = 3;
                                }
                                if (varType === "Str" && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (varType === "Int" && results.ints < 3) {
                                    results.ints = 3;
                                }
                                if (varType === "Float") {
                                    results.floats = 3;
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
                            var varWithin = getVariableObject(allNamesWithin[n]);
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
                                    if (containedVal === "List" && results.lists < 3) {
                                        results.lists = 3;
                                    }
                                    if (containedVal === "Bool" && results.booleans < 3) {
                                        results.booleans = 3;
                                    }
                                    if (containedVal === "Str" && results.strings < 3) {
                                        results.strings = 3;
                                    }
                                    if (containedVal === "Int" && results.ints < 3) {
                                        results.ints = 3;
                                    }
                                    if (containedVal === "Float") {
                                        results.floats = 3;
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
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results.booleans = 3;
                        }
                        nodeIter = nodeIter.operand;
                    }
                    nodeIter = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter);
                    if (nodeIter._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeIter, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) { results.booleans = 3; }
                        nodeIter = nodeIter.operand;
                    }

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
                                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);
                                    }
                                    else { //feed it empty lists/objects
                                        complexityCalculatorHelperFunctions.listTypesWithin(note.iter.args[fa], [], { input: false, indexed: false, strIndexed: false }, []);
                                    }

                                    //update results
                                    if (inputIndexItem.input && results.consoleInput < 3) {
                                        results.consoleInput = 3;
                                    }
                                    if (inputIndexItem.indexed) {
                                        results.lists = 4;
                                    }
                                    if (inputIndexItem.strIndexed) {
                                        results.strings = 4;
                                    }
                                }
                            }
                        }

                        //other things are also iterable!
                        else if (nodeIter._astname === "List") {
                            if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0]) {
                                results.lists = 4;
                            }
                            if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter)[0]) {
                                results.strings = 4;
                            }
                            datatypesUsed.push("List");


                            var inputIndexItem = {
                                input: false,
                                indexed: false,
                                strIndexed: false
                            };
                            var operations = [];
                            var listTypes = complexityCalculatorHelperFunctions.listTypesWithin(nodeIter.elts, [], inputIndexItem, operations);
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);


                            for (var a = 0; a < listTypes.length; a++) {
                                datatypesUsed.push(listTypes[a]);
                            }


                            if (inputIndexItem.indexed) {
                                results.lists = 4;
                            }
                            if (inputIndexItem.strIndexed) {
                                results.strings = 4;
                            }
                            if (inputIndexItem.input) {
                                inputTaken = true;
                            }
                        }

                        else if (nodeIter._astname === "Str") {
                            results.strings = 4;
                        }
                        //itarator is a variable
                        else if (nodeIter._astname === "Name") {

                            var iteratorVar = getVariableObject(nodeIter.id.v);


                            if (iteratorVar != null) {
                                if (iteratorVar.value === "Str") {
                                    results.strings = 4;
                                }
                                if (iteratorVar.value === "Bool") {
                                    results.booleans = 3;
                                }
                                if (iteratorVar.value === "Int") {
                                    results.ints = 3;
                                }
                                if (iteratorVar.value === "Float") {
                                    results.floats = 3;
                                }
                                if (iteratorVar.value === "List") {
                                    results.lists = 4;
                                }

                                //update results
                                if ((iteratorVar.original || originality) && iteratorVar.indexAndInput.indexed) {
                                    results.lists = 4;
                                }
                                if ((iteratorVar.original || originality) && iteratorVar.indexAndInput.strIndexed) {
                                    results.strings = 4;
                                }

                                if (iteratorVar.containedValue != null) {
                                    for (var cv = 0; cv < iteratorVar.containedValue.length; cv++) {
                                        if (iteratorVar.containedValue[cv] === "Str" && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if (iteratorVar.containedValue[cv] === "Bool") {
                                            results.booleans = 3;
                                        }
                                        if (iteratorVar.containedValue[cv] === "Int") {
                                            results.ints = 3;
                                        }
                                        if (iteratorVar.containedValue[cv] === "Float") {
                                            results.floats = 3;
                                        }
                                        if (iteratorVar.containedValue[cv] === "List" && results.lists < 3) {
                                            results.lists = 3;
                                        }
                                    }
                                }

                                if (iteratorVar.indexAndInput.input) {
                                    results.consoleInput = 3;
                                }

                                //check for ops done
                                if (iteratorVar.opsDone != null) {
                                    var iteratorOps = complexityCalculatorHelperFunctions.opsBeforeLine(iteratorVar.opsDone, node.lineno, "var", iteratorVar);
                                    for (var p = 0; p < iteratorOps.length; p++) {

                                        if (!opsUsed.includes(iteratorOps[p])) {
                                            opsUsed.push(iteratorOps[p]);
                                        }


                                        if (iteratorOps[p] === "BinOp" || iteratorOps[p] === "AugAssign") {
                                            results.mathematicalOperators = 3;
                                        }
                                        if (iteratorOps[p] === "BoolOp") {
                                            results.boolOps = 3;
                                        }
                                        if (iteratorOps[p] === "StrOp") {
                                            results.strOps = 3;
                                        }
                                        if (iteratorOps[p] === "ListOp") {
                                            results.listOps = 3;
                                        }
                                        if (iteratorOps[p] === "Compare") {
                                            results.comparisons = 3;
                                        }
                                    }
                                }
                            }
                        }

                        else if (nodeIter._astname === "BinOp") {
                            if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter)[0]) {
                                results.lists = 4;
                            }
                            if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter)[0]) {
                                results.strings = 4;
                            }


                            var iterableBinOpTypes = [];
                            var inputBinOp = false;
                            var isList = Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter));


                            if (isList) {
                                results.lists = 4;
                            }
                            if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter) === "Str") {
                                results.strings = 4;
                            }
                            if (!opsUsed.includes("BinOp")) {
                                opsUsed.push("BinOp");
                            }


                            for (var p = 0; p < iterableBinOpTypes.length; p++) {
                                var typeName = iterableBinOpTypes[p];
                                if (typeName === "Str") {
                                    results.strings = 4;
                                }
                                if (typeName === "Int") {
                                    results.ints = 3;
                                }
                                if (typeName === "Float") {
                                    results.floats = 3;
                                }
                                if (typeName === "List") {
                                    results.lists = 4;
                                }
                                if (typeName === "Bool") {
                                    results.booleans = 3;
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
                            }

                            else if (nodeIter.func._astname === "Subscript") {
                                var subscriptCall = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func);
                                if (subscriptCall._astname === "Name") {
                                    funcName = subscriptCall.id.v;
                                }
                            }
                            else {
                                funcName = nodeIter.func.attr.v;
                            }


                            if (listFuncs.includes(funcName)) {
                                results.listOps = 3;
                                if (complexityCalculatorHelperFunctions.doesCallCreateList) {
                                    results.lists = 4;
                                }
                            }
                            if (strFuncs.includes(funcName)) {
                                results.strOps = 3;
                                if (complexityCalculatorHelperFunctions.doesCallCreateString) { results.strings = 4; }
                            }


                            for (var u = 0; u < userFunctionReturns.length; u++) {
                                if (userFunctionReturns[u].name === funcName) {
                                    if (userFunctionReturns[u].returns === "Str") {
                                        results.strings = 3;
                                    }
                                    if (userFunctionReturns[u].returns === "List") {
                                        results.lists = 4;
                                    }
                                    if (userFunctionReturns[u].returns === "Int") {
                                        results.ints = 3;
                                    }
                                    if (userFunctionReturns[u].returns === "Float") {
                                        results.floats = 3;
                                    }
                                    if (userFunctionReturns[u].returns === "Bool") {
                                        results.booleans = 3;
                                    }


                                    if (originality && userFunctionReturns[u].indexAndInput.indexed) {
                                        results.lists = 4;
                                    }
                                    if (originality && userFunctionReturns[u].indexAndInput.strIndexed) {
                                        results.strings = 4;
                                    }
                                }


                                if (userFunctionReturns[u].containedValue != null) {
                                    for (var cv = 0; cv < userFunctionReturns[u].containedValue.length; cv++) {
                                        if (userFunctionReturns[u].containedValue[cv] === "Str") {
                                            results.strings = 3;
                                        }
                                        if (userFunctionReturns[u].containedValue[cv] === "List") {
                                            results.lists = 4;
                                        }
                                        if (userFunctionReturns[u].containedValue[cv] === "Int") {
                                            results.ints = 3;
                                        }
                                        if (userFunctionReturns[u].containedValue[cv] === "Float") {
                                            results.floats = 3;
                                        }
                                        if (userFunctionReturns[u].containedValue[cv] === "Bool") {
                                            results.booleans = 3;
                                        }
                                    }
                                }
                                if (userFunctionReturns[u].opsDone != null) {
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(userFunctionReturns[u].opsDone, node.lineno, "func", userFunctionReturns[u]), opsUsed);
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
                        }
                        else if ('attr' in nodeIter.func) {
                            iterFuncName = nodeIter.func.attr.v;
                        }
                        else if (nodeIter.func._astname === "Subscript") {
                            var iterNameNode = complexityCalculatorHelperFunctions.retrieveFromList(nodeIter.func);
                            if (iterNameNode._astname === "Name") {
                                iterFuncName = iterNameNode.id.v;
                            }

                            var varsIn = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.func, varsIn);

                            var anyOriginal = originality;
                            if (!anyOriginal) {
                                for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                    if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
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
                        var iterArgFunc = getFunctionObject(iterFuncName);
                        if (iterArgFunc != null && iterArgFunc.nested != null && iterArgFunc.nested) {
                            purposeVars = true;
                        }

                        for (var t = 0; t < nodeIter.args.length; t++) {
                            if (nodeIter.args[t]._astname === "Name") {
                                var argVar = getVariableObject(nodeIter.args[t].id.v);
                                //get input and indexing

                                if (argVar != null) {

                                    if (argVar.indexAndInput.input) {
                                        varInput = true;
                                    }
                                    if (argVar.indexAndInput.indexed && (argVar.original || originality)) {
                                        results.lists = 4;
                                    }
                                    if (argVar.indexAndInput.strIndexed && (argVar.original || originality)) {
                                        results.strings = 4;
                                    }

                                    //update results

                                    if (argVar.opsDone != null) {
                                        var argOps = complexityCalculatorHelperFunctions.opsBeforeLine(argVar.opsDone, node.lineno, "var", argVar);


                                        for (var op = 0; op < argOps.length; op++) {
                                            if (!opsUsed.includes(argOps[op])) { opsUsed.push(argOps[op]); }
                                            if (argOps[op] === "BinOp" || argOps[op] === "AugAssign") {
                                                results.mathematicalOperators = 3;
                                            }
                                            if (argOps[op] === "BoolOp") {
                                                results.boolOps = 3;
                                            }
                                            if (argOps[op] === "StrOp") {
                                                results.strOps = 3;
                                            }
                                            if (argOps[op] === "ListOp") {
                                                results.listOps = 3;
                                            }
                                            if (argOps[op] === "Compare") {
                                                results.comparisons = 3;
                                            }
                                        }
                                    }
                                }
                            }

                            //if it's a binop, boolop, list, or call we grab the contained values. We also need to get contained BoolOps.
                            if (nodeIter.args[t]._astname === "Compare" || nodeIter.args[t]._astname === "BoolOp" || nodeIter.args[t]._astname === "List" || nodeIter.args[t]._astname === "BoolOp") {

                                if (nodeIter.args[t]._astname === "Compare" && originality) {
                                    results.comparisons = 3;
                                }
                                if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter.args[t])[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(nodeIter.args[t])[1])) {
                                    results.lists = 4;
                                }
                                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter.args[t])[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter.args[t])[1])) {
                                    results.strings = 4;
                                }

                                var allNamesWithin = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.args[t], allNamesWithin);


                                //if ANY of these is marked as original, assignment counts as original
                                var originalAssign = false
                                for (var n = 0; n < allNamesWithin.length; n++) {
                                    var nestedVar = getVariableObject(allNamesWithin[n]);
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
                                            if (containedVal === "List" && results.lists < 3) {
                                                results.lists = 3;
                                            }
                                            if (containedVal === "Bool" && results.booleans < 3) {
                                                results.bools = 3;
                                            }
                                            if (containedVal === "Str" && results.strings < 3) {
                                                results.strings = 3;
                                            }
                                            if (containedVal === "Int" && results.ints < 3) {
                                                results.ints = 3;
                                            }
                                            if (containedVal === "Float") {
                                                results.floats = 3;
                                            }
                                            if (nestedVar.opsDone != null) {
                                                complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(nestedVar.opsDone, node.lineno, "var", nestedVar), opsUsed);
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
                                        results.lists = 4;
                                    }
                                    if (nodeIter.args[t].value._astname === "Subscript" && (getNestedIndexing(nodeIter.args[t].value))) {
                                        results.lists = 4;
                                    }
                                    if (nodeIter.args[t].value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.args[t].value))) {
                                        results.lists = 4;
                                    }

                                    if (nodeIter.args[t].value._astname === "Call") {
                                        if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeIter.args[t].value)) {
                                            results.lists = 4;
                                        }
                                        else if ('id' in nodeIter.args[t].value && (getFunctionObject(nodeIter.args[t].value.id.v) != null && getFunctionObject(nodeIter.args[t].value.id.v).returns === "List")) {
                                            results.lists = 4;
                                        }
                                    }

                                    if (nodeIter.args[t].value._astname === "Name" && (getVariableObject(nodeIter.args[t].value.id.v).value === "List")) {
                                        results.lists = 4;
                                    }

                                    //is it a string?
                                    if (nodeIter.args[t].value._astname === "Str") {
                                        results.strings = 4;
                                    }
                                    if (nodeIter.args[t].value._astname === "Subscript" && getstringIndexing(nodeIter.args[t].value)) {
                                        results.strings = 4;
                                    }
                                    if (nodeIter.args[t].value._astname === "BinOp" && complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.args[t].value) === "Str") {
                                        results.strings = 4;
                                    }
                                    if (nodeIter.args[t].value._astname === "Call") {
                                        if (complexityCalculatorHelperFunctions.doesCallCreateString(nodeIter.args[t].value)) {
                                            results.strings = 4;
                                        }
                                        if (getFunctionObject(nodeIter.args[t].value.id.v) != null && getFunctionObject(nodeIter.args[t].value.id.v).returns === "Str") {
                                            results.strings = 4;
                                        }
                                    }
                                    if (nodeIter.args[t].value._astname === "Name") {
                                        var iterArgVar = getVariableObject(nodeIter.args[t].value.id.v);

                                        if (iterArgVar != null && iterArgVar.value === "Str") {
                                            results.strings = 4;
                                        }
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
                            results.lists = 4;
                        }
                        if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter)[0] && originality) {
                            results.strings = 4;
                        }


                        for (var m = 0; m < listVars.length; m++) {
                            var listVariable = getVariableObject(listVars[m]);
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
                                for (var z = 0; z < allVariables[m].assignedModified.length; z++) {
                                    if (allVariables[m].assignedModified[z].line > node.lineno) { break; } //stop loop before we get to the current line OR if both thigns we're looking for are already set to true.

                                    //is there a modification? is it original?
                                    if ((insideOutside === "inside" && node.lineno >= insideLines[0] && node.lineno <= insideLines[1]) || (insideOutside === "outside" && !insideLines.includes(node.lineno))) {
                                        argModded = true;
                                        numberOfMods += 1;
                                        if (allVariables[m].assignedModified[z].original) { modOriginality = true; }
                                    }
                                }

                                //update results
                                if (argModded && (originality || modOriginality) && ((insideOutside === "outside" && numberOfMods > 1) || (insideOutside === "inside" && numberOfMods > 0))) {
                                    results.variables = 4;
                                }
                                if (allVariables[a].nested && (results.variables < 3) && (originality || allVariables[a].original)) {
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
                                results.lists = 4;
                            }
                            if (nodeIter.value._astname === "Str") {
                                results.strings = 4;
                            }


                            if (nodeIter.value._astname === "Subscript") {
                                if (getNestedIndexing(nodeIter.value)[0]) {
                                    results.lists = 4;
                                }
                                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeIter.value)[0]) {
                                    results.strings = 4;
                                }
                            }

                            if (nodeIter.value._astname === "BinOp") {
                                if (Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.value))) {
                                    results.lists = 4;
                                }

                                if (complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeIter.value) === "Str") {
                                    var anyOriginality = false;
                                    if (originality) {
                                        anyOriginality = true;
                                    }

                                    else {
                                        var allVarsIn = [];
                                        complexityCalculatorHelperFunctions.getNestedVariables(nodeIter.value, allVarsIn);
                                        for (var o = 0; o < allVarsIn.length; o++) {
                                            if (getVariableObject(allVarsIn[o]).original) {
                                                anyOriginality = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (anyOriginality) {
                                        results.strings = 4;
                                    }
                                }
                            }
                            if (nodeIter.value._astname === "Call") {
                                //is it a listop, concat binop, OR a UDF that returns a list
                                if (originality) {
                                    if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeIter.value)) {
                                        results.lists = 4;
                                    }
                                    if ('id' in nodeIter.value && getFunctionObject(nodeIter.value.id.v) != null && getFunctionObject(nodeIter.value.id.v).returns === "List") {
                                        results.lists = 4;
                                    }

                                    //is it a string op
                                    if (complexityCalculatorHelperFunctions.doesCallCreateString(nodeIter.value)) { results.strings = 4; }
                                    if ('id' in nodeIter.value && getFunctionObject(nodeIter.value.id.v) != null && getFunctionObject(nodeIter.value.id.v).returns === "Str") {
                                        results.lists = 4;
                                    }
                                }

                                //is it a UDF and what does it return
                                if ('func' in nodeIter.value) {

                                    var isUserFunc = null;
                                    isUserFunc = getFunctionObject(nodeIter.value.func.id.v);

                                    if (isUserFunc != null) {
                                        if (isUserFunc.returns === "List" && (originality || isUserFunc.original)) {
                                            results.lists = 4;
                                        }
                                        else if (isUserFunc.returns === "Str" && (originality || isUserFunc.original)) {
                                            results.strings = 4;
                                        }
                                    }
                                }
                            }
                            if (nodeIter.value._astname === "Name") {
                                //is it indexing a variable that contains a list?
                                if (getVariableObject(nodeIter.value.id.v).value === "List" && (originality || getVariableObject(nodeIter.value.id.v).original)) {
                                    results.lists = 4;
                                }
                                if (getVariableObject(nodeIter.value.id.v).value === "Str" && (originality || getVariableObject(nodeIter.value.id.v).original)) {
                                    results.strings = 4;
                                }
                            }
                        }
                    }
                }

                if (node._astname === "While") {
                    var testItem = node.test;

                    if (testItem._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) { results.booleans = 3; }
                        testItem = testItem.operand;
                    }

                    if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {

                        //is the thing we're indexing a list?

                        if (testItem.value._astname === "List") {
                            results.lists = 4;
                        }
                        if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                            results.lists = 4;
                        }
                        if (testItem.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(testItem.value))) {
                            results.lists = 4;
                        }
                        if (testItem.value._astname === "Call") {
                            //is it a listop, concat binop, OR a UDF that returns a list
                            if (complexityCalculatorHelperFunctions.doesCallCreateList(testItem.value)) {
                                results.lists = 4;
                            }
                            else if ('id' in testItem.func) {
                                var calledFunc = getUserFunctionReturn(testItem.func.id.v);
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results.lists = 4;
                                }
                            }
                        }
                        if (testItem.value._astname === "Name" && getVariableObject(testItem.value.id.v).value === "List") {
                            results.lists = 4;
                        }
                    }
                    testItem = complexityCalculatorHelperFunctions.retrieveFromList(testItem);

                    if (testItem._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results.booleans = 3;
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
                        }
                        else {
                            funcName = testItem.func.attr.v;
                        }

                        //input or ops used?
                        if (funcName === 'readInput') {
                            inputUsed = true;
                        }
                        if (listFuncs.indexOf(funcName) > -1 && originality) {
                            lists = true;
                            if (!opsUsed.includes("ListOp")) {
                                opsUsed.push("ListOp");
                            }
                        }
                        else if (strFuncs.indexOf(funcName) > -1 && originality) {
                            strings = true;
                            if (!opsUsed.includes("StrOp")) {
                                opsUsed.push("StrOp");
                            }
                        }
                        else if (getFunctionObject(funcName).indexAndInput.indexed && (originality || getFunctionObject(funcName).original)) {
                            results.lists = 4;
                        }

                        //get the rturn value
                        var callReturnVal = "";
                        var calledFunc = getFunctionObject(funcName);

                        if (calledFunc != null) {
                            callReturnVal = calledFunc.returns;

                            if (calledFunc.containedValue != null) {
                                for (var c = 0; c < calledFunc.containedValue.length; c++) {
                                    var returnElement = calledFunc.containedValue[c];
                                    if (returnElement === "Str") {
                                        strings = true;
                                    }
                                    if (returnElement === "Int") {
                                        ints = true;
                                    }
                                    if (returnElement === "Float") {
                                        floats = true;
                                    }
                                    if (returnElement === "Bool") {
                                        bools = true;
                                    }
                                }
                            }

                            if (calledFunc.indexAndInput.input) {
                                inputUsed = true;
                            }
                            if (originality && calledFunc.indexAndInput.indexed) {
                                results.lists = 4;
                            }
                            if (originality && calledFunc.indexAndInput.strIndexed) {
                                results.strings = 4;
                            }
                            if (calledFunc.nested) {
                                purposeVars = true;
                            }
                            if (calledFunc.opsDone != null && originality) {
                                complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(calledFunc.opsDone, node.lineno, "func", calledFunc), opsUsed);
                            }
                        }

                        if (callReturnVal === "Str") {
                            strings = true;
                        }
                        if (callReturnVal === "Int") {
                            ints = true;
                        }
                        if (callReturnVal === "Float") {
                            floats = true;
                        }
                        if (callReturnVal === "Bool") {
                            bools = true;
                        }
                        if (callReturnVal === "List") {
                            lists = true;
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
                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);


                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3;
                        }
                        for (var insideType = 0; insideType < allTypes.length; insideType++) {
                            if (originality) {
                                if (useInput.input && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (allTypes[insideType] === "Str" && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (allTypes[insideType] === "Int") {
                                    results.ints = 3;
                                }
                                if (allTypes[insideType] === "Bool") {
                                    results.booleans = 3;
                                }
                                if (allTypes[insideType] === "Float") {
                                    results.floats = 3;
                                }
                                if (allTypes[insideType] === "List" && (results.lists < 3)) {
                                    results.lists = 3;
                                }
                            }
                        }

                        var nestedVars = complexityCalculatorHelperFunctions.getNestedVariables(testItem, []);
                        var anyOriginality = false;

                        for (var i = 0; i < nestedVars.length; i++) {
                            var nestVar = getVariableObject(nestedVars[i]);
                            if (nestVar != null && nestVar.original) {
                                anyOriginality = true;
                                break;
                            }
                        }
                        if (anyOriginality || anyOriginality) {
                            if (useInput.input) {
                                results.lists = 4;
                            }
                            if (useInput.strIndexed) {
                                results.strings = 4;
                            }
                            if (useInput.indexed) {
                                results.lists = 4;
                            }
                        }
                    }

                    if (testItem._astname === "Call") {
                        if ('func' in testItem) {
                            if (originality) {
                                var functionName = testItem.func.id.v;
                                var testFunc = getFunctionObject(functionName);
                                if (testFunc != null) {
                                    if (testFunc.nested) {
                                        purposeVars = true;
                                    }
                                    if (testFunc.opsDone != null) {
                                        var testOps = complexityCalculatorHelperFunctions.opsBeforeLine(testFunc.opsDone, node.lineno, "func", testFunc);
                                        for (var op = 0; op < testOps.length; op++) {
                                            if (testOps[op] === "BinOp" || testOps[op] === "AugAssign") {
                                                results.mathematicalOperators = 3;
                                            }
                                            if (testOps[op] === "BoolOp") {
                                                results.boolOps = 3;
                                            }
                                            if (testOps[op] === "StrOp") {
                                                results.strOps = 3;
                                            }
                                            if (testOps[op] === "ListOp") {
                                                results.listOps = 3;
                                            }
                                            if (testOps[op] === "Compare") {
                                                results.comparisons = 3;
                                            }
                                        }
                                    }
                                    //input
                                    if (testFunc.indexAndInput.input && originality) {
                                        results.consoleInput = 3;
                                    }
                                    if (testFunc.indexAndInput.indexed) {
                                        results.lists = 4;
                                    }
                                    if (testFunc.indexAndInput.strIndexed) {
                                        results.lists = 4;
                                    }


                                    //contained values
                                    if (testFunc.containedValue != null) {
                                        for (var c = 0; c < testFunc.containedValue.length; c++) {
                                            var varType = testFunc.containedValue[c];
                                            if (varType === "Str" && results.strings < 3) {
                                                results.strings = 3;
                                            }
                                            if (varType === "Int") {
                                                results.ints = 3;
                                            }
                                            if (varType === "Float") {
                                                results.floats = 3;
                                            }
                                            if (varType === "Bool") {
                                                results.booleans = 3;
                                            }
                                            if (varType === "List" && (results.lists < 3)) {
                                                results.lists = 3;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //if the test is a variable
                    if (testItem._astname === "Name") {
                        var argVar = getVariableObject(testItem.id.v);
                        if (argVar != null) {
                            var varInput = false;
                            if (argVar.indexAndInput.input) {
                                varInput = true;
                            }
                            var assignOriginal = argVar.original;


                            if (originality || assignOriginal) {
                                if (argVar.indexAndInput.indexed) {
                                    results.lists = 4;
                                }
                                if (argVar.indexAndInput.strIndexed) {
                                    results.strings = 4;
                                }
                                var varType = argVar.value;

                                var contained = argVar.containedValue;

                                if (varInput && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (results.variables < 3) {
                                    results.variables = 3;
                                }

                                if (argVar.opsDone != null) {
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(argVar.opsDone, node.lineno, "var", argVar), opsUsed);
                                }

                                if (varType === "Str" && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (varType === "Int") {
                                    results.ints = 3;
                                }
                                if (varType === "Float") {
                                    results.floats = 3;
                                }
                                if (varType === "Bool") {
                                    results.booleans = 3;
                                }
                                if (varType === "List" && (results.lists < 3)) {
                                    results.lists = 3;
                                }

                                if (contained.length > 0) {
                                    for (var v = 0; v < contained.length; v++) {
                                        var containedTypeValue = contained[v];

                                        if (containedTypeValue === "Str" && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if (containedTypeValue === "Int") {
                                            results.ints = 3;
                                        }
                                        if (containedTypeValue === "Float") {
                                            results.floats = 3;
                                        }
                                        if (containedTypeValue === "Bool") {
                                            results.booleans = 3;
                                        }
                                        if (containedTypeValue === "List" && (results.lists < 3)) {
                                            results.lists = 3;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    //orrrrr if it's a binop, boolop, list, or call we grab the contained values. wheeee.
                    if (testItem._astname === "Compare" || testItem._astname === "BoolOp" || testItem._astname === "List" || testItem._astname === "BoolOp") {
                        if (testItem._astname === "Compare" && originality) {
                            results.comparisons = 3;
                        }

                        //oh we need variable NAMEs hrngh
                        var allNamesWithin = [];
                        complexityCalculatorHelperFunctions.getNestedVariables(testItem, allNamesWithin);

                        //if ANY of these is marked as original, assignment counts as original
                        var originalAssign = false;
                        var varInput = false;

                        for (var n = 0; n < allNamesWithin.length; n++) {
                            var testVariable = getVariableObject(allNamesWithin[n]);
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
                                    if (containedVal === "List" && results.lists < 3) {
                                        results.lists = 3;
                                    }
                                    if (containedVal === "Bool" && results.booleans < 3) {
                                        results.booleans = 3;
                                    }
                                    if (containedVal === "Str" && results.strings < 3) {
                                        results.strings = 3;
                                    }
                                    if (containedVal === "Int" && results.ints < 3) {
                                        results.ints = 3;
                                    }
                                    if (containedVal === "Float") {
                                        results.floats = 3;
                                    }
                                    if (containedValList.length > 0) {
                                        for (var v = 0; v < containedValList.length; v++) {
                                            var containedItem = containedValList[v];
                                            if (containedItem === "List" && results.lists < 3) {
                                                results.lists = 3;
                                            }
                                            if (containedItem === "Bool" && results.booleans < 3) {
                                                results.booleans = 3;
                                            }
                                            if (containedItem === "Str" && results.strings < 3) {
                                                results.strings = 3;
                                            }
                                            if (containedItem === "Int" && results.ints < 3) {
                                                results.ints = 3;
                                            }
                                            if (containedItem === "Float") {
                                                results.floats = 3;
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
                                    var isVar = getVariableObject(unaryNames[p]);
                                    if (isVar != null && isVar.original) {
                                        anyOr = true;
                                        break;
                                    }
                                }
                            }
                            if (anyOr) {
                                results.booleans = 3;
                            }
                            nodeValue = nodeValue.operand;
                        }
                        //handle subscript and unaryops
                        if (nodeValue._astname === "Subscript" && (nodeValue.slice._astname === "Index" || nodeValue.slice._astname === "Slice")) {
                            //is the thing we're indexing a list?
                            if (nodeValue.value._astname === "List") {
                                results.lists = 4;
                            }
                            if (nodeValue.value._astname === "Subscript" && getNestedIndexing(nodeValue.value)) {
                                results.lists = 4;
                            }
                            if (nodeValue.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeValue.value))) {
                                results.lists = 4;
                            }
                            if (nodeValue.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF that returns a list
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeValue.value)) {
                                    results.lists = 4;
                                }
                                else if ('id' in nodeValue.func) {
                                    var calledFunc = getUserFunctionReturn(nodeValue.func.id.v);
                                    if (calledFunc != null && calledFunc.returns === "List") {
                                        results.lists = 4;
                                    }
                                }
                            }
                            if (nodeValue.value._astname === "Name" && getVariableObject(nodeValue.value.id.v) != null && getVariableObject(nodeValue.value.id.v).value === "List") {
                                results.lists = 4;
                            }
                        }

                        nodeValue = complexityCalculatorHelperFunctions.retrieveFromList(nodeValue);

                        if (nodeValue != null && nodeValue._astname === "UnaryOp") {
                            var anyOr = originality;
                            if (!originality) {
                                var unaryNames = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(nodeValue, unaryNames);
                                for (var p in unaryNames) {
                                    var isVar = getVariableObject(unaryNames[p]);
                                    if (isVar != null && isVar.original) {
                                        anyOr = true;
                                        break;
                                    }
                                }
                            }
                            if (anyOr) {
                                results.booleans = 3;
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

                            var otherVar = getVariableObject(nodeValue.id.v);
                            if (otherVar != null) {
                                var numberOfMods = 0;
                                //ops done
                                if (otherVar.opsDone != null && (otherVar.original || originality)) {
                                    var otherVarOps = complexityCalculatorHelperFunctions.opsBeforeLine(otherVar.opsDone, node.lineno, "var", otherVar);
                                    complexityCalculatorHelperFunctions.appendArray(otherVarOps, opsUsed);
                                }
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
                                    if (varType === "List" && results.lists < 3) {
                                        results.lists = 3;
                                    }
                                    if (varType === "Bool" && (results.bools === "Does Not Use" || results.bools === 1 || results.bools === 2)) {
                                        results.bools = 3;
                                    }
                                    if (varType === "Str" && results.strings < 3) {
                                        results.strings = 3;
                                    }
                                    if (varType === "Int") {
                                        results.ints = 3;
                                    }
                                    if (varType === "Float") {
                                        results.floats = 3;
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
                    }
                    else if (node.slice._astname === "Slice") {
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
                                        if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
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
                                    if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeToCheck)[0]) {
                                        results.strings = 4;
                                    }

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
                                            //is it a listop, OR a UDF that returns a list
                                            if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeToCheck.value)) {
                                                isIndexedItem = true;
                                            }
                                            else if ('id' in nodeToCheck.value.func) {
                                                var funcList = getFunctionObject(nodeToCheck.value.func.id.v);
                                                if (funcList != null && funcList.returns === "List") {
                                                    isIndexedItem = true;
                                                }
                                            }
                                        }
                                        if (nodeToCheck.value._astname === "Name") {
                                            isIndexedItem = (getVariableObject(nodeToCheck.value.id.v).value === "List");
                                        }
                                    }

                                    if (isIndexedItem) {
                                        results.lists = 4;
                                    }
                                }

                                //get any variables nested inside
                                var varsIn = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, varsIn);
                                var anyOriginality = originality;
                                if (!anyOriginality) {
                                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                        if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
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
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(node) || complexityCalculatorHelperFunctions.doesCallCreateString(node)) {
                                    lineNumberToUse = node.lineno - 1;
                                }

                                // get the function name
                                var funcName = "";
                                var argFunc = nodeToCheck.func;
                                argFunc = complexityCalculatorHelperFunctions.retrieveFromList(argFunc);

                                if ('id' in argFunc) {
                                    funcName = argFunc.id.v;
                                }
                                else if ('attr' in argFunc) {
                                    funcName = argFunc.attr.v;
                                }

                                //get ops and input
                                if (listFuncs.includes(funcName)) {
                                    lists = true;
                                    if (!opsUsed.includes("ListOp")) {
                                        opsUsed.push("ListOp");
                                    }
                                }
                                if (strFuncs.includes(funcName)) {
                                    strings = true;
                                    if (!opsUsed.includes("StrOp")) {
                                        opsUsed.push("StrOp");
                                    }
                                }
                                if (funcName === "readInput") {
                                    results.consoleInput = 3;
                                }

                                var funcReturn = "";
                                var returnContains = [];


                                var funcItem = getFunctionObject(funcName);

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
                                        results.lists = 4;
                                    }
                                    if (funcItem.indexAndInput != null && funcItem.indexAndInput.strIndexed) {
                                        results.strings = 4;
                                    }
                                    if (funcItem.opsDone != null) {
                                        var opsUsedList = complexityCalculatorHelperFunctions.opsBeforeLine(funcItem.opsDone, lineNumberToUse, "func", funcItem);
                                        complexityCalculatorHelperFunctions.appendArray(opsUsedList, opsUsed);
                                    }
                                }

                                if (funcReturn === "Str" && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (funcReturn === "Int") {
                                    results.ints = 3;
                                }
                                if (funcReturn === "Float") {
                                    results.floats = 3;
                                }
                                if (funcReturn === "Bool") {
                                    results.booleans = 3;
                                }
                                if (funcReturn === "List" && (results.lists < 3)) {
                                    results.lists = 3;
                                }

                                if (returnContains != null) {
                                    for (var ret = 0; ret < returnContains.length; ret++) {
                                        var funcReturnCont = returnContains[ret];
                                        if (funcReturnCont === "Str" && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if (funcReturnCont === "Int") {
                                            results.ints = 3;
                                        }
                                        if (funcReturnCont === "Float") {
                                            results.floats = 3;
                                        }
                                        if (funcReturnCont === "Bool") {
                                            results.booleans = 3;
                                        }
                                        if (funcReturnCont === "List" && (results.lists < 3)) {
                                            results.lists = 3;
                                        }
                                    }
                                }
                            }

                            //basic datatypes
                            else if (nodeToCheck._astname === 'Str') {
                                strings = true;
                            }
                            else if (nodeToCheck._astname === 'Name' && nodeToCheck.id.v != null && (nodeToCheck.id.v === 'True' || nodeToCheck.id.v === 'False')) {
                                bools = true;
                            }
                            else if (nodeToCheck._astname === 'Num') {
                                if (!complexityCalculatorHelperFunctions.isNodeFloat(nodeToCheck)) {
                                    ints = true;
                                }
                                else {
                                    floats = true;
                                }
                            }
                            else if (nodeToCheck._astname === 'List') {
                                //if it's a list, we also look at and note all the types in the list as being used for a purpose.
                                lists = true;
                                var listInputIndexing = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                };
                                var listValues = [];
                                if (originality) {

                                    //check ops and list and string indexing
                                    var operations = [];
                                    listValues = complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck.elts, listValues, listInputIndexing, operations);
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                                    if (listInputIndexing.indexed) {
                                        results.lists = 4;
                                    }
                                    if (listInputIndexing.strIndexed) {
                                        results.strings = 4;
                                    }
                                }
                                else {
                                    listValues = complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck.elts, listValues, {
                                        input: false,
                                        indexed: false,
                                        strIndexed: false
                                    }, []);
                                }

                                //basic datatypes - purpose
                                for (var k = 0; k < listValues.length; k++) {
                                    if (listValues[k] === "Str") {
                                        strings = true;
                                    }
                                    else if (listValues[k] === "Bool") {
                                        bools = true;
                                    }
                                    else if (listValues[k] === "Int") {
                                        ints = true;
                                    }
                                    else if (listValues[k] === "Float") {
                                        floats = true;
                                    }
                                }

                                if (listInputIndexing.input && originality) {
                                    results.consoleInput = 3;
                                }

                                var varsIn = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, varsIn);

                                var varsIn = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(nodeToCheck, varsIn);
                                var anyOriginality = originality;
                                if (!anyOriginality) {
                                    for (var varIn = 0; varIn < varsIn.length; varIn++) {
                                        if (getVariableObject(varsIn[varIn]) != null && getVariableObject(varsIn[varIn]).original) {
                                            anyOriginality = true;
                                            break;
                                        }
                                    }
                                }
                                if (varsIn.length > 0 && anyOriginality) {
                                    purposeVars = true;
                                }
                            }
                            else if (nodeToCheck._astname === 'Name' && nodeToCheck.id.v !== "True" && nodeToCheck.id.v !== "False") {
                                //then it's a variable. look up what's in there.
                                purposeVars = true;


                                var lineNumberToUse = node.lineno;
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(node) || complexityCalculatorHelperFunctions.doesCallCreateString(node)) {
                                    lineNumberToUse = node.lineno - 1;
                                }

                                var otherVar = getVariableObject(nodeToCheck.id.v);

                                if (otherVar != null) {
                                    originalAssignment = otherVar.original;
                                    if ((originalAssignment || originality) && otherVar.indexAndInput.indexed) {
                                        results.lists = 4;
                                    }
                                    if ((originalAssignment || originality) && otherVar.indexAndInput.strIndexed) {
                                        results.strings = 4;
                                    }
                                    if ((originalAssignment || originality) && otherVar.opsDone != null) {
                                        var opsUsedInVar = complexityCalculatorHelperFunctions.opsBeforeLine(otherVar.opsDone, lineNumberToUse, "var", otherVar);
                                        complexityCalculatorHelperFunctions.appendArray(opsUsedInVar, opsUsed);

                                    }

                                    if (otherVar.containedValue != null) {
                                        for (var c = 0; c < otherVar.containedValue.length; c++) {
                                            switch (otherVar.containedValue[c]) {
                                                case "Str":
                                                    strings = true;
                                                    break;
                                                case "Bool":
                                                    bools = true;
                                                    break;
                                                case "Int":
                                                    ints = true;
                                                    break;
                                                case "Float":
                                                    floats = true;
                                                    break;
                                                case "List":
                                                    lists = true;
                                                    break;
                                            }
                                        }
                                    }
                                    switch (otherVar.value) {
                                        case "Str":
                                            strings = true;
                                            break;
                                        case "Bool":
                                            bools = true;
                                            break;
                                        case "Int":
                                            ints = true;
                                            break;
                                        case "Float":
                                            floats = true;
                                            break;
                                        case "List":
                                            lists = true;
                                            if (otherVar.containedValue != null) {
                                                //go through values in list and note those too!
                                                for (var k = 0; k < otherVar.containedValue.length; k++) {
                                                    if (otherVar.containedValue[k] === "Str") {
                                                        strings = true;
                                                    }
                                                    else if (otherVar.containedValue[k] === "Bool") {
                                                        bools = true;
                                                    }
                                                    else if (otherVar.containedValue[k] === "Int") {
                                                        ints = true;
                                                    }
                                                    else if (otherVar.containedValue[k] === "Float") {
                                                        floats = true;
                                                    }
                                                }
                                            }
                                            break;
                                    }
                                }
                            }
                            else if ((nodeToCheck._astname === "BinOp" || nodeToCheck._astname === "BoolOp" || nodeToCheck._astname === "Compare" || nodeToCheck._astname === "List")) {
                                if (complexityCalculatorHelperFunctions.getIndexingInNode(nodeToCheck)[0] && (originality || complexityCalculatorHelperFunctions.getIndexingInNode(nodeToCheck)[1])) {
                                    results.lists = 4;
                                }
                                if (complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeToCheck)[0] && (originality || complexityCalculatorHelperFunctions.getStringIndexingInNode(nodeToCheck)[1])) {
                                    results.strings = 4;
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
                                    if (getVariableObject(containedInOp[u]) != null && getVariableObject(containedInOp[u]).original) {
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
                                }
                                else {
                                    var inputIndexPurpose = {
                                        input: false,
                                        indexed: false,
                                        strIndexed: false
                                    };
                                    var operations = [];


                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, withinBinOp, inputIndexPurpose, operations);
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);


                                    if (inputIndexPurpose.input) {
                                        results.consoleInput = 3;
                                    }
                                    if (inputIndexPurpose.indexed) {
                                        results.lists = 4;
                                    }
                                    if (inputIndexPurpose.strIndexed) {
                                        results.strings = 4;
                                    }
                                }
                                if (originality && !opsUsed.includes("BinOp")) { opsUsed.push("BinOp"); }
                                for (var p = 0; p < withinBinOp.length; p++) {
                                    if (Array.isArray(withinBinOp[p])) {
                                        //if the binop includes a list, go through THAT.
                                        lists = true;
                                        for (var s = 0; s < withinBinOp.length; s++) {
                                            switch (withinBinOp[p][s]) {
                                                case "Str":
                                                    strings = true;
                                                    break;
                                                case "Bool":
                                                    bools = true;
                                                    break;
                                                case "Int":
                                                    ints = true;
                                                    break;
                                                case "Float":
                                                    floats = true;
                                                    break;
                                            }
                                        }
                                    }
                                    else {
                                        switch (withinBinOp[p]) {
                                            //otherwise we just see what the item is.
                                            case "Str":
                                                strings = true;
                                                break;
                                            case "Bool":
                                                bools = true;
                                                break;
                                            case "Int":
                                                ints = true;
                                                break;
                                            case "Float":
                                                floats = true;
                                                break;
                                        }
                                    }
                                }
                            }
                            else if (nodeToCheck._astname === "BoolOp") {
                                var boolOpValues = [];

                                if (originality && !opsUsed.includes("BoolOp")) {
                                    opsUsed.push("BoolOp");
                                }

                                if (!originality) {
                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, boolOpValues, {
                                        indexed: false,
                                        input: false,
                                        strIndexed: false
                                    }, []);
                                }

                                else {

                                    var inputForPurposeInArg = {
                                        input: false,
                                        indexed: false,
                                        strIndexed: false
                                    };

                                    var operations = [];
                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, boolOpValues, inputForPurposeInArg, operations);
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                                    if (inputForPurposeInArg.input) {
                                        results.consoleInput = 3;
                                    }
                                    if (inputForPurposeInArg.indexed) {
                                        results.lists = 4;
                                    }
                                    if (inputForPurposeInArg.strIndexed) {
                                        results.strings = 4;
                                    }
                                }

                                if (boolOpValues[b].includes("Str")) {
                                    strings = true;
                                }
                                if (boolOpValues[b].includes("Int")) {
                                    ints = true;
                                }
                                if (boolOpValues[b].includes("Float")) {
                                    floats = true;
                                }
                                if (boolOpValues[b].includes("Bool")) {
                                    bools = true;
                                }
                                if (boolOpValues[b].includes("List")) {
                                    lists = true;
                                }

                            }
                            //chack all values inside the comparison
                            else if (nodeToCheck._astname === "Compare") {
                                var compareValues = [];
                                var indexInputItem = {
                                    input: false,
                                    indexed: false,
                                    strIndexed: false
                                };

                                if (!opsUsed.includes("Compare")) {
                                    opsUsed.push("Compare");
                                }
                                if (!originality) {
                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, compareValues, {
                                        input: false,
                                        indexed: false,
                                        strIndexed: false
                                    }, []);
                                }

                                else {
                                    var compareInd = false;
                                    var compareStrInd = false;
                                    var operations = [];

                                    complexityCalculatorHelperFunctions.listTypesWithin(nodeToCheck, compareValues, indexInputItem, operations);
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                                    if (indexInputItem.indexed) {
                                        results.lists = 4;
                                    }
                                    if (indexInputItem.strIndexed) {
                                        results.strings = 4;
                                    }
                                }
                                if (indexInputItem.input) {
                                    results.consoleInput = 3;
                                }

                                if (compareValues[b].includes("Str")) {
                                    strings = true;
                                }
                                if (compareValues[b].includes("Int")) {
                                    ints = true;
                                }
                                if (compareValues[b].includes("Float")) {
                                    floats = true;
                                }
                                if (compareValues[b].includes("Bool")) {
                                    bools = true;
                                }
                                if (compareValues[b].includes("List")) {
                                    lists = true;
                                }

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

                                var otherVar = getVariableObject(nodeToCheck.id.v);
                                if (otherVar != null) {
                                    var numberOfMods = 0;

                                    //ops done
                                    if (otherVar.opsDone != null && (otherVar.original || originality)) {
                                        var otherVarOps = complexityCalculatorHelperFunctions.opsBeforeLine(otherVar.opsDone, node.lineno, "var", otherVar);
                                        complexityCalculatorHelperFunctions.appendArray(otherVarOps, opsUsed);
                                    }

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
                                        if (varType === "List" && results.lists < 3) {
                                            results.lists = 3;
                                        }
                                        if (varType === "Bool" && results.bools < 3) {
                                            results.bools = 3;
                                        }
                                        if (varType === "Str" && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if (varType === "Int") {
                                            results.ints = 3;
                                        }
                                        if (varType === "Float") {
                                            results.floats = 3;
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
                                    var otherVariable = getVariableObject(allNamesWithin[n]);

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
                                            if (otherVariable.value === "List" && results.lists < 3) {
                                                results.lists = 3;
                                            }
                                            if (otherVariable.value === "Bool" && (results.bools < 3)) {
                                                results.bools = 3;
                                            }
                                            if (otherVariable.value === "Str" && results.strings < 3) {
                                                results.strings = 3;
                                            }
                                            if (otherVariable.value === "Int") {
                                                results.ints = 3;
                                            }
                                            if (otherVariable.value === "Float") {
                                                results.floats = 3;
                                            }
                                            if (otherVariable.indexAndInput.input) {
                                                results.consoleInput = 3;
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
                            if (floats) {
                                results.floats = 3;
                            }
                            if (ints) {
                                results.ints = 3;
                            }
                            if (strings && results.strings < 3) {
                                results.strings = 3;
                            }
                            if (bools) {
                                results.booleans = 3;
                            }
                            if (lists && (results.lists < 3)) {
                                results.lists = 3;
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
                                    var iVar = getVariableObject(initVars[i]);
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


                                typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.init.targets[0], typesWithinAssign, assignIn, opsUsed);
                                complexityCalculatorHelperFunctions.listTypesWithin(node.init.value, typesWithinAssign, assignIn, opsUsed);


                                //datatypes
                                if ('int' in typesWithinAssign) {
                                    results.ints = 3;
                                }
                                if ('str' in typesWithinAssign && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if ('bool' in typesWithinAssign) {
                                    results.booleans = 3;
                                }
                                if ('list' in typesWithinAssign && results.lists < 3) {
                                    results.lists = 3;
                                }
                                if ('float' in typesWithinAssign) {
                                    results.floats = 3;
                                }

                                if (assignIn.input) {
                                    results.consoleInput = 3;
                                }
                                if (assignIn.indexed) {
                                    results.lists = 4;
                                }
                                if (assignIn.strIndexed) {
                                    results.strings = 4;
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
                                    var iVar = getVariableObject(initVars[i]);

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

                                typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.init.target, typesWithinAssign, assignIn, opsUsed);
                                complexityCalculatorHelperFunctions.listTypesWithin(node.init.value, typesWithinAssign, assignIn, opsUsed);

                                //datatypes
                                if ('int' in typesWithinAssign) {
                                    results.ints = 3;
                                }
                                if ('str' in typesWithinAssign &&
                                    results.strings < 3) { results.strings = 3; }
                                if ('bool' in typesWithinAssign) {
                                    results.booleans = 3;
                                }
                                if ('list' in typesWithinAssign && results.lists < 3) {
                                    results.lists = 3;
                                }
                                if ('float' in typesWithinAssign) {
                                    results.floats = 3;
                                }

                                if (assignIn.input) {
                                    results.consoleInput = 3;
                                }
                                if (assignIn.indexed) {
                                    results.lists = 4;
                                }
                                if (assignIn.strIndexed) {
                                    results.strings = 4;
                                }
                            }
                        }

                    }


                    //test node is always there. this is a comparison, or a bool, or a boolop. Something that returns a bool.
                    //We'll need typeswithin here as well as any other ops
                    var nodeTest = node.test;
                    if (nodeTest._astname === "UnaryOp") {
                        var anyOr = originality;

                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeTest, unaryNames);
                            for (var p in unaryNames) {
                                var isVar = getVariableObject(unaryNames[p]);

                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }
                        if (anyOr) {
                            results.booleans = 3;
                        }
                        nodeTest = nodeTest.operand;
                    }

                    //is the test node a subscript?
                    if (nodeTest._astname === "Subscript" && (nodeTest.slice._astname === "Index" || nodeTest.slice._astname === "Slice")) {
                        //is the thing we're indexing a list?
                        if (nodeTest.value._astname === "List") {
                            results.lists = 4;
                        }
                        if (nodeTest.value._astname === "Subscript" && getNestedIndexing(nodeTest.value)) {
                            results.lists = 4;
                        }
                        if (nodeTest.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(nodeTest.value))) {
                            results.lists = 4;
                        }
                        if (nodeTest.value._astname === "Call") {
                            //is it a listop, concat binop, OR a UDF that returns a list
                            if (complexityCalculatorHelperFunctions.doesCallCreateList(nodeTest.value)) {
                                results.lists = 4;
                            }
                            else if ('id' in nodeTest.func) {
                                var calledFunc = getUserFunctionReturn(nodeTest.func.id.v);
                                if (calledFunc != null && calledFunc.returns === "List") {
                                    results.lists = 4;
                                }
                            }
                        }
                        if (nodeTest.value._astname === "Name" && getVariableObject(nodeTest.value.id.v).value === "List") {
                            results.lists = 4;
                        }
                    }


                    nodeTest = complexityCalculatorHelperFunctions.retrieveFromList(nodeTest);

                    if (nodeTest._astname === "UnaryOp") {
                        var anyOr = originality;
                        if (!originality) {
                            var unaryNames = [];
                            complexityCalculatorHelperFunctions.getNestedVariables(nodeTest, unaryNames);

                            for (var p in unaryNames) {
                                var isVar = getVariableObject(unaryNames[p]);
                                if (isVar != null && isVar.original) {
                                    anyOr = true;
                                    break;
                                }
                            }
                        }

                        if (anyOr) {
                            results.booleans = 3;
                        }
                        nodeTest = nodeTest.operand;
                    }

                    var nestedVars = [];
                    complexityCalculatorHelperFunctions.getNestedVariables(nodeTest, nestedVars);

                    var anyOriginal = originality;
                    if (!originality) {
                        for (var i in nestedVars) {
                            var isVar = getVariableObject(nestedVars[i]);
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
                        dataTypesIn = complexityCalculatorHelperFunctions.listTypesWithin(nodeTest, dataTypesIn, indexingIn, opsUsed);

                        var testItem = node.test;



                        //unary and subscript values
                        if (testItem._astname === "UnaryOp") {
                            var anyOr = originality;
                            if (!originality) {
                                var unaryNames = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);

                                for (var p in unaryNames) {
                                    var isVar = getVariableObject(unaryNames[p]);

                                    if (isVar != null && isVar.original) {
                                        anyOr = true;
                                        break;
                                    }
                                }
                            }

                            if (anyOr) {
                                results.booleans = 3;
                            }
                            testItem = testItem.operand;
                        }


                        if (testItem._astname === "Subscript" && (testItem.slice._astname === "Index" || testItem.slice._astname === "Slice")) {
                            //is the thing we're indexing a list?
                            if (testItem.value._astname === "List") {
                                results.lists = 4;
                            }
                            if (testItem.value._astname === "Subscript" && getNestedIndexing(testItem.value)) {
                                results.lists = 4;
                            }
                            if (testItem.value._astname === "BinOp" && Array.isArray(complexityCalculatorHelperFunctions.recursivelyAnalyzeBinOp(testItem.value))) {
                                results.lists = 4;
                            }
                            if (testItem.value._astname === "Call") {  //is it a listop, concat binop, OR a UDF that returns a list
                                if (complexityCalculatorHelperFunctions.doesCallCreateList(testItem.value)) {
                                    results.lists = 4;
                                }

                                else if ('id' in testItem.func) {
                                    var calledFunc = getUserFunctionReturn(testItem.func.id.v);
                                    if (calledFunc != null && calledFunc.returns === "List") {
                                        results.lists = 4;
                                    }
                                }
                            }
                            if (testItem.value._astname === "Name" && getVariableObject(testItem.value.id.v).value === "List") {
                                results.lists = 4;
                            }
                        }

                        testItem = complexityCalculatorHelperFunctions.retrieveFromList(testItem);

                        if (testItem._astname === "UnaryOp") {
                            var anyOr = originality;
                            if (!originality) {
                                var unaryNames = [];
                                complexityCalculatorHelperFunctions.getNestedVariables(testItem, unaryNames);
                                for (var p in unaryNames) {
                                    var isVar = getVariableObject(unaryNames[p]);

                                    if (isVar != null && isVar.original) {
                                        anyOr = true;
                                        break;
                                    }
                                }
                            }
                            if (anyOr) {
                                results.booleans = 3;
                            }

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
                            }
                            else {
                                funcName = testItem.func.attr.v;
                            }

                            //get indexing and input
                            if (funcName === 'readInput') {
                                inputUsed = true;
                            }
                            if (listFuncs.indexOf(funcName) > -1 && originality) {
                                lists = true;
                                if (!opsUsed.includes("ListOp")) {
                                    opsUsed.push("ListOp");
                                }
                            }
                            else if (strFuncs.indexOf(funcName) > -1 && originality) {
                                strings = true;
                                if (!opsUsed.includes("StrOp")) {
                                    opsUsed.push("StrOp");
                                }
                            }
                            else if (getFunctionObject(funcName).indexAndInput.indexed && (originality || getFunctionObject(funcName).original)) {
                                results.lists = 4;
                            }


                            var callReturnVal = "";
                            var calledFunc = getFunctionObject(funcName);

                            //updates results and purpose booleans
                            if (calledFunc != null) {
                                callReturnVal = calledFunc.returns;
                                if (calledFunc.containedValue != null) {
                                    if (calledFunc.containedValue.includes("Str")) {
                                        strings = true;
                                    }
                                    if (calledFunc.containedValue.includes("Int")) {
                                        ints = true;
                                    }
                                    if (calledFunc.containedValue.includes("Float")) {
                                        floats = true;
                                    }
                                    if (calledFunc.containedValue.includes("Bool")) {
                                        bools = true;
                                    }

                                }

                                if (calledFunc.indexAndInput.input) {
                                    inputUsed = true;
                                }
                                if (originality && calledFunc.indexAndInput.indexed) {
                                    results.lists = 4;
                                }
                                if (originality && calledFunc.indexAndInput.strIndexed) {
                                    results.strings = 4;
                                }
                                if (calledFunc.nested) {
                                    purposeVars = true;
                                }
                                if (calledFunc.opsDone != null && originality) {
                                    complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(calledFunc.opsDone, node.lineno, "func", calledFunc), opsUsed);
                                }
                            }

                            if (callReturnVal === "Str") {
                                strings = true;
                            }
                            if (callReturnVal === "Int") {
                                ints = true;
                            }
                            if (callReturnVal === "Float") {
                                floats = true;
                            }
                            if (callReturnVal === "Bool") {
                                bools = true;
                            }
                            if (callReturnVal === "List") {
                                lists = true;
                            }


                            //if the test is a function call
                            if ('func' in testItem) {
                                if (originality) {
                                    var functionName = testItem.func.id.v;
                                    var testFunc = getFunctionObject(functionName);


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
                                            results.lists = 4;
                                        }
                                        if (testFunc.indexAndInput.strIndexed) {
                                            results.lists = 4;
                                        }


                                        //contained values
                                        if (testFunc.containedValue != null) {
                                            if (testFunc.containedValue.includes("Str") && results.strings < 3) {
                                                results.strings = 3;
                                            }
                                            if (testFunc.containedValue.includes("Int")) {
                                                results.ints = 3;
                                            }
                                            if (testFunc.containedValue.includes("Float")) {
                                                results.floats = 3;
                                            }
                                            if (testFunc.containedValue.includes("Bool")) {
                                                results.booleans = 3;
                                            }
                                            if (testFunc.containedValue.includes("List") && (results.lists < 3)) {
                                                results.lists = 3;
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
                            complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(operations, node.lineno, "", null), opsUsed);

                            if (testItem._astname === "Compare" && originality) {
                                results.comparisons = 3;
                            }


                            //update results from types within?
                            if (originality) {
                                if (useInput.input && results.consoleInput < 3) {
                                    results.consoleInput = 3;
                                }
                                if (allTypes.includes("Str") && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if (allTypes.includes("Int")) {
                                    results.ints = 3;
                                }
                                if (allTypes.includes("Bool")) {
                                    results.booleans = 3;
                                }
                                if (allTypes.includes("Float")) {
                                    results.floats = 3;
                                }
                                if (allTypes.includes("List") && (results.lists < 3)) {
                                    results.lists = 3;
                                }
                            }

                            var nestedVars = complexityCalculatorHelperFunctions.getNestedVariables(testItem, []);
                            var anyOriginality = false;

                            for (var i = 0; i < nestedVars.length; i++) {
                                var nestVar = getVariableObject(nestedVars[i]);
                                if (nestVar != null && nestVar.original) {
                                    anyOriginality = true;
                                    break;
                                }
                            }

                            //input, indexing
                            if (anyOriginality || anyOriginality) {
                                if (useInput.input) {
                                    results.lists = 4;
                                }
                                if (useInput.strIndexed) {
                                    results.strings = 4;
                                }
                                if (useInput.indexed) {
                                    results.lists = 4;
                                }
                            }
                        }

                        //if test item is a variable
                        if (testItem._astname === "Name") {
                            var argVar = getVariableObject(testItem.id.v);


                            if (argVar != null) {
                                var varInput = false;
                                if (argVar.indexAndInput.input) {
                                    varInput = true;
                                }
                                var assignOriginal = argVar.original;


                                if (originality || assignOriginal) {
                                    if (argVar.indexAndInput.indexed) {
                                        results.lists = 4;
                                    }
                                    if (argVar.indexAndInput.strIndexed) {
                                        results.strings = 4;
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

                                    if (argVar.opsDone != null) {
                                        complexityCalculatorHelperFunctions.appendArray(complexityCalculatorHelperFunctions.opsBeforeLine(argVar.opsDone, node.lineno, "var", argVar), opsUsed);
                                    }

                                    if (varType === "Str" && results.strings < 3) {
                                        results.strings = 3;
                                    }
                                    if (varType === "Int") {
                                        results.ints = 3;
                                    }
                                    if (varType === "Float") {
                                        results.floats = 3;
                                    }
                                    if (varType === "Bool") {
                                        results.booleans = 3;
                                    }
                                    if (varType === "List" && (results.lists < 3)) {
                                        results.lists = 3;
                                    }

                                    if (contained.length > 0) {

                                        if (contained.includes("Str") && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if (contained.includes("Int")) {
                                            results.ints = 3;
                                        }
                                        if (contained.includes("Float")) {
                                            results.floats = 3;
                                        }
                                        if (contained.includes("Bool")) {
                                            results.booleans = 3;
                                        }
                                        if (contained.includes("List") && (results.lists < 3)) {
                                            results.lists = 3;
                                        }

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
                                var testVariable = getVariableObject(allNamesWithin[n]);

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
                                        if ((containedVal === "List" || containedValList.includes("List")) && results.lists < 3) {
                                            results.lists = 3;
                                        }
                                        if ((containedVal === "Bool" || containedValList.includes("Bool")) && results.booleans < 3) {
                                            results.booleans = 3;
                                        }
                                        if ((containedVal === "Str" || containedValList.includes("Str")) && results.strings < 3) {
                                            results.strings = 3;
                                        }
                                        if ((containedVal === "Int" || containedValList.includes("Int")) && results.ints < 3) {
                                            results.ints = 3;
                                        }
                                        if (containedVal === "Float" || containedValList.includes("Float")) {
                                            results.floats = 3;
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

                        //datatypes
                        if ('int' in dataTypesIn) {
                            results.ints = 3;
                        }
                        if ('str' in dataTypesIn && results.strings < 3) {
                            results.strings = 3;
                        }
                        if ('bool' in dataTypesIn) {
                            results.booleans = 3;
                        }
                        if ('list' in dataTypesIn && results.lists < 3) {
                            results.lists = 3;
                        }
                        if ('float' in dataTypesIn) {
                            results.floats = 3;
                        }


                        if (indexingIn.input) {
                            results.consoleInput = 3;
                        }
                        if (indexingIn.indexed) {
                            results.lists = 4;
                        }
                        if (indexingIn.strIndexed) {
                            results.strings = 4;
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
                                    var iVar = getVariableObject(updateVars[i]);
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


                                typesWithinAssign = complexityCalculatorHelperFunctions.listTypesWithin(node.update.target, typesWithinAssign, assignIn, opsUsed);
                                complexityCalculatorHelperFunctions.listTypesWithin(node.update.value, typesWithinAssign, assignIn, opsUsed);

                                //datatypes
                                if ('int' in typesWithinAssign) {
                                    results.ints = 3;
                                }
                                if ('str' in typesWithinAssign && results.strings < 3) {
                                    results.strings = 3;
                                }
                                if ('bool' in typesWithinAssign) {
                                    results.booleans = 3;
                                }
                                if ('list' in typesWithinAssign && results.lists < 3) {
                                    results.lists = 3;
                                }
                                if ('float' in typesWithinAssign) {
                                    results.floats = 3;
                                }


                                if (assignIn.input) {
                                    results.consoleInput = 3;
                                }
                                if (assignIn.indexed) {
                                    results.lists = 4;
                                }
                                if (assignIn.strIndexed) {
                                    results.strings = 4;
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

                //updates results with information from opsUsed
                for (var op = 0; op < opsUsed.length; op++) {

                    var thisOp = opsUsed[op];
                    if (typeof thisOp === "object") {
                        thisOp = thisOp.op;
                    }

                    if (thisOp === "Compare") {
                        results.comparisons = 3;
                    }
                    if (thisOp === "BoolOp") {
                        results.boolOps = 3;
                    }
                    if (thisOp === "BinOp" || opsUsed[op] === "AugAssign") {
                        results.mathematicalOperators = 3;
                    }
                    if (thisOp === "StrOp") {
                        results.strOps = 3;
                    }
                    if (thisOp === "ListOp") {
                        results.listOps = 3;
                    }
                }

                takesArgs = false;
                returns = false;


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


    /**
     * Recursively analyze a python abstract syntax tree.
     * @private
     */
    function recursiveAnalyzeAST(ast, results, loopParent) {
        if (ast != null && ast.body != null) {
            angular.forEach(ast.body, function (node) {
                var loopPar = analyzeASTNode(node, results, loopParent);
                recursiveAnalyzeAST(node, results, loopPar);
            });
        }
        else if (ast != null && (ast._astname != null || (ast[0] != null && typeof ast[0] === 'object'))) {
            angular.forEach(ast, function (node) {
                var loopPar = analyzeASTNode(node, results, loopParent);
                recursiveAnalyzeAST(node, results, loopPar);
            });
        }
        return results;
    }

    function analyzeJavascript(source) {
        //  try {
        apiCalls = [];
        allCalls = [];
        allConditionals = [];
        variableAssignments = [];

        var ast = acorn.parse(source, {
            locations: true
        });


        listFuncs = JS_LIST_FUNCS;
        strFuncs = JS_STR_FUNCS;
        createListFuncs = JS_LIST_FUNCS;
        createStrFuncs = JS_STR_FUNCS;

        studentCode = source.split("\n");

        //handle this like you'd handle python.
        var newAST = convertJavascriptASTTree(ast);


        //initialize all of the lists we'll use in each code reading
        originalityLines = [];
        loopLocations = [];
        dataTypes = [];
        functionLines = [];
        uncalledFunctionLines = [];
        userFunctionParameters = [];
        makeBeatRenames = [];
        userFunctionRenames = [];
        forLoopFuncs = [];

        //initialize list of function return objects with all functions from the API that return something (includes casting)
        userFunctionReturns = starterReturns.slice(0);
        allVariables = [];

        //initialize the results object
        var resultsObject = {
            userFunc: 0,
            conditionals: 0,
            forLoops: 0,
            lists: 0,
            strings: 0,
            ints: 0,
            floats: 0,
            booleans: 0,
            variables: 0,
            listOps: 0,
            strOps: 0,
            boolOps: 0,
            comparisons: 0,
            mathematicalOperators: 0,
            consoleInput: 0
        };


        isJavascript = true;
        //PASS 0: efficient originality. we need. JS sample code
        checkOriginality();
        //PASS 1: Do the same thing for function returns from user-defined functions
        evaluateuserFunctionParameters(newAST, resultsObject);
        //PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
        gatherAllVariables(newAST);
        //PASS 3: Account for the variables that only exist as function params. This pass also does a couple other things in the way of functions/removes called function lines from the uncalledFunctionLines so they get checked
        evaluateFunctionReturnParams(newAST);

        //Now, use information gained from labeling user functions to fill in missing variable info, and vice-versa. 10 is the max number of times this will happen before we give up. we can change this if it proves problematic
        iterations = 0;
        while (!complexityCalculatorHelperFunctions.allReturnsFilled() && iterations < 10) {
            evaluateAllEmpties();
            iterations++;
        }
        //PASS 4: Actually analyze the Python.
        recursiveAnalyzeAST(newAST, resultsObject, [false, false]);

        //boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
        if (resultsObject.boolOps > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.boolOps;
        }
        if (resultsObject.comparisons > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.comparisons;
        }

        //translate the calculated values
       // translateIntegerValues(resultsObject);
        //console.log(resultsObject);
        lineDict();
        results = resultsObject;

        caiErrorHandling.updateNames(allVariables, userFunctionParameters);
        return resultsObject;


        // }
        //catch (err) {
        //    userNotification.show(ESMessages.general.complexitySyntaxError, 'failure2', 5);
        //    throw err;
        //}
    }


    //fun javascript conversion times

    function convertJavascriptASTTree(AstTree) {
        var bodyItems = [];

        for (var i in AstTree.body) {
            var toAdd = convertJavascriptASTNode(AstTree.body[i]);
            bodyItems.push(toAdd);
        }

        var parentItem = { body: bodyItems };
        return parentItem;

    }

    var jsParentLine;
    var jsParentCol;

    /*
    *Converts a Javascript AST to a fake Python AST
    *@param JsAst The Javascript AST to convert.
    * does this by hierarchically going through JS AST nodes, and constructing a new AST with matching nodes structured like Skulpt Python nodes
    */
    function convertJavascriptASTNode(JsAst) {
        var returnObject = {};
        var object = JsAst;


        if (JsAst.type === "ExpressionStatement") { //remove expression objects. we do not need them.
            object = JsAst.expression;
        }
        var hasBody = false;
        if ('body' in object && 'body' in object.body) { // we skip the blockstatement....thing
            hasBody = true;
            var nodeBody = [];
            for (var i in object.body.body) {
                var bodyItem = convertJavascriptASTNode(object.body.body[i]);
                nodeBody.push(bodyItem);
            }
            if (object.body.body[0] != null && "loc" in object.body.body[0]) {
                nodeBody.lineno = object.body.body[0].loc.start.line;
            }
            else {
                nodeBody.lineno = jsParentLine;
            }
        }


        //line number
        if (object.loc != null) {
            returnObject.lineno = object.loc.start.line;
            returnObject.col_offset = object.loc.start.column;

            jsParentLine = object.loc.start.line;
            jsParentCol = object.loc.start.column;
        }
        else {
            returnObject.lineno = jsParentLine;
            returnObject.col_offset = jsParentCol;
        }

        //now for the hard part - covering everything we might possibly need.

        if (object.type === "ForStatement") { //for loops are a special case, because they function VERY differently in js than in python. We have to build in csome extra stuff in our analysis function, but that's doable, methinks.
            returnObject._astname = "JSFor";
            if (object.init != null) {
                returnObject.init = convertJavascriptASTNode(object.init);
            }
            if (object.test != null) {
                returnObject.test = convertJavascriptASTNode(object.test);
            }
            if (object.update != null) {
                returnObject.update = convertJavascriptASTNode(object.update);
            }
            if (hasBody) {
                returnObject.body = nodeBody;
            }
        }

        else if (object.type === "ForInStatement") { //for loops are a special case, because they function VERY differently in js than in python. We have to build in csome extra stuff in our analysis function, but that's doable, methinks.
            returnObject._astname = "For";

            //has an iter and a target
            returnObject.iter = convertJavascriptASTNode(object.right);
            if (object.left.type = "VariableDeclaration") {
                returnObject.target = convertJavascriptASTNode(object.left.declarations[0].id)
            }
            else {
                returnObject.iter = convertJavascriptASTNode(object.left);
            }


            if (hasBody) {
                returnObject.body = nodeBody;
            }
        }
        else if (object.type === "WhileStatement") {
            if (object.test != null) {
                returnObject.test = convertJavascriptASTNode(object.test);
            }
            if (hasBody) {
                returnObject.body = nodeBody;
            }
        }
        else if (object.type === "FunctionDeclaration") {
            returnObject._astname = "FunctionDef";

            //has id.v with "name" ast
            if (object.id != null) {
                var funcName = object.id.name;
                returnObject.name = { v: funcName, lineno: object.loc.start.line };
            }

            //and a params property.
            var paramsObject = [];
            for (var i in object.params) {
                var paramObject = convertJavascriptASTNode(object.params[i]);
                paramsObject.push(paramObject);
            }
            returnObject.args = {
                args: paramsObject,
                lineno: object.loc.start.line
            };

            //and a body.
            if (hasBody) {
                returnObject.body = nodeBody;
            }
        }
        else if (object.type === "FunctionExpression") {
            returnObject._astname = "FunctionExp";

            //name the function after its location so its return gets properly tallied by function evaluate.
            returnObject.functionName = "" + object.loc.start.line + "|" + object.loc.start.column;

            //make a child object the serves as a function definition
            var funcDefObj = {
                _astname: "FunctionDef",
                lineno: object.loc.start.line,
                name: { v: returnObject.functionName }
            };

            //body in funcdefobj
            if (hasBody) {
                funcDefObj.body = nodeBody
            };


            //params
            var paramsObject = [];
            for (var i in object.params) {
                var paramObject = convertJavascriptASTNode(object.params[i]);
                paramsObject.push(paramObject);
            }

            funcDefObj.args = {
                args: paramsObject,
                lineno: object.loc.start.line
            };

            returnObject.functionDef = funcDefObj;
        }

        else if (object.type === "IfStatement") {
            returnObject._astname = "If";

            if (object.test != null) {
                returnObject.test = convertJavascriptASTNode(object.test);
            }

            returnObject.body = [];
            if (object.consequent != null && 'body' in object.consequent) {
                for (var i in object.consequent.body) {
                    var addObj = convertJavascriptASTNode(object.consequent.body[i]);
                    if (addObj != null) { returnObject.body.push(addObj); }
                }
            }

            //alternate is the "else" component
            if (object.alternate != null && object.alternate.type !== "EmptyStatement") {
                if (object.alternate.type === "BlockStatement") {

                    var bodyList = [];
                    for (var i in object.alternate.body) {
                        bodyList.push(convertJavascriptASTNode(object.alternate.body[i]));
                    }

                    returnObject.orelse = bodyList;
                }

                else {
                    returnObject.orelse = [convertJavascriptASTNode(object.alternate)]; //could be a single line, could be a body node
                }
            }
        }
        else if (object.type === "VariableDeclaration") {
            //we're actually looking in the declarator node
            var declaratorNode = object.declarations[0];

            returnObject._astname = "Assign";

            returnObject.targets = [convertJavascriptASTNode(declaratorNode.id)];
            if (declaratorNode.init != null) {
                returnObject.value = convertJavascriptASTNode(declaratorNode.init);
            }
            else { //fake null node
                returnObject.value = { lineno: object.loc.start.line };
                returnObject.value._astname = "Name";
                returnObject.value.id = {
                    v: "None",
                    lineno: object.loc.start.line
                };
            }
        }
        else if (object.type === "MemberExpression") {

            if ('name' in object.property && (JS_LIST_FUNCS.includes(object.property.name) || JS_STR_FUNCS.includes(object.property.name))) {

                returnObject._astname = "Call";

                //initialize function object
                returnObject.func = {
                    _astname: "Attribute",
                    attr: {
                        v: object.property.name,
                        lineno: object.loc.start.line
                    },
                    lineno: object.loc.start.line
                };

                returnObject.func.value = convertJavascriptASTNode(object.object);
            }
            else {
                returnObject._astname = "Subscript";

                //subscript nodes have a slice, which has a value. here, the slice _astname will ALWAYS be "Index"
                returnObject.slice = { _astname: "Index" };
                returnObject.slice.value = convertJavascriptASTNode(object.property);

                //and a value which is the thing we are slicing.
                returnObject.value = convertJavascriptASTNode(object.object);
            }

        }
        else if (object.type === "CallExpression") {


            returnObject._astname = "Call";
            returnObject.func = {}; //initialize function object

            var attrFuncs = ["pop", "reverse", "length", "sort", "concat", "indexOf", "splice", "push"];

            //first, we HAVE to get the function name
            //if it's a listop or strop . we need all the extra stuff bc memberexpression can also be a subscript which doesn't get saved as an attr


            if (object.callee.type === "MemberExpression" && 'property' in object.callee && 'name' in object.callee.property &&
                (JS_LIST_FUNCS.includes(object.callee.property.name) || JS_STR_FUNCS.includes(object.callee.property.name))) {

                //get the funcname and store as an attr. attr.v is func name - in JS, this is an identifier in objec.tproperty. we just need the name prop tbqh   //func.value is arg - in JS, this is stored inobject.object.
                returnObject.func._astname = "Attribute";
                returnObject.func.attr = {
                    v: object.callee.property.name,
                    lineno: object.loc.start.line
                };

                returnObject.func.value = convertJavascriptASTNode(object.callee.object);

                if (object.arguments.length > 0) {
                    var argsObj = [];
                    for (var i in object.arguments) {
                        argsObj.push(convertJavascriptASTNode(object.arguments[i]));
                    }
                    returnObject.args = argsObj;
                }
            }
            else if (object.callee.type === "MemberExpression" && 'object' in object.callee && 'name' in object.callee.object && (JS_BUILT_IN_OBJECTS.includes(object.callee.object.name))) {
                returnObject.func.id = {
                    v: object.callee.property.name,
                    lineno: object.loc.start.line
                };

                returnObject.args = [];
            }

            else {
                var funcVal = convertJavascriptASTNode(object.callee);

                returnObject.func = funcVal;
                var argsObj = [];
                for (var i in object.arguments) {
                    argsObj.push(convertJavascriptASTNode(object.arguments[i]));
                }
                returnObject.args = argsObj;
            }

        }
        else if (object.type === "ReturnStatement") {
            returnObject._astname = "Return";

            if (object.argument != null) {
                returnObject.value = convertJavascriptASTNode(object.argument);
            }
        }
        else if (object.type === "BinaryExpression") {

            //this could be a binop OR compare. Check the operator.
            var binOps = ["+", "-", "*", "/", "%", "^", "**"];
            if (binOps.includes(object.operator)) {

                //then we make a binop node
                returnObject._astname = "BinOp";

                //binop has left, right, and operator
                returnObject.left = convertJavascriptASTNode(object.left);
                returnObject.right = convertJavascriptASTNode(object.right);

                var op = "";
                switch (object.operator) {
                    case "+":
                        op = "Add";
                        break;
                    case "-":
                        op = "Sub";
                        break;
                    case "/":
                        op = "Div";
                        break;
                    case "*":
                        op = "Mult";
                        break;
                    case "%":
                        op = "Mod";
                        break;
                    case "**":
                        op = "Pow";
                        break;
                    case "^":
                        op = "Pow";
                        break;
                    default:
                        break;

                }

                returnObject.op = { name: op };

            }
            else {
                //we make a compare node
                //then we make a binop node
                returnObject._astname = "Compare";

                //binop has left, right, and operator
                returnObject.left = convertJavascriptASTNode(object.left);
                returnObject.comparators = [convertJavascriptASTNode(object.right)];
                var op = "";
                switch (object.operator) {
                    case ">":
                        op = "Gt";
                        break;
                    case "<":
                        op = "Lt";
                        break;
                    case ">=":
                        op = "GtE";
                        break;
                    case "<=":
                        op = "LtE";
                        break;
                    case "==":
                        op = "Eq";
                        break;
                    case "!=":
                        op = "NotEq";
                        break;
                    default:
                        break;

                }
                returnObject.ops = [{ name: op }];
            }
        }
        else if (object.type === "UnaryExpression" && object.operator === "!") {
            returnObject._astname = "UnaryOp";

            returnObject.op = { name: "Not" };
            returnObject.operand = convertJavascriptASTNode(object.argument);
        }
        else if (object.type === "UnaryExpression" && object.operator === "-") {

            returnObject._astname = "Num";
            var value = object.argument.value;
            value = -value;

            returnObject.n = {
                lineno: object.loc.start.line,
                v: value
            }
        }
        else if (object.type === "LogicalExpression") {
            returnObject._astname = "BoolOp";

            var leftVal = convertJavascriptASTNode(object.left);
            var rightVal = convertJavascriptASTNode(object.right);
            var op = object.operator;

            returnObject.values = [leftVal, rightVal];

            //operator should be or or and. bitwise ops don't count.
            if (op === "&&") {
                op = "And";
            }
            else if (op === "||") {
                op = "Or";
            }
            else {
                //do nothing.
            }

            returnObject.op = { name: op };
        }
        else if (object.type === "Literal") {
            //this is all of our basic datatypes - int, float, bool, str, and null

            if (object.value == null) {
                returnObject._astname = "Name";
                returnObject.id = {
                    v: "None",
                    lineno: object.loc.start.line
                };
            }
            else if (typeof object.value === 'string') {
                returnObject._astname = "Str";
                returnObject.s = {
                    v: object.value,
                    lineno: object.loc.start.line
                };
            }
            else if (typeof object.value === 'number') {
                returnObject._astname = "Num";
                returnObject.n = {
                    v: object.value,
                    lineno: object.loc.start.line
                };
            }
            else if (typeof object.value === 'boolean') {
                returnObject._astname = "Name";
                var boolVal = object.value.raw;
                if (boolVal === "true") {
                    boolVal = "True";
                }
                else {
                    boolVal = "False";
                }
                returnObject.id = {
                    v: boolVal,
                    lineno: object.loc.start.line
                };
            }
        }
        else if (object.type === "Identifier") {
            returnObject._astname = "Name";
            returnObject.id = {
                v: object.name,
                lineno: object.loc.start.line
            };
        }
        else if (object.type === "ArrayExpression") {
            returnObject._astname = "List";
            var eltsObj = [];

            for (var i in object.elements) {
                eltsObj.push(convertJavascriptASTNode(object.elements[i]))
            }

            returnObject.elts = eltsObj;
        }
        else if (object.type === "UpdateExpression" || object.type === "AssignmentExpression") {

            //augassign has target, op, value
            if (object.type === "UpdateExpression") {
                returnObject._astname = "AugAssign";

                //++ is just += 1
                var opString = "";
                if (object.operator === "++") {
                    opString = "Add";
                }
                if (object.operator === "--") {
                    opString = "Sub";
                }


                var valueObj = {
                    _astname: "Num",
                    n: {
                        v: 1,
                        lineno: object.loc.start.line
                    },
                    lineno: object.loc.start.line
                };

                var targetObj = convertJavascriptASTNode(object.argument);


                returnObject.target = targetObj;
                returnObject.value = valueObj;
                returnObject.op = opString;
            }
            else {
                if (object.operator === "=") {
                    returnObject._astname = "Assign";

                    returnObject.targets = [convertJavascriptASTNode(object.left)];
                    returnObject.value = convertJavascriptASTNode(object.right);
                }
                else {
                    returnObject._astname = "AugAssign";
                    var opString = "";
                    if (object.operator === "+=") {
                        opString = "Add";
                    }
                    else if (object.operator === "-=") {
                        opString = "Sub";
                    }
                    else if (object.operator === "*=") {
                        opString = "Mult";
                    }
                    else if (object.operator === "/=") {
                        opString = "Div";
                    }
                    else if (object.operator === "%=") {
                        opString = "Mod";
                    }

                    returnObject.op = opString;
                    returnObject.target = convertJavascriptASTNode(object.left);
                    returnObject.value = convertJavascriptASTNode(object.right);
                }
            }

        }
        return returnObject;
    }

    function lineDict() {

        function fillLevels(nodeList, levelList) {
            var childNodes = [];
            var thisLevel = [];
            for (var i in nodeList) {
                if (nodeList[i].children.length > 0) {
                    for (var j in nodeList[i].children) {
                        childNodes.push(nodeList[i].children[j]);
                    }
                }
                thisLevel.push([nodeList[i].start, nodeList[i].end]);

            }
            levelList.push(thisLevel);
            if (childNodes.length > 0) {
                fillLevels(childNodes, levelList);
            }
        }



        lineDictionary = [];

        //initialize array values
        for (var i in studentCode) {
            lineDictionary.push({ line: Number(i) + 1, variables: [], loop: 0, calls: [], ifElse: [] });
        }

        //note every time the user defines a function
        for (var u in userFunctionReturns) {
            if (userFunctionReturns[u].startLine != null) {
                var index = userFunctionReturns[u].startLine - 1;
                lineDictionary[index].userFunction = userFunctionReturns[u];
                var i = index + 1;
                while (i < userFunctionReturns[u].endLine) {
                    lineDictionary[i].userFunction = userFunctionReturns[u];
                    i++;
                }
            }
        }

        //note every time a variable is assigned or modified
        for (var v in variableAssignments) {
            var index = variableAssignments[v].line - 1;
            var variableVal = getVariableObject(variableAssignments[v].name);
            if (lineDictionary[index] != null) {
                lineDictionary[index].variables.push(variableVal);
            }
        }

        for (var loop in loopLocations) {
            //track the begin points of each loop
            var index = loopLocations[loop][0] - 1;
            lineDictionary[index].loopStart = loopLocations[loop];

            //note which lines are in one or more loops
            for (var loopLine = loopLocations[loop][0] - 1; loopLine <= loopLocations[loop][1] - 1; loopLine++) {
                if (lineDictionary[loopLine] != null) {
                    lineDictionary[loopLine].loop += 1;
                }
            }
        }

        for (var call in allCalls) {
            var index = allCalls[call].line - 1;
            if (lineDictionary[index] != null) {
                lineDictionary[index].calls.push(allCalls[call]);
            }
        }


        //nested if else statements
        var levels = [];
        fillLevels(allConditionals, levels);


        //remove overlap in levels
        for (var i in levels) {
            for (var j = 0; j < levels[i].length; j++) {
                //if (j != 0) {
                //    //if it's not the first one, subtract 1 from the start value
                //   // levels[i][j][0] -= 1;
                //}
                if (j != levels[i].length - 1) {
                    //if it's not the last one, subtract 1 from the end value
                    levels[i][j][1] = levels[i][j][1] - 1;
                }
                else {
                }
            }
        }

        for (var i in levels) {
            for (var j = 0; j < levels[i].length; j++) {
                var string = "else";
                if (j === 0) {
                    string = "if";
                }
                var start = levels[i][j][0];
                var end = levels[i][j][1];
                for (var p = start; p <= end; p++) {
                    lineDictionary[p - 1].ifElse.push(string);
                }
            }
        }


        return lineDictionary;
    }

    return {
        total: total,
        apiCalls: apiCalls,
        pythonAst: pythonAst,
        analyzePython: analyzePython,
        analyzeJavascript: analyzeJavascript,
        lineDict: lineDict,
        getVariableObject: getVariableObject,
        getFunctionObject: getFunctionObject
    };
}]);
