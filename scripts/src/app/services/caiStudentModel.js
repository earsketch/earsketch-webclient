//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentModel', ['caiStudentHistoryModule', 'caiAnalysisModule', 'caiStudentPreferenceModule', function (caiStudentHistoryModule, caiAnalysisModule, caiStudentPreferenceModule) {

    var currentModel = {};

    function studentModel() {
        var codeKnowledge = {};
        var musicAttributes = {};
        var studentPreferences = {};
        currentModel = {};

        codeKnowledge["curriculum"] = caiStudentHistoryModule.retrievePagesViewed().slice(0);
        codeKnowledge["aggregateComplexity"] = Object.assign({}, caiStudentHistoryModule.aggregateScore);
        codeKnowledge["currentComplexity"] = Object.assign({}, caiAnalysisModule.savedAnalysis.Code);

        musicAttributes["soundProfile"] = Object.assign({}, caiAnalysisModule.savedAnalysis.Music);

        currentModel = { code: codeKnowledge, music: musicAttributes, preferences: studentPreferences };

        return currentModel;
    }

    return {
        studentModel: studentModel
    };

}]);
