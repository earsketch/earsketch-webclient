/**
 *
 * @module RecorderService
 */
import * as audioLibrary from './audiolibrary'
import ctx from './audiocontext'
import * as ESUtils from '../esutils'
import * as helpers from '../helpers'
import { encodeWAV } from './renderer'
import * as userProject from './userProject'

var audioRecorder: any, meter: any, micGain: any, zeroGain: any, previewBs: any, startTime: any, metroOsc: any, beatBuffSrc: any, eventBuffSrc: any;

export let callbacks = {
    prepareForUpload: (blob: Blob, useMetro: boolean, bpm: number) => {},
    openRecordMenu: () => {},
    micAccessBlocked: (type: string) => {},
    showSpectrogram: () => {},
    showRecordedWaveform: () => {},
    clickOnMetronome: (beat: number) => {},
}

export let analyserNode: AnalyserNode | null = null;

export let properties: any = {
    micIsOn: false,
    isRecording: false,
    useMetro: true,
    clicks: false,
    bpm: 120,
    countoff: 1,
    numMeasures: 2,
    curMeasure: 0,
    curMeasureShow: 0,
    curBeat: -1,
    buffer: null,
    hasBuffer: false,
    isPreviewing: false,
    meterVal: 0
};

var recorderOptions = {
    bufferLen: 2048,
    numChannels: 1
};

export let clear = function (softClear?: boolean) {
    audioRecorder = null;
    previewBs = null;

    if (!softClear) {
        properties.micIsOn = false;
    }
    properties.isRecording = false;
    properties.curMeasure = 0;
    properties.curMeasureShow = 0;
    properties.curBeat = -1;
    properties.buffer = null;
    properties.hasBuffer = false;
    properties.isPreviewing = false;
    properties.meterVal = 0;

    callbacks.showRecordedWaveform();
};

export let init = function () {
    
    clear();

    meter = createAudioMeter(ctx, 1, 0.95, 500);
    micGain = ctx.createGain(); // to feed to the recorder
    zeroGain = ctx.createGain(); // disable monitoring
    startTime = 0;
    metroOsc = [];
    beatBuffSrc = [];
    eventBuffSrc = [];  

    var audioOptions = {
        "audio": {
            "mandatory": {
                "googEchoCancellation": "false",
                "googAutoGainControl": "false",
                "googNoiseSuppression": "false",
                "googHighpassFilter": "false"
            },
            "optional": []
        }
    };

    micGain.gain.value = 1;
    zeroGain.gain.value = 0;

    const nav = navigator as any
    if (!nav.getUserMedia)
        nav.getUserMedia = nav.webkitGetUserMedia || nav.mozGetUserMedia;
    if (!nav.cancelAnimationFrame)
        nav.cancelAnimationFrame = nav.webkitCancelAnimationFrame || nav.mozCancelAnimationFrame;
    if (!nav.requestAnimationFrame)
        nav.requestAnimationFrame = nav.webkitRequestAnimationFrame || nav.mozRequestAnimationFrame;

    if (!properties.micIsOn) {
        navigator.getUserMedia(audioOptions as MediaStreamConstraints, gotAudio, mediaNotAccessible);
    } 
};

function mediaNotAccessible(error: any) {
    if ((ESUtils.whichBrowser().indexOf('Chrome') > -1)) {
        callbacks.micAccessBlocked("chrome_mic_noaccess");
    } else if ((ESUtils.whichBrowser().indexOf('Firefox') > -1)) {
        callbacks.micAccessBlocked("ff_mic_noaccess");
    }
}

function gotAudio(stream: any) {
    properties.micIsOn = true;
    callbacks.openRecordMenu(); // proceed to open the record menu UI

    // FF bug: a fake audio node needs to be exposed to the global scope
    (window as any).horrible_hack_for_mozilla = ctx.createMediaStreamSource(stream);

    var mic = ctx.createMediaStreamSource(stream);
    mic.connect(meter);
    mic.connect(micGain);

    //For drawing spectrogram
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = recorderOptions.bufferLen/2;
    mic.connect(analyserNode);

    audioRecorder = new Recorder(micGain, recorderOptions);

    micGain.connect(zeroGain);
    zeroGain.connect(ctx.destination);

    updateMeter();
    callbacks.showSpectrogram();
}

