/**
/**
 * Angular controller for admin services. Members can be addressed with $scope.name from JS, or just with name from within the controller-bound HTML.
 * @module adminWindowController
 */

import esconsole from '../esconsole'
import * as websocket from './websocket'

app.controller("adminwindowController", ['$scope', '$confirm', '$uibModalInstance', 'userProject', '$http', function ($scope, $confirm, $uibModalInstance, userProject, $http) {

    userProject.getAllUserRoles().then(function(users) {
        $scope.users = users;
        $scope.loggedInUser = userProject.getUsername();
    });
    $scope.newuser = '';

    // TODO: put these into the broadcasts object below as "general"
    $scope.broadcastMessage = '';
    $scope.broadcastLink = '';
    $scope.broadcastExpiration = '';

    $scope.broadcasts = {
        teachers: {
            message: '',
            link: '',
            expiration: ''
        }
    };

    $scope.roles = {
        teacher: 'teacher',
        admin: 'admin'
    };

    $scope.selectedRole = $scope.roles.teacher;

    $scope.changeSelectedRole = function(role) {
        $scope.selectedRole = role;
    };

      /**
       * @param id {string}
       * @returns promise
       */
    function checkIdExists(id) {
          var url = URL_DOMAIN + '/services/scripts/searchuser';
          var opts = { params: {'query': id} };
          return $http.get(url, opts);
      }

    $scope.addRole = function () {
        checkIdExists($scope.newuser).then(function (result) {
            if (result.data.hasOwnProperty('created')) {
                userProject.addRole($scope.newuser,$scope.selectedRole).then(function(user) {
                    if (user) {
                        $scope.users.push(user);
                    }
                    $scope.newuser = '';
                });
            } else {
                esconsole('The user ID does not exist!', ['admin', 'error']);
            }
        });
    };

    $scope.removeRole = function (user,role) {
        $confirm({text: "Are you sure you want to remove the given user's role?", ok: "Remove"}).then(function () {
            checkIdExists(user).then(function (result) {
                if (result.data.hasOwnProperty('created')) {
                    userProject.removeRole(user,role).then(function(deletedUser) {
                        angular.forEach ($scope.users, function(user,key) {
                            if (user.username === deletedUser.username && user.role === deletedUser.role) {
                                $scope.users.splice(key,1);
                            }
                        });
                    });
                } else {
                    esconsole('The user ID does not exist!', ['admin', 'error']);
                }
            });
        });
    };

    $scope.sendBroadcast = function () {
        websocket.broadcast($scope.broadcastMessage, userProject.getUsername(), $scope.broadcastLink, $scope.broadcastExpiration);
    };

    $scope.sendTeacherBroadcast = function () {
        esconsole('sending a teacher broadcast', 'admin');
        websocket.broadcast($scope.broadcasts.teachers.message, userProject.getUsername(), $scope.broadcasts.teachers.link, $scope.broadcasts.teachers.expiration, 'teacher_broadcast');
    };

    /**
     * Closes the modal window.
     * @name cancel
     * @function
     */
    $scope.cancel = function () {
        $uibModalInstance.close();
    };

    //============== admin password reset UI ================
    $scope.userToReset = {
        exists: false,
        id: '',
        name: '',
        email: '',
        newPassword: ''
    };
    $scope.adminPassphrase = '';
    $scope.showPasswordResetResult = false;
    $scope.passwordResetResult = '';

    $scope.queryId = function () {
        var id = $scope.userToReset.id;
        var url = URL_DOMAIN + '/services/scripts/searchuser';
        var opts = { params: {'query': id} };
        $http.get(url, opts).then(function (result) {
            if (result.data.hasOwnProperty('created')) {
                $scope.userToReset.name = result.data.first_name + ' ' + result.data.last_name;
                $scope.userToReset.email = result.data.email;
                $scope.userToReset.exists = true;
            } else {
                console.log('user does not exist');
                $scope.userToReset.exists = false;
            }
            return result.data;
        }, function (err) {
            esconsole(err, ['DEBUG','ERROR']);
        });
    };

    $scope.callQueryId = function ($event) {
        if ($event.keyCode === 13) {
            $scope.queryId();
        }
    };

    $scope.requestPasswordResetEmailForUser = function () {
        if ($scope.userToReset.email === '') {
            return null;
        }

        var email = $scope.userToReset.email;
        var url = URL_DOMAIN+'/services/scripts/resetpwd?email='+email;
        $http.get(url, {}).then(function (result) {
            // TODO: notify success / failure.
        }, function (err) {
            esconsole(err, ['DEBUG', 'ERROR']);
        });
    };

    $scope.setNewPasswordForUser = function () {
        $scope.showPasswordResetResult = false;

        if (!$scope.userToReset.exists || $scope.userToReset.newPassword === '') {
            return null;
        }
        
        userProject.setPasswordForUser($scope.userToReset.id, $scope.userToReset.newPassword, $scope.adminPassphrase).then(function () {
            $scope.showPasswordResetResult = true;
            $scope.passwordResetResult = 'Successfully set a new password for user: ' + $scope.userToReset.id + ' with password: ' + $scope.userToReset.newPassword;
            $scope.$applyAsync();
        }).catch(function () {
            $scope.showPasswordResetResult = true;
            $scope.passwordResetResult = 'Error setting a new password for user: ' + $scope.userToReset.id;
            $scope.$applyAsync();
        });
    };

    $scope.callSetNewPassword = function ($event) {
        if ($event.keyCode === 13) {
            $scope.setNewPasswordForUser();
        }
    };
}]);

