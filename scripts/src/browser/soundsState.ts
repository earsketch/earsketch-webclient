import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { createSelectorCreator, defaultMemoize } from 'reselect';
import { pickBy, isEqual } from 'lodash';
import * as helpers from '../helpers';

import { RootState, ThunkAPI } from '../reducers';
import { UserState } from '../user/userState';

export interface SoundEntity {
    file_key: string,
    genregroup: string,
    file_location: string,
    folder: string,
    artist: string,
    year: string,
    scope: number,
    genre: string,
    tempo: number,
    instrument: string,
    tags: string
}

interface SoundEntities {
    [key: string]: SoundEntity
}

interface SoundsState {
    defaultSounds: {
        entities: SoundEntities,
        fileKeys: string[]
    },
    userSounds: {
        entities: SoundEntities,
        fileKeys: string[]
    },
    filters: {
        searchText: string,
        favorites: string[],
        byFavorites: boolean,
        artists: string[],
        genres: string[],
        instruments: string[]
    },
    featuredSounds: {
        visible: boolean,
        artists: string[]
    },
    preview: {
        fileKey: string | null,
        bsNode: AudioBufferSourceNode | null
    }
}

const soundsSlice = createSlice({
    name: 'sounds',
    initialState: {
        defaultSounds: {
            entities: {},
            fileKeys: []
        },
        userSounds: {
            entities: {},
            fileKeys: []
        },
        filters: {
            searchText: '',
            favorites: [],
            byFavorites: false,
            artists: [],
            genres: [],
            instruments: []
        },
        featuredSounds: {
            visible: false,
            artists: []
        },
        preview: {
            fileKey: null,
            bsNode: null
        }
    } as SoundsState,
    reducers: {
        setDefaultSounds(state, { payload }) {
            ['entities','fileKeys'].forEach(v => {
                state.defaultSounds[v] = payload[v];
            });
        },
        setUserSounds(state, { payload }) {
            ['entities','fileKeys'].forEach(v => {
                state.userSounds[v] = payload[v];
            });
        },
        resetUserSounds(state) {
            state.userSounds.entities = {};
            state.userSounds.fileKeys = [];
        },
        renameUserSound(state, { payload }) {
            const { oldName, newName } = payload;
            const fileKeys = state.userSounds.fileKeys;
            fileKeys[fileKeys.indexOf(oldName)] = newName;
            const entity = state.userSounds.entities[oldName];
            entity.file_key = newName;
            state.userSounds.entities[newName] = entity;
            delete state.userSounds.entities[oldName];
        },
        deleteUserSound(state, { payload }) {
            const fileKeys = state.userSounds.fileKeys;
            fileKeys.splice(fileKeys.indexOf(payload), 1);
            delete state.userSounds.entities[payload];
        },
        setFavorites(state, { payload }) {
            state.filters.favorites = payload;
        },
        resetFavorites(state) {
            state.filters.favorites = [];
        },
        addFavorite(state, { payload }) {
            state.filters.favorites = state.filters.favorites.concat(payload);
        },
        removeFavorite(state, { payload }) {
            state.filters.favorites = state.filters.favorites.filter(v => v!==payload);
        },
        setFilterByFavorites(state, { payload }) {
            state.filters.byFavorites = payload;
        },
        setSearchText(state, { payload }) {
            state.filters.searchText = payload;
        },
        addFilterItem(state, { payload }) {
            state.filters[payload.category].push(payload.value);
        },
        removeFilterItem(state, { payload }) {
            state.filters[payload.category].splice(state.filters[payload.category].indexOf(payload.value), 1);
        },
        resetFilter(state, { payload }) {
            state.filters[payload] = [];
        },
        resetAllFilters(state) {
            state.filters.searchText = '';
            state.filters.byFavorites = false;
            state.filters.artists = [];
            state.filters.genres = [];
            state.filters.instruments = [];
        },
        setFeaturedSoundVisibility(state, { payload }) {
            state.featuredSounds.visible = payload;
        },
        setFeaturedArtists(state, { payload }) {
            state.featuredSounds.artists = payload;
        },
        setPreviewFileKey(state, { payload }) {
            state.preview.fileKey = payload;
        },
        setPreviewBSNode(state, { payload }) {
            state.preview.bsNode = payload;
        },
        resetPreview(state) {
            state.preview.fileKey = null;
            state.preview.bsNode = null;
        }
    }
});

