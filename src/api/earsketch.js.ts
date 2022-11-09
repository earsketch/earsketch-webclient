// EarSketch API: Javascript
import Interpreter from "js-interpreter"
import * as passthrough from "./passthrough"
import { APIConfig, API_FUNCTIONS, ANALYSIS_NAMES, EFFECT_NAMES } from "./api"
import { DAWData } from "common"

const ES_PASSTHROUGH = passthrough as { [key: string]: Function }

// The result of running the script (DAW state).
export let dawData: DAWData

// This defines an init function for JS-Interpreter.
// These functions will be injected into the interpreter by the runner.
export function setup(interpreter: any, scope: any) {
    interpreter.setProperty(scope, "MIX_TRACK", (0))
    // Deprecated MASTER_TRACK alias for MIX_TRACK
    interpreter.setProperty(scope, "MASTER_TRACK", (0))

    // Initialize DAW data.
    dawData = remapToInterp(passthrough.init())

    for (const [name, config] of Object.entries(API_FUNCTIONS)) {
        interpreter.setProperty(scope, name, makeInterpreterFunction(ES_PASSTHROUGH[name], config))
    }

    // Alias of readInput. TODO: Can we get rid of this? It's not in the API documentation, curriculum, or Python API.
    interpreter.setProperty(scope, "prompt", interpreter.getProperty(scope, "readInput"))

    for (const constant of EFFECT_NAMES.concat(ANALYSIS_NAMES)) {
        interpreter.setProperty(scope, constant, constant)
    }

    // Convert arguments to JavaScript types.
    const convertArgs = (args: any[]) =>
        [dawData, ...args].map(arg => arg === undefined ? arg : remapToNative(arg))

    const wrapAsync = async (fn: Function, config: APIConfig, callback: Function, args: any[]) => {
        try {
            const result = remapToInterp(await fn(...convertArgs(args)))
            // NOTE: We ignore config.return, because we don't yet have any API
            // functions that are async, return something, and modify `dawData`.
            if (config.mod) {
                dawData = result
                callback()
            } else {
                callback(result)
            }
        } catch (err) {
            // See https://github.com/NeilFraser/JS-Interpreter/issues/189.
            const error = interpreter.createObject(interpreter.ERROR)
            interpreter.setProperty(error, "name", err.name, Interpreter.NONENUMERABLE_DESCRIPTOR)
            interpreter.setProperty(error, "message", err.message, Interpreter.NONENUMERABLE_DESCRIPTOR)
            try {
                interpreter.unwind(Interpreter.Completion.THROW, error, undefined)
                interpreter.paused_ = false
            } catch (e) {
                asyncError = e
            }
        }
    }

    function makeInterpreterFunction(fn: Function, config: APIConfig) {
        if (config.async) {
            // Note: There is an open bug in interpreter.js (May 5, 2020)
            // https://github.com/NeilFraser/JS-Interpreter/issues/180
            // These ES APIs take the max of 4 variable-length arguments,
            // but `createAsyncFunction` demands fixed-length arguments.
            // Hack: Use placeholder arguments (x6 to be safe) and enumerate.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return interpreter.createAsyncFunction(function (a: any, b: any, c: any, d: any, e: any, f: any, g: any) {
                const args = []
                for (let i = 0; i < arguments.length - 1; i++) {
                    if (arguments[i] !== undefined) {
                        // Ignore unused placeholders (undefined)
                        args.push(arguments[i])
                    }
                }
                // Last item (g) is always the callback function.
                const callback = arguments[arguments.length - 1]
                wrapAsync(fn, config, callback, args)
            })
        }

        if (config.mod && config.return) {
            return interpreter.createNativeFunction((...args: any[]) => {
                const { result, returnVal } = fn(...convertArgs(args))
                dawData = remapToInterp(result)
                return remapToInterp(returnVal)
            })
        }

        return interpreter.createNativeFunction((...args: any[]) => {
            const result = remapToInterp(fn(...convertArgs(args)))
            if (config.return) {
                return result
            }
            dawData = result
        })
    }

    // Map a native JS value into a JS-Interpreter value.
    function remapToInterp(v: any) {
        if (!(v instanceof Object)) {
            // case v is not an object, return a mapped primitive type
            return v
        }
        if (v instanceof Array) {
            // case v is an array
            const pseudoList = interpreter.createObject(interpreter.ARRAY)

            for (let i = 0; i < v.length; i++) {
                // recursively remap nested values
                const remappedVal = remapToInterp(v[i])
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

// Propagate an error that we encountered during an async native function.
export let asyncError = null
export function popAsyncError() {
    const error = asyncError
    asyncError = null
    return error
}

// Map a JS-Interpreter value into a native JS value.
export function remapToNative(v: any): any {
    if (v === null || v === undefined || typeof v !== "object") {
        return v
    }

    let nativeObject
    if (v instanceof Interpreter.Object) {
        if (v.proto && v.proto.class && v.proto.class === "Array") {
            nativeObject = []
            for (let i = 0; i < v.properties.length; i++) {
                nativeObject[i] = remapToNative(v.properties[i])
            }
        } else {
            nativeObject = {} as { [key: string]: any }
            for (const key in v.properties) {
                nativeObject[key] = remapToNative(v.properties[key])
            }
        }
    }
    return nativeObject
}
