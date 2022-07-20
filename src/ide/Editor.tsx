import { useSelector } from "react-redux"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { EditorView, basicSetup } from "codemirror"
import * as commands from "@codemirror/commands"
import { Compartment, EditorState, Extension } from "@codemirror/state"
import { indentUnit } from "@codemirror/language"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { keymap, ViewUpdate } from "@codemirror/view"
import { oneDark } from "@codemirror/theme-one-dark"
import { lintGutter, setDiagnostics } from "@codemirror/lint"

// import { API_FUNCTIONS } from "../api/api"
import * as appState from "../app/appState"
import * as caiDialogue from "../cai/dialogue"
import * as collaboration from "../app/collaboration"
import * as collabState from "../app/collaborationState"
import * as tabs from "./tabState"
import * as ESUtils from "../esutils"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import type { Script } from "common"

export let view: EditorView = null as unknown as EditorView

const FontSizeTheme = EditorView.theme({
    "&": {
        fontSize: "1em",
        height: "100%",
    },
})

const FontSizeThemeExtension: Extension = [FontSizeTheme]

const readOnly = new Compartment()
const themeConfig = new Compartment()

function getTheme() {
    const theme = appState.selectColorTheme(store.getState())
    return theme === "light" ? [] : oneDark
}

// TODO: Maybe break this out into separate module.
// (Not `ideState`, because we don't want our Redux slices to have external dependencies.)
export type EditorSession = EditorState

let sessions: { [key: string]: EditorSession } = {}

export function createSession(id: string, language: string, contents: string) {
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
            lintGutter(),
            indentUnit.of("    "),
            readOnly.of(EditorState.readOnly.of(false)),
            language === "python" ? python() : javascript(),
            keymap.of([
                // TODO: Mention the focus escape hatch (Escape, then Tab) somewhere.
                // See https://codemirror.net/examples/tab/ for more information.
                commands.indentWithTab,
                {
                    key: "Mod-s",
                    run: () => { callbacks.save(); return true },
                },
                {
                    key: "Mod-Enter",
                    run: () => { callbacks.run(); return true },
                },
            ]),
            EditorView.updateListener.of(update => {
                sessions[id] = update.state
                if (update.docChanged) onUpdate(update)
            }),
            themeConfig.of(getTheme()),
            FontSizeThemeExtension,
            basicSetup,
        ],
    })
}

export function getSession(id: string) {
    return sessions[id]
}

export function deleteSession(id: string) {
    delete sessions[id]
}

export function deleteAllSessions() {
    sessions = {}
}

export function setActiveSession(session: EditorSession) {
    if (view.state !== session) {
        changeListeners.forEach(f => f())
        view.setState(session)
        view.dispatch({ effects: themeConfig.reconfigure(getTheme()) })
    }
}

export function getContents(session?: EditorSession) {
    return (session ?? view.state).doc.toString()
}

export function setContents(contents: string, id?: string) {
    if (id && sessions[id] !== view.state) {
        sessions[id] = sessions[id].update({ changes: { from: 0, to: sessions[id].doc.length, insert: contents } }).state
    } else {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: contents } })
    }
}

export function setReadOnly(value: boolean) {
    view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(value)) })
}

export function focus() {
    view.focus()
}

function onUpdate(update: ViewUpdate) {
    changeListeners.forEach(f => f(update.transactions.some(t => t.isUserEvent("delete"))))

    // TODO: This is a lot of Redux stuff to do on every keystroke. We should make sure this won't cause performance problems.
    //       If it becomes necessary, we could buffer some of these updates, or move some state out of Redux into "mutable" state.
    const activeTabID = tabs.selectActiveTabID(store.getState())
    const script = activeTabID === null ? null : scripts.selectAllScripts(store.getState())[activeTabID]
    if (script) {
        store.dispatch(scripts.setScriptSource({ id: activeTabID, source: view.state.doc.toString() }))
        if (!script.collaborative) {
            store.dispatch(tabs.addModifiedScript(activeTabID))
        }
    }

    const operations: collaboration.EditOperation[] = []
    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Adapt CodeMirror's change structure into ours (which is similar to Ace's).
        // TODO: In the future, it might be nice to adopt CodeMirror's format, which has fewer cases to deal with.
        // (As demonstrated here; each CodeMirror change may create up to two Ace-style changes.)
        if (fromA < toA) {
            operations.push({
                action: "remove",
                start: fromA,
                end: toA,
                len: toA - fromA,
            })
        }
        if (fromB < toB) {
            operations.push({
                action: "insert",
                start: fromB,
                end: toB,
                len: inserted.length,
                text: inserted.toString(),
            })
        }
    })

    // TODO: Move into a change listener, and move other collaboration stuff into callbacks.
    if (collaboration.active && !collaboration.lockEditor) {
        const operation = operations.length === 1 ? operations[0] : { action: "mult", operations } as const
        collaboration.editScript(operation)

        if (FLAGS.SHOW_CHAT) {
            for (const operation of operations) {
                caiDialogue.addToNodeHistory([
                    "editor " + operation.action,
                    operation.action === "insert" ? operation.text : undefined,
                ])
            }
        }
    }
}

