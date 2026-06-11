import React, { useRef, useEffect, ChangeEvent, useState, useMemo, useCallback } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
import classNames from "classnames"
import store from "../reducers"
import { recommend } from "../app/recommender"

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
import * as Tooltip from "@radix-ui/react-tooltip"

import { SearchBar } from "./Utils"
import { Waveform } from "../app/Recorder"
import * as audioLibrary from "../app/audiolibrary"

// TODO: Consider passing these down as React props or dispatching via Redux.
export const callbacks = {
    rename: (_: SoundEntity) => {},
    delete: (_: SoundEntity) => {},
    upload: () => {},
}

const SoundSearchBar = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const searchText = useSelector(sounds.selectSearchText)
    const count = useSelector(sounds.selectFilteredRegularNames).length
    const dispatchSearch = (event: ChangeEvent<HTMLInputElement>) => dispatch(sounds.setSearchText(event.target.value))
    const dispatchReset = () => dispatch(sounds.setSearchText(""))
    const liveMessage = t("soundsFound", { count })
    const props = { id: "soundSearchBar", aria: t("ariaDescriptors:sounds.searchBar"), liveMessage, firstResultSelector: "#panel-0 h5", searchText, dispatchSearch, dispatchReset }

    return <SearchBar {...props} />
}

const FilterButton = ({ category, value, label = value, fullWidth = false }: { category: keyof sounds.Filters, value: string, label?: string, fullWidth?: boolean }) => {
    const selected = useSelector((state: RootState) => state.sounds.filters[category].includes(value))
    const dispatch = useDispatch()

    const handleToggle = () => {
        if (selected) dispatch(sounds.removeFilterItem({ category, value }))
        else dispatch(sounds.addFilterItem({ category, value }))
        addUIClick("filter: " + label + (selected ? " off" : " on"))
    }

    const classnames = classNames({
        "rounded cursor-pointer p-1 mt-1 mr-2": true,
        "hover:bg-green-50 dark:hover:bg-green-900 hover:text-black dark:text-white": true,
        "text-gray-500 border border-gray-500": !selected,
        "bg-green-400 hover:bg-green-400 dark:bg-green-500 text-black dark:text-white": selected,
        "w-full": fullWidth,
    })

    return (
        <div
            role="option"
            aria-selected={selected}
            tabIndex={0}
            className={classnames}
            onClick={handleToggle}
            onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault()
                    handleToggle()
                }
            }}
        >
            <div className="flex flex-row scale:gap-x-1">
                <span className="rounded-full inline-flex scale:w-1 scale:mr-2">
                    <i className={`icon-checkmark3 scale:text-sm w-full ${selected ? "block" : "hidden"}`} aria-hidden="true" />
                </span>
                <div className="scale:text-xs select-none scale:mr-4">
                    {label}
                </div>
            </div>
        </div>
    )
}

interface ButtonFilterProps {
    title: string
    category: keyof sounds.Filters
    ariaListBox: string
    items: string[]
    position: "center" | "left" | "right"
    justification: "flex" | "keySignatureGrid"
    showMajMinPageOne?: boolean
    setShowMajMinPageOne?: Function
}

