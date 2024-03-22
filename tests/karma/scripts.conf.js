// Karma config file for running scripts and checking results.

const webpackConf = require("../webpack.tests.js")

module.exports = function (config) {
    const sourcePreprocessors = []

    config.set({
        frameworks: ["jasmine"],

        files: [
            { pattern: "../setup.js", included: true },
            { pattern: "*.spec.js", included: true },
            { pattern: "*.scripts.js", included: true },
            { pattern: "*.results.js", included: true },
        ],

        preprocessors: {
            "../../index.js": sourcePreprocessors,
            "../setup.js": ["webpack"],
            "*.js": ["webpack"],
        },

        webpack: webpackConf,

        plugins: [
            "karma-chrome-launcher",
            "karma-jasmine",
            "karma-webpack",
            "karma-junit-reporter",
        ],

        captureTimeout: 20000,
        browserDisconnectTimeout: 240000,
        browserDisconnectTolerance: 3,
        browserNoActivityTimeout: 120000,

        reporters: ["progress", "junit"],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        client: {
            captureConsole: false, // set to true to show log messages
        },
        browsers: ["ChromeHeadlessNoSandbox"],
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: "ChromeHeadless",
                flags: ["--no-sandbox"],
            },
        },
        singleRun: true,
        proxyValidateSSL: false,

        junitReporter: {
            outputDir: "reports", // results will be saved as $outputDir/$browserName.xml
            outputFile: undefined, // if included, results will be saved as $outputDir/$browserName/$outputFile
            suite: "", // suite will become the package name attribute in xml testsuite element
            useBrowserName: true, // add browser name to report and classes names
            nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
            classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
            properties: {}, // key value pair of properties to add to the <properties> section of the report
            xmlVersion: null, // use '1' if reporting to be per SonarQube 6.2 XML format
        },
    })
}
