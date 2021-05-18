// Web Audio effect chain constructors
import { AudioContextWithGain, Track } from '../app/player'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import {
    BandpassEffect, ChorusEffect, CompressorEffect, dbToFloat, DelayEffect,
    DistortionEffect, Eq3BandEffect, FilterEffect, FlangerEffect, linearScaling, PanEffect,
    PhaserEffect, PitchshiftEffect, ReverbEffect, RingmodEffect, TremoloEffect,
    VolumeEffect, WahEffect
} from './audioeffects'
import {
    BandpassNode, ChorusNode, CompressorNode, CustomDelayNode, CustomPannerNode, 
    DistortionNode, Eq3bandNode, FilterNode, FlangerNode, PhaserNode, PitchshiftNode,
    ReverbNode1, RingmodNode, TremoloNode, VolumeNode, WahNode
} from './audionodes'

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

const EFFECT_MAP = {
    VOLUME: VolumeEffect,
    DELAY: DelayEffect,
    FILTER: FilterEffect,
    COMPRESSOR: CompressorEffect,
    PAN: PanEffect,
    BANDPASS: BandpassEffect,
    EQ3BAN: Eq3BandEffect,  // <-- TODO: Typo in the key?
    CHORUS: ChorusEffect,
    FLANGER: FlangerEffect,
    PHASER: PhaserEffect,
    TREMOLO: TremoloEffect,
    DISTORTION: DistortionEffect,
    PITCHSHIFT: PitchshiftEffect,
    RINGMOD: RingmodEffect,
    WAH: WahEffect,
    REVERB: ReverbEffect,
}

export const EFFECT_DEFAULTS: any = Object.entries(EFFECT_MAP).reduce((obj: any, [key, value]) => (obj[key] = value.DEFAULTS, obj), {})

const bypassValueComplement = (bypass_state: number) => {
    return bypass_state ? 0 : 1
}

