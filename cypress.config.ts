import { defineConfig } from "cypress"

export default defineConfig({
    fixturesFolder: "tests/cypress/fixtures",
    screenshotsFolder: "tests/cypress/screenshots",
    videosFolder: "tests/cypress/videos",
    downloadsFolder: "tests/cypress/downloads",
    reporter: "cypress-multi-reporters",
    reporterOptions: {
        reporterEnabled: "spec, cypress-mochawesome-reporter",
        cypressMochawesomeReporterReporterOptions: {
            reportDir: "tests/cypress/reports",
            charts: true,
            reportTitle: "EarSketch E2E Test Suite",
            reportPageTitle: "EarSketch E2E Test Suite",
            embeddedScreenshots: true,
            inlineAssets: true,
        },
    },
    video: false,
    e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            return require("./tests/cypress/plugins/index.js")(on, config)
        },
        baseUrl: "http://localhost:8888",
        specPattern: "tests/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
        supportFile: "tests/cypress/support/index.js",
    },
})
