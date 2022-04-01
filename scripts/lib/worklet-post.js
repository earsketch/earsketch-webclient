const WINDOW_SIZE = 1024
const HOP_SIZE = 128

const setup = Module._setup()
const psBuffer = new Float32Array(Module.HEAP32.buffer, Module._buffer, HOP_SIZE)

function processBlock(input, output, factor) {
    psBuffer.set(input)
    _processBlock(factor)
    output.set(psBuffer)
}

// TODO: Is there one instance of `Module` per created worklet node,
// or is there just one instance of the AudioWorkletProcessor?
// (If the latter, then each Pitchshifter needs to get its own
//  input & overlap buffers to avoid interference with the others.)
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
        setup()
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0]
        if (input === undefined) {
            // This case happens in Firefox, but not Chromium.
            return true
        }
        const output = outputs[0][0]
        const shift = parameters.shift[0]
        const factor = 2 ** (shift / 12)
        processBlock(input, output, factor)
        return true
    }
}

registerProcessor("pitchshifter2", Pitchshifter)
