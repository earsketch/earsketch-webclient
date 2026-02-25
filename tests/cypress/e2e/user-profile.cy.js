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
        cy.skipTour()
        cy.login()

        // Confirm open
        cy.get("h1").should("contain", "EarSketch")

        // Change details
        cy.contains("button", "cypress").click()
        cy.contains("button", "Edit Profile").click()

        cy.get("input[name='email']").type(changedEmail)
        cy.get("input[name='password']").type(originalPassword)
        cy.get("input[name='newPassword']").type(changedPassword)
        cy.get("input[name='confirmPassword']").type(changedPassword)
        cy.get("input[value='UPDATE']").click()
    })
})
