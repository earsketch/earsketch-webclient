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
import { Clip, DAWData, Track, SoundEntity } from "common"
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
        slicedClips: {}, // of the form sliceKey(str) -> {sourceFile: oldSoundFile(str), start: startLocation(float), end: endLocation(float)}
    } as DAWData
}

// Set the tempo on the result object.
export function setTempo(result: DAWData, startTempo: number, startMeasure?: number, endTempo?: number, endMeasure?: number) {
    esconsole("Calling pt_setTempo from passthrough with parameter " + startTempo, ["DEBUG", "PT"])

    const args = [...arguments].slice(1) // remove first argument
    ptCheckArgs("setTempo", args, 1, 4)
    ptCheckType("startTempo", "number", startTempo)
    ptCheckRange("startTempo", startTempo, 45, 220)

    if (startMeasure === undefined) {
        startMeasure = 1
    } else {
        ptCheckType("startMeasure", "number", startMeasure)
        ptCheckRange("startMeasure", startMeasure, { min: 1 })
    }

    if (endTempo === undefined) {
        endTempo = startTempo
    } else {
        ptCheckType("endTempo", "number", endTempo)
        ptCheckRange("endTempo", endTempo, 45, 220)
    }

    if (endMeasure === undefined) {
        endMeasure = 0
    } else {
        ptCheckType("endMeasure", "number", endMeasure)
        ptCheckRange("endMeasure", endMeasure, { min: 1 })
    }

    addEffect(result, 0, "TEMPO", "TEMPO", startMeasure, startTempo, endMeasure, endTempo)
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
export function fitMedia(result: DAWData, filekey: string, trackNumber: number, startLocation: number, endLocation: number) {
    esconsole(`Calling pt_fitMedia from passthrough with parameters ${filekey}, ${trackNumber}, ${startLocation}, ${endLocation}`, "PT")

    const args = [...arguments].slice(1) // remove first argument
    ptCheckArgs("fitMedia", args, 4, 4)
    ptCheckType("filekey", "string", filekey)
    ptCheckFilekeyType(filekey)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("startLocation", "number", startLocation)
    ptCheckType("endLocation", "number", endLocation)

    // the range check in `addClip` cannot catch the case when end = start-1
    if (endLocation < startLocation) {
        throw new RangeError("Clip cannot end before it starts")
    }

    const clip = {
        filekey: filekey,
        track: trackNumber,
        measure: startLocation,
        start: 1,
        end: endLocation - startLocation + 1,
        scale: false,
        loop: true,
    } as unknown as Clip

    addClip(result, clip)
    return result
}

// Insert a media clip.
export function insertMedia(result: DAWData, fileName: string, trackNumber: number, trackLocation: number, scaleAudio: number | undefined) {
    esconsole(
        "Calling pt_insertMedia from passthrough with parameters " +
        fileName + " , " +
        trackNumber + " , " +
        trackLocation + " , " +
        scaleAudio, "PT")

    const args = [...arguments].slice(1) // remove first argument
    ptCheckArgs("insertMedia", args, 3, 4)
    ptCheckType("fileName", "string", fileName)
    ptCheckFilekeyType(fileName)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)

    // Now check if the optional parameters have valid datatypes. If not specified, initialize to defaults.
    if (trackLocation !== undefined) {
        if (typeof trackLocation !== "number") {
            throw new TypeError("trackLocation must be a number")
        } else if (trackLocation < 1.0) {
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
        filekey: fileName,
        track: trackNumber,
        measure: trackLocation,
        start: 1,
        end: 0,
        scale: scaleAudio,
        loop: true,
    } as unknown as Clip

    addClip(result, clip)

    return result
}

// Insert a media clip section.
export function insertMediaSection(
    result: DAWData,
    fileName: string,
    trackNumber: number,
    trackLocation: number,
    mediaStartLocation: number,
    mediaEndLocation: number
) {
    esconsole(
        "Calling pt_insertMediaSection from passthrough with parameters " +
        fileName + " , " +
        trackNumber + " , " +
        trackLocation + " , " +
        mediaStartLocation + " , " +
        mediaEndLocation, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("insertMediaSection", args, 3, 6)
    ptCheckType("fileName", "string", fileName)
    ptCheckFilekeyType(fileName)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("trackLocation", "number", trackLocation)

    if (mediaStartLocation !== undefined) {
        if (typeof (mediaStartLocation) !== "number") {
            throw new TypeError("mediaStartLocation must be a number")
        }
    } else {
        mediaStartLocation = 0
    }

    if (mediaEndLocation !== undefined) {
        if (typeof (mediaEndLocation) !== "number") {
            throw new TypeError("mediaEndLocation must be a number")
        }
    } else {
        mediaEndLocation = 0
    }

    const tempoMap = new TempoMap(result)

    return (async () => {
        await postRun.loadBuffersForSampleSlicing(result)
        const sound = await audioLibrary.getSound(fileName)
        const tempo = sound.tempo ?? tempoMap.points[0].tempo
        const dur = ESUtils.timeToMeasureDelta(sound.buffer.duration, tempo)
        if (mediaStartLocation - 1 >= dur) {
            throw new RangeError("mediaStartLocation exceeds sound duration")
        }
        const clip = {
            filekey: fileName,
            track: trackNumber,
            measure: trackLocation,
            start: mediaStartLocation,
            end: mediaEndLocation,
            loop: true,
        } as Clip
        addClip(result, clip)
        return result
    })()
}

// Make a beat of audio clips.
export function makeBeat(result: DAWData, media: any, track: number, measure: number, beatString: string, stepsPerMeasure: number = 16) {
    esconsole(
        "Calling pt_makeBeat from passthrough with parameters " +
        media + " , " +
        track + " , " +
        measure + " , " +
        beatString,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("makeBeat", args, 4, 5)

    if (media.constructor !== Array && typeof media !== "string") {
        throw new TypeError("media must be a list or a string")
    }

    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, { min: 1 })
    ptCheckRange("measure", measure, { min: 1 })
    ptCheckType("stepsPerMeasure", "number", stepsPerMeasure)
    ptCheckRange("stepsPerMeasure", stepsPerMeasure, { min: 1 / 1024, max: 256 })
    // stepsPerMeasure min 1/1024 means one beat is 1024 measures (absurd, but why not?)
    // stepsPerMeasure max 256 results in min slices lengths of about 350 samples, assuming 120bpm and 44.1k

    stepsPerMeasure = 1.0 / stepsPerMeasure

    // ensure input media is a list
    const mediaList = []
    if (typeof media === "object") {
        for (const m of media) {
            mediaList.push(m)
        }
    } else {
        mediaList.push(media)
    }

    const SUSTAIN = "+"
    const REST = "-"

    // parse the beat string
    for (let i = 0; i < beatString.length; i++) {
        const current = parseInt(beatString[i], 16)
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beatString.length - 1) ? beatString[i + 1] : REST

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
            const location = measure + (i * stepsPerMeasure)
            const start = 1 // measure + (i * SIXTEENTH)
            let end = start + stepsPerMeasure
            let silence = 0

            if (next === REST) {
                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                let j = i + 1
                while (isNaN(parseInt(beatString[j])) && j++ < beatString.length);
                if (j >= beatString.length) {
                    silence += (j - i - 2) * stepsPerMeasure
                }
            } else if (next === SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i + 1
                while (beatString[j] === SUSTAIN && j++ < beatString.length) {
                    end += stepsPerMeasure
                }
                // skip ahead (for speed)
                i = j - 1

                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                j = i + 1
                while (beatString[j] === REST && j++ < beatString.length);
                if (j >= beatString.length) {
                    silence += (j - i - 1) * stepsPerMeasure
                }
            }

            const clip = {
                filekey: filekey,
                track: track,
                measure: location,
                start: start,
                end: end,
                scale: false,
                loop: false,
            } as unknown as Clip

            addClip(result, clip, silence)
        }
    }

    return result
}