export default soundsSlice.reducer;
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
    setPreviewFileKey,
    setPreviewBSNode,
    resetPreview
} = soundsSlice.actions;

/* Thunk actions */
export const getDefaultSounds = createAsyncThunk<void, void, ThunkAPI>(
    'sounds/getDefaultSounds',
    async (_, { getState, dispatch }) => {
        const { sounds } = getState();
        if (!sounds.defaultSounds.fileKeys.length) {
            const endPoint = URL_DOMAIN + '/services/audio/getdefaultaudiotags';
            const response = await fetch(endPoint, {
                method: 'GET',
                cache: 'default'
            });
            const data = await response.json();

            const entities = {};
            const fileKeys = new Array(data.length);

            data.forEach((sound,i) => {
                entities[sound.file_key] = sound;
                fileKeys[i] = sound.file_key;
            });

            dispatch(setDefaultSounds({ entities, fileKeys }));
        }
    }
);

export const getUserSounds = createAsyncThunk<void, string, ThunkAPI>(
    'sounds/getUserSounds',
    async (username, { dispatch }) => {
        const endPoint = URL_DOMAIN + '/services/audio/getuseraudiotags';
        const params = new URLSearchParams({ username });
        const response = await fetch(`${endPoint}?${params}`, {
            method: 'GET',
            cache: 'default'
        });
        const data = await response.json();

        const entities = {};
        const fileKeys = new Array(data.length);

        data.forEach((sound,i) => {
            entities[sound.file_key] = sound;
            fileKeys[i] = sound.file_key;
        });

        dispatch(setUserSounds({ entities, fileKeys }));
    }
);

export const getFavorites = createAsyncThunk<void, { username: string, password: string }, ThunkAPI>(
    'sounds/getFavorites',
    async ({ username, password }, { dispatch }) => {
        const endPoint = URL_DOMAIN + '/services/audio/getfavorites';
        const body = new FormData();
        body.append('username', username);
        body.append('password', btoa(password));

        try {
            const response = await fetch(endPoint, {
                method: 'POST',
                body: body
            });
            const result = await response.json();
            dispatch(setFavorites(result));
        } catch (error) {
            console.log(error);
        }
    }
);

export const markFavorite = createAsyncThunk<void, { fileKey: string, isFavorite: boolean }, ThunkAPI>(
    'sounds/markFavorite',
    async ({ fileKey, isFavorite }, { getState, dispatch }) => {
        const state = getState();
        const { user } = state;
        const { username, password } = user as UserState;
        if (user.loggedIn && username && password) {
            const entities = selectAllEntities(state);
            const isUserOwned = entities[fileKey].folder === username.toUpperCase();
            const markAsFavorite = !isFavorite;

            const endPointBase = URL_DOMAIN + '/services/audio';
            const body = new FormData();
            body.append('username', username);
            body.append('password', btoa(password));
            body.append('audio_file_key', fileKey);
            body.append('userowned', isUserOwned.toString());

            if (markAsFavorite) {
                const endPoint = endPointBase+'/addfavorite';
                try {
                    await fetch(endPoint, {
                        method: 'POST',
                        body: body
                    });
                    dispatch(addFavorite(fileKey));
                } catch (error) {
                    console.log(error);
                }
            } else {
                const endPoint = endPointBase+'/removefavorite';
                try {
                    await fetch(endPoint, {
                        method: 'POST',
                        body: body
                    });
                    dispatch(removeFavorite(fileKey));
                } catch (error) {
                    console.log(error);
                }
            }
        }
    }
);

export const renameLocalUserSound = createAsyncThunk<void, { oldName: string, newName: string }, ThunkAPI>(
    'sounds/renameLocalUserSound',
    ({ oldName, newName }, { getState, dispatch }) => {
        const userSounds = getState().sounds.userSounds;
        if (userSounds.fileKeys.includes(oldName)) {
            dispatch(renameUserSound({ oldName, newName }));
        }
    }
);

export const deleteLocalUserSound = createAsyncThunk<void, string, ThunkAPI>(
    'sounds/deleteLocalUserSound',
    (payload, { getState, dispatch }) => {
        const userSounds = getState().sounds.userSounds;
        if (userSounds.fileKeys.includes(payload)) {
            dispatch(deleteUserSound(payload));
        }
    }
);

