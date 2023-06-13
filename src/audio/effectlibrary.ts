// jscpd:ignore-start
// TODO: Fix JSCPD lint issues, or tell it to ease up.
import { dbToFloat } from "./utils"

interface ParamInfo {
    value: number
    min: number
    max: number
    scale?: (x: number, info?: ParamInfo) => number
}

// Parameter scaling functions
const linearScale = (min: number, max: number) =>
    (value: number, info: ParamInfo) => (value - info.min) / (info.max - info.min) * (max - min) + min
const millisecondsToSeconds = (ms: number) => ms / 1000
const percentToFraction = (percent: number) => percent / 100

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

// TODO: Consider making bypass and mixing more transparent to subclasses.
// (So they can simply connect to `this.output` rather than `this.bypass` or `this.wetLevel`.)
export class Effect {
    static DEFAULT_PARAM = ""
    static DEFAULTS: { [key: string]: ParamInfo } = {}
    readonly parameters: { [key: string]: WrappedAudioParam } = {}
    context: BaseAudioContext
    input: GainNode
    output: GainNode
    bypass: GainNode
    bypassDry: GainNode

    constructor(context: BaseAudioContext) {
        this.context = context
        this.input = new GainNode(context)
        this.output = new GainNode(context)
        this.bypass = new GainNode(context)
        this.bypassDry = new GainNode(context, { gain: 1 })
        const inverter = new GainNode(context, { gain: -1 })
        inverter.connect(this.bypass.gain) // wetGain = 1 - dryGain
        this.input.connect(this.bypassDry)
        this.bypassDry.connect(this.output)
        this.bypass.connect(this.output)

        this.setupParam("BYPASS", this.bypassDry.gain, inverter)
    }

    connect(target: AudioNode) { this.output.connect(target) }

    destroy() {}

    static scale(parameter: string, value: number) {
        return (this.DEFAULTS[parameter].scale ?? (x => x))(value)
    }

    setupParam(name: string, ...controls: (AudioParam | AudioNode)[]) {
        this.parameters[name] = makeParam(this.context, ...controls)
        // TODO: Pre-Great Refactor exceptions; can we remove these?
        if (name !== "EQ3BAND_HIGHFREQ" && !(this.constructor.name === "DistortionEffect" && name === "MIX")) {
            const effectType = this.constructor as typeof Effect
            this.parameters[name].setDefault(effectType.scale(name, effectType.DEFAULTS[name].value))
        }
    }
}

class MixableEffect extends Effect {
    wetLevel: GainNode
    dryLevel: GainNode

    constructor(context: BaseAudioContext) {
        super(context)
        this.wetLevel = new GainNode(context)
        this.dryLevel = new GainNode(context, { gain: 1 })
        const inverter = new GainNode(context, { gain: -1 })
        inverter.connect(this.dryLevel.gain) // dryGain = 1 - wetGain
        this.input.connect(this.dryLevel)
        this.dryLevel.connect(this.output)
        this.wetLevel.connect(this.bypass)

        this.setupParam("MIX", this.wetLevel.gain, inverter)
    }
}

export class VolumeEffect extends Effect {
    static DEFAULT_PARAM = "GAIN"
    static DEFAULTS = {
        GAIN: { value: 0.0, min: -60, max: 12, scale: dbToFloat },
        BYPASS: { value: 0.0, min: 0.0, max: 1.0 },
    }

    constructor(context: BaseAudioContext) {
        super(context)
        const volume = context.createGain()
        this.input.connect(volume)
        volume.connect(this.bypass)

        this.setupParam("GAIN", volume.gain)
    }
}

export class DelayEffect extends MixableEffect {
    static DEFAULT_PARAM = "DELAY_TIME"
    static DEFAULTS = {
        DELAY_TIME: { value: 300, min: 0.0, max: 4000.0, scale: millisecondsToSeconds },
        DELAY_FEEDBACK: { value: -5.0, min: -120.0, max: -1.0, scale: dbToFloat },
        // TODO: Find a nice way to inherit defaults from parent class.
        MIX: { value: 0.5, min: 0.0, max: 1.0 },
        BYPASS: { value: 0.0, min: 0.0, max: 1.0 },
    }

    constructor(context: BaseAudioContext) {
        super(context)
        const delay = new DelayNode(context)
        const feedback = new GainNode(context)
        this.input.connect(delay)
        delay.connect(feedback)
        delay.connect(this.wetLevel)
        feedback.connect(delay)

        this.setupParam("DELAY_TIME", delay.delayTime)
        this.setupParam("DELAY_FEEDBACK", feedback.gain)
    }
}

