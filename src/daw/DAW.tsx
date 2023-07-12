import React, { useEffect, useState, useRef } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { EFFECT_MAP } from "../audio/effects"
import { setReady } from "../bubble/bubbleState"
import * as daw from "./dawState"
import * as ESUtils from "../esutils"
import * as player from "../audio/player"
import * as types from "common"
import esconsole from "../esconsole"
import store, { RootState } from "../reducers"
import { getLinearPoints, TempoMap } from "../app/tempo"
import * as WaveformCache from "../app/waveformcache"
import { addUIClick } from "../cai/student"

export const callbacks = {
    runScript: () => {},
}

// Width of track control box
const X_OFFSET = 100

const Header = ({ playPosition, setPlayPosition }: { playPosition: number, setPlayPosition: (a: number) => void }) => {
    const dispatch = useDispatch()
    const hideDAW = useSelector(appState.selectHideDAW)
    const playLength = useSelector(daw.selectPlayLength)
    const bubble = useSelector((state: RootState) => state.bubble)
    const playing = useSelector(daw.selectPlaying)
    const soloMute = useSelector(daw.selectSoloMute)
    const metronome = useSelector(daw.selectMetronome)
    const tracks = useSelector(daw.selectTracks)
    const loop = useSelector(daw.selectLoop)
    const autoScroll = useSelector(daw.selectAutoScroll)
    const embedMode = useSelector(appState.selectEmbedMode)
    const embeddedScriptName = useSelector(appState.selectEmbeddedScriptName)
    const [embedCompiled, setEmbedCompiled] = useState(false)
    const needCompile = embedMode && !embedCompiled
    const { t } = useTranslation()

    const playbackStartedCallback = () => {
        dispatch(daw.setPlaying(true))
        dispatch(daw.setPendingPosition(null))
    }

    const playbackEndedCallback = () => {
        dispatch(daw.setPlaying(false))
        setPlayPosition(1)
    }

    const play = () => {
        if (bubble.active && bubble.currentPage === 4 && !bubble.readyToProceed) {
            dispatch(setReady(true))
        }

        // In embedded mode, play button doubles as run button.
        if (embedMode && !embedCompiled) {
            callbacks.runScript()
            setEmbedCompiled(true)
            return
        }

        dispatch(daw.setPlaying(false))

        if (playPosition >= playLength) {
            setPlayPosition(loop.selection ? loop.start : 1)
        }

        player.callbacks.onStartedCallback = playbackStartedCallback
        player.callbacks.onFinishedCallback = playbackEndedCallback
        player.play(playPosition)

        // player does not preserve volume state between plays
        player.setVolume(volumeMuted ? -60 : volume)
    }

    const pause = () => {
        player.pause()
        dispatch(daw.setPlaying(false))
    }

    const toggleMetronome = () => {
        dispatch(daw.setMetronome(!metronome))
        player.setMutedTracks(daw.getMuted(tracks, soloMute, !metronome))
    }

    const toggleLoop = () => {
        const newLoop = { ...loop, on: !loop.on, selection: false }
        dispatch(daw.setLoop(newLoop))
        player.setLoop(newLoop)
    }

    const shareScriptLink = `${SITE_BASE_URI}/?sharing=${useSelector(appState.selectEmbeddedShareID)}`

    const [volume, setVolume] = useState(0) // in dB
    const [volumeMuted, setVolumeMuted] = useState(false)
    const minVolume = -20

    const mute = (value: boolean) => {
        setVolumeMuted(value)
        player.setVolume(value ? -60 : volume)
    }

    const changeVolume = (value: number) => {
        setVolume(value)
        if (value === minVolume) {
            mute(true)
        } else {
            setVolumeMuted(false)
            player.setVolume(value)
        }
    }

    const reset = () => {
        // Rewind to start (of loop or timeline).
        const pos = loop.selection ? loop.start : 1
        player.setPosition(pos)

        if (playing) {
            dispatch(daw.setPendingPosition(pos))
        } else {
            setPlayPosition(pos)
        }
    }

    const [titleKey, setTitleKey] = useState<string | null>(null)

    const el = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let dawResizeAnimationFrame: number | undefined
        // Update title/icon display whenever element size changes.
        const observer = new ResizeObserver(entries => {
            dawResizeAnimationFrame = window.requestAnimationFrame(() => {
                const width = entries[0].contentRect.width
                const shortKey = "daw.shortTitle"
                const longKey = "daw.title"
                if (embedMode) {
                    setTitleKey(hideDAW ? null : shortKey)
                } else if (width > 590) {
                    setTitleKey(longKey)
                } else if (width > 405) {
                    setTitleKey(shortKey)
                } else {
                    setTitleKey(null)
                }
            })
        })
        el.current && observer.observe(el.current)

        return () => {
            if (el.current) observer.unobserve(el.current)
            // clean up an oustanding animation frame request if it exists
            if (dawResizeAnimationFrame) window.cancelAnimationFrame(dawResizeAnimationFrame)
        }
    }, [el])

    return <div ref={el} id="dawHeader" className="grow-0 bg-gray-900" style={{ WebkitTransform: "translate3d(0,0,0)" }}>
        {/* TODO: don't use bootstrap classes */}
        {/* DAW Label */}
        <div id="daw-label">
            <span className="panel-label">
                {titleKey &&
                <h2 className="font-semibold font-sans text-black dark:text-white pl-2">{t(titleKey).toLocaleUpperCase()}</h2>}
            </span>
        </div>
        {embedMode && <div>
            <a target="_blank" href={shareScriptLink} rel="noreferrer"> Click here to view in EarSketch </a>
        </div>}
        {/* Transport Buttons */}
        <div className="daw-transport-container space-x-5">
            {/* Beginning */}
            <span className="daw-transport-button">
                <button aria-label={t("daw.tooltip.reset")} type="submit" className="dark:text-white hover:opacity-70" data-toggle="tooltip" data-placement="bottom" title={t("daw.tooltip.reset")} onClick={reset}>
                    <span className="icon icon-first"></span>
                </button>
            </span>

            <span id="daw-play-button">
                {/* Play */}
                {/* Prevent embedded mode race condition by waiting for embeddedScriptName to populate before showing */}
                {!playing && (!embedMode || (embedMode && embeddedScriptName)) && <span className="daw-transport-button">
                    <button aria-label={t("daw.tooltip.play")} type="submit" className={"hover:opacity-70 text-green-600" + (needCompile ? " flashButton" : "")} title={t("daw.tooltip.play")} onClick={() => { play(); addUIClick("project - play") }}>
                        <span className="icon icon-play4"></span>
                    </button>
                </span>}

                {/* Pause */}
                {playing && <span className="daw-transport-button">
                    <button aria-label={t("daw.tooltip.pause")} type="submit" className="dark:text-white hover:opacity-70" title={t("daw.tooltip.pause")} onClick={() => { pause(); addUIClick("project - pause") }}>
                        <span className="icon icon-pause2"></span>
                    </button>
                </span>}
            </span>

            {/* Loop */}
            <span className="daw-transport-button">
                <button aria-label={t("daw.tooltip.loopProject")} type="submit" className={"dark:text-white hover:opacity-70" + (loop.on ? " btn-clear-warning" : "")} data-toggle="tooltip" data-placement="bottom" title={t("daw.tooltip.loopProject")} onClick={() => { toggleLoop(); addUIClick("loop " + (!loop.on ? "on" : "off")) }}>
                    <span className="icon icon-loop"></span>
                </button>
            </span>

            {/* Autoscroll */}
            <span className="daw-transport-button rotate-90">
                <button aria-label={t("daw.tooltip.autoScroll")} type="submit" className={"dark:text-white hover:opacity-70" + (autoScroll ? " btn-clear-warning" : "")} data-toggle="tooltip" data-placement="bottom" title={t("daw.tooltip.autoScroll")} onClick={() => dispatch(daw.setAutoScroll(!autoScroll))}>
                    <span className="icon icon-move-up"></span>
                </button>
            </span>

            {/* Metronome */}
            <span className="daw-transport-button">
                <button aria-label={t("daw.tooltip.toggleMetronome")} id="dawMetronomeButton" className={"dark:text-white hover:opacity-70" + (metronome ? " btn-clear-warning" : "")} data-toggle="tooltip" title={t("daw.tooltip.toggleMetronome")} data-placement="bottom" onClick={() => { toggleMetronome(); addUIClick("metronome " + (!metronome ? "on" : "off")) }}>
                    <span className="icon icon-meter3"></span>
                </button>
            </span>

            {/* Volume Control */}
            <span className="daw-transport-button" id="volume-control">
                <span onClick={() => mute(!volumeMuted)}>
                    <button aria-label={t("daw.tooltip.toggleVolume")} id="muteButton" className="dark:text-white hover:opacity-70" style={{ width: "40px" }} title={t("daw.tooltip.toggleVolume")} data-toggle="tooltip" data-placement="bottom">
                        <span className={"icon icon-volume-" + (volumeMuted ? "mute" : "high")}></span>
                    </button>
                </span>
                <span className="daw-transport-button">
                    <input id="dawVolumeSlider" type="range" min={minVolume} max="0" value={volumeMuted ? minVolume : volume} onChange={e => changeVolume(+e.target.value)} title="Volume Control" aria-label="Volume Control"/>
                </span>
            </span>
        </div>
    </div>
}

