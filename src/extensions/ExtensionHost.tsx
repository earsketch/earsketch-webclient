import { useEffect, useRef } from "react"

import { TitleBar } from "../browser/Curriculum"
import { selectTracks } from "../daw/dawState"
import { useAppSelector as useSelector } from "../hooks"
import { Log, selectLogs } from "../ide/ideState"
import { Track } from "../types/common"
import { selectColorTheme, selectExtensionUrl, selectLocale, selectExtensionName, selectExtensionIcon32 } from "../app/appState"
import * as tabState from "../ide/tabState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import * as userState from "../user/userState"
import * as layout from "../ide/layoutState"
import { Collapsed } from "../browser/Utils"
import { useTranslation } from "react-i18next"

export const ExtensionHost = () => {
    const extensionUrl = useSelector(selectExtensionUrl)
    const extensionTargetOrigin = new URL(extensionUrl, window.location.href).origin
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const logs: Log[] = useSelector(selectLogs)
    const tracks: Track[] = useSelector(selectTracks)
    const colorTheme = useSelector(selectColorTheme)
    const currentUser = useSelector(userState.selectUserName)
    const currentLocale = useSelector(selectLocale)
    const extensionName = useSelector(selectExtensionName)
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const { t } = useTranslation()

    const logsRef = useRef(logs)
    const tracksRef = useRef(tracks)
    const colorThemeRef = useRef(colorTheme)
    const currentUserRef = useRef(currentUser)

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
    useEffect(() => {
        currentUserRef.current = currentUser || "" // TODO add a test for this being "" when currentUser is null
        if (iframeRef.current?.contentWindow) {
            const message = {
                messageType: "currentUserChanged",
                currentUser: currentUserRef.current,
            }
            iframeRef.current.contentWindow.postMessage(JSON.stringify(message), "*")
        }
    }, [currentUser])

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
        getCurrentUser() {
            if (!userState.selectLoggedIn(store.getState())) {
                return ""
            } else {
                const currentUser = userState.selectUserName(store.getState())
                return currentUser
            }
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

    return (
        <>
            <div dir={currentLocale.direction} className={`h-full ${paneIsOpen ? "" : "hidden"}`}>
                <TitleBar />
                <div className="w-full flex justify-between items-stretch select-none text-white bg-blue">
                    <div className="flex items-center gap-2 p-2.5 text-amber">
                        {extensionIcon32 && <img src={extensionIcon32} alt="" className="w-5 h-5 border border-gray-300 dark:border-gray-400 rounded" />}
                        <span>{extensionName.toLocaleUpperCase()}</span>
                    </div>
                </div>

                <iframe
                    ref={iframeRef}
                    src={extensionUrl}
                    onLoad={() => { iframeRef.current?.contentWindow?.postMessage("init", extensionTargetOrigin) }}
                    className="w-full h-full border border-gray-300"
                    title="EarSketch Extension"
                />
            </div>
            {!paneIsOpen &&
              <Collapsed title={t("extension.collapsedTitle", { extensionName }).toLocaleUpperCase()} position="east"
            />}
        </>)
}

export default ExtensionHost
