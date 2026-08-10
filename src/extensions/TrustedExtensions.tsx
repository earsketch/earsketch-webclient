import { useTranslation } from "react-i18next"

import * as appState from "../app/appState"
import { openModal } from "../app/modal"
import { useAppDispatch as useDispatch } from "../hooks"
import * as layout from "../ide/layoutState"
import { ExtensionLoader } from "./ExtensionLoader"
import { ExtensionLaunchButton } from "./ExtensionLaunchButton"
import { loadExtension } from "./loadExtension"

const CODE_VIZ_URL = "http://localhost:5173"
const TIP_OF_THE_DAY_URL = "http://localhost:5174"
const CHATBOT_URL = "https://emlbot1.lmc.gatech.edu/"

export const CurriculumExtension = () => {
    const dispatch = useDispatch()
    const { t } = useTranslation()
    const extensionName = t("curriculum.title")

    const launch = () => {
        dispatch(appState.setEastContent("curriculum"))
        dispatch(layout.setEast({ open: true, kind: "CURRICULUM" }))
    }

    return (
        <ExtensionLaunchButton extensionName={extensionName} onClick={launch}>
            <span className="icon icon-book" aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

export const CodeViz = () => {
    const launch = async () => {
        try {
            await loadExtension(CODE_VIZ_URL)
        } catch (error) {
            console.error("Failed to load CodeViz extension:", error)
        }
    }

    return (
        <ExtensionLaunchButton extensionName="CodeViz" onClick={launch}>
            <span className="icon icon-code" aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

export const TipOfTheDay = () => {
    const launch = async () => {
        try {
            await loadExtension(TIP_OF_THE_DAY_URL)
        } catch (error) {
            console.error("Failed to load TipOfTheDay extension:", error)
        }
    }

    return (
        <ExtensionLaunchButton extensionName="TipOfTheDay" onClick={launch}>
            <span className="icon icon-info" aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

export const Chatbot = () => {
    const launch = async () => {
        try {
            await loadExtension(CHATBOT_URL)
        } catch (error) {
            console.error("Failed to load Chatbot extension:", error)
        }
    }

    return (
        <ExtensionLaunchButton extensionName="Chatbot" onClick={launch}>
            <span className="icon icon-bubbles" aria-hidden="true" />
        </ExtensionLaunchButton>
    )
}

export const ExtensionLoaderButton = () => {
    const { t } = useTranslation()
    const title = t("loadExtension")

    return (
        <button
            type="button"
            className="inline-flex items-center justify-center w-4 h-8 ml-2 rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-inner hover:bg-gray-200 dark:hover:bg-gray-700"
            title={title}
            aria-label={title}
            onClick={() => openModal(ExtensionLoader)}>
            {/* <span className="icon icon-plus2" aria-hidden="true" /> */}
            <div>+</div>
        </button>
    )
}

export const TrustedExtensions = () => (
    <>
        <CurriculumExtension />
        <TipOfTheDay />
        <CodeViz />
        <Chatbot />
        <ExtensionLoaderButton />
    </>
)
