import React, { ChangeEventHandler, LegacyRef, MouseEventHandler, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { usePopper } from "react-popper"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import { SoundBrowser } from "./Sounds"
import { ScriptBrowser } from "./Scripts"
import { APIBrowser } from "./API"
import { RootState } from "../reducers"
import { BrowserTabType } from "../ide/layoutState"

const darkBgColor = "#223546"

export const TitleBar = () => {
    const theme = useSelector(appState.selectColorTheme)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className="flex items-center p-3 text-2xl"
            style={{ minHeight: "fit-content" }} // Safari-specific issue
        >
            <div className="pl-3 pr-4 font-semibold truncate">
                {t("contentManager.title").toLocaleUpperCase()}
            </div>
            <div>
                <div
                    className={`flex justify-end w-12 h-7 p-1 rounded-full cursor-pointer ${theme === "light" ? "bg-black" : "bg-gray-700"}`}
                    onClick={() => {
                        dispatch(layout.setWest({ open: false }))
                    }}
                    aria-label={`Collapse ${t("contentManager.title")}`}
                    title={`Collapse ${t("contentManager.title")}`}
                    role="button"
                >
                    <div className="w-5 h-5 bg-white rounded-full">&nbsp;</div>
                </div>
            </div>
        </div>
    )
}

const BrowserTab = ({ name, type, children }: { name: string, type: BrowserTabType, children: React.ReactNode }) => {
    const dispatch = useDispatch()
    const isSelected = useSelector(layout.selectWestKind) === type

    return (
        <div
            className={`p-3 w-1/3 cursor-pointer ${isSelected ? "border-b-4" : ""} truncate`}
            style={isSelected
                ? {
                    color: "#F5AE3C",
                    borderColor: "#F5AE3C",
                }
                : {}}
            onClick={() => dispatch(layout.setWest({
                open: true,
                kind: type,
            }))}
            title={`Open ${name} Tab`}
            aria-label={`Open ${name} Tab`}
        >
            {children}
            {name}
        </div>
    )
}

export const BrowserTabs = () => {
    const { t } = useTranslation()
    return (
        <div
            className="flex justify-between text-center"
            id="browser-tabs"
            style={{
                backgroundColor: darkBgColor,
                color: "white",
                minHeight: "fit-content", // Safari-specific issue
            }}
        >
            <BrowserTab name={t("soundBrowser.title").toLocaleUpperCase()} type={BrowserTabType.Sound}>
                <i className="icon-headphones pr-2" />
            </BrowserTab>
            <BrowserTab name={t("script", { count: 0 }).toLocaleUpperCase()} type={BrowserTabType.Script}>
                <i className="icon-embed2 pr-2" />
            </BrowserTab>
            <BrowserTab name="API" type={BrowserTabType.API}>
                <i className="icon-book pr-2" />
            </BrowserTab>
        </div>
    )
}

export const Header = ({ title }: { title: string }) => (
    <div className="p-3 text-2xl hidden">{title}</div>
)

