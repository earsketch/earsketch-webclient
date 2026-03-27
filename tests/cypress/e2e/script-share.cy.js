import * as MockSocket from "mock-socket"

describe("shared scripts", () => {
    const apiHostname = "api-dev.ersktch.gatech.edu"
    const username = "cypress"

    const myScriptsShared = [{
        created: "2022-03-03 07:08:09.0",
        file_location: "",
        id: -1,
        modified: "2022-03-22 10:11:12.0",
        name: "bach_remix.py",
        run_status: 1,
        source_code: "from earsketch import *\n#todo: music\n",
        shareid: "2222222222222222222222",
        username: "friend_of_cypress",
    }]

    const newShared = {
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

    it("imports a shared script with a name conflict", () => {
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo(username)
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned([{
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
        }])
        cy.interceptScriptsShared(myScriptsShared)

        cy.interceptUsersNotifications([{
            created: newShared.created,
            id: 2,
            message: {},
            notification_type: "share_script",
            script_name: newShared.name,
            sender: newShared.username,
            shareid: newShared.shareid,
            unread: true,
            username: "cypress",
        }])

        cy.interceptScriptById(newShared).as("script_by_id_4444")

        cy.intercept(
            {
                hostname: apiHostname,
                method: "POST",
                path: "/EarSketchWS/scripts/saveshared",
            },
            {
                body: newShared,
            }
        ).as("script_save_shared")

        cy.intercept(
            { method: "POST", hostname: apiHostname, path: "/EarSketchWS/scripts/import" },
            { body: { ...newShared, creator: "another_user" } }
        ).as("script_import")

        cy.intercept(
            { method: "POST", hostname: apiHostname, path: "/EarSketchWS/scripts/rename" },
            { body: { ...newShared, creator: "another_user" } }
        ).as("script_rename")

        // login will include one shared script from the database
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login(username)

        // notifications will include one new shared script, immediately imported
        cy.get('button[title="Show/Hide Notifications"]').click()
        cy.get('button[title="Refresh notifications"]').click()

        // verify script browser
        cy.get("button[title='Open SCRIPTS Tab']").click()

        // view shared scripts
        cy.contains("div", "MY SCRIPTS (1)").click() // collapse
        cy.contains("div", "SHARED SCRIPTS (2)").click() // expand

        // imports a shared script with name conflict
        cy.contains("div", "mondays.py").click()
        cy.contains("span", "IMPORT TO EDIT").click()
        cy.get("input[value=RENAME]").click()

        // verify successful import, and name conflict handling
        cy.contains("div", "MY SCRIPTS (2)").click() // expand
        cy.contains("div", "SHARED SCRIPTS (1)").click() // collapse
        cy.contains("div", "mondays_1.py")
        cy.get("i.icon-copy3[title='Shared by another_user']")
    })
})
