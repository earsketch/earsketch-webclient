import { createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/es/storage"
import type { RootState } from "../reducers"

export interface collaborator { username: string; canEdit: boolean; active: boolean }
export interface collaborators extends Array<collaborator>{}

const collaborationSlice = createSlice({
    name: "collaboration",
    initialState: {
        activeMembers: [] as string[],
        scriptOwner: "",
        collaborators: [] as collaborators,
    },
    reducers: {
        setScriptOwner(state, { payload }) {
            state.scriptOwner = payload
        },
        setCollaborators(state, { payload }) {
            state.collaborators = payload
        },
    },
})

export const {
    setScriptOwner,
    setCollaborators,
} = collaborationSlice.actions

const persistConfig = {
    key: "collaboration",
    whitelist: ["activeMembers"],
    storage,
}

export default persistReducer(persistConfig, collaborationSlice.reducer)

export const selectScriptOwner = (state: RootState) => state.collaboration.scriptOwner
export const selectCollaborators = (state: RootState) => state.collaboration.collaborators
