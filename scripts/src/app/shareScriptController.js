import * as scripts from '../browser/scriptsState';
import * as tabs from '../editor/tabState';

/**
 * Angular controller for the share script modal dialog.
 * @module shareScriptCtroller
 */
app.controller("shareScriptController", ['$rootScope', '$scope', '$uibModalInstance', '$uibModal', '$location', '$timeout', '$window', 'userProject', 'script', 'quality', 'exporter', 'licenses', 'ESUtils', 'clipboard', 'userNotification', 'reporter', '$http', 'esconsole', 'colorTheme', 'collaboration', '$ngRedux', function($rootScope, $scope, $uibModalInstance, $uibModal, $location, $timeout, $window, userProject, script, quality, exporter, licenses, ESUtils, clipboard, userNotification, reporter, $http, esconsole, colorTheme, collaboration, $ngRedux) {

    $scope.sharelink = location.origin + location.pathname +'#?sharing=' + script.shareid;
    $scope.lockedShareLink = "";
    $scope.lockedShareId = "";
    $scope.showLockedShareLink = false;
    $scope.script = script;
    $scope.licenses = licenses;

    $scope.embeddingType = "both";
    $scope.embeddedIFrameCode = '<iframe width="600" height="400" src="'+$scope.sharelink+'&embedded=true"></iframe>';
    $scope.showCode = true;
    $scope.showDaw = true;
    $scope.selectEmbeddingType = function () {
        var embeddingOption = "";
        var embedHeight = "400";
        //some odd angular scope issues happening - "$scope.showCode/showDaw" from controller code not being changed, 
        //but "this.showCode/showDaw" reflects from value - uib-tab might have separate scope, see comment near "$scope.data=..."
        if(!this.showCode) embeddingOption += "&hideCode";
        if(!this.showDaw) embeddingOption += "&hideDaw";
        if(!this.showCode && !this.showDaw) embedHeight = "54";

        //TODO-standalone - make the iframe height 54px (same as transport control + title) if both daw and code are hidden
        // $scope.embeddedIFrameCode = `<iframe width="600" height="${embedHeight}" src="${$scope.sharelink}&embedded=true${embeddingOption}"></iframe>`;
        $scope.embeddedIFrameCode = '<iframe width="600" height="'+embedHeight+'" src="'+$scope.sharelink+'&embedded=true'+embeddingOption+'"></iframe>';
    };

    window.shareScriptScope = $scope;

    $scope.menus = {
        link: 0,
        collaboration: 1,
        embedded: 2,
        soundcloud: 3
    };

    $scope.menuDescriptions = {
        link: ESMessages.shareScript.menuDescriptions.viewOnly,
        collaboration: ESMessages.shareScript.menuDescriptions.collaboration,
        embedded: ESMessages.shareScript.menuDescriptions.embedded,
        soundcloud: ESMessages.shareScript.menuDescriptions.soundCloud
    };

    $scope.setPillFontColor = function () {
        if (colorTheme.get() === 'dark') {
            return 'white';
        } else {
            return 'black';
        }
    };

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

    $scope.activeMenu = $scope.menus.link;

    if (script.license_id) {
        $scope.data.selectedLicenseId = script.license_id;
    }

    $scope.toggleShowLockedShareLink = function () {
        $scope.showLockedShareLink = !$scope.showLockedShareLink;
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

    $uibModalInstance.result.then(function () {
        // modal successfully closed
        if ($scope.sc.message.animation) {
            clearInterval($scope.sc.message.animation);
        }
    }, function () {
        // modal dismissed - save unsaved description?
        if ($scope.sc.message.animation) {
            clearInterval($scope.sc.message.animation);
        }

        if (lastSavedScriptDesc !== $scope.data.scriptDesc) {
            // $scope.saveScriptDesc();
            // alert('The description was edited but not saved...');
        }
    });

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

        // #1858
        if ($scope[which].query === userProject.getUsername().toLowerCase()) {
            showErrorMessage('You cannot share scripts with yourself!', which);
            return null;
        }

        var url = URL_DOMAIN + '/services/scripts/searchuser';
        var opts = { params: {'query': $scope[which].query} };
        $http.get(url, opts)
            .then(function(result) {
                if (result.data.hasOwnProperty('created')) {
                    clearErrors(which);

                    // Fix letter cases if they are not all-lower-cases.
                    $scope[which].query = result.data.username;

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
            // #1858
            var newName = p.id.toLowerCase();
            if (unique.indexOf(newName) === -1) {
                unique.push(newName);
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

    //==================================================
    // items for sending view-only scripts
    $scope.viewers = {
        list: [],
        query: '', // current input value
        hasError: false, // for all list items
        errorMessage: '',
        ready: false // ready to share
    };

    $scope.sendViewOnlyScript = function () {
        if (!$scope.viewers.hasError) {
            $scope.saveScriptDesc();
            $scope.updateLicense();

            if ($scope.viewers.ready) {
                // reporter.share('link', $scope.licenses[$scope.selectedLicenseId].license);

                var users = [];

                $scope.viewers.list.forEach(function (username) {
                    users.push(username);
                });

                if ($scope.showLockedShareLink) {
                    userProject.shareWithPeople($scope.lockedShareId, users);
                } else {
                    userProject.shareWithPeople(script.shareid, users);
                }
                userNotification.show('Shared ' + script.name + ' as view-only with ' + users.map(function (user) { return user.id; }).join(', '));

                $scope.close();
            } else {
                if ($scope.viewers.query.length) {
                    alert(ESMessages.shareScript.preemptiveSave);
                } else {
                    $scope.close();
                }
            }
        }
    };

    //==================================================
    // collaboration menu
    $scope.collaborators = {
        list: [],
        query: '', // current input value
        hasError: false, // for all list items
        errorMessage: '',
        ready: false // ready to share
    };

    var numCollaboratorsCap = 8;

    $scope.allowEditing = script.hasOwnProperty('collaborators');

    $scope.manageCollaborators = function () {
        if (!$scope.collaborators.hasError) {
            var userName = userProject.getUsername();
            var existingUsersList = script.collaborators;

            var newUsersList = $scope.collaborators.list.map(function (user) {
                // #1858
                // return user.id.toLowerCase();
                return user.id;
            });

            var added = newUsersList.filter(function (m) {
                return existingUsersList.indexOf(m) === -1;
            });
            var removed = existingUsersList.filter(function (m) {
                return newUsersList.indexOf(m) === -1;
            });

            // update the remote script state
            collaboration.addCollaborators(script.shareid, userName, added);
            collaboration.removeCollaborators(script.shareid, userName, removed);

            // update the local script state
            script.collaborators = newUsersList;
            userProject.scripts[script.shareid] = script;

            // save license info for the collaboration mode as well
            userProject.setLicense(script.name, script.shareid, $scope.data.selectedLicenseId);

            script.collaborators = newUsersList;
            script.collaborative = newUsersList.length !== 0;

            // manage the state of tab if already open
            if (tabs.selectActiveTabID($ngRedux.getState()) === script.shareid) {
                if (existingUsersList.length === 0 && newUsersList.length > 0) {
                    if (!script.saved) {
                        userProject.saveScript(script.name, script.source_code)
                            .then(function () {
                                collaboration.openScript(script, userName);
                            })
                    } else {
                        collaboration.openScript(script, userName);
                    }
                } else if (existingUsersList.length > 0 && newUsersList.length === 0) {
                    collaboration.closeScript(script.shareid, userName);
                }
            }

            if ($scope.collaborators.ready) {
                $ngRedux.dispatch(scripts.syncToNgUserProject());
                $scope.close();
            } else {
                if ($scope.collaborators.query.length) {
                    alert(ESMessages.shareScript.preemptiveSave);
                } else {
                    $ngRedux.dispatch(scripts.syncToNgUserProject());
                    $scope.close();
                }
            }
        }
    };

    // auto-filling the existing collaborators
    // TODO: Watch for mixed-case bugs #1858
    if (script.hasOwnProperty('collaborators')) {
        $scope.collaborators.list = script.collaborators.map(function (userID) {
            return {
                id: userID,
                exists: true
            }
        });
    }

    //==================================================
    $scope.shareSoundCloud = function () {
        if (!$scope.sc.uploaded) {
            if ($scope.sc.options.name === '') {
                $scope.sc.message.show = true;
                $scope.sc.message.text = 'The song name cannot be empty!';
                $scope.sc.message.color = 'red';
            } else {
                $scope.sc.message.show = false;
                $scope.sc.message.color = 'transparent';
                $scope.shareToSoundCloud();
            }
        } else {
            $window.open($scope.sc.url, '_blank').focus();
            $scope.close();
        }
    };

    $scope.updateLicense = function () {
        userProject.setLicense(script.name, script.shareid, $scope.data.selectedLicenseId);
    };

    $scope.sc = {
        options: {
            name: $scope.script.name,
            sharing: 'public',
            downloadable: true,
            description: $scope.data.scriptDesc,
            tags: 'EarSketch',
            license: 'cc-by'
        },
        uploaded: false,
        url: '',
        userAccess: [
            'Private. Only visible to me.',
            'Public. Others can download and stream.',
            'Public. Others can only stream.'
        ],
        selectedUserAccess: 1,
        message: {
            show: false,
            spinner: false,
            text: '',
            color: 'transparent',
            animation: null
        }
    };

    $scope.shareToSoundCloud = function() {
        if ($scope.sc.selectedUserAccess === 0) {
            $scope.sc.options.sharing = 'private';
            $scope.sc.options.downloadable = true;
        } else if ($scope.sc.selectedUserAccess === 1) {
            $scope.sc.options.sharing = 'public';
            $scope.sc.options.downloadable = true;
        } else {
            $scope.sc.options.sharing = 'public';
            $scope.sc.options.downloadable = false;
        }

        $scope.saveScriptDesc();
        $scope.updateLicense();

        if ($scope.data.scriptDesc !== '') {
            $scope.sc.options.description = $scope.data.scriptDesc + '\n\n';
            $scope.sc.options.description += '-------------------------------------------------------------\n\n';
        }

        $scope.sc.options.description += ESMessages.idecontroller.soundcloud.description + '\n\n';
        $scope.sc.options.description += '-------------------------------------------------------------\n\n';
        $scope.sc.options.description += ESMessages.idecontroller.soundcloud.code + "\n\n" + $scope.script.source_code + '\n\n';
        $scope.sc.options.description += '-------------------------------------------------------------\n\n';
        $scope.sc.options.description += ESMessages.idecontroller.soundcloud.share + " " + $scope.sharelink + "\n\n";
        $scope.sc.options.description += '-------------------------------------------------------------\n\n';

$scope.sc.options.license = 'cc-' + $scope.licenses[$scope.data.selectedLicenseId].license.split(' ')[1].toLowerCase();

        exporter.soundcloud(script, quality, $scope.sc).then(function () {
            $scope.sc.message.show = true;
            $scope.sc.message.color = 'rgb(170,255,255,0.5)';
            $scope.sc.message.spinner = true;
            $scope.sc.message.text = 'UPLOADING';
            $scope.sc.message.animation = setInterval(function () {
                var numDots = Math.floor(new Date().getTime() / 1000) % 5 + 1;
                var dots = '';
                for (var i = 0; i < numDots; i++) {
                    dots += '.';
                }
                $scope.sc.message.text = 'UPLOADING' + dots;
                $scope.$digest();
            }, 1000);

            reporter.share('soundcloud', $scope.licenses[$scope.data.selectedLicenseId].license);

            $scope.$digest();
        }).catch(function (err) {
            userNotification.show('Error exporting to SoundCloud.', 'failure1');
            console.log(err);
        });
    };
}]);
