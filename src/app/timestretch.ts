import audioContext from "./audiocontext"
import { TempoMap } from "./tempo"

export function timestretch(input: Float32Array, sourceTempo: number, targetTempoMap: TempoMap, startMeasure: number) {
    // Use Kali, a JS implementation of the WSOLA time-stretching algorithm, to time-stretch an audio buffer.
    const kali = new Kali(1)
    kali.setup(audioContext.sampleRate, 1, FLAGS.TS_QUICK_SEARCH)
    // For reasons unknown, Kali tends to output a discontinuity at the start.
    // So, we warm it up by feeding in (and then dropping) some silence.
    const padding = new Float32Array(1024)
    kali.input(padding)
    kali.process()
    kali.output(padding)

    // Feed the input buffer to Kali a little bit at a time,
    // calling `kali.setTempo` over the duration of the buffer to respond to tempo changes.
    const CHUNK_SIZE = 128 // granularity of tempo updates
    const startTime = targetTempoMap.measureToTime(startMeasure)
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
    const output = audioContext.createBuffer(1, Math.round(samples), audioContext.sampleRate)
    kali.flush()
    kali.output(output.getChannelData(0))
    return output
}
