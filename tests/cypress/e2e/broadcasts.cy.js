import * as MockSocket from "mock-socket"

describe("Notifications", () => {
    it("delivers broadcast on login", () => {
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptUsersNotifications([{
            notification_type: "broadcast",
            username: "user2",
            message: { text: "Hello, EarSketch!", hyperlink: "", expiration: 7 },
        }])
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()

        // login
        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login()

        // broadcasts no longer inflate the unread count; instead, a separate
        // blue exclamation indicator should be visible.
        cy.get("[data-test='numUnreadNotifications']").should("not.exist")
        cy.get("[data-test='broadcastIndicator']").should("be.visible")
    })
})
