import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { RootState } from '../reducers';

import * as app from '../app/appState';
// import xml2js from 'xml2js';

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

export interface UserState {
    loggedIn: boolean
    username: string | null
    password: string | null
}

const userSlice = createSlice({
    name: 'user',
    initialState: {
        loggedIn: false,
        username: null,
        password: null
    } as UserState,
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
        }
    }
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;

/* Selectors */
export const selectLoggedIn = (state: RootState) => state.user.loggedIn;
export const selectUserName = (state: RootState) => state.user.username;