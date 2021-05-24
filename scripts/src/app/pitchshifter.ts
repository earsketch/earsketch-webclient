// Pitch shift tracks during compilation.
// "TODO: This service is only necessary until audio workers become implemented in all major browsers."
// ^ Is this accurate, or still relevant?
import ctx from './audiocontext'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as render from './renderer'
import * as userConsole from './userconsole'
import { Clip, EffectRange, Track } from './player'

interface Point {
    sampletime: number
    semitone: number
    type: 'start' | 'add' | 'end'
}

const QFRAMES = 16;
let BUFFER_CACHE: { [key: string]: AudioBuffer } = {}; 
const MAX_CACHE = 64; // increasing from 16 since we now process by clips instead of tracks

const computeFrameEnvelope = (bendinfo: Point[], numFrames: number) => {
    let findex = 1;
    const envelope = new Float32Array(numFrames);
    let deltaY, deltaX;
    for(let f = 0; f < numFrames; f++) {
        if ((findex < bendinfo.length) && (f > bendinfo[findex].sampletime)) {
            findex++;
        }

        if (findex === bendinfo.length) {
            envelope[f] = bendinfo[bendinfo.length-1].semitone;
        } else {
            deltaY = bendinfo[findex].semitone - bendinfo[findex-1].semitone
            deltaX = bendinfo[findex].sampletime - bendinfo[findex-1].sampletime
            envelope[f] = bendinfo[findex-1].semitone + deltaY * (f - bendinfo[findex-1].sampletime)/deltaX
        }

    }
    return envelope;
}

//sample time in frames
function addEnvelopePoint(jsarray: Point[], effect: EffectRange, tempo: number) {
    const startPoint = {
        sampletime: Math.round(ESUtils.measureToTime(effect.startMeasure, tempo) * 44100 / ESDSP_HOP_SIZE),
        semitone: effect.startValue,
        type: 'start',
    } as Point

    if ((jsarray.length > 0) && (startPoint.sampletime === jsarray[jsarray.length - 1].sampletime)) {
        jsarray[jsarray.length - 1].sampletime = jsarray[jsarray.length - 1].sampletime - QFRAMES;
    }

    if ((jsarray.length == 0) && (startPoint.sampletime > 0)) {
        if (startPoint.sampletime > 0) {
            jsarray.push({
                sampletime: 0,
                semitone: 0,
                type: 'add',
            })
        }

        if (startPoint.sampletime > QFRAMES) {
            jsarray.push({
                sampletime: startPoint.sampletime - QFRAMES,
                semitone: 0,
                type: 'add',
            })
        }
    }

    if ((jsarray.length > 0) && (jsarray[jsarray.length - 1].sampletime < 0)) {
        jsarray[jsarray.length - 1].sampletime = startPoint.sampletime - QFRAMES;
    }

    // Mysterious old comment: "if   ((jsarray.length > 0) && (jsarray[jsarray.length -1].type == 'end')"
    if ((jsarray.length > 0) && ((startPoint.sampletime - QFRAMES) > jsarray[jsarray.length - 1].sampletime)) {
        jsarray.push({
            sampletime: startPoint.sampletime - QFRAMES,
            semitone: jsarray[jsarray.length - 1].semitone,
            type: 'add',
        })
    }

    jsarray.push(startPoint)

    const endPoint = {
        sampletime: Math.round(ESUtils.measureToTime(effect.endMeasure, tempo) * 44100 / ESDSP_HOP_SIZE),
        semitone: effect.endValue,
        type: 'end',
    } as Point

    if (endPoint.sampletime == 0) {
        endPoint.sampletime = -1
        endPoint.semitone = startPoint.semitone
    }
    if (endPoint.sampletime > 0) {
        jsarray.push(endPoint)
    }
}

/**
 * Find envelope points for a single track.
 */
function processPitchshift(track: Track, tempo: number) {
    const jsonArray: Point[] = [];
    if (track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'] !== undefined) {
        //Compute envelope information
        for (var i=0; i<track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'].length; i++) {
            var effect = track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'][i];
            addEnvelopePoint(jsonArray , effect, tempo);
        }
    }
    return jsonArray;
}


