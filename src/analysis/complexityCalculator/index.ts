import { NodeVisitor } from "../../app/ast"
import { apiFunctions, builtInNames, builtInReturns, state } from "./state"
import { estimateDataType, getLastLine, locateDepthAndParent } from "./utils"

// Parsing and analyzing abstract syntax trees without compiling the script, e.g. to measure code complexity.
interface NameByReference {
    name: string,
    start: number,
    end: number,
}

export interface Node {
    lineno: number,
    col_offset: number,
    _fields: any[],
}

interface HasBodyNode extends Node{
    body: StatementNode[],
}

interface BinOpNode extends Node {
    _astname: "BinOp",
    left: ExpressionNode,
    right: ExpressionNode,
    op: opNode,
}

interface BoolOpNode extends Node {
    _astname: "BoolOp",
    op: opNode,
    values: ExpressionNode[],
}

interface UnaryOpNode extends Node {
    _astname: "UnaryOp",
    op: opNode,
    operand: ExpressionNode,
}

interface CompareNode extends Node {
    _astname: "Compare",
    left: ExpressionNode,
    comparators: ExpressionNode[],
    ops: opNode[],
}

interface ListNode extends Node {
    _astname: "List",
    elts: ExpressionNode[],
}

export interface FunctionDefNode extends HasBodyNode {
    _astname: "FunctionDef",
    args: ArgumentsNode,
    name: StrNode,
}

export interface IfNode extends HasBodyNode {
    _astname: "If",
    test: ExpressionNode,
    orelse: StatementNode[],
}

interface AttributeNode extends Node {
    _astname: "Attribute",
    value: ExpressionNode,
    attr: StrNode,
}

interface CallNode extends Node {
    _astname: "Call",
    func: NameNode | AttributeNode,
    args: ExpressionNode[],
}

interface AssignNode extends Node {
    _astname: "Assign",
    targets: ExpressionNode[],
    value: NameNode,
}

export interface AugAssignNode extends Node {
    _astname: "AugAssign",
    op: opNode,
    value: ExpressionNode,
    target: ExpressionNode,
}

export interface StrNode extends Node {
    _astname: "Str",
    v: string,
}

interface SubscriptNode extends Node {
    _astname: "Subscript",
    value: ExpressionNode,
    slice: SliceNode | IndexNode,
}

export interface ForNode extends Node {
    _astname: "For",
    body: StatementNode[],
    iter: ExpressionNode,
    target: ExpressionNode,
}

export interface JsForNode extends Node {
    _astname: "JSFor",
    body: StatementNode[],
    init?: AssignNode | AugAssignNode,
    test?: ExpressionNode,
    update?: StatementNode,
}

export interface WhileNode extends Node {
    _astname: "While",
    body: StatementNode[],
    test: ExpressionNode,
}

interface ExprNode extends Node {
    _astname: "Expr",
    value: ExpressionNode,
}

interface ArgNode extends Node {
    _astname: "Arg",
    arg: StrNode,
}

export interface ArgumentsNode extends Node {
    _astname: "Arguments",
    args: (NameNode | ArgNode)[],
}

interface NumNode extends Node {
    _astname: "Num",
    n: nNode,
}

interface nNode extends Node {
    _astname: "n",
    v: number,
}

export interface opNode extends Node {
    _astname: "op",
    name: string,
}

interface SliceNode extends Node {
    _astname: "Slice",
    lower: NumericalNode,
    upper: NumericalNode,
    step: NumericalNode,
}

interface IndexNode extends Node {
    _astname: "Index",
    value: ExpressionNode,
}

interface NameNode extends Node {
    _astname: "Name",
    id: StrNode,
}

interface ReturnNode extends Node {
    _astname: "Return",
    value: ExpressionNode,
}

export interface ModuleNode extends Node {
    _astname: "Module",
    body: StatementNode[],
}

export type AnyNode = StatementNode | ExpressionNode | BinOpNode | BoolOpNode | CompareNode | ListNode | FunctionDefNode | IfNode | AttributeNode | CallNode | AssignNode | AugAssignNode |
StrNode | SubscriptNode | ForNode | JsForNode | WhileNode | ExprNode | ArgumentsNode | NumNode | nNode | opNode | SliceNode | IndexNode | NameNode |
ReturnNode | ModuleNode | UnaryOpNode

type StatementNode = ExprNode | ReturnNode | FunctionDefNode | ForNode | JsForNode | IfNode | WhileNode | AssignNode | AugAssignNode | AttributeNode

type ExpressionNode = NumericalNode | StrNode | BoolOpNode | ListNode | CompareNode

type NumericalNode = BinOpNode | NumNode | NameNode | CallNode | SubscriptNode

interface ValueUse {
    value: string | number,
    line: number,
    column: number,
}

interface VariableInformation {
    stringsUsed: ValueUse[],
    numbersUsed: ValueUse[]
}

export interface CodeFeatures {
    errors: number,
    variables: number,
    makeBeat: number,
    whileLoops: number,
    forLoopsRange: number,
    forLoopsIterable: number,
    iterables: number,
    nesting: number,
    conditionals: number,
    usedInConditionals: number,
    repeatExecution: number,
    manipulateValue: number,
    indexing: number,
    consoleInput: number,
    listOps: number,
    strOps: number,
    binOps: number,
    comparisons: number,
}

export interface Results {
    ast: ModuleNode,
    codeFeatures: CodeFeatures,
    codeStructure: StructuralNode,
    inputsOutputs: {
        sections: { [key: string]: number },
        effects: { [key: string]: number },
        sounds: { [key: string]: number },
    },
    counts: FunctionCounts,
    depth: DepthBreadth,
    variableInformation: VariableInformation,
}

export interface FunctionCounts {
    fitMedia: number
    makeBeat: number
    setEffect: number
    setTempo: number
}

export interface DepthBreadth {
    depth: number
    breadth: number
    avgDepth: number
}

export interface StructuralNode {
    id: string,
    children: StructuralNode[],
    startline: number,
    endline: number,
    parent?: StructuralNode,
    depth?: number,
}

export interface FunctionObj {
    name: string,
    returns: boolean,
    params: boolean,
    aliases: string[],
    calls: number[],
    start: number,
    end: number,
    returnVals: ExpressionNode[],
    functionBody: StatementNode[],
    args: number,
    paramNames: string[]
}

export interface CallObj {
    line: number,
    function: string,
    clips: string[],
}

export interface VariableAssignment {
    line: number,
    value: ExpressionNode | ForNode | JsForNode,
    func?: NameNode | AttributeNode,
}

export interface VariableObj {
    name: string,
    assignments: VariableAssignment[],
    uses: ValueUse[]
}

const ArrayKeys: String[] = ["body", "args", "orelse", "comparators"]

// gets all ES API calls from a student script
export function getApiCalls() {
    return state.apiCalls
}

