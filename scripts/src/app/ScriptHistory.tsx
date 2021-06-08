import React, { useEffect, useState } from "react"

import * as collaboration from './collaboration'
import { ScriptEntity } from "common"
import * as compiler from './compiler'
import * as ESUtils from '../esutils'
import reporter from './reporter'
import * as tabs from '../editor/tabState'
import * as scripts from '../browser/scriptsState'
import * as userProject from './userProject'
import { useSelector, useDispatch, Provider } from "react-redux"
import { Diff } from "./Diff"
import store from "../reducers"
import { DAWData } from "./player"
import { DAW, setDAWData } from "../daw/DAW"

function parseActiveUsers(activeUsers: string | string[]) {
    return Array.isArray(activeUsers) ? activeUsers.join(', ') : activeUsers
}

const ScriptHistory = ({ script, allowRevert, close }: { script: ScriptEntity, allowRevert: boolean, close: () => void }) => {
    const dispatch = useDispatch()
    const openTabs = useSelector(tabs.selectOpenTabs)
    const activeTabID = useSelector(tabs.selectActiveTabID)
    const currentTime = Date.now()

    const [history, setHistory] = useState(undefined as ScriptEntity[] | undefined)
    const [compiling, setCompiling] = useState(false)
    const [compiledResult, setCompiledResult] = useState(undefined as DAWData | undefined)
    // The id (not index) of the script that is active in the history.
    const [active, setActive] = useState(1)
    // The version of the script to compare changes against.
    const [original, setOriginal] = useState(undefined as any)
    // The "modified" version of the script of changes to compare.
    const [modified, setModified] = useState(undefined as any)
    const [loadingScript, setLoadingScript] = useState(true)

    useEffect(() => {
        userProject.getScriptHistory(script.shareid).then(result => {
            setHistory(result)
            setActiveVersion(+result[result.length-1].id!)
        })
    }, [])

    // Reverts a script to a previous version from the version history.
    const revertScript = (version: number) => {
        userProject.getScriptVersion(script.shareid, version).then(function(result) {
            const sourceCode = result[0].source_code

            if (script.collaborative) {
                collaboration.reloadScriptText(sourceCode)
                collaboration.saveScript()
            } else {
                // Replace code with reverted version
                userProject.scripts[script.shareid].source_code = sourceCode
                // Force save
                userProject.saveScript(script.name, sourceCode, true, result[0].run_status).then(() => {
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
        })
        reporter.revertScript()
    }

    // Set the version of the active script specified by version.
    const setActiveVersion = async (version: number) => {
        setActive(version)
        setCompiledResult(undefined)
        const prev = version - 1

        setLoadingScript(true)
        const result = await userProject.getScriptVersion(script.shareid, version)
        // TODO: Why is result an array?
        setOriginal(result[0])
        // If there are older scripts, compare them.
        if (prev > 0) {
            const prevResult = await userProject.getScriptVersion(script.shareid, prev)
            setModified(prevResult[0])
        } else {
            setModified(result[0])
        }
        setLoadingScript(false)
        return original
    }

    // Run the script at a version.
    const runVersion = (version: number) => {
        setCompiling(true)
        setActiveVersion(version).then((script: ScriptEntity) => {
            var language = ESUtils.parseLanguage(script.name)
            const p = (language === "python" ? compiler.compilePython : compiler.compileJavascript)(script.source_code, 0)
            return p.then(result => {
                // TODO: Looks like the embedded DAW was at some point intended to be independent.
                // For now, we just update the result in the outer DAW (which the embedded DAW mirrors).
                setDAWData(result)
                setCompiledResult(result)
                setCompiling(false)
                return result
            })
        })
    }

    // Close open instances of the DAW and return to the script view.
    const closeDaw = () => {
        setCompiling(false)
        setCompiledResult(undefined)
    }

    const Version = ({ version }: { version: any }) => {
        return <tr className={active == version.id ? "active" : ""}>
            <td>
                {({
                    1: <i className="icon icon-checkmark4" uib-tooltip="This version ran successfully."></i>,
                    2: <i className="icon icon-bug" uib-tooltip="There was an error in this version."></i>
                } as any)[version.run_status] ?? null}
            </td>
            <td onClick={() => setActiveVersion(version.id)}>
                Version {version.id}
                {version.activeUsers && <span><i className="icon icon-users" style={{ color: "#6dfed4" }}></i></span>}
                <br />
                <span className="text-muted">{ESUtils.formatTimer(currentTime - version.created)}</span>
            </td>
            {allowRevert && <td><a href="#" onClick={() => revertScript(version.id)}><i className="icon icon-rotate-cw2"></i></a></td>}
            <td>{version.run_status === 1
            && (compiledResult === undefined
            ? <button className="btn btn-xs btn-run btn-clear" onClick={() => runVersion(version.id)}><i className="icon icon-arrow-right15"></i></button>
            : <button className="btn btn-xs btn-clear" onClick={closeDaw}><i className="icon icon-cross"></i></button>)}
            </td>
        </tr>
    }

    return <>
        <div className="modal-header">
            <button type="button" className="close" id="script-history-close" onClick={close}>&times;</button>
            <h4 className="modal-title">
                Version history for "{script.name}"
                {!allowRevert && <span>(You can only revert the scripts under MY SCRIPTS)</span>}
            </h4>
        </div>

        {history === undefined
        ? <div className="modal-body">Fetching script history.</div>
        : <div className="modal-body">
            <div className="row column-labels">
                <div className="col-md-4" style={{ margin: 0, padding: 0 }}>
                <div className="column-label">
                    Version History
                </div>
                </div>
                <div className="col-md-8">
                {compiledResult === undefined && <div className="column-label">
                    Diff with Previous Version
                </div>}
                </div>
            </div>

            <div className="row">
                <div className="col-md-4 scroll-50">
                <table className="table table-condensed">
                    <tbody>
                        {history!.sort((a, b) => +b.id! - +a.id!).map(version => <Version key={version.id} version={version} />)}
                    </tbody>
                </table>
                </div>
                {compiledResult
                ? <div className="col-md-8 scroll-50 relative"><DAW /></div>
                : (compiling
                    ? <div className="col-md-8 scroll-50">
                        <i className="animate-spin inline-block icon icon-spinner"></i> Running script version...
                    </div>
                    : <div>
                        {loadingScript
                        ? <div className="col-md-8 scroll-50">
                        <i className="animate-spin inline-block icon icon-spinner"></i> Fetching script version...
                        </div>
                        : <div className="col-md-8 scroll-50">
                            <pre><Diff original={original?.source_code ?? ""} modified={modified?.source_code ?? ""} /></pre>
                            {original?.activeUsers && <div>Active Collaborators: {parseActiveUsers(original.activeUsers)}
                        </div>}
                    </div>}
                </div>)}
            </div>
        </div>}
    </>
}

const Wrapper = (props: any) => <Provider store={store}><ScriptHistory {...props} /></Provider>
export { Wrapper as ScriptHistory }