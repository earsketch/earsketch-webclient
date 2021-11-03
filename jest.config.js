/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const { pathsToModuleNameMapper } = require("ts-jest/utils")
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require("./tsconfig")

module.exports = {
    preset: "ts-jest/presets/js-with-babel",
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.json",
        },
    },
    // Tells Jest what folders to ignore for tests
    transformIgnorePatterns: [
        "/node_modules/(?!redux-persist/)",
    ],
    testEnvironment: "jsdom",
    moduleNameMapper: {
        "/^(.*)$/": "<rootDir>/scripts/src/types/$1.d.ts",
        "^dsp(.*)$": "<rootDir>/scripts/src/types/global.d.ts",
        ".+\\.(css|styl|less|sass|scss)$": "identity-obj-proxy",
        // Resolve .jpg and similar files to __mocks__/file-mock.js
        ".+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/file-mock.js",
    },
    testPathIgnorePatterns: ["node_modules", "\\.cache"],
    // moduleDirectories: ["<rootDir>/node_modules", "<rootDir>/scripts/src"],
    // moduleFileExtensions: [
    //     "ts",
    //     "tsx",
    //     "js",
    //     "jsx",
    //     "json",
    // ],
}
