import { Ace } from "ace-builds"
import { hot } from "react-hot-loader/root"
import { Provider, useSelector } from "react-redux"
import { react2angular } from "react2angular"
import React, { useEffect, useRef } from "react"

import * as appState from "../app/appState"
import * as cai from "../cai/caiState"
import * as collaboration from "../app/collaboration"
import * as config from "./editorConfig"
import * as helpers from "../helpers"
import * as tabs from "./tabState"
import * as userProject from "../app/userProject"
import store from "../reducers"

// Millisecond timer for recommendation refresh update
let recommendationTimer = 0

const COLLAB_COLORS = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

// Minor hack. None of these functions should get called before the component has mounted and `ace` is set.
let ace: Ace.Editor = null as unknown as Ace.Editor
let mydroplet: any = null

function getValue() {
    return ace.getValue()
}

function setReadOnly(value: boolean) {
    ace.setReadOnly(value)
    mydroplet.setReadOnly(value)
}

function setFontSize(value: string) {
    ace.setFontSize(value)
    mydroplet.setFontSize(value)
}

function undo() {
    if (mydroplet.currentlyUsingBlocks) {
        mydroplet.undo()
    } else {
        ace.undo()
    }
}

function redo() {
    if (mydroplet.currentlyUsingBlocks) {
        mydroplet.redo()
    } else {
        ace.redo()
    }
}

function checkUndo() {
    if (mydroplet.currentlyUsingBlocks) {
        return mydroplet.undoStack.length > 0
    } else {
        const undoManager = ace.getSession().getUndoManager()
        return undoManager.canUndo()
    }
}

function checkRedo() {
    if (mydroplet.currentlyUsingBlocks) {
        return mydroplet.redoStack.length > 0
    } else {
        const undoManager = ace.getSession().getUndoManager()
        return undoManager.canRedo()
    }
}

function clearHistory() {
    if (mydroplet.currentlyUsingBlocks) {
        mydroplet.clearUndoStack()
    } else {
        const undoManager = ace.getSession().getUndoManager()
        undoManager.reset()
        ace.getSession().setUndoManager(undoManager)
    }
}

function setLanguage(currentLanguage: string) {
    if (currentLanguage === "python") {
        mydroplet.setMode("python", config.blockPalettePython.modeOptions)
        mydroplet.setPalette(config.blockPalettePython.palette)
    } else if (currentLanguage === "javascript") {
        mydroplet.setMode("javascript", config.blockPaletteJavascript.modeOptions)
        mydroplet.setPalette(config.blockPaletteJavascript.palette)
    }
    ace.getSession().setMode("ace/mode/" + currentLanguage)
}

function setupAceHandlers(ace: Ace.Editor, ideScope: any) {
    ace.on("changeSession", (event: any) => ideScope.onChangeTasks.forEach((fn: Function) => fn(event)))

    // TODO: add listener if collaboration userStatus is owner, remove otherwise
    // TODO: also make sure switching / closing tab is handled
    ace.on("change", (event: any) => {
        ideScope.onChangeTasks.forEach((fn: Function) => fn(event))

        const t = Date.now()
        if (FLAGS.SHOW_CAI) {
            store.dispatch(cai.keyStroke([event["action"], event["lines"], t]))
        }
        
        if (collaboration.active && !collaboration.lockEditor) {
            // convert from positionObjects & lines to index & text
            const session = ace.getSession()
            const document = session.getDocument()
            const start = document.positionToIndex(event.start, 0)
            const text = event.lines.length > 1 ? event.lines.join("\n") : event.lines[0]

            // buggy!
            // const end = document.positionToIndex(event.end, 0)
            const end = start + text.length

            collaboration.editScript({
                action: event.action,
                start: start,
                end: end,
                text: text,
                len: end - start
            })
        }

        if (recommendationTimer !== 0) {
            clearTimeout(recommendationTimer)
        }

        recommendationTimer = window.setTimeout(() => {
            helpers.getNgRootScope().$broadcast("reloadRecommendations")
            if (FLAGS.SHOW_CAI) {
                store.dispatch(cai.checkForCodeUpdates())
            }
        }, 1000)

        const activeTabID = tabs.selectActiveTabID(store.getState())
        const editSession = ace.getSession()
        tabs.setEditorSession(activeTabID, editSession)

        let script = null

        if (activeTabID !== null && activeTabID in userProject.scripts) {
            script = userProject.scripts[activeTabID]
        } else if (activeTabID !== null && activeTabID in userProject.sharedScripts) {
            script = userProject.sharedScripts[activeTabID]
        }
        if (script) {
            script.source_code = editSession.getValue()
            if (!script.collaborative) {
                script.saved = false
                store.dispatch(tabs.addModifiedScript(activeTabID))
            }
        }
    })

    ace.getSession().selection.on("changeSelection", () => {
        if (collaboration.active && !collaboration.isSynching) {
            setTimeout(() => collaboration.storeSelection(ace.getSession().selection.getRange()))
        }
    })

    ace.getSession().selection.on("changeCursor", () => {
        if (collaboration.active && !collaboration.isSynching) {
            setTimeout(() => {
                const session = ace.getSession()
                collaboration.storeCursor(session.selection.getCursor())
            })
        }
    })

    ace.on("focus", () => {
        if (collaboration.active) {
            collaboration.checkSessionStatus()
        }
    })
}

