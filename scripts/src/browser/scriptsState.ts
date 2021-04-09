import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { pickBy, keyBy, cloneDeep, each } from 'lodash';
import * as dayjs from 'dayjs';
import { selectUserName } from '../user/userState';
import * as helpers from '../helpers';
import { RootState, ThunkAPI } from '../reducers';
import { ScriptEntity, ScriptType } from 'common';

export interface ScriptEntities {
    [scriptID: string]: ScriptEntity
}

export interface Scripts {
    entities: ScriptEntities,
    scriptIDs: string[]
}

export type SortByAttribute = 'Date' | 'A-Z';

export interface Filters {
    owners: string[]
    types: string[]
}

interface AllFilters extends Filters {
    searchText: string
    showDeleted: boolean
    sortBy: {
        attribute: SortByAttribute
        ascending: boolean
    }
}

interface ScriptsState {
    regularScripts: Scripts
    sharedScripts: Scripts
    deletedScripts: Scripts
    localScripts: Scripts
    readOnlyScripts: Scripts
    filters: AllFilters
    featureSharedScript: boolean
    dropdownMenu: {
        show: boolean
        script: ScriptEntity | null
        type: ScriptType | null
        context: boolean
    }
    sharedScriptInfo: {
        show: boolean
        script: ScriptEntity | null
    }
}

const scriptsSlice = createSlice({
    name: 'scripts',
    initialState: {
        regularScripts: {
            entities: {},
            scriptIDs: []
        },
        sharedScripts: {
            entities: {},
            scriptIDs: []
        },
        deletedScripts: {
            entities: {},
            scriptIDs: []
        },
        localScripts: {
            entities: {},
            scriptIDs: []
        },
        readOnlyScripts: {
            entities: {},
            scriptIDs: []
        },
        filters: {
            searchText: '',
            showDeleted: false,
            owners: [],
            types: [],
            sortBy: {
                attribute: 'Date',
                ascending: false
            }
        },
        featureSharedScript: false, // When opened via a shared-script link.
        // The below two are singleton UI component states that are incompatible with the react.window library.
        dropdownMenu: {
            show: false,
            script: null,
            type: null,
            context: false
        },
        sharedScriptInfo: {
            show: false,
            script: null
        }
    } as ScriptsState,
    reducers: {
        setRegularScripts(state, { payload }) {
            state.regularScripts.entities = payload;
            state.regularScripts.scriptIDs = Object.keys(payload);
        },
        resetRegularScripts(state) {
            state.regularScripts.entities = {};
            state.regularScripts.scriptIDs = [];
        },
        setSharedScripts(state, { payload }) {
            state.sharedScripts.entities = payload;
            state.sharedScripts.scriptIDs = Object.keys(payload);
        },
        resetSharedScripts(state) {
            state.sharedScripts.entities = {};
            state.sharedScripts.scriptIDs = [];
        },
        // addLocalScript(state, { payload }) {
        //     state.localScripts.entities[payload.scriptID] = payload;
        //     state.localScripts.scriptIDs.push(payload.scriptID);
        // },
        // resetLocalScripts(state) {
        //     state.localScripts.entities = {};
        //     state.localScripts.scriptIDs = [];
        // },
        addReadOnlyScript(state, { payload }) {
            state.readOnlyScripts.entities[payload.shareid] = payload;
            state.readOnlyScripts.scriptIDs.push(payload.shareid);
        },
        removeReadOnlyScript(state, { payload }) {
            delete state.readOnlyScripts.entities[payload];
            state.readOnlyScripts.scriptIDs = state.readOnlyScripts.scriptIDs.filter(v => v !== payload);
        },
        resetReadOnlyScripts(state) {
            state.readOnlyScripts.entities = {};
            state.readOnlyScripts.scriptIDs = [];
        },
        setSearchText(state, { payload }) {
            state.filters.searchText = payload;
        },
        setShowDeleted(state, { payload }) {
            state.filters.showDeleted = payload;
        },
        addFilterItem(state, { payload }) {
            state.filters[payload.category as keyof Filters].push(payload.value);
        },
        removeFilterItem(state, { payload }) {
            state.filters[payload.category as keyof Filters].splice(state.filters[payload.category as keyof Filters].indexOf(payload.value), 1);
        },
        resetFilter(state, { payload }) {
            state.filters[payload as keyof Filters] = [];
        },
        setSorter(state, { payload }) {
            if (state.filters.sortBy.attribute === payload) {
                state.filters.sortBy.ascending = !state.filters.sortBy.ascending;
            } else {
                state.filters.sortBy.attribute = payload;
                state.filters.sortBy.ascending = payload==='A-Z';
            }
        },
        resetSorter(state) {
            state.filters.sortBy = {
                attribute: 'Date',
                ascending: false
            };
        },
        setFeatureSharedScript(state, { payload }) {
            state.featureSharedScript = payload;
        },
        // TODO: Move dropdown stuff to temporary / mutable state.
        setDropdownMenu(state, { payload }) {
            state.dropdownMenu.show = payload.show ? payload.show : true;
            state.dropdownMenu.script = payload.script;
            state.dropdownMenu.type = payload.type;
            state.dropdownMenu.context = payload.context ? payload.context : false;
        },
        resetDropdownMenu(state) {
            state.dropdownMenu = {
                show: false,
                script: null,
                type: null,
                context: false
            };
        },
        setSharedScriptInfo(state, { payload }) {
            state.sharedScriptInfo.show = payload.show ? payload.show : true;
            state.sharedScriptInfo.script = payload.script;
        },
        resetSharedScriptInfo(state) {
            state.sharedScriptInfo = {
                show: false,
                script: null
            }
        }
    }
});

