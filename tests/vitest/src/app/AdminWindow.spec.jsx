import { beforeAll, expect, it, vi } from "vitest"
import React from "react"
import { Provider } from "react-redux" // redux
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import { render, screen } from "@testing-library/react"

import * as user from "../../../../src/user/userState"
import store from "../../../../src/reducers" // earsketch redux store
import { AdminWindow } from "../../../../src/app/AdminWindow" // called by our test below
import { Dialog } from "@headlessui/react"

// tell vitest to use our mocks in place of these modules, located in __mocks__/
vi.mock("../../../../src/request")
vi.mock("../../../../src/app/websocket")
vi.mock("../../../../src/app/audiolibrary")
vi.mock("../../../../src/data/recommendationData")

beforeAll(async () => {
    store.dispatch(user.login({ username: "tester", token: "fake" }))
})

it("renders with mocked data", async () => {
    render(<Provider store={store}><Dialog open={true} onClose={() => {}}><AdminWindow close={() => { }}/></Dialog></Provider>) // begin rendering
    await screen.findByText("georgepburdell") // wait for userProject mock to return data
    await expect(screen.findByText("georgepburdell")) // verify value
})
