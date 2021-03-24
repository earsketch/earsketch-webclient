/**
 * An angular factory service for providing user console messages.
 *
 * @module userConsole
 * @author Creston Bunch
 */
app.factory('userConsole', ['$rootScope', '$window', '$timeout', '$uibModal',
function ($rootScope, $window, $timeout, $uibModal) {

    var logs = [];

    /**
     * Clears the user's error log.
     * @function
     * @name clear     
     */
    function clear() {
        logs = [];
        $rootScope.$broadcast('updateConsole');
    }

    /**
     * Use this method for messages that are caused by internal EarSketch
     * functions and not by user scripts.
     *
     * Does not use JSON.stringify, so the message should already be a string
     *
     * @function
     * @name status
     * @param {string} msg The input message.     
     */
    function status(msg) {
        logs.push({
            level: 'status',
            text: String(msg)
        });
        scroll();
        $rootScope.$broadcast('updateConsole');
    }

    /**
     * Adds information labeled 'info' to the user's error log.
     * @function
     * @name log 
     * @param {string} msg The input message.          
     */
    function log(msg) {
        var text = JSON.stringify(msg);
        // remove quotes from strings
        if (text[0] !== undefined && text[0] === '"' &&
            text[text.length-1] !== undefined && text[text.length-1] === '"') {
            text = text.substring(1, text.length-1);
        }
        logs.push({
            level: 'info',
            text: text
        });
        scroll();
        $rootScope.$broadcast('updateConsole');
    }

    /**
     * Adds information labeled 'warn' to the user's error log and notifies user on the console.
     * @function
     * @name warn 
     * @param {string} msg The input message.          
     */
    function warn(msg) {
        logs.push({
            level: 'warn',
            text: 'Warning message >> ' + String(msg)
        });
        scroll();
        $rootScope.$broadcast('updateConsole');
    }

    /**
     * Adds information labeled 'error' to the user's error log and notifies user on the console.
     * @function
     * @name error 
     * @param {string} msg The input message.          
     */
    function error(msg) {
        logs.push({
            level: 'error',
            text: 'Error message >> ' + humanize(String(msg))
        });
        scroll();
        $rootScope.$broadcast('updateConsole');
    }

    /**
     * Returns stored information from the user's error log.
     * @function
     * @name getLogs   
     * @returns {array}       
     */
    function getLogs() {
        return logs;
    }

    /**
     * Humanizes user warning and error messages printed to the user console. Available cases based on Skulpt's error messages and Node.js's errors.
     *
     * @param {string} msg The input message.
     * @returns {string}
     * @name humanize
     * @function
     * @author Anna Xambó
     */
    function humanize(msg) {
        var parts = msg.split(":");
        switch(parts[0]) {
            /* Generic & Python errors from Skulpt (errors.js) */         
            case "AssertionError":
                parts[0] = "AssertionError: An assert statement failed";
                break;
            case "AttributeError":
                parts[0] = "AttributeError: There is a mismatch between the object and the attribute";
                break;
            case "ImportError":
                parts[0] = "ImportError: The appropriate packages cannot be found or imported";
                break;
            case "IndentationError":
                parts[0] = "IndentationError: There is an indentation error in the code (lack or extra spaces)";
                break;
            case "IndexError":
                parts[0] = "IndexError: There is an error using an out of range index";
                break;
            case "KeyError":
                parts[0] = "KeyError: There is an error using a dictionary key that does not exist";
                break;
            case "NameError":
                parts[0] = "NameError: There is an error with a variable or function name that is not defined";
                break;
            case "ParseError":
                parts[0] = "ParseError: There is an error when reading the code";
                break;
            case "SyntaxError":
                parts[0] = "SyntaxError: There is an error with the syntax (or arrangement) of code";
                break;
            case "TypeError":
                parts[0] = "TypeError: There is an error with the expected data type";
                break;
            case "TokenError":
                parts[0] = "TokenError: There is an unexpected token error (extra or missing comma, space, or character) in the code";
                break;
            case "ValueError":
                parts[0] = "ValueError: A provided argument is not within the set or range of acceptable values for a function";
                break;
            /* Specific JS errors from Node.js */
            case "RangeError": 
                parts[0] = "RangeError: A provided argument is not within the set or range of acceptable values for a function";
                break; 
            case "ReferenceError": 
                parts[0] = "ReferenceError: There is an error with a variable or function name that is not defined";
                break; 
            case "Unknown identifier": 
                parts[0] = "ReferenceError: There is an error with a variable or function name that is not defined";
                break;    
            /* HTTP errors while communicating with server */  
            case "NetworkError":  
                parts[0] = msg;
                parts[1] = " please try running the code again. If the issue persists, check your internet connection or contact network administrator.";
                break;
            case "ServerError": 
                parts[0] = msg;
                parts[1] = " please try running the code again. If the issue persists, please report the issue using 'Report Error' in the options menu.";        
                break;
            default:
                return msg;
        }
        return parts;
    }

    // TODO: probably should put this in a directive
    /**
     * autoscroll to the bottom of the console
     */
    function scroll() {
        // need defer
        $timeout(function () {
            var c = document.getElementById('console-frame');
            if (c) {
                c.scrollTop = c.scrollHeight;
            }
        });
    }

    /**
     * Request user input from a modal dialog.
     */
    function prompt(msg) {
        var modal = $uibModal.open({
            templateUrl: 'templates/prompt.html',
            controller: 'PromptController',
            resolve: {
                msg: function() { return msg; }
            },
        });

        return modal.result.then(function(content) {
            return content;
        }).catch(function(err) {
            throw err;
        });
    }

    var userConsole = {
        clear: clear,
        status: status,
        log: log,
        warn: warn,
        error: error,
        getLogs: getLogs,
        scroll: scroll,
        prompt: prompt,
    };

    $window.userConsole = userConsole;

    return userConsole;
}]);
