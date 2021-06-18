import React, { useEffect, useState } from "react"
import { Provider, useSelector } from "react-redux"

import * as appState from "../app/appState"
import { Browser } from "../browser/Browser"
import * as bubble from "../bubble/bubbleState"
import { CAI } from "../cai/CAI"
import * as collaboration from "./collaboration"
import * as compiler from "./compiler"
import { Curriculum } from "../browser/Curriculum"
import { DAW } from "../daw/DAW"
import { Editor } from "../editor/Editor"
import { EditorHeader } from "../editor/EditorHeader"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { setReady, dismissBubble } from "../bubble/bubbleState"
import * as scripts from "../browser/scriptsState"
import * as editor from "../editor/Editor"
import * as editorState from "../editor/editorState"
import * as Layout from "../layout/Layout"
import reporter from "./reporter"
import * as tabs from "../editor/tabState"
import * as cai from "../cai/caiState"
import * as helpers from "../helpers"
import store from "../reducers"
import { Tabs } from "../editor/Tabs"
import * as userConsole from "./userconsole"
import * as userNotification from "./userNotification"
import * as userProject from "./userProject"
import * as WaveformCache from "./waveformcache"
import i18n from "i18next"
import { ScriptEntity } from "common"
import { hot } from "react-hot-loader/root"

// Flag to prevent successive compilation / script save request
let isWaitingForServerResponse = false

// Prompts the user for a name and language, then calls the userProject
// service to create the script from an empty template. The tab will be
// automatically opened and switched to.
export async function createScript() {
    const { bubble } = store.getState()
    if (bubble.active && bubble.currentPage === 9) {
        store.dispatch(dismissBubble())
    }

    reporter.createScript()
    const filename = await helpers.getNgService("$uibModal").open({ component: "createScriptController" }).result
    if (filename) {
        userProject.closeScript(filename)
        const script = await userProject.createScript(filename)
        script && store.dispatch(scripts.syncToNgUserProject())
        store.dispatch(tabs.setActiveTabAndEditor(script.shareid))
    }
}

function saveActiveScriptWithRunStatus(status: number) {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    let script = null

    if (activeTabID in userProject.scripts) {
        script = userProject.scripts[activeTabID]
    } else if (activeTabID in userProject.sharedScripts) {
        script = userProject.sharedScripts[activeTabID]
    }
    if (script?.collaborative) {
        script && collaboration.saveScript(script.shareid)
        isWaitingForServerResponse = false
    } else if (script && !script.readonly && !script.isShared && !script.saved) {
        // save the script on a successful run
        userProject.saveScript(script.name, script.source_code, true, status).then(() => {
            store.dispatch(scripts.syncToNgUserProject())
            isWaitingForServerResponse = false
        }).catch(() => {
            userNotification.show(i18n.t("messages:idecontroller.savefailed"), "failure1")
            isWaitingForServerResponse = false
        })
    } else {
        isWaitingForServerResponse = false
    }
}

function switchToShareMode() {
    editor.ace.focus()
    store.dispatch(scripts.setFeatureSharedScript(true))
}

let setLoading: (loading: boolean) => void


// TODO AVN - quick hack, but it might also be the cleanest way to fix the shared script issue rather than moving openShare() to tabController
const initialSharedScripts = Object.assign({}, userProject.sharedScripts)

