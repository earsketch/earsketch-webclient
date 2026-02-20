import React, { useEffect, useRef, useState } from "react"
import * as audioLibrary from "../app/audiolibrary"

type AudioWaveformProps = {
    soundName: string | null
    height?: number
    width?: number
    progress?: number
    columns?: number
    className?: string
    ariaLabel?: string
}

function computePeaks(buffer: AudioBuffer, columns: number): Array<[number, number]> {
    const channels = buffer.numberOfChannels
    const length = buffer.length
    const samplesPerCol = Math.max(1, Math.floor(length / columns))

    const channelData: Float32Array[] = []
    for (let c = 0; c < channels; c++) channelData.push(buffer.getChannelData(c))

    const peaks: Array<[number, number]> = new Array(columns)

    for (let i = 0; i < columns; i++) {
        const start = i * samplesPerCol
        const end = i === columns - 1 ? length : Math.min(length, start + samplesPerCol)

        let min = 1
        let max = -1

        for (let s = start; s < end; s++) {
            // Mix down channels by averaging sample at s
            let v = 0
            for (let c = 0; c < channels; c++) v += channelData[c][s]
            v /= channels

            if (v < min) min = v
            if (v > max) max = v
        }

        // Guard in case of silent buffers / weird ranges
        if (min > max) {
            min = 0
            max = 0
        }

        peaks[i] = [min, max]
    }

    return peaks
}

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n))
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
    soundName,
    height = 120,
    width,
    progress,
    columns,
    className = "",
    ariaLabel = "Audio waveform",
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const [measuredWidth, setMeasuredWidth] = useState<number>(width ?? 0)
    const [peaks, setPeaks] = useState<Array<[number, number]> | null>(null)
    const [loading, setLoading] = useState(false)

    // Measure width if not provided
    useEffect(() => {
        if (width) {
            setMeasuredWidth(width)
            return
        }
        const el = wrapperRef.current
        if (!el) return

        const ro = new ResizeObserver(() => {
            setMeasuredWidth(el.clientWidth)
        })
        ro.observe(el)
        setMeasuredWidth(el.clientWidth)

        return () => ro.disconnect()
    }, [width])

    // Load buffer + compute peaks whenever soundName or measuredWidth changes
    useEffect(() => {
        let cancelled = false

        async function run() {
            if (!soundName || measuredWidth <= 0) {
                setPeaks(null)
                return
            }

            try {
                setLoading(true)
                const sound = await audioLibrary.getSound(soundName) // must return { buffer: AudioBuffer, ... }
                if (cancelled) return

                const cols = Math.max(24, columns ?? Math.floor(measuredWidth)) // ~1 col per px
                const p = computePeaks(sound.buffer, cols)

                if (!cancelled) setPeaks(p)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [soundName, measuredWidth, columns])

    // Draw peaks
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const w = Math.max(1, measuredWidth)
        const h = Math.max(1, height)

        // HiDPI
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        // Clear
        ctx.clearRect(0, 0, w, h)

        // Background (let your CSS handle it; we just draw bars)
        if (!peaks || peaks.length === 0) return

        const mid = h / 2
        const cols = peaks.length
        const colW = w / cols

        // Progress split (optional)
        const prog = progress == null ? null : clamp01(progress)
        const playedCols = prog == null ? 0 : Math.floor(prog * cols)

        for (let i = 0; i < cols; i++) {
            const [min, max] = peaks[i]

            // Map [-1..1] to y coords around midline
            const y1 = mid + min * mid
            const y2 = mid + max * mid

            // Minimal visible line
            const top = Math.min(y1, y2)
            const bot = Math.max(y1, y2)
            const x = i * colW

            // Pick style based on played/unplayed
            if (prog != null && i < playedCols) {
                ctx.fillStyle = "rgba(0,0,0,0.85)" // played
            } else {
                ctx.fillStyle = "rgba(0,0,0,0.25)" // unplayed
            }

            // Draw a thin rect per column
            const rectW = Math.max(1, colW * 0.7)
            const rectX = x + (colW - rectW) / 2
            ctx.fillRect(rectX, top, rectW, Math.max(1, bot - top))
        }
    }, [peaks, measuredWidth, height, progress])

    return (
        <div
            ref={wrapperRef}
            className={`w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}
            style={{ height }}
            role="img"
            aria-label={ariaLabel}
        >
            <canvas ref={canvasRef} />

            {/* Optional tiny loading overlay */}
            {loading && (
                <div className="absolute" style={{ display: "none" }}>
                    {/* keep minimal; you can add your spinner here if you want */}
                </div>
            )}
        </div>
    )
}
