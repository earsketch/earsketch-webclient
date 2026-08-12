import { ReactNode } from "react"
import { useTranslation } from "react-i18next"

type ExtensionLaunchButtonProps = {
    extensionName: string
    children: ReactNode
    onClick?: () => void
    selected?: boolean
}

/** An icon for launching an extension */
export const ExtensionLaunchButton = ({ extensionName, children, onClick, selected = false }: ExtensionLaunchButtonProps) => {
    const { t } = useTranslation()

    return (
        <button
            className={`inline-flex items-center justify-center w-8 h-8 ml-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-inner hover:bg-gray-200 dark:hover:bg-gray-700 ${selected ? "ring-2 ring-amber" : ""}`}
            title={t("extension.switchToExtension", { extensionName })}
            aria-pressed={selected}
            onClick={onClick}>
            {children}
        </button>
    )
}
