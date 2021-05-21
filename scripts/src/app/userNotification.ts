import * as helpers from '../helpers'

// TODO: Once we port the notification UI to React, we should probably move this state to Redux.

interface Notification {
    message: { text: string, json?: string, action?: string }
    notification_type: string
    time: number
    unread: boolean
    pinned: boolean
    // Collaboration data.
    sender?: string
    script_name?: string
    shareid?: string
    id?: string
    created?: number
}

// TODO: separate the temporary and permanent notification services?
export const queue = []
export let history: Notification[] = []

export const user = { role: "", loginTime: Date.now() }

export const callbacks = {
    show: (text: string, type: string="") => {},
    hide: () => {},
    popup: (text: string, type: string="", duration: number | undefined=undefined) => {},

    hidePopup: () => {},
    addSharedScript: (shareID: string, id: string) => {},
}

export const state = {
    // TODO: Why is this here?
    isInLoadingScreen: false,
}

export const popupQueue = []

export const show = (text: string, type: string="", duration: number | undefined=undefined) => {
    // check type for registering to the notification history
    // TODO: handle with proper message types defined
    if (['bell','popup','history'].includes(type)) { // temporary tags for bell-icon dropdown notifications
        history.unshift({
            message: {
                text
            },
            notification_type: type,
            time: Date.now(),
            unread: false,
            pinned: false
        })
    } else if (type === 'editProfile') {
        while (history.some(item => item.notification_type === 'editProfile')) {
            const index = history.findIndex(item => item['notification_type'] === 'editProfile')

            if (index !== -1) {
                history.splice(index, 1)
            }
        }

        history.unshift({
            message: { text },
            notification_type: type,
            time: Date.now(),
            unread: false,
            pinned: true
        })
    } else if (type === 'collaboration') {
        history.unshift({
            message: { text },
            notification_type: type,
            time: Date.now(),
            unread: true,
            pinned: false
        })
    } else {
        // showCallback.apply(this, arguments)
    }
    callbacks.popup(text, type, duration)
}

export const showBanner = (text: string, type: string="") => callbacks.show(text, type)

export const hide = () => callbacks.hide()
export const hidePopup = () => callbacks.hidePopup()

// Only show the latest broadcast on the client side.
const truncateBroadcast = () => {
    const nonBroadcasts = history.filter(v => v.notification_type !== 'broadcast')
    const latestBroadcast = history.find(v => v.notification_type === 'broadcast')

    history = nonBroadcasts

    if (typeof latestBroadcast !== 'undefined') {
        history.unshift(latestBroadcast)
    }
}

// Fill the history array at initialization from webservice call as well as localStorage. Sorting might be needed.
export const loadHistory = (notificationList: Notification[]) => {
    let text = ''
    history = notificationList

    // filter out 'teacherBroadcast' messages
    if (!['teacher', 'admin'].includes(user.role)) {
        history = history.filter(v => v.notification_type !== 'teacher_broadcast')
    }

    history = history.map(v => {
        v.pinned = (v.notification_type === 'broadcast' || v.notification_type === 'teacher_broadcast')

        // TODO: notification_type is too verbose
        // TODO: send individual messages not the whole history
        if (v.notification_type === 'share_script') {
            text = v.sender + ' shared ' + v.script_name + ' with you!'
            v.message = { text }

            // auto-add new view-only scripts that are shared to the shared-script browser
            if (v.unread) {
                callbacks.addSharedScript(v.shareid!, v.id!)
            }
        } else if (v.notification_type === 'collaborate_script') {
            const data = JSON.parse(v.message.json!)
            // $rootScope.$emit('notificationHistoryLoaded', data); // trigger subscribed callbacks

            // received only by the ones affected
            switch (data.action) {
                case 'userAddedToCollaboration':
                    text = data.sender + ' added you as a collaborator on ' + data.scriptName
                    break
                case 'userRemovedFromCollaboration':
                    text = data.sender + ' removed you from collaboration on ' + data.scriptName
                    break
                case 'userLeftCollaboration':
                    text = data.sender + ' left the collaboration on ' + data.scriptName
                    break
                case 'scriptRenamed':
                    text = 'Collaborative script "' + data.oldName + '" was renamed to "' + data.newName + '"'
                    break
            }

            v.message = {
                text,
                action: data.action
            }
        } else if (v.notification_type === 'teacher_broadcast') {
            v.message.text = '[Teacher] ' + v.message.text
        }

        v.time = v.created!

        // hack around only receiving notification history (collection) but not individual messages
        // TODO: always send individual notification from server
        if (v.unread && (v.time - user.loginTime) > 0) {
            show(v.message.text, 'popup', 6)
        }

        return v
    })

    history.sort((a, b) => b.time - a.time)

    truncateBroadcast()
    scopeDigest()
}

export const clearHistory = () => history = []

// TODO: should receive notification collection here as well
export const handleBroadcast = (data: Notification) => {
    show('From EarSketch team: ' + data.message.text, 'broadcast')
    data.time = Date.now()
    data.pinned = true
    history.unshift(data)
    truncateBroadcast()
    scopeDigest()
}

export const handleTeacherBroadcast = (data: Notification) => {
    if (user.role !== 'teacher') {
        return
    }

    show('From EarSketch team to teachers: ' + data.message.text, 'broadcast')
    data.time = Date.now()
    data.pinned = true
    history.unshift(data)
    // truncateBroadcast()
    scopeDigest()
}

const scopeDigest = () => {
    const $rootScope = helpers.getNgRootScope()
    $rootScope.$broadcast('notificationsUpdated')
    $rootScope.$applyAsync()
}