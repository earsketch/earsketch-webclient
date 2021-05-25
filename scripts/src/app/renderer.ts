// Render scripts using an offline audio context.
import * as applyEffects from '../model/applyeffects'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import { Clip, DAWData } from './player'
import { OfflineAudioContext } from './audiocontext'


const NUM_CHANNELS = 2
const SAMPLE_RATE = 44100
 
// Render a result for offline playback.
export const renderBuffer = (result: DAWData) => {
    esconsole('Begin rendering result to buffer.', ['DEBUG','RENDERER'])

    const origin = 0
    const duration = ESUtils.measureToTime(result.length+1, result.tempo)  // need +1 to render to end of last measure
    const context = new OfflineAudioContext(NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE)
    const mix = context.createGain()

    result.master = context.createGain()

    // we must go through every track and every audio clip and add each of
    // them to the audio context and start them at the right time
    // don't include the last track because we assume that's the metronome
    // track
    for (let i = 0; i < result.tracks.length-1; i++) {
        const track = result.tracks[i]

        // dummy node
        // TODO: implement our custom analyzer node
        track.analyser = context.createGain() as unknown as AnalyserNode

        const startNode = applyEffects.buildAudioNodeGraph(
            context, mix, track, i, result.tempo,
            origin, result.master, [], false
        )

        const trackGain = context.createGain()
        trackGain.gain.setValueAtTime(1.0, context.currentTime)

        for (const clip of track.clips) {
            // create the audio source node to contain the audio buffer
            // and play it at the designated time
            const source = context.createBufferSource()

            // Special case for pitchshifted tracks. The pitchshifted
            // audio buffer is different than the clip audio buffer, and
            // has different start and end times
            let start, end
            const pitchshiftEffect = track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT']
            if (pitchshiftEffect !== undefined) {
                esconsole('Using pitchshifted audio for ' + clip.filekey +
                            ' on track ' + i,
                            ['DEBUG','RENDERER'])
                source.buffer = clip.pitchshift!.audio
                start = ESUtils.measureToTime(
                    clip.pitchshift!.start, result.tempo
                )
                end = ESUtils.measureToTime(
                    clip.pitchshift!.end, result.tempo
                )
            // for all other tracks we can use the unprocessed clip buffer
            } else {
                source.buffer = clip.audio
                start = ESUtils.measureToTime(clip.start, result.tempo)
                end = ESUtils.measureToTime(clip.end, result.tempo)
            }

            // connect the buffer source to the effects tree
            source.connect(trackGain)

            const location = ESUtils.measureToTime(
                clip.measure, result.tempo
            )

            // the clip duration may be shorter than the buffer duration
            const bufferDuration = source.buffer.duration
            let clipDuration = end - start

            if (origin > location && origin > location + end) {
                // case: clip is playing in the past
                // do nothing, we don't have to play this clip

            } else if (origin > location && origin <= location + clipDuration) {
                // case: clip is playing from the middle
                // calculate the offset and begin playing
                const offset = origin - location
                start += offset
                clipDuration -= offset
                source.start(context.currentTime, start, clipDuration)
                source.stop(context.currentTime + clipDuration)

                // keep this flag so we only stop clips that are playing
                // (otherwise we get an exception raised)
                clip.playing = true
            } else {
                // case: clip is in the future
                // calculate when it should begin and register it to play
                const offset = location - origin

                source.start(
                    context.currentTime + offset, start, clipDuration
                )
                clip.playing = true
            }

            // keep a reference to this audio source so we can pause it
            clip.source = source
            clip.gain = trackGain  // used to mute the track/clip
        }

        // if master track
        if (i === 0) {
            // master limiter for reducing overload clipping
            const limiter = context.createDynamicsCompressor()
            limiter.threshold.value = -1
            limiter.knee.value = 0
            limiter.ratio.value = 10000  // high compression ratio
            limiter.attack.value = 0  // as fast as possible
            limiter.release.value = 0.1  // could be a bit shorter

            result.master.connect(limiter)
            limiter.connect(trackGain)

            if (typeof(startNode) !== "undefined") {
                // TODO: the effect order (limiter) is not right
                trackGain.connect(startNode)
            } else {
                trackGain.connect(mix)
            }

            mix.connect(context.destination)
        } else {
            if (typeof(startNode) !== "undefined") {
                // track gain -> effect tree
                trackGain.connect(startNode)
            } else {
                // track gain -> (bypass effect tree) -> analyzer & master
                trackGain.connect(track.analyser)
                track.analyser.connect(result.master)
            }
        }
    }

    return new Promise((resolve, reject) => {
        context.startRendering()
        context.oncomplete = result => {
            resolve(result.renderedBuffer)
            esconsole('Render to buffer completed.', ['DEBUG','RENDERER'])
        }
    })
}
 
