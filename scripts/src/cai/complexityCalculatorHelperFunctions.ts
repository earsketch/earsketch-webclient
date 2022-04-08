// A library of helper functions for the CAI Code Complexity Calculator
import * as ccState from "./complexityCalculatorState"

import NUMBERS_AUDIOKEYS_ from "../data/numbers_audiokeys.json"
const AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS_)

// Appends the values in the source array to the target list.
export function appendArray(source: any[], target: any[]) {
    for (const item of source) {
        target.push(item)
    }
    return target
}

// Copies attributes (except for boolean values set to False) from one object to another, including recursively copying all values from child objects.
// NOTE: Does NOT reset any boolean values in Target to False. This is intentional
export function copyAttributes(source: { [key: string]: any }, target: { [key: string]: any }, attributesToCopy: string[]) {
    for (const attribute of attributesToCopy) {
        // copy null values
        if (source[attribute] === null) {
            target[attribute] = null
        } else if (Array.isArray(source[attribute])) {
            // copy array values
            target[attribute] = appendArray(source[attribute], [])
        } else if (source[attribute] !== false || target[attribute] === null) {
            // copy all non-false, non-object values
            target[attribute] = source[attribute]
        } else if (typeof source[attribute] === "object") {
            // copy properties of child objects recursively
            const copiedObj = {}
            const attrsToCopy = []
            for (const at in source[attribute]) {
                attrsToCopy.push(at)
            }
            copyAttributes(source[attribute], copiedObj, attrsToCopy)
            target[attribute] = copiedObj
        }
    }
}

