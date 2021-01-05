//import { CAI_TREE_NODES, CAI_TREES, CAI_ERRORS} from 'caiTree';
/**
 * Analysis module for CAI (Co-creative Artificial Intelligence) Project.
 *
 * @author Erin Truesdell, Jason Smith
 */
app.factory('caiStudentModel', ['caiStudentHistoryModule', 'caiAnalysisModule', function (caiStudentHistoryModule, caiAnalysisModule) {


    function studentModel() {
        return {};
    }

    return {
        studentModel: studentModel
    };

}]);
