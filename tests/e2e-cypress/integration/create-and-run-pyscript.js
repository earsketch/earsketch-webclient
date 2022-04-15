/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("fitMedia (py) script", () => {
    it("Logs in, creates a new script, runs with fit media", () => {
        const cypTestScriptId = Math.floor(Math.random() * 1000)
        const cypTestName = "test" + cypTestScriptId

        // Standard Stubbing
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()
        cy.interceptScriptSave(cypTestName + ".py")

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        cy.get("#app-title").should("contain", "EarSketch")

        // Add Script
        cy.get("button[title='Open SCRIPTS Tab']").click()
        cy.get("button[title='Create a new script']").click()
        cy.get("input[name='Script Name']").type(cypTestName)
        cy.get("input[value='CREATE']").click()

        // Add fitMedia line of code
        cy.get(".ace_content").click()
        cy.get(".ace_content")
            .type(Cypress._.repeat("{downarrow}", 10))
            .type("fitMedia(HIPHOP_FUNKBEAT_001, 1, 1, 9)")

        // Run new Script
        cy.get("button[id='run-button']").click()

        // Confirm success from the ES console
        cy.contains("span", "Script ran successfully")

        // Logout (optional)
        cy.get("button[id=headlessui-menu-button-11]").click()
        cy.get("button").contains("Logout").click()
    })
})
