/**
 * Karma config file for testing compiler integration
 *
 * @module Tests.Integration.Compiler
 * @author Creston Bunch
 */

const webpackConf = require("../../webpack.tests.js")

module.exports = function (config) {
    const sourcePreprocessors = []

    config.set({
        basePath: "../../../",
        frameworks: ["jasmine"],

        files: [
            { pattern: "scripts/lib/earsketch-dsp.js", included: true },
            { pattern: "scripts/src/api/earsketch.py.js", served: true },
            { pattern: "tests/setup.js", included: true },
            { pattern: "tests/integration/compiler/*.spec.js", included: true },
            { pattern: "tests/integration/compiler/*.scripts.js", included: true },
            { pattern: "tests/integration/compiler/*.results.js", included: true },
        ],

        preprocessors: {
            "index.js": sourcePreprocessors,
            "tests/setup.js": ["webpack"],
            "tests/integration/compiler/*.js": ["webpack"],
        },

        webpack: webpackConf,

        plugins: [
            "karma-chrome-launcher",
            "karma-safari-launcher",
            "karma-firefox-launcher",
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
        logLevel: config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO,
        client: {
            captureConsole: true, // set to true to show log messages
        },
        browsers: ["Chrome", "Firefox", "Safari"],

        // attempts for bypassing the security warning in FF -- not really working
        // browsers: ['Firefox_custom'],
        // customLaunchers: {
        //     Firefox_custom: {
        //         base: 'Firefox',
        //         prefs: {
        //             // 'security.use_mozillapkix_verification': false,
        //             // 'security.fileuri.strict_origin_policy': false,
        //             // 'security.tls.insecure_fallback_hosts': 'earsketch.gatech.edu',
        //             // 'security.ssl3.dhe_rsa_aes': false,
        //             // 'security.ssl3.dhe_rsa_des_ede3_sha': false,
        //             // 'security.ssl3.dhe_rsa_aes_128_sha': false,
        //             // 'security.ssl3.dhe_rsa_aes_256_sha': false,
        //             // 'security.mixed_content.block_active_content': false,
        //             // 'security.pki.sha1_enforcement_level': 0,
        //             // 'security.tls.insecure_fallback_hosts.use_static_list': true,
        //             // 'security.tls.version.fallback-limit': 1,
        //             // 'browser.xul.error_pages.enabled': true
        //             //'browser.ssl_override_behavior': 1,
        //             //'security.ssl.enable_ocsp_stapling': false,
        //             // 'security.warn_entering_secure': false,
        //             // 'security.tls.version.max': 0,
        //             // 'security.tls.version.min': 0
        //         }
        //     }
        // },
        singleRun: true,
        proxyValidateSSL: false,
    })
}
