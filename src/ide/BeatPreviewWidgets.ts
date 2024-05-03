import { WidgetType, EditorView, Decoration, ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { Range, StateEffect, StateEffectType } from "@codemirror/state"
import * as soundsThunks from "../browser/soundsThunks"
import store from "../reducers"
import i18n from "i18next"
import { ENGLISH_LOCALE, Locale } from "../locales/AvailableLocales"

type BeatPreview = { beat: string, playing: boolean } | null

export const setAppLocale: StateEffectType<Locale> = StateEffect.define()
export const setBeatPreview: StateEffectType<BeatPreview> = StateEffect.define()

class BeatPreviewWidget extends WidgetType {
    constructor(readonly beat: string, readonly state: "playing" | "loading" | "stopped") {
        super()
    }

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
        const previewIcon = {
            playing: "<i class=\"icon icon-stop2\"></i>",
            loading: "<i class=\"animate-spin es-spinner\"></i>",
            stopped: "<i class=\"icon icon-play4\" ></i>",
        }[this.state]
        previewButton.innerHTML = `${previewIcon}`
        previewButton.onclick = () => {
            store.dispatch(soundsThunks.previewBeat(this.beat))
        }
        return wrap
    }

    override ignoreEvent(event: Event) {
        // tell CodeMirror to ignore clicks so our widget can always handle them
        return event.type === "mousedown"
    }
}

class BeatCharacterCountWidget extends WidgetType {
    constructor(readonly beat: string, readonly locale: Locale) {
        super()
    }

    override eq(other: BeatCharacterCountWidget) {
        return this.beat === other.beat && this.locale.localeCode === other.locale.localeCode
    }

    toDOM() {
        const wrap = document.createElement("span")
        wrap.className = ""
        wrap.setAttribute("aria-hidden", "true")
        const characterCount = this.beat.length
        const characterCountBadge = wrap.appendChild(document.createElement("span"))
        characterCountBadge.className = "align-middle bg-blue-200 text-blue-900 rounded-md px-1 ml-1.5"
        characterCountBadge.setAttribute("style", "font-size: 0.7em")
        characterCountBadge.innerText = i18n.t("editor.stepCount", { count: characterCount, lng: this.locale.localeCode })
        return wrap
    }

    override ignoreEvent() {
        return false
    }
}

function previews(view: EditorView, beatPreview: BeatPreview, locale: Locale) {
    const widgets: Range<Decoration>[] = []
    const beatStringRegex = /^(?=[0-9a-fA-F])[0-9a-fA-F+-]*$/ // must be valid beat string AND contain more than just + or -
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "String") {
                    const quotedBeatString = view.state.doc.sliceString(node.from, node.to)
                    const beatString = quotedBeatString.slice(1, quotedBeatString.length - 1)
                    if (beatStringRegex.test(beatString)) {
                        const state = beatPreview?.beat === beatString
                            ? beatPreview.playing ? "playing" : "loading"
                            : "stopped"
                        const deco = Decoration.widget({
                            widget: new BeatPreviewWidget(beatString, state),
                            side: 1,
                        })
                        const charCount = Decoration.widget({
                            widget: new BeatCharacterCountWidget(beatString, locale),
                            side: 1,
                        })
                        widgets.push(deco.range(node.from))
                        widgets.push(charCount.range(node.to))
                    }
                }
            },
        })
    }
    return Decoration.set(widgets)
}

let beatPreview: BeatPreview = null
let appLocale: Locale = ENGLISH_LOCALE

export const beatPreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = previews(view, beatPreview, appLocale)
    }

    update(update: ViewUpdate) {
        let updated = update.docChanged || update.viewportChanged
        for (const t of update.transactions) {
            for (const effect of t.effects) {
                if (effect.is(setBeatPreview)) {
                    beatPreview = effect.value
                    updated = true
                } else if (effect.is(setAppLocale)) {
                    appLocale = effect.value
                    updated = true
                }
            }
        }
        if (updated) {
            this.decorations = previews(update.view, beatPreview, appLocale)
        }
    }
}, {
    decorations: v => v.decorations,
})
