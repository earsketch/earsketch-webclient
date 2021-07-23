const blockDropdownNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
const blockDropdownEffects = ['BANDPASS', 'CHORUS', 'COMPRESSOR', 'DELAY', 'DISTORTION', 'EQ3BAND', 'FILTER', 'FLANGER', 'PAN', 'PHASER', 'PITCHSHIFT', 'REVERB', 'RINGMOD', 'TREMOLO', 'VOLUME', 'WAH'];
const blockDropdownEffectParameters = ['MIX', 'BYPASS', 'BANDPASS_FREQ', 'BANDPASS_WIDTH', 'CHORUS_LENGTH', 'CHORUS_NUMVOICES', 'CHORUS_RATE', 'CHORUS_MOD', 'COMPRESSOR_THRESHOLD', 'COMPRESSOR_RATIO', 'DELAY_TIME', 'DELAY_FEEDBACK', 'DISTO_GAIN', 'EQ3BAND_LOWGAIN', 'EQ3BAND_LOWFREQ', 'EQ3BAND_MIDGAIN', 'EQ3BAND_MIDFREQ', 'EQ3BAND_HIGHGAIN', 'EQ3BAND_HIGHFREQ', 'FILTER_FREQ', 'FILTER_RESONANCE', 'FLANGER_LENGTH', 'FLANGER_FEEDBACK', 'FLANGER_RATE', 'LEFT_RIGHT', 'PHASER_RATE', 'PHASER_RANGEMIN', 'PHASER_RANGEMAX', 'PHASER_FEEDBACK', 'PITCHSHIFT_SHIFT', 'REVERB_TIME', 'REVERB_DAMPFREQ', 'RINGMOD_MODFREQ', 'RINGMOD_FEEDBACK', 'TREMOLO_FREQ', 'TREMOLO_AMOUNT', 'GAIN', 'WAH_POSITION'];

const expressionContext = {
    "prefix": "a = "
};
const blockModeOptions = {
    "functions": {
        "init": {"color": "purple"},
        "setTempo": {"color": "purple"},
        "fitMedia": {"color": "purple", "dropdown": [null, blockDropdownNumbers, blockDropdownNumbers, blockDropdownNumbers]},
        "makeBeat": {"color": "purple", "dropdown": [null, blockDropdownNumbers, blockDropdownNumbers]},
        "setEffect": {"color": "purple", "dropdown": [blockDropdownNumbers, blockDropdownEffects, blockDropdownEffectParameters]},
        "finish": {"color": "purple"},
        "println": {"color": "purple"},
        "selectRandomFile": {"color": "purple"},
        "insertMedia": {"color": "purple", "dropdown": [null, blockDropdownNumbers]},
        "analyze": {"color": "green"},
        "analyzeForTime": {"color": "green"},
        "analyzeTrack": {"color": "green", "dropdown": [blockDropdownNumbers]},
        "analyzeTrackForTime": {"color": "green", "dropdown": [blockDropdownNumbers]},
        "dur": {"color": "green"},
        "importImage": {"color": "green"},
        "importFile": {"color": "green"},
        "insertMediaSection": {"color": "green", "dropdown": [null, blockDropdownNumbers]},
        "makeBeatSlice": {"color": "green", "dropdown": [null, blockDropdownNumbers]},
        "readInput": {"color": "green"},
        "replaceListElement": {"color": "green"},
        "replaceString": {"color": "green"},
        "reverseList": {"color": "green"},
        "reverseString": {"color": "green"},
        "rhythmEffects": {"color": "green", "dropdown": [blockDropdownNumbers, blockDropdownEffects, blockDropdownEffectParameters]},
        "shuffleList": {"color": "green"},
        "shuffleString" : {"color": "green"}
    },
    "categories": {
        "functions": {"color": 'purple'}
    }
};

