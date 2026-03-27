// Render DAW projects to audio files using an offline audio context.
import * as lame from "@breezystack/lamejs"
import Flac from "libflacjs/dist/libflac"
import { Encoder } from "libflacjs/src/encoder"
import { exportFlacFile } from "libflacjs/src/utils"

import pitchshiftWorkletURL from "@lib/pitchshift/worklet?url"
import esconsole from "../esconsole"
import { Clip, DAWData } from "common"
import { OfflineAudioContext } from "./context"
import { TempoMap } from "../app/tempo"
import { ProjectGraph, clearAudioGraph, playTrack } from "./common"

const NUM_CHANNELS = 2
const SAMPLE_RATE = 44100

// Render a result for offline playback.
export async function renderBuffer(dawData: DAWData) {
    esconsole("Begin rendering result to buffer.", ["debug", "renderer"])

    const tempoMap = new TempoMap(dawData)
    const duration = tempoMap.measureToTime(dawData.length + 1) // need +1 to render to end of last measure
    const context = new OfflineAudioContext(NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE)
    await context.audioWorklet.addModule(pitchshiftWorkletURL)

    const out = new GainNode(context)
    out.connect(context.destination)
    const projectGraph: ProjectGraph = {
        tracks: [],
        mix: new GainNode(context),
    }

    // NOTE: When rendering projects, we ignore solo/mute/bypass.
    for (const [i, track] of dawData.tracks.entries()) {
        const trackGraph = playTrack(context, i, track, out, tempoMap, 0, duration, context.currentTime, projectGraph.mix, [], true)
        projectGraph.tracks.push(trackGraph)
        if (i === 0) {
            trackGraph.output.gain.value = 0 // mute metronome
        }
    }

    const buffer = await context.startRendering()
    esconsole("Render to buffer completed.", ["debug", "renderer"])
    clearAudioGraph(projectGraph)
    return buffer
}

// Render a result for offline playback. Returns a Blob.
export async function renderWav(result: DAWData) {
    const buffer = await renderBuffer(result)
    const pcmarrayL = buffer.getChannelData(0)
    const pcmarrayR = buffer.getChannelData(1)

    const interleaved = interleave(pcmarrayL, pcmarrayR)
    return encodeWAV(interleaved, SAMPLE_RATE, 2)
}

// Render a result to mp3 for offline playback. Returns a Blob.
export async function renderMP3(result: DAWData) {
    const buffer = await renderBuffer(result)
    const mp3encoder = new lame.Mp3Encoder(2, 44100, 160)
    const mp3Data = []

    const left = float32ToInt16(buffer.getChannelData(0))
    const right = float32ToInt16(buffer.getChannelData(1))
    const sampleBlockSize = 1152
    let mp3buf

    const len = left.length

    for (let i = 0; i < len; i += sampleBlockSize) {
        const leftChunk = left.subarray(i, i + sampleBlockSize)
        const rightChunk = right.subarray(i, i + sampleBlockSize)
        mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf)
        }
    }
    mp3buf = mp3encoder.flush()

    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
    }

    return new Blob(mp3Data, { type: "audio/mp3" })
}

// Merge all the given clip buffers into one large buffer.
// Returns a promise that resolves to an AudioBuffer.
export async function mergeClips(clips: Clip[], tempoMap: TempoMap) {
    esconsole("Merging clips", ["debug", "renderer"])
    // calculate the length of the merged clips
    const length = Math.max(0, ...clips.map(clip => clip.measure + (clip.end - clip.start)))
    const duration = tempoMap.measureToTime(length + 1)

    // create an offline context for rendering
    const context = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE)

    const mix = context.createGain()
    mix.connect(context.destination)

    for (const clip of clips) {
        const source = new AudioBufferSourceNode(context, { buffer: clip.audio })
        source.connect(mix)

        const startTime = tempoMap.measureToTime(clip.measure)
        const endTime = tempoMap.measureToTime(clip.measure + (clip.end - clip.start))

        source.start(startTime)
        source.stop(endTime)
    }

    const buffer = await context.startRendering()
    esconsole("Merged clips", ["debug", "renderer"])
    return buffer
}

// Create an interleaved two-channel array for WAV file output.
function interleave(inputL: Float32Array, inputR: Float32Array) {
    const length = inputL.length + inputR.length
    const result = new Float32Array(length)

    let index = 0; let inputIndex = 0

    while (index < length) {
        result[index++] = inputL[inputIndex]
        result[index++] = inputR[inputIndex]
        inputIndex++
    }
    return result
}

// Encode an array of interleaved 2-channel samples to a WAV file.
export function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF identifier
    writeString(view, 0, "RIFF")
    // file length
    view.setUint32(4, 32 + samples.length * 2, true)
    // RIFF type
    writeString(view, 8, "WAVE")
    // format chunk identifier
    writeString(view, 12, "fmt ")
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (raw)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, numChannels, true)
    // sample rate
    view.setUint32(24, sampleRate, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 4, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * 2, true)
    // bits per sample
    view.setUint16(34, 16, true)
    // data chunk identifier
    writeString(view, 36, "data")
    // data chunk length
    view.setUint32(40, samples.length * 2, true)
    // samples
    for (let i = 0; i < samples.length; i++) {
        view.setInt16(44 + i * 2, floatToInt16(samples[i]), true)
    }

    return new Blob([view], { type: "audio/wav" })
}

function floatToInt16(x: number) {
    return Math.round(Math.max(-1, Math.min(x, 1)) * 0x7FFF)
}

function float32ToInt16(input: Float32Array) {
    const output = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
        output[i] = floatToInt16(input[i])
    }
    return output
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}

function float32ToInt16InInt32(input: Float32Array) {
    const output = new Int32Array(input.length)
    for (let i = 0; i < input.length; i++) {
        output[i] = floatToInt16(input[i])
    }
    return output
}

export function encodeFLAC(samples: Float32Array | Float32Array[], sampleRate: number, numChannels: number) {
    const encoder = new Encoder(Flac, {
        sampleRate,
        channels: numChannels,
        bitsPerSample: 16,
        compression: 8,
    })
    if (Array.isArray(samples)) {
        // Planar
        encoder.encode(samples.map(float32ToInt16InInt32))
    } else {
        // Interleaved
        encoder.encode(float32ToInt16InInt32(samples))
    }
    encoder.encode()
    const encoded = encoder.getSamples()
    const metadata = encoder.metadata!
    encoder.destroy()

    return exportFlacFile([encoded], metadata, false)
}
