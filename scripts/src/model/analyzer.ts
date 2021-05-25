// We need to keep track of the calls to the analysis APIs as we need to schedule them to be called after finish()
// The reason being, the audio buffers would not have been loaded before that and the analysis would fail.
import * as ESUtils from '../esutils'

function computeFeatureForBuffer(
    buffer: AudioBuffer, funcPointerToFeature: string, tempo: number,
    startTime: number | undefined=undefined, endTime: number | undefined=undefined
) {
    var data;
    var temp = [];
    var spectrum;
    var featureValue;
    var featureVector = [];
    data = buffer.getChannelData(0);
    var startTimeInSamples = 0;
    var endTimeInSamples = data.length;
    var blockSize = 2048;
    // If we are analyzing one part of the clip. If end time is not specified, we analyze till the end
    if (startTime != undefined) {
        startTimeInSamples = Math.round(buffer.sampleRate * ESUtils.measureToTime(startTime, tempo));
        if (endTime != undefined) {
            endTimeInSamples = Math.round(buffer.sampleRate * ESUtils.measureToTime(endTime, tempo));
        }
    }

    // extract data according to start and end time
    for (var k = 0; k < endTimeInSamples - startTimeInSamples; k++) {
        temp[k] = data[k + startTimeInSamples];
    }

    // Simple playback with analyser node
    var fft = new FFT(blockSize, buffer.sampleRate);
    var hann = new WindowFunction(DSP.HANN);

    var hop = 0;
    while ((hop + blockSize) < temp.length) {
        // First get the magnitude spectrum for each block
        fft.forward(hann.process(temp.slice(hop, hop + blockSize)));
        spectrum = fft.spectrum;
        featureValue = FEATURE_FUNCTIONS[funcPointerToFeature](temp.slice(hop, hop + blockSize), spectrum, buffer.sampleRate, blockSize);
        featureVector.push(featureValue);
        hop += blockSize;
    }
    featureVector.sort();
    // We take the median as the appropriate value
    return (featureVector[Math.floor(featureVector.length / 2)]);
};

// This routine computes the feature for 1 Block only!
function compute_spectral_centroid(time_domain_signal: never, spectrum: Float32Array, fs: never, blockSize: number) {
    var amplitude_sum = 0;
    var weighted_bin_sum = 0;
    var centroid;
    for (var index = 0; index < spectrum.length; index++) {
        weighted_bin_sum += (index + 1) * spectrum[index];
        amplitude_sum += spectrum[index];
    }

    if (amplitude_sum != 0) {
        centroid = weighted_bin_sum / amplitude_sum;
    } else {
        centroid = 0;
    }
    // normalize it by fs/2 as that is the maximum frequency that can exist in the spectrum.
    // The result is fitted to scale between 0 and 1.

    centroid = centroid / (blockSize / 2);
    return centroid;
};

// This routine computes the feature for 1 Block only!
function compute_rms_amplitude(time_domain_signal: Float32Array, spectrum: never, fs: never, blockSize: never) {
    var amplitudeSquare = 0;
    var squareSum = 0;
    var rms;
    for (var index = 0; index < time_domain_signal.length; index++) {
        amplitudeSquare = time_domain_signal[index] * time_domain_signal[index];
        squareSum += amplitudeSquare
    }

    if (time_domain_signal.length != 0) {
        rms = Math.sqrt(squareSum / time_domain_signal.length);
    } else {
        rms = 0;
    }

    // The result is fitted to scale between 0 and 1.
    return rms;
};

const FEATURE_FUNCTIONS: { [key: string]: any } = {
    rms_amplitude: compute_rms_amplitude,
    spectral_centroid: compute_spectral_centroid,
}

export function ESAnalyze(buffer: AudioBuffer, featureForAnalysis: string, tempo: number) {
    var featureValue;
    featureValue = computeFeatureForBuffer(buffer, featureForAnalysis.toLowerCase(), tempo);
    return featureValue;
};

export function ESAnalyzeForTime(buffer: AudioBuffer, featureForAnalysis: string, startTime: number, endTime: number, tempo: number) {
    var buffLengthMeasures = ESUtils.timeToMeasure(buffer.duration, tempo);
    var featureValue;
    featureValue = computeFeatureForBuffer(buffer, featureForAnalysis.toLowerCase(), tempo, startTime, endTime);
    return featureValue;
};

export function ESDur(buffer: AudioBuffer, tempo: number) {
    // rounds off precision error in JS
    var digits = 2;
    return Math.round(ESUtils.timeToMeasure(buffer.duration, tempo) * Math.pow(10, digits)) / Math.pow(10, digits);
};