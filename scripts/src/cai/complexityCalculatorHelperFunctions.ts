// A library of helper functions for the CAI Code Complexity Calculator
import * as ccState from './complexityCalculatorState';

// Appends the values in the source array to the target list.
export function appendArray(source: any[], target: any[]) {
    for (let p = 0; p < source.length; p++) {
        target.push(source[p])
    }
    return target
}

// Copies attributes (except for boolean values set to False) from one object to another, including recursively copying all values from child objects.
// NOTE: Does NOT reset any boolean values in Target to False. This is intentional
export function copyAttributes(source: { [key: string]: any }, target: { [key: string]: any }, attributesToCopy: string[]) {
    for (let attr = 0; attr < attributesToCopy.length; attr++) {
        //copy null values
        if (source[attributesToCopy[attr]] == null) {
            target[attributesToCopy[attr]] = null
        } else if (Array.isArray(source[attributesToCopy[attr]])) {
            //copy array values
            target[attributesToCopy[attr]] = appendArray(source[attributesToCopy[attr]], [])
        } else if (source[attributesToCopy[attr]] !== false || target[attributesToCopy[attr]] == null) {
            //copy all non-false, non-object values
            target[attributesToCopy[attr]] = source[attributesToCopy[attr]]
        } else if (typeof source[attributesToCopy[attr]] === "object") {
            //copy properties of child objects recursively
            let copiedObj = {}
            let attrsToCopy = []
            for (let at in source[attributesToCopy[attr]]) {
                attrsToCopy.push(at)
            }
            copyAttributes(source[attributesToCopy[attr]], copiedObj, attrsToCopy)
            target[attributesToCopy[attr]] = copiedObj
        }
    }
}