class TreeWalker extends NodeVisitor {
    constructor(func: Function) {
        super()
        this.funcToCall = func
    }

    funcToCall: Function

    override genericVisit(node: AnyNode) {
        this.funcToCall(node)
        super.genericVisit(node)
    }
}

// Walks AST nodes and calls a given function on all nodes.
function recursiveCallOnNodes(funcToCall: Function, ast: AnyNode | AnyNode []) {
    const finder = new TreeWalker(funcToCall)
    finder.visit(ast)
}

// Recursively notes which code concepts are used in conditionals
function analyzeConditionalTest(testNode: ExpressionNode, tallyList: string[]) {
    tallyObjectsInConditional(testNode, tallyList)
    recursiveCallOnNodes((node: ExpressionNode) => tallyObjectsInConditional(node, tallyList), testNode)
}

// Notes which code concepts are used in conditionals
function tallyObjectsInConditional(node: ExpressionNode, tallyList: string[]) {
    if (node._astname === "Name") {
        // boolval or variable
        if ((node.id.v === "True" || node.id.v === "False") && !tallyList.includes("Bool")) {
            tallyList.push("Bool")
        } else {
            // is it a variable
            for (const variable of state.allVariables) {
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
        if (typeof node.op !== "string") {
            if (node.op.name === "Mod" && !tallyList.includes("Mod")) {
                tallyList.push(node.op.name)
            }
        }
    }
}

// recurses through AST and calls function info function on each node; updates results accordingly
function functionPass(results: Results, rootAst: ModuleNode) {
    recursiveCallOnNodes((node: CallNode | StatementNode) => collectFunctionInfo(node, [results, rootAst]), rootAst)

    // do calls
    for (const func of state.userFunctions) {
        // uncalled function lines
        if (func.calls.length === 0) {
            for (let j = func.start; j <= func.end; j++) {
                state.uncalledFunctionLines.push(j)
            }
        }

        // results
        if (func.calls.length === 1 && results.codeFeatures.repeatExecution < 1) {
            results.codeFeatures.repeatExecution = 1
        } else if (func.calls.length > 1 && results.codeFeatures.repeatExecution < 2) {
            results.codeFeatures.repeatExecution = 2
        }
        if (func.calls.length > 1 && func.params) {
            results.codeFeatures.repeatExecution = 3
        }
        if (func.calls.length > 0 && func.returns && results.codeFeatures.manipulateValue < 1) {
            results.codeFeatures.manipulateValue = 1
        }
        if (func.calls.length > 1 && func.returns && results.codeFeatures.manipulateValue < 2) {
            results.codeFeatures.manipulateValue = 2
        }
    }

    // do uses
    for (const func of state.userFunctions) {
        if (func.returns) {
            // orgline should be RETURN lineno.
            if (valueTrace(false, func.name, rootAst, [], rootAst, null, [], func.start)) {
                results.codeFeatures.manipulateValue = 3
            }
            if (func.aliases.length > 0) {
                for (const alias of func.aliases) {
                    if (valueTrace(false, alias, rootAst, [], rootAst, null, [], func.start)) {
                        results.codeFeatures.manipulateValue = 3
                    }
                }
            }
        }
    }
}

// collects function info from a node
function collectFunctionInfo(node: StatementNode | CallNode, args: [Results, ModuleNode]) {
    // get linenumber info
    const lineNumber = node.lineno || state.parentLineNumber
    state.parentLineNumber = lineNumber

    // does the node contain a function def?
    if (node._astname === "FunctionDef" && node.name) {
        const functionObj: FunctionObj = {
            name: typeof node.name === "string" ? node.name : String(node.name.v),
            returns: false,
            params: false,
            aliases: [],
            calls: [],
            start: lineNumber,
            end: lineNumber,
            returnVals: [],
            functionBody: Array.isArray(node.body) ? node.body : [],
            args: 0,
            paramNames: [],
        }

        functionObj.end = getLastLine(node)

        const funcLines = state.functionLines
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
        if (!Array.isArray(node.args) && node.args.args && Array.isArray(node.args.args) && node.args.args.length > 0) {
            // check for parameters that are NOT NULL
            // these should all be Name
            functionObj.args = node.args.args.length
            for (const arg of node.args.args) {
                const argName = String(arg._astname === "Name" ? arg.id.v : arg.arg.v)
                functionObj.paramNames.push(argName)
                const lineDelims = [functionObj.start + 1, functionObj.end]
                // search for use of the value using valueTrace
                if (valueTrace(true, argName, args[1], [], args[1], { line: 0 }, lineDelims, node.lineno)) {
                    functionObj.params = true
                }
            }
        }

        let alreadyExists = false
        for (const functionReturn of state.userFunctions) {
            if (functionReturn.name === functionObj.name) {
                alreadyExists = true
                break
            }
        }

        if (!alreadyExists) {
            state.userFunctions.push(functionObj)
        }
    } else if (node._astname === "Call") {
        // or a function call?
        let calledInsideLoop = false
        const parentsList: StructuralNode[] = []
        getParentList(lineNumber, state.codeStructure, parentsList)
        for (let i = parentsList.length - 1; i >= 0; i--) {
            if (parentsList[i].id === "Loop") {
                calledInsideLoop = true
                break
            }
        }

        // add it to function calls directory in ccstate
        let calledName = ""
        if (node.func._astname === "Name") {
            calledName = String(node.func.id.v)
        } else if (node.func._astname === "Attribute") {
            calledName = String(node.func.attr.v)
        }
        if (calledName === "readInput") {
            args[0].codeFeatures.consoleInput = 1
        }
        for (const func of state.userFunctions) {
            if (func.name === calledName || func.aliases.includes(calledName)) {
                func.calls.push(lineNumber)
                if (calledInsideLoop) {
                    // push a second time if it's in a loop
                    func.calls.push(lineNumber)
                }
                if (func.name === "readInput") {
                    args[0].codeFeatures.consoleInput = 1
                }
                break
            }
        }
    } else if (node._astname === "Assign" && node.targets.length === 1) {
        // function alias tracking
        if (node.value._astname === "Name" && node.targets[0]._astname === "Name") {
            const assignedName = String(node.targets[0].id.v)
            const assignedAlias = String(node.value.id.v)
            let assignmentExists = false
            for (const func of state.userFunctions) {
                if ((func.name === assignedAlias && !func.aliases.includes(assignedName)) || (func.aliases.includes(assignedAlias) && !func.aliases.includes(assignedName))) {
                    assignmentExists = true
                    func.aliases.push(assignedName)
                }
            }

            let isRename = false
            // is it a built in or api func?
            isRename = (apiFunctions.includes(assignedAlias) || builtInNames.includes(assignedAlias))

            if (!assignmentExists && isRename) {
                state.userFunctions.push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0, returnVals: [], functionBody: [], args: 0, paramNames: [] })
            }
        }
    }
}

