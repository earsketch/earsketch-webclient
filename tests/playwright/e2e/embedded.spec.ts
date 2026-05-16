import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER } from "../helpers/mocks"

const sharedScript = {
    created: "2022-04-20 19:10:00.0",
    file_location: "",
    id: -1,
    modified: "2022-04-20 19:10:00.0",
    name: "test_song.py",
    run_status: 0,
    shareid: "abcabcabcabcabcabcabcabc",
    soft_delete: false,
    source_code: "from earsketch import *\n\nsetTempo(111)\n# todo: music\n",
    username: TEST_USER,
}

test.describe("embedded mode", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page, { interceptScriptById: sharedScript })
    })

    for (const variant of [
        { name: "loads embedded", url: "/?sharing=123&embedded=true" },
        { name: "loads with hideDaw", url: "/?sharing=123&embedded=true&hideDaw" },
        { name: "loads with hideCode", url: "/?sharing=123&embedded=true&hideCode" },
        { name: "loads with hideDaw and hideCode", url: "/?sharing=123&embedded=true&hideDaw&hideCode" },
    ]) {
        test(variant.name, async ({ page }) => {
            await page.goto(variant.url)
            await expect(page.locator(".embedded-script-info", { hasText: "test_song.py" }).first()).toBeVisible()
            await page.locator("#daw-play-button").click()
        })
    }
})
