import React, { useEffect, useState, useRef } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'

import * as appState from '../app/appState'
import * as daw from './dawState'

import { setReady } from '../bubble/bubbleState'
import * as helpers from "../helpers"

// Width of track control box
const X_OFFSET = 100

// TODO: remove after refactoring player
let _result = null


const Header = ({ playPosition, setPlayPosition }) => {
    const dispatch = useDispatch()
    const playLength = useSelector(daw.selectPlayLength)
    const bubble = useSelector(state => state.bubble)
    const playing = useSelector(daw.selectPlaying)
    const soloMute = useSelector(daw.selectSoloMute)
    const muted = useSelector(daw.selectMuted)
    const bypass = useSelector(daw.selectBypass)
    const metronome = useSelector(daw.selectMetronome)
    const tracks = useSelector(daw.selectTracks)
    const loop = useSelector(daw.selectLoop)
    const autoScroll = useSelector(daw.selectAutoScroll)
    const embedMode = useSelector(appState.selectEmbedMode)
    const [needCompile, setNeedCompile] = useState(embedMode)

    const playbackStartedCallback = () => {
        dispatch(daw.setPlaying(true))
        dispatch(daw.setPendingPosition(null))
    }

    const playbackEndedCallback = () => {
        if (!loop.on) {
            dispatch(daw.setPlaying(false))
            setPlayPosition(1)
        }
    }

    const play = () => {
        if (bubble.active && bubble.currentPage === 4 && !bubble.readyToProceed) {
            dispatch(setReady(true))
        }

        // TODO: Update after relevant components get ported.
        if (needCompile) {
            $rootScope.$broadcast('compileembeddedTrack', true)
            setNeedCompile(false)
            return
        }

        dispatch(daw.setPlaying(false))

        if (playPosition >= playLength) {
            setPlayPosition(loop.selection ? loop.start : 1)
        }

        // TODO: These should be unnecessary given that they're set upon compile...
        // ...except player calls player.reset() on finish. :-(
        // Remove this after refactoring player.
        player.setRenderingData(_result)
        player.setMutedTracks(muted)
        player.setBypassedEffects(bypass)
    
        player.setOnStartedCallback(playbackStartedCallback)
        player.setOnFinishedCallback(playbackEndedCallback)
        player.play(playPosition, playLength)

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
        const newLoop = {...loop, on: !loop.on, selection: false}
        dispatch(daw.setLoop(newLoop))
        player.setLoop(newLoop)
    }

    const shareScriptLink = `${SITE_BASE_URI}?sharing=${useSelector(appState.selectEmbeddedShareID)}`

    const [volume, setVolume] = useState(0)  // in dB
    const [volumeMuted, setVolumeMuted] = useState(false)
    const minVolume = -20

    const mute = (value) => {
        setVolumeMuted(value)
        player.setVolume(value ? -60 : volume)
    }

    const changeVolume = (value) => {
        setVolume(value)
        if (value == minVolume) {
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

    const [title, setTitle] = useState(null)

    const el = useRef()

    // Update title/icon display whenever element size changes.
    const observer = new ResizeObserver(entries => {
        const width = entries[0].contentRect.width
        const short = "DAW"
        const long = "DIGITAL AUDIO WORKSTATION"
        if (embedMode) {
            setTitle(short)
        } else if (width > 570) {
            setTitle(long)
        } else if (width > 390) {
            setTitle(short)
        } else {
            setTitle(null)
        }
    })

    useEffect(() => {
        el.current && observer.observe(el.current)
        return () => el.current && observer.unobserve(el.current)
    }, [el])

    return <div ref={el} id="dawHeader" className="flex-grow-0">
        {/* TODO: don't use bootstrap classes */}
        {/* DAW Label */}
        <div className="btn-group" id="daw-label">
            <span className="panel-label">
                {title
                && <span className="font-semibold">{title}</span>}
            </span>
        </div>
        {embedMode && <div>
            <a target="_blank" href={shareScriptLink}> Click Here to view in EarSketch </a>
        </div>}
        {/* Transport Buttons */}
        <div className="daw-transport-container">
            {/* Beginning */}
            <span className="daw-transport-button">
                <button type="submit" className="btn btn-clear" data-toggle="tooltip" data-placement="bottom" title="Reset" onClick={reset}>
                    <span className="icon icon-first"></span>
                </button>
            </span>

            <span id="daw-play-button" uib-popover-html="getPopoverContent('play')" popover-placement="bottom" popover-is-open="showDAWKeyShortcuts" popover-animation="true" popover-trigger="'none'">
                {/* Play */}
                {!playing && <span className="daw-transport-button">
                    <button type="submit" className={"btn btn-play btn-clear" + (needCompile ? " flashButton" : "")} title="Play" onClick={play}>
                        <span className="icon icon-play4"></span>
                    </button>
                </span>}

                {/* Pause */}
                {playing && <span className="daw-transport-button">
                    <button type="submit" className="btn btn-clear" title="Pause" onClick={pause}>
                        <span className="icon icon-pause2"></span>
                    </button>
                </span>}
            </span>

            {/* Loop */}
            <span className="daw-transport-button">
                <button type="submit" className={"btn btn-clear" + (loop.on ? " btn-clear-warning" : "")} data-toggle="tooltip" data-placement="bottom" title="Loop Project" onClick={toggleLoop}>
                    <span className="icon icon-loop"></span>
                </button>
            </span>

            {/* Follow through 
                NOTE: In Angular implementation, this was conditional on `horzOverflow`, but it was 'always on for now'.
                Hence, I have simply made it unconditional here. */}
            <span className="daw-transport-button follow-icon">
                <button type="submit" className={"btn btn-clear" + (autoScroll ? " btn-clear-warning" : "")} data-toggle="tooltip" data-placement="bottom" title="Auto-scroll to follow the playback" onClick={() => dispatch(daw.setAutoScroll(!autoScroll))}>
                    <span className="icon icon-move-up"></span>
                </button>
            </span>

            {/* Metronome */}
            <span className="daw-transport-button">
                <button id="dawMetronomeButton" className={"btn btn-clear" + (metronome ? " btn-clear-warning" : "")} data-toggle="tooltip" title="Toggle Metronome" data-placement="bottom" onClick={toggleMetronome}>
                    <span className="icon icon-meter3"></span>
                </button>
            </span>

            {/* Volume Control */}
            <span className="daw-transport-button" id="volume-control">
                <span onClick={() => mute(!volumeMuted)}>
                    <button id="muteButton" className="btn btn-clear" style={{width: "40px"}} title="Toggle Volume" data-toggle="tooltip" data-placement="bottom">
                        <span className={"icon icon-volume-" + (volumeMuted ? "mute" : "high")}></span>
                    </button>
                </span>
                <span className="daw-transport-button">
                    <input id="dawVolumeSlider" type="range" min={minVolume} max="0" value={volumeMuted ? minVolume : volume} onChange={e => changeVolume(e.target.value)} />
                </span>
            </span>
        </div>
    </div>
}

const Track = ({ color, mute, soloMute, toggleSoloMute, bypass, toggleBypass, track, xScroll }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)

    return <div style={{width: X_OFFSET + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: trackHeight + 'px'}}>
            <div className="dawTrackCtrl" style={{left: xScroll + 'px'}}>
                <div className="dawTrackName prevent-selection">{track.label}</div>
                {track.buttons &&
                <>
                    <button className={"btn btn-default btn-xs dawSoloButton" + (soloMute === "solo" ? " active" : "")} onClick={() => toggleSoloMute("solo")} title="Solo">S</button>
                    <button className={"btn btn-default btn-xs dawMuteButton" + (soloMute === "mute" ? " active" : "")} onClick={() => toggleSoloMute("mute")} title="Mute">M</button>
                </>}
            </div>
            <div className={`daw-track ${mute ? "mute" : ""}`}>
                {track.clips.map((clip, index) => <Clip key={index} color={color} clip={clip} />)}
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, effect], index) => 
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            <div className="dawEffectCtrl" style={{left: xScroll + 'px'}}>
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (bypass.includes(key) ? ' active' : '')} onClick={() => toggleBypass(key)} disabled={mute}>
                    Bypass
                </button>
            </div>
            <Effect color={color} name={key} effect={effect} bypass={bypass.includes(key)} mute={mute} />
        </div>)}
    </div>
}


