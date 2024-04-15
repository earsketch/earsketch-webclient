import { createAsyncThunk } from "@reduxjs/toolkit"

import context from "../audio/context"
import * as audioLibrary from "../app/audiolibrary"
import { SoundEntity } from "common"
import { fillDict } from "../app/recommender"
import { ThunkAPI } from "../reducers"
import { get, postAuth } from "../request"
import { addFavorite, deleteUserSound, removeFavorite, renameUserSound, resetPreview, selectAllEntities, selectPreviewName, setStandardSounds, setFavorites, setPreviewBSNode, setPreviewName, setUserSounds } from "./soundsState"
import { beatStringToArray } from "../esutils"

/* Thunk actions */

export const getStandardSounds = createAsyncThunk<void, void, ThunkAPI>(
    "sounds/getStandardSounds",
    async (_, { getState, dispatch }) => {
        const { sounds } = getState()
        if (!sounds.standardSounds.names.length) {
            const data = (await audioLibrary.getStandardSounds()).sounds
            fillDict(data)
            const entities = Object.assign({}, ...Array.from(data, (sound) => ({ [sound.name]: sound })))
            const names = data.map(sound => sound.name)
            dispatch(setStandardSounds({ entities, names }))
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

export const previewBeat = createAsyncThunk<void | null, string, ThunkAPI>(
    // ?
    "sounds/previewBeat",
    async (beatString, { getState, dispatch }) => {
        beatString = beatString.slice(1, beatString.length - 1)
        const beatArray = beatStringToArray(beatString)

        const previewState = getState().sounds.preview

        if (previewState.bsNode) {
            previewState.bsNode.onended = () => { }
            previewState.bsNode.stop()
        }

        // ?
        // if (previewState.name === name) {
        //     dispatch(resetPreview())
        //     return null
        // }

        // const bs = context.createBufferSource()
        // ?
        // dispatch(setPreviewBSNode(null))

        const STRESSED = "METRONOME01"
        const UNSTRESSED = "METRONOME02"

        const beat = 0.25

        const sounds = await Promise.all([
            audioLibrary.getSound(STRESSED),
            audioLibrary.getSound(UNSTRESSED),
        ])
        const start = context.currentTime
        for (let i = 0; i < beatArray.length; i++) {
            const current = beatArray[i]
            if (typeof current === "number") {
                const sound = current % 2
                    ? sounds[0]
                    : sounds[1]
                const delay = (i) * beat

                const bs = context.createBufferSource()
                dispatch(setPreviewBSNode(bs))
                bs.connect(context.destination)
                bs.buffer = sound.buffer
                bs.start(start + delay)
                bs.onended = () => {
                    dispatch(resetPreview())
                }
            }
        }
    }
)

export const renameSound = createAsyncThunk<void, { oldName: string; newName: string; }, ThunkAPI>(
    "sounds/rename",
    async ({ oldName, newName }, { getState, dispatch }) => {
        // call api to rename sound
        await postAuth("/audio/rename", { name: oldName, newName })
        audioLibrary.clearCache() // TODO: This is probably overkill.

        // update local sounds store
        const userSounds = getState().sounds.userSounds
        if (userSounds.names.includes(oldName)) {
            dispatch(renameUserSound({ oldName, newName })) // updates soundState
        }

        // refresh favorites, if needed
        const favorites = getState().sounds.filters.favorites
        const token = getState().user.token
        if (favorites.includes(oldName) && token) {
            dispatch(getFavorites(token))
        }
    }
)
