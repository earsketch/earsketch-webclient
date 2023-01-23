import { createServer } from "../support/wsServer"
import * as MockSocket from "mock-socket"

describe("shared script", () => {
    const apiHostname = "api-dev.ersktch.gatech.edu"
    const username = "cypress"
    const wsServer = createServer(`wss://${apiHostname}/EarSketchWS/socket/${username}/`)

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
            username: username,
        }])
        cy.interceptScriptsShared(myScriptsShared)

        cy.intercept(
            {
                hostname: apiHostname,
                method: "GET",
                path: "EarSketchWS/scripts/byid?scriptid=4444444444444444444444",
            },
            {
                body: newShared,
            }
        ).as("script_by_id_1C0A")

        cy.intercept(
            {
                hostname: apiHostname,
                method: "POST",
                path: "EarSketchWS/scripts/saveshared",
            },
            {
                body: newShared,
            }
        ).as("script_by_id_1C0A")

        cy.intercept(
            { method: "POST", hostname: apiHostname, path: "/EarSketchWS/scripts/import" },
            { body: { ...newShared, creator: "another_user" } }
        ).as("script_import")

        cy.intercept(
            { method: "POST", hostname: apiHostname, path: "/EarSketchWS/scripts/rename" },
            { body: { ...newShared, creator: "another_user" } }
        ).as("script_rename")

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()

        // login will include one shared script from the database
        cy.login(username)

        cy.get("button[title='Open SCRIPTS Tab']").click()

        myScriptsShared.push(newShared)

        // notifications will include one shared script, not yet saved to the database
        cy.incomingWebSocketMessage(
            wsServer,
            {
                notification_type: "notifications",
                notifications:
                    [{
                        created: "2022-03-28 17:56:44.0",
                        id: 2,
                        message: {},
                        notification_type: "share_script",
                        script_name: "bach_remix.py",
                        sender: "another_user",
                        shareid: "4444444444444444444444",
                        unread: true,
                        username: "cypress",
                    }],
            }
        )

        // view shared scripts, hide my scripts
        cy.contains("div", "MY SCRIPTS (1)").click() // collapse
        cy.contains("div", "SHARED SCRIPTS (2)").click() // expand

        // imports a shared script with name conflict
        cy.contains("div", "mondays.py").click()
        cy.contains("span", "IMPORT TO EDIT").click()
        cy.get("input[value=RENAME]").click()

        // verify
        cy.contains("div", "MY SCRIPTS (2)").click() // expand
        cy.contains("div", "SHARED SCRIPTS (1)").click() // collapse
        cy.contains("div", "mondays_1.py")
        cy.get("i.icon-copy3[title='Shared by another_user']")
    })
})
