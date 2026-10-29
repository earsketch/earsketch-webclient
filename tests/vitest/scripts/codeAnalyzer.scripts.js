// Scripts for the Code Analyzer snapshot test.
// These only use sounds available in the local development API's sound library.
export const CODE_ANALYZER_SCRIPTS = {
    "beats.py": `from earsketch import *

setTempo(110)

kick = "0---0---0---0---"
snare = "----0-------0---"

for measure in range(1, 9):
    makeBeat(Y09_KICK_1, 1, measure, kick)
    makeBeat(OS_SNARE03, 2, measure, snare)

fitMedia(YG_FUNK_HIHAT_2, 3, 1, 9)
setEffect(3, VOLUME, GAIN, -6)
`,

    "song.py": `from earsketch import *

setTempo(120)

def section(start, end, bass):
    fitMedia(RD_UK_HOUSE_MAINBEAT_8, 1, start, end)
    if bass:
        fitMedia(RD_POP_SYNTHBASS_6, 2, start, end)
    else:
        fitMedia(YG_FUNK_CONGAS_3, 3, start, end)
    return end

sounds = [RD_POP_TB303LEAD_3, YG_RNB_TAMBOURINE_1]
measure = 1
for i in range(4):
    measure = section(measure, measure + 4, i % 2 == 0)

for index, sound in enumerate(sounds):
    fitMedia(sound, index + 4, 1, measure)

envelope = [-20, 0]
setEffect(4, VOLUME, GAIN, envelope[0], 1, envelope[1], measure)
name = "song" + str(measure)
print(name.upper())
`,

    "song.js": `setTempo(120)

function section(start, end, bass) {
    fitMedia(RD_UK_HOUSE_MAINBEAT_8, 1, start, end)
    if (bass) {
        fitMedia(RD_POP_SYNTHBASS_6, 2, start, end)
    } else {
        fitMedia(YG_FUNK_CONGAS_3, 3, start, end)
    }
    return end
}

var sounds = [RD_POP_TB303LEAD_3, YG_RNB_TAMBOURINE_1]
var measure = 1
for (var i = 0; i < 4; i++) {
    measure = section(measure, measure + 4, i % 2 === 0)
}

for (var j = 0; j < sounds.length; j++) {
    fitMedia(sounds[j], j + 4, 1, measure)
}

var envelope = [-20, 0]
setEffect(4, VOLUME, GAIN, envelope[0], 1, envelope[1], measure)
var name = "song" + measure
println(name.toUpperCase())
`,

    "beats.js": `setTempo(110)

var kick = "0---0---0---0---"
var snare = "----0-------0---"

var measure = 1
while (measure < 9) {
    makeBeat(Y09_KICK_1, 1, measure, kick)
    makeBeat(OS_SNARE03, 2, measure, snare)
    measure++
}

fitMedia(YG_FUNK_HIHAT_2, 3, 1, 9)
setEffect(3, VOLUME, GAIN, -6)
`,

    "error.py": `from earsketch import *

fitMedia(Y09_KICK_1, 1, 1, 5)
fitMedia(OS_SNARE03, 2, 1)
`,
}