const drawWaveform = (element, waveform, width, height) => {
    var cvs = d3.select(element).select('canvas')
        .attr('width', width)
        .attr('height', height)

    var interval = width / waveform.length
    var pos = 0
    var zero = height / 2
    var magScaled = 0

    var ctx = cvs.node().getContext('2d')
    ctx.strokeStyle = '#427EB0'
    ctx.fillStyle = "#181818"
    ctx.lineWidth = interval > 1 ? interval * 0.9 : interval // give some space between bins
    ctx.beginPath()
    for (var i = 0; i < waveform.length; i++) {
        pos = i * interval + 0.5 // pixel offset needed to avoid canvas blurriness
        // TODO: include this scaling in the preprocessing if possible
        magScaled = waveform[i] * height / 2
        ctx.moveTo(pos, zero + magScaled)
        ctx.lineTo(pos, zero - magScaled)
    }
    ctx.stroke()
    ctx.closePath()
}

const Clip = ({ color, clip }) => {
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    // Minimum width prevents clips from vanishing on zoom out.
    const width = Math.max(xScale(clip.end - clip.start + 1), 2)
    const offset = xScale(clip.measure)
    const element = useRef()

    useEffect(() => {
        if (WaveformCache.checkIfExists(clip)) {
            const waveform = WaveformCache.get(clip)
            drawWaveform(element.current, waveform, width, trackHeight)
        }
    }, [clip, xScale, trackHeight])

    return <div ref={element} className={clip.loopChild ? 'loop' : ''} className="dawAudioClipContainer" style={{background: color, width: width + 'px', left: offset + 'px'}}>
        <div className="clipWrapper">
            <div style={{width: width + 'px'}} className="clipName prevent-selection">{clip.filekey}</div>
            <canvas></canvas>
        </div>
    </div>
}

