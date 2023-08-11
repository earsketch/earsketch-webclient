import * as ace from "ace-builds"
import { useDispatch, useSelector } from "react-redux"
import React, { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { EditorView, basicSetup } from "codemirror"
import { CompletionSource, completeFromList, ifNotIn, snippetCompletion } from "@codemirror/autocomplete"
import * as commands from "@codemirror/commands"
import { Compartment, EditorState, Extension, StateEffect, StateEffectType, StateField, RangeSet } from "@codemirror/state"
import { indentUnit } from "@codemirror/language"
import { pythonLanguage } from "@codemirror/lang-python"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { gutter, GutterMarker, keymap, ViewUpdate, Decoration, WidgetType } from "@codemirror/view"
import { oneDark } from "@codemirror/theme-one-dark"
import { lintGutter, setDiagnostics } from "@codemirror/lint"
import { setSoundNames, setSoundPreview, soundPreviewPlugin } from "./EditorWidgets"

import { API_DOC, ANALYSIS_NAMES, EFFECT_NAMES_DISPLAY } from "../api/api"
import * as appState from "../app/appState"
import * as audio from "../app/audiolibrary"
import { modes as blocksModes } from "./blocksConfig"
import * as caiDialogue from "../cai/dialogue"
import * as collaboration from "../app/collaboration"
import * as collabState from "../app/collaborationState"
import * as ESUtils from "../esutils"
import { selectAutocomplete, selectBlocksMode, setBlocksMode, setScriptMatchesDAW } from "./ideState"
import * as tabs from "./tabState"
import store from "../reducers"
import * as scripts from "../browser/scriptsState"
import * as sounds from "../browser/soundsState"
import type { Language, Script } from "common"

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
    update(value: Markers, transaction) {
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

const dawHighlightEffect = StateEffect.define<{ color: string, pos: number } | undefined>({
    map: (val, mapping) => (val ? { color: val.color, pos: mapping.mapPos(val.pos) } : undefined),
})

let arrowColor = "" // TODO: maybe avoid global in favor of CodeMirror state

const dawHighlightMarker = new class extends GutterMarker {
    toDOM() {
        const node = document.createElement("i")
        node.classList.add("icon-arrow-right-thick")
        node.style.color = arrowColor
        node.style.position = "absolute"
        node.style.left = "5px"
        return node
    }
}()

const dawHighlightState = StateField.define<RangeSet<GutterMarker>>({
    create() { return RangeSet.empty },
    update(set, transaction) {
        set = set.map(transaction.changes)
        for (const e of transaction.effects) {
            if (e.is(dawHighlightEffect)) {
                if (e.value) {
                    set = set.update({ add: [dawHighlightMarker.range(e.value.pos)] })
                    arrowColor = e.value.color
                } else {
                    set = set.update({ filter: _ => false })
                }
            }
        }
        return set
    },
})

const dawHighlightGutter = [
    dawHighlightState,
    gutter({
        class: "daw-highlight-gutter",
        markers: v => v.state.field(dawHighlightState),
        initialSpacer: () => dawHighlightMarker,
    }),
    EditorView.baseTheme({
        ".daw-highlight-gutter .cm-gutterElement": {
            cursor: "default",
            display: "flex",
            alignItems: "center",
            textShadow: "1px 0px 0 #000, -1px 0px 0 #000, 0px 1px 0 #000, 0px -1px 0 #000",
        },
    }),
]

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
const pythonFunctions = []
const javascriptFunctions = []
for (const [name, entries] of Object.entries(API_DOC)) {
    for (const entry of entries) {
        if (entry.deprecated) continue
        const args = entry.signature.substring(name.length)
        if (!entry.language || entry.language === "python") {
            pythonFunctions.push(snippetCompletion(entry.template, { label: name, type: "function", detail: args }))
        }
        if (!entry.language || entry.language === "javascript") {
            javascriptFunctions.push(snippetCompletion(entry.template, { label: name, type: "function", detail: args }))
        }
    }
}

const autocompletions = []
autocompletions.push(...EFFECT_NAMES_DISPLAY.map(label => ({ label, type: "constant", detail: "Effect constant" })))
autocompletions.push(...ANALYSIS_NAMES.map(label => ({ label, type: "constant", detail: "Analysis constant" })))

let pythonCompletions = completeFromList(pythonFunctions.concat(autocompletions))
let javascriptCompletions = completeFromList(javascriptFunctions.concat(autocompletions))

const dontComplete = {
    python: ["String", "Comment"],
    javascript: [
        "TemplateString", "String", "RegExp", "LineComment", "BlockComment",
        "TypeDefinition", "Label", "PropertyName", "PrivatePropertyName",
    ],
}

;(async () => {
    // Set up more completions (standard sounds & folders, which are fetched over network) asynchronously.
    const { sounds, folders } = await audio.getStandardSounds()
    autocompletions.push(...folders.map(label => ({ label, type: "constant", detail: "Folder constant" })))
    autocompletions.push(...sounds.map(({ name: label }) => ({ label, type: "constant", detail: "Sound constant" })))
    pythonCompletions = completeFromList(pythonFunctions.concat(autocompletions))
    javascriptCompletions = completeFromList(javascriptFunctions.concat(autocompletions))
})()

let autocompleteEnabled = true
const javascriptAutocomplete: CompletionSource = (context) => autocompleteEnabled ? javascriptCompletions(context) : null
const pythonAutocomplete: CompletionSource = (context) => autocompleteEnabled ? pythonCompletions(context) : null

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

export function createSession(id: string, language: Language, contents: string) {
    return EditorState.create({
        doc: contents,
        extensions: [
            javascriptLanguage.data.of({ autocomplete: ifNotIn(dontComplete.javascript, javascriptAutocomplete) }),
            pythonLanguage.data.of({ autocomplete: ifNotIn(dontComplete.python, pythonAutocomplete) }),
            markers(),
            dawHighlightGutter,
            lintGutter(),
            indentUnit.of("    "),
            readOnly.of(EditorState.readOnly.of(false)),
            language === "python" ? pythonLanguage : javascriptLanguage,
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
            soundPreviewPlugin,
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

export function setContents(contents: string, id?: string, doUpdateBlocks = false) {
    if (id && sessions[id] !== view.state) {
        sessions[id] = sessions[id].update({ changes: { from: 0, to: sessions[id].doc.length, insert: contents } }).state
    } else {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: contents } })
        if (doUpdateBlocks) updateBlocks()
    }
}

export function setReadOnly(value: boolean) {
    view.dispatch({ effects: readOnly.reconfigure(EditorState.readOnly.of(value)) })
    droplet.setReadOnly(value)
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
        // Deny read-only mode
        shakeImportButton()
    } else if (selectBlocksMode(store.getState())) {
        // Handle blocks mode
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
        // Handle default case: paste to editor
        const { from, to } = view.state.selection.ranges[0]
        view.dispatch({ changes: { from, to, insert: code }, selection: { anchor: from + code.length } })
        view.focus()
    }
}

export function highlightError(err: any) {
    const language = ESUtils.parseLanguage(tabs.selectActiveTabScript(store.getState()).name)
    let lineNumber = language === "python" ? err.traceback?.[0]?.lineno : err.lineNumber
    if (lineNumber !== undefined) {
        // Skulpt reports a line number greater than the document length for EOF; clamp to valid range.
        lineNumber = Math.min(lineNumber, view.state.doc.lines)
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

export function setDAWHighlight(color: string, lineNumber: number) {
    lineNumber = Math.min(lineNumber, view.state.doc.lines)
    const line = view.state.doc.line(lineNumber)
    view.dispatch({ effects: dawHighlightEffect.of({ color, pos: line.from }) })
}

export function clearDAWHighlight() {
    view.dispatch({ effects: dawHighlightEffect.of(undefined) })
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
        store.dispatch(setScriptMatchesDAW(false))
    }

    const operations: collaboration.EditOperation[] = []
    const caiOperations: { action: "remove" | "insert", text: string } [] = []
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

            if (FLAGS.UPLOAD_CAI_HISTORY && script) {
                caiOperations.push({
                    action: "remove",
                    text: script.source_code.slice(fromA, toA),
                })
            }
        }
        if (fromB < toB) {
            operations.push({
                action: "insert",
                start: fromB,
                end: toB,
                len: inserted.length,
                text: inserted.toString(),
            })

            if (FLAGS.UPLOAD_CAI_HISTORY) {
                caiOperations.push({
                    action: "remove",
                    text: inserted.toString(),
                })
            }
        }
    })

    // TODO: Move into a change listener, and move other collaboration stuff into callbacks.
    // NOTE: `lockEditor` is kind of a hack to prevent collaboration-caused edits from triggering further updates.
    if (collaboration.active && !collaboration.lockEditor) {
        const operation = operations.length === 1 ? operations[0] : { action: "mult", operations } as const
        collaboration.editScript(operation)
    }

    if (FLAGS.UPLOAD_CAI_HISTORY && (!collaboration.active || !collaboration.lockEditor)) {
        for (const operation of caiOperations) {
            caiDialogue.addToNodeHistory(["editor " + operation.action, operation.text])
        }
    }
}