const persistConfig = {
    key: 'scripts',
    whitelist: ['localScripts','readOnlyScripts'],
    storage
};

export default persistReducer(persistConfig, scriptsSlice.reducer);
export const {
    setRegularScripts,
    resetRegularScripts,
    setSharedScripts,
    resetSharedScripts,
    // addLocalScript,
    // resetLocalScripts,
    addReadOnlyScript,
    removeReadOnlyScript,
    resetReadOnlyScripts,
    setSearchText,
    setShowDeleted,
    addFilterItem,
    removeFilterItem,
    resetFilter,
    setSorter,
    resetSorter,
    setFeatureSharedScript,
    setDropdownMenu,
    resetDropdownMenu,
    setSharedScriptInfo,
    resetSharedScriptInfo
} = scriptsSlice.actions;

/*=== Thunks ===*/
// TODO: This will need to be completely replaced by a Redux-only state mgmt.
export const syncToNgUserProject = createAsyncThunk(
    'scripts/syncToNgUserProject',
    (_, { dispatch }) => {
        const userProject = helpers.getNgService('userProject');
        const scripts = cloneDeep(userProject.scripts);
        const sharedScripts = cloneDeep(userProject.sharedScripts);
        each(scripts, script => {
            script.imported = !!script.creator;
        });
        each(sharedScripts, script => {
            if (!script.creator) {
                script.creator = script.username;
            }
        });

        dispatch(setRegularScripts(scripts));
        dispatch(setSharedScripts(sharedScripts));
    }
);

const encloseScripts = (scriptsData: any) => {
    if (scriptsData === null) {
        return [];
    } else if (scriptsData.scripts instanceof Array) {
        return scriptsData.scripts;
    } else {
        return [scriptsData.scripts];
    }
};

const formatDate = (script: ScriptEntity) => {
    // Overwriting the date format for no good reason.
    // TODO: save script API should accommodate UTC format, etc.
    script.created = dayjs(script.created).valueOf();
    script.modified = dayjs(script.modified).valueOf();
};

const removeUnusedFields = (script: ScriptEntity) => {
    script.id && delete script.id;
    script.file_location && delete script.file_location;
};

const setCollaborators = (script: ScriptEntity, username:string|null = null) => {
    if (script.collaborators === undefined) {
        script.collaborators = [];
    } else if (typeof(script.collaborators) === 'string') {
        script.collaborators = [script.collaborators];
    }

    const collaborators = script.collaborators as string[];

    // Provide username for the shared script browser.
    if (username) {
        if (!!collaborators.length && collaborators.map(v => v.toLowerCase()).includes(username.toLowerCase())) {
            script.collaborative = true;
            script.readonly = false;
        } else {
            script.collaborative = false;
            script.readonly = true;
        }
    } else {
        // For regular (aka "my") script browser.
        script.collaborative = !!collaborators.length;
    }
};

