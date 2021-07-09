import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit"
import { createTransform, persistReducer } from "redux-persist"
import storage from "redux-persist/lib/storage"
import * as dayjs from "dayjs"

import { Script, ScriptType } from "common"
import { selectUserName } from "../user/userState"
import { RootState, ThunkAPI } from "../reducers"
import * as userProject from "../app/userProject"

export interface Scripts {
    [scriptID: string]: Script
}

export type SortByAttribute = "Date" | "A-Z";

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
    // TODO: Rename to clarify: are regularScripts all scripts owned by user (including shared and collaborative scripts)?
    regularScripts: Scripts
    sharedScripts: Scripts
    readOnlyScripts: Scripts
    filters: AllFilters
    featureSharedScript: boolean
    dropdownMenu: {
        show: boolean
        script: Script | null
        type: ScriptType | null
        context: boolean
    }
    sharedScriptInfo: {
        show: boolean
        script: Script | null
    }
}

const scriptsSlice = createSlice({
    name: "scripts",
    initialState: {
        regularScripts: {},
        sharedScripts: {},
        readOnlyScripts: {},
        filters: {
            searchText: "",
            showDeleted: false,
            owners: [],
            types: [],
            sortBy: {
                attribute: "Date",
                ascending: false,
            },
        },
        featureSharedScript: false, // When opened via a shared-script link.
        // The below two are singleton UI component states that are incompatible with the react.window library.
        dropdownMenu: {
            show: false,
            script: null,
            type: null,
            context: false,
        },
        sharedScriptInfo: {
            show: false,
            script: null,
        },
    } as ScriptsState,
    reducers: {
        setRegularScripts(state, { payload }) {
            state.regularScripts = payload
        },
        resetRegularScripts(state) {
            state.regularScripts = {}
        },
        setSharedScripts(state, { payload }) {
            state.sharedScripts = payload
        },
        resetSharedScripts(state) {
            state.sharedScripts = {}
        },
        addReadOnlyScript(state, { payload }) {
            state.readOnlyScripts[payload.shareid] = payload
        },
        removeReadOnlyScript(state, { payload }) {
            delete state.readOnlyScripts[payload]
        },
        resetReadOnlyScripts(state) {
            state.readOnlyScripts = {}
        },
        setSearchText(state, { payload }) {
            state.filters.searchText = payload
        },
        setShowDeleted(state, { payload }) {
            state.filters.showDeleted = payload
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
        setSorter(state, { payload }) {
            if (state.filters.sortBy.attribute === payload) {
                state.filters.sortBy.ascending = !state.filters.sortBy.ascending
            } else {
                state.filters.sortBy.attribute = payload
                state.filters.sortBy.ascending = payload === "A-Z"
            }
        },
        setFeatureSharedScript(state, { payload }) {
            state.featureSharedScript = payload
        },
        // TODO: Move dropdown stuff to temporary / mutable state.
        setDropdownMenu(state, { payload }) {
            state.dropdownMenu.show = payload.show ? payload.show : true
            state.dropdownMenu.script = payload.script
            state.dropdownMenu.type = payload.type
            state.dropdownMenu.context = payload.context ? payload.context : false
        },
        resetDropdownMenu(state) {
            state.dropdownMenu = {
                show: false,
                script: null,
                type: null,
                context: false,
            }
        },
        setSharedScriptInfo(state, { payload }) {
            state.sharedScriptInfo.show = payload.show ? payload.show : true
            state.sharedScriptInfo.script = payload.script
        },
        resetSharedScriptInfo(state) {
            state.sharedScriptInfo = {
                show: false,
                script: null,
            }
        },
        setScriptSource(state, { payload: { id, source } }) {
            // TODO: Revisit this regrettable reducer once state consolidation is complete.
            if (id in state.regularScripts) {
                state.regularScripts[id].source_code = source
                if (!state.regularScripts[id].collaborative) {
                    state.regularScripts[id].saved = false
                }
            } else if (id in state.sharedScripts) {
                state.sharedScripts[id].source_code = source
                if (!state.sharedScripts[id].collaborative) {
                    state.sharedScripts[id].saved = false
                }
            } else {
                throw new Error("Invalid script ID")
            }
        },
        setScriptDescription(state, { payload: { id, description } }) {
            state.regularScripts[id].description = description
        },
        setScriptName(state, { payload: { id, name } }) {
            state.regularScripts[id].name = name
        },
        setScriptLicense(state, { payload: { id, licenseID } }) {
            state.regularScripts[id].license_id = licenseID
        },
        setScriptCollaborators(state, { payload: { id, collaborators } }) {
            state.regularScripts[id].collaborators = collaborators
            state.regularScripts[id].collaborative = collaborators.length > 0
        },
    },
})

const LocalScriptTransform = createTransform(
    // Transform state on its way to being persisted.
    (inboundState: ScriptsState, key) => {
        if (userProject.isLoggedIn()) {
            return {}
        }
        return inboundState
    },
    null,
    { whitelist: ["regularScripts"] },
)

const persistConfig = {
    key: "scripts",
    whitelist: ["regularScripts", "readOnlyScripts"],
    transforms: [LocalScriptTransform],
    storage,
}

export default persistReducer<ScriptsState>(persistConfig, scriptsSlice.reducer)
export const {
    setRegularScripts,
    resetRegularScripts,
    setSharedScripts,
    resetSharedScripts,
    addReadOnlyScript,
    removeReadOnlyScript,
    resetReadOnlyScripts,
    setSearchText,
    setShowDeleted,
    addFilterItem,
    removeFilterItem,
    resetFilter,
    setSorter,
    setFeatureSharedScript,
    setDropdownMenu,
    resetDropdownMenu,
    setSharedScriptInfo,
    resetSharedScriptInfo,
    setScriptSource,
    setScriptDescription,
    setScriptName,
    setScriptLicense,
    setScriptCollaborators,
} = scriptsSlice.actions

// === Thunks ===

const encloseScripts = (scriptsData: any): Script[] => {
    if (scriptsData === null) {
        return []
    } else if (scriptsData.scripts instanceof Array) {
        return scriptsData.scripts
    } else {
        return [scriptsData.scripts]
    }
}

const formatDate = (script: Script) => {
    // Overwriting the date format for no good reason.
    // TODO: save script API should accommodate UTC format, etc.
    script.created = dayjs(script.created).valueOf()
    script.modified = dayjs(script.modified).valueOf()
}

const removeUnusedFields = (script: Script) => {
    script.id && delete script.id
    script.file_location && delete script.file_location
}

const setCollaborators = (script: Script, username: string | null = null) => {
    if (script.collaborators === undefined) {
        script.collaborators = []
    } else if (typeof script.collaborators === "string") {
        script.collaborators = [script.collaborators]
    }

    const collaborators = script.collaborators as string[]

    // Provide username for the shared script browser.
    if (username) {
        if (!!collaborators.length && collaborators.map(v => v.toLowerCase()).includes(username.toLowerCase())) {
            script.collaborative = true
            script.readonly = false
        } else {
            script.collaborative = false
            script.readonly = true
        }
    } else {
        // For regular (aka "my") script browser.
        script.collaborative = !!collaborators.length
    }
}

export const getRegularScripts = createAsyncThunk<void, { username: string, password: string}, ThunkAPI>(
    "scripts/getRegularScripts",
    async ({ username, password }, { dispatch }) => {
        const endPoint = URL_DOMAIN + "/services/scripts/findall"
        const payload = new FormData()
        payload.append("username", username)
        payload.append("password", btoa(password))

        try {
            const response = await fetch(endPoint, {
                method: "POST",
                body: payload,
            })
            const data = await response.json()
            const scriptList = encloseScripts(data)

            // Mutating each script's data...
            scriptList.forEach((script: Script) => {
                script.saved = true
                script.tooltipText = "" // For dirty tabs. Probably redundant.
                removeUnusedFields(script)
                formatDate(script)
                setCollaborators(script)
            })
            dispatch(setRegularScripts(fromEntries(scriptList.map(script => [script.shareid, script]))))
        } catch (error) {
            // TODO: Log error in user report. Should we also display the error to the user?
            console.log(error)
        }
    },
)

export const getSharedScripts = createAsyncThunk<void, { username: string, password: string}, ThunkAPI>(
    "scripts/getSharedScripts",
    async ({ username, password }, { dispatch }) => {
        const endPoint = URL_DOMAIN + "/services/scripts/getsharedscripts"
        const payload = new FormData()
        payload.append("username", username)
        payload.append("password", btoa(password))

        try {
            const response = await fetch(endPoint, {
                method: "POST",
                body: payload,
            })
            const data = await response.json()
            const scriptList = encloseScripts(data)

            scriptList.forEach((script: Script) => {
                script.saved = true
                script.tooltipText = "" // For dirty tabs. Probably redundant.
                script.isShared = true // TODO: Call it shared.
                removeUnusedFields(script)
                formatDate(script)
                setCollaborators(script, username)
            })
            dispatch(setRegularScripts(fromEntries(scriptList.map(script => [script.shareid, script]))))
        } catch (error) {
            console.log(error)
        }
    },
)

export const resetDropdownMenuAsync = createAsyncThunk<void, void, ThunkAPI>(
    "scripts/resetDropdownMenuAsync",
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetDropdownMenu()), 0)
    },
)

