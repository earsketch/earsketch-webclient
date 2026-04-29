import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
    testDir: "tests/playwright",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [["html", { open: "never" }], ["junit", { outputFile: "tests/playwright/reports/junit.xml" }]] : "list",
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
