// jscpd:ignore-start
// TODO: Fix JSCPD lint issues, or tell it to ease up.
// Need to scale the effects
import { dbToFloat } from "./utils"

function linearScaling(yMin: number, yMax: number, xMin: number, xMax: number, inputY: number) {
    const percent = (inputY - yMin) / (yMax - yMin)
    return percent * (xMax - xMin) + xMin
}

interface AudioParamish {
    setValueAtTime(value: number, time: number): void
    linearRampToValueAtTime(value: number, time: number): void
}

export class Effect {
    static DEFAULT_PARAM = ""
    static DEFAULTS: { [key: string]: { [key: string]: number } } = {}

    static create(context: BaseAudioContext): any {
        const node = {
            input: context.createGain(),
            output: context.createGain(),
            bypass: context.createGain(),
            bypassDry: context.createGain(),
            connect(target: AudioNode) { this.output.connect(target) },
            destroy() {},
        }
        node.bypass.gain.value = 1
        node.bypassDry.gain.value = 0
        node.input.connect(node.bypassDry)
        node.bypassDry.connect(node.output)
        node.bypass.connect(node.output)
        return node
    }

    static getParameters(node: any): { [key: string]: AudioParamish } {
        return {
            BYPASS: {
                // NOTE: Pre-Refactor code did not ensure bypassDry was binary (it just set it to `value`),
                // but it seems correct to do so (bypass.gain + bypassDry.gain should sum to 1), so this does.
                setValueAtTime(value: number, time: number) {
                    node.bypass.gain.setValueAtTime(value ? 0 : 1, time)
                    node.bypassDry.gain.setValueAtTime(value ? 1 : 0, time)
                },
                linearRampToValueAtTime(value: number, time: number) {
                    // NOTE: Bypass is binary (an effect is either bypassed or not), so this is intentionally nonlinear (despite the name).
                    node.bypass.gain.setValueAtTime(value ? 0 : 1, time)
                    node.bypassDry.gain.setValueAtTime(value ? 1 : 0, time)
                },
            },
        }
    }

    static scale(parameter: string, value: number) {
        return value
    }
}

class MixableEffect extends Effect {
    static create(context: AudioContext) {
        const node = {
            wetLevel: context.createGain(),
            dryLevel: context.createGain(),
            ...super.create(context),
        }
        node.wetLevel.gain.value = 0
        node.dryLevel.gain.value = 0
        node.input.connect(node.dryLevel)
        node.dryLevel.connect(node.output)
        node.wetLevel.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            MIX: {
                setValueAtTime(value: number, time: number) {
                    node.wetLevel.gain.setValueAtTime(value, time)
                    node.dryLevel.gain.setValueAtTime(1 - value, time)
                },
                linearRampToValueAtTime(value: number, time: number) {
                    node.wetLevel.gain.linearRampToValueAtTime(value, time)
                    node.dryLevel.gain.linearRampToValueAtTime(1 - value, time)
                },
            },
            ...super.getParameters(node),
        }
    }
}

export class VolumeEffect extends Effect {
    static DEFAULT_PARAM = "GAIN"
    static DEFAULTS = {
        GAIN: { value: 0.0, min: -60, max: 12 },
        BYPASS: { value: 0.0, min: 0.0, max: 1.0 },
    }

    static create(context: AudioContext) {
        const node = { volume: context.createGain(), ...super.create(context) }
        node.input.connect(node.volume)
        node.volume.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            GAIN: node.volume.gain,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "GAIN") {
            return dbToFloat(value)
        }
        return value
    }
}

export class DelayEffect extends MixableEffect {
    static DEFAULT_PARAM = "DELAY_TIME"
    static DEFAULTS = {
        DELAY_TIME: { value: 300, min: 0.0, max: 4000.0 },
        DELAY_FEEDBACK: { value: -5.0, min: -120.0, max: -1.0 },
        MIX: { value: 0.5, min: 0.0, max: 1.0 },
        BYPASS: { value: 0.0, min: 0.0, max: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            delay: context.createDelay(),
            feedback: context.createGain(),
            ...super.create(context),
        }
        node.delay.delayTime.value = 0
        node.feedback.gain.value = 0
        node.input.connect(node.delay)
        node.delay.connect(node.feedback)
        node.delay.connect(node.wetLevel)
        node.feedback.connect(node.delay)
        return node
    }

