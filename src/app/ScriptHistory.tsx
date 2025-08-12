import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSelector, useDispatch } from "react-redux"

import { DAWData, Script } from "common"
import * as runner from "./runner"
import * as ESUtils from "../esutils"
import reporter from "./reporter"
import * as tabs from "../ide/tabState"
import * as scripts from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import { Diff } from "./Diff"
import { DAW, setDAWData } from "../daw/DAW"
import type { AppDispatch } from "../reducers"
import { ModalBody, ModalHeader } from "../Utils"
import { setContents } from "../ide/Editor"

const Version = ({ version, allowRevert, compiled, active, activate, run, revert, closeDAW }: {
    version: any, allowRevert: boolean, compiled: boolean, active: boolean, run: any, activate: any, revert: any, closeDAW: any
}) => {
    const { t } = useTranslation()
    return <tr className={`border-t border-gray-200 ${active ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
        <td className="pl-2.5">
            {({
                1: <i className="icon icon-checkmark4" title={t("scriptHistory.versionSuccess")}></i>,
                2: <i className="icon icon-bug" title={t("scriptHistory.versionError")}></i>,
            } as any)[version.run_status] ?? null}
        </td>
        <td className="pl-2.5 py-1.5 text-sm" onClick={activate}>
            {`${t("version")} ${version.id}`}
            {version.activeUsers && <span><i className="icon-users" style={{ color: "#6dfed4" }}></i></span>}
            <div className="mt-1 text-gray-500">{ESUtils.humanReadableTimeAgo(version.created)}</div>
        </td>
        {allowRevert && <td className="pl-2.5"><button onClick={revert} title={t("scriptHistory.restore")}>
            <i className="icon-rotate-cw2 inline-block text-blue-500" style={{ transform: "scaleX(-1)" }}></i>
        </button></td>}
        <td className="px-2.5">{version.run_status === 1 &&
            (compiled
                ? <button className="btn btn-xs btn-clear" onClick={closeDAW}>
                    <i className="icon icon-cross"></i>
                </button>
                : <button className="btn btn-xs btn-run btn-clear" onClick={run}>
                    <i className="icon icon-arrow-right15"></i>
                </button>)}
        </td>
    </tr>
}

export const ScriptHistory = ({ script, allowRevert, close }: { script: Script, allowRevert: boolean, close: () => void }) => {
    const dispatch = useDispatch<AppDispatch>()
    const openTabs = useSelector(tabs.selectOpenTabs)
    // This is ordered from the newest version at index 0 to the oldest version at `history.length-1`.
    const [history, setHistory] = useState(null as Script[] | null)
    // These are used for the embedded DAW.
    const [compiling, setCompiling] = useState(false)
    const [compiledResult, setCompiledResult] = useState(null as DAWData | null)
    // The index (not ID) of the script that is active in the history.
    const [active, setActive] = useState(0)
    // Chronologically adjacent versions of the script for the diff.
    const original = history?.[active + 1]
    const modified = history?.[active]
    const { t } = useTranslation()

    useEffect(() => {
        scriptsThunks.getScriptHistory(script.shareid).then(result => {
            setHistory(result.sort((a, b) => +b.id! - +a.id!))
            setActive(0)
        })
    }, [])

    // Reverts a script to a previous version from the version history.
    const revertScript = (index: number) => {
        const version = history![index]

        // Replace code with reverted version and save.
        dispatch(scripts.setScriptSource({ id: script.shareid, source: version.source_code }))
        dispatch(scriptsThunks.saveScript({
            name: script.name,
            source: version.source_code,
            status: version.run_status,
        })).unwrap().then(() => {
            if (openTabs.includes(script.shareid)) {
                setContents(version.source_code, script.shareid)
            }
        })
        close()
        reporter.revertScript()
    }

    // Run the script at a version.
    const runVersion = async (index: number) => {
        setCompiling(true)
        setCompiledResult(null)
        setActive(index)
        const result = await runner.run(ESUtils.parseLanguage(script.name), history![index].source_code)
        // TODO: Looks like the embedded DAW was at some point intended to be independent.
        // For now, we just update the result in the outer DAW (which the embedded DAW mirrors).
        setDAWData(result)
        setCompiledResult(result)
        setCompiling(false)
        return result
    }

    return <>
        <ModalHeader>
            {t("scriptHistory.title", { scriptName: `"${script.name}"` })}
            {!allowRevert && <span>({t("scriptHistory.onlyMyScripts")})</span>}
        </ModalHeader>
        <ModalBody>
            {history === null
                ? <div><i className="animate-spin es-spinner mr-3"></i>{t("scriptHistory.fetching")}</div>
                : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div>{t("scriptHistory.heading")}</div>
                        <div className="scroll-50">
                            <table className="w-full">
                                <tbody>
                                    {history.map((version, index) =>
                                        <Version
                                            key={version.id} version={version} active={active === index}
                                            allowRevert={allowRevert} compiled={compiledResult !== null}
                                            activate={() => {
                                                setActive(index)
                                                setCompiledResult(null)
                                            }}
                                            run={() => runVersion(index)}
                                            revert={() => revertScript(index)}
                                            closeDAW={() => {
                                                setCompiling(false)
                                                setCompiledResult(null)
                                            }}
                                        />)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className={`col-span-2 scroll-50 ${compiledResult ? "relative" : ""}`}>
                        {history.length > 0 && (compiledResult
                            ? <DAW />
                            : (compiling
                                ? <><i className="animate-spin es-spinner mr-3"></i>{t("scriptHistory.running")}</>
                                : <>
                                    <div>{t("scriptHistory.diff")}</div>
                                    <pre className="p-3 bg-gray-100 rounded border">
                                        <Diff original={original?.source_code ?? ""} modified={modified?.source_code ?? ""} />
                                    </pre>
                                </>
                            )
                        )}
                    </div>
                </div>}
        </ModalBody>
    </>
}