function scheduleRecord() {
    eventBuffSrc = [];

    // start recording immediately
    if (properties.countoff === 0) {
        // reset the recorder audio process timing
        audioRecorder = new Recorder(micGain, recorderOptions);

        audioRecorder.clear();
        audioRecorder.record();
        properties.hasBuffer = false;

        startTime = ctx.currentTime;
    } else {
        // start after count off
        buffEventCall(240.0 / properties.bpm * properties.countoff, function () {
            if (properties.isRecording) {
                // reset the recorder instance
                audioRecorder = new Recorder(micGain, recorderOptions);

                audioRecorder.clear();
                audioRecorder.record();
                properties.hasBuffer = false;

                startTime = ctx.currentTime;
            }
        });
    }

    // stop recording
    buffEventCall(240.0 / properties.bpm * (properties.countoff + properties.numMeasures + 0.3), function () {
        if (properties.isRecording) {
            toggleRecord();
        }
    });

    // might need to be called as a callback from the audioRecorder
    onRecordStart();
}

function onRecordStart() {
    var sr = ctx.sampleRate;
    var beats = 4;
    metroOsc = [];
    beatBuffSrc = [];

    for (var i = 0; i < (properties.numMeasures + properties.countoff) * beats; i++) {

        // scheduled metronome sounds
        if (i < properties.countoff * beats || properties.clicks) {
            metroOsc[i] = ctx.createOscillator();
            var metroGain = ctx.createGain();
            var del = 60.0 / properties.bpm * i + ctx.currentTime;
            var dur = 0.1;
            if (i % beats === 0) {
                metroOsc[i].frequency.value = 2000;
                metroGain.gain.setValueAtTime(0.25, del);
            } else {
                metroOsc[i].frequency.value = 1000;
                metroGain.gain.setValueAtTime(0.5, del);
            }
            metroOsc[i].connect(metroGain);
            metroOsc[i].start(del);
            metroOsc[i].stop(del + dur);
            metroGain.gain.linearRampToValueAtTime(0, del + dur);
            metroGain.connect(ctx.destination);
        }

        // buffer-based scheduler mainly for visual dots
        var beatBuff = ctx.createBuffer(1, sr * 60.0 / properties.bpm, sr);
        beatBuffSrc[i] = ctx.createBufferSource();
        beatBuffSrc[i].buffer = beatBuff;
        beatBuffSrc[i].connect(ctx.destination);
        beatBuffSrc[i].start(ctx.currentTime + 60.0 / properties.bpm * i);
        beatBuffSrc[i].onended = function () {
            properties.curBeat = (properties.curBeat + 1) % 4;
            callbacks.clickOnMetronome(properties.curBeat);

            if (properties.curBeat === 0) {
                properties.curMeasure++;

                if (properties.curMeasure < 0) {
                    properties.curMeasureShow = properties.curMeasure;
                } else {
                    properties.curMeasureShow = properties.curMeasure + 1;
                }

                helpers.getNgRootScope().$apply();
            }

            // ugly hack for firefox
            // if (properties.isRecording) {
            //     // updateCurMeasureShow();
            // } else {
            //     properties.curBeat = -1;
            // }
        };
    }
}

function buffEventCall (lenInSec: number, onEnded: (this: AudioScheduledSourceNode, ev: Event) => any) {
    var sr = ctx.sampleRate;
    var buffSrc = ctx.createBufferSource();
    buffSrc.buffer = ctx.createBuffer(1, sr * lenInSec, sr);
    buffSrc.connect(ctx.destination);
    buffSrc.start(ctx.currentTime);
    buffSrc.onended = onEnded;
    eventBuffSrc.push(buffSrc);
}

