import { test, expect } from "@playwright/test"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { setupBackend, TEST_USER, type AudioMeta } from "../helpers/mocks"
import { skipTour, login, visitWithStubWebSocket } from "../helpers/actions"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TEST_SOUND_META: AudioMeta = {
    artist: "RICHARD DEVINE",
    folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
    genre: "DUBSTEP",
    genreGroup: "DUBSTEP",
    instrument: "SYNTH",
    name: "DUBSTEP_BASS_WOBBLE_002",
    path: "standard-library/DUBSTEP_140_BPM__DUBBASSWOBBLE/DUBSTEP_BASS_WOBBLE_002.wav",
    public: 1,
    tempo: 140,
    year: 2012,
}

test.describe("preview sound", () => {
    test("plays a sound preview", async ({ page }) => {
        const counter = await setupBackend(page, {
            standardAudio: [TEST_SOUND_META],
            standardAudioMeta: TEST_SOUND_META,
            interceptAudioSample: true,
        })
        await page.goto("/")
        await skipTour(page)

        // Wait for the standard audio library to load
        await expect.poll(() => counter.count("audio_standard")).toBeGreaterThan(0)

        // Locate the specific row for DUBSTEP_BASS_WOBBLE_002 by its h5 label
        const soundRow = page.locator("div.flex.flex-row.justify-start").filter({
            has: page.locator("h5", { hasText: "DUBSTEP_BASS_WOBBLE_002" }),
        })
        await expect(soundRow.locator("i.icon.icon-play4")).toBeVisible()

        // Click the play button in that row
        await soundRow.locator("button[title='Preview sound']").click()

        // Wait for the audio sample request to be made
        await expect.poll(() => counter.count("audio_sample"), { timeout: 10000 }).toBeGreaterThan(0)

        // Verify the stop icon is showing while the longer countdown sample plays
        await expect(soundRow.locator("i.icon.icon-stop2")).toBeVisible({ timeout: 5000 })

        await expect(soundRow.locator("i.icon.icon-play4")).toBeVisible()
    })
})

test.describe("add a sound", () => {
    test("uploads a sound", async ({ page }) => {
        const username = TEST_USER
        const fileName = "clink.wav"
        const usernameUpper = username.toUpperCase()
        const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
        const soundConst = usernameUpper + "_SHH" + randSuffix

        await setupBackend(page, {
            standardAudio: [TEST_SOUND_META],
            interceptUsersAuth: true,
            userAudio: [{
                artist: usernameUpper,
                folder: usernameUpper,
                genre: "USER UPLOAD",
                instrument: "VOCALS",
                name: soundConst,
                path: "filename/placeholder/here.wav",
                public: 0,
                tempo: -1,
                year: 2022,
            }],
            favorites: [],
            scriptsOwned: [],
            scriptsShared: [],
            interceptAudioUpload: true,
        })

        await visitWithStubWebSocket(page, "/")
        await skipTour(page)
        await login(page, username)

        await page.locator("button[title='Open SOUNDS Tab']").click()
        await page.locator("button", { hasText: "Add sound" }).click()

        const fixturePath = path.resolve(__dirname, "..", "fixtures", fileName)
        await page.locator("input[type='file']").setInputFiles(fixturePath)

        await expect(page.getByRole("dialog").getByText("Add a New Sound")).toBeVisible()
        await page.locator("#name").fill("_UNIQUE_STRING_GOES_HERE")
        await page.locator("input[value='UPLOAD']").click()

        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10000 })
        await expect(page.getByText(soundConst)).toBeVisible()
    })
})

test.describe("edit sound uploads", () => {
    const username = TEST_USER
    const usernameUpper = username.toUpperCase()
    const randSuffix = "_" + Math.random().toString(36).substring(2, 6).toUpperCase()
    const soundConst = usernameUpper + "_SHH" + randSuffix

    test.beforeEach(async ({ page }) => {
        await setupBackend(page, {
            standardAudio: [TEST_SOUND_META],
            interceptUsersAuth: true,
            userAudio: [{
                artist: usernameUpper,
                folder: usernameUpper,
                genre: "USER UPLOAD",
                instrument: "VOCALS",
                name: soundConst,
                path: "filename/placeholder/here.wav",
                public: 0,
                tempo: -1,
                year: 2022,
            }],
            favorites: [],
            scriptsOwned: [],
            scriptsShared: [],
        })
        await visitWithStubWebSocket(page, "/")
        await skipTour(page)
        await login(page, username)

        await expect(page.locator("div", { hasText: soundConst }).first()).toBeVisible()
    })

    test("renames sound", async ({ page }) => {
        await setupBackend(page, { interceptAudioRename: true })

        // The rename button is hidden until row hover; force-click bypasses that.
        await page.locator("button[title='Rename sound']").click({ force: true })
        await expect(page.getByRole("dialog").getByText("Rename Sound")).toBeVisible()
        await page.locator(`input[value='SHH${randSuffix}']`).pressSequentially("1")
        await page.locator("input[value='RENAME']").click()

        await expect(page.getByRole("dialog")).toHaveCount(0)
        await expect(page.getByText(soundConst + "1")).toBeVisible()
    })

    test("deletes sound", async ({ page }) => {
        await setupBackend(page, { interceptAudioDelete: true })

        await page.locator("button[title='Delete sound']").click({ force: true })
        await expect(page.getByRole("dialog").getByText("Confirm")).toBeVisible()
        await page.locator("input[value='DELETE']").click()

        await expect(page.getByText(soundConst)).toHaveCount(0)
    })
})
