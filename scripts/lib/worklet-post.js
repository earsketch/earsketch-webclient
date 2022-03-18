console.log("Hello", Module)

const WINDOW_SIZE = 1024
const HOP_SIZE = 256

const MAX_BUFFERSIZE = 8388608
const MAX_OUTSAMPLES = MAX_BUFFERSIZE * 2
const MAX_FRAMES = MAX_BUFFERSIZE / HOP_SIZE

const initDSP = Module.cwrap("initDSP", "number")
const fillHann = Module.cwrap("fillHann", "number", ["number", "number"])
const windowSignal = Module.cwrap("windowSignal", "number", ["number", "number", "number"])
const windowSignalQ = Module.cwrap("windowSignalQ", "number", ["number", "number", "number", "number"])
const rfft = Module.cwrap("rfft", "number", ["number", "number", "number"])
const convert = Module.cwrap("convert", "number", ["number", "number", "number", "number", "number"])
const unconvert = Module.cwrap("unconvert", "number", ["number", "number", "number", "number", "number"])
const overlapadd = Module.cwrap("overlapadd", "number", ["number", "number", "number", "number"])
const interpolateFitVar = Module.cwrap("interpolateFitVar", "number", ["number", "number", "number", "number", "number", "number", "number"])

function allocateBuffer(Type, length) {
    const numBytes = length * Type.BYTES_PER_ELEMENT
    const ptr = Module._malloc(numBytes)
    return new Type(Module.HEAPF32.buffer, ptr, length)
}

function setOutSample(envelope, frames) {
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

export function computeNumberOfFrames(totalsamples) {
    return 1 + Math.floor((totalsamples - WINDOW_SIZE) / HOP_SIZE)
}

export function computePitchShift(data, envelope, context) {
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

const WINDOW_SIZE = 0.1

// Unfortunately, % in JS can return negative values.
function mod(a, b) {
    const r = a % b
    return r < 0 ? r + b : r
}

function lerp(buffer, i) {
    const fracIndex = mod(i, buffer.length)
    const prevIndex = Math.floor(fracIndex)
    const nextIndex = (prevIndex + 1) % buffer.length
    const frac = fracIndex - prevIndex
    return buffer[prevIndex] * (1 - frac) + buffer[nextIndex] * frac
}

class Pitchshifter extends AudioWorkletProcessor {
    // Static getter to define AudioParam objects in this custom processor.
    static get parameterDescriptors() {
        return [{
            name: "shift",
            defaultValue: 0,
        }]
    }

    constructor() {
        super()
        this.delayLine = new Float32Array(Math.floor(WINDOW_SIZE * sampleRate))
        this.index = 0
        this.delay = 0
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0]
        if (input === undefined) {
            // This case happens in Firefox, but not Chromium.
            return true
        }
        const output = outputs[0][0]
        const shift = parameters.shift

        const delayLine = this.delayLine
        let index = this.index
        let delay = this.delay

        for (let i = 0; i < input.length; ++i) {
            delayLine[index] = input[i]
            const env = Math.abs(delay / delayLine.length - 0.5) * 2
            const a = lerp(delayLine, index - delay)
            const b = lerp(delayLine, index - delay - delayLine.length / 2)
            output[i] = (1 - env) * a + env * b
            // Could have a separate version of this loop for the case where shift.length = 1,
            // but you know what they say about premature optimization...
            const rate = 1 - 2 ** (shift[i % shift.length] / 12)
            delay = mod(delay + rate, delayLine.length)
            index = (index + 1) % delayLine.length
        }

        this.delay = delay
        this.index = index
        return true
    }
}

registerProcessor("pitchshifter2", Pitchshifter)
