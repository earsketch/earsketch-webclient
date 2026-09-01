import { createSlice, createSelector } from "@reduxjs/toolkit"
import { createSelectorCreator, defaultMemoize } from "reselect"
import { pickBy, isEqual } from "lodash"

import store, { RootState } from "../reducers"
import type { SoundEntity } from "common"
import { fromEntries } from "../esutils"

import { keyLabelToNumber, keyNumberToLabel, splitEnharmonics } from "../app/recommender"
import { audioSearchEngine } from "./semanticSearch"

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

export type FilterTabs = Omit<Filters, "favorites">

export interface SoundsState {
    standardSounds: Sounds
    userSounds: Sounds
    filters: Filters & {
        searchText: string
        byFavorites: boolean
    }
    featuredSounds: {
        visible: boolean
        artists: string[]
    }
    semanticSearch: {
        enabled: boolean // whether the "Semantic Search" toggle button is on
        results: string[] // real entity names from the CLAP engine, in similarity-rank order
    }
    preview: {
        value: Preview | null
        nodes: AudioBufferSourceNode[]
    }
    auditionRequest: string | null
}

export interface SoundPreview {
    kind: "sound"
    name: string
}

export interface BeatPreview {
    kind: "beat"
    beat: string
}

export type Preview = SoundPreview | BeatPreview

