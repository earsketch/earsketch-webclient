module.exports = {
    globals: {
        FLAGS: {
            SHOW_CAI: false,
            ANALYTICS: false,
        },
        URL_DOMAIN: "https://api-dev.ersktch.gatech.edu/EarSketchWS",
        SITE_BASE_URI: "http://localhost:0/fake-path-for-jest/",
    },
    // Tells Jest what folders to ignore for tests
    transformIgnorePatterns: [
        "/node_modules/(?!redux-persist/)",
    ],
    testEnvironment: "jsdom",
    moduleNameMapper: {
        recorder: "<rootDir>/lib/recorderjs/recorder.js",
        d3: "<rootDir>/lib/d3.min.js",
        pitchshiftWorklet: "identity-obj-proxy",
        ".+\\.(css|styl|less|sass|scss)$": "identity-obj-proxy",
        // Resolve .jpg and similar files to __mocks__/file-mock.js
        ".+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/file-mock.js",
    },
    testPathIgnorePatterns: ["node_modules", "\\.cache"],
    moduleDirectories: ["node_modules", "lib"],
    reporters: [
        "default",
        ["jest-junit", {
            outputDirectory: "tests/integration-jest/reports/jest",
            outputName: "jest-test-report.xml",
        }],
    ],
    setupFiles: ["./jest.setup.js"],
}
