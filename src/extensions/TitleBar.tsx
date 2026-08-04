import { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import * as layout from "../ide/layoutState"
import { selectExtensionIcon32, selectExtensionName } from "./extensionState"

/** The title bar for east-pane components - with menu icons provided using the `children` prop */
export const TitleBar = ({ title, closeButtonTitle, children }: { title: string, closeButtonTitle: string, children?: ReactNode }) => {
    const dispatch = useDispatch()

    return (
        <div className="flex items-center p-2 text-base bg-white text-black dark:bg-gray-900 dark:text-white">
            <div className="ltr:pl-2 ltr:pr-4 rtl:pl-4 rtl:pr-3 font-semibold truncate">
                <h2>{title.toLocaleUpperCase()}</h2>
            </div>
            <div>
                <button
                    className="flex justify-end w-7 h-4 p-0.5 rounded-full cursor-pointer bg-black dark:bg-gray-700"
                    onClick={() => dispatch(layout.setEast({ open: false }))}
                    title={closeButtonTitle}
                    aria-label={closeButtonTitle}
                >
                    <div className="w-3 h-3 bg-white rounded-full">&nbsp;</div>
                </button>
            </div>
            <div className="flex items-center ltr:ml-auto rtl:mr-auto">
                {children}
            </div>
        </div>
    )
}

/** The extensions title bar with extension launch icons */
export const ExtensionsTitleBar = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const extensionName = useSelector(selectExtensionName)

    return (
        <TitleBar title={t("extensions")} closeButtonTitle={t("extension.close")}>
            {extensionIcon32 && (
                <button
                    className="inline-flex items-center justify-center w-8 h-8 ml-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-inner hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t("extension.switchToExtension", { extensionName })}
                    onClick={() => { dispatch(appState.setEastContent("extension")) }}>
                    <img src={extensionIcon32} alt="" className="w-5 h-5" />
                </button>
            )}
        </TitleBar>
    )
}
