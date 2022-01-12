import * as ccState from "./complexityCalculatorState"
import * as ccHelpers from "./complexityCalculatorHelperFunctions"

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.

// gets all ES API calls from a student script
export function getApiCalls() {
    return ccState.getProperty("apiCalls")
}

function recursiveCallOnNodes(funcToCall, args, ast) {
    if (ast && ast.body) {
        for (const key of Object.keys(ast.body)) {
            const node = ast.body[key]
            funcToCall(node, args)
            recursiveCallOnNodes(funcToCall, args, node)
        }
    } else if (ast && ast._astname && ast._astname === "BoolOp") {
        for (const key of Object.keys(ast.values)) {
            const node = ast.values[key]
            funcToCall(node, args)
            recursiveCallOnNodes(funcToCall, args, node)
        }
    } else if (ast && (ast._astname || (ast[0] && ast[0]._astname)) && Object.keys(ast)) {
        for (const key of Object.keys(ast)) {
            const node = ast[key]
            funcToCall(node, args)
            recursiveCallOnNodes(funcToCall, args, node)
        }
    } else if (ast && ast._astname && ast._astname === "Expr") {
        funcToCall(ast.value, args)
        recursiveCallOnNodes(funcToCall, args, ast.value)
    }

    if (ast && ast._astname && "test" in ast) {
        funcToCall(ast.test, args)
        recursiveCallOnNodes(funcToCall, args, ast.test)
    }

    if (ast && ast._astname && "iter" in ast) {
        funcToCall(ast.iter, args)
        recursiveCallOnNodes(funcToCall, args, ast.iter)
    }
    if (ast && ast._astname && "orelse" in ast) {
        funcToCall(ast.orelse, args)
        recursiveCallOnNodes(funcToCall, args, ast.orelse)
    }
}

function analyzeConditionalTest(testNode, tallyList) {
    tallyObjectsInConditional(testNode, tallyList)
    recursiveCallOnNodes(tallyObjectsInConditional, tallyList, testNode)
}

function tallyObjectsInConditional(node, tallyList) {
    if (!node) {
        return
    }
    if (node._astname === "Name") {
        // boolval or variable
        if ((node.id.v === "True" || node.id.v === "False") && !tallyList.includes("Bool")) {
            tallyList.push("Bool")
        } else {
            // is it a variable
            for (const variable of ccState.getProperty("allVariables")) {
                if (variable.name === node.id.v) {
                    tallyList.push("Variable")
                    break
                }
            }
        }
    } else if ((node._astname === "Compare" || node._astname === "BoolOp" || node._astname === "Call" || node._astname === "BinOp") && !tallyList.includes(node._astname)) {
        tallyList.push(node._astname)
    }

    // extra handling for mod
    if (node._astname === "BinOp") {
        if (node.op.name === "Mod" && !tallyList.includes("Mod")) {
            tallyList.push("Mod")
        }
        // console.log(node.op.name);
    }
}

// recurses through AST and calls function info function on each node
function functionPass(ast, results, rootAst) {
    recursiveCallOnNodes(collectFunctionInfo, [results, rootAst], rootAst)
    // recursiveFunctionAnalysis(ast, results, rootAst);

    // do calls
    for (const func of ccState.getProperty("userFunctionReturns")) {
        // uncalled function lines
        if (func.calls.length === 0) {
            for (let j = func.start; j <= func.end; j++) {
                ccState.getProperty("uncalledFunctionLines").push(j)
            }
        }

        // results
        if (func.calls.length === 1 && results.codeFeatures.functions.repeatExecution < 1) {
            results.codeFeatures.functions.repeatExecution = 1
        } else if (func.calls.length > 1 && results.codeFeatures.functions.repeatExecution < 2) {
            results.codeFeatures.functions.repeatExecution = 2
        }
        if (func.calls.length > 1 && func.params) {
            results.codeFeatures.functions.repeatExecution = 3
        }
        if (func.calls.length > 0 && func.returns && results.codeFeatures.functions.manipulateValue < 1) {
            results.codeFeatures.functions.manipulateValue = 1
        }
        if (func.calls.length > 1 && func.returns && results.codeFeatures.functions.manipulateValue < 2) {
            results.codeFeatures.functions.manipulateValue = 2
        }
    }

    // do uses
    for (const func of ccState.getProperty("userFunctionReturns")) {
        if (func.returns) {
            // orgline shoul dbe RETURN lineno.
            if (valueTrace(false, func.name, rootAst, [], rootAst, [], [], func.start)) {
                // do stuff
                results.codeFeatures.functions.manipulateValue = 3
            }
            if (func.aliases.length > 0) {
                for (const alias of func.aliases) {
                    if (valueTrace(false, alias, rootAst, [], rootAst, [], [], func.start)) {
                        // do stuff
                        results.codeFeatures.functions.manipulateValue = 3
                    }
                }
            }
        }
    }

    // console.log(ccState.getProperty("userFunctionReturns"));
}

