/**
 * Angular controller for the create script modal dialog.
 * @module createScriptCtrl
 */
import * as userProject from './userProject'

app.controller("CreateScriptCtrl", [
'$scope', '$uibModalInstance', 'language',
function($scope, $uibModalInstance, language) {

    $scope.name = '';
    $scope.error = '';

    if (language === 'python') {
        $scope.extension = '.py';
    } else {
        $scope.extension = '.js';
    }

    $scope.cancel = function() {
        $uibModalInstance.dismiss();
    };

    $scope.confirm = function() {
        // check for valid names
        if ($scope.name.length < 3) {
            $scope.error = ESMessages.general.shortname;
            return;
        }
        if ($scope.name.match(/[$-/:-?{-~!"^#`\[\]\\]/g)) {
            $scope.error = ESMessages.idecontroller.illegalname;
            return;
        }

        var fullname = $scope.name + $scope.extension;
        // check for conflicts
        for (var i in userProject.scripts) {
            if (userProject.scripts.hasOwnProperty(i)) {
                if (userProject.scripts[i].name === fullname) {
                    $scope.error = ESMessages.idecontroller.overwrite;
                    return;
                }
            }
        }
        $uibModalInstance.close($scope.name + $scope.extension);
    };

    $scope.enterKeySubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.confirm();
        }
    };
}]);

app.directive('focus', function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {

            element.bind('keydown', function(e) {
                var code = e.keyCode || e.which;
                if (code === 13) {
                    // e.preventDefault();
                    document.querySelectorAll("[tabindex='"+(parseInt(attrs.tabindex)+1)+"']")[0].focus();
                }
            });
        }
    }
});
