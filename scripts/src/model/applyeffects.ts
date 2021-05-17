// Web Audio effect chain constructors
import { AudioContextWithGain, Track } from '../app/player'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import { 
    BandpassNode, ChorusNode, CompressorNode, CustomDelayNode, CustomPannerNode, 
    DistortionNode, Eq3bandNode, FilterNode, FlangerNode, PhaserNode, PitchshiftNode,
    ReverbNode1, RingmodNode, TremoloNode, VolumeNode, WahNode
} from './audioeffects'

// If multiple gain automations occur, only 1 node is required.
// Hence, these flags will keep check on duplication of effect nodes
// Another reason why these flags are useful - we need to apply defaults
// only the first time the node is created.
export const resetAudioNodeFlags = () => {
    buildAudioNodeGraph.firstNodeCreatedFlag = 0
    buildAudioNodeGraph.gainNodeCreatedFlag = 0
    buildAudioNodeGraph.delayNodeCreatedFlag = 0
    buildAudioNodeGraph.filterNodeCreatedFlag = 0
    buildAudioNodeGraph.compressorNodeCreatedFlag = 0
    buildAudioNodeGraph.pannerNodeCreatedFlag = 0
    buildAudioNodeGraph.bandpassNodeCreatedFlag = 0
    buildAudioNodeGraph.eq3bandNodeCreatedFlag = 0
    buildAudioNodeGraph.chorusNodeCreatedFlag = 0
    buildAudioNodeGraph.flangerNodeCreatedFlag = 0
    buildAudioNodeGraph.phaserNodeCreatedFlag = 0
    buildAudioNodeGraph.tremoloNodeCreatedFlag = 0
    buildAudioNodeGraph.distortionNodeCreatedFlag = 0
    buildAudioNodeGraph.pitchshiftNodeCreatedFlag = 0
    buildAudioNodeGraph.ringmodNodeCreatedFlag = 0
    buildAudioNodeGraph.wahNodeCreatedFlag = 0
    buildAudioNodeGraph.reverbNodeCreatedFlag = 0
}

