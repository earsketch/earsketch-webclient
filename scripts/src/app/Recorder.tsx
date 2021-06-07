import React, { useCallback, useEffect, useState } from "react"
import { react2angular } from "react2angular"

import * as recorder from "./esrecorder"

const LevelMeter = () => {
    const HEIGHT = 15
    const WIDTH = 250
    const STROKE_WIDTH = 2
    const RADIUS =  3

    const RECT_ATTRIBUTES = {
        x: STROKE_WIDTH,
        y: STROKE_WIDTH,
        width: WIDTH - STROKE_WIDTH*2,
        height: HEIGHT - STROKE_WIDTH*2,
        rx: RADIUS,
    }

    const [width, setWidth] = useState(0)

    useEffect(() => {
        const draw = () => {
            const dbMin = -36
            let db = Math.max(dbMin, 20 * Math.log10(recorder.meterVal))
            const val = (db - dbMin) / (-dbMin)
            const rVal = Math.max(0, (1 - val * 1.3))
            setWidth((WIDTH - STROKE_WIDTH*2) * rVal)
            handle = requestAnimationFrame(draw)
        }
        let handle = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(handle)
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

const Metronome = ({ micIsOn, hasBuffer, useMetro, isRecording, isPreviewing, curMeasure, curMeasureShow }:
                   { micIsOn: boolean, hasBuffer: boolean, useMetro: boolean, isRecording: boolean,
                     isPreviewing: boolean, curMeasure: number, curMeasureShow: number }) => {
    const [state, setState] = useState("topright")

    recorder.callbacks.clickOnMetronome = (beat) => {
        if (recorder.properties.useMetro) {
            setState(BEAT_POSITIONS[beat])
        } else {
            setState("hide-metronome")
        }
    }

    return <div className={"counter-meter " + state}>
        {micIsOn && !hasBuffer && !(useMetro && isRecording)
        && <span id="record-button" onClick={recorder.toggleRecord}>
            <i className={"icon icon-recording" + (isRecording ? " blink recording" : "")}></i>
        </span>}
        {isRecording && useMetro
        && <span>{curMeasureShow}</span>}
        {hasBuffer && !isRecording
        && <div id="preview-button" onClick={recorder.togglePreview}>
            {!isPreviewing && curMeasure >= 0
            ? <span id="play-icon"><i className="icon icon-play4"></i></span>
            : <span id="stop-icon"><i className="icon icon-stop2"></i></span>}
        </div>}
    </div>
}

const WIDTH = 420
const HEIGHT = 80

function drawWaveform(context: CanvasRenderingContext2D, buf: Float32Array, amp: number) {
    const step = Math.ceil(buf.length / WIDTH)
    context.clearRect(0, 0, WIDTH, HEIGHT)
    context.fillStyle = "gray"

    for (let i = 0; i < WIDTH; i++) {
        let max = -1.0
        let min = 1.0

        for (let j = 0; j < step; j++) {
            const sample = buf[i*step + j]
            if (sample < min) {
                min = sample
            }
            if (sample > max) {
                max = sample
            }
        }
        context.fillRect(i, (min+1) * amp, 1, Math.max(1, (max-min) * amp))
    }
}

const Waveform = () => {
    const setup = useCallback(canvas => {
        if (!canvas) return

        const context = canvas.getContext("2d")
        context.fillStyle = "gray"
        const amp = HEIGHT / 2

        const SPACING = 3
        const BAR_WIDTH = 1
        const numBars = Math.round(WIDTH / SPACING)
        let handle = 0

        context.clearRect(0, 0, WIDTH, HEIGHT)

        recorder.callbacks.showSpectrogram = () => {
            if (!handle) {
                drawSpectrogram()
            }
        }
    
        recorder.callbacks.showRecordedWaveform = () => {
            if (handle) {
                cancelAnimationFrame(handle)
                handle = 0
            }
    
            if (recorder.buffer) {
                drawWaveform(context, recorder.buffer.getChannelData(0), amp)
            } else {
                context.clearRect(0, 0, WIDTH, HEIGHT)
            }
        }
    
        // analyzer draw code here
        const drawSpectrogram = () => {
            const freqByteData = new Uint8Array(recorder.analyserNode!.frequencyBinCount)
            recorder.analyserNode!.getByteFrequencyData(freqByteData)
    
            context.clearRect(0, 0, WIDTH, HEIGHT)
            context.fillStyle = "#f6d565"
            context.lineCap = "round"
            const multiplier = recorder.analyserNode!.frequencyBinCount / numBars
    
            // Draw rectangle for each frequency bin.
            for (let i = 0; i < numBars; i++) {
                let magnitude = 0
                const offset = Math.floor(i * multiplier)
                // gotta sum/average the block, or we miss narrow-bandwidth spikes
                for (let j = 0; j < multiplier; j++) {
                    magnitude += freqByteData[offset + j]
                }
                magnitude = magnitude / multiplier
                context.fillStyle = `hsl(${Math.round((i*360) / numBars)}, 100%, 50%)`
                context.fillRect(i * SPACING, HEIGHT * 3/2, BAR_WIDTH, -magnitude * 3/5)
            }
            handle = requestAnimationFrame(drawSpectrogram)
        }
    }, [])

    return <canvas ref={setup} width={WIDTH} height={HEIGHT}></canvas>
}

app.component("levelMeter", react2angular(LevelMeter))
app.component("visualMetronome", react2angular(Metronome, ["micIsOn", "hasBuffer", "useMetro", "isRecording", "isPreviewing", "curMeasure", "curMeasureShow"]))
app.component("drawWaveform", react2angular(Waveform))
