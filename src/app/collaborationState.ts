import { createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/es/storage"
import type { RootState } from "../reducers"

export interface Collaborator { canEdit: boolean; active: boolean }

const collaborationSlice = createSlice({
    name: "collaboration",
    initialState: {
        collaborators: Object.create(null) as { [key: string]: Collaborator },
    },
    reducers: {
        setCollaborators(state, { payload }: { payload: string[] }) {
            const collaboratorUsernames = payload.map(x => x.toLowerCase())
            state.collaborators = Object.create(null)
            collaboratorUsernames.forEach(x => {
                state.collaborators[x] = { canEdit: true, active: false }
            })
        },
        addCollaborators(state, { payload }: { payload: string[] }) {
            const newCollaboratorUsernames = payload.map(x => x.toLowerCase())
            newCollaboratorUsernames.forEach(x => {
                state.collaborators[x] = { canEdit: true, active: false }
            })
        },
        removeCollaborators(state, { payload }: { payload: string[] }) {
            const removedCollaboratorUsernames = payload.map(x => x.toLowerCase())
            removedCollaboratorUsernames.forEach(x => {
                delete state.collaborators[x]
            })
        },
        removeCollaborator(state, { payload }: { payload: string }) {
            const removedCollaboratorUsername = payload.toLowerCase()
            delete state.collaborators[removedCollaboratorUsername]
        },
        setCollaboratorsAsActive(state, { payload }: { payload: string[] }) {
            const activeCollaboratorUsernames = payload.map(x => x.toLowerCase())
            activeCollaboratorUsernames.forEach(x => {
                state.collaborators[x] = { ...state.collaborators[x], active: true }
            })
        },
        setCollaboratorAsActive(state, { payload }: { payload: string }) {
            const userWhoJoinedSession = payload.toLowerCase()
            const orig = state.collaborators[userWhoJoinedSession]
            state.collaborators[userWhoJoinedSession] = { ...orig, active: true }
        },
        setCollaboratorAsInactive(state, { payload }: { payload: string }) {
            const userWhoLeftSession = payload.toLowerCase()
            const orig = state.collaborators[userWhoLeftSession]
            state.collaborators[userWhoLeftSession] = { ...orig, active: true }
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