const soundsSlice = createSlice({
    name: "sounds",
    initialState: {
        standardSounds: {
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
        semanticSearch: {
            enabled: false,
            results: [],
        },
        preview: {
            value: null,
            nodes: [],
        },
        auditionRequest: null,
    } as SoundsState,
    reducers: {
        setStandardSounds(state, { payload }) {
            ["entities", "names"].forEach(v => {
                state.standardSounds[v as keyof Sounds] = payload[v]
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
        setSemanticSearchEnabled(state, { payload }: { payload: boolean }) {
            state.semanticSearch.enabled = payload
            if (!payload) state.semanticSearch.results = []
        },
        setSemanticSearchResults(state, { payload }: { payload: string[] }) {
            state.semanticSearch.results = payload
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
            state.semanticSearch.enabled = false
            state.semanticSearch.results = []
        },
        setFeaturedSoundVisibility(state, { payload }) {
            state.featuredSounds.visible = payload
        },
        setFeaturedArtists(state, { payload }) {
            state.featuredSounds.artists = payload
        },
        setPreview(state, { payload }) {
            state.preview.value = payload
        },
        setPreviewNodes(state, { payload }) {
            state.preview.nodes = payload
        },
        resetPreview(state) {
            state.preview.value = null
            state.preview.nodes = []
        },
        setAuditionRequest(state, { payload }: { payload: string | null }) {
            state.auditionRequest = payload
        },
    },
})

export default soundsSlice.reducer
export const {
    setStandardSounds,
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
    setSemanticSearchEnabled,
    setSemanticSearchResults,
    addFilterItem,
    removeFilterItem,
    resetFilter,
    resetAllFilters,
    setFeaturedSoundVisibility,
    setFeaturedArtists,
    setPreview,
    setPreviewNodes,
    resetPreview,
    setAuditionRequest,
} = soundsSlice.actions

/* CLAP semantic search side effect */
// Whenever the "Semantic Search" toggle is on, the sound search bar's text doubles as a CLAP
// query — call scheduleSemanticSearch(searchText) from wherever setSearchText is dispatched
// (currently: SoundSearchBar's onChange in Sounds.tsx) to keep it in sync. This is a debounced
// call into the (async, stateful) AudioSearchEngine, which reducers/selectors can't do
// themselves — the search/dispatch logic lives here instead.
//
// This can't self-wire via store.subscribe() at module scope: reducers.ts imports this file
// (to build the sounds slice) before it constructs `store`, so `store` would still be
// uninitialized at the time this module's top-level code runs.
const SEMANTIC_SEARCH_DEBOUNCE_MS = 500
const SEMANTIC_SEARCH_TOP_K = 20

let semanticSearchDebounceTimer: number | null = null
let semanticSearchRequestId = 0

async function runSemanticSearch(query: string) {
    const requestId = ++semanticSearchRequestId
    try {
        if (!audioSearchEngine.getIsReady()) {
            console.log(`[clap search] engine not ready yet, loading (query "${query}" will run once it's done)...`)
        }
        // Resolves once the model + index finish loading, even if a load is already in
        // flight (e.g. triggered by an earlier query) — lets the user keep typing/searching
        // while the engine warms up instead of blocking on the first call.
        await audioSearchEngine.initialize()
        console.log(`[clap search] engine loaded, searching for "${query}"...`)
        const results = await audioSearchEngine.searchEntityNames(query, SEMANTIC_SEARCH_TOP_K)
        if (requestId !== semanticSearchRequestId) {
            console.log(`[clap search] "${query}" superseded by a newer search, discarding its results`)
            return
        }
        console.log(`[clap search] ${results.length} results for "${query}"`, results)
        store.dispatch(setSemanticSearchResults(results))
    } catch (error) {
        console.error("[clap search] failed:", error)
    }
}

export function scheduleSemanticSearch(searchText: string) {
    if (semanticSearchDebounceTimer) {
        window.clearTimeout(semanticSearchDebounceTimer)
        semanticSearchDebounceTimer = null
    }
    if (!store.getState().sounds.semanticSearch.enabled) return
    const query = searchText.trim()
    if (!query) {
        store.dispatch(setSemanticSearchResults([]))
        return
    }
    console.log(`[clap search] scheduling search for "${query}" in ${SEMANTIC_SEARCH_DEBOUNCE_MS}ms`)
    semanticSearchDebounceTimer = window.setTimeout(() => runSemanticSearch(query), SEMANTIC_SEARCH_DEBOUNCE_MS)
}

// Toggle the "Semantic Search" button. Turning it on immediately (re)runs a search against
// whatever text is already in the search bar, so the user doesn't have to retype anything.
export function toggleSemanticSearchEnabled() {
    const state = store.getState()
    const enabled = !state.sounds.semanticSearch.enabled
    store.dispatch(setSemanticSearchEnabled(enabled))
    if (enabled) scheduleSemanticSearch(state.sounds.filters.searchText)
}

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

const selectStandardEntities = (state: RootState) => state.sounds.standardSounds.entities
const selectUserEntities = (state: RootState) => state.sounds.userSounds.entities
const selectStandardNames = (state: RootState) => state.sounds.standardSounds.names
const selectUserNames = (state: RootState) => state.sounds.userSounds.names

export const selectAllNames = createSelector(
    [selectStandardNames, selectUserNames],
    (standardNames, userNames) => [...standardNames, ...userNames]
)

export const selectAllEntities = createSelector(
    [selectStandardEntities, selectUserEntities],
    (standardEntities, userEntities) => ({
        ...standardEntities, ...userEntities,
    })
)

export const selectFeaturedSoundVisibility = (state: RootState) => state.sounds.featuredSounds.visible
export const selectFeaturedArtists = (state: RootState) => state.sounds.featuredSounds.artists

const selectFeaturedEntities = createSelector(
    [selectStandardEntities, selectFeaturedArtists],
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
    [selectStandardEntities, selectFeaturedArtists],
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
export const selectSemanticSearchEnabled = (state: RootState) => state.sounds.semanticSearch.enabled
export const selectSemanticSearchResults = (state: RootState) => state.sounds.semanticSearch.results
export const selectIsSemanticSearchActive = createSelector(
    [selectSemanticSearchEnabled, selectSemanticSearchResults],
    (enabled, results) => enabled && results.length > 0
)

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

// Set to false to show only CLAP-ranked matches, preserving exact similarity order and
// skipping the heuristic filename-to-entity matching below entirely. Set to true (default) to
// also expand each match out to its folder siblings and same-instrument sounds, which aids
// discovery but dilutes precision and (since matches accumulate into a plain object) loses
// CLAP's similarity ordering.
const SEMANTIC_SEARCH_EXPAND_MATCHES = true

const SEMANTIC_SEARCH_TOP_RESULTS_COUNT = 20

interface SemanticSearchMatches {
    // Directly CLAP-matched entities only, deduped, in similarity-rank order (via object
    // insertion order — each audio result is processed in rank order above).
    primary: SoundEntities
    // primary, plus folder/instrument expansion when SEMANTIC_SEARCH_EXPAND_MATCHES is on
    // (or just primary, unchanged, when it's off).
    all: SoundEntities
}

// If semantic search is active, search across all entities (including featured artists).
// semanticResults are already real EarSketch entity names (relabeled offline by
// tools/relabel_audio_embeddings.js — see its header comment), in CLAP similarity-rank order,
// so matching is a direct lookup rather than a heuristic guess.
const selectSemanticSearchMatches = createSelector(
    [selectAllEntities, selectIsSemanticSearchActive, selectSemanticSearchResults],
    (allEntities, isSemanticSearchActive, semanticResults): SemanticSearchMatches | null => {
        if (!isSemanticSearchActive || semanticResults.length === 0) return null

        const primary: SoundEntities = {}
        for (const name of semanticResults) {
            const entity = allEntities[name]
            if (entity) primary[name] = entity
        }

        if (!SEMANTIC_SEARCH_EXPAND_MATCHES) {
            return { primary, all: primary }
        }

        // Metadata expansion: use the top SEED_SIZE primary matches as seeds to surface
        // related sounds for discovery (folder siblings + same-instrument sounds).
        const INSTRUMENT_EXPANSION_CAP = 15

        const seeds = Object.values(primary)
        const seedFolders = new Set(seeds.map(e => e.folder).filter(Boolean))
        const seedInstruments = new Set(seeds.map(e => e.instrument).filter(Boolean))

        // Folder expansion: all sounds from the same folder as any seed (folders are small, 2–21 entries)
        const folderExpanded: SoundEntities = {}
        for (const [name, entity] of Object.entries(allEntities)) {
            if (primary[name]) continue
            if (entity.folder && seedFolders.has(entity.folder)) {
                folderExpanded[name] = entity
            }
        }

        // Instrument expansion: broader discovery, capped per instrument type to avoid flooding
        const instrumentCounts: Record<string, number> = {}
        const instrumentExpanded: SoundEntities = {}
        for (const [name, entity] of Object.entries(allEntities)) {
            if (primary[name] || folderExpanded[name]) continue
            if (!entity.instrument || !seedInstruments.has(entity.instrument)) continue
            const count = instrumentCounts[entity.instrument] ?? 0
            if (count < INSTRUMENT_EXPANSION_CAP) {
                instrumentExpanded[name] = entity
                instrumentCounts[entity.instrument] = count + 1
            }
        }

        return { primary, all: { ...primary, ...folderExpanded, ...instrumentExpanded } }
    }
)

export const selectFilteredRegularEntities = createSelector(
    [selectAllRegularEntities, selectFilters, selectSemanticSearchMatches],
    (regularEntities, filters, semanticMatches) => {
        if (!semanticMatches) return filterEntities(regularEntities, filters)
        // Semantic search is active. The typed text doubles as a keyword filter: if it has
        // literal matches, show only those (precise) below the Semantic Search Results
        // pseudo-folder. Otherwise fall back to the folder/instrument-expanded discovery view.
        const keywordMatches = filterEntities(regularEntities, filters)
        return Object.keys(keywordMatches).length > 0 ? keywordMatches : semanticMatches.all
    }
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

// Top CLAP-ranked entity names, deduped, unexpanded — for a "Semantic Search Results" pseudo-folder
// shown above the regular (expanded) folder-grouped view, similar to the Recommendations folder.
export const selectSemanticSearchTopResultNames = createSelector(
    [selectSemanticSearchMatches],
    (semanticMatches) => semanticMatches ? Object.keys(semanticMatches.primary).slice(0, SEMANTIC_SEARCH_TOP_RESULTS_COUNT) : []
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

export const selectNumItemsSelected = createSelector(
    [selectFilters],
    filters => fromEntries(["artists", "genres", "instruments", "keys"].map(key => [key, filters[key as keyof Filters].length]))
)

export const selectPreview = (state: RootState) => state.sounds.preview.value
export const selectPreviewNodes = (state: RootState) => state.sounds.preview.nodes
export const selectAuditionRequest = (state: RootState) => state.sounds.auditionRequest
