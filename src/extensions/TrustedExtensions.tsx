import { ExtensionLaunchButton } from "./ExtensionLaunchButton"
import { loadExtension } from "./loadExtension"

const CODE_VIZ_URL = "http://localhost:5173"
const TIP_OF_THE_DAY_URL = "http://localhost:5174"

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

export const TrustedExtensions = () => (
    <>
        <CodeViz />
        <TipOfTheDay />
    </>
)
