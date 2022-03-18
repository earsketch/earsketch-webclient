import { createSelector, createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import * as ESUtils from "../esutils"
import { RootState } from "../reducers"
import { AVAILABLE_LOCALES, ENGLISH_LOCALE } from "../locales/AvailableLocales"

export type Modal = (props: { [key: string]: any, close: (payload?: any) => void }) => JSX.Element

const embedMode = ESUtils.getURLParameter("embedded") === "true"
const hideDAW = embedMode && ESUtils.getURLParameter("hideDaw") !== null
const hideEditor = embedMode && ESUtils.getURLParameter("hideCode") !== null

const appSlice = createSlice({
    name: "app",
    initialState: {
        locale: "en",
        scriptLanguage: "python",
        colorTheme: "light" as "light" | "dark",
        fontSize: 14,
        embedMode,
        hideDAW,
        hideEditor,
        embeddedScriptName: null,
        embeddedScriptUsername: null,
        embeddedShareID: null,
        modal: null as Modal | null,
    },
    reducers: {
        setScriptLanguage(state, { payload }) {
            state.scriptLanguage = payload
        },
        setColorTheme(state, { payload }) {
            state.colorTheme = payload
            // For the benefit of the loading screen:
            localStorage.setItem("colorTheme", payload)
        },
        setFontSize(state, { payload }) {
            state.fontSize = payload
        },
        // Perhaps these should go in another slice?
        setEmbedMode(state, { payload }) {
            state.embedMode = payload
        },
        setHideDAW(state, { payload }) {
            state.hideDAW = payload
        },
        setHideEditor(state, { payload }) {
            state.hideEditor = payload
        },
        setEmbeddedScriptUsername(state, { payload }) {
            state.embeddedScriptUsername = payload
        },
        setEmbeddedScriptName(state, { payload }) {
            state.embeddedScriptName = payload
        },
        setEmbeddedShareID(state, { payload }) {
            state.embeddedShareID = payload
        },
        setLocaleCode(state, { payload }) {
            state.locale = payload
        },
        setModal(state, { payload }) {
            state.modal = payload
        },
    },
})

const persistConfig = {
    key: "app",
    blacklist: ["embedMode", "hideDAW", "hideEditor", "embeddedScriptUsername", "embeddedScriptName", "embeddedShareID"],
    storage,
}

export default persistReducer(persistConfig, appSlice.reducer)
export const {
    setScriptLanguage,
    setColorTheme,
    setFontSize,
    setEmbedMode,
    setHideDAW,
    setHideEditor,
    setEmbeddedScriptUsername,
    setEmbeddedScriptName,
    setEmbeddedShareID,
    setLocaleCode,
    setModal,
} = appSlice.actions

export const selectScriptLanguage = (state: RootState) => state.app.scriptLanguage
export const selectColorTheme = (state: RootState) => state.app.colorTheme
// TODO: Figure out the right way to do this with redux-persist.
export const selectFontSize = (state: RootState) => state.app.fontSize || 14
export const selectEmbedMode = (state: RootState) => state.app.embedMode
export const selectHideDAW = (state: RootState) => state.app.hideDAW
export const selectHideEditor = (state: RootState) => state.app.hideEditor
export const selectEmbeddedScriptUsername = (state: RootState) => state.app.embeddedScriptUsername
export const selectEmbeddedScriptName = (state: RootState) => state.app.embeddedScriptName
export const selectEmbeddedShareID = (state: RootState) => state.app.embeddedShareID
export const selectLocaleCode = (state: RootState) => state.app.locale
export const selectModal = (state: RootState) => state.app.modal

export const selectLocale = createSelector(
    [selectLocaleCode],
    (localeCode) => {
        return AVAILABLE_LOCALES[localeCode] ?? ENGLISH_LOCALE
    }
)
