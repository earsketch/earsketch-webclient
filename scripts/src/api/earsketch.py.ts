// EarSketch API: Python
import * as ES_PASSTHROUGH from "./passthrough"
import * as userConsole from "../app/userconsole"

// NOTE: We could just build this once and expose the module directly,
// but skulpt is `require()`d asynchronously in index.js, so `Sk` is not available yet.

export function setupAPI() {
    const mod: any = {}

    // Global variable that will holds the output of the script (DAW state).
    mod.__ES_RESULT = new Sk.builtin.dict()

    // Add MIX_TRACK as a global constant
    mod.MIX_TRACK = new Sk.builtin.int_(0)
    // MASTER_TRACK is a deprecated alias of MIX_TRACK
    mod.MASTER_TRACK = new Sk.builtin.int_(0)

    // Function to get the global result variable from inside the module
    // when a user imports it as "from earsketch import *"
    mod._getResult = new Sk.builtin.func(() => mod.__ES_RESULT)

    // Function to initialize a new script in EarSketch.
    // Resets the global result variable to the default value.
    mod.init = new Sk.builtin.func(() => {
        mod.__ES_RESULT = callPassthrough("init", Sk.builtins["__AUDIO_QUALITY"])
    })

    const passthroughList = ["setTempo", "finish", "fitMedia", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "rhythmEffects", "setEffect"]

    for (const name of passthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => {
            mod.__ES_RESULT = callPassthrough(name, ...args)
        })
    }

    const returnablePassthroughList = ["gauss", "importImage", "importFile", "println", "replaceListElement", "replaceString", "reverseList", "reverseString", "selectRandomFile", "shuffleList", "shuffleString"]

    for (const name of returnablePassthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => callPassthrough(name, ...args))
    }

    const modAndReturnPassthroughList = ["createAudioSlice"]

    for (const name of modAndReturnPassthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => callModAndReturnPassthrough(name, ...args))
    }

    const suspendedPassthroughList = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "dur", "readInput"]

    for (const name of suspendedPassthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => suspendPassthrough(name, ...args))
    }

    // Replace input/raw_input with ES readInput. (Issue #1087.)
    Sk.builtins.raw_input = mod.readInput
    Sk.builtins.input = mod.readInput

    // Helper function that maps Javascript errors to python errors.
    // Skulpt automatically adds the offending line number.
    const mapJsErrors = (func: Function) => {
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
    const convertArgs = (args: any[]) => [mod.__ES_RESULT, ...args].map(arg => arg === undefined ? arg : Sk.ffi.remapToJs(arg))

    // Helper functions that convert input to Javascript and call the appropriate passthrough function.
    const callPassthrough = (name: string, ...args: any[]) => {
        return mapJsErrors(() => Sk.ffi.remapToPy((ES_PASSTHROUGH as any)[name](...convertArgs(args))))
    }

    const callModAndReturnPassthrough = (name: string, ...args: any[]) => {
        const { result, returnVal } = (ES_PASSTHROUGH as any)[name](...convertArgs(args))
        mod.__ES_RESULT = mapJsErrors(() => Sk.ffi.remapToPy(result))
        return mapJsErrors(() => Sk.ffi.remapToPy(returnVal))
    }

    // Call passthrough, but expect a Promise and convert it to a Skulpt suspension.
    // https://github.com/skulpt/skulpt/blob/master/doc/suspensions.txt
    const suspendPassthrough = (name: string, ...args: any[]) => {
        return mapJsErrors(() => {
            const promise = (ES_PASSTHROUGH as any)[name](...convertArgs(args))
            const susp = new Sk.misceval.Suspension()
            susp.resume = () => Sk.ffi.remapToPy(susp.data.result)
            susp.data = {
                type: "Sk.promise",
                promise,
            }
            return susp
        })
    }

    mod.__name__ = new Sk.builtin.str("earsketch")

    // Inject EarSketch Python API as `earsketch` module.
    const module = new Sk.builtin.module()
    Sk.sysmodules.mp$ass_subscript("earsketch", module)
    module.$d = mod

    // Migrated from ideController:
    // Function to pipe Skulpt's stdout to the EarSketch console.
    function outf(text: string) {
        // For some reason, skulpt prints a newline character after every
        // call to print(), so let's ignore those
        // TODO: users can't print newline characters...ugh
        if (text === "\n") {
            return
        }
        userConsole.log(text)
    }

    function builtinRead(x: string) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
            throw "File not found: '" + x + "'"
        }
        return Sk.builtinFiles["files"][x]
    }

    Sk.pre = "output"
    Sk.configure({ output: outf, read: builtinRead })
}

export default setupAPI