import { test, expect, type Page } from "@playwright/test"
import { setupBackend, TEST_USER, type AudioMeta } from "../helpers/mocks"
import { skipTour, login, visitWithStubWebSocket } from "../helpers/actions"

const TEST_SOUND_META: AudioMeta = {
    artist: "RICHARD DEVINE",
    folder: "DUBSTEP_140_BPM__DUBBASSWOBBLE",
    genre: "DUBSTEP",
    genreGroup: "DUBSTEP",
    instrument: "SYNTH",
    name: "DUBSTEP_BASS_WOBBLE_002",
    path: "standard-library/filename/placeholder/here.wav",
    public: 1,
    tempo: 140,
    year: 2012,
}

async function setupSoundsAndScript(page: Page, script: string) {
    await setupBackend(page, {
        standardAudio: [TEST_SOUND_META],
        standardAudioMeta: TEST_SOUND_META,
        interceptAudioSample: true,
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsShared: [],
        scriptsOwned: [{
            created: "2021-10-12 20:17:18.0",
            file_location: "",
            id: -1,
            modified: "2021-10-12 20:22:29.0",
            name: "playsound.py",
            run_status: 1,
            shareid: "qeT7pez_OVHwmxeDVzkT7w",
            soft_delete: false,
            source_code: script,
            username: TEST_USER,
        }],
        interceptScriptSave: true,
    })

    await visitWithStubWebSocket(page, "/")
    await skipTour(page)
    await login(page)

    await page.locator("button[title='Open SCRIPTS Tab']").click()
    // Click the script row by its accessible name to avoid matching outer containers.
    await page.getByLabel("Open playsound.py in Code Editor").click()
    await page.locator("button#run-button").click()

    await expect(page.locator("div", { hasText: "Script ran successfully" }).first()).toBeVisible()
    await expect(page.locator(".dawTrackName", { hasText: "1" }).first()).toBeVisible()
    await expect(page.locator(".dawAudioClipContainer").first()).toBeVisible()
    await expect(page.locator("button[title='Play']")).toBeVisible()
}

test.describe("DAW", () => {
    test("runs a script and exercises playback controls", async ({ page }) => {
        const script = "from earsketch import *\n\ninit()\nsetTempo(120)\nfitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 1.5)\n\nfinish()\n"
        await setupSoundsAndScript(page, script)

        await page.locator("button[title='Toggle Metronome']").click()
        await page.locator("button[title='Reset']").click()
        await page.locator("button[title='Loop Project']").click()

        await page.locator("button[title='Play']").click()
        await expect(page.locator("button[title='Play']")).toHaveCount(0)
        await expect(page.locator("button[title='Pause']")).toBeVisible()

        await page.locator("button[title='Pause']").click()
        await expect(page.locator("button[title='Pause']")).toHaveCount(0)
        await expect(page.locator("button[title='Play']")).toBeVisible()
    })

    test("loops playback in DAW", async ({ page }) => {
        const script = "from earsketch import *\n\ninit()\nsetTempo(120)\nfitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 3)\n\nfinish()\n"
        await setupSoundsAndScript(page, script)

        await expect(page.locator(".daw-marker")).toHaveCSS("left", "0px")

        // Click and drag on the timeline to set loop region
        const dawTrack = page.locator(".daw-track").first()
        const box = await dawTrack.boundingBox()
        if (!box) throw new Error(".daw-track has no bounding box")
        await page.mouse.move(box.x + 75, box.y + 21)
        await page.mouse.down()
        await page.mouse.move(box.x + 200, box.y + 21)
        await page.mouse.up()

        const cursorPixelLocations = [183, 201, 183, 201, 183, 201, 183, 201]
        await page.locator("button[title='Play']").click()
        for (const cursorPixelLocation of cursorPixelLocations) {
            await expect.poll(async () => {
                const left = await page.locator(".daw-marker").evaluate((el) => getComputedStyle(el).left)
                const leftNum = parseInt(left.split("px")[0], 10)
                if (cursorPixelLocation < 200) return leftNum <= cursorPixelLocation
                return leftNum >= cursorPixelLocation
            }, { timeout: 10000 }).toBe(true)
        }
        await page.locator("button[title='Pause']").click()
    })
})
