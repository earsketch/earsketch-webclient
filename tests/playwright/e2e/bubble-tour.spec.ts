import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"

test("bubble tour shows quickstart and gates Next on Run", async ({ page }) => {
    await setupBackend(page)
    await page.goto("/")

    await page.locator("button", { hasText: "Start" }).click()
    await page.locator("button", { hasText: "Next" }).click()

    // Next is grayed out (cursor-not-allowed) until Run is clicked
    await expect(page.locator("button", { hasText: "Next" })).toHaveClass(/cursor-not-allowed/)
})
