export const COURSERA_SCRIPTS = {
    "5.3.1": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(112)\n" +
        "synth1 = TECHNO_SYNTHPLUCK_001\n" +
        "synth2 = TECHNO_SYNTHPLUCK_002\n" +
        "drums = TECHNO_LOOP_PART_006\n" +
        "fitMedia(synth1, 1, 1, 5)\n" +
        "fitMedia(synth2, 1, 5, 9)\n" +
        "fitMedia(drums, 2, 1, 9)\n" +
        "finish()\n",

    "5.4.1": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(96)\n" +
        "sound = TECHNO_LOOP_PART_002\n" +
        'beatString = "0-00-00-0+++0+0+"\n' +
        "makeBeat(sound, 1, 1, beatString)\n" +
        "finish()\n",

    "5.5.1": "from earsketch import *\n" +
        "from random import *\n" +
        "seed(0)\n" +
        "print randint(1, 10)\n" +
        "init()\n" +
        "setTempo(96)\n" +
        "sound = TECHNO_LOOP_PART_002\n" +
        'beatString = "0-00-00-0+++0+0+"\n' +
        "makeBeat(sound, 1, 1, beatString)\n" +
        "reversedBeatString = reverseString(beatString)\n" +
        "makeBeat(sound, 1, 2, reversedBeatString)\n" +
        'replacedBeatString = replaceString(beatString, "-", "+")\n' +
        "makeBeat(sound, 1, 4, replacedBeatString)\n" +
        "finish()\n",

    "5.5.2": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(96)\n" +
        "sound = TECHNO_LOOP_PART_002\n" +
        'beatString = "0-00-00-0+++0+0+"\n' +
        "makeBeat(sound, 1, 1, beatString)\n" +
        "reversedBeatString = reverseString(beatString)\n" +
        "makeBeat(sound, 1, 2, reversedBeatString)\n" +
        'replacedBeatString = replaceString(beatString, "-", "+")\n' +
        "makeBeat(sound, 1, 4, replacedBeatString)\n" +
        "beats = [HIPHOP_MUTED_GUITAR_001, HIPHOP_MUTED_GUITAR_002, HIPHOP_MUTED_GUITAR_003, HIPHOP_MUTED_GUITAR_004]\n" +
        'makeBeat(beats, 1, 5, "0-1-0+--2+2+3+++")\n' +
        "finish()\n",

    "5.5.3": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(96)\n" +
        "sound = TECHNO_LOOP_PART_002\n" +
        'beatString = "0-00-00-0+++0+0+"\n' +
        "makeBeat(sound, 1, 1, beatString)\n" +
        "reversedBeatString = reverseString(beatString)\n" +
        "makeBeat(sound, 1, 2, reversedBeatString)\n" +
        'replacedBeatString = replaceString(beatString, "-", "+")\n' +
        "makeBeat(sound, 1, 4, replacedBeatString)\n" +
        "print replacedBeatString\n" +
        "beats = [HIPHOP_MUTED_GUITAR_001, HIPHOP_MUTED_GUITAR_002, HIPHOP_MUTED_GUITAR_003, HIPHOP_MUTED_GUITAR_004]\n" +
        "for measure in range(5,9):\n" +
        '    makeBeat(beats, 1, measure, "0-1-0+--2+2+3+++")\n' +
        "finish()\n",

    "5.6.1": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "sound = HOUSE_DEEP_PIANO_001\n" +
        "fitMedia(sound, 1, 1, 5)\n" +
        "setEffect(1, DISTORTION)\n" +
        "finish()\n",

    "5.6.2": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "sound = HOUSE_DEEP_PIANO_001\n" +
        "fitMedia(sound, 1, 1, 5)\n" +
        "setEffect(1, DISTORTION, DISTO_GAIN, 10)\n" +
        "setEffect(1, PITCHSHIFT, PITCHSHIFT_SHIFT, -2)\n" +
        "finish()\n",

    "5.6.3": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "sound = HOUSE_DEEP_PIANO_001\n" +
        "fitMedia(sound, 1, 1, 5)\n" +
        "setEffect(1, DISTORTION, DISTO_GAIN, 0, 1, 20, 5)\n" +
        "setEffect(1, PITCHSHIFT, PITCHSHIFT_SHIFT, -2, 1, 0, 3)\n" +
        "setEffect(1, PITCHSHIFT, PITCHSHIFT_SHIFT, 0, 3, -6, 5)\n" +
        "finish()\n",

    "5.7.1": "# Module 4-7\n" +
        "# SetEffect with pitch shifter and sonified weather data\n" +
        "from earsketch import *\n" +
        "# 2 years of historical weather data from San Francisco\n" +
        "# daily high temperature (celsius)\n" +
        "weatherData = [13.3,9.4,9.4,10,7.2,8.9,13.3,12.2,10.6,10.6,9.4,14.4,15.6,13.9,12.2,11.7,12.2,12.2,12.2,15,15.6,13.3,12.2,13.9,16.1,17.8,13.3,13.9,17.8,17.2,16.7,16.7,15,13.9,17.2,18.3,16.1,13.9,13.9,14.4,13.9,15,13.9,15,16.1,14.4,12.2,15.6,16.7,15,12.8,13.9,13.3,12.8,12.2,11.1,11.7,16.1,15,15,16.7,16.7,16.7,20.6,22.8,21.7,17.8,17.2,16.7,18.3,20,19.4,18.9,17.8,17.8,17.8,17.8,15.6,17.8,16.7,18.9,15.6,15.6,16.1,15,13.3,15.6,16.7,17.2,17.2,15.6,18.3,17.8,16.7,15.6,18.3,20,18.9,17.8,16.7,17.2,18.9,16.1,17.2,16.7,16.7,17.8,16.7,21.7,20.6,18.3,16.7,16.7,18.3,19.4,18.3,20,25,20,22.8,26.7,16.7,15.6,18.3,20.6,17.2,17.8,20,30.6,23.3,13.9,17.8,20,20,20,20.6,20.6,25,24.4,21.7,20.6,25.6,20,20.6,23.9,19.4,20.6,21.7,24.4,20,22.2,22.8,20,18.9,17.8,17.8,18.3,20,21.7,25.6,18.9,20.6,23.9,22.2,22.8,21.1,29.4,33.9,30,23.9,18.3,18.9,20,25,34.4,34.4,24.4,20.6,18.9,25.6,25,25.6,18.9,22.8,26.1,23.3,21.1,22.2,22.2,22.8,22.8,21.1,22.8,22.8,20,20.6,22.2,26.1,21.7,18.9,20,21.7,21.7,21.7,26.1,23.9,24.4,24.4,21.7,20,28.3,35.6,37.2,27.8,22.8,24.4,20,19.4,18.3,21.1,21.1,20.6,20,22.8,18.9,21.7,22.2,26.1,27.2,23.3,20.6,20.6,27.2,27.8,23.3,26.7,28.9,31.7,34.4,28.3,23.3,22.8,25,25.6,21.7,20,19.4,19.4,18.9,27.8,22.8,18.9,18.9,18.3,20.6,23.9,19.4,19.4,19.4,19.4,19.4,22.8,22.2,20,18.9,22.2,24.4,29.4,26.1,28.3,21.7,21.1,21.1,17.8,16.7,15,16.7,18.9,17.8,23.9,25,20.6,20.6,21.1,21.7,20.6,21.1,20,18.3,19.4,20,24.4,22.8,19.4,23.3,25,27.2,29.4,30,28.3,25,27.2,22.8,19.4,23.9,25.6,22.8,22.8,25,23.3,21.7,19.4,17.2,17.2,15.6,16.1,17.8,18.3,20,16.7,16.1,17.8,19.4,17.8,12.8,16.1,13.3,13.9,14.4,16.7,14.4,13.9,15.6,15.6,15.6,19.4,18.9,16.1,14.4,13.9,15.6,15.6,16.7,17.2,14.4,12.8,14.4,13.3,11.7,10.6,10,12.2,13.9,10,7.8,7.8,13.9,11.1,9.4,8.9,13.9,13.3,14.4,15,11.7,13.3,14.4,11.7,10.6,13.3,15,11.7,11.1,12.2,15.6,13.9,17.2,16.7,13.3,15.6,18.3,19.4,17.8,18.9,13.3,15.6,15.6,14.4,13.3,12.2,12.2,15,12.8,16.1,15,13.3,14.4,12.2,13.9,15,12.2,11.7,13.3,14.4,13.9,13.3,13.3,13.9,13.3,15,11.7,17.8,12.2,10.6,8.9,12.8,12.8,13.9,14.4,16.1,12.2,12.2,15.6,20.6,20.6,21.1,18.9,18.3,13.9,20,21.7,16.7,15.6,15.6,17.8,23.9,23.9,22.2,17.2,14.4,17.8,16.1,15.6,15.6,15.6,11.1,13.9,13.9,13.9,17.8,19.4,17.8,17.8,16.1,18.9,22.8,16.1,16.1,21.7,17.2,17.2,16.1,13.9,15,18.9,23.9,22.2,16.1,21.7,21.1,17.2,19.4,20,17.2,16.7,17.2,16.7,12.8,14.4,15.6,16.1,17.2,20,13.3,15,14.4,17.2,17.2,17.8,17.8,15,18.9,16.7,17.2,17.8,16.1,17.2,17.2,16.1,17.2,17.2,16.1,19.4,15.6,17.2,16.7,19.4,21.7,18.3,19.4,15,19.4,18.3,21.7,28.9,20.6,21.7,19.4,17.8,21.7,18.9,18.3,20,24.4,31.1,34.4,21.7,17.8,18.9,20.6,17.8,17.2,19.4,23.3,21.7,19.4,19.4,21.7,20,20,19.4,26.7,21.1,20.6,17.8,18.3,19.4,19.4,21.7,22.2,22.2,21.7,18.9,19.4,18.9,22.8,18.9,18.9,18.9,21.1,21.1,19.4,19.4,21.7,22.2,20,21.1,21.7,21.1,21.1,27.2,22.2,18.3,17.2,22.8,20,20.6,18.3,18.9,21.1,18.3,24.4,30,22.2,20.6,22.2,20,23.9,25,27.8,28.3,28.3,28.3,26.1,21.7,20.6,22.2,20,25,20.6,20.6,22.8,19.4,20,22.8,23.9,22.2,22.8,19.4,18.9,21.7,27.2,22.2,20,20,22.2,21.1,20,18.9,22.2,21.7,21.7,30,30,22.2,19.4,20,21.1,20.6,20.6,25.6,23.9,22.2,19.4,19.4,22.8,22.8,23.3,21.1,21.7,21.7,20,20,21.1,25.6,28.3,26.7,18.3,19.4,17.2,18.3,16.7,17.8,20.6,19.4,18.3,16.1,19.4,21.1,23.3,21.7,18.9,15.6,20,17.8,18.3,16.7,20,22.8,17.2,14.4,14.4,15.6,13.9,13.3,15,15,13.3,12.2,13.3,13.9,14.4,13.9,12.2,13.3,12.2,11.1,12.8,12.2,13.9,13.9,13.9,13.3,12.8,10.6,10,11.1,12.8,15.6,15.6,13.9,15,10.6,11.1,13.3,12.2,12.2,12.2,8.9,12.8,12.2,10,12.2,11.1,11.1,10.6,13.9,10.6,10.6,11.1,10.6,10,11.7,13.3,12.2,12.2,11.7,10.6,10,8.3]\n" +
        "init()\n" +
        "setTempo(140)\n" +
        "sound = DUBSTEP_PAD_004\n" +
        "fitMedia(sound, 1, 1, 9) # for 8 measures\n" +
        "# first find the max and min temps in the data list so we can scale later\n" +
        "maxTemp = max(weatherData)\n" +
        "minTemp = min(weatherData)\n" +
        "# and figure out how far apart each data point should be written in time\n" +
        "stepSize = 8.0 / len(weatherData)\n" +
        "# now set the pitch shift amount based on weather data\n" +
        "for i in range(len(weatherData)):\n" +
        "    temperature = weatherData[i]\n" +
        "    pitchShiftAmount = 12 * (temperature - minTemp) / (maxTemp - minTemp)\n" +
        "    setEffect(1, PITCHSHIFT, PITCHSHIFT_SHIFT, pitchShiftAmount, 1+i*stepSize)\n" +
        "finish()\n",

    "5.8.1": "from earsketch import *\n" +
        "from random import *\n" +
        "seed(10)\n" +
        "init()\n" +
        "tempo = randint(60, 180)\n" +
        "setTempo(tempo)\n" +
        "stopMeasure = 8\n" +
        "for i in range(randint(50, 150)):\n" +
        "    sound = DUBSTEP_DRUMLOOP_MAIN_001\n" +
        "    track = randint(1, 16)\n" +
        "    start = random() * stopMeasure + 1\n" +
        "    end = start + random()\n" +
        "    fitMedia(sound, track, start, end)\n" +
        "finish()\n",

    "5.9.1": "from earsketch import *\n" +
        "from random import *\n" +
        "from math import *\n" +
        "seed(10)\n" +
        "init()\n" +
        "tempo = randint(60, 180)\n" +
        "setTempo(tempo)\n" +
        "stopMeasure = 16\n" +
        "for i in range(randint(50,150)):\n" +
        "    sound = DUBSTEP_DRUMLOOP_MAIN_002\n" +
        "    track = randint(1, 16)\n" +
        "    start = floor(random() * stopMeasure / 2) + 1\n" +
        "    end = start + randint(1, 8) / 4.0\n" +
        "    fitMedia(sound, track, start, end)\n" +
        "finish()\n",

    "5.10.1": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(140)\n" +
        "sound = DUBSTEP_DRUMLOOP_MAIN_003\n" +
        "position = 1\n" +
        "for i in range(1, 17):\n" +
        "    duration = 0.0625 * i\n" +
        "    fitMedia(sound, 1, position, position + duration)\n" +
        "    position = position + duration\n" +
        "for i in range(0, 16):\n" +
        "    duration = 0.0625 * (16 - i)\n" +
        "    fitMedia(sound, 1, position, position + duration)\n" +
        "    position = position + duration\n" +
        "referenceSound = DUBSTEP_DRUMLOOP_MAIN_001\n" +
        "fitMedia(referenceSound, 2, 1, 18)\n" +
        "finish()\n",

    "5.10.2": "from earsketch import *\n" +
        "init()\n" +
        "setTempo(220)\n" +
        "sound = ELECTRO_ANALOGUE_LEAD_010\n" +
        "def doTrack(track, duration, pan):\n" +
        "    position = 1\n" +
        "    for i in range(32):\n" +
        "      fitMedia(sound, track, position, position + duration)\n" +
        "      position = position + duration\n" +
        "    setEffect(track, PAN, LEFT_RIGHT, pan)\n" +
        "doTrack(1, 2, -100)\n" +
        "doTrack(2, 1.95, 100)\n" +
        "doTrack(3, 1.9, 0)\n" +
        "doTrack(4, 1.85, -50)\n" +
        "doTrack(5, 1.8, 50)\n" +
        "#finish section\n" +
        "finish()\n",

    "6.1.1": "# Module 6-1\n" +
        "from earsketch import *\n" +
        "# initialize Reaper\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "# set up my parameters for this run\n" +
        "sound1 = ELECTRO_DRUM_MAIN_BEAT_001\n" +
        "sound2 = ELECTRO_DRUM_MAIN_BEAT_002\n" +
        "analysisMethod = SPECTRAL_CENTROID\n" +
        "hop = 0.0625  # analyze in 1/16th note chunks\n" +
        "start = 1\n" +
        "end = 3\n" +
        "numChunks = 32\n" +
        "# insert audio on two tracks\n" +
        "fitMedia(sound1, 1, start, end)\n" +
        "fitMedia(sound2, 2, start, end)\n" +
        "# analyze each beat and set volume effect accordingly\n" +
        "for i in range(numChunks):\n" +
        "    position = 1 + i * hop\n" +
        "    feature1 = analyzeTrackForTime(1, analysisMethod, position, position + hop)\n" +
        "    feature2 = analyzeTrackForTime(2, analysisMethod, position, position + hop)\n" +
        "    if (feature1 > feature2):\n" +
        "        setEffect(1, VOLUME, GAIN, 0, position, 0, position + hop)\n" +
        "        setEffect(2, VOLUME, GAIN, -60, position, -60, position + hop)\n" +
        "    else:\n" +
        "        setEffect(1, VOLUME, GAIN, -60, position, -60, position + hop)\n" +
        "        setEffect(2, VOLUME, GAIN, 0, position, 0, position + hop)\n" +
        "\n" +
        "finish()\n",

    "6.1.2": "# Module 6-1\n" +
        "from earsketch import *\n" +
        "# initialize Reaper\n" +
        "init()\n" +
        "setTempo(120)\n" +
        "# set up my parameters for this run\n" +
        "sound1 = ELECTRO_DRUM_MAIN_BEAT_001\n" +
        "sound2 = ELECTRO_DRUM_MAIN_BEAT_002\n" +
        "analysisMethod = SPECTRAL_CENTROID\n" +
        "hop = 0.0625  # analyze in 1/16th note chunks\n" +
        "start = 1\n" +
        "end = 3\n" +
        "numChunks = 32\n" +
        "# insert audio on two tracks\n" +
        "fitMedia(sound1, 1, start, end)\n" +
        "fitMedia(sound2, 2, start, end)\n" +
        "# analyze each beat and set volume effect accordingly\n" +
        "for i in range(numChunks):\n" +
        "    position = 1 + i * hop\n" +
        "    feature1 = analyzeTrackForTime(1, analysisMethod, position, position + hop)\n" +
        "    feature2 = analyzeTrackForTime(2, analysisMethod, position, position + hop)\n" +
        "    if (feature1 < feature2):\n" +
        "        setEffect(1, VOLUME, GAIN, 0, position, 0, position + hop)\n" +
        "        setEffect(2, VOLUME, GAIN, -60, position, -60, position + hop)\n" +
        "    else:\n" +
        "        setEffect(1, VOLUME, GAIN, -60, position, -60, position + hop)\n" +
        "        setEffect(2, VOLUME, GAIN, 0, position, 0, position + hop)\n" +
        "\n" +
        "finish()\n",

}
