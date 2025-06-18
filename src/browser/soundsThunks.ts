import { createAsyncThunk } from "@reduxjs/toolkit"

import context from "../audio/context"
import * as audioLibrary from "../app/audiolibrary"
import { SoundEntity } from "common"
import { fillDict } from "../app/recommender"
import { ThunkAPI } from "../reducers"
import { get, postAuth } from "../request"
import {
    addFavorite,
    deleteUserSound,
    removeFavorite,
    renameUserSound,
    resetPreview,
    selectAllEntities,
    selectPreview,
    setStandardSounds,
    setFavorites,
    setPreviewNodes,
    setUserSounds,
    setPreview,
    Preview,
} from "./soundsState"
import { beatStringToArray } from "../esutils"
import _ from "lodash"

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
        const data = await audioLibrary.getUserSounds(username)
        const entities: { [key: string]: SoundEntity; } = {}
        const names = new Array(data.length)
        for (const [i, sound] of data.entries()) {
            entities[sound.name] = sound
            names[i] = sound.name
        }

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

export const togglePreview = createAsyncThunk<void | null, Preview, ThunkAPI>(
    "sounds/togglePreview",
    async (preview, { getState, dispatch }) => {
        const { value: oldPreview, nodes: oldNodes } = getState().sounds.preview

        // Stop any currently-playing preview.
        if (oldNodes) {
            for (const node of oldNodes) {
                node.onended = null
                node.stop()
            }
            dispatch(resetPreview())
        }

        if (_.isEqual(oldPreview, preview)) {
            // We were already previewing this (and now we've stopped).
            return null
        }

        dispatch(setPreview(preview))

        const previewSound = preview.kind === "beat" ? "METRONOME01" : preview.name
        const sound = await audioLibrary.getSound(previewSound)

        if (!_.isEqual(preview, selectPreview(getState()))) {
            // User started previewing something else before this finished loading.
            return
        }

        const endNode = new AudioBufferSourceNode(context)
        const nodes: AudioBufferSourceNode[] = [endNode]
        endNode.connect(context.destination)
        endNode.onended = () => dispatch(resetPreview())

        if (preview.kind === "beat") {
            // Preview a beat.
            const beatArray = beatStringToArray(preview.beat)
            const beat = 0.25

            const start = context.currentTime
            for (let i = 0; i < beatArray.length; i++) {
                const current = beatArray[i]
                if (typeof current === "number") {
                    const delay = i * beat
                    const node = new AudioBufferSourceNode(context, { buffer: sound.buffer })
                    node.connect(context.destination)
                    node.start(start + delay)
                    nodes.push(node)
                }
            }

            // Schedule a minimum-length buffer at the end to trigger `onended` after the beat has finished playing.
            endNode.buffer = new AudioBuffer({ numberOfChannels: 1, length: 1, sampleRate: context.sampleRate })
            endNode.start(start + (beat * beatArray.length))
        } else {
            // Preview a sound.
            endNode.buffer = sound.buffer
            endNode.start(0)
        }

        dispatch(setPreviewNodes(nodes))
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
