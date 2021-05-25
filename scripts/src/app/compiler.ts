// Compile user scripts.
import audioContext from "./audiocontext"
import * as audioLibrary from "./audiolibrary"
import esconsole from "../esconsole"
import ESMessages from "../data/messages"
import * as ESUtils from "../esutils"
import * as helpers from "../helpers"
import * as pitchshift from "./pitchshifter"
import * as userConsole from "./userconsole"
import { Clip, DAWData, Track } from "./player"
import { AugmentedBuffer } from "./audiolibrary"

export let testRun = false

// After compiling code, go through each clip, load the audio file and
// replace looped ones with multiple clips. Why? Because we don't know
// the length of each audio clip until after compiling (unless we
// loaded the clips before compiling and did this during compilation, but
// that's harder.) Follow up with pitchshifting and setting the result
// length.
export function postCompile(result: DAWData) {
    esconsole("Compiling finishing. Loading audio buffers...", ["debug", "compiler"])

    // check if finish() was called
    if (result["finish"] === undefined || result["finish"] === false) {
        throw new Error("finish() is missing")
    }

    // STEP 1: Load audio buffers and slice them to generate temporary audio constants
    esconsole("Loading buffers.", ["debug", "compiler"])
    return loadBuffersForSampleSlicing(result)

    // STEP 2: Load audio buffers needed for the result
    .then(result => loadBuffers(result))
    .then(buffers => {
        esconsole("Filling in looped sounds.", ["debug", "compiler"])
        return buffers
    // STEP 3: Insert buffers into clips and fix clip loops/effect lengths.
    }).then(buffers => {
        // before fixing the clips, retrieve the clip tempo info from the metadata cache for a special treatment for the MAKEBEAT clips
        result = getClipTempo(result)
        return fixClips(result, buffers)
    // STEP 4: Warn user about overlapping tracks or 
    // effects placed on track with no audio
    }).then(result => {
        checkOverlaps(result)
        checkEffects(result)

        return result
    // STEP 5: Pitchshift tracks that need it.
    }).then(result => {
        esconsole("Handling pitchshifted tracks.", ["debug", "compiler"])
        return handlePitchshift(result)
    // STEP 6: Insert metronome track in the end
    }).then(result => {
        esconsole("Adding metronome track.", ["debug", "compiler"])
        return addMetronome(result)
    // STEP 7: Return the post-compiled result
    }).then(result => {
        // print out string for unit tests
        esconsole(ESUtils.formatResultForTests(result), ["nolog", "compiler"])
        return result
    })
}

// Do not call this manually. This is for synchronizing the userConsole print out with the asyncPitchShift processing.
function recursivePSProcess(promises: Promise<any>[], result: DAWData, i: number) {
    if (i < result.tracks.length) {
        const track = result.tracks[i]

        if (track.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined) {
            const p = pitchshift.pitchshiftClips(track, result.tempo)

            promises.push(p)
            p.then(track => {
                userConsole.status("PITCHSHIFT applied on clips on track " + track["clips"][0]["track"])
                helpers.getNgService("$rootScope").$apply()
                recursivePSProcess(promises, result, i + 1)
            })
        } else {
            recursivePSProcess(promises, result, i + 1)
        }
    }
    return promises
}

// Pitchshift tracks in a result object because we can't yet make pitchshift an effect node.
function handlePitchshift(result: DAWData) {
    esconsole("Begin pitchshifting.", ["debug", "compiler"])

    if (result.tracks.some(t => {
        return t.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined
    })) {
        userConsole.status("Applying PITCHSHIFT on audio clips")
        helpers.getNgService("$rootScope").$apply()
    }

    // This is for synchronizing with userConsole print out
    const promises = recursivePSProcess([], result, 1)

    return Promise.all(promises).then(() => {
        esconsole("Pitchshifting promise resolved.",
                    ["debug", "compiler"])
        return result
    }).catch(e => {
        esconsole(e, ["error", "compiler"])
        throw e
    })
}

