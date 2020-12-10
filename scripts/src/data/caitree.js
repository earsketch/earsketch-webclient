const CAI_TREE_NODES =
    [{  id: 0,
        title: "",
        utterance: "Hi, I'm CAI (short for Co-creative AI) I'll be your partner here in EarSketch. I'm still learning programming in EarSketch but together we can create some cool music. This is going to be fun!|Do you want to start chatting now?",
        parameters: {},
        options: [1, 2]
    },
    {  id: 1,
        title: "Sure",
        utterance: "How do you want to begin?",
        parameters: {},
        options: [3, 4]
    },
    {   id: 2,
        title: "Maybe later",
        utterance: "OK, I'll wait till you're ready to collaborate",
        parameters: {},
        options: []
    },
    {   id: 3,
        title: "I want to pick some sounds",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds[WAIT|11]",
        parameters: {},
        options: []
    },
    {   id: 4,
        title: "You can pick some sounds",
        utterance: "How about [sound_rec]?",
        parameters: {},
        options: [5, 6, 7]
    },
    {   id: 5,
        title: "Yes, I like it",
        utterance: "I think it sounds good too. Do you want me to suggest another sound?",
        parameters: {},
        options: [8, 9]
    },
    {   id: 6,
        title: "Can you suggest a different sound?",
        utterance: "Sure! Will these suggestions work?\n[sound_rec]\n[sound_rec]\n[sound_rec]",
        parameters: {},
        options: [15, 16, 17]
    },
    {   id: 7,
        title: "I want to add a different sound.",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds.",
        parameters: {},
        options: []
    },
    {   id: 8,
        title: "Sure. What do you got?",
        utterance: "We can try [sound_rec] next.[SOUNDWAIT|10]",
        parameters: {},
        options: []
    },
    {   id: 9,
        title: "Wait, I think I got the next one.",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds.",
        parameters: {},
        options: []
    },
    {   id: 10,
        title: "",
        utterance: "Do you like it?",
        parameters: {},
        options: [5, 6, 7]
    },
    {   id: 11,
        title: "",
        utterance: "It sounds pretty good. Do you want to try [sound_rec] next?",
        parameters: {},
        options: [12, 13, 14]
    },
    {   id: 12,
        title: "Sure, let me try it.",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds [WAIT|10]",
        parameters: {},
        options: []
    },
    {   id: 13,
        title: "Let's try a different genre",
        utterance: "Sure! What are you thinking?",
        parameters: {},
        dropup: "Genres",
        options: [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67]
    },
    {   id: 14,
        title: "I have a specific instrument in mind.",
        utterance: "Sure! Which instrument do you want to add?",
        parameters: {},
        dropup: "Instruments",
        options: [37,38,39,40,41,42,43,44, 45]
    },
    {   id: 15,
        title: "Yeah! The first one works.",
        utterance: "Awesome choice! Would you like me to suggest another sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 16,
        title: "I like the second one best",
        utterance: "Awesome choice! Would you like me to suggest another sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 17,
        title: "The third one is best",
        utterance: "Awesome choice! Would you like me to suggest another sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 18,
        title: "Absolutely! You are on a roll",
        utterance: "We can try [sound_rec] next[SOUNDWAIT|10]",
        parameters: {},
        options: []
    },
    {   id: 19,
        title: "Wait a minute. I have an idea for the next sound",
        utterance: "Okay! Whenever you are ready, you can run it and we can see how it sounds.",
        parameters: {},
        options: []
    },
    {   id: 20,
        title: "Can you suggest different sounds?",
        utterance: "Sure! Will these suggestions work?\n[sound_rec]\n[sound_rec]\n[sound_rec]",
        parameters: {},
        options: [15, 16, 17]
    },
    {   id: 21,
        title: "The first one works.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 22,
        title: "I like the second one.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 23,
        title: "The third one is best.",
        utterance: "Great! Would you like me to pick a sound?",
        parameters: {},
        options: [18, 19, 20]
    },
    {   id: 24,
        title: "",
        utterance: "Do you need some help with the code?[ERRORWAIT|28]",
        parameters: {},
        options: [25,26]
    },
    {   id: 25,
        title: "No, I want to try and fix it.",
        utterance: "[ERRORWAIT|28]",
        parameters: {},
        options: [31]
    },
    {   id: 26,
        title: "Yes, how do I fix it?",
        utterance: "[ERROREXPLAIN][ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {   id: 27,
        title: "Yes, can you help fix the error?",
        utterance: "[ERRORFIX|29|30]",
        parameters: {},
        options: []
    },
    {   id: 28,
        title: "",
        utterance: "Great, it works",
        parameters: {},
        options: []
    },
    {   id: 29,
        title: "",
        utterance: "I was able to fix the error. Let's see if it runs now.[ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {   id: 30,
        title: "",
        utterance: "I am not sure how to fix this error. I think we should look at the curriculum for help.[ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {   id: 31,
        title: "Can you help me?",
        utterance: "Sure. What can I help with?",
        parameters: {},
        options: [32]
    },
    {   id: 32,
        title: "How do I fix it?",
        utterance: "[ERROREXPLAIN][ERRORWAIT|28]",
        parameters: {},
        options: []
    },
    {   id: 33,
        title: "Can you fix the error?",
        utterance: "[ERRORFIX|29|30]",
        parameters: {},
        options: []
    },
    {   id: 34, //- BEGIN CODE SUGGESTION TREE
        title: "",
        utterance: "[SUGGESTION][RESET_PARAMS]",
        parameters: {},
        options: [35]
    },
    {   id: 35,
        title: "Can you explain more?",
        utterance: "[SUGGESTIONEXPLAIN]",
        parameters: {},
        options: [36]
    },
    {   id: 36,
        title: "Do you have an example?",
        utterance: "[SUGGESTIONEXAMPLE]",
        parameters: {},
        options: []
    },        
    {   id: 37,
        title: "Bass",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: {INSTRUMENT: "BASS"},
        options: []
    },
    {   id: 38,
        title: "Drums",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "DRUMS" },
        options: []
    },
    {   id: 39,
        title: "Freesound[WAIT|34]",
        utterance: "How about [sound_rec]?",
        parameters: { INSTRUMENT: "FREESOUND" },
        options: []
    },
    {   id: 40,
        title: "Keyboard",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "KEYBOARD" },
        options: []
    },
    {   id: 41,
        title: "SFX",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "SFX" },
        options: []
    },
    {   id: 42,
        title: "Strings",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "STRINGS" },
        options: []
    },
    {   id: 43,
        title: "Synth",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "SYNTH" },
        options: []
    },
    {   id: 44,
        title: "Vocals",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "VOCALS" },
        options: []
    },
    {   id: 45,
        title: "Winds",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { INSTRUMENT: "WINDS" },
        options: []
    },
    {   id: 46,
        title: "Alt Pop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ALT POP" },
        options: []
    },
    {   id: 47,
        title: "Cinematic Score",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "CINEMATIC SCORE" },
        options: []
    },
    {   id: 48,
        title: "Dubstep",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "DUBSTEP" },
        options: []
    },
    {   id: 49,
        title: "EDM",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "EDM" },
        options: []
    },
    {   id: 50,
        title: "EIGHTBIT",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "EIGHTBIT" },
        options: []
    },
    {   id: 51,
        title: "Electro",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ELECTRO" },
        options: []
    },
    {   id: 52,
        title: "FUNK",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "FUNK" },
        options: []
    },
    {   id: 53,
        title: "Free Sound",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "FreeSound" },
        options: []
    },
    {   id: 54,
        title: "Gospel",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "GOSPEL" },
        options: []
    },
    {   id: 55,
        title: "Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "HIP HOP" },
        options: []
    },
    {   id: 56,
        title: "House",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "HOUSE" },
        options: []
    },
    {   id: 57,
        title: "New Funk",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "NEW FUNK" },
        options: []
    },
    {   id: 58,
        title: "New Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "NEW HIP HOP" },
        options: []
    },
    {   id: 59,
        title: "Pop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "POP" },
        options: []
    },
    {   id: 60,
        title: "R & B",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "RNB" },
        options: []
    },
    {   id: 61,
        title: "R & B Funk",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "RNB FUNK" },
        options: []
    },
    {   id: 62,
        title: "Rock",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "ROCK" },
        options: []
    },
    {   id: 63,
        title: "Techno",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "TECHNO" },
        options: []
    },
    {   id: 64,
        title: "Trap",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "TRAP" },
        options: []
    },
    {   id: 65,
        title: "UK House",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "UK HOUSE" },
        options: []
    },
    {   id: 66,
        title: "West Coast Hip Hop",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "WEST COAST HIP HOP" },
        options: []
    },
    {   id: 67,
        title: "World Percussion",
        utterance: "How about [sound_rec]?[WAIT|34]",
        parameters: { GENRE: "WORLD PERCUSSION" },
        options: []
    },
    {
        id: 68,
        title: "",
        utterance: "Yeah, this looks just about done.",
        parameters: {},
        options: [69, 70]
    },
    {  id: 69,
        title: "I agree.",
        utterance: "nice, let's call it good",
        parameters: {},
        options: []
    },
    {  id: 70,
        title: "Wait, I want to work on it some more",
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
    } ];


