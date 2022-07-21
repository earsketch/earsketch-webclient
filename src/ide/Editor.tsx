import { useSelector } from "react-redux"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { EditorView, basicSetup } from "codemirror"
import { completeFromList } from "@codemirror/autocomplete"
import * as commands from "@codemirror/commands"
import { Compartment, EditorState, Extension, StateEffect, StateEffectType, StateField } from "@codemirror/state"
import { indentUnit } from "@codemirror/language"
import { python, pythonLanguage } from "@codemirror/lang-python"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript"
import { keymap, ViewUpdate, Decoration, WidgetType } from "@codemirror/view"
import { oneDark } from "@codemirror/theme-one-dark"
import { lintGutter, setDiagnostics } from "@codemirror/lint"

import { APIItem, ESApiDoc } from "../data/api_doc"
import * as appState from "../app/appState"
import * as caiDialogue from "../cai/dialogue"
import * as collaboration from "../app/collaboration"
import * as collabState from "../app/collaborationState"
import * as tabs from "./tabState"
import * as ESUtils from "../esutils"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import type { Script } from "common"

// Support for markers.
const COLLAB_COLORS = [[255, 80, 80], [0, 255, 0], [255, 255, 50], [100, 150, 255], [255, 160, 0], [180, 60, 255]]

function markers(): Extension {
    return [markerTheme, markerState.extension]
}

const markerTheme = EditorView.baseTheme(Object.assign(
    { ".es-markCursor-wrap": { display: "inline-block", width: "0px", height: "1.2em", verticalAlign: "text-bottom" } },
    ...COLLAB_COLORS.map((color, i) => ({
        [`.es-markSelection-${i}`]: { backgroundColor: `rgba(${color},0.3)` },
        [`.es-markCursor-${i}`]: { width: "2px", height: "100%", backgroundColor: `rgba(${color}, 0.9)` },
    }))
))

class CursorWidget extends WidgetType {
    constructor(readonly id: number) { super() }

    eq(other: CursorWidget) { return other.id === this.id }

    toDOM() {
        const wrap = document.createElement("span")
        wrap.setAttribute("aria-hidden", "true")
        wrap.className = "es-markCursor-wrap"
        const inner = document.createElement("div")
        inner.className = `es-markCursor-${this.id}`
        wrap.appendChild(inner)
        return wrap
    }
}

type Markers = { [key: string]: { from: number, to: number } }

const markerState: StateField<Markers> = StateField.define({
    create() { return {} },
    update(value, transaction) {
        const newValue = { ...value }
        for (const effect of transaction.effects) {
            if (effect.is(setMarkerState)) {
                const { id, from, to } = effect.value
                newValue[id] = { from, to }
            } else if (effect.is(clearMarkerState)) {
                delete newValue[effect.value]
            }
        }
        return newValue
    },
    provide: f => EditorView.decorations.from(f, markers => {
        return Decoration.set(Object.values(markers).map(({ from, to }, i) => {
            i %= COLLAB_COLORS.length
            if (from === to) {
                return Decoration.widget({ widget: new CursorWidget(i) }).range(from, to)
            } else {
                return Decoration.mark({ class: `es-markSelection-${i}` }).range(from, to)
            }
        }), true)
    }),
})

const setMarkerState: StateEffectType<{ id: string, from: number, to: number }> = StateEffect.define()
const clearMarkerState: StateEffectType<string> = StateEffect.define()

// Helpers for editor config.
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

// Internal state
let view: EditorView = null as unknown as EditorView
let sessions: { [key: string]: EditorSession } = {}

// External API
export type EditorSession = EditorState

export const callbacks = {
    initEditor: () => {},
    run: () => {},
    save: () => {},
}

export const changeListeners: ((deletion?: boolean) => void)[] = []

const autocompletions = []
for (const entry of Object.values(ESApiDoc)) {
    if (Array.isArray(entry)) {
        for (const variant of entry) {
            autocompletions.push({ label: variant.autocomplete, info: "EarSketch function" })
        }
    } else {
        autocompletions.push({ label: (entry as APIItem).autocomplete, info: "EarSketch function" })
    }
}
const autocomplete = completeFromList(autocompletions)

