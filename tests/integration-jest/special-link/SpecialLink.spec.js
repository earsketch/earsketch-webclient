import React from "react"
import ReactDOM from "react-dom"
import { act } from "react-dom/test-utils"
import pretty from "pretty"
import SpecialLink from "./SpecialLink"

let container

beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
})

afterEach(() => {
    document.body.removeChild(container)
    container = null
})

it("can render", () => {
    act(() => {
        ReactDOM.render(<SpecialLink page="https://www.gatech.edu">Georgia Tech</SpecialLink>, container)
    })
    expect(
        pretty(container.innerHTML)
    ).toMatchInlineSnapshot(`"<a class=\\"normal\\" href=\\"https://www.gatech.edu\\">Georgia Tech</a>"`)
})
