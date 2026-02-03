import React, { ChangeEventHandler, MouseEventHandler, LegacyRef, useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import { usePopper } from "react-popper"

import * as appState from "../app/appState"
import * as layout from "../ide/layoutState"
import * as caiState from "../cai/caiState"
import * as student from "../cai/dialogue/student"

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

export function analyzeJavaScriptCode(source: string): string {
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
            readableText += `Comment: ${singleLineCommentMatch[1].trim()}. `
            continue
        }

        // Variable declaration with a simple literal
        if (variableDeclarationLiteralMatch) {
            const varName = variableDeclarationLiteralMatch[1]
            const varValue = variableDeclarationLiteralMatch[2]
            readableText += `Variable declaration: ${varName} is assigned value ${varValue}. `
            continue
        }

        // Variable declaration (general)
        if (variableDeclarationMatch) {
            const varName = variableDeclarationMatch[1]
            const init = variableDeclarationMatch[2]

            if (!init) {
                readableText += `Variable declaration: ${varName} is declared. `
                continue
            }

            // Function call in initializer: const x = foo(a,b)
            const functionInDeclaration = init.trim().match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)\s*?\s*$/)
            if (functionInDeclaration) {
                const funcName = functionInDeclaration[1]
                const funcArgs = functionInDeclaration[2]
                readableText += `Variable declaration: ${varName} is assigned a function call to ${funcName}. `
                const argsArray = funcArgs.split(",")
                argsArray.forEach((arg, index) => {
                    readableText += `Argument ${index + 1}: ${arg}. `
                })
            } else {
                readableText += `Variable declaration: ${varName} is assigned value ${init.trim()}. `
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
                readableText += `Variable assignment: ${left} is assigned a function call to ${funcName}. `
                const argsArray = funcArgs.split(",")
                argsArray.forEach((arg, index) => {
                    readableText += `Argument ${index + 1}: ${arg}. `
                })
            } else {
                readableText += `Variable assignment: ${left} is assigned value ${right}. `
            }
            continue
        }

        // Function call
        if (functionCallMatch) {
            const funcName = functionCallMatch[1].replace(/\s+/g, "")
            const funcArgs = functionCallMatch[2]
            readableText += `Function call: ${funcName}. `
            const argsArray = funcArgs.split(",")
            argsArray.forEach((arg, index) => {
                readableText += `Argument ${index + 1}: ${arg}. `
            })
            continue
        }

        readableText += `Code: ${line}. `
    }

    return readableText || "No code detected."
}

export function analyzePythonCode(source: string): string {
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
            readableText += `Comment: ${commentMatch[1].trim()}. `
            continue
        }

        // Variable declaration
        if (variableDeclarationMatch) {
            const varName = variableDeclarationMatch[1]
            const varValue = variableDeclarationMatch[2]
            readableText += `Variable declaration: ${varName} is assigned value ${varValue}. `
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
                readableText += `Variable assignment: ${varName} is assigned a function call to ${funcName}. `

                const argsArray = funcArgs.split(",").map((arg) => arg.trim()).filter(Boolean)
                argsArray.forEach((arg, index) => {
                    readableText += `Argument ${index + 1}: ${arg}. `
                })
            } else {
                readableText += `Variable assignment: ${varName} is assigned value ${assignedValue}. `
            }
            continue
        }

        // Function calll, fitMedia(HOUSE_BREAKBEAT_001, 1, 1, 3)
        if (functionCallMatch) {
            const funcName = functionCallMatch[1]
            const funcArgs = functionCallMatch[2]
            readableText += `Function call: ${funcName}. `

            const argsArray = funcArgs.split(",").map((arg) => arg.trim()).filter(Boolean)
            argsArray.forEach((arg, index) => {
                readableText += `Argument ${index + 1}: ${arg}. `
            })
            continue
        }

        readableText += `Code: ${line}. `
    }

    return readableText || "No code detected."
}
