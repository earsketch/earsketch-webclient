import esconsole from '../esconsole'

app.controller("forgotpasswordController", ['$scope', '$uibModalInstance', 'userNotification',
  function($scope, $uibModalInstance, userNotification) {

    /**
     * Closes the modal window
     * @name cancel
     * @function
     */
    $scope.cancel = function(){
        $uibModalInstance.close();
    };

    /**
     * @name submitPassRequest
     * @function
     */
    $scope.submitPassRequest = function(){
        // var formData = new FormData();
        //formData.append('username', $scope.email);

        var email = encodeURIComponent($scope.email);

        var url = URL_DOMAIN+'/services/scripts/resetpwd?email='+email;
        //ESUtilsConsoleLog('submitPassRequest with' + url ,"ES_info",false,true,false);


        var request = new XMLHttpRequest();
        request.open("GET",url,true);
        request.onload = function () {
            var flagerr = true;
            if (request.readyState === 4) {
                if (request.status === 200) {
                    flagerr = false;
                    esconsole('submitPassRequest success', 'info');
                    esconsole(ESMessages.forgotpassword.success, 'INFO');
                }
            }

            if(flagerr){
                esconsole('submitPassRequest fail', 'info');
                esconsole(ESMessages.forgotpassword.fail, 'INFO');
            }

            if(!flagerr){
                userNotification.show('Please check your e-mail for a message from EarSketch to reset your password.', 'success', 3.5);
            }
            else{
                userNotification.show('The e-mail address you entered is not valid or is not associated with an EarSketch account.', 'failure1', 3.5);
            }
        };
        request.send();
        $uibModalInstance.close();
    };

}]);

