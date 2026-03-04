import { useState } from "react"
import { useTranslation } from "react-i18next"
import * as backup from "./backup"
import type { ParsedBackup } from "./backup"
import * as userNotification from "../user/notification"
import { ModalHeader, ModalBody, Alert } from "../Utils"

interface Props {
    parsed: ParsedBackup
    close: () => void
}

export const ImportModal = ({ parsed, close }: Props) => {
    const { t } = useTranslation()
    const [error, setError] = useState("")
    const [importing, setImporting] = useState(false)

    const scriptNames = parsed.scripts.map(s => s.manifest.name)
    const [conflicts, setConflicts] = useState<{ [name: string]: "rename" | "skip" }>(
        () => Object.fromEntries(scriptNames.map(name => [name, "rename"]))
    )

    const doImport = async () => {
        setImporting(true)
        try {
            const { scriptCount, soundCount } = await backup.importBackup(parsed, {
                onConflict: name => conflicts[name] ?? "rename",
            })
            userNotification.show(t("backup.importSuccess", { scriptCount, soundCount }), "success")
            close()
        } catch (err: any) {
            setError(err.message ?? String(err))
        } finally {
            setImporting(false)
        }
    }

    return <>
        <ModalHeader>{t("backup.importTitle")}</ModalHeader>
        <ModalBody>
            <Alert message={error} />
            <p className="mb-3">{t("backup.importBody", { scriptCount: parsed.scripts.length, soundCount: parsed.sounds.length })}</p>
            {Object.keys(conflicts).length > 0 && (
                <div className="mt-3">
                    <p className="mb-2 font-medium">{t("backup.importConflict", { count: parsed.scripts.length })}</p>
                    <table className="w-full text-sm border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="px-2 py-1 text-left">{t("name")}</th>
                                <th className="px-2 py-1 text-left">{t("action")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(conflicts).map(([name, action]) => (
                                <tr key={name} className="border-t border-gray-200">
                                    <td className="px-2 py-1 font-mono truncate max-w-xs">{name}</td>
                                    <td className="px-2 py-1">
                                        <label className="mr-4">
                                            <input type="radio" name={`conflict-${name}`} value="rename"
                                                checked={action === "rename"}
                                                onChange={() => setConflicts(c => ({ ...c, [name]: "rename" }))}
                                                className="mr-1" />
                                            {t("backup.importConflictRename")}
                                        </label>
                                        <label>
                                            <input type="radio" name={`conflict-${name}`} value="skip"
                                                checked={action === "skip"}
                                                onChange={() => setConflicts(c => ({ ...c, [name]: "skip" }))}
                                                className="mr-1" />
                                            {t("backup.importConflictSkip")}
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </ModalBody>
        <div className="flex items-center justify-end border-t p-3.5">
            <button className="btn text-sm py-1.5 px-3 bg-white text-black hover:text-black hover:bg-gray-200"
                onClick={close}>
                {t("cancel").toLocaleUpperCase()}
            </button>
            <button
                className="btn text-sm py-1.5 px-3 ml-2 bg-sky-700 text-white hover:text-white hover:bg-sky-800 disabled:opacity-75"
                onClick={doImport}
                disabled={importing}
            >
                {t("backup.importTitle").toLocaleUpperCase()}
            </button>
        </div>
    </>
}