// Gets the ace editor of droplet instance, and calls openShare().
// TODO: Move to Editor?
export function initEditor() {
    esconsole("initEditor called", "IDE")

    editor.ace.commands.addCommand({
        name: "saveScript",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S",
        },
        exec() {
            const activeTabID = tabs.selectActiveTabID(store.getState())!

            let script = null
            if (activeTabID in userProject.scripts) {
                script = userProject.scripts[activeTabID]
            } else if (activeTabID in userProject.sharedScripts) {
                script = userProject.sharedScripts[activeTabID]
            }

            if (!script?.saved) {
                store.dispatch(tabs.saveScriptIfModified(activeTabID))
            } else if (script?.collaborative) {
                collaboration.saveScript()
            }
            activeTabID && store.dispatch(tabs.removeModifiedScript(activeTabID))
        }
    })

    editor.ace.commands.addCommand({
        name: "runCode",
        bindKey: {
            win: "Ctrl-Enter",
            mac: "Command-Enter",
        },
        exec() {
            compileCode()
        }
    })

    editor.droplet.setEditorState(false)

    // open shared script from URL
    const shareID = ESUtils.getURLParameter("sharing")
    if (shareID) {
        openShare(shareID).then(() => {
            store.dispatch(scripts.syncToNgUserProject())
            store.dispatch(tabs.setActiveTabAndEditor(shareID))
        })
    }

    store.dispatch(editorState.setEditorInstance(editor))
    const activeTabID = tabs.selectActiveTabID(store.getState())
    activeTabID && store.dispatch(tabs.setActiveTabAndEditor(activeTabID))

    const activeScript = tabs.selectActiveTabScript(store.getState())
    editor.setReadOnly(store.getState().app.embedMode || activeScript?.readonly)
}

export async function openShare(shareid: string) {
    const isEmbedded = store.getState().app.embedMode

    if (userProject.isLoggedIn()) {
        // User is logged in
        const results = await userProject.getSharedScripts()
        // Check if the shared script has been saved
        let result = results.find(script => script.shareid === shareid)

        if (result) {
            // user has already opened this shared link before
            if (userProject.isLoggedIn()) {
                await userProject.getSharedScripts()
                if (isEmbedded) helpers.getNgRootScope().$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid})
                userProject.openSharedScript(result.shareid)
            }
            switchToShareMode()
        } else {
            // Close the script if it was opened when the user was not logged in
            if (initialSharedScripts[shareid]) {
                userProject.closeSharedScript(shareid)
            }

            // user has not opened this shared link before
            result = await userProject.loadScript(shareid, true) as ScriptEntity
            if (isEmbedded) {
                helpers.getNgRootScope().$broadcast("embeddedScriptLoaded", {scriptName: result.name, username: result.username, shareid: result.shareid})
            }

            if (result.username !== userProject.getUsername()) {
                // the shared script doesn't belong to the logged-in user
                switchToShareMode()

                await userProject.saveSharedScript(shareid, result.name, result.source_code, result.username)
                await userProject.getSharedScripts()
                userProject.openSharedScript(result.shareid)
            } else {
                // the shared script belongs to the logged-in user
                // TODO: use broadcast or service
                editor.ace.focus()

                if (isEmbedded) {
                    // DON'T open the script if it has been soft-deleted
                    if (!result.soft_delete) {
                        userProject.openScript(result.shareid)
                    }

                    // TODO: There might be async ops that are not finished. Could manifest as a redux-userProject sync issue with user accounts with a large number of scripts (not too critical).
                    store.dispatch(scripts.syncToNgUserProject())
                    store.dispatch(tabs.setActiveTabAndEditor(shareid))
                } else {
                    userNotification.show("This shared script link points to your own script.")
                }

                // Manually removing the user-owned shared script from the browser.
                // TODO: Better to have refreshShareBrowser or something.
                delete userProject.sharedScripts[shareid]
            }
        }
    } else {
        // User is not logged in
        const result = await userProject.loadScript(shareid, true)
        if (isEmbedded) helpers.getNgRootScope().$broadcast("embeddedScriptLoaded", { scriptName: result.name, username: result.username, shareid: result.shareid })
        await userProject.saveSharedScript(shareid, result.name, result.source_code, result.username)
        userProject.openSharedScript(result.shareid)
        switchToShareMode()
    }
}

// For curriculum pages.
(window as any).doCopy = (that: HTMLElement) => {
    const key = (that.nextSibling as HTMLElement).textContent!
    let result = /script_name: (.*)/.exec(key)
    let scriptName
    if (result && result[1]) {
        scriptName = result[1].replace(/[^\w_]/g, "")
    } else {
        scriptName = "curriculum"
    }

    esconsole("paste key" + key, "debug")
    const ideTargetLanguage = store.getState().app.scriptLanguage
    const ext = ideTargetLanguage === "python" ? ".py" : ".js"

    // Create a fake script object to load into a tab.
    const fakeScript = {
        name: scriptName + ext,
        source_code: key,
        shareid: ESUtils.randomString(22),
        readonly: true,
    }

    store.dispatch(scripts.addReadOnlyScript(fakeScript))
    editor.ace.focus()
    store.dispatch(tabs.setActiveTabAndEditor(fakeScript.shareid))
}

