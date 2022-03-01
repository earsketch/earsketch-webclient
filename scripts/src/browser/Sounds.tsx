import React, { useState, useRef, useEffect, ChangeEvent, MouseEvent } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import { VariableSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"

import { renameSound, deleteSound, openUploadWindow } from "../app/App"
import * as sounds from "./soundsState"
import * as appState from "../app/appState"
import * as editor from "../ide/Editor"
import * as user from "../user/userState"
import * as tabs from "../ide/tabState"
import { RootState } from "../reducers"
import { SoundEntity } from "common"

import { SearchBar, Collection, DropdownMultiSelector } from "./Browser"

import { addUIClick } from "../cai/studentPreferences"

const SoundSearchBar = () => {
    const dispatch = useDispatch()
    const searchText = useSelector(sounds.selectSearchText)
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(sounds.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(sounds.setSearchText(""))
    const props = { searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

const FilterItem = ({ category, value, isClearItem }: { category: keyof sounds.Filters, value: string, isClearItem: boolean }) => {
    const selected = isClearItem ? false : useSelector((state: RootState) => state.sounds.filters[category].includes(value))
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <>
            <div
                className="flex justify-left cursor-pointer pr-8 bg-white hover:bg-blue-200 dark:bg-black dark:hover:bg-blue-500"
                onClick={() => {
                    if (isClearItem) {
                        dispatch(sounds.resetFilter(category))
                    } else {
                        if (selected) dispatch(sounds.removeFilterItem({ category, value }))
                        else dispatch(sounds.addFilterItem({ category, value }))
                    }
                }}
                title={isClearItem ? t("ariaDescriptors:sounds.clearFilter", { category }) : value}
                aria-label={isClearItem ? t("ariaDescriptors:sounds.clearFilter", { category }) : value}
            >
                <div className="w-8">
                    <i className={`glyphicon glyphicon-ok ${selected ? "block" : "hidden"}`} />
                </div>
                <div className="select-none">
                    {isClearItem ? t("clear") : value}
                </div>
            </div>
            {isClearItem && <hr className="border-1 my-2 border-black dark:border-white" />}
        </>
    )
}

const Filters = () => {
    const { t } = useTranslation()
    const artists = useSelector(sounds.selectFilteredArtists)
    const genres = useSelector(sounds.selectFilteredGenres)
    const instruments = useSelector(sounds.selectFilteredInstruments)
    const numArtistsSelected = useSelector(sounds.selectNumArtistsSelected)
    const numGenresSelected = useSelector(sounds.selectNumGenresSelected)
    const numInstrumentsSelected = useSelector(sounds.selectNumInstrumentsSelected)

    return (
        <div className="p-3">
            <div className="pb-2 text-lg">{t("filter").toLocaleUpperCase()}</div>
            <div className="flex justify-between">
                <DropdownMultiSelector
                    title={t("soundBrowser.filterDropdown.artists")}
                    category="artists"
                    aria={t("soundBrowser.clip.tooltip.artist")}
                    items={artists}
                    position="left"
                    numSelected={numArtistsSelected}
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title={t("soundBrowser.filterDropdown.genres")}
                    category="genres"
                    aria={t("soundBrowser.clip.tooltip.genre")}
                    items={genres}
                    position="center"
                    numSelected={numGenresSelected}
                    FilterItem={FilterItem}
                />
                <DropdownMultiSelector
                    title={t("soundBrowser.filterDropdown.instruments")}
                    category="instruments"
                    aria={t("soundBrowser.clip.tooltip.instrument")}
                    items={instruments}
                    position="right"
                    numSelected={numInstrumentsSelected}
                    FilterItem={FilterItem}
                />
            </div>
        </div>
    )
}

const ShowOnlyFavorites = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div className="flex items-center">
            <div className="pr-2">
                <input
                    type="checkbox"
                    style={{ margin: 0 }}
                    onClick={(event: MouseEvent) => {
                        const elem = event.target as HTMLInputElement
                        dispatch(sounds.setFilterByFavorites(elem.checked))
                    }}
                    title={t("soundBrowser.button.showOnlyStarsDescriptive")}
                    aria-label={t("soundBrowser.button.showOnlyStarsDescriptive")}
                    role="checkbox"
                />
            </div>
            <div className="pr-1">
                {t("soundBrowser.button.showOnlyStars")}
            </div>
            <i className="icon icon-star-full2 fav-icon" />
        </div>
    )
}

const AddSound = () => {
    const { t } = useTranslation()

    return (
        <button
            className="flex items-center rounded-full py-1 bg-black text-white cursor-pointer"
            onClick={() => openUploadWindow()}
        >
            <div className="align-middle rounded-full bg-white text-black p-1 ml-2 mr-3 text-sm">
                <i className="icon icon-plus2" />
            </div>
            <div className="mr-3">
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

    const tooltip = `${t("soundBrowser.clip.tooltip.file")}: ${name}
        ${t("soundBrowser.clip.tooltip.folder")}: ${clip.folder}
        ${t("soundBrowser.clip.tooltip.artist")}: ${clip.artist}
        ${t("soundBrowser.clip.tooltip.genre")}: ${clip.genre}
        ${t("soundBrowser.clip.tooltip.instrument")}: ${clip.instrument}
        ${t("soundBrowser.clip.tooltip.originalTempo")}: ${clip.tempo}
        ${t("soundBrowser.clip.tooltip.year")}: ${clip.year}`.replace(/\n\s+/g, "\n")

    const loggedIn = useSelector(user.selectLoggedIn)
    const isFavorite = loggedIn && useSelector(sounds.selectFavorites).includes(name)
    const userName = useSelector(user.selectUserName) as string
    const isUserOwned = loggedIn && clip.folder === userName.toUpperCase()
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length

    return (
        <div className="flex flex-row justify-start">
            <div className="h-auto border-l-4 border-blue-300" />
            <div className={`flex flex-grow truncate justify-between py-2 ${bgcolor} border ${theme === "light" ? "border-gray-300" : "border-gray-700"}`}>
                <div className="flex items-center min-w-0" title={tooltip}>
                    <span className="truncate pl-5">{name}</span>
                </div>
                <div className="pl-2 pr-4 h-1">
                    <button
                        className="btn btn-xs btn-action"
                        onClick={() => { dispatch(sounds.previewSound(name)); addUIClick("sound - preview") }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                    >
                        {previewFileName === name
                            ? (previewNode ? <i className="icon icon-stop2" /> : <i className="animate-spin es-spinner" />)
                            : <i className="icon icon-play4" />}
                    </button>
                    {loggedIn &&
                        (
                            <button
                                className="btn btn-xs btn-action"
                                onClick={() => dispatch(sounds.markFavorite({ name: name, isFavorite }))}
                                title={t("soundBrowser.clip.tooltip.markFavorite")}
                            >
                                {isFavorite
                                    ? <i className="icon icon-star-full2 fav-icon" />
                                    : <i className="icon icon-star-empty3 fav-icon" />}
                            </button>
                        )}
                    {tabsOpen &&
                        (
                            <button
                                className="btn btn-xs btn-action"
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
                                    className="btn btn-xs btn-action"
                                    onClick={() => renameSound(clip)}
                                    title="Rename sound"
                                >
                                    <i className="icon icon-pencil3" />
                                </button>
                                <button
                                    className="btn btn-xs btn-action"
                                    onClick={() => deleteSound(clip)}
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
                <Clip
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
    expanded: boolean,
    setExpanded: React.Dispatch<React.SetStateAction<Set<number>>>
    listRef: React.RefObject<any>
}

const Folder = ({ folder, names, index, expanded, setExpanded, listRef }: FolderProps) => {
    return (<>
        <div className="flex flex-row justify-start">
            {expanded &&
                (<div className="h-auto border-l-4 border-blue-500" />)}
            <div
                className="flex flex-grow truncate justify-between items-center p-3 text-2xl cursor-pointer border-b border-r border-gray-500 dark:border-gray-700"
                title={folder}
                onClick={() => {
                    setExpanded((v: Set<number>) => {
                        if (expanded) {
                            v.delete(index)
                            return new Set(v)
                        } else {
                            return new Set(v.add(index))
                        }
                    })
                    listRef?.current?.resetAfterIndex(index)
                }}
            >
                <div className="truncate">{folder}</div>
                <span className="btn btn-xs w-1/12 text-2xl">
                    {expanded
                        ? <i className="icon icon-arrow-down2" />
                        : <i className="icon icon-arrow-right2" />}
                </span>
            </div>
        </div>
        {expanded && <ClipList names={names} />}
    </>)
}

const WindowedRecommendations = () => {
    const loggedIn = useSelector(user.selectLoggedIn)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length
    const recommendations = useSelector((state: RootState) => state.recommender.recommendations)
    const { t } = useTranslation()

    return (
        <Collection
            title={t("soundBrowser.title.recommendations").toLocaleUpperCase()}
            visible={loggedIn && tabsOpen}
            initExpanded={false}
        >
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        itemCount={1}
                        itemSize={() => 45}
                    >
                        {({ style }) => {
                            return (
                                <div style={style}>
                                    <ClipList names={recommendations} />
                                </div>
                            )
                        }}
                    </List>
                )}
            </AutoSizer>
        </Collection>
    )
}

const WindowedSoundCollection = ({ title, folders, namesByFolders, visible = true, initExpanded = true }: {
    title: string, folders: string[], namesByFolders: any, visible?: boolean, initExpanded?: boolean,
}) => {
    const [expanded, setExpanded] = useState(new Set())
    const listRef = useRef<List>(null)

    useEffect(() => {
        setExpanded(new Set())

        if (listRef?.current) {
            listRef.current.resetAfterIndex(0)
        }
    }, [folders, namesByFolders])

    const getItemSize = (index: number) => {
        const folderHeight = 40
        const clipHeight = 33
        return folderHeight + (expanded.has(index) ? clipHeight * namesByFolders[folders[index]].length : 0)
    }

    return (
        <Collection
            title={title}
            visible={visible}
            initExpanded={initExpanded}
        >
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
                            return (
                                <div style={style}
                                    className={index % 2 === 0
                                        ? "bg-white dark:bg-gray-900"
                                        : "bg-gray-300 dark:bg-gray-800" +
                                         " hover:bg-blue-200 dark:hover:bg-blue-500"}>
                                    <Folder
                                        folder={folders[index]}
                                        names={names}
                                        index={index}
                                        expanded={expanded.has(index)}
                                        setExpanded={setExpanded}
                                        listRef={listRef}
                                    />
                                </div>
                            )
                        }}
                    </List>
                )}
            </AutoSizer>
        </Collection>
    )
}