export const previewSound = createAsyncThunk<void | null, string, ThunkAPI>(
    'sounds/previewSound',
    async (fileKey, { getState, dispatch }) => {
        const previewState = getState().sounds.preview;

        if (previewState.bsNode) {
            previewState.bsNode.onended = () => {};
            previewState.bsNode.stop();
        }

        if (previewState.fileKey === fileKey) {
            dispatch(resetPreview());
            return null;
        }

        const actx = helpers.getNgService('audioContext');
        const bs = actx.createBufferSource();
        dispatch(setPreviewFileKey(fileKey));
        dispatch(setPreviewBSNode(bs));

        const audioLibrary = helpers.getNgService('audioLibrary');
        await audioLibrary.getAudioClip(fileKey,-1).then(buffer => {
            bs.buffer = buffer;
            bs.connect(actx.destination);
            bs.start(0);
            bs.onended = () => {
                dispatch(resetPreview());
            };
        });
    }
);

/* Selectors */
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);
const fileKeysByFoldersSelector = (entities, folders) => {
    const result = {};
    const entitiesList = Object.values(entities) as SoundEntity[];
    folders.forEach(folder => {
        result[folder] = entitiesList.filter(v => v.folder===folder).map(v => v.file_key).sort((a,b) => a.localeCompare(b,undefined,{
            numeric: true,
            sensitivity: 'base'
        }));
    });
    return result;
};

const selectDefaultEntities = (state: RootState) => state.sounds.defaultSounds.entities;
const selectUserEntities = (state: RootState) => state.sounds.userSounds.entities;
const selectDefaultFileKeys = (state: RootState) => state.sounds.defaultSounds.fileKeys;
const selectUserFileKeys = (state: RootState) => state.sounds.userSounds.fileKeys;

export const selectAllFileKeys = createSelector(
    [selectDefaultFileKeys, selectUserFileKeys],
    (defaultFileKeys, userFileKeys) => [...defaultFileKeys, ...userFileKeys]
);

export const selectAllEntities = createSelector(
    [selectDefaultEntities, selectUserEntities],
    (defaultEntities, userEntities) => ({
        ...defaultEntities, ...userEntities
    })
);

export const selectFeaturedSoundVisibility = (state: RootState) => state.sounds.featuredSounds.visible;
export const selectFeaturedArtists = (state: RootState) => state.sounds.featuredSounds.artists;

const selectFeaturedEntities = createSelector(
    [selectDefaultEntities, selectFeaturedArtists],
    (entities, featuredArtists) => pickBy(entities, v => featuredArtists.includes(v.artist))
);

export const selectFeaturedFileKeys = createSelector(
    [selectFeaturedEntities],
    (entities) => Object.keys(entities)
);

export const selectFeaturedFolders = createSelector(
    [selectFeaturedEntities],
    (entities) => {
        const entityList = Object.values(entities);
        return Array.from(new Set(entityList.map(v => v.folder)));
    }
);

export const selectFeaturedFileKeysByFolders = createSelector(
    [selectFeaturedEntities, selectFeaturedFolders],
    fileKeysByFoldersSelector
);

const selectNonFeaturedEntities = createSelector(
    [selectDefaultEntities, selectFeaturedArtists],
    (entities, featuredArtists) => pickBy(entities, v => !featuredArtists.includes(v.artist))
);

export const selectNonFeaturedFileKeys = createSelector(
    [selectNonFeaturedEntities],
    (entities) => Object.keys(entities)
);

// Note: All sounds excluding the featured ones.
export const selectAllRegularFileKeys = createSelector(
    [selectNonFeaturedFileKeys, selectUserFileKeys],
    (nonFeaturedFileKeys, userFileKeys) => [...nonFeaturedFileKeys, ...userFileKeys]
);

export const selectAllRegularEntities = createSelector(
    [selectNonFeaturedEntities, selectUserEntities],
    (nonFeaturedEntities, userEntities) => ({
        ...nonFeaturedEntities, ...userEntities
    })
);

export const selectFilterByFavorites = (state: RootState) => state.sounds.filters.byFavorites;
export const selectFavorites = (state: RootState) => state.sounds.filters.favorites;
export const selectSearchText = (state: RootState) => state.sounds.filters.searchText;
export const selectFilters = (state: RootState) => state.sounds.filters;

