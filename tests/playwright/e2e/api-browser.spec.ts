import { test } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { createScript, skipTour } from "../helpers/actions"

test.describe("API browser", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page)
        await page.goto("/")
        await skipTour(page)
    })

    test("expands and pastes API entry", async ({ page }) => {
        const scriptName = "api_test_script"
        const functionText = "analyze"
        await createScript(page, scriptName)

        await page.locator('button[title="Open API Tab"]').click()
        await page.locator(`button[title="Open ${functionText} function details"]`).click()
        await page.locator(`button[title="Close ${functionText} function details"]`).click()

        await page.locator("#editor").click()
        await page.locator(`button[title="Paste ${functionText} function into code editor"]`).click()
    })
})
