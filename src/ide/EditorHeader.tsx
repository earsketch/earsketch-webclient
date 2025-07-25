import { Menu } from "@headlessui/react"
import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import type { Script } from "common"
import * as editor from "./Editor"
import * as ide from "./ideState"
import * as tabs from "./tabState"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import reporter from "../app/reporter"
import * as user from "../user/userState"

const UndoRedoButtons = () => {
    const enabled = "cursor-pointer text-black dark:text-white"
    const disabled = "cursor-not-allowed text-gray-300 dark:text-gray-700"

    const [hasUndo, setHasUndo] = useState(false)
    const [hasRedo, setHasRedo] = useState(false)

    const { t } = useTranslation()

    const onChange = () => {
        setHasUndo(editor.checkUndo())
        setHasRedo(editor.checkRedo())
    }

    useEffect(() => {
        editor.changeListeners.push(onChange)
        return () => { editor.changeListeners.splice(editor.changeListeners.indexOf(onChange), 1) }
    })

    return <div className="whitespace-nowrap space-x-4">
        <button
            className={`icon-spinner11 ${hasUndo ? enabled : disabled}`}
            style={{ transform: "scaleX(-1)" }}
            onClick={() => editor.checkUndo() && editor.undo()}
            title={t("editor.undoEdit")}
            aria-label={hasUndo ? t("editor.undoEdit") : t("ariaDescriptors:editor.undoEditDisabled")}
        ></button>
        <button
            className={`icon-spinner11 ${hasRedo ? enabled : disabled}`}
            onClick={() => editor.checkRedo() && editor.redo()}
            title={t("editor.redoEdit")}
            aria-label={hasRedo ? t("editor.redoEdit") : t("ariaDescriptors:editor.redoEditDisabled")}
        ></button>
    </div>
}

// eslint-disable-next-line react/display-name
const ToggleButton = React.forwardRef(({ hovered, labelKey, state, setState, ...props }: { hovered: boolean, labelKey: string, state: boolean, setState: (x: boolean) => void, props?: any }, ref) => {
    const { t } = useTranslation()
    const stateSuffix = state ? "disable" : "enable"
    return <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={"flex items-center cursor-pointer truncate group w-full px-2 py-1 text-black " + (hovered ? "bg-gray-300" : "")}
        title={t(`${labelKey}.tooltip-${stateSuffix}`)}
        aria-label={t(`${labelKey}.tooltip-${stateSuffix}`)}
        tabIndex={0}
        {...props} // for HeadlessUI
        onClick={() => {
            setState(!state)
        }}
    >
        <div
            className={`
                    flex min-w-[theme('spacing[6]')] h-3.5 p-0.5
                    rounded-full select-none mr-2
                    ${state ? "bg-black justify-end" : "bg-gray-400 justify-start"}
                `}
        >
            <div className="w-2.5 h-2.5 bg-white rounded-full">&nbsp;</div>
        </div>
        {t(labelKey).toLocaleUpperCase()}
    </button>
})

const SettingsMenu = () => {
    const { t } = useTranslation()
    const blocksMode = useSelector(ide.selectBlocksMode)
    const autocomplete = useSelector(ide.selectAutocomplete)
    const playArrows = useSelector(ide.selectPlayArrows)
    const dispatch = useDispatch()

    const actions = [
        { nameKey: "editor.blocksMode", state: blocksMode, setState(state: boolean) { reporter.blocksMode(state); dispatch(ide.setBlocksMode(state)) } },
        { nameKey: "editor.autocomplete", state: autocomplete, setState(state: boolean) { dispatch(ide.setAutocomplete(state)) } },
        {
            nameKey: "editor.playArrows",
            state: playArrows,
            setState(state: boolean) {
                dispatch(ide.setPlayArrows(state))
                if (state === false) {
                    editor.setDAWPlayingLines([])
                }
            },
        },
    ]

    return <Menu as="div" className="relative inline-block text-left mx-3">
        <Menu.Button className="hover:text-gray-700 text-xl" title={t("ariaDescriptors:editor.settings")} aria-label={t("ariaDescriptors:editor.settings")}>
            <div className="flex flex-row items-center">
                <div><i className="icon icon-cog" /></div>
                <div className="ml-1"><span className="caret" /></div>
            </div>
        </Menu.Button>
        <Menu.Items className="absolute z-50 right-0 mt-1 origin-top-right bg-gray-100 divide-y divide-gray-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {actions.map(({ nameKey, state, setState }) =>
                <Menu.Item key={nameKey}>
                    {({ active }) => <ToggleButton hovered={active} labelKey={nameKey} state={state} setState={setState} />}
                </Menu.Item>)}
        </Menu.Items>
    </Menu>
}

export const EditorHeader = ({ running, run, cancel, shareScript }: {
    running: boolean, run: () => void, cancel: () => void, shareScript: (s: Script) => void
}) => {
    const openTabs = useSelector(tabs.selectOpenTabs)
    const activeTab = useSelector(tabs.selectActiveTabID) as string
    const allScripts = useSelector(scripts.selectAllScripts)
    const embedMode = useSelector(appState.selectEmbedMode)
    const loggedIn = useSelector(user.selectLoggedIn)
    const script = allScripts[activeTab]
    const scriptType = ((!script || script.readonly) && "readonly") || (script.isShared && "shared") || "regular"
    const { t } = useTranslation()

    const button = [{
        id: "run-button",
        title: t("editor.run"),
        action: run,
        fgClass: "text-green-600",
        bgClass: "bg-green-700",
        icon: "icon-arrow-right22",
    }, {
        id: "cancel-button",
        title: t("cancel"),
        action: cancel,
        fgClass: "text-red-600",
        bgClass: "bg-red-700",
        icon: "icon-cross2",
    }][+running]

    return (
        <div
            className={`
                ${embedMode ? "hidden" : "flex"}
                justify-between items-center
                font-sans py-1.5 px-3
                text-black bg-white dark:text-white dark:bg-black
            `}
        >
            <div className="pl-2 font-semibold truncate">
                <h2>{t("editor.title").toLocaleUpperCase()}</h2>
            </div>
            <div className={`${openTabs.length ? "flex" : "hidden"} items-center space-x-8`}>
                <UndoRedoButtons />
                <SettingsMenu />
                {(loggedIn && scriptType !== "readonly") && (
                    <button
                        className={`
                                rounded-full
                                text-white
                                cursor-pointer
                                px-2.5
                                bg-black dark:bg-gray-700
                            `}
                        onClick={() => {
                            const unsavedScript = scripts.selectRegularScripts(store.getState())[activeTab]
                            shareScript(unsavedScript)
                        }}
                        title={t("script.share")}
                        aria-label={t("script.share")}
                    >
                        <i className="icon-share32 pr-2" />
                        {t("script.share").toLocaleUpperCase()}
                    </button>
                )}
                <div className="w-24">
                    <button
                        className={"flex rounded-full px-2.5 text-white items-center " + button.bgClass}
                        id={button.id} title={button.title} aria-label={button.title} onClick={button.action}
                    >
                        <div className="flex bg-white rounded-full text-xs mr-1 p-0.5">
                            <i className={`${button.icon} font-bold ${button.fgClass}`} />
                        </div>
                        {button.title.toLocaleUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    )
}