// Compile a python script.
export function compilePython(code: string, quality: number) {
    Sk.dateSet = false
    Sk.filesLoaded = false
    //	Added to reset imports
    Sk.sysmodules = new Sk.builtin.dict([])
    Sk.realsyspath = undefined

    Sk.resetCompiler()

    return importPython(code, quality)
}

// Attempts evaluating and replacing undefined names with a placeholder until the actual evaluation later.
function recursiveNameCheckPY(code: string, undefinedNames: string[]): string[] {
    try {
        testRun = true
        Sk.importMainWithBody("<stdin>",false,code,true)
    } catch (e) {
        if (e.tp$name && e.tp$name === "NameError") {
            const undefinedName = e.toString().split("'")[1]

            // Create a dummy constant and repeat.
            Sk.builtins[undefinedName] = Sk.ffi.remapToPy(undefinedName)

            if (undefinedNames.indexOf(undefinedName) === -1)
            {
                undefinedNames.push(undefinedName)
                return recursiveNameCheckPY(code, undefinedNames)
            }

        }
    } finally {
        testRun = false
    }
    return undefinedNames
}

// Collects user-defined names (e.g., audio clips) for later verificaiton. The lines containing readInput, etc. API are skipped, as they should not be evaluated until the actual compilation.
function handleUndefinedNamesPY(code: string, bypass: boolean) {
    if (bypass) {
        return Promise.resolve()
    }
    esconsole("Iterating through undefined variable names.")

    const undefinedNames = recursiveNameCheckPY(code, [])
    for (const name of undefinedNames) {
        delete Sk.builtins[name]
    }

    Sk.resetCompiler()

    return Promise.all(undefinedNames.map(audioLibrary.verifyClip)).then(result => {
        for (const dataIfExist of result) {
            if (dataIfExist) {
                Sk.builtins[dataIfExist.file_key] = Sk.ffi.remapToPy(dataIfExist.file_key)
            }
        }
    })
}

