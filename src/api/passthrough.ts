// This file contains functions meant to consolidate all EarSketch API functions
// into a single source. Both the Python and Javascript libraries are simply
// wrappers for these functions.

// If your API function needs to be asynchronous, make sure it returns a
// promise, and use suspendPassthrough() in the Javascript and Python wrappers.
import i18n from "i18next"

import * as analyzer from "../audio/analyzer"
import audioContext from "../audio/context"
import { EFFECT_MAP } from "../audio/effects"
import * as audioLibrary from "../app/audiolibrary"
import { Clip, DAWData, Track, SlicedClip, StretchedClip, SoundEntity } from "common"
import { blastConfetti } from "../app/Confetti"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as renderer from "../audio/renderer"
import * as userConsole from "../ide/console"
import { getLineNumber } from "../app/runner"
import * as postRun from "../app/postRun"
import { TempoMap } from "../app/tempo"
import * as user from "../user/userState"
import store from "../reducers"
import * as request from "../request"

class ValueError extends Error {
    constructor(message: string | undefined) {
        super(message)
        this.name = this.constructor.name
    }
}

// NOTE: Previously we were the native InternalError, which is not standard:
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/InternalError
class InternalError extends Error {
    constructor(message: string | undefined) {
        super(message)
        this.name = this.constructor.name
    }
}

// Generate initial result object.
export function init() {
    return {
        init: true,
        finish: false,
        length: 0,
        tracks: [{
            effects: {
                "TEMPO-TEMPO": [{ measure: 1, value: 120, shape: "square", sourceLine: 1 }],
            },
            clips: [],
        }],
        transformedClips: {}, // slicedClips, stretchedClips
    } as DAWData
}

