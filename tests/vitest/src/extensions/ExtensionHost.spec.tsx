import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { ExtensionHost } from "../../../../src/extensions/ExtensionHost"

const { state } = vi.hoisted(() => ({
    state: {
        app: { eastContent: "curriculum", locale: "en", colorTheme: "light" },
        daw: { tracks: [], playing: false, playbackStateChangeTimestamp: 0 },
        extension: {
            url: "https://example.com/extension",
            name: "Test Extension",
            permissions: ["sidePanel"],
        },
        ide: { logs: [] },
        layout: { east: { open: true } },
        user: { loggedIn: false, username: null },
    },
}))

vi.mock("../../../../src/hooks", () => ({
    useAppSelector: (selector: (currentState: typeof state) => unknown) => selector(state),
}))
vi.mock("../../../../src/browser/Curriculum", () => ({
    Curriculum: () => <div data-testid="curriculum" />,
}))
vi.mock("../../../../src/browser/Utils", () => ({
    Collapsed: () => <div data-testid="collapsed" />,
}))
vi.mock("../../../../src/extensions/ExtensionsTitleBar", () => ({
    ExtensionsTitleBar: () => <div data-testid="extensions-title-bar" />,
}))
vi.mock("../../../../src/ide/tabState", () => ({
    selectActiveTabID: vi.fn(),
}))
vi.mock("../../../../src/browser/scriptsState", () => ({
    selectAllScripts: vi.fn(),
}))
vi.mock("../../../../src/extensions/extensionApi", () => ({
    getTempoMap: vi.fn(),
    pasteCode: vi.fn(),
}))
vi.mock("../../../../src/reducers", () => ({
    default: { getState: () => state },
}))
vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key === "curriculum.title" ? "Curriculum" : key,
    }),
}))

beforeEach(() => {
    state.app.eastContent = "curriculum"
})

afterEach(cleanup)

it("renders Curriculum directly when it is the active extension", () => {
    render(<ExtensionHost />)

    expect(screen.getByText("CURRICULUM")).not.toBeNull()
    expect(screen.getByTestId("curriculum")).not.toBeNull()
    expect(screen.queryByTitle("EarSketch Extension")).toBeNull()
})

it("renders external extensions in an iframe", () => {
    state.app.eastContent = "extension"

    render(<ExtensionHost />)

    expect(screen.getByText("TEST EXTENSION")).not.toBeNull()
    expect(screen.queryByTestId("curriculum")).toBeNull()
    expect(screen.getByTitle("EarSketch Extension")).not.toBeNull()
})
