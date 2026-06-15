import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react"
import { Dialog, Combobox, Transition } from "@headlessui/react"
import { useTranslation } from "react-i18next"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import * as appState from "./appState"
import * as scriptsState from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as curriculum from "../browser/curriculumState"
import * as apiState from "../browser/apiState"
import * as layout from "../ide/layoutState"
import * as soundsState from "../browser/soundsState"
import * as daw from "../daw/dawState"

import { BrowserTabType } from "../browser/BrowserTab"
import { API_DOC, API_FUNCTIONS } from "../api/api"
import * as tabs from "../ide/tabState"
import * as tabThunks from "../ide/tabThunks"
import * as bubble from "../bubble/bubbleState"

import * as user from "../user/userState"
import * as exporter from "./exporter"
import { ProfileEditor } from "./ProfileEditor"
import { openModal } from "./modal"
import { AccountCreator } from "./AccountCreator"
import { ForgotPassword } from "./ForgotPassword"
import { SoundUploader } from "./SoundUploader"
import { openScriptHistory, openCodeIndicator, renameScript, shareScript, downloadScript, deleteScript, deleteSharedScript, submitToCompetition } from "./scriptActions"
import { importScript } from "../browser/scriptsThunks"
import { saveScript, openShare, createScript } from "../ide/IDE"
import { PANEL_SHORTCUTS, navigateTo } from "./App"
import * as editor from "../ide/Editor"
import * as ESUtils from "../esutils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
    id: string
    title: string
    subtitle?: string
    category: string
    action: () => void | Promise<void>
    icon?: string
    /** Pre-computed lowercase string used for filtering. Never shown in UI. */
    searchKey: string
}

interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
    email: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SOUNDS = 50
const MAX_CURRICULUM = 20
const DEBOUNCE_MS = 150

