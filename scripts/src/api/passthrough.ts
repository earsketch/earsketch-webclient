// This file contains functions meant to consolidate all EarSketch API functions
// into a single source. Both the Python and Javascript libraries are simply
// wrappers for these functions.

// If your API function needs to be asynchronous, make sure it returns a
// promise, and use suspendPassthrough() in the Javascript and Python wrappers.

import * as analyzer from "../model/analyzer"
import * as applyEffects from "../model/applyeffects"
import audioContext from "../app/audiocontext"
import * as audioLibrary from "../app/audiolibrary"
import * as compiler from "../app/compiler"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import * as renderer from "../app/renderer"
import * as userConsole from "../app/userconsole"
import { Clip, DAWData, EffectRange, Track } from "../app/player"
import { measureToTime } from "../esutils"
import ESMessages from "../data/messages"
import ServiceWrapper from "./angular-wrappers"


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

// Set the initial state of the result object.
export const init = (result: DAWData, quality: any) => {
    esconsole("Calling pt_init from passthrough", "PT")

    return {
        init: true,
        finish: false,
        tempo: 120,
        length: 0,
        quality: quality,
        tracks: [],
        slicedClips: {} //of the form sliceKey(str) -> {sourceFile: oldSoundFile(str), start: startLocation(float), end: endLocation(float)}
    }
}

// Set the tempo on the result object.
export function setTempo(result: DAWData, tempo: number) {
    esconsole(
        "Calling pt_setTempo from passthrough with parameter " +
        tempo, ["DEBUG","PT"]
    )

    checkInit(result)

    const args = [...arguments].slice(1); // remove first argument
    ptCheckArgs("setTempo", args, 1, 1)
    // TODO: Can we do some of these checks automatically via TypeScript run-time reflection?
    ptCheckType("tempo", "number", tempo)
    ptCheckRange("setTempo", tempo, 45, 220)

    if(Math.floor(tempo) != tempo) throw new TypeError("tempo must be an integer")

    result.tempo = tempo

    return result
}

// Run steps to clean up the script.
export const finish = (result: DAWData) => {
    esconsole("Calling pt_finish from passthrough", "PT")

    checkInit(result)

    // We used to set a flag here. But all the flag indicated was whether the user called this function,
    // and this function didn't actually do anything *except* set that flag.
    return result
}

// Add a clip to the given result object.
export function fitMedia(result: DAWData, filekey: string, trackNumber: number, startLocation: number, endLocation: number) {

    esconsole(
        "Calling pt_fitMedia from passthrough with parameters "
        + filekey + " , "
        + trackNumber + " , "
        + startLocation + " , "
        + endLocation,"PT")

    checkInit(result)

    const args = [...arguments].slice(1); // remove first argument
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
        loop: true
    } as unknown as Clip

    addClip(result, clip)

    return result
}

