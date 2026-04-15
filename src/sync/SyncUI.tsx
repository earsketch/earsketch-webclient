import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAppSelector as useSelector } from "../hooks"
import * as syncState from "./syncState"
import { connectBackend, disconnectBackend } from "./syncEngine"
import { createDriveBackend } from "./driveBackend"
import { createFSABackend } from "./fsaBackend"
import { openModal } from "../app/modal"
import { SyncInspector } from "./SyncInspector"

declare const ES_WEB_GOOGLE_CLIENT_ID: string | undefined

export const SyncButton = () => {
    const { t } = useTranslation()
    const status = useSelector(syncState.selectSyncStatus)
    const backendKind = useSelector(syncState.selectSyncBackendKind)
    const syncing = useSelector(syncState.selectSyncSyncing)
    const error = useSelector(syncState.selectSyncError)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [menuOpen])

    const driveAvailable = typeof ES_WEB_GOOGLE_CLIENT_ID === "string" && ES_WEB_GOOGLE_CLIENT_ID.length > 0
    const fsaAvailable = "showDirectoryPicker" in window

    if (!driveAvailable && !fsaAvailable) return null

    const handleConnect = async (kind: "drive" | "fsa") => {
        setMenuOpen(false)
        try {
            if (kind === "drive") {
                const backend = createDriveBackend(ES_WEB_GOOGLE_CLIENT_ID!)
                await connectBackend(backend)
            } else {
                const backend = createFSABackend()
                await connectBackend(backend)
            }
        } catch {
            // Error is set in Redux by syncEngine
        }
    }

    const handleDisconnect = () => {
        setMenuOpen(false)
        disconnectBackend()
    }

    const handleInspect = () => {
        setMenuOpen(false)
        openModal(SyncInspector, {})
    }

    if (status === "connected") {
        const label = backendKind === "drive"
            ? t("sync.connectedDrive")
            : t("sync.connectedFolder")

        return (
            <div className="relative flex items-center gap-1 mx-1 shrink-0" ref={menuRef}>
                <button
                    className="py-0.5 px-2 text-xs bg-green-600 text-white hover:bg-green-500 rounded flex items-center gap-1"
                    onClick={() => setMenuOpen(!menuOpen)}
                    title={error ?? label}
                >
                    {syncing
                        ? (
                            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )
                        : (
                            <span>&#x2713;</span>
                        )}
                    <span className="hidden sm:inline">{label}</span>
                </button>
                {menuOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 min-w-[160px]">
                        <button
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={handleInspect}
                        >
                            {t("sync.inspect")}
                        </button>
                        <button
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={handleDisconnect}
                        >
                            {t("sync.disconnect")}
                        </button>
                    </div>
                )}
            </div>
        )
    }

    if (status === "connecting") {
        return (
            <div className="flex items-center gap-1 mx-1 shrink-0">
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">{t("sync.connecting")}</span>
            </div>
        )
    }

    // Disconnected or error — show connect menu
    return (
        <div className="relative flex items-center gap-1 mx-1 shrink-0" ref={menuRef}>
            <button
                className="py-0.5 px-2 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded"
                onClick={() => setMenuOpen(!menuOpen)}
                title={error ?? t("sync.connectTitle")}
            >
                {t("sync.connect")}
            </button>
            {error && (
                <span className="text-xs text-red-400 hidden lg:inline" title={error}>!</span>
            )}
            {menuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50 min-w-[160px]">
                    {driveAvailable && (
                        <button
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleConnect("drive")}
                        >
                            {t("sync.googleDrive")}
                        </button>
                    )}
                    {fsaAvailable && (
                        <button
                            className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => handleConnect("fsa")}
                        >
                            {t("sync.localFolder")}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
