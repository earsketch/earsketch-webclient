import React, { useEffect, useRef } from "react"
import { hot } from "react-hot-loader/root"
import { Provider, useSelector } from "react-redux"
import { react2angular } from "react2angular"

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

const collabColors = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

function setupAceHandlers(editor: any, ideScope: any) {
    editor.ace.on("changeSession", (event: any) => ideScope.onChangeTasks.forEach((fn: Function) => fn(event)))

    // TODO: add listener if collaboration userStatus is owner, remove otherwise
    // TODO: also make sure switching / closing tab is handled
    editor.ace.on("change", (event: any) => {
        ideScope.onChangeTasks.forEach((fn: Function) => fn(event))

        // console.log("event in editor", event,event["action"],event["lines"])
        var t = Date.now()
        if (FLAGS.SHOW_CAI) {
            store.dispatch(cai.keyStroke([event["action"],event["lines"],t]))
        }
        
        if (collaboration.active && !collaboration.lockEditor) {
            // convert from positionObjects & lines to index & text
            var session = editor.ace.getSession()
            var document = session.getDocument()
            var start = document.positionToIndex(event.start, 0)
            var text = event.lines.length > 1 ? event.lines.join("\n") : event.lines[0]

            // buggy!
            // var end = document.positionToIndex(event.end, 0)
            var end = start + text.length

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

        recommendationTimer = window.setTimeout(function() {
            helpers.getNgRootScope().$broadcast("reloadRecommendations")
            if (FLAGS.SHOW_CAI) {
                store.dispatch(cai.checkForCodeUpdates())
            }
        }, 1000)

        const activeTabID = tabs.selectActiveTabID(store.getState())
        const editSession = editor.ace.getSession()
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

    editor.ace.getSession().selection.on("changeSelection", function () {
        if (collaboration.active && !collaboration.isSynching) {
            setTimeout(() => collaboration.storeSelection(editor.ace.getSession().selection.getRange()))
        }
    })

    editor.ace.getSession().selection.on("changeCursor", function () {
        if (collaboration.active && !collaboration.isSynching) {
            setTimeout(function () {
                var session = editor.ace.getSession()
                collaboration.storeCursor(session.selection.getCursor())
            })
        }
    })

    editor.ace.on("focus", () => {
        if (collaboration.active) {
            collaboration.checkSessionStatus()
        }
    })
}

let setupDone = false

function setup(editor: any, element: HTMLDivElement, language: string, ideScope: any) {
    if (setupDone) return
    if (language === "python") {
        editor.droplet = new droplet.Editor(element, config.blockPalettePython)
    } else {
        editor.droplet = new droplet.Editor(element, config.blockPaletteJavascript)
    }

    editor.ace = editor.droplet.aceEditor
    setupAceHandlers(editor, ideScope)

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
        editor.ace = null
        editor.droplet = null
        editor.visible = true

        ideScope.$on("visible", (event: any, val: boolean) => editor.visible = !val)
    
        ideScope.onChangeTasks = new Set()
    }, [])

    useEffect(() => {
        if (!editorElement.current) return
        setup(editor, editorElement.current, language, ideScope)
    }, [editorElement.current])

    editor.getValue = () => editor.ace.getValue()

    // TODO: not working with ace editor
    editor.setValue = (...args: any[]) => {
        try {
            if (editor.droplet.currentlyUsingBlocks) {
                editor.droplet.setValue.apply(this, args)
            } else {
                editor.ace.setValue.apply(this, args)
            }
        } catch (e) {
            console.log(e)
        }
    }

    editor.setReadOnly = (value: boolean) => {
        editor.ace.setReadOnly(value)
        editor.droplet.setReadOnly(value)
    }

    editor.setFontSize = function (value: number) {
        editor.ace.setFontSize(value)
        editor.droplet.setFontSize(value)
    }

    editor.undo = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            editor.droplet.undo()
        } else {
            editor.ace.undo(true)
        }
    }

    editor.redo = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            editor.droplet.redo()
        } else {
            editor.ace.redo(true)
        }
    }

    editor.checkUndo = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            return editor.droplet.undoStack.length > 0
        } else {
            var undoManager = editor.ace.getSession().getUndoManager()
            return undoManager.hasUndo()
        }
    }

    editor.checkRedo = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            return editor.droplet.redoStack.length > 0
        } else {
            var undoManager = editor.ace.getSession().getUndoManager()
            return undoManager.hasRedo()
        }
    }

    editor.clearHistory = function () {
        if (editor.droplet.currentlyUsingBlocks) {
            editor.droplet.clearUndoStack()
        } else {
            var undoManager = editor.ace.getSession().getUndoManager()
            undoManager.reset()
            editor.ace.getSession().setUndoManager(undoManager)
        }
    }

    editor.setLanguage = function (currentLanguage: string) {
        if (currentLanguage === "python") {
            editor.droplet.setMode("python", config.blockPalettePython.modeOptions)
            editor.droplet.setPalette(config.blockPalettePython.palette)
        } else if (currentLanguage === "javascript") {
            editor.droplet.setMode("javascript", config.blockPaletteJavascript.modeOptions)
            editor.droplet.setPalette(config.blockPaletteJavascript.palette)
        }
        editor.ace.getSession().setMode("ace/mode/" + currentLanguage)
    }

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
                    borderColor: state.active ? `rgba(${collabColors[index % 6].join()},0.75)` : "#666",
                    backgroundColor: state.active ? `rgba(${collabColors[index % 6].join()},0.5)`: "#666",
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