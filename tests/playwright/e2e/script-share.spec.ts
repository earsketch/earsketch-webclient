import { test, expect } from "@playwright/test"
import { setupBackend, TEST_USER, type Script } from "../helpers/mocks"
import { skipTour, login } from "../helpers/actions"

const username = TEST_USER

const myScriptsShared: Script[] = [{
    created: "2022-03-03 07:08:09.0",
    file_location: "",
    id: -1,
    modified: "2022-03-22 10:11:12.0",
    name: "bach_remix.py",
    run_status: 1,
    shareid: "2222222222222222222222",
    soft_delete: false,
    source_code: "from earsketch import *\n#todo: music\n",
    username: "friend_of_tester",
}]

const newShared: Script = {
    created: "2022-03-28 17:56:20.0",
    description: "",
    file_location: "",
    id: -1,
    license_id: 1,
    modified: "2022-03-28 17:56:44.0",
    name: "mondays.py",
    run_status: 0,
    shareid: "4444444444444444444444",
    soft_delete: false,
    source_code: "# mondays.py\nfrom earsketch import *\n\nsetTempo(144)\n",
    username: "another_user",
}

test("imports a shared script with a name conflict", async ({ page }) => {
    const importedShared = { ...newShared, creator: newShared.username }
    await setupBackend(page, {
        interceptUsersAuth: true,
        userAudio: [],
        favorites: [],
        scriptsOwned: [{
            created: "2022-01-02 16:20:00.0",
            file_location: "",
            id: -1,
            modified: "2022-02-14 16:19:00.0",
            name: "mondays.py",
            run_status: 1,
            shareid: "1111111111111111111111",
            soft_delete: false,
            source_code: "from earsketch import *\nsetTempo(91)\n",
            username,
        }],
        scriptsShared: myScriptsShared,
        notifications: [{
            created: newShared.created,
            id: 2,
            message: {},
            notification_type: "share_script",
            script_name: newShared.name,
            sender: newShared.username,
            shareid: newShared.shareid,
            unread: true,
            username,
        }],
        interceptScriptById: newShared,
        interceptScriptImport: importedShared,
        interceptScriptRename: importedShared,
        interceptScriptSaveShared: newShared,
    })
    await page.goto("/")
    await skipTour(page)
    await login(page, username)

    // The unread share_script notification auto-adds the new shared script
    // (via /scripts/byid) to the shared-scripts list during login. Refresh the
    // notification dropdown to mirror the original test's manual interaction.
    await page.locator("button[title='Show/Hide Notifications']").click()
    await page.locator("button[title='Refresh notifications']").click()

    await page.locator("button[title='Open SCRIPTS Tab']").click()

    await page.getByText("MY SCRIPTS (1)", { exact: true }).click() // collapse
    await page.getByText("SHARED SCRIPTS (2)", { exact: true }).click() // expand

    await page.getByText("mondays.py", { exact: true }).click()
    await page.getByText("IMPORT TO EDIT").click()
    await page.locator("input[value='RENAME']").click()

    await page.getByText("MY SCRIPTS (2)", { exact: true }).click() // expand
    await page.getByText("SHARED SCRIPTS (1)", { exact: true }).click() // collapse
    await expect(page.getByText("mondays_1.py").first()).toBeVisible()
    await expect(page.locator("i.icon-copy3[title='Shared by another_user']")).toBeVisible()
})
