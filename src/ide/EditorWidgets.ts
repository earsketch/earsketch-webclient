import { WidgetType, EditorView, Decoration, ViewUpdate, ViewPlugin, DecorationSet } from "@codemirror/view"
import { syntaxTree } from "@codemirror/language"
import { Range, StateEffect, StateEffectType } from "@codemirror/state"
import * as soundsThunks from "../browser/soundsThunks"
import store from "../reducers"
import { ENGLISH_LOCALE, Locale } from "../locales/AvailableLocales"
import i18n from "i18next"
import { Preview } from "../browser/soundsState"
import _ from "lodash"

type PreviewState = { preview: Preview | null, playing: boolean }

export const setPreview: StateEffectType<PreviewState> = StateEffect.define()
export const setSoundNames: StateEffectType<string[]> = StateEffect.define()
export const setAppLocale: StateEffectType<Locale> = StateEffect.define()

class PreviewWidget extends WidgetType {
    constructor(readonly preview: Preview, readonly state: "playing" | "loading" | "stopped") {
        super()
    }

    override eq(other: PreviewWidget) {
        return _.isEqual(this.preview, other.preview) && this.state === other.state
    }

    override toDOM() {
        const wrap = document.createElement("span")
        wrap.className = "cm-preview-sound mr-1.5"
        wrap.setAttribute("aria-hidden", "true")
        const previewButton = wrap.appendChild(document.createElement("button"))
        previewButton.setAttribute("tabindex", "-1")
        previewButton.innerHTML = {
            playing: '<i class="icon icon-stop2" />',
            loading: '<i class="animate-spin es-spinner" />',
            stopped: '<i class="icon icon-play4" />',
        }[this.state]
        previewButton.onclick = () => {
            store.dispatch(soundsThunks.togglePreview(this.preview))
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

    override toDOM() {
        const wrap = document.createElement("span")
        wrap.setAttribute("aria-hidden", "true")
        const characterCount = this.beat.length
        const characterCountBadge = wrap.appendChild(document.createElement("span"))
        characterCountBadge.className = "align-middle bg-blue-200 text-blue-900 rounded-md px-1 ml-1.5"
        characterCountBadge.setAttribute("style", "font-size: 0.9em")
        characterCountBadge.innerText = i18n.t("editor.stepCount", { count: characterCount, lng: this.locale.localeCode })
        return wrap
    }
}

function previews(view: EditorView, soundNames: string[], { preview, playing }: PreviewState, locale: Locale) {
    const widgets: Range<Decoration>[] = []
    const beatStringRegex = /^[0-9A-Fa-f\-+]+$/
    for (const { from, to } of view.visibleRanges) {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter: (node) => {
                if (node.name === "VariableName") {
                    const name = view.state.doc.sliceString(node.from, node.to)
                    if (soundNames.includes(name)) {
                        const state = preview?.kind === "sound" && preview.name === name
                            ? playing ? "playing" : "loading"
                            : "stopped"
                        const deco = Decoration.widget({
                            widget: new PreviewWidget({ kind: "sound", name }, state),
                            side: 1,
                        })
                        widgets.push(deco.range(node.from))
                    }
                } else if (node.name === "String") {
                    const quotedBeatString = view.state.doc.sliceString(node.from, node.to)
                    const beat = quotedBeatString.slice(1, quotedBeatString.length - 1)
                    if (beatStringRegex.test(beat)) {
                        const state = preview?.kind === "beat" && preview.beat === beat
                            ? playing ? "playing" : "loading"
                            : "stopped"
                        const deco = Decoration.widget({
                            widget: new PreviewWidget({ kind: "beat", beat }, state),
                            side: 1,
                        })
                        const charCount = Decoration.widget({
                            widget: new BeatCharacterCountWidget(beat, locale),
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

let soundNames: string[] = []
let currentPreview: PreviewState = { preview: null, playing: false }
let appLocale: Locale = ENGLISH_LOCALE

export const previewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = previews(view, soundNames, currentPreview, appLocale)
    }

    update(update: ViewUpdate) {
        let updated = update.docChanged || update.viewportChanged
        for (const t of update.transactions) {
            for (const effect of t.effects) {
                if (effect.is(setPreview)) {
                    currentPreview = effect.value
                    updated = true
                } else if (effect.is(setSoundNames)) {
                    soundNames = effect.value
                    updated = true
                } else if (effect.is(setAppLocale)) {
                    appLocale = effect.value
                    updated = true
                }
            }
        }
        if (updated) {
            this.decorations = previews(update.view, soundNames, currentPreview, appLocale)
        }
    }
}, {
    decorations: v => v.decorations,
})
