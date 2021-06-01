import * as collaboration from './collaboration'
import * as compiler from './compiler'
import * as ESUtils from '../esutils'
import reporter from './reporter'
import * as tabs from '../editor/tabState';
import * as scripts from '../browser/scriptsState';

app.controller("scriptVersionController", ['$scope', '$uibModalInstance', 'script', 'userProject', 'allowRevert', '$ngRedux', function ($scope, $uibModalInstance, script, userProject, allowRevert, $ngRedux) {
    $scope.script = script;
    $scope.allowRevert = allowRevert;

    $scope.history = undefined;
    $scope.currentTime = Date.now();

    $scope.compiling = false;
    $scope.compiledResult = undefined;

    /**
     * The id (not index) of the script that is active in the history.
     */
    $scope.active = 1;

    /**
     * The version of the script to compare changes against.
     */
    $scope.original = undefined;

    /**
     * The "modified" version of the script of changes to compare.
     */
    $scope.modified = undefined;

    $scope.loadingScript = true;

    userProject.getScriptHistory(script.shareid).then(function(result) {
        $scope.history = result;
        $scope.setActiveVersion(result[result.length-1].id);
    });

    $scope.close = function() {
        $uibModalInstance.close();
    };

    /**
     * Reverts a script to a previous version from the version history.
     */
    $scope.revertScript = function(version) {
        userProject.getScriptVersion($scope.script.shareid, String(version)).then(function(result) {
            var sourceCode = result[0].source_code;

            if ($scope.script.collaborative) {
                collaboration.reloadScriptText(sourceCode);
                collaboration.saveScript();
            } else {
                // Replace code with reverted version
                userProject.scripts[$scope.script.shareid].source_code = sourceCode;
                // Force save
                var p = userProject.saveScript($scope.script.name, sourceCode, true, result[0].run_status);

                p.then(function() {
                    // TODO: this really isn't ideal
                    // //close the script and then reload to reflect latest changes
                    $ngRedux.dispatch(scripts.syncToNgUserProject());

                    if (tabs.selectOpenTabs($ngRedux.getState()).includes(script.shareid)) {
                        tabs.deleteEditorSession(script.shareid);

                        if (script.shareid === tabs.selectActiveTabID($ngRedux.getState()))
                        $ngRedux.dispatch(tabs.setActiveTabAndEditor(script.shareid));
                    }
                });
            }

            $scope.close();
        });
        reporter.revertScript();
    };

    /**
     * Set the version of the active script specified by version.
     *
     * @returns {Promise} A promise that resolves to the script at the specified
     * version.
     */
    $scope.setActiveVersion = function(version) {
        $scope.active = version;
        $scope.compiledResult = undefined;
        var prev = version - 1;

        $scope.loadingScript = true;
        return userProject.getScriptVersion($scope.script.shareid, String(version))
            .then(function(result) {
                // TODO: Why is result an array?
                $scope.original = result[0];

                // If there are older scripts, compare them.
                if (prev > 0) {
                    return userProject.getScriptVersion($scope.script.shareid, String(prev));
                } else {
                    return undefined;
                }
            }).then(function(result) {
                if (result === undefined) {
                    $scope.modified = $scope.original;
                } else {
                    $scope.modified = result[0];
                }
                $scope.loadingScript = false;

                return $scope.original;
            });
    };

    /**
     * Run the script at a version.
     *
     * @returns {Promise} A promise that resolves to the compiled result or
     * rejects to a compilation error.
     */
    $scope.runVersion = function(version) {
        $scope.compiling = true;

        $scope.setActiveVersion(version).then(function(script) {
            var language = ESUtils.parseLanguage(script.name);
            var p;
            if (language === "python") {
                // TODO: pass in audio quality
                p = compiler.compilePython(script.source_code, 0);
            } else {
                p = compiler.compileJavascript(script.source_code, 0);
            }
            return p.then(function(result) {
                $scope.compiledResult = result;
                $scope.compiling = false;
                return result;
            });
        });
    };

    /**
     * Close open instances of the DAW and return to the script view.
     */
    $scope.closeDaw = function() {
        $scope.compiling = false;
        $scope.compiledResult = undefined;
    };

    $scope.parseActiveUsers = function (activeUsers) {
        if (typeof(activeUsers) === 'string') {
            return activeUsers;
        } else if (Array.isArray(activeUsers)) {
            return activeUsers.join(', ');
        } else {
            return activeUsers;
        }
    };
}]);
