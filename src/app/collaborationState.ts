import { createSlice } from "@reduxjs/toolkit"
import { persistReducer } from "redux-persist"
import storage from "redux-persist/es/storage"
import type { RootState } from "../reducers"

// TODO: canEdit seems to be fake. It is not stored in the database.
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
            for (const username of collaboratorUsernames) {
                state.collaborators[username] = { canEdit: true, active: false }
            }
        },
        addCollaborators(state, { payload }: { payload: string[] }) {
            const newCollaboratorUsernames = payload.map(x => x.toLowerCase())
            for (const username of newCollaboratorUsernames) {
                state.collaborators[username] = { canEdit: true, active: false }
            }
        },
        removeCollaborators(state, { payload }: { payload: string[] }) {
            const removedCollaboratorUsernames = payload.map(x => x.toLowerCase())
            for (const username of removedCollaboratorUsernames) {
                delete state.collaborators[username]
            }
        },
        addCollaborator(state, { payload }: { payload: string }) {
            const newCollaboratorUsername = payload.toLowerCase()
            state.collaborators[newCollaboratorUsername] = { canEdit: true, active: false }
        },
        removeCollaborator(state, { payload }: { payload: string }) {
            const removedCollaboratorUsername = payload.toLowerCase()
            delete state.collaborators[removedCollaboratorUsername]
        },
        setCollaboratorsAsActive(state, { payload }: { payload: string[] }) {
            const activeCollaboratorUsernames = payload.map(x => x.toLowerCase())
            for (const username of activeCollaboratorUsernames) {
                state.collaborators[username].active = true
            }
        },
        setCollaboratorsAsInactive(state, { payload }: { payload: string[] }) {
            const activeCollaboratorUsernames = payload.map(x => x.toLowerCase())
            for (const username of activeCollaboratorUsernames) {
                state.collaborators[username].active = false
            }
        },
        setCollaboratorAsActive(state, { payload }: { payload: string }) {
            const joiningCollaborator = payload.toLowerCase()
            state.collaborators[joiningCollaborator].active = true
        },
        setCollaboratorAsInactive(state, { payload }: { payload: string }) {
            const leavingCollaborator = payload.toLowerCase()
            state.collaborators[leavingCollaborator].active = false
        },
    },
})

export const {
    setCollaborators,
    addCollaborators,
    removeCollaborators,
    addCollaborator,
    removeCollaborator,
    setCollaboratorsAsActive,
    setCollaboratorsAsInactive,
    setCollaboratorAsActive,
    setCollaboratorAsInactive,
} = collaborationSlice.actions

const persistConfig = {
    key: "collaboration",
    storage,
}

export default persistReducer(persistConfig, collaborationSlice.reducer)

export const selectCollaborators = (state: RootState) => state.collaboration.collaborators
