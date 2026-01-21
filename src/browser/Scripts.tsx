import React, { ChangeEvent, MouseEvent, useState } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"

import { FixedSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"

import type { Script, ScriptType } from "common"
import * as appState from "../app/appState"
import * as scripts from "./scriptsState"
import * as scriptsThunks from "./scriptsThunks"
import * as tabs from "../ide/tabState"
import { setActiveTabAndEditor } from "../ide/tabThunks"
import * as user from "../user/userState"

import { Collection, HeadlessMultiSelector, SearchBar } from "./Utils"
import { ScriptDropdownMenu } from "./ScriptsMenus"
import { BrowserTabType } from "./BrowserTab"
import { useTranslation } from "react-i18next"
import * as cai from "../cai/caiState"
import * as caiThunks from "../cai/caiThunks"
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import { useEffect } from "react"
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react'

import { Fragment } from "react"
import { usePopper } from "react-popper"

// TODO: Consider passing these down as React props or dispatching via Redux.
export const callbacks = {
    create: () => {},
    share: (_: Script) => {},
    download: (_: Script) => {},
}

const CreateScriptButton = () => {
    const { t } = useTranslation()
    return (
        <button className="flex items-center rounded-full px-2 bg-black text-white cursor-pointer" onClick={callbacks.create} title={t("scriptCreator.title")} aria-label={t("scriptCreator.title")} data-test="newScript" >
            <i className="icon icon-plus2 text-xs mr-1" />
            <div className="text-sm">
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
    const props = { id: "scriptSearchBar", searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

interface FilterItemProps {
  value?: string           // the item value
  isClearItem?: boolean    // true for the "clear filters" option
  active: boolean          // passed from Headless UI
  selected?: boolean       // passed from Headless UI
}

export const FilterItem = ({ value, isClearItem = false, active, selected = false }: FilterItemProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={`flex items-center pr-5 select-none
        ${active ? "bg-blue-200 dark:bg-blue-500" : ""}
      `}
    >
      <div className="w-5" aria-hidden>
        <i className={`icon-checkmark3 ${selected ? "block" : "hidden"}`} />
      </div>

      <div className="text-sm">
        {isClearItem ? t("clear") : value}
      </div>
    </div>
  )
}

export const SORT_OPTIONS = [
  { id: "date-desc", label: "Date (Newest)", attribute: "date", ascending: false },
  { id: "date-asc", label: "Date (Oldest)", attribute: "date", ascending: true },
  { id: "name-az", label: "A–Z", attribute: "name", ascending: true },
  { id: "name-za", label: "Z–A", attribute: "name", ascending: false },
] as const

export const SortBySelector = () => {
  const theme = useSelector(appState.selectColorTheme)
  const dispatch = useDispatch()
  const sortBy = useSelector((state: any) => state.scripts.filters.sortBy)

  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    modifiers: [{ name: "offset", options: { offset: [0, 6] } }],
  })

  // Local state for the selected option
  const [selectedId, setSelectedId] = useState<string>(
    SORT_OPTIONS.find(
      (o) => o.attribute === sortBy.attribute && o.ascending === sortBy.ascending
    )?.id ?? SORT_OPTIONS[0].id
  )

  // Sync local state if Redux sortBy changes externally
  useEffect(() => {
    const currentId =
      SORT_OPTIONS.find(
        (o) => o.attribute === sortBy.attribute && o.ascending === sortBy.ascending
      )?.id ?? SORT_OPTIONS[0].id
    setSelectedId(currentId)
  }, [sortBy.attribute, sortBy.ascending])

  return (
    <Listbox
      value={selectedId}
      onChange={(id: string) => {
        const option = SORT_OPTIONS.find((o) => o.id === id)
        if (!option) return
        setSelectedId(id)
        dispatch(scripts.setSortBy({ attribute: option.attribute, ascending: option.ascending }))
      }}
    >
      <div className="relative w-1/3 ml-2">
        <ListboxButton
          ref={(el) => setReferenceElement(el as HTMLButtonElement | null)}
          className={`flex justify-between w-full border-b-2 cursor-pointer select-none ${
            theme === "light" ? "border-black" : "border-white"
          }`}
          aria-label="Sort by"
        >
          <span className="truncate">
            Sort by
          </span>
          <i className="icon icon-arrow-down2 text-xs p-1" />
        </ListboxButton>

        <ListboxOptions
          ref={(el) => setPopperElement(el as HTMLDivElement | null)}
          style={styles.popper}
          {...attributes.popper}
          className={`border p-2 z-50 focus:outline-none ${
            theme === "light" ? "bg-white" : "bg-black"
          }`}
        >
          {SORT_OPTIONS.map((option) => (
            <ListboxOption key={option.id} value={option.id} as={Fragment}>
              {({ active, selected }) => (
                <div
                  className={`flex items-center px-2 py-1 cursor-pointer select-none ${
                    active ? "bg-blue-200 dark:bg-blue-500" : ""
                  }`}
                >
                  <div className="w-5" aria-hidden>
                    <i className={`icon-checkmark3 ${selected ? "block" : "hidden"}`} />
                  </div>
                  <div className="text-sm">{option.label}</div>
                </div>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}


const Filters = () => {
    const owners = useSelector(scripts.selectAllScriptOwners)
    const numOwnersSelected = useSelector(scripts.selectNumOwnersSelected)
    const numTypesSelected = useSelector(scripts.selectNumTypesSelected)
    const { t } = useTranslation()

    return (
        <div className="p-3">
            <div className="pb-2 text-xs">{t("filter").toLocaleUpperCase()}</div>
            <div className="flex justify-between">
                <HeadlessMultiSelector
                    title={t("scriptBrowser.filterDropdown.owner")}
                    category="owners"
                    items={owners}
                    aria={t("scriptBrowser.filterDropdown.owner")}
                    numSelected={numOwnersSelected}
                    position="left"
                    FilterItem={FilterItem}
                />
                <HeadlessMultiSelector
                    title={t("scriptBrowser.filterDropdown.fileType")}
                    category="types"
                    aria={t("scriptBrowser.filterDropdown.fileType")}
                    items={["Python", "JavaScript"]}
                    numSelected={numTypesSelected}
                    position="center"
                    FilterItem={FilterItem}
                />
                <SortBySelector/>
            </div>
        </div>
    )
}

const ShowDeletedScripts = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    return (
        <div className="flex items-center">
            <div className="pr-1.5">
                <input
                    type="checkbox"
                    aria-label={t("scriptBrowser.showDeleted")}
                    title={t("scriptBrowser.showDeleted")}
                    role="checkbox"
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement
                        dispatch(scripts.setShowDeleted(elem.checked))
                    }}
                />
            </div>
            <div className="pr-1 text-sm">
                {t("scriptBrowser.showDeleted")}
            </div>
        </div>
    )
}

const PillButton = ({ script, fn, aria, icon, children }: { script: Script, fn: (_: Script) => void, aria: string, icon: string, children?: React.ReactNode }) => {
    const { t } = useTranslation()
    const descriptor = t(aria, { scriptname: script.name })
    return <button
        className="flex items-center space-x-2 border border-gray-800 rounded-full px-2 py-1 text-sm bg-white dark:bg-gray-900 hover:bg-blue-100 dark:hover:bg-blue-500"
        onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            fn(script)
        }}
        aria-label={descriptor}
        title={descriptor}
    >
        <i className={icon} />
        {children}
    </button>
}

const DownloadButton = ({ script }: { script: Script }) =>
    <PillButton script={script} fn={callbacks.download} aria="ariaDescriptors:scriptBrowser.download" icon="icon-cloud-download" />

const ShareButton = ({ script }: { script: Script }) =>
    <PillButton script={script} fn={callbacks.share} aria="ariaDescriptors:scriptBrowser.share" icon="icon-share32" />

const RestoreButton = ({ script }: { script: Script }) => {
    const { t } = useTranslation()
    return <PillButton script={script} fn={scriptsThunks.restoreScript} aria="ariaDescriptors:scriptBrowser.restore" icon="icon-rotate-cw2">
        <div>{t("scriptBrowser.restore")}</div>
    </PillButton>
}

const SharedScriptInfoItem = ({ title, body }: { title: string, body: string }) => {
    return (
        <div className={`px-4 py-3 ${body ? "block" : "hidden"}`}>
            <div className="font-semibold text-gray-600 dark:text-gray-500">{title}</div>
            <div className="break-words">{body}</div>
        </div>
    )
}

const SharedScriptInfoButton = ({ script }: { script: Script }) => {
    const { t } = useTranslation()

    return (
        <Popover className="">
            <PopoverButton><i className="icon-info text-lg align-middle" /></PopoverButton>
            <PopoverPanel anchor="bottom start" className="border border-black p-2 z-50 bg-white dark:bg-black">
                {script && (<>
                    <SharedScriptInfoItem
                        title={script.name}
                        body="Shared Script"
                    />
                    <SharedScriptInfoItem
                        title={t("sharedScript.originalAuthor")}
                        body={script.username}
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
            </PopoverPanel>
        </Popover>
    )
}

const ScriptEntry = ({ script, type }: { script: Script, type: ScriptType }) => {
    const dispatch = useDispatch()
    const open = useSelector(tabs.selectOpenTabs).includes(script.shareid)
    const active = useSelector(tabs.selectActiveTabID) === script.shareid
    const modified = useSelector(tabs.selectModifiedScripts).includes(script.shareid)
    const tabIndicator = (open || active) ? (active ? (modified ? "border-red-600" : "border-green-400") : (modified ? "border-red-400" : "border-green-300") + " opacity-80") : "opacity-0"
    const loggedIn = useSelector(user.selectLoggedIn)
    const highlight = useSelector(cai.selectHighlight).id === script.shareid
    const { t } = useTranslation()

    // Note: Circumvents the issue with ShareButton where it did not reference unsaved scripts opened in editor tabs.

    const shared = script.creator || script.isShared
    const ariaLabel = type === "deleted" ? "" : t("scriptBrowser.openInEditor", { name: script.name })
    return (
        <div
            className={`flex flex-row justify-start border-t border-b border-r border-gray-500 dark:border-gray-700 ${type === "deleted" ? "" : "cursor-pointer"}`}
            onClick={() => {
                if (type === "regular") {
                    dispatch(setActiveTabAndEditor(script.shareid))
                } else if (type === "shared") {
                    dispatch(setActiveTabAndEditor(script.shareid))
                }
                if (highlight) {
                    dispatch(caiThunks.highlight({ zone: null }))
                }
            }}
            title={ariaLabel}
            aria-label={ariaLabel}
        >
            <div className={`h-auto border-l-4 ${tabIndicator}`} />
            <div
                className="flex grow truncate px-2 text-sm"
            >
                <div className="h-11 flex grow items-center truncate justify-between">
                    <div className="flex justify-start items-center truncate font-medium space-x-2">
                        <div className="truncate">
                            {script.name}
                        </div>
                        <div className="pr-4 space-x-2">
                            {shared && (<i className="icon-copy3 align-middle" title={t("scriptBrowser.shared.sharedBy", { username: script.creator ?? script.username })} />)}
                        </div>
                    </div>

                    {(type === "regular" || type === "shared") && <div className="flex flex-column items-center space-x-2">
                        {type === "regular" && <DownloadButton script={script} />}
                        {type === "regular" && loggedIn && (<ShareButton script={script} />)}
                        {type === "shared" && <SharedScriptInfoButton script={script} />}
                        <ScriptDropdownMenu script={script} scriptType={type} menuType="buttonmenu"/>
                    </div>}

                    <div className={`${type === "deleted" ? "flex" : "hidden"} flex-column items-center space-x-2`}>
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
            {({ height, width }: { height: number, width: number }) => (
                <List
                    height={height}
                    width={width}
                    itemCount={scriptIDs.length}
                    itemSize={44}
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

            <div className="flex justify-between px-3 pb-1.5 mb-2">
                <ShowDeletedScripts />
                <CreateScriptButton />
            </div>

            <div className="h-full flex flex-col justify-start" role="tabpanel" id={"panel-" + BrowserTabType.Script}>
                <RegularScriptCollection />
                <SharedScriptCollection />
                <DeletedScriptCollection />
            </div>
        </>
    )
}