export let toggleRecord = function () {
    if (properties.micIsOn) {
        if (!properties.isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    } else {
        alert('Please make sure that microphone input is turned on.')
    }
};

function startRecording() {
    if (properties.useMetro) {
        checkInputFields();
        properties.curMeasure = -properties.countoff;
        properties.curMeasureShow = properties.curMeasure;

        properties.curBeat = 0;

        scheduleRecord();
    } else {
        properties.hasBuffer = false;
        properties.curMeasure = 0;
        audioRecorder = new Recorder(micGain, recorderOptions);
        audioRecorder.clear();
        audioRecorder.record();
    }

    properties.isRecording = true;
    callbacks.showSpectrogram();
}

function stopRecording() {
    audioRecorder.stop();
    properties.curMeasureShow = 0;

    // should have at least > 0 recorded frame
    if (properties.curMeasure > -1) {
        audioRecorder.getBuffer(gotBuffer);
    }

    if (properties.useMetro) {
        stopWebAudioEvents();

        properties.isRecording = false;
        properties.curBeat = -1;
        properties.curMeasure = 0;
        properties.curMeasureShow = 0;
    } else {
        properties.isRecording = false;
    }
}

function stopWebAudioEvents() {
    metroOsc.forEach(function (node: OscillatorNode) {
        node.stop(0);
    });

    beatBuffSrc.forEach(function (node: AudioBufferSourceNode) {
        node.stop(0);
        node.disconnect();
    });

    eventBuffSrc.forEach(function (node: AudioBufferSourceNode) {
        node.stop(0);
        node.disconnect();
    });
}

function checkInputFields() {
    properties.bpm = Number.parseInt(properties.bpm);
    properties.countoff = Number.parseInt(properties.countoff);
    properties.numMeasures = Number.parseInt(properties.numMeasures);

    if (Number.isNaN(properties.bpm)) {
        properties.bpm = 120;
    } else if (properties.bpm < 30) {
        properties.bpm = 30;
    } else if (properties.bpm > 480) {
        properties.bpm = 480;
    }

    if (Number.isNaN(properties.countoff) || properties.countoff < 0) {
        properties.countoff = 1;
    } else if (properties.countoff > 4) {
        properties.countoff = 4;
    }

    if (Number.isNaN(properties.numMeasures) || properties.numMeasures <= 0) {
        properties.numMeasures = 1;
    } else if (properties.numMeasures > 8) {
        properties.numMeasures = 8;
    }
}

function updateMeter() {
    properties.meterVal = meter.volume;
    requestAnimationFrame(updateMeter);
}

function gotBuffer(buf: any) {
    if (properties.useMetro) {
        var targetLen = Math.round(240.0 / properties.bpm * properties.numMeasures * ctx.sampleRate);
        var startTimeDiff = Math.round((audioRecorder.getStartTime() - startTime) * ctx.sampleRate);
        if (properties.countoff > 0) {
            startTimeDiff = 0;
        }

        properties.buffer = ctx.createBuffer(buf.length, targetLen, ctx.sampleRate);

        for (var ch = 0; ch < buf.length; ch++) {
            var chdata = properties.buffer.getChannelData(ch);

            for (var i = 0; i < targetLen; i++) {
                chdata[i] = buf[ch][i+startTimeDiff];
            }
        }
    } else {
        properties.buffer = ctx.createBuffer(buf.length, buf[0].length, ctx.sampleRate);

        for (var ch = 0; ch < buf.length; ch++) {
            properties.buffer.getChannelData(ch).set(buf[ch]);
        }
    }

    callbacks.showRecordedWaveform();
    properties.hasBuffer = true;

    //properties.save();
    var view = encodeWAV(properties.buffer.getChannelData(0));
    var blob = new Blob([view], {type: 'audio/wav'});
    doneEncoding(blob);
}

function doneEncoding(blob: any) {
    blob.lastModifiedDate = new Date();

    // get the files with default name pattern (USER_SOUND_num.wav)
    var def = audioLibrary.cache.sounds.filter(function (item) {
        return item.file_key.match(new RegExp(userProject.getUsername().toUpperCase() + '_SOUND_\\d+'));
    });
    // get the number portion and list them in descending order
    var nums = def.map(function (item) {
        return parseInt(item.file_key.replace(new RegExp(userProject.getUsername().toUpperCase() + '_SOUND_'), ''));
    }).sort(function (a, b) {
        return b-a;
    });
    // increment by 1
    var nextNum;
    if (nums.length === 0) {
        nextNum = (1).toString();
    } else {
        nextNum = (nums[0]+1).toString();
    }
    // pad with leading 0s. the basic digit length is 3
    var numPadded = Array(4 - nextNum.length).join('0') + nextNum;
    //blob.name = 'SOUND_' + numPadded + '.wav';
    blob.name='QUICK_RECORD';

    callbacks.prepareForUpload!(blob, properties.useMetro, properties.bpm);
}

export let togglePreview = function () {
    if (!properties.isPreviewing) {
        startPreview();
    } else {
        stopPreview();
    }
};

function startPreview() {
    if (properties.buffer !== null) {
        properties.isPreviewing = true;

        previewBs = ctx.createBufferSource();
        previewBs.buffer = properties.buffer;

        var amp = ctx.createGain();
        amp.gain.value = 1;
        previewBs.connect(amp);
        amp.connect(ctx.destination);
        previewBs.start(ctx.currentTime);
        previewBs.onended = function () {
            properties.isPreviewing = false;
            helpers.getNgRootScope().$apply();
        }
    } else {
        console.log('buffer is empty');
    }
}

function stopPreview() {
    if (previewBs) {
        previewBs.stop(ctx.currentTime);
        previewBs = null;
    }
    properties.isPreviewing = false;
}