const DefaultSoundCollection = () => {
    const { t } = useTranslation()
    const folders = useSelector(sounds.selectFilteredRegularFolders)
    const namesByFolders = useSelector(sounds.selectFilteredRegularNamesByFolders)
    const numSounds = useSelector(sounds.selectAllRegularNames).length
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length
    const filtered = numFiltered !== numSounds
    const title = `${t("soundBrowser.title.collection").toLocaleUpperCase()} (${filtered ? numFiltered + "/" : ""}${numSounds})`
    const props = { title, folders, namesByFolders }
    return <WindowedSoundCollection {...props} />
}

const FeaturedArtistCollection = () => {
    const { t } = useTranslation()
    const folders = useSelector(sounds.selectFilteredFeaturedFolders)
    const namesByFolders = useSelector(sounds.selectFilteredFeaturedNamesByFolders)
    const filteredListChanged = useSelector(sounds.selectFilteredListChanged)
    const visible = useSelector(sounds.selectFeaturedSoundVisibility)
    const initExpanded = true
    const numSounds = useSelector(sounds.selectFeaturedNames).length
    const numFiltered = useSelector(sounds.selectFilteredFeaturedNames).length
    const filtered = numFiltered !== numSounds
    const artists = useSelector(sounds.selectFeaturedArtists)
    const title = `${t("soundBrowser.title.featuredArtist").toLocaleUpperCase()}${artists.length > 1 ? "S" : ""} (${filtered ? numFiltered + "/" : ""}${numSounds})`
    const props = { title, folders, namesByFolders, filteredListChanged, visible, initExpanded }
    return <WindowedSoundCollection {...props} />
}

export const SoundBrowser = () => {
    const loggedIn = useSelector(user.selectLoggedIn)

    return (
        <>
            <div className="flex-grow-0">
                <div className="pb-3">
                    <SoundSearchBar />
                    <Filters />
                </div>

                <div className={`${loggedIn ? "flex" : "hidden"} justify-between px-3 pb-3 mb-2`}>
                    <ShowOnlyFavorites />
                    <AddSound />
                </div>
            </div>

            <div className="flex-grow flex flex-col justify-start">
                <DefaultSoundCollection />
                <FeaturedArtistCollection />
                <WindowedRecommendations />
            </div>
        </>
    )
}
