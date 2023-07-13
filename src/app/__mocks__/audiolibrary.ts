/* eslint-disable @typescript-eslint/no-unused-vars */

export async function getMetadata(name: string) {
    return null
}

export function getSound(filekey: string) {
    return null
}

export async function getStandardSounds() {
    return {
        sounds: [{
            artist: "RICHARD DEVINE",
            folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
            genre: "DUBSTEP",
            genreGroup: "DUBSTEP",
            instrument: "SYNTH",
            name: "DUBSTEP_BASS_WOBBLE_001",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 140,
            year: 2012,
        }, {
            artist: "RICHARD DEVINE",
            folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
            genre: "DUBSTEP",
            genreGroup: "DUBSTEP",
            instrument: "SYNTH",
            name: "DUBSTEP_BASS_WOBBLE_002",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 140,
            year: 2012,
        }, {
            artist: "YOUNG GURU",
            folder: "ELECTRO_RHODES",
            genre: "ELECTRO",
            genreGroup: "EDM",
            instrument: "KEYBOARD",
            name: "YG_ELECTRO_RHODES_1",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 90,
            year: 2015,
        }, {
            artist: "YOUNG GURU",
            folder: "ELECTRO_SNARE",
            genre: "ELECTRO",
            genreGroup: "EDM",
            instrument: "DRUMS",
            name: "YG_ELECTRO_SNARE_1",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 90,
            year: 2015,
        }],
        folders: ["DUBSTEP_140_BPM__DUBBASSWOBBLE", "ELECTRO_RHODES", "ELECTRO_SNARE"],
    }
}

export const EFFECT_NAMES_DISPLAY = [
    "VOLUME", "GAIN", "DELAY", "DELAY_TIME", "DELAY_FEEDBACK",
    "DISTORTION", "DISTO_GAIN", "FILTER", "FILTER_FREQ", "FILTER_RESONANCE",
    "COMPRESSOR", "COMPRESSOR_THRESHOLD", "COMPRESSOR_RATIO", "PAN", "LEFT_RIGHT",
    "BANDPASS", "BANDPASS_FREQ", "BANDPASS_RESONANCE", "CHORUS", "CHORUS_LENGTH",
    "CHORUS_NUMVOICES", "CHORUS_RATE", "CHORUS_MOD", "EQ3BAND", "EQ3BAND_LOWGAIN",
    "EQ3BAND_LOWFREQ", "EQ3BAND_MIDGAIN", "EQ3BAND_MIDFREQ", "EQ3BAND_HIGHGAIN",
    "EQ3BAND_HIGHFREQ", "FLANGER", "FLANGER_LENGTH", "FLANGER_FEEDBACK",
    "FLANGER_RATE", "PHASER", "PHASER_RATE", "PHASER_RANGEMIN", "PHASER_RANGEMAX",
    "PHASER_FEEDBACK", "PITCHSHIFT", "PITCHSHIFT_SHIFT", "TREMOLO", "TREMOLO_FREQ",
    "TREMOLO_AMOUNT", "RINGMOD", "RINGMOD_MODFREQ", "RINGMOD_FEEDBACK", "WAH",
    "WAH_POSITION", "REVERB", "REVERB_TIME", "REVERB_DAMPFREQ", "MIX", "BYPASS",
]
export const EFFECT_NAMES = EFFECT_NAMES_DISPLAY.concat(["BANDPASS_WIDTH"])
export const ANALYSIS_NAMES = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"]
