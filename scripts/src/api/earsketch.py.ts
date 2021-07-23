/* eslint-disable new-cap */
// EarSketch API: Python
import * as passthrough from "./passthrough"
import { ANALYSIS_TAGS, EFFECT_TAGS } from "../app/audiolibrary"
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

    const passthroughList = ["init", "setTempo", "finish", "fitMedia", "insertMedia", "insertMediaSection", "makeBeat", "makeBeatSlice", "rhythmEffects", "setEffect"]

    for (const name of passthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => {
            dawData = callPassthrough(name, ...args)
        })
    }

    const returnablePassthroughList = ["gauss", "println", "replaceListElement", "replaceString", "reverseList", "reverseString", "selectRandomFile", "shuffleList", "shuffleString"]

    for (const name of returnablePassthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => callPassthrough(name, ...args))
    }

    const modAndReturnPassthroughList = ["createAudioSlice"]

    for (const name of modAndReturnPassthroughList) {
        mod[name] = new Sk.builtin.func((...args: any[]) => callModAndReturnPassthrough(name, ...args))
    }

    const suspendedPassthroughList = ["analyze", "analyzeForTime", "analyzeTrack", "analyzeTrackForTime", "dur", "readInput", "importImage", "importFile"]

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
    const convertArgs = (args: any[]) => [dawData, ...args].map(arg => arg === undefined ? arg : Sk.ffi.remapToJs(arg))

    // Helper functions that convert input to Javascript and call the appropriate passthrough function.
    const callPassthrough = (name: string, ...args: any[]) => {
        return mapJsErrors(() => Sk.ffi.remapToPy(ES_PASSTHROUGH[name](...convertArgs(args))))
    }

    const callModAndReturnPassthrough = (name: string, ...args: any[]) => {
        const { result, returnVal } = ES_PASSTHROUGH[name](...convertArgs(args))
        dawData = mapJsErrors(() => Sk.ffi.remapToPy(result))
        return mapJsErrors(() => Sk.ffi.remapToPy(returnVal))
    }

    // Call passthrough, but expect a Promise and convert it to a Skulpt suspension.
    // https://github.com/skulpt/skulpt/blob/master/doc/suspensions.txt
    const suspendPassthrough = (name: string, ...args: any[]) => {
        return mapJsErrors(() => {
            const promise = ES_PASSTHROUGH[name](...convertArgs(args))
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
    for (const constant of EFFECT_TAGS.concat(ANALYSIS_TAGS)) {
        Sk.builtins[constant] = Sk.ffi.remapToPy(constant)
    }
}
