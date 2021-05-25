/*
 * An angular factory for managing the state of the complexity calculator service.
 *
 * @module complexityCalculator
 * @author Jason Smith, Erin Truesdell
 */
app.factory('complexityCalculatorState', ['userNotification', 'complexityCalculatorHelperFunctions', function (userNotification, complexityCalculatorHelperFunctions) {

    function getState() {
        return {};
    }

    return {
        getState: getState
    };
}]);
