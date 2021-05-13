//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';

import { computeStyles } from "@popperjs/core";
import { parseString } from "xml2js";

/**
 * Student preference module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentPreferenceModule', ['caiStudent', function (caiStudent) {

    //var init
    var suggestionsAccepted = {};
    var suggestionsRejected = {};

    var allSoundsSuggested = {};
    var allSoundsUsed = {};
    var soundsSuggestedAndUsed = {};
    var currentSoundSuggestionsPresent = {};
    var soundsContributedByStudent = {};

    var codeSuggestionsUsed = {};

    var codeSuggestionsMade = {};
    var sampleSuggestionsMade = {};

    var soundSuggestionTracker = {};

    var numberOfRuns = 3;

    var acceptanceRatio = {};
    var activeProject = "";

    function setActiveProject(projectName) {
        activeProject = projectName;

        if (!allSoundsSuggested[projectName]) {
            allSoundsSuggested[projectName] = [];
        }
        if (!allSoundsUsed[projectName]) {
            allSoundsUsed[projectName] = [];
        }
        if (!soundsSuggestedAndUsed[projectName]) {
            soundsSuggestedAndUsed[projectName] = [];
        }
        if (!currentSoundSuggestionsPresent[projectName]) {
            currentSoundSuggestionsPresent[projectName] = [];
        }
        if (!soundsContributedByStudent[projectName]) {
            soundsContributedByStudent[projectName] = [];
        }

        if (!codeSuggestionsUsed[projectName]) {
            codeSuggestionsUsed[projectName] = [];
        }

        if (!codeSuggestionsMade[projectName]) {
            codeSuggestionsMade[projectName] = [];
        }
        if (!sampleSuggestionsMade[projectName]) {
            sampleSuggestionsMade[projectName] = [];
        }

        if (!acceptanceRatio[projectName]) {
            acceptanceRatio[projectName] = 0;
        }

        if (!suggestionsAccepted[projectName]) {
            suggestionsAccepted[projectName] = 0;
        }
        if (!suggestionsRejected[projectName]) {
            suggestionsRejected[projectName] = 0;
        }

        if (!soundSuggestionTracker[activeProject]) {
            soundSuggestionTracker[activeProject] = [];
        }
        activeProject = projectName;
    }

    function getSoundSuggestionsUsed() {
        return soundSuggestionTracker[activeProject].slice(0);
    }

    function getCodeSuggestionsUsed() {
        return codeSuggestionsUsed[activeProject].slice(0);
    }

    function updateHistoricalArrays(currentSounds) {


        //update historical list of all sound suggestions
        for (var i = 0; i < sampleSuggestionsMade[activeProject].length; i++) {
            for (var j = 0; j < sampleSuggestionsMade[activeProject][i][1].length; j++) {
                if (!allSoundsSuggested[activeProject].includes(sampleSuggestionsMade[activeProject][i][1][j])) {
                    allSoundsSuggested[activeProject].push(sampleSuggestionsMade[activeProject][i][1][j]);
                }
            }
        }

        //update historical list of all sounds used
        if (currentSounds != null) {
            for (var i = 0; i < currentSounds.length; i++) {
                if (!allSoundsUsed[activeProject].includes(currentSounds[i])) {
                    allSoundsUsed[activeProject].push(currentSounds[i]);
                }
            }
        }

        //update historical list of sound suggestions used
        for (var i = 0; i < allSoundsUsed[activeProject].length; i++) {
            if (allSoundsSuggested[activeProject].includes(allSoundsUsed[activeProject][i]) && !soundsSuggestedAndUsed[activeProject].includes(allSoundsUsed[i]) && !soundsContributedByStudent[activeProject].includes(allSoundsUsed[activeProject][i])) {
                soundsSuggestedAndUsed[activeProject].push(allSoundsUsed[activeProject][i]);
            }
        }


        //if current sounds passed, update "currently used suggestions" list
        if (currentSounds != null) {
            var newCurrentSuggs = [];
            for (var i = 0; i < currentSoundSuggestionsPresent[activeProject].length; i++) {
                if (currentSounds.includes(currentSoundSuggestionsPresent[activeProject][i])) {
                    newCurrentSuggs.push(currentSoundSuggestionsPresent[activeProject][i])
                }
            }

            for (var i = 0; i < currentSounds.length; i++) {
                if (allSoundsSuggested[activeProject].includes(currentSounds[i]) && !newCurrentSuggs.includes(currentSounds[i])) {
                    newCurrentSuggs.push(currentSounds[i]);
                }
            }

            currentSoundSuggestionsPresent[activeProject] = newCurrentSuggs.slice(0);
        }

        if (currentSounds != null) {
            for (var i = 0; i < currentSounds.length; i++) {
                if (!allSoundsSuggested[activeProject].includes(currentSounds[i]) && !soundsContributedByStudent[activeProject].includes(currentSounds[i])) {
                    soundsContributedByStudent[activeProject].push(currentSounds[i]);
                }
            }
        }

        //push this set of lists to the student model

        var suggestionTracker = { allSuggestionsUsed: soundsSuggestedAndUsed, suggestionsCurrentlyUsed: currentSoundSuggestionsPresent, soundsContributedByStudent: soundsContributedByStudent };

        caiStudent.updateModel("preferences", { suggestionUse: suggestionTracker });

    }

    function addSoundSuggestion(suggestionArray) {
        sampleSuggestionsMade[activeProject].push([0, suggestionArray]);
        updateHistoricalArrays();
    }

    function runSound(soundsUsedArray) {

        updateHistoricalArrays(soundsUsedArray);

        var newArray = [];
        for (var i = 0; i < sampleSuggestionsMade[activeProject].length; i++) {

            var wasUsed = false;

            //were any of the sounds used?
            for (var j = 0; j < soundsUsedArray.length; j++) {
                if (sampleSuggestionsMade[activeProject][i][1].includes(soundsUsedArray[j])) {
                    wasUsed = true;
                    break;
                }
            }

            //decrement


            sampleSuggestionsMade[activeProject][i][0] += 1;
            //if 0, add to the rejection category and delete the item
            if (wasUsed) {
                suggestionsAccepted[activeProject] += 1;
                soundSuggestionTracker[activeProject].push(sampleSuggestionsMade[activeProject][i]);
                updateAcceptanceRatio();
            }
            else {
                if (sampleSuggestionsMade[activeProject][i][0] == 0) {
                //    suggestionsRejected[activeProject] += 1;
                //    updateAcceptanceRatio();
                }
                else {
                    newArray.push(sampleSuggestionsMade[activeProject][i].slice(0));
                }
            }

        }

        sampleSuggestionsMade[activeProject] = newArray.slice(0);

    }

    function addCodeSuggestion(complexityObj, utterance) {
        codeSuggestionsMade[activeProject].push([0, complexityObj, utterance]);
    }

    function runCode(complexityOutput) {
        var newArray = [];
        for (var i = 0; i < codeSuggestionsMade[activeProject].length; i++) {

            var wasUsed = true;

            //were any reqs readched?
            var keys = Object.keys(codeSuggestionsMade[activeProject][i][1]);

            for (var j = 0; j < keys.length; j++) {
                if (complexityOutput[keys[j]] < codeSuggestionsMade[activeProject][i][1][keys[j]]) {
                    wasUsed = false;
                }
            }

            //decrement

            codeSuggestionsMade[activeProject][i][0] += 1;

            //if 0, add to the rejection category and delete the item
            if (wasUsed) {
                suggestionsAccepted[activeProject] += 1;
                updateAcceptanceRatio();
                codeSuggestionsUsed[activeProject].push(codeSuggestionsMade[activeProject][i]);
            }
            else {
                if (codeSuggestionsMade[activeProject][i][0] == 0) {
                   // suggestionsRejected[activeProject] += 1;
                   // updateAcceptanceRatio();
                }
                else {
                    newArray.push(codeSuggestionsMade[activeProject][i].slice(0));
                }
            }


        }

        codeSuggestionsMade[activeProject] = newArray.slice(0);
    }

    function updateAcceptanceRatio() {
        acceptanceRatio[activeProject] = suggestionsAccepted[activeProject] / (suggestionsAccepted[activeProject] + suggestionsRejected[activeProject]);
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
        lastEditTS = time;
        caiStudent.updateModel("preferences", { compileTS: compileTS});
    }

    function addKeystroke(action, content, time) {
        if (action=='remove') {
            deleteKeyTS.push(time);
        }
    }

    function addCompileError(error, time) {
        compileErrors.push({error, time});
        caiStudent.updateModel("preferences", { compileErrors: compileErrors});
    }

    function stuckOnError() {
        var recentHistory = compileErrors.slice(compileErrors.length-recentCompiles, compileErrors.length);
        var errors = recentHistory.map(function(a) {return a.error[0].args.v[0].v;});
        if (compileErrors.length >= recentCompiles && allEqual(errors)) {
            return true;
        }
        return false;
    }

    function allEqual(arr) {
        return new Set(arr).size == 1;
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
        returnPageStatus: returnPageStatus,
        stuckOnError: stuckOnError,
        getSoundSuggestionsUsed: getSoundSuggestionsUsed,
        getCodeSuggestionsUsed: getCodeSuggestionsUsed,
        setActiveProject: setActiveProject
    };

}]);
