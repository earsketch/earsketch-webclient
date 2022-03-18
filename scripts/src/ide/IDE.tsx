import i18n from "i18next"
import parse from "html-react-parser"
import React, { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import Split from "react-split"

import { openModal } from "../app/App"
import * as appState from "../app/appState"
import { Browser } from "../browser/Browser"
import * as bubble from "../bubble/bubbleState"
import { CAI } from "../cai/CAI"
import * as cai from "../cai/caiState"
import * as caiAnalysis from "../cai/analysis"
import { Chat } from "../cai/Chat"
import * as collaboration from "../app/collaboration"
import { Script } from "common"
import { Curriculum } from "../browser/Curriculum"
import * as curriculum from "../browser/curriculumState"
import { DAW, setDAWData } from "../daw/DAW"
import { Editor } from "./Editor"
import { EditorHeader } from "./EditorHeader"
import esconsole from "../esconsole"
import * as ESUtils from "../esutils"
import { setReady, dismissBubble } from "../bubble/bubbleState"
import * as scripts from "../browser/scriptsState"
import * as editor from "./Editor"
import * as ide from "./ideState"
import * as layout from "./layoutState"
import reporter from "../app/reporter"
import * as runner from "../app/runner"
import { ScriptCreator } from "../app/ScriptCreator"
import store from "../reducers"
import { Tabs } from "./Tabs"
import * as tabs from "./tabState"
import * as ideConsole from "./console"
import * as userNotification from "../user/notification"
import * as userProject from "../app/userProject"
import { DAWData } from "../app/player"

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
    const filename = await openModal(ScriptCreator)
    if (filename) {
        const script = await userProject.createScript(filename)
        store.dispatch(tabs.setActiveTabAndEditor(script.shareid))
    }
}

function saveActiveScriptWithRunStatus(status: number) {
    const activeTabID = tabs.selectActiveTabID(store.getState())!
    const script = activeTabID === null ? null : scripts.selectAllScripts(store.getState())[activeTabID]

    if (script?.collaborative) {
        script && collaboration.saveScript(script.shareid)
        isWaitingForServerResponse = false
    } else if (script && !script.readonly && !script.isShared && !script.saved) {
        // save the script on a successful run
        userProject.saveScript(script.name, script.source_code, true, status).then(() => {
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
            const script = activeTabID === null ? null : scripts.selectAllScripts(store.getState())[activeTabID]

            if (!script?.saved) {
                store.dispatch(tabs.saveScriptIfModified(activeTabID))
            } else if (script?.collaborative) {
                collaboration.saveScript()
            }
            activeTabID && store.dispatch(tabs.removeModifiedScript(activeTabID))
        },
    })

    // Save scripts when not focused on editor.
    window.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
            event.preventDefault()
            editor.ace.commands.exec("saveScript", editor.ace, [])
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
        },
    })

    // Add additional autocomplete shortcut for Mac.
    editor.ace.commands.addCommand({
        ...editor.ace.commands.byName.startAutocomplete,
        name: "startAutocompleteMac",
        bindKey: { mac: "Option-Space" },
    })

    editor.droplet.setEditorState(false)

    // open shared script from URL
    const shareID = ESUtils.getURLParameter("sharing")
    if (shareID) {
        openShare(shareID).then(() => {
            store.dispatch(tabs.setActiveTabAndEditor(shareID))
        })
    }

    store.dispatch(ide.setEditorInstance(editor))
    const activeTabID = tabs.selectActiveTabID(store.getState())
    activeTabID && store.dispatch(tabs.setActiveTabAndEditor(activeTabID))

    const activeScript = tabs.selectActiveTabScript(store.getState())
    editor.setReadOnly(store.getState().app.embedMode || activeScript?.readonly)
}

