// earsketch-dsp.js is a fast digital signal processing library for javascript transpiled from C by emscripten
// earsketch-appdsp.ts is a light wrapper over it.
// Created by Juan Martinez Nieto <jcm7@gatech.edu> on 2015-09-01.
// Converted into a TypeScript module and cleaned up by Ian Clester <ijc@gatech.edu> on 2021-06-09.
import * as Module from "./earsketch-dsp"

const WINDOW_SIZE = 1024
export const HOP_SIZE = 256

const MAX_BUFFERSIZE = 8388608
const MAX_OUTSAMPLES = MAX_BUFFERSIZE * 2
const MAX_FRAMES = MAX_BUFFERSIZE / HOP_SIZE

let initDSP: any
let fillHann: any
let windowSignal: any
let windowSignalQ: any
let rfft: any
let convert: any
let unconvert: any
let overlapadd: any
let interpolateFitVar: any

(Module as any).onRuntimeInitialized = () => {
    initDSP = Module.cwrap("initDSP", "number")
    fillHann = Module.cwrap("fillHann", "number", ["number", "number"])
    windowSignal = Module.cwrap("windowSignal", "number", ["number", "number", "number"])
    windowSignalQ = Module.cwrap("windowSignalQ", "number", ["number", "number", "number", "number"])
    rfft = Module.cwrap("rfft", "number", ["number", "number", "number"])
    convert = Module.cwrap("convert", "number", ["number", "number", "number", "number", "number"])
    unconvert = Module.cwrap("unconvert", "number", ["number", "number", "number", "number", "number"])
    overlapadd = Module.cwrap("overlapadd", "number", ["number", "number", "number", "number"])
    interpolateFitVar = Module.cwrap("interpolateFitVar", "number", ["number", "number", "number", "number", "number", "number", "number"])
}

function allocateBuffer(Type: typeof Int32Array | typeof Float32Array, length: number) {
    const numBytes = length * Type.BYTES_PER_ELEMENT
    const ptr = Module._malloc(numBytes)
    return new Type(Module.HEAPF32.buffer, ptr, length)
}

function setOutSample(envelope: Float32Array, frames: number) {
    let hopOut = 0
    let numSamples = 0
    for (let f = 0; f < frames; f++) {
        const step = envelope[f]
        const alpha = Math.pow(2, step / 12)
        hopOut = Math.round(alpha * HOP_SIZE)
        numSamples += hopOut
    }
    numSamples += WINDOW_SIZE - hopOut
    return numSamples
}

export function computeNumberOfFrames(totalsamples: number) {
    return 1 + Math.floor((totalsamples - WINDOW_SIZE) / HOP_SIZE)
}

export function computePitchShift(data: Float32Array, envelope: Float32Array, context: AudioContext) {
    if (data.length > MAX_BUFFERSIZE) {
        throw new Error("Max pitch shift size exceeded")
    }

    const numSamples = data.length
    const numFrames = 1 + Math.floor((numSamples - WINDOW_SIZE) / HOP_SIZE)

    // Compute Frame Envelope
    const numOutSamples = setOutSample(envelope, numFrames)
    if (numOutSamples > MAX_OUTSAMPLES) {
        throw new Error("Max interpolation size exceeded")
    }

    // Allocate buffers on the heap.
    // Foreboding old comment: "TODO: REVIEW EMSCRIPTEN HEAP FOR OVERLAP AND INTERPOLATION  EXTENDS TOTAL MEMORY
    //   IN THE HEAP OR USE STANDARD FLOAT ARRAY AND USE THE COPY FUNCTION"
    const hannWindow = allocateBuffer(Float32Array, WINDOW_SIZE)
    const windowed = allocateBuffer(Float32Array, WINDOW_SIZE)
    const lastPhase = allocateBuffer(Float32Array, WINDOW_SIZE / 2 + 1)
    const magFreqPairs = allocateBuffer(Float32Array, WINDOW_SIZE + 2)
    const accumPhase = allocateBuffer(Float32Array, WINDOW_SIZE / 2 + 1)
    const overlapped = allocateBuffer(Float32Array, MAX_OUTSAMPLES)
    const interpolated = allocateBuffer(Float32Array, MAX_BUFFERSIZE)
    const hopOut = allocateBuffer(Int32Array, MAX_FRAMES)
    fillHann(hannWindow.byteOffset, WINDOW_SIZE)

    initDSP()
    for (let f = 0; f < numFrames; f++) {
        const step = envelope[f]
        const alpha = Math.pow(2, step / 12)
        hopOut[f] = Math.round(alpha * HOP_SIZE)
    }
    overlapped.fill(0)

    let offset = 0
    for (let f = 0; f < numFrames; f++) {
        // Note that subarray creates a view of the data, not a copy.
        const index = f * HOP_SIZE
        windowed.set(data.subarray(index, index + WINDOW_SIZE))
        // Apply Hann window
        windowSignal(hannWindow.byteOffset, windowed.byteOffset, WINDOW_SIZE)
        // Forward real FFT
        rfft(windowed.byteOffset, WINDOW_SIZE / 2, 1)
        // Compute instantaneous frequency
        convert(windowed.byteOffset, magFreqPairs.byteOffset, WINDOW_SIZE / 2, HOP_SIZE, lastPhase.byteOffset)
        // Compute complex FFT from instantaneous frequency
        unconvert(magFreqPairs.byteOffset, windowed.byteOffset, WINDOW_SIZE / 2, hopOut[f], accumPhase.byteOffset)
        // Inverse FFT
        rfft(windowed.byteOffset, WINDOW_SIZE / 2, 0)
        // Weigthed Hann window
        const factor = 1 / Math.sqrt(WINDOW_SIZE / hopOut[f] / 2)
        windowSignalQ(hannWindow.byteOffset, windowed.byteOffset, WINDOW_SIZE, factor)
        overlapadd(windowed.byteOffset, overlapped.byteOffset, offset, WINDOW_SIZE)
        offset += hopOut[f]
    }
    interpolateFitVar(overlapped.byteOffset, interpolated.byteOffset, hopOut.byteOffset, numOutSamples, numSamples, numFrames, HOP_SIZE)

    const audiobuffer = context.createBuffer(1, numSamples, context.sampleRate)
    audiobuffer.getChannelData(0).set(interpolated.subarray(0, numSamples))

    Module._free(hannWindow.byteOffset)
    Module._free(windowed.byteOffset)
    Module._free(lastPhase.byteOffset)
    Module._free(magFreqPairs.byteOffset)
    Module._free(accumPhase.byteOffset)
    Module._free(overlapped.byteOffset)
    Module._free(interpolated.byteOffset)
    Module._free(hopOut.byteOffset)

    return audiobuffer
}