const CAI_TREES = { "Chat with CAI": 0, 'error': 24, 'begin': 0, 'sound_select': 4, 'suggest' : 34, 'wrapup': 68, 'selectinstr': 71 };

const CAI_MUSIC_ANALYSIS = null;

//var helpTopics = [
//    { name: "fitMedia", utterance: "fitMedia adds an audio file to a specified track at specified start and end times. The audio file will be repeated or cut short as needed to fill the specified amount of time.", suggestionType: "music" },
//    { name: "functions", suggestionType: "code", utterance: "info about UDFs" }
//];


const CAI_ERRORS = {
    "ParseError": "Looks like you've got a parse error. I think we might be missing something in the line with the error.",
    "ImportError": "Something's not importing right. Do we have the right package name up top?",
    "IndentationError": "Looks like one of our lines isn't indented right.",
    "IndexError": "I think this means we're trying to access an index that doesn't exist.",
    "NameError": "Oh, I think we're trying to use a variable or function that we haven't defined, or maybe we misspelled a name.",
    "SyntaxError": "We have a syntax error, which might mean that we're using the wrong operator.",
    "TypeError": "It's saying type error, which means that line is expecting a different type of data than we're giving it.",
    "ValueError": "I think something is wrong with one of our function arguments.",
    "ServerError": "This is an issue with the ES server, and not with your code. We might have to make some changes."
};

export {CAI_TREE_NODES, CAI_TREES, CAI_MUSIC_ANALYSIS, CAI_ERRORS};
