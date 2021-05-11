// Play sounds from the JSON object output of scripts.

// TODO: Move to compiler?
export interface Pitchshift {
    audio: AudioBuffer
    start: number
    end: number
}

export interface Clip {
    filekey: string
    loopChild: boolean
    measure: number
    start: number
    end: number
    audio: AudioBuffer
    pitchshift?: Pitchshift
    playing?: boolean
    source?: AudioBufferSourceNode
    gain?: GainNode
}

export interface EffectRange {
    name: string
    parameter: string
    startMeasure: number
    endMeasure: number
    inputStartValue: number
    inputEndValue: number
}

export type Effect = EffectRange[] & {bypass?: boolean}

export interface Track {
    clips: Clip[]
    effects: {[key: string]: Effect}
    analyser: AnalyserNode
    label?: string | number
    visible?: boolean
    buttons?: boolean
    mute?: boolean
}

export interface Result {
    tempo: number
    length: number
    tracks: Track[]
    master: GainNode
}

export const Player = (context: AudioContext & {master: GainNode}, applyEffects: any, ESUtils: any, timesync: any) => {
    let isPlaying = false

    let waTimeStarted = 0

    let playStartTimer = 0
    let playEndTimer = 0
    let loopSchedTimer = 0

    let playbackData = {
        startMeasure: 1,
        endMeasure: 1,
        playheadPos: 1,
        startOffset: 0
    }

    let loop = {
        on: false,
        start: 0,
        end: 0,
        selection: false,
    }
    let loopScheduledWhilePaused = false
    let firstCycle = true

    let renderingDataQueue: (Result | null)[] = [null, null]
    let mutedTracks: number[] = []
    let bypassedEffects: {[key: number]: string[]} = {}

    let onStartedCallback = () => {}
    let onFinishedCallback = reset

    function reset() {
        esconsole('resetting', ['player', 'debug'])

        clearAllAudioGraphs()
        mutedTracks = []
        bypassedEffects = {}
        renderingDataQueue = [null, null]
        firstCycle = true

        clearAllTimers()

        playbackData = {
            startMeasure: 1,
            endMeasure: 1,
            playheadPos: 1,
            startOffset: 0
        }
    }

    function clearAllTimers() {
        clearTimeout(playStartTimer)
        clearTimeout(playEndTimer)
        clearTimeout(loopSchedTimer)
    }

    function play(startMes: number, endMes: number, manualOffset=0) {
        esconsole('starting playback',  ['player', 'debug'])
        esconsole('timesync state: ' + timesync.enabled, ['player', 'debug'])

        //==========================================
        // init / convert
        if (loop.on && loop.selection) {
            // startMes = loop.start
            endMes = loop.end
        }

        if (renderingDataQueue[1] === null) {
            esconsole('null in render queue', ['player', 'error'])
            return
        }

        let renderingData = renderingDataQueue[1]

        let tempo = renderingData.tempo
        let startTime = ESUtils.measureToTime(startMes, tempo)
        let endTime = ESUtils.measureToTime(endMes, tempo)
        let timesyncOffset = (timesync.enabled && firstCycle) ? timesync.getSyncOffset(tempo, startTime) : 0

        let startTimeOffset = timesyncOffset + manualOffset
        let waStartTime = context.currentTime + startTimeOffset

        //==========================================
        // construct webaudio graph
        if (renderingData.master) {
            renderingData.master.disconnect()
        }
        renderingData.master = context.createGain()
        renderingData.master.gain.setValueAtTime(1, context.currentTime)

        for (let t = 0; t < renderingData.tracks.length; t++) {
            let track = renderingData.tracks[t]

            // skip muted tracks
            if (mutedTracks.indexOf(t) > -1) continue

            // get the list of bypassed effects for this track
            let trackBypass = bypassedEffects[t] ?? []
            esconsole('Bypassing effects: ' + JSON.stringify(trackBypass), ['DEBUG','PLAYER'])

            // construct the effect graph
            applyEffects.resetAudioNodeFlags()
            let startNode = applyEffects.buildAudioNodeGraph(context, track, t, tempo, startTime, renderingData.master, trackBypass, 0)

            let trackGain = context.createGain()
            trackGain.gain.setValueAtTime(1.0, context.currentTime)

            //======== process each clip in the track ==========
            for (let c = 0; c < track.clips.length; c++) {
                let clipData = track.clips[c]

                let clipStartTime = ESUtils.measureToTime(clipData.measure, tempo)
                let startTimeInClip, endTimeInClip // start/end locations within clip

                let clipSource = context.createBufferSource()
                let pitchShift = track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT']

                // set buffer & start/end time within clip
                if (pitchShift && !pitchShift.bypass) {
                    esconsole('Using pitchshifted audio for ' + clipData.filekey + ' on track ' + t, ['player', 'debug'])
                    clipSource.buffer = clipData.pitchshift!.audio
                    startTimeInClip = ESUtils.measureToTime(clipData.pitchshift!.start, tempo)
                    endTimeInClip = ESUtils.measureToTime(clipData.pitchshift!.end, tempo)
                } else {
                    clipSource.buffer = clipData.audio
                    startTimeInClip = ESUtils.measureToTime(clipData.start, tempo)
                    endTimeInClip = ESUtils.measureToTime(clipData.end, tempo)
                }

                // the clip duration may be shorter than the buffer duration
                let clipDuration = endTimeInClip - startTimeInClip
                let clipEndTime = clipStartTime + clipDuration

                if (startTime >= clipEndTime) {
                    // case: clip is in the past: skip the clip
                    continue
                } else if (startTime >= clipStartTime && startTime < clipEndTime) {
                    // case: clip is playing from the middle
                    let clipStartOffset = startTime - clipStartTime

                    // if the loop end is set before the clip end
                    if (clipEndTime > endTime) {
                        clipDuration = endTime - clipStartTime
                    }

                    // clips -> track gain -> effect tree
                    clipSource.connect(trackGain)
                    clipSource.start(waStartTime, startTimeInClip+clipStartOffset, clipDuration-clipStartOffset)

                    // keep this flag so we only stop clips that are playing (otherwise we get an exception raised)
                    setTimeout((function (clip_) {
                        return function () {
                            clip_.playing = true
                        }
                    })(clipData), startTimeOffset * 1000)
                } else {
                    // case: clip is in the future
                    let untilClipStart = clipStartTime - startTime

                    // if the loop end is set before the clip
                    if (clipStartTime > endTime) {
                        continue // skip this clip
                    }

                    // if the loop end is set before the clip end
                    if (clipEndTime > endTime) {
                        clipDuration = endTime - clipStartTime
                    }

                    clipSource.connect(trackGain)
                    clipSource.start(waStartTime+untilClipStart, startTimeInClip, clipDuration)

                    setTimeout((function (clip_) {
                        return function () {
                            clip_.playing = true
                        }
                    })(clipData), (startTimeOffset + untilClipStart) * 1000)
                }

                // keep a reference to this audio source so we can pause it
                clipData.source = clipSource
                clipData.gain = trackGain // used to mute the track/clip

                if (ESUtils.whichBrowser().indexOf('Chrome') === -1) {
                    clipData.source.onended = (function (source) {
                        return function () {
                            source.disconnect()
                        }
                    })(clipData.source)
                }
            }

            //==================================================
            // connect the track output to the effect tree
            if (t === 0) {
                // if master track
                renderingData.master.connect(trackGain)

                // if there is at least one effect set in master track
                if (typeof(startNode) !== "undefined") {
                    // TODO: master not connected to the analyzer?
                    trackGain.connect(startNode.input)
                    // effect tree connects to the context.master internally
                } else {
                    // if no effect set
                    trackGain.connect(track.analyser)
                    track.analyser.connect(context.master)
                }

                context.master.connect(context.destination)
            } else {
                if (typeof(startNode) !== "undefined") {
                    // track gain -> effect tree
                    trackGain.connect(startNode.input)
                } else {
                    // track gain -> (bypass effect tree) -> analyzer & master
                    trackGain.connect(track.analyser)
                    track.analyser.connect(renderingData.master)
                }
            }

            // for setValueAtTime bug in chrome v52
            if (ESUtils.whichBrowser().indexOf('Chrome') > -1 && typeof(startNode) !== 'undefined') {
                let dummyOsc = context.createOscillator()
                let dummyGain = context.createGain()
                dummyGain.gain.value = 0
                dummyOsc.connect(dummyGain).connect(startNode.input)
                dummyOsc.start(startTime)
                dummyOsc.stop(startTime+0.001)
            }
        }

        //==========================================
        // set flags
        clearTimeout(playStartTimer)
        playStartTimer = window.setTimeout(function () {
            if (loop.on) {
                if (loop.selection) {
                    playbackData.startOffset = 0
                    if (startMes > loop.start) {
                        playbackData.startOffset = startMes - loop.start
                    }

                    startMes = loop.start
                    endMes = loop.end
                } else {
                    playbackData.startOffset = startMes - 1
                    startMes = 1
                    endMes = renderingDataQueue[1]!.length + 1
                }

                playbackData.startMeasure = startMes
                playbackData.endMeasure = endMes
            } else {
                playbackData.startOffset = 0
                playbackData.startMeasure = startMes
                playbackData.endMeasure = endMes
            }

            esconsole('recording playback data: ' + [startMes,endMes].toString(), ['player', 'debug'])

            waTimeStarted = waStartTime
            isPlaying = true
            onStartedCallback()
        }, startTimeOffset * 1000)

        firstCycle = false

        //==========================================
        // check the loop state and schedule loop near the end also cancel the onFinished callback
        if (loop.on && loopScheduledWhilePaused) {
            clearTimeout(loopSchedTimer)
            loopSchedTimer = window.setTimeout(function () {
                esconsole('scheduling loop', ['player', 'debug'])
                clearTimeout(loopSchedTimer)
                clearTimeout(playEndTimer)
                let offset = timesync.enabled ? timesync.getSyncOffset(tempo, 0) : (endTime-startTime)-(context.currentTime-waTimeStarted)
                clearAllAudioGraphs(offset)
                loopScheduledWhilePaused = true
                play(startMes, endMes, offset)
            }, (endTime-startTime+startTimeOffset) * 1000 * .95)
        }

        //==========================================
        // schedule to call the onFinished callback
        clearTimeout(playEndTimer)
        playEndTimer = window.setTimeout(function () {
            esconsole('playbackTimer ended', 'player')
            pause()
            onFinishedCallback()
        }, (endTime-startTime+startTimeOffset) * 1000)
    }

    function pause(delay=0) {
        esconsole('pausing',  ['player', 'debug'])

        clearAllAudioGraphs(delay)

        setTimeout(function () {
            isPlaying = false
            playbackData.playheadPos = playbackData.startMeasure
        }, delay * 1000)

        clearTimeout(playEndTimer)
        clearTimeout(loopSchedTimer)
    }

    function stopAllClips(renderingData: Result | null, delay: number) {
        if (!renderingData) {
            return
        }

        for (let t = 0; t < renderingData.tracks.length; t++) {
            let track = renderingData.tracks[t]
            for (let c = 0; c < track.clips.length; c++) {
                let clip = track.clips[c]

                if (clip.source !== undefined) {
                    try {
                        clip.source.stop(context.currentTime + delay)
                    } catch (e) {
                        // TODO: Why does Safari throw an InvalidStateError?
                        esconsole(e.toString(), ['WARNING','PLAYER'])
                    }
                    setTimeout((function (source) {
                        return function () {
                            source.disconnect()
                        }
                    })(clip.source), delay * 999)
                    clip.playing = false
                }
            }
        }

        // if (renderingData.master !== undefined) {
            // renderingData.master.disconnect()
        // }
    }

    function clearAudioGraph(idx: number, delay=0) {
        if (ESUtils.whichBrowser().indexOf('Chrome') !== -1) {
            stopAllClips(renderingDataQueue[idx], delay)
        } else {
            if (!delay) {
                stopAllClips(renderingDataQueue[idx], delay)
            } else {
                const renderData = renderingDataQueue[idx]
                if (renderData === null) {
                    return
                }

                for (let t = 0; t < renderData.tracks.length; t++) {
                    let track = renderData.tracks[t]
                    for (let c = 0; c < track.clips.length; c++) {
                        let clip = track.clips[c]

                        if (clip.source !== undefined) {
                            try {
                                clip.source.stop(context.currentTime + delay)
                                clip.gain!.gain.setValueAtTime(0, context.currentTime + delay)
                            } catch (e) {
                                esconsole(e.toString(), ['player', 'warning'])
                            }
                            clip.playing = false
                        }
                    }
                }

                if (renderData.master !== undefined) {
                    renderData.master.gain.setValueAtTime(0, context.currentTime + delay)
                }
            }
        }
    }

    function clearAllAudioGraphs(delay=0) {
        esconsole('clearing the audio graphs',  ['player', 'debug'])
        clearAudioGraph(0, delay)
        clearAudioGraph(1, delay)
    }

    function timedRefresh(clearAllGraphs=false) {
        if (isPlaying) {
            esconsole('refreshing the rendering data', ['player', 'debug'])
            let currentMeasure = getCurrentPosition()
            let nextMeasure = Math.ceil(currentMeasure)
            let timeTillNextBar = ESUtils.measureToTime(nextMeasure-currentMeasure+1, renderingDataQueue[1]!.tempo)

            if (clearAllGraphs) {
                clearAllAudioGraphs(timeTillNextBar)
            } else {
                clearAudioGraph(0, timeTillNextBar)
            }

            let startMeasure = nextMeasure === playbackData.endMeasure ? playbackData.startMeasure : nextMeasure
            play(startMeasure, playbackData.endMeasure, timeTillNextBar)
        }
    }

    /**
     * Mute a track currently playing in a given result object.
     *
     * @param {object} result The compiled result object
     * reference obtained from player.play().
     * @param {int} num The track number to mute.
     */
    function muteTrack(result: Result, num: number) {
        let track = result.tracks[num]
        for (let i = 0; i < track.clips.length; i++) {
            const gain = track.clips[i].gain
            if (gain !== undefined) {
                gain.gain.setValueAtTime(0.0, context.currentTime)
            }
        }
    }

    /**
     * Unmute a track currently playing.
     *
     * @param {object} result The compiled result object
     * reference obtained from player.play().
     * @param {int} num The track number to unmute.
     */
    function unmuteTrack(result: Result, num: number) {
        let track = result.tracks[num]
        for (let i = 0; i < track.clips.length; i++) {
            const gain = track.clips[i].gain
            if (gain !== undefined) {
                gain.gain.setValueAtTime(1.0, context.currentTime)
            }
        }
    }

    /**
     * Set the playback volume of a result.
     *
     * @param {object} result The compiled result object
     * reference obtained from player.play().
     * @param {float} gain The volume to play at in decibels.
     */

    function setVolume(gain: number) {
        esconsole('Setting context volume to ' + gain + 'dB', ['DEBUG','PLAYER'])
        if (context.master !== undefined) {
            context.master.gain.setValueAtTime(applyEffects.dbToFloat(gain), context.currentTime)
        }
    }

    function setLoop(loopObj: typeof loop) {
        if (loopObj && loopObj.hasOwnProperty('on')) {
            loop = loopObj
        } else {
            loop.on = !!loopObj

            // use max range
            playbackData.startMeasure = 1
            playbackData.endMeasure = renderingDataQueue[1]!.length + 1
        }
        esconsole('setting loop: ' + loop.on, ['player', 'debug'])

        clearAllTimers()

        let currentMeasure, startMes: number, endMes: number

        if (loop.on) {
            if (isPlaying) {
                esconsole('loop switched on while playing', ['player', 'debug'])
                loopScheduledWhilePaused = false

                currentMeasure = getCurrentPosition()
                let timeTillLoopingBack = 0

                if (loop.selection) {
                    startMes = loop.start
                    endMes = loop.end

                    if (currentMeasure >= startMes && currentMeasure < endMes) {
                        if (currentMeasure < endMes - 1) {
                            startMes = Math.ceil(currentMeasure)
                            timeTillLoopingBack = ESUtils.measureToTime(2-(currentMeasure%1), renderingDataQueue[1]!.tempo)
                        } else {
                            timeTillLoopingBack = ESUtils.measureToTime(endMes-currentMeasure+1, renderingDataQueue[1]!.tempo)
                        }
                    } else {
                        timeTillLoopingBack = ESUtils.measureToTime(2-(currentMeasure%1), renderingDataQueue[1]!.tempo)
                    }
                } else {
                    timeTillLoopingBack = ESUtils.measureToTime(renderingDataQueue[1]!.length-currentMeasure+2, renderingDataQueue[1]!.tempo)
                    startMes = 1
                    endMes = renderingDataQueue[1]!.length + 1
                }

                esconsole(`timeTillLoopingBack = ${timeTillLoopingBack}, startMes = ${startMes}, endMes = ${endMes}`, ['player', 'debug'])

                // Schedule the next loop.
                // This is analagous to what play() does when loopScheduledWhilePaused = true.
                const waStartTime = context.currentTime
                clearTimeout(loopSchedTimer)
                loopSchedTimer = window.setTimeout(() => {
                    esconsole('scheduling loop', ['player', 'debug'])
                    clearTimeout(loopSchedTimer)
                    clearTimeout(playEndTimer)
                    const offset = timeTillLoopingBack - (context.currentTime - waStartTime)
                    clearAllAudioGraphs(offset)
                    loopScheduledWhilePaused = true
                    play(startMes, endMes, offset)
                }, timeTillLoopingBack * 1000 * .95)
            } else {
                loopScheduledWhilePaused = true
            }
        } else {
            clearTimeout(loopSchedTimer)
            loopScheduledWhilePaused = false

            if (isPlaying) {
                esconsole('loop switched off while playing', ['player', 'debug'])
                currentMeasure = getCurrentPosition()

                esconsole(`currentMeasure = ${currentMeasure}, playbackData.endMeasure = ${playbackData.endMeasure}, renderingDataQueue[1].length = ${renderingDataQueue[1]!.length}`, ['player', 'debug'])
                if (currentMeasure < playbackData.endMeasure && playbackData.endMeasure <= (renderingDataQueue[1]!.length+1)) {
                    clearTimeout(playStartTimer)
                    clearTimeout(playEndTimer)

                    let timeTillContinuedPoint = ESUtils.measureToTime(playbackData.endMeasure-currentMeasure+1, renderingDataQueue[1]!.tempo)

                    startMes = playbackData.endMeasure
                    endMes = renderingDataQueue[1]!.length+1

                    clearAllAudioGraphs(timeTillContinuedPoint)
                    play(startMes, endMes, timeTillContinuedPoint)
                }
            }
        }
    }

    function setRenderingData(result: Result) {
        esconsole('setting new rendering data', ['player', 'debug'])

        clearAudioGraph(0)
        renderingDataQueue.shift()
        renderingDataQueue.push(result)

        if (isPlaying) {
            timedRefresh()
        } else {
            clearAllAudioGraphs()
        }
    }

    function setPosition(position: number) {
        esconsole('setting position: ' + position, ['player', 'debug'])

        clearAllTimers()

        if (isPlaying) {
            let currentMeasure, timeTillNextBar
            currentMeasure = getCurrentPosition()

            if (loop.on) {
                loopScheduledWhilePaused = true

                if (loop.selection) {
                    // playbackData.startMeasure = loop.start
                    // playbackData.endMeasure = loop.end
                } else {
                    playbackData.endMeasure = renderingDataQueue[1]!.length+1
                }
            }

            timeTillNextBar = ESUtils.measureToTime(2-(currentMeasure%1), renderingDataQueue[1]!.tempo)

            clearAllAudioGraphs(timeTillNextBar)
            play(position, playbackData.endMeasure, timeTillNextBar)
        } else {
            playbackData.playheadPos = position
        }
    }

    function getCurrentPosition() {
        if (isPlaying) {
            playbackData.playheadPos = (context.currentTime-waTimeStarted) * renderingDataQueue[1]!.tempo/60/4 + playbackData.startMeasure + playbackData.startOffset
        }
        return playbackData.playheadPos
    }

    function setOnStartedCallback(callbackFn: () => void) {
        onStartedCallback = callbackFn
    }

    function setOnFinishedCallback(callbackFn: () => void) {
        onFinishedCallback = function () {
            reset()
            callbackFn()
        }
    }

    function setMutedTracks(_mutedTracks: number[]) {
        mutedTracks = _mutedTracks

        if (isPlaying) {
            timedRefresh(true)
        }
    }

    function setBypassedEffects(_bypassedEffects: {[key: number]: string[]}) {
        bypassedEffects = _bypassedEffects

        if (isPlaying) {
            timedRefresh(true)
        }
    }

    return {
        play: play,
        pause: pause,
        reset: reset,
        refresh: timedRefresh,
        setOnStartedCallback: setOnStartedCallback,
        setOnFinishedCallback: setOnFinishedCallback,
        setMutedTracks: setMutedTracks,
        setBypassedEffects: setBypassedEffects,
        muteTrack: muteTrack,
        unmuteTrack: unmuteTrack,
        setVolume: setVolume,
        setRenderingData: setRenderingData,
        setPosition: setPosition,
        setLoop: setLoop,
        getCurrentPosition: getCurrentPosition
    }
}