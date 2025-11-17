import i18n from "i18next"
import { useTranslation } from "react-i18next"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react"
import PopperJS from "@popperjs/core"

import { Script, ScriptType } from "common"
import * as exporter from "../app/exporter"
import * as user from "../user/userState"
import * as scripts from "./scriptsState"
import * as tabs from "../ide/tabState"
import * as cai from "../cai/caiState"
import * as caiThunks from "../cai/caiThunks"
import { setActiveTabAndEditor, closeTab } from "../ide/tabThunks"
import * as userNotification from "../user/notification"
import { importScript, saveScript } from "./scriptsThunks"

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

type ScriptAction = (_: Script) => void

interface ScriptActions {
    script: Script, type: ScriptType
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
    script,
    type,
    delete: delete_, deleteShared, download, openIndicator, openHistory,
    rename, share, submit,
}: ScriptActions) => {
    const dispatch = useDispatch()
    const context = useSelector(scripts.selectDropdownMenuContext)
    const { t } = useTranslation()

    const loggedIn = useSelector(user.selectLoggedIn)
    const openTabs = useSelector(tabs.selectOpenTabs)

    const caiHighlight = useSelector(cai.selectHighlight)
    const highlight = (caiHighlight.zone === "history" && caiHighlight.id === script?.shareid)

    const scriptMenuItems = [{
        name: t("thing.open"),
        aria: script ? t("ariaDescriptors:scriptBrowser.open", { scriptname: script.name }) : t("thing.open"),
        onClick: () => {
            if (!script) return

            if (type === "regular") {
                dispatch(setActiveTabAndEditor(script.shareid))
            } else if (type === "shared") {
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
        visible: type === "regular",
    }, {
        name: t("script.rename"),
        aria: script ? t("ariaDescriptors:scriptBrowser.rename", { scriptname: script.name }) : t("script.rename"),
        onClick: () => rename(script!),
        icon: "icon-pencil2",
        visible: type === "regular",
    }, {
        name: t("script.download"),
        aria: script ? t("ariaDescriptors:scriptBrowser.download", { scriptname: script.name }) : t("script.download"),
        onClick: () => download(script!),
        icon: "icon-cloud-download",
    }, {
        name: t("script.print"),
        aria: script ? t("ariaDescriptors:scriptBrowser.print", { scriptname: script.name }) : t("script.print"),
        onClick: () => exporter.print(script!),
        icon: "icon-printer",
    }, {
        name: t("script.share"),
        aria: script ? t("ariaDescriptors:scriptBrowser.share", { scriptname: script.name }) : t("script.share"),
        onClick: () => share(script!),
        icon: "icon-share32",
        disabled: !loggedIn,
        visible: type === "regular",
    }, {
        name: t("script.submitCompetition"),
        aria: script ? t("script.submitCompetitionrDescriptive", { name: script.name }) : t("script.submitCompetition"),
        onClick: () => submit(script!),
        icon: "icon-earth",
        disabled: !loggedIn,
        visible: type === "regular" && loggedIn && ES_WEB_SHOW_COMPETITION_SUBMIT,
    }, {
        name: t("script.history"),
        aria: script ? t("script.historyDescriptive", { name: script.name }) : t("script.history"),
        onClick: () => {
            script && openHistory(script, !script.isShared)
            if (highlight) {
                caiThunks.highlight({ zone: null })
            }
        },
        icon: "icon-history",
        disabled: !loggedIn || type === "readonly",
        highlighted: highlight,
    }, {
        name: t("script.codeIndicator"),
        aria: script ? t("script.codeIndicatorDescriptive", { name: script.name }) : t("script.codeIndicator"),
        onClick: () => script && openIndicator(script),
        icon: "icon-info",
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
        visible: ["shared", "readonly"].includes(type!),
    }, {
        name: t("script.delete"),
        aria: script ? t("ariaDescriptors:scriptBrowser.delete", { scriptname: script.name }) : t("script.delete"),
        onClick: () => {
            if (type === "regular") {
                delete_(script!)
            } else if (type === "shared") {
                deleteShared(script!)
            }
        },
        icon: "icon-bin",
        visible: type !== "readonly",
    }]

    // Headless UI's Menu has internally-managed open/close state that is always tied to left-clicking a Menu.Button,
    // which is unfortunate if you want a right-click context menu - as we do.
    // (See https://github.com/tailwindlabs/headlessui/discussions/649.)
    // Dialog allows you to manage open/close state, but isn't a Menu, and thus lacks arrow key navigation for menu items.
    // Thus, we have a Menu nested inside of a Dialog. Is it janky? Yes. Does it do everything we want? Yes.
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
