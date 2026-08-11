import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import * as appState from "../../../../src/app/appState"
import { openModal } from "../../../../src/app/modal"
import { ExtensionLoader } from "../../../../src/extensions/ExtensionLoader"
import { TrustedExtensions } from "../../../../src/extensions/TrustedExtensions"
import { loadExtension } from "../../../../src/extensions/loadExtension"
import * as layout from "../../../../src/ide/layoutState"

const { dispatch, state } = vi.hoisted(() => ({
    dispatch: vi.fn(),
    state: {
        extension: {
            installedExtensionIds: [] as string[],
        },
    },
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, values?: { extensionName?: string }) => {
            if (key === "loadExtension") return "Load Extension"
            if (key === "curriculum.title") return "Curriculum"
            if (key === "extension.switchToExtension") return `Switch to Extension: ${values?.extensionName}`
            return key
        },
    }),
}))
vi.mock("../../../../src/app/modal", () => ({ openModal: vi.fn() }))
vi.mock("../../../../src/extensions/ExtensionLoader", () => ({ ExtensionLoader: vi.fn() }))
vi.mock("../../../../src/extensions/loadExtension", () => ({ loadExtension: vi.fn() }))
vi.mock("../../../../src/hooks", () => ({
    useAppDispatch: () => dispatch,
    useAppSelector: (selector: (currentState: typeof state) => unknown) => selector(state),
}))

beforeEach(() => {
    vi.clearAllMocks()
    state.extension.installedExtensionIds = []
})

afterEach(cleanup)

it("opens the extension loader from the plus button", () => {
    render(<TrustedExtensions />)

    fireEvent.click(screen.getByRole("button", { name: "Load Extension" }))

    expect(openModal).toHaveBeenCalledWith(ExtensionLoader)
})

it("launches Curriculum in the extension host", () => {
    render(<TrustedExtensions />)

    fireEvent.click(screen.getByRole("button", { name: "Switch to Extension: Curriculum" }))

    expect(dispatch).toHaveBeenNthCalledWith(1, appState.setEastContent("curriculum"))
    expect(dispatch).toHaveBeenNthCalledWith(2, layout.setEast({ open: true, kind: "CURRICULUM" }))
})

it("only shows launch buttons for installed catalog extensions", () => {
    state.extension.installedExtensionIds = ["code-viz", "chatbot"]
    render(<TrustedExtensions />)

    expect(screen.getByRole("button", { name: "Switch to Extension: CodeViz" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Switch to Extension: EarSketch Chatbot" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Switch to Extension: Tip of the Day" })).toBeNull()
})

it("loads a catalog extension from its launch button", () => {
    state.extension.installedExtensionIds = ["code-viz"]
    render(<TrustedExtensions />)

    fireEvent.click(screen.getByRole("button", { name: "Switch to Extension: CodeViz" }))

    expect(loadExtension).toHaveBeenCalledWith("http://localhost:5173", "code-viz")
})
