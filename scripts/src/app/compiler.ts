// Compile user scripts.
import audioContext from "./audiocontext"
import * as audioLibrary from "./audiolibrary"
import setupJavascriptAPI, { remapToNativeJs } from "../api/earsketch.js"
import setupPythonAPI from "../api/earsketch.py"
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
export async function postCompile(result: DAWData) {
    esconsole("Compiling finishing. Loading audio buffers...", ["debug", "compiler"])
    // NOTE: We used to check if `finish()` was called (by looking at result.finish) and throw an error if not.
    // However, since `finish()` doesn't actually do anything (other than set this flag), we no longer check.
    // (Apparently `finish()` is an artifact of EarSketch's Reaper-based incarnation.)

    // STEP 1: Load audio buffers and slice them to generate temporary audio constants.
    esconsole("Loading buffers.", ["debug", "compiler"])
    result = await loadBuffersForSampleSlicing(result)
    // STEP 2: Load audio buffers needed for the result.
    const buffers = await loadBuffers(result)
    esconsole("Filling in looped sounds.", ["debug", "compiler"])
    // STEP 3: Insert buffers into clips and fix clip loops/effect lengths.
    // before fixing the clips, retrieve the clip tempo info from the metadata cache for a special treatment for the MAKEBEAT clips
    result = fixClips(getClipTempo(result), buffers)
    // STEP 4: Warn user about overlapping tracks or effects placed on tracks with no audio.
    checkOverlaps(result)
    checkEffects(result)
    // STEP 5: Pitchshift tracks that need it.
    esconsole("Handling pitchshifted tracks.", ["debug", "compiler"])
    result = await handlePitchshift(result)
    // STEP 6: Insert metronome as the last track.
    esconsole("Adding metronome track.", ["debug", "compiler"])
    result = await addMetronome(result)
    // STEP 7: Print out string for unit tests, return the post-compiled result.
    esconsole(ESUtils.formatResultForTests(result), ["nolog", "compiler"])
    return result
}

