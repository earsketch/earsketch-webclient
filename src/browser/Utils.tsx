import React, { ChangeEventHandler, MouseEventHandler } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as student from "../cai/dialogue/student"
import { TFunction } from "i18next"
import { useAppSelector } from "../hooks"
import * as scripts from "./scriptsState"
import { MultiSelectFilterKey } from "./scriptsState"
import * as ideConsole from "../ide/console"

interface SearchBarProps {
    searchText: string
    aria?: string
    id?: string
    highlight?: boolean
    liveMessage?: string
    firstResultSelector?: string
    dispatchSearch: ChangeEventHandler<HTMLInputElement>
    dispatchReset: MouseEventHandler<HTMLElement>
}
export const SearchBar = ({ searchText, dispatchSearch, dispatchReset, id, aria, highlight, liveMessage, firstResultSelector }: SearchBarProps) => {
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const { t } = useTranslation()

    return (
        <form
            className={`p-1.5 pb-1 ${(highlight ? "border-yellow-500 border-4" : "")}`}
            onSubmit={e => {
                e.preventDefault()
                const firstEl = firstResultSelector
                    ? document.querySelector(firstResultSelector) as HTMLElement | null
                    : null
                if (liveMessage) {
                    ideConsole.log(liveMessage)
                }
                if (firstEl) {
                    firstEl.focus()
                }
            }}
        >
            <label className={`w-full border-b-2 flex justify-between  items-center ${theme === "light" ? "border-black" : "border-white"}`}>
                {aria && <span className="sr-only">{aria}</span>}
                <input
                    id={id}
                    className="w-full outline-none p-1 bg-transparent font-normal scale:text-sm"
                    type="text"
                    placeholder={t("search")}
                    value={searchText}
                    onChange={e => { dispatchSearch(e) }}
                    onKeyDown={(e) => { student.addUIClick(id + ": " + e.key) }}
                    onFocus={() => { if (highlight) { dispatch(caiState.setHighlight({ zone: null })) } }}
                />
                {searchText.length !== 0 &&
                    (
                        <i
                            className="icon-cross2 pr-1 cursor-pointer"
                            onClick={(e) => { dispatchReset(e) }}
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

export const DropdownMultiSelector = ({ title, category, aria, items, position, numSelected, FilterItem }: DropdownMultiSelectorProps) => {
    const dispatch = useDispatch()
    const scaledFontSize = useSelector(appState.selectScaledFontSize)

    const selectedValues = useAppSelector(
        (state) => state.scripts.filters[category]
    )

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
                    className={`flex justify-between w-full scale:text-base border-b-2 ${margin} border-black dark:border-white`}
                    aria-label={aria}
                >
                    <span className="truncate">
                        {title} {numSelected ? `(${numSelected})` : ""}
                    </span>
                    <i className="icon icon-arrow-down2 scale:text-xs p-1" />
                </ListboxButton>

                <ListboxOptions
                    anchor="bottom start"
                    style={{ fontSize: `${scaledFontSize}px` }}
                    className={`z-50 [--anchor-max-height:24rem] [--anchor-gap:4px] overflow-y-auto border pt-1 p-2 focus:outline-none
                      bg-white text-black dark:bg-black dark:text-white border-black`}
                >
                    <ListboxOption as="button" type="button" value="__clear__" className="w-full text-left">
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
                            className="scale:text-sm w-full block text-left p-0 m-0 bg-transparent border-0 focus:outline-none"
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
    const filteredTitle = title.replace(/\([^)]*\)/g, "")
    const { t } = useTranslation()

    return (
        <Disclosure as="div" defaultOpen={initExpanded} className={`${visible ? "flex" : "hidden"} flex-col justify-start data-[open]:grow ${className}`}>
            {({ open }) => (
                <>
                    <div className={`flex flex-row grow-0 justify-start ${open ? "grow-0" : ""}`}>
                        {open && <div className="h-auto border-l-4 border-amber" />}
                        <DisclosureButton
                            className="flex grow justify-between items-center py-1 pl-2 text-amber bg-blue hover:bg-gray-700 border-t border-gray-600 cursor-pointer select-none truncate"
                            title={open ? t("thing.collapse", { name: filteredTitle }) : t("thing.expand", { name: filteredTitle })}
                            aria-label={open ? t("thing.collapse", { name: filteredTitle }) : t("thing.expand", { name: filteredTitle })}
                        >
                            <h4 className="flex items-center truncate py-1">
                                <i className="icon-album pr-1.5" />
                                <div className="truncate">{title}</div>
                            </h4>
                            <div className="w-1/12">
                                <i className={`icon ${open ? "icon-arrow-down2" : "icon-arrow-right2"}`} />
                            </div>
                        </DisclosureButton>
                    </div>
                    <DisclosurePanel className="grow min-h-0">
                        {children}
                    </DisclosurePanel>
                </>
            )}
        </Disclosure>
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

export function analyzeJavaScriptCode(source: string, t: TFunction): string {
    const lines = source.split("\n")
    let readableText = ""

    // simple literals: numbers, strings, booleans, null, undefined
    const simpleLiteral =
        String.raw`(?:-?\d+(?:\.\d+)?|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|true|false|null|undefined)`

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        // JS single-line comment: // ...
        const singleLineCommentMatch = line.match(/^\s*\/\/(.*)$/)

        // JS variable declaration with optional assignment:
        // let x = 5  const name = "a"  var ok = true
        const variableDeclarationMatch = line.match(
            /^\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*(?:=\s*(.+?))?\s*?\s*$/
        )

        // JS assignment (without declaration):
        // x = something  obj.prop = 1  arr[i] = foo()
        const assignmentMatch = line.match(
            /^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*)\s*=\s*(.+?)\s*?\s*$/
        )

        // JS function call:
        // foo(a, b)  console.log("hi")  obj.method(x)
        const functionCallMatch = line.match(
            /^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)\s*?\s*$/
        )

        // Variable declaration with *simple literal* assignment:
        // const x = 10 let s = "hi" var ok = false
        const variableDeclarationLiteralMatch = line.match(
            new RegExp(
                String.raw`^\s*(?:let|const|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(${simpleLiteral})\s*?\s*$`,
                "i"
            )
        )

        // Comments
        if (singleLineCommentMatch) {
            readableText += t("ariaDescriptors:api.code.comment", { text: singleLineCommentMatch[1].trim() }) + " "
            continue
        }

        // Variable declaration with a simple literal
        if (variableDeclarationLiteralMatch) {
            const varName = variableDeclarationLiteralMatch[1]
            const varValue = variableDeclarationLiteralMatch[2]
            readableText += t("ariaDescriptors:api.code.varDeclValue", { varName, varValue }) + " "
            continue
        }

        // Variable declaration (general)
        if (variableDeclarationMatch) {
            const varName = variableDeclarationMatch[1]
            const init = variableDeclarationMatch[2]

            if (!init) {
                readableText += t("ariaDescriptors:api.code.varDeclDeclared", { varName }) + " "
                continue
            }

            // Function call in initializer: const x = foo(a,b)
            const functionInDeclaration = init.trim().match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)\s*?\s*$/)
            if (functionInDeclaration) {
                const funcName = functionInDeclaration[1]
                const funcArgs = functionInDeclaration[2]
                readableText += t("ariaDescriptors:api.code.varDeclFuncAssign", { varName, funcName }) + " "
                const argsArray = funcArgs.split(",")
                argsArray.forEach((arg, index) => {
                    readableText += t("ariaDescriptors:api.code.argument", { index: index + 1, arg }) + " "
                })
            } else {
                readableText += t("ariaDescriptors:api.code.varDeclValue", { varName, varValue: init.trim() }) + " "
            }
            continue
        }

        // Assignment
        if (assignmentMatch) {
            const left = assignmentMatch[1]
            const right = assignmentMatch[2].trim()

            const functionInAssignment = right.match(
                /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)\s*?\s*$/
            )

            if (functionInAssignment) {
                const funcName = functionInAssignment[1]
                const funcArgs = functionInAssignment[2]
                readableText += t("ariaDescriptors:api.code.varAssignFunc", { left, funcName }) + " "
                const argsArray = funcArgs.split(",")
                argsArray.forEach((arg, index) => {
                    readableText += t("ariaDescriptors:api.code.argument", { index: index + 1, arg }) + " "
                })
            } else {
                readableText += t("ariaDescriptors:api.code.varAssignValue", { left, right }) + " "
            }
            continue
        }

        // Function call
        if (functionCallMatch) {
            const funcName = functionCallMatch[1].replace(/\s+/g, "")
            const funcArgs = functionCallMatch[2]
            readableText += t("ariaDescriptors:api.code.funcCall", { funcName }) + " "
            const argsArray = funcArgs.split(",")
            argsArray.forEach((arg, index) => {
                readableText += t("ariaDescriptors:api.code.argument", { index: index + 1, arg }) + " "
            })
            continue
        }

        readableText += t("ariaDescriptors:api.code.codeLine", { line }) + " "
    }

    return readableText.trim() || t("ariaDescriptors:api.code.noCode")
}

