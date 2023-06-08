// jscpd:ignore-start
// TODO: Fix JSCPD lint issues, or tell it to ease up.
import { dbToFloat } from "./utils"

function linearScaling(yMin: number, yMax: number, xMin: number, xMax: number, inputY: number) {
    const percent = (inputY - yMin) / (yMax - yMin)
    return percent * (xMax - xMin) + xMin
}

interface WrappedAudioParam {
    setValueAtTime(value: number, time: number): void
    linearRampToValueAtTime(value: number, time: number): void
    setBypass(bypass: boolean): void
    getBypass(): boolean
    setDefault(value: number): void // TODO: Simplify default value logic to make this unnecessary
}

function makeParam(context: BaseAudioContext, ...outputs: (AudioParam | AudioNode)[]) {
    const bypass = new ConstantSourceNode(context, { offset: 0 })
    const automation = new ConstantSourceNode(context, { offset: 0 })
    const automationGate = new GainNode(context, { gain: 1 })
    automation.connect(automationGate)
    for (const output of outputs) {
        if (output instanceof AudioParam) output.value = 0
        bypass.connect(output as any)
        automationGate.connect(output as any)
    }
    bypass.start()
    automation.start()
    return {
        setValueAtTime(value: number, time: number) {
            automation.offset.setValueAtTime(value - bypass.offset.value, time)
        },
        linearRampToValueAtTime(value: number, time: number) {
            automation.offset.linearRampToValueAtTime(value - bypass.offset.value, time)
        },
        setBypass(bypass: boolean) {
            automationGate.gain.value = bypass ? 0 : 1
        },
        getBypass() {
            return automationGate.gain.value === 0
        },
        setDefault(value: number) {
            bypass.offset.value = value
        },
    }
}

export class Effect {
    static DEFAULT_PARAM = ""
    static DEFAULTS: { [key: string]: { [key: string]: number } } = {}

    static create(context: BaseAudioContext): any {
        const bypass = new GainNode(context)
        const bypassDry = new GainNode(context, { gain: 1 })
        const inverter = new GainNode(context, { gain: -1 })
        const node = {
            input: new GainNode(context),
            output: new GainNode(context),
            bypass,
            bypassDry,
            bypassGain: makeParam(context, bypassDry.gain, inverter),
            connect(target: AudioNode) { this.output.connect(target) },
            destroy() {},
        }
        inverter.connect(bypass.gain) // wetGain = 1 - dryGain
        node.input.connect(bypassDry)
        bypassDry.connect(node.output)
        bypass.connect(node.output)
        return node
    }

    static getParameters(node: any): { [key: string]: WrappedAudioParam } {
        return { BYPASS: node.bypassGain }
    }

    static scale(_parameter: string, value: number) {
        return value
    }
}

class MixableEffect extends Effect {
    static create(context: AudioContext) {
        const wetLevel = new GainNode(context)
        const dryLevel = new GainNode(context, { gain: 1 })
        const inverter = new GainNode(context, { gain: -1 })
        const node = {
            wetLevel,
            dryLevel,
            wetLevelGain: makeParam(context, wetLevel.gain, inverter),
            ...super.create(context),
        }
        inverter.connect(dryLevel.gain) // dryGain = 1 - wetGain
        node.input.connect(dryLevel)
        dryLevel.connect(node.output)
        wetLevel.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            MIX: node.wetLevelGain,
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
        const volume = context.createGain()
        const node = { volumeGain: makeParam(context, volume.gain), ...super.create(context) }
        node.input.connect(volume)
        volume.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            GAIN: node.volumeGain,
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
        const delay = context.createDelay()
        const feedback = context.createGain()
        const node = {
            delayTime: makeParam(context, delay.delayTime),
            feedbackGain: makeParam(context, feedback.gain),
            ...super.create(context),
        }
        node.input.connect(delay)
        delay.connect(feedback)
        delay.connect(node.wetLevel)
        feedback.connect(delay)
        return node
    }