const ButtonFilterList = ({ category, ariaListBox, items, justification, showMajMinPageOne = true, setShowMajMinPageOne = () => {}, focusFirstOptionRef, pendingKeyboardFocusRef, tabButtonRef }: ButtonFilterProps & { focusFirstOptionRef?: React.MutableRefObject<(() => void) | null>, pendingKeyboardFocusRef?: React.MutableRefObject<boolean>, tabButtonRef?: React.RefObject<HTMLButtonElement> }) => {
    const classes = classNames({
        "flex flex-row flex-wrap": justification === "flex",
        "grid grid-cols-4 gap-2": justification === "keySignatureGrid",
    })
    const panelRef = useRef<HTMLDivElement>(null)

    // On mount: register the imperative focus callback, and immediately call it
    // if the parent flagged that this panel was opened via keyboard.
    useEffect(() => {
        const focusFirst = () => {
            const firstOption = panelRef.current?.querySelector<HTMLElement>('[role="option"]')
            firstOption?.focus()
        }
        if (focusFirstOptionRef) {
            focusFirstOptionRef.current = focusFirst
        }
        if (pendingKeyboardFocusRef?.current) {
            pendingKeyboardFocusRef.current = false
            focusFirst()
        }
        return () => {
            if (focusFirstOptionRef) focusFirstOptionRef.current = null
        }
    }, []) // eslint-disable-line

    return (
        <div
            id={`sound-filter-panel-${category}`}
            ref={panelRef}
            className="relative px-1.5"
            onKeyDown={(e) => {
                if (e.key === "Escape") {
                    e.preventDefault()
                    tabButtonRef?.current?.focus()
                } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault()
                    const options = Array.from(
                        panelRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []
                    )
                    const currentIndex = options.indexOf(document.activeElement as HTMLElement)
                    if (currentIndex === -1) return
                    const nextIndex = e.key === "ArrowDown"
                        ? Math.min(currentIndex + 1, options.length - 1)
                        : Math.max(currentIndex - 1, 0)
                    options[nextIndex]?.focus()
                }
            }}
        >
            {justification === "keySignatureGrid" &&
            <MajMinRadioButtons
                chooseMaj={() => setShowMajMinPageOne(true)}
                chooseMin={() => setShowMajMinPageOne(false)}
                showMajMinPageOne={showMajMinPageOne}
            />}
            <div
                role="listbox"
                aria-multiselectable="true"
                aria-label={ariaListBox}
                className={classes}
            >
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
            <FilterButton
                key={index}
                value={item}
                category={category}
            />
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
                : <div className="h-8" aria-hidden="true">{" "}</div>}
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
        "py-1.5 px-2 scale:text-xs border-y border-l rounded-l": true,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-r": showMajMinPageOne,
        "border-slate-200": !showMajMinPageOne,
    })
    const minorButtonClass = classNames({
        "py-1.5 px-2 scale:text-xs border-y border-r rounded-r": true,
        "border-slate-200": showMajMinPageOne,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-l": !showMajMinPageOne,
    })
    return <div className="flex items-center justify-center mb-1">
        <div className="inline-flex" role="radiogroup" aria-label="Key type">
            <button
                role="radio"
                aria-checked={showMajMinPageOne}
                className={majorButtonClass}
                onClick={chooseMaj}
            >Major</button>
            <button
                role="radio"
                aria-checked={!showMajMinPageOne}
                className={minorButtonClass}
                onClick={chooseMin}
            >Minor</button>
        </div>
    </div>
}

const SoundFilterTab = ({ soundFilterKey, numItemsSelected, setCurrentFilterTab, currentFilterTab, userExpandedTab, onOpen, tabButtonRef }: { soundFilterKey: keyof sounds.Filters, numItemsSelected: number, setCurrentFilterTab: (current: keyof sounds.Filters) => void, currentFilterTab: keyof sounds.Filters, userExpandedTab: keyof sounds.Filters | null, onOpen: () => void, tabButtonRef: React.RefObject<HTMLButtonElement> }) => {
    const { t } = useTranslation()
    const isCurrentTab = currentFilterTab === soundFilterKey
    const isExpanded = userExpandedTab === soundFilterKey
    const tabClass = classNames({
        "scale:text-xs uppercase rounded p-1 min-w-1/5 max-w-1/4 text-black bg-gray-200": true,
        "bg-amber": isCurrentTab,
    })
    const spanClass = "absolute -top-[0.6rem] right-[-8px] inline-flex items-center justify-center px-1 py-0.5 z-10 scale:text-xs font-bold leading-none text-white bg-blue shadow rounded-full"

    return (
        <div className="flex flex-row flex-wrap">
            <div className="relative inline-block">
                {numItemsSelected > 0
                    ? <div className={spanClass} aria-hidden="true">{numItemsSelected}</div>
                    : null}
                <button
                    ref={isCurrentTab ? tabButtonRef : undefined}
                    aria-expanded={isExpanded}
                    aria-controls={`sound-filter-panel-${soundFilterKey}`}
                    className={tabClass}
                    onClick={() => {
                        setCurrentFilterTab(soundFilterKey)
                        onOpen()
                    }}
                    onKeyDown={(e) => {
                        // Prevent Space from scrolling the virtual list. The click still fires on keyup.
                        if (e.key === " ") e.preventDefault()
                    }}
                >
                    {t(`soundBrowser.filterDropdown.${soundFilterKey}`)}
                    {numItemsSelected > 0
                        ? <span className="sr-only">, {numItemsSelected} selected</span>
                        : null}
                </button>
            </div>
        </div>
    )
}