function embeddedScriptLoaded(username: string, scriptName: string, shareid: string) {
    store.dispatch(appState.setEmbeddedScriptUsername(username))
    store.dispatch(appState.setEmbeddedScriptName(scriptName))
    store.dispatch(appState.setEmbeddedShareID(shareid))
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
            if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)
            store.dispatch(tabs.setActiveTabAndEditor(shareid))
            switchToShareMode()
        } else {
            // user has not opened this shared link before
            result = await userProject.loadScript(shareid, true) as Script
            if (!result) {
                userNotification.show("This share script link is invalid.")
                return
            }

            if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)

            const regularScripts = scripts.selectRegularScripts(store.getState())

            if (result.username === userProject.getUsername() && shareid in regularScripts) {
                // The shared script belongs to the logged-in user and exists in their scripts.
                // TODO: use broadcast or service
                editor.ace.focus()

                if (isEmbedded) {
                    // TODO: There might be async ops that are not finished. Could manifest as a redux-userProject sync issue with user accounts with a large number of scripts (not too critical).
                    store.dispatch(tabs.setActiveTabAndEditor(shareid))
                } else {
                    userNotification.show("This shared script link points to your own script.")
                }

                // Manually remove the user-owned shared script from the browser.
                const { [shareid]: _, ...sharedScripts } = scripts.selectSharedScripts(store.getState())
                store.dispatch(scripts.setSharedScripts(sharedScripts))
            } else {
                // The shared script doesn't belong to the logged-in user (or is a locked version from the past).
                switchToShareMode()
                await userProject.saveSharedScript(shareid, result.name, result.source_code, result.username)
                await userProject.getSharedScripts()
                store.dispatch(tabs.setActiveTabAndEditor(shareid))
            }
        }
    } else {
        // User is not logged in
        const result = await userProject.loadScript(shareid, true)
        if (!result) {
            userNotification.show("This share script link is invalid.")
            return
        }
        if (isEmbedded) embeddedScriptLoaded(result.username, result.name, result.shareid)
        await userProject.saveSharedScript(shareid, result.name, result.source_code, result.username)
        store.dispatch(tabs.setActiveTabAndEditor(shareid))
        switchToShareMode()
    }
}

// For curriculum pages.
export function importScript(key: string) {
    const result = /script_name: (.*)/.exec(key)
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
        shareid: userProject.generateAnonymousScriptID(),
        readonly: true,
    }

    store.dispatch(scripts.addReadOnlyScript(fakeScript))
    editor.ace.focus()
    store.dispatch(tabs.setActiveTabAndEditor(fakeScript.shareid))
}

// Compile code in the editor and broadcast the result to all scopes.
export async function compileCode() {
    if (isWaitingForServerResponse) return

    isWaitingForServerResponse = true

    setLoading(true)

    const code = editor.getValue()

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
        result = await (language === "python" ? runner.runPython : runner.runJavaScript)(editor.getValue())
    } catch (error) {
        const duration = Date.now() - startTime
        esconsole(error, ["ERROR", "IDE"])
        setLoading(false)
        ideConsole.error(error)
        editor.highlightError(error)

        const errType = String(error).split(":")[0]
        reporter.compile(language, false, errType, duration)

        userNotification.showBanner(i18n.t("messages:interpreter.runFailed"), "failure1")

        saveActiveScriptWithRunStatus(userProject.STATUS_UNSUCCESSFUL)

        if (FLAGS.SHOW_CAI) {
            store.dispatch(cai.compileError(error))
        }
        return
    }

    const duration = Date.now() - startTime
    setLoading(false)
    if (result) {
        esconsole("Code compiled, updating DAW.", "ide")
        setDAWData(result)
    }
    reporter.compile(language, true, undefined, duration)
    userNotification.showBanner(i18n.t("messages:interpreter.runSuccess"), "success")
    saveActiveScriptWithRunStatus(userProject.STATUS_SUCCESSFUL)

    // Small hack -- if a pitchshift is present, it may print the success message after the compilation success message.
    setTimeout(() => ideConsole.status(i18n.t("messages:idecontroller.success")), 200)

    // asyncronously report the script complexity
    if (FLAGS.SHOW_AUTOGRADER) {
        setTimeout(() => {
            // reporter.complexity(language, code)
            let report
            try {
                report = caiAnalysis.analyzeCodeAndMusic(language, code, result)
            } catch (e) {
                // TODO: Make this work across browsers. (See esconsole for reference.)
                let stackString = "unknown"
                try {
                    stackString = e.stack.split(" at")[0] + " at " + e.stack.split(" at")[1]
                    let startIndex = stackString.indexOf("reader.js")
                    stackString = stackString.substring(startIndex)
                    stackString = stackString.substring(0, stackString.indexOf(")"))
                    const traceDepth = 5

                    for (let i = 0; i < traceDepth; i++) {
                        let addItem = e.stack.split(" at")[2 + i]
                        startIndex = addItem.lastIndexOf("/")
                        addItem = addItem.substring(startIndex + 1)
                        addItem = addItem.substring(0, addItem.indexOf(")"))
                        addItem = "|" + addItem
                        stackString += addItem
                    }
                } catch {
                    console.log("Failed to parse stack track.")
                }

                reporter.readererror(e.toString() + ". Location: " + stackString)
            }

            console.log("complexityCalculator", report)

            if (FLAGS.SHOW_CAI) {
                store.dispatch(cai.compileCAI([result, language, code]))
            }
        })
    }

    const { bubble } = state
    if (bubble.active && bubble.currentPage === 2 && !bubble.readyToProceed) {
        store.dispatch(setReady(true))
    }
}

