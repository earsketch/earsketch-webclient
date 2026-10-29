import { test, expect, type Page } from "@playwright/test"
import { API_HOST, setupBackend, TEST_USER, type Script } from "../helpers/mocks"
import { createScript, login, skipTour, visitWithStubWebSocket, waitForHeadlessDialog } from "../helpers/actions"

// Regression tests for #1006: logging in must only migrate scripts created while logged out,
// and a failed login must not leave the user's server scripts behind to be copied by the next login.

const serverScript: Script = {
    created: "2022-01-02 16:20:00.0",
    file_location: "",
    id: -1,
    modified: "2022-02-14 16:19:00.0",
    name: "RecursiveMelody.py",
    run_status: 1,
    shareid: "1111111111111111111111",
    soft_delete: false,
    source_code: "from earsketch import *\nsetTempo(91)\n",
    username: TEST_USER,
}

const backend = {
    interceptUsersAuth: true,
    userAudio: [],
    favorites: [],
    scriptsOwned: [serverScript],
    scriptsShared: [],
    interceptScriptSave: true,
}

/** Records the name of every script save the app sends, including ones that fail. */
function recordSaves(page: Page) {
    const names: string[] = []
    page.on("request", request => {
        if (request.method() === "POST" && request.url() === `https://${API_HOST}/EarSketchWS/scripts/save`) {
            names.push(new URLSearchParams(request.postData() ?? "").get("name") ?? "")
        }
    })
    return names
}

/** Fails the first request to an endpoint, then falls back to the regular mocks. */
function failFirst(endpoint: string) {
    return async (page: Page) => {
        let failed = false
        await page.route(`https://${API_HOST}/EarSketchWS/${endpoint}`, route => {
            if (failed) {
                return route.fallback()
            }
            failed = true
            return route.abort("failed")
        })
    }
}

async function failLogin(page: Page) {
    await page.locator("button[title='Login']").click()
    await waitForHeadlessDialog(page)
    await page.locator("input[name='username']").fill(TEST_USER)
    await page.locator("input[name='password']").fill("not_a_real_password")
    const dialog = page.getByRole("dialog")
    await dialog.locator("button[title='Login']").click()
    await expect(dialog).toContainText("Login failed due to network error.")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10000 })
}

async function expectMyScripts(page: Page, count: number) {
    await page.locator("button[title='Open SCRIPTS Tab']").click()
    await expect(page.locator("div", { hasText: `MY SCRIPTS (${count})` }).first()).toBeVisible()
}

test("does not copy server scripts when logging in after a failed login", async ({ page }) => {
    await setupBackend(page, { ...backend, additionalRoutes: [failFirst("scripts/shared")] })
    const saves = recordSaves(page)
    await visitWithStubWebSocket(page, "/")
    await skipTour(page)

    await failLogin(page)
    // The failed login is undone, rather than leaving the server scripts loaded.
    await expectMyScripts(page, 0)

    await login(page)
    await expectMyScripts(page, 1)
    expect(saves).toEqual([])
})

test("migrates scripts created while logged out exactly once", async ({ page }) => {
    await setupBackend(page, backend)
    const saves = recordSaves(page)
    await visitWithStubWebSocket(page, "/")
    await skipTour(page)
    await createScript(page, "local_script")

    await login(page)
    await expectMyScripts(page, 2)
    expect(saves).toEqual(["local_script.py"])
})

test("keeps scripts created while logged out when migrating them fails", async ({ page }) => {
    await setupBackend(page, { ...backend, additionalRoutes: [failFirst("scripts/save")] })
    const saves = recordSaves(page)
    await visitWithStubWebSocket(page, "/")
    await skipTour(page)
    await createScript(page, "local_script")

    await failLogin(page)
    await expectMyScripts(page, 1)
    await expect(page.locator("div", { hasText: "local_script.py" }).first()).toBeVisible()

    await login(page)
    await expectMyScripts(page, 2)
    // One failed attempt, then one successful migration.
    expect(saves).toEqual(["local_script.py", "local_script.py"])
})

test("waits for a mixed migration batch and retries only the unsaved script", async ({ page }) => {
    const owned = [serverScript]
    let releaseSave!: () => void
    const saveGate = new Promise<void>(resolve => { releaseSave = resolve })
    let delayedSaveStarted = false
    let failed = false
    await setupBackend(page, {
        ...backend,
        scriptsOwned: owned,
        additionalRoutes: [async page => {
            await page.route(`https://${API_HOST}/EarSketchWS/scripts/save`, async route => {
                const params = new URLSearchParams(route.request().postData() ?? "")
                const name = params.get("name")!
                if (name === "retry_script.py" && !failed) {
                    failed = true
                    return route.abort("failed")
                }
                if (name === "saved_script.py") {
                    delayedSaveStarted = true
                    await saveGate
                }
                // Persist successful saves in the mock so the next owned-script fetch
                // behaves like the server and exposes any accidental second migration.
                const saved = { ...serverScript, name, shareid: `saved_${name}`, source_code: params.get("source_code")! }
                owned.push(saved)
                return route.fulfill({ json: saved })
            })
        }],
    })
    const saves = recordSaves(page)
    await visitWithStubWebSocket(page, "/")
    await skipTour(page)
    await createScript(page, "retry_script")
    await createScript(page, "saved_script")

    const failedRequest = page.waitForEvent("requestfailed", request => request.url().endsWith("/scripts/save"))
    const loginFailure = failLogin(page)
    try {
        await failedRequest
        await expect.poll(() => delayedSaveStarted).toBe(true)
        // Rollback must wait for the second save, even though the first has failed.
        await expect(page.getByRole("dialog")).not.toContainText("Login failed due to network error.")
    } finally {
        releaseSave()
        await loginFailure
    }

    await expectMyScripts(page, 1)
    await expect(page.getByText("retry_script.py", { exact: true })).toBeVisible()
    await login(page)
    await expectMyScripts(page, 3)
    expect(saves.filter(name => name === "saved_script.py")).toHaveLength(1)
    expect(saves.filter(name => name === "retry_script.py")).toHaveLength(2)
    expect(saves).toHaveLength(3)
})
