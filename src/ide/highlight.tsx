import React from "react"
import { highlightTree } from "@lezer/highlight"
import { defaultHighlightStyle } from "@codemirror/language"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { pythonLanguage } from "@codemirror/lang-python"
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark"
import { Language } from "common"

// Inspired by https://joelgustafson.com/posts/2022-05-31/syntax-highlighting-on-the-web
export function highlight(textContent: string, language: Language) {
    const languages = {
        python: pythonLanguage,
        javascript: javascriptLanguage,
    }
    const tree = languages[language].parser.parse(textContent)
    let pos = 0
    const light: JSX.Element[] = []
    const dark: JSX.Element[] = []

    const callback = (nodes: JSX.Element[], text: string, classes: string) => {
        nodes.push(text === "\n" ? <br /> : <span className={classes}>{text}</span>)
    }

    // Generate elements with light theme.
    highlightTree(tree, defaultHighlightStyle, (from, to, classes) => {
        from > pos && callback(light, textContent.slice(pos, from), "")
        callback(light, textContent.slice(from, to), classes)
        pos = to
    })
    pos !== tree.length && callback(light, textContent.slice(pos, tree.length), "")
    // Generate elements with dark theme.
    highlightTree(tree, oneDarkHighlightStyle, (from, to, classes) => {
        from > pos && callback(dark, textContent.slice(pos, from), "")
        callback(dark, textContent.slice(from, to), classes)
        pos = to
    })
    pos !== tree.length && callback(dark, textContent.slice(pos, tree.length), "")
    return { light, dark }
}