// handles complexity scoring for the makeBeat function
function markMakeBeat(callNode: CallNode, results: Results) {
    if (results.codeFeatures.makeBeat < 1) {
        results.codeFeatures.makeBeat = 1
    }
    if (!Array.isArray(callNode.args)) { return }
    // is makeBeat being used
    // beatString is either a variable or a string.
    const firstArg = callNode.args[0]
    if (firstArg._astname === "List") {
        results.codeFeatures.makeBeat = 2
    } else if (getTypeFromASTNode(firstArg) === "List") {
        results.codeFeatures.makeBeat = 2
        results.codeFeatures.indexing = 1
    }
}

// does this binOp node return a string?
function isBinopString(binOpNode: BinOpNode) {
    const leftNode = binOpNode.left
    const rightNode = binOpNode.right
    const op = typeof binOpNode.op === "string" ? binOpNode.op : binOpNode.op.name

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
function searchForReturn(astNode: StatementNode | StatementNode []): ExpressionNode | null {
    if (Array.isArray(astNode)) {
        for (const node of astNode) {
            const ret = searchForReturn(node)
            if (ret) { return ret }
        }
        return null
    }
    if (astNode._astname === "Return") {
        return astNode.value
    } else if (astNode._astname === "FunctionDef" || astNode._astname === "For" || astNode._astname === "JSFor" || astNode._astname === "While" || astNode._astname === "If") {
        for (const node of astNode.body) {
            const ret = searchForReturn(node)
            if (ret) {
                return ret
            }
        }
        return null
    }
    return null
}

// collects variable info from a node
function collectVariableInfo(node: StatementNode) {
    let varObject: VariableObj
    // get linenumber info
    let lineNumber = 0
    if (node.lineno) {
        lineNumber = node.lineno
        state.parentLineNumber = lineNumber
    } else {
        lineNumber = state.parentLineNumber
    }

    let assignedInsideLoop = false
    let loopLine: number | undefined = -1
    const parentsList: StructuralNode[] = []
    getParentList(lineNumber, state.codeStructure, parentsList)
    for (let i = parentsList.length - 1; i >= 0; i--) {
        if (parentsList[i].id === "Loop") {
            assignedInsideLoop = true
            if (parentsList[i].startline) {
                loopLine = parentsList[i].startline
            }
            break
        }
    }

    if (node._astname === "Assign" && node.targets.length === 1 && node.targets[0]._astname === "Name") {
        // does it already exist in the directory
        if (node.targets[0].id && node.targets[0].id.v) {
            const assignedName = String(node.targets[0].id.v)
            varObject = { name: assignedName, assignments: [], uses: [] }
            let alreadyExists = false

            for (const currentVar of state.allVariables) {
                if (currentVar.name === assignedName) {
                    varObject = currentVar
                    alreadyExists = true
                    break
                }
            }

            if (node.value) {
                if (assignedInsideLoop) {
                    varObject.assignments.push({ line: loopLine, value: node.value })
                    varObject.assignments.push({ line: loopLine, value: node.value })
                    // we do this twice on purpose
                } else {
                    varObject.assignments.push({ line: lineNumber, value: node.value })
                }
            }

            // function alias tracking
            if (node.value._astname === "Name") {
                const assignedAlias = String(node.value.id.v)
                let assignmentExists = false
                for (const func of state.userFunctions) {
                    if ((func.name === assignedAlias && !func.aliases.includes(assignedName)) || (func.aliases.includes(assignedAlias) && !func.aliases.includes(assignedName))) {
                        assignmentExists = true
                        func.aliases.push(assignedName)
                    }
                }

                let isRename = false
                // is it a built in or api func?
                isRename = (apiFunctions.includes(assignedAlias) || builtInNames.includes(assignedAlias))

                if (!assignmentExists && isRename) {
                    state.userFunctions.push({ name: assignedAlias, returns: false, params: false, aliases: [assignedName], calls: [], start: 0, end: 0, returnVals: [], functionBody: [], args: 0, paramNames: [] })
                }
            }

            if (!alreadyExists) {
                state.allVariables.push(varObject)
            }
        }
    }

    if (node._astname === "AugAssign" && node.target._astname === "Name") {
        const assignedName = String(node.target.id.v)
        varObject = { name: assignedName, assignments: [], uses: [] }
        let alreadyExists = false

        for (const variable of state.allVariables) {
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
            state.allVariables.push(varObject)
        }
    }

    if (node._astname === "For" && node.target._astname === "Name") {
        // check and add the iterator
        const assignedName = String(node.target.id.v)
        varObject = { name: assignedName, assignments: [], uses: [] }
        let alreadyExists = false

        for (const variable of state.allVariables) {
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
            state.allVariables.push(varObject)
        }
    }

    if (node._astname === "JSFor") {
        if (node.init && node.init._astname === "Assign" && node.init.targets[0]._astname === "Name") {
            const assignedName = String(node.init.targets[0].id.v)
            varObject = { name: assignedName, assignments: [], uses: [] }
            let alreadyExists = false

            for (const variable of state.allVariables) {
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
                state.allVariables.push(varObject)
            }
        }
    }
}

// attempts to determine original assignment of name or call value used on a given line
// TODO: investigate alternatives to re-tracing through the graph, such as type inference through generating a single graph.
function reverseValueTrace(isVariable: boolean, name: string, lineNo: number): string {
    if (isVariable) {
        if (!state.uncalledFunctionLines.includes(lineNo)) {
            let latestAssignment = null
            let thisVar = null
            for (const variable of state.allVariables) {
                if (variable.name === name) {
                    thisVar = variable
                }
            }
            if (!thisVar) {
                return ""
            }
            // get most recent outside-of-function assignment (or inside-this-function assignment)
            const funcLines = state.functionLines
            let highestLine = 0
            if (funcLines.includes(lineNo)) {
                // what function are we in
                let startLine = 0
                let endLine = 0
                for (const funcObj of state.userFunctions) {
                    if (funcObj.start < lineNo && funcObj.end >= lineNo) {
                        startLine = funcObj.start
                        endLine = funcObj.end
                        break
                    }
                }
                for (const assignment of thisVar.assignments) {
                    if (assignment.line < lineNo && !state.uncalledFunctionLines.includes(assignment.line) && assignment.line > startLine && assignment.line <= endLine) {
                        // then it's valid
                        if (assignment.line > highestLine) {
                            latestAssignment = Object.assign({}, assignment)
                            highestLine = latestAssignment.line
                        }
                    }
                }
                // we can do three things with the assigned value.
                if (!latestAssignment) { return "" }
                // if it's another variable, do a reverse value trace on IT
                if (latestAssignment.value._astname === "Name") {
                    return reverseValueTrace(true, latestAssignment.value.id.v, latestAssignment.line)
                } else if (latestAssignment.value._astname === "Call") {
                    // either a builtin, or a user func
                    // get name
                    let calledName = ""
                    if (latestAssignment.func && latestAssignment.func._astname === "Name") {
                        // find name
                        calledName = latestAssignment.func.id.v
                        // is it a built-in func that returns a str or list? check that first
                        if (builtInNames.includes(calledName)) {
                            // lookup and return
                            for (const builtInReturn of builtInReturns) {
                                if (builtInReturn.name === calledName) {
                                    return builtInReturn.returns
                                }
                            }
                            return ""
                        } else {
                            // assume it's a user function.
                            for (const funcObj of state.userFunctions) {
                                if ((funcObj.name === calledName || funcObj.aliases.includes(calledName)) && funcObj.returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj.returnVals[0])
                                }
                            }
                        }
                    } else if (latestAssignment.func && latestAssignment.func._astname === "Attribute") {
                        calledName = latestAssignment.func.attr.v
                        // str, list, or var. If var or func return do a reverse variable search, otherwise return.
                        if (["Str", "List"].includes(latestAssignment.func.value._astname)) {
                            return latestAssignment.func.value._astname
                        }
                        if (latestAssignment.func.value._astname === "Name") {
                            return reverseValueTrace(true, latestAssignment.func.value.id.v, latestAssignment.line)
                        }
                        if (latestAssignment.func.value._astname === "Call") {
                            // find the function name and do a recursive call on it
                            let funcName = ""
                            if (latestAssignment.func.value.func._astname === "Attribute") {
                                funcName = latestAssignment.func.value.func.attr.v
                                return reverseValueTrace(false, funcName, latestAssignment.line)
                            } else if (latestAssignment.func.value.func._astname === "Name") {
                                funcName = latestAssignment.func.value.func.id.v
                                return reverseValueTrace(false, funcName, latestAssignment.line)
                            } else {
                                return ""
                            }
                        }
                        return ""
                    }
                } else if (latestAssignment.value._astname !== "For" && latestAssignment.value._astname !== "JSFor") {
                    // return the type
                    return getTypeFromASTNode(latestAssignment.value)
                }
            } else {
                // then we're OUTSIDE a function.
                // gather up all of the assignments to this point NOT in a function, and get the most recent one there
                for (const assignment of thisVar.assignments) {
                    if (assignment.line < lineNo && !state.uncalledFunctionLines.includes(assignment.line) && !funcLines.includes(assignment.line)) {
                        // then it's valid
                        if (assignment.line > highestLine) {
                            latestAssignment = Object.assign({}, assignment)
                            highestLine = latestAssignment.line
                        }
                    }
                }
                if (!latestAssignment) { return "" }
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
                        if (builtInNames.includes(calledName)) {
                            // lookup and return
                            for (const builtInReturn of builtInReturns) {
                                if (builtInReturn.name === calledName) {
                                    return builtInReturn.returns
                                }
                            }
                            return ""
                        } else {
                            // assume it's a user function.
                            for (const funcObj of state.userFunctions) {
                                if ((funcObj.name === calledName || funcObj.aliases.includes(calledName)) && funcObj.returnVals.length > 0) {
                                    return getTypeFromASTNode(funcObj.returnVals[0])
                                }
                            }
                        }
                    } else if (latestAssignment.value.func._astname === "Attribute") {
                        calledName = latestAssignment.value.func.attr.v
                        // str, list, or var. If var or func return do a reverse variable search, otherwise return,
                        if (["Str", "List"].includes(latestAssignment.value.func.value._astname)) {
                            return latestAssignment.value.func.value._astname
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
                } else if (latestAssignment.value._astname !== "For" && latestAssignment.value._astname !== "JSFor") {
                    // return the type
                    return getTypeFromASTNode(latestAssignment.value)
                }
            }
        }
        return ""
    } else {
        if (!state.uncalledFunctionLines.includes(lineNo)) {
            // we get the return value of the function. this is mostly not super hard.
            // first - is it built in?
            if (builtInNames.includes(name)) {
                for (const builtInReturn of builtInReturns) {
                    if (builtInReturn.name === name) {
                        return builtInReturn.returns
                    }
                }
            } else {
                // find it in user defined functions
                let funcObj = null
                for (const userFunc of state.userFunctions) {
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

// attempts to determine datatype contained in an AST node
function getTypeFromASTNode(node: ExpressionNode) {
    const autoReturns = ["List", "Str"]
    if (node._astname && autoReturns.includes(node._astname)) {
        return node._astname
    } else if (node._astname === "Num") {
        if (Object.getPrototypeOf(node.n).tp$name === "int") {
            return "Int"
        } else {
            return "Float"
        }
    } else if (node._astname === "Call") {
        // get name
        let funcName = ""
        if (node.func._astname === "Attribute") {
            funcName = node.func.attr.v
        } else if (node.func.id) {
            funcName = node.func.id.v
        } else {
            return ""
        }
        return reverseValueTrace(false, funcName, node.lineno)
    } else if (node._astname === "Name" && node.id && node.lineno) {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool"
        }

        // either a function alias or var.
        for (const func of state.userFunctions) {
            if (func.name === node.id.v || func.aliases.includes(node.id.v)) {
                return "Func"
            }
        }
        return reverseValueTrace(true, String(node.id.v), node.lineno)
    }

    return ""
}

// Recursive. Given a function or variable name, find out if it's used anywhere (e.g. in a fitMedia call)
function valueTrace(isVariable: boolean,
    name: string,
    ast: AnyNode,
    parentNodes: [AnyNode, string][],
    rootAst: ModuleNode,
    lineVar: { line: number } | null,
    useLine: number[] = [],
    origLine = -1): boolean {
    if (!ast) {
        return false
    }

    if (ast._astname === "FunctionDef" || ast._astname === "If" || ast._astname === "For" || ast._astname === "JSFor" || ast._astname === "While" || ast._astname === "Module") {
        for (const key in ast.body) {
            const node = ast.body[key]
            // parent node tracing
            const newParents = parentNodes.slice(0)
            newParents.push([node, key])
            // is the node a value thingy?
            if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                return true
            }
            if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                return true
            }
        }
    } else if (ast._astname === "Expr") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.value, "Expr"])
        if (findValueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
        return valueTrace(isVariable, name, ast.value, newParents, rootAst, lineVar, useLine, origLine)
    }
    if (ast) {
        for (const [key, node] of Object.entries(ast)) {
            if (node?._astname) {
                const newParents = parentNodes.slice(0)
                newParents.push([node, key])
                if (findValueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                    return true
                }
                if (valueTrace(isVariable, name, node, newParents, rootAst, lineVar, useLine, origLine) === true) {
                    return true
                }
            } else if (Array.isArray(node) && ArrayKeys.includes(key)) {
                for (const [subkey, subnode] of Object.entries(node)) {
                    const newParents = parentNodes.slice(0)
                    newParents.push([ast, key])
                    newParents.push([subnode, subkey])
                    if (findValueTrace(isVariable, name, subnode, newParents, rootAst, lineVar, useLine, origLine) === true) {
                        return true
                    }
                    if (valueTrace(isVariable, name, subnode, newParents, rootAst, lineVar, useLine, origLine) === true) {
                        return true
                    }
                }
            }
        }
    }

    // nodes that need extra testing
    if (ast._astname === "If" || ast._astname === "While") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.test, "test"])
        if (findValueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
        if (valueTrace(isVariable, name, ast.test, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
    }

    if (ast._astname === "For") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.iter, "iter"])
        if (findValueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
        if (valueTrace(isVariable, name, ast.iter, newParents, rootAst, lineVar, useLine, origLine) === true) {
            return true
        }
    }

    return false
}

