import { BandpassNode, ChorusNode, CompressorNode, CustomDelayNode, CustomPannerNode, DistortionNode, Eq3bandNode, FilterNode, FlangerNode, PhaserNode, PitchshiftNode, ReverbNode1, RingmodNode, TremoloNode, VolumeNode, WahNode } from "./audionodes"

// Need to scale the effects
export const dbToFloat = (dbValue: number) => {
    return (Math.pow(10, (0.05 * dbValue)))
}

export const linearScaling = (yMin: number, yMax: number, xMin: number, xMax: number, inputY: number) => {
    const percent = (inputY - yMin) / (yMax - yMin)
    return percent * (xMax - xMin) + xMin
}

export class VolumeEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "GAIN",
        GAIN: {defaultVal: 0.0, min: -60, max: 12},
        BYPASS: {defaultVal: 0.0, min: 0.0, max: 1.0}
    }

    static NODE = VolumeNode

    static get(node: any, parameter: string) {
        return {
            GAIN: node.volume.gain,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'GAIN') {
            return dbToFloat(value)
        }
    }
}

export class DelayEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "DELAY_TIME",
        DELAY_TIME: {defaultVal: 300, min: 0.0, max: 4000.0},
        DELAY_FEEDBACK: {defaultVal: -5.0, min: -120.0, max: -1.0},
        MIX: {defaultVal: 0.5, min: 0.0, max: 1.0},
        BYPASS: {defaultVal: 0.0, min: 0.0, max: 1.0}
    }

    static NODE = CustomDelayNode

    static get(node: any, parameter: string) {
        return {
            DELAY_TIME: node.delay.delayTime,
            DELAY_FEEDBACK: node.feedback.gain,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'DELAY_TIME') {
            return value / 1000  // milliseconds to seconds
        } else if (parameter === 'DELAY_FEEDBACK') {
            return dbToFloat(value)
        }
    }
}

export class FilterEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "FILTER_FREQ",
        FILTER_FREQ: {min: 20.0, max: 20000.0, defaultVal: 1000.0},
        FILTER_RESONANCE: {min: 0.0, max: 1.0, defaultVal: 0.8},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = FilterNode

    static get(node: any, parameter: string) {
        return {
            FILTER_FREQ: node.filter.frequency,
            FILTER_RESONANCE: node.filter.Q,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'FILTER_RESONANCE') {
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 1, 5, value)
        }
    }
}

export class CompressorEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "COMPRESSOR_THRESHOLD",
        COMPRESSOR_THRESHOLD: {min: -30.0, max: 0.0, defaultVal: -18.0},
        COMPRESSOR_RATIO: {min: 1.0, max: 100.0, defaultVal: 10.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    }

    static NODE = CompressorNode

    static get(node: any, parameter: string) {
        return {
            COMPRESSOR_RATIO: node.compressor.ratio,
            COMPRESSOR_THRESHOLD: node.compressor.threshold,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        // No scaling required for compressor (all values in dB).
    }
}

const panParam = (leftGain: AudioParam, rightGain: AudioParam) => {
    return {
        setValueAtTime(value: number, time: number) {
            leftGain.setValueAtTime((value * -0.5) + 0.5, time)
            rightGain.setValueAtTime((value * 0.5) + 0.5, time)
        },
        linearRampToValueAtTime(value: number, time: number) {
            leftGain.linearRampToValueAtTime((value * -0.5) + 0.5, time)
            rightGain.linearRampToValueAtTime((value * 0.5) + 0.5, time)
        },
    }
}

export class PanEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "LEFT_RIGHT",
        LEFT_RIGHT: {min: -100.0, max: 100.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    }

    static Node = CustomPannerNode

    static get(node: any, parameter: string) {
        return {
            LEFT_RIGHT: panParam(node.panLeft.gain, node.panRight.gain),
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'LEFT_RIGHT') {
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, -1, 1, value)
        }
    }
}

export class BandpassEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "BANDPASS_FREQ",
        BANDPASS_FREQ: {min: 20.0, max: 20000.0, defaultVal: 800.0},
        BANDPASS_WIDTH: {min: 0.0, max: 1.0, defaultVal: 0.5},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = BandpassNode

    static get(node: any, parameter: string) {
        return {
            BANDPASS_FREQ: node.bandpass.freq,
            BANDPASS_WIDTH: node.bandpass.Q,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'BANDPASS_WIDTH') {  // adjusting the Q factor
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 1, 5, value)
        }
    }
}

