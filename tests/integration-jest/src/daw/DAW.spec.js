/* eslint-env jest */
import React from "react"
import { Provider } from "react-redux"
import "../../AudioContextMock/AudioContext.mock"
import store from "../../../../scripts/src/reducers"
import { render, screen } from "@testing-library/react"
import { DAW } from "../../../../scripts/src/daw/DAW"

import d3 from "../../../../scripts/vendor/d3.min.js"
import ResizeObserver from "resize-observer-polyfill"

window.d3 = d3
window.ResizeObserver = ResizeObserver

jest.mock("react-i18next", () => ({
    useTranslation: () => {
        return {
            t: (str) => str,
            i18n: {
                changeLanguage: () => new Promise(() => {}),
            },
        }
    },
}))

it("renders with mocked data", async () => {
    render(<Provider store={store}>
        <DAW />
    </Provider>)
    await screen.findByTitle("daw.tooltip.play")
})
