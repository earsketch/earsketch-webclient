import { expect, it } from "vitest"

import {
    extensionReducer,
    installExtension,
    uninstallExtension,
} from "../../../../src/extensions/extensionState"

it("installs each catalog extension only once", () => {
    let state = extensionReducer(undefined, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("chatbot"))

    expect(state.installedExtensionIds).toEqual(["code-viz", "chatbot"])
})

it("uninstalls a catalog extension", () => {
    let state = extensionReducer(undefined, installExtension("code-viz"))
    state = extensionReducer(state, installExtension("chatbot"))
    state = extensionReducer(state, uninstallExtension("code-viz"))

    expect(state.installedExtensionIds).toEqual(["chatbot"])
})