function usageCheck(
    ast: AnyNode,
    parentNodes: [AnyNode, string][],
    rootAst: ModuleNode,
    lineVar: { line: number } | null,
    useLine: number[] = [],
    resultsObj: Results) {
    if (ast._astname === "FunctionDef" || ast._astname === "If" || ast._astname === "For" || ast._astname === "JSFor" || ast._astname === "While" || ast._astname === "Module") {
        for (const key in ast.body) {
            const node = ast.body[key]
            // parent node tracing
            const newParents = parentNodes.slice(0)
            newParents.push([node, key])
            // is the node a value?
            findUsages(node, newParents, lineVar, useLine, resultsObj)
            usageCheck(node, newParents, rootAst, lineVar, useLine, resultsObj)
        }
    } else if (ast._astname === "Expr") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.value, "Expr"])
        findUsages(ast.value, newParents, lineVar, useLine, resultsObj)
        usageCheck(ast.value, newParents, rootAst, lineVar, useLine, resultsObj)
    }
    if (ast) {
        for (const [key, node] of Object.entries(ast)) {
            if (node?._astname) {
                const newParents = parentNodes.slice(0)
                newParents.push([node, key])
                findUsages(node, newParents, lineVar, useLine, resultsObj)
                usageCheck(node, newParents, rootAst, lineVar, useLine, resultsObj)
            } else if (Array.isArray(node) && ArrayKeys.includes(key)) {
                for (const [subkey, subnode] of Object.entries(node)) {
                    const newParents = parentNodes.slice(0)
                    newParents.push([ast, key])
                    newParents.push([subnode, subkey])
                    findUsages(subnode, newParents, lineVar, useLine, resultsObj)
                    usageCheck(subnode, newParents, rootAst, lineVar, useLine, resultsObj)
                }
            }
        }
    }

    // nodes that need extra testing
    if (ast._astname === "If" || ast._astname === "While") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.test, "test"])
        findUsages(ast.test, newParents, lineVar, useLine, resultsObj)
        usageCheck(ast.test, newParents, rootAst, lineVar, useLine, resultsObj)
    }

    if (ast._astname === "For") {
        const newParents = parentNodes.slice(0)
        newParents.push([ast.iter, "iter"])
        findUsages(ast.iter, newParents, lineVar, useLine, resultsObj)
        usageCheck(ast.iter, newParents, rootAst, lineVar, useLine, resultsObj)
    }
}

