import React, { useState, useEffect, LegacyRef } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import { usePopper } from "react-popper"
import PopperJS from "@popperjs/core"

import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as scripts from "./scriptsState"
import * as scriptsThunks from "./scriptsThunks"
import * as tabs from "../ide/tabState"
import { setActiveTabAndEditor } from "../ide/tabThunks"
import * as userNotification from "../user/notification"
import { saveScript } from "./scriptsThunks"
import type { AppDispatch } from "../reducers"

export function generateGetBoundingClientRect(x = 0, y = 0) {
    return (): ClientRect => ({
        width: 0,
        height: 0,
        top: y,
        right: x,
        bottom: y,
        left: x,
    }) as ClientRect
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
    const dispatch = useDispatch()
    const cursor = disabled ? "cursor-not-allowed" : "cursor-pointer"

    return (
        <button
            className={`
                ${visible ? "flex" : "hidden"} items-center justify-start py-1.5 space-x-2 text-sm ${cursor} 
                bg-white dark:bg-black
                hover:bg-blue-200 dark:hover:bg-blue-500
                text-black dark:text-white w-full
            `}
            onClick={() => {
                if (disabled) return null
                onClick()
                dispatch(scripts.resetDropdownMenu())
            }}
            aria-label={aria}
            title={aria}
        >
            <div className="flex justify-center items-center w-6">
                <i className={`${icon} align-middle`} />
            </div>
            <div className={`${disabled ? "text-gray-500" : ""}`}>{name}</div>
        </button>
    )
}

const dropdownMenuVirtualRef = new VirtualRef() as VirtualReference

type ScriptAction = (_: Script) => void

interface ScriptActions {
    delete: ScriptAction
    deleteShared: ScriptAction
    download: ScriptAction
    openIndicator: ScriptAction
    openHistory: (script: Script, allowRevert: boolean) => void
    rename: ScriptAction
    share: ScriptAction
    submit: ScriptAction
}

export const ScriptDropdownMenu = ({
    delete: delete_, deleteShared, download, openIndicator, openHistory,
    rename, share, submit,
}: ScriptActions) => {
    const dispatch = useDispatch<AppDispatch>()
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
            className="border border-black p-2 z-50 bg-white dark:bg-black"
        >
            <div className="flex justify-between items-center p-1 space-x-2 pb-2 border-b mb-2 text-sm text-black border-black dark:text-white dark:border-white">
                <div className="truncate">
                    {script?.name}
                </div>
                <button
                    className="icon-cross2 pr-1 align-middle cursor-pointer text-gray-700 dark:text-gray-500"
                    onClick={() => {
                        dispatch(scripts.resetDropdownMenu())
                    }}
                    aria-label={script ? t("ariaDescriptors:scriptBrowser.close", { scriptname: script?.name }) : t("thing.close")}
                    title={script ? t("ariaDescriptors:scriptBrowser.close") : t("thing.close")}
                >
                </button>
            </div>
            <MenuItem
                name={t("thing.open")} icon="icon-file-empty" aria={script ? t("ariaDescriptors:scriptBrowser.open", { scriptname: script.name }) : t("thing.open")}
                visible={!context}
                onClick={() => {
                    if (!script) return

                    if (type === "regular") {
                        dispatch(setActiveTabAndEditor(script.shareid))
                    } else if (type === "shared") {
                        dispatch(setActiveTabAndEditor(script.shareid))
                    }
                }}
            />
            <MenuItem
                name={t("script.copy")} icon="icon-copy" aria={script ? t("script.options.copy", { scriptname: script.name }) : t("script.copy")}
                visible={type === "regular"}
                onClick={() => {
                    dispatch(saveScript({ name: unsavedScript!.name, source: unsavedScript!.source_code, overwrite: false })).unwrap().then(() => {
                        userNotification.show(t("messages:user.scriptcopied"))
                    })
                }}
            />
            <MenuItem
                name={t("script.rename")} icon="icon-pencil2" aria={script ? t("ariaDescriptors:scriptBrowser.rename", { scriptname: script.name }) : t("script.rename")}
                visible={type === "regular"}
                onClick={() => rename(script!)}
            />
            <MenuItem
                name={t("script.download")} icon="icon-cloud-download" aria={script ? t("ariaDescriptors:scriptBrowser.download", { scriptname: script.name }) : t("script.download")}
                onClick={() => download(unsavedScript!)}
            />
            <MenuItem
                name={t("script.print")} icon="icon-printer" aria={script ? t("ariaDescriptors:scriptBrowser.print", { scriptname: script.name }) : t("script.print")}
                onClick={() => {
                    exporter.print(unsavedScript!)
                }}
            />
            <MenuItem
                name={t("script.share")} icon="icon-share32" aria={script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share")}
                visible={type === "regular"}
                disabled={!loggedIn}
                onClick={() => share(unsavedScript!)}
            />
            <MenuItem
                name={t("script.submitCompetition")} icon="icon-share2" aria={script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition")}
                visible={type === "regular" && loggedIn && FLAGS.SHOW_AMAZON}
                disabled={!loggedIn}
                onClick={() => submit(unsavedScript!)}
            />
            <MenuItem
                name={t("script.history")} icon="icon-history" aria={script ? t("script.historyDescriptive", { name: script.name }) : t("script.history")}
                disabled={!loggedIn || type === "readonly"}
                onClick={() => {
                    script && openHistory(unsavedScript!, !script.isShared)
                }}
            />
            <MenuItem
                name={t("script.codeIndicator")} icon="icon-info" aria={script ? t("script.codeIndicatorDescriptive", { name: script.name }) : t("script.codeIndicator")}
                onClick={() => openIndicator(unsavedScript!)}
            />
            <MenuItem
                name={t("script.import")} icon="icon-import" aria={script ? t("ariaDescriptors:scriptBrowser.import", { scriptname: script.name }) : t("script.import")}
                visible={["shared", "readonly"].includes(type as string)}
                onClick={async () => {
                    let imported

                    if (script?.collaborative) {
                        imported = await scriptsThunks.importCollaborativeScript(Object.assign({}, script))
                    } else {
                        imported = await scriptsThunks.importScript(script!)
                    }

                    if (!imported) {
                        return
                    }

                    if (script && openTabs.includes(script.shareid) && !script.collaborative) {
                        dispatch(tabs.closeTab(script.shareid))
                        dispatch(setActiveTabAndEditor(imported.shareid))
                    }
                }}
            />
            <MenuItem
                name={t("script.delete")} icon="icon-bin" aria={script ? t("ariaDescriptors:scriptBrowser.delete", { scriptname: script.name }) : t("script.delete")}
                visible={type !== "readonly"}
                onClick={() => {
                    if (type === "regular") {
                        delete_(unsavedScript!)
                    } else if (type === "shared") {
                        deleteShared(script!)
                    }
                }}
            />
        </div>
    )
}

export const DropdownMenuCaller = ({ script, type }: { script: Script, type: ScriptType }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()

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
            title={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
            aria-label={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
            aria-haspopup="true"
        >
            <div className="truncate min-w-0">
                <i className="icon-menu3 text-2xl px-2 align-middle" />
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
