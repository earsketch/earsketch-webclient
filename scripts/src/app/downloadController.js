import esconsole from '../esconsole'
import * as ESUtils from '../esutils'
import * as exporter from './exporter'
import * as userNotification from './userNotification'

app.controller("downloadController", ['$scope', '$uibModalInstance', '$uibModal', 'script', 'quality',
    function ($scope, $uibModalInstance, $uibModal, script, quality) {
        $scope.messages = ESMessages.download;

        $scope.script = script;
        $scope.scriptName = script.name;

        $scope.isSafari = ESUtils.whichBrowser().match('Safari') !== null;
        var dataUrlDl = null;

        $scope.cancel = function () {
            $uibModalInstance.dismiss();
        };

        $scope.saveToLocal = function () {
            exporter.text($scope.script);
        };

        $scope.saveMP3 = function () {
            angular.element("#download-loader").show();
            exporter.mp3(script, quality).then(function (data) {
                angular.element("#download-loader").hide();
                $uibModal.open({
                    templateUrl: 'templates/download-file.html',
                    controller: 'DownloadFileCtrl',
                    resolve: {
                        data: function () {
                            return data;
                        },
                        // TODO: may need modification in the future for safari file download problem
                        meta: function () {
                            return {
                                isSafari: false,
                                dataUrlDl: dataUrlDl
                            };
                        }
                    }
                });

            }).catch(function (err) {
                angular.element("#download-loader").hide();
                userNotification.show(err, 'failure1', 3);
            });
            $uibModalInstance.dismiss();
        };

        $scope.saveWAV = function () {
            angular.element("#download-loader").show();
            exporter.wav(script, quality).then(function (data) {
                angular.element("#download-loader").hide();

                $uibModal.open({
                    templateUrl: 'templates/download-file.html',
                    controller: 'DownloadFileCtrl',
                    resolve: {
                        data: function () {
                            return data;
                        },
                        // TODO: may need modification in the future for safari file download problem
                        meta: function () {
                            return {
                                isSafari: false,
                                dataUrlDl: dataUrlDl
                            };
                        }
                    }
                });

            }).catch(function (err) {
                angular.element("#download-loader").hide();
                userNotification.show(err, 'failure1', 3);
            });
            $uibModalInstance.dismiss();
        };

        $scope.saveMultiTrack = function () {
            angular.element("#download-loader").show();

            exporter.multiTrack(script, quality).then(function (data) {
                angular.element("#download-loader").hide();

                if ($scope.isSafari) {
                    dataUrlDl = function (base64) {
                        window.location = "data:application/zip;base64," + base64;
                    };
                }

                $uibModal.open({
                    templateUrl: 'templates/download-file.html',
                    controller: 'DownloadFileCtrl',
                    resolve: {
                        data: function () {
                            return data;
                        },
                        meta: function () {
                            return {
                                isSafari: $scope.isSafari,
                                dataUrlDl: dataUrlDl
                            }
                        }
                    }
                });
            }).catch(function (err) {
                esconsole(err, ['error', 'download']);
                angular.element("#download-loader").hide();
                userNotification.show(err, 'failure1', 3);
            });

            $uibModalInstance.dismiss();
        };
    }
]);

/**
 * @module DownloadFileCtrl
 */
app.controller('DownloadFileCtrl', ['$scope','$uibModalInstance','data','meta',
               function($scope,$uibModalInstance,data,meta) {

    $scope.data = data;
    $scope.meta = meta;
    $scope.safariMessage = ESMessages.download.safari_zip;

    /**
     * Closes the modal instance.
     * @name cancel
     * @function
     */
    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    }
}]);
