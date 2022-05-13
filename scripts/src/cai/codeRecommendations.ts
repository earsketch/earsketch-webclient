
// AVAILABLE IDs: 35, 36, 37, 38, 39, 40, 41, 51, 52, 70
export interface CodeDelta {
    start: { [key: string]: { [key: string]: number } },
    end: { [key: string]: { [key: string]: number } },
    utterance: string,
    complexity: { [key: string]: { [key: string]: number } }
}

export const CAI_DELTA_LIBRARY: { [key: number]: CodeDelta } = {
    53: {
        start: { functions: { repeatExecution: 0 } },
        end: { functions: { repeatExecution: 1 } },
        utterance: "we can add parameters to our function to make it more useful for repeated sections of code",
        complexity: { functions: { repeatExecution: 3 } },
    },
    54: {
        start: { functions: { repeatExecution: 0 } },
        end: { functions: { repeatExecution: 2 } },
        utterance: "if we use parameters in our function, we can make it easier to reuse ",
        complexity: { functions: { repeatExecution: 3 } },
    },
    33: {
        start: { functions: { repeatExecution: 1 } },
        end: { functions: { repeatExecution: 2 } },
        utterance: "since we're using a function more than once, we can add parameters to slightly change what it does each time we call it ",
        complexity: { functions: { repeatExecution: 3 } },
    },
    45: {
        start: { conditionals: { conditionals: 0 } },
        end: { conditionals: { conditionals: 1 } },
        utterance: "we should add an else portion to our [LINK|if statement]",
        complexity: { conditionals: { conditionals: 2 } },
    },
    46: {
        start: { conditionals: { conditionals: 0 } },
        end: { conditionals: { conditionals: 2 } },
        utterance: "we can use else-if to add more options to our [LINK|conditional]",
        complexity: { conditionals: { conditionals: 3 } },
    },
    47: {
        start: { conditionals: { conditionals: 1 } },
        end: { conditionals: { conditionals: 2 } },
        utterance: "we can use else-if to add more options to our [LINK|conditional]",
        complexity: { conditionals: { conditionals: 3 } },
    },
    48: {
        start: { iteration: { forLoopsIterable: 0 } },
        end: { iteration: { forLoopsIterable: 1 } },
        utterance: "let's use both a minimum and maximum with our [LINK|loop]",
        complexity: { iteration: { forLoopsIterable: 2 } },
    },
    49: {
        start: { iteration: { forLoopsIterable: 0 } },
        end: { iteration: { forLoopsIterable: 2 } },
        utterance: "we can use a step value with our [LINK|loop]",
        complexity: { iteration: { forLoopsIterable: 3 } },
    },
    50: {
        start: { iteration: { forLoopsIterable: 1 } },
        end: { iteration: { forLoopsIterable: 2 } },
        utterance: "we can add a step value here",
        complexity: { iteration: { forLoopsIterable: 3 } },
    },
    34: {
        start: { makeBeat: { makeBeat: 0 } },
        end: { makeBeat: { makeBeat: 1 } },
        utterance: "we can use a list of sounds with [LINK|makeBeat] to make our beat more interesting with different sounds",
        complexity: { makeBeat: { makeBeat: 2 } },
    },
}

export interface CodeRecommendation {
    utterance: string,
    explain?: string,
    example?: string,
}

