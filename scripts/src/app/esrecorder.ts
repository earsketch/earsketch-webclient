import audioContext from "./audiocontext"
import * as ESUtils from "../esutils"
import * as helpers from "../helpers"
import { encodeWAV } from "./renderer"

const RECORDER_OPTIONS = {
    bufferLen: 2048,
    numChannels: 1
} as const

let audioRecorder: any  // Recorder from lib/recorderjs/recorder.js
let meter: any  // AudioMeter from lib/volume-meter.js
let micGain: GainNode | null
let previewSource: AudioBufferSourceNode | null
let startTime = 0
let metroOsc: OscillatorNode[] = []
let beatBuffSrc: AudioBufferSourceNode[] = []
let eventBuffSrc: AudioBufferSourceNode[] = []
let curBeat = -1

export let analyserNode: AnalyserNode | null
export let micIsOn = false
export let isRecording = false
export let curMeasure = 0
export let curMeasureShow = 0
export let buffer: AudioBuffer | null
export let hasBuffer = false
export let isPreviewing = false
export let meterVal = 0

export const callbacks = {
    prepareForUpload: (blob: Blob, useMetro: boolean, bpm: number) => {},
    openRecordMenu: () => {},
    micAccessBlocked: (type: string) => {},
    showSpectrogram: () => {},
    showRecordedWaveform: () => {},
    clickOnMetronome: (beat: number) => {},
}

export const properties = {
    useMetro: true,
    clicks: false,
    bpm: 120,
    countoff: 1,
    numMeasures: 2,
}

export function clear(softClear?: boolean) {
    audioRecorder = null
    previewSource = null

    if (!softClear) {
        micIsOn = false
    }
    isRecording = false
    curMeasure = 0
    curMeasureShow = 0
    curBeat = -1
    buffer = null
    hasBuffer = false
    isPreviewing = false
    meterVal = 0

    callbacks.showRecordedWaveform()
}

export function init() {
    clear()

    meter = createAudioMeter(audioContext, 1, 0.95, 500)
    micGain = audioContext.createGain()  // to feed to the recorder
    startTime = 0
    metroOsc = []
    beatBuffSrc = []
    eventBuffSrc = []

    const audioOptions = {
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        }
    }

    micGain.gain.value = 1

    const nav = navigator as any
    if (!nav.getUserMedia)
        nav.getUserMedia = nav.webkitGetUserMedia || nav.mozGetUserMedia
    if (!nav.cancelAnimationFrame)
        nav.cancelAnimationFrame = nav.webkitCancelAnimationFrame || nav.mozCancelAnimationFrame
    if (!nav.requestAnimationFrame)
        nav.requestAnimationFrame = nav.webkitRequestAnimationFrame || nav.mozRequestAnimationFrame

    if (!micIsOn) {
        navigator.getUserMedia(audioOptions as MediaStreamConstraints, gotAudio, mediaNotAccessible)
    } 
}

function mediaNotAccessible() {
    if ((ESUtils.whichBrowser().indexOf("Chrome") > -1)) {
        callbacks.micAccessBlocked("chrome_mic_noaccess")
    } else if ((ESUtils.whichBrowser().indexOf("Firefox") > -1)) {
        callbacks.micAccessBlocked("ff_mic_noaccess")
    }
}

function gotAudio(stream: any) {
    micIsOn = true
    callbacks.openRecordMenu();  // proceed to open the record menu UI

    const mic = audioContext.createMediaStreamSource(stream)
    mic.connect(meter)
    mic.connect(micGain!)

    //For drawing spectrogram
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = RECORDER_OPTIONS.bufferLen/2
    mic.connect(analyserNode)

    audioRecorder = new Recorder(micGain, RECORDER_OPTIONS)

    const zeroGain = audioContext.createGain()  // disable monitoring
    zeroGain.gain.value = 0
    micGain!.connect(zeroGain)
    zeroGain.connect(audioContext.destination)

    updateMeter()
    callbacks.showSpectrogram()
}