// Pitchshift tracks in a result object because we can't yet make pitchshift an effect node.
async function handlePitchshift(result: DAWData) {
    esconsole("Begin pitchshifting.", ["debug", "compiler"])

    if (result.tracks.some(t => t.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined)) {
        userConsole.status("Applying PITCHSHIFT on audio clips")
        helpers.getNgService("$rootScope").$apply()
    }

    // Synchronize the userConsole print out with the asyncPitchShift processing.
    try {
        for (const track of result.tracks.slice(1)) {
            if (track.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined) {
                await pitchshift.pitchshiftClips(track, result.tempo)
                userConsole.status("PITCHSHIFT applied on clips on track " + track.clips[0].track)
                helpers.getNgService("$rootScope").$apply()
            }
        }
        esconsole("Pitchshifting promise resolved.", ["debug", "compiler"])
        return result
    } catch (err) {
        esconsole(err, ["error", "compiler"])
        throw err
    }
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

function runPythonCode(code: string) {
    Sk.resetCompiler()
    setupPythonAPI()
    return Sk.importModuleInternal_("<stdin>", false, "__main__", code, undefined, false, true)
}

// Attempts evaluating and replacing undefined names with a placeholder until the actual evaluation later.
// TODO: This probably does not need to be recursive.
function recursiveNameCheckPY(code: string, undefinedNames: string[]): string[] {
    try {
        testRun = true
        runPythonCode(code)
    } catch (e) {
        if (e.tp$name && e.tp$name === "NameError") {
            const undefinedName = e.toString().split("'")[1]

            // Create a dummy constant and repeat.
            Sk.builtins[undefinedName] = Sk.ffi.remapToPy(undefinedName)

            if (undefinedNames.indexOf(undefinedName) === -1) {
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
async function handleUndefinedNamesPY(code: string) {
    esconsole("Iterating through undefined variable names.")

    const undefinedNames = recursiveNameCheckPY(code, [])
    for (const name of undefinedNames) {
        delete Sk.builtins[name]
    }

    Sk.resetCompiler()

    const clipData = await Promise.all(undefinedNames.map(audioLibrary.verifyClip))
    for (const clip of clipData) {
        if (clip) {
            Sk.builtins[clip.file_key] = Sk.ffi.remapToPy(clip.file_key)
        }
    }
}

// Imports the given python code into Skulpt as the __main__ module. Doesn't
// reset the compiler though so it can be run inside another compiled
// Python script (i.e., in the autograder.) For most use cases you should use
// compilePython() instead and ignore this function.
export async function importPython(code: string, quality: number) {
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

    if (!bypassOptimization) {
        await handleUndefinedNamesPY(code)
    }
    const lines = code.match(/\n/g) ? code.match(/\n/g)!.length + 1 : 1
    esconsole("Compiling " + lines + " lines of Python", ["debug", "compiler"])
    // printing for unit tests
    esconsole(ESUtils.formatScriptForTests(code), ["nolog", "compiler"])

    // STEP 1: get a list of constants from the server and inject them into the skulpt list of builtins
    let tags
    try {
        tags = await getTagsFn()
    } catch (err) {
        esconsole(err, ["error", "compiler"])
        throw new Error("Failed to load audio tags from the server.")
    }
    esconsole("Finished fetching audio tags", ["debug", "compiler"])
    // after loading audio tags, compile the script

    // inject audio constants into the skulpt builtin globals
    // TODO: come up with a proper solution for doing this in Skulpt
    // https://groups.google.com/forum/#!topic/skulpt/6C_TnxnP8P0
    for (const tag of tags) {
        if (!(tag in Sk.builtins)) {
            Sk.builtins[tag] = Sk.ffi.remapToPy(tag)
        }
    }

    // inject audio quality as a builtin global, again not the ideal
    // solution but it works
    Sk.builtins["__AUDIO_QUALITY"] = quality
    // STEP 2: compile python code using Skulpt
    esconsole("Compiling script using Skulpt.", ["debug", "compiler"])
    const mod = await Sk.misceval.asyncToPromise(() => {
        try {
            return runPythonCode(code)
        } catch (err) {
            esconsole(err, ["error", "compiler"])
            throw err
        }
    })
    esconsole("Compiling finished. Extracting result.", ["debug", "compiler"])

    let result
    if (mod.$d.earsketch && mod.$d.earsketch.$d._getResult) {
        // case: import earsketch
        result = Sk.ffi.remapToJs(Sk.misceval.call(mod.$d.earsketch.$d._getResult))
    } else if (mod.$d._getResult) {
        // case: from earsketch import *
        result = Sk.ffi.remapToJs(Sk.misceval.call(mod.$d._getResult))
    } else {
        throw new ReferenceError("Something went wrong. Skulpt did not provide the expected output.")
    }
    // STEP 4: Perform post-compilation steps on the result object
    esconsole("Performing post-compilation steps.", ["debug", "compiler"])
    result = await postCompile(result)
    // STEP 5: finally return the result
    esconsole("Post-compilation steps finished. Return result.", ["debug", "compiler"])
    return result
}


// The functions `recursiveNameCheckJS`, `handleUndefinedNamesJS`, and `createJSInterpreter` were introduced
// to check the validity of code structure while skipping unknown names (e.g., user-defined audio clips) for later verification at compilation.
// The JS version uses a duplicate "sub" interpreter as the state of main interpreter seems not resettable.
// TODO: This probably does not need to be recursive.
async function recursiveNameCheckJS(code: string, undefinedNames: string[], tags: string[], quality: number): Promise<string[]> {
    const interpreter = createJsInterpreter(code, tags, quality)
    for (const name of undefinedNames) {
        interpreter.setProperty(interpreter.getScope().object, name, name)
    }
    try {
        testRun = true
        await runJsInterpreter(interpreter)
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

async function handleUndefinedNamesJS(code: string, interpreter: any, tags: string[], quality: number) {
    esconsole("Iterating through undefined variable names.", ["compiler", "debug"])

    const undefinedNames = await recursiveNameCheckJS(code, [], tags, quality)
    const clipData = await Promise.all(undefinedNames.map(audioLibrary.verifyClip))
    for (const clip of clipData) {
        if (clip) {
            interpreter.setProperty(interpreter.getScope().object, clip.file_key, clip.file_key)
        }
    }
}

function createJsInterpreter(code: string, tags: string[], quality: number) {
    let interpreter
    try {
        interpreter = new Interpreter(code, setupJavascriptAPI)
    } catch (e) {
        if (e.loc !== undefined) {
            // acorn provides line numbers for syntax errors
            e.message += " on line " + e.loc.line
            e.lineNumber = e.loc.line
        }
        throw e
    }

    // inject audio constants into the interpreter scope
    for (const tag of tags) {
        interpreter.setProperty(interpreter.getScope().object, tag, tag)
    }
    // inject audio quality into the interpreter scope
    interpreter.setProperty(interpreter.getScope().object, "__AUDIO_QUALITY", quality)

    return interpreter
}


// Compile a javascript script.
export async function compileJavascript(code: string, quality: number) {
    // printing for unit tests
    esconsole(ESUtils.formatScriptForTests(code), ["nolog", "compiler"])

    // A temporary switch for disabling the lazy evaluation of undefined names.
    // TODO: Update this if we remove `prompt`, which is currently an alias for `readInput` in the JS API.
    const escapeWords = /Math\.random|readInput|prompt|analyzeTrackForTime|analyzeTrack|analyzeForTime|analyze|dur/
    const bypassOptimization = !FLAGS.LAZY_SCRIPT_COMPILER || escapeWords.test(code)
    esconsole("Using lazy name loading: " + !bypassOptimization, ["compiler", "debug"])
    const getTagsFn = bypassOptimization ? audioLibrary.getAllTags : audioLibrary.getDefaultTags

    const tags = await getTagsFn()
    // after loading audio tags, compile the script
    esconsole("Finished fetching audio tags", ["debug", "compiler"])
    esconsole("Compiling script using JS-Interpreter.", ["debug", "compiler"])

    let result
    if (bypassOptimization) {
        let interpreter
        try {
            interpreter = new Interpreter(code, setupJavascriptAPI)
        } catch (err) {
            if (err.loc !== undefined) {
                // acorn provides line numbers for syntax errors
                err.message += " on line " + err.loc.line
                err.lineNumber = err.loc.line
            }
            throw err
        }

        // inject audio constants into the interpreter scope
        for (const tag of tags) {
            interpreter.setProperty(interpreter.getScope().object, tag, tag)
        }
        // inject audio quality into the interpreter scope
        interpreter.setProperty(interpreter.getScope().object, "__AUDIO_QUALITY", quality)

        try {
            result = await runJsInterpreter(interpreter)
        } catch (err) {
            const lineNumber = getLineNumber(interpreter, code, err)
            throwErrorWithLineNumber(err, lineNumber as number)
        }
    } else {
        const mainInterpreter = createJsInterpreter(code, tags, quality)
        await handleUndefinedNamesJS(code, mainInterpreter, tags, quality)
        try {
            result = await runJsInterpreter(mainInterpreter)
        } catch (err) {
            const lineNumber = getLineNumber(mainInterpreter, code, err)
            throwErrorWithLineNumber(err, lineNumber as number)
        }
    }
    esconsole("Performing post-compilation steps.", ["debug", "compiler"])
    const finalResult = postCompile(result)
    esconsole("Post-compilation steps finished. Return result.", ["debug", "compiler"])
    return finalResult
}


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// This is a helper function for running JS-Interpreter to handle
// breaks in execution due to asynchronous calls. When an asynchronous
// call is received, the interpreter will break execution and return true,
// so we'll set a timeout to wait 200 ms and then try again until the
// asynchronous calls are finished.
// TODO: Why 200 ms? Can this be simplified?
async function runJsInterpreter(interpreter: any) {
    while (interpreter.run()) {
        await sleep(200)
    }
    const result = interpreter.getProperty(interpreter.scope, '__ES_RESULT')
    if (result === undefined) {
        throw new EvalError("Missing call to init() or something went wrong.")
    }
    esconsole("Compiling finished. Extracting result.", ["debug", "compiler"])
    return remapToNativeJs(result)
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

async function loadBuffers(result: DAWData) {
    const promises = []
    for (const track of result.tracks) {
        for (const clip of track.clips) {
            const tempo = result.tempo
            const promise = audioLibrary.getAudioClip(
                clip.filekey,
                tempo,
                result.quality
            )
            promises.push(promise)
        }
    }

    const buffers = await Promise.all(promises)
    const map: { [key: string]: AudioBuffer } = {}
    for (const buffer of buffers) {
        map[buffer.filekey] = buffer
    }
    return map
}

export async function loadBuffersForSampleSlicing(result: DAWData) {
    const promises = []
    const sliceKeys: string[] = []

    for (const [sliceKey, sliceDef] of Object.entries(result.slicedClips)) {
        sliceKeys.push(sliceKey)

        const promise = audioLibrary.getAudioClip(
            sliceDef.sourceFile,
            result.tempo,
            result.quality
        )
        promises.push(promise)
    }

    const buffers = await Promise.all(promises)
    for (let i = 0; i < buffers.length; i++) {
        const sliceKey = sliceKeys[i]
        const def = result.slicedClips[sliceKey]
        const buffer = sliceAudioBufferByMeasure(buffers[i], def.start, def.end, result.tempo)
        audioLibrary.cacheSlicedClip(sliceKey, result.tempo, result.quality, buffer as AugmentedBuffer)
    }
    return result
}

// Slice a buffer to create a new temporary sound constant.
//   start - the start of the sound, in measures (relative to 1 being the start of the sound)
//   end - the end of the sound, in measures (relative to 1 being the start of the sound)
function sliceAudioBufferByMeasure(buffer: AugmentedBuffer, start: number, end: number, tempo: number) {
    const lengthInBeats = (end - start) * 4  // 4 beats per measure
    const lengthInSeconds = lengthInBeats * (60.0/tempo)
    const lengthInSamples = lengthInSeconds * buffer.sampleRate

    const slicedBuffer = audioContext.createBuffer(buffer.numberOfChannels, lengthInSamples, buffer.sampleRate)

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
        // TODO: Isn't there a function in the Web Audio API for this?
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
    for (const track of result.tracks) {
        track.analyser = audioContext.createAnalyser()
        // NOTE: This loop pushes onto the array. We don't want to iterate over the new elements, so we slice() here.
        for (const clip of track.clips.slice()) {
            const buffer = buffers[clip.filekey]
            clip.audio = buffer
            let duration, posIncr

            // if the clip does not have the original tempo, override the incremental size to be a quarter note, half note, a measure, etc.
            if (clip.tempo === -1) {
                // by default, increment the repeating clip position by the clip duration
                posIncr = duration = ESUtils.timeToMeasure(buffer.duration, result.tempo)
                let exp = -2

                // stop adjusting at exp=4 -> 16 measures
                while (duration > Math.pow(2, exp) && exp < 4) {
                    exp++
                }

                if (duration <= Math.pow(2, exp)) {
                    posIncr = Math.pow(2, exp)
                }
            } else {
                // Tempo specified: round to the nearest sixteenth note.
                // This corrects for imprecision in dealing with integer numbers of samples,
                // and helps with user-uploaded MP3, which deviate from the intended length after encoding & decoding.
                // E.g.: A wave file of one measure at 88 bpm, 44.1kHz has 120273 samples;
                // converting it to a mp3 and decoding yields 119808 samples,
                // meaning it falls behind by ~0.01 seconds per loop.
                const actualLengthInQuarters = buffer.duration / 60 * result.tempo
                const actualLengthInSixteenths = actualLengthInQuarters * 4
                // NOTE: This prevents users from using samples which have intentionally weird lenghts,
                // like 33 32nd notes, as they will be rounded to the nearest 16th.
                // This has been deemed an acceptable tradeoff for fixing unintentional loop drift.
                const targetLengthInSixteenths = Math.round(actualLengthInSixteenths)
                const targetLengthInQuarters = targetLengthInSixteenths / 4
                duration = posIncr = targetLengthInQuarters / 4
            }

            // if the clip end value is 0, set it to the duration
            // this fixes API calls insertMedia, etc. that don't
            // know the clip length ahead of time
            if (clip.end === 0) {
                clip.end = duration + 1
            }

            // calculate the remaining amount of time to fill
            let leftover = clip.end - clip.start - posIncr

            // figure out how long the result is
            result.length = Math.max(
                result.length,
                clip.measure + (clip.end - clip.start) + clip.silence - 1
            )

            // update the source clip to reflect the new length
            clip.end = Math.min(duration + 1, clip.end)
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
        for (const effects of Object.values(track.effects)) {
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
            for (let j = effects.length - 1; j >= 0; j--) {
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

    return result
}

// Warn users when a clips overlap each other. Done in post-compile because
// we don't know the length of clips until then.
function checkOverlaps(result: DAWData) {
    const truncateDigits = 5  // workaround for precision errors
    const margin = 0.001

    for (const track of result.tracks) {
        for (let j = 0; j < track.clips.length; j++) {
            const clip = track.clips[j]
            for (let k = 0; k < track.clips.length; k++) {
                if (k == j) continue
                const sibling = track.clips[k]
                const clipLeft = clip.measure
                const clipRight = clip.measure + ESUtils.truncate(clip.end - clip.start, truncateDigits)
                const siblingLeft = sibling.measure
                const siblingRight = sibling.measure + ESUtils.truncate(sibling.end - sibling.start, truncateDigits)
                if (clipLeft >= siblingLeft && clipLeft < (siblingRight - margin)) {
                    esconsole([clip, sibling], "compiler")
                    userConsole.warn(`Overlapping clips ${clip.filekey} and ${sibling.filekey} on track ${clip.track}`)
                    userConsole.warn("Removing the right-side overlap")
                    track.clips.splice(j, 1)
                } else if (clipRight > (siblingLeft + margin) && clipRight <= siblingRight) {
                    esconsole([clip, sibling], "compiler")
                    userConsole.warn(`Overlapping clips ${clip.filekey} and ${sibling.filekey} on track ${clip.track}`)
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
    for (const [i, track] of Object.entries(result.tracks)) {
        const clipCount = track.clips.length
        const effectCount  = Object.keys(track.effects).length

        if (effectCount > 0 && clipCount == 0) {
            userConsole.warn(ESMessages.dawservice.effecttrackwarning + ` (Track ${i})`)
        }
    }
}

// Adds a metronome as the last track of a result.
async function addMetronome(result: DAWData) {
    const [stressed, unstressed] = await Promise.all([
        audioLibrary.getAudioClip("METRONOME01", -1, result.quality),
        audioLibrary.getAudioClip("METRONOME02", -1, result.quality),
    ])
    const track = {
        clips: [] as Clip[],
        effects: [],
        analyser: null as AnalyserNode | null,
    }
    for (let i = 1; i < result.length + 1; i += 0.25) {
        let filekey = i % 1 === 0 ? "METRONOME01" : "METRONOME02"
        let audio = i % 1 === 0 ? stressed : unstressed
        track.clips.push({
            filekey: filekey,
            audio: audio,
            track: result.tracks.length,
            measure: i,
            start: 1,
            end: 1.625,
            scale: false,
            loop: false,
            loopChild: false,
        } as unknown as Clip)
    }
    // The metronome needs an analyzer to prevent errors in player
    track.analyser = audioContext.createAnalyser()
    result.tracks.push(track as unknown as Track)
    return result
}