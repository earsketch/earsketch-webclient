import React, { Fragment } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch, useSelector } from "react-redux"
import PopperJS from "@popperjs/core"
import { Popover, Transition } from "@headlessui/react"

import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as scripts from "./scriptsState"
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
    // delete: delete_, deleteShared, openIndicator, openHistory, submit,
    download, rename, share,
}: ScriptActions) => {
    const dispatch = useDispatch<AppDispatch>()
    const script = useSelector(scripts.selectDropdownMenuScript)
    const context = useSelector(scripts.selectDropdownMenuContext)
    const { t } = useTranslation()

    const type = useSelector(scripts.selectDropdownMenuType)
    const unsavedScript = useSelector(scripts.selectUnsavedDropdownMenuScript)
    const loggedIn = useSelector(user.selectLoggedIn)

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
                dispatch(saveScript({ name: unsavedScript!.name, source: unsavedScript!.source_code, overwrite: false })).unwrap().then(() => {
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
            onclick: () => download(unsavedScript!),
            icon: "icon-cloud-download",
        },
        {
            description: "Print script",
            name: t("script.print"),
            aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
            onclick: () => exporter.print(unsavedScript!),
            icon: "icon-printer",
            disabled: !loggedIn,
            visible: type === "regular",
        },
        {
            description: "Share script",
            name: t("script.share"),
            aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
            onclick: () => share(unsavedScript!),
            icon: "icon-share32",
            disabled: !loggedIn,
            visible: type === "regular",
        },
        // {
        //     description: "Submit script to competition",
        //     name: t("script.submitCompetition"),
        //     aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
        //     onclick: () => submitToCompetition(unsavedScript!),
        //     icon: "icon-share2",
        //     disabled: !loggedIn,
        //     visible: type === "regular" && loggedIn && FLAGS.SHOW_AMAZON,
        // },
        // {
        //     description: "Show script history",
        //     name: t("script.history"),
        //     aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
        //     onclick: () => openCodeIndicator(unsavedScript!),
        //     icon: "icon-info",
        // },
        // {
        //     description: "Code Indicator",
        //     name: t("script.codeIndicator"),
        //     aria: script ? t("script.codeIndicatorDescriptive", { name: script.name }) : t("script.codeIndicator"),
        //     onclick: () => {
        //         script && openScriptHistory(unsavedScript!, !script.isShared)
        //     },
        //     icon: "icon-info",
        // },
        // {
        //     description: "Import Script",
        //     name: t("script.import"),
        //     aria: script ? t("ariaDescriptors:scriptBrowser.import", { scriptname: script.name }) : t("script.import"),
        //     onclick: async () => {
        //         let imported

        //         if (script?.collaborative) {
        //             imported = await userProject.importCollaborativeScript(Object.assign({}, script))
        //         } else {
        //             imported = await userProject.importScript(script!)
        //         }

        //         if (!imported) {
        //             return
        //         }

        //         if (script && openTabs.includes(script.shareid) && !script.collaborative) {
        //             dispatch(tabs.closeTab(script.shareid))
        //             dispatch(tabs.setActiveTabAndEditor(imported.shareid))
        //         }
        //     },
        //     icon: "icon-import",
        //     visible: ["shared", "readonly"].includes(type as string),
        // },
        // {
        //     description: "Delete script",
        //     name: t("script.delete"),
        //     aria: script ? t("ariaDescriptors:scriptBrowser.delete", { scriptname: script.name }) : t("script.delete"),
        //     onclick: () => {
        //         if (type === "regular") {
        //             deleteScript(unsavedScript!)
        //         } else if (type === "shared") {
        //             deleteSharedScript(script!)
        //         }
        //     },
        //     icon: "icon-bin",
        //     visible: type !== "readonly",
        // },
    ]

    return (
        <div className="fixed top-16 w-full max-w-sm px-4">
            <Popover className="relative">
                {({ open }) => (
                    <>
                        <Popover.Button
                            className={`
                  ${open ? "" : "text-opacity-90"}
                  group inline-flex items-center rounded-md bg-orange-700 px-3 py-2 text-base font-medium text-white hover:text-opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75`}
                        >
                            <div className="truncate min-w-0">
                                <i className="icon-menu3 text-2xl px-2 align-middle" />
                            </div>
                            <div
                                className={`${open ? "" : "text-opacity-70"}
                    ml-2 h-5 w-5 bg-transparent transition duration-150 ease-in-out group-hover:text-opacity-80`}
                                aria-hidden="true"
                            ></div>
                        </Popover.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                        >
                            <Popover.Panel className="border border-black p-2 z-50 bg-white dark:bg-black">
                                <div className="truncate">
                                    <div className="flex justify-between items-center p-1 space-x-2 pb-2 border-b mb-2 text-sm text-black border-black dark:text-white dark:border-white relative grid gap-8 bg-white p-7 lg:grid-cols-1">
                                        {scriptMenuItems.map((item) => (
                                            <MenuItem
                                                aria={item.aria}
                                                disabled={item.disabled ? item.disabled === true : false} // this is really dumb.
                                                icon={item.icon}
                                                key={item.name}
                                                name={item.name}
                                                onClick={item.onclick}
                                                visible={item.visible ? item.visible : true}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </Popover.Panel>
                        </Transition>
                    </>
                )}
            </Popover>
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