function scheduleRecord() {
    eventBuffSrc = []

    // start recording immediately
    if (properties.countoff === 0) {
        // reset the recorder audio process timing
        audioRecorder = new Recorder(micGain, RECORDER_OPTIONS)

        audioRecorder.clear()
        audioRecorder.record()
        hasBuffer = false

        startTime = audioContext.currentTime
    } else {
        // start after count off
        buffEventCall(240.0 / properties.bpm * properties.countoff, () => {
            if (isRecording) {
                // reset the recorder instance
                audioRecorder = new Recorder(micGain, RECORDER_OPTIONS)

                audioRecorder.clear()
                audioRecorder.record()
                hasBuffer = false

                startTime = audioContext.currentTime
            }
        })
    }

    // stop recording
    buffEventCall(240.0 / properties.bpm * (properties.countoff + properties.numMeasures + 0.3), () => {
        if (isRecording) {
            toggleRecord()
        }
    })

    // might need to be called as a callback from the audioRecorder
    onRecordStart()
}

function onRecordStart() {
    const sr = audioContext.sampleRate
    const beats = 4
    metroOsc = []
    beatBuffSrc = []

    for (let i = 0; i < (properties.numMeasures + properties.countoff) * beats; i++) {
        // scheduled metronome sounds
        if (i < properties.countoff * beats || properties.clicks) {
            metroOsc[i] = audioContext.createOscillator()
            const metroGain = audioContext.createGain()
            const del = 60.0 / properties.bpm * i + audioContext.currentTime
            const dur = 0.1
            if (i % beats === 0) {
                metroOsc[i].frequency.value = 2000
                metroGain.gain.setValueAtTime(0.25, del)
            } else {
                metroOsc[i].frequency.value = 1000
                metroGain.gain.setValueAtTime(0.5, del)
            }
            metroOsc[i].connect(metroGain)
            metroOsc[i].start(del)
            metroOsc[i].stop(del + dur)
            metroGain.gain.linearRampToValueAtTime(0, del + dur)
            metroGain.connect(audioContext.destination)
        }

        // buffer-based scheduler mainly for visual dots
        // TODO: Creating a blank AudioBuffer and AudioBufferSourceNode just for scheduling
        //       via onended seems like overkill. Wouldn't `setTimeout` suffice here?
        const beatBuff = audioContext.createBuffer(1, sr * 60.0 / properties.bpm, sr)
        const source = audioContext.createBufferSource()
        beatBuffSrc.push(source)
        source.buffer = beatBuff
        source.connect(audioContext.destination)
        source.start(audioContext.currentTime + 60.0 / properties.bpm * i)
        source.onended = () => {
            curBeat = (curBeat + 1) % 4
            callbacks.clickOnMetronome(curBeat)

            if (curBeat === 0) {
                curMeasure++

                if (curMeasure < 0) {
                    curMeasureShow = curMeasure
                } else {
                    curMeasureShow = curMeasure + 1
                }

                helpers.getNgRootScope().$apply()
            }
        }
    }
}

function buffEventCall(lenInSec: number, onEnded: (this: AudioScheduledSourceNode, ev: Event) => any) {
    const sr = audioContext.sampleRate
    const buffSrc = audioContext.createBufferSource()
    buffSrc.buffer = audioContext.createBuffer(1, sr * lenInSec, sr)
    buffSrc.connect(audioContext.destination)
    buffSrc.start(audioContext.currentTime)
    buffSrc.onended = onEnded
    eventBuffSrc.push(buffSrc)
}

export function toggleRecord() {
    if (micIsOn) {
        if (isRecording) {
            stopRecording()
        } else {
            startRecording()
        }
    } else {
        alert("Please make sure that microphone input is turned on.")
    }
}