// collects function info from a node
function collectFunctionInfo(node, args) {
    if (node && node._astname) {
        // get linenumber info
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }
        // does the node contain a function def?
        if (node._astname === "FunctionDef") {
            const functionObj = { name: node.name.v, returns: null, params: false, aliases: [], calls: [], start: lineNumber, end: lineNumber, returnVals: [], functionBody: node.body }

            functionObj.end = ccHelpers.getLastLine(node)

            const funcLines = ccState.getProperty("functionLines")

            for (let i = lineNumber; i <= functionObj.end; i++) {
                if (!funcLines.includes(i)) {
                    funcLines.push(i)
                }
            }

            // check for value return
            for (const item of node.body) {
                const ret = searchForReturn(item)
                if (ret) {
                    functionObj.returns = true
                    functionObj.returnVals.push(ret)
                    break
                }
            }

            // check for parameters
            if (node.args.args && node.args.args.length > 0) {
                // check for parameters that are NOT NULL
                // these...should all be Name
                for (const arg of node.args.args) {
                    if (arg._astname === "Name") {
                        const argName = arg.id.v
                        const lineDelims = [functionObj.start, functionObj.end]
                        // search for use of the value using valueTrace
                        if (valueTrace(true, argName, args[1], [], args[1], { line: 0 }, lineDelims, node.lineno)) {
                            functionObj.params = true
                        }
                    }
                }

                //
            }

            let alreadyExists = false
            for (const functionReturn of ccState.getProperty("userFunctionReturns")) {
                if (functionReturn.name === functionObj.name) {
                    alreadyExists = true
                    break
                }
            }

            if (!alreadyExists) {
                ccState.getProperty("userFunctionReturns").push(functionObj)
            }
        } else if (node._astname === "Call") {
            // or a function call?
            let calledInsideLoop = false
            const parentsList = []
            getParentList(lineNumber, ccState.getProperty("codeStructure"), parentsList)
            for (let i = parentsList.length - 1; i >= 0; i--) {
                if (parentsList[i].id === "Loop") {
                    calledInsideLoop = true
                    break
                }
            }

            // add it to function calls directory in ccstate
            let calledName = ""
            if (node.func._astname === "Name") {
                // find name
                calledName = node.func.id.v
            } else if (node.func._astname === "Attribute") {
                // console.log(node.func._astname);
                calledName = node.func.attr.v
            }

            if (calledName === "readInput") {
                args[0].codeFeatures.features.consoleInput = 1
            }

            for (const func of ccState.getProperty("userFunctionReturns")) {
                if (func.name === calledName || func.aliases.includes(calledName)) {
                    func.calls.push(lineNumber)
                    if (calledInsideLoop) {
                        // push a second time if it's in a loop
                        func.calls.push(lineNumber)
                    }

                    if (func.name === "readInput") {
                        args[0].codeFeatures.features.consoleInput = 1
                    }

                    break
                }
            }
        } else if (node._astname === "Assign" && node.targets.length === 1) {
            // function alias tracking

            if (node.value._astname === "Name") {
                const assignedName = node.targets[0].id.v
                const assignedAlias = node.value.id.v
                let assignmentExists = false
                for (const func of ccState.getProperty("userFunctionReturns")) {
                    if ((func.name === assignedAlias && !func.aliases.includes(assignedName)) || (func.aliases.includes(assignedAlias) && !func.aliases.includes(assignedName))) {
                        assignmentExists = true
                        func.aliases.push(assignedName)
                    }
                }

                let isRename = false
                // is it a built in or api func?
                isRename = (ccState.apiFunctions.includes(assignedAlias) || ccState.builtInNames.includes(assignedAlias))

                if (!assignmentExists && isRename) {
                    ccState.getProperty("userFunctionReturns").push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0 })
                }
            }
        }
    }
}

function markMakeBeat(callNode, results) {
    if (results.codeFeatures.makeBeat < 1) {
        results.codeFeatures.makeBeat = 1
    }

    // is makeBeat being used
    // beatString is either a variable or a string.
    // var's find out what it is
    const firstArg = callNode.args[0]
    if (firstArg._astname === "List") {
        results.codeFeatures.makeBeat = 2
    } else if (getTypeFromASTNode(firstArg) === "List") {
        results.codeFeatures.makeBeat = 2
        results.codeFeatures.features.indexing = 1
    }
}

function isBinopString(binOpNode) {
    if (!binOpNode || binOpNode._astname !== "BinOp") {
        return false
    }

    const leftNode = binOpNode.left
    const rightNode = binOpNode.right
    const op = binOpNode.op.name

    if (op !== "Add") {
        return false
    }

    let left = false
    let right = false

    if (leftNode._astname === "BinOp") {
        if (!isBinopString(leftNode)) {
            return false
        } else {
            left = true
        }
    } else {
        if (getTypeFromASTNode(leftNode) !== "Str") {
            return false
        } else {
            left = true
        }
    }

    if (rightNode._astname === "BinOp") {
        if (!isBinopString(rightNode)) {
            return false
        } else {
            right = true
        }
    } else {
        if (getTypeFromASTNode(rightNode) !== "Str") {
            return false
        } else {
            right = true
        }
    }

    return (left && right)
}

// recursively searches for a "return" within an ast node
function searchForReturn(astNode) {
    if (astNode._astname === "Return") {
        return astNode.value
    } else {
        if (astNode && astNode.body) {
            for (const key of Object.keys(astNode.body)) {
                const node = astNode.body[key]
                const ret = searchForReturn(node)
                if (ret) {
                    return ret
                }
            }
            return null
        } else if (astNode && (astNode[0] && Object.keys(astNode[0]))) {
            for (const key of Object.keys(astNode)) {
                const node = astNode[key]
                const ret = searchForReturn(node)
                if (ret) {
                    return ret
                }
            }
            return null
        }
    }
}