const Track = ({ color, mute, soloMute, toggleSoloMute, bypass, toggleBypass, track, xScroll }: {
    color: daw.Color, mute: boolean, soloMute: daw.SoloMute, bypass: string[],
    toggleSoloMute: (a: "solo" | "mute") => void, toggleBypass: (a: string) => void, track: types.Track, xScroll: number
}) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)
    const { t } = useTranslation()

    return <div style={{ width: X_OFFSET + xScale(playLength) + "px" }}>
        <div className="dawTrackContainer" style={{ height: trackHeight + "px" }}>
            <div className="dawTrackCtrl" style={{ left: xScroll + "px" }}>
                <div className="dawTrackName text-gray-700 prevent-selection">{track.label}</div>
                {track.buttons &&
                <>
                    <button className={"text-xs px-1.5 py-0.5 rounded-lg dark:text-white dawSoloButton" + (soloMute === "solo" ? " active" : "")} onClick={() => { toggleSoloMute("solo"); addUIClick("solo: " + track.label + (soloMute === "solo" ? " off" : " on")) }} title={soloMute === "solo" ? t("daw.tooltip.unsoloTrack", { name: track.label }) : t("daw.tooltip.soloTrack", { name: track.label })} aria-label={soloMute === "solo" ? t("daw.tooltip.unsoloTrack", { name: track.label }) : t("daw.tooltip.soloTrack", { name: track.label })}>{t("daw.abbreviation.solo")}</button>
                    <button className={"text-xs px-1.5 py-0.5 rounded-lg dark:text-white dawMuteButton" + (soloMute === "mute" ? " active" : "")} onClick={() => { toggleSoloMute("mute"); addUIClick("mute: " + track.label + (soloMute === "mute" ? " off" : " on")) }} title={soloMute === "mute" ? t("daw.tooltip.unmuteTrack", { name: track.label }) : t("daw.tooltip.muteTrack", { name: track.label })} aria-label={soloMute === "mute" ? t("daw.tooltip.unmute") : t("daw.tooltip.mute")}>{t("daw.abbreviation.mute")}</button>
                </>}
            </div>
            <div className={`daw-track ${mute ? "mute" : ""}`}>
                {track.clips.map((clip: types.Clip, index: number) => <Clip key={index} color={color} clip={clip} />)}
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, effect], index) =>
            <div key={key} id="dawTrackEffectContainer" style={{ height: trackHeight + "px" }}>
                <div className="dawEffectCtrl" style={{ left: xScroll + "px" }}>
                    <div className="dawTrackName"></div>
                    <div className="dawTrackEffectName text-gray-700">{t("daw.effect")} {index + 1}</div>
                    <button className={"text-xs dark:text-white px-1.5 py-0.5 rounded-lg dawEffectBypassButton" + (bypass.includes(key) ? " active" : "")} onClick={() => toggleBypass(key)} disabled={mute}>
                        {t("daw.bypass")}
                    </button>
                </div>
                <Effect color={color} name={key} effect={effect} bypass={bypass.includes(key)} mute={mute} />
            </div>)}
    </div>
}