// Make a beat from media clip slices.
export function makeBeatSlice(result: DAWData, media: string, track: number, measure: number, beatString: string, beatNumber: number | number[], stepSize: number = 16) {
    esconsole(
        "Calling pt_makeBeatSlice from passthrough with parameters " +
        media + " , " +
        track + " , " +
        measure + " , " +
        beatString + " , " +
        beatNumber,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("makeBeatSlice", args, 5, 6)
    ptCheckType("media", "string", media)
    ptCheckFilekeyType(media)
    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, { min: 1 })
    ptCheckRange("measure", measure, { min: 1 })
    ptCheckType("stepsPerMeasure", "number", stepSize)
    ptCheckRange("stepsPerMeasure", stepSize, { min: 1 / 1024, max: 256 })

    stepSize = 1.0 / stepSize

    if (beatNumber.constructor !== Array &&
        typeof (beatNumber) !== "number") {
        throw new TypeError("beatNumber must be a list or a number")
    }

    if (beatNumber.constructor === Array) {
        beatNumber.forEach(v => {
            if (typeof v !== "number") {
                throw new TypeError("beatNumber values must be numbers.")
            } else if (v < 1) {
                throw new RangeError("beatNumber values cannot be below 1.")
            }
        })
    }

    // ensure input beats is a list
    const beatList = []
    if (typeof beatNumber === "object") {
        for (const beat of beatNumber) {
            beatList.push(beat)
        }
    } else {
        // TODO: This seems wrong; beatList should be type number[], but media is explicitly type string.
        beatList.push(media)
    }

    const SUSTAIN = "+"
    const REST = "-"

    const promises = []

    // parse the beat string
    for (let i = 0; i < beatString.length; i++) {
        const current = parseInt(beatString[i], 16)
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beatString.length - 1) ? beatString[i + 1] : REST

        // current beat is a valid number
        if (!isNaN(current)) {
            if (current > beatList.length - 1) {
                throw new RangeError(i18n.t("messages:esaudio.stringindex"))
            }
            const start = measure + (i * stepSize)
            const sliceStart = beatList[current] as number
            let sliceEnd = (beatList[current] as number) + stepSize

            if (next === REST) {
                // next char is a rest, so do nothing
            } else if (next === SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i + 1
                while (beatString[j] === SUSTAIN && j++ < beatString.length) {
                    sliceEnd += stepSize
                }
                // skip ahead
                i = j - 1
            }

            promises.push(insertMediaSection(result, media, track, start, sliceStart, sliceEnd))
        }
    }

    return Promise.all(promises).then(() => result)
}

