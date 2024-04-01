import { WidgetType, EditorView, Decoration, ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { Range, StateEffect, StateEffectType } from "@codemirror/state"
import * as soundsThunks from "../browser/soundsThunks"
import store from "../reducers"

type BeatPreview = { name: string, playing: boolean } | null

export const setBeatPreview: StateEffectType<BeatPreview> = StateEffect.define()

class BeatPreviewWidget extends WidgetType {
    constructor(readonly beat: string, readonly state: "playing" | "loading" | "stopped") {
        super()
    }

    // ?
    override eq(other: BeatPreviewWidget) {
        return this.beat === other.beat && this.state === other.state
    }

    toDOM() {
        const wrap = document.createElement("span")
        wrap.className = "cm-preview-sound mr-1.5"
        wrap.setAttribute("aria-hidden", "true")
        const previewButton = wrap.appendChild(document.createElement("button"))
        previewButton.setAttribute("tabindex", "-1")
        previewButton.value = this.beat
        // previewButton.value =
        const characterCount = this.beat.length - 2
        const previewIcon = {
            playing: "<i class=\"icon icon-stop2\"></i>",
            loading: "<i class=\"animate-spin es-spinner\"></i>",
            stopped: "<i class=\"icon icon-play4\" ></i>",
        }[this.state]
        previewButton.innerHTML = `${previewIcon}`
        previewButton.onclick = () => {
            store.dispatch(soundsThunks.previewBeat(this.beat))
        }
        // const characterCountBadge = wrap.appendChild(document.createElement("span"))
        // characterCountBadge.className = "absolute text-gray-700"
        // characterCountBadge.setAttribute("style", "font-size: 0.65em; right: -6em; top: -1.4em;")
        // characterCountBadge.innerText = `${characterCount} steps`
        return wrap
    }

    override ignoreEvent() {
        return false
    }
}

class BeatCharacterCountWidget extends WidgetType {
    constructor(readonly beat: string) {
        super()
    }

    // ?
    override eq(other: BeatPreviewWidget) {
        return this.beat === other.beat
    }

    toDOM() {
        const wrap = document.createElement("span")
        wrap.className = ""
        wrap.setAttribute("aria-hidden", "true")
        const characterCount = this.beat.length - 2
        const characterCountBadge = wrap.appendChild(document.createElement("span"))
        characterCountBadge.className = "bg-blue-300 text-blue-900 rounded-md px-1 ml-1.5"
        characterCountBadge.setAttribute("style", "font-size: 0.7em")
        characterCountBadge.innerText = `${characterCount} steps`
        return wrap
    }

    override ignoreEvent() {
        return false
    }
}

function previews(view: EditorView, beatPreview: BeatPreview) {
    const widgets: Range<Decoration>[] = []

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "String") {
                    const stringName = view.state.doc.sliceString(node.from, node.to)
                    // ?
                    const state = beatPreview?.name === stringName
                        ? beatPreview.playing ? "playing" : "loading"
                        : "stopped"
                    const deco = Decoration.widget({
                        widget: new BeatPreviewWidget(stringName, state),
                        side: 1,
                    })
                    const charCount = Decoration.widget({
                        widget: new BeatCharacterCountWidget(stringName),
                        side: 1,
                        // block: true,
                    })
                    widgets.push(deco.range(node.from))
                    widgets.push(charCount.range(node.to))
                }
            },
        })
    }
    return Decoration.set(widgets)
}

let soundPreview: BeatPreview = null

export const beatPreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = previews(view, soundPreview)
    }

    update(update: ViewUpdate) {
        let updated = update.docChanged || update.viewportChanged
        for (const t of update.transactions) {
            for (const effect of t.effects) {
                if (effect.is(setBeatPreview)) {
                    soundPreview = effect.value
                    updated = true
                }
            }
        }
        if (updated) {
            this.decorations = previews(update.view, soundPreview)
        }
    }
}, {
    decorations: v => v.decorations,
})
