import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import { usePopper } from "react-popper"
import PopperJS from "@popperjs/core"

import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as scripts from "./scriptsState"
import * as tabs from "../ide/tabState"
import { setActiveTabAndEditor } from "../ide/tabThunks"
import * as userNotification from "../user/notification"
import { importCollaborativeScript, importScript, saveScript } from "./scriptsThunks"
import type { AppDispatch } from "../reducers"
import { Menu } from "@headlessui/react"

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
    // const showDropdownMenu = useSelector(scripts.selectShowDropdownMenu)
    const script = useSelector(scripts.selectDropdownMenuScript)
    const type = useSelector(scripts.selectDropdownMenuType)
    const context = useSelector(scripts.selectDropdownMenuContext)
    const { t } = useTranslation()

    // For some operations, get the most up-to-date script being kept in userProject.
    // const unsavedScript = useSelector(scripts.selectUnsavedDropdownMenuScript)
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

    const scriptMenuItems = [
        {
            description: "Open script",
            name: t("thing.open"),
            aria: script ? t("ariaDescriptors:scriptBrowser.open", { scriptname: script.name }) : t("thing.open"),
            onclick: () => {
                if (!script) return

                if (type === "regular") {
                    dispatch(setActiveTabAndEditor(script.shareid))
                } else if (type === "shared") {
                    dispatch(setActiveTabAndEditor(script.shareid))
                }
            },
            icon: "icon-file-empty",
            visible: !context,
        },
        {
            name: t("script.copy"),
            aria: script ? t("script.options.copy", { scriptname: script.name }) : t("script.copy"),
            description: "Copy script",
            onclick: () => {
                dispatch(saveScript({ name: script!.name, source: script!.source_code, overwrite: false })).unwrap().then(() => {
                    userNotification.show(t("messages:user.scriptcopied"))
                })
            },
            icon: "icon-copy",
            visible: type === "regular",
        },
        {
            description: "Rename script",
            name: t("script.rename"),
            aria: script ? t("ariaDescriptors:scriptBrowser.rename", { scriptname: script.name }) : t("script.rename"),
            onclick: () => rename(script!),
            icon: "icon-pencil2",
            visible: type === "regular",
        },
        {
            description: "Download script",
            name: t("script.download"),
            aria: script ? t("ariaDescriptors:scriptBrowser.print", { scriptname: script.name }) : t("script.print"),
            onclick: () => download(script!),
            icon: "icon-cloud-download",
        },
        {
            description: "Print script",
            name: t("script.print"),
            aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
            onclick: () => exporter.print(script!),
            icon: "icon-printer",
            disabled: !loggedIn,
            visible: type === "regular",
        },
        {
            description: "Share script",
            name: t("script.share"),
            aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
            onclick: () => share(script!),
            icon: "icon-share32",
            disabled: !loggedIn,
            visible: type === "regular",
        },
        {
            description: "Submit script to competition",
            name: t("script.submitCompetition"),
            aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
            onclick: () => submit(script!),
            icon: "icon-share2",
            disabled: !loggedIn,
            visible: type === "regular" && loggedIn && FLAGS.SHOW_AMAZON,
        },
        {
            description: "Show script history",
            name: t("script.history"),
            aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
            onclick: () => openIndicator(script!),
            icon: "icon-info",
        },
        {
            description: "Code Indicator",
            name: t("script.codeIndicator"),
            aria: script ? t("script.codeIndicatorDescriptive", { name: script.name }) : t("script.codeIndicator"),
            onclick: () => {
                script && openHistory(script, !script.isShared)
            },
            icon: "icon-info",
        },
        {
            description: "Import Script",
            name: t("script.import"),
            aria: script ? t("ariaDescriptors:scriptBrowser.import", { scriptname: script.name }) : t("script.import"),
            onclick: async () => {
                let imported

                if (script?.collaborative) {
                    imported = await importCollaborativeScript(Object.assign({}, script))
                } else {
                    imported = await importScript(script!)
                }

                if (!imported) {
                    return
                }

                if (script && openTabs.includes(script.shareid) && !script.collaborative) {
                    dispatch(tabs.closeTab(script.shareid))
                    dispatch(setActiveTabAndEditor(imported.shareid))
                }
            },
            icon: "icon-import",
            visible: ["shared", "readonly"].includes(type as string),
        },
        {
            description: "Delete script",
            name: t("script.delete"),
            aria: script ? t("ariaDescriptors:scriptBrowser.delete", { scriptname: script.name }) : t("script.delete"),
            onclick: () => {
                if (type === "regular") {
                    delete_(script!)
                } else if (type === "shared") {
                    deleteShared(script!)
                }
            },
            icon: "icon-bin",
            visible: type !== "readonly",
        },
    ]

    return script && <Menu>
        {({ open }) => (
            <>
                <Menu.Button
                    className={`
        ${open ? "" : "text-opacity-90"}
        group inline-flex items-center rounded-md px-3 py-2 text-base font-medium hover:text-opacity-100`}
                    onClick={(event: any) => {
                        event.preventDefault()
                        event.stopPropagation()
                        dispatch(scripts.setDropdownMenu({ script, type }))
                    }}
                >
                    <div
                        className="flex justify-left truncate"
                        title={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
                        aria-label={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
                        aria-haspopup="true"
                    >
                        <div className="truncate min-w-0">
                            <i className="icon-menu3 text-2xl px-2 align-middle" />
                        </div>
                    </div>
                </Menu.Button>
                <Menu.Items
                    static
                    className="border border-black p-2 z-50 bg-white dark:bg-black"
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                >
                    <div className="truncate">
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
                        {scriptMenuItems.map((item) => (
                            <MenuItem
                                aria={item.aria}
                                disabled={item.disabled}
                                icon={item.icon}
                                key={item.name}
                                name={item.name}
                                onClick={item.onclick}
                                visible={item.visible ? item.visible : true}
                            />
                        ))}
                    </div>
                </Menu.Items>
            </>
        )}
    </Menu>
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