    static getParameters(node: any) {
        return {
            DELAY_TIME: node.delayTime,
            DELAY_FEEDBACK: node.feedbackGain,
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
        const filter = context.createBiquadFilter()
        const node = {
            filterFreq: makeParam(context, filter.frequency),
            filterResonance: makeParam(context, filter.Q),
            ...super.create(context),
        }
        filter.type = "lowpass"
        node.input.connect(filter)
        filter.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            FILTER_FREQ: node.filterFreq,
            FILTER_RESONANCE: node.filterResonance,
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
        const compressor = context.createDynamicsCompressor()
        const node = {
            compressorRatio: makeParam(context, compressor.ratio),
            compressorThreshold: makeParam(context, compressor.threshold),
            ...super.create(context),
        }
        compressor.attack.value = 0.01
        compressor.release.value = 0.150
        compressor.knee.value = 3.0
        node.input.connect(compressor)
        compressor.connect(node.bypass)
        return node
    }

    static getParameters(node: any) {
        return {
            COMPRESSOR_RATIO: node.compressorRatio,
            COMPRESSOR_THRESHOLD: node.compressorThreshold,
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
        const panLeft = new GainNode(context, { gain: 0.5 })
        const panRight = new GainNode(context, { gain: 0.5 })
        const prePanLeft = new GainNode(context, { gain: -0.5 })
        const prePanRight = new GainNode(context, { gain: 0.5 })
        prePanLeft.connect(panLeft.gain)
        prePanRight.connect(panRight.gain)

        const node = {
            pan: makeParam(context, prePanLeft, prePanRight),
            // splitter: context.createChannelSplitter(2)
            merger: context.createChannelMerger(2),
            ...super.create(context),
        }
        // node.input.connect(node.splitter)
        // node.splitter.connect(panLeft, 0)
        // node.splitter.connect(panRight, 1)
        node.input.connect(panLeft)
        node.input.connect(panRight)
        panLeft.connect(node.merger, 0, 0)
        panRight.connect(node.merger, 0, 1)
        node.merger.connect(node.bypass)
        node.bypass.connect(node.output)
        return node
    }

    static getParameters(node: any) {
        return {
            LEFT_RIGHT: node.pan,
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
        const bandpass = context.createBiquadFilter()
        const node = {
            bandpassFreq: makeParam(context, bandpass.frequency),
            bandpassWidth: makeParam(context, bandpass.Q),
            ...super.create(context),
        }
        bandpass.type = "bandpass"
        node.input.connect(bandpass)
        bandpass.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            BANDPASS_FREQ: node.bandpassFreq,
            BANDPASS_WIDTH: node.bandpassWidth,
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
        const lowshelf = context.createBiquadFilter()
        const midpeak = context.createBiquadFilter()
        const highshelf = context.createBiquadFilter()
        const node = {
            lowGain: makeParam(context, lowshelf.gain),
            lowFreq: makeParam(context, lowshelf.frequency),
            midGain: makeParam(context, midpeak.gain),
            midFreq: makeParam(context, midpeak.frequency),
            highGain: makeParam(context, highshelf.gain),
            highFreq: makeParam(context, highshelf.frequency),
            ...super.create(context),
        }
        lowshelf.type = "lowshelf"
        midpeak.type = "peaking"
        highshelf.type = "highshelf"
        // TODO: Old code set highFreq to 20,000 with the comment "cannot be modified",
        // and then set it to 0 two lines later. Does this effect actually work?
        node.input.connect(lowshelf)
        lowshelf.connect(midpeak)
        midpeak.connect(highshelf)
        highshelf.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            EQ3BAND_LOWGAIN: node.lowGain,
            EQ3BAND_LOWFREQ: node.lowFreq,
            EQ3BAND_MIDGAIN: node.midGain,
            EQ3BAND_MIDFREQ: node.midFreq,
            EQ3BAND_HIGHGAIN: node.highGain,
            EQ3BAND_HIGHFREQ: node.highFreq,
            ...super.getParameters(node),
        }
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
        const inputDelay = [...Array(this.MAX_VOICES)].map(_ => context.createDelay())
        const inputDelayGain = [...Array(this.MAX_VOICES)].map(_ => context.createGain())
        const lfo = context.createOscillator()
        const lfoGain = context.createGain()
        const node = {
            inputDelayTime: makeParam(context, ...inputDelay.map(d => d.delayTime)),
            // Only the first delay node (voice) is active initially.
            inputDelayGain: inputDelayGain.map(g => makeParam(context, g.gain)),
            lfoFreq: makeParam(context, lfo.frequency),
            lfoGain: makeParam(context, lfoGain.gain),
            ...super.create(context),
        }
        lfo.start()
        lfo.connect(lfoGain)

        for (let i = 0; i < this.MAX_VOICES; i++) {
            node.input.connect(inputDelay[i])
            // LFO controls the delay time of each node
            lfoGain.connect(inputDelay[i].delayTime)
            inputDelay[i].connect(inputDelayGain[i])
            inputDelayGain[i].connect(node.wetLevel)
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
                        node.inputDelayGain[i].setValueAtTime(1, time)
                    }
                },
                linearRampToValueAtTime(value: number, time: number) {
                    for (let i = 0; i < value; i++) {
                        node.inputDelayGain[i].linearRampToValueAtTime(1, time)
                    }
                },
                setBypass(bypass: boolean) {
                    node.inputDelayGain.map((g: WrappedAudioParam) => g.setBypass(bypass))
                },
                getBypass() {
                    return node.inputDelayGain[0].getBypass()
                },
                setDefault(value: number) {
                    for (let i = 0; i < value; i++) {
                        node.inputDelayGain[i].setDefault(i === 0 ? 1 : 0)
                    }
                },
            },
            CHORUS_LENGTH: node.inputDelayTime,
            CHORUS_RATE: node.lfoFreq,
            CHORUS_MOD: node.lfoGain,
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
        const inputDelay = context.createDelay()
        const feedback = context.createGain()
        const lfo = context.createOscillator()
        const node = {
            // Pre-Refactor comment: "FIXED!? No parameter to change this??"
            lfoGain: new GainNode(context, { gain: 0.003 }),
            inputDelayTime: makeParam(context, inputDelay.delayTime),
            feedbackGain: makeParam(context, feedback.gain),
            lfoFreq: makeParam(context, lfo.frequency),
            ...super.create(context),
        }
        lfo.start()
        node.input.connect(inputDelay)
        lfo.connect(node.lfoGain)
        // LFO controls the delay time of the delay element
        node.lfoGain.connect(inputDelay.delayTime)
        inputDelay.connect(node.wetLevel)
        inputDelay.connect(feedback)
        feedback.connect(inputDelay)
        return node
    }