const Effect = ({ name, color, effect, bypass, mute }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const element = useRef()

    // helper function to build a d3 plot of the effect
    const drawEffectWaveform = () => {
        const points = []

        // scope.effect = { 0: segment1, 1: segment2, etc., visible, bypass }
        // TODO: hacky and will probably introduce bugs
        const fxSegmentIdx = Object.keys(effect).filter(v => !isNaN(parseInt(v)))

        fxSegmentIdx.forEach(v => {
            const range = effect[v]
            points.push({x: range.startMeasure, y: range.inputStartValue})
            points.push({x: range.endMeasure, y: range.inputEndValue})
        })

        // draw a line to the end
        points.push({x: playLength + 1, y: points[points.length - 1].y})

        const defaults = applyEffects.effectDefaults[effect[0].name][effect[0].parameter]

        const x = d3.scale.linear()
            .domain([1, playLength + 1])
            .range([0, xScale(playLength + 1)])
        const y = d3.scale.linear()
            .domain([defaults.min, defaults.max])
            .range([trackHeight - 5, 5])

        // map (x,y) pairs into a line
        const line = d3.svg.line().interpolate("linear").x(d => x(d.x)).y(d => y(d.y))

        return line(points)
    }

    useEffect(() => {
        // update SVG waveform
        d3.select(element.current)
          .select("svg.effectSvg")
          .select("path")
          .attr("d", drawEffectWaveform())
    })

    useEffect(() => {
        // update SVG waveform
        d3.select(element.current)
          .select("svg.effectSvg")
          .select("path")
          .attr("d", drawEffectWaveform())

        const parameter = applyEffects.effectDefaults[effect[0].name][effect[0].parameter]

        const yScale = d3.scale.linear()
            .domain([parameter.max, parameter.min])
            .range([0, trackHeight])

        const axis = d3.svg.axis()
            .scale(yScale)
            .orient('right')
            .tickValues([parameter.max, parameter.min])
            .tickFormat(d3.format("1.1f"))

        d3.select(element.current).select('svg.effectAxis g')
          .call(axis)
          .select('text').attr('transform', 'translate(0,10)')

        // move the bottom label with this atrocious mess
        d3.select(d3.select(element.current).select('svg.effectAxis g')
          .selectAll('text')[0][1]).attr('transform', 'translate(0,-10)')
    })

    return <div ref={element} className={"dawTrackEffect" + (bypass || mute ? ' bypassed' : '')} style={{background: color, width: xScale(playLength) + 'px'}}>
        <div className="clipName">{name}</div>
        <svg className="effectAxis">
            <g></g>
        </svg>
        <svg className="effectSvg">
            <path></path>
        </svg>
    </div>
}

