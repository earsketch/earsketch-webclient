import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
    testDir: "tests/playwright",
    fullyParallel: true,
    forbidOnly: true,
    retries: 0,
    reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "tests/playwright/reports/junit.xml" }]],
    outputDir: "tests/playwright/test-results",
    use: {
        baseURL: "http://localhost:8888",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
})
