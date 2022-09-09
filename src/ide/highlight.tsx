import React from "react"
import { highlightTree } from "@lezer/highlight"
import { defaultHighlightStyle } from "@codemirror/language"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { pythonLanguage } from "@codemirror/lang-python"

// Inspired by https://joelgustafson.com/posts/2022-05-31/syntax-highlighting-on-the-web
// TODO: Handle dark mode.
export function highlight(textContent: string, language: "python" | "javascript") {
    const languages = {
        python: pythonLanguage,
        javascript: javascriptLanguage,
    }
    const tree = languages[language].parser.parse(textContent)
    let pos = 0
    const children: any[] = []

    const callback = (text: string, classes: string) => {
        children.push(text === "\n" ? <br /> : <span className={classes}>{text}</span>)
    }

    highlightTree(tree, defaultHighlightStyle, (from, to, classes) => {
        from > pos && callback(textContent.slice(pos, from), "")
        callback(textContent.slice(from, to), classes)
        pos = to
    })
    pos !== tree.length && callback(textContent.slice(pos, tree.length), "")
    return children
}
