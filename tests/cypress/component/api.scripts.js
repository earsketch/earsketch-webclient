export const API_SCRIPTS = {
    "analyze.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "centroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID)\n" +
        "print round(centroidValue, 3);\n" +
        "finish() \n",

    "analyze.js": "init();\n" +
        "setTempo(120);\n" +
        "var centroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID);\n" +
        "println(Math.round(centroidValue * 1000) / 1000);\n" +
        "finish();\n",

    "analyzeForTime.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "centroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0)\n" +
        "print round(centroidValue, 3);\n" +
        "finish() \n",

    "analyzeForTime.js": "init();\n" +
        "setTempo(120);\n" +
        "var centroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0);\n" +
        "println(Math.round(centroidValue * 1000) / 1000);\n" +
        "finish();\n",

    "analyzeTrack.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 1, 1, 9)\n" +
        "centroidValue = analyzeTrack(1, SPECTRAL_CENTROID)\n" +
        "print round(centroidValue, 3);\n" +
        "finish() \n",

    "analyzeTrack.js": "init();\n" +
        "setTempo(120);\n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 1, 1, 9);\n" +
        "var centroidValue = analyzeTrack(1, SPECTRAL_CENTROID);\n" +
        "println(Math.round(centroidValue * 1000) / 1000);\n" +
        "finish();\n",

    "analyzeTrackForTime.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 1, 1, 9)\n" +
        "centroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0)\n" +
        "print(round(centroidValue, 3))\n" +
        "finish() \n",

    "analyzeTrackForTime.js": "init();\n" +
        "setTempo(120);\n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 1, 1, 9);\n" +
        "var centroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0);\n" +
        "println(Math.round(centroidValue * 1000) / 1000);\n" +
        "finish();\n",

    "dur.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "print dur(HOUSE_BREAKBEAT_001)\n" +
        "finish() \n",

    "dur.js": "init();\n" +
        "setTempo(120);\n" +
        "println(dur(HOUSE_BREAKBEAT_001));\n" +
        "finish();\n",

    "fitMedia.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9)\n" +
        "finish() \n",

    "fitMedia.js": "init();\n" +
        "setTempo(120);\n" +
        "fitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9);\n" +
        "finish();\n",

    "importImage1.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        'pixelData = importImage("https://upload.wikimedia.org/wikipedia/commons/3/34/Human_Ear_(sketch).jpg", 10, 10);\n' +
        "print pixelData;\n" +
        "finish() \n",

    "importImage1.js": "init();\n" +
        "setTempo(120);\n" +
        'var pixelData = importImage("https://upload.wikimedia.org/wikipedia/commons/3/34/Human_Ear_(sketch).jpg", 10, 10);\n' +
        "println(pixelData);\n" +
        "finish();\n",

    "importImage2.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        'pixelData = importImage("https://upload.wikimedia.org/wikipedia/commons/3/34/Human_Ear_(sketch).jpg", 10, 10, True)\n' +
        "print pixelData;\n" +
        "finish() \n",

    "importImage2.js": "init();\n" +
        "setTempo(120);\n" +
        'var pixelData = importImage("https://upload.wikimedia.org/wikipedia/commons/3/34/Human_Ear_(sketch).jpg", 10, 10, true);\n' +
        "println(pixelData);\n" +
        "finish();\n",

    "importFile.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        'fileData = importFile("https://raw.githubusercontent.com/jquery/jquery/master/LICENSE.txt")\n' +
        "print fileData\n" +
        "finish() \n",

    "importFile.js": "init();\n" +
        "setTempo(120);\n" +
        'var fileData = importFile("https://raw.githubusercontent.com/jquery/jquery/master/LICENSE.txt")\n' +
        "println(fileData);\n" +
        "finish();\n",

    "insertMedia1.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "insertMedia(HOUSE_BREAKBEAT_003, 1, 1.0)\n" +
        "finish() \n",

    "insertMedia1.js": "init();\n" +
        "setTempo(120);\n" +
        "insertMedia(HOUSE_BREAKBEAT_003, 1, 1.0);\n" +
        "finish();\n",

    "insertMedia2.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "insertMedia(HOUSE_BREAKBEAT_003, 1, 2)\n" +
        "finish() \n",

    "insertMedia2.js": "init();\n" +
        "setTempo(120);\n" +
        "insertMedia(HOUSE_BREAKBEAT_003, 1, 2);\n" +
        "finish();\n",

    "insertMediaSection.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5)\n" +
        "finish() \n",

    "insertMediaSection.js": "init();\n" +
        "setTempo(120);\n" +
        "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5);\n" +
        "finish();\n",

    "insertMediaSectionMiddle.py": "from earsketch import * \n" +
      "init() \n" +
      "setTempo(120) \n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.5, 2)\n" +
      "finish() \n",

    "insertMediaSectionMiddle.js": "init();\n" +
      "setTempo(120);\n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.5, 2);\n" +
      "finish();\n",

    "insertMediaSectionTimeStretch.py": "from earsketch import * \n" +
      "init() \n" +
      "setTempo(121) \n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5)\n" +
      "finish() \n",

    "insertMediaSectionTimeStretch.js": "init();\n" +
      "setTempo(121);\n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5);\n" +
      "finish();\n",

    "insertMediaSectionTimeStretchMiddle.py": "from earsketch import * \n" +
      "init() \n" +
      "setTempo(121) \n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.5, 2)\n" +
      "finish() \n",

    "insertMediaSectionTimeStretchMiddle.js": "init();\n" +
      "setTempo(121);\n" +
      "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.5, 2);\n" +
      "finish();\n",

    "makeBeatSlice.py": "from earsketch import * \n" +
        "init() \n" +
        "setTempo(120) \n" +
        'beatString1 = "0123"\n' +
        "makeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875])\n" +
        "finish() \n",

    "makeBeatSlice.js": "init();\n" +
        "setTempo(120);\n" +
        'var beatString1 = "0123";\n' +
        "makeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875]);\n" +
        "finish();\n",

    "createAudioSlice.py": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "audioSlice = createAudioSlice(DUBSTEP_BASS_WOBBLE_001, 1, 2)\n" +
        "fitMedia(audioSlice, 1, 1, 3)\n" +
        "finish()\n",

    "createAudioSlice.js": "init();\n" +
        "setTempo(120);\n" +
        "var audioSlice = createAudioSlice(DUBSTEP_BASS_WOBBLE_001, 1, 2);\n" +
        "fitMedia(audioSlice, 1, 1, 3);\n" +
        "finish();",

    "createAudioStretch.py": `from earsketch import *
setTempo(65, 1, 178, 9)

sound1 = RD_ROCK_POPRHYTHM_MAINDRUMS_4
sound2 = RBIRD_VOX_CLOSER_TO_YOUR_VISION

# tempo
fitMedia(sound1, 1, 1, 9.5)

# tempo, stretched
halftime_beat = createAudioStretch(sound1, 2)
fitMedia(halftime_beat, 2, 1, 9.5)

# tempo, sliced
sliced_beat = createAudioSlice(sound1, 1.5, 2)
fitMedia(sliced_beat, 3, 1, 9.25)

# tempo, negative stretch
rev_stretched_beat = createAudioStretch(sound1, -1.5)
fitMedia(rev_stretched_beat, 4, 1, 9.5)

# tempoless one-shot
fitMedia(sound2, 5, 1, 9.5)

# tempoless one-shot, stretched
stretched_voice = createAudioStretch(sound2, 1/3.0)
fitMedia(stretched_voice, 6, 1, 9.5)

# tempoless one-shot, sliced
sliced_voice = createAudioSlice(sound2, 1.2, 1.6)
fitMedia(sliced_voice, 7, 1, 9.5)

# tempoless one-shot, negative stretch
rev_stretched_voice = createAudioStretch(sound2, -2)
fitMedia(rev_stretched_voice, 8, 1, 9.5)
`,

    "createAudioStretch.js": `
setTempo(65, 1, 178, 9)

var sound1 = RD_ROCK_POPRHYTHM_MAINDRUMS_4
var sound2 = RBIRD_VOX_CLOSER_TO_YOUR_VISION

// tempo
fitMedia(sound1, 1, 1, 9.5)

// tempo, stretched
var halftime_beat = createAudioStretch(sound1, 2)
fitMedia(halftime_beat, 2, 1, 9.5)

// tempo, sliced
var sliced_beat = createAudioSlice(sound1, 1.5, 2)
fitMedia(sliced_beat, 3, 1, 9.25)

// tempo, negative stretch
var rev_stretched_beat = createAudioStretch(sound1, -1.5)
fitMedia(rev_stretched_beat, 4, 1, 9.5)

// tempoless one-shot
fitMedia(sound2, 5, 1, 9.5)

// tempoless one-shot, stretched
var stretched_redbird = createAudioStretch(sound2, 1/3.0)
fitMedia(stretched_redbird, 6, 1, 9.5)

// tempoless one-shot, sliced
var sliced_redbird = createAudioSlice(sound2, 1.2, 1.6)
fitMedia(sliced_redbird, 7, 1, 9.5)

// tempoless one-shot, negative stretch
var rev_stretched_voice = createAudioStretch(sound2, -2)
fitMedia(rev_stretched_voice, 8, 1, 9.5)
`,

    "rhythmEffects.py": `from earsketch import *
setTempo(120)
beats = [
    "01010101",  # 'steps'
    "00001111",  # 'repeated values'
    "0+1+0+1+",  # 'sustains'
    "0+++1+++",  # 'multiple sustains'
    "0-1-0-1-0",  # 'ramps'
    "0---1---0",  # 'multiple ramps'
    "0+--1++-0",  # 'sustain to ramp'
    #  "+++1",  # 'sustain from nowhere' (prints warning)
    #  "---1",  # 'ramp from nowhere' (prints warning)
]
for (i, beat) in enumerate(beats):
    start = i*2 + 1
    fitMedia(DUBSTEP_BASS_WOBBLE_015, i+1, start, start+2)
    rhythmEffects(i+1, PITCHSHIFT, PITCHSHIFT_SHIFT, [-12, 12], start, beat, 8)`,

    "rhythmEffects.js": `
setTempo(120)
var beats = [
    "01010101", // 'steps'
    "00001111", // 'repeated values'
    "0+1+0+1+", // 'sustains'
    "0+++1+++", // 'multiple sustains'
    "0-1-0-1-0", // 'ramps'
    "0---1---0", // 'multiple ramps'
    "0+--1++-0", // 'sustain to ramp'
    // "+++1", // warning 'sustain from nowhere'
    // "---1", // warning 'ramp from nowhere'
]
for (var i = 0; i < beats.length; i++) {
    var start = i*2 + 1
    fitMedia(DUBSTEP_BASS_WOBBLE_015, i+1, start, start+2)
    rhythmEffects(i+1, PITCHSHIFT, PITCHSHIFT_SHIFT, [-12, 12], start, beats[i], 8)
}`,

    "fitMediaReturnsNone.py": `from earsketch import *
x = fitMedia(DUBSTEP_BASS_WOBBLE_001, 1, 1, 3)
print(x)`,

    "selectRandomFileReturnsNone.py": `from earsketch import *
print(selectRandomFile("NO_FOLDER_NAME_CONTAINS_THIS_SUBSTRING"))`,
}