const COLLAB_COLORS = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

// TODO: Consolidate with editorState.

// Minor hack. None of these functions should get called before the component has mounted and `ace` is set.
// export let ace: Ace.Editor = null as unknown as Ace.Editor
// export let droplet: any = null
export const callbacks = {
    initEditor: () => {},
    run: () => {},
    save: () => {},
}
export const changeListeners: ((deletion?: boolean) => void)[] = []

export function setBlocksFontSize(_: number) {
    // droplet?.setFontSize(value)
}

export function undo() {
    // if (droplet.currentlyUsingBlocks) {
    //     droplet.undo()
    // } else {
    commands.undo(view)
}

export function redo() {
    // if (droplet.currentlyUsingBlocks) {
    //     droplet.redo()
    // } else {
    commands.redo(view)
}

export function checkUndo() {
    // if (droplet.currentlyUsingBlocks) {
    //     return droplet.undoStack.length > 0
    // } else {
    return commands.undoDepth(view.state) > 0
}

export function checkRedo() {
    // if (droplet.currentlyUsingBlocks) {
    //     return droplet.redoStack.length > 0
    // } else {
    return commands.redoDepth(view.state) > 0
}

function setBlocksLanguage(_: string) {
    // if (language === "python") {
    //     droplet?.setMode("python", config.blockPalettePython.modeOptions)
    //     droplet?.setPalette(config.blockPalettePython.palette)
    // } else if (language === "javascript") {
    //     droplet?.setMode("javascript", config.blockPaletteJavascript.modeOptions)
    //     droplet?.setPalette(config.blockPaletteJavascript.palette)
    // }
}

export function pasteCode(code: string) {
    if (view.state.readOnly) {
        shakeImportButton()
        return
    }
    // if (droplet.currentlyUsingBlocks) {
    //     if (!droplet.cursorAtSocket()) {
    //         // This is a hack to enter "insert mode" first, so that the `setFocusedText` call actually does something.
    //         // Press Enter once to start a new free-form block for text input.
    //         const ENTER_KEY = 13
    //         droplet.dropletElement.dispatchEvent(new KeyboardEvent("keydown", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
    //         droplet.dropletElement.dispatchEvent(new KeyboardEvent("keyup", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
    //         // Fill the block with the pasted text.
    //         droplet.setFocusedText(code)
    //         // Press Enter again to finalize the block.
    //         droplet.dropletElement.dispatchEvent(new KeyboardEvent("keydown", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
    //         droplet.dropletElement.dispatchEvent(new KeyboardEvent("keyup", { keyCode: ENTER_KEY, which: ENTER_KEY } as any))
    //     } else {
    //         droplet.setFocusedText(code)
    //     }
    // } else {
    const { from, to } = view.state.selection.ranges[0]
    view.dispatch({ changes: { from, to, insert: code } })
    view.focus()
}

export function highlightError(err: any) {
    const language = ESUtils.parseLanguage(tabs.selectActiveTabScript(store.getState()).name)
    const lineNumber = language === "python" ? err.traceback?.[0]?.lineno : err.lineNumber
    if (lineNumber !== undefined) {
        const line = view.state.doc.line(lineNumber)
        view.dispatch(setDiagnostics(view.state, [{
            from: line.from,
            to: line.to,
            severity: "error",
            message: err.toString(),
        }]))
        // if (droplet.currentlyUsingBlocks) {
        //     droplet.markLine(lineNumber, { color: "red" })
        // }
    }
}

export function clearErrors() {
    // if (droplet.currentlyUsingBlocks) {
    //     if (lineNumber !== null) {
    //         droplet.unmarkLine(lineNumber)
    //     }
    // }
    view.dispatch(setDiagnostics(view.state, []))
}

let setupDone = false
let shakeImportButton: () => void

function setup(element: HTMLDivElement, language: string, theme: "light" | "dark", fontSize: number, shakeCallback: () => void) {
    if (setupDone) return

    // if (language === "python") {
    //     droplet = new (window as any).droplet.Editor(element, config.blockPalettePython)
    // } else {
    //     droplet = new (window as any).droplet.Editor(element, config.blockPaletteJavascript)
    // }

    // ace = droplet.aceEditor

    // ace.on("focus", () => {
    //     if (collaboration.active) {
    //         collaboration.checkSessionStatus()
    //     }
    // })

    shakeImportButton = shakeCallback
    callbacks.initEditor()
    setupDone = true
}