export const resetSharedScriptInfoAsync = createAsyncThunk<void, void, ThunkAPI>(
    "scripts/resetSharedScriptInfoAsync",
    (_, { dispatch }) => {
        setTimeout(() => dispatch(resetSharedScriptInfo()), 0)
    },
)

// === Selectors ===

export const selectRegularScripts = (state: RootState) => state.scripts.regularScripts
export const selectSharedScripts = (state: RootState) => state.scripts.sharedScripts
export const selectReadOnlyScripts = (state: RootState) => state.scripts.readOnlyScripts

// TODO: Move to ESUtils or use a polyfill... this is duplicated inline in various other modules.
function fromEntries<V>(iterable: [string, V][]) {
    return [...iterable].reduce((obj, [key, val]) => {
        obj[key] = val
        return obj
    }, {} as { [key: string]: V })
}

export const selectActiveScripts = createSelector(
    [selectRegularScripts],
    (scripts) => fromEntries(Object.entries(scripts).filter(([k, v]) => ![true, "1"].includes(v.soft_delete as any)))
)
export const selectActiveScriptIDs = createSelector(
    [selectActiveScripts],
    (scripts) => Object.keys(scripts)
)

export const selectDeletedScripts = createSelector(
    [selectRegularScripts],
    (scripts) => fromEntries(Object.entries(scripts).filter(([k, v]) => [true, "1"].includes(v.soft_delete as any)))
)
export const selectDeletedScriptIDs = createSelector(
    [selectDeletedScripts],
    (scripts) => Object.keys(scripts)
)
export const selectAllScripts = createSelector(
    [selectRegularScripts, selectSharedScripts, selectReadOnlyScripts],
    (regularScripts, sharedScripts, readOnlyScripts) => Object.assign({}, regularScripts, sharedScripts, readOnlyScripts)
)

export const selectFilters = (state: RootState) => state.scripts.filters
export const selectSearchText = (state: RootState) => state.scripts.filters.searchText
export const selectShowDeleted = (state: RootState) => state.scripts.filters.showDeleted
export const selectSortByAttribute = (state: RootState) => state.scripts.filters.sortBy.attribute
export const selectSortByAscending = (state: RootState) => state.scripts.filters.sortBy.ascending

const applyFilters = (scripts: Scripts, filters: AllFilters) => {
    const term = filters.searchText.toLowerCase()
    const extensions = {
        Python: "py",
        JavaScript: "js",
    }
    return fromEntries(Object.entries(scripts).filter(([k, v]) => {
        const field = `${v.name.toLowerCase()}${v.username ? v.username.toLowerCase() : ""}`
        const types = filters.types.map(a => extensions[a as "Python"|"JavaScript"])
        return (term.length ? field.includes(term) : true)
            && (filters.owners.length ? filters.owners.includes(v.username) : true)
            && (filters.types.length ? types.includes(v.name.slice(-2)) : true)
    }))
}

const sortScriptIDs = (scripts: Scripts, sortBy: SortByAttribute, ascending: boolean) => {
    const lexicalSortOptions = {
        numeric: true,
        sensitivity: "base",
    }
    return Object.values(scripts).sort((a, b) => {
        let c:any, d:any
        if (sortBy === "A-Z") {
            c = a.name
            d = b.name

            return ascending
                ? c.localeCompare(d, undefined, lexicalSortOptions)
                : d.localeCompare(c, undefined, lexicalSortOptions)
        } else {
            c = a.modified
            d = b.modified
            return ascending ? c - d : d - c
        }
    }).map(v => v.shareid)
}

