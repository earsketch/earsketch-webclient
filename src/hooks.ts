// See https://redux-toolkit.js.org/tutorials/typescript#define-typed-hooks
import { useDispatch, useSelector } from "react-redux"
import type { TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./reducers"
import { useEffect } from "react"

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

export const usePlayPauseShortcut = (playing: boolean, play: () => void, pause: () => void) => {
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
        // Ctrl (ctrlKey) and spacebar key press
            if ((event.ctrlKey) && event.key === " ") {
                event.preventDefault()

                // Toggle between play and pause based on current state
                if (playing) {
                    pause()
                } else {
                    play()
                }
            }
        }
        // Attach keydown event listener
        window.addEventListener("keydown", handleKeyPress)
        return () => {
            window.removeEventListener("keydown", handleKeyPress)
        }
    }, [playing, play, pause]) // Effect runs when 'playing', 'play', or 'pause' changes
}