let setupDone = false

function setup(editor: any, element: HTMLDivElement, language: string, ideScope: any) {
    if (setupDone) return
    if (language === "python") {
        mydroplet = new droplet.Editor(element, config.blockPalettePython)
    } else {
        mydroplet = new droplet.Editor(element, config.blockPaletteJavascript)
    }
    editor.droplet = mydroplet

    ace = mydroplet.aceEditor
    editor.ace = ace
    setupAceHandlers(editor.ace, ideScope)

    ideScope.initEditor()

    ideScope.collaboration = collaboration
    collaboration.setEditor(editor)
    setupDone = true
}

const Editor = () => {
    const language = useSelector(appState.selectScriptLanguage)
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const ideScope = helpers.getNgController("ideController").scope()
    const editor = ideScope.editor
    const editorElement = useRef<HTMLDivElement>(null)

    useEffect(() => {
        Object.assign(editor, {
            getValue, setReadOnly, setFontSize, undo,
            redo, checkUndo, checkRedo, clearHistory, setLanguage,
        })
        ideScope.onChangeTasks = new Set()
    }, [])

    useEffect(() => {
        if (!editorElement.current) return
        setup(editor, editorElement.current, language, ideScope)
    }, [editorElement.current])

    return <>
        {/* TODO: using parent (ideController) scope... cannot isolate them well */}
        <div ref={editorElement} id="editor" className="code-container">
            {/* import button */}
            {activeScript?.readonly && !embedMode
            && <div className="floating-bar" onClick={ideScope.importScript}>
                <div>{/* DO NOT REMOVE: this is an empty div to block the space before the next div */}</div>
                <div className="btn-action btn-floating shake">
                    <i className="icon icon-import"></i><span>IMPORT TO EDIT</span>
                </div>
            </div>}
        </div>

        {/* Note: activeScript managed in ideController and tabState */}
        {activeScript?.collaborative && <div id="collab-badges-container">
            {Object.entries(collaboration.otherMembers).map(([name, state], index) => 
            <div className="collaborator-badge prevent-selection" style={{
                    borderColor: state.active ? `rgba(${COLLAB_COLORS[index % 6].join()},0.75)` : "#666",
                    backgroundColor: state.active ? `rgba(${COLLAB_COLORS[index % 6].join()},0.5)`: "#666",
                 }}
                 uib-tooltip="{{name}}" tooltip-placement="left" uib-popover={collaboration.chat[name].text}
                 popover-placement="left" popover-is-open="collaboration.chat[name].popover" popover-trigger="none">
                {name[0].toUpperCase()}
            </div>)}
        </div>}
    </>
}

const HotEditor = hot(() => <Provider store={store}><Editor /></Provider>)

app.component("editor", react2angular(HotEditor))