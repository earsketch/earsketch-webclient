import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import * as appState from "../../../../src/app/appState"
import { openModal } from "../../../../src/app/modal"
import { ExtensionLoader } from "../../../../src/extensions/ExtensionLoader"
import { TrustedExtensions } from "../../../../src/extensions/TrustedExtensions"
import * as layout from "../../../../src/ide/layoutState"

const { dispatch } = vi.hoisted(() => ({ dispatch: vi.fn() }))

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
vi.mock("../../../../src/hooks", () => ({ useAppDispatch: () => dispatch }))

beforeEach(() => {
    vi.clearAllMocks()
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
