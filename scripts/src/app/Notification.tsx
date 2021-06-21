import React, { useState } from "react"
import { useSelector } from "react-redux"

import * as appState from "./appState"
import * as ESUtils from "../esutils"
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

export const NotificationList = ({ editProfile, openSharedScript, openCollaborativeScript, toggleNotificationHistory }:
    { editProfile: () => void, openSharedScript: (shareid: string) => void, openCollaborativeScript: (shareid: string) => void, toggleNotificationHistory: (b: boolean) => void }
) => {
    const now = Date.now()
    return <div style={{ padding: "10px", minWidth: "15em" }}>
        {userNotification.history.length === 0
        ? <div>
            <div className="flex justify-between items-center">
                <div className="text-center m-auto">There are no notifications.</div>
            </div>
        </div>
        : <div>
            <div className="flex justify-between">
                <div className="float-left" style={{ color: "grey" }}>
                    <i className="icon icon-bell mr-3" />
                    Notifications
                </div>
                <div className="float-right">
                    <a href="#" onClick={() => toggleNotificationHistory(true)}>VIEW ALL</a>
                </div>
            </div>
            <hr style={{ border: "solid 1px dimgrey", marginTop: "10px" }} />
            {userNotification.history.slice(0, 5).map((item, index) =>
            <div key={index}>
                <div style={{ margin: "10px" }} onClick={() => userNotification.readMessage(index, item)}>
                    {/* pin or read/unread marker */}
                    <div className="flex items-center float-left" style={{ margin: "10px", marginLeft: 0 }}>
                        {item.pinned
                        ? <i className="icon icon-pushpin" />
                        : <div className={item.unread ? "marker" : "empty-marker"} />}
                    </div>

                    {/* contents */}
                    <div style={{ width: "210px" }}>
                        {/* common field (text & date) */}
                        <div style={{ maxWidth: "210px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.message.text}
                        </div>
                        <div style={{ fontSize: "10px", color: "grey", float: "left" }}>
                            {ESUtils.formatTime(now - item.time)}
                        </div>

                        {/* special actions */}
                        <div className="float-right">
                            {item.notification_type === "broadcast" && item.message.hyperlink &&
                            <div>
                                <a href={item.message.hyperlink} target="_blank">MORE</a>
                            </div>}
                            {item.notification_type === "share_script" &&
                            <div>
                                <span onClick={() => openSharedScript(item.shareid!)}><a href="#">OPEN</a></span>
                            </div>}
                            {item.notification_type === "collaborate_script" &&
                            <div>
                                {item.message.action === "userAddedToCollaboration" && <span onClick={() => openCollaborativeScript(item.shareid!)}><a href="#">OPEN</a></span>}
                                {item.message.action === "scriptRenamed" && <span onClick={() => openCollaborativeScript(item.shareid!)}><a href="#">OPEN</a></span>}
                            </div>}
                            {item.notification_type === "editProfile" &&
                            <div><span onClick={editProfile}><a href="#">OPEN</a></span></div>}
                        </div>
                    </div>
                </div>
                {index < userNotification.history.length - 1 && <hr style={{ margin: "10px", border: "solid 1px dimgrey" }} />}
            </div>)}
            {userNotification.history.length > 5 &&
            <div onClick={() => toggleNotificationHistory(true)} className="text-center" style={{ fontSize: "20px", marginTop: "-10px" }}>
                .....
            </div>}
        </div>}
    </div>
}

export const NotificationHistory = ({ openSharedScript, toggleNotificationHistory }: { openSharedScript: (shareid: string) => void, toggleNotificationHistory: (b: boolean) => void }) => {
    const now = Date.now()

    return <div id="notification-history">
        <div className="flex justify-between" style={{ padding: "1em" }}>
            <div>
                <a href="#" onClick={() => toggleNotificationHistory(false)}>
                    <i id="back-button" className="icon icon-arrow-right22"></i>
                </a>
                <span style={{ color: "grey" }}>
                    <i className="icon icon-bell" /> Notifications
                </span>
            </div>
            <div>
                <a className="closemodal buttonmodal cursor-pointer" style={{ color: "#d04f4d" }} onClick={() => toggleNotificationHistory(false)}><span><i className="icon icon-cross2" /></span>CLOSE</a>
            </div>
        </div>

        <div className="notification-type-header">Pinned Notifications</div>
        {userNotification.history.map((item, index) =>
        ["broadcast", "teacher_broadcast"].includes(item.notification_type) && <div key={index}>
            <div style={{ margin: "10px 20px" }}>
                <div className="flex items-center float-left" style={{ margin: "10px", marginLeft: 0 }}>
                    <div><i className="icon icon-pushpin"></i></div>
                </div>
                <div className="flex justify-between">
                    <div>
                        <div>{item.message.text}</div>
                        <div style={{ fontSize: "10px", color: "grey" }}>{ESUtils.formatTime(now - item.time)}</div>
                    </div>
                    {item.message.hyperlink && <div>
                        <a href={item.message.hyperlink} target="_blank" className="cursor-pointer">MORE</a>
                    </div>}
                </div>
            </div>
            {index < userNotification.history.length - 1 &&
            <hr style={{ margin: "10px 20px", border: "solid 1px dimgrey" }} />}
        </div>)}

        <div className="notification-type-header flex justify-between">
            <div>Other Notifications</div>
            <div><a href="#" onClick={userNotification.markAllAsRead}>MARK ALL AS READ</a></div>
        </div>
        {userNotification.history.map((item, index) =>
        !["broadcast", "teacher_broadcast"].includes(item.notification_type) && <div key={index}>
            <div className="cursor-pointer" style={{ margin: "10px 20px" }} onClick={() => userNotification.readMessage(index, item)}>
                <div className="flex items-center float-left" style={{ margin: "10px" }}>
                    <div className={item.unread ? "marker" : "empty-marker"}></div>
                </div>
                <div className="flex justify-between">
                    <div>
                        <div>
                            {item.message.text}
                        </div>
                        <div style={{ fontSize: "10px", color: "grey" }}>
                            {ESUtils.formatTime(now - item.time)}
                        </div>
                    </div>
                    {item.notification_type === "share_script" && <div>
                        <span onClick={() => openSharedScript(item.shareid!)}><a href="#" className="cursor-pointer">OPEN</a></span>
                    </div>}
                </div>
            </div>
            {index < history.length - 1 && <hr style={{ margin: "10px 20px", border: "solid 1px dimgrey" }} />}
        </div>)}
    </div>
}