import esconsole from "../esconsole"

// If a connection attempt is taking longer than TIMEOUT seconds,
// we will disconnect and try reconnecting.
const TIMEOUT = 20

// Module state:
let connectTime = 0
let timer = 0

let ws: WebSocket | null
let username: string | null
let pendingMessages: any[] = []

type Subscriber = (data: any) => void
const subscribers: Subscriber[] = []

export function login(username_: string) {
    console.log("username:", username_)

    if (username !== null) {
        // This function should only ever be called once (per login).
        return
    }
    username = username_.toLowerCase() // Fix for issue #1858
    connect()
}

function connect() {
    console.log("connect:", ws?.readyState)

    if (ws?.readyState === WebSocket.OPEN) {
        // We already have a valid connection, no need to connect.
        return
    } else if (ws?.readyState === WebSocket.CONNECTING) {
        if (Date.now() - connectTime < TIMEOUT * 1000) {
            // We have a connection that has been attempting to connect for less than TIMEOUT,
            // so let it keep going!
            return
        } else {
            // Connection has been connecting for longer than TIMEOUT, so let's close it and try again.
            ws.close()
            ws = null
        }
    } else if ([WebSocket.CLOSING, WebSocket.CLOSED].includes(ws?.readyState as any)) {
        ws = null
    }

    ws = new WebSocket(`${URL_WEBSOCKET}/socket/${username}/`)
    connectTime = Date.now()

    ws.onopen = () => {
        esconsole("socket has been opened", "websocket")
        // Start keepalive heartbeat.
        keepalive()
    }

    ws.onerror = (event) => esconsole(event, "websocket")

    // NOTE: keepalive/send is responsible for attempting a reconnect (as determined by TIMEOUT).
    ws.onclose = () => esconsole("socket has been closed", "websocket")

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        for (const subscriber of subscribers) {
            subscriber(data)
        }
    }
}

function keepalive() {
    console.log("keepalive")
    // This will happen at most once every TIMEOUT seconds.
    // Note that `send()` resets the timeout.
    send({ notification_type: "dummy" })
}

export function send(data: any) {
    console.log("send:", data)

    pendingMessages.push(data)

    if (ws?.readyState !== WebSocket.OPEN) {
        // WebSocket is not ready for use.
        // Connect, which will flush the queue when the WebSocket is ready.
        connect()
        return
    }

    // Flush message queue.
    while (pendingMessages.length) {
        ws!.send(JSON.stringify(pendingMessages.shift()))
    }

    // Reset timer for keepalive, since we just sent at least one message.
    window.clearTimeout(timer)
    timer = window.setTimeout(keepalive, TIMEOUT * 1000)
}

export function subscribe(callback: Subscriber) {
    console.log("subscribe:", callback)
    subscribers.push(callback)
}

export function logout() {
    console.log("logout")
    pendingMessages = []
    username = null
    window.clearTimeout(timer)
    ws?.close()
    ws = null
}