export class Eq3BandEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "EQ3BAND_LOWGAIN",
        EQ3BAND_LOWGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_LOWFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        EQ3BAND_MIDGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_MIDFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        EQ3BAND_HIGHGAIN: {min: -24.0, max: 18.0, defaultVal: 0.0},
        EQ3BAND_HIGHFREQ: {min: 20.0, max: 20000.0, defaultVal: 200.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = Eq3bandNode

    static get(node: any, parameter: string) {
        return {
            EQ3BAND_LOWGAIN: node.lowshelf.gain,
            EQ3BAND_LOWFREQ: node.lowshelf.frequency,
            EQ3BAND_MIDGAIN: node.midpeak.gain,
            EQ3BAND_MIDFREQ: node.midpeak.frequency,
            EQ3BAND_HIGHGAIN: node.highshelf.gain,
            EQ3BAND_HIGHFREQ: node.highshelf.freq,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        // We're safe here. No scaling is required. All valeus are in dB or Hz which is what web audio natively accepts
    }
}

const multiParam = (params: AudioParam[]) => {
    return {
        setValueAtTime(value: number, time: number) {
            for (const param of params) {
                param.setValueAtTime(value, time)
            }
        },
        linearRampToValueAtTime(value: number, time: number) {
            for (const param of params) {
                param.linearRampToValueAtTime(value, time)
            }
        },
    }
}

export class ChorusEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "CHORUS_LENGTH",
        CHORUS_LENGTH: {min: 1.0, max: 250.0, defaultVal: 15.0},
        CHORUS_NUMVOICES: {min: 1.0, max: 8.0, defaultVal: 1.0},
        CHORUS_RATE: {min: 0.1, max: 16.0, defaultVal: 0.5},
        CHORUS_MOD: {min: 0.0, max: 1.0, defaultVal: 0.7},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = ChorusNode

    static get(node: any, parameter: string) {
        return {
            CHORUS_NUMVOICES: multiParam(node.inputDelayGain.map((d: GainNode) => d.gain)),
            CHORUS_LENGTH: multiParam(node.inputDelay.map((d: DelayNode) => d.delayTime)),
            CHORUS_RATE: node.lfo.frequency,
            CHORUS_MOD: node.lfoGain.gain,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'CHORUS_LENGTH') {
            return value / 1000  // milliseconds to seconds
        } else if (parameter === 'CHORUS_MOD') {  // depth of modulation
            // scale by a factor of 1000. Essentially, it scales the amplitude of the LFO. This has to be scaled down
            // to get a realistic effect as we are modulating delay values.
            return value / 1000
        }
    }
}

export class FlangerEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "FLANGER_LENGTH",
        FLANGER_LENGTH: {min: 0.0, max: 200.0, defaultVal: 6.0},
        FLANGER_FEEDBACK: {min: -80.0, max: -1.0, defaultVal: -50.0},
        FLANGER_RATE: {min: 0.001, max: 100.0, defaultVal: 0.6},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = FlangerNode

    static get(node: any, parameter: string) {
        return {
            FLANGER_LENGTH: node.inputDelay.delayTime,
            FLANGER_FEEDBACK: node.feedback.gain,
            FLANGER_RATE: node.lfo.frequency,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'FLANGER_LENGTH') {
            return value / 1000  // milliseconds to seconds
        } else if (parameter === 'FLANGER_FEEDBACK') {
            return dbToFloat(value)
        }
    }
}

export class PhaserEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "PHASER_RATE",
        PHASER_RATE: {min: 0.0, max: 10.0, defaultVal: 0.5},
        PHASER_FEEDBACK: {min: -120.0, max: -1.0, defaultVal: -3.0},
        PHASER_RANGEMIN: {min: 40.0, max: 20000.0, defaultVal: 440.0},
        PHASER_RANGEMAX: {min: 40.0, max: 20000.0, defaultVal: 1600.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = PhaserNode

    static get(node: any, parameter: string) {
        return {
            PHASER_RANGEMIN: multiParam([node.allpass1.frequency, node.allpass2.frequency]),
            PHASER_RANGEMAX: multiParam([node.allpass3.frequency, node.allpass4.frequency]),
            PHASER_FEEDBACK: node.feedback.gain,
            PHASER_RATE: node.lfo.frequency,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'PHASER_FEEDBACK') {
            return dbToFloat(value)
        }
    }
}

