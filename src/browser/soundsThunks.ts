import { createAsyncThunk } from "@reduxjs/toolkit"
import { ThunkAPI } from "../reducers"
import { SoundEntity } from "common"
import context from "../app/audiocontext"
import * as audioLibrary from "../app/audiolibrary"
import { get, postAuth } from "../request"
import { addFavorite, deleteUserSound, removeFavorite, renameUserSound, resetPreview, selectAllEntities, selectPreviewName, setDefaultSounds, setFavorites, setPreviewBSNode, setPreviewName, setUserSounds } from "./soundsState"
import * as userNotification from "../user/notification"
import esconsole from "../esconsole"
import { fillDict } from "../app/recommender"

/* Thunk actions */

export const getDefaultSounds = createAsyncThunk<void, void, ThunkAPI>(
    "sounds/getDefaultSounds",
    async (_, { getState, dispatch }) => {
        const { sounds } = getState()
        if (!sounds.defaultSounds.names.length) {
            const data = await audioLibrary.getStandardSounds()
            fillDict(data)
            const entities = Object.assign({}, ...Array.from(data, (sound) => ({ [sound.name]: sound })))
            const names = data.map(sound => sound.name)
            dispatch(setDefaultSounds({ entities, names }))
        }
    }
)

export const getUserSounds = createAsyncThunk<void, string, ThunkAPI>(
    "sounds/getUserSounds",
    async (username, { dispatch }) => {
        const endPoint = URL_DOMAIN + "/audio/user"
        const params = new URLSearchParams({ username })
        const response = await fetch(`${endPoint}?${params}`, {
            method: "GET",
            cache: "default",
        })
        const data = await response.json()

        const entities: { [key: string]: SoundEntity; } = {}
        const names = new Array(data.length)

        data.forEach((sound: SoundEntity, i: number) => {
            entities[sound.name] = sound
            names[i] = sound.name
        })

        dispatch(setUserSounds({ entities, names }))
    }
)

export const getFavorites = createAsyncThunk<void, string, ThunkAPI>(
    "sounds/getFavorites",
    async (token, { dispatch }) => {
        const result = await get("/audio/favorites", {}, { Authorization: "Bearer " + token })
        dispatch(setFavorites(result))
    }
)

export const markFavorite = createAsyncThunk<void, { name: string; isFavorite: boolean; }, ThunkAPI>(
    "sounds/markFavorite",
    async ({ name, isFavorite }, { getState, dispatch }) => {
        const state = getState()
        const { user } = state
        const { username } = user
        if (user.loggedIn && username) {
            const entities = selectAllEntities(state)
            const isUserOwned = entities[name].folder === username.toUpperCase()
            const markAsFavorite = !isFavorite
            const params = { name, userowned: isUserOwned.toString() }

            if (markAsFavorite) {
                await postAuth("/audio/favorites/add", params)
                dispatch(addFavorite(name))
            } else {
                await postAuth("/audio/favorites/remove", params)
                dispatch(removeFavorite(name))
            }
        }
    }
)

export const renameLocalUserSound = createAsyncThunk<void, { oldName: string; newName: string; }, ThunkAPI>(
    "sounds/renameLocalUserSound",
    ({ oldName, newName }, { getState, dispatch }) => {
        const userSounds = getState().sounds.userSounds
        if (userSounds.names.includes(oldName)) {
            dispatch(renameUserSound({ oldName, newName }))
        }
    }
)

export const deleteLocalUserSound = createAsyncThunk<void, string, ThunkAPI>(
    "sounds/deleteLocalUserSound",
    (payload, { getState, dispatch }) => {
        const userSounds = getState().sounds.userSounds
        if (userSounds.names.includes(payload)) {
            dispatch(deleteUserSound(payload))
        }
    }
)

export const previewSound = createAsyncThunk<void | null, string, ThunkAPI>(
    "sounds/previewSound",
    async (name, { getState, dispatch }) => {
        const previewState = getState().sounds.preview

        if (previewState.bsNode) {
            previewState.bsNode.onended = () => { }
            previewState.bsNode.stop()
        }

        if (previewState.name === name) {
            dispatch(resetPreview())
            return null
        }

        const bs = context.createBufferSource()
        dispatch(setPreviewName(name))
        dispatch(setPreviewBSNode(null))

        await audioLibrary.getSound(name).then(sound => {
            if (name !== selectPreviewName(getState())) {
                // User started clicked play on something else before this finished loading.
                return
            }
            dispatch(setPreviewBSNode(bs))
            bs.buffer = sound.buffer
            bs.connect(context.destination)
            bs.start(0)
            bs.onended = () => {
                dispatch(resetPreview())
            }
        })
    }
)

// Rename a sound if owned by the user.
// TODO: Make this an async thunk, update Redux state.
export async function renameSound(name: string, newName: string) {
    try {
        await postAuth("/audio/rename", { name, newName })
        esconsole(`Successfully renamed sound: ${name} to ${newName}`, ["debug", "user"])
        audioLibrary.clearCache() // TODO: This is probably overkill.
    } catch (err) {
        userNotification.show("Error renaming custom sound", "failure1", 2)
        esconsole(err, ["error", "userproject"])
    }
}