// Imports the given python code into Skulpt as the __main__ module. Doesn't
// reset the compiler though so it can be run inside another compiled
// Python script (i.e., in the autograder.) For most use cases you should use
// compilePython() instead and ignore this function.
export function importPython(code: string, quality: number) {
    esconsole(`Loading EarSketch library from: ${SITE_BASE_URI}/scripts/src/api/earsketch.py.js`)

    Sk.externalLibraries = {
        // import EarSketch library into skulpt
        earsketch : {
            path: `${SITE_BASE_URI}/scripts/src/api/earsketch.py.js?v=${BUILD_NUM}&ext=.py.js`
        }
    }

    // special cases with these key functions when import ES module is missing
    // this hack is only for the user guidance
    Sk.builtins["init"] = new Sk.builtin.func(() => {
        throw new Error("init()" + ESMessages.interpreter.noimport)
    })
    Sk.builtins["finish"] = new Sk.builtin.func(() => {
        throw new Error("finish()" + ESMessages.interpreter.noimport)
    })
    Sk.builtins["__AUDIO_QUALITY"] = false

    // A temporary switch for disabling the lazy evaluation of undefined names. analyze~ methods may be possibly excluded from the escape list, but they might have unexpected behaviors when combined with conditionals.
    const escapeWords = /readInput|raw_input|input|import random|analyzeTrackForTime|analyzeTrack|analyzeForTime|analyze|dur/
    const bypassOptimization = !FLAGS.LAZY_SCRIPT_COMPILER || escapeWords.test(code)
    esconsole("Using lazy name loading: " + !bypassOptimization, ["compiler", "debug"])
    const getTagsFn = bypassOptimization ? audioLibrary.getAllTags : audioLibrary.getDefaultTags

    return handleUndefinedNamesPY(code, bypassOptimization).then(() => {
        const lines = code.match(/\n/g) ? code.match(/\n/g)!.length + 1 : 1
        esconsole("Compiling " + lines + " lines of Python", ["debug", "compiler"])

        // printing for unit tests
        esconsole(ESUtils.formatScriptForTests(code), ["nolog", "compiler"])

        // STEP 1: get a list of constants from the server and inject them into
        // the skulpt list of builtins
        return getTagsFn().then(tags => {
            esconsole("Finished fetching audio tags", ["debug","compiler"])
            // after loading audio tags, compile the script

            // inject audio constants into the skulpt builtin globals
            // TODO: come up with a proper solution for doing this in Skulpt
            // https://groups.google.com/forum/#!topic/skulpt/6C_TnxnP8P0
            for (const i in tags) {
                if (tags.hasOwnProperty(i)) {
                    const tag = tags[i]
                    if (!(tag in Sk.builtins)) {
                        Sk.builtins[tag] = Sk.ffi.remapToPy(tag)
                    }
                }
            }

            // inject audio quality as a builtin global, again not the ideal
            // solution but it works
            Sk.builtins["__AUDIO_QUALITY"] = quality
        }).catch(err => {
            esconsole(err, ["error", "compiler"])
            throw new Error("Failed to load audio tags from the server.")
        // STEP 2: compile python code using Skulpt
        }).then(() => {
            esconsole("Compiling script using Skulpt.", ["debug", "compiler"])
            return Sk.misceval.asyncToPromise(() => {
                try {
                    return Sk.importModuleInternal_("<stdin>", false, "__main__", code, true)
                } catch (err) {
                    esconsole(err, ["error", "compiler"])
                    throw err
                }
            })
        }).then(mod => {
            esconsole("Compiling finished. Extracting result.", ["debug", "compiler"])

            if (mod.$d.earsketch && mod.$d.earsketch.$d._getResult) {
                // case: import earsketch
                return Sk.ffi.remapToJs(Sk.misceval.call(mod.$d.earsketch.$d._getResult))
            } else if (mod.$d._getResult) {
                // case: from earsketch import *
                return Sk.ffi.remapToJs(Sk.misceval.call(mod.$d._getResult))
            } else {
                throw new ReferenceError("Something went wrong. Skulpt did not provide the expected output.")
            }
        // STEP 4: Perform post-compilation steps on the result object
        }).then(result => {
            esconsole("Performing post-compilation steps.", ["debug", "compiler"])
            return postCompile(result)
        // STEP 5: finally return the result
        }).then(result => {
            esconsole("Post-compilation steps finished. Return result.", ["debug", "compiler"])
            return result
        })
    })
}


// The functions `recursiveNameCheckJS`, `handleUndefinedNamesJS`, and `createJSInterpreter` were introduced
// to check the validity of code structure while skipping unknown names (e.g., user-defined audio clips) for later verification at compilation.
// The JS version uses a duplicate "sub" interpreter as the state of main interpreter seems not resettable.
function recursiveNameCheckJS(code: string, undefinedNames: string[], tags: string[], quality: number): string[] {
    const interpreter = createJsInterpreter(code, tags, quality)
    for (const name of undefinedNames) {
        interpreter.setProperty(interpreter.getScope().object, name, name)
    }
    try {
        testRun = true
        runJsInterpreter(interpreter)
    } catch (e) {
        if (e instanceof ReferenceError) {
            const name = e.message.replace(" is not defined","")
            // interpreter.setProperty(scope, name, name)
            undefinedNames.push(name)
            return recursiveNameCheckJS(code, undefinedNames, tags, quality)
        }
    } finally {
        testRun = false
    }
    return undefinedNames
}

