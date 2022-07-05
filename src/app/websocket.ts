import esconsole from "../esconsole"

// If a connection attempt is taking longer than TIMEOUT seconds,
// we will disconnect and try reconnecting.
const TIMEOUT = 20

// Module state:
let connectTime = 0
let timer = 0

let ws: WebSocket | null = null
let username: string | null = null
let pendingMessages: any[] = []

type Subscriber = (data: any) => void
const subscribers: Subscriber[] = []

export function login(username_: string) {
    // This function should only ever be called once (per login).
    if (username === null) {
        username = username_.toLowerCase() // Fix for issue #1858
        // Start keepalive heartbeat.
        keepalive()
        timer = window.setInterval(keepalive, TIMEOUT * 1000)
    }
}

function connect() {
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
        flush() // flush any messages queued during the websocket connect process
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
    // This happens once every TIMEOUT seconds.
    send({ notification_type: "dummy" })
}

export function send(data: any) {
    pendingMessages.push(data)
    if (ws?.readyState !== WebSocket.OPEN) {
        // WebSocket is not ready for use.
        // Connect, which will flush the queue when the WebSocket is ready.
        connect()
        return
    }
    flush()
}

function flush() {
    // Flush message queue.
    while (pendingMessages.length) {
        ws!.send(JSON.stringify(pendingMessages.shift()))
    }
}

export function subscribe(callback: Subscriber) {
    subscribers.push(callback)
}

export function logout() {
    pendingMessages = []
    username = null
    window.clearInterval(timer)
    ws?.close()
    ws = null
}
