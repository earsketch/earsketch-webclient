import { createSlice, createSelector } from "@reduxjs/toolkit"
import { createSelectorCreator, defaultMemoize } from "reselect"
import { pickBy, isEqual } from "lodash"

import type { RootState } from "../reducers"
import type { SoundEntity } from "common"

import { keyLabelToNumber, keyNumberToLabel, splitEnharmonics } from "../app/recommender"

interface SoundEntities {
    [name: string]: SoundEntity
}

interface Sounds {
    entities: SoundEntities
    names: string[]
}

export interface Filters {
    favorites: string[]
    artists: string[]
    genres: string[]
    instruments: string[]
    keys: string[]
}

interface SoundsState {
    defaultSounds: Sounds
    userSounds: Sounds
    filters: Filters & {
        searchText: string
        byFavorites: boolean
    }
    featuredSounds: {
        visible: boolean
        artists: string[]
    }
    preview: {
        name: string | null
        bsNode: AudioBufferSourceNode | null
    }
}

const soundsSlice = createSlice({
    name: "sounds",
    initialState: {
        defaultSounds: {
            entities: {},
            names: [],
        },
        userSounds: {
            entities: {},
            names: [],
        },
        filters: {
            searchText: "",
            favorites: [],
            byFavorites: false,
            artists: [],
            genres: [],
            instruments: [],
            keys: [],
        },
        featuredSounds: {
            visible: false,
            artists: [],
        },
        preview: {
            name: null,
            bsNode: null,
        },
    } as SoundsState,
    reducers: {
        setDefaultSounds(state, { payload }) {
            ["entities", "names"].forEach(v => {
                state.defaultSounds[v as keyof Sounds] = payload[v]
            })
        },
        setUserSounds(state, { payload }) {
            ["entities", "names"].forEach(v => {
                state.userSounds[v as keyof Sounds] = payload[v]
            })
        },
        resetUserSounds(state) {
            state.userSounds.entities = {}
            state.userSounds.names = []
        },
        renameUserSound(state, { payload }) {
            const { oldName, newName } = payload
            const names = state.userSounds.names
            names[names.indexOf(oldName)] = newName
            const entity = state.userSounds.entities[oldName]
            delete state.userSounds.entities[oldName]
            entity.name = newName
            state.userSounds.entities[newName] = entity
        },
        deleteUserSound(state, { payload }) {
            const names = state.userSounds.names
            names.splice(names.indexOf(payload), 1)
            delete state.userSounds.entities[payload]
        },
        setFavorites(state, { payload }) {
            state.filters.favorites = payload
        },
        resetFavorites(state) {
            state.filters.favorites = []
        },
        addFavorite(state, { payload }) {
            state.filters.favorites = state.filters.favorites.concat(payload)
        },
        removeFavorite(state, { payload }) {
            state.filters.favorites = state.filters.favorites.filter(v => v !== payload)
        },
        setFilterByFavorites(state, { payload }) {
            state.filters.byFavorites = payload
        },
        setSearchText(state, { payload }) {
            state.filters.searchText = payload
        },
        addFilterItem(state, { payload }) {
            state.filters[payload.category as keyof Filters].push(payload.value)
        },
        removeFilterItem(state, { payload }) {
            state.filters[payload.category as keyof Filters].splice(state.filters[payload.category as keyof Filters].indexOf(payload.value), 1)
        },
        resetFilter(state, { payload }) {
            state.filters[payload as keyof Filters] = []
        },
        resetAllFilters(state) {
            state.filters.searchText = ""
            state.filters.byFavorites = false
            state.filters.artists = []
            state.filters.genres = []
            state.filters.instruments = []
            state.filters.keys = []
        },
        setFeaturedSoundVisibility(state, { payload }) {
            state.featuredSounds.visible = payload
        },
        setFeaturedArtists(state, { payload }) {
            state.featuredSounds.artists = payload
        },
        setPreviewName(state, { payload }) {
            state.preview.name = payload
        },
        setPreviewBSNode(state, { payload }) {
            state.preview.bsNode = payload
        },
        resetPreview(state) {
            state.preview.name = null
            state.preview.bsNode = null
        },
    },
})

export default soundsSlice.reducer
export const {
    setDefaultSounds,
    setUserSounds,
    resetUserSounds,
    renameUserSound,
    deleteUserSound,
    setFavorites,
    resetFavorites,
    addFavorite,
    removeFavorite,
    setFilterByFavorites,
    setSearchText,
    addFilterItem,
    removeFilterItem,
    resetFilter,
    resetAllFilters,
    setFeaturedSoundVisibility,
    setFeaturedArtists,
    setPreviewName,
    setPreviewBSNode,
    resetPreview,
} = soundsSlice.actions