// Analyze a clip.
// Returns the analyzed value. Does not alter the result (it just takes it as a parameter for consistency).
export function analyze(result: DAWData, audioFile: string, featureForAnalysis: string) {
    esconsole(
        "Calling pt_analyze from passthrough with parameters " +
        audioFile + " , " +
        featureForAnalysis,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("analyze", args, 2, 2)

    ptCheckType("audioFile", "string", audioFile)
    ptCheckFilekeyType(audioFile)
    ptCheckType("featureForAnalysis", "string", featureForAnalysis)

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    return postRun.loadBuffersForSampleSlicing(result)
        .then(() => audioLibrary.getSound(audioFile))
        .then(sound => {
            const blockSize = 2048 // TODO: hardcoded in analysis.js as well
            if (sound.buffer.length < blockSize) {
                throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
            }
            return analyzer.computeFeatureForBuffer(sound.buffer, featureForAnalysis)
        })
}

// Analyze a clip for time.
// Returns the analyzed value. Does not alter the result.
export function analyzeForTime(result: DAWData, audioFile: string, featureForAnalysis: string, startTime: number, endTime: number) {
    esconsole(
        "Calling pt_analyzeForTime from passthrough with parameters " +
        audioFile + " , " +
        featureForAnalysis + " , " +
        startTime + " , " +
        endTime,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeForTime", args, 4, 4)

    ptCheckType("featureForAnalysis", "string", featureForAnalysis)
    ptCheckType("audioFile", "string", audioFile)
    ptCheckFilekeyType(audioFile)
    // TODO: These should probably be renamed, as they are actually in measures.
    ptCheckType("startTime", "number", startTime)
    ptCheckType("endTime", "number", endTime)

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (startTime > endTime) {
        throw new RangeError(
            "Cannot have start time greater than end time in Analysis call"
        )
    }

    const tempoMap = new TempoMap(result)

    return postRun.loadBuffersForSampleSlicing(result)
        .then(() => audioLibrary.getSound(audioFile))
        .then(sound => {
            // For consistency with old behavior, use clip tempo if available and initial tempo if not.
            const tempo = sound.tempo ?? tempoMap.points[0].tempo
            const sampleRate = audioContext.sampleRate
            const startSecond = ESUtils.measureToTime(startTime, tempo)
            const endSecond = ESUtils.measureToTime(endTime, tempo)
            const startSample = Math.round(sampleRate * startSecond)
            const endSample = Math.round(sampleRate * endSecond)
            const blockSize = 2048 // TODO: hardcoded in analysis.js as well
            if ((endSample - startSample) < blockSize) {
                throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
            }
            return analyzer.computeFeatureForBuffer(sound.buffer, featureForAnalysis, startSecond, endSecond)
        })
}

export function analyzeTrack(result: DAWData, trackNumber: number, featureForAnalysis: string) {
    esconsole(`Calling pt_analyzeTrack from passthrough with parameters ${trackNumber}, ${featureForAnalysis}`, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeTrack", args, 2, 2)

    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("featureForAnalysis", "string", featureForAnalysis)

    ptCheckRange("trackNumber", trackNumber, { min: 0 })

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (result.tracks[trackNumber] === undefined) {
        throw new Error("Cannot analyze a track that does not exist: " + trackNumber)
    }

    // `analyzeResult` will contain a result object that contains only one track that we want to analyze.
    // (Plus the mix track, with its tempo curve.)
    const analyzeResult = {
        tracks: [
            { clips: [], effects: { "TEMPO-TEMPO": result.tracks[0].effects["TEMPO-TEMPO"] } },
            result.tracks[trackNumber],
        ],
        length: 0,
        slicedClips: result.slicedClips,
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
        return analyzer.computeFeatureForBuffer(buffer, featureForAnalysis)
    })()
}

export function analyzeTrackForTime(result: DAWData, trackNumber: number, featureForAnalysis: string, startTime: number, endTime: number) {
    esconsole(
        "Calling pt_analyzeTrackForTime from passthrough with parameters " +
        trackNumber + " , " +
        featureForAnalysis + " , " +
        startTime + " , " +
        endTime,
        "PT"
    )

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeTrackForTime", args, 4, 4)

    ptCheckType("featureForAnalysis", "string", featureForAnalysis)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("startTime", "number", startTime)
    ptCheckType("endTime", "number", endTime)

    ptCheckRange("trackNumber", trackNumber, { min: 0 })

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (result.tracks[trackNumber] === undefined) {
        throw new Error("Cannot analyze a track that does not exist: " + trackNumber)
    }

    if (startTime > endTime) {
        throw new RangeError(
            "Cannot have start time greater than end time in Analysis call."
        )
    }

    // `analyzeResult` will contain a result object that contains only one track that we want to analyze.
    // (Plus the mix track, with its tempo curve.)
    const analyzeResult = {
        tracks: [
            { clips: [], effects: { "TEMPO-TEMPO": result.tracks[0].effects["TEMPO-TEMPO"] } },
            result.tracks[trackNumber],
        ],
        length: 0,
        slicedClips: result.slicedClips,
    }

    return (async () => {
        await postRun.postRun(analyzeResult as any)
        // TODO: analyzeTrackForTime FAILS to run a second time if the
        // track has effects using renderer.renderBuffer()
        // Until a fix is found, we use mergeClips() and ignore track effects.
        const clips = analyzeResult.tracks[1].clips
        const tempoMap = new TempoMap(analyzeResult as any as DAWData)
        const startSecond = tempoMap.measureToTime(startTime)
        const endSecond = tempoMap.measureToTime(endTime)
        // Check if analysis window is at least one block long.
        const blockSize = 2048 // TODO: hardcoded in analysis.js as well
        if ((endSecond - startSecond) * audioContext.sampleRate < blockSize) {
            throw new RangeError(i18n.t("messages:esaudio.analysisTimeTooShort"))
        }
        const buffer = await renderer.mergeClips(clips, tempoMap)
        return analyzer.computeFeatureForBuffer(buffer, featureForAnalysis, startSecond, endSecond)
    })()
}

// Get the duration of a clip.
export function dur(result: DAWData, fileKey: string) {
    esconsole("Calling pt_dur from passthrough with parameters " +
                fileKey, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("dur", args, 1, 1)
    ptCheckType("fileKey", "string", fileKey)

    const tempoMap = new TempoMap(result)
    return audioLibrary.getSound(fileKey).then(sound => {
        // For consistency with old behavior, use clip tempo if available and initial tempo if not.
        const tempo = sound.tempo ?? tempoMap.points[0].tempo
        // Round to nearest hundredth.
        return Math.round(ESUtils.timeToMeasureDelta(sound.buffer.duration, tempo) * 100) / 100
    })
}

// Return a Gaussian distributed random number.
export function gauss(result: DAWData, mean: number, stddev: number) {
    esconsole(
        "Calling pt_gauss from passthrough with parameters " +
        mean + " " +
        stddev,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("gauss", args, 0, 2)

    return Math.randomGaussian(mean, stddev)
}

// Import an image as number data.
export function importImage(result: DAWData, imageURL: string, nrows: number, ncols: number, color: undefined | boolean) {
    esconsole(
        "Calling pt_importImage from passthrough with parameters " +
        imageURL + " , " +
        nrows + " , " +
        ncols + " , " +
        color,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("importImage", args, 3, 4)

    ptCheckType("imageURL", "string", imageURL)
    ptCheckType("nrows", "number", nrows)
    ptCheckType("ncols", "number", ncols)

    if (imageURL.substring(0, 4) !== "http") {
        userConsole.warn("Image url does not start with http:// - prepending string to url")
        imageURL = imageURL + "http://"
    }

    if (color !== undefined) {
        ptCheckType("color", "boolean", color)
    } else {
        color = false
    }

    // make the HTTP request
    return request.post("/thirdparty/stringifyimage", {
        image_url: imageURL,
        width: "" + nrows,
        height: "" + ncols,
        color: "" + !!color,
    }).then(response => {
        esconsole("Image data received: " + response, "PT")
        return response
    }).catch(() => {
        throw new InternalError("We could not load the image.")
    })
}

export function importFile(result: DAWData, fileURL: string) {
    esconsole("Calling pt_importFile from passthrough with parameters " + fileURL, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("importFile", args, 1, 1)
    ptCheckType("fileURL", "string", fileURL)

    if (fileURL.substring(0, 4) !== "http") {
        userConsole.warn("File url does not start with http:// - prepending string to url")
        fileURL = "http://" + fileURL
    }

    // make the HTTP request
    return request.post("/thirdparty/stringifyfile", { file_url: fileURL }).then(response => {
        esconsole("File data received: " + response, "PT")
        return response
    }).catch(() => {
        throw new InternalError("We could not load the file.")
    })
}

// Provides a way to print to the EarSketch console.
export function println(result: DAWData, msg: any) {
    esconsole(
        "Calling pt_println from passthrough with parameter " +
        msg,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("println", args, 1, 1)
    if (typeof msg !== "string") {
        msg = JSON.stringify(msg) ?? String(msg)
    }
    userConsole.log(msg)

    // burdell confetti easter egg
    if (msg.replace(".", "").toUpperCase() === "GEORGE P BURDELL") {
        userConsole.log("You've discovered the BURDELL EASTER EGG. Go Georgia Tech!")
        blastConfetti()
    }
}

// Prompt for user input.
export function readInput(result: DAWData, msg: string) {
    esconsole("Calling pt_readInput from passthrough with parameter " + msg, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("readInput", args, 0, 1)
    msg = msg ?? ""
    ptCheckType("readInput", "string", msg)
    return (window as any).esPrompt(msg)
}

// Replace a list element.
export function replaceListElement(result: DAWData, inputList: any[], elementToReplace: any, withElement: any) {
    esconsole(
        "Calling pt_replaceListElement from passthrough with parameters " +
        inputList + " , " +
        elementToReplace + " , " +
        withElement,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("replaceListElement", args, 3, 3)
    ptCheckType("inputList", "array", inputList)

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
export function replaceString(result: DAWData, patternString: string, characterToReplace: string, withElement: string) {
    esconsole(
        "Calling pt_replaceString from passthrough with parameters " +
        patternString + " , " +
        characterToReplace + " , " +
        withElement,
        "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("replaceString", args, 3, 3)
    ptCheckType("patternString", "string", patternString)
    ptCheckType("characterToReplace", "string", characterToReplace)
    ptCheckType("withElement", "string", withElement)

    const patternList = patternString.split("")
    for (let i = 0; i < patternString.length; i++) {
        if (patternList[i] === characterToReplace) {
            patternList[i] = withElement
        }
    }
    return patternList.join("")
}

// Reverse a list.
export function reverseList(result: DAWData, inputList: any[]) {
    esconsole("Calling pt_reverseList from passthrough with parameters " + inputList, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("reverseList", args, 1, 1)
    ptCheckType("inputList", "array", inputList)

    inputList = inputList.slice() // create a copy
    return inputList.reverse()
}

// Reverse a string.
export function reverseString(result: DAWData, inputString: string) {
    esconsole("Calling pt_reverseString from passthrough with parameters " + inputString, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("reverseString", args, 1, 1)
    ptCheckType("inputString", "string", inputString)

    return inputString.split("").reverse().join("")
}

// Create a rhythmic effect envelope from a string.
export function rhythmEffects(
    result: DAWData,
    track: number,
    effectType: string,
    effectParameter: string,
    effectList: number[],
    measure: number,
    beatString: string
) {
    esconsole("Calling pt_rhythmEffects from passthrough with parameters " +
        [track, effectType, effectParameter, effectList, measure, beatString].join(", "), "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("rhythmEffects", args, 6, 6)
    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("effectType", "string", effectType)
    ptCheckType("effectParameter", "string", effectParameter)
    ptCheckType("effectList", "array", effectList)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, { min: 0 })

    const SUSTAIN = "+"
    const RAMP = "-"
    const SIXTEENTH = 0.0625

    let prevValue
    let prevMeasure = measure

    for (let i = 0; i < beatString.length; i++) {
        const current = beatString[i]
        const next = beatString[i + 1]
        const currentValue: number | undefined = prevValue

        if (!isNaN(parseInt(current))) {
            // parsing a number, set a new previous value
            prevValue = effectList[parseInt(current)]
        } else if (isNaN(parseInt(current)) && next !== current) {
            // not currently parsing a number and the next char is not
            // the same as the current char
            let endValue: number = currentValue!

            if (current === RAMP && !isNaN(parseInt(next))) {
                // case: ramp to number
                endValue = effectList[parseInt(next)]
            } else if (current === SUSTAIN && !isNaN(parseInt(next))) {
                // case: sustain to number
                endValue = currentValue!
            } else if (current === RAMP && next === SUSTAIN) {
                // case: ramp to sustain

                // move to next value
                while (beatString[++i] === SUSTAIN && i++ < beatString.length);

                // found a  number
                if (!isNaN(parseInt(beatString[i - 1]))) {
                    endValue = effectList[parseInt(beatString[i - 1])]
                } else {
                    throw RangeError("Invalid beatString.")
                }
            } else if (current === SUSTAIN && next === RAMP) {
                // case: sustain to ramp
                endValue = currentValue!
            }

            const endMeasure = measure + (1 + i) * SIXTEENTH
            // TODO: should probably throw an error if currentValue is actually undefined
            addEffect(result, track, effectType, effectParameter, prevMeasure, currentValue!, endMeasure, endValue)
            prevMeasure = endMeasure
            prevValue = endValue
        }
    }
    return result
}

export function setEffect(
    result: DAWData, trackNumber: number, effect: string, parameter: string, effectStartValue: number,
    effectStartLocation: number, effectEndValue: number, effectEndLocation: number
) {
    esconsole("Calling pt_setEffect from passthrough with parameters " +
        [trackNumber, effect, parameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation].join(", "), "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("setEffect", args, 2, 7)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("effect", "string", effect)

    ptCheckRange("trackNumber", trackNumber, { min: 0 })

    if (parameter !== undefined) {
        ptCheckType("parameter", "string", parameter)
    } else {
        parameter = EFFECT_MAP[effect].DEFAULT_PARAM
    }

    if (effectStartValue !== undefined) {
        ptCheckType("effectStartValue", "number", effectStartValue)
    } else {
        effectStartValue = EFFECT_MAP[effect].PARAMETERS[parameter].default
    }

    if (effectStartLocation !== undefined) {
        ptCheckType("effectStartLocation", "number", effectStartLocation)
        ptCheckRange("effectStartLocation", effectStartLocation, { min: 1 })
    } else {
        effectStartLocation = 1
    }

    if (effectEndValue !== undefined) {
        ptCheckType("effectEndValue", "number", effectEndValue)
    } else {
        effectEndValue = effectStartValue
    }

    if (effectEndLocation !== undefined) {
        ptCheckType("effectEndLocation", "number", effectEndLocation)
        ptCheckRange("effectEndLocation", effectEndLocation, { min: 1 })
    } else {
        effectEndLocation = 0
    }

    addEffect(result, trackNumber, effect, parameter, effectStartLocation, effectStartValue, effectEndLocation, effectEndValue)
    return result
}

// Slice a part of a soundfile to create a new sound file variable
export function createAudioSlice(result: DAWData, oldSoundFile: string, startLocation: number, endLocation: number) {
    // TODO AVN: parameter validation - how to determine slice start/end is in correct range?

    const args = [...arguments].slice(1) // remove first argument
    ptCheckArgs("createAudioSlice", args, 3, 3)
    ptCheckType("filekey", "string", oldSoundFile)
    ptCheckFilekeyType(oldSoundFile)
    ptCheckType("startLocation", "number", startLocation)
    ptCheckType("endLocation", "number", endLocation)
    ptCheckAudioSliceRange(result, oldSoundFile, startLocation, endLocation)
    if (oldSoundFile in result.slicedClips) {
        throw new ValueError("Creating slices from slices is not currently supported")
    }

    const sliceKey = oldSoundFile + "-" + startLocation + "-" + endLocation
    const sliceDef = { sourceFile: oldSoundFile, start: startLocation, end: endLocation }

    result.slicedClips[sliceKey] = sliceDef

    return { result, returnVal: sliceKey }
}

// Select a random file.
export function selectRandomFile(result: DAWData, folderSubstring: string = "") {
    esconsole(`Calling pt_selectRandomFile from passthrough with parameters ${folderSubstring}`, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("selectRandomFile", args, 0, 1)
    ptCheckType("folderSubstring", "string", folderSubstring)

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
export function shuffleList(result: DAWData, array: any[]) {
    esconsole(`Calling pt_shuffleList from passthrough with parameters ${array}`, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("shuffleList", args, 1, 1)
    ptCheckType("inputList", "array", array)

    // Fisher-Yates
    const a = array
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
    esconsole(`Calling pt_shuffleString from passthrough with parameters ${inputString}`, "PT")

    const args = [...arguments].slice(1)
    ptCheckArgs("shuffleString", args, 1, 1)
    ptCheckType("inputString", "string", inputString)

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

const ptCheckArgs = (funcName: string, args: any[], required: number, optional: number) => {
    if (required === optional) {
        if (args.length !== required) {
            throw new TypeError(funcName + "() takes exactly " + required + " argument(s) (" + args.length + " given)")
        }
    } else {
        if ((args.length >= required) && (args.length <= optional)) {
            // Pass.
        } else if (args.length < required) {
            throw new TypeError(funcName + "() takes at least " + required + " argument(s) (" + args.length + " given)")
        } else {
            throw new TypeError(funcName + "() takes only " + required + " argument(s) (" + args.length + " given)")
        }
    }
}

const ptCheckType = (name: string, exptype: string, arg: any) => {
    if (exptype === "array") {
        if (arg.constructor !== Array) {
            throw new TypeError(name + " must be a list")
        }
    } else if (exptype === "boolean") {
        // eslint-disable-next-line valid-typeof
        if (typeof arg !== exptype) {
            // TODO: Old code and comment; this seems like a bug,
            // as this should throw here (if arg is not 0, 1, or a boolean) rather than returning.
            // "for some reason Skulpt maps booleans to 1 or 0"
            return arg === 1 || arg === 0
        }
    } else {
        // eslint-disable-next-line valid-typeof
        if (typeof arg !== exptype) {
            throw new TypeError(name + " must be a " + exptype)
        }
    }
}

// call this after the regular type check
const ptCheckInt = (name: string, arg: number) => {
    if (arg.toString().includes(".")) {
        throw new TypeError(name + " must be an integer")
    }
}

const ptCheckFilekeyType = (filekey: string) => {
    if ((filekey[0] === "'" && filekey[filekey.length - 1] === "'") ||
        (filekey[0] === "'" && filekey[filekey.length - 1] === "'")) {
        throw new TypeError("Media constant (" + filekey + ") should not include quotation marks")
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

/**
 * Helper function to add clips to the result.
 *
 * @param {Object} result The result object to add the clip to.
 * @param {Object} clip The clip to add.
 * @param {string} clip.filekey The filekey to load in the clip.
 * @param {integer} clip.track The track to add the clip to.
 * @param {integer} clip.measure The measure to begin playing at.
 * @param {number} clip.start The start measure of the clip slice to play.
 * @param {number} clip.end The end measure of the clip slice to play.
 * @param {boolean} clip.scale Whether the clip should be scaled or not to
 * fill the space (not implemented).
 * @param {boolean} clip.loop Whether the clip should be loop or not to
 * fill the space.
 * @param {number} silence The length of silence after the clip used for
 * determining the length of the song (e.g., if makebeat has silence at the
 * end of the song).
 */
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
