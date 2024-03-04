import audioContext from "../audio/context"
import { TempoMap } from "./tempo"

export function timestretchBuffer(input: AudioBuffer, sourceTempo: number, targetTempoMap: TempoMap, start: number) {
    let stretched = timestretch(input.getChannelData(0), sourceTempo, targetTempoMap, start)
    const stretchedBuffer = new AudioBuffer({ numberOfChannels: input.numberOfChannels, length: stretched.length, sampleRate: input.sampleRate })
    stretchedBuffer.copyToChannel(stretched, 0)

    // Timestretch first channel to determine buffer length, then timestretch remaining channels
    for (let c = 1; c < input.numberOfChannels; c++) {
        stretched = timestretch(input.getChannelData(c), sourceTempo, targetTempoMap, start)
        stretchedBuffer.copyToChannel(stretched, c)
    }
    return stretchedBuffer
}

function timestretch(input: Float32Array, sourceTempo: number, targetTempoMap: TempoMap, start: number) {
    // Use Kali, a JS implementation of the WSOLA timestretch algorithm
    const kali = new Kali(1)
    const USE_QUICK_SEARCH_ALG = true
    kali.setup(audioContext.sampleRate, 1, USE_QUICK_SEARCH_ALG)
    // For reasons unknown, Kali tends to output a discontinuity at the start.
    // So, we warm it up by feeding in (and then dropping) some silence.
    const padding = new Float32Array(1024)
    kali.input(padding)
    kali.process()
    kali.output(padding)

    // Feed the input buffer to Kali a little bit at a time,
    // calling `kali.setTempo` over the duration of the buffer to respond to tempo changes.
    const CHUNK_SIZE = 128 // granularity of tempo updates
    const startTime = targetTempoMap.measureToTime(start)
    let samples = 0
    for (let i = 0; i < input.length; i += CHUNK_SIZE) {
        const factor = targetTempoMap.getTempoAtTime(startTime + samples / audioContext.sampleRate) / sourceTempo
        kali.setTempo(factor)
        // May be shorter than CHUNK_SIZE if this is the last chunk.
        const chunk = input.subarray(i, i + CHUNK_SIZE)
        kali.input(chunk)
        kali.process()
        samples += chunk.length / factor
    }
    const output = new Float32Array(Math.round(samples))
    kali.flush()
    kali.output(output)
    return output
}
