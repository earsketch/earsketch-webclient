/**
 * @fileOverview Angular modal-window view controller for account management. Members can be addressed with $scope.name from JS, or just with name from within the controller-bound HTML.
 * @module accountController
 */
import esconsole from '../esconsole'

app.controller("editProfileController", ['$scope', '$uibModalInstance', 'userProject', 'userNotification', function ($scope, $uibModalInstance, userProject, userNotification) {
    $scope.error = '';
    $scope.infoRequiredMessage = ESMessages.user.infoRequired;
    $scope.optional = true;

    userProject.getUserInfo().then(function (info) {
        if (info.hasOwnProperty('role')) {
            $scope.userrole = info.role;
        } else {
            $scope.userrole = 'student';
        }
        $scope.optional = $scope.userrole === 'student';
    });

    /**
     * Closes the current modal window.
     * @name cancel
     * @function
     */
    $scope.cancelEditProfile = function () {
        $uibModalInstance.close();
    };

    /**
     * @name updateProfile
     * @function
     */
    $scope.updateProfile = function () {
        var flagerr = true;

        var firstName = $scope.firstname.trim();
        var lastName = $scope.lastname.trim();
        var email = $scope.email;
        try {
            email = email.trim();
            $scope.error = '';
        } catch (error) {
            console.log(error);
            $scope.error = 'The provided E-mail address may be invalid.';
            return;
        }

        var formData = new FormData();
        formData.append('username', $scope.username);
        var codec = encodeURIComponent(btoa($scope.password));
        formData.append('password', codec);
        formData.append('firstname', firstName);
        formData.append('lastname', lastName);
        formData.append('email', email);

        var request = new XMLHttpRequest();
        request.open("POST", URL_DOMAIN+'/services/scripts/editprofile');

        request.timeout = 10000;
        request.ontimeout = function () {
            $scope.error = 'Error updating the user profile. Possible disconnection with the server.';
            $uibModalInstance.close();
        };

        request.onload = function () {
            flagerr = true;

            if (request.readyState === 4) {
                if (request.status === 200) {
                    $scope.$parent.firstname = $scope.firstname = firstName;
                    $scope.$parent.lastname = $scope.lastname = lastName;
                    $scope.$parent.email = $scope.email = email;

                    if (firstName !== '' && lastName !== '' && email !== '') {
                        var index = userNotification.history.findIndex(function (item) {
                            return item['notification_type'] === 'editProfile';
                        });

                        if (index !== -1) {
                            userNotification.history.splice(index, 1);
                        }
                    } else {
                        if ($scope.userrole === 'teacher') {
                            userNotification.show(ESMessages.user.teachersLink, 'editProfile');
                        }
                    }

                    flagerr = false;
                } else {
                    esconsole('Error updating profile', ['editProfile', 'error']);
                    $scope.error = ESMessages.user.emailConflict;
                    $scope.$apply();
                }
            } else {
                esconsole('Error updating user profile', ['editProfile', 'error']);
                $scope.error = 'There was an error when updating the user profile.';
                $scope.$apply();
            }

            if (!flagerr) {
                $scope.error = "";
                userNotification.show('Your user profile was updated!', 'success');
                $uibModalInstance.close();
            }
        };

        request.send(formData);
    };

    $scope.openChangePasswordModal = function () {
        $scope.changePassword();
        $uibModalInstance.close();
    };

    $scope.enterSubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.updateProfile();
        }
    };
}]);