// Insert a media clip.
export function insertMedia(result: DAWData, fileName: string, trackNumber: number, trackLocation: number, scaleAudio: number | undefined) {

    esconsole(
        "Calling pt_insertMedia from passthrough with parameters "
        + fileName + " , "
        + trackNumber + " , "
        + trackLocation + " , "
        + scaleAudio,"PT")

    checkInit(result)

    const args = [...arguments].slice(1); // remove first argument
    ptCheckArgs("insertMedia", args, 3, 4)
    ptCheckType("fileName", "string", fileName)
    ptCheckFilekeyType(fileName)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)

    // Now check if the optional parameters have valid datatypes. If not specified, initialize to defaults.
    if (trackLocation !== undefined) {
        if (typeof(trackLocation) !== "number") {
            throw new TypeError("trackLocation must be a number")
        } else if (trackLocation < 1.0) {
            throw new RangeError("trackLocation must be no less than 1.0")
        }
    } else {
        // trackLocation = 1.0
        throw new TypeError("trackLocation needs to be specified")
    }

    if (scaleAudio !== undefined) {
        if (typeof(scaleAudio) !== "number") {
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
        loop: true
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
    mediaEndLocation: number,
    scaleAudio: number | undefined=undefined,
) {
    esconsole(
        "Calling pt_insertMediaSection from passthrough with parameters "
        + fileName + " , "
        + trackNumber + " , "
        + trackLocation + " , "
        + mediaStartLocation + " , "
        + mediaEndLocation + " , "
        + scaleAudio,"PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("insertMediaSection", args, 3, 6)
    ptCheckType("fileName", "string", fileName)
    ptCheckFilekeyType(fileName)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("trackLocation", "number", trackLocation)

    if (mediaStartLocation !== undefined) {
        if (typeof(mediaStartLocation) !== "number") {
            throw new TypeError("mediaStartLocation must be a number")
        }
    } else {
        mediaStartLocation = 0
    }

    if (mediaEndLocation !== undefined) {
        if (typeof(mediaEndLocation) !== "number") {
            throw new TypeError("mediaEndLocation must be a number")
        }
    } else {
        mediaEndLocation = 0
    }

    if (scaleAudio !== undefined) {
        if (typeof(scaleAudio) !== "number") {
            throw new TypeError("scaleAudio must be a number")
        }
    } else {
        scaleAudio = 1
    }

    const clip = {
        filekey: fileName,
        track: trackNumber,
        measure: trackLocation,
        start: mediaStartLocation,
        end: mediaEndLocation,
        scale: scaleAudio,
        loop: true
    } as unknown as Clip

    addClip(result, clip)

    return result
}

// Make a beat of audio clips.
export function makeBeat(result: DAWData, media: any, track: number, measure: number, beatString: string) {
    esconsole(
        "Calling pt_makeBeat from passthrough with parameters "
        + media + " , "
        + track + " , "
        + measure + " , "
        + beatString,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("makeBeat", args, 4, 4)

    if (media.constructor !== Array && typeof media !== "string") {
        throw new TypeError("media must be a list or a string")
    }

    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, {min: 1})
    ptCheckRange("measure", measure, {min: 1})

    // ensure input media is a list
    const mediaList = []
    if (typeof media == "object") {
        for (const m of media) {
            mediaList.push(m)
        }
    } else {
        mediaList.push(media)
    }

    const SUSTAIN = "+"
    const REST = "-"
    const SIXTEENTH = 0.0625

    // parse the beat string
    for (let i = 0; i < beatString.length; i++) {
        const current = parseInt(beatString[i])
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beatString.length - 1) ? beatString[i + 1] : REST

        // current beat is a valid number
        if (!isNaN(current)) {
            if (current > mediaList.length - 1) {
                if (mediaList.length === 1) {
                    throw new RangeError(ESMessages.esaudio.nonlistRangeError)
                } else {
                    throw new RangeError(ESMessages.esaudio.stringindex)
                }
            }
            const filekey = mediaList[current]
            const location = measure + (i * SIXTEENTH)
            const start = 1; //measure + (i * SIXTEENTH)
            let end = start + SIXTEENTH
            let silence = 0

            if (next == REST) {
                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                let j = i+1
                while (isNaN(parseInt(beatString[j])) &&
                        j++ < beatString.length) {
                }
                if (j >= beatString.length) {
                    silence += (j-i-2)*SIXTEENTH
                }

            } else if (next == SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i+1
                while (beatString[j] == SUSTAIN && j++ < beatString.length){
                    end += SIXTEENTH
                }
                // skip ahead (for speed)
                i = j-1

                // next char is a rest, so we calculate the length and
                // add silence to the end if necessary
                j = i+1
                while (beatString[j] == REST &&
                        j++ < beatString.length) {
                }
                if (j >= beatString.length) {
                    silence += (j-i-1)*SIXTEENTH
                }
            }

            const clip = {
                filekey: filekey,
                track: track,
                measure: location,
                start: start,
                end: end,
                scale: false,
                loop: false
            } as unknown as Clip

            addClip(result, clip, silence)
        }
    }

    return result
}

// Make a beat from media clip slices.
export function makeBeatSlice(result: DAWData, media: string, track: number, measure: number, beatString: string, beatNumber: number | number[]) {
    esconsole(
        "Calling pt_makeBeatSlice from passthrough with parameters "
        + media + " , "
        + track + " , "
        + measure + " , "
        + beatString + " , "
        + beatNumber,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("makeBeatSlice", args, 5, 5)
    ptCheckType("media", "string", media)
    ptCheckFilekeyType(media)
    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, {min: 1})
    ptCheckRange("measure", measure, {min: 1})

    if (beatNumber.constructor !== Array
        && typeof(beatNumber) !== "number") {
        throw new TypeError("beatNumber must be a list or a number")
    }

    if (beatNumber.constructor === Array) {
        beatNumber.forEach(function (v) {
            if (typeof(v) !== "number") {
                throw new TypeError(
                    "beatNumber values must be numbers."
                )
            } else {
                if (v < 1) {
                    throw new RangeError(
                        "beatNumber values cannot be below 1."
                    )
                }
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
    const SIXTEENTH = 0.0625

    // parse the beat string
    for (let i = 0; i < beatString.length; i++) {
        const current = parseInt(beatString[i])
        // add a rest at the "end" so that any number in the last index gets
        // included
        const next = (i < beatString.length - 1) ? beatString[i + 1] : REST

        // current beat is a valid number
        if (!isNaN(current)) {
            if (current > beatList.length - 1) {
                throw new RangeError(ESMessages.esaudio.stringindex)
            }
            const start = measure + (i * SIXTEENTH)
            const sliceStart = beatList[current] as number
            let sliceEnd = (beatList[current] as number) + SIXTEENTH

            if (next == REST) {
                // next char is a rest, so do nothing
            } else if (next == SUSTAIN) {
                // next char is a sustain, so add to the end length
                // the number of sustain characters in a row
                let j = i + 1
                while (beatString[j] == SUSTAIN && j++ < beatString.length){
                    sliceEnd += SIXTEENTH
                }
                // skip ahead
                i = j-1
            }

            result = insertMediaSection(result, media, track, start, sliceStart, sliceEnd)
        }
    }

    return result
}

// Analyze a clip.
// Returns the analyzed value. Does not alter the result (it just takes it as a parameter for consistency).
export function analyze(result: DAWData, audioFile: string, featureForAnalysis: string) {

    esconsole(
        "Calling pt_analyze from passthrough with parameters "
        + audioFile + " , "
        + featureForAnalysis,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("analyze", args, 2, 2)

    ptCheckType("audioFile", "string", audioFile)
    ptCheckFilekeyType(audioFile)
    ptCheckType("featureForAnalysis", "string", featureForAnalysis)

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    const tempo = result.tempo
    const q = result.quality


    const blockSize = 2048; // TODO: hardcoded in analysis.js as well
    const sampleRate = audioContext.sampleRate
    if (audioFile in result.slicedClips) {
        const sliceLength_measure = result.slicedClips[audioFile].end - result.slicedClips[audioFile].start
        const sliceLength_samp = sliceLength_measure * 4 * (60.0/tempo) * sampleRate
        if(sliceLength_samp < blockSize) {
            throw new RangeError(audioFile + " is too short to be analyzed.")
        }
    }

    return compiler.loadBuffersForSampleSlicing(result)
    .then(
        function(newResult: any){ 
            return audioLibrary.getAudioClip(audioFile, newResult.tempo, q)
        }
    ).catch(function(err: Error) {
        throw err
    })
    .then(
        function(buffer: any) {
            return analyzer.computeFeatureForBuffer(buffer, featureForAnalysis, tempo)
        }
    ).catch(function(err: Error) {
        throw err
    })
}

// Analyze a clip for time.
// Returns the analyzed value. Does not alter the result.
export function analyzeForTime(result: DAWData, audioFile: string, featureForAnalysis: string, startTime: number, endTime: number) {
    esconsole(
        "Calling pt_analyzeForTime from passthrough with parameters "
        + audioFile + " , "
        + featureForAnalysis + " , "
        + startTime + " , "
        + endTime,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeForTime", args, 4, 4)

    ptCheckType("featureForAnalysis", "string", featureForAnalysis)
    ptCheckType("audioFile", "string", audioFile)
    ptCheckFilekeyType(audioFile)
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

    // Cannot do this assertion within the async promise chain
    const sampleRate = audioContext.sampleRate
    const startTimeInSamples = Math.round(sampleRate * measureToTime(startTime, result.tempo))
    const endTimeInSamples = Math.round(sampleRate * measureToTime(endTime, result.tempo))
    const blockSize = 2048; // TODO: hardcoded in analysis.js as well
    if ((endTimeInSamples - startTimeInSamples) < blockSize) {
        throw new RangeError(ESMessages.esaudio.analysisTimeTooShort)
    }

    const tempo = result.tempo
    const q = result.quality
    return compiler.loadBuffersForSampleSlicing(result)
    .then(
        function(newResult: any){ 
            return audioLibrary.getAudioClip(audioFile, newResult.tempo, q)
        }
    ).catch(function(err: Error) {
        throw err
    })
    .then(
        function(buffer: AudioBuffer) {
            return analyzer.computeFeatureForBuffer(
                buffer, featureForAnalysis, tempo, startTime, endTime
            )
        }
    ).catch(function(err: Error) {
        throw err
    })
}

export function analyzeTrack(result: DAWData, trackNumber: number, featureForAnalysis: string) {
    esconsole("Calling pt_analyzeTrack from passthrough with parameters "
                + trackNumber + " , "
                + featureForAnalysis,
                "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeTrack", args, 2, 2)

    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("featureForAnalysis", "string", featureForAnalysis)

    ptCheckRange("trackNumber", trackNumber, {min: 0})

    if (!~["spectral_centroid", "rms_amplitude"].indexOf(featureForAnalysis.toLowerCase())) {
        throw new Error("featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE")
    }

    if (result.tracks[trackNumber] === undefined) {
        throw new Error("Cannot analyze a track that does not exist: " + trackNumber)
    }

    const tempo = result.tempo
    // the analyzeResult will contain a result object that contains only
    // one track that we want to analyze
    const analyzeResult = {
        init: true,
        finish: true,
        tempo: result.tempo,
        tracks: [{clips:[],effects:{}}, result.tracks[trackNumber]],
        quality: result.quality,
        length: result.length,
        slicedClips: result.slicedClips
    }
    return compiler.postCompile(analyzeResult as any).then(function(compiled: DAWData) {
        // TODO: analyzeTrackForTime FAILS to run a second time if the
        // track has effects using renderer.renderBuffer()
        // Until a fix is found, we use mergeClips() and ignore track
        // effects.
        //return renderer.renderBuffer(result)
        const clips = compiled.tracks[1].clips
        const buffer = renderer.mergeClips(clips, result.tempo)
        return buffer
    }).catch(function(err: Error) {
        throw err
    }).then(function(buffer: AudioBuffer) {
        return analyzer.computeFeatureForBuffer(buffer, featureForAnalysis, tempo)
    }).catch(function(err: Error) {
        throw err
    })
}

export function analyzeTrackForTime(result: DAWData, trackNumber: number, featureForAnalysis: string, startTime: number, endTime: number) {
    esconsole(
        "Calling pt_analyzeTrackForTime from passthrough with parameters "
        + trackNumber + " , "
        + featureForAnalysis + " , "
        + startTime + " , "
        + endTime,
        "PT"
    )

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("analyzeTrackForTime", args, 4, 4)

    ptCheckType("featureForAnalysis", "string", featureForAnalysis)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("startTime", "number", startTime)
    ptCheckType("endTime", "number", endTime)

    ptCheckRange("trackNumber", trackNumber, {min: 0})

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

    // Cannot do this assertion within the async promise chain
    const sampleRate = audioContext.sampleRate
    const startTimeInSamples = Math.round(sampleRate * measureToTime(startTime, result.tempo))
    const endTimeInSamples = Math.round(sampleRate * measureToTime(endTime, result.tempo))
    const blockSize = 2048; // TODO: hardcoded in analysis.js as well
    if ((endTimeInSamples - startTimeInSamples) < blockSize) {
        throw new RangeError(ESMessages.esaudio.analysisTimeTooShort)
    }

    const tempo = result.tempo
    // the analyzeResult will contain a result object that contains only
    // one track that we want to analyze
    const analyzeResult = {
        init: true,
        finish: true,
        tempo: result.tempo,
        tracks: [{clips:[],effects:{}}, result.tracks[trackNumber]],
        quality: result.quality,
        length: result.length,
        slicedClips: result.slicedClips
    }

    return compiler.postCompile(analyzeResult as any).then(function(compiled: DAWData) {
        // TODO: analyzeTrackForTime FAILS to run a second time if the
        // track has effects using renderer.renderBuffer()
        // Until a fix is found, we use mergeClips() and ignore track
        // effects.
        const clips = compiled.tracks[1].clips
        const buffer = renderer.mergeClips(clips, result.tempo)
        return buffer
    }).catch(function(err: Error) {
        esconsole(err.toString(), ["ERROR","PT"])
        throw err
    }).then(function(buffer: AudioBuffer) {
        return analyzer.computeFeatureForBuffer(
            buffer, featureForAnalysis, tempo, startTime, endTime
        )
    }).catch(function(err: Error) {
        esconsole(err.toString(), ["ERROR","PT"])
        throw err
    })
}

// Get the duration of a clip.
export function dur(result: DAWData, fileKey: string) {
    esconsole("Calling pt_dur from passthrough with parameters "
                + fileKey, "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("dur", args, 1, 1)
    ptCheckType("fileKey", "string", fileKey)

    const q = result.quality
    return audioLibrary.getAudioClip(fileKey, result.tempo, q).then(
        function(buffer: AudioBuffer) {
            // rounds off precision error in JS
            const digits = 2
            return Math.round(ESUtils.timeToMeasure(buffer.duration, result.tempo) * Math.pow(10, 2)) / Math.pow(10, digits)
        }
    ).catch(function(err: Error) {
        throw err
    })
}

// Return a Gaussian distributed random number.
export function gauss(result: DAWData, mean: number, stddev: number) {
    esconsole(
        "Calling pt_gauss from passthrough with parameters "
        + mean + " "
        + stddev,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("gauss", args, 0, 2)

    return Math.randomGaussian(mean, stddev)
}

// Import an image as number data.
export function importImage(result: DAWData, imageURL: string, nrows: number, ncols: number, color: undefined | boolean) {
    esconsole(
        "Calling pt_importImage from passthrough with parameters "
        + imageURL + " , "
        + nrows + " , "
        + ncols + " , "
        + color,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("importImage", args, 3, 4)

    ptCheckType("imageURL", "string", imageURL)
    ptCheckType("nrows", "number", nrows)
    ptCheckType("ncols", "number", ncols)

    if(imageURL.substring(0, 4) != "http") {
        userConsole.warn("Image url does not start with http:// - prepending string to url")
        imageURL = imageURL + "http://"
    }

    if (color !== undefined) {
        ptCheckType("color", "boolean", color)
    } else {
        color = false
    }

    // make the HTTP request
    const formData = new FormData()

    formData.append("image_url", imageURL)
    formData.append("width", "" + nrows)
    formData.append("heigth", "" + ncols)
    formData.append("color", "" + (color ? true : false))

    const request = new XMLHttpRequest()
    // TODO: synchronous requests are deprecated, come up with a better way
    // to do this
    request.open(
        "POST", URL_DOMAIN+"/services/files/stringifyimage", false
    )

    let response: any = []
    request.onload = function () {
        if (request.readyState === 4) {
            if (request.status === 200) {
                response = JSON.parse(request.responseText)

                esconsole("Image data received: " + response,"PT")
            }
        }
    }
    request.onerror =  function(){
        throw new InternalError("We could not load the image.")
    }

    // make the request
    request.send(formData)

    return response
}

export function importFile(result: DAWData, fileURL: string) {
    esconsole("Calling pt_importFile from passthrough with parameters "
                + fileURL,
                "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("importFile", args, 1, 1)
    ptCheckType("fileURL", "string", fileURL)

    if(fileURL.substring(0, 4) != "http") {
        userConsole.warn("File url does not start with http:// - prepending string to url")
        fileURL = "http://" + fileURL
    }

    // make the HTTP request
    const formData = new FormData()

    formData.append("file_url", fileURL)

    const request = new XMLHttpRequest()
    // TODO: synchronous requests are deprecated, come up with a better way
    // to do this
    request.open(
        "POST", URL_DOMAIN+"/services/files/stringifyfile", false
    )

    let response = ""
    request.onload = function () {
        if (request.readyState === 4) {
            if (request.status === 200) {
                response = request.responseText
                esconsole("File data received: " + response,"PT")
            } else {
                throw new InternalError(
                    "We could not load the file. There was a bad server"
                    + " response."
                )
            }
        }
    }
    request.onerror =  function(){
        throw new InternalError("We could not load the file.")
    }

    // make the request
    request.send(formData)

    return response
}

// Provides a way to print to the EarSketch console.
export function println(result: DAWData, msg: string) {
    esconsole(
        "Calling pt_println from passthrough with parameter "
        + msg,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("println", args, 1, 1)

    if (!compiler.testRun) {
        userConsole.log(msg)
    }
}

// Prompt for user input.
export function readInput(result: DAWData, msg: string) {
    esconsole("Calling pt_readInput from passthrough with parameter " + msg, "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("readInput", args, 0, 1)
    if (typeof msg !== "undefined") {
        ptCheckType("readInput", "string", msg)
    } else {
        msg = ""
    }

    return (window as any).esPrompt(msg)

    /*
    const start = new Date().getTime()
    const res = window.prompt(msg)
    const end = new Date().getTime()

    if (end - start < 50) {
        // This interferes with the autograder. Commenting out until a better
        // solution is found.
        //userNotification.show(ESMessages.general.nopopup_general, "failure1")
        //throw new Error(ESMessages.general.nopopup_readinput)
    }

    return res
    */
}

// Replace a list element.
export function replaceListElement(result: DAWData, inputList: any[], elementToReplace: any, withElement: any) {
    esconsole(
        "Calling pt_replaceListElement from passthrough with parameters "
        + inputList + " , "
        + elementToReplace + " , "
        + withElement,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("replaceListElement", args, 3, 3)
    ptCheckType("inputList", "array", inputList)

    inputList = inputList.slice();  // create a copy
    for (let i = 0; i < inputList.length; i++) {
        if (inputList[i] == elementToReplace) {
            inputList[i] = withElement
        }
    }

    return inputList
}

// Replace a character in a string.
export function replaceString(result: DAWData, patternString: string, characterToReplace: string, withElement: string) {
    esconsole(
        "Calling pt_replaceString from passthrough with parameters "
        + patternString + " , "
        + characterToReplace + " , "
        + withElement,
        "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("replaceString", args, 3, 3)
    ptCheckType("patternString", "string", patternString)
    ptCheckType("characterToReplace", "string", characterToReplace)
    ptCheckType("withElement", "string", withElement)

    const patternList = patternString.split("")
    let newstring
    for (let i = 0; i < patternString.length; i++) {
        if (patternList[i] == characterToReplace) {
            patternList[i] = withElement
        }
    }
    newstring = patternList.join("")
    return newstring
}

// Reverse a list.
export function reverseList(result: DAWData, inputList: any[]) {
    esconsole("Calling pt_reverseList from passthrough with parameters " + inputList, "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("reverseList", args, 1, 1)
    ptCheckType("inputList", "array", inputList)

    inputList = inputList.slice(); // create a copy
    return inputList.reverse()
}

// Reverse a string.
export function reverseString(result: DAWData, inputString: string) {
    esconsole("Calling pt_reverseString from passthrough with parameters " + inputString, "PT")

    checkInit(result)

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
    esconsole("Calling pt_rhythmEffects from passthrough with parameters "
        + [track, effectType, effectParameter, effectList, measure, beatString].join(", "), "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("rhythmEffects", args, 6, 6)
    ptCheckType("track", "number", track)
    ptCheckInt("track", track)
    ptCheckType("effectType", "string", effectType)
    ptCheckType("effectParameter", "string", effectParameter)
    ptCheckType("effectList", "array", effectList)
    ptCheckType("measure", "number", measure)
    ptCheckType("beatString", "string", beatString)

    ptCheckRange("track", track, {min: 0})

    const SUSTAIN = "+"
    const RAMP = "-"
    const SIXTEENTH = 0.0625

    let prevValue = undefined
    let prevMeasure = measure

    for (let i = 0; i < beatString.length; i++) {
        const current = beatString[i]
        const next = beatString[i+1]
        const currentValue: number | undefined = prevValue
        const startMeasure = measure + (i * SIXTEENTH)

        if (!isNaN(parseInt(current))) {
            // parsing a number, set a new previous value

            prevValue = effectList[parseInt(current)]
        } else if (isNaN(parseInt(current)) && next !== current) {
            // not currently parsing a number and the next char is not
            // the same as the current char
            let endValue = currentValue as number

            if (current == RAMP && !isNaN(parseInt(next))) {
                // case: ramp to number
                endValue = effectList[parseInt(next)]
            } else if (current == SUSTAIN && !isNaN(parseInt(next))) {
                // case: sustain to number
                endValue = currentValue as number
            } else if (current == RAMP && next == SUSTAIN) {
                // case: ramp to sustain

                // move to next value
                while (beatString[++i] == SUSTAIN
                        && i++ < beatString.length) { }

                // found a  number
                if (!isNaN(parseInt(beatString[i-1]))) {
                    endValue = effectList[parseInt(beatString[i-1])]
                } else {
                    throw RangeError("Invalid beatString.")
                }

            } else if (current == SUSTAIN && next == RAMP) {
                // case: sustain to ramp
                endValue = currentValue as number
            }

            const endMeasure = measure + (1 + i) * SIXTEENTH

            const effect = {
                track: track,
                name: effectType,
                parameter: effectParameter,
                startValue: currentValue,
                endValue: endValue,
                startMeasure: prevMeasure,
                endMeasure: endMeasure
            } as unknown as EffectRange

            addEffect(result, effect)

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
    esconsole("Calling pt_setEffect from passthrough with parameters "
        + [trackNumber, effect, parameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation].join(", "), "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("setEffect", args, 2, 7)
    ptCheckType("trackNumber", "number", trackNumber)
    ptCheckInt("trackNumber", trackNumber)
    ptCheckType("effect", "string", effect)

    ptCheckRange("trackNumber", trackNumber, {min: 0})

    if (parameter !== undefined) {
        ptCheckType("parameter", "string", parameter)
    } else {
        parameter = applyEffects.EFFECT_MAP[effect].DEFAULT_PARAM
    }

    if (effectStartValue !== undefined) {
        ptCheckType("effectStartValue", "number", effectStartValue)
    } else {
        effectStartValue = applyEffects.EFFECT_MAP[effect].DEFAULTS[parameter].value
    }

    if (effectStartLocation !== undefined) {
        ptCheckType("effectStartLocation", "number", effectStartLocation)
        ptCheckRange("effectStartLocation", effectStartLocation, {min: 1})
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
        ptCheckRange("effectEndLocation", effectEndLocation, {min: 1})
    } else {
        effectEndLocation = 0
    }

    const _effect = {
        track: trackNumber,
        name: effect,
        parameter: parameter,
        startValue: effectStartValue,
        endValue: effectEndValue,
        startMeasure: effectStartLocation,
        endMeasure: effectEndLocation
    } as unknown as EffectRange

    addEffect(result, _effect)

    return result
}

// Slice a part of a soundfile to create a new sound file variable
export function createAudioSlice(result: DAWData, oldSoundFile: string, startLocation: number, endLocation: number) {

    //TODO AVN: parameter validation - how to determine slice start/end is in correct range?

    const args = [...arguments].slice(1); // remove first argument
    ptCheckArgs("createAudioSlice", args, 3, 3)
    ptCheckType("filekey", "string", oldSoundFile)
    ptCheckFilekeyType(oldSoundFile)
    ptCheckType("startLocation", "number", startLocation)
    ptCheckType("endLocation", "number", endLocation)
    ptCheckAudioSliceRange(result, oldSoundFile, startLocation, endLocation)
    if(oldSoundFile in result.slicedClips){
        throw new ValueError("Creating slices from slices is not currently supported")
    }

    const sliceKey = oldSoundFile + "-" + startLocation + "-" + endLocation
    const sliceDef = {sourceFile: oldSoundFile, start: startLocation, end: endLocation}

    result.slicedClips[sliceKey] = sliceDef

    return {"result": result, "returnVal": sliceKey}
}

// Select a random file.
export function selectRandomFile(result: DAWData, folder: string, extension: undefined | string=undefined) {

    esconsole(`Calling pt_selectRandomFile from passthrough with parameters ${folder}, ${extension}`, "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("selectRandomFile", args, 1, 2)
    ptCheckType("folder", "string", folder)

    if (extension !== undefined) {
        ptCheckType("extension", "string", extension)
    } else {
        extension = ".wav"
    }

    let url = URL_DOMAIN + "/services/audio/getrandomaudiokey?tag=" + folder
    const userProject = ServiceWrapper().userProject

    if (userProject.isLogged()) {
        url += "&username=" + userProject.getUsername()
    }

    const request = new XMLHttpRequest()
    request.open("GET", url, false)
    request.send(null)

    if (request.status === 200) {
        const jsobj = JSON.parse(request.responseText)
        if (jsobj.hasOwnProperty("file_key")) {
            return jsobj.file_key
        } else {
            throw new ValueError("Please use folder names available in your sound browser.")
        }
    } else {
        throw new InternalError(
            "Internal server error. "
            + "Could not respond to the following tag: " + folder)
    }
}

// Shuffle a list.
export function shuffleList(result: DAWData, array: any[]) {
    esconsole(`Calling pt_shuffleList from passthrough with parameters ${array}`, "PT")

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("shuffleList", args, 1, 1)
    ptCheckType("inputList", "array", array)

    // Fisher-Yates
    const a = array,
        n = a.length

    for(let i = n - 1; i > 0; i--) {
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

    checkInit(result)

    const args = [...arguments].slice(1)
    ptCheckArgs("shuffleString", args, 1, 1)
    ptCheckType("inputString", "string", inputString)

    // Fisher-Yates
    const a = inputString.split(""),
        n = a.length

    for(let i = n - 1; i > 0; i--) {
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
        if (typeof(arg) !== exptype) {
            // TODO: Old code and comment; this seems like a bug,
            // as this should throw here (if arg is not 0, 1, or a boolean) rather than returning.
            // "for some reason Skulpt maps booleans to 1 or 0"
            return arg === 1 || arg === 0
        }
    } else {
        if (typeof(arg) !== exptype) {
            throw new TypeError(name + " must be a " + exptype)
        }
    }
}

// call this after the regular type check
const ptCheckInt = (name: string, arg: number) => {
    if (arg.toString().indexOf(".") > -1) {
        throw new TypeError(name + " must be an integer")
    }
}

const ptCheckFilekeyType = (filekey: string) => {
    if ((filekey[0] === "'" && filekey[filekey.length-1] === "'") ||
        (filekey[0] === "'" && filekey[filekey.length-1] === "'")) {
        throw new TypeError("Media constant (" + filekey + ") should not include quotation marks")
    }
}

const ptCheckRange = (name: string, arg: number, min: number | {min?: number, max?: number}, max: number | undefined=undefined) => {
    if (typeof(min) === "number" && typeof(max) === "number") {
        if (arg < min || arg > max) {
            throw new TypeError(name + " exceeds the allowed range of " + min + " to " + max)
        }
    } else if (typeof(min) === "object") {
        // TODO: change the bad arg names...
        if (min.hasOwnProperty("min") && min.hasOwnProperty("max")) {
            if (arg < min.min! || arg > min.max!) {
                throw new TypeError(name + " exceeds the allowed range of " + min.min + " to " + min.max)
            }
        } else {
            if (min.hasOwnProperty("min")) {
                if (arg < min.min!) {
                    throw new TypeError(name + " cannot be smaller than " + min.min)
                }
            }

            if (min.hasOwnProperty("max")) {
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
    // Instead the error gets caught in compiler's `sliceAudioBufferByMeasure`.
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
    const effectObject = applyEffects.EFFECT_MAP[effectname].DEFAULTS[parameter]

    if (effectStartValue !== undefined) {
        if (effectEndValue === undefined) {
            if ((effectObject.min <= effectStartValue) && (effectObject.max >= effectStartValue)) {
                res = true
            } else {
                res = false
            }
        } else if (effectEndValue !== undefined) {
            if (((effectObject.min <= effectStartValue) && (effectObject.max >= effectStartValue)) &&  ((effectObject.min <= effectEndValue) && (effectObject.max >= effectEndValue))) {
                res = true
            } else {
                res = false
            }
        }
    }

    if ((effectStartLocation !== undefined) && ((effectEndLocation !== undefined) && (effectEndLocation != 0))) {
        if (effectEndLocation < effectStartLocation) {
            throw new RangeError("Cannot have effect start measure greater than end measure")

        }
    }

    if (res !== true) {
        const error = new RangeError(parameter + " is out of range")
        throw error
    }
}

function checkInit(result: DAWData) {
  if (typeof result !== "object" || result.init !== true) {
    throw new Error("init() is missing")
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
export const addClip = (result: DAWData, clip: Clip, silence: number | undefined=undefined) => {
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
            effects: {}
        } as unknown as Track)
    }

    result.tracks[clip.track].clips.push(clip)
}

// Helper function to add effects to the result.
export const addEffect = (result: DAWData, effect: EffectRange) => {
    esconsole(effect, "debug")

    // bounds checking
    if (effect.track < 0) {
        throw new RangeError("Cannot add effects before the first track")
    }

    if (applyEffects.EFFECT_MAP[effect.name] === undefined) {
        throw new RangeError("Effect name does not exist")
    }
    if (applyEffects.EFFECT_MAP[effect.name].DEFAULTS[effect.parameter] === undefined) {
        throw new RangeError("Effect parameter does not exist")
    }

    ptCheckEffectRange(
        effect.name, effect.parameter, effect.startValue,
        effect.startMeasure, effect.endValue, effect.endMeasure
    )

    // create the track if it does not exist
    while (effect.track >= result.tracks.length) {
        result.tracks.push({
            clips: [],
            effects: {}
        } as unknown as Track)
    }

    const key = effect.name + "-" + effect.parameter

    // create the effect list if it does not exist
    if (result.tracks[effect.track].effects[key] == undefined) {
        result.tracks[effect.track].effects[key] = []
    }

    result.tracks[effect.track].effects[key].push(effect)
}