/* Selectors */
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual)
const namesByFoldersSelector = (entities: SoundEntities, folders: string[]) => {
    const result: { [folder: string]: string[] } = {}
    const entitiesList = Object.values(entities)
    folders.forEach(folder => {
        result[folder] = entitiesList.filter(v => v.folder === folder).map(v => v.name).sort((a, b) => a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: "base",
        }))
    })
    return result
}

const selectDefaultEntities = (state: RootState) => state.sounds.defaultSounds.entities
const selectUserEntities = (state: RootState) => state.sounds.userSounds.entities
const selectDefaultNames = (state: RootState) => state.sounds.defaultSounds.names
const selectUserNames = (state: RootState) => state.sounds.userSounds.names

export const selectAllNames = createSelector(
    [selectDefaultNames, selectUserNames],
    (defaultNames, userNames) => [...defaultNames, ...userNames]
)

export const selectAllEntities = createSelector(
    [selectDefaultEntities, selectUserEntities],
    (defaultEntities, userEntities) => ({
        ...defaultEntities, ...userEntities,
    })
)

export const selectFeaturedSoundVisibility = (state: RootState) => state.sounds.featuredSounds.visible
export const selectFeaturedArtists = (state: RootState) => state.sounds.featuredSounds.artists

const selectFeaturedEntities = createSelector(
    [selectDefaultEntities, selectFeaturedArtists],
    (entities: SoundEntities, featuredArtists) => pickBy(entities, v => featuredArtists.includes(v.artist))
)

export const selectFeaturedNames = createSelector(
    [selectFeaturedEntities],
    (entities: SoundEntities) => Object.keys(entities)
)

export const selectFeaturedFolders = createSelector(
    [selectFeaturedEntities],
    (entities: SoundEntities) => {
        const entityList = Object.values(entities)
        return Array.from(new Set(entityList.map(v => v.folder)))
    }
)

export const selectFeaturedNamesByFolders = createSelector(
    [selectFeaturedEntities, selectFeaturedFolders],
    namesByFoldersSelector
)

const selectNonFeaturedEntities = createSelector(
    [selectDefaultEntities, selectFeaturedArtists],
    (entities, featuredArtists) => pickBy(entities, v => !featuredArtists.includes(v.artist))
)

export const selectNonFeaturedNames = createSelector(
    [selectNonFeaturedEntities],
    (entities: SoundEntities) => Object.keys(entities)
)

// Note: All sounds excluding the featured ones.
export const selectAllRegularNames = createSelector(
    [selectNonFeaturedNames, selectUserNames],
    (nonFeaturedNames, userNames) => [...nonFeaturedNames, ...userNames]
)

export const selectAllRegularEntities = createSelector(
    [selectNonFeaturedEntities, selectUserEntities],
    (nonFeaturedEntities: SoundEntities, userEntities) => ({
        ...nonFeaturedEntities, ...userEntities,
    })
)

export const selectFilterByFavorites = (state: RootState) => state.sounds.filters.byFavorites
export const selectFavorites = (state: RootState) => state.sounds.filters.favorites
export const selectSearchText = (state: RootState) => state.sounds.filters.searchText
export const selectFilters = (state: RootState) => state.sounds.filters

function filterKeySignature(keySignatures: string []) {
    const filteredKeys: string [] = []
    for (const key of keySignatures) {
        if (key.includes("/")) {
            const values = splitEnharmonics(key)
            filteredKeys.push(values[0])
            filteredKeys.push(values[1])
        } else {
            filteredKeys.push(key)
        }
    }

    return filteredKeys
}

function filterEntities(entities: SoundEntities, filters: ReturnType<typeof selectFilters>) {
    const term = filters.searchText.toUpperCase()
    const filteredKeys = filterKeySignature(filters.keys)
    return pickBy(entities, v => {
        const field = `${v.folder}${v.name}${v.artist}${v.genre}${v.instrument}${v.tempo}`
        return (term.length ? field.includes(term) : true) &&
            (filters.byFavorites ? filters.favorites.includes(v.name) : true) &&
            (filters.artists.length ? filters.artists.includes(v.artist) : true) &&
            (filters.genres.length ? v.genre && filters.genres.includes(v.genre) : true) &&
            (filters.instruments.length ? v.instrument && filters.instruments.includes(v.instrument) : true) &&
            (filters.keys.length ? v.keySignature && filteredKeys.includes(v.keySignature) : true)
    })
}

export const selectFilteredRegularEntities = createSelector(
    [selectAllRegularEntities, selectFilters],
    filterEntities
)

