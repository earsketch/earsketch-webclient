/**
 * This file contains functions meant to consolidate all EarSketch API functions
 * into a single source. Both the Python and Javascript libraries are simply
 * wrappers for these functions.
 *
 * If your API function needs to be asynchronous, make sure it returns a
 * promise, and use suspendPassthrough() in the Javascript and Python wrappers.
 *
 * TODO: consolidate range checking and the corresponding
 * error throwing in the addClip() and addEffect() methods. Right now it is
 * duplicated in every API function.
 *
 * @module Passthrough
 * @author Creston Bunch
 */

// TODO: This import. Currently there is some conflict between this being a CommonJS module and an ES6 module.
// import esconsole from '../esconsole'

ES_PASSTHROUGH = {
    /**
     * Set the initial state of the result object.
     */
    init: function(result, quality) {
        esconsole(
            'Calling pt_init from passthrough',"PT"
        );

        return {
            init: true,
            finish: false,
            tempo: 120,
            length: 0,
            quality: quality,
            tracks: [],
            slicedClips: {} //of the form sliceKey(str) -> {sourceFile: oldSoundFile(str), start: startLocation(float), end: endLocation(float)}
        }
    },

    /**
     * Set the tempo on the result object.
     */
    setTempo: function(result, tempo) {
        esconsole(
            'Calling pt_setTempo from passthrough with parameter ' +
            tempo, ['DEBUG','PT']
        );

        checkInit(result);

        var args = copyArgs(arguments).slice(1); // remove first argument
        ptCheckArgs('setTempo', args, 1, 1);
        ptCheckType('tempo', 'number', tempo);
        ptCheckRange('setTempo', tempo, 45, 220);

        if(Math.floor(tempo) != tempo) throw new TypeError('tempo must be an integer');

        result.tempo = tempo;

        return result;
    },

    /**
     * Run steps to clean up the script.
     */
    finish: function(result) {
        esconsole(
            'Calling pt_finish from passthrough',"PT"
        );

        checkInit(result);

        // toggle finish flag
        result['finish'] = true;

        return result;
    },

    /**
     * Add a clip to the given result object.
     */
    fitMedia: function(
        result, filekey, trackNumber, startLocation, endLocation
    ) {

        esconsole(
            'Calling pt_fitMedia from passthrough with parameters '
            + filekey + ' , '
            + trackNumber + ' , '
            + startLocation + ' , '
            + endLocation,'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1); // remove first argument
        ptCheckArgs('fitMedia', args, 4, 4);
        ptCheckType('filekey', 'string', filekey);
        ptCheckFilekeyType(filekey);
        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);
        ptCheckType('startLocation', 'number', startLocation);
        ptCheckType('endLocation', 'number', endLocation);

        // the range check in `addClip` cannot catch the case when end = start-1
        if (endLocation < startLocation) {
            throw new RangeError('Clip cannot end before it starts');
        }

        var clip = {
            filekey: filekey,
            track: trackNumber,
            measure: startLocation,
            start: 1,
            end: endLocation - startLocation + 1,
            scale: false,
            loop: true
        };

        addClip(result, clip);

        return result;
    },

    /**
     * Insert a media clip.
     */
    insertMedia: function(
        result, fileName, trackNumber, trackLocation, scaleAudio
    ) {

        esconsole(
            'Calling pt_insertMedia from passthrough with parameters '
            + fileName + ' , '
            + trackNumber + ' , '
            + trackLocation + ' , '
            + scaleAudio,'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1); // remove first argument
        ptCheckArgs('insertMedia', args, 3, 4);
        ptCheckType('fileName', 'string', fileName);
        ptCheckFilekeyType(fileName);
        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);

        // Now check if the optional parameters have valid datatypes. If not specified, initialize to defaults.
        if (trackLocation !== undefined) {
            if (typeof(trackLocation) !== 'number') {
                throw new TypeError('trackLocation must be a number');
            } else if (trackLocation < 1.0) {
                throw new RangeError('trackLocation must be no less than 1.0')
            }
        } else {
            // trackLocation = 1.0;
            throw new TypeError('trackLocation needs to be specified');
        }

        if (scaleAudio !== undefined) {
            if (typeof(scaleAudio) !== 'number') {
                throw new TypeError('scaleAudio must be a number');
            }
        } else {
            scaleAudio = 1;
        }

        var clip = {
            filekey: fileName,
            track: trackNumber,
            measure: trackLocation,
            start: 1,
            end: 0,
            scale: scaleAudio,
            loop: true
        };

        addClip(result, clip);

        return result;
    },

    /**
     * Insert a media clip section.
     */
    insertMediaSection: function(
        result,
        fileName,
        trackNumber,
        trackLocation,
        mediaStartLocation,
        mediaEndLocation,
        scaleAudio
    ) {

        esconsole(
            'Calling pt_insertMediaSection from passthrough with parameters '
            + fileName + ' , '
            + trackNumber + ' , '
            + trackLocation + ' , '
            + mediaStartLocation + ' , '
            + mediaEndLocation + ' , '
            + scaleAudio,"PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('insertMediaSection', args, 3, 6);
        ptCheckType('fileName', 'string', fileName);
        ptCheckFilekeyType(fileName);
        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);
        ptCheckType('trackLocation', 'number', trackLocation);

        if (mediaStartLocation !== undefined) {
            if (typeof(mediaStartLocation) !== 'number') {
                throw new TypeError('mediaStartLocation must be a number');
            }
        } else {
            mediaStartLocation = 0;
        }

        if (mediaEndLocation !== undefined) {
            if (typeof(mediaEndLocation) !== 'number') {
                throw new TypeError('mediaEndLocation must be a number');
            }
        } else {
            mediaEndLocation = 0;
        }

        if (scaleAudio !== undefined) {
            if (typeof(scaleAudio) !== 'number') {
                throw new TypeError('scaleAudio must be a number');
            }
        } else {
            scaleAudio = 1;
        }

        var clip = {
            filekey: fileName,
            track: trackNumber,
            measure: trackLocation,
            start: mediaStartLocation,
            end: mediaEndLocation,
            scale: scaleAudio,
            loop: true
        };

        addClip(result, clip);

        return result;
    },

    /**
     * Make a beat of audio clips.
     */
    makeBeat: function(result, media, track, measure, beatString) {
        esconsole(
            'Calling pt_makeBeat from passthrough with parameters '
            + media + ' , '
            + track + ' , '
            + measure + ' , '
            + beatString,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('makeBeat', args, 4, 4);

        if (media.constructor !== Array && typeof(media) !== 'string') {
            throw new TypeError('media must be a list or a string');
        }

        ptCheckType('track', 'number', track);
        ptCheckInt('track', track);
        ptCheckType('measure', 'number', measure);
        ptCheckType('beatString', 'string', beatString);

        ptCheckRange('track', track, {min: 1});
        ptCheckRange('measure', measure, {min: 1});

        // ensure input media is a list
        var mediaList = [];
        if (typeof(media) == "object") {
            for (var i = 0; i < media.length; i++) {
                mediaList.push(media[i]);
            }
        } else {
            mediaList.push(media);
        }

        var SUSTAIN = "+";
        var REST = "-";
        var SIXTEENTH = 0.0625;

        // parse the beat string
        for (var i = 0; i < beatString.length; i++) {
            var current = parseInt(beatString[i]);
            // add a rest at the "end" so that any number in the last index gets
            // included
            var next = (i < beatString.length - 1) ? beatString[i + 1] : REST;

            // current beat is a valid number
            if (!isNaN(current)) {
                if (current > mediaList.length - 1) {
                    if (mediaList.length === 1) {
                        throw new RangeError(ESMessages.esaudio.nonlistRangeError);
                    } else {
                        throw new RangeError(ESMessages.esaudio.stringindex);
                    }
                }
                var filekey = mediaList[current];
                var location = measure + (i * SIXTEENTH);
                var start = 1; //measure + (i * SIXTEENTH);
                var end = start + SIXTEENTH;
                var silence = 0;

                if (next == REST) {
                    // next char is a rest, so we calculate the length and
                    // add silence to the end if necessary
                    var j = i+1;
                    while (isNaN(parseInt(beatString[j])) &&
                           j++ < beatString.length) {
                    }
                    if (j >= beatString.length) {
                        silence += (j-i-2)*SIXTEENTH;
                    }

                } else if (next == SUSTAIN) {
                    // next char is a sustain, so add to the end length
                    // the number of sustain characters in a row
                    var j = i+1;
                    while (beatString[j] == SUSTAIN && j++ < beatString.length){
                        end += SIXTEENTH;
                    }
                    // skip ahead (for speed)
                    i = j-1;

                    // next char is a rest, so we calculate the length and
                    // add silence to the end if necessary
                    var j = i+1;
                    while (beatString[j] == REST &&
                           j++ < beatString.length) {
                    }
                    if (j >= beatString.length) {
                        silence += (j-i-1)*SIXTEENTH;
                    }
                }

                var clip = {
                    filekey: filekey,
                    track: track,
                    measure: location,
                    start: start,
                    end: end,
                    scale: false,
                    loop: false
                };

                addClip(result, clip, silence);
            }
        }

        return result;
    },

    /**
     * Make a beat from media clip slices.
     */
    makeBeatSlice: function(
        result, media, track, measure, beatString, beatNumber
    ) {
        esconsole(
            'Calling pt_makeBeatSlice from passthrough with parameters '
            + media + ' , '
            + track + ' , '
            + measure + ' , '
            + beatString + ' , '
            + beatNumber,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('makeBeatSlice', args, 5, 5);
        ptCheckType('media', 'string', media);
        ptCheckFilekeyType(media);
        ptCheckType('track', 'number', track);
        ptCheckInt('track', track);
        ptCheckType('measure', 'number', measure);
        ptCheckType('beatString', 'string', beatString);

        ptCheckRange('track', track, {min: 1});
        ptCheckRange('measure', measure, {min: 1});

        if (beatNumber.constructor !== Array
            && typeof(beatNumber) !== 'number') {
            throw new TypeError('beatNumber must be a list or a number');
        }

        if (beatNumber.constructor === Array) {
            beatNumber.forEach(function (v) {
                if (typeof(v) !== 'number') {
                    throw new TypeError(
                        'beatNumber values must be numbers.'
                    );
                } else {
                    if (v < 1) {
                        throw new RangeError(
                            'beatNumber values cannot be below 1.'
                        );
                    }
                }
            });
        }

        // ensure input beats is a list
        var beatList = [];
        if (typeof(beatNumber) == "object") {
            for (var i = 0; i < beatNumber.length; i++) {
                beatList.push(beatNumber[i]);
            }
        } else {
            beatList.push(media);
        }

        var SUSTAIN = "+";
        var REST = "-";
        var SIXTEENTH = 0.0625;

        // parse the beat string
        for (var i = 0; i < beatString.length; i++) {
            var current = parseInt(beatString[i]);
            // add a rest at the "end" so that any number in the last index gets
            // included
            var next = (i < beatString.length - 1) ? beatString[i + 1] : REST;

            // current beat is a valid number
            if (!isNaN(current)) {
                if (current > beatList.length - 1) {
                    throw new RangeError(ESMessages.esaudio.stringindex);
                }
                var start = measure + (i * SIXTEENTH);
                var sliceStart = beatList[current];
                var sliceEnd = beatList[current] + SIXTEENTH;

                if (next == REST) {
                    // next char is a rest, so do nothing
                } else if (next == SUSTAIN) {
                    // next char is a sustain, so add to the end length
                    // the number of sustain characters in a row
                    var j = i + 1;
                    while (beatString[j] == SUSTAIN && j++ < beatString.length){
                        sliceEnd += SIXTEENTH;
                    }
                    // skip ahead
                    i = j-1;
                }

                result = ES_PASSTHROUGH.insertMediaSection(
                    result, media, track, start, sliceStart, sliceEnd
                );
            }
        }

        return result
    },

    /**
     * Analyze a clip.
     *
     * Returns the analyzed value. Does not alter the result (it just takes it
     * as a parameter for consistency).
     */
    analyze: function(result, audioFile, featureForAnalysis) {

        esconsole(
            'Calling pt_analyze from passthrough with parameters '
            + audioFile + ' , '
            + featureForAnalysis,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('analyze', args, 2, 2);

        ptCheckType('audioFile', 'string', audioFile);
        ptCheckFilekeyType(audioFile);
        ptCheckType('featureForAnalysis', 'string', featureForAnalysis);

        if (!~['spectral_centroid', 'rms_amplitude'].indexOf(featureForAnalysis.toLowerCase())) {
            throw new Error('featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE');
        }

        // load an angular service outside angular
        var audioLibrary = ServiceWrapper().audioLibrary;
        var compiler = ServiceWrapper().compiler;

        var tempo = result.tempo;
        var q = result.quality;


        var blockSize = 2048; // TODO: hardcoded in analysis.js as well
        var sampleRate = audioLibrary.getSampleRate ? audioLibrary.getSampleRate() : 44100;
        if(audioFile in result.slicedClips){
            var sliceLength_measure = result.slicedClips[audioFile].end - result.slicedClips[audioFile].start;
            var sliceLength_samp = sliceLength_measure * 4 * (60.0/tempo) * sampleRate;
            if(sliceLength_samp < blockSize) {
                throw new RangeError(audioFile + ' is too short to be analyzed.');
            }
        }

        return compiler.loadBuffersForSampleSlicing(result)
        .then(
            function(newResult){ 
                return audioLibrary.getAudioClip(audioFile, newResult.tempo, q)
            }
        ).catch(function(err) {
            throw err;
        })
        .then(
            function(buffer) {
                return ServiceWrapper().analyzer.ESAnalyze(buffer, featureForAnalysis, tempo);
            }
        ).catch(function(err) {
            throw err;
        });
    },

    /**
     * Analyze a clip for time.
     *
     * Returns the analyzed value. Does not alter the result.
     */
    analyzeForTime: function(
        result, audioFile, featureForAnalysis, startTime, endTime
    ) {
        esconsole(
            'Calling pt_analyzeForTime from passthrough with parameters '
            + audioFile + ' , '
            + featureForAnalysis + ' , '
            + startTime + ' , '
            + endTime,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('analyzeForTime', args, 4, 4);

        ptCheckType('featureForAnalysis', 'string', featureForAnalysis);
        ptCheckType('audioFile', 'string', audioFile);
        ptCheckFilekeyType(audioFile);
        ptCheckType('startTime', 'number', startTime);
        ptCheckType('endTime', 'number', endTime);

        if (!~['spectral_centroid', 'rms_amplitude'].indexOf(featureForAnalysis.toLowerCase())) {
            throw new Error('featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE');
        }

        if (startTime > endTime) {
            throw new RangeError(
                'Cannot have start time greater than end time in Analysis call'
            );
        }

        // load an angular service outside angular
        var audioLibrary = ServiceWrapper().audioLibrary;
        var compiler = ServiceWrapper().compiler;

        // Cannot do this assertion within the async promise chain
        var sampleRate = audioLibrary.getSampleRate ? audioLibrary.getSampleRate() : 44100;
        var startTimeInSamples = Math.round(sampleRate * measureToTime(startTime, result.tempo));
        var endTimeInSamples = Math.round(sampleRate * measureToTime(endTime, result.tempo));
        var blockSize = 2048; // TODO: hardcoded in analysis.js as well
        if ((endTimeInSamples - startTimeInSamples) < blockSize) {
            throw new RangeError(ESMessages.esaudio.analysisTimeTooShort);
        }

        var tempo = result.tempo;
        var q = result.quality;
        return compiler.loadBuffersForSampleSlicing(result)
        .then(
            function(newResult){ 
                return audioLibrary.getAudioClip(audioFile, newResult.tempo, q)
            }
        ).catch(function(err) {
            throw err;
        })
        .then(
            function(buffer) {
                return ServiceWrapper().analyzer.ESAnalyzeForTime(
                    buffer, featureForAnalysis, startTime, endTime, tempo
                );
            }
        ).catch(function(err) {
            throw err;
        });
    },

    analyzeTrack: function(result, trackNumber, featureForAnalysis) {
        esconsole('Calling pt_analyzeTrack from passthrough with parameters '
                  + trackNumber + ' , '
                  + featureForAnalysis,
                  'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('analyzeTrack', args, 2, 2);

        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);
        ptCheckType('featureForAnalysis', 'string', featureForAnalysis);

        ptCheckRange('trackNumber', trackNumber, {min: 0});

        if (!~['spectral_centroid', 'rms_amplitude'].indexOf(featureForAnalysis.toLowerCase())) {
            throw new Error('featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE');
        }

        if (result.tracks[trackNumber] === undefined) {
            throw new Error('Cannot analyze a track that does not exist: ' + trackNumber);
        }

        // load an angular service outside angular
        var compiler = ServiceWrapper().compiler;
        var renderer = ServiceWrapper().renderer;

        var tempo = result.tempo;
        // the analyzeResult will contain a result object that contains only
        // one track that we want to analyze
        var analyzeResult = {
            init: true,
            finish: true,
            tempo: result.tempo,
            tracks: [{clips:[],effects:{}}, result.tracks[trackNumber]],
            quality: result.quality,
            length: result.length,
            slicedClips: result.slicedClips
        }
        return compiler.postCompile(analyzeResult).then(function(compiled) {
            // TODO: analyzeTrackForTime FAILS to run a second time if the
            // track has effects using renderer.renderBuffer()
            // Until a fix is found, we use mergeClips() and ignore track
            // effects.
            //return renderer.renderBuffer(result);
            var clips = compiled.tracks[1].clips;
            var buffer = renderer.mergeClips(clips, result.tempo);
            return buffer;
        }).catch(function(err) {
            throw err;
        }).then(function(buffer) {
            return ServiceWrapper().analyzer.ESAnalyze(buffer, featureForAnalysis, tempo);
        }).catch(function(err) {
            throw err;
        });
    },

    analyzeTrackForTime: function(
        result, trackNumber, featureForAnalysis, startTime, endTime
    ) {
        esconsole(
            'Calling pt_analyzeTrackForTime from passthrough with parameters '
            + trackNumber + ' , '
            + featureForAnalysis + ' , '
            + startTime + ' , '
            + endTime,
            'PT'
        );

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('analyzeTrackForTime', args, 4, 4);

        ptCheckType('featureForAnalysis', 'string', featureForAnalysis);
        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);
        ptCheckType('startTime', 'number', startTime);
        ptCheckType('endTime', 'number', endTime);

        ptCheckRange('trackNumber', trackNumber, {min: 0});

        if (!~['spectral_centroid', 'rms_amplitude'].indexOf(featureForAnalysis.toLowerCase())) {
            throw new Error('featureForAnalysis can either be SPECTRAL_CENTROID or RMS_AMPLITUDE');
        }

        if (result.tracks[trackNumber] === undefined) {
            throw new Error('Cannot analyze a track that does not exist: ' + trackNumber);
        }

        if (startTime > endTime) {
            throw new RangeError(
                'Cannot have start time greater than end time in Analysis call.'
            );
        }

        // load an angular service outside angular
        var audioLibrary = ServiceWrapper().audioLibrary;

        // Cannot do this assertion within the async promise chain
        var sampleRate = audioLibrary.getSampleRate ? audioLibrary.getSampleRate() : 44100;
        var startTimeInSamples = Math.round(sampleRate * measureToTime(startTime, result.tempo));
        var endTimeInSamples = Math.round(sampleRate * measureToTime(endTime, result.tempo));
        var blockSize = 2048; // TODO: hardcoded in analysis.js as well
        if ((endTimeInSamples - startTimeInSamples) < blockSize) {
            throw new RangeError(ESMessages.esaudio.analysisTimeTooShort);
        }

        // load an angular service outside angular
        var compiler = ServiceWrapper().compiler;
        var renderer = ServiceWrapper().renderer;

        var tempo = result.tempo;
        // the analyzeResult will contain a result object that contains only
        // one track that we want to analyze
        var analyzeResult = {
            init: true,
            finish: true,
            tempo: result.tempo,
            tracks: [{clips:[],effects:{}}, result.tracks[trackNumber]],
            quality: result.quality,
            length: result.length,
            slicedClips: result.slicedClips
        };

        return compiler.postCompile(analyzeResult).then(function(compiled) {
            // TODO: analyzeTrackForTime FAILS to run a second time if the
            // track has effects using renderer.renderBuffer()
            // Until a fix is found, we use mergeClips() and ignore track
            // effects.
            var clips = compiled.tracks[1].clips;
            var buffer = renderer.mergeClips(clips, result.tempo);
            return buffer;
        }).catch(function(err) {
            esconsole(err.toString(), ['ERROR','PT']);
            throw err;
        }).then(function(buffer) {
            return ServiceWrapper().analyzer.ESAnalyzeForTime(
                buffer, featureForAnalysis, startTime, endTime, tempo
            );
        }).catch(function(err) {
            esconsole(err.toString(), ['ERROR','PT']);
            throw err;
        });
    },

    /**
     * Get the duration of a clip.
     */
    dur: function(result, fileKey) {
        esconsole('Calling pt_dur from passthrough with parameters '
                  + fileKey, 'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('dur', args, 1, 1);
        ptCheckType('fileKey', 'string', fileKey);

        // load an angular service outside angular
        var audioLibrary = ServiceWrapper().audioLibrary;

        var q = result.quality;
        return audioLibrary.getAudioClip(fileKey, result.tempo, q).then(
            function(buffer) {
                return ServiceWrapper().analyzer.ESDur(buffer, result.tempo);
            }
        ).catch(function(err) {
            throw err;
        });
    },

    /**
     * Return a Gaussian distributed random number.
     */
    gauss: function(result, mean, stddev) {
        esconsole(
            'Calling pt_gauss from passthrough with parameters '
            + mean + ' '
            + stddev,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('gauss', args, 0, 2);

        return Math.randomGaussian(mean, stddev);
    },

    /**
     * Import an image as number data.
     */
    importImage: function(result, imageURL, nrows, ncols, color) {
        esconsole(
            'Calling pt_importImage from passthrough with parameters '
            + imageURL + ' , '
            + nrows + ' , '
            + ncols + ' , '
            + color,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('importImage', args, 3, 4);

        ptCheckType('imageURL', 'string', imageURL);
        ptCheckType('nrows', 'number', nrows);
        ptCheckType('ncols', 'number', ncols);

        if(imageURL.substring(0, 4) != "http") {
            userConsole.warn("Image url does not start with http:// - prepending string to url");
            imageURL = imageURL + "http://";
        }

        if (color !== undefined) {
            ptCheckType('color', 'boolean', color);
        } else {
            color = false;
        }

        // make the HTTP request
        var formData = new FormData();

        formData.append('image_url', imageURL);
        formData.append('width', nrows);
        formData.append('heigth', ncols);
        formData.append('color', color ? true : false);

        var request = new XMLHttpRequest();
        // TODO: synchronous requests are deprecated, come up with a better way
        // to do this
        request.open(
            'POST', URL_DOMAIN+'/services/files/stringifyimage', false
        );

        var response = [];
        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    response = JSON.parse(request.responseText);

                    esconsole('Image data received: ' + response,'PT');
                }
            }
        };
        request.onerror =  function(){
            throw new InternalError('We could not load the image.');
        };

        // make the request
        request.send(formData);

        return response;
    },

    importFile: function(result, fileURL) {
        esconsole('Calling pt_importFile from passthrough with parameters '
                  + fileURL,
                  'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('importFile', args, 1, 1);
        ptCheckType('fileURL', 'string', fileURL);

        if(fileURL.substring(0, 4) != "http") {
            userConsole.warn("File url does not start with http:// - prepending string to url");
            fileURL = "http://" + fileURL;
        }

        var result= ['Working'];

        // make the HTTP request
        var formData = new FormData();

        formData.append('file_url', fileURL);

        var request = new XMLHttpRequest();
        // TODO: synchronous requests are deprecated, come up with a better way
        // to do this
        request.open(
            'POST', URL_DOMAIN+'/services/files/stringifyfile', false
        );

        var response = '';
        request.onload = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    response = request.responseText;
                    esconsole('File data received: ' + response,'PT');
                } else {
                    throw new InternalError(
                        'We could not load the file. There was a bad server'
                        + ' response.'
                    );
                }
            }
        };
        request.onerror =  function(){
            throw new InternalError('We could not load the file.');
        };

        // make the request
        request.send(formData);

        return response;
    },

    /**
     * Provides a way to print to the EarSketch console.
     */
    println: function(result, msg) {
        esconsole(
            'Calling pt_println from passthrough with parameter '
            + msg,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('println', args, 1, 1);

        let compiler = ServiceWrapper().compiler;
        if (!compiler.isTestRun()) {
            // load an angular service outside angular
            var userConsole = ServiceWrapper().userConsole;
            userConsole.log(msg);
        }
    },

    /**
     * Prompt for user input.
     */
    prompt: function(result, msg) {
        esconsole('Calling pt_prompt from passthrough with parameter '
                  + msg, 'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('prompt', args, 0, 1);
        if (typeof(msg) !== 'undefined') {
            ptCheckType('prompt', 'string', msg);
        } else {
            msg = "";
        }

        var userConsole = ServiceWrapper().userConsole;
        return userConsole.prompt(msg);

        /*
        var start = new Date().getTime();
        var res = window.prompt(msg);
        var end = new Date().getTime();

        if (end - start < 50) {
            // This interferes with the autograder. Commenting out until a better
            // solution is found.
            //userNotification.show(ESMessages.general.nopopup_general, 'failure1');
            //throw new Error(ESMessages.general.nopopup_readinput);
        }

        return res;
        */
    },

    /**
     * Replace a list element.
     */
    replaceListElement: function(
        result, inputList, elementToReplace, withElement
    ) {
        esconsole(
            'Calling pt_replaceListElement from passthrough with parameters '
            + inputList + ' , '
            + elementToReplace + ' , '
            + withElement,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('replaceListElement', args, 3, 3);
        ptCheckType('inputList', 'array', inputList);

        // the spec says these can be of any type
        // ptCheckType('elementToReplace', 'string', elementToReplace);
        // ptCheckType('withElement', 'string', withElement);

        inputList = inputList.slice(); // create a copy
        for (var i = 0; i < inputList.length; i++) {
            if (inputList[i] == elementToReplace) {
                inputList[i] = withElement;
            }
        }

        return inputList;
    },

    /**
     * Replace a character in a string.
     */
    replaceString: function(
        result, patternString, characterToReplace, withElement
    ) {
        esconsole(
            'Calling pt_replaceString from passthrough with parameters '
            + patternString + ' , '
            + characterToReplace + ' , '
            + withElement,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('replaceString', args, 3, 3);
        ptCheckType('patternString', 'string', patternString);
        ptCheckType('characterToReplace', 'string', characterToReplace);
        ptCheckType('withElement', 'string', withElement);

        var patternList = patternString.split('');
        var newstring;
        for (var i = 0; i < patternString.length; i++) {
            if (patternList[i] == characterToReplace) {
                patternList[i] = withElement;
            }
        }
        newstring = patternList.join('');
        return newstring;
    },

    /**
     * Reverse a list.
     */
    reverseList: function(result, inputList) {
        esconsole(
            'Calling pt_reverseList from passthrough with parameters '
            + inputList,"PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('reverseList', args, 1, 1);
        ptCheckType('inputList', 'array', inputList);

        inputList = inputList.slice(); // create a copy
        return inputList.reverse();
    },

    /**
     * Reverse a string.
     */
    reverseString: function(result, inputString) {
        esconsole(
            'Calling pt_reverseString from passthrough with parameters '
            + inputString
            ,"PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('reverseString', args, 1, 1);
        ptCheckType('inputString', 'string', inputString);

        return inputString.split('').reverse().join('');
    },

    /**
     * Create a rhythmic effect envelope from a string.
     */
    rhythmEffects: function(
        result,
        track,
        effectType,
        effectParameter,
        effectList,
        measure,
        beatString
    ) {
        esconsole(
            'Calling pt_rhythmEffects from passthrough with parameters '
            + track + ' , '
            + effectType + ' , '
            + effectParameter + ' , '
            + effectList + ' , '
            + measure + ' , '
            + beatString,
            "PT");

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('rhythmEffects', args, 6, 6);
        ptCheckType('track', 'number', track);
        ptCheckInt('track', track);
        ptCheckType('effectType', 'string', effectType);
        ptCheckType('effectParameter', 'string', effectParameter);
        ptCheckType('effectList', 'array', effectList);
        ptCheckType('measure', 'number', measure);
        ptCheckType('beatString', 'string', beatString);

        ptCheckRange('track', track, {min: 0});

        var SUSTAIN = "+";
        var RAMP = "-";
        var SIXTEENTH = 0.0625;

        var prevValue = undefined;
        var prevMeasure = measure;

        for (var i = 0; i < beatString.length; i++) {
            var current = beatString[i];
            var next = beatString[i+1];
            var currentValue = prevValue;
            var startMeasure = measure + (i * SIXTEENTH);

            if (!isNaN(parseInt(current))) {
                // parsing a number, set a new previous value

                var prevValue = effectList[parseInt(current)];
            } else if (isNaN(parseInt(current)) && next !== current) {
                // not currently parsing a number and the next char is not
                // the same as the current char
                var endValue = currentValue;

                if (current == RAMP && !isNaN(parseInt(next))) {
                    // case: ramp to number
                    endValue = effectList[parseInt(next)];
                } else if (current == SUSTAIN && !isNaN(parseInt(next))) {
                    // case: sustain to number
                    endValue = currentValue;
                } else if (current == RAMP && next == SUSTAIN) {
                    // case: ramp to sustain

                    // move to next value
                    while (beatString[++i] == SUSTAIN
                           && i++ < beatString.length) { }

                    // found a  number
                    if (!isNaN(parseInt(beatString[i-1]))) {
                        endValue = effectList[parseInt(beatString[i-1])];
                    } else {
                        throw RangeError('Invalid beatString.');
                    }

                } else if (current == SUSTAIN && next == RAMP) {
                    // case: sustain to ramp
                    endValue = currentValue;
                }

                var endMeasure = measure + (1 + i) * SIXTEENTH;

                var effect = {
                    track: track,
                    name: effectType,
                    parameter: effectParameter,
                    startValue: currentValue,
                    endValue: endValue,
                    startMeasure: prevMeasure,
                    endMeasure: endMeasure
                };

                addEffect(result, effect);

                prevMeasure = endMeasure;
                prevValue = endValue;
            }
        }
        return result;
    },

    setEffect: function(
        result, trackNumber, effect, parameter, effectStartValue,
        effectStartLocation, effectEndValue, effectEndLocation
    ) {
        esconsole(
            'Calling pt_setEffect from passthrough with parameters '
            + trackNumber + ' , '
            + effect + ' , '
            + parameter + ' , '
            + effectStartValue + ' , '
            + effectStartLocation + ' , '
            + effectEndValue + ' , '
            + effectEndLocation,
            'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('setEffect', args, 2, 7);
        ptCheckType('trackNumber', 'number', trackNumber);
        ptCheckInt('trackNumber', trackNumber);
        ptCheckType('effect', 'string', effect);

        ptCheckRange('trackNumber', trackNumber, {min: 0});

        if (parameter !== undefined) {
            ptCheckType('parameter', 'string', parameter);
        } else {
            parameter = ServiceWrapper().applyEffects.effectDefaults[effect].DEFAULT_PARAM;
        }

        if (effectStartValue !== undefined) {
            ptCheckType('effectStartValue', 'number', effectStartValue);
        } else {
            effectStartValue = ServiceWrapper().applyEffects.effectDefaults[effect][parameter].defaultVal;
        }

        if (effectStartLocation !== undefined) {
            ptCheckType('effectStartLocation', 'number', effectStartLocation);
            ptCheckRange('effectStartLocation', effectStartLocation, {min: 1});
        } else {
            effectStartLocation = 1;
        }

        if (effectEndValue !== undefined) {
            ptCheckType('effectEndValue', 'number', effectEndValue);
        } else {
            effectEndValue = effectStartValue;
        }

        if (effectEndLocation !== undefined) {
            ptCheckType('effectEndLocation', 'number', effectEndLocation);
            ptCheckRange('effectEndLocation', effectEndLocation, {min: 1});
        } else {
            effectEndLocation = 0;
        }

        var effect = {
            track: trackNumber,
            name: effect,
            parameter: parameter,
            startValue: effectStartValue,
            endValue: effectEndValue,
            startMeasure: effectStartLocation,
            endMeasure: effectEndLocation
        };

        addEffect(result, effect);

        return result;
    },

    /** 
     * Slice a part of a soundfile to create a new sound file variable
     */
    createAudioSlice: function(result, oldSoundFile, startLocation, endLocation){

        //TODO AVN: parameter validation - how to determine slice start/end is in correct range?

        var args = copyArgs(arguments).slice(1); // remove first argument
        ptCheckArgs('createAudioSlice', args, 3, 3);
        ptCheckType('filekey', 'string', oldSoundFile);
        ptCheckFilekeyType(oldSoundFile);
        ptCheckType('startLocation', 'number', startLocation);
        ptCheckType('endLocation', 'number', endLocation);
        ptCheckAudioSliceRange(result, oldSoundFile, startLocation, endLocation);
        if(oldSoundFile in result.slicedClips){
            throw new ValueError('Creating slices from slices is not currently supported');
        }

        var sliceKey = oldSoundFile + "-" + startLocation + "-" + endLocation;
        var sliceDef = {sourceFile: oldSoundFile, start: startLocation, end: endLocation};

        result.slicedClips[sliceKey] = sliceDef;

        return {'result': result, 'returnVal': sliceKey};
    },

    /**
     * Select a random file.
     */
    selectRandomFile: function(result, folder, extension) {

        esconsole('Calling pt_selectRandomFile from passthrough with '
                  + 'parameters ' + folder + ' , ' + extension, 'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('selectRandomFile', args, 1, 2);
        ptCheckType('folder', 'string', folder);

        if (extension !== undefined) {
            ptCheckType('extension', 'string', extension);
        } else {
            extension = '.wav';
        }

        var url = URL_DOMAIN + '/services/audio/getrandomaudiokey?tag=' + folder;
        var userProject = ServiceWrapper().userProject;

        if (userProject.isLogged()) {
            url += '&username=' + userProject.getUsername();
        }

        var request = new XMLHttpRequest();
        request.open('GET', url, false);
        request.send(null);

        if (request.status === 200) {
            var jsobj = JSON.parse(request.responseText);
            if (jsobj.hasOwnProperty('file_key')) {
                return jsobj.file_key;
            } else {
                throw new ValueError('Please use folder names available in your sound browser.');
            }
        } else {
            throw new RuntimeError(
                'Internal server error. '
                + 'Could not respond to the following tag: ' + folder);
        }
    },

    /**
     * Shuffle a list.
     */
    shuffleList: function(result, array) {
        esconsole('Calling pt_shuffleList from passthrough with parameters '
                  + array, 'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('shuffleList', args, 1, 1);
        ptCheckType('inputList', 'array', array);

        // Fisher-Yates
        var a = array;
            n = a.length;

        for(var i = n - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }

        return a;
    },

    /**
     * Shuffle a string.
     */
    shuffleString: function(result, inputString) {
        esconsole('Calling pt_shuffleString from passthrough with parameters '
                  + inputString, 'PT');

        checkInit(result);

        var args = copyArgs(arguments).slice(1);
        ptCheckArgs('shuffleString', args, 1, 1);
        ptCheckType('inputString', 'string', inputString);

        // Fisher-Yates
        var a = inputString.split(""),
            n = a.length;

        for(var i = n - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a.join("");
    }
};

function ptCheckArgs(funcName, args, required, optional) {
    var res = true;

    if (required === optional) {
        if (args.length !== required) {
            res = funcName + '() takes exactly ' + required + ' argument(s) (' + args.length + ' given)';
        } else {
            res = true;
        }
    } else {
        if ((args.length >= required) && (args.length <= optional)) {
            res = true;
        } else if (args.length < required) {
            res = funcName + '() takes at least ' + required + ' argument(s) (' + args.length + ' given)';
        } else {
            res = funcName + '() takes only ' + required + ' argument(s) (' + args.length + ' given)';
        }
    }

    if (res !== true) {
        throw new TypeError(res);
    }
}

function ptCheckType(name, exptype, arg) {
    var res = true;

    if (exptype === 'array') {
        if (arg.constructor !== Array) {
            res = name + ' must be a list';
        }
    } else if (exptype === 'boolean') {
        if (typeof(arg) !== exptype) {
            // for some reason Skulpt maps booleans to 1 or 0
            return arg === 1 || arg === 0;
        }
    } else {
        if (typeof(arg) !== exptype) {
            res = name + ' must be a ' + exptype;
        }
    }

    if (res !== true) {
        throw new TypeError(res);
    }
}

// call this after the regular type check
function ptCheckInt(name, arg) {
    if (arg.toString().indexOf('.') > -1) {
        throw new TypeError(name + ' must be an integer');
    }
}

function ptCheckFilekeyType(filekey) {
    var res = true;

    if ((filekey[0] === "'" && filekey[filekey.length-1] === "'") ||
        (filekey[0] === '"' && filekey[filekey.length-1] === '"')) {
        res = 'Media constant (' + filekey + ') should not include quotation marks';
    }

    if (res !== true) {
        throw new TypeError(res);
    }
}

function ptCheckRange(name, arg, min, max) {
    var res = true;

    if (typeof(min) === 'number' && typeof(max) === 'number') {
        if (arg < min || arg > max) {
            res = name + ' exceeds the allowed range of ' + min + ' to ' + max;
        }
    } else if (typeof(min) === 'object') {
        // TODO: change the bad arg names...
        if (min.hasOwnProperty('min') && min.hasOwnProperty('max')) {
            if (arg < min.min || arg > min.max) {
                res = name + ' exceeds the allowed range of ' + min.min + ' to ' + min.max;
            }
        } else {
            if (min.hasOwnProperty('min')) {
                if (arg < min.min) {
                    res = name + ' cannot be smaller than ' + min.min;
                }
            }

            if (min.hasOwnProperty('max')) {
                if (arg > min.max) {
                    res = name + ' cannot be bigger than ' + min.max;
                }
            }
        }
    }

    if (res !== true) {
        throw new RangeError(res);
    }
}

function ptCheckAudioSliceRange(result, fileKey, startTime, endTime){
    if(startTime < 1){
        throw new RangeError(' Cannot start slice before the start of the clip');
    }
    var clipDuration = ES_PASSTHROUGH.dur(result, fileKey);
    if(endTime > clipDuration+1) {
        throw new RangeError(' Cannot end slice after the end of the clip');
    }
}

function ptCheckEffectRange(effectname, parameter, effectStartValue, effectStartLocation, effectEndValue, effectEndLocation) {
    var res = true;
    var effectObject = ServiceWrapper().applyEffects.effectDefaults[effectname][parameter];

    if (effectStartValue !== undefined) {
        if (effectEndValue === undefined) {
            if ((effectObject.min <= effectStartValue) && (effectObject.max >= effectStartValue)) {
                res = true;
            } else {
                res = false;
            }
        } else if (effectEndValue !== undefined) {
            if (((effectObject.min <= effectStartValue) && (effectObject.max >= effectStartValue)) &&  ((effectObject.min <= effectEndValue) && (effectObject.max >= effectEndValue))) {
                res = true;
            } else {
                res = false;
            }
        }
    }

    if ((effectStartLocation !== undefined) && ((effectEndLocation !== undefined) && (effectEndLocation != 0))) {
        if (effectEndLocation < effectStartLocation) {
            throw new RangeError(' Cannot have effect start measure greater than end measure');

        }
    }

    if (res !== true) {
        var error = new RangeError(parameter + ' is out of range');
        throw error;
    }
}

function checkInit(result) {
  if (typeof(result) == typeof({})) {
    if ('init' in result && result.init === true) {
      // result was initialized, finish cleanly
      return;
    }
  }
  throw new Error('init() is missing');
}

function copyArgs(args) {
    var result = [];
    for (var i = 0; i < args.length; i++) {
        result.push(args[i]);
    }
    return result;
}

/**
 * Helper function to add clips to the result.
 *
 * @param {Object} result The result object to add the clip to.
 * @param {Object} clip The clip to add.
 * @param {string} clip.filekey The filekey to load in the clip.
 * @param {integer} clip.track The track to add the clip to.
 * @param {integer} clip.measure The measure to begin playing at.
 * @param {number} clip.start The start measure of the clip slice to play.
 * @param {number} clip.end The end measure of the clip slice to play.
 * @param {boolean} clip.scale Whether the clip should be scaled or not to
 * fill the space (not implemented).
 * @param {boolean} clip.loop Whether the clip should be loop or not to
 * fill the space.
 * @param {number} silence The length of silence after the clip used for
 * determining the length of the song (e.g., if makebeat has silence at the
 * end of the song).
 */
function addClip(result, clip, silence) {

    if (silence == undefined) {
        clip.silence = 0;
    } else {
        clip.silence = silence;
    }

    // bounds checking
    if (clip.track === 0) {
        throw new RangeError('Cannot insert media on the master track');
    }

    if (clip.track < 0) {
        throw new RangeError('Cannot insert media before the first track');
    }

    if (clip.measure < 1) {
        throw new RangeError('Cannot insert media before the first measure');
    }

    if (clip.start === clip.end) {
        throw new RangeError('Clip length cannot be zero');
    }

    if (clip.end !== 0 && clip.end < clip.start) {
        throw new RangeError('Clip cannot end before it starts');
    }

    if (clip.end < 0 || clip.start < 0) {
        throw new RangeError('Clips cannot have negative start or end values');
    }

    // create the track if it does not exist
    while (clip.track >= result.tracks.length) {
        result.tracks.push({
            clips: [],
            effects: {}
        })
    }

    result.tracks[clip.track].clips.push(clip);
}

/**
 * Helper function to add effects to the result.
 */
function addEffect(result, effect) {
    esconsole(effect, 'debug');

    // bounds checking
    if (effect.track < 0) {
        throw new RangeError('Cannot add effects before the first track');
    }

    if (ServiceWrapper().applyEffects.effectDefaults[effect.name] === undefined) {
        throw new RangeError('Effect name does not exist');
    }
    if (ServiceWrapper().applyEffects.effectDefaults[effect.name][effect.parameter] === undefined) {
        throw new RangeError('Effect parameter does not exist');
    }

    ptCheckEffectRange(
        effect.name, effect.parameter, effect.startValue,
        effect.startMeasure, effect.endValue, effect.endMeasure
    );

    // create the track if it does not exist
    while (effect.track >= result.tracks.length) {
        result.tracks.push({
            clips: [],
            effects: {}
        })
    }

    var key = effect.name + '-' + effect.parameter;

    // create the effect list if it does not exist
    if (result.tracks[effect.track].effects[key] == undefined) {
        result.tracks[effect.track].effects[key] = [];
    }

    // TODO: this should happen when the effect is applied, not
    // now. But until applyeffects.js gets refactored, this will have to
    // do.
    //
    // Scale the effect ranges from user-inputted values to WebAudio
    // accepted ranges.
    var scaledRange = ServiceWrapper().applyEffects.scaleEffect(
        effect.name, effect.parameter, effect.startValue, effect.endValue
    );
    effect.inputStartValue = effect.startValue;
    effect.startValue = scaledRange[0];
    effect.inputEndValue = effect.endValue;
    effect.endValue = scaledRange[1];

    result.tracks[effect.track].effects[key].push(effect);
}

// copied from ESUtils
function measureToTime(measure, tempo, timeSignature) {
    if (typeof(timeSignature) === 'undefined') timeSignature = 4;
    if (tempo === -1) tempo = 120;
    //tempo beats in 60 secs
    return (measure - 1.0) * timeSignature * 60.0 / tempo;
}
