/* eslint-disable */
// TODO: Resolve lint issues.

import * as acorn from "acorn"

import * as ccState from "./complexityCalculatorState"
import * as caiErrorHandling from "./errorHandling"
import * as ccHelpers from "./complexityCalculatorHelperFunctions"
import * as cc from "./complexityCalculator"

// Process JavaScript code through the complexity calculator service.
export function analyzeJavascript(source) {
    ccState.resetState()
    ccState.setProperty("listFuncs", ["length", "of", "concat", "copyWithin", "entries", "every", "fill", "filter", "find", "findIndex", "forEach", "includes", "indexOf", "join", "keys", "lastIndexOf", "map", "pop", "push", "reduce", "reduceRight", "reverse", "shift", "slice", "some", "sort", "splice", "toLocaleString", "toSource", "toString", "unshift", "values"])
    const ast = acorn.parse(source, {
        locations: true,
    })
    ccState.setProperty("studentCode", source.split("\n"))
    // handle this like you'd handle python.
    const newAST = convertASTTree(ast)
    // initialize list of function return objects with all functions from the API that return something (includes casting)
    const allVariables = []
    // initialize the results object
    const resultsObject = {
        userFunc: 0,
        conditionals: 0,
        forLoops: 0,
        List: 0,
        variables: 0,
        consoleInput: 0,
    }
    ccState.setProperty("isJavascript", true)
    // PASS 1: Do the same thing for function returns from user-defined functions
    cc.evaluateUserFunctionParameters(newAST, resultsObject)
    // PASS 2: Gather and label all user-defined variables. If the value is a function call or a BinOp
    cc.gatherAllVariables(newAST)
    // PASS 3: Account for the variables that only exist as function params. This pass also does a couple other things in the way of functions/removes called function lines from the uncalledFunctionLines so they get checked
    cc.evaluateFunctionReturnParams(newAST)
    // Now, use information gained from labeling user functions to fill in missing variable info, and vice-versa. 10 is the max number of times this will happen before we give up. we can change this if it proves problematic
    let iterations = 0
    while (!ccHelpers.allReturnsFilled() && iterations < 10) {
        cc.evaluateAllEmpties()
        iterations++
    }
    // PASS 4: Actually analyze the Python.
    cc.recursiveAnalyzeAST(newAST, resultsObject, [false, false])
    // boolops and comparisons count as boolean values, so if they're used at a certain level, booleans should be AT LEAST the value of these
    if (resultsObject.boolOps > resultsObject.booleans) {
        resultsObject.booleans = resultsObject.boolOps
    }
    if (resultsObject.comparisons > resultsObject.booleans) {
        resultsObject.booleans = resultsObject.comparisons
    }
    // translate the calculated values
    // translateIntegerValues(resultsObject);
    ccHelpers.lineDict()
    caiErrorHandling.updateNames(ccState.getProperty("allVariables"), ccState.getProperty("userFunctionParameters"))
    return resultsObject
}

// fun javascript conversion times
function convertASTTree(AstTree) {
    const bodyItems = []
    for (const i in AstTree.body) {
        const toAdd = convertASTNode(AstTree.body[i])
        bodyItems.push(toAdd)
    }
    const parentItem = { body: bodyItems }
    return parentItem
}

let jsParentLine
let jsParentCol