export const getRegularScripts = createAsyncThunk<void, { username: string, password: string}, ThunkAPI>(
    'scripts/getRegularScripts',
    async ({ username, password }, { dispatch }) => {
        const endPoint = URL_DOMAIN + '/services/scripts/findall';
        const payload = new FormData();
        payload.append('username', username);
        payload.append('password', btoa(password));

        try {
            const response = await fetch(endPoint, {
                method: 'POST',
                body: payload
            });
            const data = await response.json();
            const scriptList = encloseScripts(data);

            // Mutating each script's data...
            scriptList.forEach((script: ScriptEntity) => {
                script.saved = true;
                script.tooltipText = ''; // For dirty tabs. Probably redundant.
                script.imported = !!script.creator;
                removeUnusedFields(script);
                formatDate(script);
                setCollaborators(script);
            });
            dispatch(setRegularScripts(keyBy(scriptList, 'shareid')));
        } catch (error) {
            // TODO: Log error in user report. Should we also display the error to the user?
            console.log(error);
        }
    }
);

export const getSharedScripts = createAsyncThunk<void, { username: string, password: string}, ThunkAPI>(
    'scripts/getSharedScripts',
    async ({ username, password }, { dispatch }) => {
        const endPoint = URL_DOMAIN + '/services/scripts/getsharedscripts';
        const payload = new FormData();
        payload.append('username', username);
        payload.append('password', btoa(password));

        try {
            const response = await fetch(endPoint, {
                method: 'POST',
                body: payload
            });
            const data = await response.json();
            const scriptList = encloseScripts(data);

            scriptList.forEach((script: ScriptEntity) => {
                script.saved = true;
                script.tooltipText = ''; // For dirty tabs. Probably redundant.
                script.isShared = true; // TODO: Call it shared.
                removeUnusedFields(script);
                formatDate(script);
                setCollaborators(script, username);
            });
            dispatch(setSharedScripts(keyBy(scriptList, 'shareid')));
        } catch (error) {
            console.log(error);
        }
    }
);

// export const createScript = createAsyncThunk(
//     'scripts/createScript',
//     ({ name, code, overwrite=true }, { getState }) => {
//
//     }
// );

// export const saveScript = createAsyncThunk(
//     'script/saveScript',
//     () => {}
// );

// export const saveAllScripts = createAsyncThunk(
//     'script/saveAllScripts',
//     () => {}
// );

export const resetDropdownMenuAsync = createAsyncThunk<void, void, ThunkAPI>(
    'scripts/resetDropdownMenuAsync',
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetDropdownMenu()), 0);
    }
);

export const resetSharedScriptInfoAsync = createAsyncThunk<void ,void, ThunkAPI>(
    'scripts/resetSharedScriptInfoAsync',
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetSharedScriptInfo()), 0);
    }
);

/*=== Selectors ===*/
const selectRegularScriptEntities = (state: RootState) => state.scripts.regularScripts.entities;
const selectRegularScriptIDs = (state: RootState) => state.scripts.regularScripts.scriptIDs;
const selectSharedScriptEntities = (state: RootState) => state.scripts.sharedScripts.entities;
export const selectSharedScriptIDs = (state: RootState) => state.scripts.sharedScripts.scriptIDs;
export const selectReadOnlyScriptEntities = (state: RootState) => state.scripts.readOnlyScripts.entities;
const selectReadOnlyScriptIDs = (state: RootState) => state.scripts.readOnlyScripts.scriptIDs;

export const selectActiveScriptEntities = createSelector(
    [selectRegularScriptEntities],
    (entities) => pickBy(entities, v => ![true,'1'].includes(v.soft_delete as any))
);
export const selectActiveScriptIDs = createSelector(
    [selectActiveScriptEntities],
    (entities) => Object.keys(entities)
);

export const selectDeletedScriptEntities = createSelector(
    [selectRegularScriptEntities],
    (entities) => pickBy(entities, v => [true,'1'].includes(v.soft_delete as any))
);
export const selectDeletedScriptIDs = createSelector(
    [selectDeletedScriptEntities],
    (entities) => Object.keys(entities)
);
export const selectAllScriptEntities = createSelector(
    [selectRegularScriptEntities, selectSharedScriptEntities, selectReadOnlyScriptEntities],
    (regularScripts, sharedScripts, readOnlyScripts) => Object.assign({}, regularScripts, sharedScripts, readOnlyScripts)
);
export const selectAllScriptIDs = createSelector(
    [selectRegularScriptIDs, selectSharedScriptIDs, selectReadOnlyScriptIDs],
    (regularIDs, sharedIDs, readOnlyIDs) => [...regularIDs, ...sharedIDs, ...readOnlyIDs]
);

