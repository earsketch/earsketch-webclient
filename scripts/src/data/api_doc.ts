export interface APIParameter {
    typeKey: string
    descriptionKey: string
    default?: string
}

type APIParameters = { [name: string]: APIParameter }

export interface APIItem {
    descriptionKey: string
    example: {
        python: string
        javascript: string
    }
    autocomplete?: string
    parameters?: APIParameters
    returns?: {
        typeKey: string
        descriptionKey: string
    }
    meta?: any
    expert?: string
    caveats?: string
}

// TODO: Would simplify things if this were *always* APIItem[] (with array of size 1 for single-signature functions).
const apiDoc: { [key: string]: APIItem | APIItem[] } = {
    analyze: {
        descriptionKey: "api:analyze.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:analyze.parameters.sound.description",
            },

            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyze.parameters.feature.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyze.returns.description",
        },
        example: {
            python: "# Find the spectral centroid of the audio file specified \ncentroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID)",

            javascript: "// Find the spectral centroid of the audio file specified \nvar centroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID);",
        },
    },

    analyzeForTime: {
        descriptionKey: "api:analyzeForTime.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:analyzeForTime.parameters.sound.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeForTime.parameters.feature.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeForTime.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeForTime.parameters.sliceEnd.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeForTime.returns.description",
        },
        example: {
            python: "# Find the spectral centroid for the first measure of the audio file\ncentroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0)",

            javascript: "// Find the spectral centroid for the first measure of the audio file\nvar centroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0);",
        },
    },

    analyzeTrack: {
        descriptionKey: "api:analyzeTrack.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:analyzeTrack.parameters.track.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeTrack.parameters.feature.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeTrack.returns.description",
        },
        example: {
            python: "# Find the spectral centroid of all of track 1\ncentroidValue = analyzeTrack(1, SPECTRAL_CENTROID)",

            javascript: "// Find the spectral centroid of all of track 1\nvar centroidValue = analyzeTrack(1, SPECTRAL_CENTROID);",
        },
    },

    analyzeTrackForTime: {
        descriptionKey: "api:analyzeTrackForTime.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:analyzeTrackForTime.parameters.track.description",
            },
            feature: {
                typeKey: "api:types.analysisConstant",
                descriptionKey: "api:analyzeTrackForTime.parameters.feature.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeTrackForTime.parameters.start.description",
            },
            end: {
                typeKey: "api:types.float",
                descriptionKey: "api:analyzeTrackForTime.parameters.end.description",
            },
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:analyzeTrackForTime.returns.description",
        },
        example: {
            python: "# Find the spectral centroid of all of track 1 between measures 1 and 9\ncentroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0)",

            javascript: "// Find the spectral centroid of all of track 1 between measures 1 and 9\nvar centroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0);",
        },
    },

    createAudioSlice: {
        descriptionKey: "api:createAudioSlice.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:createAudioSlice.parameters.sound.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:createAudioSlice.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:createAudioSlice.parameters.sliceEnd.description",
            },
        },
        example: {
            python: "slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5)\nfitMedia(slice, 1, 1, 3)",

            javascript: "var slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5);\nfitMedia(slice, 1, 1, 3);",
        },
        returns: {
            typeKey: "api:types.soundConstant",
            descriptionKey: "api:createAudioSlice.returns.description",
        },
    },

    dur: {
        descriptionKey: "api:dur.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:dur.parameters.sound.description",
            },
        },
        example: {
            python: "dur(HOUSE_BREAKBEAT_001)",

            javascript: "dur(HOUSE_BREAKBEAT_001);",
        },
        returns: {
            typeKey: "api:types.float",
            descriptionKey: "api:dur.returns.description",
        },
    },

    finish: {
        descriptionKey: "api:finish.description",
        example: {
            python: "# Rest of script above this line...\nfinish()",
            javascript: "// Rest of script above this line...\nfinish();",
        },
    },

    fitMedia: {
        descriptionKey: "api:fitMedia.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:fitMedia.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:fitMedia.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:fitMedia.parameters.start.description",
            },
            end: {
                typeKey: "api:types.float",
                descriptionKey: "api:fitMedia.parameters.end.description",
            },
        },
        example: {
            python: "# Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9)",

            javascript: "// Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9);",
        },
    },

    importImage: {
        descriptionKey: "api:importImage.description",
        parameters: {
            url: {
                typeKey: "api:types.string",
                descriptionKey: "api:importImage.parameters.url.description",
            },
            nrows: {
                typeKey: "api:types.integer",
                descriptionKey: "api:importImage.parameters.nrows.description",
            },
            ncols: {
                typeKey: "api:types.integer",
                descriptionKey: "api:importImage.parameters.ncols.description",
            },
            includeRGB: {
                typeKey: "api:types.booleanOptional",
                default: "False",
                descriptionKey: "api:importImage.parameters.includeRGB.description",
            },
        },
        example: {
            python: "# Turn an image into a 10x10 grayscale list\npixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10)\nprint pixelData",

            javascript: "// Turn an image into a 10x10 grayscale list\nvar pixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10);\nprintln(pixelData);",
        },
        returns: {
            typeKey: "api:types.list",
            descriptionKey: "api:importImage.returns.description",
        },
    },

    importFile: {
        descriptionKey: "api:importFile.description",
        parameters: {
            url: {
                typeKey: "api:types.string",
                descriptionKey: "api:importFile.parameters.url.description",
            },
        },
        example: {
            python: "# Load a file via URL\nfileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\")\nprint fileData",

            javascript: "// Load a file via URL\nvar fileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\");\nprintln(fileData);",
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:importFile.returns.description",
        },
    },

    init: {
        descriptionKey: "api:init.description",
        example: {
            python: "init()\n# Rest of script below this line...",
            javascript: "init();\n// Rest of script below this line...",
        },
    },

    insertMedia: {
        descriptionKey: "api:insertMedia.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:insertMedia.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:insertMedia.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMedia.parameters.start.description",
            },
        },
        example: {
            python: "# Insert audio file on track 1, measure 2, beat 3\ninsertMedia(HOUSE_BREAKBEAT_003, 1, 2.5)",

            javascript: "insertMedia(HOUSE_BREAKBEAT_003, 1, 2.5);",
        },
    },

    insertMediaSection: {
        descriptionKey: "api:insertMediaSection.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:insertMediaSection.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:insertMediaSection.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.start.description",
            },
            sliceStart: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.sliceStart.description",
            },
            sliceEnd: {
                typeKey: "api:types.float",
                descriptionKey: "api:insertMediaSection.parameters.sliceEnd.description",
            },
        },
        example: {
            python: "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5)",

            javascript: "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5);",
        },
    },

    makeBeat: {
        descriptionKey: "api:makeBeat.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundOrList",
                descriptionKey: "api:makeBeat.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:makeBeat.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:makeBeat.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:makeBeat.parameters.beat.description",
            },
        },
        example: {
            python: "# Places a 16th note of audio every quarter note.\nbeatPattern = \"0---0---0---0---\"\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern)",

            javascript: "// Places a 16th note of audio every quarter note.\nvar beatPattern = \"0---0---0---0---\";\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern);",
        },
    },

    makeBeatSlice: {
        descriptionKey: "api:makeBeatSlice.description",
        parameters: {
            sound: {
                typeKey: "api:types.soundConstant",
                descriptionKey: "api:makeBeatSlice.parameters.sound.description",
            },
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:makeBeatSlice.parameters.track.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:makeBeatSlice.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:makeBeatSlice.parameters.beat.description",
            },
            sliceStarts: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:makeBeatSlice.parameters.sliceStarts.description",
            },
        },
        example: {
            python: "# Play the first 4 sixteen note slices\nbeatString1 = '0123'\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875])",

            javascript: "// Play the first 4 sixteen note slices\nvar beatString1 = '0123';\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875]);",
        },
    },

    print: {
        descriptionKey: "api:print.description",
        parameters: {
            input: {
                typeKey: "api:types.stringNumberList",
                descriptionKey: "api:print.parameters.input.description",
            },
        },
        example: {
            python: "print 1 + 2\nprint \"hello!\"",
            javascript: "should not show",
        },
        meta: {
            language: "python",
        },
    },

    println: {
        descriptionKey: "api:println.description",
        parameters: {
            input: {
                typeKey: "api:types.stringNumberList",
                descriptionKey: "api:println.parameters.input.description",
            },
        },
        example: {
            python: "should not show",
            javascript: "println(1 + 2);\nprintln(\"hello!\");",
        },
        meta: {
            language: "javascript",
        },
    },

    readInput: {
        descriptionKey: "api:readInput.description",
        parameters: {
            prompt: {
                typeKey: "api:types.stringOptional",
                descriptionKey: "api:readInput.parameters.prompt.description",
            },
        },
        example: {
            python: "# Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\")",
            javascript: "// Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\");\n",
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:readInput.returns.description",
        },
    },

    replaceListElement: {
        descriptionKey: "api:replaceListElement.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:replaceListElement.parameters.list.description",
            },
            elementToReplace: {
                typeKey: "api:types.any",
                descriptionKey: "api:replaceListElement.parameters.elementToReplace.description",
            },
            withElement: {
                typeKey: "api:types.any",
                descriptionKey: "api:replaceListElement.parameters.withElement.description",
            },
        },
        example: {
            python: "# Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nnewList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003)",

            javascript: "// Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar newList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003);",
        },
    },

    replaceString: {
        descriptionKey: "api:replaceString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.string.description",
            },
            characterToReplace: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.characterToReplace.description",
            },
            withCharacter: {
                typeKey: "api:types.string",
                descriptionKey: "api:replaceString.parameters.withCharacter.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:replaceString.returns.description",
        },
        example: {
            python: "# Change all '0's to '1's\nnewString = replaceString(\"0---0---0---0---\", \"0\", \"1\")",

            javascript: "// Change all '0's to '1's\nvar newString = replaceString(\"0---0---0---0---\", \"0\", \"1\");",
        },
    },

    reverseList: {
        descriptionKey: "api:reverseList.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:reverseList.parameters.list.description",
            },
        },
        returns: {
            typeKey: "api:types.listArray",
            descriptionKey: "api:reverseList.returns.description",
        },
        example: {
            python: "# Reverses a list of audio constants\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nreversedList = reverseList(audioFiles)",

            javascript: "// Reverses a list of audio constants\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar reversedList = reverseList(audioFiles);",
        },
    },

    reverseString: {
        descriptionKey: "api:reverseString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:reverseString.parameters.string.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:reverseString.returns.description",
        },
        example: {
            python: "# inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nnewString = reverseString(\"0+++0---0++-00-0\")",

            javascript: "// inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nvar newString = reverseString(\"0+++0---0++-00-0\");",
        },
    },

    rhythmEffects: {
        descriptionKey: "api:rhythmEffects.description",
        parameters: {
            track: {
                typeKey: "api:types.integer",
                descriptionKey: "api:rhythmEffects.parameters.track.description",
            },
            type: {
                typeKey: "api:types.effectConstant",
                descriptionKey: "api:rhythmEffects.parameters.type.description",
            },
            parameter: {
                typeKey: "api:types.effectParameterConstant",
                descriptionKey: "api:rhythmEffects.parameters.parameter.description",
            },
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:rhythmEffects.parameters.list.description",
            },
            start: {
                typeKey: "api:types.float",
                descriptionKey: "api:rhythmEffects.parameters.start.description",
            },
            beat: {
                typeKey: "api:types.string",
                descriptionKey: "api:rhythmEffects.parameters.beat.description",
            },
        },
        example: {
            python: "# Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\")",

            javascript: "// Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\");",
        },
    },

    selectRandomFile: {
        descriptionKey: "api:selectRandomFile.description",
        parameters: {
            folderSubstring: {
                typeKey: "api:types.string",
                default: "\"\"",
                descriptionKey: "api:selectRandomFile.parameters.folderSubstring.description",
            },
        },
        returns: {
            typeKey: "api:types.soundConstant",
            descriptionKey: "api:selectRandomFile.returns.description",
        },
        example: {
            python: "# Get random sound from the ALT_POP_GUITAR folder and assign to randomSound\nrandomSound = selectRandomFile(ALT_POP_GUITAR)",

            javascript: "// Get random sound from the ALT_POP_GUITAR folder and assign to randomSound\nvar randomSound = selectRandomFile(ALT_POP_GUITAR);",
        },
    },

    setEffect: [
        {
            descriptionKey: "api:setEffect1.description",
            parameters: {
                track: {
                    typeKey: "api:types.integer",
                    descriptionKey: "api:setEffect1.parameters.track.description",
                },
                type: {
                    typeKey: "api:types.effectConstant",
                    descriptionKey: "api:setEffect1.parameters.type.description",
                },
                parameter: {
                    typeKey: "api:types.effectParameterConstant",
                    descriptionKey: "api:setEffect1.parameters.parameter.description",
                },
                value: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setEffect1.parameters.value.description",
                },
            },
            example: {
                python: "# Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250)",

                javascript: "// Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250);",
            },
        },
        {
            descriptionKey: "api:setEffect2.description",
            parameters: {
                track: {
                    typeKey: "api:types.integer",
                    descriptionKey: "api:setEffect1.parameters.track.description",
                },
                type: {
                    typeKey: "api:types.effectConstant",
                    descriptionKey: "api:setEffect1.parameters.type.description",
                },
                parameter: {
                    typeKey: "api:types.effectParameterConstant",
                    descriptionKey: "api:setEffect1.parameters.parameter.description",
                },
                startValue: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setEffect2.parameters.startValue.description",
                },
                start: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setEffect2.parameters.start.description",
                },
                endValue: {
                    typeKey: "api:types.floatOptional",
                    descriptionKey: "api:setEffect2.parameters.endValue.description",
                },
                end: {
                    typeKey: "api:types.floatOptional",
                    descriptionKey: "api:setEffect2.parameters.end.description",
                },
            },
            example: {
                python: "# Change filter cutoff frequency from 100Hz to 2000Hz over measures 1 to 3\nsetEffect(1, FILTER, FILTER_FREQ, 100.0, 1.0, 2000, 3.0)",

                javascript: "// Change filter cutoff frequency from 100Hz to 2000Hz over measures 1 to 3\nsetEffect(1, FILTER, FILTER_FREQ, 100.0, 1.0, 2000, 3.0);",
            },
        },
    ],

    setTempo: [
        {
            descriptionKey: "api:setTempo1.description",
            parameters: {
                tempo: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setTempo1.parameters.tempo.description",
                },
            },
            example: {
                python: "# Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110)",

                javascript: "// Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110);",
            },
        },
        {
            descriptionKey: "api:setTempo2.description",
            parameters: {
                startTempo: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setTempo2.parameters.startTempo.description",
                },
                start: {
                    typeKey: "api:types.float",
                    descriptionKey: "api:setTempo2.parameters.start.description",
                },
                endTempo: {
                    typeKey: "api:types.floatOptional",
                    descriptionKey: "api:setTempo2.parameters.endTempo.description",
                },
                end: {
                    typeKey: "api:types.floatOptional",
                    descriptionKey: "api:setTempo2.parameters.end.description",
                },
            },
            example: {
                python: "# Set the tempo to 110 Beats Per Minute at measure 2\nsetTempo(110, 2)\n# Ramp tempo from 80 BPM to 140 BPM from measure 3 to 6\nsetTempo(80, 3, 140, 6)",

                javascript: "// Set the tempo to 110 Beats Per Minute at measure 2\nsetTempo(110, 2);\n// Ramp tempo from 80 BPM to 140 BPM from measure 3 to 6\nsetTempo(80, 3, 140, 6);",
            },
        },
    ],

    shuffleList: {
        descriptionKey: "api:shuffleList.description",
        parameters: {
            list: {
                typeKey: "api:types.listArray",
                descriptionKey: "api:shuffleList.parameters.list.description",
            },
        },
        returns: {
            typeKey: "api:types.listArray",
            descriptionKey: "api:shuffleList.returns.description",
        },
        example: {
            python: "audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nshuffledList = shuffleList(audioFiles)",

            javascript: "var audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar shuffledList = shuffleList(audioFiles);",
        },
    },

    shuffleString: {
        descriptionKey: "api:shuffleString.description",
        parameters: {
            string: {
                typeKey: "api:types.string",
                descriptionKey: "api:shuffleString.parameters.string.description",
            },
        },
        returns: {
            typeKey: "api:types.string",
            descriptionKey: "api:shuffleString.returns.description",
        },
        example: {
            python: "# inputs \"0+++0---0++-00-0\" and shuffles it randomly\nnewString = shuffleString(\"0+++0---0++-00-0\")",

            javascript: "// inputs \"0+++0---0++-00-0\" and shuffles it randomly\nvar newString = shuffleString(\"0+++0---0++-00-0\");",
        },
    },
}

function getSignature(name: string, parameters: APIParameters) {
    const paramStrings = Object.entries(parameters).map(
        ([param, info]) => param + (info.default ? `=${info.default}` : "")
    )
    return `${name}(${paramStrings.join(", ")})`
}

// Fill in autocomplete fields.
for (const [name, info] of Object.entries(apiDoc)) {
    if (Array.isArray(info)) {
        for (const variant of info) {
            variant.autocomplete = getSignature(name, variant.parameters ?? {})
        }
    } else {
        info.autocomplete = getSignature(name, info.parameters ?? {})
    }
}

export const ESApiDoc: { readonly [key: string]: APIItem | readonly APIItem[] } = apiDoc
