import React, { useState, useEffect, LegacyRef } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import { usePopper } from "react-popper"
import PopperJS from "@popperjs/core"

import { deleteScript, deleteSharedScript, downloadScript, openCodeIndicator, openScriptHistory, renameScript, submitToCompetition, shareScript as _shareScript } from "../app/App"
import * as appState from "../app/appState"
import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as scripts from "./scriptsState"
import * as tabs from "../ide/tabState"
import * as userNotification from "../user/notification"
import * as userProject from "../app/userProject"

export const shareScript = (script: Script) => {
    console.log(script)
    _shareScript(Object.assign({}, script))
}

export function generateGetBoundingClientRect(x = 0, y = 0) {
    return (): ClientRect => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
    })
}

export interface VirtualReference extends PopperJS.VirtualElement {
    updatePopper: PopperJS.Instance["update"] | null
}

// TODO: Redundant... Figure out how to implement VirtualReference interface without declaring an unknown-type property.
export class VirtualRef {
    getBoundingClientRect: unknown
    updatePopper: PopperJS.Instance["update"] | null

    constructor() {
        this.getBoundingClientRect = generateGetBoundingClientRect()
        this.updatePopper = null
    }
}

interface MenuItemProps {
    name: string
    icon: string
    aria: string
    onClick: Function
    disabled?: boolean
    visible?: boolean
}

const MenuItem = ({ name, icon, aria, onClick, disabled = false, visible = true }: MenuItemProps) => {
    const [highlight, setHighlight] = useState(false)
    const dispatch = useDispatch()
    const theme = useSelector(appState.selectColorTheme)
    const cursor = disabled ? "cursor-not-allowed" : "cursor-pointer"

    return (
        <button
            className={`
                ${visible ? "flex" : "hidden"} items-center justify-start p-2 space-x-4 ${cursor} 
                ${theme === "light" ? (highlight ? "bg-blue-200" : "bg-white") : (highlight ? "bg-blue-500" : "bg-black")}
                ${theme === "light" ? "text-black" : "text-white"}
            `}
            onMouseEnter={() => setHighlight(true)}
            onMouseLeave={() => setHighlight(false)}
            onClick={() => {
                if (disabled) return null
                onClick()
                dispatch(scripts.resetDropdownMenu())
            }}
            aria-label={aria}
            title={aria}
            aria-labelledby={`scriptsmenubutton_${name}`}
        >
            <div className="flex justify-center items-center w-6">
                <i className={`${icon} align-middle`} />
            </div>
            <div className={`${disabled ? "text-gray-500" : ""}`}>{name}</div>
        </button>
    )
}

const dropdownMenuVirtualRef = new VirtualRef() as VirtualReference

