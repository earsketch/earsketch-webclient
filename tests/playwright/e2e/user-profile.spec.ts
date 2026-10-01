import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER } from "../helpers/mocks"
import { skipTour, login, visitWithStubWebSocket } from "../helpers/actions"

test("logs in and changes user email and password", async ({ page }) => {
    const changedEmail = "tester.alternate@example.com"
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

    await page.locator("button", { hasText: TEST_USER }).click()
    await page.locator("button", { hasText: "Edit Profile" }).click()

    await page.locator("input[name='email']").fill(changedEmail)
    await page.locator("input[name='password']").fill(originalPassword)
    await page.locator("input[name='newPassword']").fill(changedPassword)
    await page.locator("input[name='confirmPassword']").fill(changedPassword)
    await page.locator("input[value='UPDATE']").click()
})
