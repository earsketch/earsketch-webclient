import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER } from "../helpers/mocks"
import { skipTour, login } from "../helpers/actions"

test("broadcast notification shows the broadcast indicator, not the unread badge", async ({ page }) => {
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

    await expect(page.locator("[data-test='numUnreadNotifications']")).toHaveCount(0)
    await expect(page.locator("[data-test='broadcastIndicator']")).toBeVisible()
})

test("hides broadcast indicator while unread non-broadcast notifications exist", async ({ page }) => {
    await setupBackend(page, {
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsOwned: [],
        scriptsShared: [],
        notifications: [
            {
                notification_type: "broadcast",
                username: "user2",
                message: { text: "Hello, EarSketch!", hyperlink: "", expiration: 7 },
            },
            {
                id: 2,
                notification_type: "share_script",
                message: {},
                script_name: "shared.py",
                sender: "user3",
                shareid: "abc123",
                unread: true,
                username: TEST_USER,
            },
        ],
    })
    await page.goto("/")
    await skipTour(page)
    await login(page)

    await expect(page.locator("[data-test='numUnreadNotifications']")).toBeVisible()
    await expect(page.locator("[data-test='broadcastIndicator']")).toHaveCount(0)
})
