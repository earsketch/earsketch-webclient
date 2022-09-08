import React, { useRef, useEffect, ChangeEvent, MouseEvent, useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import { VariableSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import classNames from "classnames"

import { reloadRecommendations } from "../app/reloadRecommender"
import { addUIClick } from "../cai/student"
import * as sounds from "./soundsState"
import * as soundsThunks from "./soundsThunks"
import * as appState from "../app/appState"
import * as editor from "../ide/Editor"
import * as user from "../user/userState"
import * as tabs from "../ide/tabState"
import type { RootState } from "../reducers"
import type { SoundEntity } from "common"
import { BrowserTabType } from "./BrowserTab"

import { SearchBar } from "./Utils"
import { Disclosure } from "@headlessui/react"

// TODO: Consider passing these down as React props or dispatching via Redux.
export const callbacks = {
    rename: (_: SoundEntity) => {},
    delete: (_: SoundEntity) => {},
    upload: () => {},
}

const SoundSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(sounds.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(sounds.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(sounds.setSearchText(""))
    const props = { searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

const FilterButton = ({ category, value, isClearItem, className = "" }: { category: keyof sounds.Filters, value: string, isClearItem: boolean, className?: string }) => {
    const selected = isClearItem ? false : useSelector((state: RootState) => state.sounds.filters[category].includes(value))
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const classnames = classNames({
        "rounded cursor-pointer p-1 mt-1 mr-2": true,
        "hover:bg-green-50 dark:hover:bg-green-900 hover:text-black dark:text-white": true,
        "text-gray-500 border border-gray-500": !selected,
        "bg-green-400 hover:bg-green-400 dark:bg-green-500 text-black dark:text-white": selected,
    })
    return <button
        className={classnames + " " + className}
        onClick={() => {
            if (isClearItem) {
                dispatch(sounds.resetFilter(category))
            } else {
                if (selected) dispatch(sounds.removeFilterItem({ category, value }))
                else dispatch(sounds.addFilterItem({ category, value }))
            }
            reloadRecommendations()
        }}
        title={isClearItem ? t("ariaDescriptors:sounds.clearFilter", { category }) : value}
        aria-label={isClearItem ? t("ariaDescriptors:sounds.clearFilter", { category }) : value}
        style={selected ? { borderColor: "rgb(245, 174, 60)" } : {}}
    >
        <div className="flex flex-row gap-x-1">
            <span className="rounded-full inline-flex w-1 mr-2">
                <i className={`icon-checkmark3 text-sm w-full ${selected ? "block" : "hidden"}`} />
            </span>
            <div className="text-xs select-none mr-4">
                {isClearItem ? t("clear") : value}
            </div>
        </div>
    </button>
}

interface ButtonFilterProps {
    title: string
    category: keyof sounds.Filters
    aria?: string
    items: string[]
    position: "center" | "left" | "right"
    justification: "grid" | "flex"
}

const ButtonFilterList = ({ category, items, justification }: ButtonFilterProps) => {
    const { t } = useTranslation()
    const classes = classNames({
        "flex flex-row flex-wrap": justification === "flex",
        "grid grid-cols-3 gap-2": justification === "grid",
    })
    return (
        <Disclosure>
            <Disclosure.Panel static as="div">
                {({ open }) => (
                    <div className="relative px-1.5">
                        <div className={`${classes} ${open ? "" : "h-20 overflow-hidden"}`}>
                            {items.map((item, index) => <div key={index}>
                                <FilterButton
                                    value={item}
                                    category={category}
                                    isClearItem={false}
                                    className={justification === "grid" ? "w-full" : ""}
                                />
                            </div>)}
                        </div>
                        <Disclosure.Button as="div" className={open ? "" : "absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent to-white dark:to-gray-900"}>
                            <button aria-label={open ? t("soundBrowser.collapseFilters") : t("soundBrowser.expandFilters")}
                                className={`w-full ${open ? "icon-arrow-up" : "icon-arrow-down"}`}/>
                        </Disclosure.Button>
                    </div>
                )}
            </Disclosure.Panel>
        </Disclosure>
    )
}

const Filters = () => {
    const { t } = useTranslation()
    const [currentFilterTab, setCurrentFilterTab] = useState<keyof sounds.Filters>("artists")
    const artists = useSelector(sounds.selectFilteredArtists)
    const genres = useSelector(sounds.selectFilteredGenres)
    const instruments = useSelector(sounds.selectFilteredInstruments)
    const keys = useSelector(sounds.selectFilteredKeys)
    const numArtistsSelected = useSelector(sounds.selectNumArtistsSelected)
    const numGenresSelected = useSelector(sounds.selectNumGenresSelected)
    const numInstrumentsSelected = useSelector(sounds.selectNumInstrumentsSelected)
    const numKeysSelected = useSelector(sounds.selectNumKeysSelected)
    const tabClass = classNames({
        "text-xs uppercase border-b-2 text-gray-600 dark:text-gray-300 rounded p-1 min-w-1/5 max-w-1/4": true,
        "border-gray-400": numArtistsSelected > 0 || numGenresSelected > 0 || numInstrumentsSelected > 0 || numKeysSelected > 0,
    })
    const spanClass = "absolute -top-[0.6rem] right-[-15px] inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue shadow rounded-full"

    return (
        <div>
            <div className="flex flex-row grow justify-between px-1.5 mb-0.5 mt-2 mr-2">
                <div className="flex flex-row flex-wrap">
                    <div className="relative inline-block">
                        {numArtistsSelected > 0 ? <div className={spanClass}>{numArtistsSelected}</div> : null}
                        <button className={tabClass} onClick={() => setCurrentFilterTab("artists")} style={currentFilterTab === "artists" as keyof sounds.Filters ? { color: "black", borderColor: "rgb(245, 174, 60)", background: "rgb(245, 174, 60)" } : { border: "none" }}>
                            {t("soundBrowser.filterDropdown.artists")}
                        </button>
                    </div>
                </div>
                <div className="flex flex-row flex-wrap">
                    <div className="relative inline-block">
                        {numGenresSelected > 0 ? <div className={spanClass}>{numGenresSelected}</div> : null}
                        <button className={tabClass} onClick={() => setCurrentFilterTab("genres")} style={currentFilterTab === "genres" as keyof sounds.Filters ? { color: "black", borderColor: "rgb(245, 174, 60)", background: "rgb(245, 174, 60)" } : { border: "none" }}>
                            {t("soundBrowser.filterDropdown.genres")}
                        </button>
                    </div>
                </div>
                <div className="flex flex-row flex-wrap">
                    <div className="relative inline-block">
                        {numInstrumentsSelected > 0 ? <div className={spanClass}>{numInstrumentsSelected}</div> : null}
                        <button className={tabClass} onClick={() => setCurrentFilterTab("instruments")} style={currentFilterTab === "instruments" as keyof sounds.Filters ? { color: "black", borderColor: "rgb(245, 174, 60)", background: "rgb(245, 174, 60)" } : { border: "none" }}>
                            {t("soundBrowser.filterDropdown.instruments")}
                        </button>
                    </div>
                </div>
                <div className="flex flex-row flex-wrap">
                    <div className="relative inline-block">
                        {numKeysSelected > 0 ? <div className={spanClass}>{numKeysSelected}</div> : null}
                        <button className={tabClass} onClick={() => setCurrentFilterTab("keys")} style={currentFilterTab === "keys" as keyof sounds.Filters ? { color: "black", borderColor: "rgb(245, 174, 60)", background: "rgb(245, 174, 60)" } : { border: "none" }}>
                            {t("soundBrowser.filterDropdown.keys")}
                        </button>
                    </div>
                </div>
            </div>

            {/* TODO: add an SR-only message about clicking on the buttons to filter the sounds (similar to soundtrap) */}
            {currentFilterTab === "artists" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.artists")}
                category="artists"
                aria={t("soundBrowser.clip.tooltip.artist")}
                items={artists}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "genres" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.genres")}
                category="genres"
                aria={t("soundBrowser.clip.tooltip.genre")}
                items={genres}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "instruments" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.instruments")}
                category="instruments"
                aria={t("soundBrowser.clip.tooltip.instrument")}
                items={instruments}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "keys" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.keys")}
                category="keys"
                aria={t("soundBrowser.clip.tooltip.instrument")}
                items={keys}
                position="center"
                justification="grid"
            />}
        </div>
    )
}

const NumberOfSounds = () => {
    const { t } = useTranslation()
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length

    return <div className="flex items-center text-xs">
        {t("numSounds", { count: numFiltered })}
    </div>
}

const ShowOnlyFavorites = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div className="flex items-center">
            <div className="pr-1.5">
                <input
                    type="checkbox"
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement
                        dispatch(sounds.setFilterByFavorites(elem.checked))
                    }}
                    title={t("soundBrowser.button.showOnlyStarsDescriptive")}
                    aria-label={t("soundBrowser.button.showOnlyStarsDescriptive")}
                    role="checkbox"
                />
            </div>
            <div className="pr-1 text-sm">
                {t("soundBrowser.button.showOnlyStars")}
            </div>
            <i className="icon icon-star-full2 text-orange-600" />
        </div>
    )
}

const AddSound = () => {
    const { t } = useTranslation()

    return (
        <button
            className="flex items-center rounded-full px-2 bg-black text-white cursor-pointer"
            onClick={callbacks.upload}
        >
            <i className="icon icon-plus2 text-xs mr-1" />
            <div className="text-sm">
                {t("soundBrowser.button.addSound")}
            </div>
        </button>
    )
}

const Clip = ({ clip, bgcolor }: { clip: SoundEntity, bgcolor: string }) => {
    const dispatch = useDispatch()
    const previewFileName = useSelector(sounds.selectPreviewName)
    const previewNode = useSelector(sounds.selectPreviewNode)
    const name = clip.name
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()

    let tooltip = `${t("soundBrowser.clip.tooltip.file")}: ${name}
    ${t("soundBrowser.clip.tooltip.folder")}: ${clip.folder}
    ${t("soundBrowser.clip.tooltip.artist")}: ${clip.artist}
    ${t("soundBrowser.clip.tooltip.genre")}: ${clip.genre}
    ${t("soundBrowser.clip.tooltip.instrument")}: ${clip.instrument}
    ${t("soundBrowser.clip.tooltip.originalTempo")}: ${clip.tempo}
    ${t("soundBrowser.clip.tooltip.year")}: ${clip.year}`.replace(/\n\s+/g, "\n")

    if (clip.keySignature) {
        tooltip = tooltip.concat("\n", t("soundBrowser.clip.tooltip.key"), ": ", clip.keySignature)
    }

    const loggedIn = useSelector(user.selectLoggedIn)
    const isFavorite = loggedIn && useSelector(sounds.selectFavorites).includes(name)
    const userName = useSelector(user.selectUserName) as string
    const isUserOwned = loggedIn && clip.folder === userName.toUpperCase()
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length

    return (
        <div className="flex flex-row justify-start">
            <div className="h-auto border-l-8 border-blue-300" />
            <div className={`flex grow truncate justify-between py-0.5 ${bgcolor} border ${theme === "light" ? "border-gray-300" : "border-gray-700"}`}>
                <div className="flex items-center min-w-0" title={tooltip}>
                    <span className="text-sm truncate pl-2">{name}</span>
                </div>
                <div className="pl-2 pr-4">
                    <button
                        className="text-xs pr-1.5"
                        onClick={() => { dispatch(soundsThunks.previewSound(name)); addUIClick("sound - preview") }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                    >
                        {previewFileName === name
                            ? (previewNode ? <i className="icon icon-stop2" /> : <i className="animate-spin es-spinner" />)
                            : <i className="icon icon-play4" />}
                    </button>
                    {loggedIn &&
                        (
                            <button
                                className="text-xs px-1.5"
                                onClick={() => dispatch(soundsThunks.markFavorite({ name: name, isFavorite }))}
                                title={t("soundBrowser.clip.tooltip.markFavorite")}
                            >
                                {isFavorite
                                    ? <i className="icon icon-star-full2 text-orange-600" />
                                    : <i className="icon icon-star-empty3 text-orange-600" />}
                            </button>
                        )}
                    {tabsOpen &&
                        (
                            <button
                                className="text-xs px-1.5 text-sky-700 dark:text-blue-400"
                                onClick={() => { editor.pasteCode(name); addUIClick("sample - copy") }}
                                title={t("soundBrowser.clip.tooltip.paste")}
                            >
                                <i className="icon icon-paste2" />
                            </button>
                        )}
                    {(loggedIn && isUserOwned) &&
                        (
                            <>
                                <button
                                    className="text-xs px-1.5 text-sky-700 dark:text-blue-400"
                                    onClick={() => callbacks.rename(clip)}
                                    title="Rename sound"
                                >
                                    <i className="icon icon-pencil3" />
                                </button>
                                <button
                                    className="text-xs pl-1.5 text-sky-700 dark:text-blue-400"
                                    onClick={() => callbacks.delete(clip)}
                                    title="Delete sound"
                                >
                                    <i className="icon icon-backspace" />
                                </button>
                            </>
                        )}
                </div>
            </div>
        </div>
    )
}

const ClipList = ({ names }: { names: string[] }) => {
    const entities = useSelector(sounds.selectAllEntities)
    const theme = useSelector(appState.selectColorTheme)

    return (
        <div className="flex flex-col">
            {names?.map((v: string) =>
                entities[v] && <Clip
                    key={v} clip={entities[v]}
                    bgcolor={theme === "light" ? "bg-white" : "bg-gray-900"}
                />
            )}
        </div>
    )
}

interface FolderProps {
    folder: string,
    names: string[],
    index: number,
    listRef: React.RefObject<any>
}

const Folder = ({ folder, names }: FolderProps) => {
    return (<>
        <div className="flex flex-row justify-start sticky top-0 bg-inherit">
            <div
                className="flex grow truncate justify-between items-center pl-2 p-0.5 border-b border-r border-gray-500 dark:border-gray-700"
                title={folder}
            >
                <div className="text-sm truncate">{folder}</div>
            </div>
        </div>
        <ClipList names={names} />
    </>)
}

const WindowedSoundCollection = ({ folders, namesByFolders }: {
    title: string, folders: string[], namesByFolders: any, visible?: boolean, initExpanded?: boolean,
}) => {
    const listRef = useRef<List>(null)
    useEffect(() => {
        if (listRef?.current) {
            listRef.current.resetAfterIndex(0)
        }
    }, [folders, namesByFolders])

    const getItemSize = (index: number) => {
        const folderHeight = 25
        const clipHeight = 30
        return folderHeight + (clipHeight * namesByFolders[folders[index]].length)
    }

    return (
        <div className="border-t border-gray-400 grow">
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        ref={listRef}
                        height={height}
                        width={width}
                        itemCount={folders.length}
                        itemSize={getItemSize}
                    >
                        {({ index, style }) => {
                            const names = namesByFolders[folders[index]]
                            const folderClass = classNames({
                                "bg-gray-300 dark:bg-gray-800": true,
                            })
                            return (
                                <div style={style}
                                    className={folderClass}>
                                    <Folder
                                        folder={folders[index]}
                                        names={names}
                                        index={index}
                                        listRef={listRef}
                                    />
                                </div>
                            )
                        }}
                    </List>
                )}
            </AutoSizer>
        </div>
    )
}

