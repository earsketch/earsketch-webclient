// We need to keep track of the calls to the analysis APIs as we need to schedule them to be called after finish()
// The reason being, the audio buffers would not have been loaded before that and the analysis would fail.
import { DSP, FFT, WindowFunction } from "dsp"

export const FEATURE_FUNCTIONS: { [key: string]: (data: Float32Array, blockSize: number, sampleRate: number) => number[] } = {
    RMS_AMPLITUDE: computeRMSAmplitude,
    SPECTRAL_CENTROID: computeSpectralCentroid,
}

export function computeFeatureForBuffer(buffer: AudioBuffer, feature: string, startTime?: number | undefined, endTime?: number | undefined) {
    const startIndex = startTime === undefined ? undefined : Math.round(buffer.sampleRate * startTime)
    const endIndex = endTime === undefined ? undefined : Math.round(buffer.sampleRate * endTime)
    const data = buffer.getChannelData(0).slice(startIndex, endIndex)

    const featureVector = FEATURE_FUNCTIONS[feature.toUpperCase()](data, 2048, buffer.sampleRate)
    // Return the median.
    featureVector.sort()
    return (featureVector[Math.floor(featureVector.length / 2)])
}

function computeRMSAmplitude(data: Float32Array, blockSize: number) {
    const out = []
    for (let hop = 0; (hop + blockSize) <= data.length; hop += blockSize) {
        const block = data.slice(hop, hop + blockSize)
        let sumOfSquares = 0
        for (const x of block) {
            sumOfSquares += x * x
        }
        out.push(Math.sqrt(sumOfSquares / block.length))
    }
    return out
}

function computeSpectralCentroid(data: Float32Array, blockSize: number, sampleRate: number) {
    const out = []
    const fft = new FFT(blockSize, sampleRate)
    const hann = new WindowFunction(DSP.HANN)
    for (let hop = 0; (hop + blockSize) <= data.length; hop += blockSize) {
        fft.forward(hann.process(data.slice(hop, hop + blockSize)))
        let amplitudeSum = 0
        let weightedBinSum = 0
        for (let index = 0; index < fft.spectrum.length; index++) {
            weightedBinSum += (index + 1) * fft.spectrum[index]
            amplitudeSum += fft.spectrum[index]
        }
        // Old comment: "normalize it by fs/2 as that is the maximum frequency that can exist in the spectrum."
        // If this is done, it is done implicitly, due to the weighted bin sum using indices rather than actual frequencies.
        out.push(amplitudeSum ? (weightedBinSum / amplitudeSum / (blockSize / 2)) : 0)
    }
    return out
}
