import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"
import parse from "html-react-parser"
import { setEastContent } from "../app/appState"
import store from "../reducers"
import { useAppSelector } from "../hooks"
import { setExtension, clearExtension, selectExtensionUrl, selectExtensionName, selectExtensionVersion, selectExtensionDescription, selectExtensionPermissions, selectExtensionIcon32 } from "./extensionState"

interface ExtensionManifest {
    manifest_version: number
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
    const currentExtensionIcon32 = useAppSelector(selectExtensionIcon32)

    const loadExtension = () => {
        if (!manifest?.side_panel?.default_path) {
            setError(t("extension.noValidExtension"))
            return
        }

        // Construct the full extension URL using URL constructor
        const extensionUrl = new URL(manifest.side_panel.default_path, url).href

        // Construct the 32px icon URL if available
        const icon32Url = manifest.icons?.["32"]
            ? new URL(manifest.icons["32"], url).href
            : ""

        // Dispatch all extension metadata to Redux in a single action
        store.dispatch(setExtension({
            url: extensionUrl,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            permissions: manifest.permissions || [],
            icon32: icon32Url,
        }))
        store.dispatch(setEastContent("extension"))
        close()
    }

    const removeExtension = () => {
        store.dispatch(clearExtension())
        store.dispatch(setEastContent("curriculum"))
    }

    const pasteDemoUrl = () => {
        setUrl(window.location.href)
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
                {currentExtensionUrl && (
                    <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-start gap-4">
                            {currentExtensionIcon32 && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={currentExtensionIcon32}
                                        alt={currentExtensionName}
                                        className="w-12 h-12 rounded border border-gray-300 dark:border-gray-400"
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
