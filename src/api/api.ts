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

interface Parameter {
    typeKey: string
    default?: string
}

export interface APIParameter extends Parameter {
    descriptionKey: string
}

interface Item {
    example: {
        pythonKey: string
        javascriptKey: string
    }
    parameters?: { [name: string]: Parameter }
    returns?: string
    language?: string
    deprecated?: true
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
            sound: {
                typeKey: "api:types.soundConstant",
            },

            feature: {
                typeKey: "api:types.analysisConstant",
            },
        },
        returns: "float",
        example: {
            pythonKey: "api:analyze.example.python",
            javascriptKey: "api:analyze.example.javascript",
        },
    }],
    analyzeForTime: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
            },
            sliceStart: {
                typeKey: "api:types.float",
            },
            sliceEnd: {
                typeKey: "api:types.float",
            },
        },
        returns: "float",
        example: {
            pythonKey: "api:analyzeForTime.example.python",
            javascriptKey: "api:analyzeForTime.example.javascript",
        },
    }],
    analyzeTrack: [{
        parameters: {
            track: {
                typeKey: "api:types.integer",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
            },
        },
        returns: "float",
        example: {
            pythonKey: "api:analyzeTrack.example.python",
            javascriptKey: "api:analyzeTrack.example.javascript",
        },
    }],
    analyzeTrackForTime: [{
        parameters: {
            track: {
                typeKey: "api:types.integer",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
            },
            start: {
                typeKey: "api:types.float",
            },
            end: {
                typeKey: "api:types.float",
            },
        },
        returns: "float",
        example: {
            pythonKey: "api:analyzeTrackForTime.example.python",
            javascriptKey: "api:analyzeTrackForTime.example.javascript",
        },
    }],
    createAudioSlice: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            sliceStart: {
                typeKey: "api:types.float",
            },
            sliceEnd: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:createAudioSlice.example.python",
            javascriptKey: "api:createAudioSlice.example.javascript",
        },
        returns: "soundConstant",
    }],
    dur: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
        },
        example: {
            pythonKey: "api:dur.example.python",
            javascriptKey: "api:dur.example.javascript",
        },
        returns: "float",
    }],
    finish: [{
        example: {
            pythonKey: "api:finish.example.python",
            javascriptKey: "api:finish.example.javascript",
        },
        deprecated: true,
    }],
    fitMedia: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            track: {
                typeKey: "api:types.integer",
            },
            start: {
                typeKey: "api:types.float",
            },
            end: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:fitMedia.example.python",
            javascriptKey: "api:fitMedia.example.javascript",
        },
    }],
    importImage: [{
        parameters: {
            url: {
                typeKey: "api:types.string",
            },
            nrows: {
                typeKey: "api:types.integer",
            },
            ncols: {
                typeKey: "api:types.integer",
            },
            includeRGB: {
                typeKey: "api:types.booleanOptional",
                default: "False",
            },
        },
        example: {
            pythonKey: "api:importImage.example.python",
            javascriptKey: "api:importImage.example.javascript",
        },
        returns: "list",
    }],
    importFile: [{
        parameters: {
            url: {
                typeKey: "api:types.string",
            },
        },
        returns: "string",
        example: {
            pythonKey: "api:importFile.example.python",
            javascriptKey: "api:importFile.example.javascript",
        },
    }],
    init: [{
        example: {
            pythonKey: "api:init.example.python",
            javascriptKey: "api:init.example.javascript",
        },
        deprecated: true,
    }],
    insertMedia: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            track: {
                typeKey: "api:types.integer",
            },
            start: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:insertMedia.example.python",
            javascriptKey: "api:insertMedia.example.javascript",
        },
    }],
    insertMediaSection: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            track: {
                typeKey: "api:types.integer",
            },
            start: {
                typeKey: "api:types.float",
            },
            sliceStart: {
                typeKey: "api:types.float",
            },
            sliceEnd: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:insertMediaSection.example.python",
            javascriptKey: "api:insertMediaSection.example.javascript",
        },
    }],
    makeBeat: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundOrList",
            },
            track: {
                typeKey: "api:types.integer",
            },
            start: {
                typeKey: "api:types.float",
            },
            beat: {
                typeKey: "api:types.string",
            },
        },
        example: {
            pythonKey: "api:makeBeat.example.python",
            javascriptKey: "api:makeBeat.example.javascript",
        },
    }],
    makeBeatSlice: [{
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
            },
            track: {
                typeKey: "api:types.integer",
            },
            start: {
                typeKey: "api:types.float",
            },
            beat: {
                typeKey: "api:types.string",
            },
            sliceStarts: {
                typeKey: "api:types.listArray",
            },
        },
        example: {
            pythonKey: "api:makeBeatSlice.example.python",
            javascriptKey: "api:makeBeatSlice.example.javascript",
        },
    }],
    print: [{
        parameters: {
            input: {
                typeKey: "api:types.any",
            },
        },
        example: {
            pythonKey: "api:print.example.python",
            javascriptKey: "should not show",
        },
        language: "python",
    }],
    println: [{
        parameters: {
            input: {
                typeKey: "api:types.any",
            },
        },
        example: {
            pythonKey: "should not show",
            javascriptKey: "api:println.example.javascript",
        },
        language: "javascript",
    }],
    readInput: [{
        parameters: {
            prompt: {
                typeKey: "api:types.stringOptional",
            },
        },
        returns: "string",
        example: {
            pythonKey: "api:readInput.example.python",
            javascriptKey: "api:readInput.example.javascript",
        },
    }],
    replaceListElement: [{
        parameters: {
            list: {
                typeKey: "api:types.listArray",
            },
            elementToReplace: {
                typeKey: "api:types.any",
            },
            withElement: {
                typeKey: "api:types.any",
            },
        },
        example: {
            pythonKey: "api:replaceListElement.example.python",
            javascriptKey: "api:replaceListElement.example.javascript",
        },
    }],
    replaceString: [{
        parameters: {
            string: {
                typeKey: "api:types.string",
            },
            characterToReplace: {
                typeKey: "api:types.string",
            },
            withCharacter: {
                typeKey: "api:types.string",
            },
        },
        returns: "string",
        example: {
            pythonKey: "api:replaceString.example.python",
            javascriptKey: "api:replaceString.example.javascript",
        },
    }],
    reverseList: [{
        parameters: {
            list: {
                typeKey: "api:types.listArray",
            },
        },
        returns: "listArray",
        example: {
            pythonKey: "api:reverseList.example.python",
            javascriptKey: "api:reverseList.example.javascript",
        },
    }],
    reverseString: [{
        parameters: {
            string: {
                typeKey: "api:types.string",
            },
        },
        returns: "string",
        example: {
            pythonKey: "api:reverseString.example.python",
            javascriptKey: "api:reverseString.example.javascript",
        },
    }],
    rhythmEffects: [{
        parameters: {
            track: {
                typeKey: "api:types.integer",
            },
            type: {
                typeKey: "api:types.effectConstant",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
            },
            list: {
                typeKey: "api:types.listArray",
            },
            start: {
                typeKey: "api:types.float",
            },
            beat: {
                typeKey: "api:types.string",
            },
        },
        example: {
            pythonKey: "api:rhythmEffects.example.python",
            javascriptKey: "api:rhythmEffects.example.javascript",
        },
    }],
    selectRandomFile: [{
        parameters: {
            folderSubstring: {
                typeKey: "api:types.string",
                default: "\"\"",
            },
        },
        returns: "soundConstant",
        example: {
            pythonKey: "api:selectRandomFile.example.python",
            javascriptKey: "api:selectRandomFile.example.javascript",
        },
    }],
    setEffect: [{
        parameters: {
            track: {
                typeKey: "api:types.integer",
            },
            type: {
                typeKey: "api:types.effectConstant",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
            },
            value: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:setEffect1.example.python",
            javascriptKey: "api:setEffect1.example.javascript",
        },
    }, {
        parameters: {
            track: {
                typeKey: "api:types.integer",
            },
            type: {
                typeKey: "api:types.effectConstant",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
            },
            startValue: {
                typeKey: "api:types.float",
            },
            start: {
                typeKey: "api:types.float",
            },
            endValue: {
                typeKey: "api:types.floatOptional",
            },
            end: {
                typeKey: "api:types.floatOptional",
            },
        },
        example: {
            pythonKey: "api:setEffect2.example.python",
            javascriptKey: "api:setEffect2.example.javascript",
        },
    }],
    setTempo: [{
        parameters: {
            tempo: {
                typeKey: "api:types.float",
            },
        },
        example: {
            pythonKey: "api:setTempo1.example.python",
            javascriptKey: "api:setTempo1.example.javascript",
        },
    }, {
        parameters: {
            startTempo: {
                typeKey: "api:types.float",
            },
            start: {
                typeKey: "api:types.float",
            },
            endTempo: {
                typeKey: "api:types.floatOptional",
            },
            end: {
                typeKey: "api:types.floatOptional",
            },
        },
        example: {
            pythonKey: "api:setTempo2.example.python",
            javascriptKey: "api:setTempo2.example.javascript",
        },
    }],
    shuffleList: [{
        parameters: {
            list: {
                typeKey: "api:types.listArray",
            },
        },
        returns: "listArray",
        example: {
            pythonKey: "api:shuffleList.example.python",
            javascriptKey: "api:shuffleList.example.javascript",
        },
    }],
    shuffleString: [{
        parameters: {
            string: {
                typeKey: "api:types.string",
            },
        },
        returns: "string",
        example: {
            pythonKey: "api:shuffleString.example.python",
            javascriptKey: "api:shuffleString.example.javascript",
        },
    }],
}

function getSignature(name: string, parameters: { [name: string]: Parameter }) {
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
        const { signature, template } = getSignature(name, entry.parameters ?? {})
        const parameters = entry.parameters && fromEntries(Object.entries(entry.parameters).map(([param, info]) => ([
            param,
            { ...info, descriptionKey: `${key}.parameters.${param}.description` },
        ])))
        const returns = entry.returns === undefined
            ? undefined
            : {
                typeKey: `api:types.${entry.returns}`,
                descriptionKey: `${key}.returns.description`,
            }
        return {
            ...entry,
            descriptionKey: key + ".description",
            parameters,
            returns,
            signature,
            template,
        }
    })
}

export const API_DOC: { readonly [key: string]: readonly APIItem[] } = apiDoc
