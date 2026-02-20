import { useEffect } from "react"
import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import { SoundPreview } from "../browser/SoundPreview"

import { useAppDispatch as useDispatch } from "../hooks"
import store from "../reducers"
import * as soundsThunks from "../browser/soundsThunks"

export const SoundPreviewer = ({ close }: { close: () => void }) => {
    const dispatch = useDispatch()

    const stopNow = () => {
        console.log("stop sound")
        const state = store.getState()
        const preview = state.sounds?.preview.value
        console.log(preview)
        if (preview?.kind === "sound" && preview.name) {
            console.log("stop sound dispatch")
            dispatch(soundsThunks.togglePreview({ name: preview.name, kind: "sound" }))
        }
    }

    const handleClose = () => {
        stopNow()
        close()
    }

    // ESC should stop sound + close modal
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault()
                e.stopPropagation()
                handleClose()
            }
        }

        // capture=true so ESC is caught even if something inside the modal intercepts it
        window.addEventListener("keydown", onKeyDown, true)
        return () => window.removeEventListener("keydown", onKeyDown, true)
    }, [])

    return (
        <>
            <ModalHeader>Preview Sound</ModalHeader>

            <ModalBody>
                <div className="modal-section-content">
                    <div className="border border-gray-300 dark:border-gray-500 rounded p-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <SoundPreview />
                        </div>
                    </div>
                </div>
            </ModalBody>

            <ModalFooter submit="Add To Script" close={handleClose} />
        </>
    )
}