const drawWaveform = (element: HTMLElement, waveform: number[], width: number, height: number) => {
    const cvs = d3.select(element).select("canvas")
        .attr("width", width)
        .attr("height", height)
        .node() as HTMLCanvasElement

    const interval = width / waveform.length
    const zero = height / 2

    const ctx = cvs.getContext("2d")!
    ctx.strokeStyle = "#427EB0"
    ctx.fillStyle = "#181818"
    ctx.lineWidth = interval > 1 ? interval * 0.9 : interval // give some space between bins
    ctx.beginPath()
    for (let i = 0; i < waveform.length; i++) {
        const pos = i * interval + 0.5 // pixel offset needed to avoid canvas blurriness
        // TODO: include this scaling in the preprocessing if possible
        const magScaled = waveform[i] * height / 2
        ctx.moveTo(pos, zero + magScaled)
        ctx.lineTo(pos, zero - magScaled)
    }
    ctx.stroke()
    ctx.closePath()
}

const Clip = ({ color, clip }: { color: daw.Color, clip: types.Clip }) => {
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    // Minimum width prevents clips from vanishing on zoom out.
    const width = Math.max(xScale(clip.end - clip.start + 1), 2)
    const offset = xScale(clip.measure)
    const element = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (element.current && WaveformCache.checkIfExists(clip)) {
            const waveform = WaveformCache.get(clip)
            drawWaveform(element.current, waveform, width, trackHeight)
        }
    }, [clip, xScale, trackHeight])

    return <div ref={element} className={`dawAudioClipContainer${clip.loopChild ? " loop" : ""}`} style={{ background: color, width: width + "px", left: offset + "px" }}>
        <div className="clipWrapper">
            <div style={{ width: width + "px" }} className="clipName prevent-selection">{clip.filekey}</div>
            <canvas></canvas>
        </div>
    </div>
}

const Effect = ({ name, color, effect: envelope, bypass, mute }: {
    name: string, color: daw.Color, effect: types.Envelope, bypass: boolean, mute: boolean
}) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const element = useRef<HTMLDivElement>(null)
    const [focusedPoint, setFocusedPoint] = useState<number | null>(null)

    const [effect, parameter] = name.split("-")
    const defaults = EFFECT_MAP[effect].PARAMETERS[parameter]

    const x = d3.scale.linear()
        .domain([1, playLength + 1])
        .range([0, xScale(playLength + 1)])
    const y = d3.scale.linear()
        .domain([defaults.min, defaults.max])
        .range([trackHeight - 5, 5])

    // helper function to build a d3 plot of the effect
    const drawEffectWaveform = () => {
        const points = getLinearPoints(envelope)
        // draw a line to the end
        points.push({ measure: playLength + 1, value: points[points.length - 1].value })
        // map (x,y) pairs into a line
        const line = d3.svg.line().interpolate("linear").x((d: typeof points[0]) => x(d.measure)).y((d: typeof points[0]) => y(d.value))
        return line(points)
    }

    useEffect(() => {
        // update SVG waveform
        d3.select(element.current)
            .select("svg.effectSvg")
            .select("path")
            .attr("d", drawEffectWaveform())
    })

    return <div ref={element} className={"dawTrackEffect" + (bypass || mute ? " bypassed" : "")} style={{ background: color, width: xScale(playLength) + "px" }}>
        {name !== "TEMPO-TEMPO" && <div className="clipName">{name}</div>}
        <svg className="effectSvg">
            <path></path>
            {envelope.map((point, i) => <React.Fragment key={i}>
                <circle cx={x(point.measure)} cy={y(point.value)} r={focusedPoint === i ? 5 : 2} fill="steelblue" />
                <circle cx={x(point.measure)} cy={y(point.value)} r={8} onMouseEnter={() => setFocusedPoint(i)} onMouseLeave={() => setFocusedPoint(null)} pointerEvents="all">
                    <title>({point.measure}, {point.value})</title>
                </circle>
            </React.Fragment>)}
        </svg>
    </div>
}

