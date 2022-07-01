export const CURRICULUM_SCRIPTS = {
    "Intro Script.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(TECHNO_SYNTHPLUCK_001, 1, 1, 9)\n" +
    "finish()",

    "Intro Script.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(TECHNO_SYNTHPLUCK_001, 1, 1, 9);\n" +
    "finish();\n",

    "Earsketch Demo.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(Y18_DRUM_SAMPLES_2, 1, 1, 5)\n" +
    "finish()\n",

    "Earsketch Demo.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(Y18_DRUM_SAMPLES_2, 1, 1, 5);\n" +
    "finish();\n",

    "Opus 1.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    "fitMedia(Y01_DRUMS_1, 1, 1, 9)\n" +
    "fitMedia(Y11_BASS_1, 2, 1, 9)\n" +
    "fitMedia(Y11_GUITAR_1, 3, 1, 9)\n" +
    "finish()\n",

    "Opus 1.js": "init();\n" +
    "setTempo(100);\n" +
    "fitMedia(Y01_DRUMS_1, 1, 1, 9);\n" +
    "fitMedia(Y11_BASS_1, 2, 1, 9);\n" +
    "fitMedia(Y11_GUITAR_1, 3, 1, 9);\n" +
    "finish();\n",

    "Beats.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(TECHNO_LOOP_PART_002, 1, 1, 2)\n" +
    "finish()\n",

    "Beats.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(TECHNO_LOOP_PART_002, 1, 1, 2);\n" +
    "finish();\n",

    "variables.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    'synth1 = HIPHOP_SYNTHPLUCKLEAD_005 # Assigns a clip to the variable "synth1"\n' +
    'fitMedia(synth1, 1, 1, 2) # fitMedia adds the clip "synth1" is holding to the DAW\n' +
    "finish()\n",

    "variables.js": "init();\n" +
    "setTempo(100);\n" +
    'var synth1 = HIPHOP_SYNTHPLUCKLEAD_005; // Assigns a clip to the variable "synth1"\n' +
    'fitMedia(synth1, 1, 1, 2); // fitMedia adds the clip "synth1" is holding to the DAW\n' +
    "finish()\n",

    "Fixed Error.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(88)\n" +
    "electroString = Y13_STRING_1\n" +
    "drums = HIPHOP_DUSTYGROOVE_017\n" +
    "fitMedia(electroString, 1, 1, 9)\n" +
    "fitMedia(drums, 2, 5, 9)\n" +
    "finish()\n",

    "Fixed Error.js": "init();\n" +
    "setTempo(88);\n" +
    "var electroString = Y13_STRING_1;\n" +
    "var drums = HIPHOP_DUSTYGROOVE_017;\n" +
    "fitMedia(electroString, 1, 1, 9);\n" +
    "fitMedia(drums, 2, 5, 9);\n" +
    "finish();\n",

    "Delay Effect.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "lead1 = EIGHT_BIT_ATARI_SYNTH_001\n" +
    "lead2 = EIGHT_BIT_ATARI_SYNTH_002\n" +
    "pad1 = EIGHT_BIT_ATARI_PAD_002\n" +
    "pad2 = EIGHT_BIT_ATARI_PAD_003\n" +
    "drums1 = EIGHT_BIT_ANALOG_DRUM_LOOP_004\n" +
    "drums2 = EIGHT_BIT_ANALOG_DRUM_LOOP_003\n" +
    "fitMedia(lead1, 1, 1, 7)\n" +
    "fitMedia(lead2, 1, 7, 9)\n" +
    "fitMedia(pad1, 2, 1, 3)\n" +
    "fitMedia(pad2, 2, 3, 5)\n" +
    "fitMedia(pad1, 2, 5, 7)\n" +
    "fitMedia(pad2, 2, 7, 9)\n" +
    "fitMedia(drums1, 3, 3, 5)\n" +
    "fitMedia(drums2, 3, 5, 9)\n" +
    "finish()\n",

    "Delay Effect.js": "init()\n" +
    "setTempo(120)\n" +
    "var lead1 = EIGHT_BIT_ATARI_SYNTH_001;\n" +
    "var lead2 = EIGHT_BIT_ATARI_SYNTH_002;\n" +
    "var pad1 = EIGHT_BIT_ATARI_PAD_002;\n" +
    "var pad2 = EIGHT_BIT_ATARI_PAD_003;\n" +
    "var drums1 = EIGHT_BIT_ANALOG_DRUM_LOOP_004;\n" +
    "var drums2 = EIGHT_BIT_ANALOG_DRUM_LOOP_003;\n" +
    "fitMedia(lead1, 1, 1, 7);\n" +
    "fitMedia(lead2, 1, 7, 9);\n" +
    "fitMedia(pad1, 2, 1, 3);\n" +
    "fitMedia(pad2, 2, 3, 5);\n" +
    "fitMedia(pad1, 2, 5, 7);\n" +
    "fitMedia(pad2, 2, 7, 9);\n" +
    "fitMedia(drums1, 3, 3, 5);\n" +
    "fitMedia(drums2, 3, 5, 9);\n" +
    "finish()\n",

    "Envelopes.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9)\n" +
    "setEffect(1, VOLUME, GAIN, -60, 1, 0, 3) # Makes an effect ramp between measures 1 and 3, moving from -60dB to 0dB\n" +
    "finish()\n",

    "Envelopes.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9);\n" +
    "setEffect(1, VOLUME, GAIN, -60, 1, 0, 3);  // Makes an effect ramp between measures 1 and 3, moving from -60dB to 0dB\n" +
    "finish();\n",

    "Complex Envelopes.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9)\n" +
    "pointA = 1\n" +
    "pointB = 4\n" +
    "pointC = 6.5\n" +
    "pointD = 7\n" +
    "pointE = 8.5\n" +
    "pointF = 9\n" +
    "setEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB) # first effect, filter sweep\n" +
    "setEffect(1, VOLUME, GAIN, -10, pointB, 0, pointC)  # crescendo\n" +
    "setEffect(1, VOLUME, GAIN, 0, pointD, -10, pointE)  # begin fade out\n" +
    "setEffect(1, VOLUME, GAIN, -10, pointE, -60, pointF) # end of fade out\n" +
    "finish()\n",

    "Complex Envelopes.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9);\n" +
    "var pointA = 1;\n" +
    "var pointB = 4;\n" +
    "var pointC = 6.5;\n" +
    "var pointD = 7;\n" +
    "var pointE = 8.5;\n" +
    "var pointF = 9;\n" +
    "setEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB); // first effect, filter sweep\n" +
    "setEffect(1, VOLUME, GAIN, -10, pointB, 0, pointC);  // crescendo\n" +
    "setEffect(1, VOLUME, GAIN, 0, pointD, -10, pointE);  // begin fade out\n" +
    "setEffect(1, VOLUME, GAIN, -10, pointE, -60, pointF); // end of fade out\n" +
    "finish();\n",

    "Transition Techniques - Drum Fill.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(130)\n" +
    "leadGuitar1 = RD_ROCK_POPLEADSTRUM_GUITAR_4\n" +
    "leadGuitar2 = RD_ROCK_POPLEADSTRUM_GUITAR_9\n" +
    "bass1 = RD_ROCK_POPELECTRICBASS_8\n" +
    "bass2 = RD_ROCK_POPELECTRICBASS_25\n" +
    "drums1 = RD_ROCK_POPRHYTHM_DRUM_PART_10\n" +
    "drums2 = RD_ROCK_POPRHYTHM_MAINDRUMS_1\n" +
    "drumFill = RD_ROCK_POPRHYTHM_FILL_4\n" +
    "fitMedia(leadGuitar1, 1, 1, 8)\n" +
    "fitMedia(bass1, 2, 1, 8)\n" +
    "fitMedia(drums1, 3, 1, 8)\n" +
    "fitMedia(drumFill, 3, 8, 9)\n" +
    "fitMedia(leadGuitar2, 1, 9, 17)\n" +
    "fitMedia(bass2, 2, 9, 17)\n" +
    "fitMedia(drums2, 3, 9, 17)\n" +
    "finish()\n",

    "Transition Techniques - Drum Fill.js": "init();\n" +
    "setTempo(130);\n" +
    "var leadGuitar1 = RD_ROCK_POPLEADSTRUM_GUITAR_4;\n" +
    "var leadGuitar2 = RD_ROCK_POPLEADSTRUM_GUITAR_9;\n" +
    "var bass1 = RD_ROCK_POPELECTRICBASS_8;\n" +
    "var bass2 = RD_ROCK_POPELECTRICBASS_25;\n" +
    "var drums1 = RD_ROCK_POPRHYTHM_DRUM_PART_10;\n" +
    "var drums2 = RD_ROCK_POPRHYTHM_MAINDRUMS_1;\n" +
    "var drumFill = RD_ROCK_POPRHYTHM_FILL_4;\n" +
    "fitMedia(leadGuitar1, 1, 1, 8);\n" +
    "fitMedia(bass1, 2, 1, 8);\n" +
    "fitMedia(drums1, 3, 1, 8);\n" +
    "fitMedia(drumFill, 3, 8, 9);\n" +
    "fitMedia(leadGuitar2, 1, 9, 17);\n" +
    "fitMedia(bass2, 2, 9, 17);\n" +
    "fitMedia(drums2, 3, 9, 17);\n" +
    "finish();\n",

    "Transition Techniques - Track Dropouts.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "introLead = TECHNO_ACIDBASS_002\n" +
    "mainLead1 = TECHNO_ACIDBASS_003\n" +
    "mainLead2 = TECHNO_ACIDBASS_005\n" +
    "auxDrums1 = TECHNO_LOOP_PART_025\n" +
    "auxDrums2 = TECHNO_LOOP_PART_030\n" +
    "mainDrums = TECHNO_MAINLOOP_019\n" +
    "bass = TECHNO_SUBBASS_002\n" +
    "fitMedia(introLead, 1, 1, 5)\n" +
    "fitMedia(mainLead1, 1, 5, 9)\n" +
    "fitMedia(auxDrums1, 2, 3, 5)\n" +
    "fitMedia(auxDrums2, 2, 5, 8) # Drums drop out\n" +
    "fitMedia(mainDrums, 3, 5, 8)\n" +
    "fitMedia(mainLead2, 1, 9, 17)\n" +
    "fitMedia(auxDrums2, 2, 9, 17) # Drums enter back in\n" +
    "fitMedia(mainDrums, 3, 9, 17)\n" +
    "fitMedia(bass, 4, 9, 17)\n" +
    "finish()\n",

    "Transition Techniques - Track Dropouts.js": "init();\n" +
    "setTempo(120);\n" +
    "var introLead = TECHNO_ACIDBASS_002;\n" +
    "var mainLead1 = TECHNO_ACIDBASS_003;\n" +
    "var mainLead2 = TECHNO_ACIDBASS_005;\n" +
    "var auxDrums1 = TECHNO_LOOP_PART_025;\n" +
    "var auxDrums2 = TECHNO_LOOP_PART_030;\n" +
    "var mainDrums = TECHNO_MAINLOOP_019;\n" +
    "var bass = TECHNO_SUBBASS_002;\n" +
    "fitMedia(introLead, 1, 1, 5);\n" +
    "fitMedia(mainLead1, 1, 5, 9);\n" +
    "fitMedia(auxDrums1, 2, 3, 5);\n" +
    "fitMedia(auxDrums2, 2, 5, 8); // Drums drop out\n" +
    "fitMedia(mainDrums, 3, 5, 8);\n" +
    "fitMedia(mainLead2, 1, 9, 17);\n" +
    "fitMedia(auxDrums2, 2, 9, 17); // Drums enter back in\n" +
    "fitMedia(mainDrums, 3, 9, 17);\n" +
    "fitMedia(bass, 4, 9, 17);\n" +
    "finish();\n",

    "Transition Techniques - Risers.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(128)\n" +
    "synthRise = YG_EDM_SYNTH_RISE_1\n" +
    "airRise = RD_EDM_SFX_RISER_AIR_1\n" +
    "lead1 = YG_EDM_LEAD_1\n" +
    "lead2 = YG_EDM_LEAD_2\n" +
    "kick1 = YG_EDM_KICK_LIGHT_1\n" +
    "kick2 = ELECTRO_DRUM_MAIN_LOOPPART_001\n" +
    "snare = ELECTRO_DRUM_MAIN_LOOPPART_003\n" +
    "crash = Y50_CRASH_2\n" +
    "reverseFX = YG_EDM_REVERSE_FX_1\n" +
    "fitMedia(lead1, 1, 1, 17)\n" +
    "fitMedia(kick1, 2, 9, 17)\n" +
    "fitMedia(reverseFX, 3, 16, 17)\n" +
    "fitMedia(synthRise, 4, 13, 17)\n" +
    "fitMedia(airRise, 5, 13, 17)\n" +
    "fitMedia(crash, 6, 17, 19)\n" +
    "fitMedia(lead2, 1, 17, 33)\n" +
    "fitMedia(kick2, 7, 25, 33)\n" +
    "fitMedia(snare, 8, 29, 33)\n" +
    "setEffect(1, VOLUME, GAIN, 0, 16, 1, 17) #Adjusting volumes for better matching\n" +
    "setEffect(4, VOLUME, GAIN, -10)\n" +
    "setEffect(7, VOLUME, GAIN, -20)\n" +
    "setEffect(8, VOLUME, GAIN, -20)\n" +
    "finish()\n",

    "Transition Techniques - Risers.js": "init();\n" +
    "setTempo(128);\n" +
    "var synthRise = YG_EDM_SYNTH_RISE_1;\n" +
    "var airRise = RD_EDM_SFX_RISER_AIR_1;\n" +
    "var lead1 = YG_EDM_LEAD_1;\n" +
    "var lead2 = YG_EDM_LEAD_2;\n" +
    "var kick1 = YG_EDM_KICK_LIGHT_1;\n" +
    "var kick2 = ELECTRO_DRUM_MAIN_LOOPPART_001;\n" +
    "var snare = ELECTRO_DRUM_MAIN_LOOPPART_003;\n" +
    "var crash = Y50_CRASH_2;\n" +
    "var reverseFX = YG_EDM_REVERSE_FX_1;\n" +
    "fitMedia(lead1, 1, 1, 17);\n" +
    "fitMedia(kick1, 2, 9, 17);\n" +
    "fitMedia(reverseFX, 3, 16, 17);\n" +
    "fitMedia(synthRise, 4, 13, 17);\n" +
    "fitMedia(airRise, 5, 13, 17);\n" +
    "fitMedia(crash, 6, 17, 19);\n" +
    "fitMedia(lead2, 1, 17, 33);\n" +
    "fitMedia(kick2, 7, 25, 33);\n" +
    "fitMedia(snare, 8, 29, 33);\n" +
    "setEffect(1, VOLUME, GAIN, 0, 16, 1, 17); //Adjusting volumes for better matching\n" +
    "setEffect(4, VOLUME, GAIN, -10);\n" +
    "setEffect(7, VOLUME, GAIN, -20);\n" +
    "setEffect(8, VOLUME, GAIN, -20);\n" +
    "finish();\n",

    "Drum beat (no loops).py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "drum = ELECTRO_DRUM_MAIN_BEAT_008\n" +
    "drum2 = ELECTRO_DRUM_MAIN_BEAT_007\n" +
    "fitMedia(drum, 1, 1, 1.5)\n" +
    "fitMedia(drum2, 1, 1.5, 2)\n" +
    "fitMedia(drum, 1, 2, 2.5)\n" +
    "fitMedia(drum2, 1, 2.5, 3)\n" +
    "fitMedia(drum, 1, 3, 3.5)\n" +
    "fitMedia(drum2, 1, 3.5, 4)\n" +
    "fitMedia(drum, 1, 4, 4.5)\n" +
    "fitMedia(drum2, 1, 4.5, 5)\n" +
    "fitMedia(drum, 1, 5, 5.5)\n" +
    "fitMedia(drum2, 1, 5.5, 6)\n" +
    "fitMedia(drum, 1, 6, 6.5)\n" +
    "fitMedia(drum2, 1, 6.5, 7)\n" +
    "fitMedia(drum, 1, 7, 7.5)\n" +
    "fitMedia(drum2, 1, 7.5, 8)\n" +
    "fitMedia(drum, 1, 8, 8.5)\n" +
    "fitMedia(drum2, 1, 8.5, 9)\n" +
    "finish()\n",

    "Drum beat (no loops).js": "init();\n" +
    "setTempo(120);\n" +
    "var drum = ELECTRO_DRUM_MAIN_BEAT_008;\n" +
    "var drum2 = ELECTRO_DRUM_MAIN_BEAT_007;\n" +
    "fitMedia(drum, 1, 1, 1.5);\n" +
    "fitMedia(drum2, 1, 1.5, 2);\n" +
    "fitMedia(drum, 1, 2, 2.5);\n" +
    "fitMedia(drum2, 1, 2.5, 3);\n" +
    "fitMedia(drum, 1, 3, 3.5);\n" +
    "fitMedia(drum2, 1, 3.5, 4);\n" +
    "fitMedia(drum, 1, 4, 4.5);\n" +
    "fitMedia(drum2, 1, 4.5, 5);\n" +
    "fitMedia(drum, 1, 5, 5.5);\n" +
    "fitMedia(drum2, 1, 5.5, 6);\n" +
    "fitMedia(drum, 1, 6, 6.5);\n" +
    "fitMedia(drum2, 1, 6.5, 7);\n" +
    "fitMedia(drum, 1, 7, 7.5);\n" +
    "fitMedia(drum2, 1, 7.5, 8);\n" +
    "fitMedia(drum, 1, 8, 8.5);\n" +
    "fitMedia(drum2, 1, 8.5, 9);\n" +
    "finish();\n",

    "Drum beat (with loops).py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "drum = ELECTRO_DRUM_MAIN_BEAT_008\n" +
    "drum2 = ELECTRO_DRUM_MAIN_BEAT_007\n" +
    "for measure in range (1, 9):\n" +
    "  fitMedia(drum, 1, measure, measure + 0.5)\n" +
    "  fitMedia(drum2, 1, measure + 0.5 , measure + 1)\n" +
    "finish()\n",

    "Drum beat (with loops).js": "init();\n" +
    "setTempo(120);\n" +
    "var drum = ELECTRO_DRUM_MAIN_BEAT_008;\n" +
    "var drum2 = ELECTRO_DRUM_MAIN_BEAT_007;\n" +
    "for (var measure = 1; measure < 9; measure = measure + 1) {\n" +
    "  fitMedia(drum, 1, measure, measure + 0.5);\n" +
    "  fitMedia(drum2, 1, measure + 0.5 , measure + 1);\n" +
    "}\n" +
    "finish();\n",

    "Panning Loop.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(130)\n" +
    "drums1 = ELECTRO_DRUM_MAIN_BEAT_005\n" +
    "drums2 = ELECTRO_DRUM_MAIN_BEAT_006\n" +
    "synth = Y02_KEYS_1\n" +
    "guitar = Y09_WAH_GUITAR_1\n" +
    "for measure in range(1, 9):\n" +
    "  fitMedia(drums1, 1, measure, measure + 0.5)\n" +
    "  fitMedia(drums2, 2, measure + 0.5 , measure + 1)\n" +
    "fitMedia(guitar, 3, 1, 9)\n" +
    "fitMedia(synth, 4, 5, 9)\n" +
    "for track in range(1, 5):\n" +
    "  panAmount = 200 * (track - 1) / 3.0 - 100\n" +
    "  setEffect(track, PAN, LEFT_RIGHT, panAmount)\n" +
    "finish()\n",

    "Panning Loop.js": "init();\n" +
    "setTempo(130);\n" +
    "var drums1 = ELECTRO_DRUM_MAIN_BEAT_005;\n" +
    "var drums2 = ELECTRO_DRUM_MAIN_BEAT_006;\n" +
    "var synth = Y02_KEYS_1;\n" +
    "var guitar = Y09_WAH_GUITAR_1;\n" +
    "for (var measure = 1; measure < 9; measure++) {\n" +
    "    fitMedia(drums1, 1, measure, measure + 0.5);\n" +
    "    fitMedia(drums2, 2, measure + 0.5 , measure + 1);\n" +
    "}\n" +
    "fitMedia(guitar, 3, 1, 9);\n" +
    "fitMedia(synth, 4, 5, 9);\n" +
    "for (var track = 1; track < 5; track++) {\n" +
    "    panAmount = 200 * (track - 1) / 3 - 100;\n" +
    "    setEffect(track, PAN, LEFT_RIGHT, panAmount);\n" +
    "}\n" +
    "finish();\n",

    "Rhythmic Ramps.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(Y33_CHOIR_1, 1, 1, 17)\n" +
    "fitMedia(RD_ELECTRO_MAINBEAT_5, 2, 1, 17)\n" +
    "for measure in range(1, 17):\n" +
    "  setEffect(1, VOLUME, GAIN, -60, measure, 0, measure+1)\n" +
    "finish()\n",

    "Rhythmic Ramps.js": "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(Y33_CHOIR_1, 1, 1, 17)\n" +
    "fitMedia(RD_ELECTRO_MAINBEAT_5, 2, 1, 17)\n" +
    "for (var measure = 1; measure < 17; measure++) {\n" +
    "  setEffect(1, VOLUME, GAIN, -60, measure, 0, measure+1)\n" +
    "}\n" +
    "finish()\n",

    "A-B-A Form.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 1, 5) # main\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5) # drums\n" +
    "for measure in range(1, 5):\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1) # bassline, repeatedly fitting first measure of clip\n" +
    "for measure in range(1, 6, 2):\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1) # backing\n" +
    "setEffect(4, DELAY, DELAY_TIME, 500) # delay on track 4\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_3, 1, 5, 9) # sparse drums\n" +
    "fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 3, 5, 9) # rattling\n" +
    "fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 9, 13) # main\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 9, 13) # drums\n" +
    "for measure in range(9, 13):\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1) # bassline, repeatedly fitting first measure of clip\n" +
    "for measure in range(9, 13, 2):\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1) # backing\n" +
    "setEffect(4, DELAY, DELAY_TIME, 500) # delay on track 4\n" +
    "finish()\n",

    "A-B-A Form.js": "init();\n" +
    "setTempo(120);\n" +
    "fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 1, 5); // main\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5); // drums\n" +
    "for (var measure = 1; measure < 5; measure++){\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1); // bassline, repeatedly fitting first measure of clip\n" +
    "}\n" +
    "for (var measure = 1; measure < 6; measure += 2){\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1); // backing\n" +
    "}\n" +
    "setEffect(4, DELAY, DELAY_TIME, 500); // delay on track 4\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_3, 1, 5, 9); // sparse drums\n" +
    "fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 3, 5, 9); // rattling\n" +
    "fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 9, 13); // main\n" +
    "fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 9, 13); // drums\n" +
    "for (var measure = 9; measure < 13; measure++){\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1); // bassline, repeatedly fitting first measure of clip\n" +
    "}\n" +
    "for (var measure = 9; measure < 13; measure += 2){\n" +
    "    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1); // backing\n" +
    "}\n" +
    "setEffect(4, DELAY, DELAY_TIME, 500); // delay on track 4\n" +
    "finish();\n",

    "Custom Functions.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    "def myFunction(startMeasure, endMeasure):\n" +
    " fitMedia(ELECTRO_DRUM_MAIN_BEAT_003, 1, startMeasure, endMeasure)\n" +
    " fitMedia(ELECTRO_ANALOGUE_PHASERBASS_003, 2, startMeasure, endMeasure)\n" +
    "myFunction(1, 17)\n" +
    "finish()\n",

    "Custom Functions.js": "init();\n" +
    "setTempo(100);\n" +
    "function myFunction(startMeasure, endMeasure) {\n" +
    " fitMedia(ELECTRO_DRUM_MAIN_BEAT_003, 1, startMeasure, endMeasure);\n" +
    " fitMedia(ELECTRO_ANALOGUE_PHASERBASS_003, 2, startMeasure, endMeasure);\n" +
    "}\n" +
    "myFunction(1, 17);\n" +
    "finish();\n",

    "Improved A-B-A.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "def sectionA(startMeasure, endMeasure):\n" +
    "  # create an A section, placing music from startMeasure (inclusive) to endMeasure (exclusive)\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, startMeasure, endMeasure) # main\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure) # drums\n" +
    "  for measure in range(startMeasure, endMeasure):\n" +
    "      fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1) # repeated bassline\n" +
    "  for measure in range(startMeasure, endMeasure, 2): # every other measure\n" +
    "      fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1) # backing\n" +
    "  setEffect(4, DELAY, DELAY_TIME, 500) # delay on track 4\n" +
    "def sectionB(startMeasure, endMeasure):\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_3, 1, startMeasure, endMeasure) # sparse drums\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 3, startMeasure, endMeasure) # rattling\n" +
    "sectionA(1, 5)\n" +
    "sectionB(5, 9)\n" +
    "sectionA(9, 13)\n" +
    "finish()\n",

    "Improved A-B-A.js": "init();\n" +
    "setTempo(120);\n" +
    "function sectionA(startMeasure, endMeasure){\n" +
    "  // create an A section, placing music from startMeasure (inclusive) to endMeasure (exclusive)\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, startMeasure, endMeasure); // main\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure); // drums\n" +
    "  for (var measure = startMeasure; measure < endMeasure; measure++){\n" +
    "      fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 3, measure, measure + 1); // repeated bassline\n" +
    "  }\n" +
    "  for (var measure = startMeasure; measure < endMeasure; measure += 2){ // every other measure\n" +
    "      fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_3, 4, measure, measure + 1); // backing\n" +
    "  }\n" +
    "  setEffect(4, DELAY, DELAY_TIME, 500); // delay on track 4\n" +
    "}\n" +
    "function sectionB(startMeasure, endMeasure){\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_DRUMPART_3, 1, startMeasure, endMeasure); // sparse drums\n" +
    "  fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 3, startMeasure, endMeasure); // rattling\n" +
    "}\n" +
    "sectionA(1, 5);\n" +
    "sectionB(5, 9);\n" +
    "sectionA(9, 13);\n" +
    "finish();\n",

    "Multi Beat.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "synth = DUBSTEP_FILTERCHORD_002\n" +
    "cymbal = OS_CLOSEDHAT01\n" +
    'beat1 = "-00-00+++00--0-0"\n' +
    'beat2 = "0--0--000--00-0-"\n' +
    "for measure in range(1,4):\n" +
    "   makeBeat(synth, 1, measure, beat1)\n" +
    "   makeBeat(cymbal, 2, measure, beat2)\n" +
    "finish()\n",

    "Multi Beat.js": "init();\n" +
    "setTempo(120);\n" +
    "var synth = DUBSTEP_FILTERCHORD_002;\n" +
    "var cymbal = OS_CLOSEDHAT01;\n" +
    'var beat1 = "-00-00+++00--0-0";\n' +
    'var beat2 = "0--0--000--00-0-";\n' +
    "for (var measure=1; measure < 4; measure++) {\n" +
    "   makeBeat(synth, 1, measure, beat1);\n" +
    "   makeBeat(cymbal, 2, measure, beat2);\n" +
    "}\n" +
    "finish();\n",

    "Return Statements.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    'rhythm1 = "0+++0+0+0+--0+00"\n' +
    'rhythm2 = "0+0-00++0-000+++"\n' +
    "def createBeat(startMeasure, soundClip, beatString):\n" +
    "  endMeasure = startMeasure + 3\n" +
    "  for measure in range(startMeasure, endMeasure):\n" +
    "    makeBeat(soundClip, 1, measure, beatString)\n" +
    "  # Return ending measure so we can use it outside function\n" +
    "  return endMeasure\n" +
    "newStart = createBeat(1, HIPHOP_DUSTYGROOVE_007, rhythm1)\n" +
    "createBeat(newStart, HIPHOP_DUSTYGROOVE_010, rhythm2)\n" +
    "finish()\n",

    "Return Statements.js": "init();\n" +
    "setTempo(100);\n" +
    'var rhythm1 = "0+++0+0+0+--0+00";\n' +
    'var rhythm2 = "0+0-00++0-000+++";\n' +
    "function createBeat(startMeasure, soundClip, beatString){\n" +
    "  endMeasure = startMeasure + 3;\n" +
    "  for (measure = startMeasure; measure < endMeasure; measure++){\n" +
    "    makeBeat(soundClip, 1, measure, beatString);\n" +
    "  }\n" +
    "  // Return ending measure so we can use it outside function\n" +
    "  return endMeasure;\n" +
    "}\n" +
    "newStart = createBeat(1, HIPHOP_DUSTYGROOVE_007, rhythm1);\n" +
    "createBeat(newStart, HIPHOP_DUSTYGROOVE_010, rhythm2);\n" +
    "finish();\n",

    "Concatenation.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'stringA = "Computer"\n' +
    'stringB = "Science!"\n' +
    'newString = stringA + " " + stringB  # concatenating stringA and stringB with a space in between\n' +
    "print newString\n" +
    "finish()\n",

    "Concatenation.js": "init();\n" +
    "setTempo(120);\n" +
    'var stringA = "Computer";\n' +
    'var stringB = "Science!";\n' +
    'var newString = stringA + " " + stringB; // concatenating stringA and stringB with a space in between\n' +
    "println(newString);\n" +
    "finish();\n",

    "Beat String Concatenation.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    'beatString1 = "0++00-0+"\n' +
    'beatString2 = "-00+0---"\n' +
    'beatString3 = "0+++0-0+"\n' +
    'beatString4 = "0+00++00"\n' +
    'beatString5 = "0+000-0+"\n' +
    "kick = OS_KICK03\n" +
    "snare = OS_SNARE01\n" +
    "hat = OS_CLOSEDHAT03\n" +
    "finalKick = beatString1 + beatString5 + beatString3 + beatString1 + beatString2 + beatString4\n" +
    "finalSnare = beatString2 + beatString1 + beatString4 + beatString3 + beatString5 + beatString1\n" +
    "finalHat = beatString5 + beatString4 + beatString3 + beatString2 + beatString1 + beatString3\n" +
    "makeBeat(kick, 1, 1, finalKick)\n" +
    "makeBeat(snare, 2, 1, finalSnare)\n" +
    "makeBeat(hat, 3, 1, finalHat)\n" +
    "finish()\n",

    "Beat String Concatenation.js": "init();\n" +
    "setTempo(100);\n" +
    'var beatString1 = "0++00-0+";\n' +
    'var beatString2 = "-00+0---";\n' +
    'var beatString3 = "0+++0-0+";\n' +
    'var beatString4 = "0+00++00";\n' +
    'var beatString5 = "0+000-0+";\n' +
    "var kick = OS_KICK03;\n" +
    "var snare = OS_SNARE01;\n" +
    "var hat = OS_CLOSEDHAT03;\n" +
    "var finalKick = beatString1 + beatString5 + beatString3 + beatString1 + beatString2 + beatString4;\n" +
    "var finalSnare = beatString2 + beatString1 + beatString4 + beatString3 + beatString5 + beatString1;\n" +
    "var finalHat = beatString5 + beatString4 + beatString3 + beatString2 + beatString1 + beatString3;\n" +
    "makeBeat(kick, 1, 1, finalKick);\n" +
    "makeBeat(snare, 2, 1, finalSnare);\n" +
    "makeBeat(hat, 3, 1, finalHat);\n" +
    "finish();\n",

    "Substrings.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    'a = "Pulling a rabbit out of a string"\n' +
    "b = a[10: 16]\n" +
    "print b # print the contents of b to the console\n" +
    "print len(b) # print the length of b to the console\n" +
    "finish()\n",

    "Substrings.js": "init();\n" +
    "setTempo(100);\n" +
    'var a = "Pulling a rabbit out of a string";\n' +
    "var b = a.substring(10, 16);\n" +
    "println(b); // print the contents of b to the console\n" +
    "println(b.length); // print the length of b to the console\n" +
    "finish();\n",

    "String Operations.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'initialBeat = "0+0+00-00+++-0++"\n' +
    "drumInstr = RD_UK_HOUSE_MAINBEAT_10\n" +
    "def expander(beatString):\n" +
    '  newBeat = ""\n' +
    "  for i in range(0, len(beatString)):\n" +
    "    beatSlice = beatString[0:i]\n" +
    "    newBeat = newBeat + beatSlice\n" +
    "  return newBeat # return the new beat string so it can be used outside the function\n" +
    "finalBeat = expander(initialBeat)\n" +
    "print finalBeat\n" +
    "makeBeat(drumInstr, 1, 1, finalBeat)\n" +
    "finish()\n",

    "String Operations.js": "init();\n" +
    "setTempo(120);\n" +
    'var initialBeat = "0+0+00-00+++-0++";\n' +
    "var drumInstr = RD_UK_HOUSE_MAINBEAT_10;\n" +
    "function expander(beatString){\n" +
    '  var newBeat = "";\n' +
    "  for (var i = 0; i < beatString.length; i = i + 1){\n" +
    "    beatSlice = beatString.substring(0, i);\n" +
    "    newBeat = newBeat + beatSlice;\n" +
    "  }\n" +
    "  return newBeat; // return the new beat string so it can be used outside the function\n" +
    "}\n" +
    "var finalBeat = expander(initialBeat);\n" +
    "println(finalBeat);\n" +
    "makeBeat(drumInstr, 1, 1, finalBeat);\n" +
    "finish();\n",

    "Advanced Transition Techniques - Looping.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(140)\n" +
    'beat1 = "0---0+0---0-0+++"\n' +
    "drum = RD_FUTURE_DUBSTEP_MAINBEAT_11\n" +
    "lead = RD_FUTURE_DUBSTEP_LEADSYNTH_10\n" +
    "lead2 = RD_TRAP_PITCHLEAD_3\n" +
    "wobble1 = DUBSTEP_BASS_WOBBLE_006\n" +
    "swoosh = RD_FUTURE_DUBSTEP_SFX_8\n" +
    "subBass = RD_FUTURE_DUBSTEP_SUBBASS_4\n" +
    "def easyLoops(startMeasure, numSteps, startString):\n" +
    '  endString = ""\n' +
    "  for i in range(numSteps):\n" +
    "    endString += startString\n" +
    "  makeBeat(lead, 1, startMeasure, endString)\n" +
    "def section1(startMeasure, endMeasure):\n" +
    "  # drums\n" +
    "  fitMedia(drum, 2, startMeasure, endMeasure)\n" +
    "  # lead\n" +
    "  for measure in range (2, 9, 2):\n" +
    "    fitMedia(lead, 1, measure, measure + 1)\n" +
    "  fitMedia(lead, 1, 9, 13)\n" +
    "def transition(startMeasure):\n" +
    '  easyLoops(startMeasure, 4, "0+++++++")\n' +
    '  easyLoops(startMeasure+2, 4, "0+++")\n' +
    '  easyLoops(startMeasure+3, 4, "0+")\n' +
    '  easyLoops(startMeasure+3.5, 8, "0")\n' +
    "  fitMedia(swoosh, 3, startMeasure+2, startMeasure+4)\n" +
    "def section2(startMeasure, endMeasure):\n" +
    "  # drums\n" +
    "  for measure in range (startMeasure, endMeasure):\n" +
    "      makeBeat(drum, 2, measure, beat1)\n" +
    "  # bass\n" +
    "  fitMedia(subBass, 4, startMeasure, endMeasure)\n" +
    "  # lead\n" +
    "  fitMedia(lead2, 1, startMeasure, 21)\n" +
    "  for measure in range(21, 23):\n" +
    '      makeBeat(lead2, 1, measure, "0-000+++++++++++")\n' +
    '  makeBeat(lead2, 1, 23, "0-000+++++++++++++++++++++++++++")\n' +
    "  fitMedia(lead2, 1, 25, 29)\n" +
    "  for measure in range(29, endMeasure):\n" +
    "      makeBeat(lead2, 1, measure, beat1) # switch with drum beat for last phrase\n" +
    "  # placing dubstep wobbles\n" +
    "  fitMedia(wobble1, 5, 20.5, 21)\n" +
    "  fitMedia(wobble1, 5, 24.5, 25)\n" +
    "  fitMedia(wobble1, 5, 28.5, 29)\n" +
    '  makeBeat(wobble1, 5, 26.5, "0+--0+")\n' +
    '  makeBeat(wobble1, 5, 30.5, "0+--0+")\n' +
    "section1(1,17)\n" +
    "transition(13)\n" +
    "section2(17, 32)\n" +
    "fitMedia(wobble1, 5, 32, 33) # End with longer a dubstep wobble\n" +
    "setEffect(3, VOLUME, GAIN, -9) # dropping swoosh volume\n" +
    "setEffect(2, VOLUME, GAIN, -6) # drop drum volume slightly\n" +
    "setEffect(2, FILTER, FILTER_FREQ, 750, 1, 10000, 5) # filter envelope to bring drums in subtly\n" +
    "finish()\n",

    "Advanced Transition Techniques - Looping.js": "init();\n" +
    "setTempo(140);\n" +
    'var beat1 = "0---0+0---0-0+++";\n' +
    "var drum = RD_FUTURE_DUBSTEP_MAINBEAT_11;\n" +
    "var lead = RD_FUTURE_DUBSTEP_LEADSYNTH_10;\n" +
    "var lead2 = RD_TRAP_PITCHLEAD_3;\n" +
    "var wobble1 = DUBSTEP_BASS_WOBBLE_006;\n" +
    "var swoosh = RD_FUTURE_DUBSTEP_SFX_8;\n" +
    "var subBass = RD_FUTURE_DUBSTEP_SUBBASS_4;\n" +
    "function easyLoops(startMeasure, endMeasure, step){\n" +
    "  for (var measure = startMeasure; measure < endMeasure; measure += step){\n" +
    "   fitMedia(lead, 1, measure, measure + step);\n" +
    "  }\n" +
    "}\n" +
    "function section1(startMeasure, endMeasure){\n" +
    "  // drums\n" +
    "  fitMedia(drum, 2, startMeasure, endMeasure);\n" +
    "  // lead\n" +
    "  for (var measure = 2; measure < 9; measure += 2){\n" +
    "    fitMedia(lead, 1, measure, measure + 1);\n" +
    "  }\n" +
    "  fitMedia(lead, 1, 9, 13);\n" +
    "}\n" +
    "function transition(startMeasure){\n" +
    "  easyLoops(startMeasure, startMeasure+2, 0.5);\n" +
    "  easyLoops(startMeasure+2, startMeasure+3, 0.25);\n" +
    "  easyLoops(startMeasure+3, startMeasure+3.5, 0.125);\n" +
    "  easyLoops(startMeasure+3.5, startMeasure+4, 0.0625);\n" +
    "  fitMedia(swoosh, 3, startMeasure+2, startMeasure+4);\n" +
    "}\n" +
    "function section2(startMeasure, endMeasure){\n" +
    "  // drums\n" +
    "  for (var measure = startMeasure; measure < endMeasure; measure++){\n" +
    "      makeBeat(drum, 2, measure, beat1);\n" +
    "  }\n" +
    "  // bass\n" +
    "  fitMedia(subBass, 4, startMeasure, endMeasure);\n" +
    "  // lead\n" +
    "  fitMedia(lead2, 1, startMeasure, 21);\n" +
    "  for (var measure = 21; measure < 23; measure++){\n" +
    '      makeBeat(lead2, 1, measure, "0-000+++++++++++");\n' +
    "  }\n" +
    '  makeBeat(lead2, 1, 23, "0-000+++++++++++++++++++++++++++");\n' +
    "  fitMedia(lead2, 1, 25, 29);\n" +
    "  for (var measure = 29; measure < endMeasure; measure++){\n" +
    "      makeBeat(lead2, 1, measure, beat1); // switch with drum beat for last phrase\n" +
    "  }\n" +
    "  // wobbles\n" +
    "  for (var measure = 20.5; measure < 29; measure += 4){\n" +
    "    fitMedia(wobble1, 5, measure, measure + 0.5);\n" +
    "  }\n" +
    "  for (var measure = 26.5; measure <= 30.5; measure += 4){\n" +
    '    makeBeat(wobble1, 5, measure, "0+--0+");\n' +
    "  }\n" +
    "}\n" +
    "section1(1,17);\n" +
    "transition(13);\n" +
    "section2(17, 32);\n" +
    "fitMedia(wobble1, 5, 32, 33); // End with longer a dubstep wobble\n" +
    "setEffect(3, VOLUME, GAIN, -9); // dropping swoosh volume\n" +
    "setEffect(2, VOLUME, GAIN, -6); // drop drum volume slightly\n" +
    "setEffect(2, FILTER, FILTER_FREQ, 750, 1, 10000, 5); // filter envelope to bring drums in subtly\n" +
    "finish();\n",

    "Advanced Transition Techniques - Anacrusis.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "chords1 = HOUSE_DEEP_CRYSTALCHORD_001\n" +
    "chords2 = HOUSE_DEEP_CRYSTALCHORD_002\n" +
    "chords3 = HOUSE_DEEP_CRYSTALCHORD_003\n" +
    "chords4 = HOUSE_DEEP_CRYSTALCHORD_004\n" +
    "bass = TECHNO_FM_BASS_004\n" +
    "bass2 = HOUSE_DEEP_BASS_004\n" +
    "lead1 = TECHNO_POLYLEAD_005\n" +
    "lead2 = RD_TRAP_ARPBLEEPLEAD_5\n" +
    "lead3 = HIPHOP_DUSTYGUITAR_002\n" +
    "beat1 = HOUSE_MAIN_BEAT_008\n" +
    "beat2 = HOUSE_MAIN_BEAT_009\n" +
    "riser = HOUSE_SFX_WHOOSH_007\n" +
    "def chordProg(clip, startMeasure):\n" +
    "  for measure in range (startMeasure, 8, 4):\n" +
    "    fitMedia(clip, 1, measure, measure + 1)\n" +
    "chordProg(chords1, 1)\n" +
    "chordProg(chords2, 2)\n" +
    "chordProg(chords3, 3)\n" +
    "chordProg(chords4, 4)\n" +
    "fitMedia(beat1, 2, 1, 8)\n" +
    "for measure in range (1, 8):\n" +
    '  makeBeat(bass, 3, measure, "0+++++++0++0++0+")\n' +
    "fitMedia(lead1, 4, 1, 8)\n" +
    "insertMediaSection(lead2, 5, 8, 4, 5) # placing the last measure (4 beats) of this clip\n" +
    "fitMedia(riser, 5, 7, 8) # partial riser\n" +
    "fitMedia(lead2, 1, 9, 17)\n" +
    "fitMedia(lead3, 6, 9, 17)\n" +
    "fitMedia(beat2, 2, 9, 17)\n" +
    "for measure in range(9, 17):\n" +
    '  makeBeat(bass2, 3, measure, "--0+--0+--0+--0+")\n' +
    "setEffect(4, VOLUME, GAIN, -18)\n" +
    "setEffect(6, VOLUME, GAIN, -10)\n" +
    "finish()\n",

    "Advanced Transition Techniques - Anacrusis.js": "init();\n" +
    "setTempo(120);\n" +
    "var chords1 = HOUSE_DEEP_CRYSTALCHORD_001;\n" +
    "var chords2 = HOUSE_DEEP_CRYSTALCHORD_002;\n" +
    "var chords3 = HOUSE_DEEP_CRYSTALCHORD_003;\n" +
    "var chords4 = HOUSE_DEEP_CRYSTALCHORD_004;\n" +
    "var bass = TECHNO_FM_BASS_004;\n" +
    "var bass2 = HOUSE_DEEP_BASS_004;\n" +
    "var lead1 = TECHNO_POLYLEAD_005;\n" +
    "var lead2 = RD_TRAP_ARPBLEEPLEAD_5;\n" +
    "var lead3 = HIPHOP_DUSTYGUITAR_002;\n" +
    "var beat1 = HOUSE_MAIN_BEAT_008;\n" +
    "var beat2 = HOUSE_MAIN_BEAT_009;\n" +
    "var riser = HOUSE_SFX_WHOOSH_007;\n" +
    "function chordProg(clip, startMeasure){\n" +
    "  for (var measure = startMeasure; measure < 8; measure += 4){\n" +
    "    fitMedia(clip, 1, measure, measure + 1);\n" +
    "  }\n" +
    "}\n" +
    "chordProg(chords1, 1);\n" +
    "chordProg(chords2, 2);\n" +
    "chordProg(chords3, 3);\n" +
    "chordProg(chords4, 4);\n" +
    "fitMedia(beat1, 2, 1, 8);\n" +
    "for(var measure = 1; measure < 8; measure++){\n" +
    '  makeBeat(bass, 3, measure, "0+++++++0++0++0+");\n' +
    "}\n" +
    "fitMedia(lead1, 4, 1, 8);\n" +
    "insertMediaSection(lead2, 5, 8, 4, 5); // placing the last measure (4 beats) of this clip\n" +
    "fitMedia(riser, 5, 7, 8); // partial riser\n" +
    "fitMedia(lead2, 1, 9, 17)\n" +
    "fitMedia(lead3, 6, 9, 17)\n" +
    "fitMedia(beat2, 2, 9, 17)\n" +
    "for(var measure = 9; measure < 17; measure++){\n" +
    '  makeBeat(bass2, 3, measure, "--0+--0+--0+--0+");\n' +
    "}\n" +
    "setEffect(4, VOLUME, GAIN, -18);\n" +
    "setEffect(6, VOLUME, GAIN, -10);\n" +
    "finish();\n",

    "Printing Demo.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "print 3 * 4\n" +
    "x = 3 * 4\n" +
    "print x\n" +
    "y = 2\n" +
    "print x / y\n" +
    'print "De" + "bug"\n' +
    "finish()\n",

    "Printing Demo.js": "init();\n" +
    "setTempo(120);\n" +
    "println(3 * 4); // prints the result of 3*4\n" +
    "var x = 3 * 4; // prints the value of x\n" +
    "println(x);\n" +
    "var y = 2;\n" +
    "println(x / y); // evaluates x/y, then prints the result\n" +
    'println("De" + "bug"); // prints the result of the concatenation\n' +
    "finish();\n",

    "Overlap Logic Error.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "groove1 = HIPHOP_DUSTYGROOVE_011\n" +
    "groove2 = HIPHOP_DUSTYGROOVE_010\n" +
    "for measure in range(1, 9):\n" +
    "  fitMedia(groove1, 1, measure, measure + 2)\n" +
    "  fitMedia(groove2, 2, measure + 2, measure + 4)\n" +
    "finish()\n",

    "Overlap Logic Error.js": "init();\n" +
    "setTempo(120);\n" +
    "var groove1 = HIPHOP_DUSTYGROOVE_011;\n" +
    "var groove2 = HIPHOP_DUSTYGROOVE_010;\n" +
    "for (measure = 1; measure < 9; measure ++ ){\n" +
    "  fitMedia(groove1, 1, measure, measure + 2);\n" +
    "  fitMedia(groove2, 2, measure + 2, measure + 4);\n" +
    "}\n" +
    "finish();\n",

    "Overlap Correction.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "groove1 = HIPHOP_DUSTYGROOVE_011\n" +
    "groove2 = HIPHOP_DUSTYGROOVE_010\n" +
    "for measure in range(1, 9, 4):\n" +
    "  fitMedia(groove1, 1, measure, measure + 2)\n" +
    "  fitMedia(groove2, 2, measure + 2, measure + 4)\n" +
    "finish()\n",

    "Overlap Correction.js": "init();\n" +
    "setTempo(120);\n" +
    "var groove1 = HIPHOP_DUSTYGROOVE_011;\n" +
    "var groove2 = HIPHOP_DUSTYGROOVE_010;\n" +
    "for (measure = 1; measure < 9; measure += 4 ){\n" +
    "  fitMedia(groove1, 1, measure, measure + 2);\n" +
    "  fitMedia(groove2, 2, measure + 2, measure + 4);\n" +
    "}\n" +
    "finish();\n",

    "Argument Order Correction.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(128)\n" +
    "lead = YG_EDM_LEAD_BIG_1\n" +
    "kick = YG_EDM_KICK_1\n" +
    "riser = RD_EDM_SFX_RISER_AIR_1\n" +
    "bigClaps = YG_EDM_CLAPS_1\n" +
    "fitMedia(bigClaps, 1, 1, 5)\n" +
    "fitMedia(riser, 2, 1, 5)\n" +
    "fitMedia(kick, 3, 5, 9)\n" +
    "fitMedia(lead, 4, 5, 9)\n" +
    "setEffect(2, VOLUME, GAIN, -10)\n" +
    "setEffect(1, FILTER, FILTER_FREQ, 10000, 1, 100 , 5)\n" +
    "finish()\n",

    "Argument Order Correction.js": "init();\n" +
    "setTempo(128);\n" +
    "var lead = YG_EDM_LEAD_BIG_1;\n" +
    "var kick = YG_EDM_KICK_1;\n" +
    "var riser = RD_EDM_SFX_RISER_AIR_1;\n" +
    "var bigClaps = YG_EDM_CLAPS_1;\n" +
    "fitMedia(bigClaps, 1, 1, 5);\n" +
    "fitMedia(riser, 2, 1, 5);\n" +
    "fitMedia(kick, 3, 5, 9);\n" +
    "fitMedia(lead, 4, 5, 9);\n" +
    "setEffect(2, VOLUME, GAIN, -10);\n" +
    "setEffect(1, FILTER, FILTER_FREQ, 10000, 1, 100, 5);\n" +
    "finish();\n",

    "Simple Console Input.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'print "Hello."\n' +
    'n = readInput("What is your name? ")\n' +
    'print "Hi " + n + "! It is nice to meet you."\n' +
    "finish()\n",

    "Simple Console Input.js": "init();\n" +
    "setTempo(120);\n" +
    'println("Hello.");\n' +
    'var n = readInput("What is your name? ");\n' +
    'println ("Hi " + n + "! It is nice to meet you.");\n' +
    "finish();\n",

    "Conditionals.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'a = readInput("Do you like hip-hop music? Type yes or no.")\n' +
    'if (a == "yes" or a == "Yes" or a == "YES"): # using logical OR, in case user capitilizes their response.\n' +
    '    print "Hip-hop it is!"\n' +
    "    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9)\n" +
    "    fitMedia(RD_TRAP_MAIN808_BEAT_1, 2, 1, 9)\n" +
    'else:    # an answer other than "Yes" or "yes" was entered\n' +
    '    print "Ok, here is some funk."\n' +
    "    fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9)\n" +
    "    fitMedia(YG_NEW_FUNK_DRUMS_4, 2, 1, 9)\n" +
    "finish()\n",

    "Conditionals.js": "init();\n" +
    "setTempo(120);\n" +
    'var a = readInput("Do you like hip-hop music? Type yes or no.");\n' +
    'if (a == "yes" || a == "Yes" || a == "YES" ){ // using logical OR, in case user capitilizes their response.\n' +
    '    println("Hip-hop it is!");\n' +
    "    fitMedia(YG_NEW_HIP_HOP_ARP_1, 1, 1, 9);\n" +
    "    fitMedia(RD_TRAP_MAIN808_BEAT_1, 2, 1, 9);\n" +
    '} else{ //anything other than "yes" or "Yes" was typed\n' +
    '    println("Ok, here is some funk.");\n' +
    "    fitMedia(YG_NEW_FUNK_ELECTRIC_PIANO_4, 1, 1, 9);\n" +
    "    fitMedia(YG_NEW_FUNK_DRUMS_4, 2, 1, 9);\n" +
    "}\n" +
    "finish();\n",

    "Which Comes First.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'input = readInput("Which instrument comes first? Type Guitar, Bass, or Drums.")\n' +
    "first_inst = str(input)\n" +
    'if (first_inst == "guitar") or (first_inst == "Guitar") or (first_inst == "GUITAR"):\n' +
    '    print "Guitar comes first"\n' +
    "    fitMedia(Y02_GUITAR_1, 1, 1, 9)\n" +
    "    fitMedia(Y01_BASS_1, 2, 3, 9)\n" +
    "    fitMedia(Y02_DRUM_SAMPLES_1, 3, 3, 9)\n" +
    'elif (first_inst == "bass") or (first_inst == "Bass") or (first_inst == "BASS"):\n' +
    '  print "Bass comes first"\n' +
    "  fitMedia(Y01_BASS_1, 1, 1, 9)\n" +
    "  fitMedia(Y02_GUITAR_1, 2, 3, 9)\n" +
    "  fitMedia(Y02_DRUM_SAMPLES_1, 3, 3, 9)\n" +
    'elif (first_inst == "drums") or (first_inst == "Drums") or (first_inst == "DRUMS"):\n' +
    '  print "Drums come first"\n' +
    "  fitMedia(Y02_DRUM_SAMPLES_1, 1, 1, 9)\n" +
    "  fitMedia(Y02_GUITAR_1, 2, 3, 9)\n" +
    "  fitMedia(Y01_BASS_1, 3, 3, 9)\n" +
    "else:\n" +
    '  print "Please select Guitar, Bass, or Drums."\n' +
    "finish()\n",

    "Which Comes First.js": "init();\n" +
    "setTempo(120);\n" +
    'var first_inst = readInput("Which instrument comes first? Type Guitar, Bass, or Drums.");\n' +
    'if (first_inst == "guitar" || first_inst == "Guitar" || first_inst == "GUITAR"){\n' +
    '  println("Guitar comes first");\n' +
    "    fitMedia(Y02_GUITAR_1, 1, 1, 9);\n" +
    "    fitMedia(Y01_BASS_1, 2, 3, 9);\n" +
    "    fitMedia(Y02_DRUM_SAMPLES_1, 3, 3, 9);\n" +
    "}\n" +
    'else if (first_inst == "bass" || first_inst == "Bass" || first_inst == "BASS"){\n' +
    '  println("Bass comes first");\n' +
    "    fitMedia(Y01_BASS_1, 1, 1, 9);\n" +
    "    fitMedia(Y02_GUITAR_1, 2, 3, 9);\n" +
    "    fitMedia(Y02_DRUM_SAMPLES_1, 3, 3, 9);\n" +
    "}\n" +
    'else if (first_inst == "drums" || first_inst == "Drums" || first_inst == "DRUMS"){\n' +
    '  println("Drums come first");\n' +
    "    fitMedia(Y02_DRUM_SAMPLES_1, 1, 1, 9);\n" +
    "    fitMedia(Y02_GUITAR_1, 2, 3, 9);\n" +
    "    fitMedia(Y01_BASS_1, 3, 3, 9);\n" +
    "}\n" +
    "else {\n" +
    '  println("Please select Guitar, Bass, or Drums.");\n' +
    "}\n" +
    "finish();\n",

    "Lists.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(130)\n" +
    "myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11]\n" +
    "fitMedia(myEnsemble[0], 1, 1, 5) # accessing index 0\n" +
    "fitMedia(myEnsemble[1], 2, 1, 5) # accessing index 1\n" +
    "fitMedia(myEnsemble[2], 3, 1, 5) # accessing index 2\n" +
    "finish()\n",

    "Arrays.js": "init();\n" +
    "setTempo(130);\n" +
    "var myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11];\n" +
    "fitMedia(myEnsemble[0], 1, 1, 5); // accessing index 0\n" +
    "fitMedia(myEnsemble[1], 2, 1, 5); // accessing index 1\n" +
    "fitMedia(myEnsemble[2], 3, 1, 5); // accessing index 2\n" +
    "finish();\n",

    "List Iteration.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    'myList = ["Get", "thee", "to", "the", "console!"]\n' +
    "for i in range (0, len(myList)): # Stopping condition determined by list length\n" +
    "  print myList[i];\n" +
    "finish()\n",

    "Array Iteration.js": "init();\n" +
    "setTempo(120);\n" +
    'var myArray = ["Get", "thee", "to", "the", "console!"];\n' +
    "for (var i = 0; i < myArray.length; i++){ //Stopping condition determined by array length\n" +
    "  println(myArray[i]);\n" +
    "}\n" +
    "finish();\n",

    "Additive Introduction.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "introArray = [HIPHOP_DUSTYGROOVE_003, TECHNO_LOOP_PART_006, HOUSE_SFX_WHOOSH_001, TECHNO_CLUB5THPAD_001]\n" +
    "for measure in range (1, 5):\n" +
    "    mediaIndex = measure - 1 # zero-based list index\n" +
    "    track = measure # change track with measure\n" +
    "    fitMedia(introArray[mediaIndex], track, measure, 9)\n" +
    "finish()\n",

    "Additive Introduction.js": "init();\n" +
    "setTempo(120);\n" +
    "var introArray = [HIPHOP_DUSTYGROOVE_003, TECHNO_LOOP_PART_006, HOUSE_SFX_WHOOSH_001, TECHNO_CLUB5THPAD_001];\n" +
    "for (var measure = 1; measure < 5; measure++) {\n" +
    "    var mediaIndex = measure - 1; // zero-based array index\n" +
    "    var track = measure; // change track with measure\n" +
    "    fitMedia(introArray[mediaIndex], track, measure, 9);\n" +
    "}\n" +
    "finish();\n",

    "Making a drum set.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(100)\n" +
    "drums = [ELECTRO_DRUM_MAIN_BEAT_001, # an list of drum clips\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_002,\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_003,\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_004]\n" +
    'drumPattern = "0+0+11112+2+3+++" # each number is actually an index into the drums list\n' +
    "makeBeat(drums, 1, 1, drumPattern)\n" +
    "finish()\n",

    "Making a drum set.js": "init();\n" +
    "setTempo(100);\n" +
    "var drums = [ELECTRO_DRUM_MAIN_BEAT_001,  // an array of drum clips\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_002,\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_003,\n" +
    "         ELECTRO_DRUM_MAIN_BEAT_004];\n" +
    'var drumPattern = "0+0+11112+2+3+++";   // each number is actually an index into the drums array\n' +
    "makeBeat(drums, 1, 1, drumPattern);\n" +
    "finish();\n",

    "List Operations.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(120)\n" +
    "drumSounds = [OS_CLAP01, OS_CLOSEDHAT01, OS_COWBELL01, OS_KICK01, OS_LOWTOM01, OS_SNARE01]\n" +
    'beatString = "5-5132-034550011"\n' +
    "for measure in range(1, 33):\n" +
    "    makeBeat(drumSounds, 1, measure, beatString)\n" +
    "    if (measure % 4 == 0): # Only True at every fourth measure\n" +
    "        # rotate list items so last item moves to first slot\n" +
    "        listLength = len(drumSounds)\n" +
    "        lastSound = drumSounds[listLength-1:listLength]\n" +
    "        allButLastSound = drumSounds[0:listLength-1]\n" +
    "        drumSounds = lastSound + allButLastSound\n" +
    "finish()\n",

    "Array Operations.js": "init();\n" +
    "setTempo(120);\n" +
    "var drumSounds = [OS_CLAP01, OS_CLOSEDHAT01, OS_COWBELL01, OS_KICK01, OS_LOWTOM01, OS_SNARE01];\n" +
    'var beatString = "5-5132-034550011";\n' +
    "for (var measure = 1; measure < 33; measure++) {\n" +
    "    makeBeat(drumSounds, 1, measure, beatString);\n" +
    "    if (measure % 4 == 0) { // Only true at every 4th measure\n" +
    "        // rotate array items so last item moves to first slot\n" +
    "        var arrLength = drumSounds.length;\n" +
    "        var lastSound = drumSounds.slice(arrLength - 1, arrLength);\n" +
    "        var allButLastSound = drumSounds.slice(0, arrLength - 1);\n" +
    "        drumSounds = lastSound.concat(allButLastSound);\n" +
    "    }\n" +
    "}\n" +
    "finish();\n",

    "Random Clip.py": "from earsketch import *\n" +
    "from random import *  # need to import the random library to use randint()\n" +
    "init()\n" +
    "setTempo(100)\n" +
    "sampleBank = [YG_TRAP_SYNTH_BELL_1,\n" +
    "              YG_TRAP_STRINGS_1,\n" +
    "              YG_TRAP_SHORT_SYNTH_1,\n" +
    "              YG_TRAP_HIT_1,\n" +
    "              YG_TRAP_SYNTH_LEAD_6,\n" +
    "              YG_TRAP_BELLS_1]\n" +
    "for i in range(1, 9):\n" +
    "    index = randint(0, 5) # Generate a random index number between 0 and 5\n" +
    "    fitMedia(sampleBank[index], 1, i, i+1) # Use the random index to get a list element\n" +
    "fitMedia(YG_TRAP_KICK_4, 2, 1, 9)\n" +
    "fitMedia(YG_TRAP_BASS_1, 3, 1, 9)\n" +
    "fitMedia(YG_TRAP_SNARE_5, 4, 1, 9)\n" +
    "finish()\n",

    "Random Clip.js": "init();\n" +
    "setTempo(100);\n" +
    "var sampleBank = [YG_TRAP_SYNTH_BELL_1,\n" +
    "              YG_TRAP_STRINGS_1,\n" +
    "              YG_TRAP_SHORT_SYNTH_1,\n" +
    "              YG_TRAP_HIT_1,\n" +
    "              YG_TRAP_SYNTH_LEAD_6,\n" +
    "              YG_TRAP_BELLS_1];\n" +
    "for(var i = 1; i < 9; i++) {\n" +
    " // Generate a random index number\n" +
    "    var index = Math.floor(Math.random() * 6); // generates a random index number between 0 and 5\n" +
    "    // Use the random index to pick a sample\n" +
    "    fitMedia(sampleBank[index], 1, i, i+1);\n" +
    "}\n" +
    "fitMedia(YG_TRAP_KICK_4, 2, 1, 9);\n" +
    "fitMedia(YG_TRAP_BASS_1, 3, 1, 9);\n" +
    "fitMedia(YG_TRAP_SNARE_5, 4, 1, 9);\n" +
    "finish();\n",

    "Amen Break.py": "from earsketch import *\n" +
    "init()\n" +
    "setTempo(140)\n" +
    "drums = [OS_KICK05, OS_SNARE06, Y24_HI_HATS_1, Y58_HI_HATS_1, OS_OPENHAT01]\n" +
    'a = "0+0-1+-1+1001+-1"\n' +
    'b = "0+0-1+-1-10---1+"\n' +
    'c = "-1001+-1+10---1+"\n' +
    'cym1 = "2+2+2+2+2+2+2+2+"\n' +
    'cym2 = "2+2+2+2+2+3+2+2+"\n' +
    'cym3 = "2+2+2+2+2+4+2+2+"\n' +
    "amenBreak = a + a + b + c\n" +
    "amenCymbals = cym1 + cym1 + cym2 + cym3\n" +
    "makeBeat(drums, 1, 1, amenBreak)\n" +
    "makeBeat(drums, 2, 1, amenCymbals)\n" +
    "finish()\n",

    "Amen Break.js": "init();\n" +
    "setTempo(140);\n" +
    "var drums = [OS_KICK05, OS_SNARE06, Y24_HI_HATS_1, Y58_HI_HATS_1, OS_OPENHAT01];\n" +
    'var a = "0+0-1+-1+1001+-1";\n' +
    'var b = "0+0-1+-1-10---1+";\n' +
    'var c = "-1001+-1+10---1+";\n' +
    'var cym1 = "2+2+2+2+2+2+2+2+";\n' +
    'var cym2 = "2+2+2+2+2+3+2+2+";\n' +
    'var cym3 = "2+2+2+2+2+4+2+2+";\n' +
    "var amenBreak = a + a + b + c;\n" +
    "var amenCymbals = cym1 + cym1 + cym2 + cym3;\n" +
    "makeBeat(drums, 1, 1, amenBreak);\n" +
    "makeBeat(drums, 2, 1, amenCymbals);\n" +
    "finish();\n",

    "Amen Remix.py": "from earsketch import *\n" +
    "from random import *\n" +
    "init()\n" +
    "setTempo(140)\n" +
    "drums = [OS_KICK05, OS_SNARE06, Y24_HI_HATS_1, Y58_HI_HATS_1, OS_OPENHAT01]\n" +
    'a = "0+0-1+-1+1001+-1"\n' +
    'b = "0+0-1+-1-10---1+"\n' +
    'c = "-1001+-1+10---1+"\n' +
    'cym1 = "2+2+2+2+2+2+2+2+"\n' +
    'cym2 = "2+2+2+2+2+3+2+2+"\n' +
    'cym3 = "2+2+2+2+2+4+2+2+"\n' +
    "amenBreak = a + a + b + c\n" +
    "amenCymbals = cym1 + cym1 + cym2 + cym3\n" +
    'insertSection = ""\n' +
    "for i in range(8):\n" +
    "    insertSection += str( randint(0, 4) )  # building the random beat string, 8 characters long\n" +
    "newA = insertSection + a[8:16]\n" +
    "newBeat = a + newA + b + c\n" +
    "makeBeat(drums, 1, 1, newBeat)\n" +
    "makeBeat(drums, 2, 1, amenCymbals)\n" +
    "finish()\n",

    "Amen Remix.js": "init();\n" +
    "setTempo(140);\n" +
    "var drums = [OS_KICK05, OS_SNARE06, Y24_HI_HATS_1, Y58_HI_HATS_1, OS_OPENHAT01];\n" +
    'var a = "0+0-1+-1+1001+-1";\n' +
    'var b = "0+0-1+-1-10---1+";\n' +
    'var c = "-1001+-1+10---1+";\n' +
    'var cym1 = "2+2+2+2+2+2+2+2+"\n' +
    'var cym2 = "2+2+2+2+2+3+2+2+"\n' +
    'var cym3 = "2+2+2+2+2+4+2+2+"\n' +
    "var amenBreak = a + a + b + c;\n" +
    "var amenCymbals = cym1 + cym1 + cym2 + cym3;\n" +
    'var insertSection = "";\n' +
    "for(var i = 0; i < 8; i++) {\n" +
    "    insertSection += Math.floor(Math.random() * 5);  // building the random beat string, 8 characters long\n" +
    "}\n" +
    "var newA = insertSection + a.substring(8,16);\n" +
    "var newBeat = a + newA + b + c;\n" +
    "makeBeat(drums, 1, 1, newBeat);\n" +
    "makeBeat(drums, 2, 1, amenCymbals);\n" +
    "finish();\n",

    "Number Parsing.js": "var tempo = \"99\";\n" +
      "tempo = Number(tempo);\n" +
      "setTempo(tempo);\n",
}
