/* eslint-env jest */
import React from "react"
import renderer from "react-test-renderer"
import "../mocks/AudioContext.mock"
import { AdminWindow } from "../../../scripts/src/app/AdminWindow"

describe("AdminWindow", () => {
    it("renders", () => {})
    const component = renderer.create(<AdminWindow></AdminWindow>)
    console.log("admin window component=" + JSON.stringify(component))
})
