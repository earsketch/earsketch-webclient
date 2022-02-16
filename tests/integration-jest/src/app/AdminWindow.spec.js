/* eslint-env jest */
import React from "react"
import "../../AudioContextMock/AudioContext.mock" // jsdom is missing AudioContext, so we provide it
import { render, screen } from "@testing-library/react"
import { AdminWindow } from "../../../../scripts/src/app/AdminWindow" // called by our test below

// tell jest to use our mocks in place of these modules, located in __mocks__/
jest.mock("../../../../scripts/src/app/userProject")
jest.mock("../../../../scripts/src/app/websocket")

it("renders with mocked data", async () => {
    render(<AdminWindow close={() => { }}/>) // begin rendering
    await screen.findByText("georgepburdell") // wait for userProject mock to return data
    await expect(screen.findByText("georgepburdell")) // verify value
})
