import React, { useEffect, useState } from "react"

import * as collaboration from "./collaboration"
import { Script } from "common"
import * as compiler from "./compiler"
import * as ESUtils from "../esutils"
import reporter from "./reporter"
import * as tabs from "../ide/tabState"
import * as scripts from "../browser/scriptsState"
import * as userProject from "./userProject"
import { useSelector, useDispatch } from "react-redux"
import { Diff } from "./Diff"
import { DAWData } from "./player"
import { DAW, setDAWData } from "../daw/DAW"
import { useTranslation } from "react-i18next"

function parseActiveUsers(activeUsers: string | string[]) {
    return Array.isArray(activeUsers) ? activeUsers.join(", ") : activeUsers
}

const Version = ({ version, now, allowRevert, compiled, active, activate, run, revert, closeDAW }:
    { version: any, now: number, allowRevert: boolean, compiled: boolean, active: boolean, run: any, activate: any, revert: any, closeDAW: any }) => {
    const { t } = useTranslation()
    return <tr className={active ? "active" : ""}>
        <td>
            {({
                1: <i className="icon icon-checkmark4" title={t('scriptHistory.versionSuccess')}></i>,
                2: <i className="icon icon-bug" title={t('scriptHistory.versionError')}></i>,
            } as any)[version.run_status] ?? null}
        </td>
        <td onClick={activate}>
            Version {version.id}
            {version.activeUsers && <span><i className="icon-users" style={{ color: "#6dfed4" }}></i></span>}
            <br />
            <span className="text-muted">{ESUtils.formatTime(now - version.created)}</span>
        </td>
        {allowRevert && <td><button onClick={revert} title={t('scriptHistory.restore')}>
            <i className="icon-rotate-cw2 inline-block text-blue-500" style={{ transform: "scaleX(-1)" }}></i>
        </button></td>}
        <td>{version.run_status === 1
            && (compiled
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
    const dispatch = useDispatch()
    const openTabs = useSelector(tabs.selectOpenTabs)
    const activeTabID = useSelector(tabs.selectActiveTabID)
    // This is ordered from the newest version at index 0 to the oldest version at `history.length-1`.
    const [history, setHistory] = useState([] as Script[])
    // These are used for the embedded DAW.
    const [compiling, setCompiling] = useState(false)
    const [compiledResult, setCompiledResult] = useState(null as DAWData | null)
    // The index (not ID) of the script that is active in the history.
    const [active, setActive] = useState(1)
    // Chronologically adjacent versions of the script for the diff.
    const original = history?.[active + 1]
    const modified = history?.[active]
    const now = Date.now()
    const { t } = useTranslation()

    useEffect(() => {
        userProject.getScriptHistory(script.shareid).then(result => {
            setHistory(result.sort((a, b) => +b.id! - +a.id!))
            setActive(0)
        })
    }, [])

    // Reverts a script to a previous version from the version history.
    const revertScript = (index: number) => {
        const version = history[index]

        if (script.collaborative) {
            collaboration.reloadScriptText(version.source_code)
            collaboration.saveScript()
        } else {
            // Replace code with reverted version and save.
            dispatch(scripts.setScriptSource({ id: script.shareid, source: version.source_code }))
            userProject.saveScript(script.name, version.source_code, true, version.run_status).then(() => {
                // TODO: this really isn't ideal
                // close the script and then reload to reflect latest changes
                if (openTabs.includes(script.shareid)) {
                    tabs.deleteEditorSession(script.shareid)
                    if (script.shareid === activeTabID) {
                        dispatch(tabs.setActiveTabAndEditor(script.shareid))
                    }
                }
            })
        }
        close()
        reporter.revertScript()
    }

    // Run the script at a version.
    const runVersion = async (index: number) => {
        setCompiling(true)
        setCompiledResult(null)
        setActive(index)
        const language = ESUtils.parseLanguage(script.name)
        const result = await (language === "python" ? compiler.compilePython : compiler.compileJavascript)(history[index].source_code, 0)
        // TODO: Looks like the embedded DAW was at some point intended to be independent.
        // For now, we just update the result in the outer DAW (which the embedded DAW mirrors).
        setDAWData(result)
        setCompiledResult(result)
        setCompiling(false)
        return result
    }

    return <>
        <div className="modal-header">
            <button type="button" className="close" id="script-history-close" onClick={close}>&times;</button>
            <h4 className="modal-title">
                {t('scriptHistory.title', { scriptName: `"${script.name}"` })}
                {!allowRevert && <span>({t('scriptHistory.onlyMyScripts')})</span>}
            </h4>
        </div>

        {history.length === 0
        ? <div className="modal-body">{t('scriptHistory.fetching')}</div>
        : <div className="modal-body">
            <div className="row column-labels">
                <div className="col-md-4" style={{ margin: 0, padding: 0 }}>
                    <div className="column-label">{t('scriptHistory.heading')}</div>
                </div>
                <div className="col-md-8">
                    {compiledResult === null && <div className="column-label">{t('scriptHistory.diff')}</div>}
                </div>
            </div>

            <div className="row">
                <div className="col-md-4 scroll-50">
                    <table className="table table-condensed">
                        <tbody>
                            {history.map((version, index) =>
                            <Version
                                key={version.id} version={version} now={now} active={active == index}
                                allowRevert={allowRevert} compiled={compiledResult !== null}
                                activate={() => { setActive(index); setCompiledResult(null) }}
                                run={() => runVersion(index)}
                                revert={() => revertScript(index)}
                                closeDAW={() => { setCompiling(false); setCompiledResult(null) }}
                            />)}
                        </tbody>
                    </table>
                </div>
                {compiledResult
                ? <div className="col-md-8 scroll-50 relative"><DAW /></div>
                : (compiling
                ? <div className="col-md-8 scroll-50">
                    <i className="animate-spin inline-block icon icon-spinner"></i> {t('scriptHistory.running')}
                </div>
                : <div className="col-md-8 scroll-50">
                    <pre><Diff original={original?.source_code ?? ""} modified={modified?.source_code ?? ""} /></pre>
                    {original?.activeUsers && <div>{t('scriptHistory.activeCollab')}: {parseActiveUsers(original.activeUsers)}</div>}
                </div>)}
            </div>
        </div>}
    </>
}
