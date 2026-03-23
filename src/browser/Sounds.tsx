import React, { useRef, useEffect, ChangeEvent, useState, createRef, useLayoutEffect, useContext, useMemo } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"
import AutoSizer from "react-virtualized-auto-sizer"
import { Virtuoso, VirtuosoHandle } from "react-virtuoso"
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
            <div className="flex flex-row gap-x-1">
                <span className="rounded-full inline-flex w-1 mr-2">
                    <i className={`icon-checkmark3 text-sm w-full ${selected ? "block" : "hidden"}`} aria-hidden="true" />
                </span>
                <div className="text-xs select-none mr-4">
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
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14

    const majorButtonClass = classNames({
        "py-1.5 px-2 border-y border-l rounded-l": true,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-r": showMajMinPageOne,
        "border-slate-200": !showMajMinPageOne,
    })
    const minorButtonClass = classNames({
        "py-1.5 px-2 border-y border-r rounded-r": true,
        "border-slate-200": showMajMinPageOne,
        "bg-slate-200 dark:bg-slate-600 border-slate-400 border-l": !showMajMinPageOne,
    })
    return <div className="flex items-center justify-center mb-1">
        <div className="inline-flex" role="radiogroup" aria-label="Key type">
            <button
                role="radio"
                aria-checked={showMajMinPageOne}
                className={majorButtonClass}
                style={{ fontSize: `${0.75 * scalar}rem` }}
                onClick={chooseMaj}
            >Major</button>
            <button
                role="radio"
                aria-checked={!showMajMinPageOne}
                className={minorButtonClass}
                style={{ fontSize: `${0.75 * scalar}rem` }}
                onClick={chooseMin}
            >Minor</button>
        </div>
    </div>
}

const SoundFilterTab = ({ soundFilterKey, numItemsSelected, setCurrentFilterTab, currentFilterTab, userExpandedTab, onOpen, tabButtonRef }: { soundFilterKey: keyof sounds.Filters, numItemsSelected: number, setCurrentFilterTab: (current: keyof sounds.Filters) => void, currentFilterTab: keyof sounds.Filters, userExpandedTab: keyof sounds.Filters | null, onOpen: () => void, tabButtonRef: React.RefObject<HTMLButtonElement> }) => {
    const { t } = useTranslation()
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
    
    const isCurrentTab = currentFilterTab === soundFilterKey
    const isExpanded = userExpandedTab === soundFilterKey
    const tabClass = classNames({
        "uppercase rounded p-1 min-w-1/5 max-w-1/4 text-black bg-gray-200": true,
        "bg-amber": isCurrentTab,
    })
    const spanClass = "absolute -top-[0.6rem] right-[-8px] inline-flex items-center justify-center px-1 py-0.5 z-10 font-bold leading-none text-white bg-blue shadow rounded-full"

    return (
        <div className="flex flex-row flex-wrap">
            <div className="relative inline-block">
                {numItemsSelected > 0
                    ? <div className={spanClass} style={{ fontSize: `${0.75 * scalar}rem` }} aria-hidden="true">{numItemsSelected}</div>
                    : null}
                <button
                    ref={isCurrentTab ? tabButtonRef : undefined}
                    aria-expanded={isExpanded}
                    aria-controls={`sound-filter-panel-${soundFilterKey}`}
                    className={tabClass}
                    style={{ fontSize: `${0.75 * scalar}rem` }}
                    
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
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
    const numFiltered = useSelector(sounds.selectFilteredRegularNames).length

    return <div className="flex items-center" style={{ fontSize: `${0.75 * scalar}rem` }}>
        {t("numSounds", { count: numFiltered })}
    </div>
}

const ShowOnlyFavorites = () => {
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const filterByFavorites = useSelector(sounds.selectFilterByFavorites)
    const loggedIn = useSelector(user.selectLoggedIn)

    return (
        <label className="flex items-center" style={{ opacity: loggedIn ? "1" : "0" }}>
            <input
                type="checkbox"
                style={{ width: `${0.875 * scalar}rem`, height: `${0.875 * scalar}rem` }}
                className="mr-1.5"
                onChange={() => { dispatch(sounds.setFilterByFavorites(!filterByFavorites)) }}
                disabled={!loggedIn}
                title={t("soundBrowser.button.showOnlyStarsDescriptive")}
                aria-label={t("soundBrowser.button.showOnlyStarsDescriptive")}
                role="checkbox"
                checked={filterByFavorites}
            />
            <span style={{ fontSize: `${0.875 * scalar}rem` }}>
                {t("soundBrowser.button.showOnlyStars")}
                <i className="icon icon-star-full2 text-orange-600 ml-1" />
            </span>
        </label>
    )
}

const AddSound = () => {
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
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
            <i className="icon icon-plus2 mr-1" style={{ fontSize: `${0.75 * scalar}rem` }} />
            <div style={{ fontSize: `${0.875 * scalar}rem` }}>
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
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14

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
                    <h5 className="truncate pl-2" style={{ fontSize: `${0.875 * scalar}rem` }}>{name}</h5>
                </div>
                <div className="pl-2 pr-4">
                    <button
                        className="pr-1.5"
                        style={{ fontSize: `${0.75 * scalar}rem` }}
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
                                className="px-1.5"
                                style={{ fontSize: `${0.75 * scalar}rem` }}
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
                                className="px-1.5 text-sky-700 dark:text-blue-400"
                                onClick={() => { editor.pasteCode(name); addUIClick("sound copy - " + name) }}
                                style={{ fontSize: `${0.75 * scalar}rem` }}
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
        <div className="flex flex-col mb-2">
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
}

const Folder = ({ folder, names }: FolderProps) => {
    const fontSize = useSelector(appState.selectFontSize)
    const scalar = fontSize / 14
    return (
        <div>
            <div className="flex flex-row justify-start sticky top-0 bg-inherit z-10 bg-gray-300 dark:bg-gray-800">
                <div
                    className="flex grow truncate justify-between items-center pl-2 p-0.5 border-b border-r border-gray-500 dark:border-gray-700 bg-gray-300 dark:bg-gray-800"
                    title={folder}
                >
                    <h4 className="truncate" style={{ fontSize: `${0.875 * scalar}rem` }}>{folder}</h4>
                </div>
            </div>
            <ClipList names={names} />
        </div>
    )
}

interface SoundSearchAndFiltersProps {
    currentFilterTab: keyof sounds.Filters,
    setCurrentFilterTab: React.Dispatch<React.SetStateAction<keyof sounds.Filters>>
}

const SoundFilters = ({ currentFilterTab, setCurrentFilterTab }: SoundSearchAndFiltersProps) => {
    const filterRef = useRef<HTMLDivElement>(null)
    
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
        </div>
    )
}

