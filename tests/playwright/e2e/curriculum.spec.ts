import { test, expect } from "@playwright/test"
import { setupBackend } from "../helpers/mocks"
import { skipTour, toggleCurriculumLanguage } from "../helpers/actions"

test.describe("Curriculum", () => {
    test.beforeEach(async ({ page }) => {
        await setupBackend(page, { interceptCurriculum: true })
        await page.goto("/")
        await skipTour(page)
        await expect(page.locator("h2", { hasText: "welcome" })).toBeVisible({ timeout: 30000 })
    })

    test("shows TOC", async ({ page }) => {
        await page.locator("button[title='Show Table of Contents']").click()
    })

    test("loads a chapter", async ({ page }) => {
        await page.locator("button[title='Show Table of Contents']").click()
        await page.locator("button[title='Expand Unit']").first().click()
        await page.locator("a", { hasText: "Get Started with EarSketch" }).click()
        await expect(
            page.locator("article#curriculum-body", { hasText: "In this chapter you will learn how EarSketch works" })
        ).toBeVisible()
    })

    test("lists chapter sections in TOC", async ({ page }) => {
        await page.locator("button[title='Show Table of Contents']").click()
        await page.locator("button[title='Expand Unit']").first().click()
        await page.locator("button[title='Expand Chapter']").first().click()
        await expect(page.locator("a", { hasText: "1.1 Discover EarSketch" })).toBeVisible()
    })

    test("can navigate next/back chapters", async ({ page }) => {
        await expect(page.locator("article#curriculum-body", { hasText: "Landing page body for welcome" })).toBeVisible()
        await page.locator("button[title='Next Page']").click()
        await expect(page.locator("article#curriculum-body", { hasText: "Landing page body for unit-1" })).toBeVisible()
        await page.locator("button[title='Previous Page']").click()
        await expect(page.locator("article#curriculum-body", { hasText: "Landing page body for welcome" })).toBeVisible()
    })

    test("shows when language toggled to JS", async ({ page }) => {
        await toggleCurriculumLanguage(page)
        await expect(page.locator("button[title='Switch script language to python']")).toContainText("JS")
    })

    test("toggles language Python → JavaScript", async ({ page }) => {
        await toggleCurriculumLanguage(page)
        const js = page.locator(".curriculum-javascript").first()
        const py = page.locator(".curriculum-python").first()
        await js.scrollIntoViewIfNeeded()
        await expect(js).toBeVisible()
        await expect(py).toBeHidden()
    })

    test("toggles language back JS → Python", async ({ page }) => {
        await toggleCurriculumLanguage(page)
        const js = page.locator(".curriculum-javascript").first()
        const py = page.locator(".curriculum-python").first()
        await js.scrollIntoViewIfNeeded()
        await expect(js).toBeVisible()
        await expect(py).toBeHidden()

        await page.locator("button[title='Switch script language to python']").click()
        await expect(js).toBeHidden()
        await py.scrollIntoViewIfNeeded()
        await expect(py).toBeVisible()
    })

    test("renders the correct internationalization", async ({ page }) => {
        await page.locator("button[title='Show Table of Contents']").click()
        await page.locator("button[title='Expand Unit']").nth(1).click()
        await page.locator("a", { hasText: "Loops and Layers" }).click()
        await expect(page.locator("article#curriculum-body", { hasText: "from locale en" })).toBeVisible()
        await page.locator("button[title='Select Language']").click()
        await expect(page.locator("button", { hasText: "Español" })).toHaveAttribute("title", "Not selected")
        await page.locator("button", { hasText: "Español" }).click()
        await expect(page.locator("article#curriculum-body", { hasText: "from locale es" })).toBeVisible()
    })

    test("imports a script from the curriculum", async ({ page }) => {
        await page.locator("button[title='Show Table of Contents']").click()
        await page.locator("button[title='Expand Unit']").first().click()
        await page.locator("button[title='Expand Chapter']").first().click()
        await page.locator("a", { hasText: "The fitMedia() function" }).click()
        await page.locator("i[title='Open the example code in the editor']").first().click()
        await expect(page.locator("text=IMPORT TO EDIT")).toBeVisible()
        await page.locator("button[title='Editor Settings']").click()
        await page.locator("button[title='Enable blocks mode']").click()
        await page.locator("button[title='Disable blocks mode']").click()
    })
})
