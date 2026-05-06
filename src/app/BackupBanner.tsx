import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useAppSelector as useSelector } from "../hooks"
import * as user from "../user/userState"
import * as scriptsState from "../browser/scriptsState"
import * as ESUtils from "../esutils"
import * as backup from "./backup"
import { loadAndOpenImport } from "./ImportModal"
import { SyncButton } from "../sync/SyncUI"
import { selectSyncStatus } from "../sync/syncState"

export const BackupBanner = () => {
    const { t } = useTranslation()
    const loggedIn = useSelector(user.selectLoggedIn)
    const activeScripts = useSelector(scriptsState.selectActiveScripts)
    const hasScripts = Object.keys(activeScripts).length > 0
    const syncStatus = useSelector(selectSyncStatus)
    const [lastExport, setLastExport] = useState(() => backup.getLastExportTime())

    if (loggedIn) return null

    const syncConnected = syncStatus === "connected"
    const showBackupControls = hasScripts && !syncConnected

    const handleExport = async () => {
        await backup.exportBackup()
        setLastExport(backup.getLastExportTime())
    }

    const lastBackupText = lastExport
        ? ESUtils.humanReadableTimeAgo(lastExport)
        : t("backup.lastBackupNever")

    return (
        <div className="flex items-center gap-1.5 whitespace-nowrap mx-2 shrink-0">
            <SyncButton />
            {showBackupControls && <>
                <span className="hidden lg:inline text-xs text-gray-400" title={t("backup.savedToBrowser")}>
                    {lastBackupText}
                </span>
                <button
                    className="py-0.5 px-2 text-xs bg-amber-500 text-black hover:bg-amber-400 rounded"
                    onClick={handleExport}
                    title={t("backup.savedToBrowser") + " · " + lastBackupText}
                >
                    {t("backup.saveButton")}
                </button>
                <label
                    className="py-0.5 px-2 text-xs bg-white text-black hover:bg-gray-200 rounded cursor-pointer"
                    title={t("backup.loadBackup")}
                >
                    {t("backup.loadBackup")}
                    <input
                        type="file"
                        accept=".earsketch"
                        className="hidden"
                        onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) {
                                loadAndOpenImport(file)
                                e.target.value = ""
                            }
                        }}
                    />
                </label>
            </>}
        </div>
    )
}
