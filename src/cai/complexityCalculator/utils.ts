// A library of helper functions for the CAI Code Complexity Calculator
import { AnyNode, StructuralNode, VariableAssignment, VariableObj } from "."
import { selectAllNames } from "../../browser/soundsState"
import store from "../../reducers"
import { builtInNames, builtInReturns, state } from "./state"

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

// we need a function to check for AST node equivalency
function areTwoNodesSameNode(node1: AnyNode, node2: AnyNode) {
    if (node1._astname === node2._astname && node1.lineno === node2.lineno && node1.col_offset === node2.col_offset) {
        return true
    }
    return false
}

export function numberOfLeadingSpaces(stringToCheck: string) {
    let number
    for (number = 0; number < stringToCheck.length && stringToCheck[number] === " "; number++);
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
        for (const existingFunction of state.userFunctions) {
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

        for (const func of state.userFunctions) {
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
