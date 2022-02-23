/* eslint-env jest */
import React from "react"
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import { render, screen } from "@testing-library/react"
import { Browser } from "../../../../scripts/src/browser/Browser" // called by our test below
import store, { persistor } from "../../../../scripts/src/reducers"
import { Provider } from "react-redux"

jest.mock("react-i18next")

it("renders with mocked data", async () => {
  render(<Provider store={store}><Browser /></Provider>)
})
