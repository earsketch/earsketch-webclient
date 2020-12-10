app.controller("analyzeScriptController", [
'$scope', '$uibModalInstance', 'reader', 'script',
function($scope, $uibModalInstance, reader, script) {

    $scope.script = script;

    $scope.analysis = script.name.endsWith('py') ? reader.analyzePython(script.source_code) : reader.analyzeJavascript(script.source_code);

    $scope.score = (function() {
      return reader.total($scope.analysis);
    })();

    $scope.close = function() {
        $uibModalInstance.close();
    };

}]);


