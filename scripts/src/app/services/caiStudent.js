
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudent', function () {

    var studentModel = {};

    function updateModel(property, value) {

        if (property == "codeKnowledge") {
            if (studentModel.codeKnowledge == null) {
                studentModel.codeKnowledge = {};
            }
            var keys = Object.keys(value);
            for (var i = 0; i < keys.length; i++) {
                studentModel.codeKnowledge[keys[i]] = value[keys[i]];
            }
        }

        if (property == "musicAttributes") {
            if (studentModel.musicAttributes == null) {
                studentModel.musicAttributes = {};
            }
            studentModel.musicAttributes["soundProfile"] = value;
        }

        if (property == "preferences") {
            if (studentModel.preferences == null) {
                studentModel["preferences"] = {};
            }
            var keys = Object.keys(value);
            for (var i = 0; i < keys.length; i++) {
                studentModel.preferences[keys[i]] = value[keys[i]];
            }
        }
    }

    return {
        studentModel: studentModel,
        updateModel: updateModel
    };

});
