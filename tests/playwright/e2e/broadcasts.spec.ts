import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour, login } from "../helpers/actions"

test("broadcast notification is delivered on login", async ({ page }) => {
    await setupBackend(page, {
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsOwned: [],
        scriptsShared: [],
        notifications: [{
            notification_type: "broadcast",
            username: "user2",
            message: { text: "Hello, EarSketch!", hyperlink: "", expiration: 7 },
        }],
    })
    await page.goto("/")
    await skipTour(page)
    await login(page)

    await expect(page.locator("[data-test='numUnreadNotifications']")).toHaveText("1")
})
