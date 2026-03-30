import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react"
import { Dialog, Combobox, Transition } from "@headlessui/react"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import * as appState from "./appState"
import * as scriptsState from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"
import * as curriculum from "../browser/curriculumState"
import * as tabs from "../ide/tabState"
import * as tabThunks from "../ide/tabThunks"
import * as bubble from "../bubble/bubbleState"
import * as user from "../user/userState"
import { API_FUNCTIONS } from "../api/api"
import { openModal } from "./modal"
import { AccountCreator } from "./AccountCreator"
import { ForgotPassword } from "./ForgotPassword"
import { AdminWindow } from "./AdminWindow"
import { ScriptShare } from "./ScriptShare"
import { Download } from "./Download"
import { ScriptHistory } from "./ScriptHistory"
import { ScriptAnalysis } from "./ScriptAnalysis"
import { SoundUploader } from "./SoundUploader"
import esconsole from "../esconsole"
import { openShare } from "../ide/IDE"

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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SOUNDS = 50
const MAX_CURRICULUM = 20
const DEBOUNCE_MS = 150

// ─── Component ────────────────────────────────────────────────────────────────

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const dispatch = useDispatch()
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    // ── Selectors ──────────────────────────────────────────────────────────
    const scripts = useSelector(scriptsState.selectAllScripts)
    const sharedScripts = useSelector(scriptsState.selectSharedScripts)
    const standardSoundNames = useSelector((state: any) => state.sounds.standardSounds.names as string[])
    const standardSoundEntities = useSelector((state: any) => state.sounds.standardSounds.entities as Record<string, any>)
    const userSoundNames = useSelector((state: any) => state.sounds.userSounds.names as string[])
    const userSoundEntities = useSelector((state: any) => state.sounds.userSounds.entities as Record<string, any>)
    const loggedIn = useSelector(user.selectLoggedIn)
    const isAdmin = useSelector((state: any) => (user.selectNotifications(state) as any[]).some((n: any) => n?.notification_type === "admin"))
    const activeTabScript = useSelector(tabs.selectActiveTabScript)
    const colorTheme = useSelector(appState.selectColorTheme)
    // Curriculum: use the existing lunr-backed selector by keeping searchText in sync
    const curriculumResults = useSelector(curriculum.selectSearchResults)

    // ── Focus / reset ──────────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen) inputRef.current?.focus()
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            setQuery("")
            setDebouncedQuery("")
            // Clear curriculum search text when closing
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
    // Only rebuilds when login state, theme, or active script changes.
    // Sounds and curriculum are handled separately below.
    const appCommandIndex = useMemo((): CommandItem[] => {
        const cmds: CommandItem[] = []

        // Scripts
        for (const script of Object.values(scripts)) {
            if (script.soft_delete) continue
            cmds.push({
                id: `script-${script.shareid}`,
                title: script.name,
                subtitle: `by ${script.creator || script.username}`,
                category: "Scripts",
                action: () => { dispatch(tabThunks.setActiveTabAndEditor(script.shareid)); onClose() },
                icon: "icon-file-text2",
                searchKey: `scripts script file code ${script.name} ${script.creator ?? ""} ${script.username}`.toLowerCase(),
            })
        }

        // Shared scripts
        for (const script of Object.values(sharedScripts)) {
            cmds.push({
                id: `shared-${script.shareid}`,
                title: script.name,
                subtitle: `Shared by ${script.username}`,
                category: "Shared Scripts",
                action: async () => { await openShare(script.shareid); dispatch(tabThunks.setActiveTabAndEditor(script.shareid)); onClose() },
                icon: "icon-share2",
                searchKey: `shared scripts script file ${script.name} ${script.username}`.toLowerCase(),
            })
        }

        // API functions — small fixed list, fine to include in static index
        for (const funcName of Object.keys(API_FUNCTIONS)) {
            cmds.push({
                id: `api-${funcName}`,
                title: `${funcName}()`,
                subtitle: "EarSketch API function",
                category: "API",
                action: () => {
                    const editor = (window as any).ace?.edit?.("coder")
                    if (editor) {
                        editor.insert(`${funcName}()`)
                        const pos = editor.getCursorPosition()
                        editor.moveCursorTo(pos.row, pos.column - 1)
                    }
                    onClose()
                },
                icon: "icon-code",
                searchKey: `api function earsketch ${funcName}`.toLowerCase(),
            })
        }

        // ── App commands ────────────────────────────────────────────────────
        cmds.push(
            {
                id: "run-script",
                title: "Run Script",
                subtitle: "Execute the current script",
                category: "Commands",
                action: () => { (document.querySelector('[data-test="run-button"]') as HTMLButtonElement | null)?.click(); onClose() },
                icon: "icon-play3",
                searchKey: "run execute play script code commands",
            },
            {
                id: "save-script",
                title: "Save Script",
                subtitle: "Save the current script",
                category: "Commands",
                action: () => {
                    if (activeTabScript) dispatch(scriptsThunks.saveScript({ name: activeTabScript.name, source: activeTabScript.source_code }))
                    onClose()
                },
                icon: "icon-floppy-disk",
                searchKey: "save script file commands",
            },
            {
                id: "toggle-theme",
                title: "Toggle Theme",
                subtitle: `Switch to ${colorTheme === "light" ? "dark" : "light"} theme`,
                category: "Commands",
                action: () => { dispatch(appState.setColorTheme(colorTheme === "light" ? "dark" : "light")); onClose() },
                icon: "icon-brightness-contrast",
                searchKey: "toggle theme dark light appearance settings commands",
            },
            {
                id: "start-tutorial",
                title: "Start Quick Tour",
                subtitle: "Begin the interactive tutorial",
                category: "Commands",
                action: () => { dispatch(bubble.reset()); dispatch(bubble.resume()); onClose() },
                icon: "icon-question",
                searchKey: "start quick tour tutorial help guide commands",
            },
            {
                id: "upload-sound",
                title: "Upload Sound",
                subtitle: "Upload a sound file",
                category: "Commands",
                action: () => {
                    if (loggedIn) openModal(SoundUploader)
                    else esconsole("Please log in to upload sounds", ["user"])
                    onClose()
                },
                icon: "icon-upload",
                searchKey: "upload sound audio file commands",
            }
        )

        if (loggedIn) {
            cmds.push(
                {
                    id: "share-script",
                    title: "Share Script",
                    subtitle: "Share the current script with others",
                    category: "Commands",
                    action: () => { if (activeTabScript) openModal(ScriptShare, { script: activeTabScript }); onClose() },
                    icon: "icon-share2",
                    searchKey: "share script collaborate commands",
                },
                {
                    id: "download-script",
                    title: "Download Script",
                    subtitle: "Download the current script",
                    category: "Commands",
                    action: () => { if (activeTabScript) openModal(Download, { script: activeTabScript }); onClose() },
                    icon: "icon-download",
                    searchKey: "download script export file commands",
                },
                {
                    id: "script-history",
                    title: "Script History",
                    subtitle: "View version history of the current script",
                    category: "Commands",
                    action: () => { if (activeTabScript) openModal(ScriptHistory, { script: activeTabScript, allowRevert: true }); onClose() },
                    icon: "icon-history",
                    searchKey: "script history version changes revert commands",
                },
                {
                    id: "script-analysis",
                    title: "Script Analysis",
                    subtitle: "Analyze the current script",
                    category: "Commands",
                    action: () => { if (activeTabScript) openModal(ScriptAnalysis, { script: activeTabScript }); onClose() },
                    icon: "icon-stats-dots",
                    searchKey: "script analysis analyze code complexity commands",
                }
            )
        } else {
            cmds.push(
                {
                    id: "create-account",
                    title: "Create Account",
                    subtitle: "Sign up for EarSketch",
                    category: "Commands",
                    action: () => { openModal(AccountCreator); onClose() },
                    icon: "icon-user-plus",
                    searchKey: "create account signup register commands",
                },
                {
                    id: "forgot-password",
                    title: "Forgot Password",
                    subtitle: "Reset your password",
                    category: "Commands",
                    action: () => { openModal(ForgotPassword); onClose() },
                    icon: "icon-key",
                    searchKey: "forgot password reset recover account commands",
                }
            )
        }

        if (isAdmin) {
            cmds.push({
                id: "admin-window",
                title: "Admin Window",
                subtitle: "Open the admin panel",
                category: "Commands",
                action: () => { openModal(AdminWindow); onClose() },
                icon: "icon-cog",
                searchKey: "admin administration panel settings commands",
            })
        }

        return cmds
    }, [scripts, sharedScripts, loggedIn, isAdmin, activeTabScript, colorTheme, dispatch, onClose])

    // ── Filtered results ───────────────────────────────────────────────────
    const filteredCommands = useMemo((): CommandItem[] => {
        if (!debouncedQuery.trim()) return []
        const q = debouncedQuery.toLowerCase()

        // 1. App commands + scripts + API: cheap substring filter on pre-built keys
        const results: CommandItem[] = appCommandIndex.filter(item => item.searchKey.includes(q))

        // 2. Sounds: filter lazily here — never stored in index — capped at MAX_SOUNDS
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
                        const editor = (window as any).ace?.edit?.("coder")
                        if (editor) editor.insert(s.name)
                        onClose()
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
                        const editor = (window as any).ace?.edit?.("coder")
                        if (editor) editor.insert(s.name)
                        onClose()
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
                subtitle: "Curriculum",
                category: "Curriculum",
                action: () => { dispatch(curriculum.fetchContent({ url: result.id })); onClose() },
                icon: "icon-book",
                searchKey: result.title.toLowerCase(),
            })
        }

        return results
    }, [
        debouncedQuery,
        appCommandIndex,
        standardSoundNames, standardSoundEntities,
        userSoundNames, userSoundEntities,
        curriculumResults,
        dispatch, onClose,
    ])

    // ── Group for display ──────────────────────────────────────────────────
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {}
        for (const cmd of filteredCommands) {
            if (!groups[cmd.category]) groups[cmd.category] = []
            groups[cmd.category].push(cmd)
        }
        return groups
    }, [filteredCommands])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose()
    }, [onClose])

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                                            {!debouncedQuery.trim()
                                                ? (
                                                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        Start typing to search scripts, sounds, API functions, and more…
                                                    </div>
                                                )
                                                : Object.keys(groupedCommands).length === 0
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
                                                                            {item.icon && (
                                                                                <i className={`${item.icon} mr-3 text-lg flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                                                                            )}
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
            </Dialog>
        </Transition>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false)
    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => setIsOpen(false), [])
    return { isOpen, openCommandPalette: open, closeCommandPalette: close }
}
