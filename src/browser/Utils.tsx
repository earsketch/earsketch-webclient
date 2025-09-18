import React, { ChangeEventHandler, MouseEventHandler, LegacyRef, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as student from "../cai/dialogue/student"

import * as soundsState from "./soundsState"
import AudioSearchEngine from "./clapSearch"

interface SearchBarProps {
    searchText: string
    aria?: string
    id?: string
    highlight?: boolean
    dispatchSearch: ChangeEventHandler<HTMLInputElement>
    dispatchReset: MouseEventHandler<HTMLElement>
}
export const SearchBar = ({ searchText, dispatchSearch, dispatchReset, id, highlight }: SearchBarProps) => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()
    const [audioSearchEngine] = useState(() => new AudioSearchEngine())
    const [isAudioEngineReady, setIsAudioEngineReady] = useState(false)
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        const initializeEngine = async () => {
            try {
                await audioSearchEngine.initialize()
                setIsAudioEngineReady(true)
                console.log("Audio search engine ready")
            } catch (error) {
                console.error("Failed to initialize audio search engine:", error)
            }
        }

        initializeEngine()
    }, [audioSearchEngine])

    useEffect(() => {
        const handleAudioSearch = async () => {
            if (!searchText.toLowerCase().startsWith("clap:")) {
                // Clear audio search if not a clap query
                dispatch(soundsState.clearAudioSearch())
                return
            }

            if (!isAudioEngineReady) return

            const query = searchText.slice(5).trim() // Remove "clap:" prefix
            if (query.length === 0) {
                dispatch(soundsState.clearAudioSearch())
                return
            }

            setIsSearching(true)
            console.log(query)
            try {
                const filenames = await audioSearchEngine.searchFilenames(query, 10)
                dispatch(soundsState.setAudioSearchResults(filenames))
            } catch (error) {
                console.error("Audio search failed:", error)
                dispatch(soundsState.clearAudioSearch())
            } finally {
                setIsSearching(false)
            }
        }
        const timeoutId = setTimeout(handleAudioSearch, 500)
        return () => clearTimeout(timeoutId)
    }, [searchText, isAudioEngineReady, audioSearchEngine, dispatch])

    const isAudioSearch = searchText.toLowerCase().startsWith("clap:")

    return (<form
        className={`p-1.5 pb-1 ${(highlight ? "border-yellow-500 border-4" : "")}`}
        onSubmit={e => e.preventDefault()}
    >
        <label className={`w-full border-b-2 flex justify-between items-center ${
            theme === "light" ? "border-black" : "border-white"
        } ${isAudioSearch ? "border-blue-500" : ""}`}>
            <input
                id={id}
                className="w-full outline-none p-1 bg-transparent font-normal text-sm"
                type="text"
                placeholder={isAudioEngineReady
                    ? t("search") + " (use 'clap: your query' for audio search)"
                    : t("search") + " (loading audio search...)"}
                value={searchText}
                onChange={dispatchSearch}
                onKeyDown={(e) => { student.addUIClick(id + ": " + e.key) }}
                onFocus={() => { if (highlight) { dispatch(caiState.setHighlight({ zone: null })) } }}
            />
            <div className="flex items-center">
                {isAudioSearch && (isSearching || !isAudioEngineReady) && (
                    <div className="flex items-center mr-2">
                        {isSearching
                            ? (
                                <i className="icon-spinner animate-spin text-blue-500" />
                            )
                            : (
                                <i className="icon-music text-gray-400" />
                            )}
                    </div>
                )}
                {searchText.length !== 0 && (
                    <i
                        className="icon-cross2 pr-1 cursor-pointer"
                        onClick={dispatchReset}
                    />
                )}
            </div>
        </label>
        {isAudioSearch && (
            <div className="text-xs text-gray-500 mt-1">
                {!isAudioEngineReady
                    ? (
                        "Loading audio search engine..."
                    )
                    : isSearching
                        ? (
                            "Searching audio files..."
                        )
                        : searchText.slice(5).trim().length > 0
                            ? (
                                `Audio search: "${searchText.slice(5).trim()}"`
                            )
                            : (
                                "Enter your audio search query after 'clap:'"
                            )}
            </div>
        )}
    </form>
    )
}

interface DropdownMultiSelectorProps {
    title: string
    category: string
    aria?: string
    items: string[]
    position: "center" | "left" | "right"
    numSelected?: number
    FilterItem: React.FC<any>
}

