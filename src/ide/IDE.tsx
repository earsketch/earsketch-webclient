import i18n from "i18next"
import parse from "html-react-parser"
import React, { useEffect, useRef, useState } from "react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import { useTranslation } from "react-i18next"
import Split from "react-split"

import * as appState from "../app/appState"
import { Browser } from "../browser/Browser"
import * as bubble from "../bubble/bubbleState"
import { CAI } from "../cai/CAI"
import * as caiThunks from "../cai/caiThunks"
import { Chat } from "../cai/Chat"
import * as collaboration from "../app/collaboration"
import { Script } from "common"
import { Curriculum } from "../browser/Curriculum"
import * as curriculum from "../browser/curriculumState"
import { callbacks as dawCallbacks, DAW, setDAWData } from "../daw/DAW"
import * as editor from "./Editor"
import { EditorHeader } from "./EditorHeader"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { setReady } from "../bubble/bubbleState"
import { dismiss } from "../bubble/bubbleThunks"
import * as ide from "./ideState"
import * as layout from "./layoutState"
import { openModal } from "../app/modal"
import { reloadRecommendations } from "../app/reloadRecommender"
import reporter from "../app/reporter"
import * as runner from "../app/runner"
import { ScriptCreator } from "../app/ScriptCreator"
import store from "../reducers"
import * as scripts from "../browser/Scripts"
import * as scriptsState from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import { Tabs } from "./Tabs"
import * as tabs from "./tabState"
import { saveScriptIfModified, setActiveTabAndEditor } from "./tabThunks"
import * as ideConsole from "./console"
import * as userNotification from "../user/notification"
import * as user from "../user/userState"
import type { DAWData } from "common"
import classNames from "classnames"

const STATUS_SUCCESSFUL = 1
const STATUS_UNSUCCESSFUL = 2

// Flag to prevent successive compilation / script save request
let isWaitingForServerResponse = false

// Prompts the user for a name and language, then calls the userProject
// service to create the script from an empty template. The tab will be
// automatically opened and switched to.
export async function createScript() {
    const { bubble } = store.getState()
    if (bubble.active && bubble.currentPage === 9) {
        store.dispatch(dismiss())
    }

    reporter.createScript()
    const filename = await openModal(ScriptCreator)
    if (filename) {
        const action = scriptsThunks.saveScript({ name: filename, source: i18n.t(`templates:${ESUtils.parseLanguage(filename)}`) })
        const script = await store.dispatch(action).unwrap()
        store.dispatch(setActiveTabAndEditor(script.shareid))
    }
}

scripts.callbacks.create = createScript

function saveActiveScriptWithRunStatus(status: number) {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    const script = activeTabID === null ? null : scriptsState.selectAllScripts(store.getState())[activeTabID]

    if (script?.collaborative) {
        script && collaboration.saveScript(script.shareid)
        isWaitingForServerResponse = false
    } else if (script && !script.readonly && !script.isShared && !script.saved) {
        // save the script on a successful run
        store.dispatch(scriptsThunks.saveScript({
            name: script.name,
            source: script.source_code,
            status,
        })).unwrap().then(() => {
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
    editor.focus()
    store.dispatch(scriptsState.setFeatureSharedScript(true))
}

let setLoading: (loading: boolean) => void

function saveScript() {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    const script = activeTabID === null ? null : scriptsState.selectAllScripts(store.getState())[activeTabID]

    if (!script?.saved) {
        store.dispatch(saveScriptIfModified(activeTabID))
    } else if (script?.collaborative) {
        collaboration.saveScript()
    }
    activeTabID && store.dispatch(tabs.removeModifiedScript(activeTabID))
}

// Save scripts when not focused on editor.
window.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault()
        saveScript()
    }
})