// Determines whether or not two AST nodes contain the same value.
export function doAstNodesMatch(astnode1: any, astnode2: any) : any {
    const matchingAstName = astnode1._astname;
    if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
        //the two nodes reference the same variable or function
        return true
    }
    if (astnode1._astname != astnode2._astname) {
        //if they're not the same variable but they ARE the same value
        //(ex., a variable whose value is 5 and and integeere whose value is 5)
        //register this as a match
        if (astnode1._astname === "Name" || astnode2._astname === "Name") {  //if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
            let val1 = astnode1
            let val2 = astnode2
            //TODO do varnames match
        }
        return false
    }
    //if it's a UnaryOp, we should see if the operands match
    //this isn't exact but works for our purposes
    if (matchingAstName === "UnaryOp") {
        return doAstNodesMatch(astnode1.operand, astnode2.operand)
    }
    //if two lists, check that the elements all match
    if (matchingAstName === "List") {
        if (astnode1.elts.length != astnode2.elts.length) {
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
        //We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        let args1 = []
        let args2 = []
        const funcNode1 = astnode1.func
        const funcNode2 = astnode2.func
        //for list ops and string ops
        if ('attr' in funcNode1) {
            if (!('attr' in funcNode2)) {
                return false
            } else {
                if (funcNode1.attr.v != funcNode2.attr.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        } else if ('id' in funcNode1) {
            //for all other function types
            if (!('id' in funcNode2)) {
                return false
            } else {
                if (funcNode1.id.v != funcNode2.id.v) {
                    return false
                }
                args1 = funcNode1.args
                args2 = funcNode2.args
            }
        }
        //do the arguments match?
        if (args1.length != args2.length) {
            return false
        }
        for (let a = 0; a < args1.length; a++) {
            if (!doAstNodesMatch(args1[a], args2[a])) {
                return false
            }
        }
        return true;
    } else if (matchingAstName === "Num") {
        //numerical values must match
        return astnode1.n.v === astnode2.n.v
    } else if (matchingAstName === "Str") {
        //ditto for strings
        return astnode1.s.v === astnode2.s.v
    }
}


// Handles the addition of information about conditional lines to  ccState.getProperty("allConditionals")()
export function notateConditional(node: any) {
    let lastLine = getLastLine(node)
    //fills in a list of lines where else statements for this conditional occur
    function addElse(node: any, elseLineList: number[]) {
        if (node.orelse != null && node.orelse.length > 0) {
            elseLineList.push(node.orelse[0].lineno)
            addElse(node.orelse[0], elseLineList)
        }
    }
    //determines if the conditional in question is inside another conditional
    function findParent(startLine: number, endLine: number, nodeList: any[]) : any {
        let parentNode = null
        for (let i in nodeList) {
            if (nodeList[i].children.length > 0) {
                parentNode = findParent(startLine, endLine, nodeList[i].children)
            }
            if (parentNode == null) {
                if (nodeList[i].start < startLine && nodeList[i].end >= endLine) {
                    parentNode = nodeList[i]
                    break
                }
            }
        }
        return parentNode
    }
    //pushes this conditional's object to its parent's list of children
    function pushParent(child: any, parentStart: number, parentEnd: number, nodeList: any[]) {
        for (let i in nodeList) {
            if (nodeList[i].start === parentStart && nodeList[i].end === parentEnd) {
                nodeList[i].children.push(child);
            } else if (nodeList[i].start <= parentStart && nodeList[i].end >= parentEnd) {
                pushParent(child, parentStart, parentEnd, nodeList[i].children)
                break
            }
        }
    }
    //Have we already marked this exact conditional before?
    function doesAlreadyExist(start: number, end: number, nodeList: any[]) {
        for (let i in nodeList) {
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
    //get all orelse locations
    let elseLines : any[] = []
    addElse(node, elseLines)
    elseLines.push(lastLine)
    let newObjects = [{ start: node.lineno, end: elseLines[0], children: [] }]
    for (let i = 1; i < elseLines.length; i++) {
        newObjects.push({ start: elseLines[i], end: elseLines[i + 1], children: [] })
    }
    //is this a child node?
    const isChild = findParent(node.lineno, lastLine, ccState.getProperty("allConditionals"))
    //go through, replacing isChild with the object its a child of if found
    if (isChild != null) {
        for (let i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                pushParent(newObjects[i], isChild.start, isChild.end, ccState.getProperty("allConditionals"))
            }
        }
    } else {
        for (let i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                ccState.getProperty("allConditionals").push(newObjects[i])
            }
        }
    }
}




// Trims comments and leading/trailing whitespace from lines of Python and JS code.
export function trimCommentsAndWhitespace(stringToTrim: string) {
    let returnString = stringToTrim
    //strip out any trailing comments
    //python uses #
    if (!ccState.getProperty('isJavascript') && returnString.includes('#')) {
        let singleQuotes = 0
        let doubleQuotes = 0
        let commentIndex = -1
        for (let s = 0; s < returnString.length; s++) {
            //we use the number of single and double quotes (odd versus even) to determine whether any # or // is actually part of a string and NOT a comment.
            if (returnString[s] === "'") {
                singleQuotes++
            }
            if (returnString[s] === '"') {
                doubleQuotes++
            }
            if (returnString[s] === "#") {
                //we have a #. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    //Javascript uses //
    if (ccState.getProperty('isJavascript') && returnString.includes('//')) {
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
                //we have a double slash. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s
                    break
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex)
        }
    }
    returnString = returnString.trim()  //then any leading/trailing spaces
    return returnString
}

// Gets the last line in a multiline block of code.
export function getLastLine(functionNode: any) {
    if (!('body' in functionNode) || functionNode.body.length === 0) {
        return functionNode.lineno
    }
    let lastLine : any = getLastLine(functionNode.body[functionNode.body.length - 1])
    if ('orelse' in functionNode && functionNode.orelse.length > 0) {
        const orElseLast = getLastLine(functionNode.orelse[functionNode.orelse.length - 1])
        if (orElseLast > lastLine) {
            lastLine = orElseLast
        }
    }
    return lastLine
}

// Finds Variable object given the variable name. If not found, returns null.
export function getVariableObject(variableName: string) {
    for (let r = 0; r < ccState.getProperty("allVariables").length; r++) {
        if (ccState.getProperty("allVariables")[r].name === variableName) { return ccState.getProperty("allVariables")[r] }
    }
    return null
}

// Find the User Function Return object by the function name. If not found, returns null.
export function getFunctionObject(funcName: string) {
    for (let u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (ccState.getProperty('userFunctionReturns')[u].name === funcName) { return ccState.getProperty('userFunctionReturns')[u] }
    }
    return null
}

export function numberOfLeadingSpaces(stringToCheck: string) {
    let number = 0

    for (let i = 0; i < stringToCheck.length; i++) {
        if (stringToCheck[i] !== " ") {
            break
        } else {
            number += 1
        }
    }

    return number
}

export function estimateDataType(node:any) {
    let autoReturns: string[] = ["List", "Str"];
    if (autoReturns.includes(node._astname)) {
        return node._astname
    }
    else if (node._astname == "Num") {

        if (Object.getPrototypeOf(node.n)["tp$name"] == "int") {
            return "Int"
        }
        else {
            return "Float"
        }
        //return "Num";
    }
    else if (node._astname == "Call") {
        //get name
        let funcName: string = "";
        if ("attr" in node.func) {
            funcName = node.func.attr.v
        }
        else if ("id" in node.func) {
            funcName = node.func.id.v
        }
        else {
            return null;
        }
        //look up the function name
        //builtins first
        if (ccState.builtInNames.includes(funcName)) {
            for (let i = 0; i < ccState.builtInReturns.length; i++) {
                if (ccState.builtInReturns[i].name == funcName) {
                    return ccState.builtInReturns[i].returns
                }
            }
        }
        let existingFunctions: any = ccState.getProperty("userFunctions");
        for (let i = 0; i < existingFunctions.length; i++) {
            if (existingFunctions[i].name == funcName || existingFunctions[i].aliases.includes(funcName)) {
                if (existingFunctions[i].returns == true) {
                    return estimateDataType(existingFunctions[i].returnVals[0])
                }
            }
        }
    }
    else if (node._astname == "Name") {
        if (node.id.v === "True" || node.id.v === "False") {
            return "Bool"
        }

        //either a function alias or var.
        let funcs: any = ccState.getProperty("userFunctions")
        for (let i = 0; i < funcs.length; i++) {
            if (funcs[i].name == node.id.v || funcs[i].aliases.includes(node.id.v)) {
                return "Func"
            }
        }

        let allVars: any = ccState.getProperty("allVariables");
        var lineNo: number = node.lineno

        let latestAssignment: any = null

        let thisVar: any = null
        let varList: any = ccState.getProperty("allVariables");
        for (let i = 0; i < varList.length; i++) {
            if (varList[i].name == name) {
                thisVar = varList[i]
            }
        }
        if (thisVar == null) {
            return null
        }

        //get most recent outside-of-function assignment (or inside-this-function assignment)
        let funcLines: number[] = ccState.getProperty("functionLines")
        let funcObjs: any = ccState.getProperty("userFunctions")
        let highestLine: number = 0
        if (funcLines.includes(lineNo)) {
            //what function are we in
            let startLine: number = 0
            let endLine: number = 0
            for (let i = 0; i < funcObjs.length; i++) {
                if (funcObjs[i].start < lineNo && funcObjs[i].end >= lineNo) {
                    startLine = funcObjs[i].start
                    endLine = funcObjs[i].end
                    break
                }
            }

            for (let i = 0; i < thisVar.assignments.length; i++) {
                if (thisVar.assignments[i].line < lineNo && !ccState.getProperty("uncalledFunctionLines").includes(thisVar.assignments[i].line) && thisVar.assignments[i].line > startLine && thisVar.assignments[i].line <= endLine) {
                    //then it's valid
                    if (thisVar.assignments[i].line > highestLine) {
                        latestAssignment = Object.assign({}, thisVar.assignments[i])
                        highestLine = latestAssignment.line
                    }
                }
            }

            //get type from assigned node
            return estimateDataType(latestAssignment)
        }
    }
    else if (node._astname == "BinOp") {
        //estimate both sides. if the same, return that. else return null
        let left: string = estimateDataType(node.left)
        let right: string = estimateDataType(node.right)
        if (left == right){
            return left
        }
        else return null
    }
    else if (node._astname == "BoolOp" || node._astname == "Compare") {
        return "Bool"
    }

    return null
}

// Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
export function replaceNumericUnaryOps(ast: any) {
    for (let i in ast) {
        if (ast[i] != null && ast[i]._astname != null) {
            if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) {
                ast[i] = ast[i].operand
            } else if (ast[i] != null && 'body' in ast[i]) {
                for (let p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p])
                }
            }
            replaceNumericUnaryOps(ast[i])
        }
    }
}

