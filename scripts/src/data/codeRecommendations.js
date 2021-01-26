
// var currentDelta = { soundsAdded: [], sections: 0 };
// var currentDeltaSum = 0;
// var noDeltaCount = 0;
// var currentResults = {};
// var averageGenreThreshold = .8;
// var musicResults;
// var genreListCurrent;
// var currentEffects;
// var sectionLines = [];
// var CAI_DICT = {};
// var possibleDeltaSuggs = [];

var CAI_DELTA_LIBRARY = [
    {
        start: { userFunc: 0 },
        end: { userFunc: 1 },
        id: 53,
        utterance: "using a function to make our code modular is a good idea. let's make sure we call it",
        complexity: {userFunc:3}
    },
    {
        start: { userFunc: 0 },
        end: { userFunc: 2 },
        id: 54,
        utterance: "using a function to make our code modular is a good idea. let's make sure we call it",
        complexity: {userFunc:3}
    },
    {
        start: { userFunc: 2 },
        end: { userFunc: 3 },
        id: 33,
        utterance: "we can use both parameters and return values to make our function more sophisticated",
        complexity: {userFunc:5}
    },
    {
        start: { lists: 0 },
        end: { lists: 1 },
        id: 34,
        utterance: "what if we used makeBeat with a list to make our own beat?",
        complexity: {lists:4, strings:3}
    },
    {
        start: { lists: 0 },
        end: { lists: 2 },
        id: 35,
        utterance: "what if we used makeBeat with a list to make our own beat?",
        complexity: { lists: 4, strings: 3 }
    },
    {
        start: { lists: 1 },
        end: { lists: 2 },
        id: 36,
        utterance: "what if we used makeBeat with a list to make our own beat?",
        complexity: { lists: 4, strings: 3 }
    },
    {
        start: { variables: 0 },
        end: { variables: 1 },
        id: 37,
        utterance: "let's use the variable we just defined in a fitMedia statement",
        complexity: {variables:3}
    },
    {
        start: { variables: 0 },
        end: { variables: 2 },
        utterance: "let's use the variable we just defined in a fitMedia statement",
        complexity: { variables: 3 }
    },
    {
        start: { variables: 1 },
        end: { variables: 2 },
        id: 38,
        utterance: "let's use the variable we just defined in a fitMedia statement",
        complexity: { variables: 3 }
    },
    {
        start: { consoleInput: 0 },
        end: { consoleInput: 1 },
        id: 39,
        utterance: "we can use the console input when we make our song to give the user some input",
        complexity: {consoleInput: 1}
    },
    {
        start: { consoleInput: 0 },
        end: { consoleInput: 2 },
        id: 40,
        utterance: "we can use the console input when we make our song to give the user some input",
        complexity: { consoleInput: 1 }
    },
    {
        start: { consoleInput: 1 },
        end: { consoleInput: 2 },
        id: 41,
        utterance: "we can use the console input when we make our song to give the user some input",
        complexity: { consoleInput: 1 }
    },
    {
        start: { variables: 0 },
        end: { variables: 3 },
        id: 42,
        utterance: "since we're storing values in variables, we should take advantage of that and change the value",
        complexity: {variables: 4}
    },
    {
        start: { variables: 1 },
        end: { variables: 3 },
        id: 43,
        utterance: "since we're storing values in variables, we should take advantage of that and change the value",
        complexity: { variables: 4 }
    },
    {
        start: { variables: 2 },
        end: { variables: 3 },
        id: 44,
        utterance: "since we're storing values in variables, we should take advantage of that and change the value",
        complexity: { variables: 4 }
    },
    {
        start: { conditionals: 0 },
        end: { conditionals: 2 },
        id: 45,
        utterance: "we should add an else portion to our if statement",
        complexity: {conditionals:3}
    },
    {
        start: { conditionals: 1 },
        end: { conditionals: 2 },
        id: 46,
        utterance: "we should add an else portion to our if statement",
        complexity: { conditionals: 3 }
    },
    {
        start: { conditionals: 2 },
        end: { conditionals: 3 },
        id: 47,
        utterance: "we can use elif to add more options to our conditional",
        complexity: { conditionals: 3 }
    },
    {
        start: { forLoops: 0 },
        end: { forLoops: 2 },
        id: 48,
        utterance: "let's use a minimum and maximum with our loop",
        complexity: {forLoops: 3}
    },
    {
        start: { forLoops: 1 },
        end: { forLoops: 2 },
        id: 49,
        utterance: "let's use a minimum and maximum with our loop",
        complexity: { forLoops: 3 }
    },
    {
        start: { forLoops: 2 },
        end: { forLoops: 3 },
        id: 50,
        utterance: "we can add a step value here",
        complexity: { forLoops: 4 }
    },
    {
        start: { forLoops: 0 },
        end: { forLoops: 3 },
        id: 51,
        utterance: "we can add a step value here",
        complexity: { forLoops: 4 }
    },
    {
        start: { forLoops: 1 },
        end: { forLoops: 3 },
        id: 52,
        utterance: "we can add a step value here",
        complexity: { forLoops: 4 }
    }

];


