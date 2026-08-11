import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"

import type { Language } from "common"
import type { RootState } from "../reducers"
import type { CatalogExtensionId } from "./extensionCatalog"

// Assigned by the IDE, which owns the editor and the tab bar. Same pattern as
// `curriculumState.callbacks`, and for the same reason: the extension host
// cannot import the IDE without a cycle.
export const callbacks = {
    /** Opens source code in a read-only tab. Returns the tab's script name. */
    openReadOnlyScript: (_source: string, _name: string, _language: Language) => "",
}

export interface LoadedExtension {
    url: string
    name: string
    version: string
    description: string
    permissions: string[]
    icon32: string
    icon128: string
    extensionApiVersion: string
}

export interface ExtensionState extends LoadedExtension {
    installedExtensionIds: CatalogExtensionId[]
    activeCatalogExtensionId: CatalogExtensionId | null
}

type SetExtensionPayload = LoadedExtension & {
    catalogExtensionId?: CatalogExtensionId | null
}

const initialExtensionState: ExtensionState = {
    url: "",
    name: "",
    version: "",
    description: "",
    permissions: [],
    icon32: "",
    icon128: "",
    extensionApiVersion: "1",
    installedExtensionIds: [],
    activeCatalogExtensionId: null,
}

const extensionSlice = createSlice({
    name: "extension",
    initialState: initialExtensionState,
    reducers: {
        setExtension(state, { payload }: PayloadAction<SetExtensionPayload>) {
            state.url = payload.url
            state.name = payload.name
            state.version = payload.version
            state.description = payload.description
            state.permissions = payload.permissions
            state.icon32 = payload.icon32
            state.icon128 = payload.icon128
            state.extensionApiVersion = payload.extensionApiVersion
            state.activeCatalogExtensionId = payload.catalogExtensionId ?? null
        },
        installExtension(state, { payload }: PayloadAction<CatalogExtensionId>) {
            if (!state.installedExtensionIds.includes(payload)) {
                state.installedExtensionIds.push(payload)
            }
        },
        uninstallExtension(state, { payload }: PayloadAction<CatalogExtensionId>) {
            state.installedExtensionIds = state.installedExtensionIds.filter(id => id !== payload)
        },
        clearExtension(state) {
            state.url = ""
            state.name = ""
            state.version = ""
            state.description = ""
            state.permissions = []
            state.icon32 = ""
            state.icon128 = ""
            state.extensionApiVersion = "1"
            state.activeCatalogExtensionId = null
        },
    },
})

export const extensionReducer = extensionSlice.reducer

const persistConfig = {
    key: "extension",
    storage,
}

export default persistReducer(persistConfig, extensionReducer)

export const { setExtension, clearExtension, installExtension, uninstallExtension } = extensionSlice.actions

export const selectExtensionUrl = (state: RootState) => state.extension.url
export const selectExtensionName = (state: RootState) => state.extension.name
export const selectExtensionVersion = (state: RootState) => state.extension.version
export const selectExtensionDescription = (state: RootState) => state.extension.description
export const selectExtensionPermissions = (state: RootState) => state.extension.permissions
export const selectExtensionIcon32 = (state: RootState) => state.extension.icon32
export const selectExtensionIcon128 = (state: RootState) => state.extension.icon128
export const selectExtensionApiVersion = (state: RootState) => state.extension.extensionApiVersion
export const selectInstalledExtensionIds = (state: RootState) => state.extension.installedExtensionIds
export const selectActiveCatalogExtensionId = (state: RootState) => state.extension.activeCatalogExtensionId