let shakeImportButton = () => {}
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
    const autocomplete = useSelector(selectAutocomplete)
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
                extensions: [basicSetup, EditorState.readOnly.of(true), themeConfig.of(getTheme()), FontSizeThemeExtension, soundPreviewPlugin],
                parent: editorElement.current,
            })

            droplet = new (window as any).droplet.Editor(blocksElement.current, blocksModes.python)

            shakeImportButton = startShaking
            resolveReady()
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
            droplet.resize()
            setInBlocksMode(true)
            droplet.on("change", () => setContents(droplet.getValue(), undefined, false))
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

    useEffect(() => { autocompleteEnabled = autocomplete }, [autocomplete])

    useEffect(() => {
        // User switched tabs. If we're in blocks mode, try to stay there with the new script.
        updateBlocks()
    }, [activeTab])

    // State for editor widgets
    const previewFileName = useSelector(sounds.selectPreviewName)
    const previewNode = useSelector(sounds.selectPreviewNode)
    useEffect(() => {
        const soundInfo = previewFileName === null
            ? null
            : { name: previewFileName, playing: !!previewNode }
        view.dispatch({ effects: setSoundPreview.of(soundInfo) })
    }, [previewFileName, previewNode])

    const soundNames = useSelector(sounds.selectAllNames)
    useEffect(() => {
        view.dispatch({ effects: setSoundNames.of(soundNames) })
    }, [soundNames])

    return <div className="flex grow h-full max-h-full overflow-y-hidden">
        <div id="editor" className="code-container" style={{ fontSize }}>
            <div ref={blocksElement} className={"h-full w-full absolute" + (inBlocksMode ? "" : " invisible")} onClick={shakeImportButton} />
            <div
                ref={editorElement} className={"h-full w-full" + (inBlocksMode ? " hidden" : "")}
                onClick={shakeImportButton} onCut={shakeImportButton} onPaste={shakeImportButton} onKeyDown={({ key }) => {
                    if (key.length === 1 || ["Enter", "Backspace", "Delete", "Tab"].includes(key)) {
                        shakeImportButton()
                    }
                }}
            />
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
