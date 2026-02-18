import { useState } from "react"

import { ModalBody, ModalFooter, ModalHeader } from "../Utils"
import { setExtensionUrl, setEastContent } from "../app/appState"
import store from "../reducers"

export const ExtensionLoader = ({ close }: { close: () => void }) => {
    const [url, setUrl] = useState("")

    const loadExtension = () => {
        store.dispatch(setExtensionUrl(url))
        store.dispatch(setEastContent("extension"))
        close()
    }

    const pasteDemoUrl = () => {
        setUrl("myExtension.html")
    }

    return <>
        <ModalHeader>Load Extension</ModalHeader>
        <form onSubmit={e => { e.preventDefault(); loadExtension() }}>
            <ModalBody>
                <div className="mb-3">
                    <button
                        type="button"
                        className="mx-2.5 my-1 px-2.5 py-px rounded-md text-black dark:text-white text-xs border border-black dark:border-white hover:bg-gray-100"
                        onClick={pasteDemoUrl}>
                        PASTE DEMO URL
                    </button>
                </div>
                <label htmlFor="extension-url-input" className="text-sm">
                    Extension URL
                </label>
                <div className="mt-1 mb-3">
                    <input
                        id="extension-url-input"
                        type="text"
                        placeholder="Extension URL"
                        className="form-input w-full dark:bg-transparent placeholder:text-gray-300"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        autoFocus
                        required
                    />
                </div>
            </ModalBody>
            <ModalFooter submit="Load" ready={url !== ""} close={close} />
        </form>
    </>
}