// Converts a Javascript AST to a fake Python AST
// does this by hierarchically going through JS AST nodes, and constructing a new AST with matching nodes structured like Skulpt Python nodes
function convertASTNode(JsAst) {
    const returnObject = {}
    let object = JsAst
    if (JsAst.type === "ExpressionStatement") { // remove expression objects. we do not need them.
        object = JsAst.expression
    }
    let hasBody = false
    if ("body" in object && "body" in object.body) { // we skip the blockstatement....thing
        hasBody = true
        var nodeBody = []
        for (var i in object.body.body) {
            const bodyItem = convertASTNode(object.body.body[i])
            nodeBody.push(bodyItem)
        }
        if (object.body.body[0] != null && "loc" in object.body.body[0]) {
            nodeBody.lineno = object.body.body[0].loc.start.line
        } else {
            nodeBody.lineno = jsParentLine
        }
    }
    // line number
    if (object.loc != null) {
        returnObject.lineno = object.loc.start.line
        returnObject.col_offset = object.loc.start.column

        jsParentLine = object.loc.start.line
        jsParentCol = object.loc.start.column
    } else {
        returnObject.lineno = jsParentLine
        returnObject.col_offset = jsParentCol
    }
    // now for the hard part - covering everything we might possibly need.
    if (object.type === "ForStatement") { // for loops are a special case, because they function VERY differently in js than in python. We have to build in csome extra stuff in our analysis function, but that's doable, methinks.
        returnObject._astname = "JSFor"
        if (object.init != null) {
            returnObject.init = convertASTNode(object.init)
        }
        if (object.test != null) {
            returnObject.test = convertASTNode(object.test)
        }
        if (object.update != null) {
            returnObject.update = convertASTNode(object.update)
        }
        if (hasBody) {
            returnObject.body = nodeBody
        }
    } else if (object.type === "ForInStatement") { // for loops are a special case, because they function VERY differently in js than in python. We have to build in csome extra stuff in our analysis function, but that's doable, methinks.
        returnObject._astname = "For"
        // has an iter and a target
        returnObject.iter = convertASTNode(object.right)
        if (object.left.type = "VariableDeclaration") {
            returnObject.target = convertASTNode(object.left.declarations[0].id)
        } else {
            returnObject.iter = convertASTNode(object.left)
        }
        if (hasBody) {
            returnObject.body = nodeBody
        }
    } else if (object.type === "WhileStatement") {
        if (object.test != null) {
            returnObject.test = convertASTNode(object.test)
        }
        if (hasBody) {
            returnObject.body = nodeBody
        }
    } else if (object.type === "FunctionDeclaration") {
        returnObject._astname = "FunctionDef"
        // has id.v with "name" ast
        if (object.id != null) {
            const funcName = object.id.name
            returnObject.name = { v: funcName, lineno: object.loc.start.line }
        }
        // and a params property.
        var paramsObject = []
        for (var i in object.params) {
            var paramObject = convertASTNode(object.params[i])
            paramsObject.push(paramObject)
        }
        returnObject.args = {
            args: paramsObject,
            lineno: object.loc.start.line,
        }
        // and a body.
        if (hasBody) {
            returnObject.body = nodeBody
        }
    } else if (object.type === "FunctionExpression") {
        returnObject._astname = "FunctionExp"
        // name the function after its location so its return gets properly tallied by function evaluate.
        returnObject.functionName = "" + object.loc.start.line + "|" + object.loc.start.column
        // make a child object the serves as a function definition
        const funcDefObj = {
            _astname: "FunctionDef",
            lineno: object.loc.start.line,
            name: { v: returnObject.functionName },
        }
        // body in funcdefobj
        if (hasBody) {
            funcDefObj.body = nodeBody
        }
        // params
        var paramsObject = []
        for (var i in object.params) {
            var paramObject = convertASTNode(object.params[i])
            paramsObject.push(paramObject)
        }
        funcDefObj.args = {
            args: paramsObject,
            lineno: object.loc.start.line,
        }
        returnObject.functionDef = funcDefObj
    } else if (object.type === "IfStatement") {
        returnObject._astname = "If"
        if (object.test != null) {
            returnObject.test = convertASTNode(object.test)
        }
        returnObject.body = []
        if (object.consequent != null && "body" in object.consequent) {
            for (var i in object.consequent.body) {
                const addObj = convertASTNode(object.consequent.body[i])
                if (addObj != null) { returnObject.body.push(addObj) }
            }
        }
        // alternate is the "else" component
        if (object.alternate != null && object.alternate.type !== "EmptyStatement") {
            if (object.alternate.type === "BlockStatement") {
                const bodyList = []
                for (var i in object.alternate.body) {
                    bodyList.push(convertASTNode(object.alternate.body[i]))
                }
                returnObject.orelse = bodyList
            } else {
                returnObject.orelse = [convertASTNode(object.alternate)] // could be a single line, could be a body node
            }
        }
    } else if (object.type === "VariableDeclaration") {
        // we're actually looking in the declarator node
        const declaratorNode = object.declarations[0]
        returnObject._astname = "Assign"
        returnObject.targets = [convertASTNode(declaratorNode.id)]
        if (declaratorNode.init != null) {
            returnObject.value = convertASTNode(declaratorNode.init)
        } else { // fake null node
            returnObject.value = { lineno: object.loc.start.line }
            returnObject.value._astname = "Name"
            returnObject.value.id = {
                v: "None",
                lineno: object.loc.start.line,
            }
        }
    } else if (object.type === "MemberExpression") {
        if ("name" in object.property && (ccState.JS_LIST_FUNCS.includes(object.property.name) || ccState.JS_STR_FUNCS.includes(object.property.name))) {
            returnObject._astname = "Call"
            // initialize function object
            returnObject.func = {
                _astname: "Attribute",
                attr: {
                    v: object.property.name,
                    lineno: object.loc.start.line,
                },
                lineno: object.loc.start.line,
            }
            returnObject.func.value = convertASTNode(object.object)
        } else {
            returnObject._astname = "Subscript"
            // subscript nodes have a slice, which has a value. here, the slice _astname will ALWAYS be "Index"
            returnObject.slice = { _astname: "Index" }
            returnObject.slice.value = convertASTNode(object.property)
            // and a value which is the thing we are slicing.
            returnObject.value = convertASTNode(object.object)
        }
    } else if (object.type === "CallExpression") {
        returnObject._astname = "Call"
        returnObject.func = {} // initialize function object
        const attrFuncs = ["pop", "reverse", "length", "sort", "concat", "indexOf", "splice", "push"]
        // first, we HAVE to get the function name
        // if it's a listop or strop . we need all the extra stuff bc memberexpression can also be a subscript which doesn't get saved as an attr
        if (object.callee.type === "MemberExpression" && "property" in object.callee && "name" in object.callee.property &&
            (ccState.JS_LIST_FUNCS.includes(object.callee.property.name) || ccState.JS_STR_FUNCS.includes(object.callee.property.name))) {
            // get the funcname and store as an attr. attr.v is func name - in JS, this is an identifier in objec.tproperty. we just need the name prop tbqh   //func.value is arg - in JS, this is stored inobject.object.
            returnObject.func._astname = "Attribute"
            returnObject.func.attr = {
                v: object.callee.property.name,
                lineno: object.loc.start.line,
            }
            returnObject.func.value = convertASTNode(object.callee.object)
            if (object.arguments.length > 0) {
                var argsObj = []
                for (var i in object.arguments) {
                    argsObj.push(convertASTNode(object.arguments[i]))
                }
                returnObject.args = argsObj
            }
        } else if (object.callee.type === "MemberExpression" && "object" in object.callee &&
        	"name" in object.callee.object && (ccState.JS_BUILT_IN_OBJECTS.includes(object.callee.object.name))) {
            returnObject.func.id = {
                v: object.callee.property.name,
                lineno: object.loc.start.line,
            }
            returnObject.args = []
        } else {
            const funcVal = convertASTNode(object.callee)
            returnObject.func = funcVal
            var argsObj = []
            for (var i in object.arguments) {
                argsObj.push(convertASTNode(object.arguments[i]))
            }
            returnObject.args = argsObj
        }
    } else if (object.type === "ReturnStatement") {
        returnObject._astname = "Return"
        if (object.argument != null) {
            returnObject.value = convertASTNode(object.argument)
        }
    } else if (object.type === "BinaryExpression") {
        // this could be a binop OR compare. Check the operator.
        if (Object.keys(ccState.binOps).includes(object.operator)) {
            // then we make a binop node
            returnObject._astname = "BinOp"
            // binop has left, right, and operator
            returnObject.left = convertASTNode(object.left)
            returnObject.right = convertASTNode(object.right)
            returnObject.op = { name: ccState.binOps[object.operator] }
        } else if (Object.keys(ccState.comparatorOps).includes(object.operator)) {
            // we make a compare node, then we make a binop node
            returnObject._astname = "Compare"
            // binop has left, right, and operator
            returnObject.left = convertASTNode(object.left)
            returnObject.comparators = [convertASTNode(object.right)]
            returnObject.ops = [{ name: ccState.comparatorOps[object.operator] }]
        }
    } else if (object.type === "UnaryExpression" && object.operator === "!") {
        returnObject._astname = "UnaryOp"
        returnObject.op = { name: "Not" }
        returnObject.operand = convertASTNode(object.argument)
    } else if (object.type === "UnaryExpression" && object.operator === "-") {
        returnObject._astname = "Num"
        let value = object.argument.value
        value = -value
        returnObject.n = {
            lineno: object.loc.start.line,
            v: value,
        }
    } else if (object.type === "LogicalExpression") {
        returnObject._astname = "BoolOp"
        returnObject.values = [convertASTNode(object.left), convertASTNode(object.right)]
        // operator should be or or and. bitwise ops don't count.
        if (Object.keys(ccState.boolOps).includes(object.operator)) {
            returnObject.op = { name: ccState.boolOps[object.operator] }
        }
    } else if (object.type === "Literal") {
        // this is all of our basic datatypes - int, float, bool, str, and null
        if (object.value == null) {
            returnObject._astname = "Name"
            returnObject.id = {
                v: "None",
                lineno: object.loc.start.line,
            }
        } else if (typeof object.value === "string") {
            returnObject._astname = "Str"
            returnObject.s = {
                v: object.value,
                lineno: object.loc.start.line,
            }
        } else if (typeof object.value === "number") {
            returnObject._astname = "Num"
            returnObject.n = {
                v: object.value,
                lineno: object.loc.start.line,
            }
        } else if (typeof object.value === "boolean") {
            returnObject._astname = "Name"
            let boolVal = object.value.raw
            if (boolVal === "true") {
                boolVal = "True"
            } else {
                boolVal = "False"
            }
            returnObject.id = {
                v: boolVal,
                lineno: object.loc.start.line,
            }
        }
    } else if (object.type === "Identifier") {
        returnObject._astname = "Name"
        returnObject.id = {
            v: object.name,
            lineno: object.loc.start.line,
        }
    } else if (object.type === "ArrayExpression") {
        returnObject._astname = "List"
        const eltsObj = []
        for (var i in object.elements) {
            eltsObj.push(convertASTNode(object.elements[i]))
        }
        returnObject.elts = eltsObj
    } else if (object.type === "UpdateExpression" || object.type === "AssignmentExpression") {
        // augassign has target, op, value
        if (object.type === "UpdateExpression") {
            returnObject._astname = "AugAssign"
            const valueObj = {
                _astname: "Num",
                n: {
                    v: 1,
                    lineno: object.loc.start.line,
                },
                lineno: object.loc.start.line,
            }
            const targetObj = convertASTNode(object.argument)
            returnObject.op = ccState.binOps[object.operator[0]]
            returnObject.target = targetObj
            returnObject.value = valueObj
        } else {
            if (object.operator === "=") {
                returnObject._astname = "Assign"
                returnObject.targets = [convertASTNode(object.left)]
                returnObject.value = convertASTNode(object.right)
            } else {
                returnObject._astname = "AugAssign"
                returnObject.op = ccState.binOps[object.operator[0]]
                returnObject.target = convertASTNode(object.left)
                returnObject.value = convertASTNode(object.right)
            }
        }
    }
    return returnObject
}
