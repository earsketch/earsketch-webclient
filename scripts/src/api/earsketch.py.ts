/* eslint-disable new-cap */
// EarSketch API: Python
import * as passthrough from "./passthrough"
import { API_FUNCTIONS, APIConfig } from "./api"
import { ANALYSIS_NAMES, EFFECT_NAMES } from "../app/audiolibrary"
import { DAWData } from "../app/player"

const ES_PASSTHROUGH = passthrough as { [key: string]: Function }

// The result of running the script (DAW state).
export let dawData: DAWData

// NOTE: We could just build this once and expose the module directly,
// but skulpt is `require()`d asynchronously in index.js, so `Sk` is not available yet.
export function setup() {
    const mod: any = {}

    dawData = Sk.ffi.remapToPy(passthrough.init())

    // Add MIX_TRACK as a global constant
    mod.MIX_TRACK = new Sk.builtin.int_(0)
    // MASTER_TRACK is a deprecated alias of MIX_TRACK
    mod.MASTER_TRACK = new Sk.builtin.int_(0)

    for (const [name, config] of Object.entries(API_FUNCTIONS)) {
        mod[name] = new Sk.builtin.func(wrapFunction(ES_PASSTHROUGH[name], config))
    }

    // Replace input/raw_input with ES readInput. (Issue #1087.)
    Sk.builtins.raw_input = mod.readInput
    Sk.builtins.input = mod.readInput

    mod.__name__ = new Sk.builtin.str("earsketch")

    // Inject EarSketch Python API as `earsketch` module.
    const module = new Sk.builtin.module()
    Sk.sysmodules.mp$ass_subscript("earsketch", module)
    module.$d = mod

    // Migrated from ideController:
    // Function to pipe Skulpt's stdout to the EarSketch console.
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

    Sk.pre = "output"
    Sk.configure({ output: outf, read: builtinRead })

    // For legacy reasons, these constants are added directly to the globals rather to the earsketch module.
    for (const constant of EFFECT_NAMES.concat(ANALYSIS_NAMES)) {
        Sk.builtins[constant] = Sk.ffi.remapToPy(constant)
    }
}

// Helper function that maps JavaScript errors to Python errors.
// Skulpt automatically adds the offending line number.
function mapJSErrors(func: Function) {
    try {
        return func()
    } catch (e) {
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
        return (...args: any[]) => {
            return mapJSErrors(() => {
                const promise = fn(...convertArgs(args))
                const susp = new Sk.misceval.Suspension()
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
    }

    if (config.mod && config.return) {
        return (...args: any[]) => mapJSErrors(() => {
            const { result, returnVal } = fn(...convertArgs(args))
            dawData = Sk.ffi.remapToPy(result)
            return Sk.ffi.remapToPy(returnVal)
        })
    }

    return (...args: any[]) => mapJSErrors(() => {
        const result = Sk.ffi.remapToPy(fn(...convertArgs(args)))
        if (config.return) {
            return result
        }
        dawData = result
    })
}
