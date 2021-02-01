import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiDialogue', ['codeSuggestion', 'caiErrorHandling', 'recommender', 'userProject', 'caiStudentPreferenceModule', 'caiStudentHistoryModule', function (codeSuggestion, caiErrorHandling, recommender, userProject, caiStudentPreferenceModule, caiStudentHistoryModule) {
    var currentInput = {};
    var currentParameters = {};
    var currentTreeNode = {};
    var studentCodeObj = [];
    var musicAnalysisObj = {};
    var measures = [];
    var lineNodes = [];
    var parameterNodes = [];

    var currentSuggestion = {};
    var utteranceObj;

    var currentWait = -1;
    var errorWait = -1;
    var soundWait = { node: -1, sounds: [] };
    var complexityWait = { node: -1, complexity: {} };

    var currentError = ["", ""];

    var currentComplexity = {};
    var currentInstr = null;
    var currentGenre = null;

    var complexityUpdated = true;
    var errorSuccess = 0;
    var errorFail = 0;
    var promise;

    var activeProject = '';
    var nodeHistory = {};
    var recommendationHistory = {};
    var chattiness = 0;
    var currentNoSuggRuns = 0;
    var recentScripts = {};

    var studentInteracted = false;
    var currentDropup = "";
    var isPrompted = true;

    var soundSuggestionsUsed = {};
    var codeSuggestionsUsed = {};

    var allForms = ["ABA", "ABAB", "ABCBA", "ABAC", "ABACAB", "ABBA", "ABCCAB", "ABCAB", "ABCAC", "ABACA", "ABACABA"];

    //defines creation rules for generated utterances/button options (ex. creates option items for every line of student code for line selection)
    var actions = {

        "[SUGGESTION]": function () {
            return generateSuggestion();
        },
        "[SUGGESTIONEXPLAIN]": function () {
            return currentSuggestion[activeProject].explain;
        },
        "[SUGGESTIONEXAMPLE]": function () {
            return currentSuggestion[activeProject].example;
        }

    };

    function studentInteractedValue() {
        return studentInteracted;
    }

    function getDropup() {
        return currentDropup;
    }

    function studentInteract(didInt = true) {
        studentInteracted = didInt;
    }


    function addCurriculumPageToHistory(page) {
        nodeHistory[activeProject].push(["curriculum", page]);
        console.log(nodeHistory[activeProject]);
    }

    function setActiveProject(p) {
        if (!nodeHistory[p]) {
            nodeHistory[p] = [];
        }
        if (!recommendationHistory[p]) {
            recommendationHistory[p] = [];
        }
        if (!currentTreeNode[p]) {
            currentTreeNode[p] = CAI_TREE_NODES[0];
        }
        if (!currentSuggestion[p]) {
            currentSuggestion[p] = {};
        }
        if (!currentInput[p]) {
            currentInput[p] = {};
        }

        //interface w/student preference module
        if (!codeSuggestionsUsed[p]) {
            codeSuggestionsUsed[p] = 0;
        }
        if (!soundSuggestionsUsed[p]) {
            soundSuggestionsUsed[p] = 0;
        }
        caiStudentPreferenceModule.setActiveProject(p);
        codeSuggestionsUsed[p] = caiStudentPreferenceModule.getCodeSuggestionsUsed().length;
        soundSuggestionsUsed[p] = caiStudentPreferenceModule.getSoundSuggestionsUsed().length;

        activeProject = p;
    }

    function getNodeHistory() {
        return nodeHistory;
    }

    function handleError(error) {
        // console.log("error",currentError);
        var t = Date.now();
        caiStudentPreferenceModule.addCompileError(error, t);
        nodeHistory[activeProject].push(["Compilation With Error", error]);
        if (String(error[0]) === String(currentError[0]) && errorWait != -1) {
            //then it's the same error. do nothing. we still wait
            return "";
        }
        else {
            currentError = error;
           // var msg = startTree('error');
            return "newError";
        }
    }

    function attemptErrorFix() {
        return caiErrorHandling.handleError(currentError, studentCodeObj);
    }

    function setSuccessFail(s, f) {
        errorSuccess = s;
        errorFail = f;
    }

    function explainError() {

        var errorType = String(currentError[0]).split(':')[0].trim();
        if (errorType == "ExternalError") {
            errorType = String(currentError[0]).split(':')[1].trim();
        }
        
        if (CAI_ERRORS[errorType]) {
            return CAI_ERRORS[errorType];
        }
        else {
            return "i'm not sure how to fix this. you might have to peek at the curriculum";
        }
    }



    function processCodeRun(studentCode, functions, variables, complexityResults, lineDict, musicResults) {

        caiErrorHandling.updateNames(variables, functions);
        //resultsObj, lineDict, musicAnalysis
        studentCodeObj = studentCode;

        var allSamples = recommender.addRecInput([], { source_code: studentCodeObj });
        caiStudentPreferenceModule.runSound(allSamples);

        //once htat's done, record historicalinfo from the preference module
        var suggestionRecord = caiStudentPreferenceModule.getSoundSuggestionsUsed();
        if (suggestionRecord.length > soundSuggestionsUsed[activeProject]) {
            for (i = soundSuggestionsUsed[activeProject]; i < suggestionRecord.length; i++) {
                nodeHistory[activeProject].push(["Sound Suggestion Used", suggestionRecord[i]])
            }
            soundSuggestionsUsed[activeProject] += suggestionRecord.length - soundSuggestionsUsed[activeProject];

        }

        var codeSuggestionRecord = caiStudentPreferenceModule.getCodeSuggestionsUsed();
        if (codeSuggestionRecord.length > codeSuggestionsUsed[activeProject]) {
            for (i = codeSuggestionsUsed[activeProject]; i < codeSuggestionRecord.length; i++) {
                nodeHistory[activeProject].push(["Code Suggestion Used", codeSuggestionRecord[i]])
            }
            codeSuggestionsUsed[activeProject] += codeSuggestionRecord.length - codeSuggestionsUsed[activeProject];
        }

        if (complexityResults != null) {
            currentComplexity = Object.assign({}, complexityResults);

            if (currentComplexity.userFunc == "Args" || currentComplexity.userFunc == "Returns") {
                currentComplexity.userFunc = 3;
            }
            else if (currentComplexity.userFunc == "ReturnAndArgs") {
                currentComplexity.userFunc = 4;
            }
            nodeHistory[activeProject].push(["Successful Compilation", Object.assign({}, currentComplexity)]);
        }
        if (!studentInteracted) {
            return "";
        }

        if (currentWait != -1) {
            currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[currentWait]);
            currentWait = -1;
            return showNextDialogue();
        }
        else if (errorWait != -1) {
            currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[errorWait]);
            errorWait = -1;
            return showNextDialogue();
        }
        else if (soundWait.node != -1) {
            //get array of sound names
            var recInputString = studentCode;
            var allSounds = recommender.addRecInput([], { source_code: recInputString });
            var soundFound = false;
            for (var i in soundWait.sounds) {
                if (allSounds.includes(soundWait.sounds[i])) {
                    soundFound = true;
                    break;
                }
            }

            if (soundFound) {
                currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[soundWait.node]);
                soundWait.node = -1;
                soundWait.sounds = [];
                return showNextDialogue();
            }

        }

        else if (complexityWait.node != -1) {

            var meetsRequirements = true;
            for (var i in complexityWait.complexity) {
                if (currentComplexity[i] < complexityWait.complexity[i]) {
                    meetsRequirements = false;
                    break;
                }
            }


            if (meetsRequirements) {
                currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[soundWait.node]);
                soundWait.node = -1;
                soundWait.sounds = [];
                return showNextDialogue();
            }
            else return null;

        }
        else {
            //this is where chattiness parameter might come in
            if (currentNoSuggRuns >= chattiness) {
                currentNoSuggRuns = 0;
                isPrompted = false;
                var next = startTree('suggest');
                isPrompted = true;
                return next;
            }
            else {
                currentNoSuggRuns += 1;
            }
        }

    }

    function setCodeObj(newCode) {
        studentCodeObj = newCode;
    }

    function clearParameters() {
        currentParameters = {};
    }

    /**
    * Creates label/value array from dialogue selection options available to current node.
    * @returns {buttons} - array of objects with label (displayed text) and value (input to caiDialogue when clicked) properties.
    */
    function createButtons() {
        var buttons = [];



        if (currentSuggestion[activeProject] != null && currentTreeNode[activeProject].options[0] == 35 && (currentSuggestion[activeProject].explain == null || currentSuggestion[activeProject].explain == "")) {
            currentSuggestion[activeProject] = null;
            return [];
        }

        if (Number.isInteger(currentTreeNode[activeProject].options[0])) {
            if ('dropup' in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup == "Genres") {
                //filter the button options
                var availableGenres = [];
                var allSamples = recommender.addRecInput([], { source_code: studentCodeObj });

                if (allSamples.length < 1) {
                    for (var i = 0; i < 5; i++)
                        allSamples = recommender.addRandomRecInput(allSamples);
                }

                var recs = [];

                recs = recommender.generateRecommendations([], allSamples, 1, 1);


                availableGenres = recommender.genreRecommendations(recs);


                for (var i in currentTreeNode[activeProject].options) {
                    var nextNode = currentTreeNode[activeProject].options[i];
                    if (availableGenres.includes(CAI_TREE_NODES[nextNode].title.toUpperCase())) {
                        buttons.push({ label: CAI_TREE_NODES[nextNode].title, value: nextNode });
                    }
                }
            }
            else if ('dropup' in currentTreeNode[activeProject] && currentTreeNode[activeProject].dropup == "Instruments") {
                //filter the button options
                var availableInstruments = [];

                var allSamples = recommender.addRecInput([], { source_code: studentCodeObj });

                if (allSamples.length < 1) {
                    for (var i = 0; i < 5; i++)
                        allSamples = recommender.addRandomRecInput(allSamples);
                }

                var recs = [];

                recs = recommender.generateRecommendations([], allSamples, 1, 1);


                availableInstruments = recommender.instrumentRecommendations(recs);


                for (var i in currentTreeNode[activeProject].options) {
                    var nextNode = currentTreeNode[activeProject].options[i];
                    if (availableInstruments.includes(CAI_TREE_NODES[nextNode].title.toUpperCase())) {
                        buttons.push({ label: CAI_TREE_NODES[nextNode].title, value: nextNode });
                    }
                }
            }
            else {
                for (var i in currentTreeNode[activeProject].options) {
                    var nextNode = currentTreeNode[activeProject].options[i];
                    buttons.push({ label: CAI_TREE_NODES[nextNode].title, value: nextNode });
                }
            }
        }
        else {
            for (var i in currentTreeNode[activeProject].options) {
                var nextNode = currentTreeNode[activeProject].options[i];
                buttons.push({ label: nextNode.title, value: Number(i) + 1 });
            }
        }

        if ('dropup' in currentTreeNode[activeProject]) {
            currentDropup = currentTreeNode[activeProject].dropup;
        }
        return buttons;
    }


    function showNextDialogue() {
        currentTreeNode[activeProject] = Object.assign({}, currentTreeNode[activeProject]); //make a copy
        if ("event" in currentTreeNode[activeProject]) {
            for (var k = 0; k < currentTreeNode[activeProject].event.length; k++) {
                if (currentTreeNode[activeProject].event[k] != 'codeRequest') {
                    caiStudentHistoryModule.trackEvent(currentTreeNode[activeProject].event[k]);
                    nodeHistory[activeProject].push(["request", currentTreeNode[activeProject].event[k]]);
                }
            }
        }
        var utterance = currentTreeNode[activeProject].utterance;
        if (currentTreeNode[activeProject].title === "Maybe later") {
            studentInteracted = false;
        }

        var parameters = []

        if (utterance.includes("[RESET_PARAMS]")) {
            currentInstr = null;
            currentGenre = null;
        }

        //actions first
        if (utterance.includes("ERROREXPLAIN")) {
            utterance = utterance.substring(0, utterance.indexOf("[ERROREXPLAIN]")) + explainError() + utterance.substring(utterance.lastIndexOf("[ERROREXPLAIN]") + 14);
            parameters.push(["ERROREXPLAIN", explainError()])
        }
        else if (utterance.includes("[SUGGESTION]")) {
            utteranceObj = actions["[SUGGESTION]"]();
            // if (utteranceObj.id != 1 && utteranceObj.id != 6) {
            parameters.push(["SUGGESTION", utteranceObj.id]);
            // }
            // else{
            //    parameters.push(["SUGGESTION", utteranceObj.utterance]);
            // }
            utterance = utteranceObj.utterance;
        }
        else if (currentTreeNode[activeProject].utterance in actions) {
            utterance = actions[currentTreeNode[activeProject].utterance]();
            if (currentTreeNode[activeProject].utterance == "[SUGGESTIONEXPLAIN]" || currentTreeNode[activeProject].utterance == "[SUGGESTIONEXAMPLE]") {
                parameters.push([currentTreeNode[activeProject].utterance, utteranceObj.id]);
            }
            else {
                parameters.push([currentTreeNode[activeProject].utterance, utterance]);
            }
        }
        if (currentTreeNode[activeProject].options in actions) {
            currentTreeNode[activeProject].options = actions[currentTreeNode[activeProject].options]();
        }

        //set up sound recs. if theres "[SOUNDWAIT|x]" we need to fill that in (for each sound rec, add "|" + recname)
        if (utterance.includes("[sound_rec]")) {

            if ("INSTRUMENT" in currentTreeNode[activeProject].parameters) {
                currentInstr = currentTreeNode[activeProject].parameters.INSTRUMENT;
                parameters.push(["INSTRUMENT", currentInstr])
            }
            else if ("GENRE" in currentTreeNode[activeProject].parameters) {
                currentGenre = currentTreeNode[activeProject].parameters.GENRE;
                parameters.push(["GENRE", currentGenre])
            }


            var count = (utterance.match(/sound_rec/g) || []).length;
            var allSamples = recommender.addRecInput([], { source_code: studentCodeObj });

            if (allSamples.length < 1) {
                for (var i = 0; i < 5; i++)
                    allSamples = recommender.addRandomRecInput(allSamples);
            }

            var recs = [];
            var usedRecs = [];
            recs = recommender.recommend([], allSamples, 1, 1, [currentGenre], [currentInstr], recommendationHistory[activeProject], count);
            for (var idx in recs)
                recommendationHistory[activeProject].push(recs[idx]);
            var recIndex = 0;

            while (utterance.includes("[sound_rec]")) {
                var recBounds = [utterance.indexOf("[sound_rec]"), utterance.indexOf("[sound_rec]") + 11];

                //pick a location in the code.

                var newRecString = recs[recIndex];
                var musicResults = codeSuggestion.getMusic();

                if (musicResults != null && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0 && currentGenre == null && currentInstr == null) {
                    var indexVal = Object.keys(musicResults.SOUNDPROFILE)[randomIntFromInterval(0, Object.keys(musicResults.SOUNDPROFILE).length - 1)];
                    var bounds = musicResults.SOUNDPROFILE[indexVal].measure;

                    var measureIndex = randomIntFromInterval(bounds[0] - 1, bounds[1] - 1);
                    var recIndex = randomIntFromInterval(0, 2);

                    var file = musicResults.RECOMMENDATIONS[measureIndex][recIndex];


                    if (file != null && file != "undefined" && !utterance.includes(file)) {
                        newRecString = file + " in the section between measures " + bounds[0] + " and " + bounds[1];
                        usedRecs.push(file);
                    }
                }
                else {
                    usedRecs.push(recs[recIndex]);
                }

                if (newRecString !== undefined) {
                    utterance = utterance.substring(0, recBounds[0]) + newRecString + utterance.substring(recBounds[1]);
                    recIndex++;
                }
            }


            // if (utterance.includes("undefined")) {
            //     utterance = codeSuggestion.randomNucleus(nodeHistory[activeProject]).utterance;
            //}

            if (utterance.includes("[SOUNDWAIT")) {
                var addSoundsIndex = utterance.lastIndexOf("]");
                var newString = "|" + recs.join("|") + "]";

                utterance = utterance.substring(0, addSoundsIndex) + newString;
            }
            parameters.push(["sound_rec", recs])
            caiStudentPreferenceModule.addSoundSuggestion(usedRecs);

        }
        while (utterance.includes("[SECTION]")) {
            var recBounds = [utterance.indexOf("[SECTION]"), utterance.indexOf("[SECTION]") + 11];

            //pick a location in the code.

            var newRecString = "one of our sections";
            var musicResults = codeSuggestion.getMusic();

            if (musicResults != null && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
                var indexVal = Object.keys(musicResults.SOUNDPROFILE)[randomIntFromInterval(0, Object.keys(musicResults.SOUNDPROFILE).length - 1)];
                var bounds = musicResults.SOUNDPROFILE[indexVal].measure;



                newRecString = "the section between measures " + bounds[0] + " and " + bounds[1];
            }

            utterance = utterance.substring(0, recBounds[0]) + newRecString + utterance.substring(recBounds[1]);
        }

        if (utterance.includes("[FORM]")) {
            var validForms = [];
            var currentForm = "";
            var musicResults = codeSuggestion.getMusic();
            if (musicResults != null && musicResults.SOUNDPROFILE != null && Object.keys(musicResults.SOUNDPROFILE).length > 0) {
                var keys = Object.keys(musicResults.SOUNDPROFILE);
                for (var i in keys) {
                    currentForm += (keys[i][0]);
                }


                for (var i in allForms) {
                    if (allForms[i].startsWith(currentForm)) {
                        validForms.push(allForms[i]);
                    }
                }

                //select form at random
                var newForm = validForms[randomIntFromInterval(0, validForms.length - 1)];
                utterance = utterance.replace("[FORM]", newForm);
                if (newForm.includes("undefined")) {
                    utterance = codeSuggestion.randomNucleus();
                }
            }
            else {
                //return random form from allForms
                utterance = utterance.replace("[FORM]", allForms[randomIntFromInterval(0, allForms.length - 1)]);
                if (utterance.includes("undefined")) {
                    utterance = codeSuggestion.randomNucleus();
                }
            }

        }

        //then set waits and whatnot
        if (utterance.includes("[WAIT")) {
            //get the number and set currentWait

            currentWait = Number.parseInt(utterance.substring(utterance.indexOf("[WAIT") + 6, utterance.length - 1));
            utterance = utterance.substring(0, utterance.indexOf("[WAIT"));
        }
        else if (utterance.includes("[ERRORWAIT")) {

            errorWait = Number.parseInt(utterance.substring(utterance.indexOf("[ERRORWAIT") + 11, utterance.length - 1));
            utterance = utterance.substring(0, utterance.indexOf("[ERRORWAIT"));
        }
        else if (utterance.includes("[COMPLEXITYWAIT")) {
            //format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)
            var args = utterance.substring(utterance.indexOf("[COMPLEXITYWAIT"));

            utterance = utterance.substring(0, utterance.indexOf("[COMPLEXITYWAIT"));

            var waitArgs = args.split('|');
            //var soundWait = { node: -1, sounds: [] };

            complexityWait.node = parseInt(waitArgs[1]);
            complexityWait.complexity = {};

            for (var i = 2; i < waitArgs.length; i++) {
                //convert to property name and integer
                var parts = waitArgs[i].split(':');
                complexityWait.complexity[parts[0]] = parseInt(parts[1]);
            }

        }
        else if (utterance.includes("[SOUNDWAIT")) {
            //format is [SOUNDWAIT|nodeNumber|sound1|sound2] (with any number of sounds)

            var args = utterance.substring(utterance.indexOf("[SOUNDWAIT") + 1, utterance.length - 1);
            utterance = utterance.substring(0, utterance.indexOf("[SOUNDWAIT"));

            var soundWaitArgs = args.split('|');

            soundWait.node = parseInt(soundWaitArgs[1]);
            soundWait.sounds = [];
            for (var i = 2; i < soundWaitArgs.length; i++) {
                soundWait.sounds.push(soundWaitArgs[i]);
            }

        }
        else {
            //cancel the wait
            currentWait = -1;
            errorWait = -1;
            soundWait.node = -1;
            complexityWait.node = -1;
            soundWait.sounds = [];
        }

        if (nodeHistory[activeProject]) {
            // Add current node (by node number) and paramters to node history
            if (Number.isInteger(currentTreeNode[activeProject].id)) {
                nodeHistory[activeProject].push([currentTreeNode[activeProject].id, parameters]);
            }
            else {
                nodeHistory[activeProject].push([0, utterance, parameters]);
            }

            if (FLAGS.UPLOAD_CAI_HISTORY)
                userProject.uploadCAIHistory(activeProject, nodeHistory[activeProject][nodeHistory[activeProject].length - 1]);

            console.log("node history", nodeHistory);
            // reconstituteNodeHistory();
        }
        return utterance;
    }


    function reconstituteNodeHistory() {
        var newVersion = [];
        for (var i in nodeHistory[activeProject]) {
            if (nodeHistory[activeProject][i][0] != 0 || i == "0") {
                var newItem = nodeHistory[activeProject][i].slice();
                newItem[0] = CAI_TREE_NODES[newItem[0]].utterance;


                //now, we go through the parameters and replace things like sound recs, section,
                if (newItem[0].includes("sound_rec")) {
                    //find recs
                    var soundRecs = [];
                    for (var i in newItem) {
                        var val = newItem[i][0][0];
                        if (val == "sound_rec") {
                            soundRecs = newItem[i][0][1];
                            break;
                        }
                    }
                    if (soundRecs.length > 0) {
                        var index = 0;
                        while (newItem[0].includes("sound_rec")) {
                            newItem[0] = newItem[0].replace("[sound_rec]", soundRecs[index]);
                            index++;
                        }
                    }
                }



                newVersion.push(newItem);
                //newVersion[i][0] = nodes[newVersion[i][0]].utterance;
            }
        }

        console.log("reconstituted", newVersion);
    }


    function errorFixSuccess() {
        currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[errorSuccess]);
        return showNextDialogue();
    }
    function errorFixFail() {
        currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[errorFail]);
        return showNextDialogue();
    }

    function activeWaits() {

        if (currentWait != -1) {
            return true;
        }
        if (errorWait != -1) {
            return true;
        }
        if (soundWait.node != -1) {
            return true;
        }

        if (complexityWait.node != -1) {
            return true;
        }
        return false;
    }

    function startTree(treeName) {

        currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[CAI_TREES[treeName]]);
        return showNextDialogue();
    }

    /**
     * Updates and CAI-generated response with current user input.
     * @param input - node selection from CAI user interface.
     * @returns {string} - dialogue object for next CAI utterance.
     */
    function generateOutput(input) {

        var index = Number(input);

        if (Number.isInteger(index) && !Number.isNaN(index)) {
            return moveToNode(index);
        }
        function moveToNode(input) {
            if (input in CAI_TREES) {
                return startTree(input);
            }
            if (currentTreeNode[activeProject] != null) {

                if (currentTreeNode[activeProject].options.length === 0) {
                    var utterance = currentTreeNode[activeProject].utterance;
                    currentTreeNode[activeProject] = null;
                    return utterance;
                }
                if (input != null && typeof input === "number") {
                    if (Number.isInteger(currentTreeNode[activeProject].options[0])) {
                        currentTreeNode[activeProject] = CAI_TREE_NODES[input];
                    }
                    else {
                        currentTreeNode[activeProject] = currentTreeNode[activeProject].options[input];
                    }
                    for (var i in Object.keys(currentTreeNode[activeProject].parameters)) {
                        currentParameters[Object.keys(currentTreeNode[activeProject].parameters)[i]] = currentTreeNode[activeProject].parameters[Object.keys(currentTreeNode[activeProject].parameters)[i]];
                    }
                    return showNextDialogue();
                }
            }
            else return "";
        }
        var output = moveToNode(input);

        return output;

    }

    

    /**
   * Generates a suggestion for music or code additions/changes and outputs a representative dialogue object
   * @returns {dict} - dialogue representation of object describing suggestion utterance output.
   */
    function generateSuggestion() {
        if (isPrompted) {
            studentInteracted = true;

            caiStudentHistoryModule.trackEvent("codeRequest");
            nodeHistory[activeProject].push(["request", "codeRequest"]);
        }
        var outputObj = codeSuggestion.generateCodeSuggestion(null, nodeHistory[activeProject]);
        //var outputText = printObject(outputObj);
        currentSuggestion[activeProject] = Object.assign({}, outputObj);
        // outputObject = { messageType: "P", text: outputText, d: outputObj };
        if (outputObj != null) {

            if (outputObj.utterance == "" && isPrompted) {
                outputObj = codeSuggestion.randomNucleus(nodeHistory[activeProject]);
            }

            if (outputObj.utterance.includes("[STARTTREE|")) {
                //what tree are we starting?
                var treeName = outputObj.utterance.substring(outputObj.utterance.indexOf("[STARTTREE|") + 11);
                treeName = treeName.substring(0, treeName.lastIndexOf("]"));
                currentTreeNode[activeProject] = Object.assign({}, CAI_TREE_NODES[CAI_TREES[treeName]]);
                return currentTreeNode[activeProject];

            }
            if ('complexity' in outputObj) {

                caiStudentPreferenceModule.addCodeSuggestion(outputObj.complexity);
            }
            return outputObj;
        }
        else return "";
    }

    function printObject(obj) {
        var keys = Object.keys(obj);
        var returnStrings = "";

        for (var i in keys) {
            if (typeof obj[keys[i]] === "object") {
                returnStrings += (keys[i] + ": \n{\n" + printObject(obj[keys[i]]) + "}\n");
            }
            else {
                returnStrings += (keys[i] + ": " + obj[keys[i]] + "\n");
            }
        }
        return returnStrings;

    }

    //helper function to generate random integers
    function randomIntFromInterval(min, max) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function checkForCodeUpdates(code) {
        console.log(activeProject);
        console.log("student code", code);
        if (code.length > 0) {
            if (activeProject in recentScripts) {
                if (recentScripts[activeProject] != code) {
                    console.log("previous code state, which is different from the current one");
                    console.log(recentScripts[activeProject]);
                    userProject.saveScript(activeProject, code);
                    recentScripts[activeProject] = code;
                    if (FLAGS.UPLOAD_CAI_HISTORY)
                        userProject.uploadCAIHistory(activeProject,[]);
                }

            }
            else {
                console.log("new project addded to history")
                recentScripts[activeProject] = code;
            }
        }
    };

    return {
        processCodeRun: processCodeRun,
        generateOutput: generateOutput,
        createButtons: createButtons,
        handleError: handleError,
        attemptErrorFix: attemptErrorFix,
        setSuccessFail: setSuccessFail,
        errorFixSuccess: errorFixSuccess,
        errorFixFail: errorFixFail,
        setCodeObj: setCodeObj,
        studentInteract: studentInteract,
        getDropup: getDropup,
        setActiveProject: setActiveProject,
        getNodeHistory: getNodeHistory,
        activeWaits: activeWaits,
        studentInteractedValue: studentInteractedValue,
        checkForCodeUpdates: checkForCodeUpdates,
        addCurriculumPageToHistory: addCurriculumPageToHistory
    };

}]);