// collects variable info from a node
function collectVariableInfo(node) {
    if (node && node._astname) {
        // get linenumber info
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }

        let assignedInsideLoop = false
        let loopLine = -1
        const parentsList = []
        getParentList(lineNumber, ccState.getProperty("codeStructure"), parentsList)
        for (let i = parentsList.length - 1; i >= 0; i--) {
            if (parentsList[i].id === "Loop") {
                assignedInsideLoop = true
                loopLine = parentsList[i].startline
                break
            }
        }

        if (node._astname === "Assign" && node.targets.length === 1) {
            // does it already exist in the directory
            if ("id" in node.targets[0] && "v" in node.targets[0].id) {
                const assignedName = node.targets[0].id.v

                let varObject = { name: assignedName, assignments: [] }
                let alreadyExists = false

                for (const currentVar of ccState.getProperty("allVariables")) {
                    if (currentVar.name === assignedName) {
                        varObject = currentVar
                        alreadyExists = true
                        break
                    }
                }

                if (assignedInsideLoop) {
                    varObject.assignments.push({ line: loopLine, value: node.value })
                    varObject.assignments.push({ line: loopLine, value: node.value })
                    // we do this twice on purpose
                } else {
                    varObject.assignments.push({ line: lineNumber, value: node.value })
                }

                // function alias tracking

                if (node.value._astname === "Name") {
                    const assignedAlias = node.value.id.v
                    let assignmentExists = false
                    for (const func of ccState.getProperty("userFunctionReturns")) {
                        if ((func.name === assignedAlias && !func.aliases.includes(assignedName)) || (func.aliases.includes(assignedAlias) && !func.aliases.includes(assignedName))) {
                            assignmentExists = true
                            func.aliases.push(assignedName)
                        }
                    }

                    let isRename = false
                    // is it a built in or api func?
                    isRename = (ccState.apiFunctions.includes(assignedAlias) || ccState.builtInNames.includes(assignedAlias))

                    if (!assignmentExists && isRename) {
                        ccState.getProperty("userFunctionReturns").push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0 })
                    }
                }

                if (!alreadyExists) {
                    ccState.getProperty("allVariables").push(varObject)
                }
            }
        }

        if (node._astname === "AugAssign" && node.target._astname === "Name") {
            const assignedName = node.target.id.v

            let varObject = { name: assignedName, assignments: [] }
            let alreadyExists = false

            for (const variable of ccState.getProperty("allVariables")) {
                if (variable.name === assignedName) {
                    varObject = variable
                    alreadyExists = true
                    break
                }
            }

            if (assignedInsideLoop) {
                varObject.assignments.push({ line: loopLine, value: node.value })
                varObject.assignments.push({ line: loopLine, value: node.value })
                // we do this twice on purpose
            } else {
                varObject.assignments.push({ line: lineNumber, value: node.value })
            }

            if (!alreadyExists) {
                ccState.getProperty("allVariables").push(varObject)
            }
        }

        if (node._astname === "For") {
            // check and add the iterator
            const assignedName = node.target.id.v
            let varObject = { name: assignedName, assignments: [] }
            let alreadyExists = false

            for (const variable of ccState.getProperty("allVariables")) {
                if (variable.name === assignedName) {
                    varObject = variable
                    alreadyExists = true
                    break
                }
            }

            // this is done twice intentionally
            varObject.assignments.push({ line: lineNumber, value: node })
            varObject.assignments.push({ line: lineNumber, value: node })

            if (!alreadyExists) {
                ccState.getProperty("allVariables").push(varObject)
            }
        }

        if (node._astname === "JSFor") {
            if (node.init && node.init.targets) {
                const assignedName = node.init.targets[0].id.v
                let varObject = { name: assignedName, assignments: [] }
                let alreadyExists = false

                for (const variable of ccState.getProperty("allVariables")) {
                    if (variable.name === assignedName) {
                        varObject = variable
                        alreadyExists = true
                        break
                    }
                }

                // this is done twice intentionally
                varObject.assignments.push({ line: lineNumber, value: node })
                varObject.assignments.push({ line: lineNumber, value: node })

                if (!alreadyExists) {
                    ccState.getProperty("allVariables").push(varObject)
                }
            }
        }
    }
}