interface SearchBarProps {
    searchText: string
    aria?: string
    dispatchSearch: ChangeEventHandler<HTMLInputElement>
    dispatchReset: MouseEventHandler<HTMLElement>
}
export const SearchBar = ({ searchText, aria, dispatchSearch, dispatchReset }: SearchBarProps) => {
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()

    return (
        <form className="p-3 pb-1" onSubmit={e => e.preventDefault()}>
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === "light" ? "border-black" : "border-white"}`}>
                <input
                    className="w-full outline-none p-1 bg-transparent font-normal"
                    type="text"
                    placeholder={t("search")}
                    value={searchText}
                    onChange={dispatchSearch}
                />
                {searchText.length !== 0 &&
                    (
                        <i
                            className="icon-cross2 pr-1 cursor-pointer"
                            onClick={dispatchReset}
                        />
                    )}
            </label>
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
    const [showTooltip, setShowTooltip] = useState(false)
    const [referenceElement, setReferenceElement] = useState<HTMLDivElement|null>(null)
    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null)
    const { styles, attributes, update } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: "offset", options: { offset: [0, 5] } }],
    })

    const handleClick = (event: Event & { target: HTMLElement }) => {
        setPopperElement(ref => {
            setReferenceElement(rref => {
                // TODO: Pretty hacky way to get the non-null (popper-initialized) multiple refs. Refactor if possible.
                if (!ref?.contains(event.target) && !rref?.contains(event.target)) {
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
            className={`flex justify-between vertical-center w-1/3 truncate border-b-2 cursor-pointer select-none ${margin} ${theme === "light" ? "border-black" : "border-white"}`}
            aria-labelledby={category === "sortBy" ? "Sort By" : `Filter by ${aria}`} 
            title={category === "sortBy" ? "Sort By" : `Filter by ${aria}`}  
        >
            <div className="flex justify-left truncate">    
                <div className="truncate min-w-0">
                    {title}
                </div>
                <div className="ml-1">
                    {numSelected ? `(${numSelected})` : ""}
                </div>
            </div>
            <i className="icon icon-arrow-down2 text-lg p-2" />
        </div>
        <div
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showTooltip ? styles.popper : { display: "none" }}
            {...attributes.popper}
            className={`border border-black p-2 z-50 ${theme === "light" ? "bg-white" : "bg-black"}`}
            role="listbox" 
            aria-multiselectable="true"
            title="Dropdown Multiselect"
            aria-label="Dropdown Multiselect" 
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
    const [highlight, setHighlight] = useState(false)
    const filteredTitle = title.replace(/\([^)]*\)/g, "")

    return (
        <div className={`${visible ? "flex" : "hidden"} flex-col justify-start ${className} ${expanded ? "flex-grow" : "flex-grow-0"}`}>
            <div className="flex flex-row flex-grow-0 justify-start">
                {expanded &&
                    (<div className="h-auto border-l-4 border-orange-400" />)}
                <div
                    className="flex flex-grow justify-between items-center p-3 text-2xl border-t border-gray-600 cursor-pointer select-none truncate"
                    style={{
                        backgroundColor: highlight ? "#334657" : darkBgColor,
                        color: "#F5AE3C",
                    }}
                    title={title}
                    onClick={() => setExpanded(v => !v)}
                    onMouseEnter={() => setHighlight(true)}
                    onMouseLeave={() => setHighlight(false)}
                >
                    <div className="flex items-center truncate py-1">
                        <i className="icon-album pr-3" />
                        <div className="truncate">{title}</div>
                    </div>
                    <div className="w-1/12 text-2xl">
                        {expanded
                            ? <i className="icon icon-arrow-down2" title={`Collapse ${filteredTitle}`} aria-label={`Collapse ${filteredTitle}`} role="button"/>
                            : <i className="icon icon-arrow-right2" title={`Expand ${filteredTitle}`} aria-label={`Expand ${filteredTitle}`} role="button" />}
                    </div>
                </div>
            </div>
            <div className="flex-grow">
                {expanded && children}
            </div>
        </div>
    )
}

export const Collapsed = ({ position = "west", title = null }: { position: "west" | "east", title: string | null }) => {
    const theme = useSelector(appState.selectColorTheme)
    const embedMode = useSelector(appState.selectEmbedMode)
    const dispatch = useDispatch()

    return (
        <div
            className={`${embedMode ? "hidden" : "flex"} flex-col h-full cursor-pointer`}
            onClick={() => {
                position === "west" ? dispatch(layout.setWest({ open: true })) : dispatch(layout.setEast({ open: true }))
            }}
            aria-label={`Open ${title}`}
            title={`Open ${title}`}
        >
            <div
                className={`
                    flex justify-start w-12 h-7 p-1 m-3 rounded-full 
                    ${theme === "light" ? "bg-black" : "bg-gray-700"}
                `}
            >
                <div className="w-5 h-5 bg-white rounded-full">&nbsp;</div>
            </div>
            <div
                className="flex-grow flex items-center justify-center"
            >
                <div
                    className={`
                        whitespace-nowrap text-2xl font-semibold cursor-pointer tracking-widest
                        ${theme === "light" ? "text-gray-400" : "text-gray-600"}
                        transform ${position === "west" ? "-rotate-90" : "rotate-90"}
                    `}
                >
                    {title}
                </div>
            </div>
        </div>
    )
}

// Keys are weirdly all caps because of the shared usage in the layout reducer as well as component's title-bar prop.
const BrowserComponents: { [key in BrowserTabType]: React.FC } = {
    [BrowserTabType.Sound]: SoundBrowser,
    [BrowserTabType.Script]: ScriptBrowser,
    [BrowserTabType.API]: APIBrowser,
}

export const Browser = () => {
    const theme = useSelector(appState.selectColorTheme)
    const open = useSelector((state: RootState) => state.layout.west.open)
    const { t } = useTranslation()
    let kind: BrowserTabType = useSelector(layout.selectWestKind)

    if (!Object.values(BrowserTabType).includes(kind)) {
        kind = BrowserTabType.Sound
    }

    return <div
        className={`flex flex-col h-full w-full text-left font-sans ${theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"}`}
        id="content-manager">
        <div className={"flex flex-col h-full" + (open ? "" : " hidden")}>
            <TitleBar />
            <BrowserTabs />
            {Object.entries(BrowserComponents).map(([type, TabBody]) =>
                <div key={type} className={"flex flex-col flex-grow min-h-0" + (+type === kind ? "" : " hidden")}><TabBody /></div>)}
        </div>
        {!open && <Collapsed title={t("contentManager.title").toLocaleUpperCase()} position="west" />}
    </div>
}
