import * as ace from "ace-builds"
import { useDispatch, useSelector } from "react-redux"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { EditorView, basicSetup } from "codemirror"
import { CompletionSource, completeFromList } from "@codemirror/autocomplete"
import * as commands from "@codemirror/commands"
import { Compartment, EditorState, Extension, StateEffect, StateEffectType, StateField } from "@codemirror/state"
import { indentUnit } from "@codemirror/language"
import { python, pythonLanguage } from "@codemirror/lang-python"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript"
import { keymap, ViewUpdate, Decoration, WidgetType } from "@codemirror/view"
import { oneDark } from "@codemirror/theme-one-dark"
import { lintGutter, setDiagnostics } from "@codemirror/lint"

import { ESApiDoc } from "../data/api_doc"
import * as appState from "../app/appState"
import * as audio from "../app/audiolibrary"
import { modes as blocksModes } from "./blocksConfig"
import * as caiDialogue from "../cai/dialogue"
import * as collaboration from "../app/collaboration"
import * as collabState from "../app/collaborationState"
import * as ESUtils from "../esutils"
import { selectBlocksMode, setBlocksMode } from "./ideState"
import * as tabs from "./tabState"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import type { Script } from "common"

(window as any).ace = ace // for droplet

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

// Autocomplete
const autocompletions = []
for (const entries of Object.values(ESApiDoc)) {
    for (const entry of entries) {
        autocompletions.push({ label: entry.autocomplete, info: "EarSketch function" })
    }
}

autocompletions.push(...audio.EFFECT_NAMES.map(label => ({ label, info: "EarSketch effect constant" })))
autocompletions.push(...audio.ANALYSIS_NAMES.map(label => ({ label, info: "EarSketch analysis constant" })))

const basicCompletions = completeFromList(autocompletions)

let moreCompletions: CompletionSource | undefined

(async () => {
    // Set up more completions (standard sounds & folders, which are fetched over network) asynchronously.
    const [sounds, folders] = await Promise.all([audio.getStandardSounds(), audio.getStandardFolders()])
    const soundNames = sounds.map(sound => sound.name)
    const merged = new Set(soundNames.concat(folders))
    const sorted = Array.from(merged).sort().reverse()
    autocompletions.push(...sorted.map(label => ({ label, info: "EarSketch sound constant" })))
    moreCompletions = completeFromList(autocompletions)
})()

const autocomplete: CompletionSource = (context) => (moreCompletions ?? basicCompletions)(context)

// Internal state
let view: EditorView = null as unknown as EditorView
let sessions: { [key: string]: EditorSession } = {}
const keyBindings: { key: string, run: () => boolean }[] = []
let resolveReady: () => void
let droplet: any

// External API
export type EditorSession = EditorState

export const ready = new Promise<void>(resolve => { resolveReady = resolve })

export const changeListeners: ((deletion?: boolean) => void)[] = []

export function bindKey(key: string, fn: () => void) {
    keyBindings.push({
        key,
        run: () => { fn(); return true },
    })
}

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
                // NOTE: Escape hatch (see https://codemirror.net/examples/tab/) is documented in keyboard shortcuts.
                commands.indentWithTab,
                ...keyBindings,
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
        view.setState(session)
        view.dispatch({ effects: themeConfig.reconfigure(getTheme()) })
        changeListeners.forEach(f => f())
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
        updateBlocks()
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
    updateBlocks()
}

export function undo() {
    commands.undo(view)
    // We ignore Droplet's undo/redo, which doesn't support multiple sessions.
    // Instead we just use CodeMirror's and then sync Droplet up.
    // Note that if an undo/redo leaves unparsable editor contents, we will exit blocks mode out of necessity,
    // but this can only occur if the user did some editing outside of blocks mode in the first place.
    updateBlocks()
}

export function redo() {
    commands.redo(view)
    updateBlocks()
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
        store.dispatch(scripts.setScriptSource({ id: activeTabID, source: getContents() }))
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
let updateBlocks: () => void

export const Editor = ({ importScript }: { importScript: (s: Script) => void }) => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const activeTab = useSelector(tabs.selectActiveTabID)
    const activeScript = useSelector(tabs.selectActiveTabScript)
    const embedMode = useSelector(appState.selectEmbedMode)
    const theme = useSelector(appState.selectColorTheme)
    const fontSize = useSelector(appState.selectFontSize)
    const editorElement = useRef<HTMLDivElement>(null)
    const blocksElement = useRef<HTMLDivElement>(null)
    const collaborators = useSelector(collabState.selectCollaborators)
    const blocksMode = useSelector(selectBlocksMode)
    const [inBlocksMode, setInBlocksMode] = useState(false)
    const [shaking, setShaking] = useState(false)

    useEffect(() => {
        if (!editorElement.current || !blocksElement.current) return

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

            droplet = new (window as any).droplet.Editor(blocksElement.current, blocksModes.python)

            shakeImportButton = startShaking
            resolveReady()
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

    const tryToEnterBlocksMode = () => {
        droplet.on("change", () => {})
        const language = ESUtils.parseLanguage(activeScript?.name ?? ".py")
        if (language !== droplet.getMode()) {
            droplet.setValue_raw("")
            droplet.setMode(language, blocksModes[language].modeOptions)
            droplet.setPalette(blocksModes[language].palette)
        }
        const result = droplet.setValue_raw(getContents())
        if (result.success) {
            setInBlocksMode(true)
            droplet.on("change", () => setContents(droplet.getValue()))
        } else {
            dispatch(setBlocksMode(false))
        }
    }

    updateBlocks = () => {
        if (inBlocksMode) {
            tryToEnterBlocksMode()
        }
    }

    useEffect(() => {
        if (blocksMode && !inBlocksMode) {
            // TODO: We could try scanning for syntax errors in advance and enable/disable the blocks mode switch accordingly.
            tryToEnterBlocksMode()
        } else if (!blocksMode && inBlocksMode) {
            setInBlocksMode(false)
            droplet.on("change", () => {})
        }
    }, [blocksMode])

    useEffect(() => {
        // User switched tabs. If we're in blocks mode, try to stay there with the new script.
        updateBlocks()
    }, [activeTab])

    return <div className="flex grow h-full max-h-full overflow-y-hidden">
        <div id="editor" className="code-container" style={{ fontSize }}>
            <div ref={blocksElement} className={"h-full w-full absolute" + (inBlocksMode ? "" : " opacity-0")} />
            <div ref={editorElement} className={"h-full w-full" + (inBlocksMode ? " hidden" : "")} />
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
