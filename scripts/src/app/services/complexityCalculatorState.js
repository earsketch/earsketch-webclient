/*
 * An angular factory for managing the state of the complexity calculator service.
 *
 * @module complexityCalculator
 * @author Jason Smith, Erin Truesdell
 */
app.factory('complexityCalculatorState', ['userNotification', function (userNotification) {

    var state = {
        allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [], originalityLines: [], loopLocations: [], functionLines: [], uncalledFunctionLines: [], userFunctionParameters: [], makeBeatRenames: [], userFunctionRenames: [], forLoopFuncs: []
    };

    function resetState() {
        state = {
            allVariables: [], apiCalls: [], allCalls: [], allConditionals: [], variableAssignments: [], originalityLines: [], loopLocations: [], functionLines: [], uncalledFunctionLines: [], userFunctionParameters: [], makeBeatRenames: [], userFunctionRenames: [], forLoopFuncs: []
        };
    }

    function getState() {
        return {};
    }

    function getStateProperty(propertyName) {
        return (propertyName in state) ? state[propertyName] : [];
    }





    return {
        getState: getState,
        getStateProperty: getStateProperty,
        resetState: resetState
    };
}]);
