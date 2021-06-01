/**
 *
 * @module RecorderService
 */
import * as audioLibrary from '../audiolibrary'
import ctx from '../audiocontext'
import * as ESUtils from '../../esutils'
import * as userProject from '../userProject'

app.service('RecorderService', ['$rootScope', function ($rootScope) {
    var self = this;

    var audioRecorder, meter, micGain, zeroGain, previewBs, startTime, metroOsc, beatBuffSrc, eventBuffSrc;

    this.upload = {
        prepareForUpload: null,
        showUploadButton: null
    };

    this.openRecordMenu = null;
    this.micAccessBlocked = null;
    this.analyserNode = null;

    this.properties = {
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

    this.clear = function (softClear) {
        audioRecorder = null;
        previewBs = null;

        if (!softClear) {
            self.properties.micIsOn = false;
        }
        self.properties.isRecording = false;
        self.properties.curMeasure = 0;
        self.properties.curMeasureShow = 0;
        self.properties.curBeat = -1;
        self.properties.buffer = null;
        self.properties.hasBuffer = false;
        self.properties.isPreviewing = false;
        self.properties.meterVal = 0;

        $rootScope.$broadcast('showRecordedWaveform');
    };

    this.init = function () {
        
        self.clear();

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

        if (!navigator.getUserMedia)
            navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (!navigator.cancelAnimationFrame)
            navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
        if (!navigator.requestAnimationFrame)
            navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;

        if (!self.properties.micIsOn) {
            navigator.getUserMedia(audioOptions, gotAudio, mediaNotAccessible);
        } 
    };

    function mediaNotAccessible(error) {
        if ((ESUtils.whichBrowser().indexOf('Chrome') > -1)) {
            self.micAccessBlocked("chrome_mic_noaccess");
        } else if ((ESUtils.whichBrowser().indexOf('Firefox') > -1)) {
            self.micAccessBlocked("ff_mic_noaccess");
        }
    }

    function gotAudio(stream) {
        self.properties.micIsOn = true;
        self.openRecordMenu(); // proceed to open the record menu UI

        // FF bug: a fake audio node needs to be exposed to the global scope
        window.horrible_hack_for_mozilla = ctx.createMediaStreamSource(stream);

        var mic = ctx.createMediaStreamSource(stream);
        mic.connect(meter);
        mic.connect(micGain);

        //For drawing spectrogram
        self.analyserNode = ctx.createAnalyser();
        self.analyserNode.fftSize = recorderOptions.bufferLen/2;
        mic.connect(self.analyserNode);

        audioRecorder = new Recorder(micGain, recorderOptions);

        micGain.connect(zeroGain);
        zeroGain.connect(ctx.destination);

        updateMeter();
        $rootScope.$broadcast('showSpectrogram');
    }

    function scheduleRecord() {
        eventBuffSrc = [];

        // start recording immediately
        if (self.properties.countoff === 0) {
            // reset the recorder audio process timing
            audioRecorder = new Recorder(micGain, recorderOptions);

            audioRecorder.clear();
            audioRecorder.record();
            self.properties.hasBuffer = false;

            startTime = ctx.currentTime;
        } else {
            // start after count off
            buffEventCall(240.0 / self.properties.bpm * self.properties.countoff, function () {
                if (self.properties.isRecording) {
                    // reset the recorder instance
                    audioRecorder = new Recorder(micGain, recorderOptions);

                    audioRecorder.clear();
                    audioRecorder.record();
                    self.properties.hasBuffer = false;

                    startTime = ctx.currentTime;
                }
            });
        }

        // stop recording
        buffEventCall(240.0 / self.properties.bpm * (self.properties.countoff + self.properties.numMeasures + 0.3), function () {
            if (self.properties.isRecording) {
                self.toggleRecord();
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

        for (var i = 0; i < (self.properties.numMeasures + self.properties.countoff) * beats; i++) {

            // scheduled metronome sounds
            if (i < self.properties.countoff * beats || self.properties.clicks) {
                metroOsc[i] = ctx.createOscillator();
                var metroGain = ctx.createGain();
                var del = 60.0 / self.properties.bpm * i + ctx.currentTime;
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
            var beatBuff = ctx.createBuffer(1, sr * 60.0 / self.properties.bpm, sr);
            beatBuffSrc[i] = ctx.createBufferSource();
            beatBuffSrc[i].buffer = beatBuff;
            beatBuffSrc[i].connect(ctx.destination);
            beatBuffSrc[i].start(ctx.currentTime + 60.0 / self.properties.bpm * i);
            beatBuffSrc[i].onended = function () {
                self.properties.curBeat = (self.properties.curBeat + 1) % 4;
                $rootScope.$broadcast('clickOnMetronome',self.properties.curBeat);

                if (self.properties.curBeat === 0) {
                    self.properties.curMeasure++;

                    if (self.properties.curMeasure < 0) {
                        self.properties.curMeasureShow = self.properties.curMeasure;
                    } else {
                        self.properties.curMeasureShow = self.properties.curMeasure + 1;
                    }

                    $rootScope.$apply();
                }

                // ugly hack for firefox
                // if (self.properties.isRecording) {
                //     // self.updateCurMeasureShow();
                // } else {
                //     self.properties.curBeat = -1;
                // }
            };
        }
    }

    function buffEventCall (lenInSec, onEnded) {
        var sr = ctx.sampleRate;
        var buffSrc = ctx.createBufferSource();
        buffSrc.buffer = ctx.createBuffer(1, sr * lenInSec, sr);
        buffSrc.connect(ctx.destination);
        buffSrc.start(ctx.currentTime);
        buffSrc.onended = onEnded;
        eventBuffSrc.push(buffSrc);
    }

    this.toggleRecord = function () {
        if (self.properties.micIsOn) {
            if (!self.properties.isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        } else {
            alert('Please make sure that microphone input is turned on.')
        }
    };

    function startRecording() {
        if (self.properties.useMetro) {
            checkInputFields();
            self.properties.curMeasure = -self.properties.countoff;
            self.properties.curMeasureShow = self.properties.curMeasure;

            self.properties.curBeat = 0;

            scheduleRecord();
        } else {
            self.properties.hasBuffer = false;
            self.properties.curMeasure = 0;
            audioRecorder = new Recorder(micGain, recorderOptions);
            audioRecorder.clear();
            audioRecorder.record();
        }

        self.properties.isRecording = true;
        $rootScope.$broadcast('showSpectrogram');
    }

    function stopRecording() {
        audioRecorder.stop();
        self.properties.curMeasureShow = 0;

        // should have at least > 0 recorded frame
        if (self.properties.curMeasure > -1) {
            audioRecorder.getBuffer(gotBuffer);
        }

        if (self.properties.useMetro) {
            stopWebAudioEvents();

            self.properties.isRecording = false;
            self.properties.curBeat = -1;
            self.properties.curMeasure = 0;
            self.properties.curMeasureShow = 0;
        } else {
            self.properties.isRecording = false;
        }
    }

    function stopWebAudioEvents() {
        metroOsc.forEach(function (node) {
            node.stop(0);
        });

        beatBuffSrc.forEach(function (node) {
            node.stop(0);
            node.disconnect();
        });

        eventBuffSrc.forEach(function (node) {
            node.stop(0);
            node.disconnect();
        });
    }

    function checkInputFields() {
        self.properties.bpm = Number.parseInt(self.properties.bpm);
        self.properties.countoff = Number.parseInt(self.properties.countoff);
        self.properties.numMeasures = Number.parseInt(self.properties.numMeasures);

        if (Number.isNaN(self.properties.bpm)) {
            self.properties.bpm = 120;
        } else if (self.properties.bpm < 30) {
            self.properties.bpm = 30;
        } else if (self.properties.bpm > 480) {
            self.properties.bpm = 480;
        }

        if (Number.isNaN(self.properties.countoff) || self.properties.countoff < 0) {
            self.properties.countoff = 1;
        } else if (self.properties.countoff > 4) {
            self.properties.countoff = 4;
        }

        if (Number.isNaN(self.properties.numMeasures) || self.properties.numMeasures <= 0) {
            self.properties.numMeasures = 1;
        } else if (self.properties.numMeasures > 8) {
            self.properties.numMeasures = 8;
        }
    }

    function updateMeter() {
        self.properties.meterVal = meter.volume;
        requestAnimationFrame(updateMeter);
    }

    function gotBuffer(buf) {
        if (self.properties.useMetro) {
            var targetLen = Math.round(240.0 / self.properties.bpm * self.properties.numMeasures * ctx.sampleRate);
            var startTimeDiff = Math.round((audioRecorder.getStartTime() - startTime) * ctx.sampleRate);
            if (self.properties.countoff > 0) {
                startTimeDiff = 0;
            }

            self.properties.buffer = ctx.createBuffer(buf.length, targetLen, ctx.sampleRate);

            for (var ch = 0; ch < buf.length; ch++) {
                var chdata = self.properties.buffer.getChannelData(ch);

                for (var i = 0; i < targetLen; i++) {
                    chdata[i] = buf[ch][i+startTimeDiff];
                }
            }
        } else {
            self.properties.buffer = ctx.createBuffer(buf.length, buf[0].length, ctx.sampleRate);

            for (var ch = 0; ch < buf.length; ch++) {
                self.properties.buffer.getChannelData(ch).set(buf[ch]);
            }
        }

        $rootScope.$broadcast('showRecordedWaveform');
        self.properties.hasBuffer = true;

        //self.properties.save();
        var view = encodeWAV(self.properties.buffer.getChannelData(0));
        var blob = new Blob([view], {type: 'audio/wav'});
        doneEncoding(blob);
    }

    function floatTo16BitPCM(output, offset, input){
        for (var i = 0; i < input.length; i++, offset+=2){
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    function writeString(view, offset, string){
        for (var i = 0; i < string.length; i++){
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    function encodeWAV(samples){
        var buffer = new ArrayBuffer(44 + samples.length * 2);
        var view = new DataView(buffer);

        var numChannels = 1;
        var sampleRate = ctx.sampleRate;

        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* RIFF chunk length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        floatTo16BitPCM(view, 44, samples);

        return view;
    }

    //this.properties.save = function () {
    //    audioRecorder.exportWAV(doneEncoding);
    //};

    function doneEncoding(blob) {
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

        self.upload.prepareForUpload(blob, self.properties.useMetro, self.properties.bpm);
    }

    this.togglePreview = function () {
        if (!self.properties.isPreviewing) {
            startPreview();
        } else {
            stopPreview();
        }
    };

    function startPreview() {
        if (self.properties.buffer !== null) {
            self.properties.isPreviewing = true;

            previewBs = ctx.createBufferSource();
            previewBs.buffer = self.properties.buffer;

            var amp = ctx.createGain();
            amp.gain.value = 1;
            previewBs.connect(amp);
            amp.connect(ctx.destination);
            previewBs.start(ctx.currentTime);
            previewBs.onended = function () {
                self.properties.isPreviewing = false;
                $rootScope.$apply();
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
        self.properties.isPreviewing = false;
    }
}]);