export function createSession(id: string, language: string, contents: string) {
    return EditorState.create({
        doc: contents,
        extensions: [
            javascriptLanguage.data.of({ autocomplete }),
            pythonLanguage.data.of({ autocomplete }),
            markers(),
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
                if (update.docChanged) onEdit(update)
                if (update.selectionSet) onSelect(update)
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

export function getSelection() {
    const { from, to } = view.state.selection.main
    return { start: from, end: to }
}

export function setMarker(id: string, from: number, to: number) {
    view.dispatch({ effects: setMarkerState.of({ id, from, to }) })
}

export function clearMarker(id: string) {
    view.dispatch({ effects: clearMarkerState.of(id) })
}

// Applies edit operations on the editor content.
export function applyOperation(op: collaboration.EditOperation) {
    if (op.action === "insert") {
        // NOTE: `from` == `to` here because this is purely an insert, not a replacement.
        view.dispatch({ changes: { from: op.start, to: op.start, insert: op.text } })
    } else if (op.action === "remove") {
        view.dispatch({ changes: { from: op.start, to: op.end } })
    } else if (op.action === "mult") {
        op.operations.forEach(applyOperation)
    }
}

export function undo() {
    commands.undo(view)
}

export function redo() {
    commands.redo(view)
}

export function checkUndo() {
    return commands.undoDepth(view.state) > 0
}

export function checkRedo() {
    return commands.redoDepth(view.state) > 0
}

export function pasteCode(code: string) {
    if (view.state.readOnly) {
        shakeImportButton()
    } else {
        const { from, to } = view.state.selection.ranges[0]
        view.dispatch({ changes: { from, to, insert: code } })
        view.focus()
    }
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
    }
}

export function clearErrors() {
    view.dispatch(setDiagnostics(view.state, []))
}

// Callbacks
function onSelect(update: ViewUpdate) {
    if (!collaboration.active || collaboration.isSynching) return
    const { from, to } = update.state.selection.main
    collaboration.select({ start: from, end: to })
}

function onEdit(update: ViewUpdate) {
    changeListeners.forEach(f => f(update.transactions.some(t => t.isUserEvent("delete"))))

    // If updating the source in Redux on every update turns out to be a bottleneck, we can buffer updates or move state out of Redux.
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
    // NOTE: `lockEditor` is kind of a hack to prevent collaboration-caused edits from triggering further updates.
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

let shakeImportButton: () => void

export const Editor = ({ importScript }: { importScript: (s: Script) => void }) => {
    const { t } = useTranslation()
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const theme = useSelector(appState.selectColorTheme)
    const fontSize = useSelector(appState.selectFontSize)
    const editorElement = useRef<HTMLDivElement>(null)
    const collaborators = useSelector(collabState.selectCollaborators)
    const [shaking, setShaking] = useState(false)

    useEffect(() => {
        if (!editorElement.current) return

        const startShaking = () => {
            setShaking(false)
            setTimeout(() => setShaking(true), 0)
        }

        if (!view) {
            view = new EditorView({
                doc: "Loading...",
                extensions: [basicSetup, EditorState.readOnly.of(true), themeConfig.of(getTheme()), FontSizeThemeExtension],
                parent: editorElement.current,
            })

            shakeImportButton = startShaking
            callbacks.initEditor()
        }

        // Listen for events to visually remind the user when the script is readonly.
        editorElement.current.onclick = () => setShaking(true)
        editorElement.current.oncut = editorElement.current.onpaste = startShaking
        editorElement.current.onkeydown = e => {
            if (e.key.length === 1 || ["Enter", "Backspace", "Delete", "Tab"].includes(e.key)) {
                startShaking()
            }
        }
    }, [editorElement.current])

    useEffect(() => setShaking(false), [activeScript])

    useEffect(() => view.dispatch({ effects: themeConfig.reconfigure(getTheme()) }), [theme])

    return <div className="flex grow h-full max-h-full overflow-y-hidden">
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
                    borderColor: active ? `rgba(${COLLAB_COLORS[index % COLLAB_COLORS.length].join()},0.75)` : "#666",
                    backgroundColor: active ? `rgba(${COLLAB_COLORS[index % COLLAB_COLORS.length].join()},0.5)` : "#666",
                }}>
                    {username[0].toUpperCase()}
                </div>)}
        </div>}
    </div>
}