const Filters = ({ currentFilterTab, setCurrentFilterTab }: { currentFilterTab: keyof sounds.Filters, setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>> }) => {
    const { t } = useTranslation()
    const [showMajMinPageOne, setShowMajMinPageOne] = useState(true)
    // Tracks which tab the user has explicitly opened (via click or keyboard).
    // Starts null so all tabs report aria-expanded="false" on initial render,
    // even though the artists panel is visible by default.
    const [userExpandedTab, setUserExpandedTab] = useState<keyof sounds.Filters | null>(null)
    // Ref to the panel's "focus first option" imperative callback, so we can
    // call it directly rather than relying on mount timing.
    const focusFirstOptionRef = useRef<(() => void) | null>(null)
    // Set to true when a tab is opened via keyboard and we still need to move
    // focus into the panel. ButtonFilterList clears this after calling focus.
    const pendingKeyboardFocusRef = useRef(false)
    // Points to the currently-visible SoundFilterTab button so that
    // Escape in the ButtonFilterList can return focus to it.
    const activeTabButtonRef = useRef<HTMLButtonElement>(null)
    const artists = useSelector(sounds.selectFilteredArtists)
    const genres = useSelector(sounds.selectFilteredGenres)
    const instruments = useSelector(sounds.selectFilteredInstruments)
    const keys = useSelector(sounds.selectFilteredKeys)
    const numItemsSelected = useSelector(sounds.selectNumItemsSelected)

    const handleOpen = (key: keyof sounds.Filters) => {
        setCurrentFilterTab(key)
        setUserExpandedTab(key)
        if (currentFilterTab === key) {
            // Panel is already mounted — call focus imperatively right now.
            focusFirstOptionRef.current?.()
        } else {
            // Panel will remount. Set the flag so the mount effect in
            // ButtonFilterList picks it up and calls focus after mounting.
            pendingKeyboardFocusRef.current = true
        }
    }

    return (
        <div>
            <div className="flex flex-row grow justify-between px-1.5 mb-0.5 mt-2.5 mr-2">
                {Object.entries(numItemsSelected).map(([name, num]: [string, number]) => {
                    return <SoundFilterTab
                        key={name}
                        soundFilterKey={name as keyof sounds.Filters}
                        numItemsSelected={num}
                        setCurrentFilterTab={setCurrentFilterTab}
                        currentFilterTab={currentFilterTab}
                        userExpandedTab={userExpandedTab}
                        onOpen={() => handleOpen(name as keyof sounds.Filters)}
                        tabButtonRef={activeTabButtonRef} />
                })}
            </div>

            {currentFilterTab === "artists" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.artists")}
                category="artists"
                ariaListBox={t("ariaDescriptors:sounds.artistFilter")}
                items={artists}
                position="center"
                justification="flex"
                focusFirstOptionRef={focusFirstOptionRef}
                pendingKeyboardFocusRef={pendingKeyboardFocusRef}
                tabButtonRef={activeTabButtonRef}
            />}
            {currentFilterTab === "genres" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.genres")}
                category="genres"
                ariaListBox={t("ariaDescriptors:sounds.genreFilter")}
                items={genres}
                position="center"
                justification="flex"
                focusFirstOptionRef={focusFirstOptionRef}
                pendingKeyboardFocusRef={pendingKeyboardFocusRef}
                tabButtonRef={activeTabButtonRef}
            />}
            {currentFilterTab === "instruments" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.instruments")}
                category="instruments"
                ariaListBox={t("ariaDescriptors:sounds.instrumentFilter")}
                items={instruments}
                position="center"
                justification="flex"
                focusFirstOptionRef={focusFirstOptionRef}
                pendingKeyboardFocusRef={pendingKeyboardFocusRef}
                tabButtonRef={activeTabButtonRef}
            />}
            {currentFilterTab === "keys" && <ButtonFilterList
                title={t("soundBrowser.filterDropdown.keys")}
                category="keys"
                ariaListBox={t("ariaDescriptors:sounds.keyFilter")}
                items={keys}
                position="center"
                justification="keySignatureGrid"
                showMajMinPageOne={showMajMinPageOne}
                setShowMajMinPageOne={setShowMajMinPageOne}
                focusFirstOptionRef={focusFirstOptionRef}
                pendingKeyboardFocusRef={pendingKeyboardFocusRef}
                tabButtonRef={activeTabButtonRef}
            />}
        </div>
    )
}

const NumberOfSounds = () => {
    const { t } = useTranslation()
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length

    return <div className="flex items-center scale:text-xs">
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
                className="scale:mr-1.5 scale:w-4 scale:h-4"
                onChange={() => { dispatch(sounds.setFilterByFavorites(!filterByFavorites)) }}
                disabled={!loggedIn}
                title={t("soundBrowser.button.showOnlyStarsDescriptive")}
                aria-label={t("soundBrowser.button.showOnlyStarsDescriptive")}
                role="checkbox"
                checked={filterByFavorites}
            />
            <span className="scale:text-sm">
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
            <i className="icon icon-plus2 scale:text-xs scale:mr-1" />
            <div className="scale:text-sm">
                {t("soundBrowser.button.addSound")}
            </div>
        </button>
    )
}