// Compile code in the editor and broadcast the result to all scopes.
export function compileCode() {
    if (isWaitingForServerResponse) return

    isWaitingForServerResponse = true

    // TODO: only should clear when compiling another script?
    WaveformCache.clear()

    setLoading(true)

    const code = editor.getValue()

    const startTime = Date.now()
    const language = store.getState().app.scriptLanguage
    const promise = (language === "python" ? compiler.compilePython : compiler.compileJavascript)(editor.getValue(), 0)

    editor.clearErrors()
    userConsole.clear()
    userConsole.status("Running script...")

    const scriptID = tabs.selectActiveTabID(store.getState())
    store.dispatch(tabs.removeModifiedScript(scriptID))

    promise.then(result => {
        const duration = Date.now() - startTime
        setLoading(false)
        helpers.getNgRootScope().$broadcast("compiled", result)
        reporter.compile(language, true, undefined, duration)
        userNotification.showBanner(i18n.t("messages:interpreter.runSuccess"), "success")
        saveActiveScriptWithRunStatus(userProject.STATUS_SUCCESSFUL)

        // Small hack -- if a pitchshift is present, it may print the success message after the compilation success message.
        setTimeout(() => userConsole.status("Script ran successfully."), 200)

        // asyncronously report the script complexity
        if (FLAGS.SHOW_AUTOGRADER) {
            setTimeout(() => {
                // reporter.complexity(language, code)
                let report
                try {
                    report = helpers.getNgService("caiAnalysisModule").analyzeCodeAndMusic(language, code, result)
                } catch (e) {
                    // TODO: Make this work across browsers. (See esconsole for reference.)
                    const traceDepth = 5
                    let stackString = e.stack.split(" at")[0] + " at " + e.stack.split(" at")[1]
                    let startIndex = stackString.indexOf("reader.js")
                    stackString = stackString.substring(startIndex)
                    stackString = stackString.substring(0, stackString.indexOf(")"))

                    for (let i = 0; i < traceDepth; i++) {
                        let addItem = e.stack.split(" at")[2 + i]
                        startIndex = addItem.lastIndexOf("/")
                        addItem = addItem.substring(startIndex + 1)
                        addItem = addItem.substring(0, addItem.indexOf(")"))
                        addItem = "|" + addItem
                        stackString += addItem
                    }

                    reporter.readererror(e.toString() + ". Location: " + stackString)
                }
                
                console.log("complexityCalculator", report)
                if (FLAGS.SHOW_CAI) {
                    store.dispatch(cai.compileCAI([result, language, code]))
                }
            })
        }

        if (collaboration.active && collaboration.tutoring) {
            collaboration.sendCompilationRecord("success")
        }

        const { bubble } = store.getState()
        if (bubble.active && bubble.currentPage===2 && !bubble.readyToProceed) {
            store.dispatch(setReady(true))
        }
    }).catch(err => {
        const duration = Date.now() - startTime
        esconsole(err, ["ERROR", "IDE"])
        setLoading(false)
        userConsole.error(err)
        editor.highlightError(err)

        const errType = String(err).split(":")[0]
        reporter.compile(language, false, errType, duration)

        userNotification.showBanner(i18n.t("messages:interpreter.runFailed"), "failure1")

        saveActiveScriptWithRunStatus(userProject.STATUS_UNSUCCESSFUL)

        if (collaboration.active && collaboration.tutoring) {
            collaboration.sendCompilationRecord(errType)
        }
    })
}