export function analyzePythonCode(source: string, t: TFunction): string {
    const lines = source.split("\n")
    let readableText = ""

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line) continue

        // Matches a Python comment line starting with #
        const commentMatch = line.match(/^#(.*)/)

        // Matches a general Python variable assignment
        // Example: x = 10, name = getUser()
        const assignmentMatch = line.match(/^(\w+)\s*=\s*(.+)/)

        // Matches a Python function call
        // Example: print("Hello"), obj.method(a, b)
        const functionCallMatch = line.match(/^([\w.]+)\((.*?)\)/)

        // Matches a simple Python variable declaration with a literal value
        // Example: x = 5, name = "John", flag = True
        const variableDeclarationMatch = line.match(
            /^(\w+)\s*=\s*(\d+|".*"|'.*'|True|False|None)/
        )

        // Single line comment. # ...
        if (commentMatch) {
            readableText += t("ariaDescriptors:api.code.comment", { text: commentMatch[1].trim() }) + " "
            continue
        }

        // Variable declaration
        if (variableDeclarationMatch) {
            const varName = variableDeclarationMatch[1]
            const varValue = variableDeclarationMatch[2]
            readableText += t("ariaDescriptors:api.code.varDeclValue", { varName, varValue }) + " "
            continue
        }

        // Assignment
        if (assignmentMatch) {
            const varName = assignmentMatch[1]
            const assignedValue = assignmentMatch[2]

            const functionInAssignment = assignedValue.match(/^(\w+)\((.*?)\)/)
            if (functionInAssignment) {
                const funcName = functionInAssignment[1]
                const funcArgs = functionInAssignment[2]
                readableText += t("ariaDescriptors:api.code.varAssignFunc", { left: varName, funcName }) + " "

                const argsArray = funcArgs.split(",").map((arg) => arg.trim()).filter(Boolean)
                argsArray.forEach((arg, index) => {
                    readableText += t("ariaDescriptors:api.code.argument", { index: index + 1, arg }) + " "
                })
            } else {
                readableText += t("ariaDescriptors:api.code.varAssignValue", { left: varName, right: assignedValue }) + " "
            }
            continue
        }

        // Function calll, fitMedia(HOUSE_BREAKBEAT_001, 1, 1, 3)
        if (functionCallMatch) {
            const funcName = functionCallMatch[1]
            const funcArgs = functionCallMatch[2]
            readableText += t("ariaDescriptors:api.code.funcCall", { funcName }) + " "

            const argsArray = funcArgs.split(",").map((arg) => arg.trim()).filter(Boolean)
            argsArray.forEach((arg, index) => {
                readableText += t("ariaDescriptors:api.code.argument", { index: index + 1, arg }) + " "
            })
            continue
        }

        readableText += t("ariaDescriptors:api.code.codeLine", { line }) + " "
    }

    return readableText.trim() || t("ariaDescriptors:api.code.noCode")
}
