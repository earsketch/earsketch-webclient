// Pitch shift tracks during compilation.
// Old comment: "TODO: This service is only necessary until audio workers become implemented in all major browsers."
// I assume this is referring to the fact that with AudioWorklets, this can be done is real-time rather than ahead-of-time.
// That raises the question: do we want to do this in real-time? Do we want the same algorithm?
// (For example, it looks like Tone.js has a simple PitchShift that can be implemented with just stock Web Audio nodes.)
import ctx from "./audiocontext"
import * as dsp from "../../lib/earsketch-appdsp"
import esconsole from "../esconsole"
import * as userConsole from "../ide/console"
import { Clip, EffectRange, Track } from "./player"
import { TempoMap } from "./tempo"

interface Point {
    sampletime: number
    semitone: number
    type: "start" | "add" | "end"
}

const QFRAMES = 16
let BUFFER_CACHE: { [key: string]: AudioBuffer } = Object.create(null)
const MAX_CACHE = 64 // increased from 16 since we now process by clips instead of tracks

// Interpolate a list of automation points into an audio-rate array of semitones to shift by at each sample.
const computeFrameEnvelope = (bendinfo: Point[], numFrames: number) => {
    let findex = 1
    const envelope = new Float32Array(numFrames)
    let deltaY, deltaX
    for (let f = 0; f < numFrames; f++) {
        if ((findex < bendinfo.length) && (f > bendinfo[findex].sampletime)) {
            findex++
        }

        if (findex === bendinfo.length) {
            envelope[f] = bendinfo[bendinfo.length - 1].semitone
        } else {
            deltaY = bendinfo[findex].semitone - bendinfo[findex - 1].semitone
            deltaX = bendinfo[findex].sampletime - bendinfo[findex - 1].sampletime
            envelope[f] = bendinfo[findex - 1].semitone + deltaY * (f - bendinfo[findex - 1].sampletime) / deltaX
        }
    }
    return envelope
}

const addEnvelopePoint = (points: Point[], effect: EffectRange, tempoMap: TempoMap) => {
    const startPoint = {
        sampletime: Math.round(tempoMap.measureToTime(effect.startMeasure) * 44100 / dsp.HOP_SIZE),
        semitone: effect.startValue,
        type: "start",
    } as Point

    if ((points.length > 0) && (startPoint.sampletime === points[points.length - 1].sampletime)) {
        points[points.length - 1].sampletime = points[points.length - 1].sampletime - QFRAMES
    }

    if ((points.length === 0) && (startPoint.sampletime > 0)) {
        if (startPoint.sampletime > 0) {
            points.push({
                sampletime: 0,
                semitone: 0,
                type: "add",
            })
        }

        if (startPoint.sampletime > QFRAMES) {
            points.push({
                sampletime: startPoint.sampletime - QFRAMES,
                semitone: 0,
                type: "add",
            })
        }
    }

    if ((points.length > 0) && (points[points.length - 1].sampletime < 0)) {
        points[points.length - 1].sampletime = startPoint.sampletime - QFRAMES
    }

    // Mysterious old comment: "if   ((jsarray.length > 0) && (jsarray[jsarray.length -1].type == 'end')"
    if ((points.length > 0) && ((startPoint.sampletime - QFRAMES) > points[points.length - 1].sampletime)) {
        points.push({
            sampletime: startPoint.sampletime - QFRAMES,
            semitone: points[points.length - 1].semitone,
            type: "add",
        })
    }

    points.push(startPoint)

    const endPoint = {
        sampletime: Math.round(tempoMap.measureToTime(effect.endMeasure) * 44100 / dsp.HOP_SIZE),
        semitone: effect.endValue,
        type: "end",
    } as Point

    if (endPoint.sampletime === 0) {
        endPoint.sampletime = -1
        endPoint.semitone = startPoint.semitone
    }
    if (endPoint.sampletime > 0) {
        points.push(endPoint)
    }
}

const getEnvelopeForTrack = (track: Track, tempoMap: TempoMap) => {
    const points: Point[] = []
    if (track.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"] !== undefined) {
        // Compute envelope information
        for (const effect of track.effects["PITCHSHIFT-PITCHSHIFT_SHIFT"]) {
            addEnvelopePoint(points, effect, tempoMap)
        }
    }
    return points
}