function reverseValueTrace(isVariable, name, lineNo) {
    if (isVariable) {
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNo)) {
            let latestAssignment = null

            let thisVar = null
            for (const variable of ccState.getProperty("allVariables")) {
                if (variable.name === name) {
                    thisVar = variable
                }
            }
            if (!thisVar) {
                return ""
            }

            // get most recent outside-of-function assignment (or inside-this-function assignment)
            const funcLines = ccState.getProperty("functionLines")
            const funcObjs = ccState.getProperty("userFunctionReturns")
            let highestLine = 0
            if (funcLines.includes(lineNo)) {
                // what function are we in
                let startLine = 0
                let endLine = 0
                for (const funcObj of funcObjs) {
                    if (funcObj.start < lineNo && funcObj.end >= lineNo) {
                        startLine = funcObj.start
                        endLine = funcObj.end
                        break
                    }
                }

                for (const assignment of thisVar.assignments) {
                    if (assignment.line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(assignment.line) && assignment.line > startLine && assignment.line <= endLine) {
                        // then it's valid
                        if (assignment.line > highestLine) {
                            latestAssignment = Object.assign({}, assignment)
                            highestLine = latestAssignment.line
                        }
                    }
                }

                // we can do three things with the assigned value.

                if (!latestAssignment) {
                    return ""
                }

                // if it's another variable, do a reverse value trace on IT
                if (latestAssignment.value._astname === "Name") {
                    return reverseValueTrace(true, latestAssignment.value.id.v, latestAssignment.line)
                } else if (latestAssignment.value._astname === "Call") {
                    // either a builtin, or a user func
                    // get name
                    let calledName = ""
                    if (latestAssignment.func._astname === "Name") {
                        // find name
                        calledName = latestAssignment.func.id.v
                        // is it a built-in func that returns a str or list? check that first

                        if (ccState.builtInNames.includes(calledName)) {
                            // lookup and return
                            for (const builtInReturn of ccState.builtInReturns) {
                                if (builtInReturn.name === calledName) {
                                    return builtInReturn.returns
                                }
                            }
                            return ""
                        } else {
                            // assume it's a user function.
                            for (const funcObj of funcObjs) {
                                if ((funcObj.name === calledName || funcObj.aliases.includes(calledName)) && funcObj.returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj.returnVals[0])
                                }
                            }
                        }
                    } else if (latestAssignment.func._astname === "Attribute") {
                        // console.log(node.func._astname);
                        calledName = latestAssignment.func.attr.v
                        // TODO this is probably a string or list op, so var's maybe take a look into what it's being performed on
                        // str, list,or var. if var or func return do a reverse variable search, other3wise return
                        if (latestAssignment.func.value._astname === "Str") {
                            return "Str"
                        }
                        if (latestAssignment.func.value._astname === "List") {
                            return "List"
                        }

                        if (latestAssignment.func.value._astname === "Name") {
                            return reverseValueTrace(true, latestAssignment.func.value.id.v, latestAssignment.lineno)
                        }
                        if (latestAssignment.func.value._astname === "Call") {
                            // find the function name and do a recursive call on it
                            let funcName = ""
                            if (latestAssignment.func.value.func._astname === "Attribute") {
                                funcName = latestAssignment.func.value.func.attr.v
                                return reverseValueTrace(false, funcName, latestAssignment.lineno)
                            } else if (latestAssignment.func.value.func._astname === "Name") {
                                funcName = latestAssignment.func.value.func.id.v
                                return reverseValueTrace(false, funcName, latestAssignment.lineno)
                            } else {
                                return ""
                            }
                        }
                        return ""
                    }
                } else {
                    // return the type
                    return getTypeFromASTNode(latestAssignment.value)
                }
            } else {
                // then we're OUTSIDE a function.
                // gather up all of the assignments to this point NOT in a function, and get the most recent one there
                for (const assignment of thisVar.assignments) {
                    if (assignment.line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(assignment.line) && !funcLines.includes(assignment.line)) {
                        // then it's valid
                        if (assignment.line > highestLine) {
                            latestAssignment = Object.assign({}, assignment)
                            highestLine = latestAssignment.line
                        }
                    }
                }

                if (!latestAssignment) {
                    return ""
                }

                // if it's another variable, do a reverse value trace on IT
                if (latestAssignment.value._astname === "Name") {
                    return reverseValueTrace(true, latestAssignment.value.id.v, latestAssignment.line)
                } else if (latestAssignment.value._astname === "Call") {
                    // either a builtin, or a user func
                    // get name
                    let calledName = ""
                    if (latestAssignment.value.func._astname === "Name") {
                        // find name
                        calledName = latestAssignment.value.func.id.v
                        // is it a built-in func that returns a str or list? check that first
                        if (ccState.builtInNames.includes(calledName)) {
                            // lookup and return
                            for (const builtInReturn of ccState.builtInReturns) {
                                if (builtInReturn.name === calledName) {
                                    return builtInReturn.returns
                                }
                            }
                            return ""
                        } else {
                            // assume it's a user function.
                            for (const funcObj of funcObjs) {
                                if ((funcObj.name === calledName || funcObj.aliases.includes(calledName)) && funcObj.returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj.returnVals[0])
                                }
                            }
                        }
                    } else if (latestAssignment.value.func._astname === "Attribute") {
                        // console.log(latestAssignment.value.func._astname);
                        calledName = latestAssignment.value.func.attr.v
                        // TODO this is probably a string or list op, so var's maybe take a look into what it's being performed on
                        // str, list,or var. if var or func return do a reverse variable search, other3wise return
                        if (latestAssignment.value.func.value._astname === "Str") {
                            return "Str"
                        }
                        if (latestAssignment.value.func.value._astname === "List") {
                            return "List"
                        }

                        if (latestAssignment.value.func.value._astname === "Name") {
                            return reverseValueTrace(true, latestAssignment.value.func.value.id.v, latestAssignment.value.lineno)
                        }
                        if (latestAssignment.value.func.value._astname === "Call") {
                            // find the function name and do a recursive call on it
                            let funcName = ""
                            if (latestAssignment.value.func.value.func._astname === "Attribute") {
                                funcName = latestAssignment.value.func.value.func.attr.v
                                return reverseValueTrace(false, funcName, latestAssignment.value.lineno)
                            } else if (latestAssignment.value.func.value.func._astname === "Name") {
                                funcName = latestAssignment.value.func.value.func.id.v
                                return reverseValueTrace(false, funcName, latestAssignment.value.lineno)
                            } else {
                                return ""
                            }
                        }
                        return ""
                    }
                } else {
                    // return the type
                    return getTypeFromASTNode(latestAssignment.value)
                }
            }
        }

        return ""
    } else {
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNo)) {
            // we get the return value of the function. this is mostly not super hard.
            // first - is it built in?
            if (ccState.builtInNames.includes(name)) {
                for (const builtInReturn of ccState.builtInReturns) {
                    if (builtInReturn.name === name) {
                        return builtInReturn.returns
                    }
                }
            } else {
                const userFuncs = ccState.getProperty("userFunctionReturns")
                // find it in user defined functions
                let funcObj = null
                for (const userFunc of userFuncs) {
                    if (userFunc.name === name) {
                        funcObj = userFunc
                        break
                    }
                }

                if (!funcObj || funcObj.returnVals.length === 0) {
                    return ""
                }
                // if we have a function object, find its return value
                return getTypeFromASTNode(funcObj.returnVals[0])
            }
        }
    }
    return ""
}

