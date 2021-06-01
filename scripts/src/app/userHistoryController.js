import esconsole from '../esconsole'
import * as userProject from './userProject'

app.controller("userHistoryController", ['$scope', '$http', function($scope, $http) {

    /**
     * Parse shareids and return a history of versions of all scripts modified by the unique shared script authors
     */
    $scope.run = function() {
        $scope.history = [];
        $scope.processing = null;
        var USER_STATE_KEY = 'userstate';
        var username = userProject.getUsername();
        var password = JSON.parse(localStorage.getItem(USER_STATE_KEY)).password;

        var shareUrls = $scope.urls.split('\n');
        var re = /\?sharing=([^\s.,;$])+/g
        var matches = $scope.urls.match(re);

        // start with a promise that resolves immediately
        var p = new Promise(function (resolve) {
            resolve();
        });
        var userNames = [];

        angular.forEach(matches, function (match) {
            var shareId = match.substring(9);
            esconsole("ShareId: " + shareId, ['DEBUG']);
            p = p.then(function () {
                $scope.processing = shareId;
                userProject.loadScript(shareId).then(function (script) {
                    var author = script.username;
                    if(userNames.indexOf(author) < 0) {
                        $scope.getUserHistory(author, username, password);
                        userNames.push(author);
                    }
                });
            });
        });
    };

    $scope.getUserHistory = function(author, username, password){
        var url = URL_DOMAIN + '/services/scripts/userhistory';
        var payload = new FormData();
        payload.append('targetuser', author);
        payload.append('username', username);
        payload.append('password', password);
        var opts = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

        $http.post(url, payload, opts).then(function (result) {
            var scripts = result.data.scripts.map(function (obj) {
                obj.author = author;
                return obj;
            });
            $scope.history = $scope.history.concat(scripts);
            $scope.unauthorized = false;
        }, function (err) {
            $scope.unauthorized = true;
        });
    };
}]);
