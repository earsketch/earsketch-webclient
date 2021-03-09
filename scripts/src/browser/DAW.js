import React, { Component, useEffect, useState, useRef } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'

import * as daw from './dawState'

import * as helpers from "../helpers";

// TODO
const isEmbedded = false
const adjustLeftPosition = 0
const todo = (...args) => console.log("TODO", args)
const loop = {on: false, selection: null, start: null, end: null}

const Header = () => {
    // TODO
    const showIcon = true
    const showFullTitle = true
    const showShortTitle = false
    const shareScriptLink = "TODO"
    const playing = false
    const horzOverflow = false
    let autoScroll = true
    const timesync = {available: true}
    const timesyncEnabled = true
    const metronome = {mute: true}
    const volumeMuted = false
    const volume = 0

    const reset = todo
    const play = todo
    const pause = todo
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
                <button type="submit" className="btn btn-clear" title="Pause" onClick={() => pause(true)}>
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
    // TODO
    const scope = {xOffset: 0}
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

    return <div style={{width: scope.xOffset + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: trackHeight + 'px'}}>
            {/* <!-- <div class="dawTrackCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div className="dawTrackCtrl" style={{left: adjustLeftPosition + 'px'}}>
                <div className="dawTrackName prevent-selection">{track.label}</div>
                {track.buttons &&
                <>
                    <button className={"btn btn-default btn-xs dawSoloButton" + (track.solo ? " active" : "")} onClick={toggleSolo} title="Solo">S</button>
                    <button className={"btn btn-default btn-xs dawMuteButton" + (track.mute ? " active" : "")} onClick={toggleMute} title="Mute">M</button>
                </>}
                {Object.keys(track.effects).length > 0 &&
                <div className="dropdown dawTrackEffectDropdown">
                    <div className="dropdown-toggle dawTrackEffectDropdownButton hidden" role="button" data-toggle="dropdown">
                        &#x25BC
                    </div>
                    <ul className="dropdown-menu" role="menu">
                        {Object.entries(track.effects).map(([key, effect]) => {
                        <li key={key} role="presentation">
                            <a href="#" onClick={() => effect.visible = !effect.visible}>{key} {effect.visible && <span>&#x2714</span>}</a>
                        </li>})}
                    </ul>
                </div>}
            </div>
            <div className={`daw-track ${track.mute ? 'muted' : ''} ${track.solo ? 'solo' : ''}`} onMouseDown={startDrag} onMouseUp={endDrag} onMouseMove={drag}>
                {track.clips.map((clip, index) => <Clip key={index} color={color} clip={clip} />)}
            </div>
        </div>
        {Object.entries(track.effects).map(([key, effect], index) => 
        effect.visible &&
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            {/* <!-- <div class="dawEffectCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div> {/* Directive: track-effect-panel-position */}
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (effect.bypass ? ' active' : '')} onClick={toggleBypass} disabled={track.mute}>
                    Bypass
                </button>
            </div>
            <div className={"dawTrackEffect" + (effect.bypass || track.mute ? ' bypassed' : '')} style={{background: color}}>
                {/* Directive: daw-effect */}
                <div className="clipName">{key}</div>
                <svg className="effectAxis">
                    <g></g>
                </svg>
                <svg className="effectSvg">
                    <path></path>
                </svg>
            </div>
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