// Pitchshift an audio buffer according to the points in bendinfo.
const pitchshift = (buffer: AudioBuffer, bendinfo: Point[]) => {
    esconsole("PitchBend bendinfo from " + JSON.stringify(bendinfo), ["debug", "pitchshift"])
    const bypass = (bendinfo.length === 1) && (bendinfo[0].semitone === 0)
    if (bypass) {
        esconsole("Bypassing pitchshift", ["debug", "pitchshift"])
        // TODO: Is this copy necessary?
        const outBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
        outBuffer.copyToChannel(buffer.getChannelData(0), 0, 0)
        return outBuffer
    }
    const numFrames = dsp.computeNumberOfFrames(buffer.length)
    const frameEnvelope = computeFrameEnvelope(bendinfo, numFrames)
    const outBuffer = dsp.computePitchShift(buffer.getChannelData(0), frameEnvelope, ctx)
    esconsole("Pitchshift done with a buffer length of " + outBuffer.length, ["debug", "pitchshift"])
    return outBuffer
}

const getEnvelopeForClip = (clip: Clip, tempoMap: TempoMap, trackEnvelope: Point[]) => {
    const clipStartInSamps = Math.round(tempoMap.measureToTime(clip.measure) * 44100 / dsp.HOP_SIZE)
    const clipEndInSamps = Math.round(tempoMap.measureToTime(clip.measure + (clip.end - clip.start)) * 44100 / dsp.HOP_SIZE)
    const clipLenInSamps = clipEndInSamps - clipStartInSamps

    // clone the env-point-object array
    const env = trackEnvelope
        .map((point: Point) => Object.assign({}, point))
        .filter(point => point.type !== "add")

    // TODO: What is the point of this `if` and the `for` loop after?
    if (env[env.length - 2].sampletime === env[env.length - 1].sampletime) {
        env[env.length - 2].sampletime = env[env.length - 3].sampletime
        env[env.length - 2].semitone = env[env.length - 3].semitone
    }

    for (let i = 1; i < env.length; i++) {
        if (env[i].sampletime <= env[i - 1].sampletime) {
            env[i].sampletime = env[i - 1].sampletime + 1
        }
    }

    // Replace points outside the clip with `null`.
    const pointsOrNullWithinClip = env.map(point => (point.sampletime >= clipStartInSamps && point.sampletime <= clipEndInSamps) ? point : null)

    // Fix the start point for the clip by interpolating between the two points on either side of `clipStartInSamps`.
    let i = 0
    for (; i < pointsOrNullWithinClip.length; i++) {
        const point = pointsOrNullWithinClip[i]
        if (!point) continue
        if (point.sampletime !== clipStartInSamps) {
            if (i % 2 === 1) { // TODO: what is the point of this condition?
                pointsOrNullWithinClip[i - 1] = {
                    sampletime: clipStartInSamps,
                    semitone: env[i - 1].semitone + (env[i].semitone - env[i - 1].semitone) * (clipStartInSamps - env[i - 1].sampletime) / (env[i].sampletime - env[i - 1].sampletime),
                    type: "start",
                }
            }
        }
        break
    }

    // Fix the end point for the clip by interpolating the two points on either side of `clipEndinSamps`.
    for (; i < pointsOrNullWithinClip.length; i++) {
        const point = pointsOrNullWithinClip[i]
        if (point) continue
        if (i % 2 === 1) {
            pointsOrNullWithinClip[i] = { // TODO: what is the point of this condition?
                sampletime: clipEndInSamps,
                semitone: env[i - 1].semitone + (env[i].semitone - env[i - 1].semitone) * (clipEndInSamps - env[i - 1].sampletime) / (env[i].sampletime - env[i - 1].sampletime),
                type: "end",
            }
        }
        break
    }

    // Remove null values.
    const clipPoints = pointsOrNullWithinClip.filter(point => point !== null) as Point[]

    for (const point of clipPoints) {
        point.sampletime -= clipStartInSamps
    }

    if (clipPoints.length > 0 && clipPoints[0].sampletime > 0) {
        clipPoints.unshift({
            sampletime: 0,
            semitone: clipPoints[0].semitone,
            type: "start",
        })
        clipPoints.unshift({
            sampletime: clipPoints[0].sampletime - 1,
            semitone: clipPoints[0].semitone,
            type: "end",
        })
    }

    if (clipPoints.length > 0 && clipPoints[clipPoints.length - 1].sampletime < clipLenInSamps) {
        clipPoints.push({
            sampletime: clipPoints[clipPoints.length - 1].sampletime + 1,
            semitone: clipPoints[clipPoints.length - 1].semitone,
            type: "start",
        })
        clipPoints.push({
            sampletime: clipLenInSamps,
            semitone: clipPoints[clipPoints.length - 1].semitone,
            type: "end",
        })
    }

    if (!clipPoints.length) {
        let startSemitone: number, endSemitone: number

        for (let i = 0; i < env.length; i += 2) {
            if (i === 0 && clipEndInSamps < env[i].sampletime) {
                startSemitone = endSemitone = env[i].semitone
            } else if (clipStartInSamps > env[i].sampletime && clipEndInSamps < env[i + 1].sampletime) {
                // linear interpolation
                startSemitone = (env[i + 1].semitone - env[i].semitone) * (clipStartInSamps - env[i].sampletime) / (env[i + 1].sampletime - env[i].sampletime) + env[i].semitone
                endSemitone = (env[i + 1].semitone - env[i].semitone) * (clipEndInSamps - env[i].sampletime) / (env[i + 1].sampletime - env[i].sampletime) + env[i].semitone
            } else if (i === env.length - 2 && clipStartInSamps > env[i + 1].sampletime) {
                startSemitone = endSemitone = env[i + 1].semitone
            }
        }
        clipPoints.push({
            sampletime: 0,
            semitone: startSemitone!,
            type: "start",
        })
        clipPoints.push({
            sampletime: clipLenInSamps,
            semitone: endSemitone!,
            type: "end",
        })
    }

    if (clipPoints[clipPoints.length - 1].sampletime === clipPoints[clipPoints.length - 2].sampletime) {
        clipPoints.length -= 2
    }

    return clipPoints
}