export const Editor = ({ importScript }: { importScript: (s: Script) => void }) => {
    const { t } = useTranslation()
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const theme = useSelector(appState.selectColorTheme)
    const fontSize = useSelector(appState.selectFontSize)
    const editorElement = useRef<HTMLDivElement>(null)
    const language = ESUtils.parseLanguage(activeScript?.name ?? ".py")
    const collaborators = useSelector(collabState.selectCollaborators)
    const [shaking, setShaking] = useState(false)

    useEffect(() => {
        if (!editorElement.current) return

        if (!view) {
            view = new EditorView({
                doc: "Loading...",
                extensions: [basicSetup, EditorState.readOnly.of(true), themeConfig.of(getTheme()), FontSizeThemeExtension],
                parent: editorElement.current,
            })
        }

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
        // let editorResizeAnimationFrame: number | undefined
        // const observer = new ResizeObserver(() => {
        //     editorResizeAnimationFrame = window.requestAnimationFrame(() => {
        //         droplet.resize()
        //     })
        // })
        // observer.observe(editorElement.current)

        // return () => {
        //     editorElement.current && observer.unobserve(editorElement.current)
        //     // clean up an oustanding animation frame request if it exists
        //     if (editorResizeAnimationFrame) window.cancelAnimationFrame(editorResizeAnimationFrame)
        // }
    }, [editorElement.current])

    useEffect(() => setShaking(false), [activeScript])

    useEffect(() => view.dispatch({ effects: themeConfig.reconfigure(getTheme()) }), [theme])

    useEffect(() => {
        // Need to refresh the droplet palette section, otherwise the block layout becomes weird.
        setBlocksLanguage(language)
    }, [fontSize])

    // useEffect(() => {
    //     if (!editorElement.current) return
    //     if (blocksMode && !droplet.currentlyUsingBlocks) {
    //         const emptyUndo = droplet.undoStack.length === 0
    //         setBlocksLanguage(language)
    //         if (droplet.toggleBlocks().success) {
    //             // On initial switch into blocks mode, droplet starts with an undo action on the stack that clears the entire script.
    //             // To deal with this idiosyncrasy, we clear the undo stack if it was already clear before switching into blocks mode.
    //             if (emptyUndo) {
    //                 droplet.clearUndoStack()
    //             }
    //             userConsole.clear()
    //         } else {
    //             userConsole.warn(i18n.t("messages:idecontroller.blocksyntaxerror"))
    //             dispatch(editor.setBlocksMode(false))
    //         }
    //     } else if (!blocksMode && droplet.currentlyUsingBlocks) {
    //         // NOTE: toggleBlocks() has a nasty habit of overwriting Ace state.
    //         // We save and restore the editor contents here in case we are exiting blocks mode due to switching to a script with syntax errors.
    //         const value = ace.getValue()
    //         const range = ace.selection.getRange()
    //         droplet.toggleBlocks()
    //         ace.setValue(value)
    //         ace.selection.setRange(range)
    //         if (!modified) {
    //             // Correct for setValue from misleadingly marking the script as modified.
    //             dispatch(tabs.removeModifiedScript(scriptID))
    //         }
    //     }
    // }, [blocksMode])

    // useEffect(() => {
    //     // NOTE: Changing Droplet's language can overwrite Ace state and drop out of blocks mode, so we take precautions here.
    //     // User switched tabs. Try to maintain blocks mode in the new tab. Exit blocks mode if the new tab has syntax errors.
    //     if (blocksMode) {
    //         const value = ace.getValue()
    //         const range = ace.selection.getRange()
    //         setBlocksLanguage(language)
    //         ace.setValue(value)
    //         ace.selection.setRange(range)
    //         if (!modified) {
    //             // Correct for setValue from misleadingly marking the script as modified.
    //             dispatch(tabs.removeModifiedScript(scriptID))
    //         }
    //         if (!droplet.copyAceEditor().success) {
    //             userConsole.warn(i18n.t("messages:idecontroller.blocksyntaxerror"))
    //             dispatch(editor.setBlocksMode(false))
    //         } else if (!droplet.currentlyUsingBlocks) {
    //             droplet.toggleBlocks()
    //         }
    //         // Don't allow droplet to share undo stack between tabs.
    //         droplet.clearUndoStack()
    //     } else {
    //         setBlocksLanguage(language)
    //     }
    // }, [scriptID])

    return <div className="flex grow h-full max-h-full overflow-y-hidden" style={{ WebkitTransform: "translate3d(0,0,0)" }}>
        <div ref={editorElement} id="editor" className="code-container" style={{ fontSize }}>
            {/* import button */}
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
        </div>}
    </div>
}
