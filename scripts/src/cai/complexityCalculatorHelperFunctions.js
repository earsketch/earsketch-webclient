"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineDict = exports.replaceNumericUnaryOps = exports.getFunctionObject = exports.getVariableObject = exports.getLastLine = exports.trimCommentsAndWhitespace = exports.notateConditional = exports.doAstNodesMatch = exports.copyAttributes = exports.appendArray = void 0;
// A library of helper functions for the CAI Code Complexity Calculator
var ccState = require("./complexityCalculatorState");
// Appends the values in the source array to the target list.
function appendArray(source, target) {
    for (var p = 0; p < source.length; p++) {
        target.push(source[p]);
    }
    return target;
}
exports.appendArray = appendArray;
// Copies attributes (except for boolean values set to False) from one object to another, including recursively copying all values from child objects.
// NOTE: Does NOT reset any boolean values in Target to False. This is intentional
function copyAttributes(source, target, attributesToCopy) {
    for (var attr = 0; attr < attributesToCopy.length; attr++) {
        //copy null values
        if (source[attributesToCopy[attr]] == null) {
            target[attributesToCopy[attr]] = null;
        }
        else if (Array.isArray(source[attributesToCopy[attr]])) {
            //copy array values
            target[attributesToCopy[attr]] = appendArray(source[attributesToCopy[attr]], []);
        }
        else if (source[attributesToCopy[attr]] !== false || target[attributesToCopy[attr]] == null) {
            //copy all non-false, non-object values
            target[attributesToCopy[attr]] = source[attributesToCopy[attr]];
        }
        else if (typeof source[attributesToCopy[attr]] === "object") {
            //copy properties of child objects recursively
            var copiedObj = {};
            var attrsToCopy = [];
            for (var at in source[attributesToCopy[attr]]) {
                attrsToCopy.push(at);
            }
            copyAttributes(source[attributesToCopy[attr]], copiedObj, attrsToCopy);
            target[attributesToCopy[attr]] = copiedObj;
        }
    }
}
exports.copyAttributes = copyAttributes;
// Determines whether or not two AST nodes contain the same value.
function doAstNodesMatch(astnode1, astnode2) {
    var matchingAstName = astnode1._astname;
    if (astnode1._astname === "Name" && astnode2._astname === "Name" && astnode1.id.v === astnode2.id.v) {
        //the two nodes reference the same variable or function
        return true;
    }
    if (astnode1._astname != astnode2._astname) {
        //if they're not the same variable but they ARE the same value
        //(ex., a variable whose value is 5 and and integeere whose value is 5)
        //register this as a match
        if (astnode1._astname === "Name" || astnode2._astname === "Name") { //if one side is a variable, get the most recent value  //if it's a function call, that's a lost cause
            var val1 = astnode1;
            var val2 = astnode2;
            //TODO do varnames match
        }
        return false;
    }
    //if it's a UnaryOp, we should see if the operands match
    //this isn't exact but works for our purposes
    if (matchingAstName === "UnaryOp") {
        return doAstNodesMatch(astnode1.operand, astnode2.operand);
    }
    //if two lists, check that the elements all match
    if (matchingAstName === "List") {
        if (astnode1.elts.length != astnode2.elts.length) {
            return false;
        }
        else {
            for (var e = 0; e < astnode1.elts.length; e++) {
                if (!(doAstNodesMatch(astnode1.elts[e], astnode2.elts[e]))) {
                    return false;
                }
            }
            return true;
        }
    }
    else if (matchingAstName === "Call") {
        //We can't actually perform any user-defined functions, so this is an approximation:
        // if the same function is called with same arguments, consider the values equal
        var args1 = [];
        var args2 = [];
        var funcNode1 = astnode1.func;
        var funcNode2 = astnode2.func;
        //for list ops and string ops
        if ('attr' in funcNode1) {
            if (!('attr' in funcNode2)) {
                return false;
            }
            else {
                if (funcNode1.attr.v != funcNode2.attr.v) {
                    return false;
                }
                args1 = funcNode1.args;
                args2 = funcNode2.args;
            }
        }
        else if ('id' in funcNode1) {
            //for all other function types
            if (!('id' in funcNode2)) {
                return false;
            }
            else {
                if (funcNode1.id.v != funcNode2.id.v) {
                    return false;
                }
                args1 = funcNode1.args;
                args2 = funcNode2.args;
            }
        }
        //do the arguments match?
        if (args1.length != args2.length) {
            return false;
        }
        for (var a = 0; a < args1.length; a++) {
            if (!doAstNodesMatch(args1[a], args2[a])) {
                return false;
            }
        }
        return true;
    }
    else if (matchingAstName === "Num") {
        //numerical values must match
        return astnode1.n.v === astnode2.n.v;
    }
    else if (matchingAstName === "Str") {
        //ditto for strings
        return astnode1.s.v === astnode2.s.v;
    }
}
exports.doAstNodesMatch = doAstNodesMatch;
// Handles the addition of information about conditional lines to  ccState.getProperty("allConditionals")()
function notateConditional(node) {
    var lastLine = getLastLine(node);
    //fills in a list of lines where else statements for this conditional occur
    function addElse(node, elseLineList) {
        if (node.orelse != null && node.orelse.length > 0) {
            elseLineList.push(node.orelse[0].lineno);
            addElse(node.orelse[0], elseLineList);
        }
    }
    //determines if the conditional in question is inside another conditional
    function findParent(startLine, endLine, nodeList) {
        var parentNode = null;
        for (var i in nodeList) {
            if (nodeList[i].children.length > 0) {
                parentNode = findParent(startLine, endLine, nodeList[i].children);
            }
            if (parentNode == null) {
                if (nodeList[i].start < startLine && nodeList[i].end >= endLine) {
                    parentNode = nodeList[i];
                    break;
                }
            }
        }
        return parentNode;
    }
    //pushes this conditional's object to its parent's list of children
    function pushParent(child, parentStart, parentEnd, nodeList) {
        for (var i in nodeList) {
            if (nodeList[i].start === parentStart && nodeList[i].end === parentEnd) {
                nodeList[i].children.push(child);
            }
            else if (nodeList[i].start <= parentStart && nodeList[i].end >= parentEnd) {
                pushParent(child, parentStart, parentEnd, nodeList[i].children);
                break;
            }
        }
    }
    //Have we already marked this exact conditional before?
    function doesAlreadyExist(start, end, nodeList) {
        for (var i in nodeList) {
            if (nodeList[i].children.length > 0) {
                if (doesAlreadyExist(start, end, nodeList[i].children)) {
                    return true;
                }
            }
            if (nodeList[i].start === start && nodeList[i].end === end) {
                return true;
            }
        }
        return false;
    }
    //get all orelse locations
    var elseLines = [];
    addElse(node, elseLines);
    elseLines.push(lastLine);
    var newObjects = [{ start: node.lineno, end: elseLines[0], children: [] }];
    for (var i = 1; i < elseLines.length; i++) {
        newObjects.push({ start: elseLines[i], end: elseLines[i + 1], children: [] });
    }
    //is this a child node?
    var isChild = findParent(node.lineno, lastLine, ccState.getProperty("allConditionals"));
    //go through, replacing isChild with the object its a child of if found
    if (isChild != null) {
        for (var i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                pushParent(newObjects[i], isChild.start, isChild.end, ccState.getProperty("allConditionals"));
            }
        }
    }
    else {
        for (var i in newObjects) {
            if (!doesAlreadyExist(newObjects[i].start, newObjects[i].end, ccState.getProperty("allConditionals"))) {
                ccState.getProperty("allConditionals").push(newObjects[i]);
            }
        }
    }
}
exports.notateConditional = notateConditional;
// Trims comments and leading/trailing whitespace from lines of Python and JS code.
function trimCommentsAndWhitespace(stringToTrim) {
    var returnString = stringToTrim;
    //strip out any trailing comments
    //python uses #
    if (!ccState.getProperty('isJavascript') && returnString.includes('#')) {
        var singleQuotes = 0;
        var doubleQuotes = 0;
        var commentIndex = -1;
        for (var s = 0; s < returnString.length; s++) {
            //we use the number of single and double quotes (odd versus even) to determine whether any # or // is actually part of a string and NOT a comment.
            if (returnString[s] === "'") {
                singleQuotes++;
            }
            if (returnString[s] === '"') {
                doubleQuotes++;
            }
            if (returnString[s] === "#") {
                //we have a #. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s;
                    break;
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex);
        }
    }
    //Javascript uses //
    if (ccState.getProperty('isJavascript') && returnString.includes('//')) {
        var singleQuotes = 0;
        var doubleQuotes = 0;
        var commentIndex = -1;
        for (var s = 0; s < returnString.length; s++) {
            if (returnString[s] === "'") {
                singleQuotes++;
            }
            if (returnString[s] === '"') {
                doubleQuotes++;
            }
            if (returnString[s] === "/" && s < returnString.length - 1 && returnString[s + 1] === "/") {
                //we have a double slash. assuming this is NOT in a string (ie both singleQuotes and doubleQuotes are EVEN NUMBERS this is the index we chop from. save it and break
                if (doubleQuotes % 2 === 0 && singleQuotes % 2 === 0) {
                    commentIndex = s;
                    break;
                }
            }
        }
        if (commentIndex != -1) {
            returnString = returnString.substring(0, commentIndex);
        }
    }
    returnString = returnString.trim(); //then any leading/trailing spaces
    return returnString;
}
exports.trimCommentsAndWhitespace = trimCommentsAndWhitespace;

