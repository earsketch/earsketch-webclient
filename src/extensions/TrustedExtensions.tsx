import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { openModal } from "../app/modal"
import { useAppDispatch as useDispatch, useAppSelector } from "../hooks"
import * as layout from "../ide/layoutState"
import { CatalogExtension, extensionCatalog } from "./extensionCatalog"
import { ExtensionLoader } from "./ExtensionLoader"
import { ExtensionLaunchButton } from "./ExtensionLaunchButton"
import { selectInstalledExtensionIds } from "./extensionState"
import { loadExtension } from "./loadExtension"

export const CurriculumExtension = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const extensionName = t("curriculum.title")

    const launch = () => {
        dispatch(appState.setEastContent("curriculum"))
        dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
    }

    return (
        <ExtensionLaunchButton extensionName={extensionName} onClick={launch}>
            <span className="icon icon-book" aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

const CatalogExtensionLauncher = ({ extension }: { extension: CatalogExtension }) => {
    const launch = async () => {
        try {
            await loadExtension(extension.url, extension.id)
        } catch (error) {
            console.error(`Failed to load ${extension.name} extension:`, error)
        }
    }

    return (
        <ExtensionLaunchButton extensionName={extension.name} onClick={launch}>
            <span className={`icon ${extension.iconClass}`} aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

export const ExtensionLoaderButton = () => {
    const { t } = useTranslation()
    const title = t("loadExtension")

    return (
        <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-8 ml-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-inner hover:bg-gray-200 dark:hover:bg-gray-700"
            title={title}
            aria-label={title}
            onClick={() => openModal(ExtensionLoader)}>
            {/* <span className="icon icon-plus2" aria-hidden="true" /> */}
            <div>+</div>
        </button>
    )
}

export const TrustedExtensions = () => {
    const installedExtensionIds = useAppSelector(selectInstalledExtensionIds)

    return (
        <>
            <CurriculumExtension />
            {extensionCatalog
                .filter(extension => installedExtensionIds.includes(extension.id))
                .map(extension => <CatalogExtensionLauncher key={extension.id} extension={extension} />)}
            <ExtensionLoaderButton />
        </>
    )
}