export const selectFilteredRegularEntities = createSelector(
    [selectAllRegularEntities, selectFilters],
    (entities, filters) => {
        const term = filters.searchText.toUpperCase();
        return pickBy(entities, v => {
            const field = `${v.folder}${v.file_key}${v.artist}${v.genre}${v.instrument}${v.tempo}`
            return (term.length ? field.includes(term) : true)
                && (filters.byFavorites ? filters.favorites.includes(v.file_key) : true)
                && (filters.artists.length ? filters.artists.includes(v.artist) : true)
                && (filters.genres.length ? filters.genres.includes(v.genre) : true)
                && (filters.instruments.length ? filters.instruments.includes(v.instrument) : true)
        });
    }
);

export const selectFilteredRegularFileKeys = createSelector(
    [selectFilteredRegularEntities],
    (entities) => Object.keys(entities)
);

export const selectFilteredRegularFolders = createSelector(
    [selectFilteredRegularEntities],
    (entities) => {
        const entityList = Object.values(entities);
        return Array.from(new Set(entityList.map(v => v.folder)));
    }
);

export const selectFilteredRegularFileKeysByFolders = createSelector(
    [selectFilteredRegularEntities, selectFilteredRegularFolders],
    (entities, folders) => {
        const result = {};
        const entitiesList = Object.values(entities);
        folders.forEach(folder => {
            result[folder] = entitiesList.filter(v => v.folder===folder).map(v => v.file_key).sort((a,b) => a.localeCompare(b,undefined,{
                numeric: true,
                sensitivity: 'base'
            }));
        });
        return result;
    }
);

export const selectFilteredFeaturedEntities = createSelector(
    [selectFeaturedEntities, selectFilters],
    (entities, filters) => {
        const term = filters.searchText.toUpperCase();
        return pickBy(entities, v => {
            const field = `${v.folder}${v.file_key}${v.artist}${v.genre}${v.instrument}${v.tempo}`
            return (term.length ? field.includes(term) : true)
                && (filters.byFavorites ? filters.favorites.includes(v.file_key) : true)
                && (filters.artists.length ? filters.artists.includes(v.artist) : true)
                && (filters.genres.length ? filters.genres.includes(v.genre) : true)
                && (filters.instruments.length ? filters.instruments.includes(v.instrument) : true)
        });
    }
);

export const selectFilteredFeaturedFileKeys = createSelector(
    [selectFilteredFeaturedEntities],
    (entities) => Object.keys(entities)
);

export const selectFilteredFeaturedFolders = createSelector(
    [selectFilteredFeaturedEntities],
    (entities) => {
        const entityList = Object.values(entities);
        return Array.from(new Set(entityList.map(v => v.folder)));
    }
);

export const selectFilteredFeaturedFileKeysByFolders = createSelector(
    [selectFilteredFeaturedEntities, selectFilteredFeaturedFolders],
    (entities, folders) => {
        const result = {};
        const entitiesList = Object.values(entities);
        folders.forEach(folder => {
            result[folder] = entitiesList.filter(v => v.folder===folder).map(v => v.file_key).sort((a,b) => a.localeCompare(b,undefined,{
                numeric: true,
                sensitivity: 'base'
            }));
        });
        return result;
    }
);

// TODO: Possibly redundant -- filteredFileKeys could be checked for equality.
export const selectFilteredListChanged = createDeepEqualSelector(
    [selectFilteredRegularFileKeys, selectFilteredFeaturedFileKeys], () => {
        return Math.random(); // Return a new value on change.
    }
);

export const selectAllArtists = createSelector(
    [selectAllEntities, selectAllFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].artist)))
);

export const selectAllGenres = createSelector(
    [selectAllEntities, selectAllFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].genre)))
);

export const selectAllInstruments = createSelector(
    [selectAllEntities, selectAllFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].instrument)))
);

export const selectAllRegularArtists = createSelector(
    [selectAllRegularEntities, selectAllRegularFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].artist)))
);

export const selectAllRegularGenres = createSelector(
    [selectAllRegularEntities, selectAllRegularFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].genre)))
);

export const selectAllRegularInstruments = createSelector(
    [selectAllRegularEntities, selectAllRegularFileKeys],
    (entities, fileKeys) => Array.from(new Set(fileKeys.map(v => entities[v].instrument)))
);

export const selectNumArtistsSelected = (state: RootState) => state.sounds.filters.artists.length;
export const selectNumGenresSelected = (state: RootState) => state.sounds.filters.genres.length;
export const selectNumInstrumentsSelected = (state: RootState) => state.sounds.filters.instruments.length;

export const selectPreviewFileKey = (state: RootState) => state.sounds.preview.fileKey;