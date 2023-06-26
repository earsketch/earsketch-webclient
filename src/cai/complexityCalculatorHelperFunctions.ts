// A library of helper functions for the CAI Code Complexity Calculator
import { state, builtInNames, builtInReturns } from "./complexityCalculatorState"
import { AnyNode, StructuralNode, VariableAssignment, VariableObj } from "./complexityCalculator"
import { selectAllNames } from "../browser/soundsState"
import store from "../reducers"
// const AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS)
// import NUMBERS_AUDIOKEYS from "../data/numbers_audiokeys"

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
        if (!source[attribute]) {
            target[attribute] = null
        } else if (Array.isArray(source[attribute])) {
            // copy array values
            target[attribute] = appendArray(source[attribute], [])
        } else if (source[attribute] || !target[attribute]) {
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
export function doAstNodesMatch(astnode1: AnyNode, astnode2: AnyNode): boolean {
    if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
        // the two nodes reference the same variable or function
        return true
    }
    if (astnode1._astname !== astnode2._astname) {
        // if they're not the same variable but they ARE the same value
        // (ex., a variable whose value is 5 and and integeere whose value is 5)
        // register this as a match
        if (astnode1._astname === "Name" || astnode2._astname === "Name") { // if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
            // TODO do varnames match
        }
        return false
    }
    // if it's a UnaryOp, we should see if the operands match
    // this isn't exact but works for our purposes
    if (astnode1._astname === "UnaryOp" && astnode2._astname === "UnaryOp") {
        return doAstNodesMatch(astnode1.operand, astnode2.operand)
    }
    // if two lists, check that the elements all match
    if (astnode1._astname === "List" && astnode2._astname === "List") {
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
    } else if (astnode1._astname === "Call" && astnode2._astname === "Call") {
        // We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        const funcNode1 = astnode1.func
        const funcNode2 = astnode2.func
        // for list ops and string ops
        if (funcNode1._astname === "Attribute") {
            if (!(funcNode2._astname === "Attribute")) {
                return false
            } else {
                if (funcNode1.attr.v !== funcNode2.attr.v) {
                    return false
                }
            }
        } else {
            // for all other function types
            if (!(funcNode2._astname === "Name")) {
                return false
            } else {
                if (funcNode1.id.v !== funcNode2.id.v) {
                    return false
                }
            }
        }
        // do the arguments match?
        if (astnode1.args.length !== astnode2.args.length) {
            return false
        }
        for (const a in astnode1.args) {
            if (!doAstNodesMatch(astnode1.args[a], astnode2.args[a])) {
                return false
            }
        }
        return true
    } else if (astnode1._astname === "Num" && astnode2._astname === "Num") {
        // numerical values must match
        return astnode1.n.v === astnode2.n.v
    } else if (astnode1._astname === "Str" && astnode2._astname === "Str") {
        // ditto for strings
        return astnode1.v === astnode2.v
    }
    return false
}

