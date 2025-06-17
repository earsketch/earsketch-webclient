// See https://redux-toolkit.js.org/tutorials/typescript#define-typed-hooks
import { useDispatch, useSelector } from "react-redux"
import type { TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./reducers"
import { useState, useEffect, useCallback } from "react"

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

type FocusablePanel = {
    id: string
    name: string
    element: HTMLElement
}

const PANEL_IDS = [
    "SOUNDS",
    "SCRIPTS",
    "API",
    "content-manager",
    "dawHeader",
    "editorWindow",
    "curriculum-header",
    "top-header-nav-form",
] as const

const getPanelName = (panelId: string): string => {
    const nameMap: Record<string, string> = {
        "SOUNDS": "Sounds Tab",
        "SCRIPTS": "Scripts Tab",
        "API": "API Tab",
        "content-manager": "Content Manager",
        "dawHeader": "DAW",
        "editorWindow": "Editor",
        "curriculum-header": "Curriculum",
        "top-header-nav-form": "Navigation",
    }
    return nameMap[panelId] || panelId
}
export const useFocusHistory = () => {
    const [focusHistory, setFocushistory] = useState<FocusablePanel[]>([])
    const [currentIndex, setCurrentIndex] = useState(-1)

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent) => {
            const target = event.target as HTMLElement
            console.log("HERE AT",target )

            // Find which panel contains this focused element
            const panelId = PANEL_IDS.find(id => {
                const panel = document.getElementById(id)
                return panel && (panel === target || panel.contains(target))
            })

            if (panelId) {
                const panelElement = document.getElementById(panelId)!
                const panelName = getPanelName(panelId)

                const newPanel: FocusablePanel = {
                    id: panelId,
                    name: panelName,
                    element: panelElement,
                }

                setFocushistory(prev => {
                // Don't add if it's the same as the current top
                    if (prev.length > 0 && prev[prev.length - 1].id === panelId) {
                        return prev
                    }

                    // Add to history, limit to last 10 panels
                    const newHistory = [...prev, newPanel].slice(-10)
                    setCurrentIndex(newHistory.length - 1)
                    return newHistory
                })
            }
        }

        // Listen for focus changes globally
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/focusin_event
        document.addEventListener("focusin", handleFocusIn)
        return () => document.removeEventListener("focusin", handleFocusIn)
    }, [])

    const goBack = useCallback(() => {
        if (focusHistory.length > 1 && currentIndex > 0) {
            const previousPanel = focusHistory[currentIndex - 1]

            // Focus the previous panel -- we leverage the The HTMLElement.focus() method
            // sets focus on the specified element, if it can be focused. T
            // he focused element is the element that will receive keyboard and similar events by default.
            previousPanel.element.focus()
            previousPanel.element.scrollIntoView({ behavior: "smooth" })

            setCurrentIndex(currentIndex - 1)
            return true // Successfully went back
        }
        return false // No history to go back to
    }, [focusHistory, currentIndex])

    // Go forward in history
    const goForward = useCallback(() => {
        if (currentIndex < focusHistory.length - 1) {
            const nextPanel = focusHistory[currentIndex + 1]

            nextPanel.element.focus()
            nextPanel.element.scrollIntoView({ behavior: "smooth" })

            setCurrentIndex(currentIndex + 1)
            return true
        }
        return false
    }, [focusHistory, currentIndex])

    return {
        focusHistory,
        currentIndex,
        goBack,
        goForward,
        canGoBack: focusHistory.length > 1 && currentIndex > 0,
        canGoForward: currentIndex < focusHistory.length - 1,
    }
}

export const usePanelNavigation = () => {
    const { goBack, goForward, canGoBack, canGoForward } = useFocusHistory()

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
        // Alt + Left Arrow = Go Back
            if (event.altKey && event.key === "ArrowLeft") {
                event.preventDefault()
                if (goBack()) {
                    // Optional: Show toast notification
                    console.log("Navigated back")
                }
            }

            // Alt + Right Arrow = Go Forward
            if (event.altKey && event.key === "ArrowRight") {
                event.preventDefault()
                if (goForward()) {
                    console.log("Navigated forward")
                }
            }

            // Or use different key combinations:
            // Ctrl + [ = Go Back
            if (event.ctrlKey && event.key === "[") {
                event.preventDefault()
                goBack()
            }

            // Ctrl + ] = Go Forward
            if (event.ctrlKey && event.key === "]") {
                event.preventDefault()
                goForward()
            }
            const isCtrlShift = event.ctrlKey
            const isNumberKey = /^[1-8]$/.test(event.key)

            if (isCtrlShift && isNumberKey) {
                event.preventDefault()
                console.log("Here", event.key)

                const panelMap: { [key: string]: string } = {
                    1: "SOUNDS",
                    2: "SCRIPTS",
                    3: "API",
                    4: "dawHeader",
                    5: "editorWindow",
                    6: "curriculum-header",
                }

                const targetPanelId = panelMap[event.key]
                const targetElement = document.getElementById(targetPanelId)

                if (targetElement) {
                    targetElement.focus()
                    targetElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
                }
            }
        }

        window.addEventListener("keydown", handleKeyPress)
        return () => window.removeEventListener("keydown", handleKeyPress)
    }, [goBack, goForward])

    return { canGoBack, canGoForward }
}