export const blockPalettePython = {
    "mode": "python",
    "modeOptions": blockModeOptions,
    "palette": [
        {
            "name": "EarSketch",
            "color": "purple",
            "blocks": [
                { "block": "from earsketch import *" },
                { "block": "init()" },
                { "block": "setTempo(tempo)" },
                { "block": "fitMedia(fileName, trackNumber, startLocation, endLocation)" },
                { "block": "makeBeat(fileName, trackNumber, measure, string)" },
                { "block": "setEffect(trackNumber, effectType, effectParameter, effectValue)" },
                { "block": "setEffect(trackNumber, effectType, effectParameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation)" },
                { "block": "finish()" },
                { "block": "print 'Hello World!'" },
                { "block": "selectRandomFile(folder)" },
                { "block": "insertMedia(fileName, trackNumber, trackLocation)" }
            ]
        },
        {
            "name": "Advanced",
            "color": "green",
            "blocks": [
                { "block": "analyze(audioFile, featureForAnalysis)" },
                { "block": "analyzeForTime(audioFile, featureForAnalysis, startTime, endTime)" },
                { "block": "analyzeTrack(trackNumber, featureForAnalysis)" },
                { "block": "analyzeTrackForTime(trackNumber, featureForAnalysis, startTime, endTime)" },
                { "block": "dur(fileName)" },
                { "block": "importImage(imageURL, nrows, ncols, includeRGB=False)" },
                { "block": "importFile(fileURL)" },
                { "block": "insertMediaSection (fileName, trackNumber, trackLocation, mediaStartLocation, mediaEndLocation)" },
                { "block": "makeBeatSlice(fileName, trackNumber, measure, string, beatNumber)" },
                { "block": "readInput(prompt)" },
                { "block": "replaceListElement(inputList, elementToReplace, withElement)" },
                { "block": "replaceString(string, characterToReplace, withCharacter)" },
                { "block": "reverseList(inputList)" },
                { "block": "reverseString(inputString)" },
                { "block": "rhythmEffects(trackNumber, effectType, effectParameter, effectList, measure, beatString)" },
                { "block": "shuffleList(inputList)" },
                { "block": "shuffleString(inputString)" }
            ]
        },
        {
            "name": "Variables",
            "color": "blue",
            "blocks": [
                { "block": "a = 1", "wrapperContext": expressionContext },
                { "block": "a += 1", "wrapperContext": expressionContext },
                { "block": "a -= 1", "wrapperContext": expressionContext },
                { "block": "a *= 1", "wrapperContext": expressionContext },
                { "block": "a /= 1", "wrapperContext": expressionContext },
                { "block": "a %= 1", "wrapperContext": expressionContext}
            ]
        },
        {
            "name": "Logic",
            "color": "teal",
            "blocks": [
                { "block": "a == b", "wrapperContext": expressionContext },
                { "block": "a != b", "wrapperContext": expressionContext },
                { "block": "a > b", "wrapperContext": expressionContext },
                { "block": "a >= b", "wrapperContext": expressionContext },
                { "block": "a < b", "wrapperContext": expressionContext },
                { "block": "a <= b", "wrapperContext": expressionContext },
                { "block": "a or b", "wrapperContext": expressionContext },
                { "block": "a and b", "wrapperContext": expressionContext },
                { "block": "not a", "wrapperContext": expressionContext }
            ]
        },
        {
            "name": "Operators",
            "color": "green",
            "blocks": [
                { "block": "a + b", "wrapperContext": expressionContext },
                { "block": "a - b", "wrapperContext": expressionContext },
                { "block": "a * b", "wrapperContext": expressionContext },
                { "block": "a / b", "wrapperContext": expressionContext },
                { "block": "a % b", "wrapperContext": expressionContext }
            ]
        },
        {
            "name": "Control Flow",
            "color": "orange",
            "blocks": [
                { "block": "for i in range(0, 10):\n  print 'hello'" },
                { "block": "if a == b:\n  print 'hello'" },
                { "block": "if a == b:\n  print 'hello'\nelse:\n  print 'bye'" },
                { "block": "while a < b:\n  print 'hello'" },
                { "block": "def myMethod():\n  print 'hello'" },
                { "block": "def myMethod(arg):\n  print arg" },
                { "block": "myMethod()", "wrapperContext": expressionContext },
                { "block": "myMethod(arg)", "wrapperContext": expressionContext },
                { "block": "return 'hello'" }
            ]
        }
    ]
};

