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

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login()

        cy.get("[data-test='numUnreadNotifications']").contains("1")
    })
})
