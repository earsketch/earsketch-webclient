import { WidgetType, EditorView, Decoration, ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { Range, StateEffect, StateEffectType } from "@codemirror/state"
import * as soundsThunks from "../browser/soundsThunks"
import store from "../reducers"

type SoundPreview = { name: string, playing: boolean } | null

export const setSoundPreview: StateEffectType<SoundPreview> = StateEffect.define()
export const setSoundNames: StateEffectType<string[]> = StateEffect.define()

class CheckboxWidget extends WidgetType {
    constructor(readonly checked: boolean) {
        super()
    }

    eq(other: CheckboxWidget) {
        return other.checked === this.checked
    }

    toDOM() {
        const wrap = document.createElement("span")
        // wrap.setAttribute("aria-hidden", "true")
        wrap.className = "cm-boolean-toggle ml-1.5"
        const box = wrap.appendChild(document.createElement("input"))
        box.type = "checkbox"
        box.checked = this.checked
        return wrap
    }

    ignoreEvent() {
        return false
    }
}

function checkboxes(view: EditorView) {
    const widgets: Range<Decoration>[] = []
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "BooleanLiteral") {
                    const isTrue = view.state.doc.sliceString(node.from, node.to) === "true"
                    const deco = Decoration.widget({
                        widget: new CheckboxWidget(isTrue),
                        side: 1,
                    })
                    widgets.push(deco.range(node.to))
                }
            },
        })
    }
    return Decoration.set(widgets)
}

function toggleBoolean(view: EditorView, pos: number) {
    const before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
    let change
    if (before === "false") {
        change = { from: pos - 5, to: pos, insert: "true" }
    } else if (before.endsWith("true")) {
        change = { from: pos - 4, to: pos, insert: "false" }
    } else {
        return false
    }
    view.dispatch({ changes: change })
    return true
}

export const checkboxPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = checkboxes(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) { this.decorations = checkboxes(update.view) }
    }
}, {
    decorations: v => v.decorations,

    eventHandlers: {
        mousedown: (e, view) => {
            const target = e.target as HTMLElement
            if (target.nodeName === "INPUT" &&
                target.parentElement!.classList.contains("cm-boolean-toggle")) { return toggleBoolean(view, view.posAtDOM(target)) }
        },
    },
})

class SoundPreviewWidget extends WidgetType {
    constructor(readonly name: string, readonly state: "playing" | "loading" | "stopped") {
        super()
    }

    eq(other: SoundPreviewWidget) {
        return this.name === other.name && this.state === other.state
    }

    toDOM() {
        const wrap = document.createElement("span")
        // wrap.setAttribute("aria-hidden", "true")
        wrap.className = "cm-preview-sound ml-1.5"
        const previewButton = wrap.appendChild(document.createElement("button"))
        previewButton.value = this.name
        previewButton.innerHTML = {
            playing: '<i class="icon icon-stop2" />',
            loading: '<i class="animate-spin es-spinner" />',
            stopped: '<i class="icon icon-play4" />',
        }[this.state]
        previewButton.onclick = () => {
            console.log("editor preview button click!!")
            store.dispatch(soundsThunks.previewSound(this.name))
        }
        return wrap
    }

    ignoreEvent() {
        return false
    }
}

function previews(view: EditorView, soundNames: string[], soundPreview: SoundPreview) {
    const widgets: Range<Decoration>[] = []
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "VariableName") {
                    const name = view.state.doc.sliceString(node.from, node.to)
                    const isSoundConstant = soundNames.includes(name)
                    if (isSoundConstant) {
                        const state = soundPreview?.name === name
                            ? soundPreview.playing ? "playing" : "loading"
                            : "stopped"
                        const deco = Decoration.widget({
                            widget: new SoundPreviewWidget(name, state),
                            side: 1,
                        })
                        widgets.push(deco.range(node.to))
                    }
                }
            },
        })
    }
    return Decoration.set(widgets)
}

export const soundPreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    soundNames: string[] = []
    soundPreview: SoundPreview = null

    constructor(view: EditorView) {
        this.decorations = previews(view, this.soundNames, this.soundPreview)
    }

    update(update: ViewUpdate) {
        let updated = update.docChanged || update.viewportChanged
        for (const t of update.transactions) {
            for (const effect of t.effects) {
                if (effect.is(setSoundPreview)) {
                    this.soundPreview = effect.value
                    updated = true
                } else if (effect.is(setSoundNames)) {
                    this.soundNames = effect.value
                    updated = true
                }
            }
        }
        if (updated) {
            this.decorations = previews(update.view, this.soundNames, this.soundPreview)
        }
    }
}, {
    decorations: v => v.decorations,

    eventHandlers: {
        // click: (e, view) => {
        //     const target = e.target as HTMLElement
        //     console.log(target.nodeName)
        //     if (target.nodeName === "BUTTON" &&
        //         target.parentElement!.classList.contains("cm-preview-sound")) {
        //         console.log("preview sound button clicked in editor")
        //         // return toggleBoolean(view, view.posAtDOM(target))
        //     }
        // },
    },
})
