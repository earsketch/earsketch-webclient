// Some effects are not available as native Web Audio nodes. We use the
// existing AudioNodes to create the desired effects
const COMB_FILTER_TUNINGS = [1557 / 48000, 1617 / 48000, 1491 / 48000, 1422 / 48000, 1277 / 48000, 1356 / 48000, 1188 / 48000, 1116 / 48000]
const ALLPASS_FILTER_FREQUENCIES = [225, 556, 441, 341]

export const VolumeNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.volume = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    this.input.connect(this.volume)
    this.input.connect(this.bypassDry)
    this.bypassDry.connect(output)
    this.volume.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const CustomDelayNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.delay = context.createDelay()
    this.feedback = context.createGain()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.delay.delayTime.value = 0.0
    this.feedback.gain.value = 0.0
    this.wetLevel.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    this.input.connect(this.delay)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.delay.connect(this.feedback)
    this.delay.connect(this.wetLevel)
    this.feedback.connect(this.delay)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)
    this.connect = (target: AudioNode) => output.connect(target)
}

export const FilterNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.filter = context.createBiquadFilter()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.filter.frequency.value = 0.0
    this.wetLevel.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.filter.type = 'lowpass' // Low pass

    // set up the routing
    this.input.connect(this.filter)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.filter.connect(this.wetLevel)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const CompressorNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.compressor = context.createDynamicsCompressor()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.compressor.attack.value = 0.01
    this.compressor.release.value = 0.150
    this.compressor.knee.value = 3.0

    // set up the routing
    this.input.connect(this.compressor)
    this.input.connect(this.bypassDry)
    this.bypassDry.connect(output)
    this.compressor.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

