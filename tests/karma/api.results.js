export const API_RESULTS = {
    analyze: {
        tempo: 120,
        length: 0,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    analyzeForTime: {
        tempo: 120,
        length: 0,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    analyzeTrack: {
        tempo: 120,
        length: 8,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    createAudioSlice: {
        tempo: 120,
        length: 2,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_001|SLICE1:2", track: 1, measure: 1, start: 1, end: 2, scale: false, loop: true, silence: 0, loopChild: false },
                    { filekey: "DUBSTEP_BASS_WOBBLE_001|SLICE1:2", track: 1, measure: 2, start: 1, end: 2, scale: false, loop: true, loopChild: true },
                ],
                effects: {},
                analyser: {},
            },
        ],
        slicedClips: {
            "DUBSTEP_BASS_WOBBLE_001|SLICE1:2": {
                sourceFile: "DUBSTEP_BASS_WOBBLE_001",
                start: 1,
                end: 2,
            },
        },
    },
    createAudioStretch: {
        init: true,
        finish: false,
        length: 8.5,
        tracks:
        [
            {
                effects:
                {
                    "TEMPO-TEMPO":
                    [
                        { measure: 1, value: 120, shape: "square", sourceLine: 1 },
                        { measure: 1, value: 65, shape: "linear", sourceLine: 2 },
                        { measure: 9, value: 178, shape: "square", sourceLine: 2 },
                    ],
                },
                clips:
                [
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 1, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 1.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 1.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 1.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 2, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 2.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 2.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 2.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 3, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 3.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 3.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 3.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 4, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 4.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 4.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 4.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 5.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 5.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 5.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 6, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 6.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 6.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 6.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 7, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 7.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 7.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 7.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 8, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 8.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 8.5, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 8.75, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME01", sourceAudio: {}, audio: {}, track: 0, measure: 9, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                    { filekey: "METRONOME02", sourceAudio: {}, audio: {}, track: 0, measure: 9.25, start: 1, end: 1.625, scale: false, loop: false, loopChild: false },
                ],
            },
            {
                clips:
                [
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", track: 1, measure: 1, start: 1, end: 5, scale: false, loop: true, silence: 0, sourceLine: 8, tempo: 130, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", track: 1, measure: 5, start: 1, end: 5, scale: false, loop: true, silence: 0, sourceLine: 8, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", track: 1, measure: 9, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 8, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH2", track: 2, measure: 1, start: 1, end: 9, scale: false, loop: true, silence: 0, sourceLine: 12, tempo: 260, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH2", track: 2, measure: 9, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 12, tempo: 260, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 1, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 1.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 2, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 2.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 3, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 3.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 4, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 4.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 5.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 6, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 6.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 7, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 7.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 8, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 8.5, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2", track: 3, measure: 9, start: 1, end: 1.25, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 130, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH-1.5", track: 4, measure: 1, start: 1, end: 7, scale: false, loop: true, silence: 0, sourceLine: 20, tempo: 195, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH-1.5", track: 4, measure: 7, start: 1, end: 3.5, scale: false, loop: true, silence: 0, sourceLine: 20, tempo: 195, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 1, start: 1, end: 1.75792, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 2, start: 1, end: 1.75792, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 3, start: 1, end: 1.92262, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 5, start: 1, end: 2.0873, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 7, start: 1, end: 2.4167, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", track: 5, measure: 9, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 23, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 1, start: 1, end: 1.25264, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 1.5, start: 1, end: 1.25264, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 2, start: 1, end: 1.28009, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 2.5, start: 1, end: 1.30754, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 3, start: 1, end: 1.33499, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 3.5, start: 1, end: 1.3624399999999999, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 4, start: 1, end: 1.38989, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 4.5, start: 1, end: 1.41734, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 5, start: 1, end: 1.44479, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 5.5, start: 1, end: 1.47224, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 6, start: 1, end: 1.49969, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 7, start: 1, end: 1.5271400000000002, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 8, start: 1, end: 1.5820400000000001, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333", track: 6, measure: 9, start: 1, end: 1.5, scale: false, loop: true, silence: 0, sourceLine: 27, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 1, start: 1, end: 1.4, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 1.5, start: 1, end: 1.4, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 2, start: 1, end: 1.44346, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 2.5, start: 1, end: 1.48692, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 3.5, start: 1, end: 1.53038, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 4.5, start: 1, end: 1.6173, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 5.5, start: 1, end: 1.70423, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 6.5, start: 1, end: 1.79115, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 7.5, start: 1, end: 1.8780700000000001, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6", track: 7, measure: 8.5, start: 1, end: 1.9649999999999999, scale: false, loop: true, silence: 0, sourceLine: 31, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
            {
                clips:
                [
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH-2", track: 8, measure: 1, start: 1, end: 2.5158, scale: false, loop: true, silence: 0, sourceLine: 35, sourceAudio: {}, audio: {}, loopChild: false },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH-2", track: 8, measure: 3, start: 1, end: 2.5158, scale: false, loop: true, silence: 0, sourceLine: 35, sourceAudio: {}, audio: {}, loopChild: true },
                    { filekey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH-2", track: 8, measure: 7, start: 1, end: 3.1746, scale: false, loop: true, silence: 0, sourceLine: 35, sourceAudio: {}, audio: {}, loopChild: true },
                ],
                effects: {},
            },
        ],
        transformedClips:
        {
            "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH2": { kind: "stretch", sourceKey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", stretchFactor: 2 },
            "RD_ROCK_POPRHYTHM_MAINDRUMS_4|SLICE1.5:2": { kind: "slice", sourceKey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", start: 1.5, end: 2 },
            "RD_ROCK_POPRHYTHM_MAINDRUMS_4|STRETCH-1.5": { kind: "stretch", sourceKey: "RD_ROCK_POPRHYTHM_MAINDRUMS_4", stretchFactor: -1.5 },
            "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH0.33333": { kind: "stretch", sourceKey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", stretchFactor: 0.3333333333333333 },
            "RBIRD_VOX_CLOSER_TO_YOUR_VISION|SLICE1.2:1.6": { kind: "slice", sourceKey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", start: 1.2, end: 1.6 },
            "RBIRD_VOX_CLOSER_TO_YOUR_VISION|STRETCH-2": { kind: "stretch", sourceKey: "RBIRD_VOX_CLOSER_TO_YOUR_VISION", stretchFactor: -2 },
        },
    },
    fitMedia: {
        tempo: 120,
        length: 8,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    importImage2: {
        tempo: 120,
        length: 0,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    importFile: {
        tempo: 120,
        length: 0,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
        ],
    },
    insertMedia1: {
        tempo: 120,
        length: 2,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 3, start: 1, end: 1.5 },
                ],
                effects: {},
            },
        ],
    },
    insertMediaSectionMiddle: {
        tempo: 120,
        length: 2.5,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 3, start: 1.5, end: 2 },
                ],
                effects: {},
            },
        ],
    },
    insertMediaSectionTimeStretchMiddle: {
        tempo: 121,
        length: 2.5,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 121, shape: "square" },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "HOUSE_BREAKBEAT_003", measure: 3, start: 1.5, end: 2 },
                ],
                effects: {},
            },
        ],
    },
    insertMediaSectionTimeStretch: {
        tempo: 121,
        length: 2.5,
        tracks: [
            {
                clips: [],
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 121, shape: "square" },
                    ],
                },
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
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square" },
                        { measure: 1, value: 120, shape: "square" },
                    ],
                },
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
    rhythmEffects: {
        init: true,
        finish: false,
        length: 14,
        tracks: [
            {
                effects: {
                    "TEMPO-TEMPO": [
                        { measure: 1, value: 120, shape: "square", sourceLine: 1 },
                        { measure: 1, value: 120, shape: "square", sourceLine: 2 },
                    ],
                },
                clips: [],
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 1, measure: 1, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 1.125, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 1.25, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 1.375, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 1.5, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 1.625, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 1.75, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 1.875, value: 12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 2, measure: 3, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 3, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 3.125, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 3.25, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 3.375, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 3.5, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 3.625, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 3.75, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 3.875, value: 12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 3, measure: 5, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 5, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 5.25, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 5.5, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 5.75, value: 12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 4, measure: 7, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 7, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 7.5, value: 12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 5, measure: 9, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 9, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 9.125, value: -12, shape: "linear", sourceLine: 17 },
                        { measure: 9.25, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 9.25, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 9.375, value: 12, shape: "linear", sourceLine: 17 },
                        { measure: 9.5, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 9.5, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 9.625, value: -12, shape: "linear", sourceLine: 17 },
                        { measure: 9.75, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 9.75, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 9.875, value: 12, shape: "linear", sourceLine: 17 },
                        { measure: 10, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 10, value: -12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 6, measure: 11, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 11, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 11.125, value: -12, shape: "linear", sourceLine: 17 },
                        { measure: 11.5, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 11.5, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 11.625, value: 12, shape: "linear", sourceLine: 17 },
                        { measure: 12, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 12, value: -12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
            {
                clips: [
                    { filekey: "DUBSTEP_BASS_WOBBLE_015", track: 7, measure: 13, start: 1, end: 3, scale: false, loop: true, silence: 0, sourceLine: 16, tempo: 140, sourceAudio: {}, audio: {}, loopChild: false },
                ],
                effects: {
                    "PITCHSHIFT-PITCHSHIFT_SHIFT": [
                        { measure: 1, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 13, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 13.25, value: -12, shape: "linear", sourceLine: 17 },
                        { measure: 13.5, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 13.5, value: 12, shape: "square", sourceLine: 17 },
                        { measure: 13.875, value: 12, shape: "linear", sourceLine: 17 },
                        { measure: 14, value: -12, shape: "square", sourceLine: 17 },
                        { measure: 14, value: -12, shape: "square", sourceLine: 17 },
                    ],
                },
            },
        ],
        slicedClips: {},
    },
}