export const DropdownMultiSelector = ({ title, category, aria, items, position, numSelected, FilterItem }: DropdownMultiSelectorProps) => {
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()
    const [showTooltip, setShowTooltip] = useState(false)
    const [referenceElement, setReferenceElement] = useState<HTMLDivElement|null>(null)
    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null)
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: "offset", options: { offset: [0, 5] } }],
    })

    const handleClick = (event: Event) => {
        setPopperElement(ref => {
            setReferenceElement(rref => {
                const target = event.target as Node
                // TODO: Pretty hacky way to get the non-null (popper-initialized) multiple refs. Refactor if possible.
                if (!ref?.contains(target) && !rref?.contains(target)) {
                    setShowTooltip(false)
                }
                return rref
            })
            return ref
        })
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    let margin
    if (position === "left") margin = "mr-2"
    else if (position === "right") margin = "ml-2"
    else margin = "mx-1"

    return (<>
        <div
            ref={setReferenceElement as LegacyRef<HTMLDivElement>}
            onClick={() => {
                setShowTooltip(show => {
                    update?.()
                    return !show
                })
            }}
            tabIndex={0}
            className={`flex justify-between vertical-center w-1/3 truncate border-b-2 cursor-pointer select-none ${margin} ${theme === "light" ? "border-black" : "border-white"}`}
            aria-label={category === "sortBy" ? t("scriptBrowser.filterDropdown.sortBy") : t("scriptBrowser.filterDropdown.filterBy", { filter: aria })}
            title={category === "sortBy" ? t("scriptBrowser.filterDropdown.sortBy") : t("scriptBrowser.filterDropdown.filterBy", { filter: aria })}
        >
            <div className="flex justify-left truncate text-sm">
                <div className="truncate min-w-0">
                    {title}
                </div>
                <div className="ml-1">
                    {numSelected ? `(${numSelected})` : ""}
                </div>
            </div>
            <i className="icon icon-arrow-down2 text-xs p-1" />
        </div>
        <div
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showTooltip ? styles.popper : { display: "none" }}
            {...attributes.popper}
            className={`border border-black p-2 z-50 ${theme === "light" ? "bg-white" : "bg-black"}`}
            role="listbox"
            aria-multiselectable="true"
        >
            <div role="option">
                <FilterItem
                    category={category}
                    isClearItem={true}
                />
                {items.map((item, index) => <FilterItem
                    key={index}
                    value={item}
                    category={category}
                />)}
            </div>
        </div>
    </>)
}

export const Collection = ({ title, visible = true, initExpanded = true, className = "", children }: {
    title: string, visible: boolean, initExpanded: boolean, className?: string, children: React.ReactNode
}) => {
    const [expanded, setExpanded] = useState(initExpanded)
    const filteredTitle = title.replace(/\([^)]*\)/g, "")
    const { t } = useTranslation()

    return (
        <div className={`${visible ? "flex" : "hidden"} flex-col justify-start ${className} ${expanded ? "grow" : "grow-0"}`}>
            <div className="flex flex-row grow-0 justify-start" tabIndex={-1}>
                {expanded &&
                    (<div className="h-auto border-l-4 border-amber" />)}
                {/* TODO: Should this have an ARIA role such as "treegrid"? */}
                <div
                    className="flex grow justify-between items-center py-1 pl-2 text-amber bg-blue hover:bg-gray-700 border-t border-gray-600 cursor-pointer select-none truncate"
                    title={title}
                    onClick={() => setExpanded(v => !v)}
                >
                    <h4 className="flex items-center truncate py-1">
                        <i className="icon-album pr-1.5" />
                        <div className="truncate">{title}</div>
                    </h4>
                    <div className="w-1/12">
                        {expanded
                            ? <button className="icon icon-arrow-down2" title={t("thing.collapse", { name: filteredTitle })} aria-expanded={true} aria-label={t("thing.collapse", { name: filteredTitle })}> </button>
                            : <button className="icon icon-arrow-right2" title={t("thing.expand", { name: filteredTitle })} aria-expanded={false} aria-label={t("thing.expand", { name: filteredTitle })}> </button>}
                    </div>
                </div>
            </div>
            <div className="grow">
                {expanded && children}
            </div>
        </div>
    )
}

export const Collapsed = ({ position = "west", title = null }: { position: "west" | "east", title: string | null }) => {
    const embedMode = useSelector(appState.selectEmbedMode)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <button
            className={`${embedMode ? "hidden" : "flex"} flex-col h-full cursor-pointer items-center`}
            onClick={() => {
                position === "west" ? dispatch(layout.setWest({ open: true })) : dispatch(layout.setEast({ open: true }))
            }}
            aria-label={t("ariaDescriptors:general.openPanel", { panelName: title })}
            title={t("ariaDescriptors:general.openPanel", { panelName: title })}
        >
            <div className="flex justify-start w-7 h-4 p-0.5 m-3 rounded-full bg-black dark:bg-gray-700">
                <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
            </div>
            <div
                className={`
                        flex grow justify-center
                        whitespace-nowrap font-semibold cursor-pointer tracking-widest
                        text-gray-600 dark:text-gray-300
                        vertical-text ${position === "west" ? "rotate-180" : ""}
                    `}
            >
                {title}
            </div>
        </button>
    )
}
