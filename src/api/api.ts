import { fromEntries } from "../esutils"

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
    createAudioStretch: { async: false, mod: true, return: true },
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
    multiChoiceInput: { async: true, mod: false, return: true },
    importImage: { async: true, mod: false, return: true },
    importFile: { async: true, mod: false, return: true },
    selectRandomFile: { async: true, mod: false, return: true },
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

type Parameter = string | { type: string, default: string }

export interface APIParameter {
    typeKey: string
    descriptionKey: string
    default?: string
}

interface Item {
    parameters?: { [name: string]: Parameter }
    returns?: string
    language?: string
    deprecated?: boolean
}

export interface APIItem {
    // These get filled in automatically below.
    descriptionKey: string
    parameters?: { [name: string]: APIParameter }
    returns?: {
        typeKey: string
        descriptionKey: string
    }
    signature: string
    template: string
    example: {
        pythonKey: string
        javascriptKey: string
    }
    language?: string
    deprecated?: boolean
}

const rawDoc: { [key: string]: Item[] } = {
    analyze: [{
        parameters: {
            sound: "soundConstant",
            feature: "analysisConstant",
        },
        returns: "float",
    }],
    analyzeForTime: [{
        parameters: {
            sound: "soundConstant",
            feature: "analysisConstant",
            sliceStart: "float",
            sliceEnd: "float",
        },
        returns: "float",
    }],
    analyzeTrack: [{
        parameters: {
            track: "integer",
            feature: "analysisConstant",
        },
        returns: "float",
    }],
    analyzeTrackForTime: [{
        parameters: {
            track: "integer",
            feature: "analysisConstant",
            start: "float",
            end: "float",
        },
        returns: "float",
    }],
    createAudioSlice: [{
        parameters: {
            sound: "soundConstant",
            sliceStart: "float",
            sliceEnd: "float",
        },
        returns: "soundConstant",
    }],
    createAudioStretch: [{
        parameters: {
            sound: "soundConstant",
            stretchFactor: "float",
        },
        returns: "soundConstant",
    }],
    dur: [{
        parameters: {
            sound: "soundConstant",
        },
        returns: "float",
    }],
    finish: [{
        deprecated: true,
    }],
    fitMedia: [{
        parameters: {
            sound: "soundConstant",
            track: "integer",
            start: "float",
            end: "float",
        },
    }],
    importImage: [{
        parameters: {
            url: "string",
            nrows: "integer",
            ncols: "integer",
            includeRGB: {
                type: "booleanOptional",
                default: "False",
            },
        },
        returns: "list",
    }],
    importFile: [{
        parameters: {
            url: "string",
        },
        returns: "string",
    }],
    init: [{
        deprecated: true,
    }],
    insertMedia: [{
        parameters: {
            sound: "soundConstant",
            track: "integer",
            start: "float",
        },
    }],
    insertMediaSection: [{
        parameters: {
            sound: "soundConstant",
            track: "integer",
            start: "float",
            sliceStart: "float",
            sliceEnd: "float",
        },
    }],
    makeBeat: [{
        parameters: {
            sound: "soundOrList",
            track: "integer",
            start: "float",
            beat: "string",
        },
    },
    {
        parameters: {
            sound: "soundOrList",
            track: "integer",
            start: "float",
            beat: "string",
            stepsPerMeasure: {
                type: "floatOptional",
                default: "16",
            },
        },
    }],
    makeBeatSlice: [{
        parameters: {
            sound: "soundConstant",
            track: "integer",
            start: "float",
            beat: "string",
            sliceStarts: "listArray",
        },
    },
    {
        parameters: {
            sound: "soundConstant",
            track: "integer",
            start: "float",
            beat: "string",
            sliceStarts: "listArray",
            stepsPerMeasure: {
                type: "floatOptional",
                default: "16",
            },
        },
    }],
    print: [{
        parameters: {
            input: "any",
        },
        language: "python",
    }],
    println: [{
        parameters: {
            input: "any",
        },
        language: "javascript",
    }],
    readInput: [{
        parameters: {
            prompt: "stringOptional",
        },
        returns: "string",
    }],
    multiChoiceInput: [{
        parameters: {
            prompt: "string",
            choices: "list",
        },
        returns: "integer",
    },
    {
        parameters: {
            prompt: "string",
            choices: "list",
            allowMultiple: "booleanOptional",
        },
        returns: "list",
    }],
    replaceListElement: [{
        parameters: {
            list: "listArray",
            elementToReplace: "any",
            withElement: "any",
        },
    }],
    replaceString: [{
        parameters: {
            string: "string",
            characterToReplace: "string",
            withCharacter: "string",
        },
        returns: "string",
    }],
    reverseList: [{
        parameters: {
            list: "listArray",
        },
        returns: "listArray",
    }],
    reverseString: [{
        parameters: {
            string: "string",
        },
        returns: "string",
    }],
    rhythmEffects: [{
        parameters: {
            track: "integer",
            effect: "effectConstant",
            parameter: "effectParameterConstant",
            values: "listArray",
            start: "float",
            beat: "string",
            stepsPerMeasure: {
                type: "floatOptional",
                default: "16",
            },
        },
    }],
    selectRandomFile: [{
        parameters: {
            folderSubstring: {
                type: "string",
                default: '""',
            },
        },
        returns: "soundConstant",
    }],
    setEffect: [{
        parameters: {
            track: "integer",
            type: "effectConstant",
            parameter: "effectParameterConstant",
            value: "float",
        },
    }, {
        parameters: {
            track: "integer",
            type: "effectConstant",
            parameter: "effectParameterConstant",
            startValue: "float",
            start: "float",
            endValue: "floatOptional",
            end: "floatOptional",
        },
    }],
    setTempo: [{
        parameters: {
            tempo: "float",
        },
    }, {
        parameters: {
            startTempo: "float",
            start: "float",
            endTempo: "floatOptional",
            end: "floatOptional",
        },
    }],
    shuffleList: [{
        parameters: {
            list: "listArray",
        },
        returns: "listArray",
    }],
    shuffleString: [{
        parameters: {
            string: "string",
        },
        returns: "string",
    }],
}

