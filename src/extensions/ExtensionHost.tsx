import { useEffect, useRef, useState } from "react"

import { TitleBar } from "../browser/Curriculum"
import { selectTracks } from "../daw/dawState"
import { useAppSelector as useSelector } from "../hooks"
import * as editor from "../ide/Editor"
import { Log, selectLogs } from "../ide/ideState"
import { Track } from "../types/common"
import { selectColorTheme } from "../app/appState"
import * as tabState from "../ide/tabState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"

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
            const activeTab = tabState.selectActiveTabID(store.getState())
            const script = scriptsState.selectAllScripts(store.getState())[activeTab!]
            return script.source_code
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
                className="mx-2.5 my-1 px-2.5 py-px rounded-md text-black text-xs border border-black"
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
                className="w-72 m-2.5 p-2.5 rounded-md border border-gray-300 text-xs" />
        </div><div>
            <button
                className="m-2.5 p-2.5 rounded-md text-black text-xs border border-black"
                onClick={() => {
                    setExtensionUrl((document.getElementById("extension-url-input") as HTMLInputElement).value)
                }}>LOAD</button>
            <button
                className="m-2.5 p-2.5 rounded-md text-black text-xs border border-black"
                onClick={() => {
                    setExtensionUrl("")
                }}>UNLOAD</button>
        </div>
        <div className="p-2.5">{extensionUrl}</div>
        <iframe
            ref={iframeRef}
            src={extensionUrl}
            onLoad={() => { iframeRef.current?.contentWindow?.postMessage("init", extensionTargetOrigin) }}
            className="w-full h-96 border border-gray-300"
            title="EarSketch Extension"
        />
    </>)
}

export default ExtensionHost
