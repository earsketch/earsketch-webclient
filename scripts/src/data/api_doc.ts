// TODO: There are some links to the curriculum that relies on Angular main controller for accessing the Redux store. We should import the store and curriculumState here to dispatch the action directly. (#2232)
import i18n from "i18next";

export interface APIParameter {
    type: string
    descriptionKey: string
    default?: string
}

export interface APIItem {
    descriptionKey: string
    example: {
        python: string
        javascript: string
    }
    autocomplete?: string
    parameters?: {
        [name: string]: APIParameter
    }
    returns?: {
        type: string
        descriptionKey: string
    }
    meta?: any
    expert?: string
    caveats?: string
}

export function ESApiDoc(): { [key: string]: APIItem | readonly APIItem[] } {
    return {
        "analyze": {
            "descriptionKey": "api:analyze.description",
            "parameters": {
                "audioFile": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:analyze.parameters.audioFile.description"
                },

                "featureForAnalysis": {
                    "type": i18n.t("api:types.analysisConstant"),
                    "descriptionKey": "api:analyze.parameters.featureForAnalysis.description"
                }
            },
            "returns": {
                "type": "Float",
                "descriptionKey": "api:analyze.returns.description"
            },
            "example": {
                "python": "# Find the spectral centroid of the audio file specified \ncentroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID)",

                "javascript": "// Find the spectral centroid of the audio file specified \nvar centroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID);"
            },
            "autocomplete": "analyze(clipName, featureConstant)",
        },

        "analyzeForTime": {
            "descriptionKey": "api:analyzeForTime.description",
            "parameters": {
                "audioFile": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:analyzeForTime.parameters.audioFile.description"
                },
                "featureForAnalysis": {
                    "type": i18n.t("api:types.analysisConstant"),
                    "descriptionKey": "api:analyzeForTime.parameters.featureForAnalysis.description"
                },
                "startTime": {
                    "type": "Float",
                    "descriptionKey": "api:analyzeForTime.parameters.startTime.description"
                },
                "endTime": {
                    "type": "Float",
                    "descriptionKey": "api:analyzeForTime.parameters.endTime.description"
                }
            },
            "returns": {
                "type": "Float",
                "descriptionKey": "api:analyzeForTime.returns.description"
            },
            "example": {
                "python": "# Find the spectral centroid for the first measure of the audio file\ncentroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0)",

                "javascript": "// Find the spectral centroid for the first measure of the audio file\nvar centroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0);"
            },
            "autocomplete": "analyzeForTime(clipName, featureConstant, startTime, endTime)",
        },

        "analyzeTrack": {
            "descriptionKey": "api:analyzeTrack.description",
            "parameters": {
                "trackNumber": {
                    "type": "Integer",
                    "descriptionKey": "api:analyzeTrack.parameters.trackNumber.description"
                },
                "featureForAnalysis": {
                    "type": i18n.t("api:types.analysisConstant"),
                    "descriptionKey": "api:analyzeTrack.parameters.featureForAnalysis.description"
                }
            },
            "returns": {
                "type": "Float",
                "descriptionKey": "api:analyzeTrack.returns.description"
            },
            "example": {
                "python": "# Find the spectral centroid of all of track 1\ncentroidValue = analyzeTrack(1, SPECTRAL_CENTROID)",

                "javascript": "// Find the spectral centroid of all of track 1\nvar centroidValue = analyzeTrack(1, SPECTRAL_CENTROID);"
            },
            "autocomplete": "analyzeTrack(trackNum, featureConstant)",
        },

        "analyzeTrackForTime": {
            "descriptionKey": "api:analyzeTrackForTime.description",
            "parameters": {
                "trackNumber": {
                    "type": "Integer",
                    "descriptionKey": "api:analyzeTrackForTime.parameters.trackNumber.description"
                },
                "featureForAnalysis": {
                    "type": i18n.t("api:types.analysisConstant"),
                    "descriptionKey": "api:analyzeTrackForTime.parameters.featureForAnalysis.description"
                },
                "startTime": {
                    "type": "Float",
                    "descriptionKey": "api:analyzeTrackForTime.parameters.startTime.description"
                },
                "endTime": {
                    "type": "Float",
                    "descriptionKey": "api:analyzeTrackForTime.parameters.endTime.description"
                }
            },
            "returns": {
                "type": "Float",
                "descriptionKey": "api:analyzeTrackForTime.returns.description"
            },
            "example": {
                "python": "# Find the spectral centroid of all of track 1 between measures 1 and 9\ncentroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0)",

                "javascript": "// Find the spectral centroid of all of track 1 between measures 1 and 9\nvar centroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0);"
            },
            "autocomplete": "analyzeTrackForTime(trackNum, featureConstant, startTime, endTime)",
        },

        "createAudioSlice": {
            "descriptionKey": "api:createAudioSlice.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:createAudioSlice.parameters.fileName.description"
                },
                "startPosition": {
                    "type": "Float",
                    "descriptionKey": "api:createAudioSlice.parameters.startPosition.description"
                },
                "endPosition": {
                    "type": "Float",
                    "descriptionKey": "api:createAudioSlice.parameters.endPosition.description"
                },
            },
            "example": {
                "python": "slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5)\nfitMedia(slice, 1, 1, 3)",

                "javascript": "var slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5);\nfitMedia(slice, 1, 1, 3);"
            },
            "returns": {
                "type": i18n.t("api:types.soundConstant"),
                "descriptionKey": "api:createAudioSlice.returns.description"
            },
            "autocomplete": "createAudioSlice(fileName, startPosition, endPosition)",
        },

        "dur": {
            "descriptionKey": "api:dur.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:dur.parameters.fileName.description"
                }
            },
            "example": {
                "python": "dur(HOUSE_BREAKBEAT_001)",

                "javascript": "dur(HOUSE_BREAKBEAT_001);"
            },
            "returns": {
                "type": "Float",
                "descriptionKey": "api:dur.returns.description"
            },
            "autocomplete": "dur(fileName)",
        },

        "finish": {
            "descriptionKey": "api:finish.description",
            "example": {
                "python": "# Rest of script above this line...\nfinish()",
                "javascript": "// Rest of script above this line...\nfinish();"
            },
            "autocomplete": "finish()"
        },

        "fitMedia": {
            "descriptionKey": "api:fitMedia.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:fitMedia.parameters.fileName.description"
                },
                "trackNumber": {
                    "type": "Integer",
                    "descriptionKey": "api:fitMedia.parameters.trackNumber.description"
                },
                "startLocation": {
                    "type": "Float",
                    "descriptionKey": "api:fitMedia.parameters.startLocation.description"
                },
                "endLocation": {
                    "type": "Float",
                    "descriptionKey": "api:fitMedia.parameters.endLocation.description"
                }
            },
            "example": {
                "python": "# Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9)",

                "javascript": "// Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9);"
            },
            "autocomplete": "fitMedia(fileName, trackNum, startLocation, endLocation)"
        },

        "importImage": {
            "descriptionKey": "api:importImage.description",
            "parameters": {
                "imageURL": {
                    "type": "String",
                    "descriptionKey": "api:importImage.parameters.imageURL.description"
                },
                "nrows": {
                    "type": "Integer",
                    "descriptionKey": "api:importImage.parameters.nrows.description"
                },
                "ncols": {
                    "type": "Integer",
                    "descriptionKey": "api:importImage.parameters.ncols.description"
                },
                "includeRGB": {
                    "type": "Boolean, Optional",
                    "default": "False",
                    "descriptionKey": "api:importImage.parameters.includeRGB.description"
                }
            },
            "example": {
                "python": "# Turn an image into a 10x10 grayscale list\npixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10)\nprint pixelData",

                "javascript": "// Turn an image into a 10x10 grayscale list\nvar pixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10);\nprintln(pixelData);"
            },
            "returns": {
                "type": "List",
                "descriptionKey": "api:importImage.returns.description"
            },
            "autocomplete": "importImage(imageURL, nrows, ncols, False)"
        },

        "importFile": {
            "descriptionKey": "api:importFile.description",
            "parameters": {
                "fileURL": {
                    "type": "String",
                    "descriptionKey": "api:importFile.parameters.fileURL.description"
                }
            },
            "example": {
                "python": "# Load a file via URL\nfileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\")\nprint fileData",

                "javascript": "// Load a file via URL\nvar fileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\");\nprintln(fileData);"
            },
            "returns": {
                "type": "String",
                "descriptionKey": "api:importFile.returns.description"
            },
            "autocomplete": "importFile(fileUrl)"
        },

        "init": {
            "descriptionKey": "api:init.description",
            "example": {
                "python": "init()\n# Rest of script below this line...",
                "javascript": "init();\n// Rest of script below this line..."
            },
            "autocomplete": "init()"
        },

        "insertMedia": {
            "descriptionKey": "api:insertMedia.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:insertMedia.parameters.fileName.description"
                },
                "trackNumber": {
                    "type": "Integer",
                    "descriptionKey": "api:insertMedia.parameters.trackNumber.description"
                },
                "trackLocation": {
                    "type": "Float",
                    "descriptionKey": "api:insertMedia.parameters.trackLocation.description"
                }
            },
            "example": {
                "python": "# Insert audio file on track 1, measure 2, beat 3\ninsertMedia(HOUSE_BREAKBEAT_003, 1, 2.5)",

                "javascript": "insertMedia(HOUSE_BREAKBEAT_003, 1, 2.5);"
            },
            "autocomplete": "insertMedia(fileName, trackNum, trackLocation)"
        },


        "insertMediaSection": {
            "descriptionKey": "api:insertMediaSection.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:insertMediaSection.parameters.fileName.description"
                },
                "trackNumber": {
                    "type": "Integer",
                    "descriptionKey": "api:insertMediaSection.parameters.trackNumber.description"
                },
                "trackLocation": {
                    "type": "Float",
                    "descriptionKey": "api:insertMediaSection.parameters.trackLocation.description"
                },
                "mediaStartLocation": {
                    "type": "Float",
                    "descriptionKey": "api:insertMediaSection.parameters.mediaStartLocation.description"
                },
                "mediaEndLocation": {
                    "type": "Float",
                    "descriptionKey": "api:insertMediaSection.parameters.mediaEndLocation.description"
                }
            },
            "example": {
                "python": "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5)",

                "javascript": "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5);"
            },
            "autocomplete": "insertMediaSection(fileName, trackNum, trackLocation, mediaStartLocation, mediaEndLocation)"
        },

        "makeBeat": {
            "descriptionKey": "api:makeBeat.description",
            "parameters": {
                "fileName": {
                    "type": "Sound Constant or List/array",
                    "descriptionKey": "api:makeBeat.parameters.fileName.description"
                },
                "track": {
                    "type": "Integer",
                    "descriptionKey": "api:makeBeat.parameters.track.description"
                },
                "measure": {
                    "type": "Float",
                    "descriptionKey": "api:makeBeat.parameters.measure.description"
                },
                "string": {
                    "type": "String",
                    "descriptionKey": "api:makeBeat.parameters.string.description"
                }
            },
            "example": {
                "python": "# Places a 16th note of audio every quarter note.\nbeatPattern = \"0---0---0---0---\"\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern)",

                "javascript": "// Places a 16th note of audio every quarter note.\nvar beatPattern = \"0---0---0---0---\";\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern);"
            },
            "autocomplete": "makeBeat(fileName, trackNum, measure, string)"
        },

        "makeBeatSlice": {
            "descriptionKey": "api:makeBeatSlice.description",
            "parameters": {
                "fileName": {
                    "type": i18n.t("api:types.soundConstant"),
                    "descriptionKey": "api:makeBeatSlice.parameters.fileName.description"
                },
                "track": {
                    "type": "Integer",
                    "descriptionKey": "api:makeBeatSlice.parameters.track.description"
                },
                "measure": {
                    "type": "Float",
                    "descriptionKey": "api:makeBeatSlice.parameters.measure.description"
                },
                "string": {
                    "type": "String",
                    "descriptionKey": "api:makeBeatSlice.parameters.string.description"
                },
                "beatNumber": {
                    "type": "List/array",
                    "descriptionKey": "api:makeBeatSlice.parameters.beatNumber.description"
                }
            },
            "example": {
                "python": "# Play the first 4 sixteen note slices\nbeatString1 = '0123'\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875])",

                "javascript": "// Play the first 4 sixteen note slices\nvar beatString1 = '0123';\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875]);"
            },
            "autocomplete": "makeBeatSlice(fileName, trackNum, measure, string, beatNum)"
        },

        "print": {
            "descriptionKey": "api:print.description",
            "parameters": {
                "input": {
                    "type": "String/Number/List",
                    "descriptionKey": "api:print.parameters.input.description"
                }
            },
            "example": {
                "python": "print 1 + 2\nprint \"hello!\"",
                "javascript": "should not show"
            },
            "meta": {
                "language": "python"
            },
        },

        "println": {
            "descriptionKey": "api:println.description",
            "parameters": {
                "input": {
                    "type": "String/Number/List",
                    "descriptionKey": "api:println.parameters.input.description"
                }
            },
            "example": {
                "python": "should not show",
                "javascript": "println(1 + 2);\nprintln(\"hello!\");"
            },
            "meta": {
                "language": "javascript"
            },
        },

        "readInput": {
            "descriptionKey": "api:readInput.description",
            "parameters": {
                "prompt": {
                    "type": "String, Optional",
                    "descriptionKey": "api:readInput.parameters.prompt.description"
                }
            },
            "example": {
                "python": "# Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\")",
                "javascript": "// Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\");\n"
            },
            "returns": {
                "type": "String",
                "descriptionKey": "api:readInput.returns.description"
            },
            "autocomplete": "readInput(prompt)"
        },

        "replaceListElement": {
            "descriptionKey": "api:replaceListElement.description",
            "parameters": {
                "inputList": {
                    "type": "List/array",
                    "descriptionKey": "api:replaceListElement.parameters.inputList.description"
                },
                "elementToReplace": {
                    "type": "Any type",
                    "descriptionKey": "api:replaceListElement.parameters.elementToReplace.description"
                },
                "withElement": {
                    "type": "Any type",
                    "descriptionKey": "api:replaceListElement.parameters.withElement.description"
                }
            },
            "example": {
                "python": "# Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nnewList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003)",

                "javascript": "// Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar newList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003);"
            },
            "autocomplete": "replaceListElement(inputList, elementToReplace, withElement)"
        },

        "replaceString": {
            "descriptionKey": "api:replaceString.description",
            "parameters": {
                "string": {
                    "type": "String",
                    "descriptionKey": "api:replaceString.parameters.string.description"
                },
                "characterToReplace": {
                    "type": "String",
                    "descriptionKey": "api:replaceString.parameters.characterToReplace.description"
                },
                "withCharacter": {
                    "type": "String",
                    "descriptionKey": "api:replaceString.parameters.withCharacter.description"
                }
            },
            "returns": {
                "type": "String",
                "descriptionKey": "api:replaceString.returns.description"
            },
            "example": {
                "python": "# Change all '0's to '1's\nnewString = replaceString(\"0---0---0---0---\", \"0\", \"1\")",

                "javascript": "// Change all '0's to '1's\nvar newString = replaceString(\"0---0---0---0---\", \"0\", \"1\");"
            },
            "autocomplete": "replaceString(string, characterToReplace, withCharacter)"
        },

        "reverseList": {
            "descriptionKey": "api:reverseList.description",
            "parameters": {
                "inputList": {
                    "type": "List/array",
                    "descriptionKey": "api:reverseList.parameters.inputList.description"
                }
            },
            "returns": {
                "type": "List/array",
                "descriptionKey": "api:reverseList.returns.description"
            },
            "example": {
                "python": "# Reverses a list of audio constants\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nreversedList = reverseList(audioFiles)",

                "javascript": "// Reverses a list of audio constants\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar reversedList = reverseList(audioFiles);"
            },
            "autocomplete": "reverseList(inputList)"
        },

        "reverseString": {
            "descriptionKey": "api:reverseString.description",
            "parameters": {
                "inputString": {
                    "type": "String",
                    "descriptionKey": "api:reverseString.parameters.inputString.description"
                }
            },
            "returns": {
                "type": "String",
                "descriptionKey": "api:reverseString.returns.description"
            },
            "example": {
                "python": "# inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nnewString = reverseString(\"0+++0---0++-00-0\")",

                "javascript": "// inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nvar newString = reverseString(\"0+++0---0++-00-0\");"
            },
            "autocomplete": "reverseString(reverseString)"
        },

        "rhythmEffects": {
            "descriptionKey": "api:rhythmEffects.description",
            "parameters": {
                "track": {
                    "type": "Integer",
                    "descriptionKey": "api:rhythmEffects.parameters.track.description"
                },
                "effectType": {
                    "type": i18n.t("api:types.effectConstant"),
                    "descriptionKey": "api:rhythmEffects.parameters.effectType.description"
                },
                "effectParameter": {
                    "type": i18n.t("api:types.effectParameterConstant"),
                    "descriptionKey": "api:rhythmEffects.parameters.effectParameter.description"
                },
                "effectList": {
                    "type": "List/array",
                    "descriptionKey": "api:rhythmEffects.parameters.effectList.description"
                },
                "measure": {
                    "type": "Float",
                    "descriptionKey": "api:rhythmEffects.parameters.measure.description"
                },
                "beatString": {
                    "type": "String",
                    "descriptionKey": "api:rhythmEffects.parameters.beatString.description"
                }
            },
            "example": {
                "python": "# Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\")",

                "javascript": "// Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\");"
            },
            "autocomplete": "rhythmEffects(track, effectType, effectParameter, effectList, measure, beatString)"
        },

        "selectRandomFile": {
            "descriptionKey": "api:selectRandomFile.description",
            "parameters": {
                "folder": {
                    "type": i18n.t("api:types.folderConstant"),
                    "descriptionKey": "api:selectRandomFile.parameters.folder.description"
                }
            },
            "returns": {
                type: i18n.t("api:types.soundConstant"),
                descriptionKey: "api:selectRandomFile.returns.description"
            },
            "example": {
                "python": "# Get random audio file from the ALT_POP_GUITAR folder and assign to randomAudio\nrandomAudio = selectRandomFile(ALT_POP_GUITAR)",

                "javascript": "// Get random audio file from the ALT_POP_GUITAR folder and assign to randomAudio\nvar randomAudio = selectRandomFile(ALT_POP_GUITAR);"
            },
            "autocomplete": "selectRandomFile(folder)"
        },

        "setEffect": [
            {
                "descriptionKey": "api:setEffect1.description",
                "parameters": {
                    "track": {
                        "type": "Integer",
                        "descriptionKey": "api:setEffect1.parameters.track.description"
                    },
                    "effectType": {
                        "type": i18n.t("api:types.effectConstant"),
                        "descriptionKey": "api:setEffect1.parameters.effectType.description"
                    },
                    "effectParameter": {
                        "type": i18n.t("api:types.effectParameterConstant"),
                        "descriptionKey": "api:setEffect1.parameters.effectParameter.description"
                    },
                    "effectValue": {
                        "type": "Float",
                        "descriptionKey": "api:setEffect1.parameters.effectValue.description"
                    }
                },
                "example": {
                    "python": "# Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250)",

                    "javascript": "// Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250);"
                },
                "autocomplete": "setEffect(track, effectType, effectParameter, effectValue)"
            },
            {
                "descriptionKey": "api:setEffect2.description",
                "parameters": {
                    "track": {
                        "type": "Integer",
                        "descriptionKey": "api:setEffect1.parameters.track.description"
                    },
                    "effectType": {
                        "type": i18n.t("api:types.effectConstant"),
                        "descriptionKey": "api:setEffect1.parameters.effectType.description"
                    },
                    "effectParameter": {
                        "type": i18n.t("api:types.effectParameterConstant"),
                        "descriptionKey": "api:setEffect1.parameters.effectParameter.description"
                    },
                    "effectStartValue": {
                        "type": "Float",
                        "descriptionKey": "api:setEffect2.parameters.effectStartValue.description"
                    },
                    "effectStartLocation": {
                        "type": "Float",
                        "descriptionKey": "api:setEffect2.parameters.effectStartLocation.description"
                    },
                    "effectEndValue": {
                        "type": "Float",
                        "descriptionKey": "api:setEffect2.parameters.effectEndValue.description"
                    },
                    "effectEndLocation": {
                        "type": "Float",
                        "descriptionKey": "api:setEffect2.parameters.effectEndLocation.description"
                    }
                },
                "example": {
                    "python": "# Change filter cutoff frequency from 100Hz to 2000Hz over measures 1 to 3\nsetEffect(1, FILTER, FILTER_FREQ, 100.0, 1.0, 2000, 3.0)",

                    "javascript": "// Change filter cutoff frequency from 100Hz to 2000Hz over measures 1 to 3\nsetEffect(1, FILTER, FILTER_FREQ, 100.0, 1.0, 2000, 3.0);"
                },
                "autocomplete": "setEffect(track, effectType, effectParameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation)"
            }
        ],

        "setTempo": {
            "descriptionKey": "api:setTempo.description",
            "parameters": {
                "tempo": {
                    "type": "Integer",
                    "descriptionKey": "api:setTempo.parameters.tempo.description"
                }
            },
            "example": {
                "python": "# Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110)",

                "javascript": "// Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110);"
            },
            "autocomplete": "setTempo(tempo)"
        },

        "shuffleList": {
            "descriptionKey": "api:shuffleList.description",
            "parameters": {
                "inputList": {
                    "type": "List/array",
                    "descriptionKey": "api:shuffleList.parameters.inputList.description"
                }
            },
            "returns": {
                "type": "List/array",
                "descriptionKey": "api:shuffleList.returns.description"
            },
            "example": {
                "python": "audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nshuffledList = shuffleList(audioFiles)",

                "javascript": "var audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar shuffledList = shuffleList(audioFiles);"
            },
            "autocomplete": "shuffleList(inputList)"
        },

        "shuffleString": {
            "descriptionKey": "api:shuffleString.description",
            "parameters": {
                "inputString": {
                    "type": "String",
                    "descriptionKey": "api:shuffleString.parameters.inputString.description"
                }
            },
            "returns": {
                "type": "String",
                "descriptionKey": "api:shuffleString.returns.description"
            },
            "example": {
                "python": "# inputs \"0+++0---0++-00-0\" and shuffles it randomly\nnewString = shuffleString(\"0+++0---0++-00-0\")",

                "javascript": "// inputs \"0+++0---0++-00-0\" and shuffles it randomly\nvar newString = shuffleString(\"0+++0---0++-00-0\");"
            },
            "autocomplete": "shuffleString(inputString)"
        }
    }
}