const MixTrack = ({ color, bypass, toggleBypass, track, xScroll }: {
    color: daw.Color, bypass: string[], toggleBypass: (a: string) => void, track: types.Track, xScroll: number
}) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const mixTrackHeight = useSelector(daw.selectMixTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)
    const trackWidth = useSelector(daw.selectTrackWidth)
    const { t } = useTranslation()

    const hideMixTrackLabel = trackWidth < 950
    let effectOffset = 1

    return <div style={{ width: X_OFFSET + xScale(playLength) + "px" }}>
        <div className="dawTrackContainer" style={{ height: mixTrackHeight + "px" }}>
            <div className="dawTrackCtrl" style={{ left: xScroll + "px" }}>
                <div className="mixTrackFiller">{track.label}</div>
            </div>
            <div className="daw-track">
                <div className="mixTrackFiller" style={{ background: color }}>{!hideMixTrackLabel && <span>MIX TRACK</span>}</div>
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, envelope], index) => {
            if (key === "TEMPO-TEMPO" && new TempoMap(envelope).points.length === 1) {
                // Constant tempo: don't show the tempo curve.
                effectOffset = 0
                return null
            }
            return <div key={key} id="dawTrackEffectContainer" style={{ height: trackHeight + "px" }}>
                <div className="dawEffectCtrl flex items-center" style={{ left: xScroll + "px" }}>
                    <div className="dawTrackName"></div>
                    {key === "TEMPO-TEMPO"
                        ? <div className="grow text-center">TEMPO</div>
                        : <div className="dawTrackEffectName  text-gray-700">{t("daw.effect")} {index + effectOffset}</div>}
                    {key !== "TEMPO-TEMPO" &&
                    <button className={"btn btn-default btn-xs dawEffectBypassButton" + (bypass.includes(key) ? " active" : "")} onClick={() => toggleBypass(key)}>
                        {t("daw.bypass")}
                    </button>}
                </div>
                <Effect color={color} name={key} effect={envelope} bypass={bypass.includes(key)} mute={false} />
            </div>
        })}
    </div>
}

const Cursor = ({ position }: { position: number }) => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    return pendingPosition === null ? <div className="daw-cursor pointer-events-none" style={{ left: position + "px" }}></div> : null
}

const Playhead = ({ playPosition }: { playPosition: number }) => {
    const xScale = useSelector(daw.selectXScale)
    return <div className="daw-marker pointer-events-none" style={{ left: xScale(playPosition) + "px" }}></div>
}

const SchedPlayhead = () => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    const xScale = useSelector(daw.selectXScale)
    return pendingPosition === null ? null : <div className="daw-sched-marker" style={{ left: xScale(pendingPosition) }}></div>
}

const Measureline = () => {
    const xScale = useSelector(daw.selectXScale)
    const intervals = useSelector(daw.selectMeasurelineZoomIntervals)
    const playLength = useSelector(daw.selectPlayLength)
    const element = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let n = 1

        // create d3 axis
        const measureline = d3.svg.axis()
            .scale(xScale) // scale ticks according to zoom
            .orient("bottom")
            .tickValues(d3.range(1, playLength + 1, intervals.tickInterval))
            .tickSize(15)
            .tickFormat((d: any) => {
                // choose the next tick based on interval
                if (n === 1) {
                    n = intervals.labelInterval + d
                    return d
                } else {
                    if (d === n) {
                        n = intervals.labelInterval + n
                        return d
                    }
                }
                return ""
            })

        // append axis to timeline dom element
        d3.select(element.current).select("svg.axis g")
            .call(measureline)
            .selectAll("text")
            // move the first text element to fit inside the view
            .style("text-anchor", "start")
            .attr("y", 2)
            .attr("x", 3)

        if (intervals.tickDivision > 1) {
            let n = 1
            d3.select(element.current).selectAll("svg .tick")
                .filter((d: any) => {
                    if (n === 1) {
                        n = intervals.tickDivision + d
                        return false
                    } else {
                        if (d === n) {
                            n = intervals.tickDivision + n
                            return false
                        }
                    }
                    return true
                })
                .select("line")
                .attr("y1", 8)
                .attr("y2", 15)
        } else {
            d3.select(element.current).selectAll("svg .tick")
                .filter((d: number) => d % 1 !== 0)
                .select("line")
                .attr("y1", 8)
                .attr("y2", 15)

            d3.select(element.current).selectAll("svg .tick")
                .filter((d: number) => d % 1 === 0)
                .select("line")
                .attr("y1", 0)
                .attr("y2", 15)
        }
    })

    return <div ref={element} id="daw-measureline" className="relative w-full" style={{ top: "-1px", minWidth: X_OFFSET + xScale(playLength + 1) + "px" }}>
        <svg className="axis">
            <g></g>
        </svg>
    </div>
}

const Timeline = () => {
    const tempoMap = useSelector(daw.selectTempoMap)
    const xScale = useSelector(daw.selectXScale)
    const playLength = useSelector(daw.selectPlayLength)
    const songDuration = useSelector(daw.selectSongDuration)
    const intervals = useSelector(daw.selectTimelineZoomIntervals)
    const element = useRef<HTMLDivElement>(null)

    const ticks: number[] = d3.range(0, songDuration + 1, intervals.tickInterval)

    return <div ref={element} id="daw-timeline" className="relative w-full" style={{ minWidth: X_OFFSET + xScale(playLength + 1) + "px" }} tabIndex={-1}>
        <svg className="axis">
            <g>
                {ticks.map(t => {
                    const measure = tempoMap.timeToMeasure(t)
                    return <g key={t} className="tick" transform={`translate(${xScale(measure)},0)`}>
                        <line y2={t % intervals.labelInterval === 0 ? 6 : 2} x2={0} />
                        {t % intervals.labelInterval === 0 &&
                        <text dy=".71em" y={6} x={2}>
                            {d3.time.format("%M:%S")(new Date(1970, 0, 1, 0, 0, t))}
                        </text>}
                    </g>
                })}
            </g>
        </svg>
    </div>
}

