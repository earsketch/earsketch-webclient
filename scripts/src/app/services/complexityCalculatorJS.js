/*
 * An angular factory for processing JavaScript code through the complexity calculator service.
 *
 * @module complexityCalculator
 * @author Jason Smith, Erin Truesdell
 */
app.factory('complexityCalculatorJS', ['userNotification', 'complexityCalculator', 'caiErrorHandling', 'complexityCalculatorHelperFunctions', 'complexityCalculatorState', function (userNotification, complexityCalculator, caiErrorHandling, complexityCalculatorHelperFunctions, complexityCalculatorState) {


    function analyzeJavascript(source) {
        //  try {

        complexityCalculatorState.resetState();

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

        //initialize list of function return objects with all functions from the API that return something (includes casting)
        userFunctionReturns = starterReturns.slice(0);
        allVariables = [];

        //initialize the results object
        var resultsObject = {
            userFunc: 0,
            conditionals: 0,
            forLoops: 0,
            List: 0,
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
        complexityCalculator.checkOriginality();
        //PASS 1: Do the same thing for function returns from user-defined functions
        complexityCalculator.evaluateUserFunctionParameters(newAST, resultsObject);
        //PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
        complexityCalculator.gatherAllVariables(newAST);
        //PASS 3: Account for the variables that only exist as function params. This pass also does a couple other things in the way of functions/removes called function lines from the uncalledFunctionLines so they get checked
        complexityCalculator.evaluateFunctionReturnParams(newAST);

        //Now, use information gained from labeling user functions to fill in missing variable info, and vice-versa. 10 is the max number of times this will happen before we give up. we can change this if it proves problematic
        iterations = 0;
        while (!complexityCalculatorHelperFunctions.allReturnsFilled() && iterations < 10) {
            complexityCalculator.evaluateAllEmpties();
            iterations++;
        }
        //PASS 4: Actually analyze the Python.
        complexityCalculator.recursiveAnalyzeAST(newAST, resultsObject, [false, false]);

        //boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
        if (resultsObject.boolOps > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.boolOps;
        }
        if (resultsObject.comparisons > resultsObject.booleans) {
            resultsObject.booleans = resultsObject.comparisons;
        }

        //translate the calculated values
        // translateIntegerValues(resultsObject);
        complexityCalculatorHelperFunctions.lineDict();
        results = resultsObject;
        caiErrorHandling.updateNames(allVariables, userFunctionParameters);
        return resultsObject;
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
            }

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
            if (Object.keys(binOps).includes(object.operator)) {
                //then we make a binop node
                returnObject._astname = "BinOp";
                //binop has left, right, and operator
                returnObject.left = convertJavascriptASTNode(object.left);
                returnObject.right = convertJavascriptASTNode(object.right);
                returnObject.op = { name: binOps[object.operator] };
            }
            else if (Object.keys(comparatorOps).includes(object.operator)) {
                //we make a compare node
                //then we make a binop node
                returnObject._astname = "Compare";
                //binop has left, right, and operator
                returnObject.left = convertJavascriptASTNode(object.left);
                returnObject.comparators = [convertJavascriptASTNode(object.right)];
                returnObject.ops = [{ name: comparatorOps[object.operator] }];
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
            returnObject.values = [convertJavascriptASTNode(object.left), convertJavascriptASTNode(object.right)];
            //operator should be or or and. bitwise ops don't count.
            if (Object.keys(boolOps).includes(object.operator)) {
                returnObject.op = { name: boolOps[object.operator] };
            }
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

                var valueObj = {
                    _astname: "Num",
                    n: {
                        v: 1,
                        lineno: object.loc.start.line
                    },
                    lineno: object.loc.start.line
                };

                var targetObj = convertJavascriptASTNode(object.argument);

                returnObject.op = binOps[object.operator[0]];
                returnObject.target = targetObj;
                returnObject.value = valueObj;
            }
            else {
                if (object.operator === "=") {
                    returnObject._astname = "Assign";

                    returnObject.targets = [convertJavascriptASTNode(object.left)];
                    returnObject.value = convertJavascriptASTNode(object.right);
                }
                else {
                    returnObject._astname = "AugAssign";
 
                    returnObject.op = binOps[object.operator[0]];
                    returnObject.target = convertJavascriptASTNode(object.left);
                    returnObject.value = convertJavascriptASTNode(object.right);
                }
            }
        }
        return returnObject;
    }

    return {
        analyzeJavascript: analyzeJavascript
    };
}]);
