import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { selectExtensionIcon32, selectExtensionName } from "./extensionState"
import { ExtensionLaunchButton } from "./ExtensionLaunchButton"
import { TitleBar } from "./TitleBar"
import { TrustedExtensions } from "./TrustedExtensions"

/** The title bar for the pane with extension launch icons */
export const ExtensionsTitleBar = () => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const extensionName = useSelector(selectExtensionName)

    return (
        <TitleBar title={t("extensions")} closeButtonTitle={t("extension.close")}>
            <TrustedExtensions />
            {extensionIcon32 && (
                <ExtensionLaunchButton
                    extensionName={extensionName}
                    onClick={() => { dispatch(appState.setEastContent("extension")) }}
                >
                    <img src={extensionIcon32} alt="" className="w-5 h-5" />
                </ExtensionLaunchButton>
            )}
        </TitleBar>
    )
}
