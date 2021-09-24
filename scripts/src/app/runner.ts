// Run user scripts.
import * as acorn from "acorn"
import * as walk from "acorn-walk"

import audioContext from "./audiocontext"
import * as audioLibrary from "./audiolibrary"
import * as javascriptAPI from "../api/earsketch.js"
import * as pythonAPI from "../api/earsketch.py"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as pitchshift from "./pitchshifter"
import * as userConsole from "../ide/console"
import { Clip, ClipSlice, DAWData, Track } from "./player"
import i18n from "i18next"
import { TempoMap, timestretch } from "./tempo"

// After running code, go through each clip, load the audio file and
// replace looped ones with multiple clips. Why? Because we don't know
// the length of each audio clip until after running (unless we
// loaded the clips beforehand and did this at runtime, but that's
// harder.) Follow up with pitchshifting and setting the result length.
export async function postRun(result: DAWData) {
    esconsole("Execution finished. Loading audio buffers...", ["debug", "runner"])
    // NOTE: We used to check if `finish()` was called (by looking at result.finish) and throw an error if not.
    // However, since `finish()` doesn't actually do anything (other than set this flag), we no longer check.
    // (Apparently `finish()` is an artifact of EarSketch's Reaper-based incarnation.)

    // STEP 0: Fix effects. (This goes first because it may affect the tempo map, which is used in subsequent steps.)
    fixEffects(result)
    // STEP 1: Load audio buffers and slice them to generate temporary audio constants.
    esconsole("Loading buffers.", ["debug", "runner"])
    await loadBuffersForSampleSlicing(result)
    // STEP 2: Load audio buffers needed for the result.
    const buffers = await loadBuffers(result)
    esconsole("Filling in looped sounds.", ["debug", "runner"])
    // STEP 3: Insert buffers into clips, fix clip loops/effect lengths, and timestretch clips to fit the tempo map.
    // Before fixing the clips, retrieve the clip tempo info from the metadata cache for a special treatment for the MAKEBEAT clips.
    getClipTempo(result)
    fixClips(result, buffers)
    // STEP 4: Warn user about overlapping tracks or effects placed on tracks with no audio.
    checkOverlaps(result)
    checkEffects(result)
    // STEP 5: Pitchshift tracks that need it.
    esconsole("Handling pitchshifted tracks.", ["debug", "runner"])
    await handlePitchshift(result)
    // STEP 6: Insert metronome as the last track.
    esconsole("Adding metronome track.", ["debug", "runner"])
    await addMetronome(result)
    // STEP 7: Print out string for unit tests, return the result.
    esconsole(ESUtils.formatResultForTests(result), ["nolog", "runner"])
}

