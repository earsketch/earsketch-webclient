/* eslint-env jest */
import React from "react"
import { render } from "@testing-library/react" // component rendering
import { screen } from "@testing-library/dom" // find elements on screen
import "@testing-library/jest-dom" // assertions
import userEvent from "@testing-library/user-event" // clicking
import "../../AudioContextMock/AudioContext.mock" // jsdom has no AudioContext
import { Provider } from "react-redux" // redux
import store from "../../../../scripts/src/reducers" // earsketch redux store
import { Browser } from "../../../../scripts/src/browser/Browser"

jest.mock("react-i18next")
jest.mock("../../../../scripts/src/app/audiolibrary")

// content pane
it("renders with mocked data", async () => {
    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText("soundBrowser.button.addSound")
})
it("changes tabs on click", async () => {
    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText("SCRIPTBROWSER.MYSCRIPTS (0)")

    expect(screen.getByText("SCRIPTBROWSER.MYSCRIPTS (0)")).toBeVisible()
    expect(screen.getByText("soundBrowser.button.addSound")).toBeVisible()

    userEvent.click(screen.getByText("SCRIPT")) // todo why does this do nothing

    expect(screen.getByText("SCRIPTBROWSER.MYSCRIPTS (0)")).toBeVisible()
    expect(screen.getByText("soundBrowser.button.addSound")).toBeVisible()
})

// sound browser
it.skip("folds and unfolds sound folder", async () => {})
it.skip("marks favorites on click", async () => {})
it.skip("previews sounds with play button", async () => {})

// script browser
it.skip("populates scripts", async () => {})
it.skip("populates shared scripts", async () => {})
it.skip("opens script on click", async () => {})
it.skip("opens context menu on right-click", async () => {})

// api browser
it.skip("folds and unfolds api descriptions", async () => {})
