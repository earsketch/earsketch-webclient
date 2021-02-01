import {NUMBERS_AUDIOKEYS} from 'numbersAudiokeys';
import {AUDIOKEYS_RECOMMENDATIONS} from 'audiokeysRecommendations';
/**
 * Autograder addition to main ES live testing.
 *
 * @author Jason Smith
 */
app.factory('recommender', ['esconsole', 'reader', function (esconsole, reader) {

    var keyGenreDict = {};
    var keyInstrumentDict = {};

    function setKeyDict(genre, instrument) {
        keyGenreDict = genre;
        keyInstrumentDict = instrument;
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
    };


    function addRandomRecInput(recInput) {
        var name = null;
        while(!AUDIOKEYS.includes(name)) {
            name = AUDIOKEYS[Math.floor(Math.random()*AUDIOKEYS.length)];
            if (!recInput.includes(name))
                recInput.push(name)
        }
        return recInput;
    }


    function recommend(recommendedSounds, inputSamples, coUsage, similarity, genreLimit = [null], instrumentLimit = [null], previousRecommendations = [], bestLimit = 3) {
        var recs = generateRecommendations(recommendedSounds, inputSamples, coUsage, similarity);
        return filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit, previousRecommendations, bestLimit);
    };


    function generateRecommendations(recommendedSounds, inputSamples, coUsage, similarity) {

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
    };


    function filterRecommendations(recs, recommendedSounds, inputSamples, genreLimit, instrumentLimit, previousRecommendations, bestLimit) {

        if (inputSamples.length > 0) {
            var i = 0;
            while (i < bestLimit) {
                var maxRec = _.max(Object.keys(recs), function (o) { return recs[o]; });

                if (maxRec === -Infinity || maxRec === undefined) {
                    break;
                }

                if (!recommendedSounds.includes(maxRec) && !inputSamples.includes(maxRec) && maxRec.slice(0,3) !== 'OS_') {
                    if (genreLimit[0] == null || keyGenreDict == null || genreLimit.includes(keyGenreDict[maxRec])) {
                        var s = keyInstrumentDict[maxRec];
                        if (instrumentLimit[0] == null || keyInstrumentDict == null || instrumentLimit.includes(s)) {
                            if (!previousRecommendations.includes(maxRec)) {
                                recommendedSounds.push(maxRec);
                                i += 1;
                            }
                        }
                    }
                }
                delete recs[maxRec];
            }
        }
        return recommendedSounds;
    };


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


  return {
  	recommend: recommend,
    generateRecommendations: generateRecommendations,
    filterRecommendations: filterRecommendations,
  	addRecInput: addRecInput,
    addRandomRecInput: addRandomRecInput,
    setKeyDict: setKeyDict,
    genreRecommendations: genreRecommendations,
    instrumentRecommendations: instrumentRecommendations
  };

}]);