/********************* EFFECT DEFAULTS HASH TABLE *******************************/
export const effectDefaults: any = {
    "VOLUME": {
        DEFAULT_PARAM: "GAIN",
        GAIN: {defaultVal: 0.0, min: -60, max: 12},
        BYPASS: {defaultVal: 0.0, min: 0.0, max: 1.0}
    },
    "DELAY": {
        DEFAULT_PARAM: "DELAY_TIME",
        DELAY_TIME: {defaultVal: 300, min: 0.0, max: 4000.0},
        DELAY_FEEDBACK: {defaultVal: -5.0, min: -120.0, max: -1.0},
        MIX: {defaultVal: 0.5, min: 0.0, max: 1.0},
        BYPASS: {defaultVal: 0.0, min: 0.0, max: 1.0}
    },
    "FILTER": {
        DEFAULT_PARAM: "FILTER_FREQ",
        FILTER_FREQ: {min: 20.0, max: 20000.0, defaultVal: 1000.0},
        FILTER_RESONANCE: {min: 0.0, max: 1.0, defaultVal: 0.8},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    'COMPRESSOR': {
        DEFAULT_PARAM: "COMPRESSOR_THRESHOLD",
        COMPRESSOR_THRESHOLD: {min: -30.0, max: 0.0, defaultVal: -18.0},
        COMPRESSOR_RATIO: {min: 1.0, max: 100.0, defaultVal: 10.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    },
    "PAN": {
        DEFAULT_PARAM: "LEFT_RIGHT",
        LEFT_RIGHT: {min: -100.0, max: 100.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    },
    "BANDPASS": {
        DEFAULT_PARAM: "BANDPASS_FREQ",
        BANDPASS_FREQ: {min: 20.0, max: 20000.0, defaultVal: 800.0},
        BANDPASS_WIDTH: {min: 0.0, max: 1.0, defaultVal: 0.5},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "EQ3BAND": {
        DEFAULT_PARAM: "EQ3BAND_LOWGAIN",
        EQ3BAND_LOWGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_LOWFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        EQ3BAND_MIDGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_MIDFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        EQ3BAND_HIGHGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_HIGHFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "CHORUS": {
        DEFAULT_PARAM: "CHORUS_LENGTH",
        CHORUS_LENGTH: {min: 1.0, max: 250.0, defaultVal: 15.0},
        CHORUS_NUMVOICES: {min: 1.0, max: 8.0, defaultVal: 1.0},
        CHORUS_RATE: {min: 0.1, max: 16.0, defaultVal: 0.5},
        CHORUS_MOD: {min: 0.0, max: 1.0, defaultVal: 0.7},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "FLANGER": {
        DEFAULT_PARAM: "FLANGER_LENGTH",
        FLANGER_LENGTH: {min: 0.0, max: 200.0, defaultVal: 6.0},
        FLANGER_FEEDBACK: {min: -80.0, max: -1.0, defaultVal: -50.0},
        FLANGER_RATE: {min: 0.001, max: 100.0, defaultVal: 0.6},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "PHASER": {
        DEFAULT_PARAM: "PHASER_RATE",
        PHASER_RATE: {min: 0.0, max: 10.0, defaultVal: 0.5},
        PHASER_FEEDBACK: {min: -120.0, max: -1.0, defaultVal: -3.0},
        PHASER_RANGEMIN: {min: 40.0, max: 20000.0, defaultVal: 440.0},
        PHASER_RANGEMAX: {min: 40.0, max: 20000.0, defaultVal: 1600.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "TREMOLO": {
        DEFAULT_PARAM: "TREMOLO_FREQ",
        TREMOLO_FREQ: {min: 0.0, max: 100.0, defaultVal: 4.0},
        TREMOLO_AMOUNT: {min: -60.0, max: 0.0, defaultVal: -6.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "DISTORTION": {
        DEFAULT_PARAM: "DISTO_GAIN",
        DISTO_GAIN: {min: 0.0, max: 50.0, defaultVal: 20.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 0.5}
    },
    "PITCHSHIFT": {
        DEFAULT_PARAM: "PITCHSHIFT_SHIFT",
        PITCHSHIFT_SHIFT: {min: -12.0, max: 12.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "RINGMOD": {
        DEFAULT_PARAM: "RINGMOD_MODFREQ",
        RINGMOD_MODFREQ: {min: 0.0, max: 100.0, defaultVal: 40.0},
        RINGMOD_FEEDBACK: {min: 0.0, max: 100.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "WAH": {
        DEFAULT_PARAM: "WAH_POSITION",
        WAH_POSITION: {min: 0.0, max: 1.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    },
    "REVERB": {
        DEFAULT_PARAM: "REVERB_DAMPFREQ",
        REVERB_TIME: {min: 0.0, max: 4000, defaultVal: 3500},
        REVERB_DAMPFREQ: {min: 200, max: 18000, defaultVal: 8000},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    }
}

/**********************************************************************/
/******************** Need to scale the effects ***********************/
/**********************************************************************/

export const dbToFloat = (dbValue: number) => {
    return (Math.pow(10, (0.05 * dbValue)))
}

const linearScaling = (yMin: number, yMax: number, xMin: number, xMax: number, inputY: number) => {
    const percent = (inputY - yMin) / (yMax - yMin)
    return percent * (xMax - xMin) + xMin
}

const bypassValueComplement = (bypass_state: number) => {
    if (bypass_state)
        return 0
    else
        return 1
}

export const scaleEffect = (effectname: string, parameter: string, effectStartValue: number, effectEndValue: number) => {
    esconsole('parameter is ' + parameter, 'debug')

    if (parameter == 'DEFAULT' || parameter == undefined)
        parameter = effectDefaults[effectname]['DEFAULT_PARAM']
    if (effectStartValue == undefined)
        effectStartValue = effectDefaults[effectname][parameter].defaultVal
    if (effectEndValue == undefined)
        effectEndValue = effectStartValue
    let start = effectStartValue
    let end = effectEndValue

    esconsole("Scaling effect values", 'debug')
    if (effectname == 'VOLUME') {
        if (parameter == 'GAIN') {
            start = dbToFloat(effectStartValue)
            end = dbToFloat(effectEndValue)

        }
        return [start, end]
    }

    else if (effectname == 'DELAY') {
        if (parameter == 'DELAY_TIME') {
            // converting milliseconds to seconds
            start = start / 1000
            end = end / 1000

        }
        if (parameter == 'DELAY_FEEDBACK') {
            start = dbToFloat(effectStartValue)
            end = dbToFloat(effectEndValue)

        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]

    }

    else if (effectname == 'FILTER') //in this context, filter means low-pass. We have a separate bandpass filter
    {

        if (parameter == 'FILTER_FREQ') {
            // no scaling for filter frequency. Its already input in Hertz

        }
        if (parameter == 'FILTER_RESONANCE') {
            start = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 1, 5, effectStartValue)
            end = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 1, 5, effectEndValue)

        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)

        }
        return [start, end]
    }


    else if (effectname == 'COMPRESSOR') {
        return [start, end]
        // no scaling required for compressor. All values in db
    }

    else if (effectname == 'PAN') {
        if (parameter == 'LEFT_RIGHT') {
            start = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, -1, 1, effectStartValue)
            end = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, -1, 1, effectEndValue)
        }
        return [start, end]
    }


    else if (effectname == 'BANDPASS') // bandpass filter
    {
        if (parameter == 'BANDPASS_FREQ') {
            // no scaling for filter frequency. Its already input in Hertz

        }
        if (parameter == 'BANDPASS_WIDTH') { // adjusting the Q factor
            start = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 1, 5, effectStartValue)
            end = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 1, 5, effectEndValue)
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'EQ3BAND') // 3 band equalizer
    {
// We're safe here. No scaling is required. All valeus are in db or Hz which is what web audio natively accepts
        return [start, end]
    }

    else if (effectname == 'CHORUS') // chorus effect
    {
        if (parameter == 'CHORUS_LENGTH') {
            // milliseconds to seconds
            start = start / 1000
            end = end / 1000
        }
        if (parameter == 'CHORUS_NUMVOICES') {
            // Just an integer, no scaling needed
        }
        if (parameter == 'CHORUS_RATE') {
            // No scaling. Value in Hertz, which can be directly mapped to LFO frequency
        }
        if (parameter == 'CHORUS_MOD') { // depth of modulation
            // scale by a factor of 1000. Essentially, it scales the amplitude of the LFO. This has to be scaled down
            // to get a realistic effect as we are modulating delay values.
            start = start / 1000
            end = end / 1000
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'FLANGER') // flanger effect
    {
        if (parameter == 'FLANGER_LENGTH') {
            // milliseconds to seconds
            start = start / 1000
            end = end / 1000
        }
        if (parameter == 'FLANGER_FEEDBACK') {
            // db to float value
            start = dbToFloat(effectStartValue)
            end = dbToFloat(effectEndValue)
        }
        if (parameter == 'FLANGER_RATE') {
            // No scaling. Value in Hertz, which can be directly mapped to LFO frequency
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'PHASER') // phaser effect
    {
        if (parameter == 'PHASER_RANGEMIN') {
            // its in Hz so no scaling required
        }
        if (parameter == 'PHASER_RANGEMAX') {
            // its in Hz so no scaling required
        }
        if (parameter == 'PHASER_FEEDBACK') {
            // db to float value
            start = dbToFloat(effectStartValue)
            end = dbToFloat(effectEndValue)
        }
        if (parameter == 'PHASER_RATE') {
            // No scaling. Value in Hertz, which can be directly mapped to LFO frequency
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }


    else if (effectname == 'TREMOLO') // tremolo effect
    {

        if (parameter == 'TREMOLO_FREQ') {
            // no scaling, already in Hz
        }
        if (parameter == 'TREMOLO_AMOUNT') {
            // db to float value
            start = dbToFloat(effectStartValue)
            end = dbToFloat(effectEndValue)
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'DISTORTION') // distortion effect
    {
        if (parameter == 'DISTO_GAIN') {
            // converting 0 -> 50 to 0 to 5
            // But for now mapping it to mix parameter 0-1
            start = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 0, 1, effectStartValue)
            end = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 0, 1, effectEndValue)
        }
        if (parameter == 'MIX') {  // currently not implemented for distortion
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'PITCHSHIFT') // pitchshift effect
    {
        if (parameter == 'PITCHSHIFT_SHIFT') {
            // converting semitones to cents
            start = effectStartValue * 100
            end = effectEndValue * 100
        }
        if (parameter == 'MIX') {  // currently not implemented for pitchshift
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }


    else if (effectname == 'RINGMOD') // Ringmod effect
    {
        if (parameter == 'RINGMOD_MODFREQ') {
            // no scaling, already in Hz
        }
        if (parameter == 'RINGMOD_FEEDBACK') {
            // This is is percentage. Need to convert it to float between 0 and 1 to feed the gain node.
            start = (effectStartValue) / 100
            end = (effectEndValue) / 100
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }


    else if (effectname == 'WAH') // Ringmod effect
    {
        if (parameter == 'WAH_POSITION') {
            // position of 0 to 1 must sweep frequencies in a certain range, say 350Hz to 10Khz
            start = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 350, 10000, effectStartValue)
            end = linearScaling(effectDefaults[effectname][parameter].min, effectDefaults[effectname][parameter].max, 350, 10000, effectEndValue)
        }
        if (parameter == 'MIX') {
            // no scaling required as it anyway ranges from 0 to 1 (dry - wet)
        }
        return [start, end]
    }

    else if (effectname == 'REVERB')
        {
        if (parameter == 'REVERB_TIME') {
                        start = ((0.8/4000)*(start-4000)) + 0.8
                        end = ((0.8/4000)*(end-4000)) + 0.8
                }
        
        

        return [start, end]
    }

// end of scale effect function
}

/**************************** BUILD AUDIO NODE GRAPH  *************************/
/**************************** AND SCHEDULE AUTOMATION *************************/
interface BuildAudioNodeGraph {
    (context: AudioContext, track: any, tracknumber: number, tempo: number, offsetInSeconds: number, master_collect: GainNode, bypassedEffects: any, wav_export: boolean): any
    firstNodeCreatedFlag: number
    gainNodeCreatedFlag: number
    delayNodeCreatedFlag: number
    filterNodeCreatedFlag: number
    compressorNodeCreatedFlag: number
    pannerNodeCreatedFlag: number
    bandpassNodeCreatedFlag: number
    eq3bandNodeCreatedFlag: number
    chorusNodeCreatedFlag: number
    flangerNodeCreatedFlag: number
    phaserNodeCreatedFlag: number
    tremoloNodeCreatedFlag: number
    distortionNodeCreatedFlag: number
    pitchshiftNodeCreatedFlag: number
    ringmodNodeCreatedFlag: number
    wahNodeCreatedFlag: number
    reverbNodeCreatedFlag: number
}

export const buildAudioNodeGraph: BuildAudioNodeGraph = <BuildAudioNodeGraph>((context: AudioContextWithGain, track: Track, tracknumber: number, tempo: number, offsetInSeconds: number, master_collect: any, bypassedEffects: string[], wav_export: any) => {
    // Returns the WebAudio context time.
    const getOffsetTime = (location: number) => {
        return Math.max(context.currentTime + ESUtils.measureToTime(location, tempo) - offsetInSeconds, context.currentTime)
    }

    const checkPastEffectEndLocation = () => {
        // careful with the scope
        return (effect.endMeasure !== 0) && (ESUtils.measureToTime(effect.endMeasure, tempo) <= offsetInSeconds)
    }

    // Shorthand function for setting the wet / dry mix parameter.
    const setMix = (node: any, wetValue: number | "default", time: number) => {
        if (wetValue === 'default') {
            wetValue = effectDefaults[effect.name]['MIX'].defaultVal
        }
        node.wetLevel.gain.setValueAtTime(wetValue, time)
        node.dryLevel.gain.setValueAtTime(1 - (wetValue as number), time)
    }

    // Shorthand function for setting the mix parameters in the future.
    const setMixInTheFuture = (node: any) => {
        setMix(node, effect.startValue, getOffsetTime(effect.startMeasure))

        if (effect.endLocation !== 0) {
            node.wetLevel.gain.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
            node.dryLevel.gain.linearRampToValueAtTime(1 - effect.endValue, getOffsetTime(effect.endMeasure))
        }
    }

    const applyEffectInTheFuture = (param: AudioParam) => {
        param.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))

        if (effect.endMeasure !== 0) {
            param.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
        }
    }

    // Shorthand function for setting the bypass behaviors.
    const setBypass = (node: any) => {
        if (checkPastEffectEndLocation()) {
            node.bypass.gain.setValueAtTime(bypassValueComplement(effect.endValue), context.currentTime)
            node.bypassDry.gain.setValueAtTime(effect.endValue, context.currentTime)
        } else {
            if (effect.endMeasure === 0) {
                node.bypass.gain.setValueAtTime(bypassValueComplement(effect.startvalue), getOffsetTime(effect.startMeasure))
                node.bypassDry.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
            }
            else {
                node.bypass.gain.setValueAtTime(bypassValueComplement(effect.startValue), getOffsetTime(effect.startMeasure))
                node.bypass.gain.setValueAtTime(bypassValueComplement(effect.endValue), getOffsetTime(effect.endMeasure))
                node.bypassDry.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                node.bypassDry.gain.setValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
            }
        }
    }

    esconsole('Building audio node graph', 'debug')

    let lastNode // Audio node graph can be constructed like a linked list
    let firstNode
    let effect: any

    // flatten the track effects
    const effects = []
    for (const k in track.effects) {
        effect = track.effects[k]
        for (const i in effect) {
            effects.push(effect[i])
        }
    }

    for (const i in effects) {
        effect = effects[i]

        if (!wav_export && (bypassedEffects.indexOf(effect.name + "-" + effect.parameter) > -1)) { // bypass designated effects
            esconsole('bypassed effect', 'debug')
            continue
        }

        //----------- VOLUME -------------//
        if (effect.name == 'VOLUME') {
            //============== setup ==============//
            let VolumeEffectNode
            if (buildAudioNodeGraph.gainNodeCreatedFlag == 0) {
                VolumeEffectNode = new (VolumeNode as any)(context)

                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(VolumeEffectNode.input)
                }
            }

            buildAudioNodeGraph.gainNodeCreatedFlag = ++buildAudioNodeGraph.gainNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = VolumeEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'GAIN') {
                if (checkPastEffectEndLocation()) {
                    VolumeEffectNode.volume.gain.setValueAtTime(effect.endValue, context.currentTime)
                } else {
                    applyEffectInTheFuture(VolumeEffectNode.volume.gain)
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(VolumeEffectNode)
            }

            lastNode = VolumeEffectNode
        }

        //----------- DELAY -------------//
        if (effect.name == 'DELAY') {
            //============== setup ==============//
            let DelayEffectNode
            if (buildAudioNodeGraph.delayNodeCreatedFlag == 0) {
                DelayEffectNode = new (CustomDelayNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(DelayEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                DelayEffectNode.delay.delayTime.setValueAtTime((effectDefaults[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                setMix(DelayEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.delayNodeCreatedFlag = ++buildAudioNodeGraph.delayNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = DelayEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag

            }

            //============== params ==============//
            if (effect.parameter == 'DELAY_TIME') {

                if (checkPastEffectEndLocation()) {
                    DelayEffectNode.delay.delayTime.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                        setMix(DelayEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(DelayEffectNode.delay.delayTime)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['DELAY_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(DelayEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'DELAY_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    DelayEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((effectDefaults[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                        setMix(DelayEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(DelayEffectNode.feedback.gain)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((effectDefaults[effect.name]['DELAY_TIME'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(DelayEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(DelayEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((effectDefaults[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                    }
                } else {
                    setMixInTheFuture(DelayEffectNode)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag == 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((effectDefaults[effect.name]['DELAY_TIME'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['DELAY_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(DelayEffectNode)
            }

            lastNode = DelayEffectNode
        }

        //----------- FILTER -------------//
        if (effect.name == 'FILTER') {
            //============== setup ==============//
            let FilterEffectNode, scaledFilterQ
            if (buildAudioNodeGraph.filterNodeCreatedFlag == 0) {
                FilterEffectNode = new (FilterNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(FilterEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                FilterEffectNode.filter.frequency.setValueAtTime(effectDefaults[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                scaledFilterQ = linearScaling(effectDefaults[effect.name]['FILTER_RESONANCE'].min, effectDefaults[effect.name]['FILTER_RESONANCE'].max, 1, 5, effectDefaults[effect.name]['FILTER_RESONANCE'].defaultVal)
                FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                setMix(FilterEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.filterNodeCreatedFlag = ++buildAudioNodeGraph.filterNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = FilterEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'FILTER_FREQ') {
                if (checkPastEffectEndLocation()) {
                    FilterEffectNode.filter.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['FILTER_RESONANCE'].min, effectDefaults[effect.name]['FILTER_RESONANCE'].max, 1, 5, effectDefaults[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                        setMix(FilterEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FilterEffectNode.filter.frequency)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['FILTER_RESONANCE'].min, effectDefaults[effect.name]['FILTER_RESONANCE'].max, 1, 5, effectDefaults[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                        setMix(FilterEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'FILTER_RESONANCE') {
                if (checkPastEffectEndLocation()) {
                    FilterEffectNode.filter.Q.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        FilterEffectNode.filter.frequency.setValueAtTime(effectDefaults[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                        setMix(FilterEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FilterEffectNode.filter.Q)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        FilterEffectNode.filter.frequency.setValueAtTime(effectDefaults[effect.name]['FILTER_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FilterEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(FilterEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['FILTER_RESONANCE'].min, effectDefaults[effect.name]['FILTER_RESONANCE'].max, 1, 5, effectDefaults[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.frequency.setValueAtTime(effectDefaults[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(FilterEffectNode)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['FILTER_RESONANCE'].min, effectDefaults[effect.name]['FILTER_RESONANCE'].max, 1, 5, effectDefaults[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.frequency.setValueAtTime(effectDefaults[effect.name]['FILTER_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(FilterEffectNode)
            }

            lastNode = FilterEffectNode
        }

        //----------- BANDPASS -------------//
        if (effect.name == 'BANDPASS') {
            //============== setup ==============//
            let BandpassEffectNode, scaledFilterQ
            if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 0) {
                BandpassEffectNode = new (BandpassNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(BandpassEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                BandpassEffectNode.bandpass.frequency.setValueAtTime(effectDefaults[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                scaledFilterQ = linearScaling(effectDefaults[effect.name]['BANDPASS_WIDTH'].min, effectDefaults[effect.name]['BANDPASS_WIDTH'].max, 1, 5, effectDefaults[effect.name]['BANDPASS_WIDTH'].defaultVal)
                BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                setMix(BandpassEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.bandpassNodeCreatedFlag = ++buildAudioNodeGraph.bandpassNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = BandpassEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'BANDPASS_FREQ') {
                if (checkPastEffectEndLocation()) {
                    BandpassEffectNode.bandpass.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['BANDPASS_WIDTH'].min, effectDefaults[effect.name]['BANDPASS_WIDTH'].max, 1, 5, effectDefaults[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                        setMix(BandpassEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(BandpassEffectNode.bandpass.frequency)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['BANDPASS_WIDTH'].min, effectDefaults[effect.name]['BANDPASS_WIDTH'].max, 1, 5, effectDefaults[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                        setMix(BandpassEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BANDPASS_WIDTH') {
                if (checkPastEffectEndLocation()) {
                    BandpassEffectNode.bandpass.Q.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(effectDefaults[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                        setMix(BandpassEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(BandpassEffectNode.bandpass.Q)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(effectDefaults[effect.name]['BANDPASS_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(BandpassEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(BandpassEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['BANDPASS_WIDTH'].min, effectDefaults[effect.name]['BANDPASS_WIDTH'].max, 1, 5, effectDefaults[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(effectDefaults[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(BandpassEffectNode)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag == 1) {
                        scaledFilterQ = linearScaling(effectDefaults[effect.name]['BANDPASS_WIDTH'].min, effectDefaults[effect.name]['BANDPASS_WIDTH'].max, 1, 5, effectDefaults[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(effectDefaults[effect.name]['BANDPASS_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(BandpassEffectNode)
            }

            lastNode = BandpassEffectNode
        }

        //----------- EQ3BAND -------------//
        if (effect.name == 'EQ3BAND') {
            //============== setup ==============//
            let Eq3bandEffectNode
            if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 0) {
                Eq3bandEffectNode = new (Eq3bandNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(Eq3bandEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                setMix(Eq3bandEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.eq3bandNodeCreatedFlag = ++buildAudioNodeGraph.eq3bandNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = Eq3bandEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'EQ3BAND_LOWGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.lowshelf.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'EQ3BAND_LOWFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.lowshelf.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'EQ3BAND_MIDGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.midpeak.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.midpeak.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'EQ3BAND_MIDFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.midpeak.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'EQ3BAND_HIGHGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.highshelf.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.highshelf.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'EQ3BAND_HIGHFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.highshelf.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.highshelf.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(Eq3bandEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(Eq3bandEffectNode)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag == 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(effectDefaults[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(Eq3bandEffectNode)
            }

            lastNode = Eq3bandEffectNode
        }

        //----------- COMPRESSOR -------------//
        if (effect.name == 'COMPRESSOR') {
            //============== setup ==============//
            let CompressorEffectNode
            if (buildAudioNodeGraph.compressorNodeCreatedFlag == 0) {
                CompressorEffectNode = new (CompressorNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(CompressorEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                CompressorEffectNode.compressor.ratio.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_RATIO'].defaultVal, context.currentTime)
                CompressorEffectNode.compressor.threshold.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, context.currentTime)
            }

            buildAudioNodeGraph.compressorNodeCreatedFlag = ++buildAudioNodeGraph.compressorNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = CompressorEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag

            }

            //============== params ==============//
            if (effect.parameter == 'COMPRESSOR_THRESHOLD') {
                if (checkPastEffectEndLocation()) {
                    CompressorEffectNode.compressor.threshold.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag == 1) {
                        CompressorEffectNode.compressor.ratio.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_RATIO'].defaultVal, context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(CompressorEffectNode.compressor.threshold)

                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag == 1) {
                        CompressorEffectNode.compressor.ratio.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_RATIO'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'COMPRESSOR_RATIO') {
                if (checkPastEffectEndLocation()) {
                    CompressorEffectNode.compressor.ratio.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag == 1) {
                        CompressorEffectNode.compressor.threshold.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(CompressorEffectNode.compressor.ratio)

                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag == 1) {
                        CompressorEffectNode.compressor.threshold.setValueAtTime(effectDefaults[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(CompressorEffectNode)
            }

            lastNode = CompressorEffectNode
        }

        //----------- CHORUS -------------//
        if (effect.name == 'CHORUS') {
            //============== setup ==============//
            let ChorusEffectNode
            if (buildAudioNodeGraph.chorusNodeCreatedFlag == 0) {
                ChorusEffectNode = new (ChorusNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(ChorusEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                    // switch on defaultVal number of delay lines
                    ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                }

                for (let i = 0; i < 8; i++) {
                    // set default delay time on all delay lines
                    ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                }

                ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                setMix(ChorusEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.chorusNodeCreatedFlag = ++buildAudioNodeGraph.chorusNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = ChorusEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'CHORUS_LENGTH') {
                if (checkPastEffectEndLocation()) {
                    for (let i = 0; i < 8; i++) {
                        ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime(effect.endValue, context.currentTime)
                    }

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure == 0) {
                        for (let i = 0; i < 8; i++) {
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        }
                    } else {
                        for (let i = 0; i < 8; i++) {
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                            ChorusEffectNode.inputDelay[i].delayTime.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        }
                    }

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'CHORUS_NUMVOICES') {
                if (checkPastEffectEndLocation()) {
                    for (let i = 0; i < effect.endValue; i++) {
                        ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                    }

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure == 0) {
                        for (let i = 0; i < effect.endValue; i++) {
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                    } else {
                        for (let i = 0; i < effect.endValue; i++) {
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                            ChorusEffectNode.inputDelayGain[i].gain.linearRampToValueAtTime(1, getOffsetTime(effect.endMeasure))
                        }
                    }

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'CHORUS_RATE') {
                if (checkPastEffectEndLocation()) {
                    ChorusEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }

                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }

                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(ChorusEffectNode.lfo.frequency)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))

                    }
                }
            }

            if (effect.parameter == 'CHORUS_MOD') {
                if (checkPastEffectEndLocation()) {
                    ChorusEffectNode.lfoGain.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(ChorusEffectNode.lfoGain.gain)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfoGain.gain.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(ChorusEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(ChorusEffectNode)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag == 1) {
                        for (let i = 0; i < effectDefaults[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((effectDefaults[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((effectDefaults[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(ChorusEffectNode)
            }

            lastNode = ChorusEffectNode
        }

        //----------- FLANGER -------------//
        if (effect.name == 'FLANGER') {
            //============== setup ==============//
            let FlangerEffectNode
            if (buildAudioNodeGraph.flangerNodeCreatedFlag == 0) {
                FlangerEffectNode = new (FlangerNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(FlangerEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                setMix(FlangerEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.flangerNodeCreatedFlag = ++buildAudioNodeGraph.flangerNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = FlangerEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            if (effect.parameter == 'FLANGER_LENGTH') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.inputDelay.delayTime.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.inputDelay.delayTime)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'FLANGER_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.feedback.gain)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'FLANGER_RATE') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {

                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.lfo.frequency)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {

                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(FlangerEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(FlangerEffectNode)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag == 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((effectDefaults[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }
            if (effect.parameter == 'BYPASS') {
                setBypass(FlangerEffectNode)
            }

            lastNode = FlangerEffectNode
        }

        //----------- PHASER -------------//
        if (effect.name == 'PHASER') {
            //============== setup ==============//
            let PhaserEffectNode
            if (buildAudioNodeGraph.phaserNodeCreatedFlag == 0) {
                PhaserEffectNode = new (PhaserNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(PhaserEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                setMix(PhaserEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.phaserNodeCreatedFlag = ++buildAudioNodeGraph.phaserNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = PhaserEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'PHASER_RANGEMIN') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.endValue, context.currentTime)
                    PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure == 0) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                    } else {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass1.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                    }

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'PHASER_RANGEMAX') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.endValue, context.currentTime)
                    PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure == 0) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                    } else {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                    }

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'PHASER_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(PhaserEffectNode.feedback.gain)

                    // Apply defaults only the first time phaser node is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'PHASER_RATE') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(PhaserEffectNode.lfo.frequency)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(PhaserEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(PhaserEffectNode)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag == 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(PhaserEffectNode)
            }

            lastNode = PhaserEffectNode
        }

        //----------- TREMOLO -------------//
        if (effect.name == 'TREMOLO') {
            //============== setup ==============//
            let TremoloEffectNode
            if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 0) {
                TremoloEffectNode = new (TremoloNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(TremoloEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                TremoloEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                setMix(TremoloEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.tremoloNodeCreatedFlag = ++buildAudioNodeGraph.tremoloNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = TremoloEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'TREMOLO_FREQ') {
                if (checkPastEffectEndLocation()) {
                    TremoloEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {

                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                        setMix(TremoloEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(TremoloEffectNode.lfo.frequency)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['TREMOLO_AMOUNT'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(TremoloEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'TREMOLO_AMOUNT') {
                if (checkPastEffectEndLocation()) {
                    TremoloEffectNode.lfoGain.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {

                        TremoloEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                        setMix(TremoloEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(TremoloEffectNode.lfoGain.gain)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['TREMOLO_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(TremoloEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(TremoloEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                    }
                } else {
                    setMixInTheFuture(TremoloEffectNode)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag == 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['TREMOLO_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(effectDefaults[effect.name]['TREMOLO_AMOUNT'].defaultVal), getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(TremoloEffectNode)
            }

            lastNode = TremoloEffectNode
        }

        //----------- PAN -------------//
        if (effect.name == 'PAN') {
            //============== setup ==============//
            let PannerEffectNode
            if (buildAudioNodeGraph.pannerNodeCreatedFlag == 0) {
                PannerEffectNode = new (CustomPannerNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(PannerEffectNode.input)
                }
            }

            buildAudioNodeGraph.pannerNodeCreatedFlag = ++buildAudioNodeGraph.pannerNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = PannerEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
            }

            //============== params ==============//
            if (effect.parameter == 'LEFT_RIGHT') {
                if (checkPastEffectEndLocation()) {
                    PannerEffectNode.panLeft.gain.setValueAtTime((effect.endValue * -0.5) + 0.5, context.currentTime)
                    PannerEffectNode.panRight.gain.setValueAtTime((effect.endValue * 0.5) + 0.5, context.currentTime)
                } else {
                    // if the effect is in the future
                    if (effect.endMeasure == 0) {
                        PannerEffectNode.panLeft.gain.setValueAtTime((effect.startValue * -0.5) + 0.5, getOffsetTime(effect.startMeasure))
                        PannerEffectNode.panRight.gain.setValueAtTime((effect.startValue * 0.5) + 0.5, getOffsetTime(effect.startMeasure))
                    } else {
                        PannerEffectNode.panLeft.gain.setValueAtTime((effect.startValue * -0.5) + 0.5, getOffsetTime(effect.startMeasure))
                        PannerEffectNode.panLeft.gain.linearRampToValueAtTime((effect.endValue * -0.5) + 0.5, getOffsetTime(effect.endMeasure))
                        PannerEffectNode.panRight.gain.setValueAtTime((effect.startValue * 0.5) + 0.5, getOffsetTime(effect.startMeasure))
                        PannerEffectNode.panRight.gain.linearRampToValueAtTime((effect.endValue * 0.5) + 0.5, getOffsetTime(effect.endMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(PannerEffectNode)
            }

            lastNode = PannerEffectNode
        }

        //----------- DISTORTION -------------//
        // Right now all preGain sets are disabled as we are only using mix.
        if (effect.name == 'DISTORTION') {
            if (wav_export) {
                // EarSketch.Interpreter.addWarning('Distortion effect in track ' + tracknumber + ' will not reflect in wav file')
            }

            //============== setup ==============//
            let DistortionEffectNode, scaledDistoGain
            if (buildAudioNodeGraph.distortionNodeCreatedFlag == 0) {
                DistortionEffectNode = new (DistortionNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(DistortionEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                // Remember that disto gain is currently mapped to mix! So scaling changes
                scaledDistoGain = linearScaling(effectDefaults[effect.name]['DISTO_GAIN'].min, effectDefaults[effect.name]['DISTO_GAIN'].max, 0, 1, effectDefaults[effect.name]['DISTO_GAIN'].defaultVal)
                // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                DistortionEffectNode.wetLevel.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - scaledDistoGain, context.currentTime)
            }

            buildAudioNodeGraph.distortionNodeCreatedFlag = ++buildAudioNodeGraph.distortionNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = DistortionEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'DISTO_GAIN') {

                if (checkPastEffectEndLocation()) {
                    // DistortionEffectNode.preGain.gain.setValueAtTime(effect.endValue, context.currentTime)
                    DistortionEffectNode.wetLevel.gain.setValueAtTime(effect.endValue, context.currentTime)
                    DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.distortionNodeCreatedFlag == 1) {
                        // Do nothing since disto gain is mix now!
                        // DistortionEffectNode.wetLevel.gain.setValueAtTime(effectDefaults[effect.name]['MIX'].defaultVal,context.currentTime)
                        // DistortionEffectNode.dryLevel.gain.setValueAtTime(1-effectDefaults[effect.name]['MIX'].defaultVal, context.currentTime)
                    }
                } else {
                    if (effect.endMeasure == 0) {
                        // DistortionEffectNode.preGain.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        DistortionEffectNode.wetLevel.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - effect.startValue, getOffsetTime(effect.startMeasure))
                    } else {
                        // DistortionEffectNode.preGain.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        // DistortionEffectNode.preGain.gain.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        DistortionEffectNode.wetLevel.gain.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        DistortionEffectNode.wetLevel.gain.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - effect.startValue, getOffsetTime(effect.startMeasure))
                        DistortionEffectNode.dryLevel.gain.linearRampToValueAtTime(1 - effect.endValue, getOffsetTime(effect.endMeasure))
                    }
                    // Apply defaults only the first time distortion is created
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag == 1) {
                        // DistortionEffectNode.wetLevel.gain.setValueAtTime(effectDefaults[effect.name]['MIX'].defaultVal, getOffsetTime(effect.startMeasure))
                        // DistortionEffectNode.dryLevel.gain.setValueAtTime(1-effectDefaults[effect.name]['MIX'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(DistortionEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time distortion is created
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag == 1) {
                        scaledDistoGain = linearScaling(effectDefaults[effect.name]['DISTO_GAIN'].min, effectDefaults[effect.name]['DISTO_GAIN'].max, 0, 1, effectDefaults[effect.name]['DISTO_GAIN'].defaultVal)
                        // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(DistortionEffectNode)

                    // Apply defaults only the first time distortion is created
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag == 1) {
                        scaledDistoGain = linearScaling(effectDefaults[effect.name]['DISTO_GAIN'].min, effectDefaults[effect.name]['DISTO_GAIN'].max, 0, 1, effectDefaults[effect.name]['DISTO_GAIN'].defaultVal)
                        // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(DistortionEffectNode)
            }

            lastNode = DistortionEffectNode
        }

        //----------- PITCHSHIFT -------------//
        if (effect.name == 'PITCHSHIFT') {
            // Do nothing, as we are using SoX for this effect. Just wrap a gain node.
            let PitchshiftEffectNode
            if (buildAudioNodeGraph.pitchshiftNodeCreatedFlag == 0) {
                PitchshiftEffectNode = new (PitchshiftNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(PitchshiftEffectNode)
                }
            }

            buildAudioNodeGraph.pitchshiftNodeCreatedFlag = ++buildAudioNodeGraph.pitchshiftNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = PitchshiftEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            lastNode = PitchshiftEffectNode
        }

        //----------- RING MODULATOR -------------//
        if (effect.name == 'RINGMOD') {
            //============== setup ==============//
            let RingmodEffectNode
            if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 0) {
                RingmodEffectNode = new (RingmodNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(RingmodEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                RingmodEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                RingmodEffectNode.feedback.gain.setValueAtTime((effectDefaults[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                setMix(RingmodEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.ringmodNodeCreatedFlag = ++buildAudioNodeGraph.ringmodNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = RingmodEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'RINGMOD_MODFREQ') {
                if (checkPastEffectEndLocation()) {
                    RingmodEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {

                        RingmodEffectNode.feedback.gain.setValueAtTime((effectDefaults[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                        setMix(RingmodEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(RingmodEffectNode.lfo.frequency)

                    // Apply defaults only the first time ring mod is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {
                        RingmodEffectNode.feedback.gain.setValueAtTime((effectDefaults[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, getOffsetTime(effect.startMeasure))
                        setMix(RingmodEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'RINGMOD_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    RingmodEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {

                        RingmodEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                        setMix(RingmodEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(RingmodEffectNode.feedback.gain)

                    // Apply defaults only the first time ring mode is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['RINGMOD_MODFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(RingmodEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(RingmodEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                        RingmodEffectNode.feedback.gain.setValueAtTime((effectDefaults[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(RingmodEffectNode)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag == 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(effectDefaults[effect.name]['RINGMOD_MODFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        RingmodEffectNode.feedback.gain.setValueAtTime((effectDefaults[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(RingmodEffectNode)
            }

            lastNode = RingmodEffectNode
        }

        //----------- WAH -------------//
        if (effect.name == 'WAH') {
            //============== setup ==============//
            let WahEffectNode, scaledWahPos
            if (buildAudioNodeGraph.wahNodeCreatedFlag == 0) {
                WahEffectNode = new (WahNode as any)(context)

                if (buildAudioNodeGraph.firstNodeCreatedFlag != 0) {
                    lastNode.connect(WahEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                scaledWahPos = linearScaling(effectDefaults[effect.name]['WAH_POSITION'].min, effectDefaults[effect.name]['WAH_POSITION'].max, 350, 10000, effectDefaults[effect.name]['WAH_POSITION'].defaultVal)
                WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, context.currentTime)

                setMix(WahEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.wahNodeCreatedFlag = ++buildAudioNodeGraph.wahNodeCreatedFlag

            if (buildAudioNodeGraph.firstNodeCreatedFlag == 0) {
                firstNode = WahEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }

            //============== params ==============//
            if (effect.parameter == 'WAH_POSITION') {
                if (checkPastEffectEndLocation()) {
                    WahEffectNode.bandpass.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.wahNodeCreatedFlag == 1) {
                        setMix(WahEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(WahEffectNode.bandpass.frequency)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag == 1) {
                        setMix(WahEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(WahEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag == 1) {
                        scaledWahPos = linearScaling(effectDefaults[effect.name]['WAH_POSITION'].min, effectDefaults[effect.name]['WAH_POSITION'].max, 350, 10000, effectDefaults[effect.name]['WAH_POSITION'].defaultVal)
                        WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(WahEffectNode)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag == 1) {
                        scaledWahPos = linearScaling(effectDefaults[effect.name]['WAH_POSITION'].min, effectDefaults[effect.name]['WAH_POSITION'].max, 350, 10000, effectDefaults[effect.name]['WAH_POSITION'].defaultVal)
                        WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'BYPASS') {
                setBypass(WahEffectNode)
            }

            lastNode = WahEffectNode
        }

        if (effect.name == 'REVERB') {
            let ReverbEffectNode1
            if (buildAudioNodeGraph.reverbNodeCreatedFlag === 0) {
                ReverbEffectNode1 = new (ReverbNode1 as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(ReverbEffectNode1.input) }
            }
        
            buildAudioNodeGraph.reverbNodeCreatedFlag = ++buildAudioNodeGraph.reverbNodeCreatedFlag
        
            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = ReverbEffectNode1
                buildAudioNodeGraph.firstNodeCreatedFlag = ++buildAudioNodeGraph.firstNodeCreatedFlag
            }


            if (effect.parameter == 'REVERB_TIME') {
                if (checkPastEffectEndLocation()) {
                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for(let i = 0; i < 8; i++) {
                        ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effectDefaults[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                    }
                        setMix(ReverbEffectNode1, 'default', context.currentTime)
                    }
                } else {
                    // if the effect is in the future
                    for(let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))

                            if (effect.endMeasure !== 0) {
                            ReverbEffectNode1.reverb.combFilters[i].resonance.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                            }
                        }

                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for(let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effectDefaults[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                        }
                        setMix(ReverbEffectNode1, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter == 'REVERB_DAMPFREQ') {
                if (checkPastEffectEndLocation()) {
                    for (let i = 0; i < 8; i++) {
                    ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effect.endValue, context.currentTime)
                }

                // apply defaults only the first time reverb is created
                if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                    setMix(ReverbEffectNode1, 'default', context.currentTime)
                }
            } else {
                // if the effect is in the future
                for (let i = 0; i < 8; i++) {
                    ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))

                    if (effect.endMeasure !== 0) {
                    ReverbEffectNode1.reverb.combFilters[i].dampening.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                    }
                }

                // apply defaults only the first time reverb is created
                if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                    setMix(ReverbEffectNode1, 'default', getOffsetTime(effect.startMeasure))
                }
            }
        }

        if (effect.parameter == 'MIX') {
            if (checkPastEffectEndLocation()) {
                // if we're past the effectendlocation, apply end value to rest of track
                setMix(ReverbEffectNode1, effect.endValue, context.currentTime)

                // apply defaults only the first time reverb is created
                if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                    for(let i = 0; i < 8; i++) {
                        ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effectDefaults[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                        ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime((0.8/4000)*(effectDefaults[effect.name]['REVERB_TIME'].defaultVal-4000)+0.8, context.currentTime)
                    }
                }
            } else {
                setMixInTheFuture(ReverbEffectNode1)

                // apply defaults only the first time reverb is created
                if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                    for (let i = 0; i < 8; i++) {
                        ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(effectDefaults[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                        ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime((0.8/4000)*(effectDefaults[effect.name]['REVERB_TIME'].defaultVal-4000)+0.8, context.currentTime)
                    }
                }
            }
        }


        if (effect.parameter == 'BYPASS') {
            setBypass(ReverbEffectNode1)
        }

        lastNode = ReverbEffectNode1
        //(0.8/4000)*(effectDefaults[effect.name]['REVERB_TIME'].defaultVal-4000)+0.8

} 
    } // end of for Loop

    if (typeof(lastNode) !== "undefined") {
        let analyserNode: AnalyserNode | GainNode = track.analyser

        // if analyserNode was not created successfully, replace it with a bypassing gain node
        if (Object.keys(analyserNode).length === 0) {
            analyserNode = context.createGain()
            analyserNode.gain.value = 1.0
        }

        // TODO: non-effect connections should be handled in player / renderer
        if (tracknumber === 0) {
            // if master track, connect to the final output
            lastNode.connect(analyserNode)
            analyserNode.connect(context.master)
        } else {
            // if non-master track, connect to result.master
            lastNode.connect(analyserNode)
            analyserNode.connect(master_collect)
        }
    }

    return firstNode
})