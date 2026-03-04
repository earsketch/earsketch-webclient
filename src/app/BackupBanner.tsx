import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppSelector as useSelector } from "../hooks"
import * as user from "../user/userState"
import * as scriptsState from "../browser/scriptsState"
import * as backup from "./backup"
import { openModal } from "./modal"
import { ImportModal } from "./ImportModal"
import * as userNotification from "../user/notification"

function timeAgo(timestamp: number): string {
    const diffMs = Date.now() - timestamp
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "today"
    if (diffDays === 1) return "1 day ago"
    return `${diffDays} days ago`
}

export const BackupBanner = () => {
    const { t } = useTranslation()
    const loggedIn = useSelector(user.selectLoggedIn)
    const activeScripts = useSelector(scriptsState.selectActiveScripts)
    const hasScripts = Object.keys(activeScripts).length > 0
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [lastExport, setLastExport] = useState(() => backup.getLastExportTime())

    if (loggedIn || !hasScripts) return null

    const handleExport = async () => {
        await backup.exportBackup()
        setLastExport(backup.getLastExportTime())
    }

    const handleImportFile = async (file: File) => {
        try {
            const parsed = await backup.parseBackup(file)
            await openModal(ImportModal, { parsed })
        } catch (err: any) {
            userNotification.show(err.message ?? "Failed to load backup", "failure1")
        }
    }

    const lastBackupText = lastExport
        ? t("backup.lastBackup", { timeAgo: timeAgo(lastExport) })
        : t("backup.lastBackupNever")

    return (
        <div className="flex items-center gap-2 text-xs text-gray-300 mr-2">
            <span className="hidden sm:inline">{t("backup.savedToBrowser")} · {lastBackupText}</span>
            <button
                className="whitespace-nowrap py-0.5 px-2 text-xs bg-amber-500 text-black hover:bg-amber-400 rounded"
                onClick={handleExport}
                title={t("backup.saveButton")}
            >
                {t("backup.saveButton")}
            </button>
            <label
                className="whitespace-nowrap py-0.5 px-2 text-xs bg-white text-black hover:bg-gray-200 rounded cursor-pointer"
                title={t("backup.loadBackup")}
            >
                {t("backup.loadBackup")}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".earsketch"
                    className="hidden"
                    onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                            handleImportFile(file)
                            e.target.value = ""
                        }
                    }}
                />
            </label>
        </div>
    )
}
