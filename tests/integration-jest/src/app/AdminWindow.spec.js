/* eslint-env jest */
import React from "react"
import { Provider } from "react-redux" // redux
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import { render, screen } from "@testing-library/react"

import * as user from "../../../../scripts/src/user/userState"
import store from "../../../../scripts/src/reducers" // earsketch redux store
import { AdminWindow } from "../../../../scripts/src/app/AdminWindow" // called by our test below

// tell jest to use our mocks in place of these modules, located in __mocks__/
jest.mock("../../../../scripts/src/request")
jest.mock("../../../../scripts/src/app/websocket")

beforeAll(async () => {
    store.dispatch(user.login({ username: "tester", token: "fake" }))
})

it("renders with mocked data", async () => {
    render(<Provider store={store}><AdminWindow close={() => { }}/></Provider>) // begin rendering
    await screen.findByText("georgepburdell") // wait for userProject mock to return data
    await expect(screen.findByText("georgepburdell")) // verify value
})
