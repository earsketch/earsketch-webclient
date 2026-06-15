import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { createScript, skipTour } from "../helpers/actions"

test.describe("Command Palette", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page)
        await page.goto("/")
        await skipTour(page)
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
        await expect(page.locator(".font-medium", { hasText: "Play" }).first()).toBeVisible()
        await expect(page.locator(".font-medium", { hasText: "Toggle Metronome" }).first()).toBeVisible()
    })

    test("filters results as user types", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("fitMedia")

        await expect(page.locator(".font-medium", { hasText: "fitMedia()" })).toBeVisible()
        // Results should be filtered — unrelated commands should not appear
        await expect(page.locator(".font-medium", { hasText: "Toggle Metronome" })).not.toBeVisible()
    })

    test("shows no results message for unmatched query", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("xyzzy_no_match_12345")
        await expect(page.locator("text=No results")).toBeVisible()
    })

    test("API entry opens API browser, expands entry, and scrolls it to the top", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("importImage")
        await page.locator(".font-medium", { hasText: "importImage()" }).first().click()

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
        await page.locator(".font-medium", { hasText: "Open: API" }).first().click()

        await expect(page.locator("[data-api-scroll]")).toBeVisible()
        // Focus should land in the API search bar
        await expect(page.locator("#apiSearchBar")).toBeFocused()
    })

    test("navigate command opens the curriculum panel", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("Open: Curriculum")
        await page.locator(".font-medium", { hasText: "Open: Curriculum" }).first().click()

        await expect(page.locator("#curriculum-header")).toBeVisible()
        await expect(page.locator("#curriculumSearchBar")).toBeFocused()
    })

    test("open tabs group shows scripts that are open", async ({ page }) => {
        await createScript(page, "my_test_script")

        await page.keyboard.press("Meta+Shift+P")
        // The open script should appear in the Open Tabs group
        await expect(page.locator(".font-medium", { hasText: "my_test_script" }).first()).toBeVisible()
        // The category header should be present
        await expect(page.locator("text=Open Tabs")).toBeVisible()
    })

    test("selecting an open tab switches to it and focuses the editor", async ({ page }) => {
        await createScript(page, "script_one")
        await createScript(page, "script_two")

        // Both scripts should be open; switch to script_one via command palette
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("script_one")
        await page.locator(".font-medium", { hasText: "script_one" }).first().click()

        // Editor should be focused
        await expect(page.locator("#coder")).toBeFocused()
    })

    test("sound result opens the sound browser", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("TECHNO")
        await page.locator(".font-medium").filter({ hasText: /TECHNO/ }).first().click()

        // Sound browser panel should be open
        await expect(page.locator("#panel-0")).toBeVisible()
    })

    test("curriculum result opens the curriculum panel", async ({ page }) => {
        await page.keyboard.press("Meta+Shift+P")
        await page.keyboard.type("for loop")
        // Wait for curriculum results to appear
        await expect(page.locator("text=Curriculum").first()).toBeVisible({ timeout: 5000 })
        const curriculumResult = page.locator("[data-open]").locator(".font-medium").first()
        await curriculumResult.click()

        await expect(page.locator("#curriculum-header")).toBeVisible()
        await expect(page.locator("#curriculum-body")).toBeVisible()
    })
})
