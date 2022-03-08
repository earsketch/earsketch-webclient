/* eslint-disable @typescript-eslint/no-unused-vars */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */

module.exports = {
    preset: "ts-jest/presets/js-with-babel",
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.json",
        },
        FLAGS: {
            SHOW_CAI: false,
            ANALYTICS: false,
        },
        URL_DOMAIN: "https://api-dev.ersktch.gatech.edu/EarSketchWS",
    },
    // Tells Jest what folders to ignore for tests
    transformIgnorePatterns: [
        "/node_modules/(?!redux-persist/)",
    ],
    testEnvironment: "jsdom",
    moduleNameMapper: {
        "earsketch-dsp": "<rootDir>/scripts/lib/earsketch-dsp.d.ts",
        recorder: "<rootDir>/scripts/lib/recorderjs/recorder.js",
        ".+\\.(css|styl|less|sass|scss)$": "identity-obj-proxy",
        // Resolve .jpg and similar files to __mocks__/file-mock.js
        ".+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/file-mock.js",
    },
    testPathIgnorePatterns: ["node_modules", "\\.cache"],
    moduleDirectories: ["node_modules", "scripts/lib"],
    reporters: [
        "default",
        ["jest-junit", {
            outputDirectory: "tests/integration-jest/reports/jest",
            outputName: "jest-test-report.xml",
        }],
    ],
}
