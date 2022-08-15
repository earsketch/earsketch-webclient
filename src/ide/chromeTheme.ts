import { EditorView } from "@codemirror/view"
import { Extension } from "@codemirror/state"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"

// Based on https://github.com/ajaxorg/ace/blob/23208f2f19020d1f69b90bc3b02460bda8422072/src/theme/chrome.css.js.

const highlightBackground = "rgba(0, 0, 0, 0.07)"
const background = "#fff"
const tooltipBackground = "#fff"
const cursor = "black"

export const chromeTheme = EditorView.theme({
    "&": {
        color: "#000",
        backgroundColor: background,
    },

    ".cm-content": {
        caretColor: cursor,
    },

    ".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgb(181, 213, 255)" },

    ".cm-activeLine": { backgroundColor: highlightBackground },
    ".cm-selectionMatch": { backgroundColor: "#aafe661a" },

    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
        backgroundColor: "#bad0f847",
        outline: "1px solid #515a6b",
    },

    ".cm-gutters": {
        backgroundColor: "#ebebeb",
        color: "#333",
    },

    ".cm-activeLineGutter": {
        backgroundColor: "#dcdcdc",
    },

    ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: "#ddd",
    },

    ".cm-tooltip": {
        border: "none",
        backgroundColor: tooltipBackground,
        boxShadow: "2px 3px 5px rgba(0, 0, 0, 0.2)",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
        borderTopColor: tooltipBackground,
        borderBottomColor: tooltipBackground,
    },
    ".cm-tooltip-autocomplete": {
        "& > ul > li[aria-selected]": {
            backgroundColor: highlightBackground,
            color: "#000",
        },
    },
    ".cm-completionMatchedText": {
        color: "#2d69c7",
        textDecoration: "none",
    },
})

export const chromeHighlightStyle = HighlightStyle.define([{
    tag: t.keyword,
    color: "rgb(147, 15, 128)",
}, {
    tag: [t.name, t.deleted, t.propertyName],
    color: "#000",
}, {
    tag: [t.constant(t.name), t.standard(t.name)],
    color: "rgb(49, 132, 149)",
}, {
    tag: [t.definition(t.name), t.separator],
    color: "#000",
}, {
    tag: [t.operator],
    color: "rgb(104, 118, 135)",
}, {
    tag: t.regexp,
    color: "rgb(255, 0, 0)",
}, {
    tag: t.number,
    color: "rgb(0, 0, 205)",
}, {
    tag: t.comment,
    color: "#236e24",
}, {
    tag: [t.atom, t.bool, t.special(t.variableName)],
    color: "rgb(88, 92, 246)",
}, {
    tag: [t.processingInstruction, t.string, t.regexp, t.inserted],
    color: "#1a1aa6",
}, {
    tag: t.invalid,
    color: "#fff",
    backgroundColor: "rgb(153, 0, 0)",
}, {
    tag: t.function(t.definition(t.variableName)),
    color: "#0000a2",
}])

export const chrome: Extension = [chromeTheme, syntaxHighlighting(chromeHighlightStyle)]
