import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"
import parse from "html-react-parser"
import { setEastContent } from "../app/appState"
import store from "../reducers"
import { useAppDispatch, useAppSelector } from "../hooks"
import { setExtension, clearExtension, installExtension, uninstallExtension, selectExtensionUrl, selectExtensionName, selectExtensionVersion, selectExtensionDescription, selectExtensionPermissions, selectExtensionIcon128, selectInstalledExtensionIds, selectActiveCatalogExtensionId } from "./extensionState"
import { CatalogExtension, CatalogExtensionId, extensionCatalog } from "./extensionCatalog"

const ExtensionCard = ({ extension, installed, onToggle }: {
    extension: CatalogExtension
    installed: boolean
    onToggle: () => void
}) => {
    const { t } = useTranslation()

    return (
        <article className="flex min-h-36 flex-col rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800">
            <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 text-2xl text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    <span className={`icon ${extension.iconClass}`} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        {extension.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {t(extension.descriptionKey)}
                    </p>
                </div>
            </div>
            <div className="mt-auto flex justify-end pt-4">
                <button
                    type="button"
                    className={installed
                        ? "rounded-md border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800"}
                    onClick={onToggle}
                    aria-label={t(installed ? "extension.catalog.removeNamed" : "extension.catalog.addNamed", { extensionName: extension.name })}
                >
                    {t(installed ? "extension.catalog.remove" : "extension.catalog.add")}
                </button>
            </div>
        </article>
    )
}

interface ExtensionManifest {
    manifest_version: number
    extension_api_version?: string
    name: string
    version: string
    description: string
    icons?: {
        "32"?: string
        "128"?: string
    }
    side_panel?: {
        default_path: string
    }
    permissions?: string[]
}

export const ExtensionLoader = ({ close }: { close: () => void }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const [url, setUrl] = useState("")
    const [manifest, setManifest] = useState<ExtensionManifest | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [showDetails, setShowDetails] = useState(false)

    const currentExtensionUrl = useAppSelector(selectExtensionUrl)
    const currentExtensionName = useAppSelector(selectExtensionName)
    const currentExtensionVersion = useAppSelector(selectExtensionVersion)
    const currentExtensionDescription = useAppSelector(selectExtensionDescription)
    const currentExtensionPermissions = useAppSelector(selectExtensionPermissions)
    const currentExtensionIcon128 = useAppSelector(selectExtensionIcon128)
    const installedExtensionIds = useAppSelector(selectInstalledExtensionIds)
    const activeCatalogExtensionId = useAppSelector(selectActiveCatalogExtensionId)

    const loadExtension = () => {
        if (!manifest?.side_panel?.default_path) {
            setError(t("extension.noValidExtension"))
            return
        }

        // Construct the full extension URL using URL constructor
        const extensionUrl = new URL(manifest.side_panel.default_path, url).href

        // Construct icon URLs if available
        const icon32Url = manifest.icons?.["32"]
            ? new URL(manifest.icons["32"], url).href
            : ""
        const icon128Url = manifest.icons?.["128"]
            ? new URL(manifest.icons["128"], url).href
            : ""

        // Dispatch all extension metadata to Redux in a single action
        store.dispatch(setExtension({
            url: extensionUrl,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            permissions: manifest.permissions || [],
            icon32: icon32Url,
            icon128: icon128Url,
            extensionApiVersion: manifest.extension_api_version ?? "1",
        }))
        store.dispatch(setEastContent("extension"))
        close()
    }

    const removeExtension = () => {
        store.dispatch(clearExtension())
        store.dispatch(setEastContent("curriculum"))
    }

    const toggleInstalledExtension = (id: CatalogExtensionId) => {
        if (installedExtensionIds.includes(id)) {
            dispatch(uninstallExtension(id))
            if (activeCatalogExtensionId === id) {
                dispatch(clearExtension())
                dispatch(setEastContent("curriculum"))
            }
        } else {
            dispatch(installExtension(id))
        }
    }

    const previewExtension = async () => {
        if (!url) return

        setLoading(true)
        setError("")
        setManifest(null)

        try {
            // Construct the manifest URL using URL constructor
            const manifestUrl = new URL("es-ext.json", url).href

            const response = await fetch(manifestUrl, { method: "GET", headers: { "ngrok-skip-browser-warning": "1" } })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            if (!data.permissions?.includes("sidePanel")) {
                setError(t("extension.noValidExtension"))
                return
            }
            setManifest(data)
        } catch (err) {
            console.error("Failed to fetch extension manifest:", err)
            setError(t("extension.noValidExtension"))
        } finally {
            setLoading(false)
        }
    }

    const getIconUrl = () => {
        if (!manifest?.icons?.["128"] || !url) return null

        // Construct the icon URL using URL constructor
        const iconPath = manifest.icons["128"]
        return new URL(iconPath, url).href
    }

    return <>
        <ModalHeader>{t("extensions")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); loadExtension() }}>
            <ModalBody>
                <section aria-labelledby="extension-catalog-heading" className="mb-5">
                    <h2 id="extension-catalog-heading" className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                        {t("extension.catalog.heading")}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {extensionCatalog.map(extension => (
                            <ExtensionCard
                                key={extension.id}
                                extension={extension}
                                installed={installedExtensionIds.includes(extension.id)}
                                onToggle={() => toggleInstalledExtension(extension.id)}
                            />
                        ))}
                    </div>
                </section>

                <div className="mb-4 border-t border-gray-300 pt-4 dark:border-gray-600">
                    <h2 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                        {t("extension.catalog.loadFromUrl")}
                    </h2>
                </div>
                {currentExtensionUrl && (
                    <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-start gap-4">
                            {currentExtensionIcon128 && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={currentExtensionIcon128}
                                        alt={currentExtensionName}
                                        className="w-16 h-16 rounded"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none"
                                        }}
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                    {currentExtensionName}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    {t("extension.currentlyLoaded")}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-md text-sm border border-sky-700 text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                                        onClick={() => setShowDetails(!showDetails)}>
                                        {showDetails ? t("extension.hideDetails") : t("extension.showDetails")}
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-md text-sm border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={removeExtension}>
                                        {t("extension.remove")}
                                    </button>
                                </div>
                                {showDetails && (
                                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {t("extension.version")}: {currentExtensionVersion}
                                        </p>
                                        {currentExtensionDescription && (
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                                {currentExtensionDescription}
                                            </p>
                                        )}
                                        {currentExtensionPermissions && currentExtensionPermissions.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                    {t("extension.permissionsHeader")}
                                                </p>
                                                <ul className="space-y-1">
                                                    {currentExtensionPermissions.map((permission, index) => (
                                                        <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                                            <span className="mr-2 text-green-600 dark:text-green-400">✓</span>
                                                            {t(`extension.permission.${permission}`)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <div className="mb-3">
                    {parse(t("extensionLoad.description"))}
                </div>
                <label htmlFor="extension-url-input" className="text-sm">
                    {t("extension.urlLabel")}
                </label>
                <div className="mt-1 mb-3 flex gap-2">
                    <input
                        id="extension-url-input"
                        type="text"
                        placeholder={t("extension.urlPlaceholder")}
                        className="form-input flex-1 dark:bg-transparent placeholder:text-gray-300"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); previewExtension() } }}
                        autoFocus
                        required
                    />
                    <button
                        type="button"
                        className="px-3 py-2 rounded-md text-sm border border-sky-700 text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={previewExtension}
                        disabled={!url || loading}>
                        {t("extension.preview")}
                    </button>
                </div>

                {loading && (
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md text-sm">
                        {t("extension.loading")}
                    </div>
                )}

                {error && <Alert message={error} />}

                {manifest && (
                    <div className="mb-3 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-start gap-4">
                            {getIconUrl() && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={getIconUrl()!}
                                        alt={manifest.name}
                                        className="w-16 h-16 rounded"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none"
                                        }}
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {manifest.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {t("extension.version")}: {manifest.version}
                                </p>
                                {manifest.description && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                        {manifest.description}
                                    </p>
                                )}
                                {manifest.permissions && manifest.permissions.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                            {t("extension.permissionsHeader")}
                                        </p>
                                        <ul className="space-y-1">
                                            {manifest.permissions.map((permission, index) => (
                                                <li key={index} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                                    <span className="mr-2 text-green-600 dark:text-green-400">✓</span>
                                                    {t(`extension.permission.${permission}`)}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </ModalBody>
            <ModalFooter submit="loadExtension" ready={manifest !== null} close={close} cancel="thing.close" />
        </form>
    </>
}
