import { Ace } from "ace-builds"
import { hot } from "react-hot-loader/root"
import { Provider, useSelector } from "react-redux"
import React, { useEffect, useRef } from "react"

import * as appState from "../app/appState"
import * as cai from "../cai/caiState"
import * as collaboration from "../app/collaboration"
import * as config from "./editorConfig"
import * as helpers from "../helpers"
import * as tabs from "./tabState"
import * as userProject from "../app/userProject"
import store from "../reducers"

const COLLAB_COLORS = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

// Millisecond timer for recommendation refresh update
let recommendationTimer = 0

// TODO: Consolidate with editorState.

// Minor hack. None of these functions should get called before the component has mounted and `ace` is set.
export let ace: Ace.Editor = null as unknown as Ace.Editor
export let droplet: any = null
export let callbacks = { onChange: null as (() => void) | null }

export function getValue() {
    return ace.getValue()
}

export function setReadOnly(value: boolean) {
    ace.setReadOnly(value)
    droplet.setReadOnly(value)
}

export function setFontSize(value: string) {
    ace.setFontSize(value)
    droplet.setFontSize(value)
}

export function undo() {
    if (droplet.currentlyUsingBlocks) {
        droplet.undo()
    } else {
        ace.undo()
    }
}

export function redo() {
    if (droplet.currentlyUsingBlocks) {
        droplet.redo()
    } else {
        ace.redo()
    }
}

export function checkUndo() {
    if (droplet.currentlyUsingBlocks) {
        return droplet.undoStack.length > 0
    } else {
        const undoManager = ace.getSession().getUndoManager()
        return undoManager.canUndo()
    }
}

export function checkRedo() {
    if (droplet.currentlyUsingBlocks) {
        return droplet.redoStack.length > 0
    } else {
        const undoManager = ace.getSession().getUndoManager()
        return undoManager.canRedo()
    }
}

export function clearHistory() {
    if (droplet.currentlyUsingBlocks) {
        droplet.clearUndoStack()
    } else {
        const undoManager = ace.getSession().getUndoManager()
        undoManager.reset()
        ace.getSession().setUndoManager(undoManager)
    }
}

export function setLanguage(currentLanguage: string) {
    if (currentLanguage === "python") {
        droplet.setMode("python", config.blockPalettePython.modeOptions)
        droplet.setPalette(config.blockPalettePython.palette)
    } else if (currentLanguage === "javascript") {
        droplet.setMode("javascript", config.blockPaletteJavascript.modeOptions)
        droplet.setPalette(config.blockPaletteJavascript.palette)
    }
    ace.getSession().setMode("ace/mode/" + currentLanguage)
}

function setupAceHandlers(ace: Ace.Editor) {
    ace.on("changeSession", () => callbacks.onChange?.())

    // TODO: add listener if collaboration userStatus is owner, remove otherwise
    // TODO: also make sure switching / closing tab is handled
    ace.on("change", (event) => {
        callbacks.onChange?.()

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

function setup(element: HTMLDivElement, language: string, ideScope: any) {
    if (setupDone) return

    if (language === "python") {
        droplet = new window.droplet.Editor(element, config.blockPalettePython)
    } else {
        droplet = new window.droplet.Editor(element, config.blockPaletteJavascript)
    }

    ace = droplet.aceEditor
    setupAceHandlers(ace)
    ideScope.initEditor()
    ideScope.collaboration = collaboration
    setupDone = true
}

const Editor = () => {
    const language = useSelector(appState.selectScriptLanguage)
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const ideScope = helpers.getNgController("ideController").scope()
    const editorElement = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!editorElement.current) return
        setup(editorElement.current, language, ideScope)
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
            <div key={name} className="collaborator-badge prevent-selection" style={{
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

export { HotEditor as Editor }