//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentHistoryModule', ['userProject', 'complexityCalculator', function (userProject, complexityCalculator) {

    var aggregateScore;
    var curriculumPagesViewed = [];

    //called once to calculate aggregate score of all of a student's past projects
    function calculateAggregateCodeScore() {
        if (aggregateScore == null) {

            //variable init
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

            //get only the most recent version of each script
            for (var i = 0; i < keys.length; i++) {
                if (!savedNames.includes(userProject.scripts[keys[i]].name)) {
                    savedNames.push(userProject.scripts[keys[i]].name);
                    savedScripts.push(userProject.scripts[keys[i]].source_code);
                    scriptTypes.push(userProject.scripts[keys[i]].name.substring(userProject.scripts[keys[i]].name.length - 2));
                }
            }

            for (var i = 0; i < savedScripts.length; i++) {
                var sc = savedScripts[i];
                var ty = scriptTypes[i];

                var output;

                //calculate complexity, catching errors (code won't run, etc.)
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

                //convert string values to int values
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

    //to call when code is run, to add individual code score to aggregate score
    function addScoreToAggregate(script, scriptType) {
        //if we haven't calculated an aggregate score yet, do that here
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

        //update aggregateScore
        for (var i in aggregateScore) {
            if (newOutput[i] > aggregateScore[i]) {
                aggregateScore[i] = newOutput[i];
            }
        }



    }

    //called when the student accesses a curriculum page from broadcast listener in caiWindowDirective
    function addCurriculumPage(page) {
        if (!curriculumPagesViewed.includes(page)) {
            curriculumPagesViewed.push(page);
            console.log(curriculumPagesViewed);
        }
    }

    //returns array of all curriculum pages viewed
    function retrievePagesViewed() {

    }

    return {
        addScoreToAggregate: addScoreToAggregate,
        calculateAggregateCodeScore: calculateAggregateCodeScore,
        addCurriculumPage: addCurriculumPage,
        retrievePagesViewed: retrievePagesViewed,
        aggregateScore: aggregateScore
    };

}]);
