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

it("renders with mocked data", async () => {
    render(<Provider store={store}><Browser /></Provider>)
    await screen.findByText("soundBrowser.button.addSound")
    userEvent.click(screen.getByText("soundBrowser.button.addSound"))
})