function getTypeFromASTNode(node) {
    const autoReturns = ["List", "Str"]
    if (autoReturns.includes(node._astname)) {
        return node._astname
    } else if (node._astname === "Num") {
        if (Object.getPrototypeOf(node.n).tp$name === "int") {
            return "Int"
        } else {
            return "Float"
        }
        // return "Num";
    } else if (node._astname === "Call") {
        // get name
        let funcName = ""
        if ("attr" in node.func) {
            funcName = node.func.attr.v
        } else if ("id" in node.func) {
            funcName = node.func.id.v
        } else {
            return ""
        }
        return reverseValueTrace(false, funcName, node.lineno)
    } else if (node._astname === "Name") {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool"
        }

        // either a function alias or var.
        const funcs = ccState.getProperty("userFunctionReturns")
        for (const func of funcs) {
            if (func.name === node.id.v || func.aliases.includes(node.id.v)) {
                return "Func"
            }
        }
        return reverseValueTrace(true, node.id.v, node.lineno)
    }
    return ""
}

function valueTrace(isVariable, name, ast, parentNodes, rootAst, lineVar, useLine = [], origLine = -1) {
    if (!ast) { return false }
    if (ast && ast.body) {
        for (const key of Object.keys(ast.body)) {
            const node = ast.body[key]
            // parent node tracing
            const newParents = parentNodes.slice(0)
            newParents.push([node, key])
            // is the node a value thingy?
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, -1, origLine) === true) {
                return true
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                return true
            }
        }
    } else if (ast && (ast._astname || (ast[0] && ast[0]._astname)) && Object.keys(ast)) {
        for (const key of Object.keys(ast)) {
            const node = ast[key]

            const newParents = parentNodes.slice(0)
            newParents.push([node, key])
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, -1, origLine) === true) {
                return true
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                return true
            }
        }
    } else if (ast && ast._astname && ast._astname === "Expr") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.value, "Expr"])
        if (findValueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, -1, origLine) === true) {
            return true
        }
        if (valueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
    }

    // nodes that need extra testing
    if (ast && ast._astname && "test" in ast) {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.test, "test"])
        if (findValueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, -1, origLine) === true) {
            return true
        }
        if (valueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
    }

    if (ast && ast._astname && "iter" in ast) {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.iter, "iter"])
        if (findValueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, -1, origLine) === true) {
            return true
        }
        if (valueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
    }

    return false
}

function findValueTrace(isVariable, name, node, parentNodes, rootAst, lineVar, useLine, origLine = -1, tracedNodes = []) { //
    if (node && node._astname) {
        // get linenumber info
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }

        if (ccState.getProperty("uncalledFunctionLines").includes(lineNumber)) {
            return false
        }

        // is it what we're looking for?
        let found = false
        // let assignedFunc = false

        if (node._astname === "Name" && isVariable) {
            // is it the RIGHT name
            if (node.id.v === name) {
                found = true
            }
        } else if (node._astname === "Name") {
            if (node.id.v === name) {
                found = true
                // assignedFunc = true
            }
        } else if (node._astname === "Call" && !isVariable) {
            // is it the function we're looking for or one of its aliases?

            if (node.func._astname === "Name") {
                const calledName = node.func.id.v
                if (calledName === name) {
                    found = true
                } else {
                    // check if it's an alias
                    for (const func of ccState.getProperty("userFunctionReturns")) {
                        if (func.aliases.includes(name)) {
                            found = true
                            break
                        }
                    }
                }
            }
        }

        // if not found, then this isn't relevant.
        if (!found) {
            return false
        }

        // if it's a subscript of a name, replace it with its parent node.
        if (parentNodes.length > 1 && parentNodes[parentNodes.length - 2][0]._astname === "Subscript") {
            // remove last item in nodeParents
            parentNodes = parentNodes.slice(0, parentNodes.length - 1)
        }
        if (parentNodes.length > 1) {
            while (parentNodes[parentNodes.length - 2][0]._astname === "BinOp" || parentNodes[parentNodes.length - 2][0]._astname === "Compare" || (parentNodes.length > 2 && parentNodes[parentNodes.length - 3][0]._astname === "BoolOp")) {
                if (parentNodes[parentNodes.length - 2][0]._astname === "BinOp" || parentNodes[parentNodes.length - 2][0]._astname === "Compare") {
                    parentNodes = parentNodes.slice(0, parentNodes.length - 1)
                } else {
                    parentNodes = parentNodes.slice(0, parentNodes.length - 2)
                }
            }
        }

        // if it's in a binop or boolop, replace it with its parent node too.

        // if we found it, what's the parent situation?
        // 1. is the parent a use?
        let isUse = false
        // let secondParent
        // if (parentNodes.length > 2) {
        //     secondParent = parentNodes[parentNodes.length - 3]
        // } else {
        //     secondParent = parentNodes[parentNodes.length - 2]
        // }
        const nodeParent = parentNodes[parentNodes.length - 2] // second-to-last item is immediate parent
        const thisNode = parentNodes[parentNodes.length - 1]
        // do uses

        // console.log(name, nodeParent, secondParent);

        // is it in a func arg
        if (nodeParent && nodeParent[1] === "args") {
            isUse = true
        } else if (thisNode[1] === "test" && nodeParent && nodeParent[0]._astname === "If") {
            isUse = true
        } else if (thisNode[1] === "iter") {
            isUse = true
        } else {
            // check parents
            for (let i = parentNodes.length - 1; i >= 0; i--) {
                if (parentNodes[i][1] === "args") {
                    isUse = true
                    break
                } else if (parentNodes[i][1] === "test") {
                    isUse = true
                    break
                } else if (parentNodes[i][1] === "iter") {
                    isUse = true
                    break
                }
            }
        }

        let isWithin = useLine.length === 0

        if (useLine.length > 0 && lineNumber >= useLine[0] && lineNumber <= useLine[1]) {
            isWithin = true
        }

        if (isUse && isWithin) {
            if (lineVar) {
                lineVar.line = lineNumber
            }
            return true
        }

        // 2. is it a reassignment?
        let isAssigned = false
        let assignedName = ""

        if (nodeParent && nodeParent[0]._astname === "Assign" && thisNode[1] === "value") {
            let assignedProper = false

            // assignedproper is based on parent node in codestructure

            const assignmentDepthAndParent = ccHelpers.locateDepthAndParent(nodeParent[0].lineno, ccState.getProperty("codeStructure"), { count: 0 })
            // find original use depth and parent, then compare.
            // useLine    is the use line number
            const useDepthAndParent = ccHelpers.locateDepthAndParent(origLine, ccState.getProperty("codeStructure"), { count: 0 })

            // [-1, {}] depth # and parent structure node.
            if (assignmentDepthAndParent[0] > useDepthAndParent[0]) {
                assignedProper = true
            } else if (assignmentDepthAndParent[0] === useDepthAndParent[0] && assignmentDepthAndParent[1].startline === useDepthAndParent[1].startline && assignmentDepthAndParent[1].endline === useDepthAndParent[1].endline) {
                assignedProper = true
            }
            if (assignedProper === true) {
                isAssigned = true
                if (nodeParent[0].targets[0]._astname === "Name") {
                    assignedName = nodeParent[0].targets[0].id.v
                }
            }
        }

        // 2a. if so, check the root ast for THAT name
        if (isAssigned === true && assignedName !== name) {
            let varBool = isVariable

            // if a function output is assigned to a variable, change isVariable to true
            if (!isVariable && thisNode[0]._astname === "Call") {
                varBool = true
            }

            console.log(nodeParent[0].lineno)
            return valueTrace(varBool, assignedName, rootAst, [], rootAst, lineVar, useLine, nodeParent[0].lineno, tracedNodes)
        }
    }
    // general catch-all if none of the above is true
    return false
}