const rms = (array: Float32Array) => {
    return Math.sqrt(array.map(v => v ** 2).reduce((a, b) => a + b) / array.length)
}

const prepareWaveforms = (tracks: types.Track[], tempoMap: TempoMap) => {
    esconsole("preparing a waveform to draw", "daw")

    // ignore the mix track (0) and metronome track (len-1)
    for (let i = 1; i < tracks.length - 1; i++) {
        tracks[i].clips.forEach(clip => {
            if (!WaveformCache.checkIfExists(clip)) {
                // Use pre-timestretching audio, since measures pass linearly in the DAW.
                const waveform = clip.sourceAudio.getChannelData(0)

                // Start/end locations within the clip's audio buffer, in samples.
                const tempo = clip.tempo ?? tempoMap.points[0].tempo
                const sfStart = ESUtils.measureToTime(clip.start, tempo) * clip.sourceAudio.sampleRate
                const sfEnd = ESUtils.measureToTime(clip.end, tempo) * clip.sourceAudio.sampleRate

                // suppress error when clips are overlapped
                if (sfEnd <= sfStart) {
                    return null
                }

                // extract waveform portion actually used
                const subFrames = waveform.subarray(sfStart, sfEnd)

                const out = []
                const N = 30 // resolution; total samples to draw per measure

                // downsample to N values using block-wise RMS
                const outNumSamps = (clip.end - clip.start) * N
                for (let i = 0; i < outNumSamps; i++) {
                    const blStart = i / outNumSamps * subFrames.length
                    const blEnd = (i + 1) / outNumSamps * subFrames.length
                    out[i] = rms(subFrames.subarray(blStart, blEnd))
                }

                // check: makebeat need special loop treatment or not???
                WaveformCache.add(clip, out)
            }
        })
    }
}

let lastTab: string | null = null
// TODO: Temporary hack:
let _setPlayPosition: ((a: number) => void) | null = null

export function setDAWData(result: types.DAWData) {
    const { dispatch, getState } = store
    let state = getState()

    const tempoMap = new TempoMap(result)
    WaveformCache.clear()
    prepareWaveforms(result.tracks, tempoMap)
    dispatch(daw.setTempoMap(tempoMap))

    const playLength = result.length + 1
    dispatch(daw.setPlayLength(playLength))

    const tracks: types.Track[] = []
    result.tracks.forEach((track, index) => {
        // create a (shallow) copy of the track so that we can
        // add stuff to it without affecting the reference which
        // we want to preserve (e.g., for the autograder)
        track = Object.assign({}, track)
        tracks.push(track)

        // Copy clips, too... because somehow dispatch(daw.setTracks(tracks)) is doing a deep freeze, preventing clip.source from being set by player.
        track.clips = track.clips.map(c => Object.assign({}, c))

        track.visible = true
        track.label = index
        track.buttons = true // show solo/mute buttons
    })

    const mix = tracks[0]
    const metronome = tracks[tracks.length - 1]

    if (mix !== undefined) {
        mix.visible = Object.keys(mix.effects).length > 1 || tempoMap.points.length > 1
        mix.mute = false
        // the mix track is special
        mix.label = "MIX"
        mix.buttons = false
    }

    if (lastTab !== state.tabs.activeTabID) {
        // User switched tabs since the last run.
        dispatch(daw.setMetronome(false))
        dispatch(daw.setShowEffects(true))
        dispatch(daw.setPlaying(false))
        _setPlayPosition!(1)
        dispatch(daw.shuffleTrackColors())
        dispatch(daw.setSoloMute({}))
        dispatch(daw.setBypass({}))
        // Set zoom based on play length.
        // (The `max()` puts a cap on zoom when dealing with a small number of measures.)
        const trackWidth = 64000 / Math.max(playLength, 8)
        dispatch(daw.setTrackWidth(trackWidth))
        dispatch(daw.setTrackHeight(45))
        lastTab = state.tabs.activeTabID
        // Get updated state after dispatches:
        state = getState()
    }

    if (metronome !== undefined) {
        metronome.visible = false
        metronome.mute = !state.daw.metronome
        metronome.effects = {}
    }

    // Without copying clips above, this dispatch freezes all of the clips, which breaks player.
    dispatch(daw.setTracks(tracks))

    player.setDAWData(result, daw.getMuted(tracks, state.daw.soloMute, state.daw.metronome), daw.selectBypass(state))

    // sanity checks
    const newLoop = Object.assign({}, state.daw.loop)
    if (state.daw.loop.start > playLength) {
        newLoop.start = 1
    }
    if (state.daw.loop.end > playLength) {
        newLoop.end = playLength
    }
    dispatch(daw.setLoop(newLoop))
}

