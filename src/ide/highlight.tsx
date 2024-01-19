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

    const callback = (nodes: JSX.Element[], from: number, to: number, text: string, classes: string) => {
        const key = `${from},${to}`
        text = text.slice(from, to)
        nodes.push(text === "\n" ? <br key={key} /> : <span key={key} className={classes}>{text}</span>)
    }

    // Generate elements with light theme.
    highlightTree(tree, defaultHighlightStyle, (from, to, classes) => {
        from > pos && callback(light, pos, from, textContent, "")
        callback(light, from, to, textContent, classes)
        pos = to
    })
    pos !== tree.length && callback(light, pos, tree.length, textContent, "")
    // Generate elements with dark theme.
    highlightTree(tree, oneDarkHighlightStyle, (from, to, classes) => {
        from > pos && callback(dark, pos, from, textContent, "")
        callback(dark, from, to, textContent, classes)
        pos = to
    })
    pos !== tree.length && callback(dark, pos, tree.length, textContent, "")
    return { light, dark }
}
