/**
 * An Angular factor service for fetching audio clips from the EarSketch
 * library.
 *
 * TODO: Angular $http uses Angular $q promises, which are not compatible with
 * native ECMAScript 6 Promises. Maybe one day they will be? I.e.
 * $q.all() and Promise.all() will not let you interchange promise types. At
 * least in unit tests. It seems to work in the browser. I have no idea why.
 * I used $q everywhere in this library so we could unit test this service.
 *
 * @module audioLibrary
 * @author Creston Bunch
 */
app.factory('audioLibrary', ['$http', 'audioContext', '$q',
            '$cacheFactory',
function audioLibraryFactory($http, ctx, $q, $cacheFactory) {

    var SOUND_CACHE = [];
    var CLIP_CACHE = {};
    var PROMISE_CACHE = {};
    var SLICED_CLIP_CACHE = {};

    // TODO: don't hardcode these lists
    var JSEffectKeys =
    ["VOLUME","GAIN","DELAY","DELAY_TIME","DELAY_FEEDBACK",
    "DISTORTION","DISTO_GAIN","FILTER","FILTER_FREQ","FILTER_RESONANCE",
    "COMPRESSOR","COMPRESSOR_THRESHOLD","COMPRESSOR_RATIO","PAN","LEFT_RIGHT",
    "BANDPASS","BANDPASS_FREQ","BANDPASS_WIDTH","CHORUS","CHORUS_LENGTH",
    "CHORUS_NUMVOICES","CHORUS_RATE","CHORUS_MOD","EQ3BAND","EQ3BAND_LOWGAIN",
    "EQ3BAND_LOWFREQ","EQ3BAND_MIDGAIN","EQ3BAND_MIDFREQ","EQ3BAND_HIGHGAIN",
    "EQ3BAND_HIGHFREQ","FLANGER","FLANGER_LENGTH","FLANGER_FEEDBACK",
    "FLANGER_RATE","PHASER","PHASER_RATE","PHASER_RANGEMIN","PHASER_RANGEMAX",
    "PHASER_FEEDBACK","PITCHSHIFT","PITCHSHIFT_SHIFT","TREMOLO","TREMOLO_FREQ",
    "TREMOLO_AMOUNT","RINGMOD","RINGMOD_MODFREQ","RINGMOD_FEEDBACK","WAH",
    "WAH_POSITION","REVERB","REVERB_TIME","REVERB_DAMPFREQ","MIX","BYPASS"];
    var JSAnalysisKeys = ["SPECTRAL_CENTROID", "RMS_AMPLITUDE"];

    /**
     * Get an audio buffer from a file key.
     *
     * @param {string} filekey The constant associated with the audio clip that
     * users type in EarSketch code.
     * @param {int} tempo Tempo to scale the returned clip to.
     * @param {int} quality 0 is high quality 1 is low quality
     * @returns {Promise} A promise that resolves to an arraybuffer
     */
    function getAudioClip(filekey, tempo, quality) {

        var cacheKey = [];
        for (var i = 0; i < arguments.length; i++) {
            cacheKey.push(arguments[i]);
        }

        if (cacheKey in CLIP_CACHE) {
            // this clip has already been downloaded
            return $q(function(resolve, reject) {
                resolve(CLIP_CACHE[cacheKey]);
            });
        } else if (cacheKey in PROMISE_CACHE) {
            // this clip is currently in the process of being downloaded
            return PROMISE_CACHE[cacheKey];
        } else if (cacheKey in SLICED_CLIP_CACHE) {
            var slicedBuffer = SLICED_CLIP_CACHE[cacheKey];
            slicedBuffer.filekey = filekey;
            return $q(function(resolve, reject){
                resolve(slicedBuffer);
            });
        } else {
            esconsole('Loading audio clip with filekey: ' + filekey, ['DEBUG', 'AUDIOLIBRARY']);
            var url = FLAGS.USE_CLIENT_TS ? URL_DOMAIN+'/services/audio/getunstretchedsample' : URL_LOADAUDIO;
            var params = FLAGS.USE_CLIENT_TS ? {
                key: filekey
            } : {
                key: filekey,
                tempo: tempo,
                audioquality: quality ? 1 : 0
            };
            var clipOrigTempo = -1;

            // STEP 1: check if audio key exists
            // TODO: Sample download includes clip verification on server side, so probably we can skip the first part.
            var p = verifyClip(filekey).then(function(result) {
                if (!result) {
                    throw new ReferenceError(
                        'File key ' + filekey + ' does not exist'
                    );
                }
                clipOrigTempo = parseFloat(result.tempo);
                return result;
            }).catch(function(err) {
                esconsole('Error getting audio keys: ' + filekey,
                    ['ERROR', 'AUDIOLIBRARY']);
                throw err;

                // STEP 2: Ask the server for the audio file
            }).then(function(result) {
                esconsole(
                    'Getting ' + filekey + ' buffer from server ',
                    ['DEBUG', 'AUDIOLIBRARY']
                );
                return $http.get(url, {
                    params: params,
                    responseType: 'arraybuffer'
                });
            }).catch(function(err) {
                esconsole('Error getting ' + filekey + ' from the server', ['ERROR', 'AUDIOLIBRARY']);

                //HTTP get status check for better console error feedback
                var status = err.status;
                switch(true) {
                    case (status <= 0):
                        throw "NetworkError: Could not retreive sound file "+ filekey +" due to network error";
                    case (status >= 500 && status < 600):
                        throw "ServerError: Could not retreive sound file "+ filekey +" due to server error";
                }

                throw err;

            // STEP 3: decode the audio data.
            }).then(function(result) {
                // TODO: use promise-based syntax for decodeAudioData() once
                // browsers start supporting it
                esconsole('Decoding ' + filekey + ' buffer',
                          ['DEBUG', 'AUDIOLIBRARY']);
                return $q(function(resolve, reject) {
                    ctx.decodeAudioData(result.data, function (buffer) {
                        esconsole(
                            filekey + ' buffer decoded',
                            ['DEBUG', 'AUDIOLIBRARY']
                        );

                        if (!FLAGS.USE_CLIENT_TS || clipOrigTempo===-1 || tempo===-1) {
                            esconsole('Using the server (sox) time stretcher.', ['debug','audiolibrary']);
                            resolve(buffer);
                        } else {
                            // When useClientTS = true, query unstretched audio clips and apply a time stretch locally.
                            esconsole('Using client-side time stretcher for ' + filekey, ['audiolibrary']);

                            // JS time stretcher; Seems to introduce an unwanted sample offset when the same instance is reused.
                            var kali = new Kali(1);
                            kali.setup(ctx.sampleRate, clipOrigTempo===-1 ? 1 : tempo/clipOrigTempo, FLAGS.TS_QUICK_SEARCH);

                            var offset = Math.round(buffer.length * 0.1);
                            var input = new Float32Array(buffer.length+offset*2);
                            var source = buffer.getChannelData(0);
                            for (var i = 0; i < buffer.length; i++) {
                                input[i+offset] = source[i];
                            }
                            kali.input(input);
                            kali.process();

                            // This weird calculation matches the output length of SOX time stretching.
                            var tgtLen = Math.round((buffer.length+1)*clipOrigTempo/tempo);
                            var outOffset = Math.round(offset*clipOrigTempo/tempo);
                            var output = new Float32Array(tgtLen+outOffset*2);
                            kali.output(output);
                            kali.flush();
                            var res = new Float32Array(tgtLen);
                            for (var i = 0; i < tgtLen; i++) {
                                res[i] = output[i+outOffset];
                            }

                            var newBuff = ctx.createBuffer(1, tgtLen, ctx.sampleRate);
                            if (newBuff.copyToChannel) {
                              newBuff.copyToChannel(res,0,0);
                            } else {
                              // For Safari
                              var tempBuff = newBuff.getChannelData(0);
                              res.forEach(function (v,i) {
                                tempBuff[i] = v;
                              });
                            }

                            resolve(newBuff);
                        }
                    }, function(err) {
                        esconsole('Error', ['ERROR','AUDIOLIBRARY']);
                        reject(err);
                    });
                });
            }).catch(function(err) {
                esconsole('Error decoding audio clip: ' + filekey,
                          ['ERROR', 'AUDIOLIBRARY']);
                throw err;

            // STEP 4: return the decoded audio buffer
            }).then(function(buffer) {
                if (FLAGS.CACHE_TS_RESULTS) {
                    CLIP_CACHE[cacheKey] = buffer;
                }
                // add a filekey property to the buffer so we can
                // figure out where it came from later
                buffer.filekey = filekey;
                // remove this promise from the cache since it's
                // been resolved
                delete PROMISE_CACHE[cacheKey];

                esconsole('Returning buffer', ['DEBUG','AUDIOLIBRARY']);
                return buffer;
            }).catch(function(err) {
                esconsole('Error getting audio clip: ' + filekey,
                          ['ERROR', 'AUDIOLIBRARY']);
                delete PROMISE_CACHE[cacheKey];
                throw err;
            });
            // add this promise to the list of currently running promises so
            // we don't make another HTTP request if one is already underway
            // TODO: is this functionality duplicated by CLIP_CACHE?
            PROMISE_CACHE[cacheKey] = p;
            return p;
        }
    }

    function cacheSlicedClip(fileKey, tempo, quality, buffer){
        SLICED_CLIP_CACHE[[fileKey, tempo, quality]] = buffer;
    }

    /**
     * Get the list of audio tag names.
     *
     * @returns {Promise} A promise that resolves to the list of audio tags.
     */
    function getAudioTags() {
        var url = URL_DOMAIN + '/services/audio/getaudiotags';
        esconsole('Fetching audio tags', ['DEBUG','AUDIOLIBRARY']);
        return $http.get(url, {cache: true})
        .then(function(result) {
            // return only a list of file keys
            var output = [];
            for (var key in result.data.audioTags) {
                var tag = result.data.audioTags[key];
                output.push(tag.file_key);
            }
            esconsole('Found audio tags', ['DEBUG','AUDIOLIBRARY']);
            return output;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    /**
     * Get the list of (every-)user-submitted audio tags.
     *
     * @returns {Promise} A promise that resolves to the list of audio keys.
     */
    function getUserAudioTags() {
        var url = URL_DOMAIN + '/services/audio/getaudiokeys?tag=';
        esconsole('Fetching audio keys', ['DEBUG','AUDIOLIBRARY']);
        return $http.get(url, {cache: true})
        .then(function(result) {
            // return only a list of file keys
            var output = [];
            for (var key in result.data.smallAudioFile) {
                var tag = result.data.smallAudioFile[key];
                output.push(tag.file_key);
            }
            esconsole('Found audio keys', ['DEBUG','AUDIOLIBRARY']);
            return output;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    /**
     * Clears the audio tag cache.
     */
    function clearAudioTagCache() {
        esconsole('Clearing the audio tag cache', ['debug', 'audiolibrary']);
        // doesn't seem to be working... using removeAll() instead
        // $cacheFactory.get('$http').remove(URL_DOMAIN + '/services/audio/getaudiotags');
        // $cacheFactory.get('$http').remove(URL_DOMAIN + '/services/audio/getaudiokeys?tag='); // user audio tags
        $cacheFactory.get('$http').removeAll();
        SOUND_CACHE = [];
        CLIP_CACHE = []; // this might be overkill, but otherwise deleted / renamed clip cache is still accessible
    }

    /**
     * Get a list of folder keys. NOTE: This is very inefficient. Prefer using getDefaultAudioFolders and getUserAudioFolders WS.
     * @return {Promise} A promise that resolves to the list of folder keys.
     */
    function getAudioFolders() {
        var url = URL_DOMAIN + '/services/audio/getaudiokeys?tag=';
        esconsole('Fetching audio folders', ['DEBUG','AUDIOLIBRARY']);
        return $http.get(url, {cache: true})
        .then(function(result) {
            // return only a list of file keys
            var output = [];
            for (var key in result.data.smallAudioFile) {
                var file = result.data.smallAudioFile[key];
                if (file.scope === 0) { continue; }
                var str = file.tags.toUpperCase();
                var tokens = str.split('__');
                // TODO: this token business is confusing
                output.push(tokens[0]);
                output.push(tokens[tokens.length-1]);
                output.push(str.substr(str.indexOf('__')+2, str.length));
            }
            esconsole('Found audio folders', ['DEBUG','AUDIOLIBRARY']);
            return output;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    function getDefaultAudioFolders() {
        var url = URL_DOMAIN + '/services/audio/getdefaultaudiofolders';
        esconsole('Fetching default audio folders', ['DEBUG','AUDIOLIBRARY']);
        return $http.get(url, {cache: true}).then(function(result) {
            esconsole('Found default audio folders', ['DEBUG','AUDIOLIBRARY']);
            return result.data;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    function getUserAudioFolders() {
        var url = URL_DOMAIN + '/services/audio/getuseraudiofolders';
        esconsole('Fetching all the user audio folders', ['DEBUG','AUDIOLIBRARY']);
        return $http.get(url, {cache: true}).then(function(result) {
            esconsole('Found user audio folders', ['DEBUG','AUDIOLIBRARY']);
            return result.data;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    /**
     * Get the list of effect constants.
     *
     * TODO: don't hardcode this list.
     *
     * @returns {Promise} A promise that resolves to the list of effect
     * constants.
     */
    function getEffectTags() {
        esconsole('Fetching effect tags', ['DEBUG','AUDIOLIBRARY']);
        return $q(function(resolve, reject) {
            resolve(JSEffectKeys);
            esconsole('Found effect tags', ['DEBUG','AUDIOLIBRARY']);
        });
    }

    /**
     * Get the list of analysis constants.
     *
     * TODO: don't hardcode this list.
     *
     * @return {Promise} A promise that resolves to the list of analysis
     * constants.
     */
    function getAnalysisTags() {
        esconsole('Fetching analysis tags', ['DEBUG','AUDIOLIBRARY']);
        return $q(function(resolve, reject) {
            resolve(JSAnalysisKeys);
            esconsole('Found analysis tags', ['DEBUG','AUDIOLIBRARY']);
        });
    }

    /**
     * Get a list of all audio/effect/analysis constants. Note: This is highly inefficient. Prefer using the getDefaultTags API.
     * @returns {Promise} A promise that resolves to a list of all EarSketch
     * constants.
     */
    function getAllTags() {
        esconsole('Fetching all tags', ['DEBUG','AUDIOLIBRARY']);
        return $q.all([
            getAudioTags(),
            getEffectTags(),
            getAnalysisTags(),
            getAudioFolders(),
            getUserAudioTags() // All the existing user audio clips
        ]).then(function(result) {
            // wait for all promises to complete and concatenate their results
            esconsole('Fetched all tags.', ['DEBUG','AUDIOLIBRARY']);
            return result[0].concat(result[1], result[2], result[3], result[4]);
        }, function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    /**
     * Get the list of default (fixed) names except for the audio clips (they are retrieved separately). Used for code compilation.
     * @returns {Promise}
     */
    function getDefaultTags() {
        esconsole('Fetching default tags', ['DEBUG','AUDIOLIBRARY']);
        return $q.all([
            getEffectTags(),
            getAnalysisTags(),
            getDefaultAudioFolders(),
            getUserAudioFolders() // TODO: This cannot be cached. Separate it?
        ]).then(function(result) {
            esconsole('Fetched all tags.', ['DEBUG','AUDIOLIBRARY']);
            return result[0].concat(result[1]).concat(result[2]).concat(result[3]);
        }, function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        }).catch(function(err) {
            esconsole(err, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    /**
     * Deprecated. Prefer using getDefaultTagsMetadata and getUserTagsMetadata APIs for better cache control.
     * @param username
     * @returns {Promise}
     */
    function getTagsMetadata(username) {
        esconsole('Fetching tag metadata list for user ' + username,
                  ['DEBUG','AUDIOLIBRARY']);
        var url = URL_DOMAIN + '/services/audio/getaudiotags';
        if (username === undefined) {
            var opts = {cache: false};
        } else {
            var opts = {cache: false, params: {'username': username}};
        }

        return $http.get(url, opts)
        .then(function(result) {
            // return only a list of file keys
            esconsole('Found audio tags', ['DEBUG','AUDIOLIBRARY']);
            SOUND_CACHE = result.data.audioTags;
            return result.data.audioTags;
        }).catch(function(err) {
            esconsole('HTTP status: ' + err.status, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    function getDefaultTagsMetadata() {
        esconsole('Fetching default sounds tag metadata', ['DEBUG','AUDIOLIBRARY']);
        var url = URL_DOMAIN + '/services/audio/getdefaultaudiotags';
        var opts = {cache: true};

        return $http.get(url, opts).then(function(result) {
            esconsole('Found audio tags', ['DEBUG','AUDIOLIBRARY']);
            SOUND_CACHE = result.data;
            return result.data;
        }).catch(function(err) {
            esconsole('HTTP status: ' + err.status, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    function getUserTagsMetadata(username) {
        esconsole('Fetching user sounds tag metadata for ' + username, ['DEBUG','AUDIOLIBRARY']);
        var url = URL_DOMAIN + '/services/audio/getuseraudiotags';
        var opts = {cache: false, params: {'username': username}};

        return $http.get(url, opts).then(function(result) {
            esconsole('Found audio tags', ['DEBUG','AUDIOLIBRARY']);
            SOUND_CACHE = result.data;
            return result.data;
        }).catch(function(err) {
            esconsole('HTTP status: ' + err.status, ['ERROR','AUDIOLIBRARY']);
            throw err;
        });
    }

    function verifyClip(name) {
        esconsole('Verifying the presence of audio clip for ' + name, ['debug','audiolibrary']);
        var url = URL_DOMAIN + '/services/audio/verifyclip';
        var opts = {
            cache: false,
            params: {
                key: name
            }
        };
        return $http.get(url, opts).then(function (result) {
            return result.data.hasOwnProperty('file_key') ? result.data : null;
        });
    }

    function combineCache(defaultTags, userTags) {
        SOUND_CACHE = [];
        if(defaultTags !== null) {
            SOUND_CACHE = SOUND_CACHE.concat(defaultTags);
        }
        if(userTags !== null) {
            SOUND_CACHE = SOUND_CACHE.concat(userTags);
        }
        return SOUND_CACHE;
    }

    function getCache() {
        return SOUND_CACHE;
    }

    function getSampleRate() {
        return ctx.sampleRate;
    }

    return {
        getAudioClip: getAudioClip,
        getAudioTags: getAudioTags,
        getUserAudioTags: getUserAudioTags,
        getAudioFolders: getAudioFolders,
        getEffectTags: getEffectTags,
        getAnalysisTags: getAnalysisTags,
        getAllTags: getAllTags,
        getDefaultTags: getDefaultTags,
        getDefaultTagsMetadata: getDefaultTagsMetadata,
        getUserTagsMetadata: getUserTagsMetadata,
        clearAudioTagCache: clearAudioTagCache,
        cache: SOUND_CACHE,
        getCache: getCache,
        getSampleRate: getSampleRate,
        cacheSlicedClip: cacheSlicedClip,
        verifyClip: verifyClip
    }
}]);
