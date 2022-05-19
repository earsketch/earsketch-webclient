import React, { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useTranslation } from "react-i18next"

import { shareScript } from "../app/App"
import * as appState from "../app/appState"
import * as user from "../user/userState"
import * as editor from "./Editor"
import * as ide from "./ideState"
import * as tabs from "./tabState"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import reporter from "../app/reporter"

export const callbacks = {
    runScript: () => {},
}

const UndoRedoButtons = () => {
    const enabled = "cursor-pointer text-black dark:text-white"
    const disabled = "cursor-not-allowed text-gray-300 dark:text-gray-700"

    const [hasUndo, setHasUndo] = useState(false)
    const [hasRedo, setHasRedo] = useState(false)

    const { t } = useTranslation()

    const onChange = () => {
        // ACE hasUndo/hasRedo API are not ready synchronously after editor onChange.
        setTimeout(() => {
            setHasUndo(editor.checkUndo())
            setHasRedo(editor.checkRedo())
        })
    }

    useEffect(() => {
        editor.callbacks.onChange = onChange
        return () => { editor.callbacks.onChange = null }
    })

    return (<>
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
    </>)
}

export const EditorHeader = ({ running, cancel }: { running: boolean, cancel: () => void }) => {
    const dispatch = useDispatch()
    const openTabs = useSelector(tabs.selectOpenTabs)
    const activeTab = useSelector(tabs.selectActiveTabID) as string
    const allScripts = useSelector(scripts.selectAllScripts)
    const blocksMode = useSelector(ide.selectBlocksMode)
    const embedMode = useSelector(appState.selectEmbedMode)
    const loggedIn = useSelector(user.selectLoggedIn)
    const script = allScripts[activeTab]
    const scriptType = ((!script || script.readonly) && "readonly") || (script.isShared && "shared") || "regular"
    const { t } = useTranslation()

    const button = [{
        id: "run-button",
        title: t("editor.run"),
        action: callbacks.runScript,
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
            <div className="font-semibold truncate">
                <h2>{t("editor.title").toLocaleUpperCase()}</h2>
            </div>
            <div className={`${openTabs.length ? "flex" : "hidden"} items-center space-x-8`}>
                <UndoRedoButtons />

                {!(script?.collaborative) && (
                    <button
                        className="flex items-center cursor-pointer truncate"
                        onClick={() => {
                            reporter.blocksMode(!blocksMode)
                            dispatch(ide.setBlocksMode(!blocksMode))
                        }}
                        title={t("editor.blocksMode")}
                        aria-label={t("editor.blocksMode")}
                        tabIndex={0}
                    >
                        <div
                            className={`
                                    flex w-6 h-3.5 p-0.5 
                                    rounded-full select-none mr-2 
                                    bg-black dark:bg-gray-700
                                    ${blocksMode ? "justify-end" : "justify-start"}
                                `}
                            tabIndex={0}>
                            <div className="w-2.5 h-2.5 bg-white rounded-full">&nbsp;</div>
                        </div>
                        {t("editor.blocksMode").toLocaleUpperCase()}
                    </button>
                )}
                {(loggedIn && scriptType !== "readonly" && !(scriptType === "shared" && script?.collaborative)) && (
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
                        className={"flex rounded-full px-2.5 text-white cursor-pointer " + button.bgClass}
                        id={button.id} title={button.title} aria-label={button.title} onClick={button.action}
                    >
                        <div className="flex items-center bg-white rounded-full text-xs mr-1 mt-1 p-0.5">
                            <i className={`${button.icon} font-bold ${button.fgClass}`} />
                        </div>
                        {button.title.toLocaleUpperCase()}
                    </button>
                </div>
            </div>
        </div>
    )
}