    static getParameters(node: any) {
        return {
            DELAY_TIME: node.delay.delayTime,
            DELAY_FEEDBACK: node.feedback.gain,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "DELAY_TIME") {
            return value / 1000 // milliseconds to seconds
        } else if (parameter === "DELAY_FEEDBACK") {
            return dbToFloat(value)
        }
        return value
    }
}

export class FilterEffect extends MixableEffect {
    static DEFAULT_EFFECT = "FILTER_FREQ"
    static DEFAULTS = {
        FILTER_FREQ: { min: 20.0, max: 20000.0, value: 1000.0 },
        FILTER_RESONANCE: { min: 0.0, max: 1.0, value: 0.8 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = { filter: context.createBiquadFilter(), ...super.create(context) }
        node.filter.frequency.value = 0
        node.filter.type = "lowpass"
        node.input.connect(node.filter)
        node.filter.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            FILTER_FREQ: node.filter.frequency,
            FILTER_RESONANCE: node.filter.Q,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "FILTER_RESONANCE") {
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 1, 5, value)
        }
        return value
    }
}

export class CompressorEffect extends Effect {
    static DEFAULT_PARAM = "COMPRESSOR_THRESHOLD"
    static DEFAULTS = {
        COMPRESSOR_THRESHOLD: { min: -30.0, max: 0.0, value: -18.0 },
        COMPRESSOR_RATIO: { min: 1.0, max: 100.0, value: 10.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    static create(context: AudioContext) {
        const node = { compressor: context.createDynamicsCompressor(), ...super.create(context) }
        node.compressor.attack.value = 0.01
        node.compressor.release.value = 0.150
        node.compressor.knee.value = 3.0
        node.input.connect(node.compressor)
        node.compressor.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            COMPRESSOR_RATIO: node.compressor.ratio,
            COMPRESSOR_THRESHOLD: node.compressor.threshold,
            ...super.getParameters(node),
        }
    }
}

export class PanEffect extends Effect {
    static DEFAULT_PARAM = "LEFT_RIGHT"
    static DEFAULTS = {
        LEFT_RIGHT: { min: -100.0, max: 100.0, value: 0.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    // Pre-Refactoring comment:
    // "Currently the splitter node is not being used since sox returns mono.
    //  But I am keeping it commented for future use."
    static create(context: AudioContext) {
        const node = {
            panLeft: context.createGain(),
            panRight: context.createGain(),
            // splitter: context.createChannelSplitter(2)
            merger: context.createChannelMerger(2),
            ...super.create(context),
        }
        // node.input.connect(node.splitter)
        // node.splitter.connect(node.panLeft, 0)
        // node.splitter.connect(node.panRight, 1)
        node.input.connect(node.panLeft)
        node.input.connect(node.panRight)
        node.panLeft.connect(node.merger, 0, 0)
        node.panRight.connect(node.merger, 0, 1)
        node.merger.connect(node.bypass)
        node.bypass.connect(node.output)
        return node
    }

    static getParameters(node: any) {
        return {
            LEFT_RIGHT: {
                setValueAtTime(value: number, time: number) {
                    node.panLeft.gain.setValueAtTime((value * -0.5) + 0.5, time)
                    node.panRight.gain.setValueAtTime((value * 0.5) + 0.5, time)
                },
                linearRampToValueAtTime(value: number, time: number) {
                    node.panLeft.gain.linearRampToValueAtTime((value * -0.5) + 0.5, time)
                    node.panRight.gain.linearRampToValueAtTime((value * 0.5) + 0.5, time)
                },
            },
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "LEFT_RIGHT") {
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, -1, 1, value)
        }
        return value
    }
}

export class BandpassEffect extends MixableEffect {
    static DEFAULT_PARAM = "BANDPASS_FREQ"
    static DEFAULTS = {
        BANDPASS_FREQ: { min: 20.0, max: 20000.0, value: 800.0 },
        BANDPASS_WIDTH: { min: 0.0, max: 1.0, value: 0.5 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = { bandpass: context.createBiquadFilter(), ...super.create(context) }
        node.bandpass.frequency.value = 0
        node.bandpass.type = "bandpass"
        node.input.connect(node.bandpass)
        node.bandpass.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            BANDPASS_FREQ: node.bandpass.frequency,
            BANDPASS_WIDTH: node.bandpass.Q,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "BANDPASS_WIDTH") {
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 1, 5, value)
        }
        return value
    }
}

export class Eq3BandEffect extends MixableEffect {
    static DEFAULT_PARAM = "EQ3BAND_LOWGAIN"
    static DEFAULTS = {
        EQ3BAND_LOWGAIN: { min: -24.0, max: 18.0, value: 0.0 },
        EQ3BAND_LOWFREQ: { min: 20.0, max: 20000.0, value: 200.0 },
        EQ3BAND_MIDGAIN: { min: -24.0, max: 18.0, value: 0.0 },
        EQ3BAND_MIDFREQ: { min: 20.0, max: 20000.0, value: 200.0 },
        EQ3BAND_HIGHGAIN: { min: -24.0, max: 18.0, value: 0.0 },
        EQ3BAND_HIGHFREQ: { min: 20.0, max: 20000.0, value: 200.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            lowshelf: context.createBiquadFilter(),
            midpeak: context.createBiquadFilter(),
            highshelf: context.createBiquadFilter(),
            ...super.create(context),
        }
        node.lowshelf.type = "lowshelf"
        node.midpeak.type = "peaking"
        node.highshelf.type = "highshelf"
        node.lowshelf.frequency.value = 0
        node.midpeak.frequency.value = 0
        // TODO: Old code set this to 20,000 with the comment "cannot be modified",
        // and then set it to 0 two lines later. Does this effect actually work?
        node.highshelf.frequency.value = 0

        node.input.connect(node.lowshelf)
        node.lowshelf.connect(node.midpeak)
        node.midpeak.connect(node.highshelf)
        node.highshelf.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            EQ3BAND_LOWGAIN: node.lowshelf.gain,
            EQ3BAND_LOWFREQ: node.lowshelf.frequency,
            EQ3BAND_MIDGAIN: node.midpeak.gain,
            EQ3BAND_MIDFREQ: node.midpeak.frequency,
            EQ3BAND_HIGHGAIN: node.highshelf.gain,
            EQ3BAND_HIGHFREQ: node.highshelf.frequency,
            ...super.getParameters(node),
        }
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

export class ChorusEffect extends MixableEffect {
    static DEFAULT_PARAM = "CHORUS_LENGTH"
    static DEFAULTS = {
        CHORUS_LENGTH: { min: 1.0, max: 250.0, value: 15.0 },
        CHORUS_NUMVOICES: { min: 1.0, max: 8.0, value: 1.0 },
        CHORUS_RATE: { min: 0.1, max: 16.0, value: 0.5 },
        CHORUS_MOD: { min: 0.0, max: 1.0, value: 0.7 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static MAX_VOICES = 8

    static create(context: AudioContext) {
        const node = {
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            inputDelay: [...Array(this.MAX_VOICES)].map(_ => context.createDelay()),
            inputDelayGain: [...Array(this.MAX_VOICES)].map(_ => context.createGain()),
            ...super.create(context),
        }
        node.lfo.frequency.value = 0
        node.lfo.start()
        node.lfo.connect(node.lfoGain)

        for (let i = 0; i < this.MAX_VOICES; i++) {
            // Only the first delay node (voice) is active initially.
            node.inputDelayGain[i].gain.value = (i === 0 ? 1 : 0)
            node.input.connect(node.inputDelay[i])
            // LFO controls the delay time of each node
            node.lfoGain.connect(node.inputDelay[i].delayTime)
            node.inputDelay[i].connect(node.inputDelayGain[i])
            node.inputDelayGain[i].connect(node.wetLevel)
        }
        return node
    }

    static getParameters(node: any) {
        return {
            CHORUS_NUMVOICES: {
                // Presumably this should also set the deactivated voices' gain to 0,
                // but the pre-Refactor code doesn't do that, so this doesn't either.
                setValueAtTime(value: number, time: number) {
                    for (let i = 0; i < value; i++) {
                        node.inputDelayGain[i].gain.setValueAtTime(1, time)
                    }
                },
                linearRampToValueAtTime(value: number, time: number) {
                    for (let i = 0; i < value; i++) {
                        node.inputDelayGain[i].gain.linearRampToValueAtTime(1, time)
                    }
                },
            },
            CHORUS_LENGTH: multiParam(node.inputDelay.map((d: DelayNode) => d.delayTime)),
            CHORUS_RATE: node.lfo.frequency,
            CHORUS_MOD: node.lfoGain.gain,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "CHORUS_LENGTH") {
            return value / 1000 // milliseconds to seconds
        } else if (parameter === "CHORUS_MOD") { // depth of modulation
            // scale by a factor of 1000. Essentially, it scales the amplitude of the LFO. This has to be scaled down
            // to get a realistic effect as we are modulating delay values.
            return value / 1000
        }
        return value
    }
}

export class FlangerEffect extends MixableEffect {
    static DEFAULT_PARAM = "FLANGER_LENGTH"
    static DEFAULTS = {
        FLANGER_LENGTH: { min: 0.0, max: 200.0, value: 6.0 },
        FLANGER_FEEDBACK: { min: -80.0, max: -1.0, value: -50.0 },
        FLANGER_RATE: { min: 0.001, max: 100.0, value: 0.6 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            feedback: context.createGain(),
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            inputDelay: context.createDelay(),
            ...super.create(context),
        }
        node.lfo.frequency.value = 0
        node.lfo.start()
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        node.lfoGain.gain.value = 0.003
        node.wetLevel.gain.value = 0.0
        node.feedback.gain.value = 0.0

        node.input.connect(node.inputDelay)
        node.lfo.connect(node.lfoGain)
        // LFO controls the delay time of the delay element
        node.lfoGain.connect(node.inputDelay.delayTime)
        node.inputDelay.connect(node.wetLevel)
        node.inputDelay.connect(node.feedback)
        node.feedback.connect(node.inputDelay)
        return node
    }

    static getParameters(node: any) {
        return {
            FLANGER_LENGTH: node.inputDelay.delayTime,
            FLANGER_FEEDBACK: node.feedback.gain,
            FLANGER_RATE: node.lfo.frequency,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "FLANGER_LENGTH") {
            return value / 1000 // milliseconds to seconds
        } else if (parameter === "FLANGER_FEEDBACK") {
            return dbToFloat(value)
        }
        return value
    }
}

export class PhaserEffect extends MixableEffect {
    static DEFAULT_PARAM = "PHASER_RATE"
    static DEFAULTS = {
        PHASER_RATE: { min: 0.0, max: 10.0, value: 0.5 },
        PHASER_FEEDBACK: { min: -120.0, max: -1.0, value: -3.0 },
        PHASER_RANGEMIN: { min: 40.0, max: 20000.0, value: 440.0 },
        PHASER_RANGEMAX: { min: 40.0, max: 20000.0, value: 1600.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            feedback: context.createGain(),
            shortDelay: context.createDelay(1 / context.sampleRate),
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            // Create a 4 stage all pass filter.
            allpass: [...Array(4)].map(_ => context.createBiquadFilter()),
            ...super.create(context),
        }
        node.wetLevel.gain.value = 1
        node.lfo.frequency.value = 0
        node.lfo.start()
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        node.lfoGain.gain.value = 300

        node.lfo.connect(node.lfoGain)

        let lastNode = node.input
        for (const filter of node.allpass) {
            filter.type = "allpass"
            node.lfoGain.connect(filter.frequency)
            lastNode.connect(filter)
            lastNode = filter
        }
        node.allpass[3].connect(node.wetLevel)
        node.allpass[3].connect(node.feedback)
        node.feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(node.allpass[0])
        return node
    }

    static getParameters(node: any) {
        return {
            PHASER_RANGEMIN: multiParam([node.allpass[0].frequency, node.allpass[1].frequency]),
            PHASER_RANGEMAX: multiParam([node.allpass[2].frequency, node.allpass[3].frequency]),
            PHASER_FEEDBACK: node.feedback.gain,
            PHASER_RATE: node.lfo.frequency,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "PHASER_FEEDBACK") {
            return dbToFloat(value)
        }
        return value
    }
}

export class TremoloEffect extends MixableEffect {
    static DEFAULT_PARAM = "TREMOLO_FREQ"
    static DEFAULTS = {
        TREMOLO_FREQ: { min: 0.0, max: 100.0, value: 4.0 },
        TREMOLO_AMOUNT: { min: -60.0, max: 0.0, value: -6.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            feedback: context.createGain(),
            shortDelay: context.createDelay(1 / context.sampleRate),
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            inputGain: context.createGain(),
            ...super.create(context),
        }
        node.wetLevel.gain.value = 1
        node.lfo.frequency.value = 0
        node.lfo.start()
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        node.lfoGain.gain.value = 0.1
        node.feedback.gain.value = 0.2 // "Some initial value"
        node.input.connect(node.inputGain)
        node.lfo.connect(node.lfoGain)
        node.inputGain.connect(node.wetLevel)
        node.inputGain.connect(node.feedback)
        node.feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(node.inputGain)
        node.lfoGain.connect(node.inputGain.gain)
        return node
    }

    static getParameters(node: any) {
        return {
            TREMOLO_FREQ: node.lfo.frequency,
            TREMOLO_AMOUNT: node.lfoGain.gain,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "TREMOLO_AMOUNT") {
            return dbToFloat(value)
        }
        return value
    }
}

export class DistortionEffect extends MixableEffect {
    static DEFAULT_PARAM = "DISTO_GAIN"
    static DEFAULTS = {
        DISTO_GAIN: { min: 0.0, max: 50.0, value: 20.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 0.5 },
    }

    static create(context: AudioContext) {
        const node = {
            waveshaper: context.createWaveShaper(),
            preGain: context.createGain(),
            postGain: context.createGain(),
            ...super.create(context),
        }

        node.wetLevel.gain.value = 0.5
        node.dryLevel.gain.value = 0.5
        node.preGain.gain.value = 3
        node.postGain.gain.value = Math.pow(1 / node.preGain.gain.value, 0.6)

        // Define nonlinear distortion curve.
        const k = node.preGain.gain.value * 100
        const n = 22050
        const curve = new Float32Array(n)
        const deg = Math.PI / 180
        for (let i = 0; i < n; i++) {
            const x = i * 2 / n - 1
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x))
        }
        node.waveshaper.curve = curve

        node.input.connect(node.preGain)
        node.preGain.connect(node.waveshaper)
        node.waveshaper.connect(node.postGain)
        node.postGain.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        const parent = super.getParameters(node)
        return {
            // TODO: Apparently an alias for MIX, per the old code. Is that set in stone?
            DISTO_GAIN: parent.MIX,
            ...parent,
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "DISTO_GAIN") {
            // converting 0 -> 50 to 0 to 5
            // But for now mapping it to mix parameter 0-1
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 0, 1, value)
        }
        return value
    }
}

export class PitchshiftEffect extends MixableEffect {
    static DEFAULT_PARAM = "PITCHSHIFT_SHIFT"
    static DEFAULTS = {
        PITCHSHIFT_SHIFT: { min: -12.0, max: 12.0, value: 0.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            shifter: new AudioWorkletNode(context, "pitchshifter"),
            ...super.create(context),
            destroy() {
                if (this.shifter) {
                    this.shifter.port.postMessage("destroy")
                    this.shifter.disconnect()
                    this.shifter = null
                } else {
                    console.error("destroy() called twice; should never happen.")
                }
            },
        }
        node.input.connect(node.shifter)
        node.shifter.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            PITCHSHIFT_SHIFT: node.shifter.parameters.get("shift"),
            ...super.getParameters(node),
        }
    }
}

