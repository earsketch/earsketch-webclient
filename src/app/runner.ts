// Run user scripts.
import Interpreter from "js-interpreter"
import * as acorn from "acorn"
import * as walk from "acorn-walk"
import i18n from "i18next"
import Sk from "skulpt"

import { NodeVisitor } from "./ast"
import * as audioLibrary from "./audiolibrary"
import * as javascriptAPI from "../api/earsketch.js"
import * as pythonAPI from "../api/earsketch.py"
import esconsole from "../esconsole"
import { postRun } from "./postRun"
import { Language } from "common"

// For interrupting the currently-executing script.
let pendingCancel = false
export function cancel() {
    pendingCancel = true
}

function checkCancel() {
    const cancel = pendingCancel
    pendingCancel = false
    return cancel
}

// How often the script yields the main thread (for UI interactions, interrupts, etc.).
const YIELD_TIME_MS = 100

export async function run(language: Language, code: string) {
    pendingCancel = false // Clear any old, pending cancellation.
    const result = await (language === "python" ? runPython : runJavaScript)(code)
    esconsole("Performing post-execution steps.", ["debug", "runner"])
    await postRun(result)
    esconsole("Post-execution steps finished. Return result.", ["debug", "runner"])
    return result
}

const SOUND_CONSTANT_PATTERN = /^[A-Z0-9][A-Z0-9_]*$/

class SoundConstantFinder extends NodeVisitor {
    constants: string[] = []

    visitName(node: any) {
        // If this identifier matches the naming scheme for sound constants, add it to the list.
        const name = node.id.v
        if (SOUND_CONSTANT_PATTERN.test(name)) {
            this.constants.push(name)
        }
    }
}

// Searches for identifiers that might be sound constants, verifies with the server, and inserts into globals.
async function handleSoundConstantsPY(code: string) {
    // First, inject sound constants that refer to folders, since the server doesn't handle them on the metadata endpoint.
    for (const constant of (await audioLibrary.getStandardSounds()).folders) {
        Sk.builtins[constant] = Sk.ffi.remapToPy(constant)
    }

    const finder = new SoundConstantFinder()
    const parse = Sk.parse("<analyzer>", code)
    finder.visit(Sk.astFromParse(parse.cst, "<analyzer>", parse.flags))
    const possibleSoundConstants = finder.constants.filter(c => Sk.builtins[c] === undefined)

    const sounds = await Promise.all(possibleSoundConstants.map(audioLibrary.getMetadata))
    for (const sound of sounds) {
        if (sound) {
            Sk.builtins[sound.name] = Sk.ffi.remapToPy(sound.name)
        }
    }
}

function _getLineNumber(): number {
    throw new Error("Called getLineNumber() outside of script execution")
}
export let getLineNumber = _getLineNumber

// Run a python script.
async function runPython(code: string) {
    Sk.dateSet = false
    Sk.filesLoaded = false
    // Added to reset imports
    // eslint-disable-next-line new-cap
    Sk.sysmodules = new Sk.builtin.dict([])
    Sk.realsyspath = undefined

    Sk.resetCompiler()
    pythonAPI.setup()
    Sk.yieldLimit = YIELD_TIME_MS

    // special cases with these key functions when import ES module is missing
    // this hack is only for the user guidance
    // eslint-disable-next-line new-cap
    Sk.builtins.init = new Sk.builtin.func(() => {
        throw new Error("init()" + i18n.t("messages:interpreter.noimport"))
    })
    // eslint-disable-next-line new-cap
    Sk.builtins.finish = new Sk.builtin.func(() => {
        throw new Error("finish()" + i18n.t("messages:interpreter.noimport"))
    })

    await handleSoundConstantsPY(code)

    const lines = code.match(/\n/g) ? code.match(/\n/g)!.length + 1 : 1
    esconsole("Running " + lines + " lines of Python", ["debug", "runner"])

    esconsole("Running script using Skulpt.", ["debug", "runner"])
    let lineNumber = 0
    getLineNumber = () => lineNumber
    const promiseHandler = (susp: any) => {
        // Follow the suspension chain to the top of the call stack.
        while (susp !== undefined) {
            lineNumber = susp.$lineno ?? lineNumber
            susp = susp.child
        }
        return null // fallback to default behavior
    }
    const yieldHandler = (susp: any) => new Promise((resolve, reject) => {
        if (checkCancel()) {
            // We do this to ensure the exception is raised from within the program.
            // This allows the user to see where the code was interrupted
            // (and potentially catch the exception, like a KeyboardInterrupt!).
            susp.child.child.resume = () => {
                throw new Sk.builtin.RuntimeError("User interrupted execution")
            }
        }
        // Use `setTimeout` to give the event loop the chance to run other tasks.
        setTimeout(() => {
            try {
                resolve(susp.resume())
            } catch (e) {
                reject(e)
            }
        })
    })

    await Sk.misceval.asyncToPromise(() => {
        try {
            return Sk.importModuleInternal_("<stdin>", false, "__main__", code, undefined, false, true)
        } catch (err) {
            esconsole(err, ["error", "runner"])
            throw err
        }
    }, { "Sk.yield": yieldHandler, "Sk.promise": promiseHandler }).finally(() => (getLineNumber = _getLineNumber))

    esconsole("Execution finished. Extracting result.", ["debug", "runner"])
    return Sk.ffi.remapToJs(pythonAPI.dawData)
}

