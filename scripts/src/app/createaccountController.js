/**
 * @fileOverview Angular modal-window view controller for account management. Members can be addressed with $scope.name from JS, or just with name from within the controller-bound HTML.
 * @module accountController
 */
app.controller("accountController", ['$scope','$uibModalInstance','userConsole','userNotification', function ($scope, $uibModalInstance, userConsole, userNotification) {
    /**
     * Closes the current modal window.
     * @name cancel
     * @function
     */

    $scope.error = "";

    $scope.cancel = function () {
        $uibModalInstance.close();
    };

    var firstname,lastname,username,password,passwordconfirm,email;

    /**
     * Checks the UI fields.
     * @name isFormValid
     * @function
     */
    $scope.isFormValid = function () {
        firstname = $scope.firstname;
        lastname = $scope.lastname;
        username = $scope.username;
        password = $scope.password;
        passwordconfirm = $scope.passwordconfirm;
        email = $scope.email;

        try {
            if (typeof(username) === 'undefined') {
                esconsole('Username Invalid ...', 'warning');
                $scope.error = ESMessages.createaccount.usernameinvalid;
                return false;
            } else {
                var jsstr = username+'=5';
                esconsole(jsstr, 'debug');
                eval(jsstr);
            }
        } catch(err) {
            esconsole('Username Invalid ...', 'warning');
            $scope.error = ESMessages.createaccount.usernameinvalid;
            return false;
        }

        if (username.length > 25) {
            esconsole('Username length is too long, try with a shorter username', 'warning');
            $scope.error = ESMessages.createaccount.usernamelength;
            return false;
        }

        if (!password) {
            esconsole('Please enter password before creating user', 'warning');
            $scope.error = ESMessages.createaccount.nopwd;
            return false;
        }
      
        if (password.length < 5) {
            esconsole('Password is too short', 'warning');
            $scope.error = ESMessages.createaccount.pwdlength;
            return false;
        
        }

        if (password !== passwordconfirm) {
            esconsole('Password confirmation fail', 'warning');
            $scope.error = ESMessages.createaccount.pwdfail;
            return false;
        }


        // var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        // //if (!re.test(email)) {
        // if (userForm.email.$invalid) {
        //     esconsole('Email is not valid', 'warning');
        //     $scope.error = ESMessages.createaccount.emailinvalid;
        //     return false;
        // }

        return true;
    };

    /**
     * Sends the create-account request.
     * @name submitUser
     * @function
     */
    $scope.submitUser = function() {
        $scope.error = "Please wait...";
        var flagerr = true;

        if ($scope.isFormValid()) {
            //Create Multipart Form Data
            var formData = new FormData();

            formData.append('username', username);
            formData.append('email', email);
            var encode = btoa(password);
            var pwdencode = encodeURIComponent(encode);
            formData.append('password', pwdencode);
            formData.append('first_name', firstname);
            formData.append('last_name', lastname);
            formData.append('image_url', 'http://earsketch.gatech.edu/media/img/profileImg/1.png');
            formData.append('description', 'EarSketch User');
            formData.append('favorite_artists', 'Richard Devine Young Guru');


            var request = new XMLHttpRequest();


            esconsole('Creating User ... ', 'debug');


            request.open("POST", URL_DOMAIN+'/services/scripts/signin');


            request.timeout = 10000;
            request.ontimeout = function () {
                userConsole.error(ESMessages.createaccount.timeout);
                userConsole.displayStatus('.timeoutFailure');
                $uibModalInstance.close();
            };

            request.onload = function () {
                flagerr = true;
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        var jsonData = JSON.parse(request.responseText);
                        if (jsonData.state === 0) {
                            flagerr = false;
                            esconsole('Creating User Successfull...', 'info');
                            userConsole.log(ESMessages.createaccount.accountsuccess);
                            esconsole('Calling LOGIN from createaccount...', 'info');
                            $scope.$parent.username = username;
                            $scope.$parent.password = password;
                            $scope.$parent.openShareAfterLogin();
                            $scope.$parent.login();
                        } else {
                            esconsole('Error Creating User: ' + jsonData.description, 'error');
                            if (jsonData.description === "useralreadyexists") {
                                $scope.error = ESMessages.createaccount.useralreadyexists;
                                $scope.$apply();
                            }
                        }
                    } else {
                        esconsole('Error Creating User...', 'error');
                        esconsole(request.statusText, 'error');
                        //TODO: These messages shouldnt be printed to console. Move to notifications later
                        userConsole.error(ESMessages.createaccount.commerror);
                    }
                } else {
                    esconsole('Error Creating User...', 'error');
                    //TODO: These messages shouldnt be printed to console. Move to notifications later
                    userConsole.error(ESMessages.createaccount.commerror2);
                }

                if (!flagerr) {
                    $scope.error = "";
                    userNotification.show('Account Created successfully!', 'success');
                    $uibModalInstance.close();
                } else {
                    // userNotification.show('Create Account failed! See console for details.', 'failure1');
                }
            };

            request.send(formData);
            esconsole('******CREATE USER******', 'info');
        } else {
            // userNotification.show('Create Account failed! See console for details.', 'failure1');
            // $uibModalInstance.close();
        }
    };
}]);