function handleUndefinedNamesJS(code: string, interpreter: any, tags: string[], quality: number) {
    esconsole("Iterating through undefined variable names.", ["compiler", "debug"])

    const undefinedNames = recursiveNameCheckJS(code, [], tags, quality)
    return Promise.all(undefinedNames.map(audioLibrary.verifyClip)).then(result => {
        for (const dataIfExist of result) {
            if (dataIfExist) {
                interpreter.setProperty(
                    interpreter.getScope().object,
                    dataIfExist.file_key,
                    dataIfExist.file_key
                )
            }
        }
    })
}

function createJsInterpreter(code: string, tags: string[], quality: number) {
    let interpreter
    try {
        interpreter = new Interpreter(code, ES_JAVASCRIPT_API)
    } catch (e) {
        if (e.loc !== undefined) {
            // acorn provides line numbers for syntax errors
            e.message += " on line " + e.loc.line
            e.lineNumber = e.loc.line
        }
        throw e
    }

    // inject audio constants into the interpreter scope
    for (const i in tags) {
        if (tags.hasOwnProperty(i)) {
            const tag = tags[i]
            interpreter.setProperty(interpreter.getScope().object, tag, tag)
        }
    }
    // inject audio quality into the interpreter scope
    interpreter.setProperty(interpreter.getScope().object, "__AUDIO_QUALITY", quality)

    return interpreter
}


// Compile a javascript script.
export function compileJavascript(code: string, quality: number) {
    // printing for unit tests
    esconsole(ESUtils.formatScriptForTests(code), ["nolog", "compiler"])

    // A temporary switch for disabling the lazy evaluation of undefined names.
    const escapeWords = /Math\.random|readInput|analyzeTrackForTime|analyzeTrack|analyzeForTime|analyze|dur/
    const bypassOptimization = !FLAGS.LAZY_SCRIPT_COMPILER || escapeWords.test(code)
    esconsole("Using lazy name loading: " + !bypassOptimization, ["compiler", "debug"])
    const getTagsFn = bypassOptimization ? audioLibrary.getAllTags : audioLibrary.getDefaultTags

    return getTagsFn().then(tags => {
        // after loading audio tags, compile the script
        esconsole("Finished fetching audio tags", ["debug", "compiler"])

        esconsole("Compiling script using JS-Interpreter.", ["debug", "compiler"])

        if (bypassOptimization) {
            let interpreter
            try {
                interpreter = new Interpreter(code, ES_JAVASCRIPT_API)
            } catch (e) {
                if (e.loc !== undefined) {
                    // acorn provides line numbers for syntax errors
                    e.message += " on line " + e.loc.line
                    e.lineNumber = e.loc.line
                }
                throw e
            }

            // inject audio constants into the interpreter scope
            for (const i in tags) {
                if (tags.hasOwnProperty(i)) {
                    const tag = tags[i]
                    interpreter.setProperty(interpreter.getScope().object, tag, tag)
                }
            }
            // inject audio quality into the interpreter scope
            interpreter.setProperty(interpreter.getScope().object, "__AUDIO_QUALITY", quality)

            try {
                return runJsInterpreter(interpreter); // result
            } catch(e) {
                const lineNumber = getLineNumber(interpreter, code, e)
                throwErrorWithLineNumber(e, lineNumber as number)
            }
        } else {
            const mainInterpreter = createJsInterpreter(code, tags, quality)
            return handleUndefinedNamesJS(code, mainInterpreter, tags, quality).then(() => {
                try {
                    return runJsInterpreter(mainInterpreter); // result
                } catch(e) {
                    const lineNumber = getLineNumber(mainInterpreter, code, e)
                    throwErrorWithLineNumber(e, lineNumber as number)
                }
            })
        }
    }).then(result => {
        esconsole("Performing post-compilation steps.", ["debug", "compiler"])
        return postCompile(result)
    }).then(result => {
        esconsole("Post-compilation steps finished. Return result.", ["debug", "compiler"])
        return result
    })
}

