import { useEffect, useRef, useState } from "react"

import { TitleBar } from "../browser/Curriculum"
import { selectTracks } from "../daw/dawState"
import { useAppSelector as useSelector } from "../hooks"
import * as editor from "../ide/Editor"
import { Log, selectLogs } from "../ide/ideState"
import { Track } from "../types/common"
import { selectColorTheme } from "../app/appState"

export const ExtensionHost = () => {
    const [extensionUrl, setExtensionUrl] = useState<string>("")
    const extensionTargetOrigin = new URL(extensionUrl, window.location.href).origin
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const logs: Log[] = useSelector(selectLogs)
    const tracks: Track[] = useSelector(selectTracks)
    const colorTheme = useSelector(selectColorTheme)

    const logsRef = useRef(logs)
    const tracksRef = useRef(tracks)
    const colorThemeRef = useRef(colorTheme)

    useEffect(() => { logsRef.current = logs }, [logs])
    useEffect(() => { tracksRef.current = tracks }, [tracks])
    useEffect(() => {
        colorThemeRef.current = colorTheme
        if (iframeRef.current?.contentWindow) {
            const message = {
                messageType: "colorThemeChanged",
                colorTheme: colorThemeRef.current,
            }
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify(message), "*") // TODO extensionTargetOrigin isn't working for remote html
            }
        }
    }, [colorTheme])

    const extensionFunctions: { [key: string]: (...args: any[]) => void } = {
        getEditorContents() {
            // TODO use instead:
            // const script = scriptsState.selectAllScripts(store.getState())[scriptID!]
            // const code = script.source_code
            return editor.getContents()
        },
        getScriptExecutionResult() {
            const currentLogs = logsRef.current
            return JSON.stringify({
                output: currentLogs,
            })
        },
        getDawState() {
            const currentTracks = tracksRef.current
            // TODO return a cleaned version of the daw state that can be serialized
            return JSON.stringify(currentTracks)
        },
        getColorTheme() {
            const currentColorTheme = colorThemeRef.current
            return currentColorTheme
        },
    }

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const isFromLocalOriginIframe = event.source === iframeRef.current?.contentWindow
            const isFromRemoteOriginIframe = event.origin === extensionTargetOrigin && event.origin !== window.location.origin

            if (isFromLocalOriginIframe || isFromRemoteOriginIframe) {
                console.log("Received message from iframe:", event.data)
                const data = JSON.parse(event.data)
                const result = extensionFunctions[data.fn](...(data.args ?? []))

                // event.source!.postMessage(JSON.stringify(result), event.origin) // TODO this works but typscript is complaining about the event.origin type
                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(JSON.stringify(result), "*") // TODO extensionTargetOrigin isn't working for remote html
                } else {
                    console.warn("iframe contentWindow is not available")
                }
            }
        }
        window.addEventListener("message", onMessage)
        return () => { window.removeEventListener("message", onMessage) }
    }, [])

    return (<>
        <TitleBar />
        <div>
            <button
                style={{ margin: "3px 10px", padding: "1px 10px", borderRadius: "5px", color: "black", fontSize: "0.7rem", border: "1px solid black" }}
                onClick={() => {
                    const url = "myExtension.html"
                    const element = document.getElementById("extension-url-input") as HTMLInputElement
                    element.value = url
                }}>PASTE DEMO URL</button>
        </div><div>
            <input
                id="extension-url-input"
                type="text"
                placeholder="Extension URL"
                style={{ width: "300px", margin: "10px", padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "0.7rem" }} />
        </div><div>
            <button
                style={{ margin: "10px", padding: "10px", borderRadius: "5px", color: "black", fontSize: "0.7rem", border: "1px solid black" }}
                onClick={() => {
                    setExtensionUrl((document.getElementById("extension-url-input") as HTMLInputElement).value)
                }}>LOAD</button>
            <button
                style={{ margin: "10px", padding: "10px", borderRadius: "5px", color: "black", fontSize: "0.7rem", border: "1px solid black" }}
                onClick={() => {
                    setExtensionUrl("")
                }}>UNLOAD</button>
        </div>
        <div style={{ padding: "10px" }}>{extensionUrl}</div>
        <iframe
            ref={iframeRef}
            src={extensionUrl}
            onLoad={() => { iframeRef.current?.contentWindow?.postMessage("init", extensionTargetOrigin) }}
            style={{
                width: "100%",
                height: "400px",
                border: "1px solid #ccc",
            }}
            title="EarSketch Extension"
        />
    </>)
}

export default ExtensionHost
