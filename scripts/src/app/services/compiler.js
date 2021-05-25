/**
 * An angular factory service for providing a compiler for scripts.
 *
 * @module compiler
 * @author Creston Bunch
 */
app.factory('compiler',
['pitchshifter','audioLibrary','audioContext','userConsole','$rootScope','ESUtils','$q',
function compilerFactory(pitchshift,audioLibrary,audioContext,userConsole,$rootScope,ESUtils,$q) {
    let testRun = false;

    /**
     * After compiling code, go through each clip, load the audio file and
     * replace looped ones with multiple clips. Why? Because we don't know
     * the length of each audio clip until after compiling (unless we
     * loaded the clips before compiling and did this during compilation, but
     * that's harder.) Follow up with pitchshifting and setting the result
     * length.
     *
     * @param {object} result The compilation result object.
     * @returns {Promise} A promise that will resolve to the new result object.
     *
     * @private
     */
    function postCompile(result) {
        esconsole(
            'Compiling finishing. Loading audio buffers...',
            ['DEBUG','COMPILER']
        );

        // check if finish() was called
        if (result['finish'] === undefined || result['finish'] === false) {
          throw new Error('finish() is missing');
        }

        // STEP 1: Load audio buffers and slice them to generate temporary audio constants
        esconsole('Loading buffers.', ['DEBUG', 'COMPILER']);
        return loadBuffersForSampleSlicing(result)

        // STEP 2: Load audio buffers needed for the result
        .then(function(result){ 
            return loadBuffers(result)
        }).catch(function(err) {
            throw err;

        }).then(function(buffers) {
            esconsole('Filling in looped sounds.', ['DEBUG', 'COMPILER']);
            return buffers;
        }).catch(function(err) {
            throw err;

        // STEP 3: Insert buffers into clips and fix clip loops/effect lengths.
        }).then(function(buffers) {
            // before fixing the clips, retrieve the clip tempo info from the metadata cache for a special treatment for the MAKEBEAT clips
            result = getClipTempo(result);
            return fixClips(result, buffers);
        }).catch(function(err) {
            throw err;

        // STEP 4: Warn user about overlapping tracks or 
        // effects placed on track with no audio
        }).then(function(result) {
            checkOverlaps(result);
            checkEffects(result);

            return result;
        }).catch(function(err) {
            throw err;

        // STEP 5: Pitchshift tracks that need it.
        }).then(function(result) {
            esconsole('Handling pitchshifted tracks.', ['DEBUG', 'COMPILER']);
            return handlePitchshift(result);
        }).catch(function(err) {
            throw err;

        // STEP 6: Insert metronome track in the end
        }).then(function(result) {
            esconsole('Adding metronome track.', ['DEBUG', 'COMPILER']);
            return addMetronome(result);
        }).catch(function(err) {
            throw err;

        // STEP 7: Return the post-compiled result
        }).then(function(result) {
            // print out string for unit tests
            esconsole(ESUtils.formatResultForTests(result), ['NOLOG', 'COMPILER']);
            return result;
        }).catch(function(err) {
            throw err;
        });
    }

    /**
     * Do not call this manually. This is for synchronizing the userConsole print out with the asyncPitchShift processing.
     * @param promises
     * @param result
     * @param i
     * @returns {array}
     */
    function recursivePSProcess(promises, result, i) {
        if (i < result.tracks.length) {
            var track = result.tracks[i];

            if (track.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'] !== undefined) {
                var p = pitchshift.asyncPitchshiftClips(track, result.tempo);

                promises.push(p);
                p.then(function (track) {
                    userConsole.status('PITCHSHIFT applied on clips on track ' + track['clips'][0]['track']);
                    $rootScope.$apply();
                    recursivePSProcess(promises, result, ++i);
                });
            } else {
                recursivePSProcess(promises, result, ++i);
            }
        }
        return promises;
    }

    /**
     * Pitchshift tracks in a result object because we can't yet make pitchshift
     * an effect node.
     *
     * @param {object} result The compiled result object.
     */
    function handlePitchshift(result) {
        esconsole('Begin pitchshifting.', ['DEBUG', 'COMPILER']);

        if (result.tracks.some(function (t) {
            return t.effects['PITCHSHIFT-PITCHSHIFT_SHIFT'] !== undefined;
        })) {
            userConsole.status('Applying PITCHSHIFT on audio clips');
            $rootScope.$apply();
        }

        // This is for synchronizing with userConsole print out
        var promises = recursivePSProcess([], result, 1);

        return Promise.all(promises).then(function() {
            esconsole('Pitchshifting promise resolved.',
                      ['DEBUG', 'COMPILER']);
            return result;
        }).catch(function(e) {
            esconsole(e, ['ERROR', 'COMPILER']);
            throw e;
        });
    }

    /**
     * Compile a python script.
     *
     * @param {string} code The code to run.
     * @param {int} quality Numeric value for the audio quality to load.
     * @returns {Promise} A promise that resolves to the compiled result object.
     */
    function compilePython(code, quality) {
        Sk.dateSet = false;
        Sk.filesLoaded = false;
        //	Added to reset imports
        Sk.sysmodules = new Sk.builtin.dict([]);
        Sk.realsyspath = undefined;

        Sk.resetCompiler();

        return importPython(code, quality);
    }

    /**
     * Attempts evaluating and replacing undefined names with a placeholder until the actual evaluation later.
     * @param code
     * @param undefinedNames
     * @returns {Array} A list of undefined names to be verified with the verifyClip WS.
     */
    function recursiveNameCheckPY(code, undefinedNames) {
        try {
            testRun = true;
            Sk.importMainWithBody('<stdin>',false,code,true);
        } catch (e) {
            if (e.tp$name && e.tp$name === 'NameError') {
                var undefinedName = e.toString().split("'")[1];

                // Create a dummy constant and repeat.
                undefinedNamePy = Sk.ffi.remapToPy(undefinedName);
                Sk.builtins[undefinedName] = undefinedNamePy;

                if (undefinedNames.indexOf(undefinedName) === -1)
                {
                    undefinedNames.push(undefinedName);
                    return recursiveNameCheckPY(code, undefinedNames);
                }

            }
        } finally {
            testRun = false;
        }
        return undefinedNames;
    }

    /**
     * Collects user-defined names (e.g., audio clips) for later verificaiton. The lines containing readInput, etc. API are skipped, as they should not be evaluated until the actual compilation.
     * @param code
     * @returns {Promise}
     */
    function handleUndefinedNamesPY(code, bypass) {
        if (bypass) {
            return Promise.resolve();
        }
        esconsole('Iterating through undefined variable names.');

        var undefinedNames = recursiveNameCheckPY(code, []);
        undefinedNames.forEach(function (name) {
            delete Sk.builtins[name];
        });

        Sk.resetCompiler();

        return $q.all(undefinedNames.map(function (name) { return audioLibrary.verifyClip(name); })).then(function (result) {
            result.forEach(function (dataIfExist) {
                if (dataIfExist) {
                    Sk.builtins[dataIfExist.file_key] = Sk.ffi.remapToPy(dataIfExist.file_key);
                }
            });
        });
    }

    /**
     * Imports the given python code into Skulpt as the __main__ module. Doesn't
     * reset the compiler though so it can be run inside another compiled
     * Python script (i.e., in the autograder.) For most use cases you should use
     * compilePython() instead and ignore this function.
     *
     * @param {string} code The code to run.
     * @param {int} quality Numeric value for the audio quality to load.
     * @returns {Promise} A promise that resolves to the compiled result object.
     */
    function importPython(code, quality) {
        esconsole('Loading EarSketch library from: '+ SITE_BASE_URI
            + '/scripts/src/api/earsketch.py.js');

        Sk.externalLibraries = {
            // import EarSketch library into skulpt
            earsketch : {
                path: SITE_BASE_URI + '/scripts/src/api/earsketch.py.js?v=' + BUILD_NUM + '&ext=.py.js'
            }
        };

        // special cases with these key functions when import ES module is missing
        // this hack is only for the user guidance
        Sk.builtins['init'] = new Sk.builtin.func(function () {
            throw new Error('init()' + ESMessages.interpreter.noimport);
        });
        Sk.builtins['finish'] = new Sk.builtin.func(function () {
            throw new Error('finish()' + ESMessages.interpreter.noimport);
        });
        Sk.builtins['__AUDIO_QUALITY'] = false;

        // A temporary switch for disabling the lazy evaluation of undefined names. analyze~ methods may be possibly excluded from the escape list, but they might have unexpected behaviors when combined with conditionals.
        var bypassOptimization = !FLAGS.LAZY_SCRIPT_COMPILER;
        var escapeWords = ['readInput','raw_input','input','import random','analyzeTrackForTime','analyzeTrack','analyzeForTime','analyze','dur'].join('|');
        if (code.match(new RegExp(escapeWords,'g'))) {
            bypassOptimization = true;
        }
        esconsole('Using lazy name loading: ' + !bypassOptimization, ['compiler','debug']);
        var getTagsFn = bypassOptimization ? audioLibrary.getAllTags : audioLibrary.getDefaultTags;

        return handleUndefinedNamesPY(code, bypassOptimization).then(function () {
            var lines = code.match(/\n/g) ? code.match(/\n/g).length + 1 : 1;
            esconsole(
                'Compiling ' + lines + ' lines of Python', ['DEBUG','COMPILER']
            );

            // printing for unit tests
            esconsole(ESUtils.formatScriptForTests(code), ['NOLOG', 'COMPILER']);

            // STEP 1: get a list of constants from the server and inject them into
            // the skulpt list of builtins
            return getTagsFn().then(function(tags) {
                esconsole('Finished fetching audio tags', ['DEBUG','COMPILER']);
                // after loading audio tags, compile the script

                // inject audio constants into the skulpt builtin globals
                // TODO: come up with a proper solution for doing this in Skulpt
                // https://groups.google.com/forum/#!topic/skulpt/6C_TnxnP8P0
                for (var i in tags) {
                    if (tags.hasOwnProperty(i)) {
                        var tag = tags[i];
                        if (!(tag in Sk.builtins)) {
                            Sk.builtins[tag] = Sk.ffi.remapToPy(tag);
                        }
                    }
                }

                // inject audio quality as a builtin global, again not the ideal
                // solution but it works
                Sk.builtins['__AUDIO_QUALITY'] = quality;
            }).catch(function(err) {
                esconsole(err, ['ERROR','COMPILER']);
                throw new Error('Failed to load audio tags from the server.');
            // STEP 2: compile python code using Skulpt
            })
                .then(function() {
                esconsole('Compiling script using Skulpt.', ['DEBUG','COMPILER']);
                return Sk.misceval.asyncToPromise(function() {
                    try {
                        return Sk.importModuleInternal_("<stdin>", false, "__main__", code, true);
                    } catch(err) {
                        esconsole(err, ['ERROR','COMPILER']);
                        throw err;
                    }
                });
            }).catch(function(err) {
                throw err; // catch Skulpt errors

            // STEP 3: Extract the result object from within the EarSketch module.
            }).then(function(mod) {
                esconsole('Compiling finished. Extracting result.',
                          ['DEBUG','COMPILER']);

                if (mod.$d.earsketch && mod.$d.earsketch.$d._getResult) {
                    // case: import earsketch
                    return Sk.ffi.remapToJs(
                        Sk.misceval.call(mod.$d.earsketch.$d._getResult)
                    ); // result
                } else if (mod.$d._getResult) {
                    // case: from earsketch import *
                    return Sk.ffi.remapToJs(
                        Sk.misceval.call(mod.$d._getResult)
                    ); // result
                } else {
                    throw new ReferenceError(
                        "Something went wrong. Skulpt did not provide the " +
                        "expected output.");
                }
            }).catch(function(err) {
                throw err;

            // STEP 4: Perform post-compilation steps on the result object
            }).then(function(result) {
                esconsole('Performing post-compilation steps.', ['DEBUG','COMPILER']);
                return postCompile(result);
            }).catch(function(err) {
                throw err;
            // STEP 5: finally return the result
            }).then(function(result) {
                esconsole('Post-compilation steps finished. Return result.', ['DEBUG','COMPILER']);
                return result;
            });
        });
    }

    //---------------------------------------------
    /*
    The functions `recursiveNameCheckJS`, `handleUndefinedNamesJS`, and `createJSInterpreter` were introduced to check the validity of code structure while skipping unknown names (e.g., user-defined audio clips) for later verification at compilation.
    The JS version uses a duplicate "sub" interpreter as the state of main interpreter seems not resettable.
     */
    function recursiveNameCheckJS(code, undefinedNames, tags, quality) {
        var interpreter = createJsInterpreter(code, tags, quality);
        undefinedNames.forEach(function (v) {
            interpreter.setProperty(interpreter.getScope().object,v,v);
        });
        try {
            testRun = true;
            runJsInterpreter(interpreter);
        } catch(e) {
            if (e instanceof ReferenceError) {
                var name = e.message.replace(' is not defined','');
                // interpreter.setProperty(scope, name, name);
                undefinedNames.push(name);
                return recursiveNameCheckJS(code, undefinedNames, tags, quality);
            }
        } finally {
            testRun = false;
        }
        return undefinedNames;
    }

    function handleUndefinedNamesJS(code, interpreter, tags, quality) {
        esconsole('Iterating through undefined variable names.', ['compiler','deubg']);

        var undefinedNames = recursiveNameCheckJS(code, [], tags, quality);
        return $q.all(undefinedNames.map(function (name) { return audioLibrary.verifyClip(name); })).then(function (result) {
            result.forEach(function (dataIfExist) {
                if (dataIfExist) {
                    interpreter.setProperty(
                        interpreter.getScope().object,
                        dataIfExist.file_key,
                        dataIfExist.file_key
                    );
                }
            });
        });
    }

    function createJsInterpreter(code, tags, quality) {
        try {
            var interpreter = new Interpreter(code, ES_JAVASCRIPT_API);
        } catch (e) {
            if (e.loc !== undefined) {
                // acorn provides line numbers for syntax errors
                e.message += ' on line ' + e.loc.line;
                e.lineNumber = e.loc.line;
            }
            throw e;
        }

        // inject audio constants into the interpreter scope
        for (var i in tags) {
            if (tags.hasOwnProperty(i)) {
                var tag = tags[i];
                interpreter.setProperty(interpreter.getScope().object, tag, tag);
            }
        }
        // inject audio quality into the interpreter scope
        interpreter.setProperty(interpreter.getScope().object, '__AUDIO_QUALITY', quality);

        return interpreter;
    }
    //---------------------------------------------

    /**
     * Compile a javascript script.
     *
     * @param {string} code The code to run.
     * @param {int} quality Numeric value for the audio quality to load.
     * @returns {Promise} A promise that resolves to the compiled result object.
     */
    function compileJavascript(code, quality) {

        // printing for unit tests
        esconsole(ESUtils.formatScriptForTests(code), ['NOLOG', 'COMPILER']);

        // A temporary switch for disabling the lazy evaluation of undefined names.
        var bypassOptimization = !FLAGS.LAZY_SCRIPT_COMPILER;
        var escapeWords = ['Math.random','readInput','analyzeTrackForTime','analyzeTrack','analyzeForTime','analyze','dur'].join('|');
        if (code.match(new RegExp(escapeWords,'g'))) {
            bypassOptimization = true;
        }
        esconsole('Using lazy name loading: ' + !bypassOptimization, ['compiler','debug']);
        var getTagsFn = bypassOptimization ? audioLibrary.getAllTags : audioLibrary.getDefaultTags;

        return getTagsFn().then(function(tags) {
            // after loading audio tags, compile the script
            esconsole('Finished fetching audio tags', ['DEBUG','COMPILER']);

            esconsole('Compiling script using JS-Interpreter.',
                      ['DEBUG','COMPILER']);

            if (bypassOptimization) {
                try {
                    var interpreter = new Interpreter(code, ES_JAVASCRIPT_API);
                } catch (e) {
                    if (e.loc !== undefined) {
                        // acorn provides line numbers for syntax errors
                        e.message += ' on line ' + e.loc.line;
                        e.lineNumber = e.loc.line;
                    }
                    throw e;
                }

                // inject audio constants into the interpreter scope
                for (var i in tags) {
                    if (tags.hasOwnProperty(i)) {
                        var tag = tags[i];
                        interpreter.setProperty(interpreter.getScope().object, tag, tag);
                    }
                }
                // inject audio quality into the interpreter scope
                interpreter.setProperty(interpreter.getScope().object, '__AUDIO_QUALITY', quality);

                try {
                    return runJsInterpreter(interpreter); // result
                } catch(e) {
                    var lineNumber = getLineNumber(interpreter, code, e);
                    throwErrorWithLineNumber(e, lineNumber);
                }
            } else {
                var mainInterpreter = createJsInterpreter(code, tags, quality);
                return handleUndefinedNamesJS(code, mainInterpreter, tags, quality).then(function () {
                    try {
                        return runJsInterpreter(mainInterpreter); // result
                    } catch(e) {
                        var lineNumber = getLineNumber(mainInterpreter, code, e);
                        throwErrorWithLineNumber(e, lineNumber);
                    }
                });
            }
        }).catch(function(err) {
            throw err;
        }).then(function(result) {
            esconsole('Performing post-compilation steps.',
                      ['DEBUG','COMPILER']);
            return postCompile(result);
        }).catch(function(err) {
            throw err;
        }).then(function(result) {
            esconsole('Post-compilation steps finished. Return result.',
                      ['DEBUG','COMPILER']);
            return result;
        });
    }

    /**
     * This is a helper function for running JS-Interpreter to handle
     * breaks in execution due to asynchronous calls. When an asynchronous
     * call is received, the interpreter will break execution and return true,
     * so we'll set a timeout to wait 200 ms and then try again until the
     * asynchronous calls are finished.
     *
     * @private
     */
    function runJsInterpreter(interpreter) {
        if (!interpreter.run()) {
            if (interpreter.__ES_FINISHED !== undefined) {

                esconsole('Compiling finished. Extracting result.',
                          ['DEBUG','COMPILER']);
                return interpreter.__ES_FINISHED; // result
            } else {
                throw new EvalError(
                    'Missing call to finish() or something went wrong.'
                );
            }
        } else {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    try {
                        resolve(runJsInterpreter(interpreter, resolve, reject));
                    } catch(e) {
                        reject(e);
                    }
                }, 200);
            });
        }
    }

    /**
     * Gets the current line number from the top of the JS-interpreter
     * stack trace.
     *
     * @private
     */
    function getLineNumber (interpreter, code, error) {
        var newLines, start;
        if (error.stack.startsWith('TypeError: undefined')) {
            return null;
        } else if (error.stack.startsWith('ReferenceError')) {
            var name = error.message.split(' is not defined')[0];
            start = code.indexOf(name);
            if (start > 0) {
                newLines = code.slice(0, start).match(/\n/g);
            } else if (start === 0) {
                newLines = [];
            }
            return newLines ? newLines.length + 1 : 1;
        } else if (interpreter && interpreter.stateStack && interpreter.stateStack.length) {
            // get the character start location from the state stack
            var stack = interpreter.stateStack;
            start = stack[stack.length-1].node.start;
            if (start > 0) {
                newLines = code.slice(0, start).match(/\n/g);
            }
            return newLines ? newLines.length + 1 : null;
        }
    }

    function throwErrorWithLineNumber(error, lineNumber) {
        var err;

        // JS-interpreter sometimes throws strings
        if (typeof (error) === 'string') {
            if (lineNumber) {
                err = new EvalError(e + ' on line ' + lineNumber);
                err.lineNumber = lineNumber;
            } else {
                err = new EvalError(e);
            }
            throw err;
        } else {
            if (lineNumber) {
                error.message += ' on line ' + lineNumber;
                error.lineNumber = lineNumber;
            }
            throw error;
        }
    }

    function getClipTempo(result) {
        var metadata = audioLibrary.getCache();
        var tempoCache = {};

        result.tracks.forEach(function (track) {
            track.clips.forEach(function (clip) {
                if (tempoCache.hasOwnProperty(clip.filekey)) {
                    clip.tempo = tempoCache[clip.filekey];
                } else {
                    var match = metadata.find(function (item) {
                        return item.file_key === clip.filekey;
                    });
                    if (typeof(match) !== 'undefined') {
                        var tempo = parseInt(match.tempo);
                        tempo = isNaN(tempo) ? -1 : tempo;
                        clip.tempo = parseInt(tempo);
                        tempoCache[clip.filekey] = tempo;
                    }
                }
            });
        });

        return result;
    }

    function loadBuffers(result) {
        // first load all the buffers necessary
        var promises = [];
        for (var i in result.tracks) {
            var track = result.tracks[i];
            for (var j in track.clips) {
                var clip = track.clips[j];

                var tempo = result.tempo;
                // var tempo = '-1';

                var promise = audioLibrary.getAudioClip(
                    clip.filekey,
                    tempo,
                    result.quality
                );
                promises.push(promise);
            }
        }

        return Promise.all(promises).then(function(buffers) {
            var map = {};
            for (var i = 0; i < buffers.length; i++) {
                map[buffers[i].filekey] = buffers[i];
            }
            return map;
        }).catch(function(err) {
            throw err;
        });
    }

    function loadBuffersForSampleSlicing(result) {
        // first load all the buffers necessary
        var promises = [];
        var sliceKeys = [];

        for (var sliceKey in result.slicedClips) {
            sliceKeys.push(sliceKey);
            var sliceDef = result.slicedClips[sliceKey];

            var promise = audioLibrary.getAudioClip(
              sliceDef.sourceFile,
              result.tempo,
              result.quality
            );
            promises.push(promise);  
        }

        return Promise.all(promises).then(function(buffers) {
            for (var i = 0; i < buffers.length; i++) {
                var sliceKey = sliceKeys[i];
                var def = result.slicedClips[sliceKey];
                var buffer = sliceAudioBufferByMeasure(buffers[i], def.start, def.end, result.tempo);
                audioLibrary.cacheSlicedClip(sliceKey, result.tempo, result.quality, buffer);
            }
            return result;
        }).catch(function(err) {
            throw err;
        });
    }
    /**
     * Slice a buffer to create a new temporary sound constant.
     * start - the start of the sound, in measures (relative to 1 being the start of the sound)
     * end - the end of the sound, in measures (relative to 1 being the start of the sound)
     *
     * @private
     */
    function sliceAudioBufferByMeasure(buffer, start, end, tempo){
        //measures * (beats/measure) * ((seconds/minute) / (beats/minute))
        //measures * (beats/measure) * (seconds/minute) * (minutes/beat)
        // beats  * seconds/beat   where  beats = (end-start) * 4 and  and    seconds/beat = (60.0/tempo)
        var length_sec = (end-start) * 4 * (60.0/tempo); //assumes 4 pulses per measure
        var length_samp = length_sec * buffer.sampleRate;

        var slicedBuffer =  audioContext.createBuffer(buffer.numberOfChannels, length_samp, buffer.sampleRate);

        //Sample range which will be extracted from the original buffer
        // the start/end-1 is because measures are 1 indexed
        var startSamp = (start-1) * 4 * (60.0/tempo) * buffer.sampleRate;
        var endSamp = (end-1) * 4 * (60.0/tempo) * buffer.sampleRate;

        if(endSamp > buffer.length){
            throw new RangeError('End of slice at ' + end + ' reaches past end of sample ' + buffer.filekey);
        }

        for(var i = 0; i < buffer.numberOfChannels; i++){
            var newBufferData = slicedBuffer.getChannelData(i)
            var originalBufferData = buffer.getChannelData(i).slice(startSamp, endSamp);

            var copyLen = Math.min(newBufferData.length, originalBufferData.length);
            for(var k = 0; k < copyLen; k++) {
                newBufferData[k] = originalBufferData[k];
            }
        }
        return slicedBuffer;
    }

    /**
     * Fill in looped clips with multiple clips, and adjust effects with
     * end == 0.
     *
     * @private
     */
    function fixClips(result, buffers) {
        // step 1: fill in looped clips
        result.length = 0;
        for (var i in result.tracks) {
            var track = result.tracks[i];
            track.analyser = audioContext.createAnalyser();
            for (var j in track.clips) {
                var clip = track.clips[j];

                var buffer = buffers[clip.filekey];
                // add the buffer property
                clip.audio = buffer;

                // calculate the measure length of the clip
                var duration = ESUtils.timeToMeasure(
                    buffer.duration, result.tempo
                );

                // by default, increment the repeating clip position by the clip duration
                var posIncr = duration;

                // if the clip does not have the original tempo, override the incremental size to be a quarter note, half note, a measure, etc.
                if (clip.tempo === -1) {
                    var exp = -2;

                    while (duration > Math.pow(2, exp)) {
                        // stop adjusting at exp=4 -> 16 measures
                        if (exp >= 4) {
                            break;
                        } else {
                            exp++;
                        }
                    }

                    if (duration <= Math.pow(2, exp)) {
                        posIncr = Math.pow(2, exp);
                    }
                }

                // if the clip end value is 0, set it to the duration
                // this fixes API calls insertMedia, etc. that don't
                // know the clip length ahead of time
                if (clip.end === 0) {
                    clip.end = 1 + duration;
                }

                // calculate the remaining amount of time to fill
                var leftover = clip.end - clip.start - posIncr;

                // figure out how long the result is
                result.length = Math.max(
                    result.length,
                    clip.measure + (clip.end - clip.start) + clip.silence - 1
                );

                // update the source clip to reflect the new length
                clip.end = Math.min(1+duration, clip.end);
                clip.loopChild = false;

                // add clips to fill in empty space
                var i = 1;
                //the minimum measure length for which extra clips will be added to fill in the gap
                var fillableGapMinimum = 0.01;  
                while (leftover > fillableGapMinimum && clip.loop) {
                    track.clips.push({
                        filekey: clip.filekey,
                        audio: clip.audio,
                        track: clip.track,
                        measure: clip.measure + (i * posIncr),
                        start: 1,
                        end: 1 + Math.min(duration, leftover),
                        scale: clip.scale,
                        loop: clip.loop,
                        loopChild: true
                    });
                    leftover -= Math.min(posIncr, leftover);
                    i++;
                }
            }

            // fix effect lengths
            for (var key in track.effects) {
                if (track.effects.hasOwnProperty(key)) {
                    var effects = track.effects[key];
                    effects.sort(function (a, b) {
                        if (a.startMeasure < b.startMeasure) {
                            return -1;
                        } else if (a.startMeasure > b.startMeasure) {
                            return 1;
                        } else {
                            return 0;
                        }
                    });
                    var endMeasureIfEmpty = result.length + 1;
                    for (var j = effects.length-1; j >= 0; j--) {
                        var effect = effects[j];
                        if (effect.endMeasure === 0) {
                            if (effect.startMeasure > endMeasureIfEmpty) {
                                effect.endMeasure = effect.startMeasure;
                            } else {
                                if (effects[j+1]) {
                                    effect.endMeasure = effects[j+1].startMeasure;
                                } else {
                                    effect.endMeasure = endMeasureIfEmpty;
                                }
                            }
                            endMeasureIfEmpty = effect.startMeasure;
                        }
                    }

                    // if the automation start in the middle, it should fill the time before with the startValue of the earliest automation
                    if (effects[0].startMeasure > 1) {
                        var fillEmptyStart = Object.assign({}, effects[0]); // clone the earliest effect automation
                        fillEmptyStart.startMeasure = 1;
                        fillEmptyStart.endMeasure = effects[0].startMeasure;
                        fillEmptyStart.startValue = effects[0].startValue;
                        fillEmptyStart.endValue = effects[0].startValue;
                        fillEmptyStart.inputStartValue = effects[0].inputStartValue;
                        fillEmptyStart.inputEndValue = effects[0].inputStartValue;
                        effects.unshift(fillEmptyStart);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Warn users when a clips overlap each other. Done in post-compile because
     * we don't know the length of clips until then.
     *
     * @private
     */
    function checkOverlaps(result) {
        var truncateDigits = 5; // workaround for precision errors
        var margin = 0.001;

        for (var i = 0; i < result.tracks.length; i++) {
            var track = result.tracks[i];
            for (var j = 0; j < track.clips.length; j++) {
                var clip = track.clips[j];
                for (var k = 0; k < track.clips.length; k++) {
                    if (k == j) continue;
                    var sibling = track.clips[k];
                    var clipLeft = clip.measure;
                    var clipRight = clip.measure + ESUtils.truncate(clip.end - clip.start, truncateDigits);
                    var siblingLeft = sibling.measure;
                    var siblingRight = sibling.measure +
                        ESUtils.truncate(sibling.end - sibling.start, truncateDigits);
                    if (clipLeft >= siblingLeft && clipLeft < (siblingRight-margin)) {
                        esconsole([clip, sibling], 'compiler');
                        userConsole.warn(
                            'Overlapping clips ' + clip.filekey + ' and '
                            + sibling.filekey + ' on track ' + clip.track
                        );
                        userConsole.warn('Removing the right-side overlap');
                        track.clips.splice(j, 1);
                    } else if (clipRight > (siblingLeft+margin) && clipRight <= siblingRight) {
                        esconsole([clip, sibling], 'compiler');
                        userConsole.warn(
                            'Overlapping clips ' + clip.filekey + ' and '
                            + sibling.filekey + ' on track ' + clip.track
                        );
                        userConsole.warn('Removing the right-side overlap');
                        track.clips.splice(k, 1);
                    }
                }
            }
        }
    }

    /**
     * Warn users when a track contains effects, but no audio. Done in post-compile 
     * because we don't know if there are audio samples on the entire track
     * until then.
     * Moved from passthrough.js
     * @private
     */
    function checkEffects(result) {
        for (var i = 0; i < result.tracks.length; i++) {
            var track = result.tracks[i];
            var clipCount = track.clips.length;
            var effectCount  = Object.keys(track.effects).length;

            if( effectCount > 0 && clipCount == 0) {
                userConsole.warn(
                    ESMessages.dawservice.effecttrackwarning + ' (Track ' + i + ')'
                );
            }
        }
    }

    /**
     * Adds a metronome track to the end of a result.
     *
     * @private
     */
    function addMetronome(result) {
        return Promise.all([
            audioLibrary.getAudioClip('METRONOME01', undefined, result.quality),
            audioLibrary.getAudioClip('METRONOME02', undefined, result.quality)
        ]).then(
        function(r) {
            var track = {clips:[],effects:[]};
            for (var i = 1; i < result.length+1; i+=0.25) {
                var filekey = 'METRONOME02';
                var audio = r[1];
                if (i%1 == 0) {
                    filekey = 'METRONOME01';
                    audio = r[0];
                }
                track.clips.push({
                    filekey: filekey,
                    audio: audio,
                    track: result.tracks.length,
                    measure: i,
                    start: 1,
                    end: 1.625,
                    scale: false,
                    loop: false,
                    loopChild: false
                });
            }
            // the metronome needs an analyzer too to prevent errors in player
            track.analyser = audioContext.createAnalyser();
            result.tracks.push(track);
            return result;
        }).catch(function(err) {
            throw err;
        });
    }

    /**
     * Indicates whether this is a test run or a "real" (user-visible) run.
     * 
     * @returns {boolean}
     */
    function isTestRun() {
        return testRun;
    }

    /**
     * Return the public functions in this service.
     *
     * @returns {object} The public functions in this service.
     */
    return {
        postCompile: postCompile,
        importPython: importPython,
        compilePython: compilePython,
        compileJavascript: compileJavascript,
        loadBuffersForSampleSlicing: loadBuffersForSampleSlicing,
        isTestRun: isTestRun,
    };

}]);