// Set the tempo on the result object.
export function setTempo(result: DAWData, startTempo: number, start?: number, endTempo?: number, end?: number) {
    const args = [...arguments].slice(1) // remove first argument
    esconsole("Calling setTempo with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("setTempo", args, 1, 4)
    checkType(args.length > 1 ? "startTempo" : "tempo", "number", startTempo)
    ptCheckRange(args.length > 1 ? "startTempo" : "tempo", startTempo, 45, 220)

    if (start === undefined) {
        start = 1
    } else {
        checkType("start", "number", start)
        ptCheckRange("start", start, { min: 1 })
    }

    if (endTempo === undefined) {
        endTempo = startTempo
    } else {
        checkType("endTempo", "number", endTempo)
        ptCheckRange("endTempo", endTempo, 45, 220)
    }

    if (end === undefined) {
        end = 0
    } else {
        checkType("end", "number", end)
        ptCheckRange("end", end, { min: 1 })
    }

    addEffect(result, 0, "TEMPO", "TEMPO", start, startTempo, end, endTempo)
    return result
}

// Run steps to clean up the script.
export const finish = (result: DAWData) => {
    esconsole("Calling pt_finish from passthrough", "PT")

    // We used to set a flag here. But all the flag indicated was whether the user called this function,
    // and this function didn't actually do anything *except* set that flag.
    return result
}

// Add a clip to the given result object.
export function fitMedia(result: DAWData, soundConstant: string, track: number, start: number, end: number) {
    const args = [...arguments].slice(1) // remove first argument
    esconsole("Calling fitMedia with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("fitMedia", args, 4, 4)
    checkType("sound", "string", soundConstant)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("start", "number", start)
    checkType("end", "number", end)

    // the range check in `addClip` cannot catch the case when end = start-1
    if (end < start) {
        throw new RangeError("Clip cannot end before it starts")
    }

    const clip = {
        filekey: soundConstant,
        track,
        measure: start,
        start: 1,
        end: end - start + 1,
        scale: false,
        loop: true,
    } as unknown as Clip

    addClip(result, clip)
    return result
}

// Insert a media clip.
export function insertMedia(result: DAWData, soundConstant: string, track: number, start: number, scaleAudio: number | undefined) {
    const args = [...arguments].slice(1) // remove first argument
    esconsole("Calling insertMedia with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("insertMedia", args, 3, 4)
    checkType("sound", "string", soundConstant)
    checkType("track", "number", track)
    ptCheckInt("track", track)

    // Now check if the optional parameters have valid datatypes. If not specified, initialize to defaults.
    if (start !== undefined) {
        if (typeof start !== "number") {
            throw new TypeError("trackLocation must be a number")
        } else if (start < 1.0) {
            throw new RangeError("trackLocation must be no less than 1.0")
        }
    } else {
        // trackLocation = 1.0
        throw new TypeError("trackLocation needs to be specified")
    }

    if (scaleAudio !== undefined) {
        if (typeof scaleAudio !== "number") {
            throw new TypeError("scaleAudio must be a number")
        }
    } else {
        scaleAudio = 1
    }

    const clip = {
        filekey: soundConstant,
        track,
        measure: start,
        start: 1,
        end: 0,
        scale: scaleAudio,
        loop: true,
    } as unknown as Clip

    addClip(result, clip)

    return result
}

// Insert a media clip section.
export function insertMediaSection(result: DAWData, soundConstant: string, track: number, start: number, sliceStart: number, sliceEnd: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling insertMediaSection with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("insertMediaSection", args, 3, 6)
    checkType("sound", "string", soundConstant)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("start", "number", start)

    if (sliceStart !== undefined) {
        if (typeof (sliceStart) !== "number") {
            throw new TypeError("sliceStart must be a number")
        }
    } else {
        sliceStart = 0
    }

    if (sliceEnd !== undefined) {
        if (typeof (sliceEnd) !== "number") {
            throw new TypeError("mediaEndLocation must be a number")
        }
    } else {
        sliceEnd = 0
    }

    const tempoMap = new TempoMap(result)

    return (async () => {
        await postRun.loadBuffersForTransformedClips(result)
        const sound = await audioLibrary.getSound(soundConstant)
        const tempo = sound.tempo ?? tempoMap.points[0].tempo
        const dur = ESUtils.timeToMeasureDelta(sound.buffer.duration, tempo)
        if (sliceStart - 1 >= dur) {
            throw new RangeError("sliceStart exceeds sound duration")
        }
        const clip = {
            filekey: soundConstant,
            track,
            measure: start,
            start: sliceStart,
            end: sliceEnd,
            loop: true,
        } as Clip
        addClip(result, clip)
        return result
    })()
}

function beatStringToArray(beat: string) {
    return beat.toUpperCase().split("").map(char => {
        if (char === "+" || char === "-") {
            return char
        } else if ((char >= "0" && char <= "9") || (char >= "A" && char <= "F")) {
            return parseInt(char, 16)
        } else {
            throw RangeError("Invalid beat string")
        }
    })
}

// Make a beat of audio clips.
export function makeBeat(result: DAWData, soundConstant: any, track: number, start: number, beat: string, stepsPerMeasure: number = 16) {
    const args = [...arguments].slice(1)
    esconsole("Calling makeBeat with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("makeBeat", args, 4, 5)

    if (!Array.isArray(soundConstant) && typeof soundConstant !== "string") {
        throw new TypeError("media must be a list or a string")
    }

    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("start", "number", start)
    checkType("beat", "string", beat)

    ptCheckRange("track", track, { min: 1 })
    ptCheckRange("start", start, { min: 1 })
    checkType("stepsPerMeasure", "number", stepsPerMeasure)
    ptCheckRange("stepsPerMeasure", stepsPerMeasure, { min: 1 / 1024, max: 256 })
    // stepsPerMeasure min 1/1024 means one beat is 1024 measures (absurd, but why not?)
    // stepsPerMeasure max 256 results in min slices lengths of about 350 samples, assuming 120bpm and 44.1k

    const measuresPerStep = 1.0 / stepsPerMeasure

    // ensure input media is a list
    const mediaList = []
    if (typeof soundConstant === "object") {
        for (const m of soundConstant) {
            mediaList.push(m)
        }
    } else {
        mediaList.push(soundConstant)
    }

    const SUSTAIN = "+"
    const REST = "-"

    // throw error if beat starts with SUSTAIN(+)
    if (beat[0] === SUSTAIN) {
        userConsole.warn('Cannot start beat with "+" (sustain)')
    }

    // parse the beat string
    for (let i = 0; i < beat.length; i++) {
        const current = parseInt(beat[i], 16)
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beat.length - 1) ? beat[i + 1] : REST

        // current beat is a valid number
        if (!isNaN(current)) {
            if (current > mediaList.length - 1) {
                if (mediaList.length === 1) {
                    throw new RangeError(i18n.t("messages:esaudio.nonlistRangeError"))
                } else {
                    throw new RangeError(i18n.t("messages:esaudio.stringindex"))
                }
            }
            const filekey = mediaList[current]
            const location = start + (i * measuresPerStep)
            const soundStart = 1
            let soundEnd = soundStart + measuresPerStep
            let silence = 0

            if (next === REST) {
                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                let j = i + 1
                while (isNaN(parseInt(beat[j])) && j++ < beat.length);
                if (j >= beat.length) {
                    silence += (j - i - 2) * measuresPerStep
                }
            } else if (next === SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i + 1
                while (beat[j] === SUSTAIN && j++ < beat.length) {
                    soundEnd += measuresPerStep
                }
                // skip ahead (for speed)
                i = j - 1

                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                j = i + 1
                while (beat[j] === REST && j++ < beat.length);
                if (j >= beat.length) {
                    silence += (j - i - 1) * measuresPerStep
                }
            }

            const clip = {
                filekey,
                track,
                measure: location,
                start: soundStart,
                end: soundEnd,
                scale: false,
                loop: false,
            } as unknown as Clip

            addClip(result, clip, silence)
        }
    }

    return result
}

// Make a beat from media clip slices.
export function makeBeatSlice(result: DAWData, soundConstant: string, track: number, start: number, beat: string, sliceStarts: number | number[], stepsPerMeasure: number = 16) {
    const args = [...arguments].slice(1)
    esconsole("Calling makeBeatSlice with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("makeBeatSlice", args, 5, 6)
    checkType("sound", "string", soundConstant)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("start", "number", start)
    checkType("beat", "string", beat)

    ptCheckRange("track", track, { min: 1 })
    ptCheckRange("start", start, { min: 1 })
    checkType("stepsPerMeasure", "number", stepsPerMeasure)
    ptCheckRange("stepsPerMeasure", stepsPerMeasure, { min: 1 / 1024, max: 256 })

    stepsPerMeasure = 1.0 / stepsPerMeasure

    if (!Array.isArray(sliceStarts) && typeof (sliceStarts) !== "number") {
        throw new TypeError("beatNumber must be a list or a number")
    }

    if (sliceStarts.constructor === Array) {
        sliceStarts.forEach(v => {
            if (typeof v !== "number") {
                throw new TypeError("beatNumber values must be numbers.")
            } else if (v < 1) {
                throw new RangeError("beatNumber values cannot be below 1.")
            }
        })
    }

    // ensure input beats is a list
    const beatList = []
    if (typeof sliceStarts === "object") {
        for (const beat of sliceStarts) {
            beatList.push(beat)
        }
    } else {
        // TODO: This seems wrong; beatList should be type number[], but media is explicitly type string.
        beatList.push(soundConstant)
    }

    const SUSTAIN = "+"
    const REST = "-"

    const promises = []

    // parse the beat string
    for (let i = 0; i < beat.length; i++) {
        const current = parseInt(beat[i], 16)
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beat.length - 1) ? beat[i + 1] : REST

        // current beat is a valid number
        if (!isNaN(current)) {
            if (current > beatList.length - 1) {
                throw new RangeError(i18n.t("messages:esaudio.stringindex"))
            }
            const soundStart = start + (i * stepsPerMeasure)
            const sliceStart = beatList[current] as number
            let sliceEnd = (beatList[current] as number) + stepsPerMeasure

            if (next === REST) {
                // next char is a rest, so do nothing
            } else if (next === SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i + 1
                while (beat[j] === SUSTAIN && j++ < beat.length) {
                    sliceEnd += stepsPerMeasure
                }
                // skip ahead
                i = j - 1
            }

            promises.push(insertMediaSection(result, soundConstant, track, soundStart, sliceStart, sliceEnd))
        }
    }

    return Promise.all(promises).then(() => result)
}

// Analyze a clip.
// Returns the analyzed value. Does not alter the result (it just takes it as a parameter for consistency).
export function analyze(result: DAWData, soundConstant: string, feature: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling analyze with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("analyze", args, 2, 2)

    checkType(soundConstant, "string", soundConstant)
    checkType("feature", "string", feature)

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(feature.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    return postRun.loadBuffersForTransformedClips(result)
        .then(() => audioLibrary.getSound(soundConstant))
        .then(sound => {
            const blockSize = 2048 // TODO: hardcoded in analysis.js as well
            if (sound.buffer.length < blockSize) {
                throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
            }
            return analyzer.computeFeatureForBuffer(sound.buffer, feature)
        })
}

// Analyze a clip for time.
// Returns the analyzed value. Does not alter the result.
export function analyzeForTime(result: DAWData, soundConstant: string, feature: string, sliceStart: number, sliceEnd: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling analyzeForTime with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("analyzeForTime", args, 4, 4)

    checkType("feature", "string", feature)
    checkType("audioFile", "string", soundConstant)
    // TODO: These should probably be renamed, as they are actually in measures.
    checkType("start", "number", sliceStart)
    checkType("end", "number", sliceEnd)

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(feature.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (sliceStart > sliceEnd) {
        throw new RangeError(
            "Cannot have start time greater than end time in Analysis call"
        )
    }

    const tempoMap = new TempoMap(result)

    return postRun.loadBuffersForTransformedClips(result)
        .then(() => audioLibrary.getSound(soundConstant))
        .then(sound => {
            // For consistency with old behavior, use clip tempo if available and initial tempo if not.
            const tempo = sound.tempo ?? tempoMap.points[0].tempo
            const sampleRate = audioContext.sampleRate
            const startSecond = ESUtils.measureToTime(sliceStart, tempo)
            const endSecond = ESUtils.measureToTime(sliceEnd, tempo)
            const startSample = Math.round(sampleRate * startSecond)
            const endSample = Math.round(sampleRate * endSecond)
            const blockSize = 2048 // TODO: hardcoded in analysis.js as well
            if ((endSample - startSample) < blockSize) {
                throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
            }
            return analyzer.computeFeatureForBuffer(sound.buffer, feature, startSecond, endSecond)
        })
}

export function analyzeTrack(result: DAWData, track: number, feature: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling analyzeTrack with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("analyzeTrack", args, 2, 2)

    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("feature", "string", feature)

    ptCheckRange("track", track, { min: 0 })

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(feature.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (result.tracks[track] === undefined) {
        throw new Error("Cannot analyze a track that does not exist: " + track)
    }

    // `analyzeResult` will contain a result object that contains only one track that we want to analyze.
    // (Plus the mix track, with its tempo curve.)
    const analyzeResult = {
        tracks: [
            { clips: [], effects: { "TEMPO-TEMPO": result.tracks[0].effects["TEMPO-TEMPO"] } },
            result.tracks[track],
        ],
        length: 0,
        transformedClips: result.transformedClips,
    }
    return (async () => {
        await postRun.postRun(analyzeResult as any)
        // TODO: analyzeTrackForTime FAILS to run a second time if the
        // track has effects using renderer.renderBuffer()
        // Until a fix is found, we use mergeClips() and ignore track effects.
        // return renderer.renderBuffer(result)
        const clips = analyzeResult.tracks[1].clips
        const tempoMap = new TempoMap(analyzeResult as any as DAWData)
        const buffer = await renderer.mergeClips(clips, tempoMap)
        return analyzer.computeFeatureForBuffer(buffer, feature)
    })()
}

export function analyzeTrackForTime(result: DAWData, track: number, feature: string, start: number, end: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling analyzeTrackForTime with parameters" + args.join(", "), ["debug", "PT"])

    checkType("feature", "string", feature)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("start", "number", start)
    checkType("end", "number", end)

    ptCheckRange("track", track, { min: 0 })

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(feature.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (result.tracks[track] === undefined) {
        throw new Error("Cannot analyze a track that does not exist: " + track)
    }

    if (start > end) {
        throw new RangeError(
            "Cannot have start time greater than end time in Analysis call."
        )
    }

    // `analyzeResult` will contain a result object that contains only one track that we want to analyze.
    // (Plus the mix track, with its tempo curve.)
    const analyzeResult = {
        tracks: [
            { clips: [], effects: { "TEMPO-TEMPO": result.tracks[0].effects["TEMPO-TEMPO"] } },
            result.tracks[track],
        ],
        length: 0,
        transformedClips: result.transformedClips,
    }

    return (async () => {
        await postRun.postRun(analyzeResult as any)
        // TODO: analyzeTrackForTime FAILS to run a second time if the
        // track has effects using renderer.renderBuffer()
        // Until a fix is found, we use mergeClips() and ignore track effects.
        const clips = analyzeResult.tracks[1].clips
        const tempoMap = new TempoMap(analyzeResult as any as DAWData)
        const startSecond = tempoMap.measureToTime(start)
        const endSecond = tempoMap.measureToTime(end)
        // Check if analysis window is at least one block long.
        const blockSize = 2048 // TODO: hardcoded in analysis.js as well
        if ((endSecond - startSecond) * audioContext.sampleRate < blockSize) {
            throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
        }
        const buffer = await renderer.mergeClips(clips, tempoMap)
        return analyzer.computeFeatureForBuffer(buffer, feature, startSecond, endSecond)
    })()
}

// Get the duration of a clip.
export function dur(result: DAWData, soundConstant: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling dur with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("dur", args, 1, 1)
    checkType("sound", "string", soundConstant)

    const tempoMap = new TempoMap(result)
    return audioLibrary.getSound(soundConstant).then(sound => {
        // For consistency with old behavior, use clip tempo if available and initial tempo if not.
        const tempo = sound.tempo ?? tempoMap.points[0].tempo
        // Round to nearest hundredth.
        return Math.round(ESUtils.timeToMeasureDelta(sound.buffer.duration, tempo) * 100) / 100
    })
}

// Return a Gaussian distributed random number.
export function gauss(result: DAWData, mean: number, stddev: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling gauss with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("gauss", args, 0, 2)

    return Math.randomGaussian(mean, stddev)
}

// Import an image as number data.
export function importImage(result: DAWData, url: string, nrows: number, ncols: number, includeRGB: undefined | boolean) {
    const args = [...arguments].slice(1)
    esconsole("Calling importImage with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("importImage", args, 3, 4)

    checkType("url", "string", url)
    checkType("nrows", "number", nrows)
    checkType("ncols", "number", ncols)

    if (url.substring(0, 4) !== "http") {
        userConsole.warn("Image url does not start with http:// - prepending string to url")
        url = url + "http://"
    }

    if (includeRGB !== undefined) {
        checkType("color", "boolean", includeRGB)
    } else {
        includeRGB = false
    }

    // make the HTTP request
    return request.post("/thirdparty/stringifyimage", {
        image_url: url,
        width: "" + nrows,
        height: "" + ncols,
        color: "" + !!includeRGB,
    }).then(response => {
        esconsole("Image data received: " + response, "PT")
        return response
    }).catch(() => {
        throw new InternalError("We could not load the image.")
    })
}

export function importFile(result: DAWData, url: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling importFile with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("importFile", args, 1, 1)
    checkType("url", "string", url)

    if (url.substring(0, 4) !== "http") {
        userConsole.warn("File url does not start with http:// - prepending string to url")
        url = "http://" + url
    }

    // make the HTTP request
    return request.post("/thirdparty/stringifyfile", { file_url: url }).then(response => {
        esconsole("File data received: " + response, "PT")
        return response
    }).catch(() => {
        throw new InternalError("We could not load the file.")
    })
}

// Provides a way to print to the EarSketch console.
export function println(result: DAWData, input: any) {
    const args = [...arguments].slice(1)
    esconsole("Calling println with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("println", args, 1, 1)
    if (typeof input !== "string") {
        input = JSON.stringify(input) ?? String(input)
    }
    userConsole.log(input)

    // burdell confetti easter egg
    if (input.replace(".", "").toUpperCase() === "GEORGE P BURDELL") {
        userConsole.log("You've discovered the BURDELL EASTER EGG. Go Georgia Tech!")
        blastConfetti()
    }
}

// Prompt for user input.
export function readInput(result: DAWData, prompt: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling readInput with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("readInput", args, 0, 1)
    prompt = prompt ?? ""
    checkType("prompt", "string", prompt)
    return (window as any).esPrompt(prompt)
}

// Replace a list element.
export function replaceListElement(result: DAWData, inputList: any[], elementToReplace: any, withElement: any) {
    const args = [...arguments].slice(1)
    esconsole("Calling replaceListElement with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("replaceListElement", args, 3, 3)
    checkType("list", "array", inputList)

    inputList = inputList.slice() // create a copy
    for (let i = 0; i < inputList.length; i++) {
        // TODO: We should replace this with '===', but first we should make some effort to check if user scripts rely on the '==' behavior.
        // eslint-disable-next-line eqeqeq
        if (inputList[i] == elementToReplace) {
            inputList[i] = withElement
        }
    }

    return inputList
}

// Replace a character in a string.
export function replaceString(result: DAWData, inputString: string, characterToReplace: string, withCharacter: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling replaceString with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("replaceString", args, 3, 3)
    checkType("string", "string", inputString)
    checkType("characterToReplace", "string", characterToReplace)
    checkType("withCharacter", "string", withCharacter)

    const patternList = inputString.split("")
    for (let i = 0; i < inputString.length; i++) {
        if (patternList[i] === characterToReplace) {
            patternList[i] = withCharacter
        }
    }
    return patternList.join("")
}

// Reverse a list.
export function reverseList(result: DAWData, inputList: any[]) {
    const args = [...arguments].slice(1)
    esconsole("Calling reverseList with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("reverseList", args, 1, 1)
    checkType("input", "array", inputList)

    inputList = inputList.slice() // create a copy
    return inputList.reverse()
}

// Reverse a string.
export function reverseString(result: DAWData, inputString: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling reverseString with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("reverseString", args, 1, 1)
    checkType("string", "string", inputString)

    return inputString.split("").reverse().join("")
}

// Create a rhythmic effect envelope from a string.
export function rhythmEffects(result: DAWData, track: number, effect: string, parameters: string, values: number[], start: number, beat: string, stepsPerMeasure: number = 16) {
    const args = [...arguments].slice(1)
    esconsole("Calling rhythmEffects with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("rhythmEffects", args, 6, 7)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("type", "string", effect)
    ptCheckRange("track", track, { min: 0 })
    checkType("parameter", "string", parameters)
    checkType("values", "array", values)
    checkType("start", "number", start)
    checkType("beat", "string", beat)
    checkType("stepsPerMeasure", "number", stepsPerMeasure)
    ptCheckRange("stepsPerMeasure", stepsPerMeasure, { min: 1 / 1024, max: 256 })

    const measuresPerStep = 1.0 / stepsPerMeasure

    const SUSTAIN = "+"
    const RAMP = "-"

    if (beat[beat.length - 1] === RAMP) throw new RangeError("Beat string cannot end with a ramp (\"-\")")
    if (beat.includes("-+")) throw RangeError("Beat string cannot ramp into a sustain (\"-+\")")
    if (beat[0] === RAMP) userConsole.warn(`A beat string on track ${track} starts with a ramp ("-")`)
    if (beat[0] === SUSTAIN) userConsole.warn(`A beat string on track ${track} starts with a sustain ("+")`)

    const beatArray: (string | number)[] = beatStringToArray(beat)

    for (const val of beatArray) {
        if (typeof val === "number" && val as number > values.length - 1) {
            const nVals = values.length
            const valStr = val.toString(16).toUpperCase()
            throw RangeError(`Beat string contains an invalid index "${valStr}" for a parameter array of length ${nVals}`)
        }
    }

    const parameterDefault = EFFECT_MAP[effect].PARAMETERS[parameters].default
    let prevBeatVal = -1 // most recently encountered "number" in the beat string
    let iPrevRampSeq = 0 // most recently encountered start of a ramp sequence

    for (let i = 0; i < beatArray.length; i++) {
        const current = beatArray[i]

        if (typeof current === "number") {
            // for numbers we add a "step" automation point
            const fxStart = start + i * measuresPerStep
            const fxStartValue = values[current]

            addEffect(result, track, effect, parameters, fxStart, fxStartValue, 0, fxStartValue)

            // keep track of this number for any upcoming ramps, ex: "0+++---1"
            prevBeatVal = current
        } else if (current === RAMP) {
            // for ramps we add a "linear" ramp to the automation once we find the end of ramp sequence
            const prev = i === 0 ? "+" : beatArray[i - 1]
            const prevIsNumberOrSustain = typeof prev === "number" || prev === SUSTAIN
            const nextIsRamp = (i + 1 < beatArray.length) ? (beatArray[i + 1] === RAMP) : false

            if (prevIsNumberOrSustain) {
                // this is the start of the ramp sequence
                iPrevRampSeq = i
            }

            if (!nextIsRamp) {
                // this is the end of the ramp sequence, so add a ramp to the automation
                const fxStart = start + iPrevRampSeq * measuresPerStep
                const fxStartValue = prevBeatVal === -1 ? parameterDefault : values[prevBeatVal]
                // beat strings cannot end with ramps, so here it's safe to reference beatArray[i + 1]
                const fxEnd = start + (i + 1) * measuresPerStep
                const fxEndValue = values[beatArray[i + 1] as number]

                addEffect(result, track, effect, parameters, fxStart, fxStartValue, fxEnd, fxEndValue)
            }
        }
    }
    return result
}

export function setEffect(result: DAWData, track: number, type: string, parameter: string, startValue: number, start: number, endValue: number, end: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling setEffect with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("setEffect", args, 2, 7)
    checkType("track", "number", track)
    ptCheckInt("track", track)
    checkType("type", "string", type)

    ptCheckRange("track", track, { min: 0 })

    if (parameter !== undefined) {
        checkType("parameter", "string", parameter)
    } else {
        parameter = EFFECT_MAP[type].DEFAULT_PARAM
    }

    if (startValue !== undefined) {
        checkType("startValue", "number", startValue)
    } else {
        startValue = EFFECT_MAP[type].PARAMETERS[parameter].default
    }

    if (start !== undefined) {
        checkType("start", "number", start)
        ptCheckRange("start", start, { min: 1 })
    } else {
        start = 1
    }

    if (endValue !== undefined) {
        checkType("endValue", "number", endValue)
    } else {
        endValue = startValue
    }

    if (end !== undefined) {
        checkType("end", "number", end)
        ptCheckRange("end", end, { min: 1 })
    } else {
        end = 0
    }

    addEffect(result, track, type, parameter, start, startValue, end, endValue)
    return result
}

// Slice a part of a soundfile to create a new sound file variable
export function createAudioSlice(result: DAWData, soundConstant: string, sliceStart: number, sliceEnd: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling createAudioSlice with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("createAudioSlice", args, 3, 3)
    checkType("sound", "string", soundConstant)
    checkType("startLocation", "number", sliceStart)
    checkType("endLocation", "number", sliceEnd)
    ptCheckAudioSliceRange(result, soundConstant, sliceStart, sliceEnd)

    if (soundConstant in result.transformedClips) {
        throw new ValueError("Creating slices from slices is not currently supported")
    }

    const roundedStart = parseFloat(sliceStart.toFixed(5))
    const roundedEnd = parseFloat(sliceEnd.toFixed(5))
    const key = `${soundConstant}|SLICE${roundedStart}:${roundedEnd}`
    const def: SlicedClip = { kind: "slice", sourceKey: soundConstant, start: sliceStart, end: sliceEnd }

    result.transformedClips[key] = def

    return { result, returnVal: key }
}

// Use a custom timestretch factor to change the tempo of a sound
export function createAudioStretch(result: DAWData, soundConstant: string, stretchFactor: number) {
    const args = [...arguments].slice(1)
    esconsole("Calling createAudioStretch with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("createAudioSlice", args, 2, 2)
    checkType("sound", "string", soundConstant)
    checkType("stretchFactor", "number", stretchFactor)

    if (soundConstant in result.transformedClips) {
        throw new ValueError("Creating stretched sounds from slices is not currently supported")
    }

    const roundedStretchFactor = parseFloat(stretchFactor.toFixed(5))
    const key = `${soundConstant}|STRETCH${roundedStretchFactor}`
    const def: StretchedClip = { kind: "stretch", sourceKey: soundConstant, stretchFactor }

    result.transformedClips[key] = def

    return { result, returnVal: key }
}

// Select a random file.
export function selectRandomFile(result: DAWData, folderSubstring: string = "") {
    const args = [...arguments].slice(1)
    esconsole("Calling selectRandomFile with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("selectRandomFile", args, 0, 1)
    checkType("folderSubstring", "string", folderSubstring)

    let endpoint = `/audio/random?folderSubstring=${folderSubstring}`
    if (user.selectLoggedIn(store.getState())) {
        endpoint += "&username=" + user.selectUserName(store.getState())
    }

    return request.get(endpoint)
        .then((entity: SoundEntity) => entity.name)
        .catch(err => {
            if (err.code === 400) {
                return undefined // no matching sounds
            }
            throw new InternalError("Internal server error.")
        })
}

// Shuffle a list.
export function shuffleList(result: DAWData, inputList: any[]) {
    const args = [...arguments].slice(1)
    esconsole("Calling shuffleList with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("shuffleList", args, 1, 1)
    checkType("input", "array", inputList)

    // Fisher-Yates
    const a = inputList
    const n = a.length

    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }

    return a
}

// Shuffle a string.
export function shuffleString(result: DAWData, inputString: string) {
    const args = [...arguments].slice(1)
    esconsole("Calling shuffleString with parameters" + args.join(", "), ["debug", "PT"])

    checkArgCount("shuffleString", args, 1, 1)
    checkType("string", "string", inputString)

    // Fisher-Yates
    const a = inputString.split("")
    const n = a.length

    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = a[i]
        a[i] = a[j]
        a[j] = tmp
    }
    return a.join("")
}

const checkArgCount = (funcName: string, args: any[], nRequired: number, nTotal: number) => {
    const nArgs = args.length
    if (nArgs < nRequired) {
        throw new TypeError(`${funcName}() takes at least ${nRequired} argument(s) (${nArgs} given)`)
    } else if (nArgs > nTotal) {
        throw new TypeError(`${funcName}() takes at most ${nTotal} argument(s) (${nArgs} given)`)
    } else if (nTotal === nRequired && nArgs !== nRequired) {
        throw new TypeError(`${funcName}() takes exactly ${nRequired} argument(s) (${nArgs} given)`)
    }
}

const checkType = (name: string, expectedType: string, arg: any) => {
    if (expectedType === "array") {
        if (!Array.isArray(arg)) {
            throw new TypeError(name + " must be a list")
        }
    } else {
        // eslint-disable-next-line valid-typeof
        if (expectedType !== typeof arg) {
            throw new TypeError(name + " must be a " + expectedType)
        }
    }
}

// call this after the regular type check
const ptCheckInt = (name: string, arg: number) => {
    if (arg.toString().includes(".")) {
        throw new TypeError(name + " must be an integer")
    }
}

const ptCheckRange = (name: string, arg: number, min: number | { min?: number, max?: number }, max: number | undefined = undefined) => {
    if (typeof min === "number" && typeof max === "number") {
        if (arg < min || arg > max) {
            throw new TypeError(name + " exceeds the allowed range of " + min + " to " + max)
        }
    } else if (typeof min === "object") {
        // TODO: change the bad arg names...
        if ("min" in min && "max" in min) {
            if (arg < min.min! || arg > min.max!) {
                throw new TypeError(name + " exceeds the allowed range of " + min.min + " to " + min.max)
            }
        } else {
            if ("min" in min) {
                if (arg < min.min!) {
                    throw new TypeError(name + " cannot be smaller than " + min.min)
                }
            }

            if ("max" in min) {
                if (arg > min.max!) {
                    throw new TypeError(name + " cannot be bigger than " + min.max)
                }
            }
        }
    }
}

const ptCheckAudioSliceRange = (result: DAWData, fileKey: string, startTime: number, endTime: number) => {
    if (startTime < 1) {
        throw new RangeError("Cannot start slice before the start of the clip")
    }
    // TODO: This is broken, and has been for an unknown length of time.
    // `dur` returns a promise, so `dur + 1` yields "[object Promise]1".
    // Compared against a number (endTime), this always returns false,
    // and the error never gets thrown.
    // Instead the error gets caught in runner's `sliceAudioBufferByMeasure`.
    // (The brokenness was discovered via TypeScript migration of audiolibrary.)
    const clipDuration = dur(result, fileKey) as unknown as number
    if (endTime > clipDuration + 1) {
        throw new RangeError("Cannot end slice after the end of the clip")
    }
}

const ptCheckEffectRange = (
    effectname: string, parameter: string, effectStartValue: number,
    effectStartLocation: number, effectEndValue: number, effectEndLocation: number
) => {
    let res = true
    const paramInfo = EFFECT_MAP[effectname].PARAMETERS[parameter]

    if (effectStartValue !== undefined) {
        if (effectEndValue === undefined) {
            if ((paramInfo.min <= effectStartValue) && (paramInfo.max >= effectStartValue)) {
                res = true
            } else {
                res = false
            }
        } else if (effectEndValue !== undefined) {
            if (((paramInfo.min <= effectStartValue) && (paramInfo.max >= effectStartValue)) && ((paramInfo.min <= effectEndValue) && (paramInfo.max >= effectEndValue))) {
                res = true
            } else {
                res = false
            }
        }
    }

    if ((effectStartLocation !== undefined) && ((effectEndLocation !== undefined) && (effectEndLocation !== 0))) {
        if (effectEndLocation < effectStartLocation) {
            throw new RangeError("Cannot have effect start measure greater than end measure")
        }
    }

    if (res !== true) {
        const error = new RangeError(parameter + " is out of range")
        throw error
    }
}

// Helper function to add clips to the result.
export const addClip = (result: DAWData, clip: Clip, silence: number | undefined = undefined) => {
    clip.silence = silence ?? 0

    // bounds checking
    if (clip.track === 0) {
        throw new RangeError("Cannot insert media on the master track")
    }

    if (clip.track < 0) {
        throw new RangeError("Cannot insert media before the first track")
    }

    if (clip.measure < 1) {
        throw new RangeError("Cannot insert media before the first measure")
    }

    if (clip.start === clip.end) {
        throw new RangeError("Clip length cannot be zero")
    }

    if (clip.end !== 0 && clip.end < clip.start) {
        throw new RangeError("Clip cannot end before it starts")
    }

    if (clip.end < 0 || clip.start < 0) {
        throw new RangeError("Clips cannot have negative start or end values")
    }

    // create the track if it does not exist
    while (clip.track >= result.tracks.length) {
        result.tracks.push({
            clips: [],
            effects: {},
        } as unknown as Track)
    }

    clip.sourceLine = getLineNumber()
    result.tracks[clip.track].clips.push(clip)
}

// Helper function to add effects to the result.
export function addEffect(
    result: DAWData, track: number, name: string, parameter: string,
    startMeasure: number, startValue: number, endMeasure: number, endValue: number
) {
    // bounds checking
    if (track < 0) {
        throw new RangeError("Cannot add effects before the first track")
    }

    const effectType = EFFECT_MAP[name]
    if (effectType === undefined) {
        throw new RangeError("Effect name does not exist")
    } else if (effectType !== null && effectType.PARAMETERS[parameter] === undefined) {
        throw new RangeError("Effect parameter does not exist")
    }

    ptCheckEffectRange(
        name, parameter, startValue,
        startMeasure, endValue, endMeasure
    )

    // create the track if it does not exist
    while (track >= result.tracks.length) {
        result.tracks.push({
            clips: [],
            effects: {},
        } as unknown as Track)
    }

    const key = name + "-" + parameter

    // create the effect list if it does not exist
    if (result.tracks[track].effects[key] === undefined) {
        result.tracks[track].effects[key] = []
    }

    const sourceLine = getLineNumber()
    const automation = result.tracks[track].effects[key]
    if (endMeasure === 0) {
        automation.push({ measure: startMeasure, value: startValue, shape: "square", sourceLine })
    } else {
        automation.push({ measure: startMeasure, value: startValue, shape: "linear", sourceLine })
        automation.push({ measure: endMeasure, value: endValue, shape: "square", sourceLine })
    }
}