function BufferPitchShift(audiobuffer: AudioBuffer, bendinfo: Point[]) {
    esconsole('PitchBend bendinfo from ' + JSON.stringify(bendinfo), ['DEBUG','PITCHSHIFT']);
    var NFrames = computeNumberOfFrames(audiobuffer.length);
    var frameenvelope = computeFrameEnvelope(bendinfo, NFrames);
    var buffer;
    var bypass = false;
    if ((bendinfo.length == 1) && (bendinfo[0].semitone == 0)) {
        bypass = true;
    }
    //first case
    if (bypass) {
        esconsole('First Case PITCHSHIFT - Bypass', ['DEBUG','PITCHSHIFT']);
        buffer = ctx.createBuffer(audiobuffer.numberOfChannels, audiobuffer.length , audiobuffer.sampleRate);
        buffer.copyToChannel(audiobuffer.getChannelData(0),0,0);
        return buffer;
    } else {
        var pcmdata =  audiobuffer.getChannelData(0);
        buffer = computePitchShift(pcmdata, frameenvelope, ctx);
        esconsole('Pitchshift done with a buffer length of ' + buffer.length, ['DEBUG','PITCHSHIFT']);
        return buffer;
    }
}

    /**
 * Asynchronously render the pitchshifted form of a track and put the
 * pitchshifted audio buffer into each clip separately. Each clip will
 * end up with pitchshift.audio, pitchshift.start, and pitchshift.end
 * properties.
 *
 * @param {object} track The track to pitchshift.
 * @param {number} tempo The tempo of the track.
 * @returns Promise A promise that resolves to the new track where each
 * pitchshifted clip has new pitchshifted information.
 */
export function asyncPitchshiftTrack(track: Track, tempo: number) {

    var promise = new Promise(function (resolve, reject) {
        if (track.clips.length == 0) {
            reject(new RangeError('Cannot pitchshift an empty track'));
        }
        var bendinfo = processPitchshift(track, tempo);

        render.mergeClips(track.clips, tempo).then(function (buffer: AudioBuffer) {
            var shiftedBuffer;

            var hashKey = JSON.stringify(track);

            if (Object.keys(BUFFER_CACHE).length > MAX_CACHE) {
                BUFFER_CACHE = {};
            }

            if (BUFFER_CACHE.hasOwnProperty(hashKey)) {
                esconsole('Using Cache ', ['DEBUG','PITCHSHIFT']);
                shiftedBuffer = BUFFER_CACHE[hashKey];
            } else {
                esconsole('Computing Shift ', ['DEBUG','PITCHSHIFT']);
                shiftedBuffer = BufferPitchShift(buffer, bendinfo);
                BUFFER_CACHE[hashKey] = shiftedBuffer;
            }
            

            // insert the shifted audio buffer and the times to start and
            // end in the buffer as a new clip.pitchshift object
            // TODO: slice a copy of the Float32Array into the old
            // audio buffer?
            for (var i = 0; i < track.clips.length; i++) {
                var clip = track.clips[i];
                var pitchshift = {
                    audio: shiftedBuffer,
                    start: clip.measure + clip.start - 1,
                    end: clip.measure + clip.end - 1,
                };
                clip.pitchshift = pitchshift;
            }

            resolve(track);
        }).catch(function (e) {
            // esconsole(e, ['ERROR','PITCHSHIFT']);
            console.error(e);
        });
    });

    return promise;
}

