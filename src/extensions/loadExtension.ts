import { setEastContent } from "../app/appState"
import * as layout from "../ide/layoutState"
import store from "../reducers"
import { ExtensionState, setExtension } from "./extensionState"

interface ExtensionManifest {
    extension_api_version?: string
    name: string
    version: string
    description?: string
    icons?: {
        "32"?: string
        "128"?: string
    }
    side_panel?: {
        default_path: string
    }
    permissions?: string[]
}

/**
 * Loads an extension without displaying the permission dialog.
 * The caller is responsible for only passing URLs that EarSketch trusts.
 */
export async function loadExtension(extensionUrl: string) {
    const manifestUrl = new URL("es-ext.json", extensionUrl).href
    const response = await fetch(manifestUrl)

    if (!response.ok) {
        throw new Error(`Unable to load extension manifest: ${response.status}`)
    }

    const manifest = await response.json() as ExtensionManifest
    if (!manifest.side_panel?.default_path || !manifest.permissions?.includes("sidePanel")) {
        throw new Error("Invalid EarSketch extension manifest")
    }

    const extension: ExtensionState = {
        url: new URL(manifest.side_panel.default_path, extensionUrl).href,
        name: manifest.name,
        version: manifest.version,
        description: manifest.description ?? "",
        permissions: manifest.permissions,
        icon32: manifest.icons?.["32"]
            ? new URL(manifest.icons["32"], extensionUrl).href
            : "",
        icon128: manifest.icons?.["128"]
            ? new URL(manifest.icons["128"], extensionUrl).href
            : "",
        extensionApiVersion: manifest.extension_api_version ?? "1",
    }

    store.dispatch(setExtension(extension))
    store.dispatch(setEastContent("extension"))
    store.dispatch(layout.setEast({ open: true }))
}
