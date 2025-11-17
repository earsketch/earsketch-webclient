import i18n from "i18next"
import { useTranslation } from "react-i18next"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import PopperJS from "@popperjs/core"

import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as tabs from "../ide/tabState"
import * as cai from "../cai/caiState"
import * as caiThunks from "../cai/caiThunks"
import { setActiveTabAndEditor, closeTab } from "../ide/tabThunks"
import * as userNotification from "../user/notification"
import { importScript, saveScript } from "./scriptsThunks"
import { deleteScript, deleteSharedScript, downloadScript, openCodeIndicator, openScriptHistory, renameScript, shareScript, submitToCompetition } from "../app/scriptActions"

import { ContextMenu } from "radix-ui"
import classNames from "classnames"

export function generateGetBoundingClientRect(x = 0, y = 0) {
    return () => ({ x, y, left: x, right: x, top: y, bottom: y, width: 0, height: 0, toJSON: () => null })
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

interface ScriptMenuItem {
    name: string;
    aria: string;
    onClick: () => void;
    icon: string;
    visible: boolean;
    disabled?: boolean;
    highlighted?: boolean;
}

export const ScriptDropdownMenu = ({ script, scriptType, menuType, className, children }: { script: Script, scriptType: ScriptType, menuType: "buttonmenu" | "contextmenu", className?: string, children?: React.ReactNode }) => {
    const dispatch = useDispatch()
    const context = menuType === "contextmenu"
    const { t } = useTranslation()

    const loggedIn = useSelector(user.selectLoggedIn)
    const openTabs = useSelector(tabs.selectOpenTabs)

    const caiHighlight = useSelector(cai.selectHighlight)
    const highlight = (caiHighlight.zone === "history" && caiHighlight.id === script?.shareid)

    const scriptMenuItems: ScriptMenuItem[] = [{
        name: t("thing.open"),
        aria: script ? t("ariaDescriptors:scriptBrowser.open", { scriptname: script.name }) : t("thing.open"),
        onClick: () => {
            if (!script) return

            if (scriptType === "regular") {
                dispatch(setActiveTabAndEditor(script.shareid))
            } else if (scriptType === "shared") {
                dispatch(setActiveTabAndEditor(script.shareid))
            }
        },
        icon: "icon-file-empty",
        visible: !context,
    }, {
        name: t("script.copy"),
        aria: script ? t("script.options.copy", { scriptname: script.name }) : t("script.copy"),
        onClick: () => {
            dispatch(saveScript({ name: script!.name, source: script!.source_code, overwrite: false })).unwrap().then(() => {
                userNotification.show(t("messages:user.scriptcopied"))
            })
        },
        icon: "icon-copy",
        visible: scriptType === "regular",
    }, {
        name: t("script.rename"),
        aria: script ? t("ariaDescriptors:scriptBrowser.rename", { scriptname: script.name }) : t("script.rename"),
        onClick: () => renameScript(script!),
        icon: "icon-pencil2",
        visible: scriptType === "regular",
    }, {
        name: t("script.download"),
        aria: script ? t("ariaDescriptors:scriptBrowser.download", { scriptname: script.name }) : t("script.download"),
        onClick: () => downloadScript(script!),
        icon: "icon-cloud-download",
        visible: true,
    }, {
        name: t("script.print"),
        aria: script ? t("ariaDescriptors:scriptBrowser.print", { scriptname: script.name }) : t("script.print"),
        onClick: () => exporter.print(script!),
        icon: "icon-printer",
        visible: true,
    }, {
        name: t("script.share"),
        aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
        onClick: () => shareScript(script!),
        icon: "icon-share32",
        disabled: !loggedIn,
        visible: scriptType === "regular",
    }, {
        name: t("script.submitCompetition"),
        aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
        onClick: () => submitToCompetition(script!),
        icon: "icon-earth",
        disabled: !loggedIn,
        visible: scriptType === "regular" && loggedIn && ES_WEB_SHOW_COMPETITION_SUBMIT,
    }, {
        name: t("script.history"),
        aria: script ? t("script.historyDescriptive", { name: script.name }) : t("script.history"),
        onClick: () => {
            script && openScriptHistory(script, !script.isShared)
            if (highlight) {
                caiThunks.highlight({ zone: null })
            }
        },
        icon: "icon-history",
        disabled: !loggedIn || scriptType === "readonly",
        highlighted: highlight,
        visible: true,
    }, {
        name: t("script.codeIndicator"),
        aria: script ? t("script.codeIndicatorDescriptive", { name: script.name }) : t("script.codeIndicator"),
        onClick: () => script && openCodeIndicator(script),
        icon: "icon-info",
        visible: true,
    }, {
        name: t("script.import"),
        aria: script ? t("ariaDescriptors:scriptBrowser.import", { scriptname: script.name }) : t("script.import"),
        onClick: async () => {
            let imported
            try {
                // exception occurs below if api call fails
                imported = await importScript(script!)
            } catch {
                userNotification.show(i18n.t("messages:createaccount.commerror"), "failure1")
                return
            }
            if (imported && script && openTabs.includes(script.shareid)) {
                dispatch(closeTab(script.shareid))
                dispatch(setActiveTabAndEditor(imported.shareid))
            }
        },
        icon: "icon-import",
        visible: ["shared", "readonly"].includes(scriptType!),
    }, {
        name: t("script.delete"),
        aria: script ? t("ariaDescriptors:scriptBrowser.delete", { scriptname: script.name }) : t("script.delete"),
        onClick: () => {
            if (scriptType === "regular") {
                deleteScript(script!)
            } else if (scriptType === "shared") {
                deleteSharedScript(script!)
            }
        },
        icon: "icon-bin",
        visible: scriptType !== "readonly",
    }]

    return menuType === "buttonmenu"
        ? <ScriptMenuButton script={script} scriptMenuItems={scriptMenuItems} />
        : <ScriptContextMenu script={script} scriptMenuItems={scriptMenuItems} className={className}>{children}</ScriptContextMenu>
}

const ScriptMenuButton = ({ script, scriptMenuItems }: { script: Script, scriptMenuItems: ScriptMenuItem[] }) => {
    const { t } = useTranslation()
    const caiHighlight = useSelector(cai.selectHighlight)
    const highlight = (caiHighlight.zone === "history" && caiHighlight.id === script?.shareid)

    return <Menu>
        <MenuButton
            onClick={(event) => { event.stopPropagation() }}
            className={`flex justify-left truncate ${highlight ? "border-yellow-500 border-4" : ""}`}
            title={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
            aria-label={t("ariaDescriptors:scriptBrowser.options", { scriptname: script.name })}
        >
            <div className="truncate min-w-0">
                <i className="icon-menu3 text-2xl px-2 align-middle" />
            </div>
        </MenuButton>
        <MenuItems anchor="bottom start" className="focus:outline-none border border-black p-2 z-50 bg-white dark:bg-black">
            <MenuItem disabled>
                {({ close }) => (
                    <div className="flex justify-between items-center p-1 space-x-2 pb-2 border-b mb-2 text-sm text-black border-black dark:text-white dark:border-white">
                        <div className="truncate">
                            {script?.name}
                        </div>
                        <button
                            className="icon-cross2 pr-1 align-middle cursor-pointer text-gray-700 dark:text-gray-500"
                            onClick={close}
                            aria-label={script ? t("ariaDescriptors:scriptBrowser.close", { scriptname: script?.name }) : t("thing.close")}
                            title={script ? t("ariaDescriptors:scriptBrowser.close") : t("thing.close")}
                        >
                        </button>
                    </div>
                )}

            </MenuItem>
            {scriptMenuItems.map(({ name, aria, disabled, icon, onClick, visible = true, highlighted }) => visible && <MenuItem key={name}>
                {({ active }) => (
                    <button
                        className={"flex items-center justify-start py-1.5 space-x-2 text-sm text-black dark:text-white w-full " +
                                  (active ? "bg-blue-200 dark:bg-blue-500" : "bg-white dark:bg-black") + " " +
                                  (disabled ? "cursor-not-allowed" : "cursor-pointer") + " " +
                                  (highlighted ? "border-yellow-500 border-4" : "")}
                        onClick={() => {
                            if (disabled) return
                            onClick()
                            close()
                        }}
                        aria-label={aria}
                        title={aria}
                    >
                        <div className="flex justify-center items-center w-6">
                            <i className={`${icon} align-middle`} />
                        </div>
                        <div className={disabled ? "text-gray-500" : ""}>{name}</div>
                    </button>
                )}
            </MenuItem>)}
        </MenuItems>
    </Menu>
}

const ScriptContextMenu = ({ script, className, children, scriptMenuItems }: { script: Script, className?: string, children: React.ReactNode, scriptMenuItems: ScriptMenuItem[] }) => {
    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger className={className}>
                {children}
            </ContextMenu.Trigger>
            <ContextMenu.Portal>
                <ContextMenu.Content className="focus:outline-none border border-black p-2 z-50 bg-white dark:bg-black">
                    <ContextMenu.Item className="" disabled>
                        <div className="flex justify-between items-center p-1 space-x-2 pb-2 border-b mb-2 text-sm text-black border-black dark:text-white dark:border-white">
                            <div className="truncate">
                                {script?.name}
                            </div>
                        </div>
                    </ContextMenu.Item>
                    {scriptMenuItems.map(({ name, aria, disabled, icon, onClick, visible, highlighted }) => {
                        const menuItemsClasses = classNames("flex items-center justify-start py-1.5 space-x-2 text-sm text-black dark:text-white w-full", {
                            "cursor-not-allowed": disabled,
                            "cursor-pointer": !disabled,
                            "border-yellow-500 border-4": highlighted,
                        })
                        return visible && <ContextMenu.Item key={name} className="focus:outline-none data-[highlighted]:bg-blue-200 dark:data-[highlighted]:bg-blue-500 bg-white dark:bg-black">
                            <button
                                className={menuItemsClasses}
                                onClick={() => {
                                    if (disabled) return
                                    onClick()
                                    close()
                                }}
                                aria-label={aria}
                                title={aria}
                            >
                                <div className="flex justify-center items-center w-6">
                                    <i className={`${icon} align-middle`} />
                                </div>
                                <div className={disabled ? "text-gray-500" : ""}>{name}</div>
                            </button>

                        </ContextMenu.Item>
                    })}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    )
}
