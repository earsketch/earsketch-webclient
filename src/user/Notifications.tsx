import React, { useEffect, useRef, useState } from "react"
import { Popover } from "@headlessui/react"
import { useSelector } from "react-redux"

import * as ESUtils from "../esutils"
import * as userNotification from "./notification"
import * as user from "./userState"
import { useTranslation } from "react-i18next"
import * as appState from "../app/appState"
import * as request from "../request"

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

    userNotification.callbacks.show = (text, type = "normal", duration = 3) => {
        queue.push({ text, type, duration })
        // If there's no ongoing notification, show the first message in queue.
        if (!message) {
            processQueue()
        }
    }

    return message && <div className={"text-sm notificationBar " + message.type} data-test="notificationBar" role="alert" aria-live="assertive">{message.text}</div>
}

const popupQueue: Message[] = []
let popupTimeout = 0

export const NotificationPopup = () => {
    const [message, setMessage] = useState(null as Message | null)
    const doNotDisturb = useSelector(appState.selectDoNotDisturb)

    if (message === null && popupTimeout === 0 && popupQueue.length > 0) {
        // Show the next message after the current one is finished.
        popupTimeout = window.setTimeout(() => (popupTimeout = queueNext()), 200)
    }

    const queueNext = () => {
        const message = popupQueue.shift()!
        setMessage(message)
        return window.setTimeout(() => {
            popupTimeout = 0
            setMessage(null)
        }, message.duration * 1000)
    }

    userNotification.callbacks.popup = (text, type = "fallback", duration = 8) => {
        popupQueue.push({ text, type, duration })
        // if there's no ongoing notification, show the first message in popupQueue
        if (!message) {
            popupTimeout = queueNext()
        }
    }

    // if notifications have been disabled, do not show a pop-up
    if (doNotDisturb) { return <div/> }

    return message && <div className={"absolute notificationPopup " + message.type}>
        <div className="arrow" style={{
            position: "absolute",
            top: "-11px",
            right: "21px",
            height: 0,
            width: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: "14px solid",
        }}>
        </div>
        <div>
            <span style={{ float: "left", overflow: "hidden", width: "210px", textOverflow: "ellipsis" }}>
                <MarkdownLinkMessage text={message.text} />
            </span>
            <span style={{ float: "right", cursor: "pointer", color: "indianred" }} onClick={() => {
                clearTimeout(popupTimeout)
                popupTimeout = 0
                setMessage(null)
            }}>X</span>
        </div>
    </div>
}

/** Automatically fetch notifications every X minutes when logged in */
const useNotificationLongPolling = () => {
    const FETCH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

    const isLoggedIn = useSelector(user.selectLoggedIn)

    useEffect(() => {
        if (!isLoggedIn) return

        const fetchNotifications = async () => {
            try {
                const result = await request.getAuth("/users/notifications")
                if (Array.isArray(result)) {
                    userNotification.loadHistory(result)
                }
            } catch (error) {
                console.error("Error fetching notifications:", error)
            }
        }

        let intervalId: number | null = null

        const startPolling = () => {
            if (intervalId != null) return
            fetchNotifications()
            intervalId = window.setInterval(fetchNotifications, FETCH_INTERVAL_MS)
        }

        const stopPolling = () => {
            if (intervalId == null) return
            clearInterval(intervalId)
            intervalId = null
        }

        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                console.log("Visibility change: Start notification polling", new Date().toLocaleTimeString())
                startPolling()
            } else {
                console.log("Visibility change: Stop notification polling", new Date().toLocaleTimeString())
                stopPolling()
            }
        }

        // start based on initial visibility
        onVisibilityChange()

        document.addEventListener("visibilitychange", onVisibilityChange)

        return () => {
            stopPolling()
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [isLoggedIn])
}

/** Notification bell icon and dropdown menu for the header nav */
export const NotificationMenu = ({ openSharedScript }: { openSharedScript: (s: string) => void }) => {
    const notifications = useSelector(user.selectNotifications)
    const numUnread = notifications.filter(v => v && (v.unread || v.notification_type === "broadcast")).length
    const { t } = useTranslation()

    const [showHistory, setShowHistory] = useState(false)

    // Initiate long-polling for notifications
    useNotificationLongPolling()

    return <>
        {showHistory && <NotificationHistory openSharedScript={openSharedScript} close={() => setShowHistory(false)} />}
        <Popover>
            <Popover.Button className="text-gray-400 hover:text-gray-300 text-2xl mx-3 relative" title={t("ariaDescriptors:header.toggleNotifications")}>
                <i className="icon icon-bell" />
                {numUnread > 0 && <div role="status" aria-label={t("ariaDescriptors:header.unreadNotifications", { numUnread })} className="text-sm w-4 h-4 text-white bg-red-600 rounded-full absolute top-0 -right-1 leading-none" data-test="numUnreadNotifications">{numUnread}</div>}
            </Popover.Button>
            <div className="relative right-1">
                <NotificationPopup />
            </div>
            <Popover.Panel className="absolute z-10 mt-1 bg-gray-100 shadow-lg p-2 -translate-x-3/4">
                {({ close }) => <NotificationList
                    openSharedScript={openSharedScript}
                    showHistory={setShowHistory}
                    close={close}
                />}
            </Popover.Panel>
        </Popover>
    </>
}

