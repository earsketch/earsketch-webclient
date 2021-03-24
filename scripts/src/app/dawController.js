import { setReady } from '../bubble/bubbleState';

/**
 * Angular directive / controller for the DAW view. Members can be accessed with $scope.name from within JS, or just name from within HTML that is bound to this controller.
 * @module dawController
 */
app.directive('daw', function () {
    return {
        templateUrl: 'templates/daw-view.html',
        transclude: true,
        restrict: 'E',
        scope: {
            ngModel: '='
        },
        controller: ['$scope', '$rootScope', '$location', '$timeout', 'player', 'audioContext', 'ESUtils', 'esconsole', '$sce', 'timesync', 'userProject', 'WaveformCache', 'userNotification', '$ngRedux', function ($scope, $rootScope, $location, $timeout, player, context, ESUtils, esconsole, $sce, timesync, userProject, WaveformCache, userNotification, $ngRedux) {
            $ngRedux.connect(state => ({ ...state.bubble }))(state => {
                $scope.bubble = state;
            });

            $scope.freshPallete = true;
            $scope.zoomLowerLimit = 650;
            $scope.zoomStep = 100;
            $scope.zoomUpperLimit = 50000;
            $scope.horzOverflow = false;
            $scope.showDAWKeyShortcuts = false;
            var trustedHtml = {}; //for keyboard shortcut popover
            $scope.shareScriptLink = "";
            $scope.embeddedScriptUsername = "";
            $scope.embeddedScriptName = "";
            

            $scope.$on('embeddedScriptLoaded', function(event, data){
                $scope.shareScriptLink = location.origin + location.pathname +'#?sharing=' + data.shareid;  
                $scope.embeddedScriptUsername = data.username;
                $scope.embeddedScriptName = data.scriptName;
            });

            // if the daw is removed, stop playing
            $scope.$on('$destroy', function() {
                $scope.pause(true);
            });

            if ($location.search()) {
                $scope.isEmbedded = $location.search()["embedded"] === "true";
                $scope.hideDaw = $location.search()["hideDaw"] && $scope.isEmbedded;
                $scope.codeHidden = $location.search()["hideCode"] && $scope.isEmbedded;
            }
            else {
                $scope.isEmbedded = false;
                $scope.hideDaw = false;
                $scope.codeHidden = false;
            }

            $scope.dynamicStyle = function(){
                var top = $scope.codeHidden ? "54px" : "40px";
                return {top:top};
            };

            // $scope.$on('$viewContentLoaded', function(){
            //     if($scope.isEmbedded) $(".btn-play").addClass("flashButton");
            // });
            if($scope.isEmbedded) $(".btn-play").addClass("flashButton");
            $scope.trackIsembeddedAndUncompiled = $scope.isEmbedded;
            $scope.$on('embeddedCodeCompiled', function(){
                $scope.play();
            })

            // $scope.horzZoomLevels = [700, 2100, 3500, 6000, 7000, 8000, 8500, 9000, 9500, 10000];
            // $scope.vertZoomLevels = [28, 35, 45, 55, 65, 75, 85, 95, 115, 125];
            // $scope.horzZoom = 1;
            // $scope.vertZoom = 2;

            $scope.horzSlider = {
                value: $scope.zoomLowerLimit,
                options: {
                    floor: $scope.zoomLowerLimit,
                    ceil: $scope.zoomUpperLimit,
                    step: $scope.zoomStep,
                    hidePointerLabels: true,
                    hideLimitLabels: true
                }
            };

            $scope.vertSlider = {
                value: 45,
                options: {
                    floor: 25,
                    ceil: 125,
                    step: 10,
                    hidePointerLabels: true,
                    hideLimitLabels: true,
                    vertical: true,
                    rightToLeft: true
                }
            };

             /**
             * List of default zoom lengths for ranges of measures.
             * This list is referred when the song is renderred for the first time
             * to approximate a zoom level based on the song length
             */
            $scope.zoomLevels = [
                {start: 1, end: 4, zoomLevel: 12000},
                {start: 4, end: 8, zoomLevel: 4600},
                {start: 8, end: 16, zoomLevel: 2700},
                {start: 16, end: 24, zoomLevel: 1700},
                {start: 24, end: 30, zoomLevel: 1250},
                {start: 30, end: 36, zoomLevel: 1050},
                {start: 36, end: 45, zoomLevel: 850},
                {start: 45, end: 10000, zoomLevel: 650}
            ];

            /**
             * Intervals of measure line based on zoom levels
             * This list is referred during zoom in/out
             */
            $scope.measureLineZoomIntervals = [
                {start: 649, end: 750, tickInterval: 4, labelInterval: 4, tickDivision: 1},
                {start: 750, end: 1350, tickInterval: 1, labelInterval: 4, tickDivision: 4},
                {start: 1350, end: 1950, tickInterval: 0.5, labelInterval: 4, tickDivision: 1},
                {start: 1950, end: 2850, tickInterval: 0.5, labelInterval: 1, tickDivision: 1},
                {start: 2850, end: 50000, tickInterval: 0.25, labelInterval: 1, tickDivision: 1}
            ];

             /**
             * Intervals of timeline based on zoom levels
             * This list is referred during zoom in/out
             */
            $scope.timeLineZoomIntervals = [
                {start: 649, end: 950, tickInterval: 15},
                {start: 950, end: 1550, tickInterval: 10},
                {start: 1550, end: 2650, tickInterval: 5},
                {start: 2650, end: 2950, tickInterval: 5},
                {start: 2950, end: 3950, tickInterval: 4},
                {start: 3950, end: 7850, tickInterval: 2},
                {start: 7850, end: 9150, tickInterval: 1},
                {start: 9150, end: 50000, tickInterval: 1}
            ];

            $scope.$watch("horzSlider.value", function(){
                $scope.updateTrackWidth($scope.horzSlider.value);
                $scope.hideMasterTrackLabel = $scope.horzSlider.value < 950;
            });

            $scope.$watch("vertSlider.value", function(){
                $scope.updateTrackHeight($scope.vertSlider.value);
                $scope.mixTrackHeight = Math.max(25,Math.round($scope.vertSlider.value/2));
            });

            /**
             * List of available colors for tracks
             * @type {hex values}
             */
            $scope.trackColorsSet = ['#f2fdbf','#f3d8b2','#ff8080','#9fa2fd','#9fb2fd','#9fc2fd','#9fd2fd',
            '#9fe2fd','#9ff2fd','#9fe29d','#9fe2bd','#bfe2bf','#dfe2bf','#ffe2bf','#ffff00','#ffc0cb'];

            /**
             * Colors for correspondin to tracks
             * @type {hex values}
             */
            $scope.trackColors = [];

            /**
             * shuffle an array: used to shuffle list of colors for track
             */
            $scope.shuffle = function shuffle(array,numItems) {
                var m = array.length, t, i;
                if (numItems === undefined || numItems >= m) {
                    numItems = 0;
                } else {
                    numItems = array.length - numItems;
                }
                while (m > numItems) {
                    i = Math.floor(Math.random() * m--);
                    t = array[m];
                    array[m] = array[i];
                    array[i] = t;
                  }
                return array;
            };

            /**
             * create trackColors array based on number of tracks rendered
             */
            $scope.fillTrackColors = function (numTracks) {
                $scope.trackColors = [];
                if (numTracks < $scope.trackColorsSet.length) {
                    $scope.trackColors = $scope.shuffle($scope.trackColorsSet,numTracks);
                } else {
                    var shuffledArray = $scope.shuffle($scope.trackColorsSet);
                    for (var i = 0; i<numTracks; i++) {
                        $scope.trackColors.push(shuffledArray[i%shuffledArray.length]);
                    }
                }
                $scope.preserve.trackColors = true;
            };

            /**
             *
             */
            $scope.getZoomIntervals = function (width, zoomArray) {
                for (var i=0; i<zoomArray.length;i++) {
                    if (width > zoomArray[i].start && width <= zoomArray[i].end) {
                        return zoomArray[i];
                    }
                }
            };

            /**
             * Size of track control box
             * @type {number}
             */
            $scope.xOffset = 100;

            /**
             * @name volume
             * @type {number} in dB
             */
            $scope.volume = 0; //dB

            /**
             * The master volume mute control.
             * @name volumeMuted
             * @type {boolean} Default = false
             */
            $scope.volumeMuted = false;

            /**
             * @name playing
             * @type {boolean}
             */
            $scope.playing = false;
            $scope.autoScroll = true;
            $scope.daw_timelineOffset = 100;

            /**
             * Current play position in measures - starts at 1
             * @name playPosition
             * @type {number}
             */
            $scope.playPosition = 1;

            /**
             * Used for showing/drawing the scheduled playhead when user sets a new position during playback
             * @type {number}
             */
            $scope.schedPlayPosition = 1;

            $scope.timesync = timesync;
            $scope.timesyncEnabled = false;

            /**
             * These flags are meant to preserve muted and solo tracks when a script is rerun for live coding.
             * It has to be an object because setting a value in a child scope only updates the local scope,
             * but we need to update the parent scope.
             * @name preserve
             * @type {{solo: Array, muted: Array, bypass: Array, metronome: boolean, effects: boolean}}
             */
            $scope.preserve = {
                'solo': [],
                'muted': [],
                'bypass': [],
                'metronome': false,
                'effects': true,
                'trackColors': false
            };

            /**
             * Keeps to track of the playing state with tab swapping
             * @type {boolean}
             */
            $scope.preserve.playing = false;
            $scope.preserve.playPosition = false;

            /**
             * Loop selected sections
             * @type {{selection: boolean, start: number, end: number, on: boolean, reset: boolean}}
             */
            $scope.loop = {
                'selection': false, // false=loop whole track
                'start': 1,
                'end': 1,
                'on': false, // true=enable looping
                'reset': false
            };

            $scope.toggleLoop = function () {
                $scope.loop.on = !$scope.loop.on;
                $scope.loop.selection = false;
                player.setLoop($scope.loop);
            };

            /**
             * @name tracks
             * @type {Array}
             */
            $scope.tracks = [];

            $scope.result = null;

            // reset preservation flags when tab changes
            // TODO: this will reset the states in next run if the user swaps tab by mistake
            $scope.$on('swapTab', function () {
                $scope.preserve.solo = [];
                $scope.preserve.muted = [];
                $scope.preserve.bypass = [];
                $scope.preserve.metronome = false;
                $scope.preserve.effects = true;
                $scope.preserve.playing = false;
                $scope.preserve.playPosition = false;
                $scope.preserve.trackColors = false;
            });

            function rms(array) {
                return Math.sqrt(array.map(function (v) {
                    return Math.pow(v, 2);
                }).reduce(function (a, b) { return a + b; }) / array.length);
            }

            function prepareWaveforms(tracks, tempo) {
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

            // everything in here gets reset when a new project is loaded
            // Listen for the IDE to compile code and return a JSON result
            $scope.$watch('ngModel', function (result) {
                if (result === null || result === undefined) { return; }

                esconsole('code compiled', 'daw');
                prepareWaveforms(result.tracks, result.tempo);

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
                $scope.playLength = result.length + 1;
                $scope.songDuration = ($scope.playLength*$scope.beatsPerBar)/($scope.tempo/60);

                if ($scope.freshPallete) {
                    var result_ = $scope.getZoomIntervals($scope.playLength,$scope.zoomLevels);
                    if (result_) {
                        $scope.horzSlider.value = result_.zoomLevel;
                        $scope.updateTrackWidth($scope.horzSlider.value);
                    }
                    $scope.freshPallete = false;
                }

                $scope.tracks = []; //$scope.result.tracks;

                if (!$scope.preserve.trackColors) {
                    $scope.fillTrackColors($scope.result.tracks.length-1);
                }

                //We want to keep the length of a bar proportional to number of pixels on the screen
                //We also don't want this proportion to change based on songs of different length
                //So, we set a default number of measures that we want the screen to fit in
                $scope.measuresFitToScreen = 61; //default length for scaling trackWidth
                $scope.secondsFitToScreen = ($scope.measuresFitToScreen * $scope.beatsPerBar)/($scope.tempo/60);

                for (var i in $scope.result.tracks) {
                    if ($scope.result.tracks.hasOwnProperty(i)) {
                        i = parseInt(i); // for some reason this isn't always a str
                        // create a (shallow) copy of the track so that we can
                        // add stuff to it without affecting the reference which
                        // we want to preserve (e.g., for the autograder)
                        var track = angular.extend({}, $scope.result.tracks[i]);
                        $scope.tracks.push(track);

                        track.visible = true;
                        track.solo = $scope.preserve.solo.indexOf(i) > -1;
                        track.mute = $scope.preserve.muted.indexOf(i) > -1;
                        track.label = i;
                        track.buttons = true; // show solo/mute buttons

                        for (var j in track.effects) {
                            // not sure what this is trying to do (ref. line 131)?
                            // var effect = track.effects[j];
                            // track.effects[j] = angular.extend({}, track.effects[j]);
                            // effect.visible = $scope.preserve.effects;
                            // effect.bypass = $scope.preserve.bypass.indexOf

                            if (track.effects.hasOwnProperty(j)) {
                                track.effects[j].visible = $scope.preserve.effects;
                                track.effects[j].bypass = $scope.preserve.bypass.indexOf(j) > -1;
                            }
                        }}

                }
                $scope.mix = $scope.tracks[0];
                $scope.metronome = $scope.tracks[$scope.tracks.length-1];

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

                if (typeof $scope.mix !== "undefined") {
                    var effects = $scope.mix.effects;
                    var num = Object.keys(effects).length;
                    $scope.mix.visible = num > 0;
                    $scope.mix.mute = false;
                    // the mix track is special
                    $scope.mix.label = 'MIX';
                    $scope.mix.buttons = false;
                }
                if (typeof $scope.metronome !== "undefined") {
                    $scope.metronome.visible = false;
                    $scope.metronome.mute = !$scope.preserve.metronome;
                    $scope.metronome.effects = {};
                }

                player.setRenderingData($scope.result);
                player.setMutedTracks($scope.tracks);
                player.setBypassedEffects($scope.tracks);

                $scope.freshPallete = false;
                $scope.$broadcast('setPanelPosition');
            });

            /**
             * @name togglePlay
             * @function
             */
            $scope.$on('togglePlay', function () {
                if ($scope.tracks.length > 0) {
                    if ($scope.playing) {
                        $scope.pause(true);
                    } else {
                        $scope.play();
                    }
                }
            });

            function playbackStartedCallback() {
                drawPlayhead(true);
                $scope.drawScheduledPlayhead(false);
            }

            function playbackEndedCallback() {
                if ($scope.loop.on) {
                    esconsole('looping playback', 'daw');

                } else {
                    esconsole('finished playback', 'daw');
                    $scope.pause(false);

                    // reset the playhead position?
                    $scope.playPosition = 1;
                    drawPlayhead(false);
                    $scope.$broadcast('autoScrollTracks');
                }
            }

            var drawPlayheadTimer = null;

            function drawPlayhead(bool) {
                drawPlayheadTimer = clearInterval(drawPlayheadTimer);

                if (bool) {
                    drawPlayheadTimer = setInterval(function () {
                        $scope.playPosition = player.getCurrentPosition();
                        $scope.$broadcast('autoScrollTracks');
                    }, 60); // smaller interval -> smoother line movement
                }
                esconsole('drawing playhead: ' + !!bool, ['DAW', 'debug']);
                $scope.$applyAsync();
            }

            $scope.drawScheduledPlayhead = function (bool) {
                if (bool) {
                    $scope.$broadcast('setSchedPlayheadPosition', $scope.xScale($scope.schedPlayPosition));
                    $scope.$broadcast('setSchedPlayheadVisibility', true);
                } else {
                    $scope.$broadcast('setSchedPlayheadVisibility', false);
                }
                esconsole('drawing scheduled playhead: ' + !!bool, ['DAW', 'debug']);
                $scope.$applyAsync();
            };

            /**
             * @name play
             * @function
             */
            $scope.play = function () {
                const { bubble } = $ngRedux.getState();
                if (bubble.active && bubble.currentPage===4 && !bubble.readyToProceed) {
                    $ngRedux.dispatch(setReady(true));
                }

                if($scope.trackIsembeddedAndUncompiled){
                    $rootScope.$broadcast('compileembeddedTrack', true);
                    $(".btn-play").removeClass("flashButton");
                    $scope.trackIsembeddedAndUncompiled = false;
                    return;
                }

                drawPlayhead(false);

                if ($scope.playPosition >= $scope.playLength) {
                    if ($scope.loop.selection) {
                        $scope.playPosition = $scope.loop.start;
                    } else {
                        $scope.playPosition = 1;
                    }
                }

                $scope.playing = true;

                // preserve the states for the current tab
                $scope.preserve.playing = true;
                $scope.preserve.playPosition = true;

                player.setRenderingData($scope.result);
                player.setMutedTracks($scope.tracks);
                player.setBypassedEffects($scope.tracks);
                player.setOnStartedCallback(playbackStartedCallback);
                player.setOnFinishedCallback(playbackEndedCallback);
                player.play($scope.playPosition, $scope.playLength);

                // volume state is not preserved between plays
                if ($scope.volumeMuted) {
                    $scope.mute();
                } else {
                    $scope.changeVolume();
                }
            };

            $scope.resetScrollPos = function () {
                $scope.vertScrollPos = 0;
                $scope.horzScrollPos = 0;
            };

            $scope.pausePlayer = function () {
                player.pause();
                player.reset();
            };

            $scope.pause = function (pausePlayer) {
                if (pausePlayer) {
                    $scope.pausePlayer();
                }

                drawPlayhead(false);
                $scope.playing = false;
                $scope.$applyAsync();
            };

            // TODO: unused?
            $scope.forward = function (measures) {
                $scope.playPosition = $scope.playPosition + measures;
                if ($scope.playPosition > $scope.playLength) {
                    $scope.playPosition = $scope.playLength;
                }
                // replay to update current play time
                if ($scope.playing) {
                    $scope.play();
                }
            };

            // TODO: unused?
            $scope.backward = function (measures) {
                $scope.playPosition = $scope.playPosition - measures;
                if ($scope.playPosition < 1) {
                    $scope.playPosition = 1;
                }
                // replay to update current play time
                if ($scope.playing) {
                    $scope.play();
                }
            };

            // aka rewind
            $scope.reset = function () {
                $scope.schedPlayPosition = $scope.playPosition = $scope.loop.selection ? $scope.loop.start : 1;
                player.setPosition($scope.playPosition);

                if ($scope.playing) {
                    $scope.drawScheduledPlayhead($scope.playing);
                } else {
                    $scope.$broadcast('autoScrollTracks'); // above broadcast included here
                }
            };

            $scope.toggleMetronome = function () {
                if (typeof($scope.metronome) !== 'undefined') {
                    $scope.metronome.mute = !$scope.metronome.mute;
                    $scope.preserve.metronome = !$scope.metronome.mute;
                    player.setMutedTracks($scope.tracks);
                }
            };

            $scope.toggleTimesync = function () {
                if (!$scope.timesyncEnabled) {
                    timesync.enable().then(function () {
                        esconsole('time sync enabled', ['DAW', 'debug']);
                        $scope.timesyncEnabled = true;
                        $scope.$applyAsync();

                        userNotification.show(ESMessages.dawservice.timesyncEnabled, 'normal', 5);
                    });
                } else {
                    $scope.timesyncEnabled = timesync.disable();
                }
            };
            let volumeRemember=$scope.volume;
            $scope.toggleMute = function () {
                if (!$scope.volumeMuted) {
                    volumeRemember=$scope.volume;
                    $scope.volume=-20;
                    $scope.mute();
                } else {
                    $scope.volume=volumeRemember;
                    $scope.unmute();
                }
            };

            $scope.mute = function () {
                $scope.volumeMuted = true;
                player.setVolume(context, -60);
            };

            $scope.unmute = function () {
                $scope.volumeMuted = false;
                player.setVolume(context, $scope.volume);
            };

            $scope.changeVolume = function () {
                var dawSliderVol = $scope.volume;
                if (dawSliderVol == -20) {
                    $timeout(function () {
                        $scope.volumeMuted = true;
                        $scope.mute();
                    }, 0);
                }
                else {
                    $timeout(function () {
                        $scope.unmute();
                        player.setVolume(context, $scope.volume);
                    }, 0);
                }
            };

            $scope.hasEffects = function () {
                for (var n in $scope.tracks) {
                    if ($scope.tracks.hasOwnProperty(n)) {
                        if (Object.keys($scope.tracks[n]).length > 0) {
                            return true;
                        }
                    }
                }
                return false;
            };

            // TODO: this (and others) gets called every digest cycle (in ng-show and ng-hide). could be optimized
            $scope.hasInvisibleEffects = function () {
                for (var n in $scope.tracks) {
                    for (var key in $scope.tracks[n].effects) {
                        if (!$scope.tracks[n].effects[key].visible) {
                            return true;
                        }
                    }
                }
                return false;
            };

            $scope.toggleEffects = function () {
                var visibility = $scope.hasInvisibleEffects();
                for (var n in $scope.tracks) {
                    for (var key in $scope.tracks[n].effects) {
                        $scope.tracks[n].effects[key].visible = visibility;
                    }
                }
                $scope.preserve.effects = visibility;
            };

            $scope.muteTrack = function (num) {
                esconsole('Muting track ' + num, ['DEBUG', 'DAW']);
                $scope.tracks[num].mute = true;
                // preserve mute status
                if ($scope.preserve.muted.indexOf(num) < 0) {
                    $scope.preserve.muted.push(num);
                }
                player.muteTrack($scope.result, num);
            };

            $scope.unmuteTrack = function (num) {
                esconsole('Unmuting track ' + num, ['DEBUG', 'DAW']);
                $scope.tracks[num].mute = false;
                // preserve mute status
                if ($scope.preserve.muted.indexOf(num) >= 0) {
                    $scope.preserve.muted.splice(
                        $scope.preserve.muted.indexOf(num)
                        , 1);
                }
                player.unmuteTrack($scope.result, num);
            };

            $scope.soloTrack = function (num) {
                $scope.tracks[num].solo = true;
                // preserve solo status
                if ($scope.preserve.solo.indexOf(num) < 0) {
                    $scope.preserve.solo.push(num);
                }
                for (var i = 0; i < $scope.tracks.length; i++) {
                    $scope.muteTrack(num);
                }
                for (var j = 0; j < $scope.preserve.solo.length; j++) {
                    $scope.unmuteTrack($scope.preserve.solo[j]);
                }
            };

            $scope.unsoloTrack = function (num) {
                $scope.tracks[num].solo = false;

                // preserve mute status
                if ($scope.preserve.solo.indexOf(num) >= 0) {
                    $scope.preserve.solo.splice($scope.preserve.solo.indexOf(num), 1);
                }

                var i;
                if ($scope.preserve.solo.length === 0) {
                    for (i = 0; i < $scope.tracks.length; i++) {
                        $scope.unmuteTrack(i); // unmute all tracks
                    }
                } else {
                    for (i = 0; i < $scope.tracks.length; i++) {
                        $scope.muteTrack(i);
                    }
                    for (var j = 0; j < $scope.preserve.solo.length; j++) {
                        $scope.unmuteTrack($scope.preserve.solo[j]);
                    }
                }
            };

            $scope.hasSoloTracks = function () {
                for (var i in $scope.tracks) {
                    if ($scope.tracks.hasOwnProperty(i)) {
                        if ($scope.tracks[i].solo) {
                            return true;
                        }
                    }
                }
                return false;
            };

            $scope.getPopoverContent = function(action) {
                var key = '';
                var os = '';

                //TODO: this is hacky - need to sort out the heriarchy of controllers
                if ($scope.$parent.$parent.$parent.detectOS ==='MacOS') {
                    os = 'Cmd';
                } else {
                    os = '<i class="icon icon-windows8"></i>';
                }

                switch (action) {
                    case "play":
                        key = '>';
                        break;
                }

                var content = "<div><kbd class='kbd'>"+os+"</kbd> + <kbd class='kbd'>"+key+"</kbd></div>";
                return trustedHtml[content] || (trustedHtml[content] = $sce.trustAsHtml(content));
            };

             /**
             * @name showDAWKeyShortcuts
             * @function
             */
            $scope.$on('showDAWKeyShortcuts', function () {
                $scope.showDAWKeyShortcuts = !$scope.showDAWKeyShortcuts;
            });

            $scope.updateTrackHeight = function(height) {
                $scope.trackHeight = height;
                $scope.$broadcast('changeTrackHeight',$scope.trackHeight);
                $scope.$broadcast('setScrollWidth',height);
            };

            $scope.updateTrackWidth = function(width) {
                $scope.trackWidth = width;

                $scope.xScale = d3.scale.linear()
                    .domain([1, $scope.measuresFitToScreen]) //measures start at 1
                    .range([0, $scope.trackWidth]);

                $scope.timeScale = d3.time.scale()
                    .domain([0, $scope.secondsFitToScreen]) // time starts at 0
                    .range([0, $scope.trackWidth]);

                $scope.$broadcast('setPlayHeadPosition', $scope.xScale($scope.playPosition));
                $scope.$broadcast('changeTrackWidth', width);
            };
        }],
        link: function (scope) {
            // listen for new scripts to reset the tracks
            scope.$on('renderDaw', scope.update);
        }
    }
});

/**
 * Angular directive / controller for the whole DAW container.
 * @module dawContainerController
 */
app.directive('dawContainer', function () {
    return {
        require: '^daw',
        controller: ['$scope', 'ESUtils', 'player', function ($scope, ESUtils, player) {
            // enable math functions in angular bindings (TODO: why don't we wrap in an injectable service?)
            $scope.Math = Math;

            // select looping sections
            $scope.dragging = false;
            var origin = 1;

            /**
             * @name getCurrentPlayPositionInMeasures
             * @function
             * @returns {number}
             */
            $scope.getCurrentPlayPositionInMeasures = function () {
                return $scope.playPosition;
            };

            /**
             * @name getCurrentPlayPositionInSeconds
             * @function
             * @returns {number}
             */
            $scope.getCurrentPlayPositionInSeconds = function () {
                return ESUtils.measureToTime($scope.playPosition, $scope.tempo);
            };

            /**
             * @name startDrag
             * @function
             * @param event {object}
             */
            $scope.startDrag = function (event) {
                event.preventDefault();
                // calculate x position of the bar from mouse position
                var target = angular.element(event.currentTarget);
                var xpos = event.clientX - target.offset().left;
                if (target[0].className !== "daw-track")
                    xpos = xpos - $scope.daw_timelineOffset;

                // allow clicking the track controls without affecting dragging
                if (xpos < $scope.horzScrollPos) {
                    return;
                }

                $scope.dragging = true;

                // keep track of what state to revert to if looping is canceled
                $scope.loop.reset = $scope.loop.on;
                // round to nearest beat
                var measure = Math.round($scope.xScale.invert(xpos));
                origin = measure;

                //Do not drag if beyond playLength
                if (measure > $scope.playLength) {
                    $scope.dragging = false;
                    return;
                }

                $scope.loop.start = measure;
                $scope.loop.end = measure;
            };

            /**
             * @name endDrag
             * @function
             * @param event {object}
             */
            $scope.endDrag = function (event) {
                event.preventDefault();
                // calculate x position of the bar from mouse position
                var target = angular.element(event.currentTarget);
                var xpos = event.clientX - target.offset().left;
                if (target[0].className !== "daw-track")
                    xpos = xpos - $scope.daw_timelineOffset;

                if (!$scope.dragging) {
                    return;
                }

                // round to nearest measure
                var measure = Math.round($scope.xScale.invert(xpos));

                // Force measure to be playlength if greater
                if (measure > $scope.playLength) {
                    measure = $scope.playLength;
                }

                $scope.dragging = false;

                if ($scope.loop.start === $scope.loop.end) {
                    // turn looping off if the loop range is 0 (i.e., no drag)
                    $scope.loop.selection = false;
                    $scope.loop.on = $scope.loop.reset;
                } else {
                    $scope.loop.selection = true;
                    $scope.loop.on = true;
                    player.setLoop($scope.loop);
                }

                if ($scope.loop.selection) {
                    if (!$scope.playing || !($scope.playPosition >= $scope.loop.start && $scope.playPosition <= $scope.loop.end)) {
                        $scope.schedPlayPosition = $scope.playPosition = $scope.loop.start;
                        $scope.drawScheduledPlayhead($scope.playing);
                    }
                } else {
                    $scope.schedPlayPosition = $scope.playPosition = measure;
                    $scope.drawScheduledPlayhead($scope.playing);
                }

                if (!$scope.playing) {
                    $scope.$broadcast('setPlayHeadPosition', $scope.xScale($scope.playPosition));
                }

                if (!$scope.loop.selection) {
                    player.setPosition($scope.playPosition);
                }
            };

            /**
             * @name drag
             * @function
             * @param event {object}
             */
            $scope.drag = function (event) {
                event.preventDefault();
                // calculate x position of the bar from mouse position
                var target = angular.element(event.currentTarget);
                var xpos = event.clientX - target.offset().left;
                if (target[0].className !== "daw-track")
                    xpos = xpos - $scope.daw_timelineOffset;
                // round to nearest measure
                var measure = Math.round($scope.xScale.invert(xpos));

                if (measure <= $scope.playLength && measure > 0) {
                    $scope.$broadcast('setCurrentPosition', $scope.xScale(measure));
                }

                // Prevent dragging beyond playLength
                if (measure > $scope.playLength) {
                    return;
                }

                if ($scope.dragging) {
                    if (measure === origin) {
                        $scope.loop.selection = false;
                        $scope.loop.start = measure;
                        $scope.loop.end = measure;
                    } else {
                        $scope.loop.selection = true;

                        if (measure > origin) {
                            $scope.loop.start = origin;
                            $scope.loop.end = measure;
                        } else if (measure < origin) {
                            $scope.loop.start = measure;
                            $scope.loop.end = origin;
                        }
                    }
                }
            };

        }],
        link: function (scope, element) {
            // initialize scroll positions
            scope.vertScrollPos = element[0].scrollTop;
            scope.horzScrollPos = element[0].scrollLeft;
            var scrollTime = 1.2;
            var scrollDistance = 170;

            scope.$on('changeTrackWidth', function (event, width) {
                element.scrollWidth = width;
            });

            scope.$on('setPanelPosition', function () {
                //wait for the scroll bars to load before setting the panel positions
                setTimeout(function () {
                    element.scroll();
                }, 500);
            });

            // update scroll positions
            element.bind('scroll', function (event) {
                scope.scrollPanes(event);
            });

            scope.scrollPanes = function (e) {
                scope.vertScrollPos = e.target.scrollTop;
                scope.horzScrollPos = e.target.scrollLeft;

                scope.$broadcast('adjustTopPostition', scope.vertScrollPos);
                scope.$broadcast('adjustLeftPostition', scope.horzScrollPos);
                scope.$broadcast('adjustPlayHead', scope.vertScrollPos);
            };

            scope.$on('autoScrollTracks', function () {
                var viewMin = scope.xScale.invert(
                    scope.horzScrollPos - scope.xOffset + 100 // 100 for the effects / track-control pane
                );

                var viewMax = scope.xScale.invert(
                    scope.horzScrollPos + element.parent().width() - scope.xOffset - 16
                );

                // autoscroll right
                if (scope.playPosition > viewMax) {
                    element[0].scrollLeft += element.parent().width() - scope.xOffset;
                    scope.horzScrollPos += element.parent().width() - scope.xOffset;
                    // autoscroll left
                } else if (scope.playPosition < viewMin) {
                    var jump = scope.xScale(scope.playPosition);
                    element[0].scrollLeft = jump;
                    scope.horzScrollPos = jump;
                }

                //follow play-back if auto-scroll is enabled
                if (scope.autoScroll && (scope.xScale(scope.playPosition) - element[0].scrollLeft) > (element[0].clientWidth-115)/2) {
                    element[0].scrollLeft = scope.xScale(scope.playPosition)-(element[0].clientWidth-115)/2;
                }
                scope.$broadcast('setPlayHeadPosition', scope.xScale(scope.playPosition));
            });

            // TODO: this is really slow! Only check at mouse release or something
            // check width overflow for showing the auto-scroll button
            // scope.$watch(function () { return element.scrollWidth; }, function () {
            //     if (element.clientWidth < element.scrollWidth) {
            //         scope.horzOverflow = true;
            //     } else {
            //         scope.horzOverflow = false;
            //     }
            // });

            // always on for now
            scope.horzOverflow = true;
        }
    }
});

/**
 * Angular directive / controller for the DAW timeline element.
 * @module dawMeasureline
 */
app.directive('dawMeasureline', function () {
    return {
        require: '^daw',
        link: function (scope, element) {

            // append svg element
            var svg = d3.select(element[0]).append('svg')
                .attr('class', 'axis')
                .append('g');

            scope.$on('adjustTopPostition', function (event, position) {
                element.css('top', position + 15 + 'px');
            });

            // redraw the timeline when the track width changes
            scope.$watch(function () { return scope.xScale; }, function () {
                element.css("width", scope.xOffset + scope.xScale(scope.playLength + 1) + 'px');  // scale to correct width

                // this formula was arbitrarily determined to do well for scaling
                // the tick intervals in the timeline based on song length and
                // zoom level
                // var measures = scope.playLength;
                // var measures2 = Math.pow(2, Math.round(Math.log2(measures)));
                // var width2 = Math.pow(2, Math.round(Math.log2(element.width())));
                // var labelInterval = Math.round(Math.max(1,measures2*(measures2/width2)/2));
                // var tickInterval = labelInterval / 4.0;

                var n = 1;
                var intervals = scope.getZoomIntervals(scope.trackWidth, scope.measureLineZoomIntervals);

                // create d3 axis
                var measureline = d3.svg.axis()
                    .scale(scope.xScale) // scale ticks according to zoom
                    .orient("bottom")
                    .tickValues(d3.range(1, scope.playLength + 1, intervals.tickInterval))
                    .tickSize(15)
                    .tickFormat(function (d) {
                        //choose the next tick based on interval
                        if (n === 1) {
                            n = intervals.labelInterval + d;
                            return d;
                        } else {
                            if (d === n) {
                                n = intervals.labelInterval + n;
                                return d;
                            }
                        }
                        return '';
                    });

                // append axis to timeline dom element
                d3.select(element[0]).select('svg.axis g')
                    .call(measureline)
                    .selectAll("text")
                    //move the first text element to fit inside the view
                    .style("text-anchor", "start")
                    .attr('y', 2)
                    .attr('x', 3);

                if (intervals.tickDivision > 1) {
                    n = 1;
                    d3.select(element[0]).selectAll('svg .tick')
                        .filter(function (d) {
                            if (n === 1) {
                                n = intervals.tickDivision + d;
                                return false;
                            } else {
                                if (d === n) {
                                    n = intervals.tickDivision + n;
                                    return false;
                                }
                            }
                            return true;
                        })
                        .select('line')
                        .attr('y1', 8)
                        .attr('y2', 15);

                } else {
                    d3.select(element[0]).selectAll('svg .tick')
                        .filter(function (d) {
                            return d % 1 !== 0;

                        })
                        .select('line')
                        .attr('y1', 8)
                        .attr('y2', 15);

                    d3.select(element[0]).selectAll('svg .tick')
                        .filter(function (d) {
                            return d % 1 === 0;

                        })
                        .select('line')
                        .attr('y1', 0)
                        .attr('y2', 15);
                }
            });

        }
    }
});

/**
 * Angular directive / controller for the DAW timeline element.
 * @module dawTimeline
 */
app.directive('dawTimeline', function () {
    return {
        require: '^daw',
        link: function (scope, element) {

            // append svg element
            var svg = d3.select(element[0]).append('svg')
                .attr('class', 'axis')
                .append('g');

            scope.$on('adjustTopPostition', function (event, position) {
                element.css('top', position + 'px');
            });

            // redraw the timeline when the track width changes
            scope.$watch(function () { return scope.timeScale; }, function () {
                element.css("width", scope.xOffset + scope.xScale(scope.playLength + 1) + 'px');  // scale to correct width

                var intervals = scope.getZoomIntervals(scope.trackWidth, scope.timeLineZoomIntervals);

                // create d3 axis
                var timeline = d3.svg.axis()
                    .scale(scope.timeScale) // scale ticks according to zoom
                    .orient("bottom")
                    .tickValues(d3.range(0, scope.songDuration + 1, intervals.tickInterval))
                    .tickFormat(function (d) {
                        return d3.time.format("%M:%S")(new Date(1970, 0, 1, 0, 0, d));
                    });

                // append axis to timeline dom element
                d3.select(element[0]).select('svg.axis g')
                    .call(timeline)
                    .selectAll("text")
                    // move the first text element to fit inside the view
                    .style("text-anchor", "start")
                    .attr('y', 6)
                    .attr('x', 2);
            });

        }
    }
});

/**
 * Angular directive / controller for DAW mix track
 * @module dawMixTrack
 */
app.directive('dawMixTrack', function () {
    return {
        require: '^daw',
        templateUrl: 'templates/daw-mix-track.html',
        transclude: true,
        link: function (scope, element) {
            // scale width to zoom amount
            scope.$watch(function () { return scope.xScale; }, function () {
                element.css('width',
                    scope.xOffset + scope.xScale(scope.playLength) + 'px'
                );
            });
        }
    }
});

/**
 * Angular directive / controller for each DAW track
 * @module dawTrackController
 */
app.directive('dawTrack', function () {
    return {
        require: '^daw',
        templateUrl: 'templates/daw-track.html',
        transclude: true,
        controller: ['$scope', 'player', function ($scope, player) {

            /**
             * @name toggleSolo
             * @function
             */
            $scope.toggleSolo = function () {
                var temp = $scope.metronome.mute;

                if (!$scope.track.solo) {
                    // solo
                    for (var i in $scope.tracks) {
                        if ($scope.tracks.hasOwnProperty(i)) {
                            // TODO: why is this a string...?
                            i = parseInt(i);
                            // mute tracks that are not soloed
                            if (!$scope.tracks[i].solo) {
                                $scope.muteTrack(i);
                            }
                        }
                    }
                    // unmute and solo this track
                    $scope.unmuteTrack($scope.trackNum);
                    $scope.soloTrack($scope.trackNum)
                } else {
                    // unsolo

                    $scope.unsoloTrack($scope.trackNum);

                    if ($scope.hasSoloTracks()) {
                        $scope.muteTrack($scope.trackNum);
                    } else {
                        for (var i in $scope.tracks) {
                            if ($scope.tracks.hasOwnProperty(i)) {
                                // TODO: why is this a string...?
                                i = parseInt(i);
                                $scope.unmuteTrack(i);
                            }
                        }
                    }

                }

                // mix and metronome are unaffected
                $scope.mix.mute = false;
                $scope.metronome.mute = temp;
                player.setMutedTracks($scope.tracks);
            };

            /**
             * @name toggleMute
             * @function
             */
            $scope.toggleMute = function () {
                var temp = $scope.metronome.mute;
                
                if ($scope.track.mute) {
                    $scope.unmuteTrack($scope.trackNum);
                } else {
                    $scope.muteTrack($scope.trackNum);

                    if ($scope.track.solo) {
                        $scope.unsoloTrack($scope.trackNum);
                    }
                }

                // mix and metronome are unaffected
                $scope.mix.mute = false;
                $scope.metronome.mute = temp;
                player.setMutedTracks($scope.tracks);
            }
        }],
        link: function (scope, element) {
            // scale width to zoom amount
            scope.$watch(function () { return scope.xScale; }, function () {
                element.css('width',
                    scope.xOffset + scope.xScale(scope.playLength) + 'px'
                );
            });
        }
    }
});

/**
 * Angular directive / controller for each DAW clip
 * @module dawClip
 */
app.directive('dawClip', ['audioLibrary', 'WaveformCache', 'ESUtils', 'esconsole',
    function (audioLibrary, WaveformCache, ESUtils, esconsole) {
        return {
            require: '^daw',
            link: function (scope, element) {
                function drawWaveform(element, waveform, width, height) {
                    var cvs = d3.select(element[0]).select('canvas')
                        .attr('width', width)
                        .attr('height', height);

                    var interval = width / waveform.length;
                    var pos = 0;
                    var zero = height / 2;
                    var magScaled = 0;

                    var ctx = cvs.node().getContext('2d');
                    ctx.strokeStyle = '#427EB0';
                    ctx.fillStyle = "#181818";
                    ctx.lineWidth = interval > 1 ? interval * 0.9 : interval; // give some space between bins
                    ctx.beginPath();
                    for (var i = 0; i < waveform.length; i++) {
                        pos = i * interval + 0.5; // pixel offset needed to avoid canvas blurriness
                        // TODO: include this scaling in the preprocessing if possible
                        magScaled = waveform[i] * height / 2;
                        ctx.moveTo(pos, zero + magScaled);
                        ctx.lineTo(pos, zero - magScaled);
                    }
                    ctx.stroke();
                    ctx.closePath();
                }

                // scale width to zoom amount
                scope.$watch(function () { return scope.xScale; }, function () {
                    // esconsole('horizontal zoom changed', 'dawclip');

                    // calculate display width
                    var clipWidth = scope.xScale(
                        scope.clip.end - scope.clip.start + 1
                    );
                    // adjust size and position of the clip based on scale
                    element.css('width', clipWidth + 'px');
                    // position clip at start location
                    element.css('left', scope.xScale(
                        scope.clip.measure
                    ) + 'px');

                    var waveform = [];

                    if (WaveformCache.checkIfExists(scope.clip)) {
                        waveform = WaveformCache.get(scope.clip);
                        drawWaveform(element, waveform, clipWidth, scope.trackHeight);
                    }
                });

                scope.$on('changeTrackHeight', function (event, height) {
                    // esconsole('vertical zoom changed', 'dawclip');

                    // calculate display width
                    var clipWidth = scope.xScale(
                        scope.clip.end - scope.clip.start + 1
                    );

                    var waveform = [];

                    if (WaveformCache.checkIfExists(scope.clip)) {
                        waveform = WaveformCache.get(scope.clip);
                        drawWaveform(element, waveform, clipWidth, scope.trackHeight);
                    }
                });
            }
        }
    }]);

/**
 * Angular directive for the daw clip name element
 * @module dawClipName
 */
app.directive('dawClipName', function () {
    return {
        require: '^daw',
        link: function (scope, element) {
            scope.$watch(function () { return scope.xScale; }, function () {
                var clipWidth = scope.xScale(
                    scope.clip.end - scope.clip.start + 1
                );
                // adjust size and position of the clip based on scale
                element.css('width', clipWidth + 'px');
            });
        }
    };
});

/**
 * Angular directive / controller for the DAW Effect tracks
 * @module dawEffect
 */
app.directive('dawEffect', ['applyEffects', function (applyEffects) {

    return {
        require: '^daw',
        controller: ['$scope', 'player', function ($scope, player) {

            $scope.toggleBypass = function () {
                var i = $scope.effect[0].track +
                    $scope.effect[0].name +
                    $scope.effect[0].parameter;

                if ($scope.effect.bypass) {
                    $scope.effect.bypass = false;
                    // update preservation values
                    if ($scope.preserve.bypass.indexOf(i) >= 0) {
                        $scope.preserve.bypass.splice(
                            $scope.preserve.bypass.indexOf(i)
                            , 1);
                    }
                } else {
                    $scope.effect.bypass = true;
                    // update preservation values
                    if ($scope.preserve.bypass.indexOf(i) < 0) {
                        $scope.preserve.bypass.push(i);
                    }
                }

                player.setBypassedEffects($scope.tracks);
            }
        }],
        link: function (scope, element) {

            // helper function to build a d3 plot of the effect
            function drawEffectWaveform() {
                var points = [];

                // scope.effect = { 0: segment1, 1: segment2, etc., visible, bypass }
                // TODO: hacky and will probably introduce bugs
                var fxSegmentIdx = Object.keys(scope.effect).filter(function (v) {
                    return !isNaN(parseInt(v));
                });

                fxSegmentIdx.forEach(function (v) {
                    var range = scope.effect[v];
                    points.push({
                        x: range.startMeasure,
                        y: range.inputStartValue
                    });
                    points.push({
                        x: range.endMeasure,
                        y: range.inputEndValue
                    });
                });

                // draw a line to the end
                points.push({
                    x: scope.playLength + 1,
                    y: points[points.length - 1].y
                });
                // This sorting sometimes causes the ramp boundaries to be mixed up. For now, we sort them beforehand in fixClips() in compiler.js;
                //points.sort(function (a, b) {
                //    return a.x - b.x;
                //});

                var defaults = applyEffects.effectDefaults[scope.effect[0].name]
                [scope.effect[0].parameter];

                var x = d3.scale.linear()
                    .domain([1, scope.playLength + 1])
                    .range([0, scope.xScale(scope.playLength + 1)]);
                var y = d3.scale.linear()
                    .domain([defaults.min, defaults.max])
                    .range([scope.trackHeight - 5, 5]);

                // map (x,y) pairs into a line
                var line = d3.svg.line().interpolate("linear")
                    .x(function (d) {
                        return x(d.x);
                    })
                    .y(function (d) {
                        return y(d.y);
                    });

                return line(points);
            }

            scope.$watch(function () { return scope.xScale; }, function () {
                // scale width to zoom amount
                element.css('width', scope.xScale(
                    scope.playLength
                ) + 'px');

                // update SVG waveform
                d3.select(element[0])
                    .select("svg.effectSvg")
                    .select("path")
                    .attr("d", drawEffectWaveform());
            });

            scope.$on('changeTrackHeight', function (event, height) {
                // update SVG waveform
                d3.select(element[0])
                    .select("svg.effectSvg")
                    .select("path")
                    .attr("d", drawEffectWaveform());

                var parameter = applyEffects.effectDefaults[scope.effect[0].name][scope.effect[0].parameter];

                var yScale = d3.scale.linear()
                    .domain([parameter.max, parameter.min])
                    .range([0, scope.trackHeight]);

                var axis = d3.svg.axis()
                    .scale(yScale)
                    .orient('right')
                    .tickValues([parameter.max, parameter.min])
                    .tickFormat(d3.format("1.1f"));

                d3.select(element[0]).select('svg.effectAxis g')
                    .call(axis)
                    .select('text').attr('transform', 'translate(0,10)');

                // move the bottom label with this atrocious mess
                d3.select(d3.select(element[0]).select('svg.effectAxis g')
                    .selectAll('text')[0][1]).attr('transform', 'translate(0,-10)');
            });
        }
    };

}]);

/**
 * Angular directive for detecting change in the size of zoom container
 * Used to reset zoom sliders when DAW is resized
 * @module dawEffect
 */
app.directive('sizeChanged', function () {
    return {
        require: '^daw',
        link: function (scope, element) {

            scope.$watch(function () { return element.width(); }, function () {
                scope.$broadcast('rzSliderForceRender');
            });

            scope.$watch(function () { return element.height(); }, function () {
                scope.$broadcast('rzSliderForceRender');
            });
        }
    }
});

/**
 * Angular directive for detecting change in the size of daw header container
 * Used to handle the display of the DAW title
 * @module dawEffect
 */
app.directive('widthExceeded', function () {
    return {
        require: '^daw',
        link: function (scope, element) {

            scope.checkOptimumWidthForTitle = function () {
                if (element.width() > 540) {
                    scope.showFullTitle = true;
                    scope.showShortTitle = false;
                    scope.showIcon = true;
                } else if (element.width() > 412) {
                    scope.showFullTitle = false;
                    scope.showShortTitle = true;
                    scope.showIcon = true;
                } else if (element.width() > 375) {
                    scope.showFullTitle = false;
                    scope.showShortTitle = false;
                    scope.showIcon = true;
                } else {
                    scope.showFullTitle = false;
                    scope.showShortTitle = false;
                    scope.showIcon = false;
                }
                if (scope.isEmbedded) {
                    scope.showFullTitle = false;
                    scope.showShortTitle = true;
                    scope.showIcon = true;
                }
            };

            scope.$watch(function () { return element.width(); }, function () {
                scope.checkOptimumWidthForTitle();
            });
        }
    }
});

/**
 * Angular directive for daw playhead
 * @module dawEffect
 */
app.directive('dawPlayHead', ['$animateCss', function ($animateCss) {
    return {
        restrict: 'E',
        scope: {},
        link: function (scope, element) {
            element.addClass('daw-marker');
            element.css('top', '0px');

            scope.$on('adjustPlayHead', function (event, topPos) {
                element.css('top', topPos + 'px');
            });

            scope.$on('setPlayHeadPosition', function (event, currentPosition) {
                element.css('left', currentPosition + 'px');
            });
        }
    }
}]);

app.directive('dawSchedPlayhead', [function () {
    return {
        restrict: 'E',
        scope: {},
        link: function (scope, element) {
            element.css('top', '0px');

            scope.$on('adjustPlayHead', function (event, topPos) {
                element.css('top', topPos + 'px');
            });

            scope.$on('setSchedPlayheadPosition', function (event, currentPosition) {
                element.css('left', currentPosition + 'px');
            });

            scope.$on('setSchedPlayheadVisibility', function (event, visible) {
                if (visible) {
                    element.addClass('daw-sched-marker');
                } else {
                    element.removeClass('daw-sched-marker');
                }
            });
        }
    }
}]);

/**
 * Angular directive for daw cursor
 * @module dawEffect
 */
app.directive('dawCursor', function () {
    return {
        restrict: 'E',
        scope: {},
        link: function (scope, element) {
            element.addClass('daw-cursor');
            element.css('top', '0px');

            scope.$on('setSchedPlayheadVisibility', function (event, visible) {
                if (visible) {
                    element.removeClass('daw-cursor');
                } else {
                    element.addClass('daw-cursor');
                }
            });

            scope.$on('setCurrentPosition', function (event, position) {
                element.addClass('daw-cursor'); // this is safe
                element.css('left', position + 'px');
            });

            scope.$on('adjustTopPostition', function (event, position) {
                element.css('top', position + 'px');
            });
        }
    }
});

/**
 * Angular directive for daw Loop highlight
 * @module dawEffect
 */
app.directive('dawHighlight', function () {
    return {
        restrict: 'E',
        scope: {},
        link: function (scope, element) {
            element.addClass('daw-highlight');
            element.css('top', '0px');
        }
    }
});

/**
 * Angular directive for daw Track Panel
 * @module dawEffect
 */
app.directive('trackPanelPosition', function () {
    return {
        restrict: 'A',
        scope: {},
        link: function (scope, element) {
            element.addClass('dawTrackCtrl');
            scope.$on('adjustLeftPostition', function (event, position) {
                element.css('left', position + 'px');
            });
        }
    }
});

/**
 * Angular directive for daw Track Effect Panel
 * @module dawEffect
 */
app.directive('trackEffectPanelPosition', function () {
    return {
        restrict: 'A',
        scope: {},
        link: function (scope, element) {
            element.addClass('dawEffectCtrl');
            scope.$on('adjustLeftPostition', function (event, position) {
                element.css('left', position + 'px');
            });
        }
    }
});


