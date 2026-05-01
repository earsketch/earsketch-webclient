import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER } from "../helpers/mocks"
import { skipTour, login } from "../helpers/actions"

test("logs in, shows owned and shared script counts, then logs out", async ({ page }) => {
    const username = TEST_USER
    await setupBackend(page, {
        standardAudio: [{
            artist: "RICHARD DEVINE",
            folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
            genre: "DUBSTEP",
            genreGroup: "DUBSTEP",
            instrument: "SYNTH",
            name: "DUBSTEP_BASS_WOBBLE_001",
            path: "filename/placeholder/here.wav",
            public: 1,
            tempo: 140,
            year: 2012,
        }],
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsOwned: [{
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: "RecursiveMelody.py",
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username,
        }],
        scriptsShared: [{
            created: "2022-03-03 07:08:09.0",
            file_location: "",
            id: -1,
            modified: "2022-03-22 10:11:12.0",
            name: "bach_remix.py",
            run_status: 1,
            shareid: "2222222222222222222222",
            soft_delete: false,
            source_code: "# Created for EarSketch\n",
            username: "friend_of_tester",
        }],
    })
    await page.goto("/")
    await skipTour(page)
    await login(page, username)

    await expect(page.locator("div", { hasText: "DUBSTEP_140_BPM__DUBBASSWOBBLE" }).first()).toBeVisible()

    await page.locator("button[title='Open SCRIPTS Tab']").click()
    await expect(page.locator("div", { hasText: "MY SCRIPTS (1)" }).first()).toBeVisible()
    await expect(page.locator("div", { hasText: "SHARED SCRIPTS (1)" }).first()).toBeVisible()

    await page.locator("button", { hasText: username }).first().click()
    await page.locator("button", { hasText: "Logout" }).click()
    await page.locator("button[title='Open SCRIPTS Tab']").click()
    await expect(page.locator("div", { hasText: "MY SCRIPTS (0)" }).first()).toBeVisible()
})