export class FilterEffect extends MixableEffect {
    static DEFAULT_EFFECT = "FILTER_FREQ"
    static DEFAULTS = {
        FILTER_FREQ: { min: 20.0, max: 20000.0, value: 1000.0 },
        FILTER_RESONANCE: { min: 0.0, max: 1.0, value: 0.8, scale: linearScale(1, 5) },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const filter = new BiquadFilterNode(context, { type: "lowpass" })
        this.input.connect(filter)
        filter.connect(this.wetLevel)

        this.setupParam("FILTER_FREQ", filter.frequency)
        this.setupParam("FILTER_RESONANCE", filter.Q)
    }
}

export class CompressorEffect extends Effect {
    static DEFAULT_PARAM = "COMPRESSOR_THRESHOLD"
    static DEFAULTS = {
        COMPRESSOR_THRESHOLD: { min: -30.0, max: 0.0, value: -18.0 },
        COMPRESSOR_RATIO: { min: 1.0, max: 100.0, value: 10.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const compressor = new DynamicsCompressorNode(context, { attack: 0.01, release: 0.150, knee: 3.0 })
        this.input.connect(compressor)
        compressor.connect(this.bypass)

        this.setupParam("COMPRESSOR_RATIO", compressor.ratio)
        this.setupParam("COMPRESSOR_THRESHOLD", compressor.threshold)
    }
}

export class PanEffect extends Effect {
    static DEFAULT_PARAM = "LEFT_RIGHT"
    static DEFAULTS = {
        LEFT_RIGHT: { min: -100.0, max: 100.0, value: 0.0, scale: linearScale(-1, 1) },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    // Pre-Refactoring comment:
    // "Currently the splitter node is not being used since sox returns mono.
    //  But I am keeping it commented for future use."
    constructor(context: AudioContext) {
        super(context)
        const panLeft = new GainNode(context, { gain: 0.5 })
        const panRight = new GainNode(context, { gain: 0.5 })
        const prePanLeft = new GainNode(context, { gain: -0.5 })
        const prePanRight = new GainNode(context, { gain: 0.5 })
        prePanLeft.connect(panLeft.gain)
        prePanRight.connect(panRight.gain)
        // const splitter = context.createChannelSplitter(2)
        const merger = new ChannelMergerNode(context, { numberOfInputs: 2 })
        // this.input.connect(node.splitter)
        // splitter.connect(panLeft, 0)
        // splitter.connect(panRight, 1)
        this.input.connect(panLeft)
        this.input.connect(panRight)
        panLeft.connect(merger, 0, 0)
        panRight.connect(merger, 0, 1)
        merger.connect(this.bypass)
        this.bypass.connect(this.output)

        this.setupParam("LEFT_RIGHT", prePanLeft, prePanRight)
    }
}

export class BandpassEffect extends MixableEffect {
    static DEFAULT_PARAM = "BANDPASS_FREQ"
    static DEFAULTS = {
        BANDPASS_FREQ: { min: 20.0, max: 20000.0, value: 800.0 },
        BANDPASS_WIDTH: { min: 0.0, max: 1.0, value: 0.5, scale: linearScale(1, 5) },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const bandpass = new BiquadFilterNode(context, { type: "bandpass" })
        this.input.connect(bandpass)
        bandpass.connect(this.wetLevel)

        this.setupParam("BANDPASS_FREQ", bandpass.frequency)
        this.setupParam("BANDPASS_WIDTH", bandpass.Q)
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

    constructor(context: AudioContext) {
        super(context)
        const lowshelf = new BiquadFilterNode(context, { type: "lowshelf" })
        const midpeak = new BiquadFilterNode(context, { type: "peaking" })
        const highshelf = new BiquadFilterNode(context, { type: "highshelf" })
        // TODO: Old code set highFreq to 20,000 with the comment "cannot be modified",
        // and then set it to 0 two lines later. Does this effect actually work?
        this.input.connect(lowshelf)
        lowshelf.connect(midpeak)
        midpeak.connect(highshelf)
        highshelf.connect(this.wetLevel)

        this.setupParam("EQ3BAND_LOWGAIN", lowshelf.gain)
        this.setupParam("EQ3BAND_LOWFREQ", lowshelf.frequency)
        this.setupParam("EQ3BAND_MIDGAIN", midpeak.gain)
        this.setupParam("EQ3BAND_MIDFREQ", midpeak.frequency)
        this.setupParam("EQ3BAND_HIGHGAIN", highshelf.gain)
        this.setupParam("EQ3BAND_HIGHFREQ", highshelf.frequency)
    }
}

export class ChorusEffect extends MixableEffect {
    static DEFAULT_PARAM = "CHORUS_LENGTH"
    static DEFAULTS = {
        CHORUS_LENGTH: { min: 1.0, max: 250.0, value: 15.0, scale: millisecondsToSeconds },
        CHORUS_NUMVOICES: { min: 1.0, max: 8.0, value: 1.0 },
        CHORUS_RATE: { min: 0.1, max: 16.0, value: 0.5 },
        // scale by a factor of 1000. Essentially, it scales the amplitude of the LFO. This has to be scaled down
        // to get a realistic effect as we are modulating delay values.
        CHORUS_MOD: { min: 0.0, max: 1.0, value: 0.7, scale: (x: number) => x / 1000 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    static MAX_VOICES = 8

    constructor(context: AudioContext) {
        super(context)
        const inputDelay = [...Array(ChorusEffect.MAX_VOICES)].map(_ => context.createDelay())
        const inputDelayGain = [...Array(ChorusEffect.MAX_VOICES)].map(_ => context.createGain())
        const lfo = new OscillatorNode(context)
        const lfoGain = new GainNode(context)
        // Only the first delay node (voice) is active initially.
        const voiceGains = inputDelayGain.map(g => makeParam(context, g.gain))
        lfo.start()
        lfo.connect(lfoGain)
        for (let i = 0; i < ChorusEffect.MAX_VOICES; i++) {
            this.input.connect(inputDelay[i])
            // LFO controls the delay time of each node
            lfoGain.connect(inputDelay[i].delayTime)
            inputDelay[i].connect(inputDelayGain[i])
            inputDelayGain[i].connect(this.wetLevel)
        }

        this.setupParam("CHORUS_LENGTH", ...inputDelay.map(d => d.delayTime))
        this.parameters.CHORUS_NUMVOICES = {
            // Presumably this should also set the deactivated voices' gain to 0,
            // but the pre-Refactor code doesn't do that, so this doesn't either.
            setValueAtTime(value: number, time: number) {
                for (let i = 0; i < value; i++) {
                    voiceGains[i].setValueAtTime(1, time)
                }
            },
            linearRampToValueAtTime(value: number, time: number) {
                for (let i = 0; i < value; i++) {
                    voiceGains[i].linearRampToValueAtTime(1, time)
                }
            },
            setBypass(bypass: boolean) {
                voiceGains.map((g: WrappedAudioParam) => g.setBypass(bypass))
            },
            getBypass() {
                return voiceGains[0].getBypass()
            },
            setDefault(value: number) {
                for (let i = 0; i < value; i++) {
                    voiceGains[i].setDefault(i === 0 ? 1 : 0)
                }
            },
        }
        this.parameters.CHORUS_NUMVOICES.setDefault(ChorusEffect.DEFAULTS.CHORUS_NUMVOICES.value)
        this.setupParam("CHORUS_RATE", lfo.frequency)
        this.setupParam("CHORUS_MOD", lfoGain.gain)
    }
}

export class FlangerEffect extends MixableEffect {
    static DEFAULT_PARAM = "FLANGER_LENGTH"
    static DEFAULTS = {
        FLANGER_LENGTH: { min: 0.0, max: 200.0, value: 6.0, scale: millisecondsToSeconds },
        FLANGER_FEEDBACK: { min: -80.0, max: -1.0, value: -50.0, scale: dbToFloat },
        FLANGER_RATE: { min: 0.001, max: 100.0, value: 0.6 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const inputDelay = new DelayNode(context)
        const feedback = new GainNode(context)
        const lfo = new OscillatorNode(context)
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        const lfoGain = new GainNode(context, { gain: 0.003 })
        lfo.start()
        this.input.connect(inputDelay)
        lfo.connect(lfoGain)
        // LFO controls the delay time of the delay element
        lfoGain.connect(inputDelay.delayTime)
        inputDelay.connect(this.wetLevel)
        inputDelay.connect(feedback)
        feedback.connect(inputDelay)

        this.setupParam("FLANGER_LENGTH", inputDelay.delayTime)
        this.setupParam("FLANGER_FEEDBACK", feedback.gain)
        this.setupParam("FLANGER_RATE", lfo.frequency)
    }
}

export class PhaserEffect extends MixableEffect {
    static DEFAULT_PARAM = "PHASER_RATE"
    static DEFAULTS = {
        PHASER_RATE: { min: 0.0, max: 10.0, value: 0.5 },
        PHASER_FEEDBACK: { min: -120.0, max: -1.0, value: -3.0, scale: dbToFloat },
        PHASER_RANGEMIN: { min: 40.0, max: 20000.0, value: 440.0 },
        PHASER_RANGEMAX: { min: 40.0, max: 20000.0, value: 1600.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const lfo = new OscillatorNode(context)
        const feedback = new GainNode(context)
        // Create a 4 stage all pass filter.
        const allpass = [...Array(4)].map(_ => new BiquadFilterNode(context, { type: "allpass" }))
        const shortDelay = new DelayNode(context, { delayTime: 1 / context.sampleRate })
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        const lfoGain = new GainNode(context, { gain: 300 })
        lfo.start()
        lfo.connect(lfoGain)
        let lastNode = this.input
        for (const filter of allpass) {
            lfoGain.connect(filter.frequency)
            lastNode.connect(filter)
            lastNode = filter
        }
        allpass[3].connect(this.wetLevel)
        allpass[3].connect(feedback)
        feedback.connect(shortDelay) // avoid zero-delay cycle
        shortDelay.connect(allpass[0])

        this.setupParam("PHASER_RANGEMIN", allpass[0].frequency, allpass[1].frequency)
        this.setupParam("PHASER_RANGEMAX", allpass[2].frequency, allpass[3].frequency)
        this.setupParam("PHASER_FEEDBACK", feedback.gain)
        this.setupParam("PHASER_RATE", lfo.frequency)
    }
}

export class TremoloEffect extends MixableEffect {
    static DEFAULT_PARAM = "TREMOLO_FREQ"
    static DEFAULTS = {
        TREMOLO_FREQ: { min: 0.0, max: 100.0, value: 4.0 },
        TREMOLO_AMOUNT: { min: -60.0, max: 0.0, value: -6.0, scale: dbToFloat },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const lfo = new OscillatorNode(context)
        const lfoGain = new GainNode(context)
        // Pre-Refactor comment: "FIXED!? No parameter to change this??"
        const feedback = new GainNode(context, { gain: 0.2 }) // "Some initial value"
        const shortDelay = new DelayNode(context, { delayTime: 1 / context.sampleRate })
        const inputGain = new GainNode(context)
        lfo.start()
        this.input.connect(inputGain)
        lfo.connect(lfoGain)
        inputGain.connect(this.wetLevel)
        inputGain.connect(feedback)
        feedback.connect(shortDelay) // avoid zero-delay cycle
        shortDelay.connect(inputGain)
        lfoGain.connect(inputGain.gain)

        this.setupParam("TREMOLO_FREQ", lfo.frequency)
        this.setupParam("TREMOLO_AMOUNT", lfoGain.gain)
    }
}

export class DistortionEffect extends MixableEffect {
    static DEFAULT_PARAM = "DISTO_GAIN"
    static DEFAULTS = {
        DISTO_GAIN: { min: 0.0, max: 50.0, value: 20.0, scale: linearScale(0, 1) },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 0.5 },
    }

    constructor(context: AudioContext) {
        super(context)
        const waveshaper = new WaveShaperNode(context)
        const preGain = new GainNode(context, { gain: 3 })
        const postGain = new GainNode(context, { gain: Math.pow(1 / preGain.gain.value, 0.6) })
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
        this.input.connect(preGain)
        preGain.connect(waveshaper)
        waveshaper.connect(postGain)
        postGain.connect(this.wetLevel)
        // TODO: DISTO_GAIN is apparently an alias for MIX, per the old code. Can we get rid of this?
        this.parameters.DISTO_GAIN = this.parameters.MIX
    }
}

export class PitchshiftEffect extends MixableEffect {
    static DEFAULT_PARAM = "PITCHSHIFT_SHIFT"
    static DEFAULTS = {
        PITCHSHIFT_SHIFT: { min: -12.0, max: 12.0, value: 0.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    shifter: AudioWorkletNode | null

    constructor(context: AudioContext) {
        super(context)
        this.shifter = new AudioWorkletNode(context, "pitchshifter")
        this.input.connect(this.shifter)
        this.shifter.connect(this.wetLevel)

        this.setupParam("PITCHSHIFT_SHIFT", this.shifter.parameters.get("shift")!)
    }

    destroy() {
        if (this.shifter) {
            this.shifter.port.postMessage("destroy")
            this.shifter.disconnect()
            this.shifter = null
        } else {
            console.error("destroy() called twice; should never happen.")
        }
    }
}

export class TempoEffect extends Effect {
    static DEFAULT_PARAM = "TEMPO"
    static DEFAULTS = { TEMPO: { min: 45, max: 220, value: 0 } }
    // Dummy effect, handled outside of Web Audio graph.
}

export class RingmodEffect extends MixableEffect {
    static DEFAULT_PARAM = "RINGMOD_MODFREQ"
    static DEFAULTS = {
        RINGMOD_MODFREQ: { min: 0.0, max: 100.0, value: 40.0 },
        RINGMOD_FEEDBACK: { min: 0.0, max: 100.0, value: 0.0, scale: percentToFraction },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const lfo = new OscillatorNode(context)
        const feedback = new GainNode(context)
        const shortDelay = new DelayNode(context, { delayTime: 1 / context.sampleRate })
        // Pre-Refactor commment: "FIXED!? Looks like we don't need to control depth of ring modulation"
        const ringGain = new GainNode(context, { gain: 1.0 })
        const inputGain = new GainNode(context)
        lfo.start()
        this.input.connect(inputGain)
        lfo.connect(ringGain)
        inputGain.connect(this.wetLevel)
        inputGain.connect(feedback)
        feedback.connect(shortDelay) // avoid zero-delay cycle
        shortDelay.connect(inputGain)
        ringGain.connect(inputGain.gain)

        this.setupParam("RINGMOD_MODFREQ", lfo.frequency)
        this.setupParam("RINGMOD_FEEDBACK", feedback.gain)
    }
}

export class WahEffect extends MixableEffect {
    static DEFAULT_PARAM = "WAH_POSITION"
    static DEFAULTS = {
        // position of 0 to 1 must sweep frequencies in a certain range, say 350Hz to 10Khz
        WAH_POSITION: { min: 0.0, max: 1.0, value: 0.0, scale: linearScale(350, 10000) },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const bandpass = new BiquadFilterNode(context, { type: "bandpass", Q: 1.25 })
        this.input.connect(bandpass)
        bandpass.connect(this.wetLevel)

        this.setupParam("WAH_POSITION", bandpass.frequency)
    }
}

export class ReverbEffect extends MixableEffect {
    static DEFAULT_PARAM = "REVERB_DAMPFREQ"
    static DEFAULTS = {
        REVERB_TIME: { min: 0.0, max: 4000, value: 3500, scale: (t: number) => ((0.8 / 4000) * (t - 4000)) + 0.8 },
        REVERB_DAMPFREQ: { min: 200, max: 18000, value: 8000 },
        MIX: { min: 0.0, max: 1.0, value: 1.0 },
        BYPASS: { min: 0.0, max: 1.0, value: 0.0 },
    }

    constructor(context: AudioContext) {
        super(context)
        const reverb = Freeverb(context) as any
        // TODO: These statements were here pre-Refactor, but I'm quite sure they don't do anything!
        reverb.roomSize = 0.1
        reverb.dampening = 3000
        this.input.connect(reverb)
        reverb.connect(this.wetLevel)

        this.setupParam("REVERB_TIME", ...reverb.combFilters.map((f: any) => f.resonance))
        this.setupParam("REVERB_DAMPFREQ", ...reverb.combFilters.map((f: any) => f.dampening))
    }
}

// Looks like the functions below originally came from an old version of Tone.js?
// Whoever brought it over here did not leave a link nor attribution...
// TODO: Fix this.
const COMB_FILTER_TUNINGS = [1557 / 48000, 1617 / 48000, 1491 / 48000, 1422 / 48000, 1277 / 48000, 1356 / 48000, 1188 / 48000, 1116 / 48000]
const ALLPASS_FILTER_FREQUENCIES = [225, 556, 441, 341]

const Freeverb = (context: AudioContext) => {
    const node: GainNode & { combFilters?: AudioNode[] } = new GainNode(context, { channelCountMode: "explicit", channelCount: 2 })
    const output = new GainNode(context)
    const merger = new ChannelMergerNode(context, { numberOfInputs: 2 })
    const splitter = new ChannelSplitterNode(context, { numberOfOutputs: 2 })
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
    const node: DelayNode & { dampening?: AudioParam, resonance?: AudioParam } = new DelayNode(context, { delayTime: 0.1 })
    const output = new BiquadFilterNode(context, { type: "lowpass", Q: 0.15 })
    const feedback = new GainNode(context)
    node.dampening = output.frequency
    node.resonance = feedback.gain
    node.resonance.value = 0.5
    node.connect(output)
    output.connect(feedback)
    feedback.connect(node)
    return node
}
// jscpd:ignore-end
