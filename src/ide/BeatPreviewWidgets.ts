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
    eq(other: BeatPreviewWidget) {
        return this.state === other.state
    }

    toDOM() {
        const wrap = document.createElement("span")
        wrap.className = "cm-preview-sound ml-1.5"
        wrap.setAttribute("aria-hidden", "true")
        const previewButton = wrap.appendChild(document.createElement("button"))
        previewButton.setAttribute("tabindex", "-1")
        previewButton.value = 
        previewButton.innerHTML = {
            playing: '<i class="icon icon-stop2" />',
            loading: '<i class="animate-spin es-spinner" />',
            stopped: '<i class="icon icon-play4" />',
        }[this.state]
        previewButton.onclick = () => {
            store.dispatch(soundsThunks.previewBeat(this.beat))
        }
        return wrap
    }

    ignoreEvent() {
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
                if (node.name === "VariableName") {
                    const variableName = view.state.doc.sliceString(node.from, node.to)
                    if (variableName === "makeBeat") {
                        syntaxTree(view.state).iterate({
                            from,
                            to,
                            enter: (node) => {
                                if (node.name === "String"){
                                    const stringName = view.state.doc.sliceString(node.from, node.to)
                                    // ?
                                    const state = beatPreview?.name === stringName
                                        ? beatPreview.playing ? "playing" : "loading"
                                        : "stopped"
                                    const deco = Decoration.widget({
                                        widget: new BeatPreviewWidget(stringName, state),
                                        side: 1,
                                    })
                                    widgets.push(deco.range(node.to))
                                }
                            }
                        })
        
                    }
                }
            },
        })
    }
    return Decoration.set(widgets)
}

// export const soundPreviewPlugin = ViewPlugin.fromClass(class {
//     decorations: DecorationSet

//     constructor(view: EditorView) {
//         this.decorations = previews(view, soundNames, soundPreview)
//     }

//     update(update: ViewUpdate) {
//         let updated = update.docChanged || update.viewportChanged
//         for (const t of update.transactions) {
//             for (const effect of t.effects) {
//                 if (effect.is(setSoundPreview)) {
//                     soundPreview = effect.value
//                     updated = true
//                 } else if (effect.is(setSoundNames)) {
//                     soundNames = effect.value
//                     updated = true
//                 }
//             }
//         }
//         if (updated) {
//             this.decorations = previews(update.view, soundNames, soundPreview)
//         }
//     }
// }, {
//     decorations: v => v.decorations,
// })

let beatPreview: BeatPreview = null

export const beatPreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet 

    constructor(view: EditorView) {
        this.decorations = previews(view, beatPreview)
    }

    update(update: ViewUpdate) {
        let updated = update.docChanged || update.viewportChanged 
        for (const t of update.transactions) {
            for (const effect of t.effects) {
                if (effect.is(setBeatPreview))) {
                    // beatPreview = effect.value
                    updated = true 
                } 
            }
        }
        if (updated) {
            this.decorations = previews(update.view, beatPreview)
        }
    }
}, {
    decorations: v => v.decorations,
})