// Currently the splitter node is not being used since sox returns mono.
// But I am keeping it commented for future use.
export const CustomPannerNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    // this.splitter = context.createChannelSplitter(2)
    this.panLeft = context.createGain()
    this.panRight = context.createGain()
    this.merger = context.createChannelMerger(2)
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    this.bypassDry.gain.value = 0.0
    this.bypass.gain.value = 1.0

    // set up the routing
    // this.input.connect(this.splitter)
    this.input.connect(this.bypassDry)
    this.bypassDry.connect(output)
    // this.splitter.connect(this.panRight,0)
    // this.splitter.connect(this.panLeft,1)
    this.input.connect(this.panLeft)
    this.input.connect(this.panRight)
    this.panLeft.connect(this.merger, 0, 0)
    this.panRight.connect(this.merger, 0, 1)
    this.merger.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const BandpassNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.bandpass = context.createBiquadFilter()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.bandpass.frequency.value = 0.0
    this.wetLevel.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.bandpass.type = 'bandpass' // Band pass

    // set up the routing
    this.input.connect(this.bandpass)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.bandpass.connect(this.wetLevel)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const Eq3bandNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    // 3 band eq, 1st and last filter are lowshelf and highshelf respectively, using a peak filter for the mid band
    this.lowshelf = context.createBiquadFilter()
    this.highshelf = context.createBiquadFilter()
    this.midpeak = context.createBiquadFilter()

    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.lowshelf.type = 'lowshelf' // Low shelf
    this.highshelf.type = 'highshelf' // High shelf
    this.midpeak.type = 'peaking' // Peaking filter
    this.highshelf.frequency.value = 20000 // this is the max frequency. cannot be modified.
    this.lowshelf.frequency.value = 0.0
    this.highshelf.frequency.value = 0.0
    this.midpeak.frequency.value = 0.0
    this.wetLevel.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    this.input.connect(this.lowshelf) // cascading the 3 filters in series
    this.lowshelf.connect(this.midpeak)
    this.midpeak.connect(this.highshelf)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.highshelf.connect(this.wetLevel)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const ChorusNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()

    this.lfo = context.createOscillator()
    this.lfo.start(0)
    this.lfoGain = context.createGain()
    // can have upto 8 voices on the chorus. The gain controls how many voices are active
    this.inputDelay = new Array()
    this.inputDelayGain = new Array()
    for (let i = 0; i < 8; i++) {
        this.inputDelay[i] = context.createDelay()
        this.inputDelayGain[i] = context.createGain()
        this.inputDelay[i].connect(this.inputDelayGain[i])
    }

    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.inputDelayGain[0].gain.value = 1.0 // only the first delay node (voice) is active
    for (let i = 1; i < 8; i++)             // rest of the voices will be inactive initially
        this.inputDelayGain[i].gain.value = 0.0
    this.lfo.frequency.value = 0
    this.wetLevel.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    // connect input to all delay elements.
    for (let i = 0; i < 8; i++)
        this.input.connect(this.inputDelay[i])

    // LFO to scaling gain node
    this.lfo.connect(this.lfoGain)
    // bypass control
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)

    for (let i = 0; i < 8; i++) {
        // all delay elements connected to wet level node
        this.inputDelayGain[i].connect(this.wetLevel)
        // LFO controls the delay time of each node
        this.lfoGain.connect(this.inputDelay[i].delayTime)
    }

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const FlangerNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()

    this.feedback = context.createGain()
    this.lfo = context.createOscillator()
    this.lfo.start(0)
    this.lfoGain = context.createGain()
    // only 1 delay element for flanging
    this.inputDelay = context.createDelay()

    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.lfo.frequency.value = 0
    this.lfoGain.gain.value = 0.003 // FIXED!? No parameter to change this??
    this.wetLevel.gain.value = 0.0
    this.feedback.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    // connect input to all delay element
    this.input.connect(this.inputDelay)

    // LFO to scaling gain node
    this.lfo.connect(this.lfoGain)
    // bypass control
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)

    // delay element connected to wet level node
    this.inputDelay.connect(this.wetLevel)
    // delay element connected to feedback node
    this.inputDelay.connect(this.feedback)
    this.feedback.connect(this.inputDelay)
    // LFO controls the delay time of the delay element
    this.lfoGain.connect(this.inputDelay.delayTime)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const PhaserNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()

    this.feedback = context.createGain()
    this.lfo = context.createOscillator()
    this.lfo.start(0)
    this.lfoGain = context.createGain()
    // creating a 4 stage all pass filter
    this.allpass1 = context.createBiquadFilter()
    this.allpass2 = context.createBiquadFilter()
    this.allpass3 = context.createBiquadFilter()
    this.allpass4 = context.createBiquadFilter()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.allpass1.type = 'allpass'
    this.allpass2.type = 'allpass'
    this.allpass3.type = 'allpass'
    this.allpass4.type = 'allpass'
    this.lfo.frequency.value = 0
    this.lfoGain.gain.value = 300 // FIXED!? No parameter to change this??
    this.wetLevel.gain.value = 1.0
    this.feedback.gain.value = 0.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    // connect input to all delay element
    this.input.connect(this.allpass1)
    this.allpass1.connect(this.allpass2)
    this.allpass2.connect(this.allpass3)
    this.allpass3.connect(this.allpass4)

    // LFO to scaling gain node
    this.lfo.connect(this.lfoGain)
    // bypass control
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)

    // all pass filter 4, connected to wet level node
    this.allpass4.connect(this.wetLevel)
    // all pass filter 4, connected to feedback node
    this.allpass4.connect(this.feedback)
    this.feedback.connect(this.allpass1)
    // LFO controls the freq of phase shift
    this.lfoGain.connect(this.allpass1.frequency)
    this.lfoGain.connect(this.allpass2.frequency)
    this.lfoGain.connect(this.allpass3.frequency)
    this.lfoGain.connect(this.allpass4.frequency)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const TremoloNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()

    this.feedback = context.createGain()
    this.lfo = context.createOscillator()
    this.lfo.start(0)
    this.lfoGain = context.createGain()

    this.inputGain = context.createGain()

    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.lfo.frequency.value = 0
    this.lfoGain.gain.value = 0.1 // FIXED!? No parameter to change this??
    this.wetLevel.gain.value = 1.0
    this.feedback.gain.value = 0.2 // Some initial value
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    // connect input to all delay element
    this.input.connect(this.inputGain)

    // LFO to scaling gain node
    this.lfo.connect(this.lfoGain)
    // bypass control
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)

    // delay element connected to wet level node
    this.inputGain.connect(this.wetLevel)
    // delay element connected to feedback node
    this.inputGain.connect(this.feedback)
    this.feedback.connect(this.inputGain)
    // LFO controls the delay time of the delay element
    this.lfoGain.connect(this.inputGain.gain)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}


// Using script processor node for call back to recompute the non linear curve for the wave shaper
export const DistortionNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    this.output = context.createGain()
    this.waveshaper = context.createWaveShaper()
    this.preGain = context.createGain()  // drive amount
    this.postGain = context.createGain()  // output gain compensation
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()
    this.dummyGain = context.createGain()

    // stub the initial values
    this.wetLevel.gain.value = 0.5
    this.dryLevel.gain.value = 0.5
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.dummyGain.gain.value = 0.0
    this.preGain.gain.value = 3.0 // can be automated now
    this.postGain.gain.value = Math.pow(1 / this.preGain.gain.value, 0.6) // output gain compensation

    // define non linear distortion curve
    const k = this.preGain.gain.value * 100
    const n = 22050
    const curve = new Float32Array(n)
    const deg = Math.PI / 180

    this.generateCurve = () => {
        for (let i = 0; i < n; i++) {
            const x = i * 2 / n - 1
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x))
        }
        this.waveshaper.curve = curve
    }
    this.generateCurve()
    // set up the routing
    this.input.connect(this.preGain)

    this.preGain.connect(this.dummyGain)
    this.dummyGain.connect(this.output)

    this.preGain.connect(this.waveshaper)
    this.waveshaper.connect(this.postGain)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(this.output)
    this.bypassDry.connect(this.output)
    this.postGain.connect(this.wetLevel)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(this.output)

    this.connect = (target: AudioNode) => this.output.connect(target)
}

