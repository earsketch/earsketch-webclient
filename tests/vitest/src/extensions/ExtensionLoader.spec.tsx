import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ExtensionLoader } from "../../../../src/extensions/ExtensionLoader"
import { clearExtension, installExtension, uninstallExtension } from "../../../../src/extensions/extensionState"
import { setEastContent } from "../../../../src/app/appState"

const { dispatch, state } = vi.hoisted(() => ({
    dispatch: vi.fn(),
    state: {
        extension: {
            url: "",
            name: "",
            version: "",
            description: "",
            permissions: [],
            icon32: "",
            icon128: "",
            extensionApiVersion: "1",
            installedExtensionIds: [] as string[],
            activeCatalogExtensionId: null as string | null,
        },
    },
}))

vi.mock("../../../../src/hooks", () => ({
    useAppDispatch: () => dispatch,
    useAppSelector: (selector: (currentState: typeof state) => unknown) => selector(state),
}))
vi.mock("../../../../src/reducers", () => ({
    default: { dispatch: vi.fn() },
}))
vi.mock("../../../../src/Utils", () => ({
    Alert: ({ message }: { message: string }) => <div role="alert">{message}</div>,
    ModalHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
    ModalBody: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
    ModalFooter: () => null,
}))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, values?: { extensionName?: string }) => {
            const translations: Record<string, string> = {
                "extension.catalog.heading": "Featured extensions",
                "extension.catalog.add": "Add",
                "extension.catalog.remove": "Remove",
                "extension.catalog.codeVizDescription": "Explore a visual representation of your EarSketch code.",
                "extension.catalog.tipOfTheDayDescription": "Discover a new EarSketch tip each day.",
                "extension.catalog.chatbotDescription": "Get help and ideas while you create music in EarSketch.",
            }

            if (key === "extension.catalog.addNamed") return `Add ${values?.extensionName}`
            if (key === "extension.catalog.removeNamed") return `Remove ${values?.extensionName}`
            return translations[key] ?? key
        },
    }),
}))

beforeEach(() => {
    state.extension.installedExtensionIds = []
    state.extension.activeCatalogExtensionId = null
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

it("renders the featured extension cards", () => {
    render(<ExtensionLoader close={vi.fn()} />)

    expect(screen.getByRole("heading", { name: "Featured extensions" })).not.toBeNull()
    expect(screen.getByRole("heading", { name: "CodeViz" })).not.toBeNull()
    expect(screen.getByRole("heading", { name: "Tip of the Day" })).not.toBeNull()
    expect(screen.getByRole("heading", { name: "EarSketch Chatbot" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Add CodeViz" })).not.toBeNull()
})

it("adds a featured extension to the installed extension state", () => {
    const close = vi.fn()
    render(<ExtensionLoader close={close} />)

    fireEvent.click(screen.getByRole("button", { name: "Add CodeViz" }))

    expect(dispatch).toHaveBeenCalledWith(installExtension("code-viz"))
    expect(close).not.toHaveBeenCalled()
})

it("removes an installed extension", () => {
    state.extension.installedExtensionIds = ["code-viz"]
    render(<ExtensionLoader close={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Remove CodeViz" }))

    expect(dispatch).toHaveBeenCalledWith(uninstallExtension("code-viz"))
})

it("clears an active extension when it is removed from the launch bar", () => {
    state.extension.installedExtensionIds = ["code-viz"]
    state.extension.activeCatalogExtensionId = "code-viz"
    render(<ExtensionLoader close={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Remove CodeViz" }))

    expect(dispatch).toHaveBeenNthCalledWith(1, uninstallExtension("code-viz"))
    expect(dispatch).toHaveBeenNthCalledWith(2, clearExtension())
    expect(dispatch).toHaveBeenNthCalledWith(3, setEastContent("curriculum"))
})
