import { useEffect } from "react"
import { useSelector } from "react-redux"

import * as request from "../request"
import * as userNotification from "./notification"
import * as user from "./userState"

/** Automatically fetch notifications every X minutes when logged in */
export const useNotificationLongPolling = () => {
    // Polling interval sequence, stopping after the final interval
    const NOTIFICATION_POLL_INTERVALS_MS = [5, 5, 5, 30, 60, 60].map(min => min * 60 * 1000)

    const isLoggedIn = useSelector(user.selectLoggedIn)

    useEffect(() => {
        if (!isLoggedIn) return

        let timeoutId: number | null = null
        let intervalIndex = 0
        let isPolling = false
        let didCancel = false
        let hasFetchedInitialNotifications = false
        let latestNotificationCount: number | null = null

        const fetchNotifications = async () => {
            try {
                const result = await request.getAuth("/users/notifications")
                if (didCancel) return
                if (Array.isArray(result)) {
                    // Reset to the shortest polling interval if we detect new notifications
                    if (latestNotificationCount !== null && result.length > latestNotificationCount) {
                        intervalIndex = 0
                    }
                    latestNotificationCount = result.length
                    userNotification.loadHistory(result)
                }
            } catch (error) {
                console.error("Error fetching notifications:", error)
            }
        }

        const clearScheduledPoll = () => {
            if (timeoutId == null) return
            window.clearTimeout(timeoutId)
            timeoutId = null
        }

        const scheduleNextPoll = () => {
            if (!isPolling || timeoutId != null) return
            if (intervalIndex >= NOTIFICATION_POLL_INTERVALS_MS.length) {
                isPolling = false
                return
            }

            const interval = NOTIFICATION_POLL_INTERVALS_MS[intervalIndex]
            timeoutId = window.setTimeout(async () => {
                timeoutId = null
                intervalIndex += 1
                await fetchNotifications()
                scheduleNextPoll()
            }, interval)
        }

        // Immediately fetch on page load, then schedule the next poll
        const startPolling = () => {
            if (isPolling) return
            isPolling = true
            if (!hasFetchedInitialNotifications) {
                hasFetchedInitialNotifications = true
                fetchNotifications()
            }
            scheduleNextPoll()
        }

        const stopPolling = () => {
            isPolling = false
            clearScheduledPoll()
        }

        // Only poll when the page is visible to avoid unnecessary requests
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                startPolling()
            } else {
                stopPolling()
            }
        }

        // Start based on initial visibility
        onVisibilityChange()

        document.addEventListener("visibilitychange", onVisibilityChange)

        return () => {
            didCancel = true // Handle mid-fetch logout - or any unmount
            stopPolling()
            document.removeEventListener("visibilitychange", onVisibilityChange)
        }
    }, [isLoggedIn])
}
