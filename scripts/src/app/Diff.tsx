import React, { useEffect, useRef } from "react"

export const Diff = ({ original, modified }: { original: string, modified: string }) => {
    const element = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!element.current) return

        // Perform diff.
        const newLines = difflib.stringAsLines(modified)
        const baseLines = difflib.stringAsLines(original)
        // This is a list of 3-tuples describing what changes should be made to the base text in order to yield the new text.
        const opcodes = (new difflib.SequenceMatcher(baseLines, newLines)).get_opcodes()

        while (element.current.firstChild) {
            element.current.firstChild.remove()
        }

        // Build the diff view and add it to the DOM.
        element.current.appendChild(diffview.buildView({
            baseTextLines: baseLines,
            newTextLines: newLines,
            opcodes: opcodes,
            baseTextName: "Base Text",
            newTextName: "New Text",
            contextSize: null,
            viewType: 1
        }))

        // Add syntax highlighting.
        element.current.childNodes.forEach(hljs.highlightBlock)
    }, [original, modified, element.current])

    return <code ref={element} className="diff"></code>
}
