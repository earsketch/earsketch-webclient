import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { selectExtensionIcon32, selectExtensionName } from "./extensionState"
import { TitleBar } from "./TitleBar"

/** The title bar for the pane with extension launch icons */
export const ExtensionsTitleBar = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const extensionName = useSelector(selectExtensionName)

    return (
        <TitleBar title={t("extensions")} closeButtonTitle={t("extension.close")}>
            {extensionIcon32 && (
                <ExtensionLaunchButton
                    extensionName={extensionName}
                    extensionIcon32={extensionIcon32}
                    onClick={() => { dispatch(appState.setEastContent("extension")) }}
                />
            )}
        </TitleBar>
    )
}

type ExtensionLaunchButtonProps = {
    extensionName: string
    extensionIcon32: string
    onClick?: () => void
}

/** An icon for launching an extension */
const ExtensionLaunchButton = ({ extensionName, extensionIcon32, onClick }: ExtensionLaunchButtonProps) => {
    const { t } = useTranslation()

    return (
        <button
            className="inline-flex items-center justify-center w-8 h-8 ml-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-inner hover:bg-gray-200 dark:hover:bg-gray-700"
            title={t("extension.switchToExtension", { extensionName })}
            onClick={onClick}>
            <img src={extensionIcon32} alt="" className="w-5 h-5" />
        </button>
    )
}