// Render a result for offline playback. Returns a promise that resolves to a Blob.
export const renderWav = (result: DAWData) => {
    return new Promise((resolve, reject) => {
        renderBuffer(result)
        .then((buffer: AudioBuffer) => resolve(bufferToWav(buffer)))
        .catch(err => reject(err))
    })
}

// Render a result to mp3 for offline playback. Returns a Promise that resolves to a Blob.
export const renderMp3 = (result: DAWData) => {
    return new Promise((resolve, reject) => {
        renderBuffer(result).then((buffer: AudioBuffer) => {
            const mp3encoder = new lamejs.Mp3Encoder(2, 44100, 160)
            const mp3Data = []

            const left = float32ToInt16(buffer.getChannelData(0))
            const right = float32ToInt16(buffer.getChannelData(1))
            const sampleBlockSize = 1152
            let mp3buf

            const len = left.length

            for (let i = 0; i < len; i += sampleBlockSize) {
                const leftChunk = left.subarray(i, i + sampleBlockSize)
                const rightChunk = right.subarray(i, i + sampleBlockSize)
                mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf)
                }
            }
            mp3buf = mp3encoder.flush()

            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf)
            }

            const blob = new Blob(mp3Data, {type: 'audio/mp3'})
            resolve(blob)
        }).catch(err => reject(err))
    })
}

// Merge all the given clip buffers into one large buffer.
// Returns a promise that resolves to an AudioBuffer.
export const mergeClips = (clips: Clip[], tempo: number) => {
    esconsole('Merging clips', ['DEBUG', 'RENDERER'])
    // calculate the length of the merged clips
    let length = 0
    for (const clip of clips) {
        const end = clip.measure + clip.end
        if (end > length) {
            length = end
        }
    }
    const duration = ESUtils.measureToTime(length, tempo)

    const promise = new Promise((resolve, reject) => {
        // create an offline context for rendering
        const context = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(NUM_CHANNELS, SAMPLE_RATE * duration, SAMPLE_RATE)

        const master = context.createGain()
        master.connect(context.destination)

        for (const clip of clips) {
            const source = context.createBufferSource()
            source.buffer = clip.audio

            source.connect(master)

            const startTime = ESUtils.measureToTime(clip.measure, tempo)
            const startOffset = ESUtils.measureToTime(clip.start, tempo)
            const endOffset = ESUtils.measureToTime(clip.end, tempo)

            if (endOffset < startOffset) {
                continue
            }

            source.start(startTime + startOffset)
            source.stop(startTime + (endOffset - startOffset))
        }

        context.startRendering()

        context.oncomplete = result => {
            esconsole('Merged clips', ['DEBUG','RENDERER'])
            resolve(result.renderedBuffer)
        }
    })

    return promise
}

// Take a rendered offline audio context buffer and turn it into a WAV file Blob.
const bufferToWav = (buffer: AudioBuffer) => {
    const pcmarrayL = buffer.getChannelData(0)
    const pcmarrayR = buffer.getChannelData(1)

    const interleaved = interleave(pcmarrayL, pcmarrayR)
    const dataview = encodeWAV(interleaved)
    const audioBlob = new Blob([dataview], { type: 'audio/wav' })
    return audioBlob
}

// Create an interleaved two-channel array for WAV file output.
const interleave = (inputL: Float32Array, inputR: Float32Array) => {
    const length = inputL.length + inputR.length
    const result = new Float32Array(length)

    let index = 0, inputIndex = 0

    while (index < length) {
        result[index++] = inputL[inputIndex]
        result[index++] = inputR[inputIndex]
        inputIndex++
    }
    return result
}

// Encode an array of interleaved 2-channel samples to a WAV file.
const encodeWAV = (samples: Float32Array) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF identifier
    writeString(view, 0, 'RIFF')
    // file length
    view.setUint32(4, 32 + samples.length * 2, true)
    // RIFF type
    writeString(view, 8, 'WAVE')
    // format chunk identifier
    writeString(view, 12, 'fmt ')
    // format chunk length
    view.setUint32(16, 16, true)
    // sample format (raw)
    view.setUint16(20, 1, true)
    // channel count
    view.setUint16(22, 2, true)
    // sample rate
    view.setUint32(24, SAMPLE_RATE, true)
    // byte rate (sample rate * block align)
    view.setUint32(28, SAMPLE_RATE * 4, true)
    // block align (channel count * bytes per sample)
    view.setUint16(32, 4, true)
    // bits per sample
    view.setUint16(34, 16, true)
    // data chunk identifier
    writeString(view, 36, 'data')
    // data chunk length
    view.setUint32(40, samples.length * 2, true)

    floatTo16BitPCM(view, 44, samples)

    return view
}

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
}

const float32ToInt16 = (input: Float32Array) => {
    const res = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]))
        res[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return res
}

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
    }
}