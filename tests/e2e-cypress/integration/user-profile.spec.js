/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("fitMedia (py) script", () => {
    it("Logs in, creates a new script, runs with fit media", () => {
        // Stubbing

        cy.interceptAudioStandard([])

        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()

        cy.interceptScriptsOwned([])
        cy.interceptScriptsShared()

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        cy.get("#app-title").should("contain", "EarSketch")

    })
})
