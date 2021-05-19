// Web Audio effect chain constructors
import { Track } from '../app/player'
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

export const scaleEffect = (effectName: string, parameter: string, effectStartValue: number | undefined, effectEndValue: number | undefined) => {
    esconsole("Scaling effect values; parameter is " + parameter, "debug")
    const effect = EFFECT_MAP[effectName]
    effectStartValue ??= effect.DEFAULTS[parameter].value
    effectEndValue ??= effectStartValue
    return [effect.scale(parameter, effectStartValue), effect.scale(parameter, effectEndValue)]
}

// Build audio node graph and schedule automation.
export const buildAudioNodeGraph = (
    context: BaseAudioContext, mix: AudioNode, track: Track, tracknumber: number, tempo: number,
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
        const fullName = effect.name + "-" + effect.parameter
        if (!wav_export && (bypassedEffects.indexOf(fullName) > -1)) {
            esconsole("Bypassed effect: " + fullName, "debug")
            continue
        }

        // Site of the Great Refactoring, in which a for loop of 1,633 lines was reformed down to 127
        // (including this comment, with another 152 lines of code in another module).
        // Before the Great Refactoring, there were a number of mysterious exceptions in the code.
        // These have been preserved, just in case they are significant or our users have scripts that expect them.
        // However, we should rid ourselves of these as soon as we can determine that it is safe to do so.
        // These exceptions are:
        // - In the "Apply defaults" sections, Eq3Band skips EQ3BAND_HIGHFREQ.
        //   This seems probably unintentional. There's also something weird in Eq3Band creation where the high freq is set to 0.
        // - Several chunks of logic are skipped for Pitchshift, which is apparently a do-nothing node.
        //   The old comment explaining this is: "Do nothing, as we are using SoX for this effect. Just wrap a gain node."
        //   We are no longer using SoX for this, but the Pitchshift here indeed does nothing.
        // - Distortion's DISTO_GAIN is basically an alias for MIX, with the result that some logic is skipped
        //   when setting one or the other (presumably to avoid overwriting whichever parameter was just set).
        // - For reasons unknown, setting REVERB_TIME does not actually set the REVERB_TIME
        //   if the effect is not in the future. This might be unintentional.
        // - CHORUS_NUMVOICES always uses endValue and not startValue. Probably unintentional.

        // Setup.
        const effectType = EFFECT_MAP[effect.name]
        const pastEndLocation = (effect.endMeasure !== 0) && (ESUtils.measureToTime(effect.endMeasure, tempo) <= offsetInSeconds)
        const startTime = Math.max(context.currentTime + ESUtils.measureToTime(effect.startMeasure, tempo) - offsetInSeconds, context.currentTime)
        const endTime = Math.max(context.currentTime + ESUtils.measureToTime(effect.endMeasure, tempo) - offsetInSeconds, context.currentTime)
        const time = pastEndLocation ? context.currentTime : startTime
        // NOTE: Weird exception here for CHORUS_NUMVOICES.
        const value = effect.parameter === "CHORUS_NUMVOICES" ? effect.endValue : (pastEndLocation ? effect.endValue : effect.startValue)
    
        // TODO: Resolve exceptions as soon as we determine it is safe to do so, and then simplify the logic here.

        const createNewNode = effectNodes[effect.name] === undefined
        if (createNewNode) {
            // Create node for effect. We only do this once per effect type.
            // Subsequent EffectRanges with the same name modify the existing effect.
            const node = effectType.create(context)
            lastNode.connect(node.input)

            if (effect.name !== "PITCHSHIFT") {
                // Apply all defaults when the node is created. They will be overrided later with the setValueAtTime API.
                // NOTE: Weird exception for DISTORTION + MIX here from before The Great Refactoring.
                for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                    if (!["BYPASS", "EQ3BAND_HIGHFREQ"].includes(parameter)
                        && !(effect.name === "DISTORTION" && parameter === "MIX")) {
                        const value = effectType.scale(parameter, (info as any).value)
                        effectType.getParameters(node)[parameter].setValueAtTime(value, context.currentTime)
                    }
                }
            }
            effectNodes[effect.name] = node
        }

        const node = effectNodes[effect.name]

        // Handle parameters.
        if (effect.name === "PITCHSHIFT") {
            // Pre-Refactoring exception because Pitchshift effect does nothing. (Actual pitchshifting is handled somewhere else.)
            continue
        }

        // Inexplicably, this did not happen for REVERB_TIME pre-Refactoring.
        // So, for now, it does not happen here.
        if (!(pastEndLocation && effect.parameter === "REVERB_TIME")) {
            // NOTE: value is not scaled here because it was scaled earlier.
            const param = effectType.getParameters(node)[effect.parameter]
            param.setValueAtTime(value, time)
            if (!pastEndLocation && effect.endMeasure !== 0) {
                param.linearRampToValueAtTime(effect.endValue, endTime)
            }

        }
        // Apply defaults (to all the other parameters) only the first time this kind of node is created
        // NOTE: Collection of weird pre-Refactoring exceptions in the inner and outer `if` conditions.
        if (createNewNode && effect.parameter !== "BYPASS") {
            for (const [parameter, info] of Object.entries(effectType.DEFAULTS)) {
                if (!["BYPASS", "EQ3BAND_HIGHFREQ", effect.parameter].includes(parameter)
                    && !(effect.name === "DISTORTION" && parameter === "MIX")
                    && !(effect.parameter === "MIX" && parameter === "DISTO_GAIN")) {
                    const value = effectType.scale(parameter, (info as any).value)
                    effectType.getParameters(node)[parameter].setValueAtTime(value, time)
                }
            }
        }
        lastNode = node
    }

    if (typeof lastNode !== "undefined") {
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
            analyserNode.connect(mix)
        } else {
            // if non-mix track, connect to result.master
            lastNode.connect(analyserNode)
            analyserNode.connect(output)
        }
    }

    return firstNode
}