const Notification = ({ item, openSharedScript, close }: {
    item: user.Notification, close: () => void, openSharedScript: (s: string) => void,
}) => {
    const { t } = useTranslation()

    return <div>
        <div style={{ margin: "10px" }} onClick={() => userNotification.markAsRead(item)}>
            <div className="flex items-start">
                {/* pin or read/unread marker */}
                <div className="mr-1.5">
                    {item.pinned
                        ? <i className="icon icon-pushpin text-sm" />
                        : <div className={item.unread ? "marker" : "empty-marker"} />}
                </div>

                {/* contents */}
                <div style={{ width: "210px" }}>
                    {/* common field (text & date) */}
                    <div className="text-sm" style={{ maxWidth: "210px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <MarkdownLinkMessage text={item.message.text} />
                    </div>
                    <div className="flex justify-between">
                        <div style={{ fontSize: "10px", color: "grey", float: "left" }}>
                            {ESUtils.humanReadableTimeAgo(item.time)}
                        </div>

                        {/* special actions */}
                        {item.notification_type === "broadcast" && item.message.hyperlink &&
                        <div>
                            <a href={item.message.hyperlink} target="_blank" rel="noreferrer">{t("more").toLocaleUpperCase()}</a>
                        </div>}
                        {item.notification_type === "share_script" &&
                        <div>
                            <a href="#" onClick={e => { e.preventDefault(); openSharedScript(item.shareid!); close() }}>{t("thing.open").toLocaleUpperCase()}</a>
                        </div>}
                    </div>
                </div>
            </div>
        </div>
        <hr style={{ margin: "10px", border: "solid 1px dimgrey" }} />
    </div>
}

export const NotificationList = ({ openSharedScript, showHistory, close }: {
    openSharedScript: (s: string) => void,
    showHistory: (b: boolean) => void,
    close: () => void,
}) => {
    const notifications = useSelector(user.selectNotifications)
    const { t } = useTranslation()

    const [isRefreshing, setIsRefreshing] = useState(false)
    const FETCH_COOLDOWN_MS = 3000 // 3 seconds
    const lastClickRef = useRef(0)

    const handleRefresh = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()

        // Throttle clicks to once every FETCH_COOLDOWN_MS milliseconds
        const now = Date.now()
        if (now - lastClickRef.current < FETCH_COOLDOWN_MS) {
            return // too soon, ignore click
        }

        lastClickRef.current = now

        // Animate the refresh icon
        setIsRefreshing(true)
        setTimeout(() => setIsRefreshing(false), 500)

        // Fetch the latest notifications and immediately update the state
        try {
            const result = await request.getAuth("/users/notifications")
            if (result && Array.isArray(result)) {
                userNotification.loadHistory(result)
            }
        } catch (error: any) {
            console.error("Error fetching notifications:", error)
            console.error("Error type:", error?.constructor?.name)
            console.error("Error stack:", error?.stack)
            if (error.code) {
                console.error("HTTP Status Code:", error.code)
            }
            if (error.message) {
                console.error("Error Message:", error.message)
            }
        }
    }

    return <div style={{ minWidth: "15em" }}>
        <div className="flex justify-between">
            <div className="text-sm float-left" style={{ color: "grey" }}>
                <i className="icon icon-bell mr-3" />
                {t("notifications.title")}
            </div>
            <div className="float-right pr-2">
                <a className="text-sm text-blue-700 hover:text-blue-600" href="#" onClick={handleRefresh} title="Refresh notifications">
                    <i className={`icon icon-loop2 inline-block ${isRefreshing ? "animate-spin" : ""}`} />
                </a>
            </div>
        </div>
        <hr className="border-solid border-black border-1 my-2" />
        {notifications.length === 0
            ? <div>
                <div className="text-center m-auto">{t("notifications.none")}</div>
            </div>
            : <div>
                {notifications.slice(0, 5).map((item, index) =>
                    <Notification
                        key={index} item={item}
                        openSharedScript={openSharedScript}
                        close={close}
                    />)}
            </div>}
        {notifications.length > 0 && (
            <div className="text-center">
                <a className="text-sm text-blue-700 hover:text-blue-600" href="#" onClick={e => { e.preventDefault(); showHistory(true); close() }}>{t("notifications.viewAll").toLocaleUpperCase()}</a>
            </div>
        )}
    </div>
}

export const NotificationHistory = ({ openSharedScript, close }: {
    openSharedScript: (s: string) => void, close: () => void
}) => {
    const notifications = useSelector(user.selectNotifications)
    const { t } = useTranslation()

    return <div id="notification-history">
        <div className="flex justify-between" style={{ padding: "1em" }}>
            <div>
                <a href="#" onClick={e => { e.preventDefault(); close() }}>
                    <i id="back-button" className="icon icon-arrow-right22"></i>
                </a>
                <span style={{ color: "grey" }}>
                    <i className="icon icon-bell" /> {t("notifications.title")}
                </span>
            </div>
            <div>
                <a className="closemodal buttonmodal cursor-pointer" style={{ color: "#d04f4d" }} onClick={close}><span><i className="icon icon-cross2" /></span>{t("thing.close").toLocaleUpperCase()}</a>
            </div>
        </div>

        <div className="notification-type-header">{t("notifications.pinned")}</div>
        {notifications.map((item, index) =>
            item.notification_type === "broadcast" && <div key={index}>
                <div style={{ margin: "10px 20px" }}>
                    <div className="flex items-center float-left" style={{ margin: "10px", marginLeft: 0 }}>
                        <div><i className="icon icon-pushpin"></i></div>
                    </div>
                    <div className="flex justify-between">
                        <div>
                            <div>{item.message.text}</div>
                            <div style={{ fontSize: "10px", color: "grey" }}>{ESUtils.humanReadableTimeAgo(item.time)}</div>
                        </div>
                        {item.message.hyperlink && <div>
                            <a href={item.message.hyperlink} target="_blank" className="cursor-pointer" rel="noreferrer">{t("more").toLocaleUpperCase()}</a>
                        </div>}
                    </div>
                </div>
                {index < notifications.length - 1 &&
                <hr style={{ margin: "10px 20px", border: "solid 1px dimgrey" }} />}
            </div>)}

        <div className="notification-type-header flex justify-between">
            <div>{t("notifications.other")}</div>
            <div><a className="text-sm text-blue-700 hover:text-blue-600" href="#" onClick={e => { e.preventDefault(); userNotification.markAllAsRead() }}>{t("notifications.markAllRead").toLocaleUpperCase()}</a></div>
        </div>
        {notifications.map((item, index) =>
            item.notification_type !== "broadcast" && <div key={index}>
                <div className="cursor-pointer" style={{ margin: "10px 20px" }} onClick={() => userNotification.markAsRead(item)}>
                    <div className="flex items-center float-left" style={{ margin: "10px" }}>
                        <div className={item.unread ? "marker" : "empty-marker"}></div>
                    </div>
                    <div className="flex justify-between">
                        <div>
                            <MarkdownLinkMessage text={item.message.text} />
                            <div style={{ fontSize: "10px", color: "grey" }}>
                                {ESUtils.humanReadableTimeAgo(item.time)}
                            </div>
                        </div>
                        {item.notification_type === "share_script" && <div>
                            <a href="#" onClick={e => { e.preventDefault(); openSharedScript(item.shareid!); close() }}>{t("thing.open").toLocaleUpperCase()}</a>
                        </div>}
                    </div>
                </div>
                {index < history.length - 1 && <hr style={{ margin: "10px 20px", border: "solid 1px dimgrey" }} />}
            </div>)}
    </div>
}

// Converts text containing a markdown-style link into a React element with `<a>` tags.
// For example:
// "This is a [link](https://www.example.com) in Markdown format."
// `This is a <a href="https://www.example.com" ...>link</a> in Markdown format.`
const MarkdownLinkMessage = ({ text }: { text: string }): JSX.Element => {
    const linkRegex = /\[(.*?)]\((https.*?)\)/g
    const parts = text.split(linkRegex)

    // `parts` follows the pattern [text, link-text, link-url, ...]
    return <>{parts.map((part, index) => {
        if (index % 3 === 0) {
            return <React.Fragment key={index}>{part}</React.Fragment>
        } else if (index % 3 === 2) {
            const linkText = parts[index - 1]
            const linkUrl = parts[index]
            return <a href={linkUrl} target="_blank" rel="noreferrer" key={index}>{linkText}</a>
        } else {
            return null
        }
    })}</>
}
