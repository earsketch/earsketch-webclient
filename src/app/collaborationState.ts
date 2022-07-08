import { createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/es/storage"
import type { RootState } from "../reducers"

export interface collaborator { username: string; canEdit: boolean; active: boolean }
export interface collaborators extends Array<collaborator>{}

const collaborationSlice = createSlice({
    name: "collaboration",
    initialState: {
        collaborators: [] as collaborators,
    },
    reducers: {
        setCollaborators(state, { payload }) {
            state.collaborators = payload
        },
        setCollaboratorAsActive(state, { payload }) {
            const userWhoJoinedSession = payload
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: userWhoJoinedSession === x.username ? true : x.active }
            })
        },
        setCollaboratorsAsActive(state, { payload }) {
            const activeCollaborators = payload
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: activeCollaborators.includes(x.username) }
            })
        },
        setCollaboratorAsInactive(state, { payload }) {
            const userWhoLeftSession = payload
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: userWhoLeftSession === x.username ? false : x.active }
            })
        },
    },
})

export const {
    setCollaborators,
    setCollaboratorAsActive,
    setCollaboratorsAsActive,
    setCollaboratorAsInactive,
} = collaborationSlice.actions

const persistConfig = {
    key: "collaboration",
    storage,
}

export default persistReducer(persistConfig, collaborationSlice.reducer)

export const selectCollaborators = (state: RootState) => state.collaboration.collaborators
