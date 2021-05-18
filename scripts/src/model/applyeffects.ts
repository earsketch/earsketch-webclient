// Web Audio effect chain constructors
import { AudioContextWithGain, Track } from '../app/player'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import {
    BandpassEffect, ChorusEffect, CompressorEffect, DelayEffect, DistortionEffect,
    Eq3BandEffect, FilterEffect, FlangerEffect, PanEffect, PhaserEffect, PitchshiftEffect,
    ReverbEffect, RingmodEffect, TremoloEffect, VolumeEffect, WahEffect
} from './audioeffects'

// If multiple gain automations occur, only 1 node is required.
// Hence, these flags will keep check on duplication of effect nodes
// Another reason why these flags are useful - we need to apply defaults
// only the first time the node is created.
export const resetAudioNodeFlags = () => {
    buildAudioNodeGraph.firstNodeCreatedFlag = 0
    buildAudioNodeGraph.createdNodes = {}
    for (const key of Object.keys(EFFECT_MAP)) {
        buildAudioNodeGraph.createdNodes[key] = 0
    }
}

const EFFECT_MAP = {
    VOLUME: VolumeEffect,
    DELAY: DelayEffect,
    FILTER: FilterEffect,
    COMPRESSOR: CompressorEffect,
    PAN: PanEffect,
    BANDPASS: BandpassEffect,
    EQ3BAND: Eq3BandEffect,
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

const scaleParam = (effect: string, parameter: string, value: number) => {
    return (EFFECT_MAP as any)[effect].scale(parameter, value) ?? value
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
        return [scaleParam(effectname, parameter, effectStartValue), scaleParam(effectname, parameter, effectEndValue)]
    }
}

interface BuildAudioNodeGraph {
    (context: AudioContext, track: any, tracknumber: number, tempo: number, offsetInSeconds: number, master_collect: GainNode, bypassedEffects: any, wav_export: boolean): any
    firstNodeCreatedFlag: number
    createdNodes: { [key: string]: number }
}