function startRecording() {
    if (properties.useMetro) {
        checkInputFields()
        curMeasure = -properties.countoff
        curMeasureShow = curMeasure
        curBeat = 0
        scheduleRecord()
    } else {
        hasBuffer = false
        curMeasure = 0
        audioRecorder = new Recorder(micGain, RECORDER_OPTIONS)
        audioRecorder.clear()
        audioRecorder.record()
    }

    isRecording = true
    callbacks.showSpectrogram()
}

function stopRecording() {
    audioRecorder.stop()
    curMeasureShow = 0

    // should have at least > 0 recorded frame
    if (curMeasure > -1) {
        audioRecorder.getBuffer(gotBuffer)
    }

    if (properties.useMetro) {
        stopWebAudioEvents()
        isRecording = false
        curBeat = -1
        curMeasure = 0
        curMeasureShow = 0
    } else {
        isRecording = false
    }
}

function stopWebAudioEvents() {
    for (const node of metroOsc) {
        node.stop(0)
    }
    for (const node of beatBuffSrc.concat(eventBuffSrc)) {
        node.stop(0)
        node.disconnect()
    }
}

function checkInputFields() {
    properties.bpm = Number.parseInt(properties.bpm + "")
    properties.countoff = Number.parseInt(properties.countoff + "")
    properties.numMeasures = Number.parseInt(properties.numMeasures + "")
    // Clamp to valid ranges, replace NaNs with default values.
    properties.bpm = Math.max(30, Math.min(properties.bpm, 480)) || 120
    properties.countoff = Math.max(1, Math.min(properties.countoff, 4)) || 1
    properties.numMeasures = Math.max(1, Math.min(properties.numMeasures, 8)) || 1
}

function updateMeter() {
    meterVal = meter.volume
    requestAnimationFrame(updateMeter)
}

function gotBuffer(buf: Float32Array[]) {
    if (properties.useMetro) {
        const targetLen = Math.round(240.0 / properties.bpm * properties.numMeasures * audioContext.sampleRate)
        const startTimeDiff = properties.countoff > 0 ? 0 : Math.round((audioRecorder.getStartTime() - startTime) * audioContext.sampleRate)

        buffer = audioContext.createBuffer(buf.length, targetLen, audioContext.sampleRate)

        for (let ch = 0; ch < buf.length; ch++) {
            const chdata = buffer.getChannelData(ch)
            for (let i = 0; i < targetLen; i++) {
                chdata[i] = buf[ch][i+startTimeDiff]
            }
        }
    } else {
        buffer = audioContext.createBuffer(buf.length, buf[0].length, audioContext.sampleRate)

        for (let ch = 0; ch < buf.length; ch++) {
            buffer.getChannelData(ch).set(buf[ch])
        }
    }

    callbacks.showRecordedWaveform()
    hasBuffer = true

    const view = encodeWAV(buffer.getChannelData(0))
    const blob = new Blob([view], { type: "audio/wav" })
    doneEncoding(blob)
}

function doneEncoding(blob: any) {
    blob.lastModifiedDate = new Date()
    blob.name = "QUICK_RECORD"
    callbacks.prepareForUpload(blob, properties.useMetro, properties.bpm)
}

export function togglePreview() {
    if (!isPreviewing) {
        startPreview()
    } else {
        stopPreview()
    }
}

function startPreview() {
    if (buffer !== null) {
        isPreviewing = true

        previewSource = audioContext.createBufferSource()
        previewSource.buffer = buffer

        const amp = audioContext.createGain()
        amp.gain.value = 1
        previewSource.connect(amp)
        amp.connect(audioContext.destination)
        previewSource.start(audioContext.currentTime)
        helpers.getNgRootScope().$apply()
        previewSource.onended = () => {
            isPreviewing = false
            helpers.getNgRootScope().$apply()
        }
    } else {
        console.log("buffer is empty")
    }
}

function stopPreview() {
    if (previewSource) {
        previewSource.stop(audioContext.currentTime)
        previewSource = null
    }
    isPreviewing = false
}
