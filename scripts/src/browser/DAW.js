import React, { useEffect, useState, useRef } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'

import * as daw from './dawState'

import { setReady } from '../bubble/bubbleState'
import * as helpers from "../helpers"

// Width of track control box
const X_OFFSET = 100

// TODO
const vertScrollPos = 0
const horzScrollPos = 0
const isEmbedded = false
const todo = (...args) => undefined // console.log("TODO", args)
const loop = {on: false, selection: null, start: null, end: null}

const Header = () => {
    const dispatch = useDispatch()
    const playPosition = useSelector(daw.selectPlayPosition)
    const playLength = useSelector(daw.selectPlayLength)
    const bubble = useSelector(state => state.bubble)
    const playing = useSelector(daw.selectPlaying)

    // TODO:
    const playbackStartedCallback = (...args) => console.log("playback started", args)

    const play = () => {
        if (bubble.active && bubble.currentPage === 4 && !bubble.readyToProceed) {
            dispatch(setReady(true))
        }

        // if ($scope.trackIsembeddedAndUncompiled) {
        //     $rootScope.$broadcast('compileembeddedTrack', true);
        //     $(".btn-play").removeClass("flashButton");
        //     $scope.trackIsembeddedAndUncompiled = false;
        //     return;
        // }

        // drawPlayhead(false)

        if (playPosition >= playLength) {
        //  if ($scope.loop.selection) {
        //      $scope.playPosition = $scope.loop.start
        //  } else {
            dispatch(daw.setPlayPosition(1))
        //  }
        }

        // Should this get set in playbackStartedCallback, instead?
        dispatch(daw.setPlaying(true))

        // TODO: Seems like these should be unnecessary given that they're set upon compile...
        // ...except player calls player.reset() on finish. :-(
        // player.setRenderingData($scope.result)
        // player.setMutedTracks($scope.tracks)
        // player.setBypassedEffects($scope.tracks)
        player.setOnStartedCallback(playbackStartedCallback)
        player.setOnFinishedCallback(() => dispatch(daw.setPlaying(false)))
        console.log("play", playPosition)
        player.play(playPosition, playLength)

        // volume state is not preserved between plays
        // if ($scope.volumeMuted) {
        //     $scope.mute()
        // } else {
        //     $scope.changeVolume()
        // }
    }

    const pause = () => {
        console.log("pause", playPosition)
        player.pause()
        dispatch(daw.setPlaying(false))
    }

    // TODO
    const showIcon = true
    const showFullTitle = true
    const showShortTitle = false
    const shareScriptLink = "TODO"
    const horzOverflow = false
    let autoScroll = true
    const timesync = {available: true}
    const timesyncEnabled = true
    const metronome = {mute: true}
    const volumeMuted = false
    const volume = 0

    const reset = todo
    const toggleLoop = todo
    const toggleMute = todo
    const changeVolume = todo
    const toggleMetronome = todo
    const toggleTimesync = todo

    return <div id="dawHeader" className="flex-grow-0"> {/* widthExceeded directive */}
        {/* TODO: don't use bootstrap classes */}
        {/* DAW Label */}
        <div className="btn-group" id="daw-label">
            <span className="panel-label">{showIcon && <span className="icon icon-DAW-Icon"></span>}{showFullTitle && <span>Digital Audio Workstation</span>}{showShortTitle && <span>DAW</span>}</span>
        </div>
        {isEmbedded && <div>
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
                <button type="submit" className="btn btn-play btn-clear" title="Play" onClick={play}>
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

        {/* Follow through */}
        {horzOverflow && <span className="daw-transport-button follow-icon">
            <button type="submit" className={"btn btn-clear" + (autoScroll ? " btn-clear-warning" : "")} data-toggle="tooltip" data-placement="bottom" title="Auto-scroll to follow the playback" onClick={() => autoScroll = !autoScroll}>
                <span className="icon icon-move-up"></span>
            </button>
        </span>}

        {/* Metronome */}
        <span className="daw-transport-button">
            <button id="dawMetronomeButton" className={"btn btn-clear" + (!metronome.mute ? " btn-clear-warning" : "")} data-toggle="tooltip" title="Toggle Metronome" data-placement="bottom" onClick={toggleMetronome}>
                <span className="icon icon-meter3"></span>
            </button>
        </span>

        {/* Time Sync */}
        {timesync.available &&
        <span className="daw-transport-button">
            <button id="dawTimesyncButton" className={"btn btn-clear" + (timesyncEnabled ? " btn-clear-warning" : "")} data-toggle="tooltip" title="Play together" data-placement="bottom" onClick={toggleTimesync}>
                <span className="icon icon-link"></span>
            </button>
        </span>}

        {/* Volume Control */}
        <span className="daw-transport-button" id="volume-control">
            <span onClick={toggleMute}>
                <button id="muteButton" className="btn btn-clear" style={{width: "40px"}} title="Toggle Volume" data-toggle="tooltip" data-placement="bottom">
                    <span className={"icon icon-volume-" + (volumeMuted ? "mute" : "high")}></span>
                </button>
            </span>
            <span className="daw-transport-button">
                <input id="dawVolumeSlider" type="range" min="-20" max="0" value={volume} onChange={changeVolume} />
            </span>
        </span>
        </div>
    </div>
}

const Track = ({ color, track }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)
    // TODO
    const toggleBypass = todo
    const toggleSolo = todo
    const toggleMute = todo
    const startDrag = todo, endDrag = todo, drag = todo

    // $scope.toggleSolo = function () {
    //     var temp = $scope.metronome.mute;

    //     if (!$scope.track.solo) {
    //         // solo
    //         for (var i in $scope.tracks) {
    //             if ($scope.tracks.hasOwnProperty(i)) {
    //                 // TODO: why is this a string...?
    //                 i = parseInt(i);
    //                 // mute tracks that are not soloed
    //                 if (!$scope.tracks[i].solo) {
    //                     $scope.muteTrack(i);
    //                 }
    //             }
    //         }
    //         // unmute and solo this track
    //         $scope.unmuteTrack($scope.trackNum);
    //         $scope.soloTrack($scope.trackNum)
    //     } else {
    //         // unsolo

    //         $scope.unsoloTrack($scope.trackNum);

    //         if ($scope.hasSoloTracks()) {
    //             $scope.muteTrack($scope.trackNum);
    //         } else {
    //             for (var i in $scope.tracks) {
    //                 if ($scope.tracks.hasOwnProperty(i)) {
    //                     // TODO: why is this a string...?
    //                     i = parseInt(i);
    //                     $scope.unmuteTrack(i);
    //                 }
    //             }
    //         }

    //     }

    //     // mix and metronome are unaffected
    //     $scope.mix.mute = false;
    //     $scope.metronome.mute = temp;
    //     player.setMutedTracks($scope.tracks);
    // };

    // $scope.toggleMute = function () {
    //     var temp = $scope.metronome.mute;
        
    //     if ($scope.track.mute) {
    //         $scope.unmuteTrack($scope.trackNum);
    //     } else {
    //         $scope.muteTrack($scope.trackNum);

    //         if ($scope.track.solo) {
    //             $scope.unsoloTrack($scope.trackNum);
    //         }
    //     }

    //     // mix and metronome are unaffected
    //     $scope.mix.mute = false;
    //     $scope.metronome.mute = temp;
    //     player.setMutedTracks($scope.tracks);
    // }

    return <div style={{width: X_OFFSET + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: trackHeight + 'px'}}>
            {/* <!-- <div class="dawTrackCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div className="dawTrackCtrl" style={{left: horzScrollPos + 'px'}}>
                <div className="dawTrackName prevent-selection">{track.label}</div>
                {track.buttons &&
                <>
                    <button className={"btn btn-default btn-xs dawSoloButton" + (track.solo ? " active" : "")} onClick={toggleSolo} title="Solo">S</button>
                    <button className={"btn btn-default btn-xs dawMuteButton" + (track.mute ? " active" : "")} onClick={toggleMute} title="Mute">M</button>
                </>}
            </div>
            <div className={`daw-track ${track.mute ? 'muted' : ''} ${track.solo ? 'solo' : ''}`} /*onMouseDown={startDrag} onMouseUp={endDrag} onMouseMove={drag}*/>
                {track.clips.map((clip, index) => <Clip key={index} color={color} clip={clip} />)}
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, effect], index) => 
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            <div className="dawEffectCtrl" style={{left: horzScrollPos + 'px'}}>
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (effect.bypass ? ' active' : '')} onClick={toggleBypass} disabled={track.mute}>
                    Bypass
                </button>
            </div>
            <Effect color={color} name={key} effect={effect} mute={track.mute} />
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
    const width = xScale(clip.end - clip.start + 1)
    const offset = xScale(clip.measure)
    const element = useRef()

    useEffect(() => {
        if (WaveformCache.checkIfExists(clip)) {
            const waveform = WaveformCache.get(clip)
            drawWaveform(element.current, waveform, width, trackHeight)
        }
    }, [clip, trackHeight])

    return <div ref={element} className={clip.loopChild ? 'loop' : ''} className="dawAudioClipContainer" style={{background: color, width: width + 'px', left: offset + 'px'}}>
        <div className="clipWrapper">
            <div style={{width: width + 'px'}} className="clipName prevent-selection">{clip.filekey}</div>
            <canvas></canvas>
        </div>
    </div>
}

