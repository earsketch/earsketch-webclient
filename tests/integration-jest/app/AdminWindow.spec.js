/* eslint-env jest */
jest.mock("../../../scripts/src/app/userProject")
jest.mock("../../../scripts/src/app/websocket")
jest.mock("../../../scripts/src/Utils")

import React from "react"
import ReactTestRenderer from "react-test-renderer"
import "../mocks/AudioContext.mock"
import { AdminWindow } from "../../../scripts/src/app/AdminWindow"

describe("AdminWindow", () => {
    it("renders", () => {})
    const renderer = ReactTestRenderer.create(<AdminWindow></AdminWindow>)
    console.log("admin window component=" + JSON.stringify(renderer))
})
