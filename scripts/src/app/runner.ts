// Run user scripts.
import Interpreter from "js-interpreter"
import * as acorn from "acorn"
import * as walk from "acorn-walk"
import i18n from "i18next"
import Sk from "skulpt"

import * as audioLibrary from "./audiolibrary"
import * as javascriptAPI from "../api/earsketch.js"
import * as pythonAPI from "../api/earsketch.py"
import esconsole from "../esconsole"
import { postRun } from "./postRun"

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

export async function run(language: "python" | "javascript", code: string) {
    pendingCancel = false // Clear any old, pending cancellation.
    const result = await (language === "python" ? runPython : runJavaScript)(code)
    esconsole("Performing post-execution steps.", ["debug", "runner"])
    await postRun(result)
    esconsole("Post-execution steps finished. Return result.", ["debug", "runner"])
    return result
}

// Skulpt AST-walking code; based on https://gist.github.com/acbart/ebd2052e62372df79b025aee60ff450e.
const iterFields = (node: any) => {
    // Return a list of values for each field in `node._fields` that is present on `node`.
    // Notice we skip every other field, since the odd elements are accessor functions.
    const valueList = []
    for (let i = 0; i < node._fields.length; i += 2) {
        const field = node._fields[i]
        if (field in node) {
            valueList.push(node[field])
        }
    }
    return valueList
}

class NodeVisitor {
    // Visit a node.
    visit(node: any) {
        const methodName = `visit${node._astname}`
        const visitor: Function = (this as any)[methodName] ?? this.genericVisit
        return visitor.apply(this, [node])
    }

    // Called if no explicit visitor function exists for a node.
    genericVisit(node: any) {
        const fieldList = iterFields(node)
        for (const value of Object.values(fieldList)) {
            if (Array.isArray(value)) {
                for (const subvalue of value) {
                    if (subvalue._astname !== undefined) {
                        this.visit(subvalue)
                    }
                }
            } else if (value?._astname !== undefined) {
                this.visit(value)
            }
        }
    }
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
    for (const constant of await audioLibrary.getStandardFolders()) {
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
    const yieldHandler = (susp: any) => {
        return new Promise((resolve, reject) => {
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
            }, 0)
        })
    }

    await Sk.misceval.asyncToPromise(() => {
        try {
            return Sk.importModuleInternal_("<stdin>", false, "__main__", code, undefined, false, true)
        } catch (err) {
            esconsole(err, ["error", "runner"])
            throw err
        }
    }, { "Sk.yield": yieldHandler })

    esconsole("Execution finished. Extracting result.", ["debug", "runner"])
    return Sk.ffi.remapToJs(pythonAPI.dawData)
}

// Searches for identifiers that might be sound constants, verifies with the server, and inserts into globals.
async function handleSoundConstantsJS(code: string, interpreter: any) {
    // First, inject sound constants that refer to folders, since the server doesn't handle them on the metadata endpoint.
    const scope = interpreter.getScope().object
    for (const constant of await audioLibrary.getStandardFolders()) {
        interpreter.setProperty(scope, constant, constant)
    }

    const constants: string[] = []

    walk.simple(acorn.parse(code), {
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

    return interpreter
}

// Compile a javascript script.
async function runJavaScript(code: string) {
    esconsole("Running script using JS-Interpreter.", ["debug", "runner"])
    const mainInterpreter = createJsInterpreter(code)
    await handleSoundConstantsJS(code, mainInterpreter)
    try {
        return await runJsInterpreter(mainInterpreter)
    } catch (err) {
        const lineNumber = getLineNumber(mainInterpreter, code, err)
        throwErrorWithLineNumber(err, lineNumber as number)
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
            if (!interpreter.step()) return false
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

// Gets the current line number from the top of the JS-interpreter
// stack trace.
function getLineNumber(interpreter: any, code: string, error: Error) {
    let newLines, start
    if (error.stack!.startsWith("TypeError: undefined")) {
        return null
    } else if (error.stack!.startsWith("ReferenceError")) {
        const name = error.message.split(" is not defined")[0]
        start = code.indexOf(name)
        if (start > 0) {
            newLines = code.slice(0, start).match(/\n/g)
        } else if (start === 0) {
            newLines = []
        }
        return newLines ? newLines.length + 1 : 1
    } else if (interpreter && interpreter.stateStack && interpreter.stateStack.length) {
        // get the character start location from the state stack
        const stack = interpreter.stateStack
        start = stack[stack.length - 1].node.start
        if (start > 0) {
            newLines = code.slice(0, start).match(/\n/g)
        }
        return newLines ? newLines.length + 1 : null
    }
}

function throwErrorWithLineNumber(error: Error | string, lineNumber: number) {
    // JS-interpreter sometimes throws strings
    if (typeof (error) === "string") {
        if (lineNumber) {
            const err = new EvalError(error + " on line " + lineNumber);
            (err as any).lineNumber = lineNumber
        } else {
            throw new EvalError(error)
        }
    } else {
        if (lineNumber) {
            error.message += " on line " + lineNumber;
            (error as any).lineNumber = lineNumber
        }
        throw error
    }
}
