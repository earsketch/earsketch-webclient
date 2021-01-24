//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';

import { parseString } from "xml2js";

/**
 * Student preference module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentPreferenceModule', ['caiStudent', 'userProject', function (caiStudent, userProject) {

    //var init
    var suggestionsAccepted = 0;
    var suggestionsRejected = 0;

    var allSoundsSuggested = [];
    var allSoundsUsed = [];
    var soundsSuggestedAndUsed = []
    var currentSoundSuggestionsPresent = [];

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
            if (allSoundsSuggested.includes(allSoundsUsed[i]) && !soundsSuggestedAndUsed.includes(allSoundsUsed[i])) {
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

        //push this set of lists to the student model

        var suggestionTracker = { allSuggestionsUsed: soundsSuggestedAndUsed, suggestionsCurrentlyUsed: currentSoundSuggestionsPresent };

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
   
    var bucketSize = 30; // options range from 10s - 120s
    // for experimenting
    // var bucketOptions = [10,20,30,40,50,60,90,120];

    var onPageHistory = [];
    var lastEditTS = 0;
    var deleteKeyTS = [];
    var recentCompiles = 3;
    var compileTS = [];
    var compileErrors = [];
    var mousePos = [];


    function addOnPageStatus(status, time) {
        onPageHistory.push({status,time});
        caiStudent.updateModel("preferences", { onPageHistory: onPageHistory});
        // console.log("history", onPageHistory);
    }

    function returnPageStatus() {
        return onPageHistory[-1];
    }

    function addCompileTS(time) {
        compileTS.push(time);
        lastEditTs = time;
        caiStudent.updateModel("preferences", { compileTS: compileTS});
    }

    function addKeystroke(action, content, time) {
        if (action=='remove') {
            deleteKeyTS.push(time);
        }
    }

    function addCompileError(error, time) {
        compileErrors.push({error, time});
        // console.log("compile errors", compileErrors);
        caiStudent.updateModel("preferences", { compileErrors: compileErrors});
    }

    function stuckOnError() {
        if (compileErrors.length >= recentCompiles && compileErrors[-1] == compileErrors[-2] && compileErrors[-2] == compileErrors[-3]) {
            return true;
        }
        return false;
    }

    function addMousePos(pos) {
        mousePos.push(pos);
        caiStudent.updateModel("preferences", { mousePos: mousePos});
    }

    // what are the measures to understand how off or on task one is?

    // other options: caiClose, pageChanged, caiSwapTab 
    // time spent on each project
    // start/end of key presses [bursts]
    // mouse clicks


    return {
        addSoundSuggestion: addSoundSuggestion,
        runSound: runSound,
        addCodeSuggestion: addCodeSuggestion,
        runCode: runCode,
        addOnPageStatus: addOnPageStatus,
        addCompileError, addCompileError,
        addCompileTS: addCompileTS,
        addKeystroke: addKeystroke,
        addMousePos: addMousePos,
        returnPageStatus: returnPageStatus
    };

}]);
