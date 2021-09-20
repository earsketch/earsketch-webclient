export const API_RESULTS = {
    analyze: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    analyzeForTime: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    analyzeTrack: {
        tempo: 120,
        length: 8,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 1, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 3, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 5, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 7, start: 1, end: 3 },
                ],
                effects: {},
            },
        ],
    },

    analyzeTrackForTime: {
        tempo: 120,
        length: 8,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 1, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 3, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 5, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 7, start: 1, end: 3 },
                ],
                effects: {},
            },
        ],
    },

    dur: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    createAudioSlice: {
        tempo: 120,
        length: 2,
        tracks: [
            { clips: [], effects: {} },
            { clips: [{ filekey: "DUBSTEP_BASS_WOBBLE_001-1-2", track: 1, measure: 1, start: 1, end: 2, scale: false, loop: true, silence: 0, audio: { filekey: "DUBSTEP_BASS_WOBBLE_001-1-2" }, loopChild: false }, { filekey: "DUBSTEP_BASS_WOBBLE_001-1-2", audio: { filekey: "DUBSTEP_BASS_WOBBLE_001-1-2" }, track: 1, measure: 2, start: 1, end: 2, scale: false, loop: true, loopChild: true }], effects: {}, analyser: {} },
        ],
        slicedClips: { "DUBSTEP_BASS_WOBBLE_001-1-2": { sourceFile: "DUBSTEP_BASS_WOBBLE_001", start: 1, end: 2 } },
    },

    fitMedia: {
        tempo: 120,
        length: 8,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 1, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 3, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 5, start: 1, end: 3 },
                    { filekey: "HIPHOP_FUNKBEAT_001", measure: 7, start: 1, end: 3 },
                ],
                effects: {},
            },
        ],
    },

    importImage1: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    importImage2: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    importFile: {
        tempo: 120,
        length: 0,
        tracks: [],
    },

    insertMedia1: {
        tempo: 120,
        length: 2,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 1, start: 1, end: 3 },
                ],
                effects: {},
            },
        ],
    },

    insertMedia2: {
        tempo: 120,
        length: 3,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 2, start: 1, end: 3 },
                ],
                effects: {},
            },
        ],
    },

    insertMediaSection: {
        tempo: 120,
        length: 2.5,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 3, start: 1, end: 1.5 },
                ],
                effects: {},
            },
        ],
    },

    makeBeatSlice: {
        tempo: 120,
        length: 0.25,
        tracks: [
            {
                clips: [],
                effects: {},
            },
            {
                clips: [
                    { filekey: "HIPHOP_TRAPHOP_BEAT_002", measure: 1, start: 1, end: 1.0625 },
                    { filekey: "HIPHOP_TRAPHOP_BEAT_002", measure: 1.0625, start: 1.0625, end: 1.125 },
                    { filekey: "HIPHOP_TRAPHOP_BEAT_002", measure: 1.125, start: 1.125, end: 1.1875 },
                    { filekey: "HIPHOP_TRAPHOP_BEAT_002", measure: 1.1875, start: 1.1875, end: 1.25 },
                ],
                effects: {},
            },
        ],
    },

}