// Context to pass SoundFilters props into the stable innerElementType without
// recreating it (which would cause react-window to remount).
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
        "text-sm flex items-center rounded pl-1 pr-1.5 border": true,
        "text-red-800 border-red-800 bg-red-50": clearButtonEnabled,
        "text-gray-200 border-gray-200": !clearButtonEnabled,
    })
    const scrollToTopRef = useRef<HTMLDivElement>(null)

    const soundListClassnames = "grow"
    const extraFilterControlsClassnames = "sticky top-0 bg-white dark:bg-gray-900 flex justify-between items-end pl-1.5 pr-4 py-1 mb-0.5 transition-transform ease-in-out duration-200"
    const scrolltoTopClassnames = "absolute bottom-4 right-4 z-10 opacity-0 transform translate-y-full transition-all duration-300 pointer-events-none"

    const virtuosoRef = useRef<VirtuosoHandle>(null)

    const Header = useMemo(() => () => (
        <SoundListHeader
            currentFilterTab={currentFilterTab}
            setCurrentFilterTab={setCurrentFilterTab}
            t={t}
        />
    ), [currentFilterTab, setCurrentFilterTab])

    return (
        <div className="flex flex-col grow relative">
            <SoundSearchBar />
            <div className={extraFilterControlsClassnames}>
                <button
                    className={clearClassnames}
                    style={{ fontSize: `${0.875 * scalar}rem` }}
                    onClick={() => {
                        dispatch(sounds.resetAllFilters())
                        reloadRecommendations()
                    }}
                    disabled={!clearButtonEnabled}
                    title={t("ariaDescriptors:sounds.clearFilter")}
                    aria-label={t("ariaDescriptors:sounds.clearFilter")}
                >
                    <span className="icon icon-cross3 pr-0.5"></span>{t("soundBrowser.clearFilters")}
                </button>
                <NumberOfSounds/>
            </div>
            <SoundFiltersContext.Provider value={{ currentFilterTab, setCurrentFilterTab }}>
                <div className={soundListClassnames}>
                    <AutoSizer>
                        {({ height, width }: { height: number, width: number }) => (
                            <Virtuoso
                                ref={virtuosoRef}
                                style={{ height, width }}
                                overscan={2500}
                                increaseViewportBy={{ top: 3500, bottom: 3501 }}
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
                                    Header
                                }}
                                itemContent={(index, folder) => (
                                    <Folder
                                        folder={folder}
                                        names={namesByFolders[folder]}
                                        index={index}
                                    />
                                )}
                            />
                        )}
                    </AutoSizer>
                </div>
            </SoundFiltersContext.Provider>
                            
            <div ref={scrollToTopRef} className={scrolltoTopClassnames}>
                <button className="px-3 py-2 rounded text-white bg-blue text-sm  shadow-lg transition-all duration-200 hover:text-amber hover:shadow-xl"
                    onClick={() => virtuosoRef.current?.scrollToIndex({ index: 0, behavior: 'smooth' })} title={t("soundBrowser.button.backToTop")}>
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
        <div className="grow flex flex-col justify-start" role="tabpanel" id={"panel-" + BrowserTabType.Sound}>
            <DefaultSoundCollection />
        </div>
    )
}
