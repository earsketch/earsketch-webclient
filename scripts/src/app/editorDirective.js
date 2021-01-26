app.directive('editor', ['$rootScope', 'collaboration', 'esconsole', '$timeout', function ($rootScope, collaboration, esconsole, $timeout) {
    return {
        transclude: false,
        restrict: 'EA',
        templateUrl: 'templates/code-editor.html',
        link: function (scope, element) {
            // JSON object for blocks configuration
            var blockDropdownNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
            var blockDropdownEffects = ['BANDPASS', 'CHORUS', 'COMPRESSOR',
                'DELAY', 'DISTORTION', 'EQ3BAND', 'FILTER',
                'FLANGER', 'PAN', 'PHASER', 'PITCHSHIFT',
                'REVERB', 'RINGMOD', 'TREMOLO', 'VOLUME', 'WAH'];
            var blockDropdownEffectParameters = ['MIX', 'BYPASS', 'BANDPASS_FREQ', 'BANDPASS_WIDTH',
                'CHORUS_LENGTH', 'CHORUS_NUMVOICES', 'CHORUS_RATE', 'CHORUS_MOD',
                'COMPRESSOR_THRESHOLD', 'COMPRESSOR_RATIO', 'DELAY_TIME', 'DELAY_FEEDBACK',
                'DISTO_GAIN', 'EQ3BAND_LOWGAIN', 'EQ3BAND_LOWFREQ', 'EQ3BAND_MIDGAIN',
                'EQ3BAND_MIDFREQ', 'EQ3BAND_HIGHGAIN', 'EQ3BAND_HIGHFREQ', 'FILTER_FREQ',
                'FILTER_RESONANCE', 'FLANGER_LENGTH', 'FLANGER_FEEDBACK', 'FLANGER_RATE',
                'LEFT_RIGHT', 'PHASER_RATE', 'PHASER_RANGEMIN', 'PHASER_RANGEMAX',
                'PHASER_FEEDBACK', 'PITCHSHIFT_SHIFT', 'REVERB_TIME', 'REVERB_DAMPFREQ',
                'RINGMOD_MODFREQ', 'RINGMOD_FEEDBACK', 'TREMOLO_FREQ', 'TREMOLO_AMOUNT',
                'GAIN', 'WAH_POSITION'];

            var expressionContext = {
                "prefix": "a = "
            };

            var blockModeOptions = {
                "functions": {
                    "init": {"color": "purple"},
                    "setTempo": {"color": "purple"},
                    "fitMedia": {"color": "purple", "dropdown": [null, blockDropdownNumbers]},
                    "makeBeat": {"color": "purple", "dropdown": [null, blockDropdownNumbers]},
                    "setEffect": {"color": "purple", "dropdown": [blockDropdownNumbers, blockDropdownEffects, blockDropdownEffectParameters]},
                    "finish": {"color": "purple"},
                    "println": {"color": "purple"},
                    "selectRandomFile": {"color": "purple"},
                    "insertMedia": {"color": "purple", "dropdown": [null, blockDropdownNumbers]},
                    "analyze": {"color": "green"},
                    "analyzeForTime": {"color": "green"},
                    "analyzeTrack": {"color": "green", "dropdown": [blockDropdownNumbers]},
                    "analyzeTrackForTime": {"color": "green", "dropdown": [blockDropdownNumbers]},
                    "dur": {"color": "green"},
                    "importImage": {"color": "green"},
                    "importFile": {"color": "green"},
                    "insertMediaSection": {"color": "green", "dropdown": [null, blockDropdownNumbers]},
                    "makeBeatSlice": {"color": "green", "dropdown": [null, blockDropdownNumbers]},
                    "readInput": {"color": "green"},
                    "replaceListElement": {"color": "green"},
                    "replaceString": {"color": "green"},
                    "reverseList": {"color": "green"},
                    "reverseString": {"color": "green"},
                    "rhythmEffects": {"color": "green", "dropdown": [blockDropdownNumbers, blockDropdownEffects, blockDropdownEffectParameters]},
                    "shuffleList": {"color": "green"},
                    "shuffleString" : {"color": "green"}
                },
                "categories": {
                    "functions": {"color": 'purple'}
                }
            };

            var blockPalettePython = {
                "mode": "python",
                "modeOptions": blockModeOptions,
                "palette": [
                    {
                        "name": "EarSketch",
                        "color": "purple",
                        "blocks": [
                            { "block": "from earsketch import *" },
                            { "block": "init()" },
                            { "block": "setTempo(tempo)" },
                            { "block": "fitMedia(fileName, trackNumber, startLocation, endLocation)" },
                            { "block": "makeBeat(fileName, trackNumber, measure, string)" },
                            { "block": "setEffect(trackNumber, effectType, effectParameter, effectValue)" },
                            { "block": "setEffect(trackNumber, effectType, effectParameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation)" },
                            { "block": "finish()" },
                            { "block": "print 'Hello World!'" },
                            { "block": "selectRandomFile(folder)" },
                            { "block": "insertMedia(fileName, trackNumber, trackLocation)" }
                        ]
                    },
                    {
                        "name": "Advanced",
                        "color": "green",
                        "blocks": [
                            { "block": "analyze(audioFile, featureForAnalysis)" },
                            { "block": "analyzeForTime(audioFile, featureForAnalysis, startTime, endTime)" },
                            { "block": "analyzeTrack(trackNumber, featureForAnalysis)" },
                            { "block": "analyzeTrackForTime(trackNumber, featureForAnalysis, startTime, endTime)" },
                            { "block": "dur(fileName)" },
                            { "block": "importImage(imageURL, nrows, ncols, includeRGB=False)" },
                            { "block": "importFile(fileURL)" },
                            { "block": "insertMediaSection (fileName, trackNumber, trackLocation, mediaStartLocation, mediaEndLocation)" },
                            { "block": "makeBeatSlice(fileName, trackNumber, measure, string, beatNumber)" },
                            { "block": "readInput(prompt)" },
                            { "block": "replaceListElement(inputList, elementToReplace, withElement)" },
                            { "block": "replaceString(string, characterToReplace, withCharacter)" },
                            { "block": "reverseList(inputList)" },
                            { "block": "reverseString(inputString)" },
                            { "block": "rhythmEffects(trackNumber, effectType, effectParameter, effectList, measure, beatString)" },
                            { "block": "shuffleList(inputList)" },
                            { "block": "shuffleString(inputString)" }
                        ]
                    },
                    {
                        "name": "Variables",
                        "color": "blue",
                        "blocks": [
                            { "block": "a = 1", "wrapperContext": expressionContext },
                            { "block": "a += 1", "wrapperContext": expressionContext },
                            { "block": "a -= 1", "wrapperContext": expressionContext },
                            { "block": "a *= 1", "wrapperContext": expressionContext },
                            { "block": "a /= 1", "wrapperContext": expressionContext },
                            { "block": "a %= 1", "wrapperContext": expressionContext}
                        ]
                    },
                    {
                        "name": "Logic",
                        "color": "teal",
                        "blocks": [
                            { "block": "a == b", "wrapperContext": expressionContext },
                            { "block": "a != b", "wrapperContext": expressionContext },
                            { "block": "a > b", "wrapperContext": expressionContext },
                            { "block": "a >= b", "wrapperContext": expressionContext },
                            { "block": "a < b", "wrapperContext": expressionContext },
                            { "block": "a <= b", "wrapperContext": expressionContext },
                            { "block": "a or b", "wrapperContext": expressionContext },
                            { "block": "a and b", "wrapperContext": expressionContext },
                            { "block": "not a", "wrapperContext": expressionContext }
                        ]
                    },
                    {
                        "name": "Operators",
                        "color": "green",
                        "blocks": [
                            { "block": "a + b", "wrapperContext": expressionContext },
                            { "block": "a - b", "wrapperContext": expressionContext },
                            { "block": "a * b", "wrapperContext": expressionContext },
                            { "block": "a / b", "wrapperContext": expressionContext },
                            { "block": "a % b", "wrapperContext": expressionContext }
                        ]
                    },
                    {
                        "name": "Control Flow",
                        "color": "orange",
                        "blocks": [
                            { "block": "for i in range(0, 10):\n  print 'hello'" },
                            { "block": "if a == b:\n  print 'hello'" },
                            { "block": "if a == b:\n  print 'hello'\nelse:\n  print 'bye'" },
                            { "block": "while a < b:\n  print 'hello'" },
                            { "block": "def myMethod():\n  print 'hello'" },
                            { "block": "def myMethod(arg):\n  print arg" },
                            { "block": "myMethod()", "wrapperContext": expressionContext },
                            { "block": "myMethod(arg)", "wrapperContext": expressionContext },
                            { "block": "return 'hello'" }
                        ]
                    }
                ]
            };

            var blockPaletteJavascript = {
                "mode": "javascript",
                "modeOptions": blockModeOptions,
                "palette": [
                    {
                        "name": "EarSketch",
                        "color": "purple",
                        "blocks": [
                            { "block": "init();" },
                            { "block": "setTempo(tempo);" },
                            { "block": "fitMedia(fileName, trackNumber, startLocation, endLocation);" },
                            { "block": "makeBeat(fileName, trackNumber, measure, string);" },
                            { "block": "setEffect(trackNumber, effectType, effectParameter, effectValue);" },
                            { "block": "setEffect(trackNumber, effectType, effectParameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation);" },
                            { "block": "finish();" },
                            { "block": "println('Hello World!');" },
                            { "block": "selectRandomFile(folder);" },
                            { "block": "insertMedia(fileName, trackNumber, trackLocation);" }
                        ]
                    },
                    {
                        "name": "Advanced",
                        "color": "green",
                        "blocks": [
                            { "block": "analyze(audioFile, featureForAnalysis);" },
                            { "block": "analyzeForTime(audioFile, featureForAnalysis, startTime, endTime);" },
                            { "block": "analyzeTrack(trackNumber, featureForAnalysis);" },
                            { "block": "analyzeTrackForTime(trackNumber, featureForAnalysis, startTime, endTime);" },
                            { "block": "dur(fileName);" },
                            { "block": "importImage(imageURL, nrows, ncols, includeRGB=False);" },
                            { "block": "importFile(fileURL);" },
                            { "block": "insertMediaSection (fileName, trackNumber, trackLocation, mediaStartLocation, mediaEndLocation);" },
                            { "block": "makeBeatSlice(fileName, trackNumber, measure, string, beatNumber);" },
                            { "block": "readInput(prompt);" },
                            { "block": "replaceListElement(inputList, elementToReplace, withElement);" },
                            { "block": "replaceString(string, characterToReplace, withCharacter);" },
                            { "block": "reverseList(inputList);" },
                            { "block": "reverseString(inputString);" },
                            { "block": "rhythmEffects(trackNumber, effectType, effectParameter, effectList, measure, beatString);" },
                            { "block": "shuffleList(inputList);" },
                            { "block": "shuffleString(inputString);" }
                        ]
                    },
                    {
                        "name": "Variables",
                        "color": "blue",
                        "blocks": [
                            { "block": "var a = 10;" },
                            { "block": "a = 10;" },
                            { "block": "a += 1;" },
                            { "block": "a -= 10;" },
                            { "block": "a *= 1;" },
                            { "block": "a /= 1;" }
                        ]
                    },
                    {
                        "name": "Logic",
                        "color": "teal",
                        "blocks": [
                            { "block": "a == b" },
                            { "block": "a != b" },
                            { "block": "a > b" },
                            { "block": "a < b" },
                            { "block": "a || b" },
                            { "block": "a && b" },
                            { "block": "!a" }
                        ]
                    },
                    {
                        "name": "Operators",
                        "color": "green",
                        "blocks": [
                            { "block": "a + b" },
                            { "block": "a - b" },
                            { "block": "a * b" },
                            { "block": "a / b" },
                            { "block": "a % b" },
                            { "block": "Math.pow(a, b)" },
                            { "block": "Math.sin(a)" },
                            { "block": "Math.tan(a)" },
                            { "block": "Math.cos(a)" },
                            { "block": "Math.random()" }
                        ]
                    },
                    {
                        "name": "Control Flow",
                        "color": "orange",
                        "blocks": [
                            { "block": "for (var i = 0; i < 10; i++) {\n  __\n}" },
                            { "block": "if (a == b) {\n  __\n}" },
                            { "block": "if (a == b) {\n  __\n} else {\n  __\n}" },
                            { "block": "while (a < b) {\n  __\n}" },
                            { "block": "function myFunction () {\n  __\n}" },
                            { "block": "function myFunction (param) {\n  __\n}" },
                            { "block": "myFunction ();" },
                            { "block": "myFunction (param);" },
                            { "block": "return __;" }
                        ]
                    }
                ]
            };

            scope.editor.ace = null;
            scope.editor.droplet = null;

            scope.editor.visible = true;
            collaboration.editorVisible = true;

            scope.$on('visible', function(event, val){
                scope.editor.visible = !val;
                collaboration.editorVisible = !val;
            });

            if (scope.currentLanguage === 'python') {
                scope.editor.droplet = new droplet.Editor(element[0].querySelector('#editor'), blockPalettePython);
            } else {
                scope.editor.droplet = new droplet.Editor(element[0].querySelector('#editor'), blockPaletteJavascript);
            }

            scope.editor.ace = scope.editor.droplet.aceEditor;

            scope.editor.getValue = function () {
                return scope.editor.ace.getValue();
            };

            // TODO: not working with ace editor
            scope.editor.setValue = function () {
                try {
                    if (scope.editor.droplet.currentlyUsingBlocks) {
                        scope.editor.droplet.setValue.apply(this, arguments);
                    } else {
                        scope.editor.ace.setValue.apply(this, arguments);
                    }
                } catch (e) {
                    console.log(e);
                }
            };

            scope.editor.setReadOnly = function (value) {
                // esconsole('setting the editor to be read-only: ' + value, 'editor');
                scope.editor.ace.setReadOnly(value);
                scope.editor.droplet.setReadOnly(value);
            };

            scope.editor.setFontSize = function (value) {
                scope.editor.ace.setFontSize(value);
                scope.editor.droplet.setFontSize(value);
            };

            scope.editor.undo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.undo();
                } else {
                    scope.editor.ace.undo();
                }
            };

            scope.editor.redo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.redo();
                } else {
                    scope.editor.ace.redo();
                }
            };

            scope.editor.checkUndo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    return scope.editor.droplet.undoStack.length > 0;
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    return undoManager.hasUndo();
                }
            };

            scope.editor.checkRedo = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    return scope.editor.droplet.redoStack.length > 0;
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    return undoManager.hasRedo();
                }
            };

            scope.editor.clearHistory = function () {
                if (scope.editor.droplet.currentlyUsingBlocks) {
                    scope.editor.droplet.clearUndoStack();
                } else {
                    var undoManager = scope.editor.ace.getSession().getUndoManager();
                    undoManager.reset();
                    scope.editor.ace.getSession().setUndoManager(undoManager);
                }
            };

            scope.editor.setLanguage = function (currentLanguage) {
                if (currentLanguage === 'python') {
                    scope.editor.droplet.setMode('python', blockPalettePython.modeOptions);
                    scope.editor.droplet.setPalette(blockPalettePython.palette);
                } else if (currentLanguage === 'javascript') {
                    scope.editor.droplet.setMode('javascript', blockPaletteJavascript.modeOptions);
                    scope.editor.droplet.setPalette(blockPaletteJavascript.palette);
                }
                scope.editor.ace.getSession().setMode('ace/mode/' + currentLanguage);
            };

            scope.initEditor();

            //=======================================
            // collaboration-related features
            scope.collaboration = collaboration;
            collaboration.setEditor(scope.editor);

            // scope.showCollaborators = function () {};

            // scope.requestAccess = function () {
            //     collaboration.requestAccess();
            // };

            // Millisecond timer for recommendation refresh update
            var recommendationTimer = null;

            // TODO: add listener if collaboration userStatus is owner, remove otherwise
            // TODO: also make sure switching / closing tab is handled
            scope.editor.ace.on('change', function (event) {
                
                // console.log("event in editor", event,event['action'],event['lines']);
                var t = Date.now();
                $rootScope.$broadcast('keyStroke',event['action'],event['lines'],t);
                
                if (collaboration.active && !collaboration.lockEditor) {
                    // convert from positionObjects & lines to index & text
                    var session = scope.editor.ace.getSession();
                    var document = session.getDocument();
                    var start = document.positionToIndex(event.start, 0);
                    var text = event.lines.length > 1 ? event.lines.join('\n') : event.lines[0];

                    // buggy!
                    // var end = document.positionToIndex(event.end, 0);
                    var end = start + text.length;

                    collaboration.editScript({
                        action: event.action,
                        start: start,
                        end: end,
                        text: text,
                        len: end - start
                    });
                }

                if(recommendationTimer != null){
                    $timeout.cancel(recommendationTimer);
                }

                recommendationTimer = $timeout(function() {
                    $rootScope.$broadcast('reloadRecommendations');
                }, 1000);

            });

            scope.editor.ace.getSession().selection.on('changeSelection', function () {
                if (collaboration.active && !collaboration.isSynching) {
                    setTimeout(function () {
                        collaboration.storeSelection(scope.editor.ace.getSession().selection.getRange());
                    });
                }
            });

            scope.editor.ace.getSession().selection.on('changeCursor', function () {
                if (collaboration.active && !collaboration.isSynching) {
                    setTimeout(function () {
                        var session = scope.editor.ace.getSession();
                        collaboration.storeCursor(session.selection.getCursor());
                    });
                }
            });

            scope.editor.ace.on('focus', function () {
                if (collaboration.active) {
                    // check if session is active
                    // if so, request sync
                    // if not, rejoin

                    collaboration.checkSessionStatus();
                }
            });
        }
    }
}]);
