export const pages = [
    {
        headerKey: 'bubble:header.start',
        bodyKey: 'bubble:body.start',
        ref: null
    },
    {
        headerKey: 'bubble:header.codeEditor',
        bodyKey: 'bubble:body.codeEditor',
        ref: '#coder',
        placement: 'top'
    },
    {
        headerKey: 'bubble:header.runCode',
        bodyKey: 'bubble:body.runCode',
        ref: '#run-button',
        placement: 'bottom'
    },
    {
        headerKey: 'bubble:header.previewMusic',
        bodyKey: 'bubble:body.previewMusic',
        ref: '#devctrl',
        placement: 'bottom'
    },
    {
        headerKey: 'bubble:header.playMusic',
        bodyKey: 'bubble:body.playMusic',
        ref: '#daw-play-button',
        placement: 'bottom'
    },
    {
        headerKey: 'bubble:header.exploreCode',
        bodyKey: 'bubble:body.exploreCode',
        ref: '#content-manager',
        placement: 'right'
    },
    {
        headerKey: 'bubble:header.addSounds',
        bodyKey: 'bubble:body.addSounds',
        ref: '#browser-tabs',
        placement: 'right'
    },
    {
        headerKey: 'bubble:header.saveCode',
        bodyKey: 'bubble:body.saveCode',
        ref: '#browser-tabs',
        placement: 'right'
    },
    {
        headerKey: 'bubble:header.readCurriculum',
        bodyKey: 'bubble:body.readCurriculum',
        ref: '#curriculum-navigation',
        placement: 'left'
    },
    {
        headerKey: `bubble:header.end`,
        bodyKey: 'bubble:body.end',
        ref: '#create-script-button',
        placement: 'right'
    }
];

interface SampleScript {
    [language: string]: string
}
export const sampleScript: SampleScript = {
    python:
`from earsketch import *

init()
setTempo(120)

# Add Sounds
fitMedia(RD_UK_HOUSE_MAINBEAT_8, 1, 1, 5)
fitMedia(RD_POP_SYNTHBASS_6, 2, 1, 9)
fitMedia(YG_RNB_TAMBOURINE_1, 4, 1, 9)
fitMedia(YG_FUNK_CONGAS_3, 5, 1, 5)
fitMedia(YG_FUNK_HIHAT_2, 6, 5, 9)
fitMedia(RD_POP_TB303LEAD_3, 7, 5, 9)

# Effects fade in
setEffect(2, VOLUME,GAIN, -20, 1, 6, 5)

# Fills
fillA = "0---0-0-00--0000"
fillB = "0--0--0--0--0-0-"
fillC = "--000-00-00-0-00"
makeBeat(OS_SNARE03, 3, 4, fillA)
makeBeat(COMMON_LOVE_DRUMBEAT_1, 3, 8, fillB)

finish()`,

    javascript:
`"use strict";

init();
setTempo(120);

// Add Sounds
fitMedia(RD_UK_HOUSE_MAINBEAT_8, 1, 1, 5);
fitMedia(RD_POP_SYNTHBASS_6, 2, 1, 9);
fitMedia(YG_RNB_TAMBOURINE_1, 4, 1, 9);
fitMedia(YG_FUNK_CONGAS_3, 5, 1, 5);
fitMedia(YG_FUNK_HIHAT_2, 6, 5, 9);
fitMedia(RD_POP_TB303LEAD_3, 7, 5, 9);

// Effects fade in
setEffect(2, VOLUME,GAIN, -20, 1, 6, 5);

// Fills
var fillA = "0---0-0-00--0000";
var fillB = "0--0--0--0--0-0-";
var fillC = "--000-00-00-0-00";
makeBeat(OS_SNARE03, 3, 4, fillA);
makeBeat(COMMON_LOVE_DRUMBEAT_1, 3, 8, fillB);

finish();`
};