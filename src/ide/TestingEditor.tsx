import React, { useEffect, useRef, useState } from "react"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { pythonLanguage } from "@codemirror/lang-python"
import { javascriptLanguage } from "@codemirror/lang-javascript"
import { oneDark } from "@codemirror/theme-one-dark"

export const TestingEditor = () => {
    const editorRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const [output, setOutput] = useState<string[]>([])
    const [isRunning, setIsRunning] = useState(false)

    // Function to get current code from editor
    const getCurrentCode = () => {
        if (viewRef.current) {
            return viewRef.current.state.doc.toString()
        }
        return ""
    }

    // Simple code execution simulation
    const runCode = async () => {
        setIsRunning(true)
        setOutput(prev => [...prev])

        const code = getCurrentCode()

        try {
            // Simulate some processing time
            await new Promise(resolve => setTimeout(resolve, 500))

            // Simple execution simulation
            if (code.includes("print(") || code.includes("console.log(")) {
                setOutput(prev => [...prev, "Code executed successfully!"])
                setOutput(prev => [...prev, "Output: Hello from Testing Editor!"])
            } else if (code.includes("def ") || code.includes("function ")) {
                setOutput(prev => [...prev, "Function defined successfully!"])
            } else if (code.trim() === "") {
                setOutput(prev => [...prev, " No code to run"])
            } else {
                setOutput(prev => [...prev, "Code parsed successfully!"])
                setOutput(prev => [...prev, `Lines of code: ${code.split("\n").length}`])
            }
        } catch (error) {
            setOutput(prev => [...prev, `Error: ${error}`])
        } finally {
            setIsRunning(false)
        }
    }

    // Clear output
    const clearOutput = () => {
        setOutput([])
    }

    useEffect(() => {
        if (!editorRef.current) return

        // Create the CodeMirror editor
        const startState = EditorState.create({
            doc: `# Welcome to Testing Editor!
# This is a simple CodeMirror instance

def hello_world():
    print("Hello from the right panel!")
    return "Success!"

hello_world()

# Try typing some code here...
`,
            extensions: [
                basicSetup,
                pythonLanguage,
                oneDark, // Dark theme
                EditorView.theme({
                    "&": {
                        fontSize: "14px",
                        height: "100%",
                    },
                    ".cm-content": {
                        padding: "12px",
                    },
                    ".cm-focused": {
                        outline: "none",
                    },
                }),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        console.log("Content changed:", update.state.doc.toString())
                    }
                }),
            ],
        })

        viewRef.current = new EditorView({
            state: startState,
            parent: editorRef.current,
        })

        // Cleanup function
        return () => {
            if (viewRef.current) {
                viewRef.current.destroy()
                viewRef.current = null
            }
        }
    }, [])

    return (
        <div className="h-full w-full bg-gray-900 flex flex-col overflow-hidden">
            {/* Header with Run Button */}
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
                <div>
                    <h3 className="text-white text-sm font-semibold">
                        Testing Editor
                    </h3>
                    <p className="text-gray-300 text-xs">
                        Simple CodeMirror instance for testing
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                        {isRunning
                            ? (
                                <>
                                    <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                                    Running...
                                </>
                            )
                            : (
                                <>
                                    Run
                                </>
                            )}
                    </button>
                    <button
                        onClick={clearOutput}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Editor Container - Takes up 60% of space */}
            <div className="flex-1 min-h-0 relative" style={{ flex: "0 0 60%" }}>
                <div
                    ref={editorRef}
                    className="absolute inset-0 w-full h-full"
                />
            </div>

            {/* Output Console - Takes up 40% of space */}
            <div className="bg-gray-800 border-t border-gray-700 flex-shrink-0" style={{ flex: "0 0 40%" }}>
                <div className="px-4 py-2 border-b border-gray-700">
                    <h4 className="text-white text-sm font-semibold">Output Console</h4>
                </div>
                <div className="p-4 h-full overflow-y-auto text-sm font-mono">
                    {output.length === 0
                        ? (
                            <div className="text-gray-400">Click "Run" to execute your code...</div>
                        )
                        : (
                            output.map((line, index) => (
                                <div key={index} className="text-green-400 mb-1">
                                    {line}
                                </div>
                            ))
                        )}
                </div>
            </div>
        </div>
    )
}
