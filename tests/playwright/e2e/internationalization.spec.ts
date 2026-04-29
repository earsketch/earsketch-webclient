import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour } from "../helpers/actions"

test("language selector switches the UI between locales", async ({ page }) => {
    await setupBackend(page)
    await page.goto("/")
    await skipTour(page)

    // The title attribute is not localized, so we can use it as a stable selector.
    await page.locator("button[title='Select Language']").click()
    await page.locator("button", { hasText: "Español" }).click()
    await expect(page.locator("h2", { hasText: "GESTOR DE CONTENIDOS" })).toBeVisible()

    await page.locator("button[title='Select Language']").click()
    await page.locator("button", { hasText: "Français" }).click()
    await expect(page.locator("h2", { hasText: "GESTIONNAIRE DE CONTENU" })).toBeVisible()

    await page.locator("button[title='Select Language']").click()
    await page.locator("button", { hasText: "English" }).click()
    await expect(page.locator("h2", { hasText: "CONTENT MANAGER" })).toBeVisible()
})