editor.ready.then(() => {
    // editor.droplet.setEditorState(false)

    // open shared script from URL
    const shareID = ESUtils.getURLParameter("sharing")
    if (shareID) {
        openShare(shareID).then(() => {
            store.dispatch(setActiveTabAndEditor(shareID))
        })
    }

    const activeTabID = tabs.selectActiveTabID(store.getState())
    activeTabID && store.dispatch(setActiveTabAndEditor(activeTabID))

    const activeScript = tabs.selectActiveTabScript(store.getState())
    editor.setReadOnly(store.getState().app.embedMode || activeScript?.readonly)
})

editor.bindKey("Mod-Enter", runScript)
editor.bindKey("Mod-s", saveScript)

// Timer: auto save
let autoSaveTimer = 0
editor.changeListeners.push(() => {
    clearTimeout(autoSaveTimer)
    const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000 // 5 min
    autoSaveTimer = window.setTimeout(scriptsThunks.saveAll, AUTO_SAVE_INTERVAL_MS)
})

function embeddedScriptLoaded(username: string, scriptName: string, shareid: string) {
    store.dispatch(appState.setEmbeddedScriptUsername(username))
    store.dispatch(appState.setEmbeddedScriptName(scriptName))
    store.dispatch(appState.setEmbeddedShareID(shareid))
}

export async function openShare(shareid: string) {
    const isEmbedded = store.getState().app.embedMode

    if (user.selectLoggedIn(store.getState())) {
        // User is logged in
        const results = await store.dispatch(scriptsThunks.getSharedScripts()).unwrap()
        // Check if the shared script has been saved
        let result = results.find(script => script.shareid === shareid)

        if (result) {
            // user has already opened this shared link before
            if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)
            store.dispatch(setActiveTabAndEditor(shareid))
            switchToShareMode()
        } else {
            // user has not opened this shared link before
            result = await scriptsThunks.loadScript(shareid, true) as Script
            if (!result) {
                userNotification.show("This share script link is invalid.")
                return
            }

            if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)

            const regularScripts = scriptsState.selectRegularScripts(store.getState())

            if (result.username === user.selectUserName(store.getState()) && shareid in regularScripts) {
                // The shared script belongs to the logged-in user and exists in their scripts.
                editor.focus()

                if (isEmbedded) {
                    // TODO: There might be async ops that are not finished. Could manifest as a redux-userProject sync issue with user accounts with a large number of scripts (not too critical).
                    store.dispatch(setActiveTabAndEditor(shareid))
                } else {
                    userNotification.show("This shared script link points to your own script.")
                }

                // Manually remove the user-owned shared script from the browser.
                const { [shareid]: _, ...sharedScripts } = scriptsState.selectSharedScripts(store.getState())
                store.dispatch(scriptsState.setSharedScripts(sharedScripts))
            } else {
                // The shared script doesn't belong to the logged-in user (or is a locked version from the past).
                switchToShareMode()
                await scriptsThunks.saveSharedScript(shareid, result.name, result.source_code, result.username)
                await store.dispatch(scriptsThunks.getSharedScripts()).unwrap()
                store.dispatch(setActiveTabAndEditor(shareid))
            }
        }
    } else {
        // User is not logged in
        const result = await scriptsThunks.loadScript(shareid, true)
        if (!result) {
            userNotification.show("This share script link is invalid.")
            return
        }
        if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)
        await scriptsThunks.saveSharedScript(shareid, result.name, result.source_code, result.username)
        store.dispatch(setActiveTabAndEditor(shareid))
        switchToShareMode()
    }
}

