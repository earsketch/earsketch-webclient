
// Change in code state between starting and ending points.
export interface CodeDelta {
    id: number,
    start: { [key: string]: { [key: string]: number } }, // Starting code parameters.
    end: { [key: string]: { [key: string]: number } }, // Ending code parameters.
    utterance: string, // CAI suggestion for given parameter change.
    complexity: { [key: string]: { [key: string]: number } } // Complexity of code with suggestion implemented.
}

// library of CAI responses to various code deltas.
export const CAI_DELTA_LIBRARY: { [key: string]: CodeDelta } = {
    // adding/modifying functions
    functionsA: {
        id: 53,
        start: { functions: { repeatExecution: 0 } },
        end: { functions: { repeatExecution: 1 } },
        utterance: "we can add parameters to our function to make it more useful for repeated sections of code",
        complexity: { functions: { repeatExecution: 3 } },
    },
    functionsB: {
        id: 54,
        start: { functions: { repeatExecution: 0 } },
        end: { functions: { repeatExecution: 2 } },
        utterance: "if we use parameters in our function, we can make it easier to reuse",
        complexity: { functions: { repeatExecution: 3 } },
    },
    functionsC: {
        id: 33,
        start: { functions: { repeatExecution: 1 } },
        end: { functions: { repeatExecution: 2 } },
        utterance: "since we're using a function more than once, we can add parameters to slightly change what it does each time we call it ",
        complexity: { functions: { repeatExecution: 3 } },
    },
    // add/change conditionals
    conditionalsA: {
        id: 45,
        start: { conditionals: { conditionals: 0 } },
        end: { conditionals: { conditionals: 1 } },
        utterance: "we should add an else portion to our [LINK|if statement]",
        complexity: { conditionals: { conditionals: 2 } },
    },
    conditionalsB: {
        id: 46,
        start: { conditionals: { conditionals: 0 } },
        end: { conditionals: { conditionals: 2 } },
        utterance: "we can use else-if to add more options to our [LINK|conditional]",
        complexity: { conditionals: { conditionals: 3 } },
    },
    conditionalsC: {
        id: 47,
        start: { conditionals: { conditionals: 1 } },
        end: { conditionals: { conditionals: 2 } },
        utterance: "we can use else-if to add more options to our [LINK|conditional]",
        complexity: { conditionals: { conditionals: 3 } },
    },
    // loops
    loopRangeA: {
        id: 48,
        start: { iteration: { forLoopsRange: 0 } },
        end: { iteration: { forLoopsRange: 1 } },
        utterance: "let's use both a minimum and maximum with our [LINK|loop]",
        complexity: { iteration: { forLoopsRange: 2 } },
    },
    loopRangeB: {
        id: 49,
        start: { iteration: { forLoopsRange: 0 } },
        end: { iteration: { forLoopsRange: 2 } },
        utterance: "we can use a step value with our [LINK|loop]",
        complexity: { iteration: { forLoopsRange: 3 } },
    },
    loopRangeC: {
        id: 50,
        start: { iteration: { forLoopsIterable: 1 } },
        end: { iteration: { forLoopsIterable: 2 } },
        utterance: "we can add a step value here",
        complexity: { iteration: { forLoopsIterable: 3 } },
    },
    // makeBeat
    makeBeat: {
        id: 34,
        start: { makeBeat: { makeBeat: 0 } },
        end: { makeBeat: { makeBeat: 1 } },
        utterance: "we can use a list of sounds with [LINK|makeBeat] to make our beat more interesting with different sounds",
        complexity: { makeBeat: { makeBeat: 2 } },
    },
}

// Code recommendations to be given by CAI, as determined by logic in codeSuggestion.ts.
export interface CodeRecommendation {
    id: number, // arbitratry index number to be accessed by suggestion decision tree.
    utterance: string,
    explain?: string,
    example?: string,
}

export const CAI_RECOMMENDATIONS = {
    nucleus: {
        id: 1,
        utterance: "[NUCLEUS]", // Trigger to present generic suggestion.
    },
    deltaLookup: {
        id: 6,
        utterance: "[DELTALOOKUP]", // Check for appropriate CodeDelta; signals dialogue.ts to send delta utterance.
    },
    parameters: {
        id: 7,
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)\n\nmyFunction(1,5)",
        explain: "that'll let us vary our repeating [LINK|sections] a little",
        utterance: "what if we added some [LINK|parameters] to the code that makes the new [LINK|section]?",
    },
    instrument: {
        id: 29,
        utterance: "[STARTTREE|selectinstr]",
    },
    function: {
        id: 31,
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)",
        explain: "that way, we don't have to write the same code twice",
        utterance: "we have some repeated sections. What if we used a [LINK|custom function] to make them?",
    },
    functionCall: {
        id: 32,
        example: "something like changing the start and end measure [LINK|parameters], plus may one or two of the sounds by making them [LINK|parameters] too",
        explain: "lots of music uses repeating [LINK|sections], and it can tie our whole song together",
        utterance: "We made a [LINK|section] using a [LINK|custom function]. let's call it again and make a similar [LINK|section] somewhere else",
    },
    modular: {
        id: 65,
        example: "like: \n\ndef myFunction(startMeasure, endMeasure):\n    [LINK|fitMedia](your_filename_here, 1, startMeasure, endMeasure)\n\n    [LINK|fitMedia](your_filename_here, 2, startMeasure, endMeasure)",
        explain: "that'll make our code more modular, and we can re=use that code in the future without having to type it all out",
        utterance: "so we already have a [LINK|custom function], but what if we used one to make one or two of our [LINK|sections]?",
    },
    effect: {
        id: 68,
        example: "something like:\n\n[LINK|setEffect](your_track_here, FILTER, FILTER_FREQ, 20, your_start_measure_here, 10000, your_end_measure_here)",
        explain: "we can customize our sounds a little more, and it gives us more control",
        utterance: "let's put in some effects with [LINK|setEffect], like a [LINK|filter] or [LINK|volume mixing]",
    },
    goal: {
        id: 11,
        example: "if you need extra help, we can check the API or the curriculum for examples",
        explain: "you mentioned earlier we needed to put [COMPLEXITYGOAL] in the project, and now is a good chance to add it",
        utterance: "We need to use [COMPLEXITYGOAL], right? Let's make sure we get that in there.",
    },
}

// Type assertion to confirm that each entry in CAI_RECOMMENDATIONS is a valid CodeRecommendation.
// (note: exported CAI_RECOMMENDATIONS is kept without a type signature to allow codeSuggestion.ts to access the specific keys).
CAI_RECOMMENDATIONS as { [key: string]: CodeRecommendation }

// Generic sound-based recommendations, with no explanations or examples. Selected at random when the user asks CAI for a suggestion and there are no others available.
export const CAI_NUCLEI: { [key: string]: CodeRecommendation } = {
    oneSound: {
        id: 55,
        utterance: "we could try [sound_rec]",
    },
    twoSound: {
        id: 56,
        utterance: "what about adding [sound_rec] and [sound_rec] next?",
    },
    maybeSound: {
        id: 60,
        utterance: "maybe we could put in [sound_rec]?",
    },
}