export class TempoEffect extends Effect {
    static DEFAULT_PARAM = "TEMPO"
    static DEFAULTS = { TEMPO: { min: 45, max: 220, value: 0 } }

    static create() {
        // Dummy effect, handled outside of Web Audio graph.
        return null
    }
}

export class RingmodEffect extends MixableEffect {
    static DEFAULT_PARAM = "RINGMOD_MODFREQ"
    static DEFAULTS = {
        RINGMOD_MODFREQ: { min: 0.0, max: 100.0, value: 40.0 },
        RINGMOD_FEEDBACK: { min: 0.0, max: 100.0, value: 0.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = {
            feedback: context.createGain(),
            shortDelay: context.createDelay(1 / context.sampleRate),
            lfo: context.createOscillator(),
            ringGain: context.createGain(),
            inputGain: context.createGain(),
            ...super.create(context),
        }
        node.wetLevel.gain.value = 1
        node.lfo.frequency.value = 40.0 // "Default modulation frequency"
        node.lfo.start()
        // Pre-Refactor commment:
        // "FIXED!? Looks like we don't need to control depth of ring modulation"
        node.ringGain.gain.value = 1.0
        node.feedback.gain.value = 0.0 // "Some initial value"

        node.input.connect(node.inputGain)
        node.lfo.connect(node.ringGain)
        node.inputGain.connect(node.wetLevel)
        node.inputGain.connect(node.feedback)
        node.feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(node.inputGain)
        node.ringGain.connect(node.inputGain.gain)
        return node
    }

    static getParameters(node: any) {
        return {
            RINGMOD_MODFREQ: node.lfo.frequency,
            RINGMOD_FEEDBACK: node.feedback.gain,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "RINGMOD_FEEDBACK") {
            return value / 100 // percentage to fraction
        }
        return value
    }
}

export class WahEffect extends MixableEffect {
    static DEFAULT_PARAM = "WAH_POSITION"
    static DEFAULTS = {
        WAH_POSITION: { min: 0.0, max: 1.0, value: 0.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static create(context: AudioContext) {
        const node = { bandpass: context.createBiquadFilter(), ...super.create(context) }
        node.wetLevel.gain.value = 1
        node.bandpass.frequency.value = 0
        node.bandpass.type = "bandpass"
        node.bandpass.Q.value = 1.25
        node.input.connect(node.bandpass)
        node.bandpass.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            WAH_POSITION: node.bandpass.frequency,
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "WAH_POSITION") {
            // position of 0 to 1 must sweep frequencies in a certain range, say 350Hz to 10Khz
            return linearScaling(this.DEFAULTS[parameter].min, this.DEFAULTS[parameter].max, 350, 10000, value)
        }
        return value
    }
}

export class ReverbEffect extends MixableEffect {
    static DEFAULT_PARAM = "REVERB_DAMPFREQ"
    static DEFAULTS = {
        REVERB_TIME: { min: 0.0, max: 4000, value: 3500 },
        REVERB_DAMPFREQ: { min: 200, max: 18000, value: 8000 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    static create(context: AudioContext) {
        const node = {
            reverb: Freeverb(context),
            ...super.create(context),
        }
        node.wetLevel.gain.value = 1
        // TODO: These statements were here pre-Refactor, but I'm quite sure they don't do anything!
        node.reverb.roomSize = 0.1
        node.reverb.dampening = 3000
        node.input.connect(node.reverb)
        node.reverb.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            REVERB_TIME: multiParam(node.reverb.combFilters.map((f: any) => f.resonance)),
            REVERB_DAMPFREQ: multiParam(node.reverb.combFilters.map((f: any) => f.dampening)),
            ...super.getParameters(node),
        }
    }

    static scale(parameter: string, value: number) {
        if (parameter === "REVERB_TIME") {
            return ((0.8 / 4000) * (value - 4000)) + 0.8
        }
        return value
    }
}

// Looks like the functions below originally came from an old version of Tone.js?
// Whoever brought it over here did not leave a link nor attribution...

const COMB_FILTER_TUNINGS = [1557 / 48000, 1617 / 48000, 1491 / 48000, 1422 / 48000, 1277 / 48000, 1356 / 48000, 1188 / 48000, 1116 / 48000]
const ALLPASS_FILTER_FREQUENCIES = [225, 556, 441, 341]

const Freeverb = (audioContext: AudioContext) => {
    const node: GainNode & { combFilters?: AudioNode[] } = audioContext.createGain()
    node.channelCountMode = "explicit"
    node.channelCount = 2

    const output = audioContext.createGain()
    const merger = audioContext.createChannelMerger(2)
    const splitter = audioContext.createChannelSplitter(2)
    const highpass = audioContext.createBiquadFilter()
    highpass.type = "highpass"
    highpass.frequency.value = 200

    node.connect(output)
    node.connect(splitter)
    merger.connect(highpass)
    highpass.connect(output)

    const combFilters = []
    const allpassFiltersL = []
    const allpassFiltersR = []

    // all pass filter on left
    for (let l = 0; l < ALLPASS_FILTER_FREQUENCIES.length; l++) {
        const allpassL = audioContext.createBiquadFilter()
        allpassL.type = "allpass"
        allpassL.frequency.value = ALLPASS_FILTER_FREQUENCIES[l]
        allpassFiltersL.push(allpassL)

        if (allpassFiltersL[l - 1]) {
            allpassFiltersL[l - 1].connect(allpassL)
        }
    }

    // all pass filter on right
    for (let r = 0; r < ALLPASS_FILTER_FREQUENCIES.length; r++) {
        const allpassR = audioContext.createBiquadFilter()
        allpassR.type = "allpass"
        allpassR.frequency.value = ALLPASS_FILTER_FREQUENCIES[r] + 23 / 48000 // For stereo spread
        allpassFiltersR.push(allpassR)

        if (allpassFiltersR[r - 1]) {
            allpassFiltersR[r - 1].connect(allpassR)
        }
    }

    allpassFiltersL[allpassFiltersL.length - 1].connect(merger, 0, 0)
    allpassFiltersR[allpassFiltersR.length - 1].connect(merger, 0, 1)

    // comb filters
    for (let c = 0; c < COMB_FILTER_TUNINGS.length; c++) {
        const combFilterNode = LowpassCombFilter(audioContext)
        combFilterNode.delayTime.value = COMB_FILTER_TUNINGS[c]
        if (c < COMB_FILTER_TUNINGS.length / 2) {
            splitter.connect(combFilterNode, 0)
            combFilterNode.connect(allpassFiltersL[0])
        } else {
            splitter.connect(combFilterNode, 1)
            combFilterNode.connect(allpassFiltersR[0])
        }
        combFilters.push(combFilterNode)
    }

    node.connect = output.connect.bind(output)
    node.disconnect = output.disconnect.bind(output)
    node.combFilters = combFilters
    return node
}

const LowpassCombFilter = (context: AudioContext) => {
    const node: DelayNode & { dampening?: AudioParam, resonance?: AudioParam } = context.createDelay(1)

    const output = context.createBiquadFilter()
    output.Q.value = 0.15

    output.type = "lowpass"
    node.dampening = output.frequency

    const feedback = context.createGain()
    node.resonance = feedback.gain

    node.connect(output)
    output.connect(feedback)
    feedback.connect(node)

    node.delayTime.value = 0.1
    node.resonance.value = 0.5
    return node
}
// jscpd:ignore-end