export function pitchshiftClips(track: Track, tempoMap: TempoMap, songLengthInMeasures: number) {
    if (track.clips.length === 0) {
        throw new RangeError("Cannot pitchshift an empty track")
    }

    // TODO: This looks broken with high-density automation
    const trackEnvelope = getEnvelopeForTrack(track, tempoMap)

    // Kludge fix to repair trackEnvelope when there is one 1 point, a "start"
    // Further down in getEnvelopeForClip there will be trouble if trackEnvelope
    // doesn't have at least 2 points (length==2).
    //
    // See the root cause in runner.ts:fixEffects(), where result.length is
    // incorrectly set to 0 instead of the song length.
    if (trackEnvelope.length === 1 && trackEnvelope[0].type === "start") {
        trackEnvelope.push({
            sampletime: songLengthInMeasures,
            semitone: trackEnvelope[0].semitone,
            type: "end",
        })
    }

    if (Object.keys(BUFFER_CACHE).length > MAX_CACHE) {
        BUFFER_CACHE = Object.create(null)
    }

    for (const clip of track.clips) {
        let shiftedBuffer
        const bendinfo = getEnvelopeForClip(clip, tempoMap, trackEnvelope)
        const hashKey = JSON.stringify({
            clip: [clip.filekey, clip.start, clip.end],
            bendinfo,
        })

        if (hashKey in BUFFER_CACHE) {
            esconsole("Using Cache ", ["debug", "pitchshift"])
            shiftedBuffer = BUFFER_CACHE[hashKey]
        } else {
            esconsole("Computing Shift ", ["debug", "pitchshift"])
            try {
                shiftedBuffer = pitchshift(clip.audio, bendinfo)
            } catch (err) {
                esconsole("PitchShift Buffer not processed ", ["debug", "pitchshift"])
                esconsole(err, ["ERROR", "PITCHSHIFT"])
                userConsole.error("Error processing " + clip.filekey)
                throw err
            }
            BUFFER_CACHE[hashKey] = shiftedBuffer
        }

        clip.audio = shiftedBuffer
    }

    return track
}