export const ScriptDropdownMenu = () => {
    const theme = useSelector(appState.selectColorTheme)
    const dispatch = useDispatch()
    const showDropdownMenu = useSelector(scripts.selectShowDropdownMenu)
    const script = useSelector(scripts.selectDropdownMenuScript)
    const type = useSelector(scripts.selectDropdownMenuType)
    const context = useSelector(scripts.selectDropdownMenuContext)
    const { t } = useTranslation()

    // For some operations, get the most up-to-date script being kept in userProject.
    const unsavedScript = useSelector(scripts.selectUnsavedDropdownMenuScript)
    const loggedIn = useSelector(user.selectLoggedIn)
    const openTabs = useSelector(tabs.selectOpenTabs)

    const [popperElement, setPopperElement] = useState<HTMLDivElement|null>(null)
    const { styles, attributes, update } = usePopper(dropdownMenuVirtualRef, popperElement)
    dropdownMenuVirtualRef.updatePopper = update

    // Note: Synchronous dispatches inside a setState can conflict with components rendering.
    const handleClickAsync: EventListener = (event: Event & { target: HTMLElement, button: number }) => {
        setPopperElement(ref => {
            if (!ref?.contains(event.target) && event.button === 0) {
                dispatch(scripts.resetDropdownMenuAsync())
            }
            return ref
        })
    }

    useEffect(() => {
        document.addEventListener("mousedown", handleClickAsync)
        return () => document.removeEventListener("mousedown", handleClickAsync)
    }, [])

    return (
        <div
            ref={setPopperElement as LegacyRef<HTMLDivElement>}
            style={showDropdownMenu ? styles.popper : { display: "none" }}
            {...attributes.popper}
            className={`border border-black p-2 z-50 ${theme === "light" ? "bg-white" : "bg-black"}`}
        >
            <div className={`flex justify-between items-center p-2 space-x-2 pb-4 border-b mb-2 ${theme === "light" ? "text-black border-black" : "text-white border-white"}`}>
                <div className="truncate">
                    {script?.name}
                </div>
                <button
                    className={`icon-cross2 pr-1 align-middle cursor-pointer ${theme === "light" ? "text-gray-700" : "text-gray-500"}`}
                    onClick={() => {
                        dispatch(scripts.resetDropdownMenu())
                    }}
                    aria-label="Close Script Options"
                    title="Close Script Options"
                >
                </button>
            </div>
            <MenuItem
                name={t("thing.open")} icon="icon-file-empty" aria={script ? `Open ${script.name}` : `Open Script`}
                visible={!context}
                onClick={() => {
                    if (!script) return

                    if (type === "regular") {
                        dispatch(tabs.setActiveTabAndEditor(script.shareid))
                    } else if (type === "shared") {
                        dispatch(tabs.setActiveTabAndEditor(script.shareid))
                    }
                }}
            />
            <MenuItem
                name={t("script.copy")} icon="icon-copy" aria={script ? `Copy ${script.name}` : `Copy Script`}
                visible={type === "regular"}
                onClick={() => {
                    userProject.saveScript(unsavedScript!.name, unsavedScript!.source_code, false).then(() => {
                        userNotification.show(t("messages:user.scriptcopied"))
                    })
                }}
            />
            <MenuItem
                name={t("script.rename")} icon="icon-pencil2" aria={script ? `Rename ${script.name}` : `Rename Script`}
                visible={type === "regular"}
                onClick={() => renameScript(script!)}
            />
            <MenuItem
                name={t("script.download")} icon="icon-cloud-download" aria={script ? `Download ${script.name}` : `Download Script`}
                onClick={() => downloadScript(unsavedScript!)}
            />
            <MenuItem
                name={t("script.print")} icon="icon-printer" aria={script ? `Print ${script.name}` : `Print Script`}
                onClick={() => {
                    exporter.print(unsavedScript!)
                }}
            />
            <MenuItem
                name={t("script.share")} icon="icon-share32" aria={script ? `Share ${script.name}` : `Share Script`}
                visible={type === "regular"}
                disabled={!loggedIn}
                onClick={() => shareScript(unsavedScript!)}
            />
            <MenuItem
                name={t("script.submitCompetition")} icon="icon-share2" aria={script ? `Submit ${script.name} to Competition` : `Submit Script to Competition`}
                visible={type === "regular" && loggedIn && FLAGS.SHOW_AMAZON}
                disabled={!loggedIn}
                onClick={() => submitToCompetition(unsavedScript!)}
            />
            <MenuItem
                name={t("script.history")} icon="icon-history" aria={script ? `Show ${script.name} History` : `Show Script History`}
                disabled={!loggedIn || type === "readonly"}
                onClick={() => {
                    script && openScriptHistory(unsavedScript!, !script.isShared)
                }}
            />
            <MenuItem
                name={t("script.codeIndicator")} icon="glyphicon glyphicon-info-sign" aria={script ? `Show Code Indicator for ${script.name}` : `Show Code Indicator`}
                onClick={() => openCodeIndicator(unsavedScript!)}
            />
            <MenuItem
                name={t("script.import")} icon="icon-import" aria={script ? `Import ${script.name}` : `Import Script`}
                visible={["shared", "readonly"].includes(type as string)}
                onClick={async () => {
                    let imported

                    if (script?.collaborative) {
                        imported = await userProject.importCollaborativeScript(Object.assign({}, script))
                    } else {
                        imported = await userProject.importScript(script!)
                    }

                    if (!imported) {
                        return
                    }

                    if (script && openTabs.includes(script.shareid) && !script.collaborative) {
                        dispatch(tabs.closeTab(script.shareid))
                        dispatch(tabs.setActiveTabAndEditor(imported.shareid))
                    }
                }}
            />
            <MenuItem
                name={t("script.delete")} icon="icon-bin" aria={script ? `Delete ${script.name}` : `Delete Script`}
                visible={type !== "readonly"}
                onClick={() => {
                    if (type === "regular") {
                        deleteScript(unsavedScript!)
                    } else if (type === "shared") {
                        deleteSharedScript(script!)
                    }
                }}
            />
        </div>
    )
}

export const DropdownMenuCaller = ({ script, type }: { script: Script, type: ScriptType }) => {
    const dispatch = useDispatch()

    return (
        <div
            onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY)
                dropdownMenuVirtualRef.updatePopper?.()
                dispatch(scripts.setDropdownMenu({ script, type }))
            }}
            className="flex justify-left truncate"
            title="Script Options"
            aria-haspopup="true"
            id={`scriptsmenubutton_${script.name}`}
        >
            <div className="truncate min-w-0" >
                <i className="icon-menu3 text-4xl px-2 align-middle" />
            </div>
        </div>
    )
}

export const DropdownContextMenuCaller = ({ script, type, className, children }: {
    script: Script, type: ScriptType, className: string, children: React.ReactNode
}) => {
    const dispatch = useDispatch()
    return (
        <div
            className={className}
            onContextMenu={event => {
                event.preventDefault()
                event.stopPropagation()
                dropdownMenuVirtualRef.getBoundingClientRect = generateGetBoundingClientRect(event.clientX, event.clientY)
                dropdownMenuVirtualRef.updatePopper?.()
                dispatch(scripts.setDropdownMenu({ script, type, context: true }))
            }}
        >
            {children}
        </div>
    )
}
