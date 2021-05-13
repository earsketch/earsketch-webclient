import {CAI_DELTA_LIBRARY, CAI_RECOMMENDATIONS, CAI_NUCLEI} from 'codeRecommendations';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('codeSuggestion', ['caiAnalysisModule', 'complexityCalculator', 'caiProjectModel', function (caiAnalysisModule, complexityCalculator, caiProjectModel) {

    var currentDelta = { soundsAdded: [], sections: 0 };
    var currentDeltaSum = 0;
    var noDeltaCount = 0;
    var currentResults = {};
    var averageGenreThreshold = .8;
    var musicResults = {};
    var genreListCurrent = [];
    var currentEffects = [];
    var sectionLines = [];
    var CAI_DICT = {};
    var possibleDeltaSuggs = [];

    var storedHistory;

    var CAI_REC_DECISION_TREE = [
        {
            node: 0,
            condition: function () {
                // "is code empty?"
                var resKeys = Object.keys(currentResults);
                var total = 0;
                for (var i in resKeys) {
                    total += currentResults[resKeys[i]];
                }

                if (total !== 1 && total !== 0) {
                    return false;
                }
                else {
                    if (currentResults["ints"] === 1) {
                        return true;
                    }
                    else { 
                      return false;
                    }
                }

            },
            yes: 1,
            no: 2,
        },
        {
            node: 1,
            suggestion: 29
        },
        {
            node: 2,
            condition: function () {
                //"is music empty?"
                //empty implies there is no music.
                if (!isEmpty(musicResults)) {
                    if (musicResults.OVERVIEW !== null && musicResults.OVERVIEW.measures === 0) {
                      return true;
                    }
                }
                else {
                    return false;
                }

            },
            yes: 4,
            no: 3
        },
        {
            node: 3,
            condition: function () {
                //is there a delta?
                return Math.abs(currentDeltaSum) > 0;
            },
            yes: 5,
            no: 6
        },
        {
            node: 4,
            suggestion: 29
        },
        {
            node: 5,
            condition: function () {
                var deltaInLib = false;
                possibleDeltaSuggs = [];
                for (var i in CAI_DELTA_LIBRARY) {
                    //get current value and compare to end value
                    var endValuesMatch = true;
                    for (var j in CAI_DELTA_LIBRARY[i].end) {
                        if (CAI_DELTA_LIBRARY[i].end[j] !== results[j]) {
                            endValuesMatch = false;
                        }
                    }
                    var startValuesMatch = true;
                    if (endValuesMatch) {
                        for (var j in CAI_DELTA_LIBRARY[i].start) {
                            if (CAI_DELTA_LIBRARY[i].start[j] !== (results[j] - currentDelta[j])) {
                                startValuesMatch = false;
                            }
                        }
                    }
                    if (endValuesMatch && startValuesMatch) {
                        deltaInLib = true;
                        possibleDeltaSuggs.push(CAI_DELTA_LIBRARY[i]);
                    }
                }
                return deltaInLib;
            },
            yes: 9,
            no: 11
        },
        {
            node: 6,
            condition: function () {
                return noDeltaCount > 2;
            },
            yes: 37,
            no: 8
        },
        {
            node: 7,
            suggestion: 1
        },
        {
            node: 8,
            suggestion: 2
        },
        {
            node: 9,
            condition: function(){
              //has the delta suggestion already been made?

                var deltaInLib = false;
                possibleDeltaSuggs = [];
                for (var i in CAI_DELTA_LIBRARY) {
                    //get current value and compare to end value
                    var endValuesMatch = true;
                    for (var j in CAI_DELTA_LIBRARY[i].end) {
                        if (CAI_DELTA_LIBRARY[i].end[j] !== results[j]) {
                            endValuesMatch = false;
                        }
                    }
                    var startValuesMatch = true;
                    if (endValuesMatch) {
                        for (var j in CAI_DELTA_LIBRARY[i].start) {
                            if (CAI_DELTA_LIBRARY[i].start[j] !== (results[j] - currentDelta[j])) {
                                startValuesMatch = false;
                            }
                        }
                    }
                    if (endValuesMatch && startValuesMatch) {
                        possibleDeltaSuggs.push(CAI_DELTA_LIBRARY[i]);
                    }
                }
                var sugg = possibleDeltaSuggs[0].id;
                for (var i in storedHistory) {
                    if (storedHistory[i][0] === 34) {
                        if (storedHistory[i][1][0][1] === sugg) {
                            return true;
                        }
                    }
                }
                return false;
            },
            yes: 11,
            no: 10
        },
        {
            node: 10,
            suggestion: 6

        },
        {
            node: 11,
            condition: function () {
                return currentDelta.sections > 0;
            },
            yes: 13,
            no: 27

        },
        {
            node: 12,
            condition: function () {
                if (!isEmpty(currentResults)) {
                    if (currentResults.userFunc !== null && currentResults.userFunc < 2) {
                        return true;
                    }
                }
                return false;
            },
            yes: 13,
            no: 14
        },
        {
            node: 13,
            condition: function () {
                if (!isEmpty(musicResults)) {
                    if (musicResults.SOUNDPROFILE !== null) {
                        var keys = Object.keys(musicResults.SOUNDPROFILE);
                        for (var i in keys) {
                            if (keys[i].includes("'")) {
                                return true;
                            }
                        }
                        return false;
                    }
                }
                else {
                    return false;
                }
            },
            yes: 16,
            no: 15
        },
        {
            node: 14,
            condition: function () {
                if (!isEmpty(currentResults) && currentResults.userFunc !== null && currentResults.userFunc < 2) {
                    return true;
                }
                return false;
            },
            yes: 22,
            no: 21
        },
        {
            node: 15,
            condition: function () {
                if (!isEmpty(currentResults) && currentResults.userFunc !== null && currentResults.userFunc > 3) {
                    return true;
                }
                return false;
            },
            yes: 18,
            no: 17
        },
        {
            node: 16,
            suggestion: 31
        },
        {
            node: 17,
            suggestion: 7
        },
        {
            node: 18,
            condition: function () {
                for (var i in sectionLines) {
                    var dictLine = CAI_DICT[Number.parseInt(sectionLines[i]) - 1];
                    if ('userFunction' in dictLine) {
                        return true;
                    }
                }
                return false;
            },
            yes: 19,
            no: 20
        },
        {
            node: 19,
            suggestion: 32
        },
        {
            node: 20,
            suggestion: 65
        },
        {
            node: 21,
            condition: function () {
                if (!isEmpty(currentResults) && currentResults.forLoops !== null && currentResults.forLoops > 2) {
                    return true;
                }
                return false;
            },
            yes: 24,
            no: 23
        },
        {
            node: 22,
            condition: function () {
                for (var i in sectionLines) {
                   var dictLine = CAI_DICT[Number.parseInt(sectionLines[i]) - 1];
                    if ('userFunction' in dictLine) {
                        return true;
                    }
                }
                return false;
            },
            yes: 25,
            no: 26
        },
        {
            node: 23,
            suggestion: 66
        },
        {
            node: 24,
            suggestion: 5
        },
        {
            node: 25,
            suggestion: 8
        },
        {
            node: 26,
            suggestion: 18
        },
        {
            node: 27,
            condition: function(){
                //is there a code complexity goal?
                var comp = caiProjectModel.getModel()['code structure'];
                return comp.length > 0;
            },
            yes: 35,
            no: 28
        },
        {
            node: 28,
            condition: function () {
                //note if any effects are added or changed
                var newEffects = [];
                for (var i in musicResults.APICALLS) {
                    if (musicResults.APICALLS[i].function === "setEffect") {
                        newEffects.push(musicResults.APICALLS[i].args);
                    }
                }
                if (newEffects.length > currentEffects.length) { //effect added
                    return true;
                }
                for (var i in newEffects) {
                    //does something with the exact same args exist in the current effects?
                    var exactMatch = false;
                    for (var j in currentEffects) {
                        var argsMatch = true;
                        for (var p in newEffects[i]) {
                            if (!(p in currentEffects[j])) {
                                argsMatch = false;
                                break;
                            }
                            else if (newEffects[i][p] !== currentEffects[j][p]) {
                                argsMatch = false;
                            }
                        }
                        if (argsMatch) {
                            exactMatch = true;
                        }
                    }
                    if (!exactMatch) {
                        return true;
                    }
                }
                return false;
            },
            yes: 29,
            no:31
        },
        {
            node: 29,
            condition: function () {
                //envelope usage
                var newEffects = [];
                for (var i in musicResults.APICALLS) {
                    if (musicResults.APICALLS[i].function === "setEffect") {
                        newEffects.push(musicResults.APICALLS[i].args);
                    }
                }
                for (var i in newEffects) {
                    if (newEffects[i].length > 3) {
                        return true;
                    }
                }
                return false;
            },
            yes: 30,
            no: 32
        },
        {
            node: 30,
            condition: function () {
                //high section similarity?
                if(isEmpty(musicResults)){
                    return false;
                }
                var sectionKeys = Object.keys(musicResults.SOUNDPROFILE);
                for (var i in sectionKeys) {
                    if (sectionKeys[i].includes("'")) {
                        return true;
                    }
                }
                return false;
            },
            yes: 34,
            no: 33
        },
        {
            node: 31,
            suggestion: 68
        },
        {
            node: 32,
            suggestion: 15
        },
        {
            node: 33,
            suggestion: 2
        },
        {
            node: 34,
            suggestion: 68
        },
        {
            node: 35,
            suggestion: 11
        },
        {
            node: 36,
            suggestion: 67
        },
        {
            node: 37,
            condition: function() {
                //is there an unmet form goal?
                //first, is there a form goal?
                if (caiProjectModel.getModel()['form'].length === 0) {
                    return false;
                }
                var projectFormGoal = caiProjectModel.getModel()['form'][0];
                //what is the current form?
                var currentForm = ""
                if (!isEmpty(musicResults)) {
                    var sectionKeys = Object.keys(musicResults.SOUNDPROFILE);
                    for (var i in sectionKeys) {
                        currentForm += sectionKeys[i][0];
                    }
                    if (projectFormGoal.startsWith(currentForm) && projectFormGoal !== currentForm) {
                        var nextSection = projectFormGoal.substring(currentForm.length, currentForm.length + 1);
                        if (!currentForm.includes(nextSection)) {
                            return true;
                        }
                    }
                    else {
                        return false;
                    }
                }
                else {
                  return false;
                }
            },
            yes:36,
            no: 7
        },
        {
            node: 38,
            suggestion: 66
        }

    ];

    var currentLineDict = {};
    var suggestionTypes = ["augmentation", "modification", "organization"];
    var currentSections;
    var currentSounds = [];
    var currentResults = {};
    var currentDelta = {};

    function isEmpty(dict) {
      return Object.keys(dict).length === 0;
    }

    /**
    * Returns a random integer between min (inclusive) and max (inclusive).
    * The value is no lower than min (or the next integer greater than min
    * if min isn't an integer) and no greater than max (or the next integer
    * lower than max if max isn't an integer).
    * Using Math.round() will give you a non-uniform distribution!
    */
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getSuggestionByID(suggID) {
        for (var i in CAI_RECOMMENDATIONS) {
            if (CAI_RECOMMENDATIONS[i].id === suggID) {
                var suggestion = Object.assign({}, CAI_RECOMMENDATIONS[i]);
                return suggestion;
            }
        }
    }

    function getMusic() {
        return musicResults;
    }

    function getSoundsFromProfile(measureView) {
        var soundTally = [];

        for (var i in measureView) {
            for (var j in measureView[i]) {
                if (measureView[i][j].type === "sound") {
                    soundTally.push(measureView[i][j].name);
                }
            }
        }

        return soundTally;
    }

    function generateCodeSuggestion(topics, history) {

        var nodeIndex = 0;
        while ('condition' in CAI_REC_DECISION_TREE[nodeIndex]) {
            //traverse the tree
            if (CAI_REC_DECISION_TREE[nodeIndex].condition()) {
                nodeIndex = CAI_REC_DECISION_TREE[nodeIndex].yes;
            }
            else {
                nodeIndex = CAI_REC_DECISION_TREE[nodeIndex].no;
            }
        }


        //update effects
        currentEffects = [];
        for (var i in musicResults.APICALLS) {
            if (musicResults.APICALLS[i].function === "setEffect") {
                currentEffects.push(musicResults.APICALLS[i].args);
            }
        }

        genreListCurrent = musicResults.GENRE;

        var isNew = true;;
        for (var i in history) {
            //get utterance
            if (history[i].length > 1) {
                if (Array.isArray(history[i][1])) {
                    for (var j in history[i][1]) {
                        if (history[i][1][j][0] === "SUGGESTION") {
                            if (history[i][1][j][1] === CAI_REC_DECISION_TREE[nodeIndex].suggestion) {
                                isNew = false;
                            }
                        }
                    }
                }

            }

        }

        var sugg = {};

        if (isNew) {

            sugg = getSuggestionByID(CAI_REC_DECISION_TREE[nodeIndex].suggestion);
        }
        else {
            sugg = Object.assign({utterance: "", explain: "", example: ""});
            sugg = randomNucleus(history);
        }




        if (sugg.utterance === "[DELTALOOKUP]") {
            sugg = Object.assign({}, sugg);
            sugg = deltaSugg();
            //if cai already suggested this, return empty
            for (var i in history) {
                if (history[i][0] === 34) {
                    var oldUtterance = history[i][1][0][1];
                    if (sugg.id === oldUtterance) {
                        sugg.utterance = "";
                        return sugg;
                    }
                }
            }

        }
        if (sugg.utterance === "[NUCLEUS]") {
            sugg = Object.assign({}, sugg);
            sugg = randomNucleus(history);

        }
        return sugg;

    }

    function storeHistory(historyList){
        storedHistory = historyList;
    }


    function randomNucleus(history, suppressRepetition = true) {
        var isAlreadySaid = true;
        var newNucleus = "";
        var threshold = 10;

        while (isAlreadySaid) {
            threshold -= 1;
            if (threshold < 0) {
                return {utterance: ""}; // "I don't have any suggestions right now. if you add something, i can work off that.";
            }
            newNucleus = CAI_NUCLEI[getRandomInt(0, CAI_NUCLEI.length - 1)];
            isAlreadySaid = false;
            if(suppressRepetition){
              for (var i in history) {
                  //get utterance
                  if (history[i].length > 1) {
                      for (var j in history[i][1]) {
                          var oldUtterance = history[i][1][j][1];
                          if (oldUtterance !== null && oldUtterance === newNucleus.id) {
                              isAlreadySaid = true;
                          }
                      }
                  }
              }
           }
        }

        return newNucleus;
    }

    function generateResults(text, lang) {


        var results = null;

        try {
            results = caiAnalysisModule.analyzeCode(lang, text);
        }
        catch (e) { //default value
            results = {
                userFunc: 0,
                conditionals: 0,
                forLoops: 0,
                lists: 0,
                strings: 0,
                ints: 0,
                floats: 0,
                booleans: 0,
                variables: 0,
                listOps: 0,
                strOps: 0,
                boolOps: 0,
                comparisons: 0,
                mathematicalOperators: 0,
                consoleInput: 0
            };
        }

        // CAI_DICT = [];
        try {
            CAI_DICT = complexityCalculator.lineDict();
        }
        catch (e) {
            CAI_DICT = [];
        }

        musicResults = caiAnalysisModule.getReport();

        //if we have stored results already and nothing's changed, use thos
        var validChange = true;
        var allZeros = true;
        var keys = Object.keys(results);
        var totalScore = 0;
        var somethingChanged = false;

        if (!isEmpty(currentResults)) {

            if (currentResults["userFunc"] === "Args" || currentResults["userFunc"] === "Returns") {
                currentResults["userFunc"] = 3;
            }
            else if (currentResults["userFunc"] === "ReturnAndArgs") {
                currentResults["userFunc"] = 4;
            }

            if (results["userFunc"] === "Args" || results["userFunc"] === "Returns") {
                results["userFunc"] = 3;
            }
            else if (results["userFunc"] === "ReturnAndArgs") {
                results["userFunc"] = 4;
            }

            for (var i in keys) {
                if (results[keys[i]] !== 0) {
                    allZeros = false;
                }
                if (!isEmpty(currentResults)) {
                    totalScore += currentResults[keys[i]];
                }
                if (results[keys[i]] !== currentResults[keys[i]]) {
                    somethingChanged = true;
                }
            }
            if (allZeros && totalScore > 0) {
                validChange = false;
            }

            var prevScore = 0;
            if (!isEmpty(currentResults)) {
                for (var i in keys) {
                    prevScore += currentResults[keys[i]];
                }
            }

            //calculate the delta
            if (validChange && prevScore > 0 && somethingChanged) {
                var codeDelta = Object.assign({}, results);
                var keys = Object.keys(codeDelta);
                for (var i in keys) {
                    codeDelta[keys[i]] -= currentResults[keys[i]];
                }
                currentDelta = Object.assign({}, codeDelta);
            }
        }


        //do the music delta
        if (!isEmpty(currentResults) && !isEmpty(musicResults)) {
          if (!isEmpty(musicResults.SOUNDPROFILE)) {
            currentDelta.sections = Object.keys(musicResults.SOUNDPROFILE).length - currentSections;
          }
        }

        if (isEmpty(musicResults)) {
            currentSections = 0;
            currentDelta.sections = 0;
        }
        else {
            if (isEmpty(musicResults.SOUNDPROFILE)) {
              currentSections = 0;
              currentDelta.sections = 0;
            }
            else {
              currentSections = Object.keys(musicResults.SOUNDPROFILE).length;
            }
        }

        if (Object.keys(currentResults).length === 0) {
            currentDelta.sections = 0;
        }

        sectionLines = [];
        for (var i in musicResults.SOUNDPROFILE) {
            var lines = caiAnalysisModule.soundProfileLookup(musicResults.SOUNDPROFILE, "section", i, "line");
            for (var j in lines) {
                sectionLines.push(lines[j]);
            }
        }


        //sounds added and removed
        var newSounds = getSoundsFromProfile(musicResults.MEASUREVIEW);
        var soundsAdded = [];
        var soundsRemoved = [];

        if (currentSounds.length > 0) {
            for (var i in newSounds) {
                if (!currentSounds.includes(newSounds[i]) && !soundsAdded.includes(newSounds[i])) {
                    soundsAdded.push(newSounds[i]);
                }
            }

            for (var i in currentSounds) {
                if (!newSounds.includes(newSounds[i]) && !soundsRemoved.includes(currentSounds[i])) {
                    soundsRemoved.push(newSounds[i]);
                }
            }

        }

        currentSounds = newSounds.slice(0);
        currentDelta.soundsAdded = soundsAdded.slice(0);
        currentDelta.soundsRemoved = soundsRemoved.slice(0);

        currentDeltaSum = 0;
        if (!isEmpty(currentResults)) {
            for (var i in currentDelta) {
                if (typeof currentDelta[i] === 'number') {
                    currentDeltaSum += currentDelta[i];
                }

            }
            currentDeltaSum += currentDelta.soundsAdded.length;
            currentDeltaSum += currentDelta.soundsRemoved.length;
        }

        //delta sum zero check
        if (currentDeltaSum === 0) {
            noDeltaCount += 1;
        }
        else {
            noDeltaCount = 0;
        }

        if (!isEmpty(currentResults) || validChange) {
            currentResults = results;
            currentLineDict = CAI_DICT;
        }


        if (!isEmpty(currentResults)) {
          if (currentResults["userFunc"] === "Args" || currentResults["userFunc"] === "Returns") {
              currentResults["userFunc"] = 3;
          }
          else if (currentResults["userFunc"] === "ReturnAndArgs") {
              currentResults["userFunc"] = 4;
          }
        }

    }

    function deltaSugg() {
        var deltaInd = getRandomInt(0, possibleDeltaSuggs.length - 1);
        return possibleDeltaSuggs[deltaInd];
    }

    return {

        generateCodeSuggestion: generateCodeSuggestion,
        generateResults: generateResults,
        randomNucleus: randomNucleus,
        getMusic: getMusic,
        storeHistory: storeHistory
    };

}]);