// takes all the collected info and generates the relevant results
function doComplexityOutput(results, rootAst) {
    // do loop nesting check
    const finalLoops = ccState.getProperty("loopLocations").slice(0)
    finalLoops.sort(sortLoopValues)
    for (let i = 0; i < finalLoops.length - 1; i++) {
        for (let j = i + 1; j < finalLoops.length; j++) {
            if (finalLoops[i][0] < finalLoops[j][0] && finalLoops[i][1] >= finalLoops[j][1]) {
                // thgese loops are nested
                results.codeFeatures.iteration.nesting = 1
                break
            }
        }
    }

    // do variable scoring
    const variableList = ccState.getProperty("allVariables")
    for (const variable of variableList) {
        const lineNoObj = { line: 0 }
        if (valueTrace(true, variable.name, rootAst, [], rootAst, lineNoObj, [], variable.assignments[0].line)) {
            if (!ccState.getProperty("uncalledFunctionLines").includes(lineNoObj.line)) {
                if (results.codeFeatures.variables < 1) {
                    results.codeFeatures.variables = 1
                }
                const lineNo = lineNoObj.line
                const loopLines = ccState.getProperty("loopLocations")

                // what about multiple assignments
                if (variable.assignments.length > 0) {
                    // get line numbers of all assignments
                    const lineAssignments = []
                    for (const assignment of variable.assignments) {
                        lineAssignments.push(assignment.line)
                    }

                    let counter = 0
                    for (const assignment of lineAssignments) {
                        if (assignment < lineNo) {
                            counter += 1

                            // check loops too
                            for (const line of loopLines) {
                                if (assignment > line[0] && assignment <= line[1]) {
                                    counter += 1
                                }
                            }

                            if (counter > 1) {
                                results.codeFeatures.variables = 2
                                break
                            }
                        }
                    }
                }
            }
        }
    }

    const structure = { id: "body", children: [], startline: 0, endline: ccHelpers.getLastLine(rootAst.body) }
    for (const item of rootAst.body) {
        structure.children.push(buildStructuralRepresentation(item, structure, rootAst))
    }

    const depthObj = { depth: 0 }

    // do structural depth
    countStructuralDepth(structure, depthObj, null)

    results.depth = depthObj.depth
    results.codeStructure = structure

    if (results.depth > 3) {
        results.depth = 3
    }
}

function sortLoopValues(a, b) {
    const scoreA = a[1] - a[0]
    const scoreB = b[1] - b[0]

    return scoreB - scoreA
}

function countStructuralDepth(structureObj, depthCountObj, parentObj) {
    if (!parentObj) {
        structureObj.depth = 0
    } else {
        structureObj.depth = parentObj.depth + 1
        if (structureObj.depth > depthCountObj.depth) {
            depthCountObj.depth = structureObj.depth
        }
    }
    if (structureObj.children && structureObj.children.length > 0) {
        for (const item of structureObj.children) {
            countStructuralDepth(item, depthCountObj, structureObj)
        }
    }
}

