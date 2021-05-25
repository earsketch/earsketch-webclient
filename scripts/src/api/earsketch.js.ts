// EarSketch API: Javascript
import * as ES_PASSTHROUGH from './passthrough'

// This defines an init function for JS-Interpreter.
// These functions will be injected into the interpreter by the compiler.
export default function setupAPI(interpreter: any, scope: any) {
    let wrapper

    // MIX_TRACK constant
    interpreter.setProperty(scope, 'MIX_TRACK', (0))

    // Deprecated MASTER_TRACK alias for MIX_TRACK
    interpreter.setProperty(scope, 'MASTER_TRACK', (0))

    // Function to initialize a new script in EarSketch.
    // Resets the global result variable to the default value.
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
        wrapper = function(a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
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
    wrapper = function(msg: string, callback: any) {
        return suspendPassthrough('prompt', callback, msg);
    };
    interpreter.setProperty(
        scope, 'readInput', interpreter.createAsyncFunction(wrapper)
    );

    // Helper function for easily wrapping a function around the passthrough.
    function callPassthrough(passthroughFunction: string, ...args: any[]) {

        const passthroughArgs: any[] = []
        // put in the result as the new first argument
        passthroughArgs.unshift(remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        ))

        // convert arguments to JavaScript types
        for (const arg of args) {
            if (arg !== undefined) {
                passthroughArgs.push(remapToNativeJs(arg))
            }
        }

        return wrapJsErrors(() => {
            return remapToPseudoJs(
                (ES_PASSTHROUGH as any)[passthroughFunction].apply(this, passthroughArgs)
            )
        })
    }

    // Helper function for easily wrapping a function around the passthrough.
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


        var jsResultReturn = (ES_PASSTHROUGH as any)[func].apply(this, args);
        var pseudoJSResultReturn = {
            result: wrapJsErrors(function() { return remapToPseudoJs(jsResultReturn.result) }),
            returnVal: wrapJsErrors(function() { return remapToPseudoJs(jsResultReturn.returnVal) })
        };
        return pseudoJSResultReturn;

    }

    // Helper function for easily wrapping a function around the passthrough
    // that returns a promise.
    //
    //   passthroughFunction: The function name to call in the passthrough.
    //   callback: The callback function for asynchronous execution using JS-Interpreter.
    //
    // See dur() or analyze() for examples on how to use this function.
    function suspendPassthrough(passthroughFunction: string, callback: any, ...args: any[]) {
        const passthroughArgs: any = []
        // put in the result as the new first argument
        passthroughArgs.unshift(remapToNativeJs(
            interpreter.getProperty(scope, '__ES_RESULT')
        ));

        // convert arguments to JavaScript types
        for (const arg of args) {
            if (arg !== undefined && typeof arg !== 'function') {
                passthroughArgs.push(remapToNativeJs(arg))
            }
        }

        wrapJsErrors(function() {
            var promise = (ES_PASSTHROUGH as any)[passthroughFunction].apply(this, passthroughArgs);
            promise.then(function(result: any) {
                callback(remapToPseudoJs(result));
            }).catch(function(err: any) {
                throw err;
            });
        });
    }

    // TODO: This comment is a blatant lie...
    // Helper function for wrapping error handling. Adds the line number of
    // the error, etc.
    function wrapJsErrors(func: any) {
        try {
            return func();
        } catch(e) {
            throw e;
        }
    }

    // Helper function for JS-Interpreter to map an arbitrary real Javascript
    // variable into a pseudo Javascript variable.
    function remapToPseudoJs(v: any) {
        if (!(v instanceof Object)) {
            // case v is not an object, return a mapped primitive type
            return v;
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

    // Helper function for JS-Interpreter to map an arbitrary pseudo Javascript
    // variable into a native javascript variable.
    function remapToNativeJs(v: any): any {
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
                nativeObject = {} as { [key: string]: any }
                for (var key in v.properties) {
                    nativeObject[key] = remapToNativeJs(v.properties[key]);
                }

            }
        }

        return nativeObject;
    }
};
