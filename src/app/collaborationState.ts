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
        setCollaborators(state, { payload }: { payload: string[] }) {
            const collaboratorUsernames = payload.map(x => x.toLowerCase())
            state.collaborators = usernamesToCollaborationObjects(collaboratorUsernames)
        },
        addCollaborators(state, { payload }: { payload: string[] }) {
            const newCollaboratorUsernames = payload.map(x => x.toLowerCase())
            const newCollaborators = usernamesToCollaborationObjects(newCollaboratorUsernames)
            state.collaborators = [...state.collaborators, ...newCollaborators]
        },
        removeCollaborators(state, { payload }: { payload: string[] }) {
            const removedCollaboratorUsernames = payload.map(x => x.toLowerCase())
            state.collaborators = state.collaborators.filter(x => !removedCollaboratorUsernames.includes(x.username))
        },
        removeCollaborator(state, { payload }: { payload: string }) {
            const removedCollaboratorUsername = payload.toLowerCase()
            state.collaborators = state.collaborators.filter(x => removedCollaboratorUsername !== x.username)
        },
        setCollaboratorsAsActive(state, { payload }: { payload: string[] }) {
            const activeCollaboratorUsernames = payload.map(x => x.toLowerCase())
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: activeCollaboratorUsernames.includes(x.username) }
            })
        },
        setCollaboratorAsActive(state, { payload }: { payload: string }) {
            const userWhoJoinedSession = payload.toLowerCase()
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: userWhoJoinedSession === x.username ? true : x.active }
            })
        },
        setCollaboratorAsInactive(state, { payload }: { payload: string }) {
            const userWhoLeftSession = payload.toLowerCase()
            state.collaborators = state.collaborators.map(x => {
                return { ...x, active: userWhoLeftSession === x.username ? false : x.active }
            })
        },
    },
})

export const {
    setCollaborators,
    addCollaborators,
    removeCollaborators,
    removeCollaborator,
    setCollaboratorsAsActive,
    setCollaboratorAsActive,
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
