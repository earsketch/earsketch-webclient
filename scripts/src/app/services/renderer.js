/**
 * An angular factory service for rendering scripts using an offline audio
 * context.
 *
 * @module renderer
 * @author Creston Bunch
 */
import * as applyEffects from '../../model/applyeffects'
import esconsole from '../../esconsole'
import * as ESUtils from '../../esutils'

app.factory('renderer', function () {

    var NUM_CHANNELS = 2;
    var SAMPLE_RATE = 44100;

    /**
    * Render a result for offline playback.
    *
    * @param {object} result A compiled result object.
    * @returns {Promise} A promise that resolves to an AudioBuffer object.
    */
    function renderBuffer(result) {
        esconsole('Begin rendering result to buffer.', ['DEBUG','RENDERER']);

        var origin = 0;
        var duration = ESUtils.measureToTime(result.length+1, result.tempo); // need +1 to render to end of last measure
        var context = new (window.OfflineAudioContext ||
                      window.webkitOfflineAudioContext)
                      (NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE);

        // following the custom audioContext structure
        context.master = context.createGain();

        result.master = context.createGain();

        // we must go through every track and every audio clip and add each of
        // them to the audio context and start them at the right time
        // don't include the last track because we assume that's the metronome
        // track
        for (var i = 0; i < result.tracks.length-1; i++) {
            var track = result.tracks[i];

            // dummy node
            // TODO: implement our custom analyzer node
            track.analyser = context.createGain();

            var startNode = applyEffects.buildAudioNodeGraph(
                context, track, i, result.tempo,
                origin, result.master, [], false
            );

            var trackGain = context.createGain();
            trackGain.gain.setValueAtTime(1.0, context.currentTime);

            for (var j = 0; j < track.clips.length; j++) {
                var clip = track.clips[j];

                // create the audio source node to contain the audio buffer
                // and play it at the designated time
                var source = context.createBufferSource();

                // Special case for pitchshifted tracks. The pitchshifted
                // audio buffer is different than the clip audio buffer, and
                // has different start and end times
                var pitchshiftEffect =
                    track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'];
                if (pitchshiftEffect !== undefined) {
                    esconsole('Using pitchshifted audio for ' + clip.filekey +
                              ' on track ' + i,
                             ['DEBUG','RENDERER']);
                    source.buffer = clip.pitchshift.audio;
                    var start = ESUtils.measureToTime(
                        clip.pitchshift.start, result.tempo
                    );
                    var end = ESUtils.measureToTime(
                        clip.pitchshift.end, result.tempo
                    );
                // for all other tracks we can use the unprocessed clip buffer
                } else {
                    source.buffer = clip.audio;
                    var start = ESUtils.measureToTime(clip.start, result.tempo);
                    var end = ESUtils.measureToTime(clip.end, result.tempo);
                }

                // connect the buffer source to the effects tree
                // if (typeof(startNode) !== "undefined")  {
                //     source.connect(trackGain);
                //     trackGain.connect(startNode)
                // } else {
                //     source.connect(master);
                //     trackGain.connect(master);
                // }
                source.connect(trackGain);

                var location = ESUtils.measureToTime(
                    clip.measure, result.tempo
                );

                // the clip duration may be shorter than the buffer duration
                var bufferDuration = source.buffer.duration;
                var clipDuration = end - start;

                if (origin > location && origin > location + end) {
                    // case: clip is playing in the past
                    // do nothing, we don't have to play this clip

                } else if (origin > location
                           && origin <= location + clipDuration) {
                    // case: clip is playing from the middle
                    // calculate the offset and begin playing
                    var offset = origin - location;
                    start += offset;
                    clipDuration -= offset;
                    source.start(context.currentTime, start, clipDuration);
                    source.stop(context.currentTime + clipDuration);

                    // keep this flag so we only stop clips that are playing
                    // (otherwise we get an exception raised)
                    clip.playing = true;
                } else {
                    // case: clip is in the future
                    // calculate when it should begin and register it to play
                    var offset = location - origin;

                    source.start(
                        context.currentTime + offset, start, clipDuration
                    );
                    clip.playing = true;
                }

                // keep a reference to this audio source so we can pause it
                clip.source = source;
                clip.gain = trackGain; // used to mute the track/clip
            }

            // if master track
            if (i === 0) {
                // master limiter for reducing overload clipping
                var limiter = context.createDynamicsCompressor();
                limiter.threshold.value = -1;
                limiter.knee.value = 0;
                limiter.ratio.value = 10000; // high compression ratio
                limiter.attack.value = 0; // as fast as possible
                limiter.release.value = 0.1; // could be a bit shorter

                result.master.connect(limiter);
                limiter.connect(trackGain);

                if (typeof(startNode) !== "undefined") {
                    // TODO: the effect order (limiter) is not right
                    trackGain.connect(startNode);
                } else {
                    trackGain.connect(context.master);
                }

                context.master.connect(context.destination);
            } else {
                if (typeof(startNode) !== "undefined") {
                    // track gain -> effect tree
                    trackGain.connect(startNode)
                } else {
                    // track gain -> (bypass effect tree) -> analyzer & master
                    trackGain.connect(track.analyser);
                    track.analyser.connect(result.master);
                }
            }
        }

        return new Promise(function(resolve, reject) {
            context.startRendering();
            context.oncomplete = function(result) {
                resolve(result.renderedBuffer);
                esconsole('Render to buffer completed.', ['DEBUG','RENDERER']);
            }
        });
    }

    /**
    * Render a result for offline playback.
    *
    * @param {object} result A compiled result object.
    * @returns {Promise} A promise that resolves to a Blob object.
    */
    function renderWav(result) {
        return new Promise(function(resolve, reject) {
            renderBuffer(result).then(function(buffer) {
                resolve(bufferToWav(buffer));
            }).catch(function(err) {
                reject(err);
            });
        });
    }

    /**
     * Render a result to mp3 for offline playback.
     * 
     * @param result {object} A compiled result object.
     * @returns {Promise} A promise that resolves to a Blob object.
     */
    function renderMp3(result) {
        return new Promise(function (resolve, reject) {
            renderBuffer(result).then(function (buffer) {
                var mp3encoder = new lamejs.Mp3Encoder(2, 44100, 160);
                var mp3Data = [];

                var left = float32ToInt16(buffer.getChannelData(0));
                var right = float32ToInt16(buffer.getChannelData(1));
                var sampleBlockSize = 1152;
                var mp3buf;

                var len = left.length;

                for (var i = 0; i < len; i += sampleBlockSize) {
                    var leftChunk = left.subarray(i, i + sampleBlockSize);
                    var rightChunk = right.subarray(i, i + sampleBlockSize);
                    mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                }
                mp3buf = mp3encoder.flush();

                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }

                var blob = new Blob(mp3Data, {type: 'audio/mp3'});
                resolve(blob);
            }).catch(function (err) {
                reject(err);
            });
        });
    }
    
    /**
     * Merge all the clip buffers of a track into one large buffer.
     *
     * @param {array} clips A list of compiled clips to merge.
     * @param {number} tempo The tempo to render the clips at.
     * @returns {Promise} A javascript promise that resolves to an AudioBuffer
     * of the newly rendered clip.
     */
    function mergeClips(clips, tempo) {
        esconsole('Merging clips', ['DEBUG', 'RENDERER']);
        // calculate the length of the merged clips
        var length = 0;
        for (var i = 0; i < clips.length; i++) {
            var end = clips[i].measure + clips[i].end;
            if (end > length) {
                length = end;
            }
        }
        var duration = ESUtils.measureToTime(length, tempo);

        var promise = new Promise(function(resolve, reject) {

            // create an offline context for rendering
            var context = new (window.OfflineAudioContext ||
                          window.webkitOfflineAudioContext)
                          (NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE);

            var master = context.createGain();
            master.connect(context.destination);

            for (var i = 0; i < clips.length; i++) {
                var clip = clips[i];
                var source = context.createBufferSource();
                source.buffer = clip.audio;

                source.connect(master);

                var startTime = ESUtils.measureToTime(clip.measure, tempo);
                var startOffset = ESUtils.measureToTime(clip.start, tempo);
                var endOffset = ESUtils.measureToTime(clip.end, tempo);

                if (endOffset < startOffset) {
                    continue;
                }

                source.start(startTime + startOffset);
                source.stop(startTime + (endOffset - startOffset));
            }

            context.startRendering();

            context.oncomplete = function(result) {
                esconsole('Merged clips', ['DEBUG','RENDERER']);
                resolve(result.renderedBuffer);
            }

        });

        return promise;
    }

    /**
     * Take a rendered offline audio context buffer and turn it into a
     * WAV file.
     *
     * @param {AudioBuffer} buffer The rendered audio buffer.
     * @returns {Blob} A blob object representing the wav file.
     */
    function bufferToWav(buffer) {
        var pcmarrayL = buffer.getChannelData(0);
        var pcmarrayR = buffer.getChannelData(1);

        var interleaved = interleave(pcmarrayL, pcmarrayR);
        var dataview = encodeWAV(interleaved);
        var audioBlob = new Blob([dataview], { type: 'audio/wav' });
        return audioBlob;
    }

    /**
     * Create an interleaved two-channel array for wave file output.
     *
     * @private
     * @param {array} inputL The left channel
     * @param {array} inputR The right channel
     * @returns {Float32Array} The interleaved array
     */
    function interleave(inputL, inputR) {
        var length = inputL.length + inputR.length;
        var result = new Float32Array(length);

        var index = 0,
            inputIndex = 0;

        while (index < length) {
            result[index++] = inputL[inputIndex];
            result[index++] = inputR[inputIndex];
            inputIndex++;
        }
        return result;
    }

    /**
     * Encode an array of interleaved 2-channel samples to a wav file.
     *
     * @private
     * @param {array} samples The interleaved array samples.
     * @return {DataView}
     */
    function encodeWAV(samples) {
        var buffer = new ArrayBuffer(44 + samples.length * 2);
        var view = new DataView(buffer);

        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 32 + samples.length * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, 2, true);
        /* sample rate */
        view.setUint32(24, SAMPLE_RATE, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, SAMPLE_RATE * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, 4, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        floatTo16BitPCM(view, 44, samples);

        return view;
    }

    /**
     * Convert a float array to 16 bit PCM
     *
     * @private
     */
    function floatTo16BitPCM(output, offset, input) {
        for (var i = 0; i < input.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    /**
     * Converts a Float32Array to Int16Array
     * @private
     * @param input {Float32Array}
     * @returns {Int16Array}
     */
    function float32ToInt16(input) {
        var res = new Int16Array(input.length);
        for (var i = 0; i < input.length; i++) {
            var s = Math.max(-1, Math.min(1, input[i]));
            res[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return res;
    }

    /*
     * @private
     */
    function writeString(view, offset, string) {
        for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    return {
        renderBuffer: renderBuffer,
        renderWav: renderWav,
        renderMp3: renderMp3,
        mergeClips: mergeClips
    };

});
