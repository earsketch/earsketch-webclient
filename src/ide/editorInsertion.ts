import type { Text } from "@codemirror/state"

export function getCodeInsertion(doc: Text, code: string, lineNumber: number) {
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > doc.lines + 1) {
        return { error: `Line number must be between 1 and ${doc.lines + 1}` }
    }

    if (lineNumber === doc.lines + 1) {
        return {
            from: doc.length,
            insert: (doc.length > 0 ? "\n" : "") + code,
        }
    }

    return {
        from: doc.line(lineNumber).from,
        insert: code.endsWith("\n") ? code : code + "\n",
    }
}
