// earsketch-dsp.js is a fast digital signal processing library for javascript transpiled from C by emscripten
// earsketch-appdsp.ts is a light wrapper over it.
// Created by Juan Martinez Nieto <jcm7@gatech.edu> on 2015-09-01.
// Converted into a TypeScript module and cleaned up by Ian Clester <ijc@gatech.edu> on 2021-06-09.

const WINDOW_SIZE = 1024
export const HOP_SIZE = 256

const MAX_BUFFERSIZE = 8388608
const MAX_OUTSAMPLES = MAX_BUFFERSIZE * 2
const MAX_FRAMES =  MAX_BUFFERSIZE / HOP_SIZE

declare const Module: any

const initDSP = Module.cwrap("initDSP", "number")
const fillHann = Module.cwrap("fillHann", "number", ["number", "number"])
const windowSignal = Module.cwrap("windowSignal", "number", ["number", "number", "number"])
const windowSignalQ = Module.cwrap("windowSignalQ", "number", ["number", "number", "number", "number"])
const rfft = Module.cwrap("rfft", "number", ["number", "number", "number"])
const convert = Module.cwrap("convert", "number", ["number", "number", "number", "number", "number"])
const unconvert = Module.cwrap("unconvert", "number", ["number", "number", "number", "number", "number"])
const overlapadd = Module.cwrap("overlapadd", "number", ["number", "number", "number", "number"])
// Unused: const interpolateFit = Module.cwrap("interpolateFit", "number", ["number", "number", "number", "number", "number"])
const interpolateFitVar = Module.cwrap("interpolateFitVar", "number", ["number", "number", "number", "number", "number", "number", "number"])

function allocateBuffer(type: typeof Int32Array | typeof Float32Array, length: number) {
    const numBytes = length * type.BYTES_PER_ELEMENT
    const ptr = Module._malloc(numBytes)
    return new type(Module.HEAPF32.buffer, ptr, length)
}

// Heap variables
// Foreboding old comment: "TODO: REVIEW EMSCRIPTEN HEAP FOR OVERLAP AND INTERPOLATION  EXTENDS TOTAL MEMORY 
//   IN THE HEAP OR USE STANDARD FLOAT ARRAY AND USE THE COPY FUNCTION"
const hannWindow = allocateBuffer(Float32Array, WINDOW_SIZE)
const windowed = allocateBuffer(Float32Array, WINDOW_SIZE)
const lastPhase = allocateBuffer(Float32Array, WINDOW_SIZE/2 + 1)
const magFreqPairs = allocateBuffer(Float32Array, WINDOW_SIZE + 2)
const accumPhase = allocateBuffer(Float32Array, WINDOW_SIZE/2 + 1)
const overlapped = allocateBuffer(Float32Array, MAX_OUTSAMPLES)
const interpolated = allocateBuffer(Float32Array, MAX_BUFFERSIZE)
const hopOut = allocateBuffer(Int32Array, MAX_FRAMES)

fillHann(hannWindow.byteOffset, WINDOW_SIZE)

function setOutSample(envelope: Float32Array, frames: number) {
    let hopOut = 0
    let numSamples = 0
    for (let f = 0; f < frames; f++) {        
        const step = envelope[f]
        const alpha = Math.pow(2, step/12)
        hopOut = Math.round(alpha * HOP_SIZE)
        numSamples += hopOut
    }
    numSamples += WINDOW_SIZE - hopOut
    return numSamples
}

function setVariableShift(envelope: Float32Array, frames: number) {
    for (let f = 0; f < frames; f++) {
        const step = envelope[f]
        const alpha = Math.pow(2, step/12)
        hopOut[f] = Math.round(alpha * HOP_SIZE)
    }
}

export function computeNumberOfFrames(totalsamples: number) {
    return 1 + Math.floor((totalsamples - WINDOW_SIZE) / HOP_SIZE)
}

export function computePitchShift(data: Float32Array, envelope: Float32Array, context: AudioContext) { 
    if (data.length > MAX_BUFFERSIZE) {
        throw "Max pitch shift size exceeded"
    }

    const numSamples = data.length 
    const numFrames = 1 + Math.floor((numSamples - WINDOW_SIZE) / HOP_SIZE)

    // Compute Frame Envelope
    const numOutSamples = setOutSample(envelope, numFrames)
    if (numOutSamples > MAX_OUTSAMPLES) {
        throw "Max interpolation size exceeded"
    }

    initDSP()
    setVariableShift(envelope, numFrames)
    overlapped.fill(0)

    let offset = 0
    for (let f = 0; f < numFrames; f++) {
        // Note that subarray creates a view of the data, not a copy.
        const index = f * HOP_SIZE
        windowed.set(data.subarray(index, index + WINDOW_SIZE))
        // Apply Hann window
        windowSignal(hannWindow.byteOffset, windowed.byteOffset, WINDOW_SIZE)
        // Forward real FFT
        rfft(windowed.byteOffset, WINDOW_SIZE/2, 1)
        // Computing instantaneous frequency
        convert(windowed.byteOffset, magFreqPairs.byteOffset, WINDOW_SIZE/2, HOP_SIZE, lastPhase.byteOffset)
        // Compute complex FFT from instantaneous frequency
        unconvert(magFreqPairs.byteOffset, windowed.byteOffset, WINDOW_SIZE/2, hopOut[f], accumPhase.byteOffset)
        // Inverse FFT
        rfft(windowed.byteOffset, WINDOW_SIZE/2, 0)
        // Weigthed Hann window
        const factor = 1/Math.sqrt(WINDOW_SIZE/hopOut[f]/2)
        windowSignalQ(hannWindow.byteOffset, windowed.byteOffset, WINDOW_SIZE, factor)
        overlapadd(windowed.byteOffset, overlapped.byteOffset, offset, WINDOW_SIZE)
        offset += hopOut[f]
    }
    interpolateFitVar(overlapped.byteOffset, interpolated.byteOffset, hopOut.byteOffset, numOutSamples, numSamples, numFrames, HOP_SIZE)

    const audiobuffer = context.createBuffer(1, numSamples, context.sampleRate)
    audiobuffer.getChannelData(0).set(interpolated.subarray(0, numSamples))
    return audiobuffer
}