// For curriculum pages.
function importExample(sourceCode: string) {
    // Curriculum examples may provide a script name by creating a comment on the first line...
    //    # MY SCRIPT NAME: THE DESCRIPTION
    //    // MY SCRIPT NAME: THE DESCRIPTION
    //    // MON SCRIPT EN FRANÇAIS : LA DESCRIPTION
    //
    // Unsupported characters are removed, so...
    //     "# Commenting Sections: Description" --> "CommentingSections.py"
    //     "# Entrée de l'utilisateur 1 : Description" --> "Entreedelutilisateur1.py"

    const [firstLine] = sourceCode.split("\n", 1)

    // isolate the script name from the description
    const result = /^(?:\/\/|#) (.*?) ?:/.exec(firstLine)

    // remove unsupported characters
    let scriptName
    if (result && result[1]) {
        // we allow the english alphabet and accented latin characters
        // see https://stackoverflow.com/a/26900132
        scriptName = result[1].replace(/[^\wÀ-ÖØ-öø-ÿ_]/g, "")
    } else {
        scriptName = "curriculum"
    }

    const ideTargetLanguage = store.getState().app.scriptLanguage
    const ext = ideTargetLanguage === "python" ? ".py" : ".js"

    // Create a fake script object to load into a tab.
    const fakeScript = {
        name: scriptName + ext,
        source_code: sourceCode,
        shareid: scriptsState.selectNextLocalScriptID(store.getState()),
        readonly: true,
    }

    store.dispatch(scriptsState.addReadOnlyScript(fakeScript))
    editor.focus()
    store.dispatch(setActiveTabAndEditor(fakeScript.shareid))
}

curriculum.callbacks.import = importExample

// Run script in the editor and propagate the DAW data it generates.
async function runScript() {
    if (isWaitingForServerResponse) return

    isWaitingForServerResponse = true

    setLoading(true)

    const code = editor.getContents()

    const startTime = Date.now()
    const state = store.getState()
    const hideEditor = appState.selectHideEditor(state)
    const scriptName = (hideEditor ? appState.selectEmbeddedScriptName(state) : tabs.selectActiveTabScript(state).name)!
    const language = ESUtils.parseLanguage(scriptName)

    editor.clearErrors()
    ideConsole.clear()
    ideConsole.status(i18n.t("messages:idecontroller.running"))

    const scriptID = tabs.selectActiveTabID(state)
    store.dispatch(tabs.removeModifiedScript(scriptID))

    let result: DAWData
    try {
        result = await runner.run(language, editor.getContents())
    } catch (error) {
        const duration = Date.now() - startTime
        esconsole(error, ["ERROR", "IDE"])
        setLoading(false)
        ideConsole.error(error)
        editor.highlightError(error)

        const errType = String(error).split(":")[0]
        reporter.compile(language, false, errType, duration)

        userNotification.showBanner(i18n.t("messages:interpreter.runFailed"), "failure1")

        saveActiveScriptWithRunStatus(STATUS_UNSUCCESSFUL)

        if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT || FLAGS.UPLOAD_CAI_HISTORY) {
            store.dispatch(caiThunks.compileError(error))
        }
        return
    }

    const duration = Date.now() - startTime
    setLoading(false)
    if (result) {
        esconsole("Ran script, updating DAW.", "ide")
        setDAWData(result)
        reloadRecommendations()
    }
    reporter.compile(language, true, undefined, duration)
    userNotification.showBanner(i18n.t("messages:interpreter.runSuccess"), "success")
    store.dispatch(ide.setScriptMatchesDAW(true))
    saveActiveScriptWithRunStatus(STATUS_SUCCESSFUL)

    // Small hack -- if a pitchshift is present, it may print the success message after the compilation success message.
    setTimeout(() => ideConsole.status(i18n.t("messages:idecontroller.success")), 200)

    // asynchronously report the script complexity
    if (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT || FLAGS.UPLOAD_CAI_HISTORY) {
        setTimeout(() => {
            store.dispatch(caiThunks.compileCai([result, language, code]))
        })
    }

    const { bubble } = state
    if (bubble.active && bubble.currentPage === 2 && !bubble.readyToProceed) {
        store.dispatch(setReady(true))
    }
}

dawCallbacks.runScript = runScript

