/**
 * EarSketch API: Python
 *
 * This is a Skulpt library that wraps all EarSketch passthrough functions
 * so they can be interpreted in Python by Skulpt.
 *
 * @module PythonAPI
 * @author Creston Bunch
 */

var $builtinmodule = function (name) {

    var mod = {};

    // Global variable that will hold the output of the script after finish()
    // is called.
    mod.__ES_RESULT = new Sk.builtin.dict();

    // Add MIX_TRACK as a global constant
    mod.MIX_TRACK = new Sk.builtin.int_(0);
    // MASTER_TRACK is a deprecated alias of MIX_TRACK
    mod.MASTER_TRACK = new Sk.builtin.int_(0);

    /**
     * Function to get the global result variable from inside the module
     * when a user imports it as 'from earsketch import *'
     *
     * @private
     */
    mod._getResult = new Sk.builtin.func(function() {
        return mod.__ES_RESULT;
    });

    /**
     * Function to initialize a new script in EarSketch.
     *
     * Resets the global result variable to the default value.
     */
    mod.init = new Sk.builtin.func(function () {
        // call pt_init() and convert JS object to Python object
        mod.__ES_RESULT = callPassthrough(
            'init', Sk.builtins['__AUDIO_QUALITY']
        );
    });

    var passThroughList = ['setTempo', 'finish', 'fitMedia', 'insertMedia', 'insertMediaSection', 'makeBeat', 'makeBeatSlice', 'rhythmEffects', 'setEffect'];

    passThroughList.forEach(function (name) {
        mod[name] = new Sk.builtin.func(function () {
            var args = [].slice.call(arguments);
            args.unshift(name);
            mod.__ES_RESULT = callPassthrough.apply(this, args);
        });
    });

    var returnablePassThroughList = ['gauss', 'importImage', 'importFile', 'println', 'replaceListElement', 'replaceString', 'reverseList', 'reverseString', 'selectRandomFile', 'shuffleList', 'shuffleString'];

    returnablePassThroughList.forEach(function (name) {
        mod[name] = new Sk.builtin.func(function () {
            var args = [].slice.call(arguments);
            args.unshift(name);
            var returnVal = callPassthrough.apply(this, args);

            return returnVal;
        });
    });

    var modAndReturnPassThroughList = ['createAudioSlice'];

    modAndReturnPassThroughList.forEach(function (name) {
        mod[name] = new Sk.builtin.func(function () {
            var args = [].slice.call(arguments);
            args.unshift(name);
            var resultAndReturnVal = callModAndReturnPassthrough.apply(this, args);
            mod.__ES_RESULT = resultAndReturnVal.result;

            return resultAndReturnVal.returnVal;
        });
    });

    var suspendedPassThroughList = ['analyze', 'analyzeForTime', 'analyzeTrack', 'analyzeTrackForTime', 'dur'];

    suspendedPassThroughList.forEach(function (name) {
        mod[name] = new Sk.builtin.func(function () {
            var args = [].slice.call(arguments);
            args.unshift(name);
            return suspendPassthrough.apply(this, args);
        });
    });

    // these are with unique names
    /**
     * Alias of raw_input
     */
    mod.readInput = new Sk.builtin.func(function (msg) {
        //return callPassthrough('prompt', msg);
        return suspendPassthrough('prompt', msg);
    });

    /**
     * Overwrite of raw_input. Issue #1087, something must be wrong in
     * Skulpt's implementation -- works fine this way.
     */
    mod.raw_input = new Sk.builtin.func(function (msg) {
        return suspendPassthrough('prompt', msg);
    });

    mod.input = new Sk.builtin.func(function (msg) {
        return suspendPassthrough('prompt', msg);
    });

    /**
     * Helper function that maps Javascript errors to python errors.
     *
     * Skulpt automatically adds the offending line number.
     *
     * @private
     */
    var mapJsErrors = function(func) {
        try {
            return func();
        } catch (e) {
            if (e.name === 'RangeError') {
                throw new Sk.builtin.ValueError(e.message);
            } else if (e.name === 'TypeError') {
                throw new Sk.builtin.TypeError(e.message);
            } else if (e.name === 'ValueError') {
                throw new Sk.builtin.ValueError(e.message);
            } else {
                throw new Sk.builtin.RuntimeError(e.toString());
            }
        }
    };

    /**
     * Helper function that converts input to Javascript and calls the
     * appropriate passthrough function.
     *
     * @private
     */
    var callPassthrough = function() {
        var args = copyArgs(arguments);

        // the first argument should be the passthrough function name
        var func = args.shift();

        // put in the result as the new first argument
        args.unshift(mod.__ES_RESULT);
        // convert arguments to JavaScript types
        for (var i = 0; i < args.length; i++) {
            if (args[i] === undefined) {
                continue;
            }
            args[i] = Sk.ffi.remapToJs(args[i]);
        }

        return mapJsErrors(function() {
            return Sk.ffi.remapToPy(
                ES_PASSTHROUGH[func].apply(this, args)
            );
        });
    };

     /**
     * Helper function that converts input to Javascript and calls the
     * appropriate passthrough function.
     *
     * @private
     */
    var callModAndReturnPassthrough = function() {
        var args = copyArgs(arguments);

        // the first argument should be the passthrough function name
        var func = args.shift();

        // put in the result as the new first argument
        args.unshift(mod.__ES_RESULT);
        // convert arguments to JavaScript types
        for (var i = 0; i < args.length; i++) {
            if (args[i] === undefined) {
                continue;
            }
            args[i] = Sk.ffi.remapToJs(args[i]);
        }

 
        var jsResultReturn = ES_PASSTHROUGH[func].apply(this, args);
        var pythonResultReturn = {
            result: mapJsErrors(function() { return Sk.ffi.remapToPy(jsResultReturn.result) }),
            returnVal: mapJsErrors(function() { return Sk.ffi.remapToPy(jsResultReturn.returnVal) })
        };
        return pythonResultReturn;
    };

    /**
     * Call passthrough, but expect a promise result and map it to a Skulpt
     * suspension.
     *
     * https://github.com/skulpt/skulpt/blob/master/doc/suspensions.txt
     */
    var suspendPassthrough = function() {
        var args = copyArgs(arguments);

        // the first argument should be the passthrough function name
        var func = args.shift();

        // put in the result as the new first argument
        args.unshift(mod.__ES_RESULT);
        // convert arguments to JavaScript types
        for (var i = 0; i < args.length; i++) {
            if (args[i] === undefined) {
                continue;
            }
            args[i] = Sk.ffi.remapToJs(args[i]);
        }

        return mapJsErrors(function() {
            var promise = ES_PASSTHROUGH[func].apply(this, args);
            var susp = new Sk.misceval.Suspension();
            susp.resume = function() {
                return Sk.ffi.remapToPy(susp.data.result);
            };
            susp.data = {
                type: "Sk.promise",
                promise: promise
            };

            return susp;
        });
    };

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



    return mod;
};
