/* eslint-disable no-undef */
import * as MockSocket from "mock-socket"

const createServer = (url) => {
    const notifications = {
        notification_type: "notifications",
        notifications: [
            {
                created: "2022-03-25 20:41:48.0",
                id: 72373,
                message: { text: "An old broadcast", hyperlink: "", expiration: "7" },
                notification_type: "broadcast",
                sender: "user3",
                unread: true,
            },
        ],
    }

    return new Cypress.Promise((resolve) => {
        const mockServer = new MockSocket.Server(url)

        mockServer.on("connection", (connection) => {
            connection.send(JSON.stringify(notifications))

            connection.on("message", (message) => {
                message = JSON.parse(message)
                connection.send(JSON.stringify(message)) // echo response
            })

            resolve(connection)
        })
    })
}

module.exports = { createServer }
