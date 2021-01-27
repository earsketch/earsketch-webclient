import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { selectScriptLanguage } from '../app/appState';

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

export const selectSearchText = state => state.api.searchText

export const selectAllEntries = state => Object.entries(ESApiDoc)

export const selectFilteredEntries = createSelector(
    [selectAllEntries, selectSearchText, selectScriptLanguage],
    (entries, searchText, language) => {
        searchText = searchText.toLowerCase()
        return entries.filter(([name, obj]) => {
            const description = obj.description && obj.description.toLowerCase();
            const params = obj.parameters && Object.keys(obj.parameters)
            const field = `${name.toLowerCase()}${description}${params}`
            return field.includes(searchText) && (!obj.meta || (obj.meta.language === language))
        })
    }
)