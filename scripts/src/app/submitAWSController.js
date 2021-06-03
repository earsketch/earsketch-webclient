/**
 * Angular controller for the AWS submission script modal dialog.
 * @module submitAWSController
 */
import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as exporter from './exporter'
import reporter from './reporter'
import * as userNotification from './userNotification'
import * as userProject from './userProject'

app.controller("submitAWSController", ['$scope', '$uibModalInstance', 'script', 'licenses', 'clipboard', '$http', '$ngRedux', function($scope, $uibModalInstance, script, licenses, clipboard, $http, $ngRedux) {

    $scope.sharelink = location.origin + location.pathname +'#?sharing=' + script.shareid;
    $scope.lockedShareLink = "";
    $scope.lockedShareId = "";
    $scope.showLockedShareLink = true;
    $scope.script = script;
    $scope.licenses = licenses;

    $scope.embeddingType = "both";
    $scope.embeddedIFrameCode = '<iframe width="600" height="400" src="' + $scope.sharelink + '&embedded=true"></iframe>';
    $scope.showCode = true;
    $scope.showDaw = true;
    $scope.selectEmbeddingType = function(){
        var embeddingOption = "";
        var embedHeight = "400";
        //some odd angular scope issues happening - "$scope.showCode/showDaw" from controller code not being changed, 
        //but "this.showCode/showDaw" reflects from value - uib-tab might have separate scope, see comment near "$scope.data=..."
        if(!this.showCode) embeddingOption += "&hideCode";
        if(!this.showDaw) embeddingOption += "&hideDaw";
        if(!this.showCode && !this.showDaw) embedHeight = "54";

        //TODO-standalone - make the iframe height 54px (same as transport control + title) if both daw and code are hidden
        $scope.embeddedIFrameCode = '<iframe width="600" height="' + embedHeight + '" src="' + $scope.sharelink + '&embedded=true' + embeddingOption + '"></iframe>';
    }

    window.shareScriptScope = $scope;

    $scope.setPillFontColor = function () {
        if ($ngRedux.getState().app.colorTheme === 'dark') {
            return 'white';
        } else {
            return 'black';
        }
    };

    $scope.updatePopulyLink = function () {
        window.open("https://rocketjudge.com/register/poRnymQW#scriptid=".concat($scope.lockedShareId));
    }

    userProject.getLockedSharedScriptId(script.shareid).then(function(result) {
        $scope.lockedShareLink = location.origin + location.pathname +'#?sharing=' + result;
        $scope.lockedShareId = result;
    });

    // uib-tab may be creating a child scope that is separate from this parent scope. I will create an object property (reference) for the child scope model.
    $scope.data = {
        scriptDesc: script.description,
        selectedLicenseId: 1
    };

    var lastSavedScriptDesc = script.description;

    if (script.license_id) {
        $scope.data.selectedLicenseId = script.license_id;
    }

    $scope.toggleShowLockedShareLink = function () {
        $scope.showLockedShareLink = true;
    };

    $scope.getLicenseLink = function (id) {
        var name = $scope.licenses[id].license;
        var link = 'https://creativecommons.org/licenses/';
        var type = name.split(' ')[1];

        if (typeof(type) !== 'undefined') {
            link = link + type.toLowerCase() + '/4.0';
        }

        return link;
    };

    $scope.saveScriptDesc = function() {
        userProject.setScriptDesc(script.name, script.shareid, $scope.data.scriptDesc);
        lastSavedScriptDesc = $scope.data.scriptDesc;
    };

    $scope.close = function() {
        $uibModalInstance.dismiss();
    };

    $scope.save = function () {
        $scope.saveScriptDesc();
        $scope.updateLicense();
    };

    $scope.shareLinkDone = function () {
        $scope.saveScriptDesc();
        $scope.updateLicense();

        reporter.share('link', $scope.licenses[$scope.data.selectedLicenseId].license);

        if ($scope.showLockedShareLink) {
            clipboard.copyText($scope.lockedShareLink);
        } else {
            clipboard.copyText($scope.sharelink);
        }
        userNotification.show('Share link copied!');
        $scope.close();
    };

    $scope.downloadShareUrl = function () {
        var url = $scope.showLockedShareLink ? $scope.lockedShareLink : $scope.sharelink;
        var textContent = '[InternetShortcut]\n' + 'URL=' + url + '\n' + 'IconIndex=0';
        exporter.text({
            name: $scope.script.name + '.url',
            source_code: textContent
        });
    };

    //==================================================
    // stuff for view-only and collaborative share
    // param "which" is either 'viewers' or 'collaborators'
    $scope.processQueryInput = function ($event, which) {
        if ($event.keyCode === 13) {
            $scope.queryId(which); // asynchronous
        } else if ($event.keyCode === 8) {
            // delete key removes list item
            if ($scope[which].query === '') {
                $scope[which].list.pop();
                checkAllForErrors(which);
                checkIfReady(which);
            }
        } else if ($event.keyCode === 32) {
            $scope.queryId(which);
        }
    };

    $scope.queryId = function (which) {
        /*
         * TODO: set max list length?
         */

         $scope[which].query = $scope[which].query.toLowerCase();

        if ($scope[which].query === '') {
            return null;
        } else if ($scope[which].query.replace(/\s+/, '').length === 0) {
            return null;
        }

        if (ESUtils.checkIllegalCharacters($scope[which].query)) {
            showErrorMessage(ESMessages.general.illegalCharacterInUserID, which);
            return null;
        }

        if ($scope[which].query === userProject.getUsername()) {
            showErrorMessage('You cannot share scripts with yourself!', which);
            return null;
        }

        var url = URL_DOMAIN + '/services/scripts/searchuser';
        var opts = { params: {'query': $scope[which].query} };
        $http.get(url, opts)
            .then(function(result) {
                if (result.data.hasOwnProperty('created')) {
                    clearErrors(which);

                    $scope[which].list.push({
                        id: $scope[which].query,
                        exists: true
                    });

                    checkQueryDuplicates(which);
                    $scope[which].query = '';

                    checkIfReady(which);
                } else {
                    showErrorMessage('That user ID does not exist.', which);

                    $scope[which].list.push({
                        id: $scope[which].query,
                        exists: false
                    });
                    $scope[which].query = '';
                }
                return result.data;
            }, function(err) {
                esconsole(err, ['DEBUG','ERROR']);
            });

        // $scope.viewers.list.push($scope.viewers.query);
        // $scope.viewers.query = '';
    };

    function checkAllForErrors(which) {
        clearErrors(which);

        if ($scope[which].list.some(function (p) {
                return !p.exists;
            })) {
            showErrorMessage('There might be invalid IDs in the list.', which);
            return null;
        }
        checkQueryDuplicates(which);
    }

    function checkQueryDuplicates(which) {
        var unique = [];
        $scope[which].list.forEach(function (p) {
            if (unique.indexOf(p.id) === -1) {
                unique.push(p.id);
            }
        });

        if (unique.length !== $scope[which].list.length) {
            showErrorMessage('There might be duplicate IDs in the list.', which);
        }
    }

    function showErrorMessage(message, which) {
        $scope[which].hasError = true;
        $scope[which].errorMessage = message;
        $scope[which].ready = false;
    }

    function clearErrors(which) {
        $scope[which].hasError = false;
        $scope[which].errorMessage = '';
        $scope[which].ready = false;
    }

    function checkIfReady(which) {
        $scope[which].ready = $scope[which].list.length > 0 && !$scope[which].hasError;
    }

    $scope.removeId = function (index, which) {
        $scope[which].list.splice(index, 1);
        checkAllForErrors(which);
    };

}]);
