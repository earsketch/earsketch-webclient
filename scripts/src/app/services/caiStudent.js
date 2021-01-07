
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudent', [function () {

    var studentModel = {};

    function updateModel(property, value) {

        if (property == "codeKnowledge") {
            if (studentModel.codeKnowledge == null) {
                studentModel.codeKnowledge = {};
            }

            if (value.curriculum != null) {
                studentModel.codeKnowledge["curriculum"] = value.curriculum;
            }
            if (value.aggregateComplexity != null) {
                studentModel.codeKnowledge["aggregateComplexity"] = value.aggregateComplexity;
            }
            if (value.currentComplexity != null) {
                studentModel.codeKnowledge["currentComplexity"] = value.currentComplexity;
            }
        }

        if (property == "musicAttributes") {
            if (studentModel.musicAttributes == null) {
                studentModel.musicAttributes = {};
            }
            studentModel.musicAttributes["soundProfile"] = value;
        }
        console.log(studentModel);

    }

    return {
        studentModel: studentModel,
        updateModel: updateModel
    };

}]);
