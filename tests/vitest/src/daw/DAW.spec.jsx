import { it, vi } from "vitest"
import React from "react"
import { Provider } from "react-redux"
import "../../AudioContextMock/AudioContext.mock"
import store from "../../../../src/reducers"
import { render, screen } from "@testing-library/react"
import { DAW } from "../../../../src/daw/DAW"

import d3 from "d3"
import ResizeObserver from "resize-observer-polyfill"

window.d3 = d3
window.ResizeObserver = ResizeObserver

vi.mock("react-i18next")
vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

it("renders with mocked data", async () => {
    render(<Provider store={store}>
        <DAW />
    </Provider>)
    await screen.findByTitle("daw.tooltip.play")
})
