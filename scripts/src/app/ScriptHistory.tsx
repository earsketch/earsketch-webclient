import React, { useEffect, useState } from "react"

import * as collaboration from "./collaboration"
import { ScriptEntity } from "common"
import * as compiler from "./compiler"
import * as ESUtils from "../esutils"
import reporter from "./reporter"
import * as tabs from "../editor/tabState"
import * as scripts from "../browser/scriptsState"
import * as userProject from "./userProject"
import { useSelector, useDispatch, Provider } from "react-redux"
import { Diff } from "./Diff"
import store from "../reducers"
import { DAWData } from "./player"
import { DAW, setDAWData } from "../daw/DAW"

function parseActiveUsers(activeUsers: string | string[]) {
    return Array.isArray(activeUsers) ? activeUsers.join(", ") : activeUsers
}

const Version = ({ version, now, allowRevert, compiled, active, activate, run, revert, closeDAW }:
    { version: any, now: number, allowRevert: boolean, compiled: boolean, active: boolean, run: any, activate: any, revert: any, closeDAW: any }) => {
    return <tr className={active ? "active" : ""}>
        <td>
            {({
                1: <i className="icon icon-checkmark4" title="This version ran successfully."></i>,
                2: <i className="icon icon-bug" title="There was an error in this version."></i>,
            } as any)[version.run_status] ?? null}
        </td>
        <td onClick={activate}>
            Version {version.id}
            {version.activeUsers && <span><i className="icon-users" style={{ color: "#6dfed4" }}></i></span>}
            <br />
            <span className="text-muted">{ESUtils.formatTimer(now - version.created)}</span>
        </td>
        {allowRevert && <td><a href="#" onClick={revert} title="Restore version">
            <i className="icon-rotate-cw2 inline-block" style={{ transform: "scaleX(-1)" }}></i>
        </a></td>}
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

const ScriptHistory = ({ script, allowRevert, close }: { script: ScriptEntity, allowRevert: boolean, close: () => void }) => {
    const dispatch = useDispatch()
    const openTabs = useSelector(tabs.selectOpenTabs)
    const activeTabID = useSelector(tabs.selectActiveTabID)
    // This is ordered from the newest version at index 0 to the oldest version at `history.length-1`.
    const [history, setHistory] = useState([] as ScriptEntity[])
    // These are used for the embedded DAW.
    const [compiling, setCompiling] = useState(false)
    const [compiledResult, setCompiledResult] = useState(null as DAWData | null)
    // The index (not ID) of the script that is active in the history.
    const [active, setActive] = useState(1)
    // Chronologically adjacent versions of the script for the diff.
    const original = history?.[active + 1]
    const modified = history?.[active]
    const now = Date.now()

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
            userProject.scripts[script.shareid].source_code = version.source_code
            userProject.saveScript(script.name, version.source_code, true, version.run_status).then(() => {
                // TODO: this really isn't ideal
                // close the script and then reload to reflect latest changes
                dispatch(scripts.syncToNgUserProject())

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
                Version history for "{script.name}"
                {!allowRevert && <span>(You can only revert the scripts under MY SCRIPTS)</span>}
            </h4>
        </div>

        {history.length === 0
        ? <div className="modal-body">Fetching script history.</div>
        : <div className="modal-body">
            <div className="row column-labels">
                <div className="col-md-4" style={{ margin: 0, padding: 0 }}>
                    <div className="column-label">Version History</div>
                </div>
                <div className="col-md-8">
                    {compiledResult === null && <div className="column-label">Diff with Previous Version</div>}
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
                    <i className="animate-spin inline-block icon icon-spinner"></i> Running script version...
                </div>
                : <div className="col-md-8 scroll-50">
                    <pre><Diff original={original?.source_code ?? ""} modified={modified?.source_code ?? ""} /></pre>
                    {original?.activeUsers && <div>Active Collaborators: {parseActiveUsers(original.activeUsers)}</div>}
                </div>)}
            </div>
        </div>}
    </>
}

const Wrapper = (props: any) => <Provider store={store}><ScriptHistory {...props} /></Provider>
export { Wrapper as ScriptHistory }
