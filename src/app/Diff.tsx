import { useEffect, useRef } from "react"
import difflib from "@lib/jsdifflib/difflib"
import diffview from "@lib/jsdifflib/diffview"
import "@lib/jsdifflib/diffview.css"

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
            opcodes,
            baseTextName: "Base Text",
            newTextName: "New Text",
            contextSize: null,
            viewType: 1,
        }))
    }, [original, modified, element.current])

    return <code ref={element} className="diff p-0 whitespace-pre-wrap break-words text-sm"></code>
}
