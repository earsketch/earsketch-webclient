import { createEditSession, Ace, Range } from "ace-builds"
import i18n from "i18next"
import { useDispatch, useSelector } from "react-redux"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { API_FUNCTIONS } from "../api/api"
import * as appState from "../app/appState"
import * as caiDialogue from "../cai/dialogue"
import * as collaboration from "../app/collaboration"
import * as config from "./editorConfig"
import * as editor from "./ideState"
import * as scripts from "../browser/scriptsState"
import * as collabState from "../app/collaborationState"
import * as tabs from "./tabState"
import * as userConsole from "./console"
import * as ESUtils from "../esutils"
import store from "../reducers"
import type { Script } from "common"

import { EditorView, basicSetup } from "codemirror"
import { EditorState, Extension } from "@codemirror/state"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"

export let view: EditorView = null as unknown as EditorView

const FontSizeTheme = EditorView.theme({
    "&": {
        fontSize: "1em",
        height: "100%",
    },
})

const FontSizeThemeExtension: Extension = [FontSizeTheme]

// TODO: Maybe break this out into separate module.
// (Not `ideState`, because we don't want our Redux slices to have external dependencies.)
export type EditorSession = EditorState

export function createEditorSession(language: string, contents: string) {
    // if (language === "javascript") {
    //     // Declare globals for JS linter so they don't generate "undefined variable" warnings.
    //     (session as any).$worker.call("changeOptions", [{
    //         globals: ESUtils.fromEntries(Object.keys(API_FUNCTIONS).map(name => [name, false])),
    //     }])
    // }

    // session.selection.on("changeCursor", () => {
    //     if (collaboration.active && !collaboration.isSynching) {
    //         setTimeout(() => collaboration.storeSelection(session.selection.getRange()))
    //     }
    // })

    return EditorState.create({
        doc: contents,
        extensions: [
            basicSetup,
            language === "python" ? python() : javascript(),
            EditorView.updateListener.of(v => v.docChanged && onUpdate()),
            FontSizeThemeExtension,
        ],
    })
}

export function setActiveSession(session: EditorSession) {
    view.setState(session)
}

export function getContents(session?: EditorSession) {
    return (session ?? view.state).doc.toString()
}

function onUpdate() {
    // TODO: This is a lot of Redux stuff to do on every keystroke. We should make sure this won't cause performance problems.
    //       If it becomes necessary, we could buffer some of these updates, or move some state out of Redux into "mutable" state.
    const activeTabID = tabs.selectActiveTabID(store.getState())
    // const editSession = ace.getSession()
    // tabs.setEditorSession(activeTabID, editSession)

    const script = activeTabID === null ? null : scripts.selectAllScripts(store.getState())[activeTabID]
    if (script) {
        store.dispatch(scripts.setScriptSource({ id: activeTabID, source: view.state.doc.toString() }))
        if (!script.collaborative) {
            store.dispatch(tabs.addModifiedScript(activeTabID))
        }
    }
}

const CodeMirror = () => {
    const fontSize = useSelector(appState.selectFontSize)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current && !view) {
            view = new EditorView({
                extensions: [basicSetup, javascript(), EditorView.updateListener.of(v => v.docChanged && onUpdate()), FontSizeThemeExtension],
                parent: ref.current,
            })
        }
    }, [ref.current])

    return <div ref={ref} id="editor" className="code-container" style={{ fontSize }}></div>
}

const COLLAB_COLORS = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

const ACE_THEMES = {
    light: "ace/theme/chrome",
    dark: "ace/theme/monokai",
}

// TODO: Consolidate with editorState.

// Minor hack. None of these functions should get called before the component has mounted and `ace` is set.
export let ace: Ace.Editor = null as unknown as Ace.Editor
export let droplet: any = null
export const callbacks = {
    initEditor: () => {},
}
export const changeListeners: ((event: Ace.Delta) => void)[] = []

export function setReadOnly(value: boolean) {
    // ace.setReadOnly(value)
    // droplet.setReadOnly(value)
}