// This is a helper function for running JS-Interpreter to handle
// breaks in execution due to asynchronous calls. When an asynchronous
// call is received, the interpreter will break execution and return true,
// so we'll set a timeout to wait 200 ms and then try again until the
// asynchronous calls are finished.
function runJsInterpreter(interpreter: any) {
    if (!interpreter.run()) {
        if (interpreter.__ES_FINISHED !== undefined) {
            esconsole("Compiling finished. Extracting result.", ["debug", "compiler"])
            return interpreter.__ES_FINISHED; // result
        } else {
            throw new EvalError(
                "Missing call to finish() or something went wrong."
            )
        }
    } else {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve(runJsInterpreter(interpreter))
                } catch(e) {
                    reject(e)
                }
            }, 200)
        })
    }
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
        start = stack[stack.length-1].node.start
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

function getClipTempo(result: DAWData) {
    const metadata = audioLibrary.cache.sounds
    const tempoCache: { [key: string]: number } = {}

    result.tracks.forEach(track => {
        track.clips.forEach(clip => {
            if (tempoCache.hasOwnProperty(clip.filekey)) {
                clip.tempo = tempoCache[clip.filekey]
            } else {
                const match = metadata.find(item => {
                    return item.file_key === clip.filekey
                })
                if (typeof match !== "undefined") {
                    let tempo = parseInt(match.tempo)
                    tempo = isNaN(tempo) ? -1 : tempo
                    clip.tempo = tempo
                    tempoCache[clip.filekey] = tempo
                }
            }
        })
    })

    return result
}

function loadBuffers(result: DAWData) {
    // first load all the buffers necessary
    const promises = []
    for (const i in result.tracks) {
        const track = result.tracks[i]
        for (const j in track.clips) {
            const clip = track.clips[j]
            const tempo = result.tempo
            const promise = audioLibrary.getAudioClip(
                clip.filekey,
                tempo,
                result.quality
            )
            promises.push(promise)
        }
    }

    return Promise.all(promises).then(buffers => {
        const map: { [key: string]: AudioBuffer } = {}
        for (const buffer of buffers) {
            map[buffer.filekey] = buffer
        }
        return map
    })
}

export function loadBuffersForSampleSlicing(result: DAWData) {
    // first load all the buffers necessary
    const promises = []
    const sliceKeys: string[] = []

    for (const sliceKey in result.slicedClips) {
        sliceKeys.push(sliceKey)
        const sliceDef = result.slicedClips[sliceKey]

        const promise = audioLibrary.getAudioClip(
            sliceDef.sourceFile,
            result.tempo,
            result.quality
        )
        promises.push(promise)
    }

    return Promise.all(promises).then(buffers => {
        for (let i = 0; i < buffers.length; i++) {
            const sliceKey = sliceKeys[i]
            const def = result.slicedClips[sliceKey]
            const buffer = sliceAudioBufferByMeasure(buffers[i], def.start, def.end, result.tempo)
            audioLibrary.cacheSlicedClip(sliceKey, result.tempo, result.quality, buffer as AugmentedBuffer)
        }
        return result
    })
}

// Slice a buffer to create a new temporary sound constant.
//   start - the start of the sound, in measures (relative to 1 being the start of the sound)
//   end - the end of the sound, in measures (relative to 1 being the start of the sound)
function sliceAudioBufferByMeasure(buffer: AugmentedBuffer, start: number, end: number, tempo: number) {
    const lengthInBeats = (end - start) * 4  // 4 beats per measure
    const lengthInSeconds = lengthInBeats * (60.0/tempo)
    const lengthInSamples = lengthInSeconds * buffer.sampleRate

    const slicedBuffer =  audioContext.createBuffer(buffer.numberOfChannels, lengthInSamples, buffer.sampleRate)

    // Sample range which will be extracted from the original buffer
    // Subtract 1 from start, end because measures are 1-indexed
    const startSamp = (start-1) * 4 * (60.0/tempo) * buffer.sampleRate
    const endSamp = (end-1) * 4 * (60.0/tempo) * buffer.sampleRate

    if (endSamp > buffer.length) {
        throw new RangeError(`End of slice at ${end} reaches past end of sample ${buffer.filekey}`)
    }

    for (let i = 0; i < buffer.numberOfChannels; i++){
        const newBufferData = slicedBuffer.getChannelData(i)
        const originalBufferData = buffer.getChannelData(i).slice(startSamp, endSamp)

        const copyLen = Math.min(newBufferData.length, originalBufferData.length)
        for (let k = 0; k < copyLen; k++) {
            newBufferData[k] = originalBufferData[k]
        }
    }
    return slicedBuffer
}

