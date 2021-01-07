//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Student preference module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentPreferenceModule', [ 'caiStudent', function (caiStudent) {

    //var init
    var suggestionsAccepted = 0;
    var suggestionsRejected = 0;

    var codeSuggestionsMade = [];
    var sampleSuggestionsMade = [];

    var numberOfRuns = 3;

    var acceptanceRatio = 0;

    function addSoundSuggestion(suggestionArray) {
        sampleSuggestionsMade.push([numberOfRuns, suggestionArray]);
    }

    function runSound(soundsUsedArray) {
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
        console.log("PREFERENCE CODE SUGGS: ");
        console.log(codeSuggestionsMade);
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
        console.log("PREFERENCE CODE SUGGS: ");
        console.log(codeSuggestionsMade);
    }

    function updateAcceptanceRatio() {
        acceptanceRatio = suggestionsAccepted / (suggestionsAccepted + suggestionsRejected);
        caiStudent.updateModel("preferences", { acceptanceRatio: acceptanceRatio})
    }

    return {
        addSoundSuggestion: addSoundSuggestion,
        runSound: runSound,
        addCodeSuggestion: addCodeSuggestion,
        runCode: runCode
        
    };

}]);