function findUsages(
    node: AnyNode,
    parentNodes: [AnyNode, string][],
    lineVar: { line: number } | null, _useLine: number [],
    resultsObj: Results) {
    if (node && node._astname) {
        // get linenumber info
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            state.parentLineNumber = lineNumber
        } else {
            lineNumber = state.parentLineNumber
        }

        // if it's not being used, just.  stop

        if (state.uncalledFunctionLines.includes(lineNumber)) {
            return
        }

        // is it what we're looking for?
        let found = false
        let isVar = false
        if (node._astname === "Str" || node._astname === "Num") {
            found = true
        } else if (node._astname === "Name") { // handling for sound constants
            let isVariableName = false
            for (const v of state.allVariables) {
                if (v.name === node.id.v) {
                    isVariableName = true
                    break
                }
            }
            for (const f of state.userFunctions) {
                for (const p of f.paramNames) {
                    if (p === node.id.v) {
                        isVariableName = true
                        break
                    }
                }
            }

            if (!isVariableName) {
                found = true
            } else {
                isVar = true
                found = true
            }
        }

        // if not what we are looking for (string or number), then this isn't relevant.
        if (!found) {
            return
        }

        // if it's a subscript of a name OR inside of a list, replace it with its parent node.
        if (parentNodes.length > 1 && parentNodes[parentNodes.length - 2][0]._astname === "Subscript") {
            // remove last item in nodeParents
            parentNodes = parentNodes.slice(0, parentNodes.length - 1)
        }
        if (parentNodes.length > 1 && parentNodes[parentNodes.length - 2][0]._astname === "List") {
            // remove last item in nodeParents
            parentNodes = parentNodes.slice(0, parentNodes.length - 1)
        }
        if (parentNodes.length > 1) {
            while (parentNodes.length > 1 && (parentNodes[parentNodes.length - 2][0]._astname === "BinOp" || parentNodes[parentNodes.length - 2][0]._astname === "Compare" || (parentNodes.length > 2 && parentNodes[parentNodes.length - 3][0]._astname === "BoolOp"))) {
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
        const nodeParent = parentNodes[parentNodes.length - 2] // second-to-last item is immediate parent
        const thisNode = parentNodes[parentNodes.length - 1]
        // do uses

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
                if (["args", "test", "iter"].includes(parentNodes[i][1])) {
                    isUse = true
                    break
                }
            }
        }

        if (isUse) {
            if (lineVar) {
                lineVar.line = lineNumber
            }
            if (!isVar) {
            // add to results, suppressing repetition of identical ndoes (which may get hit due to recursion)
                let alreadyExists = false
                if (node._astname === "Num") {
                    for (const numVal of resultsObj.variableInformation.numbersUsed) {
                        if (numVal.value === node.n.v && numVal.line === node.lineno && numVal.column === node.col_offset) {
                            alreadyExists = true
                            break
                        }
                    }
                    if (!alreadyExists) {
                        resultsObj.variableInformation.numbersUsed.push({ value: node.n.v, line: node.lineno, column: node.col_offset })
                    }
                } else if (node._astname === "Str") {
                    for (const numVal of resultsObj.variableInformation.stringsUsed) {
                        if (numVal.value === node.v && numVal.line === node.lineno && numVal.column === node.col_offset) {
                            alreadyExists = true
                            break
                        }
                    }
                    if (!alreadyExists) {
                        resultsObj.variableInformation.stringsUsed.push({ value: node.v, line: node.lineno, column: node.col_offset })
                    }
                } else if (node._astname === "Name") {
                    for (const numVal of resultsObj.variableInformation.stringsUsed) {
                        if (numVal.value === node.id.v && numVal.line === node.lineno && numVal.column === node.col_offset) {
                            alreadyExists = true
                            break
                        }
                    }
                    if (!alreadyExists) {
                        resultsObj.variableInformation.stringsUsed.push({ value: node.id.v, line: node.lineno, column: node.col_offset })
                    }
                }
            } else if (node._astname === "Name") {
                // add this to variable tracking
                for (const varObj of state.allVariables) {
                    if (varObj.name === node.id.v) {
                        let isDuplicate = false
                        // suppress duplicates
                        for (const use of varObj.uses) {
                            if (use.line === node.lineno && use.column === node.col_offset) {
                                isDuplicate = true
                                break
                            }
                        }
                        if (!isDuplicate) {
                            varObj.uses.push({ value: node.id.v, line: node.lineno, column: node.col_offset })
                        }
                    }
                }
            }
        }
    }
}
//  Given a function or variable name, find out if it's used in this particular node.
function findValueTrace(isVariable: boolean,
    name: string,
    node: AnyNode,
    parentNodes: [AnyNode, string][],
    rootAst: ModuleNode,
    lineVar: { line: number } | null, useLine: number [], origLine = -1) { //
    if (node && node._astname) {
        // get linenumber info
        let lineNumber = 0
        if (node.lineno) {
            lineNumber = node.lineno
            state.parentLineNumber = lineNumber
        } else {
            lineNumber = state.parentLineNumber
        }

        if (state.uncalledFunctionLines.includes(lineNumber)) {
            return false
        }

        // is it what we're looking for?
        let found = false

        if (node._astname === "Name") {
            // is it the RIGHT name
            if (node.id && node.id.v === name) {
                found = true
            }
        } else if (node._astname === "Call" && !isVariable) {
            // is it the function we're looking for or one of its aliases?
            if (node.func && node.func._astname === "Name") {
                const calledName = String(node.func.id.v)
                if (calledName === name) {
                    found = true
                } else {
                    // check if it's an alias
                    for (const func of state.userFunctions) {
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
        const nodeParent = parentNodes[parentNodes.length - 2] // second-to-last item is immediate parent
        const thisNode = parentNodes[parentNodes.length - 1]
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
                if (["args", "test", "iter"].includes(parentNodes[i][1])) {
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

        if (nodeParent[0]._astname === "Assign" && thisNode[1] === "value" && nodeParent[0].lineno) {
            let assignedProper = false
            // assignedproper is based on parent node in codestructure
            const assignmentDepthAndParent = locateDepthAndParent(nodeParent[0].lineno, state.codeStructure, { count: 0 })
            // find original use depth and parent, then compare.
            // useLine is the use line number
            const declarationDepthAndParent = locateDepthAndParent(origLine, state.codeStructure, { count: 0 })
            // [-1, {}] depth # and parent structure node.
            if (assignmentDepthAndParent[0] > declarationDepthAndParent[0]) {
                assignedProper = true
            } else if (assignmentDepthAndParent[0] === declarationDepthAndParent[0] && assignmentDepthAndParent[1].startline === declarationDepthAndParent[1].startline && assignmentDepthAndParent[1].endline === declarationDepthAndParent[1].endline) {
                assignedProper = true
            }
            if (assignedProper === true) {
                isAssigned = true
                if (nodeParent[0].targets && nodeParent[0].targets[0]._astname === "Name") {
                    assignedName = String(nodeParent[0].targets[0].id.v)
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
            return valueTrace(varBool, assignedName, rootAst, [], rootAst, lineVar, useLine, nodeParent[0].lineno)
        }
    }
    return false
}

// takes all the collected info and generates the relevant results
function doComplexityOutput(results: Results, rootAst: ModuleNode) {
    // do loop nesting check
    const finalLoops = state.loopLocations.slice(0)
    finalLoops.sort(sortLoopValues)
    for (let i = 0; i < finalLoops.length - 1; i++) {
        for (let j = i + 1; j < finalLoops.length; j++) {
            if (finalLoops[i][0] < finalLoops[j][0] && finalLoops[i][1] >= finalLoops[j][1]) {
                // these loops are nested
                results.codeFeatures.nesting = 1
                break
            }
        }
    }

    // do variable scoring
    for (const variable of state.allVariables) {
        const lineNoObj = { line: 0 }
        if (valueTrace(true, variable.name, rootAst, [], rootAst, lineNoObj, [], variable.assignments[0].line)) {
            if (!state.uncalledFunctionLines.includes(lineNoObj.line)) {
                if (results.codeFeatures.variables < 1) {
                    results.codeFeatures.variables = 1
                }
                const lineNo = lineNoObj.line
                const loopLines = state.loopLocations
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

    const structure: StructuralNode = { id: "body", children: [], startline: 0, endline: getLastLine(rootAst.body[0]) }
    for (const item of rootAst.body) {
        structure.children.push(buildStructuralRepresentation(item, structure, rootAst))
    }

    const depthObj = { depth: 0, totalDepth: 0, totalNodes: 0 }

    // do structural depth
    countStructuralDepth(structure, depthObj, null)

    results.depth.depth = depthObj.depth
    if (depthObj.totalNodes !== 0) {
        results.depth.avgDepth = depthObj.totalDepth / depthObj.totalNodes
    } else results.depth.avgDepth = 1
    results.codeStructure = structure

    if (results.depth.depth > 3) {
        results.depth.depth = 3
    }

    results.depth.breadth = 0
    for (const [feature, value] of Object.entries(results.codeFeatures)) {
        if (feature !== "errors") {
            if (value > 0) {
                results.depth.breadth += value
            }
        }
    }
}

// puts loop line arrays in order
function sortLoopValues(a: number[], b: number[]) {
    const scoreA = a[1] - a[0]
    const scoreB = b[1] - b[0]

    return scoreB - scoreA
}

// calculates depth score using simplified AST structuralNode object
function countStructuralDepth(structureObj: StructuralNode, depthCountObj: { depth: number, totalDepth: number, totalNodes: number }, parentObj: StructuralNode | null) {
    if (!parentObj) {
        structureObj.depth = 0
    } else if (typeof parentObj.depth !== "undefined" && parentObj.depth !== null) {
        structureObj.depth = parentObj.depth + 1
        depthCountObj.totalDepth += structureObj.depth
        depthCountObj.totalNodes += 1
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

// Analyze a single AST node.
function analyzeASTNode(node: AnyNode, resultInArray: Results[]) {
    const results: Results = resultInArray[0]
    let lineNumber = 0
    if (node.lineno) {
        lineNumber = node.lineno
        state.parentLineNumber = lineNumber
    } else {
        lineNumber = state.parentLineNumber
    }
    if (!state.uncalledFunctionLines.includes(lineNumber + 1)) {
        if (node._astname === "For") {
            // mark loop
            const firstLine = lineNumber
            const lastLine = getLastLine(node)

            let loopRange = false
            state.loopLocations.push([firstLine, lastLine])

            // is the iterator range()?
            if (node.iter._astname === "Call" && node.iter) {
                // is the iter call to range()
                if (node.iter.func._astname === "Name") {
                    const iterFuncName = node.iter.func.id.v
                    let isRange = iterFuncName === "range"

                    // check for renames (unlikely, but we should do it)
                    if (!isRange) {
                        for (const func of state.userFunctions) {
                            if (func.aliases.includes(iterFuncName) && func.name === "range") {
                                isRange = true
                                break
                            }
                        }
                    }
                    loopRange = isRange
                    // check number of args
                    const numArgs = Array.isArray(node.iter.args) ? node.iter.args.length : 1

                    if (results.codeFeatures.forLoopsRange < numArgs && !state.isJavascript) {
                        results.codeFeatures.forLoopsRange = numArgs
                    } else if (state.isJavascript) {
                        results.codeFeatures.forLoopsIterable = 1
                    }
                }
            }

            if (!loopRange && "iter" in node) {
                results.codeFeatures.iterables = 1
            }
        } if (node._astname === "JSFor") {
            // test node needs hand checking
            // mark loop
            const firstLine = lineNumber
            const lastLine = getLastLine(node)
            results.codeFeatures.forLoopsIterable = 1
            state.loopLocations.push([firstLine, lastLine])
        } else if (node._astname === "If") {
            if (results.codeFeatures.conditionals < 1) {
                results.codeFeatures.conditionals = 1
            }
            if (node.orelse && node.orelse.length > 0) {
                if (results.codeFeatures.conditionals < 2) {
                    results.codeFeatures.conditionals = 2
                }
                if (node.orelse[0]._astname === "If" && node.orelse[0].orelse.length > 0 && results.codeFeatures.conditionals < 3) {
                    results.codeFeatures.conditionals = 3
                }
                for (const orelse of node.orelse) {
                    recursiveAnalyzeAST(orelse, results)
                }
            }
            const conditionalsList: string[] = []
            const foundConditionals: string[] = []
            if (node.test) {
                analyzeConditionalTest(node.test, conditionalsList)
            }
            for (const conditional of conditionalsList) {
                if (!foundConditionals.includes(conditional)) {
                    results.codeFeatures.usedInConditionals += 1
                    foundConditionals.push(conditional)
                }
            }
        } else if (node._astname === "Subscript") {
            results.codeFeatures.indexing = 1
        } else if (node._astname === "Compare") {
            results.codeFeatures.comparisons = 1
        } else if (node._astname === "BinOp") {
            results.codeFeatures.binOps = 1
            if (isBinopString(node)) {
                results.codeFeatures.strOps = 1
            }
        } else if (node._astname === "While") {
            results.codeFeatures.whileLoops = 1
            // mark loop
            const firstLine = lineNumber
            const lastLine = getLastLine(node)
            state.loopLocations.push([firstLine, lastLine])
        } else if (node._astname === "Call") {
            if (node.func._astname === "Name") {
                const callObject: CallObj = { line: node.lineno, function: node.func.id.v, clips: [] }
                if (Object.keys(results.counts).includes(callObject.function)) {
                    results.counts[callObject.function as keyof FunctionCounts] += 1
                }
                if (callObject.function === "fitMedia" && node.args && Array.isArray(node.args)) {
                    const thisClip = estimateDataType(node.args[0], [], true)
                    callObject.clips = [thisClip]
                } else if (callObject.function === "makeBeat" && node.args && Array.isArray(node.args)) {
                    // is the first element a list or a sample?
                    const firstArgType = estimateDataType(node.args[0], [], false)
                    if (firstArgType === "List") {
                        // get list elts
                        callObject.clips = []
                        estimateDataType(node.args[0], [], false, callObject.clips)
                    } else if (firstArgType === "Sample") {
                        callObject.clips = [(estimateDataType(node.args[0], [], true))]
                    }
                } else {
                    callObject.clips = []
                }
                if (typeof node.func.id.v === "string" && apiFunctions.includes(node.func.id.v)) {
                    state.apiCalls.push(callObject)
                }
            }

            let calledName = ""
            let calledOn = ""
            if (node.func._astname === "Name") {
                // find name
                calledName = String(node.func.id.v)
                if (node.args && Array.isArray(node.args) && node.args.length > 0) {
                    calledOn = estimateDataType(node.args[0])
                }
            } else if (node.func._astname === "Attribute") {
                calledName = String(node.func.attr.v)
                if (node.func.value) {
                    calledOn = estimateDataType(node.func.value)
                }
            }
            // list and strop calls
            let isListFunc = false
            const isStrFunc = false

            if (state.listFuncs.includes(calledName)) {
                if (calledOn === "List") {
                    isListFunc = true
                }
                if (isListFunc) {
                    results.codeFeatures.listOps = 1
                }
            }
            if (state.strFuncs.includes(calledName)) {
                if (calledOn === "Str") {
                    isListFunc = true
                }
                if (isStrFunc) {
                    results.codeFeatures.strOps = 1
                }
            }

            if (node.func._astname === "Name") {
                if (node.func.id.v === "makeBeat") {
                    markMakeBeat(node, results)
                } else {
                    // double check for aliases
                    for (const func of state.userFunctions) {
                        if (func.name === "makeBeat" && func.aliases.includes(node.func.id.v)) {
                            markMakeBeat(node, results)
                        }
                    }
                }
            }
        }
    }
}

// Recursively analyze an abstract syntax tree.
function recursiveAnalyzeAST(ast: ModuleNode | StatementNode, results: Results) {
    recursiveCallOnNodes((node: AnyNode) => analyzeASTNode(node, [results]), ast)
    return results
}

// lists all "orelse" components for an "if" node in a single array
function appendOrElses(node: IfNode, orElseList: Node[][]) {
    if (node.orelse && node.orelse.length > 0) {
        if ("body" in node.orelse[0]) {
            orElseList.push(node.orelse[0].body)
        } else {
            orElseList.push(node.orelse)
        }
        if (node.orelse[0]._astname === "If") {
            appendOrElses(node.orelse[0], orElseList)
        }
    }
}

// Creates a simplified version of the AST (StructuralNode) that we use to calculate depth score
function buildStructuralRepresentation(nodeToUse: AnyNode, parentNode: StructuralNode, rootAst: ModuleNode) {
    let node = nodeToUse
    if (nodeToUse._astname === "Expr" && nodeToUse.value) {
        node = nodeToUse.value
    }

    const returnObject: StructuralNode = { id: "", children: [], startline: node.lineno, endline: getLastLine(node), parent: parentNode }
    if (node._astname === "Call") {
        // if the parent is the definition of a function with the same name, handle the recursion. if this goes ahead recursively, the stack WILL explode.
        let isRecursive = false
        let firstParent = parentNode
        const nameObj: NameByReference = { name: "", start: -1, end: -1 }
        let whileCount = 0
        while (firstParent.parent && firstParent.startline) {
            recursiveCallOnNodes((node: FunctionDefNode | CallNode) => findFunctionArgumentName(node, [firstParent.id, firstParent.startline, nameObj]), rootAst)
            firstParent = firstParent.parent
            if (nameObj.name !== "" && node.lineno && node.lineno >= nameObj.start && node.lineno <= nameObj.end) {
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
            for (const func of state.userFunctions) {
                if (func.name === node.func.id.v || func.aliases.includes(node.func.id.v)) {
                    funcObj = func
                    break
                }
            }
            if (!funcObj) {
                returnObject.id = node._astname
                return returnObject
            }
            returnObject.id = "FunctionCall"
            // dummy node for accurate depth count
            returnObject.children.push({ id: "FunctionCall", children: [], startline: node.lineno, endline: getLastLine(node), parent: returnObject })
        } else {
            // find the function
            if (node.func._astname !== "Name") {
                returnObject.id = node._astname
                return returnObject
            }
            let funcObj = null
            for (const func of state.userFunctions) {
                if (func.name === node.func.id.v || func.aliases.includes(node.func.id.v)) {
                    funcObj = func
                    break
                }
            }
            if (!funcObj) {
                returnObject.id = node._astname
                return returnObject
            }

            returnObject.id = "FunctionCall"
            if (funcObj.functionBody) {
                for (const item of funcObj.functionBody) {
                    returnObject.children.push(buildStructuralRepresentation(item, returnObject, rootAst))
                }
            }
        }
    } else if (node._astname === "If") {
        const ifNode: StructuralNode = { id: "If", children: [], startline: node.lineno, endline: getLastLine(node), parent: parentNode }

        for (const item of node.body) {
            ifNode.children.push(buildStructuralRepresentation(item, ifNode, rootAst))
        }

        const orElses: (ExprNode | CallNode | IfNode | ForNode | JsForNode | WhileNode)[][] = []
        appendOrElses(node, orElses)

        if (orElses.length > 0) {
            if (orElses[0][0].lineno && ifNode.endline && orElses[0][0].lineno - 1 > ifNode.endline) {
                ifNode.endline = orElses[0][0].lineno - 1
            } else {
                ifNode.endline = orElses[0][0].lineno
            }
            parentNode.children.push(ifNode)
        }

        for (const orElse of orElses) {
            const thisOrElse: StructuralNode = { id: "Else", children: [], startline: node.lineno, endline: getLastLine(node), parent: parentNode }
            for (const item of orElse) {
                thisOrElse.children.push(buildStructuralRepresentation(item, thisOrElse, rootAst))
            }
            parentNode.children.push(Object.assign({}, thisOrElse))
        }

        // do and return last orElse
        if (orElses.length > 0) {
            const lastOrElse: StructuralNode = { id: "Else", children: [], startline: node.lineno, endline: getLastLine(node), parent: parentNode }
            for (const item of orElses[orElses.length - 1]) {
                lastOrElse.children.push(buildStructuralRepresentation(item, lastOrElse, rootAst))
            }

            return lastOrElse
        } else {
            return ifNode
        }
    } else {
        if (node._astname === "For" || node._astname === "JSFor" || node._astname === "While") {
            returnObject.id = "Loop"
        } else {
            returnObject.id = node._astname
        }
        if (node._astname === "FunctionDef" || node._astname === "For" || node._astname === "JSFor" || node._astname === "While" || node._astname === "Module") {
            for (const item of node.body) {
                returnObject.children.push(buildStructuralRepresentation(item, returnObject, rootAst))
            }
        }
    }

    return returnObject
}

function findFunctionArgumentName(node: FunctionDefNode | CallNode, args: [string, string | number, NameByReference]) {
    // arg[0]: function definition or function call
    let type: string
    if (args[0] === "FunctionDef") {
        type = "FunctionDef"
    } else if (args[0] === "FunctionCall") {
        type = "Call"
    } else {
        return
    }
    // arg[1] is the line number
    const lineNumber = args[1]
    if (node && node._astname) {
        // args[2] has property "name" which is how name val is returned
        if (node._astname === type && node.lineno === lineNumber) {
            let name
            if (node._astname === "FunctionDef") {
                name = node.name
            } else if (node.func._astname === "Name") {
                name = node.func.id
            }
            args[2].name = typeof name === "string" ? name : String(name?.v)
            args[2].start = node.lineno
            args[2].end = getLastLine(node)
        }
    }
}

// find all StructuralNode parents of a given StructuralNode
function getParentList(lineno: number, parentNode: StructuralNode, parentsList: StructuralNode[]) {
    // recurse through state.codeStructure, drill down to thing, return
    // first, is it a child of the parent node?
    if (parentNode.startline <= lineno && parentNode.endline >= lineno) {
        parentsList.push(Object.assign({}, parentNode))
        // then, check children.
        let childNode
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

// handles sequential calls to complexity passes and creation of output
export function doAnalysis(ast: ModuleNode, results: Results) {
    const codeStruct: StructuralNode = { id: "body", children: [], startline: 0, endline: getLastLine(ast) }
    for (const item of ast.body) {
        codeStruct.children.push(buildStructuralRepresentation(item, codeStruct, ast))
    }
    state.codeStructure = codeStruct
    state.apiCalls = []

    functionPass(results, ast)
    recursiveCallOnNodes((node: StatementNode) => collectVariableInfo(node), ast)
    recursiveAnalyzeAST(ast, results)
    doComplexityOutput(results, ast)
    usageCheck(ast, [], ast, null, [], results)
}

// generates empty results object
export function emptyResultsObject(ast?: ModuleNode): Results {
    ast ??= { lineno: 0, col_offset: 0, _astname: "Module", body: [], _fields: [] }
    return {
        ast,
        codeFeatures: {
            errors: 0,
            variables: 0,
            makeBeat: 0,
            whileLoops: 0,
            forLoopsRange: 0,
            forLoopsIterable: 0,
            iterables: 0,
            nesting: 0,
            conditionals: 0,
            usedInConditionals: 0,
            repeatExecution: 0,
            manipulateValue: 0,
            indexing: 0,
            consoleInput: 0,
            listOps: 0,
            strOps: 0,
            binOps: 0,
            comparisons: 0,
        },
        codeStructure: Object.create(null),
        inputsOutputs: {
            sections: {},
            effects: {},
            sounds: {},
        },
        counts: {
            fitMedia: 0,
            makeBeat: 0,
            setEffect: 0,
            setTempo: 0,
        },
        depth: { depth: 0, breadth: 0, avgDepth: 0 },
        variableInformation: { stringsUsed: [], numbersUsed: [] },
    }
}