export function setFontSize(value: number) {
    ace?.setFontSize(value + "px")
    droplet?.setFontSize(value)
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

export function setLanguage(language: string) {
    if (language === "python") {
        droplet?.setMode("python", config.blockPalettePython.modeOptions)
        droplet?.setPalette(config.blockPalettePython.palette)
    } else if (language === "javascript") {
        droplet?.setMode("javascript", config.blockPaletteJavascript.modeOptions)
        droplet?.setPalette(config.blockPaletteJavascript.palette)
    }
    ace?.getSession().setMode("ace/mode/" + language)
}

export function pasteCode(code: string) {
    if (/* ace.getReadOnly() */ false) {
        shakeImportButton()
        return
    }
    if (/* droplet.currentlyUsingBlocks */ false) {
        if (!droplet.cursorAtSocket()) {
            // This is a hack to enter "insert mode" first, so that the `setFocusedText` call actually does something.
            // Press Enter once to start a new free-form block for text input.
            const ENTER_KEY = 13
            droplet.dropletElement.dispatchEvent(new KeyboardEvent("keydown", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
            droplet.dropletElement.dispatchEvent(new KeyboardEvent("keyup", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
            // Fill the block with the pasted text.
            droplet.setFocusedText(code)
            // Press Enter again to finalize the block.
            droplet.dropletElement.dispatchEvent(new KeyboardEvent("keydown", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
            droplet.dropletElement.dispatchEvent(new KeyboardEvent("keyup", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
        } else {
            droplet.setFocusedText(code)
        }
    } else {
        const { from, to } = view.state.selection.ranges[0]
        view.dispatch({ changes: { from, to, insert: code } })
        // ace.insert(code)
        // ace.focus()
    }
}

let lineNumber: number | null = null
let marker: number | null = null

export function highlightError(err: any) {
    const language = ESUtils.parseLanguage(tabs.selectActiveTabScript(store.getState()).name)
    let range

    const line = language === "python" ? err.traceback?.[0]?.lineno : err.lineNumber
    if (line !== undefined) {
        lineNumber = line - 1
        if (droplet.currentlyUsingBlocks) {
            droplet.markLine(lineNumber, { color: "red" })
        }
        range = new Range(lineNumber, 0, lineNumber, 2000)
        marker = ace.getSession().addMarker(range, "error-highlight", "fullLine")
    }
}

export function clearErrors() {
    // if (droplet.currentlyUsingBlocks) {
    //     if (lineNumber !== null) {
    //         droplet.unmarkLine(lineNumber)
    //     }
    // }
    // if (marker !== null) {
    //     ace.getSession().removeMarker(marker)
    // }
}

function setupAceHandlers(ace: Ace.Editor) {
    // ace.on("changeSession", () => changeListeners.forEach(f => f({} as Ace.Delta)))

    // // TODO: add listener if collaboration userStatus is owner, remove otherwise
    // // TODO: also make sure switching / closing tab is handled
    // ace.on("change", (event) => {
    //     changeListeners.forEach(f => f(event))
    //     // TODO: Move into a change listener, and move other collaboration stuff into callbacks.
    //     if (collaboration.active && !collaboration.lockEditor) {
    //         // convert from positionObjects & lines to index & text
    //         const session = ace.getSession()
    //         const document = session.getDocument()
    //         const start = document.positionToIndex(event.start, 0)
    //         const text = event.lines.length > 1 ? event.lines.join("\n") : event.lines[0]

    //         // buggy!
    //         // const end = document.positionToIndex(event.end, 0)
    //         const end = start + text.length

    //         collaboration.editScript({
    //             action: event.action,
    //             start: start,
    //             end: end,
    //             text: text,
    //             len: end - start,
    //         })

    //         if (FLAGS.SHOW_CHAT) {
    //             caiDialogue.addToNodeHistory(["editor " + event.action, text])
    //         }
    //     }

    //     // TODO: This is a lot of Redux stuff to do on every keystroke. We should make sure this won't cause performance problems.
    //     //       If it becomes necessary, we could buffer some of these updates, or move some state out of Redux into "mutable" state.
    //     const activeTabID = tabs.selectActiveTabID(store.getState())
    //     const editSession = ace.getSession()
    //     tabs.setEditorSession(activeTabID, editSession)

    //     const script = activeTabID === null ? null : scripts.selectAllScripts(store.getState())[activeTabID]
    //     if (script) {
    //         store.dispatch(scripts.setScriptSource({ id: activeTabID, source: editSession.getValue() }))
    //         if (!script.collaborative) {
    //             store.dispatch(tabs.addModifiedScript(activeTabID))
    //         }
    //     }
    // })

    // ace.on("focus", () => {
    //     if (collaboration.active) {
    //         collaboration.checkSessionStatus()
    //     }
    // })
}

let setupDone = false
let shakeImportButton: () => void

function setup(element: HTMLDivElement, language: string, theme: "light" | "dark", fontSize: number, shakeCallback: () => void) {
    if (setupDone) return

    if (language === "python") {
        droplet = new (window as any).droplet.Editor(element, config.blockPalettePython)
    } else {
        droplet = new (window as any).droplet.Editor(element, config.blockPaletteJavascript)
    }

    ace = droplet.aceEditor
    setupAceHandlers(ace)

    ace.setOptions({
        mode: "ace/mode/" + language,
        theme: ACE_THEMES[theme],
        fontSize,
        enableBasicAutocompletion: true,
        enableSnippets: false,
        enableLiveAutocompletion: false,
        showPrintMargin: false,
        wrap: false,
    })
    shakeImportButton = shakeCallback
    callbacks.initEditor()
    setupDone = true
}

export const Editor = ({ importScript }: { importScript: (s: Script) => void }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const theme = useSelector(appState.selectColorTheme)
    const fontSize = useSelector(appState.selectFontSize)
    const blocksMode = useSelector(editor.selectBlocksMode)
    const editorElement = useRef<HTMLDivElement>(null)
    const language = ESUtils.parseLanguage(activeScript?.name ?? ".py")
    const scriptID = useSelector(tabs.selectActiveTabID)
    const modified = useSelector(tabs.selectModifiedScripts).includes(scriptID!)
    const collaborators = useSelector(collabState.selectCollaborators)
    const [shaking, setShaking] = useState(false)

    useEffect(() => {
        if (!editorElement.current) return
        const startShaking = () => {
            setShaking(false)
            setTimeout(() => setShaking(true), 0)
        }
        setup(editorElement.current, language, theme, fontSize, startShaking)
        // Listen for events to visually remind the user when the script is readonly.
        editorElement.current.onclick = () => setShaking(true)
        editorElement.current.oncut = editorElement.current.onpaste = startShaking
        editorElement.current.onkeydown = e => {
            if (e.key.length === 1 || ["Enter", "Backspace", "Delete", "Tab"].includes(e.key)) {
                startShaking()
            }
        }
        let editorResizeAnimationFrame: number | undefined
        const observer = new ResizeObserver(() => {
            editorResizeAnimationFrame = window.requestAnimationFrame(() => {
                droplet.resize()
            })
        })
        observer.observe(editorElement.current)

        return () => {
            editorElement.current && observer.unobserve(editorElement.current)
            // clean up an oustanding animation frame request if it exists
            if (editorResizeAnimationFrame) window.cancelAnimationFrame(editorResizeAnimationFrame)
        }
    }, [editorElement.current])

    useEffect(() => setShaking(false), [activeScript])

    useEffect(() => ace?.setTheme(ACE_THEMES[theme]), [theme])

    useEffect(() => {
        setFontSize(fontSize)
        // Need to refresh the droplet palette section, otherwise the block layout becomes weird.
        setLanguage(language)
    }, [fontSize])

    useEffect(() => {
        if (!editorElement.current) return
        if (blocksMode && !droplet.currentlyUsingBlocks) {
            const emptyUndo = droplet.undoStack.length === 0
            setLanguage(language)
            if (droplet.toggleBlocks().success) {
                // On initial switch into blocks mode, droplet starts with an undo action on the stack that clears the entire script.
                // To deal with this idiosyncrasy, we clear the undo stack if it was already clear before switching into blocks mode.
                if (emptyUndo) {
                    droplet.clearUndoStack()
                }
                userConsole.clear()
            } else {
                userConsole.warn(i18n.t("messages:idecontroller.blocksyntaxerror"))
                dispatch(editor.setBlocksMode(false))
            }
        } else if (!blocksMode && droplet.currentlyUsingBlocks) {
            // NOTE: toggleBlocks() has a nasty habit of overwriting Ace state.
            // We save and restore the editor contents here in case we are exiting blocks mode due to switching to a script with syntax errors.
            const value = ace.getValue()
            const range = ace.selection.getRange()
            droplet.toggleBlocks()
            ace.setValue(value)
            ace.selection.setRange(range)
            if (!modified) {
                // Correct for setValue from misleadingly marking the script as modified.
                dispatch(tabs.removeModifiedScript(scriptID))
            }
        }
    }, [blocksMode])

    useEffect(() => {
        // NOTE: Changing Droplet's language can overwrite Ace state and drop out of blocks mode, so we take precautions here.
        // User switched tabs. Try to maintain blocks mode in the new tab. Exit blocks mode if the new tab has syntax errors.
        if (blocksMode) {
            const value = ace.getValue()
            const range = ace.selection.getRange()
            setLanguage(language)
            ace.setValue(value)
            ace.selection.setRange(range)
            if (!modified) {
                // Correct for setValue from misleadingly marking the script as modified.
                dispatch(tabs.removeModifiedScript(scriptID))
            }
            if (!droplet.copyAceEditor().success) {
                userConsole.warn(i18n.t("messages:idecontroller.blocksyntaxerror"))
                dispatch(editor.setBlocksMode(false))
            } else if (!droplet.currentlyUsingBlocks) {
                droplet.toggleBlocks()
            }
            // Don't allow droplet to share undo stack between tabs.
            droplet.clearUndoStack()
        } else {
            setLanguage(language)
        }
    }, [scriptID])

    return <div className="flex grow h-full max-h-full overflow-y-hidden" style={{ WebkitTransform: "translate3d(0,0,0)" }}>
        <CodeMirror />
        {/* <div ref={editorElement} id="editor" className="code-container">
            // import button
            {activeScript?.readonly && !embedMode &&
            <div className={"absolute top-4 right-0 " + (shaking ? "animate-shake" : "")} onClick={() => importScript(activeScript)}>
                <div className="btn-action btn-floating">
                    <i className="icon icon-import"></i><span className="text-blue-800">{t("importToEdit").toLocaleUpperCase()}</span>
                </div>
            </div>}
        </div>

        {activeScript?.collaborative && <div id="collab-badges-container">
            {Object.entries(collaborators).map(([username, { active }], index) =>
                <div key={username} className="collaborator-badge prevent-selection" title={username} style={{
                    borderColor: active ? `rgba(${COLLAB_COLORS[index % 6].join()},0.75)` : "#666",
                    backgroundColor: active ? `rgba(${COLLAB_COLORS[index % 6].join()},0.5)` : "#666",
                }}>
                    {username[0].toUpperCase()}
                </div>)}
        </div>} */}
    </div>
}
