//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Student preference module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentPreferenceModule', ['caiStudent', function (caiStudent) {

    //var init
    var suggestionsAccepted = 0;
    var suggestionsRejected = 0;

    var allSoundsSuggested = [];
    var allSoundsUsed = [];
    var soundsSuggestedAndUsed = []
    var currentSoundSuggestionsPresent = [];
    var soundsContributedByStudent = [];

    var codeSuggestionsMade = [];
    var sampleSuggestionsMade = [];

    var numberOfRuns = 3;

    var acceptanceRatio = 0;

    function updateHistoricalArrays(currentSounds) {


        //update historical list of all sound suggestions
        for (var i = 0; i < sampleSuggestionsMade.length; i++) {
            for (var j = 0; j < sampleSuggestionsMade[i][1].length; j++) {
                if (!allSoundsSuggested.includes(sampleSuggestionsMade[i][1][j])) {
                    allSoundsSuggested.push(sampleSuggestionsMade[i][1][j]);
                }
            }
        }

        //update historical list of all sounds used
        if (currentSounds != null) {
            for (var i = 0; i < currentSounds.length; i++) {
                if (!allSoundsUsed.includes(currentSounds[i])) {
                    allSoundsUsed.push(currentSounds[i]);
                }
            }
        }

        //update historical list of sound suggestions used
        for (var i = 0; i < allSoundsUsed.length; i++) {
            if (allSoundsSuggested.includes(allSoundsUsed[i]) && !soundsSuggestedAndUsed.includes(allSoundsUsed[i]) && !soundsContributedByStudent.includes(allSoundsUsed[i])) {
                soundsSuggestedAndUsed.push(allSoundsUsed[i]);
            }
        }


        //if current sounds passed, update "currently used suggestions" list
        if (currentSounds != null) {
            var newCurrentSuggs = [];
            for (var i = 0; i < currentSoundSuggestionsPresent.length; i++) {
                if (currentSounds.includes(currentSoundSuggestionsPresent[i])) {
                    newCurrentSuggs.push(currentSoundSuggestionsPresent[i])
                }
            }

            for (var i = 0; i < currentSounds.length; i++) {
                if (allSoundsSuggested.includes(currentSounds[i]) && !newCurrentSuggs.includes(currentSounds[i])) {
                    newCurrentSuggs.push(currentSounds[i]);
                }
            }

            currentSoundSuggestionsPresent = newCurrentSuggs.slice(0);
        }

        if (currentSounds != null) {
            for (var i = 0; i < currentSounds.length; i++) {
                if (!allSoundsSuggested.includes(currentSounds[i]) && !soundsContributedByStudent.includes(currentSounds[i])) {
                    soundsContributedByStudent.push(currentSounds[i]);
                }
            }
        }

        //push this set of lists to the student model

        var suggestionTracker = { allSuggestionsUsed: soundsSuggestedAndUsed, suggestionsCurrentlyUsed: currentSoundSuggestionsPresent, soundsContributedByStudent: soundsContributedByStudent };

        caiStudent.updateModel("preferences", { suggestionUse: suggestionTracker });

    }

    function addSoundSuggestion(suggestionArray) {
        sampleSuggestionsMade.push([numberOfRuns, suggestionArray]);
        updateHistoricalArrays();
    }

    function runSound(soundsUsedArray) {

        updateHistoricalArrays(soundsUsedArray);

        var newArray = [];
        for (var i = 0; i < sampleSuggestionsMade.length; i++) {

            var wasUsed = false;

            //were any of the sounds used?
            for (var j = 0; j < soundsUsedArray.length; j++) {
                if (sampleSuggestionsMade[i][1].includes(soundsUsedArray[j])) {
                    wasUsed = true;
                    break;
                }
            }

            //decrement
            sampleSuggestionsMade[i][0] -= 1;

            //if 0, add to the rejection category and delete the item
            if (wasUsed) {
                suggestionsAccepted += 1;
                updateAcceptanceRatio();
            }
            else {
                if (sampleSuggestionsMade[i][0] == 0) {
                    suggestionsRejected += 1;
                    updateAcceptanceRatio();
                }
                else {
                    newArray.push(sampleSuggestionsMade[i].slice(0));
                }
            }
        }

        sampleSuggestionsMade = newArray.slice(0);

    }

    function addCodeSuggestion(complexityObj) {
        codeSuggestionsMade.push([numberOfRuns, complexityObj]);
    }

    function runCode(complexityOutput) {
        var newArray = [];
        for (var i = 0; i < codeSuggestionsMade.length; i++) {

            var wasUsed = true;

            //were any reqs readched?
            var keys = Object.keys(codeSuggestionsMade[i][1]);

            for (var j = 0; j < keys.length; j++) {
                if (complexityOutput[keys[j]] < codeSuggestionsMade[i][1][keys[j]]) {
                    wasUsed = false;
                }
            }

            //decrement
            codeSuggestionsMade[i][0] -= 1;

            //if 0, add to the rejection category and delete the item
            if (wasUsed) {
                suggestionsAccepted += 1;
                updateAcceptanceRatio();
            }
            else {
                if (codeSuggestionsMade[i][0] == 0) {
                    suggestionsRejected += 1;
                    updateAcceptanceRatio();
                }
                else {
                    newArray.push(codeSuggestionsMade[i].slice(0));
                }
            }
        }

        codeSuggestionsMade = newArray.slice(0);
    }

    function updateAcceptanceRatio() {
        acceptanceRatio = suggestionsAccepted / (suggestionsAccepted + suggestionsRejected);
        caiStudent.updateModel("preferences", { acceptanceRatio: acceptanceRatio })
    }

    return {
        addSoundSuggestion: addSoundSuggestion,
        runSound: runSound,
        addCodeSuggestion: addCodeSuggestion,
        runCode: runCode

    };

}]);