export const IDE = () => {
    const dispatch = useDispatch()
    const language = useSelector(appState.selectScriptLanguage)
    const { t } = useTranslation()
    const numTabs = useSelector(tabs.selectOpenTabs).length

    const embedMode = useSelector(appState.selectEmbedMode)
    const embeddedScriptName = useSelector(appState.selectEmbeddedScriptName)
    const embeddedScriptUsername = useSelector(appState.selectEmbeddedScriptUsername)
    const hideDAW = useSelector(appState.selectHideDAW)
    const hideEditor = useSelector(appState.selectHideEditor)

    const bubbleActive = useSelector(bubble.selectActive)
    const bubblePage = useSelector(bubble.selectCurrentPage)

    const showCAI = useSelector(layout.selectEastKind) === "CAI" && FLAGS.SHOW_CAI

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

    return <div id="main-container" className="grow flex flex-row h-full overflow-hidden" style={embedMode ? { top: "0", left: "0" } : {}}>
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

                    <div className={"flex flex-col" + (hideEditor ? " hidden" : "")} id="coder" style={{ WebkitTransform: "translate3d(0,0,0)", ...(bubbleActive && [1, 2, 9].includes(bubblePage) ? { zIndex: 35 } : {}) }}>
                        <EditorHeader />

                        <div className="grow h-full overflow-y-hidden">
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
                                    <div id="no-scripts-warning">{t("editor.noScriptsLoaded")}</div>
                                    <a href="#" onClick={e => { e.preventDefault(); createScript() }}>{t("editor.clickHereCreateScript")}</a>
                                </div>

                                <div className="leading-relaxed empty-script-lang-message">
                                    <p>{parse(t("editor.mode", { scriptlang: scriptLang }))}</p>
                                    <p>{parse(t("editor.ifYouWant", { scriptLang: scriptLang, otherScriptLang: otherScriptLang, otherScriptExt: otherScriptExt }))}</p>
                                </div>
                            </div>}
                            <iframe id="ifmcontentstoprint" className="h-0 w-0 invisible absolute"></iframe>
                        </div>
                    </div>

                    <div ref={consoleContainer} id="console-frame" className="results" style={{ WebkitTransform: "translate3d(0,0,0)", ...(bubbleActive && [9].includes(bubblePage) ? { zIndex: 35 } : {}) }}>
                        <div className="row">
                            <div id="console">
                                {logs.map((msg: any, index: number) =>
                                    <div key={index} className="console-line">
                                        <span className={"console-" + msg.level.replace("status", "info")}>
                                            {msg.text}{" "}
                                            {msg.level === "error" &&
                                            <a className="cursor-pointer" onClick={() => dispatch(curriculum.fetchContent(curriculum.getChapterForError(msg.text)))}>
                                                Click here for more information.
                                            </a>}
                                        </span>
                                    </div>)}
                            </div>
                        </div>
                    </div>
                </Split>

                <div className="h-full" id="curriculum-container" style={bubbleActive && [8, 9].includes(bubblePage) ? { zIndex: 35 } : {}}>
                    {showCAI &&
                    (FLAGS.SHOW_CHAT
                        ? <Chat />
                        : <CAI />)}
                    <div className={showCAI ? "h-full hidden" : "h-full"}>
                        <Curriculum />
                    </div>
                </div>
            </Split>
        </div>
    </div>
}
