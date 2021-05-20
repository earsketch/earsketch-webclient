// Global imports of CSS
import '../../css/earsketch/allstyles.less'
import './tailwind.css';

import store from './reducers';

require('jquery');
require('jqueryUI');
window.$ = $; // Groove-machine curriculum chapter needs a global $ object.
window.Question = Question; // Used inside curriculum HTMLs.

import 'angularjs-slider/dist/rzslider.css';
import '../../fonts/icomoon_ultimate/style.css';

import * as ace from 'ace-builds';
// ace.config.set('basePath', 'dist');

import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-chrome';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/ext-language_tools';

// NOTE: This bloats the webpack output
// import 'ace-builds/webpack-resolver';

// https://github.com/ajaxorg/ace/blob/master/demo/webpack/demo.js#L12
import jsWorkerUrl from "file-loader!aceJsWorker"; // Includes ES APIs.
ace.config.setModuleUrl("ace/mode/javascript_worker", jsWorkerUrl);

import * as helpers from './helpers'
import esconsole from './esconsole'
import * as ESUtils from './esutils'
import ES_PASSTHROUGH from './api/passthrough'

// TODO: Remove this after resolving issues with earsketch.py.js, earsketch.js.js.
window.ES_PASSTHROUGH = ES_PASSTHROUGH

// TODO: Temporary workaround for autograders 1 & 3, which replace the prompt function.
// (This was previously in userConsole, but since that's now a module, the fields are read-only.)
// (Also, it doesn't really have anything to do with the user console.)
window.esPrompt = msg => {
    const $uibModal = helpers.getNgService('$uibModal')
    var modal = $uibModal.open({
        templateUrl: 'templates/prompt.html',
        controller: 'PromptController',
        resolve: {
            msg: function() { return msg }
        },
    })

    return modal.result
}

Object.assign(window,require('setup'));
Object.assign(window,require('dsp'));
Object.assign(window,require('esDSP'));
Object.assign(window,require('ccSamples'));

