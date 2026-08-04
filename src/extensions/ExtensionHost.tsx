import { useEffect, useRef } from "react"

import { ExtensionsTitleBar } from "./TitleBar"
import { selectPlaybackStateChangeTimestamp, selectPlaying, selectTracks } from "../daw/dawState"
import { useAppSelector as useSelector } from "../hooks"
import { Log, selectLogs } from "../ide/ideState"
import { Track } from "../types/common"
import { selectColorTheme, selectLocale } from "../app/appState"
import { callbacks, selectExtensionUrl, selectExtensionName, selectExtensionIcon32, selectExtensionPermissions } from "./extensionState"
import { getTempoMap, pasteCode as pasteCodeInEditor } from "./extensionApi"
import * as tabState from "../ide/tabState"
import * as scriptsState from "../browser/scriptsState"
import store from "../reducers"
import * as userState from "../user/userState"
import * as layout from "../ide/layoutState"
import { Collapsed } from "../browser/Utils"
import { useTranslation } from "react-i18next"

// Enough for any reasonable EarSketch script, and small enough that a
// misbehaving extension cannot wedge the editor with a giant string.
const MAX_SCRIPT_LENGTH = 500_000

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
    const extensionNameRef = useRef(extensionName)

    useEffect(() => { logsRef.current = logs }, [logs])
    useEffect(() => { tracksRef.current = tracks }, [tracks])
    useEffect(() => { extensionNameRef.current = extensionName }, [extensionName])
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

    // Handlers receive positional `args`; legacy messages without `args` are
    // passed as a single request object. Each handler validates its arguments.
    const extensionFunctions: { [name: string]: (...args: unknown[]) => unknown } = {
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
        getPlaybackStatus() {
            const state = store.getState()
            return {
                isPlaying: selectPlaying(state),
                lastChangeTimestamp: selectPlaybackStateChangeTimestamp(state),
            }
        },
        getTempoMap,
        pasteCode(codeOrRequest: unknown, lineNumber: unknown) {
            const request = typeof codeOrRequest === "object" && codeOrRequest !== null
                ? codeOrRequest as { code?: unknown, lineNumber?: unknown }
                : { code: codeOrRequest, lineNumber }
            return pasteCodeInEditor(request)
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
        // Opens the given source in a read-only tab, exactly like the copy
        // buttons in the curriculum. Nothing is written to the user's account:
        // they choose whether to keep it with the editor's "import to edit"
        // button.
        openReadOnlyScript(source: unknown, name: unknown, language: unknown) {
            if (typeof source !== "string" || source.length === 0) {
                return { error: "openReadOnlyScript: source must be a non-empty string" }
            }
            if (source.length > MAX_SCRIPT_LENGTH) {
                return { error: `openReadOnlyScript: source exceeds ${MAX_SCRIPT_LENGTH} characters` }
            }
            // Omitted arguments arrive as null, because JSON.stringify turns
            // undefined array entries into null.
            if (name != null && typeof name !== "string") {
                return { error: "openReadOnlyScript: name must be a string" }
            }
            if (language != null && language !== "python" && language !== "javascript") {
                return { error: 'openReadOnlyScript: language must be "python" or "javascript"' }
            }

            const scriptName = callbacks.openReadOnlyScript(
                source,
                name ?? extensionNameRef.current,
                language ?? store.getState().app.scriptLanguage
            )
            return { name: scriptName }
        },
    }

    const isExtensionFunction = (fn: string) => fn in extensionFunctions

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
                // Functions that take no arguments simply ignore these.
                const args: unknown[] = Array.isArray(data.args) ? data.args : [data]

                if (isExtensionFunction(fn)) {
                    result = permissions.includes(fn)
                        ? extensionFunctions[fn](...args)
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
                <ExtensionsTitleBar />
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
            {!paneIsOpen && <Collapsed position="east" title={`${extensionName ? `${t("extensions")}: ${extensionName}` : t("extensions")}`.toLocaleUpperCase()} />}
        </>)
}

export default ExtensionHost
