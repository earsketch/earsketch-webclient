import { Clip } from "./player"

let CACHE: { [key: string]: number[] } = {}

export const clear = () => {
    CACHE = {}
}

const prepKey = (clip: Clip) => {
    return `${clip.filekey}-${clip.start}-${clip.end}`
}

export const checkIfExists = (clip: Clip) => {
    return prepKey(clip) in CACHE
}

const logCurve = (val: number, factor: number) => {
    factor = factor <= 1 ? 1.000001 : factor
    return (Math.log(val * (factor - 1.) + 1.)) / (Math.log(factor))
}

const normalize = (waveform: number[]) => {
    var max = waveform.reduce((a, b) => Math.max(a, b))
    var maxLog = logCurve(max, 5)
    return waveform.map(v => v / maxLog * 0.8)
}

export const add = (clip: Clip, waveform: number[]) => {
    CACHE[prepKey(clip)] = normalize(waveform)
}

export const get = (clip: Clip) => {
    return CACHE[prepKey(clip)]
}