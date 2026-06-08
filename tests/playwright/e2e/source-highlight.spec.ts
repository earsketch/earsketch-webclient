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

async function setupAndRun(page: Page, script: string) {
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
    await page.getByLabel("Open playsound.py in Code Editor").click()
    await page.locator("button#run-button").click()

    await expect(page.locator("div", { hasText: "Script ran successfully" }).first()).toBeVisible()
    await expect(page.locator(".dawAudioClipContainer").first()).toBeVisible()
}

test.describe("DAW source highlight", () => {
    test("highlights clips when cursor is on the line that produced them", async ({ page }) => {
        // Two fitMedia calls on different lines, producing clips on different tracks.
        const script = [
            "from earsketch import *",
            "",
            "init()",
            "setTempo(120)",
            "fitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 2)",
            "fitMedia(DUBSTEP_BASS_WOBBLE_002, 2, 1, 2)",
            "finish()",
            "",
        ].join("\n")
        await setupAndRun(page, script)

        const clips = page.locator(".dawAudioClipContainer")
        const highlighted = page.locator(".dawAudioClipContainer.source-highlight")
        const totalClips = await clips.count()
        expect(totalClips).toBeGreaterThan(1)

        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("Control+Home")
        for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown") // line 5

        // Some clips highlighted, but not all (other line's clips should be unhighlighted).
        await expect.poll(() => highlighted.count()).toBeGreaterThan(0)
        await expect.poll(() => highlighted.count()).toBeLessThan(totalClips)

        // Move to line 6 — different set highlighted.
        await page.keyboard.press("ArrowDown")
        await expect.poll(() => highlighted.count()).toBeGreaterThan(0)

        // Move to an unrelated line — nothing highlighted.
        await page.keyboard.press("ArrowDown")
        await expect(highlighted).toHaveCount(0)
    })

    test("highlights from inside a wrapper function AND its call site", async ({ page }) => {
        // fitMedia lives inside addBeat (line 6), and addBeat() is called from line 9.
        const script = [
            "from earsketch import *", // 1
            "", // 2
            "init()", // 3
            "setTempo(120)", // 4
            "def addBeat():", // 5
            "    fitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 2)", // 6
            "", // 7
            "for i in range(1):", // 8
            "    addBeat()", // 9
            "finish()", // 10
            "", // 11
        ].join("\n")
        await setupAndRun(page, script)

        const highlighted = page.locator(".dawAudioClipContainer.source-highlight")
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("Control+Home")

        // Move to line 6 (the fitMedia call inside addBeat).
        for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowDown")
        await expect.poll(() => highlighted.count()).toBeGreaterThan(0)

        // Move to line 9 (the addBeat() call site). Should ALSO highlight.
        for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown")
        await expect.poll(() => highlighted.count()).toBeGreaterThan(0)

        // Move to line 4 (setTempo, unrelated to the fitMedia clip).
        await page.keyboard.press("Control+Home")
        for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown")
        await expect(highlighted).toHaveCount(0)
    })

    test("does not highlight when the script has been edited since last run", async ({ page }) => {
        const script = [
            "from earsketch import *",
            "",
            "init()",
            "setTempo(120)",
            "fitMedia(DUBSTEP_BASS_WOBBLE_002, 1, 1, 2)",
            "finish()",
            "",
        ].join("\n")
        await setupAndRun(page, script)

        const clip = page.locator(".dawAudioClipContainer").first()

        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("Control+Home")
        for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown")

        await expect(clip).toHaveClass(/source-highlight/)

        // Type something to mark the script as modified.
        await page.keyboard.press("End")
        await page.keyboard.type(" ")
        await expect(clip).not.toHaveClass(/source-highlight/)
    })
})
