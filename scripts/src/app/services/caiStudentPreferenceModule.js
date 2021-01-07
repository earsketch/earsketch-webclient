//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Student preference module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentPreferenceModule', [ 'caiStudent', function (caiStudent) {

    var suggestionsAccepted = 0;
    var suggestionsRejected = 0;

    var codeSuggestionsMade = [];
    var sampleSuggestionsMade = [];

    var numberOfRuns = 3;

    var acceptanceRatio = 0;

    function addSoundSuggestion(suggestionArray) {

    }

    function runSound(soundsUsedArray) {

    }

    function addCodeSuggestion(complexityObj) {

    }

    function runCode() {

    }

    function updateAcceptanceRatio(acceptBoolean) {
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
