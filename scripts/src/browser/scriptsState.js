import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { pickBy, keyBy, cloneDeep, each } from 'lodash';
import * as dayjs from 'dayjs';
import { selectUserName } from '../user/userState';
import * as helpers from 'helpers';

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
    },
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
            state.filters[payload.category].push(payload.value);
        },
        removeFilterItem(state, { payload }) {
            state.filters[payload.category].splice(state.filters[payload.category].indexOf(payload.value), 1);
        },
        resetFilter(state, { payload }) {
            state.filters[payload] = [];
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
                type: null
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
    whitelist: ['localScripts'],
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

const encloseScripts = scriptsData => {
    if (scriptsData === null) {
        return [];
    } else if (scriptsData.scripts instanceof Array) {
        return scriptsData.scripts;
    } else {
        return [scriptsData.scripts];
    }
};

const formatDate = script => {
    // Overwriting the date format for no good reason.
    // TODO: save script API should accommodate UTC format, etc.
    script.created = dayjs(script.created).valueOf();
    script.modified = dayjs(script.modified).valueOf();
};

const removeUnusedFields = script => {
    script.id && delete script.id;
    script.file_location && delete script.file_location;
};

const setCollaborators = (script, username=null) => {
    if (script.collaborators === undefined) {
        script.collaborators = [];
    } else if (typeof(script.collaborators) === 'string') {
        script.collaborators = [script.collaborators];
    }

    // Provide username for the shared script browser.
    if (username) {
        if (!!script.collaborators.length && script.collaborators.map(v => v.toLowerCase()).includes(username.toLowerCase())) {
            script.collaborative = true;
            script.readonly = false;
        } else {
            script.collaborative = false;
            script.readonly = true;
        }
    } else {
        // For regular (aka "my") script browser.
        script.collaborative = !!script.collaborators.length;
    }
};

export const getRegularScripts = createAsyncThunk(
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
            scriptList.forEach(script => {
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

export const getSharedScripts = createAsyncThunk(
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

            scriptList.forEach(script => {
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

export const createScript = createAsyncThunk(
    'scripts/createScript',
    ({ name, code, overwrite=true }, { getState }) => {

    }
);

export const saveScript = createAsyncThunk(
    'script/saveScript',
    () => {}
);

export const saveAllScripts = createAsyncThunk(
    'script/saveAllScripts',
    () => {}
);

export const resetDropdownMenuAsync = createAsyncThunk(
    'scripts/resetDropdownMenuAsync',
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetDropdownMenu()), 0);
    }
);

export const resetSharedScriptInfoAsync = createAsyncThunk(
    'scripts/resetSharedScriptInfoAsync',
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetSharedScriptInfo()), 0);
    }
);

/*=== Selectors ===*/
const selectRegularScriptEntities = state => state.scripts.regularScripts.entities;
const selectRegularScriptIDs = state => state.scripts.regularScripts.scriptIDs;
const selectSharedScriptEntities = state => state.scripts.sharedScripts.entities;
export const selectSharedScriptIDs = state => state.scripts.sharedScripts.scriptIDs;
const selectReadOnlyScriptEntities = state => state.scripts.readOnlyScripts.entities;
const selectReadOnlyScriptIDs = state => state.scripts.readOnlyScripts.scriptIDs;

export const selectActiveScriptEntities = createSelector(
    [selectRegularScriptEntities],
    (entities) => pickBy(entities, v => ![true,'1'].includes(v.soft_delete))
);
export const selectActiveScriptIDs = createSelector(
    [selectActiveScriptEntities],
    (entities) => Object.keys(entities)
);

export const selectDeletedScriptEntities = createSelector(
    [selectRegularScriptEntities],
    (entities) => pickBy(entities, v => [true,'1'].includes(v.soft_delete))
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

export const selectFilters = state => state.scripts.filters;
export const selectSearchText = state => state.scripts.filters.searchText;
export const selectShowDeleted = state => state.scripts.filters.showDeleted;
export const selectSortByAttribute = state => state.scripts.filters.sortBy.attribute;
export const selectSortByAscending = state => state.scripts.filters.sortBy.ascending;

const applyFiltersToEntities = (entities, filters) => {
    const term = filters.searchText.toLowerCase();
    const extensions = {
        Python: 'py',
        JavaScript: 'js'
    };
    return pickBy(entities, v => {
        const field = `${v.name.toLowerCase()}${v.username ? v.username.toLowerCase(): ''}`;
        const types = filters.types.map(a => extensions[a]);
        return (term.length ? field.includes(term) : true)
            && (filters.owners.length ? filters.owners.includes(v.username) : true)
            && (filters.types.length ? types.includes(v.name.slice(-2)) : true);
    });
};

const sortScriptIDs = (entities, sortBy, ascending) => {
    const lexicalSortOptions = {
        numeric: true,
        sensitivity: 'base'
    };
    return Object.values(entities).sort((a, b) => {
        let c, d;
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

export const selectFeatureSharedScript = state => state.scripts.featureSharedScript;
export const selectShowDropdownMenu = state => state.scripts.dropdownMenu.show;
export const selectDropdownMenuScript = state => state.scripts.dropdownMenu.script;
export const selectDropdownMenuType = state => state.scripts.dropdownMenu.type;
export const selectDropdownMenuContext = state => state.scripts.dropdownMenu.context;

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

export const selectShowSharedScriptInfo = state => state.scripts.sharedScriptInfo.show;
export const selectSharedInfoScript = state => state.scripts.sharedScriptInfo.script;

export const selectAllScriptOwners = createSelector(
    [selectUserName, selectSharedScriptEntities, selectSharedScriptIDs],
    (userName, sharedScriptEntities, sharedScriptIDs) => {
        return [userName, ...new Set(sharedScriptIDs.map(v => sharedScriptEntities[v].username))];
    }
);

export const selectNumOwnersSelected = state => state.scripts.filters.owners.length;
export const selectNumTypesSelected = state => state.scripts.filters.types.length;