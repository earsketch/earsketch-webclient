import React, { Component, useState } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'

import * as daw from './dawState'

import * as helpers from "../helpers";
import { reset } from '../bubble/bubbleState'
import { PAUSE } from 'redux-persist'

// TODO
const isEmbedded = false
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

const DAW = () => {
    // TODO
    const embeddedScriptName = "TODO"
    const embeddedScriptUsername = "TODO"
    const codeHidden = false
    const result = true
    const hideDaw = false
    const dragging = false
    const vertScrollPos = 0
    const tracks = {}

    const toggleEffects = todo
    const hasEffects = todo
    const hasInvisibleEffects = todo
    const startDrag = todo
    const endDrag = todo
    const drag = todo
    const xScale = todo

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
                {/*<rzslider rz-slider-model="horzSlider.value" rz-slider-options="horzSlider.options" title="Slide to zoom-in/out"></rzslider>*/}
                <span className="zoom-in">+</span>
            </div>

            <div className="flex-grow flex overflow-auto">
                {/* Vertical Zoom Slider */}
                <div id="vert-zoom-slider-container" className="flex-grow-0 h-full">
                    <span className="zoom-out">-</span>
                    {/*<rzslider rz-slider-model="vertSlider.value" rz-slider-options="vertSlider.options" title="Slide to change track height"></rzslider>*/}
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
                            {// TODO: Check if `tracks` is an object or an array of pairs.
                            Object.entries(tracks).map(([[trackNum, track], index]) => {
                                if (track.visible) {
                                    if (index === 0) {
                                        return <div/> /* Directive dawMixTrack */
                                    } else if (index < tracks.length - 1) {
                                        return <div/> /* Directive dawTrack */
                                    }
                                }
                            })}
                        </div>

                        <div className="absolute top-0 left-0 h-full">
                            <daw-play-head></daw-play-head>
                            <daw-sched-playhead></daw-sched-playhead>
                            <daw-cursor></daw-cursor>
                            {(dragging || loop.selection && loop.on) && loop.end != loop.start &&
                            <daw-highlight style={{width: xScale(Math.abs(loop.end - loop.start) + 1) + 'px', top: vertScrollPos, 'left': xScale(Math.min(loop.start, loop.end))}}></daw-highlight>}
                        </div>
                    </div>
                </div>
            </div>
        </div>}
    </div>
}

const HotDAW = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <DAW />
        </Provider>
    );
});

app.component('reactdaw', react2angular(HotDAW, null, ['$ngRedux']))