export class TremoloEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "TREMOLO_FREQ",
        TREMOLO_FREQ: {min: 0.0, max: 100.0, defaultVal: 4.0},
        TREMOLO_AMOUNT: {min: -60.0, max: 0.0, defaultVal: -6.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = TremoloNode

    static get(node: any, parameter: string) {
        return {
            TREMOLO_FREQ: node.lfo.frequency,
            TREMOLO_AMOUNT: node.lfoGain.gain,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'TREMOLO_AMOUNT') {
            // db to float value
            return dbToFloat(value)
        }
    }
}

const distortionParam = (wetGain: AudioParam, dryGain: AudioParam) => {
    return {
        setValueAtTime(value: number, time: number) {
            wetGain.setValueAtTime(value, time)
            dryGain.setValueAtTime(1 - value, time)
        },
        linearRampToValueAtTime(value: number, time: number) {
            wetGain.linearRampToValueAtTime(value, time)
            dryGain.linearRampToValueAtTime(1 - value, time)
        },
    }
}

export class DistortionEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "DISTO_GAIN",
        DISTO_GAIN: {min: 0.0, max: 50.0, defaultVal: 20.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 0.5}
    }

    static NODE = DistortionNode

    static get(node: any, parameter: string) {
        return {
            DISTO_GAIN: distortionParam(node.wetLeft.gain, node.dryLevel.gain),
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'DISTO_GAIN') {
            // converting 0 -> 50 to 0 to 5
            // But for now mapping it to mix parameter 0-1
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 0, 1, value)
        }
    }
}

export class PitchshiftEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "PITCHSHIFT_SHIFT",
        PITCHSHIFT_SHIFT: {min: -12.0, max: 12.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = PitchshiftNode

    static scale(parameter: string, value: number) {
        if (parameter === 'PITCHSHIFT_SHIFT') {
            return value * 100  // semitones to cents
        }
    }
}

export class RingmodEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "RINGMOD_MODFREQ",
        RINGMOD_MODFREQ: {min: 0.0, max: 100.0, defaultVal: 40.0},
        RINGMOD_FEEDBACK: {min: 0.0, max: 100.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = RingmodNode

    static get(node: any, parameter: string) {
        return {
            RINGMOD_MODFREQ: node.lfo.frequency,
            RINGMOD_FEEDBACK: node.feedback.gain,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'RINGMOD_FEEDBACK') {
            return value / 100  // percentage to fraction
        }
    }
}

export class WahEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "WAH_POSITION",
        WAH_POSITION: {min: 0.0, max: 1.0, defaultVal: 0.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0}
    }

    static NODE = WahNode

    static get(node: any, parameter: string) {
        return {
            WAH_POSITION: node.bandpass.frequency,
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'WAH_POSITION') {
            // position of 0 to 1 must sweep frequencies in a certain range, say 350Hz to 10Khz
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 350, 10000, value)
        }
    }
}

export class ReverbEffect {
    static DEFAULTS = {
        DEFAULT_PARAM: "REVERB_DAMPFREQ",
        REVERB_TIME: {min: 0.0, max: 4000, defaultVal: 3500},
        REVERB_DAMPFREQ: {min: 200, max: 18000, defaultVal: 8000},
        MIX: {min: 0.0, max: 1.0, defaultVal: 1.0},
        BYPASS: {min: 0.0, max: 1.0, defaultVal: 0.0}
    }

    static NODE = ReverbNode1

    static get(node: any, parameter: string) {
        return {
            REVERB_TIME: multiParam(node.reverb.combFilters.map((f: any) => f.resonance)),
            REVERB_DAMPFREQ: multiParam(node.reverb.combFilters.map((f: any) => f.dampening)),
        }[parameter]
    }

    static scale(parameter: string, value: number) {
        if (parameter === 'REVERB_TIME') {
            return ((0.8/4000)*(value-4000)) + 0.8
        }
    }
}