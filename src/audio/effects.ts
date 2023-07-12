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
    offsetInSeconds: number, output: AudioNode, bypassedEffects: string[]
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
    for (const [fullName, envelope] of Object.entries(track.effects)) {
        const [effect, parameter] = fullName.split("-")
        if (effect === "TEMPO") {
            // Dummy effect, not handled in audio graph.
            continue
        }

        const EffectType = EFFECT_MAP[effect]
        if (effects[effect] === undefined) {
            // Create node for effect. We only do this once per effect type.
            // Subsequent automations for the same effect (but different parameters) modify the existing effect.
            const node = new EffectType(context)
            lastNode.connect(node.input)
            effects[effect] = node
        }
        effects[effect].automations.add(parameter)
        const node = effects[effect]

        let lastShape = "square"
        for (const [pointIndex, point] of envelope.entries()) {
            // TODO: Interpolate based on current time in case we're in the middle of a ramp.
            const pastEndLocation = (pointIndex < envelope.length - 1) && (tempoMap.measureToTime(point.measure) <= offsetInSeconds)
            let time = Math.max(context.currentTime + tempoMap.measureToTime(point.measure) - offsetInSeconds, context.currentTime)
            // Scale values from the ranges the user passes into the API to the ranges our Web Audio nodes expect.
            const value = EffectType.scale(parameter, point.value)
            time = pastEndLocation ? context.currentTime : time

            if (!pastEndLocation) {
                const param = node.parameters[parameter]
                if (lastShape === "square") {
                    param.setValueAtTime(value, time)
                } else {
                    param.linearRampToValueAtTime(value, time)
                }
            }
            lastShape = point.shape
        }

        // Bypass parameter automation if requested
        if (bypassedEffects.includes(fullName)) {
            esconsole("Bypassed effect: " + fullName, "debug")
            node.parameters[parameter].setBypass(true)
        }
        lastNode = node
    }

    lastNode.connect(output) // TODO: maybe handle this in caller
    for (const effect of Object.values(effects)) {
        effect.updateBypass()
    }
    return { effects, input: firstNode }
}