type ClipPreviewState = "play" | "loading" | "stop"

interface ClipProps {
    clip: SoundEntity
    bgcolor: string
    borderColor: string
    previewState: ClipPreviewState
    loggedIn: boolean
    isFavorite: boolean
    isUserOwned: boolean
    tabsOpen: boolean
}

const Clip = React.memo(({ clip, bgcolor, borderColor, previewState, loggedIn, isFavorite, isUserOwned, tabsOpen }: ClipProps) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const name = clip.name
    const scaledFontSize = useSelector(appState.selectScaledFontSize)

    const tooltipContent = (
        <div>
            <div>{t("soundBrowser.clip.tooltip.file")}: {name}</div>
            <div>{t("soundBrowser.clip.tooltip.folder")}: {clip.folder}</div>
            <div>{t("soundBrowser.clip.tooltip.artist")}: {clip.artist}</div>
            <div>{t("soundBrowser.clip.tooltip.genre")}: {clip.genre}</div>
            <div>{t("soundBrowser.clip.tooltip.instrument")}: {clip.instrument}</div>
            <div>{t("soundBrowser.clip.tooltip.originalTempo")}: {clip.tempo}</div>
            <div>{t("soundBrowser.clip.tooltip.year")}: {clip.year}</div>
            {clip.keySignature && <div>{t("soundBrowser.clip.tooltip.key")}: {clip.keySignature}</div>}
        </div>
    )

    return (
        <div className="flex flex-row justify-start">
            <div className="h-auto border-l-8 border-blue-300" />
            <div className={`flex grow truncate justify-between py-0.5 ${bgcolor} border ${borderColor}`}>
                <div className="flex items-center min-w-0">
                    <Tooltip.Provider delayDuration={600} disableHoverableContent>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <h5 className="scale:text-sm truncate pl-2 cursor-default" tabIndex={-1}>{name}</h5>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content
                                    side="top"
                                    align="start"
                                    sideOffset={4}
                                    style={{ fontSize: `${scaledFontSize}px` }}
                                    className="scale:text-xs z-50 rounded bg-gray-500 dark:bg-gray-700 px-3 py-2 text-white shadow-lg outline outline-1 outline-gray-400 dark:outline-gray-500 pointer-events-none"
                                >
                                    {tooltipContent}
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>
                <div className="pl-2 pr-4">
                    <button
                        className="scale:text-xs pr-1.5"
                        onClick={() => { dispatch(soundsThunks.togglePreview({ name, kind: "sound" })); addUIClick("sound preview - " + name + (previewState !== "play" ? " stop" : " play")) }}
                        title={t("soundBrowser.clip.tooltip.previewSound")}
                        aria-label={t("ariaDescriptors:sounds.preview", { name })}
                    >
                        {previewState === "stop"
                            ? <i className="icon icon-stop2" />
                            : previewState === "loading"
                                ? <i className="animate-spin es-spinner" />
                                : <i className="icon icon-play4" />}
                    </button>
                    {loggedIn &&
                        (
                            <button
                                className="scale:text-xs px-1.5"
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
                                className="scale:text-xs px-1.5 text-sky-700 dark:text-blue-400"
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
})
Clip.displayName = "Clip"

const ClipList = ({ names }: { names: string[] }) => {
    const entities = useSelector(sounds.selectAllEntities)
    const theme = useSelector(appState.selectColorTheme)
    const preview = useSelector(sounds.selectPreview)
    const previewNodes = useSelector(sounds.selectPreviewNodes)
    const loggedIn = useSelector(user.selectLoggedIn)
    const favorites = useSelector(sounds.selectFavorites)
    const userName = useSelector(user.selectUserName) as string
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length

    const bgcolor = theme === "light" ? "bg-white" : "bg-gray-900"
    const borderColor = theme === "light" ? "border-gray-300" : "border-gray-700"
    const upperUserName = userName?.toUpperCase() ?? ""

    return (
        <div className="flex flex-col">
            {names?.map((v: string) => {
                if (!entities[v]) return null
                const clip = entities[v]
                const isThisClipPlaying = preview?.kind === "sound" && preview.name === v
                const previewState: ClipPreviewState = isThisClipPlaying
                    ? (previewNodes ? "stop" : "loading")
                    : "play"
                return (
                    <Clip
                        key={v}
                        clip={clip}
                        bgcolor={bgcolor}
                        borderColor={borderColor}
                        previewState={previewState}
                        loggedIn={loggedIn}
                        isFavorite={loggedIn && favorites.includes(v)}
                        isUserOwned={loggedIn && clip.folder === upperUserName}
                        tabsOpen={tabsOpen}
                    />
                )
            })}
        </div>
    )
}

interface FolderProps {
    folder: string,
    names: string[],
    index: number,
}

const Folder = ({ folder, names }: FolderProps) => {
    return (<>
        <div className="flex flex-row justify-start sticky top-0 bg-inherit">
            <div
                className="flex grow truncate justify-between items-center pl-2 p-0.5 border-b border-r border-gray-500 dark:border-gray-700 bg-gray-300 dark:bg-gray-800"
                title={folder}
            >
                <h4 className="scale:text-sm truncate">{folder}</h4>
            </div>
        </div>
        <ClipList names={names} />
    </>)
}

interface SoundSearchAndFiltersProps {
    currentFilterTab: keyof sounds.Filters,
    setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
}

const SoundFilters = ({ currentFilterTab, setCurrentFilterTab }: SoundSearchAndFiltersProps) => {
    const dispatch = useDispatch()
    const showPreview = useSelector(appState.selectShowSoundPreviewWidget)
    const loggedIn = useSelector(user.selectLoggedIn)
    const { t } = useTranslation()
    return (
        <div>
            <div className="pb-1">
                <Filters
                    currentFilterTab={currentFilterTab}
                    setCurrentFilterTab={setCurrentFilterTab}/>
            </div>
            <div className="flex justify-between px-1.5 py-1 mb-0.5">
                {loggedIn && <ShowOnlyFavorites />}
                <AddSound />
            </div>
            <h4 className="sr-only">{t("sounds.preview.title").toLocaleUpperCase()}</h4>
            <button
                type="button"
                onClick={() => dispatch(appState.setShowSoundPreviewWidget(!showPreview))}
                aria-expanded={showPreview}
                aria-controls="sound-preview-panel"
                title={showPreview ? t("ariaDescriptors:sounds.preview.close") : t("ariaDescriptors:sounds.preview.open")}
                aria-label={showPreview ? t("ariaDescriptors:sounds.preview.close") : t("ariaDescriptors:sounds.preview.open")}
                className="flex bg-blue text-white w-full justify-center items-center gap-1 text-sm p-1"
            >
                <span>{t("sounds.preview.title").toLocaleUpperCase()}</span>
                <i className={`icon ${showPreview ? "icon-arrow-up3" : "icon-arrow-down3"} text-xs`} aria-hidden="true" />
            </button>
            <div
                id="sound-preview-panel"
                aria-hidden={!showPreview}
                style={{ display: showPreview ? undefined : "none" }}
                className="bg-blue"
            >
                <SoundPreview />
            </div>
        </div>
    )
}

const SoundPreview = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()

    const [recommendationMode, setRecommendationMode] = useState(0)

    // folder-structured filtered data
    const folders = useSelector(sounds.selectFilteredRegularFolders)
    const namesByFolders = useSelector(sounds.selectFilteredRegularNamesByFolders)
    const filters = useSelector(sounds.selectFilters)

    // preview state
    const preview = useSelector(sounds.selectPreview)
    const previewNodes = useSelector(sounds.selectPreviewNodes)

    const loggedIn = useSelector(user.selectLoggedIn)
    const favorites = useSelector(sounds.selectFavorites)
    const tabsOpen = !!useSelector(tabs.selectOpenTabs).length

    // Build a folder-first queue: [{folder, name}, ...]
    const [queue, setQueue] = useState<Array<{ folder: string; name: string }>>([])

    useEffect(() => {
        (async () => {
            setQueue([])
            const out: Array<{ folder: string; name: string }> = []
            if (recommendationMode) {
                console.log(filters.artists)
                const recommendations = await recommend([], 1, 1, filters.genres, filters.instruments, [], 100, filters.keys, filters.artists)
                for (const name of recommendations) out.push({ folder: "", name })
            } else {
                for (const folder of folders) {
                    const names: string[] = namesByFolders?.[folder] ?? []
                    for (const name of names) out.push({ folder, name })
                }
            }
            setQueue(out)
        })()
    }, [folders, namesByFolders, recommendationMode, filters])

    const [index, setIndex] = useState(0)

    // Reset to the first sound whenever filters/search change the queue
    useEffect(() => {
        setIndex(0)
    }, [queue.map((x) => `${x.folder}/${x.name}`).join("|")])

    const current = queue[index] ?? null
    const currentName = current?.name ?? null

    const isFavorite = useMemo(() => {
        if (!loggedIn || !currentName) return false
        return favorites.includes(currentName)
    }, [loggedIn, favorites, currentName])

    const canPrev = index > 0
    const canNext = index < queue.length - 1

    const stopIfPlaying = (name: string | null) => {
        if (!name) return
        if (preview?.kind === "sound" && preview.name === name) {
            dispatch(soundsThunks.togglePreview({ name, kind: "sound" })) // OFF
        }
    }

    const playNow = (name: string | null) => {
        if (!name) return

        if (preview?.kind === "sound" && preview.name && preview.name !== name) {
            dispatch(soundsThunks.togglePreview({ name: preview.name, kind: "sound" })) // OFF old
        }

        if (!(preview?.kind === "sound" && preview.name === name)) {
            dispatch(soundsThunks.togglePreview({ name, kind: "sound" })) // ON new
        }
    }

    const goTo = (nextIndex: number) => {
        const next = queue[nextIndex]
        if (!next) return
        stopIfPlaying(currentName)
        setIndex(nextIndex)
        playNow(next.name)
    }

    const goPrev = () => canPrev && goTo(index - 1)
    const goNext = () => canNext && goTo(index + 1)

    // stop reliably on unmount (no stale preview)
    useEffect(() => {
        return () => {
            const state = store.getState()
            const p = state.sounds?.preview?.value ?? state.sounds?.preview
            if (p?.kind === "sound" && p.name) {
                dispatch(soundsThunks.togglePreview({ name: p.name, kind: "sound" }))
            }
        }
    }, [dispatch])

    /**
     * Keyboard navigation (ONLY when player is focused)
     */
    const playerRef = useRef<HTMLDivElement>(null)

    const onPlayerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

        switch (e.key) {
            case "j":
            case "J":
            case "ArrowLeft":
                e.preventDefault()
                goPrev()
                break

            case "l":
            case "L":
            case "ArrowRight":
                e.preventDefault()
                goNext()
                break

            case "k":
            case "K":
                e.preventDefault()
                if (!currentName) return
                dispatch(soundsThunks.togglePreview({ name: currentName, kind: "sound" }))
                break
        }
    }

    const focusPlayer = () => {
        playerRef.current?.focus()
    }

    const copyToClipboard = (value: string) => {
        window.navigator.clipboard.writeText(value)
    }
    const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
    const [bufferReady, setBufferReady] = useState(false)

    useEffect(() => {
        setBufferReady(false)
        if (!currentName) return
        let cancelled = false
        audioLibrary.getSound(currentName).then((sound) => {
            if (!cancelled && sound) {
                setBuffer(sound.buffer)
                setBufferReady(true)
            }
        })
        return () => { cancelled = true }
    }, [currentName])

    return (
        <div className="flex border border-blue flex-col items-center justify-center bg-white dark:bg-transparent">
            <div className="flex items-center text-sm mt-2 text-center">
                <div className="max-w-52 truncate" title={currentName ?? t("soundBrowser.noSoundsFound")}>{currentName ?? t("soundBrowser.noSoundsFound")}</div>
                {currentName && <button aria-label={t("scriptShare.copyClipboard")} onClick={() => { copyToClipboard(currentName) }} className="text-blue-400 hover:text-blue-600 active:text-blue-950 text-sm p-2" title={t("scriptShare.copyClipboard")}>
                    <i className="icon icon-copy"></i>
                </button>}
            </div>

            <div
                ref={playerRef}
                tabIndex={0}
                role="group"
                aria-label={t("ariaDescriptors:sounds.preview.player")}
                onKeyDown={onPlayerKeyDown}
                onMouseDown={focusPlayer}
                className="w-full max-w-4xl outline-none rounded-2xl focus-visible:ring-2 focus-visible:ring-black"
            >
                <div className="flex items-center justify-center px-6">
                    {bufferReady && buffer
                        ? <Waveform buffer={buffer} fluid height={40} />
                        : <div style={{ width: "100%", height: 40 }} className="flex items-center justify-center text-xs text-gray-400">
                            {currentName ? <i className="animate-spin es-spinner" /> : null}
                        </div>}
                </div>

                <div className="flex items-center justify-evenly mt-2">
                    <button
                        type="button"
                        onClick={() => setRecommendationMode(1 - recommendationMode)}
                        aria-label={recommendationMode ? t("ariaDescriptors:sounds.preview.switchToOrderedMode") : t("ariaDescriptors:sounds.preview.switchToRecommendationMode")}
                        title={recommendationMode ? t("ariaDescriptors:sounds.preview.switchToOrderedMode") : t("ariaDescriptors:sounds.preview.switchToRecommendationMode")}
                        className="sound-btn-ghost"
                    >
                        {recommendationMode ? <i className="icon icon-star" /> : <i className="icon icon-list2" />}
                    </button>

                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={!canPrev}
                        aria-label={t("ariaDescriptors:sounds.preview.previousSound")}
                        title={t("ariaDescriptors:sounds.preview.previousTitle")}
                        className="sound-btn-ghost"
                    >
                        <i className="icon icon-first"></i>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!currentName) return
                            dispatch(soundsThunks.togglePreview({ name: currentName, kind: "sound" }))
                        }}
                        disabled={!currentName}
                        aria-label={preview?.kind === "sound" && preview.name === currentName ? t("ariaDescriptors:sounds.preview.stop") : t("ariaDescriptors:sounds.preview.play")}
                        title={preview?.kind === "sound" && preview.name === currentName ? t("ariaDescriptors:sounds.preview.stop") : t("ariaDescriptors:sounds.preview.play")}
                        className="sound-btn-main"
                    >
                        {preview?.kind === "sound" && preview.name === currentName
                            ? (
                                previewNodes
                                    ? (
                                        <i className="icon icon-stop2"></i>
                                    )
                                    : (
                                        <div className="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full" />
                                    )
                            )
                            : (
                                <i className="icon icon-play4"></i>
                            )}
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={!canNext}
                        aria-label={t("ariaDescriptors:sounds.preview.nextSound")}
                        title={t("ariaDescriptors:sounds.preview.nextTitle")}
                        className="sound-btn-ghost"
                    >
                        <i className="icon icon-last"></i>
                    </button>

                    {loggedIn && (
                        <button
                            className="text-xs px-1.5"
                            onClick={() => {
                                if (!currentName) return
                                dispatch(soundsThunks.markFavorite({ name: currentName, isFavorite }))
                            }}
                            title={t("soundBrowser.clip.tooltip.markFavorite")}
                            aria-label={t("soundBrowser.clip.tooltip.markFavorite")}
                            disabled={!currentName}
                        >
                            {isFavorite
                                ? (
                                    <i className="icon icon-star-full2 text-orange-600" />
                                )
                                : (
                                    <i className="icon icon-star-empty3 text-orange-600" />
                                )}
                        </button>
                    )}

                    {tabsOpen && (
                        <button
                            className="text-xs px-1.5 text-sky-700 dark:text-blue-400"
                            onClick={() => {
                                if (!currentName) return
                                editor.pasteCode(currentName)
                                addUIClick("sound copy - " + currentName)
                            }}
                            title={t("soundBrowser.clip.tooltip.paste")}
                            aria-label={t("ariaDescriptors:sounds.paste", { name: currentName })}
                            disabled={!currentName}
                        >
                            <i className="icon icon-paste2" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// Context to pass SoundFilters props into the stable Virtuoso Header component.
interface SoundFiltersContextValue {
    currentFilterTab: keyof sounds.Filters
    setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
}
const SoundFiltersContext = React.createContext<SoundFiltersContextValue | null>(null)

// Defined once at module scope so its identity is always stable.
// react-window's innerElementType wraps the absolutely-positioned item slots.
// We render SoundFilters here in normal flow, then add padding-top equal to
// filterHeight so that react-window's absolute-positioned items are pushed down
// to start below the filters. SoundFilters is never touched by react-window so
// focus inside it is completely stable.
const SoundListHeader = ({ currentFilterTab, setCurrentFilterTab, t }: {
    currentFilterTab: keyof sounds.Filters,
    setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>,
    t: (key: string) => string
}) => (
    <>
        <h3 className="sr-only">{t("soundBrowser.filterHeader")}</h3>
        <SoundFilters
            currentFilterTab={currentFilterTab}
            setCurrentFilterTab={setCurrentFilterTab}
        />
        <h3 className="sr-only">{t("soundBrowser.soundHeader")}</h3>
    </>
)

const WindowedSoundCollection = ({ folders, namesByFolders, currentFilterTab, setCurrentFilterTab }: {
    title: string, folders: string[], namesByFolders: any, currentFilterTab: keyof sounds.Filters, setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
}) => {
    const { t } = useTranslation()
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
    const dispatch = useDispatch()
    const numItemsSelected = useSelector(sounds.selectNumItemsSelected)
    const showFavoritesSelected = useSelector(sounds.selectFilterByFavorites)
    const searchText = useSelector(sounds.selectSearchText)
    const clearButtonEnabled = Object.values(numItemsSelected).some(x => x > 0) || showFavoritesSelected || searchText
    const clearClassnames = classNames({
        "scale:text-sm flex items-center rounded pl-1 pr-1.5 border whitespace-nowrap": true,
        "text-red-800 border-red-800 bg-red-50": clearButtonEnabled,
        "text-gray-200 border-gray-200": !clearButtonEnabled,
    })
    const scrollToTopRef = useRef<HTMLDivElement>(null)

    const soundListClassnames = "grow min-h-0 overflow-hidden"
    const extraFilterControlsClassnames = "sticky top-0 bg-white dark:bg-gray-900 flex justify-between items-end pl-1.5 pr-4 py-1 mb-0.5 transition-transform ease-in-out duration-200"
    const scrolltoTopClassnames = "absolute bottom-4 right-4 z-10 opacity-0 transform translate-y-full transition-all duration-300 pointer-events-none"

    const virtuosoRef = useRef<VirtuosoHandle>(null)

    const Header = useMemo(() => {
        const SoundBrowserHeader = () => (
            <SoundListHeader
                currentFilterTab={currentFilterTab}
                setCurrentFilterTab={setCurrentFilterTab}
                t={t}
            />
        )
        SoundBrowserHeader.displayName = "SoundBrowserHeader"
        return SoundBrowserHeader
    }, [currentFilterTab, setCurrentFilterTab])

    const overscanSize = Math.round(2500 * scalar)
    const increaseViewportSize = Math.round(3500 * scalar)

    const itemContent = useCallback((index: number, folder: string) => (
        <Folder
            folder={folder}
            names={namesByFolders[folder]}
            index={index}
        />
    ), [namesByFolders])

    return (
        <div className="flex flex-col grow min-h-0 relative">
            <SoundSearchBar />
            <div className={extraFilterControlsClassnames}>
                <button
                    className={clearClassnames}
                    onClick={() => {
                        dispatch(sounds.resetAllFilters())
                        reloadRecommendations()
                    }}
                    disabled={!clearButtonEnabled}
                    title={t("ariaDescriptors:sounds.clearFilter")}
                    aria-label={t("ariaDescriptors:sounds.clearFilter")}
                >
                    <span className="icon icon-cross3 scale:text-base pr-0.5"></span>{t("soundBrowser.clearFilters")}
                </button>
                <NumberOfSounds/>
            </div>
            <SoundFiltersContext.Provider value={{ currentFilterTab, setCurrentFilterTab }}>
                <div className={soundListClassnames}>
                    <Virtuoso
                        ref={virtuosoRef}
                        overscan={overscanSize}
                        increaseViewportBy={{ top: increaseViewportSize, bottom: increaseViewportSize }}
                        data={folders}
                        onScroll={(e) => {
                            const scrollOffset = (e.target as HTMLElement).scrollTop
                            if (scrollToTopRef.current) {
                                if (scrollOffset > 0) {
                                    scrollToTopRef.current.style.opacity = "1"
                                    scrollToTopRef.current.style.transform = "translateY(0)"
                                    scrollToTopRef.current.style.pointerEvents = "auto"
                                } else {
                                    scrollToTopRef.current.style.opacity = "0"
                                    scrollToTopRef.current.style.transform = "translateY(100%)"
                                    scrollToTopRef.current.style.pointerEvents = "none"
                                }
                            }
                        }}
                        components={{
                            Header,
                        }}
                        itemContent={itemContent}
                    />
                </div>
            </SoundFiltersContext.Provider>

            <div ref={scrollToTopRef} className={scrolltoTopClassnames}>
                <button className="px-3 py-2 rounded text-white bg-blue scale:text-sm  shadow-lg transition-all duration-200 hover:text-amber hover:shadow-xl"
                    onClick={() => virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "smooth" })} title={t("soundBrowser.button.backToTop")}>
                    <i className="icon icon-arrow-up3"></i>
                </button>
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
        <div className="grow min-h-0 flex flex-col justify-start" role="tabpanel" id={"panel-" + BrowserTabType.Sound}>
            <DefaultSoundCollection />
        </div>
    )
}