// ─── Component ────────────────────────────────────────────────────────────────

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, email }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    // Store onClose in a ref so it never appears in memo/effect dependency arrays.
    // This prevents appCommandIndex from rebuilding on every render when the
    // parent re-renders and passes a new function reference for onClose.
    const onCloseRef = useRef<() => void>(onClose)
    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    // ── Selectors ──────────────────────────────────────────────────────────
    const openTabIDs = useSelector(tabs.selectOpenTabs)
    const allScripts = useSelector(scriptsState.selectAllScripts)
    const regularScripts = useSelector(scriptsState.selectRegularScripts)
    const sharedScripts = useSelector(scriptsState.selectSharedScripts)
    const standardSoundNames = useSelector((state: any) => state.sounds.standardSounds.names as string[])
    const standardSoundEntities = useSelector((state: any) => state.sounds.standardSounds.entities as Record<string, any>)
    const userSoundNames = useSelector((state: any) => state.sounds.userSounds.names as string[])
    const userSoundEntities = useSelector((state: any) => state.sounds.userSounds.entities as Record<string, any>)
    const loggedIn = useSelector(user.selectLoggedIn)
    const username = useSelector(user.selectUserName) ?? ""
    const isPlaying = useSelector(daw.selectPlaying)

    const activeTabScript = useSelector(tabs.selectActiveTabScript)
    const colorTheme = useSelector(appState.selectColorTheme)
    // Curriculum: use the existing lunr-backed selector by keeping searchText in sync
    const curriculumResults = useSelector(curriculum.selectSearchResults)

    // ── Focus input on open; reset query on close ──────────────────────────
    // Driven by isOpen so the component can stay persistently mounted.
    // rAF lets the Dialog's focus trap settle before we steal focus,
    // avoiding an infinite focus loop between autoFocus and the Dialog trap.
    useEffect(() => {
        if (isOpen) {
            const id = window.requestAnimationFrame(() => {
                inputRef.current?.focus()
            })
            return () => window.cancelAnimationFrame(id)
        } else {
            setQuery("")
            setDebouncedQuery("")
            dispatch(curriculum.setSearchText(""))
        }
    }, [isOpen, dispatch])

    // ── Debounce ───────────────────────────────────────────────────────────
    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebouncedQuery(query)
            // Drive the existing lunr index via the curriculum slice's own search text.
            // This way we reuse the already-built lunr index at zero extra cost.
            dispatch(curriculum.setSearchText(query))
        }, DEBOUNCE_MS)
        return () => window.clearTimeout(id)
    }, [query, dispatch])

    // ── Static app-command index ───────────────────────────────────────────
    // Only contains the small fixed set of app commands and API functions.
    // Scripts, sounds, and curriculum are all filtered lazily in filteredCommands.
    const appCommandIndex = useMemo((): CommandItem[] => {
        const cmds: CommandItem[] = []

        // API functions — small fixed list, fine to include in static index
        for (const funcName of Object.keys(API_FUNCTIONS)) {
            cmds.push({
                id: `api-${funcName}`,
                title: `${funcName}()`,
                subtitle: "EarSketch API function",
                category: "API",
                action: () => {
                    // Open the API tab in the content manager (clear any existing search text)
                    dispatch(layout.setWest({ open: true, kind: BrowserTabType.API }))
                    dispatch(apiState.setSearchText(""))
                    // Expand the entry by mutating obj.details (same pattern the API browser uses)
                    const docEntries = API_DOC[funcName]
                    if (docEntries) {
                        docEntries.forEach((obj: any) => { obj.details = true })
                    }
                    // After React re-renders, scroll the panel so the entry is near the top, then focus it
                    window.setTimeout(() => {
                        const panel = document.getElementById(`panel-${BrowserTabType.API}`)
                        const span = document.querySelector<HTMLElement>(`[data-api-entry="${funcName}"]`)
                        if (panel && span) {
                            // Walk up to the entry's container div (direct child of the panel)
                            let entry: HTMLElement = span
                            while (entry.parentElement && entry.parentElement !== panel) {
                                entry = entry.parentElement
                            }
                            panel.scrollTop = entry.offsetTop - panel.offsetTop
                        }
                        span?.focus()
                    }, 100)
                    onCloseRef.current()
                },
                icon: "icon-code",
                searchKey: `api function earsketch ${funcName}`.toLowerCase(),
            })
        }

        // ── App commands ────────────────────────────────────────────────────
        const isMac = ESUtils.whichOS() === "MacOS"
        const scriptName = activeTabScript?.name ?? ""
        const scriptType: "regular" | "shared" | "readonly" =
            activeTabScript
                ? (activeTabScript.readonly ? "readonly" : activeTabScript.isShared ? "shared" : "regular")
                : "regular"

        // Play / Pause — always available (mirrors Ctrl+Space shortcut)
        cmds.push({
            id: "play-pause",
            title: isPlaying ? t("daw.tooltip.pause") : t("daw.tooltip.play"),
            subtitle: "Ctrl+Space",
            category: "Commands",
            action: () => {
                // Simulate Ctrl+Space which the DAW already listens for
                window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", ctrlKey: true, bubbles: true }))
                onCloseRef.current()
            },
            icon: isPlaying ? "icon-pause2" : "icon-play4",
            searchKey: "play pause daw audio commands",
        })

        // Script-dependent commands — only shown when a script tab is open
        if (activeTabScript) {
            cmds.push(
                {
                    id: "run-script",
                    title: `${t("shortcuts.run")} (${scriptName})`,
                    subtitle: isMac ? "Cmd+Enter" : "Ctrl+Enter",
                    category: "Commands",
                    action: () => {
                        callbacks.runScript()
                        onCloseRef.current()
                    },
                    icon: "icon-arrow-right22",
                    searchKey: `run execute script code commands ${scriptName}`.toLowerCase(),
                },
                {
                    id: "save-script",
                    title: `${t("shortcuts.save")} (${scriptName})`,
                    subtitle: isMac ? "Cmd+S" : "Ctrl+S",
                    category: "Commands",
                    action: () => {
                        saveScript()
                        onCloseRef.current()
                    },
                    icon: "icon-floppy-disk",
                    searchKey: `save script file commands ${scriptName}`.toLowerCase(),
                },
                {
                    id: "download-script",
                    title: `${t("script.download")} (${scriptName})`,
                    subtitle: t("script.download"),
                    category: "Commands",
                    action: () => { downloadScript(activeTabScript); onCloseRef.current() },
                    icon: "icon-cloud-download",
                    searchKey: `download script export commands ${scriptName}`.toLowerCase(),
                },
                {
                    id: "print-script",
                    title: `${t("script.print")} (${scriptName})`,
                    subtitle: t("script.print"),
                    category: "Commands",
                    action: () => { exporter.print(activeTabScript); onCloseRef.current() },
                    icon: "icon-printer",
                    searchKey: `print script commands ${scriptName}`.toLowerCase(),
                },
                {
                    id: "script-analysis",
                    title: `${t("script.codeIndicator")} (${scriptName})`,
                    subtitle: t("script.codeIndicator"),
                    category: "Commands",
                    action: () => { openCodeIndicator(activeTabScript); onCloseRef.current() },
                    icon: "icon-info",
                    searchKey: `code indicator analysis analyze complexity commands ${scriptName}`.toLowerCase(),
                }
            )

            // Copy (regular only)
            if (scriptType === "regular") {
                cmds.push({
                    id: "copy-script",
                    title: `${t("script.copy")} (${scriptName})`,
                    subtitle: t("script.copy"),
                    category: "Commands",
                    action: () => {
                        dispatch(scriptsThunks.saveScript({ name: activeTabScript.name, source: activeTabScript.source_code, overwrite: false }))
                        onCloseRef.current()
                    },
                    icon: "icon-copy",
                    searchKey: `copy duplicate script commands ${scriptName}`.toLowerCase(),
                })
            }

            // Rename (regular only)
            if (scriptType === "regular") {
                cmds.push({
                    id: "rename-script",
                    title: `${t("script.rename")} (${scriptName})`,
                    subtitle: t("script.rename"),
                    category: "Commands",
                    action: () => { renameScript(activeTabScript); onCloseRef.current() },
                    icon: "icon-pencil2",
                    searchKey: `rename script commands ${scriptName}`.toLowerCase(),
                })
            }

            // Share (regular + logged in)
            if (scriptType === "regular" && loggedIn) {
                cmds.push({
                    id: "share-script",
                    title: `${t("script.share")} (${scriptName})`,
                    subtitle: t("script.share"),
                    category: "Commands",
                    action: () => { shareScript(activeTabScript); onCloseRef.current() },
                    icon: "icon-share32",
                    searchKey: `share script collaborate commands ${scriptName}`.toLowerCase(),
                })
            }

            // History (regular + shared, requires login)
            if (scriptType !== "readonly" && loggedIn) {
                cmds.push({
                    id: "script-history",
                    title: `${t("script.history")} (${scriptName})`,
                    subtitle: t("script.history"),
                    category: "Commands",
                    action: () => { openScriptHistory(activeTabScript, !activeTabScript.isShared); onCloseRef.current() },
                    icon: "icon-history",
                    searchKey: `history version revert script commands ${scriptName}`.toLowerCase(),
                })
            }

            // Import (shared + readonly only)
            if (scriptType === "shared" || scriptType === "readonly") {
                cmds.push({
                    id: "import-script",
                    title: `${t("script.import")} (${scriptName})`,
                    subtitle: t("script.import"),
                    category: "Commands",
                    action: () => { importScript(activeTabScript); onCloseRef.current() },
                    icon: "icon-import",
                    searchKey: `import script commands ${scriptName}`.toLowerCase(),
                })
            }

            // Delete (regular + shared, not readonly)
            if (scriptType !== "readonly") {
                cmds.push({
                    id: "delete-script",
                    title: `${t("script.delete")} (${scriptName})`,
                    subtitle: t("script.delete"),
                    category: "Commands",
                    action: () => {
                        if (scriptType === "regular") deleteScript(activeTabScript)
                        else deleteSharedScript(activeTabScript)
                        onCloseRef.current()
                    },
                    icon: "icon-bin",
                    searchKey: `delete remove script commands ${scriptName}`.toLowerCase(),
                })
            }

            // Submit to competition (regular + logged in + feature flag)
            if (scriptType === "regular" && loggedIn && ES_WEB_SHOW_COMPETITION_SUBMIT) {
                cmds.push({
                    id: "submit-competition",
                    title: `${t("script.submitCompetition")} (${scriptName})`,
                    subtitle: t("script.submitCompetition"),
                    category: "Commands",
                    action: () => { submitToCompetition(activeTabScript); onCloseRef.current() },
                    icon: "icon-earth",
                    searchKey: `submit competition script commands ${scriptName}`.toLowerCase(),
                })
            }
        }

        // Edit Profile (logged in only)
        if (loggedIn) {
            cmds.push({
                id: "edit-profile",
                title: t("editProfile"),
                subtitle: t("editProfile"),
                category: "Commands",
                action: () => { openModal(ProfileEditor, { username, email }); onCloseRef.current() },
                icon: "icon-user",
                searchKey: "edit profile account settings commands",
            })
        }

        // ── General commands (always visible) ───────────────────────────────
        cmds.push(
            {
                id: "new-script",
                title: t("newScript"),
                subtitle: t("newScript"),
                category: "Commands",
                action: () => { createScript(); onCloseRef.current() },
                icon: "icon-plus2",
                searchKey: "new script create file commands",
            },
            {
                id: "toggle-theme",
                title: t("switchThemeLight"),
                subtitle: colorTheme === "light" ? t("switchThemeLight") : t("switchThemeDark"),
                category: "Commands",
                action: () => { dispatch(appState.setColorTheme(colorTheme === "light" ? "dark" : "light")); onCloseRef.current() },
                icon: "icon-brightness-contrast",
                searchKey: "toggle theme dark light appearance settings commands",
            },
            {
                id: "start-tutorial",
                title: t("startQuickTour"),
                subtitle: t("startQuickTour"),
                category: "Commands",
                action: () => { dispatch(bubble.reset()); dispatch(bubble.resume()); onCloseRef.current() },
                icon: "icon-info",
                searchKey: "start quick tour tutorial help guide commands",
            },
            {
                id: "upload-sound",
                title: t("soundBrowser.button.addSound"),
                subtitle: t("soundBrowser.button.addSound"),
                category: "Commands",
                action: () => {
                    if (loggedIn) openModal(SoundUploader)
                    onCloseRef.current()
                },
                icon: "icon-plus2",
                searchKey: "upload add sound audio file commands",
            }
        )

        // ── Panel navigation commands ────────────────────────────────────────
        const panelLabels: Record<string, { title: string, icon: string, searchKey: string }> = {
            1: { title: t("soundBrowser.title"), icon: "icon-music", searchKey: "sounds browser panel navigate" },
            2: { title: t("scriptBrowser.myScripts"), icon: "icon-file-text2", searchKey: "scripts browser panel navigate" },
            3: { title: t("contentManager.openTab", { name: "API" }), icon: "icon-code", searchKey: "api browser panel navigate" },
            4: { title: t("daw.title"), icon: "icon-music", searchKey: "daw digital audio workstation panel navigate" },
            5: { title: t("editor.title"), icon: "icon-pencil2", searchKey: "editor code panel navigate" },
            6: { title: t("curriculum.title"), icon: "icon-book", searchKey: "curriculum panel navigate" },
            7: { title: t("ariaDescriptors:skipLink.daw"), icon: "icon-equalizer", searchKey: "utilities panel navigate" },
        }
        Object.entries(PANEL_SHORTCUTS).forEach(([key, entry]) => {
            const label = panelLabels[key]
            if (!label) return
            cmds.push({
                id: `navigate-panel-${key}`,
                title: `${t("thing.open")}: ${label.title}`,
                subtitle: `Ctrl+${key}`,
                category: "Navigate",
                action: () => { navigateTo(entry); onCloseRef.current() },
                icon: label.icon,
                searchKey: `${label.searchKey} ctrl ${key} navigate go to commands`,
            })
        })

        if (!loggedIn) {
            cmds.push(
                {
                    id: "create-account",
                    title: t("registerAccount"),
                    subtitle: t("registerAccount"),
                    category: "Commands",
                    action: () => { openModal(AccountCreator); onCloseRef.current() },
                    icon: "icon-user-plus",
                    searchKey: "create account signup register commands",
                },
                {
                    id: "forgot-password",
                    title: t("forgotPassword.title"),
                    subtitle: t("forgotPassword.title"),
                    category: "Commands",
                    action: () => { openModal(ForgotPassword); onCloseRef.current() },
                    icon: "icon-key",
                    searchKey: "forgot password reset recover account commands",
                }
            )
        }

        return cmds
    }, [loggedIn, username, email, isPlaying, activeTabScript, colorTheme, dispatch, t])

    // ── Open tabs index ────────────────────────────────────────────────────
    // Built separately so it can be shown at the top with no query typed.
    const openTabCommands = useMemo((): CommandItem[] => {
        return openTabIDs.flatMap(id => {
            const script = allScripts[id]
            if (!script) return []
            return [{
                id: `open-tab-${id}`,
                title: script.name,
                subtitle: script.isShared ? `Shared by ${script.username}` : `by ${script.creator || script.username}`,
                category: "Open Tabs",
                action: () => {
                    dispatch(tabThunks.setActiveTabAndEditor(id))
                    // Close the palette first, then focus the editor on the next frame
                    onCloseRef.current()
                    window.requestAnimationFrame(() => editor.focus())
                },
                icon: "icon-file-text2",
                searchKey: `open tab script ${script.name} ${script.creator ?? ""} ${script.username}`.toLowerCase(),
            }]
        })
    }, [openTabIDs, allScripts, dispatch])

    // ── Filtered results ───────────────────────────────────────────────────
    // When query is empty, show open tabs + all app commands as the default list.
    const filteredCommands = useMemo((): CommandItem[] => {
        if (!debouncedQuery.trim()) return [...openTabCommands, ...appCommandIndex]
        const q = debouncedQuery.toLowerCase()

        // 1. App commands + API: cheap substring filter on pre-built keys
        const results: CommandItem[] = appCommandIndex.filter(item => item.searchKey.includes(q))

        // 2. Open tabs — always searched first since they're the most likely target
        for (const cmd of openTabCommands) {
            if (cmd.searchKey.includes(q)) results.push(cmd)
        }

        // 3. Scripts: filter lazily, capped to avoid iterating thousands of entries
        const MAX_SCRIPTS = 50
        let scriptCount = 0
        for (const script of Object.values(regularScripts)) {
            if (scriptCount >= MAX_SCRIPTS) break
            if (script.soft_delete) continue
            // Skip scripts already shown in Open Tabs
            if (openTabIDs.includes(script.shareid)) continue
            const key = `scripts script file code ${script.name} ${script.creator ?? ""} ${script.username}`.toLowerCase()
            if (key.includes(q)) {
                results.push({
                    id: `script-${script.shareid}`,
                    title: script.name,
                    subtitle: `by ${script.creator || script.username}`,
                    category: "Scripts",
                    action: () => { dispatch(tabThunks.setActiveTabAndEditor(script.shareid)); onCloseRef.current() },
                    icon: "icon-file-text2",
                    searchKey: key,
                })
                scriptCount++
            }
        }

        // Shared scripts (skip those already in Open Tabs)
        for (const script of Object.values(sharedScripts)) {
            if (openTabIDs.includes(script.shareid)) continue
            const key = `shared scripts script file ${script.name} ${script.username}`.toLowerCase()
            if (key.includes(q)) {
                results.push({
                    id: `shared-${script.shareid}`,
                    title: script.name,
                    subtitle: `Shared by ${script.username}`,
                    category: "Shared Scripts",
                    action: async () => { await openShare(script.shareid); dispatch(tabThunks.setActiveTabAndEditor(script.shareid)); onCloseRef.current() },
                    icon: "icon-share2",
                    searchKey: key,
                })
            }
        }

        // 3. Sounds: filter lazily here — never stored in index — capped at MAX_SOUNDS
        let soundCount = 0
        for (const name of standardSoundNames) {
            if (soundCount >= MAX_SOUNDS) break
            const s = standardSoundEntities[name]
            if (!s) continue
            const key = `${s.name} ${s.artist ?? ""} ${s.genre ?? ""} ${s.instrument ?? ""} ${s.folder ?? ""}`.toLowerCase()
            if (key.includes(q)) {
                results.push({
                    id: `sound-${name}`,
                    title: s.name,
                    subtitle: `${s.artist} – ${s.genre} (${s.instrument})`,
                    category: "Sounds",
                    action: () => {
                        dispatch(layout.setWest({ open: true, kind: BrowserTabType.Sound }))
                        dispatch(appState.setShowSoundPreviewWidget(true))
                        dispatch(soundsState.setAuditionRequest(s.name))
                        onCloseRef.current()
                    },
                    icon: "icon-music",
                    searchKey: key,
                })
                soundCount++
            }
        }

        // User sounds
        for (const name of userSoundNames) {
            const s = userSoundEntities[name]
            if (!s) continue
            if (s.name.toLowerCase().includes(q)) {
                results.push({
                    id: `user-sound-${name}`,
                    title: s.name,
                    subtitle: "Your uploaded sound",
                    category: "My Sounds",
                    action: () => {
                        dispatch(layout.setWest({ open: true, kind: BrowserTabType.Sound }))
                        dispatch(appState.setShowSoundPreviewWidget(true))
                        dispatch(soundsState.setAuditionRequest(s.name))
                        onCloseRef.current()
                    },
                    icon: "icon-music",
                    searchKey: s.name.toLowerCase(),
                })
            }
        }

        // 3. Curriculum: lunr already did the work via selectSearchResults —
        //    just map the results into CommandItems, capped at MAX_CURRICULUM.
        const currSlice = curriculumResults.slice(0, MAX_CURRICULUM)
        for (const result of currSlice) {
            results.push({
                id: `curriculum-${result.id}`,
                title: result.title,
                subtitle: result.text,
                category: "Curriculum",
                action: () => {
                    dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
                    // Signal Curriculum.tsx to focus the first heading once the new
                    // content is appended. Set this before fetchContent so the flag
                    // is in place before any navigation state changes are applied.
                    dispatch(curriculum.setFocusPending(true))
                    dispatch(curriculum.fetchContent({ url: result.id }))
                    onCloseRef.current()
                },
                icon: "icon-book",
                searchKey: result.title.toLowerCase(),
            })
        }

        return results
    }, [
        debouncedQuery,
        appCommandIndex,
        openTabCommands, openTabIDs,
        regularScripts, sharedScripts,
        standardSoundNames, standardSoundEntities,
        userSoundNames, userSoundEntities,
        curriculumResults,
        dispatch,
    ])

    // ── Group for display ──────────────────────────────────────────────────
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {}
        for (const cmd of filteredCommands) {
            if (!groups[cmd.category]) groups[cmd.category] = []
            groups[cmd.category].push(cmd)
        }
        // Sort so Commands always appears first, then all other categories alphabetically
        const CATEGORY_ORDER: Record<string, number> = { "Open Tabs": 0, Commands: 1, Navigate: 2 }
        return Object.fromEntries(
            Object.entries(groups).sort(([a], [b]) => {
                const aOrder = CATEGORY_ORDER[a] ?? 2
                const bOrder = CATEGORY_ORDER[b] ?? 2
                if (aOrder !== bOrder) return aOrder - bOrder
                return a.localeCompare(b)
            })
        )
    }, [filteredCommands])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Escape") onCloseRef.current()
    }, [])

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose} unmount={false}>
            <Transition appear show={isOpen} as={Fragment}>
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 pt-16">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
                                <Combobox onChange={(item: CommandItem | null) => item?.action()}>
                                    <div className="relative">
                                        {/* Search input */}
                                        <div className="flex items-center border-b dark:border-gray-600 px-4">
                                            <i className="icon icon-search text-gray-400 mr-3 flex-shrink-0" />
                                            <Combobox.Input
                                                ref={inputRef}
                                                className="h-12 w-full border-0 bg-transparent pl-0 pr-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0 outline-none"
                                                placeholder="Search scripts, sounds, API, curriculum…"
                                                value={query}
                                                onChange={e => setQuery(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                            />
                                            {query && (
                                                <button
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 ml-2"
                                                    onClick={() => setQuery("")}
                                                    tabIndex={-1}
                                                >
                                                    <i className="icon icon-cross2 text-sm" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Results */}
                                        <Combobox.Options static className="max-h-96 scroll-py-2 overflow-y-auto py-2">
                                            {Object.keys(groupedCommands).length === 0
                                                ? (
                                                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        No results for &quot;{debouncedQuery}&quot;
                                                    </div>
                                                )
                                                : Object.entries(groupedCommands).map(([category, items]) => (
                                                    <div key={category} className="mb-2">
                                                        <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                            {category}
                                                        </div>
                                                        {items.map(item => (
                                                            <Combobox.Option
                                                                key={item.id}
                                                                value={item}
                                                                className={({ active }) =>
                                                                    `cursor-pointer select-none px-4 py-2 flex items-center ${active ? "bg-blue-600 text-white" : "text-gray-900 dark:text-gray-100"}`}
                                                            >
                                                                {({ active }) => (
                                                                    <>
                                                                        <span className="mr-3 text-lg flex-shrink-0 w-[1em] text-center inline-block">
                                                                            {item.icon && (
                                                                                <i className={`${item.icon} ${active ? "text-white" : "text-gray-400"}`} />
                                                                            )}
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium truncate">{item.title}</div>
                                                                            {item.subtitle && (
                                                                                <div className={`text-sm truncate ${active ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                                                                                    {item.subtitle}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </Combobox.Option>
                                                        ))}
                                                    </div>
                                                ))}
                                        </Combobox.Options>
                                    </div>
                                </Combobox>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Transition>
        </Dialog>
    )
}

// ─── Callbacks ───────────────────────────────────────────────────────────────
// Set by IDE.tsx after it initializes, same pattern as bubble/Bubble.tsx
export const callbacks = {
    runScript: () => {},
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false)
    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    return { isOpen, openCommandPalette: open, closeCommandPalette: close }
}