function numberOfLeadingSpaces(stringToCheck) {
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
exports.numberOfLeadingSpaces = numberOfLeadingSpaces;


// Gets the last line in a multiline block of code.
function getLastLine(functionNode) {
    if (!('body' in functionNode) || functionNode.body.length === 0) {
        return functionNode.lineno;
    }
    var lastLine = getLastLine(functionNode.body[functionNode.body.length - 1]);
    if ('orelse' in functionNode && functionNode.orelse.length > 0) {
        var orElseLast = getLastLine(functionNode.orelse[functionNode.orelse.length - 1]);
        if (orElseLast > lastLine) {
            lastLine = orElseLast;
        }
    }
    return lastLine;
}
exports.getLastLine = getLastLine;
// Finds Variable object given the variable name. If not found, returns null.
function getVariableObject(variableName) {
    for (var r = 0; r < ccState.getProperty("allVariables").length; r++) {
        if (ccState.getProperty("allVariables")[r].name === variableName) {
            return ccState.getProperty("allVariables")[r];
        }
    }
    return null;
}
exports.getVariableObject = getVariableObject;
// Find the User Function Return object by the function name. If not found, returns null.
function getFunctionObject(funcName) {
    for (var u = 0; u < ccState.getProperty('userFunctionReturns').length; u++) {
        if (ccState.getProperty('userFunctionReturns')[u].name === funcName) {
            return ccState.getProperty('userFunctionReturns')[u];
        }
    }
    return null;
}
exports.getFunctionObject = getFunctionObject;
// Replaces AST nodes for objects such as negative variables to eliminate the negative for analysis
function replaceNumericUnaryOps(ast) {
    for (var i in ast) {
        if (ast[i] != null && ast[i]._astname != null) {
            if (ast[i]._astname === "UnaryOp" && (ast[i].op.name === "USub" || ast[i].op.name === "UAdd")) {
                ast[i] = ast[i].operand;
            }
            else if (ast[i] != null && 'body' in ast[i]) {
                for (var p in ast[i].body) {
                    replaceNumericUnaryOps(ast[i].body[p]);
                }
            }
            replaceNumericUnaryOps(ast[i]);
        }
    }
}
exports.replaceNumericUnaryOps = replaceNumericUnaryOps;
function lineDict() {
    function fillLevels(nodeList, levelList) {
        var childNodes = [];
        var thisLevel = [];
        for (var i in nodeList) {
            if (nodeList[i].children.length > 0) {
                for (var j in nodeList[i].children) {
                    childNodes.push(nodeList[i].children[j]);
                }
            }
            thisLevel.push([nodeList[i].start, nodeList[i].end]);
        }
        levelList.push(thisLevel);
        if (childNodes.length > 0) {
            fillLevels(childNodes, levelList);
        }
    }
    var lineDictionary = [];
    //initialize array values
    for (var i in ccState.getProperty('studentCode')) {
        var variables = [];
        var calls = [];
        var ifElse = [];
        var userFunction = [];
        lineDictionary.push({
            line: Number(i) + 1,
            variables: variables,
            loop: 0,
            calls: calls,
            ifElse: ifElse,
            userFunction: userFunction,
            loopStart: 0
        });
    }
    //note every time the user defines a function
    for (var u in ccState.getProperty('userFunctionReturns')) {
        if (ccState.getProperty('userFunctionReturns')[u].startLine != null) {
            var index = ccState.getProperty('userFunctionReturns')[u].startLine - 1;
            lineDictionary[index].userFunction = ccState.getProperty('userFunctionReturns')[u];
            var i = index + 1;
            while (i < ccState.getProperty('userFunctionReturns')[u].endLine) {
                lineDictionary[i].userFunction = ccState.getProperty('userFunctionReturns')[u];
                i++;
            }
        }
    }
    //note every time a variable is assigned or modified
    for (var v in ccState.getProperty('variableAssignments')) {
        var index = ccState.getProperty('variableAssignments')[v].line - 1;
        var variableVal = getVariableObject(ccState.getProperty('variableAssignments')[v].name);
        if (lineDictionary[index] != null) {
            lineDictionary[index].variables.push(variableVal);
        }
    }
    for (var loop in ccState.getProperty("loopLocations")) {
        //track the begin points of each loop
        var index = ccState.getProperty("loopLocations")[loop][0] - 1;
        lineDictionary[index].loopStart = ccState.getProperty("loopLocations")[loop];
        //note which lines are in one or more loops
        for (var loopLine = ccState.getProperty("loopLocations")[loop][0] - 1; loopLine <= ccState.getProperty("loopLocations")[loop][1] - 1; loopLine++) {
            if (lineDictionary[loopLine] != null) {
                lineDictionary[loopLine].loop += 1;
            }
        }
    }
    for (var call in ccState.getProperty('allCalls')) {
        var index = ccState.getProperty('allCalls')[call].line - 1;
        if (lineDictionary[index] != null) {
            lineDictionary[index].calls.push(ccState.getProperty('allCalls')[call]);
        }
    }
    //nested if else statements
    var levels = [];
    fillLevels(ccState.getProperty("allConditionals"), levels);
    //remove overlap in levels
    for (var i in levels) {
        for (var j = 0; j < levels[i].length; j++) {
            if (j != levels[i].length - 1) {
                //if it's not the last one, subtract 1 from the end value
                levels[i][j][1] = levels[i][j][1] - 1;
            }
        }
    }
    for (var i in levels) {
        for (var j = 0; j < levels[i].length; j++) {
            var string = j === 0 ? "if" : "else";
            var start = levels[i][j][0];
            var end = levels[i][j][1];
            for (var p = start; p <= end; p++) {
                lineDictionary[p - 1].ifElse.push(string);
            }
        }
    }
    return lineDictionary;
}
exports.lineDict = lineDict;
//# sourceMappingURL=complexityCalculatorHelperFunctions.js.map