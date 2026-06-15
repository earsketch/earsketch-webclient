import { test, expect } from "@playwright/test"
import { setupBackend, type AudioMeta } from "../helpers/mocks"
import { createScript, skipTour } from "../helpers/actions"

const TECHNO_SOUND: AudioMeta = {
    artist: "TEST_ARTIST",
    folder: "TECHNO_TEST",
    genre: "TECHNO",
    name: "TECHNO_LOOP_001",
    path: "standard-library/TECHNO_TEST/TECHNO_LOOP_001.wav",
    public: 1,
    tempo: 140,
    year: 2020,
}

test.describe("Command Palette", () => {
    test.beforeEach(async ({ page }) => {
        const counter = await setupBackend(page, {
            standardAudio: [TECHNO_SOUND],
            standardAudioMeta: TECHNO_SOUND,
            interceptAudioSample: true,
        })
        await page.goto("/")
        await skipTour(page)

        // Wait for the standard audio library to load
        await expect.poll(() => counter.count("audio_standard")).toBeGreaterThan(0)
    })

    test("opens with keyboard shortcut and closes with Escape", async ({ page }) => {
        const commandPaletteInput = page.getByTestId("command-palette-input")

        await page.keyboard.press("Meta+Shift+P")
        await expect(commandPaletteInput).toBeVisible()

        await page.keyboard.press("Escape")
        await expect(commandPaletteInput).not.toBeVisible()
    })

    test("shows default commands when opened with no query", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await expect(page.getByRole("option", { name: /Play/ }).first()).toBeVisible()
        await expect(page.getByRole("option", { name: /Toggle Metronome/ }).first()).toBeVisible()
    })

    test("filters results as user types", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("fitMedia")

        await expect(page.getByRole("option", { name: /fitMedia/ }).first()).toBeVisible()
        // Results should be filtered — unrelated commands should not appear
        await expect(page.getByRole("option", { name: /Toggle Metronome/ })).not.toBeVisible()
    })

    test("shows no results message for unmatched query", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("xyzzy_no_match_12345")
        await expect(page.locator("text=No results")).toBeVisible()
    })

    test("API entry opens API browser, expands entry, and scrolls it to the top", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("importImage")
        await page.getByRole("option", { name: /importImage/ }).first().click()

        // API panel should be open
        await expect(page.locator("[data-api-scroll]")).toBeVisible()

        // Entry should be expanded
        await expect(page.locator("button[title='Close importImage function details']")).toBeVisible()

        // Entry should be scrolled near the top of the panel
        const entryTop = await page.evaluate(() => {
            const panel = document.querySelector("[data-api-scroll]")
            const span = document.querySelector("[data-api-entry='importImage']")
            if (!panel || !span) return null
            return span.getBoundingClientRect().top - panel.getBoundingClientRect().top
        })
        expect(entryTop).not.toBeNull()
        expect(entryTop).toBeGreaterThanOrEqual(0)
        expect(entryTop).toBeLessThan(50)
    })

    test("navigate command opens the correct panel", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("Open: API")
        await page.getByRole("option", { name: /Open: API/ }).first().click()

        await expect(page.locator("[data-api-scroll]")).toBeVisible()
        // Focus should land in the API search bar
        await expect(page.locator("#apiSearchBar")).toBeFocused()
    })

    test("navigate command opens the curriculum panel", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("Open: Curriculum")
        await page.getByRole("option", { name: /Open: Curriculum/ }).first().click()

        await expect(page.locator("#curriculum-header")).toBeVisible()
        await expect(page.locator("#curriculumSearchBar")).toBeFocused()
    })

    test("toggle theme command switches the color theme", async ({ page }) => {
        // Default theme is light — palette should offer switching to dark
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("dark")
        await page.getByRole("option", { name: /Switch to dark color theme/ }).first().click()

        // Re-open: now in dark mode, should offer switching back to light
        await page.keyboard.press("Meta+Shift+P")
        await expect(page.getByRole("option", { name: /Switch to light color theme/ })).toBeVisible()
        await expect(page.getByRole("option", { name: /Switch to dark color theme/ })).not.toBeVisible()
    })

    test("open tabs group shows scripts that are open", async ({ page }) => {
        await createScript(page, "my_test_script")

        await page.keyboard.press("Meta+Shift+P")
        // The open script should appear in the Open Tabs group
        await expect(page.getByRole("option", { name: /my_test_script/ }).first()).toBeVisible()
        // The category header should be present
        await expect(page.locator("text=Open Tabs")).toBeVisible()
    })

    test("selecting an open tab switches to it and focuses the editor", async ({ page }) => {
        await createScript(page, "script_one")
        await createScript(page, "script_two")

        // Both scripts should be open; switch to script_one via command palette
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("script_one")
        await page.getByRole("option", { name: /script_one/ }).first().click()

        // Editor should be focused
        await expect(page.locator(".cm-editor")).toContainClass("cm-focused")
        await expect(page.getByRole("tab", { name: /script_one/ })).toHaveAttribute("aria-selected", "true")
    })

    test("sound result opens the sound browser", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("TECHNO")
        await page.getByRole("option", { name: /TECHNO/ }).first().click()

        // Sound browser panel should be open
        await expect(page.locator("#panel-0")).toBeVisible()
    })

    test("curriculum result opens the curriculum panel", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("for loop")
        // Wait for curriculum results to appear
        await expect(page.locator("text=Curriculum").first()).toBeVisible({ timeout: 5000 })
        await page.getByRole("option", { name: /for loop/i }).first().click()

        await expect(page.locator("#curriculum-header")).toBeVisible()
        await expect(page.locator("#curriculum-body")).toBeVisible()
    })
})
