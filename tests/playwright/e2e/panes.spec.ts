import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour } from "../helpers/actions"

test.describe("Collapsible panes", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page)
        await page.goto("/")
        await skipTour(page)
    })

    test("toggles content manager and curriculum panes", async ({ page }) => {
        // Content manager is open by default
        await expect(page.locator("button[title='Open CONTENT MANAGER']")).toHaveCount(0)

        await page.locator("button[title='Close Content Manager']").click()
        await expect(page.locator("button[title='Open CONTENT MANAGER']")).toBeVisible()
        await expect(page.locator("button[title='Close Content Manager']")).toHaveCount(0)

        // Collapsed pane should be narrow
        const cmWidth = await page.locator("div#content-manager").evaluate((el) => (el as HTMLElement).offsetWidth)
        expect(cmWidth).toBeLessThanOrEqual(45)

        // Curriculum pane: same flow
        await expect(page.locator("button[title='Open CURRICULUM']")).toHaveCount(0)

        await page.locator("button[title='Close Curriculum']").click()
        await expect(page.locator("button[title='Open CURRICULUM']")).toBeVisible()
        await expect(page.locator("button[title='Close Curriculum']")).toHaveCount(0)

        const curWidth = await page.locator("div#curriculum-container").evaluate((el) => (el as HTMLElement).offsetWidth)
        expect(curWidth).toBeLessThanOrEqual(45)
    })
})
