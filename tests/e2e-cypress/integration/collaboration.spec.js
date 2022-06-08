import { createServer } from "../support/wsServer"
import * as MockSocket from "mock-socket"

describe("collaboration", () => {
    const wsServer = createServer("wss://api-dev.ersktch.gatech.edu/EarSketchWS/socket/cypress/")

    it("joins and edits", () => {
        const scriptText = "#\t\tpython code\n#\t\tscript_name:\n#\n#\t\tauthor:\n#\t\tdescription:\n#\n\nfrom earsketch import *\n\ninit()\nsetTempo(120)\n\n\n\nfinish()\n"
        const scriptShareId = "-WNilN4_g8r3TkUZpHaymw"

        const myCollabScripts = [
            {
                name: "live_code_with_me.py",
                collaborators: ["cypress"],
                created: "2021-02-05 14:12:22.0",
                creator: "friend2",
                description: "",
                file_location: "",
                id: -1,
                licenseInfo: `CC BY - Creative Commons Attribution: 
This license lets others distribute, remix, tweak, and build upon your work, 
even commercially, as long as they credit you for the original creation. This 
is the most accommodating of licenses offered. Recommended for maximum 
dissemination and use of licensed materials.`,
                license_id: 1,
                modified: "2022-02-03 19:04:38.0",
                run_status: 2,
                shareid: scriptShareId,
                source_code: scriptText,
                username: "friend2",
            },
        ]

        const receiveCollabCode = (code) => {
            // receive incoming collaboration typing via websocket
            let randId = 1
            let cursorPos = 110
            const receiveCollabChar = (nextChar) => {
                cy.incomingWebSocketMessage(
                    wsServer,
                    {
                        action: "cursorPosition",
                        notification_type: "collaboration",
                        position: cursorPos,
                        scriptID: scriptShareId,
                        sender: "friend2",
                        state: 0,
                    }
                )
                cy.incomingWebSocketMessage(
                    wsServer,
                    {
                        ID: randId.toString(),
                        action: "edit",
                        editData: { user: "friend2", action: "insert", start: cursorPos, end: cursorPos + 1, len: 1, text: nextChar },
                        notification_type: "collaboration",
                        scriptID: scriptShareId,
                        sender: "friend2",
                        state: 0,
                    }
                )
                randId += 1
                cursorPos += 1
            }
            // send each character of the message one at a time, like the client
            for (let i = 0; i < code.length; i++) {
                receiveCollabChar(code.charAt(i))
            }
        }

        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared(myCollabScripts)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        // open a script with collaboration
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.contains("div", "SHARED SCRIPTS (1)").click()
        cy.contains("div", "live_code_with_me.py").click()

        // join a script collaboration session
        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "joinedSession",
                activeMembers: ["cypress"],
                notification_type: "collaboration",
                scriptID: scriptShareId,
                scriptText: scriptText,
                sender: "cypress",
                state: 0,
            }
        )

        // collaborator now joins our session
        cy.incomingWebSocketMessage(
            wsServer,
            {
                action: "memberJoinedSession",
                notification_type: "collaboration",
                scriptID: scriptShareId,
                sender: "friend2",
            }
        )

        // receive incoming collaboration typing to our script
        const code = `print("mU" + "${51}" + "k!")`
        receiveCollabCode(code)

        // run the script and verify that we received the code
        cy.get("#run-button").click()
        cy.contains("mU51k!")
    })
})
