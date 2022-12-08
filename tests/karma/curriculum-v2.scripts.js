export const CURRICULUM_V2_SCRIPTS = {
    "getting-started-intro-script.py": `# Intro Script: This code adds one audio clip to the DAW

# Setup Section
from earsketch import *
setTempo(120)

# Music Section
fitMedia(TECHNO_SYNTHPLUCK_001, 1, 1, 9)`,

    "getting-started-intro-script.js": `// Intro Script: This code adds one audio clip to the DAW

// Setup Section
setTempo(120);

// Music Section
fitMedia(TECHNO_SYNTHPLUCK_001, 1, 1, 9);`,

    "getting-started-using-fitmedia.py": `# Using fitMedia(): Adding a clip to the DAW

# Setup
from earsketch import *
setTempo(120)

# Music
fitMedia(Y18_DRUM_SAMPLES_2, 1, 1, 5)`,

    "getting-started-using-fitmedia.js": `// Using fitMedia(): Adding a clip to the DAW

// Setup
setTempo(120);

// Music
fitMedia(Y18_DRUM_SAMPLES_2, 1, 1, 5);`,

    "getting-started-using-fitmedia-2.py": `# Using fitMedia() 2: Multiple fitMedia() calls on different tracks

# Setup Section
from earsketch import *
setTempo(100)

# Music Section
fitMedia(Y01_DRUMS_1, 1, 1, 9)
fitMedia(Y11_BASS_1, 2, 1, 9)
fitMedia(Y11_GUITAR_1, 3, 1, 9)`,

    "getting-started-using-fitmedia-2.js": `// Using fitMedia() 2: Multiple fitMedia() calls on different tracks

// Setup Section
setTempo(100);

// Music Section
fitMedia(Y01_DRUMS_1, 1, 1, 9);
fitMedia(Y11_BASS_1, 2, 1, 9);
fitMedia(Y11_GUITAR_1, 3, 1, 9);`,

    "getting-started-finding-errors.py": `# Finding errors: Five errors below must be fixed

from earsketch import *
setTempo(88

fitMdia(HIPHOP_DUSTYGROOVEPART_001, 1, 1 9)
fitmedia(2, HIPHOP_DUSTYGROOVEPART_003, 1, 9)`,

    "getting-started-finding-errors.js": `// Finding errors: Five errors below must be fixed

setTempo(88;

fitMdia(HIPHOP_DUSTYGROOVEPART_001, 1, 1 9);
fitmedia(2, HIPHOP_DUSTYGROOVEPART_001, 1, 9);`,

    "your-first-song-comments.py": `# Comments: Using comments to describe what the code does

# Setup
from earsketch import *
setTempo(130)

# Music
# Leads
fitMedia(RD_EDM_ANALOGPLUCK_1, 1, 1, 9)
fitMedia(RD_TRAP_ARPBLEEPLEAD_5, 2, 1, 5)
fitMedia(RD_TRAP_ARPBLEEPLEAD_3, 2, 5, 9)

# Beat
fitMedia(HOUSE_BREAKBEAT_023, 3, 1, 9)
fitMedia(HOUSE_BREAKBEAT_006, 4, 1, 3)
fitMedia(HOUSE_BREAKBEAT_012, 4, 3, 5)
fitMedia(HOUSE_BREAKBEAT_012, 4, 7, 9)

# Bass and noise
fitMedia(ELECTRO_ANALOGUE_BASS_008, 5, 1, 9)
fitMedia(TECHNO_WHITENOISESFX_001, 6, 7, 9)`,

    "your-first-song-comments.js": `// Comments: Using comments to describe what the code does

// Setup
setTempo(130);

// Music
// Leads
fitMedia(RD_EDM_ANALOGPLUCK_1, 1, 1, 9);
fitMedia(RD_TRAP_ARPBLEEPLEAD_5, 2, 1, 5);
fitMedia(RD_TRAP_ARPBLEEPLEAD_3, 2, 5, 9);

// Beat
fitMedia(HOUSE_BREAKBEAT_023, 3, 1, 9);
fitMedia(HOUSE_BREAKBEAT_006, 4, 1, 3);
fitMedia(HOUSE_BREAKBEAT_012, 4, 3, 5);
fitMedia(HOUSE_BREAKBEAT_012, 4, 7, 9);

// Bass and noise
fitMedia(ELECTRO_ANALOGUE_BASS_008, 5, 1, 9);
fitMedia(TECHNO_WHITENOISESFX_001, 6, 7, 9);`,

    "add-beats-instead-of-this.py": `# Instead of this:
fitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 1, 2)

# We write this:
synth1 = HIPHOP_SYNTHPLUCKLEAD_005
fitMedia(synth1, 1, 1, 2)`,

    "add-beats-instead-of-this.js": `// Instead of this:
fitMedia(HIPHOP_SYNTHPLUCKLEAD_005, 1, 1, 2);

// We write this:
var synth1 = HIPHOP_SYNTHPLUCKLEAD_005;
fitMedia(synth1, 1, 1, 2);`,

    "add-beats-variables.py": `# Variables: Using variables to store clips and simplify edits

# Setup
from earsketch import *
setTempo(100)

# Music
synth1 = HIPHOP_SYNTHPLUCKLEAD_005
synth2 = HIPHOP_SOLOMOOGLEAD_001
drums = HIPHOP_TRAPHOP_BEAT_008

# fitMedia() adds the clips synth1 and synth2 alternatively on track 1.
fitMedia(synth1, 1, 1, 2)
fitMedia(synth2, 1, 2, 3)
fitMedia(synth1, 1, 3, 4)
fitMedia(synth2, 1, 4, 5)

# fitMedia() adds the drums on track 2.
fitMedia(drums, 2, 1, 9)`,

    "add-beats-variables.js": `// Variables: Using variables to store clips and simplify edits

// Setup
setTempo(100);

// Music
var synth1 = HIPHOP_SYNTHPLUCKLEAD_005; // Assigns a clip to the variable "synth1".
var synth2 = HIPHOP_SOLOMOOGLEAD_001;
var drums = HIPHOP_TRAPHOP_BEAT_008;

// fitMedia() adds the clips synth1 and synth2 alternatively on track 1.
fitMedia(synth1, 1, 1, 2);
fitMedia(synth2, 1, 2, 3);
fitMedia(synth1, 1, 3, 4);
fitMedia(synth2, 1, 4, 5);

// fitMedia() adds the drums on track 2.
fitMedia(drums, 2, 1, 9);`,

    "add-beats-multi-beat.py": `# Multi Beat: Using several makeBeat calls with different rhythms

# Setup
from earsketch import *
setTempo(120)

# Music
synth = DUBSTEP_FILTERCHORD_002
cymbal = OS_CLOSEDHAT01
beat1 = "-00-00+++00--0-0"
beat2 = "0--0--000--00-0-"

makeBeat(synth, 1, 1, beat1)
makeBeat(cymbal, 2, 1, beat2)`,

    "add-beats-multi-beat.js": `// Multi Beat: Using several makeBeat calls with different rhythms

// Setup
setTempo(120);

// Music
var synth = DUBSTEP_FILTERCHORD_002;
var cymbal = OS_CLOSEDHAT01;
var beat1 = "-00-00+++00--0-0";
var beat2 = "0--0--000--00-0-";

makeBeat(synth, 1, 1, beat1);
makeBeat(cymbal, 2, 1, beat2);`,

    "add-beats-examples-of-beats.py": `# Examples of beats: Creating beats in different genres

# Setup
from earsketch import *
setTempo(120)

# Sound clips
kick = OS_KICK05  # This is the "boom" sound.
snare = OS_SNARE01  # This is the "cat" sound.
hihat = OS_CLOSEDHAT01  # This is the "ts" sound.

# Rock beat on measure 1
makeBeat(kick, 1, 1, "0+++----0+++----")
makeBeat(snare, 2, 1, "----0+++----0+++")
makeBeat(hihat, 3, 1, "0+0+0+0+0+0+0+0+")

# Hip hop beat on measure 3
makeBeat(kick, 1, 3, "0+++------0+++--")
makeBeat(snare, 2, 3, "----0++0+0++0+++")
makeBeat(hihat, 3, 3, "0+0+0+0+0+0+0+0+")

# Jazz beat on measure 5
makeBeat(hihat, 3, 5, "0++0+00++0+0")

# Dembow (latin, caribbean) beat on measure 7
makeBeat(kick, 1, 7, "0+++0+++0+++0+++")
makeBeat(snare, 2, 7, "---0++0+---0++0+")`,

    "add-beats-examples-of-beats.js": `// Examples of beats: Creating beats in different genres

// Setup
setTempo(120);

// Sound clips
var kick = OS_KICK05; // This is the "boom" sound.
var snare = OS_SNARE01; // This is the "cat" sound.
var hihat = OS_CLOSEDHAT01; // This is the "ts" sound.

// Rock beat on measure 1
makeBeat(kick, 1, 1, "0+++----0+++----");
makeBeat(snare, 2, 1, "----0+++----0+++");
makeBeat(hihat, 3, 1, "0+0+0+0+0+0+0+0+");

// Hip hop beat on measure 3
makeBeat(kick, 1, 3, "0+++------0+++--");
makeBeat(snare, 2, 3, "----0++0+0++0+++");
makeBeat(hihat, 3, 3, "0+0+0+0+0+0+0+0+");

// Jazz beat on measure 5
makeBeat(hihat, 3, 5, "0++0+00++0+0");

// Dembow (latin, caribbean) beat on measure 7
makeBeat(kick, 1, 7, "0+++0+++0+++0+++");
makeBeat(snare, 2, 7, "---0++0+---0++0+");`,

    "loops-and-layers-looping-my-beats.py": `# Looping my beats: Looping a makeBeat() instruction with a for loop

# Setup
from earsketch import *
setTempo(120)

# Variables
drum1 = OS_SNARE03
beatString = "0---0---0-0-0---"

# Looping our beat
for measure in range(1, 5):
    makeBeat(drum1, 1, measure, beatString)`,

    "loops-and-layers-looping-my-beats.js": `// Looping my beats: Looping a makeBeat() instruction with a for loop

// Setup:
setTempo(120);

// Variables
var drum1 = OS_SNARE03;
var beatString = "0---0---0-0-0---";

// Looping our beat
for (var measure = 1; measure < 5; measure++) {
    makeBeat(drum1, 1, measure, beatString);
}`,

    "loops-and-layers-printing.py": `# Printing: Using print() to print messages in the console

# Setup
from earsketch import *
setTempo(120)

# Variables
drum1 = OS_SNARE03
beatString = "0---0---0-0-0---"

# First print statement
print(1 + 3)

# Looping our beat
# Note that the print statement is in the for loop so it will be executed at each iteration of the loop.
for measure in range(1, 5):
    makeBeat(drum1, 1, measure, beatString)
    print(measure)
    print("ok")`,

    "loops-and-layers-printing.js": `// Printing: Using println() to print messages in the console

// Setup
setTempo(120);

// Variables
var drum1 = OS_SNARE03;
var beatString = "0---0---0-0-0---";

// First print statement
println(1 + 3);

// Looping our beat
// Note that the print statement is in the for loop so it will be executed at each iteration of the loop.
for (var measure = 1; measure < 5; measure++) {
    makeBeat(drum1, 1, measure, beatString);
    println(measure);
    println("ok");
}`,

    "loops-and-layers-no-loops.py": `# No loops: Musical repetition created without code loops

# Setup
from earsketch import *
setTempo(120)

# Music
drums1 = ELECTRO_DRUM_MAIN_BEAT_008
drums2 = ELECTRO_DRUM_MAIN_BEAT_007

# All of these fitMedia() calls could be replaced with two calls placed in a loop.
fitMedia(drums1, 1, 1, 1.5)
fitMedia(drums2, 1, 1.5, 2)
fitMedia(drums1, 1, 2, 2.5)
fitMedia(drums2, 1, 2.5, 3)
fitMedia(drums1, 1, 3, 3.5)
fitMedia(drums2, 1, 3.5, 4)
fitMedia(drums1, 1, 4, 4.5)
fitMedia(drums2, 1, 4.5, 5)
fitMedia(drums1, 1, 5, 5.5)
fitMedia(drums2, 1, 5.5, 6)
fitMedia(drums1, 1, 6, 6.5)
fitMedia(drums2, 1, 6.5, 7)
fitMedia(drums1, 1, 7, 7.5)
fitMedia(drums2, 1, 7.5, 8)
fitMedia(drums1, 1, 8, 8.5)
fitMedia(drums2, 1, 8.5, 9)`,

    "loops-and-layers-no-loops.js": `// No loops: Musical repetition created without code loops

// Setup
setTempo(120);

// Music
var drums1 = ELECTRO_DRUM_MAIN_BEAT_008;
var drums2 = ELECTRO_DRUM_MAIN_BEAT_007;

// All of these fitMedia() calls could be replaced with two calls placed in a loop.
fitMedia(drums1, 1, 1, 1.5);
fitMedia(drums2, 1, 1.5, 2);
fitMedia(drums1, 1, 2, 2.5);
fitMedia(drums2, 1, 2.5, 3);
fitMedia(drums1, 1, 3, 3.5);
fitMedia(drums2, 1, 3.5, 4);
fitMedia(drums1, 1, 4, 4.5);
fitMedia(drums2, 1, 4.5, 5);
fitMedia(drums1, 1, 5, 5.5);
fitMedia(drums2, 1, 5.5, 6);
fitMedia(drums1, 1, 6, 6.5);
fitMedia(drums2, 1, 6.5, 7);
fitMedia(drums1, 1, 7, 7.5);
fitMedia(drums2, 1, 7.5, 8);
fitMedia(drums1, 1, 8, 8.5);
fitMedia(drums2, 1, 8.5, 9);`,

    "loops-and-layers-loops.py": `# Loops: Musical repetition created with code loops

# Setup
from earsketch import *
setTempo(120)

# Music
drums1 = ELECTRO_DRUM_MAIN_BEAT_008
drums2 = ELECTRO_DRUM_MAIN_BEAT_007

# Using a loop instead of repeatedly writing similar lines of code
for measure in range(1, 9):
    fitMedia(drums1, 1, measure, measure + 0.5)
    fitMedia(drums2, 1, measure + 0.5, measure + 1)`,

    "loops-and-layers-loops.js": `// Loops: Musical repetition created with code loops

// Setup
setTempo(120);

// Music
var drums1 = ELECTRO_DRUM_MAIN_BEAT_008;
var drums2 = ELECTRO_DRUM_MAIN_BEAT_007;

// Using a loop instead of repeatedly writing similar lines of code
for (var measure = 1; measure < 9; measure = measure + 1) {
    fitMedia(drums1, 1, measure, measure + 0.5);
    fitMedia(drums2, 1, measure + 0.5, measure + 1);
}`,

    "loops-and-layers-incrementing.py": `# Incrementing: Creating an alternating drum beat

from earsketch import *
setTempo(120)

groove1 = HIPHOP_DUSTYGROOVE_011
groove2 = HIPHOP_DUSTYGROOVE_010

for measure in range(1, 9, 4):
    fitMedia(groove1, 1, measure, measure + 2)
    fitMedia(groove2, 2, measure + 2, measure + 4)`,

    "loops-and-layers-incrementing.js": `// Incrementing: Creating an alternating drum beat

setTempo(120);

var groove1 = HIPHOP_DUSTYGROOVE_011;
var groove2 = HIPHOP_DUSTYGROOVE_010;

for (var measure = 1; measure < 9; measure = measure + 4) {
    fitMedia(groove1, 1, measure, measure + 2);
    fitMedia(groove2, 2, measure + 2, measure + 4);
}`,

    "effects-and-envelopes-volume-effect.py": `# Volume Effect: Modifying the volume of 2 tracks

# Setup
from earsketch import *
setTempo(120)

# Variables
piano1 = COMMON_LOVE_THEME_PIANO_2
percussions1 = HOUSE_BREAK_FILL_002

# Placing the sounds:
fitMedia(piano1, 1, 1, 5)
fitMedia(percussions1, 2, 3, 5)

# Mixing: increase the piano track and reduce the percussion track volumes
setEffect(1, VOLUME, GAIN, 2)
setEffect(2, VOLUME, GAIN, -15)`,

    "effects-and-envelopes-volume-effect.js": `// Volume Effect: Modifying the volume of 2 tracks

// Setup
setTempo(120);

// Variables
var piano1 = COMMON_LOVE_THEME_PIANO_2;
var percussions1 = HOUSE_BREAK_FILL_002;

// Placing the sounds
fitMedia(piano1, 1, 1, 5);
fitMedia(percussions1, 2, 3, 5);

// Mixing: increase the piano track and reduce the percussion track volumes
setEffect(1, VOLUME, GAIN, 2);
setEffect(2, VOLUME, GAIN, -15);`,

    "effects-and-envelopes-delay-effect.py": `# Delay Effect: Adding delay to a track

# Setup
from earsketch import *
setTempo(120)

# Music
lead1 = EIGHT_BIT_ATARI_SYNTH_001
lead2 = EIGHT_BIT_ATARI_SYNTH_002
pad1 = EIGHT_BIT_ATARI_PAD_002
pad2 = EIGHT_BIT_ATARI_PAD_003
drums1 = EIGHT_BIT_ANALOG_DRUM_LOOP_004
drums2 = EIGHT_BIT_ANALOG_DRUM_LOOP_003

fitMedia(lead1, 1, 1, 7)
fitMedia(lead2, 1, 7, 9)

fitMedia(pad1, 2, 1, 3)
fitMedia(pad2, 2, 3, 5)
fitMedia(pad1, 2, 5, 7)
fitMedia(pad2, 2, 7, 9)

fitMedia(drums1, 3, 3, 5)
fitMedia(drums2, 3, 5, 9)

# Effects
# setEffect(1, DELAY, DELAY_TIME, 500)  # Adds a delay (echo) effect at intervals of 500ms.
# setEffect(1, DELAY, DELAY_FEEDBACK, -20.0)  # Lowers the relative amount of repeats (default is -3.0).`,

    "effects-and-envelopes-delay-effect.js": `// Delay Effect: Adding delay to a track

// Setup
setTempo(120);

// Music
var lead1 = EIGHT_BIT_ATARI_SYNTH_001;
var lead2 = EIGHT_BIT_ATARI_SYNTH_002;
var pad1 = EIGHT_BIT_ATARI_PAD_002;
var pad2 = EIGHT_BIT_ATARI_PAD_003;
var drums1 = EIGHT_BIT_ANALOG_DRUM_LOOP_004;
var drums2 = EIGHT_BIT_ANALOG_DRUM_LOOP_003;

fitMedia(lead1, 1, 1, 7);
fitMedia(lead2, 1, 7, 9);
fitMedia(pad1, 2, 1, 3);
fitMedia(pad2, 2, 3, 5);
fitMedia(pad1, 2, 5, 7);
fitMedia(pad2, 2, 7, 9);
fitMedia(drums1, 3, 3, 5);
fitMedia(drums2, 3, 5, 9);

// Effects
// setEffect(1, DELAY, DELAY_TIME, 500); // Adds a delay (echo) effect at intervals of 500ms
// setEffect(1, DELAY, DELAY_FEEDBACK, -20.0); // Lowers the relative amount of repeats (default is -3.0)`,

    "effects-and-envelopes-envelopes.py": `# Envelopes: Making envelopes with 7-parameter setEffect()

# Setup
from earsketch import *
setTempo(120)

# Music
fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9)

# Makes an effect ramp between measures 1 and 3, moving from -60dB to 0dB.
# This is a fade in
setEffect(1, VOLUME, GAIN, -60, 1, 0, 3)`,

    "effects-and-envelopes-envelopes.js": `// Envelopes: Making envelopes with 7-parameter setEffect()

// Setup
setTempo(120);

// Music
fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9);

// Makes an effect ramp between measures 1 and 3, moving from -60dB to 0dB.
// This is a fade in
setEffect(1, VOLUME, GAIN, -60, 1, 0, 3);`,

    "effects-and-envelopes-complex-envelopes.py": `# Complex Envelopes: Using multiple setEffect() calls on a track to make changes in the effect envelope

# Setup
from earsketch import *
setTempo(120)

# Music
fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9)

# Envelope time points (in measures)
pointA = 1
pointB = 4
pointC = 6.5
pointD = 7
pointE = 8.5
pointF = 9

setEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB)  # First effect, filter sweep

# Second effect, volume changes
setEffect(1, VOLUME, GAIN, -10, pointB, 0, pointC)  # Crescendo
setEffect(1, VOLUME, GAIN, 0, pointD, -10, pointE)  # Begin fade out
setEffect(1, VOLUME, GAIN, -10, pointE, -60, pointF)  # End of fade out`,

    "effects-and-envelopes-complex-envelopes.js": `// Complex Envelopes: Using multiple setEffect() calls on a track to make changes in the effect envelope

// Setup
setTempo(120);

// Music
fitMedia(ELECTRO_ANALOGUE_LEAD_012, 1, 1, 9);

// Envelope time points (in measures)
var pointA = 1;
var pointB = 4;
var pointC = 6.5;
var pointD = 7;
var pointE = 8.5;
var pointF = 9;

setEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB); // First effect, filter sweep

// Second effect, volume changes
setEffect(1, VOLUME, GAIN, -10, pointB, 0, pointC); // Crescendo
setEffect(1, VOLUME, GAIN, 0, pointD, -10, pointE); // Begin fade out
setEffect(1, VOLUME, GAIN, -10, pointE, -60, pointF); // End of fade out`,

    "effects-and-envelopes-rhythmic-ramps.py": `# Rhythmic Ramps: Automating effects with a for loop

# Setup
from earsketch import *
setTempo(120)

# Music
fitMedia(Y33_CHOIR_1, 1, 1, 9)
fitMedia(RD_ELECTRO_MAINBEAT_5, 2, 1, 9)

for measure in range(1, 9):
    setEffect(1, VOLUME, GAIN, -60, measure, 0, measure + 1)`,

    "effects-and-envelopes-rhythmic-ramps.js": `// Rhythmic Ramps: Automating effects with a for loop

// Setup
setTempo(120);

// Music
fitMedia(Y33_CHOIR_1, 1, 1, 9);
fitMedia(RD_ELECTRO_MAINBEAT_5, 2, 1, 9);

for (var measure = 1; measure < 9; measure++) {
    setEffect(1, VOLUME, GAIN, -60, measure, 0, measure + 1);
}`,

    "effects-and-envelopes-fade-in-and-fade-out.py": `# Fade in and fade out: Looping on all tracks to add a fade in and fade out

# Setup
from earsketch import *
setTempo(100)

# Variables
melody1 = MILKNSIZZ_ADIOS_BRASS
melody2 = MILKNSIZZ_ADIOS_STRINGS
kick = OS_KICK04
hihat = OS_OPENHAT03
kickBeat = "0-------0-0-0---"
hihatBeat = "---0---0--00----"

# Placing melodies on track 1
fitMedia(melody1, 1, 1, 5)
fitMedia(melody2, 1, 5, 9)

# Placing the beats on tracks 2 (kick) and 3 (hihat) thanks to a for loop on measure
for measure in range(1, 9):
    makeBeat(kick, 2, measure, kickBeat)
    makeBeat(hihat, 3, measure, hihatBeat)

# Adding the fade in and fade out on tracks 1 through 3
for track in range(1, 4):
    setEffect(track, VOLUME, GAIN, -60, 1, 0, 3)
    setEffect(track, VOLUME, GAIN, 0, 7, -60, 9)`,

    "effects-and-envelopes-fade-in-and-fade-out.js": `// Fade in and fade out: Looping on all tracks to add a fade in and fade out

// Setup
setTempo(100);

// Variables
var melody1 = MILKNSIZZ_ADIOS_BRASS;
var melody2 = MILKNSIZZ_ADIOS_STRINGS;
var kick = OS_KICK04;
var hihat = OS_OPENHAT03;
var kickBeat = "0-------0-0-0---";
var hihatBeat = "---0---0--00----";

// Placing melodies on track 1
fitMedia(melody1, 1, 1, 5);
fitMedia(melody2, 1, 5, 9);

// Placing the beats on tracks 2 (kick) and 3 (hihat) thanks to a for loop on measure
for (var measure = 1; measure < 9; measure++) {
    makeBeat(kick, 2, measure, kickBeat);
    makeBeat(hihat, 3, measure, hihatBeat);
}

// Adding the fade in and fade out on tracks 1 through 3
for (var track = 1; track < 4; track++) {
    setEffect(track, VOLUME, GAIN, -60, 1, 0, 3);
    setEffect(track, VOLUME, GAIN, 0, 7, -60, 9);
}`,

    "mixing-with-conditionals-analyzetrack.py": `# analyzeTrack(): Using the analyzeTrack() function to print the loudness of a track

# Setup
from earsketch import *
setTempo(120)

# Placing a sound on track 1
sound = COMMON_LOVE_VOX_COMMON_1
fitMedia(sound, 1, 1, 9)

# Creating a variable to store the loudness of track 1
loudness1 = analyzeTrack(1, RMS_AMPLITUDE)

# Showing the loudness in the console
print(loudness1)`,

    "mixing-with-conditionals-analyzetrack.js": `// analyzeTrack(): Using the analyzeTrack() function to print the loudness of a track

// Setup
setTempo(120);

// Placing a sound on track 1
var sound = COMMON_LOVE_VOX_COMMON_1;
fitMedia(sound, 1, 1, 9);

// Creating a variable to store the loudness of track 1
var loudness1 = analyzeTrack(1, RMS_AMPLITUDE);

// Showing the loudness in the console
println(loudness1);`,

    "mixing-with-conditionals-boolean-example.py": `# Boolean Example: We analyze the loudness of our tracks

# Setup
from earsketch import *
setTempo(120)

# Creating 2 tracks
melody1 = RD_CINEMATIC_SCORE_STRINGS_14
melody2 = RD_UK_HOUSE__5THCHORD_1
fitMedia(melody1, 1, 1, 9)
fitMedia(melody2, 2, 1, 9)

# Evaluating the loudness of the tracks
loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE)
loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE)

# Checking if track 1 is louder than track 2
# We create the boolean comparison1
comparison1 = loudnessTrack1 > loudnessTrack2
print("Is Track 1 louder than track 2?")
print(comparison1)

# Creating a for loop to compare each track's loudness to 0.01
for track in range(1, 3):
    loudness = analyzeTrack(track, RMS_AMPLITUDE)
    print("Is track number " + str(track) + " greater than 0.01?")
    print(loudness > 0.01)`,

    "mixing-with-conditionals-boolean-example.js": `// Boolean Example: We analyze the loudness of our tracks

// Setup
setTempo(120);

// Creating 2 tracks
var melody1 = RD_CINEMATIC_SCORE_STRINGS_14;
var melody2 = RD_UK_HOUSE__5THCHORD_1;
fitMedia(melody1, 1, 1, 9);
fitMedia(melody2, 2, 1, 9);

// Evaluating the loudness of the tracks
var loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE);
var loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE);

// Checking if track 1 is louder than track 2
// We create the boolean comparison1
var comparison1 = (loudnessTrack1 > loudnessTrack2);
println("Is track 1 louder than track 2?");
println(comparison1);

// Creating a for loop to compare each track's loudness to 0.01
for (var track = 1; track < 3; track++) {
    var loudness = analyzeTrack(track, RMS_AMPLITUDE);
    println("Is track number " + track + " greater than 0.01?");
    println(loudness > 0.01);
}`,

    "mixing-with-conditionals-condition.py": `if condition:
    # Here write the instructions the computer needs to execute if the condition evaluates to True
    # Note that the instructions are indented, just like in for loops`,

    "mixing-with-conditionals-condition.js": `if (condition) {
    // Here write the instructions the computer needs to execute if the condition evaluates to True
    // Note that the instructions are indented, just like in for loops
}`,

    "mixing-with-conditionals-automatic-mixing-1.py": `# Automatic mixing 1: If track 1 is louder than track 2, we'll reduce its volume

# Setup
from earsketch import *
setTempo(120)

# Creating 2 tracks
melody1 = RD_CINEMATIC_SCORE_STRINGS_14
melody2 = RD_UK_HOUSE__5THCHORD_1
fitMedia(melody1, 1, 1, 9)
fitMedia(melody2, 2, 1, 9)

# Evaluating the loudness of the tracks
loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE)
loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE)

# If track 1 is louder than track 2, we reduce its volume
if loudnessTrack1 > loudnessTrack2:
    setEffect(1, VOLUME, GAIN, -10)`,

    "mixing-with-conditionals-automatic-mixing-1.js": `// Automatic mixing 1: If track 1 is louder than track 2, we'll reduce its volume

// Setup
setTempo(120);

// Creating 2 tracks
var melody1 = RD_CINEMATIC_SCORE_STRINGS_14;
var melody2 = RD_UK_HOUSE__5THCHORD_1;
fitMedia(melody1, 1, 1, 9);
fitMedia(melody2, 2, 1, 9);

// Evaluating the loudness of the tracks
var loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE);
var loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE);

// If track 1 is louder than track 2, we reduce its volume
if (loudnessTrack1 > loudnessTrack2) {
    setEffect(1, VOLUME, GAIN, -10);
}`,

    "mixing-with-conditionals-condition1.py": `if condition1:
    # Here write the instructions the computer needs to execute if the condition1 evaluates to True. If it's False, move to the next line
elif condition2:
    # Here write the instructions if condition2 is True. If condition2 is False, move to the next line
elif condition3:
    # Here write the instructions if condition3 is True. If condition3 is False, move to the next line
else:
    # Here write the instructions in case all 3 conditions are False`,

    "mixing-with-conditionals-condition1.js": `if (condition1) {
    // Here write the instructions the computer needs to execute if the condition1 evaluates to true
} else if (condition2) {
    // Here write the instructions if condition2 is True. If condition2 is False, move to the next line
    // elif is short for else if
} else if (condition3) {
    // Here write the instructions if condition3 is True. If condition3 is False, move to the next line
} else {
    // Here write the instructions in case all 3 conditions are False
}`,

    "mixing-with-conditionals-automatic-mixing-2.py": `# Automatic Mixing 2: Using conditional statements to mix the tracks

# Setup
from earsketch import *
setTempo(120)

# Adding a melody and bass
melody1 = YG_ALT_POP_GUITAR_3
melody2 = YG_ALT_POP_GUITAR_1
bass1 = YG_ALT_POP_BASS_1
bass2 = DUBSTEP_SUBBASS_008
strings = YG_HIP_HOP_STRINGS_4
fitMedia(melody1, 1, 1, 9)
fitMedia(melody2, 1, 9, 17)
fitMedia(bass1, 2, 1, 9)
fitMedia(bass2, 2, 9, 17)
fitMedia(strings, 3, 9, 17)

# Adding percussion using makeBeat()
beatKick = "0---0-----0-0---"
beatSnare = "--0-0------000-"
soundKick = OS_KICK02
soundSnare = OS_SNARE06
for measure in range(5, 17):
    makeBeat(soundKick, 4, measure, beatKick)
    makeBeat(soundSnare, 5, measure, beatSnare)

# Mixing my tracks
# First, we analyze the tracks for loudness
loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE)
print("The loudness of track 1 is" + str(loudnessTrack1))
loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE)
print("The loudness of track 2 is" + str(loudnessTrack2))
loudnessTrack3 = analyzeTrack(3, RMS_AMPLITUDE)
print("The loudness of track 3 is" + str(loudnessTrack3))

if loudnessTrack1 < loudnessTrack2:
    # if track 1 is quieter than track 2 then we increase the volume of track 1
    setEffect(1, VOLUME, GAIN, +5)
    print("track 1 was quieter than track 2")
elif loudnessTrack1 < loudnessTrack3:
    # if track 1 is louder than track 2 but quieter than track 3, we increase the volume of track 1
    setEffect(1, VOLUME, GAIN, +5)
    print("track 1 was quieter than track 3")
else:
    # if track 1 is louder than tracks 2 and 3, then we change nothing
    print("track 1 was the loudest track already")`,

    "mixing-with-conditionals-automatic-mixing-2.js": `// Automatic Mixing 2: Using conditional statements to mix the tracks

// Setup
setTempo(120);

// Adding a melody and bass
var melody1 = YG_ALT_POP_GUITAR_3;
var melody2 = YG_ALT_POP_GUITAR_1;
var bass1 = YG_ALT_POP_BASS_1;
var bass2 = DUBSTEP_SUBBASS_008;
var strings = YG_HIP_HOP_STRINGS_4;
fitMedia(melody1, 1, 1, 9);
fitMedia(melody2, 1, 9, 17);
fitMedia(bass1, 2, 1, 9);
fitMedia(bass2, 2, 9, 17);
fitMedia(strings, 3, 9, 17);

//  Adding percussion using makeBeat()
var beatKick = "0---0-----0-0---";
var beatSnare = "--0-0------000-";
var soundKick = OS_KICK02;
var soundSnare = OS_SNARE06;
for (var measure = 5; measure < 17; measure++) {
    makeBeat(soundKick, 4, measure, beatKick);
    makeBeat(soundSnare, 5, measure, beatSnare);
}

// Mixing my tracks
// First, we analyze the tracks for loudness
var loudnessTrack1 = analyzeTrack(1, RMS_AMPLITUDE);
println("The loudness of track 1 is" + loudnessTrack1);
var loudnessTrack2 = analyzeTrack(2, RMS_AMPLITUDE);
println("The loudness of track 2 is" + loudnessTrack2);
var loudnessTrack3 = analyzeTrack(3, RMS_AMPLITUDE);
println("The loudness of track 3 is" + loudnessTrack3);

if (loudnessTrack1 < loudnessTrack2) {
    // if track 1 is quieter than track 2 then we increase the volume of track 1
    setEffect(1, VOLUME, GAIN, +5);
    println("track 1 was quieter than track 2");
} else if (loudnessTrack1 < loudnessTrack3) {
    // if track 1 is louder than track 2 but quieter than track 3, we increase the volume of track 1
    setEffect(1, VOLUME, GAIN, +5);
    println("track 1 was quieter than track 3");
} else {
    // if track 1 is louder than tracks 2 and 3, then we change nothing
    println("track 1 was the loudest track already");
}`,

    "custom-functions-a-b-a-form.py": `# A-B-A Form: A song with A and B sections

# Setup
from earsketch import *
setTempo(120)

# Music
# Create an A section
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 1, 5)  # main
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5)  # drums
fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 1, 5)  # bass line
setEffect(3, VOLUME, GAIN, -20, 1, 0, 5)  # increasing volume of bass line

# Create a 4 measure B section between measures 5 and 9
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 5, 9)  # main melody differs
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_5, 2, 5, 9)  # drums differ
fitMedia(RD_UK_HOUSE__EVOLVEPAD_3, 3, 5, 9)  # contrasting bass: it's slower and louder
setEffect(3, VOLUME, GAIN, 5, 5, 5, 9)  # increasing bass volume
fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 4, 5, 9)  # rattling: adding a new element

# Then back to section A at measure 9
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 9, 13)  # main
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 9, 13)  # drums
fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 9, 13)  # bass line
setEffect(3, VOLUME, GAIN, -20, 9, 0, 13)  # increasing volume of bass line`,

    "custom-functions-a-b-a-form.js": `// A-B-A Form: A song with A and B sections

// Setup
setTempo(120);

// Music
// Create an A section
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 1, 5); // main
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5); // drums
fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 1, 5); // bass line
setEffect(3, VOLUME, GAIN, -20, 1, 0, 5); // increasing volume of bass line

// Create a 4 measure B section between measures 5 and 9
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, 5, 9); // main melody differs
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_5, 2, 5, 9); // drums differ
fitMedia(RD_UK_HOUSE__EVOLVEPAD_3, 3, 5, 9); // contrasting bass: it's slower and louder
setEffect(3, VOLUME, GAIN, 5, 5, 5, 9); // increasing bass volume
fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 4, 5, 9); // rattling: adding a new element

// Then back to section A at measure 9
fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 9, 13); // main
fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 9, 13); // drums
fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 9, 13); // bass line
setEffect(3, VOLUME, GAIN, -20, 9, 0, 13); // increasing volume of bass line`,

    "custom-functions-section-a.py": `def sectionA():
    # Write your instructions here. This is the body of the function.
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 1, 5)  # main
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5)  # drums
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 1, 5)  # bass line
    setEffect(3, VOLUME, GAIN, -20, 1, 0, 5)  # increasing volume of bass line
    # This code is indented. When writing the rest of your script, make sure you stop indenting.`,

    "custom-functions-section-a.js": `function sectionA() {
    // Write your instructions here. This is the body of the function.
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, 1, 5); // main
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, 1, 5); // drums
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, 1, 5); // bass line
    setEffect(3, VOLUME, GAIN, -20, 1, 0, 5); // increasing volume of bass line
}`,

    "custom-functions-a-b-a-b-form-and-custom-functions.py": `# A-B-A-B Form and custom functions: A song with A and B sections, using custom functions

# Setup
from earsketch import *
setTempo(120)

# Music
# Create an A section function
def sectionA(startMeasure, endMeasure):
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, startMeasure, endMeasure)  # main
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure)  # drums
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, startMeasure, endMeasure)  # bass line
    setEffect(3, VOLUME, GAIN, -20, startMeasure, 0, endMeasure)  # increasing volume of bass line

# Create a B section function
def sectionB(startMeasure, endMeasure):
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, startMeasure, endMeasure)  # main melody differs
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_5, 2, startMeasure, endMeasure)  # drums differ
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_3, 3, startMeasure, endMeasure)  # contrasting bass: it's slower and louder
    setEffect(3, VOLUME, GAIN, 5, startMeasure, 5, endMeasure)  # increasing bass volume
    fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 4, startMeasure, endMeasure)  # rattling: adding a new element

# Call my functions
sectionA(1, 5)
sectionB(5, 9)
sectionA(9, 13)
sectionB(13, 17)`,

    "custom-functions-a-b-a-b-form-and-custom-functions.js": `// A-B-A-B Form and custom functions: A song with A and B sections, using custom functions

// Setup
setTempo(120);

// Music
// Create an A section function
function sectionA(startMeasure, endMeasure) {
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_7, 1, startMeasure, endMeasure); // main
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_24, 2, startMeasure, endMeasure); // drums
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_2, 3, startMeasure, endMeasure); // bass line
    setEffect(3, VOLUME, GAIN, -20, startMeasure, 0, endMeasure); // increasing volume of bass line
}

// Create a B section function
function sectionB(startMeasure, endMeasure) {
    fitMedia(RD_WORLD_PERCUSSION_KALIMBA_PIANO_1, 1, startMeasure, endMeasure); // main melody differs
    fitMedia(RD_WORLD_PERCUSSION_DRUMPART_5, 2, startMeasure, endMeasure); // drums differ
    fitMedia(RD_UK_HOUSE__EVOLVEPAD_3, 3, startMeasure, endMeasure); // contrasting bass: it's slower and louder
    setEffect(3, VOLUME, GAIN, 5, startMeasure, 5, endMeasure); // increasing bass volume
    fitMedia(RD_WORLD_PERCUSSION_SEEDSRATTLE_1, 4, startMeasure, endMeasure); // rattling: adding a new element
}

// Call my functions
sectionA(1, 5);
sectionB(5, 9);
sectionA(9, 13);
sectionB(13, 17);`,

    "custom-functions-transition-techniques-drum-fill.py": `# Transition Techniques - Drum Fill: Transitioning between sections with a drum fill

# Setup
from earsketch import *
setTempo(130)

# Music
leadGuitar1 = RD_ROCK_POPLEADSTRUM_GUITAR_4
leadGuitar2 = RD_ROCK_POPLEADSTRUM_GUITAR_9
bass1 = RD_ROCK_POPELECTRICBASS_8
bass2 = RD_ROCK_POPELECTRICBASS_25
drums1 = RD_ROCK_POPRHYTHM_DRUM_PART_10
drums2 = RD_ROCK_POPRHYTHM_MAINDRUMS_1
drumFill = RD_ROCK_POPRHYTHM_FILL_4

# Section 1
fitMedia(leadGuitar1, 1, 1, 8)
fitMedia(bass1, 2, 1, 8)
fitMedia(drums1, 3, 1, 8)

# Drum Fill
fitMedia(drumFill, 3, 8, 9)

# Section 2
fitMedia(leadGuitar2, 1, 9, 17)
fitMedia(bass2, 2, 9, 17)
fitMedia(drums2, 3, 9, 17)`,

    "custom-functions-transition-techniques-drum-fill.js": `// Transition Techniques - Drum Fill: Transitioning between sections with a drum fill

// Setup
setTempo(130);

// Music
var leadGuitar1 = RD_ROCK_POPLEADSTRUM_GUITAR_4;
var leadGuitar2 = RD_ROCK_POPLEADSTRUM_GUITAR_9;
var bass1 = RD_ROCK_POPELECTRICBASS_8;
var bass2 = RD_ROCK_POPELECTRICBASS_25;
var drums1 = RD_ROCK_POPRHYTHM_DRUM_PART_10;
var drums2 = RD_ROCK_POPRHYTHM_MAINDRUMS_1;
var drumFill = RD_ROCK_POPRHYTHM_FILL_4;

// Section 1
fitMedia(leadGuitar1, 1, 1, 8);
fitMedia(bass1, 2, 1, 8);
fitMedia(drums1, 3, 1, 8);

// Drum Fill
fitMedia(drumFill, 3, 8, 9);

// Section 2
fitMedia(leadGuitar2, 1, 9, 17);
fitMedia(bass2, 2, 9, 17);
fitMedia(drums2, 3, 9, 17);`,

    "custom-functions-transition-techniques-track-droupouts.py": `# Transition Techniques - Track Droupouts: Transitioning between sections with track dropouts

# Setup
from earsketch import *
setTempo(120)

# Music
introLead = TECHNO_ACIDBASS_002
mainLead1 = TECHNO_ACIDBASS_003
mainLead2 = TECHNO_ACIDBASS_005
auxDrums1 = TECHNO_LOOP_PART_025
auxDrums2 = TECHNO_LOOP_PART_030
mainDrums = TECHNO_MAINLOOP_019
bass = TECHNO_SUBBASS_002

# Section 1
fitMedia(introLead, 1, 1, 5)
fitMedia(mainLead1, 1, 5, 9)
fitMedia(auxDrums1, 2, 3, 5)
fitMedia(auxDrums2, 2, 5, 8)  # Drums drop out
fitMedia(mainDrums, 3, 5, 8)

# Section 2
fitMedia(mainLead2, 1, 9, 17)
fitMedia(auxDrums2, 2, 9, 17)  # Drums enter back in
fitMedia(mainDrums, 3, 9, 17)
fitMedia(bass, 4, 9, 17)`,

    "custom-functions-transition-techniques-track-droupouts.js": `// Transition Techniques - Track Droupouts: Transitioning between sections with track dropouts

// Setup
setTempo(120);

// Music
var introLead = TECHNO_ACIDBASS_002;
var mainLead1 = TECHNO_ACIDBASS_003;
var mainLead2 = TECHNO_ACIDBASS_005;
var auxDrums1 = TECHNO_LOOP_PART_025;
var auxDrums2 = TECHNO_LOOP_PART_030;
var mainDrums = TECHNO_MAINLOOP_019;
var bass = TECHNO_SUBBASS_002;

// Section 1
fitMedia(introLead, 1, 1, 5);
fitMedia(mainLead1, 1, 5, 9);
fitMedia(auxDrums1, 2, 3, 5);
fitMedia(auxDrums2, 2, 5, 8); // Drums drop out
fitMedia(mainDrums, 3, 5, 8);

// Section 2
fitMedia(mainLead2, 1, 9, 17);
fitMedia(auxDrums2, 2, 9, 17); // Drums enter back in
fitMedia(mainDrums, 3, 9, 17);
fitMedia(bass, 4, 9, 17);`,

    "custom-functions-transition-techniques-risers.py": `# Transition Techniques - Risers: Transitioning between sections using risers and a crash cymbal

# Setup
from earsketch import *
setTempo(128)

# Music
synthRise = YG_EDM_SYNTH_RISE_1
airRise = RD_EDM_SFX_RISER_AIR_1
lead1 = YG_EDM_LEAD_1
lead2 = YG_EDM_LEAD_2
kick1 = YG_EDM_KICK_LIGHT_1
kick2 = ELECTRO_DRUM_MAIN_LOOPPART_001
snare = ELECTRO_DRUM_MAIN_LOOPPART_003
crash = Y50_CRASH_2
reverseFX = YG_EDM_REVERSE_FX_1

# Section 1
fitMedia(lead1, 1, 1, 17)
fitMedia(kick1, 2, 9, 17)

# Transition
fitMedia(reverseFX, 3, 16, 17)
fitMedia(synthRise, 4, 13, 17)
fitMedia(airRise, 5, 13, 17)
fitMedia(crash, 6, 17, 19)

# Section 2
fitMedia(lead2, 1, 17, 33)
fitMedia(kick2, 7, 25, 33)
fitMedia(snare, 8, 29, 33)

# Effects
setEffect(1, VOLUME, GAIN, 0, 16, 1, 17)  # Adjusting volumes for better matching
setEffect(4, VOLUME, GAIN, -10)
setEffect(7, VOLUME, GAIN, -20)
setEffect(8, VOLUME, GAIN, -20)`,

    "custom-functions-transition-techniques-risers.js": `// Transition Techniques - Risers: Transitioning between sections using risers and a crash cymbal

// Setup
setTempo(128);

// Music
var synthRise = YG_EDM_SYNTH_RISE_1;
var airRise = RD_EDM_SFX_RISER_AIR_1;
var lead1 = YG_EDM_LEAD_1;
var lead2 = YG_EDM_LEAD_2;
var kick1 = YG_EDM_KICK_LIGHT_1;
var kick2 = ELECTRO_DRUM_MAIN_LOOPPART_001;
var snare = ELECTRO_DRUM_MAIN_LOOPPART_003;
var crash = Y50_CRASH_2;
var reverseFX = YG_EDM_REVERSE_FX_1;

// Section 1
fitMedia(lead1, 1, 1, 17);
fitMedia(kick1, 2, 9, 17);

// Transition
fitMedia(reverseFX, 3, 16, 17);
fitMedia(synthRise, 4, 13, 17);
fitMedia(airRise, 5, 13, 17);
fitMedia(crash, 6, 17, 19);

// Section 2
fitMedia(lead2, 1, 17, 33);
fitMedia(kick2, 7, 25, 33);
fitMedia(snare, 8, 29, 33);

// Effects
setEffect(1, VOLUME, GAIN, 0, 16, 1, 17); // Adjusting volumes for better matching
setEffect(4, VOLUME, GAIN, -10);
setEffect(7, VOLUME, GAIN, -20);
setEffect(8, VOLUME, GAIN, -20);`,

    "custom-functions-total-atlanta-song-of-summer.py": `# Total Atlanta Song of Summer: creating a complete song with abstractions
# Intro-A-B-A-B

from earsketch import *
setTempo(110)

# Sound variables
melody1 = EIGHT_BIT_ATARI_BASSLINE_005
melody2 = DUBSTEP_LEAD_018
melody3 = DUBSTEP_LEAD_017
melody4 = DUBSTEP_LEAD_013
bass1 = HIPHOP_BASSSUB_001
bass2 = RD_TRAP_BASSDROPS_2
brass1 = Y30_BRASS_4
shout = CIARA_SET_TALK_ADLIB_AH_4
piano = YG_RNB_PIANO_4
kick = OS_KICK02
hihat = OS_CLOSEDHAT03

# FUNCTION DEFINITIONS
# Adding drums:
def addingDrums(start, end, pattern):
    # first, we create beat strings, depending on the parameter pattern:
    if pattern == "heavy":
        beatStringKick = "0---0---0---00--"
        beatStringHihat = "-----000----0-00"
    elif pattern == "light":
        beatStringKick = "0-------0---0---"
        beatStringHihat = "--0----0---0---"
    # then we create the beat,
    # on track 3 for the kick and track 4 for the hihat,
    # from measures start to end:
    for measure in range(start, end):
        # here we will place our beat on "measure",
        # which is first equal to "start",
        # which is a parameter of the function
        makeBeat(kick, 3, measure, beatStringKick)
        makeBeat(hihat, 4, measure, beatStringHihat)

# Intro:
def intro(start, end):
    fitMedia(melody1, 1, start, start + 1)
    fitMedia(melody1, 1, start + 2, start + 3)
    fitMedia(bass1, 2, start, start + 3)
    # transition:
    fitMedia(bass2, 2, start + 3, end)
    fitMedia(shout, 3, start + 3.75, end)

# SectionA:
def sectionA(start, end):
    fitMedia(melody2, 1, start, end)
    fitMedia(brass1, 2, start, end)
    setEffect(2, VOLUME, GAIN, -20, start, -10, end)
    addingDrums(start, end, "heavy")
    # Pitch modulation for transition:
    setEffect(1, BANDPASS, BANDPASS_FREQ, 200, end - 2, 1000, end)

# SectionB:
def sectionB(start, end):
    fitMedia(melody3, 1, start, start + 2)
    fitMedia(melody4, 1, start + 2, end)
    fitMedia(piano, 2, start, end)
    addingDrums(start, end, "light")

# FUNCTION CALLS
intro(1, 5)
sectionA(5, 9)
sectionB(9, 13)
sectionA(13, 17)
sectionB(17, 21)

# Fade out:
for track in range(1, 5):
    setEffect(track, VOLUME, GAIN, 0, 19, -60, 21)
# Lower hihat and kick volume:
setEffect(4, VOLUME, GAIN, -15)
setEffect(3, VOLUME, GAIN, -10)`,

    "custom-functions-total-atlanta-song-of-summer.js": `// Total Atlanta Song of Summer: creating a complete song with abstractions
// Intro-A-B-A-B

setTempo(110);

// Sound variables
var melody1 = EIGHT_BIT_ATARI_BASSLINE_005;
var melody2 = DUBSTEP_LEAD_018;
var melody3 = DUBSTEP_LEAD_017;
var melody4 = DUBSTEP_LEAD_013;
var bass1 = HIPHOP_BASSSUB_001;
var bass2 = RD_TRAP_BASSDROPS_2;
var brass1 = Y30_BRASS_4;
var shout = CIARA_SET_TALK_ADLIB_AH_4;
var piano = YG_RNB_PIANO_4;
var kick = OS_KICK02;
var hihat = OS_CLOSEDHAT03;

// FUNCTION DEFINITIONS
// Adding drums:
function addingDrums(start, end, pattern) {
    // first, we create beat strings, depending on the parameter pattern:
    if (pattern === "heavy") {
        var beatStringKick = "0---0---0---00--";
        var beatStringHihat = "-----000----0-00";
    } else if (pattern === "light") {
        beatStringKick = "0-------0---0---";
        beatStringHihat = "--0----0---0---";
    }
    // then we create the beat,
    // on track 3 for the kick and track 4 for the hihat,
    // from measures start to end:
    for (var measure = start; measure < end; measure++) {
    // here we will place our beat on "measure",
    // which is first equal to "start",
    // which is a parameter of the function
        makeBeat(kick, 3, measure, beatStringKick);
        makeBeat(hihat, 4, measure, beatStringHihat);
    }
}

// Intro:
function intro(start, end) {
    fitMedia(melody1, 1, start, start + 1);
    fitMedia(melody1, 1, start + 2, start + 3);
    fitMedia(bass1, 2, start, start + 3);
    // transition:
    fitMedia(bass2, 2, start + 3, end);
    fitMedia(shout, 3, start + 3.75, end);
}
// SectionA:
function sectionA(start, end) {
    fitMedia(melody2, 1, start, end);
    fitMedia(brass1, 2, start, end);
    setEffect(2, VOLUME, GAIN, -20, start, -10, end);
    addingDrums(start, end, "heavy");
    // Pitch modulation for transition:
    setEffect(1, BANDPASS, BANDPASS_FREQ, 200, end - 2, 1000, end);
}

// SectionB:
function sectionB(start, end) {
    fitMedia(melody3, 1, start, start + 2);
    fitMedia(melody4, 1, start + 2, end);
    fitMedia(piano, 2, start, end);
    addingDrums(start, end, "light");
}

// FUNCTION CALLS
intro(1, 5);
sectionA(5, 9);
sectionB(9, 13);
sectionA(13, 17);
sectionB(17, 21);

// Fade out:
for (var track = 1; track < 5; track++) {
    setEffect(track, VOLUME, GAIN, 0, 19, -60, 21);
}

// Lower hihat and kick volume:
setEffect(4, VOLUME, GAIN, -15);
setEffect(3, VOLUME, GAIN, -10);`,

    "get-user-input-return-statements.py": `# Return Statements: Linking two beats together with return statements

# Setup
from earsketch import *
setTempo(100)

rhythm1 = "0+++0+0+0+--0+00"
rhythm2 = "0+0-00++0-000+++"

# Music
def createBeat(startMeasure, soundClip, beatString):
    endMeasure = startMeasure + 3
    for measure in range(startMeasure, endMeasure):
        makeBeat(soundClip, 1, measure, beatString)

    # Return ending measure so we can use it outside function
    return endMeasure

# Function calls
# Assigning the value we return to a variable
newStart = createBeat(1, HIPHOP_DUSTYGROOVE_007, rhythm1)

# Passing the returned value into another function
createBeat(newStart, HIPHOP_DUSTYGROOVE_010, rhythm2)`,

    "get-user-input-return-statements.js": `// Return Statements: Linking two beats together with return statements

// Setup
setTempo(100);

var rhythm1 = "0+++0+0+0+--0+00";
var rhythm2 = "0+0-00++0-000+++";

// Music
function createBeat(startMeasure, soundClip, beatString) {
    var endMeasure = startMeasure + 3;
    for (var measure = startMeasure; measure < endMeasure; measure++) {
        makeBeat(soundClip, 1, measure, beatString);
    }

    // Return ending measure so we can use it outside function
    return endMeasure;
}

// Function calls
// Assigning the value we return to a variable
var newStart = createBeat(1, HIPHOP_DUSTYGROOVE_007, rhythm1);

// Passing the returned value into another function
createBeat(newStart, HIPHOP_DUSTYGROOVE_010, rhythm2);`,

    "get-user-input-return-statements-2.py": `# Return Statements 2: Returning the end measure of a section function

# Setup
from earsketch import *
setTempo(120)

melody1 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_1
drums1 = RD_WORLD_PERCUSSION_DRUMPART_24

# Function definition
def verse(start):
    end = start + 4
    fitMedia(melody1, 1, start, end)
    fitMedia(drums1, 2, start, end)
    return end

# Function calls
endMeasure = verse(1)  # calling verse function and start is measure 1
print(endMeasure)`,

    "get-user-input-return-statements-2.js": `// Return Statements 2: Returning the end measure of a section function

// Setup
setTempo(120);

var melody1 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_1;
var drums1 = RD_WORLD_PERCUSSION_DRUMPART_24;

// Function definition
function verse(start) {
    var end = start + 4;
    fitMedia(melody1, 1, start, end);
    fitMedia(drums1, 2, start, end);
    return end;
}
// Function calls
var endMeasure = verse(1); // calling verse function and start is measure 1
println(endMeasure);`,

    "get-user-input-conditional-statement.py": `# Conditional statement: Using a boolean to create variation in a function

# Setup
from earsketch import *
setTempo(120)

melody1 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_1
melody2 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_2
drums1 = RD_WORLD_PERCUSSION_DRUMPART_24

# Function definition
def verse(start, variation):
    # variation is either equal to True or False
    if variation:
        fitMedia(melody1, 1, start, start + 4)
    else:
        fitMedia(melody2, 1, start, start + 4)
    fitMedia(drums1, 2, start, start + 4)  # this is outside the conditional statement (no indentation)

# Function calls
verse(1, True)
verse(7, False)`,

    "get-user-input-conditional-statement.js": `// Conditional statement: Using a boolean to create variation in a function

// Setup
setTempo(120);

var melody1 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_1;
var melody2 = RD_WORLD_PERCUSSION_KALIMBA_PIANO_2;
var drums1 = RD_WORLD_PERCUSSION_DRUMPART_24;

// Function definition
function verse(start, variation) {
    // variation is either equal to true or false
    if (variation) {
        fitMedia(melody1, 1, start, start + 4);
    } else {
        fitMedia(melody2, 1, start, start + 4);
    }
    fitMedia(drums1, 2, start, start + 4); // this is outside the conditional statement (no indentation)
}

// Function calls
verse(1, true);
verse(7, false);`,

    "get-user-input-what-tempo.py": `answer = readInput("What tempo would you like for your music?")
print(answer)`,

    "get-user-input-what-tempo.js": `var answer = readInput("What tempo would you like for your music?");
println(answer);`,

    "get-user-input-user-input-1.py": `# User input 1: Asking the user for the tempo

# Setup
from earsketch import *

# Asking for tempo
question = "What tempo would you like for your music? Choose a number between 45 and 220"
answer = readInput(question)

# Converting to an integer
tempo = int(answer)

# Setting the tempo
setTempo(tempo)

# Music
fitMedia(COMMON_LOVE_THEME_STRINGS_1, 1, 1, 5)`,

    "get-user-input-user-input-1.js": `// User input 1: Asking the user for the tempo

// Asking for tempo
var question = "What tempo would you like for your music? Choose a number between 45 and 220";
var answer = readInput(question);

// Converting to a number
var tempo = Number(answer);

// Setting the tempo
setTempo(tempo);

// Music
fitMedia(COMMON_LOVE_THEME_STRINGS_1, 1, 1, 5);`,

    "get-user-input-user-input-2.py": `# User input 2: Creating a dubstep song with user-specified parameters

# Setup
from earsketch import *
setTempo(120)

# Music
clipNumber = readInput("Type a clip number between 10 and 46: ")
dubstepClip = "DUBSTEP_BASS_WOBBLE_0"
finalClip = dubstepClip + clipNumber

# User-selected dubstep wobbles
fitMedia(finalClip, 1, 1, 5)`,

    "get-user-input-user-input-2.js": `// User input 2: Creating a dubstep song with user-specified parameters

// Setup
setTempo(120);

// Music
var clipNumber = readInput("Type a clip number between 10 and 46: ");
var dubstepClip = "DUBSTEP_BASS_WOBBLE_0";
var finalClip = dubstepClip + clipNumber;

// User-selected dubstep wobbles
fitMedia(finalClip, 1, 1, 5);`,

    "get-user-input-boolean-expressions.py": `# Boolean expressions: printing boolean expressions

from earsketch import *

print(not True)
print(True and False)
print(True or False)
print(True and True)
print((True and False) or True)
print(True and not False)
print(not (False or False))`,

    "get-user-input-boolean-expressions.js": `// Boolean expressions: printing boolean expressions

println(!true);
println(true && false);
println(true || false);
println(true && true);
println((true && false) || true);
println(true && !false);
println(!(false || false));`,

    "get-user-input-boolean-operations.py": `# Boolean operations: Asking user for genre and creating beat accordingly

# Setup
from earsketch import *
setTempo(120)

# Sound variables
kick = OS_KICK02
hihat = OS_CLOSEDHAT04
clap = OS_CLAP03

# Beat string variables
hiphopKickBeat = "0++++---0+++0+++"
hiphopHihatBeat = "----0---00---000"
edmKickBeat = "0+++----0+++----"
edmClapBeat = "----0-------0---"

# Requesting user input
genre = readInput("What genre is your favorite? Hip Hop or EDM?")

# Creating the appropriate rhythm
if (genre == "Hip Hop") or (genre == "hip hop") or (genre == "HIP HOP"):
    makeBeat(kick, 1, 1, hiphopKickBeat)
    makeBeat(hihat, 2, 1, hiphopHihatBeat)
elif (genre == "edm") or (genre == "Edm") or (genre == "EDM"):
    makeBeat(kick, 1, 1, edmKickBeat)
    makeBeat(clap, 2, 1, edmClapBeat)
else:
    print("Sorry we couldn't read the genre you selected. Please run the code again.")

# Adding some reverb on track 2
setEffect(2, REVERB, MIX, 0.1)`,

    "get-user-input-boolean-operations.js": `// Boolean operations: Asking user for genre and creating beat accordingly

// Setup
setTempo(120);

// Sound variables
var kick = OS_KICK02;
var hihat = OS_CLOSEDHAT04;
var clap = OS_CLAP03;

// Beat string variables
var hiphopKickBeat = "0++++---0+++0+++";
var hiphopHihatBeat = "----0---00---000";
var edmKickBeat = "0+++----0+++----";
var edmClapBeat = "----0-------0---";

// Requesting user input
var genre = readInput("What genre is your favorite? Hip Hop or EDM?");

// Creating the appropriate rhythm
if ((genre === "Hip Hop") || (genre === "hip hop") || (genre === "HIP HOP")) {
    makeBeat(kick, 1, 1, hiphopKickBeat);
    makeBeat(hihat, 2, 1, hiphopHihatBeat);
} else if ((genre === "edm") || (genre === "Edm") || (genre === "EDM")) {
    makeBeat(kick, 1, 1, edmKickBeat);
    makeBeat(clap, 2, 1, edmClapBeat);
} else {
    println("Sorry we couldn't read the genre you selected. Please run the code again.");
}

// Adding some reverb on track 2
setEffect(2, REVERB, MIX, 0.1);`,

    "data-structures-instead-of-writing-this.py": `# Instead of writing this:
kick = OS_KICK03
hihat = OS_OPENHAT01
snare = OS_SNARE05

# You can write this:
drums = [OS_KICK03, OS_OPENHAT01, OS_SNARE05]`,

    "data-structures-instead-of-writing-this.js": `// Instead of writing this:
var kick = OS_KICK03;
var hihat = OS_OPENHAT01;
var snare = OS_SNARE05;

// You can write this:
var drums = [OS_KICK03, OS_OPENHAT01, OS_SNARE05];`,

    "data-structures-lists.py": `# Lists: Using a list to hold several audio clips

# Setup
from earsketch import *
setTempo(130)

# Music
# Creating a list of clips
myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11]

# Placing sounds from measure 1 to 5
fitMedia(myEnsemble[0], 1, 1, 5)  # accessing index 0
fitMedia(myEnsemble[1], 2, 1, 5)  # accessing index 1
fitMedia(myEnsemble[2], 3, 1, 5)  # accessing index 2`,

    "data-structures-lists.js": `// Arrays: Using an array to hold several audio clips

// Setup
setTempo(130);

// Music
// Creating an array of clips
var myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11];

// Placing sounds from measure 1 to 5
fitMedia(myEnsemble[0], 1, 1, 5); // accessing index 0
fitMedia(myEnsemble[1], 2, 1, 5); // accessing index 1
fitMedia(myEnsemble[2], 3, 1, 5); // accessing index 2`,

    "data-structures-iterating-through-lists.py": `# Iterating through Lists: Using a list to hold several audio clips and placing them in our DAW thanks to a for loop

# Setup
from earsketch import *
setTempo(130)

# Music
# Creating a list of clips
myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11]

# Going through the list
for track in range(1, 4):
    index = track - 1
    fitMedia(myEnsemble[index], track, 1, 5)
    print("this iteration, track = " + str(track) + " and index = " + str(index))`,

    "data-structures-iterating-through-lists.js": `// Iterating through Arrays: Using an array to hold several audio clips and placing them in our DAW thanks to a for loop

// Setup
setTempo(130);

// Music
// Creating an array of clips
var myEnsemble = [RD_ROCK_POPRHYTHM_MAINDRUMS_12, RD_ROCK_POPELECTRICBASS_16, RD_ROCK_POPELECTRICLEAD_11];

// Going through the array
for (var track = 1; track < 4; track++) {
    var index = track - 1;
    fitMedia(myEnsemble[index], track, 1, 5);
    println("this iteration, track = " + track + " and index = " + index);
}`,

    "data-structures-additive-introduction.py": `# Additive Introduction: Creating an additive introduction with list iteration

# Setup
from earsketch import *
setTempo(120)

# Music
introSounds = [HIPHOP_DUSTYGROOVE_003, TECHNO_LOOP_PART_006, HOUSE_SFX_WHOOSH_001, TECHNO_CLUB5THPAD_001]

for measure in range(1, len(introSounds) + 1):
    # we add 1 to len(introSounds) since the second argument of range is exclusive
    index = measure - 1  # zero-based list index
    track = measure  # change track with measure
    fitMedia(introSounds[index], track, measure, 5)`,

    "data-structures-additive-introduction.js": `// Additive Introduction: Creating an additive introduction with array iteration

// Setup
setTempo(120);

// Music
var introSounds = [HIPHOP_DUSTYGROOVE_003, TECHNO_LOOP_PART_006, HOUSE_SFX_WHOOSH_001, TECHNO_CLUB5THPAD_001];

for (var measure = 1; measure < introSounds.length + 1; measure++) {
    // we add 1 to introSounds.length since we want measure to go up to introSounds.length
    var index = measure - 1; // zero-based array index
    var track = measure; // change track with measure
    fitMedia(introSounds[index], track, measure, 5);
}`,

    "data-structures-string-and-lists-operations.py": `# String and Lists Operations: Showing what we can do with lists and strings

# Setup
from earsketch import *
setTempo(120)

# Creating my beat strings and arrays
stringA = "0+++----0+++--0+"
stringB = "0-0-0-0-----0-0-"
soundsA = [RD_FUTURE_DUBSTEP_MAINBEAT_1, RD_FUTURE_DUBSTEP_BASSWOBBLE_2, RD_POP_SFX_NOISERHYTHM_1]
soundsB = [YG_GOSPEL_GUITAR_2, YG_GOSPEL_ORGAN_2]

# Print the second character of each string.
print(stringA[1])
print(stringB[1])

# Print the last element of your lists.
print(soundsA[len(soundsA) - 1])
print(soundsB[len(soundsB) - 1])

# Create and print stringC, the concatenation of stringA and stringB.
stringC = stringA + stringB
print(stringC)

# Create and print soundsC, the concatenation your soundsA, soundsB and soundsA again.
soundsC = soundsA + soundsB + soundsA
print(soundsC)

# Create and print stringD, the slice of stringC from the second to the fifth characters included.
stringD = stringC[1:5]
print(stringD)

# Create and print soundsD, the slice of stringC from the third to the last elements included.
soundsD = soundsC[2 : len(soundsC)]
print(soundsD)`,

    "data-structures-string-and-lists-operations.js": `// String and Array Operations: Showing what we can do with arrays and strings

// Setup
setTempo(120);

// Creating my beat strings and arrays
var stringA = "0+++----0+++--0+";
var stringB = "0-0-0-0-----0-0-";
var soundsA = [RD_FUTURE_DUBSTEP_MAINBEAT_1, RD_FUTURE_DUBSTEP_BASSWOBBLE_2, RD_POP_SFX_NOISERHYTHM_1];
var soundsB = [YG_GOSPEL_GUITAR_2, YG_GOSPEL_ORGAN_2];

// Print the second character of each string.
println(stringA[1]);
println(stringB[1]);

// Print the last element of your arrays.
println(soundsA[soundsA.length - 1]);
println(soundsB[soundsB.length - 1]);

// Create and print stringC, the concatenation of stringA and stringB.
var stringC = stringA + stringB;
println(stringC);

// Create and print soundsC, the concatenation your soundsA, soundsB and soundsA again.
var soundsC = (soundsA.concat(soundsB)).concat(soundsA);
println(soundsC);

// Create and print stringD, the slice of stringC from the second to the fifth characters included.
var stringD = stringC.substring(1, 5);
println(stringD);

// Create and print soundsD, the slice of stringC from the third to the last elements included.
var soundsD = soundsC.slice(2, soundsC.length);
println(soundsD);`,

    "data-structures-string-operations.py": `# String Operations: Expand a beat string into a longer beat string

# Setup
from earsketch import *
setTempo(120)

# Music
initialBeat = "0+0+00-00+++-0++"
drumInstr = RD_UK_HOUSE_MAINBEAT_10

def expander(beatString):
    newBeat = ""
    for i in range(0, len(beatString)):
        beatSlice = beatString[0:i]
        newBeat = newBeat + beatSlice
    # return the new beat string so it can be used outside the function
    return newBeat

finalBeat = expander(initialBeat)
print(finalBeat)

# makeBeat(drumInstr, 1, 1, initialBeat) # initial beat string
makeBeat(drumInstr, 1, 1, finalBeat)`,

    "data-structures-string-operations.js": `// String Operations: Expand a beat string into a longer beat string

// Setup
setTempo(120);

// Music
var initialBeat = "0+0+00-00+++-0++";
var drumInstr = RD_UK_HOUSE_MAINBEAT_10;

function expander(beatString) {
    var newBeat = "";
    for (var i = 0; i < beatString.length; i = i + 1) {
        var beatSlice = beatString.substring(0, i);
        newBeat = newBeat + beatSlice;
    }
    // return the new beat string so it can be used outside the function
    return newBeat;
}

var finalBeat = expander(initialBeat);
println(finalBeat);

// makeBeat(drumInstr, 1, 1, initialBeat); // initial beat string
makeBeat(drumInstr, 1, 1, finalBeat);`,

    "data-structures-making-a-drum-set.py": `# Making a drum set: Using lists with makeBeat()

# Setup
from earsketch import *
setTempo(100)

# Before, we had one track for every sound (measure 1):
kick = OS_KICK05
snare = OS_SNARE01
kickBeat = "0+++----0+++----"
snareBeat = "----0+++----0+++"
makeBeat(kick, 1, 1, kickBeat)
makeBeat(snare, 2, 1, snareBeat)

# Now, we can combine them (measure 3):
drums = [OS_KICK05, OS_SNARE01]
beat = "0+++1+++0+++1+++"
makeBeat(drums, 1, 3, beat)`,

    "data-structures-making-a-drum-set.js": `// Making a drum set: Using arrays with makeBeat()

// Setup
setTempo(100);

// Music
// Before, we had one track for every sound (measure 1):
var kick = OS_KICK05;
var snare = OS_SNARE01;
var kickBeat = "0+++----0+++----";
var snareBeat = "----0+++----0+++";
makeBeat(kick, 1, 1, kickBeat);
makeBeat(snare, 2, 1, snareBeat);

// Now, we can combine them (measure 3):
var drums = [OS_KICK05, OS_SNARE01];
var beat = "0+++1+++0+++1+++";
makeBeat(drums, 1, 3, beat);`,

    "data-structures-examples-of-beats.py": `# Examples of beats: Creating beats in different genres

# Setup
from earsketch import *
setTempo(110)

# Sound clips
drums = [OS_KICK05, OS_SNARE01, OS_CLOSEDHAT01]

# Rock beat on measure 1
makeBeat(drums, 1, 1, "0+++1+++0+++1+++")
makeBeat(drums, 2, 1, "2+2+2+2+2+2+2+2+")

# Hip hop beat on measure 3
makeBeat(drums, 1, 3, "0+++1++1+10+1+++")
makeBeat(drums, 2, 3, "2+2+2+2+2+2+2+2+")

# Jazz beat on measure 5
makeBeat(drums, 2, 5, "2++2+22++2+22++2")

# Dembow (latin, caribbean) beat on measure 7
makeBeat(drums, 1, 7, "0++10+1+0++10+1+")`,

    "data-structures-examples-of-beats.js": `// Examples of beats: Creating beats in different genres

// Setup
setTempo(110);

// Sound clips
var drums = [OS_KICK05, OS_SNARE01, OS_CLOSEDHAT01];

// Rock beat on measure 1
makeBeat(drums, 1, 1, "0+++1+++0+++1+++");
makeBeat(drums, 2, 1, "2+2+2+2+2+2+2+2+");

// Hip hop beat on measure 3
makeBeat(drums, 1, 3, "0+++1++1+10+1+++");
makeBeat(drums, 2, 3, "2+2+2+2+2+2+2+2+");

// Jazz beat on measure 5
makeBeat(drums, 2, 5, "2++2+22++2+22++2");

// Dembow (latin, caribbean) beat on measure 7
makeBeat(drums, 1, 7, "0++10+1+0++10+1+");`,

}
