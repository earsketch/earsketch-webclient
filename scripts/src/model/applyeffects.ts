// Web Audio effect chain constructors
import { AudioContextWithGain, EffectRange, Track } from '../app/player'
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import {
    Effect, BandpassEffect, ChorusEffect, CompressorEffect, DelayEffect, DistortionEffect,
    Eq3BandEffect, FilterEffect, FlangerEffect, PanEffect, PhaserEffect, PitchshiftEffect,
    ReverbEffect, RingmodEffect, TremoloEffect, VolumeEffect, WahEffect
} from './audioeffects'


export const EFFECT_MAP: { [key: string]: typeof Effect } = {
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

const bypassComplement = (bypass_state: number) => {
    return bypass_state ? 0 : 1
}

const setMix = (node: any, wetValue: number, time: number) => {
    node.wetLevel.gain.setValueAtTime(wetValue, time)
    node.dryLevel.gain.setValueAtTime(1 - wetValue, time)
}

export const scaleEffect = (effectName: string, parameter: string, effectStartValue: number | undefined, effectEndValue: number | undefined) => {
    esconsole("Scaling effect values; parameter is " + parameter, "debug")
    const effect = EFFECT_MAP[effectName]
    effectStartValue ??= effect.DEFAULTS[parameter].value
    effectEndValue ??= effectStartValue
    return [effect.scale(parameter, effectStartValue), effect.scale(parameter, effectEndValue)]
}

// Build audio node graph and schedule automation.
export const buildAudioNodeGraph = (
    context: AudioContextWithGain, track: Track, tracknumber: number, tempo: number,
    offsetInSeconds: number, output: AudioNode, bypassedEffects: string[], wav_export: boolean
) => {
    esconsole("Building audio node graph", "debug")

    // Only one effect is needed per automation track.
    // This keeps track of the effects we have already created.
    const effectNodes: { [key: string]: any } = {}

    // Audio node graph can be constructed like a linked list
    let firstNode: AudioNode | undefined = undefined
    // Shim to avoid special flags & cases in first iteration.
    let lastNode = { connect(target: AudioNode) { firstNode = target } }

    // Flatten the track effects
    const effectRanges = []
    for (const effect of Object.values(track.effects)) {
        for (const range of effect) {
            effectRanges.push(range)
        }
    }

    for (const effect of effectRanges) {
        if (!wav_export && (bypassedEffects.indexOf(effect.name + "-" + effect.parameter) > -1)) {
            // Bypass designated effect.
            esconsole("bypassed effect", "debug")
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

        // Setup.
        const effectType = EFFECT_MAP[effect.name]
        const pastEndLocation = (effect.endMeasure !== 0) && (ESUtils.measureToTime(effect.endMeasure, tempo) <= offsetInSeconds)
        const startTime = Math.max(context.currentTime + ESUtils.measureToTime(effect.startMeasure, tempo) - offsetInSeconds, context.currentTime)
        const endTime = Math.max(context.currentTime + ESUtils.measureToTime(effect.endMeasure, tempo) - offsetInSeconds, context.currentTime)
        const time = pastEndLocation ? context.currentTime : startTime
        const value = pastEndLocation ? effect.endValue : effect.startValue
    
        // TODO: Resolve exceptions as soon as we determine it is safe to do so, and then simplify the logic here.

        const createNewNode = effectNodes[effect.name] === undefined
        if (createNewNode) {
            // Create node for effect. We only do this once per effect type.
            // Subsequent EffectRanges with the same name modify the existing effect.
            const node = effectType.create(context)
            lastNode.connect(node.input)

            if (effect.name !== "PITCHSHIFT") {
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                    if (["BYPASS", "MIX", "EQ3BAND_HIGHFREQ"].indexOf(parameter) == -1) {
                        const value = effectType.scale(parameter, (info as any).value)
                        effectType.get(node, parameter).setValueAtTime(value, context.currentTime)
                    }
                }
                // NOTE: Weird exception for DISTORTION here from before The Great Refactoring.
                if (effect.name !== "VOLUME" && effect.name !== "DISTORTION") {
                    setMix(node, effectType.DEFAULTS.MIX.value, context.currentTime)
                }
            }
            effectNodes[effect.name] = node
        }

        const node = effectNodes[effect.name]

        // Handle parameters.
        if (effect.name === "PITCHSHIFT") {
            // Nope.
        } else if (effect.parameter === "BYPASS") {
            node.bypass.gain.setValueAtTime(bypassComplement(value), time)
            node.bypassDry.gain.setValueAtTime(value, time)
            if (!pastEndLocation && effect.endMeasure !== 0) {
                node.bypass.gain.setValueAtTime(bypassComplement(effect.endValue), endTime)
                node.bypassDry.gain.setValueAtTime(effect.endValue, endTime)
            }
        } else if (effect.parameter === "MIX" && effect.name !== "VOLUME") {
            setMix(node, value, time)
            if (!pastEndLocation && effect.endMeasure !== 0) {
                node.wetLevel.gain.linearRampToValueAtTime(effect.endValue, endTime)
                node.dryLevel.gain.linearRampToValueAtTime(1 - effect.endValue, endTime)
            }
            // Apply defaults only the first time this kind of node is created
            // NOTE: Weird exception for DISTO_GAIN here from before The Great Refactoring.
            if (createNewNode) {
                for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                    if (["BYPASS", "MIX", "EQ3BAND_HIGHFREQ", "DISTO_GAIN"].indexOf(parameter) == -1) {
                        const value = effectType.scale(parameter, (info as any).value)
                        effectType.get(node, parameter).setValueAtTime(value, time)
                    }
                }
            }
        } else {
            if (pastEndLocation) {
                // Inexplicably, this did not happen for REVERB_TIME pre-Refactoring.
                // So, for now, it does not happen here.
                if (effect.parameter !== "REVERB_TIME") {
                    // NOTE: endValue is not scaled here because it was scaled earlier.
                    effectType.get(node, effect.parameter).setValueAtTime(value, time)
                }
                // Apply defaults (to all the other parameters) only the first time this kind of node is created
                if (createNewNode) {
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["BYPASS", "MIX", "EQ3BAND_HIGHFREQ", effect.parameter].indexOf(parameter) == -1) {
                            const value = effectType.scale(parameter, (info as any).value)
                            effectType.get(node, parameter).setValueAtTime(value, time)
                        }
                    }
                    if (effect.name !== "VOLUME") {
                        setMix(node, effectType.DEFAULTS.MIX.value, time)
                    }
                }
            } else {
                // Apply effect in the future
                const param = effectType.get(node, effect.parameter)
                param.setValueAtTime(value, time)
                if (!pastEndLocation && effect.endMeasure !== 0) {
                    param.linearRampToValueAtTime(effect.endValue, endTime)
                }
                // Apply defaults (to all the other parameters) only the first time this kind of node is created
                if (createNewNode) {
                    for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                        if (["BYPASS", "MIX", effect.parameter].indexOf(parameter) == -1) {
                            const value = effectType.scale(parameter, (info as any).value)
                            effectType.get(node, parameter).setValueAtTime(value, time)
                        }
                    }
                    if (effect.name !== "VOLUME") {
                        setMix(node, effectType.DEFAULTS.MIX.value, time)
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
            // if mix track, connect to the final output
            lastNode.connect(analyserNode)
            analyserNode.connect(context.master)
        } else {
            // if non-mix track, connect to result.master
            lastNode.connect(analyserNode)
            analyserNode.connect(output)
        }
    }

    return firstNode
}