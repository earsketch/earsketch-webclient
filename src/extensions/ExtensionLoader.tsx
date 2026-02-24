import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Alert, ModalBody, ModalFooter, ModalHeader } from "../Utils"
import { setExtensionUrl, setEastContent, setExtensionName, setExtensionPermissions, setExtensionIcon32 } from "../app/appState"
import store from "../reducers"

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

        // Dispatch all extension metadata to Redux
        store.dispatch(setExtensionUrl(extensionUrl))
        store.dispatch(setExtensionName(manifest.name))
        store.dispatch(setExtensionPermissions(manifest.permissions || []))
        store.dispatch(setExtensionIcon32(icon32Url))
        store.dispatch(setEastContent("extension"))
        close()
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
        <ModalHeader>{t("loadExtension")}</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); loadExtension() }}>
            <ModalBody>
                <div className="mb-3">
                    <button
                        type="button"
                        className="mx-2.5 my-1 px-2.5 py-px rounded-md text-black dark:text-white text-xs border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={pasteDemoUrl}>
                        PASTE DEMO URL
                    </button>
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
            <ModalFooter submit="loadExtension" ready={manifest !== null} close={close} />
        </form>
    </>
}