export const blockPaletteJavascript = {
    "mode": "javascript",
    "modeOptions": blockModeOptions,
    "palette": [
        {
            "name": "EarSketch",
            "color": "purple",
            "blocks": [
                { "block": "init();" },
                { "block": "setTempo(tempo);" },
                { "block": "fitMedia(fileName, trackNumber, startLocation, endLocation);" },
                { "block": "makeBeat(fileName, trackNumber, measure, string);" },
                { "block": "setEffect(trackNumber, effectType, effectParameter, effectValue);" },
                { "block": "setEffect(trackNumber, effectType, effectParameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation);" },
                { "block": "finish();" },
                { "block": "println('Hello World!');" },
                { "block": "selectRandomFile(folder);" },
                { "block": "insertMedia(fileName, trackNumber, trackLocation);" }
            ]
        },
        {
            "name": "Advanced",
            "color": "green",
            "blocks": [
                { "block": "analyze(audioFile, featureForAnalysis);" },
                { "block": "analyzeForTime(audioFile, featureForAnalysis, startTime, endTime);" },
                { "block": "analyzeTrack(trackNumber, featureForAnalysis);" },
                { "block": "analyzeTrackForTime(trackNumber, featureForAnalysis, startTime, endTime);" },
                { "block": "dur(fileName);" },
                { "block": "importImage(imageURL, nrows, ncols, includeRGB=False);" },
                { "block": "importFile(fileURL);" },
                { "block": "insertMediaSection (fileName, trackNumber, trackLocation, mediaStartLocation, mediaEndLocation);" },
                { "block": "makeBeatSlice(fileName, trackNumber, measure, string, beatNumber);" },
                { "block": "readInput(prompt);" },
                { "block": "replaceListElement(inputList, elementToReplace, withElement);" },
                { "block": "replaceString(string, characterToReplace, withCharacter);" },
                { "block": "reverseList(inputList);" },
                { "block": "reverseString(inputString);" },
                { "block": "rhythmEffects(trackNumber, effectType, effectParameter, effectList, measure, beatString);" },
                { "block": "shuffleList(inputList);" },
                { "block": "shuffleString(inputString);" }
            ]
        },
        {
            "name": "Variables",
            "color": "blue",
            "blocks": [
                { "block": "var a = 10;" },
                { "block": "a = 10;" },
                { "block": "a += 1;" },
                { "block": "a -= 10;" },
                { "block": "a *= 1;" },
                { "block": "a /= 1;" }
            ]
        },
        {
            "name": "Logic",
            "color": "teal",
            "blocks": [
                { "block": "a == b" },
                { "block": "a != b" },
                { "block": "a > b" },
                { "block": "a < b" },
                { "block": "a || b" },
                { "block": "a && b" },
                { "block": "!a" }
            ]
        },
        {
            "name": "Operators",
            "color": "green",
            "blocks": [
                { "block": "a + b" },
                { "block": "a - b" },
                { "block": "a * b" },
                { "block": "a / b" },
                { "block": "a % b" },
                { "block": "Math.pow(a, b)" },
                { "block": "Math.sin(a)" },
                { "block": "Math.tan(a)" },
                { "block": "Math.cos(a)" },
                { "block": "Math.random()" }
            ]
        },
        {
            "name": "Control Flow",
            "color": "orange",
            "blocks": [
                { "block": "for (var i = 0; i < 10; i++) {\n  __\n}" },
                { "block": "if (a == b) {\n  __\n}" },
                { "block": "if (a == b) {\n  __\n} else {\n  __\n}" },
                { "block": "while (a < b) {\n  __\n}" },
                { "block": "function myFunction () {\n  __\n}" },
                { "block": "function myFunction (param) {\n  __\n}" },
                { "block": "myFunction ();" },
                { "block": "myFunction (param);" },
                { "block": "return __;" }
            ]
        }
    ]
};
