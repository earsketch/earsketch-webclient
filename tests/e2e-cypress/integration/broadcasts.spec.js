import { createServer } from "../support/wsServer"
import * as MockSocket from "mock-socket"

describe("broadcast notification", () => {
    const wsServer = createServer("wss://api-dev.ersktch.gatech.edu/EarSketchWS/socket/cypress/")

    it("is received", () => {
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        const msgForAll = "Hello, EarSketch!"

        cy.incomingWebSocketMessage(
            wsServer,
            {
                notification_type: "broadcast",
                username: "user2",
                message: { text: msgForAll, hyperlink: "", expiration: 13 },
            }
        )

        cy.get("div.bg-red-600.rounded-2xl").contains("2") // red badge needs a unique title

        cy.get("div").contains("From EarSketch team: " + msgForAll)
    })
})
