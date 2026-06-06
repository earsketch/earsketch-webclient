import { useEffect, useRef } from "react"

import { TitleBar } from "../browser/Curriculum"
import { selectTracks } from "../daw/dawState"
import { useAppSelector as useSelector } from "../hooks"
import { Log, selectLogs } from "../ide/ideState"
import { Track } from "../types/common"
import { selectColorTheme, selectLocale } from "../app/appState"
import { selectExtensionUrl, selectExtensionName, selectExtensionIcon32, selectExtensionPermissions } from "./extensionState"
import * as tabState from "../ide/tabState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import * as userState from "../user/userState"
import * as layout from "../ide/layoutState"
import { Collapsed } from "../browser/Utils"
import { useTranslation } from "react-i18next"

export const ExtensionHost = () => {
    const extensionUrl = useSelector(selectExtensionUrl)
    const extensionTargetOrigin = extensionUrl ? new URL(extensionUrl).origin : ""
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const logs: Log[] = useSelector(selectLogs)
    const tracks: Track[] = useSelector(selectTracks)
    const colorTheme = useSelector(selectColorTheme)
    const currentUser = useSelector(userState.selectUserName)
    const currentLocale = useSelector(selectLocale)
    const extensionName = useSelector(selectExtensionName)
    const extensionIcon32 = useSelector(selectExtensionIcon32)
    const extensionPermissions = useSelector(selectExtensionPermissions)
    const paneIsOpen = useSelector(layout.isEastOpen)
    const { t } = useTranslation()

    const logsRef = useRef(logs)
    const tracksRef = useRef(tracks)
    const colorThemeRef = useRef(colorTheme)
    const currentUserRef = useRef(currentUser)
    const extensionPermissionsRef = useRef(extensionPermissions)
    const extensionTargetOriginRef = useRef(extensionTargetOrigin)

    useEffect(() => { logsRef.current = logs }, [logs])
    useEffect(() => { tracksRef.current = tracks }, [tracks])
    useEffect(() => { extensionPermissionsRef.current = extensionPermissions }, [extensionPermissions])
    useEffect(() => { extensionTargetOriginRef.current = extensionTargetOrigin }, [extensionTargetOrigin])
    useEffect(() => {
        colorThemeRef.current = colorTheme
        if (iframeRef.current?.contentWindow && extensionPermissions.includes("colorTheme")) {
            const message = {
                messageType: "colorThemeChanged",
                colorTheme: colorThemeRef.current,
            }
            if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify(message), extensionTargetOriginRef.current)
            }
        }
    }, [colorTheme, extensionPermissions])
    useEffect(() => {
        currentUserRef.current = currentUser || "" // TODO add a test for this being "" when currentUser is null
        if (iframeRef.current?.contentWindow && extensionPermissions.includes("currentUser")) {
            const message = {
                messageType: "currentUserChanged",
                currentUser: currentUserRef.current,
            }
            iframeRef.current.contentWindow.postMessage(JSON.stringify(message), extensionTargetOriginRef.current)
        }
    }, [currentUser, extensionPermissions])

    const extensionFunctions = {
        getEditorContents() {
            const activeTab = tabState.selectActiveTabID(store.getState())
            if (!activeTab) return ""
            const script = scriptsState.selectAllScripts(store.getState())[activeTab!]
            return script ? script.source_code : ""
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
                return null
            } else {
                const currentUser = userState.selectUserName(store.getState())
                return currentUser
            }
        },
    }

    const isExtensionFunction = (fn: string): fn is keyof typeof extensionFunctions => fn in extensionFunctions

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const isFromLocalOriginIframe = event.source === iframeRef.current?.contentWindow
            const isFromRemoteOriginIframe = event.origin === extensionTargetOriginRef.current && event.origin !== window.location.origin

            if (isFromLocalOriginIframe || isFromRemoteOriginIframe) {
                console.log("Received message from iframe:", event.data)
                const data = JSON.parse(event.data)

                let result: any
                const permissions = extensionPermissionsRef.current

                const fn: string = data.fn
                if (isExtensionFunction(fn)) {
                    result = permissions.includes(fn)
                        ? extensionFunctions[fn]()
                        : { error: `Permission denied: ${fn}` }
                } else {
                    result = { error: `Unknown function: ${fn}` }
                }

                if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage(JSON.stringify(result), extensionTargetOriginRef.current)
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
                <TitleBar isCurriculumPane={false} />
                <div className="w-full flex justify-between items-stretch select-none text-white bg-blue">
                    <div className="flex items-center gap-2 p-2.5 text-amber">
                        {extensionIcon32 && <img src={extensionIcon32} alt="" className="w-5 h-5 border border-gray-300 dark:border-gray-400 rounded" />}
                        <span>{extensionName.toLocaleUpperCase()}</span>
                    </div>
                </div>

                <iframe
                    ref={iframeRef}
                    src={extensionPermissions.includes("sidePanel") ? extensionUrl : undefined}
                    onLoad={() => { iframeRef.current?.contentWindow?.postMessage("init", extensionTargetOriginRef.current) }}
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
