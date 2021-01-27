import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import * as app from '../app/appState';
import xml2js from 'xml2js';

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

const userSlice = createSlice({
    name: 'user',
    initialState: {
        loggedIn: false,
        username: null,
        password: null,
        scripts: {},
        scriptIDs: []
    },
    reducers: {
        login(state, { payload }) {
            state.loggedIn = true;
            state.username = payload.username;
            state.password = payload.password;
        },
        logout(state) {
            Object.keys(state).forEach(key => {
                delete state[key];
            });
            state.loggedIn = false;
        }
    },
    // extraReducers: {
    //     [login.fulfilled]: (state, { payload }) => {
    //         // Object.assign(state, payload);
    //         state.loggedIn = true;
    //         state.username = payload.username;
    //         state.password = payload.password;
    //     },
    //     [login.rejected]: (state, { payload }) => {
    //         state.loggedIn = false;
    //     }
    // }
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;

/* Selectors */
// TODO: Date format?
export const mapScriptsToObjectByID = createSelector(
    state => state.user.scripts,
    scripts => scripts.reduce((obj, script) => ({
        ...obj,
        [script.shareid]: script
    }), {})
);

export const selectLoggedIn = state => state.user.loggedIn;
export const selectUserName = state => state.user.username;