// Pitchshift tracks in a result object because we can't yet make pitchshift an effect node.
async function handlePitchshift(result: DAWData) {
    esconsole("Begin pitchshifting.", ["debug", "runner"])

    if (result.tracks.some(t => t.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined)) {
        userConsole.status("Applying PITCHSHIFT on audio clips")
    }

    const tempoMap = new TempoMap(result)

    // Synchronize the userConsole print out with the asyncPitchShift processing.
    try {
        for (const track of result.tracks.slice(1)) {
            if (track.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined) {
                pitchshift.pitchshiftClips(track, tempoMap)
                userConsole.status("PITCHSHIFT applied on clips on track " + track.clips[0].track)
            }
        }
        esconsole("Pitchshifting promise resolved.", ["debug", "runner"])
    } catch (err) {
        esconsole(err, ["error", "runner"])
        throw err
    }
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
export async function runPython(code: string) {
    Sk.dateSet = false
    Sk.filesLoaded = false
    // Added to reset imports
    // eslint-disable-next-line new-cap
    Sk.sysmodules = new Sk.builtin.dict([])
    Sk.realsyspath = undefined

    Sk.resetCompiler()
    pythonAPI.setup()

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

    // STEP 1: Handle use of audio constants.
    await handleSoundConstantsPY(code)

    const lines = code.match(/\n/g) ? code.match(/\n/g)!.length + 1 : 1
    esconsole("Running " + lines + " lines of Python", ["debug", "runner"])
    // printing for unit tests
    esconsole(ESUtils.formatScriptForTests(code), ["nolog", "runner"])

    // STEP 2: Run Python code using Skulpt.
    esconsole("Running script using Skulpt.", ["debug", "runner"])
    await Sk.misceval.asyncToPromise(() => {
        try {
            return Sk.importModuleInternal_("<stdin>", false, "__main__", code, true, undefined)
        } catch (err) {
            esconsole(err, ["error", "runner"])
            throw err
        }
    })
    esconsole("Execution finished. Extracting result.", ["debug", "runner"])

    // STEP 3: Extract result.
    const result = Sk.ffi.remapToJs(pythonAPI.dawData)
    // STEP 4: Perform post-execution steps on the result object
    esconsole("Performing post-execution steps.", ["debug", "runner"])
    await postRun(result)
    // STEP 5: finally return the result
    esconsole("Post-execution steps finished. Return result.", ["debug", "runner"])
    return result
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
export async function runJavaScript(code: string) {
    // printing for unit tests
    esconsole(ESUtils.formatScriptForTests(code), ["nolog", "runner"])

    esconsole("Running script using JS-Interpreter.", ["debug", "runner"])

    const mainInterpreter = createJsInterpreter(code)
    await handleSoundConstantsJS(code, mainInterpreter)
    let result
    try {
        result = await runJsInterpreter(mainInterpreter)
    } catch (err) {
        const lineNumber = getLineNumber(mainInterpreter, code, err)
        throwErrorWithLineNumber(err, lineNumber as number)
    }
    esconsole("Performing post-execution steps.", ["debug", "runner"])
    await postRun(result)
    esconsole("Post-execution steps finished. Return result.", ["debug", "runner"])
    return result
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
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
    const result = javascriptAPI.dawData
    esconsole("Execution finished. Extracting result.", ["debug", "runner"])
    return javascriptAPI.remapToNativeJs(result)
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

function getClipTempo(result: DAWData) {
    const metadata = audioLibrary.cache.standardSounds ?? []
    const tempoCache: { [key: string]: number | undefined } = Object.create(null)

    const lookupTempo = (key: string) => {
        // Return cached tempo for given key, or search audio sample metadata and cache result.
        if (key in tempoCache) return tempoCache[key]
        const tempo = metadata.find(item => item.name === key)?.tempo
        return (tempoCache[key] = (tempo === undefined || tempo < 0 || isNaN(tempo)) ? undefined : tempo)
    }

    for (const track of result.tracks) {
        for (const clip of track.clips) {
            const tempo = lookupTempo(clip.filekey)
            clip.tempo = tempo
        }
    }
}

async function loadBuffers(result: DAWData) {
    const promises = []
    for (const track of result.tracks) {
        for (const clip of track.clips) {
            const promise: Promise<[string, AudioBuffer]> = audioLibrary.getSound(clip.filekey).then(
                sound => [clip.filekey, sound.buffer])
            promises.push(promise)
        }
    }

    const buffers = await Promise.all(promises)
    return ESUtils.fromEntries(buffers)
}

export async function loadBuffersForSampleSlicing(result: DAWData) {
    const promises = []
    const tempoMap = new TempoMap(result)

    for (const [sliceKey, sliceDef] of Object.entries(result.slicedClips)) {
        const promise: Promise<[string, ClipSlice, audioLibrary.Sound]> =
            audioLibrary.getSound(sliceDef.sourceFile).then(sound => [sliceKey, sliceDef, sound])
        promises.push(promise)
    }

    for (const [key, def, sound] of await Promise.all(promises)) {
        // For consistency with old behavior, use clip tempo if available and initial tempo if not.
        const tempo = sound.tempo ?? tempoMap.points?.[0]?.tempo ?? 120
        const buffer = sliceAudioBufferByMeasure(sound.name, sound.buffer, def.start, def.end, tempo)
        audioLibrary.cache.promises[key] = Promise.resolve({ ...sound, file_key: key, buffer })
    }
}

// Slice a buffer to create a new temporary sound constant.
//   start - the start of the sound, in measures (relative to 1 being the start of the sound)
//   end - the end of the sound, in measures (relative to 1 being the start of the sound)
function sliceAudioBufferByMeasure(filekey: string, buffer: AudioBuffer, start: number, end: number, tempo: number) {
    const lengthInBeats = (end - start) * 4 // 4 beats per measure
    const lengthInSeconds = lengthInBeats * (60.0 / tempo)
    const lengthInSamples = lengthInSeconds * buffer.sampleRate

    const slicedBuffer = audioContext.createBuffer(buffer.numberOfChannels, lengthInSamples, buffer.sampleRate)

    // Sample range which will be extracted from the original buffer
    // Subtract 1 from start, end because measures are 1-indexed
    const startSamp = (start - 1) * 4 * (60.0 / tempo) * buffer.sampleRate
    const endSamp = (end - 1) * 4 * (60.0 / tempo) * buffer.sampleRate

    if (endSamp > buffer.length) {
        throw new RangeError(`End of slice at ${end} reaches past end of sample ${filekey}`)
    }

    for (let i = 0; i < buffer.numberOfChannels; i++) {
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

// Sort effects, fill in effects with end = 0.
function fixEffects(result: DAWData) {
    for (const track of result.tracks) {
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
                        if (effects[j + 1]) {
                            effect.endMeasure = effects[j + 1].startMeasure
                        } else {
                            effect.endMeasure = endMeasureIfEmpty
                        }
                    }
                    endMeasureIfEmpty = effect.startMeasure
                }
            }

            // if the automation start in the middle, it should fill the time before with the startValue of the earliest automation
            if (effects[0].startMeasure > 1) {
                const fillEmptyStart = Object.assign({}, effects[0]) // clone the earliest effect automation
                fillEmptyStart.startMeasure = 1
                fillEmptyStart.endMeasure = effects[0].startMeasure
                fillEmptyStart.startValue = effects[0].startValue
                fillEmptyStart.endValue = effects[0].startValue
                effects.unshift(fillEmptyStart)
            }
        }
    }
}

function roundUpToDivision(seconds: number, tempo: number) {
    const duration = ESUtils.timeToMeasure(seconds, tempo)
    let posIncrement = duration
    let exp = -2

    // stop adjusting at exp=4 -> 16 measures
    while (duration > Math.pow(2, exp) && exp < 4) {
        exp++
    }

    if (duration <= Math.pow(2, exp)) {
        posIncrement = Math.pow(2, exp)
    }

    return [posIncrement, duration]
}

const timestretchCache = new Map<string, AudioBuffer>()

// Fill in looped clips with multiple clips.
function fixClips(result: DAWData, buffers: { [key: string]: AudioBuffer }) {
    const tempoMap = new TempoMap(result)
    // step 1: fill in looped clips
    result.length = 0

    for (const track of result.tracks) {
        track.analyser = audioContext.createAnalyser()
        const newClips: Clip[] = []
        for (const clip of track.clips) {
            clip.sourceAudio = buffers[clip.filekey]
            let duration
            let posIncrement = 0

            if (clip.tempo === undefined) {
                duration = ESUtils.timeToMeasure(clip.sourceAudio.duration, tempoMap.getTempoAtMeasure(clip.measure))
            } else {
                // Tempo specified: round to the nearest sixteenth note.
                // This corrects for imprecision in dealing with integer numbers of samples,
                // and helps with user-uploaded MP3, which deviate from the intended length after encoding & decoding.
                // E.g.: A wave file of one measure at 88 bpm, 44.1kHz has 120273 samples;
                // converting it to a mp3 and decoding yields 119808 samples,
                // meaning it falls behind by ~0.01 seconds per loop.
                const actualLengthInQuarters = clip.sourceAudio.duration / 60 * clip.tempo
                const actualLengthInSixteenths = actualLengthInQuarters * 4
                // NOTE: This prevents users from using samples which have intentionally weird lenghts,
                // like 33 32nd notes, as they will be rounded to the nearest 16th.
                // This has been deemed an acceptable tradeoff for fixing unintentional loop drift.
                const targetLengthInSixteenths = Math.round(actualLengthInSixteenths)
                const targetLengthInQuarters = targetLengthInSixteenths / 4
                duration = posIncrement = targetLengthInQuarters / 4
            }

            // if the clip end value is 0, set it to the duration (one repeat)
            // this fixes API calls insertMedia, etc. that don't know the clip length ahead of time
            clip.end ||= duration + 1

            // update result length
            const endMeasure = clip.measure + (clip.end - clip.start)
            result.length = Math.max(result.length, endMeasure + clip.silence - 1)

            // the minimum measure length for which extra clips will be added to fill in the gap
            const fillableGapMinimum = 0.01
            // add clips to fill in empty space
            let measure = clip.measure
            let buffer = clip.sourceAudio
            let first = true
            while ((first || clip.loop) && measure < endMeasure - fillableGapMinimum) {
                let start = first ? clip.start : 1
                let end = first ? Math.min(duration + 1, clip.end) : 1 + Math.min(duration, endMeasure - measure)
                if (clip.tempo === undefined) {
                    // If the clip has no tempo, use an even increment: quarter note, half note, whole note, etc.
                    [posIncrement, duration] = roundUpToDivision(buffer.duration, tempoMap.getTempoAtMeasure(measure))
                } else {
                    // Timestretch to match the tempo map at this point in the track (or retrieve cached buffer).
                    const pointsDuringClip = tempoMap.slice(measure, measure + (end - start)).points
                    const cacheKey = JSON.stringify([clip.filekey, start, end, pointsDuringClip])
                    let cached = timestretchCache.get(cacheKey)

                    let input = clip.sourceAudio.getChannelData(0)
                    if (start !== 1 || end !== duration + 1) {
                        // Not using the entire buffer; only timestretch part of it.
                        // TODO: Consolidate all the slicing logic (between this, createSlice, and pitchshifter).
                        //       Ideally, we'd just slice once for clip.start/clip.end, and then throw those out...
                        const startIndex = ESUtils.measureToTime(start, clip.tempo) * clip.sourceAudio.sampleRate
                        const endIndex = ESUtils.measureToTime(end, clip.tempo) * clip.sourceAudio.sampleRate
                        input = input.subarray(startIndex, endIndex)
                        end -= start - 1
                        start = 1
                    }

                    if (cached === undefined) {
                        cached = timestretch(input, clip.tempo, tempoMap, measure)
                        if (FLAGS.CACHE_TS_RESULTS) {
                            timestretchCache.set(cacheKey, cached)
                        }
                    }
                    buffer = cached
                }
                newClips.push({
                    ...clip,
                    audio: buffer,
                    measure,
                    start,
                    end,
                    loopChild: !first,
                })
                measure += posIncrement
                first = false
            }
        }

        track.clips = newClips
    }
}

// Warn users when a clips overlap each other. Done after execution because
// we don't know the length of clips until then.
function checkOverlaps(result: DAWData) {
    const truncateDigits = 5 // workaround for precision errors
    const margin = 0.001

    for (const track of result.tracks) {
        for (let j = 0; j < track.clips.length; j++) {
            const clip = track.clips[j]
            for (let k = 0; k < track.clips.length; k++) {
                if (k === j) continue
                const sibling = track.clips[k]
                const clipLeft = clip.measure
                const clipRight = clip.measure + ESUtils.truncate(clip.end - clip.start, truncateDigits)
                const siblingLeft = sibling.measure
                const siblingRight = sibling.measure + ESUtils.truncate(sibling.end - sibling.start, truncateDigits)
                if (clipLeft >= siblingLeft && clipLeft < (siblingRight - margin)) {
                    esconsole([clip, sibling], "runner")
                    userConsole.warn(`Overlapping clips ${clip.filekey} and ${sibling.filekey} on track ${clip.track}`)
                    userConsole.warn("Removing the right-side overlap")
                    track.clips.splice(j, 1)
                } else if (clipRight > (siblingLeft + margin) && clipRight <= siblingRight) {
                    esconsole([clip, sibling], "runner")
                    userConsole.warn(`Overlapping clips ${clip.filekey} and ${sibling.filekey} on track ${clip.track}`)
                    userConsole.warn("Removing the right-side overlap")
                    track.clips.splice(k, 1)
                }
            }
        }
    }
}

// Warn users when a track contains effects, but no audio. Done after execution
// because we don't know if there are audio samples on the entire track
// until then. (Doesn't apply to mix track, which can't contain clips.)
function checkEffects(result: DAWData) {
    for (const [i, track] of Object.entries(result.tracks).slice(1)) {
        const clipCount = track.clips.length
        const effectCount = Object.keys(track.effects).length

        if (effectCount > 0 && clipCount === 0) {
            userConsole.warn(i18n.t("messages:dawservice.effecttrackwarning") + ` (Track ${i})`)
        }
    }
}

// Adds a metronome as the last track of a result.
async function addMetronome(result: DAWData) {
    const [stressed, unstressed] = await Promise.all([
        audioLibrary.getSound("METRONOME01"),
        audioLibrary.getSound("METRONOME02"),
    ])
    const track = {
        clips: [] as Clip[],
        effects: [],
        analyser: null as AnalyserNode | null,
    }
    for (let i = 1; i < result.length + 1; i += 0.25) {
        const filekey = i % 1 === 0 ? "METRONOME01" : "METRONOME02"
        const sound = i % 1 === 0 ? stressed : unstressed
        track.clips.push({
            filekey: filekey,
            sourceAudio: sound.buffer,
            audio: sound.buffer,
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
}
