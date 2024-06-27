/* eslint-disable no-undef */
const HOP_SIZE = 128

Module._setup()

// Statically-allocated temporary buffer for marshalling data to/from WASM module.
const scratchBuffer = new Float32Array(Module.HEAP32.buffer, Module._buffer, HOP_SIZE)

class Pitchshifter {
    constructor() {
        this._shifter = Module._createShifter()
    }

    processBlock(input, output, factor) {
        scratchBuffer.set(input)
        Module._processBlock(this._shifter, Module._buffer, Module._buffer, factor)
        output.set(scratchBuffer)
    }

    destroy() {
        Module._destroyShifter(this._shifter)
    }
}

class PitchshiftProcessor extends AudioWorkletProcessor {
    // Static getter to define AudioParam objects in this custom processor.
    static get parameterDescriptors() {
        return [{
            name: "shift",
            defaultValue: 0,
        }]
    }

    constructor() {
        super()
        this.shifters = [new Pitchshifter()]
        this.port.onmessage = (e) => {
            if (e.data === "destroy") {
                this.shifters.map(s => s.destroy())
                this.shifters = null
            } else {
                throw new Error(`Unexpected message '${e.data}'`)
            }
        }
    }

    process(inputs, outputs, parameters) {
        if (!this.shifters) {
            return false
        }
        while (this.shifters.length > inputs[0].length) {
            this.shifters.pop()
        }
        while (this.shifters.length < inputs[0].length) {
            this.shifters.push(new Pitchshifter())
        }
        const shift = parameters.shift[0]
        const factor = 2 ** (shift / 12)
        for (let c = 0; c < inputs[0].length; c++) {
            const output = outputs[0][c]
            const input = inputs[0][c] ?? new Float32Array(output.length)
            this.shifters[c].processBlock(input, output, factor)
        }
        return true
    }
}

registerProcessor("pitchshifter", PitchshiftProcessor)