const Effect = ({ name, color, effect, mute }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const element = useRef()
    // TODO
    // $scope.toggleBypass = function () {
    //     var i = $scope.effect[0].track +
    //         $scope.effect[0].name +
    //         $scope.effect[0].parameter;

    //     if ($scope.effect.bypass) {
    //         $scope.effect.bypass = false;
    //         // update preservation values
    //         if ($scope.preserve.bypass.indexOf(i) >= 0) {
    //             $scope.preserve.bypass.splice(
    //                 $scope.preserve.bypass.indexOf(i)
    //                 , 1);
    //         }
    //     } else {
    //         $scope.effect.bypass = true;
    //         // update preservation values
    //         if ($scope.preserve.bypass.indexOf(i) < 0) {
    //             $scope.preserve.bypass.push(i);
    //         }
    //     }

    //     player.setBypassedEffects($scope.tracks);
    // }

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

    return <div ref={element} className={"dawTrackEffect" + (effect.bypass || mute ? ' bypassed' : '')} style={{background: color, width: xScale(playLength) + 'px'}}>
        <div className="clipName">{name}</div>
        <svg className="effectAxis">
            <g></g>
        </svg>
        <svg className="effectSvg">
            <path></path>
        </svg>
    </div>
}

const MixTrack = ({ color, track }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const mixTrackHeight = useSelector(daw.selectMixTrackHeight)
    const showEffects = useSelector(daw.selectShowEffects)
    // TODO
    const hideMasterTrackLabel = false
    const toggleBypass = todo

    return <div style={{width: X_OFFSET + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: mixTrackHeight + 'px'}}>
            {/* <!-- <div class="dawTrackCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div className="dawTrackCtrl" style={{left: horzScrollPos + 'px'}}>
                <div className="mixTrackFiller">{track.label}</div>
            </div>
            <div className="daw-track">
                <div className="mixTrackFiller" style={{background: color}}>{!hideMasterTrackLabel && <span>MIX TRACK</span>}</div>
            </div>
        </div>
        {showEffects &&
        Object.entries(track.effects).map(([key, effect], index) => 
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            <div className="dawEffectCtrl" style={{left: horzScrollPos + 'px'}}>
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (effect.bypass ? " active" : "")} onClick={toggleBypass} disabled={track.mute}>
                    Bypass
                </button>
            </div>
            <Effect color={color} name={key} effect={effect} mute={track.mute} />
        </div>)}
    </div>
}

const Cursor = ({ position }) => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    return pendingPosition === null && <div className="daw-cursor" style={{top: vertScrollPos + 'px', left: position + 'px'}}></div>
}

const Playhead = () => {
    const dispatch = useDispatch()
    const playing = useSelector(daw.selectPlaying)
    const playPosition = useSelector(daw.selectPlayPosition)
    const pendingPosition = useSelector(daw.selectPendingPosition)
    const xScale = useSelector(daw.selectXScale)
    useEffect(() => {
        if (playing) {
            // TODO: Perhaps we could make this smoother and cheaper with CSS animation?
            const interval = setInterval(() => dispatch(daw.setPlayPosition(player.getCurrentPosition())), 60)
            return () => clearInterval(interval)
        }
    }, [playing])
    return pendingPosition === null && <div className="daw-marker" style={{top: vertScrollPos + 'px', left: xScale(playPosition) + 'px'}}></div>
}

const SchedPlayhead = () => {
    const pendingPosition = useSelector(daw.selectPendingPosition)
    const xScale = useSelector(daw.selectXScale)
    return pendingPosition !== null && <div className="daw-sched-marker" style={{top: vertScrollPos + 'px', left: xScale(pendingPosition)}}></div>
}

const Slider = ({ value, onChange, options, title }) => {
    console.log("TODO", options)
    return <input type="range" min={options.floor} max={options.ceil} step={options.step} value={value} onChange={onChange} title={title} />
}

const Measureline = () => {
    const xScale = useSelector(daw.selectXScale)
    const intervals = useSelector(daw.selectMeasurelineZoomIntervals)
    const playLength = useSelector(daw.selectPlayLength)
    const element = useRef()

    useEffect(() => {
        let n = 1

        console.log("Measureline intervals", intervals)

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

    return <div ref={element} id="daw-measureline" style={{width: X_OFFSET + xScale(playLength + 1) + 'px', top: vertScrollPos + 15 + 'px'}}>
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
    console.log("songDuration", songDuration)
    console.log("Timeline intervals", intervals)

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

    return <div ref={element} id="daw-timeline" style={{width: X_OFFSET + xScale(playLength + 1) + 'px', top: vertScrollPos + 'px'}}>
        <svg className="axis">
            <g></g>
        </svg>
    </div>
}

// More directives: widthExceeded, sizeChanged, dawContainer, trackPanelPosition, trackEffectPanelPosition, dawTimeline, dawMeasureline

// Pulled in via angular dependencies
let WaveformCache, ESUtils, applyEffects, player

const rms = (array) => {
    return Math.sqrt(array.map(function (v) {
        return Math.pow(v, 2);
    }).reduce(function (a, b) { return a + b; }) / array.length);
}

const prepareWaveforms = (tracks, tempo) => {
    esconsole('preparing a waveform to draw', 'daw');

    // ignore the mix track (0) and metronome track (len-1)
    for (var i = 1; i < tracks.length - 1; i++) {
        tracks[i].clips.forEach(function (clip) {
            if (!WaveformCache.checkIfExists(clip)) {
                var waveform = clip.audio.getChannelData(0);

                // uncut clip duration
                var wfDurInMeasure = ESUtils.timeToMeasure(clip.audio.duration, tempo);

                // clip start in samples
                var sfStart = (clip.start-1) / wfDurInMeasure  * waveform.length;
                var sfEnd = (clip.end-1) / wfDurInMeasure  * waveform.length;

                // suppress error when clips are overlapped
                if (sfEnd <= sfStart) {
                    return null;
                }

                // extract waveform portion actually used
                var subFrames = waveform.subarray(sfStart, sfEnd);

                var out = [];
                var N = 30; // resolution; total samples to draw per measure

                // downsample to N values using block-wise RMS
                var outNumSamps = (clip.end-clip.start) * N;
                for (var i = 0; i < outNumSamps; i++) {
                    var blStart = i/outNumSamps * subFrames.length;
                    var blEnd = (i+1)/outNumSamps * subFrames.length;
                    out[i] = rms(subFrames.subarray(blStart, blEnd));
                }

                // check: makebeat need special loop treatment or not???

                WaveformCache.add(clip, out);
            }
        });
    }
}

let reset = true

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
        const state = getState().daw
        console.log("compiled result:", result)
        if (result === null || result === undefined) return

        esconsole('code compiled', 'daw')
        prepareWaveforms(result.tracks, result.tempo)

        dispatch(daw.setTempo(result.tempo))
        dispatch(daw.setPlayLength(result.length + 1))

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
            track.solo = reset ? false : Boolean(state.tracks[index]?.solo)
            track.mute = reset ? false : Boolean(state.tracks[index]?.mute)
            track.label = index
            track.buttons = true // show solo/mute buttons

            for (let [key, effect] of Object.entries(track.effects)) {
                effect.bypass = reset ? false : Boolean(state.tracks[index]?.effects?.[key]?.bypass)
            }
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
            metronome.mute = !state.metronome
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
            // TODO:
            // $scope.preserve.playing = false;
            // $scope.preserve.playPosition = 1;
            dispatch(daw.shuffleTrackColors())
        }

        // Reset the dirty flag.
        reset = false

        player.setRenderingData(result)
        player.setMutedTracks(tracks)
        player.setBypassedEffects(tracks)

        // TODO:
        // $scope.$on('resetScrollBars', function () {
        //     $scope.resetScrollPos();
        // });

        // if ($scope.freshPallete) {
        //     var result_ = $scope.getZoomIntervals($scope.playLength,$scope.zoomLevels);
        //     if (result_) {
        //         $scope.horzSlider.value = result_.zoomLevel;
        //         $scope.updateTrackWidth($scope.horzSlider.value);
        //     }
        //     $scope.freshPallete = false;
        // }

        // // sanity checks
        // if ($scope.loop.start > $scope.playLength) {
        //     $scope.loop.start = 1;
        // }
        // if ($scope.loop.end > $scope.playLength) {
        //     $scope.loop.end = $scope.playLength;
        // }

        // $scope.freshPallete = false;
        // $scope.$broadcast('setPanelPosition');
    });
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
    const toggleEffects = () => dispatch(daw.setShowEffects(!showEffects))

    // TODO
    const embeddedScriptName = "TODO"
    const embeddedScriptUsername = "TODO"
    const codeHidden = false
    const result = true
    const hideDaw = false
    const dragging = false
    const horzSlider = {value: 0, options: {}}
    const vertSlider = {value: 0, options: {}}

    const startDrag = todo
    const endDrag = todo

    // TODO before commit: fix sizes of clickable area/track group
    const onMouseMove = (event) => {
        event.preventDefault()
        // calculate x position of the bar from mouse position
        // TODO: remove angular here
        const target = angular.element(event.currentTarget)
        let xpos = event.clientX - target.offset().left
        if (target[0].className !== "daw-track") {
            xpos -= X_OFFSET
        }
        // round to nearest measure
        const measure = Math.round(xScale.invert(xpos))

        if (measure <= playLength && measure > 0) {
            setCursorPosition(xScale(measure))
        }

        // Prevent dragging beyond playLength
        // if (measure > $scope.playLength) {
        //     return;
        // }

        // if ($scope.dragging) {
        //     if (measure === origin) {
        //         $scope.loop.selection = false;
        //         $scope.loop.start = measure;
        //         $scope.loop.end = measure;
        //     } else {
        //         $scope.loop.selection = true;

        //         if (measure > origin) {
        //             $scope.loop.start = origin;
        //             $scope.loop.end = measure;
        //         } else if (measure < origin) {
        //             $scope.loop.start = measure;
        //             $scope.loop.end = origin;
        //         }
        //     }
        // }
    }

    return <div className="flex flex-col w-full h-full relative overflow-hidden">
        {isEmbedded && codeHidden &&
        <div style={{display: "block"}} className="embedded-script-info"> Script {embeddedScriptName} by {embeddedScriptUsername}</div>}
        <Header></Header>

        {result && !hideDaw &&
        <div id="zoom-container" className="flex-grow relative w-full h-full flex flex-col overflow-x-auto overflow-y-hidden">
            {/* Directive sizeChanged */}
            {/* Horizontal Zoom Slider */}
            <div id="horz-zoom-slider-container" className="flex-grow-0">
                <span className="zoom-out">-</span>
                <Slider value={horzSlider.value} onChange={(x) => horzSlider.value = x} options={horzSlider.options} title="Slide to zoom-in/out"/>
                <span className="zoom-in">+</span>
            </div>

            <div className="flex-grow flex overflow-auto">
                {/* Vertical Zoom Slider */}
                <div id="vert-zoom-slider-container" className="flex-grow-0 h-full">
                    <span className="zoom-out">-</span>
                    <Slider value={vertSlider.value} onChange={(x) => vertSlider.value = x} options={vertSlider.options} title="Slide to change track height"/>
                    <span className="zoom-in">+</span>
                </div>

                {/* DAW Container */}
                <div className="flex-grow" id="daw-container" onMouseDown={startDrag} onMouseUp={endDrag} onMouseMove={onMouseMove}> {/* Directive dawContainer */}
                    <div className="relative">
                        {/* Effects Toggle */}
                        <button className="btn-primary btn-effect flex items-center justify-center" title="Toggle All Effects" onClick={toggleEffects} disabled={!hasEffects}>
                            {/* Directive trackEffectPanelPosition */}
                            <span>EFFECTS</span>
                            <span className={"icon icon-eye" + (showEffects ? "" : "-blocked")}></span>
                        </button>

                        <div id="daw-clickable">
                            {/* Timescales */}
                            <Timeline />
                            <Measureline />
                        </div>

                        <div className="daw-track-group-container">
                            {tracks.map((track, index) => {
                                if (track.visible) {
                                    if (index === 0) {
                                        return <MixTrack key={index} color={trackColors[index % trackColors.length]} track={track} />
                                    } else if (index < tracks.length - 1) {
                                        return <Track key={index} color={trackColors[index % trackColors.length]} track={track} />
                                    }
                                }
                            })}
                        </div>

                        <div className="absolute top-0 left-0 h-full">
                            <Playhead />
                            <SchedPlayhead />
                            <Cursor position={cursorPosition} />
                            {(dragging || loop.selection && loop.on) && loop.end != loop.start &&
                            <div className="daw-highlight" style={{width: xScale(Math.abs(loop.end - loop.start) + 1) + 'px', top: vertScrollPos + 'px', 'left': xScale(Math.min(loop.start, loop.end))}} />}
                        </div>
                    </div>
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
    setup(props.$ngRedux.dispatch, props.$ngRedux.getState)
    return (
        <Provider store={props.$ngRedux}>
            <DAW />
        </Provider>
    );
});

app.component('reactdaw', react2angular(HotDAW, null, ['$ngRedux', 'ESUtils', 'WaveformCache', 'applyEffects', 'player']))