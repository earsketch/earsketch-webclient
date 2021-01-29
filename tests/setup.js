window.jasmine.DEFAULT_TIMEOUT_INTERVAL = 240000;

window.SITE_DIRECTORY = '/base';
window.SITE_BASE_URI = location.origin + '/base';
window.BUILD_NUM = 0;
window.REPORT_LOG = [];
window.URL_LOADAUDIO = URL_LOADAUDIO;
window.ES_PASSTHROUGH = ES_PASSTHROUGH;

window.customMatchers = {
    toMatchResult: function(util, customEqualityTesters) {
        return {
            compare: function(actual, expected, script) {
                const result = matchResult(actual, expected);
                if (!result.pass) {
                    result.message +='\nScript:\n\n';
                    result.message += script;
                }
                return result
            }
        };
    }
};

/**
 * A custom Jasmine matcher that matches compiler result outputs. Does not
 * check every key intentionally. Only the ones of importance.
 *
 * @param {Object} actual The actual result to be tested.
 * @param {Object} expected The expected result to be tested against.
 * @returns true if actual is similar to expected
 */
function matchResult(actual, expected) {

    if (actual.tempo !== expected.tempo) {
        return {
            pass: false,
            message: 'Expected tempo: ' + expected.tempo + '\n'
                + 'Actual tempo: ' + actual.tempo
        }
    }

    if (actual.length !== expected.length) {
        return {
            pass: false,
            message: 'Expected length: ' + expected.length + '\n'
                + 'Actual length: ' + actual.length
        }
    }

    // exclude metronome
    var actualTracks = actual.tracks.slice(0,-1)

    if (actualTracks.length !== expected.tracks.length) {
        return {
            pass: false,
            message: 'Number of expected tracks: ' + expected.tracks.length + '\n'
                + 'Actual number of tracks: ' + actualTracks.length
        }
    }

    for (var track in actualTracks) {
        var actualTrack = actualTracks[track];
        var expectedTrack = expected.tracks[track];

        var actualClips = actualTrack.clips.sort(sortClips);
        var expectedClips = expectedTrack.clips.sort(sortClips);

        console.log(JSON.stringify(actualClips));
        console.log('--------------');
        console.log(JSON.stringify(expectedClips));

        if (!checkSimilarity(actualClips, expectedClips)) {
            return {
                pass: false,
                message: 'Differing track ' + track + '.\n'
                    + 'Expected:\n\n' + JSON.stringify(expectedTrack) + '\n\n'
                    + 'Actual:\n\n' + JSON.stringify(actualTrack) + '\n\n'
            };
        }

        if (expectedTrack.effects !== undefined
            && actualTrack.effects !== undefined) {
            if (!checkSimilarity(actualTrack.effects, expectedTrack.effects)) {
                return {
                    pass: false,
                    message: 'Differing effects on track ' + track + '.\n'
                        + 'Expected:\n\n' + JSON.stringify(expectedTrack.effects) + '\n\n'
                        + 'Actual:\n\n' + JSON.stringify(actualTrack.effects) + '\n\n'
                }
            }
        }

    }

    return {
        pass: true,
        message: 'Results are similar.'
    }

}

/**
 * Sort clips by start measure.
 */
function sortClips(a, b) {
    return a.measure - b.measure;
}

/**
 * Looks to see if the actual object contains
 * the same keys with the same values as the expected object. Additional keys
 * that might be in the actual object are ignored.
 *
 * Used to test the compiler since there will be keys like "audio" that are too
 * much work to test. That is, we don't want a strict toEqual() match.
 *
 * @param {Object} actual The actual object to be tested.
 * @param {Object} expected The expected object to be tested against.
 * @returns true if actual is similar to expected
 */
function checkSimilarity(actual, expected) {
    var valid = true;

    // can't be equal if they're not the same type
    if (typeof(actual) !== typeof(expected)) {
        return false;
    }

    // check floats to within 0.01 margin of error
    if (typeof(actual) === 'number' && typeof(expected) === 'number' &&
        (actual % 1 !== 0 || expected % 1 !== 0))
    {
        var e = 0.01;
        return (expected - e <= actual && expected + e >= actual);
    }

    // check primitives
    if (!(actual instanceof Object && expected instanceof Object)) {
        return (actual === expected);
    }

    // recursively check objects
    // Only check keys that are expected, this check does not check for
    // extra keys that might be in the actual object
    for (var key in expected) {
        if (actual[key] === undefined) {
            return false;
        }
        if (!checkSimilarity(actual[key], expected[key])) {
            valid = false;
        }
    }

    return valid;
}

import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../scripts/src/reducers";

const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false
        });
    }
});

require('angular');
window.angular = angular;

require('angular-mocks');
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

window.ngMidwayTester = require('ngMidwayTester');
Object.assign(window,require('setup'));
Object.assign(window,require('dsp'));
// Object.assign(window,require('esDSP'));
Object.assign(window,require('ccSamples'));

require('uiLayout');
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

// userConsole needs a mock for $uibModal
angular.module('ui.bootstrap',[])
    .service('$uibModal',function(){})
    .service('$uibModalProvider',function(){});

window.app = angular.module('EarSketchApp',['ui.router','ui.bootstrap','ui.layout','ui.utils','ngAnimate','ngFileUpload','angular-clipboard','angular-confirm','rzModule','ui.scroll','ui.scroll.grid','ngRedux']).config($locationProvider => {
    // Prevent legacy hash-bang URL being overwritten by $location.
    $locationProvider.html5Mode(false).hashPrefix('');
}).config($ngReduxProvider => {
    $ngReduxProvider.provideStore(store);
});

require('audioContext');
require('esconsole');
require('reporter');
require('reader');
require('userNotification');
require('localStorage');
require('userProject');
require('esutils');
require('audioLibrary');
require('websocket');
require('collaboration');
require('tabs');
require('colorTheme');
require('layout');
require('timesync');
require('waveformCache');
require('compiler');
require('pitchShifter');
require('renderer');
require('applyEffects');
require('userConsole');
require('uploader');
require('wsapi');
require('completer');
require('exporter');
require('analysis');
require('player');
require('esrecorder');
require('recorder');

Object.assign(window,require('esAppDSP'));

// Controllers
require('mainController');
require('ideController');
require('layoutController');
require('tabController');
require('notificationUI');
require('editorDirective');
require('promptController');
require('dawController');
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
require('shareController');
require('submitAWSController');

require('soundBrowserController');
require('scriptBrowserController');
require('shareBrowserController');
require('apiBrowserController');
require('curriculumPaneController');
require('curriculumSearchController');

require('autograderController');
require('autograder2Controller');
require('autograderAWSController');
require('autograder3Controller');
require('inputsController');
require('autograder');
require('caiAnalysisModule');
require('complexityCalculator');
require('recommender');