import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour } from "../helpers/actions"

test.describe("top header nav", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page, { interceptCurriculum: true })
        await page.goto("/")
        await skipTour(page)
    })

    test("changes theme", async ({ page }) => {
        await page.locator("button[title='Switch to dark color theme']").click()
        await expect(page.locator("body")).toHaveClass(/dark/)

        await page.locator("button[title='Switch to light color theme']").click()
        await expect(page.locator("body")).not.toHaveClass(/dark/)
    })

    test("changes font size", async ({ page }) => {
        await expect(page.locator("h2", { hasText: "welcome" })).toBeVisible({ timeout: 30000 })
        const sizes: Array<[string, string]> = [
            ["10", "15px"],
            ["12", "18px"],
            ["14", "21px"],
            ["18", "27px"],
            ["24", "36px"],
            ["36", "54px"],
        ]
        for (const [selectedFontSize, h2FontSize] of sizes) {
            await page.locator("button[title='Select Font Size']").click()
            await page.locator("button", { hasText: selectedFontSize }).click()
            await expect(page.locator("h2", { hasText: "welcome" })).toHaveCSS("font-size", h2FontSize)
            await expect(page.locator("div.sect1", { hasText: "Landing page body for welcome" }))
                .toHaveCSS("font-size", `${selectedFontSize}px`)
        }
    })
})
