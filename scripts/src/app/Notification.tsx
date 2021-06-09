import React, { useState } from "react"
import { hot } from "react-hot-loader/root"
import { Provider, useSelector } from "react-redux"
import { react2angular } from "react2angular"

import * as appState from "./appState"
import store from "../reducers"
import * as userNotification from "./userNotification"

const colors: { [key: string]: { [key: string]: string } } = {
    dark: {
        normal: "#dff0d8",
        success: "#9ffa00",
        failure1: "#f2dede",
        failure2: "#ff8080",
        fallback: "white",
    },
    light: {
        normal: "#40463e",
        success: "#64dc35",
        failure1: "#d73636",
        failure2: "#d73636",
        fallback: "black",
    },
}

interface Message {
    text: string
    type: string
    duration: number
}

const queue: Message[] = []

export const NotificationBar = () => {
    const [message, setMessage] = useState(null as Message | null)

    const processQueue = () => {
        const message = queue.shift()!
        setMessage(message)
        window.setTimeout(() => {
            setMessage(null)
            if (queue.length > 0) {
                window.setTimeout(processQueue, 200)
            }
        }, message.duration * 1000)
    }

    userNotification.callbacks.show = (text, type="normal", duration=3) => {
        queue.push({ text, type, duration })
        // If there's no ongoing notification, show the first message in queue.
        if (!message) {
            processQueue()
        }
    }

    return message && <div className="notificationBar" style={{ color: colors.dark[message.type] }}>{message.text}</div>
}

const popupQueue: Message[] = []
let popupTimeout = 0

export const NotificationPopup = () => {
    const theme = useSelector(appState.selectColorTheme)
    const [message, setMessage] = useState(null as Message | null)

    if (message === null && popupTimeout === 0 && popupQueue.length > 0) {
        // Show the next message after the current one is finished.
        popupTimeout = window.setTimeout(() => popupTimeout = queueNext(), 200)
    }

    const queueNext = () => {
        const message = popupQueue.shift()!
        setMessage(message)
        return window.setTimeout(() => {
            popupTimeout = 0
            setMessage(null)
        }, message.duration * 1000)
    }

    userNotification.callbacks.popup = (text, type="fallback", duration=8) => {
        popupQueue.push({ text, type, duration })
        // if there's no ongoing notification, show the first message in popupQueue
        if (!message) {
            popupTimeout = queueNext()
        }
    }

    return message && <div className="notificationPopup" style={{ color: colors[theme][message.type] ?? colors[theme].fallback }}>
        <div className="arrow" style={{
            position: "absolute", top: "-11px", right: "21px", height: 0, width: 0,
            borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "14px solid" }}>
        </div>
        <div>
            <span style={{ float: "left", overflow: "hidden", width: "210px", textOverflow: "ellipsis" }}>{message.text}</span>
            <span style={{ float: "right", cursor: "pointer", color: "indianred" }} onClick={() => {
                clearTimeout(popupTimeout)
                popupTimeout = 0
                setMessage(null)
            }}>X</span>
        </div>
    </div>
}

const HotNotificationBar = hot(() => <Provider store={store}><NotificationBar /></Provider>)
const HotNotificationPopup = hot(() => <Provider store={store}><NotificationPopup /></Provider>)

app.component("notificationBar", react2angular(HotNotificationBar))
app.component("notificationPopup", react2angular(HotNotificationPopup))