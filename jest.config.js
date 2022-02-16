/* eslint-disable @typescript-eslint/no-unused-vars */
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const { pathsToModuleNameMapper } = require("ts-jest")
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require("./tsconfig")

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
    },
    // Tells Jest what folders to ignore for tests
    transformIgnorePatterns: [
        "/node_modules/(?!redux-persist/)",
    ],
    testEnvironment: "jsdom",
    moduleNameMapper: {
        "earsketch-dsp": "<rootDir>/scripts/lib/earsketch-dsp.d.ts",
        recorder: "<rootDir>/scripts/lib/recorderjs/recorder.js",
        // ...pathsToModuleNameMapper(compilerOptions.paths /*, { prefix: '<rootDir>/' } */),
        // "/^(.*)$/": "<rootDir>/scripts/src/types/$1.d.ts",
        // "^dsp(.*)$": "<rootDir>/scripts/src/types/global.d.ts",
        // "earsketch-dsp(.*)$": "<rootDir>/scripts/lib/earsketch-dsp.js",
        // // mock earsketch-dsp?
        ".+\\.(css|styl|less|sass|scss)$": "identity-obj-proxy",
        // Resolve .jpg and similar files to __mocks__/file-mock.js
        ".+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/file-mock.js",
    },
    testPathIgnorePatterns: ["node_modules", "\\.cache"],
    moduleDirectories: ["node_modules", "scripts/lib"],
    // moduleFileExtensions: [
    //     "ts",
    //     "tsx",
    //     "js",
    //     "jsx",
    // ],
}
