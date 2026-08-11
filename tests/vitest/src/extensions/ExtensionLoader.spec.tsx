import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ExtensionLoader } from "../../../../src/extensions/ExtensionLoader"
import { loadExtension } from "../../../../src/extensions/loadExtension"

const { state } = vi.hoisted(() => ({
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
        },
    },
}))

vi.mock("../../../../src/hooks", () => ({
    useAppSelector: (selector: (currentState: typeof state) => unknown) => selector(state),
}))
vi.mock("../../../../src/reducers", () => ({
    default: { dispatch: vi.fn() },
}))
vi.mock("../../../../src/extensions/loadExtension", () => ({
    loadExtension: vi.fn(),
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
                "extension.catalog.adding": "Adding...",
                "extension.catalog.codeVizDescription": "Explore a visual representation of your EarSketch code.",
                "extension.catalog.tipOfTheDayDescription": "Discover a new EarSketch tip each day.",
                "extension.catalog.chatbotDescription": "Get help and ideas while you create music in EarSketch.",
            }

            if (key === "extension.catalog.addNamed") return `Add ${values?.extensionName}`
            return translations[key] ?? key
        },
    }),
}))

beforeEach(() => {
    vi.mocked(loadExtension).mockResolvedValue(undefined)
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

it("loads a featured extension and closes the modal", async () => {
    const close = vi.fn()
    render(<ExtensionLoader close={close} />)

    fireEvent.click(screen.getByRole("button", { name: "Add CodeViz" }))

    await waitFor(() => {
        expect(loadExtension).toHaveBeenCalledWith("http://localhost:5173")
        expect(close).toHaveBeenCalledOnce()
    })
})
