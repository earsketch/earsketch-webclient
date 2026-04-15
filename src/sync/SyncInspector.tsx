import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ModalHeader, ModalBody, Alert } from "../Utils"
import { SyncBackend, SyncFileInfo } from "./syncBackend"
import { disconnectBackend, getActiveBackend } from "./syncEngine"

interface Props {
    close: () => void
}

function formatSize(bytes?: number): string {
    if (bytes === undefined) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(ms: number): string {
    const d = new Date(ms)
    return d.toLocaleString()
}

export const SyncInspector = ({ close }: Props) => {
    const { t } = useTranslation()
    const [files, setFiles] = useState<SyncFileInfo[] | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(true)
    const [confirmingClear, setConfirmingClear] = useState(false)
    const [clearing, setClearing] = useState(false)

    const backend: SyncBackend | null = getActiveBackend()

    const refresh = async () => {
        if (!backend) return
        setLoading(true)
        setError("")
        try {
            const list = await backend.listFiles()
            list.sort((a, b) => a.path.localeCompare(b.path))
            setFiles(list)
        } catch (err: any) {
            setError(err.message ?? String(err))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
    }, [])

    const doClear = async () => {
        if (!backend) return
        setClearing(true)
        setError("")
        try {
            await backend.clearAll()
            // Disconnect so the sync engine doesn't immediately re-push local state.
            disconnectBackend()
            close()
        } catch (err: any) {
            setError(err.message ?? String(err))
            setClearing(false)
        }
    }

    if (!backend) {
        return <>
            <ModalHeader>{t("sync.inspectTitle")}</ModalHeader>
            <ModalBody>
                <p>{t("sync.notConnected")}</p>
            </ModalBody>
            <div className="flex items-center justify-end border-t p-3.5">
                <button className="btn text-sm py-1.5 px-3 bg-white text-black hover:bg-gray-200"
                    onClick={close}>
                    {t("cancel").toLocaleUpperCase()}
                </button>
            </div>
        </>
    }

    const totalSize = files?.reduce((sum, f) => sum + (f.size ?? 0), 0) ?? 0
    const backendLabel = backend.kind === "drive"
        ? t("sync.connectedDrive")
        : t("sync.connectedFolder")

    return <>
        <ModalHeader>{t("sync.inspectTitle")}</ModalHeader>
        <ModalBody>
            <Alert message={error} />
            <div className="mb-3 text-sm">
                <div><strong>{t("sync.inspectBackend")}:</strong> {backendLabel}</div>
                {files && <div>
                    <strong>{t("sync.inspectSummary")}:</strong> {t("sync.inspectFileCount", { count: files.length })} ({formatSize(totalSize)})
                </div>}
            </div>

            {loading && <p className="text-sm text-gray-500">{t("sync.inspectLoading")}</p>}

            {files && files.length === 0 && !loading && (
                <p className="text-sm text-gray-500">{t("sync.inspectEmpty")}</p>
            )}

            {files && files.length > 0 && (
                <div className="max-h-96 overflow-y-auto border border-gray-300 rounded">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                            <tr>
                                <th className="px-2 py-1 text-left">{t("sync.inspectPath")}</th>
                                <th className="px-2 py-1 text-right">{t("sync.inspectSize")}</th>
                                <th className="px-2 py-1 text-left">{t("sync.inspectModified")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map(f => (
                                <tr key={f.path} className="border-t border-gray-200">
                                    <td className="px-2 py-1 font-mono truncate max-w-xs">{f.path}</td>
                                    <td className="px-2 py-1 text-right">{formatSize(f.size)}</td>
                                    <td className="px-2 py-1">{formatDate(f.modifiedTime)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {confirmingClear && (
                <div className="mt-4 p-3 border border-red-400 bg-red-50 dark:bg-red-900 dark:border-red-600 rounded text-sm">
                    <p className="font-semibold mb-2">{t("sync.clearConfirmTitle")}</p>
                    <p className="mb-3">{t("sync.clearConfirmBody")}</p>
                    <div className="flex gap-2">
                        <button
                            className="btn text-xs py-1 px-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            onClick={doClear}
                            disabled={clearing}
                        >
                            {t("sync.clearConfirmButton")}
                        </button>
                        <button
                            className="btn text-xs py-1 px-2 bg-white text-black hover:bg-gray-200"
                            onClick={() => setConfirmingClear(false)}
                            disabled={clearing}
                        >
                            {t("cancel")}
                        </button>
                    </div>
                </div>
            )}
        </ModalBody>
        <div className="flex items-center justify-between border-t p-3.5">
            <button
                className="btn text-sm py-1.5 px-3 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => setConfirmingClear(true)}
                disabled={loading || clearing || !files || files.length === 0 || confirmingClear}
            >
                {t("sync.clearButton")}
            </button>
            <div className="flex gap-2">
                <button
                    className="btn text-sm py-1.5 px-3 bg-white text-black hover:bg-gray-200"
                    onClick={refresh}
                    disabled={loading}
                >
                    {t("sync.refresh")}
                </button>
                <button
                    className="btn text-sm py-1.5 px-3 bg-sky-700 text-white hover:bg-sky-800"
                    onClick={close}
                >
                    {t("close").toLocaleUpperCase()}
                </button>
            </div>
        </div>
    </>
}
