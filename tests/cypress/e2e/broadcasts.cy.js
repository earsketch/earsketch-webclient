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
        // blue bullhorn indicator should be visible.
        cy.get("[data-test='numUnreadNotifications']").should("not.exist")
        cy.get("[data-test='broadcastIndicator']").should("be.visible")
    })

    it("hides broadcast indicator while unread non-broadcast notifications exist", () => {
        cy.interceptAudioStandard()
        cy.interceptUsersToken()
        cy.interceptUsersInfo()
        cy.interceptUsersNotifications([
            {
                notification_type: "broadcast",
                username: "user2",
                message: { text: "Hello, EarSketch!", hyperlink: "", expiration: 7 },
            },
            {
                id: 2,
                notification_type: "share_script",
                message: {},
                script_name: "shared.py",
                sender: "user3",
                shareid: "abc123",
                unread: true,
                username: "cypress",
            },
        ])
        cy.interceptAudioUser()
        cy.interceptAudioFavorites()
        cy.interceptScriptsOwned()
        cy.interceptScriptsShared()

        cy.visitWithStubWebSocket("/", MockSocket.WebSocket)
        cy.skipTour()
        cy.login()

        // The red unread badge takes priority; the broadcast badge is hidden
        // until all non-broadcast notifications are read.
        cy.get("[data-test='numUnreadNotifications']").should("be.visible")
        cy.get("[data-test='broadcastIndicator']").should("not.exist")
    })
})