var CAI_RECOMMENDATIONS =
    [
        {
            id: 1,
            example: "",
            explain: "",
            utterance: "[NUCLEUS]"
        },
        {
            id: 2,
            example: "",
            explain: "",
            utterance: ""
        },
        {
            id: 3,
            example: "We can make a new section using a for loop like\n for measure in range(min, max):\n    makeBeat(FILENAME, track, measure, beatstring)",
            explain: "all of the stuff you put in sounds great. we should put in some contrast by adding other sounds later on.",
            utterance: "let's start a new section."
        },
        {
            id: 4,
            example: "There are several blank spots we need to fill",
            explain: "We have not yet generated a suggestion for it!",
            utterance: "This node is empty"
        },
        {
            id: 5,
            example: "we could use something like this for loop:\nfor measure in range (min, max):\n    fitMedia(FILENAME, track, measure, measure + 0.5)",
            explain: "it's a little bit shorter and easier to read like that",
            utterance: "i like the new section. maybe we can use a for loop to consolidate the code",
            complexity: {forLoops:1}
        },
        {
            id: 6,
            example: "",
            explain: "",
            utterance: "[DELTALOOKUP]"
        },
        {
            id: 7,
            example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    fitMedia(FILENAME, 1, startMeasure, endMeasure)\n\n    fitMedia(FILENAME, 2, startMeasure, endMeasure)",
            explain: "that'll let us vary our repeating sections a little",
            utterance: "what if we added some parameters to the code that makes the new section?",
            complexity: {userFunc: 4}
        },
        {
            id: 8,
            example: "something like this makes an ABA form and changes up section A:\n\nsectionA(1,4, FILENAME)\nsectionB(5, 8)\nsectionA(9, 12, FILENAME)",
            explain: "this makes it so we can make more music without writing a lot of new code",
            utterance: "we can call your function again and use different arguments to make another, similar section"
        },
        {
            id: 9,
            example: "example here",
            explain: "i think it could make our song better if we use [param] differently",
            utterance: "maybe we can adjust how we use our function parameters"
        },
        {
            id: 10,
            example: "this loop only puts the second sound in even-numbered measures:\n\nfor measure in range(min, max):\n    fitMedia(FILENAME, track, measure, measure + 2)\n    if (measure % 2 == 0): #if the measure number is even\n        fitMedia(FILENAME, track, measure, measure + 1)",
            explain: "that way we're not being repetitive every measure",
            utterance: "if we use an if statement in our loop, we can alternate some sounds in the section"
        },
        {
            id: 11,
            example: "",
            explain: "",
            utterance: "i like how we're branching into another genre. let's add [sound_rec] next"
        },
        {
            id: 12,
            example: "focusing on one genre keeps it consistent",
            explain: "it keeps the song more grounded",
            utterance: "wait, i liked the direction we were going before. let's add [sound_rec]"
        },
        {
            id: 13,
            example: "we can include a sound from a really different genre which keeps things interesting",
            explain: "this can give us a new direction to work on",
            utterance: "let's try something more adventurous like [sound_rec]"
        },
        {
            id: 14,
            example: "example here",
            explain: "envelope explanation",
            utterance: "CAI suggests expanding envelope usage"
        },
        {
            id: 15,
            example: "# Makes an effect ramp between measures 1 and 3, moving from -60dB to 0dB\nsetEffect(1, VOLUME, GAIN, startValue, startLocation, endValue, endLocation)",
            explain: "we can use more arguments for setEffect to give us more control over how our effects behave",
            utterance: "what if we used an effects envelope?"
        },
        {
            id: 16,
            example: "for example, this code makes a section:\n\ndef myFunction(startMeasure, endMeasure):\n    fitMedia(FILENAME, track, startMeasure, endMeasure)\n    fitMedia(FILENAME, track, startMeasure, endMeasure)",
            explain: "we can use structures like helper functions and nested loops to keep our code short and flexible",
            utterance: "is there a way we can make the inside of our functions more concise?"
        },
        {
            id: 17,
            example: "we could put it in track 1",
            explain: "i think i like the way it sounds better",
            utterance: "i like what you added, what about swapping out one of the sounds for [sound_rec]?"
        },
        {
            id: 18,
            example: "something like this:\n\ndef mySection(startMeasure, endMeasure):\n    fitMedia(FILENAME, track, startMeasure, endMeasure)\n    fitMedia(FILENAME, track, startMeasure, endMeasure)",
            explain: "it'll let us use that code again.",
            utterance: "what if we used a custom function to make this section?",
            complexity: {userFunc:1}
        },
        {
            id: 19,
            example: "we can reverse their order, or use them in more places to give our function more flexibility. we could also add some parameters.",
            explain: "it'll be a nice contrast",
            utterance: "let's make some changes to the parameters we use to make this section"
        },
        {
            id: 20,
            example: "something like using a slightly different sound in each measure like this:\n\nmyDrums = [FILENAME, FILENAME, FILENAME, FILENAME]\nfor i in range(1, 4):\n    fitMedia(myDrums[i- 1], 1, i, i + 1)",
            explain: "it can help us be less repetitive with the section",
            utterance: "we can use some advanced topics from the curriculum to make our new section more complex and interesting"
        },
        {
            id: 21,
            example: "we can use a for loop with a step value of 2 to only put it in even numbered measures",
            explain: "that'll give us some nice contrast",
            utterance: "let's alternate [sound_rec] in every other measure"
        },
        {
            id: 22,
            example: "like having one section with lots of sounds and then another one that's more sparse",
            explain: "a full section that's different will make our song more interesting",
            utterance: "what if we used the sounds you just added to start a new section?"
        },
        {
            id: 23, //9b mod
            example: "like having one section with lots of sounds and then another one that's more sparse",
            explain: "a full section that's different will make our song more interesting",
            utterance: "what if we used the sounds you just added to start a new section?"
        },
        {
            id: 24, //9b org
            example: "example here",
            explain: "that'll give us some nice contrast",
            utterance: ""
        },
        {
            id: 25, //7 aug
            example: "something like: [sound_rec] maybe",
            explain: "we can keep going in this direction",
            utterance: "let's build on this by adding more sounds"
        },
        {
            id: 26, //9a aug
            example: "something like [sound_rec] maybe",
            explain: "we can keep going in this direction",
            utterance: "let's build on this by adding more sounds"
        },
        {
            id: 27, //9a mod
            example: "maybe [sound_rec] or [sound_rec]?",
            explain: "we could change or add some sounds",
            utterance: "some of our sections are really similar - let's vary them a little more?"
        },
        {
            id: 28, //9a org
            example: "something like:\n\nfor measure in range (min, max, step):\n    fitMedia(FILENAME, track, measure, measure + 1)\n\nor\n\nfor measure in range (min, max):\n    if(measure % 3 == 0):\n        fitMedia(FILENAME, track, measure, measure + 1)",
            explain: "this will give us more variety. we can use an if statement inside a for loop (like, if the measure number is divisible by 3, do something), or use a for loop with a step value",
            utterance: "we can use a conditional or a for loop with a step to alternate a new sound in one of our sections"
        }
        ,
        {
            id: 29, //9a org
            example: "",
            explain: "",
            utterance: "[STARTTREE|selectinstr]"
        },
        {
            id: 30,
            example: "",
            explain: "",
            utterance: "Let's start with [sound_rec]?"
        },
        {
            id: 31,
            example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    fitMedia(FILENAME, 1, startMeasure, endMeasure)\n\n    fitMedia(FILENAME, 2, startMeasure, endMeasure)",
            explain: "that way, we don't have to write the same code twice",
            utterance: "we have some repeated sections. What if we used a custom function to make them?",
            complexity: {userFunc: 1}
        },
        {
            id: 32,
            example: "something like changing the start and end measure parameters, plus may one or two of the sounds by making them parameters too",
            explain: "lots of music uses repeating sections, and it can tie our whole song together",
            utterance: "We made a section using a custom function. let's call it again and make a similar section somewhere else"
        },
        {
            id: 65,
            example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    fitMedia(FILENAME, 1, startMeasure, endMeasure)\n\n    fitMedia(FILENAME, 2, startMeasure, endMeasure)",
            explain: "that'll make our code more modular, and we can re=use that code in the future without having to type it all out",
            utterance: "so we already have a custom function, but what if we used one to make one or two of our sections?"
        },
        {
            id: 66,
            example: "we could use a custom function to make this easier",
            explain: "more repetition can help make our song feel grounded",
            utterance: "what if we repeat [SECTION]?"
        },
        {
            id: 67,
            example: "things like ABBA or ABACAB are things people are used to hearing",
            explain: "this way our song matches a recognizable format",
            utterance: "what if we extend this into [FORM] form?"
        },
        {
            id: 68,
            example: "something like:\n\nsetEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB)",
            explain: "we can customize our sounds a little more, and it gives us more control",
            utterance: "let's put in some effects, like a filter or volume mixing"
        },
        {
            id: 69,
            example: "something like:\n\nsetEffect(1, FILTER, FILTER_FREQ, 20, pointA, 10000, pointB)",
            explain: "we can specify start and end values, and chain them together if we want",
            utterance: "we could use an envelope with our effects to give us more control over how they behave."
        }
    ];

var CAI_NUCLEI = [
    { id: 63, utterance: "let's try using some randomness somewhere" },
    { id: 64, utterance: "i think we could use a bigger variety of instruments" },
    {
        id: 55, utterance:
            "let's change up our beat a little bit"
    },
    {
        id: 56, utterance:
            "what about adding [sound_rec] and [sound_rec] next?"
    },
    {
        id: 57, utterance:
            "let's add some bass"
    },
    {
        id: 58, utterance:
            "we should add some drums next"
    },
    {
        id: 59, utterance:
            "what about adding a synth?"
    },
    {
        id: 60, utterance:
            "maybe we could put in [sound_rec]?"
    },
    {
        id: 61, utterance:
            "hmm. what if we made a section that really contrasts with what we have right now?"
    },
    {
        id: 62, utterance:
            "some repetition might be good to tie this whole piece together"
    },
    {
        id: 70, utterance:
            "let's start making a new, contrasting section."
    }

]

export {CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI};