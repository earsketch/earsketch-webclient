import React, { useState, useEffect, LegacyRef, ChangeEvent, MouseEvent } from "react"
import { useSelector, useDispatch } from "react-redux"

import { FixedSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { usePopper } from "react-popper"

import { Script, ScriptType } from "common"
import { createScript } from "../ide/IDE"
import * as scripts from "./scriptsState"
import * as tabs from "../ide/tabState"
import * as appState from "../app/appState"
import * as user from "../user/userState"
import * as userProject from "../app/userProject"
import { RootState } from "../reducers"

import { SearchBar, Collection, DropdownMultiSelector } from "./Browser"
import { DropdownMenuCaller, generateGetBoundingClientRect, VirtualRef, shareScript, VirtualReference } from "./ScriptsMenus"
import { useTranslation } from "react-i18next"

const CreateScriptButton = () => {
    const { t } = useTranslation()
    return (
        <button className="flex items-center rounded-full py-1 bg-black text-white cursor-pointer" onClick={createScript} title={t("scriptCreator.title")} aria-label={t("scriptCreator.title")} >
            <div className="align-middle rounded-full bg-white text-black p-1 ml-2 mr-3 text-sm">
                <i className="icon icon-plus2" />
            </div>
            <div className="mr-3">
                {t("newScript")}
            </div>
        </button>
    )
}

const ScriptSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(scripts.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(scripts.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(scripts.setSearchText(""))
    const props = { searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

const FilterItem = ({ category, value, isClearItem }: { category: keyof scripts.Filters, value: string, isClearItem: boolean }) => {
    const selected = isClearItem ? false : useSelector((state: RootState) => state.scripts.filters[category].includes(value))
    const dispatch = useDispatch()
    const { t } = useTranslation()
    return (
        <>
            <div
                className="flex justify-left items-center cursor-pointer pr-8 bg-white hover:bg-blue-200 dark:bg-black dark:hover:bg-blue-500"
                onClick={() => {
                    if (isClearItem) {
                        dispatch(scripts.resetFilter(category))
                    } else {
                        if (selected) dispatch(scripts.removeFilterItem({ category, value }))
                        else dispatch(scripts.addFilterItem({ category, value }))
                    }
                }}
                aria-selected={selected}
            >
                <div className="w-8">
                    <i className={`glyphicon glyphicon-ok ${selected ? "block" : "hidden"}`}/>
                </div>
                <div className="select-none">
                    {isClearItem ? t("clear") : value}
                </div>
            </div>
            {isClearItem && <hr className="border-1 my-2 border-black dark:border-white" />}
        </>
    )
}

const SortOptionsItem = ({ value, isClearItem }: { value: scripts.SortByAttribute, isClearItem: boolean }) => {
    const selected = isClearItem ? false : useSelector(scripts.selectSortByAttribute) === value
    const ascending = useSelector(scripts.selectSortByAscending)
    const dispatch = useDispatch()

    if (isClearItem) return null

    return (
        <div
            className="flex justify-left items-center cursor-pointer pr-8 bg-white hover:bg-blue-200 dark:bg-black dark:hover:bg-blue-500"
            onClick={() => {
                dispatch(scripts.setSorter(value))
            }}
            aria-label={value}
            title={value}
        >
            <div className="w-8">
                <i className={`icon ${ascending ? "icon-arrow-up" : "icon-arrow-down"} ${selected ? "block" : "hidden"}`} />
            </div>
            <div className="select-none">
                {value}
            </div>
        </div>
    )
}

const Filters = () => {
    const owners = useSelector(scripts.selectAllScriptOwners)
    const numOwnersSelected = useSelector(scripts.selectNumOwnersSelected)
    const numTypesSelected = useSelector(scripts.selectNumTypesSelected)
    const { t } = useTranslation()

    return (
        <div className="p-3">
            <div className="pb-2 text-lg">{t("filter").toLocaleUpperCase()}</div>
            <div className="flex justify-between">
                <DropdownMultiSelector
                    title={t("scriptBrowser.filterDropdown.owner")}
                    category="owners"
                    items={owners}
                    aria={t("scriptBrowser.filterDropdown.owner")}
                    numSelected={numOwnersSelected}
                    position="left"
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title={t("scriptBrowser.filterDropdown.fileType")}
                    category="types"
                    aria={t("scriptBrowser.filterDropdown.fileType")}
                    items={["Python", "JavaScript"]}
                    numSelected={numTypesSelected}
                    position="center"
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title={t("scriptBrowser.filterDropdown.sortBy")}
                    category="sortBy"
                    aria={t("scriptBrowser.filterDropdown.sortBy")}
                    items={["Date", "A-Z"]}
                    position="right"
                    FilterItem={SortOptionsItem}
                />
            </div>
        </div>
    )
}

const ShowDeletedScripts = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    return (
        <div className="flex items-center">
            <div className="pr-2">
                <input
                    type="checkbox"
                    aria-label={t("scriptBrowser.showDeleted")}
                    title={t("scriptBrowser.showDeleted")}
                    role="checkbox"
                    style={{ margin: 0 }}
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement
                        dispatch(scripts.setShowDeleted(elem.checked))
                    }}
                />
            </div>
            <div className="pr-1">
                {t("scriptBrowser.showDeleted")}
            </div>
        </div>
    )
}

const PillButton = ({ onClick, children, aria }: { onClick: Function, children: React.ReactNode, aria: string }) => {
    return (
        <button
            className="flex items-center space-x-2 border border-gray-800 rounded-full px-4 py-1 bg-white dark:bg-gray-900 hover:bg-blue-100 dark:hover:bg-blue-500"
            onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onClick?.()
            }}
            aria-label={aria}
            title={aria}
        >
            {children}
        </button>
    )
}

const ShareButton = ({ script }: { script: Script }) => {
    const { t } = useTranslation()
    return (
        <PillButton onClick={() => shareScript(script)} aria={t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name })}>
            <i className="icon-share32" />
            <div>{t("script.share")}</div>
        </PillButton>
    )
}

const RestoreButton = ({ script }: { script: Script }) => {
    const { t } = useTranslation()
    return (
        <PillButton onClick={() => userProject.restoreScript(Object.assign({}, script))} aria={t("ariaDescriptors:scriptBrowser.restore", { scriptname: script.name })}>
            <i className="icon-rotate-cw2"/>
            <div>{t("scriptBrowser.restore")}</div>
        </PillButton>
    )
}

const sharedInfoPanelVirtualRef = new VirtualRef() as VirtualReference

const SharedScriptInfoItem = ({ title, body }: { title: string, body: string }) => {
    const theme = useSelector(appState.selectColorTheme)

    return (
        <div className={`px-4 py-3 ${body ? "block" : "hidden"}`}>
            <div className={`font-semibold ${theme === "light" ? "text-gray-600" : "text-gray-500"}`}>{title}</div>
            <div className="break-words">{body}</div>
        </div>
    )
}

const SingletonSharedScriptInfo = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const showSharedScriptInfo = useSelector(scripts.selectShowSharedScriptInfo)
    const script = useSelector(scripts.selectSharedInfoScript)

    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null)
    const { styles, attributes, update } = usePopper(sharedInfoPanelVirtualRef, popperElement)
    sharedInfoPanelVirtualRef.updatePopper = update

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync = (event: Event & { target: HTMLElement }) => {
        setPopperElement(ref => {
            if (!ref?.contains(event.target)) {
                dispatch(scripts.resetSharedScriptInfoAsync())
            }
            return ref
        })
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClickAsync)
        return () => document.removeEventListener("mousedown", handleClickAsync)
    }, [])

    return (
        <div
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showSharedScriptInfo ? styles.popper : { display: "none" }}
            {...attributes.popper}
            className="border border-black p-2 z-50 bg-white dark:bg-black"
        >
            <i
                className="icon-cross2 absolute top-0 right-0 p-4 align-middle cursor-pointer text-black dark:text-gray-200"
                onClick={() => {
                    dispatch(scripts.resetSharedScriptInfo())
                }}
            />
            {script && (<>
                <SharedScriptInfoItem
                    title={script.name}
                    body={script.description?.length
                        ? script.description
                        : t("sharedScript.noDescription")}
                />
                <SharedScriptInfoItem
                    title={t("sharedScript.originalAuthor")}
                    body={script.username}
                />
                <SharedScriptInfoItem
                    title={t("sharedScript.collaborators")}
                    body={script.collaborative ? script.collaborators.join(", ") : ""}
                />
                <SharedScriptInfoItem
                    title={t("sharedScript.license")}
                    body={script.licenseInfo}
                />
                <SharedScriptInfoItem
                    title={t("lastModified")}
                    body={script.modified as string}
                />
                <SharedScriptInfoItem
                    title={t("sharedScript.viewOnlyLink")}
                    body={`${SITE_BASE_URI}?sharing=${script.shareid}`}
                />
            </>)}
        </div>
    )
}

const SharedScriptInfoCaller = ({ script }: { script: Script }) => {
    const dispatch = useDispatch()

    return (
        <div
            onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                sharedInfoPanelVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY)
                sharedInfoPanelVirtualRef.updatePopper?.()
                dispatch(scripts.setSharedScriptInfo({ script }))
            }}
        >
            <i className="icon-info text-3xl align-middle" />
        </div>
    )
}

const ScriptEntry = ({ script, type }: { script: Script, type: ScriptType }) => {
    const dispatch = useDispatch()
    const open = useSelector(tabs.selectOpenTabs).includes(script.shareid)
    const active = useSelector(tabs.selectActiveTabID) === script.shareid
    const modified = useSelector(tabs.selectModifiedScripts).includes(script.shareid)
    const tabIndicator = (open || active) ? (active ? (modified ? "border-red-600" : "border-green-400") : (modified ? "border-red-400" : "border-green-300") + " opacity-80") : "opacity-0"
    const loggedIn = useSelector(user.selectLoggedIn)
    const { t } = useTranslation()

    // Note: Circumvents the issue with ShareButton where it did not reference unsaved scripts opened in editor tabs.

    const shared = script.creator || script.isShared
    const collaborators = script.collaborators as string[]
    const ariaLabel = type === "deleted" ? "" : t("scriptBrowser.openInEditor", { name: script.name })
    return (
        <div
            className={`flex flex-row justify-start border-t border-b border-r border-gray-500 dark:border-gray-700 ${type === "deleted" ? "" : "cursor-pointer"}`}
            onClick={() => {
                if (type === "regular") {
                    dispatch(tabs.setActiveTabAndEditor(script.shareid))
                } else if (type === "shared") {
                    dispatch(tabs.setActiveTabAndEditor(script.shareid))
                }
            }}
            title={ariaLabel}
            aria-label={ariaLabel}
        >
            <div className={`h-auto border-l-4 ${tabIndicator}`} />
            <div
                className="flex flex-grow truncate p-3"
            >
                <div className="h-12 flex flex-grow items-center truncate justify-between">
                    <div className="flex justify-start items-center truncate font-medium space-x-2">
                        <div className="truncate">
                            {script.name}
                        </div>
                        <div className="pr-4 space-x-2">
                            {(shared && !script.collaborative) && (<i className="icon-copy3 align-middle" title={`Shared by ${script.creator ?? script.username}`} />)}
                            {script.collaborative && (<i className="icon-users4 align-middle" title={`Shared with ${collaborators.join(", ")}`} />)}
                        </div>
                    </div>
                    <div className={`${type === "regular" ? "flex" : "hidden"} flex-column items-center space-x-4`}>
                        {loggedIn && (<ShareButton script={script} />)}
                        <DropdownMenuCaller script={script} type="regular" />
                    </div>
                    <div className={`${type === "shared" ? "flex" : "hidden"} flex-column items-center space-x-4`}>
                        <SharedScriptInfoCaller script={script} />
                        <DropdownMenuCaller script={script} type="shared" />
                    </div>
                    <div className={`${type === "deleted" ? "flex" : "hidden"} flex-column items-center space-x-4`}>
                        <RestoreButton script={script} />
                    </div>
                </div>
            </div>
        </div>
    )
}

interface WindowedScriptCollectionProps {
    title: string
    entities: scripts.Scripts
    scriptIDs: string[]
    type: ScriptType
    visible?: boolean
    initExpanded?: boolean
}
const WindowedScriptCollection = ({ title, entities, scriptIDs, type, visible = true, initExpanded = true }: WindowedScriptCollectionProps) => (
    <Collection
        title={title}
        visible={visible}
        initExpanded={initExpanded}
    >
        <AutoSizer>
            {({ height, width }) => (
                <List
                    height={height}
                    width={width}
                    itemCount={scriptIDs.length}
                    itemSize={45}
                >
                    {({ index, style }) => {
                        const ID = scriptIDs[index]
                        return (
                            <div style={style}
                                className={index % 2 === 0
                                    ? "bg-white dark:bg-gray-900"
                                    : "bg-gray-300 dark:bg-gray-800" +
                                    " hover:bg-blue-200 dark:hover:bg-blue-500"}>
                                <ScriptEntry key={ID} script={entities[ID]} type={type} />
                            </div>
                        )
                    }}
                </List>
            )}
        </AutoSizer>
    </Collection>
)

const RegularScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredActiveScripts)
    const scriptIDs = useSelector(scripts.selectFilteredActiveScriptIDs)
    const numScripts = useSelector(scripts.selectActiveScriptIDs).length
    const { t } = useTranslation()
    const numFilteredScripts = scriptIDs.length
    const filtered = numFilteredScripts !== numScripts
    const type: ScriptType = "regular"
    const title = `${t("scriptBrowser.myScripts").toLocaleUpperCase()} (${filtered ? numFilteredScripts + "/" : ""}${numScripts})`
    const initExpanded = !useSelector(scripts.selectFeatureSharedScript)
    const props = { title, entities, scriptIDs, type, initExpanded }
    return <WindowedScriptCollection {...props} />
}

const SharedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredSharedScripts)
    const scriptIDs = useSelector(scripts.selectFilteredSharedScriptIDs)
    const numScripts = Object.keys(useSelector(scripts.selectSharedScripts)).length
    const { t } = useTranslation()
    const numFilteredScripts = scriptIDs.length
    const filtered = numFilteredScripts !== numScripts
    const title = `${t("scriptBrowser.sharedScripts").toLocaleUpperCase()} (${filtered ? numFilteredScripts + "/" : ""}${numScripts})`
    const type: ScriptType = "shared"
    const initExpanded = useSelector(scripts.selectFeatureSharedScript)
    const props = { title, entities, scriptIDs, type, initExpanded }
    return <WindowedScriptCollection {...props} />
}

const DeletedScriptCollection = () => {
    const entities = useSelector(scripts.selectFilteredDeletedScripts)
    const scriptIDs = useSelector(scripts.selectFilteredDeletedScriptIDs)
    const numScripts = useSelector(scripts.selectDeletedScriptIDs).length
    const { t } = useTranslation()
    const numFilteredScripts = scriptIDs.length
    const filtered = numFilteredScripts !== numScripts
    const title = `${t("scriptBrowser.deletedscripts").toLocaleUpperCase()} (${filtered ? numFilteredScripts + "/" : ""}${numScripts})`
    const type: ScriptType = "deleted"
    const visible = useSelector(scripts.selectShowDeleted)
    const initExpanded = false
    const props = { title, entities, scriptIDs, type, visible, initExpanded }
    return <WindowedScriptCollection {...props} />
}

export const ScriptBrowser = () => {
    return (
        <>
            <ScriptSearchBar />
            <Filters />

            <div className="flex justify-between p-3 mb-2">
                <ShowDeletedScripts />
                <CreateScriptButton />
            </div>

            <div className="h-full flex flex-col justify-start">
                <RegularScriptCollection />
                <SharedScriptCollection />
                <DeletedScriptCollection />
            </div>

            <SingletonSharedScriptInfo />
        </>
    )
}