export const DAW = () => {
    const dispatch = useDispatch()
    const xScale = useSelector(daw.selectXScale)
    const trackColors = useSelector(daw.selectTrackColors)
    const playLength = useSelector(daw.selectPlayLength)
    const [cursorPosition, setCursorPosition] = useState(0)
    const tracks = useSelector(daw.selectTracks)
    const showEffects = useSelector(daw.selectShowEffects)
    const hasEffects = tracks.some(track => Object.keys(track.effects).length > 0)
    const metronome = useSelector(daw.selectMetronome)
    const bypass = useSelector(daw.selectBypass)
    const soloMute = useSelector(daw.selectSoloMute)
    const muted = useSelector(daw.selectMuted)
    const [playPosition, setPlayPosition] = useState(1)
    _setPlayPosition = setPlayPosition
    const playing = useSelector(daw.selectPlaying)

    const embeddedScriptName = useSelector(appState.selectEmbeddedScriptName)
    const embeddedScriptUsername = useSelector(appState.selectEmbeddedScriptUsername)
    const hideDAW = useSelector(appState.selectHideDAW)
    const hideEditor = useSelector(appState.selectHideEditor)

    const trackWidth = useSelector(daw.selectTrackWidth)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const totalTrackHeight = useSelector(daw.selectTotalTrackHeight)

    const { t } = useTranslation()

    const zoomX = (steps: number) => {
        dispatch(daw.setTrackWidth(Math.min(Math.max(650, trackWidth + steps * 100), 50000)))
    }
    const zoomY = (steps: number) => {
        dispatch(daw.setTrackHeight(Math.min(Math.max(25, trackHeight + steps * 10), 125)))
    }

    const [xScroll, setXScroll] = useState(0)
    const [yScroll, setYScroll] = useState(0)
    const el = useRef<HTMLDivElement>(null)

    const toggleBypass = (trackIndex: number, effectKey: string) => {
        let effects = bypass[trackIndex] ?? []
        if (effects.includes(effectKey)) {
            effects = effects.filter(k => k !== effectKey)
        } else {
            effects = [effectKey, ...effects]
        }
        const updated = { ...bypass, [trackIndex]: effects }
        dispatch(daw.setBypass(updated))
        player.setBypassedEffects(updated)
    }

    const toggleSoloMute = (trackIndex: number, kind: daw.SoloMute) => {
        const updated = { ...soloMute, [trackIndex]: soloMute[trackIndex] === kind ? undefined : kind }
        dispatch(daw.setSoloMute(updated))
        player.setMutedTracks(daw.getMuted(tracks, updated, metronome))
    }

    const [dragStart, setDragStart] = useState<number | null>(null)

    const _loop = useSelector(daw.selectLoop)
    // We have local loop state which is modified while the user sets the loop selection.
    const [loop, setLoop] = useState(_loop)
    // It is synchronized with the loop state in the Redux store when the latter is updated (e.g. on mouse up):
    useEffect(() => setLoop(_loop), [_loop])

    const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        // calculate x position of the bar from mouse position
        let x = event.clientX - (event.currentTarget.firstChild as Element).getBoundingClientRect().left
        if (event.currentTarget.className !== "daw-track") {
            x -= X_OFFSET
        }
        // allow clicking the track controls without affecting dragging
        if (x < xScroll) {
            return
        }
        // round to nearest measure
        const measure = Math.round(xScale.invert(x))

        // Do not drag if beyond playLength
        if (measure > playLength) {
            setDragStart(null)
        } else {
            setDragStart(measure)
            // keep track of what state to revert to if looping is canceled
            setLoop({ ...loop, reset: loop.on, start: measure, end: measure })
        }
    }

    const onMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        if (dragStart === null) {
            return
        }

        // calculate x position of the bar from mouse position
        let x = event.clientX - (event.currentTarget.firstChild as Element).getBoundingClientRect().left
        if (event.currentTarget.className !== "daw-track") {
            x -= X_OFFSET
        }
        // round to nearest measure
        const measure = Math.min(Math.round(xScale.invert(x)), playLength)

        setDragStart(null)

        let newLoop
        if (loop.start === loop.end) {
            // turn looping off if the loop range is 0 (i.e., no drag)
            newLoop = { ...loop, selection: false, on: loop.reset }
        } else {
            newLoop = { ...loop, selection: true, on: true }
            // NOTE: In the Angular implementation, dawController implicitly relied on player sharing a reference to the mutable `loop` object.
            // Hence, there was only one call to player.setLoop(), which occurred here.
        }

        player.setLoop(newLoop)
        dispatch(daw.setLoop(newLoop))

        if (newLoop.selection) {
            if (!playing || !(playPosition >= loop.start && playPosition <= loop.end)) {
                setPlayPosition(loop.start)
                dispatch(daw.setPendingPosition(playing ? loop.start : null))
            }
        } else {
            setPlayPosition(measure)
            dispatch(daw.setPendingPosition(playing ? measure : null))
            player.setPosition(measure)
        }
    }

    const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        // calculate x position of the bar from mouse position
        let x = event.clientX - (event.currentTarget.firstChild as Element).getBoundingClientRect().left
        if (event.currentTarget.className !== "daw-track") {
            x -= X_OFFSET
        }
        // round to nearest measure
        const measure = Math.round(xScale.invert(x))

        if (measure <= playLength && measure > 0) {
            setCursorPosition(xScale(measure))
        }

        // Prevent dragging beyond playLength
        if (dragStart === null || measure > playLength) {
            return
        }

        if (measure > dragStart) {
            setLoop({ ...loop, selection: true, start: dragStart, end: measure })
        } else if (measure < dragStart) {
            setLoop({ ...loop, selection: true, start: measure, end: dragStart })
        } else {
            setLoop({ ...loop, selection: false, start: measure, end: measure })
        }
    }

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "+" || event.key === "=") {
            zoomX(1)
        } else if (event.key === "-") {
            zoomX(-1)
        }
    }

    const onWheel = (event: WheelEvent) => {
        if ((event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            if (event.shiftKey) {
                // The `|| event.deltaX` is here to compensate for macOS behavior:
                // When the shift key is pressed, and the user is using an external mouse, but *not* an Apple™ Magic Mouse™,
                // and it's a blue moon, but the stars are *not* aligned, macOS remaps vertical scroll into horizontal scroll.
                zoomY(-Math.sign(event.deltaY || event.deltaX))
            } else {
                zoomX(-Math.sign(event.deltaY) * 5)
            }
        } else if (yScrollEl.current) {
            // Would prefer to forward the wheel event to the correct element, by experiments with this (dispatchEvent) proved fruitless.
            // (The element received the event but did not scroll.)
            yScrollEl.current.scrollBy({ top: Math.sign(event.deltaY) * 100, behavior: "smooth" })
        }
    }

    // This is regrettably necessary for reasons describe here: https://github.com/facebook/react/issues/14856
    useEffect(() => {
        if (!el.current) return
        el.current.addEventListener("wheel", onWheel)
        return () => { if (el.current) el.current.removeEventListener("wheel", onWheel) }
    }, [onWheel])

    // Keep triggering an action while the mouse button is held.
    const repeatClick = (action: () => void, interval = 125) => {
        const timer = useRef(0)
        const up = (event: MouseEvent) => {
            if (event.button !== 0) return
            clearInterval(timer.current)
            document.removeEventListener("mouseup", up)
        }
        const down = (event: React.MouseEvent<HTMLButtonElement>) => {
            // Only respond to left-click. (Right-click does weird things in some browsers, maybe because of the context menu.)
            if (event.button !== 0) return
            // NOTE: The `window.` is so TypeScript doesn't get confused by NodeJS.setInterval. :-/
            timer.current = window.setInterval(action, interval)
            action()
            // NOTE: We bind this to the document (instead of the same element `down` gets bound to)
            //   in case the user releases the mouse somewhere else.
            document.addEventListener("mouseup", up)
        }
        return down
    }

    // A bit hacky; this allows the interval to continue working after a re-render.
    const zoomXRef = useRef(zoomX); const zoomYRef = useRef(zoomY)
    // Update on re-render:
    zoomXRef.current = zoomX
    zoomYRef.current = zoomY

    const zoomInX = repeatClick(() => zoomXRef.current(2))
    const zoomInY = repeatClick(() => zoomYRef.current(1))
    const zoomOutX = repeatClick(() => zoomXRef.current(-2))
    const zoomOutY = repeatClick(() => zoomYRef.current(-1))

    const autoScroll = useSelector(daw.selectAutoScroll)
    const xScrollEl = useRef<HTMLDivElement>(null)
    const yScrollEl = useRef<HTMLDivElement>(null)

    const theme = useSelector(appState.selectColorTheme)

    // It's important that updating the play position and scrolling happen at the same time to avoid visual jitter.
    // (e.g. *first* the cursor moves, *then* the scroll catches up - looks flickery.)
    const updatePlayPositionAndScroll = () => {
        const position = player.getPosition()
        setPlayPosition(position)

        if (!(el.current && xScrollEl.current)) return

        const xScroll = el.current.scrollLeft
        const viewMin = xScale.invert(xScroll)
        const viewMax = xScale.invert(xScroll + el.current.clientWidth - X_OFFSET)

        if (position > viewMax) {
            // Flip right
            xScrollEl.current.scrollLeft += xScrollEl.current.clientWidth
        } else if (position < viewMin) {
            // Flip left
            xScrollEl.current.scrollLeft -= xScrollEl.current.clientWidth
        }

        // Follow playback continuously if autoscroll is enabled
        if (autoScroll && (xScale(position) - xScroll) > (el.current.clientWidth - 115) / 2) {
            const fracX = (xScale(position) - (el.current.clientWidth - 115) / 2) / (el.current.scrollWidth - el.current.clientWidth)
            xScrollEl.current.scrollLeft = fracX * (xScrollEl.current.scrollWidth - xScrollEl.current.clientWidth)
        }
    }

    // HACK: Prevent xScroll and yScroll from getting desync'd after some updates.
    // TODO: We should remove this when we come back to make scroll/zoom enhancements.
    useEffect(() => {
        if (!el.current) return
        if (yScrollEl.current) {
            const fracY = yScrollEl.current.scrollTop / (yScrollEl.current.scrollHeight - yScrollEl.current.clientHeight)
            el.current.scrollTop = fracY * (el.current.scrollHeight - el.current.clientHeight)
            setYScroll(el.current.scrollTop)
        }
        if (xScrollEl.current) {
            const fracX = xScrollEl.current.scrollLeft / (xScrollEl.current.scrollWidth - xScrollEl.current.clientWidth)
            el.current.scrollLeft = fracX * (el.current.scrollWidth - el.current.clientWidth)
            setXScroll(el.current.scrollLeft)
        }
    })

    useEffect(() => {
        if (playing) {
            const interval = setInterval(updatePlayPositionAndScroll, 60)
            return () => clearInterval(interval)
        }
    }, [playing, xScale, autoScroll])

    return <div className={`flex flex-col w-full h-full relative overflow-hidden ${theme === "light" ? "theme-light" : "dark"}`}>
        {hideEditor &&
        <div style={{ display: "block" }} className="embedded-script-info"> Script {embeddedScriptName} by {embeddedScriptUsername}</div>}
        <Header playPosition={playPosition} setPlayPosition={setPlayPosition}></Header>

        {!hideDAW &&
        <div id="zoom-container" className="grow relative w-full h-full flex flex-col overflow-x-auto overflow-y-hidden z-0">
            {/* Effects Toggle */}
            <button className="btn-effect flex items-center justify-center bg-white hover:bg-blue-100 dark:text-white dark:bg-gray-900 dark:hover:bg-blue-500"
                title={t("daw.tooltip.toggleEffects")} tabIndex={0} aria-label={t("daw.tooltip.toggleEffects")} onClick={() => dispatch(daw.toggleEffects())} disabled={!hasEffects}>
                <span className="mr-1 text-sm">{t("daw.effect", { count: 0 }).toLocaleUpperCase()}</span>
                <span className={"icon icon-eye" + (showEffects ? "" : "-blocked")}></span>
            </button>

            <div className="grow flex h-full relative">
                {/* DAW Container */}
                <div ref={el} className="grow overflow-hidden" id="daw-container"
                    onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onKeyDown={onKeyDown}>
                    <div className="relative">
                        <div id="daw-clickable" style={{ position: "relative", top: yScroll + "px" }}>
                            <Timeline />
                            <Measureline />
                        </div>

                        <div className="daw-track-group-container" style={{ marginBottom: "14px" }}>
                            {tracks.map((track, index) => {
                                if (track.visible) {
                                    if (index === 0) {
                                        return <MixTrack key={index} color={trackColors[index % trackColors.length]} track={track}
                                            bypass={bypass[index] ?? []} toggleBypass={key => toggleBypass(index, key)} xScroll={xScroll} />
                                    } else if (index < tracks.length - 1) {
                                        return <Track key={index} color={trackColors[index % trackColors.length]} track={track}
                                            mute={muted.includes(index)} soloMute={soloMute[index]} toggleSoloMute={kind => toggleSoloMute(index, kind)}
                                            bypass={bypass[index] ?? []} toggleBypass={key => toggleBypass(index, key)} xScroll={xScroll} />
                                    }
                                }
                                return null
                            })}
                        </div>

                        <div className="absolute left-0 h-full" style={{ top: 0 }}>
                            <Playhead playPosition={playPosition} />
                            <SchedPlayhead />
                            {/* TODO - Update cursor label on hover */}
                            <Cursor position={cursorPosition} />
                            {(dragStart !== null || (loop.selection && loop.on)) && loop.end !== loop.start &&
                            <div className="daw-highlight" style={{ width: xScale(Math.abs(loop.end - loop.start) + 1) + "px", left: xScale(Math.min(loop.start, loop.end)) }} />}
                        </div>
                    </div>
                </div>

                <div id="horz-zoom-slider-container" className="flex flex-row grow-0 absolute pr-3 pb-1 bg-white w-full justify-end items-center z-20" style={{ boxShadow: "0 -6px 3px -6px black" }}>
                    <button onMouseDown={zoomInX} className="zoom-in pr-1" title={t("ariaDescriptors:daw.horizontalZoomIn")} aria-label={t("ariaDescriptors:daw.horizontalZoomIn")}><i className="icon-plus2 text-[10px]"></i></button>
                    <button onMouseDown={zoomOutX} className="zoom-out pr-1" title={t("ariaDescriptors:daw.horizontalZoomOut")} aria-label={t("ariaDescriptors:daw.horizontalZoomOut")}><i className="icon-minus text-[10px]"></i></button>
                </div>

                <div id="vert-zoom-slider-container" className="flex flex-col grow-0 absolute pb-3 bg-white justify-end items-center z-20" style={{ height: "calc(100% - 30px)", boxShadow: "-6px 0 3px -6px black" }}>
                    <button onMouseDown={zoomInY} className="zoom-in leading-none" title={t("ariaDescriptors:daw.verticalZoomIn")} aria-label={t("ariaDescriptors:daw.verticalZoomIn")}><i className="icon-plus2 text-[10px]"></i></button>
                    <button onMouseDown={zoomOutY} className="zoom-out leading-none" title={t("ariaDescriptors:daw.verticalZoomOut")} aria-label={t("ariaDescriptors:daw.verticalZoomOut")}><i className="icon-minus text-[10px]"></i></button>
                </div>

                <div ref={yScrollEl} className="absolute overflow-y-scroll z-20"
                    title={t("ariaDescriptors:daw.verticalScroll")}
                    style={{ width: "15px", top: "32px", right: "2px", bottom: "40px" }}
                    onScroll={e => {
                        if (!el.current) return
                        const target = e.target as Element
                        const fracY = target.scrollTop / (target.scrollHeight - target.clientHeight)
                        el.current.scrollTop = fracY * (el.current.scrollHeight - el.current.clientHeight)
                        setYScroll(el.current.scrollTop)
                    }}>
                    <div style={{ width: "1px", height: `max(${totalTrackHeight}px, 100.5%)` }}></div>
                </div>

                <div ref={xScrollEl} className="absolute overflow-x-scroll z-20"
                    title={t("ariaDescriptors:daw.horizontalScroll")}
                    style={{ height: "15px", left: "100px", right: "45px", bottom: "2px" }}
                    onScroll={e => {
                        if (!el.current) return
                        const target = e.target as Element
                        const fracX = target.scrollLeft / (target.scrollWidth - target.clientWidth)
                        el.current.scrollLeft = fracX * (el.current.scrollWidth - el.current.clientWidth)
                        setXScroll(el.current.scrollLeft)
                    }}>
                    <div style={{ width: `max(${xScale(playLength + 1)}px, 100.5%)`, height: "1px" }}></div>
                </div>
            </div>
        </div>}
    </div>
}
