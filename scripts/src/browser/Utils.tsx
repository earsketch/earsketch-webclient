import React, { ChangeEventHandler, MouseEventHandler, LegacyRef, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"

interface SearchBarProps {
    searchText: string
    aria?: string
    dispatchSearch: ChangeEventHandler<HTMLInputElement>
    dispatchReset: MouseEventHandler<HTMLElement>
}
export const SearchBar = ({ searchText, dispatchSearch, dispatchReset }: SearchBarProps) => {
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()

    return (
        <form className="p-1.5 pb-1" onSubmit={e => e.preventDefault()}>
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === "light" ? "border-black" : "border-white"}`}>
                <input
                    className="w-full outline-none p-1 bg-transparent font-normal text-sm"
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
    const { t } = useTranslation()
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
            tabIndex={0}
            className={`flex justify-between vertical-center w-1/3 truncate border-b-2 cursor-pointer select-none ${margin} ${theme === "light" ? "border-black" : "border-white"}`}
            aria-label={category === "sortBy" ? t("scriptBrowser.filterDropdown.sortBy") : t("scriptBrowser.filterDropdown.filterBy", { filter: aria })}
            title={category === "sortBy" ? t("scriptBrowser.filterDropdown.sortBy") : t("scriptBrowser.filterDropdown.filterBy", { filter: aria })}
        >
            <div className="flex justify-left truncate">
                <div className="text-sm truncate min-w-0">
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
                <div
                    className="flex grow justify-between items-center py-1 pl-2 text-amber bg-blue hover:bg-gray-700 border-t border-gray-600 cursor-pointer select-none truncate"
                    title={title}
                    onClick={() => setExpanded(v => !v)}
                    aria-expanded={expanded}
                >
                    <h4 className="flex items-center truncate py-1">
                        <i className="icon-album pr-1.5" />
                        <div className="truncate">{title}</div>
                    </h4>
                    <div className="w-1/12">
                        {expanded
                            ? <button className="icon icon-arrow-down2" title={t("thing.collapse", { name: filteredTitle })} aria-label={t("thing.collapse", { name: filteredTitle })}> </button>
                            : <button className="icon icon-arrow-right2" title={t("thing.expand", { name: filteredTitle })} aria-label={t("thing.expand", { name: filteredTitle })}> </button>}
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
    const theme = useSelector(appState.selectColorTheme)
    const embedMode = useSelector(appState.selectEmbedMode)
    const dispatch = useDispatch()
    const { t } = useTranslation()

    return (
        <div
            className={`${embedMode ? "hidden" : "flex"} flex-col h-full cursor-pointer`}
            onClick={() => {
                position === "west" ? dispatch(layout.setWest({ open: true })) : dispatch(layout.setEast({ open: true }))
            }}
            aria-label={t("ariaDescriptors:general.openPanel", { panelName: title })}
            title={t("ariaDescriptors:general.openPanel", { panelName: title })}
        >
            <button
                className={`
                    flex justify-start w-7 h-4 p-0.5 m-3 rounded-full 
                    ${theme === "light" ? "bg-black" : "bg-gray-700"}
                `}
            >
                <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
            </button>
            <div
                className="grow flex items-center justify-center"
            >
                <div
                    className={`
                        whitespace-nowrap font-semibold cursor-pointer tracking-widest
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
