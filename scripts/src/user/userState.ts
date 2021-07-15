import { createSlice } from "@reduxjs/toolkit"

import { RootState } from "../reducers"

export interface Notification {
    message: { text: string, json?: string, action?: string, hyperlink?: string }
    // eslint-disable-next-line camelcase
    notification_type: string
    time: number
    unread: boolean
    pinned: boolean
    // Collaboration data.
    sender?: string
    // eslint-disable-next-line camelcase
    script_name?: string
    shareid?: string
    id?: string
    created?: string
}

const userSlice = createSlice({
    name: "user",
    initialState: {
        loggedIn: false,
        username: null as string | null,
        token: null as string | null,
        notifications: [] as Notification[],
    },
    reducers: {
        login(state, { payload }) {
            state.loggedIn = true
            state.username = payload.username
            state.token = payload.token
        },
        logout(state) {
            state.username = null
            state.token = null
            state.loggedIn = false
        },
        setNotifications(state, { payload: notifications }: { payload: Notification[] }) {
            // Only show the latest broadcast.
            const nonBroadcasts = notifications.filter(v => v.notification_type !== "broadcast")
            const latestBroadcast = notifications.find(v => v.notification_type === "broadcast")
            if (latestBroadcast !== undefined) {
                nonBroadcasts.unshift(latestBroadcast)
            }
            state.notifications = nonBroadcasts
        },
        pushNotification(state, { payload }) {
            state.notifications.unshift(payload)
        },
    },
})

export const {
    login,
    logout,
    setNotifications,
    pushNotification,
} = userSlice.actions
export default userSlice.reducer

export const selectLoggedIn = (state: RootState) => state.user.loggedIn
export const selectUserName = (state: RootState) => state.user.username
export const selectNotifications = (state: RootState) => state.user.notifications