function getSignature(name: string, parameters: { [name: string]: { default?: string } }) {
    const paramStrings = Object.entries(parameters).map(
        ([param, info]) => param + (info.default ? `=${info.default}` : "")
    )
    return {
        signature: `${name}(${paramStrings.join(", ")})`,
        template: `${name}(${paramStrings.map(s => "${" + s + "}").join(", ")})`,
    }
}

// Fill in autocomplete fields.
const apiDoc: { [key: string]: APIItem[] } = {}
for (const [name, entries] of Object.entries(rawDoc)) {
    apiDoc[name] = entries.map((entry, i) => {
        const key = `api:${name}` + (entries.length > 1 ? (i + 1) : "")
        const parameters = entry.parameters && fromEntries(Object.entries(entry.parameters).map(([param, info]) => {
            const tmp = typeof info === "string" ? { type: info, default: undefined } : info
            const expanded = {
                typeKey: `api:types.${tmp.type}`,
                descriptionKey: `${key}.parameters.${param}.description`,
                default: tmp.default,
            }
            return [param, expanded]
        }))
        const { signature, template } = getSignature(name, parameters ?? {})
        const returns = entry.returns === undefined
            ? undefined
            : {
                typeKey: `api:types.${entry.returns}`,
                descriptionKey: `${key}.returns.description`,
            }
        const example = {
            pythonKey: entry.language === "javascript" ? "should not show" : `${key}.example.python`,
            javascriptKey: entry.language === "python" ? "should not show" : `${key}.example.javascript`,
        }
        return {
            ...entry,
            descriptionKey: key + ".description",
            parameters,
            returns,
            example,
            signature,
            template,
        }
    })
}

export const API_DOC: { readonly [key: string]: readonly APIItem[] } = apiDoc