// Do nothing, as we are using SoX for this effect. Just wrap a gain node.
export const PitchshiftNode = function (context: AudioContext) {
    this.input = context.createGain()
    this.connect = (target: AudioNode) => this.input.connect(target)
}

export const RingmodNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()

    this.feedback = context.createGain()
    this.lfo = context.createOscillator()
    this.lfo.start(0)
    this.ringGain = context.createGain()

    this.inputGain = context.createGain()

    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.lfo.frequency.value = 40.0 // Default frequency of modulating signal
    this.ringGain.gain.value = 1.0 // FIXED!? Looks like we don't need to control depth of ring modulation
    this.wetLevel.gain.value = 1.0
    this.feedback.gain.value = 0.0 // Some initial value
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0

    // set up the routing
    // connect input to all delay element
    this.input.connect(this.inputGain)

    // LFO to scaling gain node
    this.lfo.connect(this.ringGain)
    // bypass control
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)

    // delay element connected to wet level node
    this.inputGain.connect(this.wetLevel)
    // delay element connected to feedback node
    this.inputGain.connect(this.feedback)
    this.feedback.connect(this.inputGain)
    // LFO controls the delay time of the delay element
    this.ringGain.connect(this.inputGain.gain)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const WahNode = function (context: AudioContext) {
    // create the nodes we’ll use
    this.input = context.createGain()
    const output = context.createGain()
    this.bandpass = context.createBiquadFilter()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()

    // stub the initial values
    this.bandpass.frequency.value = 0.0
    this.wetLevel.gain.value = 1.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.bandpass.type = 'bandpass' // We need a resonant Band pass for wah effect

    this.bandpass.Q.value = 1.25  // Setting Q factor
    // set up the routing
    this.input.connect(this.bandpass)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.bandpass.connect(this.wetLevel)

    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

export const ReverbNode1 = function (context: AudioContext) {
    this.input = context.createGain()
    this.reverb = new (Freeverb as any)(context)
    const output = context.createGain()
    this.wetLevel = context.createGain()
    this.dryLevel = context.createGain()
    this.bypass = context.createGain()
    this.bypassDry = context.createGain()


    this.wetLevel.gain.value = 1.0
    this.dryLevel.gain.value = 0.0
    this.bypass.gain.value = 1.0
    this.bypassDry.gain.value = 0.0
    this.reverb.roomSize = 0.1
    this.reverb.dampening = 3000
    
    this.input.connect(this.reverb)
    this.input.connect(this.dryLevel)
    this.input.connect(this.bypassDry)
    this.reverb.connect(this.wetLevel)
    this.dryLevel.connect(output)
    this.bypassDry.connect(output)
    this.wetLevel.connect(this.bypass)
    this.bypass.connect(output)

    this.connect = (target: AudioNode) => output.connect(target)
}

function Freeverb (audioContext: AudioContext) {
    const node: GainNode & {combFilters?: AudioNode[]} = audioContext.createGain()
    node.channelCountMode = 'explicit'
    node.channelCount = 2

    const output = audioContext.createGain()
    const merger = audioContext.createChannelMerger(2)
    const splitter = audioContext.createChannelSplitter(2)
    const highpass = audioContext.createBiquadFilter()
    highpass.type = 'highpass'
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
        allpassL.type = 'allpass'
        allpassL.frequency.value = ALLPASS_FILTER_FREQUENCIES[l] 
        allpassFiltersL.push(allpassL)

        if (allpassFiltersL[l - 1]) {
            allpassFiltersL[l - 1].connect(allpassL)
        }
    }

    // all pass filter on right
    for (let r = 0; r < ALLPASS_FILTER_FREQUENCIES.length; r++) {
        const allpassR = audioContext.createBiquadFilter()
        allpassR.type = 'allpass'
        allpassR.frequency.value = ALLPASS_FILTER_FREQUENCIES[r] + 23/48000 // For stereo spread
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

function LowpassCombFilter (context: AudioContext) {
    const node: DelayNode & { dampening?: AudioParam, resonance?: AudioParam } = context.createDelay(1)

    const output = context.createBiquadFilter()
    output.Q.value = 0.15

    output.type = 'lowpass'
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
