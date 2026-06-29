import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import * as recorder from "./esrecorder"

export const LevelMeter = () => {
    const HEIGHT = 15
    const WIDTH = 250
    const STROKE_WIDTH = 2
    const RADIUS = 3

    const RECT_ATTRIBUTES = {
        x: STROKE_WIDTH,
        y: STROKE_WIDTH,
        width: WIDTH - STROKE_WIDTH * 2,
        height: HEIGHT - STROKE_WIDTH * 2,
        rx: RADIUS,
    }

    const [width, setWidth] = useState(0)

    useEffect(() => {
        const draw = () => {
            const dbMin = -36
            const db = Math.max(dbMin, 20 * Math.log10(recorder.meterVal))
            const val = (db - dbMin) / (-dbMin)
            const rVal = Math.max(0, (1 - val * 1.3))
            setWidth((WIDTH - STROKE_WIDTH * 2) * rVal)
            handle = window.requestAnimationFrame(draw)
        }
        let handle = window.requestAnimationFrame(draw)
        return () => window.cancelAnimationFrame(handle)
    }, [])

    return <svg width={WIDTH} height={HEIGHT}>
        <linearGradient id="meter-gradient">
            <stop offset="10%" stopColor="red" />
            <stop offset="40%" stopColor="yellow" />
            <stop offset="100%" stopColor="#00ff00" />
        </linearGradient>
        <rect {...RECT_ATTRIBUTES} fill="url(#meter-gradient)" style={{ stroke: "gray", strokeWidth: STROKE_WIDTH }} />
        <rect {...RECT_ATTRIBUTES} width={width} className="level-meter-bar" />
    </svg>
}

const BEAT_POSITIONS = {
    0: "topright",
    1: "bottomright",
    2: "bottomleft",
    3: "topleft",
} as { [key: number]: string }

export const Metronome = ({ beat, hasBuffer, useMetro, startRecording }: { beat: number, hasBuffer: boolean, useMetro: boolean, startRecording: () => void }) => {
    const [state, setState] = useState("")
    const measure = Math.floor(beat / 4) + 1
    const { t } = useTranslation()

    if (hasBuffer) {
        if (state === "record") {
            setState("")
        }
    }

    const IndicatorButton = () => {
        if (state === "record") {
            if (useMetro) {
                return measure > 0 ? <span className="text-5xl">{measure}</span> : <span className="font-bold">{t("soundUploader.record.getReady")}</span>
            } else {
                return <button className="text-3xl"
                    onClick={() => { recorder.stopRecording(); setState("") }}
                    aria-label={t("ariaDescriptors.recorder.stopRecording")}>
                    <i className="icon icon-recording blink recording" />
                </button>
            }
        } else if (state === "preview") {
            return <button className="text-3xl"
                onClick={() => { recorder.stopPreview(); setState("") }}
                aria-label={t("ariaDescriptors.recorder.stopPreview")}>
                <i className="icon icon-stop2" />
            </button>
        } else if (hasBuffer) {
            return <button className="text-3xl"
                onClick={() => { recorder.startPreview(() => setState("")); setState("preview") }}
                aria-label={t("ariaDescriptors.recorder.startPreview")}>
                <i className="icon icon-play4" />
            </button>
        } else {
            return <button className="text-3xl"
                onClick={() => { startRecording(); setState("record") }}
                aria-label={t("ariaDescriptors.recorder.startRecording")}>
                <i className="icon icon-recording" />
            </button>
        }
    }

    return <div className="flex items-center select-none">
        <div className="text-center z-10" style={{ marginLeft: "10px", width: "60px" }}><IndicatorButton /></div>
        <div className={"fixed counter-meter " + (useMetro ? BEAT_POSITIONS[((beat % 4) + 4) % 4] : "hide-metronome")} />
    </div>
}

const WIDTH = 420
const HEIGHT = 80
const SPACING = 3
const BAR_WIDTH = 1
const NUM_BARS = Math.round(WIDTH / SPACING)

function drawWaveform(context: CanvasRenderingContext2D, buf: Float32Array, amp: number, width: number = WIDTH, height: number = HEIGHT) {
    const step = Math.ceil(buf.length / width)
    context.clearRect(0, 0, width, height)
    context.fillStyle = "gray"
    for (let i = 0; i < width; i++) {
        let max = -1.0
        let min = 1.0

        for (let j = 0; j < step; j++) {
            const sample = buf[i * step + j]
            if (sample < min) {
                min = sample
            }
            if (sample > max) {
                max = sample
            }
        }
        context.fillRect(i, (min + 1) * amp, 1, Math.max(1, (max - min) * amp))
    }
}

const drawSpectrogram = (context: CanvasRenderingContext2D) => {
    const freqByteData = new Uint8Array(recorder.analyserNode!.frequencyBinCount)
    recorder.analyserNode!.getByteFrequencyData(freqByteData)

    context.clearRect(0, 0, WIDTH, HEIGHT)
    context.fillStyle = "#f6d565"
    context.lineCap = "round"
    const multiplier = recorder.analyserNode!.frequencyBinCount / NUM_BARS

    // Draw rectangle for each frequency bin.
    for (let i = 0; i < NUM_BARS; i++) {
        let magnitude = 0
        const offset = Math.floor(i * multiplier)
        // gotta sum/average the block, or we miss narrow-bandwidth spikes
        for (let j = 0; j < multiplier; j++) {
            magnitude += freqByteData[offset + j]
        }
        magnitude = magnitude / multiplier
        context.fillStyle = `hsl(${Math.round((i * 360) / NUM_BARS)}, 100%, 50%)`
        context.fillRect(i * SPACING, HEIGHT * 3 / 2, BAR_WIDTH, -magnitude * 3 / 5)
    }
}

export const Waveform = ({ buffer, fluid = false, width: propWidth, height: propHeight }: {
    buffer: AudioBuffer | null,
    fluid?: boolean,
    width?: number,
    height?: number
}) => {
    const canvas = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const handle = useRef<number>(0)
    const resolvedHeight = propHeight ?? HEIGHT
    const [measuredWidth, setMeasuredWidth] = useState(propWidth ?? WIDTH)

    useEffect(() => {
        if (!fluid) return
        const el = wrapperRef.current
        if (!el) return
        const ro = new ResizeObserver(entries => {
            const w = entries[0].contentRect.width
            if (w > 0) setMeasuredWidth(w)
        })
        ro.observe(el)
        setMeasuredWidth(el.clientWidth)
        return () => ro.disconnect()
    }, [fluid])

    useEffect(() => {
        if (!canvas.current) return
        const context = canvas.current.getContext("2d")!
        const resolvedWidth = fluid ? measuredWidth : (propWidth ?? WIDTH)
        if (buffer) {
            window.cancelAnimationFrame(handle.current)
            handle.current = 0
            drawWaveform(context, buffer.getChannelData(0), resolvedHeight / 2, resolvedWidth, resolvedHeight)
        } else if (!handle.current) {
            context.clearRect(0, 0, resolvedWidth, resolvedHeight)
            const loop = () => {
                drawSpectrogram(context)
                handle.current = window.requestAnimationFrame(loop)
            }
            loop()
        }
    }, [buffer, measuredWidth, fluid, propWidth, resolvedHeight])

    if (fluid) {
        return (
            <div ref={wrapperRef} style={{ width: "100%", height: resolvedHeight }}>
                <canvas ref={canvas} width={measuredWidth} height={resolvedHeight} style={{ width: "100%", height: resolvedHeight }} />
            </div>
        )
    }

    return <canvas ref={canvas} width={propWidth ?? WIDTH} height={resolvedHeight} />
}
