// Karma config file for running scripts and checking results.

const webpackConf = require("../../webpack.tests.js")

module.exports = function (config) {
    const sourcePreprocessors = []

    config.set({
        frameworks: ["jasmine"],

        files: [
            { pattern: "../../setup.js", included: true },
            { pattern: "*.spec.js", included: true },
            { pattern: "*.scripts.js", included: true },
            { pattern: "*.results.js", included: true },
        ],

        preprocessors: {
            "../../../index.js": sourcePreprocessors,
            "../../setup.js": ["webpack"],
            "*.js": ["webpack"],
        },

        webpack: webpackConf,

        plugins: [
            "karma-chrome-launcher",
            "karma-jasmine",
            "karma-html-reporter",
            "karma-webpack",
        ],

        captureTimeout: 20000,
        browserDisconnectTimeout: 240000,
        browserDisconnectTolerance: 3,
        browserNoActivityTimeout: 120000,

        reporters: ["progress", "html"],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        client: {
            captureConsole: false, // set to true to show log messages
        },
        browsers: ["ChromeHeadless"],
        singleRun: true,
        proxyValidateSSL: false,
    })
}
