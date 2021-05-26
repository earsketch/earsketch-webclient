// EarSketch API: Javascript
import * as ES_PASSTHROUGH from "./passthrough"

// Helper function for JS-Interpreter to map an arbitrary pseudo Javascript
// variable into a native javascript variable.
export function remapToNativeJs(v: any): any {
    if (v === undefined) {
        return undefined
    } else if (typeof v !== "object") {
        return v
    }

    let nativeObject
    if (v instanceof Interpreter.Object) {
        if (v.proto && v.proto.class && v.proto.class === "Array") {
            nativeObject = []
            for (let i = 0; i < v.properties.length; i++) {
                nativeObject[i] = remapToNativeJs(v.properties[i])
            }
        } else {
            nativeObject = {} as { [key: string]: any }
            for (const key in v.properties) {
                nativeObject[key] = remapToNativeJs(v.properties[key])
            }

        }
    }

    return nativeObject
}

// This defines an init function for JS-Interpreter.
// These functions will be injected into the interpreter by the compiler.
export default function setupAPI(interpreter: any, scope: any) {
    // MIX_TRACK constant
    interpreter.setProperty(scope, "MIX_TRACK", (0))
    // Deprecated MASTER_TRACK alias for MIX_TRACK
    interpreter.setProperty(scope, "MASTER_TRACK", (0))

    const register = (name: string, fn: Function) => interpreter.setProperty(scope, name, interpreter.createNativeFunction(fn))
    const registerAsync = (name: string, fn: Function) => interpreter.setProperty(scope, name, interpreter.createAsyncFunction(fn))

    // Function to initialize a new script in EarSketch.
    // Resets the global result variable to the default value.
    register("init", () => {
        const result = callPassthrough("init", interpreter.getProperty(scope, "__AUDIO_QUALITY"))
        interpreter.setProperty(scope, "__ES_RESULT", result)
        interpreter.scope = scope
    })

    // Finish the script.
    // Formerly set __ES_FINISHED = _ES_RESULT property on the interpreter object.
    // Now we just use _ES_RESULT directly, and finish is not required.
    register("finish", () => {})

    const passthroughList = ["setTempo", "fitMedia", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "rhythmEffects", "setEffect"]

    for (const name of passthroughList) {
        register(name, (...args: any[]) => {
            interpreter.setProperty(scope, "__ES_RESULT", callPassthrough.apply(this, [name, ...args]))
        })
    }

    const returnablePassThroughList = ["gauss", "importImage", "importFile", "println", "replaceListElement", "replaceString", "reverseList", "reverseString", "selectRandomFile", "shuffleList", "shuffleString"]

    for (const name of returnablePassThroughList) {
        register(name, (...args: any[]) => callPassthrough.apply(this, [name, ...args]))
    }

    const modAndReturnPassThroughList = ["createAudioSlice"]

    for (const name of modAndReturnPassThroughList) {
        register(name, (...args: any[]) => {
            const resultAndReturnVal = callModAndReturnPassthrough.apply(this, [name, ...args])
            interpreter.setProperty(scope, "__ES_RESULT", resultAndReturnVal.result)
            return resultAndReturnVal.returnVal
        })
    }

    const suspendedPassThroughList = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "dur", "readInput"]

    for (const name of suspendedPassThroughList) {
        // Note: There is an open bug in interpreter.js (May 5, 2020)
        // https://github.com/NeilFraser/JS-Interpreter/issues/180
        // These ES APIs take the max of 4 variable-length arguments,
        // but `createAsyncFunction` demands fixed-length arguments.
        // Hack: Use placeholder arguments (x6 to be safe) and enumerate.
        // TODO: Try ES6 arg spreading once it is allowed in the codebase.
        registerAsync(name, function(a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
            const args = []
            for (let i = 0; i < arguments.length-1; i++) {
                if (arguments[i] !== undefined) {
                    // Ignore unused placeholders (undefined)
                    args.push(arguments[i])
                }
            }
            // Last item (g) is always the callback function.
            const callback = arguments[arguments.length-1]
            args.unshift(callback)
            args.unshift(name)
            suspendPassthrough.apply(this, args)
        })
    }

    // Alias of readInput. TODO: Can we get rid of this? It's not in the API documentation, curriculum, or Python API.
    registerAsync("prompt", (msg: string, callback: any) => suspendPassthrough("readInput", callback, msg))

    // Helper function for easily wrapping a function around the passthrough.
    function callPassthrough(passthroughFunction: string, ...args: any[]) {

        const passthroughArgs: any[] = []
        // put in the result as the new first argument
        passthroughArgs.unshift(remapToNativeJs(interpreter.getProperty(scope, "__ES_RESULT")))

        // convert arguments to JavaScript types
        for (const arg of args) {
            if (arg !== undefined) {
                passthroughArgs.push(remapToNativeJs(arg))
            }
        }

        return remapToPseudoJs((ES_PASSTHROUGH as any)[passthroughFunction].apply(this, passthroughArgs))
    }

    // Helper function for easily wrapping a function around the passthrough.
    function callModAndReturnPassthrough(func: string, ...args: any) {
        const passthroughArgs = []
        // put in the result as the new first argument
        passthroughArgs.unshift(remapToNativeJs(interpreter.getProperty(scope, "__ES_RESULT")))

        // convert arguments to JavaScript types
        for (const arg of args) {
            if (arg !== undefined) {
                passthroughArgs.push(remapToNativeJs(arg))
            }
        }


        const jsResultReturn = (ES_PASSTHROUGH as any)[func].apply(this, passthroughArgs)
        const pseudoJSResultReturn = {
            result: remapToPseudoJs(jsResultReturn.result),
            returnVal: remapToPseudoJs(jsResultReturn.returnVal)
        }
        return pseudoJSResultReturn

    }

    // Helper function for easily wrapping a function around the passthrough
    // that returns a promise.
    //
    //   passthroughFunction: The function name to call in the passthrough.
    //   callback: The callback function for asynchronous execution using JS-Interpreter.
    //
    // See dur() or analyze() for examples on how to use this function.
    async function suspendPassthrough(passthroughFunction: string, callback: any, ...args: any[]) {
        const passthroughArgs: any = []
        // put in the result as the new first argument
        passthroughArgs.unshift(remapToNativeJs(interpreter.getProperty(scope, "__ES_RESULT")))

        // convert arguments to JavaScript types
        for (const arg of args) {
            if (arg !== undefined && typeof arg !== "function") {
                passthroughArgs.push(remapToNativeJs(arg))
            }
        }

        const result = await (ES_PASSTHROUGH as any)[passthroughFunction].apply(this, passthroughArgs)
        callback(remapToPseudoJs(result))
    }

    // Helper function for JS-Interpreter to map an arbitrary real Javascript
    // variable into a pseudo Javascript variable.
    function remapToPseudoJs(v: any) {
        if (!(v instanceof Object)) {
            // case v is not an object, return a mapped primitive type
            return v
        }
        if (v instanceof Array) {
            // case v is an array
            const pseudoList = interpreter.createObject(interpreter.ARRAY)

            for (let i = 0; i < v.length; i++) {
                // recursively remap nested values
                const remappedVal = remapToPseudoJs(v[i])
                interpreter.setProperty(pseudoList, i, remappedVal)
            }
            // pseudoList appears to be an Object rather than Array instance with length getter. (May 6, 2020)
            interpreter.setProperty(pseudoList, "length", v.length)
            return pseudoList
        } else {
            return interpreter.nativeToPseudo(v)
        }
    }
}