export const scaleEffect = (effectname: string, parameter: string, effectStartValue: number, effectEndValue: number) => {
    esconsole('parameter is ' + parameter, 'debug')

    if (parameter === 'DEFAULT' || parameter === undefined)
        parameter = EFFECT_DEFAULTS[effectname]['DEFAULT_PARAM']
    if (effectStartValue === undefined)
        effectStartValue = EFFECT_DEFAULTS[effectname][parameter].defaultVal
    if (effectEndValue === undefined)
        effectEndValue = effectStartValue

    esconsole("Scaling effect values", 'debug')
    if (effectname in EFFECT_MAP) {
        return [
            (EFFECT_MAP as any)[effectname].scale(parameter, effectStartValue) ?? effectStartValue,
            (EFFECT_MAP as any)[effectname].scale(parameter, effectStartValue) ?? effectEndValue
        ]
    }
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
            wetValue = EFFECT_DEFAULTS[effect.name]['MIX'].defaultVal
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
            } else {
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
        if (effect.name === 'VOLUME') {
            //============== setup ==============//
            let VolumeEffectNode
            if (buildAudioNodeGraph.gainNodeCreatedFlag === 0) {
                VolumeEffectNode = new (VolumeNode as any)(context)

                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(VolumeEffectNode.input)
                }
            }

            buildAudioNodeGraph.gainNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = VolumeEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'GAIN') {
                if (checkPastEffectEndLocation()) {
                    VolumeEffectNode.volume.gain.setValueAtTime(effect.endValue, context.currentTime)
                } else {
                    applyEffectInTheFuture(VolumeEffectNode.volume.gain)
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(VolumeEffectNode)
            }

            lastNode = VolumeEffectNode
        }

        //----------- DELAY -------------//
        if (effect.name === 'DELAY') {
            //============== setup ==============//
            let DelayEffectNode
            if (buildAudioNodeGraph.delayNodeCreatedFlag === 0) {
                DelayEffectNode = new (CustomDelayNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(DelayEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                DelayEffectNode.delay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                setMix(DelayEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.delayNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = DelayEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++

            }

            //============== params ==============//
            if (effect.parameter === 'DELAY_TIME') {
                if (checkPastEffectEndLocation()) {
                    DelayEffectNode.delay.delayTime.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                        setMix(DelayEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(DelayEffectNode.delay.delayTime)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['DELAY_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(DelayEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'DELAY_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    DelayEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                        setMix(DelayEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(DelayEffectNode.feedback.gain)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['DELAY_TIME'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(DelayEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(DelayEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['DELAY_TIME'].defaultVal) / 1000, context.currentTime)
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['DELAY_FEEDBACK'].defaultVal), context.currentTime)
                    }
                } else {
                    setMixInTheFuture(DelayEffectNode)

                    // Apply defaults only the first time delay is created
                    if (buildAudioNodeGraph.delayNodeCreatedFlag === 1) {
                        DelayEffectNode.delay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['DELAY_TIME'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        DelayEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['DELAY_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(DelayEffectNode)
            }

            lastNode = DelayEffectNode
        }

        //----------- FILTER -------------//
        if (effect.name === 'FILTER') {
            //============== setup ==============//
            let FilterEffectNode, scaledFilterQ
            if (buildAudioNodeGraph.filterNodeCreatedFlag === 0) {
                FilterEffectNode = new (FilterNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(FilterEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                FilterEffectNode.filter.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].min, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].defaultVal)
                FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                setMix(FilterEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.filterNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = FilterEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'FILTER_FREQ') {
                if (checkPastEffectEndLocation()) {
                    FilterEffectNode.filter.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].min, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                        setMix(FilterEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FilterEffectNode.filter.frequency)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].min, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                        setMix(FilterEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'FILTER_RESONANCE') {
                if (checkPastEffectEndLocation()) {
                    FilterEffectNode.filter.Q.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        FilterEffectNode.filter.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                        setMix(FilterEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FilterEffectNode.filter.Q)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        FilterEffectNode.filter.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FILTER_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FilterEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(FilterEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].min, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FILTER_FREQ'].defaultVal, context.currentTime)
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(FilterEffectNode)

                    // Apply defaults only the first time filter is created
                    if (buildAudioNodeGraph.filterNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].min, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['FILTER_RESONANCE'].defaultVal)
                        FilterEffectNode.filter.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FILTER_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        FilterEffectNode.filter.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(FilterEffectNode)
            }

            lastNode = FilterEffectNode
        }

        //----------- BANDPASS -------------//
        if (effect.name === 'BANDPASS') {
            //============== setup ==============//
            let BandpassEffectNode, scaledFilterQ
            if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 0) {
                BandpassEffectNode = new (BandpassNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(BandpassEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                BandpassEffectNode.bandpass.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].min, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].defaultVal)
                BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                setMix(BandpassEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.bandpassNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = BandpassEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'BANDPASS_FREQ') {
                if (checkPastEffectEndLocation()) {
                    BandpassEffectNode.bandpass.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].min, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                        setMix(BandpassEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(BandpassEffectNode.bandpass.frequency)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].min, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                        setMix(BandpassEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BANDPASS_WIDTH') {
                if (checkPastEffectEndLocation()) {
                    BandpassEffectNode.bandpass.Q.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                        setMix(BandpassEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(BandpassEffectNode.bandpass.Q)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['BANDPASS_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(BandpassEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(BandpassEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].min, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['BANDPASS_FREQ'].defaultVal, context.currentTime)
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(BandpassEffectNode)

                    // Apply defaults only the first time bandpass is created
                    if (buildAudioNodeGraph.bandpassNodeCreatedFlag === 1) {
                        scaledFilterQ = linearScaling(EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].min, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].max, 1, 5, EFFECT_DEFAULTS[effect.name]['BANDPASS_WIDTH'].defaultVal)
                        BandpassEffectNode.bandpass.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['BANDPASS_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        BandpassEffectNode.bandpass.Q.setValueAtTime(scaledFilterQ, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(BandpassEffectNode)
            }

            lastNode = BandpassEffectNode
        }

        //----------- EQ3BAND -------------//
        if (effect.name === 'EQ3BAND') {
            //============== setup ==============//
            let Eq3bandEffectNode
            if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 0) {
                Eq3bandEffectNode = new (Eq3bandNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(Eq3bandEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                setMix(Eq3bandEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.eq3bandNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = Eq3bandEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'EQ3BAND_LOWGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.lowshelf.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.lowshelf.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'EQ3BAND_LOWFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.lowshelf.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'EQ3BAND_MIDGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.midpeak.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.midpeak.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'EQ3BAND_MIDFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.midpeak.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.midpeak.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'EQ3BAND_HIGHGAIN') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.highshelf.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.highshelf.gain)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'EQ3BAND_HIGHFREQ') {
                if (checkPastEffectEndLocation()) {
                    Eq3bandEffectNode.highshelf.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                        setMix(Eq3bandEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(Eq3bandEffectNode.highshelf.frequency)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(Eq3bandEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(Eq3bandEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, context.currentTime)
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(Eq3bandEffectNode)

                    // Apply defaults only the first time the eq node is created
                    if (buildAudioNodeGraph.eq3bandNodeCreatedFlag === 1) {
                        Eq3bandEffectNode.lowshelf.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.lowshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_LOWGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.midpeak.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_MIDGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        Eq3bandEffectNode.highshelf.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['EQ3BAND_HIGHGAIN'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(Eq3bandEffectNode)
            }

            lastNode = Eq3bandEffectNode
        }

        //----------- COMPRESSOR -------------//
        if (effect.name === 'COMPRESSOR') {
            //============== setup ==============//
            let CompressorEffectNode
            if (buildAudioNodeGraph.compressorNodeCreatedFlag === 0) {
                CompressorEffectNode = new (CompressorNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(CompressorEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                CompressorEffectNode.compressor.ratio.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_RATIO'].defaultVal, context.currentTime)
                CompressorEffectNode.compressor.threshold.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, context.currentTime)
            }

            buildAudioNodeGraph.compressorNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = CompressorEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++

            }

            //============== params ==============//
            if (effect.parameter === 'COMPRESSOR_THRESHOLD') {
                if (checkPastEffectEndLocation()) {
                    CompressorEffectNode.compressor.threshold.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag === 1) {
                        CompressorEffectNode.compressor.ratio.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_RATIO'].defaultVal, context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(CompressorEffectNode.compressor.threshold)

                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag === 1) {
                        CompressorEffectNode.compressor.ratio.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_RATIO'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'COMPRESSOR_RATIO') {
                if (checkPastEffectEndLocation()) {
                    CompressorEffectNode.compressor.ratio.setValueAtTime(effect.endValue, context.currentTime)
                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag === 1) {
                        CompressorEffectNode.compressor.threshold.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(CompressorEffectNode.compressor.ratio)

                    // Apply defaults only the first time compressor is created
                    if (buildAudioNodeGraph.compressorNodeCreatedFlag === 1) {
                        CompressorEffectNode.compressor.threshold.setValueAtTime(EFFECT_DEFAULTS[effect.name]['COMPRESSOR_THRESHOLD'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(CompressorEffectNode)
            }

            lastNode = CompressorEffectNode
        }

        //----------- CHORUS -------------//
        if (effect.name === 'CHORUS') {
            //============== setup ==============//
            let ChorusEffectNode
            if (buildAudioNodeGraph.chorusNodeCreatedFlag === 0) {
                ChorusEffectNode = new (ChorusNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(ChorusEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                    // switch on defaultVal number of delay lines
                    ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                }

                for (let i = 0; i < 8; i++) {
                    // set default delay time on all delay lines
                    ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                }

                ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                setMix(ChorusEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.chorusNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = ChorusEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'CHORUS_LENGTH') {
                if (checkPastEffectEndLocation()) {
                    for (let i = 0; i < 8; i++) {
                        ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime(effect.endValue, context.currentTime)
                    }

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure === 0) {
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
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'CHORUS_NUMVOICES') {
                if (checkPastEffectEndLocation()) {
                    for (let i = 0; i < effect.endValue; i++) {
                        ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                    }

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure === 0) {
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
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'CHORUS_RATE') {
                if (checkPastEffectEndLocation()) {
                    ChorusEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }

                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }

                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(ChorusEffectNode.lfo.frequency)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))

                    }
                }
            }

            if (effect.parameter === 'CHORUS_MOD') {
                if (checkPastEffectEndLocation()) {
                    ChorusEffectNode.lfoGain.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        setMix(ChorusEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(ChorusEffectNode.lfoGain.gain)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfoGain.gain.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(ChorusEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(ChorusEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, context.currentTime)
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, context.currentTime)
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, context.currentTime)
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(ChorusEffectNode)

                    // Apply defaults only the first time chorus node is created
                    if (buildAudioNodeGraph.chorusNodeCreatedFlag === 1) {
                        for (let i = 0; i < EFFECT_DEFAULTS[effect.name]['CHORUS_NUMVOICES'].defaultVal; i++) {
                            // switch on defaultVal number of delay lines
                            ChorusEffectNode.inputDelayGain[i].gain.setValueAtTime(1, getOffsetTime(effect.startMeasure))
                        }
                        for (let i = 0; i < 8; i++) {
                            // set default delay time on all delay lines
                            ChorusEffectNode.inputDelay[i].delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        }
                        ChorusEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['CHORUS_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        ChorusEffectNode.lfoGain.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['CHORUS_MOD'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(ChorusEffectNode)
            }

            lastNode = ChorusEffectNode
        }

        //----------- FLANGER -------------//
        if (effect.name === 'FLANGER') {
            //============== setup ==============//
            let FlangerEffectNode
            if (buildAudioNodeGraph.flangerNodeCreatedFlag === 0) {
                FlangerEffectNode = new (FlangerNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(FlangerEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                setMix(FlangerEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.flangerNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = FlangerEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            if (effect.parameter === 'FLANGER_LENGTH') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.inputDelay.delayTime.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.inputDelay.delayTime)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'FLANGER_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.feedback.gain)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'FLANGER_RATE') {
                if (checkPastEffectEndLocation()) {
                    FlangerEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {

                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        setMix(FlangerEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(FlangerEffectNode.lfo.frequency)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {

                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        setMix(FlangerEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(FlangerEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), context.currentTime)
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, context.currentTime)
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(FlangerEffectNode)

                    // Apply defaults only the first time flanger is created
                    if (buildAudioNodeGraph.flangerNodeCreatedFlag === 1) {
                        FlangerEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['FLANGER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.inputDelay.delayTime.setValueAtTime((EFFECT_DEFAULTS[effect.name]['FLANGER_LENGTH'].defaultVal) / 1000, getOffsetTime(effect.startMeasure))
                        FlangerEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['FLANGER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }
            if (effect.parameter === 'BYPASS') {
                setBypass(FlangerEffectNode)
            }

            lastNode = FlangerEffectNode
        }

        //----------- PHASER -------------//
        if (effect.name === 'PHASER') {
            //============== setup ==============//
            let PhaserEffectNode
            if (buildAudioNodeGraph.phaserNodeCreatedFlag === 0) {
                PhaserEffectNode = new (PhaserNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(PhaserEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                setMix(PhaserEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.phaserNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = PhaserEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'PHASER_RANGEMIN') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.endValue, context.currentTime)
                    PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure === 0) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                    } else {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass1.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                    }

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'PHASER_RANGEMAX') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.endValue, context.currentTime)
                    PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    if (effect.endMeasure === 0) {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                    } else {
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                    }

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'PHASER_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(PhaserEffectNode.feedback.gain)

                    // Apply defaults only the first time phaser node is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'PHASER_RATE') {
                if (checkPastEffectEndLocation()) {
                    PhaserEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        setMix(PhaserEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(PhaserEffectNode.lfo.frequency)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(PhaserEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(PhaserEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, context.currentTime)
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), context.currentTime)
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(PhaserEffectNode)

                    // Apply defaults only the first time phaser is created
                    if (buildAudioNodeGraph.phaserNodeCreatedFlag === 1) {
                        PhaserEffectNode.allpass1.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass2.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMIN'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass3.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.allpass4.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RANGEMAX'].defaultVal, getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.feedback.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['PHASER_FEEDBACK'].defaultVal), getOffsetTime(effect.startMeasure))
                        PhaserEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['PHASER_RATE'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(PhaserEffectNode)
            }

            lastNode = PhaserEffectNode
        }

        //----------- TREMOLO -------------//
        if (effect.name === 'TREMOLO') {
            //============== setup ==============//
            let TremoloEffectNode
            if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 0) {
                TremoloEffectNode = new (TremoloNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(TremoloEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                TremoloEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                setMix(TremoloEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.tremoloNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = TremoloEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'TREMOLO_FREQ') {
                if (checkPastEffectEndLocation()) {
                    TremoloEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {

                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                        setMix(TremoloEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(TremoloEffectNode.lfo.frequency)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['TREMOLO_AMOUNT'].defaultVal), getOffsetTime(effect.startMeasure))
                        setMix(TremoloEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'TREMOLO_AMOUNT') {
                if (checkPastEffectEndLocation()) {
                    TremoloEffectNode.lfoGain.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {

                        TremoloEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                        setMix(TremoloEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(TremoloEffectNode.lfoGain.gain)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['TREMOLO_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(TremoloEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(TremoloEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['TREMOLO_FREQ'].defaultVal, context.currentTime)
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['TREMOLO_AMOUNT'].defaultVal), context.currentTime)
                    }
                } else {
                    setMixInTheFuture(TremoloEffectNode)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.tremoloNodeCreatedFlag === 1) {
                        TremoloEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['TREMOLO_FREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        TremoloEffectNode.lfoGain.gain.setValueAtTime(dbToFloat(EFFECT_DEFAULTS[effect.name]['TREMOLO_AMOUNT'].defaultVal), getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(TremoloEffectNode)
            }

            lastNode = TremoloEffectNode
        }

        //----------- PAN -------------//
        if (effect.name === 'PAN') {
            //============== setup ==============//
            let PannerEffectNode
            if (buildAudioNodeGraph.pannerNodeCreatedFlag === 0) {
                PannerEffectNode = new (CustomPannerNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(PannerEffectNode.input)
                }
            }

            buildAudioNodeGraph.pannerNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = PannerEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
            }

            //============== params ==============//
            if (effect.parameter === 'LEFT_RIGHT') {
                if (checkPastEffectEndLocation()) {
                    PannerEffectNode.panLeft.gain.setValueAtTime((effect.endValue * -0.5) + 0.5, context.currentTime)
                    PannerEffectNode.panRight.gain.setValueAtTime((effect.endValue * 0.5) + 0.5, context.currentTime)
                } else {
                    // if the effect is in the future
                    if (effect.endMeasure === 0) {
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

            if (effect.parameter === 'BYPASS') {
                setBypass(PannerEffectNode)
            }

            lastNode = PannerEffectNode
        }

        //----------- DISTORTION -------------//
        // Right now all preGain sets are disabled as we are only using mix.
        if (effect.name === 'DISTORTION') {
            if (wav_export) {
                // EarSketch.Interpreter.addWarning('Distortion effect in track ' + tracknumber + ' will not reflect in wav file')
            }

            //============== setup ==============//
            let DistortionEffectNode, scaledDistoGain
            if (buildAudioNodeGraph.distortionNodeCreatedFlag === 0) {
                DistortionEffectNode = new (DistortionNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(DistortionEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                // Remember that disto gain is currently mapped to mix! So scaling changes
                scaledDistoGain = linearScaling(EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].min, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].max, 0, 1, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].defaultVal)
                // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                DistortionEffectNode.wetLevel.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - scaledDistoGain, context.currentTime)
            }

            buildAudioNodeGraph.distortionNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = DistortionEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'DISTO_GAIN') {

                if (checkPastEffectEndLocation()) {
                    // DistortionEffectNode.preGain.gain.setValueAtTime(effect.endValue, context.currentTime)
                    DistortionEffectNode.wetLevel.gain.setValueAtTime(effect.endValue, context.currentTime)
                    DistortionEffectNode.dryLevel.gain.setValueAtTime(1 - effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.distortionNodeCreatedFlag === 1) {
                        // Do nothing since disto gain is mix now!
                        // DistortionEffectNode.wetLevel.gain.setValueAtTime(effectDefaults[effect.name]['MIX'].defaultVal,context.currentTime)
                        // DistortionEffectNode.dryLevel.gain.setValueAtTime(1-effectDefaults[effect.name]['MIX'].defaultVal, context.currentTime)
                    }
                } else {
                    if (effect.endMeasure === 0) {
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
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag === 1) {
                        // DistortionEffectNode.wetLevel.gain.setValueAtTime(effectDefaults[effect.name]['MIX'].defaultVal, getOffsetTime(effect.startMeasure))
                        // DistortionEffectNode.dryLevel.gain.setValueAtTime(1-effectDefaults[effect.name]['MIX'].defaultVal, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(DistortionEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time distortion is created
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag === 1) {
                        scaledDistoGain = linearScaling(EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].min, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].max, 0, 1, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].defaultVal)
                        // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(DistortionEffectNode)

                    // Apply defaults only the first time distortion is created
                    if (buildAudioNodeGraph.distortionNodeCreatedFlag === 1) {
                        scaledDistoGain = linearScaling(EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].min, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].max, 0, 1, EFFECT_DEFAULTS[effect.name]['DISTO_GAIN'].defaultVal)
                        // DistortionEffectNode.preGain.gain.setValueAtTime(scaledDistoGain, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(DistortionEffectNode)
            }

            lastNode = DistortionEffectNode
        }

        //----------- PITCHSHIFT -------------//
        if (effect.name === 'PITCHSHIFT') {
            // Do nothing, as we are using SoX for this effect. Just wrap a gain node.
            let PitchshiftEffectNode
            if (buildAudioNodeGraph.pitchshiftNodeCreatedFlag === 0) {
                PitchshiftEffectNode = new (PitchshiftNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(PitchshiftEffectNode)
                }
            }

            buildAudioNodeGraph.pitchshiftNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = PitchshiftEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            lastNode = PitchshiftEffectNode
        }

        //----------- RING MODULATOR -------------//
        if (effect.name === 'RINGMOD') {
            //============== setup ==============//
            let RingmodEffectNode
            if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 0) {
                RingmodEffectNode = new (RingmodNode as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(RingmodEffectNode.input)
                }
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                RingmodEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                RingmodEffectNode.feedback.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                setMix(RingmodEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.ringmodNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = RingmodEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'RINGMOD_MODFREQ') {
                if (checkPastEffectEndLocation()) {
                    RingmodEffectNode.lfo.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {

                        RingmodEffectNode.feedback.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                        setMix(RingmodEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(RingmodEffectNode.lfo.frequency)

                    // Apply defaults only the first time ring mod is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {
                        RingmodEffectNode.feedback.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, getOffsetTime(effect.startMeasure))
                        setMix(RingmodEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'RINGMOD_FEEDBACK') {
                if (checkPastEffectEndLocation()) {
                    RingmodEffectNode.feedback.gain.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {

                        RingmodEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                        setMix(RingmodEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(RingmodEffectNode.feedback.gain)

                    // Apply defaults only the first time ring mode is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['RINGMOD_MODFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        setMix(RingmodEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(RingmodEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['RINGMOD_MODFREQ'].defaultVal, context.currentTime)
                        RingmodEffectNode.feedback.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(RingmodEffectNode)

                    // Apply defaults only the first time tremolo is created
                    if (buildAudioNodeGraph.ringmodNodeCreatedFlag === 1) {
                        RingmodEffectNode.lfo.frequency.setValueAtTime(EFFECT_DEFAULTS[effect.name]['RINGMOD_MODFREQ'].defaultVal, getOffsetTime(effect.startMeasure))
                        RingmodEffectNode.feedback.gain.setValueAtTime((EFFECT_DEFAULTS[effect.name]['RINGMOD_FEEDBACK'].defaultVal) / 100, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(RingmodEffectNode)
            }

            lastNode = RingmodEffectNode
        }

        //----------- WAH -------------//
        if (effect.name === 'WAH') {
            //============== setup ==============//
            let WahEffectNode, scaledWahPos
            if (buildAudioNodeGraph.wahNodeCreatedFlag === 0) {
                WahEffectNode = new (WahNode as any)(context)

                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(WahEffectNode.input)
                }

                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                scaledWahPos = linearScaling(EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].min, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].max, 350, 10000, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].defaultVal)
                WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, context.currentTime)

                setMix(WahEffectNode, 'default', context.currentTime)
            }

            buildAudioNodeGraph.wahNodeCreatedFlag++

            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = WahEffectNode
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }

            //============== params ==============//
            if (effect.parameter === 'WAH_POSITION') {
                if (checkPastEffectEndLocation()) {
                    WahEffectNode.bandpass.frequency.setValueAtTime(effect.endValue, context.currentTime)

                    if (buildAudioNodeGraph.wahNodeCreatedFlag === 1) {
                        setMix(WahEffectNode, 'default', context.currentTime)
                    }
                } else {
                    applyEffectInTheFuture(WahEffectNode.bandpass.frequency)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag === 1) {
                        setMix(WahEffectNode, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    setMix(WahEffectNode, effect.endValue, context.currentTime)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag === 1) {
                        scaledWahPos = linearScaling(EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].min, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].max, 350, 10000, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].defaultVal)
                        WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, context.currentTime)
                    }
                } else {
                    setMixInTheFuture(WahEffectNode)

                    // Apply defaults only the first time wah is created
                    if (buildAudioNodeGraph.wahNodeCreatedFlag === 1) {
                        scaledWahPos = linearScaling(EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].min, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].max, 350, 10000, EFFECT_DEFAULTS[effect.name]['WAH_POSITION'].defaultVal)
                        WahEffectNode.bandpass.frequency.setValueAtTime(scaledWahPos, getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
                setBypass(WahEffectNode)
            }

            lastNode = WahEffectNode
        }

        if (effect.name === 'REVERB') {
            let ReverbEffectNode1
            if (buildAudioNodeGraph.reverbNodeCreatedFlag === 0) {
                ReverbEffectNode1 = new (ReverbNode1 as any)(context)
                if (buildAudioNodeGraph.firstNodeCreatedFlag !== 0) {
                    lastNode.connect(ReverbEffectNode1.input) }
            }
        
            buildAudioNodeGraph.reverbNodeCreatedFlag++
        
            if (buildAudioNodeGraph.firstNodeCreatedFlag === 0) {
                firstNode = ReverbEffectNode1
                buildAudioNodeGraph.firstNodeCreatedFlag++
            }


            if (effect.parameter === 'REVERB_TIME') {
                if (checkPastEffectEndLocation()) {
                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(EFFECT_DEFAULTS[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                        }
                        setMix(ReverbEffectNode1, 'default', context.currentTime)
                    }
                } else {
                    // if the effect is in the future
                    for (let i = 0; i < 8; i++) {
                        ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime(effect.startValue, getOffsetTime(effect.startMeasure))

                        if (effect.endMeasure !== 0) {
                            ReverbEffectNode1.reverb.combFilters[i].resonance.linearRampToValueAtTime(effect.endValue, getOffsetTime(effect.endMeasure))
                        }
                    }

                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for(let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(EFFECT_DEFAULTS[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                        }
                        setMix(ReverbEffectNode1, 'default', getOffsetTime(effect.startMeasure))
                    }
                }
            }

            if (effect.parameter === 'REVERB_DAMPFREQ') {
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

            if (effect.parameter === 'MIX') {
                if (checkPastEffectEndLocation()) {
                    // if we're past the effectendlocation, apply end value to rest of track
                    setMix(ReverbEffectNode1, effect.endValue, context.currentTime)

                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(EFFECT_DEFAULTS[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                            ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime((0.8/4000)*(EFFECT_DEFAULTS[effect.name]['REVERB_TIME'].defaultVal-4000)+0.8, context.currentTime)
                        }
                    }
                } else {
                    setMixInTheFuture(ReverbEffectNode1)

                    // apply defaults only the first time reverb is created
                    if (buildAudioNodeGraph.reverbNodeCreatedFlag === 1) {
                        for (let i = 0; i < 8; i++) {
                            ReverbEffectNode1.reverb.combFilters[i].dampening.setValueAtTime(EFFECT_DEFAULTS[effect.name]['REVERB_DAMPFREQ'].defaultVal, context.currentTime)
                            ReverbEffectNode1.reverb.combFilters[i].resonance.setValueAtTime((0.8/4000)*(EFFECT_DEFAULTS[effect.name]['REVERB_TIME'].defaultVal-4000)+0.8, context.currentTime)
                        }
                    }
                }
            }

            if (effect.parameter === 'BYPASS') {
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