export const pages = [
    {
        header: 'Welcome to EarSketch',
        body: `Are you ready to start coding and composing? If you are a first time user, click <span class="border-2 border-black rounded-full px-2 bg-black text-white font-thin text-xl">Start</span> below for a quick tour of the EarSketch interface. If you are an experienced user, click <span class="border-2 border-black rounded-full px-2 font-normal text-xl">Skip</span> to start coding.
                <br><br>
                *The default coding language for this tour is Python, click below to change to JavaScript.`,
        ref: null
    },
    {
        header: '1/8 Explore the Code Editor',
        body: 'The code editor is your workspace to compose music. It is a text editor with numbered lines.',
        ref: '#coder',
        placement: 'top'
    },
    {
        header: '2/8 Run Your Code',
        body: 'Run your code and see it turn into music. Click the <span class="font-black text-green-600 text-2xl"><i class="align-middle icon icon-arrow-right22"></i>RUN</span> button and view the code in the Digital Audio Workstation located above your code editor.',
        ref: '#run-button',
        placement: 'bottom'
    },
    {
        header: '3/8 Preview your Music',
        body: 'The Digital Audio Workstation (DAW) is a timeline visualization of your code showing time both in seconds and measures. Below the timeline, the audio clips added to your song are placed on tracks.',
        ref: '#devctrl',
        placement: 'bottom'
    },
    {
        header: '4/8 Play your Music',
        body: 'The buttons at the top right of the DAW will allow you to control how to listen to your music. You can play your song by clicking the green triangle <span class="align-middle icon icon-play4 text-green-600 text-2xl"></span>.',
        ref: '#daw-play-button',
        placement: 'bottom'
    },
    {
        header: '5/8 Explore your code',
        body: 'On the left side of screen is the browser area. Click the toggle switch at the top to open / close. There are several types of browsers. We will explore their functions in the next steps.',
        ref: '#content-manager',
        placement: 'right'
    },
    {
        header: '6/8 Add sounds to your code',
        body: 'The first browser is <span class="text-yellow-500 text-3xl align-middle icon icon-headphones"></span> SOUNDS. Scroll and click the folders to discover 4,000+ audio clips to use in your music, composed by popular recording artists.',
        ref: '#browser-tabs',
        placement: 'right'
    },
    {
        header: '7/8 Save your Code',
        body: 'Your code is automatically saved to <span class="text-yellow-500 text-3xl align-middle icon icon-embed2"></span> SCRIPTS. You can search for scripts by date, programming language, and owner.',
        ref: '#browser-tabs',
        placement: 'right'
    },
    {
        header: '8/8 Read the curriculum',
        body: 'On the right side is the curriculum panel. Use the toggle switch to view the curriculum and the Welcome bar to navigate through the content.',
        ref: '#curriculum-navigation',
        placement: 'left'
    },
    {
        header: `End`,
        body: 'Congratulations! You have completed the tour. You are ready to start making music. Click <span class="align-middle icon icon-plus2"></span> to open up a new script and start coding.',
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