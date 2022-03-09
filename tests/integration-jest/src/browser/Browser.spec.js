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
    const renderWaitsForThisText = "SCRIPTBROWSER.MYSCRIPTS (0)"
    const visibleSoundBrowserText = "SOUNDBROWSER.TITLE.COLLECTION (0)"
    const scriptBrowserTabText = "SCRIPT"

    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText(renderWaitsForThisText)
    const elm = screen.getByText(visibleSoundBrowserText)
    const soundBrowserDiv = elm.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
    const scriptBrowserButton = screen.getByText(scriptBrowserTabText)

    // expect sound browser pane to be hidden after clicking script browser tab
    expect(soundBrowserDiv).not.toHaveClass("hidden")
    userEvent.click(scriptBrowserButton)
    expect(soundBrowserDiv).toHaveClass("hidden")
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
