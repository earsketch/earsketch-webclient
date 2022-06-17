/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

describe("Edit User Profile", () => {
    it("log in and change user email and password", () => {
        // Constants
        const changedEmail = "alternate.cypress@earsketch.cyp"
        const originalPassword = "not_a_real_password"
        const changedPassword = "this_is_changed"

        // Stubbing
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned([])
        cy.interceptScriptsShared()
        cy.interceptUsersEdit()
        cy.interceptModifyPassword(originalPassword)

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.login()

        // Confirm open
        cy.get("#app-title").should("contain", "EarSketch")

        // Change details
        cy.contains("button", "cypress").click()
        cy.contains("button", "Edit Profile").click()

        cy.get("input[placeholder='Email Address (Optional)']").type(changedEmail)
        cy.get("input[placeholder='Verify your current password']").type(originalPassword)
        cy.get("input[placeholder='New password (Optional)']").type(changedPassword)
        cy.get("input[placeholder='Confirm new password']").type(changedPassword)
        cy.get("input[value='UPDATE']").click()
    })
})