export function lineDict() {
    function fillLevels(nodeList: any[], levelList: any[]) {
        let childNodes = []
        let thisLevel = []
        for (let i in nodeList) {
            if (nodeList[i].children.length > 0) {
                for (let j in nodeList[i].children) {
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
    let lineDictionary = [];
    //initialize array values
    for (let i in ccState.getProperty('studentCode')) {
        let variables : any[] = []
        let calls : any[] = []
        let ifElse : any[] = []
        let userFunction : any[] = []
        lineDictionary.push({
            line: Number(i) + 1,
            variables: variables,
            loop: 0,
            calls: calls,
            ifElse: ifElse,
            userFunction: userFunction,
            loopStart: 0
        })
    }
    //note every time the user defines a function
    for (let u in ccState.getProperty('userFunctionReturns')) {
        if (ccState.getProperty('userFunctionReturns')[u].startLine != null) {
            const index = ccState.getProperty('userFunctionReturns')[u].startLine - 1
            lineDictionary[index].userFunction = ccState.getProperty('userFunctionReturns')[u]
            let i = index + 1
            while (i < ccState.getProperty('userFunctionReturns')[u].endLine) {
                lineDictionary[i].userFunction = ccState.getProperty('userFunctionReturns')[u]
                i++;
            }
        }
    }
    //note every time a variable is assigned or modified
    for (let v in ccState.getProperty('variableAssignments')) {
        const index = ccState.getProperty('variableAssignments')[v].line - 1
        const variableVal = getVariableObject(ccState.getProperty('variableAssignments')[v].name)
        if (lineDictionary[index] != null) {
            lineDictionary[index].variables.push(variableVal)
        }
    }
    for (let loop in ccState.getProperty("loopLocations")) {
        //track the begin points of each loop
        const index =  ccState.getProperty("loopLocations")[loop][0] - 1;
        lineDictionary[index].loopStart =  ccState.getProperty("loopLocations")[loop]
        //note which lines are in one or more loops
        for (let loopLine = ccState.getProperty("loopLocations")[loop][0] - 1; loopLine <=  ccState.getProperty("loopLocations")[loop][1] - 1; loopLine++) {
            if (lineDictionary[loopLine] != null) {
                lineDictionary[loopLine].loop += 1
            }
        }
    }
    for (let call in ccState.getProperty('allCalls')) {
        const index = ccState.getProperty('allCalls')[call].line - 1
        if (lineDictionary[index] != null) {
            lineDictionary[index].calls.push(ccState.getProperty('allCalls')[call])
        }
    }
    //nested if else statements
    let levels: any[] = []
    fillLevels(ccState.getProperty("allConditionals"), levels)
    //remove overlap in levels
    for (let i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            if (j != levels[i].length - 1) {
                //if it's not the last one, subtract 1 from the end value
                levels[i][j][1] = levels[i][j][1] - 1
            }
        }
    }
    for (let i in levels) {
        for (let j = 0; j < levels[i].length; j++) {
            let string = j === 0 ? "if" : "else"
            const start = levels[i][j][0]
            const end = levels[i][j][1]
            for (let p = start; p <= end; p++) {
                lineDictionary[p - 1].ifElse.push(string)
            }
        }
    }
    return lineDictionary
}
