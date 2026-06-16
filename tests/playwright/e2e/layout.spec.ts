import { test, expect, Page } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour } from "../helpers/actions"

test.describe("Layout", () => {
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

    test("page has no vertical or horizontal scrollbars", async ({ page }) => {
        await confirmNoScroll(page)

        await page.locator('[title="Open SCRIPTS Tab"]').click()
        await page.locator('[data-test="newScript"]').click()
        await page.locator("#scriptName").fill("test script")
        await page.locator("input").filter({ hasText: "CREATE" }).click()
        const editor = page.locator("#editor")
        await editor.click()

        await confirmNoScroll(page)
    })
})

async function confirmNoScroll(page: Page) {
    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
    }))

    expect(scrollHeight, `page is vertically scrollable (scrollHeight ${scrollHeight} > clientHeight ${clientHeight})`).toBeLessThanOrEqual(clientHeight)
    expect(scrollWidth, `page is horizontally scrollable (scrollWidth ${scrollWidth} > clientWidth ${clientWidth})`).toBeLessThanOrEqual(clientWidth)
}