const DefaultSoundCollection = () => {
    const { t } = useTranslation()
    let folders = useSelector(sounds.selectFilteredRegularFolders)
    const namesByFolders = useSelector(sounds.selectFilteredRegularNamesByFolders)
    const recommendationSounds = useSelector((state: RootState) => state.recommender.recommendations)
    const loggedIn = useSelector(user.selectLoggedIn)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    // insert "recommendations" folder at the top of the list
    if (loggedIn && tabsOpen) {
        folders = ["RECOMMENDATIONS", ...folders] // TODO: need to use localized title here
        namesByFolders.RECOMMENDATIONS = recommendationSounds.slice(0, 5)
    }
    const numSounds = useSelector(sounds.selectAllRegularNames).length
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length
    const filtered = numFiltered !== numSounds
    const title = `${t("soundBrowser.title.collection").toLocaleUpperCase()} (${filtered ? numFiltered + "/" : ""}${numSounds})`
    const props = { title, folders, namesByFolders }
    return <WindowedSoundCollection {...props} />
}

export const SoundBrowser = () => {
    const loggedIn = useSelector(user.selectLoggedIn)
    const dispatch = useDispatch()
    const numArtistsSelected = useSelector(sounds.selectNumArtistsSelected)
    const numGenresSelected = useSelector(sounds.selectNumGenresSelected)
    const numInstrumentsSelected = useSelector(sounds.selectNumInstrumentsSelected)
    const numKeysSelected = useSelector(sounds.selectNumKeysSelected)
    const clearClass = "text-xs md:text-sm large:text-sm uppercase border-b-2 text-white rounded px-2 mr-2 bg-red-800 min-w-1/5 max-w-1/4"
    return (
        <>
            <div className="grow-0">
                <div style={{ overflowY: "scroll", overflowX: "hidden", maxHeight: "45vh" }} className="pb-1">
                    <SoundSearchBar />
                    <Filters />
                </div>
                <div className="flex justify-between px-3 mb-0.5">
                    {numArtistsSelected > 0 || numGenresSelected > 0 || numInstrumentsSelected > 0 || numKeysSelected > 0 ? <button className={clearClass} onClick={() => { dispatch(sounds.resetAllFilters()); reloadRecommendations() }}> clear </button> : <NumberOfSounds />}
                    {loggedIn && <>
                        <ShowOnlyFavorites />
                        <AddSound />
                    </>}
                </div>
            </div>

            <div className="grow flex flex-col justify-start" role="tabpanel" id={"panel-" + BrowserTabType.Sound}>
                <DefaultSoundCollection />
            </div>
        </>
    )
}