// Determines whether or not two AST nodes contain the same value.
export function doAstNodesMatch(astnode1: any, astnode2: any): any {
    const matchingAstName = astnode1._astname
    if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
        // the two nodes reference the same variable or function
        return true
    }
    if (astnode1._astname !== astnode2._astname) {
        // if they're not the same variable but they ARE the same value
        // (ex., a variable whose value is 5 and and integeere whose value is 5)
        // register this as a match
        if (astnode1._astname === "Name" || astnode2._astname === "Name") { // if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
            // const val1 = astnode1
            // const val2 = astnode2
            // TODO do varnames match
        }
        return false
    }
    // if it's a UnaryOp, we should see if the operands match
    // this isn't exact but works for our purposes
    if (matchingAstName === "UnaryOp") {
        return doAstNodesMatch(astnode1.operand, astnode2.operand)
    }
    // if two lists, check that the elements all match
    if (matchingAstName === "List") {
        if (astnode1.elts.length !== astnode2.elts.length) {
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
        // We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        let args1 = []
        let args2 = []
        const funcNode1 = astnode1.func
        const funcNode2 = astnode2.func
        // for list ops and string ops
        if ("attr" in funcNode1) {
            if (!("attr" in funcNode2)) {
                return false
            } else {
                if (funcNode1.attr.v !== funcNode2.attr.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        } else if ("id" in funcNode1) {
            // for all other function types
            if (!("id" in funcNode2)) {
                return false
            } else {
                if (funcNode1.id.v !== funcNode2.id.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        }
        // do the arguments match?
        if (args1.length !== args2.length) {
            return false
        }
        for (let a = 0; a < args1.length; a++) {
            if (!doAstNodesMatch(args1[a], args2[a])) {
                return false
            }
        }
        return true
    } else if (matchingAstName === "Num") {
        // numerical values must match
        return astnode1.n.v === astnode2.n.v
    } else if (matchingAstName === "Str") {
        // ditto for strings
        return astnode1.s.v === astnode2.s.v
    }
}

// Handles the addition of information about conditional lines to  ccState.getProperty("allConditionals")()
export function notateConditional(node: any) {
    const lastLine = getLastLine(node)
    // fills in a list of lines where else statements for this conditional occur
    function addElse(node: any, elseLineList: number[]) {
        if (node.orelse !== null && node.orelse.length > 0) {
            elseLineList.push(node.orelse[0].lineno)
            addElse(node.orelse[0], elseLineList)
        }
    }
    // determines if the conditional in question is inside another conditional
    function findParent(startLine: number, endLine: number, nodeList: any[]): any {
        let parentNode = null
        for (const i in nodeList) {
            if (nodeList[i].children.length > 0) {
                parentNode = findParent(startLine, endLine, nodeList[i].children)
            }
            if (parentNode === null) {
                if (nodeList[i].start < startLine && nodeList[i].end >= endLine) {
                    parentNode = nodeList[i]
                    break
                }
            }
        }
        return parentNode
    }
    // pushes this conditional's object to its parent's list of children
    function pushParent(child: any, parentStart: number, parentEnd: number, nodeList: any[]) {
        for (const i in nodeList) {
            if (nodeList[i].start === parentStart && nodeList[i].end === parentEnd) {
                nodeList[i].children.push(child)
            } else if (nodeList[i].start <= parentStart && nodeList[i].end >= parentEnd) {
                pushParent(child, parentStart, parentEnd, nodeList[i].children)
                break
            }
        }
    }
    // Have we already marked this exact conditional before?
    function doesAlreadyExist(start: number, end: number, nodeList: any[]) {
        for (const i in nodeList) {
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
    // get all orelse locations
    const elseLines: any[] = []
    addElse(node, elseLines)
    elseLines.push(lastLine)
    const newObjects = [{ start: node.lineno, end: elseLines[0], children: [] }]
    for (let i = 1; i < elseLines.length; i++) {
        newObjects.push({ start: elseLines[i], end: elseLines[i + 1], children: [] })
    }
    // is this a child node?
    const isChild = findParent(node.lineno, lastLine, ccState.getProperty("allConditionals"))
    // go through, replacing isChild with the object its a child of if found
    if (isChild !== null) {
        for (const i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                pushParent(newObjects[i], isChild.start, isChild.end, ccState.getProperty("allConditionals"))
            }
        }
    } else {
        for (const i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                ccState.getProperty("allConditionals").push(newObjects[i])
            }
        }
    }
}

// Trims comments and leading/trailing whitespace from lines of Python and JS code.
export function trimCommentsAndWhitespace(stringToTrim: string) {
    let returnString = stringToTrim
    // strip out any trailing comments
    // python uses #
    if (!ccState.getProperty("isJavascript") && returnString.includes("#")) {
        let singleQuotes = 0
        let doubleQuotes = 0
        let commentIndex = -1
        for (let s = 0; s < returnString.length; s++) {
            // we use the number of single and double quotes (odd versus even) to determine whether any # or // is actually part of a string and NOT a comment.
            if (returnString[s] === "'") {
                singleQuotes++
            }
            if (returnString[s] === '"') {
                doubleQuotes++
            }
            if (returnString[s] === "#") {
                // we have a #. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex !== -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    // Javascript uses //
    if (ccState.getProperty("isJavascript") && returnString.includes("//")) {
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
                // we have a double slash. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex !== -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    returnString = returnString.trim() // then any leading/trailing spaces
    return returnString
}

// Gets the last line in a multiline block of code.
export function getLastLine(functionNode: any) {
    if (!("body" in functionNode) || functionNode.body.length === 0) {
        return functionNode.lineno
    }
    let lastLine: any = getLastLine(functionNode.body[functionNode.body.length - 1])
    if ("orelse" in functionNode && functionNode.orelse.length > 0) {
        const orElseLast = getLastLine(functionNode.orelse[functionNode.orelse.length - 1])
        if (orElseLast > lastLine) {
            lastLine = orElseLast
        }
    }
    return lastLine
}

// Finds Variable object given the variable name. If not found, returns null.
export function getVariableObject(variableName: string) {
    for (const variable of ccState.getProperty("allVariables").length) {
        if (variable.name === variableName) { return variable }
    }
    return null
}

// Find the User Function Return object by the function name. If not found, returns null.
export function getFunctionObject(funcName: string) {
    for (const functionReturn of ccState.getProperty("userFunctionReturns")) {
        if (functionReturn.name === funcName) { return functionReturn }
    }
    return null
}

export function areTwoNodesSameNode(node1: any, node2: any) {
    if (node1._astname === node2._astname && node1.lineno === node2.lineno && node1.col_offset === node2.col_offset) {
        return true
    } else return false
}

export function numberOfLeadingSpaces(stringToCheck: string) {
    let number = 0

    for (const char of stringToCheck) {
        if (char !== " ") {
            break
        } else {
            number += 1
        }
    }

    return number
}

export function locateDepthAndParent(lineno: number, parentNode: any, depthCount: any): [number, any] {
    // first....is it a child of the parent node?
    if (parentNode.startline <= lineno && parentNode.endline >= lineno) {
        // then, check children.
        let isInChild = false
        let childNode = null
        if (parentNode.children.length > 0) {
            for (const item of parentNode.children) {
                if (item.startline <= lineno && item.endline >= lineno) { //  && item.startline !== item.endline
                    isInChild = true
                    childNode = item
                    break
                }
            }
        }

        if (!isInChild) {
            if (!parentNode.parent) {
                return [depthCount.count, parentNode]
            } else {
                return [depthCount.count, parentNode.parent]
            }
        } else if (childNode != null) {
            depthCount.count += 1
            return locateDepthAndParent(lineno, childNode, depthCount)
        } else {
            depthCount.count += 1
        }
    }

    return [-1, {}]
}

export function estimateDataType(node: any, tracedNodes: any = [], includeSampleName: boolean = false, includeListElements: string[] = []): string {
    const sampleBool = includeSampleName
    const autoReturns: string[] = ["List", "Str"]
    if (node._astname === "List" && node.elts && Array.isArray(node.elts)) {
        for (const n of node.elts) {
            includeListElements.push(estimateDataType(n, tracedNodes, true, includeListElements))
        }
    }
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
        let funcName: string = ""
        if ("attr" in node.func) {
            funcName = node.func.attr.v
        } else if ("id" in node.func) {
            funcName = node.func.id.v
        } else {
            return ""
        }
        // look up the function name
        // builtins first
        if (ccState.builtInNames.includes(funcName)) {
            for (const builtInReturn of ccState.builtInReturns) {
                if (builtInReturn.name === funcName) {
                    return builtInReturn.returns
                }
            }
        }
        const existingFunctions: any = ccState.getProperty("userFunctionReturns")
        for (const existingFunction of existingFunctions) {
            if (existingFunction.name === funcName || existingFunction.aliases.includes(funcName)) {
                if (existingFunction.returns === true) {
                    let isDuplicate = false
                    if (tracedNodes.length > 0) {
                        for (const tracedNode in tracedNodes) {
                            if (areTwoNodesSameNode(existingFunction.returnVals[0], tracedNode)) {
                                isDuplicate = true
                            }
                        }
                    }
                    if (!isDuplicate) {
                        tracedNodes.push(existingFunction.returnVals[0])
                        return estimateDataType(existingFunction.returnVals[0], tracedNodes, sampleBool, includeListElements)
                    }
                }
            }
        }
    } else if (node._astname === "Name") {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool"
        }

        // either a function alias or var OR sample name.

        if (AUDIOKEYS.includes(node.id.v)) {
            if (!includeSampleName) {
                return "Sample"
            } else {
                return node.id.v
            }
        }

        const funcs: any = ccState.getProperty("userFunctions")

        for (const func of funcs) {
            if (func.name === node.id.v || func.aliases.includes(node.id.v)) {
                return "Func"
            }
        }

        const lineNo: number = node.lineno

        let latestAssignment: any = null

        let thisVar: any = null
        const varList: any = ccState.getProperty("allVariables")
        for (const variable of varList) {
            if (variable.name === node.id.v) {
                thisVar = variable
            }
        }
        if (thisVar === null) {
            return ""
        }

        // get most recent outside-of-function assignment (or inside-this-function assignment)
        // const funcLines: number[] = ccState.getProperty("functionLines")
        // const funcObjs: any = ccState.getProperty("userFunctionReturns")
        let highestLine: number = 0
        for (const assignment of thisVar.assignments) {
            if (assignment.line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(assignment.line)) {
                // check and make sure we haven't already gone through this node (prevents infinite recursion)
                let isDuplicate = false
                if (tracedNodes.length > 0) {
                    for (const tracedNode of tracedNodes) {
                        if (areTwoNodesSameNode(assignment.value, tracedNode.value)) {
                            isDuplicate = true
                        }
                    }
                }
                // hierarchy check
                let assignedProper = false

                // assignedproper is based on parent node in codestructure

                const assignmentDepthAndParent = locateDepthAndParent(assignment.line, ccState.getProperty("codeStructure"), { count: 0 })
                // find original use depth and parent, then compare.
                // useLine    is the use line number
                const useDepthAndParent = locateDepthAndParent(lineNo, ccState.getProperty("codeStructure"), { count: 0 })

                // [-1, {}] depth # and parent structure node.
                if (assignmentDepthAndParent[0] < useDepthAndParent[0]) {
                    assignedProper = true
                } else if (assignmentDepthAndParent[0] === useDepthAndParent[0] && assignmentDepthAndParent[1].startline === useDepthAndParent[1].startline && assignmentDepthAndParent[1].endline === useDepthAndParent[1].endline) {
                    assignedProper = true
                }
                if (assignedProper === true) {
                    if (!isDuplicate) {
                        // then it's valid

                        if (assignment.line > highestLine) {
                            latestAssignment = Object.assign({}, assignment)
                            highestLine = latestAssignment.line
                        }
                    }
                }
            }
        }

        // get type from assigned node
        if (latestAssignment != null) {
            tracedNodes.push(latestAssignment)
            return estimateDataType(latestAssignment.value, tracedNodes, sampleBool, includeListElements)
        }
    } else if (node._astname === "BinOp") {
        // estimate both sides. if the same, return that. else return null
        const left: string | null = estimateDataType(node.left, tracedNodes, sampleBool, includeListElements)
        const right: string | null = estimateDataType(node.right, tracedNodes, sampleBool, includeListElements)
        if (left === right) {
            return left
        } else return ""
    } else if (node._astname === "BoolOp" || node._astname === "Compare") {
        return "Bool"
    }

    return ""
}

// Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
export function replaceNumericUnaryOps(ast: any) {
    for (const i in ast) {
        if (ast[i] && ast[i]._astname) {
            if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) {
                ast[i] = ast[i].operand
            } else if (ast[i] !== null && "body" in ast[i]) {
                for (const p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p])
                }
            }
            replaceNumericUnaryOps(ast[i])
        }
    }
}

export function lineDict() {
    function fillLevels(nodeList: any[], levelList: any[]) {
        const childNodes = []
        const thisLevel = []
        for (const i in nodeList) {
            if (nodeList[i].children.length > 0) {
                for (const j in nodeList[i].children) {
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
    const lineDictionary = []
    // initialize array values
    for (const i in ccState.getProperty("studentCode")) {
        const variables: any[] = []
        const calls: any[] = []
        const ifElse: any[] = []
        const userFunction: any[] = []
        lineDictionary.push({
            line: Number(i) + 1,
            variables: variables,
            loop: 0,
            calls: calls,
            ifElse: ifElse,
            userFunction: userFunction,
            loopStart: 0,
        })
    }
    // note every time the user defines a function
    for (const u in ccState.getProperty("userFunctionReturns")) {
        if (ccState.getProperty("userFunctionReturns")[u].startLine !== null) {
            const index = ccState.getProperty("userFunctionReturns")[u].start - 1
            lineDictionary[index].userFunction = ccState.getProperty("userFunctionReturns")[u]
            let i = index + 1
            while (i < ccState.getProperty("userFunctionReturns")[u].end) {
                lineDictionary[i].userFunction = ccState.getProperty("userFunctionReturns")[u]
                i++
            }
        }
    }
    // note every time a variable is assigned or modified
    for (const v in ccState.getProperty("variableAssignments")) {
        const index = ccState.getProperty("variableAssignments")[v].line - 1
        const variableVal = getVariableObject(ccState.getProperty("variableAssignments")[v].name)
        if (lineDictionary[index] !== null) {
            lineDictionary[index].variables.push(variableVal)
        }
    }
    for (const loop in ccState.getProperty("loopLocations")) {
        // track the begin points of each loop
        const index = ccState.getProperty("loopLocations")[loop][0] - 1
        lineDictionary[index].loopStart = ccState.getProperty("loopLocations")[loop]
        // note which lines are in one or more loops
        for (let loopLine = ccState.getProperty("loopLocations")[loop][0] - 1; loopLine <= ccState.getProperty("loopLocations")[loop][1] - 1; loopLine++) {
            if (lineDictionary[loopLine] !== null) {
                lineDictionary[loopLine].loop += 1
            }
        }
    }
    for (const call in ccState.getProperty("allCalls")) {
        const index = ccState.getProperty("allCalls")[call].line - 1
        if (lineDictionary[index] !== null) {
            lineDictionary[index].calls.push(ccState.getProperty("allCalls")[call])
        }
    }
    // nested if else statements
    const levels: any[] = []
    fillLevels(ccState.getProperty("allConditionals"), levels)
    // remove overlap in levels
    for (const i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            if (j !== levels[i].length - 1) {
                // if it's not the last one, subtract 1 from the end value
                levels[i][j][1] = levels[i][j][1] - 1
            }
        }
    }
    for (const i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            const string = j === 0 ? "if" : "else"
            const start = levels[i][j][0]
            const end = levels[i][j][1]
            for (let p = start; p <= end; p++) {
                lineDictionary[p - 1].ifElse.push(string)
            }
        }
    }
    return lineDictionary
}