export const selectFilters = (state: RootState) => state.scripts.filters;
export const selectSearchText = (state: RootState) => state.scripts.filters.searchText;
export const selectShowDeleted = (state: RootState) => state.scripts.filters.showDeleted;
export const selectSortByAttribute = (state: RootState) => state.scripts.filters.sortBy.attribute;
export const selectSortByAscending = (state: RootState) => state.scripts.filters.sortBy.ascending;

const applyFiltersToEntities = (entities: ScriptEntities, filters: AllFilters) => {
    const term = filters.searchText.toLowerCase();
    const extensions = {
        Python: 'py',
        JavaScript: 'js'
    };
    return pickBy(entities, v => {
        const field = `${v.name.toLowerCase()}${v.username ? v.username.toLowerCase(): ''}`;
        const types = filters.types.map(a => extensions[a as 'Python'|'JavaScript']);
        return (term.length ? field.includes(term) : true)
            && (filters.owners.length ? filters.owners.includes(v.username) : true)
            && (filters.types.length ? types.includes(v.name.slice(-2)) : true);
    });
};

const sortScriptIDs = (entities: ScriptEntities, sortBy: SortByAttribute, ascending: boolean) => {
    const lexicalSortOptions = {
        numeric: true,
        sensitivity: 'base'
    };
    return Object.values(entities).sort((a, b) => {
        let c:any, d:any;
        if (sortBy === 'A-Z') {
            c = a.name;
            d = b.name;

            return ascending
                ? c.localeCompare(d,undefined,lexicalSortOptions)
                : d.localeCompare(c,undefined,lexicalSortOptions);
        } else {
            c = a.modified;
            d = b.modified;
            return ascending ? c-d : d-c;
        }
    }).map(v => v.shareid);
};

export const selectFilteredActiveScriptEntities = createSelector(
    [selectActiveScriptEntities, selectFilters],
    applyFiltersToEntities
);
export const selectFilteredSharedScriptEntities = createSelector(
    [selectSharedScriptEntities, selectFilters],
    applyFiltersToEntities
);
export const selectFilteredDeletedScriptEntities = createSelector(
    [selectDeletedScriptEntities, selectFilters],
    applyFiltersToEntities
);

export const selectFilteredActiveScriptIDs = createSelector(
    [selectFilteredActiveScriptEntities, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
);
export const selectFilteredSharedScriptIDs = createSelector(
    [selectFilteredSharedScriptEntities, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
);
export const selectFilteredDeletedScriptIDs = createSelector(
    [selectFilteredDeletedScriptEntities, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
);

export const selectFeatureSharedScript = (state: RootState) => state.scripts.featureSharedScript;
export const selectShowDropdownMenu = (state: RootState) => state.scripts.dropdownMenu.show;
export const selectDropdownMenuScript = (state: RootState) => state.scripts.dropdownMenu.script;
export const selectDropdownMenuType = (state: RootState) => state.scripts.dropdownMenu.type;
export const selectDropdownMenuContext = (state: RootState) => state.scripts.dropdownMenu.context;

// TODO: Unsaved scripts should probably be tracked in the editor or tab state.
export const selectUnsavedDropdownMenuScript = createSelector(
    [selectDropdownMenuScript, selectDropdownMenuType, selectReadOnlyScriptEntities],
    (script, type, readOnlyScripts) => {
        if (!script) {
            return null;
        }

        const userProject = helpers.getNgService('userProject');
        return type==='regular' && userProject.scripts[script.shareid]
            || type==='shared' && userProject.sharedScripts[script.shareid]
            || type==='readonly' && readOnlyScripts[script.shareid] || null;
    }
);

export const selectShowSharedScriptInfo = (state: RootState) => state.scripts.sharedScriptInfo.show;
export const selectSharedInfoScript = (state: RootState) => state.scripts.sharedScriptInfo.script;

export const selectAllScriptOwners = createSelector(
    [selectUserName, selectSharedScriptEntities, selectSharedScriptIDs],
    (userName, sharedScriptEntities, sharedScriptIDs): any[] => {
        // TODO: Refactor to return string[].
        return [userName, ...new Set(sharedScriptIDs.map((v:string) => sharedScriptEntities[v].username))];
    }
);

export const selectNumOwnersSelected = (state: RootState) => state.scripts.filters.owners.length;
export const selectNumTypesSelected = (state: RootState) => state.scripts.filters.types.length;