// Searches for identifiers that might be sound constants, verifies with the server, and inserts into globals.
async function handleSoundConstantsJS(code: string, interpreter: any) {
    // First, inject sound constants that refer to folders, since the server doesn't handle them on the metadata endpoint.
    const scope = interpreter.getScope().object
    for (const constant of (await audioLibrary.getStandardSounds()).folders) {
        interpreter.setProperty(scope, constant, constant)
    }

    const constants: string[] = []

    walk.simple(acorn.parse(code, { ecmaVersion: 5 }), {
        Identifier(node: any) {
            if (SOUND_CONSTANT_PATTERN.test(node.name)) {
                constants.push(node.name)
            }
        },
    })

    const possibleSoundConstants = constants.filter(c => interpreter.getProperty(scope, c) === undefined)

    const sounds = await Promise.all(possibleSoundConstants.map(audioLibrary.getMetadata))
    for (const sound of sounds) {
        if (sound) {
            interpreter.setProperty(scope, sound.name, sound.name)
        }
    }
}

function createJsInterpreter(code: string) {
    let interpreter
    try {
        interpreter = new Interpreter(code, javascriptAPI.setup)
    } catch (e) {
        if (e.loc !== undefined) {
            // acorn provides line numbers for syntax errors
            e.message += " on line " + e.loc.line
            e.lineNumber = e.loc.line
        }
        throw e
    }

    // Run regular expressions in main thread instead of in workers;
    // see https://github.com/GTCMT/earsketch-webclient/pull/466.
    interpreter.REGEXP_MODE = 1
    interpreter.globalScope.strict = true // always enable strict mode
    return interpreter
}

// Compile a javascript script.
async function runJavaScript(code: string) {
    esconsole("Running script using JS-Interpreter.", ["debug", "runner"])
    const mainInterpreter = createJsInterpreter(code)
    await handleSoundConstantsJS(code, mainInterpreter)
    getLineNumber = () => {
        const stateStack = mainInterpreter.stateStack
        return stateStack[stateStack.length - 1].node.loc.start.line
    }
    try {
        return await runJsInterpreter(mainInterpreter)
    } finally {
        getLineNumber = _getLineNumber
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// This is a helper function for running JS-Interpreter to allow for script
// interruption and to handle breaks in execution due to asynchronous calls.
async function runJsInterpreter(interpreter: any) {
    const runSteps = () => {
        // Run interpreter for up to `YIELD_TIME_MS` milliseconds.
        // Returns early if blocked on async call or if script finishes.
        const start = Date.now()
        while ((Date.now() - start < YIELD_TIME_MS) && !interpreter.paused_) {
            // Take note of line number in case of error.
            // (We need to do this before stepping because the stack is unwound when an error is thrown.)
            const lineNumber = getLineNumber()
            try {
                if (!interpreter.step()) return false
            } catch (e) {
                throw attachLineToError(e, lineNumber)
            }
        }
        return true
    }

    while (runSteps()) {
        if (checkCancel()) {
            // Raise an exception from within the program.
            const error = interpreter.createObject(interpreter.ERROR)
            interpreter.setProperty(error, "name", "InterruptError", Interpreter.NONENUMERABLE_DESCRIPTOR)
            interpreter.setProperty(error, "message", "User interrupted execution", Interpreter.NONENUMERABLE_DESCRIPTOR)
            interpreter.unwind(Interpreter.Completion.THROW, error, undefined)
            interpreter.paused_ = false
        }
        if (javascriptAPI.asyncError) {
            throw javascriptAPI.popAsyncError()
        }
        // Give the event loop the chance to run other tasks.
        await sleep(0)
    }
    const result = javascriptAPI.dawData
    esconsole("Execution finished. Extracting result.", ["debug", "runner"])
    return javascriptAPI.remapToNative(result)
}

function attachLineToError(error: Error | string, lineNumber: number): Error {
    if (typeof error === "string") {
        // JS-Interpreter sometimes throws strings; wrap them in an Error so we can attach `lineNumber`
        error = new EvalError(error)
    }
    error.message += " on line " + lineNumber;
    (error as any).lineNumber = lineNumber
    return error
}
