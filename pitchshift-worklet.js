const WINDOW_SIZE = 0.1

// Unfortunately, `%` in JS can return negative values.
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

registerProcessor("pitchshifter", Pitchshifter)
