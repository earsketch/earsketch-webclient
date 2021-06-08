/*
 * An angular factory for processing Python code through the complexity calculator service.
 *
 * @module complexityCalculator
 * @author Jason Smith, Erin Truesdell
 */
app.factory('complexityCalculatorPY', ['userNotification', 'complexityCalculator', 'caiErrorHandling', 'complexityCalculatorHelperFunctions', 'complexityCalculatorState', function (userNotification, complexityCalculator, caiErrorHandling, complexityCalculatorHelperFunctions, complexityCalculatorState) {

    /**
    * Build the abstract syntax tree for Python. Useful for analyzing script
    * complexity or looking for specific function call e.g. onLoop().
    *
    * @param source {String} The source code to analyze.
    * @private
    */
    function generateAst(source) {
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

        complexityCalculatorState.resetState();
        complexityCalculatorState.setProperty("listFuncs",['append', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort']);
        complexityCalculatorState.setProperty('studentCode',source.split("\n"));

        //initialize list of function return objects with all functions from the API that return something (includes casting), using a slice to make a copy so as not to overwrite anything in starterReturns
        userFunctionReturns = starterReturns.slice(0);

        var ast = generateAst(source);
        complexityCalculatorHelperFunctions.replaceNumericUnaryOps(ast.body);
        //initialize the results object
        var resultsObject = {
            userFunc: 0,
            conditionals: 0,
            forLoops: 0,
            List: 0,
            variables: 0,
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
        caiErrorHandling.updateNames(complexityCalculatorState.getProperty('allVariables'), complexityCalculatorState.getProperty('userFunctionParameters'));
        return resultsObject;
    }

    return {
        analyzePython: analyzePython
    };
}]);
