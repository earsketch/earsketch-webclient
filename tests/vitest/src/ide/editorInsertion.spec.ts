import { Text } from "@codemirror/state"
import { describe, expect, it } from "vitest"

import { getCodeInsertion } from "../../../../src/ide/editorInsertion"

const applyInsertion = (source: string, code: string, lineNumber: number) => {
    const doc = Text.of(source.split("\n"))
    const insertion = getCodeInsertion(doc, code, lineNumber)
    if ("error" in insertion) return insertion
    return source.slice(0, insertion.from) + insertion.insert + source.slice(insertion.from)
}

describe("getCodeInsertion", () => {
    it("inserts code before an existing one-based line", () => {
        expect(applyInsertion("first\nthird", "second", 2)).toBe("first\nsecond\nthird")
    })

    it("appends code at lineCount + 1", () => {
        expect(applyInsertion("first\nsecond", "third", 3)).toBe("first\nsecond\nthird")
        expect(applyInsertion("first\nsecond\n", "fourth", 4)).toBe("first\nsecond\n\nfourth")
    })

    it("does not add another newline to a terminated snippet", () => {
        expect(applyInsertion("first\nthird", "second\n", 2)).toBe("first\nsecond\nthird")
    })

    it("rejects lines outside the document and append position", () => {
        const doc = Text.of(["first", "second"])
        expect(getCodeInsertion(doc, "code", 0)).toEqual({ error: "Line number must be between 1 and 3" })
        expect(getCodeInsertion(doc, "code", 4)).toEqual({ error: "Line number must be between 1 and 3" })
    })
})
