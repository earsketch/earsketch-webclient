import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { selectScriptLanguage } from '../app/appState';
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

export const selectAllEntries = (state: RootState) => Object.entries(ESApiDoc)

export interface APIParameter {
    type: string
    description: string
    default?: string
}

export interface APIItem {
    description: string
    example: {
        python: string
        javascript: string
    }
    autocomplete: string
    parameters?: {
        [name: string]: APIParameter
    }
    returns?: {
        type: string
        description: string
    }
    meta?: any
    expert?: string
    caveats?: string
}

export const selectFilteredEntries = createSelector(
    [selectAllEntries, selectSearchText, selectScriptLanguage],
    (entries, searchText, language) => {
        searchText = searchText.toLowerCase()
        return entries.filter(([name, obj]: [name:string, obj:APIItem]) => {
            const description = obj.description?.toLowerCase();
            const params = obj.parameters && Object.keys(obj.parameters)
            const field = `${name.toLowerCase()}${description}${params}`
            return field.includes(searchText) && (!obj.meta || (obj.meta.language === language))
        })
    }
)