    static getParameters(node: any) {
        return {
            FLANGER_LENGTH: node.inputDelayTime,
            FLANGER_FEEDBACK: node.feedbackGain,
            FLANGER_RATE: node.lfoFreq,
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
        const lfo = context.createOscillator()
        const feedback = context.createGain()
        // Create a 4 stage all pass filter.
        const allpass = [...Array(4)].map(_ => context.createBiquadFilter())
        const node = {
            shortDelay: context.createDelay(1 / context.sampleRate),
            // Pre-Refactor comment: "FIXED!? No parameter to change this??"
            lfoGain: new GainNode(context, { gain: 300 }),
            rangeMin: makeParam(context, allpass[0].frequency, allpass[1].frequency),
            rangeMax: makeParam(context, allpass[2].frequency, allpass[3].frequency),
            feedbackGain: makeParam(context, feedback.gain),
            lfoFreq: makeParam(context, lfo.frequency),
            ...super.create(context),
        }
        lfo.start()
        lfo.connect(node.lfoGain)

        let lastNode = node.input
        for (const filter of allpass) {
            filter.type = "allpass"
            node.lfoGain.connect(filter.frequency)
            lastNode.connect(filter)
            lastNode = filter
        }
        allpass[3].connect(node.wetLevel)
        allpass[3].connect(feedback)
        feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(allpass[0])
        return node
    }

    static getParameters(node: any) {
        return {
            PHASER_RANGEMIN: node.rangeMin,
            PHASER_RANGEMAX: node.rangeMax,
            PHASER_FEEDBACK: node.feedbackGain,
            PHASER_RATE: node.lfoFreq,
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
        const lfo = context.createOscillator()
        const lfoGain = context.createGain()
        const node = {
            lfoFreq: makeParam(context, lfo.frequency),
            lfoGain: makeParam(context, lfoGain.gain),
            // Pre-Refactor comment: "FIXED!? No parameter to change this??"
            feedback: new GainNode(context, { gain: 0.2 }), // "Some initial value"
            shortDelay: context.createDelay(1 / context.sampleRate),
            inputGain: context.createGain(),
            ...super.create(context),
        }
        lfo.start()
        node.input.connect(node.inputGain)
        lfo.connect(lfoGain)
        node.inputGain.connect(node.wetLevel)
        node.inputGain.connect(node.feedback)
        node.feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(node.inputGain)
        lfoGain.connect(node.inputGain.gain)
        return node
    }

    static getParameters(node: any) {
        return {
            TREMOLO_FREQ: node.lfoFreq,
            TREMOLO_AMOUNT: node.lfoGain,
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
        const waveshaper = new WaveShaperNode(context)
        const preGain = new GainNode(context, { gain: 3 })
        const postGain = new GainNode(context, { gain: Math.pow(1 / preGain.gain.value, 0.6) })
        const node = super.create(context)
        // Define nonlinear distortion curve.
        const k = preGain.gain.value * 100
        const n = 22050
        const curve = new Float32Array(n)
        const deg = Math.PI / 180
        for (let i = 0; i < n; i++) {
            const x = i * 2 / n - 1
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x))
        }
        waveshaper.curve = curve
        node.input.connect(preGain)
        preGain.connect(waveshaper)
        waveshaper.connect(postGain)
        postGain.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        const parent = super.getParameters(node)
        // TODO: DISTO_GAIN is apparently an alias for MIX, per the old code. Is that set in stone?
        return { DISTO_GAIN: parent.MIX, ...parent }
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
        let shifter: AudioWorkletNode | null = new AudioWorkletNode(context, "pitchshifter")
        const node = {
            shifter,
            shift: makeParam(context, shifter.parameters.get("shift")!),
            ...super.create(context),
            destroy() {
                if (shifter) {
                    shifter.port.postMessage("destroy")
                    shifter.disconnect()
                    shifter = null
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
            PITCHSHIFT_SHIFT: node.shift,
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
        const lfo = context.createOscillator()
        const feedback = context.createGain()
        const node = {
            lfoFreq: makeParam(context, lfo.frequency),
            feedbackGain: makeParam(context, feedback.gain),
            shortDelay: context.createDelay(1 / context.sampleRate),
            // Pre-Refactor commment: "FIXED!? Looks like we don't need to control depth of ring modulation"
            ringGain: new GainNode(context, { gain: 1.0 }),
            inputGain: context.createGain(),
            ...super.create(context),
        }
        lfo.start()
        node.input.connect(node.inputGain)
        lfo.connect(node.ringGain)
        node.inputGain.connect(node.wetLevel)
        node.inputGain.connect(feedback)
        feedback.connect(node.shortDelay) // avoid zero-delay cycle
        node.shortDelay.connect(node.inputGain)
        node.ringGain.connect(node.inputGain.gain)
        return node
    }

    static getParameters(node: any) {
        return {
            RINGMOD_MODFREQ: node.lfoFreq,
            RINGMOD_FEEDBACK: node.feedbackGain,
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
        const bandpass = new BiquadFilterNode(context, { type: "bandpass", Q: 1.25 })
        const node = { bandpassFreq: makeParam(context, bandpass.frequency), ...super.create(context) }
        node.input.connect(bandpass)
        bandpass.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            WAH_POSITION: node.bandpassFreq,
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
        const reverb = Freeverb(context) as any
        const node = {
            reverbTime: makeParam(context, ...reverb.combFilters.map((f: any) => f.resonance)),
            reverbDampFreq: makeParam(context, ...reverb.combFilters.map((f: any) => f.dampening)),
            ...super.create(context),
        }
        // TODO: These statements were here pre-Refactor, but I'm quite sure they don't do anything!
        reverb.roomSize = 0.1
        reverb.dampening = 3000
        node.input.connect(reverb)
        reverb.connect(node.wetLevel)
        return node
    }

    static getParameters(node: any) {
        return {
            REVERB_TIME: node.reverbTime,
            REVERB_DAMPFREQ: node.reverbDampFreq,
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
// TODO: Fix this.
const COMB_FILTER_TUNINGS = [1557 / 48000, 1617 / 48000, 1491 / 48000, 1422 / 48000, 1277 / 48000, 1356 / 48000, 1188 / 48000, 1116 / 48000]
const ALLPASS_FILTER_FREQUENCIES = [225, 556, 441, 341]

const Freeverb = (context: AudioContext) => {
    const node: GainNode & { combFilters?: AudioNode[] } = new GainNode(context, { channelCountMode: "explicit", channelCount: 2 })
    const output = context.createGain()
    const merger = context.createChannelMerger(2)
    const splitter = context.createChannelSplitter(2)
    const highpass = new BiquadFilterNode(context, { type: "highpass", frequency: 200 })

    node.connect(output)
    node.connect(splitter)
    merger.connect(highpass)
    highpass.connect(output)

    const combFilters = []
    const allpassFiltersL = []
    const allpassFiltersR = []

    // all pass filter on left
    for (let l = 0; l < ALLPASS_FILTER_FREQUENCIES.length; l++) {
        const allpassL = new BiquadFilterNode(context, { type: "allpass", frequency: ALLPASS_FILTER_FREQUENCIES[l] })
        allpassFiltersL.push(allpassL)
        if (allpassFiltersL[l - 1]) {
            allpassFiltersL[l - 1].connect(allpassL)
        }
    }

    // all pass filter on right
    for (let r = 0; r < ALLPASS_FILTER_FREQUENCIES.length; r++) {
        const allpassR = new BiquadFilterNode(context, { type: "allpass" })
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
        const combFilterNode = LowpassCombFilter(context)
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
    const output = new BiquadFilterNode(context, { type: "lowpass", Q: 0.15 })
    const feedback = context.createGain()
    node.dampening = output.frequency
    node.resonance = feedback.gain
    node.delayTime.value = 0.1
    node.resonance.value = 0.5

    node.connect(output)
    output.connect(feedback)
    feedback.connect(node)
    return node
}
// jscpd:ignore-end
