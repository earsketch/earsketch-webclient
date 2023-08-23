
// Code recommendations to be given by CAI.
export interface CodeRecommendation {
    id: number, // arbitratry index number to be accessed by suggestion decision tree.
    utterance: string,
    explain?: string,
    examplePY?: string,
    exampleJS?: string,
}

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
