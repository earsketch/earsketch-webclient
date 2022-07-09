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
        setCollaborators(state, { payload: collaboratorUsernames }) {
            state.collaborators = usernamesToCollaborationObjects(collaboratorUsernames)
        },
        addCollaborators(state, { payload: newCollaboratorUsernames }) {
            const newCollaborators = usernamesToCollaborationObjects(newCollaboratorUsernames)
            state.collaborators = [...state.collaborators, ...newCollaborators]
        },
        setCollaboratorAsActive(state, { payload: userWhoJoinedSession }) {
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: userWhoJoinedSession === x.username ? true : x.active }
            })
        },
        setCollaboratorsAsActive(state, { payload: activeCollaboratorUsernames }) {
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: activeCollaboratorUsernames.includes(x.username) }
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
    addCollaborators,
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

const usernamesToCollaborationObjects = (usernames: string[]) => {
    return usernames.map(x => {
        return { username: x.toLowerCase(), canEdit: true, active: false }
    })
}
