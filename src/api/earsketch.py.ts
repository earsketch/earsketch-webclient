/* eslint-disable new-cap */
// EarSketch API: Python
import Sk from "skulpt"

import * as passthrough from "./passthrough"
import { APIConfig, API_FUNCTIONS, ANALYSIS_NAMES, EFFECT_NAMES } from "./api"
import { DAWData } from "common"
import { fromEntries } from "../esutils"

const ES_PASSTHROUGH = passthrough as { [key: string]: Function }

// The result of running the script (DAW state).
export let dawData: DAWData

// Create `earsketch` module for use within Skulpt.
const earsketch: any = {
    __name__: new Sk.builtin.str("earsketch"),
    MIX_TRACK: new Sk.builtin.int_(0),
    // Deprecated alias of `MIX_TRACK`.
    MASTER_TRACK: new Sk.builtin.int_(0),
    ...fromEntries(Object.entries(API_FUNCTIONS)
        .filter(([name, _]) => name !== "println") // Exclude `println()` from Python API `print` exists.
        .map(([name, config]) => [name, new Sk.builtin.func(wrapFunction(ES_PASSTHROUGH[name], config))])
    ),
}
const module = new Sk.builtin.module()
module.$d = earsketch

// Pipe Skulpt's stdout to the EarSketch console.
function outf(text: string) {
    // Skulpt prints a newline character after every `print`.
    // println and userConsole.log already print each message as a new line, so we ignore these newlines.
    if (text !== "\n") {
        passthrough.println(Sk.ffi.remapToJs(dawData), text)
    }
}

function builtinRead(x: string) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[x] === undefined) {
        throw new Error(`File not found: '${x}'`)
    }
    return Sk.builtinFiles.files[x]
}

// One-time Skulpt setup. First, set builtins.
Sk.builtins.raw_input = earsketch.readInput // #1087
Sk.builtins.input = earsketch.readInput
// For legacy reasons, these constants are added directly to the globals rather to the earsketch module.
for (const constant of EFFECT_NAMES.concat(ANALYSIS_NAMES)) {
    Sk.builtins[constant] = Sk.ffi.remapToPy(constant)
}
// Then, configure Skulpt options.
Sk.pre = "output"
// NOTE: We can opt into Python 3 (insofar as Skulpt supports it) by replacing `python2` with `python3` below.
Sk.configure({ output: outf, read: builtinRead, __future__: Sk.python2 })

export function setup() {
    // Reset DAW contents.
    dawData = Sk.ffi.remapToPy(passthrough.init())
    // Inject EarSketch Python API as `earsketch` module.
    Sk.sysmodules.mp$ass_subscript(earsketch.__name__, module)
}

// Helper function that maps JavaScript errors to Python errors.
// Skulpt automatically adds the offending line number.
function mapJSErrors(func: Function) {
    try {
        return func()
    } catch (e: any) {
        if (e.name === "RangeError") {
            throw new Sk.builtin.ValueError(e.message)
        } else if (e.name === "TypeError") {
            throw new Sk.builtin.TypeError(e.message)
        } else if (e.name === "ValueError") {
            throw new Sk.builtin.ValueError(e.message)
        } else {
            throw new Sk.builtin.RuntimeError(e.toString())
        }
    }
}

// Convert arguments to JavaScript types.
const convertArgs = (args: any[]) => [dawData, ...args].map(arg => arg === undefined ? arg : Sk.ffi.remapToJs(arg))

function wrapFunction(fn: Function, config: APIConfig) {
    if (config.async) {
        // Convert Promise from passthrough into a Skulpt suspension.
        // https://github.com/skulpt/skulpt/blob/master/doc/suspensions.txt
        return (...args: any[]) => mapJSErrors(() => {
            const susp = new Sk.misceval.Suspension()
            const promise = fn(...convertArgs(args))
            susp.resume = () => mapJSErrors(() => {
                if (susp.data.error) {
                    throw susp.data.error
                }
                const result = Sk.ffi.remapToPy(susp.data.result)
                // NOTE: We ignore config.return, because we don't yet have any API
                // functions that are async, return something, and modify `dawData`.
                if (config.mod) {
                    dawData = result
                } else {
                    return result
                }
            })
            susp.data = { type: "Sk.promise", promise }
            return susp
        })
    }

    if (config.mod && config.return) {
        return (...args: any[]) => mapJSErrors(() => {
            const { result, returnVal } = fn(...convertArgs(args))
            dawData = Sk.ffi.remapToPy(result)
            return Sk.ffi.remapToPy(returnVal)
        })
    }

    // NOTE: We create dummy suspensions for non-async functions in order to get the line number from Skulpt.
    return (...args: any[]) => mapJSErrors(() => {
        const susp = new Sk.misceval.Suspension()
        const promise = Promise.resolve()
        susp.resume = () => mapJSErrors(() => {
            const result = Sk.ffi.remapToPy(fn(...convertArgs(args)))
            if (config.return) {
                return result
            }
            dawData = result
            return Sk.ffi.remapToPy(null)
        })
        susp.data = { type: "Sk.promise", promise }
        return susp
    })
}
