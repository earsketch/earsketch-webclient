import { ExtensionLaunchButton } from "./ExtensionLaunchButton"
import { loadExtension } from "./loadExtension"

const CODE_VIZ_URL = "http://localhost:5173"

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

export const TrustedExtensions = () => <CodeViz />
