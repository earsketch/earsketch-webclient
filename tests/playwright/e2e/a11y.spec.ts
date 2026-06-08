import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { setupBackend, TEST_USER, type Script } from "../helpers/mocks"
import { skipTour, login } from "../helpers/actions"

const username = TEST_USER
const scriptName = "RecursiveMelody.py"

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

async function checkA11y(page: Page, selector?: string, options?: { disabledRules?: string[] }) {
    // Let any in-flight CSS transitions finish so axe doesn't catch the page
    // mid-fade with transitional colors.
    await page.evaluate(() =>
        Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))
    )
    let builder = new AxeBuilder({ page })
    if (selector) builder = builder.include(selector)
    if (options?.disabledRules) builder = builder.disableRules(options.disabledRules)
    const results = await builder.analyze()
    expect(results.violations).toEqual([])
}

test.describe("Accessibility", () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000)
        await setupBackend(page, {
            interceptCurriculum: true,
            interceptUsersAuth: true,
            userAudio: [],
            favorites: [],
            scriptsOwned: [ownedScript],
            scriptsShared: [],
        })
        await page.goto("/")
        // Wait for the Quick Tour modal to render before scanning, so axe
        // doesn't trip over half-painted state.
        await expect(page.locator("button", { hasText: "Skip" })).toBeVisible()
        await checkA11y(page)
        await skipTour(page)
        await expect(page.locator("button", { hasText: "Welcome Students and Teachers!" })).toBeVisible()
    })

    test("no a11y violations on load (light then login)", async ({ page }) => {
        await checkA11y(page)
        await login(page)
        await checkA11y(page)
    })

    test("TOC has no a11y violations in light theme", async ({ page }) => {
        await page.locator("button", { hasText: "Welcome Students and Teachers!" }).click()
        await checkA11y(page, "#curriculum-header")
    })

    test("no a11y violations on load in dark mode", async ({ page }) => {
        await page.locator("button[title='Switch to dark color theme']").click()
        await checkA11y(page)
    })

    test("TOC has no a11y violations in dark theme", async ({ page }) => {
        await page.locator("button[title='Switch to dark color theme']").click()
        await page.locator("button", { hasText: "Welcome Students and Teachers!" }).click()
        await checkA11y(page, "#curriculum-header")
    })

    test("Shortcuts modal has no a11y violations in light mode", async ({ page }) => {
        await page.locator("button[title='Show/Hide Keyboard Shortcuts']").click()
        // axe-core/3430: aria-hidden-focus disagreement with headlessui's focus bumper
        await checkA11y(page, undefined, { disabledRules: ["aria-hidden-focus"] })
    })

    test("Report Error modal has no a11y violations in light mode", async ({ page }) => {
        await page.locator("button[title='Settings and Additional Options']").click()
        await page.locator("button", { hasText: "Report Error" }).click()
        // Touch the form so CSS transitions complete
        await page.locator("div", { hasText: "Report an error" }).first()
            .locator("input[id='name']").fill("test")
        await page.locator("div", { hasText: "Report an error" }).first()
            .locator("input[id='name']").fill("")
        await checkA11y(page)
    })

    async function testCreateScriptModal(page: Page) {
        await page.locator('[title="Open SCRIPTS Tab"]').click()
        await page.locator('[data-test="newScript"]').click()
        const dialog = page.getByRole("dialog")
        // Touch the form so CSS transitions complete before axe scans.
        await dialog.locator("input[id='scriptName']").fill("test")
        await dialog.locator("input[id='scriptName']").fill("")
        await checkA11y(page)
    }

    test("Create Script Modal has no a11y violations in light mode", async ({ page }) => {
        await testCreateScriptModal(page)
    })

    test("Create Script Modal has no a11y violations in dark mode", async ({ page }) => {
        await page.locator("button[title='Switch to dark color theme']").click()
        await testCreateScriptModal(page)
    })

    async function testCreateAccountModal(page: Page) {
        await page.locator("button", { hasText: "Create / Reset Account" }).click()
        await page.locator("button", { hasText: "Register a New Account" }).click()
        const dialog = page.getByRole("dialog")
        await dialog.locator("input[name='username']").fill("test")
        await dialog.locator("input[name='username']").fill("")
        await checkA11y(page)
    }

    test("Create Account Modal has no a11y violations in light mode", async ({ page }) => {
        await testCreateAccountModal(page)
    })

    test("Create Account Modal has no a11y violations in dark mode", async ({ page }) => {
        await page.locator("button[title='Switch to dark color theme']").click()
        await testCreateAccountModal(page)
    })

    test("Add Sound modal has no a11y violations in light mode", async ({ page }) => {
        await setupBackend(page, { interceptFreesoundSearch: true })
        await login(page, username)
        await page.locator("button[title='Open SOUNDS Tab']").click()
        await page.locator("button", { hasText: "Add sound" }).click()
        const dialog = page.getByRole("dialog")
        await dialog.locator("input[id='name']").fill("test")
        await checkA11y(page)
        await page.locator("button", { hasText: "QUICK RECORD" }).click()
        await checkA11y(page)
        await page.locator("button", { hasText: "FREESOUND" }).click()
        await checkA11y(page)
        await dialog.locator("input[placeholder='Search']").fill("birds")
        await dialog.locator("input[value='SEARCH']").click()
        await expect(dialog.locator("audio").first()).toBeVisible()
        await checkA11y(page)
    })

    test("Share Script modal has no a11y violations in light mode", async ({ page }) => {
        await login(page, username)
        await page.locator('[title="Open SCRIPTS Tab"]').click()
        await checkA11y(page)
        await page.getByLabel(`Open ${scriptName} in Code Editor`).click()
        await expect(page.locator("#coder").getByText(scriptName).first()).toBeVisible()
        await checkA11y(page)
    })
})