export const CAI_RECOMMENDATIONS: { [key: number]: CodeRecommendation } = {
    1: {
        example: "",
        explain: "",
        utterance: "[NUCLEUS]",
    },
    2: {
        example: "",
        explain: "",
        utterance: "",
    },
    3: {
        example: "We can make a new [LINK|section] using a [LINK|for loop] like\n for measure in [LINK|range](your_minimum_here, your_maximum_here):\n    [LINK|makeBeat](your_filename_here, your_track_number_here, measure, your_beat_string_here)",
        explain: "all of the stuff you put in sounds great. we can put in some contrast by adding other sounds later on.",
        utterance: "let's start a new [LINK|section].",
    },
    4: {
        example: "There are several blank spots we need to fill",
        explain: "We have not yet generated a suggestion for it!",
        utterance: "This node is empty",
    },
    5: {
        example: "we could use something like this [LINK|for loop]:\nfor measure in [LINK|range] (your_minimum_here, your_maximum_here):\n    [LINK|fitMedia](your_filename_here, your_track_number_here, measure, measure + 0.5)",
        explain: "it's a little bit shorter and easier to read like that",
        utterance: "i like the new [LINK|section]. maybe we can use a [LINK|for loop] to consolidate the code",
    },
    6: {
        example: "",
        explain: "",
        utterance: "[DELTALOOKUP]",
    },
    7: {
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)\n\nmyFunction(1,5)",
        explain: "that'll let us vary our repeating [LINK|sections] a little",
        utterance: "what if we added some [LINK|parameters] to the code that makes the new [LINK|section]?",
    },
    8: {
        example: "something like this makes an [LINK|ABA] form and changes up section A:\n\nsectionA(1,4, FILENAME)\nsectionB(5, 8)\nsectionA(9, 12, FILENAME)",
        explain: "this makes it so we can make more music without writing a lot of new code",
        utterance: "we can call your [LINK|function] again and use different arguments to make another, similar [LINK|section]",
    },
    9: {
        example: "example here",
        explain: "i think it could make our song better if we use [param] differently",
        utterance: "maybe we can adjust how we use our [LINK|function] [LINK|parameters]",
    },
    10: {
        example: "this [LINK|loop] only puts the second sound in even-numbered measures:\n\nfor measure in [LINK|range](your_minimum_here, your_maximum_here):\n    [LINK|fitMedia](your_filename_here, your_track_number_here, measure, measure + 2)\n    [LINK|if] (measure % 2 == 0): #if the measure number is even\n        [LINK|fitMedia](your_filename_here, your_track_number_here, measure, measure + 1)",
        explain: "that way we're not being repetitive every measure",
        utterance: "if we use an [LINK|if statement] in our [LINK|loop], we can alternate some sounds in the [LINK|section]",
    },
    11: {
        example: "",
        explain: "",
        utterance: "We need to use [COMPLEXITYGOAL], right? Let's make sure we get that in there.",
    },
    12: {
        example: "focusing on one genre keeps it consistent",
        explain: "it keeps the song more grounded",
        utterance: "wait, i liked the direction we were going before. let's add [sound_rec]",
    },
    13: {
        example: "",
        explain: "",
        utterance: "let's try something like [sound_rec]",
    },
    14: {
        example: "example here",
        explain: "envelope explanation",
        utterance: "CAI suggests expanding envelope usage",
    },
    15: {
        example: "# Makes an [LINK|effect ramp] between measures 1 and 3, moving from -60dB to 0dB\n[LINK|setEffect](1, VOLUME, GAIN, your_start_value_here, your_start_measure_here, your_end_measure_here, your_end_measure_here)",
        explain: "we can use more arguments for [LINK|setEffect] to give us more control over how our effects behave",
        utterance: "what if we used an effects envelope?",
    },
    16: {
        example: "for example, this code makes a section:\n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, your_track_number_here, startMeasure, endMeasure)\n    [LINK|fitMedia](your_filename_here, your_track_number_here, startMeasure, endMeasure)\n\nmyFunction(1, 5)",
        explain: "we can use structures like helper [LINK|functions] and [LINK|nested loops] to keep our code short and flexible",
        utterance: "is there a way we can make the inside of our [LINK|functions] more concise?",
    },
    17: {
        example: "we could put it in track 1",
        explain: "i think i like the way it sounds better",
        utterance: "i like what you added, what about swapping out one of the sounds for [sound_rec]?",
    },
    18: {
        example: "something like this:\n\ndef mySection(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, your_track_number_here, startMeasure, endMeasure)\n    [LINK|fitMedia](your_filename_here, your_track_number_here, startMeasure, endMeasure)/n/nmySection(1, 5)",
        explain: "Custom [LINK|function]s let us write one block of code that can be reused many times. This makes our code shorter, easier to read, and easier to edit.",
        utterance: "what if we used a [LINK|custom function] to make this [LINK|section]?",
    },
    19: {
        example: "we can reverse their order, or use them in more places to give our function more flexibility. we could also add some [LINK|parameters].",
        explain: "it'll be a nice contrast",
        utterance: "let's make some changes to the [LINK|parameters] we use to make this [LINK|section]",
    },
    20: {
        example: "something like using a slightly different sound in each measure like this:\n\nmyDrums = [your_filename_here, your_filename_here, your_filename_here, your_filename_here]\nfor i in [LINK|range](1, 4):\n    [LINK|fitMedia](myDrums[i- 1], 1, i, i + 1)",
        explain: "it can help us be less repetitive with the [LINK|section]",
        utterance: "we can use some advanced topics from the curriculum to make our new [LINK|section] more complex and interesting",
    },
    21: {
        example: "we can use a [LINK|for loop] with a step value of 2 to only put it in even numbered measures",
        explain: "that'll give us some nice contrast",
        utterance: "let's alternate [sound_rec] in every other measure",
    },
    22: {
        example: "like having one [LINK|section] with lots of sounds and then another one that's more sparse",
        explain: "a full [LINK|section] that's different will make our song more interesting",
        utterance: "what if we used the sounds you just added to start a new [LINK|section]?",
    },
    23: {
        // 9b mod
        example: "like having one [LINK|section] with lots of sounds and then another one that's more sparse",
        explain: "a full [LINK|section] that's different will make our song more interesting",
        utterance: "what if we used the sounds you just added to start a new [LINK|section]?",
    },
    24: {
        // 9b org
        example: "example here",
        explain: "that'll give us some nice contrast",
        utterance: "",
    },
    25: {
        // 7 aug
        example: "something like: [sound_rec] maybe",
        explain: "we can keep going in this direction",
        utterance: "let's build on this by adding more sounds",
    },
    26: {
        // 9a aug
        example: "something like [sound_rec] maybe",
        explain: "we can keep going in this direction",
        utterance: "let's build on this by adding more sounds",
    },
    27: {
        // 9a mod
        example: "maybe [sound_rec] or [sound_rec]?",
        explain: "we could change or add some sounds",
        utterance: "some of our [LINK|sections] are really similar - let's vary them a little more?",
    },
    28: {
        // 9a org
        example: "something like:\n\nfor measure in [LINK|range] (your_minimum_here, your_maximum_here, your_step_here):\n    [LINK|fitMedia](your_filename_here, your_track_number_here, measure, measure + 1)\n\nor\n\nfor measure in [LINK|range] (your_minimum_here, your_maximum_here):\n    [LINK|if](measure % 3 == 0):\n        [LINK|fitMedia](your_filename_here, your_track_number_here, measure, measure + 1)",
        explain: "this will give us more variety. we can use an [LINK|if statement] inside a [LINK|for loop] (like, if the measure number is divisible by 3, do something), or use a [LINK|for loop] with a step value",
        utterance: "we can use a [LINK|conditional] or a [LINK|for loop] with a step to alternate a new sound in one of our [LINK|sections]",
    },
    29: {
        // 9a org
        example: "",
        explain: "",
        utterance: "[STARTTREE|selectinstr]",
    },
    30: {
        example: "",
        explain: "",
        utterance: "Let's start with [sound_rec]?",
    },
    31: {
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)",
        explain: "that way, we don't have to write the same code twice",
        utterance: "we have some repeated sections. What if we used a [LINK|custom function] to make them?",
    },
    32: {
        example: "something like changing the start and end measure [LINK|parameters], plus may one or two of the sounds by making them [LINK|parameters] too",
        explain: "lots of music uses repeating [LINK|sections], and it can tie our whole song together",
        utterance: "We made a [LINK|section] using a [LINK|custom function]. let's call it again and make a similar [LINK|section] somewhere else",
    },
    65: {
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)",
        explain: "that'll make our code more modular, and we can re=use that code in the future without having to type it all out",
        utterance: "so we already have a [LINK|custom function], but what if we used one to make one or two of our [LINK|sections]?",
    },
    66: {
        example: "we could use a [LINK|custom function] to make this easier",
        explain: "more repetition can help make our song feel grounded",
        utterance: "what if we repeat [SECTION]?",
    },
    67: {
        example: "We wanted to do a [FORMGOAL] form, right?",
        explain: "It'll move us closer to our form goal",
        utterance: "Let's start a new, contrasting section",
    },
    68: {
        example: "something like:\n\n[LINK|setEffect](your_track_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here)",
        explain: "we can customize our sounds a little more, and it gives us more control",
        utterance: "let's put in some effects with [LINK|setEffect], like a [LINK|filter] or [LINK|volume mixing]",
    },
    69: {
        example: "something like:\n\n[LINK|setEffect](your_track_number_here, [LINK|FILTER], FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here)",
        explain: "we can specify start and end values, and chain them together if we want",
        utterance: "we could use an envelope with our effects to give us more control over how they behave.",
    },
}

export const CAI_NUCLEI: { [key: number]: CodeRecommendation } = {
    63: {
        utterance: "let's try using some [LINK|randomness] somewhere",
    },
    64: {
        utterance: "i think we could use a bigger variety of instruments",
    },
    55: {
        utterance: "we could try [sound_rec]",
    },
    56: {
        utterance: "what about adding [sound_rec] and [sound_rec] next?",
    },
    60: {
        utterance: "maybe we could put in [sound_rec]?",
    },
}