const MixTrack = ({ color, bypass, toggleBypass, track, xScroll }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const mixTrackHeight = useSelector(daw.selectMixTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)
    const trackWidth = useSelector(daw.selectTrackWidth)
    const hideMixTrackLabel = trackWidth < 950

    return <div style={{width: X_OFFSET + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: mixTrackHeight + 'px'}}>
            <div className="dawTrackCtrl" style={{left: xScroll + 'px'}}>
                <div className="mixTrackFiller">{track.label}</div>
            </div>
            <div className="daw-track">
                <div className="mixTrackFiller" style={{background: color}}>{!hideMixTrackLabel && <span>MIX TRACK</span>}</div>
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, effect], index) => 
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            <div className="dawEffectCtrl" style={{left: xScroll + 'px'}}>
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (bypass.includes(key) ? " active" : "")} onClick={() => toggleBypass(key)}>
                    Bypass
                </button>
            </div>
            <Effect color={color} name={key} effect={effect} bypass={bypass.includes(key)} mute={false} />
        </div>)}
    </div>
}

const Cursor = ({ position }) => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    return pendingPosition === null && <div className="daw-cursor" style={{left: position + 'px'}}></div>
}

const Playhead = ({ playPosition }) => {
    const xScale = useSelector(daw.selectXScale)
    return <div className="daw-marker" style={{left: xScale(playPosition) + 'px'}}></div>
}

const SchedPlayhead = () => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    const xScale = useSelector(daw.selectXScale)
    return pendingPosition !== null && <div className="daw-sched-marker" style={{left: xScale(pendingPosition)}}></div>
}

