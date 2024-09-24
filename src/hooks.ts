// See https://redux-toolkit.js.org/tutorials/typescript#define-typed-hooks
import { useDispatch, useSelector } from "react-redux"
import type { TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./reducers"
import { useEffect } from "react"

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * Custom hook that listens for Cmd + Spacebar (or Ctrl + Spacebar)
 * and toggles between play and pause actions.
 * @param playing - Current playing state (boolean)
 * @param play - Function to trigger the play action
 * @param pause - Function to trigger the pause action
 */
export const usePlayPauseShortcut = (playing: boolean, play: () => void, pause: () => void) => {
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            // Check for Cmd (metaKey) or Ctrl (ctrlKey) and spacebar key press
            if ((event.metaKey || event.ctrlKey) && event.key === " ") {
                event.preventDefault() // Prevent default spacebar behavior (e.g., scrolling)

                // Toggle between play and pause based on current state
                if (playing) {
                    pause() // Pause playback
                } else {
                    play() // Start playback
                }
            }
        }

        // Attach keydown event listener
        window.addEventListener("keydown", handleKeyPress)

        // Cleanup event listener on component unmount
        return () => {
            window.removeEventListener("keydown", handleKeyPress)
        }
    }, [playing, play, pause]) // Effect runs when 'playing', 'play', or 'pause' changes
}
