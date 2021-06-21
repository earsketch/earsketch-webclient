import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../reducers';

// TODO: Eventually replace userProject getUserInfo
// export const login = createAsyncThunk(
//     'user/login',
//     async ({ username, password }, { getState }) => {
//         const getUserAPI = URL_DOMAIN + '/services/scripts/getuserinfo';
//         const payload = new FormData();
//         payload.append('username', username);
//         payload.append('password', btoa(password));
//
//         try {
//             const response = await fetch(getUserAPI, {
//                 method: 'POST',
//                 body: payload
//             });
//             const xml = await response.text();
//             // return await xml2js.parseStringPromise(xml, { explicitArray: false });
//             return { username, password };
//         } catch (error) {
//             console.log(error);
//         }
//     }
// );

export interface Notification {
    message: { text: string, json?: string, action?: string, hyperlink?: string }
    notification_type: string
    time: number
    unread: boolean
    pinned: boolean
    // Collaboration data.
    sender?: string
    script_name?: string
    shareid?: string
    id?: string
    created?: string
}

const userSlice = createSlice({
    name: 'user',
    initialState: {
        loggedIn: false,
        username: null as string | null,
        password: null as string | null,
        notifications: [] as Notification[],
    },
    reducers: {
        login(state, { payload }) {
            state.loggedIn = true;
            state.username = payload.username;
            state.password = payload.password;
        },
        logout(state) {
            state.username = null;
            state.password = null;
            state.loggedIn = false;
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
        }
    }
});

export const {
    login,
    logout,
    setNotifications,
    pushNotification,
} = userSlice.actions;
export default userSlice.reducer;

export const selectLoggedIn = (state: RootState) => state.user.loggedIn;
export const selectUserName = (state: RootState) => state.user.username;
export const selectNotifications = (state: RootState) => state.user.notifications;