// Fill in looped clips with multiple clips, and adjust effects with end == 0.
function fixClips(result: DAWData, buffers: { [key: string]: AudioBuffer }) {
    // step 1: fill in looped clips
    result.length = 0
    for (const i in result.tracks) {
        const track = result.tracks[i]
        track.analyser = audioContext.createAnalyser()
        for (const j in track.clips) {
            const clip = track.clips[j]

            const buffer = buffers[clip.filekey]
            // add the buffer property
            clip.audio = buffer

            // calculate the measure length of the clip
            const duration = ESUtils.timeToMeasure(
                buffer.duration, result.tempo
            )

            // by default, increment the repeating clip position by the clip duration
            let posIncr = duration

            // if the clip does not have the original tempo, override the incremental size to be a quarter note, half note, a measure, etc.
            if (clip.tempo === -1) {
                let exp = -2

                while (duration > Math.pow(2, exp)) {
                    // stop adjusting at exp=4 -> 16 measures
                    if (exp >= 4) {
                        break
                    } else {
                        exp++
                    }
                }

                if (duration <= Math.pow(2, exp)) {
                    posIncr = Math.pow(2, exp)
                }
            }

            // if the clip end value is 0, set it to the duration
            // this fixes API calls insertMedia, etc. that don't
            // know the clip length ahead of time
            if (clip.end === 0) {
                clip.end = 1 + duration
            }

            // calculate the remaining amount of time to fill
            let leftover = clip.end - clip.start - posIncr

            // figure out how long the result is
            result.length = Math.max(
                result.length,
                clip.measure + (clip.end - clip.start) + clip.silence - 1
            )

            // update the source clip to reflect the new length
            clip.end = Math.min(1+duration, clip.end)
            clip.loopChild = false

            // add clips to fill in empty space
            let k = 1
            //the minimum measure length for which extra clips will be added to fill in the gap
            const fillableGapMinimum = 0.01
            while (leftover > fillableGapMinimum && clip.loop) {
                track.clips.push({
                    filekey: clip.filekey,
                    audio: clip.audio,
                    track: clip.track,
                    measure: clip.measure + (k * posIncr),
                    start: 1,
                    end: 1 + Math.min(duration, leftover),
                    scale: clip.scale,
                    loop: clip.loop,
                    loopChild: true
                } as unknown as Clip)
                leftover -= Math.min(posIncr, leftover)
                k++
            }
        }

        // fix effect lengths
        for (const key in track.effects) {
            if (track.effects.hasOwnProperty(key)) {
                const effects = track.effects[key]
                effects.sort((a, b) => {
                    if (a.startMeasure < b.startMeasure) {
                        return -1
                    } else if (a.startMeasure > b.startMeasure) {
                        return 1
                    } else {
                        return 0
                    }
                })
                let endMeasureIfEmpty = result.length + 1
                for (let j = effects.length-1; j >= 0; j--) {
                    const effect = effects[j]
                    if (effect.endMeasure === 0) {
                        if (effect.startMeasure > endMeasureIfEmpty) {
                            effect.endMeasure = effect.startMeasure
                        } else {
                            if (effects[j+1]) {
                                effect.endMeasure = effects[j+1].startMeasure
                            } else {
                                effect.endMeasure = endMeasureIfEmpty
                            }
                        }
                        endMeasureIfEmpty = effect.startMeasure
                    }
                }

                // if the automation start in the middle, it should fill the time before with the startValue of the earliest automation
                if (effects[0].startMeasure > 1) {
                    const fillEmptyStart = Object.assign({}, effects[0]); // clone the earliest effect automation
                    fillEmptyStart.startMeasure = 1
                    fillEmptyStart.endMeasure = effects[0].startMeasure
                    fillEmptyStart.startValue = effects[0].startValue
                    fillEmptyStart.endValue = effects[0].startValue
                    effects.unshift(fillEmptyStart)
                }
            }
        }
    }

    return result
}

