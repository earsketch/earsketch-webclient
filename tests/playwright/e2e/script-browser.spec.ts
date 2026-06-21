import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { createScript, skipTour } from "../helpers/actions"

test.describe("script browser", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page, {
            standardAudio: [],
            standardAudioMeta: { folder: "STUB", name: "STUB", path: "stub", public: 1 },
            interceptAudioSample: true,
            interceptCurriculum: true,
        })
        await page.goto("/")
        await skipTour(page)
    })

    test("renames a script", async ({ page }) => {
        const scriptName = "test_script"
        await createScript(page, scriptName)
        await page.locator(`[title="Script Options for ${scriptName}.py"]`).click()
        await page.locator(`[title="Rename ${scriptName}.py"]`).click()
        await page.locator(`input[value="${scriptName}"]`).fill("")
        await page.locator("span", { hasText: "Enter the new name for this script:" })
            .locator("..")
            .locator("input").fill("renamed_script")
        await page.locator('input[type="submit"]').click()
        await expect(page.locator("text=renamed_script.py").first()).toBeVisible()
    })

    test("deletes a script and prevents reuse of deleted name", async ({ page }) => {
        const scriptName1 = "first_test_script"
        const scriptName2 = "second_test_script"
        await createScript(page, scriptName1)
        await createScript(page, scriptName2)

        await page.locator(`[title="Script Options for ${scriptName1}.py"]`).click()
        await page.locator(`[title="Delete ${scriptName1}.py"]`).click()
        await page.locator('input[type="submit"]').click()
        await expect(page.locator(`text=${scriptName1}`)).toHaveCount(0, { timeout: 10000 })

        // Attempt to rename the second script to the deleted name
        await page.locator(`[title="Script Options for ${scriptName2}.py"]`).click()
        await page.locator(`[title="Rename ${scriptName2}.py"]`).click()
        await page.locator(`input[value="${scriptName2}"]`).fill("")
        await page.locator("span", { hasText: "Enter the new name for this script:" })
            .locator("..")
            .locator("input").fill(scriptName1)
        await page.locator('input[type="submit"]').click()
        await expect(page.locator(`text=${scriptName2}`).first()).toBeVisible()
        await expect(page.locator("text=That name already exists in your deleted scripts")).toBeVisible()
    })
})
