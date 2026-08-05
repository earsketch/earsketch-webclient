import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import { openModal } from "../../../../src/app/modal"
import { ExtensionLoader } from "../../../../src/extensions/ExtensionLoader"
import { TrustedExtensions } from "../../../../src/extensions/TrustedExtensions"

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key === "loadExtension" ? "Load Extension" : key }),
}))
vi.mock("../../../../src/app/modal", () => ({ openModal: vi.fn() }))
vi.mock("../../../../src/extensions/ExtensionLoader", () => ({ ExtensionLoader: vi.fn() }))
vi.mock("../../../../src/extensions/loadExtension", () => ({ loadExtension: vi.fn() }))

beforeEach(() => {
    vi.clearAllMocks()
})

it("opens the extension loader from the plus button", () => {
    render(<TrustedExtensions />)

    fireEvent.click(screen.getByRole("button", { name: "Load Extension" }))

    expect(openModal).toHaveBeenCalledWith(ExtensionLoader)
})
