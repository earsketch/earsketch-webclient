/**
 * Angular controller for change-password services. Members can be addressed with $scope.name from JS, or just with name from within the controller-bound HTML.
 * @module changepasswordController
 */
import esconsole from '../esconsole'
import * as userConsole from './userconsole'
import * as userNotification from './userNotification'

app.controller("changepasswordController", ['$scope', '$uibModalInstance', 'userProject', function ($scope, $uibModalInstance, userProject) {
    $scope.pwError = "";

    /**
     * Closes the modal window.
     * @name cancel
     * @function
     */
    $scope.cancel = function () {
        $uibModalInstance.close();
    };

    /**
     * Checks and sends the password change request.
     * @name submitUser
     * @function
     */
    $scope.submitUser = function() {
        var oldpassword = $scope.oldpassword,
            newpassword = $scope.newpassword,
            passwordconfirm = $scope.passwordconfirm;

        var flagerr = false;

        if (!oldpassword || !newpassword || !passwordconfirm) {
            $scope.pwError = "One or more required fields has been left blank. Try again.";
        }


        if (newpassword !== passwordconfirm) {
            flagerr =true;
            esconsole('Password confirmation fail', 'warning');
            //userConsole.warn(ESMessages.changepassword.pwdfail);
            $scope.pwError = ESMessages.changepassword.pwdfail;
        }

        if (newpassword.length<5) {
            flagerr =true;
            esconsole('Password is too short', 'warning');
            //userConsole.warn(ESMessages.changepassword.pwdlength);
            $scope.pwError = ESMessages.changepassword.pwdlength;
        }

        if (!flagerr) {
            var pwd = oldpassword;
            var newpwd = newpassword;
            var encode = btoa(pwd);
            var pwdencode = encodeURIComponent(encode);
            encode = btoa(newpwd);
            var newpwdencode = encodeURIComponent(encode);

            var user = userProject.getUsername();

            var url = URL_DOMAIN+'/services/scripts/modifypwd?username='+user+'&password='+pwdencode+'&newpassword='+newpwdencode;
            esconsole('modifypwd url ... ' + url, 'info');
            var request = new XMLHttpRequest();
            request.open("GET",url,true);

            request.timeout = 10000;
            request.ontimeout = function () {
                userConsole.error(ESMessages.changepassword.timeout);

                angular.element('#download-loader').hide();
                userNotification.show('There was a connection timeout!', 'failure1');
                $uibModalInstance.close();
            };

            request.onload = function () {
                if (request.readyState === 4) {
                    if (request.status === 200) {//If it is OK
                        flagerr = false;
                        userProject.setPassword(newpwd);
                        esconsole('Changing Password Successfull...', 'info');
                    } else {
                        flagerr = true;
                        if (request.status === 401) {
                            esconsole('Error Changing Password ...', 'error');
                            esconsole(request.statusText, 'error');
                            //userConsole.error(ESMessages.changepassword.pwdauth);
                            $scope.pwError = ESMessages.changepassword.pwdauth;
                        } else {
                            esconsole('Error Changing Password  with status ' + request.status, 'error');
                            esconsole(request.statusText, 'error');
                            //userConsole.error(ESMessages.changepassword.commerror);
                            $scope.pwError = ESMessages.changepassword.commerror;
                        }
                        $scope.$apply(); //need to call this because request.onload is a non-angular event
                    }
                } else {//if fail
                    flagerr = true;
                    esconsole('Error Changing Password ....', 'error');
                    //userConsole.error(ESMessages.changepassword.commerror2);
                    $scope.pwError = ESMessages.changepassword.commerror2;
                }

                if (!flagerr) {
                    userNotification.show('Password Changed successfully!', 'success');
                    $uibModalInstance.close();
                } else {
                    //userNotification.show('Change Password failed! See console for details.', 'failure1');
                    //$scope.pwError = "Change Password failed! Try again.";
                }
                //$uibModalInstance.close();
            };
            request.send();
            esconsole('******CHANGE PASSWORD******', 'info');
        } else {
            //userNotification.show('Change Password failed! See console for details.', 'failure1');
            //$scope.pwError = "Change Password failed! Try again.";
            //$uibModalInstance.close();
        }
    };

    $scope.enterSubmit = function (event) {
        if (event.keyCode === 13) {
            $scope.submitUser();
        }
    }
}]);

