import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import type { RootState } from "../reducers"

export interface ExtensionState {
    url: string
    name: string
    version: string
    description: string
    permissions: string[]
    icon32: string
}

const initialExtensionState: ExtensionState = {
    url: "",
    name: "",
    version: "",
    description: "",
    permissions: [],
    icon32: "",
}

const extensionSlice = createSlice({
    name: "extension",
    initialState: initialExtensionState,
    reducers: {
        setExtension(state, { payload }: PayloadAction<ExtensionState>) {
            state.url = payload.url
            state.name = payload.name
            state.version = payload.version
            state.description = payload.description
            state.permissions = payload.permissions
            state.icon32 = payload.icon32
        },
        clearExtension(state) {
            state.url = ""
            state.name = ""
            state.version = ""
            state.description = ""
            state.permissions = []
            state.icon32 = ""
        },
    },
})

const persistConfig = {
    key: "extension",
    storage,
}

export default persistReducer(persistConfig, extensionSlice.reducer)

export const { setExtension, clearExtension } = extensionSlice.actions

export const selectExtensionUrl = (state: RootState) => state.extension.url
export const selectExtensionName = (state: RootState) => state.extension.name
export const selectExtensionVersion = (state: RootState) => state.extension.version
export const selectExtensionDescription = (state: RootState) => state.extension.description
export const selectExtensionPermissions = (state: RootState) => state.extension.permissions
export const selectExtensionIcon32 = (state: RootState) => state.extension.icon32