const MixTrack = ({ color, track }) => {
    const playLength = useSelector(daw.selectPlayLength)
    const xScale = useSelector(daw.selectXScale)
    const trackHeight = useSelector(daw.selectTrackHeight)
    const mixTrackHeight = useSelector(daw.selectMixTrackHeight)
    // TODO
    const scope = {xOffset: 0}
    const hideMasterTrackLabel = false
    const toggleBypass = todo

    return <div style={{width: scope.xOffset + xScale(playLength) + 'px'}}>
        <div className="dawTrackContainer" style={{height: mixTrackHeight + 'px'}}>
            {/* <!-- <div class="dawTrackCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div className="dawTrackCtrl" style={{left: adjustLeftPosition + 'px'}}>
                <div className="mixTrackFiller">{track.label}</div>
                {Object.keys(track.effects).length > 0 &&
                <div className="dropdown dawTrackEffectDropdown">
                    <div className="dropdown-toggle dawTrackEffectDropdownButton hidden" role="button" data-toggle="dropdown">
                        &#x25BC
                    </div>
                    <ul className="dropdown-menu" role="menu">
                        {Object.entries(track.effects).map(([key, effect]) => {
                        <li key={key} role="presentation">
                            <a href="#" onClick={() => effect.visible = !effect.visible}>{key} {effect.visible && <span>&#x2714</span>}</a>
                        </li>})}
                    </ul>
                </div>}
            </div>
            <div className="daw-track">
                <div className="mixTrackFiller" style={{background: color}}>{!hideMasterTrackLabel && <span>MIX TRACK</span>}</div>
            </div>
        </div>
        {Object.entries(track.effects).map(([key, effect], index) => 
        effect.visible && 
        <div key={key} id="dawTrackEffectContainer" style={{height: trackHeight + 'px'}}>
            {/* <!-- <div class="dawEffectCtrl" ng-style="{'left': horzScrollPos + 'px'}"> --> */}
            <div> {/* Directive: track-effect-panel-position */}
                <div className="dawTrackName"></div>
                <div className="dawTrackEffectName">Effect {index+1}</div>
                <button className={"btn btn-default btn-xs dawEffectBypassButton" + (effect.bypass ? " active" : "")} onClick={toggleBypass} disabled={track.mute}>
                    Bypass
                </button>
            </div>
            <div className={"dawTrackEffect" + (effect.bypass || track.mute ? " bypassed" : "")} style={{background: color}}>
                {/* Directive: daw-effect */}
                <div className="clipName">{key}</div>
                <svg className="effectAxis">
                    <g></g>
                </svg>
                <svg className="effectSvg">
                    <path></path>
                </svg>
            </div>
        </div>)}
    </div>
}

const Highlight = ({ style }) => {
    // TODO
    // return {
    //     restrict: 'E',
    //     scope: {},
    //     link: function (scope, element) {
    //         element.addClass('daw-highlight');
    //         element.css('top', '0px');
    //     }
    // }
    return <div style={style}></div>
}

const Cursor = () => {
    // TODO
    // app.directive('dawCursor', function () {
    //     return {
    //         restrict: 'E',
    //         scope: {},
    //         link: function (scope, element) {
    //             element.addClass('daw-cursor');
    //             element.css('top', '0px');
    
    //             scope.$on('setSchedPlayheadVisibility', function (event, visible) {
    //                 if (visible) {
    //                     element.removeClass('daw-cursor');
    //                 } else {
    //                     element.addClass('daw-cursor');
    //                 }
    //             });
    
    //             scope.$on('setCurrentPosition', function (event, position) {
    //                 element.addClass('daw-cursor'); // this is safe
    //                 element.css('left', position + 'px');
    //             });
    
    //             scope.$on('adjustTopPostition', function (event, position) {
    //                 element.css('top', position + 'px');
    //             });
    //         }
    //     }
    // });
    return <div></div>
}

const Playhead = () => {
    // return {
    //     restrict: 'E',
    //     scope: {},
    //     link: function (scope, element) {
    //         element.addClass('daw-marker');
    //         element.css('top', '0px');

    //         scope.$on('adjustPlayHead', function (event, topPos) {
    //             element.css('top', topPos + 'px');
    //         });

    //         scope.$on('setPlayHeadPosition', function (event, currentPosition) {
    //             element.css('left', currentPosition + 'px');
    //         });
    //     }
    // }
    return <div></div>
}

const SchedPlayhead = () => {
    // return {
    //     restrict: 'E',
    //     scope: {},
    //     link: function (scope, element) {
    //         element.css('top', '0px');

    //         scope.$on('adjustPlayHead', function (event, topPos) {
    //             element.css('top', topPos + 'px');
    //         });

    //         scope.$on('setSchedPlayheadPosition', function (event, currentPosition) {
    //             element.css('left', currentPosition + 'px');
    //         });

    //         scope.$on('setSchedPlayheadVisibility', function (event, visible) {
    //             if (visible) {
    //                 element.addClass('daw-sched-marker');
    //             } else {
    //                 element.removeClass('daw-sched-marker');
    //             }
    //         });
    //     }
    // }
    return <div></div>
}

const Slider = ({ value, onChange, options, title }) => {
    console.log("TODO", options)
    return <input type="range" min={options.floor} max={options.ceil} step={options.step} value={value} onChange={onChange} title={title} />
}

// More directives: widthExceeded, sizeChanged, dawContainer, trackPanelPosition, trackEffectPanelPosition, dawTimeline, dawMeasureline

