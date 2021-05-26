/**
 * An angular factory service for parsing and analyzing abstract syntax trees
 * without compiling the script, e.g. to measure code complexity.
 *
 * @module reader
 * @author Creston Bunch
 */
import * as userNotification from '../userNotification'

app.factory('reader', function reader() {
    var PY_LIST_FUNCS = [
        'append', 'count', 'extend', 'index', 'insert', 'pop', 'remove', 'reverse', 'sort'
    ];
    var PY_STR_FUNCS = [
        'join', 'split', 'strip', 'rstrip', 'lstrip', 'startswith', 'upper', 'lower'
    ];

    /**
     * Build the abstract syntax tree for Python. Useful for analyzing script
     * complexity or looking for specific function call e.g. onLoop().
     *
     * @param source {String} The source code to analyze.
     * @private
     */
    function pythonAst(source) {
        try {
            var parse = Sk.parse("<analyzer>", source);
            return Sk.astFromParse(parse.cst, "<analyzer>", parse.flags);
        } catch (error) {
            userNotification.show(ESMessages.general.complexitySyntaxError, 'failure2', 5);
            throw error;
        }
    }

    /**
     * Analyze the source code of a Python script.
     *
     * @param source {String} The source code to analyze.
     * @returns {Object} A summary of the analysis.
     */
    function analyzePython(source) {
        var ast = pythonAst(source);
        var initRes = {
            userFunc: 0,
            booleanConditionals: 0,
            conditionals: 0,
            loops: 0,
            lists: 0,
            listOps: 0,
            strOps: 0
        };
        return recursiveAnalyzePython(ast, initRes);
    }

    /**
     * Calculate the total.
     */
    function total(scores) {
        var score = 0;
        if (scores.loops) {
            score += scores.loops * 10;
        }
        if (scores.conditionals) {
            score += scores.conditionals * 10;
        }
        if (scores.booleanConditionals) {
            score += scores.booleanConditionals * 15;
        }
        if (scores.lists) {
            score += scores.lists * 15;
        }
        if (scores.listOps) {
            score += scores.listOps * 15;
        }
        if (scores.strOps) {
            score += scores.strOps * 15;
        }
        if (scores.userFunc) {
            score += scores.userFunc * 30;
        }
        return score;
    }

    /**
     * Analyze a single node of a Python AST.
     * @private
     */
    function analyzePythonNode(node, results) {
        console.log('node', node);
        if (node._astname == 'FunctionDef') {
            // user-defined function
            results.userFunc++;
        }

        if (node._astname == 'If') {
            // condition
            if ('op' in node.test) {
                // boolean
                results.booleanConditionals++;
            } else {
                results.conditionals++;
            }
        }

        if (node._astname == 'While' || node._astname == 'For') {
            // loop
            results.loops++;
        }

        if (node._astname == 'Assign') {
            if ('value' in node && node.value._astname == 'List') {
                // list
                results.lists++;
            }
        }

        if (node._astname == 'Expr' || node._astname == 'Assign') {
            if ('value' in node && 'func' in node.value && 'attr' in node.value.func &&
                PY_LIST_FUNCS.indexOf(node.value.func.attr.v) > -1) {
                // list operation
                results.listOps++;
            }
            if ('value' in node && 'func' in node.value && 'attr' in node.value.func &&
                PY_STR_FUNCS.indexOf(node.value.func.attr.v) > -1) {
                // string operation
                results.strOps++;
            }

        }
    }

    /**
     * Recursively analyze a python abstract syntax tree.
     * @private
     */
    function recursiveAnalyzePython(ast, results) {
        if ('body' in ast) {
            angular.forEach(ast.body, function (node) {
                analyzePythonNode(node, results);
                recursiveAnalyzePython(node, results);
            });
        }
        return results;
    }

    var JS_LIST_FUNCS = ['of', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'toLocaleString', 'toSource', 'toString', 'unshift', 'values'];

    var JS_STR_FUNCS = ['fromCharCode', 'fromCodePoint', 'anchor', 'big', 'blink', 'bold', 'charAt', 'charCodeAt', 'codePointAt', 'concat', 'endsWith', 'fixed', 'fontcolor', 'fontsize', 'includes', 'indexOf', 'italics', 'lastIndexOf', 'link', 'localeCompare', 'match', 'normalize', 'padEnd', 'padStart', 'quote', 'repeat', 'replace', 'search', 'slice', 'small', 'split', 'startsWith', 'strike', 'sub', 'substr', 'substring', 'sup', 'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toSource', 'toString', 'toUpperCase', 'trim', 'trimLeft', 'trimRight', 'valueOf', 'raw'];

    function analyzeJavascript(source) {
        try {
            var ast = acorn.parse(source);
            var initRes = {
                userFunc: 0,
                booleanConditionals: 0,
                conditionals: 0,
                loops: 0,
                lists: 0,
                listOps: 0,
                strOps: 0
            };
            return recursiveAnalyzeJavascript(ast, initRes);
        } catch (err) {
            userNotification.show(ESMessages.general.complexitySyntaxError, 'failure2', 5);
            throw err;
        }
    }

    function recursiveAnalyzeJavascript(tree, result) {
        if (typeof(tree) === 'undefined' || tree === null) {
            return result;
        } else if (tree.constructor.name === 'Array') {
            tree.forEach(function (branch) {
                recursiveAnalyzeJavascript(branch, result);
            });
        } else {
            switch (tree.type) {
                case 'FunctionDeclaration':
                    result.userFunc++;
                    recursiveAnalyzeJavascript(tree.body, result);
                    break;
                case 'ForStatement':
                case 'ForInStatement':
                case 'WhileStatement':
                case 'DoWhileStatement':
                    result.loops++;
                    recursiveAnalyzeJavascript(tree.body, result);
                    break;
                case 'IfStatement':
                    if (tree.test.type === 'LogicalExpression') {
                        result.booleanConditionals++;
                    } else {
                        result.conditionals++;
                    }
                    recursiveAnalyzeJavascript(tree.consequent, result);
                    recursiveAnalyzeJavascript(tree.alternate, result);
                    break;
                case 'SwitchStatement':
                    result.conditionals++;
                    recursiveAnalyzeJavascript(tree.cases, result);
                    break;
                case 'SwitchCase':
                    recursiveAnalyzeJavascript(tree.consequent, result);
                    break;
                case 'ArrayExpression':
                    result.lists++;
                    recursiveAnalyzeJavascript(tree.elements, result);
                    break;

                case 'Program':
                case 'BlockStatement':
                case 'FunctionExpression':
                    recursiveAnalyzeJavascript(tree.body, result);
                    break;
                case 'ExpressionStatement':
                    recursiveAnalyzeJavascript(tree.expression, result);
                    break;
                case 'AssignmentExpression':
                    recursiveAnalyzeJavascript(tree.right, result);
                    break;
                case 'VariableDeclaration':
                    recursiveAnalyzeJavascript(tree.declarations, result);
                    break;
                case 'VariableDeclarator':
                    recursiveAnalyzeJavascript(tree.init, result);
                    break;

                case 'CallExpression':
                    recursiveAnalyzeJavascript(tree.callee, result);
                    recursiveAnalyzeJavascript(tree.arguments, result);
                    break;
                case 'MemberExpression':
                    recursiveAnalyzeJavascript(tree.object, result);
                    recursiveAnalyzeJavascript(tree.property, result);
                    break;
                case 'ObjectExpression':
                    recursiveAnalyzeJavascript(tree.properties, result);
                    break;
                case 'Identifier':
                    if (JS_LIST_FUNCS.indexOf(tree.name) !== -1) {
                        result.listOps++;
                    } else if (JS_STR_FUNCS.indexOf(tree.name) !== -1) {
                        result.strOps++;
                    }
                    break;
                default:
                    if (tree.kind === 'init') {
                        recursiveAnalyzeJavascript(tree.value, result);
                    }
                    if (typeof(tree.arguments) !== 'undefined') {
                        recursiveAnalyzeJavascript(tree.arguments, result);
                    }
                    break;
            }
        }

        return result;
    }

    return {
        total: total,
        pythonAst: pythonAst,
        analyzePython: analyzePython,
        analyzeJavascript: analyzeJavascript
    };
});