const IDE = () => {
    const language = useSelector(appState.selectScriptLanguage)
    const numTabs = useSelector(tabs.selectOpenTabs).length

    const embedMode = useSelector(appState.selectEmbedMode)
    const embeddedScriptName = useSelector(appState.selectEmbeddedScriptName)
    const embeddedScriptUsername = useSelector(appState.selectEmbeddedScriptUsername)
    const hideEditor = useSelector(appState.selectHideEditor)

    const bubbleActive = useSelector(bubble.selectActive)
    const bubblePage = useSelector(bubble.selectCurrentPage)

    const [loading, _setLoading] = useState(false)
    setLoading = _setLoading

    useEffect(() => Layout.initialize(), [])

    return <div id="main-container" style={embedMode ? { top: "0", left: "0" } : {}}>
        <div className="h-full">
            <div id="layout-container" className="split flex flex-row h-full">
                <div id="sidebar-container" style={{ zIndex: bubbleActive && [5,6,7,9].includes(bubblePage) ? 35 : 0 }}>
                    <div className="overflow-hidden" id="sidebar"> {/* re:overflow, split.js width calculation can cause the width to spill over the parent width */}
                        <Browser />
                    </div>
                </div>

                <div className="split flex flex-col" id="content">
                    <div id="devctrl">
                        <div className="h-full max-h-full" id="workspace">
                            {loading
                            ? <div className="loading text-center h-full w-full flex items-center justify-center">
                                <i className="spinner icon icon-spinner inline-block animate-spin mr-3"></i> Loading...
                            </div>
                            : <div className="workstation h-full w-full"><DAW /></div>}
                        </div>
                    </div>

                    {!hideEditor && <div className="flex flex-col" id="coder" style={{ zIndex: bubbleActive && [1,2,9].includes(bubblePage) ? 35 : 0 }}>
                        <EditorHeader />

                        <div className="flex-grow h-full overflow-y-hidden">
                            <div className={"h-full flex flex-col" + (numTabs === 0 ? " hidden" : "")}>
                                <Tabs />
                                {embedMode && <div className="embedded-script-info h-auto" >
                                    <p>Script: {embeddedScriptName}</p>
                                    <p>By: {embeddedScriptUsername}</p>
                                </div>}
                                <Editor />
                            </div>
                            {numTabs === 0 && <div className="h-full flex flex-col justify-evenly text-4xl text-center">
                                <div className="leading-relaxed">
                                    <div id="no-scripts-warning">You have no scripts loaded.</div>
                                    <a href="#" onClick={createScript}>Click here to create a new script!</a>
                                </div>

                                <div className="leading-relaxed empty-script-lang-message">
                                    <p>You are currently in <span className="empty-script-lang">{language === "python" ? "Python" : "JavaScript"}</span> mode.</p>
                                    <p>If you want to switch to <span className="empty-script-lang">{language === "python" ? "JavaScript" : "Python"}</span> mode, <br />
                                        please open a script with <span className="empty-script-lang">{language === "python" ? ".js" : ".py"}</span> or create a new one <br />
                                        and select <span className="empty-script-lang">{language === "python" ? "JavaScript" : "Python"}</span> as the script language.</p>
                                </div>
                            </div>}
                            <iframe id="ifmcontentstoprint" className="h-0 w-0 invisible absolute"></iframe>
                        </div>
                    </div>}

                    <div className="results" id="console-frame" style={{ zIndex: bubbleActive && [9].includes(bubblePage) ? 35 : 0 }}>
                        <div className="row">
                            <div id="console">
                                {userConsole.logs.map((msg: any, index: number) =>
                                <div key={index} className="console-line">
                                    <span className={"console-" + msg.level.replace("status", "info")}>
                                        {msg.text}
                                        {msg.level === "error" &&
                                        <a className="cursor-pointer" onClick={() => helpers.getNgRootScope().loadChapterForError(msg.text)}>
                                            Click here for more information.
                                        </a>}
                                    </span>
                                </div>)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-full" id="curriculum-container" style={{ zIndex: bubbleActive && [8,9].includes(bubblePage) ? 35 : 0 }}>
                    {helpers.getNgMainController().scope().showCAIWindow
                    ? <CAI />
                    : <Curriculum />}
                    {/* NOTE: The chat window might come back here at some point. */}
                </div>
            </div>
        </div>
    </div>
}

const HotIDE = hot(() => <Provider store={store}><IDE /></Provider>)

export { HotIDE as IDE }