export const selectFilteredRegularNames = createSelector(
    [selectFilteredRegularEntities],
    (entities: SoundEntities) => Object.keys(entities)
)

export const selectFilteredRegularFolders = createSelector(
    [selectFilteredRegularEntities],
    (entities: SoundEntities) => {
        const entityList = Object.values(entities)
        return Array.from(new Set(entityList.map(v => v.folder)))
    }
)

export const selectFilteredRegularNamesByFolders = createSelector(
    [selectFilteredRegularEntities, selectFilteredRegularFolders],
    namesByFoldersSelector
)

export const selectFilteredFeaturedEntities = createSelector(
    [selectFeaturedEntities, selectFilters],
    filterEntities
)

export const selectFilteredFeaturedNames = createSelector(
    [selectFilteredFeaturedEntities],
    (entities: SoundEntities) => Object.keys(entities)
)

export const selectFilteredFeaturedFolders = createSelector(
    [selectFilteredFeaturedEntities],
    (entities: SoundEntities) => {
        const entityList = Object.values(entities)
        return Array.from(new Set(entityList.map(v => v.folder))).sort()
    }
)

export const selectFilteredFeaturedNamesByFolders = createSelector(
    [selectFilteredFeaturedEntities, selectFilteredFeaturedFolders],
    namesByFoldersSelector
)

const selectEntities = createSelector(
    [selectFeaturedSoundVisibility, selectAllEntities, selectAllRegularEntities],
    (includeFeaturedArtists, allEntities, regularEntities) => includeFeaturedArtists ? allEntities : regularEntities
)

// TODO: Possibly redundant -- filteredNames could be checked for equality.
export const selectFilteredListChanged = createDeepEqualSelector(
    [selectFilteredRegularNames, selectFilteredFeaturedNames], () => {
        return Math.random() // Return a new value on change.
    }
)

export const selectAllArtists = createSelector(
    [selectAllEntities, selectAllNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].artist)))
)

export const selectAllGenres = createSelector(
    [selectAllEntities, selectAllNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].genre)))
)

export const selectAllInstruments = createSelector(
    [selectAllEntities, selectAllNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].instrument)))
)

export const selectAllRegularArtists = createSelector(
    [selectAllRegularEntities, selectAllRegularNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].artist)))
)

export const selectAllRegularGenres = createSelector(
    [selectAllRegularEntities, selectAllRegularNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].genre)))
)

export const selectAllRegularInstruments = createSelector(
    [selectAllRegularEntities, selectAllRegularNames],
    (entities: SoundEntities, names) => Array.from(new Set(names.map(v => entities[v].instrument)))
)

export const selectFilteredArtists = createSelector(
    [selectEntities, selectFilters],
    (entities, filters) => {
        entities = filterEntities(entities, { ...filters, artists: [] })
        return Array.from(new Set(Object.values(entities)
            .filter(entity => entity.genre !== "FREESOUND")
            .filter(entity => entity.artist !== "EARSKETCH TEAM")
            .map(entity => entity.artist))).sort()
    }
)

export const selectFilteredGenres = createSelector(
    [selectEntities, selectFilters],
    (entities, filters) => {
        entities = filterEntities(entities, { ...filters, genres: [] })
        return Array.from(new Set(Object.values(entities)
            .map(entity => entity.genre)
            .filter(genre => genre !== undefined) as string[]
        )).sort()
    }
)

export const selectFilteredInstruments = createSelector(
    [selectEntities, selectFilters],
    (entities, filters) => {
        entities = filterEntities(entities, { ...filters, instruments: [] })
        return Array.from(new Set(Object.values(entities)
            .map(entity => entity.instrument)
            .filter(instrument => instrument !== undefined) as string[]
        )).sort()
    }
)

export const selectFilteredKeys = createSelector(
    [selectEntities, selectFilters],
    (entities, filters) => {
        entities = filterEntities(entities, { ...filters, keys: [] })
        return Array.from(new Set(Object.values(entities)
            .map(entity => entity.keySignature ? keyNumberToLabel(keyLabelToNumber(entity.keySignature)) : undefined)
            .filter(keySignature => keySignature !== undefined) as string[]
        )).sort()
    }
)

export const selectNumArtistsSelected = (state: RootState) => state.sounds.filters.artists.length
export const selectNumGenresSelected = (state: RootState) => state.sounds.filters.genres.length
export const selectNumInstrumentsSelected = (state: RootState) => state.sounds.filters.instruments.length
export const selectNumKeysSelected = (state: RootState) => state.sounds.filters.keys.length

export const selectPreviewName = (state: RootState) => state.sounds.preview.name
export const selectPreviewNode = (state: RootState) => state.sounds.preview.bsNode