// Pulled in via angular dependencies
let WaveformCache, ESUtils

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


let setupDone = false
const setup = (dispatch) => {
    if (setupDone) return
    setupDone = true

    const $scope = helpers.getNgController('ideController').scope()
    // everything in here gets reset when a new project is loaded
    // Listen for the IDE to compile code and return a JSON result
    $scope.$watch('compiled', function (result) {
        console.log("compiled result:", result)
        if (result === null || result === undefined) return

        esconsole('code compiled', 'daw')
        prepareWaveforms(result.tracks, result.tempo)

        console.log("set playLength", result.length + 1)
        dispatch(daw.setPlayLength(result.length + 1))

        const tracks = []
        result.tracks.forEach((track, index) => {
            // create a (shallow) copy of the track so that we can
            // add stuff to it without affecting the reference which
            // we want to preserve (e.g., for the autograder)
            track = Object.assign({}, track)
            tracks.push(track)

            track.visible = true
            // TODO:
            // track.solo = $scope.preserve.solo.indexOf(i) > -1
            // track.mute = $scope.preserve.muted.indexOf(i) > -1
            track.solo = track.mute = false
            track.label = index
            track.buttons = true // show solo/mute buttons

            for (let [key, effect] of Object.entries(track.effects)) {
                // TODO
                // track.effects[key].visible = $scope.preserve.effects
                // track.effects[key].bypass = $scope.preserve.bypass.indexOf(key) > -1
                effect.visible = true
                effect.bypass = false
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
            // TODO
            // metronome.mute = !$scope.preserve.metronome
            metronome.effects = {}
        }

        dispatch(daw.setTracks(tracks))

        // TODO: bring over the rest of this
        return

        if (!$scope.preserve.playPosition) {
            $scope.playPosition = 1;
        }

        // overwrite the current script result, create a copy so we
        // can non-destructively modify it.
        // TODO: use a different data structure for destructive modifications
        // so we don't waste memory
        $scope.result = result;

        $scope.$on('resetScrollBars', function () {
            $scope.resetScrollPos();
        });

        $scope.tempo = $scope.result.tempo;
        $scope.beatsPerBar = 4;
        // this is the measure number where the script ends
        // $scope.playLength = result.length + 1;
        $scope.songDuration = ($scope.playLength*$scope.beatsPerBar)/($scope.tempo/60);

        if ($scope.freshPallete) {
            var result_ = $scope.getZoomIntervals($scope.playLength,$scope.zoomLevels);
            if (result_) {
                $scope.horzSlider.value = result_.zoomLevel;
                $scope.updateTrackWidth($scope.horzSlider.value);
            }
            $scope.freshPallete = false;
        }

        // $scope.tracks = []; //$scope.result.tracks;

        if (!$scope.preserve.trackColors) {
            $scope.fillTrackColors($scope.result.tracks.length-1);
        }

        //We want to keep the length of a bar proportional to number of pixels on the screen
        //We also don't want this proportion to change based on songs of different length
        //So, we set a default number of measures that we want the screen to fit in
        $scope.measuresFitToScreen = 61; //default length for scaling trackWidth
        $scope.secondsFitToScreen = ($scope.measuresFitToScreen * $scope.beatsPerBar)/($scope.tempo/60);

        // for (var i in $scope.result.tracks) {
        //     if ($scope.result.tracks.hasOwnProperty(i)) {
        //         i = parseInt(i); // for some reason this isn't always a str
        //         // create a (shallow) copy of the track so that we can
        //         // add stuff to it without affecting the reference which
        //         // we want to preserve (e.g., for the autograder)
        //         var track = angular.extend({}, $scope.result.tracks[i]);
        //         $scope.tracks.push(track);

        //         track.visible = true;
        //         track.solo = $scope.preserve.solo.indexOf(i) > -1;
        //         track.mute = $scope.preserve.muted.indexOf(i) > -1;
        //         track.label = i;
        //         track.buttons = true; // show solo/mute buttons

        //         for (var j in track.effects) {
        //             // not sure what this is trying to do (ref. line 131)?
        //             // var effect = track.effects[j];
        //             // track.effects[j] = angular.extend({}, track.effects[j]);
        //             // effect.visible = $scope.preserve.effects;
        //             // effect.bypass = $scope.preserve.bypass.indexOf

        //             if (track.effects.hasOwnProperty(j)) {
        //                 track.effects[j].visible = $scope.preserve.effects;
        //                 track.effects[j].bypass = $scope.preserve.bypass.indexOf(j) > -1;
        //             }
        //         }
        //     }
        // }
        // $scope.mix = $scope.tracks[0];
        // $scope.metronome = $scope.tracks[$scope.tracks.length-1];

        $scope.xScale = d3.scale.linear()
            .domain([1, $scope.measuresFitToScreen]) // measures start at 1
            .range([0, $scope.trackWidth]);

        $scope.timeScale = d3.scale.linear()
            .domain([0, $scope.secondsFitToScreen]) // time starts at 0
            .range([0, $scope.trackWidth]);

        // sanity checks
        if ($scope.loop.start > $scope.playLength) {
            $scope.loop.start = 1;
        }
        if ($scope.loop.end > $scope.playLength) {
            $scope.loop.end = $scope.playLength;
        }

        // if (typeof $scope.mix !== "undefined") {
        //     var effects = $scope.mix.effects;
        //     var num = Object.keys(effects).length;
        //     $scope.mix.visible = num > 0;
        //     $scope.mix.mute = false;
        //     // the mix track is special
        //     $scope.mix.label = 'MIX';
        //     $scope.mix.buttons = false;
        // }
        // if (typeof $scope.metronome !== "undefined") {
        //     $scope.metronome.visible = false;
        //     $scope.metronome.mute = !$scope.preserve.metronome;
        //     $scope.metronome.effects = {};
        // }

        player.setRenderingData($scope.result);
        player.setMutedTracks($scope.tracks);
        player.setBypassedEffects($scope.tracks);

        $scope.freshPallete = false;
        $scope.$broadcast('setPanelPosition');
    });
}

const DAW = () => {
    const xScale = useSelector(daw.selectXScale)
    const trackColors = useSelector(daw.selectTrackColors)
    // TODO
    const embeddedScriptName = "TODO"
    const embeddedScriptUsername = "TODO"
    const codeHidden = false
    const result = true
    const hideDaw = false
    const dragging = false
    const vertScrollPos = 0
    const tracks = useSelector(daw.selectTracks)
    console.log("Tracks:", tracks)
    const horzSlider = {value: 0, options: {}}
    const vertSlider = {value: 0, options: {}}

    const toggleEffects = todo
    const hasEffects = todo
    const hasInvisibleEffects = todo
    const startDrag = todo
    const endDrag = todo
    const drag = todo

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
                <div className="flex-grow" id="daw-container"> {/* Directive dawContainer */}
                    <div className="relative">
                        {/* Effects Toggle */}
                        <button type="submit" className="btn-primary btn-effect flex items-center justify-center" data-toggle="tooltip" data-placement="bottom" title="Toggle All Effects" onClick={toggleEffects} disabled={!hasEffects()}>
                            {/* Directive trackEffectPanelPosition */}
                            <span>EFFECTS</span>
                            <span className={"icon icon-eye" + (hasInvisibleEffects() ? "-blocked" : "")}></span>
                        </button>

                        <div id="daw-clickable" onMouseDown={startDrag} onMouseUp={endDrag} onMouseMove={drag}>
                            {/* Timescales */}
                            <div id="daw-timeline"></div> {/* dawTimeline directive */}
                            <div id="daw-measureline"></div> {/* dawMeasureline directive */}
                        </div>

                        <div className="daw-track-group-container">
                            {tracks.map((track, index) => {
                                if (track.visible) {
                                    if (index === 0) {
                                        return <MixTrack key={index} color={trackColors[index]} track={track} />
                                    } else if (index < tracks.length - 1) {
                                        return <Track key={index} color={trackColors[index]} track={track} />
                                    }
                                }
                            })}
                        </div>

                        <div className="absolute top-0 left-0 h-full">
                            <Playhead />
                            <SchedPlayhead />
                            <Cursor />
                            {(dragging || loop.selection && loop.on) && loop.end != loop.start &&
                            <Highlight style={{width: xScale(Math.abs(loop.end - loop.start) + 1) + 'px', top: vertScrollPos, 'left': xScale(Math.min(loop.start, loop.end))}} />}
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
    setup(props.$ngRedux.dispatch)
    return (
        <Provider store={props.$ngRedux}>
            <DAW />
        </Provider>
    );
});

app.component('reactdaw', react2angular(HotDAW, null, ['$ngRedux', 'ESUtils', 'WaveformCache']))