//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentHistoryModule', ['userProject', 'complexityCalculator', 'caiStudent', 'caiStudentPreferenceModule', function (userProject, complexityCalculator, caiStudent, caiStudentPreferenceModule) {

    var aggregateScore;
    var curriculumPagesViewed;
    var codeRequests = 0;
    var soundRequests = 0;
    var errorRequests = 0

    var events = { codeRequest: incrementCodeRequest, soundRequest: incrementSoundRequest, errorRequest: incrementErrorRequest };

    function trackEvent(eventName) {
        if (eventName in events) {
            events[eventName]();
        }
    }

    function incrementCodeRequest() {
        codeRequests += 1;
        
        caiStudent.updateModel("preferences", { codeRequests: codeRequests });
    }
    function incrementSoundRequest() {
        soundRequests += 1;

        caiStudent.updateModel("preferences", { soundRequests: soundRequests });
    }

    function incrementErrorRequest() {
        errorRequests += 1;

        caiStudent.updateModel("preferences", { errorRequests: errorRequests });
    }


    function calculateAggregateCodeScore() {
        if (aggregateScore == null) {
            console.log("Script List Received: ");
            var savedScripts = [];
            var scriptTypes = [];
            var savedNames = [];
            var keys = Object.keys(userProject.scripts);

            //if needed, initialize aggregate score variable
            if (aggregateScore == null) {
                aggregateScore = {
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

            for (var i = 0; i < keys.length; i++) {
                if (!savedNames.includes(userProject.scripts[keys[i]].name)) {
                    savedNames.push(userProject.scripts[keys[i]].name);
                    savedScripts.push(userProject.scripts[keys[i]].source_code);
                    scriptTypes.push(userProject.scripts[keys[i]].name.substring(userProject.scripts[keys[i]].name.length - 2));

                    if (savedNames.length >= 30) {
                        break;
                    }
                }
            }

            for (var i = 0; i < savedScripts.length; i++) {
                var sc = savedScripts[i];
                var ty = scriptTypes[i];

                var output;

                try {
                    if (ty == "py") {
                        output = Object.assign({}, complexityCalculator.analyzePython(sc));
                    }
                    else {
                        output = Object.assign({}, complexityCalculator.analyzeJavascript(sc));
                    }
                }
                catch (error) {
                    output = null;
                }
                if (output != null) {
                    if (output["userFunc"] === "Args" || output["userFunc"] === "Returns") {
                        output["userFunc"] = 3;
                    }
                    else if (output["userFunc"] === "ReturnAndArgs") {
                        output["userFunc"] = 4;
                    }

                    if (output["userFunc"] === "Args" || output["userFunc"] === "Returns") {
                        output["userFunc"] = 3;
                    }
                    else if (output["userFunc"] === "ReturnAndArgs") {
                        output["userFunc"] = 4;
                    }

                    for (var j in aggregateScore) {
                        if (output[j] > aggregateScore[j]) {
                            aggregateScore[j] = output[j];
                        }
                    }
                }

            }
        }

    }

    function addScoreToAggregate(script, scriptType) {

        if (aggregateScore == null) {
            calculateAggregateCodeScore();
        }
        var newOutput;

        //analyze new code
        if (scriptType == "python") {
            newOutput = Object.assign({}, complexityCalculator.analyzePython(script));
        }
        else {
            newOutput = Object.assign({}, complexityCalculator.analyzeJavascript(script));
        }
        //numeric replacement
        if (newOutput["userFunc"] === "Args" || newOutput["userFunc"] === "Returns") {
            newOutput["userFunc"] = 3;
        }
        else if (newOutput["userFunc"] === "ReturnAndArgs") {
            newOutput["userFunc"] = 4;
        }

        if (newOutput["userFunc"] === "Args" || newOutput["userFunc"] === "Returns") {
            newOutput["userFunc"] = 3;
        }
        else if (newOutput["userFunc"] === "ReturnAndArgs") {
            newOutput["userFunc"] = 4;
        }

        caiStudentPreferenceModule.runCode(newOutput);
        //update aggregateScore
        for (var i in aggregateScore) {
            if (newOutput[i] > aggregateScore[i]) {
                aggregateScore[i] = newOutput[i];
            }
        }

        caiStudent.updateModel("codeKnowledge", { aggregateComplexity: aggregateScore, currentComplexity: newOutput})

    }

    //called when the student accesses a curriculum page from broadcast listener in caiWindowDirective
    function addCurriculumPage(page) {
        if (curriculumPagesViewed == null) {
            curriculumPagesViewed = [];
        }
        if (!curriculumPagesViewed.includes(page)) {
            curriculumPagesViewed.push(page);
            console.log(curriculumPagesViewed);
            caiStudent.updateModel("codeKnowledge", { curriculum: curriculumPagesViewed})
        }
    }

    //returns array of all curriculum pages viewed
    function retrievePagesViewed() {
        return curriculumPagesViewed;
    }

    return {
        addScoreToAggregate: addScoreToAggregate,
        calculateAggregateCodeScore: calculateAggregateCodeScore,
        addCurriculumPage: addCurriculumPage,
        trackEvent: trackEvent
    };

}]);