function interpolateEnvPoints(clip: Clip, tempo: number, trackBendEnv: Point[]) {
    var clipStartInSamps = Math.round(ESUtils.measureToTime(clip.measure, tempo) * 44100 / ESDSP_HOP_SIZE);
    var clipEndInSamps = Math.round(ESUtils.measureToTime(clip.measure + (clip.end-clip.start), tempo) * 44100 / ESDSP_HOP_SIZE);
    var clipLenInSamps = clipEndInSamps - clipStartInSamps;

    // clone the env-point-object array
    var env = trackBendEnv.map(function (point: Point) {
        return Object.assign({}, point);
    });

    env = env.filter(function (point) {
        return point.type !== 'add';
    });

    if (env[env.length-2].sampletime === env[env.length-1].sampletime) {
        env[env.length-2].sampletime = env[env.length-3].sampletime;
        env[env.length-2].semitone = env[env.length-3].semitone;
    }

    for (var i = 1; i < env.length; i++) {
        if (env[i].sampletime <= env[i-1].sampletime) {
            env[i].sampletime = env[i-1].sampletime + 1;
        }
    }

    var pointsOrNullWithinClip = env.map(function (point) {
        return (point.sampletime >= clipStartInSamps && point.sampletime <= clipEndInSamps) ? point : null;
    });

    var fixedStart = false, fixedEnd = false;

    pointsOrNullWithinClip.forEach(function (point, i) {
        if (!fixedStart) {
            if (point) {
                if (point.sampletime !== clipStartInSamps) {
                    if (i % 2 === 1) {
                        pointsOrNullWithinClip[i-1] = {
                            sampletime: clipStartInSamps,
                            semitone: env[i-1].semitone + (env[i].semitone-env[i-1].semitone) * (clipStartInSamps-env[i-1].sampletime) / (env[i].sampletime-env[i-1].sampletime),
                            type: 'start'
                        };
                    }
                }

                fixedStart = true;
            }
        } else if (!fixedEnd) {
            if (!point) {
                if (i % 2 === 1) {
                    pointsOrNullWithinClip[i] = {
                        sampletime: clipEndInSamps,
                        semitone: env[i-1].semitone + (env[i].semitone-env[i-1].semitone) * (clipEndInSamps-env[i-1].sampletime) / (env[i].sampletime-env[i-1].sampletime),
                        type: 'end'
                    };
                }

                fixedEnd = true;
            }
        }
    });

    // remove null values
    const pointsWithinClip = pointsOrNullWithinClip.filter(function (point) {
        return !!point;
    }) as Point[];

    pointsWithinClip.forEach(function (point) {
        point.sampletime -= clipStartInSamps;
    });

    if (pointsWithinClip.length > 0 && pointsWithinClip[0].sampletime > 0) {
        pointsWithinClip.unshift({
            sampletime: 0,
            semitone: pointsWithinClip[0].semitone,
            type: 'start'
        });
        pointsWithinClip.unshift({
            sampletime: pointsWithinClip[0].sampletime-1,
            semitone: pointsWithinClip[0].semitone,
            type: 'end'
        });
    }

    if (pointsWithinClip.length > 0 && pointsWithinClip[pointsWithinClip.length-1].sampletime < clipLenInSamps) {
        pointsWithinClip.push({
            sampletime: pointsWithinClip[pointsWithinClip.length-1].sampletime+1,
            semitone: pointsWithinClip[pointsWithinClip.length-1].semitone,
            type: 'start'
        });
        pointsWithinClip.push({
            sampletime: clipLenInSamps,
            semitone: pointsWithinClip[pointsWithinClip.length-1].semitone,
            type: 'end'
        });
    }

    if (!pointsWithinClip.length) {
        let startSemitone: number, endSemitone: number;

        for (var i = 0; i < env.length; i += 2) {
            if (i === 0 && clipEndInSamps < env[i].sampletime) {
                startSemitone = endSemitone = env[i].semitone;
            } else if (clipStartInSamps > env[i].sampletime && clipEndInSamps < env[i+1].sampletime) {
                // linear interpolation
                startSemitone = (env[i+1].semitone - env[i].semitone) * (clipStartInSamps - env[i].sampletime) / (env[i+1].sampletime - env[i].sampletime) + env[i].semitone;
                endSemitone = (env[i+1].semitone - env[i].semitone) * (clipEndInSamps - env[i].sampletime) / (env[i+1].sampletime - env[i].sampletime) + env[i].semitone;
            } else if (i === env.length-2 && clipStartInSamps > env[i+1].sampletime) {
                startSemitone = endSemitone = env[i+1].semitone;
            }
        }

        pointsWithinClip.push({
            sampletime: 0,
            semitone: startSemitone!,
            type: 'start'
        });
        pointsWithinClip.push({
            sampletime: clipLenInSamps,
            semitone: endSemitone!,
            type: 'end'
        });
    }


    if (pointsWithinClip[pointsWithinClip.length-1].sampletime === pointsWithinClip[pointsWithinClip.length-2].sampletime) {
        pointsWithinClip.length -= 2;
    }

    return pointsWithinClip;
}

export function asyncPitchshiftClips(track: Track, tempo: number) {
    return new Promise(function (resolve, reject) {
        if (track.clips.length == 0) {
            reject(new RangeError('Cannot pitchshift an empty track'));
        }

        // TODO: trackBendEnv looks broken with high-density automation
        var trackBendEnv = processPitchshift(track, tempo);

        if (Object.keys(BUFFER_CACHE).length > MAX_CACHE) {
            BUFFER_CACHE = {};
        }

        track.clips.forEach(function (clip) {
            var shiftedBuffer;
            var bendinfo = interpolateEnvPoints(clip, tempo, trackBendEnv);

            var hashKey = JSON.stringify({
                clip: [clip.filekey, clip.start, clip.end],
                bendinfo: bendinfo
            });

            if (BUFFER_CACHE.hasOwnProperty(hashKey)) {
                esconsole('Using Cache ', ['DEBUG','PITCHSHIFT']);
                shiftedBuffer = BUFFER_CACHE[hashKey];
            } else {
                esconsole('Computing Shift ', ['DEBUG','PITCHSHIFT']);
                try {
                    shiftedBuffer = BufferPitchShift(clip.audio, bendinfo);
                } catch (err) {
                    esconsole('PitchShift Buffer not processed ', ['DEBUG','PITCHSHIFT']);
                    esconsole(err, ['ERROR', 'PITCHSHIFT']);
                    userConsole.error('Error processing ' + clip.filekey);
                    throw err;
                }
                BUFFER_CACHE[hashKey] = shiftedBuffer;
            }

            clip.pitchshift =  {
                audio: shiftedBuffer,
                start: clip.start,
                end: clip.end
            };
        });

        resolve(track);
    }).catch(function (err) {
        throw err;
    });
}