import * as sounds from '../browser/soundsState';
import * as userNotification from './userNotification';

app.controller("renameController", ['$scope', '$uibModalInstance', 'userProject', 'script', 'reporter', 'collaboration', function ($scope, $uibModalInstance, userProject, script, reporter, collaboration) {
    $scope.scriptName = script.name.replace(/.([^.]*)$/, '');
    $scope.extension = script.name.replace(/^(.+)(\.[^.]*)$/, '$2');
    $scope.oldScriptName = script.name.replace(/.([^.]*)$/, '');
    $scope.error = '';

    $scope.accept = function () {
        if ($scope.scriptName.match(/[$-/:-?{-~!"^#`\[\]\\]/g)) {
            $scope.error = ESMessages.idecontroller.illegalname;
            return;
        }
        var fullname = $scope.scriptName + $scope.extension;

        // check for conflicts
        for (var i in userProject.scripts) {
            if (userProject.scripts.hasOwnProperty(i)) {
                if (!userProject.scripts[i].soft_delete && userProject.scripts[i].name === fullname) {
                    $scope.error = ESMessages.idecontroller.overwrite;
                    return;
                }
            }
        }

        if (script.collaborative) {
            collaboration.renameScript(script.shareid, fullname, userProject.getUsername());
            reporter.renameSharedScript();
        }

        script.name = fullname;
        $uibModalInstance.close(script);
    };

    $scope.close = function () {
        $uibModalInstance.close(script);
    };

    $scope.enterKeySubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.accept();
        }
    };
}]);

app.controller("renameSoundController", ['$scope','$uibModalInstance','sound','userProject','esconsole','$ngRedux', function ($scope,$uibModalInstance,sound,userProject,esconsole,$ngRedux) {
    $scope.artist = sound.artist;
    $scope.username = userProject.getUsername().toUpperCase();
    // memo
    // file_key: the target audio key to rename
    // soundkey: the new name for the audio key

    if (sound.file_key.indexOf($scope.username) === 0) {
        // if username exists in the file, remove it along with the trailing _
        $scope.soundKey = sound.file_key.slice($scope.username.length+1);
    } else {
        $scope.soundKey = sound.file_key;
    }

    $scope.accept = function () {
        var specialCharReplacedFlag = false;
        if ($scope.soundKey.match(/[^\w\s]/g) !== null) {
            specialCharReplacedFlag = true;
        }
        $scope.soundKey = $scope.soundKey.replace(/[^\w]/g, '_'); // replace white spaces and special characters
        $scope.soundKey = $scope.soundKey.replace(/\_+/g, '_'); // consolidate underscores
        $scope.soundKey = $scope.soundKey.toUpperCase();
        if ($scope.soundKey[$scope.soundKey.length-1] === '_') {
            $scope.soundKey = $scope.soundKey.slice(0, -1); // remove trailing underscore
        } else if ($scope.soundKey[0] === '_') {
            $scope.soundKey = $scope.soundKey.slice(1); // remove leading underscore
        }

        if ($scope.soundKey === '') {
            userNotification.show(ESMessages.general.renameSoundEmpty, 'failure1');
            $uibModalInstance.close();
            return null;
        }

        esconsole('Renaming sound from ' + sound.file_key + ' to ' + $scope.soundKey, ['debug', 'renamesound']);

        if (specialCharReplacedFlag) {
            userNotification.show(ESMessages.general.renameSoundSpecialChar, 'failure1');
        }

        if (sound.file_key.indexOf($scope.username) === 0) {
            // if username existed in the original file name, add it back with an _
            userProject.renameAudio(
                sound.file_key, $scope.username + '_' + $scope.soundKey
            ).then(function () {
                const oldName = sound.file_key;
                const newName = $scope.username + '_' + $scope.soundKey;
                $ngRedux.dispatch(sounds.renameLocalUserSound({ oldName, newName }));
                $uibModalInstance.close();
            });
        } else {
            userProject.renameAudio(sound.file_key, $scope.soundKey)
                .then(function () {
                    $uibModalInstance.close();
                });
        }
    };

    $scope.close = function () {
        $uibModalInstance.dismiss();
    };

    $scope.enterKeySubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.accept();
        }
    };
}]);
