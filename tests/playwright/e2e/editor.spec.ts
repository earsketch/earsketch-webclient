import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER, type Script } from "../helpers/mocks"
import { skipTour, login, waitForHeadlessDialog } from "../helpers/actions"

const TEST_SOUND_META_1 = {
    folder: "STUB FOLDER",
    name: "OS_CLAP00",
    public: 1 as const,
    path: "standard-library/filename/placeholder/here.wav",
}
const TEST_SOUND_META = {
    folder: "STUB FOLDER",
    name: "OS_CLAP01",
    public: 1 as const,
    path: "standard-library/filename/placeholder/here.wav",
}

test.describe("Editor", () => {
    const anonymousScriptName = "test_script"

    test.beforeEach(async ({ page }) => {
        await setupBackend(page, {
            standardAudio: [TEST_SOUND_META_1, TEST_SOUND_META],
            standardAudioMeta: TEST_SOUND_META,
            interceptAudioSample: true,
        })
        await page.goto("/")
        await skipTour(page)

        await page.locator('[title="Open SCRIPTS Tab"]').click()
        await page.locator('[data-test="newScript"]').click()
        await page.locator("#scriptName").fill(anonymousScriptName)
        await page.locator("input").filter({ hasText: "CREATE" }).click()
        await expect(page.locator("div", { hasText: `${anonymousScriptName}.py` }).first()).toBeVisible()
        await waitForHeadlessDialog(page)
    })

    test("runs the template script", async ({ page }) => {
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator('#console-frame', { hasText: "Script ran successfully" })).toBeVisible()
        await expect(page.locator("#console", { hasText: "Script ran successfully" })).toBeVisible()
    })

    test("shows script output for a print", async ({ page }) => {
        const message = "Greetings."
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\nprint("${message}")`)
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator("#console-frame", { hasText: message })).toBeVisible()
        await expect(page.locator('#console-frame', { hasText: "Script ran successfully" })).toBeVisible()
    })

    test("surfaces an error for a bad script", async ({ page }) => {
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially('\nprunt("uh oh")')
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator(".console-error", { hasText: "NameError" })).toBeVisible()
    })

    test("toggles autocomplete off", async ({ page }) => {
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("End")
        await page.keyboard.press("Enter")
        await page.keyboard.type("f")
        await expect(page.locator(".cm-tooltip-autocomplete")).toBeVisible()
        await page.locator(".cm-tooltip-autocomplete > ul li[aria-selected='true']", { hasText: "fitMedia" }).click()
        await page.keyboard.type("OS_CLAP01")
        await expect(page.locator(".cm-line", { hasText: "fitMedia(OS_CLAP01," })).toBeVisible()

        await page.locator("button[title='Editor Settings']").click()
        await page.locator("button[title='Disable autocomplete']").click()
        await page.keyboard.press("Escape")
        await page.locator(".cm-content").focus()
        await page.keyboard.press("End")
        await page.keyboard.press("Enter")
        await page.keyboard.type("m")
        await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0)
        // Some cm-line should contain just "m", with no autocompleted expansion.
        await expect(page.locator(".cm-line").filter({ hasText: /^m$/ })).toBeVisible()
    })

    test("interrupts a long-running script", async ({ page }) => {
        const message = "whee"
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\nwhile True: print("${message}")`)
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator("#console-frame", { hasText: message })).toBeVisible()
        await page.locator("button", { hasText: "CANCEL" }).click()
        await expect(page.locator(".console-error", { hasText: "User interrupted execution" })).toBeVisible()
    })

    test("renders code in blocks mode", async ({ page }) => {
        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("ControlOrMeta+a")
        await page.keyboard.press("Delete")
        await editor.pressSequentially(`
from earsketch import *
fitMedia(OS_CLAP01, 1, 1, 2)
if 100 == 100:
print(5 % 2)
`)
        await page.locator("button[title='Editor Settings']").click()
        await page.locator("button[title='Enable blocks mode']").click()
        await page.locator("button[title='Editor Settings']").click()
        await expect(page.locator("canvas.droplet-main-canvas")).toBeVisible()
        await expect(page.locator("div.droplet-palette-element").first()).toBeVisible()
        await page.locator("button", { hasText: "RUN" }).click()

        await page.locator("button[title='Editor Settings']").click()
        await page.locator("button[title='Disable blocks mode']").click()
        await page.locator("button[title='Editor Settings']").click()
        await expect(page.locator("canvas.droplet-main-canvas")).toBeHidden()
        await expect(page.locator("div.droplet-palette-element").first()).toBeHidden()
        await page.locator("button", { hasText: "RUN" }).click()
    })

    test("creates and runs a JS script with fitMedia", async ({ page }) => {
        await page.locator('[data-test="newScript"]').click()
        await page.locator("select[title='Switch script language']").selectOption("JavaScript")
        await page.locator("#scriptName").fill("js_test")
        await page.locator("input").filter({ hasText: "CREATE" }).click()
        await expect(page.locator("div", { hasText: "js_test.js" }).first()).toBeVisible()
        await waitForHeadlessDialog(page)

        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("ControlOrMeta+a")
        await page.keyboard.press("Delete")
        await editor.pressSequentially("\nfitMedia(OS_CLAP01, 1, 1, 2);\n")
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator('#console-frame', { hasText: "Script ran successfully" })).toBeVisible()
    })

    test("calls fetch exactly once per sound", async ({ page }) => {
        const counter = await setupBackend(page, {
            standardAudio: [TEST_SOUND_META],
            standardAudioMeta: TEST_SOUND_META,
            interceptAudioSample: true,
        })

        await page.locator('[data-test="newScript"]').click()
        await page.locator("#scriptName").fill("fetch_test")
        await page.locator("input").filter({ hasText: "CREATE" }).click()

        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("ControlOrMeta+a")
        await page.keyboard.press("Delete")
        await editor.pressSequentially(`
from earsketch import *
makeBeat(OS_CLAP01, 1, 1, "0000", 4)
`)
        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator('#console-frame', { hasText: "Script ran successfully" })).toBeVisible()

        // Expect 3 sample fetches: METRONOME01, METRONOME02, OS_CLAP01
        expect(counter.count("audio_sample")).toBe(3)
    })

    test("logs in, edits a saved script, and persists changes", async ({ page }) => {
        const username = TEST_USER
        const scriptName = "RecursiveMelody.py"
        const anonymousScriptMessage1 = "Greetings from anonymous script."
        const anonymousScriptName2 = "test_script_anon2"
        const anonymousScriptMessage2 = "Greetings from another anonymous script 2."

        const editor = page.locator("#editor")
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\n# ${anonymousScriptMessage1}`)

        await page.locator('[title="Open SCRIPTS Tab"]').click()
        await page.locator('[data-test="newScript"]').click()
        await page.locator("#scriptName").fill(anonymousScriptName2)
        await page.locator("input").filter({ hasText: "CREATE" }).click()
        await expect(page.locator("div", { hasText: `${anonymousScriptName2}.py` }).first()).toBeVisible()
        await waitForHeadlessDialog(page)
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\n# ${anonymousScriptMessage2}`)

        const ownedScript: Script = {
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: scriptName,
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username,
        }

        // Layer in login + save mocks. Subsequent setupBackend calls add new
        // routes; existing standard-audio/audio-sample routes still apply.
        const counter = await setupBackend(page, {
            interceptScriptSave: true,
            interceptUsersAuth: true,
            userAudio: [],
            favorites: [],
            scriptsShared: [],
            scriptsOwned: [ownedScript],
            interceptAudioUpload: true,
        })

        await login(page, "username")

        // Both anonymous scripts get saved on login
        await expect.poll(() => counter.count("scripts_save"), { timeout: 10000 }).toBeGreaterThanOrEqual(2)

        await page.locator("#coder").locator(`button[title="${anonymousScriptName}.py"]`).click()
        await page.locator("#coder").locator(`button[title="${anonymousScriptName2}.py"]`).click()
        await page.locator(`[title="Open ${scriptName} in Code Editor"]`).click()
        await page.locator("#coder").locator(`[title="${scriptName}"]`).click()

        const message = "Hello from saved script"
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\nprint("${message}")`)

        // Modified-script indicator
        await expect(
            page.locator("button").filter({ hasText: scriptName }).locator("..")
        ).toHaveClass(/text-red-500/)

        await page.locator("button", { hasText: "RUN" }).click()
        await expect(page.locator("#console-frame", { hasText: message })).toBeVisible()
        await expect(page.locator('#console-frame', { hasText: "Script ran successfully" })).toBeVisible()

        // Save via keyboard shortcut
        const message2 = "another message"
        await editor.click()
        await page.keyboard.press("End")
        await editor.pressSequentially(`\nprint("${message2}")`)
        await expect(
            page.locator("button").filter({ hasText: scriptName }).locator("..")
        ).toHaveClass(/text-red-500/)
        await page.keyboard.press("ControlOrMeta+s")

        await expect(page.locator("#console-frame")).not.toContainText(message2)
    })
})