export const IDE = ({ closeAllTabs, importScript, shareScript, downloadScript }: {
    closeAllTabs: () => void, importScript: (s: Script) => void, shareScript: (s: Script) => void, downloadScript: (s: Script) => void
}) => {
    const dispatch = useDispatch()
    const language = useSelector(appState.selectScriptLanguage)
    const { t } = useTranslation()
    const numTabs = useSelector(tabs.selectOpenTabs).length
    const fontSize = useSelector(appState.selectFontSize)

    const embedMode = useSelector(appState.selectEmbedMode)
    const embeddedScriptName = useSelector(appState.selectEmbeddedScriptName)
    const embeddedScriptUsername = useSelector(appState.selectEmbeddedScriptUsername)
    const hideDAW = useSelector(appState.selectHideDAW)
    const hideEditor = useSelector(appState.selectHideEditor)

    const bubbleActive = useSelector(bubble.selectActive)
    const bubblePage = useSelector(bubble.selectCurrentPage)

    const showCai = useSelector(layout.selectEastKind) === "CAI" && (FLAGS.SHOW_CAI || FLAGS.SHOW_CHAT)

    const logs = useSelector(ide.selectLogs)
    const consoleContainer = useRef<HTMLDivElement>(null)

    const [loading, _setLoading] = useState(false)

    const scriptLang = language === "python" ? "Python" : "JavaScript"
    const otherScriptLang = language === "python" ? "JavaScript" : "Python"
    const otherScriptExt = language === "python" ? ".js" : ".py"
    setLoading = _setLoading

    useEffect(() => {
        // Scroll to the bottom of the console when new messages come in.
        if (consoleContainer.current) {
            consoleContainer.current.scrollTop = consoleContainer.current.scrollHeight
        }
    }, [logs])

    const gutterSize = hideEditor ? 0 : 9
    const isWestOpen = useSelector(layout.isWestOpen)
    const isEastOpen = useSelector(layout.isEastOpen)
    const minWidths = embedMode ? [0, 0, 0] : [isWestOpen ? layout.MIN_WIDTH : layout.COLLAPSED_WIDTH, layout.MIN_WIDTH, isEastOpen ? layout.MIN_WIDTH : layout.COLLAPSED_WIDTH]
    const maxWidths = embedMode ? [0, Infinity, 0] : [isWestOpen ? Infinity : layout.COLLAPSED_WIDTH, Infinity, isEastOpen ? Infinity : layout.COLLAPSED_WIDTH]
    const minHeights = embedMode ? [layout.MIN_DAW_HEIGHT, 0, 0] : [layout.MIN_DAW_HEIGHT, layout.MIN_EDITOR_HEIGHT, layout.MIN_DAW_HEIGHT]
    const maxHeights = hideDAW ? [layout.MIN_DAW_HEIGHT, Infinity, 0] : undefined

    let horizontalRatio = useSelector(layout.selectHorizontalRatio)
    let verticalRatio = useSelector(layout.selectVerticalRatio)
    if (embedMode) {
        horizontalRatio = [0, 100, 0]
        verticalRatio = hideEditor ? [100, 0, 0] : (hideDAW ? [0, 100, 0] : [25, 75, 0])
    }

    scripts.callbacks.share = shareScript
    scripts.callbacks.download = downloadScript

    return <main role="main" id="main-container" className="grow flex flex-row h-full overflow-hidden" style={embedMode ? { top: "0", left: "0" } : {}}>
        <div className="w-full h-full">
            <Split
                className="split flex flex-row h-full" gutterSize={gutterSize} snapOffset={0}
                sizes={horizontalRatio} minSize={minWidths} maxSize={maxWidths}
                onDragEnd={ratio => dispatch(layout.setHorizontalSizesFromRatio(ratio))}
            >
                <div id="sidebar-container" style={bubbleActive && [5, 6, 7, 9].includes(bubblePage) ? { zIndex: 35 } : {}}>
                    <div className="overflow-hidden" id="sidebar"> {/* re:overflow, split.js width calculation can cause the width to spill over the parent width */}
                        <Browser />
                    </div>
                </div>

                <Split
                    className="split flex flex-col" gutterSize={gutterSize} snapOffset={0}
                    sizes={verticalRatio} minSize={minHeights} maxSize={maxHeights} direction="vertical"
                    onDragEnd={ratio => dispatch(layout.setVerticalSizesFromRatio(ratio))}
                >
                    <div id="devctrl">
                        <div className="h-full max-h-full relative" id="workspace" style={bubbleActive && [3, 4, 9].includes(bubblePage) ? { zIndex: 35 } : {}}>
                            <div className={(loading ? "flex" : "hidden") + " loading text-center h-full w-full items-center justify-center"}>
                                <i className="es-spinner animate-spin mr-3"></i> {t("loading")}
                            </div>
                            <div className={(loading ? "hidden " : "") + "workstation h-full w-full"}><DAW /></div>
                        </div>
                    </div>

                    <div className={"flex flex-col" + (hideEditor ? " hidden" : "")} id="coder" style={bubbleActive && [1, 2, 9].includes(bubblePage) ? { zIndex: 35 } : {}}>
                        <EditorHeader running={loading} run={runScript} cancel={runner.cancel} shareScript={shareScript} />

                        <div className="grow h-full overflow-y-hidden">
                            <div className={"h-full flex flex-col" + (numTabs === 0 ? " hidden" : "")}>
                                <Tabs create={createScript} closeAll={closeAllTabs} />
                                {embedMode && <div className="embedded-script-info h-auto" >
                                    <p>Script: {embeddedScriptName}</p>
                                    <p>By: {embeddedScriptUsername}</p>
                                </div>}
                                <editor.Editor importScript={importScript} />
                            </div>
                            {numTabs === 0 && <div className="h-full flex flex-col justify-evenly text-2xl text-center">
                                <div className="leading-relaxed">
                                    <div id="no-scripts-warning">{t("editor.noScriptsLoaded")}</div>
                                    <a href="#" onClick={e => { e.preventDefault(); createScript() }}>{t("editor.clickHereCreateScript")}</a>
                                </div>

                                <div className="leading-relaxed empty-script-lang-message">
                                    <p>{parse(t("editor.mode", { scriptlang: scriptLang }))}</p>
                                    <p>{parse(t("editor.ifYouWant", { scriptLang, otherScriptLang, otherScriptExt }))}</p>
                                </div>
                            </div>}
                            <iframe id="ifmcontentstoprint" className="h-0 w-0 invisible absolute"></iframe>
                        </div>
                    </div>

                    <div ref={consoleContainer} id="console-frame" className="results" style={{ WebkitTransform: "translate3d(0,0,0)", ...(bubbleActive && [9].includes(bubblePage) ? { zIndex: 35 } : {}) }}>
                        <div className="row">
                            <div id="console">
                                {logs.map((msg: ide.Log, index: number) => {
                                    const consoleLineClass = classNames({
                                        "console-line": true,
                                        "console-warn": msg.level === "warn",
                                        "console-error": msg.level === "error",
                                    })
                                    return <div key={index} className={consoleLineClass} style={{ fontSize }}>
                                        {["warn", "error"].includes(msg.level) && (msg.level === "error"
                                            ? <span title={t("console:error")} className="icon-cancel-circle2 pr-1" style={{ color: "#f43" }}></span>
                                            : <span title={t("console:warning")} className="icon-warning2 pr-1" style={{ color: "#e8b33f" }}></span>)}
                                        <span>
                                            {msg.text}{" "}
                                            {msg.level === "error" && <>
                                                —{" "}
                                                <a className="cursor-pointer" onClick={() => {
                                                    dispatch(curriculum.openErrorPage(msg.text))
                                                }}>
                                                    Click here for more information.
                                                </a>
                                            </>}
                                        </span>
                                    </div>
                                })}
                            </div>
                        </div>
                    </div>
                </Split>

                <div className="h-full" id="curriculum-container" style={bubbleActive && [8, 9].includes(bubblePage) ? { zIndex: 35 } : {}}>
                    {(showCai || FLAGS.UPLOAD_CAI_HISTORY) &&
                        (<div className={(!showCai && FLAGS.UPLOAD_CAI_HISTORY) ? "hidden" : "h-full"}>
                            {(FLAGS.SHOW_CHAT
                                ? <Chat />
                                : <CAI />)}
                        </div>)}
                    <div className={showCai ? "h-full hidden" : "h-full"}>
                        <Curriculum />
                    </div>
                </div>
            </Split>
        </div>
    </main>
}
