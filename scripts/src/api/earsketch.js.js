/**
 * EarSketch API: Javascript
 *
 * This defines an init function for JS-Interpreter. These functions will be
 * injected into the interpreter by the compiler.
 *
 * @module JavascriptAPI
 * @author Creston Bunch
 */

ES_JAVASCRIPT_API = function(interpreter, scope) {
    var wrapper;

    // MIX_TRACK constant
    interpreter.setProperty(
        scope, 'MIX_TRACK', (0)
    );

    // Deprecated MASTER_TRACK alias for MIX_TRACK
    interpreter.setProperty(
        scope, 'MASTER_TRACK', (0)
    );

    /**
     * Function to initialize a new script in EarSketch.
     *
     * Resets the global result variable to the default value.
     */
    wrapper = function() {
        interpreter.setProperty(
            scope, '__ES_RESULT', callPassthrough(
                'init', interpreter.getProperty(scope, '__AUDIO_QUALITY')
            )
        );
        interpreter.scope = scope;
    };
    interpreter.setProperty(
        scope, 'init', interpreter.createNativeFunction(wrapper)
    );

    /**
     * Finish the script.
     *
     * Sets an __ES_FINISHED property on the interpreter object used to run
     * the script. This property contains the native JS compiled result.
     */
    wrapper = function() {
        interpreter.setProperty(
            scope, '__ES_RESULT', callPassthrough('finish')
        );
        interpreter.__ES_FINISHED = remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        );
    };
    interpreter.setProperty(
        scope, 'finish', interpreter.createNativeFunction(wrapper)
    );

    var passThroughList = ['setTempo', 'fitMedia', 'insertMedia', 'insertMediaSection', 'makeBeat', 'makeBeatSlice', 'rhythmEffects', 'setEffect'];

    passThroughList.forEach(function (name) {
        wrapper = function() {
            var args = [].slice.call(arguments);
            args.unshift(name);
            interpreter.setProperty(scope, '__ES_RESULT', callPassthrough.apply(this, args));
        };
        interpreter.setProperty(scope, name, interpreter.createNativeFunction(wrapper));
    });

    var returnablePassThroughList = ['gauss', 'importImage', 'importFile', 'println', 'replaceListElement', 'replaceString', 'reverseList', 'reverseString', 'selectRandomFile', 'shuffleList', 'shuffleString'];

    returnablePassThroughList.forEach(function (name) {
        wrapper = function() {
            var args = [].slice.call(arguments);
            args.unshift(name);
            var retVal = callPassthrough.apply(this, args);

            return retVal;
        };
        interpreter.setProperty(scope, name, interpreter.createNativeFunction(wrapper));
    });

    var modAndReturnPassThroughList = ['createAudioSlice'];

    modAndReturnPassThroughList.forEach(function (name) {
        wrapper = function() {
            var args = [].slice.call(arguments);
            args.unshift(name);
            var resultAndReturnVal = callModAndReturnPassthrough.apply(this, args);

            interpreter.setProperty(scope, '__ES_RESULT', resultAndReturnVal.result);
            return resultAndReturnVal.returnVal;
        };
        interpreter.setProperty(scope, name, interpreter.createNativeFunction(wrapper));
    });

    var suspendedPassThroughList = ['analyze', 'analyzeForTime', 'analyzeTrack', 'analyzeTrackForTime', 'dur', 'prompt'];

    suspendedPassThroughList.forEach(function (name) {
        // Note: There is an open bug in interpreter.js (May 5, 2020)
        // https://github.com/NeilFraser/JS-Interpreter/issues/180
        // These ES APIs take the max of 4 variable-length arguments,
        // but `createAsyncFunction` demands fixed-length arguments.
        // Hack: Use placeholder arguments (x6 to be safe) and enumerate.
        // TODO: Try ES6 arg spreading once it is allowed in the codebase.
        wrapper = function(a,b,c,d,e,f,g) {
            var args = [];
            for (var i = 0; i < arguments.length-1; i++) {
                if (arguments[i] !== undefined) {
                    // Ignore unused placeholders (undefined)
                    args.push(arguments[i]);
                }
            }
            // Last item (g) is always the callback function.
            var callback = arguments[arguments.length-1];
            args.unshift(callback);
            args.unshift(name);
            suspendPassthrough.apply(this, args);
        };
        interpreter.setProperty(scope, name, interpreter.createAsyncFunction(wrapper));
    });

    /**
     * Alias of prompt
     */
    wrapper = function(msg, callback) {
        return suspendPassthrough('prompt', callback, msg);
    };
    interpreter.setProperty(
        scope, 'readInput', interpreter.createAsyncFunction(wrapper)
    );
    /**
     * Helper function for easily wrapping a function around the passthrough.
     *
     * @private
     */
    function callPassthrough() {
        // the first argument should be the passthrough function name
        var func = arguments[0];

        var args = [];
        // put in the result as the new first argument
        args.unshift(remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        ));

        // convert arguments to JavaScript types
        for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] === undefined) {
                continue;
            }
            args.push(remapToNativeJs(arguments[i]));
        }

        return wrapJsErrors(function() {
            return remapToPseudoJs(
                ES_PASSTHROUGH[func].apply(this, args)
            );
        });
    }


    /**
     * Helper function for easily wrapping a function around the passthrough.
     *
     * @private
     */
    function callModAndReturnPassthrough() {
        // the first argument should be the passthrough function name
        var func = arguments[0];

        var args = [];
        // put in the result as the new first argument
        args.unshift(remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        ));

        // convert arguments to JavaScript types
        for (var i = 1; i < arguments.length; i++) {
            if (arguments[i] === undefined) {
                continue;
            }
            args.push(remapToNativeJs(arguments[i]));
        }


        var jsResultReturn = ES_PASSTHROUGH[func].apply(this, args);
        var pseudoJSResultReturn = {
            result: wrapJsErrors(function() { return remapToPseudoJs(jsResultReturn.result) }),
            returnVal: wrapJsErrors(function() { return remapToPseudoJs(jsResultReturn.returnVal) })
        };
        return pseudoJSResultReturn;

    }

    /**
     * Helper function for easily wrapping a function around the passthrough
     * that returns a promise.
     *
     * See dur() or analyze() for examples on how to use this function.
     *
     * @param {string} func The function name to call in the passthrough.
     * @param {function} callback The callback function for asynchronous
     * execution using JS-Interpreter.
     * @private
     */
    function suspendPassthrough() {
        // the first argument should be the passthrough function name
        var func = arguments[0];
        var callback = arguments[1];

        var args = [];
        // put in the result as the new first argument
        args.unshift(remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        ));

        // convert arguments to JavaScript types
        for (var i = 2; i < arguments.length; i++) {
            if (arguments[i] === undefined ||
                typeof(arguments[i]) === 'function') {
                continue;
            }
            args.push(remapToNativeJs(arguments[i]));
        }

        wrapJsErrors(function() {
            var promise = ES_PASSTHROUGH[func].apply(this, args);
            promise.then(function(result) {
                callback(remapToPseudoJs(result));
            }).catch(function(err) {
                throw err;
            });
        });
    }

    /**
     * Helper function that converts an arguments object into an array.
     *
     * @private
     */
    function copyArgs(args) {
        var result = [];
        for (var i = 0; i < args.length; i++) {
            result.push(args[i]);
        }
        return result;
    }

    /**
     * Helper function for wrapping error handling. Adds the line number of
     * the error, etc.
     *
     * @private
     */
    function wrapJsErrors(func) {
        try {
            return func();
        } catch(e) {
            throw e;
        }
    }

    /**
     * Helper function for JS-Interpreter to map an arbitrary real Javascript
     * variable into a pseudo Javascript variable.
     *
     * @param {object|string|number} v The variable to map.
     */
    function remapToPseudoJs(v) {
        if (!(v instanceof Object)) {
            // case v is not an object, return a mapped primitive type
            return (v);
        }
        if (v instanceof Array) {
            // case v is an array
            var pseudoList = interpreter.createObject(interpreter.ARRAY);

            for (var i=0; i < v.length; i++) {
                // recursively remap nested values
                var remappedVal = remapToPseudoJs(v[i]);
                interpreter.setProperty(pseudoList, i, remappedVal);
            }
            // pseudoList appears to be an Object rather than Array instance with length getter. (May 6, 2020)
            interpreter.setProperty(pseudoList, 'length', v.length);
            return pseudoList;
        } else {
            return interpreter.nativeToPseudo(v);
        }
    }

    /**
     * Helper function for JS-Interpreter to map an arbitrary pseudo Javascript
     * variable into a native javascript variable.
     *
     * @param {object} v The pseudo variable to map.
     */
    function remapToNativeJs(v) {
        if (typeof(v) === 'undefined') {
            return undefined;
        } else if (typeof(v) !== 'object') {
            return v;
        }

        var nativeObject;
        if (v instanceof Interpreter.Object) {
            if (v.proto && v.proto.class && v.proto.class === 'Array') {
                nativeObject = [];
                for (var i = 0; i < v.properties.length; i++) {
                    nativeObject[i] = remapToNativeJs(v.properties[i]);
                }
            } else {
                nativeObject = {};
                for (var key in v.properties) {
                    nativeObject[key] = remapToNativeJs(v.properties[key]);
                }

            }
        }

        return nativeObject;
    }
};
