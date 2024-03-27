import { EditorView, Decoration, DecorationSet, keymap } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"

export const addUnderline = StateEffect.define<{ from: number, to: number }>({
    map: ({ from, to }, change) => ({ from: change.mapPos(from), to: change.mapPos(to) }),
})

const underlineField = StateField.define<DecorationSet>({
    create() {
        return Decoration.none
    },
    update(underlines, tr) {
        underlines = underlines.map(tr.changes)
        for (const e of tr.effects) {
            if (e.is(addUnderline)) {
                console.log("", e.value.from, e.value.to)
                underlines = underlines.update({
                    add: [underlineMark.range(e.value.from, e.value.to)],
                })
            }
        }
        return underlines
    },
    provide: f => EditorView.decorations.from(f),
})

const underlineMark = Decoration.mark({ class: "cm-outline", tagName: "span" })

const underlineTheme = EditorView.baseTheme({
    ".cm-outline": { outline: "solid 3px red" },
})

export function underlineSelection(view: EditorView) {
    const effects: StateEffect<unknown>[] = view.state.selection.ranges
        .filter(r => !r.empty)
        .map(({ from, to }) => addUnderline.of({ from, to }))
    if (!effects.length) return false

    if (!view.state.field(underlineField, false)) {
        effects.push(StateEffect.appendConfig.of([underlineField,
            underlineTheme]))
    }
    view.dispatch({ effects })
    return true
}

export const underlineKeymap = keymap.of([{
    key: "Mod-h",
    preventDefault: true,
    run: underlineSelection,
}])