export const selectFilteredActiveScripts = createSelector(
    [selectActiveScripts, selectFilters],
    applyFilters
)
export const selectFilteredSharedScripts = createSelector(
    [selectSharedScripts, selectFilters],
    applyFilters
)
export const selectFilteredDeletedScripts = createSelector(
    [selectDeletedScripts, selectFilters],
    applyFilters
)

export const selectFilteredActiveScriptIDs = createSelector(
    [selectFilteredActiveScripts, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
)
export const selectFilteredSharedScriptIDs = createSelector(
    [selectFilteredSharedScripts, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
)
export const selectFilteredDeletedScriptIDs = createSelector(
    [selectFilteredDeletedScripts, selectSortByAttribute, selectSortByAscending],
    sortScriptIDs
)

export const selectFeatureSharedScript = (state: RootState) => state.scripts.featureSharedScript
export const selectShowDropdownMenu = (state: RootState) => state.scripts.dropdownMenu.show
export const selectDropdownMenuScript = (state: RootState) => state.scripts.dropdownMenu.script
export const selectDropdownMenuType = (state: RootState) => state.scripts.dropdownMenu.type
export const selectDropdownMenuContext = (state: RootState) => state.scripts.dropdownMenu.context

// TODO: Unsaved scripts should probably be tracked in the editor or tab state.
export const selectUnsavedDropdownMenuScript = createSelector(
    [selectDropdownMenuScript, selectDropdownMenuType, selectRegularScripts, selectSharedScripts, selectReadOnlyScripts],
    (script, type, regularScripts, sharedScripts, readOnlyScripts) => {
        if (!script) {
            return null
        }
        return type === "regular" && regularScripts[script.shareid]
            || type === "shared" && sharedScripts[script.shareid]
            || type === "readonly" && readOnlyScripts[script.shareid] || null
    },
)

export const selectShowSharedScriptInfo = (state: RootState) => state.scripts.sharedScriptInfo.show
export const selectSharedInfoScript = (state: RootState) => state.scripts.sharedScriptInfo.script

export const selectAllScriptOwners = createSelector(
    [selectUserName, selectSharedScripts],
    (userName, sharedScripts): any[] => {
        // TODO: Refactor to return string[].
        return [userName, ...new Set(Object.values(sharedScripts).map(script => script.username))]
    },
)

export const selectNumOwnersSelected = (state: RootState) => state.scripts.filters.owners.length
export const selectNumTypesSelected = (state: RootState) => state.scripts.filters.types.length
