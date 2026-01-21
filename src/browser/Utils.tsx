import React, { ChangeEventHandler, MouseEventHandler, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as student from "../cai/dialogue/student"
import { useAppSelector } from "../hooks"
import * as scripts from "./scriptsState"
import { MultiSelectFilterKey } from "./scriptsState"

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

    return (
        <form
            className={`p-1.5 pb-1 ${(highlight ? "border-yellow-500 border-4" : "")}`}
            onSubmit={e => e.preventDefault()}
        >
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === "light" ? "border-black" : "border-white"}`}>
                <input
                    id={id}
                    className="w-full outline-none p-1 bg-transparent font-normal text-sm"
                    type="text"
                    placeholder={t("search")}
                    value={searchText}
                    onChange={dispatchSearch}
                    onKeyDown={(e) => { student.addUIClick(id + ": " + e.key) }}
                    onFocus={() => { if (highlight) { dispatch(caiState.setHighlight({ zone: null })) } }}
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
    category: MultiSelectFilterKey
    aria?: string
    items: string[]
    position: "center" | "left" | "right"
    numSelected?: number
    FilterItem: React.FC<any>
}

export const HeadlessMultiSelector = ({ title, category, aria, items, position, numSelected, FilterItem }: DropdownMultiSelectorProps) => {
    const theme = useSelector(appState.selectColorTheme)
    const dispatch = useDispatch()

    const selectedValues = useAppSelector(
        (state) => state.scripts.filters[category]
    )

    const [referenceElement, setReferenceElement] =
    useState<HTMLButtonElement | null>(null)
    const [popperElement, setPopperElement] =
    useState<HTMLDivElement | null>(null)

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        modifiers: [{ name: "offset", options: { offset: [0, 6] } }],
    })

    const handleChange = (newValues: string[]) => {
        if (newValues.includes("__clear__")) {
            dispatch(scripts.resetFilter(category))
            return
        }

        dispatch(
            scripts.setFilter({
                category,
                values: newValues,
            })
        )
    }

    const margin =
    position === "left"
        ? "mr-2"
        : position === "right" ? "ml-2" : "mx-1"

    return (
        <Listbox value={selectedValues} multiple onChange={handleChange}>
            <div className="relative w-1/3">
                <ListboxButton
                    ref={setReferenceElement}
                    className={`flex justify-between w-full border-b-2 ${margin}
            ${theme === "light" ? "border-black" : "border-white"}`}
                    aria-label={aria}
                >
                    <span className="truncate">
                        {title} {numSelected ? `(${numSelected})` : ""}
                    </span>
                    <i className="icon icon-arrow-down2 text-xs p-1" />
                </ListboxButton>

                <ListboxOptions
                    ref={(el) => setPopperElement(el as HTMLDivElement | null)}
                    style={styles.popper}
                    {...attributes.popper}
                    className={`z-50 mt-1 border p-2 focus:outline-none
            ${theme === "light" ? "bg-white" : "bg-black"}`}
                >
                    <ListboxOption as="button" type="button" value="__clear__">
                        {({ active }) => (
                            <FilterItem
                                isClearItem
                                active={active}
                                selected={false}
                            />
                        )}
                    </ListboxOption>

                    <hr className="my-2 border-black dark:border-white" />

                    {items.map((item) => (
                        <ListboxOption
                            as="button"
                            type="button"
                            key={item}
                            value={item}
                            className="focus:outline-none"
                        >
                            {({ active, selected }) => (
                                <FilterItem
                                    value={item}
                                    active={active}
                                    selected={selected}
                                />
                            )}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    )
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
