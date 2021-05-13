import {NUMBERS_AUDIOKEYS} from 'numbersAudiokeys';
import {AUDIOKEYS_RECOMMENDATIONS} from 'audiokeysRecommendations';
/**
 * Autograder addition to main ES live testing.
 *
 * @author Jason Smith
 */
app.factory('recommender', function () {

    var keyGenreDict = {};
    var keyInstrumentDict = {};

    function setKeyDict(genre, instrument) {
        keyGenreDict = genre;
        keyInstrumentDict = instrument;

        AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS).filter(function(key) {
            return Object.keys(keyGenreDict).includes(key);
        });
    }

    function getKeyDict(type) {
        if (type === 'genre') {
            return keyGenreDict;
        }
        else if (type === 'insturment') {
            return keyInstrumentDict;
        }
        else {
            return null;
        }
    }

	// Load lists of numbers and keys
    var AUDIOKEYS = Object.values(NUMBERS_AUDIOKEYS);

    function addRecInput(recInput, script) {
        // Generate list of input samples
        if (script) {
            var lines = script.source_code.split('\n');
            for (var line = 0; line < lines.length; line++) {
                for (var idx = 0; idx < AUDIOKEYS.length; idx++) {
                    var name = AUDIOKEYS[idx];
                    // exclude makebeat
                    if (name.slice(0, 3) !== 'OS_') {
                        if (lines[line].includes(name) && !recInput.includes(name)) {
                            // exclude comments
                            if (lines[line].indexOf('#') === -1 || lines[line].indexOf(name) < lines[line].indexOf('#')) {
                                recInput.push(name);
                            }
                        }
                    }
                }
            }
        }
        return recInput;
    }


    function addRandomRecInput(recInput) {
        var name = null;
        while(!AUDIOKEYS.includes(name)) {
            name = AUDIOKEYS[Math.floor(Math.random()*AUDIOKEYS.length)];
            if (!recInput.includes(name))
                recInput.push(name)
        }
        return recInput;
    }

    function findGenreInstrumentCombinations(genreLimit = [], instrumentLimit = []) {
        var sounds = [];
        for (var key in keyGenreDict) {
            var genre = keyGenreDict[key];
            if (genreLimit.length === 0 || keyGenreDict === null || genreLimit.includes(genre)) {
                if (key in keyInstrumentDict) {
                    var instrument = keyInstrumentDict[key];
                    if (instrumentLimit.length === 0 || keyInstrumentDict === null || instrumentLimit.includes(instrument)) {
                        sounds.push(key);
                    }
                }
            }
        }
        return sounds;
    }


    function recommend(recommendedSounds, inputSamples, coUsage, similarity, genreLimit = [], instrumentLimit = [], previousRecommendations = [], bestLimit = 3) {
        var recs = generateRecommendations(inputSamples, coUsage, similarity);
        var filteredRecs = [];

        if (Object.keys(recs).length === 0) {
            recs = generateRecommendations([addRandomRecInput(), addRandomRecInput(), addRandomRecInput()], coUsage, similarity);
        }

        if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
            previousRecommendations = [];
        }

        filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit, previousRecommendations, bestLimit);
        return filteredRecs;
    }


    function recommendReverse(recommendedSounds, inputSamples, coUsage, similarity, genreLimit = [], instrumentLimit = [], previousRecommendations = [], bestLimit = 3) {
        var filteredRecs = [];

        if (previousRecommendations.length === Object.keys(keyGenreDict).length) {
            previousRecommendations = [];
        }

        while (filteredRecs.length < bestLimit) {
            var recs = {};
            var outputs = findGenreInstrumentCombinations(genreLimit, instrumentLimit);
            var filteredRecs = [];
            for (var i in outputs) {
                var outputRecs = generateRecommendations([outputs[i]], coUsage, similarity);
                if (!(outputs[i] in recs)) {
                    recs[outputs[i]] = 0;
                }
                for (var key in outputRecs) {
                    if (inputSamples.length === 0 || inputSamples.includes(key)) {
                        recs[outputs[i]] = recs[outputs[i]] + outputRecs[key];
                    }
                }
            }
            filteredRecs = filterRecommendations(recs, recommendedSounds, inputSamples, [], [], previousRecommendations, bestLimit);
            if (genreLimit.length > 0) {
                genreLimit.pop();
            }
            else if (instrumentLimit.length > 0) {
                instrumentLimit.pop();
            }
            else {
                return filteredRecs;
            }
        }
        return filteredRecs;
    }


    function generateRecommendations(inputSamples, coUsage, similarity) {

        // Co-usage and similarity for alternate recommendation types: 1 - maximize, -1 - minimize, 0 - ignore.
        coUsage = Math.sign(coUsage);
        similarity = Math.sign(similarity);

        // Generate recommendations for each input sample and add together
        var recs = {};
        for (var idx = 0; idx < inputSamples.length; idx++) {
            var audioNumber = Object.keys(NUMBERS_AUDIOKEYS).find(n => NUMBERS_AUDIOKEYS[n] === inputSamples[idx]);
            if (audioNumber !== undefined) {
                var audioRec = AUDIOKEYS_RECOMMENDATIONS[String(audioNumber)];
                for (var num in audioRec) {
                    if (!audioRec.hasOwnProperty(num)) {
                        throw new Error('Error enumerating the recommendation audioKeys');
                    }
                    var value = audioRec[num];
                    var valA = value[0];
                    var valB = value[1];
                    var valC = value[2];

                    var full_val = valA + coUsage * valB + similarity * valC;

                    var key = NUMBERS_AUDIOKEYS[num];

                    if (Object.keys(recs).includes(key))
                        recs[key] = (full_val + recs[key]) / 1.41;
                    else
                        recs[key] = full_val;
                }
            }
        }

        return recs;
    }


    function filterRecommendations(inputRecs, recommendedSounds, inputSamples, genreLimit, instrumentLimit, previousRecommendations, bestLimit) {

        var recs = {};

        for (var key in inputRecs) {
            if (!recommendedSounds.includes(key) && !inputSamples.includes(key) && !previousRecommendations.includes(key) && key.slice(0,3) !== 'OS_') {
                recs[key] = inputRecs[key]
            }
        }

        if (inputSamples.length > 0) {
            var i = 0;
            while (i < bestLimit) {
                var maxScore = _.max(Object.values(recs), function (o) { return recs[o]; }); 
                var maxRecs = [];
                for (var key in recs) {
                    if (recs[key] === maxScore) {
                        maxRecs.push(key);
                    }
                }
                var maxRec = maxRecs[Math.floor(Math.random() * maxRecs.length)];

                if (maxRec === -Infinity || maxRec === undefined) {
                    return recommendedSounds;
                }

                if (genreLimit.length === 0 || keyGenreDict === null || genreLimit.includes(keyGenreDict[maxRec])) {
                    var s = keyInstrumentDict[maxRec];
                    if (instrumentLimit.length === 0 || keyInstrumentDict === null || instrumentLimit.includes(s)) {
                        if (!previousRecommendations.includes(maxRec)) {
                            recommendedSounds.push(maxRec);
                            i += 1;
                        }
                    }
                }
                delete recs[maxRec];
            }
        }
        return recommendedSounds;
    }


    function genreRecommendations(recs) {
        var genres = [];

        Object.keys(recs).forEach(function(rec) {
            var genre = keyGenreDict[rec];
            if (!genres.includes(genre))
                genres.push(genre);
        });

        return genres;
    }

    function instrumentRecommendations(recs) {
        var instruments = [];

        Object.keys(recs).forEach(function(rec) {
            var instrument = keyInstrumentDict[rec];
            if (!instruments.includes(instrument))
                instruments.push(instrument);
        });

        return instruments;
    }

    function availableGenres() {
        var genres = [];
        for (var idx = 0; idx < AUDIOKEYS.length; idx++) {
            var name = AUDIOKEYS[idx];
            var genre = keyGenreDict[name];
            if (!genres.includes(genre) && genre !== undefined && genre !== "MAKEBEAT")
                genres.push(genre);
        }
        return genres;
    }

    function availableInstruments() {
        var instruments = [];
        for (var idx = 0; idx < AUDIOKEYS.length; idx++) {
            var name = AUDIOKEYS[idx];
            var instrument = keyInstrumentDict[name];
            if (!instruments.includes(instrument) && instrument !== undefined)
                instruments.push(instrument);
        }
        return instruments;
    }


  return {
  	recommend: recommend,
    generateRecommendations: generateRecommendations,
    filterRecommendations: filterRecommendations,
  	addRecInput: addRecInput,
    addRandomRecInput: addRandomRecInput,
    setKeyDict: setKeyDict,
    getKeyDict: getKeyDict,
    genreRecommendations: genreRecommendations,
    instrumentRecommendations: instrumentRecommendations,
    availableGenres: availableGenres,
    availableInstruments: availableInstruments,
    findGenreInstrumentCombinations: findGenreInstrumentCombinations,
    recommendReverse: recommendReverse
  };

});

