import React, { Component, useState } from 'react'
import { Provider, useSelector, useDispatch } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import { react2angular } from 'react2angular'

import * as daw from './dawState'

import * as helpers from "../helpers";

export const DAW = () => {
    const embeddedScriptName = "TODO"
    const embeddedScriptUsername = "TODO"
    return (
<div className="flex flex-col w-full h-full relative overflow-hidden">
    <div ng-show="isEmbedded && codeHidden" style={{display: "block"}} className="embedded-script-info"> Script {embeddedScriptName} by {embeddedScriptUsername}</div>
    <div id="dawHeader" className="flex-grow-0"> {/* widthExceeded directive */}
        {/* TODO: don't use bootstrap classes */}
        {/* DAW Label */}
        <div className="btn-group" id="daw-label">
            <span className="panel-label"><span className="icon icon-DAW-Icon" ng-show="showIcon"></span><span ng-show="showFullTitle">Digital Audio Workstation</span><span ng-show="showShortTitle">DAW</span></span>
        </div>
        <div ng-show="isEmbedded" >
            <a target="_blank" ng-href="{{shareScriptLink}}"> Click Here to view in EarSketch </a>
        </div>
        {/* Transport Buttons */}
        <div className="daw-transport-container">
            {/* Beginning */}
            <span className="daw-transport-button">
            <button type="submit" className="btn btn-clear" data-toggle="tooltip" data-placement="bottom" title="Reset" ng-click="reset()">
                <span className="icon icon-first"></span>
            </button>
        </span>

        <span id="daw-play-button" uib-popover-html="getPopoverContent('play')" popover-placement="bottom" popover-is-open="showDAWKeyShortcuts" popover-animation="true" popover-trigger="'none'">
            {/* Play */}
            <span className="daw-transport-button" ng-hide="playing">
                <button type="submit" className="btn btn-play btn-clear" title="Play" ng-click="play();">
                    <span className="icon icon-play4"></span>
                </button>
            </span>

            {/* Pause */}
            <span className="daw-transport-button" ng-show="playing">
                <button type="submit" className="btn btn-clear" title="Pause" ng-click="pause(true);">
                    <span className="icon icon-pause2"></span>
                </button>
            </span>
        </span>

        {/* Loop */}
        <span className="daw-transport-button">
            <button type="submit" className="btn btn-clear" ng-class="loop.on ? 'btn-clear-warning' : ''" data-toggle="tooltip" data-placement="bottom" title="Loop Project" ng-click="toggleLoop();">
                <span className="icon icon-loop"></span>
            </button>
        </span>

        {/* Follow through */}
        <span className="daw-transport-button follow-icon" ng-show="horzOverflow">
            <button type="submit" className="btn btn-clear" ng-class="autoScroll ? 'btn-clear-warning' : ''" data-toggle="tooltip" data-placement="bottom" title="Auto-scroll to follow the playback" ng-click="autoScroll = !autoScroll">
                <span className="icon icon-move-up"></span>
            </button>
        </span>

        {/* Metronome */}
        <span className="daw-transport-button">
            <button id="dawMetronomeButton" className="btn btn-clear" ng-class="!metronome.mute ? 'btn-clear-warning':''" data-toggle="tooltip" title="Toggle Metronome" data-placement="bottom" ng-click="toggleMetronome()">
                <span className="icon icon-meter3"></span>
            </button>
        </span>

        {/* Time Sync */}
        <span className="daw-transport-button" ng-show="timesync.available">
            <button id="dawTimesyncButton" className="btn btn-clear" ng-class="timesyncEnabled ? 'btn-clear-warning':''" data-toggle="tooltip" title="Play together" data-placement="bottom" ng-click="toggleTimesync()">
                <span className="icon icon-link"></span>
            </button>
        </span>

        {/* Volume Control */}
        <span className="daw-transport-button" id="volume-control">
            <span ng-click="toggleMute()">
                <button id="muteButton" className="btn btn-clear" style={{width: "40px"}} title="Toggle Volume" data-toggle="tooltip" data-placement="bottom">
                    <span className="icon icon-volume-high" ng-show="!volumeMuted"></span>
                    <span className="icon icon-volume-mute" ng-show="volumeMuted"></span>
                </button>
            </span>
            <span className="daw-transport-button">
                <input id="dawVolumeSlider" type="range" min="-20" max="0" defaultValue="0" ng-model="volume" ng-change="changeVolume()" />
            </span>
        </span>
        </div>
    </div>

    <div id="zoom-container" className="flex-grow relative w-full h-full flex flex-col overflow-x-auto overflow-y-hidden" ng-show="result && !hideDaw">
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
                    <button type="submit" className="btn-primary btn-effect flex items-center justify-center" data-toggle="tooltip" data-placement="bottom" title="Toggle All Effects" ng-click="toggleEffects()" ng-disabled="!hasEffects()">
                        {/* Directive trackEffectPanelPosition */}
                        <span>EFFECTS</span>
                        <span className="icon icon-eye-blocked" ng-show="hasInvisibleEffects()"></span>
                        <span className="icon icon-eye" ng-hide="hasInvisibleEffects()"></span>
                    </button>

                    <div id="daw-clickable" ng-mousedown="startDrag($event)" ng-mouseup="endDrag($event)" ng-mousemove="drag($event)">
                        {/* Timescales */}
                        <div id="daw-timeline"></div> {/* dawTimeline directive */}
                        <div id="daw-measureline"></div> {/* dawMeasureline directive */}
                    </div>

                    <div className="daw-track-group-container">
                        <div ng-repeat="(trackNum, track) in tracks" ng-if="$index == 0" ng-show="track.visible"> {/* Directive dawMixTrack */}
                        </div>
                        <div ng-repeat="(trackNum, track) in tracks" ng-if="$index > 0 && $index < tracks.length-1" ng-show="track.visible"> {/* Directive dawTrack */}
                        </div>
                    </div>

                    <div className="absolute top-0 left-0 h-full">
                        <daw-play-head></daw-play-head>
                        <daw-sched-playhead></daw-sched-playhead>
                        <daw-cursor></daw-cursor>
                        <daw-highlight ng-if="((dragging || loop.selection && loop.on) && loop.end != loop.start)" ng-style="{'width':xScale(Math.abs(loop.end - loop.start) + 1) + 'px', 'top': vertScrollPos, 'left':xScale(Math.min(loop.start, loop.end))}"></daw-highlight>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    )
}

const HotDAW = hot(props => {
    return (
        <Provider store={props.$ngRedux}>
            <DAW />
        </Provider>
    );
});

app.component('reactdaw', react2angular(HotDAW, null, ['$ngRedux']))