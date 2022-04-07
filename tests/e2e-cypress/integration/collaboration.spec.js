/* eslint-disable no-undef */
import { createServer } from "../support/wsServer"
import * as MockSocket from "mock-socket"

describe("collaboration", () => {
    const wsServer = createServer("wss://api-dev.ersktch.gatech.edu/EarSketchWS/socket/cypress/")

    it("joins and edits", () => {
        const myCollabScripts = [
            {
                name: "live_code_with_me.py",
                collaborators: ["cypress"],
                created: "2021-02-05 14:12:22.0",
                creator: "friend2",
                description: "",
                file_location: "",
                id: -1,
                licenseInfo: "CC BY - Creative Commons Attribution: This license lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.",
                license_id: 1,
                modified: "2022-02-03 19:04:38.0",
                run_status: 2,
                shareid: "-WNilN4_g8r3TkUZpHaymw",
                source_code: "#\t\tpython code\n#\t\tscript_name:\n#\n#\t\tauthor:\n#\t\tdescription:\n#\n\nfrom earsketch import *\n\ninit()\nsetTempo(120)\n\n\n\nfinish()\n",
                username: "friend2",
            },
        ]

        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared(myCollabScripts)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        // cy.get("div.bg-red-600.rounded-2xl").contains("2") // red badge needs a unique title
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "SHARED SCRIPTS (1)").click()
        cy.contains("div", "live_code_with_me.py").click()

        // up {"action":"joinSession","state":0,"notification_type":"collaboration","scriptID":"-WNilN4_g8r3TkUZpHaymw","sender":"cypress"}
        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "joinedSession",
                activeMembers: ["cypress"],
                notification_type: "collaboration",
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                scriptText: "#\t\tpython code\n#\t\tscript_name:\n#\n#\t\tauthor:\n#\t\tdescription:\n#\n\nfrom earsketch import *\n\ninit()\nsetTempo(120)\n\n\n\nfinish()\n",
                sender: "cypress",
                state: 0,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "memberJoinedSession",
                notification_type: "collaboration",
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "cursorPosition",
                notification_type: "collaboration",
                position: 110,
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 0,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                ID: "q847zzxcpf",
                action: "edit",
                editData: { len: 1, start: 110, action: "insert", end: 111, text: "#", user: "friend2" },
                notification_type: "collaboration",
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 0,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "cursorPosition",
                notification_type: "collaboration",
                position: 111,
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 1,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                ID: "xkv67uiei7",
                action: "edit",
                editData: { len: 1, start: 111, action: "insert", end: 112, text: "h", user: "friend2" },
                notification_type: "collaboration",
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 1,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "cursorPosition",
                notification_type: "collaboration",
                position: 112,
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 2,
            }
        )

        cy.incomingWebSocketMessage(
            wsServer,
            {
                ID: "f3y31uslub",
                action: "edit",
                editData: { len: 1, start: 112, action: "insert", end: 113, text: "i", user: "friend2" },
                notification_type: "collaboration",
                scriptID: "-WNilN4_g8r3TkUZpHaymw",
                sender: "friend2",
                state: 2,
            }
        )
    })
})
