/*
 * An angular factory for processing Python code through the complexity calculator service.
 *
 * @module complexityCalculator
 * @author Jason Smith, Erin Truesdell
 */
app.factory('complexityCalculatorPY', ['userNotification', 'complexityCalculator', 'caiErrorHandling', 'complexityCalculatorHelperFunctions', function (userNotification, complexityCalculator, caiErrorHandling, complexityCalculatorHelperFunctions) {

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
        complexityCalculatorHelperFunctions.replaceNumericUnaryOps(ast.body);
        //initialize the results object
        var resultsObject = {
            userFunc: 0,
            conditionals: 0,
            forLoops: 0,
            List: 0,
            Str: 0,
            Int: 0,
            Float: 0,
            Bool: 0,
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
        complexityCalculator.checkOriginality();
        //PASS 1: Do the same thing for function returns from user-defined functions
        complexityCalculator.evaluateUserFunctionParameters(ast, resultsObject);
        //PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
        complexityCalculator.gatherAllVariables(ast);
        //PASS 3: Account for the variables that only exist as function params.
        complexityCalculator.evaluateFunctionReturnParams(ast);
        //use information gained from labeling user functions to fill in missing variable info, and vice-versa.
        iterations = 0;
        while (!complexityCalculatorHelperFunctions.allReturnsFilled() && iterations < 10) {
            complexityCalculator.evaluateAllEmpties();
            iterations++;
        }
        complexityCalculator.recursiveAnalyzeAST(ast, resultsObject, [false, false]);
        //PASS 4: Actually analyze the Python.
        //boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
        if (resultsObject.boolOps > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.boolOps;
        }
        if (resultsObject.comparisons > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.comparisons;
        }

        // translateIntegerValues(resultsObject);   //translate the calculated values
        complexityCalculatorHelperFunctions.lineDict();
        results = resultsObject;
        caiErrorHandling.updateNames(allVariables, userFunctionParameters);
        return resultsObject;
    }

    return {
        pythonAst: pythonAst,
        analyzePython: analyzePython
    };
}]);
