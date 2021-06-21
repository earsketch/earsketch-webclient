export const CAI_TREE_NODES : {
    [key: string]: any
} = [{
        id: 0,
        title: "",
        utterance: "[GREETING]",
        parameters: {},
        options: [1]
    },
    {
        id: 1,
        title: "Okay",
        utterance: "let's get started",
        parameters: {},
        options: [76,77,3,4]
    },
    {
        id: 2,
        title: "Maybe later",
        utterance: "OK, I'll wait till you're ready to collaborate",
        parameters: {},
        options: []
    },
    {
        id: 3,
        title: "let me add some sounds",
        utterance: "sounds good. go ahead and run it when you're done so i can listen.[WAIT|11]",
        parameters: {},
        options: []
    },
    {
        id: 4,
        title: "you should suggest sounds",
        utterance: "i think we should start with [sound_rec]",
        parameters: {},
        event: ["soundRequest"],
        options: [5, 6]
    },
    {
        id: 5,
        title: "ok, i'll add it",
        utterance: "should we add more samples?",
        parameters: {},
        options: [8, 91]
    },
    {
        id: 6,
        title: "how about something else?",
        utterance: "we could use one of these\n\n[sound_rec]\n[sound_rec]\n[sound_rec]",
        parameters: {},
        event: ["soundRequest"],
        options: [15, 16, 91]
    },
    {
        id: 7,
        title: "I want to add a different sound.",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds.",
        parameters: {},
        options: []
    },
    {
        id: 8,
        title: "yeah, go ahead",
        utterance: "our next move could be [sound_rec].[SOUNDWAIT|10]",
        parameters: {},
        event: ["soundRequest"],
        options: []
    },
    {
        id: 9,
        title: "no thanks, i've got the next one.",
        utterance: "ok, i'll have a listen next time you run the code.",
        parameters: {},
        options: []
    },
    {
        id: 10,
        title: "",
        utterance: "that sounds good.",
        parameters: {},
        options: []
    },
    {
        id: 11,
        title: "",
        utterance: "sounds good. wanna try [sound_rec] next?",
        parameters: {},
        options: [12, 13]
    },
    {
        id: 12,
        title: "sounds good to me",
        utterance: "cool. let me see what that sounds like when you run it. [WAIT|10]",
        parameters: {},
        options: []
    },
    {
        id: 13,
        title: "no thanks",
        utterance: "ok, i'll let you add some stuff and see where we go from there",
        parameters: {},
        options: []
    },
    {
        id: 14,
        title: "I have a specific instrument in mind.",
        utterance: "Sure! Which instrument do you want to add?",
        parameters: {},
        dropup: "Instruments",
        options: [37, 38, 39, 40, 41, 42, 43, 44, 45]
    },
    {
        id: 15,
        title: "ok, i like one of those",
        utterance: "i have another one we could add if you want",
        parameters: {},
        options: [18, 19, 91]
    },
    {
        id: 16,
        title: "can i see some more ideas?",
        utterance: "what about\n\n[sound_rec]\n[sound_rec]",
        parameters: {},
        event: ["soundRequest"],
        options: [15, 16, 91]
    },
    {
        id: 17,
        title: "The third one is best",
        utterance: "Awesome choice! Would you like me to suggest another sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {
        id: 18,
        title: "sure",
        utterance: "we could try [sound_rec][SOUNDWAIT|10]",
        parameters: {},
        event: ["soundRequest"],
        options: [19, 6]
    },
    {
        id: 19,
        title: "no thanks",
        utterance: "no worries",
        parameters: {},
        options: []
    },
    {
        id: 20,
        title: "what about something else?",
        utterance: "Sure! Will these suggestions work?\n[sound_rec]\n[sound_rec]\n[sound_rec]",
        parameters: {},
        options: [15, 16, 17, 91]
    },
    {
        id: 21,
        title: "The first one works.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {
        id: 22,
        title: "I like the second one.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {
        id: 23,
        title: "The third one is best.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {
        id: 24,
        title: "",
        utterance: "Do you need some help with the code?[ERRORWAIT|28]",
        parameters: {},
        options: [25, 26]
    },
    {
        id: 25,
        title: "No, I want to try and fix it.",
        utterance: "[ERRORWAIT|28]",
        parameters: {},
        options: [31]
    },
    {
        id: 26,
        title: "do you know anything about the error i'm getting?",
        utterance: "[ERROREXPLAIN][ERRORWAIT|28]",
        parameters: {},
        event: ["errorRequest"],
        options: []
    },
    {
        id: 27,
        title: "Yes, can you help fix the error?",
        utterance: "[ERRORFIX|29|30]",
        parameters: {},
        options: []
    },
    {
        id: 28,
        title: "",
        utterance: "good, it works now.",
        parameters: {},
        options: []
    },
    {
        id: 29,
        title: "",
        utterance: "I was able to fix the error. Let's see if it runs now.[ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {
        id: 30,
        title: "",
        utterance: "I am not sure how to fix this error. I think we should look at the curriculum for help.[ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {
        id: 31,
        title: "Can you help me?",
        utterance: "Sure. What can I help with?",
        parameters: {},
        options: [32]
    },
    {
        id: 32,
        title: "How do I fix it?",
        utterance: "[ERROREXPLAIN][ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {
        id: 33,
        title: "Can you fix the error?",
        utterance: "[ERRORFIX|29|30]",
        parameters: {},
        options: []
    },
    {
        id: 34, //- BEGIN CODE SUGGESTION TREE
        title: "",
        utterance: "[SUGGESTION][RESET_PARAMS]",
        event: ["codeRequest"],
        parameters: {},
        options: [35, 92]
    },
    {
        id: 35,
        title: "can you explain more?",
        utterance: "[SUGGESTIONEXPLAIN]",
        parameters: {},
        options: [36, 92]
    },
    {
        id: 36,
        title: "i'm still not 100% on that. do you have an example?",
        utterance: "[SUGGESTIONEXAMPLE]",
        parameters: {},
        options: []
    },
    {
        id: 37,
        title: "Bass",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "BASS" },
        options: [19, 6,5]
    },
    {
        id: 38,
        title: "Drums",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "DRUMS" },
        options: [19, 6,5]
    },
    {
        id: 39,
        title: "Freesound[WAIT|34]",
        utterance: "How about [sound_rec]?",
        parameters: { INSTRUMENT: "FREESOUND" },
        options: [19, 6,5]
    },
    {
        id: 40,
        title: "Keyboard",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "KEYBOARD" },
        options: [19, 6,5]
    },
    {
        id: 41,
        title: "SFX",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "SFX" },
        options: [19, 6,5]
    },
    {
        id: 42,
        title: "Strings",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "STRINGS" },
        options: [19, 6,5]
    },
    {
        id: 43,
        title: "Synth",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "SYNTH" },
        options: [19, 6,5]
    },
    {
        id: 44,
        title: "Vocals",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "VOCALS" },
        options: [19, 6,5]
    },
    {
        id: 45,
        title: "Winds",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "WINDS" },
        options: [19, 6,5]
    },
    {
        id: 46,
        title: "Alt Pop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ALT POP" },
        options: [19, 6,5]
    },
    {
        id: 47,
        title: "Cinematic Score",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "CINEMATIC SCORE" },
        options: [19, 6,5]
    },
    {
        id: 48,
        title: "Dubstep",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "DUBSTEP" },
        options: [19, 6,5]
    },
    {
        id: 49,
        title: "EDM",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "EDM" },
        options: [19, 6,5]
    },
    {
        id: 50,
        title: "EIGHTBIT",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "EIGHTBIT" },
        options: [19, 6,5]
    },
    {
        id: 51,
        title: "Electro",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ELECTRO" },
        options: [19, 6,5]
    },
    {
        id: 52,
        title: "FUNK",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "FUNK" },
        options: [19, 6,5]
    },
    {
        id: 53,
        title: "Free Sound",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "FreeSound" },
        options: [19, 6,5]
    },
    {
        id: 54,
        title: "Gospel",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "GOSPEL" },
        options: [19, 6,5]
    },
    {
        id: 55,
        title: "Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "HIP HOP" },
        options: [19, 6,5]
    },
    {
        id: 56,
        title: "House",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "HOUSE" },
        options: [19, 6,5]
    },
    {
        id: 57,
        title: "New Funk",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "NEW FUNK" },
        options: [19, 6,5]
    },
    {
        id: 58,
        title: "New Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "NEW HIP HOP" },
        options: [19, 6,5]
    },
    {
        id: 59,
        title: "Pop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "POP" },
        options: [19, 6,5]
    },
    {
        id: 60,
        title: "R & B",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "RNB" },
        options: [19, 6,5]
    },
    {
        id: 61,
        title: "R & B Funk",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "RNB FUNK" },
        options: [19, 6,5]
    },
    {
        id: 62,
        title: "Rock",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ROCK" },
        options: [19, 6,5]
    },
    {
        id: 63,
        title: "Techno",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "TECHNO" },
        options: [19, 6,5]
    },
    {
        id: 64,
        title: "Trap",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "TRAP" },
        options: [19, 6,5]
    },
    {
        id: 65,
        title: "UK House",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "UK HOUSE" },
        options: [19, 6,5]
    },
    {
        id: 66,
        title: "West Coast Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "WEST COAST HIP HOP" },
        options: [19, 6,5]
    },
    {
        id: 67,
        title: "World Percussion",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "WORLD PERCUSSION" },
        options: [19, 6,5]
    },
    {
        id: 68,
        title: "",
        utterance: "Sounds good. thanks for working with me!",
        parameters: {},
        options: [69, 70]
    },
    {
        id: 69,
        title: "bye!",
        utterance: "see ya",
        parameters: {},
        options: []
    },
    {
        id: 70,
        title: "wait, I want to work on it some more",
        utterance: "ok, go ahead",
        parameters: {},
        options: []
    },
    {
        id: 71,
        title: "",
        utterance: "What instrument should we add?",
        parameters: {},
        dropup: "Instruments",
        options: [37, 38, 39, 40, 41, 42, 43, 44, 45]
    },
    {
        id: 72,
        title: "do you want to come up with some sound ideas",
        utterance: "[SECTIONSELECT|73,74|75][RESET_PARAMS]",
        parameters: {},
        options: [73, 74]
    },
    {
        id: 73,
        title: "no",
        utterance: "we could try [sound_rec][SOUNDWAIT|10]",
        parameters: {},
        event: ["soundRequest"],
        options: [19, 6, 92]
    },
    {
        id: 74,
        title: "yeah",
        utterance: "which one?",
        parameters: {},
        dropup: "Sections",
        options: ["SECTIONS|75"]
    },
    {
        id: 75,
        title: "",
        utterance: "we could try [sound_rec][SOUNDWAIT|10]",
        parameters: {},
        event: ["soundRequest"],
        options: [19, 6, 92]
    },
    {
        id: 76,
        title: "i have some ideas",
        utterance: "cool, what were you thinking?",
        parameters: {},
        dropup: "Project attributes",
        options: ["PROPERTIES|78"]
    },
    {
        id: 77,
        title: "i'm not sure. do you have any ideas?",
        utterance: "sure. [SUGGESTPROPERTY]",
        parameters: {},
        options: [82, 84, 85]
    },
    {
        id: 78,
        title: "",
        utterance: "what were you thinking for [CURRENTPROPERTY]?",
        parameters: {},
        options: ["PROPERTYOPTIONS|79"]
    },
    {
        id: 79,
        title: "",
        utterance: "[STOREPROPERTY]sounds good. do you have more ideas, or do you want to start working?",
        parameters: {},
        options: [80, 81]
    },
    {
        id: 80,
        title: "i have some other thoughts",
        utterance: "ok, what else are you thinking?",
        parameters: {},
        dropup: "Project attributes",
        options: ["PROPERTIES|78"]
    },
    {
        id: 81,
        title: "let's start working",
        utterance: "sounds good. do you want to pick sounds first, or should i?",
        parameters: {},
        options: [3, 4]
    },
    {
        id: 82,
        title: "yeah, i like that",
        utterance: "[STOREPROPERTY]great. do you wanna get started?",
        parameters: {},
        options: [83, 86]
    },
    {
        id: 83,
        title: "wait, i have an idea about our project",
        utterance: "ok, what were you thinking?",
        parameters: {},
        dropup: "Project Properties",
        options: ["PROPERTIES|78"]
    },
    {
        id: 84,
        title: "i don't know. what about something else?",
        utterance: "[SUGGESTPROPERTY]",
        parameters: {},
        options: [83, 87, 85]
    },
    {
        id: 85,
        title: "we can just get started",
        utterance: "ok. do you wanna pick some sounds?",
        parameters: {},
        options: [3, 4, 14, 88, 91]
    },
    {
        id: 86,
        title: "ok",
        utterance: "do you want to start off by picking some sounds?",
        parameters: {},
        options: [3, 4, 14, 88, 91]
    },
    {
        id: 87,
        title: "sounds good",
        utterance: "[STOREPROPERTY]ok. do you wanna get started?",
        parameters: {},
        options: [83, 86]
    },
    {
        id: 88,
        title: "i want to tell you what i think we should make",
        utterance: "sure, what were you thinking?",
        parameters: {},
        dropup: "ideas",
        options: ["PROPERTIES|78"]
    },
    {
        id: 89,
        title: "i want to change one of our ideas about the project",
        utterance: "which of these do you want to remove from our list?",
        parameters: {},
        dropup: "ideas",
        options:[94,95]
    },
    {
        id: 90,
        title: "",
        utterance: "[CLEARPROPERTY]sounds good. do you have more ideas, or do you want to start working?",
        parameters: {},
        options: [80, 81]
    },

    {
        id: 91,
        title: "let's start working",
        utterance: "sounds good",
        parameters: {},
        options: []
    },
    {
        id: 92,
        title: "ok",
        utterance: "cool, go ahead",
        parameters: {},
        options: []
    },
    {
        id: 93,
        title: "How can I add these?",
        utterance: "you can use the [LINK|fitMedia] function",
        parameters: {},
        options: []
    },
    {
        id: 94,
        title: "i want to remove one of our ideas",
        utterance: "which of these do you want to remove from our list?",
        parameters: {},
        dropup: "ideas",
        options:["CLEARPROPERTYOPTIONS|90"]
    },
    {
        id: 95,
        title: "i want to change one of our ideas",
        utterance: "which of these do you want to change?",
        parameters: {},
        dropup: "ideas",
        options:["[CHANGEPROPERTYOPTIONS|96]"]
    },
    {
        id: 96,
        title: "",
        utterance: "ok, what do you want to change it out for?",
        parameters: {},
        dropup: "ideas",
        options:["[SWAPPROPERTYOPTIONS|97]"]
    },
    {
        id: 97,
        title: "",
        utterance: "[REPLACEPROPERTY]ok, got it.",
        parameters: {},
        options:[81, 100, 94, 101]
    },
    {
        id: 98,
        title: "i don't think i like that",
        utterance: "no worries",
        parameters: {},
        options:[]
    },

    {
        id: 99,
        title: "yeah, that sounds good",
        utterance: "ok sweet.[SOUNDWAIT|10]",
        parameters: {},
        options:[]
    },
    {
        id: 100,
        title: "i want to change something else",
        utterance: "what do you want to change?",
        parameters: {},
        dropup: "ideas",
        options:["[CHANGEPROPERTYOPTIONS|96]"]
    },
    {
        id: 101,
        title: "i've got another idea",
        utterance: "what should we add?",
        parameters: {},
        dropup: "ideas",
        options: ["PROPERTIES|78"]
    },
    {
        id: 102,
        title: "I have a specific instrument I want to add",
        utterance: "what instrument?",
        parameters: {},
        dropup: "Instruments",
        options: [37, 38, 39, 40, 41, 42, 43, 44, 45]
    },
]

export const CAI_TREES : { [key: string]: number } = { "Chat with CAI": 0, 'error': 26, 'begin': 1, 'sound_select': 72, 'suggest': 34, 'wrapup': 68, 'selectinstr': 71 , 'properties': 88}

export const CAI_ERRORS : { [key: string]: string } = {
    "ParseError": "looks like you've got a [LINK|parse error]. I think we might be missing something.",
    "ImportError": "something's not [LINK|importing] right. do we have the right package name up top?",
    "IndentationError": "looks like one of our lines isn't [LINK|indented] right.",
    "IndexError": "i think this means we're trying to use an [LINK|index] that doesn't exist.",
    "NameError": "i think we're trying to use a variable or function that we haven't defined, or maybe we misspelled a [LINK|name].",
    "SyntaxError": "we have a [LINK|syntax error], which might mean that we're using the wrong operator.",
    "TypeError": "it's saying [LINK|type error], which means that we put in the wrong kind of data, or we're missing something.",
    "ValueError": "i think something is wrong with one of our [LINK|function arguments].",
    "ServerError": "this is an issue with the ES server, and not with your code. we might have to make some changes."
}