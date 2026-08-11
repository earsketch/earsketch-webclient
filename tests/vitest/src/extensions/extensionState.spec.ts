import { expect, it } from "vitest"

import {
    extensionReducer,
    clearExtension,
    installExtension,
    setExtension,
    uninstallExtension,
} from "../../../../src/extensions/extensionState"

it("installs each catalog extension only once", () => {
    let state = extensionReducer(undefined, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("chatbot"))

    expect(state.installedExtensionIds).toEqual(["code-viz", "chatbot"])
})

it("tracks and clears the active catalog extension", () => {
    let state = extensionReducer(undefined, setExtension({
        url: "https://example.com/extension.html",
        name: "CodeViz",
        version: "1",
        description: "Visualize code",
        permissions: ["sidePanel"],
        icon32: "",
        icon128: "",
        extensionApiVersion: "1",
        catalogExtensionId: "code-viz",
    }))

    expect(state.activeCatalogExtensionId).toBe("code-viz")

    state = extensionReducer(state, clearExtension())

    expect(state.activeCatalogExtensionId).toBeNull()
})

it("uninstalls a catalog extension", () => {
    let state = extensionReducer(undefined, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("chatbot"))
    state = extensionReducer(state, uninstallExtension("code-viz"))

    expect(state.installedExtensionIds).toEqual(["chatbot"])
})
