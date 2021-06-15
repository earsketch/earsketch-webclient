import { createSlice, createSelector } from '@reduxjs/toolkit';

import { APIItem, ESApiDoc } from '../data/api_doc';
import { selectScriptLanguage, selectLocale } from '../app/appState';
import i18n from "i18next";
import { RootState } from '../reducers';

const apiSlice = createSlice({
    name: 'api',
    initialState: {
        searchText: '',
    },
    reducers: {
        setSearchText(state, { payload }) {
            state.searchText = payload
        },
    }
})

export default apiSlice.reducer;
export const {
    setSearchText,
} = apiSlice.actions;

export const selectSearchText = (state: RootState) => state.api.searchText

export const selectFilteredEntries = createSelector(
    [selectSearchText, selectScriptLanguage, selectLocale],
    (searchText, language, locale) => {
        searchText = searchText.toLowerCase()
        return Object.entries(ESApiDoc).filter(([name, data]: [name: string, data: APIItem | APIItem[]]) => {
            const entries = Array.isArray(data) ? data : [data]
            return entries.some(obj => {
                const description = i18n.t(obj.descriptionKey).toLowerCase();
                const params = obj.parameters && Object.keys(obj.parameters)
                const field = `${name.toLowerCase()}${description}${params}`
                return field.includes(searchText) && (!obj.meta || (obj.meta.language === language))
            })
        })
    }
)