// Warn users when a clips overlap each other. Done in post-compile because
// we don't know the length of clips until then.
function checkOverlaps(result: DAWData) {
    const truncateDigits = 5; // workaround for precision errors
    const margin = 0.001

    for (let i = 0; i < result.tracks.length; i++) {
        const track = result.tracks[i]
        for (let j = 0; j < track.clips.length; j++) {
            const clip = track.clips[j]
            for (let k = 0; k < track.clips.length; k++) {
                if (k == j) continue
                const sibling = track.clips[k]
                const clipLeft = clip.measure
                const clipRight = clip.measure + ESUtils.truncate(clip.end - clip.start, truncateDigits)
                const siblingLeft = sibling.measure
                const siblingRight = sibling.measure +
                    ESUtils.truncate(sibling.end - sibling.start, truncateDigits)
                if (clipLeft >= siblingLeft && clipLeft < (siblingRight-margin)) {
                    esconsole([clip, sibling], "compiler")
                    userConsole.warn(
                        "Overlapping clips " + clip.filekey + " and "
                        + sibling.filekey + " on track " + clip.track
                    )
                    userConsole.warn("Removing the right-side overlap")
                    track.clips.splice(j, 1)
                } else if (clipRight > (siblingLeft+margin) && clipRight <= siblingRight) {
                    esconsole([clip, sibling], "compiler")
                    userConsole.warn(
                        "Overlapping clips " + clip.filekey + " and "
                        + sibling.filekey + " on track " + clip.track
                    )
                    userConsole.warn("Removing the right-side overlap")
                    track.clips.splice(k, 1)
                }
            }
        }
    }
}

// Warn users when a track contains effects, but no audio. Done in post-compile 
// because we don't know if there are audio samples on the entire track
// until then. (Moved from passthrough.js)
function checkEffects(result: DAWData) {
    for (let i = 0; i < result.tracks.length; i++) {
        const track = result.tracks[i]
        const clipCount = track.clips.length
        const effectCount  = Object.keys(track.effects).length

        if (effectCount > 0 && clipCount == 0) {
            userConsole.warn(ESMessages.dawservice.effecttrackwarning + ` (Track ${i})`)
        }
    }
}

// Adds a metronome as the last track of a result.
function addMetronome(result: DAWData) {
    return Promise.all([
        audioLibrary.getAudioClip("METRONOME01", -1, result.quality),
        audioLibrary.getAudioClip("METRONOME02", -1, result.quality)
    ]).then(r => {
        const track = {clips:[] as Clip[],effects:[], analyser: null as AnalyserNode | null}
        for (let i = 1; i < result.length+1; i+=0.25) {
            let filekey = i % 1 === 0 ? "METRONOME01" : "METRONOME02"
            let audio = i % 1 === 0 ? r[0] : r[1]
            track.clips.push({
                filekey: filekey,
                audio: audio,
                track: result.tracks.length,
                measure: i,
                start: 1,
                end: 1.625,
                scale: false,
                loop: false,
                loopChild: false
            } as unknown as Clip)
        }
        // the metronome needs an analyzer too to prevent errors in player
        track.analyser = audioContext.createAnalyser()
        result.tracks.push(track as unknown as Track)
        return result
    })
}