// Analyze a single node of a Python AST.
function analyzeASTNode(node, results) {
    if (node && node._astname) {
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            ccState.setProperty("parentLineNumber", lineNumber)
        } else {
            lineNumber = ccState.getProperty("parentLineNumber")
        }
        if (!ccState.getProperty("uncalledFunctionLines").includes(lineNumber + 1)) {
            if (node._astname === "For") {
                // mark loop
                const firstLine = lineNumber
                const lastLine = ccHelpers.getLastLine(node)

                let loopRange = false
                ccState.getProperty("loopLocations").push([firstLine, lastLine])

                // is the iterator range()?
                if (node.iter._astname === "Call") {
                    // is the iter call to range()
                    if (node.iter.func._astname === "Name") {
                        const iterFuncName = node.iter.func.id.v
                        let isRange = iterFuncName === "range"

                        // check for renames (unlikely, but we should do it)
                        if (!isRange) {
                            for (const func of ccState.getProperty("userFunctionReturns")) {
                                if (func.aliases.includes(iterFuncName) && func.name === "range") {
                                    isRange = true
                                    break
                                }
                            }
                        }
                        loopRange = isRange
                        // check number of args
                        const numArgs = node.iter.args.length

                        if (results.codeFeatures.iteration.forLoopsPY < numArgs && !ccState.getProperty("isJavascript")) {
                            results.codeFeatures.iteration.forLoopsPY = numArgs
                        } else if (ccState.getProperty("isJavascript")) {
                            results.codeFeatures.iteration.forLoopsJS = 1
                        }
                    }
                }

                if (!loopRange && "iter" in node) {
                    results.codeFeatures.iteration.iterables = 1
                }
            } else if (node._astname === "JSFor") {
                // test node needs hand checking

                // mark loop
                const firstLine = lineNumber
                const lastLine = ccHelpers.getLastLine(node)
                results.codeFeatures.iteration.forLoopsJS = 1
                ccState.getProperty("loopLocations").push([firstLine, lastLine])
            } else if (node._astname === "If") {
                if (results.codeFeatures.conditionals.conditionals < 1) {
                    results.codeFeatures.conditionals.conditionals = 1
                }
                if ("orelse" in node && node.orelse.length > 0) {
                    if (results.codeFeatures.conditionals.conditionals < 2) {
                        results.codeFeatures.conditionals.conditionals = 2
                    }
                    if ("orelse" in node.orelse[0] && node.orelse[0].orelse.length > 0 && results.codeFeatures.conditionals.conditionals < 3) {
                        results.codeFeatures.conditionals.conditionals = 3
                    }

                    recursiveAnalyzeAST(node.orelse, results)
                }

                const conditionalsList = []
                analyzeConditionalTest(node.test, conditionalsList)
                for (const conditional of conditionalsList) {
                    if (!results.codeFeatures.conditionals.usedInConditionals.includes(conditional)) {
                        results.codeFeatures.conditionals.usedInConditionals.push(conditional)
                    }
                }
            } else if (node._astname === "UnaryOp") {
                recursiveAnalyzeAST(node.operand, results)
            } else if (node._astname === "Subscript") {
                results.codeFeatures.features.indexing = 1
            } else if (node._astname === "Compare") {
                results.codeFeatures.features.comparisons = 1
            } else if (node._astname === "BinOp") {
                results.codeFeatures.features.binOps = 1
                if (isBinopString(node)) {
                    results.codeFeatures.features.strOps = 1
                }
            } else if (node._astname === "While") {
                results.codeFeatures.iteration.whileLoops = 1

                // mark loop
                const firstLine = lineNumber
                const lastLine = ccHelpers.getLastLine(node)

                ccState.getProperty("loopLocations").push([firstLine, lastLine])
            } else if (node._astname === "Call") {
                let calledName = ""
                let calledOn = ""
                if (node.func._astname === "Name") {
                    // find name
                    calledName = node.func.id.v
                    if (node.args.length > 0) {
                        calledOn = ccHelpers.estimateDataType(node.args[0])
                    }
                } else if (node.func._astname === "Attribute") {
                    // console.log(node.func._astname);
                    calledName = node.func.attr.v
                    if ("value" in node.func) {
                        calledOn = ccHelpers.estimateDataType(node.func.value)
                    }
                }
                // list and strop calls
                let isListFunc = false
                const isStrFunc = false

                if (ccState.getProperty("listFuncs").includes(calledName)) {
                    if (calledOn === "List") {
                        isListFunc = true
                    }

                    if (isListFunc) {
                        results.codeFeatures.features.listOps = 1
                    }
                }
                if (ccState.getProperty("strFuncs").includes(calledName)) {
                    if (calledOn === "Str") {
                        isListFunc = true
                    }

                    if (isStrFunc) {
                        results.codeFeatures.features.strOps = 1
                    }
                }

                if ("id" in node.func) {
                    if (node.func.id.v === "makeBeat") {
                        markMakeBeat(node, results)
                    } else {
                        // double check for aliases
                        for (const func of ccState.getProperty("userFunctionReturns")) {
                            if (func.name === "makeBeat" && func.aliases.includes(node.func.id.v)) {
                                markMakeBeat(node, results)
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
    recursiveCallOnNodes(analyzeASTNode, results, ast)
    return results
}

function appendOrElses(node, orElseList) {
    if (node && "orelse" in node && node.orelse.length > 0) {
        if (node.orelse[0].body) {
            orElseList.push(node.orelse[0].body)
        } else if (!(node.orelse[0].orelse)) {
            orElseList.push(node.orelse)
        }
        if (node.orelse[0].orelse) {
            appendOrElses(node.orelse[0], orElseList)
        }
    }
}

function buildStructuralRepresentation(nodeToUse, parentNode, ast) {
    let node = nodeToUse
    if (nodeToUse._astname === "Expr") {
        node = nodeToUse.value
    }

    const returnObject = { id: "", children: [], startline: node.lineno, endline: ccHelpers.getLastLine(node), parent: parentNode }
    if (node._astname === "Call") {
        // if the parent is the definition of a function with the same name, handle the recursion. if this goes ahead recursively, the stack WILL explode.
        let isRecursive = false

        let firstParent = parentNode
        const nameObj = { name: "", start: -1, end: -1 }
        let whileCount = 0
        while ("parent" in firstParent) {
            if (firstParent.id === "FunctionDef") {
                // now we figure out the name of the function
                recursiveCallOnNodes(findFunctionDefName, [firstParent.startline, nameObj], ast)
            } else if (firstParent.id === "functionCall") {
                recursiveCallOnNodes(findFunctionCallName, [firstParent.startline, nameObj], ast)
            }
            firstParent = firstParent.parent

            if (nameObj.name !== "" && node.lineno >= nameObj.start && node.lineno <= nameObj.end) {
                isRecursive = true
                break
            }

            // emergency break so as not to interrupt user experience
            whileCount++
            if (whileCount > 100) {
                break
            }
        }

        if (isRecursive) {
            // handle
            if (node.func._astname !== "Name") {
                returnObject.id = node._astname
                return returnObject
            }
            let funcObj = null
            for (const functionObj of ccState.getProperty("userFunctionReturns")) {
                if (functionObj.name === node.func.id.v || functionObj.aliases.includes(node.func.id.v)) {
                    funcObj = functionObj
                    break
                }
            }
            if (!funcObj) {
                returnObject.id = node._astname
                return returnObject
            }
            returnObject.id = "functionCall"
            // dummy node for accurate depth count
            returnObject.children.push({ id: "functionCall", children: [], startline: node.lineno, endline: ccHelpers.getLastLine(node), parent: returnObject })
        } else {
            // find the function
            if (node.func._astname !== "Name") {
                returnObject.id = node._astname
                return returnObject
            }
            let funcObj = null
            for (const functionObj of ccState.getProperty("userFunctionReturns")) {
                if (functionObj.name === node.func.id.v || functionObj.aliases.includes(node.func.id.v)) {
                    funcObj = functionObj
                    break
                }
            }
            if (!funcObj) {
                returnObject.id = node._astname
                return returnObject
            }

            returnObject.id = "functionCall"
            if (funcObj.functionBody) {
                for (const item of funcObj.functionBody) {
                    returnObject.children.push(buildStructuralRepresentation(item, returnObject, ast))
                }
            }
        }
    } else if (node._astname === "If") {
        // returnObject.id = "If";
        const ifNode = { id: "If", children: [], startline: node.lineno, endline: ccHelpers.getLastLine(node), parent: parentNode }

        for (const item of node.body) {
            ifNode.children.push(buildStructuralRepresentation(item, ifNode, ast))
        }

        // parentNode.children.push(ifNode);

        const orElses = []

        appendOrElses(node, orElses)

        if (orElses.length > 0) {
            if (orElses[0][0].lineno - 1 > ifNode.endline) {
                ifNode.endline = orElses[0][0].lineno - 1
            } else {
                ifNode.endline = orElses[0][0].lineno
            }
            parentNode.children.push(ifNode)
        }

        for (const orElse of orElses) {
            const thisOrElse = { id: "Else", children: [] }
            for (const item of orElse) {
                thisOrElse.children.push(buildStructuralRepresentation(item, thisOrElse, ast))
            }
            parentNode.children.push(Object.assign({}, thisOrElse))
        }

        // do and return last orElse
        if (orElses.length > 0) {
            const lastOrElse = { id: "Else", children: [] }
            for (const item of orElses[orElses.length - 1]) {
                lastOrElse.children.push(buildStructuralRepresentation(item, lastOrElse, ast))
            }

            return lastOrElse
        } else {
            return ifNode
        }
    } else if (node._astname === "For" || node._astname === "JSFor" || node._astname === "While") {
        returnObject.id = "Loop"

        if (node.body) {
            for (const item of node.body) {
                returnObject.children.push(buildStructuralRepresentation(item, returnObject, ast))
            }
        }
    } else {
        returnObject.id = node._astname
        if (node.body) {
            for (const item of node.body) {
                returnObject.children.push(buildStructuralRepresentation(item, returnObject, ast))
            }
        }
    }

    return returnObject
}

function findFunctionDefName(node, args) {
    const lineNumber = args[0]
    if (node && node._astname) {
        // args[1] has property "name" which is how name val is returned
        if (node._astname === "FunctionDef" && node.lineno === lineNumber) {
            args[1].name = node.name.v
            args[1].start = node.lineno
            args[1].end = ccHelpers.getLastLine(node)
        }
    }
}

function getParentList(lineno, parentNode, parentsList) {
    // recurse through ccState.getProperty("codeStructure"), drill down to thing, return

    // first....is it a child of the parent node?
    if (parentNode.startline <= lineno && parentNode.endline >= lineno) {
        parentsList.push(Object.assign({}, parentNode))
        // then, check children.
        let childNode = null
        if (parentNode.children.length > 0) {
            for (const item of parentNode.children) {
                if (item.startline <= lineno && item.endline >= lineno) {
                    childNode = item
                    break
                }
            }
        }

        if (childNode) {
            getParentList(lineno, childNode, parentsList)
        }
    }
}

function findFunctionCallName(node, args) {
    const lineNumber = args[0]
    if (node && node._astname) {
        // args[1] has property "name" which is how name val is returned
        if (node._astname === "Call" && node.lineno === lineNumber && "id" in node.func) {
            args[1].name = node.func.id.v
            args[1].start = node.lineno
            args[1].end = ccHelpers.getLastLine(node)
        }
    }
}

// handles sequential calls to complexity passes and creation of output
export function doAnalysis(ast, results) {
    const codeStruct = { id: "body", children: [], startline: 0, endline: ccHelpers.getLastLine(ast) }
    for (const item of ast.body) {
        codeStruct.children.push(buildStructuralRepresentation(item, codeStruct, ast))
    }

    ccState.setProperty("codeStructure", codeStruct)

    functionPass(ast, results, ast)
    recursiveCallOnNodes(collectVariableInfo, [], ast)
    recursiveAnalyzeAST(ast, results)
    doComplexityOutput(results, ast)
}
