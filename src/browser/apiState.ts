import { createSlice, createSelector } from "@reduxjs/toolkit"
import i18n from "i18next"

import { API_DOC } from "../api/api"
import { selectScriptLanguage, selectLocaleCode } from "../app/appState"
import type { RootState } from "../reducers"

const apiSlice = createSlice({
    name: "api",
    initialState: {
        searchText: "",
    },
    reducers: {
        setSearchText(state, { payload }) {
            state.searchText = payload
        },
    },
})

export default apiSlice.reducer
export const {
    setSearchText,
} = apiSlice.actions

export const selectSearchText = (state: RootState) => state.api.searchText

export const selectFilteredEntries = createSelector(
    [selectSearchText, selectScriptLanguage, selectLocaleCode],
    (searchText, language, _) => {
        searchText = searchText.toLowerCase()
        return Object.entries(API_DOC).filter(([name, entries]) => entries.some(obj => {
            const description = i18n.t(obj.descriptionKey).toLowerCase()
            const params = obj.parameters && Object.keys(obj.parameters)
            const field = `${name.toLowerCase()}${description}${params}`
            return field.includes(searchText) && (!obj.language || (obj.language === language))
        }))
    }
)
