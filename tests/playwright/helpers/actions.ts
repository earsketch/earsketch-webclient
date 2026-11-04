import { type Page, expect } from "@playwright/test"
import { TEST_USER } from "./mocks"

/**
 * Wait for the headlessui dialog backdrop to release the focus trap (the
 * #root element is set inert while a modal is open).
 */
export async function waitForHeadlessDialog(page: Page) {
    await expect(page.locator("div#root")).not.toHaveAttribute("inert", /.*/, { timeout: 10000 })
}

export async function skipTour(page: Page) {
    await page.locator("body").locator("button", { hasText: "Skip" }).click()
    await expect(page.locator("h2", { hasText: "Quick tour page 0 out of 10" })).toHaveCount(0, { timeout: 10000 })
    await waitForHeadlessDialog(page)
}

export async function login(page: Page, username = TEST_USER) {
    await page.locator("button[title='Login']").click()
    await waitForHeadlessDialog(page)
    await page.locator("input[name='username']").fill(username)
    await page.locator("input[name='password']").fill("not_a_real_password")
    const dialog = page.getByRole("dialog")
    await dialog.locator("button[title='Login']").click()
    await expect(page.locator("button[title='Login']")).toHaveCount(0, { timeout: 15000 })
}

export async function createScript(page: Page, scriptName: string) {
    await page.locator('[title="Open SCRIPTS Tab"]').click()
    await page.locator('[data-test="newScript"]').click()
    await page.locator("#scriptName").fill(scriptName)
    await page.locator("input").filter({ hasText: "CREATE" }).click()
    await expect(page.locator("#scriptName")).toHaveCount(0, { timeout: 10000 })
    await expect(page.locator("div[id^='headlessui-dialog-'][data-open]")).toHaveCount(0, { timeout: 10000 })
    // Tab off the New Script button so AutoSizer can re-render before we try
    // to open the script menu.
    await page.keyboard.press("Tab")
}

/**
 * Toggle curriculum to JavaScript and verify by loading "Get Started with EarSketch".
 */
export async function toggleCurriculumLanguage(page: Page) {
    await page.locator("button[title='Switch script language to javascript']").click()
    await expect(page.locator("button[title='Switch script language to javascript']")).toHaveCount(0, { timeout: 10000 })
    await page.locator("button", { hasText: "Welcome Students and Teachers!" }).click()
    await page.locator("button[title='Expand Unit']").first().click()
    await page.locator("a", { hasText: "Get Started with EarSketch" }).click()
}