const Measureline = () => {
    const xScale = useSelector(daw.selectXScale)
    const intervals = useSelector(daw.selectMeasurelineZoomIntervals)
    const playLength = useSelector(daw.selectPlayLength)
    const element = useRef()

    useEffect(() => {
        let n = 1

        // create d3 axis
        const measureline = d3.svg.axis()
            .scale(xScale) // scale ticks according to zoom
            .orient("bottom")
            .tickValues(d3.range(1, playLength + 1, intervals.tickInterval))
            .tickSize(15)
            .tickFormat(d => {
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
                return ''
            })

        // append axis to timeline dom element
        d3.select(element.current).select('svg.axis g')
            .call(measureline)
            .selectAll("text")
            // move the first text element to fit inside the view
            .style("text-anchor", "start")
            .attr('y', 2)
            .attr('x', 3)

        if (intervals.tickDivision > 1) {
            let n = 1
            d3.select(element.current).selectAll('svg .tick')
                .filter(d => {
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
                .select('line')
                .attr('y1', 8)
                .attr('y2', 15)

        } else {
            d3.select(element.current).selectAll('svg .tick')
                .filter(d => d % 1 !== 0)
                .select('line')
                .attr('y1', 8)
                .attr('y2', 15)

            d3.select(element.current).selectAll('svg .tick')
                .filter(d => d % 1 === 0)
                .select('line')
                .attr('y1', 0)
                .attr('y2', 15)
        }
    })

    return <div ref={element} id="daw-measureline" className="relative" style={{width: X_OFFSET + xScale(playLength + 1) + 'px', top: '-1px'}}>
        <svg className="axis">
            <g></g>
        </svg>
    </div>
}

const Timeline = () => {
    const xScale = useSelector(daw.selectXScale)
    const playLength = useSelector(daw.selectPlayLength)
    const timeScale = useSelector(daw.selectTimeScale)
    const songDuration = useSelector(daw.selectSongDuration)
    const intervals = useSelector(daw.selectTimelineZoomIntervals)
    const element = useRef()

    // redraw the timeline when the track width changes
    useEffect(() => {
        // create d3 axis
        const timeline = d3.svg.axis()
            .scale(timeScale) // scale ticks according to zoom
            .orient("bottom")
            .tickValues(d3.range(0, songDuration + 1, intervals.tickInterval))
            .tickFormat(d => (d3.time.format("%M:%S")(new Date(1970, 0, 1, 0, 0, d))))

        // append axis to timeline dom element
        d3.select(element.current).select('svg.axis g')
            .call(timeline)
            .selectAll("text")
            // move the first text element to fit inside the view
            .style("text-anchor", "start")
            .attr('y', 6)
            .attr('x', 2)
    })

    return <div ref={element} id="daw-timeline" className="relative" style={{width: X_OFFSET + xScale(playLength + 1) + 'px'}}>
        <svg className="axis">
            <g></g>
        </svg>
    </div>
}


// Pulled in via angular dependencies
let WaveformCache, ESUtils, applyEffects, player, $rootScope

const rms = (array) => {
    return Math.sqrt(array.map(v => v**2).reduce((a, b) => a + b) / array.length)
}

const prepareWaveforms = (tracks, tempo) => {
    esconsole('preparing a waveform to draw', 'daw');

    // ignore the mix track (0) and metronome track (len-1)
    for (var i = 1; i < tracks.length - 1; i++) {
        tracks[i].clips.forEach(clip => {
            if (!WaveformCache.checkIfExists(clip)) {
                const waveform = clip.audio.getChannelData(0)

                // uncut clip duration
                const wfDurInMeasure = ESUtils.timeToMeasure(clip.audio.duration, tempo)

                // clip start in samples
                const sfStart = (clip.start-1) / wfDurInMeasure  * waveform.length
                const sfEnd = (clip.end-1) / wfDurInMeasure  * waveform.length

                // suppress error when clips are overlapped
                if (sfEnd <= sfStart) {
                    return null
                }

                // extract waveform portion actually used
                const subFrames = waveform.subarray(sfStart, sfEnd)

                const out = []
                const N = 30 // resolution; total samples to draw per measure

                // downsample to N values using block-wise RMS
                const outNumSamps = (clip.end-clip.start) * N
                for (let i = 0; i < outNumSamps; i++) {
                    const blStart = i/outNumSamps * subFrames.length
                    const blEnd = (i+1)/outNumSamps * subFrames.length
                    out[i] = rms(subFrames.subarray(blStart, blEnd))
                }

                // check: makebeat need special loop treatment or not???
                WaveformCache.add(clip, out)
            }
        })
    }
}

let reset = true
// TODO: Temporary hack:
let _setPlayPosition

let setupDone = false
const setup = (dispatch, getState) => {
    if (setupDone) return
    setupDone = true

    const $scope = helpers.getNgController('ideController').scope()
    // TODO: remember which tab we came from, so if the user switches back and forth without re-running, we don't forget everything.
    // Holding off for the moment because tabs are getting moved to React/Redux.
    $scope.$on('swapTab', function () {
        console.log("TODO: swapTab")
        reset = true
        // Set a dirty flag for next run.
        // Don't need this to change anything yet, so it's outside of the store.
    })

    // everything in here gets reset when a new project is loaded
    // Listen for the IDE to compile code and return a JSON result
    $scope.$watch('compiled', function (result) {
        const state = getState()
        // console.log("compiled result:", result)
        if (result === null || result === undefined) return

        esconsole('code compiled', 'daw')
        prepareWaveforms(result.tracks, result.tempo)

        dispatch(daw.setTempo(result.tempo))

        const playLength = result.length + 1
        dispatch(daw.setPlayLength(playLength))

        const tracks = []
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
        const metronome = tracks[tracks.length-1]

        if (mix !== undefined) {
            mix.visible = Object.keys(mix.effects).length > 0
            mix.mute = false
            // the mix track is special
            mix.label = 'MIX'
            mix.buttons = false
        }
        if (metronome !== undefined) {
            metronome.visible = false
            metronome.mute = !state.daw.metronome
            metronome.effects = {}
        }

        // Without copying clips above, this dispatch somehow freezes all of the clips, which breaks player.

        // result.tracks.forEach((track, index) => {
        //     console.log("frozen conspiracy before: track", index)
        //     track.clips.forEach((clip, index) => {
        //         console.log("clip", index, Object.isExtensible(clip))
        //     })
        // })

        dispatch(daw.setTracks(tracks))

        // result.tracks.forEach((track, index) => {
        //     console.log("frozen conspiracy after: track", index)
        //     track.clips.forEach((clip, index) => {
        //         console.log("clip", index, Object.isExtensible(clip))
        //     })
        // })

        if (reset) {
            dispatch(daw.setMetronome(false))
            dispatch(daw.setShowEffects(true))
            dispatch(daw.setPlaying(false))
            _setPlayPosition(1)
            dispatch(daw.shuffleTrackColors())
            dispatch(daw.setSoloMute({}))
            dispatch(daw.setBypass({}))
        }

        // Reset the dirty flag.
        reset = false

        player.setRenderingData(result)
        player.setMutedTracks(daw.selectMuted(state))
        player.setBypassedEffects(daw.selectBypass(state))

        if (_result === null) {
            // First run only: set zoom based on play length.
            const level = daw.selectZoomLevel(state)
            if (level) {
                dispatch(daw.setTrackWidth(level.zoomLevel))
            }
        }

        // sanity checks
        const newLoop = Object.assign({}, state.daw.loop)
        if (state.daw.loop.start > playLength) {
            newLoop.start = 1
        }
        if (state.daw.loop.end > playLength) {
            newLoop.end = playLength
        }
        dispatch(daw.setLoop(newLoop))

        _result = result
    })
}

const DAW = () => {
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

    const zoomX = (steps) => {
        dispatch(daw.setTrackWidth(Math.min(Math.max(650, trackWidth + steps * 100), 50000)))
    }
    const zoomY = (steps) => {
        dispatch(daw.setTrackHeight(Math.min(Math.max(25, trackHeight + steps * 10), 125)))
    }

    const [xScroll, setXScroll] = useState(0)
    const [yScroll, setYScroll] = useState(0)
    const el = useRef()

    const toggleBypass = (trackIndex, effectKey) => {
        let effects = bypass[trackIndex] ?? []
        if (effects.includes(effectKey)) {
            effects = effects.filter(k => k !== effectKey)
        } else {
            effects = [effectKey, ...effects]
        }
        const updated = {...bypass, [trackIndex]: effects}
        dispatch(daw.setBypass(updated))
        player.setBypassedEffects(updated)
    }

    const toggleSoloMute = (trackIndex, kind) => {
        const updated = {...soloMute, [trackIndex]: soloMute[trackIndex] === kind ? undefined : kind}
        dispatch(daw.setSoloMute(updated))
        player.setMutedTracks(daw.getMuted(tracks, updated, metronome))
    }

    const [dragStart, setDragStart] = useState(null)

    const _loop = useSelector(daw.selectLoop)
    // We have local loop state which is modified while the user sets the loop selection.
    const [loop, setLoop] = useState(_loop)
    // It is synchronized with the loop state in the Redux store when the latter is updated (e.g. on mouse up):
    useEffect(() => setLoop(_loop), [_loop])

    const onMouseDown = (event) => {
        // calculate x position of the bar from mouse position
        let x = event.clientX - event.currentTarget.firstChild.getBoundingClientRect().left
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
            setLoop({...loop, reset: loop.on, start: measure, end: measure})
        }
    }

    const onMouseUp = (event) => {
        if (dragStart === null) {
            return
        }

        // calculate x position of the bar from mouse position
        let x = event.clientX - event.currentTarget.firstChild.getBoundingClientRect().left
        if (event.currentTarget.className !== "daw-track") {
            x -= X_OFFSET
        }
        // round to nearest measure
        const measure = Math.round(xScale.invert(x))

        // Clamp to valid range.
        if (measure > playLength) {
            measure = playLength
        }

        setDragStart(null)

        let newLoop;
        if (loop.start === loop.end) {
            // turn looping off if the loop range is 0 (i.e., no drag)
            newLoop = {...loop, selection: false, on: loop.reset}
        } else {
            newLoop = {...loop, selection: true, on: true}
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

    const onMouseMove = (event) => {
        // calculate x position of the bar from mouse position
        let x = event.clientX - event.currentTarget.firstChild.getBoundingClientRect().left
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
            setLoop({...loop, selection: true, start: dragStart, end: measure})
        } else if (measure < dragStart) {
            setLoop({...loop, selection: true, start: measure, end: dragStart})
        } else {
            setLoop({...loop, selection: false, start: measure, end: measure})
        }
    }

    const onKeyDown = (event) => {
        if (event.key === "+" || event.key === "=") {
            zoomX(1)
        } else if (event.key === "-") {
            zoomX(-1)
        }
    }

    const onWheel = (event) => {
        event.preventDefault()
        if (event.ctrlKey) {
            zoomY(-event.deltaY)
        } else {
            zoomX(-event.deltaY)
        }
    }

    // This is regrettably necessary for reasons describe here: https://github.com/facebook/react/issues/14856
    useEffect(() => {
        if (!el.current) return
        el.current.addEventListener('wheel', onWheel)
        return () => { if (el.current) el.current.removeEventListener('wheel', onWheel) }
    }, [onWheel])

    // Keep triggering an action while the mouse button is held.
    const repeatClick = (action, interval=125) => {
        let timer = useRef()
        const down = () => {
            timer.current = setInterval(action, interval)
            action()
        }
        const up = () => {
            clearInterval(timer.current)
        }
        return [down, up]
    }

    // A bit hacky; this allows the interval to continue working after a re-render.
    const zoomXRef = useRef(), zoomYRef = useRef()
    zoomXRef.current = zoomX
    zoomYRef.current = zoomY

    const [zoomInXMouseDown, zoomInXMouseUp] = repeatClick(() => zoomXRef.current(2))
    const [zoomInYMouseDown, zoomInYMouseUp] = repeatClick(() => zoomYRef.current(1))
    const [zoomOutXMouseDown, zoomOutXMouseUp] = repeatClick(() => zoomXRef.current(-2))
    const [zoomOutYMouseDown, zoomOutYMouseUp] = repeatClick(() => zoomYRef.current(-1))

    const autoScroll = useSelector(daw.selectAutoScroll)
    const xScrollEl = useRef()

    // It's important that updating the play position and scrolling happen at the same time to avoid visual jitter.
    // (e.g. *first* the cursor moves, *then* the scroll catches up - looks flickery.)
    const updatePlayPositionAndScroll = () => {
        const position = player.getCurrentPosition()
        console.log("playPosition", position)
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
        if (autoScroll && (xScale(position) - xScroll) > (el.current.clientWidth-115)/2) {
            const fracX = (xScale(position) - (el.current.clientWidth-115)/2) / (el.current.scrollWidth - el.current.clientWidth)
            xScrollEl.current.scrollLeft = fracX * (xScrollEl.current.scrollWidth - xScrollEl.current.clientWidth)
        }
    }

    useEffect(() => {
        if (playing) {
            const interval = setInterval(updatePlayPositionAndScroll, 60)
            return () => clearInterval(interval)
        }
    }, [playing, xScale, autoScroll])

    return <div className="flex flex-col w-full h-full relative overflow-hidden">
        {hideEditor &&
        <div style={{display: "block"}} className="embedded-script-info"> Script {embeddedScriptName} by {embeddedScriptUsername}</div>}
        <Header playPosition={playPosition} setPlayPosition={setPlayPosition}></Header>

        {_result && !hideDAW &&
        <div id="zoom-container" className="flex-grow relative w-full h-full flex flex-col overflow-x-auto overflow-y-hidden">
            {/* Effects Toggle */}
            <button className="btn-primary btn-effect flex items-center justify-center" title="Toggle All Effects"
                    onClick={() => dispatch(daw.toggleEffects())} disabled={!hasEffects}>
                <span>EFFECTS</span>
                <span className={"icon icon-eye" + (showEffects ? "" : "-blocked")}></span>
            </button>

            <div className="flex-grow flex h-full relative">
                {/* DAW Container */}
                <div ref={el} className="flex-grow overflow-hidden" id="daw-container" tabIndex={0}
                     onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onKeyDown={onKeyDown}>
                    <div className="relative">
                        <div id="daw-clickable" style={{position: 'relative', top: yScroll + 'px'}}>
                            {/* Timescales */}
                            <Timeline />
                            <Measureline />
                        </div>

                        <div className="daw-track-group-container">
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
                            })}
                        </div>

                        <div className="absolute left-0 h-full" style={{top: yScroll + 'px'}}>
                            <Playhead playPosition={playPosition} />
                            <SchedPlayhead />
                            <Cursor position={cursorPosition} />
                            {(dragStart !== null || loop.selection && loop.on) && loop.end != loop.start &&
                            <div className="daw-highlight" style={{width: xScale(Math.abs(loop.end - loop.start) + 1) + 'px', 'left': xScale(Math.min(loop.start, loop.end))}} />}
                        </div>
                    </div>
                </div>

                <div className="absolute overflow-y-scroll" style={{width: "15px", top: "32px", right: "1px", bottom: "40px"}}
                     onScroll={e => {
                         const fracY = e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight)
                         el.current.scrollTop = fracY * (el.current.scrollHeight - el.current.clientHeight)
                         setYScroll(el.current.scrollTop)
                    }}>
                    <div style={{width: "1px", height: `max(${totalTrackHeight}px, 100.5%)`}}></div>
                </div>

                <div ref={xScrollEl} className="absolute overflow-x-scroll" style={{height: "15px", left: "100px", right: "45px", bottom: "1px"}}
                     onScroll={e => {
                         const fracX = e.target.scrollLeft / (e.target.scrollWidth - e.target.clientWidth)
                         el.current.scrollLeft = fracX * (el.current.scrollWidth - el.current.clientWidth)
                         setXScroll(el.current.scrollLeft)
                    }}>
                    <div style={{width: `max(${xScale(playLength + 1)}px, 100.5%)`, height: "1px"}}></div>
                </div>

                <div id="horz-zoom-slider-container" className="flex flex-row flex-grow-0 absolute pr-5">
                    <button onMouseDown={zoomInXMouseDown} onMouseUp={zoomInXMouseUp} className="zoom-in pr-2 leading-none"><i className="icon-plus2 text-sm"></i></button>
                    <button onMouseDown={zoomOutXMouseDown} onMouseUp={zoomOutXMouseUp} className="zoom-out pr-2 leading-none"><i className="icon-minus text-sm"></i></button>
                </div>

                <div id="vert-zoom-slider-container" className="flex flex-col flex-grow-0 absolute pb-5">
                    <button onMouseDown={zoomInYMouseDown} onMouseUp={zoomInYMouseUp} className="zoom-in leading-none"><i className="icon-plus2 text-sm"></i></button>
                    <button onMouseDown={zoomOutYMouseDown} onMouseUp={zoomOutYMouseUp} className="zoom-out leading-none"><i className="icon-minus text-sm"></i></button>
                </div>
            </div>
        </div>}
    </div>
}

const HotDAW = hot(props => {
    WaveformCache = props.WaveformCache
    ESUtils = props.ESUtils
    applyEffects = props.applyEffects
    player = props.player
    $rootScope = props.$rootScope
    setup(props.$ngRedux.dispatch, props.$ngRedux.getState)
    return (
        <Provider store={props.$ngRedux}>
            <DAW />
        </Provider>
    );
});

app.component('reactdaw', react2angular(HotDAW, null, ['$ngRedux', 'ESUtils', 'WaveformCache', 'applyEffects', 'player', '$rootScope']))