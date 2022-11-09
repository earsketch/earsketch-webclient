export interface APIConfig {
    // Does this API function need to wait for something asynchronous (like fetching a sound)?
    async: boolean
    // Does this API function modify the state of the DAW?
    mod: boolean
    // Does this API function return a value for the user?
    return: boolean
}

export const API_FUNCTIONS = {
    // No return value, modify DAW data.
    init: { async: false, mod: true, return: false },
    setTempo: { async: false, mod: true, return: false },
    finish: { async: false, mod: true, return: false },
    fitMedia: { async: false, mod: true, return: false },
    insertMedia: { async: false, mod: true, return: false },
    makeBeat: { async: false, mod: true, return: false },
    rhythmEffects: { async: false, mod: true, return: false },
    setEffect: { async: false, mod: true, return: false },
    // Return value, don't modify DAW data.
    gauss: { async: false, mod: false, return: true },
    println: { async: false, mod: false, return: true },
    replaceListElement: { async: false, mod: false, return: true },
    replaceString: { async: false, mod: false, return: true },
    reverseList: { async: false, mod: false, return: true },
    reverseString: { async: false, mod: false, return: true },
    shuffleList: { async: false, mod: false, return: true },
    shuffleString: { async: false, mod: false, return: true },
    // Both return a value and modify DAW data.
    createAudioSlice: { async: false, mod: true, return: true },
    // Async: no return value, modify DAW data.
    insertMediaSection: { async: true, mod: true, return: false },
    makeBeatSlice: { async: true, mod: true, return: false },
    // Async: return value, don't modify DAW data.
    analyze: { async: true, mod: false, return: true },
    analyzeForTime: { async: true, mod: false, return: true },
    analyzeTrack: { async: true, mod: false, return: true },
    analyzeTrackForTime: { async: true, mod: false, return: true },
    dur: { async: true, mod: false, return: true },
    readInput: { async: true, mod: false, return: true },
    importImage: { async: true, mod: false, return: true },
    importFile: { async: true, mod: false, return: true },
    selectRandomFile: { async: true, mod: false, return: true },
}

export const EFFECT_NAMES = [
    "VOLUME", "GAIN", "DELAY", "DELAY_TIME", "DELAY_FEEDBACK",
    "DISTORTION", "DISTO_GAIN", "FILTER", "FILTER_FREQ", "FILTER_RESONANCE",
    "COMPRESSOR", "COMPRESSOR_THRESHOLD", "COMPRESSOR_RATIO", "PAN", "LEFT_RIGHT",
    "BANDPASS", "BANDPASS_FREQ", "BANDPASS_WIDTH", "CHORUS", "CHORUS_LENGTH",
    "CHORUS_NUMVOICES", "CHORUS_RATE", "CHORUS_MOD", "EQ3BAND", "EQ3BAND_LOWGAIN",
    "EQ3BAND_LOWFREQ", "EQ3BAND_MIDGAIN", "EQ3BAND_MIDFREQ", "EQ3BAND_HIGHGAIN",
    "EQ3BAND_HIGHFREQ", "FLANGER", "FLANGER_LENGTH", "FLANGER_FEEDBACK",
    "FLANGER_RATE", "PHASER", "PHASER_RATE", "PHASER_RANGEMIN", "PHASER_RANGEMAX",
    "PHASER_FEEDBACK", "PITCHSHIFT", "PITCHSHIFT_SHIFT", "TREMOLO", "TREMOLO_FREQ",
    "TREMOLO_AMOUNT", "RINGMOD", "RINGMOD_MODFREQ", "RINGMOD_FEEDBACK", "WAH",
    "WAH_POSITION", "REVERB", "REVERB_TIME", "REVERB_DAMPFREQ", "MIX", "BYPASS",
]
export const ANALYSIS_NAMES = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"]
