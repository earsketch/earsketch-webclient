import React, { useRef, useEffect, ChangeEvent, useState, createRef, useLayoutEffect } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"

import { ListOnScrollProps, VariableSizeList as List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import classNames from "classnames"

import { addUIClick } from "../cai/dialogue/student"
import * as sounds from "./soundsState"
import * as soundsThunks from "./soundsThunks"
import * as appState from "../app/appState"
import { reloadRecommendations } from "../app/reloadRecommender"
import * as editor from "../ide/Editor"
import * as user from "../user/userState"
import * as tabs from "../ide/tabState"
import type { RootState } from "../reducers"
import type { SoundEntity } from "common"
import { BrowserTabType } from "./BrowserTab"

import { SearchBar } from "./Utils"
import { CheckboxButton } from "../Utils"

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
    const props = { id: "soundSearchBar", searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

const FilterButton = ({ category, value, label = value, fullWidth = false }: { category: keyof sounds.Filters, value: string, label?: string, fullWidth?: boolean }) => {
    const selected = useSelector((state: RootState) => state.sounds.filters[category].includes(value))
    const dispatch = useDispatch()

    return <CheckboxButton
        label={label}
        onClick={() => {
            if (selected) dispatch(sounds.removeFilterItem({ category, value }))
            else dispatch(sounds.addFilterItem({ category, value }))
            addUIClick("filter: " + label + (selected ? " off" : " on"))
        }}
        selected={selected}
        selectedColor="green"
        fullWidth={fullWidth}
    />
}

interface ButtonFilterProps {
    title: string
    category: keyof sounds.Filters
    ariaTabPanel: string
    ariaListBox: string
    items: string[]
    position: "center" | "left" | "right"
    justification: "flex" | "keySignatureGrid"
    showMajMinPageOne?: boolean
    setShowMajMinPageOne?: Function
}

const ButtonFilterList = ({ category, ariaTabPanel, ariaListBox, items, justification, showMajMinPageOne = true, setShowMajMinPageOne = () => {} }: ButtonFilterProps) => {
    const classes = classNames({
        "flex flex-row flex-wrap": justification === "flex",
        "grid grid-cols-4 gap-2": justification === "keySignatureGrid",
    })

    return (
        <div role="tabpanel" aria-label={ariaTabPanel} className="relative px-1.5">
            {justification === "keySignatureGrid" &&
            <MajMinRadioButtons
                chooseMaj={() => setShowMajMinPageOne(true)}
                chooseMin={() => setShowMajMinPageOne(false)}
                showMajMinPageOne={showMajMinPageOne}
            />}
            <div role="listbox" aria-label={ariaListBox} className={classes}>
                {justification === "keySignatureGrid" &&
                <KeySignatureFilterList items={items} category={category} showMajMinPageOne={showMajMinPageOne} />}
                {justification === "flex" &&
                <FlexButtonFilterList items={items} category={category} />}
            </div>
        </div>
    )
}

const FlexButtonFilterList = ({ items, category }: { items: string[], category: keyof sounds.Filters }) => {
    return <>
        {items.map((item, index) =>
            <div key={index}>
                <FilterButton
                    value={item}
                    category={category}
                />
            </div>
        )}
    </>
}

interface KeySignatureFilterListProps {
    items: string[],
    category: keyof sounds.Filters,
    showMajMinPageOne: boolean
}

const KeySignatureFilterList = ({ items, category, showMajMinPageOne }: KeySignatureFilterListProps) => {
    const keySignatureSequence = [
        "C major", "G major", "D major", "A major", "E major", "B major",
        "F#/Gb major", "C#/Db major", "G#/Ab major", "D#/Eb major", "A#/Bb major", "F major",
        "A minor", "E minor", "B minor", "F#/Gb minor", "C#/Db minor", "G#/Ab minor",
        "D#/Eb minor", "A#/Bb minor", "F minor", "C minor", "G minor", "D minor",
    ]
    const visibleKeySignatures = keySignatureSequence.slice(showMajMinPageOne ? 0 : 12, showMajMinPageOne ? 12 : 24)
    return <>
        {visibleKeySignatures.map((item, index) => <div key={index}>
            {items.includes(item)
                ? <FilterButton
                    value={item}
                    label={item.replace(" major", "").replace(" minor", "")}
                    category={category}
                    fullWidth={true}
                />
                : <div className="h-8" >{" "}</div>}
        </div>)}
    </>
}

interface MajMinRadioButtonsProps {
    chooseMaj: () => void,
    chooseMin: () => void,
    showMajMinPageOne: boolean,
}

const MajMinRadioButtons = ({ chooseMaj, chooseMin, showMajMinPageOne }: MajMinRadioButtonsProps) => {
    const majorButtonClass = classNames({
        "py-1.5 px-2 text-xs border-y border-l rounded-l": true,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-r": showMajMinPageOne,
        "border-slate-200": !showMajMinPageOne,
    })
    const minorButtonClass = classNames({
        "py-1.5 px-2 text-xs border-y border-r rounded-r": true,
        "border-slate-200": showMajMinPageOne,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-l": !showMajMinPageOne,
    })
    return <div className="flex items-center justify-center mb-1">
        <div className="inline-flex" role="tablist">
            <button role="tab" className={majorButtonClass} onClick={chooseMaj}>Major</button>
            <button role="tab" className={minorButtonClass} onClick={chooseMin}>Minor</button>
        </div>
    </div>
}

const SoundFilterTab = ({ soundFilterKey, numItemsSelected, setCurrentFilterTab, currentFilterTab }: { soundFilterKey: keyof sounds.Filters, numItemsSelected: number, setCurrentFilterTab: (current: keyof sounds.Filters) => void, currentFilterTab: keyof sounds.Filters }) => {
    const { t } = useTranslation()
    const tabClass = classNames({
        "text-xs uppercase rounded p-1 min-w-1/5 max-w-1/4 text-black bg-gray-200 aria-selected:bg-amber": true,
    })
    const spanClass = "absolute -top-[0.6rem] right-[-8px] inline-flex items-center justify-center px-1 py-0.5 z-10 text-xs font-bold leading-none text-white bg-blue shadow rounded-full"

    return (
        <div className="flex flex-row flex-wrap">
            <div className="relative inline-block">
                {numItemsSelected > 0 ? <div className={spanClass}>{numItemsSelected}</div> : null}
                <button role="tab"
                    aria-selected={currentFilterTab === soundFilterKey}
                    className={tabClass}
                    onClick={() => setCurrentFilterTab(soundFilterKey)}>
                    {t(`soundBrowser.filterDropdown.${soundFilterKey}`)}
                </button>
            </div>
        </div>
    )
}

const Filters = ({ currentFilterTab, setCurrentFilterTab }: { currentFilterTab: keyof sounds.Filters, setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>> }) => {
    const { t } = useTranslation()
    const [showMajMinPageOne, setShowMajMinPageOne] = useState(true)
    const artists = useSelector(sounds.selectFilteredArtists)
    const genres = useSelector(sounds.selectFilteredGenres)
    const instruments = useSelector(sounds.selectFilteredInstruments)
    const keys = useSelector(sounds.selectFilteredKeys)
    const numItemsSelected = useSelector(sounds.selectNumItemsSelected)

    return (
        <div>
            <div role="tablist" className="flex flex-row grow justify-between px-1.5 mb-0.5 mt-2.5 mr-2">
                {Object.entries(numItemsSelected).map(([name, num]: [string, number]) => {
                    return <SoundFilterTab
                        key={name}
                        soundFilterKey={name as keyof sounds.Filters}
                        numItemsSelected={num}
                        setCurrentFilterTab={setCurrentFilterTab}
                        currentFilterTab={currentFilterTab} />
                })}
            </div>

            {/* TODO: add an SR-only message about clicking on the buttons to filter the sounds (similar to soundtrap) */}
            {currentFilterTab === "artists" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.artists")}
                category="artists"
                ariaTabPanel={t("soundBrowser.clip.tooltip.artist")}
                ariaListBox={t("ariaDescriptors:sounds.artistFilter")}
                items={artists}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "genres" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.genres")}
                category="genres"
                ariaTabPanel={t("soundBrowser.clip.tooltip.genre")}
                ariaListBox={t("ariaDescriptors:sounds.genreFilter")}
                items={genres}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "instruments" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.instruments")}
                category="instruments"
                ariaTabPanel={t("soundBrowser.clip.tooltip.instrument")}
                ariaListBox={t("ariaDescriptors:sounds.instrumentFilter")}
                items={instruments}
                position="center"
                justification="flex"
            />}
            {currentFilterTab === "keys" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.keys")}
                category="keys"
                ariaTabPanel={t("soundBrowser.clip.tooltip.key")}
                ariaListBox={t("ariaDescriptors:sounds.keyFilter")}
                items={keys}
                position="center"
                justification="keySignatureGrid"
                showMajMinPageOne={showMajMinPageOne}
                setShowMajMinPageOne={setShowMajMinPageOne}
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
    const filterByFavorites = useSelector(sounds.selectFilterByFavorites)
    const loggedIn = useSelector(user.selectLoggedIn)

    return (
        <label className="flex items-center" style={{ opacity: loggedIn ? "1" : "0" }}>
            <input
                type="checkbox"
                className="mr-1.5"
                onChange={() => { dispatch(sounds.setFilterByFavorites(!filterByFavorites)) }}
                disabled={!loggedIn}
                title={t("soundBrowser.button.showOnlyStarsDescriptive")}
                aria-label={t("soundBrowser.button.showOnlyStarsDescriptive")}
                role="checkbox"
                checked={filterByFavorites}
            />
            <span className="text-sm">
                {t("soundBrowser.button.showOnlyStars")}
                <i className="icon icon-star-full2 text-orange-600 ml-1" />
            </span>
        </label>
    )
}

const AddSound = () => {
    const { t } = useTranslation()
    const loggedIn = useSelector(user.selectLoggedIn)
    const tooltip = `${loggedIn ? t("soundBrowser.button.addSound") : "Log in to add sounds"}`

    return (
        <button
            className={`flex items-center rounded-full px-2 ${loggedIn ? "bg-black text-white cursor-pointer" : "text-gray-200 border-gray-200"}`}
            onClick={callbacks.upload}
            disabled={!loggedIn}
            title={tooltip}
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
    const preview = useSelector(sounds.selectPreview)
    const previewNodes = useSelector(sounds.selectPreviewNodes)
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
                        onClick={() => { dispatch(soundsThunks.togglePreview({ name, kind: "sound" })); addUIClick("sound preview - " + name + (previewNodes ? " stop" : " play")) }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                        aria-label={t("ariaDescriptors:sounds.preview", { name })}
                    >
                        {preview?.kind === "sound" && preview.name === name
                            ? (previewNodes ? <i className="icon icon-stop2" /> : <i className="animate-spin es-spinner" />)
                            : <i className="icon icon-play4" />}
                    </button>
                    {loggedIn &&
                        (
                            <button
                                className="text-xs px-1.5"
                                onClick={() => dispatch(soundsThunks.markFavorite({ name, isFavorite }))}
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
                                onClick={() => { editor.pasteCode(name); addUIClick("sound copy - " + name) }}
                                title={t("soundBrowser.clip.tooltip.paste")}
                                aria-label={t("ariaDescriptors:sounds.paste", { name })}
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

interface SoundSearchAndFiltersProps {
    currentFilterTab: keyof sounds.Filters,
    setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
    setFilterHeight: React.Dispatch<React.SetStateAction<number>>
}

const SoundFilters = ({ currentFilterTab, setCurrentFilterTab, setFilterHeight }: SoundSearchAndFiltersProps) => {
    const { t } = useTranslation()
    const filterRef: React.RefObject<HTMLDivElement> = createRef()
    const dispatch = useDispatch()
    const numItemsSelected = useSelector(sounds.selectNumItemsSelected)
    const showFavoritesSelected = useSelector(sounds.selectFilterByFavorites)
    const searchText = useSelector(sounds.selectSearchText)
    const clearButtonEnabled = Object.values(numItemsSelected).some(x => x > 0) || showFavoritesSelected || searchText
    const clearClassnames = classNames({
        "text-sm flex items-center rounded pl-1 pr-1.5 border": true,
        "text-red-800 border-red-800 bg-red-50": clearButtonEnabled,
        "text-gray-200 border-gray-200": !clearButtonEnabled,
    })

    useLayoutEffect(() => {
        const soundFilterHeight = filterRef.current?.offsetHeight || 0
        setFilterHeight(soundFilterHeight)
    })

    return (
        <div ref={filterRef} className="pb-1">
            <div className="pb-1">
                <Filters
                    currentFilterTab={currentFilterTab}
                    setCurrentFilterTab={setCurrentFilterTab}/>
            </div>
            <div className="flex justify-between px-1.5 py-1 mb-0.5">
                <ShowOnlyFavorites />
                <AddSound />
            </div>
            <div className="flex justify-between items-end px-1.5 py-1 mb-2">
                <button
                    className={clearClassnames}
                    onClick={() => { dispatch(sounds.resetAllFilters()); reloadRecommendations() }}
                    disabled={!clearButtonEnabled}
                    title={t("ariaDescriptors:sounds.clearFilter")}
                    aria-label={t("ariaDescriptors:sounds.clearFilter")}
                >
                    <span className="icon icon-cross3 text-base pr-0.5"></span>{t("soundBrowser.clearFilters")}
                </button>
                <NumberOfSounds />
            </div>
        </div>
    )
}

const WindowedSoundCollection = ({ folders, namesByFolders, currentFilterTab, setCurrentFilterTab }: {
    title: string, folders: string[], namesByFolders: any, currentFilterTab: keyof sounds.Filters, setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
}) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const numItemsSelected = useSelector(sounds.selectNumItemsSelected)
    const showFavoritesSelected = useSelector(sounds.selectFilterByFavorites)
    const searchText = useSelector(sounds.selectSearchText)
    const clearButtonEnabled = Object.values(numItemsSelected).some(x => x > 0) || showFavoritesSelected || searchText
    const clearClassnames = classNames({
        "text-sm flex items-center rounded pl-1 pr-1.5 border": true,
        "text-red-800 border-red-800 bg-red-50": clearButtonEnabled,
        "text-gray-200 border-gray-200": !clearButtonEnabled,
    })
    const listRef = useRef<List>(null)
    const [scrolledOffset, setScrolledOffset] = useState(0)
    const [filterHeight, setFilterHeight] = useState(0)
    const filterThreshold = filterHeight - 7
    const filterIsOffscreen = scrolledOffset > filterThreshold
    const soundListClassnames = classNames({
        "grow transition-[margin] ease-in-out": true,
        "-mt-8": !filterIsOffscreen,
    })
    const extraFilterControlsClassnames = classNames({
        "flex justify-between items-end pl-1.5 pr-4 py-1 mb-0.5 transition ease-in-out": true,
        "-z-10 -translate-y-2": !filterIsOffscreen,
    })
    const scrolltoTopClassnames = classNames({
        "transition-[height] ease-in-out": true,
        "h-0": !filterIsOffscreen,
    })

    useEffect(() => {
        if (listRef?.current) {
            listRef.current.resetAfterIndex(0)
        }
    }, [folders, namesByFolders])

    useLayoutEffect(() => {
        listRef.current?.resetAfterIndex(0)
    }, [filterHeight])

    const getItemSize = (index: number) => {
        if (index === 0) {
            return filterHeight
        } else {
            const folderHeight = 25
            const clipHeight = 30
            return folderHeight + (clipHeight * namesByFolders[folders[index - 1]].length)
        }
    }

    const listScrolled = ({ scrollOffset }: ListOnScrollProps) => {
        setScrolledOffset(scrollOffset)
    }
    return (
        <div className="flex flex-col grow">
            <SoundSearchBar />
            <div className={extraFilterControlsClassnames} aria-hidden={!filterIsOffscreen}>
                <button
                    className={clearClassnames}
                    onClick={() => {
                        dispatch(sounds.resetAllFilters())
                        reloadRecommendations()
                    }}
                    disabled={!clearButtonEnabled}
                    title={t("ariaDescriptors:sounds.clearFilter")}
                    aria-label={t("ariaDescriptors:sounds.clearFilter")}
                    tabIndex={filterIsOffscreen ? 0 : -1}
                >
                    <span className="icon icon-cross3 text-base pr-0.5"></span>{t("soundBrowser.clearFilters")}
                </button>
                <NumberOfSounds/>
            </div>

            <div className={soundListClassnames}>
                <AutoSizer>
                    {({ height, width }: { height: number, width: number }) => (
                        <List
                            ref={listRef}
                            height={height}
                            width={width}
                            itemCount={folders.length + 1}
                            itemSize={getItemSize}
                            onScroll={listScrolled}
                        >
                            {({ index, style }) => {
                                if (index === 0) {
                                    return (
                                        <div style={style}>
                                            <SoundFilters
                                                currentFilterTab={currentFilterTab}
                                                setCurrentFilterTab={setCurrentFilterTab}
                                                setFilterHeight={setFilterHeight}
                                            />
                                        </div>
                                    )
                                } else {
                                    const names = namesByFolders[folders[index - 1]]
                                    const folderClass = classNames({
                                        "bg-gray-300 dark:bg-gray-800": true,
                                    })
                                    return (
                                        <div style={style}
                                            className={folderClass}>
                                            <Folder
                                                folder={folders[index - 1]}
                                                names={names}
                                                index={index - 1}
                                                listRef={listRef}
                                            />
                                        </div>
                                    )
                                }
                            }}
                        </List>
                    )}
                </AutoSizer>

            </div>
            <div className={scrolltoTopClassnames} aria-hidden={!filterIsOffscreen}>
                <button className="px-1 py-2 w-full text-amber bg-blue text-sm text-center"
                    onClick={() => listRef.current!.scrollToItem(0)} tabIndex={filterIsOffscreen ? 0 : -1}><i className="icon icon-arrow-up3 p-1"></i>{t("soundBrowser.button.backToTop").toLocaleUpperCase()}</button>
            </div>
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
    const activeTab = useSelector(tabs.selectActiveTabID)
    const getStandardSounds = useSelector(sounds.selectAllRegularEntities)
    const numSounds = useSelector(sounds.selectAllRegularNames).length
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length
    const filtered = numFiltered !== numSounds
    const title = `${t("soundBrowser.title.collection").toLocaleUpperCase()} (${filtered ? numFiltered + "/" : ""}${numSounds})`
    const [currentFilterTab, setCurrentFilterTab] = useState<keyof sounds.Filters>("artists")

    useEffect(() => {
        reloadRecommendations()
    }, [activeTab, getStandardSounds])

    // insert "recommendations" folder at the top of the list
    let foldersWithRecs = namesByFolders
    if (loggedIn && tabsOpen && !filtered) {
        const recommendationsTitle = t("soundBrowser.title.recommendations").toLocaleUpperCase()
        folders = [recommendationsTitle, ...folders]
        foldersWithRecs = { ...namesByFolders, [recommendationsTitle]: recommendationSounds.slice(0, 5) }
    }
    const props = { title, folders, namesByFolders: foldersWithRecs, currentFilterTab, setCurrentFilterTab }
    return <WindowedSoundCollection {...props} />
}

export const SoundBrowser = () => {
    return (
        <div className="grow flex flex-col justify-start" role="tabpanel" id={"panel-" + BrowserTabType.Sound}>
            <DefaultSoundCollection />
        </div>
    )
}
