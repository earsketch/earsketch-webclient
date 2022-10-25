/**
 * Karma config file for unit testing
 *
 * @module Tests.Unit
 * @author Creston Bunch
 */

const webpackConf = require('../webpack.tests.js');

module.exports = function(config) {
    var sourcePreprocessors = [];

    config.set({
        basePath: '../../',
        frameworks: ['jasmine'],

        files: [
            {pattern: 'scripts/lib/earsketch-dsp.js', included: true},
            {pattern: 'scripts/src/api/earsketch.py.js', served: true},
            {pattern: 'tests/setup.js', included: true},
            {pattern: 'tests/unit/hello.js', included:true},
            {pattern: 'tests/unit/*.spec.js', included:true}
        ],

        preprocessors: {
            'index.js': sourcePreprocessors,
            'tests/setup.js': ['webpack']
        },

        webpack: webpackConf,

        plugins: [
            'karma-chrome-launcher',
            'karma-safari-launcher',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-html-reporter',
            'karma-webpack'
        ],

        captureTimeout: 20000,
        browserDisconnectTimeout: 240000,
        browserDisconnectTolerance: 3,
        browserNoActivityTimeout: 120000,

        reporters: ['progress','html'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO,
        client: {
            captureConsole: true // set to true to show log messages
        },
        browsers: ['Chrome','Firefox','Safari'],
        singleRun: true
    });
};
