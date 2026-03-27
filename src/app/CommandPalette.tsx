import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react"
import { Dialog, Combobox, Transition } from "@headlessui/react"
import { useTranslation } from "react-i18next"
import { useAppDispatch as useDispatch, useAppSelector as useSelector } from "../hooks"
import * as appState from "./appState"
import * as scriptsState from "../browser/scriptsState"
import * as scriptsThunks from "../browser/scriptsThunks"

import * as curriculum from "../browser/curriculumState"
import * as tabs from "../ide/tabState"
import * as tabThunks from "../ide/tabThunks"
import * as bubble from "../bubble/bubbleState"
import * as user from "../user/userState"
// SoundEntity type is used in the component
import { API_FUNCTIONS } from "../api/api"
import { openModal } from "./modal"
import { AccountCreator } from "./AccountCreator"
import { ProfileEditor } from "./ProfileEditor"
import { ForgotPassword } from "./ForgotPassword"
// ErrorForm removed as not used
import { AdminWindow } from "./AdminWindow"
import { ScriptShare } from "./ScriptShare"
import { Download } from "./Download"
import { ScriptHistory } from "./ScriptHistory"
import { ScriptAnalysis } from "./ScriptAnalysis"
import { SoundUploader } from "./SoundUploader"
// CompetitionSubmission and ESUtils removed as not used
import esconsole from "../esconsole"
import { openShare } from "../ide/IDE"
import store from "../reducers"
import { ScriptCreator } from "./ScriptCreator"

interface CommandItem {
    id: string
    title: string
    subtitle?: string
    category: string
    action: () => void | Promise<void>
    icon?: string
    keywords?: string[]
}

interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const [query, setQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    // Selectors
    const scripts = useSelector(scriptsState.selectAllScripts)
    const sharedScripts = useSelector(scriptsState.selectSharedScripts)
    const standardSounds = useSelector((state: any) => state.sounds.standardSounds)
    const userSounds = useSelector((state: any) => state.sounds.userSounds)
    const loggedIn = useSelector(user.selectLoggedIn)
    const isAdmin = useSelector((state) => user.selectNotifications(state).some(n => n?.notification_type === "admin"))
    const activeTabScript = useSelector(tabs.selectActiveTabScript)
    const colorTheme = useSelector(appState.selectColorTheme)

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    // Clear query when closed
    useEffect(() => {
        if (!isOpen) {
            setQuery("")
        }
    }, [isOpen])

    const curriculumSearchDoc = useSelector(curriculum.selectSearchDoc)

    // Generate command items only when there's a query
    const commands = useMemo((): CommandItem[] => {
        // Don't generate any commands if there's no query
        if (!query.trim()) {
            return []
        }

        const items: CommandItem[] = []
        const queryLower = query.toLowerCase()

        // Helper function to check if item matches query
        const matchesQuery = (searchText: string) => {
            return searchText.toLowerCase().includes(queryLower)
        }

        // Script commands
        Object.values(scripts).forEach((script) => {
            if (!script.soft_delete) {
                const searchText = [script.name, script.creator, script.username].filter(Boolean).join(" ")
                if (matchesQuery(searchText)) {
                    items.push({
                        id: `script-${script.shareid}`,
                        title: script.name,
                        subtitle: `by ${script.creator || script.username}`,
                        category: "Scripts",
                        action: () => {
                            dispatch(tabThunks.setActiveTabAndEditor(script.shareid))
                            onClose()
                        },
                        icon: "icon-file-text2",
                        keywords: ["script", "file", "code", script.name, script.creator, script.username].filter(Boolean),
                    })
                }
            }
        })

        // Shared scripts
        Object.values(sharedScripts).forEach((script) => {
            const searchText = [script.name, script.username].join(" ")
            if (matchesQuery(searchText)) {
                items.push({
                    id: `shared-${script.shareid}`,
                    title: script.name,
                    subtitle: `Shared by ${script.username}`,
                    category: "Shared Scripts",
                    action: async () => {
                        await openShare(script.shareid)
                        dispatch(tabThunks.setActiveTabAndEditor(script.shareid))
                        onClose()
                    },
                    icon: "icon-share2",
                    keywords: ["shared", "script", "file", script.name, script.username],
                })
            }
        })

        // Standard sounds (limit to first 50 for performance)
        const soundsToCheck = standardSounds.names.slice(0, 50)
        soundsToCheck.forEach((name: string) => {
            const sound = standardSounds.entities[name]
            if (sound) {
                const searchText = [sound.name, sound.artist, sound.genre, sound.instrument, sound.folder].filter(Boolean).join(" ")
                if (matchesQuery(searchText)) {
                    items.push({
                        id: `sound-${name}`,
                        title: sound.name,
                        subtitle: `${sound.artist} - ${sound.genre} (${sound.instrument})`,
                        category: "Sounds",
                        action: () => {
                            // Insert sound name into active editor
                            if (activeTabScript) {
                                const editor = (window as any).ace?.edit?.("coder")
                                if (editor) {
                                    editor.insert(sound.name)
                                }
                            }
                            onClose()
                        },
                        icon: "icon-music",
                        keywords: [
                            "sound", "audio", sound.name, sound.artist, sound.genre,
                            sound.instrument, sound.folder,
                        ].filter(Boolean),
                    })
                }
            }
        })

        // User sounds
        if (loggedIn) {
            userSounds.names.forEach((name: string) => {
                const sound = userSounds.entities[name]
                if (sound && matchesQuery(sound.name)) {
                    items.push({
                        id: `user-sound-${name}`,
                        title: sound.name,
                        subtitle: "Your sound",
                        category: "My Sounds",
                        action: () => {
                            if (activeTabScript) {
                                const editor = (window as any).ace?.edit?.("coder")
                                if (editor) {
                                    editor.insert(sound.name)
                                }
                            }
                            onClose()
                        },
                        icon: "icon-music",
                        keywords: ["sound", "audio", "my", "user", sound.name],
                    })
                }
            })
        }

        // API Functions
        Object.keys(API_FUNCTIONS).forEach((funcName) => {
            const searchText = `${funcName} api function earsketch`
            if (matchesQuery(searchText)) {
                items.push({
                    id: `api-${funcName}`,
                    title: funcName + "()",
                    subtitle: "EarSketch API function",
                    category: "API",
                    action: () => {
                        if (activeTabScript) {
                            const editor = (window as any).ace?.edit?.("coder")
                            if (editor) {
                                editor.insert(funcName + "()")
                                // Move cursor back inside parentheses
                                const pos = editor.getCursorPosition()
                                editor.moveCursorTo(pos.row, pos.column - 1)
                            }
                        }
                        onClose()
                    },
                    icon: "icon-code",
                    keywords: ["api", "function", funcName, "earsketch"],
                })
            }
        })

        // Curriculum search results
        if (curriculumSearchDoc.length > 0) {
            curriculumSearchDoc.forEach((item) => {
                const searchText = [item.title, item.text].join(" ")
                if (matchesQuery(searchText)) {
                    items.push({
                        id: `curriculum-${item.id}`,
                        title: item.title,
                        subtitle: "Curriculum content",
                        category: "Curriculum",
                        action: () => {
                            dispatch(curriculum.fetchContent({ url: item.id }))
                            onClose()
                        },
                        icon: "icon-book",
                        keywords: ["curriculum", "tutorial", "help", item.title, item.text],
                    })
                }
            })
        }

        // General commands
        const generalCommands: CommandItem[] = [
            {
                id: "new-script",
                title: "New Script",
                subtitle: "Create a new script",
                category: "File",
                action: async () => {
                    openModal(ScriptCreator)
                    onClose()
                },
                icon: "icon-file-plus",
                keywords: ["new", "script", "file", "create"],
            },
            {
                id: "save-script",
                title: "Save Script",
                subtitle: "Save the current script",
                category: "File",
                action: () => {
                    if (activeTabScript) {
                        dispatch(scriptsThunks.saveScript({
                            name: activeTabScript.name,
                            source: activeTabScript.source_code,
                        }))
                    }
                    onClose()
                },
                icon: "icon-floppy-disk",
                keywords: ["save", "script", "file"],
            },
            {
                id: "run-script",
                title: "Run Script",
                subtitle: "Execute the current script",
                category: "Code",
                action: () => {
                    const runButton = document.querySelector('[data-test="run-button"]') as HTMLButtonElement
                    if (runButton) runButton.click()
                    onClose()
                },
                icon: "icon-play3",
                keywords: ["run", "execute", "play", "script"],
            },
            {
                id: "toggle-theme",
                title: "Toggle Theme",
                subtitle: `Switch to ${colorTheme === "light" ? "dark" : "light"} theme`,
                category: "Settings",
                action: () => {
                    dispatch(appState.setColorTheme(colorTheme === "light" ? "dark" : "light"))
                    onClose()
                },
                icon: "icon-brightness-contrast",
                keywords: ["theme", "dark", "light", "appearance"],
            },
            {
                id: "start-tutorial",
                title: "Start Quick Tour",
                subtitle: "Begin the interactive tutorial",
                category: "Help",
                action: () => {
                    dispatch(bubble.reset())
                    dispatch(bubble.resume())
                    onClose()
                },
                icon: "icon-question",
                keywords: ["tutorial", "help", "tour", "guide"],
            },
            {
                id: "upload-sound",
                title: "Upload Sound",
                subtitle: "Upload a sound file",
                category: "Sounds",
                action: () => {
                    if (loggedIn) {
                        openModal(SoundUploader)
                    } else {
                        esconsole("Please log in to upload sounds", ["user"])
                    }
                    onClose()
                },
                icon: "icon-upload",
                keywords: ["upload", "sound", "audio", "file"],
            },
        ]

        // Add authenticated user commands
        if (loggedIn) {
            generalCommands.push(
                {
                    id: "share-script",
                    title: "Share Script",
                    subtitle: "Share the current script",
                    category: "File",
                    action: () => {
                        if (activeTabScript) {
                            openModal(ScriptShare, { script: activeTabScript })
                        }
                        onClose()
                    },
                    icon: "icon-share2",
                    keywords: ["share", "script", "collaborate"],
                },
                {
                    id: "download-script",
                    title: "Download Script",
                    subtitle: "Download the current script",
                    category: "File",
                    action: () => {
                        if (activeTabScript) {
                            openModal(Download, { script: activeTabScript })
                        }
                        onClose()
                    },
                    icon: "icon-download",
                    keywords: ["download", "script", "export"],
                },
                {
                    id: "script-history",
                    title: "Script History",
                    subtitle: "View current script history",
                    category: "File",
                    action: () => {
                        if (activeTabScript) {
                            openModal(ScriptHistory, { script: activeTabScript, allowRevert: true })
                        }
                        onClose()
                    },
                    icon: "icon-history",
                    keywords: ["history", "version", "script", "changes"],
                },
                {
                    id: "script-analysis",
                    title: "Script Analysis",
                    subtitle: "Analyze current script",
                    category: "Code",
                    action: () => {
                        if (activeTabScript) {
                            openModal(ScriptAnalysis, { script: activeTabScript })
                        }
                        onClose()
                    },
                    icon: "icon-stats-dots",
                    keywords: ["analysis", "analyze", "script", "code"],
                }
                // {
                //     id: "edit-profile",
                //     title: "Edit Profile",
                //     subtitle: "Edit your profile settings",
                //     category: "Account",
                //     action: () => {
                //         openModal(ProfileEditor, {
                //             username: user.selectUserName(store.getState()) || "",
                //             email: "",
                //         })
                //         onClose()
                //     },
                //     icon: "icon-user",
                //     keywords: ["profile", "account", "settings", "edit"],
                // }
            )
        } else {
            generalCommands.push(
                {
                    id: "create-account",
                    title: "Create Account",
                    subtitle: "Sign up for EarSketch",
                    category: "Account",
                    action: () => {
                        openModal(AccountCreator)
                        onClose()
                    },
                    icon: "icon-user-plus",
                    keywords: ["account", "signup", "register", "create"],
                },
                {
                    id: "forgot-password",
                    title: "Forgot Password",
                    subtitle: "Reset your password",
                    category: "Account",
                    action: () => {
                        openModal(ForgotPassword)
                        onClose()
                    },
                    icon: "icon-key",
                    keywords: ["password", "reset", "forgot", "recover"],
                }
            )
        }

        // Admin commands
        if (isAdmin) {
            generalCommands.push({
                id: "admin-window",
                title: "Admin Window",
                subtitle: "Open admin panel",
                category: "Admin",
                action: () => {
                    openModal(AdminWindow)
                    onClose()
                },
                icon: "icon-cog",
                keywords: ["admin", "administration", "settings"],
            })
        }

        // Filter general commands by query
        const matchingGeneralCommands = generalCommands.filter(cmd => {
            const searchText = [cmd.title, cmd.subtitle, cmd.category, ...(cmd.keywords || [])].join(" ")
            return matchesQuery(searchText)
        })

        items.push(...matchingGeneralCommands)

        return items
    }, [scripts, sharedScripts, standardSounds, userSounds, loggedIn, isAdmin, activeTabScript, colorTheme, curriculumSearchDoc, query, dispatch, onClose, t])

    // Limit to top 20 results and group by category
    const groupedCommands = useMemo(() => {
        const groups: { [key: string]: CommandItem[] } = {}

        commands.forEach((command) => {
            if (!groups[command.category]) {
                groups[command.category] = []
            }
            groups[command.category].push(command)
        })
        return groups
    }, [commands])

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === "Escape") {
            onClose()
        }
    }, [onClose])

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 pt-16">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
                                <Combobox onChange={(item: CommandItem) => item.action()}>
                                    <div className="relative">
                                        <div className="flex items-center border-b dark:border-gray-600 px-4">
                                            <i className="icon icon-search text-gray-400 mr-3" />
                                            <Combobox.Input
                                                ref={inputRef}
                                                className="h-12 w-full border-0 bg-transparent pl-0 pr-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0 outline-none"
                                                placeholder="Search scripts, sounds, API functions, and more..."
                                                value={query}
                                                onChange={(event) => setQuery(event.target.value)}
                                                onKeyDown={handleKeyDown}
                                            />
                                        </div>

                                        <Combobox.Options static className="max-h-96 scroll-py-2 overflow-y-auto py-2">
                                            {!query.trim()
                                                ? (
                                                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                        Start typing to search scripts, sounds, API functions, and more...
                                                    </div>
                                                )
                                                : Object.keys(groupedCommands).length === 0
                                                    ? (
                                                        <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                            No results found for &quot;{query}&quot;
                                                        </div>
                                                    )
                                                    : (
                                                        Object.entries(groupedCommands).map(([category, items]) => (
                                                            <div key={category} className="mb-2">
                                                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                                    {category}
                                                                </div>
                                                                {items.map((item) => (
                                                                    <Combobox.Option
                                                                        key={item.id}
                                                                        value={item}
                                                                        className={({ active }) =>
                                                                            `cursor-pointer select-none px-4 py-2 flex items-center ${
                                                                                active
                                                                                    ? "bg-blue-600 text-white"
                                                                                    : "text-gray-900 dark:text-gray-100"
                                                                            }`}
                                                                    >
                                                                        {({ active }) => (
                                                                            <>
                                                                                {item.icon && (
                                                                                    <i
                                                                                        className={`${item.icon} mr-3 text-lg ${
                                                                                            active ? "text-white" : "text-gray-400"
                                                                                        }`}
                                                                                    />
                                                                                )}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-medium truncate">
                                                                                        {item.title}
                                                                                    </div>
                                                                                    {item.subtitle && (
                                                                                        <div
                                                                                            className={`text-sm truncate ${
                                                                                                active ? "text-blue-200" : "text-gray-500 dark:text-gray-400"
                                                                                            }`}
                                                                                        >
                                                                                            {item.subtitle}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </Combobox.Option>
                                                                ))}
                                                            </div>
                                                        ))
                                                    )}
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

// Hook to manage command palette state (keyboard shortcut is now in App.tsx)
export const useCommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false)

    const openCommandPalette = useCallback(() => setIsOpen(true), [])
    const closeCommandPalette = useCallback(() => setIsOpen(false), [])

    return {
        isOpen,
        openCommandPalette,
        closeCommandPalette,
    }
}
