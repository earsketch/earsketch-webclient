import * as ESUtils from "../esutils"
import store from "../reducers"
import * as userProject from "../app/userProject"
import { Notification, pushNotification, selectNotifications, setNotifications } from "./userState"

export const user = { role: "", loginTime: Date.now() }

export const callbacks = {
    show: (text: string, type: string="", duration?: number) => {},
    popup: (text: string, type: string="", duration: number | undefined=undefined) => {},
    addSharedScript: (shareID: string, id: string) => {},
}

// TODO: Clarify usage of temporary (popup) and "permanent" (history/list) notifications.
export function show(text: string, type: string="", duration: number | undefined=undefined) {
    // check type for registering to the notification history
    // TODO: handle with proper message types defined
    if (["bell", "popup", "history"].includes(type)) { // temporary tags for bell-icon dropdown notifications
        store.dispatch(pushNotification({
            message: { text },
            notification_type: type,
            time: Date.now(),
            unread: false,
            pinned: false,
        }))
    } else if (type === "editProfile") {
        const notifications = selectNotifications(store.getState())
        while (notifications.some(item => item.notification_type === "editProfile")) {
            const index = notifications.findIndex(item => item["notification_type"] === "editProfile")
            if (index !== -1) {
                notifications.splice(index, 1)
            }
        }

        notifications.unshift({
            message: { text },
            notification_type: type,
            time: Date.now(),
            unread: false,
            pinned: true,
        })

        store.dispatch(setNotifications(notifications))
    } else if (type === "collaboration") {
        store.dispatch(pushNotification({
            message: { text },
            notification_type: type,
            time: Date.now(),
            unread: true,
            pinned: false,
        }))
    } else {
        // showCallback.apply(this, arguments)
    }
    callbacks.popup(text, type, duration)
}

export const showBanner = (text: string, type: string="") => callbacks.show(text, type)

// Fill the history array at initialization from webservice call as well as localStorage. Sorting might be needed.
export function loadHistory(notifications: Notification[]) {
    let text = ""

    // filter out "teacherBroadcast" messages
    if (!["teacher", "admin"].includes(user.role)) {
        notifications = notifications.filter(v => v.notification_type !== "teacher_broadcast")
    }

    notifications = notifications.map(v => {
        v.pinned = (v.notification_type === "broadcast" || v.notification_type === "teacher_broadcast")

        // TODO: notification_type is too verbose
        // TODO: send individual messages not the whole history
        if (v.notification_type === "share_script") {
            text = v.sender + " shared " + v.script_name + " with you!"
            v.message = { text }

            // auto-add new view-only scripts that are shared to the shared-script browser
            if (v.unread) {
                callbacks.addSharedScript(v.shareid!, v.id!)
            }
        } else if (v.notification_type === "collaborate_script") {
            // This notification may have been processed before.
            if (v.message.json) {
                const data = JSON.parse(v.message.json!)
                // received only by the ones affected
                switch (data.action) {
                    case "userAddedToCollaboration":
                        text = data.sender + " added you as a collaborator on " + data.scriptName
                        break
                    case "userRemovedFromCollaboration":
                        text = data.sender + " removed you from collaboration on " + data.scriptName
                        break
                    case "userLeftCollaboration":
                        text = data.sender + " left the collaboration on " + data.scriptName
                        break
                    case "scriptRenamed":
                        text = `Collaborative script "${data.oldName}" was renamed to "${data.newName}"`
                        break
                }
                v.message = { text, action: data.action }
            }
        } else if (v.notification_type === "teacher_broadcast") {
            v.message.text = "[Teacher] " + v.message.text
        }

        v.time = ESUtils.parseDate(v.created!)

        // hack around only receiving notification history (collection) but not individual messages
        // TODO: always send individual notification from server
        if (v.unread && (v.time - user.loginTime) > 0) {
            show(v.message.text, "popup", 6)
        }

        return v
    })

    notifications.sort((a, b) => b.time - a.time)
    store.dispatch(setNotifications(notifications))
}

export function clearHistory() {
    store.dispatch(setNotifications([]))
}

// TODO: should receive notification collection here as well
export function handleBroadcast(data: Notification) {
    show("From EarSketch team: " + data.message.text, "broadcast")
    data.time = Date.now()
    data.pinned = true
    store.dispatch(pushNotification(data))
}

export function handleTeacherBroadcast(data: Notification) {
    if (user.role !== "teacher") {
        return
    }
    show("From EarSketch team to teachers: " + data.message.text, "broadcast")
    data.time = Date.now()
    data.pinned = true
    store.dispatch(pushNotification(data))
}

export async function markAsRead(item: Notification) {
    const notifications = selectNotifications(store.getState())
    if (item.notification_type === "broadcast" || item.id === undefined) return
    await userProject.postAuthForm("/services/scripts/markread", { notification_id: item.id! })
    const newNotifications = [{ ...notifications.find(other => item.id === other.id)!, unread: false }, ...notifications.filter(other => item.id !== other.id)]
    store.dispatch(setNotifications(newNotifications))
}

export function markAllAsRead() {
    const notifications = selectNotifications(store.getState())
    const newNotifications = notifications.filter(item => !item.unread || item.notification_type === "broadcast" || item.id === undefined)
    for (const item of notifications) {
        if (item.unread && item.notification_type !== "broadcast" && item.id !== undefined) {
            // TODO: handle broadcast as well
            userProject.postAuthForm("/services/scripts/markread", { notification_id: item.id })
            newNotifications.push({ ...item, unread: false })
        }
    }
    store.dispatch(setNotifications(newNotifications))
}