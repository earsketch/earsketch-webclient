import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour, login, visitWithStubWebSocket } from "../helpers/actions"

test("logs in and changes user email and password", async ({ page }) => {
    const changedEmail = "alternate.cypress@earsketch.cyp"
    const originalPassword = "not_a_real_password"
    const changedPassword = "this_is_changed"

    await setupBackend(page, {
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsOwned: [],
        scriptsShared: [],
        interceptUsersEdit: true,
        interceptModifyPassword: { password: originalPassword },
    })

    await visitWithStubWebSocket(page, "/")
    await skipTour(page)
    await login(page)

    await expect(page.locator("h1", { hasText: "EarSketch" })).toBeVisible()

    await page.locator("button", { hasText: "cypress" }).click()
    await page.locator("button", { hasText: "Edit Profile" }).click()

    await page.locator("input[placeholder='Email Address (Optional)']").fill(changedEmail)
    await page.locator("input[placeholder='Verify your current password']").fill(originalPassword)
    await page.locator("input[placeholder='New password (Optional)']").fill(changedPassword)
    await page.locator("input[placeholder='Confirm new password']").fill(changedPassword)
    await page.locator("input[value='UPDATE']").click()
})