// Async loading
require(['angular'], () => {
    // NPM
    require('angular-ui-router');
    require('bootstrapBundle');
    require('uiBootstrap');
    require('angular-animate');
    require('ng-file-upload');
    require('ngClipboard');
    require('angular-confirm');
    require('angularjs-slider');
    require('tabdrop');
    require('ng-redux');

    // vendor files
    require('uiUtils');
    require('uiScroll');
    require('uiScrollGrid');
    require('skulpt');
    require('skulptStdLib');
    require('js-interpreter');
    require('droplet');
    require('highlight');
    require('jsDiffLib');
    require('jsDiffView');
    require('lodash');
    require('kali');
    require('chance');

    // let config = require('ace/config');
    // config.set('packaged', true);
    // let path = 'ace-builds/src-min'
    // config.set('basePath', path);

    window.app = angular.module('EarSketchApp', [
        'ui.router',
        'ui.bootstrap',
        'ui.utils',
        'ngAnimate',
        'ngFileUpload',
        'angular-clipboard',
        'angular-confirm',
        'rzModule',
        'ui.scroll',
        'ui.scroll.grid',
        'ngRedux'
    ]).config($locationProvider => {
        // Prevent legacy hash-bang URL being overwritten by $location.
        $locationProvider.html5Mode(true).hashPrefix('');
    }).config($ngReduxProvider => {
        $ngReduxProvider.provideStore(store);
    });

    // app.component('rootComponent', react2angular(RootComponent));

    // In-house modules
    require('reporter');
    require('reader');
    require('userNotification');
    require('localStorage');
    require('userProject');
    require('audioLibrary');
    require('websocket');
    require('collaboration');
    require('colorTheme');
    require('layout');
    require('compiler');
    require('pitchShifter');
    require('uploader');
    require('completer');
    require('exporter');
    require('analysis');
    require('esrecorder');
    require('recorder');

    Object.assign(window,require('esAppDSP'));

    // Controllers
    require('mainController');
    require('ideController');
    require('notificationUI');
    require('editorDirective');
    require('promptController');
    require('uploadController');
    require('recorderController');
    require('createScriptController');
    require('renameController');
    require('downloadController');
    require('shareScriptController');
    require('scriptVersionController');
    require('analyzeScriptController');
    require('userHistoryController');
    require('diffDirective');

    require('createAccountController');
    require('changePasswordController');
    require('editProfileController');
    require('adminWindowController');
    require('forgotPasswordController');
    require('submitAWSController');

    // React components
    require('./browser/Browser');
    require('./bubble/Bubble');
    require('./browser/API');
    require('./browser/Sounds');
    require('./browser/Scripts');
    require('./browser/Curriculum');
    require('./browser/ScriptsMenus');
    require('./daw/DAW');
    require('./app/Footer');
    require('./editor/Tabs');
    require('./editor/EditorHeader');

    // To be ported to React
    require('./layout/Layout');

    // Autograders
    require('autograderController');
    require('autograder2Controller');
    require('autograderAWSController');
    require('autograder3Controller');
    require('inputsController');

    // CAI
    require('caiWindowDirective');
    require('caiStudent');
    require('autograder');
    require('caiAnalysisModule');
    require('caiStudentPreferenceModule');
    require('caiStudentHistoryModule');
    require('complexityCalculator');
    require('complexityCalculatorHelperFunctions');
    require('caiDialogue');
    require('caiErrorHandling');
    require('codeSuggestion');
    require('recommender');
    require('caiProjectModel');

    // TODO: Use a module.
    window.REPORT_LOG = [];

    app.factory('$exceptionHandler', ['$injector', function($injector) {
        return function(exception, cause) {
            console.log(exception);
            esconsole(exception, ['ERROR','ANGULAR']);
            var reporter = $injector.get('reporter');

            // ensures we don't report Skulpt errors to GA
            if (exception.args === undefined) {
                reporter.exception(exception.toString());
            }
        };
    }]);

    app.run(['$window', function ($window) {
        // Returns the version of Internet Explorer or a -1
        // (indicating the use of another browser).
        function getInternetExplorerVersion() {
            var rv = -1; // Return value assumes failure.
            if ($window.navigator.appName === 'Microsoft Internet Explorer') {
                var ua = $window.navigator.userAgent;
                var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null)
                    rv = parseFloat(RegExp.$1);
            }
            return rv;
        }

        function checkIE() {
            var ver = getInternetExplorerVersion();
            if (ver > -1) //If any IE version
            {
                $window.location.replace('sorry.html');
            }
        }

        //Minimum version for chrome and firefox
        function checkMinVersion() {
            var chromeMin = 24;
            var ffMin = 25;

            var M = ESUtils.whichBrowser().split(' ');

            if ((M[0] === "Chrome" && M[1] < chromeMin) || (M[0] === "Firefox" && M[1] < ffMin)) {
                alert("It appears you are using version " + M[1] + " of " + M[0] + ". Please upgrade your browser so that EarSketch functions properly.");
                return false;
            }
            return true;
        }

        function mobileCheck() {
            if (ESUtils.isMobileBrowser()) {
                alert("It appears you are using a mobile browser. EarSketch is not equipped for mobile use.");
            }
        }

        mobileCheck();
        checkIE();
        checkMinVersion();
    }]);

    /**
     * Angular template cache buster. Uses the BUILD_NUM from main.js
     */
    app.config(["$provide", function($provide) {
        return $provide.decorator("$http", ["$delegate", function($delegate) {
            var get = $delegate.get;
            $delegate.get = function(url, config) {
                // ignore Angular Bootstrap UI templates
                // also unit tests won't like release numbers added
                if (!~url.indexOf('template/') &&
                    !~url.indexOf('rzSliderTpl.html') &&
                    !~url.indexOf('tocPopoverTemplate.html') &&
                    !~url.indexOf('sound-browser-tooltip.html') &&
                    !~url.indexOf('mySlideTemplate.html') &&
                    typeof(BUILD_NUM) !== 'undefined') {
                    var parser = document.createElement("a");
                    parser.href = url;
                    if (!parser.search) {
                        parser.search = "?release=" + BUILD_NUM;
                    } else {
                        parser.search += "&release=" + BUILD_NUM;
                    }
                    url = parser.href;
                }
                return get(url, config);
            };
            return $delegate;
        }]);
    }]);

    app.directive('rightClickMenu', ['$parse', function ($parse) {
        return function(scope, element, attrs) {
            var fn = $parse(attrs.rightClickMenu);
            element.bind('contextmenu', function (event) {
                scope.$apply(function() {
                    event.preventDefault();
                    fn(scope, {$event:event});
                });
            });
        };
    }]);

    angular.bootstrap(document, ['EarSketchApp'], {
        strictDi: true
    });
});