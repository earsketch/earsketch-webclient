import esconsole from "../esconsole"
import * as userNotification from "../user/notification"

let ws: WebSocket | null
let reconnect = 10
let timer = 0
const pendingMessages: any[] = []
type Subscriber = (data: any) => void
const subscribers: Subscriber[] = []

export let isOpen = false

export function connect(username: string, callback?: Function) {
    if (username === "") {
        return // username is an empty string, not ready to connect to websocket
    }

    username = username.toLowerCase() // Fix for issue #1858
    ws = new WebSocket(`${URL_WEBSOCKET}/socket/${username}/`)

    ws.onopen = () => {
        esconsole("socket has been opened", "websocket")
        isOpen = true
        if (callback !== undefined) {
            callback()
        }
        checkin(username)
    }

    ws.onerror = (event) => esconsole(event, "websocket")

    ws.onclose = (event) => {
        esconsole("socket has been closed", "websocket")
        isOpen = false
        if (reconnect > 0) {
            esconsole(event, "reconnecting (" + reconnect + " times remaining)")
            connect(username)
            reconnect--
        } else {
            checkout()
        }
    }

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        for (const subscriber of subscribers) {
            subscriber(data)
        }

        // TODO: handle these in userNotification
        if (data.notification_type === "notifications") {
            userNotification.loadHistory(data.notifications)
        } else if (data.notification_type === "broadcast") {
            userNotification.handleBroadcast(data)
        } else if (data.notification_type === "collaboration") {
            // Handled by collaboration; don't spam the console.
        } else {
            esconsole(data, "websocket")
        }
    }
}

export function disconnect() {
    checkout()
    ws?.close()
}

// Keep websocket connection alive.
function checkin(username: string) {
    reconnect = 10
    send({ notification_type: "dummy", sender: username })
    timer = window.setTimeout(() => checkin(username), 20000)
}

function checkout() {
    reconnect = 0
    clearTimeout(timer)
}

export function subscribe(callback: Subscriber) {
    subscribers.push(callback)
}

export function send(data: any) {
    pendingMessages.push(data)
    const username = data.sender // infer sender from message

    if (!isOpen && username !== undefined) {
        esconsole("Reinitializing websocket connection before send", ["info"])
        connect(username)
    }
    if (isOpen) {
        while (pendingMessages.length) {
            ws!.send(JSON.stringify(pendingMessages.shift()))
        }
    }
}

// TODO: probably move this to the notification service
export function broadcast(text: string, user: string, hyperlink?: string, expiration?: number, type?: string) {
    // TODO: For unknown reasons, expiration is ignored here.
    user = user.toLowerCase() // Fix for issue #1858

    send({
        notification_type: type ?? "broadcast",
        username: user,
        message: {
            text: text,
            hyperlink: hyperlink ?? "",
            expiration: 0,
        },
    })
}
