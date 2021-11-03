// jest.config.js
module.exports = {
    transform: {
        // If you us babel for js and ts-jest for ts
        "^.+\\.jsx?$": "babel-jest",
        "^.+\\.tsx?$": "ts-jest",
        // If you're using babel for both
        //"^.+\\.[jt]sx?$": "babel-jest",
        // If you're using ts-jest for both (does this event work?)
        //"^.+\\.[jt]sx?$": "ts-jest",
    },
    transformIgnorePatterns: [
        "/node_modules/(?!redux-persist/)",
    ],
    moduleNameMapper: {
        // Resolve .css and similar files to identity-obj-proxy instead.
        ".+\\.(css|styl|less|sass|scss)$": `identity-obj-proxy`,
        // Resolve .jpg and similar files to __mocks__/file-mock.js
        ".+\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": `<rootDir>/__mocks__/file-mock.js`,
    },
    // Tells Jest what folders to ignore for tests
    testPathIgnorePatterns: [`node_modules`, `\\.cache`],
    testEnvironment: "jsdom",
    clearMocks: true,
}