// Trims comments and leading/trailing whitespace from lines of Python and JS code.
export function trimCommentsAndWhitespace(stringToTrim: string) {
    let returnString = stringToTrim
    // strip out any trailing comments
    // python uses #
    if (!state.isJavascript && returnString.includes("#")) {
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
    if (state.isJavascript && returnString.includes("//")) {
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
export function getLastLine(functionNode: AnyNode): number {
    if (!("body" in functionNode) || functionNode.body.length === 0) {
        return functionNode.lineno
    }
    let lastLine = getLastLine(functionNode.body[functionNode.body.length - 1])
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
    for (const variable of state.allVariables) {
        if (variable.name === variableName) { return variable }
    }
    return null
}

// Find the User Function Return object by the function name. If not found, returns null.
export function getFunctionObject(funcName: string) {
    for (const functionReturn of state.userFunctionReturns) {
        if (functionReturn.name === funcName) { return functionReturn }
    }
    return null
}

// we need a function to check for AST node equivalency
export function areTwoNodesSameNode(node1: AnyNode, node2: AnyNode) {
    if (node1._astname === node2._astname && node1.lineno === node2.lineno && node1.colOffset === node2.colOffset) {
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

// generates an object representing the depth level and parent object of a structural node
export function locateDepthAndParent(lineno: number, parentNode: StructuralNode, depthCount: { count: number }): [number, any] {
    // first....is it a child of the parent node?
    if (parentNode.startline <= lineno && parentNode.endline >= lineno) {
        // then, check children.
        let isInChild = false
        let childNode = null
        if (parentNode.children.length > 0) {
            for (const item of parentNode.children) {
                if (item.startline <= lineno && item.endline >= lineno) {
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

// infers type from a given AST node
export function estimateDataType(node: AnyNode, tracedNodes: AnyNode [] = [], includeSampleName: boolean = false, includeListElements: string[] = []): string {
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
        if (builtInNames.includes(funcName)) {
            for (const builtInReturn of builtInReturns) {
                if (builtInReturn.name === funcName) {
                    return builtInReturn.returns
                }
            }
        }
        for (const existingFunction of state.userFunctionReturns) {
            if (existingFunction.name === funcName || existingFunction.aliases.includes(funcName)) {
                if (existingFunction.returns === true) {
                    let isDuplicate = false
                    if (tracedNodes.length > 0) {
                        for (const tracedNode of tracedNodes) {
                            if (areTwoNodesSameNode(existingFunction.returnVals[0], tracedNode)) {
                                isDuplicate = true
                            }
                        }
                    }
                    if (!isDuplicate) {
                        tracedNodes.push(existingFunction.returnVals[0])
                        return estimateDataType(existingFunction.returnVals[0], tracedNodes, includeSampleName, includeListElements)
                    }
                }
            }
        }
    } else if (node._astname === "Name") {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool"
        }

        // either a function alias or var OR sample name.

        if (selectAllNames(store.getState()).includes(node.id.v)) {
            if (!includeSampleName) {
                return "Sample"
            } else {
                return node.id.v
            }
        }

        for (const func of state.userFunctionReturns) {
            if (func.name === node.id.v || func.aliases.includes(node.id.v)) {
                return "Func"
            }
        }

        const lineNo: number = node.lineno

        let latestAssignment: VariableAssignment = Object.create(null)
        let thisVar: VariableObj = Object.create(null)

        const varList = state.allVariables
        for (const variable of varList) {
            if (variable.name === node.id.v) {
                thisVar = variable
            }
        }
        if (!thisVar || !thisVar.assignments) {
            return ""
        }

        // get most recent outside-of-function assignment (or inside-this-function assignment)
        let highestLine: number = 0
        for (const assignment of thisVar.assignments) {
            if (assignment.line < lineNo && !state.uncalledFunctionLines.includes(assignment.line)) {
                // check and make sure we haven't already gone through this node (prevents infinite recursion)
                let isDuplicate = false
                if (tracedNodes.length > 0) {
                    for (const tracedNode of tracedNodes) {
                        if ("value" in tracedNode && areTwoNodesSameNode(assignment.value, tracedNode.value)) {
                            isDuplicate = true
                        }
                    }
                }
                // hierarchy check
                let assignedProper = false // assignedproper is based on parent node in codestructure

                const assignmentDepthAndParent = locateDepthAndParent(assignment.line, state.codeStructure, { count: 0 })
                // find original use depth and parent, then compare.
                // useLine is the use line number
                const useDepthAndParent = locateDepthAndParent(lineNo, state.codeStructure, { count: 0 })

                // [-1, {}] depth # and parent structure node.
                if (assignmentDepthAndParent[0] < useDepthAndParent[0]) {
                    assignedProper = true
                } else if (assignmentDepthAndParent[0] === useDepthAndParent[0] && assignmentDepthAndParent[1].startline === useDepthAndParent[1].startline && assignmentDepthAndParent[1].endline === useDepthAndParent[1].endline) {
                    assignedProper = true
                }
                if (assignedProper) {
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
        if (latestAssignment) {
            tracedNodes.push(latestAssignment.value)
            return estimateDataType(latestAssignment.value, tracedNodes, includeSampleName, includeListElements)
        }
    } else if (node._astname === "BinOp") {
        // estimate both sides. if the same, return that. else return null
        const left: string = estimateDataType(node.left, tracedNodes, includeSampleName, includeListElements)
        const right: string = estimateDataType(node.right, tracedNodes, includeSampleName, includeListElements)
        return left === right ? left : ""
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
            } else if (ast[i] && "body" in ast[i]) {
                for (const p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p])
                }
            }
            replaceNumericUnaryOps(ast[i])
        }
    }
}
