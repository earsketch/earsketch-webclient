var ESApiDoc = {
    "analyze": {
        "description": "This function analyzes an audio file for the specified feature.",
        "parameters": {
            "audioFile": {
                "type": "Sound Constant",
                "description": "Audio file to analyze, typically this is a constant from the sound browser."
            },

            "featureForAnalysis": {
                "type": "Analysis Constant",
                "description": "Analysis feature constant. The analysis functions currently support two features: RMS_AMPLITUDE analyzes how loud the sound is and SPECTRAL_CENTROID analyzes how bright the sound is."
            }
        },
        "returns": {
            "type": "Float",
            "description": "Result of the calculation for the specified feature (always between 0 and 1 inclusive)."
        },
        "example": {
            "python": "# Find the spectral centroid of the audio file specified \ncentroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID)",

            "javascript": "// Find the spectral centroid of the audio file specified \nvar centroidValue = analyze(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID);"
        },
        "autocomplete": "analyze(clipName, featureConstant)",
    },

    "analyzeForTime": {
        "description": "This function analyzes an audio file for the specified feature, for the specified start and end times.",
        "parameters": {
            "audioFile": {
                "type": "Sound Constant",
                "description": "Audio file to analyze, typically this is a constant from the sound browser."
            },
            "featureForAnalysis": {
                "type": "Analysis Constant",
                "description": "Analysis feature constant. The analysis functions currently support two features: RMS_AMPLITUDE analyzes how loud the sound is and SPECTRAL_CENTROID analyzes how bright the sound is."
            },
            "startTime": {
                "type": "Float",
                "description": "Start location to begin analysis"
            },
            "endTime": {
                "type": "Float",
                "description": "End Location to end analysis"
            }
        },
        "returns": {
            "type": "Float",
            "description": "Result of the calculation for the specified feature (always between 0 and 1 inclusive)."
        },
        "example": {
            "python": "# Find the spectral centroid for the first measure of the audio file\ncentroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0)",

            "javascript": "// Find the spectral centroid for the first measure of the audio file\nvar centroidValue = analyzeForTime(HOUSE_BREAKBEAT_001, SPECTRAL_CENTROID, 1.0, 2.0);"
        },
        "autocomplete": "analyzeForTime(clipName, featureConstant, startTime, endTime)",
    },

    "analyzeTrack": {
        "description": "This function analyzes an entire track for the specified feature.",
        "parameters": {
            "trackNumber": {
                "type": "Integer",
                "description": "Track number to analyze."
            },
            "featureForAnalysis": {
                "type": "Analysis Constant",
                "description": "Analysis feature constant. The analysis functions currently support two features: RMS_AMPLITUDE analyzes how loud the sound is and SPECTRAL_CENTROID analyzes how bright the sound is."
            }
        },
        "returns": {
            "type": "Float",
            "description": "Result of the calculation for the specified feature (always between 0 and 1 inclusive)."
        },
        "example": {
            "python": "# Find the spectral centroid of all of track 1\ncentroidValue = analyzeTrack(1, SPECTRAL_CENTROID)",

            "javascript": "// Find the spectral centroid of all of track 1\nvar centroidValue = analyzeTrack(1, SPECTRAL_CENTROID);"
        },
        "autocomplete": "analyzeTrack(trackNum, featureConstant)",
    },

    "analyzeTrackForTime": {
        "description": "This function analyzes a specified track between a start and end time.",
        "parameters": {
            "trackNumber": {
                "type": "Integer",
                "description": "Track number to analyze."
            },
            "featureForAnalysis": {
                "type": "Analysis Constant",
                "description": "Analysis feature constant. The analysis functions currently support two features: RMS_AMPLITUDE analyzes how loud the sound is and SPECTRAL_CENTROID analyzes how bright the sound is."
            },
            "startTime": {
                "type": "Float",
                "description": "Start location to begin analysis"
            },
            "endTime": {
                "type": "Float",
                "description": "End Location to end analysis"
            }
        },
        "returns": {
            "type": "Float",
            "description": "Result of the calculation for the specified feature (always between 0 and 1 inclusive)."
        },
        "example": {
            "python": "# Find the spectral centroid of all of track 1 between measures 1 and 9\ncentroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0)",

            "javascript": "// Find the spectral centroid of all of track 1 between measures 1 and 9\nvar centroidValue = analyzeTrackForTime(1, SPECTRAL_CENTROID, 1.0, 9.0);"
        },
        "autocomplete": "analyzeTrackForTime(trackNum, featureConstant, startTime, endTime)",
    },

    "createAudioSlice": {
        "description": "Returns a sound constant that represents a slice of audio from an existing audio clip.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "The audio file from which to create a slice. This is a constant from the sound browser."
            },
            "startPosition" : {
                "type": "Float",
                "description": "The start position of the slice."
            },
            "endPosition" : {
                "type": "Float",
                "description": "The end position of the slice."
            },
        },
        "example": {
            "python": "slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5)\nfitMedia(slice, 1, 1, 3)",

            "javascript": "var slice = createAudioSlice(HOUSE_BREAKBEAT_001, 1.5, 2.5);\nfitMedia(slice, 1, 1, 3);"
        },
        "returns": {
            "type": "Sound Constant",
            "description": "A new Sound Constant representing the slice of audio. "
        },
        "autocomplete": "createAudioSlice(fileName, startPosition, endPosition)",
    },

    "dur": {
        "description": "Returns the duration of an audio file in measures.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "The audio file whose duration to return. Typically, this is a constant from the sound browser."
            }
        },
        "example": {
            "python": "dur(HOUSE_BREAKBEAT_001)",

            "javascript": "dur(HOUSE_BREAKBEAT_001);"
        },
        "returns": {
            "type": "Float",
            "description": "The duration in measures."
        },
        "autocomplete": "dur(fileName)",
    },

    "finish": {
        "description": "You must call this function at the end of your EarSketch script. This ensures your music is prepared for playback in the digital audio workstation (DAW).",
        "example": {
            "python": "# Rest of script above this line...\nfinish()",
            "javascript": "// Rest of script above this line...\nfinish();"
        },
        "autocomplete": "finish()"
    },

    "fitMedia": {
        "description": "Adds an audio file to a specified track at specified start and end times. The audio file will be repeated or cut short as needed to fill the specified amount of time.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "Audio file to place on track, typically this is a constant from the sound browser"
            },
            "trackNumber": {
                "type": "Integer",
                "description": "Track number to insert audio file onto"
            },
            "startLocation": {
                "type": "Float",
                "description": "Location where the soundfile will begin (e.g. 1 will start at the beginning of measure 1)."
            },
            "endLocation": {
                "type": "Float",
                "description": "Location where the soundfile will end (e.g. 5 will stop the soundfile at the beginning of measure 5)."
            }
        },
        "example": {
            "python": "# Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9)",

            "javascript": "// Inserts audio file on track two, measures 1 to 9 (stop at beginning of measure 9).\nfitMedia(HIPHOP_FUNKBEAT_001, 2, 1, 9);"
        },
        "autocomplete": "fitMedia(fileName, trackNum, startLocation, endLocation)"
    },

    "importImage": {
        "description": "This function retrieves an image from the web and converts it into a two-dimensional array/list of grayscale values or a three-dimensional list of RGB color values, scaled to the specified number of rows and columns.",
        "parameters": {
            "imageURL": {
                "type": "String",
                "description": "The URL at which the image is located"
            },
            "nrows": {
                "type": "Integer",
                "description": "The number of rows of pixel data to return (the image will be scaled to match this number of rows)"
            },
            "ncols": {
                "type": "Integer",
                "description": "The number of columns of pixel data to return (the image will be scaled to match this number of columns)"
            },
            "includeRGB": {
                "type": "Boolean, Optional",
                "default": "False",
                "description": "If false, returns a two-dimensional grayscale list. If true, returns a three-dimensional RGB color pixel list, with the third dimension being for R, G, and B, respectively."
            }
        },
        "example": {
            "python": "# Turn an image into a 10x10 grayscale list\npixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10)\nprint pixelData",

            "javascript": "// Turn an image into a 10x10 grayscale list\nvar pixelData = importImage(\"https://cdn.pixabay.com/photo/2012/04/05/01/17/ear-25595_640.png\", 10, 10);\nprintln(pixelData);"
        },
        "returns": {
            "type": "List",
            "description": "Multidimensional list of integers (0-255) representing pixels."
        },
        "autocomplete": "importImage(imageURL, nrows, ncols, False)"
    },

    "importFile": {
        "description": "This function retrieves a file from the web and returns its contents as a string.",
        "parameters": {
            "fileURL": {
                "type": "String",
                "description": "The URL at which the file is located"
            }
        },
        "example": {
            "python": "# Load a file via URL\nfileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\")\nprint fileData",

            "javascript": "// Load a file via URL\nvar fileData = importFile(\"http://www.gutenberg.org/files/16780/16780-0.txt\");\nprintln(fileData);"
        },
        "returns": {
            "type": "String",
            "description": "File contents as string."
        },
        "autocomplete": "importFile(fileUrl)"
    },

    "init": {
        "description": "This must be the first function call in every EarSketch script. It prepares the digital audio workstation to create your music.",
        "example": {
            "python": "init()\n# Rest of script below this line...",
            "javascript": "init();\n// Rest of script below this line..."
        },
        "autocomplete": "init()"
    },

    "insertMedia": {
        "description": "Inserts the entire media file onto a specified track at the specified starting time.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "Audio file to insert on track, typically this is a constant from the sound browser"
            },
            "trackNumber": {
                "type": "Integer",
                "description": "Track number to insert soundfile onto"
            },
            "trackLocation": {
                "type": "Float",
                "description": "The location at which to start playback of the soundfile. (The soundfile will play through one time, so the end time depends on the length of the soundfile.)"
            }
        },
        "example": {
            "python": "# Insert audio file on track 1, measure 2, beat 3\ninsertMedia(HOUSE_BREAKBEAT_003, 1, 2.5)",

            "javascript": "insertMedia(HOUSE_BREAKBEAT_003, 1, 2.5);"
        },
        "autocomplete": "insertMedia(fileName, trackNum, trackLocation)"
    },


    "insertMediaSection": {
        "description": "Inserts a part of an audio file on a specified track at a specified location.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "Audio file to insert on track, typically this is a constant from the sound browser"
            },
            "trackNumber": {
                "type": "Integer",
                "description": "Track number to insert soundfile onto"
            },
            "trackLocation": {
                "type": "Float",
                "description": "The location at which to start playback of the soundfile."
            },
            "mediaStartLocation": {
                "type": "Float",
                "description": "Start location within the soundfile to include (e.g. 1.0 is the beginning of the soundfile and 2.0 is measure 2 of the soundfile)."
            },
            "mediaEndLocation": {
                "type": "Float",
                "description": "End location within the soundfile to include (e.g. 2.0 is measure 2 of the soundfile)."
            }
        },
        "example": {
            "python": "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5)",

            "javascript": "insertMediaSection(HOUSE_BREAKBEAT_003, 1, 3.0, 1.0, 1.5);"
        },
        "autocomplete": "insertMediaSection(fileName, trackNum, trackLocation, mediaStartLocation, mediaEndLocation)"
    },

    "makeBeat": {
        "description": "Creates a rhythmic pattern through specifying a string of characters. This string of characters can be of ANY length. We recommend choosing string lengths in multiples of 16 (e.g. 16, 32, 64, etc.), because this creates pattern lengths that are aligned with measures (each measure is 16 characters long).",
        "parameters": {
            "fileName": {
                "type": "Sound Constant or List/array",
                "description": "A single soundfile or a list/array of soundfiles, typically this is a constant from the sound browser"
            },
            "track": {
                "type": "Integer",
                "description": "Track to place pattern onto"
            },
            "measure": {
                "type": "Float",
                "description": "Location to start pattern"
            },
            "string": {
                "type": "String",
                "description": "A string indicating the rhythmic pattern to play. \"0\" plays the soundfile for a sixteenth note. \"+\" ties (i.e. continues or sustains) the soundfile for an additional sixteenth note. \"-\" rests (i.e. creates silence) for a sixteenth note. If the first argument to makeBeat is a list/array of sounds, the \"0\" through \"9\" will play the sound at that list/array index for a sixteenth note."
            }
        },
        "example": {
            "python": "# Places a 16th note of audio every quarter note.\nbeatPattern = \"0---0---0---0---\"\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern)",

            "javascript": "// Places a 16th note of audio every quarter note.\nvar beatPattern = \"0---0---0---0---\";\nmakeBeat(HIPHOP_FUNKBEAT_001, 1, 2.0, beatPattern);"
        },
        "autocomplete": "makeBeat(fileName, trackNum, measure, string)"
    },

    "makeBeatSlice": {
        "description": "Creates a rhythmic pattern through specifying a string of characters indicating the start position within a soundfile. Unlike makeBeat, which always plays sounds from the beginning, makeBeatSlice lets you create rhythms that combine many different slices of sound from the same soundfile.",
        "parameters": {
            "fileName": {
                "type": "Sound Constant",
                "description": "A single soundfile, typically this is a constant from the sound browser"
            },
            "track": {
                "type": "Integer",
                "description": "Track to place pattern onto"
            },
            "measure": {
                "type": "Float",
                "description": "Location to start pattern"
            },
            "string": {
                "type": "String",
                "description": "A string indicating the rhythmic pattern to play. \"0\" through \"9\" plays the soundfile at the location specified at the corresponding index of the beatNumber list/array for a sixteenth note. \"+\" ties (i.e. continues or sustains) the soundfile for an additional sixteenth note. \"-\" rests (i.e. creates silence) for a sixteenth note."
            },
            "beatNumber": {
                "type": "List/array",
                "description": "A list/array of start locations within audio file (e.g. [1.0, 2.5] creates two time locations at measure 1 and measure 2.5 of the soundfile that can be referenced in the beat string by \"0\" and \"1\" respectively."
            }
        },
        "example": {
            "python": "# Play the first 4 sixteen note slices\nbeatString1 = '0123'\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875])",

            "javascript": "// Play the first 4 sixteen note slices\nvar beatString1 = '0123';\nmakeBeatSlice(HIPHOP_TRAPHOP_BEAT_002, 1, 1, beatString1, [1, 1.0625, 1.125, 1.1875]);"
        },
        "autocomplete": "makeBeatSlice(fileName, trackNum, measure, string, beatNum)"
    },

    "print": {
        "description": "Displays the input in the console.",
        "parameters": {
            "input": {
                "type": "String/Number/List",
                "description": "Value(s) to print"
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
        "description": "Displays the input in the console.",
        "parameters": {
            "input": {
                "type": "String/Number/List",
                "description": "Value(s) to print"
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
        "description": "Use this function to prompt a user for input.",
        "parameters": {
            "prompt": {
                "type": "String, Optional",
                "description": "A prompt to provide the user when asking for input."
            }
        },
        "example": {
            "python": "# Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\")",
            "javascript": "// Ask the user for a beat pattern for makeBeat\nbeatPattern = readInput(\"Give me your beat pattern:\");\n"
        },
        "returns": {
            "type": "String",
            "description": "The result of the user input."
        },
        "autocomplete": "readInput(prompt)"
    },

    "replaceListElement": {
        "description": "Replace all occurrences of a list/array element with a new element.",
        "parameters": {
            "inputList": {
                "type": "List/array",
                "description": "Original list/array"
            },
            "elementToReplace": {
                "type": "Any type",
                "description": "Element of the list to replace."
            },
            "withElement": {
                "type": "Any type",
                "description": "New element that will replace all occurrences of elementToReplace."
            }
        },
        "example": {
            "python": "# Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nnewList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003)",

            "javascript": "// Replace HOUSE_BREAKBEAT_002 wth HOUSE_DEEP_CRYSTALCHORD_003\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar newList = replaceListElement(audioFiles, HOUSE_BREAKBEAT_002, HOUSE_DEEP_CRYSTALCHORD_003);"
        },
        "autocomplete": "replaceListElement(inputList, elementToReplace, withElement)"
    },

    "replaceString": {
        "description": "This function replaces all instances of a character in the original string with a new character.",
        "parameters": {
            "string": {
                "type": "String",
                "description": "Original string"
            },
            "characterToReplace": {
                "type": "String",
                "description": "Character in the original string to replace"
            },
            "withCharacter": {
                "type": "String",
                "description": "New character that will replace all occurrences of characterToReplace"
            }
        },
        "returns": {
            "type": "String",
            "description": "New string with appropriate character(s) replaced"
        },
        "example": {
            "python": "# Change all '0's to '1's\nnewString = replaceString(\"0---0---0---0---\", \"0\", \"1\")",

            "javascript": "// Change all '0's to '1's\nvar newString = replaceString(\"0---0---0---0---\", \"0\", \"1\");"
        },
        "autocomplete": "replaceString(string, characterToReplace, withCharacter)"
    },

    "reverseList": {
        "description": "Reverse the order of the elements of a list/array.",
        "parameters": {
            "inputList": {
                "type": "List/array",
                "description": "List/array to reverse"
            }
        },
        "returns": {
            "type": "List/array",
            "description": "A new list/array with the elements in reverse order"
        },
        "example": {
            "python": "# Reverses a list of audio constants\naudioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nreversedList = reverseList(audioFiles)",

            "javascript": "// Reverses a list of audio constants\nvar audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar reversedList = reverseList(audioFiles);"
        },
        "autocomplete": "reverseList(inputList)"
    },

    "reverseString": {
        "description": "Reverse the order of characters in a string.",
        "parameters": {
            "inputString": {
                "type": "String",
                "description": "String to reverse"
            }
        },
        "returns": {
            "type": "String",
            "description": "A new string with the characters in reverse order"
        },
        "example": {
            "python": "# inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nnewString = reverseString(\"0+++0---0++-00-0\")",

            "javascript": "// inputs \"0+++0---0++-00-0\" outputs \"0-00-++0---0+++0\"\nvar newString = reverseString(\"0+++0---0++-00-0\");"
        },
        "autocomplete": "reverseString(reverseString)"
    },

    "rhythmEffects": {
        "description": "Creates a rhythmic effect envelope through specifying a string of characters.",
        "parameters": {
            "track": {
                "type": "Integer",
                "description": "Track to place pattern onto (or MIX_TRACK to apply it to all tracks)."
            },
            "effectType": {
                "type": "Effect Constant",
                "description": "Effect constant: BANDPASS, CHORUS, COMPRESSOR, DELAY, DISTORTION, EQ3BAND, FILTER, FLANGER, PAN, PHASER, PITCHSHIFT, REVERB, RINGMOD, TREMOLO, VOLUME, or WAH."
            },
            "effectParameter": {
                "type": "Effect Parameter Constant",
                "description": "Constant indicating which parameter of the effectType to create the envelope for. (See <a href='#' onclick='var layout = angular.element(\"[ng-controller=layoutController]\").scope(); layout.toggleLayoutToState(\"curriculum\",\"open\"); layout.loadChapter(\"ch_28.html\");'>Every Effect Explained in Detail</a> in the curriculum sidebar for a complete list of effect parameters.)"
            },
            "effectList": {
                "type": "List/array",
                "description": "List/array of effect parameter values (e.g. [0.0, 5.3, -12])."
            },
            "measure": {
                "type": "Float",
                "description": "Location to start pattern"
            },
            "beatString": {
                "type": "String",
                "description": "A string indicating the rhythmic envelope pattern to create. \"0\" through \"9\" uses the effect parameter value at the location specified at the corresponding index of the effectList list/array for a sixteenth note. \"+\" ties (i.e. continues or sustains) the parameter value for an additional sixteenth note. \"-\" ramps (i.e. creates a gradual change) to the next parameter value for a sixteenth note."
            }
        },
        "example": {
            "python": "# Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\")",

            "javascript": "// Sets filter frequency to either 300, 3000, or 1000 according to the beatString below\nrhythmEffects(3, FILTER, FILTER_FREQ, [300, 3000, 1000], 1.0, \"0+++1+++2+++1+++\");"
        },
        "autocomplete": "rhythmEffects(track, effectType, effectParameter, effectList, measure, beatString)"
    },

    "selectRandomFile": {
        "description": "Selects a random soundfile from a specified folder.",
        "parameters": {
            "folder": {
                "type": "Folder Constant",
                "description": "Folder to get random soundfile from. Typically, this is a constant from the sound browser (a folder name, not a file name)."
            }
        },
        "example": {
            "python": "# Get random audio file from the ALT_POP_GUITAR folder and assign to randomAudio\nrandomAudio = selectRandomFile(ALT_POP_GUITAR)",

            "javascript": "// Get random audio file from the ALT_POP_GUITAR folder and assign to randomAudio\nvar randomAudio = selectRandomFile(ALT_POP_GUITAR);"
        },
        "autocomplete": "selectRandomFile(folder)"
    },

    "setEffect": [
        {
            "description": "This function applies an effect to a specified track number and sets a parameter of that effect to a particular value for the entire track. For detailed information on all of the effects available to use with setEffect(), please see <a href='#' onclick='var layout = angular.element(\"[ng-controller=layoutController]\").scope(); layout.toggleLayoutToState(\"curriculum\",\"open\"); layout.loadChapter(\"ch_28.html\");'>Every Effect Explained in Detail</a> in the curriculum.",
            "parameters": {
                "track": {
                    "type": "Integer",
                    "description": "Track to place effect onto (or MIX_TRACK to apply it to all tracks)"
                },
                "effectType": {
                    "type": "Effect Constant",
                    "description": "Effect constant: BANDPASS, CHORUS, COMPRESSOR, DELAY, DISTORTION, EQ3BAND, FILTER, FLANGER, PAN, PHASER, PITCHSHIFT, REVERB, RINGMOD, TREMOLO, VOLUME, or WAH"
                },
                "effectParameter": {
                    "type": "Effect Parameter Constant",
                    "description": "Constant indicating which parameter of the effectType to create the envelope for. (See Every Effect Explained in Detail in the curriculum sidebar for a complete list of effect parameters.)"
                },
                "effectValue": {
                    "type": "Float",
                    "description": "Value of effect parameter"
                }
            },
            "example": {
                "python": "# Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250)",

                "javascript": "// Apply a delay effect on track 1\nsetEffect(1, DELAY, DELAY_TIME, 250);"
            },
            "autocomplete": "setEffect(track, effectType, effectParameter, effectValue)"
        },
        {
            "description": "This function applies an effect to a specified track number. Unlike the other version of setEffect(), there are additional arguments for setting an envelope that changes the value of an effect parameter over time. For detailed information on all of the effects available to use with setEffect(), please see the curriculum: <a href='#' onclick='var layout = angular.element(\"[ng-controller=layoutController]\").scope(); layout.toggleLayoutToState(\"curriculum\",\"open\"); layout.loadChapter(\"ch_28.html\");'>Every Effect Explained in Detail</a>",
            "parameters": {
                "track": {
                    "type": "Integer",
                    "description": "Track to place effect onto (or MIX_TRACK to apply it to all tracks)"
                },
                "effectType": {
                    "type": "Effect Constant",
                    "description": "Effect constant: BANDPASS, CHORUS, COMPRESSOR, DELAY, DISTORTION, EQ3BAND, FILTER, FLANGER, PAN, PHASER, PITCHSHIFT, REVERB, RINGMOD, TREMOLO, VOLUME, or WAH"
                },
                "effectParameter": {
                    "type": "Effect Parameter Constant",
                    "description": "Constant indicating which parameter of the effectType to create the envelope for. (See Every Effect Explained in Detail in the curriculum sidebar for a complete list of effect parameters.)"
                },
                "effectStartValue": {
                    "type": "Float",
                    "description": "Value of effect parameter at beginning of effect envelope"
                },
                "effectStartLocation": {
                    "type": "Float",
                    "description": "Location of the effectStartValue"
                },
                "effectEndValue": {
                    "type": "Float",
                    "description": "Value of effect parameter at end of effect envelope"
                },
                "effectEndLocation": {
                    "type": "Float",
                    "description": "Location of the effectEndValue"
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
        "description": "Sets the tempo for the project.",
        "parameters": {
            "tempo": {
                "type": "Integer",
                "description": "The project tempo in beats per minute (BPM). Minimum tempo is 45. Maximum tempo is 220."
            }
        },
        "example": {
            "python": "# Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110)",

            "javascript": "// Sets the Project's Tempo to 110 Beats Per Minute\nsetTempo(110);"
        },
        "autocomplete": "setTempo(tempo)"
    },

    "shuffleList": {
        "description": "Randomly rearrange the elements in a list/array.",
        "parameters": {
            "inputList": {
                "type": "List/array",
                "description": "List/array to shuffle"
            }
        },
        "returns": {
            "type": "List/array",
            "description": "A new list/array with the order of the list elements randomized."
        },
        "example": {
            "python": "audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004]\nshuffledList = shuffleList(audioFiles)",

            "javascript": "var audioFiles = [HOUSE_BREAKBEAT_001, HOUSE_BREAKBEAT_002, HOUSE_BREAKBEAT_003, HOUSE_BREAKBEAT_004];\nvar shuffledList = shuffleList(audioFiles);"
        },
        "autocomplete": "shuffleList(inputList)"
    },

    "shuffleString": {
        "description": "Randomly rearrange the characters in a string.",
        "parameters": {
            "inputString": {
                "type": "String",
                "description": "String to shuffle"
            }
        },
        "returns": {
            "type": "String",
            "description": "A new string with the order of the characters randomized."
        },
        "example": {
            "python": "# inputs \"0+++0---0++-00-0\" and shuffles it randomly\nnewString = shuffleString(\"0+++0---0++-00-0\")",

            "javascript": "// inputs \"0+++0---0++-00-0\" and shuffles it randomly\nvar newString = shuffleString(\"0+++0---0++-00-0\");"
        },
        "autocomplete": "shuffleString(inputString)"
    }
};
