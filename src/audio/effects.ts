// Construct Web Audio node graphs for effects and schedule automation
import { TempoMap } from "../app/tempo"
import { Track } from "common"
import esconsole from "../esconsole"
import {
    Effect, BandpassEffect, ChorusEffect, CompressorEffect, DelayEffect, DistortionEffect,
    Eq3BandEffect, FilterEffect, FlangerEffect, PanEffect, PhaserEffect, PitchshiftEffect,
    ReverbEffect, RingmodEffect, TempoEffect, TremoloEffect, VolumeEffect, WahEffect,
} from "./effectlibrary"

export const EFFECT_MAP: { [key: string]: typeof Effect } = {
    TEMPO: TempoEffect,
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

// Build audio node graph and schedule automation.
export function buildEffectGraph(
    context: BaseAudioContext, track: Track, tempoMap: TempoMap,
    startTime: number, waStartTime: number, bypassedEffects: string[]
) {
    esconsole("Building audio node graph", "debug")

    // Only one effect is needed per automation track.
    // This keeps track of the effects we have already created.
    const effects: { [key: string]: Effect } = {}

    // Audio node graph can be constructed like a linked list
    let firstNode: AudioNode | undefined
    // Shim to avoid special flags & cases in first iteration.
    let lastNode = { connect(target: AudioNode) { firstNode = target } }

    // Site of the Great Refactoring, in which a for loop of 1,633 lines was reformed down to 127
    // (including this comment, with another 152 lines of code in another module).
    // Before the Great Refactoring, there were a number of mysterious exceptions in the code.
    // These have been preserved, just in case they are significant or our users have scripts that expect them.
    // However, we should rid ourselves of these as soon as we can determine that it is safe to do so.
    // Some exceptions have been removed since the original Great Refactoring. The remaining ones are:
    // - In the "Apply defaults" sections, Eq3Band skips EQ3BAND_HIGHFREQ.
    //   This seems probably unintentional. There's also something weird in Eq3Band creation where the high freq is set to 0.
    // - Distortion's DISTO_GAIN is basically an alias for MIX, with the result that some logic is skipped
    //   when setting one or the other (presumably to avoid overwriting whichever parameter was just set).
    for (const [effect, automations] of Object.entries(track.effects)) {
        if (effect === "TEMPO") {
            // Dummy effect, not handled in audio graph.
            continue
        }

        const EffectType = EFFECT_MAP[effect]
        // Create node for effect.
        const node = new EffectType(context)
        lastNode.connect(node.input)

        for (const [parameter, envelope] of Object.entries(automations)) {
            node.automations.add(parameter)
            const param = node.parameters[parameter]

            // Find most recent point and upcoming point. (Ignore earlier points.)
            let i, nextPoint
            let prevPoint = envelope[0]
            for (i = 1; i < envelope.length; i++) {
                if (tempoMap.measureToTime(envelope[i].measure) > startTime) {
                    nextPoint = envelope[i]
                    break
                }
                prevPoint = envelope[i]
            }

            let lastShape = prevPoint.shape
            let value = prevPoint.value
            if (lastShape === "linear" && nextPoint !== undefined) {
                // Interpolate between previous point and next point.
                const prevTime = tempoMap.measureToTime(prevPoint.measure)
                const nextTime = tempoMap.measureToTime(nextPoint.measure)
                const frac = (startTime - prevTime) / (nextTime - prevTime)
                value = prevPoint.value + frac * (nextPoint.value - prevPoint.value)
            }
            param.setValueAtTime(EffectType.scale(parameter, value), waStartTime)

            // Schedule future points.
            for (; i < envelope.length; i++) {
                const time = waStartTime + tempoMap.measureToTime(envelope[i].measure) - startTime
                // Scale values from the ranges the user passes into the API to the ranges our Web Audio nodes expect.
                const value = EffectType.scale(parameter, envelope[i].value)
                if (lastShape === "square") {
                    param.setValueAtTime(value, time)
                } else {
                    param.linearRampToValueAtTime(value, time)
                }
                lastShape = envelope[i].shape
            }

            // Bypass parameter automation if requested
            const fullName = effect + "-" + parameter
            if (bypassedEffects.includes(fullName)) {
                esconsole("Bypassed effect: " + fullName, "debug")
                node.parameters[parameter].setBypass(true)
            }
        }
        node.updateBypass()
        effects[effect] = node
        lastNode = node
    }

    return { effects, input: firstNode, output: lastNode }
}
