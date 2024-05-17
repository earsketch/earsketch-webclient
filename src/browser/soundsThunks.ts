import { AnyAction, createAsyncThunk, Dispatch, ThunkDispatch } from "@reduxjs/toolkit"

import context from "../audio/context"
import * as audioLibrary from "../app/audiolibrary"
import { SoundEntity } from "common"
import { fillDict } from "../app/recommender"
import { ThunkAPI } from "../reducers"
import { get, postAuth } from "../request"
import {
    SoundsState,
    addFavorite,
    deleteUserSound,
    removeFavorite,
    renameUserSound,
    resetPreview,
    selectAllEntities,
    selectPreviewValue,
    setStandardSounds,
    setFavorites,
    setPreviewBSNodes,
    setUserSounds,
    setPreviewValue,
    SoundPreview,
    BeatPreview,
} from "./soundsState"
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

function isBeatPreview(preview: SoundPreview | BeatPreview): preview is BeatPreview {
    return (preview as BeatPreview).beat !== undefined
}

export const preview = createAsyncThunk<void | null, SoundPreview | BeatPreview, ThunkAPI>(
    "sounds/preview",
    async (preview, { getState, dispatch }) => {
        const soundState = getState().sounds

        // stop any currently playing preview
        if (soundState.preview.bsNodes) {
            for (const bsNode of soundState.preview.bsNodes) {
                bsNode.onended = null
                bsNode.stop()
            }
            dispatch(resetPreview())
        }

        const previewValue = isBeatPreview(preview) ? preview.beat : preview.name

        if (soundState.preview.value === previewValue) {
            return null
        }

        dispatch(setPreviewValue(previewValue))

        const previewSound = isBeatPreview(preview) ? "METRONOME01" : preview.name
        const sound = await audioLibrary.getSound(previewSound)
        const nodes: AudioBufferSourceNode[] = []
        const finalBS = context.createBufferSource()
        nodes.push(finalBS)
        finalBS.connect(context.destination)
        finalBS.onended = () => dispatch(resetPreview())

        if (previewValue !== selectPreviewValue(getState())) {
            // User started clicked play on something else before this finished loading.
            return
        }

        if (isBeatPreview(preview)) {
            // play a beat preview
            const beatArray = beatStringToArray(preview.beat)
            const beat = 0.25

            const silentArrayBuffer = new AudioBuffer({ numberOfChannels: 1, length: 1, sampleRate: context.sampleRate })
            // silentArrayBuffer.getChannelData(0)[0] = 0
            const start = context.currentTime
            for (let i = 0; i < beatArray.length; i++) {
                const current = beatArray[i]
                if (typeof current === "number") {
                    const delay = i * beat

                    const bs = context.createBufferSource()
                    bs.connect(context.destination)
                    bs.buffer = sound.buffer
                    bs.start(start + delay)

                    nodes.push(bs)
                }
            }

            finalBS.buffer = silentArrayBuffer
            finalBS.start(start + (beat * beatArray.length))
        } else {
            // play a sound preview
            finalBS.buffer = sound.buffer
            finalBS.start(0)
        }

        dispatch(setPreviewBSNodes(nodes))
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