// Build audio node graph and schedule automation.
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

    for (effect of effects) {
        if (!wav_export && (bypassedEffects.indexOf(effect.name + "-" + effect.parameter) > -1)) { // bypass designated effects
            esconsole('bypassed effect', 'debug')
            continue
        }

        // Site of the Great Refactoring, in which a for loop of 1,633 lines was reformed down to 127
        // (including this comment, with another 152 lines of code in another module).
        // Before the Great Refactoring, there were a number of mysterious exceptions in the code.
        // These have been preserved, just in case they are significant or our users have scripts that expect them.
        // However, we should rid ourselves of these as soon as we can determine that it is safe to do so.
        // These exceptions are:
        // - In the "Apply defaults" sections, Eq3Band skips EQ3BAND_HIGHFREQ.
        //   This seems probably unintentional.
        // - Several chunks of logic are skipped for Pitchshift, which is apparently a do-nothing node.
        //   The old comment explaining this is:
        //   "Do nothing, as we are using SoX for this effect. Just wrap a gain node."
        //   I suspect this is outdated, but the status of pitchshifting is not immediately clear...
        // - There is some confusion between distortion's one real parameter (DISTO_GAIN)
        //   and the common parameter MIX, with the result that some logic is skipped.
        // - For reasons unknown, setting REVERB_TIME does not actually set the REVERB_TIME
        //   if the effect is not in the future. This might be unintentional.
        // There is also an exception for Volume in mix logic, which makes sense but could probably be avoided.

        // Setup
        const effectType = (EFFECT_MAP as any)[effect.name]
        let node
        if (!buildAudioNodeGraph.createdNodes[effect.name]) {
            node = new (effectType.NODE)(context)
            if (buildAudioNodeGraph.firstNodeCreatedFlag) {
                lastNode.connect(node.input)
            }

            if (effect.name !== "PITCHSHIFT") {
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                    if (["DEFAULT_PARAM", "BYPASS", "MIX", "EQ3BAND_HIGHFREQ"].indexOf(parameter) == -1) {
                        const value = scaleParam(effect.name, parameter, (info as any).defaultVal)
                        effectType.get(node, parameter).setValueAtTime(value, context.currentTime)
                    }
                }
                // NOTE: Weird exception for DISTORTION here from before The Great Refactoring.
                if (effect.name !== "VOLUME" && effect.name !== "DISTORTION") {
                    setMix(node, 'default', context.currentTime)
                }
            }
        }

        buildAudioNodeGraph.createdNodes[effect.name]++

        if (!buildAudioNodeGraph.firstNodeCreatedFlag) {
            firstNode = node
            buildAudioNodeGraph.firstNodeCreatedFlag++
        }

        // Params
        if (effect.name === "PITCHSHIFT") {
            // Nope.
        } else if (effect.parameter === "BYPASS") {
            setBypass(node)
        } else if (effect.name !== "VOLUME" && effect.parameter === "MIX") {
            if (checkPastEffectEndLocation()) {
                setMix(node, effect.endValue, context.currentTime)

                // NOTE: Weird exception for DISTO_GAIN here from before The Great Refactoring.
                // Apply defaults only the first time node is created
                if (buildAudioNodeGraph.createdNodes[effect.name] === 1) {
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["DEFAULT_PARAM", "BYPASS", "MIX", "EQ3BAND_HIGHFREQ", "DISTO_GAIN"].indexOf(parameter) == -1) {
                            const value = scaleParam(effect.name, parameter, (info as any).defaultVal)
                            effectType.get(node, parameter).setValueAtTime(value, context.currentTime)
                        }
                    }
                }
            } else {
                setMixInTheFuture(node)

                // Apply defaults only the first time delay is created
                if (buildAudioNodeGraph.createdNodes[effect.name] === 1) {
                    const time = getOffsetTime(effect.startMeasure)
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["DEFAULT_PARAM", "BYPASS", "MIX", "EQ3BAND_HIGHFREQ", "DISTRO_GAIN", effect.parameter].indexOf(parameter) == -1) {
                            const value = scaleParam(effect.name, parameter, (info as any).defaultVal)
                            effectType.get(node, parameter).setValueAtTime(value, time)
                        }
                    }
                }
            }
        } else {
            if (checkPastEffectEndLocation()) {
                // Inexplicably, this did not happen for REVERB_TIME pre-Refactoring.
                // So, for now, it does not happen here.
                if (effect.parameter !== "REVERB_TIME") {
                    // NOTE: endValue is not scaled here because it was scaled earlier.
                    effectType.get(node, effect.parameter).setValueAtTime(effect.endValue, context.currentTime)
                }
                // Apply defaults (to all the other parameters) only the first time this kind of node is created
                if (buildAudioNodeGraph.createdNodes[effect.name] === 1) {
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["DEFAULT_PARAM", "BYPASS", "MIX", "EQ3BAND_HIGHFREQ", effect.parameter].indexOf(parameter) == -1) {
                            const value = scaleParam(effect.name, parameter, (info as any).defaultVal)
                            effectType.get(node, parameter).setValueAtTime(value, context.currentTime)
                        }
                    }
                    if (effect.name !== "VOLUME") {
                        setMix(node, 'default', context.currentTime)
                    }
                }
            } else {
                applyEffectInTheFuture(effectType.get(node, effect.parameter))

                // Apply defaults (to all the other parameters) only the first time kind of node is created
                if (buildAudioNodeGraph.createdNodes[effect.name] === 1) {
                    const time = getOffsetTime(effect.startMeasure)
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["DEFAULT_PARAM", "BYPASS", "MIX", effect.parameter].indexOf(parameter) == -1) {
                            const value = scaleParam(effect.name, parameter, (info as any).defaultVal)
                            effectType.get(node, parameter).setValueAtTime(value, time)
                        }
                    }
                    if (effect.name !== "VOLUME") {
                        setMix(node, 'default', time)
                    }
                }
            }
        }
        lastNode = node
    }

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