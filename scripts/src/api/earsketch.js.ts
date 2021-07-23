// EarSketch API: Javascript
import * as passthrough from "./passthrough"
import { ANALYSIS_TAGS, EFFECT_TAGS } from "../app/audiolibrary"
import { DAWData } from "../app/player"

const ES_PASSTHROUGH = passthrough as { [key: string]: Function }

// The result of running the script (DAW state).
export let dawData: DAWData

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
// These functions will be injected into the interpreter by the runner.
export function setup(interpreter: any, scope: any) {
    interpreter.setProperty(scope, "MIX_TRACK", (0))
    // Deprecated MASTER_TRACK alias for MIX_TRACK
    interpreter.setProperty(scope, "MASTER_TRACK", (0))

    const register = (name: string, fn: Function) => interpreter.setProperty(scope, name, interpreter.createNativeFunction(fn))
    const registerAsync = (name: string, fn: Function) => interpreter.setProperty(scope, name, interpreter.createAsyncFunction(fn))

    // Initialize DAW data.
    dawData = remapToPseudoJs(passthrough.init())

    // Finish the script.
    // Formerly set __ES_FINISHED = __ES_RESULT property on the interpreter object.
    // Now we just use dawData (formerly __ES_RESULT) directly, and finish is not required.
    register("finish", () => {})

    const passthroughList = ["init", "setTempo", "fitMedia", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "rhythmEffects", "setEffect"]

    for (const name of passthroughList) {
        register(name, (...args: any[]) => {
            dawData = callPassthrough(name, ...args)
        })
    }

    const returnablePassthroughList = ["gauss", "println", "replaceListElement", "replaceString", "reverseList", "reverseString", "selectRandomFile", "shuffleList", "shuffleString"]

    for (const name of returnablePassthroughList) {
        register(name, (...args: any[]) => callPassthrough(name, ...args))
    }

    const modAndReturnPassthroughList = ["createAudioSlice"]

    for (const name of modAndReturnPassthroughList) {
        register(name, (...args: any[]) => {
            const resultAndReturnVal = callModAndReturnPassthrough(name, ...args)
            dawData = resultAndReturnVal.result
            return resultAndReturnVal.returnVal
        })
    }

    const suspendedPassthroughList = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "dur", "readInput", "importImage", "importFile"]

    for (const name of suspendedPassthroughList) {
        // Note: There is an open bug in interpreter.js (May 5, 2020)
        // https://github.com/NeilFraser/JS-Interpreter/issues/180
        // These ES APIs take the max of 4 variable-length arguments,
        // but `createAsyncFunction` demands fixed-length arguments.
        // Hack: Use placeholder arguments (x6 to be safe) and enumerate.
        // TODO: Try ES6 arg spreading once it is allowed in the codebase.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        registerAsync(name, function (a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
            const args = []
            for (let i = 0; i < arguments.length - 1; i++) {
                if (arguments[i] !== undefined) {
                    // Ignore unused placeholders (undefined)
                    args.push(arguments[i])
                }
            }
            // Last item (g) is always the callback function.
            const callback = arguments[arguments.length - 1]
            suspendPassthrough(name, callback, ...args)
        })
    }

    // Alias of readInput. TODO: Can we get rid of this? It's not in the API documentation, curriculum, or Python API.
    registerAsync("prompt", (msg: string, callback: any) => suspendPassthrough("readInput", callback, msg))

    // Convert arguments to JavaScript types.
    const convertArgs = (args: any[]) =>
        [dawData, ...args].map(arg => arg === undefined ? arg : remapToNativeJs(arg))

    // Helper function for easily wrapping a function around the passthrough.
    function callPassthrough(name: string, ...args: any[]) {
        return remapToPseudoJs(ES_PASSTHROUGH[name](...convertArgs(args)))
    }

    // Helper function for easily wrapping a function around the passthrough.
    function callModAndReturnPassthrough(name: string, ...args: any) {
        const jsResultReturn = ES_PASSTHROUGH[name](...convertArgs(args))
        return {
            result: remapToPseudoJs(jsResultReturn.result),
            returnVal: remapToPseudoJs(jsResultReturn.returnVal),
        }
    }

    // Helper function for easily wrapping a function around the passthrough that returns a promise.
    //   passthroughFunction: The function name to call in the passthrough.
    //   callback: The callback function for asynchronous execution using JS-Interpreter.
    // See dur() or analyze() for examples on how to use this function.
    async function suspendPassthrough(name: string, callback: any, ...args: any[]) {
        const result = await ES_PASSTHROUGH[name](...convertArgs(args))
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

    for (const constant of EFFECT_TAGS.concat(ANALYSIS_TAGS)) {
        interpreter.setProperty(scope, constant, constant)
    }
}
