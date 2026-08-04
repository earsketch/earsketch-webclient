import { useTranslation } from "react-i18next"
import { TitleBar } from "./TitleBar"
import { TrustedExtensions } from "./TrustedExtensions"

/** The title bar for the pane with extension launch icons */
export const ExtensionsTitleBar = () => {
    const { t } = useTranslation()

    return (
        <TitleBar title={t("extensions")} closeButtonTitle={t("extension.close")}>
            <TrustedExtensions />
        </TitleBar>
    )
}
