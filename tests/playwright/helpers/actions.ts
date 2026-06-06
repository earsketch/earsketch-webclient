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
    await page.locator("input[name='username']").fill(username)
    await page.locator("input[name='password']").fill("not_a_real_password")
    await page.locator("button[title='Login']").click()
    await expect(page.locator("button[title='Login']")).toHaveCount(0, { timeout: 15000 })
}

export async function createScript(page: Page, scriptName: string) {
    await page.locator('[title="Open SCRIPTS Tab"]').click()
    await page.locator('[data-test="newScript"]').click()
    await page.locator("#scriptName").fill(scriptName)
    await page.locator("input").filter({ hasText: "CREATE" }).click()
    await expect(page.locator("#scriptName")).toHaveCount(0, { timeout: 10000 })
    await expect(page.locator("div[id^='headlessui-dialog-']")).toHaveCount(0, { timeout: 10000 })
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

/**
 * Visit a page with WebSocket connections no-op'd out. Used by tests that
 * require a logged-in session (the app opens a notification socket on login)
 * but don't exercise WebSocket behavior themselves.
 *
 * Tests that need to drive incoming WebSocket messages (currently all skipped:
 * broadcasts, script-share, user-login) will need to inject mock-socket and
 * coordinate via page.evaluate.
 */
export async function visitWithStubWebSocket(page: Page, url: string) {
    await page.addInitScript({
        content: `
            window.WebSocket = class StubWebSocket {
                static CONNECTING = 0
                static OPEN = 1
                static CLOSING = 2
                static CLOSED = 3
                constructor(url) {
                    this.url = url
                    this.readyState = 0
                    this.onopen = null
                    this.onmessage = null
                    this.onerror = null
                    this.onclose = null
                    setTimeout(() => {
                        this.readyState = 1
                        this.onopen?.(new Event("open"))
                    }, 0)
                }
                send() {}
                close() {
                    this.readyState = 3
                    this.onclose?.(new CloseEvent("close"))
                }
                addEventListener() {}
                removeEventListener() {}
            }
        `,
    })
    await page.goto(url)
}
